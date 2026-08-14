# Stealth Startup · CodeViz

A cross-platform **desktop app** for learning data structures and algorithms by **visualizing code you write** in multiple languages.

## AlgoViz

Open `AlgoViz/AlgoViz.xcodeproj` in Xcode and run on an iPhone simulator or device.

### What's included

- SwiftUI home screen organized by DSA category
- Interactive visualizations with step-by-step playback
- **Bubble Sort** — animated bar chart with compare/swap steps
- **Binary Search** — visual search over a sorted array
- Placeholder topics for arrays, linked lists, trees, and graphs

### Project structure

```
AlgoViz/
  AlgoViz/
    Algorithms/     # Step generators for each visualization
    Models/         # Topics, categories, visualization steps
    Services/       # Lesson catalog
    ViewModels/     # Playback and home screen state
    Views/          # SwiftUI screens and components
```

### Requirements

- Xcode 16+
- iOS 17+

## CodeViz Desktop (primary product)

Cross-platform desktop SaaS for visual DSA learning.

### Features

- Login / registration with **7-day free trial**
- **$2/month** Stripe subscription after trial (access revoked when trial ends)
- Personal question library with starter and solution code per language
- Monaco code editor
- **Full step-by-step visualization** for Python, JavaScript, Java, C, C++, C#, and Go
- Array bar charts, graph snapshots, variable diff highlighting, playback controls

### Tech stack

| Layer | Choice |
|-------|--------|
| Desktop shell | Electron |
| Frontend | React 19 + TypeScript + Vite + Tailwind |
| Editor | Monaco Editor |
| API | Express 5 (embedded in Electron) |
| Database | SQLite via Node.js `node:sqlite` |
| Auth | JWT + bcrypt |
| Payments | Stripe subscriptions |

### Quick start

```bash
cd desktop
npm install
node scripts/ensure-electron.js   # if Electron fails to launch
npm run electron:dev
```

Demo admin: `admin@codeviz.app` / `admin123`

### Stripe setup ($2/month)

1. Create a product in [Stripe Dashboard](https://dashboard.stripe.com) with a **$2/month** recurring price.
2. Copy `.env.example` to `desktop/.env` and set:
   - `STRIPE_SECRET_KEY` — your Stripe secret key
   - `STRIPE_PRICE_ID` — the monthly price ID (e.g. `price_...`)
   - `STRIPE_WEBHOOK_SECRET` — from Stripe CLI or dashboard webhook
   - `APP_URL` — `http://localhost:5173` for local dev
3. Forward webhooks locally:
   ```bash
   stripe listen --forward-to localhost:3847/api/billing/webhook
   ```

After the 7-day trial, users are blocked from visualizing until they subscribe. Use **Billing → Dev: activate locally** without Stripe in development.

### Language runtimes

Install locally as needed: `python3`, JDK, `gcc`/`g++`, `csc` (.NET), `go`

## Roadmap

- [ ] Linked list / tree canvas renderers
- [ ] Cloud-hosted deployment
- [ ] Electron production builds (`npm run electron:build`)
