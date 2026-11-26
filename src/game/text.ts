export const TEXT = {
  title: 'CapyDindon',
  subtitle: 'La légende du capybara-dindon',
  play: 'Jouer',
  continue: 'Continuer',
  newGame: 'Nouvelle aventure',
  options: 'Options',
  about: 'À propos',
  aboutBody:
    'Un jeu original de Tonimalt-Af. Musique, images et Capy sont faits maison. Rien ne quitte cet appareil : la partie reste dans ton navigateur.',
  confirmReset: 'Recommencer ? Ta progression sera effacée. Les options, elles, restent.',
  yes: 'Oui, on recommence',
  no: 'Non, je garde',
  skip: 'Passer',
  next: 'Suite',
  close: 'Fermer',
  back: 'Retour',
  resume: 'Reprendre',
  pause: 'Pause',
  titleScreen: 'Écran titre',
  hubReturn: 'Retour au camp',
  details: 'Détails',
  retry: 'Réessayer',
  mute: 'Muet',
  unmute: 'Son',
  music: 'Musique',
  sfx: 'Effets',
  quality: "Qualité d'image",
  qualityAuto: 'Auto',
  qualityLow: 'Douce',
  qualityMid: 'Belle',
  qualityHigh: 'Splendide',
  motion: 'Réduire les animations',
  textSpeed: 'Vitesse du texte',
  speedSlow: 'Lente',
  speedNormal: 'Normale',
  speedFast: 'Rapide',
  subtitles: 'Sous-titres',
  fps: 'Fluidité',
  portraitTitle: 'Tourne ton appareil',
  portraitBody: 'Capy a le vertige en portrait. Joue en paysage.',
  webgl: "Oh non, l'image 3D n'a pas pu démarrer sur cet appareil.",
  relics: 'Reliques',
  actionEnter: 'Entrer',
  actionEvolve: 'Évoluer',
  actionSoon: 'Bientôt',
  actionNeed: 'Il manque des reliques',
  oups: 'Oups !',
  glandsGot: 'Gland doré',
  babyGot: 'Un petit Capy',
  glideOn: 'La plume te porte. Garde le saut en l’air.',
  featherGot: 'Plume sacrée',
  starGot: 'Étoile farceuse',
  bravo: 'Bravo !',
  already: 'Déjà dans le totem',
  resetCrates: 'Remettre les caisses',
  paradeScore: 'Dindons',
  paradeTime: 'Temps',
  youLose: 'Presque !',
  keys: 'Flèches ou A D pour courir, Espace pour sauter, E pour agir, Échap pour la pause.',
} as const;

export const PLACES = {
  camp: 'Camp des Nuages',
  glands: 'La Cueillette des glands',
  pantry: 'Le Garde-manger enchanté',
  ruee: 'La Ruée des Citrouilles',
  parade: 'La Parade des dindons',
  evolve: 'Éveil',
} as const;

export const HELP = {
  glands: 'Ramasse les glands, trouve les petits Capy, puis entre dans le portail.',
  glandsMore:
    "Sur l'Archipel des Nuages, un appui bref fait un petit bond et un appui long va plus haut. Les glands se laissent approcher. Une citrouille peut te bousculer, jamais te faire tomber pour de bon : tu reviens à la dernière lanterne. Un champignon t'envoie vers les hauteurs. Un petit Capy se cache à gauche du départ.",
  pantry: 'Pose une caisse sur chaque dalle. Lumi ouvre la trappe avec Action.',
  pantryMore:
    "Pousse les caisses par la gauche. Une caisse qui touche une dalle s'y accroche. L'étagère garde un petit Capy et quelques glands. Près de Lumi, Action ouvre la trappe. Ensuite la grille se lève, et la plume sacrée t'attend.",
  ruee: 'La horde roule vers la droite. Après la plume, garde le saut en l’air pour planer.',
  rueeMore:
    "Les citrouilles traversent les îles. Elles bousculent, elles n'arrêtent pas la course. Les lanternes sont rapprochées. La plume temporaire ralentit la chute tant que le saut reste enfoncé. Aucun bond ne demande d'être au pixel près.",
  parade: 'Touche les dindons. Évite les citrouilles piégées. Objectif : 8.',
  paradeMore:
    'Les dindons surgissent des terriers. Touche-les, ou choisis un terrier avec les flèches puis valide. Une citrouille enlève un point. Huit dindons avant la fin du sablier, et l’étoile farceuse est à toi.',
} as const;

export const INTRO = [
  'Sur un archipel d’îles qui flottent entre les nuages, un jeune capybara nommé Capy ronfle encore.',
  'Une plume d’or traverse le ciel et se pose devant lui. Elle brille comme une promesse.',
  'La légende dit vrai : qui réunit trois reliques peut s’éveiller en CapyDindon, mi-capybara, mi-dindon, entièrement majestueux.',
  'Le gland doré, la plume sacrée et l’étoile farceuse t’attendent. Debout, Capy.',
] as const;

export const EVOLVE = {
  kicker: 'Premier éveil',
  title: 'Capyplume',
  body: 'Les trois reliques s’embrasent. Capy grandit d’un souffle, et une queue de plumes s’ouvre derrière lui comme un éventail doré.',
  tease: 'Plus tard viendra le Dindo-Capy. Puis, un jour, le légendaire CapyDindon.',
  button: 'Retour au camp',
} as const;

export const VICTORY = {
  glands: 'Le gland doré rejoint le totem. Capy a les joues toutes rondes.',
  pantry: 'La plume sacrée se love contre le totem. L’air sent le pain chaud.',
  parade: 'L’étoile farceuse éclate de rire et file se poser sur le totem.',
  ruee: 'La horde est passée. Les petits Capy sortent de derrière les îles.',
} as const;

export const CUPS = {
  none: '',
  bronze: 'Coupe de bronze',
  silver: 'Coupe d’argent',
  gold: 'Coupe d’or',
} as const;

export const LOSE = {
  parade: 'Les dindons sont partis faire la sieste. On réessaie ?',
} as const;
