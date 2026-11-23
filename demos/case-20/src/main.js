import * as THREE from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { Reflector } from "three/addons/objects/Reflector.js";

import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";

import { RenderPass } from "three/addons/postprocessing/RenderPass.js";

import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";

import * as TEX from "./textures.js";

RectAreaLightUniformsLib.init();

const CONFIG = {
    tunnel: {
        halfWidth: 2.3,
        height: 3,
        zNear: 8.4,
        zFar: -54,
        wetFloorEnd: -27
    },
    camera: {
        fov: 56,
        near: .08,
        far: 120,
        position: new THREE.Vector3(-.62, 1.54, 5.2),
        target: new THREE.Vector3(-.9, 1.29, -1.7),
        opticalAxisFraction: .7
    },
    fixture: {
        x: -1.7,
        y: 2.935,
        z: [ .8, -5.65, -12, -18.35, -24.7, -31.05, -37.4 ]
    },
    exposure: 1.24
};

const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

const params = new URLSearchParams(window.location.search);

const CAPTURE = params.get("capture") === "1";

if (CAPTURE) document.documentElement.classList.add("capture-mode");

if (params.get("ui") === "0") document.documentElement.classList.add("chrome-hidden");

const waitFrame = () => new Promise(resolve => requestAnimationFrame(() => resolve()));

const yieldToPaint = () => new Promise(resolve => setTimeout(resolve, 0));

const app = {
    renderer: null,
    scene: null,
    camera: null,
    controls: null,
    composer: null,
    mirror: null,
    mirrorBaseGain: 1.22,
    fixtures: [],
    dust: null,
    gradePass: null,
    flicker: null,
    loading: false,
    clock: null,
    elapsed: 0,
    errors: [],
    frames: 0,
    startedAt: performance.now(),
    readyAt: 0,
    disposed: false
};

const tmp = {
    v3: new THREE.Vector3,
    v3b: new THREE.Vector3,
    q: new THREE.Quaternion,
    e: new THREE.Euler
};

boot().catch(error => {
    console.error(error);
    app.errors.push(String(error));
    showFatal(error);
});

async function boot() {
    const loaderLabel = document.getElementById("loader-label");
    const loaderLine = document.getElementById("loader-line");
    const setProgress = (label, amount) => {
        if (loaderLabel) loaderLabel.textContent = label;
        if (loaderLine) loaderLine.style.transform = `scaleX(${Math.max(.02, amount)})`;
    };
    setProgress("Waking the tunnel", .03);
    await waitFrame();
    const t0 = performance.now();
    await TEX.loadFonts();
    setProgress("Pouring concrete", .11);
    await yieldToPaint();
    initRenderer();
    initScene();
    const tb = performance.now();
    await buildWorld(setProgress);
    setProgress("Hanging the last cables", .88);
    await yieldToPaint();
    initPostprocessing();
    bindUI();
    onResize();
    await waitFrame();
    app.controls.update();
    const tr = performance.now();
    renderFrame(0);
    app.readyAt = performance.now();
    setProgress("Ready", 1);
    document.body.classList.add("is-ready");
    document.getElementById("loader")?.classList.add("done");
    window.__sceneReady = true;
    window.__AFTER_HOURS__ = app;
    window.addEventListener("resize", onResize);
    app.clock.start();
    if (!CAPTURE) {
        app.renderer.setAnimationLoop(tick);
    } else {
        setTimeout(() => {
            for (let i = 0; i < 2; i++) {
                app.elapsed += 1 / 30;
                tick();
            }
            window.__captureFrameReady = true;
            console.info("[build] capture frame ready");
        }, 30);
    }
}

function initRenderer() {
    const canvas = document.getElementById("scene");
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: false,
        alpha: false,
        depth: true,
        stencil: false,
        powerPreference: "high-performance",
        preserveDrawingBuffer: true
    });
    renderer.setClearColor(131843, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = CONFIG.exposure;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.info.autoReset = false;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, CAPTURE ? 1 : 1.5));
    app.renderer = renderer;
    app.clock = new THREE.Clock(false);
    app.clock.elapsedTime = 0;
    const camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, 1.5, CONFIG.camera.near, CONFIG.camera.far);
    camera.position.copy(CONFIG.camera.position);
    app.camera = camera;
    const controls = new OrbitControls(camera, canvas);
    controls.target.copy(CONFIG.camera.target);
    controls.enableDamping = true;
    controls.dampingFactor = .055;
    controls.rotateSpeed = .42;
    controls.zoomSpeed = .75;
    controls.panSpeed = .6;
    controls.screenSpacePanning = true;
    controls.minDistance = .55;
    controls.maxDistance = 11.5;
    controls.minPolarAngle = .14;
    controls.maxPolarAngle = Math.PI * .505;
    controls.update();
    app.controls = controls;
}

function initScene() {
    const scene = new THREE.Scene;
    scene.background = new THREE.Color(132100);
    scene.fog = new THREE.FogExp2(131843, .033);
    app.scene = scene;
    const pmrem = new THREE.PMREMGenerator(app.renderer);
    pmrem.compileEquirectangularShader();
    const envSource = TEX.makeEnvironmentTexture();
    const envTarget = pmrem.fromEquirectangular(envSource);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = .55;
    envSource.dispose();
    pmrem.dispose();
    const hemi = new THREE.HemisphereLight(9345696, 3619644, .62);
    scene.add(hemi);
    const ambient = new THREE.AmbientLight(2435627, .42);
    scene.add(ambient);
    const floorBounce = new THREE.DirectionalLight(12830656, 5.2);
    floorBounce.position.set(0, -2, 2);
    floorBounce.target.position.set(0, 3, -6);
    scene.add(floorBounce);
    scene.add(floorBounce.target);
}

