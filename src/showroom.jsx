import React,{useRef,useState} from 'react';
import {ArrowRight,ArrowUpRight,ChevronLeft,ChevronRight,ImageOff,ShoppingBag,Truck} from 'lucide-react';
import {collectionLabels,showroomImage,views} from '../showroom.mjs';

const collections=[
 {id:'homme',title:'COLLECTION HOMME',ar:'مجموعة الرجال',color:'Bleu royal'},
 {id:'femme',title:'COLLECTION FEMME',ar:'مجموعة النساء',color:'Bordeaux'},
];
export const money=value=>new Intl.NumberFormat('fr-MA',{maximumFractionDigits:2}).format(value)+' MAD';

export function CollectionLanding({t,category,embedded=false}){
 const query=category?'?categorie='+encodeURIComponent(category):'';
 const Title=embedded?'h2':'h1';
 return <section className="showroom-landing" id="collections" aria-label={t('Collections Aguti','مجموعات أغوتي')}>
  <div className="landing-intro">
   <Title>{embedded?t('Choisissez votre collection','اختار المجموعة ديالك'):t('Le vestiaire professionnel.','اللباس المهني.')}</Title>
   <p>{t('Découvrez notre collection de tenues professionnelles.','اكتشف مجموعتنا من الملابس المهنية.')}</p>
  </div>
  <div className="landing-pair">{collections.map(item=><a href={'/collection/'+item.id+query} className={'collection-portal portal-'+item.id} key={item.id}>
   <img src={showroomImage(item.id,item.color,'front')} fetchPriority={embedded?undefined:'high'} loading={embedded?'lazy':undefined} alt=""/>
   <div className="portal-label"><span>{t(item.title,item.ar)}</span><ArrowUpRight size={23}/></div>
  </a>)}</div>
 </section>;
}

export function Editorial({t,catalog}){
 const items=catalog.products.filter(p=>p.gender&&p.active!==false);
 const best=[...items].sort((a,b)=>(b.popularity||0)-(a.popularity||0))[0];
 const latest=[...items].sort((a,b)=>b.id-a.id)[0];
 return <section className="container section showroom-editorial" id="categories">
  <h2>{t('Dans le showroom','داخل المعرض')}</h2>
  <div className="editorial-grid">
   {[[t('Les plus populaires','الأكثر رواجاً'),best,'Vert médical','walking'],[t('Nouveautés','وصل حديثاً'),latest,'Bordeaux','threeQuarter']].filter(([,p])=>p).map(([label,p,color,angle])=><a key={label} className="editorial-photo" href={'/produit/'+p.id}>
    <img src={p.gallery?.[color]?.[angle]||p.images[0]} alt="" loading="lazy"/>
    <div><h3>{label}</h3><span>{p.name}</span><ArrowUpRight size={20}/></div>
   </a>)}
  </div>
  <div className="editorial-categories">{catalog.categories.map(c=><a href={'/boutique?categorie='+encodeURIComponent(c.id)} key={c.id}><img src={c.image} alt="" loading="lazy"/><span>{t(c.name,c.ar||c.name)}</span><ArrowRight size={18}/></a>)}</div>
 </section>;
}

function Viewer({p,color,t}){
 const [angle,setAngle]=useState('front');
 const [failed,setFailed]=useState('');
 const touch=useRef(null);
 const gallery=p.gallery?.[color]||{};
 const entries=Object.entries(views).filter(([id])=>gallery[id]);
 const current=entries.some(([id])=>id===angle)?angle:entries[0]?.[0];
 const image=gallery[current];
 const position=entries.findIndex(([id])=>id===current);
 function move(delta){if(entries.length>1)setAngle(entries[(position+delta+entries.length)%entries.length][0]);}
 function endSwipe(e){
  const point=e.changedTouches[0];
  if(touch.current&&point){
   const x=point.clientX-touch.current.clientX,y=point.clientY-touch.current.clientY;
   if(Math.abs(x)>40&&Math.abs(x)>Math.abs(y))move(x<0?1:-1);
  }
  touch.current=null;
 }
 return <div className="showroom-viewer">
  <div className="view-rail" role="group" aria-label={t('Angles de vue','زوايا التصوير')}>
   {entries.map(([id,labels])=><button key={id} type="button" aria-pressed={current===id} aria-label={t(...labels)} onClick={()=>setAngle(id)}><img key={gallery[id]} src={gallery[id]} alt="" loading="lazy" onError={e=>{e.currentTarget.hidden=true;}}/><span>{t(...labels)}</span></button>)}
  </div>
  <figure className="model-stage">
   <div className="stage-media" onTouchStart={e=>{touch.current=e.touches[0];}} onTouchEnd={endSwipe} onTouchCancel={()=>{touch.current=null;}}>
    {image&&image!==failed?<img key={image} src={image} alt={p.name+' · '+color+' · '+t(...views[current])} onError={()=>setFailed(image)}/>:<div className="stage-empty"><ImageOff size={30}/><span>{t('Visuel indisponible pour cette couleur','لا توجد صورة لهذا اللون')}</span></div>}
    {entries.length>1&&<div className="stage-arrows"><button className="icon" type="button" aria-label={t('Vue précédente','الصورة السابقة')} onClick={()=>move(-1)}><ChevronLeft size={19}/></button><button className="icon" type="button" aria-label={t('Vue suivante','الصورة التالية')} onClick={()=>move(1)}><ChevronRight size={19}/></button></div>}
   </div>
   <figcaption aria-live="polite">{current&&<span>{t(...views[current])} · {color}</span>}{image?.startsWith('/images/showroom-')&&<small>{t('Visuel studio illustratif','صورة استوديو توضيحية')}</small>}</figcaption>
  </figure>
 </div>;
}

