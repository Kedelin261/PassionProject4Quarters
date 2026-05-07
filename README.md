# 4 Quarters — Execute Your Vision

> *"Plans don't fail because it is a bad plan, plans fail when execution lacks."*

## Overview

4 Quarters is a production-ready, full-stack execution system combining:
- **The 12 Week Year** — 84-day focused execution cycles
- **Scrum execution** — structured standups and weekly sprints  
- **ClickUp-style hierarchy** — nested, expandable goal tree
- **Excel-style habit tracking** — weekly grid with execute/avoid logic
- **Google Calendar time blocking** — full 24-hour day planner
- **Nike Run-style accountability** — partners + leaderboard
- **AI life coaching** — empathetic, data-driven, real-context coaching

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Hono (TypeScript) on Cloudflare Workers |
| Database | Cloudflare D1 (SQLite at the edge) |
| Frontend | Vanilla JS SPA + Tailwind CSS (CDN) |
| Auth | SHA-256 hashed passwords + session tokens |
| AI | OpenAI GPT-3.5 / Cloudflare AI / Rule-based fallback |
| Deploy | Cloudflare Pages |

## Features

### ✅ Auth System
- Register / Login / Logout
- Secure password hashing (SHA-256 + salt)
- 30-day session tokens
- `/api/auth/register` → `/api/auth/login` → `/api/auth/me`

### ✅ 12-Week Cycle
- Create cycles with vision + emotional connection (WHY)
- Track cycle progress automatically
- Switch active cycle
- Full CRUD (create/edit/delete)

### ✅ Goal Hierarchy (Strictly Linked)
```
12-Week Cycle
  → 12-Week Goals (max 3)
    → Monthly Goals (Month 1/2/3)
      → Weekly Goals (Week 1-12)
        → Habits (execution layer)
```
No orphan goals. Every goal is linked to its parent.

