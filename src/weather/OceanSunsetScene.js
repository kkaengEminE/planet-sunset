import * as THREE from 'three';
import { WeatherScene } from './WeatherScene.js';
import { lerp, smoothstep } from '../utils/math.js';

export class OceanSunsetScene extends WeatherScene {
  constructor(scene, camera) {
    super(scene, camera);
    this.backgroundColor = new THREE.Color(0x1a0808);
    this.fogConfig = { color: 0xff6622, density: 0.008 };
    this.sun = null;
    this.sunGlow = null;
    this.sunHalo = null;
    this.ocean = null;
    this.sand = null;
    this.skyDome = null;
    this.sunLight = null;
    this.godRays = null;
    this.dustMotes = null;
    this.sunReflection = null;
  }

  init() {
    // Ambient light (warm)
    const ambient = new THREE.AmbientLight(0xff9966, 0.3);
    this.group.add(ambient);

    // Hemisphere light for sky coloring
    const hemi = new THREE.HemisphereLight(0xff8844, 0x220808, 0.4);
    this.group.add(hemi);

    // Sun directional light
    this.sunLight = new THREE.PointLight(0xff8833, 0, 100);
    this.sunLight.position.set(0, 5, -40);
    this.group.add(this.sunLight);

    this._createSkyGradient();
    this._createSun();
    this._createGodRays();
    this._createOcean();
    this._createSunReflection();
    this._createSand();
    this._createDustMotes();
  }

  _createSkyGradient() {
    // Large sky backdrop sphere
    const geo = new THREE.SphereGeometry(150, 32, 32);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uSunsetProgress: { value: 0 },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        varying vec2 vUv;
        void main() {
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uSunsetProgress;
        varying vec3 vWorldPos;
        varying vec2 vUv;

        vec3 sunsetTop = vec3(0.1, 0.0, 0.2);     // deep purple
        vec3 sunsetMid = vec3(0.8, 0.2, 0.1);      // deep orange-red
        vec3 sunsetHorizon = vec3(1.0, 0.6, 0.1);  // golden
        vec3 nightTop = vec3(0.02, 0.01, 0.06);
        vec3 nightMid = vec3(0.15, 0.03, 0.05);

        void main() {
          float height = normalize(vWorldPos).y;

          // Sunset gradient
          vec3 colorSunset;
          if (height > 0.3) {
            colorSunset = mix(sunsetMid, sunsetTop, smoothstep(0.3, 0.8, height));
          } else if (height > -0.05) {
            colorSunset = mix(sunsetHorizon, sunsetMid, smoothstep(-0.05, 0.3, height));
          } else {
            colorSunset = sunsetHorizon;
          }

          // Night gradient (deeper into sunset)
          vec3 colorNight;
          if (height > 0.3) {
            colorNight = mix(nightMid, nightTop, smoothstep(0.3, 0.8, height));
          } else {
            colorNight = nightMid;
          }

          vec3 color = mix(colorSunset, colorNight, uSunsetProgress * 0.6);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });

    this.skyDome = new THREE.Mesh(geo, mat);
    this.group.add(this.skyDome);
  }

  _createSun() {
    // Sun core
    const sunGeo = new THREE.SphereGeometry(3, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffcc44 });
    this.sun = new THREE.Mesh(sunGeo, sunMat);
    this.sun.position.set(0, 8, -50);
    this.group.add(this.sun);

