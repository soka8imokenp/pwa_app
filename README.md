# 🍵 Daily Sumire (デイリー・スミレ)
> **Neo-Brutalist Offline-First Productivity & Mindful Health Assistant**

Daily Sumire is a full-featured personal OS and mindful companion combining high-leverage daily planning (Ivy Lee top-3 priority rule, habits, focus stopwatch/pomodoro, link hub) with comprehensive body & nutrition tracking, powered by Google Gemini AI and wrapped in an artisan Japanese Matcha neo-brutalist aesthetic.

Built as an **offline-first Progressive Web App (PWA)** and cross-platform native Android application via **Capacitor**.

---

## ✨ Core Features

### 📋 Pragmatic Planner
- **Rule of 3 Priorities**: Focus on what truly moves the needle each day.
- **Backlog & Subtasks**: Break down projects and promote/demote tasks seamlessly.
- **Smart Habits Tracker**: Visual streak heatmap, target frequency days, and Duolingo-style celebratory streak greetings.
- **Deep Work & Pomodoro**: Interactive focus timer with ambient soundscape and task attribution.
- **Quick Links Hub**: Customizable bookmark dashboard with category tagging and click telemetry.
- **Evening Review (Debrief)**: Automated evening reflection with task rollover and mindful celebration.
- **Smart AI Braindump**: Natural language parsing to convert messy thoughts into scheduled tasks.

### 🥗 Health & Wellness Center
- **Smart Nutrition Vision**: AI-powered instant calorie & macronutrient estimation from natural meal descriptions or photo analysis (powered by Google Gemini).
- **Intake & Hydration**: Calorie budget, macro targets (protein, carbs, fat), water logging with quick increments.
- **Body & Anthropometry**: Weight tracking, BMI calculation, waist circumference, and body fat tracking.
- **Workout & Activity**: Cardio, strength, and HIIT activity logging with active calorie burn computation.
- **Sumire AI Coach**: Personalized nutrition and wellness guidance with contextual memory.

### 🛡️ Production Security & Architecture
- **Dual-Token Authentication**: 15-minute access tokens with 30-day cryptographically hashed refresh tokens and proactive silent refresh.
- **Brute-Force Protection**: Sliding-window IP and account rate limiters on all authentication endpoints.
- **Strict CORS & Security Headers**: HSTS, nosniff, frameguard, and XSS filtering.
- **Offline-First Storage**: Client-side Dexie.js (IndexedDB) with bidirectional synchronization to cloud SQLite/PostgreSQL.
- **Last-Write-Wins (LWW) Sync**: Timestamp-based conflict resolution and soft-deletion propagation.
- **App Lock**: Local biometric and PIN security protection.

---

## 🏗️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS 4, Lucide React, Lottie Web |
| **Storage & Offline** | Dexie.js (IndexedDB), LocalStorage |
| **Mobile Runtime** | Capacitor 8 (Android Native Container) |
| **Backend** | Express 4, TypeScript, Prisma ORM, SQLite / PostgreSQL |
| **Auth & Security** | JWT (Dual-Token), bcryptjs, Zod, Sliding-Window Rate Limiter |
| **AI Integration** | Google Gemini 2.5 Flash API |
| **DevOps** | Docker, Docker Compose, GitHub Actions CI/CD |

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 20.x
- npm >= 10.x

### 1. Installation

```bash
# Clone repository
git clone https://github.com/your-username/daily-sumire.git
cd daily-sumire

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 2. Environment Setup

Copy example environment files:
```bash
# Root frontend environment
cp .env.example .env

# Server backend environment
cp server/.env.example server/.env
```

Edit `server/.env` to configure secure secrets:
```env
JWT_SECRET="generate_a_secure_jwt_secret_min_32_chars"
JWT_REFRESH_SECRET="generate_a_secure_refresh_secret_min_32_chars"
DATABASE_URL="file:./dev.db"
```

### 3. Database Initialization

```bash
cd server
npx prisma db push
npx prisma generate
cd ..
```

### 4. Running Locally

You can run both client and server simultaneously:

```bash
# Terminal 1: Backend Sync Server (Port 3001)
npm run server

# Terminal 2: Frontend Vite Dev Server (Port 5173)
npm run dev
```

Visit `http://localhost:5173` to explore Daily Sumire!

---

## 📱 Android Build (Capacitor)

Daily Sumire can be built into a production Android APK:

```bash
# 1. Build web application
npm run build

# 2. Sync web assets with native Android project
npx cap sync android

# 3. Open in Android Studio or compile with Gradle
cd android
./gradlew assembleRelease
```

---

## 🐳 Docker Deployment

To run the production backend with Docker:

```bash
docker compose up -d --build
```

The containerized service runs behind healthchecks with persistent SQLite storage mounted at `/app/server/prisma`.

---

## 📖 API Documentation

The complete OpenAPI 3.0 specification is available at [`server/docs/openapi.json`](file:///home/soka/1/pwa_app/server/docs/openapi.json).

Key routes:
- `POST /api/auth/register` — Create user account (Rate limited)
- `POST /api/auth/login` — Authenticate and receive access + refresh tokens (Rate limited)
- `POST /api/auth/refresh` — Silent refresh token rotation
- `POST /api/auth/logout` — Revoke refresh token and invalidate session
- `GET /api/auth/me` — Retrieve profile of authenticated user
- `POST /api/sync/push` — Push offline mutations with Zod validation
- `GET /api/sync/pull` — Pull cloud updates since last client timestamp
- `GET /api/health` — Service health check

---

## 📜 License
MIT License. Crafted with 🍵 and care for mindful productivity.
