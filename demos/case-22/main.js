import * as THREE from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";

import { RenderPass } from "three/addons/postprocessing/RenderPass.js";

import { Pass, FullScreenQuad } from "three/addons/postprocessing/Pass.js";

import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

import { makeEnvTexture } from "./src/textures.js";

import { mergeStaticScene, mergeGroupByMaterial } from "./src/optimize.js";

import { createMaterialLibrary, buildRoom, buildBench, buildBrooch, buildLooseParts, buildTray, buildJar, buildArborStand, buildScrewdriverBlock, buildTweezers, buildWoodTool, buildLensCup, buildCable, buildPaperwork, buildLamp, buildLoupe, buildDust, buildCounterStillLife } from "./src/props.js";

const params = new URLSearchParams(window.location.search);

const CAPTURE = params.has("capture") && params.get("capture") !== "0";

if (CAPTURE) document.body.classList.add("capture");

const container = document.getElementById("stage");

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: false
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));

renderer.setSize(window.innerWidth, window.innerHeight);

renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.toneMapping = THREE.ACESFilmicToneMapping;

renderer.toneMappingExposure = 1.12;

renderer.shadowMap.enabled = true;

renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.shadowMap.autoUpdate = false;

renderer.info.autoReset = false;

renderer.transmissionResolutionScale = .65;

container.appendChild(renderer.domElement);

const scene = new THREE.Scene;

scene.background = new THREE.Color(525828);

scene.fog = new THREE.FogExp2(854278, .027);

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, .045, 32);

const HOME_POSITION = new THREE.Vector3(.18, 2.71, 6.55);

const HOME_TARGET = new THREE.Vector3(.28, .76, -.55);

camera.position.copy(HOME_POSITION);

camera.lookAt(HOME_TARGET);

const controls = new OrbitControls(camera, renderer.domElement);

controls.target.copy(HOME_TARGET);

controls.enableDamping = true;

controls.dampingFactor = .045;

controls.rotateSpeed = .48;

controls.zoomSpeed = .7;

controls.panSpeed = .55;

controls.minDistance = 1.25;

controls.maxDistance = 9.5;

controls.minPolarAngle = .46;

controls.maxPolarAngle = 1.47;

controls.minAzimuthAngle = -.72;

controls.maxAzimuthAngle = .72;

controls.screenSpacePanning = false;

controls.update();

const loadingStart = performance.now();

const textureLoader = new THREE.TextureLoader;

const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

function loadTexture(path, {srgb: srgb = false, repeat: repeat = null, aniso: aniso = maxAnisotropy} = {}) {
    return new Promise((resolve, reject) => {
        textureLoader.load(path, texture => {
            texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
            texture.anisotropy = aniso;
            if (repeat) {
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(repeat[0], repeat[1]);
            }
            texture.needsUpdate = true;
            resolve(texture);
        }, undefined, reject);
    });
}

const [benchWoodMap, benchWoodRough, drawerWoodMap, drawerWoodRough, velvetMap, velvetBump, velvetRough, labelTex, clockFaceTex, portraitTex, contactShadow, glowTex, dustTex, ...watchDialTextures] = await Promise.all([ loadTexture("./assets/bench_wood_map.png", {
    srgb: true,
    repeat: [ 1.18, 1.05 ]
}), loadTexture("./assets/bench_wood_rough.png", {
    repeat: [ 1.18, 1.05 ]
}), loadTexture("./assets/drawer_wood_map.png", {
    srgb: true,
    repeat: [ 1.3, 1 ]
}), loadTexture("./assets/drawer_wood_rough.png", {
    repeat: [ 1.3, 1 ]
}), loadTexture("./assets/velvet_map.png", {
    srgb: true,
    repeat: [ 1, 1 ]
}), loadTexture("./assets/velvet_bump.png", {
    repeat: [ 1, 1 ]
}), loadTexture("./assets/velvet_rough.png", {
    repeat: [ 1, 1 ]
}), loadTexture("./assets/labels.png", {
    srgb: true
}), loadTexture("./assets/clock_face.png", {
    srgb: true
}), loadTexture("./assets/portrait.png", {
    srgb: true
}), loadTexture("./assets/contact_shadow.png"), loadTexture("./assets/glow.png", {
    srgb: true
}), loadTexture("./assets/dust.png", {
    srgb: true
}), ...[ 0, 1, 2, 3, 4 ].map(i => loadTexture(`./assets/watch_dial_${i}.png`, {
    srgb: true
})) ]);

const cloneLinear = texture => {
    const t = texture.clone();
    t.colorSpace = THREE.NoColorSpace;
    t.needsUpdate = true;
    return t;
};

const tex = {
    benchWood: {
        map: benchWoodMap,
        bumpMap: cloneLinear(benchWoodMap),
        roughnessMap: benchWoodRough
    },
    drawerWood: {
        map: drawerWoodMap,
        bumpMap: cloneLinear(drawerWoodMap),
        roughnessMap: drawerWoodRough
    },
    velvet: {
        map: velvetMap,
        bumpMap: velvetBump,
        roughnessMap: velvetRough
    },
    labels: {
        texture: labelTex,
        cols: 8,
        rows: 8
    },
    clockFace: {
        texture: clockFaceTex
    },
    portrait: portraitTex,
    contact: contactShadow,
    glow: glowTex,
    dust: dustTex,
    watchDials: watchDialTextures
};

