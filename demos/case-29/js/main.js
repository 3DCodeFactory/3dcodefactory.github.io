import * as THREE from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";

import { RenderPass } from "three/addons/postprocessing/RenderPass.js";

import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

import { FXAAPass } from "three/addons/postprocessing/FXAAPass.js";

import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";

import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

import { createTextureLibrary } from "./textures.js";

import { createMaterials } from "./materials.js";

import { buildHall, HALL, WINDOW } from "./world.js";

import { buildStaircase, buildWorkbench, buildValveAssembly, buildRightSide, buildWallDressing } from "./props.js";

import { buildMachinery } from "./machinery.js";

import { WaterSystem } from "./water.js";

import { clamp, damp, smoothstep } from "./lib.js";

const VIEW = {
    fov: 52,
    near: .08,
    far: 95,
    position: new THREE.Vector3(0, 2.22, 11.6),
    target: new THREE.Vector3(-.72, 3.32, -4),
    aspect: 1.5
};

const state = {
    ready: false,
    elapsed: 0,
    frames: 0,
    valveAngle: 0,
    valveTarget: 0,
    valveOpen: 0,
    pressure: 0,
    pressureDisplay: 0,
    draggingValve: false,
    pointerDown: false,
    lastPointer: new THREE.Vector2,
    lastDisturb: 0,
    hoverValve: false,
    viewTween: null,
    errors: []
};

const dom = {
    app: document.getElementById("app"),
    scene: document.getElementById("scene"),
    loader: document.getElementById("loader"),
    hud: document.getElementById("hud"),
    tooltip: document.getElementById("tooltip"),
    soundBtn: document.getElementById("btn-sound"),
    resetBtn: document.getElementById("btn-reset"),
    valveBtn: document.getElementById("btn-valve"),
    valveState: document.getElementById("valve-state"),
    valvePercent: document.getElementById("valve-percent"),
    valveFill: document.getElementById("valve-fill"),
    valvePanel: document.getElementById("valve-panel"),
    pressure: document.getElementById("pressure"),
    noWebGL: document.getElementById("no-webgl")
};

const params = new URLSearchParams(window.location.search);

const cleanCapture = params.get("capture") === "1" || params.get("clean") === "1";

if (cleanCapture) document.body.classList.add("capture");

let renderer;

try {
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
        alpha: false,
        stencil: false,
        preserveDrawingBuffer: true
    });
} catch (err) {
    showFatal(err);
    throw err;
}

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));

renderer.setSize(window.innerWidth, window.innerHeight);

renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.toneMapping = THREE.ACESFilmicToneMapping;

renderer.toneMappingExposure = 1.16;

renderer.shadowMap.enabled = true;

renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.setClearColor(461323, 1);

dom.scene.appendChild(renderer.domElement);

renderer.domElement.setAttribute("tabindex", "0");

renderer.domElement.setAttribute("aria-label", "Orbitable 3D scene. Drag to inspect, scroll to move, click the water to ripple.");

const scene = new THREE.Scene;

scene.background = new THREE.Color(461323);

scene.fog = new THREE.FogExp2(3487536, .0145);

const camera = new THREE.PerspectiveCamera(VIEW.fov, window.innerWidth / window.innerHeight, VIEW.near, VIEW.far);

camera.position.copy(VIEW.position);

const controls = new OrbitControls(camera, renderer.domElement);

controls.target.copy(VIEW.target);

controls.enableDamping = true;

controls.dampingFactor = .055;

controls.rotateSpeed = .52;

controls.zoomSpeed = .7;

controls.panSpeed = .45;

controls.enablePan = false;

controls.minDistance = 2.4;

controls.maxDistance = 29;

controls.minPolarAngle = .39;

controls.maxPolarAngle = Math.PI * .552;

controls.target.y = Math.max(1.1, controls.target.y);

controls.update();

renderer.domElement.style.cursor = "grab";

RectAreaLightUniformsLib.init();

let T, M, hall, stair, bench, valve, rightSide, machinery, water;

try {
    T = createTextureLibrary(renderer);
    M = createMaterials(T);
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const envRT = pmrem.fromEquirectangular(T.envTex);
    scene.environment = envRT.texture;
    scene.environmentIntensity = .65;
    T.envTex.dispose();
    pmrem.dispose();
    hall = buildHall(scene, T, M);
    stair = buildStaircase(T, M);
    scene.add(stair.group);
    bench = buildWorkbench(T, M);
    scene.add(bench.group);
    valve = buildValveAssembly(T, M);
    scene.add(valve.group);
    rightSide = buildRightSide(T, M);
    scene.add(rightSide.group);
    const wallDressing = buildWallDressing(T, M);
    scene.add(wallDressing);
    machinery = buildMachinery(T, M);
    machinery.engineGroup.scale.setScalar(1.32);
    machinery.engineGroup.position.z += .9;
    scene.add(machinery.group);
    if (params.get("nomerge") !== "1") {
        mergeStaticByMaterial(scene, [ valve.wheelGroup, valve.hit, valve.gauge.userData.needlePivot, machinery.animated.flywheel, machinery.animated.flywheel2, machinery.animated.crosshead, machinery.animated.lever, machinery.animated.connectingRod, machinery.animated.pumpGaugeNeedle, machinery.animated.secondaryNeedle, ...machinery.animated.consoleNeedles ]);
    }
    setupLighting();
    water = new WaterSystem(renderer, scene, camera, T, {
        y: .026,
        nx: 160,
        nz: 256
    });
    water.setAgitation(.025);
    water.setValvePressure(0);
    if (params.get("nowater") === "1") water.mesh.visible = false;
    if (params.get("debugrefl") === "1") water.material.uniforms.uDebugReflection.value = 1;
    if (params.get("debugwater") === "alpha") water.material.uniforms.uDebugReflection.value = 2;
    if (params.get("combined") === "0") water.material.uniforms.uCombinedFloor.value = 0;
} catch (err) {
    showFatal(err);
    throw err;
}

