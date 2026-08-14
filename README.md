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
- **$10/week** Stripe subscription after trial
- Admin panel to upload questions with starter code for all languages
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

### Language runtimes

Install locally as needed: `python3`, JDK, `gcc`/`g++`, `csc` (.NET), `go`

## Roadmap

- [ ] Linked list / tree canvas renderers
- [ ] Cloud-hosted deployment
- [ ] Electron production builds (`npm run electron:build`)
