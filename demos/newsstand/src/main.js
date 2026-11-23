import * as THREE from "../vendor/three.module.js";

import { OrbitControls } from "../vendor/addons/controls/OrbitControls.js";

import { Reflector } from "../vendor/addons/objects/Reflector.js";

import { EffectComposer } from "../vendor/addons/postprocessing/EffectComposer.js";

import { RenderPass } from "../vendor/addons/postprocessing/RenderPass.js";

import { UnrealBloomPass } from "../vendor/addons/postprocessing/UnrealBloomPass.js";

import { OutputPass } from "../vendor/addons/postprocessing/OutputPass.js";

import { RectAreaLightUniformsLib } from "../vendor/addons/lights/RectAreaLightUniformsLib.js";

import { buildTextures, WORLD } from "./textures.js";

import { buildWorld } from "./world.js";

const runtime = {
    startedAt: (new Date).toISOString(),
    errors: [],
    consoleErrors: [],
    frameCount: 0,
    fps: 0,
    drawCalls: 0,
    triangles: 0,
    textures: 0,
    geometries: 0,
    programs: 0,
    ready: false,
    machinePhase: "idle",
    ripples: 0,
    interactionLog: []
};

window.__RUNTIME__ = runtime;

window.addEventListener("error", e => {
    runtime.errors.push({
        message: String(e.message),
        filename: e.filename,
        line: e.lineno,
        col: e.colno
    });
});

window.addEventListener("unhandledrejection", e => {
    runtime.errors.push({
        message: String(e.reason && e.reason.message ? e.reason.message : e.reason),
        type: "unhandledrejection"
    });
});

const nativeConsoleError = console.error.bind(console);

console.error = (...args) => {
    runtime.consoleErrors.push(args.map(a => {
        try {
            return typeof a === "string" ? a : String(a);
        } catch {
            return "[object]";
        }
    }).join(" "));
    nativeConsoleError(...args);
};

const dom = {
    stage: document.getElementById("stage"),
    loader: document.getElementById("loader"),
    coinBtn: document.getElementById("coinBtn"),
    selectBtn: document.getElementById("selectBtn"),
    waterBtn: document.getElementById("waterBtn"),
    resetView: document.getElementById("resetView"),
    machineState: document.getElementById("machineState"),
    statusLed: document.getElementById("statusLed"),
    opsHint: document.getElementById("opsHint"),
    tooltip: document.getElementById("tooltip"),
    toast: document.getElementById("toast")
};

function nextFrame() {
    return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

function showFatal(error) {
    console.error(error);
    dom.loader.classList.add("is-hidden");
    const card = document.createElement("div");
    card.className = "error-card";
    card.textContent = "The scene could not be opened. Please use a browser with WebGL enabled.";
    document.body.appendChild(card);
    runtime.fatal = String(error && error.message ? error.message : error);
}

let renderer, scene, camera, controls, composer, bloomPass, world, reflections;

let clock, raycaster, pointerNdc;

let homeView, waterView;

let viewTween = null;

let currentView = "street";

let firstRendered = false;

let shadowBaked = false;

const puddleRayPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -.045);

const tempVec3 = new THREE.Vector3;

const tempVec3b = new THREE.Vector3;

const tempQuat = new THREE.Quaternion;

let time = 0;

let lastFrameTime = 0;

let fpsWindowStart = 0;

let fpsFrames = 0;

let renderStats = {
    calls: 0,
    triangles: 0,
    lines: 0,
    points: 0
};

const lighting = {};

const machine = {
    phase: "idle",
    phaseStarted: 0,
    coinStart: 0,
    vendStart: 0,
    coinVisible: false,
    cupCount: 35,
    cupTargetY: 1.35,
    selectorPress: 0,
    lastButtonPress: 0,
    servedAt: 0,
    glow: {
        coin: 0,
        keys: 0,
        logo: 0,
        outlet: 0,
        light: 0
    },
    goals: {
        coin: 0,
        keys: 0,
        logo: 0,
        outlet: 0,
        light: 0
    }
};

let flyingCoin = null;

let coinGlowSprite = null;

let machinePulseLight = null;

const ripplesState = {
    slots: 6,
    next: 0,
    started: 0,
    activeRingIndex: 0,
    ambientNext: 6
};

let toastTimer = 0;

let cupStackBaseY = 1.35;

let downInfo = null;

let pointerDown = false;

let puddleControlLock = false;

let hoverThrottle = 0;

let pulseClock = 0;

