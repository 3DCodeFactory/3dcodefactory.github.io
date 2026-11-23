import * as THREE from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

import { buildTextures } from "./textures.js";

import { DESTINATIONS } from "./art.js";

const TAU = Math.PI * 2;

const params = new URLSearchParams(window.location.search);

const CAPTURE = params.has("capture") || params.has("still");

if (CAPTURE) document.body.classList.add("is-capture");

const canvas = document.getElementById("scene-canvas");

const loadingStatus = document.getElementById("loading-status");

const loader = document.getElementById("loader");

const errorCard = document.getElementById("error-card");

const errorMessage = document.getElementById("error-message");

const hint = document.getElementById("hint");

const selectionEl = document.getElementById("selection");

const selectionKicker = document.getElementById("selection-kicker");

const selectionTitle = document.getElementById("selection-title");

const selectionLine = document.getElementById("selection-line");

const tooltip = document.getElementById("tooltip");

const tooltipTitle = document.getElementById("tooltip-title");

const tooltipSub = document.getElementById("tooltip-sub");

const resetViewButton = document.getElementById("reset-view");

const runtime = {
    startedAt: performance.now(),
    errors: [],
    webgl: null,
    ready: false,
    firstFrameMs: null,
    selectedBrochure: null,
    globeTurns: 0
};

window.addEventListener("error", e => {
    runtime.errors.push(String(e.message || e.error || "Unknown error"));
});

window.addEventListener("unhandledrejection", e => {
    runtime.errors.push(String(e.reason || "Unhandled rejection"));
});

let renderer, scene, camera, controls;

let T, MAT;

let posterGroup, smallPosterGroups = [];

let rackGroup, rackSpot, browseLight, cardLights = [];

let globe;

let dust, innerDusts;

let outsidePlant;

let animatedLampMaterials = [];

let moonLight;

let browseHalo;

let selectedIndex = -1;

const cards = [];

const pickMeshes = [];

const raycaster = new THREE.Raycaster;

const pointerNDC = new THREE.Vector2(0, 0);

let pointerX = 0, pointerY = 0;

let hoveredKind = null;

let pointerDownInfo = null;

let globeDrag = null;

let suppressClickUntil = 0;

let dirtyCardMaterial = false;

let frameCount = 0;

let lastDiagnosticsCapture = null;

const clock = new THREE.Clock;

const _tmpColor = new THREE.Color;

const cameraHome = new THREE.Vector3(-.35, 2.28, 8.8);

const targetHome = new THREE.Vector3(-.35, 2.28, 0);

let lastInteraction = -10;

let cameraResetTween = null;

const CARD_VIS = {
    w: .288,
    h: .205,
    coverThickness: .0055,
    gap: .02,
    rows: 5,
    cols: 3,
    atlasCols: 4,
    atlasRows: 4
};

function setStatus(text) {
    if (loadingStatus) loadingStatus.textContent = text;
}

async function nextPaint() {
    await new Promise(r => requestAnimationFrame(() => r()));
}

function makeWoodMaterial({vertical: vertical = true, color: color = 16777215, roughness: roughness = .6, bump: bump = .009, repeat: repeat = [ 1, 1 ], env: env = .28} = {}) {
    const map = T.wood.color.clone();
    const bumpMap = T.wood.bump.clone();
    map.needsUpdate = true;
    bumpMap.needsUpdate = true;
    map.repeat.set(repeat[0], repeat[1]);
    bumpMap.repeat.set(repeat[0], repeat[1]);
    if (!vertical) {
        map.center.set(.5, .5);
        bumpMap.center.set(.5, .5);
        map.rotation = Math.PI / 2;
        bumpMap.rotation = Math.PI / 2;
    }
    return new THREE.MeshStandardMaterial({
        map: map,
        bumpMap: bumpMap,
        bumpScale: bump,
        color: color,
        roughness: roughness,
        metalness: .02,
        envMapIntensity: env
    });
}

function makeStoneMaterial({color: color = 16777215, repeat: repeat = [ 1.3, 3.3 ], bumpScale: bumpScale = .018} = {}) {
    const map = T.stone.map.clone();
    const bumpMap = T.stone.bump.clone();
    map.needsUpdate = true;
    bumpMap.needsUpdate = true;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
    map.repeat.set(repeat[0], repeat[1]);
    bumpMap.repeat.set(repeat[0], repeat[1]);
    return new THREE.MeshStandardMaterial({
        map: map,
        bumpMap: bumpMap,
        bumpScale: bumpScale,
        color: color,
        roughness: .93,
        metalness: 0,
        envMapIntensity: .2
    });
}

function makePaperMaterial(map, {color: color = 16777215, emissive: emissive = .055, roughness: roughness = .86, side: side = THREE.FrontSide, bump: bump = .002} = {}) {
    return new THREE.MeshStandardMaterial({
        map: map,
        color: color,
        roughness: roughness,
        metalness: 0,
        side: side,
        envMapIntensity: .16,
        bumpMap: map,
        bumpScale: bump,
        emissive: 15852226,
        emissiveMap: map,
        emissiveIntensity: emissive
    });
}

function makePrintMaterial(map, {color: color = 16777215, side: side = THREE.FrontSide, transparent: transparent = false, opacity: opacity = 1} = {}) {
    return new THREE.MeshBasicMaterial({
        map: map,
        color: color,
        side: side,
        transparent: transparent,
        opacity: opacity,
        fog: true,
        toneMapped: true
    });
}

function addObject(parent, geo, material, position = [ 0, 0, 0 ], rotation = [ 0, 0, 0 ], {cast: cast = true, receive: receive = true, name: name} = {}) {
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    if (name) mesh.name = name;
    parent.add(mesh);
    return mesh;
}

function box(parent, w, h, d, x, y, z, material, opts = {}) {
    const bevel = opts.bevel || 0;
    const geo = bevel > 0 ? new RoundedBoxGeometry(w, h, d, opts.segments || 3, bevel) : new THREE.BoxGeometry(w, h, d, opts.segX || 1, opts.segY || 1, opts.segZ || 1);
    return addObject(parent, geo, material, [ x, y, z ], opts.rotation || [ 0, 0, 0 ], {
        cast: opts.cast !== false,
        receive: opts.receive !== false,
        name: opts.name
    });
}

function cylinder(parent, radiusTop, radiusBottom, h, x, y, z, material, opts = {}) {
    const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, h, opts.radialSegments || 24, opts.heightSegments || 1, opts.openEnded || false);
    return addObject(parent, geo, material, [ x, y, z ], opts.rotation || [ 0, 0, 0 ], {
        cast: opts.cast !== false,
        receive: opts.receive !== false,
        name: opts.name
    });
}

function plane(parent, w, h, x, y, z, material, opts = {}) {
    const geo = new THREE.PlaneGeometry(w, h, opts.segX || 1, opts.segY || 1);
    return addObject(parent, geo, material, [ x, y, z ], opts.rotation || [ 0, 0, 0 ], {
        cast: opts.cast === true,
        receive: opts.receive === true,
        name: opts.name
    });
}

function rectFrame(parent, cx, cy, z, w, h, thickness, depth, material, opts = {}) {
    const group = new THREE.Group;
    group.position.set(cx, cy, z);
    parent.add(group);
    box(group, w, thickness, depth, 0, h / 2 - thickness / 2, 0, material, {
        bevel: opts.bevel || .004,
        segments: 2
    });
    box(group, w, thickness, depth, 0, -h / 2 + thickness / 2, 0, material, {
        bevel: opts.bevel || .004,
        segments: 2
    });
    box(group, thickness, h - thickness * 2, depth, -w / 2 + thickness / 2, 0, 0, material, {
        bevel: opts.bevel || .004,
        segments: 2
    });
    box(group, thickness, h - thickness * 2, depth, w / 2 - thickness / 2, 0, 0, material, {
        bevel: opts.bevel || .004,
        segments: 2
    });
    return group;
}

function curvedPaperGeometry(w, h, segX = 28, segY = 40, bow = .012) {
    const geo = new THREE.PlaneGeometry(w, h, segX, segY);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i) / (w / 2);
        const y = pos.getY(i) / (h / 2);
        const centreBulge = (1 - x * x) * (1 - .22 * y) * bow;
        const slowWave = Math.sin(x * 3.1 + y * 1.7) * bow * .09;
        const cornerLift = Math.pow(Math.abs(x), 7) * bow * .16 + Math.pow(Math.max(0, y), 8) * bow * .05;
        pos.setZ(i, centreBulge + slowWave + cornerLift);
    }
    geo.computeVertexNormals();
    return geo;
}

function atlasPageGeometry(w, h, cols, rows, col, row, page = 0, segments = 2) {
    const geo = new THREE.PlaneGeometry(w, h, segments, segments);
    const uv = geo.attributes.uv;
    const span = page === 0 ? 1 : .5;
    const du = span / cols;
    const u0 = col / cols + (page === 1 ? .5 / cols : 0);
    const v0 = 1 - (row + 1) / rows;
    const dv = 1 / rows;
    for (let i = 0; i < uv.count; i++) {
        uv.setXY(i, u0 + uv.getX(i) * du, v0 + uv.getY(i) * dv);
    }
    uv.needsUpdate = true;
    return geo;
}

function makeCanvasTexture(canvas, {srgb: srgb = true, repeat: repeat = null, anisotropy: anisotropy = 8} = {}) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    tex.anisotropy = anisotropy;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    if (repeat) {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(repeat[0], repeat[1]);
    }
    tex.needsUpdate = true;
    return tex;
}

function makeContactShadowTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(128, 128, 4, 128, 128, 126);
    g.addColorStop(0, "rgba(0,0,0,0.58)");
    g.addColorStop(.32, "rgba(0,0,0,0.26)");
    g.addColorStop(.72, "rgba(0,0,0,0.06)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    return makeCanvasTexture(c, {
        srgb: false
    });
}

const clothMaterialCache = new Map;

function getClothMaterial(color) {
    const key = color >>> 0;
    if (!clothMaterialCache.has(key)) {
        clothMaterialCache.set(key, new THREE.MeshStandardMaterial({
            color: color,
            roughness: .72,
            metalness: .02,
            envMapIntensity: .2
        }));
    }
    return clothMaterialCache.get(key);
}

const CONTACT_SHADOW_TEX = {
    current: null
};

