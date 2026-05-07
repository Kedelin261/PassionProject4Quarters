# 4 Quarters — Execute Your Vision

## 🚀 Production URL
**https://four-quarters.pages.dev**  
Latest deployment: **https://afcfc482.four-quarters.pages.dev**

## 📦 GitHub Repository
https://github.com/Kedelin261/PassionProject4Quarters

## 🎯 Product Overview
**4 Quarters** is a full-stack execution system combining:
- **12-Week Year** framework for goal achievement
- **Scrum-style** sprint planning
- **ClickUp-style** nested goal hierarchy
- **Excel-style** habit tracking grid
- **Google Calendar-style** 24h time blocking
- **Nike Run-style** accountability partners
- **AI Life Coach** with fallback (no API key needed)

---

## ✅ Features Implemented (16/16 Definition of Done)

| # | Feature | Status |
|---|---------|--------|
| 1 | Auth (Register / Login / Logout) | ✅ |
| 2 | 12-Week Cycle creation | ✅ |
| 3 | Linked Goals (Quarter → Monthly → Weekly) | ✅ |
| 4 | Correct pyramid hierarchy (no orphans) | ✅ |
| 5 | Habit tracking (execute/avoid, Excel grid) | ✅ |
| 6 | Scoring (Daily 60/40, Weekly 40/30/30, A–F) | ✅ |
| 7 | 24h Time blocking (create/edit/delete) | ✅ |
| 8 | Accountability partners (invite/accept/decline) | ✅ |
| 9 | AI Coach + fallback (no API key) | ✅ |
| 10 | Onboarding flow | ✅ |
| 11 | All buttons functional | ✅ |
| 12 | No console errors | ✅ |
| 13 | Data persists after refresh (D1 DB) | ✅ |
| 14 | Full QA audit completed (23/23 PASS) | ✅ |
| 15 | Deployed to Cloudflare Pages | ✅ |
| 16 | GitHub updated | ✅ |

---

## 🏗️ Architecture

```
Frontend (SPA)          Backend (Hono on CF Workers)      Storage
─────────────────       ──────────────────────────────    ──────────────────
public/index.html  ──▶  /api/auth/*                 ──▶   Cloudflare D1
public/static/          /api/cycles/*                     (SQLite, globally
  app.js                /api/goals/*                       distributed)
  app.css               /api/habits/*
                        /api/time-blocks/*
                        /api/scores/*
                        /api/accountability/*
                        /api/ai/*
```

---

## 🗄️ Data Models

### Users
```sql
id, email, password_hash, name, onboarding_completed, created_at
```

### Cycles (12-Week)
```sql
id, user_id, title, vision, emotional_connection, start_date, end_date, status
```

### Goal Hierarchy
```
quarter_goals  →  monthly_goals  →  weekly_goals  →  habits
(max 3/cycle)     (month_number)    (week_number)     (execute|avoid)
```

### Habit Logs
```sql
habit_id, user_id, log_date, completed  -- UNIQUE(habit_id, log_date)
```

### Scoring
```sql
daily_scores:   goals_score (60%), habits_score (40%), total_score, grade (A-F)
weekly_goals:   weekly_goals (40%), daily_avg (30%), habits_avg (30%), total, grade
```

### Time Blocks
```sql
id, user_id, title, date, start_time, end_time, color, goal_id, habit_id
```

### Accountability
```sql
accountability_partners: user_id, partner_id, status (pending|accepted|declined)
standups: user_id, standup_date, yesterday, today, blockers, reflection
```

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register `{email, password, name}` |
| POST | `/api/auth/login` | Login `{email, password}` |
| POST | `/api/auth/logout` | Invalidate session |
| GET | `/api/auth/me` | Get current user |
| PATCH | `/api/auth/onboarding` | Mark onboarding complete |
| POST | `/api/auth/onboarding/complete` | Mark onboarding complete (alias) |

### Cycles
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/cycles` | Create 12-week cycle |
| GET | `/api/cycles` | List user cycles |

### Goals
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/goals/tree?cycle_id=X` | Full nested hierarchy |
| POST | `/api/goals/quarter` | Create quarter goal (max 3) |
| PATCH | `/api/goals/quarter/:id` | Update quarter goal |
| DELETE | `/api/goals/quarter/:id` | Delete quarter goal |
| POST | `/api/goals/monthly` | `{quarter_goal_id, title, month_number}` |
| PATCH | `/api/goals/monthly/:id` | Update monthly goal |
| DELETE | `/api/goals/monthly/:id` | Delete monthly goal |
| POST | `/api/goals/weekly` | `{monthly_goal_id, title, week_number}` |
| PATCH | `/api/goals/weekly/:id` | Update / mark complete |
| DELETE | `/api/goals/weekly/:id` | Delete weekly goal |