async function buildWorld(setProgress) {
    const scene = app.scene;
    const maxAniso = Math.min(16, app.renderer.capabilities.getMaxAnisotropy());
    const world = new THREE.Group;
    world.name = "tunnel";
    scene.add(world);
    let tm = performance.now();
    const tileNormal = TEX.makeTileRelief(maxAniso);
    tm = performance.now();
    const wallRough = TEX.makeWetRoughness(maxAniso, 7);
    setProgress("Firing 100-year-old tiles", .17);
    await yieldToPaint();
    const {halfWidth: HW, height: WH, zNear: zNear, zFar: zFar, wetFloorEnd: wetFloorEnd} = CONFIG.tunnel;
    const len = zNear - zFar;
    const zCenter = (zNear + zFar) / 2;
    const wallMetalTrimMat = new THREE.MeshStandardMaterial({
        color: 2434849,
        roughness: .34,
        metalness: .22,
        envMapIntensity: .6
    });
    const leftPanels = [ {
        z0: 8.4,
        z1: 2.6,
        w: 2048,
        h: 1024,
        detail: 1.12,
        seed: 11
    }, {
        z0: 2.6,
        z1: -2.6,
        w: 2048,
        h: 1024,
        detail: 1.25,
        seed: 23
    }, {
        z0: -2.6,
        z1: -8.6,
        w: 2048,
        h: 1024,
        detail: 1.35,
        seed: 37
    }, {
        z0: -8.6,
        z1: -18.6,
        w: 1024,
        h: 512,
        detail: 1.1,
        seed: 41
    }, {
        z0: -18.6,
        z1: -32.6,
        w: 512,
        h: 256,
        detail: .8,
        seed: 53
    }, {
        z0: -32.6,
        z1: zFar,
        w: 512,
        h: 256,
        detail: .7,
        seed: 67
    } ];
    for (let i = 0; i < leftPanels.length; i++) {
        const p = leftPanels[i];
        setProgress(i === 0 ? "Laying the first tiles" : "Spraying /BETTER DAYS/", .2 + i * .075);
        await yieldToPaint();
        const tt = performance.now();
        const texture = TEX.makeLeftWallTexture({
            zNear: p.z0,
            zFar: p.z1,
            yTop: WH,
            width: p.w,
            height: p.h,
            seed: p.seed,
            anisotropy: maxAniso,
            detail: p.detail
        });
        const tileLen = p.z0 - p.z1;
        const normal = tileNormal.clone();
        normal.repeat.set(tileLen / 2, WH / 1);
        normal.needsUpdate = true;
        const rough = wallRough.clone();
        rough.repeat.set(tileLen / 3.1, WH / 2.25);
        rough.needsUpdate = true;
        const mat = new THREE.MeshPhysicalMaterial({
            map: texture,
            normalMap: normal,
            normalScale: new THREE.Vector2(.54, .54),
            roughnessMap: rough,
            roughness: .52,
            metalness: 0,
            clearcoat: .34,
            clearcoatRoughness: .42,
            envMapIntensity: .42,
            dithering: true
        });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(tileLen, WH), mat);
        mesh.rotation.y = Math.PI / 2;
        mesh.position.set(-HW, WH / 2, (p.z0 + p.z1) / 2);
        mesh.receiveShadow = true;
        mesh.name = `left-wall-${i}`;
        world.add(mesh);
    }
    const rightPanels = [ {
        z0: 8.4,
        z1: -4.6,
        w: 2048,
        h: 512,
        detail: 1.2,
        seed: 111
    }, {
        z0: -4.6,
        z1: -20.6,
        w: 1024,
        h: 512,
        detail: 1,
        seed: 127
    }, {
        z0: -20.6,
        z1: -38,
        w: 512,
        h: 256,
        detail: .8,
        seed: 139
    }, {
        z0: -38,
        z1: zFar,
        w: 512,
        h: 256,
        detail: .65,
        seed: 149
    } ];
    for (let i = 0; i < rightPanels.length; i++) {
        const p = rightPanels[i];
        setProgress("Writing over the right wall", .6 + i * .035);
        await yieldToPaint();
        const tt = performance.now();
        const texture = TEX.makeRightWallTexture({
            zNear: p.z0,
            zFar: p.z1,
            yTop: WH,
            width: p.w,
            height: p.h,
            seed: p.seed,
            anisotropy: maxAniso,
            detail: p.detail
        });
        const tileLen = p.z0 - p.z1;
        const normal = tileNormal.clone();
        normal.repeat.set(tileLen / 2, WH);
        normal.needsUpdate = true;
        const rough = wallRough.clone();
        rough.repeat.set(tileLen / 3.1, WH / 2.25);
        rough.needsUpdate = true;
        const mat = new THREE.MeshPhysicalMaterial({
            map: texture,
            normalMap: normal,
            normalScale: new THREE.Vector2(.5, .5),
            roughnessMap: rough,
            roughness: .56,
            metalness: 0,
            clearcoat: .28,
            clearcoatRoughness: .48,
            envMapIntensity: .3,
            color: 14078661,
            dithering: true
        });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(tileLen, WH), mat);
        mesh.rotation.y = -Math.PI / 2;
        mesh.position.set(HW, WH / 2, (p.z0 + p.z1) / 2);
        mesh.receiveShadow = true;
        mesh.name = `right-wall-${i}`;
        world.add(mesh);
    }
    for (const side of [ -1, 1 ]) {
        const plate = new THREE.Mesh(new THREE.BoxGeometry(.075, .24, len - .05), wallMetalTrimMat);
        plate.position.set(side * (HW - .037), .12, zCenter);
        plate.castShadow = true;
        plate.receiveShadow = true;
        world.add(plate);
        const lip = new THREE.Mesh(new THREE.BoxGeometry(.095, .025, len - .05), new THREE.MeshPhysicalMaterial({
            color: 2763297,
            roughness: .22,
            metalness: .35,
            clearcoat: .5,
            clearcoatRoughness: .35
        }));
        lip.position.set(side * (HW - .041), .245, zCenter);
        lip.receiveShadow = true;
        world.add(lip);
        const cornice = new THREE.Mesh(new THREE.BoxGeometry(.055, .06, len - .05), wallMetalTrimMat);
        cornice.position.set(side * (HW - .027), WH - .035, zCenter);
        world.add(cornice);
    }
    setProgress("Flooding the floor", .71);
    await yieldToPaint();
    const floorLen = zNear - wetFloorEnd;
    const floorCenter = (zNear + wetFloorEnd) / 2;
    let tmF = performance.now();
    const floorTex = TEX.makeFloorTextures({
        anisotropy: maxAniso,
        seed: 173
    });
    tmF = performance.now();
    const puddles = TEX.makePuddleMask({
        width: HW * 2,
        zNear: zNear,
        zFar: wetFloorEnd,
        pixelsW: 256,
        pixelsL: 1024,
        anisotropy: maxAniso
    });
    puddles.flipY = false;
    puddles.needsUpdate = true;
    tmF = performance.now();
    const mirror = new Reflector(new THREE.PlaneGeometry(HW * 2, floorLen), {
        clipBias: .0025,
        textureWidth: Math.max(512, Math.round(window.innerWidth * .72)),
        textureHeight: Math.max(384, Math.round(window.innerHeight * .72)),
        color: 9344658,
        multisample: 0,
        shader: makeWetMirrorShader()
    });
    mirror.rotation.x = -Math.PI / 2;
    mirror.position.set(0, .001, floorCenter);
    mirror.material.uniforms.uTime.value = 0;
    mirror.material.uniforms.uGain.value = 1.18;
    mirror.renderOrder = 1;
    mirror.name = "standing-water";
    world.add(mirror);
    app.mirror = mirror;
    floorTex.map.repeat.set(HW * 2 / 2, floorLen / 2);
    floorTex.roughnessMap.repeat.set(HW * 2 / 2.8, floorLen / 2.8);
    floorTex.normalMap.repeat.set(HW * 2 / 2, floorLen / 2);
    floorTex.map.anisotropy = floorTex.roughnessMap.anisotropy = floorTex.normalMap.anisotropy = maxAniso;
    const floorMat = new THREE.MeshPhysicalMaterial({
        map: floorTex.map,
        normalMap: floorTex.normalMap,
        normalScale: new THREE.Vector2(.42, .42),
        roughnessMap: floorTex.roughnessMap,
        roughness: .62,
        metalness: .07,
        clearcoat: .25,
        clearcoatRoughness: .32,
        envMapIntensity: .45,
        color: 9407616,
        alphaMap: puddles,
        transparent: true,
        opacity: 1,
        depthWrite: true,
        dithering: true
    });
    floorMat.alphaMap.repeat.set(1, 1);
    floorMat.alphaMap.wrapS = floorMat.alphaMap.wrapT = THREE.ClampToEdgeWrapping;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, floorLen), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, .007, floorCenter);
    floor.receiveShadow = true;
    floor.renderOrder = 2;
    floor.name = "wet-stone-floor";
    world.add(floor);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(HW * 2, .028, .13), new THREE.MeshStandardMaterial({
        color: 2369056,
        metalness: .55,
        roughness: .4
    }));
    sill.position.set(0, .012, wetFloorEnd);
    sill.receiveShadow = true;
    world.add(sill);
    const grateTex = TEX.makeGrateTexture({
        anisotropy: maxAniso
    });
    grateTex.repeat.set(1, 34);
    const grateMat = new THREE.MeshStandardMaterial({
        map: grateTex,
        color: 13881019,
        metalness: .45,
        roughness: .34,
        envMapIntensity: .95
    });
    const drainLen = floorLen - 1.5;
    const drain = new THREE.Mesh(new THREE.PlaneGeometry(.34, drainLen), grateMat);
    drain.rotation.x = -Math.PI / 2;
    drain.position.set(HW - .62, .016, floorCenter);
    drain.receiveShadow = true;
    world.add(drain);
    for (const side of [ -1, 1 ]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(.045, .035, drainLen), new THREE.MeshStandardMaterial({
            color: 4934722,
            metalness: .62,
            roughness: .28,
            envMapIntensity: .8
        }));
        rail.position.set(HW - .62 + side * .194, .018, floorCenter);
        rail.receiveShadow = true;
        world.add(rail);
    }
    const drainGlint = new THREE.PointLight(12111563, 3.6, 9, 2);
    drainGlint.position.set(1.18, 1.05, -3.4);
    drainGlint.name = "drain-glint";
    world.add(drainGlint);
    setProgress("Lowering the ceiling", .76);
    await yieldToPaint();
    let tmC = performance.now();
    const concrete = TEX.makeConcreteTextures({
        size: 1024,
        seed: 89,
        anisotropy: maxAniso
    });
    concrete.map.repeat.set(2, 25.5);
    concrete.bump.repeat.set(1.8, 22);
    const ceilingMat = new THREE.MeshStandardMaterial({
        map: concrete.map,
        bumpMap: concrete.bump,
        bumpScale: .065,
        roughness: .88,
        metalness: 0,
        color: 14079955,
        emissive: 6317416,
        emissiveMap: concrete.map,
        emissiveIntensity: 1.3,
        envMapIntensity: .22,
        dithering: true
    });
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, len + .1), ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, WH, zCenter);
    ceiling.receiveShadow = true;
    ceiling.name = "concrete-ceiling";
    world.add(ceiling);
    tmC = performance.now();
    const stainTextures = [ TEX.makeStainTexture({
        seed: 31,
        color: [ 48, 46, 37 ]
    }), TEX.makeStainTexture({
        seed: 74,
        color: [ 39, 41, 35 ]
    }), TEX.makeStainTexture({
        seed: 118,
        color: [ 77, 60, 39 ]
    }) ];
    for (let i = 0; i < 16; i++) {
        const tex = stainTextures[i % stainTextures.length];
        const w = .9 + Math.random() * 3.6;
        const h = .7 + Math.random() * 3;
        const mat = new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            opacity: .22 + Math.random() * .26,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            toneMapped: true
        });
        const damp = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
        damp.rotation.x = Math.PI / 2;
        damp.rotation.z = Math.random() * Math.PI * 2;
        damp.position.set((Math.random() - .5) * (HW * 2 - .5), WH - .008, zNear - 3.5 - Math.random() * (len - 6));
        damp.renderOrder = 3;
        world.add(damp);
    }
    setProgress("Hanging the fluorescent line", .81);
    await yieldToPaint();
    const rustTex = TEX.makeRustTexture({
        anisotropy: maxAniso,
        seed: 252
    });
    rustTex.wrapS = rustTex.wrapT = THREE.RepeatWrapping;
    rustTex.repeat.set(1, 4);
    const fixtureMetal = new THREE.MeshStandardMaterial({
        map: rustTex,
        color: 9538944,
        metalness: .56,
        roughness: .44,
        envMapIntensity: .6
    });
    const diffuserTex = TEX.makeDiffuserTexture({
        anisotropy: 4
    });
    let tmX = performance.now();
    createFixtureLine(world, diffuserTex, fixtureMetal);
    setProgress("Threading pipes", .835);
    await yieldToPaint();
    tmX = performance.now();
    buildCeilingServices(world, rustTex, wallMetalTrimMat);
    setProgress("Leaving a way out", .855);
    await yieldToPaint();
    tmX = performance.now();
    buildArchitecturalDetails(world, maxAniso);
    setProgress("Layering the tags", .87);
    await yieldToPaint();
    tmX = performance.now();
    buildGraffitiDecals(world, maxAniso);
    setProgress("Scattering what was left behind", .885);
    await yieldToPaint();
    tmX = performance.now();
    buildDebris(world, maxAniso);
    tmX = performance.now();
    buildDust(world);
    tmX = performance.now();
    buildStairway(world, floorTex);
    buildFarExit(world);
}