function contactShadow(parent, x, y, z, w, d, opacity = .7, rotation = 0) {
    if (!CONTACT_SHADOW_TEX.current) CONTACT_SHADOW_TEX.current = makeContactShadowTexture();
    const mat = new THREE.MeshBasicMaterial({
        map: CONTACT_SHADOW_TEX.current,
        transparent: true,
        opacity: opacity,
        depthWrite: false,
        toneMapped: false
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = rotation;
    mesh.position.set(x, y + .002, z);
    mesh.renderOrder = 2;
    parent.add(mesh);
    return mesh;
}

function addGlowSprite(parent, x, y, z, size, opacity, color = 16761976, map = null) {
    const material = new THREE.SpriteMaterial({
        map: map || MAT.glowMap,
        color: color,
        transparent: true,
        opacity: opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(x, y, z);
    sprite.scale.set(size, size, 1);
    parent.add(sprite);
    return sprite;
}

function createScene() {
    scene = new THREE.Scene;
    scene.background = new THREE.Color(461583);
    scene.fog = new THREE.FogExp2(528405, .0115);
    camera = new THREE.PerspectiveCamera(33, window.innerWidth / window.innerHeight, .1, 80);
    camera.position.copy(cameraHome);
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        powerPreference: "high-performance",
        stencil: false
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.bias = -15e-5;
    renderer.info.autoReset = true;
    controls = new OrbitControls(camera, canvas);
    controls.target.copy(targetHome);
    controls.enableDamping = true;
    controls.dampingFactor = .062;
    controls.rotateSpeed = .48;
    controls.zoomSpeed = .62;
    controls.panSpeed = .5;
    controls.enablePan = false;
    controls.minDistance = 2.6;
    controls.maxDistance = 12.4;
    controls.minAzimuthAngle = -.52;
    controls.maxAzimuthAngle = .52;
    controls.minPolarAngle = 1.17;
    controls.maxPolarAngle = 1.68;
    controls.autoRotate = false;
    controls.update();
    const gl = renderer.getContext();
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    runtime.webgl = {
        version: gl.getParameter(gl.VERSION),
        glslVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
        vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
        renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        webgl2: typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext
    };
    window.addEventListener("resize", onResize, {
        passive: true
    });
}

function onResize() {
    if (!renderer || !camera) return;
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.setSize(w, h, false);
}

function createEnvironment() {
    const envMap = makeCanvasTexture(T.envCanvas, {
        anisotropy: 8
    });
    envMap.mapping = THREE.EquirectangularReflectionMapping;
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const envRT = pmrem.fromEquirectangular(envMap);
    scene.environment = envRT.texture;
    scene.environmentIntensity = .47;
    envMap.dispose();
    pmrem.dispose();
    const skyGeo = new THREE.SphereGeometry(38, 32, 20);
    const skyMat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
            top: {
                value: new THREE.Color(528667)
            },
            horizon: {
                value: new THREE.Color(4012854)
            },
            bottom: {
                value: new THREE.Color(395531)
            },
            glow: {
                value: new THREE.Color(7296315)
            }
        },
        vertexShader: `\n      varying vec3 vWorld;\n      void main() {\n        vec4 wp = modelMatrix * vec4(position, 1.0);\n        vWorld = wp.xyz;\n        gl_Position = projectionMatrix * viewMatrix * wp;\n      }\n    `,
        fragmentShader: `\n      uniform vec3 top;\n      uniform vec3 horizon;\n      uniform vec3 bottom;\n      uniform vec3 glow;\n      varying vec3 vWorld;\n      void main() {\n        float h = normalize(vWorld).y;\n        vec3 col = mix(horizon, top, smoothstep(0.0, 0.62, h));\n        col = mix(bottom, col, smoothstep(-0.42, 0.02, h));\n        float windowGlow = pow(max(0.0, dot(normalize(vWorld), normalize(vec3(-0.55, 0.12, 0.82)))), 8.0);\n        col += glow * windowGlow * 0.18;\n        gl_FragColor = vec4(col, 1.0);\n      }\n    `
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);
}

function createMaterials() {
    const woodFrame = makeWoodMaterial({
        vertical: true,
        color: 15787996,
        roughness: .55,
        bump: .0075
    });
    const woodHorizontal = makeWoodMaterial({
        vertical: false,
        color: 15854303,
        roughness: .56,
        bump: .0085
    });
    const woodDeep = makeWoodMaterial({
        vertical: true,
        color: 11049870,
        roughness: .64,
        bump: .006
    });
    const woodTrim = makeWoodMaterial({
        vertical: false,
        color: 14800585,
        roughness: .5,
        bump: .005
    });
    const woodSill = makeWoodMaterial({
        vertical: false,
        color: 15064015,
        roughness: .46,
        bump: .006,
        repeat: [ 2, 1 ]
    });
    const woodInterior = makeWoodMaterial({
        vertical: true,
        color: 8877159,
        roughness: .64,
        bump: .007
    });
    const woodFloor = makeWoodMaterial({
        vertical: false,
        color: 8085576,
        roughness: .68,
        bump: .006,
        repeat: [ 3.4, 6 ]
    });
    const stone = makeStoneMaterial({
        repeat: [ .95, 1.9 ],
        color: 14539988
    });
    const stoneBase = makeStoneMaterial({
        repeat: [ 1.2, .45 ],
        color: 13882315
    });
    const stoneTrim = makeStoneMaterial({
        repeat: [ 1.4, .25 ],
        color: 14671574
    });
    const pavementMap = T.pavement.map.clone();
    const pavementBump = T.pavement.bump.clone();
    pavementMap.needsUpdate = true;
    pavementBump.needsUpdate = true;
    pavementMap.wrapS = pavementMap.wrapT = THREE.RepeatWrapping;
    pavementBump.wrapS = pavementBump.wrapT = THREE.RepeatWrapping;
    pavementMap.repeat.set(3.2, 3.2);
    pavementBump.repeat.set(3.2, 3.2);
    const pavement = new THREE.MeshPhysicalMaterial({
        map: pavementMap,
        bumpMap: pavementBump,
        bumpScale: .022,
        roughness: .8,
        metalness: .02,
        envMapIntensity: .35,
        color: 13814976,
        clearcoat: .28,
        clearcoatRoughness: .42
    });
    const navy = new THREE.MeshStandardMaterial({
        map: T.board.map,
        bumpMap: T.board.bump,
        bumpScale: .003,
        roughness: .91,
        metalness: .01,
        envMapIntensity: .18,
        color: 16777215,
        emissiveMap: T.board.map,
        emissive: 16777215,
        emissiveIntensity: .075
    });
    const navySide = woodDeep;
    const wallpaper = new THREE.MeshStandardMaterial({
        map: T.wallPaper,
        roughness: .94,
        metalness: 0,
        envMapIntensity: .08,
        color: 8884359
    });
    const brass = new THREE.MeshStandardMaterial({
        color: 11635285,
        metalness: .88,
        roughness: .3,
        envMapIntensity: 1.6
    });
    const brassDark = new THREE.MeshStandardMaterial({
        color: 7886383,
        metalness: .8,
        roughness: .42,
        envMapIntensity: 1.2
    });
    const iron = new THREE.MeshStandardMaterial({
        color: 1316632,
        metalness: .68,
        roughness: .38,
        envMapIntensity: 1
    });
    const paintedDark = new THREE.MeshStandardMaterial({
        color: 1516575,
        metalness: .18,
        roughness: .58,
        envMapIntensity: .7
    });
    const pageEdge = new THREE.MeshStandardMaterial({
        map: T.pagesTexture,
        roughness: .93,
        metalness: 0,
        color: 13483942,
        envMapIntensity: .08
    });
    const paperEdge = new THREE.MeshStandardMaterial({
        color: 13023647,
        roughness: .92,
        metalness: 0,
        envMapIntensity: .08
    });
    const shadeCloth = new THREE.MeshStandardMaterial({
        color: 5982774,
        roughness: .78,
        metalness: .05,
        side: THREE.DoubleSide,
        envMapIntensity: .2
    });
    const lampShade = new THREE.MeshPhysicalMaterial({
        color: 9133621,
        emissive: 16757344,
        emissiveIntensity: .65,
        roughness: .4,
        metalness: 0,
        transparent: true,
        opacity: .9,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    const leather = new THREE.MeshStandardMaterial({
        map: T.leather,
        roughness: .62,
        metalness: .02,
        color: 9203546,
        envMapIntensity: .3
    });
    const foliage = new THREE.MeshStandardMaterial({
        color: 4150849,
        roughness: .52,
        metalness: 0,
        side: THREE.DoubleSide,
        envMapIntensity: .35
    });
    const terracotta = new THREE.MeshStandardMaterial({
        color: 2631459,
        roughness: .5,
        metalness: .12,
        envMapIntensity: .7
    });
    const soil = new THREE.MeshStandardMaterial({
        color: 1775377,
        roughness: 1
    });
    const glow = makeCanvasTexture(T.glowCanvas, {
        srgb: true,
        anisotropy: 2
    });
    const dustSprite = makeCanvasTexture(T.dustCanvas, {
        srgb: true,
        anisotropy: 2
    });
    const mainGlass = new THREE.MeshPhysicalMaterial({
        color: 13688541,
        metalness: 0,
        roughness: .06,
        transparent: true,
        opacity: .07,
        depthWrite: false,
        clearcoat: 1,
        clearcoatRoughness: .055,
        envMapIntensity: 1.35,
        side: THREE.DoubleSide
    });
    const doorGlass = mainGlass.clone();
    doorGlass.opacity = .06;
    const reflectionMat = new THREE.MeshBasicMaterial({
        map: T.glassReflectionMap,
        transparent: true,
        opacity: .36,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: true,
        color: 14670023
    });
    const smudgeMat = new THREE.MeshBasicMaterial({
        map: T.glassSmudgeMap,
        transparent: true,
        opacity: .26,
        depthWrite: false,
        side: THREE.DoubleSide,
        color: 15130573,
        blending: THREE.NormalBlending,
        toneMapped: true
    });
    const doorReflectionMat = reflectionMat.clone();
    doorReflectionMat.opacity = .32;
    const doorSmudgeMat = smudgeMat.clone();
    doorSmudgeMat.opacity = .32;
    const mainTint = new THREE.MeshBasicMaterial({
        color: 727072,
        transparent: true,
        opacity: .05,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false
    });
    const doorTint = new THREE.MeshBasicMaterial({
        color: 529175,
        transparent: true,
        opacity: .1,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false
    });
    MAT = {
        woodFrame: woodFrame,
        woodHorizontal: woodHorizontal,
        woodDeep: woodDeep,
        woodTrim: woodTrim,
        woodSill: woodSill,
        woodInterior: woodInterior,
        woodFloor: woodFloor,
        stone: stone,
        stoneBase: stoneBase,
        stoneTrim: stoneTrim,
        pavement: pavement,
        navy: navy,
        navySide: navySide,
        wallpaper: wallpaper,
        brass: brass,
        brassDark: brassDark,
        iron: iron,
        paintedDark: paintedDark,
        pageEdge: pageEdge,
        paperEdge: paperEdge,
        shadeCloth: shadeCloth,
        lampShade: lampShade,
        leather: leather,
        foliage: foliage,
        terracotta: terracotta,
        soil: soil,
        glowMap: glow,
        dustSprite: dustSprite,
        mainGlass: mainGlass,
        doorGlass: doorGlass,
        reflectionMat: reflectionMat,
        smudgeMat: smudgeMat,
        doorReflectionMat: doorReflectionMat,
        doorSmudgeMat: doorSmudgeMat,
        mainTint: mainTint,
        doorTint: doorTint
    };
}

function addSkylineDetails() {
    const leftX = -4.045;
    const wall = box(scene, 1.76, 6.2, .52, leftX, 2.9, -.22, MAT.stone, {
        cast: false,
        receive: true,
        bevel: .006,
        segments: 2
    });
    wall.name = "limestone-pier";
    for (const y of [ 1.18, 3.32 ]) {
        box(scene, 1.775, .009, .53, leftX, y, -.218, MAT.stoneTrim, {
            cast: false,
            receive: true
        });
    }
    for (let i = 0; i < 10; i++) {
        const wq = i % 2 ? .27 : .4;
        box(scene, wq, .28, .6, -3.105 - (i % 2 ? .015 : 0), .48 + i * .48, -.17, i % 3 === 0 ? MAT.stoneTrim : MAT.stone, {
            bevel: .018,
            segments: 2,
            cast: true,
            receive: true
        });
    }
    box(scene, 1.94, .22, .68, leftX, .11, -.13, MAT.stoneBase, {
        bevel: .025,
        segments: 3
    });
    box(scene, 1.86, .09, .75, leftX, .28, -.1, MAT.stoneTrim, {
        bevel: .018,
        segments: 2
    });
    box(scene, 1.8, .045, .6, leftX, 5.9, -.2, MAT.stoneTrim, {
        cast: false,
        receive: true
    });
    box(scene, 1.2, 6.2, .55, 4.51, 2.9, -.22, MAT.stone, {
        cast: false,
        receive: true,
        bevel: .006,
        segments: 2
    });
    box(scene, 1.25, .22, .7, 4.51, .11, -.09, MAT.stoneBase, {
        bevel: .02,
        segments: 3
    });
    box(scene, 8.4, .12, .44, -.45, .06, .23, MAT.stoneBase, {
        bevel: .022,
        segments: 3,
        cast: true,
        receive: true
    });
    box(scene, 7.8, .035, .35, -.5, .14, .3, MAT.stoneTrim, {
        bevel: .012,
        segments: 2,
        cast: true,
        receive: true
    });
}

function addWoodShopfront() {
    const g = new THREE.Group;
    g.name = "walnut-shopfront";
    scene.add(g);
    const stileLeft = box(g, .23, 4.58, .28, -3.055, 2.72, .1, MAT.woodFrame, {
        bevel: .012,
        segments: 3
    });
    const stileCentre = box(g, .22, 4.58, .28, 1.35, 2.72, .1, MAT.woodFrame, {
        bevel: .012,
        segments: 3
    });
    const stileRight = box(g, .24, 4.58, .28, 3.87, 2.72, .1, MAT.woodFrame, {
        bevel: .012,
        segments: 3
    });
    stileLeft.name = "window-frame-left";
    for (const [x, yy, hh] of [ [ -3.055, 2.7, 3.3 ], [ 1.35, 2.7, 3.3 ], [ 3.87, 2.7, 3.3 ] ]) {
        for (const off of [ -.052, .052 ]) {
            box(g, .016, hh, .026, x + off, yy, .248, MAT.woodTrim, {
                bevel: .006,
                segments: 2,
                cast: false
            });
        }
        box(g, .07, .16, .34, x, 4.42, .13, MAT.woodTrim, {
            bevel: .012,
            segments: 2
        });
        box(g, .07, .16, .34, x, 1.05, .13, MAT.woodTrim, {
            bevel: .012,
            segments: 2
        });
    }
    box(g, 7.18, .35, .3, .41, 4.77, .1, MAT.woodHorizontal, {
        bevel: .016,
        segments: 3
    });
    box(g, 7.32, .1, .4, .41, 4.99, .13, MAT.woodTrim, {
        bevel: .024,
        segments: 3
    });
    box(g, 7.17, .055, .35, .41, 4.66, .2, MAT.woodTrim, {
        bevel: .016,
        segments: 2
    });
    for (let i = 0; i < 30; i++) {
        const x = -2.98 + i * .233;
        box(g, .07, .075, .06, x, 4.64, .307, MAT.woodTrim, {
            bevel: .01,
            segments: 2,
            cast: false
        });
    }
    cylinder(g, .095, .095, .025, .41, 4.79, .265, MAT.woodTrim, {
        rotation: [ Math.PI / 2, 0, 0 ],
        radialSegments: 8,
        cast: false
    });
    cylinder(g, .035, .035, .035, .41, 4.79, .285, MAT.brassDark, {
        rotation: [ Math.PI / 2, 0, 0 ],
        radialSegments: 6,
        cast: false
    });
    rectFrame(g, -.85, 2.75, .125, 4.21, 3.7, .085, .26, MAT.woodTrim, {
        bevel: .012
    });
    box(g, 4.48, .12, .34, -.85, .93, .12, MAT.woodSill, {
        bevel: .022,
        segments: 4
    });
    box(g, 4.38, .075, .27, -.85, .86, .19, MAT.woodTrim, {
        bevel: .015,
        segments: 3
    });
    box(g, 4.36, .05, .37, -.85, .805, .08, MAT.woodHorizontal, {
        bevel: .008,
        segments: 2
    });
    for (const x of [ -2.56, -.85, .86 ]) {
        box(g, .12, .16, .26, x, .7, .12, MAT.woodTrim, {
            bevel: .025,
            segments: 3
        });
    }
    const riserY = .52;
    box(g, 4.48, .78, .25, -.85, riserY, .06, MAT.woodDeep, {
        bevel: .008,
        segments: 2
    });
    box(g, 4.58, .095, .32, -.85, .15, .09, MAT.woodHorizontal, {
        bevel: .015,
        segments: 3
    });
    box(g, 4.5, .085, .3, -.85, .89, .08, MAT.woodHorizontal, {
        bevel: .012,
        segments: 3
    });
    const panelCentres = [ -2.15, -.85, .45 ];
    for (const cx of panelCentres) {
        box(g, 1.1, .52, .055, cx, .53, .188, MAT.woodFrame, {
            bevel: .012,
            segments: 3,
            cast: false
        });
        box(g, .93, .35, .032, cx, .53, .218, MAT.woodDeep, {
            bevel: .012,
            segments: 3,
            cast: false,
            receive: true
        });
        rectFrame(g, cx, .53, .24, 1.01, .43, .028, .025, MAT.woodTrim, {
            bevel: .006
        });
        box(g, .14, .035, .014, cx, .53, .246, MAT.woodTrim, {
            bevel: .008,
            segments: 2,
            cast: false
        });
    }
    for (const x of [ -2.72, -1.53, -.17, .98 ]) {
        box(g, .07, .6, .3, x, .53, .17, MAT.woodTrim, {
            bevel: .01,
            segments: 2
        });
    }
    const doorX = 2.62;
    box(g, 2.22, .105, .3, doorX, 4.59, .1, MAT.woodHorizontal, {
        bevel: .016,
        segments: 3
    });
    box(g, .17, 4.42, .3, 1.57, 2.41, .12, MAT.woodFrame, {
        bevel: .012,
        segments: 3
    });
    box(g, .17, 4.42, .3, 3.67, 2.41, .12, MAT.woodFrame, {
        bevel: .012,
        segments: 3
    });
    box(g, 2.1, 1.08, .17, doorX, .66, .17, MAT.woodDeep, {
        bevel: .01,
        segments: 3
    });
    for (const cx of [ 1.95, 3.28 ]) {
        rectFrame(g, cx, .66, .285, .92, .76, .045, .055, MAT.woodTrim, {
            bevel: .01
        });
        box(g, .76, .57, .075, cx, .65, .25, MAT.woodFrame, {
            bevel: .01,
            segments: 3,
            cast: false
        });
    }
    box(g, 2, .13, .04, doorX, .27, .278, MAT.brassDark, {
        bevel: .006,
        segments: 2,
        cast: false
    });
    rectFrame(g, doorX, 2.86, .235, 2.04, 3.3, .06, .08, MAT.woodTrim, {
        bevel: .008
    });
    box(g, .12, .42, .035, 3.48, 2.24, .32, MAT.brassDark, {
        bevel: .014,
        segments: 3,
        cast: false
    });
    const handle = new THREE.Mesh(new THREE.SphereGeometry(.052, 20, 14), MAT.brass);
    handle.position.set(3.48, 2.29, .37);
    handle.scale.set(.88, 1.22, .86);
    handle.castShadow = true;
    g.add(handle);
    cylinder(g, .018, .018, .045, 3.48, 2.29, .34, MAT.brass, {
        rotation: [ Math.PI / 2, 0, 0 ],
        radialSegments: 12
    });
    const keyhole = new THREE.Mesh(new THREE.CircleGeometry(.013, 12), MAT.iron);
    keyhole.position.set(3.48, 2.12, .345);
    g.add(keyhole);
    for (const y of [ 1.22, 3.58 ]) {
        box(g, .08, .25, .045, 1.66, y, .28, MAT.brassDark, {
            bevel: .01,
            segments: 2,
            cast: false
        });
    }
    box(g, .34, .055, .025, 2.3, 1.32, .282, MAT.brassDark, {
        bevel: .008,
        segments: 2,
        cast: false
    });
    box(g, .19, .075, .02, 2.3, 1.42, .283, MAT.brassDark, {
        bevel: .005,
        segments: 2,
        cast: false
    });
    const doorbell = new THREE.Group;
    doorbell.position.set(3.81, 2.35, .36);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.045, .011, 8, 28), MAT.brassDark);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, .06, 0);
    doorbell.add(ring);
    box(doorbell, .13, .08, .02, 0, 0, -.02, MAT.brassDark, {
        bevel: .008,
        segments: 2
    });
    g.add(doorbell);
    box(g, 7.1, .05, .35, .42, .178, .19, MAT.woodDeep, {
        bevel: .004,
        segments: 2,
        cast: false
    });
    return g;
}

function addWindowGlass() {
    const z = .205;
    const glass = plane(scene, 4.08, 3.54, -.85, 2.75, z, MAT.mainGlass, {
        cast: false,
        receive: false
    });
    glass.name = "dusty-main-glass";
    glass.renderOrder = 10;
    const refl = plane(scene, 4.08, 3.54, -.85, 2.75, z + .012, MAT.reflectionMat, {
        cast: false,
        receive: false
    });
    refl.renderOrder = 13;
    refl.name = "streetlamp-reflection";
    const smudge = plane(scene, 4.08, 3.54, -.85, 2.75, z + .018, MAT.smudgeMat, {
        cast: false,
        receive: false
    });
    smudge.renderOrder = 14;
    smudge.name = "window-dust";
    const tint = plane(scene, 4.08, 3.54, -.85, 2.75, z + .005, MAT.mainTint, {
        cast: false,
        receive: false
    });
    tint.renderOrder = 11;
    const door = plane(scene, 2.02, 3.26, 2.62, 2.87, z, MAT.doorGlass, {
        cast: false,
        receive: false
    });
    door.renderOrder = 10;
    const doorRefl = plane(scene, 2.02, 3.26, 2.62, 2.87, z + .012, MAT.doorReflectionMat, {
        cast: false,
        receive: false
    });
    doorRefl.renderOrder = 13;
    const doorSmudge = plane(scene, 2.02, 3.26, 2.62, 2.87, z + .018, MAT.doorSmudgeMat, {
        cast: false,
        receive: false
    });
    doorSmudge.renderOrder = 14;
    const doorTint = plane(scene, 2.02, 3.26, 2.62, 2.87, z + .006, MAT.doorTint, {
        cast: false,
        receive: false
    });
    doorTint.renderOrder = 11;
    const decalMat = new THREE.MeshBasicMaterial({
        map: T.doorDecalMap,
        transparent: true,
        opacity: .96,
        depthWrite: false,
        toneMapped: true,
        color: 15655107,
        side: THREE.DoubleSide
    });
    const decal = plane(scene, 1.56, 3.12, 2.62, 2.85, z + .035, decalMat, {
        cast: false,
        receive: false
    });
    decal.renderOrder = 15;
    decal.name = "agency-door-decal";
    return {
        glass: glass,
        refl: refl,
        smudge: smudge,
        door: door,
        decal: decal
    };
}

function addDisplayRoom() {
    box(scene, .06, 3.72, .78, -2.966, 2.76, -.26, MAT.woodInterior, {
        bevel: .003,
        segments: 2
    });
    box(scene, .06, 3.72, .78, 1.256, 2.76, -.26, MAT.woodInterior, {
        bevel: .003,
        segments: 2
    });
    box(scene, 4.2, .06, .78, -.855, 4.575, -.26, MAT.woodInterior, {
        bevel: .003,
        segments: 2
    });
    box(scene, 4.2, .08, .82, -.855, .905, -.25, MAT.woodInterior, {
        bevel: .003,
        segments: 2
    });
    plane(scene, 4.14, .38, -.855, 4.4, -.98, new THREE.MeshStandardMaterial({
        map: T.wallPaper,
        color: 7174e3,
        roughness: .95
    }), {
        cast: false,
        receive: true
    });
    const backMat = new THREE.MeshStandardMaterial({
        map: T.wallPaper,
        color: 4147523,
        roughness: .96,
        envMapIntensity: .06
    });
    plane(scene, 4.2, 3.8, -.855, 2.75, -1.28, backMat, {
        cast: false,
        receive: true
    });
    const board = box(scene, 4.16, 3.31, .055, -.855, 2.635, -.78, MAT.navy, {
        bevel: .004,
        segments: 2,
        cast: false,
        receive: true,
        name: "navy-display-board"
    });
    rectFrame(scene, -.855, 2.635, -.748, 4.26, 3.4, .045, .055, MAT.woodDeep, {
        bevel: .009
    });
    box(scene, 4.3, .045, .11, -.855, 4.31, -.72, MAT.woodTrim, {
        bevel: .007,
        segments: 2,
        cast: false
    });
    box(scene, 4.3, .055, .11, -.855, .974, -.72, MAT.woodTrim, {
        bevel: .007,
        segments: 2,
        cast: false
    });
    const stripMat = new THREE.MeshBasicMaterial({
        color: 16763268,
        transparent: true,
        opacity: .72,
        toneMapped: false
    });
    box(scene, 3.76, .012, .02, -.855, 4.348, -.5, stripMat, {
        cast: false,
        receive: false
    });
    cylinder(scene, .013, .013, 3.5, -.855, 4.39, -.49, MAT.brassDark, {
        rotation: [ 0, 0, Math.PI / 2 ],
        radialSegments: 12,
        cast: true
    });
    for (const x of [ -2.42, .72 ]) {
        cylinder(scene, .01, .014, .16, x, 4.31, -.5, MAT.brassDark, {
            radialSegments: 10
        });
        const glow = addGlowSprite(scene, x, 4.27, -.46, .3, .42, 16761719);
        glow.renderOrder = 20;
    }
    addGlowSprite(scene, -.85, 4.2, -.64, 2.2, .025, 16764817).renderOrder = 19;
    addGlowSprite(scene, -.95, 2.95, -.6, 2.8, .022, 16769449).renderOrder = 18;
}

function addPoster() {
    posterGroup = new THREE.Group;
    posterGroup.name = "moon-poster";
    posterGroup.position.set(-1.04, 2.66, -.61);
    posterGroup.rotation.z = -.004;
    scene.add(posterGroup);
    const haloMat = new THREE.MeshBasicMaterial({
        map: MAT.glowMap,
        color: 15783328,
        transparent: true,
        opacity: .045,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
    });
    const halo = plane(posterGroup, 2.56, 3.75, 0, .02, -.03, haloMat, {
        cast: false,
        receive: false
    });
    halo.renderOrder = 1;
    const paper = new THREE.Mesh(curvedPaperGeometry(2.01, 3.4, 30, 48, .013), makePrintMaterial(T.posterMap, {
        color: 16777215
    }));
    paper.position.z = .02;
    paper.castShadow = true;
    paper.receiveShadow = true;
    paper.name = "moon-poster-paper";
    posterGroup.add(paper);
    const back = new THREE.Mesh(curvedPaperGeometry(2.01, 3.4, 12, 10, .007), MAT.paperEdge);
    back.position.z = .004;
    back.castShadow = true;
    back.receiveShadow = true;
    posterGroup.add(back);
    for (const x of [ -.88, .88 ]) {
        box(posterGroup, .06, .075, .03, x, 1.682, .055, MAT.brassDark, {
            bevel: .008,
            segments: 2,
            cast: true
        });
        const screw = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .014, 12), MAT.brass);
        screw.rotation.x = Math.PI / 2;
        screw.position.set(x, 1.682, .076);
        posterGroup.add(screw);
        contactShadow(posterGroup, x, 1.716, .055, .08, .02, .32);
    }
    const cordMat = new THREE.LineBasicMaterial({
        color: 9269837,
        transparent: true,
        opacity: .35
    });
    for (const x of [ -.98, .98 ]) {
        const pts = [ new THREE.Vector3(x, 1.72, .03), new THREE.Vector3(x * .94, 1.78, .015), new THREE.Vector3(x * .87, 1.84, 0) ];
        const geo = (new THREE.BufferGeometry).setFromPoints(pts);
        posterGroup.add(new THREE.Line(geo, cordMat));
    }
}

