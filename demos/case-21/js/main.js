import * as THREE from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";

import { RenderPass } from "three/addons/postprocessing/RenderPass.js";

import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";

import { createMaterialLibrary } from "./materials.js";

import { buildInterior, DEFAULT_HOUR, TIME_MIN, TIME_MAX } from "./interior.js";

const PHOTO_URLS = {
    rug: "./assets/textures/rug_main_madder.jpg",
    rugBump: "./assets/textures/rug_main_madder_bump.jpg",
    rugBase: "./assets/textures/rug_base.jpg",
    rugBaseBump: "./assets/textures/rug_base_bump.jpg",
    suzani: "./assets/textures/textile_suzani.jpg",
    kilim: "./assets/textures/textile_kilim.jpg",
    poppy: "./assets/textures/textile_poppy.jpg",
    paisley: "./assets/textures/textile_paisley.jpg",
    crescent: "./assets/textures/textile_crescent.jpg",
    velvetPhoto: "./assets/textures/textile_velvet.jpg",
    tulip: "./assets/textures/textile_tulip.jpg",
    throwTextile: "./assets/textures/textile_throw.jpg"
};

async function loadPhotoTextures() {
    const entries = await Promise.all(Object.entries(PHOTO_URLS).map(async ([key, src]) => {
        try {
            const img = new Image;
            img.decoding = "async";
            img.src = src;
            await img.decode();
            return [ key, img ];
        } catch (err) {
            console.warn(`Textile ${src} could not be loaded; falling back to the painted library.`);
            return [ key, null ];
        }
    }));
    return Object.fromEntries(entries.filter(([, img]) => img));
}

window.__sceneReady = false;

window.__sceneErrors = [];

window.__sceneConsole = [];

const originalConsoleError = console.error.bind(console);

const originalConsoleWarn = console.warn.bind(console);

console.error = (...args) => {
    window.__sceneErrors.push(args.map(String).join(" "));
    originalConsoleError(...args);
};

console.warn = (...args) => {
    window.__sceneConsole.push({
        level: "warn",
        text: args.map(String).join(" ")
    });
    originalConsoleWarn(...args);
};

window.addEventListener("error", event => {
    window.__sceneErrors.push(`${event.message} @ ${event.filename}:${event.lineno}:${event.colno}`);
});

window.addEventListener("unhandledrejection", event => {
    window.__sceneErrors.push(`Unhandled promise: ${event.reason}`);
});

function fatal(message) {
    const loading = document.getElementById("loading");
    if (loading) loading.classList.add("is-hidden");
    const div = document.createElement("div");
    div.className = "fatal-error";
    div.textContent = message;
    document.body.appendChild(div);
}

function createEnvironmentMap(renderer) {
    const W = 1024, H = 512;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#d7c8ad");
    sky.addColorStop(.34, "#a59173");
    sky.addColorStop(.52, "#76634d");
    sky.addColorStop(.66, "#3d2e22");
    sky.addColorStop(1, "#17100b");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W * .48, H * .49, 5, W * .48, H * .49, 190);
    glow.addColorStop(0, "rgba(255,247,213,1)");
    glow.addColorStop(.32, "rgba(255,224,162,0.78)");
    glow.addColorStop(.72, "rgba(214,157,84,0.18)");
    glow.addColorStop(1, "rgba(214,157,84,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,239,192,0.94)";
    ctx.fillRect(W * .33, H * .32, W * .23, H * .22);
    ctx.fillStyle = "rgba(105,75,48,0.55)";
    for (let i = 0; i < 3; i++) {
        ctx.fillRect(W * (.365 + i * .07), H * .32, 3, H * .22);
    }
    ctx.fillStyle = "rgba(139,77,55,0.52)";
    ctx.beginPath();
    ctx.moveTo(0, H * .2);
    ctx.lineTo(W * .28, H * .32);
    ctx.lineTo(W * .23, H);
    ctx.lineTo(0, H);
    ctx.fill();
    ctx.fillStyle = "rgba(87,104,88,0.46)";
    ctx.beginPath();
    ctx.moveTo(W, H * .14);
    ctx.lineTo(W * .77, H * .28);
    ctx.lineTo(W * .84, H);
    ctx.lineTo(W, H);
    ctx.fill();
    for (const [x, y, r, c] of [ [ W * .15, H * .63, 48, "rgba(255,191,107,0.6)" ], [ W * .84, H * .63, 38, "rgba(255,200,124,0.45)" ], [ W * .48, H * .9, 35, "rgba(255,196,120,0.28)" ] ]) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, c);
        g.addColorStop(1, "rgba(255,190,110,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 32; i++) {
        ctx.fillStyle = `rgba(${75 + Math.random() * 50},${105 + Math.random() * 45},${62 + Math.random() * 30},0.22)`;
        ctx.beginPath();
        ctx.ellipse(W * (.18 + Math.random() * .65), H * (.38 + Math.random() * .5), 8 + Math.random() * 28, 5 + Math.random() * 14, Math.random() * 3.14, 0, Math.PI * 2);
        ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.mapping = THREE.EquirectangularReflectionMapping;
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const rt = pmrem.fromEquirectangular(tex);
    tex.dispose();
    pmrem.dispose();
    return rt.texture;
}

