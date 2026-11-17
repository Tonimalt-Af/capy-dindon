import '@fontsource/fredoka/latin-700.css';
import '@fontsource/nunito/latin-600.css';
import '@fontsource/nunito/latin-800.css';
import './styles.css';
import { Game } from './game/Game';

const canvas = document.querySelector('#view');
if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Canvas manquant');

try {
  new Game(canvas);
  const params = new URLSearchParams(location.search);
  if (import.meta.env.PROD && !params.has('nosw')) {
    void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));
  }
} catch (error) {
  const hud = document.querySelector('#hud');
  if (hud) hud.innerHTML = `<div class="story-card panel"><h1>CapyDindon</h1><p>${error instanceof Error ? 'Oh non, l’image 3D n’a pas pu démarrer sur cet appareil.' : ''}</p></div>`;
  console.error(error);
}
