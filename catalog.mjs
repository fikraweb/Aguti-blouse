export const categories = [
 {id:'medical',name:'Tenues médicales',ar:'ملابس طبية',image:'/images/medical.webp'},
 {id:'blouses',name:'Blouses professionnelles',ar:'معاطف مهنية',image:'/images/blouses.webp'},
 {id:'travail',name:'Tenues de travail',ar:'ملابس العمل',image:'/images/travail.webp'},
 {id:'entreprises',name:'Uniformes pour entreprises',ar:'زي الشركات',image:'/images/entreprises.webp'},
 {id:'accessoires',name:'Accessoires professionnels',ar:'إكسسوارات مهنية',image:'/images/accessoires.webp'},
];
export const colors = { 'Vert émeraude':'#1c645b','Bleu marine':'#172e49','Lavande':'#aaa0c5','Bleu ciel':'#91b7ce','Blanc':'#f2f2ec','Camel':'#a17a58','Vert sauge':'#8d9e88','Noir':'#25262c' };
const sizes = ['XS','S','M','L','XL','XXL'];
function product(id, category, name, ar, price, image, variants, badge='', extraSizes=sizes) {
 return {id,category,name,ar,price,images:[`/images/${image}.webp`,`/images/${image}-detail.webp`],colors:variants,sizes:extraSizes,badge,popularity:100-id,description:'Une coupe soignée qui accompagne vos mouvements, avec des finitions pensées pour un usage professionnel au quotidien.'};
}
export const products = [
 product(1,'medical','Ensemble médical Émeraude','طقم طبي زمردي',299,'medical',['Vert émeraude','Bleu marine','Vert sauge'],'Best-seller'),
 product(2,'medical','Ensemble médical Lavande','طقم طبي لافندر',289,'lavande',['Lavande','Bleu ciel','Bleu marine'],'Nouveau'),
 product(3,'blouses','Blouse médicale Signature','معطف طبي سيغنتشر',249,'blouses',['Blanc','Bleu ciel']),
 product(4,'medical','Ensemble médical Atlas','طقم طبي أطلس',319,'atlas',['Bleu marine','Vert émeraude','Noir']),
 product(5,'travail','Veste de travail Horizon','سترة عمل هورايزون',359,'travail',['Camel','Bleu marine']),
 product(6,'entreprises','Veste professionnelle Ligne','سترة مهنية لاين',449,'entreprises',['Bleu marine','Noir']),
 product(7,'accessoires','Calot médical Ciel','قبعة طبية سماوية',79,'accessoires',['Bleu ciel','Bleu marine','Blanc'],'',['Unique']),
 product(8,'medical','Ensemble médical Sauge','طقم طبي أخضر',299,'sauge',['Vert sauge','Vert émeraude','Bleu marine']),
];
export const store = {phone:'',whatsapp:'+212660392740',address:'',city:'Maroc',email:'',instagram:'',facebook:''};