function addSmallPosters() {
    const positions = [ {
        x: -2.5,
        y: 3.72,
        z: -.648,
        tilt: .003
    }, {
        x: -2.49,
        y: 2.59,
        z: -.644,
        tilt: -.004
    }, {
        x: -2.5,
        y: 1.46,
        z: -.65,
        tilt: .002
    } ];
    positions.forEach((p, i) => {
        const grp = new THREE.Group;
        grp.position.set(p.x, p.y, p.z);
        grp.rotation.z = p.tilt;
        scene.add(grp);
        smallPosterGroups.push(grp);
        box(grp, .67, .018, .016, 0, .555, .035, MAT.brassDark, {
            bevel: .003,
            segments: 2,
            cast: false
        });
        for (const xx of [ -.32, .32 ]) {
            box(grp, .014, .045, .018, xx, .575, .038, MAT.brassDark, {
                cast: false
            });
        }
        const paper = new THREE.Mesh(curvedPaperGeometry(.68, 1.075, 16, 24, .0065), makePrintMaterial(T.smallPosterMaps[i], {
            color: 16248799
        }));
        paper.position.z = .01;
        paper.castShadow = true;
        paper.receiveShadow = true;
        grp.add(paper);
        const back = new THREE.Mesh(curvedPaperGeometry(.68, 1.075, 8, 8, .003), MAT.paperEdge);
        grp.add(back);
        for (const xx of [ -.28, .28 ]) {
            const pin = new THREE.Mesh(new THREE.SphereGeometry(.008, 10, 8), MAT.brass);
            pin.position.set(xx, .536, .03);
            pin.castShadow = true;
            grp.add(pin);
        }
        contactShadow(scene, p.x, p.y - .548, p.z + .02, .78, .07, .16);
    });
}

function buildBook(parent, {w: w = .34, h: h = .05, d: d = .24, color: color = 6111539, titleH: titleH = .018, rot: rot = 0} = {}) {
    const group = new THREE.Group;
    parent.add(group);
    group.rotation.y = rot;
    const coverMat = getClothMaterial(color);
    box(group, w * .955, h * .72, d * .93, 0, 0, 0, MAT.pageEdge, {
        bevel: .003,
        segments: 2
    });
    box(group, w, h * .14, d, 0, h * .44, 0, coverMat, {
        bevel: .004,
        segments: 2
    });
    box(group, w, h * .12, d, 0, -h * .44, 0, coverMat, {
        bevel: .004,
        segments: 2
    });
    box(group, w * .055, h * .94, d * 1.01, -w * .48, 0, 0, coverMat, {
        bevel: .003,
        segments: 2
    });
    for (const yy of [ -h * .26, h * .26 ]) {
        box(group, w * .04, h * .025, d * .95, -w * .49, yy, 0, MAT.brassDark, {
            cast: false
        });
    }
    box(group, w * .36, h * .012, d * .52, w * .05, h * .51, 0, MAT.brassDark, {
        cast: false,
        receive: false
    });
    return group;
}

function addSillObjects() {
    const sill = new THREE.Group;
    sill.name = "windowsill-books";
    scene.add(sill);
    buildBook(sill, {
        w: .43,
        h: .095,
        d: .28,
        color: 7027504,
        rot: -.05
    }).position.set(-1.65, 1.018, -.24);
    buildBook(sill, {
        w: .39,
        h: .072,
        d: .26,
        color: 2506041,
        rot: .07
    }).position.set(-1.58, 1.1, -.23);
    buildBook(sill, {
        w: .37,
        h: .058,
        d: .24,
        color: 10126437,
        rot: -.02
    }).position.set(-1.53, 1.16, -.24);
    buildBook(sill, {
        w: .4,
        h: .052,
        d: .28,
        color: 4016971,
        rot: .13
    }).position.set(-1.02, .99, -.12);
    buildBook(sill, {
        w: .34,
        h: .06,
        d: .24,
        color: 7688514,
        rot: -.18
    }).position.set(-.97, 1.04, -.12);
    buildBook(sill, {
        w: .27,
        h: .045,
        d: .2,
        color: 11836279,
        rot: .08
    }).position.set(-.92, 1.09, -.124);
    buildBook(sill, {
        w: .33,
        h: .065,
        d: .23,
        color: 3879977,
        rot: .22
    }).position.set(-.28, 1.02, -.26);
    buildBook(sill, {
        w: .44,
        h: .075,
        d: .3,
        color: 5849656,
        rot: -.1
    }).position.set(-.42, 1.01, -.17);
    buildBook(sill, {
        w: .37,
        h: .057,
        d: .26,
        color: 7827546,
        rot: .07
    }).position.set(-.39, 1.07, -.165);
    buildBook(sill, {
        w: .3,
        h: .045,
        d: .22,
        color: 5059633,
        rot: -.02
    }).position.set(-.38, 1.12, -.17);
    box(sill, .29, .018, .18, -1.98, .965, -.12, MAT.brassDark, {
        bevel: .008,
        segments: 2,
        cast: false
    });
    for (let i = 0; i < 3; i++) {
        const w = .08 + i * .008;
        box(sill, w, .003, .045, -2.02 + i * .016, .98 + i * .003, -.115 + i * .004, new THREE.MeshStandardMaterial({
            color: i === 1 ? 15391936 : 13613461,
            roughness: .9
        }), {
            rotation: [ 0, .08 * (i - 1), 0 ],
            cast: false,
            receive: true
        });
    }
    contactShadow(sill, -1.2, .95, -.18, 1.9, .34, .38);
    contactShadow(sill, -.4, .955, -.16, .62, .37, .42);
    const leaf = new THREE.Mesh(leafGeometry(.12, .055), new THREE.MeshStandardMaterial({
        color: 6706230,
        roughness: .88,
        side: THREE.DoubleSide
    }));
    leaf.position.set(-.64, .958, -.03);
    leaf.rotation.set(-Math.PI / 2, 0, .6);
    leaf.castShadow = true;
    sill.add(leaf);
}

