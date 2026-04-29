# Deployment Guide

## Frontend → Cloudflare Pages

1. Go to https://dash.cloudflare.com → Pages → Create application → Connect to Git
2. Select repo: `Kedelin261/PassionProject4Quarters`
3. **Build settings:**
   - Framework: None
   - Build command: `cd frontend && npm install && npm run build`
   - Build output directory: `frontend/dist`
4. **Environment variables:**
   - `VITE_API_URL` = `https://your-backend-url.railway.app`
5. Deploy

## Backend → Railway

1. Go to https://railway.app → New Project → Deploy from GitHub repo
2. Select repo: `Kedelin261/PassionProject4Quarters`
3. Railway settings:
   - Root directory: `backend`
   - Start command: `npm start`
4. **Environment variables (add in Railway dashboard):**
   - `JWT_SECRET` = (generate a strong random string)
   - `ANTHROPIC_API_KEY` = (your Claude API key, optional)
   - `PORT` = `3001`
5. Add a volume at `/app/data` for SQLite persistence
6. Deploy and copy the Railway URL
7. Go back to Cloudflare Pages and update `VITE_API_URL` with the Railway URL

## Verify Deployment

```bash
# Test backend health
curl https://your-backend.railway.app/health

# Test auth
curl -X POST https://your-backend.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"password123"}'
```
