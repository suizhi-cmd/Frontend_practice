import { getStore } from '@netlify/blobs'
import { createHmac } from 'node:crypto'
import { json, passwordMatches, createSession, sessionCookie, hasVisitorSession } from '../lib/visitor-auth.mjs'

async function allowAttempt(context) {
  const store = getStore({ name: 'portfolio-login-limits', consistency: 'strong' })
  const key = createHmac('sha256', process.env.VISITOR_PASSWORD).update(context?.ip || 'unknown').digest('hex')
  const bucket = Math.floor(Date.now() / 600000)
  for (let attempt = 0; attempt < 5; attempt++) {
    const previous = await store.getWithMetadata(key, { type: 'json' })
    const count = previous?.data?.bucket === bucket ? previous.data.count : 0
    if (count >= 20) return false
    const result = await store.setJSON(key, { bucket, count: count + 1 }, previous
      ? { onlyIfMatch: previous.etag } : { onlyIfNew: true })
    if (result.modified) return true
  }
  return false
}

export default async function handler(request, context) {
  const path = new URL(request.url).pathname
  const methods = { '/api/auth/session': 'GET', '/api/auth/login': 'POST', '/api/auth/logout': 'POST' }
  if (!methods[path]) return json({ error: '接口不存在。' }, 404)
  if (request.method !== methods[path]) return json({ error: '不支持这个请求方式。' }, 405, { Allow: methods[path] })
  if (request.method === 'POST') {
    const origin = request.headers.get('Origin')
    if (origin && origin !== new URL(request.url).origin) return json({ error: '请求来源不正确。' }, 403)
  }
  if (path === '/api/auth/logout') return json({ message: '已退出登录。' }, 200, { 'Set-Cookie': sessionCookie('') })
  if (!process.env.VISITOR_PASSWORD) return json({ error: '访客登录密码尚未配置，请联系主页主人。' }, 503)
  if (path === '/api/auth/session') return json({ authenticated: hasVisitorSession(request) })
  if (!(request.headers.get('Content-Type') || '').toLowerCase().includes('application/json')) return json({ error: '请求格式不正确。' }, 415)
  let password
  try {
    const raw = await request.text()
    if (Buffer.byteLength(raw) > 4096) return json({ error: '输入内容过长。' }, 413)
    password = JSON.parse(raw)?.password
    if (typeof password !== 'string' || !password.trim() || password.length > 256) return json({ error: '请填写有效的访问密码，最多 256 字符。' }, 400)
  } catch { return json({ error: '请求格式不正确。' }, 400) }
  try {
    if (!await allowAttempt(context)) return json({ error: '尝试次数过多，每 10 分钟最多 20 次，请稍后再试。' }, 429)
    if (!passwordMatches(password)) return json({ error: '访问密码不正确，请重新输入。' }, 401)
    return json({ authenticated: true }, 200, { 'Set-Cookie': sessionCookie(createSession()) })
  } catch (error) {
    console.error('访客登录服务异常：', error.name)
    return json({ error: '登录服务暂时不可用，请稍后重试。' }, 503)
  }
}

export const config = { path: ['/api/auth/session', '/api/auth/login', '/api/auth/logout'] }
