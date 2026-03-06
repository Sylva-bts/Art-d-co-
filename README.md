# Royal Neon Casino (Preview)

## Ouvrir dans VS Code

1. Ouvre VS Code.
2. `File` → `Open Folder...` puis sélectionne ce dossier (`Art-d-co-`).
3. Copie `.env.example` en `.env`.
4. Mets tes vraies clés Google OAuth et OxaPay dans `.env`.
5. Lance l'app depuis VS Code:
   - soit avec `Run and Debug` → **Run server.js**
   - soit avec `Terminal` → `Run Task` → **npm: start**

## Prérequis

- Node.js 22+
- Accès au registre npm (pour installer les dépendances)
- MongoDB accessible via `MONGODB_URI`

## Commandes utiles

```bash
npm install
npm start
```

Application: http://localhost:4173

## Vérifier OxaPay

- `GET /api/payments/health` doit répondre avec `oxapayConfigured: true`.
- Le front affiche aussi le statut OxaPay au chargement.
- Depuis l'UI, saisis un montant + devise puis clique **Créer un paiement**.
- Si tout est correct, tu obtiens un lien OxaPay cliquable + ouverture auto.
- En cas d'erreur provider, les tentatives backend sont retournées (code HTTP + message) pour debug.

## Notes

- Si `npm install` renvoie `403`, vérifie proxy/réseau/registry npm.
- Le login Google dépend aussi de la configuration OAuth côté Google Cloud Console (URL callback).
