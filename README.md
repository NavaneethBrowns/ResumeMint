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
- **Import**: PDF (pdf.js), DOCX (mammoth), TXT, or JSON backup → heuristic parser, or Gemini for higher accuracy.
- **Export**: PDF (browser print, selectable text), DOCX, PNG, HTML, TXT, JSON.
- Multiple resumes, undo/redo (Ctrl+Z / Ctrl+Shift+Z), autosave to localStorage.

## AI (optional)
Uses the **Google Gemini API free tier**. Create a key at https://aistudio.google.com/app/apikey and paste it in the app (✨ icon). The key is stored in your browser only and calls go directly to Google. Free-tier prompts may be used by Google to improve products.

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
server/        Razorpay order/verify/webhook handlers (server-only)
netlify/       Netlify Functions wrapping server/ handlers
tests/         vitest unit tests
```
