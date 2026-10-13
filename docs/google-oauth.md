# Google OAuth and roles

Create a Google Cloud OAuth 2.0 Web application. Add `http://localhost:3000/api/auth/callback/google` for local development and `https://YOUR_DOMAIN/api/auth/callback/google` for production as authorized redirect URIs. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_URL`, and a strong `NEXTAUTH_SECRET` outside Git, then restart `web`.

New Google-authenticated users are created by Auth.js with the database default `USER` platform role. The OAuth profile, frontend requests, and registration endpoint cannot assign a role.

After first signing in with Google, promote exactly one user from an administrative shell:

```bash
CONFIRM_PROMOTE_SUPER_ADMIN=PROMOTE_SINGLE_SUPER_ADMIN \
SUPER_ADMIN_USER_ID=the-internal-user-id \
npm run auth:promote-super-admin
```

Alternatively use the linked Google account identifier with `SUPER_ADMIN_GOOGLE_ACCOUNT_ID`. The script refuses to replace another super admin, is not run automatically, and writes an audit event. Apply the Prisma migration before using it.
