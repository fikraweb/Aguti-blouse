import { collectionLabels, validShowroom, stockRequirements, insertOrderSql, updateOrderSql, sameOrder, stockUsageSql, withRemainingStock } from '../../showroom.mjs';
import { products, categories, colors, store, withShowroomDefaults } from '../../catalog.mjs';

const initialCatalog = { products, categories };
const maxImageBytes = 5 * 1024 * 1024;
const encoder = new TextEncoder();
const imagePath = /^\/(?:images|uploads)\/[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp)$/;
const statuses = ['En attente WhatsApp', 'Confirmée', 'Expédiée', 'Livrée', 'Annulée'];
const clean = (value, max = 500) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const hex = bytes => Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
const randomId = length => hex(crypto.getRandomValues(new Uint8Array(length)));
const json = (data, status = 200, headers = {}) => Response.json(data, {
  status, headers: { 'Cache-Control': 'no-store', ...headers }
});
const error = (message, status = 400) => json({ error: message }, status);
const cookieFlags = 'Path=/; HttpOnly; SameSite=Lax; Secure';

async function signature(secret, value) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

function equal(a, b) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

async function hasSession(request, secret) {
  const token = /(?:^|;\s*)aguti_admin=(\d+\.[a-f0-9]{64})(?:;|$)/.exec(request.headers.get('Cookie') || '')?.[1];
  if (!token) return false;
  const [expiry, mac] = token.split('.');
  return Number(expiry) > Date.now() && equal(mac, await signature(secret, 'session:'+expiry));
}

async function readRecord(db, id) {
  return db.prepare('SELECT value FROM records WHERE id = ?').bind(id).first('value');
}

async function readCatalog(db) {
  const [savedCatalog, savedStore] = await Promise.all([readRecord(db, 'catalog'), readRecord(db, 'store')]);
  const data=savedCatalog === null ? initialCatalog : JSON.parse(savedCatalog);
  return {
    catalog: { ...data, products:data.products.map(withShowroomDefaults), store: { ...store, ...(savedStore === null ? {} : JSON.parse(savedStore)) }, colors },
    savedCatalog
  };
}

async function rateLimited(db, request, scope, max, windowMs) {
  const now = Date.now();
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const key = scope + ':' + ip;
  const [, row] = await db.batch([
    db.prepare('DELETE FROM rate_limits WHERE expires <= ?').bind(now),
    db.prepare(`INSERT INTO rate_limits VALUES (?, 1, ?) ON CONFLICT(key)
      DO UPDATE SET count = count + 1 RETURNING count`).bind(key, now + windowMs)
  ]);
  return row.results[0].count > max;
}

async function list(db, table) {
  const { results } = await db.prepare(`SELECT value FROM ${table} ORDER BY rowid DESC`).all();
  return results.map(row => JSON.parse(row.value));
}

function validCatalog(nextProducts, nextCategories) {
  if (!Array.isArray(nextProducts) || !Array.isArray(nextCategories) || nextProducts.length > 2000 || nextCategories.length > 100) return false;
  const ids = new Set();
  for (const c of nextCategories) {
    if (!c || typeof c.id !== 'string' || !/^[a-z0-9-]{1,64}$/.test(c.id) || ids.has(c.id) || !clean(c.name, 120) || !imagePath.test(c.image)) return false;
    ids.add(c.id);
  }
  const productIds = new Set();
  for (const p of nextProducts) {
    if (!p || !Number.isSafeInteger(p.id) || productIds.has(p.id) || !ids.has(p.category) || !clean(p.name, 120) || !Number.isFinite(p.price) || p.price <= 0 || p.price > 1e6) return false;
    if (!Array.isArray(p.images) || !p.images.length || p.images.some(img => !imagePath.test(img))) return false;
    if (!Array.isArray(p.colors) || !p.colors.length || p.colors.some(v => !Object.hasOwn(colors, v))) return false;
    if (!Array.isArray(p.sizes) || !p.sizes.length || p.sizes.some(v => !clean(v, 20))) return false;
    if ([p.ar, p.description, p.badge].some(v => v !== undefined && typeof v !== 'string')) return false;
    if(!validShowroom(p)) return false;
    productIds.add(p.id);
  }
  return true;
}