const mats = createMaterialLibrary(tex);

const envSource = makeEnvTexture();

const pmrem = new THREE.PMREMGenerator(renderer);

pmrem.compileEquirectangularShader();

const envRenderTarget = pmrem.fromEquirectangular(envSource);

scene.environment = envRenderTarget.texture;

scene.environmentIntensity = .9;

envSource.dispose();

pmrem.dispose();

const room = buildRoom(scene, mats, tex);

const bench = buildBench(scene, mats, tex);

const lamp = buildLamp(scene, mats, tex, [ -.66, 0, -.18 ]);

scene.add(lamp.root);

const keyLight = new THREE.SpotLight(16765092, 148, 12, .56, .82, 2);

keyLight.position.copy(lamp.bulbWorld);

keyLight.target.position.set(-.11, .02, 1.18);

keyLight.castShadow = true;

keyLight.shadow.mapSize.set(2048, 2048);

keyLight.shadow.camera.near = .25;

keyLight.shadow.camera.far = 9.5;

keyLight.shadow.bias = -18e-5;

keyLight.shadow.normalBias = .012;

keyLight.shadow.radius = 3.5;

scene.add(keyLight);

scene.add(keyLight.target);

const windowFill = new THREE.DirectionalLight(10336710, .82);

windowFill.position.set(-6.5, 5, 3);

windowFill.target.position.set(.4, .4, .4);

scene.add(windowFill);

scene.add(windowFill.target);

const bounce = new THREE.PointLight(16753510, 1.4, 5.5, 2);

bounce.position.set(-1.2, 1, .9);

scene.add(bounce);

const rim = new THREE.SpotLight(16760975, 26, 8, .52, .9, 2);

rim.position.set(3.9, 3.4, -.2);

rim.target.position.set(2.55, .15, .32);

scene.add(rim);

scene.add(rim.target);

const ambient = new THREE.HemisphereLight(8228758, 591620, .36);

scene.add(ambient);

const bulbSpill = new THREE.PointLight(16761743, 6.2, 6, 2);

bulbSpill.position.copy(lamp.bulbWorld);

scene.add(bulbSpill);

const focusLight = new THREE.PointLight(16767403, 0, 3.6, 2);

focusLight.position.set(.15, 1.65, 2.65);

scene.add(focusLight);

const jarGlint = new THREE.PointLight(16763022, 2.8, 2.4, 2);

jarGlint.position.set(-2.45, 1.35, -.85);

scene.add(jarGlint);

const benchFill = new THREE.PointLight(16762010, 3.6, 3.3, 2);

benchFill.position.set(2.45, 1.4, 1.55);

scene.add(benchFill);

const lampSheen = new THREE.SpotLight(16771021, 46, 7, .24, .65, 2);

lampSheen.position.set(.15, 4.4, 2.9);

lampSheen.target.position.set(-1.38, 2.42, -.1);

scene.add(lampSheen);

scene.add(lampSheen.target);

const clockFill = new THREE.PointLight(16766898, 2.9, 3.8, 2);

clockFill.position.set(3.6, 2.7, -1.9);

scene.add(clockFill);

const cabinetFill = new THREE.PointLight(16766120, 2.9, 4.6, 2);

cabinetFill.position.set(.7, 2.25, -1.35);

scene.add(cabinetFill);

const trayFill = new THREE.PointLight(16765606, 3.2, 2.6, 2);

trayFill.position.set(-1.7, 1.15, 1);

scene.add(trayFill);

const loupeFill = new THREE.SpotLight(16764831, 14, 4.2, .24, .82, 2);

loupeFill.position.set(1.55, 1.75, 2.25);

loupeFill.target.position.set(2.95, .4, .5);

scene.add(loupeFill);

scene.add(loupeFill.target);

const silverFill = new THREE.PointLight(16770767, 4.4, 2.2, 2);

silverFill.position.set(.12, 1.05, 2.1);

scene.add(silverFill);

const jar = buildJar(bench.root, mats, tex, [ -2.95, 0, -1.35 ]);

jar.scale.setScalar(1.3);

const tray = buildTray(bench.root, mats, tex, [ -2.75, 0, .3 ]);

tray.scale.setScalar(1.32);

tray.rotation.y = .1;

const arborStand = buildArborStand(bench.root, mats, tex, [ -.35, 0, -1.55 ]);

arborStand.scale.setScalar(1.5);

const arborStand2 = buildArborStand(bench.root, mats, tex, [ -1.28, 0, -1.72 ]);

arborStand2.scale.setScalar(1.08);

arborStand2.rotation.y = .18;

const counterStillLife = buildCounterStillLife(bench.root, mats, tex);

const screwdrivers = buildScrewdriverBlock(scene, mats, tex, [ 2.7, 0, .52 ]);

screwdrivers.scale.setScalar(.94);

screwdrivers.position.x = 2.86;

const tweezers = buildTweezers(bench.root, mats, tex, [ 1.82, .055, .68 ], -.12);

tweezers.scale.setScalar(1.35);

const woodTool = buildWoodTool(bench.root, mats, tex, [ 1.15, .058, 2.28 ], .025);

woodTool.scale.setScalar(1.17);