function makeWetMirrorShader() {
    return {
        name: "WetTunnelReflection",
        uniforms: {
            color: {
                value: null
            },
            tDiffuse: {
                value: null
            },
            textureMatrix: {
                value: null
            },
            uTime: {
                value: 0
            },
            uGain: {
                value: 1
            }
        },
        vertexShader: `\n      uniform mat4 textureMatrix;\n      varying vec4 vUv;\n      varying vec3 vWorld;\n      void main() {\n        vUv = textureMatrix * vec4(position, 1.0);\n        vec4 world = modelMatrix * vec4(position, 1.0);\n        vWorld = world.xyz;\n        gl_Position = projectionMatrix * viewMatrix * world;\n      }\n    `,
        fragmentShader: `\n      uniform vec3 color;\n      uniform sampler2D tDiffuse;\n      uniform float uTime;\n      uniform float uGain;\n      varying vec4 vUv;\n      varying vec3 vWorld;\n\n      void main() {\n        vec2 p = vUv.xy / max(vUv.w, 0.0001);\n\n        // Slow, shallow interference across standing water.\n        float rip1 = sin(vWorld.x * 8.3 + vWorld.z * 2.9 + uTime * 1.15);\n        float rip2 = sin(vWorld.z * 5.7 - vWorld.x * 3.1 - uTime * 0.8);\n        float rip3 = sin((vWorld.x + vWorld.z) * 15.0 + uTime * 1.9);\n        vec2 ripple = vec2(rip1 * 0.6 + rip3 * 0.16, rip2 * 0.5 - rip3 * 0.12);\n        p += ripple * vec2(0.0013, 0.00165);\n\n        // A few taps approximate a dirty, slightly out-of-focus water surface.\n        vec3 refl = texture2D(tDiffuse, p).rgb * 0.46;\n        refl += texture2D(tDiffuse, p + vec2(0.0016, 0.0)).rgb * 0.18;\n        refl += texture2D(tDiffuse, p - vec2(0.0016, 0.0)).rgb * 0.18;\n        refl += texture2D(tDiffuse, p + vec2(0.0, 0.0023)).rgb * 0.09;\n        refl += texture2D(tDiffuse, p - vec2(0.0, 0.0023)).rgb * 0.09;\n\n        // The concrete in this tunnel swallows most of the light.\n        refl *= vec3(0.76, 0.84, 0.82);\n        refl *= uGain;\n        refl *= mix(1.0, 0.18, smoothstep(12.0, 37.0, -vWorld.z));\n        refl += vec3(0.006, 0.0085, 0.008);\n\n        gl_FragColor = vec4(refl, 1.0);\n      }\n    `
    };
}

function createFixtureLine(world, diffuserTex, fixtureMetal) {
    const {x: FX, y: FY, z: zs} = CONFIG.fixture;
    CONFIG.fixture.z.forEach((z, index) => {
        const group = new THREE.Group;
        group.position.set(FX, FY, z);
        group.name = `fluorescent-${index}`;
        const housing = new THREE.Mesh(new THREE.BoxGeometry(.34, .075, 1.38), fixtureMetal);
        housing.castShadow = true;
        housing.receiveShadow = true;
        group.add(housing);
        const endGeo = new THREE.BoxGeometry(.37, .095, .055);
        for (const e of [ -1, 1 ]) {
            const end = new THREE.Mesh(endGeo, fixtureMetal);
            end.position.z = e * .675;
            end.castShadow = true;
            group.add(end);
        }
        const diffuserMat = new THREE.MeshStandardMaterial({
            color: 4472109,
            map: diffuserTex,
            emissive: 16773072,
            emissiveMap: diffuserTex,
            emissiveIntensity: 3.2,
            roughness: .36,
            metalness: 0,
            toneMapped: true
        });
        const diffuser = new THREE.Mesh(new THREE.PlaneGeometry(.265, 1.25), diffuserMat);
        diffuser.rotation.x = Math.PI / 2;
        diffuser.position.y = -.041;
        group.add(diffuser);
        const frameMat = new THREE.MeshStandardMaterial({
            color: 1513491,
            metalness: .7,
            roughness: .46
        });
        const longRailGeo = new THREE.BoxGeometry(.016, .02, 1.29);
        for (const s of [ -1, 1 ]) {
            const rail = new THREE.Mesh(longRailGeo, frameMat);
            rail.position.set(s * .142, -.045, 0);
            group.add(rail);
        }
        const crossGeo = new THREE.BoxGeometry(.3, .02, .018);
        for (const s of [ -1, 1 ]) {
            const cross = new THREE.Mesh(crossGeo, frameMat);
            cross.position.set(0, -.045, s * .64);
            group.add(cross);
        }
        for (const e of [ -1, 1 ]) {
            const rod = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .075, 5), fixtureMetal);
            rod.position.set(0, .064, e * .47);
            group.add(rod);
        }
        if (index === 3) group.rotation.z = .023;
        if (index === 5) group.rotation.x = .018;
        const rect = new THREE.RectAreaLight(16772568, 0, .26, 1.24);
        rect.position.set(0, -.07, 0);
        rect.rotation.x = -Math.PI / 2;
        group.add(rect);
        const basePower = Math.max(.25, 1 - index * .115);
        let upRect = null;
        if (index < 3) {
            upRect = new THREE.RectAreaLight(16770244, 4.6 * basePower, .24, 1.15);
            upRect.position.set(0, .072, 0);
            upRect.rotation.x = Math.PI / 2;
            group.add(upRect);
        }
        world.add(group);
        const baseEmissive = index === 0 ? 2 : Math.max(1.25, 2.2 - index * .18);
        diffuserMat.emissiveIntensity = baseEmissive;
        rect.intensity = 18 * basePower;
        if (index > 2) rect.visible = false;
        const lamps = [];
        if (index <= 2) {
            if (index === 0) {
                const spot = new THREE.SpotLight(16771528, 70, 17, 1.18, .82, 1.75);
                spot.position.set(FX, 2.86, z);
                spot.target.position.set(-.15, 0, z - 1.2);
                spot.castShadow = true;
                spot.shadow.mapSize.set(1024, 1024);
                spot.shadow.camera.near = .2;
                spot.shadow.camera.far = 14;
                spot.shadow.bias = -4e-4;
                spot.shadow.normalBias = .018;
                spot.shadow.radius = 4;
                spot.name = "light-0-shadow-spot";
                world.add(spot);
                world.add(spot.target);
                lamps.push({
                    light: spot,
                    base: 70,
                    kind: "spot"
                });
                const graze = new THREE.SpotLight(16769210, 72, 12, .62, .95, 1.7);
                graze.position.set(FX - .2, 2.77, z - .1);
                graze.target.position.set(-HW_PLACEHOLDER(), 1.55, z - 1.6);
                graze.name = "left-wall-grazer-0";
                world.add(graze);
                world.add(graze.target);
                lamps.push({
                    light: graze,
                    base: 72,
                    kind: "graze"
                });
            } else {
                const point = new THREE.PointLight(16771272, 11 * basePower, 10.5, 1.85);
                point.position.set(FX, 2.8, z);
                point.name = `fixture-point-${index}`;
                world.add(point);
                lamps.push({
                    light: point,
                    base: 11 * basePower,
                    kind: "point"
                });
                if (index === 1) {
                    const graze = new THREE.SpotLight(16768952, 32, 11, .55, 1, 1.8);
                    graze.position.set(FX - .15, 2.77, z);
                    graze.target.position.set(-HW_PLACEHOLDER(), 1.45, z - 1.2);
                    graze.name = "left-wall-grazer-1";
                    world.add(graze);
                    world.add(graze.target);
                    lamps.push({
                        light: graze,
                        base: 32,
                        kind: "graze"
                    });
                }
            }
        }
        app.fixtures.push({
            index: index,
            z: z,
            group: group,
            diffuserMat: diffuserMat,
            baseEmissive: baseEmissive,
            basePower: basePower,
            rect: rect,
            upRect: upRect,
            rectBase: rect.intensity,
            upRectBase: upRect ? upRect.intensity : 0,
            lamps: lamps,
            level: 1,
            targetLevel: 1,
            dead: false
        });
    });
    const entranceFill = new THREE.PointLight(16770761, 7.5, 9, 1.9);
    entranceFill.position.set(-.7, 2.82, 4.6);
    entranceFill.name = "entrance-bounce";
    world.add(entranceFill);
    app.entranceFill = {
        light: entranceFill,
        base: 7.5
    };
    const entranceGraze = new THREE.SpotLight(16770504, 46, 9, .68, .95, 1.7);
    entranceGraze.position.set(-.9, 2.77, 5.2);
    entranceGraze.target.position.set(-2.18, 1.58, 2.45);
    entranceGraze.name = "entrance-graze";
    world.add(entranceGraze);
    world.add(entranceGraze.target);
    app.entranceGraze = {
        light: entranceGraze,
        base: 46
    };
    const rightFill = new THREE.PointLight(12047311, 5, 10, 1.9);
    rightFill.position.set(1.7, 2.55, -2);
    rightFill.name = "right-wall-fill";
    world.add(rightFill);
    app.rightFill = {
        light: rightFill,
        base: 5
    };
    const rightGraze = new THREE.SpotLight(16767400, 32, 13, .52, 1, 1.7);
    rightGraze.position.set(-.7, 2.78, -2.4);
    rightGraze.target.position.set(CONFIG.tunnel.halfWidth - .15, 1.5, -3);
    rightGraze.name = "right-wall-graze";
    world.add(rightGraze);
    world.add(rightGraze.target);
    app.rightGraze = {
        light: rightGraze,
        base: 23
    };
}

function HW_PLACEHOLDER() {
    return CONFIG.tunnel.halfWidth - .12;
}

