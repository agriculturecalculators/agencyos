# AgencyOS

Internal management app for a digital marketing agency: clients, projects, tasks, employees, daily reports, tenders, finance, analytics, calendar, notifications, activity log. React + TypeScript + Tailwind on the front, Supabase (auth, Postgres, storage, realtime) on the back. Installs on phones as a PWA.

## 1. Supabase setup

1. Create a project at supabase.com (free plan is fine).
2. SQL Editor: paste `supabase/schema.sql` and run it. This creates every table, the Row Level Security policies, the file bucket and realtime.
3. Authentication > Users > Add user: email `agriculturecalculators@gmail.com`, your password, tick **Auto Confirm User**. The first account becomes Admin automatically.
4. SQL Editor: run `supabase/first_admin.sql` (sets the login username to `Abu Bakar Altaf`).
5. Optional: run `supabase/demo_data.sql` for sample records, all labelled `[Demo]`. Remove them later with `supabase/remove_demo_data.sql`.
6. Authentication > Providers > Email: for invited employees to sign up without waiting for a mail, switch off "Confirm email" (or leave it on and they confirm by mail).
7. Project Settings > API: copy the Project URL and the `anon` public key. Never use the `service_role` key in this app.

Sign-in works with the username (`Abu Bakar Altaf`) or the email. The password lives only in Supabase Auth, not in the code. Change it from Profile and settings once you are in, and use a stronger one before real client data goes in.

## 2. Run locally

```bash
cp .env.example .env      # fill in the two Supabase values
npm install
npm run dev
```

`npm run build` makes the production build in `dist/`. `npm run typecheck` runs the TypeScript check.

## 3. Deploy on Cloudflare Pages (free)

1. Cloudflare dashboard > Workers & Pages > Create > Pages > Connect to Git > pick this repo.
2. Build command `npm run build`, output directory `dist`.
3. Environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Deploy. You get a `*.pages.dev` address; a custom domain can be added later.
5. In Supabase > Authentication > URL Configuration, set Site URL to your `pages.dev` address so password-reset links come back to the app.

## 4. Install on a phone

- Android (Chrome): menu > Install app.
- iPhone (Safari): Share > Add to Home Screen.

## 5. People and roles

Admin invites people on the Employees page (email + role). The invited person opens the app, chooses "Have an invite? Sign up" and uses that exact email. Roles: Admin and Manager see everything; Team Leader manages tasks, tenders and reviews reports; Employee sees only their own projects, tasks and reports. Rules are enforced in the database by Row Level Security, not only in the screens.

## 6. Later

Continue with Google: enable the Google provider in Supabase Authentication, then add a button calling `supabase.auth.signInWithOAuth({ provider: 'google' })` on the login page.