function createCard(cardIndex, x, y, coverIndex, row) {
    const root = new THREE.Group;
    root.name = `brochure-${cardIndex}`;
    const home = new THREE.Vector3(x, y, .095 + row % 1 * .002);
    root.position.copy(home);
    root.rotation.set(0, 0, (cardIndex * 13 % 7 - 3) * .0018);
    rackGroup.add(root);
    root.userData.dynamic = true;
    root.userData.home = home;
    root.userData.open = 0;
    root.userData.lift = 0;
    root.userData.selected = false;
    root.userData.hover = 0;
    root.userData.settle = 0;
    root.userData.settleSeed = cardIndex * 1.77 + .42;
    const w = CARD_VIS.w, h = CARD_VIS.h;
    const coverCol = coverIndex % CARD_VIS.atlasCols;
    const coverRow = Math.floor(coverIndex / CARD_VIS.atlasCols);
    const dest = DESTINATIONS[coverIndex];
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(w + .018, h + .018), new THREE.MeshBasicMaterial({
        color: 198666,
        transparent: true,
        opacity: .42,
        depthWrite: false
    }));
    shadow.position.set(0, 0, -.009);
    shadow.renderOrder = 1;
    root.add(shadow);
    const fixedRight = new THREE.Mesh(atlasPageGeometry(w, h, CARD_VIS.atlasCols, CARD_VIS.atlasRows, coverCol, coverRow, 1, 3), makePrintMaterial(T.spreadMap, {
        color: 16777215
    }));
    fixedRight.position.z = .001;
    fixedRight.castShadow = true;
    fixedRight.receiveShadow = true;
    root.add(fixedRight);
    const hinge = new THREE.Group;
    hinge.position.set(-w / 2, 0, 0);
    root.add(hinge);
    const backing = box(hinge, w, h, CARD_VIS.coverThickness, w / 2, 0, 0, MAT.paperEdge, {
        bevel: .0022,
        segments: 2,
        cast: true,
        receive: true
    });
    const cover = new THREE.Mesh(atlasPageGeometry(w, h, CARD_VIS.atlasCols, CARD_VIS.atlasRows, coverCol, coverRow, 0, 2), makePrintMaterial(T.coverMap, {
        color: 16777215
    }));
    cover.position.set(w / 2, 0, CARD_VIS.coverThickness / 2 + .0012);
    cover.castShadow = true;
    cover.receiveShadow = true;
    hinge.add(cover);
    const insideCover = new THREE.Mesh(atlasPageGeometry(w, h, CARD_VIS.atlasCols, CARD_VIS.atlasRows, coverCol, coverRow, 2, 2), makePrintMaterial(T.spreadMap, {
        color: 16777215,
        side: THREE.FrontSide
    }));
    insideCover.rotation.y = Math.PI;
    insideCover.position.set(w / 2, 0, -CARD_VIS.coverThickness / 2 - .0012);
    insideCover.castShadow = true;
    insideCover.receiveShadow = true;
    hinge.add(insideCover);
    const edgeGlow = new THREE.Mesh(new THREE.PlaneGeometry(w * .92, .006), new THREE.MeshBasicMaterial({
        color: 15259572,
        transparent: true,
        opacity: .22,
        depthWrite: false
    }));
    edgeGlow.position.set(w / 2, -h / 2 + .006, CARD_VIS.coverThickness / 2 + .003);
    hinge.add(edgeGlow);
    const picker = new THREE.Mesh(new THREE.PlaneGeometry(w + .025, h + .025), new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        colorWrite: false
    }));
    picker.position.z = .018;
    picker.userData.cardIndex = cardIndex;
    root.add(picker);
    pickMeshes.push(picker, fixedRight, cover, insideCover);
    const scrim = new THREE.Mesh(new THREE.PlaneGeometry(w * 2.3, h * 1.55), new THREE.MeshBasicMaterial({
        map: MAT.glowMap,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        color: 132612,
        blending: THREE.NormalBlending,
        toneMapped: false
    }));
    scrim.position.set(-w * .5, 0, -.026);
    scrim.renderOrder = 2;
    scrim.visible = false;
    root.add(scrim);
    const sheen = new THREE.Mesh(new THREE.PlaneGeometry(w * 2.05, h * 1.2), new THREE.MeshBasicMaterial({
        map: MAT.glowMap,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        color: 16767392,
        blending: THREE.AdditiveBlending,
        toneMapped: true
    }));
    sheen.position.set(-w * .5, 0, .058);
    sheen.renderOrder = 12;
    sheen.visible = false;
    root.add(sheen);
    const card = {
        index: cardIndex,
        coverIndex: coverIndex,
        row: row,
        root: root,
        hinge: hinge,
        cover: cover,
        insideCover: insideCover,
        fixedRight: fixedRight,
        backing: backing,
        picker: picker,
        scrim: scrim,
        sheen: sheen,
        home: home,
        dest: dest,
        coverMat: cover.material,
        insideMat: insideCover.material,
        fixedMat: fixedRight.material,
        baseRotationZ: root.rotation.z,
        liftTarget: 0
    };
    cover.userData.card = card;
    fixedRight.userData.card = card;
    insideCover.userData.card = card;
    cards.push(card);
    return card;
}

function addBrochureRack() {
    rackGroup = new THREE.Group;
    rackGroup.name = "destination-rack";
    rackGroup.position.set(.72, 1.055, -.28);
    rackGroup.rotation.x = -.095;
    scene.add(rackGroup);
    box(rackGroup, .935, 2.28, .035, 0, 1.17, -.042, MAT.woodInterior, {
        bevel: .006,
        segments: 2,
        receive: true
    });
    for (let i = 0; i < 3; i++) {
        box(rackGroup, .012, 2.05, .01, -.27 + i * .27, 1.13, -.02, MAT.woodDeep, {
            cast: false
        });
    }
    for (const side of [ -1, 1 ]) {
        box(rackGroup, .045, 2.2, .11, side * .462, 1.16, .025, MAT.woodFrame, {
            bevel: .009,
            segments: 3,
            rotation: [ 0, 0, side * .012 ]
        });
        box(rackGroup, .06, .06, .3, side * .462, .065, .075, MAT.woodFrame, {
            bevel: .012,
            segments: 2
        });
        box(rackGroup, .07, .045, .09, side * .462, .21, .1, MAT.brassDark, {
            bevel: .006,
            segments: 2
        });
        const finial = new THREE.Mesh(new THREE.SphereGeometry(.034, 14, 10), MAT.woodTrim);
        finial.position.set(side * .462, 2.295, .025);
        finial.scale.set(.8, 1.5, .8);
        finial.castShadow = true;
        rackGroup.add(finial);
    }
    box(rackGroup, .94, .055, .31, 0, .06, .055, MAT.woodHorizontal, {
        bevel: .014,
        segments: 3
    });
    box(rackGroup, .48, .028, .012, 0, .22, .18, MAT.brassDark, {
        bevel: .004,
        segments: 2,
        cast: false
    });
    box(rackGroup, .96, .31, .06, 0, 2.17, .01, MAT.woodFrame, {
        bevel: .011,
        segments: 3
    });
    const headerMat = new THREE.MeshStandardMaterial({
        map: T.rackSignMap,
        roughness: .7,
        metalness: .02,
        envMapIntensity: .4,
        emissive: 1780274,
        emissiveIntensity: .45
    });
    const header = plane(rackGroup, .9, .245, 0, 2.17, .044, headerMat, {
        cast: false,
        receive: true
    });
    for (const side of [ -1, 1 ]) {
        box(rackGroup, .028, .33, .07, side * .49, 2.17, .005, MAT.woodTrim, {
            bevel: .007,
            segments: 2
        });
    }
    const rowY = [ .34, .69, 1.04, 1.39, 1.74 ];
    const cardColumns = [ -.3, 0, .3 ];
    let cardIndex = 0;
    for (let r = 0; r < CARD_VIS.rows; r++) {
        box(rackGroup, .9, .034, .17, 0, rowY[r] - .122, .11, MAT.woodHorizontal, {
            bevel: .006,
            segments: 2
        });
        box(rackGroup, .92, .012, .026, 0, rowY[r] + .088, .18, MAT.woodDeep, {
            bevel: .003,
            segments: 2,
            cast: false
        });
        for (const side of [ -1, 1 ]) {
            box(rackGroup, .016, .024, .02, side * .42, rowY[r] - .01, .192, MAT.brassDark, {
                cast: false
            });
        }
        cylinder(rackGroup, .004, .004, .84, 0, rowY[r] - .01, .197, MAT.brassDark, {
            rotation: [ 0, 0, Math.PI / 2 ],
            radialSegments: 6,
            cast: false
        });
        for (let c = 0; c < CARD_VIS.cols; c++) {
            const coverIndex = cardIndex % DESTINATIONS.length;
            createCard(cardIndex, cardColumns[c], rowY[r] + .025, coverIndex, r);
            cardIndex++;
        }
    }
    const lampGroup = new THREE.Group;
    lampGroup.position.set(-.17, 2.36, .04);
    rackGroup.add(lampGroup);
    cylinder(lampGroup, .012, .016, .23, 0, 0, 0, MAT.brassDark, {
        rotation: [ 0, 0, Math.PI / 2 ],
        radialSegments: 10
    });
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(.035, .085, .09, 18, 1, true), MAT.brassDark);
    shade.rotation.x = Math.PI;
    shade.position.set(.1, -.075, 0);
    lampGroup.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.027, 14, 10), new THREE.MeshBasicMaterial({
        color: 16766362,
        toneMapped: false
    }));
    bulb.position.set(.1, -.11, 0);
    lampGroup.add(bulb);
    const lampGlow = addGlowSprite(lampGroup, .1, -.11, .01, .52, .55, 16760174);
    lampGlow.renderOrder = 22;
    addGlowSprite(lampGroup, .1, -.12, .03, 1.4, .07, 16762749).renderOrder = 17;
    browseLight = new THREE.PointLight(16765339, 0, 1.9, 2);
    browseLight.position.set(.72, 2, .65);
    scene.add(browseLight);
    browseHalo = addGlowSprite(scene, .72, 2, .15, .9, 0, 16765853);
    browseHalo.renderOrder = 21;
    contactShadow(scene, .72, 1.055, -.12, 1.2, .45, .58);
    return rackGroup;
}

