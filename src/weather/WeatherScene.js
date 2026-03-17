import * as THREE from 'three';

export class WeatherScene {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.group = new THREE.Group();
    this.isActive = false;
    this.bloomStrength = 0;
    this.backgroundColor = null;
    this.fogConfig = null;
  }

  init() { }

  activate() {
    this.isActive = true;
    this.scene.add(this.group);
  }

  deactivate() {
    this.isActive = false;
    this.scene.remove(this.group);
  }

  update(scrollProgress, delta, elapsed) { }

  dispose() {
    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}
