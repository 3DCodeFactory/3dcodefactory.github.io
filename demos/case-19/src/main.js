import * as THREE from "three";

import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";

import { RenderPass } from "three/addons/postprocessing/RenderPass.js";

import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

import { createFloorTexture, createWallTexture, createCeilingTexture, createBlackPanelTexture, createWarningDecalTexture, createNoticeTexture, createExitSignTexture, createDoorSignTexture, createFarDoorTexture, createServerDoorTextures, createMeshAlphaTexture, createRackInteriorTexture, createAssetPlateTexture, createDockBrandTexture, createDockScreenTexture, createShadowTexture, createRadialTexture, createFloorPoolTexture, createLightShaftTexture, createBaseAOStripTexture, createHazardTapeTexture, createStencilTexture, createDustTexture, createDockTagTexture, setTextureAnisotropy } from "./textures.js";

import { createBay } from "./world.js";

window.__runtimeErrors = [];

window.addEventListener("error", event => {
    window.__runtimeErrors.push(String(event.message || event.error || "unknown error"));
});

window.addEventListener("unhandledrejection", event => {
    window.__runtimeErrors.push(String(event.reason || "unhandled rejection"));
});

const params = new URLSearchParams(window.location.search);

const captureMode = params.get("capture") === "1" || params.has("capture");

const requestedDock = params.get("dock");

if (captureMode) document.documentElement.classList.add("is-capture");

const boot = document.getElementById("boot");

const bootPct = document.getElementById("boot-pct");

const failPanel = document.getElementById("webgl-fail");

const stage = document.getElementById("stage");

const mount = document.getElementById("scene-mount");

function setBoot(pct, message) {
    if (bootPct) bootPct.textContent = String(Math.round(pct)).padStart(2, "0");
    const title = boot?.querySelector(".boot-title");
    if (title && message) title.textContent = message;
}

const nextFrame = () => new Promise(resolve => requestAnimationFrame(() => resolve()));

let renderer;

try {
    renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: false,
        powerPreference: "high-performance",
        stencil: false,
        preserveDrawingBuffer: true
    });
} catch (error) {
    window.__runtimeErrors.push(`WebGL renderer creation failed: ${error}`);
    failPanel.hidden = false;
    boot.hidden = true;
    throw error;
}

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.toneMapping = THREE.ACESFilmicToneMapping;

renderer.toneMappingExposure = 1.22;

renderer.shadowMap.enabled = true;

renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.shadowMap.autoUpdate = true;

renderer.autoClear = true;

renderer.info.autoReset = false;

mount.appendChild(renderer.domElement);

const initialRect = stage.getBoundingClientRect();

renderer.setSize(initialRect.width, initialRect.height, false);

setTextureAnisotropy(renderer.capabilities.getMaxAnisotropy());

async function prepareFonts() {
    if (!document.fonts) return;
    await Promise.all([ document.fonts.load('400 16px "Helios Narrow"'), document.fonts.load('700 16px "Helios Narrow"'), document.fonts.load('400 16px "Helios Mono"'), document.fonts.load('400 58px "Helios Han"', "机器人充电区") ]).catch(() => {});
    await document.fonts.ready.catch(() => {});
}

function buildTextures() {
    return {
        floor: createFloorTexture(),
        wall: createWallTexture(),
        ceiling: createCeilingTexture(),
        blackPanel: createBlackPanelTexture(),
        warningDecal: createWarningDecalTexture(),
        noticePaper: createNoticeTexture("paper"),
        noticeDark: createNoticeTexture("dark"),
        exitSign: createExitSignTexture(),
        doorSign: createDoorSignTexture(),
        farDoor: createFarDoorTexture(),
        serverDoors: createServerDoorTextures(),
        meshAlpha: createMeshAlphaTexture(),
        rackInterior: createRackInteriorTexture(),
        plateHero: createAssetPlateTexture("HS—07", "RACK / NODE 02 / 42U"),
        plateRack: createAssetPlateTexture("HELIOS", "B3 / SERVICE RACK"),
        dockBrand: createDockBrandTexture(2),
        screenIdleHero: createDockScreenTexture("idle", 2),
        screenReadyHero: createDockScreenTexture("ready", 2),
        screenGeneric: createDockScreenTexture("idle", 3),
        shadow: createShadowTexture(),
        radial: createRadialTexture(),
        floorPool: createFloorPoolTexture(),
        lightShaft: createLightShaftTexture(),
        baseAO: createBaseAOStripTexture(),
        hazardTape: createHazardTapeTexture(),
        stencil: createStencilTexture(),
        dust: createDustTexture(),
        dockTag: createDockTagTexture()
    };
}