function buildCeilingServices(world, rustTexture, trimMat) {
    const {halfWidth: HW, height: WH, zNear: zNear, zFar: zFar} = CONFIG.tunnel;
    const pipeLen = zNear - zFar;
    const zc = (zNear + zFar) / 2;
    const pipeMat = new THREE.MeshStandardMaterial({
        map: rustTexture,
        color: 10656650,
        metalness: .32,
        roughness: .46,
        envMapIntensity: .55
    });
    const darkMetal = new THREE.MeshStandardMaterial({
        color: 2895399,
        metalness: .55,
        roughness: .5,
        envMapIntensity: .55
    });
    const pipes = [ {
        x: -2.22,
        y: 2.855,
        r: .078,
        color: 9142897
    }, {
        x: -2.11,
        y: 2.925,
        r: .055,
        color: 10129792
    }, {
        x: -2,
        y: 2.805,
        r: .038,
        color: 8749167
    }, {
        x: -1.94,
        y: 2.958,
        r: .026,
        color: 4934207
    }, {
        x: -1.9,
        y: 2.885,
        r: .016,
        color: 4013363
    } ];
    for (let i = 0; i < pipes.length; i++) {
        const p = pipes[i];
        const pm = pipeMat.clone();
        pm.color = new THREE.Color(p.color);
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r * (1.03 + i * .02), pipeLen, 12, 1), pm);
        pipe.rotation.x = Math.PI / 2;
        pipe.position.set(p.x, p.y, zc);
        pipe.castShadow = i < 2;
        pipe.receiveShadow = true;
        world.add(pipe);
        for (let z = zNear - 2.4; z > zFar; z -= 4.6) {
            const collar = new THREE.Mesh(new THREE.CylinderGeometry(p.r * 1.28, p.r * 1.3, .11, 10), darkMetal);
            collar.rotation.x = Math.PI / 2;
            collar.position.set(p.x, p.y, z + i * .75 % 2);
            collar.castShadow = false;
            world.add(collar);
            if (i < 2) {
                const hanger = new THREE.Mesh(new THREE.BoxGeometry(.02, .17, .045), darkMetal);
                hanger.position.set(p.x + .045, (WH + p.y) / 2 + .01, collar.position.z);
                hanger.receiveShadow = true;
                world.add(hanger);
                const foot = new THREE.Mesh(new THREE.BoxGeometry(.16, .022, .06), darkMetal);
                foot.position.set(p.x + .02, p.y + p.r + .01, collar.position.z);
                world.add(foot);
            }
        }
    }
    const tray = new THREE.Mesh(new THREE.BoxGeometry(.075, .028, pipeLen - .2), darkMetal);
    tray.position.set(-.98, 2.982, zc);
    tray.receiveShadow = true;
    world.add(tray);
    const trayRailGeo = new THREE.BoxGeometry(.009, .036, pipeLen - .2);
    for (const x of [ -1.015, -.945 ]) {
        const rail = new THREE.Mesh(trayRailGeo, trimMat);
        rail.position.set(x, 2.985, zc);
        world.add(rail);
    }
    const jointMat = new THREE.MeshStandardMaterial({
        color: 1842456,
        roughness: .94,
        metalness: 0
    });
    const jointGeo = new THREE.BoxGeometry(HW * 2 - .16, .005, .022);
    const jointCount = 24;
    const joints = new THREE.InstancedMesh(jointGeo, jointMat, jointCount);
    const jd = new THREE.Object3D;
    for (let i = 0; i < jointCount; i++) {
        jd.position.set(0, 2.9945, zNear - 1.1 - i * (pipeLen - 2.2) / (jointCount - 1));
        jd.updateMatrix();
        joints.setMatrixAt(i, jd.matrix);
    }
    joints.receiveShadow = true;
    world.add(joints);
    const seam = new THREE.Mesh(new THREE.BoxGeometry(.016, .005, pipeLen - .3), jointMat);
    seam.position.set(.48, 2.9945, zc);
    seam.receiveShadow = true;
    world.add(seam);
    const wallConduitMat = new THREE.MeshStandardMaterial({
        color: 2500386,
        metalness: .55,
        roughness: .48
    });
    const rightConduit = new THREE.Mesh(new THREE.CylinderGeometry(.028, .03, pipeLen - 1.2, 8), wallConduitMat);
    rightConduit.rotation.x = Math.PI / 2;
    rightConduit.position.set(HW - .17, 2.57, zc - .2);
    world.add(rightConduit);
    const rightCable = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, pipeLen - 1.2, 6), wallConduitMat);
    rightCable.rotation.x = Math.PI / 2;
    rightCable.position.set(HW - .23, 2.5, zc - .2);
    world.add(rightCable);
    for (let z = zNear - 2.2; z > zFar + 2; z -= 4.1) {
        const clip = new THREE.Mesh(new THREE.BoxGeometry(.09, .035, .035), wallConduitMat);
        clip.position.set(HW - .2, 2.57, z);
        world.add(clip);
    }
    const cableMat = new THREE.MeshStandardMaterial({
        color: 855565,
        roughness: .62,
        metalness: .2
    });
    const cablePaths = [ {
        x0: -.95,
        x1: -.35,
        y: 2.962,
        offset: 1.2,
        radius: .007,
        sag: .035
    }, {
        x0: -.48,
        x1: .22,
        y: 2.968,
        offset: 3.1,
        radius: .0055,
        sag: .022
    }, {
        x0: -1.2,
        x1: -.55,
        y: 2.952,
        offset: 5.6,
        radius: .009,
        sag: .05
    } ];
    for (const c of cablePaths) {
        const pts = [];
        const count = 70;
        for (let i = 0; i <= count; i++) {
            const t = i / count;
            const z = zNear - t * (pipeLen - .8) - .3;
            const sway = Math.sin(t * Math.PI * 26 + c.offset) * .035;
            const sag = Math.pow(Math.sin(t * Math.PI * 2 * 10 + c.offset), 2) * c.sag;
            pts.push(new THREE.Vector3(THREE.MathUtils.lerp(c.x0, c.x1, t) + sway, c.y - sag, z));
        }
        const curve = new THREE.CatmullRomCurve3(pts);
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 180, c.radius, 4, false), cableMat);
        tube.receiveShadow = true;
        world.add(tube);
    }
    for (const [z, len, x] of [ [ -4.4, 1.8, .4 ], [ -14.8, 2.1, .8 ], [ -25, 2.4, .65 ] ]) {
        const curve = new THREE.CatmullRomCurve3([ new THREE.Vector3(-HW + .05, 2.92, z), new THREE.Vector3(-.5, 2.87, z), new THREE.Vector3(x - .6, 2.98, z - .35), new THREE.Vector3(x, 2.86, z - .08) ]);
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 50, .007, 4, false), cableMat);
        tube.castShadow = false;
        world.add(tube);
        const box = new THREE.Mesh(new THREE.BoxGeometry(.25, .16, .14), darkMetal);
        box.position.set(x, 2.9, z);
        world.add(box);
    }
    const downpipe = new THREE.Mesh(new THREE.CylinderGeometry(.036, .042, 1.28, 9), pipeMat);
    downpipe.position.set(-HW + .12, 2.31, -7.8);
    downpipe.rotation.z = .03;
    world.add(downpipe);
    const elbow = new THREE.Mesh(new THREE.TorusGeometry(.13, .035, 6, 12, Math.PI / 2), pipeMat);
    elbow.position.set(-HW + .23, 2.95, -7.8);
    elbow.rotation.y = Math.PI / 2;
    elbow.rotation.z = Math.PI;
    world.add(elbow);
    for (const yy of [ 1.8, 2.5 ]) {
        const bracket = new THREE.Mesh(new THREE.BoxGeometry(.08, .04, .09), darkMetal);
        bracket.position.set(-HW + .14, yy, -7.8);
        world.add(bracket);
    }
}

function buildArchitecturalDetails(world, maxAniso) {
    const {halfWidth: HW, height: WH} = CONFIG.tunnel;
    const doorTex = TEX.makeDoorTexture({
        anisotropy: maxAniso,
        seed: 311
    });
    const doorMat = new THREE.MeshStandardMaterial({
        map: doorTex,
        color: 9342080,
        roughness: .5,
        metalness: .48,
        envMapIntensity: .45
    });
    const frameMat = new THREE.MeshStandardMaterial({
        color: 2566693,
        metalness: .63,
        roughness: .5
    });
    const doorWidth = .92;
    const doorHeight = 2.05;
    const doors = [ {
        side: -1,
        z: -13.9,
        seed: 411
    }, {
        side: -1,
        z: -29.2,
        seed: 412
    }, {
        side: 1,
        z: -17.5,
        seed: 413
    }, {
        side: 1,
        z: -31.4,
        seed: 414
    } ];
    for (const d of doors) {
        const g = new THREE.Group;
        const x = d.side * (HW - .025);
        g.position.set(x, 0, d.z);
        g.rotation.y = d.side < 0 ? Math.PI / 2 : -Math.PI / 2;
        const door = new THREE.Mesh(new THREE.PlaneGeometry(doorWidth, doorHeight), doorMat);
        door.position.set(0, doorHeight / 2 + .02, 0);
        door.receiveShadow = true;
        g.add(door);
        const vertical = new THREE.BoxGeometry(.06, doorHeight + .12, .09);
        const horizontal = new THREE.BoxGeometry(doorWidth + .12, .06, .09);
        for (const s of [ -1, 1 ]) {
            const bar = new THREE.Mesh(vertical, frameMat);
            bar.position.set(s * (doorWidth / 2 + .03), doorHeight / 2 + .02, .01);
            bar.castShadow = true;
            g.add(bar);
            const cross = new THREE.Mesh(horizontal, frameMat);
            cross.position.set(0, s < 0 ? .03 : doorHeight + .09, .01);
            g.add(cross);
        }
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(.014, .014, .15, 6), frameMat);
        handle.rotation.z = Math.PI / 2;
        handle.position.set(doorWidth * .32, .93, .055);
        g.add(handle);
        world.add(g);
    }
    const boxMat = new THREE.MeshStandardMaterial({
        color: 3355693,
        metalness: .6,
        roughness: .45
    });
    const boxes = [ {
        side: -1,
        y: 2.62,
        z: -4.8,
        w: .27,
        h: .38
    }, {
        side: -1,
        y: 2.62,
        z: -20.9,
        w: .22,
        h: .3
    }, {
        side: 1,
        y: 2.56,
        z: -8.6,
        w: .3,
        h: .4
    }, {
        side: 1,
        y: 2.57,
        z: -25.6,
        w: .24,
        h: .32
    } ];
    for (const b of boxes) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(.065, b.h, b.w), boxMat);
        panel.position.set(b.side * (HW - .04), b.y, b.z);
        panel.castShadow = true;
        panel.receiveShadow = true;
        world.add(panel);
        const lip = new THREE.Mesh(new THREE.BoxGeometry(.03, .025, b.w + .05), new THREE.MeshStandardMaterial({
            color: 1447956,
            metalness: .5,
            roughness: .4
        }));
        lip.position.set(b.side * (HW - .075), b.y + b.h / 2, b.z);
        world.add(lip);
    }
    const signTex = TEX.makeAusgangTexture();
    const signMat = new THREE.MeshStandardMaterial({
        map: signTex,
        emissive: 9221050,
        emissiveMap: signTex,
        emissiveIntensity: .55,
        roughness: .6,
        metalness: .15
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.15, .287), signMat);
    sign.position.set(.9, 2.62, -14.5);
    world.add(sign);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.24, .36, .035), new THREE.MeshStandardMaterial({
        color: 1514008,
        metalness: .4,
        roughness: .55
    }));
    back.position.set(.9, 2.62, -14.52);
    back.castShadow = true;
    world.add(back);
    for (const s of [ -1, 1 ]) {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .34, 4), frameMat);
        rod.position.set(.9 + s * .42, 2.83, -14.5);
        world.add(rod);
    }
    const signGlow = new THREE.PointLight(9417920, 1.1, 3.6, 2);
    signGlow.position.set(.9, 2.55, -14.2);
    world.add(signGlow);
}

