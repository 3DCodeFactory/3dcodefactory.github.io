import * as THREE from "./vendor/three.module.js";

import { OrbitControls } from "./vendor/addons/controls/OrbitControls.js";

import { EffectComposer } from "./vendor/addons/postprocessing/EffectComposer.js";

import { RenderPass } from "./vendor/addons/postprocessing/RenderPass.js";

import { UnrealBloomPass } from "./vendor/addons/postprocessing/UnrealBloomPass.js";

import { ShaderPass } from "./vendor/addons/postprocessing/ShaderPass.js";

import { OutputPass } from "./vendor/addons/postprocessing/OutputPass.js";

import { getMaterials } from "./materials.js";

import { createChateau } from "./chateau.js";

import { createLandscape } from "./landscape.js";

import { createAtmosphere } from "./atmosphere.js";

const params = new URLSearchParams(location.search);

const CAPTURE = params.get("capture") === "1";

const INITIAL_MOOD = clamp(parseFloat(params.get("mood") ?? "0.09"), 0, 1);

const INITIAL_MIST = clamp(parseFloat(params.get("mist") ?? "0.38"), 0, 1);

const UI_VISIBLE = params.get("ui") !== "0" && !CAPTURE;

function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

if (CAPTURE) document.body.classList.add("capture");

const canvas = document.getElementById("scene");

const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: true,
    stencil: false
});

let dpr = Math.min(window.devicePixelRatio || 1, 1.5);

renderer.setPixelRatio(dpr);

renderer.setSize(window.innerWidth, window.innerHeight, false);

renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.toneMapping = THREE.ACESFilmicToneMapping;

renderer.toneMappingExposure = .95;

renderer.shadowMap.enabled = true;

renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.shadowMap.autoUpdate = true;

renderer.shadowMap.needsUpdate = true;

renderer.info.autoReset = false;

renderer.getContext().getExtension("WEBGL_debug_renderer_info");

const scene = new THREE.Scene;

scene.name = "Vallée scene";

const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, .1, 1800);

const startPosition = new THREE.Vector3(0, 5.18, 92);

const startTarget = new THREE.Vector3(-1.15, 6.85, 0);

camera.position.copy(startPosition);

camera.lookAt(startTarget);

const controls = new OrbitControls(camera, canvas);

controls.target.copy(startTarget);

controls.enableDamping = true;

controls.dampingFactor = .055;

controls.rotateSpeed = .34;

controls.zoomSpeed = .58;

controls.panSpeed = .45;

controls.screenSpacePanning = false;

controls.minDistance = 18;

controls.maxDistance = 190;

controls.maxPolarAngle = Math.PI * .5065;

controls.minPolarAngle = Math.PI * .13;

controls.enablePan = true;

controls.update();

const M = getMaterials();

const chateau = createChateau(M);

scene.add(chateau.group);

const land = createLandscape(M);

scene.add(land.group);

const outerGround = new THREE.Mesh(new THREE.CircleGeometry(1200, 64), new THREE.MeshStandardMaterial({
    color: 3686702,
    roughness: 1
}));

outerGround.rotation.x = -Math.PI / 2;

outerGround.position.y = -.35;

outerGround.receiveShadow = false;

scene.add(outerGround);

const atmosphere = createAtmosphere(scene, renderer);

const state = {
    mood: INITIAL_MOOD,
    mist: INITIAL_MIST,
    targetMood: INITIAL_MOOD,
    targetMist: INITIAL_MIST,
    elapsed: 0,
    frames: 0,
    fps: 0
};

const GLASS_MORNING = new THREE.Color(12832208);

const GLASS_EVENING = new THREE.Color(15061682);

const LIT_MORNING = new THREE.Color(9676973);

const LIT_EVENING = new THREE.Color(16768170);

function applyTimeResponse(mood, mist) {
    const warm = mood * mood * (3 - 2 * mood);
    M.glass.color.copy(GLASS_MORNING).lerp(GLASS_EVENING, warm);
    M.glassLit.color.copy(LIT_MORNING).lerp(LIT_EVENING, warm);
    M.glass.emissiveIntensity = lerp(.002, .1, warm);
    M.glassLit.emissiveIntensity = lerp(.003, .9, warm);
    M.oculus.emissiveIntensity = lerp(.006, .65, warm);
    const litStrength = .02 + warm * 4.2;
    for (const l of chateau.entranceLights) l.intensity = litStrength;
    M.slate.envMapIntensity = lerp(.9, .55, warm);
    M.glass.envMapIntensity = lerp(2.2, 2.4, warm);
    M.glassLit.envMapIntensity = lerp(2, 2.2, warm);
    M.fieldstone.color.setRGB(.75 - mist * .035, .74 - mist * .01, .66 - mist * .03);
}

