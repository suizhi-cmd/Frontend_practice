import photos from '../../data/photos.json' with { type: 'json' }
import profile from '../../data/profile.json' with { type: 'json' }

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

export default async function handler(request) {
  if (request.method !== 'GET') {
    return json(
      { error: '线上编辑功能正在接入，暂时只支持读取。' },
      405,
      { Allow: 'GET' },
    )
  }

  const pathname = new URL(request.url).pathname

  if (pathname === '/api/photos') {
    return json(photos)
  }

  if (pathname === '/api/profile') {
    return json({
      ...profile,
      sections: profile.sections ?? [],
    })
  }

  return json({ error: '接口不存在。' }, 404)
}

export const config = {
  path: ['/api/photos', '/api/profile'],
}