function addWallDecal(world, texture, {side: side = -1, z: z, y: y, width: width, height: height, roughness: roughness = .5, opacity: opacity = 1, offset: offset = .007, order: order = 4}) {
    const mat = new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        opacity: opacity,
        roughness: roughness,
        metalness: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
        alphaTest: .015,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
        envMapIntensity: .5
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
    mesh.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    mesh.position.set(side * (CONFIG.tunnel.halfWidth - offset), y, z);
    mesh.renderOrder = order;
    mesh.name = "spray-decal";
    world.add(mesh);
    return mesh;
}

function buildGraffitiDecals(world, maxAniso) {
    const tag = TEX.makeTagTexture({
        width: 1536,
        height: 768,
        kind: "brush",
        lines: [ "BETTER", "DAYS" ],
        font: "Permanent Marker",
        size: 345,
        stroke: 19,
        lineHeight: .92,
        spacing: 3,
        xScale: .82,
        color: "#080a0a",
        rotate: -.032,
        skew: -.1,
        alpha: .95,
        drips: true,
        seed: 811,
        anisotropy: maxAniso,
        accent: "rgba(8,10,10,0.5)",
        dots: true,
        spray: true
    });
    addWallDecal(world, tag, {
        side: -1,
        z: 3.4,
        y: 1.8,
        width: .58,
        height: .29,
        roughness: .36,
        order: 8
    });
    const dots = TEX.makeDotsTexture({
        anisotropy: maxAniso
    });
    addWallDecal(world, dots, {
        side: -1,
        z: 3.33,
        y: 1.65,
        width: .17,
        height: .066,
        roughness: .42,
        opacity: .82,
        offset: .0095,
        order: 9
    });
    const ghost = TEX.makeTagTexture({
        width: 1536,
        height: 512,
        kind: "outline",
        text: "NOX",
        font: "Sedgwick Ave Display",
        fill: "rgba(201,198,178,0.75)",
        color: "#262722",
        size: 280,
        rotate: -.06,
        skew: -.16,
        spacing: 20,
        alpha: .22,
        drips: false,
        seed: 55,
        anisotropy: maxAniso,
        spray: false
    });
    addWallDecal(world, ghost, {
        side: -1,
        z: 1.82,
        y: 1.13,
        width: 1,
        height: .34,
        roughness: .8,
        opacity: .24,
        offset: .004,
        order: 3
    });
    const decals = [ {
        z: -.33,
        y: 1.45,
        width: 1.25,
        height: .5,
        side: -1,
        opts: {
            kind: "outline",
            text: "SAVE",
            font: "Permanent Marker",
            fill: "#d9d5c2",
            color: "#151616",
            size: 290,
            xScale: .86,
            width: 1600,
            height: 640,
            rotate: -.045,
            skew: -.18,
            alpha: .86,
            seed: 43
        }
    }, {
        z: -1.55,
        y: 2.25,
        width: .7,
        height: .36,
        side: -1,
        opts: {
            kind: "handstyle",
            sig: "rhe",
            color: "#101111",
            width: 1024,
            height: 512,
            loops: 4,
            seed: 78
        }
    }, {
        z: -2.8,
        y: 1.15,
        width: 1.15,
        height: .56,
        side: -1,
        opts: {
            kind: "brush",
            text: "MUTE",
            font: "Permanent Marker",
            color: "#dfdac8",
            size: 250,
            xScale: .82,
            width: 1536,
            height: 640,
            rotate: .04,
            skew: .14,
            alpha: .75,
            seed: 96
        }
    }, {
        z: -4.15,
        y: 2.02,
        width: 1.35,
        height: .62,
        side: -1,
        opts: {
            kind: "outline",
            text: "129",
            font: "Bangers",
            fill: "#181a19",
            color: "#ddd8c4",
            size: 320,
            width: 1536,
            height: 640,
            rotate: -.04,
            skew: .12,
            alpha: .9,
            seed: 133
        }
    }, {
        z: -5.35,
        y: 1.35,
        width: 1.35,
        height: .5,
        side: -1,
        opts: {
            kind: "handstyle",
            color: "#d7d2bf",
            width: 1536,
            height: 512,
            loops: 6,
            seed: 171,
            sig: "syn"
        }
    }, {
        z: -6.95,
        y: 1.85,
        width: .75,
        height: .32,
        side: -1,
        opts: {
            kind: "handstyle",
            color: "#121313",
            width: 1024,
            height: 512,
            loops: 4,
            seed: 204,
            sig: "k4"
        }
    }, {
        z: 1.43,
        y: 2.4,
        width: .8,
        height: .3,
        side: -1,
        opts: {
            kind: "handstyle",
            color: "#111313",
            width: 1024,
            height: 512,
            loops: 5,
            seed: 331,
            sig: "nox"
        }
    }, {
        z: 3.02,
        y: 1.08,
        width: .9,
        height: .28,
        side: -1,
        opts: {
            kind: "handstyle",
            color: "#d5d0bc",
            width: 1024,
            height: 512,
            loops: 4,
            seed: 377,
            sig: "rhe"
        }
    }, {
        z: 1.06,
        y: 1.22,
        width: .55,
        height: .22,
        side: -1,
        opts: {
            kind: "logo",
            color: "#d4cfba",
            width: 1024,
            height: 512,
            seed: 389
        }
    }, {
        z: 3.08,
        y: 2.55,
        width: .72,
        height: .28,
        side: -1,
        opts: {
            kind: "handstyle",
            color: "#0e100f",
            width: 1024,
            height: 512,
            loops: 3,
            seed: 401,
            sig: "13"
        }
    }, {
        z: .06,
        y: 2.38,
        width: .9,
        height: .3,
        side: -1,
        opts: {
            kind: "handstyle",
            color: "#d6d0bc",
            width: 1024,
            height: 512,
            loops: 5,
            seed: 417,
            sig: "mute"
        }
    }, {
        z: -2.2,
        y: 1.85,
        width: .7,
        height: .26,
        side: -1,
        opts: {
            kind: "brush",
            text: "4SP",
            font: "Permanent Marker",
            color: "#c9c3ae",
            size: 260,
            xScale: .85,
            width: 1024,
            height: 512,
            rotate: .12,
            skew: .2,
            alpha: .66,
            seed: 433
        }
    } ];
    for (const d of decals) {
        const tex = TEX.makeTagTexture({
            ...d.opts,
            anisotropy: maxAniso
        });
        addWallDecal(world, tex, {
            side: d.side,
            z: d.z,
            y: d.y,
            width: d.width,
            height: d.height,
            roughness: .48,
            offset: .009,
            order: 7
        });
    }
    const rightTag = TEX.makeTagTexture({
        width: 2048,
        height: 1024,
        kind: "outline",
        text: "STAY",
        font: "Bangers",
        fill: "#c4bfad",
        color: "#080909",
        size: 760,
        strokeWidth: 68,
        rotate: -.018,
        skew: -.075,
        alpha: .94,
        drips: true,
        seed: 903,
        anisotropy: maxAniso
    });
    addWallDecal(world, rightTag, {
        side: 1,
        z: -3.2,
        y: 1.56,
        width: 4.6,
        height: 2,
        roughness: .58,
        opacity: .82,
        offset: .011,
        order: 6
    });
    const rightSticker = TEX.makeTagTexture({
        width: 1024,
        height: 1024,
        kind: "sticker",
        paper: "#b8ae91",
        color: "#161715",
        text: "NACHT",
        subtext: "der tunnel singt leise.",
        seed: 927,
        anisotropy: maxAniso
    });
    addWallDecal(world, rightSticker, {
        side: 1,
        z: -6.4,
        y: 1.85,
        width: .62,
        height: .62,
        roughness: .8,
        opacity: .92,
        offset: .008,
        order: 5
    });
}

