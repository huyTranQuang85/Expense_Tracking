# BudgetF — Expense Tracking

Full-stack personal and group expense management: a **Node.js / Express** API with **PostgreSQL**, and an **Expo (React Native)** mobile app. Track wallets, transactions, monthly budgets, shared group finances, and ask an AI assistant about your spending.

## Project structure

```
Expense_Tracking/
├── Backend/                 # REST API + Socket.IO
├── Frontend/expense-mobile/ # Expo mobile app
├── DA_Mobile.sql            # PostgreSQL schema & seed reference
└── README.md
```

## Prerequisites

| Tool | Version / notes |
|------|-----------------|
| [Node.js](https://nodejs.org/) | 18+ recommended |
| [PostgreSQL](https://www.postgresql.org/) | 14+ (uses extensions: `pgcrypto`, `citext`, `pg_trgm`) |
| [Expo CLI](https://docs.expo.dev/) | Via `npx expo` in the mobile app folder |
| Optional | [Google Gemini API key](https://aistudio.google.com/) for the chatbot |
| Optional | SMTP credentials for forgot-password and group reminder emails |

---

## Installation & run

### 1. Database setup

1. Create a PostgreSQL database (default name in code: `expense_db`):

```bash
createdb expense_db
```

2. Apply the schema:

```bash
psql -U postgres -d expense_db -f DA_Mobile.sql
```

On Windows (PowerShell), from the repo root:

```powershell
psql -U postgres -d expense_db -f .\DA_Mobile.sql
```

### 2. Backend API

```bash
cd Backend
npm install
```

Create `Backend/.env`:

```env
# Server
PORT=4000
CLIENT_URL=http://localhost:8081
NODE_ENV=development

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=expense_db

# Auth
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=7d

# Email (forgot password, reminders) — optional
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=your@gmail.com

# AI chatbot — optional but required for /api/chatbot
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash

# Group reminder scheduler interval (ms) — optional
GROUP_REMINDER_INTERVAL_MS=60000
```

Start the server:

```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

Verify:

- API: `http://localhost:4000`
- Health: `GET http://localhost:4000/health` → `{ "status": "ok", "db": 1 }`
- Uploaded avatars: `http://localhost:4000/uploads/avatars/...`

### 3. Mobile app (Expo)

```bash
cd Frontend/expense-mobile
npm install
```

Create `Frontend/expense-mobile/.env`:

```env
# Backend URL
# - Web / emulator: http://localhost:4000
# - Physical device: use your PC's LAN IP, e.g. http://192.168.1.11:4000
EXPO_PUBLIC_API_BASE_URL=http://localhost:4000
```

> **Physical device:** Phone and PC must be on the same Wi‑Fi. Use your machine's local IP instead of `localhost`, and set `CLIENT_URL` in the backend `.env` to the Expo dev URL if you need CORS for web.

Run the app:

```bash
npm start
# or
npm run android
npm run ios
npm run web
```

Scan the QR code with **Expo Go**, or open the platform you target.

### Quick start (both services)

Terminal 1 — backend:

```bash
cd Backend && npm install && npm run dev
```

Terminal 2 — mobile:

```bash
cd Frontend/expense-mobile && npm install && npm start
```

---

## API overview

| Prefix | Purpose |
|--------|---------|
| `/api/auth` | Register, login, profile, password reset |
| `/api/settings` | Theme, locale, timezone, avatar upload |
| `/api/wallets` | Personal wallets |
| `/api/categories` | Personal categories |
| `/api/transactions` | Transactions, transfers, recurring rules, trash |
| `/api/budgets` | Monthly budgets and alerts |
| `/api/chatbot` | AI assistant (Gemini) |
| `/api/groups` | Groups, members, invitations, finance, chat, contributions, reminders |
| `/api/notifications` | In-app notifications |

Real-time **group chat** uses **Socket.IO** on the same host/port as the HTTP server.

---

## Features

### Authentication & account

- **Register** and **login** with JWT
- **Forgot password** / **reset password** (email via SMTP when configured)
- View and **update profile** (name, email, phone, bio)
- **Change password** while logged in
- Secure token storage on mobile (`expo-secure-store`)

### Personal finance

- **Wallets** — create, edit, delete; types include standard, savings, and other; wallet statistics
- **Categories** — income/expense categories with icons and colors
- **Transactions**
  - Record income and expenses
  - **Filter** by date, wallet, category, and type
  - **Transfer** money between wallets
  - **Soft delete** with **trash**, **restore**, and **permanent delete**
- **Monthly budget**
  - Set limit for the current month (auto-carry support)
  - Budget history and **overspend alerts**
- **Dashboard (Home)**
  - Month overview: income, expense, balance
  - Budget progress and recent transactions
  - Quick actions to add transactions or open settings

### AI assistant (BudgetF Chatbot)

Powered by **Google Gemini** with function calling over your real data:

- Monthly income vs expense
- Top spending wallets and largest transactions
- Budget status for the month
- Spending by category (ranges or specific months)
- Total balance and balance by wallet name
- **Chat sessions** — list and resume past conversations

Requires `GEMINI_API_KEY` on the backend.

### Settings & preferences

- **Dark mode** and **locale** (`vi-VN`, `en-US`)
- **Timezone** (default `Asia/Ho_Chi_Minh`)
- **Avatar upload** (stored under `Backend/uploads/avatars/`)
- Links to profile, password, monthly budget, and wallet management

### Groups (shared / family finance)

- **Create and manage groups** — dashboard, archive, delete (owner)
- **Members** — invite by email, accept/decline invitations, nicknames, remove members, **transfer ownership**, leave group
- **Group wallets** — shared wallets per group (owner manages)
- **Group categories** — shared expense/income categories
- **Group transactions** — members can add and edit shared transactions
- **Group budgets** — per-month limits with usage tracking and alerts
- **Contribution plans** — split costs among members, record payments, reverse contributions, progress views
- **Group chat** — REST messages + **Socket.IO** for live updates
- **Group reminders** — scheduled or one-off reminders (email / in-app channels in schema); owner can send immediately
- **Notifications** — unread count, mark read, deep links to groups and invitations

### Notifications

Types include budget, system, transaction, reminder, and group events. Delivered via REST; unread state synced on the client.

---

## Tech stack

| Layer | Technologies |
|-------|----------------|
| API | Express 5, `pg`, JWT, bcrypt, multer, nodemailer, Socket.IO |
| AI | `@google/genai` (Gemini) |
| Database | PostgreSQL |
| Mobile | Expo 55, React Native, React Navigation, Axios, Socket.IO client |

---

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| `health` returns DB error | PostgreSQL running, `.env` credentials, schema applied from `DA_Mobile.sql` |
| Mobile cannot reach API | Use LAN IP in `EXPO_PUBLIC_API_BASE_URL`, not `localhost`, on a real device |
| Chatbot errors | `GEMINI_API_KEY` set in `Backend/.env` |
| Password reset emails not sent | SMTP variables in `Backend/.env` |
| CORS errors | `CLIENT_URL` in backend matches your Expo/web origin |

---

## License

ISC (backend `package.json`). Adjust as needed for your course or product.