const GradeShader = {
    name: "HeliosGradeShader",
    uniforms: {
        tDiffuse: {
            value: null
        },
        uTime: {
            value: 0
        },
        uVignette: {
            value: .23
        },
        uGrain: {
            value: .012
        }
    },
    vertexShader: `\n    varying vec2 vUv;\n    void main() {\n      vUv = uv;\n      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n    }\n  `,
    fragmentShader: `\n    uniform sampler2D tDiffuse;\n    uniform float uTime;\n    uniform float uVignette;\n    uniform float uGrain;\n    varying vec2 vUv;\n\n    float hash(vec2 p) {\n      return fract(sin(dot(p, vec2(127.1, 311.7)) + uTime * 0.37) * 43758.5453);\n    }\n\n    void main() {\n      vec3 color = texture2D(tDiffuse, vUv).rgb;\n      float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));\n\n      // Cool the low end slightly; keep tube highlights clean and neutral.\n      color *= mix(vec3(0.972, 0.996, 1.022), vec3(1.0), smoothstep(0.02, 0.5, luma));\n\n      vec2 centered = (vUv - 0.5) * vec2(1.0, 1.07);\n      float vignette = smoothstep(0.84, 0.22, length(centered));\n      color *= mix(1.0 - uVignette, 1.0, vignette / 0.995);\n\n      float grain = hash(vUv * vec2(1931.0, 1087.0)) - 0.5;\n      color += grain * uGrain * (0.35 + 0.65 * (1.0 - smoothstep(0.0, 0.65, luma)));\n      gl_FragColor = vec4(max(color, 0.0), 1.0);\n    }\n  `
};

let composer;

let bloomPass;

let gradePass;

let bay;

let lastTime = performance.now();

let fpsEMA = 0;

let frameCount = 0;

function configurePost() {
    composer = new EffectComposer(renderer);
    const samples = Math.min(4, renderer.capabilities.maxSamples || 0);
    if (samples > 1) {
        composer.renderTarget1.samples = samples;
        composer.renderTarget2.samples = samples;
        composer.renderTarget1.dispose();
        composer.renderTarget2.dispose();
    }
    composer.addPass(new RenderPass(bay.scene, bay.camera));
    bloomPass = new UnrealBloomPass(new THREE.Vector2(stage.clientWidth, stage.clientHeight), .32, .74, .96);
    composer.addPass(bloomPass);
    gradePass = new ShaderPass(GradeShader);
    composer.addPass(gradePass);
    composer.addPass(new OutputPass);
    resize();
}

function resize() {
    if (!renderer || !bay) return;
    const rect = stage.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    bay.camera.aspect = width / height;
    bay.camera.updateProjectionMatrix();
    if (composer) {
        composer.setPixelRatio(dpr);
        composer.setSize(width, height);
    }
}

window.addEventListener("resize", resize);

if (window.ResizeObserver) {
    new ResizeObserver(() => resize()).observe(stage);
}

const raycaster = new THREE.Raycaster;

const pointer = new THREE.Vector2;

const dom = {
    dockBtn: document.getElementById("dock-button"),
    dockState: document.getElementById("dock-state"),
    dockCaption: document.getElementById("dock-caption"),
    beaconBtn: document.getElementById("beacon-button"),
    beaconState: document.getElementById("beacon-state"),
    beaconCaption: document.querySelector("#beacon-button .control-copy small"),
    linkState: document.querySelector(".telemetry-top strong"),
    liveDot: document.querySelector(".live-dot"),
    tooltip: document.getElementById("tooltip"),
    tooltipKicker: document.getElementById("tooltip-kicker"),
    tooltipMain: document.getElementById("tooltip-main"),
    hint: document.getElementById("hint-line"),
    hud: document.getElementById("hud"),
    hudToggle: document.getElementById("hud-toggle")
};

