# CapyDindon

Aventure 2.5D dans le navigateur. Tu joues Capy, un jeune capybara, et tu rassembles trois reliques pour t’éveiller en **Capyplume**, première étape vers le légendaire CapyDindon.

Le regard est fixé de côté : on court, on saute, on pousse, on tape. Pas de caméra libre. Pensé d’abord pour un iPad 12,9" en paysage, le jeu tourne aussi sur téléphone (paysage) et sur ordinateur.

## Jouer

```bash
npm install
npm run dev
```

Ouvre `http://127.0.0.1:5173/capy-dindon/`.

Build de production, celui qui part sur GitHub Pages (`/capy-dindon/`) :

```bash
npm run build
npm run preview
```

## Contrôles

| Action | Tactile | Clavier | Manette |
| --- | --- | --- | --- |
| Gauche / droite | gros boutons | flèches ou A D | stick ou croix |
| Sauter | bouton orange | Espace, W ou flèche haut | bouton A |
| Agir | étoile | E ou Entrée | bouton B |
| Pause | bouton II | Échap ou P | Start |

Un appui bref fait un petit saut, un appui long va plus haut. En portrait, l’écran demande de tourner l’appareil.

## La tranche

1. Écran titre et intro.
2. Camp des Nuages, avec le totem d’évolution (sauvegarde `localStorage`).
3. Trois épreuves : la cueillette des glands, le garde-manger enchanté, la parade des dindons.
4. Éveil en Capyplume.
5. Musique et effets synthétisés, options, pause, sous-titres, vitesse du texte, animations réduites.

Les règles de jeu (physique, énigme, parade, sauvegarde) sont testées sans rendu. Les scènes 3D ne font que les montrer.

## Tests

```bash
npm test
npm run test:e2e
```

Le smoke test Playwright charge le jeu, passe l’intro, entre au camp et termine la parade via `window.__CAPY__`, en tablette, téléphone paysage et ordinateur.

## Déploiement

Le workflow `.github/workflows/pages.yml` vérifie les tests puis, **uniquement sur un push vers `main`**, publie `dist/` sur GitHub Pages. Cette branche ne déclenche pas ce déploiement.

## Crédit

Tonimalt-Af. Voir `LICENSES.md`.