const loupeCup = buildLensCup(scene, mats, tex, [ .9, 0, -.58 ]);

const paper = buildPaperwork(bench.root, mats, tex, [ 1.76, .062, -.83 ]);

buildCable(bench.root, mats, tex);

const brooch = buildBrooch(bench.root, mats, tex, [ .08, .058, 1.38 ]);

brooch.scale.setScalar(.68);

const loose = buildLooseParts(scene, mats, tex, bench);

loose.root.position.set(.16, 0, -.5);

const loupe = buildLoupe(scene, mats, tex);

const dust = buildDust(scene, tex, lamp);

for (const part of loose.draggables) mergeGroupByMaterial(part.root);

const mergeStats = mergeStaticScene(scene, [ loupe.rig, ...loose.draggables.map(d => d.root) ]);

console.info(`[Atelier] static merge: ${mergeStats.sourceMeshes} meshes -> ${mergeStats.buckets} material batches`);

const lensTarget = new THREE.WebGLRenderTarget(768, 768, {
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: true,
    samples: 0
});

lensTarget.texture.name = "LoupeView";

loupe.lensUniforms.tScene.value = lensTarget.texture;

const lensCamera = new THREE.PerspectiveCamera(39, 1, .035, 15);

lensCamera.up.set(0, 0, -1);

const broochFocusPoint = new THREE.Vector3(.09, .15, 1.4);

const lensRestTarget = new THREE.Vector3(.8, .045, -.15);

const dofWidth = Math.floor(window.innerWidth * renderer.getPixelRatio());

const dofHeight = Math.floor(window.innerHeight * renderer.getPixelRatio());

const sceneDepth = new THREE.DepthTexture(dofWidth, dofHeight, THREE.UnsignedIntType);

sceneDepth.format = THREE.DepthFormat;

const renderTarget = new THREE.WebGLRenderTarget(dofWidth, dofHeight, {
    type: THREE.HalfFloatType,
    colorSpace: THREE.LinearSRGBColorSpace,
    depthBuffer: true,
    depthTexture: sceneDepth,
    samples: 0
});

class DepthOfFieldPass extends Pass {
    constructor(camera, params = {}) {
        super();
        this.camera = camera;
        this.uniforms = {
            tColor: {
                value: null
            },
            tDepth: {
                value: null
            },
            uNear: {
                value: camera.near
            },
            uFar: {
                value: camera.far
            },
            uFocus: {
                value: params.focus ?? 4.8
            },
            uAperture: {
                value: params.aperture ?? .0014
            },
            uMaxBlur: {
                value: params.maxBlur ?? .0055
            },
            uAspect: {
                value: 1.5
            }
        };
        this.material = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: `\n        varying vec2 vUv;\n        void main() {\n          vUv = uv;\n          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n        }\n      `,
            fragmentShader: `\n        #include <common>\n        #include <packing>\n        uniform sampler2D tColor;\n        uniform sampler2D tDepth;\n        uniform float uNear;\n        uniform float uFar;\n        uniform float uFocus;\n        uniform float uAperture;\n        uniform float uMaxBlur;\n        uniform float uAspect;\n        varying vec2 vUv;\n\n        void main() {\n          vec4 center = texture2D(tColor, vUv);\n          float rawDepth = texture2D(tDepth, vUv).x;\n          float viewZ = perspectiveDepthToViewZ(rawDepth, uNear, uFar);\n          float distanceToCamera = -viewZ;\n          float coc = clamp(abs(distanceToCamera - uFocus) * uAperture, 0.0, uMaxBlur);\n\n          if (coc < 0.00018) {\n            gl_FragColor = center;\n            return;\n          }\n\n          vec3 col = center.rgb;\n          float weight = 1.35;\n          for (int i = 0; i < 12; i++) {\n            float fi = float(i) + 0.5;\n            float ang = fi * 2.39996323;\n            float r = sqrt(fi / 12.0) * coc;\n            vec2 off = vec2(cos(ang), sin(ang)) * r;\n            off.x /= uAspect;\n            col += texture2D(tColor, vUv + off).rgb;\n            weight += 1.0;\n          }\n          col /= weight;\n          gl_FragColor = vec4(col, 1.0);\n        }\n      `,
            depthTest: false,
            depthWrite: false
        });
        this.fsQuad = new FullScreenQuad(this.material);
    }
    render(renderer, writeBuffer, readBuffer) {
        this.uniforms.tColor.value = readBuffer.texture;
        this.uniforms.tDepth.value = readBuffer.depthTexture;
        this.uniforms.uNear.value = this.camera.near;
        this.uniforms.uFar.value = this.camera.far;
        this.uniforms.uAspect.value = this.camera.aspect;
        this.uniforms.tDepth.value?.needsUpdate !== undefined && (this.uniforms.tDepth.value.needsUpdate = false);
        if (this.renderToScreen) renderer.setRenderTarget(null); else renderer.setRenderTarget(writeBuffer);
        if (this.clear) renderer.clear();
        this.fsQuad.render(renderer);
    }
    setSize(width, height) {
        this.uniforms.uAspect.value = width / height;
    }
    dispose() {
        this.material.dispose();
        this.fsQuad.dispose();
    }
}

const composer = new EffectComposer(renderer, renderTarget);

composer.setPixelRatio(renderer.getPixelRatio());

