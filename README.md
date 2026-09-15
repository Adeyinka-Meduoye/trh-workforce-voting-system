# TRH Workforce Voting System

> **Church-Wide Recognition and Ballot Portal for TRH Ministries Global Workforce**  
> Celebrating Kingdom Excellence across ministry leaders, workers, teams, and departments.

---

## 📖 Overview

The **TRH Workforce Voting System** is a mission-critical, high-integrity ballot and recognition platform engineered for **TRH Ministries Global**. It empowers members, ministry departments, and leadership to conduct auditable, secret-ballot elections and recognition exercises governed by the biblical standard of **H.E.A.R.T.I** (*Honour, Excellence, Accountability, Results, Transforming Love, and Innovation*).

The platform features real-time Firestore database synchronization, hardware back-button navigation with deep-linking, animated transitions powered by Motion, a perpetual **Winners Hall of Fame** with 3D Gold Statuette visualizers, and instant certificate generation.

---

## 🌟 Key Features

### 🗳️ 1. Dynamic Ballot & Voting Portal
- **Secret Ballot Voting**: Atomic transactions guarantee vote confidentiality and prevent double voting through strict voter verification (voter list, PIN code, or authenticated church credentials).
- **Flexible Scope Control**: Support for multiple scopes—**Church-Wide**, **Workforce-Wide**, **Organisation**, **Department**, and **Unit**.
- **Real-Time Timers & Status**: Countdown timers for active nomination/voting phases, automatic closing states, and real-time tally tracking.
- **Verification Badges & Department Filters**: Instant filtering across all ministry units and voting categories.

### 🏆 2. Perpetual Winners Hall of Fame & Archives
- **Interactive 3D Gold Statuette**: Photorealistic, interactive gold pedestal trophy for every category champion.
- **Official Citations & Tributes**: In-depth honor citations detailing leadership contributions and kingdom accomplishments.
- **High-Resolution PDF & PNG Certificates**: Download official award certificates directly in browser using `jspdf` and `html-to-image`.
- **Social Sharing**: Built-in modal for sharing honoree accomplishments across social platforms and messaging channels.
- **Archival Mode**: Switch between all-time honorees, archived past records, and active election winners.

### 📊 3. Live Public Results & Analytics
- **Live Leaderboards**: Transparent, tamper-evident result standings with percentage bars, runner-up honors, and total vote aggregates.
- **Interactive Visualizations**: Recharts-powered graphs comparing votes, turnouts, and departmental participation.
- **Audit Trails**: Verifiable vote timestamps and ballot checksum verification for absolute integrity.

### 🛡️ 4. Comprehensive Admin Governance
- **Election Lifecycle Management**: Create, configure, publish, close, or archive voting exercises.
- **Candidate & Nominee Curation**: Upload photo avatars, candidate bios, department associations, and qualification criteria.
- **Voter Roll Management**: Manage eligibility rosters, custom PIN codes, and multi-tier access permissions.
- **System Backups & Exporting**: Export ballot summaries and audit logs to PDF/CSV.

### 🎨 5. Senior Motion Design & Responsive UX
- **Staggered Viewport Reveal**: Scroll-triggered animations (`whileInView`) with cubic-bezier easing for smooth section entry.
- **Device Back-Button & History API**: Full integration with the browser's HTML5 History API—seamlessly navigate back from modals, voting screens, results, and the Hall of Fame.
- **Deep-Linking Support**: Canonical URL parameters (`/?view=hall-of-fame`, `/?view=vote&id=...`, `/?view=results&id=...`, `/?view=admin`) for direct bookmarking and link sharing.
- **Tailwind CSS Modern Dark Theme**: Navy-slate aesthetic (`#0F172A`, `#1E293B`) paired with royal gold & amber accents (`#FF8A00`, `#FFB800`).

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | [React 19](https://react.dev/) + [Vite 6](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| **Styling & UI** | [Tailwind CSS v4](https://tailwindcss.com/) + [Lucide Icons](https://lucide.dev/) |
| **Motion & Animation** | [Motion](https://motion.dev/) (formerly Framer Motion) + [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti) |
| **Data & Persistence** | [Firebase 12](https://firebase.google.com/) (Firestore & Firebase Authentication) |
| **Visualizations & Charts** | [Recharts 3](https://recharts.org/) |
| **Document Generation** | [jsPDF](https://github.com/parallax/jsPDF) + [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable) + [html-to-image](https://github.com/bubkoo/html-to-image) |
| **Deployment Target** | [Vercel](https://vercel.com/) / Google Cloud Run / Containerized SPA |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher

### Installation

1. **Clone or navigate to the repository directory**:
   ```bash
   cd trh-workforce-voting-system
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   If connecting to a custom Firebase instance or deploying externally (e.g., Vercel), provide your configuration:
   ```env
   VITE_FIREBASE_API_KEY="your-api-key"
   VITE_FIREBASE_AUTH_DOMAIN="your-app.firebaseapp.com"
   VITE_FIREBASE_PROJECT_ID="your-project-id"
   VITE_FIREBASE_STORAGE_BUCKET="your-app.appspot.com"
   VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
   VITE_FIREBASE_APP_ID="your-app-id"
   VITE_FIREBASE_DATABASE_ID="(default)"
   ```
   *(Note: The app also ships with a fallback `firebase-applet-config.json` for immediate out-of-the-box operation).*

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Type Check & Build**:
   ```bash
   npm run lint
   npm run build
   ```

---

## ☁️ Deployment to Vercel

The application is fully pre-configured for seamless deployment to **Vercel** via `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Deploying via Vercel Web Dashboard (Recommended):
1. Push your code to your GitHub / GitLab repository.
2. In the [Vercel Dashboard](https://vercel.com/new), select **"Add New Project"** and import the repository.
3. Vercel will automatically detect **Vite** as the framework and assign `npm run build` and `dist`.
4. (Optional) In **Environment Variables**, supply your `VITE_FIREBASE_*` variables if overriding the bundled config.
5. Click **Deploy**.

### Deploying via Vercel CLI:
```bash
npx vercel
```

---

## 🏛️ Core Kingdom Values (H.E.A.R.T.I)

The application incorporates TRH Ministries' foundational workforce culture pillars:
- **H — Honour** (*Romans 12:10*): Reverent regard for spiritual leadership and each team member.
- **E — Excellence** (*Colossians 3:23*): Utmost craftsmanship and preparation in sacred work.
- **A — Accountability** (*Luke 16:10*): Transparent stewardship and biblical oversight.
- **R — Results** (*John 15:16*): Tangible, lasting spiritual fruit across ministry arms.
- **T — Transforming Love** (*1 Corinthians 13:13*): Christ-centered compassion, patience, and restoration.
- **I — Innovation** (*Proverbs 3:5-6*): Modern technological agility and creative problem solving.

---

## 🔒 Security & Data Integrity

- **Firestore Rules**: Strict security rules guard voter records, ballot submissions, and administrative controls.
- **Double-Vote Invalidation**: Ballots are indexed against voter identifiers with cryptographic atomic operations to guarantee single-use voting.
- **No Client Secrets**: Sensitive infrastructure credentials remain strictly guarded.
- **Persistent Offline Fallback**: Multiple-tab Firestore persistence ensures high availability even on unstable church networks.

---

## 📄 License

Proprietary © TRH Ministries Global. All rights reserved.
