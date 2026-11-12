# ESHANTVA 3D Studio Website Rules

## Project identity

- This repository is the single master project for the public ESHANTVA 3D Studio website.
- Add every new public page inside this Next.js App Router project and connect it through the shared header, footer, configuration and data architecture.
- Do not create a separate standalone project or ZIP for each page.
- This is not the private ESHANTVA Studio Operations dashboard.
- Product pages are data-driven. Add records to `src/data/products.ts`; never create one source file per product.
- Keep `catalogMode: 'sample'` until all public product data has been approved.

## Public/private boundary

Never expose private operational data such as raw-material quantities, suppliers, purchase prices, reorder URLs, internal stock alerts, barcode mappings, staff activity, equipment details or procurement strategy.

- Present ESHANTVA through the customer starting point, practical path and honest capability level—not through private machinery or production details.
- Publish portfolio records only when the real-portfolio flag, publication status, customer approval and non-placeholder checks all pass.
- Never create fake portfolio work, customer stories, metrics or reviews.
- Display only verified public business identity from the central configuration; keep certificates and non-public licence details private. The shared business identity is the one source of truth for GST across all public pages.
- Keep customer-facing FAQ answers centralized in `src/data/faqs.ts`; page-specific FAQ previews should select from that source instead of copying business-rule text.
- Keep public About/brand-purpose content truthful: no invented founder story, team, history, milestones, partner claims, superiority claims or negative regional/institutional framing. Emphasize practical innovation access, verified identity and positive local relevance.

## Accuracy

- Do not invent products, prices, stock, reviews, ratings, customer counts, certifications, awards, turnaround times, phone numbers, email addresses, social profiles, GST or registration claims.
- Clearly label development data and placeholder assets.
- Keep unknown or unconfirmed functionality behind feature flags in `src/config/site.ts`.

## Design continuity

- Preserve the Clean Technical Studio + Product Commerce direction.
- Use warm neutral surfaces, charcoal typography and the centralized industrial-orange accent tokens in `src/styles.css`.
- Do not turn later pages into generic SaaS, AI, gaming or rainbow-gradient layouts.
- Reuse the established buttons, cards, header, footer, spacing system and responsive breakpoints.

## Development workflow

- Inspect existing routes, components, configuration and data files before editing.
- Replace only the relevant placeholder route when a new page is implemented, and keep sitemap/noindex state consistent with that change.
- Run `npm run typecheck` and `npm run build` after every page.
- Preserve accessibility, mobile behavior and honest development states.
- For supplied page implementations, integrate, test and repair the smallest verified defects; do not redesign working pages or regress earlier routes.

## Contact and appointment security

- `/contact/` is the canonical public Contact & Appointment page; appointment requests use `/contact/#appointment` rather than a second independent workflow.
- The verified public business email is centralized; do not invent additional public phone/email/WhatsApp channels.
- A private WhatsApp number must never be committed, placed in `NEXT_PUBLIC_*`, serialized to browser code, embedded in `wa.me`, or exposed in static output. Public WhatsApp remains disabled until a privacy-safe verified public identifier is explicitly configured.
- Contact/appointment submission follows the existing static frontend → Supabase Edge Function pattern. Never fake form success when the backend is not configured.
- General contact does not accept files or require a phone number. Route technical files to Custom Order and larger-quantity requirements to Bulk Order.
- Appointment submission is a request, not a confirmed booking. Do not invent business hours, availability or response-time SLAs.
- Run `npm run test:contact` and preserve the Page 12 privacy/security invariants during later integration work.

## Cart and Supabase production rules

- `/cart/` is a production guest cart, not a demo surface. Keep it `noindex, follow` and out of the sitemap.
- Product Details, Shop quick-add, Cart and Header count must use the same central cart state in `src/lib/cart.ts`.
- Keep guest cart persistence browser-local, versioned, schema-validated and free of payment data, uploaded project files and sensitive customer information.
- Treat stored cart price/configuration as customer intent. Checkout/order creation must revalidate current product, configuration and price server-side before creating an order.
- Never fabricate shipping, GST or a grand total in Cart before the authoritative checkout/order layer has the required delivery and tax context.
- Temporary/sample product records must not be purchasable. Keep `catalogMode: 'sample'` until the real catalog is approved.
- The dedicated website Supabase project is `ESHANTVA 3D Studio` in the `Gundam` organization. Never deploy ESHANTVA website migrations, functions or storage into `Project Rekhya`.
- Public Supabase URL/publishable-key configuration lives in `src/config/supabase.ts`. Never put service-role/secret keys or private Edge Function secrets in browser code.
- Database mutations for Custom, Bulk and Contact/Appointment are owned by Edge Functions. Preserve RLS, private storage buckets, explicit Data API grants and server-side validation.

## Page 14 checkout invariants
- `/checkout/` consumes the central Page 13 Cart and is `noindex, follow`; it is not in the sitemap.
- Browser Cart values are customer intent only. `commerce_products` plus the Checkout Edge Function are authoritative for purchasability, configuration, price, delivery and tax.
- Never seed SAMPLE products into `commerce_products` as purchasable records.
- No shipping/tax/payment value may be fabricated when its authoritative adapter/metadata is unresolved.
- `create_checkout_order_server` remains server/service-role only; browser roles do not directly mutate order/payment tables.
- Cart clearing is allowed only after authoritative paid/accepted order state, never merely on Checkout load or a failed payment attempt.

