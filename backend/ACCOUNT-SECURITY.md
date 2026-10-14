# Step 1: Account recovery and security

Only account access and security are changed in this step. Checkout, catalogue, inventory, order operations and customer-information pages retain their current behavior. Do not begin the next planned step until the owner confirms.

## Customer access

- Select **Forgot password?** in the existing Sign In form to request an email link.
- After signing in, select **Account** in the navigation or **Client Access** to open `/account/security`.
- Account security provides email verification, password changes, two-factor setup, active sessions and sign-out controls.
- Recovery and account pages use the site's existing gold, white/black and translucent glass styling. Existing button styles are preserved.

## Recovery and verification

Reset links contain 256-bit random tokens, expire after 30 minutes and work once. Only token hashes are stored in the token table. Reset links use URL fragments, which remain available through refresh and are removed after successful use. Passwords preserve spaces and must contain 8–128 characters, matching the existing registration policy.

Reset requests return the same message for known and unknown email addresses. Requests are limited per IP and per email. A newer reset link invalidates the previous link. Password reset and authenticated password changes revoke all sessions and pending MFA login challenges. Resetting a password does not disable two-factor authentication or automatically sign the user in.

Verification links expire after 24 hours and require clicking **Verify email**; opening the page does not consume the link. Verification is available from Account security. Existing accounts begin unverified. Verification does not change the customer checkout rules in this step.

## Email configuration

The existing Resend integration now also sends password-reset and verification email. Configure these values in `backend/.env` using a sender/domain verified in your Resend account:

```dotenv
RESEND_API_KEY=your-private-api-key
MAIL_FROM=Watch Boutique <store@your-verified-domain.example>
APP_ORIGIN=https://your-store.example
```

Use the real frontend origin, without a trailing slash. For local development use `http://localhost:5173`. Links are constructed from this configured origin, never from incoming Host headers.

Without email configuration, recovery and verification return a clear 503 response; they do not falsely claim to have sent email or expose a reset token as a workaround. The existing welcome-email queue retains its behavior.

Security email is queued in the database with encrypted content. The existing backend timer processes it every five seconds. Retries use the same provider idempotency key; after five failures delivery stops. Successful or permanently failed messages discard their encrypted payload. Expired or superseded tokens remove their associated jobs. No reset links, authenticator secrets or email contents are logged.

No real emails were sent during implementation tests. Live delivery must be checked after configuring a verified sender.

From `backend`, run `npm.cmd run mail:check` to check local configuration without sending email. After configuring credentials privately in `backend/.env`, use `npm.cmd run mail:check -- your-address@example.com` to send one test message to your own inbox. Provider acceptance does not prove inbox delivery; check your inbox/spam and provider delivery logs. Restart the API after changing `.env`. Provider HTTP failures now appear in security-worker logs without message content or credentials.

Backend `.env` and configured relative database paths resolve from the backend directory, including when launched elsewhere. Existing accounts are recovered only from the server database: old browser-only demo accounts cannot receive server recovery links. The generic recovery response intentionally does not reveal whether an email is registered.

## Two-factor authentication

Any account can enable authenticator-based two-factor authentication. Enter the current password, add the displayed setup key manually to an authenticator app, then confirm a six-digit code. The app must use time-based codes: SHA-1, six digits, 30-second period. Setup expires after ten minutes.

Enrollment signs out previous sessions and issues a fresh authenticated session. Ten single-use recovery codes are displayed once. Store them offline and privately; only their hashes remain on the server. A previously accepted authenticator time step cannot be reused. If a code was just used, wait for the next authenticator code.

For an enrolled account, the password alone creates a five-minute login challenge rather than a session. Complete it with an authenticator code or an unused recovery code. A challenge permits at most five attempts, with a separate account-wide attempt limit.

Disabling MFA requires the password and a second factor, and signs out other sessions. Production administrators cannot disable MFA. If both the authenticator and all recovery codes are lost, email password reset does not bypass MFA: a separately verified administrator-assisted recovery process is needed. No insecure public bypass is included.

When `NODE_ENV=production`, administrator APIs require verified email, enrolled MFA and a session that completed MFA. An administrator may still sign in to Account security to complete setup. Local development retains access to existing administrator tools so configuration can be completed before deployment.

## Encryption key and deployment

Production requires `ACCOUNT_SECURITY_KEY`: a stable, randomly generated 32-byte key represented by 64 hexadecimal characters. Generate it once on the server with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Store it in the private environment configuration, not Git or a browser bundle. Keep the same key across backend restarts. It encrypts authenticator secrets and queued security emails using AES-256-GCM. Back it up securely and separately from the database. Losing or replacing the key makes existing MFA secrets unreadable.

For local development only, a key is generated when needed in `backend/data/account-security.key`. The data directory is already ignored by Git. When moving an existing development database to production, preserve that key by securely converting its 32 bytes to hex and configuring it; do not generate an unrelated key for a database that already contains encrypted MFA secrets.

Production also needs HTTPS, `NODE_ENV=production`, the correct `APP_ORIGIN`, and the existing same-origin `/api` reverse proxy. Production session cookies require HTTPS. No external authentication or cryptography dependencies were added.

Restart the backend after changing environment configuration. The database migration is additive and idempotent: it preserves current users, products, orders and sessions, and adds security columns/tables.

## API additions

All paths below are under `/api/auth`; write requests use JSON and existing same-origin protection.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/forgot-password` | Request reset email with `{ email }` |
| POST | `/reset-password` | Consume `{ token, password }`; sign out all sessions |
| POST | `/verify-email` | Consume `{ token }` |
| POST | `/mfa/login` | Complete password login with `{ challenge, code }` |
| GET | `/security` | Read verification, MFA and current-user session status |
| POST | `/security/send-verification` | Request a verification email |
| POST | `/security/change-password` | `{ currentPassword, password, code? }` |
| DELETE | `/security/sessions/:sessionId` | Revoke one owned session |
| POST | `/security/logout-all` | Revoke all owned sessions, including current |
| POST | `/security/mfa/setup` | Begin enrollment with `{ currentPassword }` |
| POST | `/security/mfa/enable` | Confirm `{ currentPassword, code }`; receive recovery codes once |
| POST | `/security/mfa/disable` | Require `{ currentPassword, code }` |

All `/security` routes require a live session. Session IDs exposed by the API are non-bearer identifiers, and revocation is scoped to the session's owner. Password login responses return either `{ user }` or `{ mfaRequired: true, challenge }`. Clients must not treat the latter as a successful sign-in.

## Validation

Run `npm.cmd test` from `backend` and `npm.cmd run build` from `frontend`.

Security tests cover RFC TOTP vectors, encrypted storage, token expiry/single use, concurrent resets, session revocation, account isolation, MFA replay/recovery-code reuse, expired enrollment/login challenges, production administrator enforcement, email retry behavior, missing configuration, and legacy database migration. Existing checkout and product tests remain part of the same suite.

Browser tests use an isolated in-memory database and a private test email sink, exercising registration, verification, enrollment, MFA sign-in, password change/reset, session restoration and sign-out-all. Mobile and desktop screens were also inspected. Live provider delivery has not been tested without credentials.
