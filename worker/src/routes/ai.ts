import { Hono } from 'hono'
import { uuid, now } from '../db/helpers'
import { authMiddleware } from '../middleware/auth'
import type { Env } from '../types'

const ai = new Hono<{ Bindings: Env; Variables: { userId: string } }>()
ai.use('*', authMiddleware)

async function getUserContext(DB: D1Database, userId: string) {
  const [user, vision, goals, todayGoals] = await Promise.all([
    DB.prepare('SELECT name FROM users WHERE id = ?').bind(userId).first() as Promise<any>,
    DB.prepare('SELECT * FROM visions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').bind(userId).first() as Promise<any>,
    DB.prepare("SELECT * FROM twelve_week_goals WHERE user_id = ? AND status != 'completed' ORDER BY priority LIMIT 3").bind(userId).all(),
    DB.prepare('SELECT * FROM daily_goals WHERE user_id = ? AND date = ?').bind(userId, new Date().toISOString().split('T')[0]).all(),
  ])
  const recentScores = await DB.prepare('SELECT score_percentage FROM daily_scores WHERE user_id = ? ORDER BY date DESC LIMIT 7').bind(userId).all()
  const scores = (recentScores.results as any[]).map(s => s.score_percentage)
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null
  return { user, vision, goals: goals.results, todayGoals: todayGoals.results, avgScore }
}

function buildSystemPrompt(ctx: any): string {
  const goalList = (ctx.goals as any[]).map((g: any, i: number) => `${i + 1}. ${g.title} (${g.status})`).join('\n')
  const scoreInfo = ctx.avgScore !== null ? `7-day average score: ${ctx.avgScore.toFixed(1)}%` : 'No score data yet'
  const visionText = ctx.vision?.vision_statement || 'Not yet defined'
  const todayProgress = `${(ctx.todayGoals as any[]).filter((g: any) => g.status === 'completed').length}/${ctx.todayGoals.length} daily goals completed today`
  return `You are an AI life coach for 4 Quarters, a 12-week execution system.
User: ${ctx.user?.name || 'User'}
Vision: ${visionText}
Active Goals:\n${goalList || 'None set'}
${scoreInfo}
${todayProgress}

Be empathetic, direct, constructive, and execution-focused. Reference their actual data. Support but never let them off easy.`
}

function ruleBasedFallback(userMessage: string, ctx: any): string {
  const msg = userMessage.toLowerCase()
  if (msg.includes('standup')) return `Let's prep your standup, ${ctx.user?.name}.\n\n**Yesterday:** What did you complete?\n**Today:** What's your #1 priority?\n**Blockers:** What's in your way?`
  if (msg.includes('score') || msg.includes('grade')) {
    const s = ctx.avgScore !== null ? `${ctx.avgScore.toFixed(1)}%` : 'not calculated yet'
    const msg2 = ctx.avgScore >= 80 ? 'Solid. Keep it up.' : ctx.avgScore >= 60 ? 'Passing but not enough. What is holding you back?' : 'This needs to improve. Let us talk about what is not getting done.'
    return `Your 7-day average score is ${s}. ${msg2}`
  }
  if (msg.includes('goal')) {
    const goals = (ctx.goals as any[]).map((g: any) => `• ${g.title} (${g.status})`).join('\n')
    return `Your active 12-week goals:\n\n${goals || 'None set yet. Go set them now.'}\n\nWhich one needs the most attention?`
  }
  if (msg.includes('reflection') || msg.includes('end of day')) {
    return `End-of-day reflection:\n\n1. What did you complete today?\n2. What did you miss?\n3. Why? Be honest.\n4. What specifically will you do differently tomorrow?`
  }
  const responses = [
    `${ctx.user?.name}, stop thinking and start executing. What's the ONE thing you can do right now?`,
    `Your vision doesn't care about your mood. What action can you take in the next 30 minutes?`,
    `Tell me what you need help with. I have your goals, your scores, and your data. Let's work with real numbers.`,
  ]
  return responses[Math.floor(Math.random() * responses.length)]
}

ai.get('/conversations', async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare('SELECT * FROM ai_conversations WHERE user_id = ? ORDER BY updated_at DESC').bind(userId).all()
  return c.json(results)
})

ai.post('/conversations', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const id = uuid()
  await c.env.DB.prepare('INSERT INTO ai_conversations (id,user_id,title,created_at,updated_at) VALUES (?,?,?,?,?)')
    .bind(id, userId, body.title || 'New Conversation', now(), now()).run()
  return c.json(await c.env.DB.prepare('SELECT * FROM ai_conversations WHERE id = ?').bind(id).first(), 201)
})

ai.get('/conversations/:id/messages', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const convo = await c.env.DB.prepare('SELECT id FROM ai_conversations WHERE id = ? AND user_id = ?').bind(id, userId).first()
  if (!convo) return c.json({ error: 'Not found' }, 404)
  const { results } = await c.env.DB.prepare('SELECT * FROM ai_messages WHERE conversation_id = ? ORDER BY created_at').bind(id).all()
  return c.json(results)
})

ai.post('/chat', async (c) => {
  const userId = c.get('userId')
  const { conversationId, message } = await c.req.json()
  const convo = await c.env.DB.prepare('SELECT id FROM ai_conversations WHERE id = ? AND user_id = ?').bind(conversationId, userId).first()
  if (!convo) return c.json({ error: 'Not found' }, 404)
  const userMsgId = uuid()
  await c.env.DB.prepare("INSERT INTO ai_messages (id,conversation_id,user_id,role,content,created_at) VALUES (?,?,?,'user',?,?)")
    .bind(userMsgId, conversationId, userId, message, now()).run()
  const { results: history } = await c.env.DB.prepare('SELECT role, content FROM ai_messages WHERE conversation_id = ? ORDER BY created_at').bind(conversationId).all()
  const ctx = await getUserContext(c.env.DB, userId)
  const systemPrompt = buildSystemPrompt(ctx)
  let reply: string
  try {
    if (!c.env.ANTHROPIC_API_KEY) throw new Error('No key')
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': c.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1024, system: systemPrompt, messages: history }),
    })
    if (!response.ok) throw new Error('API error')
    const data = await response.json() as any
    reply = data.content[0].text
  } catch {
    reply = ruleBasedFallback(message, ctx)
  }
  const assistantMsgId = uuid()
  await c.env.DB.prepare("INSERT INTO ai_messages (id,conversation_id,user_id,role,content,created_at) VALUES (?,?,?,'assistant',?,?)")
    .bind(assistantMsgId, conversationId, userId, reply, now()).run()
  await c.env.DB.prepare('UPDATE ai_conversations SET updated_at = ? WHERE id = ?').bind(now(), conversationId).run()
  return c.json({ message: reply, messageId: assistantMsgId })
})

ai.post('/generate-reflection', async (c) => {
  const userId = c.get('userId')
  const ctx = await getUserContext(c.env.DB, userId)
  return c.json({ reflection: ruleBasedFallback('reflection', ctx) })
})

ai.post('/generate-checkin', async (c) => {
  const userId = c.get('userId')
  const ctx = await getUserContext(c.env.DB, userId)
  return c.json({ checkin: ruleBasedFallback('weekly checkin', ctx) })
})

export default ai
