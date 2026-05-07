import { Hono } from 'hono'
import { getAuthUser, extractToken } from '../lib/auth'

type Bindings = { DB: D1Database; AI?: any; OPENAI_API_KEY?: string }
const ai = new Hono<{ Bindings: Bindings }>()

// POST /api/ai/coach
ai.post('/coach', async (c) => {
  try {
    const token = extractToken(c)
    const user = await getAuthUser(c.env.DB, token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const { message, context_type } = await c.req.json()
    if (!message) return c.json({ error: 'message required' }, 400)

    // Gather real user data for context
    const cycles = await c.env.DB.prepare(
      'SELECT * FROM cycles WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(user.id).first() as any

    const recentScores = await c.env.DB.prepare(
      'SELECT * FROM daily_scores WHERE user_id = ? ORDER BY score_date DESC LIMIT 7'
    ).bind(user.id).all()

    const habits = await c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM habits WHERE user_id = ?'
    ).bind(user.id).first() as any

    const completedHabits = await c.env.DB.prepare(
      `SELECT COUNT(*) as done FROM habit_logs WHERE user_id = ? AND completed = 1 
       AND log_date >= date('now', '-7 days')`
    ).bind(user.id).first() as any

    const avgScore = recentScores.results.length > 0
      ? (recentScores.results as any[]).reduce((s: number, r: any) => s + (r.total_score || 0), 0) / recentScores.results.length
      : 0

    const systemContext = `You are the 4 Quarters AI Life Coach — empathetic but firm, like a world-class performance coach.

USER DATA:
- Name: ${user.name}
- Active Cycle: ${cycles?.title || 'No active cycle'}
- Cycle Vision: ${cycles?.vision || 'Not set'}
- Average Score (last 7 days): ${Math.round(avgScore * 10) / 10}%
- Total Habits: ${habits?.total || 0}
- Habit completions this week: ${completedHabits?.done || 0}
- Recent scores: ${(recentScores.results as any[]).map((s: any) => `${s.score_date}: ${s.total_score}% (${s.grade})`).join(', ') || 'No data yet'}

COACHING RULES:
1. Be empathetic but hold the user accountable
2. Reference THEIR specific data — never be generic
3. Identify actual strengths and failures from their data
4. Give specific, actionable advice
5. If scores are low, be constructively firm
6. If scores are high, celebrate but challenge them further
7. Keep responses under 250 words
8. End with ONE specific action step

Context type: ${context_type || 'general'}`

    // Try OpenAI first
    const openaiKey = c.env.OPENAI_API_KEY
    if (openaiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: systemContext },
              { role: 'user', content: message }
            ],
            max_tokens: 350,
            temperature: 0.7
          })
        })
        const data = await response.json() as any
        if (data.choices?.[0]?.message?.content) {
          return c.json({ 
            response: data.choices[0].message.content,
            source: 'openai',
            user_data: { avg_score: Math.round(avgScore * 10) / 10, cycle: cycles?.title }
          })
        }
      } catch (apiErr) {
        console.warn('[AI] OpenAI call failed, using fallback')
      }
    }

    // Try Cloudflare AI
    if (c.env.AI) {
      try {
        const result = await (c.env.AI as any).run('@cf/meta/llama-2-7b-chat-int8', {
          messages: [
            { role: 'system', content: systemContext },
            { role: 'user', content: message }
          ]
        })
        if (result?.response) {
          return c.json({ response: result.response, source: 'cloudflare-ai', user_data: { avg_score: Math.round(avgScore * 10) / 10 } })
        }
      } catch (cfErr) {
        console.warn('[AI] Cloudflare AI failed, using rule-based fallback')
      }
    }

    // Rule-based fallback — references real user data
    const fallback = generateFallback(user.name, Math.round(avgScore * 10) / 10, habits?.total || 0, cycles?.title, message)
    return c.json({ response: fallback, source: 'fallback', user_data: { avg_score: Math.round(avgScore * 10) / 10 } })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

function generateFallback(name: string, avgScore: number, habitCount: number, cycle: string | null, message: string): string {
  const lmsg = message.toLowerCase()
  let response = ''

  if (avgScore === 0 && habitCount === 0) {
    response = `${name}, I see you're just getting started — that's the most important step. Right now your dashboard shows no tracked data yet. The 4 Quarters system only works when you feed it with daily action.\n\n**Your first action:** Create your 12-week cycle, set 1 goal, and add 1 habit. Do it in the next 5 minutes. The system can't coach you on data that doesn't exist yet.`
  } else if (avgScore < 40) {
    response = `${name}, I'm going to be real with you. Your average score of ${avgScore}% tells me execution is breaking down. ${cycle ? `You set up "${cycle}" — that vision means nothing without daily follow-through.` : ''}\n\nLow scores aren't a motivation problem, they're a system problem. You're likely over-committed or under-scheduled.\n\n**Your action step:** Cut your habit list in half. Fewer commitments, done consistently, beats ambitious goals abandoned. Go edit your habits now.`
  } else if (avgScore < 70) {
    response = `${name}, ${avgScore}% average shows you're executing — but inconsistently. There's a gap between what you're committing to and what you're completing.\n\n${cycle ? `Your cycle "${cycle}" is at the halfway point of potential. ` : ''}The 12 Week Year principle is clear: 70% consistent execution beats 100% occasional execution every time.\n\n**Your action step:** Review your time blocks for tomorrow. Are your habits actually scheduled? Block specific times for your top 3 habits right now.`
  } else if (avgScore < 90) {
    response = `${name}, ${avgScore}% — solid execution. You're clearly taking this seriously${cycle ? ` and your cycle "${cycle}" is progressing` : ''}. Now it's time to raise the bar.\n\nGood performers track. Great performers analyze. What's holding you back from that last 10-30%?\n\n**Your action step:** Look at your habit completion grid. Find the ONE habit with the most red (missed) days. That's your target this week. Make it non-negotiable.`
  } else {
    response = `${name}, ${avgScore}% — that's elite execution. You're proving that systems work when you work the system${cycle ? ` — "${cycle}" is on track` : ''}.\n\nHere's the next challenge: high performers often plateau here. The danger is complacency.\n\n**Your action step:** Audit your quarterly goals. Are they still challenging enough? If you're hitting everything at 90%+, it's time to raise the targets. Excellence demands escalation.`
  }

  if (lmsg.includes('motivat') || lmsg.includes('stuck')) {
    response += `\n\nOn motivation: motivation follows action, not the other way around. Don't wait to feel ready — start the smallest habit right now and the feeling will follow.`
  }

  return response
}

export default ai