let hoveredType = null;

let pointerDownAt = null;

let pointerDownTime = 0;

function pickAt(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = (clientX - rect.left) / Math.max(1, rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
    raycaster.setFromCamera(pointer, bay.camera);
    const hits = raycaster.intersectObjects(bay.rayTargets, false);
    return hits.length ? hits[0].object : null;
}

function setHovered(type) {
    if (hoveredType === type) return;
    hoveredType = type;
    bay.setDockHovered(type === "dock");
    bay.setBeaconHovered(type === "beacon");
    renderer.domElement.classList.toggle("is-hovering", !!type);
    if (!type) {
        dom.tooltip.classList.remove("is-visible");
        return;
    }
    if (type === "dock") {
        const ready = bay.state.dockReady;
        dom.tooltipKicker.textContent = `DOCK 02 / ${ready ? "READY" : "VACANT"}`;
        dom.tooltipMain.textContent = ready ? "RELEASE CONNECTION" : "ENGAGE CHARGE PORT";
    } else {
        dom.tooltipKicker.textContent = "FAR WARNING BEACON";
        dom.tooltipMain.textContent = "RUN SIGNAL TEST";
    }
    dom.tooltip.classList.add("is-visible");
}

function positionTooltip(clientX, clientY) {
    const rect = stage.getBoundingClientRect();
    const x = THREE.MathUtils.clamp(clientX - rect.left, 8, rect.width - 210);
    const y = THREE.MathUtils.clamp(clientY - rect.top, 8, rect.height - 70);
    dom.tooltip.style.left = `${x}px`;
    dom.tooltip.style.top = `${y}px`;
}

function activate(type) {
    if (type === "dock") {
        const next = !bay.state.dockReady;
        bay.setDockReady(next);
        setHint(next ? "DOCK 02 READY · Charge link established · Reflector fields live." : "DOCK 02 RELEASED · Returned to idle standby.");
        setHovered("dock");
    } else if (type === "beacon") {
        if (bay.state.warning) return;
        bay.triggerBeacon();
    }
}

function setHint(text) {
    if (!dom.hint) return;
    dom.hint.lastElementChild.textContent = text;
}

function updateDockUI(ready) {
    dom.dockBtn.classList.toggle("is-ready", ready);
    dom.dockBtn.setAttribute("aria-pressed", String(ready));
    dom.dockState.innerHTML = `<i></i>${ready ? "READY" : "IDLE"}`;
    dom.dockCaption.textContent = ready ? "ACTIVE ROBOT CHARGE LINK" : "VACANT CHARGING PORT";
    const strong = dom.dockBtn.querySelector(".control-copy strong");
    strong.innerHTML = ready ? 'RELEASE DOCK <span class="mono">02</span>' : 'ENGAGE DOCK <span class="mono">02</span>';
    if (hoveredType === "dock") setHovered("dock");
}

function onWarningStart() {
    dom.beaconBtn.disabled = true;
    dom.beaconBtn.classList.add("is-active");
    dom.beaconState.innerHTML = "<i></i>SIGNAL";
    if (dom.beaconCaption) dom.beaconCaption.textContent = "PULSE TRAVELING DOWN AISLE";
    if (dom.linkState) {
        dom.linkState.textContent = "SIGNAL TEST";
        dom.linkState.style.color = "var(--warning)";
    }
    if (dom.liveDot) {
        dom.liveDot.style.background = "var(--warning)";
        dom.liveDot.style.boxShadow = "0 0 12px rgba(255,98,66,0.85)";
    }
    setHint("WARNING BEACON ACTIVE · Signal sweeping tray rails and cabinet edges.");
}

function onWarningEnd() {
    dom.beaconBtn.disabled = false;
    dom.beaconBtn.classList.remove("is-active");
    dom.beaconState.innerHTML = "<i></i>ARMED";
    if (dom.beaconCaption) dom.beaconCaption.textContent = "CEILING / CABINET SIGNAL";
    if (dom.linkState) {
        dom.linkState.textContent = "NOMINAL";
        dom.linkState.style.color = "";
    }
    if (dom.liveDot) {
        dom.liveDot.style.background = "";
        dom.liveDot.style.boxShadow = "";
    }
    setHint("Signal path clear. All infrastructure nominal.");
}

function setupEvents() {
    const canvas = renderer.domElement;
    canvas.addEventListener("pointermove", event => {
        if (event.pointerType === "touch") return;
        if (pointerDownAt) {
            dom.tooltip.classList.remove("is-visible");
            return;
        }
        const object = pickAt(event.clientX, event.clientY);
        const type = object ? object.userData.interactive : null;
        positionTooltip(event.clientX, event.clientY);
        setHovered(type);
    });
    canvas.addEventListener("pointerleave", () => {
        if (!pointerDownAt) setHovered(null);
        dom.tooltip.classList.remove("is-visible");
    });
    canvas.addEventListener("pointerdown", event => {
        pointerDownAt = {
            x: event.clientX,
            y: event.clientY
        };
        pointerDownTime = performance.now();
        dom.tooltip.classList.remove("is-visible");
        canvas.setPointerCapture?.(event.pointerId);
    });
    canvas.addEventListener("pointerup", event => {
        const down = pointerDownAt;
        const duration = performance.now() - pointerDownTime;
        pointerDownAt = null;
        if (down) {
            const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y);
            if (moved < 6 && duration < 720) {
                const object = pickAt(event.clientX, event.clientY);
                if (object && object.userData.interactive) activate(object.userData.interactive);
            }
        }
        try {
            canvas.releasePointerCapture?.(event.pointerId);
        } catch (_) {}
    });
    canvas.addEventListener("pointercancel", () => {
        pointerDownAt = null;
    });
    canvas.addEventListener("contextmenu", event => event.preventDefault());
    dom.dockBtn.addEventListener("click", () => activate("dock"));
    dom.beaconBtn.addEventListener("click", () => activate("beacon"));
    dom.hudToggle.addEventListener("click", () => {
        dom.hud.classList.toggle("is-hidden");
        dom.hudToggle.textContent = dom.hud.classList.contains("is-hidden") ? "SHOW HUD  H" : "HUD  H";
    });
    window.addEventListener("keydown", event => {
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        if (event.key === "1") {
            event.preventDefault();
            activate("dock");
        } else if (event.key === "2") {
            event.preventDefault();
            activate("beacon");
        } else if (event.key.toLowerCase() === "h") {
            event.preventDefault();
            dom.hud.classList.toggle("is-hidden");
            dom.hudToggle.textContent = dom.hud.classList.contains("is-hidden") ? "SHOW HUD  H" : "HUD  H";
        } else if (event.key.toLowerCase() === "r") {
            bay.resetCamera();
            dom.hud.classList.remove("is-hidden");
            dom.hudToggle.textContent = "HUD  H";
            setHint("Camera returned to Aisle 03 / Bay 07 framing.");
        }
    });
    bay.addEventListener("dockchange", event => updateDockUI(event.detail.ready));
    bay.addEventListener("warningstart", onWarningStart);
    bay.addEventListener("warningend", onWarningEnd);
}