function addGlobe() {
    const root = new THREE.Group;
    root.name = "globe-on-stand";
    root.userData.dynamic = true;
    root.position.set(-.38, 1.145, -.12);
    scene.add(root);
    const wood = makeWoodMaterial({
        vertical: true,
        color: 13809819,
        roughness: .42,
        bump: .006
    });
    const points = [ new THREE.Vector2(.001, 0), new THREE.Vector2(.09, 0), new THREE.Vector2(.095, .016), new THREE.Vector2(.058, .032), new THREE.Vector2(.07, .08), new THREE.Vector2(.05, .1), new THREE.Vector2(.034, .13), new THREE.Vector2(.058, .16), new THREE.Vector2(.05, .185), new THREE.Vector2(.026, .2), new THREE.Vector2(.001, .205) ];
    const baseGeo = new THREE.LatheGeometry(points, 36);
    const base = new THREE.Mesh(baseGeo, wood);
    base.castShadow = true;
    base.receiveShadow = true;
    root.add(base);
    const footRing = new THREE.Mesh(new THREE.TorusGeometry(.092, .008, 8, 32), MAT.brassDark);
    footRing.rotation.x = Math.PI / 2;
    footRing.position.y = .012;
    footRing.castShadow = true;
    root.add(footRing);
    cylinder(root, .015, .015, .14, 0, .265, 0, MAT.brass, {
        radialSegments: 14
    });
    const stemBall = new THREE.Mesh(new THREE.SphereGeometry(.032, 18, 12), MAT.brass);
    stemBall.position.y = .338;
    stemBall.castShadow = true;
    root.add(stemBall);
    const tilt = new THREE.Group;
    tilt.position.set(0, .58, 0);
    tilt.rotation.z = -.36;
    root.add(tilt);
    const spin = new THREE.Group;
    spin.name = "rotating-earth";
    spin.rotation.y = -1.84;
    tilt.add(spin);
    const globeRadius = .25;
    const sphereMat = new THREE.MeshStandardMaterial({
        map: T.globeMap,
        bumpMap: T.globeBumpMap,
        bumpScale: .006,
        roughness: .5,
        metalness: .04,
        envMapIntensity: .65,
        color: 16775400,
        emissiveMap: T.globeMap,
        emissive: 14203274,
        emissiveIntensity: .26
    });
    const earth = new THREE.Mesh(new THREE.SphereGeometry(globeRadius, 64, 48), sphereMat);
    earth.castShadow = true;
    earth.receiveShadow = true;
    spin.add(earth);
    const glassMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.FrontSide,
        uniforms: {
            uWarm: {
                value: new THREE.Color(16766874)
            },
            uCool: {
                value: new THREE.Color(10205364)
            }
        },
        vertexShader: `\n      varying vec3 vN;\n      varying vec3 vW;\n      void main() {\n        vec4 wp = modelMatrix * vec4(position, 1.0);\n        vW = wp.xyz;\n        vN = normalize(mat3(modelMatrix) * normal);\n        gl_Position = projectionMatrix * viewMatrix * wp;\n      }\n    `,
        fragmentShader: `\n      uniform vec3 uWarm;\n      uniform vec3 uCool;\n      varying vec3 vN;\n      varying vec3 vW;\n      void main() {\n        vec3 N = normalize(vN);\n        vec3 V = normalize(cameraPosition - vW);\n        float fres = pow(1.0 - max(dot(N, V), 0.0), 2.5);\n        vec3 L1 = normalize(vec3(-0.64, 0.48, 0.62));\n        vec3 L2 = normalize(vec3(0.42, 0.68, 0.28));\n        vec3 H1 = normalize(L1 + V);\n        vec3 H2 = normalize(L2 + V);\n        float s1 = pow(max(dot(N, H1), 0.0), 70.0);\n        float s2 = pow(max(dot(N, H2), 0.0), 26.0);\n        float hand = smoothstep(-0.28, 0.35, N.x) * smoothstep(0.1, 0.8, N.y);\n        vec3 col = mix(uCool, uWarm, hand * 0.65);\n        float alpha = fres * 0.36 + s1 * 0.34 + s2 * 0.075;\n        gl_FragColor = vec4(col * (0.65 + fres * 0.7) + vec3(1.0, 0.95, 0.82) * s1 * 0.45, alpha);\n      }\n    `
    });
    const shell = new THREE.Mesh(new THREE.SphereGeometry(globeRadius * 1.035, 48, 32), glassMat);
    shell.renderOrder = 6;
    tilt.add(shell);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(globeRadius * 1.09, .0065, 10, 90), MAT.brass);
    ring.castShadow = true;
    tilt.add(ring);
    const ringNorth = new THREE.Mesh(new THREE.ConeGeometry(.018, .055, 8), MAT.brassDark);
    ringNorth.position.set(0, globeRadius * 1.09, 0);
    ringNorth.castShadow = true;
    tilt.add(ringNorth);
    const armCurve = new THREE.CatmullRomCurve3([ new THREE.Vector3(0, .34, 0), new THREE.Vector3(.15, .38, .01), new THREE.Vector3(.24, .49, .01), new THREE.Vector3(.245, .58, 0) ]);
    const arm = new THREE.Mesh(new THREE.TubeGeometry(armCurve, 24, .01, 8, false), MAT.brass);
    arm.castShadow = true;
    root.add(arm);
    const labelMat = new THREE.MeshStandardMaterial({
        map: T.globeLabelMap,
        roughness: .55,
        metalness: .18,
        emissive: 4011300,
        emissiveIntensity: .16
    });
    const label = new THREE.Mesh(new THREE.PlaneGeometry(.13, .034), labelMat);
    label.position.set(0, .21, .077);
    label.rotation.x = -.08;
    root.add(label);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(globeRadius * 1.24, 20, 14), new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        colorWrite: false
    }));
    hit.position.copy(tilt.position);
    root.add(hit);
    const globeGlow = addGlowSprite(root, .04, .72, .17, .9, .075, 16767658);
    globeGlow.renderOrder = 20;
    contactShadow(scene, -.38, 1.145, -.1, .54, .3, .48);
    globe = {
        root: root,
        tilt: tilt,
        spin: spin,
        shell: shell,
        hit: hit,
        ring: ring,
        earth: earth,
        velocity: 0,
        dragging: false,
        lastX: 0,
        lastXRaw: 0,
        idle: 0,
        turns: 0,
        radius: globeRadius,
        startAngle: -1.84,
        home: root.position.clone()
    };
    return globe;
}

function addInteriorRoom() {
    const room = new THREE.Group;
    room.name = "deep-interior";
    scene.add(room);
    box(room, 2.7, .08, 4.4, 2.62, .06, -2.25, MAT.woodFloor, {
        receive: true,
        cast: false
    });
    plane(room, 2.9, 4.5, 2.62, 2.3, -4.25, new THREE.MeshStandardMaterial({
        map: T.wallPaper,
        color: 8225657,
        roughness: .95,
        envMapIntensity: .06
    }), {
        receive: true,
        cast: false
    });
    box(room, .08, 4.3, 4.3, 1.31, 2.2, -2.1, MAT.woodInterior, {
        receive: true
    });
    box(room, .08, 4.3, 4.3, 3.94, 2.2, -2.1, MAT.woodInterior, {
        receive: true
    });
    box(room, 2.8, .08, 4.3, 2.62, 4.43, -2.1, MAT.woodDeep, {
        receive: true,
        cast: false
    });
    box(room, 2.6, .18, .07, 2.62, .22, -4.16, MAT.woodDeep, {
        receive: true
    });
    box(room, 2.6, .025, .02, 2.62, .36, -4.13, MAT.brassDark, {
        cast: false
    });
    const caseX = 2.58, caseZ = -4.05;
    box(room, 2.28, 3.5, .16, caseX, 2.03, caseZ, MAT.woodInterior, {
        receive: true
    });
    const caseShelfYs = [ .57, 1.18, 1.79, 2.4, 3.01, 3.58 ];
    for (const y of caseShelfYs) {
        box(room, 2.22, .06, .28, caseX, y, caseZ + .11, MAT.woodDeep, {
            receive: true,
            cast: false
        });
    }
    for (const x of [ 1.48, 2.03, 2.58, 3.13, 3.68 ]) {
        box(room, .05, 3.35, .26, x, 2.04, caseZ + .1, MAT.woodDeep, {
            receive: true,
            cast: false
        });
    }
    const bookPalette = [ 4083017, 6834492, 8023122, 3030086, 6373439, 9273702, 4080178 ];
    let seed = 0;
    for (let shelf = 0; shelf < 5; shelf++) {
        let x = 1.55;
        const y = caseShelfYs[shelf] + .065;
        while (x < 3.6) {
            const w = .045 + seed * 7 % 11 * .005;
            const h = .22 + seed * 3 % 9 * .017;
            const color = bookPalette[seed % bookPalette.length];
            if (seed % 9 === 7) {
                box(room, .16, .1, .16, x + .06, y + .05, caseZ + .11, MAT.leather, {
                    bevel: .007,
                    segments: 2
                });
                x += .23;
            } else {
                box(room, w, h, .16, x, y + h / 2, caseZ + .11, getClothMaterial(color), {
                    cast: false,
                    receive: true
                });
                x += w + .012;
            }
            seed++;
        }
    }
    const frameMat = MAT.woodTrim;
    const useMaps = [ T.smallPosterMaps[0], T.smallPosterMaps[2], T.smallPosterMaps[1] ];
    const frameSpots = [ {
        x: 1.83,
        y: 2.87
    }, {
        x: 3.42,
        y: 2.21
    }, {
        x: 1.76,
        y: 1.6
    } ];
    frameSpots.forEach((p, i) => {
        box(room, .36, .48, .035, p.x, p.y, caseZ + .28, frameMat, {
            bevel: .008,
            segments: 2,
            cast: false
        });
        const pic = plane(room, .31, .43, p.x, p.y, caseZ + .301, makePaperMaterial(useMaps[i], {
            emissive: .035,
            roughness: .9
        }), {
            cast: false,
            receive: false
        });
        pic.rotation.y = 0;
    });
    for (const [x, z, y, scale] of [ [ 2.95, -1.28, 3.64, 1 ], [ 2.13, -2.7, 3.4, .8 ] ]) {
        cylinder(room, .004, .004, .85, x, y + .4, z, MAT.iron, {
            radialSegments: 6,
            cast: false
        });
        const shadeMat = MAT.lampShade.clone();
        shadeMat.emissiveIntensity = .4;
        const shade = new THREE.Mesh(new THREE.CylinderGeometry(.055 * scale, .14 * scale, .17 * scale, 24, 1, true), shadeMat);
        shade.position.set(x, y, z);
        shade.rotation.x = 0;
        room.add(shade);
        const inner = new THREE.Mesh(new THREE.CylinderGeometry(.052 * scale, .135 * scale, .16 * scale, 24, 1, true), new THREE.MeshBasicMaterial({
            color: 16763005,
            side: THREE.BackSide,
            transparent: true,
            opacity: .34,
            toneMapped: false
        }));
        inner.position.set(x, y, z);
        room.add(inner);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(.034 * scale, 12, 8), new THREE.MeshBasicMaterial({
            color: 16768937,
            toneMapped: false
        }));
        bulb.position.set(x, y - .06, z);
        room.add(bulb);
        const glow = addGlowSprite(room, x, y - .05, z + .03, .85 * scale, .3, 16760177);
        glow.renderOrder = 18;
        animatedLampMaterials.push(shadeMat);
        if (z > -2) {
            const light = new THREE.PointLight(16757610, 14 * scale, 4.8, 2);
            light.position.set(x, y - .08, z + .12);
            room.add(light);
        }
    }
    const deskMat = MAT.woodDeep;
    box(room, 1.55, .06, .6, 2.58, 1.02, -2.12, deskMat, {
        bevel: .02,
        segments: 3
    });
    for (const x of [ 1.9, 3.25 ]) {
        for (const z of [ -2.36, -1.87 ]) {
            box(room, .055, .85, .055, x, .56, z, deskMat, {
                bevel: .008,
                segments: 2
            });
        }
    }
    buildBook(room, {
        w: .36,
        h: .07,
        d: .24,
        color: 6376249,
        rot: .12
    }).position.set(2.3, 1.07, -2.2);
    buildBook(room, {
        w: .3,
        h: .055,
        d: .22,
        color: 2965051,
        rot: -.06
    }).position.set(2.5, 1.14, -2.17);
    cylinder(room, .08, .1, .03, 3.1, 1.065, -2.19, MAT.brassDark, {
        radialSegments: 20,
        cast: false
    });
    cylinder(room, .012, .012, .21, 3.1, 1.18, -2.19, MAT.brass, {
        radialSegments: 8,
        cast: false
    });
    const bankerShade = new THREE.Mesh(new THREE.CylinderGeometry(.12, .14, .07, 20, 1, true), new THREE.MeshStandardMaterial({
        color: 2507579,
        roughness: .4,
        metalness: .4,
        emissive: 3889734,
        emissiveIntensity: .18,
        side: THREE.DoubleSide
    }));
    bankerShade.position.set(3.1, 1.29, -2.19);
    room.add(bankerShade);
    addGlowSprite(room, 3.1, 1.26, -2.15, .38, .37, 16761210).renderOrder = 18;
    const dg = new THREE.Mesh(new THREE.SphereGeometry(.07, 22, 16), new THREE.MeshStandardMaterial({
        map: T.globeMap,
        roughness: .6,
        metalness: .05
    }));
    dg.position.set(2.05, 1.22, -2.18);
    room.add(dg);
    cylinder(room, .008, .008, .11, 2.05, 1.115, -2.18, MAT.brass, {
        radialSegments: 6
    });
    box(room, .7, .5, .4, 2.58, .38, -1.96, MAT.woodFrame, {
        bevel: .012,
        segments: 2
    });
    for (let i = 0; i < 4; i++) {
        box(room, .54, .035, .03, 2.58, .22 + i * .1, -1.75, MAT.brassDark, {
            bevel: .005,
            segments: 2,
            cast: false
        });
    }
    box(room, .46, .6, .035, 2.58, 4.02, -4.16, MAT.woodDeep, {
        cast: false
    });
    const print = plane(room, .4, .53, 2.58, 4.02, -4.138, makePaperMaterial(T.smallPosterMaps[2], {
        emissive: .025
    }), {
        cast: false
    });
    print.rotation.y = 0;
    const closedMat = new THREE.MeshStandardMaterial({
        map: T.closedSignMap,
        roughness: .88,
        side: THREE.DoubleSide,
        transparent: false,
        envMapIntensity: .1
    });
    const closed = new THREE.Mesh(new THREE.PlaneGeometry(.27, .25), closedMat);
    closed.position.set(3.33, 2.24, -.105);
    closed.rotation.set(-.04, -.06, .09);
    closed.castShadow = true;
    room.add(closed);
    const cordMat = new THREE.LineBasicMaterial({
        color: 5455658,
        transparent: true,
        opacity: .7
    });
    const cordGeo = (new THREE.BufferGeometry).setFromPoints([ new THREE.Vector3(3.2, 2.38, -.105), new THREE.Vector3(3.3, 2.74, -.095), new THREE.Vector3(3.45, 2.39, -.105) ]);
    room.add(new THREE.Line(cordGeo, cordMat));
    addInteriorDust(room);
}

function addInteriorDust(parent) {
    const count = 70;
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        positions[i * 3] = 1.55 + Math.random() * 2.2;
        positions[i * 3 + 1] = .3 + Math.random() * 3.8;
        positions[i * 3 + 2] = -.7 - Math.random() * 3;
        speeds[i * 3] = (Math.random() - .5) * .008;
        speeds[i * 3 + 1] = .004 + Math.random() * .01;
        speeds[i * 3 + 2] = (Math.random() - .5) * .006;
    }
    const geo = new THREE.BufferGeometry;
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
        color: 15256736,
        size: .007,
        map: MAT.dustSprite,
        transparent: true,
        opacity: .46,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
        alphaTest: .02,
        toneMapped: false
    });
    const points = new THREE.Points(geo, mat);
    points.renderOrder = 12;
    parent.add(points);
    return {
        points: points,
        positions: positions,
        speeds: speeds,
        count: count
    };
}

function leafGeometry(w, h, bend = .018) {
    const shape = new THREE.Shape;
    shape.moveTo(0, -h * .55);
    shape.bezierCurveTo(w * .65, -h * .28, w * .58, h * .38, 0, h * .55);
    shape.bezierCurveTo(-w * .58, h * .38, -w * .65, -h * .28, 0, -h * .55);
    const geo = new THREE.ShapeGeometry(shape, 14);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const nx = x / (w * .6);
        const ny = y / (h * .55);
        pos.setZ(i, bend * (1 - nx * nx) + Math.abs(ny) * .004);
    }
    geo.computeVertexNormals();
    return geo;
}

