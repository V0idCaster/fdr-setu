<div align="center">

# 🏛️ FDR SETU

### Security Deposit & FDR Management Portal

A prototype portal that tracks every security deposit and Fixed Deposit Receipt (FDR) from submission to release: one instrument, one evidence trail, every deadline visible.

**Built for Smart India Hackathon (SIH) 2026 · Problem Statement SIH26265**

[**🌐 Live Demo**](https://fdr-setu-nu.vercel.app) · [**🐛 Report a Bug**](https://github.com/V0idCaster/fdr-setu/issues) · [**💡 Request a Feature**](https://github.com/V0idCaster/fdr-setu/issues)

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?logo=vercel&logoColor=white)

</div>

---

> ⚠️ **Prototype notice:** All data is synthetic and the simulated date is **01 Aug 2026**. FDR SETU supports administrative tracking only. It does not replace regulations, competent-authority decisions or bank verification. Uploading or validating a document does not prove a bank-issued FDR is genuine.

---

## 📖 About

Regulatory bodies such as AICTE may require institutions to submit or maintain security deposits or FDRs. When these are managed through scattered paper files, manual correspondence and separate trackers, it is hard to see which deposits are valid, which are about to mature, and who has to act next.

**FDR SETU** ("setu" means bridge) brings the whole lifecycle into one place: institutions submit FDRs, scrutiny officials review them, maturity dates are monitored with reminders and escalation, renewals are linked to the original instrument, and release or refund requests move through an authority decision, all with a visible audit trail.

### The core idea: three independent evidence states

Every FDR tracks these separately, and one never implies another.

| State | Meaning |
|---|---|
| 📤 **Submitted** | The institution lodged the details and a receipt |
| 🔍 **Reviewed** | A scrutiny official checked the submission |
| 🏦 **Bank-confirmed** | The bank's own confirmation has been recorded |

A submitted or reviewed receipt is never treated as bank-confirmed.

---

## ✨ Features

| | Feature | What it does |
|---|---|---|
| 🗂️ | **FDR Register** | One central list of every instrument, with search, filters, sorting and CSV export. |
| 📝 | **FDR Submission** | A form with live validation and a completeness checklist (number, bank, branch, amount, dates, beneficiary, receipt). |
| 📎 | **Document Upload Checks** | File type, size and contents are checked before a receipt is accepted. |
| 🔍 | **Scrutiny Review** | Officials accept a submission, request a correction, or flag discrepancies such as date mismatches. |
| ⏰ | **Maturity Monitoring** | Reminder windows (default 60 / 30 / 7 days) and automatic escalation for instruments close to maturity. |
| 🔄 | **Renewal Tracking** | A renewed FDR is linked to the old one, keeping a complete history. |
| 💸 | **Release / Refund Workflow** | Requests move from the institution through scrutiny to an authority decision. |
| 📊 | **Dashboard** | Counts and lists for active, expiring, matured, renewed, released and pending instruments. |
| 🔔 | **Alerts Centre** | Upcoming, overdue and escalated cases in one place. |
| 📥 | **Work Queue** | A role-specific list of cases that are waiting on you. |
| 📑 | **Reports** | Consolidated reports for pending verifications, upcoming maturities and cases needing action. |
| 🧾 | **Audit Log** | A record of submissions, reviews, decisions and changes. |
| ⚙️ | **Policy & Security** | Reminder and deadline settings, plus an honest view of what is working, simulated or planned. |

---

## 👥 Roles and Demo Accounts

The sign-in screen offers four synthetic accounts. There are no passwords.

| Account | Role | Can do |
|---|---|---|
| **R. Mehta** · Aarohan Tech | Institution | Submit, correct, renew and request release (own institution only) |
| **S. Iyer** · Pragati Institute | Institution | Same, for a second institution |
| **A. Khanna** | Scrutiny Official | Review submissions, raise discrepancies, record bank confirmation |
| **Dr. P. Rao** | Approving Authority | Decide release or refund, view reports across all institutions |

### 🧪 Suggested demo path (the six test scenarios)

1. **New FDR submission:** sign in as an institution and submit an FDR.
2. **Validity tracking:** open the register and dashboard to see status and days to maturity.
3. **Approaching maturity:** check the reminders and the maturity horizon.
4. **Discrepancy identification:** sign in as the scrutiny official and review a flagged case (for example, the Pragati date mismatch).
5. **Renewal:** renew an expiring FDR as an institution.
6. **Authorised release:** request release as an institution, then decide it as the approving authority.

---

## ✅ Working, Simulated or Planned

