import './style.css';
import { SceneManager } from './scene/SceneManager.js';
import { ScrollController, scrollState } from './scroll/ScrollController.js';
import { Navigation } from './ui/Navigation.js';
import { OceanSunsetScene } from './weather/OceanSunsetScene.js';
import { PlanetSunsetScene } from './weather/PlanetSunsetScene.js';

class App {
  constructor() {
    this.sceneManager = null;
    this.scrollController = null;
    this.navigation = null;

    try {
      this._init();
    } catch (e) {
      console.error('App init error:', e);
      this._hideLoader();
    }
  }

  _hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.add('hidden');
  }

  _init() {
    const canvas = document.getElementById('webgl');
    if (!canvas) return;

    // Scene manager
    this.sceneManager = new SceneManager(canvas);

    // Register sunset scenes
    const { scene, camera } = this.sceneManager;
    this.sceneManager.registerScene('ocean', new OceanSunsetScene(scene, camera));
    this.sceneManager.registerScene('planet', new PlanetSunsetScene(scene, camera));

    // Start with ocean
    this.sceneManager.switchScene('ocean');

    // Navigation (created before ScrollController, which may fire callbacks immediately)
    this.navigation = new Navigation(null);

    // Scroll controller
    this.scrollController = new ScrollController((sceneName) => {
      this.sceneManager.switchScene(sceneName);
      if (this.navigation) this.navigation.setActive(sceneName);
    });

    // Wire navigation to scroll controller
    this.navigation.scrollController = this.scrollController;

    // Start render loop
    this._animate();

    // Hide loader
    setTimeout(() => this._hideLoader(), 800);
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    this.sceneManager.update(scrollState);
  }
}

new App();
