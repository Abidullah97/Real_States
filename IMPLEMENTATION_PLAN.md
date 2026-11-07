# Build checklist

## Implemented in the workspace

- [x] Next.js App Router, TypeScript, Tailwind, PostgreSQL/Prisma, Zod and Auth.js credentials.
- [x] Responsive homepage, listing search and detail pages, metadata, sitemap, robots and not-found page.
- [x] Listing detail galleries, favorites, contact inquiries, seller submissions and agent directory.
- [x] Account registration, sign-in, profile/password change and protected user dashboard.
- [x] Admin property management, listing moderation, lead assignment/status updates and user role/suspension management.
- [x] Owner/agent draft listing management, signed Cloudinary image upload/removal/reordering and Google Maps Embed display.
- [x] Server-side role and ownership checks, bcrypt password hashes, Zod validation, audit log writes and PostgreSQL-backed rate limits.
- [x] Email verification, resend flow, password reset with expiring one-time tokens, and verified-email sign-in gate.
- [x] Server-filtered, paginated property search with location, listing type, property type, price range, bedroom count and sort.
- [x] Optional seller-submission image uploads with signed Cloudinary storage, moderation preview, approval attachment and rejection cleanup.
- [x] PostgreSQL schema, ordered migrations, seed data and existing-account admin promotion script.
- [x] Production lint, TypeScript and optimized build pass in this workspace.
- [x] Phase 2 premium redesign: design tokens (`src/styles/tokens.css`), self-hosted fonts via `next/font` (now Poppins + Inter), shared site header/footer and route-group layouts, new homepage (hero search, featured grid, data-derived city showcase, editorial section, how-it-works, agents, CTA), marketplace listings (sidebar/drawer filters, chips, sort, grid/list, pagination, loading/empty/error states), brochure-style detail pages (mosaic gallery + lightbox, specifications, sticky enquiry card, similar properties, mobile contact bar), split-screen auth pages, and a dashboard design system shared by the admin panel and account area (sidebar, stat cards, responsive data tables, slide-over editors, confirmation dialogs, toasts).
- [x] Luxury theme refresh: deep navy / warm gold tokens (contrast-checked), Poppins + Inter, full-bleed hero with Buy / Rent / Sell search, homepage categories, latest listings and admin-curated testimonials, agent profile pages (`/agents/[id]`).
- [x] Admin additions: six-metric overview (properties, active, pending, inquiries, users, agents), Agents, Categories & locations, Testimonials, Site settings and Profile & account pages, with admin-only, Zod-validated, audit-logged APIs.
- [x] Additive migration `20261031000000_testimonials_site_settings` (new `Testimonial` and `SiteSettings` tables; no existing columns changed).
- [x] Components reorganised into domain folders (`ui`, `site`, `home`, `property`, `agent`, `forms`, `dashboard`, `admin`); development email fallback prints verification/reset links to the console.
- [x] End-to-end checks run against a local database: admin sign-in, testimonial CRUD/publish, site settings, location edit, property create/edit/publish/archive/restore/delete, image-upload error handling, role protection (403/401), and register → verify → sign in → reset password (dev).
- [x] Forms use shared fields with visible labels, required markers, inline validation, loading/disabled states and success confirmation.
- [x] Visual review with headless Chrome against a production build at 375, 768, 1024 and 1440px for public, auth, account and admin pages, using a local test database; no horizontal overflow at any reviewed size.
- [x] Professional admin dashboard: collapsible dark sidebar, global search, notifications, breadcrumbs; database-backed overview with charts; full property lifecycle (approve/reject with reason, publish, feature with order/expiry, sold/rented, agent assignment); categories; five-level locations; media library with in-use protection; users with Super Admin / Admin / Agent / Property Owner / Regular User roles and self/last-Super-Admin protection; agent applications and management; inquiry desk (read/contacted/resolved, notes, assignment, spam purge); event notifications; reports with CSV export; activity log; tabbed site settings (general, homepage, SEO, contact).
- [x] Migrations `20261101000000_admin_platform` and `20261101000100_promote_super_admin` (additive; existing property types seeded as categories).
- [x] Security: server-side RBAC on every admin page/API, cross-origin write blocking, sign-in rate limit, 8-hour sessions, content-sniffed uploads, CSV formula-injection protection, secret scrubbing in audit metadata.
- [x] Admin end-to-end suite (headless Chrome against a production build and a local PostgreSQL-compatible database) covering every module above, role rules, CSRF, rate limiting and audit entries.

## External setup required before launch

- [ ] Provide PostgreSQL credentials, apply all migrations and verify the seed and database-backed flows.
- [ ] Configure Cloudinary credentials and test signed uploads, image removal and storage limits.
- [ ] Configure a restricted Google Maps Embed API key if maps are desired.
- [ ] Configure a Resend API key and verified sender; verify the account email and reset messages arrive in staging.
- [ ] Optional: email business notifications. Inquiries, submissions and applications currently create in-app admin notifications only.
- [ ] Replace draft legal/privacy copy and demo listings/photos with operator-approved, licensed content.
- [ ] Set a production domain and trusted proxy configuration; review CSP, backups, monitoring and incident response.
- [ ] Complete browser/device, accessibility, security and end-to-end testing against a configured staging deployment. Local visual review covered the public homepage, property browser, detail page and mobile filter drawer; authenticated admin pages and database-backed flows still need a configured staging account/database.

## Known functional limitations

- Saved searches and email notifications for new inquiries/submissions are not implemented (in-app admin notifications are).
- Cloudinary uploads (listing images, avatars, logo/favicon/hero/OG images) and agent set-password emails were tested only in their "not configured" error paths; verify them with real credentials in staging.
- Legal copy is draft text and requires review for the operator and jurisdiction.
- No PostgreSQL instance or third-party service credentials are configured in this workspace, so those integrations cannot be validated here.
