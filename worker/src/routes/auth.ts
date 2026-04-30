import { Hono } from 'hono'
import bcrypt from 'bcryptjs'
import { uuid, now } from '../db/helpers'
import { signToken, authMiddleware } from '../middleware/auth'
import type { Env } from '../types'

const auth = new Hono<{ Bindings: Env; Variables: { userId: string } }>()

auth.post('/register', async (c) => {
  const { name, email, password } = await c.req.json()
  if (!name || !email || !password) return c.json({ error: 'Missing fields' }, 400)
  if (password.length < 8) return c.json({ error: 'Password must be at least 8 characters' }, 400)
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
  if (existing) return c.json({ error: 'Email already registered' }, 409)
  const passwordHash = await bcrypt.hash(password, 10)
  const id = uuid()
  await c.env.DB.prepare('INSERT INTO users (id, name, email, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)')
    .bind(id, name, email, passwordHash, now(), now()).run()
  const token = await signToken(id, c.env.JWT_SECRET)
  return c.json({ token, user: { id, name, email, onboardingCompleted: false } }, 201)
})

auth.post('/login', async (c) => {
  const { email, password } = await c.req.json()
  if (!email || !password) return c.json({ error: 'Missing fields' }, 400)
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first() as any
  if (!user) return c.json({ error: 'Invalid credentials' }, 401)
  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) return c.json({ error: 'Invalid credentials' }, 401)
  const token = await signToken(user.id, c.env.JWT_SECRET)
  return c.json({ token, user: { id: user.id, name: user.name, email: user.email, onboardingCompleted: !!user.onboarding_completed } })
})

auth.post('/logout', (c) => c.json({ message: 'Logged out' }))

auth.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const user = await c.env.DB.prepare('SELECT id, name, email, onboarding_completed FROM users WHERE id = ?').bind(userId).first() as any
  if (!user) return c.json({ error: 'Not found' }, 404)
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
  await c.env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).bind(...vals).run()
  const user = await c.env.DB.prepare('SELECT id, name, email, onboarding_completed FROM users WHERE id = ?').bind(userId).first() as any
  return c.json({ id: user.id, name: user.name, email: user.email, onboardingCompleted: !!user.onboarding_completed })
})

export default auth
