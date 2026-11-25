import { collectionLabels, validShowroom, stockRequirements, insertOrderSql, updateOrderSql } from './showroom.mjs';
import express from 'express';
import { createServer as createHttpServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { randomBytes, scryptSync, timingSafeEqual, createHmac } from 'node:crypto';
import { join, resolve } from 'node:path';
import { products, categories, store, colors, withShowroomDefaults } from './catalog.mjs';

const app = express();
const httpServer=createHttpServer(app);
const dev = process.argv.includes('--dev');
const dataPath = resolve(process.env.DATA_DIR || 'data');
mkdirSync(dataPath,{recursive:true,mode:0o700});
mkdirSync(join(dataPath,'uploads'),{recursive:true,mode:0o700});
const db = new DatabaseSync(join(dataPath,'store.sqlite'));
db.exec(`PRAGMA journal_mode=WAL;
 CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, value TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, value TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, value TEXT NOT NULL);`);
const read = (id, fallback) => JSON.parse(db.prepare('SELECT value FROM records WHERE id=?').get(id)?.value ?? JSON.stringify(fallback));
const save = (id,value) => db.prepare('INSERT OR REPLACE INTO records VALUES (?,?)').run(id,JSON.stringify(value));
const getCatalog = () => ({products:read('products',products).map(withShowroomDefaults),categories:read('categories',categories),store:read('store',store),colors});
const catalogRevision = () => sign(JSON.stringify([read('products',products),read('categories',categories)]));
const clean = (value,max=500) => typeof value === 'string' ? value.trim().slice(0,max) : '';
const adminPassword = process.env.ADMIN_PASSWORD || '';
const signingKey = process.env.SESSION_SECRET || randomBytes(48).toString('hex');
const passwordSalt = randomBytes(32);
const passwordHash = scryptSync(adminPassword,passwordSalt,64);
const cookieFlags = `Path=/; HttpOnly; SameSite=Lax${process.env.COOKIE_SECURE === 'true' ? '; Secure' : ''}`;
const sign = (value) => createHmac('sha256',signingKey).update(value).digest('hex');
const equals = (a,b) => a.length === b.length && timingSafeEqual(a,b);
function admin(req,res,next) {
 const cookie = /(?:^|;\s*)aguti_admin=([^;]+)/.exec(req.headers.cookie || '')?.[1] || '';
 const [expiry, signature] = cookie.split('.');
 if (!adminPassword || Number(expiry) <= Date.now() || !/^[a-f0-9]{64}$/.test(signature || '') || !equals(Buffer.from(signature),Buffer.from(sign(expiry)))) return res.status(401).json({error:'Connexion requise.'});
 next();
}
app.disable('x-powered-by');
app.use('/api',express.json({limit:'8mb'}));
app.use('/api',(req,res,next) => {
 res.set('Cache-Control','no-store');
 if (['POST','PUT','DELETE'].includes(req.method) && req.get('sec-fetch-site') === 'cross-site') return res.sendStatus(403);
 next();
});
app.use('/uploads',express.static(join(dataPath,'uploads'),{maxAge:'7d',setHeaders:res=>res.set('X-Content-Type-Options','nosniff')}));
app.get('/api/catalog',(_req,res)=>res.json(getCatalog()));
const limits = new Map();
function limit(scope,max,ms) {
 return (req,res,next) => {
  const now = Date.now();
  for (const [key,value] of limits) if (value.until <= now) limits.delete(key);
  const key = scope+req.ip;
  const value = limits.get(key) || {count:0,until:now+ms};
  if (value.count >= max) return res.status(429).json({error:'Trop de tentatives. Réessayez plus tard.'});
  value.count++;
  limits.set(key,value);
  next();
 };
}
app.post('/api/login',limit('login',8,15*60000),(req,res)=>{
 if (!adminPassword) return res.status(503).json({error:'Configurez ADMIN_PASSWORD pour activer cet espace.'});
 const supplied = clean(req.body?.password,512);
 if (!equals(scryptSync(supplied,passwordSalt,64),passwordHash)) return res.status(401).json({error:'Mot de passe incorrect.'});
 const expiry = String(Date.now()+8*3600000);
 res.set('Set-Cookie',`aguti_admin=${expiry}.${sign(expiry)}; ${cookieFlags}; Max-Age=28800`).json({ok:true});
});
app.post('/api/logout',(_req,res)=>res.set('Set-Cookie',`aguti_admin=; ${cookieFlags}; Max-Age=0`).json({ok:true}));
app.post('/api/orders',limit('order',15,60000),(req,res)=>{
 const customer = {};
 for (const key of ['name','phone','city','address']) customer[key]=clean(req.body?.customer?.[key],key==='address'?300:100);
 if (Object.values(customer).some(value=>!value) || !/^[+\d ()-]{8,24}$/.test(customer.phone)) return res.status(400).json({error:'Vérifiez les coordonnées de livraison.'});
 const source=req.body?.items;
 if (!Array.isArray(source) || !source.length || source.length>50) return res.status(400).json({error:'Panier invalide.'});
 const catalog=getCatalog();
 if (!/^\+?\d{8,15}$/.test(catalog.store.whatsapp)) return res.status(503).json({error:'Le numéro WhatsApp de la boutique reste à configurer.'});
 const items=[];
 for (const row of source) {
  const p=catalog.products.find(p=>p.id===row?.id);
  if (!p || p.active===false || !p.colors.includes(row.color) || !p.sizes.includes(row.size) || !Number.isInteger(row.qty) || row.qty<1 || row.qty>99) return res.status(400).json({error:'Un article ou une variante du panier a changé.'});
  items.push({id:p.id,name:p.name,gender:collectionLabels[p.gender], deliveryIncluded:p.deliveryIncluded===true,price:p.price,color:row.color,size:row.size,qty:row.qty});
 }
 const id=randomBytes(6).toString('hex').toUpperCase();
 const order={id,customer,items,status:'En attente WhatsApp',createdAt:new Date().toISOString(),total:items.reduce((sum,row)=>sum+Math.round(row.price*100)*row.qty,0)/100};
 const result=db.prepare(insertOrderSql).run(id,JSON.stringify(order),JSON.stringify(stockRequirements(items,catalog.products)));
 if (!result.changes) return res.status(409).json({error:'Stock insuffisant. Vérifiez les quantités du panier.'});
 res.status(201).json({order,whatsapp:catalog.store.whatsapp});
});
app.post('/api/contact',limit('contact',10,60000),(req,res)=>{
 const message={name:clean(req.body?.name,100),email:clean(req.body?.email,150),message:clean(req.body?.message,2000),createdAt:new Date().toISOString()};
 if (!message.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(message.email) || !message.message) return res.status(400).json({error:'Vérifiez les champs du formulaire.'});
 const id=randomBytes(10).toString('hex');
 db.prepare('INSERT INTO messages VALUES (?,?)').run(id,JSON.stringify(message));
 res.status(201).json({ok:true});
});
const all = (table) => db.prepare(`SELECT value FROM ${table} ORDER BY rowid DESC`).all().map(row=>JSON.parse(row.value));
app.get('/api/admin',admin,(_req,res)=>res.json({...getCatalog(),revision:catalogRevision(),orders:all('orders'),messages:all('messages')}));
app.put('/api/admin/store',admin,(req,res)=>{
 const next=Object.fromEntries(Object.keys(store).map(key=>[key,clean(req.body?.[key],300)]));
 next.whatsapp=next.whatsapp.replace(/[ ()-]/g,'');
 if (next.whatsapp && !/^\+?\d{8,15}$/.test(next.whatsapp)) return res.status(400).json({error:'Utilisez le format international pour WhatsApp.'});
 for (const key of ['instagram','facebook']) if (next[key] && !/^https:\/\//i.test(next[key])) return res.status(400).json({error:'Les liens sociaux doivent commencer par https://.'});
 save('store',next); res.json(next);
});
const imagePath = /^\/(?:images|uploads)\/[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp)$/;
app.put('/api/admin/catalog',admin,(req,res)=>{
 const {products:nextProducts,categories:nextCategories,revision}=req.body || {};
 if (revision!==catalogRevision()) return res.status(409).json({error:'Le catalogue a changé. Rechargez la page avant d’enregistrer.'});
 if (!Array.isArray(nextProducts) || !Array.isArray(nextCategories) || nextProducts.length>2000 || nextCategories.length>100) return res.status(400).json({error:'Catalogue invalide.'});
 const ids=new Set();
 for (const c of nextCategories) {
  if (!c || !/^[a-z0-9-]{1,64}$/.test(c.id) || ids.has(c.id) || !clean(c.name,120) || !imagePath.test(c.image)) return res.status(400).json({error:'Catégorie invalide. Ajoutez un nom et une image.'});
  ids.add(c.id);
 }
 const productIds=new Set();
 for (const p of nextProducts) {
  if (!p || !Number.isSafeInteger(p.id) || productIds.has(p.id) || !ids.has(p.category) || !clean(p.name,120) || !Number.isFinite(p.price) || p.price<=0 || p.price>1e6 || !Array.isArray(p.images) || !p.images.length || p.images.some(img=>!imagePath.test(img)) || !Array.isArray(p.colors) || !p.colors.length || p.colors.some(v=>!Object.hasOwn(colors,v)) || !Array.isArray(p.sizes) || !p.sizes.length || p.sizes.some(v=>!clean(v,20)) || !validShowroom(p)) return res.status(400).json({error:'Vérifiez le prix, les images et les variantes de chaque produit.'});
  productIds.add(p.id);
 }
 db.exec('BEGIN');
 try { save('products',nextProducts); save('categories',nextCategories); db.exec('COMMIT'); }
 catch(error) { db.exec('ROLLBACK'); throw error; }
 res.json({...getCatalog(),revision:catalogRevision()});
});
app.post('/api/admin/image',admin,async(req,res)=>{
 const match=/^data:image\/(png|jpeg|webp);base64,([a-zA-Z0-9+/=]+)$/.exec(req.body?.image || '');
 if (!match) return res.status(400).json({error:'Utilisez une image JPG, PNG ou WebP.'});
 const buffer=Buffer.from(match[2],'base64');
 const valid={png:buffer.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')),jpeg:buffer.subarray(0,3).equals(Buffer.from('ffd8ff','hex')),webp:buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP'};
 if (!valid[match[1]] || buffer.length>5*1024*1024) return res.status(400).json({error:'Image invalide ou supérieure à 5 Mo.'});
 const name=randomBytes(16).toString('hex')+'.'+match[1];
 const {writeFile}=await import('node:fs/promises');
 await writeFile(join(dataPath,'uploads',name),buffer,{flag:'wx'});
 res.status(201).json({path:'/uploads/'+name});
});
app.put('/api/admin/orders/:id',admin,(req,res)=>{
 const row=db.prepare('SELECT value FROM orders WHERE id=?').get(req.params.id);
 if (!row) return res.sendStatus(404);
 const status=req.body?.status;
 if (!['En attente WhatsApp','Confirmée','Expédiée','Livrée','Annulée'].includes(status)) return res.sendStatus(400);
 const previous=JSON.parse(row.value);
 const order={...previous,status};
 const requirements=previous.status==='Annulée'&&status!=='Annulée'?stockRequirements(order.items,getCatalog().products):[];
 const result=db.prepare(updateOrderSql).run(JSON.stringify(order),order.id,row.value,JSON.stringify(requirements));
 if(!result.changes) return res.status(409).json({error:'Stock insuffisant ou commande modifiée. Actualisez la page.'});
 res.json(order);
});
app.use('/api',(_req,res)=>res.sendStatus(404));
app.use('/api',(error,_req,res,_next)=>{
 if (error.type==='entity.too.large') return res.status(413).json({error:'Le fichier est trop volumineux.'});
 res.status(error.status || 500).json({error:'La requête a échoué. Réessayez.'});
});
if (dev) {
 const {createServer}=await import('vite');
 const vite=await createServer({server:{middlewareMode:true,hmr:{server:httpServer}}});
 app.use(vite.middlewares);
 } else {
 const html=readFileSync(resolve('dist/index.html'),'utf8');
 const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const origin=process.env.PUBLIC_URL ? new URL(process.env.PUBLIC_URL).origin : '';
 app.get('/robots.txt',(_req,res)=>res.type('text').send('User-agent: *\nDisallow: /admin\nDisallow: /api/\n'+(origin?'Sitemap: '+origin+'/sitemap.xml\n':'')));
 if(origin) app.get('/sitemap.xml',(_req,res)=>{
  const urls=['/','/boutique','/collection/homme','/collection/femme','/mentions',...getCatalog().products.map(p=>'/produit/'+p.id)];
  res.type('application/xml').send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls.map(url=>'<url><loc>'+escape(origin+url)+'</loc></url>').join('')+'</urlset>');
 });
 app.use(express.static('dist',{maxAge:'1h',index:false,redirect:false}));
 app.get('/{*path}',(req,res)=>{
  const path=req.path.replace(/\/$/,'')||'/';
  const p=/^\/produit\/\d+$/.test(path)?getCatalog().products.find(row=>'/produit/'+row.id===path):null;
  const title=p?.name || ({'/':'Tenues professionnelles au Maroc','/boutique':'Showroom','/collection/homme':'Collection Homme','/collection/femme':'Collection Femme','/mentions':'Mentions légales','/admin':'Administration'}[path]);
  const description=p?.description || 'Aguti, boutique marocaine de tenues médicales, blouses et vêtements professionnels. Livraison partout au Maroc.';
  const canonical=origin&&title&&path!=='/admin'?'<link rel="canonical" href="'+escape(origin+path)+'">':'';
  const robots=!title||path==='/admin'?'<meta name="robots" content="noindex">':'';
  const product=p?'<script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@type':'Product',name:p.name,image:p.images.map(img=>origin+img),description,offers:{'@type':'Offer',price:p.price,priceCurrency:'MAD'}}).replace(/</g,'\\u003c')+'</script>':'';
  const page=html.replace(/<title>[^<]*<\/title>/,()=>'<title>'+escape(title||'Page introuvable')+' — Aguti Blouse</title>'+canonical+robots+product).replace(/(<meta name="description" content=")[^"]*(")/,(_,a,b)=>a+escape(description)+b);
  res.status(title?200:404).type('html').send(page);
 });
}
httpServer.listen(Number(process.env.PORT || 3000),'0.0.0.0',()=>console.log('Aguti écoute sur le port '+(process.env.PORT || 3000)));
