import { Hono } from 'hono'
import { db } from '../db/schema.js'
import { uuid, now } from '../db/helpers.js'
import { authMiddleware } from '../middleware/auth.js'

const ai = new Hono()
ai.use('*', authMiddleware)

function getUserContext(userId: string) {
  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as any
  const vision = db.prepare('SELECT * FROM visions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(userId) as any
  const activeGoals = db.prepare("SELECT * FROM twelve_week_goals WHERE user_id = ? AND status != 'completed' ORDER BY priority").all(userId) as any[]
  const todayStr = new Date().toISOString().split('T')[0]
  const todayGoals = db.prepare("SELECT * FROM daily_goals WHERE user_id = ? AND date = ?").all(userId, todayStr) as any[]
  const completedToday = todayGoals.filter((g: any) => g.status === 'completed').length
  const recentScore = db.prepare('SELECT * FROM daily_scores WHERE user_id = ? ORDER BY date DESC LIMIT 7').all(userId) as any[]
  const avgScore = recentScore.length > 0 ? recentScore.reduce((a: number, b: any) => a + b.score_percentage, 0) / recentScore.length : null
  return { user, vision, activeGoals, todayGoals, completedToday, avgScore, todayStr }
}

function buildSystemPrompt(userId: string): string {
  const ctx = getUserContext(userId)
  const goalList = ctx.activeGoals.map((g: any, i: number) => `${i + 1}. ${g.title} (${g.status})`).join('\n')
  const scoreInfo = ctx.avgScore !== null ? `7-day average execution score: ${ctx.avgScore.toFixed(1)}%` : 'No score data yet'
  const visionText = ctx.vision?.vision_statement || 'Not yet defined'
  const todayProgress = `${ctx.completedToday}/${ctx.todayGoals.length} daily goals completed today`

  return `You are an AI life coach for 4 Quarters, a 12-week execution system.

User: ${ctx.user?.name || 'User'}
Vision: ${visionText}
Active 12-Week Goals:
${goalList || 'None set yet'}
${scoreInfo}
${todayProgress}

Your role is to be the user's accountability partner. Be:
- Empathetic but direct
- Supportive but firm on execution
- Constructive with criticism
- Focused on action over excuses
- Reference their actual data above
- Help them prepare standups, reflections, and check-ins
- Celebrate wins but always push for more

Never let them off easy. They chose to be held accountable. Hold them to it.`
}

function ruleBasedFallback(userMessage: string, userId: string): string {
  const ctx = getUserContext(userId)
  const msgLower = userMessage.toLowerCase()

  if (msgLower.includes('standup') || msgLower.includes('daily standup')) {
    return `Let's prep your standup, ${ctx.user?.name}.\n\n**Yesterday:** What goals did you complete? You had ${ctx.todayGoals.length} goals today. What happened?\n\n**Today:** What's your #1 priority right now? What will you execute before anything else?\n\n**Blockers:** What's in your way? Name it so we can solve it. No vague answers.`
  }
  if (msgLower.includes('score') || msgLower.includes('grade')) {
    const score = ctx.avgScore !== null ? `${ctx.avgScore.toFixed(1)}%` : 'not yet calculated'
    return `Your 7-day average execution score is ${score}. ${ctx.avgScore && ctx.avgScore >= 80 ? "That's solid work. Keep that standard." : ctx.avgScore && ctx.avgScore >= 60 ? "You're passing but you can do better. What's holding you back?" : "That score needs to improve. Let's talk about what's not getting done and why."}`
  }
  if (msgLower.includes('goal') || msgLower.includes('quarter')) {
    const goals = ctx.activeGoals.map((g: any) => `• ${g.title} (${g.status})`).join('\n')
    return `Your active 12-week goals:\n\n${goals || 'You have no active goals yet. Go set them now — you cannot execute what you have not defined.'}\n\nWhich one are you struggling with most?`
  }
  if (msgLower.includes('habit')) {
    return `Habits are the foundation of your execution. They're not optional — they're the system that carries you when motivation runs out.\n\nAre your habits clearly defined? Are you tracking them daily? What habit is slipping most right now?`
  }
  if (msgLower.includes('vision') || msgLower.includes('why')) {
    const visionText = ctx.vision?.vision_statement || 'not yet defined'
    return `Your vision: "${visionText}"\n\nEvery decision, every goal, every habit should trace back to this. When execution gets hard, come back to your vision. What does your life look like if you execute this fully? What does it look like if you don't?`
  }
  if (msgLower.includes('reflection') || msgLower.includes('end of day')) {
    return `End-of-day reflection time.\n\n1. What did you complete today?\n2. What did you miss?\n3. Why did you miss it? Be honest — not excuses, reasons.\n4. What specific correction will you make tomorrow?\n\nAnswer each one. Don't skip to tomorrow's plan until you've owned today.`
  }

  const responses = [
    `${ctx.user?.name}, stop thinking and start executing. What is the ONE thing you can do right now that moves you forward?`,
    `Your vision doesn't care about your mood. What action can you take in the next 30 minutes?`,
    `Progress compounds. A 1% improvement daily is 37x better by year end. What's your 1% today?`,
    `The gap between where you are and where you want to be is filled with the actions you're not taking. What are you avoiding?`,
    `Tell me what you need help with. I have your goals, your scores, and your history. Let's work with real data.`,
  ]
  return responses[Math.floor(Math.random() * responses.length)]
}

async function callClaudeAPI(systemPrompt: string, messages: any[]): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('No API key')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
    }),
  })

  if (!response.ok) throw new Error(`API error: ${response.status}`)
  const data = await response.json() as any
  return data.content[0].text
}