## Page 15 account/auth rules
- `/account/` is the unified Sign In / Create Account / Forgot Password route. `/account/reset/` is the minimal password-recovery/account-conversion landing route.
- Use `src/lib/supabaseBrowser.ts` as the single browser Supabase client. Do not create per-feature browser clients that can drift auth state.
- Existing Custom Order, Bulk Order, Contact and Checkout guest flows may create anonymous Supabase users. Do not silently sign them out or replace their identity during account creation.
- Converting an anonymous user to a permanent account must preserve the same auth user ID. The current client flow starts verified email linking and sets a password only after the identity is no longer anonymous.
- Signing an anonymous browser session into an existing permanent account does not transfer guest-owned records. Do not claim or implement ownership reassignment without an explicit server-side conflict/transfer design.
- Never use `user_metadata` for authorization. `full_name` is presentation-only.
- Never expose service-role/secret keys, passwords, recovery tokens or access tokens in browser logs or manual storage.
- Page 16 account dashboard/order history remains unimplemented until its dedicated phase.

## Page 16 Customer Dashboard boundary
- `/account/dashboard/` is customer-only and must require a permanent Supabase user session.
- Dashboard data must stay owner-scoped to the verified `auth.users.id`; never trust customer identity from URL or client payload.
- Do not expose internal order IDs, provider/payment raw data, idempotency keys, request hashes, internal metadata, staff notes or admin actions.
- Page 17 order details, Page 18 files/approvals and the future Admin Plane are separate phases.

## Page 17 customer order detail boundary
- `/account/orders/<PUBLIC-REFERENCE>/` is customer-facing and uses the public `ESHA-YYYY-XXXXXXXX` reference only; the public reference is never authorization.
- The static export serves `app/account/orders/page.tsx` as the order shell. Vercel rewrites reference paths to that shell, while the global static 404 boundary can recover the same shell on hosts without rewrites.
- Customer order detail reads must continue through `customer-dashboard-api`, require a permanent Supabase user, and bind both the public reference and verified user ID server-side.
- Never add direct browser SELECT or mutation grants to trusted order/payment/event tables for Page 17.
- Page 17 responses must exclude internal order/item IDs, gateway identifiers, request/idempotency hashes, raw event metadata, staff notes and operational details.
- Preserve the Claude Page 15 visual-refresh files unless an actual regression is reproduced.

## Customer files / approvals boundary
- Customer files and approval actions are server-authorized only. Never expose raw storage paths, permanent public object URLs, service-role credentials, internal artifact IDs, or staff-only metadata.
- Approval decisions must bind to the exact customer-visible artifact reference and revision. A newer visible revision makes an older pending approval stale.
- Page 18 is customer-only. Do not broaden it into an admin file manager or general upload surface.

## Admin Plane boundary
- `/admin/*` is a separate authorization plane from `/account/*`.
- Admin authorization must be verified server-side from trusted role data keyed to Supabase Auth user ID; never authorize from email or browser role state.
- Never expose Admin links in public navigation unless a future approved requirement explicitly changes that rule.
- Do not allow customer self-promotion or direct browser writes to admin role records.

## Admin Phase 4 artifact invariants
- Reuse `order_customer_artifacts`, `order_approval_requests`, and the private `customer-order-artifacts` bucket. Do not create a second customer artifact domain.
- Phase 4 runtime endpoint is `admin-artifact-api`. `admin-api` remains the Phase 1-3 operational API and should not acquire duplicate artifact actions.
- ADMIN may prepare/upload/publish artifacts and create approval requests. STAFF is read-only for artifact metadata and authorized preview/download.
- Browser requests use public order/artifact/upload references only. Never return or accept raw storage paths as browser contract fields.
- A publish always creates a new revision. Never overwrite an existing customer-visible artifact or transfer an older approval decision to a new revision.
- Approval creation is bound to exact public artifact reference + expected revision and must reject stale revisions.
- Upload/publish/approval mutations are idempotent and audited. Never bypass PREPARED -> UPLOADED -> PUBLISHED.

## Stage 1 public/internal and recruitment foundation
- `NEXT_PUBLIC_RETAIL_SURFACE` defaults to `public`. Shop, Product Details, Cart, Checkout, sample prices and sample product assets may appear only in an explicitly protected `internal` build.
- Preserve retail development code and data; do not delete it merely because the public surface hides it. Never advertise public retail routes through navigation, sitemap, JSON-LD or static product payloads while public mode is active.
- Legal content uses the centralized versioned policy source. Draft/review-required policies remain noindex until the owner-controlled decisions are approved.
- Recruitment is a separate candidate domain. A candidate requires a permanent, non-anonymous, email-confirmed Supabase Auth user; verified email is not identity verification.
- Candidate and application references are distinct tracking identifiers, never authorization. Candidate reads are owner-scoped; writes remain server-controlled and audited.
- Recruitment files use the private `recruitment-files` bucket. Never grant direct browser object access, expose raw storage paths or publish permanent document URLs.
- Never seed fake candidates, vacancies or recruitment documents. Runtime RLS/isolation claims require controlled database tests and must remain NOT_TESTED when that environment is unavailable.