### Habits
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/habits` | Create habit `{title, type, target_days}` |
| GET | `/api/habits` | List all habits |
| PATCH | `/api/habits/:id` | Update habit |
| DELETE | `/api/habits/:id` | Delete habit |
| POST | `/api/habits/log` | Log `{habit_id, log_date, completed}` |
| GET | `/api/habits/logs?start&end` | Get logs for range |
| GET | `/api/habits/grid?start&end` | Excel-style grid data |

### Time Blocks
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/time-blocks` | `{title, date, start_time, end_time, color}` |
| GET | `/api/time-blocks?date=` | Get blocks for date |
| PATCH | `/api/time-blocks/:id` | Update block |
| DELETE | `/api/time-blocks/:id` | Delete block |

### Scoring
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/scores/daily?date=` | Daily score + grade |
| GET | `/api/scores/weekly?week_start&week_end` | Weekly score |
| GET | `/api/scores/history?days=30` | Score history |

### Accountability
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/accountability/invite` | `{email}` or `{partner_email}` |
| GET | `/api/accountability/partners` | Sent + received invites |
| PATCH | `/api/accountability/:id/respond` | `{status: accepted|declined}` |
| PATCH | `/api/accountability/invite/:id/accept` | Accept alias |
| PATCH | `/api/accountability/invite/:id/decline` | Decline alias |
| GET | `/api/accountability/leaderboard` | Rankings |
| POST | `/api/accountability/standup` | `{date, yesterday, today, blockers, reflection}` |
| GET | `/api/accountability/standups` | Recent standups |

### AI Coach
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/coach` | `{message, context}` — fallback if no API key |

---

## 🐛 Bugs Fixed (Root Cause → Fix)

| # | Bug | Root Cause | Fix |
|---|-----|-----------|-----|
| 1 | `__STATIC_CONTENT_MANIFEST not defined` | `serveStatic` used in CF Pages worker | Removed; CF Pages serves static files natively |
| 2 | Monthly goal 400 error | Field `month` not accepted (expected `month_number`) | Added alias: accepts both `month` and `month_number` |
| 3 | Weekly goal 400 error | Field `week` not accepted (expected `week_number`) | Added alias: accepts both `week` and `week_number` |
| 4 | Daily score 500 error | `target_days` stored as JSON array, `.split()` called on it | Fixed parser to handle array, string, and JSON |
| 5 | Accountability invite 400 | Field `partner_email` not accepted (expected `email`) | Added alias: accepts both `email` and `partner_email` |
| 6 | Accept invite 404 | Route `/invite/:id/accept` didn't exist | Added convenience alias routes |
| 7 | Standup `date` field ignored | Only `standup_date` accepted | Added alias: accepts both `date` and `standup_date` |
| 8 | Onboarding 404 | `POST /onboarding/complete` didn't exist | Added alias endpoint |

---

## 🧪 QA Audit Results

**Score: 23/23 PASS (100%) — GO ✅**

| Category | Tests | Pass | Fail |
|----------|-------|------|------|
| Health & Auth | 3 | 3 | 0 |
| Cycles | 1 | 1 | 0 |
| Goals (all levels) | 3 | 3 | 0 |
| Edge Cases | 1 | 1 | 0 |
| Habits | 3 | 3 | 0 |
| Time Blocks | 1 | 1 | 0 |
| Scoring | 3 | 3 | 0 |
| Accountability | 3 | 3 | 0 |
| AI Coach | 1 | 1 | 0 |
| Onboarding | 1 | 1 | 0 |
| Security | 2 | 2 | 0 |
| Data Persistence | 1 | 1 | 0 |

---

## 🚀 Deployment

- **Platform:** Cloudflare Pages + Workers
- **Database:** Cloudflare D1 (SQLite, globally distributed)
- **DB ID:** `023e1338-62bb-4138-aaa0-9fc4082f56c2`
- **Tech Stack:** Hono + TypeScript + Vite + TailwindCSS (CDN)
- **Status:** ✅ Live in Production

### Deploy commands
```bash
npm run build
npx wrangler pages deploy dist --project-name four-quarters
```

---

## 👤 User Guide

1. **Register** at the app URL → onboarding launches automatically
2. **Create a Cycle** → name it, add your vision + emotional connection
3. **Add up to 3 Quarter Goals** → each linked to your cycle
4. **Break down** each Quarter Goal → Monthly Goals → Weekly Goals → Habits
5. **Track habits daily** on the Excel-style grid (✅ execute / ❌ avoid)
6. **Block your time** on the 24h calendar; link blocks to goals/habits
7. **Check your score** daily (A–F grade) and weekly
8. **Invite accountability partners** → accept invites → view leaderboard
9. **Submit daily standup** → yesterday / today / blockers / reflection
10. **Ask the AI Coach** anything — it references your real data

---

*Last updated: 2026-05-07 | All 16 Definition of Done items complete*
