import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export class PostProcessing {
  constructor(renderer, scene, camera) {
    this.composer = new EffectComposer(renderer);

    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.0,   // strength (controlled dynamically)
      0.6,   // radius
      0.85   // threshold (higher = less bloom on dim areas)
    );
    this.composer.addPass(this.bloomPass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);

    this._targetBloom = 0;
  }

  setBloom(strength) {
    this._targetBloom = strength;
  }

  resize(w, h) {
    this.composer.setSize(w, h);
  }

  render() {
    this.bloomPass.strength += (this._targetBloom - this.bloomPass.strength) * 0.1;
    this.composer.render();
  }
}
