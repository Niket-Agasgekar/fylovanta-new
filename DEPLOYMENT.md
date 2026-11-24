# Fylovanta Production Deployment Guide

Fylovanta is a deployment-independent Node.js + Express + Vite/React application configured for **browser-first file processing** and **free-tier sustainability**. No proprietary hosting lock-in or paid third-party APIs are required.

---

## 1. Architecture Summary

- **Browser-First Processing (Default):** Images (JPG, PNG, WebP, BMP, ICO, GIF, SVG), PDF tools (merge, split, rotate, page numbers, watermark, page-to-image rendering, image-to-PDF, browser stream & image PDF compression), Documents/Data (DOCX, CSV, JSON, Markdown, TXT), and WAV audio export execute locally inside the user's browser sandbox with zero file upload or server bandwidth usage.
- **Feature-Flagged Heavy Compute (Disabled by Default):**
  - `ENABLE_MEDIA_TOOLS=false` / `VITE_ENABLE_MEDIA_TOOLS=false`: Pauses FFmpeg audio/video transcoding routes and excludes paused media pages from `/sitemap.xml` (while marking direct hits `noindex, follow`).
  - `ENABLE_SERVER_FALLBACKS=false` / `VITE_ENABLE_SERVER_FALLBACKS=false`: Keeps Ghostscript PDF fallback and ImageMagick HEIC/TIFF fallback off until explicitly enabled on a host that installs those binaries.
- **Stateless Analytics & Email:** Uses consent-gated **Google Analytics 4** for site/tool usage tracking and **Resend** for direct transactional contact form delivery (`niketagasgekar@gmail.com`) without requiring any database.

---

## 2. Build & Run Commands (Any Node 22+ Host)

Works identically on **Render, Railway, Fly.io, DigitalOcean App Platform, AWS App Runner, Docker, or a Linux VPS behind Nginx/Caddy**:

```bash
# 1. Install dependencies
npm ci

# 2. Export build-time VITE_* variables first (Vite bakes these into dist/ during build)
#    (See Section 3 for the complete variable list.)

# 3. Compile production frontend bundle (outputs to dist/)
npm run build

# 4. Run production Express + SSR metadata server on port 3000 (or host $PORT)
NODE_ENV=production PORT=3000 npm start
```

> **Important Build-Time vs Runtime Note:** All `VITE_*` variables (`VITE_SITE_URL`, `VITE_LEGAL_JURISDICTION`, `VITE_GA_MEASUREMENT_ID`, `VITE_ENABLE_MEDIA_TOOLS`, `VITE_ADSENSE_*`, etc.) are embedded into the client bundle during `npm run build`. Always define them in your CI/build environment before building `dist/`.

---

## 3. Environment Variables Reference

Copy `.env.example` to `.env` (for VPS/Docker) or add these keys in your platform's environment settings:

| Variable | Scope | Default / Example | Purpose |
| :--- | :--- | :--- | :--- |
| `APP_URL` | Server runtime | `https://fylovanta.com` | Canonical origin used by SSR meta tags, `/robots.txt`, `/sitemap.xml` |
| `VITE_SITE_URL` | Build time | `https://fylovanta.com` | Canonical site origin in client SEO & structured data |
| `VITE_SITE_DOMAIN` | Build time | `fylovanta.com` | Display domain in legal/brand copy |
| `VITE_LEGAL_ENTITY` | Build time | `Fylovanta, operated by an individual / sole proprietor` | Legal operator name displayed on legal pages |
| `VITE_LEGAL_JURISDICTION` | Build time | `India` | Operating jurisdiction displayed in Terms & Legal pages |
| `VITE_CONTACT_EMAIL` | Build time | `niketagasgekar@gmail.com` | Public clickable `mailto:` support address |
| `VITE_ENABLE_MEDIA_TOOLS` | Build time | `false` | Shows/hides UI dropzones & navigation active states for video/audio tools |
| `ENABLE_MEDIA_TOOLS` | Server runtime | `false` | Enables/disables FFmpeg endpoints (`/api/convert` audio/video) & sitemap inclusion |
| `VITE_ENABLE_SERVER_FALLBACKS` | Build time | `false` | Allows client to offer optional server fallbacks |
| `ENABLE_SERVER_FALLBACKS` | Server runtime | `false` | Enables `/api/compress-pdf` (Ghostscript) and ImageMagick fallback |
| `MAX_UPLOAD_MB` | Server runtime | `25` | Maximum upload size accepted by Express Multer middleware |
| `RESEND_API_KEY` | Server secret | `re_...` | Resend API key for contact inquiry email forwarding |
| `CONTACT_TO_EMAIL` | Server runtime | `niketagasgekar@gmail.com` | Inbox where Contact form inquiries are forwarded |
| `CONTACT_FROM_EMAIL` | Server runtime | `Fylovanta Support <support@fylovanta.com>` | Verified sender address in Resend |
| `VITE_GA_MEASUREMENT_ID` | Build time | `G-XXXXXXXXXX` | Optional GA4 tag ID (only loaded when visitor consents to All Cookies) |
| `VITE_GSC_VERIFICATION` | Build time | *(blank)* | Google Search Console verification token (client meta) |
| `GSC_VERIFICATION` | Server runtime | *(blank)* | Google Search Console verification token injected into SSR HTML |
| `VITE_ADSENSE_ENABLED` | Build time + Server | `false` | Feature flag controlling AdSense script loading & `/ads.txt` |
| `VITE_ADSENSE_CLIENT_ID` | Build time + Server | `ca-pub-...` | Optional AdSense publisher ID |
| `VITE_ADSENSE_SLOT_TOP` | Build time | *(blank)* | Optional top leaderboard ad slot ID |
| `VITE_ADSENSE_SLOT_MID` | Build time | *(blank)* | Optional mid-page ad slot ID |
| `VITE_ADSENSE_SLOT_SIDE` | Build time | *(blank)* | Optional sidebar/desktop ad slot ID |
| `VITE_ADSENSE_SLOT_TOOL` | Build time | *(blank)* | Optional dedicated tool page ad slot ID |

