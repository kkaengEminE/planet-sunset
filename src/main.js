import './style.css';
import { SceneManager } from './scene/SceneManager.js';
import { PlanetSunsetScene } from './weather/PlanetSunsetScene.js';

class App {
  constructor() {
    this.sceneManager = null;
    this.planetScene = null;

    // Auto-play state
    this._progress = 0;        // 0 → 1 over duration
    this._playing = true;
    this._baseDuration = 10;   // base seconds
    this._duration = 10;       // effective seconds (base / speed)
    this._startTime = 0;
    this._brightness = 0.5;    // 0 → 1 (slider maps 0–100 to 0–1)
    this._lang = 'ko';

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

    // Register planet scene only
    const { scene, camera } = this.sceneManager;
    this.planetScene = new PlanetSunsetScene(scene, camera);
    this.sceneManager.registerScene('planet', this.planetScene);
    this.sceneManager.switchScene('planet');

    // Pass brightness to scene
    this.planetScene._brightness = this._brightness;

    // Controls
    this._initControls();

    // Show click hint after 2s
    setTimeout(() => {
      const hint = document.getElementById('planet-click-hint');
      if (hint) hint.classList.add('visible');
    }, 2000);

    // Start animation
    this._startTime = performance.now();
    this._animate();

    // Hide loader
    setTimeout(() => this._hideLoader(), 600);
  }

  _initControls() {
    // Replay button
    const replayBtn = document.getElementById('replay-btn');
    if (replayBtn) {
      replayBtn.addEventListener('click', () => this._replay());
    }

    // Brightness slider
    const brightnessSlider = document.getElementById('brightness-slider');
    if (brightnessSlider) {
      brightnessSlider.addEventListener('input', (e) => {
        this._brightness = parseInt(e.target.value, 10) / 100;
        if (this.planetScene) {
          this.planetScene._brightness = this._brightness;
        }
        this.sceneManager.renderer.toneMappingExposure = 0.4 + this._brightness * 1.2;
      });
      this.sceneManager.renderer.toneMappingExposure = 0.4 + this._brightness * 1.2;
    }

    // Text speed slider — controls transition duration of text lines
    const textSpeedSlider = document.getElementById('text-speed-slider');
    if (textSpeedSlider) {
      textSpeedSlider.addEventListener('input', (e) => {
        const mult = parseInt(e.target.value, 10) / 100; // 0.2 ~ 2.0
        const dur = 0.8 / mult;
        document.querySelectorAll('.planet-text-line').forEach(el => {
          el.style.transitionDuration = dur + 's';
        });
      });
    }

    // Font size slider — controls --font-scale CSS variable
    const fontSizeSlider = document.getElementById('font-size-slider');
    if (fontSizeSlider) {
      fontSizeSlider.addEventListener('input', (e) => {
        const scale = parseInt(e.target.value, 10) / 100; // 0.5 ~ 1.5
        document.documentElement.style.setProperty('--font-scale', scale);
      });
    }

    // Sunset speed slider — controls animation duration
    const sunsetSpeedSlider = document.getElementById('sunset-speed-slider');
    if (sunsetSpeedSlider) {
      sunsetSpeedSlider.addEventListener('input', (e) => {
        const mult = parseInt(e.target.value, 10) / 100; // 0.2 ~ 2.0
        const newDuration = this._baseDuration / mult;
        // Preserve current progress position
        if (this._playing) {
          const currentProgress = this._progress;
          this._duration = newDuration;
          this._startTime = performance.now() - (currentProgress * newDuration * 1000);
        } else {
          this._duration = newDuration;
        }
      });
    }

    // Language toggle button
    const langBtn = document.getElementById('lang-btn');
    if (langBtn) {
      langBtn.addEventListener('click', () => this._toggleLang());
    }
  }

  _toggleLang() {
    this._lang = this._lang === 'ko' ? 'en' : 'ko';
    document.querySelectorAll('.planet-quote').forEach(el => {
      if (el.dataset[this._lang]) {
        el.textContent = el.dataset[this._lang];
      }
    });
    document.querySelectorAll('.planet-caption').forEach(el => {
      if (el.dataset[this._lang]) {
        el.textContent = el.dataset[this._lang];
      }
    });
    const langBtn = document.getElementById('lang-btn');
    if (langBtn) {
      langBtn.textContent = this._lang === 'ko' ? 'EN' : 'KO';
    }
  }

  _replay() {
    this._startTime = performance.now();
    this._progress = 0;
    this._playing = true;

    // Reset text to first step
    const lines = document.querySelectorAll('.planet-text-line');
    lines.forEach(line => {
      line.classList.toggle('active', line.dataset.step === '0');
    });
  }

  _animate() {
    requestAnimationFrame(() => this._animate());

    // Update progress (0 → 1 over _duration seconds)
    if (this._playing) {
      const elapsed = (performance.now() - this._startTime) / 1000;
      this._progress = Math.min(1, elapsed / this._duration);
      if (this._progress >= 1) {
        this._playing = false;
      }
    }

    // Feed progress into scene manager
    this.sceneManager.update({ sectionProgress: this._progress });
  }
}

new App();
