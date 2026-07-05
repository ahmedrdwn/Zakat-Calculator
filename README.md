# البنك الشخصي — Personal Bank

تطبيق شخصي لتسجيل الثروة عبر جميع الحسابات والأصول (نقد، ذهب، فضة، أسهم، صناديق، عقارات، بضاعة تجارية…)، مع احتساب زكاة دقيق يراعي الحول لكل بند على حدة.

Personal-bank web app for tracking wealth across every account and asset shape (cash, gold, silver, stocks, funds, real estate, business inventory…), with a zakat engine that respects per-lot hawl.

## Features

- **Wealth ledger** — accounts (banks, wallets, safes, brokers, real estate, businesses) and asset lots (cash, gold with karat, silver, stocks, funds, receivables, inventory, personal items).
- **Dated acquisitions** — every asset add and every deposit stamps its acquisition date so hawl is tracked lot-by-lot.
- **Transactions engine** — deposit, withdraw, transfer, buy, sell, income, expense, revalue, zakat paid. Withdrawals consume lots FIFO; transfers preserve the original acquisition dates of the moved money.
- **Two zakat modes**
  - **FIFO** — zakat only on lots aged ≥ 365 days (each dirham has its own hawl).
  - **Pool-anchored** — you set the date the pool first reached nisab; zakat is due on the whole pool at each anniversary.
- **Dashboard** — net wealth, distribution by asset type, hawl-aging bar, nisab check, live zakat due.
- **Arabic reports** — professional RTL print-to-PDF report (nisab & hawl summary, itemized breakdown, verdict, references) + 3-sheet Excel export (zakat, assets, transactions).
- **Local-first storage** — everything stays in your browser (`localStorage`). One-click JSON backup / restore for moving between devices.

## Stack

- Preact + `@preact/signals` for fine-grained reactivity
- Vite as build tool
- Vanilla CSS with the original dark-green + gold Amiri/Tajawal design
- No backend, no framework lock-in, deploys as static files

## Run locally

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # outputs dist/
npm run preview   # preview the built app
```

## Deploy to Vercel

Vercel auto-detects Vite. Just import the repo — build command `npm run build`, output `dist`. `vercel.json` handles SPA rewrites.

## Data model in a nutshell

- **Account** — a place where wealth is held (bank, wallet, safe, broker, real-estate, business).
- **Lot** — a dated acquisition unit inside an account. Every asset shape is a lot: cash amount, gold weight, stock units, etc. `acquiredAt` is the hawl anchor for that lot.
- **Transaction** — a dated event that creates or consumes lots (FIFO for withdrawals; date-preserving for transfers).

## Roadmap

- Phase 3: full zakat engine with reports (present)
- Phase 4: specialized fiqh (rental income زكاة الغلة, business عروض التجارة)
- Phase 5: budgets, income/expense analytics, net-worth trend
- Phase 6: cloud sync (Supabase) for multi-device
- Phase 7: live gold/silver/stock prices via API

## License

Use freely. For religious accuracy, consult a qualified Islamic scholar.
