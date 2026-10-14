import './config.js';
import { configuredDatabasePath } from './db.js';
import { createSecuritySender } from './mail.js';

console.log(`Account database: ${configuredDatabasePath()}`);
const missing = ['RESEND_API_KEY', 'MAIL_FROM'].filter(name => !process.env[name]?.trim());
if (missing.length) {
  console.error(`Email delivery is disabled. Set ${missing.join(' and ')} privately in backend/.env and restart the API.`);
  process.exitCode = 1;
} else {
  const recipient = process.argv[2];
  if (!recipient) console.log('Email settings are present (delivery not verified). To send one test email: npm run mail:check -- your-address@example.com');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) { console.error('Enter a valid test email address.'); process.exitCode = 1; }
  else {
    try {
      await createSecuritySender()({ email: recipient, subject: 'Watch Boutique email delivery test', text: 'Your Watch Boutique email sender is connected. This is a delivery test; no account details were changed.', message_key: `check-${crypto.randomUUID()}` });
      console.log('Provider accepted the test email. Check the recipient inbox/spam and provider delivery logs to confirm delivery.');
    } catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
