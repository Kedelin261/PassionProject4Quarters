# 4 Quarters

**Execute. Every. Day.**

A full-stack execution system that combines The 12 Week Year, Scrum-style goal breakdowns, ClickUp-style task hierarchy, Excel-style habit tracking, Google Calendar-style time blocking, and AI life coaching.

---

## Problem Statement

Most people have goals but no execution system. They plan without structure, track without accountability, and reflect without action. 4 Quarters solves this by giving you a real system: a 12-week cycle, nested goal hierarchy, daily scoring, habit tracking, and an AI coach that holds you accountable with real data.

## Target User

High-performers, entrepreneurs, athletes, and anyone serious about executing their vision — not just setting goals.

---

## Features

- **Dashboard** — Daily score, weekly score, active goals, today's time blocks, quick actions
- **Vision** — Define your 12-week vision, emotional connection, cost of failure, reward of execution
- **Goals** — ClickUp-style nested hierarchy: 12-Week → Monthly → Weekly → Daily
- **Habit Tracker** — Excel-style grid. Track positive/negative habits with automatic success scoring
- **Time Blocking** — Google Calendar-style day/week view with 24-hour block creation
- **Accountability** — Invite partners, create challenges, view leaderboards
- **Standups** — Daily standup, end-of-day reflection, weekly/quarterly check-ins
- **AI Coach** — Real Claude API integration with rule-based fallback. Uses your actual goal/habit data.
- **Reports** — Daily, weekly, and quarterly execution reports
- **Settings** — Profile management

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS |
| Routing | React Router v6 |
| Data Fetching | Axios + TanStack Query |
| Backend | Hono (Node.js) |
| Database | SQLite (better-sqlite3) |
| Auth | JWT + bcryptjs |
| AI | Claude claude-haiku-4-5-20251001 API + rule-based fallback |
| Deployment | Cloudflare Pages (frontend) + VPS/Railway (backend) |

---

## Database Schema Summary

- **users** — Auth credentials, profile
- **visions** — Vision statement + emotional framework
- **twelve_week_cycles** — 12-week execution periods
- **twelve_week_goals** — Max 3 per active cycle
- **monthly_goals** — Tied to 12-week goals
- **weekly_goals** — Tied to monthly goals
- **daily_goals** — Tied to weekly goals
- **habits** — Positive/negative habits with goal_behavior
- **habit_entries** — Daily habit tracking with auto-scored success
- **time_blocks** — 24-hour time blocks with category + color
- **daily_scores** — Computed daily execution scores
- **weekly_scores** — Computed weekly execution scores
- **accountability_partners** — Partner invites and connections
- **challenges** — Group accountability challenges
- **challenge_members** — Challenge participation
- **standups** — Daily, EOD, weekly, quarterly entries
- **ai_conversations** — Chat sessions
- **ai_messages** — Individual messages

---

## API Routes

### Auth
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
PUT  /api/auth/me
```

### Vision
```
GET  /api/vision
POST /api/vision
PUT  /api/vision/:id
```

### Cycles
```
GET  /api/cycles
POST /api/cycles
PUT  /api/cycles/:id
```

### Goals
```
GET    /api/goals/tree
POST   /api/goals/quarter
PUT    /api/goals/quarter/:id
DELETE /api/goals/quarter/:id
POST   /api/goals/monthly
PUT    /api/goals/monthly/:id
DELETE /api/goals/monthly/:id
POST   /api/goals/weekly
PUT    /api/goals/weekly/:id
DELETE /api/goals/weekly/:id
POST   /api/goals/daily
PUT    /api/goals/daily/:id
DELETE /api/goals/daily/:id
```

### Habits
```
GET    /api/habits
POST   /api/habits
PUT    /api/habits/:id
DELETE /api/habits/:id
GET    /api/habits/entries
POST   /api/habits/entries
PUT    /api/habits/entries/:id
```

### Time Blocks
```
GET    /api/time-blocks
POST   /api/time-blocks
PUT    /api/time-blocks/:id
DELETE /api/time-blocks/:id
```

### Scores
```
GET  /api/scores/daily
GET  /api/scores/weekly
POST /api/scores/recalculate
```

### Accountability
```
GET  /api/accountability/partners
POST /api/accountability/invite
POST /api/accountability/accept/:id
POST /api/accountability/decline/:id
DELETE /api/accountability/:id
GET  /api/accountability/challenges
POST /api/accountability/challenges
POST /api/accountability/challenges/:id/invite
GET  /api/accountability/challenges/:id/leaderboard
```

### Standups
```
GET  /api/standups
POST /api/standups
GET  /api/standups/:id
PUT  /api/standups/:id
```

### AI Coach
```
GET  /api/ai/conversations
POST /api/ai/conversations
GET  /api/ai/conversations/:id/messages
POST /api/ai/chat
POST /api/ai/generate-reflection
POST /api/ai/generate-checkin
```

### Reports
```
GET /api/reports/daily
GET /api/reports/weekly
GET /api/reports/quarterly
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- npm

### Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your JWT_SECRET and optionally ANTHROPIC_API_KEY
npm install --cache /tmp/npm-cache
npm run dev
# Runs on http://localhost:3001
```

### Frontend
```bash
cd frontend
cp .env.example .env.local
# Edit .env.local: VITE_API_URL=http://localhost:3001
npm install --cache /tmp/npm-cache
npm run dev
# Runs on http://localhost:5173
```

---

## Environment Variables

### Backend (.env)
| Variable | Required | Description |
|----------|----------|-------------|
| PORT | No | API port (default: 3001) |
| JWT_SECRET | Yes | Secret for JWT signing |
| ANTHROPIC_API_KEY | No | Claude API key (AI Coach falls back to rules without it) |

### Frontend (.env.local)
| Variable | Required | Description |
|----------|----------|-------------|
| VITE_API_URL | Yes | Backend API URL |

---

## Deployment Steps

### Frontend → Cloudflare Pages
1. Push repo to GitHub
2. Connect GitHub repo in Cloudflare Pages
3. Build command: `cd frontend && npm install --cache /tmp/npm-cache && npm run build`
4. Output directory: `frontend/dist`
5. Add env var: `VITE_API_URL=https://your-backend.railway.app`

### Backend → Railway / Render
1. Connect GitHub repo
2. Root directory: `backend`
3. Start command: `npm start`
4. Add env vars: `JWT_SECRET`, `ANTHROPIC_API_KEY`, `PORT`

---

## Scoring System

### Daily Score
```
dailyGoalScore = completedDailyGoals / totalDailyGoals × 100
habitScore = successfulHabitEntries / totalHabitEntries × 100
dailyScore = dailyGoalScore × 0.60 + habitScore × 0.40
```

### Weekly Score
```
weeklyGoalScore = completedWeeklyGoals / totalWeeklyGoals × 100
dailyGoalScore = completedDailyGoalsForWeek / totalDailyGoalsForWeek × 100
habitScore = successfulHabitEntriesForWeek / totalHabitEntriesForWeek × 100
weeklyScore = weeklyGoalScore × 0.40 + dailyGoalScore × 0.30 + habitScore × 0.30
```

### Letter Grades
| Grade | Score |
|-------|-------|
| A | 90–100 |
| B | 80–89 |
| C | 70–79 |
| D | 60–69 |
| F | Below 60 |

---

## Testing Checklist

- [x] Auth: register, login, logout, /me
- [x] Vision CRUD
- [x] Goal hierarchy CRUD (quarter → monthly → weekly → daily)
- [x] Max 3 goals validation (returns 400 on 4th)
- [x] Habit creation and tracking
- [x] Habit scoring: execute=true + goalBehavior=execute → success
- [x] Habit scoring: execute=false + goalBehavior=avoid → success
- [x] Daily score calculation
- [x] Weekly score calculation
- [x] Time block CRUD with validation
- [x] Accountability invite/accept/decline
- [x] Challenge leaderboard
- [x] Standup creation
- [x] AI Coach fallback (returns coaching response without API key)
- [ ] Production deployment smoke test

---

## Known Limitations

- SQLite database — requires persistent disk storage on deployment (Railway/Render with volume works; Cloudflare Workers requires D1 migration)
- No email verification on registration
- No password reset flow
- AI Coach requires Anthropic API key for full intelligence (fallback rules provided)
- No real-time updates (polling required for multi-device sync)

## Future Improvements

- PostgreSQL/Neon migration for production scale
- Email notifications for standup reminders
- Push notifications
- Mobile app (React Native)
- OAuth (Google, Apple login)
- Team/org workspaces
- Data export (CSV/PDF reports)
- Calendar integrations (Google Calendar, Outlook)