function buildPlantPot(parent, x, y, z, scale = 1) {
    const pot = new THREE.Group;
    pot.position.set(x, y, z);
    pot.scale.setScalar(scale);
    parent.add(pot);
    const profile = [ new THREE.Vector2(.002, 0), new THREE.Vector2(.22, 0), new THREE.Vector2(.255, .025), new THREE.Vector2(.245, .45), new THREE.Vector2(.28, .49), new THREE.Vector2(.288, .54), new THREE.Vector2(.265, .56), new THREE.Vector2(.238, .52), new THREE.Vector2(.225, .48), new THREE.Vector2(0, .47) ];
    const potGeo = new THREE.LatheGeometry(profile, 36);
    const potMesh = new THREE.Mesh(potGeo, MAT.terracotta);
    potMesh.castShadow = true;
    potMesh.receiveShadow = true;
    pot.add(potMesh);
    const soil = new THREE.Mesh(new THREE.CircleGeometry(.225, 32), MAT.soil);
    soil.rotation.x = -Math.PI / 2;
    soil.position.y = .482;
    soil.receiveShadow = true;
    pot.add(soil);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.266, .018, 8, 36), MAT.terracotta);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = .53;
    pot.add(rim);
    contactShadow(pot, 0, .004, 0, .85, .7, .58);
    return pot;
}

function addOutsidePlant() {
    const group = new THREE.Group;
    group.name = "potted-ficus";
    scene.add(group);
    const potX = -3.73, potZ = 1.4;
    buildPlantPot(group, potX, .05, potZ, 1.08);
    const trunkMat = new THREE.MeshStandardMaterial({
        color: 4207401,
        roughness: .95
    });
    const rand = mulberryLocal(7);
    const start = new THREE.Vector3(potX, .48, potZ);
    const trunkTop = new THREE.Vector3(potX + .03, 1.22, potZ - .03);
    const trunkCurve = new THREE.CatmullRomCurve3([ start, new THREE.Vector3(potX + .08, .72, potZ + .015), new THREE.Vector3(potX + .02, .98, potZ - .01), trunkTop ]);
    const trunk = new THREE.Mesh(new THREE.TubeGeometry(trunkCurve, 18, .034, 8, false), trunkMat);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);
    const leafPositions = [];
    const branches = [];
    const branchTips = [];
    for (let i = 0; i < 11; i++) {
        const angle = i / 11 * TAU + (rand() - .5) * .55;
        const reach = .23 + rand() * .42;
        const yBase = .86 + rand() * .4;
        const origin = new THREE.Vector3(potX + Math.cos(angle) * .04, yBase, potZ + Math.sin(angle) * .035);
        const tip = new THREE.Vector3(potX + Math.cos(angle) * reach, yBase + .24 + rand() * .5, potZ + Math.sin(angle) * reach * .6 + .1);
        const curve = new THREE.CatmullRomCurve3([ origin, new THREE.Vector3((origin.x + tip.x) * .5 + (rand() - .5) * .09, origin.y + (tip.y - origin.y) * .55, (origin.z + tip.z) * .5), tip ]);
        const br = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, .009, 5, false), trunkMat);
        br.castShadow = true;
        group.add(br);
        branches.push(br);
        branchTips.push(tip);
        for (let j = 0; j < 20; j++) {
            const t = .55 + rand() * .5;
            const target = tip.clone().add(new THREE.Vector3((rand() - .5) * .4, (rand() - .3) * .42, (rand() - .5) * .32));
            leafPositions.push({
                pos: target,
                scale: .72 + rand() * .8,
                rot: rand() * TAU,
                tilt: (rand() - .5) * 1.4,
                tipX: angle
            });
        }
    }
    for (let i = 0; i < 52; i++) {
        leafPositions.push({
            pos: new THREE.Vector3(potX + (rand() - .5) * .72, 1.06 + rand() * .8, potZ + (rand() - .5) * .48),
            scale: .64 + rand() * .7,
            rot: rand() * TAU,
            tilt: (rand() - .5) * 1.7,
            tipX: 0
        });
    }
    const leafGeo = leafGeometry(.12, .3, .035);
    const leafMat = MAT.foliage.clone();
    leafMat.color.setHex(16777215);
    leafMat.roughness = .68;
    leafMat.envMapIntensity = .16;
    const instanced = new THREE.InstancedMesh(leafGeo, leafMat, leafPositions.length);
    instanced.castShadow = true;
    instanced.receiveShadow = true;
    const dummy = new THREE.Object3D;
    const greens = [ new THREE.Color(2375729), new THREE.Color(3231802), new THREE.Color(1913639), new THREE.Color(3955265), new THREE.Color(4809543) ];
    leafPositions.forEach((leaf, i) => {
        dummy.position.copy(leaf.pos);
        dummy.rotation.set(leaf.tilt, leaf.rot, 0, "YXZ");
        dummy.scale.set(leaf.scale, leaf.scale, leaf.scale);
        dummy.updateMatrix();
        instanced.setMatrixAt(i, dummy.matrix);
        instanced.setColorAt(i, greens[i % greens.length]);
    });
    instanced.instanceMatrix.needsUpdate = true;
    group.add(instanced);
    return group;
}

function addInteriorPlant() {
    const group = new THREE.Group;
    group.name = "interior-fatsia";
    scene.add(group);
    const x = .075, z = -.255, baseY = .955;
    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(.092, .075, .19, 26, 1, true), MAT.brassDark);
    bucket.position.set(x, baseY + .095, z);
    bucket.castShadow = true;
    bucket.receiveShadow = true;
    group.add(bucket);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.092, .008, 8, 28), MAT.brassDark);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(x, baseY + .19, z);
    group.add(rim);
    const soil = new THREE.Mesh(new THREE.CircleGeometry(.082, 24), MAT.soil);
    soil.rotation.x = -Math.PI / 2;
    soil.position.set(x, baseY + .185, z);
    group.add(soil);
    const stemMat = new THREE.MeshStandardMaterial({
        color: 4608833,
        roughness: .88
    });
    const leafMats = [ new THREE.MeshStandardMaterial({
        color: 3756346,
        roughness: .64,
        side: THREE.DoubleSide,
        envMapIntensity: .22
    }), new THREE.MeshStandardMaterial({
        color: 4545602,
        roughness: .62,
        side: THREE.DoubleSide,
        envMapIntensity: .22
    }), new THREE.MeshStandardMaterial({
        color: 2901300,
        roughness: .66,
        side: THREE.DoubleSide,
        envMapIntensity: .2
    }) ];
    const rand = mulberryLocal(41);
    for (let s = 0; s < 10; s++) {
        const angle = rand() * TAU;
        const reach = .15 + rand() * .22;
        const topY = baseY + .62 + rand() * .78;
        const end = new THREE.Vector3(x + Math.cos(angle) * reach, topY, z + Math.sin(angle) * reach * .55 + .045);
        const curve = new THREE.CatmullRomCurve3([ new THREE.Vector3(x, baseY + .16, z), new THREE.Vector3(x + Math.cos(angle) * .08, baseY + (topY - baseY) * .5, z + Math.sin(angle) * .035), end ]);
        const stem = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, .0055, 5, false), stemMat);
        stem.castShadow = true;
        group.add(stem);
        for (let i = 0; i < 8; i++) {
            const t = .4 + i / 10.5;
            const p = curve.getPoint(t);
            const leaf = new THREE.Mesh(leafGeometry(.075 + rand() * .05, .18 + rand() * .12, .01), leafMats[i % leafMats.length]);
            leaf.position.copy(p).add(new THREE.Vector3((rand() - .5) * .11, (rand() - .5) * .055, (rand() - .5) * .08));
            leaf.rotation.set(rand() * 1.5 - .75, rand() * TAU, rand() * 1.4 - .7);
            leaf.scale.setScalar(.72 + rand() * .5);
            leaf.castShadow = true;
            group.add(leaf);
        }
    }
    for (let i = 0; i < 7; i++) {
        const angle = rand() * TAU;
        const leaf = new THREE.Mesh(leafGeometry(.065 + rand() * .04, .2 + rand() * .13, .009), leafMats[(i + 1) % leafMats.length]);
        leaf.position.set(x + Math.cos(angle) * .07, baseY + .44 + rand() * .3, z + Math.sin(angle) * .05);
        leaf.rotation.set(-.3 + rand() * .6, rand() * TAU, (rand() - .5) * .9);
        leaf.scale.setScalar(.8 + rand() * .4);
        group.add(leaf);
    }
    addGlowSprite(group, x, baseY + .95, z + .1, .75, .024, 13621173).renderOrder = 14;
    return group;
}

function mulberryLocal(seed) {
    let a = seed >>> 0;
    return function() {
        a |= 0;
        a = a + 1831565813 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

function addPavement() {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(32, 34, 1, 1), MAT.pavement);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, 15);
    ground.receiveShadow = true;
    ground.castShadow = false;
    ground.name = "stone-pavement";
    scene.add(ground);
    const stepMatA = makeStoneMaterial({
        repeat: [ 1.5, .45 ],
        color: 12762289
    });
    const stepMatB = makeStoneMaterial({
        repeat: [ 1.3, .4 ],
        color: 11906980
    });
    const stepRiser = makeStoneMaterial({
        repeat: [ 2.4, .3 ],
        color: 10788757
    });
    box(scene, 8.75, .055, .5, -.3, .028, .58, stepRiser, {
        bevel: .008,
        segments: 2,
        receive: true,
        cast: true
    });
    const stepRand = mulberryLocal(811);
    const slabW = .835;
    for (let i = 0; i < 10; i++) {
        const x = -4.63 + slabW * .5 + i * (slabW + .012);
        const w = slabW - .006 - stepRand() * .012;
        const h = .038 + stepRand() * .012;
        box(scene, w, h, .43, x, .058 + h * .5, .56, i % 3 ? stepMatA : stepMatB, {
            bevel: .006,
            segments: 2,
            receive: true,
            cast: false
        });
    }
    box(scene, 8.6, .012, .03, -.3, .098, .775, stepRiser, {
        bevel: .004,
        segments: 2,
        receive: true,
        cast: false
    });
    const leafMatA = new THREE.MeshStandardMaterial({
        color: 5785140,
        roughness: .92,
        side: THREE.DoubleSide
    });
    const leafMatB = new THREE.MeshStandardMaterial({
        color: 8019517,
        roughness: .92,
        side: THREE.DoubleSide
    });
    const leafGeo = leafGeometry(.13, .055, .006);
    const rand = mulberryLocal(133);
    for (let i = 0; i < 17; i++) {
        const leaf = new THREE.Mesh(leafGeo, i % 3 ? leafMatA : leafMatB);
        leaf.position.set(-2.8 + rand() * 5.9, .012 + rand() * .006, .42 + rand() * 1.6);
        leaf.rotation.set(-Math.PI / 2 + (rand() - .5) * .4, rand() * TAU, rand() * TAU);
        leaf.scale.set(.35 + rand() * .7, .35 + rand() * .65, 1);
        leaf.receiveShadow = true;
        leaf.castShadow = false;
        scene.add(leaf);
    }
    const gritGeo = new THREE.BufferGeometry;
    const gritPos = new Float32Array(140 * 3);
    for (let i = 0; i < 140; i++) {
        gritPos[i * 3] = -4.2 + rand() * 8.2;
        gritPos[i * 3 + 1] = .008;
        gritPos[i * 3 + 2] = .5 + rand() * 4;
    }
    gritGeo.setAttribute("position", new THREE.BufferAttribute(gritPos, 3));
    const grit = new THREE.Points(gritGeo, new THREE.PointsMaterial({
        color: 10326394,
        size: .011,
        transparent: true,
        opacity: .45,
        depthWrite: false
    }));
    scene.add(grit);
}

function addBollard() {
    const group = new THREE.Group;
    group.name = "cast-iron-bollard";
    group.position.set(-.14, 0, 3.5);
    group.scale.setScalar(.93);
    scene.add(group);
    const profile = [ new THREE.Vector2(.002, 0), new THREE.Vector2(.17, 0), new THREE.Vector2(.17, .06), new THREE.Vector2(.145, .08), new THREE.Vector2(.145, .12), new THREE.Vector2(.12, .15), new THREE.Vector2(.088, .17), new THREE.Vector2(.088, .72), new THREE.Vector2(.1, .74), new THREE.Vector2(.1, .78), new THREE.Vector2(.115, .8), new THREE.Vector2(.095, .83), new THREE.Vector2(.06, .835), new THREE.Vector2(.055, .86), new THREE.Vector2(0, .86) ];
    const post = new THREE.Mesh(new THREE.LatheGeometry(profile, 32), MAT.iron);
    post.castShadow = true;
    post.receiveShadow = true;
    group.add(post);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(.115, 32, 24), MAT.iron);
    ball.scale.set(1, .98, 1);
    ball.position.y = .925;
    ball.castShadow = true;
    ball.receiveShadow = true;
    group.add(ball);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(.092, .014, 10, 28), MAT.iron);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = .795;
    collar.castShadow = true;
    group.add(collar);
    for (const [y, r] of [ [ .3, .09 ], [ .46, .087 ] ]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(r, .007, 8, 24), MAT.iron);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = y;
        group.add(ring);
    }
    contactShadow(group, 0, .004, 0, .52, .52, .7);
    return group;
}

function addPlaque() {
    const group = new THREE.Group;
    group.name = "agency-plaque";
    group.position.set(-3.92, 3.31, .07);
    scene.add(group);
    box(group, .66, 1.36, .06, 0, 0, 0, MAT.iron, {
        bevel: .012,
        segments: 3,
        cast: true,
        receive: true
    });
    const plaqueMat = new THREE.MeshStandardMaterial({
        map: T.plaqueMap,
        roughness: .5,
        metalness: .38,
        envMapIntensity: .8,
        emissive: 1185810,
        emissiveIntensity: .22
    });
    const face = plane(group, .58, 1.26, 0, 0, .034, plaqueMat, {
        cast: false,
        receive: true
    });
    box(group, .62, .016, .028, 0, .648, .034, MAT.brassDark, {
        bevel: .003,
        cast: false
    });
    box(group, .62, .016, .028, 0, -.648, .034, MAT.brassDark, {
        bevel: .003,
        cast: false
    });
    for (const x of [ -.285, .285 ]) {
        const screw = new THREE.Mesh(new THREE.SphereGeometry(.014, 12, 8), MAT.brassDark);
        screw.scale.z = .35;
        screw.position.set(x, .605, .045);
        group.add(screw);
        const screw2 = screw.clone();
        screw2.position.y = -.605;
        group.add(screw2);
    }
    contactShadow(scene, -3.92, 2.628, .1, .85, .18, .35, 0);
    return group;
}

function addDoorNumber() {
    const group = new THREE.Group;
    group.position.set(3.84, 4.03, .24);
    scene.add(group);
    box(group, .17, .23, .02, 0, 0, 0, MAT.brassDark, {
        bevel: .006,
        segments: 2,
        cast: false
    });
    box(group, .018, .12, .006, -.02, 0, .012, MAT.brass, {
        rotation: [ 0, 0, -.18 ],
        cast: false
    });
    box(group, .08, .018, .006, .005, .056, .012, MAT.brass, {
        rotation: [ 0, 0, -.18 ],
        cast: false
    });
    box(group, .06, .012, .006, .01, -.012, .012, MAT.brass, {
        rotation: [ 0, 0, -.7 ],
        cast: false
    });
}

