import * as THREE from 'three';
import { WeatherScene } from './WeatherScene.js';
import { lerp, smoothstep, clamp } from '../utils/math.js';

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
    this.backGlow = null;
    this.figure = null;
    this.flowers = [];
    this.grassBlades = [];

    // Mouse orbit state
    this._mouseX = 0;
    this._mouseY = 0;
    this._targetOrbitX = 0;
    this._targetOrbitY = 0;
    this._orbitX = 0;   // horizontal angle
    this._orbitY = 0.2;  // vertical angle (start slightly above)
    this._isDragging = false;
    this._lastMouseX = 0;
    this._lastMouseY = 0;

    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);
  }

  init() {
    const ambient = new THREE.AmbientLight(0x221133, 0.15);
    this.group.add(ambient);

    this.sunLight = new THREE.PointLight(0xffaa44, 0, 120);
    this.sunLight.position.set(0, -8, -20);
    this.group.add(this.sunLight);

    this._createSkyDome();
    this._createStars();
    this._createSun();
    this._createPlanet();
    this._createAtmosphere();
    this._createBackGlow();
    this._createFigure();
    this._createFlowers();
    this._createGrassBlades();
  }

  activate() {
    super.activate();
    // Reset orbit
    this._orbitX = 0;
    this._orbitY = 0.2;
    this._targetOrbitX = 0;
    this._targetOrbitY = 0.2;

    // Add mouse/touch listeners
    const canvas = document.getElementById('webgl');
    canvas.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mouseup', this._onMouseUp);
    canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
    window.addEventListener('touchmove', this._onTouchMove, { passive: false });
    window.addEventListener('touchend', this._onTouchEnd);
  }

  deactivate() {
    super.deactivate();
    const canvas = document.getElementById('webgl');
    canvas.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mouseup', this._onMouseUp);
    canvas.removeEventListener('touchstart', this._onTouchStart);
    window.removeEventListener('touchmove', this._onTouchMove);
    window.removeEventListener('touchend', this._onTouchEnd);

    this.camera.position.set(0, 3, 12);
    this.camera.lookAt(0, 2, 0);
  }

  // --- Mouse / Touch handlers ---
  _onMouseDown(e) {
    this._isDragging = true;
    this._lastMouseX = e.clientX;
    this._lastMouseY = e.clientY;
  }
  _onMouseMove(e) {
    if (!this._isDragging) return;
    const dx = e.clientX - this._lastMouseX;
    const dy = e.clientY - this._lastMouseY;
    this._lastMouseX = e.clientX;
    this._lastMouseY = e.clientY;
    this._targetOrbitX += dx * 0.005;
    this._targetOrbitY += dy * 0.003;
    this._targetOrbitY = clamp(this._targetOrbitY, -0.8, 1.0);
  }
  _onMouseUp() {
    this._isDragging = false;
  }
  _onTouchStart(e) {
    if (e.touches.length === 1) {
      e.preventDefault();
      this._isDragging = true;
      this._lastMouseX = e.touches[0].clientX;
      this._lastMouseY = e.touches[0].clientY;
    }
  }
  _onTouchMove(e) {
    if (!this._isDragging || e.touches.length !== 1) return;
    e.preventDefault();
    const dx = e.touches[0].clientX - this._lastMouseX;
    const dy = e.touches[0].clientY - this._lastMouseY;
    this._lastMouseX = e.touches[0].clientX;
    this._lastMouseY = e.touches[0].clientY;
    this._targetOrbitX += dx * 0.005;
    this._targetOrbitY += dy * 0.003;
    this._targetOrbitY = clamp(this._targetOrbitY, -0.8, 1.0);
  }
  _onTouchEnd() {
    this._isDragging = false;
  }

  // === SKY ===
  _createSkyDome() {
    const geo = new THREE.SphereGeometry(180, 64, 64);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uSunsetProgress: { value: 0 },
        uSunY: { value: -0.3 },
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
        uniform float uSunY;
        varying vec3 vWorldPos;

        void main() {
          vec3 dir = normalize(vWorldPos);
          float height = dir.y;

          vec3 deepSpace = vec3(0.02, 0.01, 0.06);
          vec3 midSky = vec3(0.05, 0.03, 0.15);
          vec3 lowSky = vec3(0.15, 0.05, 0.12);
          vec3 horizonWarm = vec3(0.95, 0.55, 0.1);
          vec3 horizonHot = vec3(1.0, 0.35, 0.05);

          vec3 color;
          if (height > 0.4) {
            color = mix(midSky, deepSpace, smoothstep(0.4, 0.9, height));
          } else if (height > 0.0) {
            color = mix(lowSky, midSky, smoothstep(0.0, 0.4, height));
          } else if (height > -0.2) {
            color = mix(horizonWarm, lowSky, smoothstep(-0.2, 0.0, height));
          } else {
            color = mix(horizonHot, horizonWarm, smoothstep(-0.5, -0.2, height));
          }

          float sunDist = length(vec2(dir.x, dir.y - uSunY));
          float sunGlow = exp(-sunDist * sunDist * 3.0) * 0.6;
          vec3 sunColor = mix(vec3(1.0, 0.7, 0.2), vec3(1.0, 0.3, 0.05), uSunsetProgress);
          color += sunColor * sunGlow * (1.0 - uSunsetProgress * 0.3);

          color = mix(color, color * 0.5 + deepSpace * 0.5, uSunsetProgress * 0.4);

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });

    this.skyDome = new THREE.Mesh(geo, mat);
    this.group.add(this.skyDome);
  }

  // === STARS ===
  _createStars() {
    const count = 3000;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 150;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      sizes[i] = 0.2 + Math.random() * 1.2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0.3 },
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        uniform float uTime;
        varying float vTwinkle;
        varying float vHeight;
        void main() {
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (80.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
          vTwinkle = 0.5 + 0.5 * sin(uTime * 1.5 + position.x * 12.0 + position.y * 8.0);
          vHeight = normalize(position).y;
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        varying float vTwinkle;
        varying float vHeight;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float heightFade = smoothstep(-0.1, 0.3, vHeight);
          float alpha = (1.0 - d * 2.0) * uOpacity * vTwinkle * heightFade;
          gl_FragColor = vec4(1.0, 0.95, 0.85, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
    });

    this.stars = new THREE.Points(geo, mat);
    this.group.add(this.stars);
  }

  // === SUN: behind/below planet, large round disc ===
  _createSun() {
    const sunGeo = new THREE.SphereGeometry(4, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd55 });
    this.sun = new THREE.Mesh(sunGeo, sunMat);
    this.sun.position.set(0, -10, -18);
    this.group.add(this.sun);

    const glowGeo = new THREE.SphereGeometry(6, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffaa33,
      transparent: true,
      opacity: 0.35,
      side: THREE.BackSide,
    });
    this.sunGlow = new THREE.Mesh(glowGeo, glowMat);
    this.sunGlow.position.copy(this.sun.position);
    this.group.add(this.sunGlow);

    const haloGeo = new THREE.SphereGeometry(12, 32, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.06,
      side: THREE.BackSide,
    });
    this.sunHalo = new THREE.Mesh(haloGeo, haloMat);
    this.sunHalo.position.copy(this.sun.position);
    this.group.add(this.sunHalo);
  }

  // === PLANET: closer to camera ===
  _createPlanet() {
    const geo = new THREE.SphereGeometry(4, 64, 64);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uSunDir: { value: new THREE.Vector3(0, -1, -0.5).normalize() },
        uSunsetProgress: { value: 0 },
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying vec2 vUv;
        varying vec3 vLocalPos;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          vUv = uv;
          vLocalPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uSunDir;
        uniform float uSunsetProgress;
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying vec2 vUv;
        varying vec3 vLocalPos;

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
          float NdotL = dot(vNormal, uSunDir);

          float n1 = noise(vUv * 25.0);
          float n2 = noise(vUv * 50.0);
          float n = n1 * 0.6 + n2 * 0.4;

          vec3 soil = vec3(0.25, 0.18, 0.1);
          vec3 grass = vec3(0.15, 0.28, 0.08);
          vec3 dryGrass = vec3(0.3, 0.25, 0.1);

          float grassMix = smoothstep(0.35, 0.55, n);
          vec3 surfaceColor = mix(soil, grass, grassMix);
          surfaceColor = mix(surfaceColor, dryGrass, smoothstep(0.6, 0.8, n) * 0.5);

          float wrap = 0.3;
          float diffuse = max(0.0, (NdotL + wrap) / (1.0 + wrap));

          vec3 lit = surfaceColor * (diffuse * 0.7 + 0.2);

          float rim = smoothstep(0.0, 0.25, NdotL) * (1.0 - smoothstep(0.25, 0.5, NdotL));
          lit += vec3(0.6, 0.2, 0.03) * rim * 1.5;

          lit += vec3(0.25, 0.08, 0.01) * max(0.0, NdotL) * (1.0 - uSunsetProgress * 0.6);

          float shadow = 1.0 - smoothstep(-0.1, 0.2, NdotL);
          lit = mix(lit, vec3(0.03, 0.02, 0.06), shadow * 0.7);

          gl_FragColor = vec4(lit, 1.0);
        }
      `,
    });

    this.planet = new THREE.Mesh(geo, mat);
    // Moved forward: z=2 instead of 0, closer to camera
    this.planet.position.set(0, -1, 2);
    this.group.add(this.planet);
  }

  // === ATMOSPHERE ===
  _createAtmosphere() {
    const geo = new THREE.SphereGeometry(4.25, 64, 64);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uSunDir: { value: new THREE.Vector3(0, -1, -0.5).normalize() },
        uOpacity: { value: 0.5 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec3 vWorldNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
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
        varying vec3 vWorldNormal;
        void main() {
          float fresnel = 1.0 - max(0.0, dot(vViewDir, vNormal));
          fresnel = pow(fresnel, 2.5);

          float sunFacing = max(0.0, dot(vWorldNormal, uSunDir));

          vec3 sunAtmo = vec3(1.0, 0.55, 0.1);
          vec3 shadowAtmo = vec3(0.08, 0.1, 0.25);
          vec3 atmoColor = mix(shadowAtmo, sunAtmo, sunFacing);

          float bottomBoost = smoothstep(0.3, 1.0, sunFacing);
          float alpha = fresnel * uOpacity * (0.4 + bottomBoost * 0.8);

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

  // === BACK GLOW ===
  _createBackGlow() {
    const geo = new THREE.RingGeometry(3.5, 10, 64, 1, 0, Math.PI * 2);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0 },
        uSunsetProgress: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vAngle;
        void main() {
          vUv = uv;
          vec2 centered = position.xy;
          vAngle = atan(centered.y, centered.x);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        uniform float uSunsetProgress;
        varying vec2 vUv;
        varying float vAngle;
        void main() {
          float r = vUv.y;
          float bottomFocus = pow(max(0.0, -sin(vAngle)), 1.5);
          float sideFocus = (1.0 - abs(sin(vAngle))) * 0.3;
          float focus = bottomFocus + sideFocus;

          float glow = exp(-r * 2.5) * focus;
          vec3 innerColor = vec3(1.0, 0.75, 0.2);
          vec3 outerColor = vec3(1.0, 0.3, 0.02);
          vec3 color = mix(innerColor, outerColor, r);
          color = mix(color, vec3(0.8, 0.15, 0.02), uSunsetProgress * 0.5);

          float alpha = glow * uOpacity;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    this.backGlow = new THREE.Mesh(geo, mat);
    this.backGlow.position.set(
      this.planet.position.x,
      this.planet.position.y,
      this.planet.position.z - 0.5
    );
    this.group.add(this.backGlow);
  }

  // === FIGURE ===
  _createFigure() {
    const figureGroup = new THREE.Group();

    const silhouetteMat = new THREE.MeshBasicMaterial({ color: 0x0a0505 });

    const bodyGeo = new THREE.CapsuleGeometry(0.12, 0.35, 8, 8);
    const body = new THREE.Mesh(bodyGeo, silhouetteMat);
    body.position.y = 0.2;
    figureGroup.add(body);

    const headGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const head = new THREE.Mesh(headGeo, silhouetteMat);
    head.position.y = 0.55;
    figureGroup.add(head);

    const legGeo = new THREE.CapsuleGeometry(0.05, 0.25, 6, 6);
    const legL = new THREE.Mesh(legGeo, silhouetteMat);
    legL.position.set(-0.08, -0.1, 0.05);
    legL.rotation.z = 0.5;
    legL.rotation.x = -0.3;
    figureGroup.add(legL);

    const legR = new THREE.Mesh(legGeo, silhouetteMat);
    legR.position.set(0.08, -0.15, 0.08);
    legR.rotation.z = -0.3;
    legR.rotation.x = -0.5;
    figureGroup.add(legR);

    const planetR = 4;
    figureGroup.position.set(
      this.planet.position.x,
      this.planet.position.y + planetR + 0.05,
      this.planet.position.z
    );

    this.figure = figureGroup;
    this.group.add(figureGroup);
  }

  // === FLOWERS ===
  _createFlowers() {
    const colors = [0xff4466, 0xffaa22, 0xff6699, 0xffdd44, 0xee5533];

    for (let i = 0; i < 15; i++) {
      const theta = (Math.random() - 0.3) * Math.PI * 0.7;
      const phi = Math.random() * Math.PI * 2;
      const r = 4.05;

      const x = r * Math.cos(theta) * Math.cos(phi);
      const y = r * Math.sin(theta);
      const z = r * Math.cos(theta) * Math.sin(phi);

      const flowerGroup = new THREE.Group();

      const stemGeo = new THREE.CylinderGeometry(0.01, 0.015, 0.2 + Math.random() * 0.15, 4);
      const stemMat = new THREE.MeshBasicMaterial({ color: 0x2a4a15 });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.y = 0.1;
      flowerGroup.add(stem);

      const petalGeo = new THREE.SphereGeometry(0.04 + Math.random() * 0.03, 8, 8);
      const petalMat = new THREE.MeshBasicMaterial({
        color: colors[i % colors.length],
      });
      const petal = new THREE.Mesh(petalGeo, petalMat);
      petal.position.y = 0.22 + Math.random() * 0.05;
      flowerGroup.add(petal);

      flowerGroup.position.set(
        x + this.planet.position.x,
        y + this.planet.position.y,
        z + this.planet.position.z
      );

      const outDir = new THREE.Vector3(x, y, z).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, outDir);
      flowerGroup.quaternion.copy(quat);

      flowerGroup.scale.setScalar(0.8 + Math.random() * 0.5);
      this.flowers.push(flowerGroup);
      this.group.add(flowerGroup);
    }
  }

  // === GRASS BLADES ===
  _createGrassBlades() {
    for (let i = 0; i < 40; i++) {
      const theta = (Math.random() - 0.2) * Math.PI * 0.8;
      const phi = Math.random() * Math.PI * 2;
      const r = 4.02;

      const x = r * Math.cos(theta) * Math.cos(phi);
      const y = r * Math.sin(theta);
      const z = r * Math.cos(theta) * Math.sin(phi);

      const bladeHeight = 0.08 + Math.random() * 0.12;
      const geo = new THREE.ConeGeometry(0.01, bladeHeight, 3);
      const shade = 0.15 + Math.random() * 0.15;
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(shade * 0.5, shade, shade * 0.3),
      });
      const blade = new THREE.Mesh(geo, mat);

      blade.position.set(
        x + this.planet.position.x,
        y + this.planet.position.y,
        z + this.planet.position.z
      );

      const outDir = new THREE.Vector3(x, y, z).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, outDir);
      blade.quaternion.copy(quat);

      this.grassBlades.push(blade);
      this.group.add(blade);
    }
  }

  // === UPDATE ===
  update(progress, delta, elapsed) {
    const sunsetProgress = smoothstep(0.0, 0.85, progress);

    // Smooth orbit interpolation
    this._orbitX += (this._targetOrbitX - this._orbitX) * Math.min(1, delta * 5);
    this._orbitY += (this._targetOrbitY - this._orbitY) * Math.min(1, delta * 5);

    // Sun descends behind/below planet
    const sunStartY = -4;
    const sunEndY = -14;
    const sunY = lerp(sunStartY, sunEndY, sunsetProgress);
    this.sun.position.set(0, sunY, -18);
    this.sunGlow.position.copy(this.sun.position);
    this.sunHalo.position.copy(this.sun.position);
    this.sunLight.position.copy(this.sun.position);

    // Sun direction for shaders
    const sunDir = new THREE.Vector3()
      .subVectors(this.sun.position, this.planet.position)
      .normalize();

    this.skyDome.material.uniforms.uSunY.value = sunDir.y * 0.5;
    this.skyDome.material.uniforms.uSunsetProgress.value = sunsetProgress;
    this.planet.material.uniforms.uSunDir.value.copy(sunDir);
    this.planet.material.uniforms.uSunsetProgress.value = sunsetProgress;
    this.planet.material.uniforms.uTime.value = elapsed;
    this.atmosphere.material.uniforms.uSunDir.value.copy(sunDir);

    // Sun color
    const r = lerp(1.0, 0.9, sunsetProgress);
    const g = lerp(0.85, 0.25, sunsetProgress);
    const b = lerp(0.35, 0.05, sunsetProgress);
    this.sun.material.color.setRGB(r, g, b);
    this.sunGlow.material.color.setRGB(r * 0.85, g * 0.7, b);

    const pulse = 1 + Math.sin(elapsed * 1.2) * 0.02;
    this.sun.scale.setScalar(pulse);

    this.sunLight.intensity = lerp(3.5, 0.5, sunsetProgress);
    this.sunLight.color.setRGB(r, g * 0.8, b);

    // Back glow
    const glowPhase = smoothstep(0.15, 0.4, sunsetProgress) *
                       (1.0 - smoothstep(0.7, 1.0, sunsetProgress) * 0.4);
    this.backGlow.material.uniforms.uOpacity.value = glowPhase * 0.8;
    this.backGlow.material.uniforms.uSunsetProgress.value = sunsetProgress;

    // Atmosphere
    this.atmosphere.material.uniforms.uOpacity.value = lerp(0.3, 0.8, glowPhase);

    // Stars
    this.stars.material.uniforms.uOpacity.value = lerp(0.15, 0.9, sunsetProgress);
    this.stars.material.uniforms.uTime.value = elapsed;

    // Figure sway
    if (this.figure) {
      this.figure.rotation.z = Math.sin(elapsed * 0.5) * 0.02;
    }

    // Flowers sway
    this.flowers.forEach((flower, i) => {
      const swayPhase = elapsed * 0.8 + i * 0.7;
      flower.children.forEach(child => {
        child.rotation.x = Math.sin(swayPhase) * 0.05;
      });
    });

    // Background
    this.backgroundColor.setRGB(
      lerp(0.06, 0.015, sunsetProgress),
      lerp(0.02, 0.005, sunsetProgress),
      lerp(0.1, 0.04, sunsetProgress)
    );

    // --- CAMERA: mouse orbit around planet ---
    const orbitRadius = lerp(10, 8, smoothstep(0, 1, progress));
    const cx = Math.sin(this._orbitX) * orbitRadius;
    const cy = this._orbitY * orbitRadius * 0.5 + lerp(2, 1, smoothstep(0, 1, progress));
    const cz = Math.cos(this._orbitX) * orbitRadius + this.planet.position.z;

    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(
      this.planet.position.x,
      this.planet.position.y + 0.5,
      this.planet.position.z
    );

    // Bloom
    this.bloomStrength = lerp(0.6, 2.5, glowPhase);

    this.fogConfig = null;
  }
}