| Area | Status | Notes |
|---|---|---|
| File upload checks (type, size, contents) | 🟢 Working | Checked in the browser |
| No secrets in the browser | 🟢 Working | No keys or tokens in the code |
| Minimal personal data | 🟢 Working | Display name, designation, role and institution only |
| Role-based access | 🟡 Simulated | Scoping is applied in the UI, not enforced by a server |
| Private documents and signed links | 🟡 Simulated | The flow is imitated in the browser |
| Append-only audit | 🟡 Simulated | No edit path in the UI; not enforced by a database |
| Server re-check of uploads | ⚪ Planned | |
| Personal sign-in | ⚪ Planned | |
| AICTE portal integration | ⚪ Planned | Needs formal authorization |
| Bank confirmation API | ⚪ Planned | Needs formal authorization. In the prototype, a scrutiny official records confirmation manually |
| Email / SMS reminders | ⚪ Planned | Needs formal authorization. The prototype shows in-app alerts only |

### 🔑 Authentication

This prototype uses four synthetic demo accounts chosen on the sign-in screen. There are no real passwords or user data. A production deployment would use **Supabase Auth** with server-side roles and **Row Level Security**.

### 💾 Data storage

Prototype state is kept in your browser (localStorage). Every visitor starts from the same seed data, and changes never affect anyone else. Use **Reset demo data** on the Policy & security page to restore the original records.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite 8
- **Styling:** Tailwind CSS v4
- **Icons:** Lucide React
- **Data (prototype):** synthetic seed data with browser storage
- **Hosting:** Vercel
- **Package manager:** pnpm

---

## 📁 Project Structure

```
public/              # Favicon and robots.txt
src/
├── components/      # Shared UI components
├── data/            # Seed data, types, store and selectors
├── lib/             # Date, format, validation, document and scroll helpers
├── pages/           # Landing, Login, Dashboard, Register, SubmitFdr,
│                    # FdrDetail, Queue, Alerts, AuditLog, Reports, Settings
├── router.tsx       # Routes
├── main.tsx         # App entry point
└── index.css        # Tailwind + global styles
index.html
vite.config.ts
vercel.json          # Rewrites all routes to index.html
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 20 or higher
- [pnpm](https://pnpm.io) (`npm install -g pnpm`)

No database, account or environment variables are needed.

### 1. Clone the repository

```bash
git clone https://github.com/V0idCaster/fdr-setu.git
cd fdr-setu
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Run the app

```bash
pnpm dev
```

Open **http://localhost:8443** and choose a demo account.

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start the development server on port 8443 |
| `pnpm build` | Create a production build in `dist/` |
| `pnpm preview` | Preview the production build locally |
| `pnpm exec tsc --noEmit` | Type-check the project |

---

## ☁️ Deployment

The site is deployed on **Vercel** and redeploys automatically on every push to `main`.

1. Push the repository to GitHub.
2. Import it into Vercel (framework preset: **Vite**, build command `pnpm build`, output directory `dist`).
3. Deploy. No environment variables are needed.

`vercel.json` rewrites every route to `index.html`, so `/app/...` URLs keep working on refresh. If you host under a sub-path, set `BASE_PATH` at build time.

---

## 🔒 Security Notes

- No secrets, keys or tokens are in the code, and `.env` files are git-ignored.
- Upload checks run in the browser only. A production build would repeat them on the server.
- Role scoping, private document links and the append-only audit are **simulated** in this prototype and are labelled that way in the app.
- Only minimal personal data is stored: display name, designation, role and institution.

---

## 🗺️ Roadmap

- [ ] Real authentication with server-side roles and Row Level Security
- [ ] Private document storage with signed links and server-side upload validation
- [ ] Database-enforced append-only audit trail
- [ ] Server-side pagination for large registers
- [ ] Bank confirmation and AICTE system integration (with formal authorization)
- [ ] Email / SMS reminder delivery
- [ ] Hindi and other regional language support

---

## 📸 Screenshots

| Landing | Dashboard |
|---|---|
| ![Landing page](docs/landing.png) | ![Dashboard](docs/dashboard.png) |

| FDR Register | Submit FDR |
|---|---|
| ![FDR register](docs/register.png) | ![Submit FDR](docs/submit.png) |

---

## 🤝 Contributing

Issues and suggestions are welcome. Feel free to open an issue or submit a pull request.

---

## 👤 Author

**Sachin Kumar** · Team Odyssey
GitHub: [@V0idCaster](https://github.com/V0idCaster)

---

## 📄 Disclaimer

This is a hackathon prototype built with synthetic data. It is not an official AICTE system and must not be used for real financial instruments or decisions.

---

<div align="center">

Built by Team Odyssey for Smart India Hackathon 2026 · SIH26265

</div>
