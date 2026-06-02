<div align="center">

# 💰 BudgetF — Personal & Group Expense Tracking

**A full-stack mobile application to take control of your finances — personally and together.**

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Expo](https://img.shields.io/badge/Expo-55-000020?style=flat-square&logo=expo&logoColor=white)](https://docs.expo.dev/)
[![Express](https://img.shields.io/badge/Express-5-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-realtime-010101?style=flat-square&logo=socket.io&logoColor=white)](https://socket.io/)
[![Gemini AI](https://img.shields.io/badge/Gemini-AI%20Chatbot-4285F4?style=flat-square&logo=google&logoColor=white)](https://aistudio.google.com/)

</div>

---

## 📖 Overview

**BudgetF** is a full-stack personal and group expense management solution. It combines a **Node.js / Express** REST API backed by **PostgreSQL** with an **Expo (React Native)** mobile app — giving you everything you need to track wallets, transactions, monthly budgets, and shared group finances, all with the power of an AI assistant at your fingertips.

---

## ✨ Main Features

### 🏦 Personal Finance Management
- User **registration, login, forgot password**, and password reset
- Manage personal **wallets** (standard, savings, and more)
- Manage **income and expense categories** with icons and colors
- **Add, update, delete, and restore** transactions (soft-delete with trash)
- Automatically **update wallet balance** after each transaction
- Set and track **monthly budget limits**
- Receive **in-app and email budget alerts** when spending exceeds thresholds
- View **income, expense, and balance reports** on a home dashboard
- **Export report data to Excel**
- Update **user profile and personal settings**
- **Dark mode** support

### 🔔 Reminders & Notifications
- Create **financial reminders** (scheduled or one-off)
- Receive **in-app notifications** for budget events and group activity
- Receive **email alerts** via SMTP (forgot password, group reminders)
- **Budget warnings** when expenses reach configured thresholds
- Reminder logs to **avoid duplicate notifications**

### 🤖 AI Chatbot (BudgetF Assistant)
> Powered by **Google Gemini** with function calling over your real financial data

Ask questions in natural language:
- "How much did I spend this month?"
- "What's my current budget status?"
- "Which wallet has the most activity?"
- "What are my top spending categories?"
- "What were my biggest transactions last month?"

Resume **past chat sessions** and get instant answers without manual filtering.

### 👥 Group Finance Management
- **Create and manage finance groups** (dashboard, archive, delete)
- **Invite members by email**; accept or decline invitations
- **Update member nicknames** and manage roles
- **Transfer ownership** or leave a group
- Create and manage **group wallets** and **group categories**
- Add and track **group transactions** with automatic balance updates
- Set **monthly group budgets** with alerts
- Create **contribution plans** — split costs among members, record payments, reverse contributions, and view progress
- **Real-time group chat** using WebSocket (Socket.IO)
- View **group notifications** and reminder history

---

## 🗂️ Project Structure

```
BudgetF/
├── Backend/                  # REST API + Socket.IO server
├── Frontend/expense-mobile/  # Expo (React Native) mobile app
├── DA_Mobile.sql             # PostgreSQL schema & seed reference
└── README.md
```

---

## 🛠️ Tech Stack

| Layer      | Technologies                                                                 |
|------------|------------------------------------------------------------------------------|
| **API**    | Express 5, `pg`, JWT, bcrypt, multer, nodemailer, Socket.IO                 |
| **AI**     | `@google/genai` (Gemini 2.5 Flash) with function calling                    |
| **Database** | PostgreSQL 14+ (`pgcrypto`, `citext`, `pg_trgm`)                          |
| **Mobile** | Expo 55, React Native, React Navigation, Axios, Socket.IO client            |

---

## ⚙️ Prerequisites

| Tool | Version / Notes |
|------|-----------------|
| [Node.js](https://nodejs.org/) | 18+ recommended |
| [PostgreSQL](https://www.postgresql.org/) | 14+ (uses extensions: `pgcrypto`, `citext`, `pg_trgm`) |
| [Expo CLI](https://docs.expo.dev/) | Via `npx expo` in the mobile app folder |
| Google Gemini API Key | Optional — required for AI chatbot at `/api/chatbot` |
| SMTP credentials | Optional — required for password reset and group reminder emails |

---

## 🚀 Installation & Setup

### 1. Database

```bash
# Create the database
createdb expense_db

# Apply schema and seed data
psql -U postgres -d expense_db -f DA_Mobile.sql

# On Windows (PowerShell)
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

# AI Chatbot — required for /api/chatbot
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash

# Group reminder scheduler interval (ms)
GROUP_REMINDER_INTERVAL_MS=60000
```

```bash
npm run dev   # Development (auto-reload)
npm start     # Production
```

Verify the server is running:

- **API root:** `http://localhost:4000`
- **Health check:** `GET http://localhost:4000/health` → `{ "status": "ok", "db": 1 }`

### 3. Mobile App (Expo)

```bash
cd Frontend/expense-mobile
npm install
```

Create `Frontend/expense-mobile/.env`:

```env
# Use your machine's LAN IP when testing on a physical device
EXPO_PUBLIC_API_BASE_URL=http://localhost:4000
```

> **Physical device:** Your phone and PC must be on the same Wi-Fi network. Replace `localhost` with your machine's local IP address (e.g. `http://192.168.1.11:4000`).

```bash
npm start          # Start Expo dev server
npm run android    # Android emulator
npm run ios        # iOS simulator
npm run web        # Web browser
```

Scan the QR code with **Expo Go** to run the app on your device.

### ⚡ Quick Start (Both Services)

```bash
# Terminal 1 — Backend
cd Backend && npm install && npm run dev

# Terminal 2 — Mobile
cd Frontend/expense-mobile && npm install && npm start
```

---

## 🌐 API Reference

| Prefix | Purpose |
|--------|---------|
| `/api/auth` | Register, login, profile, password reset |
| `/api/settings` | Theme, locale, timezone, avatar upload |
| `/api/wallets` | Personal wallets and statistics |
| `/api/categories` | Personal income/expense categories |
| `/api/transactions` | Transactions, transfers, recurring rules, trash |
| `/api/budgets` | Monthly budgets and overspend alerts |
| `/api/chatbot` | AI assistant (Gemini) with chat session history |
| `/api/groups` | Groups, members, invitations, finance, chat, contributions, reminders |
| `/api/notifications` | In-app notifications and unread state |

Real-time **group chat** runs over **Socket.IO** on the same host and port as the HTTP server.

---

## 🐛 Troubleshooting

| Issue | What to Check |
|-------|---------------|
| `/health` returns a DB error | PostgreSQL is running, `.env` credentials are correct, schema has been applied |
| Mobile app cannot reach the API | Use your machine's LAN IP in `EXPO_PUBLIC_API_BASE_URL`, not `localhost` |
| Chatbot returns errors | Ensure `GEMINI_API_KEY` is set in `Backend/.env` |
| Password reset emails not sent | Check SMTP variables in `Backend/.env` |
| CORS errors in browser | Ensure `CLIENT_URL` in backend `.env` matches your Expo/web origin |

---

## 📄 License

ISC — see `Backend/package.json`. Adjust as needed for your course or product.