let firstRenderDone = false;

async function bootSequence() {
    try {
        setBoot(6, "CALIBRATING AISLE");
        await nextFrame();
        await prepareFonts();
        setBoot(20, "WEAVING FLOOR TEXTURE");
        await nextFrame();
        const textures = buildTextures();
        setBoot(60, "INITIALIZING OPTICS");
        await nextFrame();
        bay = createBay(renderer, textures);
        bay.setCaptureMode(captureMode);
        if (params.get("dock") === "ready") bay.setDockReady(true);
        configurePost();
        setupEvents();
        setBoot(80, "ALIGNING CAMERA");
        await nextFrame();
        renderer.compile(bay.scene, bay.camera);
        setBoot(94, "CHARGING REFLECTORS");
        await nextFrame();
        lastTime = performance.now();
        renderer.setAnimationLoop(animate);
    } catch (error) {
        window.__runtimeErrors.push(String(error?.stack || error));
        failPanel.hidden = false;
        boot.hidden = true;
        console.error(error);
    }
}

function animate(now) {
    const dt = Math.min(.05, Math.max(1e-4, (now - lastTime) / 1e3));
    lastTime = now;
    if (dt > 0) fpsEMA = fpsEMA === 0 ? 1 / dt : THREE.MathUtils.lerp(fpsEMA, 1 / dt, .06);
    bay.update(dt);
    if (gradePass) gradePass.uniforms.uTime.value = bay.elapsed;
    renderer.info.reset();
    composer.render();
    frameCount++;
    if (!firstRenderDone && frameCount >= 2) {
        firstRenderDone = true;
        setBoot(100, "BAY ONLINE");
        window.__sceneReady = true;
        window.__sceneFrame = frameCount;
        if (!captureMode) {
            setTimeout(() => boot.classList.add("is-done"), 420);
        } else {
            boot.classList.add("is-done");
        }
        document.body.dataset.ready = "true";
    }
}

