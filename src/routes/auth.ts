import { Hono } from 'hono'
import { hashPassword, verifyPassword, generateToken, extractToken, getAuthUser } from '../lib/auth'

type Bindings = { DB: D1Database }
const auth = new Hono<{ Bindings: Bindings }>()

// POST /api/auth/register
auth.post('/register', async (c) => {
  try {
    const { email, password, name } = await c.req.json()
    
    if (!email || !password || !name) {
      return c.json({ error: 'Email, password, and name are required' }, 400)
    }
    if (password.length < 6) {
      return c.json({ error: 'Password must be at least 6 characters' }, 400)
    }
    
    const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email.toLowerCase()).first()
    if (existing) return c.json({ error: 'Email already registered' }, 409)
    
    const hash = await hashPassword(password)
    const result = await c.env.DB.prepare(
      'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
    ).bind(email.toLowerCase(), hash, name).run()
    
    const userId = result.meta.last_row_id
    const token = generateToken()
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    
    await c.env.DB.prepare(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)'
    ).bind(userId, token, expires).run()
    
    console.log(`[AUTH] Register success: ${email} id=${userId}`)
    return c.json({ token, user: { id: userId, email: email.toLowerCase(), name, onboarding_completed: 0 } }, 201)
  } catch (e: any) {
    console.error('[AUTH] Register error:', e.message)
    return c.json({ error: 'Registration failed: ' + e.message }, 500)
  }
})

// POST /api/auth/login
auth.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json()
    
    if (!email || !password) return c.json({ error: 'Email and password required' }, 400)
    
    const user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).bind(email.toLowerCase()).first() as any
    
    if (!user) return c.json({ error: 'Invalid credentials' }, 401)
    
    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) return c.json({ error: 'Invalid credentials' }, 401)
    
    const token = generateToken()
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    
    await c.env.DB.prepare(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)'
    ).bind(user.id, token, expires).run()
    
    console.log(`[AUTH] Login success: ${email} id=${user.id}`)
    return c.json({ 
      token, 
      user: { id: user.id, email: user.email, name: user.name, onboarding_completed: user.onboarding_completed } 
    })
  } catch (e: any) {
    console.error('[AUTH] Login error:', e.message)
    return c.json({ error: 'Login failed: ' + e.message }, 500)
  }
})

// POST /api/auth/logout
auth.post('/logout', async (c) => {
  const token = extractToken(c)
  if (token) {
    await c.env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
  }
  return c.json({ success: true })
})

// GET /api/auth/me
auth.get('/me', async (c) => {
  const token = extractToken(c)
  const user = await getAuthUser(c.env.DB, token)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  return c.json({ user })
})

// PATCH /api/auth/onboarding
auth.patch('/onboarding', async (c) => {
  const token = extractToken(c)
  const user = await getAuthUser(c.env.DB, token)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  
  await c.env.DB.prepare('UPDATE users SET onboarding_completed = 1 WHERE id = ?').bind(user.id).run()
  return c.json({ success: true })
})

export default auth
