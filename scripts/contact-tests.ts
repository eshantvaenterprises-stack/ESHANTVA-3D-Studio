import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { businessIdentity } from '../src/config/businessIdentity';
import { contactConfig } from '../src/config/contact';
import { siteConfig } from '../src/config/site';

let checks = 0;
const check = (condition: unknown, message: string) => { assert.ok(condition, message); checks += 1; };
const root = new URL('..', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), 'utf8');

const placeholder = read('app/[...path]/page.tsx');
const sitemap = read('app/sitemap.ts');
const page = read('app/contact/page.tsx');
const sections = read('src/components/contact/ContactSections.tsx');
const forms = read('src/components/contact/ContactForms.tsx');
const contactApi = read('src/lib/contactApi.ts');
const contactConfigSource = read('src/config/contact.ts');
const siteSource = read('src/config/site.ts');
const navSource = read('src/data/navigation.ts');
const homeLocation = read('src/components/home/LocalServiceSection.tsx');
const envExample = read('.env.example');
const migration = read('supabase/migrations/20260922190319_contact_requests.sql');
const edge = read('supabase/functions/contact-request-api/index.ts');

check(existsSync(new URL('app/contact/page.tsx', root)), '/contact page must exist.');
check(!placeholder.includes("'contact'"), '/contact must no longer be a catch-all placeholder.');
check(placeholder.includes("'appointment'"), '/appointment should remain a noindex placeholder while appointment uses /contact/#appointment.');
check(sitemap.includes("'/contact'"), '/contact must be in the implemented sitemap route set.');
check(page.includes("canonical: '/contact/'"), 'Contact canonical missing.');
check(page.includes('robots: { index: true, follow: true }'), 'Contact page must be indexable.');
check(page.includes('BreadcrumbList'), 'Contact BreadcrumbList structured data missing.');

check(contactConfig.publicEmail === 'contact@eshantva3d.co.in', 'Founder-approved Studio business email must remain canonical.');
check(siteConfig.email === contactConfig.publicEmail, 'Public email must be centralized consistently.');
check(contactConfig.whatsappPublicContactEnabled === true, 'Founder-approved WhatsApp outbound contact must be enabled.');
check(contactConfig.whatsappUsername === '@ESHANTVA_3D_Studio', 'Approved WhatsApp username changed.');
check(contactConfig.whatsappChatUrl === 'https://wa.me/ESHANTVA_3D_Studio', 'WhatsApp documented direct-chat URL changed.');
check(contactConfig.whatsappUsernameVerified === false, 'A non-verified WhatsApp live-chat claim is not allowed.');
check(contactConfig.arattaiUsername === '@eshantva3dstudio', 'Approved Arattai username changed.');
check(contactConfig.arattaiChatUrl === 'https://aratt.ai/message/@eshantva3dstudio', 'Arattai direct-chat URL changed.');
check(contactConfig.arattaiDownloadUrl === 'https://www.arattai.in/download.html', 'Arattai official download URL changed.');
const channelUi = read('src/components/contact/BusinessContactChannels.tsx');
check(page.includes('<BusinessContactChannels />'), 'Compact chat launchers must appear in Contact page.');
check(channelUi.includes('rel="noopener noreferrer"'), 'External chat tabs must use noopener noreferrer.');
check(channelUi.includes('target="_blank"'), 'External chat links must open separate tabs.');
check(channelUi.includes('className={`${styles.bubble}'), 'Compact round chat bubble controls missing.');
check(channelUi.includes('aria-label="Open ESHANTVA'), 'Accessible external link names missing.');
check(!channelUi.includes('<details') && !channelUi.includes('<article'), 'Full-sized chat cards must not return.');
check(!channelUi.includes('ESHANTVA_Recruitment_Updates'), 'Recruitment channel must not be linked to public customer contact.');

check(siteConfig.whatsapp === null, 'No public WhatsApp number may be stored in siteConfig.');
check(!contactConfigSource.includes('NEXT_PUBLIC_WHATSAPP'), 'Client-side WhatsApp number env must not exist.');
check(!envExample.includes('NEXT_PUBLIC_WHATSAPP'), '.env.example must not suggest a client-side WhatsApp secret.');
check(!/wa\.me\/|api\.whatsapp\.com\/send\?phone=/i.test(`${sections}\n${forms}\n${siteSource}`), 'Phone-based WhatsApp URL must not ship.');

const approvedMap = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d353.2165202166246!2d93.1584330441482!3d26.728898284570498!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x37445fefa0de0e25%3A0x478d7150d4601462!2sESHANTVA%20STRATEGIC%20HUB%20FOR%20ADVANCEMENT(ESHA%20Hub)!5e1!3m2!1sen!2sin!4v1789934332783!5m2!1sen!2sin';
check(siteConfig.mapEmbedUrl === approvedMap, 'Approved map embed must remain exact.');
check(siteConfig.directionsUrl === 'https://www.google.com/maps/dir/?api=1&destination=26.728898284570498%2C93.1584330441482', 'Directions must target the approved map coordinates.');
check(sections.includes('title="ESHANTVA location map"'), 'Map iframe title missing.');
check(sections.includes('referrerPolicy="strict-origin-when-cross-origin"'), 'Map referrer policy missing.');
check(homeLocation.includes('referrerPolicy="strict-origin-when-cross-origin"'), 'Home map must use the approved referrer policy.');
check(homeLocation.includes('href={siteConfig.directionsUrl}'), 'Home directions CTA must consume the centralized URL.');