---

## 4. Email Delivery Setup (Resend + Domain DNS)

1. Create a free Resend account.
2. Under **Domains**, add `fylovanta.com` and publish the **SPF (`TXT`)**, **DKIM (`TXT`)**, and recommended **DMARC (`TXT`)** DNS records shown by Resend at your domain registrar.
   - While testing before DNS verification finishes, `onboarding@resend.dev` can only send to your Resend account's verified owner email (`niketagasgekar@gmail.com`). Verify `fylovanta.com` before expecting arbitrary visitor testing or custom sender headers like `Fylovanta Support <support@fylovanta.com>`.
3. Generate an API key in Resend and set `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, and `CONTACT_TO_EMAIL=niketagasgekar@gmail.com`.
4. **Delivery Behavior (No Database):** `POST /api/contact` validates inputs, enforces honeypot/delay anti-bot checks and rate limiting (`5 req / 5 min`), and sends directly via Resend without storing messages in a database. It returns HTTP `200` only if Resend confirms delivery; if Resend is unconfigured (`503`) or rejects/fails (`502`), the UI keeps the user's message intact with a **Retry Sending** button and direct `mailto:niketagasgekar@gmail.com` fallback.

---

## 5. Analytics & Search Console

### Consent-Gated Google Analytics 4
- Create a GA4 web data stream for `https://fylovanta.com` and copy the `G-XXXXXXXXXX` Measurement ID into `VITE_GA_MEASUREMENT_ID` before running `npm run build`.
- `gtag.js` is **never injected** unless `VITE_GA_MEASUREMENT_ID` is valid **and** the visitor clicks **Accept All** in the cookie consent banner (or saves `'all'` in Cookie Policy settings).
- Privacy rules: `anonymize_ip: true`, `allow_google_signals: false`, and zero filenames, file payloads, or contact form PII are ever passed in event parameters.

### Google Search Console & Crawling
- Add `https://fylovanta.com` as a URL-prefix or Domain property in Google Search Console.
- Either verify via DNS `TXT` record or copy the HTML verification token into `GSC_VERIFICATION` / `VITE_GSC_VERIFICATION`.
- Submit `https://fylovanta.com/sitemap.xml` in Search Console. Disabled media tool pages remain omitted from `/sitemap.xml` and return `<meta name="robots" content="noindex, follow">` when `ENABLE_MEDIA_TOOLS=false`.

---

## 6. Google AdSense Activation (Later)

1. Once approved by Google AdSense, set:
   - `VITE_ADSENSE_ENABLED="true"`
   - `VITE_ADSENSE_CLIENT_ID="ca-pub-YOUR_PUBLISHER_ID"`
   - `ADSENSE_CLIENT_ID="ca-pub-YOUR_PUBLISHER_ID"` (if injecting into runtime without rebuilding server)
   - `VITE_ADSENSE_SLOT_TOP`, `VITE_ADSENSE_SLOT_MID`, `VITE_ADSENSE_SLOT_SIDE`, `VITE_ADSENSE_SLOT_TOOL`
2. Rebuild with `npm run build` so Vite embeds the `VITE_ADSENSE_*` values.
3. Verify `https://fylovanta.com/ads.txt` renders `google.com, pub-..., DIRECT, f08c47fec0942fa0`. AdSense scripts load only after cookie consent `'all'`.

---

## 7. Reverse Proxy / HTTPS Notes

- `server.ts` configures `app.set('trust proxy', 1)` so `X-Forwarded-Proto` and `X-Forwarded-Host` work behind Nginx, Cloudflare, Render, Railway, or Fly.io.
- Ensure your reverse proxy sets a request body upload limit matching or slightly above `MAX_UPLOAD_MB` (e.g., Nginx `client_max_body_size 30m;`) if server fallbacks are later enabled.

---

## 8. Free-Tier Limits & Cost Assessment

| Component | Free-Tier Allowance | Fylovanta Usage Pattern | Cost Status |
| :--- | :--- | :--- | :--- |
| **Image / PDF / Document Tools** | Client CPU & RAM | Executed 100% locally in the visitor's browser | **$0 / free** |
| **Node.js / Express Hosting** | Render / Fly / Railway / VPS | Static assets + stateless APIs (`MEDIA_TOOLS=false`, no DB) | **$0–low free tier** |
| **Resend Transactional Email** | 3,000 emails/mo (100/day free) | Direct support inquiries (`5 req / 5 min` rate-limited + honeypot) | **$0 free tier** |
| **GA4 + Search Console** | Unlimited standard property | Primary consent-gated page & tool telemetry | **$0 free tier** |

---

## 9. Owner Launch & Maintenance Notes

- **Operator & Jurisdiction Configured:** Legal pages identify the site as **Fylovanta, operated by an individual / sole proprietor** with **India** as the initial operating jurisdiction and `niketagasgekar@gmail.com` as the public contact email (no personal phone number or residential address is published).
- **Optional Future Reviews:** If the site grows significantly, enables server-side media transcoding, or activates Google AdSense monetization, consider having an independent legal professional review policies for any newly introduced features or regional requirements.