function mergeStaticByMaterial(scene, dynamicRoots = []) {
    scene.updateMatrixWorld(true);
    const dynamic = new Set(dynamicRoots.filter(Boolean));
    const buckets = new Map;
    const originals = [];
    function underDynamic(obj) {
        let p = obj;
        while (p) {
            if (dynamic.has(p)) return true;
            p = p.parent;
        }
        return false;
    }
    scene.traverse(obj => {
        if (!obj.isMesh || obj.isInstancedMesh || obj.isSkinnedMesh) return;
        if (!obj.geometry || !obj.material || Array.isArray(obj.material)) return;
        if (obj.material.isShaderMaterial) return;
        if (obj.userData.excludeFromMerge) return;
        if (underDynamic(obj)) return;
        if (obj.onBeforeRender !== THREE.Mesh.prototype.onBeforeRender) return;
        const mat = obj.material;
        const key = `${mat.uuid}|${obj.castShadow ? 1 : 0}|${obj.receiveShadow ? 1 : 0}|${obj.renderOrder}`;
        let bucket = buckets.get(key);
        if (!bucket) {
            bucket = {
                material: mat,
                cast: obj.castShadow,
                receive: obj.receiveShadow,
                order: obj.renderOrder,
                geos: []
            };
            buckets.set(key, bucket);
        }
        let geo = obj.geometry.index ? obj.geometry.toNonIndexed() : obj.geometry.clone();
        geo.applyMatrix4(obj.matrixWorld);
        if (!geo.attributes.normal) geo.computeVertexNormals();
        if (!geo.attributes.uv) {
            geo.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
        }
        for (const name of Object.keys(geo.attributes)) {
            if (name !== "position" && name !== "normal" && name !== "uv") geo.deleteAttribute(name);
        }
        geo.morphAttributes = {};
        bucket.geos.push(geo);
        originals.push(obj);
    });
    let mergedCount = 0;
    let removed = 0;
    const added = [];
    for (const bucket of buckets.values()) {
        if (bucket.geos.length === 0) continue;
        const mergedGeo = mergeGeometries(bucket.geos, false);
        if (!mergedGeo) {
            for (const g of bucket.geos) g.dispose();
            continue;
        }
        mergedGeo.computeBoundingSphere();
        const m = new THREE.Mesh(mergedGeo, bucket.material);
        m.castShadow = bucket.cast;
        m.receiveShadow = bucket.receive;
        m.renderOrder = bucket.order;
        m.matrixAutoUpdate = false;
        m.updateMatrix();
        m.name = `Batched_${bucket.material.name || bucket.material.type}`;
        scene.add(m);
        added.push(m);
        mergedCount += bucket.geos.length;
        for (const g of bucket.geos) g.dispose();
    }
    for (const obj of originals) {
        if (obj.parent) obj.parent.remove(obj);
        removed++;
    }
    scene.updateMatrixWorld(true);
    window.__MERGE_STATS__ = {
        sourceMeshes: mergedCount,
        batches: added.length,
        removed: removed,
        drawCallsBefore: originals.length
    };
    console.info(`[Riverdale] merged ${mergedCount} static meshes into ${added.length} material batches`);
}

