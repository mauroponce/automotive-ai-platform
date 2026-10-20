# Google OAuth and roles

Create a Google Cloud OAuth 2.0 Web application. Add `http://localhost:3000/api/auth/callback/google` for local development and `https://YOUR_DOMAIN/api/auth/callback/google` for production as authorized redirect URIs. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_URL`, and a strong `NEXTAUTH_SECRET` outside Git, then restart `web`.

Google is the only customer authentication method. AutoFrame rejects OAuth profiles whose email was not verified by Google. A new Google-authenticated user receives the database default `USER` platform role and completes registration by naming the dealership. The server then creates an owner membership and a 14-day organization trial; no password or credit card is collected. Existing users may be linked by their verified Google email, matching the explicit account-linking policy.

Portal and organization API access require an active organization trial. At the exact `trialEndsAt` instant, access is paused and the user is sent to `/trial-expired`. Super administrators remain governed by the separate platform-role controls.

After first signing up with Google, promote exactly one user from an administrative shell:

```bash
CONFIRM_PROMOTE_SUPER_ADMIN=PROMOTE_SINGLE_SUPER_ADMIN \
SUPER_ADMIN_USER_ID=the-internal-user-id \
npm run auth:promote-super-admin
```

Alternatively use the linked Google account identifier with `SUPER_ADMIN_GOOGLE_ACCOUNT_ID`. The script refuses to replace another super admin, is not run automatically, and writes an audit event. Apply the Prisma migration before using it.