### ✅ Habit Tracker
- Excel-style weekly grid
- Execute habits (do this) + Avoid habits (don't do this)
- Click to toggle: completed/missed
- Linked to weekly goals
- Daily score auto-calculates

### ✅ Time Blocking
- Full 24-hour Google Calendar-style day view
- Create/edit/delete time blocks
- Color coding
- Persistent by date
- Click on any hour to add quickly

### ✅ Scoring System
**Daily:**
- Goals: 60%
- Habits: 40%

**Weekly:**
- Weekly Goals: 40%
- Daily Goals: 30%
- Habits: 30%

**Grades:** A (90+) / B (80-89) / C (70-79) / D (60-69) / F (<60)

### ✅ Pyramid View
Visual execution hierarchy showing how daily habits drive long-term outcomes:
- TOP (smallest): Daily Habits
- Weekly Goals
- Monthly Goals
- 12-Week Goals
- BOTTOM (largest): 12-Week Cycle Foundation

### ✅ Accountability System
- Invite partners by email
- Accept/decline invites
- Shared leaderboard with avg and best scores
- Daily standup form (yesterday/today/blockers/reflection)

### ✅ AI Life Coach
- References REAL user data (scores, habits, cycle)
- Empathetic but firm coaching
- Contextual responses based on performance
- OpenAI GPT-3.5 → Cloudflare AI → Rule-based fallback (always works)

### ✅ Onboarding System
- Auto-launches on first login only
- 9-step guided walkthrough
- Starts with the manifesto quote
- Covers: Vision, Goals, Pyramid, Habits, Time Blocking, Scoring, Accountability, AI Coach
- Always accessible via Help button

## API Endpoints

### Auth
```
POST /api/auth/register    { email, password, name }
POST /api/auth/login       { email, password }
POST /api/auth/logout
GET  /api/auth/me
PATCH /api/auth/onboarding
```

### Cycles
```
POST   /api/cycles         { title, vision, emotional_connection, start_date, end_date }
GET    /api/cycles
GET    /api/cycles/:id
PATCH  /api/cycles/:id
DELETE /api/cycles/:id
```

### Goals
```
GET    /api/goals/tree?cycle_id=:id
POST   /api/goals/quarter  { cycle_id, title, description }
PATCH  /api/goals/quarter/:id
DELETE /api/goals/quarter/:id
POST   /api/goals/monthly  { quarter_goal_id, title, month_number }
PATCH  /api/goals/monthly/:id
DELETE /api/goals/monthly/:id
POST   /api/goals/weekly   { monthly_goal_id, title, week_number }
PATCH  /api/goals/weekly/:id  { completed: true/false }
DELETE /api/goals/weekly/:id
```

### Habits
```
POST   /api/habits         { weekly_goal_id, title, type, target_days }
GET    /api/habits
PATCH  /api/habits/:id
DELETE /api/habits/:id
POST   /api/habits/log     { habit_id, log_date, completed }
GET    /api/habits/logs?start=&end=
GET    /api/habits/grid?start=&end=
```

### Time Blocks
```
POST   /api/time-blocks    { title, date, start_time, end_time, color }
GET    /api/time-blocks?date=
PATCH  /api/time-blocks/:id
DELETE /api/time-blocks/:id
```

### Scores
```
GET /api/scores/daily?date=
GET /api/scores/weekly?week_start=&week_end=
GET /api/scores/history?days=30
```

### Accountability
```
POST   /api/accountability/invite    { email }
GET    /api/accountability/partners
PATCH  /api/accountability/:id/respond  { status: accepted/declined }
GET    /api/accountability/leaderboard
POST   /api/accountability/standup
GET    /api/accountability/standups
```

### AI Coach
```
POST /api/ai/coach  { message, context_type }
```

## Database Schema

- `users` — Authentication + onboarding status
- `cycles` — 12-week execution cycles
- `quarter_goals` — Max 3 per cycle, linked to cycle
- `monthly_goals` — Linked to quarter goals
- `weekly_goals` — Linked to monthly goals, completable
- `habits` — Linked to weekly goals, execute/avoid types
- `habit_logs` — Daily tracking with UNIQUE constraint
- `time_blocks` — Full 24h time blocking
- `accountability_partners` — Invite/accept system
- `standups` — Daily standups + reflections
- `daily_scores` — Persisted scores per day
- `sessions` — Auth session tokens

## Local Development

```bash
# Install dependencies
npm install

# Apply local DB migrations
npm run db:migrate:local

# Start development server
npm run dev:sandbox
# OR
pm2 start ecosystem.config.cjs
```

## Deployment

```bash
# Create Cloudflare D1 database
npx wrangler d1 create four-quarters-production

# Update wrangler.jsonc with the database_id

# Apply migrations to production
npm run db:migrate:prod

# Deploy to Cloudflare Pages
npm run deploy
```

## QA Audit Status

| Feature | Status |
|---------|--------|
| Register | ✅ PASS |
| Login | ✅ PASS |
| Create Cycle | ✅ PASS |
| Get Cycles | ✅ PASS |
| Quarter Goals CRUD | ✅ PASS |
| Monthly Goals CRUD | ✅ PASS |
| Weekly Goals CRUD | ✅ PASS |
| Goals Tree | ✅ PASS |
| Habits CRUD | ✅ PASS |
| Habit Logging | ✅ PASS |
| Habit Grid | ✅ PASS |
| Time Blocks CRUD | ✅ PASS |
| Daily Scores | ✅ PASS |
| Weekly Scores | ✅ PASS |
| Score History | ✅ PASS |
| Partner Invite | ✅ PASS |
| Leaderboard | ✅ PASS |
| Standup | ✅ PASS |
| AI Coach (fallback) | ✅ PASS |
| Onboarding | ✅ PASS |
| Data Persistence | ✅ PASS |

## Platform

- **Runtime**: Cloudflare Pages + Workers
- **Status**: ✅ Active
- **Last Updated**: 2025-05-07
