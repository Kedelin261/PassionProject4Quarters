import { Hono } from 'hono'
import { getAuthUser, extractToken } from '../lib/auth'

type Bindings = { DB: D1Database }
const cycles = new Hono<{ Bindings: Bindings }>()

// POST /api/cycles
cycles.post('/', async (c) => {
  console.log('[CYCLES] POST /api/cycles - request received')
  try {
    const token = extractToken(c)
    const user = await getAuthUser(c.env.DB, token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const body = await c.req.json()
    console.log('[CYCLES] payload:', JSON.stringify(body))

    const { title, vision, emotional_connection, start_date, end_date } = body

    if (!title || !start_date || !end_date) {
      return c.json({ error: 'title, start_date, end_date are required' }, 400)
    }

    const result = await c.env.DB.prepare(
      `INSERT INTO cycles (user_id, title, vision, emotional_connection, start_date, end_date) 
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(user.id, title, vision || '', emotional_connection || '', start_date, end_date).run()

    const cycleId = result.meta.last_row_id
    console.log(`[CYCLES] DB insert success - id=${cycleId}`)

    const cycle = await c.env.DB.prepare('SELECT * FROM cycles WHERE id = ?').bind(cycleId).first()
    return c.json({ cycle }, 201)
  } catch (e: any) {
    console.error('[CYCLES] POST error:', e.message)
    return c.json({ error: 'Failed to create cycle: ' + e.message }, 500)
  }
})

// GET /api/cycles
cycles.get('/', async (c) => {
  try {
    const token = extractToken(c)
    const user = await getAuthUser(c.env.DB, token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const result = await c.env.DB.prepare(
      'SELECT * FROM cycles WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(user.id).all()

    return c.json({ cycles: result.results })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /api/cycles/:id
cycles.get('/:id', async (c) => {
  try {
    const token = extractToken(c)
    const user = await getAuthUser(c.env.DB, token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')
    const cycle = await c.env.DB.prepare(
      'SELECT * FROM cycles WHERE id = ? AND user_id = ?'
    ).bind(id, user.id).first()

    if (!cycle) return c.json({ error: 'Cycle not found' }, 404)
    return c.json({ cycle })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// PATCH /api/cycles/:id
cycles.patch('/:id', async (c) => {
  try {
    const token = extractToken(c)
    const user = await getAuthUser(c.env.DB, token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')
    const { title, vision, emotional_connection, status } = await c.req.json()

    await c.env.DB.prepare(
      `UPDATE cycles SET title = COALESCE(?, title), vision = COALESCE(?, vision), 
       emotional_connection = COALESCE(?, emotional_connection), status = COALESCE(?, status)
       WHERE id = ? AND user_id = ?`
    ).bind(title, vision, emotional_connection, status, id, user.id).run()

    const cycle = await c.env.DB.prepare('SELECT * FROM cycles WHERE id = ?').bind(id).first()
    return c.json({ cycle })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// DELETE /api/cycles/:id
cycles.delete('/:id', async (c) => {
  try {
    const token = extractToken(c)
    const user = await getAuthUser(c.env.DB, token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM cycles WHERE id = ? AND user_id = ?').bind(id, user.id).run()
    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

export default cycles