const runtimeApi = {
    get bay() {
        return bay;
    },
    get renderer() {
        return renderer;
    },
    get composer() {
        return composer;
    },
    setDockReady: value => bay?.setDockReady(value),
    toggleDock: () => bay?.setDockReady(!bay.state.dockReady),
    triggerBeacon: () => bay?.triggerBeacon(),
    resetCamera: () => bay?.resetCamera(),
    setHudVisible: visible => {
        dom.hud.classList.toggle("is-hidden", !visible);
        dom.hudToggle.textContent = visible ? "HUD  H" : "SHOW HUD  H";
    },
    getDiagnostics: () => {
        if (!bay) return null;
        const gl = renderer.getContext();
        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
        let meshes = 0, instanced = 0, points = 0, lines = 0;
        bay.scene.traverse(object => {
            if (object.isMesh && !object.isInstancedMesh) meshes++;
            if (object.isInstancedMesh) instanced++;
            if (object.isPoints) points++;
            if (object.isLine) lines++;
        });
        const camera = bay.camera;
        const target = bay.controls.target;
        return {
            threeRevision: THREE.REVISION,
            webgl: !!gl && !renderer.getContext().isContextLost(),
            webglVersion: gl ? gl.getParameter(gl.VERSION) : null,
            glslVersion: gl ? gl.getParameter(gl.SHADING_LANGUAGE_VERSION) : null,
            webglRenderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : "unavailable",
            webglVendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : "unavailable",
            stage: {
                width: stage.clientWidth,
                height: stage.clientHeight,
                aspect: stage.clientWidth / stage.clientHeight
            },
            drawingBuffer: {
                width: gl.drawingBufferWidth,
                height: gl.drawingBufferHeight
            },
            pixelRatio: renderer.getPixelRatio(),
            camera: {
                position: camera.position.toArray().map(v => Number(v.toFixed(4))),
                target: target.toArray().map(v => Number(v.toFixed(4))),
                fov: camera.fov,
                aspect: Number(camera.aspect.toFixed(4)),
                lookDirection: camera.getWorldDirection(new THREE.Vector3).toArray().map(v => Number(v.toFixed(5)))
            },
            framing: {
                aspect: "3:2",
                eyeHeightMetres: 1.62
            },
            drawCalls: renderer.info.render.calls,
            triangles: renderer.info.render.triangles,
            objectCounts: {
                meshes: meshes,
                instancedMeshes: instanced,
                points: points,
                lines: lines
            },
            sceneChildren: bay.scene.children.length,
            features: {
                planarReflection: true,
                realShadows: renderer.shadowMap.enabled,
                postProcessing: [ "UnrealBloom", "Grade", "ACESOutput" ],
                interactiveDock: true,
                warningBeaconSignal: true,
                orbitControls: true
            },
            state: {
                dockReady: bay.state.dockReady,
                dockPulse: bay.state.dockPulseActive,
                warningActive: bay.state.warning,
                warningMood: Number(bay.state.warningMood.toFixed(3)),
                warningRuns: bay.state.warningCount
            },
            fpsEMA: Number(fpsEMA.toFixed(2)),
            errors: window.__runtimeErrors
        };
    }
};

window.__bay = runtimeApi;

bootSequence();
