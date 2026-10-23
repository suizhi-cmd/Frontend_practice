import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

export const cookieName = 'suizhi_visitor_session'
const lifetime = 8 * 60 * 60

export function json(value, status = 200, headers = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      Vary: 'Cookie',
      ...headers,
    },
  })
}

export function passwordMatches(value) {
  const expected = process.env.VISITOR_PASSWORD
  if (!expected || typeof value !== 'string') return false
  const digest = text => createHash('sha256').update(text).digest()
  return timingSafeEqual(digest(value), digest(expected))
}

function signature(payload) {
  return createHmac('sha256', process.env.VISITOR_PASSWORD)
    .update(`suizhi-visitor-v1.${payload}`).digest('base64url')
}

export function createSession(now = Date.now()) {
  if (!process.env.VISITOR_PASSWORD) throw new Error('Missing visitor password')
  const payload = Buffer.from(JSON.stringify({ v: 1, exp: Math.floor(now / 1000) + lifetime })).toString('base64url')
  return `${payload}.${signature(payload)}`
}

export function sessionCookie(token, secure = true) {
  return `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${token ? lifetime : 0}${secure ? '; Secure' : ''}`
}

export function hasVisitorSession(request, now = Date.now()) {
  if (!process.env.VISITOR_PASSWORD) return false
  const cookie = request.headers.get('Cookie') || ''
  const token = cookie.split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1)
  if (!token || token.length > 512) return false
  const parts = token.split('.')
  if (parts.length !== 2 || !parts.every(part => /^[A-Za-z0-9_-]+$/.test(part))) return false
  const [payload, signed] = parts
  const expected = Buffer.from(signature(payload))
  const actual = Buffer.from(signed)
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    const seconds = Math.floor(now / 1000)
    return data.v === 1 && Number.isSafeInteger(data.exp) && data.exp > seconds && data.exp <= seconds + lifetime
  } catch { return false }
}

export function requireVisitor(request) {
  return hasVisitorSession(request) ? null : json({ error: '请先登录；如果登录已过期，请刷新页面重新进入。' }, 401)
}
