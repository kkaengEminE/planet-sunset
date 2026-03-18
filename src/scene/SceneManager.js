import * as THREE from 'three';
import { PostProcessing } from './PostProcessing.js';

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    this.weatherScenes = {};
    this.activeSceneName = null;

    this._initRenderer();
    this._initScene();
    this._initCamera();

    this.postProcessing = new PostProcessing(this.renderer, this.scene, this.camera);

    window.addEventListener('resize', () => this._onResize());
    this._onResize();
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0515);
    this.scene.fog = null;
  }

  _initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );
    this.camera.position.set(0, 3, 12);
    this.camera.lookAt(0, 2, 0);
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.postProcessing.resize(w, h);
  }

  registerScene(name, scene) {
    this.weatherScenes[name] = scene;
    scene.init();
  }

  switchScene(name) {
    if (name === this.activeSceneName) return;

    if (this.activeSceneName && this.weatherScenes[this.activeSceneName]) {
      this.weatherScenes[this.activeSceneName].deactivate();
    }

    this.activeSceneName = name;

    if (this.weatherScenes[name]) {
      this.weatherScenes[name].activate();
    }
  }

  update(scrollState) {
    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    const active = this.weatherScenes[this.activeSceneName];
    if (active && active.isActive) {
      active.update(scrollState.sectionProgress, delta, elapsed);

      if (active.bloomStrength !== undefined) {
        this.postProcessing.setBloom(active.bloomStrength);
      }
      if (active.backgroundColor) {
        this.scene.background.lerp(active.backgroundColor, delta * 3);
      }
      if (active.fogConfig) {
        if (!this.scene.fog) {
          this.scene.fog = new THREE.FogExp2(active.fogConfig.color, active.fogConfig.density);
        } else {
          this.scene.fog.color.set(active.fogConfig.color);
          this.scene.fog.density += (active.fogConfig.density - this.scene.fog.density) * delta * 3;
        }
      } else {
        if (this.scene.fog) {
          this.scene.fog.density += (0 - this.scene.fog.density) * delta * 3;
          if (this.scene.fog.density < 0.001) this.scene.fog = null;
        }
      }
    }

    this.postProcessing.render();
  }
}
