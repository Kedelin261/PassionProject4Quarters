import { Hono } from 'hono'
import { getAuthUser, extractToken } from '../lib/auth'

type Bindings = { DB: D1Database }
const accountability = new Hono<{ Bindings: Bindings }>()

// POST /api/accountability/invite - invite by email
accountability.post('/invite', async (c) => {
  try {
    const token = extractToken(c)
    const user = await getAuthUser(c.env.DB, token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const { email } = await c.req.json()
    if (!email) return c.json({ error: 'email required' }, 400)

    const partner = await c.env.DB.prepare(
      'SELECT id, name, email FROM users WHERE email = ?'
    ).bind(email.toLowerCase()).first() as any

    if (!partner) return c.json({ error: 'User not found with that email' }, 404)
    if (partner.id === user.id) return c.json({ error: 'Cannot invite yourself' }, 400)

    const existing = await c.env.DB.prepare(
      'SELECT id FROM accountability_partners WHERE user_id = ? AND partner_id = ?'
    ).bind(user.id, partner.id).first()

    if (existing) return c.json({ error: 'Already invited or partnered' }, 409)

    await c.env.DB.prepare(
      'INSERT INTO accountability_partners (user_id, partner_id, status) VALUES (?, ?, ?)'
    ).bind(user.id, partner.id, 'pending').run()

    return c.json({ success: true, partner: { id: partner.id, name: partner.name, email: partner.email } }, 201)
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /api/accountability/partners
accountability.get('/partners', async (c) => {
  try {
    const token = extractToken(c)
    const user = await getAuthUser(c.env.DB, token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    // Outgoing invites + accepted
    const sent = await c.env.DB.prepare(
      `SELECT ap.*, u.name as partner_name, u.email as partner_email 
       FROM accountability_partners ap
       JOIN users u ON u.id = ap.partner_id
       WHERE ap.user_id = ?`
    ).bind(user.id).all()

    // Incoming invites
    const received = await c.env.DB.prepare(
      `SELECT ap.*, u.name as sender_name, u.email as sender_email 
       FROM accountability_partners ap
       JOIN users u ON u.id = ap.user_id
       WHERE ap.partner_id = ?`
    ).bind(user.id).all()

    return c.json({ sent: sent.results, received: received.results })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// PATCH /api/accountability/:id/respond
accountability.patch('/:id/respond', async (c) => {
  try {
    const token = extractToken(c)
    const user = await getAuthUser(c.env.DB, token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')
    const { status } = await c.req.json()
    if (!['accepted', 'declined'].includes(status)) {
      return c.json({ error: 'status must be accepted or declined' }, 400)
    }

    await c.env.DB.prepare(
      'UPDATE accountability_partners SET status = ? WHERE id = ? AND partner_id = ?'
    ).bind(status, id, user.id).run()

    return c.json({ success: true, status })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /api/accountability/leaderboard
accountability.get('/leaderboard', async (c) => {
  try {
    const token = extractToken(c)
    const user = await getAuthUser(c.env.DB, token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    // Get all accepted partners
    const partners = await c.env.DB.prepare(
      `SELECT DISTINCT u.id, u.name
       FROM accountability_partners ap
       JOIN users u ON (u.id = ap.partner_id OR u.id = ap.user_id)
       WHERE (ap.user_id = ? OR ap.partner_id = ?) AND ap.status = 'accepted' AND u.id != ?`
    ).bind(user.id, user.id, user.id).all()

    const allUsers = [{ id: user.id, name: user.name }, ...(partners.results as any[])]

    const leaderboard = []
    for (const u of allUsers) {
      const score = await c.env.DB.prepare(
        `SELECT AVG(total_score) as avg_score, MAX(total_score) as best_score, COUNT(*) as days_tracked
         FROM daily_scores WHERE user_id = ?`
      ).bind(u.id).first() as any

      leaderboard.push({
        user_id: u.id,
        name: u.name,
        avg_score: Math.round((score?.avg_score || 0) * 10) / 10,
        best_score: Math.round((score?.best_score || 0) * 10) / 10,
        days_tracked: score?.days_tracked || 0,
        is_me: u.id === user.id
      })
    }

    leaderboard.sort((a, b) => b.avg_score - a.avg_score)
    return c.json({ leaderboard })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Standups
accountability.post('/standup', async (c) => {
  try {
    const token = extractToken(c)
    const user = await getAuthUser(c.env.DB, token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const { standup_date, yesterday, today, blockers, reflection } = await c.req.json()
    const date = standup_date || new Date().toISOString().split('T')[0]

    const result = await c.env.DB.prepare(
      `INSERT INTO standups (user_id, standup_date, yesterday, today, blockers, reflection)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(user.id, date, yesterday || '', today || '', blockers || '', reflection || '').run()

    const standup = await c.env.DB.prepare('SELECT * FROM standups WHERE id = ?').bind(result.meta.last_row_id).first()
    return c.json({ standup }, 201)
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

accountability.get('/standups', async (c) => {
  try {
    const token = extractToken(c)
    const user = await getAuthUser(c.env.DB, token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const result = await c.env.DB.prepare(
      'SELECT * FROM standups WHERE user_id = ? ORDER BY standup_date DESC LIMIT 10'
    ).bind(user.id).all()

    return c.json({ standups: result.results })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

export default accountability
