# Estate House

A Next.js and TypeScript real estate marketplace starter. It includes property discovery and detail pages, account registration/sign-in, saved listings, seller submissions, admin and owner listing tools, inquiry management, Cloudinary image management, and optional Google Maps embeds.

This repository is a deployable application codebase, but it still needs operator-specific content and configured external services before a public launch. Development demo listings are illustrative and explicitly not production inventory. See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for the exact completion and launch checklist.

## Stack

- Next.js App Router, React, TypeScript and Tailwind CSS 4
- PostgreSQL with Prisma 7 and its PostgreSQL driver adapter
- Auth.js credentials and bcryptjs password hashing
- Zod request validation and PostgreSQL-backed rate limits

## Local setup

1. Install Node.js 20.9+ and PostgreSQL 14+.
2. Copy `.env.example` to `.env`; set `DATABASE_URL`, a unique `AUTH_SECRET`, and `NEXT_PUBLIC_SITE_URL`.
3. Install dependencies: `npm install`.
4. Generate the client: `npm run db:generate`.
5. Apply committed migrations: `npm run db:migrate`.
6. Add illustrative development listings: `npm run db:seed`.
7. Start the app: `npm run dev`.

If PostgreSQL is unreachable, the development site falls back to clearly illustrative demo listings. Production does not use demo fallback data.

In development, if `EMAIL_API_KEY`/`EMAIL_FROM` are not set, verification and password-reset emails are printed to the `npm run dev` console (look for `[email:dev]`) so you can complete sign-up locally. Production always requires a configured email provider.

If the dev server ever shows a stale build error for a file that exists, stop it, delete `.next/dev`, and start it again.

## Project structure

```
src/
  app/
    (site)/        public pages sharing the site header and footer (home, properties, agents, sell, contact, about, legal)
    (auth)/        sign-in, sign-up, verification and password pages (split-screen layout)
    dashboard/     signed-in account area (saved homes, enquiries, submissions, owner listings)
    admin/         administrator panel (overview, properties, approvals, featured, categories,
                   locations, media, users, agents, inquiries, notifications, reports, activity
                   log, testimonials, site settings, search, profile)
    api/           route handlers (public, account and admin endpoints)
  components/
    ui/            design-system primitives (icons, form fields, dialogs, toasts, badges, skeletons)
    site/          header, footer, navigation, legal page shell
    home/          homepage sections
    property/      cards, search, browser, gallery, map, favourites
    agent/         agent card
    forms/         auth, enquiry, sell and profile forms
    dashboard/     dashboard shell, tables, stat cards, chart, property form
    admin/         admin managers (properties, approvals, featured, categories, locations, media,
                   users, agents, inquiries, notifications, testimonials, settings)
  lib/             data access, validation, formatting, auth helpers, roles/permissions,
                   audit log, notifications, reports, upload validation
  styles/          design tokens and component styles (imported by app/globals.css)
```

The visual theme is defined in `src/styles/tokens.css` (deep navy `#142B45`, warm gold `#C49A55`, off-white `#F8F9FB`, charcoal `#252B35`; Poppins headings and Inter body text).

## Admin dashboard

The admin panel lives at `/admin`. It uses a dark navy sidebar (collapsible on desktop and stored per browser), a top bar with global search, a notifications bell and a profile menu, and breadcrumbs on every page. Every figure comes from the database; there is no sample data in the dashboard.

| Area | Path | What it does |
| --- | --- | --- |
| Overview | `/admin` | Total, active, pending, rejected, sold and rental listings; users, agents, inquiries and new inquiries; monthly charts; recent items; quick actions |
| Properties | `/admin/properties` | Create, edit, view, delete; approve/reject (with a reason the owner sees); publish/unpublish; feature; mark sold/rented; assign an agent; filters, sort and pagination |
| Approvals | `/admin/review` | Pending owner listings and public seller submissions |
| Featured | `/admin/featured` | Featured order, optional end dates (expired entries stop showing automatically) and the homepage limit |
| Categories | `/admin/categories` | Property types; renaming updates listings; a category in use can only be deleted by moving its listings |
| Locations | `/admin/locations` | Country → province → city → area → neighbourhood; bulk rename per level; locations in use cannot be deleted |
| Media | `/admin/media` | All listing images; the only image of a published listing is protected |
| Users | `/admin/users` | Roles (Super Admin, Admin, Agent, Property Owner, Regular User), edit, suspend/activate, delete, avatar |
| Agents | `/admin/agents` | Add agents (they receive a set-password email), approve/reject applications from `/dashboard`, activate/deactivate, assign listings, performance |
| Inquiries | `/admin/inquiries` | New / read / contacted / qualified / resolved / spam, internal notes, agent assignment, bulk spam delete |
| Notifications | `/admin/notifications` | Created by real events: registrations, submissions, listings awaiting approval, inquiries and agent applications |
| Reports | `/admin/reports` | Date-range reports (listings, registrations, inquiries, types, sale vs rent, approval rate, agent performance) with CSV export |
| Activity log | `/admin/activity` | Append-only audit trail with filters; passwords, tokens and keys are scrubbed before writing |
| Site settings | `/admin/settings` | General, Homepage (hero text/image, section toggles, featured limit), SEO and Contact tabs; drives the public site |
| Testimonials | `/admin/testimonials` | The homepage testimonial section only appears once a real testimonial is published |

