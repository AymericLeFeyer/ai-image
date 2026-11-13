# ai-image

Interface de génération d'images (OpenAI `gpt-image-*`) à partir de texte et/ou d'images, avec plusieurs sessions.

- Les clés restent côté serveur : `OPENAI_API_KEY` (obligatoire), `OPENAI_ADMIN_KEY` (optionnelle, affiche les dépenses réelles du mois).
- Les sessions et images sont stockées dans le navigateur (IndexedDB).
- Lancer en local : `OPENAI_API_KEY=sk-... node server.js` puis http://localhost:3000
- Déploiement : stack Dockhand `ai-image` (image GHCR, port `WEB_PORT`, défaut 3220).

⚠️ L'app n'a pas d'authentification : ne l'expose pas publiquement sans protection, sinon n'importe qui dépense ta clé.