function makePuddleShader(texture, awningReflection) {
    return {
        name: "WetStoneReflection",
        uniforms: {
            color: {
                value: new THREE.Color(10135722)
            },
            tDiffuse: {
                value: null
            },
            textureMatrix: {
                value: null
            },
            tMask: {
                value: texture
            },
            tAwning: {
                value: awningReflection
            },
            uTime: {
                value: 0
            },
            uRipples: {
                value: Array.from({
                    length: 6
                }, () => new THREE.Vector4(0, 0, -100, 0))
            },
            uOpacity: {
                value: .98
            }
        },
        vertexShader: `\n      uniform mat4 textureMatrix;\n      varying vec4 vReflectUv;\n      varying vec2 vSurfaceUv;\n      varying vec3 vWorldPosition;\n\n      void main() {\n        vSurfaceUv = uv;\n        vReflectUv = textureMatrix * vec4(position, 1.0);\n        vec4 world = modelMatrix * vec4(position, 1.0);\n        vWorldPosition = world.xyz;\n        gl_Position = projectionMatrix * viewMatrix * world;\n      }\n    `,
        fragmentShader: `\n      precision highp float;\n\n      uniform sampler2D tDiffuse;\n      uniform sampler2D tMask;\n      uniform sampler2D tAwning;\n      uniform float uTime;\n      uniform float uOpacity;\n      uniform vec4 uRipples[6];\n\n      varying vec4 vReflectUv;\n      varying vec2 vSurfaceUv;\n      varying vec3 vWorldPosition;\n\n      void main() {\n        float mask = texture2D(tMask, vSurfaceUv).r;\n        vec2 p = vWorldPosition.xz;\n\n        vec2 distortion = vec2(0.0);\n        // the water never becomes a perfect mirror in this drizzle\n        distortion += vec2(\n          sin(p.y * 4.2 + uTime * 0.31),\n          cos(p.x * 4.6 - uTime * 0.26)\n        ) * 0.0022;\n        distortion += vec2(\n          sin(p.x * 11.0 + p.y * 4.0 + uTime * 0.8),\n          cos(p.y * 9.0 - p.x * 3.0 - uTime * 0.61)\n        ) * 0.0009;\n        // fine wind-blown crinkle catches the shop lights at a smaller scale\n        float micro = sin(p.x * 26.0 + sin(p.y * 13.0 + uTime * 0.35) * 1.7 + uTime * 0.9)\n                    * sin(p.y * 33.0 - uTime * 0.75 + p.x * 2.1);\n        distortion += vec2(micro, -micro * 0.66) * 0.00055;\n\n        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);\n        float viewUp = clamp(viewDirection.y, 0.0, 1.0);\n\n        for (int i = 0; i < 6; i++) {\n          vec4 ripple = uRipples[i];\n          float age = uTime - ripple.z;\n          if (ripple.w > 0.001 && age > 0.0 && age < 9.0) {\n            vec2 delta = p - ripple.xy;\n            float d = length(delta) + 0.0001;\n            float envelope = exp(-d * 2.6) * exp(-age * 0.78);\n            float ring = sin(d * 39.0 - age * 10.4) * envelope;\n            ring += sin(d * 18.5 - age * 6.1 + 1.2) * envelope * 0.36;\n            // the farther from the eye, the more the refraction is visible\n            distortion += (delta / d) * ring * (0.0068 * ripple.w);\n          }\n        }\n\n        vec2 uv = vReflectUv.xy / max(vReflectUv.w, 0.0001);\n        uv += distortion;\n        uv = clamp(uv, vec2(0.001), vec2(0.999));\n\n        vec2 blur = vec2(0.0014, 0.0010);\n        vec3 reflected =\n          texture2D(tDiffuse, uv).rgb * 0.34 +\n          texture2D(tDiffuse, uv + vec2(blur.x, 0.0)).rgb * 0.11 +\n          texture2D(tDiffuse, uv - vec2(blur.x, 0.0)).rgb * 0.11 +\n          texture2D(tDiffuse, uv + vec2(0.0, blur.y)).rgb * 0.11 +\n          texture2D(tDiffuse, uv - vec2(0.0, blur.y)).rgb * 0.11 +\n          texture2D(tDiffuse, uv + blur * 0.78).rgb * 0.055 +\n          texture2D(tDiffuse, uv - blur * 0.78).rgb * 0.055 +\n          texture2D(tDiffuse, uv + vec2(blur.x, -blur.y) * 0.78).rgb * 0.055 +\n          texture2D(tDiffuse, uv + vec2(-blur.x, blur.y) * 0.78).rgb * 0.055;\n\n        float fresnel = pow(1.0 - viewUp, 2.15);\n        float edge = smoothstep(0.22, 0.78, mask);\n        float film = smoothstep(0.08, 0.24, mask) * 0.06;\n        // a pale waterline at the edge makes the puddle sit in the stone\n        float rim = smoothstep(0.10, 0.21, mask) * (1.0 - smoothstep(0.25, 0.48, mask));\n        float alpha = (edge * (0.28 + 0.64 * fresnel) + film + rim * 0.10) * uOpacity;\n\n        vec3 waterTint = reflected * vec3(0.80, 0.90, 0.94);\n        float reflectedLum = dot(reflected, vec3(0.299, 0.587, 0.114));\n        waterTint *= 0.94 + smoothstep(0.02, 0.5, reflectedLum) * 0.20;\n        waterTint += vec3(0.10, 0.115, 0.11) * rim * (0.25 + 0.75 * fresnel);\n        // tiny moving glints on the water skin\n        float glint = smoothstep(0.55, 0.9, micro * 0.5 + 0.5) * smoothstep(0.03, 0.35, reflectedLum);\n        waterTint += vec3(1.0, 0.86, 0.62) * glint * 0.16;\n\n        // A faint, water-broken echo of the valance lettering. At this eye height\n        // the true mirror image of that high sign would fall below the view, so we\n        // place its ghost in the visible foreground water where the eye expects it.\n        float ax = (p.x + 2.0) / 1.6;\n        float az = (p.y - 2.53) / 0.36;\n        float inX = smoothstep(0.0, 0.12, ax) * (1.0 - smoothstep(0.88, 1.0, ax));\n        float inZ = smoothstep(0.03, 0.16, az) * (1.0 - smoothstep(0.82, 0.98, az));\n        float signRegion = inX * inZ * smoothstep(0.32, 0.72, mask);\n        // the dark painted cloth of the awning, inverted in the water\n        float darkBand = inX * smoothstep(0.04, 0.22, az) * (1.0 - smoothstep(0.82, 0.98, az))\n                       * smoothstep(0.3, 0.62, mask);\n        waterTint *= 1.0 - darkBand * 0.14;\n        vec2 signUv = vec2(ax, az);\n        signUv += distortion * 3.0;\n        signUv.x += sin(p.y * 8.0 + uTime * 0.55) * 0.006;\n        signUv.y += sin(p.x * 11.0 - uTime * 0.4) * 0.026;\n        signUv.y += sin(p.x * 26.0 + p.y * 2.0 + uTime * 0.7) * 0.012;\n        vec4 awningGhost = texture2D(tAwning, clamp(signUv, 0.001, 0.999)) * 0.55;\n        awningGhost += texture2D(tAwning, clamp(signUv + vec2(0.004, 0.0), 0.001, 0.999)) * 0.23;\n        awningGhost += texture2D(tAwning, clamp(signUv - vec2(0.004, 0.0), 0.001, 0.999)) * 0.22;\n        waterTint += awningGhost.rgb * awningGhost.a * signRegion * 0.26 * vec3(0.94, 0.88, 0.73);\n        waterTint += vec3(0.004, 0.010, 0.013);\n\n        gl_FragColor = vec4(waterTint, clamp(alpha, 0.0, 0.94));\n      }\n    `
    };
}

async function init() {
    await nextFrame();
    RectAreaLightUniformsLib.init();
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
        stencil: false,
        alpha: false
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = true;
    renderer.info.autoReset = false;
    dom.stage.appendChild(renderer.domElement);
    scene = new THREE.Scene;
    scene.background = new THREE.Color(397330);
    scene.fog = new THREE.FogExp2(660759, .042);
    scene.environmentIntensity = .76;
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, .05, 70);
    homeView = {
        position: new THREE.Vector3(.16, 1.56, 6.15),
        target: new THREE.Vector3(-.86, 1.15, .16)
    };
    waterView = {
        position: new THREE.Vector3(.58, 1.02, 4.48),
        target: new THREE.Vector3(.05, .1, 2.18)
    };
    camera.position.copy(homeView.position);
    camera.lookAt(homeView.target);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(homeView.target);
    controls.enableDamping = true;
    controls.dampingFactor = .054;
    controls.enablePan = false;
    controls.rotateSpeed = .48;
    controls.zoomSpeed = .72;
    controls.minDistance = 1.65;
    controls.maxDistance = 11.5;
    controls.minPolarAngle = .52;
    controls.maxPolarAngle = 1.535;
    controls.update();
    clock = new THREE.Clock;
    raycaster = new THREE.Raycaster;
    pointerNdc = new THREE.Vector2(-2, -2);
    const textures = buildTextures(renderer);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromEquirectangular(textures.environment);
    scene.environment = envRT.texture;
    textures.environment.dispose();
    pmrem.dispose();
    world = buildWorld(scene, textures, renderer);
    buildLighting();
    buildInteractionObjects();
    buildPuddleReflection(textures);
    buildPostProcessing();
    setupEvents();
    syncUI();
    updateTooltipForPhase();
    clock.start();
    animate(performance.now());
}