composer.setSize(window.innerWidth, window.innerHeight);

const renderPass = new RenderPass(scene, camera);

composer.addPass(renderPass);

const dofPass = new DepthOfFieldPass(camera, {
    focus: 4.8,
    aperture: 9e-4,
    maxBlur: .0044
});

composer.addPass(dofPass);

const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), .14, .42, 1.28);

composer.addPass(bloomPass);

const AtelierGradeShader = {
    name: "AtelierGradeShader",
    uniforms: {
        tDiffuse: {
            value: null
        },
        uTime: {
            value: 0
        },
        uResolution: {
            value: new THREE.Vector2(1, 1)
        }
    },
    vertexShader: `\n    varying vec2 vUv;\n    void main() {\n      vUv = uv;\n      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n    }\n  `,
    fragmentShader: `\n    uniform sampler2D tDiffuse;\n    uniform float uTime;\n    uniform vec2 uResolution;\n    varying vec2 vUv;\n\n    float hash(vec2 p) {\n      p = fract(p * vec2(443.897, 441.423));\n      p += dot(p, p.yx + 19.19);\n      return fract((p.x + p.y) * p.x);\n    }\n\n    void main() {\n      vec2 p = vUv - 0.5;\n      float r2 = dot(p, p);\n      // barely-there lateral chromatic error, as from a fast vintage lens\n      vec2 off = p * r2 * 0.00135;\n      vec3 col;\n      col.r = texture2D(tDiffuse, vUv - off).r;\n      col.g = texture2D(tDiffuse, vUv).g;\n      col.b = texture2D(tDiffuse, vUv + off * 1.08).b;\n\n      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));\n      // warm the upper middle, hold the shadows brown rather than blue\n      col *= vec3(1.012, 1.0, 0.972);\n      col += vec3(0.0026, 0.0028, 0.0036) * smoothstep(0.32, 0.0, luma);\n      // a gentle S curve, kept in linear space before ACES\n      col = mix(col, col * col / (col + 0.16), 0.11);\n      // old-glass vignette\n      float vig = smoothstep(0.82, 0.26, length(p * vec2(1.03, 1.0)));\n      col *= mix(0.74, 1.0, vig);\n      // fixed, fine grain: the texture of the print, not a filter\n      float grain = hash(gl_FragCoord.xy * 0.79 + uTime * 8.0) - 0.5;\n      col += grain * (0.0055 + 0.005 * smoothstep(0.55, 0.03, luma));\n      // protect absolute blacks\n      col = max(col, 0.0);\n      gl_FragColor = vec4(col, 1.0);\n    }\n  `
};

const gradePass = new ShaderPass(AtelierGradeShader);

gradePass.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);

composer.addPass(gradePass);

composer.addPass(new OutputPass);

const raycaster = new THREE.Raycaster;

const pointer = new THREE.Vector2(-10, -10);

const pointerClient = {
    x: 0,
    y: 0
};

const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -bench.matTop);

const draggableRoots = loose.draggables.map(d => d.root);

const allPickables = [ ...draggableRoots, loupe.rig ];

let loupeTargetT = 0;

let loupeT = 0;

let focusMode = false;

let hovered = null;

let dragState = null;

let pendingLoupeClick = null;

let cameraTween = null;

let viewBeforeFocus = {
    position: HOME_POSITION.clone(),
    target: HOME_TARGET.clone()
};

let lastPointerActivity = performance.now();

let diagnosticsWritten = false;

let lensDirty = true;

let lastRenderedLoupeT = -1;

let lastLensRefresh = 0;

let frozen = false;

let rafId = 0;

const tooltip = document.getElementById("tooltip");

const focusCard = document.getElementById("focusCard");

const hintbar = document.getElementById("hintbar");

const INSPECT_POSITION = new THREE.Vector3(.55, 1.7, 3.6);

const INSPECT_TARGET = new THREE.Vector3(.11, .68, 1.35);

function smoothstep(a, b, x) {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
}

function setRayFromEvent(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = (e.clientX - rect.left) / rect.width * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    pointerClient.x = e.clientX;
    pointerClient.y = e.clientY;
    raycaster.setFromCamera(pointer, camera);
}

function findInteractiveRoot(hitObject, list) {
    for (const entry of list) {
        let o = hitObject;
        while (o) {
            if (o === entry.root) return entry;
            o = o.parent;
        }
    }
    return null;
}

function isLoupePart(obj) {
    let o = obj;
    while (o) {
        if (o === loupe.rig) return true;
        o = o.parent;
    }
    return false;
}

function pickAtPointer(e) {
    setRayFromEvent(e);
    const hits = raycaster.intersectObjects(allPickables, true);
    if (!hits.length) return null;
    for (const hit of hits) {
        const entry = findInteractiveRoot(hit.object, loose.draggables);
        if (entry) return {
            kind: "part",
            entry: entry,
            point: hit.point,
            distance: hit.distance
        };
        if (isLoupePart(hit.object)) return {
            kind: "loupe",
            distance: hit.distance
        };
    }
    return null;
}

function showTooltip(text) {
    if (CAPTURE) return;
    tooltip.textContent = text;
    tooltip.style.left = `${pointerClient.x}px`;
    tooltip.style.top = `${pointerClient.y}px`;
    tooltip.classList.add("visible");
}