### Roles and safety rules

Permissions are enforced on the server in every admin page and API route, not only by hiding buttons. Only a Super Admin can change another administrator or grant an administrator role. Nobody can suspend, delete or change the role of their own account, and the last active Super Admin can never be removed or demoted.

Other protections: non-GET API requests from another origin are rejected (`src/proxy.ts`), sign-in is rate limited (10 attempts per 15 minutes per email), admin sessions expire after 8 hours, uploads are checked by file content (JPEG, PNG and WebP only), and admin sign-ins and sign-outs are recorded in the activity log.

## Accounts and administrator access

Register at `/signup`; passwords must be at least 12 characters and include upper case, lower case, and a number. Passwords are bcrypt hashed. Auth.js issues a signed JWT session. Users must verify their email before signing in. Email verification and password reset links are one-time, expire, and are rate limited.

To grant administrator access, register an account and run in a trusted shell configured for the same database:

```powershell
$env:ADMIN_EMAIL = "admin@example.com"
$env:ADMIN_ROLE = "SUPER_ADMIN"   # optional; defaults to ADMIN
npm run admin:promote
Remove-Item Env:ADMIN_EMAIL, Env:ADMIN_ROLE
```

The script promotes an existing account; administrator promotion is not exposed as a public route. On an existing database, the `20261101000100_promote_super_admin` migration makes the earliest active administrator a Super Admin if there is none. On a new database, use `ADMIN_ROLE=SUPER_ADMIN` for the first administrator. After that, a Super Admin can manage roles from `/admin/users`.

## Optional services

- **Cloudinary:** set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` to enable signed listing image management. Uploads are restricted to supported image formats and size limits.
- **Local image storage (fallback):** without Cloudinary, uploaded images are saved to the `uploads/` folder in the project root and served from `/uploads/...`. This suits local development and single-server hosting with a persistent disk; back the folder up with the database. Hosts without a persistent filesystem (for example Vercel) need Cloudinary.
- **Google Maps:** set `NEXT_PUBLIC_MAP_API_KEY` to a key restricted to the Maps Embed API and the deployed site referrers.
- **Email:** set `EMAIL_FROM` to a verified sender and `EMAIL_API_KEY` to a Resend API key for account verification, password reset and the set-password link sent to agents created by an administrator. Business events (inquiries, submissions, applications) appear as in-app admin notifications; they are not emailed.

Keep secrets server-only and never commit `.env`.

## Commands

After pulling the admin dashboard changes, apply the new migrations (`20261101000000_admin_platform`, which adds categories, notifications, agent applications, featured ordering and expiry, and the extra settings and location levels; and `20261101000100_promote_super_admin`) with `npm run db:migrate`, then restart the server. Install dependencies again (`npm install`) to get `lucide-react`.

```sh
npm run db:generate
npm run db:migrate
npm run db:seed
npm run admin:promote
npm run typecheck
npm run lint
npm test
npm run build
```

## Deployment outline

Use a Node-compatible Next.js host and managed PostgreSQL. Configure production environment variables, generate Prisma Client, apply committed migrations, build, and run `npm start`. Set `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS domain. Configure trusted proxy headers only for a proxy you control. Back up PostgreSQL and test a rollback strategy before applying production migrations.

Replace the draft legal copy and sample listings with business-approved content and licensed property images. Apply the remaining launch checklist in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md), including staging verification with real provider credentials.
#   R e a l _ S t a t e s  
 