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
    this._init();
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

    // Scroll controller
    this.scrollController = new ScrollController((sceneName) => {
      this.sceneManager.switchScene(sceneName);
      this.navigation.setActive(sceneName);
    });

    // Navigation
    this.navigation = new Navigation(this.scrollController);

    // Start render loop
    this._animate();

    // Hide loader
    setTimeout(() => {
      const loader = document.getElementById('loader');
      if (loader) loader.classList.add('hidden');
    }, 800);
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    this.sceneManager.update(scrollState);
  }
}

new App();