async function createOrder(db, body) {
  const customer = Object.fromEntries(['name', 'phone', 'city', 'address'].map(key => [key, clean(body.customer?.[key], key === 'address' ? 300 : 100)]));
  if (Object.values(customer).some(value => !value) || !/^[+\d ()-]{8,24}$/.test(customer.phone)) return error('Vérifiez les coordonnées de livraison.');
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 50) return error('Panier invalide.');
  const { catalog } = await readCatalog(db);
  if (!/^\+?\d{8,15}$/.test(catalog.store.whatsapp)) return error('Le numéro WhatsApp de la boutique reste à configurer.', 503);
  const requestedId=body.requestId;
  if(requestedId!==undefined&&(typeof requestedId!=='string'||!/^[A-F0-9]{32}$/.test(requestedId))) return error('Identifiant de commande invalide.');
  const id=requestedId||randomId(6).toUpperCase();
  async function previousOrder(){
    const value=requestedId&&await db.prepare('SELECT value FROM orders WHERE id=?').bind(id).first('value');
    if(!value) return null;
    const order=JSON.parse(value);
    return sameOrder(order,customer,body.items)
      ? json({order,whatsapp:catalog.store.whatsapp})
      : error('Cette commande a déjà été enregistrée avec d’autres informations.',409);
  }
  const previous=await previousOrder();
  if(previous) return previous;
  const items = [];
  for (const row of body.items) {
    const product = catalog.products.find(p => p.id === row?.id);
    if (!product || product.active===false || !product.colors.includes(row.color) || !product.sizes.includes(row.size) || !Number.isInteger(row.qty) || row.qty < 1 || row.qty > 99) return error('Un article ou une variante du panier a changé.');
    items.push({ id: product.id, name: product.name, gender:collectionLabels[product.gender], deliveryIncluded:product.deliveryIncluded===true, price: product.price, color: row.color, size: row.size, qty: row.qty });
  }
  const total = items.reduce((sum, row) => sum + Math.round(row.price * 100) * row.qty, 0) / 100;
  const order = { id, customer, items, status: statuses[0], createdAt: new Date().toISOString(), total };
  const result=await db.prepare(insertOrderSql).bind(id,JSON.stringify(order),JSON.stringify(stockRequirements(items,catalog.products))).run();
  if(!result.meta.changes) return await previousOrder() || error('Stock insuffisant. Vérifiez les quantités du panier.',409);
  return json({ order, whatsapp: catalog.store.whatsapp }, 201);
}

async function uploadImage(db, image) {
  const match = /^data:image\/(png|jpeg|webp);base64,([a-zA-Z0-9+/=]+)$/.exec(image || '');
  if (!match) return error('Utilisez une image JPG, PNG ou WebP.');
  let raw;
  try { raw = atob(match[2]); } catch { return error('Image invalide.'); }
  const valid = { png: raw.startsWith('\x89PNG\r\n\x1a\n'), jpeg: raw.startsWith('\xff\xd8\xff'), webp: raw.startsWith('RIFF') && raw.slice(8, 12) === 'WEBP' };
  if (!valid[match[1]] || raw.length > maxImageBytes) return error('Image invalide ou supérieure à 5 Mo.');
  const key = randomId(16) + '.' + match[1];
  // D1 limits the size of each row. Store bounded, aligned Base64 chunks.
  const chunkSize = 256 * 1024;
  const statements = [db.prepare('INSERT INTO images VALUES (?, ?)').bind(key, raw.length)];
  const insertChunk = db.prepare('INSERT INTO image_chunks VALUES (?, ?, ?)');
  for (let offset = 0; offset < match[2].length; offset += chunkSize) {
    statements.push(insertChunk.bind(key, offset / chunkSize, match[2].slice(offset, offset + chunkSize)));
  }
  await db.batch(statements);
  return json({ path: '/uploads/' + key }, 201);
}