const GradeShader = {
    uniforms: {
        tDiffuse: {
            value: null
        },
        uTime: {
            value: 0
        },
        uResolution: {
            value: new THREE.Vector2(1536, 1024)
        },
        uVignette: {
            value: .925
        },
        uWarmth: {
            value: .05
        },
        uSaturation: {
            value: 1.07
        }
    },
    vertexShader: `\n    varying vec2 vUv;\n    void main() {\n      vUv = uv;\n      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n    }\n  `,
    fragmentShader: `\n    uniform sampler2D tDiffuse;\n    uniform float uTime;\n    uniform vec2 uResolution;\n    uniform float uVignette;\n    uniform float uWarmth;\n    uniform float uSaturation;\n    varying vec2 vUv;\n\n    float hash(vec2 p) {\n      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);\n    }\n\n    void main() {\n      vec4 color = texture2D(tDiffuse, vUv);\n      vec2 p = (vUv - 0.5) * vec2(1.0, 0.88);\n      float d = length(p);\n      float clear = smoothstep(0.92, 0.2, d);\n      color.rgb *= mix(uVignette, 1.015, clear);\n\n      // warm the highlights, cool the deepest shadows just a breath\n      float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));\n      vec3 warm = color.rgb * vec3(1.008, 1.003, 0.992);\n      vec3 cool = color.rgb * vec3(0.965, 0.99, 1.035);\n      color.rgb = mix(cool, warm, smoothstep(0.025, 0.55, luma) * uWarmth + 0.03);\n      float gradedLuma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));\n      color.rgb = mix(vec3(gradedLuma), color.rgb, uSaturation);\n\n      float grain = hash(gl_FragCoord.xy + vec2(uTime * 1.7, uTime * 2.3)) - 0.5;\n      color.rgb += grain * 0.0045;\n\n      // very soft halation in the warm highlights\n      color.rgb += smoothstep(0.78, 1.45, luma) * vec3(0.012, 0.008, 0.002);\n\n      gl_FragColor = color;\n    }\n  `
};

