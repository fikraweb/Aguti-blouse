export const views = {
 front:['Face','أمام'],
 back:['Dos','خلف'],
 side:['Profil','جانب'],
 threeQuarter:['Trois-quarts','زاوية مائلة'],
 detail:['Tissu et finitions','القماش والتفاصيل'],
 walking:['En mouvement','أثناء المشي'],
};

export const collectionLabels = {homme:'Homme',femme:'Femme'};
export const colorSlug = name => name.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/\s+/g,'-');
export const showroomImage = (gender,color,angle='front') => `/images/showroom-${gender}-${colorSlug(color)}-${angle}.webp`;
export const mediaPath = /^\/(?:images|uploads)\/[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp)$/;

export function validShowroom(product) {
 const {gender,stock,active,fabric,gallery,deliveryIncluded}=product;
 if(deliveryIncluded!==undefined&&typeof deliveryIncluded!=='boolean') return false;
 if(gender!==undefined&&!Object.hasOwn(collectionLabels,gender)) return false;
 if(stock!=null&&(!Number.isSafeInteger(stock)||stock<0||stock>1000000)) return false;
 if(active!==undefined&&typeof active!=='boolean') return false;
 if(fabric!==undefined&&(typeof fabric!=='string'||fabric.length>1000)) return false;
 if(gallery===undefined) return true;
 if(!gallery||typeof gallery!=='object'||Array.isArray(gallery)) return false;
 return Object.entries(gallery).every(([color,angles])=>product.colors.includes(color)&&angles&&typeof angles==='object'&&!Array.isArray(angles)
  &&Object.entries(angles).every(([angle,path])=>Object.hasOwn(views,angle)&&typeof path==='string'&&mediaPath.test(path)));
}

export function stockRequirements(items, products) {
 const totals=new Map();
 for(const item of items) totals.set(item.id,(totals.get(item.id)||0)+item.qty);
 return products.filter(p=>totals.has(p.id)&&p.stock!=null).map(p=>({id:p.id,left:p.stock-totals.get(p.id)}));
}

// Check outstanding and fulfilled orders in the same statement that inserts the new order.
const stockCheckSql = `NOT EXISTS (
  SELECT 1 FROM json_each(?) AS requirement
  WHERE json_extract(requirement.value, '$.left') < COALESCE((
   SELECT SUM(json_extract(item.value, '$.qty'))
   FROM orders AS previous, json_each(previous.value, '$.items') AS item
   WHERE json_extract(previous.value, '$.status') != 'Annulée'
     AND json_extract(item.value, '$.id') = json_extract(requirement.value, '$.id')
  ), 0)
 )`;

export const insertOrderSql = 'INSERT INTO orders (id, value) SELECT ?, ? WHERE ' + stockCheckSql;
export const updateOrderSql = 'UPDATE orders SET value = ? WHERE id = ? AND value = ? AND ' + stockCheckSql;