function buildLighting() {
    const hemi = new THREE.HemisphereLight(9744316, 1512720, .9);
    scene.add(hemi);
    lighting.hemi = hemi;
    const key = new THREE.DirectionalLight(11124682, 1.45);
    key.position.set(-4.8, 7.2, 5.4);
    key.target.position.set(-.7, .4, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 7;
    key.shadow.camera.bottom = -4;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 22;
    key.shadow.bias = -35e-5;
    key.shadow.normalBias = .035;
    scene.add(key);
    scene.add(key.target);
    lighting.key = key;
    const fill = new THREE.DirectionalLight(9943238, 1);
    fill.position.set(5.5, 3.8, 6);
    fill.target.position.set(.4, .7, 0);
    scene.add(fill);
    scene.add(fill.target);
    lighting.fill = fill;
    const back = new THREE.DirectionalLight(6588305, .48);
    back.position.set(1.5, 4.5, -6.5);
    back.target.position.set(-1, 1, .5);
    scene.add(back);
    scene.add(back.target);
    lighting.back = back;
    const interiorA = new THREE.PointLight(16757349, 8.2, 4.8, 2);
    interiorA.position.set(-3.72, 2.12, .02);
    interiorA.castShadow = true;
    interiorA.shadow.mapSize.set(1024, 1024);
    interiorA.shadow.camera.near = .12;
    interiorA.shadow.camera.far = 6;
    interiorA.shadow.bias = -.002;
    interiorA.shadow.normalBias = .035;
    scene.add(interiorA);
    lighting.interiorA = interiorA;
    lighting.interiorABase = 8.2;
    const interiorB = new THREE.PointLight(16761209, 5.5, 4.2, 2);
    interiorB.position.set(-1.6, 2.08, .04);
    scene.add(interiorB);
    lighting.interiorB = interiorB;
    lighting.interiorBBase = 5.5;
    const interiorFill = new THREE.PointLight(16753503, .55, 2.3, 2);
    interiorFill.position.set(-2.6, 1.52, .34);
    scene.add(interiorFill);
    lighting.interiorFill = interiorFill;
    const windowSpot = new THREE.SpotLight(16757350, 16, 9, .62, .82, 1.8);
    windowSpot.position.set(-2.55, 2.45, .92);
    windowSpot.target.position.set(-2.2, .02, 2.55);
    windowSpot.castShadow = false;
    scene.add(windowSpot);
    scene.add(windowSpot.target);
    lighting.windowSpot = windowSpot;
    const wallLamp = new THREE.PointLight(16758635, 7.6, 5, 2);
    wallLamp.position.set(2.55, 2.68, -.16);
    scene.add(wallLamp);
    lighting.wallLamp = wallLamp;
    const streetLamp = new THREE.PointLight(16760957, 22, 9, 2);
    streetLamp.position.set(-5.08, 3.24, 1.76);
    scene.add(streetLamp);
    lighting.streetLamp = streetLamp;
    const streetFill = new THREE.PointLight(11389138, 6.4, 7, 2);
    streetFill.position.set(.4, 2.15, 3.2);
    scene.add(streetFill);
    lighting.streetFill = streetFill;
    const redBounce = new THREE.PointLight(11092792, .07, 1.4, 2);
    redBounce.position.set(.4, .8, .62);
    scene.add(redBounce);
    lighting.redBounce = redBounce;
    const coolEdge = new THREE.PointLight(8825011, 5.5, 8, 2);
    coolEdge.position.set(-3.8, 2.6, 5.2);
    scene.add(coolEdge);
    lighting.coolEdge = coolEdge;
    const wallSoft = new THREE.RectAreaLight(10207182, 1.15, 5.2, 2.6);
    wallSoft.position.set(2, 3.5, 2);
    wallSoft.lookAt(2, .8, -.6);
    scene.add(wallSoft);
    lighting.wallSoft = wallSoft;
    const frontSoft = new THREE.RectAreaLight(10928843, .8, 3.4, 2.8);
    frontSoft.position.set(.2, 2.5, 2.7);
    frontSoft.lookAt(.4, 1.1, -.3);
    scene.add(frontSoft);
    lighting.frontSoft = frontSoft;
    machinePulseLight = new THREE.PointLight(16753756, 0, 2.3, 2);
    machinePulseLight.position.set(.72, .5, .56);
    scene.add(machinePulseLight);
    const hotelGlow = new THREE.PointLight(16757612, 5, 8, 2);
    hotelGlow.position.set(-6.2, 3, -1.6);
    scene.add(hotelGlow);
    lighting.hotelGlow = hotelGlow;
    const standSpill = new THREE.PointLight(16756844, 1.35, 3, 2);
    standSpill.position.set(-2.9, 1.05, 1.22);
    scene.add(standSpill);
    lighting.standSpill = standSpill;
}

function buildPostProcessing() {
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    const size = renderer.getDrawingBufferSize(new THREE.Vector2);
    bloomPass = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), .29, .58, .82);
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass);
    composer.setSize(window.innerWidth, window.innerHeight);
    bloomPass.setSize(Math.max(1, Math.floor(size.x * .5)), Math.max(1, Math.floor(size.y * .5)));
}

function buildPuddleReflection(textures) {
    const width = WORLD.ground.xMax - WORLD.ground.xMin;
    const depth = WORLD.ground.zMax - WORLD.ground.zMin;
    const geo = new THREE.PlaneGeometry(width, depth);
    const shader = makePuddleShader(textures.puddle.texture, textures.awningReflection);
    const dbSize = renderer.getDrawingBufferSize(new THREE.Vector2);
    const rtWidth = Math.min(896, Math.max(512, Math.round(dbSize.x * .56)));
    const rtHeight = Math.round(rtWidth / (dbSize.x / dbSize.y));
    const reflection = new Reflector(geo, {
        clipBias: .003,
        textureWidth: rtWidth,
        textureHeight: rtHeight,
        multisample: 0,
        shader: shader
    });
    reflection.rotation.x = -Math.PI / 2;
    reflection.position.set(0, .043, (WORLD.ground.zMin + WORLD.ground.zMax) / 2);
    reflection.material.transparent = true;
    reflection.material.depthWrite = false;
    reflection.material.side = THREE.DoubleSide;
    reflection.renderOrder = 5;
    reflection.castShadow = false;
    reflection.receiveShadow = false;
    scene.add(reflection);
    reflections = {
        mesh: reflection,
        shader: shader,
        uniforms: reflection.material.uniforms,
        rtWidth: rtWidth,
        rtHeight: rtHeight,
        maskTexture: textures.puddle.texture,
        sample: textures.puddle.sample
    };
    reflections.uniforms.uTime.value = 0;
    resizeReflectionTarget();
}