function setupLighting() {
    const hemi = new THREE.HemisphereLight(11845056, 2894628, 1.15);
    scene.add(hemi);
    const amb = new THREE.AmbientLight(4870996, 1);
    scene.add(amb);
    const key = new THREE.DirectionalLight(13949397, .9);
    key.position.set(3.6, 16.5, -15);
    key.target.position.set(-1.8, 0, 2);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -14;
    key.shadow.camera.right = 14;
    key.shadow.camera.top = 18;
    key.shadow.camera.bottom = -6;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 60;
    key.shadow.bias = -6e-4;
    key.shadow.normalBias = .035;
    key.shadow.radius = 3.5;
    scene.add(key);
    scene.add(key.target);
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    if (params.get("noarea") !== "1") for (const cx of WINDOW.centers) {
        const area = new THREE.RectAreaLight(13949394, 1, WINDOW.width * .96, 10.9);
        area.position.set(cx, 9.6, HALL.farZ + .4);
        area.lookAt(cx * .25, 6.8, 4);
        scene.add(area);
    }
    if (params.get("noarea") !== "1") {
        const upperArea = new THREE.RectAreaLight(13225672, 1.6, 8.2, 2.9);
        upperArea.position.set(0, 18.5, HALL.farZ + .4);
        upperArea.lookAt(0, 10, 0);
        scene.add(upperArea);
    }
    for (const [i, cx] of WINDOW.centers.entries()) {
        const spot = new THREE.SpotLight(13949135, 33, 50, .4, .9, 1.55);
        spot.position.set(cx, 12.4, HALL.farZ + .55);
        spot.target.position.set(cx * .55, 0, 1.8 + i * .3);
        scene.add(spot);
        scene.add(spot.target);
        const spot2 = new THREE.SpotLight(13225668, 14, 30, .55, 1, 1.9);
        spot2.position.set(cx * .6, 9.2, -13);
        spot2.target.position.set(cx * .2, .2, 0);
        scene.add(spot2);
        scene.add(spot2.target);
    }
    if (rightSide?.lampLight) {
        rightSide.lampLight.intensity = 1.2;
        rightSide.lampLight.distance = 7.5;
        rightSide.lampLight.decay = 2;
    }
    if (bench?.benchLight) {
        bench.benchLight.intensity = 8;
        bench.benchLight.distance = 7.5;
    }
    const plaqueLight = new THREE.PointLight(16762506, 2, 3.2, 2);
    plaqueLight.position.set(6.28, 3.65, -2.05);
    scene.add(plaqueLight);
    const rim = new THREE.DirectionalLight(9676459, .36);
    rim.position.set(-4, 7, 11);
    rim.target.position.set(4, 3, -6);
    scene.add(rim);
    scene.add(rim.target);
    const warmBounce = new THREE.PointLight(14394216, 11, 8, 2);
    warmBounce.position.set(-2.4, 2, 4.9);
    scene.add(warmBounce);
    const foregroundFill = new THREE.PointLight(11451317, 3.8, 13, 2);
    foregroundFill.position.set(-1.2, 4, 6.4);
    scene.add(foregroundFill);
    const stairDetail = new THREE.SpotLight(12175043, 2.2, 11, .52, 1, 1.5);
    stairDetail.position.set(1.4, 7.4, 4.8);
    stairDetail.target.position.set(-4.1, 4.7, 1.7);
    scene.add(stairDetail);
    scene.add(stairDetail.target);
    const stairFill = new THREE.SpotLight(12240061, 3.6, 15, .78, 1, 1.55);
    stairFill.position.set(-.4, 5.8, 5.5);
    stairFill.target.position.set(-4.45, 2.8, 2);
    scene.add(stairFill);
    scene.add(stairFill.target);
    const mapLight = new THREE.PointLight(13880245, 4.5, 4.8, 2);
    mapLight.position.set(-5.7, 4.7, 1.7);
    scene.add(mapLight);
    const underStair = new THREE.PointLight(11974308, 7, 7, 2);
    underStair.position.set(-3.9, 1, 3.6);
    scene.add(underStair);
    const engineFill = new THREE.SpotLight(12767944, 430, 28, .48, 1, 1.55);
    engineFill.position.set(2.2, 5, 3.8);
    engineFill.target.position.set(2.4, 1.7, -8.6);
    scene.add(engineFill);
    scene.add(engineFill.target);
    const upperSpill = new THREE.PointLight(12370618, 36, 26, 2);
    upperSpill.position.set(.5, 16.5, -15);
    scene.add(upperSpill);
    const windowWash = new THREE.PointLight(13817291, 34, 20, 2);
    windowWash.position.set(0, 8, -14.4);
    scene.add(windowWash);
    const jambL = new THREE.PointLight(13488327, 26, 7, 2);
    jambL.position.set(-2.9, 7.2, -18);
    scene.add(jambL);
    const jambR = new THREE.PointLight(13488327, 26, 7, 2);
    jambR.position.set(2.9, 7.2, -18);
    scene.add(jambR);
    for (const cx of [ -2.9, 2.9 ]) {
        const sill = new THREE.PointLight(13226956, 28, 6.5, 2);
        sill.position.set(cx, 4.2, -16.6);
        scene.add(sill);
    }
    const farWash = new THREE.SpotLight(14145225, 170, 32, .82, 1, 1.3);
    farWash.position.set(0, 6, -7);
    farWash.target.position.set(0, 9, HALL.farZ);
    scene.add(farWash);
    scene.add(farWash.target);
    const stoneRim = new THREE.SpotLight(11715518, 22, 28, .78, 1, 1.5);
    stoneRim.position.set(2.2, 6.5, 6.5);
    stoneRim.target.position.set(6.6, 5.3, -4);
    scene.add(stoneRim);
    scene.add(stoneRim.target);
    const engineGlow = new THREE.PointLight(13161929, 68, 11, 2);
    engineGlow.position.set(2.6, 3.4, -5.2);
    scene.add(engineGlow);
    const windowBounce = new THREE.PointLight(12767436, 42, 18, 2);
    windowBounce.position.set(0, 4.2, -11.5);
    scene.add(windowBounce);
    const naveFill = new THREE.PointLight(10924721, 28, 17, 2);
    naveFill.position.set(0, 8.8, -1.2);
    scene.add(naveFill);
    const lampBounce = new THREE.PointLight(16758129, 15, 7, 2);
    lampBounce.position.set(5.2, .55, -1.2);
    scene.add(lampBounce);
}

const renderTarget = new THREE.WebGLRenderTarget(Math.round(window.innerWidth * renderer.getPixelRatio()), Math.round(window.innerHeight * renderer.getPixelRatio()), {
    type: THREE.HalfFloatType,
    samples: 0
});

const composer = new EffectComposer(renderer, renderTarget);

composer.setPixelRatio(renderer.getPixelRatio());

const renderPass = new RenderPass(scene, camera);

composer.addPass(renderPass);

const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), .075, .46, 1.05);

composer.addPass(bloom);

const outputPass = new OutputPass;

composer.addPass(outputPass);

const fxaaPass = new FXAAPass;