function buildDebris(world, maxAniso) {
    const {halfWidth: HW, zNear: zNear, zFar: zFar} = CONFIG.tunnel;
    const rand = mulberry(8412);
    const paperDefs = [ {
        variant: 0,
        x: -1.62,
        z: 2.65,
        w: .5,
        h: .31,
        rot: .4,
        lift: .014
    }, {
        variant: 2,
        x: -1.22,
        z: 3.2,
        w: .26,
        h: .17,
        rot: -.35,
        lift: .008
    }, {
        variant: 0,
        x: .25,
        z: 2.6,
        w: .17,
        h: .11,
        rot: 1.9,
        lift: .007
    }, {
        variant: 1,
        x: -1.35,
        z: .05,
        w: .2,
        h: .14,
        rot: -.7,
        lift: .02
    }, {
        variant: 2,
        x: -.96,
        z: -2.7,
        w: .42,
        h: .27,
        rot: 1.3,
        lift: .014
    }, {
        variant: 0,
        x: -1.72,
        z: -5.5,
        w: .3,
        h: .2,
        rot: -1.1,
        lift: .02
    }, {
        variant: 1,
        x: .6,
        z: -7.5,
        w: .38,
        h: .22,
        rot: .7,
        lift: .012
    }, {
        variant: 2,
        x: -1.82,
        z: -11,
        w: .3,
        h: .18,
        rot: 2.1,
        lift: .015
    }, {
        variant: 0,
        x: 1.36,
        z: -15,
        w: .24,
        h: .16,
        rot: -.2,
        lift: .008
    }, {
        variant: 1,
        x: -.45,
        z: -20.4,
        w: .22,
        h: .15,
        rot: 1.7,
        lift: .012
    }, {
        variant: 2,
        x: -1.55,
        z: -2,
        w: .3,
        h: .2,
        rot: .2,
        lift: .01
    }, {
        variant: 0,
        x: 1,
        z: -5,
        w: .2,
        h: .14,
        rot: 2.4,
        lift: .008
    }, {
        variant: 0,
        x: -.78,
        z: 1.55,
        w: .48,
        h: .3,
        rot: .22,
        lift: .014
    }, {
        variant: 2,
        x: -.16,
        z: .58,
        w: .34,
        h: .22,
        rot: -.86,
        lift: .01
    }, {
        variant: 1,
        x: .4,
        z: 1.32,
        w: .38,
        h: .24,
        rot: 1.92,
        lift: .012
    }, {
        variant: 2,
        x: 1.12,
        z: -1.35,
        w: .31,
        h: .2,
        rot: .63,
        lift: .011
    }, {
        variant: 0,
        x: -.3,
        z: -3.9,
        w: .32,
        h: .21,
        rot: -1.4,
        lift: .012
    } ];
    const paperTextures = [ 0, 1, 2 ].map(v => TEX.makePaperTexture({
        variant: v,
        anisotropy: maxAniso
    }));
    const paperMats = paperTextures.map((p, v) => new THREE.MeshStandardMaterial({
        map: p.map,
        alphaMap: p.alphaMap,
        alphaTest: .38,
        side: THREE.DoubleSide,
        roughness: .9,
        metalness: 0,
        color: [ 8354151, 7630687, 8880237 ][v],
        envMapIntensity: .25
    }));
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = shadowCanvas.height = 128;
    const sctx = shadowCanvas.getContext("2d");
    const sg = sctx.createRadialGradient(64, 64, 2, 64, 64, 62);
    sg.addColorStop(0, "rgba(0,0,0,0.62)");
    sg.addColorStop(.45, "rgba(0,0,0,0.36)");
    sg.addColorStop(1, "rgba(0,0,0,0)");
    sctx.fillStyle = sg;
    sctx.fillRect(0, 0, 128, 128);
    const contactTex = new THREE.CanvasTexture(shadowCanvas);
    const contactMat = new THREE.MeshBasicMaterial({
        map: contactTex,
        transparent: true,
        opacity: .8,
        depthWrite: false,
        color: 0,
        polygonOffset: true,
        polygonOffsetFactor: -1
    });
    const contactGeo = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < paperDefs.length; i++) {
        const d = paperDefs[i];
        const segments = 7;
        const geo = new THREE.PlaneGeometry(d.w, d.h, segments, 5);
        const pos = geo.attributes.position;
        const r = mulberry(731 + i * 13);
        for (let v = 0; v < pos.count; v++) {
            const x = pos.getX(v);
            const y = pos.getY(v);
            const edge = Math.min(Math.abs(x) / (d.w / 2), Math.abs(y) / (d.h / 2), 1);
            const crumple = (r() - .5) * .014 * (1 - edge * .4);
            pos.setZ(v, crumple + Math.sin((x + y) * 30) * .003);
        }
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, paperMats[d.variant]);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(d.x, .012 + d.lift, d.z);
        mesh.rotation.z = d.rot;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        world.add(mesh);
        const contact = new THREE.Mesh(contactGeo, contactMat);
        contact.rotation.x = -Math.PI / 2;
        contact.rotation.z = d.rot;
        contact.position.set(d.x + .012, .0105, d.z + .016);
        contact.scale.set(d.w * 1.35, d.h * 1.5, 1);
        contact.renderOrder = 2.4;
        world.add(contact);
    }
    const flakeGeo = new THREE.PlaneGeometry(1, 1);
    const flakeMat = new THREE.MeshStandardMaterial({
        color: 3747362,
        roughness: .92,
        side: THREE.DoubleSide
    });
    const flakes = new THREE.InstancedMesh(flakeGeo, flakeMat, 220);
    const dummy = new THREE.Object3D;
    for (let i = 0; i < 220; i++) {
        const edge = rand() > .55 ? -1 : 1;
        const x = edge * (HW - .08 - Math.pow(rand(), 1.7) * .55) + (rand() - .5) * .35;
        const z = zNear - .2 - rand() * (zNear - zFar - 1);
        dummy.position.set(x, .009 + rand() * .008, z);
        dummy.rotation.set(-Math.PI / 2, 0, rand() * Math.PI * 2);
        dummy.scale.set(.018 + rand() * .075, .012 + rand() * .055, 1);
        dummy.updateMatrix();
        flakes.setMatrixAt(i, dummy.matrix);
    }
    flakes.castShadow = false;
    flakes.receiveShadow = true;
    world.add(flakes);
    const metalBits = new THREE.InstancedMesh(new THREE.BoxGeometry(.025, .006, .06), new THREE.MeshStandardMaterial({
        color: 5790545,
        metalness: .7,
        roughness: .35
    }), 32);
    for (let i = 0; i < 32; i++) {
        dummy.position.set(HW - .34 + (rand() - .5) * .2, .03, 5 - rand() * 28);
        dummy.rotation.set(0, rand() * Math.PI, (rand() - .5) * .3);
        dummy.scale.setScalar(.5 + rand() * 1.2);
        dummy.updateMatrix();
        metalBits.setMatrixAt(i, dummy.matrix);
    }
    metalBits.castShadow = true;
    metalBits.receiveShadow = true;
    world.add(metalBits);
    const twigGeo = new THREE.CylinderGeometry(.002, .004, .11, 4);
    const twigMat = new THREE.MeshStandardMaterial({
        color: 2564891,
        roughness: .95
    });
    const twigs = new THREE.InstancedMesh(twigGeo, twigMat, 36);
    for (let i = 0; i < 36; i++) {
        dummy.position.set(-HW + .12 + rand() * .25, .006, zNear - 1.5 - rand() * 35);
        dummy.rotation.set(Math.PI / 2, 0, rand() * Math.PI * 2);
        dummy.scale.set(.5 + rand(), .5 + rand(), .7);
        dummy.updateMatrix();
        twigs.setMatrixAt(i, dummy.matrix);
    }
    world.add(twigs);
}

function mulberry(seed) {
    let a = seed >>> 0;
    return function() {
        a += 1831565813;
        let t = a;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

function buildDust(world) {
    const rand = mulberry(5121);
    const count = 520;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
        positions[i * 3] = (rand() - .5) * (CONFIG.tunnel.halfWidth * 2 - .2);
        positions[i * 3 + 1] = .25 + rand() * 2.55;
        positions[i * 3 + 2] = CONFIG.tunnel.zNear - rand() * (CONFIG.tunnel.zNear - CONFIG.tunnel.zFar - 4);
        seeds[i] = rand();
    }
    const geo = new THREE.BufferGeometry;
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
            uTime: {
                value: 0
            },
            uPixelRatio: {
                value: Math.min(window.devicePixelRatio || 1, 1.5)
            },
            uColor: {
                value: new THREE.Color(16771269)
            }
        },
        vertexShader: `\n      attribute float aSeed;\n      uniform float uTime;\n      uniform float uPixelRatio;\n      varying float vFade;\n      void main() {\n        vec3 p = position;\n        p.x += sin(uTime * 0.11 + aSeed * 27.0) * 0.12;\n        p.y += sin(uTime * 0.07 + aSeed * 19.0) * 0.09;\n        p.z += cos(uTime * 0.09 + aSeed * 31.0) * 0.1;\n        vec4 mv = modelViewMatrix * vec4(p, 1.0);\n        gl_Position = projectionMatrix * mv;\n        gl_PointSize = (1.2 + aSeed * 2.1) * uPixelRatio * (2.8 / max(-mv.z, 0.5));\n        vFade = smoothstep(0.35, 2.0, -mv.z) * (0.35 + aSeed * 0.65);\n      }\n    `,
        fragmentShader: `\n      uniform vec3 uColor;\n      varying float vFade;\n      void main() {\n        vec2 c = gl_PointCoord - 0.5;\n        float d = length(c);\n        if (d > 0.5) discard;\n        float a = (1.0 - smoothstep(0.0, 0.5, d)) * 0.23 * vFade;\n        gl_FragColor = vec4(uColor * a, a);\n      }\n    `
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    points.name = "airborne-dust";
    world.add(points);
    app.dust = points;
}

