# Memory

## Project
**GSCC Pro** — Care centre elderly management webapp (Malaysian context).

## Stack
Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Supabase (Postgres + RLS + Auth), Vercel.

## Key Conventions
- Server Components for data fetching; Server Actions for mutations
- `router.refresh()` after mutations to re-fetch server data
- `localStorage` for lightweight client-side persistence (e.g. last visited month)
- Currency: RM (Malaysian Ringgit) — format with `toLocaleString('en-MY', { minimumFractionDigits: 2 })`
- Dates: `DD/MM/YYYY` display format; `YYYY-MM-DD` storage format
- Billing month: `YYYY-MM` format
- Charge amount stored = unit_price × quantity

## Roles
- **Admin** — full CRUD, staff management, charge items, import/export
- **Staff** — view residents, add care notes; can see Payments and Extra Charges

## People
| Who | Note |
|-----|------|
| User | Runs the care centre, primary admin |

## Terms
| Term | Meaning |
|------|---------|
| Hub | Standalone page aggregating data for all residents (e.g. Extra Charges Hub) |
| Billing month | The month a charge appears on; `YYYY-MM` |
| Charge item | Reusable preset for common charges (e.g. Transport, Diapers) |
| Resident price | Per-resident override price for a charge item |
| Statement | Per-resident monthly invoice (screenshot-able for WhatsApp) |
| Discharged | Resident who has left; shown in hub for 2 months after discharge |

## Pending Features
- Recurring extra charges — auto-populate monthly charges per resident