composer.addPass(fxaaPass);

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
        uGrain: {
            value: .012
        },
        uVignette: {
            value: .16
        }
    },
    vertexShader: `\n    varying vec2 vUv;\n    void main() {\n      vUv = uv;\n      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n    }\n  `,
    fragmentShader: `\n    uniform sampler2D tDiffuse;\n    uniform float uTime;\n    uniform vec2 uResolution;\n    uniform float uGrain;\n    uniform float uVignette;\n    varying vec2 vUv;\n\n    float pHash(vec2 p) {\n      p = fract(p * vec2(123.34, 456.21));\n      p += dot(p, p + 45.32);\n      return fract(p.x * p.y);\n    }\n\n    void main() {\n      vec4 tex = texture2D(tDiffuse, vUv);\n      vec3 col = tex.rgb;\n\n      // Archival split-tone: green-grey damp shadows, warm lamp-lit stone.\n      float luma = dot(col, vec3(0.299, 0.587, 0.114));\n      col += vec3(-0.008, 0.003, 0.007) * (1.0 - smoothstep(0.0, 0.5, luma));\n      col += vec3(0.009, 0.005, 0.000) * smoothstep(0.35, 1.0, luma);\n      col += vec3(0.010, 0.006, 0.001) * smoothstep(0.12, 0.45, luma) * (1.0 - smoothstep(0.62, 0.92, luma));\n      col = mix(vec3(luma), col, 1.18);\n      col = pow(max(col, 0.0), vec3(0.885, 0.878, 0.900));\n      col *= vec3(1.012, 0.998, 0.996);\n\n      // A restrained lens falloff, offset a touch to preserve the dark right edge.\n      vec2 p = vUv - vec2(0.49, 0.50);\n      p.x *= uResolution.x / max(1.0, uResolution.y) * 0.78;\n      float vig = smoothstep(0.73, 0.16, length(p));\n      col *= mix(1.0, vig, uVignette);\n\n      // A soft filmic toe: keep the damp shadows from going to pure black.\n      col = col * 0.986 + vec3(0.012, 0.013, 0.013);\n\n      // Film grain, with more grain in the shadows.\n      float n = pHash(vUv * uResolution + fract(uTime) * 91.7) - 0.5;\n      col += n * uGrain * (0.5 + 1.0 * (1.0 - luma));\n\n      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);\n    }\n  `
};

const gradePass = new ShaderPass(GradeShader);

gradePass.material.toneMapped = false;

composer.addPass(gradePass);

renderer.info.autoReset = false;

class DripSystem {
    constructor(scene, water) {
        this.scene = scene;
        this.water = water;
        this.drops = [];
        this.emitters = [];
        const positions = [ [ -1.3, 12.8, -4.2 ], [ 2.5, 11.2, -10.8 ], [ -4.2, 13.5, -8.9 ], [ .6, 9.8, -13.5 ], [ 4.5, 12.2, -4.9 ], [ -2.4, 8.2, 1 ], [ 4.8, 14, -8 ] ];
        const mat = new THREE.MeshBasicMaterial({
            color: 12046035,
            transparent: true,
            opacity: .55,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        this.dropMat = mat;
        this.geo = new THREE.SphereGeometry(.012, 5, 4);
        const r = Math.random;
        positions.forEach((p, i) => {
            this.emitters.push({
                pos: new THREE.Vector3(...p),
                interval: 3.2 + r() * 6.8,
                next: 1.2 + r() * 5,
                active: null
            });
        });
    }
    update(dt, elapsed) {
        for (const e of this.emitters) {
            if (!e.active) {
                e.next -= dt;
                if (e.next <= 0) {
                    const mesh = new THREE.Mesh(this.geo, this.dropMat.clone());
                    mesh.position.copy(e.pos);
                    mesh.scale.set(.8, 2.4, .8);
                    mesh.userData.vy = 0;
                    this.scene.add(mesh);
                    e.active = mesh;
                    e.next = e.interval * (.65 + Math.random() * .7);
                }
            } else {
                const m = e.active;
                m.userData.vy -= 9.2 * dt;
                m.position.y += m.userData.vy * dt;
                m.position.x += Math.sin(elapsed * .6 + e.pos.x) * .0015;
                m.scale.y = 1.8 + Math.abs(m.userData.vy) * .08;
                if (m.position.y <= this.water.floorY + .03) {
                    this.water.addRippleWorld(m.position.x, m.position.z, .055 + Math.random() * .06, 1.35);
                    audioEngine.drip(.45);
                    this.scene.remove(m);
                    m.material.dispose();
                    e.active = null;
                }
            }
        }
    }
}

class SplashSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.geo = new THREE.SphereGeometry(.009, 4, 3);
        this.mat = new THREE.MeshBasicMaterial({
            color: 11193298,
            transparent: true,
            opacity: .45,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
    }
    burst(x, z, strength = .4) {
        const count = 3 + Math.floor(strength * 8);
        for (let i = 0; i < count; i++) {
            const m = new THREE.Mesh(this.geo, this.mat.clone());
            m.position.set(x + (Math.random() - .5) * .12, .03, z + (Math.random() - .5) * .12);
            m.userData.v = new THREE.Vector3((Math.random() - .5) * .24, .25 + Math.random() * .38 * strength, (Math.random() - .5) * .24);
            m.userData.life = .5 + Math.random() * .5;
            this.scene.add(m);
            this.particles.push(m);
        }
    }
    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.userData.life -= dt;
            p.userData.v.y -= 5.5 * dt;
            p.position.addScaledVector(p.userData.v, dt);
            p.material.opacity = Math.max(0, p.userData.life * .7);
            if (p.userData.life <= 0 || p.position.y < this.scene.userData?.waterY || p.position.y < .01) {
                this.scene.remove(p);
                p.material.dispose();
                this.particles.splice(i, 1);
            }
        }
    }
}