function resizeReflectionTarget() {
    if (!reflections || !renderer) return;
    const dbSize = renderer.getDrawingBufferSize(new THREE.Vector2);
    const width = Math.min(896, Math.max(512, Math.round(dbSize.x * .56)));
    const height = Math.max(420, Math.round(width / (dbSize.x / dbSize.y)));
    reflections.uniforms.uTime.value = reflections.uniforms.uTime.value;
    const rt = reflections.mesh.getRenderTarget();
    rt.setSize(width, height);
    reflections.rtWidth = width;
    reflections.rtHeight = height;
}

function buildInteractionObjects() {
    flyingCoin = new THREE.Mesh(new THREE.CylinderGeometry(.031, .031, .005, 24), new THREE.MeshStandardMaterial({
        color: 14200157,
        metalness: .92,
        roughness: .24,
        emissive: 5123851,
        emissiveIntensity: .25
    }));
    flyingCoin.rotation.x = Math.PI / 2;
    flyingCoin.visible = false;
    flyingCoin.castShadow = false;
    scene.add(flyingCoin);
    coinGlowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: (() => {
            const c = document.createElement("canvas");
            c.width = c.height = 128;
            const ctx = c.getContext("2d");
            const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
            g.addColorStop(0, "rgba(255,240,198,.9)");
            g.addColorStop(.25, "rgba(255,188,94,.35)");
            g.addColorStop(1, "rgba(255,157,63,0)");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, 128, 128);
            const t = new THREE.CanvasTexture(c);
            t.colorSpace = THREE.SRGBColorSpace;
            return t;
        })(),
        color: 16762489,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
    }));
    coinGlowSprite.scale.set(.28, .28, 1);
    coinGlowSprite.visible = false;
    scene.add(coinGlowSprite);
}

function machineHint() {
    switch (machine.phase) {
      case "coin":
        return "5¢ 正在滑入投币口…";

      case "ready":
        return "按 1 号键 · 选择一只纸杯";

      case "vend":
        return "纸杯正在落下…";

      case "served":
        return "取出纸杯 · 或再投一枚硬币";

      default:
        return "轻触售货机 · 投入 5¢";
    }
}