function hideTooltip() {
    tooltip.classList.remove("visible");
}

function beginCameraMove(toPosition, toTarget, duration = 1.8, done = null) {
    cameraTween = {
        start: performance.now(),
        duration: duration,
        fromPos: camera.position.clone(),
        fromTarget: controls.target.clone(),
        toPos: toPosition.clone(),
        toTarget: toTarget.clone(),
        done: done
    };
    controls.enabled = false;
}

function updateCameraTween(now) {
    if (!cameraTween) return;
    const t = Math.min(1, (now - cameraTween.start) / cameraTween.duration);
    const e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    camera.position.lerpVectors(cameraTween.fromPos, cameraTween.toPos, e);
    controls.target.lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, e);
    camera.lookAt(controls.target);
    if (t >= 1) {
        const done = cameraTween.done;
        cameraTween = null;
        if (!dragState && !pendingLoupeClick) controls.enabled = true;
        if (done) done();
    }
}

function enterFocusMode() {
    if (focusMode) return;
    focusMode = true;
    viewBeforeFocus = {
        position: camera.position.clone(),
        target: controls.target.clone()
    };
    loupeTargetT = 1;
    focusCard.classList.add("visible");
    beginCameraMove(INSPECT_POSITION, INSPECT_TARGET, 2.15);
    hintbar.classList.add("hidden");
    pingGlint();
}

function leaveFocusMode(returnImmediately = false) {
    if (!focusMode && loupeTargetT === 0 && !cameraTween) return;
    focusMode = false;
    loupeTargetT = 0;
    focusCard.classList.remove("visible");
    hintbar.classList.remove("hidden");
    const toPos = returnImmediately ? HOME_POSITION : viewBeforeFocus.position;
    const toTarget = returnImmediately ? HOME_TARGET : viewBeforeFocus.target;
    beginCameraMove(toPos, toTarget, returnImmediately ? 1.8 : 1.65);
}

function toggleLoupe() {
    if (focusMode) leaveFocusMode(false); else enterFocusMode();
}

function resetView() {
    focusMode = false;
    loupeTargetT = 0;
    focusCard.classList.remove("visible");
    hintbar.classList.remove("hidden");
    beginCameraMove(HOME_POSITION, HOME_TARGET, 1.65);
}

function pingGlint() {
    loupe.lensUniforms.uReflect.value = .3;
}

renderer.domElement.addEventListener("pointerdown", e => {
    if (e.button !== 0) return;
    lastPointerActivity = performance.now();
    const picked = pickAtPointer(e);
    if (picked && picked.kind === "part") {
        const entry = picked.entry;
        controls.enabled = false;
        hideTooltip();
        const part = loopFind(loose.draggables, entry);
        if (!part) return;
        const planePoint = new THREE.Vector3;
        if (raycaster.ray.intersectPlane(groundPlane, planePoint)) {
            const parent = part.root.parent;
            const localPoint = parent ? parent.worldToLocal(planePoint.clone()) : planePoint;
            dragState = {
                part: part,
                grabOffsetX: part.root.position.x - localPoint.x,
                grabOffsetZ: part.root.position.z - localPoint.z,
                lastX: part.root.position.x,
                lastZ: part.root.position.z,
                targetX: part.root.position.x,
                targetZ: part.root.position.z,
                targetLift: .055,
                startX: e.clientX,
                startY: e.clientY,
                moved: false,
                time: performance.now()
            };
            part.vx = 0;
            part.vz = 0;
            part.angVel *= .25;
            renderer.domElement.setPointerCapture?.(e.pointerId);
            renderer.domElement.style.cursor = "grabbing";
        }
        e.preventDefault();
        e.stopPropagation();
    } else if (picked && picked.kind === "loupe") {
        pendingLoupeClick = {
            x: e.clientX,
            y: e.clientY,
            id: e.pointerId
        };
        controls.enabled = false;
        renderer.domElement.style.cursor = "pointer";
        e.preventDefault();
        e.stopPropagation();
    }
}, true);

function loopFind(arr, entry) {
    for (const a of arr) if (a === entry) return a;
    return null;
}

function updateHover(e) {
    if (dragState) return;
    if (CAPTURE) {
        hideTooltip();
        return;
    }
    const picked = pickAtPointer(e);
    if (!picked) {
        hovered = null;
        renderer.domElement.style.cursor = "grab";
        hideTooltip();
        return;
    }
    if (picked.kind === "part") {
        hovered = picked.entry;
        renderer.domElement.style.cursor = "grab";
        showTooltip(picked.entry.root.userData.label || "Move the loose part");
    } else {
        hovered = {
            kind: "loupe"
        };
        renderer.domElement.style.cursor = "pointer";
        showTooltip(focusMode ? "Return to the bench" : "Swing the loupe over the ruby");
    }
}

