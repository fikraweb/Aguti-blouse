# Aguti-blouse

Boutique de vêtements professionnels au Maroc avec catalogue, panier, paiement à la livraison et confirmation WhatsApp. Interface publique en français et en arabe RTL. Les textes du catalogue peuvent être adaptés à la Darija.

## Développement

Utilisez Node.js 24 ou une version ultérieure. Depuis le dépôt existant, lancez `npm ci` puis `npm run dev`. Le serveur écoute par défaut sur le port 3000.

Le showroom s’ouvre sur les collections Homme et Femme. Chaque collection propose six vues de studio pour chacune des onze couleurs du modèle médical. Les visuels sont générés puis déclinés par traitement du vêtement à partir de la même prise de vue pour chaque angle. Ils sont présentés comme des illustrations. Le prix initial de 180 MAD, livraison incluse, et les tailles XS à XXL sont modifiables dans l’administration. Les témoignages sont des exemples.

## Administration et commandes

1. Copiez `.env.example` dans `.env` et définissez un mot de passe fort pour `ADMIN_PASSWORD`. Redémarrez le serveur.
2. Ouvrez `/admin`. Dans l’onglet Boutique, renseignez le numéro WhatsApp au format international (`+212…`), le téléphone, l’adresse et les liens sociaux.
3. Gérez les articles, les images et les catégories dans leurs onglets. Les produits acceptent des photos JPEG, PNG ou WebP, jusqu’à 5 Mo par fichier.
4. Après saisie de l’adresse de livraison, le site enregistre une commande au statut « En attente WhatsApp ». Le client ouvre WhatsApp et envoie le message prérempli. Après réception, confirmez manuellement la commande et les frais éventuels dans l’onglet Commandes. Les messages du formulaire de contact apparaissent dans l’onglet Messages.

## Déploiement

Exécutez `npm ci`, `npm run build` puis `npm start`. Servez l’application derrière HTTPS et utilisez `COOKIE_SECURE=true`, `PUBLIC_URL` et un `SESSION_SECRET` stable, généré aléatoirement. Conservez la base SQLite et les images importées sur un volume persistant via `DATA_DIR`. Ce déploiement est prévu pour une instance unique. Sauvegardez la base via une sauvegarde SQLite cohérente et copiez également le dossier `uploads`. Vérifiez les mentions légales, les coordonnées et les modalités de livraison avant publication.

## Cloudflare Pages avec administration et commandes

Conservez le projet Git existant `aguti-blouse`, la branche `main`, la commande de build `npm run build` et le dossier de sortie `dist`. Cloudflare compile les routes du dossier racine `functions/` lorsque le projet est déployé depuis Git.

1. Créez une base Cloudflare D1 nommée `aguti-db`. Dans son onglet **Console**, exécutez le contenu de [cloudflare/schema.sql](cloudflare/schema.sql). Toutes les instructions utilisent `IF NOT EXISTS` et peuvent être rejouées.
2. Dans **Workers & Pages → aguti-blouse → Settings → Production → Bindings**, ajoutez **D1 database** avec le nom de variable `DB` et sélectionnez `aguti-db`. La même base conserve le catalogue, les commandes, les messages et les images importées.
3. Dans **Variables and secrets**, ajoutez deux valeurs de type **Secret**. Définissez `ADMIN_PASSWORD` avec un mot de passe fort et `SESSION_SECRET` avec une valeur aléatoire distincte d’au moins 32 caractères.
4. Relancez un déploiement de `main` après avoir enregistré les bindings et les secrets. Ouvrez `/admin`, connectez-vous et vérifiez le numéro WhatsApp dans **Boutique**. Faites une commande de test et vérifiez sa présence dans **Commandes**. WhatsApp n’envoie le message que lorsque le client le confirme dans WhatsApp.

Si D1 était déjà configurée, rejouez le fichier SQL pour ajouter les tables des images. Les installations Node et Cloudflare ont des bases distinctes. Une nouvelle base D1 reprend le catalogue de départ et les coordonnées par défaut. Les données créées sur une instance Node ne sont pas transférées automatiquement. La préparation d’un environnement Preview complet nécessite ses propres bindings, données et secrets.

### Gestion du showroom

Dans **Administration → Produits**, renseignez la collection, la description et la composition si elle est connue. Dans **Photos du showroom**, choisissez la couleur et l’angle, importez le fichier puis enregistrez le produit. Chaque combinaison pointe vers son propre fichier. Une vue manquante affiche un état indisponible si aucune photo n’existe pour cette couleur. La photo de couverture peut être ajoutée séparément. Le panneau accepte les vues de face, de dos, de profil, de trois-quarts, en mouvement et les détails.

Un produit désactivé disparaît des collections. Le stock total optionnel comprend les quantités déjà commandées. Les commandes annulées libèrent la quantité correspondante. Les deux boutons de commande du showroom passent par le panier lorsque la base est disponible. Le serveur enregistre la commande et réserve le stock avant l’ouverture de WhatsApp. En cas de panne de la base, le client peut contacter la boutique sur WhatsApp et le stock de ces demandes se traite manuellement.
