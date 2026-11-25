import React,{useState,useEffect,createContext,useContext} from 'react';
import {createRoot} from 'react-dom/client';
import {ArrowRight,ArrowUpRight,ShoppingBag,Menu,X,Globe,MessageCircle,Truck,ShieldCheck,Shirt,Ruler,Headphones,Star,Plus,Minus,MapPin,Phone,Instagram,Facebook,Check,Mail} from 'lucide-react';
import {products,categories,store,colors,withShowroomDefaults} from '../catalog.mjs';
import {showroomImage} from '../showroom.mjs';
import {CollectionLanding,CollectionPage,Editorial} from './showroom.jsx';
import './style.css';
import './showroom.css';

const Admin=React.lazy(()=>import('./admin.jsx').then(module=>({default:module.Admin})));

export async function api(path,method='GET',body) {
 const res=await fetch('/api'+path,{method,headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
 const data=await res.json().catch(()=>null);
 if(!res.ok) throw new Error(data?.error || 'Une erreur est survenue. Réessayez.');
 if(data===null) throw new Error('Le service de la boutique est indisponible.');
 return data;
}
const Context=createContext();
const useShop=()=>useContext(Context);
const amount=value=>new Intl.NumberFormat('fr-MA',{maximumFractionDigits:2}).format(value)+' MAD';
const load=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)) ?? fallback;}catch{return fallback;}};
const wa=(number,body)=>number?'https://wa.me/'+number.replace(/\D/g,'')+'?text='+encodeURIComponent(body):'/#contact';
const ico=18;
function Brand(){return <a href="/" className="brand" aria-label="Aguti, accueil"><span className="brand-mark"><Shirt size={19} strokeWidth={1.65}/></span><span>AGUTI<small>WORKWEAR</small></span></a>}
function SectionTitle({tag,title,description,action}){return <div className="section-heading"><div><p className="eyebrow">{tag}</p><h2>{title}</h2>{description&&<p className="muted">{description}</p>}</div>{action}</div>}
function Whats({children,message='Bonjour Aguti, je souhaite en savoir plus sur vos tenues.',className='button',...props}){
 const {catalog}=useShop();
 return <a className={className} href={wa(catalog.store.whatsapp,message)} target={catalog.store.whatsapp?'_blank':undefined} rel="noopener noreferrer" {...props}><MessageCircle size={ico}/>{children}</a>;
}
function Header(){
 const {t,lang,setLang,cart,setCartOpen}=useShop();
 const [menu,setMenu]=useState(false);
 const links=[['/','Accueil','الرئيسية'],['/collection/homme','Homme','رجال'],['/collection/femme','Femme','نساء'],['/#about','À propos','من نحن'],['/#contact','Contact','اتصل بنا']];
 return <><div className="announcement"><Truck size={15}/>{t('Livraison partout au Maroc','التوصيل في جميع أنحاء المغرب')}<span></span>{t('Paiement à la livraison','الدفع عند الاستلام')}</div><header className="header"><div className="container header-inner"><Brand/><nav className={menu?'navigation open':'navigation'} aria-label={t('Navigation principale','القائمة الرئيسية')}>{links.map(([url,fr,ar])=><a className={location.pathname===url?'active':''} key={fr} href={url} onClick={()=>setMenu(false)}>{t(fr,ar)}</a>)}</nav><div className="header-actions"><button className="icon language" aria-label="Changer la langue / اللغة" onClick={()=>setLang(lang==='fr'?'ar':'fr')}><Globe size={17}/><span>{lang==='fr'?'FR':'AR'}</span></button><button aria-label={t('Panier','السلة')} className="icon cart-trigger" onClick={()=>setCartOpen(true)}><ShoppingBag size={20}/><b>{cart.reduce((s,p)=>s+p.qty,0)}</b></button><Whats className="button header-wa">WhatsApp</Whats><button className="icon menu-trigger" aria-label={t('Menu','القائمة')} onClick={()=>setMenu(!menu)}><Menu size={23}/></button></div></div></header></>;
}
function ProductImage({p,color}){
 const src=p.gallery?.[color]?.front||p.images[0];
 return src?<img loading="lazy" src={src} alt=""/>:null;
}
const promises=[[ShieldCheck,'Qualité supérieure','جودة فائقة'],[Shirt,'Confort au quotidien','راحة يومية'],[Ruler,'Couleurs et tailles variées','ألوان ومقاسات متنوعة'],[Truck,'Livraison dans tout le Maroc','التوصيل في كل المغرب'],[Headphones,'Service client personnalisé','خدمة عملاء شخصية']];
function Home(){
 const {t,catalog}=useShop();
 return <><section className="hero"><img className="hero-photo" src="/images/hero-campaign.webp" fetchPriority="high" alt=""/><div className="container hero-inner"><p className="eyebrow hero-tag"><span/>{t('L’EXIGENCE DU VÊTEMENT PROFESSIONNEL','ملابس مهنية بمعايير عالية')}</p><h1>{t('Des tenues professionnelles qui font la différence.','ملابس مهنية تصنع الفرق.')}</h1><p>{t('Découvrez notre collection de vêtements professionnels alliant confort, qualité et élégance.','اكتشف مجموعتنا من الملابس المهنية التي تجمع بين الراحة والجودة والأناقة.')}</p><div className="hero-actions"><a className="button mint" href="#collections">{t('Choisir ma tenue','اختار طقمك')}<ArrowRight size={18}/></a><Whats className="button glass">{t('Commander sur WhatsApp','اطلب عبر واتساب')}</Whats></div></div></section><CollectionLanding t={t} embedded/><Editorial t={t} catalog={catalog}/><section className="container section benefits"><SectionTitle tag={t('NOTRE ENGAGEMENT','التزامنا')} title={t('Pensé pour votre quotidien','مصمم ليومك المهني')}/><img className="quality-photo" src={showroomImage('femme','Vert médical','detail')} alt={t('Détail de la tenue médicale Aguti','تفاصيل طقم أغوتي الطبي')} loading="lazy"/><div className="benefit-grid">{promises.map(([Icon,fr,ar])=><div key={fr}><Icon size={27}/><h3>{t(fr,ar)}</h3></div>)}</div></section><section className="container about" id="about"><img src="/images/about.webp" alt="Atelier Aguti" loading="lazy"/><div><p className="eyebrow">{t('À PROPOS D’AGUTI','عن أغوتي')}</p><h2>{t('Le style au service de votre métier.','الأناقة في خدمة مهنتك.')}</h2><p>{t('Aguti est votre spécialiste marocain du vêtement professionnel. Nous sélectionnons des coupes, des matières et des couleurs adaptées aux journées de celles et ceux qui font la différence sur le terrain.','أغوتي متخصصة في الملابس المهنية بالمغرب. نختار القصات والأقمشة والألوان لتناسب يومك في العمل.')}</p><a className="text-link" href="/boutique">{t('Découvrir nos tenues','اكتشف ملابسنا')}<ArrowRight size={18}/></a></div></section><section className="container section"><SectionTitle tag={t('TÉMOIGNAGES','آراء العملاء')} title={t('Les tenues au quotidien','الملابس في يوم العمل')} description={t('Exemples de retours clients.','أمثلة على آراء العملاء.')}/><div className="review-layout"><img src={showroomImage('homme','Bleu ciel','walking')} loading="lazy" alt=""/><div className="reviews">{[['« Une coupe confortable même après une longue garde. »','Personnel soignant'],['« La blouse est bien coupée et facile à entretenir. »','Cabinet médical'],['« Toute notre équipe a pu trouver sa taille. »','Équipe technique']].map(([quote,author])=><article key={author}><div aria-label="5 étoiles">{Array.from({length:5},(_,i)=><Star size={15} key={i} fill="currentColor"/>)}</div><p>{quote}</p><small>{author}</small></article>)}</div></div></section><Contact/></>;
}
function Contact(){
 const {catalog,t}=useShop();
 const [busy,setBusy]=useState(false),[status,setStatus]=useState(null);
 async function submit(e){e.preventDefault();const form=e.currentTarget;setBusy(true);setStatus(null);try{await api('/contact','POST',Object.fromEntries(new FormData(form))); form.reset();setStatus({ok:true,text:t('Message envoyé.','تم إرسال الرسالة.')});}catch(error){setStatus({text:error.message});}finally{setBusy(false);}}
 return <section className="contact" id="contact"><div className="container section"><SectionTitle tag={t('CONTACT','اتصل بنا')} title={t('Parlons de vos besoins','لنتحدث عن احتياجاتك')}/><div className="contact-grid"><div><div className="contact-line"><Phone size={19}/>{catalog.store.phone?<a href={'tel:'+catalog.store.phone}>{catalog.store.phone}</a>:t('Téléphone à renseigner','رقم الهاتف غير متاح')}</div><div className="contact-line"><MapPin size={19}/>{catalog.store.address||catalog.store.city||'Maroc'}</div>{catalog.store.whatsapp&&<Whats className="button outline">WhatsApp</Whats>}<div className="map"><MapPin size={24}/>{catalog.store.address?<a href={'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(catalog.store.address+' '+catalog.store.city)} target="_blank" rel="noreferrer">Google Maps <ArrowUpRight size={16}/></a>:<span>Google Maps · {t('Adresse à renseigner','العنوان غير متاح')}</span>}</div></div><form className="stack" onSubmit={submit}><label>{t('Nom','الاسم')}<input name="name" required maxLength={100}/></label><label>{t('E-mail','البريد الإلكتروني')}<input name="email" type="email" required maxLength={150}/></label><label>{t('Message','الرسالة')}<textarea name="message" rows={4} required maxLength={2000}/></label><button className="button dark" disabled={busy}>{busy?t('Envoi…','جاري الإرسال…'):t('Envoyer le message','أرسل الرسالة')}</button>{status&&<p role="status" className={status.ok?'success':'error'}>{status.text}</p>}</form></div></div></section>;
}
function Quantity({qty,onChange,max=99}){return <div className="quantity"><button type="button" aria-label="−" disabled={qty<=1} onClick={()=>onChange(qty-1)}><Minus size={16}/></button><output>{qty}</output><button type="button" aria-label="+" disabled={qty>=max} onClick={()=>onChange(qty+1)}><Plus size={16}/></button></div>}
function Modal({children,close,label,drawer=false}){
 const node=React.useRef(null);
 useEffect(()=>{const dialog=node.current;dialog.showModal();return()=>dialog.close();},[]);
 return <dialog ref={node} className={drawer?'drawer':'modal'} aria-label={label} onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===e.currentTarget)close();}}><div className="dialog-body"><button autoFocus className="icon close" aria-label="Fermer" onClick={close}><X size={22}/></button>{children}</div></dialog>;
}
function Cart(){
 const {t,cart,setCart,catalog,setCartOpen}=useShop();
 const [checkout,setCheckout]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[confirmation,setConfirmation]=useState(null);
 const selected=cart.map(row=>({...row,p:catalog.products.find(p=>p.id===row.id)}));
 const total=selected.reduce((sum,row)=>sum+(row.p?.price||0)*row.qty,0);
 function change(i,qty){setCart(prev=>prev.flatMap((row,index)=>i!==index?[row]:qty?[{...row,qty}]:[]));}
 async function submit(e){
  e.preventDefault();setBusy(true);setError('');
  try{
   const {order,whatsapp}=await api('/orders','POST',{customer:Object.fromEntries(new FormData(e.currentTarget)),items:cart});
   const {customer,items}=order;
   const message=['Bonjour Aguti, je souhaite confirmer la commande '+order.id+'.','',...items.map(i=>`${i.qty} × ${i.name}${i.gender?' · '+i.gender:''} · ${i.color} · ${i.size} · ${amount(i.qty*i.price)}`),'','Total produits : '+amount(order.total),'Paiement à la livraison','Nom : '+customer.name,'Téléphone : '+customer.phone,'Ville : '+customer.city,'Adresse : '+customer.address].join('\n');
   setConfirmation({id:order.id,url:wa(whatsapp,message)});
  }catch(err){setError(err.message);}finally{setBusy(false);}
 }
 return <Modal drawer label={t('Panier','السلة')} close={()=>setCartOpen(false)}><h2>{checkout?t('Votre commande','طلبك'):t('Votre panier','سلتك')}</h2>{confirmation?<div className="stack"><p><Check size={20}/> {t('Commande enregistrée','تم تسجيل الطلب')} #{confirmation.id}</p><p>{t('Envoyez le récapitulatif sur WhatsApp pour finaliser la commande.','أرسل ملخص الطلب على واتساب لتأكيده.')}</p><a className="button dark" href={confirmation.url} target="_blank" rel="noopener noreferrer" onClick={()=>setCart([])}><MessageCircle size={18}/>{t('Ouvrir WhatsApp','افتح واتساب')}</a></div>:!cart.length?<div className="empty"><ShoppingBag/><p>{t('Votre panier est vide.','سلتك فارغة.')}</p><a className="button dark" href="/boutique">{t('Voir la boutique','عرض المتجر')}</a></div>:<><div className="cart-items">{selected.map((row,i)=><div className="cart-item" key={[row.id,row.color,row.size].join('|')}>{row.p&&<ProductImage p={row.p} color={row.color}/>}<div><strong>{row.p?.name||t('Article indisponible','منتج غير متاح')}</strong><small>{row.color} · {row.size}</small><Quantity qty={row.qty} onChange={qty=>change(i,qty)}/></div><div><strong>{amount((row.p?.price||0)*row.qty)}</strong><button className="icon" onClick={()=>change(i,0)} aria-label="Supprimer"><X size={16}/></button></div></div>)}</div><div className="cart-total"><strong>{t('Total produits','إجمالي المنتجات')}</strong><strong>{amount(total)}</strong></div><p className="muted">{t('Paiement à la livraison. Frais de livraison à confirmer.','الدفع عند الاستلام. يتم تأكيد رسوم التوصيل.')}</p>{checkout?<form className="stack" onSubmit={submit}>{[['name','Nom complet','الاسم الكامل'],['phone','Téléphone','الهاتف'],['city','Ville','المدينة'],['address','Adresse complète','العنوان الكامل']].map(([key,fr,ar])=><label key={key}>{t(fr,ar)}<input name={key} required type={key==='phone'?'tel':'text'} maxLength={key==='address'?300:100}/></label>)}{error&&<p className="error" role="alert">{error}</p>}<button className="button dark" disabled={busy}><MessageCircle size={17}/>{busy?t('Enregistrement…','جاري التسجيل…'):t('Préparer la commande WhatsApp','جهز طلب واتساب')}</button></form>:<button className="button dark" onClick={()=>setCheckout(true)}>{t('Passer commande','اطلب الآن')} <ArrowRight size={17}/></button>}</>}</Modal>;
}
function Footer(){
 const {catalog,t,lang}=useShop();
 return <footer><div className="container footer-grid"><div><Brand/><p>{t('Le vestiaire professionnel pour celles et ceux qui font la différence.','ملابس مهنية لمن يصنعون الفرق.')}</p><div className="social">{catalog.store.instagram&&<a aria-label="Instagram" href={catalog.store.instagram}><Instagram size={19}/></a>}{catalog.store.facebook&&<a aria-label="Facebook" href={catalog.store.facebook}><Facebook size={19}/></a>}</div></div><div><h3>{t('Navigation','القائمة')}</h3><a href="/boutique">{t('Boutique','المتجر')}</a><a href="/#about">{t('À propos','من نحن')}</a><a href="/#contact">{t('Contact','اتصل بنا')}</a></div><div><h3>{t('Catégories','الفئات')}</h3>{catalog.categories.map(c=><a key={c.id} href={'/boutique?categorie='+c.id}>{lang==='ar'?c.ar||c.name:c.name}</a>)}</div><div><h3>Aguti Workwear</h3><span>{catalog.store.address||catalog.store.city||'Maroc'}</span>{catalog.store.phone&&<a href={'tel:'+catalog.store.phone}>{catalog.store.phone}</a>}{catalog.store.email&&<a href={'mailto:'+catalog.store.email}><Mail size={15}/> {catalog.store.email}</a>}<a href="/admin">{t('Administration','الإدارة')}</a></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} Aguti Workwear</span><a href="/mentions">{t('Mentions légales et confidentialité','المعلومات القانونية والخصوصية')}</a></div></footer>;
}
function Legal(){return <section className="container section prose"><h1>Mentions légales et confidentialité</h1><h2>Éditeur</h2><p>Aguti Workwear, boutique de vêtements professionnels au Maroc. Les coordonnées de la boutique figurent dans la rubrique Contact.</p><h2>Commandes et données</h2><p>Nous utilisons les coordonnées que vous transmettez pour répondre à votre demande et organiser la livraison. Lorsque vous envoyez votre commande sur WhatsApp, le contenu est transmis à ce service. Le panier est enregistré dans votre navigateur. Pour demander l’accès, la correction ou la suppression de vos données, utilisez le formulaire de contact.</p></section>}
function App(){
 const [catalog,setCatalog]=useState({products,categories,store,colors});
 const [catalogError,setCatalogError]=useState(''),[loading,setLoading]=useState(true);
 const [lang,setLang]=useState(()=>load('aguti-lang','fr')==='ar'?'ar':'fr');
 const [cart,setCart]=useState(()=>load('aguti-cart',[])),[cartOpen,setCartOpen]=useState(false);
 const t=(fr,ar)=>lang==='ar'?ar:fr;
 useEffect(()=>{api('/catalog').then(data=>{
  if(!Array.isArray(data.products)||!Array.isArray(data.categories)||!data.store||!data.colors) throw new Error('Catalogue indisponible.');
  setCatalog({...data,products:data.products.map(withShowroomDefaults)});
 }).catch(()=>setCatalogError('Le catalogue affiche les produits de démonstration. Actualisez pour réessayer.')).finally(()=>setLoading(false));},[]);
 useEffect(()=>{document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';localStorage.setItem('aguti-lang',JSON.stringify(lang));},[lang]);
 useEffect(()=>{localStorage.setItem('aguti-cart',JSON.stringify(cart));},[cart]);
 function add(p,color,size,qty){setCart(prev=>{const i=prev.findIndex(r=>r.id===p.id&&r.color===color&&r.size===size);return i<0?[...prev,{id:p.id,color,size,qty}]:prev.map((r,n)=>n===i?{...r,qty:Math.min(99,r.qty+qty)}:r);});setCartOpen(true);}
 const path=location.pathname.replace(/\/$/,'')||'/';
 const p=path.startsWith('/produit/')?catalog.products.find(p=>p.active!==false&&p.id===Number(path.split('/')[2])):null;
 const gender=/^\/collection\/(homme|femme)$/.exec(path)?.[1]||p?.gender;
 const query=new URLSearchParams(location.search);
 const initialColor=query.get('couleur');
 const category=query.get('categorie');
 useEffect(()=>{const title=p?.name||({'/collection/homme':'Collection Homme','/collection/femme':'Collection Femme','/boutique':'Showroom','/mentions':'Mentions légales','/admin':'Administration'}[path]);document.title=title?title+' — Aguti Workwear':'Aguti — Tenues professionnelles au Maroc';},[p,path]);
 return <Context.Provider value={{catalog,t,lang,setLang,loading,catalogError,cart,setCart,setCartOpen,add}}><Header/><main id="main">{path==='/'?<Home/>:path==='/boutique'?<CollectionLanding t={t} category={category}/>:path==='/admin'?<React.Suspense fallback={<p className="container section" role="status">Chargement…</p>}><Admin api={api}/></React.Suspense>:path==='/mentions'?<Legal/>:p||gender?<CollectionPage catalog={catalog} gender={gender} initialProduct={p} initialColor={initialColor} category={category} t={t} add={add} Whats={Whats}/>:loading?<p className="container section" role="status">{t('Chargement…','جاري التحميل…')}</p>:<section className="container section empty"><h1>{t('Page introuvable','الصفحة غير موجودة')}</h1><a href="/boutique" className="button dark">{t('Voir la boutique','عرض المتجر')}</a></section>}</main><Footer/>{cartOpen&&<Cart/>}</Context.Provider>;
}
createRoot(document.getElementById('root')).render(<App/>);