check(navSource.includes("href: '/contact/#appointment'"), 'Footer Appointment link should route to the contact appointment anchor.');
check(forms.includes('Request ≠ confirmed appointment.'), 'Appointment request must not be presented as confirmed.');
check(forms.includes('does not confirm an appointment'), 'Appointment fallback must preserve request semantics.');
check(!/9 AM|9AM|Monday\s*[–-]\s*Saturday|response within|same-day/i.test(`${page}\n${sections}\n${forms}`), 'Invented hours/SLA detected.');
check(!forms.includes('type="tel"'), 'Contact/appointment forms must not request a phone number.');
check(!forms.includes('type="file"'), 'Generic contact/appointment forms must not upload files.');
check(forms.includes('ct-honeypot'), 'Honeypot anti-spam field missing.');
check(edge.includes('RATE_LIMIT_SALT'), 'Server-side rate limiting salt requirement missing.');
check(edge.includes('CONTACT_ALLOWED_ORIGINS'), 'Server-side origin allowlist missing.');
check(edge.includes('maxBodyBytes'), 'Backend request-size limit missing.');
check(edge.includes('request.body.getReader()'), 'Backend must enforce the body limit against actual streamed bytes.');
check(edge.indexOf("event_type: 'SUBMISSION_ATTEMPT'") < edge.indexOf('JSON.parse(bodyText)'), 'Malformed bodies must count toward the rate-limit window.');
check(edge.includes('return reply(null, 403'), 'Disallowed origins must not receive a reflected CORS allow-origin header.');
check(edge.includes("timeZone: 'Asia/Kolkata'"), 'Past-date validation must use the business timezone.');
check(edge.includes("parsed.preferredPeriod === 'specific_time' ? parsed.specificTime : null"), 'Non-specific appointment windows must not persist an unrelated time.');
check(edge.includes("source: 'website-contact'"), 'Website contact source must be assigned server-side.');
check(edge.includes("page: '/contact'"), 'Contact page source marker must be assigned server-side.');
check(migration.includes('force row level security'), 'Contact tables must force RLS.');
check(migration.includes('No direct browser read/write policies'), 'Contact backend must not create public direct-write policies.');
check(migration.includes("preferred_period is distinct from 'specific_time' or preferred_time is not null"), 'Database must require a time for specific-time appointment requests.');
check(migration.includes("preferred_period = 'specific_time' or preferred_time is null"), 'Database must reject irrelevant times for broad appointment windows.');
check(migration.includes('contact_request_events_request_idx'), 'Event foreign-key lookups need an index for request lifecycle operations.');
check(contactApi.includes('contactBackendConfigured'), 'Contact UI must be feature-aware for backend availability.');
check(
  forms.includes('Secure web submission is temporarily unavailable.') &&
    forms.includes('verified public business email'),
  'Unavailable web submission must provide a truthful verified contact route.',
);
check(!forms.includes('Message sent successfully'), 'Fake unconditional success copy detected.');

check(businessIdentity.gstin === '18DHLPG9662M1ZH', 'Verified GSTIN changed unexpectedly.');
check(!sections.includes('18DHLPG9662M1ZH'), 'Contact body must not hardcode GSTIN.');
check(!/trade licence|trade license/i.test(`${page}\n${sections}\n${forms}`), 'Trade Licence data should not be published on Contact.');
check(businessIdentity.publicLocation === 'Biswanath, Assam, India', 'Approved public location changed unexpectedly.');
check(!/postalAddress|geoLatitude|geoLongitude|openingHours|telephone/.test(page), 'Structured data must not invent contact/location facts.');
for (const defensiveCopy of ['without exposing private contact details', 'Direct WhatsApp contact is not published', 'No certificate scans or private licence details']) {
  check(!sections.includes(defensiveCopy), `Customer-facing defensive copy should be neutral: ${defensiveCopy}`);
}

for (const route of ['/about', '/faq', '/how-it-works']) check(sitemap.includes(`'${route}'`), `${route} sitemap entry must remain.`);
check(sitemap.includes('portfolioIsLive'), 'Page 8 portfolio gate must remain.');
for (const route of ['about', 'faq', 'how-it-works', 'our-work']) check(!new RegExp(`['\"]${route}['\"]`).test(placeholder), `${route} must remain outside placeholder routes.`);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...walk(full));
    else if (/\.(?:ts|tsx|js|jsx|json|html|css|md)$/.test(name)) out.push(full);
  }
  return out;
}
const secret = process.env.WHATSAPP_PRIVATE_NUMBER?.trim();
if (secret) {
  check(secret.length >= 6, 'Private WhatsApp test secret is too short to scan safely.');
  for (const dir of ['app', 'src', 'public']) {
    for (const file of walk(new URL(dir, root).pathname)) {
      check(!readFileSync(file, 'utf8').includes(secret), `Private WhatsApp secret leaked into public source (${dir}).`);
    }
  }
}

for (const forbidden of ['NEXT_PUBLIC_WHATSAPP_NUMBER', 'PUBLIC_WHATSAPP_NUMBER']) {
  check(!`${contactConfigSource}\n${siteSource}\n${envExample}\n${forms}\n${sections}`.includes(forbidden), `Forbidden client WhatsApp variable found: ${forbidden}`);
}

console.log(`Contact/security static checks passed: ${checks}`);