function makeSizedTarget(w, h) {
    const options = {
        type: THREE.HalfFloatType
    };
    if (renderer.capabilities.isWebGL2) options.samples = 2;
    return new THREE.WebGLRenderTarget(Math.floor(w * dpr), Math.floor(h * dpr), options);
}

const sceneTarget = makeSizedTarget(window.innerWidth, window.innerHeight);

const composer = new EffectComposer(renderer, sceneTarget);

composer.setPixelRatio(dpr);

composer.setSize(window.innerWidth, window.innerHeight);

const renderPass = new RenderPass(scene, camera);

composer.addPass(renderPass);

const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), .16, .62, .92);

composer.addPass(bloom);

const outputPass = new OutputPass;

composer.addPass(outputPass);

const GradeShader = {
    uniforms: {
        tDiffuse: {
            value: null
        },
        uTime: {
            value: 0
        },
        uResolution: {
            value: new THREE.Vector2(window.innerWidth, window.innerHeight)
        },
        uVignette: {
            value: .28
        },
        uGrain: {
            value: .014
        },
        uSaturation: {
            value: 1.02
        },
        uContrast: {
            value: 1.015
        },
        uTint: {
            value: new THREE.Color(.96, .985, 1.03)
        },
        uWarm: {
            value: 0
        }
    },
    vertexShader: `\n    varying vec2 vUv;\n    void main() {\n      vUv = uv;\n      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n    }\n  `,
    fragmentShader: `\n    uniform sampler2D tDiffuse;\n    uniform float uTime;\n    uniform vec2 uResolution;\n    uniform float uVignette;\n    uniform float uGrain;\n    uniform float uSaturation;\n    uniform float uContrast;\n    uniform vec3 uTint;\n    uniform float uWarm;\n    varying vec2 vUv;\n\n    float hash21(vec2 p) {\n      p = fract(p * vec2(123.34, 456.21));\n      p += dot(p, p + 45.32);\n      return fract(p.x * p.y);\n    }\n\n    void main() {\n      vec3 c = texture2D(tDiffuse, vUv).rgb;\n      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));\n      c = mix(vec3(l), c, uSaturation);\n      c = (c - 0.5) * uContrast + 0.5;\n      c *= uTint;\n      // a whisper of warm light in the highlights and cool depth in the shadows\n      c += vec3(0.018, 0.007, -0.008) * uWarm * l;\n      c -= vec3(0.006, 0.002, -0.004) * (1.0 - l) * uWarm;\n      float d = length((vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0)) * 0.92;\n      float vig = smoothstep(1.13, 0.28, d);\n      c *= mix(1.0, mix(0.73, 1.0, vig), uVignette);\n      float g = hash21(vUv * uResolution + fract(uTime) * 511.0) - 0.5;\n      c += g * uGrain;\n      // tiny dithering to discourage banding in the soft sky\n      c += (hash21(vUv * uResolution * 1.37 + 19.2) - 0.5) / 255.0;\n      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);\n    }\n  `
};

const gradePass = new ShaderPass(GradeShader);

composer.addPass(gradePass);

const ui = {
    mood: document.getElementById("mood"),
    mist: document.getElementById("mist"),
    moodName: document.getElementById("mood-name"),
    mistName: document.getElementById("mist-name"),
    clock: document.getElementById("clock"),
    weather: document.getElementById("weather-mark"),
    presetMorning: document.getElementById("preset-morning"),
    presetEvening: document.getElementById("preset-evening"),
    reset: document.getElementById("reset-view"),
    save: document.getElementById("save-still"),
    toast: document.getElementById("toast"),
    loading: document.getElementById("loading")
};

if (!UI_VISIBLE) document.body.classList.add("capture");

if (ui.mood) ui.mood.value = String(INITIAL_MOOD * 100);

if (ui.mist) ui.mist.value = String(INITIAL_MIST * 100);

let hudHidden = false;

let toastTimer = null;

function moodLabel(t) {
    if (t < .24) return "Overcast morning";
    if (t < .47) return "Mist breaking";
    if (t < .7) return "Long shadows";
    if (t < .9) return "Late afternoon";
    return "Golden hour";
}

