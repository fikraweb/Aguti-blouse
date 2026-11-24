# Aguti-blouse

Boutique de vêtements professionnels au Maroc avec catalogue, panier, paiement à la livraison et confirmation WhatsApp. Interface publique en français et en arabe RTL. Les textes du catalogue peuvent être adaptés à la Darija.

## Développement

Utilisez Node.js 24 ou une version ultérieure. Depuis le dépôt existant, lancez `npm ci` puis `npm run dev`. Le serveur écoute par défaut sur le port 3000.

Le catalogue de démonstration compte huit produits et cinq catégories. Les visuels WebP sont générés et les témoignages sont des exemples. Remplacez-les par vos photos produit et des avis autorisés avant l’ouverture.

## Administration et commandes

1. Copiez `.env.example` dans `.env` et définissez un mot de passe fort pour `ADMIN_PASSWORD`. Redémarrez le serveur.
2. Ouvrez `/admin`. Dans l’onglet Boutique, renseignez le numéro WhatsApp au format international (`+212…`), le téléphone, l’adresse et les liens sociaux.
3. Gérez les articles, les images et les catégories dans leurs onglets. Les produits acceptent des photos JPEG, PNG ou WebP, jusqu’à 5 Mo par fichier.
4. Après saisie de l’adresse de livraison, le site enregistre une commande au statut « En attente WhatsApp ». Le client ouvre WhatsApp et envoie le message prérempli. Après réception, confirmez manuellement la commande et les frais éventuels dans l’onglet Commandes. Les messages du formulaire de contact apparaissent dans l’onglet Messages.

## Déploiement

Exécutez `npm ci`, `npm run build` puis `npm start`. Servez l’application derrière HTTPS et utilisez `COOKIE_SECURE=true`, `PUBLIC_URL` et un `SESSION_SECRET` stable, généré aléatoirement. Conservez la base SQLite et les images importées sur un volume persistant via `DATA_DIR`. Ce déploiement est prévu pour une instance unique. Sauvegardez la base via une sauvegarde SQLite cohérente et copiez également le dossier `uploads`. Vérifiez les mentions légales, les coordonnées et les modalités de livraison avant publication.