class AudioEngine {
    constructor() {
        this.ctx = null;
        this.enabled = false;
        this.master = null;
        this.windGain = null;
        this.humGain = null;
        this.humOsc = null;
    }
    async init() {
        if (this.ctx) return;
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx;
        this.ctx = ctx;
        this.master = ctx.createGain();
        this.master.gain.value = 0;
        this.master.connect(ctx.destination);
        const conv = ctx.createConvolver();
        const len = Math.floor(ctx.sampleRate * 3.1);
        const impulse = ctx.createBuffer(2, len, ctx.sampleRate);
        for (let c = 0; c < 2; c++) {
            const d = impulse.getChannelData(c);
            for (let i = 0; i < len; i++) {
                const t = i / ctx.sampleRate;
                d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2) * Math.exp(-t * .55);
            }
        }
        conv.buffer = impulse;
        const wet = ctx.createGain();
        wet.gain.value = .46;
        conv.connect(wet).connect(this.master);
        this.reverb = conv;
        const bufferSize = ctx.sampleRate * 4;
        const noiseBuf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const nd = noiseBuf.getChannelData(0);
        let last = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            last = last * .985 + white * .015;
            nd[i] = last * 4.2;
        }
        const wind = ctx.createBufferSource();
        wind.buffer = noiseBuf;
        wind.loop = true;
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 390;
        lp.Q.value = .3;
        this.windGain = ctx.createGain();
        this.windGain.gain.value = .16;
        wind.connect(lp).connect(this.windGain).connect(this.master);
        const hpSource = ctx.createBufferSource();
        hpSource.buffer = noiseBuf;
        hpSource.loop = true;
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = 1700;
        bp.Q.value = .42;
        const hg = ctx.createGain();
        hg.gain.value = .016;
        hpSource.connect(bp).connect(hg).connect(this.master);
        wind.start();
        hpSource.start();
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = 38;
        const osc2 = ctx.createOscillator();
        osc2.type = "triangle";
        osc2.frequency.value = 76;
        const humFilter = ctx.createBiquadFilter();
        humFilter.type = "lowpass";
        humFilter.frequency.value = 120;
        this.humGain = ctx.createGain();
        this.humGain.gain.value = 0;
        osc.connect(humFilter);
        osc2.connect(humFilter);
        humFilter.connect(this.humGain).connect(this.master);
        osc.start();
        osc2.start();
        this.humOsc = [ osc, osc2 ];
        this.dry = ctx.createGain();
        this.dry.gain.value = .44;
        this.dry.connect(this.master);
        this.dripBus = ctx.createGain();
        this.dripBus.gain.value = .6;
        this.dripBus.connect(this.dry);
        this.dripBus.connect(conv);
    }
    async toggle() {
        if (!this.ctx) await this.init();
        if (!this.ctx) return false;
        if (this.ctx.state === "suspended") await this.ctx.resume();
        this.enabled = !this.enabled;
        this.master.gain.cancelScheduledValues(this.ctx.currentTime);
        this.master.gain.linearRampToValueAtTime(this.enabled ? .56 : 0, this.ctx.currentTime + 1.2);
        return this.enabled;
    }
    drip(strength = 1) {
        if (!this.enabled || !this.ctx) return;
        const ctx = this.ctx;
        const t = ctx.currentTime + Math.random() * .02;
        const osc = ctx.createOscillator();
        osc.type = "sine";
        const base = 420 + Math.random() * 780;
        osc.frequency.setValueAtTime(base, t);
        osc.frequency.exponentialRampToValueAtTime(base * .64, t + .11);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(1e-4, t);
        gain.gain.exponentialRampToValueAtTime(.045 * strength, t + .006);
        gain.gain.exponentialRampToValueAtTime(1e-4, t + .31 + Math.random() * .2);
        osc.connect(gain).connect(this.dripBus);
        osc.start(t);
        osc.stop(t + .7);
    }
    setPressure(p) {
        if (!this.ctx) return;
        const target = this.enabled ? p * .05 : 0;
        this.humGain.gain.setTargetAtTime(target, this.ctx.currentTime, .6);
        if (this.humOsc) {
            this.humOsc[0].frequency.setTargetAtTime(38 + p * 3.2, this.ctx.currentTime, .7);
            this.humOsc[1].frequency.setTargetAtTime(76 + p * 5, this.ctx.currentTime, .7);
        }
    }
}

const audioEngine = new AudioEngine;

const dripSystem = new DripSystem(scene, water);

const splashSystem = new SplashSystem(scene);

scene.userData.waterY = water.floorY;

const raycaster = new THREE.Raycaster;

const pointerNdc = new THREE.Vector2;

const valveHitList = [ valve.hit ];

let lastDisturbPoint = new THREE.Vector3(999, 0, 999);

let dragStart = {
    x: 0,
    y: 0,
    angle: 0,
    moved: false,
    time: 0
};

function setNdc(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointerNdc.x = (clientX - rect.left) / rect.width * 2 - 1;
    pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
}

function raycastValve(clientX, clientY) {
    setNdc(clientX, clientY);
    raycaster.setFromCamera(pointerNdc, camera);
    const hits = raycaster.intersectObjects(valveHitList, true);
    return hits.length > 0;
}

