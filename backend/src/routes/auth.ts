import { Hono } from 'hono'
import bcrypt from 'bcryptjs'
import { db } from '../db/schema.js'
import { uuid, now } from '../db/helpers.js'
import { signToken, authMiddleware } from '../middleware/auth.js'

const auth = new Hono()

auth.post('/register', async (c) => {
  const { name, email, password } = await c.req.json()
  if (!name || !email || !password) return c.json({ error: 'Missing fields' }, 400)
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) return c.json({ error: 'Email already registered' }, 409)
  const passwordHash = await bcrypt.hash(password, 12)
  const id = uuid()
  db.prepare('INSERT INTO users (id, name, email, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)')
    .run(id, name, email, passwordHash, now(), now())
  const token = signToken(id)
  return c.json({ token, user: { id, name, email, onboardingCompleted: false } }, 201)
})

auth.post('/login', async (c) => {
  const { email, password } = await c.req.json()
  if (!email || !password) return c.json({ error: 'Missing fields' }, 400)
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any
  if (!user) return c.json({ error: 'Invalid credentials' }, 401)
  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) return c.json({ error: 'Invalid credentials' }, 401)
  const token = signToken(user.id)
  return c.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, onboardingCompleted: !!user.onboarding_completed }
  })
})

auth.post('/logout', (c) => c.json({ message: 'Logged out' }))

auth.get('/me', authMiddleware, (c) => {
  const userId = c.get('userId')
  const user = db.prepare('SELECT id, name, email, onboarding_completed FROM users WHERE id = ?').get(userId) as any
  if (!user) return c.json({ error: 'User not found' }, 404)
  return c.json({ id: user.id, name: user.name, email: user.email, onboardingCompleted: !!user.onboarding_completed })
})

auth.put('/me', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { name, onboardingCompleted } = await c.req.json()
  const updates: string[] = []
  const vals: any[] = []
  if (name !== undefined) { updates.push('name = ?'); vals.push(name) }
  if (onboardingCompleted !== undefined) { updates.push('onboarding_completed = ?'); vals.push(onboardingCompleted ? 1 : 0) }
  if (updates.length === 0) return c.json({ error: 'Nothing to update' }, 400)
  updates.push('updated_at = ?'); vals.push(now()); vals.push(userId)
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...vals)
  const user = db.prepare('SELECT id, name, email, onboarding_completed FROM users WHERE id = ?').get(userId) as any
  return c.json({ id: user.id, name: user.name, email: user.email, onboardingCompleted: !!user.onboarding_completed })
})

export default auth
