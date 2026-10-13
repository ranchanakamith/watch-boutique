// No browser credentials or passwords are included in welcome emails.
export function createWelcomeSender(env = process.env, fetcher = fetch) {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) return null;
  return async ({ email, name, message_key }) => {
    const response = await fetcher('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': message_key },
      body: JSON.stringify({ from: env.MAIL_FROM, to: [email], subject: 'Welcome to The Watch Boutique',
        text: `Hello ${name},\n\nWelcome to The Watch Boutique! Your account is ready.\n\nSign in to save your favourite watches, keep your shopping bag, and view your orders. Your wishlist and bag are private to your account.\n\nThank you for joining us.\nThe Watch Boutique team` }),
    });
    if (!response.ok) throw new Error(`Email provider returned HTTP ${response.status}`);
    const result = await response.json();
    if (typeof result.id !== 'string') throw new Error('Email provider did not confirm acceptance');
  };
}

// Intended for the project's single API process. Jobs survive restarts.
export function createWelcomeWorker(db, sender, now = Date.now) {
  let running;
  function run() {
    if (!sender) return Promise.resolve();
    if (running) return running;
    running = (async () => {
      const jobs = db.prepare(`SELECT w.*, u.email, u.name FROM welcome_emails w JOIN users u ON u.id = w.user_id
        WHERE w.status = 'pending' AND w.next_attempt <= ? ORDER BY w.user_id LIMIT 10`).all(now());
      for (const job of jobs) {
        // Resend keeps idempotency keys for 24h. Never retry ambiguous sends beyond that window.
        if (job.first_attempt !== null && now() - job.first_attempt >= 23 * 60 * 60 * 1000) {
          db.prepare("UPDATE welcome_emails SET status = 'failed', failure = 'Retry window expired; review delivery before resending' WHERE user_id = ?").run(job.user_id);
          continue;
        }
        const attempts = job.attempts + 1;
        db.prepare('UPDATE welcome_emails SET attempts = ?, first_attempt = coalesce(first_attempt, ?), next_attempt = ? WHERE user_id = ?')
          .run(attempts, now(), now() + 60_000 * 2 ** attempts, job.user_id);
        try {
          await sender(job);
          db.prepare("UPDATE welcome_emails SET status = 'sent', sent_at = ?, failure = NULL WHERE user_id = ?").run(now(), job.user_id);
        } catch {
          db.prepare('UPDATE welcome_emails SET status = ?, failure = ? WHERE user_id = ?')
            .run(attempts >= 5 ? 'failed' : 'pending', 'Email delivery failed; check provider configuration and logs', job.user_id);
        }
      }
    })().finally(() => { running = undefined; });
    return running;
  }
  return { run };
}
