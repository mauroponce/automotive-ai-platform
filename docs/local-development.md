# Local development

Copy `.env.example` to `.env.local`, then run `docker compose up --build`. Docker binds port 3000 and checks `/api/health`. Source is bind-mounted for hot reload. The production Docker target runs `npm run build` then `npm run start`; Vercel does not use Docker.
