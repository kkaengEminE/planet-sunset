import * as THREE from 'three';
import { WeatherScene } from './WeatherScene.js';
import { lerp, smoothstep } from '../utils/math.js';

export class PlanetSunsetScene extends WeatherScene {
  constructor(scene, camera) {
    super(scene, camera);
    this.backgroundColor = new THREE.Color(0x0a0515);
    this.planet = null;
    this.atmosphere = null;
    this.sun = null;
    this.sunGlow = null;
    this.sunHalo = null;
    this.sunLight = null;
    this.skyDome = null;
    this.stars = null;
    this.horizonGlow = null;
    this.surfaceDetails = [];
    this.dustRing = null;
  }

  init() {
    // Dim ambient
    const ambient = new THREE.AmbientLight(0x332244, 0.2);
    this.group.add(ambient);

    // Sun light
    this.sunLight = new THREE.PointLight(0xff8833, 0, 150);
    this.sunLight.position.set(15, 5, -30);
    this.group.add(this.sunLight);

    this._createSkyDome();
    this._createStars();
    this._createSun();
    this._createPlanet();
    this._createAtmosphere();
    this._createHorizonGlow();
    this._createSurfaceDetails();
    this._createDustRing();
  }

  _createSkyDome() {
    const geo = new THREE.SphereGeometry(180, 32, 32);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uSunsetProgress: { value: 0 },
        uSunDir: { value: new THREE.Vector3(0.5, 0.2, -1).normalize() },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uSunsetProgress;
        uniform vec3 uSunDir;
        varying vec3 vWorldPos;

        void main() {
          vec3 dir = normalize(vWorldPos);
          float height = dir.y;

          // Space gradient
          vec3 spaceDeep = vec3(0.01, 0.005, 0.04);
          vec3 spaceMid = vec3(0.05, 0.02, 0.1);

          vec3 color = mix(spaceMid, spaceDeep, smoothstep(0.0, 0.6, height));

          // Sunset glow near horizon
          float sunProximity = max(0.0, dot(dir, uSunDir));
          float horizonGlow = exp(-abs(height) * 5.0) * pow(sunProximity, 2.0);
          vec3 glowColor = mix(vec3(1.0, 0.5, 0.1), vec3(0.8, 0.15, 0.05), uSunsetProgress);
          color += glowColor * horizonGlow * (1.0 - uSunsetProgress * 0.5);

          // Scattered light in atmosphere
          float scatter = pow(sunProximity, 8.0) * (1.0 - abs(height));
          color += vec3(1.0, 0.6, 0.2) * scatter * 0.15;

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });

    this.skyDome = new THREE.Mesh(geo, mat);
    this.group.add(this.skyDome);
  }

  _createStars() {
    const count = 2000;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Distribute on sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 150;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      sizes[i] = 0.3 + Math.random() * 1.0;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0.5 },
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        uniform float uTime;
        varying float vTwinkle;
        void main() {
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (80.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
          // Twinkle
          vTwinkle = 0.6 + 0.4 * sin(uTime * 2.0 + position.x * 10.0 + position.y * 7.0);
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        varying float vTwinkle;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float alpha = (1.0 - d * 2.0) * uOpacity * vTwinkle;
          gl_FragColor = vec4(1.0, 0.97, 0.9, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
    });

    this.stars = new THREE.Points(geo, mat);
    this.group.add(this.stars);
  }

  _createSun() {
    // Sun core
    const sunGeo = new THREE.SphereGeometry(2.5, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffcc44 });
    this.sun = new THREE.Mesh(sunGeo, sunMat);
    this.sun.position.set(15, 5, -40);
    this.group.add(this.sun);

    // Glow
    const glowGeo = new THREE.SphereGeometry(4, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xff8833,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide,
    });
    this.sunGlow = new THREE.Mesh(glowGeo, glowMat);
    this.sunGlow.position.copy(this.sun.position);
    this.group.add(this.sunGlow);

    // Large halo
    const haloGeo = new THREE.SphereGeometry(7, 32, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xff5500,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
    });
    this.sunHalo = new THREE.Mesh(haloGeo, haloMat);
    this.sunHalo.position.copy(this.sun.position);
    this.group.add(this.sunHalo);
  }

  _createPlanet() {
    // Main planet sphere
    const geo = new THREE.SphereGeometry(5, 64, 64);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uSunDir: { value: new THREE.Vector3(0.5, 0.2, -1).normalize() },
        uSunsetProgress: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying vec2 vUv;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uSunDir;
        uniform float uSunsetProgress;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying vec2 vUv;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
                     mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
        }

        void main() {
          float NdotL = max(0.0, dot(vNormal, uSunDir));

          // Planet surface texture (procedural)
          float n = noise(vUv * 20.0) * 0.5 + noise(vUv * 40.0) * 0.25;

          // Base colors
          vec3 groundDark = vec3(0.15, 0.12, 0.08);
          vec3 groundLight = vec3(0.35, 0.28, 0.18);
          vec3 groundColor = mix(groundDark, groundLight, n);

          // Grass-like patches
          float grass = smoothstep(0.4, 0.6, n);
          vec3 grassColor = vec3(0.12, 0.2, 0.08);
          groundColor = mix(groundColor, grassColor, grass * 0.4);

          // Lighting
          vec3 lit = groundColor * (NdotL * 0.8 + 0.15);

          // Sunset warmth on lit side
          lit += vec3(0.3, 0.12, 0.02) * NdotL * (1.0 - uSunsetProgress * 0.5);

          // Terminator glow (where light meets shadow)
          float terminator = smoothstep(0.0, 0.15, NdotL) * (1.0 - smoothstep(0.15, 0.3, NdotL));
          lit += vec3(0.5, 0.15, 0.02) * terminator;

          gl_FragColor = vec4(lit, 1.0);
        }
      `,
    });

    this.planet = new THREE.Mesh(geo, mat);
    this.planet.position.set(0, -3, -5);
    this.group.add(this.planet);
  }

  _createAtmosphere() {
    // Thin atmosphere ring around the planet
    const geo = new THREE.SphereGeometry(5.3, 64, 64);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uSunDir: { value: new THREE.Vector3(0.5, 0.2, -1).normalize() },
        uOpacity: { value: 0.5 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vViewDir = normalize(-mvPos.xyz);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uSunDir;
        uniform float uOpacity;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          // Fresnel — atmosphere visible at edges
          float fresnel = 1.0 - max(0.0, dot(vViewDir, vNormal));
          fresnel = pow(fresnel, 3.0);

          // Atmosphere color — orange-red on sun side
          float sunFacing = max(0.0, dot(vNormal, uSunDir));
          vec3 atmoColor = mix(
            vec3(0.1, 0.15, 0.3),   // shadow side (blue tint)
            vec3(1.0, 0.4, 0.1),    // sun side (orange)
            sunFacing
          );

          float alpha = fresnel * uOpacity * (0.3 + sunFacing * 0.7);
          gl_FragColor = vec4(atmoColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
    });

    this.atmosphere = new THREE.Mesh(geo, mat);
    this.atmosphere.position.copy(this.planet.position);
    this.group.add(this.atmosphere);
  }

  _createHorizonGlow() {
    // A ring of light around the planet's edge where the sun sets behind it
    const geo = new THREE.RingGeometry(4.8, 7, 64);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        varying vec2 vUv;
        void main() {
          // Radial gradient from inner to outer
          float r = vUv.y; // 0 at inner, 1 at outer
          float glow = exp(-r * 3.0);
          vec3 color = mix(vec3(1.0, 0.6, 0.1), vec3(0.8, 0.15, 0.05), r);
          float alpha = glow * uOpacity;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    this.horizonGlow = new THREE.Mesh(geo, mat);
    this.horizonGlow.position.copy(this.planet.position);
    this.horizonGlow.position.z -= 0.5;
    this.group.add(this.horizonGlow);
  }

  _createSurfaceDetails() {
    // Small trees/objects on the planet surface to give scale
    const treeGeo = new THREE.ConeGeometry(0.15, 0.5, 6);
    const treeMat = new THREE.MeshBasicMaterial({ color: 0x1a3310 });

    for (let i = 0; i < 12; i++) {
      // Place on upper hemisphere of planet
      const theta = (Math.random() - 0.5) * Math.PI * 0.6;
      const phi = Math.random() * Math.PI * 2;
      const r = 5.05;

      const x = r * Math.cos(theta) * Math.cos(phi);
      const y = r * Math.sin(theta);
      const z = r * Math.cos(theta) * Math.sin(phi);

      const tree = new THREE.Mesh(treeGeo, treeMat.clone());
      tree.position.set(
        x + this.planet.position.x,
        y + this.planet.position.y,
        z + this.planet.position.z
      );
      // Point away from planet center
      tree.lookAt(this.planet.position);
      tree.rotateX(Math.PI);

      tree.scale.setScalar(0.6 + Math.random() * 0.8);
      this.surfaceDetails.push(tree);
      this.group.add(tree);
    }
  }

  _createDustRing() {
    // Subtle particle ring around the planet
    const count = 500;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 6 + Math.random() * 3;
      const height = (Math.random() - 0.5) * 0.3;
      positions[i * 3] = Math.cos(angle) * r + this.planet.position.x;
      positions[i * 3 + 1] = height + this.planet.position.y;
      positions[i * 3 + 2] = Math.sin(angle) * r + this.planet.position.z;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xffaa66,
      size: 0.05,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.dustRing = new THREE.Points(geo, mat);
    this.group.add(this.dustRing);
  }

  update(progress, delta, elapsed) {
    const sunsetProgress = smoothstep(0.0, 0.85, progress);

    // Sun moves behind the planet
    const sunAngle = lerp(0.3, -0.5, sunsetProgress);
    const sunDist = 40;
    const sunX = Math.cos(sunAngle) * sunDist * 0.4;
    const sunY = Math.sin(sunAngle) * sunDist * 0.3 + 2;
    const sunZ = -sunDist;

    this.sun.position.set(sunX, sunY, sunZ);
    this.sunGlow.position.copy(this.sun.position);
    this.sunHalo.position.copy(this.sun.position);
    this.sunLight.position.copy(this.sun.position);

    // Sun direction for shaders
    const sunDir = new THREE.Vector3()
      .subVectors(this.sun.position, this.planet.position)
      .normalize();

    this.skyDome.material.uniforms.uSunDir.value.copy(sunDir);
    this.skyDome.material.uniforms.uSunsetProgress.value = sunsetProgress;
    this.planet.material.uniforms.uSunDir.value.copy(sunDir);
    this.planet.material.uniforms.uSunsetProgress.value = sunsetProgress;
    this.atmosphere.material.uniforms.uSunDir.value.copy(sunDir);

    // Sun color deepens
    const r = lerp(1.0, 0.85, sunsetProgress);
    const g = lerp(0.8, 0.2, sunsetProgress);
    const b = lerp(0.27, 0.05, sunsetProgress);
    this.sun.material.color.setRGB(r, g, b);

    // Sun light
    this.sunLight.intensity = lerp(3, 0.8, sunsetProgress);

    // Stars become more visible
    this.stars.material.uniforms.uOpacity.value = lerp(0.2, 0.8, sunsetProgress);
    this.stars.material.uniforms.uTime.value = elapsed;

    // Horizon glow — peaks when sun is right behind planet edge
    const glowPeak = smoothstep(0.3, 0.5, sunsetProgress) * (1 - smoothstep(0.8, 1.0, sunsetProgress) * 0.5);
    this.horizonGlow.material.uniforms.uOpacity.value = glowPeak * 0.6;

    // Atmosphere opacity
    this.atmosphere.material.uniforms.uOpacity.value = lerp(0.3, 0.7, glowPeak);

    // Planet slow rotation
    this.planet.rotation.y = elapsed * 0.02;

    // Surface details follow planet rotation
    // (They're world-space, so they don't rotate with planet. This is fine for visual effect.)

    // Dust ring
    this.dustRing.rotation.y = elapsed * 0.05;
    this.dustRing.rotation.x = 0.3;
    this.dustRing.material.opacity = lerp(0, 0.15, smoothstep(0.2, 0.5, progress));

    // Background
    this.backgroundColor.setRGB(
      lerp(0.04, 0.01, sunsetProgress),
      lerp(0.02, 0.005, sunsetProgress),
      lerp(0.08, 0.03, sunsetProgress)
    );

    // Camera orbit
    const camProgress = smoothstep(0.0, 1.0, progress);
    const camAngle = lerp(0, 0.3, camProgress);
    this.camera.position.set(
      Math.sin(camAngle) * 14,
      lerp(4, 2.5, camProgress),
      Math.cos(camAngle) * 14
    );
    this.camera.lookAt(
      this.planet.position.x,
      this.planet.position.y + lerp(1, 0, camProgress),
      this.planet.position.z
    );

    // Bloom
    this.bloomStrength = lerp(0.8, 1.8, glowPeak);

    this.fogConfig = null; // Space has no fog
  }

  deactivate() {
    super.deactivate();
    this.camera.position.set(0, 3, 12);
    this.camera.lookAt(0, 2, 0);
  }
}
