# Resumint — Resume Builder + ATS Checker

A fast, private, client-side resume builder with 13 templates, deep customisation, live ATS scoring, resume import (PDF/DOCX/TXT/JSON) and 6 export formats.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # parser + ATS unit tests
npm run build    # type-check + production build
```

## Features
- **13 templates** (ATS Classic, Modern, Creative, Executive) built from one renderer + composable styles (`src/data/templates.ts`, `src/styles/resume.css`).
- **Customise**: accent colour, 12 fonts, size, line height, margins, spacing, paper (A4/Letter), photo/icons, drag-and-drop section order, main/sidebar column per section, rename/hide sections.
- **Live ATS score**: 25+ offline checks (contact, structure, impact, length, formatting, keywords vs. job description).
- **Import**: PDF (pdf.js), DOCX (mammoth), TXT, or JSON backup → smart AI import (see below), with an offline heuristic parser as fallback.
- **Export**: PDF (browser print, selectable text), DOCX, PNG, HTML, TXT, JSON.
- Multiple resumes, undo/redo (Ctrl+Z / Ctrl+Shift+Z), autosave to localStorage.

## AI (optional)
Uses **Google Gemini**. Two ways to power it:
- **Site AI bridge** — set `GEMINI_API_KEY` on the server (`.env` locally, Netlify env vars in production) and visitors need no key. `POST /api/ai/resume` only accepts the fixed resume-import tasks (never free-form prompts), checks the origin, caps input size and rate-limits per IP (`AI_RATE_LIMIT`, default 12 requests / 10 min per instance). Also set a quota or budget alert in Google Cloud. Optional `GEMINI_MODEL` (default `gemini-2.5-flash`).
- **Own key** — users can paste a free key from https://aistudio.google.com/app/apikey (✨ icon). It is stored in the browser only, calls go directly to Google, and it is tried before the site bridge. Free-tier prompts may be used by Google to improve products.

### Smart import ("reading the room")
`src/lib/ai/resumeIntel.ts` (shared by browser and server):
1. **Profile** — the model infers primary role, domain, industry, seniority (student → executive), years of experience (overlaps merged, internships half), career trajectory, region and strengths. Age, date of birth, marital status, religion, photo and similar personal data are never extracted or inferred.
2. **Strategy** — section order adapts (e.g. freshers: education + projects first; seniors: experience first; career switchers: skills + projects first; academia: education + publications).
3. **Rewrite** (the "Recruiter-ready rewrite" toggle) — concise, impact-first bullets, bullet budgets by recency, domain-named skill groups. Facts are never invented; every employer and degree is kept.
4. **Page budget** — one page is the default and the goal. More pages (2, or 3 for research CVs and 20+ year careers) only when the rewritten content is still clearly over a page *and* there is a reason: 8+ years or senior scope, 5+ roles, 4+ substantial projects, a career that started 15+ years ago, a research record, or many certifications/awards. Career length (since the first job or degree) is used as a stand-in for age, so a birth date is never read or shown. If the draft overflows, a second "tighten" pass condenses it (rejected if it drops an employer); if it then fits on fewer pages, the smaller count wins, and slight overflow is absorbed by compact typography. The import dialog explains the page count.
5. **Checks** — organisations not found in the source file are flagged for review.

The ATS checker extracts without rewriting, so scores reflect the original resume.

## Support us (Razorpay)
`#/support` (linked from the landing nav, footer and the builder toolbar) accepts voluntary contributions through Razorpay Checkout — UPI, cards and netbanking in INR, plus cards in USD/EUR/GBP. It mirrors the NutriSutraLife setup:

1. The browser asks `POST /api/razorpay/order` for an order. The server validates the amount and returns the order, the public key ID and a signed order token.
2. Razorpay Checkout opens with that order.
3. `POST /api/razorpay/verify` checks the order token and Razorpay's payment signature. The key secret never reaches the browser.
4. Optional: `POST /api/razorpay/webhook` verifies and logs Razorpay webhook events.

The API runs as Netlify Functions (`netlify/functions` → `server/`). Requires **Node 22.12+**.

**Credentials** — until they are set, the page shows "Contributions are not enabled yet."
- Local: copy `.env.example` to `.env` and fill in `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` (use `rzp_test_*` keys). `npm run dev` serves the functions through `@netlify/vite-plugin`.
- Netlify: add the same variables under *Site configuration → Environment variables* (Functions scope). Optionally add `RAZORPAY_WEBHOOK_SECRET` and point a Razorpay webhook at `https://<domain>/api/razorpay/webhook`.
- `netlify.toml` already sets the build command, the `dist` publish folder, the functions folder and Node 22.

## Structure
```
src/
  data/        templates, sections registry, sample data
  lib/         ats/ (scoring), parser/ (extract + parse + normalise), export/, ai/, text helpers, router
  store/       zustand stores (resumes with history, settings, ui)
  components/  resume renderer, editor, design, ats, import, export, ui primitives
  pages/       Landing, Builder, AtsChecker, Support
server/        Razorpay order/verify/webhook + AI bridge handlers (server-only)
netlify/       Netlify Functions wrapping server/ handlers
tests/         vitest unit tests
```