function buildStairway(world, floorTex) {
    const {halfWidth: HW, wetFloorEnd: wetFloorEnd} = CONFIG.tunnel;
    const stepCount = 9;
    const rise = .155;
    const tread = .62;
    const stairStart = wetFloorEnd - .3;
    const stairMat = new THREE.MeshPhysicalMaterial({
        map: floorTex.map.clone(),
        normalMap: floorTex.normalMap.clone(),
        roughnessMap: floorTex.roughnessMap.clone(),
        roughness: .44,
        metalness: .06,
        clearcoat: .3,
        clearcoatRoughness: .34,
        color: 9013372,
        envMapIntensity: .4
    });
    stairMat.map.needsUpdate = true;
    stairMat.map.repeat.set(3.2, 1.4);
    stairMat.normalMap.needsUpdate = true;
    stairMat.normalMap.repeat.set(3.2, 1.4);
    stairMat.roughnessMap.needsUpdate = true;
    stairMat.roughnessMap.repeat.set(2, 1);
    for (let i = 0; i < stepCount; i++) {
        const top = (i + 1) * rise;
        const dz = stairStart - i * tread - tread / 2;
        const box = new THREE.Mesh(new THREE.BoxGeometry(HW * 2, top, tread), stairMat);
        box.position.set(0, top / 2, dz);
        box.receiveShadow = true;
        box.castShadow = i < 3;
        world.add(box);
    }
    const landingTop = stepCount * rise;
    const landingDepth = 5.4;
    const landing = new THREE.Mesh(new THREE.BoxGeometry(HW * 2, landingTop, landingDepth), stairMat);
    landing.position.set(0, landingTop / 2, stairStart - stepCount * tread - landingDepth / 2);
    landing.receiveShadow = true;
    world.add(landing);
    const railMat = new THREE.MeshStandardMaterial({
        color: 4013622,
        metalness: .75,
        roughness: .35
    });
    for (const side of [ -1, 1 ]) {
        const x = side * (HW - .14);
        let prev = new THREE.Vector3(x, .88, stairStart + .1);
        for (let i = 0; i < stepCount; i++) {
            const z = stairStart - (i + .55) * tread;
            const p = new THREE.Vector3(x, (i + 1) * rise + .88, z);
            const delta = p.clone().sub(prev);
            const mid = prev.clone().add(p).multiplyScalar(.5);
            const rail = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, delta.length(), 6), railMat);
            rail.position.copy(mid);
            rail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize());
            world.add(rail);
            if (i % 3 === 0) {
                const post = new THREE.Mesh(new THREE.CylinderGeometry(.016, .016, .88, 6), railMat);
                post.position.set(x, (i + 1) * rise + .44, z);
                world.add(post);
            }
            prev = p;
        }
    }
    const exitTex = makeExitGlowTexture();
    const exitMat = new THREE.MeshStandardMaterial({
        map: exitTex,
        color: 1251866,
        emissive: 10470089,
        emissiveMap: exitTex,
        emissiveIntensity: 1.5,
        roughness: .95,
        metalness: 0
    });
    const exitZ = stairStart - stepCount * tread - landingDepth + .1;
    const exit = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.92), exitMat);
    exit.position.set(.15, landingTop + .98, exitZ);
    world.add(exit);
    const surround = new THREE.MeshStandardMaterial({
        color: 724235,
        roughness: .7,
        metalness: .2
    });
    const exitFrame = new THREE.Group;
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(1.9, .18, .18), surround);
    topBar.position.y = 1.76;
    exitFrame.add(topBar);
    for (const s of [ -1, 1 ]) {
        const sideBar = new THREE.Mesh(new THREE.BoxGeometry(.18, 1.9, .18), surround);
        sideBar.position.x = s * .86;
        sideBar.position.y = .88;
        exitFrame.add(sideBar);
    }
    exitFrame.position.copy(exit.position);
    exitFrame.position.z += .04;
    world.add(exitFrame);
    const exitLight = new THREE.PointLight(10143440, 5.5, 16, 2);
    exitLight.position.set(.1, 2.25, exitZ + 1.5);
    world.add(exitLight);
    app.exitLight = exitLight;
    const stairFill = new THREE.PointLight(9221825, 5, 12, 2);
    stairFill.position.set(.3, 2.05, stairStart - stepCount * tread - .5);
    world.add(stairFill);
    app.stairFill = stairFill;
    const stairSpot = new THREE.SpotLight(11062742, 20, 18, .8, .92, 1.7);
    stairSpot.position.set(-.1, 2.95, exitZ + 1.2);
    stairSpot.target.position.set(.1, 1.15, stairStart - 1.5);
    stairSpot.name = "stair-exit-spill";
    world.add(stairSpot);
    world.add(stairSpot.target);
    const stripMat = new THREE.MeshBasicMaterial({
        color: 7977416,
        toneMapped: true,
        fog: true
    });
    const strip = new THREE.Mesh(new THREE.BoxGeometry(1.25, .035, .05), stripMat);
    strip.position.set(.1, 2.9, exitZ + .25);
    world.add(strip);
}

function makeExitGlowTexture() {
    const {canvas: canvas, ctx: ctx} = (() => {
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 1024;
        return {
            canvas: canvas,
            ctx: canvas.getContext("2d")
        };
    })();
    ctx.fillStyle = "#050707";
    ctx.fillRect(0, 0, 512, 1024);
    const g = ctx.createLinearGradient(0, 0, 0, 1024);
    g.addColorStop(0, "#617c83");
    g.addColorStop(.32, "#b1d7d8");
    g.addColorStop(.63, "#4f7378");
    g.addColorStop(1, "#0b1111");
    ctx.fillStyle = g;
    ctx.fillRect(84, 92, 344, 900);
    ctx.fillStyle = "rgba(7,13,14,0.64)";
    ctx.fillRect(138, 228, 236, 764);
    ctx.fillStyle = "rgba(173,206,205,0.18)";
    for (let i = 0; i < 7; i++) {
        ctx.fillRect(110, 880 + i * 15, 292, 4 + i);
    }
    const rand = mulberry(99);
    ctx.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 80; i++) {
        ctx.globalAlpha = .1 + rand() * .5;
        ctx.beginPath();
        ctx.ellipse(rand() * 512, rand() * 1024, 2 + rand() * 28, 4 + rand() * 50, rand(), 0, Math.PI * 2);
        ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function buildFarExit(world) {
    const end = new THREE.Mesh(new THREE.PlaneGeometry(CONFIG.tunnel.halfWidth * 2, CONFIG.tunnel.height), new THREE.MeshStandardMaterial({
        color: 197892,
        roughness: .95
    }));
    end.position.set(0, CONFIG.tunnel.height / 2, CONFIG.tunnel.zFar - .2);
    world.add(end);
}

function initPostprocessing() {
    const renderer = app.renderer;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pixelRatio = renderer.getPixelRatio();
    const rt = new THREE.WebGLRenderTarget(Math.round(w * pixelRatio), Math.round(h * pixelRatio), {
        type: THREE.HalfFloatType,
        samples: 4
    });
    rt.texture.name = "composer-hdr";
    const composer = new EffectComposer(renderer, rt);
    composer.setPixelRatio(pixelRatio);
    composer.setSize(w, h);
    const renderPass = new RenderPass(app.scene, app.camera);
    composer.addPass(renderPass);
    const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), .4, .8, 1);
    bloom.threshold = 1;
    bloom.strength = .33;
    bloom.radius = .8;
    composer.addPass(bloom);
    app.bloom = bloom;
    const grade = new ShaderPass(GradeShader);
    grade.uniforms.uTime.value = 0;
    grade.uniforms.uResolution.value.set(w * pixelRatio, h * pixelRatio);
    grade.uniforms.uGrain.value = CAPTURE ? .026 : .03;
    grade.uniforms.uVignette.value = .38;
    composer.addPass(grade);
    app.gradePass = grade;
    const output = new OutputPass;
    composer.addPass(output);
    app.composer = composer;
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
            value: new THREE.Vector2(1, 1)
        },
        uGrain: {
            value: .02
        },
        uVignette: {
            value: .6
        }
    },
    vertexShader: `\n    varying vec2 vUv;\n    void main() {\n      vUv = uv;\n      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n    }\n  `,
    fragmentShader: `\n    uniform sampler2D tDiffuse;\n    uniform float uTime;\n    uniform vec2 uResolution;\n    uniform float uGrain;\n    uniform float uVignette;\n    varying vec2 vUv;\n\n    float hash(vec2 p) {\n      p = fract(p * vec2(123.34, 456.21));\n      p += dot(p, p + 45.32);\n      return fract(p.x * p.y);\n    }\n\n    void main() {\n      vec2 centered = vUv - 0.5;\n      float r2 = dot(centered, centered);\n      // very restrained lateral chromatic aberration, strongest at the edges\n      vec2 ca = centered * r2 * 0.0026;\n      vec3 col;\n      col.r = texture2D(tDiffuse, vUv + ca).r;\n      col.g = texture2D(tDiffuse, vUv).g;\n      col.b = texture2D(tDiffuse, vUv - ca).b;\n\n      // Cool the shadows and warm the practical-light highlights.\n      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));\n      vec3 shadowTint = vec3(0.93, 0.995, 1.035);\n      vec3 highTint = vec3(1.02, 1.0, 0.975);\n      col *= mix(shadowTint, highTint, smoothstep(0.025, 0.7, luma));\n      // Paint wants a little more chroma than the grime around it.\n      col = mix(vec3(luma), col, 1.06);\n      col = max(col, vec3(0.0));\n\n      // Gentle vignette with an off-centre centre of gravity toward the left wall.\n      vec2 vc = vUv - vec2(0.47, 0.54);\n      float vig = 1.0 - smoothstep(0.18, 0.72, length(vc * vec2(0.86, 1.0)));\n      col *= mix(1.0, vig, uVignette);\n\n      // Film grain. Keep it fine and quiet.\n      float grain = hash(floor(vUv * uResolution) + fract(uTime) * 17.3) - 0.5;\n      col += grain * uGrain * (0.35 + 0.65 * smoothstep(0.0, 0.4, luma));\n\n      gl_FragColor = vec4(col, 1.0);\n    }\n  `
};

function triggerFlicker({silent: silent = false} = {}) {
    if (app.flicker?.active) {
        app.flicker = null;
        setFixtureLevelsToBase(true);
    }
    const duration = 3.35;
    const seed = Math.floor(Math.random() * 1e9) + 23;
    const rand = mulberry(seed);
    const tracks = app.fixtures.map((f, idx) => {
        const events = [];
        let t = 0;
        const drama = idx === 0 ? 1 : idx === 1 ? .85 : idx === 2 ? .62 : .35;
        while (t < duration) {
            const dt = .035 + rand() * (.06 + idx * .018);
            let level;
            const burst = t > .16 && t < .95 || t > 1.35 && t < 2 || t > 2.35 && t < 2.95;
            if (idx === 0) {
                if (t < .11) level = .02; else if (t < .42) level = rand() > .42 ? 1.12 : .08; else if (t < 1.1) level = rand() > .55 ? 1.34 : .1; else if (t < 1.7) level = rand() > .35 ? .92 : .04; else if (t < 2.35) level = rand() > .6 ? 1.22 : .06; else level = rand() > .18 ? 1 : .13;
            } else if (idx === 1) {
                if (t < .2) level = .18; else if (t > 1.25 && t < 2.1) level = rand() > .66 ? 1.1 : .15; else level = rand() > .26 ? .9 + rand() * .16 : .12;
            } else if (idx === 2) {
                if (t > .6 && t < 1.32) level = rand() > .6 ? .75 : .08; else if (t > 2.1 && t < 2.55) level = .02; else level = rand() > .18 ? .85 + rand() * .18 : .25;
            } else {
                const windowed = burst ? 1 : .65;
                level = (rand() > .17 ? .8 + rand() * .22 : .06) * windowed;
            }
            if (idx < 3 && drama > .6 && rand() > .955) level *= 1.5;
            events.push({
                t: t,
                level: Math.max(0, level)
            });
            t += dt;
        }
        return {
            events: events,
            duration: duration,
            idx: idx
        };
    });
    app.flicker = {
        active: true,
        start: performance.now() / 1e3,
        duration: duration,
        tracks: tracks,
        seed: seed,
        silent: silent
    };
    if (!silent) document.body.classList.add("is-flickering");
    updateFlickerUI(true);
}

