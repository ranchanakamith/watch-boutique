import { randomBytes } from 'node:crypto';
import { rateLimit } from 'express-rate-limit';
import { digest, hashPassword, verifyPassword, publicUser, readToken } from './auth.js';
import { securityKey, encrypt, decrypt, newTotpSecret, matchTotp } from './security-crypto.js';
import { transaction } from './commerce.js';

const fail = (status, message) => Object.assign(new Error(message), { status });
const randomToken = () => randomBytes(32).toString('hex');
const validToken = token => typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);
const passwordValid = password => typeof password === 'string' && password.length >= 8 && password.length <= 128;
const genericRecovery = { message: 'If an account exists for that email, a password reset link will be sent. Check your inbox and spam folder.' };

export function createAccountSecurity(db, { origin, production, key, sender = null, now = Date.now }) {
  const getKey = () => key || securityKey(production);
  const userById = id => db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  function cleanup() {
    db.prepare('DELETE FROM security_tokens WHERE expires_at <= ?').run(now());
    db.prepare('DELETE FROM mfa_challenges WHERE expires_at <= ?').run(now());
    db.prepare('DELETE FROM security_limits WHERE expires_at <= ?').run(now());
  }
  function limited(scope, maximum, milliseconds) {
    cleanup();
    const row = db.prepare('SELECT * FROM security_limits WHERE key = ?').get(scope);
    if (row && row.count >= maximum) return true;
    db.prepare(`INSERT INTO security_limits(key, count, expires_at) VALUES (?, 1, ?)
      ON CONFLICT(key) DO UPDATE SET count = count + 1`).run(scope, now() + milliseconds);
    return false;
  }
  function queueLink(user, kind) {
    const token = randomToken(), tokenHash = digest(token);
    const minutes = kind === 'reset' ? 30 : 24 * 60;
    const page = kind === 'reset' ? 'reset-password' : 'verify-email';
    // Fragments are not sent in HTTP requests or Referer headers.
    const link = `${origin}/account/${page}#token=${token}`;
    const subject = kind === 'reset' ? 'Reset your Watch Boutique password' : 'Verify your Watch Boutique email';
    const text = `Hello ${user.name},\n\n${kind === 'reset' ? 'Use this link to choose a new password' : 'Use this link to verify your email address'}:\n${link}\n\nThis link expires in ${kind === 'reset' ? '30 minutes' : '24 hours'} and can be used once. If you did not request it, you can ignore this email.\n\nThe Watch Boutique team`;
    const payload = encrypt(JSON.stringify({ email: user.email, subject, text }), getKey());
    transaction(db, () => {
      db.prepare('DELETE FROM security_tokens WHERE user_id = ? AND kind = ?').run(user.id, kind);
      db.prepare('INSERT INTO security_tokens VALUES (?, ?, ?, ?)').run(tokenHash, user.id, kind, now() + minutes * 60000);
      db.prepare('INSERT INTO security_mail(id, token_hash, payload) VALUES (?, ?, ?)').run(randomToken(), tokenHash, payload);
    });
  }
  let delivery;
  function deliverMail() {
    if (delivery) return delivery;
    if (!sender) return Promise.resolve();
    delivery = (async () => {
      cleanup();
      const jobs = db.prepare("SELECT * FROM security_mail WHERE status = 'pending' AND next_attempt <= ? LIMIT 10").all(now());
      for (const job of jobs) {
        // A newer request or token use can remove an earlier queued message.
        if (!db.prepare('SELECT 1 FROM security_mail WHERE id = ?').get(job.id)) continue;
        const attempts = job.attempts + 1;
        db.prepare('UPDATE security_mail SET attempts = ?, next_attempt = ? WHERE id = ?').run(attempts, now() + 60000 * 2 ** attempts, job.id);
        try {
          await sender({ ...JSON.parse(decrypt(job.payload, getKey())), message_key: `security-${job.id}` });
          db.prepare("UPDATE security_mail SET status = 'sent', payload = NULL WHERE id = ?").run(job.id);
        } catch (error) {
          if (attempts >= 5) db.prepare("UPDATE security_mail SET status = 'failed', payload = NULL WHERE id = ?").run(job.id);
          // Never log reset links, codes, credentials or email content.
          const providerStatus = /^Email provider returned HTTP (\d{3})\./.exec(error.message)?.[1];
          console.warn(`Security email attempt ${attempts} failed${providerStatus ? ` (provider HTTP ${providerStatus})` : ''}. Check mail:check and provider delivery logs.`);
        }
      }
    })().finally(() => { delivery = undefined; });
    return delivery;
  }
  function beginMfa(user) {
    cleanup();
    const challenge = randomToken();
    db.prepare('INSERT INTO mfa_challenges(token_hash,user_id,expires_at) VALUES(?,?,?)').run(digest(challenge), user.id, now() + 5 * 60000);
    return { mfaRequired: true, challenge };
  }
  function consumeFactor(user, code) {
    if (!user.mfa_secret || typeof code !== 'string' || code.length > 100) return false;
    if (limited(`mfa:${user.id}`, 10, 15 * 60000)) throw fail(429, 'Too many verification attempts. Please try again in 15 minutes.');
    const normalized = code.trim();
    const step = matchTotp(decrypt(user.mfa_secret, getKey()), normalized, now(), user.mfa_last_step);
    if (step !== null) {
      db.prepare('UPDATE users SET mfa_last_step = ? WHERE id = ?').run(step, user.id);
      return true;
    }
    if (!/^[a-f0-9]{8}-[a-f0-9]{8}$/i.test(normalized)) return false;
    return db.prepare('DELETE FROM recovery_codes WHERE user_id = ? AND code_hash = ?').run(user.id, digest(normalized.toLowerCase())).changes > 0;
  }
  async function confirmPassword(req, requireFactor = false) {
    const password = req.body?.currentPassword;
    if (typeof password !== 'string' || password.length > 128) throw fail(400, 'Enter your current password.');
    if (limited(`reauth:${req.user.id}`, 10, 15 * 60000)) throw fail(429, 'Too many attempts. Please try again in 15 minutes.');
    if (!await verifyPassword(password, req.user.password_hash)) throw fail(401, 'The current password is incorrect.');
    const user = userById(req.user.id);
    const session = readToken(req);
    if (!user || user.password_hash !== req.user.password_hash || !session ||
      !db.prepare('SELECT 1 FROM sessions WHERE token_hash = ? AND user_id = ? AND expires_at > ?').get(digest(session), user.id, now())) throw fail(401, 'Your session changed. Sign in again.');
    if (requireFactor && user.mfa_secret && !consumeFactor(user, req.body?.code)) throw fail(401, 'Enter a new authenticator code or an unused recovery code.');
    return user;
  }
  function invalidateAccess(id) {
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM mfa_challenges WHERE user_id = ?').run(id);
    db.prepare("DELETE FROM security_tokens WHERE user_id = ? AND kind = 'reset'").run(id);
  }
  function routes(app, { requireUser, startSession, cookieOptions }) {
    const limiter = rateLimit({ windowMs: 15 * 60000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false,
      message: { message: 'Too many account-security requests. Please try again later.' } });
    app.use(['/api/auth/forgot-password', '/api/auth/reset-password', '/api/auth/verify-email', '/api/auth/mfa', '/api/auth/security'], limiter);
    app.post('/api/auth/forgot-password', (req, res) => {
      const email = req.body?.email;
      if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw fail(400, 'Enter a valid email address.');
      if (!sender) throw fail(503, 'Password recovery email is not configured. Please contact the store.');
      const normalized = email.trim().toLowerCase();
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalized);
      const blocked = limited(`reset-minute:${digest(normalized)}`, 1, 60000) || limited(`reset-hour:${digest(normalized)}`, 5, 3600000);
      if (user && !blocked) queueLink(user, 'reset');
      res.status(202).json(genericRecovery);
    });
    app.post('/api/auth/reset-password', async (req, res) => {
      const { token, password } = req.body || {};
      if (!validToken(token)) throw fail(400, 'This reset link is invalid or expired. Request a new link.');
      if (!passwordValid(password)) throw fail(400, 'Password must contain 8–128 characters.');
      const entry = db.prepare("SELECT * FROM security_tokens WHERE token_hash = ? AND kind = 'reset' AND expires_at > ?").get(digest(token), now());
      if (!entry) throw fail(400, 'This reset link is invalid or expired. Request a new link.');
      const hash = await hashPassword(password);
      transaction(db, () => {
        const consumed = db.prepare("DELETE FROM security_tokens WHERE token_hash = ? AND kind = 'reset' AND expires_at > ?").run(digest(token), now());
        if (!consumed.changes) throw fail(400, 'This reset link is invalid or expired. Request a new link.');
        db.prepare('UPDATE users SET password_hash = ?, mfa_pending = NULL, mfa_pending_until = NULL WHERE id = ?').run(hash, entry.user_id);
        invalidateAccess(entry.user_id);
      });
      res.clearCookie('boutique_session', cookieOptions).json({ message: 'Password reset. All sessions have been signed out. Sign in with your new password.' });
    });
    app.post('/api/auth/security/send-verification', requireUser, (req, res) => {
      if (req.user.email_verified_at) return res.json({ message: 'Your email is already verified.' });
      if (!sender) throw fail(503, 'Verification email is not configured. Please contact the store.');
      if (limited(`verify-minute:${req.user.id}`, 1, 60000) || limited(`verify-hour:${req.user.id}`, 5, 3600000)) throw fail(429, 'A verification email was requested recently. Please wait before trying again.');
      queueLink(req.user, 'verify');
      res.status(202).json({ message: 'Verification email queued. Check your inbox and spam folder.' });
    });
    app.post('/api/auth/verify-email', (req, res) => {
      const token = req.body?.token;
      if (!validToken(token)) throw fail(400, 'This verification link is invalid or expired.');
      transaction(db, () => {
        const entry = db.prepare("SELECT * FROM security_tokens WHERE token_hash = ? AND kind = 'verify' AND expires_at > ?").get(digest(token), now());
        if (!entry) throw fail(400, 'This verification link is invalid or expired.');
        db.prepare('UPDATE users SET email_verified_at = ? WHERE id = ?').run(now(), entry.user_id);
        db.prepare('DELETE FROM security_tokens WHERE token_hash = ?').run(digest(token));
      });
      res.json({ message: 'Your email address is verified.' });
    });
    app.get('/api/auth/security', requireUser, (req, res) => {
      const currentHash = digest(readToken(req));
      const sessions = db.prepare('SELECT token_hash, created_at, expires_at FROM sessions WHERE user_id = ? AND expires_at > ? ORDER BY created_at DESC').all(req.user.id, now())
        .map(row => ({ id: digest(row.token_hash), createdAt: row.created_at || null, expiresAt: row.expires_at, current: row.token_hash === currentHash }));
      res.json({ emailVerified: !!req.user.email_verified_at, mfaEnabled: !!req.user.mfa_secret,
        adminMfaRequired: production && req.user.role === 'admin', sessions,
        recoveryCodesRemaining: db.prepare('SELECT count(*) AS total FROM recovery_codes WHERE user_id = ?').get(req.user.id).total });
    });
    app.delete('/api/auth/security/sessions/:sessionId', requireUser, (req, res) => {
      const row = db.prepare('SELECT token_hash FROM sessions WHERE user_id = ?').all(req.user.id).find(row => digest(row.token_hash) === req.params.sessionId);
      if (!row) throw fail(404, 'Session not found.');
      db.prepare('DELETE FROM sessions WHERE token_hash = ? AND user_id = ?').run(row.token_hash, req.user.id);
      if (row.token_hash === digest(readToken(req))) res.clearCookie('boutique_session', cookieOptions);
      res.status(204).end();
    });
    app.post('/api/auth/security/logout-all', requireUser, (req, res) => {
      transaction(db, () => {
        db.prepare('DELETE FROM sessions WHERE user_id = ?').run(req.user.id);
        db.prepare('DELETE FROM mfa_challenges WHERE user_id = ?').run(req.user.id);
      });
      res.clearCookie('boutique_session', cookieOptions).status(204).end();
    });
    app.post('/api/auth/security/change-password', requireUser, async (req, res) => {
      if (!passwordValid(req.body?.password)) throw fail(400, 'Password must contain 8–128 characters.');
      const user = await confirmPassword(req, true);
      const hash = await hashPassword(req.body.password);
      transaction(db, () => {
        if (userById(user.id)?.password_hash !== user.password_hash) throw fail(409, 'Your password changed. Sign in again.');
        db.prepare('UPDATE users SET password_hash = ?, mfa_pending = NULL, mfa_pending_until = NULL WHERE id = ?').run(hash, user.id);
        invalidateAccess(user.id);
      });
      res.clearCookie('boutique_session', cookieOptions).json({ message: 'Password changed. Sign in again on each device.' });
    });
    app.post('/api/auth/mfa/login', (req, res) => {
      const { challenge, code } = req.body || {};
      if (!validToken(challenge)) throw fail(401, 'Sign in again to request a new verification challenge.');
      const row = db.prepare('SELECT * FROM mfa_challenges WHERE token_hash = ? AND expires_at > ? AND attempts < 5').get(digest(challenge), now());
      if (!row) throw fail(401, 'Verification expired or too many attempts. Sign in again.');
      db.prepare('UPDATE mfa_challenges SET attempts = attempts + 1 WHERE token_hash = ?').run(digest(challenge));
      const user = userById(row.user_id);
      if (!user || !consumeFactor(user, code)) throw fail(401, 'Enter a new authenticator code or an unused recovery code.');
      db.prepare('DELETE FROM mfa_challenges WHERE token_hash = ?').run(digest(challenge));
      startSession(req, res, user, true);
      res.json({ user: publicUser(user) });
    });
    app.post('/api/auth/security/mfa/setup', requireUser, async (req, res) => {
      const user = await confirmPassword(req);
      if (user.mfa_secret) throw fail(409, 'Two-factor authentication is already enabled.');
      const secret = newTotpSecret();
      db.prepare('UPDATE users SET mfa_pending = ?, mfa_pending_until = ? WHERE id = ?').run(encrypt(secret, getKey()), now() + 10 * 60000, user.id);
      res.json({ secret, expiresIn: 600 });
    });
    app.post('/api/auth/security/mfa/enable', requireUser, async (req, res) => {
      const user = await confirmPassword(req);
      if (user.mfa_secret || !user.mfa_pending || user.mfa_pending_until <= now()) throw fail(400, 'Setup expired. Start two-factor setup again.');
      const step = matchTotp(decrypt(user.mfa_pending, getKey()), req.body?.code, now());
      if (step === null) throw fail(400, 'The authenticator code is incorrect.');
      const codes = Array.from({ length: 10 }, () => `${randomBytes(4).toString('hex')}-${randomBytes(4).toString('hex')}`);
      transaction(db, () => {
        db.prepare('UPDATE users SET mfa_secret = mfa_pending, mfa_pending = NULL, mfa_pending_until = NULL, mfa_last_step = ? WHERE id = ?').run(step, user.id);
        db.prepare('DELETE FROM recovery_codes WHERE user_id = ?').run(user.id);
        for (const code of codes) db.prepare('INSERT INTO recovery_codes VALUES (?, ?)').run(user.id, digest(code));
        invalidateAccess(user.id);
        startSession(req, res, userById(user.id), true);
      });
      res.json({ recoveryCodes: codes, message: 'Two-factor authentication is enabled. Save these recovery codes now; they are shown only once.' });
    });
    app.post('/api/auth/security/mfa/disable', requireUser, async (req, res) => {
      if (production && req.user.role === 'admin') throw fail(403, 'Administrators must keep two-factor authentication enabled in production.');
      const user = await confirmPassword(req, true);
      transaction(db, () => {
        db.prepare('UPDATE users SET mfa_secret = NULL, mfa_pending = NULL, mfa_pending_until = NULL, mfa_last_step = -1 WHERE id = ?').run(user.id);
        db.prepare('DELETE FROM recovery_codes WHERE user_id = ?').run(user.id);
        invalidateAccess(user.id);
        startSession(req, res, userById(user.id));
      });
      res.json({ message: 'Two-factor authentication is disabled. Other sessions were signed out.' });
    });
    // Expose only deliberate configuration errors for these account routes.
    app.use(['/api/auth/forgot-password', '/api/auth/reset-password', '/api/auth/verify-email', '/api/auth/mfa', '/api/auth/security'], (error, req, res, next) => {
      if (error.status === 503) return res.status(503).json({ message: error.message });
      next(error);
    });
  }
  return { routes, beginMfa, deliverMail };
}