window.addEventListener("pointermove", e => {
    lastPointerActivity = performance.now();
    pointerClient.x = e.clientX;
    pointerClient.y = e.clientY;
    if (dragState) {
        const part = dragState.part;
        setRayFromEvent(e);
        const p = new THREE.Vector3;
        if (raycaster.ray.intersectPlane(groundPlane, p)) {
            const parent = part.root.parent;
            const localPoint = parent ? parent.worldToLocal(p.clone()) : p;
            dragState.targetX = Math.max(-3, Math.min(3.1, localPoint.x + dragState.grabOffsetX));
            dragState.targetZ = Math.max(-.95, Math.min(2.6, localPoint.z + dragState.grabOffsetZ));
            if (Math.abs(e.clientX - dragState.startX) + Math.abs(e.clientY - dragState.startY) > 3) dragState.moved = true;
        }
        hideTooltip();
        e.preventDefault();
        return;
    }
    if (pendingLoupeClick) {
        if (Math.abs(e.clientX - pendingLoupeClick.x) + Math.abs(e.clientY - pendingLoupeClick.y) > 6) {
            controls.enabled = false;
        }
    }
    updateHover(e);
}, {
    passive: false
});

window.addEventListener("pointerup", e => {
    if (dragState) {
        const part = dragState.part;
        const now = performance.now();
        const dt = Math.max(.016, (now - dragState.time) / 1e3);
        const vx = (part.root.position.x - dragState.lastX) / dt;
        const vz = (part.root.position.z - dragState.lastZ) / dt;
        part.vx = Math.max(-2.2, Math.min(2.2, vx));
        part.vz = Math.max(-2.2, Math.min(2.2, vz));
        part.angVel = Math.max(-5, Math.min(5, (part.vx - part.vz) * 1.1 + (Math.random() - .5) * .6));
        part.lift = Math.max(part.lift || .05, .045);
        part.liftVel = .02;
        dragState = null;
        controls.enabled = true;
        renderer.domElement.style.cursor = "grab";
        hideTooltip();
        return;
    }
    if (pendingLoupeClick) {
        const moved = Math.abs(e.clientX - pendingLoupeClick.x) + Math.abs(e.clientY - pendingLoupeClick.y);
        pendingLoupeClick = null;
        controls.enabled = true;
        if (moved <= 7) toggleLoupe(); else {
            controls.enabled = true;
        }
    }
});

renderer.domElement.addEventListener("pointercancel", () => {
    if (dragState) {
        dragState = null;
        controls.enabled = true;
    }
    pendingLoupeClick = null;
});

document.getElementById("returnButton").addEventListener("click", () => leaveFocusMode(false));

window.addEventListener("keydown", e => {
    if (e.key === "Escape") leaveFocusMode(false); else if (e.key.toLowerCase() === "f" || e.key.toLowerCase() === "l") toggleLoupe(); else if (e.key.toLowerCase() === "r") resetView(); else if (e.key.toLowerCase() === "h") {
        document.querySelectorAll(".ui, .brand").forEach(el => el.classList.toggle("hidden"));
    }
});

function updateDraggables(dt) {
    for (const d of loose.draggables) {
        if (dragState && dragState.part === d) {
            const follow = 1 - Math.exp(-dt * 20);
            d.root.position.x += (dragState.targetX - d.root.position.x) * follow;
            d.root.position.z += (dragState.targetZ - d.root.position.z) * follow;
            d.lift = (d.lift || 0) + (.062 - (d.lift || 0)) * (1 - Math.exp(-dt * 10));
            d.root.position.y = d.baseY + (d.lift || 0);
            const dx = d.root.position.x - dragState.lastX;
            const dz = d.root.position.z - dragState.lastZ;
            d.tiltZ = Math.max(-.12, Math.min(.12, -dx * 2.4));
            d.tiltX = Math.max(-.12, Math.min(.12, dz * 2.4));
            d.root.rotation.x = d.tiltX;
            d.root.rotation.z = d.tiltZ;
            d.angVel = dx * 9 + dz * 4;
            d.root.rotation.y += d.angVel * dt * .35;
            dragState.lastX = d.root.position.x;
            dragState.lastZ = d.root.position.z;
            dragState.time = performance.now();
            continue;
        }
        if (Math.abs(d.vx) + Math.abs(d.vz) > .002) {
            d.root.position.x += d.vx * dt;
            d.root.position.z += d.vz * dt;
            const friction = Math.exp(-dt * 4.8);
            d.vx *= friction;
            d.vz *= friction;
            if (d.root.position.x < -3 || d.root.position.x > 3.1) {
                d.vx *= -.35;
                d.root.position.x = Math.max(-3, Math.min(3.1, d.root.position.x));
            }
            if (d.root.position.z < -.95 || d.root.position.z > 2.6) {
                d.vz *= -.35;
                d.root.position.z = Math.max(-.95, Math.min(2.6, d.root.position.z));
            }
        }
        if (Math.abs(d.angVel) > .002) {
            d.root.rotation.y += d.angVel * dt;
            d.angVel *= Math.exp(-dt * 3.2);
        }
        if (d.lift > .001 || d.liftVel > .001) {
            d.liftVel -= .55 * dt;
            d.lift += d.liftVel * dt;
            if (d.lift <= 0) {
                d.lift = 0;
                d.liftVel *= -.2;
                if (Math.abs(d.liftVel) < .06) {
                    d.liftVel = 0;
                }
            }
            d.root.position.y = d.baseY + d.lift;
        } else {
            d.lift = 0;
            d.liftVel = 0;
            d.root.position.y = d.baseY;
        }
        d.tiltX *= Math.exp(-dt * 7.5);
        d.tiltZ *= Math.exp(-dt * 7.5);
        d.root.rotation.x = d.tiltX;
        d.root.rotation.z = d.tiltZ;
        if (d.root.position.y < d.baseY) d.root.position.y = d.baseY;
    }
}

