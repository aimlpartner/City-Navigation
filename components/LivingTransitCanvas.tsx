'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function LivingTransitCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check WebGL availability
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false, // shader handles smooth anti-aliasing
        powerPreference: 'low-power',
        depth: false,
        stencil: false,
      });
    } catch {
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    renderer.setSize(window.innerWidth, window.innerHeight);
    // Cap pixel ratio to save power and memory
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0xF4F5F0, 1.0);
    container.appendChild(renderer.domElement);

    // ==========================================
    // Metal-Style Moving Water GLSL Shader
    // Simulates optical caustics, wave displacement,
    // and specular sunlight reflections on clear water
    // ==========================================
    const waterVertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const waterFragmentShader = `
      precision highp float;

      varying vec2 vUv;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec2 u_mouse;

      #define TAU 6.28318530718
      #define ITERATIONS 4

      void main() {
        // Aspect-ratio-corrected UV coordinates
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        vec2 p = uv * vec2(u_resolution.x / u_resolution.y, 1.0) * 4.2;

        // Subtle interactive water disturbance from cursor / touch
        vec2 m = u_mouse * vec2(u_resolution.x / u_resolution.y, 1.0) * 4.2;
        float dMouse = length(p - m);
        float mouseWave = sin(dMouse * 7.0 - u_time * 3.5) * exp(-dMouse * 1.6) * 0.12;
        p += (p - m) * mouseWave;

        // Multi-frequency wave interference (Metal water caustics formulation)
        vec2 i = vec2(p);
        float c = 1.0;
        float inten = 0.007;

        for (int n = 0; n < ITERATIONS; n++) {
          float t = u_time * 0.24 * (1.0 - (2.4 / float(n + 1)));
          i = p + vec2(
            cos(t - i.x) + sin(t + i.y),
            sin(t - i.y) + cos(t + i.x)
          );
          c += 1.0 / length(vec2(
            p.x / (sin(i.x + t) / inten),
            p.y / (cos(i.y + t) / inten)
          ));
        }

        c /= float(ITERATIONS);
        c = 1.18 - pow(c, 1.32);

        // Surface normal calculation for specular sunlight gleam
        float dx = sin(p.x * 2.8 + u_time * 0.7) * cos(p.y * 2.4 + u_time * 0.5) * 0.45;
        float dy = cos(p.x * 2.4 + u_time * 0.5) * sin(p.y * 2.8 + u_time * 0.7) * 0.45;
        vec3 normal = normalize(vec3(dx, dy, 1.0));

        // Specular sun reflection
        vec3 lightDir = normalize(vec3(0.35, 0.65, 0.68));
        vec3 halfVec = normalize(lightDir + vec3(0.0, 0.0, 1.0));
        float specular = pow(max(dot(normal, halfVec), 0.0), 32.0) * 0.38;

        // Color palette based on natural warm stone canvas (#F4F5F0)
        vec3 baseCanvas = vec3(0.957, 0.961, 0.941);     // #F4F5F0 base
        vec3 deepTrough = vec3(0.898, 0.910, 0.882);     // #E5E8E1 subtle shaded trough
        vec3 causticHighlight = vec3(1.0, 1.0, 0.995);   // Luminous clear sunlight caustic

        // Natural water body tone
        vec3 waterBody = mix(deepTrough, baseCanvas, clamp(c, 0.0, 1.0));

        // Dancing caustic light network
        float causticLine = smoothstep(0.70, 1.04, c);
        vec3 finalColor = mix(waterBody, causticHighlight, causticLine * 0.42);

        // Add specular sunlight glimmer
        finalColor += specular * causticHighlight;

        // Gentle vignette for zero visual distraction and crisp text contrast
        vec2 d = uv * (1.0 - uv);
        float vignette = clamp(d.x * d.y * 22.0, 0.0, 1.0);
        finalColor = mix(baseCanvas, finalColor, 0.68 * vignette);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const uniforms = {
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      u_time: { value: 0.0 },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: waterVertexShader,
      fragmentShader: waterFragmentShader,
      uniforms,
      depthTest: false,
      depthWrite: false,
    });

    const quadGeo = new THREE.PlaneGeometry(2, 2);
    const quadMesh = new THREE.Mesh(quadGeo, material);
    scene.add(quadMesh);

    // ==========================================
    // Mouse / Touch Interaction
    // ==========================================
    let targetMouseX = 0.5;
    let targetMouseY = 0.5;
    let currentMouseX = 0.5;
    let currentMouseY = 0.5;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      targetMouseX = clientX / window.innerWidth;
      targetMouseY = 1.0 - clientY / window.innerHeight; // Invert for WebGL coordinates
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });

    // Handle Window Resize
    const handleResize = () => {
      if (!renderer) return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      uniforms.u_resolution.value.set(width, height);
      // Re-render immediately on resize
      renderer.render(scene, camera);
    };
    window.addEventListener('resize', handleResize);

    // ==========================================
    // Low Power Mode & Reduce Motion Detection
    // ==========================================
    let isPaused = false;
    let isLowPowerMode = false;
    let isReducedMotion = false;
    let isTabHidden = false;

    // 1. Reduce Motion preference
    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    isReducedMotion = reduceMotionQuery.matches;

    const handleReduceMotionChange = (e: MediaQueryListEvent) => {
      isReducedMotion = e.matches;
      evaluatePauseState();
    };
    reduceMotionQuery.addEventListener('change', handleReduceMotionChange);

    // 2. Low Power Mode / Battery status detection
    // Modern mobile browsers indicate low power mode through battery status or saveData
    interface BatteryManager extends EventTarget {
      charging: boolean;
      level: number;
      addEventListener(type: string, listener: EventListener): void;
      removeEventListener(type: string, listener: EventListener): void;
    }

    let batteryRef: BatteryManager | null = null;
    let onBatteryChange: (() => void) | null = null;

    if ('getBattery' in navigator) {
      (navigator as unknown as { getBattery: () => Promise<BatteryManager> })
        .getBattery()
        .then((battery) => {
          batteryRef = battery;
          const updateBatteryStatus = () => {
            // Low Power Mode on iOS and Android triggers when battery <= 20% and not charging
            isLowPowerMode = !battery.charging && battery.level <= 0.20;
            evaluatePauseState();
          };
          onBatteryChange = updateBatteryStatus;
          updateBatteryStatus();
          battery.addEventListener('levelchange', updateBatteryStatus);
          battery.addEventListener('chargingchange', updateBatteryStatus);
        })
        .catch(() => {
          // Battery API not supported or permissions denied
        });
    }

    // Check Data/Power Saver mode (Save-Data header / connection)
    const navConn = (navigator as unknown as { connection?: { saveData?: boolean } }).connection;
    if (navConn?.saveData) {
      isLowPowerMode = true;
    }

    // 3. Tab Visibility
    const handleVisibilityChange = () => {
      isTabHidden = document.hidden;
      evaluatePauseState();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const evaluatePauseState = () => {
      const shouldPause = isReducedMotion || isLowPowerMode || isTabHidden;
      if (shouldPause !== isPaused) {
        isPaused = shouldPause;
        if (isPaused) {
          // Render a single calm, serene still frame when paused
          renderer.render(scene, camera);
        }
      }
    };

    evaluatePauseState();

    // ==========================================
    // Drawing Loop: Strictly Locked to 30 FPS
    // ==========================================
    const TARGET_FPS = 30;
    const FRAME_INTERVAL = 1000 / TARGET_FPS; // ~33.33ms
    let animationFrameId: number;
    let lastRenderTime = performance.now();
    let accumulatedTime = 0.0;
    let lastTimeSample = performance.now();

    const renderLoop = (now: number) => {
      animationFrameId = requestAnimationFrame(renderLoop);

      // If paused in Low Power Mode or Reduce Motion, do not execute drawing cycles
      if (isPaused) return;

      const elapsedSinceLastRender = now - lastRenderTime;

      // Throttle rendering strictly to 30 frames a second
      if (elapsedSinceLastRender < FRAME_INTERVAL) {
        return;
      }

      // Advance delta time accurately
      const dt = (now - lastTimeSample) * 0.001;
      lastTimeSample = now;
      accumulatedTime += Math.min(dt, 0.1); // clamp against background suspension jumps
      lastRenderTime = now - (elapsedSinceLastRender % FRAME_INTERVAL);

      // Smooth mouse coordinate lerp
      currentMouseX += (targetMouseX - currentMouseX) * 0.08;
      currentMouseY += (targetMouseY - currentMouseY) * 0.08;

      uniforms.u_time.value = accumulatedTime;
      uniforms.u_mouse.value.set(currentMouseX, currentMouseY);

      renderer.render(scene, camera);
    };

    // Render initial still frame immediately
    renderer.render(scene, camera);

    // Start 30 FPS drawing loop
    animationFrameId = requestAnimationFrame(renderLoop);

    // ==========================================
    // Cleanup on Component Unmount
    // ==========================================
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      reduceMotionQuery.removeEventListener('change', handleReduceMotionChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (batteryRef && onBatteryChange) {
        batteryRef.removeEventListener('levelchange', onBatteryChange);
        batteryRef.removeEventListener('chargingchange', onBatteryChange);
      }

      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }

      quadGeo.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      aria-hidden="true"
    />
  );
}
