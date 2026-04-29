export function getToken() { return localStorage.getItem('fq_token') }
export function getUser() {
  const u = localStorage.getItem('fq_user')
  return u ? JSON.parse(u) : null
}
export function setAuth(token: string, user: any) {
  localStorage.setItem('fq_token', token)
  localStorage.setItem('fq_user', JSON.stringify(user))
}
export function clearAuth() {
  localStorage.removeItem('fq_token')
  localStorage.removeItem('fq_user')
}
export function isAuthenticated() { return !!getToken() }
