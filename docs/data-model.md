# Data model

`prisma/schema.prisma` contains users, Auth.js accounts/sessions, organizations, memberships, private assets, prompt templates/versions, model registry, jobs, attempts, and API credentials. Each organization owns immutable `trialStartedAt` and `trialEndsAt` timestamps initialized during Google registration; existing organizations receive a 14-day trial when the migration is applied. Jobs snapshot prompt text/settings and are isolated by organization at the service layer. Prisma migrations are applied with `npm run db:migrate`.