function addLights() {
    scene.add(new THREE.HemisphereLight(8559016, 3483422, .88));
    const dusk = new THREE.DirectionalLight(10467015, 2.3);
    dusk.position.set(-5.2, 7.2, 6.4);
    dusk.target.position.set(0, 2.2, -.4);
    dusk.castShadow = false;
    scene.add(dusk, dusk.target);
    const street = new THREE.PointLight(16760960, 44, 15, 2);
    street.position.set(-4.1, 4.25, 5.2);
    street.castShadow = false;
    scene.add(street);
    const streetBounce = new THREE.PointLight(16762250, 22, 7.2, 2);
    streetBounce.position.set(-1.45, 1.38, 3.35);
    streetBounce.castShadow = false;
    scene.add(streetBounce);
    const facadeFill = new THREE.DirectionalLight(16766894, .68);
    facadeFill.position.set(3.8, 3.1, 7.8);
    facadeFill.target.position.set(-.4, 1.9, 0);
    facadeFill.castShadow = false;
    scene.add(facadeFill, facadeFill.target);
    moonLight = new THREE.SpotLight(16769205, 12, 5.8, .66, .78, 1.7);
    moonLight.position.set(-.5, 4.42, .48);
    moonLight.target.position.set(-1.03, 2.55, -.73);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.set(1024, 1024);
    moonLight.shadow.camera.near = .3;
    moonLight.shadow.camera.far = 6;
    moonLight.shadow.bias = -35e-5;
    moonLight.shadow.normalBias = .022;
    moonLight.shadow.radius = 3;
    moonLight.shadow.focus = .65;
    scene.add(moonLight, moonLight.target);
    rackSpot = new THREE.SpotLight(16763280, 25, 4.8, .47, .7, 1.55);
    rackSpot.position.set(.55, 4.2, .86);
    rackSpot.target.position.set(.7, 1.8, -.16);
    rackSpot.castShadow = false;
    scene.add(rackSpot, rackSpot.target);
    const interiorFill = new THREE.PointLight(16761219, 6.2, 5.8, 2);
    interiorFill.position.set(-.95, 3.35, .22);
    scene.add(interiorFill);
}

function addWindowDust() {
    const count = 155;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
        positions[i * 3] = -2.7 + Math.random() * 3.75;
        positions[i * 3 + 1] = 1.1 + Math.random() * 3.1;
        positions[i * 3 + 2] = -.58 + Math.random() * .58;
        seeds[i * 4] = Math.random() * TAU;
        seeds[i * 4 + 1] = .006 + Math.random() * .018;
        seeds[i * 4 + 2] = .003 + Math.random() * .012;
        seeds[i * 4 + 3] = .15 + Math.random() * .7;
    }
    const geo = new THREE.BufferGeometry;
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
        color: 15979936,
        size: .0065,
        map: MAT.dustSprite,
        transparent: true,
        opacity: .32,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
        alphaTest: .02,
        toneMapped: false
    });
    const points = new THREE.Points(geo, mat);
    points.renderOrder = 11;
    points.name = "motes-in-the-display";
    scene.add(points);
    dust = {
        points: points,
        positions: positions,
        seeds: seeds,
        count: count,
        base: positions.slice()
    };
    const outCount = 60;
    const outPositions = new Float32Array(outCount * 3);
    for (let i = 0; i < outCount; i++) {
        outPositions[i * 3] = -4.2 + Math.random() * 8;
        outPositions[i * 3 + 1] = .2 + Math.random() * 4.3;
        outPositions[i * 3 + 2] = .7 + Math.random() * 3.4;
    }
    const outGeo = new THREE.BufferGeometry;
    outGeo.setAttribute("position", new THREE.BufferAttribute(outPositions, 3));
    const outMat = new THREE.PointsMaterial({
        color: 16766625,
        size: .006,
        map: MAT.dustSprite,
        transparent: true,
        opacity: .16,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
        alphaTest: .02,
        toneMapped: false
    });
    const outPoints = new THREE.Points(outGeo, outMat);
    scene.add(outPoints);
    innerDusts = {
        points: outPoints,
        positions: outPositions,
        count: outCount
    };
}

function setPointerFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    pointerX = e.clientX;
    pointerY = e.clientY;
    pointerNDC.x = (e.clientX - rect.left) / rect.width * 2 - 1;
    pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
}

function pickInteractive(e) {
    if (!cards.length || !globe) return null;
    setPointerFromEvent(e);
    raycaster.setFromCamera(pointerNDC, camera);
    const all = [ ...pickMeshes, globe.hit ];
    const hits = raycaster.intersectObjects(all, false);
    for (const h of hits) {
        if (h.object === globe.hit) return {
            kind: "globe"
        };
        let obj = h.object;
        while (obj && !obj.userData.cardIndex && obj.userData.card === undefined) obj = obj.parent;
        if (h.object.userData.card) return {
            kind: "card",
            card: h.object.userData.card
        };
        if (h.object.userData.cardIndex !== undefined) return {
            kind: "card",
            card: cards[h.object.userData.cardIndex]
        };
    }
    return null;
}

function setTooltip(content, x, y, visible = true) {
    if (CAPTURE) return;
    if (content) {
        tooltipTitle.textContent = content.title || "";
        tooltipSub.textContent = content.sub || "";
    }
    tooltip.classList.toggle("is-visible", visible);
    if (!visible) {
        tooltip.style.transform = "translate3d(-999px, -999px, 0)";
        return;
    }
    const pad = 18;
    const tw = 200;
    const th = 58;
    let left = x + pad;
    let top = y + pad;
    if (left + tw > window.innerWidth - 16) left = x - tw - pad;
    if (top + th > window.innerHeight - 16) top = y - th - pad;
    tooltip.style.transform = `translate3d(${left}px, ${top}px, 0)`;
}

function showHintOnFirstUse() {
    if (!hint) return;
    hint.classList.add("is-first-used");
}

function revealResetButton() {
    if (!resetViewButton) return;
    resetViewButton.classList.add("is-visible");
}

function hideSelection() {
    selectionEl.classList.remove("is-open");
    hideTooltip();
}

function hideTooltip() {
    tooltip.classList.remove("is-visible");
}

function openCard(card) {
    if (selectedIndex === card.index) {
        closeSelection();
        return;
    }
    selectedIndex = card.index;
    cards.forEach(c => {
        c.root.userData.selected = c.index === selectedIndex;
    });
    showHintOnFirstUse();
    lastInteraction = clock.elapsedTime;
    const dest = card.dest;
    selectionKicker.textContent = `Carnet ${String(card.coverIndex + 1).padStart(2, "0")} · ${dest.name}`;
    selectionTitle.textContent = dest.inner && dest.inner.name || dest.name;
    selectionLine.textContent = dest.inner && dest.inner.line || "";
    selectionEl.classList.add("is-open");
    revealResetButton();
    runtime.selectedBrochure = {
        cover: dest.name,
        innerDestination: dest.inner && dest.inner.name || null,
        index: card.index
    };
    const p = new THREE.Vector3;
    card.root.getWorldPosition(p);
    browseLight.position.set(p.x + .04, p.y + .34, p.z + .48);
    browseHalo.position.set(p.x, p.y + .08, p.z + .34);
    cards.forEach((c, i) => {
        if (i !== card.index) c.root.userData.settle = .024 + i % 4 * .004;
    });
    hideTooltip();
    if (renderer) renderer.shadowMap.needsUpdate = true;
}

function closeSelection() {
    if (selectedIndex < 0) return;
    selectedIndex = -1;
    cards.forEach(c => {
        c.root.userData.selected = false;
    });
    runtime.selectedBrochure = null;
    selectionEl.classList.remove("is-open");
    if (renderer) renderer.shadowMap.needsUpdate = true;
}

function handlePointerDown(e) {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const hit = pickInteractive(e);
    pointerDownInfo = {
        x: e.clientX,
        y: e.clientY,
        time: performance.now(),
        hit: hit,
        moved: false,
        globe: hit && hit.kind === "globe"
    };
    if (hit) {
        controls.enabled = false;
        hideTooltip();
        if (hit.kind === "globe") {
            globeDrag = {
                pointerId: e.pointerId,
                x: e.clientX,
                lastX: e.clientX,
                moved: false,
                lastTime: performance.now()
            };
            globe.dragging = true;
            globe.idle = 0;
            canvas.style.cursor = "grabbing";
            try {
                canvas.setPointerCapture(e.pointerId);
            } catch (err) {}
        }
    }
}

function handlePointerMove(e) {
    if (globeDrag && globeDrag.pointerId === e.pointerId) {
        const dx = e.clientX - globeDrag.lastX;
        globeDrag.lastX = e.clientX;
        globeDrag.moved = globeDrag.moved || Math.abs(e.clientX - globeDrag.x) > 2;
        globe.spin.rotation.y += dx * .0095;
        globe.velocity = THREE.MathUtils.clamp(dx * 55e-5, -.09, .09);
        globe.turns += Math.abs(dx) * .0095 / TAU;
        globe.idle = 0;
        runtime.globeTurns = Number(globe.turns.toFixed(3));
        if (pointerDownInfo) pointerDownInfo.moved = pointerDownInfo.moved || Math.abs(e.clientX - pointerDownInfo.x) + Math.abs(e.clientY - pointerDownInfo.y) > 4;
        hideTooltip();
        return;
    }
    if (pointerDownInfo && !pointerDownInfo.hit) {
        if (Math.abs(e.clientX - pointerDownInfo.x) + Math.abs(e.clientY - pointerDownInfo.y) > 4) {
            pointerDownInfo.moved = true;
            hideTooltip();
        }
        return;
    }
    if (pointerDownInfo && pointerDownInfo.hit) return;
    const hit = pickInteractive(e);
    if (hit && hit.kind === "card") {
        const dest = hit.card.dest;
        canvas.style.cursor = "pointer";
        setTooltip({
            title: `${dest.name} — ${dest.kicker.toLowerCase()}`,
            sub: "Ouvrir le carnet de voyage"
        }, e.clientX, e.clientY, true);
        hoveredKind = "card";
    } else if (hit && hit.kind === "globe") {
        canvas.style.cursor = "grab";
        setTooltip({
            title: "Mappemonde  ·  1926",
            sub: "Faire tourner le globe"
        }, e.clientX, e.clientY, true);
        hoveredKind = "globe";
    } else {
        hoveredKind = null;
        canvas.style.cursor = "default";
        hideTooltip();
    }
}

function handlePointerUp(e) {
    if (globeDrag && globeDrag.pointerId === e.pointerId) {
        globe.dragging = false;
        globeDrag = null;
        pointerDownInfo = null;
        canvas.style.cursor = hoveredKind === "globe" ? "grab" : "default";
        lastInteraction = clock.elapsedTime;
        controls.enabled = true;
        try {
            canvas.releasePointerCapture(e.pointerId);
        } catch (err) {}
        return;
    }
    if (pointerDownInfo) {
        const moved = Math.abs(e.clientX - pointerDownInfo.x) + Math.abs(e.clientY - pointerDownInfo.y) > 5;
        const hit = pointerDownInfo.hit;
        pointerDownInfo = null;
        if (hit && hit.kind === "card" && !moved) {
            openCard(hit.card);
            showHintOnFirstUse();
            revealResetButton();
        }
        if (hit) {
            lastInteraction = clock.elapsedTime;
            setTimeout(() => {
                if (controls) controls.enabled = true;
            }, 0);
        }
    }
}

function setupInteraction() {
    canvas.addEventListener("pointerdown", handlePointerDown, {
        capture: true
    });
    canvas.addEventListener("pointermove", handlePointerMove, {
        passive: true
    });
    canvas.addEventListener("pointerup", handlePointerUp, {
        capture: true
    });
    canvas.addEventListener("pointercancel", () => {
        globeDrag = null;
        pointerDownInfo = null;
        if (globe) globe.dragging = false;
        if (controls) controls.enabled = true;
    });
    canvas.addEventListener("pointerleave", () => {
        if (!globeDrag) {
            hideTooltip();
            hoveredKind = null;
            canvas.style.cursor = "default";
        }
    });
    controls.addEventListener("start", () => hideTooltip());
    controls.addEventListener("change", () => {
        revealResetButton();
        lastInteraction = clock.elapsedTime;
    });
    if (resetViewButton) {
        resetViewButton.addEventListener("click", e => {
            e.preventDefault();
            resetView();
        });
    }
    window.addEventListener("keydown", e => {
        if (e.key === "Escape") {
            closeSelection();
            hideTooltip();
        }
        if (e.key.toLowerCase() === "r") resetView();
    });
    canvas.addEventListener("dblclick", () => {
        closeSelection();
        resetView();
    });
}

function resetView() {
    if (!controls) return;
    closeSelection();
    const damping = controls.enableDamping;
    controls.enableDamping = false;
    controls.update();
    controls.enableDamping = damping;
    cameraResetTween = {
        start: performance.now(),
        duration: 900,
        fromPos: camera.position.clone(),
        toPos: cameraHome.clone(),
        fromTarget: controls.target.clone(),
        toTarget: targetHome.clone()
    };
}