ai.get('/conversations', (c) => {
  const userId = c.get('userId')
  return c.json(db.prepare('SELECT * FROM ai_conversations WHERE user_id = ? ORDER BY updated_at DESC').all(userId))
})

ai.post('/conversations', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const id = uuid()
  db.prepare('INSERT INTO ai_conversations (id,user_id,title,created_at,updated_at) VALUES (?,?,?,?,?)')
    .run(id, userId, body.title || 'New Conversation', now(), now())
  return c.json(db.prepare('SELECT * FROM ai_conversations WHERE id = ?').get(id), 201)
})

ai.get('/conversations/:id/messages', (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const convo = db.prepare('SELECT id FROM ai_conversations WHERE id = ? AND user_id = ?').get(id, userId)
  if (!convo) return c.json({ error: 'Not found' }, 404)
  return c.json(db.prepare('SELECT * FROM ai_messages WHERE conversation_id = ? ORDER BY created_at').all(id))
})

ai.post('/chat', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const { conversationId, message } = body

  const convo = db.prepare('SELECT id FROM ai_conversations WHERE id = ? AND user_id = ?').get(conversationId, userId)
  if (!convo) return c.json({ error: 'Conversation not found' }, 404)

  // Save user message
  const userMsgId = uuid()
  db.prepare('INSERT INTO ai_messages (id,conversation_id,user_id,role,content,created_at) VALUES (?,?,?,\'user\',?,?)')
    .run(userMsgId, conversationId, userId, message, now())

  // Get conversation history
  const history = db.prepare('SELECT role, content FROM ai_messages WHERE conversation_id = ? ORDER BY created_at').all(conversationId) as any[]

  const systemPrompt = buildSystemPrompt(userId)
  let reply: string

  try {
    reply = await callClaudeAPI(systemPrompt, history)
  } catch {
    reply = ruleBasedFallback(message, userId)
  }

  // Save assistant message
  const assistantMsgId = uuid()
  db.prepare('INSERT INTO ai_messages (id,conversation_id,user_id,role,content,created_at) VALUES (?,?,?,\'assistant\',?,?)')
    .run(assistantMsgId, conversationId, userId, reply, now())

  // Update conversation timestamp
  db.prepare('UPDATE ai_conversations SET updated_at = ? WHERE id = ?').run(now(), conversationId)

  return c.json({ message: reply, messageId: assistantMsgId })
})

ai.post('/generate-reflection', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const systemPrompt = buildSystemPrompt(userId)
  const prompt = `Generate an end-of-day reflection template for this user based on their current goals and progress. Today's date: ${new Date().toISOString().split('T')[0]}. Additional context: ${body.context || 'none'}`
  let reply: string
  try {
    reply = await callClaudeAPI(systemPrompt, [{ role: 'user', content: prompt }])
  } catch {
    reply = ruleBasedFallback('reflection', userId)
  }
  return c.json({ reflection: reply })
})

ai.post('/generate-checkin', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const systemPrompt = buildSystemPrompt(userId)
  const prompt = `Generate a ${body.type || 'weekly'} check-in summary and coaching insights for this user.`
  let reply: string
  try {
    reply = await callClaudeAPI(systemPrompt, [{ role: 'user', content: prompt }])
  } catch {
    reply = ruleBasedFallback('reflection', userId)
  }
  return c.json({ checkin: reply })
})

export default ai