async function init() {
    try {
        const photoTextures = await loadPhotoTextures();
        RectAreaLightUniformsLib.init();
        const stage = document.getElementById("stage");
        const canvas = document.getElementById("scene");
        const renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
            preserveDrawingBuffer: true,
            stencil: false
        });
        if (!renderer.getContext()) throw new Error("WebGL is unavailable in this browser.");
        renderer.setClearColor(1511692, 1);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.info.autoReset = false;
        renderer.shadowMap.autoUpdate = false;
        renderer.shadowMap.needsUpdate = true;
        const scene = new THREE.Scene;
        scene.background = new THREE.Color(1511692);
        const HOME = {
            position: new THREE.Vector3(-1.9, 1.56, 4.55),
            target: new THREE.Vector3(-1.9, 1.02, -2),
            fov: 54
        };
        const camera = new THREE.PerspectiveCamera(HOME.fov, 1.5, .045, 65);
        camera.position.copy(HOME.position);
        camera.lookAt(HOME.target);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.target.copy(HOME.target);
        controls.enableDamping = true;
        controls.dampingFactor = .055;
        controls.rotateSpeed = .52;
        controls.zoomSpeed = .72;
        controls.panSpeed = .5;
        controls.minDistance = 1.7;
        controls.maxDistance = 12.5;
        controls.minPolarAngle = .45;
        controls.maxPolarAngle = Math.PI * .515;
        controls.screenSpacePanning = true;
        controls.update();
        const envMap = createEnvironmentMap(renderer);
        scene.environment = envMap;
        scene.environmentIntensity = .62;
        const materialLib = createMaterialLibrary(photoTextures);
        const interior = buildInterior(scene, materialLib.mats, materialLib.tex);
        interior.architecture.backWall.castShadow = true;
        interior.architecture.backWall.material.shadowSide = THREE.DoubleSide;
        interior.architecture.leftWall.castShadow = false;
        const composer = new EffectComposer(renderer);
        composer.setPixelRatio(1);
        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);
        const bloom = new UnrealBloomPass(new THREE.Vector2(1536, 1024), .06, .3, 1);
        composer.addPass(bloom);
        const grade = new ShaderPass(GradeShader);
        composer.addPass(grade);
        const output = new OutputPass;
        composer.addPass(output);
        const loadingSub = document.querySelector(".loading-sub");
        if (loadingSub) loadingSub.textContent = "Hanging the last tapestry";
        const clock = new THREE.Clock;
        let elapsed = 0;
        let frame = 0;
        const frameTimes = [];
        let currentHour = DEFAULT_HOUR;
        let drifting = false;
        let driftDir = 1;
        let paused = false;
        let rafId = 0;
        const slider = document.getElementById("timeSlider");
        const clockEl = document.getElementById("clock");
        const suffixEl = document.getElementById("clockSuffix");
        const periodEl = document.getElementById("period");
        const driftBtn = document.getElementById("drift");
        const driftLabel = driftBtn ? driftBtn.querySelector(".drift-label") : null;
        const presetButtons = [ ...document.querySelectorAll(".preset") ];
        const toast = document.getElementById("toast");
        function formatHour(h) {
            let wh = Math.floor(h);
            let min = Math.round((h - wh) * 60);
            if (min === 60) {
                wh += 1;
                min = 0;
            }
            const suffix = wh % 24 >= 12 ? "pm" : "am";
            const display = (wh + 11) % 12 + 1;
            return {
                display: display,
                min: min,
                suffix: suffix,
                label: `${display}:${String(min).padStart(2, "0")}`
            };
        }
        let activePeriod = "";
        function syncUI(force = false) {
            const f = formatHour(currentHour);
            if (clockEl) clockEl.textContent = f.label;
            if (suffixEl) suffixEl.textContent = f.suffix;
            const p = interior.state.period || interior.describeTime(currentHour);
            if (periodEl && (force || activePeriod !== p)) {
                periodEl.textContent = p;
                activePeriod = p;
            }
            if (slider) slider.value = String(currentHour);
            presetButtons.forEach(b => {
                const h = parseFloat(b.dataset.hour);
                b.classList.toggle("is-active", Math.abs(h - currentHour) < .035);
            });
        }
        function applyHour(h, options = {}) {
            currentHour = THREE.MathUtils.clamp(h, TIME_MIN, TIME_MAX);
            interior.setTime(currentHour);
            renderer.shadowMap.needsUpdate = true;
            syncUI(options.force ?? false);
        }
        function setDrifting(on) {
            drifting = !!on;
            if (driftBtn) driftBtn.setAttribute("aria-pressed", drifting ? "true" : "false");
            if (driftLabel) driftLabel.textContent = drifting ? "Drifting" : "Sun drift";
            if (drifting) {
                if (currentHour >= TIME_MAX - .1) driftDir = -1;
                if (currentHour <= TIME_MIN + .1) driftDir = 1;
            }
        }
        slider?.addEventListener("input", () => {
            setDrifting(false);
            applyHour(parseFloat(slider.value), {
                force: true
            });
        });
        presetButtons.forEach(button => {
            button.addEventListener("click", () => {
                setDrifting(false);
                applyHour(parseFloat(button.dataset.hour), {
                    force: true
                });
            });
        });
        driftBtn?.addEventListener("click", () => setDrifting(!drifting));
        function resetView() {
            camera.position.copy(HOME.position);
            camera.fov = HOME.fov;
            camera.updateProjectionMatrix();
            controls.target.copy(HOME.target);
            controls.update();
            camera.updateMatrixWorld();
        }
        document.getElementById("resetView")?.addEventListener("click", () => {
            resetView();
            showToast("Returned to the reference viewpoint.");
        });
        let toastTimer = 0;
        function showToast(text) {
            if (!toast) return;
            toast.textContent = text;
            toast.classList.add("is-visible");
            clearTimeout(toastTimer);
            toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3200);
        }
        function currentCanvasSize() {
            return {
                w: Math.max(2, stage.clientWidth),
                h: Math.max(2, stage.clientHeight)
            };
        }
        function resize() {
            const {w: w, h: h} = currentCanvasSize();
            const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
            renderer.setPixelRatio(dpr);
            renderer.setSize(w, h, false);
            composer.setPixelRatio(dpr);
            composer.setSize(w, h);
            if (grade?.uniforms?.uResolution) grade.uniforms.uResolution.value.set(w * dpr, h * dpr);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        }
        resize();
        window.addEventListener("resize", resize);
        if ("ResizeObserver" in window) {
            new ResizeObserver(resize).observe(stage);
        }
        async function exportScenePNG(width = 1536, height = 1024) {
            const {w: w, h: h} = currentCanvasSize();
            const previousDpr = renderer.getPixelRatio();
            renderer.setPixelRatio(1);
            renderer.setSize(width, height, false);
            composer.setPixelRatio(1);
            composer.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            if (grade?.uniforms?.uResolution) grade.uniforms.uResolution.value.set(width, height);
            controls.update();
            interior.update(elapsed);
            renderer.info.reset();
            composer.render();
            const dataURL = canvas.toDataURL("image/png");
            renderer.setPixelRatio(previousDpr);
            renderer.setSize(w, h, false);
            composer.setPixelRatio(previousDpr);
            composer.setSize(w, h);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            if (grade?.uniforms?.uResolution) grade.uniforms.uResolution.value.set(w * previousDpr, h * previousDpr);
            controls.update();
            renderer.info.reset();
            composer.render();
            return dataURL;
        }
        async function exportReferencePNG(width = 1536, height = 1024) {
            resetView();
            controls.update();
            await new Promise(resolve => requestAnimationFrame(resolve));
            return exportScenePNG(width, height);
        }
        function downloadDataURL(dataURL, filename) {
            const a = document.createElement("a");
            a.href = dataURL;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
        }
        document.getElementById("savePng")?.addEventListener("click", async () => {
            showToast("Exposing a 1536 × 1024 plate…");
            try {
                setDrifting(false);
                const dataURL = await exportScenePNG(1536, 1024);
                downloadDataURL(dataURL, "la-chambre-fleurie.png");
                showToast("The plate is saved — 1536 × 1024.");
            } catch (error) {
                console.error(error);
                showToast("The plate could not be exposed. Check the console.");
            }
        });
        function collectSceneCounts() {
            let objects = 0, meshes = 0, instancedMeshes = 0, lights = 0, transparentMaterials = 0, shadowCasters = 0;
            const materials = new Set;
            scene.traverse(o => {
                objects++;
                if (o.isMesh) {
                    meshes++;
                    if (o.isInstancedMesh) instancedMeshes++;
                    if (o.castShadow) shadowCasters++;
                    const mm = Array.isArray(o.material) ? o.material : [ o.material ];
                    mm.forEach(m => {
                        if (!m) return;
                        materials.add(m.uuid);
                        if (m.transparent) transparentMaterials++;
                    });
                }
                if (o.isLight) lights++;
            });
            return {
                objects: objects,
                meshes: meshes,
                instancedMeshes: instancedMeshes,
                lights: lights,
                materials: materials.size,
                transparentMaterials: transparentMaterials,
                shadowCasters: shadowCasters
            };
        }
        function getDiagnostics() {
            const gl = renderer.getContext();
            const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
            const size = currentCanvasSize();
            const dir = new THREE.Vector3;
            camera.getWorldDirection(dir);
            const avgFrame = frameTimes.length ? frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length : null;
            return {
                generatedAt: (new Date).toISOString(),
                threeRevision: THREE.REVISION,
                webglVersion: gl.getParameter(gl.VERSION),
                glslVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
                vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
                renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
                maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
                maxTextureUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
                antialias: gl.getContextAttributes()?.antialias ?? null,
                canvas: {
                    drawingBufferWidth: renderer.domElement.width,
                    drawingBufferHeight: renderer.domElement.height,
                    cssWidth: size.w,
                    cssHeight: size.h,
                    aspect: +(size.w / size.h).toFixed(5),
                    pixelRatio: renderer.getPixelRatio()
                },
                camera: {
                    fov: camera.fov,
                    aspect: +camera.aspect.toFixed(5),
                    near: camera.near,
                    far: camera.far,
                    position: camera.position.toArray().map(v => +v.toFixed(4)),
                    target: controls.target.toArray().map(v => +v.toFixed(4)),
                    quaternion: camera.quaternion.toArray().map(v => +v.toFixed(5)),
                    direction: dir.toArray().map(v => +v.toFixed(5))
                },
                referenceView: {
                    position: HOME.position.toArray(),
                    target: HOME.target.toArray(),
                    fov: HOME.fov
                },
                rendererInfo: {
                    calls: renderer.info.render.calls,
                    triangles: renderer.info.render.triangles,
                    points: renderer.info.render.points,
                    lines: renderer.info.render.lines,
                    geometries: renderer.info.memory.geometries,
                    textures: renderer.info.memory.textures
                },
                scene: collectSceneCounts(),
                time: {
                    hour: +currentHour.toFixed(3),
                    label: formatHour(currentHour).label + " " + formatHour(currentHour).suffix,
                    period: interior.state.period,
                    drifting: drifting,
                    minimum: TIME_MIN,
                    maximum: TIME_MAX
                },
                framesObserved: frame,
                rollingFrameTimeMs: avgFrame != null ? +(avgFrame * 1e3).toFixed(2) : null,
                rollingFps: avgFrame ? +(1 / avgFrame).toFixed(2) : null,
                errors: window.__sceneErrors.slice(),
                consoleWarnings: window.__sceneConsole.slice(-20)
            };
        }
        window.__sceneApp = {
            ready: false,
            THREE: THREE,
            get ready() {
                return window.__sceneReady;
            },
            scene: scene,
            renderer: renderer,
            camera: camera,
            controls: controls,
            composer: composer,
            materials: materialLib.mats,
            textures: materialLib.tex,
            interior: interior,
            setTime: hour => applyHour(hour, {
                force: true
            }),
            getTime: () => currentHour,
            setDrifting: setDrifting,
            isDrifting: () => drifting,
            resetView: resetView,
            exportScenePNG: exportScenePNG,
            exportReferencePNG: exportReferencePNG,
            getDiagnostics: getDiagnostics,
            getReferenceCamera: () => ({
                position: HOME.position.toArray(),
                target: HOME.target.toArray(),
                fov: HOME.fov,
                aspect: 1.5
            }),
            pause: () => {
                paused = true;
                cancelAnimationFrame(rafId);
            },
            resume: () => {
                if (!paused) return;
                paused = false;
                clock.getDelta();
                rafId = requestAnimationFrame(animate);
            }
        };
        const animate = () => {
            const dt = Math.min(clock.getDelta(), .05);
            elapsed += dt;
            frame++;
            frameTimes.push(dt);
            if (frameTimes.length > 90) frameTimes.shift();
            if (drifting) {
                currentHour += dt * .19 * driftDir;
                if (currentHour >= TIME_MAX - .05) {
                    currentHour = TIME_MAX - .05;
                    driftDir = -1;
                } else if (currentHour <= TIME_MIN + .05) {
                    currentHour = TIME_MIN + .05;
                    driftDir = 1;
                }
                applyHour(currentHour);
            }
            interior.update(elapsed);
            controls.update();
            if (grade?.uniforms?.uTime) grade.uniforms.uTime.value = elapsed;
            renderer.info.reset();
            composer.render();
            if (!paused) rafId = requestAnimationFrame(animate);
        };
        applyHour(DEFAULT_HOUR, {
            force: true
        });
        resize();
        controls.update();
        renderer.info.reset();
        composer.render();
        const loading = document.getElementById("loading");
        if (loading) loading.classList.add("is-hidden");
        document.body.classList.add("is-ready");
        window.__sceneReady = true;
        rafId = requestAnimationFrame(animate);
        document.documentElement.dataset.sceneReady = "true";
    } catch (error) {
        console.error(error);
        fatal("The room could not be lit: " + (error?.message || error));
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {
        once: true
    });
} else {
    init();
}