function setupEvents() {
    window.addEventListener("resize", onResize);
    document.addEventListener("pointerdown", onDocumentPointerDown, true);
    renderer.domElement.addEventListener("pointerdown", onCanvasPointerDown);
    renderer.domElement.addEventListener("pointermove", onCanvasPointerMove);
    renderer.domElement.addEventListener("pointerleave", () => {
        if (!pointerDown) hideTooltip();
        if (!pointerDown) {
            renderer.domElement.classList.remove("is-puddle", "is-machine");
        }
    });
    window.addEventListener("pointermove", onGlobalPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    dom.coinBtn.addEventListener("click", () => {
        insertCoin("button");
    });
    dom.selectBtn.addEventListener("click", () => {
        selectCup("button");
    });
    dom.waterBtn.addEventListener("click", () => {
        toggleWaterView("button");
    });
    dom.resetView.addEventListener("click", () => {
        resetCamera("button");
    });
    window.addEventListener("keydown", e => {
        if (e.repeat) return;
        const tag = document.activeElement && document.activeElement.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        if (e.key === "c" || e.key === "C") insertCoin("keyboard");
        if (e.key === "1") selectCup("keyboard");
        if (e.key === "w" || e.key === "W") toggleWaterView("keyboard");
        if (e.key === "r" || e.key === "R") resetCamera("keyboard");
    });
    renderer.domElement.addEventListener("webglcontextlost", event => {
        event.preventDefault();
        runtime.errors.push({
            message: "WebGL context lost"
        });
    });
}

function onResize() {
    if (!renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (composer) composer.setSize(window.innerWidth, window.innerHeight);
    resizeReflectionTarget();
}

function setPointerFromEvent(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointerNdc.x = (event.clientX - rect.left) / rect.width * 2 - 1;
    pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function raycastMachine() {
    raycaster.setFromCamera(pointerNdc, camera);
    const hits = raycaster.intersectObjects(world.vending.hitboxes, false);
    return hits.length ? hits[0] : null;
}

function getPuddlePoint(event) {
    setPointerFromEvent(event);
    raycaster.setFromCamera(pointerNdc, camera);
    const hitPoint = new THREE.Vector3;
    if (!raycaster.ray.intersectPlane(puddleRayPlane, hitPoint)) return null;
    if (hitPoint.x < WORLD.ground.xMin || hitPoint.x > WORLD.ground.xMax) return null;
    if (hitPoint.z < WORLD.ground.zMin || hitPoint.z > WORLD.ground.zMax) return null;
    const sample = reflections ? reflections.sample(hitPoint.x, hitPoint.z) : 0;
    return {
        point: hitPoint,
        sample: sample
    };
}

function onDocumentPointerDown(event) {
    if (!renderer || event.target !== renderer.domElement) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    time = clock ? clock.getElapsedTime() : 0;
    setPointerFromEvent(event);
    const machineHit = raycastMachine();
    const puddle = machineHit ? null : getPuddlePoint(event);
    const isWater = !!(puddle && puddle.sample > .18);
    downInfo = {
        x: event.clientX,
        y: event.clientY,
        machine: !!machineHit,
        water: isWater,
        moved: false,
        at: performance.now()
    };
    pointerDown = true;
    if (isWater) {
        puddleControlLock = true;
        controls.enabled = false;
        renderer.domElement.classList.add("dragging");
        try {
            renderer.domElement.setPointerCapture(event.pointerId);
        } catch (e) {}
        addRipple(puddle.point.x, puddle.point.z, .64, true);
        renderer.domElement.classList.add("is-puddle");
        hideTooltip();
    }
}

function onCanvasPointerDown(event) {
    if (downInfo && downInfo.machine) {
        renderer.domElement.classList.add("is-machine");
    }
}

function onCanvasPointerMove(event) {
    if (performance.now() - hoverThrottle < 45) return;
    hoverThrottle = performance.now();
    if (!renderer || !camera || !reflections) return;
    if (pointerDown) return;
    updateHover(event);
}

function onGlobalPointerMove(event) {
    if (!downInfo || !pointerDown) return;
    const dx = event.clientX - downInfo.x;
    const dy = event.clientY - downInfo.y;
    if (dx * dx + dy * dy > 20) downInfo.moved = true;
    if (downInfo.water) {
        const now = performance.now();
        if (now - downInfo.lastRippleAt > 105) {
            const p = getPuddlePoint(event);
            if (p && p.sample > .16) {
                downInfo.lastRippleAt = now;
                addRipple(p.point.x, p.point.z, .34 + Math.min(.35, Math.hypot(dx, dy) / 450), true);
            }
        }
    }
}

function onPointerUp(event) {
    if (!pointerDown) return;
    const wasWater = downInfo && downInfo.water;
    const wasMachine = downInfo && downInfo.machine;
    const moved = downInfo && downInfo.moved;
    const held = downInfo ? performance.now() - downInfo.at : 0;
    pointerDown = false;
    if (wasWater) {
        puddleControlLock = false;
        try {
            renderer.domElement.releasePointerCapture(event.pointerId);
        } catch (e) {}
        renderer.domElement.classList.remove("dragging");
    }
    if (!viewTween) controls.enabled = true;
    if (wasMachine && !moved && held < 850) {
        interactWithMachine();
    }
    downInfo = null;
    if (!wasWater) updateHover(event);
}

function updateHover(event) {
    setPointerFromEvent(event);
    const machineHit = raycastMachine();
    if (machineHit) {
        renderer.domElement.classList.add("is-machine");
        renderer.domElement.classList.remove("is-puddle");
        showTooltip(machineHint(), event.clientX, event.clientY);
        return;
    }
    const puddle = getPuddlePoint(event);
    if (puddle && puddle.sample > .15) {
        renderer.domElement.classList.remove("is-machine");
        renderer.domElement.classList.add("is-puddle");
        showTooltip("轻触或拨动水面 · 让倒影散开，再慢慢合拢", event.clientX, event.clientY);
    } else {
        renderer.domElement.classList.remove("is-machine", "is-puddle");
        hideTooltip();
    }
}

function showTooltip(text, x, y) {
    dom.tooltip.textContent = text;
    dom.tooltip.style.left = `${Math.min(window.innerWidth - 250, x + 18)}px`;
    dom.tooltip.style.top = `${Math.min(window.innerHeight - 60, y + 20)}px`;
    dom.tooltip.classList.add("visible");
}

function hideTooltip() {
    dom.tooltip.classList.remove("visible");
}

function addRipple(x, z, strength = .7, visualRing = true) {
    if (!reflections) return;
    const uniforms = reflections.uniforms;
    const slot = ripplesState.next % 6;
    ripplesState.next++;
    const v = uniforms.uRipples.value[slot];
    v.set(x, z, time, strength);
    ripplesState.started++;
    if (visualRing) {
        const pool = world.ripples.rings;
        const ring = pool[ripplesState.activeRingIndex++ % pool.length];
        ring.active = true;
        ring.t0 = time;
        ring.life = 2.15 + strength * .7;
        ring.max = .38 + strength * .56;
        ring.mesh.visible = true;
        ring.mesh.position.set(x, .047, z);
        ring.mesh.scale.setScalar(.02);
        ring.mat.opacity = 0;
        const ring2 = pool[ripplesState.activeRingIndex++ % pool.length];
        ring2.active = true;
        ring2.t0 = time + .1;
        ring2.life = ring.life * .85;
        ring2.max = ring.max * .72;
        ring2.mesh.visible = false;
        ring2.mesh.position.set(x + .12, .047, z - .07);
        ring2.mesh.scale.setScalar(.02);
        ring2.mat.opacity = 0;
    }
    runtime.ripples = ripplesState.started;
}

function updateRipples(nowTime) {
    if (!reflections) return;
    reflections.uniforms.uTime.value = nowTime;
    for (const ring of world.ripples.rings) {
        if (!ring.active) continue;
        if (nowTime < ring.t0) {
            ring.mesh.visible = false;
            continue;
        }
        const age = nowTime - ring.t0;
        const p = Math.min(1, age / ring.life);
        if (p >= 1) {
            ring.active = false;
            ring.mesh.visible = false;
            continue;
        }
        ring.mesh.visible = true;
        const ease = 1 - Math.pow(1 - p, 2.5);
        const scale = .02 + ring.max * ease;
        ring.mesh.scale.setScalar(scale);
        ring.mat.opacity = Math.pow(1 - p, 2.4) * (.045 + .055 * Math.min(1, ring.max / .9));
    }
}

function randomPuddlePoint() {
    if (!reflections) return null;
    for (let i = 0; i < 20; i++) {
        const x = -2.8 + Math.random() * 5.9;
        const z = 1.4 + Math.random() * 2.2;
        const s = reflections.sample(x, z);
        if (s > .45) return {
            x: x,
            z: z,
            s: s
        };
    }
    return {
        x: .25,
        z: 2.5,
        s: .8
    };
}

function setMachinePhase(phase) {
    machine.phase = phase;
    machine.phaseStarted = time;
    runtime.machinePhase = phase;
    syncUI();
    updateTooltipForPhase();
}

function insertCoin(source = "canvas") {
    if (!world) return;
    if (machine.phase === "coin" || machine.phase === "vend") {
        return;
    }
    if (machine.phase === "ready") {
        showToast("硬币已经在里面 · 请按 1 号键选择");
        return;
    }
    if (world.vending.dispensedCup) world.vending.dispensedCup.visible = false;
    if (flyingCoin) {
        const slotWorld = world.vending.group.localToWorld(new THREE.Vector3(.265, 1.4, world.vending.frontZ + .045));
        flyingCoin.position.copy(slotWorld).add(new THREE.Vector3(.06, .3, .42));
        flyingCoin.userData.slot = slotWorld.clone();
        flyingCoin.userData.start = flyingCoin.position.clone();
        flyingCoin.userData.arc = slotWorld.clone().add(new THREE.Vector3(.01, .19, .22));
        flyingCoin.visible = true;
        flyingCoin.scale.setScalar(1);
        coinGlowSprite.visible = true;
        coinGlowSprite.position.copy(flyingCoin.position);
    }
    machine.coinStart = performance.now();
    machine.coinVisible = true;
    machine.selectorPress = 0;
    setMachinePhase("coin");
    showToast("叮 · 5¢ 滑入投币口");
    runtime.interactionLog.push({
        action: "insertCoin",
        source: source,
        at: (new Date).toISOString()
    });
    window.setTimeout(() => {
        if (machine.phase !== "coin") return;
        setMachinePhase("ready");
        if (flyingCoin) flyingCoin.visible = false;
        if (coinGlowSprite) coinGlowSprite.visible = false;
        addRipple(.45, 2.48, .34, true);
        showToast("READY · 按 1 号键，取一只干净纸杯");
    }, 760);
}

function selectCup(source = "canvas") {
    if (!world) return;
    if (machine.phase !== "ready") {
        if (machine.phase === "idle" || machine.phase === "served") {
            showToast("先投一枚 5¢ 硬币");
        }
        return;
    }
    machine.vendStart = performance.now();
    machine.selectorPress = 1;
    setMachinePhase("vend");
    const cup = world.vending.dispensedCup;
    if (cup) {
        cup.visible = true;
        cup.position.set(-.04, world.vending.outletY + .12, world.vending.frontZ + .025);
        cup.scale.setScalar(.55);
        cup.rotation.set(0, 0, .12);
    }
    const holderCups = world.vending.cupsInHolder;
    if (holderCups && holderCups.length) {
        const visible = holderCups.filter(c => c.visible);
        if (visible.length) visible[visible.length - 1].visible = false;
        machine.cupCount = Math.max(0, machine.cupCount - 1);
        machine.cupTargetY = cupStackBaseY - (35 - machine.cupCount) * .005;
    }
    addRipple(.68, 2.38, .8, true);
    window.setTimeout(() => addRipple(-.35, 2.2, .45, true), 180);
    showToast("咔哒 · 1 号键 · 纸杯落下");
    runtime.interactionLog.push({
        action: "selectCup",
        source: source,
        at: (new Date).toISOString()
    });
    window.setTimeout(() => {
        if (machine.phase !== "vend") return;
        setMachinePhase("served");
        machine.servedAt = time;
        const servedCup = world.vending.dispensedCup;
        if (servedCup) {
            servedCup.position.set(-.04, world.vending.outletY - .02, world.vending.frontZ + .12);
            servedCup.scale.setScalar(1);
            servedCup.rotation.set(0, 0, 0);
        }
        addRipple(.32, 2.62, .36, false);
        showToast("取物口亮了 · 请取走你的纸杯");
    }, 1180);
}

function interactWithMachine() {
    if (machine.phase === "idle" || machine.phase === "served") insertCoin("canvas"); else if (machine.phase === "ready") selectCup("canvas"); else if (machine.phase === "coin") showToast("硬币正在滑入 · 稍等一下"); else if (machine.phase === "vend") showToast("纸杯正在落下 · 稍等一下");
}

function updateMachine(now, t) {
    const v = world.vending;
    const phase = machine.phase;
    if (phase === "idle") {
        machine.goals.coin = 0;
        machine.goals.keys = .025;
        machine.goals.logo = .035;
        machine.goals.outlet = .015;
        machine.goals.light = 0;
    } else if (phase === "coin") {
        const elapsed = (now - machine.coinStart) / 760;
        const flick = Math.sin(t * 28) * .5 + .5;
        machine.goals.coin = .45 + flick * .35;
        machine.goals.keys = .08;
        machine.goals.logo = .06;
        machine.goals.outlet = .03;
        machine.goals.light = .22;
        if (flyingCoin && flyingCoin.visible) {
            const p = Math.min(1, Math.max(0, elapsed));
            const e = p * p * (3 - 2 * p);
            const a = flyingCoin.userData.start, b = flyingCoin.userData.arc, c = flyingCoin.userData.slot;
            if (a && b && c) {
                tempVec3.copy(a).multiplyScalar((1 - e) * (1 - e));
                tempVec3.addScaledVector(b, 2 * (1 - e) * e);
                tempVec3.addScaledVector(c, e * e);
                flyingCoin.position.copy(tempVec3);
                flyingCoin.rotation.z += .33;
                flyingCoin.rotation.y += .18;
                const s = 1 - Math.max(0, e - .82) / .18 * .72;
                flyingCoin.scale.setScalar(Math.max(.22, s));
            }
            coinGlowSprite.position.copy(flyingCoin.position);
            coinGlowSprite.material.opacity = .35 + Math.sin(t * 18) * .15;
            coinGlowSprite.scale.setScalar(.22 + Math.sin(t * 18) * .03);
        }
    } else if (phase === "ready") {
        machine.goals.coin = .88;
        machine.goals.keys = .9 + Math.sin(t * 3.2) * .16;
        machine.goals.logo = .13;
        machine.goals.outlet = .05;
        machine.goals.light = .48;
    } else if (phase === "vend") {
        const elapsed = (now - machine.vendStart) / 1e3;
        const pulse = Math.sin(elapsed * 15) * .5 + .5;
        machine.goals.coin = .46;
        machine.goals.keys = .72 + pulse * .28;
        machine.goals.logo = .32 + pulse * .28;
        machine.goals.outlet = .9;
        machine.goals.light = .9 + pulse * .35;
        machinePulseLight.intensity = 1.15 + pulse * .55;
        if (v.dispensedCup && v.dispensedCup.visible) {
            const p = Math.min(1, Math.max(0, elapsed / .82));
            const e = 1 - Math.pow(1 - p, 3);
            const bounce = Math.sin(Math.min(1, p * 1.18) * Math.PI) * (1 - p) * .022;
            v.dispensedCup.position.y = v.outletY - .02 + (1 - e) * .14 + bounce;
            v.dispensedCup.position.z = v.frontZ + .045 + .075 * e;
            v.dispensedCup.scale.setScalar(.55 + .45 * e);
            v.dispensedCup.rotation.z = .12 * (1 - e);
            v.dispensedCup.rotation.x = .03 * Math.sin(p * Math.PI);
        }
    } else if (phase === "served") {
        machine.goals.coin = .2;
        machine.goals.keys = .12;
        machine.goals.logo = .055;
        machine.goals.outlet = .58;
        machine.goals.light = .32;
        machinePulseLight.intensity += (0 - machinePulseLight.intensity) * .06;
    }
    if (phase !== "vend") {
        machinePulseLight.intensity += (0 - machinePulseLight.intensity) * .08;
    }
    const damp = 1 - Math.pow(.001, 1 / 60);
    machine.glow.coin += (machine.goals.coin - machine.glow.coin) * .12;
    machine.glow.keys += (machine.goals.keys - machine.glow.keys) * .13;
    machine.glow.logo += (machine.goals.logo - machine.glow.logo) * .1;
    machine.glow.outlet += (machine.goals.outlet - machine.glow.outlet) * .12;
    machine.glow.light += (machine.goals.light - machine.glow.light) * .1;
    v.coinGlowMat.opacity = machine.glow.coin * (.78 + Math.sin(t * 2.8) * .1);
    v.keyLight.intensity = machine.glow.light * .9;
    v.logoMat.emissiveIntensity = machine.glow.logo;
    v.outletGlowMat.opacity = Math.max(.02, machine.glow.outlet * .75);
    v.outletPoint.intensity = machine.glow.outlet * 1.35;
    for (let i = 0; i < v.buttonMats.length; i++) {
        const m = v.buttonMats[i];
        m.emissiveIntensity = machine.glow.keys * (phase === "ready" ? .9 + Math.sin(t * 3.6 + i * .8) * .12 : 1);
    }
    if (v.badge && v.badge.material) {
        v.badge.material.emissiveIntensity = .16 + machine.glow.logo * .22;
    }
    if (machine.selectorPress > 0) {
        const p = Math.min(1, (performance.now() - machine.vendStart) / 280);
        const press = Math.sin(Math.min(1, p) * Math.PI);
        if (v.buttons[0]) v.buttons[0].position.z = .004 - press * .01;
    } else if (v.buttons[0]) {
        v.buttons[0].position.z += (.004 - v.buttons[0].position.z) * .2;
    }
    v.cupStack.position.y += (machine.cupTargetY - v.cupStack.position.y) * .12;
    v.cupStack.rotation.z = Math.sin(t * 14) * .008 * Math.max(0, 1 - (t - machine.phaseStarted) * 2);
    lighting.interiorA.intensity = lighting.interiorABase * (.965 + Math.sin(t * 2.1) * .018 + Math.sin(t * 7.3) * .012);
    lighting.interiorB.intensity = lighting.interiorBBase * (.97 + Math.sin(t * 3.7 + 1.4) * .014);
    lighting.windowSpot.intensity = 16 * (.985 + Math.sin(t * 1.8 + .3) * .014);
}

function syncUI() {
    if (!dom.coinBtn) return;
    const phase = machine.phase;
    dom.coinBtn.disabled = !(phase === "idle" || phase === "served");
    dom.selectBtn.disabled = phase !== "ready";
    dom.selectBtn.classList.toggle("ready", phase === "ready");
    dom.waterBtn.classList.toggle("ready", currentView === "water");
    const stateText = {
        idle: "READY",
        coin: "5¢ IN",
        ready: "PRESS 1",
        vend: "VENDING",
        served: "TAKE CUP"
    }[phase];
    dom.machineState.textContent = stateText;
    dom.statusLed.classList.toggle("hot", phase === "ready" || phase === "served");
    dom.statusLed.classList.toggle("vend", phase === "vend" || phase === "coin");
    const hints = {
        idle: "轻触机器与投币口，或从下面投下一枚硬币。再按一次，让一只纸杯落下。",
        coin: "硬币正在滑入投币口，售货机的选杯键马上就会亮起。",
        ready: "按 1 号键，听见纸杯落进取物口。水洼里的倒影也会轻轻动一下。",
        vend: "纸杯正从出口落下，取物口的暖光亮起来了。",
        served: "纸杯就在取物口。再来一杯，或者俯身去看前景的水洼。"
    };
    dom.opsHint.textContent = hints[phase];
    const wl = dom.waterBtn.querySelector(".btn-label");
    const ws = dom.waterBtn.querySelector(".btn-sub");
    if (wl) wl.textContent = currentView === "water" ? "回街面" : "看水洼";
    if (ws) ws.textContent = currentView === "water" ? "BACK TO STREET" : "GO TO WATER";
    if (currentView === "water") {
        dom.waterBtn.classList.add("ready");
    }
}

function updateTooltipForPhase() {
    if (dom.tooltip.classList.contains("visible") && !pointerDown) {
        dom.tooltip.textContent = machineHint();
    }
}

function showToast(text) {
    dom.toast.textContent = text;
    dom.toast.classList.add("visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => dom.toast.classList.remove("visible"), 2500);
}

function clearOrbitInertia() {
    if (!controls) return;
    const damping = controls.enableDamping;
    controls.enableDamping = false;
    controls.update();
    controls.enableDamping = damping;
}

function moveCameraTo(view, duration = 1600) {
    if (!camera || !controls) return;
    clearOrbitInertia();
    viewTween = {
        fromPos: camera.position.clone(),
        toPos: view.position.clone(),
        fromTarget: controls.target.clone(),
        toTarget: view.target.clone(),
        start: performance.now(),
        duration: duration
    };
    controls.enabled = false;
}

function updateCameraMove(now) {
    if (!viewTween) return;
    const p = Math.min(1, (now - viewTween.start) / viewTween.duration);
    const e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    camera.position.lerpVectors(viewTween.fromPos, viewTween.toPos, e);
    controls.target.lerpVectors(viewTween.fromTarget, viewTween.toTarget, e);
    camera.lookAt(controls.target);
    if (p >= 1) {
        viewTween = null;
        controls.enabled = true;
        controls.update();
    }
}

function toggleWaterView(source = "button") {
    if (currentView === "water") {
        resetCamera(source);
        return;
    }
    currentView = "water";
    moveCameraTo(waterView, 1700);
    syncUI();
    hideTooltip();
    showToast("俯身 · 水洼里收着一条倒过来的街");
    runtime.interactionLog.push({
        action: "focusWater",
        source: source,
        at: (new Date).toISOString()
    });
    window.setTimeout(() => {
        const p = randomPuddlePoint();
        if (p) addRipple(p.x, p.z, .7, true);
    }, 950);
}

function resetCamera(source = "button") {
    if (!camera) return;
    const alreadyHome = currentView === "street" && camera.position.distanceTo(homeView.position) < .035 && controls.target.distanceTo(homeView.target) < .035;
    currentView = "street";
    syncUI();
    hideTooltip();
    runtime.interactionLog.push({
        action: "resetView",
        source: source,
        at: (new Date).toISOString()
    });
    if (alreadyHome) {
        viewTween = null;
        controls.enabled = true;
        showToast("已在街面 · STREET LEVEL");
        return;
    }
    viewTween = null;
    controls.enabled = false;
    clearOrbitInertia();
    viewTween = {
        fromPos: camera.position.clone(),
        toPos: homeView.position.clone(),
        fromTarget: controls.target.clone(),
        toTarget: homeView.target.clone(),
        start: performance.now(),
        duration: 1450
    };
    showToast("回到街面 · STREET LEVEL");
}

function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min(.06, (now - lastFrameTime) / 1e3 || .016);
    lastFrameTime = now;
    time = clock.getElapsedTime();
    runtime.frameCount++;
    if (!firstRendered) {
        fpsWindowStart = now;
    }
    updateCameraMove(now);
    if (controls && controls.enabled) controls.update();
    updateMachine(now, time);
    updateRipples(time);
    if (time > ripplesState.ambientNext && currentView === "street" && !document.hidden) {
        const p = randomPuddlePoint();
        if (p) addRipple(p.x, p.z, .18 + Math.random() * .16, true);
        ripplesState.ambientNext = time + 7.5 + Math.random() * 7.5;
    }
    if (lighting.streetLamp) lighting.streetLamp.intensity = 22 * (.975 + Math.sin(time * 1.2 + .7) * .02);
    if (lighting.wallLamp) lighting.wallLamp.intensity = 7.6 * (.98 + Math.sin(time * 2.3 + 1.1) * .015);
    if (flyingCoin && flyingCoin.visible) {
        flyingCoin.rotation.z += .14;
        flyingCoin.rotation.y += .1;
    }
    renderer.info.reset();
    composer.render();
    renderStats = {
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        lines: renderer.info.render.lines,
        points: renderer.info.render.points
    };
    runtime.drawCalls = renderStats.calls;
    runtime.triangles = renderStats.triangles;
    runtime.textures = renderer.info.memory.textures;
    runtime.geometries = renderer.info.memory.geometries;
    runtime.programs = renderer.info.programs ? renderer.info.programs.length : 0;
    fpsFrames++;
    if (!firstRendered) {
        fpsWindowStart = now;
    }
    if (now - fpsWindowStart >= 1e3) {
        runtime.fps = Math.round(fpsFrames * 1e3 / (now - fpsWindowStart));
        fpsFrames = 0;
        fpsWindowStart = now;
    }
    if (!firstRendered) {
        firstRendered = true;
        runtime.ready = true;
        window.__SCENE_READY__ = true;
        window.setTimeout(() => {
            if (!shadowBaked && renderer) {
                renderer.shadowMap.autoUpdate = false;
                renderer.shadowMap.needsUpdate = false;
                shadowBaked = true;
            }
        }, 250);
        window.setTimeout(() => dom.loader.classList.add("is-hidden"), 350);
        updateDiagnostics();
    }
}

function updateDiagnostics() {
    try {
        const gl = renderer.getContext();
        const dbg = gl.getExtension("WEBGL_debug_renderer_info");
        const info = {
            webgl: true,
            webglVersion: gl.getParameter(gl.VERSION),
            webglRenderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
            webglVendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
            threeRevision: THREE.REVISION,
            canvas: {
                cssWidth: window.innerWidth,
                cssHeight: window.innerHeight,
                bufferWidth: renderer.domElement.width,
                bufferHeight: renderer.domElement.height
            },
            devicePixelRatio: window.devicePixelRatio,
            reflectionTarget: reflections ? {
                width: reflections.rtWidth,
                height: reflections.rtHeight
            } : null,
            camera: {
                fov: camera.fov,
                position: camera.position.toArray().map(v => +v.toFixed(3)),
                target: controls.target.toArray().map(v => +v.toFixed(3))
            },
            sceneObjects: (() => {
                let meshes = 0, sprites = 0, lights = 0;
                scene.traverse(o => {
                    if (o.isMesh) meshes++; else if (o.isSprite) sprites++; else if (o.isLight) lights++;
                });
                return {
                    meshes: meshes,
                    sprites: sprites,
                    lights: lights
                };
            })()
        };
        runtime.webgl = info;
    } catch (e) {
        runtime.errors.push({
            message: "Diagnostics error: " + String(e)
        });
    }
}

function diagnostics() {
    updateDiagnostics();
    return {
        status: runtime.errors.length ? "error" : "ok",
        pageReady: !!window.__SCENE_READY__,
        startedAt: runtime.startedAt,
        capturedAt: (new Date).toISOString(),
        webgl: runtime.webgl,
        threeRevision: THREE.REVISION,
        frameCount: runtime.frameCount,
        measuredFPS: runtime.fps,
        drawCalls: runtime.drawCalls,
        triangles: runtime.triangles,
        textures: runtime.textures,
        geometries: runtime.geometries,
        programs: runtime.programs,
        rendererSettings: {
            pixelRatio: renderer.getPixelRatio(),
            toneMapping: renderer.toneMapping,
            exposure: renderer.toneMappingExposure,
            shadowMapEnabled: renderer.shadowMap.enabled,
            shadowMapAutoUpdate: renderer.shadowMap.autoUpdate,
            outputColorSpace: renderer.outputColorSpace
        },
        scene: {
            meshes: runtime.webgl ? runtime.webgl.sceneObjects.meshes : null,
            sprites: runtime.webgl ? runtime.webgl.sceneObjects.sprites : null,
            lights: runtime.webgl ? runtime.webgl.sceneObjects.lights : null,
            fog: "FogExp2(0x0a1517, 0.042)"
        },
        view: currentView,
        controls: controls ? {
            enabled: controls.enabled,
            enableDamping: controls.enableDamping,
            enablePan: controls.enablePan,
            minDistance: controls.minDistance,
            maxDistance: controls.maxDistance,
            target: controls.target.toArray().map(v => +v.toFixed(3))
        } : null,
        machine: {
            phase: machine.phase,
            dispensedCups: 35 - machine.cupCount,
            cupVisible: !!(world && world.vending.dispensedCup && world.vending.dispensedCup.visible),
            coinGlow: world ? +world.vending.coinGlowMat.opacity.toFixed(3) : null,
            keyLight: world ? +world.vending.keyLight.intensity.toFixed(3) : null,
            logoEmissive: world ? +world.vending.logoMat.emissiveIntensity.toFixed(3) : null,
            outletGlow: world ? +world.vending.outletGlowMat.opacity.toFixed(3) : null,
            outletLight: world ? +world.vending.outletPoint.intensity.toFixed(3) : null
        },
        puddle: {
            ripplesTriggered: ripplesState.started,
            activeRippleSlots: reflections ? reflections.uniforms.uRipples.value.filter(v => v.w > .001).length : 0,
            interactive: true,
            reflectionTarget: reflections ? {
                width: reflections.rtWidth,
                height: reflections.rtHeight
            } : null
        },
        camera: runtime.webgl ? runtime.webgl.camera : null,
        interactions: runtime.interactionLog.slice(-20),
        pageErrors: runtime.errors,
        consoleErrors: runtime.consoleErrors,
        notes: [ "Rendered with real WebGL via headless Chromium (SwiftShader).", "OrbitControls is enabled for inspection.", "Planar puddle reflection is rendered each frame with rippled, blurred sampling." ]
    };
}

window.__getSceneDiagnostics = diagnostics;

window.__getApp = () => ({
    THREE: THREE,
    scene: scene,
    camera: camera,
    renderer: renderer,
    composer: composer,
    controls: controls,
    reflections: reflections
});


init().catch(showFatal);
