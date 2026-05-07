// Auth utilities - password hashing and token management

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + 'fourquarters_salt_2024')
  const hash = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hash))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(password)
  return computed === hash
}

export function generateToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function getAuthUser(db: D1Database, token: string): Promise<any | null> {
  if (!token) return null
  
  const session = await db.prepare(
    `SELECT s.*, u.id as uid, u.name, u.email, u.onboarding_completed 
     FROM sessions s 
     JOIN users u ON u.id = s.user_id 
     WHERE s.token = ? AND s.expires_at > datetime('now')`
  ).bind(token).first()
  
  if (!session) return null
  
  return {
    id: session.uid,
    name: session.name,
    email: session.email,
    onboarding_completed: session.onboarding_completed
  }
}

export function extractToken(c: any): string {
  const auth = c.req.header('Authorization') || ''
  if (auth.startsWith('Bearer ')) return auth.slice(7)
  return ''
}
