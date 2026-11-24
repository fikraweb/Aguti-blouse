export async function onRequest({ request, env, params }) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
  const extension = /^[a-f0-9]{32}\.(jpeg|png|webp)$/.exec(params.image)?.[1];
  if (!extension || !env.DB) return new Response(null, { status: 404 });
  try {
    const image = await env.DB.prepare('SELECT size FROM images WHERE id = ?').bind(params.image).first();
    if (!image) return new Response(null, { status: 404 });
    const etag = '"' + params.image + '"';
    const headers = {
      'Content-Type': 'image/' + extension,
      'Content-Length': String(image.size),
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=604800, immutable',
      ETag: etag
    };
    if (request.headers.get('If-None-Match') === etag) return new Response(null, { status: 304, headers });
    if (request.method === 'HEAD') return new Response(null, { headers });
    const { results } = await env.DB.prepare('SELECT content FROM image_chunks WHERE image_id = ? ORDER BY position').bind(params.image).all();
    const bytes = new Uint8Array(image.size);
    let offset = 0;
    for (const { content } of results) {
      const raw = atob(content);
      for (let i = 0; i < raw.length; i++) bytes[offset++] = raw.charCodeAt(i);
    }
    if (offset !== image.size) return new Response(null, { status: 503 });
    return new Response(bytes, { headers });
  } catch (exception) {
    console.error('Aguti image:', exception.message);
    return new Response(null, { status: 503 });
  }
}