function waterHit(clientX, clientY) {
    setNdc(clientX, clientY);
    raycaster.setFromCamera(pointerNdc, camera);
    const hit = raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -water.floorY), new THREE.Vector3);
    if (!hit) return null;
    if (Math.abs(clientX - window.innerWidth / 2) < 80 && Math.abs(clientY - window.innerHeight / 2) > 10) {}
    return hit;
}

function disturbAtPoint(p, strength = .32) {
    if (!p) return;
    lastDisturbPoint.copy(p);
    const now = performance.now();
    if (now - state.lastDisturb < 55) return;
    state.lastDisturb = now;
    water.addRippleWorld(p.x, p.z, strength, 2.1);
    if (Math.random() > .55) splashSystem.burst(p.x, p.z, .4);
    if (Math.random() > .7) audioEngine.drip(.25);
}

function setHoverValve(on) {
    if (state.hoverValve === on) return;
    state.hoverValve = on;
    if (!state.draggingValve) {
        renderer.domElement.style.cursor = on ? "grab" : "grab";
        dom.tooltip.classList.toggle("visible", on);
    }
    document.body.classList.toggle("hovering-valve", on);
}

function positionTooltip(e) {
    dom.tooltip.style.left = `${e.clientX}px`;
    dom.tooltip.style.top = `${e.clientY}px`;
}

function onPointerMove(e) {
    positionTooltip(e);
    if (state.draggingValve) {
        const dx = e.clientX - state.lastPointer.x;
        const dy = e.clientY - state.lastPointer.y;
        state.lastPointer.set(e.clientX, e.clientY);
        if (Math.abs(dx) + Math.abs(dy) > .2) dragStart.moved = true;
        const delta = dx * .018 + dy * .006;
        state.valveAngle = clamp(state.valveAngle + delta, -Math.PI * 4.2, Math.PI * 4.2);
        state.valveTarget = state.valveAngle;
        renderer.domElement.style.cursor = "grabbing";
        return;
    }
    const hovering = raycastValve(e.clientX, e.clientY);
    setHoverValve(hovering);
    if (!state.pointerDown) return;
    if (!hovering) {
        const hit = waterHit(e.clientX, e.clientY);
        if (hit) disturbAtPoint(hit, .22);
    }
}

function onPointerDown(e) {
    if (e.button !== 0) return;
    state.pointerDown = true;
    if (raycastValve(e.clientX, e.clientY)) {
        e.stopPropagation();
        e.preventDefault();
        state.draggingValve = true;
        controls.enabled = false;
        state.lastPointer.set(e.clientX, e.clientY);
        dragStart = {
            x: e.clientX,
            y: e.clientY,
            angle: state.valveAngle,
            moved: false,
            time: performance.now()
        };
        renderer.domElement.style.cursor = "grabbing";
        dom.tooltip.textContent = "TURNING VALVE";
        dom.tooltip.classList.add("visible");
        try {
            renderer.domElement.setPointerCapture(e.pointerId);
        } catch (_) {}
        document.body.classList.add("interacted");
        return;
    }
    const hit = waterHit(e.clientX, e.clientY);
    if (hit && e.clientY > window.innerHeight * .33) {
        disturbAtPoint(hit, .34);
    }
    document.body.classList.add("interacted");
}

function onPointerUp(e) {
    state.pointerDown = false;
    if (state.draggingValve) {
        state.draggingValve = false;
        controls.enabled = true;
        const click = !dragStart.moved && performance.now() - dragStart.time < 420;
        if (click) {
            const dir = state.valveAngle > .1 ? 1 : -1;
            state.valveAngle = clamp(state.valveAngle + dir * Math.PI * .22, -Math.PI * 4.2, Math.PI * 4.2);
            state.valveTarget = state.valveAngle;
        }
        dom.tooltip.textContent = "Turn the copper wheel";
        renderer.domElement.style.cursor = "grab";
        setHoverValve(false);
        try {
            renderer.domElement.releasePointerCapture(e.pointerId);
        } catch (_) {}
        audioEngine.drip(.5);
    }
    document.body.classList.add("interacted");
}

function onPointerLeave() {
    if (!state.draggingValve) setHoverValve(false);
}

renderer.domElement.addEventListener("pointermove", onPointerMove);

renderer.domElement.addEventListener("pointerdown", onPointerDown, true);

window.addEventListener("pointerup", onPointerUp);

renderer.domElement.addEventListener("pointerleave", onPointerLeave);

renderer.domElement.addEventListener("contextmenu", e => e.preventDefault());

renderer.domElement.addEventListener("click", () => {
    if (!state.draggingValve) audioEngine.setPressure(state.pressure);
});

dom.valveBtn?.addEventListener("click", () => {
    toggleValve();
});

function toggleValve() {
    document.body.classList.add("interacted");
    const opening = Math.abs(state.valveAngle) < Math.PI * .8;
    state.valveTarget = opening ? Math.PI * 3.4 : 0;
}

dom.soundBtn?.addEventListener("click", async () => {
    const on = await audioEngine.toggle();
    dom.soundBtn.setAttribute("aria-pressed", on ? "true" : "false");
    dom.soundBtn.querySelector(".btn-label").textContent = on ? "Sound on" : "Sound off";
    if (on) audioEngine.drip(.8);
});

dom.resetBtn?.addEventListener("click", resetView);

function resetView() {
    controls.enableDamping = false;
    controls.update();
    state.viewTween = {
        t: 0,
        duration: 1.3,
        fromPos: camera.position.clone(),
        fromTarget: controls.target.clone(),
        toPos: VIEW.position.clone(),
        toTarget: VIEW.target.clone()
    };
    document.body.classList.add("interacted");
}