export function CollectionPage({catalog,gender,initialProduct,initialColor,category,t,add,Whats}){
 const options=catalog.products.filter(p=>p.active!==false&&(!category||p.category===category)&&(gender?p.gender===gender:p.id===initialProduct?.id));
 const [id,setId]=useState(initialProduct?.id);
 const p=options.find(item=>item.id===id)||options[0];
 const [requestedColor,setColor]=useState(initialColor);
 const [requestedSize,setSize]=useState('');
 const color=p?.colors.includes(requestedColor)?requestedColor:p?.colors[0];
 const size=p?.sizes.includes(requestedSize)?requestedSize:'';
 const title=gender==='homme'?t('Collection Homme','مجموعة الرجال'):gender==='femme'?t('Collection Femme','مجموعة النساء'):(p?.name||t('Showroom','المعرض'));
 const soldOut=p?.stock===0;
 const order=p?`Bonjour Aguti, je souhaite commander ${p.name} · ${collectionLabels[p.gender]||''} · ${color} · ${size} · 1 × ${money(p.price)}.`:'';
 return <section className="collection-page">
  <div className="container collection-shell">
   <nav className="collection-switch" aria-label={t('Collections','المجموعات')}>{collections.map(item=><a key={item.id} href={'/collection/'+item.id} aria-current={gender===item.id?'page':undefined}>{item.id==='homme'?t('Homme','رجال'):t('Femme','نساء')}</a>)}</nav>
   <h1>{title}</h1>
   {p?<div className="showroom-grid">
    <Viewer key={p.id} p={p} color={color} t={t}/>
    <div className="showroom-options">
     {options.length>1&&<label>{t('Modèle','الموديل')}<select value={p.id} onChange={e=>{setId(Number(e.target.value));setColor(undefined);setSize('');}}>{options.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
     <h2>{t(p.name,p.ar||p.name)}</h2><strong className="detail-price">{money(p.price)}</strong>
     {p.description&&<p className="muted">{p.description}</p>}
     {p.fabric&&<p className="showroom-fabric"><strong>{t('Tissu','القماش')}</strong> · {p.fabric}</p>}
     <fieldset><legend>{t('Couleur','اللون')} <span>{color}</span></legend><div className="showroom-swatches">{p.colors.map(c=><button key={c} type="button" aria-label={c} title={c} aria-pressed={c===color} onClick={()=>setColor(c)} style={{'--swatch':catalog.colors[c]}}/>)}</div></fieldset>
     <fieldset><legend>{t('Taille','المقاس')}</legend><div className="size-options">{p.sizes.map(s=><button type="button" key={s} aria-pressed={s===size} onClick={()=>setSize(s)}>{s}</button>)}</div></fieldset>
     {soldOut&&<p role="status">{t('Rupture de stock','نفد المخزون')}</p>}
     <div className="showroom-actions">
      <button className="button dark" type="button" disabled={!size||soldOut} onClick={()=>add(p,color,size,1)}><ShoppingBag size={17}/>{t('Ajouter au panier','أضف للسلة')}</button>
      {size&&!soldOut&&<Whats className="button outline" message={order}>WhatsApp</Whats>}
      {!size&&!soldOut&&<small>{t('Choisissez une taille','اختار المقاس')}</small>}
     </div>
     <p className="detail-delivery"><Truck size={18}/>{t('Livraison au Maroc · Paiement à la livraison','التوصيل في المغرب · الدفع عند الاستلام')}</p>
    </div>
   </div>:<div className="empty"><p>{t('Aucun modèle disponible dans cette collection.','لا توجد موديلات متوفرة في هذه المجموعة.')}</p><a className="button outline" href="/boutique">{t('Voir les collections','عرض المجموعات')}</a></div>}
  </div>
 </section>;
}
