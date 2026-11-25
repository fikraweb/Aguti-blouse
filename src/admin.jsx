import React,{useEffect,useState} from 'react';
import {Plus,Trash2,Upload,LogOut} from 'lucide-react';
import {views,collectionLabels} from '../showroom.mjs';

const statuses=['En attente WhatsApp','Confirmée','Expédiée','Livrée','Annulée'];
const emptyProduct=category=>({id:Date.now(),category,gender:'femme',active:true,name:'',ar:'',price:0,images:[],colors:[],sizes:[],badge:'',popularity:0,description:''});
const fields={phone:'Téléphone',whatsapp:'WhatsApp (format international)',address:'Adresse',city:'Ville',email:'E-mail',instagram:'URL Instagram',facebook:'URL Facebook'};

function UploadImage({api,onUpload,onError}){
 const [busy,setBusy]=useState(false);
 async function upload(e){
  const file=e.target.files[0];
  e.target.value='';
  if(!file)return;
  if(file.size>5*1024*1024){onError('Choisissez une image de 5 Mo maximum.');return;}
  setBusy(true);
  try{
   const image=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});
   const result=await api('/admin/image','POST',{image});
   onUpload(result.path);
  }catch(error){onError(error.message||'Impossible de lire cette image.');}finally{setBusy(false);}
 }
 return <label className="upload"><Upload size={17}/>{busy?'Importation…':'Importer une image'}<input type="file" onChange={upload} disabled={busy} accept="image/jpeg,image/webp,image/png"/></label>;
}
function GalleryManager({product,api,onChange,onError}){
 const [selectedColor,setColor]=useState('');
 const [angle,setAngle]=useState('front');
 const color=product.colors.includes(selectedColor)?selectedColor:product.colors[0];
 const picture=product.gallery?.[color]?.[angle];
 function update(path){onChange(color,angle,path);}
 return <fieldset className="admin-panel stack"><legend>Photos du showroom</legend>
  {color?<><div className="admin-fields">
   <label>Couleur de la photo<select value={color} onChange={e=>setColor(e.target.value)}>{product.colors.map(c=><option key={c}>{c}</option>)}</select></label>
   <label>Angle de vue<select value={angle} onChange={e=>setAngle(e.target.value)}>{Object.entries(views).map(([key,labels])=><option value={key} key={key}>{labels[0]}</option>)}</select></label>
  </div><div className="admin-images">{picture&&<div><img src={picture} alt={color}/><button className="icon" type="button" aria-label="Supprimer cette vue" onClick={()=>update(null)}><Trash2 size={16}/></button></div>}</div>
  <UploadImage key={color+angle} api={api} onUpload={update} onError={onError}/></>:<p>Choisissez les couleurs du produit pour ajouter des photos.</p>}
 </fieldset>;
}
export function Admin({api}){
 const [data,setData]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[ok,setOk]=useState('');
 const [tab,setTab]=useState('Produits'),[selected,setSelected]=useState(null);
 useEffect(()=>{api('/admin').then(setData).catch(()=>{}).finally(()=>setLoading(false));},[api]);
 async function run(action,notice=''){
  setBusy(true);setError('');setOk('');
  try{await action();setOk(notice);}catch(err){setError(err.message);}finally{setBusy(false);}
 }
 async function saveCatalog(products,categories){
  const catalog=await api('/admin/catalog','PUT',{products,categories,revision:data.revision});
  setData(old=>({...old,...catalog}));
 }
 function editProduct(p){setSelected(p);setOk('');setError('');}
 function field(key,value){setSelected(old=>({...old,[key]:value}));}
 function saveProduct(e){
  e.preventDefault();
  const gallery=Object.fromEntries(Object.entries(selected.gallery||{}).filter(([color])=>selected.colors.includes(color)));
  const cover=Object.values(gallery).flatMap(Object.values)[0];
  const images=selected.images.length||!cover?selected.images:[cover];
  const product={...selected,gallery,images,sizes:[...new Set(selected.sizes.map(s=>s.trim()).filter(Boolean))]};
  run(async()=>{await saveCatalog([...data.products.filter(p=>p.id!==product.id),product].sort((a,b)=>b.popularity-a.popularity),data.categories);setSelected(null);},'Produit enregistré.');
 }
 if(loading)return <p className="container section" role="status">Chargement…</p>;
 if(!data)return <section className="container section admin login"><h1>Administration</h1><form className="stack" onSubmit={e=>{e.preventDefault();const password=new FormData(e.currentTarget).get('password');run(async()=>{await api('/login','POST',{password});setData(await api('/admin'));});}}><label>Mot de passe<input type="password" name="password" required autoComplete="current-password"/></label><button className="button dark" disabled={busy}>{busy?'Connexion…':'Se connecter'}</button>{error&&<p className="error" role="alert">{error}</p>}</form></section>;
 return <section className="container section admin"><div className="section-heading"><h1>Administration</h1><button className="button outline" disabled={busy} onClick={()=>run(async()=>{await api('/logout','POST');setData(null);setSelected(null);})}><LogOut size={17}/>Déconnexion</button></div><nav className="admin-tabs" aria-label="Administration">{['Produits','Catégories','Commandes','Messages','Boutique'].map(name=><button key={name} className={'button '+(name===tab?'dark':'outline')} onClick={()=>{setTab(name);setSelected(null);setError('');setOk('');}}>{name}</button>)}</nav>{error&&<p className="error" role="alert">{error}</p>}{ok&&<p className="success" role="status">{ok}</p>}
 {tab==='Produits'&&(selected?<form className="stack admin-panel" onSubmit={saveProduct}><h2>{data.products.some(p=>p.id===selected.id)?'Modifier le produit':'Nouveau produit'}</h2><div className="admin-fields"><label>Nom<input required value={selected.name} onChange={e=>field('name',e.target.value)}/></label><label>Nom arabe<input value={selected.ar||''} onChange={e=>field('ar',e.target.value)}/></label><label>Catégorie<select required value={selected.category} onChange={e=>field('category',e.target.value)}>{data.categories.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label><label>Prix (MAD)<input type="number" required min="0.01" step="0.01" value={selected.price} onChange={e=>field('price',Number(e.target.value))}/></label><label className="upload"><input type="checkbox" checked={selected.deliveryIncluded===true} onChange={e=>field('deliveryIncluded',e.target.checked)}/>Livraison incluse dans le prix</label><label>Badge<input value={selected.badge||''} onChange={e=>field('badge',e.target.value)}/></label><label>Popularité<input type="number" value={selected.popularity||0} onChange={e=>field('popularity',Number(e.target.value))}/></label><label>Collection<select value={selected.gender||''} onChange={e=>field('gender',e.target.value||undefined)}><option value="">À sélectionner</option>{Object.entries(collectionLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label>Stock total (vide si non suivi)<input type="number" min="0" max="1000000" value={selected.stock??''} onChange={e=>field('stock',e.target.value===''?null:Number(e.target.value))}/></label></div><label>Description<textarea rows={3} value={selected.description||''} onChange={e=>field('description',e.target.value)}/></label><label>Composition du tissu<input value={selected.fabric||''} maxLength={1000} onChange={e=>field('fabric',e.target.value)}/></label><label className="upload"><input type="checkbox" checked={selected.active!==false} onChange={e=>field('active',e.target.checked)}/>Produit actif</label><label>Tailles séparées par des virgules<input required value={selected.sizes.join(',')} onChange={e=>field('sizes',e.target.value.split(','))}/></label><fieldset><legend>Couleurs</legend><div className="color-checks">{Object.entries(data.colors).map(([name,hex])=><label key={name}><input type="checkbox" checked={selected.colors.includes(name)} onChange={e=>field('colors',e.target.checked?[...selected.colors,name]:selected.colors.filter(c=>c!==name))}/><i style={{background:hex}}/>{name}</label>)}</div></fieldset><GalleryManager key={selected.id} product={selected} api={api} onChange={(color,angle,path)=>setSelected(old=>{
  if(old?.id!==selected.id||!old.colors.includes(color)) return old;
  const angles={...old.gallery?.[color]};
  if(path) angles[angle]=path;
  else delete angles[angle];
  return {...old,gallery:{...old.gallery,[color]:angles}};
 })} onError={setError}/><div className="admin-images">{selected.images.map((image,i)=><div key={image}><img src={image} alt=""/><button type="button" className="icon" aria-label="Supprimer l’image" onClick={()=>field('images',selected.images.filter((_,n)=>n!==i))}><Trash2 size={17}/></button></div>)}</div><UploadImage api={api} onUpload={path=>setSelected(old=>({...old,images:[...old.images,path]}))} onError={setError}/><div className="row"><button className="button dark" disabled={busy}>Enregistrer</button><button type="button" className="button outline" onClick={()=>setSelected(null)}>Annuler</button></div></form>:<div className="stack"><button className="button dark" disabled={!data.categories.length} onClick={()=>editProduct(emptyProduct(data.categories[0]?.id))}><Plus size={18}/>Ajouter un produit</button>{!data.products.length&&<p>Aucun produit.</p>}{data.products.map(p=><article className="admin-row" key={p.id}><img src={p.images[0]} alt=""/><div><strong>{p.name}</strong><small>{p.price} MAD · {collectionLabels[p.gender]||'Collection à définir'}{p.active===false?' · Désactivé':''}</small></div><button className="button outline" onClick={()=>editProduct(p)}>Modifier</button><button className="icon" aria-label={'Supprimer '+p.name} disabled={busy} onClick={()=>{if(confirm('Supprimer ce produit ?'))run(()=>saveCatalog(data.products.filter(v=>v.id!==p.id),data.categories),'Produit supprimé.');}}><Trash2 size={18}/></button></article>)}</div>)}
 {tab==='Catégories'&&(selected?<form className="stack admin-panel" onSubmit={e=>{e.preventDefault();run(async()=>{const index=data.categories.findIndex(c=>c.id===selected.id);await saveCatalog(data.products,index<0?[...data.categories,selected]:data.categories.map(c=>c.id===selected.id?selected:c));setSelected(null);},'Catégorie enregistrée.');}}><label>Nom<input required value={selected.name} onChange={e=>field('name',e.target.value)}/></label><label>Nom arabe<input value={selected.ar} onChange={e=>field('ar',e.target.value)}/></label>{selected.image&&<div className="admin-images"><img src={selected.image} alt=""/></div>}<UploadImage api={api} onUpload={path=>field('image',path)} onError={setError}/><div className="row"><button className="button dark" disabled={busy}>Enregistrer</button><button className="button outline" type="button" onClick={()=>setSelected(null)}>Annuler</button></div></form>:<div className="stack"><button className="button dark" onClick={()=>setSelected({id:'categorie-'+Date.now(),name:'',ar:'',image:''})}><Plus size={18}/>Ajouter une catégorie</button>{data.categories.map((c,i)=><article className="admin-row" key={c.id}><img src={c.image} alt=""/><strong>{c.name}</strong><button className="button outline" onClick={()=>setSelected({...c,ar:c.ar||''})}>Modifier</button><button className="icon" aria-label="Remonter" disabled={!i||busy} onClick={()=>run(()=>{const next=[...data.categories];[next[i-1],next[i]]=[next[i],next[i-1]];return saveCatalog(data.products,next);},'Ordre enregistré.')}>↑</button><button className="icon" aria-label="Supprimer" disabled={busy||data.products.some(p=>p.category===c.id)} onClick={()=>{if(confirm('Supprimer cette catégorie ?'))run(()=>saveCatalog(data.products,data.categories.filter(v=>v.id!==c.id)),'Catégorie supprimée.');}}><Trash2 size={18}/></button></article>)}</div>)}
 {tab==='Commandes'&&<div className="stack">{!data.orders.length&&<p>Aucune commande pour le moment.</p>}{data.orders.map(order=><article className="admin-panel" key={order.id}><div className="section-heading"><h2>#{order.id}</h2><strong>{order.total} MAD</strong></div><p>{order.customer.name} · {order.customer.phone}</p><p>{order.customer.address}, {order.customer.city}</p><ul>{order.items.map((p,i)=><li key={i}>{p.qty} × {p.name}{p.gender?' · '+p.gender:''} · {p.color} · {p.size}</li>)}</ul><label>Statut<select aria-label="Statut de la commande" value={order.status} disabled={busy} onChange={e=>{const status=e.target.value;run(async()=>{const changed=await api('/admin/orders/'+order.id,'PUT',{status});setData(old=>({...old,orders:old.orders.map(o=>o.id===changed.id?changed:o)}));},'Statut mis à jour.');}}>{statuses.map(s=><option key={s}>{s}</option>)}</select></label></article>)}</div>}
 {tab==='Messages'&&<div className="stack">{!data.messages.length&&<p>Aucun message.</p>}{data.messages.map((m,i)=><article className="admin-panel" key={i}><strong>{m.name}</strong> · <a href={'mailto:'+m.email}>{m.email}</a><p>{m.message}</p></article>)}</div>}
 {tab==='Boutique'&&<form className="stack admin-panel" key={JSON.stringify(data.store)} onSubmit={e=>{e.preventDefault();const values=Object.fromEntries(new FormData(e.currentTarget));run(async()=>{const store=await api('/admin/store','PUT',values);setData(old=>({...old,store}));},'Coordonnées enregistrées.');}}><div className="admin-fields">{Object.entries(fields).map(([key,label])=><label key={key}>{label}<input name={key} defaultValue={data.store[key]||''} type={key==='email'?'email':'text'}/></label>)}</div><button className="button dark" disabled={busy}>Enregistrer</button></form>}
 </section>;
}