window.addEventListener("keydown", e => {
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
    if (e.code === "KeyR") {
        resetView();
    }
    if (e.code === "KeyV") {
        toggleValve();
    }
    if (e.code === "Space") {
        e.preventDefault();
        const cx = -1.4 + Math.random() * 3.2;
        const cz = 2.2 + Math.random() * 5;
        water.addRippleWorld(cx, cz, .45, 2.4);
        splashSystem.burst(cx, cz, .7);
        document.body.classList.add("interacted");
    }
});

renderer.domElement.addEventListener("pointermove", positionTooltip);

const clock = new THREE.Clock;

let lastHudUpdate = 0;

function updateValve(dt) {
    if (!state.draggingValve) {
        if (state.valveTarget !== state.valveAngle) {
            state.valveAngle = damp(state.valveAngle, state.valveTarget, 3.3, dt);
            if (Math.abs(state.valveAngle - state.valveTarget) < .001) state.valveAngle = state.valveTarget;
        }
    }
    if (valve?.wheelGroup) valve.wheelGroup.rotation.z = state.valveAngle;
    const abs = Math.abs(state.valveAngle);
    state.valveOpen = clamp((abs - .12) / (Math.PI * 1.55), 0, 1);
    const target = smoothstep(.02, .94, state.valveOpen);
    state.pressure = damp(state.pressure, target, 1.5, dt);
    const psi = state.pressure * 52 + (state.pressure > .05 ? Math.sin(performance.now() * .004) * .45 * state.pressure : 0);
    state.pressureDisplay = psi;
    water.setValvePressure(state.pressure);
    water.setAgitation(.025 + state.pressure * .55 + Math.sin(state.elapsed * .6) * .004);
    audioEngine.setPressure(state.pressure);
    if (performance.now() - lastHudUpdate > 90) {
        lastHudUpdate = performance.now();
        const pct = Math.round(state.valveOpen * 100);
        dom.valvePercent.textContent = String(pct).padStart(2, "0");
        dom.valveFill.style.width = `${pct}%`;
        dom.valveState.textContent = pct > 85 ? "OPEN" : pct > 8 ? "OPENING" : "CLOSED";
        dom.valvePanel.classList.toggle("is-open", pct > 8);
        dom.pressure.innerHTML = `${psi.toFixed(1)} <em>psi</em>`;
        if (valve?.needlePivot) {
            valve.needlePivot.rotation.z = damp(valve.needlePivot.rotation.z, -2.2 + state.pressure * 2.4, 2, dt);
        }
    }
}

function updateAtmosphere(dt, elapsed) {
    if (hall?.animated) {
        const anim = hall.animated;
        if (anim.dust) anim.dust.material.uniforms.uTime.value = elapsed;
        for (const w of anim.wisps) {
            const phase = w.userData.phase || 0;
            w.position.x += Math.sin(elapsed * .045 + phase) * dt * .12;
            w.position.y += Math.cos(elapsed * .06 + phase * 1.3) * dt * .025;
            w.material.opacity = w.userData.baseOpacity * (.65 + .35 * Math.sin(elapsed * .09 + phase));
        }
        for (const g of anim.windowGlows) {
            g.material.opacity = .13 + .025 * Math.sin(elapsed * .35 + g.position.x);
        }
    }
    if (rightSide?.lampLight) {
        const flicker = .93 + .045 * Math.sin(elapsed * 8.2) + .025 * Math.sin(elapsed * 21.7 + 1.2);
        rightSide.lampLight.intensity = 4.6 * flicker;
        if (rightSide.glow) rightSide.glow.material.opacity = .5 + .08 * flicker;
    }
    dripSystem.update(dt, elapsed);
    splashSystem.update(dt);
    if (gradePass?.uniforms?.uTime) gradePass.uniforms.uTime.value = elapsed;
}

function updateViewTween(dt) {
    if (!state.viewTween) return;
    const v = state.viewTween;
    v.t += dt;
    const k = clamp(v.t / v.duration, 0, 1);
    const ease = 1 - Math.pow(1 - k, 3);
    camera.position.lerpVectors(v.fromPos, v.toPos, ease);
    controls.target.lerpVectors(v.fromTarget, v.toTarget, ease);
    controls.update();
    if (k >= 1) {
        camera.position.copy(v.toPos);
        controls.target.copy(v.toTarget);
        state.viewTween = null;
        controls.update();
        controls.enableDamping = true;
    }
}

let pausedForCapture = false;

function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), .05);
    if (pausedForCapture) return;
    state.elapsed += dt;
    state.frames++;
    updateViewTween(dt);
    if (!state.viewTween) controls.update();
    updateValve(dt);
    water.update(dt, state.elapsed);
    machinery.update(dt, state.pressure, state.elapsed);
    updateAtmosphere(dt, state.elapsed);
    renderer.info.reset();
    composer.render(dt);
    if (state.frames === 3) {
        dom.loader.classList.add("is-hidden");
        document.body.classList.add("ready");
        setTimeout(() => {
            dom.loader.style.display = "none";
        }, 1400);
    }
    if (state.frames === 4) {
        state.ready = true;
        window.__SCENE_READY__ = true;
        document.body.dataset.ready = "true";
        if (params.get("still") === "1") pausedForCapture = true;
    }
}

window.addEventListener("resize", onResize);

function onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
    renderer.setSize(w, h);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
    water.resize(w, h);
    gradePass.uniforms.uResolution.value.set(w, h);
    bloom.setSize(w, h);
}

function showFatal(err) {
    console.error(err);
    state.errors.push(String(err && err.stack || err));
    dom.loader.style.display = "none";
    dom.noWebGL.classList.add("visible");
    const el = dom.noWebGL.querySelector("h2");
    if (el) el.textContent = "The cistern could not be raised.";
    const p = dom.noWebGL.querySelector("p");
    if (p) p.textContent = "WebGL initialisation failed. Try enabling hardware acceleration.";
}

window.addEventListener("error", e => {
    state.errors.push(String(e.message || e.error || e));
});

window.addEventListener("unhandledrejection", e => {
    state.errors.push(String(e.reason || e));
});

function getDiagnostics() {
    const gl = renderer.getContext();
    let vendor = "unknown", rendererName = "unknown";
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (debugInfo) {
        vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        rendererName = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    }
    const size = new THREE.Vector2;
    renderer.getSize(size);
    return {
        timestamp: (new Date).toISOString(),
        ready: state.ready,
        sceneReady: !!window.__SCENE_READY__,
        frames: state.frames,
        elapsedSeconds: Number(state.elapsed.toFixed(2)),
        webgl: {
            version: gl.getParameter(gl.VERSION),
            glsl: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
            vendor: vendor,
            renderer: rendererName,
            maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
            maxSamples: gl.getParameter(gl.MAX_SAMPLES)
        },
        renderer: {
            pixelRatio: renderer.getPixelRatio(),
            outputColorSpace: renderer.outputColorSpace,
            toneMapping: renderer.toneMapping,
            toneMappingExposure: renderer.toneMappingExposure,
            shadowMapEnabled: renderer.shadowMap.enabled,
            shadowMapType: renderer.shadowMap.type,
            drawingBufferSize: [ gl.drawingBufferWidth, gl.drawingBufferHeight ],
            cssSize: [ size.x, size.y ],
            info: {
                calls: renderer.info.render.calls,
                triangles: renderer.info.render.triangles,
                points: renderer.info.render.points,
                lines: renderer.info.render.lines,
                geometries: renderer.info.memory.geometries,
                textures: renderer.info.memory.textures,
                programs: renderer.info.programs?.length ?? null
            }
        },
        camera: {
            fov: camera.fov,
            aspect: Number(camera.aspect.toFixed(4)),
            near: camera.near,
            far: camera.far,
            position: camera.position.toArray().map(v => Number(v.toFixed(4))),
            target: controls.target.toArray().map(v => Number(v.toFixed(4))),
            viewDirection: camera.getWorldDirection(new THREE.Vector3).toArray().map(v => Number(v.toFixed(4)))
        },
        framing: {
            referenceAspect: 1536 / 1024,
            viewportAspect: Number((window.innerWidth / window.innerHeight).toFixed(4)),
            cameraPreset: {
                fov: VIEW.fov,
                position: VIEW.position.toArray(),
                target: VIEW.target.toArray()
            }
        },
        water: {
            resolution: [ water.NX, water.NZ ],
            reflectionTarget: [ water.renderTarget.width, water.renderTarget.height ],
            agitation: Number(water.agitation.toFixed(3)),
            recentRipples: !!water.mesh
        },
        valve: {
            angle: Number(state.valveAngle.toFixed(3)),
            open: Number(state.valveOpen.toFixed(3)),
            pressure: Number(state.pressure.toFixed(3)),
            pressurePsi: Number(state.pressureDisplay.toFixed(2))
        },
        counts: {
            sceneChildren: scene.children.length,
            materials: T ? Object.keys(M).length : 0,
            dustParticles: hall?.animated?.dust?.geometry?.attributes?.position?.count || 0
        },
        errors: state.errors.slice(0, 20),
        capture: {
            cleanCapture: cleanCapture,
            query: window.location.search
        }
    };
}

window.__RIVERDALE__ = {
    THREE: THREE,
    renderer: renderer,
    scene: scene,
    camera: camera,
    controls: controls,
    composer: composer,
    water: water,
    hall: hall,
    valve: valve,
    machinery: machinery,
    rightSide: rightSide,
    bench: bench,
    stair: stair,
    state: state,
    getDiagnostics: getDiagnostics,
    disturb(x, z, strength = .4) {
        water.addRippleWorld(x, z, strength, 2.3);
        splashSystem.burst(x, z, strength);
    },
    setValve(open) {
        state.valveTarget = open ? Math.PI * 3.4 : 0;
        if (!open) state.valveAngle = 0;
    },
    setCamera(position, target) {
        camera.position.fromArray(position);
        controls.target.fromArray(target);
        controls.update();
    },
    pause() {
        pausedForCapture = true;
    },
    resume() {
        pausedForCapture = false;
        clock.getDelta();
    },
    renderOnce() {
        camera.updateMatrixWorld(true);
        controls.update();
        renderer.info.reset();
        composer.render(.016);
    },
    snapshotDataURL(type = "image/png", quality = 1) {
        camera.updateMatrixWorld(true);
        controls.update();
        renderer.info.reset();
        composer.render(.016);
        return renderer.domElement.toDataURL(type, quality);
    },
    debugReflection(on) {
        water.material.uniforms.uDebugReflection.value = on ? 1 : 0;
        water.mesh.needsUpdate = true;
    },
    get drawCalls() {
        return renderer.info.render.calls;
    }
};

window.__getDiagnostics = getDiagnostics;

animate();