function updateLens(now) {
    const time = now * .001;
    loupe.update(loupeT, camera, time);
    const active = smoothstep(.72, 1, loupeT);
    loupe.lensUniforms.uClarity.value = .36 + active * .62;
    const target = lensRestTarget.clone().lerp(broochFocusPoint, active);
    lensCamera.fov = 42 - active * 12;
    const toViewer = camera.position.clone().sub(loupe.lensAssembly.position).normalize();
    toViewer.y = Math.max(.26, toViewer.y);
    toViewer.normalize();
    lensCamera.position.copy(loupe.lensAssembly.position).addScaledVector(toViewer, .62 + active * .1).add(new THREE.Vector3(0, .08 + active * .02, 0));
    lensCamera.up.set(0, 0, -1);
    lensCamera.lookAt(target);
    lensCamera.updateProjectionMatrix();
    lensCamera.updateMatrixWorld();
    focusLight.intensity += (active * 1.4 - focusLight.intensity) * .075;
    focusLight.position.x = -.02 + active * .88 + Math.sin(time * .37) * active * .09;
    focusLight.position.y = 1.4 + active * .12 + Math.cos(time * .29) * active * .05;
    focusLight.position.z = 2.4 - active * .55 + Math.sin(time * .23) * active * .1;
    loupe.lensUniforms.uReflect.value = THREE.MathUtils.clamp((camera.position.x - .2) * .65 + Math.sin(time * .11) * .08, -1, 1);
}

function renderLensView(force = false) {
    if (!force && !lensDirty) return;
    const priorVisible = loupe.rig.visible;
    loupe.rig.visible = false;
    dust.points.visible = false;
    const dimmed = [ keyLight, windowFill, bounce, rim, ambient, bulbSpill, jarGlint, benchFill, lampSheen, clockFill, cabinetFill, trayFill, loupeFill, silverFill ];
    const saved = dimmed.map(l => l.intensity);
    for (const l of dimmed) {
        const k = l === keyLight ? .18 : l === windowFill ? .9 : l === ambient ? .45 : .14;
        l.intensity *= k;
    }
    const savedFocus = focusLight.intensity;
    focusLight.intensity = 3.6;
    const savedVelvet = mats.velvet.color.clone();
    mats.velvet.color.multiplyScalar(.16);
    const savedPlat = mats.platinum.envMapIntensity;
    const savedPlatDark = mats.platinumDark.envMapIntensity;
    const savedRuby = mats.ruby.envMapIntensity;
    mats.platinum.envMapIntensity = 5.2;
    mats.platinumDark.envMapIntensity = 2.6;
    mats.ruby.envMapIntensity = 4.2;
    renderer.setRenderTarget(lensTarget);
    renderer.clear();
    renderer.render(scene, lensCamera);
    renderer.setRenderTarget(null);
    focusLight.intensity = savedFocus;
    mats.velvet.color.copy(savedVelvet);
    mats.platinum.envMapIntensity = savedPlat;
    mats.platinumDark.envMapIntensity = savedPlatDark;
    mats.ruby.envMapIntensity = savedRuby;
    for (let i = 0; i < dimmed.length; i++) dimmed[i].intensity = saved[i];
    loupe.rig.visible = priorVisible;
    dust.points.visible = true;
    lensDirty = false;
    lastRenderedLoupeT = loupeT;
}

let last = performance.now();

let frames = 0;

let lastFrameStats = {
    calls: 0,
    triangles: 0
};

let autoUIHidden = false;

function animate() {
    if (frozen) return;
    rafId = requestAnimationFrame(animate);
    renderer.info.reset();
    const now = performance.now();
    const dt = Math.min(.05, (now - last) / 1e3);
    last = now;
    updateCameraTween(now);
    const speed = focusMode ? .62 : .72;
    loupeT += (loupeTargetT - loupeT) * (1 - Math.exp(-dt * speed * 3.1));
    if (Math.abs(loupeTargetT - loupeT) < 7e-4) loupeT = loupeTargetT;
    updateDraggables(dt);
    if (Math.abs(loupeT - lastRenderedLoupeT) > .0011) lensDirty = true;
    if (loupeT > .55 && now - lastLensRefresh > 240) {
        lensDirty = true;
        lastLensRefresh = now;
    }
    updateLens(now);
    const pos = dust.positions;
    for (let i = 0; i < dust.count; i++) {
        pos[i * 3 + 1] += Math.sin(now * 17e-5 + i * 4.2) * 35e-6;
        pos[i * 3] += Math.cos(now * 21e-5 + i * 2.7) * 25e-6;
        if (pos[i * 3 + 1] > 2.35) pos[i * 3 + 1] = .2;
        if (pos[i * 3 + 1] < .16) pos[i * 3 + 1] = 2.3;
    }
    dust.points.geometry.attributes.position.needsUpdate = true;
    if (!CAPTURE) {
        if (!autoUIHidden && now - lastPointerActivity > 13e3) {
            autoUIHidden = true;
            hintbar.classList.add("hidden");
        }
    }
    camera.updateMatrixWorld();
    const focusWorld = broochFocusPoint.clone();
    if (loupeT > .001) {
        const lensWorld = new THREE.Vector3;
        loupe.lensAssembly.getWorldPosition(lensWorld);
        focusWorld.lerp(lensWorld, smoothstep(.15, .8, loupeT) * .9);
    }
    const focusView = focusWorld.applyMatrix4(camera.matrixWorldInverse);
    dofPass.uniforms.uFocus.value = Math.max(1, -focusView.z);
    dofPass.uniforms.uAperture.value = 9e-4 + (1 - loupeT) * 18e-5;
    gradePass.uniforms.uTime.value = now * .001;
    if (controls.enabled) controls.update();
    renderLensView();
    composer.render();
    lastFrameStats = {
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles
    };
    if (dragState || Math.abs(loupeTargetT - loupeT) > .004) {
        renderer.shadowMap.needsUpdate = true;
    }
    frames++;
    if (!window.__SCENE_READY__ && frames >= (CAPTURE ? 1 : 3)) {
        window.__SCENE_READY__ = true;
        const loader = document.getElementById("loader");
        loader.classList.add("done");
        if (CAPTURE) {
            loader.style.transition = "none";
            loader.style.display = "none";
            cancelAnimationFrame(rafId);
            frozen = true;
        }
        window.__BUILD_TIME_MS__ = Math.round(performance.now() - loadingStart);
        exposeDiagnostics();
    }
}

function onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
    bloomPass.setSize(w, h);
    dofPass.setSize(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
    gradePass.uniforms.uResolution.value.set(w, h);
}

window.addEventListener("resize", onResize);

function countScene() {
    let meshes = 0, points = 0, instanced = 0, lightCount = 0;
    scene.traverse(o => {
        if (o.isMesh) meshes++;
        if (o.isInstancedMesh) instanced++;
        if (o.isPoints) points++;
        if (o.isLight) lightCount++;
    });
    return {
        meshes: meshes,
        points: points,
        instancedMeshes: instanced,
        lights: lightCount
    };
}

function collectDiagnostics() {
    const gl = renderer.getContext();
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const info = renderer.info;
    return {
        threeRevision: THREE.REVISION,
        webglVersion: gl instanceof WebGL2RenderingContext ? 2 : 1,
        renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
        drawingBuffer: `${gl.drawingBufferWidth}x${gl.drawingBufferHeight}`,
        canvasCSS: `${renderer.domElement.clientWidth}x${renderer.domElement.clientHeight}`,
        pixelRatio: renderer.getPixelRatio(),
        framesRendered: frames,
        camera: {
            position: camera.position.toArray().map(n => +n.toFixed(4)),
            target: controls.target.toArray().map(n => +n.toFixed(4)),
            fov: camera.fov,
            aspect: +camera.aspect.toFixed(4),
            near: camera.near,
            far: camera.far
        },
        scene: countScene(),
        triangles: lastFrameStats.triangles,
        drawCalls: lastFrameStats.calls,
        lensTarget: `${lensTarget.width}x${lensTarget.height}`,
        transmissionResolutionScale: renderer.transmissionResolutionScale,
        textures: info.memory.textures,
        geometries: info.memory.geometries,
        buildTimeMs: window.__BUILD_TIME_MS__,
        interactions: {
            orbitControls: true,
            loupe: "click loupe or press F; Esc returns to bench",
            draggableParts: loose.draggables.length,
            focusMode: focusMode,
            loupeEngaged: +loupeT.toFixed(3)
        },
        webglError: gl.getError()
    };
}

function exposeDiagnostics() {
    window.__ATELIER_DIAGNOSTICS__ = collectDiagnostics();
    window.atelier = {
        scene: scene,
        camera: camera,
        controls: controls,
        renderer: renderer,
        composer: composer,
        lamps: {
            keyLight: keyLight,
            focusLight: focusLight
        },
        parts: loose.draggables,
        loupe: loupe,
        brooch: brooch,
        mats: mats,
        resetView: resetView,
        enterFocusMode: enterFocusMode,
        leaveFocusMode: leaveFocusMode,
        toggleLoupe: toggleLoupe,
        freeze() {
            frozen = true;
            cancelAnimationFrame(rafId);
        },
        refreshDiagnostics() {
            window.__ATELIER_DIAGNOSTICS__ = collectDiagnostics();
            return window.__ATELIER_DIAGNOSTICS__;
        },
        get diagnostics() {
            return window.__ATELIER_DIAGNOSTICS__;
        }
    };
}

const START_FOCUS = params.has("focus");

if (START_FOCUS) {
    focusMode = true;
    loupeTargetT = 1;
    loupeT = 1;
    camera.position.copy(INSPECT_POSITION);
    controls.target.copy(INSPECT_TARGET);
    camera.lookAt(controls.target);
    controls.update();
    focusCard.classList.add("visible");
    hintbar.classList.add("hidden");
}

renderer.shadowMap.needsUpdate = true;

updateLens(performance.now());

if (START_FOCUS) {
    focusLight.intensity = 1.4;
    focusLight.position.set(.86, 1.52, 1.85);
}

renderLensView(true);

window.__SCENE_READY_LENS__ = true;

animate();

document.getElementById("loader").addEventListener("transitionend", () => {
    document.getElementById("loader").style.display = "none";
}, {
    once: true
});