function mistLabel(t) {
    if (t < .12) return "Clear air";
    if (t < .4) return "Soft veil";
    if (t < .72) return "Gathering mist";
    return "Deep in the hills";
}

function clockLabel(t) {
    const minutes = Math.round(6 * 60 + 30 + t * (17 * 60 + 40 - 6 * 60 - 30));
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}

function syncUI() {
    const t = state.targetMood;
    const m = state.targetMist;
    if (ui.moodName) ui.moodName.textContent = moodLabel(t);
    if (ui.mistName) ui.mistName.textContent = mistLabel(m);
    if (ui.clock) ui.clock.textContent = clockLabel(t);
    if (ui.weather) {
        ui.weather.textContent = t < .32 ? "Sur ciel couvert" : t < .7 ? "Lumière qui perce" : "Lumière dorée";
    }
    if (ui.presetMorning) ui.presetMorning.classList.toggle("active", t < .46);
    if (ui.presetEvening) ui.presetEvening.classList.toggle("active", t >= .46);
    if (ui.mood) ui.mood.value = String(t * 100);
    if (ui.mist) ui.mist.value = String(m * 100);
}

function setMoodTarget(v, immediate = false) {
    state.targetMood = clamp(v, 0, 1);
    if (immediate) state.mood = state.targetMood;
    syncUI();
}

function setMistTarget(v, immediate = false) {
    state.targetMist = clamp(v, 0, 1);
    if (immediate) state.mist = state.targetMist;
    syncUI();
}

if (ui.mood) ui.mood.addEventListener("input", e => setMoodTarget(parseFloat(e.target.value) / 100));

if (ui.mist) ui.mist.addEventListener("input", e => setMistTarget(parseFloat(e.target.value) / 100));

if (ui.presetMorning) ui.presetMorning.addEventListener("click", () => setMoodTarget(.08));

if (ui.presetEvening) ui.presetEvening.addEventListener("click", () => setMoodTarget(.94));

if (ui.reset) {
    ui.reset.addEventListener("click", () => {
        camera.position.copy(startPosition);
        controls.target.copy(startTarget);
        controls.update();
        setMoodTarget(INITIAL_MOOD);
        setMistTarget(INITIAL_MIST);
        showToast("View reset");
    });
}

function showToast(message) {
    if (!ui.toast) return;
    ui.toast.textContent = message;
    ui.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ui.toast.classList.remove("show"), 2200);
}

function downloadStill() {
    composer.render();
    const data = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = data;
    a.download = "chateau-de-la-vallee.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast("Still exported");
}

if (ui.save) ui.save.addEventListener("click", downloadStill);

window.addEventListener("keydown", e => {
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
    if (e.key === "h" || e.key === "H") {
        hudHidden = !hudHidden;
        document.body.style.setProperty("--hud-hidden", hudHidden ? "1" : "0");
        const hud = document.getElementById("hud");
        if (hud) hud.style.opacity = hudHidden ? "0" : "1";
    }
    if (e.key === "p" || e.key === "P") downloadStill();
});

function onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    bloom.setSize(w, h);
    GradeShader.uniforms.uResolution.value.set(w, h);
    renderer.shadowMap.needsUpdate = true;
}

window.addEventListener("resize", onResize);

const clock = new THREE.Clock;

let fpsAccum = 0;

let fpsFrames = 0;

let fpsLast = performance.now();

function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), .08);
    state.elapsed += dt;
    const previousMood = state.mood;
    const moodEase = 1 - Math.exp(-dt * 3.6);
    const mistEase = 1 - Math.exp(-dt * 2.8);
    state.mood += (state.targetMood - state.mood) * moodEase;
    state.mist += (state.targetMist - state.mist) * mistEase;
    if (Math.abs(state.targetMood - state.mood) < 2e-4) state.mood = state.targetMood;
    if (Math.abs(state.targetMist - state.mist) < 2e-4) state.mist = state.targetMist;
    controls.update();
    applyTimeResponse(state.mood, state.mist);
    atmosphere.update(state.mood, state.mist, state.elapsed, camera);
    const warm = state.mood * state.mood * (3 - 2 * state.mood);
    GradeShader.uniforms.uTime.value = state.elapsed;
    GradeShader.uniforms.uWarm.value = warm;
    GradeShader.uniforms.uTint.value.copy(atmosphere.state.palette.gradeTint);
    GradeShader.uniforms.uSaturation.value = atmosphere.state.palette.saturation;
    GradeShader.uniforms.uContrast.value = atmosphere.state.palette.contrast;
    GradeShader.uniforms.uVignette.value = atmosphere.state.palette.vignette;
    if (Math.abs(state.mood - previousMood) > 15e-5 || state.frames < 2) {
        renderer.shadowMap.needsUpdate = true;
    }
    renderer.info.reset();
    composer.render();
    state.frames++;
    if (state.frames === 2) {
        window.__ready = true;
        if (ui.loading) ui.loading.classList.add("gone");
    }
    fpsFrames++;
    const now = performance.now();
    if (now - fpsLast > 700) {
        state.fps = fpsFrames * 1e3 / (now - fpsLast);
        fpsFrames = 0;
        fpsLast = now;
    }
}

