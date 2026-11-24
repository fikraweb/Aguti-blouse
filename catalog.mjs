export const referencePhoto = '/images/hero-medical.jpg';

export const categories = [
 {id:'medical',name:'Tenues médicales',ar:'ملابس طبية',image:'/images/hero-campaign.webp'},
];

export const uniformColors = {
 'Vert médical':'#00784d',
 'Blanc':'#f2f2ec',
 'Noir':'#25262c',
 'Bleu royal':'#0643ad',
 'Bleu ciel':'#79ace8',
 'Prune':'#772475',
 'Rose':'#ed8ab6',
 'Bordeaux':'#7f1233',
 'Beige':'#d5bda2',
 'Crème':'#f5ebd3',
 'Turquoise':'#00829a',
};

// Keep existing custom catalogues editable when they still use earlier colours.
export const colors = {
 ...uniformColors,
 'Vert émeraude':'#1c645b','Bleu marine':'#172e49','Lavande':'#aaa0c5','Camel':'#a17a58','Vert sauge':'#8d9e88',
};

const details = {
 category:'medical', price:299, images:[referencePhoto], colors:Object.keys(uniformColors),
 sizes:['XS','S','M','L','XL','XXL'],
 description:'Ensemble médical deux pièces, avec haut à col V à poches et pantalon assorti.',
};

export const products = [
 {...details,id:101,name:'Ensemble médical · Coupe femme',ar:'طقم طبي بقصة نسائية',popularity:2},
 {...details,id:102,name:'Ensemble médical · Coupe homme',ar:'طقم طبي بقصة رجالية',popularity:1},
];

export const store = {phone:'',whatsapp:'+212660392740',address:'',city:'Maroc',email:'',instagram:'',facebook:''};