async function handle(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const db = env.DB;
  if (method === 'GET' && path === '/api/catalog') {
    if (!db) return json({ ...initialCatalog, store, colors, checkoutAvailable:false });
    const {catalog}=await readCatalog(db);
    const tracked=catalog.products.filter(product=>product.stock!=null).map(product=>product.id);
    const usage=tracked.length?(await db.prepare(stockUsageSql).bind(JSON.stringify(tracked)).all()).results:[];
    return json({...catalog,products:withRemainingStock(catalog.products,usage),checkoutAvailable:true});
  }
  if (!db) return error('La base de données de la boutique reste à configurer.', 503);

  const adminRoute = path === '/api/admin' || path.startsWith('/api/admin/');
  const secret = env.SESSION_SECRET;
  const password = env.ADMIN_PASSWORD;
  if (adminRoute || path === '/api/login') {
    if (!password || !secret || secret.length < 32) return error('Configurez les secrets d’administration de la boutique.', 503);
    if (adminRoute && !await hasSession(request, secret)) return error('Connexion requise.', 401);
  }
  if (method === 'POST' || method === 'PUT') {
    const origin = request.headers.get('Origin');
    if ((origin && origin !== url.origin) || request.headers.get('Sec-Fetch-Site') === 'cross-site') return error('Origine interdite.', 403);
  }
  if (method === 'POST' && path === '/api/logout') return json({ ok: true }, 200, { 'Set-Cookie': 'aguti_admin=; ' + cookieFlags + '; Max-Age=0' });
  if (method === 'GET' && path === '/api/admin') {
    const [{ catalog, savedCatalog }, orders, messages] = await Promise.all([readCatalog(db), list(db, 'orders'), list(db, 'messages')]);
    return json({ ...catalog, revision: await signature(secret, 'catalog:' + (savedCatalog || '')), orders, messages });
  }
  if (method !== 'POST' && method !== 'PUT') return error('Route introuvable.', 404);

  const maxBody = path === '/api/admin/image' ? Math.ceil(maxImageBytes / 3) * 4 + 256 : 1024 * 1024;
  if (Number(request.headers.get('Content-Length')) > maxBody) return error('La requête est trop volumineuse.', 413);
  const text = await request.text();
  if (encoder.encode(text).length > maxBody) return error('La requête est trop volumineuse.', 413);
  let body;
  try { body = JSON.parse(text); } catch { return error('Requête invalide.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return error('Requête invalide.');

  if (method === 'POST' && path === '/api/login') {
    if (await rateLimited(db, request, 'login', 8, 15 * 60000)) return error('Trop de tentatives. Réessayez plus tard.', 429);
    const [expected, supplied] = await Promise.all([signature(secret, 'password:' + password), signature(secret, 'password:' + clean(body.password, 512))]);
    if (!equal(expected, supplied)) return error('Mot de passe incorrect.', 401);
    const expiry = Date.now() + 8 * 3600000;
    const token = expiry + '.' + await signature(secret, 'session:' + expiry);
    return json({ ok: true }, 200, { 'Set-Cookie': 'aguti_admin=' + token + '; ' + cookieFlags + '; Max-Age=28800' });
  }
  if (method === 'POST' && path === '/api/orders') {
    if (await rateLimited(db, request, 'order', 15, 60000)) return error('Trop de tentatives. Réessayez plus tard.', 429);
    return createOrder(db, body);
  }
  if (method === 'POST' && path === '/api/contact') {
    if (await rateLimited(db, request, 'contact', 10, 60000)) return error('Trop de tentatives. Réessayez plus tard.', 429);
    const message = { name: clean(body.name, 100), email: clean(body.email, 150), message: clean(body.message, 2000), createdAt: new Date().toISOString() };
    if (!message.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(message.email) || !message.message) return error('Vérifiez les champs du formulaire.');
    await db.prepare('INSERT INTO messages VALUES (?, ?)').bind(randomId(10), JSON.stringify(message)).run();
    return json({ ok: true }, 201);
  }
  if (method === 'PUT' && path === '/api/admin/store') {
    const next = Object.fromEntries(Object.keys(store).map(key => [key, clean(body[key], 300)]));
    next.whatsapp = next.whatsapp.replace(/[ ()-]/g, '');
    if (next.whatsapp && !/^\+?\d{8,15}$/.test(next.whatsapp)) return error('Utilisez le format international pour WhatsApp.');
    if (['instagram', 'facebook'].some(key => next[key] && !/^https:\/\//i.test(next[key]))) return error('Les liens sociaux doivent commencer par https://.');
    await db.prepare("INSERT OR REPLACE INTO records VALUES ('store', ?)").bind(JSON.stringify(next)).run();
    return json(next);
  }
  if (method === 'PUT' && path === '/api/admin/catalog') {
    const saved = await readRecord(db, 'catalog');
    const revision = await signature(secret, 'catalog:' + (saved || ''));
    if (body.revision !== revision) return error('Le catalogue a changé. Rechargez la page avant d’enregistrer.', 409);
    if (!validCatalog(body.products, body.categories)) return error('Vérifiez le prix, les images et les variantes de chaque produit.');
    const value = JSON.stringify({ products: body.products, categories: body.categories });
    const result = await (saved === null
      ? db.prepare("INSERT OR IGNORE INTO records VALUES ('catalog', ?)").bind(value)
      : db.prepare("UPDATE records SET value = ? WHERE id = 'catalog' AND value = ?").bind(value, saved)).run();
    if (!result.meta.changes) return error('Le catalogue a changé. Rechargez la page avant d’enregistrer.', 409);
    const { catalog, savedCatalog } = await readCatalog(db);
    return json({ ...catalog, revision: await signature(secret, 'catalog:' + savedCatalog) });
  }
  if (method === 'POST' && path === '/api/admin/image') return uploadImage(db, body.image);
  const orderId = /^\/api\/admin\/orders\/([A-F0-9]{12}|[A-F0-9]{32})$/.exec(path)?.[1];
  if (method === 'PUT' && orderId) {
    if (!statuses.includes(body.status)) return error('Statut invalide.');
    const row = await db.prepare('SELECT value FROM orders WHERE id = ?').bind(orderId).first('value');
    if (!row) return error('Commande introuvable.', 404);
    const previous=JSON.parse(row);
    const order={...previous,status:body.status};
    const requirements=previous.status==='Annulée'&&order.status!=='Annulée'
      ? stockRequirements(order.items,(await readCatalog(db)).catalog.products):[];
    const result=await db.prepare(updateOrderSql).bind(JSON.stringify(order),orderId,row,JSON.stringify(requirements)).run();
    if(!result.meta.changes) return error('Stock insuffisant ou commande modifiée. Actualisez la page.',409);
    return json(order);
  }
  return error('Route introuvable.', 404);
}

export async function onRequest({ request, env }) {
  try {
    return await handle(request, env);
  } catch (exception) {
    console.error('Aguti API:', exception.message);
    return error('Le service de la boutique est indisponible. Réessayez.', 503);
  }
}
