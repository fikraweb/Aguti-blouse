export async function onRequest({ request, env, params }) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
  const extension = /^[a-f0-9]{32}\.(jpeg|png|webp)$/.exec(params.image)?.[1];
  if (!extension || !env.IMAGES) return new Response(null, { status: 404 });
  const object = request.method === 'HEAD' ? await env.IMAGES.head(params.image) : await env.IMAGES.get(params.image);
  if (!object) return new Response(null, { status: 404 });
  return new Response(object.body ?? null, { headers: {
    'Content-Type': 'image/' + extension,
    'Content-Length': String(object.size),
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'public, max-age=604800',
    ETag: object.httpEtag
  } });
}
