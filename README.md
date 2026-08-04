# Stat Room Borrowing — ระบบยืม-คืนของ ห้องสแตท

Room-equipment borrow / return app for **Stat Club (จุฬาฯ)**. Built with Next.js
(App Router, TypeScript) + Tailwind CSS + shadcn/ui, with Light/Dark
(Purple & Black) theming via `next-themes`.

## Tech stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS** with shadcn/ui component tokens
- **next-themes** for light/dark mode
- **lucide-react** icons

## Getting started

Requires Node.js **18.18+** or **20+**.

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

Other scripts:

```bash
npm run build   # production build
npm run start   # serve the production build
npm run lint    # next lint
```

## Project structure

| Path | Purpose |
| --- | --- |
| `app/layout.tsx` | Root layout: fonts, `ThemeProvider`, `Header`, page background |
| `app/page.tsx` | Landing page: hero banner + borrow / return / contact actions |
| `app/admin/` | Admin panel (inventory + borrowing logs) |
| `app/globals.css` | Tailwind base + light/dark CSS-variable color tokens |
| `components/header.tsx` | Sticky header: logo (left) + theme toggle (right) |
| `components/home-actions.tsx` | Landing action cards + Contact Us (Linktree) bar |
| `components/borrow-form.tsx` / `return-form.tsx` | Borrow & return flows |
| `components/user-info-fields.tsx` | Shared borrower info fields |
| `components/theme-toggle.tsx` | Sun/Moon theme toggle |
| `components/ui/` | shadcn/ui primitives |
| `lib/store.ts` | In-memory data store |
| `lib/mock-data.ts` | Mock inventory data |
| `lib/borrow-utils.ts` / `utils.ts` | Helpers (`cn()`, borrow logic) |

## Theme

- **Dark:** black background, neon violet primary.
- **Light:** soft purple/gray background, purple primary.
- Toggle with the Sun/Moon button in the header. System preference is respected.

## Contact

All club contact channels: https://linktr.ee/statclub.cu

## Notes

- The admin passcode gate is **client-side only** — it is a convenience gate, not
  real security. Do not rely on it to protect sensitive data.
- Inventory is currently backed by mock data (`lib/mock-data.ts` / `lib/store.ts`);
  swap in a real backend (Google Sheets API / Supabase) for production.