syncUI();

applyTimeResponse(state.mood, state.mist);

atmosphere.update(state.mood, state.mist, 0, camera);

renderer.shadowMap.needsUpdate = true;

animate();

window.__app = {
    THREE: THREE,
    scene: scene,
    camera: camera,
    renderer: renderer,
    composer: composer,
    controls: controls,
    state: state,
    materials: M,
    atmosphere: atmosphere,
    setMood: v => setMoodTarget(v),
    setMist: v => setMistTarget(v),
    setMoodImmediate: v => setMoodTarget(v, true),
    setMistImmediate: v => setMistTarget(v, true),
    resetView: () => {
        camera.position.copy(startPosition);
        controls.target.copy(startTarget);
        controls.update();
    },
    renderFinal: () => {
        applyTimeResponse(state.mood, state.mist);
        atmosphere.update(state.mood, state.mist, state.elapsed, camera);
        GradeShader.uniforms.uTime.value = state.elapsed;
        GradeShader.uniforms.uWarm.value = state.mood * state.mood * (3 - 2 * state.mood);
        GradeShader.uniforms.uTint.value.copy(atmosphere.state.palette.gradeTint);
        GradeShader.uniforms.uSaturation.value = atmosphere.state.palette.saturation;
        GradeShader.uniforms.uContrast.value = atmosphere.state.palette.contrast;
        GradeShader.uniforms.uVignette.value = atmosphere.state.palette.vignette;
        composer.render();
        return canvas.toDataURL("image/png");
    },
    getDiagnostics: () => {
        applyTimeResponse(state.mood, state.mist);
        atmosphere.update(state.mood, state.mist, state.elapsed, camera);
        const gl = renderer.getContext();
        const dbg = gl.getExtension("WEBGL_debug_renderer_info");
        let meshes = 0, lights = 0, instances = 0, geometries = 0;
        const mats = new Set;
        scene.traverse(o => {
            if (o.isMesh) {
                meshes++;
                if (o.isInstancedMesh) instances += o.count;
                geometries++;
                if (Array.isArray(o.material)) o.material.forEach(m => mats.add(m)); else if (o.material) mats.add(o.material);
            }
            if (o.isLight) lights++;
        });
        return {
            ready: !!window.__ready,
            webgl: renderer.capabilities.isWebGL2 ? "WebGL2" : "WebGL1",
            renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
            vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
            glVersion: gl.getParameter(gl.VERSION),
            pixelRatio: renderer.getPixelRatio(),
            canvasSize: {
                width: renderer.domElement.width,
                height: renderer.domElement.height
            },
            camera: {
                fov: camera.fov,
                aspect: camera.aspect,
                near: camera.near,
                far: camera.far,
                position: camera.position.toArray(),
                target: controls.target.toArray()
            },
            state: {
                mood: state.mood,
                mist: state.mist,
                moodTarget: state.targetMood,
                mistTarget: state.targetMist,
                clock: clockLabel(state.targetMood)
            },
            scene: {
                meshes: meshes,
                instances: instances,
                geometries: geometries,
                materials: mats.size,
                lights: lights,
                fogDensity: scene.fog ? scene.fog.density : null,
                environmentIntensity: scene.environmentIntensity
            },
            renderInfo: {
                calls: renderer.info.render.calls,
                triangles: renderer.info.render.triangles,
                points: renderer.info.render.points,
                lines: renderer.info.render.lines,
                frame: renderer.info.render.frame,
                textures: renderer.info.memory.textures,
                geometries: renderer.info.memory.geometries
            },
            fps: Number(state.fps.toFixed(2)),
            errors: window.__errors || []
        };
    },
    captureMode: CAPTURE
};

window.__errors = [];

window.addEventListener("error", e => window.__errors.push(String(e.message || e.error || e)));

window.addEventListener("unhandledrejection", e => window.__errors.push(String(e.reason || e)));