function updateCards(dt, elapsed) {
    cards.forEach(card => {
        const ud = card.root.userData;
        const isSelected = selectedIndex === card.index;
        const liftSpeed = isSelected ? 4.8 : 6.2;
        const targetLift = isSelected ? 1 : 0;
        ud.lift = damp(ud.lift, targetLift, liftSpeed, dt);
        let p = ud.lift;
        const openEase = easeInOutCubic(clamp((p - .12) / .88, 0, 1));
        ud.open = openEase;
        card.hinge.rotation.y = -openEase * 2.86;
        const home = card.home;
        const zLift = easeOutCubic(p) * .365;
        const cardColumn = card.index % CARD_VIS.cols;
        const shiftBase = CARD_VIS.w * (cardColumn === 2 ? .06 : .58);
        const xShift = easeInOutCubic(p) * shiftBase;
        const yLift = Math.sin(p * Math.PI) * .045;
        const wobble = ud.settle > 1e-5 ? ud.settle * Math.sin(elapsed * 27 + ud.settleSeed) * 2 : 0;
        const cardScale = 1 + easeInOutCubic(p) * .5;
        card.root.scale.setScalar(cardScale);
        card.root.position.z = home.z + zLift;
        card.root.position.x = home.x + xShift;
        card.root.position.y = home.y + yLift + (1 - p) * wobble * .5;
        card.root.rotation.x = -.035 * easeOutCubic(p);
        card.root.rotation.z = card.baseRotationZ + wobble * .8;
        const settlePush = selectedIndex >= 0 && !isSelected ? -.02 : 0;
        if (!isSelected) {
            card.root.position.z = home.z + settlePush + wobble * .35;
        }
        const showSheen = isSelected && openEase > .03;
        card.scrim.visible = showSheen;
        card.sheen.visible = showSheen;
        if (showSheen) {
            card.scrim.material.opacity = .62 * openEase;
            card.sheen.material.opacity = (.26 + .06 * Math.sin(elapsed * .9 + card.index)) * openEase;
            card.sheen.position.x = -CARD_VIS.w * .5 + Math.sin(elapsed * .45 + card.index * .7) * CARD_VIS.w * .07;
            card.sheen.position.y = Math.cos(elapsed * .36 + card.index) * .008;
        }
        if (ud.settle > 1e-5) ud.settle *= Math.exp(-dt * 2.1); else ud.settle = 0;
        const quiet = selectedIndex >= 0 && !isSelected;
        const targetCoverColor = isSelected ? 16773580 : quiet ? 14209476 : 16777215;
        card.coverMat.color.lerp(_tmpColor.setHex(targetCoverColor), 1 - Math.exp(-4.2 * dt));
        card.insideMat.color.lerp(_tmpColor.setHex(isSelected ? 16774358 : quiet ? 14209476 : 16777215), 1 - Math.exp(-4.2 * dt));
        card.fixedMat.color.lerp(_tmpColor.setHex(isSelected ? 16774358 : quiet ? 14209476 : 16777215), 1 - Math.exp(-4.2 * dt));
        card.fixedRight.rotation.y = -.035 * openEase;
    });
    if (browseLight) {
        const target = selectedIndex >= 0 ? 1 : 0;
        browseLight.intensity = damp(browseLight.intensity, target * 1.25, 3.2, dt);
        if (browseHalo) browseHalo.material.opacity = damp(browseHalo.material.opacity, target * .12, 3.2, dt);
        if (selectedIndex >= 0) {
            const c = cards[selectedIndex];
            if (c) {
                const wp = new THREE.Vector3;
                c.root.getWorldPosition(wp);
                const lp = new THREE.Vector3(wp.x + .03, wp.y + .28, wp.z + .44);
                browseLight.position.lerp(lp, 1 - Math.exp(-3.2 * dt));
                browseHalo.position.lerp(new THREE.Vector3(wp.x, wp.y + .03, wp.z + .28), 1 - Math.exp(-4 * dt));
            }
        }
        if (rackSpot) {
            const baseTarget = new THREE.Vector3(.7, 1.8, -.16);
            if (selectedIndex >= 0) {
                const wp = new THREE.Vector3;
                cards[selectedIndex].root.getWorldPosition(wp);
                baseTarget.lerp(wp, .34);
            }
            rackSpot.target.position.lerp(baseTarget, 1 - Math.exp(-1.5 * dt));
            rackSpot.target.updateMatrixWorld();
        }
    }
}

function updateGlobe(dt, elapsed) {
    if (!globe) return;
    if (!globe.dragging) {
        globe.velocity *= Math.exp(-dt * 3.8);
        const idleTime = elapsed - Math.max(lastInteraction, 0);
        const baseSpin = idleTime > 1.5 ? .026 : .012;
        globe.spin.rotation.y += (baseSpin + globe.velocity) * dt;
        globe.turns += Math.abs((baseSpin + globe.velocity) * dt) / TAU;
        runtime.globeTurns = Number(globe.turns.toFixed(3));
    }
    if (globe.shell && globe.shell.material && globe.shell.material.uniforms) {
        const u = globe.shell.material.uniforms;
        globe.shell.material.opacity = 1;
    }
    if (globe.ring) {
        globe.ring.rotation.z = Math.sin(elapsed * .16) * .003;
    }
}

function updateDust(dt, elapsed) {
    if (dust) {
        const pos = dust.points.geometry.attributes.position;
        for (let i = 0; i < dust.count; i++) {
            const i3 = i * 3, i4 = i * 4;
            const s = dust.seeds;
            pos.array[i3] = dust.base[i3] + Math.sin(elapsed * .11 * s[i4 + 3] + s[i4]) * .035;
            pos.array[i3 + 1] = dust.base[i3 + 1] + (elapsed * .018 * s[i4 + 3] + s[i4]) % .14 - .07;
            pos.array[i3 + 2] = dust.base[i3 + 2] + Math.cos(elapsed * .07 * s[i4 + 3] + s[i4]) * .028;
        }
        pos.needsUpdate = true;
    }
    if (innerDusts) {
        const pos = innerDusts.points.geometry.attributes.position;
        for (let i = 0; i < innerDusts.count; i++) {
            const i3 = i * 3;
            pos.array[i3 + 1] = innerDusts.positions[i3 + 1] + Math.sin(elapsed * .16 + i) * .025;
            pos.array[i3] = innerDusts.positions[i3] + Math.cos(elapsed * .06 + i * 1.7) * .01;
        }
        pos.needsUpdate = true;
    }
}

function updateLights(elapsed) {
    if (moonLight) {
        moonLight.intensity = 12 + Math.sin(elapsed * .52) * .18 + Math.sin(elapsed * 1.37) * .06;
    }
    animatedLampMaterials.forEach((mat, i) => {
        mat.emissiveIntensity = .4 + Math.sin(elapsed * 1.1 + i * 1.7) * .015;
    });
    if (globe) {
        const highlight = .5 + Math.sin(globe.spin.rotation.y * 1.7) * .06;
        if (globe.shell && globe.shell.material && globe.shell.material.uniforms) {
            globe.shell.material.uniforms.uWarm.value.setRGB(1, .82 + highlight * .04, .6 + highlight * .03);
        }
    }
}

function damp(current, target, lambda, dt) {
    return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
}

function clamp(v, a, b) {
    return Math.min(b, Math.max(a, v));
}

function easeInOutCubic(t) {
    return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), .34);
    const elapsed = clock.elapsedTime;
    if (cameraResetTween) {
        const t = clamp((performance.now() - cameraResetTween.start) / cameraResetTween.duration, 0, 1);
        const eased = easeInOutCubic(t);
        camera.position.lerpVectors(cameraResetTween.fromPos, cameraResetTween.toPos, eased);
        controls.target.lerpVectors(cameraResetTween.fromTarget, cameraResetTween.toTarget, eased);
        if (t >= 1) cameraResetTween = null;
    }
    controls.update();
    updateCards(dt, elapsed);
    updateGlobe(dt, elapsed);
    updateDust(dt, elapsed);
    updateLights(elapsed);
    renderer.render(scene, camera);
    frameCount++;
    if (runtime.firstFrameMs === null) {
        runtime.firstFrameMs = Math.round(performance.now() - runtime.startedAt);
        runtime.ready = true;
        window.__SCENE_READY__ = true;
        window.__SCENE_READY_AT__ = Date.now();
        setTimeout(() => loader.classList.add("is-ready"), 90);
    }
}

async function loadFonts() {
    if (!document.fonts) return;
    const specs = [ '400 32px "Cormorant Garamond"', '500 32px "Cormorant Garamond"', '600 32px "Cormorant Garamond"', '700 32px "Cormorant Garamond"', 'italic 400 32px "Cormorant Garamond"', 'italic 500 32px "Cormorant Garamond"', '400 48px "Pinyon Script"', '500 32px "Playfair Display"', '600 32px "Playfair Display"', '700 32px "Playfair Display"', '400 32px "Italiana"', '600 32px "Bodoni Moda"', '700 32px "Bodoni Moda"', 'italic 500 32px "Bodoni Moda"' ];
    try {
        await Promise.all(specs.map(spec => document.fonts.load(spec)));
        await document.fonts.ready;
    } catch (err) {
        runtime.errors.push("Font load warning: " + err);
    }
}

function captureDiagnostics() {
    if (!renderer) return null;
    const info = renderer.info;
    const prog = renderer.info.programs ? renderer.info.programs.length : 0;
    return {
        timestamp: (new Date).toISOString(),
        url: location.href,
        ready: !!window.__SCENE_READY__,
        firstFrameMs: runtime.firstFrameMs,
        webgl: runtime.webgl,
        errors: runtime.errors.slice(),
        canvas: {
            cssWidth: canvas.clientWidth,
            cssHeight: canvas.clientHeight,
            pixelRatio: renderer.getPixelRatio(),
            drawingBufferWidth: renderer.domElement.width,
            drawingBufferHeight: renderer.domElement.height
        },
        renderer: {
            threeRevision: THREE.REVISION,
            outputColorSpace: renderer.outputColorSpace,
            toneMapping: renderer.toneMapping,
            toneMappingExposure: renderer.toneMappingExposure,
            shadowsEnabled: renderer.shadowMap.enabled,
            shaderPrograms: prog,
            drawCalls: info.render.calls,
            triangles: info.render.triangles,
            lines: info.render.lines,
            points: info.render.points,
            geometries: info.memory.geometries,
            textures: info.memory.textures,
            renderTargets: info.memory.renderTargets
        },
        scene: {
            meshes: countObjects(scene, "Mesh"),
            points: countObjects(scene, "Points"),
            lights: countObjects(scene, "Light"),
            interactiveCards: cards.length,
            selectedBrochure: runtime.selectedBrochure,
            globeTurns: runtime.globeTurns
        },
        camera: {
            fov: camera.fov,
            aspect: camera.aspect,
            position: camera.position.toArray().map(n => Number(n.toFixed(4))),
            target: controls.target.toArray().map(n => Number(n.toFixed(4))),
            near: camera.near,
            far: camera.far
        },
        animation: {
            frameCount: frameCount,
            elapsedSeconds: Number(clock.elapsedTime.toFixed(2))
        }
    };
}

function countObjects(root, type) {
    let n = 0;
    root.traverse(o => {
        if (o.isMesh && type === "Mesh") n++;
        if (o.isPoints && type === "Points") n++;
        if (o.isLight && type === "Light") n++;
    });
    return n;
}

function mergeStaticGeometry(batchableRoot) {
    batchableRoot.updateMatrixWorld(true);
    const buckets = new Map;
    const originals = [];
    const isDynamicLineage = obj => {
        let o = obj;
        while (o) {
            if (o.userData && (o.userData.dynamic || o.userData.noMerge)) return true;
            o = o.parent;
        }
        return false;
    };
    batchableRoot.traverse(mesh => {
        if (!mesh.isMesh || mesh.isInstancedMesh || mesh.isSkinnedMesh) return;
        if (!mesh.visible || mesh.renderOrder !== 0) return;
        if (isDynamicLineage(mesh)) return;
        const material = mesh.material;
        if (!material || Array.isArray(material)) return;
        if (!material.isMeshStandardMaterial || material.transparent) return;
        if (material.alphaTest > 0) return;
        const geo = mesh.geometry;
        if (!geo || !geo.attributes.position) return;
        const key = [ material.uuid, mesh.castShadow ? 1 : 0, mesh.receiveShadow ? 1 : 0, material.side ].join("|");
        if (!buckets.has(key)) buckets.set(key, {
            material: material,
            cast: mesh.castShadow,
            receive: mesh.receiveShadow,
            meshes: []
        });
        buckets.get(key).meshes.push(mesh);
    });
    for (const bucket of buckets.values()) {
        if (bucket.meshes.length < 2) continue;
        const geoms = [];
        for (const mesh of bucket.meshes) {
            let g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
            for (const name of Object.keys(g.attributes)) {
                if (name !== "position" && name !== "normal" && name !== "uv") g.deleteAttribute(name);
            }
            if (!g.attributes.uv && geoms.length > 0) {
                g.dispose();
                continue;
            }
            g.applyMatrix4(mesh.matrixWorld);
            g.clearGroups();
            geoms.push(g);
            originals.push(mesh);
        }
        if (geoms.length < 2) {
            geoms.forEach(g => g.dispose());
            continue;
        }
        const merged = mergeGeometries(geoms, false);
        geoms.forEach(g => g.dispose());
        if (!merged) continue;
        merged.computeBoundingSphere();
        const batch = new THREE.Mesh(merged, bucket.material);
        batch.castShadow = bucket.cast;
        batch.receiveShadow = bucket.receive;
        batch.name = "static-batch-" + batchableRoot.children.length;
        batchableRoot.add(batch);
    }
    originals.forEach(mesh => {
        if (mesh.parent) mesh.parent.remove(mesh);
    });
}

async function init() {
    try {
        setStatus("On allume les lampes…");
        await nextPaint();
        await loadFonts();
        setStatus("On déroule les cartes du monde…");
        await nextPaint();
        T = buildTextures();
        setStatus("On peint l’affiche de la pleine lune…");
        await nextPaint();
        createScene();
        createEnvironment();
        createMaterials();
        setStatus("On installe la vitrine…");
        await nextPaint();
        addLights();
        addSkylineDetails();
        addWoodShopfront();
        addDisplayRoom();
        addInteriorRoom();
        addWindowGlass();
        addPoster();
        addSmallPosters();
        addSillObjects();
        addBrochureRack();
        addGlobe();
        addOutsidePlant();
        addInteriorPlant();
        addPavement();
        addBollard();
        addPlaque();
        addDoorNumber();
        addWindowDust();
        mergeStaticGeometry(scene);
        setupInteraction();
        renderer.shadowMap.autoUpdate = false;
        renderer.shadowMap.needsUpdate = true;
        animate();
        window.__AGENCE__ = {
            scene: scene,
            camera: camera,
            renderer: renderer,
            controls: controls,
            cards: cards,
            globe: globe,
            getDiagnostics: captureDiagnostics,
            openBrochure: i => {
                if (cards[i]) openCard(cards[i]);
            },
            closeBrochure: closeSelection,
            resetView: resetView
        };
        setTimeout(() => {
            captureDiagnostics();
            lastDiagnosticsCapture = captureDiagnostics();
            window.__DIAGNOSTICS__ = lastDiagnosticsCapture;
        }, 1200);
    } catch (err) {
        console.error(err);
        runtime.errors.push(String(err && err.stack ? err.stack : err));
        errorMessage.textContent = String(err && err.message ? err.message : err);
        errorCard.classList.add("is-visible");
        loader.classList.add("is-ready");
    }
}

init();