function sampleTrack(track, elapsed) {
    const ev = track.events;
    if (!ev.length) return 1;
    let lo = 0;
    let hi = ev.length - 1;
    if (elapsed <= ev[0].t) return ev[0].level;
    if (elapsed >= ev[hi].t) return ev[hi].level;
    while (lo <= hi) {
        const mid = lo + hi >> 1;
        if (ev[mid].t < elapsed) lo = mid + 1; else hi = mid - 1;
    }
    return ev[lo]?.level ?? 1;
}

function setFixtureLevel(f, level) {
    f.level = level;
    const visible = .02 + .98 * level;
    f.diffuserMat.emissiveIntensity = f.baseEmissive * visible;
    f.rect.intensity = f.rectBase * (.03 + .97 * level);
    if (f.upRect) f.upRect.intensity = f.upRectBase * (.04 + .96 * level);
    for (const entry of f.lamps) {
        entry.light.intensity = entry.base * (.02 + .98 * level);
    }
}

function setFixtureLevelsToBase(instant = false) {
    for (const f of app.fixtures) {
        if (instant) setFixtureLevel(f, 1); else f.targetLevel = 1;
    }
    if (app.entranceFill) app.entranceFill.light.intensity = app.entranceFill.base;
}

function updateFlicker(nowSec, dt) {
    const f = app.flicker;
    if (f?.active) {
        const t = nowSec - f.start;
        for (const track of f.tracks) {
            const fixture = app.fixtures[track.idx];
            const level = sampleTrack(track, t);
            setFixtureLevel(fixture, level);
        }
        if (app.entranceFill) {
            const lv = app.fixtures[0]?.level ?? 1;
            app.entranceFill.light.intensity = app.entranceFill.base * (.1 + .9 * lv);
            if (app.entranceGraze) app.entranceGraze.light.intensity = app.entranceGraze.base * (.04 + .96 * lv);
        }
        const pulse = .84 + (app.fixtures[0]?.level ?? 1) * .15;
        app.mirrorBaseGain = pulse * 1.18;
        if (t >= f.duration) {
            app.flicker = null;
            document.body.classList.remove("is-flickering");
            updateFlickerUI(false);
            setFixtureLevelsToBase(false);
        }
    } else {
        for (const fixture of app.fixtures) {
            if (fixture.targetLevel !== fixture.level) {
                const next = THREE.MathUtils.damp(fixture.level, fixture.targetLevel, 5, dt);
                setFixtureLevel(fixture, next);
            }
        }
        if (app.entranceFill) {
            app.entranceFill.light.intensity = THREE.MathUtils.damp(app.entranceFill.light.intensity, app.entranceFill.base, 5, dt);
            if (app.entranceGraze) app.entranceGraze.light.intensity = THREE.MathUtils.damp(app.entranceGraze.light.intensity, app.entranceGraze.base, 5, dt);
        }
        app.mirrorBaseGain = THREE.MathUtils.damp(app.mirrorBaseGain, 1.18 + .035 * Math.sin(nowSec * .5), 2, dt);
    }
    if (app.mirror?.material?.uniforms?.uGain) {
        app.mirror.material.uniforms.uGain.value = app.mirrorBaseGain;
    }
}

function updateFlickerUI(active) {
    const btn = document.getElementById("flicker-btn");
    if (!btn) return;
    btn.classList.toggle("active", active);
    const label = btn.querySelector(".btn-label");
    if (label) label.textContent = active ? "SETTLING" : "FLICKER";
    btn.setAttribute("aria-pressed", active ? "true" : "false");
}

function bindUI() {
    const flickerBtn = document.getElementById("flicker-btn");
    const resetBtn = document.getElementById("reset-btn");
    const saveBtn = document.getElementById("save-btn");
    const hideBtn = document.getElementById("hide-btn");
    const enterBtn = document.getElementById("enter-btn");
    flickerBtn?.addEventListener("click", () => triggerFlicker());
    resetBtn?.addEventListener("click", resetView);
    saveBtn?.addEventListener("click", () => saveFrame());
    hideBtn?.addEventListener("click", toggleChrome);
    enterBtn?.addEventListener("click", () => {
        document.getElementById("intro-note")?.classList.add("dismissed");
    });
    document.getElementById("intro-note")?.addEventListener("click", () => {
        document.getElementById("intro-note")?.classList.add("dismissed");
    });
    window.addEventListener("keydown", event => {
        if (event.repeat) return;
        const key = event.key.toLowerCase();
        if (key === "f" || event.code === "Space") {
            if (event.target instanceof HTMLElement && event.target.closest("button") && event.code === "Space") return;
            event.preventDefault();
            triggerFlicker();
        } else if (key === "r") {
            event.preventDefault();
            resetView();
        } else if (key === "s") {
            event.preventDefault();
            saveFrame();
        } else if (key === "h") {
            event.preventDefault();
            toggleChrome();
        }
    });
    window.__triggerFlicker = triggerFlicker;
    window.__resetView = resetView;
    window.__getDiagnostics = getDiagnostics;
}

function resetView() {
    app.camera.position.copy(CONFIG.camera.position);
    app.controls.target.copy(CONFIG.camera.target);
    app.controls.update();
}

function toggleChrome() {
    document.documentElement.classList.toggle("chrome-hidden");
}

function saveFrame() {
    app.composer.render();
    const canvas = app.renderer.domElement;
    try {
        const link = document.createElement("a");
        link.download = `after-hours-${(new Date).toISOString().replace(/[:.]/g, "-")}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    } catch (error) {
        console.warn("Unable to save frame", error);
    }
}

function applyCinematicFrustum() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const virtualWidth = Math.round(w * 2 * CONFIG.camera.opticalAxisFraction);
    app.camera.setViewOffset(virtualWidth, h, 0, 0, w, h);
}

function onResize() {
    if (!app.renderer || !app.camera) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, CAPTURE ? 1 : 1.5);
    app.renderer.setPixelRatio(pixelRatio);
    app.renderer.setSize(w, h);
    app.camera.aspect = w / h;
    applyCinematicFrustum();
    app.camera.updateProjectionMatrix();
    if (app.composer) {
        app.composer.setPixelRatio(pixelRatio);
        app.composer.setSize(w, h);
        if (app.gradePass) app.gradePass.uniforms.uResolution.value.set(w * pixelRatio, h * pixelRatio);
        if (app.bloom) app.bloom.setSize(w, h);
    }
    if (app.mirror) {
        const rt = app.mirror.getRenderTarget();
        rt.setSize(Math.max(512, Math.round(w * pixelRatio * .72)), Math.max(384, Math.round(h * pixelRatio * .72)));
    }
    if (app.dust) app.dust.material.uniforms.uPixelRatio.value = pixelRatio;
}

function tick() {
    if (app.disposed) return;
    const dt = Math.min(app.clock.getDelta(), .06);
    app.elapsed += dt;
    const nowSec = performance.now() / 1e3;
    updateFlicker(nowSec, dt);
    if (!reduceMotion) {
        const t = app.elapsed;
        app.camera.position.x += Math.sin(t * .31) * 12e-6;
        app.camera.position.y += Math.sin(t * .23 + 1.7) * 9e-6;
    }
    app.controls.update();
    if (app.mirror) {
        app.mirror.material.uniforms.uTime.value = app.elapsed;
    }
    if (app.dust) {
        app.dust.material.uniforms.uTime.value = app.elapsed;
    }
    if (app.gradePass) {
        app.gradePass.uniforms.uTime.value = CAPTURE ? 1 : app.elapsed;
    }
    renderFrame(dt);
}

function renderFrame(dt) {
    app.renderer.info.reset();
    app.composer.render(dt);
    app.frames++;
}

function getDiagnostics() {
    const gl = app.renderer?.getContext();
    const info = app.renderer?.info;
    const dbg = gl?.getExtension("WEBGL_debug_renderer_info");
    return {
        ready: Boolean(window.__sceneReady),
        timestamp: (new Date).toISOString(),
        loadMs: Math.round((app.readyAt || performance.now()) - app.startedAt),
        viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
            pixelRatio: app.renderer?.getPixelRatio()
        },
        camera: {
            position: app.camera?.position.toArray().map(n => +n.toFixed(4)),
            target: app.controls?.target.toArray().map(n => +n.toFixed(4)),
            fov: app.camera?.fov,
            near: app.camera?.near,
            far: app.camera?.far,
            projection: "asymmetric tilt-shift crop, optical axis at " + Math.round(CONFIG.camera.opticalAxisFraction * 100) + "% width"
        },
        webgl: {
            version: gl ? gl.getParameter(gl.VERSION) : null,
            shadingLanguage: gl ? gl.getParameter(gl.SHADING_LANGUAGE_VERSION) : null,
            vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl?.getParameter(gl.VENDOR),
            renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl?.getParameter(gl.RENDERER),
            maxTextureSize: gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : null,
            maxAnisotropy: app.renderer?.capabilities.getMaxAnisotropy()
        },
        render: {
            frames: app.frames,
            triangles: info?.render.triangles ?? null,
            drawCalls: info?.render.calls ?? null,
            textures: info?.memory.textures ?? null,
            geometries: info?.memory.geometries ?? null,
            programs: info?.programs?.length ?? null
        },
        scene: {
            meshes: countType(app.scene, "isMesh"),
            lights: countType(app.scene, "isLight"),
            points: countType(app.scene, "isPoints"),
            fixtures: app.fixtures.length,
            usePlanarReflection: true,
            useOrbitControls: true,
            flickerTrigger: typeof window.__triggerFlicker === "function"
        },
        errors: app.errors
    };
}

function countType(root, prop) {
    let count = 0;
    root?.traverse(o => {
        if (o[prop]) count++;
    });
    return count;
}

function showFatal(error) {
    const loader = document.getElementById("loader");
    const label = document.getElementById("loader-label");
    if (label) label.textContent = "The passage could not be opened. Check WebGL support.";
    if (loader) loader.classList.add("failed");
    window.__sceneFailed = true;
    console.error(error);
}

function updateFlickerUIPublic(active) {
    updateFlickerUI(active);
}
