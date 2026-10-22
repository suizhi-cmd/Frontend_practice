import { getStore } from '@netlify/blobs'
import { timingSafeEqual } from 'node:crypto'

import initialProfile from '../../data/profile.json' with { type: 'json' }

const fields = [
  'school',
  'college',
  'major',
  'interests',
  'learning',
  'currentProject',
  'pastProjects',
]

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  })
}

function passwordMatches(input, expected) {
  const actual = Buffer.from(input || '')
  const correct = Buffer.from(expected)

  return (
    actual.length === correct.length &&
    timingSafeEqual(actual, correct)
  )
}

function cleanProfile(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('资料格式不正确。')
  }

  const result = {}

  for (const field of fields) {
    if (
      typeof body[field] !== 'string' ||
      body[field].length > 1000
    ) {
      throw new Error('每项基础资料必须是文字，最多 1000 字。')
    }

    result[field] = body[field].trim()
  }

  if (!Array.isArray(body.sections) || body.sections.length > 10) {
    throw new Error('详细介绍必须是列表，最多 10 个区块。')
  }

  result.sections = body.sections.map((section) => {
    if (
      !section ||
      typeof section !== 'object' ||
      typeof section.title !== 'string' ||
      !section.title.trim() ||
      section.title.length > 60 ||
      typeof section.content !== 'string' ||
      section.content.length > 3000 ||
      !['intro', 'project', undefined].includes(section.type)
    ) {
      throw new Error('请检查介绍区块：标题 1～60 字，正文最多 3000 字。')
    }

    return {
      title: section.title.trim(),
      content: section.content.trim(),
      type: section.type === 'project' ? 'project' : 'intro',
    }
  })

  return result
}

export default async function handler(request) {
  const pathname = new URL(request.url).pathname

  if (pathname !== '/api/profile') {
    return json({ error: '接口不存在。' }, 404)
  }

  if (!['GET', 'PUT'].includes(request.method)) {
    return json(
      { error: '不支持这个请求方式。' },
      405,
      { Allow: 'GET, PUT' },
    )
  }

  // 保存资料前，先验证编辑密码。
  if (request.method === 'PUT') {
    const expected = process.env.PROFILE_EDIT_PASSWORD

    if (!expected) {
      return json({ error: '线上尚未设置编辑密码。' }, 503)
    }

    if (!passwordMatches(request.headers.get('X-Edit-Password'), expected)) {
      return json({ error: '编辑密码错误。' }, 401)
    }

    const contentType = request.headers.get('Content-Type') || ''

    if (!contentType.toLowerCase().includes('application/json')) {
      return json({ error: '请使用 JSON 格式提交资料。' }, 415)
    }
  }

  try {
    const store = getStore({
      name: 'portfolio-content',
      consistency: 'strong',
    })

    if (request.method === 'GET') {
      // 没有保存过时，使用项目中现有的资料。
      const saved = await store.get('profile', { type: 'json' })
      const profile = saved ?? initialProfile

      return json({
        ...profile,
        sections: profile.sections ?? [],
      })
    }

    const text = await request.text()

    if (Buffer.byteLength(text, 'utf8') > 128 * 1024) {
      return json({ error: '资料内容过大，请缩短后重试。' }, 413)
    }

    let profile

    try {
      profile = cleanProfile(JSON.parse(text))
    } catch (error) {
      return json(
        {
          error: error instanceof SyntaxError
            ? '资料格式不正确，请刷新页面后重试。'
            : error.message,
        },
        400,
      )
    }

    await store.setJSON('profile', profile)

    return json({ message: '资料已保存到云端。' })
  } catch (error) {
    // 详细原因留在后台日志中。
    console.error('资料云存储操作失败：', error.message)

    return json({
      error: '云端资料读取或保存失败，请稍后重试。',
    }, 500)
  }
}

export const config = {
  path: ['/api/profile'],
}