# Paiement OxaPay (sans authentification)

Application simple avec :
- un champ montant
- un bouton de paiement
- création de facture OxaPay côté serveur

## Variables d'environnement

Créez un fichier `.env` :

```bash
cp .env.example .env
```

Puis remplacez `OXAPAY_MERCHANT_API_KEY` par votre clé OxaPay.

## Lancer le projet avec Node

```bash
node --env-file=.env server.js
```

ou

```bash
npm start
```

Ensuite ouvrez `http://localhost:4173`.