    // Glow
    const glowGeo = new THREE.SphereGeometry(4.5, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xff8833,
      transparent: true,
      opacity: 0.35,
      side: THREE.BackSide,
    });
    this.sunGlow = new THREE.Mesh(glowGeo, glowMat);
    this.sunGlow.position.copy(this.sun.position);
    this.group.add(this.sunGlow);

    // Large outer halo
    const haloGeo = new THREE.SphereGeometry(8, 32, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xff6622,
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide,
    });
    this.sunHalo = new THREE.Mesh(haloGeo, haloMat);
    this.sunHalo.position.copy(this.sun.position);
    this.group.add(this.sunHalo);
  }

  _createGodRays() {
    this.godRays = new THREE.Group();
    const rayCount = 16;

    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2;
      const length = 20 + Math.random() * 15;
      const width = 1.2 + Math.random() * 2;

      const geo = new THREE.PlaneGeometry(width, length);
      geo.translate(0, length * 0.5, 0);

      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(0xffaa44) },
          uOpacity: { value: 0.06 },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uOpacity;
          varying vec2 vUv;
          void main() {
            float grad = 1.0 - vUv.y;
            float edge = 1.0 - abs(vUv.x - 0.5) * 2.0;
            float alpha = grad * grad * edge * uOpacity;
            gl_FragColor = vec4(uColor, alpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });

      const ray = new THREE.Mesh(geo, mat);
      ray.rotation.z = angle;
      this.godRays.add(ray);
    }

    this.godRays.position.copy(this.sun.position);
    this.group.add(this.godRays);
  }

  _createOcean() {
    const geo = new THREE.PlaneGeometry(200, 120, 128, 64);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSunPos: { value: new THREE.Vector3(0, 8, -50) },
        uSunsetProgress: { value: 0 },
      },
      vertexShader: `
        uniform float uTime;
        varying vec3 vWorldPos;
        varying vec2 vUv;
        varying float vWaveHeight;

        void main() {
          vUv = uv;
          vec3 pos = position;

          // Waves
          float wave1 = sin(pos.x * 0.3 + uTime * 0.8) * 0.25;
          float wave2 = sin(pos.x * 0.7 + pos.y * 0.3 + uTime * 1.2) * 0.12;
          float wave3 = sin(pos.x * 1.5 + uTime * 2.0) * 0.05;
          pos.z += wave1 + wave2 + wave3;
          vWaveHeight = wave1 + wave2 + wave3;

          vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uSunPos;
        uniform float uSunsetProgress;
        varying vec3 vWorldPos;
        varying vec2 vUv;
        varying float vWaveHeight;

        void main() {
          // Base ocean color shifts with sunset
          vec3 deepColor = mix(vec3(0.02, 0.05, 0.12), vec3(0.05, 0.02, 0.08), uSunsetProgress);
          vec3 surfaceColor = mix(vec3(0.08, 0.15, 0.25), vec3(0.1, 0.05, 0.1), uSunsetProgress);

          float depth = smoothstep(0.0, 1.0, vUv.y);
          vec3 waterColor = mix(surfaceColor, deepColor, depth);

          // Sun reflection path
          float sunDist = abs(vWorldPos.x - uSunPos.x) / (20.0 + vUv.y * 40.0);
          float reflection = exp(-sunDist * sunDist * 2.0) * (1.0 - vUv.y);
          vec3 reflectionColor = mix(vec3(1.0, 0.7, 0.2), vec3(1.0, 0.4, 0.1), uSunsetProgress);

          // Wave specular highlights
          float specular = pow(max(0.0, vWaveHeight * 2.0 + 0.5), 4.0) * reflection;

          vec3 finalColor = waterColor + reflectionColor * reflection * 0.6 + vec3(1.0, 0.9, 0.7) * specular * 0.3;

          // Distance fade to horizon color
          float horizonFade = smoothstep(0.6, 1.0, vUv.y);
          vec3 horizonColor = mix(vec3(0.6, 0.25, 0.08), vec3(0.3, 0.08, 0.05), uSunsetProgress);
          finalColor = mix(finalColor, horizonColor, horizonFade * 0.7);

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
    });

    this.ocean = new THREE.Mesh(geo, mat);
    this.ocean.rotation.x = -Math.PI / 2;
    this.ocean.position.set(0, -0.5, -60);
    this.group.add(this.ocean);
  }

  _createSunReflection() {
    // Bright strip on ocean surface for sun reflection
    const geo = new THREE.PlaneGeometry(4, 80, 1, 32);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.3 },
      },
      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 pos = position;
          // Shimmer
          pos.x += sin(pos.y * 0.5 + uTime * 2.0) * 0.5;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        varying vec2 vUv;
        void main() {
          float centerFade = 1.0 - abs(vUv.x - 0.5) * 2.0;
          float distFade = 1.0 - vUv.y;
          float alpha = centerFade * distFade * uOpacity;
          vec3 color = vec3(1.0, 0.8, 0.4);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.sunReflection = new THREE.Mesh(geo, mat);
    this.sunReflection.rotation.x = -Math.PI / 2 + 0.05;
    this.sunReflection.position.set(0, -0.3, -30);
    this.group.add(this.sunReflection);
  }

  _createSand() {
    const geo = new THREE.PlaneGeometry(200, 30, 64, 16);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uSunsetProgress: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
          vUv = uv;
          vec3 pos = position;
          // Subtle sand dune displacement
          pos.z += sin(pos.x * 0.3) * 0.15 + sin(pos.x * 0.8 + pos.y * 0.5) * 0.05;
          vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uSunsetProgress;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
          // Sand base color
          vec3 sandLight = vec3(0.85, 0.7, 0.45);
          vec3 sandDark = vec3(0.5, 0.35, 0.2);
          vec3 sandSunset = vec3(0.7, 0.4, 0.2);

          // Mix based on UV (near ocean vs near camera)
          vec3 sand = mix(sandLight, sandDark, vUv.y * 0.5);

          // Sunset warmth
          sand = mix(sand, sandSunset, uSunsetProgress * 0.5);

          // Wet sand near water
          float wetZone = smoothstep(0.85, 0.95, vUv.y);
          vec3 wetSand = sand * 0.5;
          sand = mix(sand, wetSand, wetZone);

          // Distance darken
          float dist = smoothstep(0.0, 1.0, vUv.y);
          sand *= mix(1.0, 0.6, dist);

          gl_FragColor = vec4(sand, 1.0);
        }
      `,
    });

    this.sand = new THREE.Mesh(geo, mat);
    this.sand.rotation.x = -Math.PI / 2;
    this.sand.position.set(0, -0.6, 5);
    this.group.add(this.sand);
  }

  _createDustMotes() {
    const count = 300;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = Math.random() * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30 - 10;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0 },
      },
      vertexShader: `
        varying float vAlpha;
        void main() {
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 2.0 * (100.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
          vAlpha = smoothstep(-30.0, -3.0, mvPos.z);
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float alpha = (1.0 - d * 2.0) * uOpacity * vAlpha;
          gl_FragColor = vec4(1.0, 0.85, 0.5, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.dustMotes = new THREE.Points(geo, mat);
    this.group.add(this.dustMotes);
  }

  update(progress, delta, elapsed) {
    const sunsetProgress = smoothstep(0.0, 0.8, progress);

    // Sun descends toward horizon
    const sunY = lerp(8, -1, sunsetProgress);
    this.sun.position.y = sunY;
    this.sunGlow.position.y = sunY;
    this.sunHalo.position.y = sunY;
    this.godRays.position.y = sunY;
    this.sunLight.position.y = sunY;

    // Sun color shifts from golden to deep red as it sets
    const r = lerp(1.0, 0.9, sunsetProgress);
    const g = lerp(0.8, 0.2, sunsetProgress);
    const b = lerp(0.27, 0.05, sunsetProgress);
    this.sun.material.color.setRGB(r, g, b);
    this.sunGlow.material.color.setRGB(r * 0.8, g * 0.6, b * 0.5);

    // Sun pulse
    const pulse = 1 + Math.sin(elapsed * 1.5) * 0.02;
    this.sun.scale.setScalar(pulse);

    // God rays
    this.godRays.rotation.z = elapsed * 0.01;
    this.godRays.children.forEach(ray => {
      const opacity = lerp(0.08, 0.03, sunsetProgress);
      ray.material.uniforms.uOpacity.value = opacity;
    });

    // Sun light
    this.sunLight.intensity = lerp(3, 0.5, sunsetProgress);
    const lightColor = new THREE.Color().setRGB(r, g * 0.8, b);
    this.sunLight.color.copy(lightColor);

    // Sky dome
    this.skyDome.material.uniforms.uSunsetProgress.value = sunsetProgress;

    // Ocean
    this.ocean.material.uniforms.uTime.value = elapsed;
    this.ocean.material.uniforms.uSunPos.value.y = sunY;
    this.ocean.material.uniforms.uSunsetProgress.value = sunsetProgress;

    // Sun reflection on water
    this.sunReflection.material.uniforms.uTime.value = elapsed;
    this.sunReflection.material.uniforms.uOpacity.value = lerp(0.4, 0.15, sunsetProgress);

    // Sand
    this.sand.material.uniforms.uSunsetProgress.value = sunsetProgress;

    // Dust motes drift
    if (this.dustMotes) {
      const pos = this.dustMotes.geometry.attributes.position.array;
      for (let i = 0; i < pos.length; i += 3) {
        pos[i + 1] += delta * 0.15;
        pos[i] += Math.sin(elapsed * 0.3 + i) * delta * 0.03;
        if (pos[i + 1] > 10) pos[i + 1] = 0;
      }
      this.dustMotes.geometry.attributes.position.needsUpdate = true;
      this.dustMotes.material.uniforms.uOpacity.value = lerp(0, 0.25, smoothstep(0.2, 0.5, progress));
    }

    // Background color
    this.backgroundColor.setRGB(
      lerp(0.15, 0.05, sunsetProgress),
      lerp(0.05, 0.01, sunsetProgress),
      lerp(0.03, 0.03, sunsetProgress)
    );

    // Fog — warm sunset haze
    this.fogConfig = {
      color: lerp(0xff6622, 0x330808, sunsetProgress) | 0,
      density: lerp(0.005, 0.012, sunsetProgress),
    };

    // Camera — subtle push forward and down
    const camProgress = smoothstep(0.0, 0.9, progress);
    this.camera.position.set(0, lerp(4, 2, camProgress), lerp(14, 8, camProgress));
    this.camera.lookAt(0, lerp(3, 0.5, camProgress), -20);

    // Bloom — more glow during golden hour, less at deep sunset
    const bloomCurve = smoothstep(0.0, 0.3, progress) * (1 - smoothstep(0.7, 1.0, progress) * 0.5);
    this.bloomStrength = lerp(0.5, 2.5, bloomCurve);
  }

  deactivate() {
    super.deactivate();
    this.camera.position.set(0, 3, 12);
    this.camera.lookAt(0, 2, 0);
    this.fogConfig = null;
  }
}
