# Data model

`prisma/schema.prisma` contains users, Auth.js accounts/sessions, organizations, memberships, private assets, prompt templates/versions, model registry, jobs, attempts, and API credentials. Jobs snapshot prompt text/settings and are isolated by organization at the service layer. Prisma migrations are applied with `npm run db:migrate`.
