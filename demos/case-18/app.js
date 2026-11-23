import * as THREE from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { Reflector } from "three/addons/objects/Reflector.js";

import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";

import { RenderPass } from "three/addons/postprocessing/RenderPass.js";

import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

import { FXAAShader } from "three/addons/shaders/FXAAShader.js";

const TAU = Math.PI * 2;

const PLATFORM_TOP = 1.32;

const state = {
    warmth: .12,
    warmthTarget: .12,
    hoveredCable: null,
    pointerInside: false,
    time: 0,
    startTime: performance.now(),
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    ready: false
};

const diagnostics = {
    threeRevision: THREE.REVISION,
    webgl: null,
    webgl2: null,
    renderer: null,
    triangles: 0,
    drawCalls: 0,
    textures: 0,
    geometries: 0,
    programs: 0,
    frameTimes: [],
    errors: [],
    interactions: {
        cableHover: false,
        warmthChanged: false,
        orbited: false
    },
    output: {
        width: 1536,
        height: 1024,
        aspect: 1.5
    }
};

window.__diagnostics = diagnostics;

window.addEventListener("error", e => diagnostics.errors.push(String(e.message || e.error || e)));

window.addEventListener("unhandledrejection", e => diagnostics.errors.push(String(e.reason || e)));

const canvas = document.getElementById("scene");

const loader = document.getElementById("loader");

const dock = document.getElementById("dock");

const hintTitle = document.getElementById("hintTitle");

const hintSub = document.getElementById("hintSub");

const warmthInput = document.getElementById("warmth");

const warmthState = document.getElementById("warmthState");

const resetButton = document.getElementById("reset");

let renderer;

try {
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        powerPreference: "high-performance",
        stencil: false,
        alpha: false
    });
} catch (err) {
    diagnostics.errors.push(String(err));
    document.getElementById("error").style.display = "grid";
    throw err;
}

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));

renderer.setSize(window.innerWidth, window.innerHeight);

renderer.setClearColor(395791, 1);

renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.toneMapping = THREE.ACESFilmicToneMapping;

renderer.toneMappingExposure = .86;

renderer.shadowMap.enabled = true;

renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const MAX_ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());

const gl = renderer.getContext();

diagnostics.webgl = "WebGLRenderer";

diagnostics.webgl2 = typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext;

diagnostics.renderer = gl.getParameter(gl.RENDERER);

diagnostics.vendor = gl.getParameter(gl.VENDOR);

const scene = new THREE.Scene;

scene.background = new THREE.Color(461842);

scene.fog = new THREE.FogExp2(725273, .0085);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, .08, 190);

const HOME_POSITION = new THREE.Vector3(3.2, 1.72, 16);

const HOME_TARGET = new THREE.Vector3(-.2, 4.3, -4);

camera.position.copy(HOME_POSITION);

const controls = new OrbitControls(camera, renderer.domElement);

controls.target.copy(HOME_TARGET);

controls.enableDamping = true;

controls.dampingFactor = .055;

controls.rotateSpeed = .48;

controls.zoomSpeed = .7;

controls.panSpeed = .6;

controls.minDistance = 6.5;

controls.maxDistance = 34;

controls.minPolarAngle = .38;

controls.maxPolarAngle = Math.PI * .62;

controls.update();

function mulberry32(seed) {
    let a = seed >>> 0;
    return function() {
        a |= 0;
        a = a + 1831565813 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

const random = mulberry32(20261126);

const rr = (min, max) => min + (max - min) * random();

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

const lerp = (a, b, t) => a + (b - a) * t;

const smooth = x => x * x * (3 - 2 * x);

function canvas2d(width, height) {
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    return {
        canvas: c,
        ctx: c.getContext("2d")
    };
}

function makeCanvasTexture(canvas, {srgb: srgb = true, repeat: repeat = false} = {}) {
    const tex = new THREE.CanvasTexture(canvas);
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = MAX_ANISO;
    if (repeat) {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
    }
    tex.needsUpdate = true;
    return tex;
}

function roundRectPath(ctx, x, y, w, h, r) {
    const rad = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
}

function addBox(parent, w, h, d, mat, x, y, z, {cast: cast = false, receive: receive = true} = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = cast;
    m.receiveShadow = receive;
    parent.add(m);
    return m;
}

function addCylinder(parent, rt, rb, h, mat, x, y, z, seg = 16, {cast: cast = false, receive: receive = true} = {}) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
    m.position.set(x, y, z);
    m.castShadow = cast;
    m.receiveShadow = receive;
    parent.add(m);
    return m;
}

const _yAxis = new THREE.Vector3(0, 1, 0);

function beamBetween(parent, a, b, width, depth, mat, {cast: cast = false, receive: receive = true} = {}) {
    const dir = (new THREE.Vector3).subVectors(b, a);
    const len = dir.length();
    const m = new THREE.Mesh(new THREE.BoxGeometry(width, len, depth), mat);
    m.position.copy(a).addScaledVector(dir, .5);
    m.quaternion.setFromUnitVectors(_yAxis, dir.clone().normalize());
    m.castShadow = cast;
    m.receiveShadow = receive;
    parent.add(m);
    return m;
}

function rodBetween(parent, a, b, radius, mat, seg = 10) {
    const dir = (new THREE.Vector3).subVectors(b, a);
    const len = dir.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, seg), mat);
    m.position.copy(a).addScaledVector(dir, .5);
    m.quaternion.setFromUnitVectors(_yAxis, dir.clone().normalize());
    parent.add(m);
    return m;
}

function makeGlowTexture(size = 128) {
    const {canvas: c, ctx: ctx} = canvas2d(size, size);
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(.08, "rgba(255,255,255,.84)");
    g.addColorStop(.24, "rgba(255,255,255,.26)");
    g.addColorStop(.55, "rgba(255,255,255,.045)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function makeSoftShadowTexture(size = 128) {
    const {canvas: c, ctx: ctx} = canvas2d(size, size);
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(0,0,0,.94)");
    g.addColorStop(.45, "rgba(0,0,0,.56)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
}

const glowTexture = makeGlowTexture(192);

const softShadowTexture = makeSoftShadowTexture(128);

function addGlowSprite(parent, color, x, y, z, scale, opacity = .5, depthTest = true) {
    const mat = new THREE.SpriteMaterial({
        map: glowTexture,
        color: color,
        transparent: true,
        opacity: opacity,
        depthWrite: false,
        depthTest: depthTest,
        blending: THREE.AdditiveBlending,
        toneMapped: false
    });
    const s = new THREE.Sprite(mat);
    s.position.set(x, y, z);
    s.scale.setScalar(scale);
    parent.add(s);
    return s;
}

function addContactShadow(parent, x, z, sx, sz, opacity = .34) {
    const mat = new THREE.MeshBasicMaterial({
        map: softShadowTexture,
        transparent: true,
        opacity: opacity,
        depthWrite: false,
        color: 0,
        side: THREE.DoubleSide
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, .012, z);
    m.renderOrder = 3;
    parent.add(m);
    return m;
}

function createConcreteTexture(size = 768) {
    const {canvas: c, ctx: ctx} = canvas2d(size, size);
    const img = ctx.createImageData(size, size);
    const rng = mulberry32(90413);
    const d = img.data;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const i = (y * size + x) * 4;
            const broad = Math.sin(x * .017 + Math.sin(y * .013) * 1.8) * 4 + Math.cos(y * .021 - x * .006) * 3;
            const mid = Math.sin((x + y) * .061) * 1.6 + Math.sin((x - y) * .037) * 1.4;
            const grain = (rng() - .5) * 22;
            const aggregate = rng() < .022 ? -18 - rng() * 18 : 0;
            const v = clamp(106 + broad + mid + grain + aggregate, 44, 158);
            d[i] = v * 1.01;
            d[i + 1] = v;
            d[i + 2] = v * .96;
            d[i + 3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
    const stainRng = mulberry32(3307);
    for (let i = 0; i < 34; i++) {
        const x = stainRng() * size;
        const y = stainRng() * size;
        const rad = 25 + stainRng() * 155;
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        const dark = stainRng() > .34;
        g.addColorStop(0, dark ? "rgba(30,31,29,.13)" : "rgba(218,214,202,.055)");
        g.addColorStop(.6, dark ? "rgba(37,36,32,.05)" : "rgba(220,217,208,.018)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    const crackRng = mulberry32(88231);
    ctx.lineCap = "round";
    for (let i = 0; i < 9; i++) {
        let x = crackRng() * size;
        let y = crackRng() * size;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let k = 0; k < 13; k++) {
            x += (crackRng() - .5) * 28;
            y += crackRng() * 17;
            ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(28,28,27,${.08 + crackRng() * .1})`;
        ctx.lineWidth = .6 + crackRng() * 1.1;
        ctx.stroke();
    }
    const specRng = mulberry32(553);
    for (let i = 0; i < 2200; i++) {
        ctx.fillStyle = specRng() > .5 ? "rgba(195,194,186,.10)" : "rgba(21,22,21,.13)";
        const s = .5 + specRng() * 1.4;
        ctx.fillRect(specRng() * size, specRng() * size, s, s);
    }
    const tex = makeCanvasTexture(c, {
        repeat: true
    });
    tex.repeat.set(7, 7);
    return tex;
}

function createRackPanelTextures(seed) {
    const W = 512;
    const H = 1024;
    const {canvas: c, ctx: ctx} = canvas2d(W, H);
    const {canvas: e, ctx: ec} = canvas2d(W, H);
    const rng = mulberry32(seed * 7919 + 23);
    const LEDS = [ "#69f0b0", "#66cfff", "#4c86ff", "#ffbd6b", "#ff7660", "#d7f4ff" ];
    const bg = ctx.createLinearGradient(0, 0, W, 0);
    bg.addColorStop(0, "#010203");
    bg.addColorStop(.13, "#05080b");
    bg.addColorStop(.5, "#030506");
    bg.addColorStop(.87, "#05080b");
    bg.addColorStop(1, "#010203");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ec.fillStyle = "#000";
    ec.fillRect(0, 0, W, H);
    for (let i = 0; i < 2400; i++) {
        const v = 8 + rng() * 20;
        ctx.fillStyle = `rgba(${v},${v + 2},${v + 4},${.08 + rng() * .18})`;
        ctx.fillRect(rng() * W, rng() * H, .4 + rng() * 1.6, .5 + rng() * 2.4);
    }
    for (const x0 of [ 12, 452 ]) {
        const railGrad = ctx.createLinearGradient(x0, 0, x0 + 48, 0);
        railGrad.addColorStop(0, "#020304");
        railGrad.addColorStop(.25, "#141a20");
        railGrad.addColorStop(.47, "#090d11");
        railGrad.addColorStop(.72, "#121820");
        railGrad.addColorStop(1, "#020304");
        ctx.fillStyle = railGrad;
        ctx.fillRect(x0, 0, 48, H);
        ctx.fillStyle = "rgba(154,172,188,.22)";
        ctx.fillRect(x0 + 8, 0, 1, H);
        ctx.fillRect(x0 + 39, 0, 1, H);
        for (let y = 18; y < H; y += 22) {
            ctx.fillStyle = "rgba(0,0,0,.9)";
            ctx.beginPath();
            ctx.arc(x0 + 24, y, 2.8, 0, TAU);
            ctx.fill();
            ctx.strokeStyle = "rgba(111,126,139,.28)";
            ctx.lineWidth = .8;
            ctx.beginPath();
            ctx.arc(x0 + 24, y, 3.8, 0, TAU);
            ctx.stroke();
        }
    }
    ctx.fillStyle = "rgba(1,2,3,.9)";
    ctx.fillRect(247, 0, 18, H);
    ctx.fillStyle = "rgba(95,110,124,.14)";
    ctx.fillRect(249, 0, 1, H);
    ctx.fillRect(263, 0, 1, H);
    for (let y = 34; y < H; y += 68) {
        ctx.fillStyle = "rgba(21,26,31,.85)";
        ctx.fillRect(245, y, 22, 5);
    }
    const addLed = (x, y, color, s = 2.4, glow = false) => {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, s, s);
        ec.fillStyle = color;
        ec.fillRect(x - 1, y - 1, s + 2, s + 2);
        if (glow) {
            ec.globalAlpha = .22;
            ec.fillRect(x - 4, y - 4, s + 8, s + 8);
            ec.globalAlpha = 1;
        }
    };
    let y = 26;
    let moduleIndex = 0;
    while (y < H - 34) {
        y += 7 + Math.floor(rng() * 19);
        let mh = 38 + Math.floor(rng() * 82);
        if (y + mh > H - 18) break;
        const margin = 46 + Math.floor(rng() * 9);
        const x = margin;
        const w = W - margin * 2;
        const kind = Math.floor(rng() * 6);
        if (rng() < .07) {
            ctx.fillStyle = "rgba(0,0,0,.45)";
            ctx.fillRect(x, y, w, mh * .4);
            y += mh * .55;
            continue;
        }
        ctx.fillStyle = [ "#090d12", "#070a0e", "#0b1016", "#080b0f", "#0a0f14" ][Math.floor(rng() * 5)];
        ctx.fillRect(x, y, w, mh);
        ctx.fillStyle = "rgba(135,150,165,.13)";
        ctx.fillRect(x, y, w, .9);
        ctx.fillStyle = "rgba(0,0,0,.85)";
        ctx.fillRect(x, y + mh - 1.5, w, 1.5);
        ctx.fillStyle = "rgba(0,0,0,.7)";
        ctx.fillRect(x - 1, y, 1, mh);
        ctx.fillRect(x + w, y, 1, mh);
        if (kind === 0) {
            for (let sy = y + 8; sy < y + mh - 8; sy += 3.8) {
                ctx.fillStyle = "rgba(0,0,0,.72)";
                ctx.fillRect(x + 10, sy, w - 70, 1.3);
            }
            if (mh > 58) {
                const cx = x + w - 30;
                const cy = y + mh / 2;
                const rr0 = Math.min(18, (mh - 14) / 2);
                ctx.strokeStyle = "rgba(118,132,145,.16)";
                ctx.lineWidth = 1;
                for (let a = 0; a < 10; a++) {
                    ctx.beginPath();
                    ctx.arc(cx, cy, rr0, a / 10 * TAU, a / 10 * TAU + .4);
                    ctx.stroke();
                }
                ctx.beginPath();
                ctx.arc(cx, cy, rr0 + 4, 0, TAU);
                ctx.stroke();
            }
        } else if (kind === 1) {
            const cols = 6 + Math.floor(rng() * 3);
            const dr = (w - 24) / cols;
            const rowCount = mh > 78 ? 2 : 1;
            const rh = (mh - 18) / rowCount;
            for (let r = 0; r < rowCount; r++) {
                for (let i = 0; i < cols; i++) {
                    const dx = x + 12 + i * dr;
                    const dy = y + 8 + r * rh;
                    ctx.fillStyle = "#0b1117";
                    ctx.fillRect(dx + 1, dy + 2, dr - 4, rh - 6);
                    ctx.fillStyle = "rgba(131,149,164,.18)";
                    ctx.fillRect(dx + 1, dy + 2, dr - 4, .8);
                    ctx.fillStyle = "rgba(0,0,0,.7)";
                    ctx.fillRect(dx + dr * .34, dy + 7, 1.2, Math.max(3, rh - 14));
                    const ledCol = LEDS[Math.floor(rng() * LEDS.length)];
                    addLed(dx + dr * .65, dy + Math.max(6, rh - 12), ledCol, 1.8);
                }
            }
        } else if (kind === 2) {
            ctx.strokeStyle = "rgba(76,88,99,.28)";
            ctx.lineWidth = .8;
            ctx.strokeRect(x + 10, y + 7, w - 20, mh - 14);
            ctx.fillStyle = "rgba(183,192,200,.25)";
            ctx.font = "600 13px monospace";
            ctx.textAlign = "center";
            ctx.fillText([ "BLANK / 19", "RESERVED", "SPARE BAY", "CORE PLANE" ][Math.floor(rng() * 4)], x + w / 2, y + mh / 2 + 2);
            ctx.textAlign = "left";
            ctx.fillStyle = "rgba(188,151,76,.4)";
            ctx.fillRect(x + w - 68, y + 12, 44, 3);
            addLed(x + 16, y + mh - 14, rng() > .5 ? "#4c86ff" : "#ffbd6b", 1.8);
        } else if (kind === 3) {
            ctx.fillStyle = "rgba(70,96,118,.14)";
            ctx.fillRect(x + 8, y + 6, w - 16, mh - 12);
            const ports = 22;
            const pp = (w - 30) / ports;
            for (let i = 0; i < ports; i++) {
                const px = x + 16 + i * pp;
                ctx.fillStyle = "#030608";
                ctx.fillRect(px, y + mh * .28, Math.max(3, pp - 2), Math.max(6, mh * .22));
                if (rng() < .32) addLed(px + 1, y + mh * .28 + 2, LEDS[Math.floor(rng() * LEDS.length)], 1.5);
            }
            ctx.fillStyle = "rgba(177,197,214,.32)";
            ctx.font = "9px monospace";
            ctx.fillText("10G / SFP+ ARRAY", x + 16, y + mh - 8);
        } else if (kind === 4) {
            const sw = Math.min(150, w * .45);
            const sx = x + 12;
            const sy = y + 8;
            const sh = Math.max(16, mh - 18);
            ctx.fillStyle = "#010407";
            ctx.fillRect(sx, sy, sw, sh);
            ctx.strokeStyle = "rgba(87,121,146,.35)";
            ctx.lineWidth = 1;
            ctx.strokeRect(sx, sy, sw, sh);
            ctx.fillStyle = "rgba(61,155,211,.75)";
            for (let l = 0; l < 4; l++) ctx.fillRect(sx + 6, sy + 6 + l * 6, sw * (.25 + rng() * .6), 1.4);
            ec.fillStyle = "rgba(48,136,190,.9)";
            ec.fillRect(sx + 1, sy + 1, sw - 2, sh - 2);
            for (let l = 0; l < 4; l++) {
                ec.fillStyle = "rgba(169,230,255,.8)";
                ec.fillRect(sx + 6, sy + 6 + l * 6, sw * (.25 + rng() * .6), 1.4);
            }
            for (let k = 0; k < 5; k++) addLed(x + w - 86 + k * 11, y + 12, LEDS[Math.floor(rng() * LEDS.length)], 2.6);
            ctx.fillStyle = "rgba(196,207,218,.32)";
            ctx.font = "10px monospace";
            ctx.fillText("CORE CONTROL / 19", x + w - 108, y + mh - 9);
        } else {
            const cols = 9;
            const dr = (w - 24) / cols;
            for (let i = 0; i < cols; i++) {
                const dx = x + 12 + i * dr;
                ctx.fillStyle = "#0c1218";
                ctx.fillRect(dx + 1, y + 6, dr - 2, mh - 12);
                ctx.fillStyle = "rgba(147,163,178,.24)";
                ctx.fillRect(dx + 3, y + 9, dr - 8, 1);
                addLed(dx + dr / 2, y + mh - 13, rng() > .8 ? "#ffbd6b" : "#69f0b0", 1.8, true);
            }
            ctx.fillStyle = "rgba(0,0,0,.6)";
            ctx.fillRect(x + 10, y + mh * .42, w - 20, 1.5);
        }
        if (rng() < .3) {
            const lw = 50 + rng() * 68;
            const lx = x + 20 + rng() * (w - lw - 50);
            const ly = y + 8 + rng() * Math.max(1, mh - 30);
            ctx.fillStyle = "rgba(215,221,225,.34)";
            ctx.fillRect(lx, ly, lw, 11);
            ctx.fillStyle = "rgba(14,18,21,.8)";
            ctx.font = "7px monospace";
            ctx.fillText("ALG-19 / " + String(Math.floor(rng() * 90 + 10)), lx + 3, ly + 8);
        }
        if (moduleIndex % 7 === 3) {
            ctx.fillStyle = "rgba(196,140,49,.5)";
            ctx.fillRect(x + 18, y + mh - 20, 30, 9);
            ctx.fillStyle = "rgba(17,13,7,.8)";
            ctx.font = "700 7px monospace";
            ctx.fillText("CAUTION", x + 21, y + mh - 13);
        }
        y += mh;
        moduleIndex++;
    }
    ctx.fillStyle = "rgba(57,129,193,.35)";
    ctx.fillRect(38, 86, 1.5, 560);
    ec.fillStyle = "rgba(64,145,214,.9)";
    ec.fillRect(38, 86, 1.3, 560);
    for (let k = 0; k < 12; k++) {
        addLed(36, 120 + k * 45, "#70d4ff", 1.8);
    }
    ctx.save();
    ctx.translate(W - 64, 60);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = "rgba(201,210,216,.26)";
    ctx.font = '700 22px "Arial Narrow", Arial, sans-serif';
    ctx.fillText("ALGORITHM / CORE 19", 0, 0);
    ctx.restore();
    const sheen = ctx.createLinearGradient(0, 0, W, H);
    sheen.addColorStop(0, "rgba(160,185,205,.035)");
    sheen.addColorStop(.45, "rgba(0,0,0,0)");
    sheen.addColorStop(.8, "rgba(165,192,214,.02)");
    sheen.addColorStop(1, "rgba(0,0,0,.2)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, W, H);
    const map = makeCanvasTexture(c, {
        srgb: true
    });
    const emissiveMap = makeCanvasTexture(e, {
        srgb: true
    });
    const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    map.anisotropy = aniso;
    emissiveMap.anisotropy = aniso;
    return {
        map: map,
        emissiveMap: emissiveMap
    };
}

function createRackTextures(seed) {
    const W = 512;
    const H = 1024;
    const rng = mulberry32(seed);
    const {canvas: c, ctx: ctx} = canvas2d(W, H);
    const {canvas: e, ctx: ec} = canvas2d(W, H);
    ctx.fillStyle = "#030507";
    ctx.fillRect(0, 0, W, H);
    ec.fillStyle = "#000000";
    ec.fillRect(0, 0, W, H);
    const faceGrad = ctx.createLinearGradient(0, 0, W, 0);
    faceGrad.addColorStop(0, "#070a0e");
    faceGrad.addColorStop(.2, "#0a0e13");
    faceGrad.addColorStop(.5, "#0b1016");
    faceGrad.addColorStop(.8, "#090d12");
    faceGrad.addColorStop(1, "#070a0e");
    ctx.fillStyle = faceGrad;
    ctx.fillRect(24, 0, W - 48, H);
    const railGrad = ctx.createLinearGradient(0, 0, W, 0);
    railGrad.addColorStop(0, "#020304");
    railGrad.addColorStop(.045, "#22272d");
    railGrad.addColorStop(.08, "#0a0d10");
    railGrad.addColorStop(.16, "#05070a");
    railGrad.addColorStop(.5, "#040608");
    railGrad.addColorStop(.84, "#070a0d");
    railGrad.addColorStop(.93, "#242a30");
    railGrad.addColorStop(.97, "#090c10");
    railGrad.addColorStop(1, "#020304");
    ctx.fillStyle = railGrad;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(166,178,190,.43)";
    ctx.fillRect(34, 0, 1.4, H);
    ctx.fillRect(W - 35.4, 0, 1.4, H);
    for (let y = 20; y < H; y += 22) {
        for (const rx of [ 17, W - 17 ]) {
            ctx.fillStyle = "rgba(0,0,0,.9)";
            ctx.beginPath();
            ctx.arc(rx, y, 2.5, 0, TAU);
            ctx.fill();
            ctx.strokeStyle = "rgba(146,158,170,.28)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(rx, y, 3.4, 0, TAU);
            ctx.stroke();
        }
    }
    const colors = [ "#55ffb0", "#54d7ff", "#4386ff", "#ffbd65", "#ff6f58", "#c7f1ff" ];
    let y = 16;
    while (y < H - 20) {
        const uh = Math.round(26 + rng() * 46);
        const margin = 38;
        const uw = W - margin * 2;
        const kind = rng();
        ctx.fillStyle = [ "#0c1117", "#0a0e13", "#0d1218", "#080c10" ][Math.floor(rng() * 4)];
        ctx.fillRect(margin, y, uw, uh - 3);
        ctx.fillStyle = "rgba(184,198,213,.30)";
        ctx.fillRect(margin, y, uw, 1.15);
        ctx.fillStyle = "rgba(119,134,149,.13)";
        ctx.fillRect(margin + 3, y + 2, uw - 6, .65);
        ctx.fillStyle = "rgba(0,0,0,.9)";
        ctx.fillRect(margin, y + uh - 4, uw, 1.5);
        if (kind < .24) {
            ctx.fillStyle = "#010203";
            for (let sy = y + 6; sy < y + uh - 8; sy += 3.6) {
                ctx.fillRect(margin + 10, sy, uw - 50, 1.25);
            }
            ctx.fillStyle = "rgba(133,150,166,.13)";
            for (let sy = y + 7.6; sy < y + uh - 8; sy += 3.6) {
                ctx.fillRect(margin + 10, sy, uw - 50, .55);
            }
            if (uh > 37) {
                const cx = margin + uw - 26;
                const cy = y + (uh - 3) / 2;
                const rr0 = Math.min(15, (uh - 16) / 2);
                for (let a = 0; a < 12; a++) {
                    const ang = a / 12 * TAU;
                    ctx.strokeStyle = "rgba(9,12,15,.98)";
                    ctx.lineWidth = 2.1;
                    ctx.beginPath();
                    ctx.arc(cx, cy, rr0, ang, ang + .36);
                    ctx.stroke();
                }
                ctx.strokeStyle = "rgba(155,168,179,.32)";
                ctx.lineWidth = .9;
                ctx.beginPath();
                ctx.arc(cx, cy, rr0 + 1.2, 0, TAU);
                ctx.stroke();
            }
        } else if (kind < .61) {
            const bays = 7;
            const gap = 2.5;
            const bx0 = margin + 9;
            const bw = (uw - 44 - gap * (bays - 1)) / bays;
            for (let b = 0; b < bays; b++) {
                const bx = bx0 + b * (bw + gap);
                ctx.fillStyle = "#171d23";
                ctx.fillRect(bx, y + 4, bw, uh - 13);
                ctx.strokeStyle = "rgba(163,178,193,.47)";
                ctx.lineWidth = .9;
                ctx.strokeRect(bx + .5, y + 4.5, bw - 1, uh - 14);
                ctx.fillStyle = "#05080b";
                ctx.fillRect(bx + 3, y + 7, bw * .52, uh - 20);
                ctx.fillStyle = "rgba(184,197,210,.25)";
                ctx.fillRect(bx + 4, y + 8, bw * .5, 1);
                ctx.fillStyle = "rgba(0,0,0,.85)";
                ctx.fillRect(bx + bw - 6.5, y + 8, 2.2, uh - 23);
                ctx.fillStyle = "rgba(202,212,222,.58)";
                ctx.fillRect(bx + bw - 6.8, y + 8, .8, uh - 23);
                const col = colors[Math.floor(rng() * colors.length)];
                if (rng() < .74) {
                    ctx.fillStyle = col;
                    ctx.fillRect(bx + 4.2, y + uh - 16, 2.3, 2.3);
                    ec.fillStyle = col;
                    ec.globalAlpha = .85;
                    ec.fillRect(bx + 4.2, y + uh - 16, 2.3, 2.3);
                    ec.globalAlpha = 1;
                }
            }
            ctx.fillStyle = "rgba(129,144,159,.26)";
            ctx.fillRect(margin + 2, y + 4, 4, uh - 10);
        } else if (kind < .8) {
            ctx.fillStyle = "rgba(0,0,0,.34)";
            ctx.fillRect(margin + 9, y + 4, uw - 18, uh - 12);
            for (let sy = y + 7; sy < y + uh - 10; sy += 3.2) {
                ctx.fillStyle = "rgba(4,6,8,.95)";
                ctx.fillRect(margin + 14, sy, uw * .44, 1);
            }
            ctx.strokeStyle = "rgba(135,149,164,.42)";
            ctx.lineWidth = 1;
            ctx.strokeRect(margin + 9.5, y + 4.5, uw - 19, uh - 13);
            ctx.fillStyle = "rgba(195,204,214,.34)";
            ctx.fillRect(W - margin - 29, y + 7, 4.5, uh - 19);
            ctx.fillStyle = "rgba(194,205,217,.58)";
            ctx.font = "6.5px monospace";
            ctx.fillText([ "ALGO NODE 19", "CORE MESH", "SYNC / 07", "ARRAY BUS", "PARADE 4:37" ][Math.floor(rng() * 5)], margin + 18, y + 14);
            if (rng() < .66) {
                const col = colors[Math.floor(rng() * colors.length)];
                ctx.fillStyle = col;
                ctx.fillRect(margin + 18 + uw * .52, y + 10, 2.4, 2.4);
                ec.fillStyle = col;
                ec.fillRect(margin + 18 + uw * .52, y + 10, 2.4, 2.4);
            }
        } else if (kind < .93) {
            const gx = margin + 26;
            const gy = y + 6;
            const gw = Math.min(uw * .6, 218);
            const gh = Math.max(12, uh - 18);
            ctx.fillStyle = "#020507";
            ctx.fillRect(gx - 4, gy - 3, gw + 8, gh + 6);
            const g = ctx.createLinearGradient(gx, gy, gx + gw, gy + gh);
            g.addColorStop(0, "#04111b");
            g.addColorStop(.55, "#083049");
            g.addColorStop(1, "#041019");
            ctx.fillStyle = g;
            ctx.fillRect(gx, gy, gw, gh);
            ctx.strokeStyle = "rgba(150,172,188,.5)";
            ctx.lineWidth = 1;
            ctx.strokeRect(gx - 3.5, gy - 2.5, gw + 7, gh + 5);
            for (let l = 0; l < 4; l++) {
                const lineW = gw * (.2 + rng() * .55);
                ctx.fillStyle = `rgba(107,206,247,${.2 + rng() * .35})`;
                ctx.fillRect(gx + 5, gy + 4 + l * (gh - 6) / 4, lineW, 1);
                ec.fillStyle = `rgba(72,178,226,${.16 + rng() * .22})`;
                ec.fillRect(gx + 5, gy + 4 + l * (gh - 6) / 4, lineW, 1);
            }
            for (let l = 0; l < 4; l++) {
                const col = colors[Math.floor(rng() * colors.length)];
                ctx.fillStyle = col;
                ctx.fillRect(W - margin - 26 + l % 2 * 7, y + 8 + Math.floor(l / 2) * 7, 2.3, 2.3);
                ec.fillStyle = col;
                ec.globalAlpha = .9;
                ec.fillRect(W - margin - 26 + l % 2 * 7, y + 8 + Math.floor(l / 2) * 7, 2.3, 2.3);
                ec.globalAlpha = 1;
            }
        } else {
            ctx.fillStyle = "rgba(0,0,0,.38)";
            ctx.fillRect(margin + 8, y + 3, uw - 16, uh - 9);
            for (let sy = y + 7; sy < y + uh - 8; sy += 5.5) {
                for (let sx = margin + 15; sx < W - margin - 42; sx += 6) {
                    ctx.fillStyle = "rgba(2,3,4,.75)";
                    ctx.beginPath();
                    ctx.arc(sx, sy, 1.1, 0, TAU);
                    ctx.fill();
                }
            }
            ctx.fillStyle = "rgba(185,197,208,.3)";
            ctx.font = "700 17px monospace";
            ctx.fillText("19", W - margin - 36, y + (uh - 2) / 2 + 5);
            ctx.strokeStyle = "rgba(139,155,170,.34)";
            ctx.lineWidth = .8;
            ctx.strokeRect(margin + 8.5, y + 3.5, uw - 17, uh - 10);
        }
        ctx.fillStyle = "rgba(164,176,188,.42)";
        ctx.beginPath();
        ctx.arc(margin + 4, y + 5, 1.4, 0, TAU);
        ctx.arc(W - margin - 4, y + 5, 1.4, 0, TAU);
        ctx.fill();
        for (let l = 0; l < 5; l++) {
            if (rng() > .55) continue;
            const col = colors[Math.floor(rng() * colors.length)];
            const lx = 26 + l % 2 * 5;
            const ly = y + 6 + Math.floor(l / 2) * 6;
            ctx.fillStyle = col;
            ctx.fillRect(lx, ly, 2.2, 2.2);
            ec.shadowColor = col;
            ec.shadowBlur = 8;
            ec.fillStyle = col;
            ec.fillRect(lx - .4, ly - .4, 3, 3);
            ec.shadowBlur = 0;
        }
        y += uh;
    }
    const topGrad = ctx.createLinearGradient(0, 0, 0, 120);
    topGrad.addColorStop(0, "rgba(0,0,0,.62)");
    topGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, W, 120);
    const botGrad = ctx.createLinearGradient(0, H, 0, H - 140);
    botGrad.addColorStop(0, "rgba(0,0,0,.88)");
    botGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = botGrad;
    ctx.fillRect(0, H - 140, W, 140);
    const wash = ctx.createLinearGradient(0, 0, W, 0);
    wash.addColorStop(0, "rgba(0,0,0,.22)");
    wash.addColorStop(.18, "rgba(255,255,255,.018)");
    wash.addColorStop(.4, "rgba(0,0,0,.08)");
    wash.addColorStop(.72, "rgba(255,255,255,.012)");
    wash.addColorStop(1, "rgba(0,0,0,.28)");
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, W, H);
    const map = makeCanvasTexture(c, {
        srgb: true
    });
    const emissiveMap = makeCanvasTexture(e, {
        srgb: true
    });
    const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    map.anisotropy = aniso;
    emissiveMap.anisotropy = aniso;
    return {
        map: map,
        emissiveMap: emissiveMap
    };
}

function createCircuitTexture() {
    const W = 1024;
    const H = 768;
    const {canvas: c, ctx: ctx} = canvas2d(W, H);
    const rng = mulberry32(77531);
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#071019");
    g.addColorStop(.55, "#081521");
    g.addColorStop(1, "#040a11");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(104,157,198,.04)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
    }
    for (let y = 0; y < H; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
    }
    const traceColors = [ "rgba(192,223,246,.88)", "rgba(113,203,252,.72)", "rgba(145,166,185,.72)", "rgba(222,238,252,.54)" ];
    function drawTrace(startX, startY, steps, color, width) {
        let x = startX;
        let y = startY;
        let dir = rng() > .5 ? 0 : 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let i = 0; i < steps; i++) {
            const len = 18 + rng() * 88;
            if (dir === 0) {
                x += rng() > .5 ? len : -len;
            } else {
                y += rng() > .5 ? len : -len;
            }
            ctx.lineTo(x, y);
            if (rng() < .42) {
                const d = 8 + rng() * 24;
                x += dir === 0 ? rng() > .5 ? d : -d : 0;
                y += dir === 1 ? rng() > .5 ? d : -d : 0;
                ctx.lineTo(x, y);
            }
            dir = 1 - dir;
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineJoin = "round";
        ctx.stroke();
        ctx.fillStyle = "rgba(176,224,255,.62)";
        ctx.beginPath();
        ctx.arc(x, y, 4.4, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "rgba(9,21,31,1)";
        ctx.beginPath();
        ctx.arc(x, y, 2.1, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "rgba(183,226,255,.55)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(x, y, 7.4, 0, TAU);
        ctx.stroke();
    }
    for (let i = 0; i < 27; i++) {
        drawTrace(60 + rng() * (W - 120), 60 + rng() * (H - 120), 4 + Math.floor(rng() * 6), traceColors[Math.floor(rng() * traceColors.length)], 1 + rng() * 2.2);
    }
    ctx.strokeStyle = "rgba(112,182,230,.22)";
    ctx.lineWidth = 9;
    for (let i = 0; i < 4; i++) {
        const x = 120 + i * 210;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 230);
        ctx.lineTo(x + 70, 300);
        ctx.lineTo(x + 70, H);
        ctx.stroke();
    }
    const chipRng = mulberry32(4451);
    for (let i = 0; i < 9; i++) {
        const w = 44 + chipRng() * 92;
        const h = 28 + chipRng() * 58;
        const x = 70 + chipRng() * (W - 200);
        const y = 90 + chipRng() * (H - 210);
        ctx.fillStyle = "rgba(3,8,13,.92)";
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = "rgba(118,163,196,.55)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
        ctx.fillStyle = "rgba(149,183,208,.55)";
        for (let px = x + 6; px < x + w - 5; px += 8) {
            ctx.fillRect(px, y - 5, 2.5, 5);
            ctx.fillRect(px, y + h, 2.5, 5);
        }
        ctx.fillStyle = "rgba(175,209,232,.38)";
        ctx.font = "10px monospace";
        ctx.fillText([ "ALGO-7", "SYN", "BUS", "MEM", "Ø19" ][Math.floor(chipRng() * 5)], x + 8, y + 18);
        ctx.strokeStyle = "rgba(50,146,213,.45)";
        ctx.beginPath();
        ctx.arc(x + w - 4, y + 4, 2.5, 0, TAU);
        ctx.stroke();
    }
    for (let i = 0; i < 90; i++) {
        const x = rng() * W;
        const y = rng() * H;
        ctx.strokeStyle = "rgba(147,200,238,.28)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, 2 + rng() * 5, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = "rgba(139,205,251,.25)";
        ctx.beginPath();
        ctx.arc(x, y, 1.4, 0, TAU);
        ctx.fill();
    }
    ctx.fillStyle = "rgba(178,217,243,.58)";
    ctx.font = "700 24px monospace";
    ctx.fillText("PARADE / ALGORITHM", 58, 52);
    ctx.font = "13px monospace";
    ctx.fillStyle = "rgba(115,165,201,.42)";
    ctx.fillText("CORE LOGIC ARRAY · 19", 60, 74);
    ctx.fillText("SIGNAL INTEGRITY 98.7%", 720, 735);
    ctx.strokeStyle = "rgba(155,208,245,.45)";
    ctx.lineWidth = 2;
    ctx.strokeRect(42, 28, W - 84, H - 56);
    const leak = ctx.createRadialGradient(W * .7, H * .32, 0, W * .7, H * .32, W * .46);
    leak.addColorStop(0, "rgba(31,114,201,.12)");
    leak.addColorStop(.6, "rgba(20,80,150,.035)");
    leak.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = leak;
    ctx.fillRect(0, 0, W, H);
    return makeCanvasTexture(c, {
        srgb: true
    });
}

function createCityTexture() {
    const W = 2048;
    const H = 1024;
    const rng = mulberry32(528091);
    const {canvas: c, ctx: ctx} = canvas2d(W, H);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#07101c");
    sky.addColorStop(.28, "#0c1b2d");
    sky.addColorStop(.53, "#243749");
    sky.addColorStop(.65, "#695a51");
    sky.addColorStop(.72, "#87644b");
    sky.addColorStop(.82, "#2f2c2a");
    sky.addColorStop(1, "#0d1113");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 16; i++) {
        const y = 170 + rng() * 420;
        const h = 14 + rng() * 90;
        const g = ctx.createLinearGradient(0, y, 0, y + h);
        g.addColorStop(0, `rgba(66,84,99,${.02 + rng() * .05})`);
        g.addColorStop(.55, `rgba(104,95,86,${.02 + rng() * .05})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, y, W, h);
    }
    const horizon = 670;
    function skyline(baseY, minH, maxH, fill, windowAlpha, stepBase, windowPalette) {
        let x = -20;
        while (x < W + 20) {
            const bw = stepBase + rng() * stepBase * 1.6;
            const bh = minH + rng() * (maxH - minH);
            ctx.fillStyle = fill;
            ctx.fillRect(x, baseY - bh, bw, bh + 24);
            if (rng() < .35) {
                const inset = bw * (.16 + rng() * .2);
                ctx.fillRect(x + inset, baseY - bh - 12 - rng() * 24, bw - inset * 2, 40);
            }
            if (rng() < .22) {
                ctx.fillRect(x + bw * .46, baseY - bh - 18, 2, 20);
            }
            const wcw = 3 + rng() * 4;
            const wch = 3 + rng() * 5;
            const gapX = 7 + rng() * 7;
            const gapY = 7 + rng() * 8;
            for (let wy = baseY - bh + 12; wy < baseY - 10; wy += gapY) {
                for (let wx = x + 6; wx < x + bw - 6; wx += gapX) {
                    if (rng() < .44) {
                        const col = windowPalette[Math.floor(rng() * windowPalette.length)];
                        ctx.globalAlpha = windowAlpha * (.25 + rng() * .75);
                        ctx.fillStyle = col;
                        ctx.fillRect(wx, wy, wcw, wch);
                        ctx.globalAlpha = 1;
                    }
                }
            }
            x += bw + 2 + rng() * 8;
        }
    }
    skyline(horizon, 110, 340, "rgba(15,25,36,.92)", .24, 34, [ "#ffd18f", "#f4a75d", "#aacce5" ]);
    skyline(horizon + 34, 70, 250, "rgba(9,17,25,.98)", .52, 48, [ "#ffd59b", "#ffb976", "#e4f1ff" ]);
    skyline(horizon + 88, 45, 150, "rgba(5,10,15,1)", .72, 66, [ "#ffd7a0", "#ffb15c", "#bfe5ff" ]);
    const streetGlow = ctx.createLinearGradient(0, horizon + 80, 0, H);
    streetGlow.addColorStop(0, "rgba(255,178,104,.10)");
    streetGlow.addColorStop(.3, "rgba(255,139,70,.14)");
    streetGlow.addColorStop(1, "rgba(8,10,12,0)");
    ctx.fillStyle = streetGlow;
    ctx.fillRect(0, horizon + 60, W, H - horizon - 60);
    ctx.fillStyle = "#0a0d10";
    ctx.fillRect(0, H - 250, W, 250);
    for (let i = 0; i < 90; i++) {
        const x = rng() * W;
        const len = 20 + rng() * 150;
        const g = ctx.createLinearGradient(x, H - 240, x, H);
        const warm = rng() < .62;
        g.addColorStop(0, warm ? "rgba(255,179,104,.26)" : "rgba(142,194,243,.14)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x, H - 240, 1 + rng() * 3, len);
    }
    for (let i = 0; i < 26; i++) {
        const x = rng() * W;
        const y = H - 210 + rng() * 70;
        const r = 9 + rng() * 34;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, "rgba(255,190,118,.5)");
        g.addColorStop(.4, "rgba(255,151,76,.17)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const haze = ctx.createRadialGradient(W * .55, horizon + 10, 0, W * .55, horizon + 10, W * .5);
    haze.addColorStop(0, "rgba(255,173,102,.33)");
    haze.addColorStop(.36, "rgba(239,132,71,.14)");
    haze.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, W, H);
    return makeCanvasTexture(c, {
        srgb: true
    });
}

function lonLatToXY(lon, lat, w, h) {
    return [ (lon + 180) / 360 * w, (90 - lat) / 180 * h ];
}

function createGlobeTexture() {
    const W = 1600;
    const H = 800;
    const {canvas: c, ctx: ctx} = canvas2d(W, H);
    const rng = mulberry32(61409);
    const ocean = ctx.createLinearGradient(0, 0, 0, H);
    ocean.addColorStop(0, "#061321");
    ocean.addColorStop(.23, "#08213a");
    ocean.addColorStop(.52, "#0c3357");
    ocean.addColorStop(.76, "#071c33");
    ocean.addColorStop(1, "#040c18");
    ctx.fillStyle = ocean;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 55; i++) {
        const x = rng() * W;
        const y = rng() * H;
        const r = 30 + rng() * 190;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, rng() > .5 ? "rgba(32,98,156,.10)" : "rgba(2,10,19,.16)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.strokeStyle = "rgba(142,188,225,.075)";
    ctx.lineWidth = 1;
    for (let lon = -180; lon <= 180; lon += 30) {
        const [x] = lonLatToXY(lon, 0, W, H);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
    }
    for (let lat = -60; lat <= 60; lat += 30) {
        const [, y] = lonLatToXY(0, lat, W, H);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
    }
    const landmasses = [ [ [ -168, 71 ], [ -151, 70 ], [ -137, 69 ], [ -121, 72 ], [ -101, 72 ], [ -82, 74 ], [ -61, 61 ], [ -53, 48 ], [ -66, 44 ], [ -70, 41 ], [ -76, 35 ], [ -80, 25 ], [ -90, 18 ], [ -98, 18 ], [ -106, 27 ], [ -116, 32 ], [ -124, 41 ], [ -130, 52 ], [ -145, 58 ], [ -160, 61 ] ], [ [ -52, 82 ], [ -31, 82 ], [ -18, 74 ], [ -22, 65 ], [ -43, 59 ], [ -57, 67 ] ], [ [ -100, 18 ], [ -92, 15 ], [ -83, 9 ], [ -77, 8 ], [ -81, 15 ], [ -90, 20 ] ], [ [ -80, 10 ], [ -70, 12 ], [ -60, 8 ], [ -50, 3 ], [ -35, -5 ], [ -39, -18 ], [ -52, -31 ], [ -61, -42 ], [ -70, -54 ], [ -76, -47 ], [ -74, -31 ], [ -70, -18 ], [ -81, -4 ] ], [ [ -10, 71 ], [ 15, 72 ], [ 36, 71 ], [ 59, 73 ], [ 80, 74 ], [ 105, 74 ], [ 133, 72 ], [ 157, 68 ], [ 179, 64 ], [ 176, 53 ], [ 160, 51 ], [ 145, 44 ], [ 133, 34 ], [ 121, 21 ], [ 110, 4 ], [ 100, 3 ], [ 91, 17 ], [ 80, 8 ], [ 73, 21 ], [ 60, 24 ], [ 50, 28 ], [ 44, 37 ], [ 34, 40 ], [ 28, 36 ], [ 15, 37 ], [ 2, 43 ], [ -10, 43 ], [ -10, 58 ] ], [ [ -17, 35 ], [ 0, 37 ], [ 18, 35 ], [ 33, 32 ], [ 43, 12 ], [ 51, 12 ], [ 43, -2 ], [ 40, -15 ], [ 32, -27 ], [ 19, -35 ], [ 10, -32 ], [ 1, -15 ], [ -8, -4 ], [ -15, 10 ] ], [ [ 35, 30 ], [ 48, 30 ], [ 58, 23 ], [ 53, 15 ], [ 43, 12 ], [ 35, 20 ] ], [ [ 113, -11 ], [ 130, -12 ], [ 142, -11 ], [ 153, -25 ], [ 148, -37 ], [ 130, -34 ], [ 115, -25 ] ], [ [ 138, 37 ], [ 143, 43 ], [ 146, 38 ], [ 142, 32 ], [ 136, 33 ] ], [ [ 44, -12 ], [ 51, -16 ], [ 47, -25 ], [ 43, -22 ] ], [ [ -180, -72 ], [ -120, -70 ], [ -80, -72 ], [ -30, -69 ], [ 30, -70 ], [ 90, -68 ], [ 150, -72 ], [ 180, -70 ], [ 180, -90 ], [ -180, -90 ] ] ];
    function polygon(points) {
        ctx.beginPath();
        points.forEach(([lon, lat], i) => {
            const [x, y] = lonLatToXY(lon, lat, W, H);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.closePath();
    }
    const landGrad = ctx.createLinearGradient(0, H * .12, 0, H * .9);
    landGrad.addColorStop(0, "#87714a");
    landGrad.addColorStop(.25, "#c8a45e");
    landGrad.addColorStop(.52, "#8f6b38");
    landGrad.addColorStop(.76, "#c7a257");
    landGrad.addColorStop(1, "#604728");
    for (const land of landmasses) {
        polygon(land);
        ctx.fillStyle = landGrad;
        ctx.fill();
        ctx.strokeStyle = "rgba(245,215,153,.72)";
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.save();
        polygon(land);
        ctx.clip();
        for (let i = 0; i < 65; i++) {
            const x = rng() * W;
            const y = rng() * H;
            ctx.fillStyle = rng() > .5 ? "rgba(255,229,159,.11)" : "rgba(52,38,20,.17)";
            ctx.beginPath();
            ctx.arc(x, y, 4 + rng() * 28, 0, TAU);
            ctx.fill();
        }
        for (let i = 0; i < 22; i++) {
            const x = rng() * W;
            const y = rng() * H;
            ctx.strokeStyle = "rgba(48,35,17,.22)";
            ctx.lineWidth = 1 + rng() * 2;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.bezierCurveTo(x + rng() * 60, y + 15, x + rng() * 100, y - 20, x + rng() * 140, y + rng() * 30);
            ctx.stroke();
        }
        ctx.restore();
    }
    for (const land of landmasses) {
        polygon(land);
        ctx.strokeStyle = "rgba(255,221,157,.15)";
        ctx.lineWidth = 12;
        ctx.stroke();
    }
    for (let i = 0; i < 3200; i++) {
        const x = rng() * W;
        const y = rng() * H;
        const gold = rng() < .42;
        ctx.fillStyle = gold ? `rgba(255,226,164,${.06 + rng() * .18})` : `rgba(99,172,230,${.035 + rng() * .1})`;
        const s = .6 + rng() * 2;
        ctx.fillRect(x, y, s, s);
    }
    const shade = ctx.createLinearGradient(0, 0, W, 0);
    shade.addColorStop(0, "rgba(1,7,14,.06)");
    shade.addColorStop(.5, "rgba(1,7,14,.32)");
    shade.addColorStop(.78, "rgba(0,5,12,.56)");
    shade.addColorStop(1, "rgba(0,3,8,.12)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, W, H);
    return makeCanvasTexture(c, {
        srgb: true,
        repeat: true
    });
}

function createCaseTexture() {
    const W = 512;
    const H = 512;
    const rng = mulberry32(41117);
    const {canvas: c, ctx: ctx} = canvas2d(W, H);
    ctx.fillStyle = "#08090a";
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 7800; i++) {
        const v = 5 + rng() * 17;
        ctx.fillStyle = `rgba(${v},${v + 1},${v + 1},${.2 + rng() * .4})`;
        ctx.fillRect(rng() * W, rng() * H, .6 + rng() * 2.2, .6 + rng() * 2.2);
    }
    const sheen = ctx.createLinearGradient(0, 0, W, H);
    sheen.addColorStop(0, "rgba(73,83,91,.10)");
    sheen.addColorStop(.35, "rgba(13,16,19,.02)");
    sheen.addColorStop(.7, "rgba(54,63,70,.06)");
    sheen.addColorStop(1, "rgba(5,6,7,.20)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 30; i++) {
        ctx.strokeStyle = `rgba(169,177,184,${.025 + rng() * .055})`;
        ctx.lineWidth = .5 + rng() * 1.4;
        ctx.beginPath();
        const x = rng() * W;
        const y = rng() * H;
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rng() - .5) * 140, y + (rng() - .5) * 12);
        ctx.stroke();
    }
    ctx.fillStyle = "rgba(1,2,3,.9)";
    ctx.fillRect(W / 2 - 1.5, 0, 3, H);
    ctx.fillStyle = "rgba(104,112,119,.16)";
    ctx.fillRect(W / 2 + 1.5, 0, 1, H);
    return makeCanvasTexture(c, {
        srgb: true
    });
}

const caseShellTexture = createCaseTexture();

function createHazardTexture() {
    const {canvas: c, ctx: ctx} = canvas2d(512, 128);
    ctx.fillStyle = "#111214";
    ctx.fillRect(0, 0, 512, 128);
    ctx.save();
    ctx.translate(-64, 0);
    for (let x = -128; x < 768; x += 64) {
        ctx.fillStyle = "#c79939";
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 32, 0);
        ctx.lineTo(x - 8, 128);
        ctx.lineTo(x - 40, 128);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = "rgba(0,0,0,.25)";
    for (let i = 0; i < 900; i++) {
        ctx.fillRect(random() * 512, random() * 128, 1, 1);
    }
    return makeCanvasTexture(c, {
        repeat: true
    });
}

function createRampTexture() {
    const W = 1024;
    const H = 256;
    const rng = mulberry32(77412);
    const {canvas: c, ctx: ctx} = canvas2d(W, H);
    ctx.fillStyle = "#0b0c0d";
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 8500; i++) {
        const v = 5 + rng() * 22;
        ctx.fillStyle = `rgba(${v},${v + 1},${v + 2},${.18 + rng() * .4})`;
        const s = .5 + rng() * 2;
        ctx.fillRect(rng() * W, rng() * H, s, s);
    }
    for (const x of [ 0, W - 70 ]) {
        ctx.fillStyle = "#c59832";
        ctx.fillRect(x, 0, 70, H);
        ctx.fillStyle = "rgba(21,21,20,.55)";
        for (let y = -80; y < H + 80; y += 72) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + 70, y + 40);
            ctx.lineTo(x + 70, y + 72);
            ctx.lineTo(x, y + 32);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }
    for (let y = 10; y < H; y += 13) {
        ctx.fillStyle = "rgba(0,0,0,.34)";
        ctx.fillRect(84, y, W - 168, 2.5);
        ctx.fillStyle = "rgba(255,255,255,.045)";
        ctx.fillRect(84, y + 2.5, W - 168, 1.2);
    }
    for (let y = 4; y < H; y += 26) {
        for (let x = 96; x < W - 96; x += 18) {
            ctx.fillStyle = "rgba(146,143,132,.13)";
            ctx.beginPath();
            ctx.arc(x + (y % 52 === 4 ? 0 : 9), y + 5, 2.1, 0, TAU);
            ctx.fill();
        }
    }
    ctx.strokeStyle = "rgba(187,177,151,.25)";
    ctx.lineWidth = 2;
    ctx.strokeRect(108, 39, W - 216, H - 78);
    ctx.fillStyle = "rgba(210,197,171,.38)";
    ctx.font = "700 24px monospace";
    ctx.textAlign = "center";
    ctx.fillText("CABLE RAMP  ·  KEEP CLEAR", W / 2, H / 2 + 9);
    ctx.font = "13px monospace";
    ctx.fillStyle = "rgba(202,192,169,.28)";
    ctx.fillText("PARADE STAGING · HANGAR 07", W / 2, H / 2 + 35);
    ctx.textAlign = "left";
    for (let x = 35; x < W; x += 110) {
        ctx.fillStyle = "rgba(157,151,132,.25)";
        ctx.beginPath();
        ctx.arc(x, 20, 3, 0, TAU);
        ctx.arc(x, H - 20, 3, 0, TAU);
        ctx.fill();
    }
    return makeCanvasTexture(c, {
        srgb: true
    });
}

function createWoodTexture() {
    const W = 768;
    const H = 768;
    const rng = mulberry32(9121);
    const {canvas: c, ctx: ctx} = canvas2d(W, H);
    ctx.fillStyle = "#7a5a38";
    ctx.fillRect(0, 0, W, H);
    const planks = 8;
    const pw = W / planks;
    for (let p = 0; p < planks; p++) {
        const base = 83 + rng() * 35;
        ctx.fillStyle = `rgb(${base + 25},${base + 2},${base - 24})`;
        ctx.fillRect(p * pw, 0, pw - 1, H);
        ctx.fillStyle = "rgba(25,14,7,.72)";
        ctx.fillRect(p * pw + pw - 3, 0, 3, H);
        ctx.fillStyle = "rgba(255,224,181,.06)";
        ctx.fillRect(p * pw + 2, 0, 1.5, H);
        for (let g = 0; g < 32; g++) {
            const x = p * pw + 8 + rng() * (pw - 18);
            const amp = 5 + rng() * 16;
            ctx.strokeStyle = `rgba(52,32,16,${.08 + rng() * .13})`;
            ctx.lineWidth = .6 + rng() * 1.2;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            for (let y = 0; y < H; y += 30) {
                ctx.lineTo(x + Math.sin(y * .01 + g) * amp, y);
            }
            ctx.stroke();
        }
        if (rng() < .5) {
            const kx = p * pw + pw * .5 + (rng() - .5) * pw * .4;
            const ky = rng() * H;
            for (let r = 3; r < 16; r += 3) {
                ctx.strokeStyle = `rgba(45,27,13,${.32 - r * .012})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.ellipse(kx, ky, r, r * .42, .2, 0, TAU);
                ctx.stroke();
            }
        }
    }
    for (let i = 0; i < 2200; i++) {
        ctx.fillStyle = rng() > .5 ? "rgba(237,207,164,.06)" : "rgba(22,13,6,.1)";
        ctx.fillRect(rng() * W, rng() * H, 1 + rng() * 2, 1 + rng() * 2);
    }
    return makeCanvasTexture(c, {
        srgb: true,
        repeat: true
    });
}

function createBannerTexture() {
    const W = 512;
    const H = 1280;
    const {canvas: c, ctx: ctx} = canvas2d(W, H);
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#821a28");
    g.addColorStop(.32, "#be2432");
    g.addColorStop(.52, "#a51a28");
    g.addColorStop(.72, "#c32a34");
    g.addColorStop(1, "#6d1220");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 12; i++) {
        const x = i * (W / 12);
        const grad = ctx.createLinearGradient(x, 0, x + 40, 0);
        grad.addColorStop(0, "rgba(0,0,0,.16)");
        grad.addColorStop(.55, "rgba(255,255,255,.035)");
        grad.addColorStop(1, "rgba(0,0,0,.08)");
        ctx.fillStyle = grad;
        ctx.fillRect(x, 0, 42, H);
    }
    const fade = ctx.createLinearGradient(0, 0, 0, H);
    fade.addColorStop(0, "rgba(0,0,0,.22)");
    fade.addColorStop(.3, "rgba(0,0,0,0)");
    fade.addColorStop(.8, "rgba(0,0,0,0)");
    fade.addColorStop(1, "rgba(0,0,0,.3)");
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, 178);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5;
        const r = i % 2 === 0 ? 72 : 31;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(247,241,229,.94)";
    ctx.fill();
    ctx.restore();
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(247,241,229,.95)";
    ctx.font = '700 94px "Arial Narrow", Arial, sans-serif';
    ctx.letterSpacing = "4px";
    ctx.fillText("PARADE", W / 2, 400);
    ctx.font = '300 74px "Arial Narrow", Arial, sans-serif';
    ctx.fillText("NIGHT", W / 2, 492);
    ctx.fillText("CREW", W / 2, 570);
    ctx.strokeStyle = "rgba(247,241,229,.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(110, 632);
    ctx.lineTo(W - 110, 632);
    ctx.stroke();
    ctx.font = "600 31px monospace";
    ctx.fillStyle = "rgba(247,241,229,.86)";
    ctx.fillText("STAGING 07", W / 2, 700);
    ctx.font = "21px monospace";
    ctx.fillStyle = "rgba(247,241,229,.58)";
    ctx.fillText("ONE NIGHT TO GO", W / 2, 745);
    ctx.fillText("04:37 AM", W / 2, 784);
    ctx.font = "17px monospace";
    ctx.fillStyle = "rgba(247,241,229,.4)";
    ctx.fillText("DO NOT REMOVE", W / 2, 1160);
    for (const y of [ 34, H - 34 ]) {
        ctx.fillStyle = "#241c1c";
        ctx.beginPath();
        ctx.arc(30, y, 10, 0, TAU);
        ctx.arc(W - 30, y, 10, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "rgba(213,207,190,.5)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(30, y, 10, 0, TAU);
        ctx.arc(W - 30, y, 10, 0, TAU);
        ctx.stroke();
    }
    return makeCanvasTexture(c, {
        srgb: true
    });
}

function createLabelTexture(text, sub) {
    const W = 512;
    const H = 256;
    const {canvas: c, ctx: ctx} = canvas2d(W, H);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(244,239,226,.9)";
    ctx.font = '700 48px "Arial Narrow", Arial, sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(text, W / 2, 105);
    ctx.fillStyle = "rgba(244,239,226,.58)";
    ctx.font = "25px monospace";
    ctx.fillText(sub, W / 2, 154);
    ctx.strokeStyle = "rgba(244,239,226,.4)";
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 18, W - 36, H - 36);
    return makeCanvasTexture(c, {
        srgb: true
    });
}

function createWarningTexture() {
    const {canvas: c, ctx: ctx} = canvas2d(512, 256);
    ctx.fillStyle = "#c9a02e";
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.moveTo(256, 30);
    ctx.lineTo(438, 214);
    ctx.lineTo(74, 214);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#c9a02e";
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.fillStyle = "#111";
    ctx.font = '900 106px "Arial Narrow", Arial, sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("!", 256, 185);
    ctx.fillStyle = "#111";
    ctx.font = '700 38px "Arial Narrow", Arial, sans-serif';
    ctx.fillText("DANGER", 256, 248);
    return makeCanvasTexture(c, {
        srgb: true
    });
}

function createStencilTexture() {
    const W = 512;
    const H = 256;
    const {canvas: c, ctx: ctx} = canvas2d(W, H);
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(225,221,207,.82)";
    ctx.lineWidth = 5;
    ctx.strokeRect(24, 24, W - 48, H - 48);
    ctx.fillStyle = "rgba(225,221,207,.86)";
    ctx.font = '700 46px "Arial Narrow", Arial, sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("ALGORITHM", W / 2, 106);
    ctx.font = "27px monospace";
    ctx.fillText("FLOAT 19 / PARADE OPS", W / 2, 152);
    ctx.font = "20px monospace";
    ctx.fillStyle = "rgba(225,221,207,.55)";
    ctx.fillText("HANDLE WITH CARE  ·  STAGING 07", W / 2, 192);
    return makeCanvasTexture(c, {
        srgb: true
    });
}

function createScreenCanvas() {
    const W = 512;
    const H = 288;
    const {canvas: c, ctx: ctx} = canvas2d(W, H);
    return {
        canvas: c,
        ctx: ctx,
        W: W,
        H: H
    };
}

function buildEnvironment() {
    const envScene = new THREE.Scene;
    const room = new THREE.Mesh(new THREE.BoxGeometry(26, 16, 26), new THREE.MeshBasicMaterial({
        color: 462873,
        side: THREE.BackSide
    }));
    room.position.y = 4;
    envScene.add(room);
    const panel = (w, h, color, intensity, x, y, z, rx = 0, ry = 0, rz = 0) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({
            color: new THREE.Color(color).multiplyScalar(intensity),
            side: THREE.DoubleSide
        }));
        m.position.set(x, y, z);
        m.rotation.set(rx, ry, rz);
        envScene.add(m);
    };
    panel(13, 1.1, 13625087, 4.2, 0, 10.6, 2, Math.PI / 2, 0, 0);
    panel(1.1, 10, 12048639, 2.6, -9, 4.2, -4, 0, Math.PI / 2, 0);
    panel(4, 5, 16752209, 1.5, 12.4, 2.4, -4, 0, -Math.PI / 2, 0);
    panel(3, 3, 2977791, .6, 0, .4, -12.8, 0, 0, 0);
    panel(6, 1.4, 14544639, 2.1, 1, 7.8, -12.6, 0, 0, 0);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(25, 25), new THREE.MeshBasicMaterial({
        color: new THREE.Color(1054237).multiplyScalar(.7),
        side: THREE.DoubleSide
    }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -3.8;
    envScene.add(floor);
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const target = pmrem.fromScene(envScene, .035, .1, 80);
    scene.environment = target.texture;
    scene.environmentIntensity = .42;
    pmrem.dispose();
    envScene.traverse(o => {
        if (o.isMesh) {
            o.geometry.dispose();
            o.material.dispose();
        }
    });
}

buildEnvironment();

const concreteTexture = createConcreteTexture();

const rackTextureVariants = [ createRackPanelTextures(101), createRackPanelTextures(207), createRackPanelTextures(313) ];

const circuitTexture = createCircuitTexture();

const cityTexture = createCityTexture();

const globeTexture = createGlobeTexture();

const hazardTexture = createHazardTexture();

const rampTexture = createRampTexture();

const woodTexture = createWoodTexture();

const bannerTexture = createBannerTexture();

const stencilTexture = createStencilTexture();

const warningTexture = createWarningTexture();

const caseLabelTexture = createLabelTexture("AUDIO / 04", "PARADE OPS · HANGAR 7");

const hazardTextureDoor = hazardTexture.clone();

hazardTextureDoor.needsUpdate = true;

hazardTextureDoor.repeat.set(1.3, 1);

const wallMap = concreteTexture.clone();

wallMap.repeat.set(3.2, 2.2);

wallMap.needsUpdate = true;

const backWallMap = concreteTexture.clone();

backWallMap.repeat.set(4.6, 2);

backWallMap.needsUpdate = true;

function createCableRibTexture() {
    const {canvas: c, ctx: ctx} = canvas2d(128, 48);
    ctx.fillStyle = "#7c7c7c";
    ctx.fillRect(0, 0, 128, 48);
    for (let x = 0; x < 128; x += 8) {
        const g = ctx.createLinearGradient(x, 0, x + 8, 0);
        g.addColorStop(0, "rgba(40,40,40,.55)");
        g.addColorStop(.45, "rgba(155,155,155,.25)");
        g.addColorStop(1, "rgba(60,60,60,.4)");
        ctx.fillStyle = g;
        ctx.fillRect(x, 0, 8, 48);
    }
    const t = makeCanvasTexture(c, {
        repeat: true
    });
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(10, 1);
    return t;
}

const cableRibTexture = createCableRibTexture();

const M = {
    black: new THREE.MeshStandardMaterial({
        color: 395274,
        metalness: .62,
        roughness: .42
    }),
    softBlack: new THREE.MeshStandardMaterial({
        color: 658447,
        metalness: .2,
        roughness: .78
    }),
    blackRubber: new THREE.MeshStandardMaterial({
        color: 526603,
        metalness: .04,
        roughness: .68
    }),
    darkSteel: new THREE.MeshStandardMaterial({
        color: 1514529,
        metalness: .88,
        roughness: .33
    }),
    midSteel: new THREE.MeshStandardMaterial({
        color: 3752522,
        metalness: .92,
        roughness: .36,
        envMapIntensity: .8
    }),
    steel: new THREE.MeshStandardMaterial({
        color: 7305860,
        metalness: 1,
        roughness: .32,
        envMapIntensity: .8
    }),
    silver: new THREE.MeshStandardMaterial({
        color: 11976390,
        metalness: 1,
        roughness: .24,
        envMapIntensity: .9
    }),
    chrome: new THREE.MeshPhysicalMaterial({
        color: 15791352,
        metalness: 1,
        roughness: .075,
        clearcoat: 1,
        clearcoatRoughness: .05
    }),
    cableSilver: new THREE.MeshStandardMaterial({
        color: 7568775,
        metalness: .94,
        roughness: .36,
        envMapIntensity: .65,
        bumpMap: cableRibTexture,
        bumpScale: .006
    }),
    cableBlue: new THREE.MeshStandardMaterial({
        color: 397865,
        metalness: .91,
        roughness: .39,
        envMapIntensity: .5
    }),
    cableBlueBright: new THREE.MeshStandardMaterial({
        color: 531785,
        metalness: .9,
        roughness: .38,
        envMapIntensity: .55
    }),
    cableNavy: new THREE.MeshStandardMaterial({
        color: 331819,
        metalness: .85,
        roughness: .4,
        envMapIntensity: .55
    }),
    cableGrey: new THREE.MeshStandardMaterial({
        color: 3423300,
        metalness: .86,
        roughness: .43,
        envMapIntensity: .45,
        bumpMap: cableRibTexture,
        bumpScale: .005
    }),
    cableSilverHero: new THREE.MeshStandardMaterial({
        color: 10661045,
        metalness: .95,
        roughness: .29,
        envMapIntensity: 1.05,
        bumpMap: cableRibTexture,
        bumpScale: .007
    }),
    cableBlueHero: new THREE.MeshStandardMaterial({
        color: 797803,
        metalness: .9,
        roughness: .34,
        envMapIntensity: .8
    }),
    orange: new THREE.MeshStandardMaterial({
        color: 15687708,
        metalness: .08,
        roughness: .44,
        emissive: 2230274,
        emissiveIntensity: .35
    }),
    orangeDark: new THREE.MeshStandardMaterial({
        color: 11878162,
        metalness: .1,
        roughness: .5,
        emissive: 1311745,
        emissiveIntensity: .25
    }),
    whitePaint: new THREE.MeshPhysicalMaterial({
        color: 15198693,
        metalness: .14,
        roughness: .29,
        clearcoat: .6,
        clearcoatRoughness: .15
    }),
    warmWhitePaint: new THREE.MeshStandardMaterial({
        color: 13617075,
        metalness: .05,
        roughness: .66
    }),
    navyPaint: new THREE.MeshStandardMaterial({
        color: 464168,
        metalness: .48,
        roughness: .38
    }),
    bluePaint: new THREE.MeshStandardMaterial({
        color: 731248,
        metalness: .3,
        roughness: .42
    }),
    gold: new THREE.MeshStandardMaterial({
        color: 10845494,
        metalness: .95,
        roughness: .27
    }),
    wood: new THREE.MeshStandardMaterial({
        map: woodTexture,
        color: 16777215,
        metalness: .02,
        roughness: .73
    }),
    woodTrim: new THREE.MeshStandardMaterial({
        map: woodTexture,
        color: 13221289,
        metalness: .02,
        roughness: .79
    }),
    wall: new THREE.MeshStandardMaterial({
        map: wallMap,
        color: 9014414,
        metalness: .24,
        roughness: .8
    }),
    backWall: new THREE.MeshStandardMaterial({
        map: backWallMap,
        color: 8619914,
        metalness: .32,
        roughness: .75
    }),
    roof: new THREE.MeshStandardMaterial({
        color: 1711909,
        metalness: .65,
        roughness: .52
    }),
    truss: new THREE.MeshStandardMaterial({
        color: 6778999,
        metalness: .7,
        roughness: .54,
        emissive: 1581354,
        emissiveIntensity: .5
    }),
    trussRust: new THREE.MeshStandardMaterial({
        color: 5061421,
        metalness: .64,
        roughness: .6,
        emissive: 525828,
        emissiveIntensity: .3
    }),
    reflectorMetal: new THREE.MeshStandardMaterial({
        color: 12105131,
        metalness: .82,
        roughness: .29,
        emissive: 855307,
        emissiveIntensity: .3
    }),
    ramp: new THREE.MeshStandardMaterial({
        map: rampTexture,
        color: 16777215,
        metalness: .05,
        roughness: .66
    }),
    hazard: new THREE.MeshStandardMaterial({
        map: hazardTexture,
        color: 16777215,
        metalness: .1,
        roughness: .56
    }),
    shedInterior: new THREE.MeshStandardMaterial({
        color: 3877142,
        metalness: .06,
        roughness: .74
    })
};

function makeRackFrontMaterial(variant) {
    const t = rackTextureVariants[variant % rackTextureVariants.length];
    return new THREE.MeshBasicMaterial({
        map: t.map,
        color: 15133422
    });
}

const rackFronts = [ makeRackFrontMaterial(0), makeRackFrontMaterial(1), makeRackFrontMaterial(2) ];

const rackBack = new THREE.MeshBasicMaterial({
    color: 197895
});

const rackSide = new THREE.MeshBasicMaterial({
    color: 263946
});

const lighting = {
    overhead: [],
    warm: [],
    hemi: null,
    ambient: null,
    key: null,
    rim: null,
    doorFill: null,
    shed: null,
    filler: null
};

function createLightTarget(x, y, z) {
    const t = new THREE.Object3D;
    t.position.set(x, y, z);
    scene.add(t);
    return t;
}

function buildLighting() {
    lighting.hemi = new THREE.HemisphereLight(9675957, 1712166, .66);
    scene.add(lighting.hemi);
    lighting.ambient = new THREE.AmbientLight(3555918, .5);
    scene.add(lighting.ambient);
    const lampSpecs = [ {
        x: -2.4,
        y: 16.6,
        z: 4.2,
        tx: .5,
        tz: 1.4,
        i: 1500,
        color: 15265525,
        shadow: true,
        angle: .68
    }, {
        x: 9.8,
        y: 16.1,
        z: -4.8,
        tx: 7.4,
        tz: -3,
        i: 850,
        color: 14673903,
        shadow: false,
        angle: .62
    }, {
        x: -12.2,
        y: 15.7,
        z: -7.4,
        tx: -8.8,
        tz: -5.4,
        i: 650,
        color: 13424867,
        shadow: false,
        angle: .62
    }, {
        x: 7.2,
        y: 15.2,
        z: -21,
        tx: 8.2,
        tz: -17,
        i: 550,
        color: 14213868,
        shadow: false,
        angle: .68
    } ];
    for (const spec of lampSpecs) {
        const target = createLightTarget(spec.tx, .5, spec.tz);
        const spot = new THREE.SpotLight(spec.color, spec.i, 52, spec.angle, .82, 1.45);
        spot.position.set(spec.x, spec.y, spec.z);
        spot.target = target;
        spot.castShadow = spec.shadow;
        if (spec.shadow) {
            spot.shadow.mapSize.set(2048, 2048);
            spot.shadow.camera.near = 3;
            spot.shadow.camera.far = 40;
            spot.shadow.bias = -25e-5;
            spot.shadow.normalBias = .025;
            spot.shadow.radius = 3;
        }
        scene.add(spot);
        lighting.overhead.push({
            light: spot,
            base: spec.i,
            cold: new THREE.Color(spec.color),
            warm: new THREE.Color(16764314)
        });
        if (spec.shadow) lighting.key = spot;
    }
    lighting.rim = new THREE.SpotLight(13886193, 188, 26, .74, .9, 1.3);
    lighting.rim.position.set(1.6, 4.1, 9.6);
    lighting.rim.target = createLightTarget(-.6, 2.4, -1.8);
    scene.add(lighting.rim);
    const blueAccent = new THREE.PointLight(3108863, 26, 9, 1.7);
    blueAccent.position.set(1, .72, .4);
    scene.add(blueAccent);
    lighting.blueAccent = blueAccent;
    const doorTarget = createLightTarget(3.5, .3, .5);
    lighting.doorFill = new THREE.SpotLight(16753758, 650, 62, .57, .9, 1.32);
    lighting.doorFill.position.set(16.5, 8.6, -30);
    lighting.doorFill.target = doorTarget;
    scene.add(lighting.doorFill);
    const outsideGlow = new THREE.PointLight(16751696, 125, 34, 1.55);
    outsideGlow.position.set(17, 3.4, -31);
    scene.add(outsideGlow);
    lighting.outsideGlow = outsideGlow;
    lighting.shed = new THREE.PointLight(16757351, 58, 10, 1.7);
    lighting.shed.position.set(9.4, 2.2, -6.2);
    scene.add(lighting.shed);
    const rackFillTarget = createLightTarget(-.4, 5.1, -3.3);
    const rackFill = new THREE.SpotLight(13689070, 330, 32, .46, .95, 1.55);
    rackFill.position.set(-5.4, 6.8, 8.2);
    rackFill.target = rackFillTarget;
    scene.add(rackFill);
    lighting.rackFill = rackFill;
    const wallWashTarget = createLightTarget(-2, 8, -33);
    const wallWash = new THREE.SpotLight(10927309, 700, 60, .82, 1, 1.5);
    wallWash.position.set(0, 14, -6);
    wallWash.target = wallWashTarget;
    scene.add(wallWash);
    lighting.wallWash = wallWash;
    const roofWashA = new THREE.SpotLight(10663881, 1050, 42, .72, 1, 1.5);
    roofWashA.position.set(-10.5, 4.8, -8);
    roofWashA.target = createLightTarget(-8, 18, -15);
    scene.add(roofWashA);
    const roofWashB = new THREE.SpotLight(10795209, 820, 42, .7, 1, 1.5);
    roofWashB.position.set(9, 5.4, -13);
    roofWashB.target = createLightTarget(10, 18, -21);
    scene.add(roofWashB);
    lighting.roofWashA = roofWashA;
    lighting.roofWashB = roofWashB;
    const propKick = new THREE.SpotLight(13951726, 175, 20, .5, .95, 1.5);
    propKick.position.set(.8, 4.2, 13);
    propKick.target = createLightTarget(-5, 1.1, 6.4);
    scene.add(propKick);
    lighting.propKick = propKick;
    const ladderLight = new THREE.SpotLight(16770250, 95, 20, .31, .95, 1.6);
    ladderLight.position.set(4.6, 4.8, 12.6);
    ladderLight.target = createLightTarget(.5, 1.5, 7.2);
    scene.add(ladderLight);
    lighting.ladder = ladderLight;
    const floatWash = new THREE.SpotLight(13492207, 560, 38, .66, .88, 1.35);
    floatWash.position.set(-4.8, 10.5, 11.5);
    floatWash.target = createLightTarget(-.2, 6, -4);
    scene.add(floatWash);
    lighting.floatWash = floatWash;
    const backRim = new THREE.SpotLight(11522802, 1150, 52, .94, .92, 1.35);
    backRim.position.set(-9.5, 12.5, -19);
    backRim.target = createLightTarget(.4, 7, .5);
    scene.add(backRim);
    lighting.backRim = backRim;
    const warmRim = new THREE.SpotLight(16757624, 360, 40, .88, 1, 1.45);
    warmRim.position.set(9.5, 9, -16.5);
    warmRim.target = createLightTarget(-.5, 5, 0);
    scene.add(warmRim);
    lighting.warmRim = warmRim;
    lighting.filler = new THREE.DirectionalLight(9546179, .7);
    lighting.filler.position.set(-13, 12, 18);
    scene.add(lighting.filler);
    const globeKick = new THREE.PointLight(10470376, 40, 13, 1.8);
    globeKick.position.set(-7, 5.4, 5);
    scene.add(globeKick);
    lighting.globeKick = globeKick;
}

buildLighting();

let floorReflector = null;

let floorOverlayMaterial = null;

let ceilingStripMaterial = null;

const lampGlowMaterials = [];

const lightShaftMaterials = [];

const WARMTH = {
    coldOverhead: new THREE.Color(13821183),
    warmOverhead: new THREE.Color(16763800),
    coldSky: new THREE.Color(6454686),
    warmSky: new THREE.Color(9401700),
    coldGround: new THREE.Color(1052691),
    warmGround: new THREE.Color(1774609),
    coldBg: new THREE.Color(461842),
    warmBg: new THREE.Color(789778),
    coldFog: new THREE.Color(725273),
    warmFog: new THREE.Color(1381142),
    coldRim: new THREE.Color(12572927),
    warmRim: new THREE.Color(16760709),
    coldReflection: new THREE.Color(6910844),
    warmReflection: new THREE.Color(9205606),
    coldAmbient: new THREE.Color(2306371),
    warmAmbient: new THREE.Color(4862757),
    coldWall: new THREE.Color(10927309),
    warmWall: new THREE.Color(14858123),
    coldRoof: new THREE.Color(10663881),
    warmRoof: new THREE.Color(15056275),
    coldFloat: new THREE.Color(13492207),
    warmFloat: new THREE.Color(16762778),
    coldRackFill: new THREE.Color(13689070),
    warmRackFill: new THREE.Color(16759172),
    coldBackRim: new THREE.Color(11522802),
    warmBackRim: new THREE.Color(14071189),
    coldFiller: new THREE.Color(9546179),
    warmFiller: new THREE.Color(14264446),
    coldFloor: new THREE.Color(9868172),
    warmFloor: new THREE.Color(11768693),
    coldStrip: new THREE.Color(13821174),
    warmStrip: new THREE.Color(16765088)
};

function updateWarmth(t) {
    const k = smooth(clamp(t, 0, 1));
    for (const entry of lighting.overhead) {
        entry.light.color.copy(entry.cold).lerp(entry.warm, k);
        entry.light.intensity = entry.base * (.94 + k * .27);
    }
    lighting.hemi.color.copy(WARMTH.coldSky).lerp(WARMTH.warmSky, k * .95);
    lighting.hemi.groundColor.copy(WARMTH.coldGround).lerp(WARMTH.warmGround, k);
    lighting.hemi.intensity = .66 + k * .2;
    lighting.ambient.color.copy(WARMTH.coldAmbient).lerp(WARMTH.warmAmbient, k);
    lighting.ambient.intensity = .5 + k * .2;
    lighting.rim.color.copy(WARMTH.coldRim).lerp(WARMTH.warmRim, k);
    lighting.rim.intensity = 188 + k * 140;
    lighting.blueAccent.intensity = 26 * (1 - k) + 4 * k;
    lighting.doorFill.intensity = 560 + k * 460;
    lighting.doorFill.color.set(16753758).lerp(new THREE.Color(16760192), k);
    lighting.outsideGlow.intensity = 125 + k * 100;
    lighting.shed.intensity = 58 + k * 35;
    lighting.globeKick.intensity = 45 + k * 25;
    lighting.globeKick.color.set(10470376).lerp(new THREE.Color(16762252), k);
    if (lighting.rackFill) {
        lighting.rackFill.intensity = 330 + k * 240;
        lighting.rackFill.color.copy(WARMTH.coldRackFill).lerp(WARMTH.warmRackFill, k);
    }
    if (lighting.boardLight) {
        lighting.boardLight.intensity = 95 + k * 35;
        lighting.boardLight.color.set(11127272).lerp(new THREE.Color(16761486), k);
    }
    if (lighting.propKick) {
        lighting.propKick.intensity = 175 + k * 55;
        lighting.propKick.color.set(13951726).lerp(new THREE.Color(16764836), k);
    }
    if (lighting.ladder) {
        lighting.ladder.intensity = 95 + k * 45;
        lighting.ladder.color.set(16770250).lerp(new THREE.Color(16760716), k);
    }
    if (lighting.floatWash) {
        lighting.floatWash.intensity = 560 + k * 360;
        lighting.floatWash.color.copy(WARMTH.coldFloat).lerp(WARMTH.warmFloat, k);
    }
    if (lighting.backRim) {
        lighting.backRim.intensity = 1150 - k * 820;
        lighting.backRim.color.copy(WARMTH.coldBackRim).lerp(WARMTH.warmBackRim, k);
    }
    if (lighting.warmRim) {
        lighting.warmRim.intensity = 360 + k * 620;
        lighting.warmRim.color.set(16757624).lerp(new THREE.Color(16761484), k);
    }
    if (lighting.roofWashA) {
        lighting.roofWashA.intensity = 1050 + k * 280;
        lighting.roofWashA.color.copy(WARMTH.coldRoof).lerp(WARMTH.warmRoof, k);
    }
    if (lighting.roofWashB) {
        lighting.roofWashB.intensity = 820 + k * 220;
        lighting.roofWashB.color.copy(WARMTH.coldRoof).lerp(WARMTH.warmRoof, k);
    }
    if (lighting.wallWash) {
        lighting.wallWash.intensity = 700 + k * 220;
        lighting.wallWash.color.copy(WARMTH.coldWall).lerp(WARMTH.warmWall, k);
    }
    if (lighting.filler) {
        lighting.filler.color.copy(WARMTH.coldFiller).lerp(WARMTH.warmFiller, k);
        lighting.filler.intensity = .7 + k * .55;
    }
    scene.background.copy(WARMTH.coldBg).lerp(WARMTH.warmBg, k);
    scene.fog.color.copy(WARMTH.coldFog).lerp(WARMTH.warmFog, k);
    renderer.toneMappingExposure = .86 + k * .05;
    if (floorReflector) {
        floorReflector.material.uniforms.color.value.copy(WARMTH.coldReflection).lerp(WARMTH.warmReflection, k);
    }
    if (floorOverlayMaterial) {
        floorOverlayMaterial.color.copy(WARMTH.coldFloor).lerp(WARMTH.warmFloor, k);
    }
    if (ceilingStripMaterial) {
        ceilingStripMaterial.color.copy(WARMTH.coldStrip).multiplyScalar(1.55).lerp(WARMTH.warmStrip.clone().multiplyScalar(1.6), k);
    }
    if (scene.environmentIntensity !== undefined) scene.environmentIntensity = .42 + k * .07;
    if (lampGlowMaterials.length) {
        for (const g of lampGlowMaterials) {
            g.color.copy(WARMTH.coldOverhead).lerp(WARMTH.warmOverhead, k).multiplyScalar(1.7);
        }
    }
    if (warmthState) {
        warmthState.textContent = k < .22 ? "COLD WORK WASH" : k < .55 ? "MIXED CREW LIGHT" : k < .82 ? "WARM REHEARSAL" : "PRE-DAWN GLOW";
        warmthState.style.color = k < .22 ? "#cbd8e3" : k < .55 ? "#cfd2cf" : "#e6bd92";
    }
    document.documentElement.style.setProperty("--warm-mix", String(k));
}

updateWarmth(state.warmth);

const world = new THREE.Group;

world.name = "Hangar & float";

scene.add(world);

function buildFloor() {
    const reflectorGeo = new THREE.PlaneGeometry(120, 118);
    floorReflector = new Reflector(reflectorGeo, {
        clipBias: .003,
        textureWidth: 1024,
        textureHeight: 720,
        color: 8095117,
        multisample: 0
    });
    floorReflector.rotation.x = -Math.PI / 2;
    floorReflector.position.set(0, -.006, -10);
    floorReflector.name = "Polished concrete — planar reflection";
    world.add(floorReflector);
    const floorMat = new THREE.MeshPhysicalMaterial({
        map: concreteTexture,
        bumpMap: concreteTexture,
        bumpScale: .018,
        color: 9868172,
        metalness: .13,
        roughness: .6,
        clearcoat: .26,
        clearcoatRoughness: .38,
        transparent: true,
        opacity: .54,
        depthWrite: false,
        envMapIntensity: .35
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 118), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, .004, -10);
    floor.receiveShadow = true;
    floor.renderOrder = 1;
    world.add(floor);
    world.userData.floorMaterial = floorMat;
    floorOverlayMaterial = floorMat;
    const seamMat = new THREE.MeshBasicMaterial({
        color: 2566957,
        transparent: true,
        opacity: .3,
        depthWrite: false
    });
    for (let z = -66; z < 45; z += 9.2) {
        const seam = new THREE.Mesh(new THREE.PlaneGeometry(114, .034), seamMat);
        seam.rotation.x = -Math.PI / 2;
        seam.position.set(0, .011, z);
        seam.renderOrder = 2;
        world.add(seam);
    }
    for (let x = -55; x < 55; x += 11.5) {
        const seam = new THREE.Mesh(new THREE.PlaneGeometry(.032, 112), seamMat);
        seam.rotation.x = -Math.PI / 2;
        seam.position.set(x, .0113, -10);
        seam.renderOrder = 2;
        world.add(seam);
    }
    const markCanvas = canvas2d(1024, 256);
    markCanvas.ctx.clearRect(0, 0, 1024, 256);
    markCanvas.ctx.strokeStyle = "rgba(198,178,123,.22)";
    markCanvas.ctx.lineWidth = 9;
    markCanvas.ctx.strokeRect(12, 12, 1e3, 232);
    markCanvas.ctx.fillStyle = "rgba(198,178,123,.2)";
    markCanvas.ctx.font = '700 100px "Arial Narrow", Arial, sans-serif';
    markCanvas.ctx.textAlign = "center";
    markCanvas.ctx.fillText("FLOAT 19", 512, 126);
    markCanvas.ctx.font = "36px monospace";
    markCanvas.ctx.fillStyle = "rgba(198,178,123,.13)";
    markCanvas.ctx.fillText("STAGING · BAY 03", 512, 190);
    const markTex = makeCanvasTexture(markCanvas.canvas);
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 2.05), new THREE.MeshBasicMaterial({
        map: markTex,
        transparent: true,
        opacity: .82,
        depthWrite: false
    }));
    mark.rotation.x = -Math.PI / 2;
    mark.rotation.z = .09;
    mark.position.set(10.5, .014, 3.4);
    mark.renderOrder = 2;
    world.add(mark);
    addContactShadow(world, .1, 6.8, 4.5, 2.8, .14);
    addContactShadow(world, -4.9, 6.6, 5.4, 3.3, .25);
    addContactShadow(world, -1, -.1, 18.2, 4.4, .19);
    addContactShadow(world, 9.2, -5.6, 6.5, 4, .22);
}

function buildHangar() {
    const group = new THREE.Group;
    group.name = "Hangar shell";
    world.add(group);
    addBox(group, 38, 23.8, .8, M.backWall, -11, 11.9, -34.2);
    addBox(group, 5.2, 23.8, .8, M.backWall, 27.6, 11.9, -34.2);
    addBox(group, 17.2, 9.8, .8, M.backWall, 16.6, 19.1, -34.2);
    addBox(group, 60.5, .55, .95, M.softBlack, 0, .275, -33.9);
    addBox(group, 60.5, .42, .95, M.darkSteel, 0, 13.9, -33.9);
    addBox(group, .8, 23.8, 60, M.wall, -30.2, 11.9, -4);
    addBox(group, .8, 23.8, 60, M.wall, 30.2, 11.9, -4);
    const roof = new THREE.Mesh(new THREE.PlaneGeometry(61, 60), M.roof);
    roof.rotation.x = Math.PI / 2;
    roof.position.set(0, 24.1, -4);
    roof.receiveShadow = true;
    group.add(roof);
    for (const x of [ -27.2, -20.4, -13.6, -6.8, .4, 26.1 ]) {
        addBox(group, .52, 18.4, .66, M.darkSteel, x, 9.2, -33.6);
        addBox(group, .42, .35, .9, M.truss, x, 11.4, -33.35);
        addBox(group, .42, .35, .9, M.truss, x, 6.8, -33.35);
    }
    for (const z of [ 8.5, -7.5, -23.5 ]) {
        addBox(group, .86, 23.5, .75, M.darkSteel, -29.4, 11.75, z);
        addBox(group, .86, 23.5, .75, M.darkSteel, 29.4, 11.75, z);
        addBox(group, .14, 2.5, 1.2, M.truss, -28.9, 14.2, z);
        addBox(group, .14, 2.5, 1.2, M.truss, 28.9, 14.2, z);
    }
    addBox(group, .72, 14.2, 1.35, M.darkSteel, 7.72, 7.1, -33.8);
    addBox(group, .72, 14.2, 1.35, M.darkSteel, 25.48, 7.1, -33.8);
    addBox(group, 18.5, .78, 1.35, M.darkSteel, 16.6, 13.9, -33.8);
    addBox(group, .12, 13.2, .08, M.steel, 8.12, 6.6, -33.05);
    addBox(group, .12, 13.2, .08, M.steel, 25.08, 6.6, -33.05);
    const hazardJamb = new THREE.Mesh(new THREE.PlaneGeometry(.46, 2.7), new THREE.MeshStandardMaterial({
        map: hazardTexture,
        roughness: .58,
        metalness: .08
    }));
    hazardJamb.position.set(7.72, 1.4, -33.01);
    group.add(hazardJamb);
    const hazardJamb2 = hazardJamb.clone();
    hazardJamb2.position.x = 25.48;
    group.add(hazardJamb2);
    addBox(group, 18, .95, 2, M.darkSteel, 16.6, 12.62, -32.65);
    addBox(group, 17.7, .24, .5, M.darkSteel, 16.6, 12.02, -31.72);
    for (const lx of [ 8.55, 24.65 ]) {
        addBox(group, .5, 12.2, 1.6, M.darkSteel, lx, 6.15, -32.8);
        addBox(group, .14, 11.4, .14, M.steel, lx + (lx < 16 ? .3 : -.3), 6, -32.02);
    }
    const lintelLightMat = new THREE.MeshBasicMaterial({
        color: 16762250,
        toneMapped: false
    });
    const lintelLightMat2 = lintelLightMat.clone();
    lintelLightMat2.color.multiplyScalar(1.25);
    addBox(group, 14.6, .06, .09, lintelLightMat, 16.6, 11.9, -31.68);
    addBox(group, .08, 10.8, .08, lintelLightMat, 8.86, 5.9, -31.98);
    addBox(group, .08, 10.8, .08, lintelLightMat, 24.34, 5.9, -31.98);
    const doorGroup = new THREE.Group;
    doorGroup.position.set(16.6, 19, -33.7);
    for (let i = 0; i < 13; i++) {
        const shade = i % 2 === 0 ? 1777701 : 1316893;
        const slat = new THREE.Mesh(new THREE.BoxGeometry(17.2, .23, .13), new THREE.MeshStandardMaterial({
            color: shade,
            metalness: .82,
            roughness: .38
        }));
        slat.position.set(0, -3.35 + i * .52, 0);
        doorGroup.add(slat);
        if (i === 4) {
            const strip = new THREE.Mesh(new THREE.PlaneGeometry(16.4, .1), new THREE.MeshBasicMaterial({
                color: 4755901,
                toneMapped: false
            }));
            strip.position.set(0, -3.35 + i * .52 + .14, .075);
            doorGroup.add(strip);
        }
    }
    addBox(doorGroup, 17.6, .32, .34, M.darkSteel, 0, -3.72, .08);
    group.add(doorGroup);
    const cityMat = new THREE.MeshBasicMaterial({
        map: cityTexture,
        fog: true,
        toneMapped: true
    });
    cityMat.color.setRGB(1.46, 1.4, 1.3);
    const cityPlane = new THREE.Mesh(new THREE.PlaneGeometry(82, 38), cityMat);
    cityPlane.name = "Exterior city backdrop";
    cityPlane.position.set(16.4, 11, -67);
    group.add(cityPlane);
    const doorGlowMat = new THREE.MeshBasicMaterial({
        map: glowTexture,
        color: 16754792,
        transparent: true,
        opacity: .45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide
    });
    const doorGlow = new THREE.Mesh(new THREE.PlaneGeometry(23, 17), doorGlowMat);
    doorGlow.position.set(16.5, 6, -34.55);
    doorGlow.renderOrder = 1;
    group.add(doorGlow);
    const doorGlowLow = new THREE.Mesh(new THREE.PlaneGeometry(14, 7.5), new THREE.MeshBasicMaterial({
        map: glowTexture,
        color: 16761225,
        transparent: true,
        opacity: .3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
    }));
    doorGlowLow.position.set(16.8, 2.4, -34.6);
    group.add(doorGlowLow);
    const cityHaze1 = addGlowSprite(group, 16755301, 14.4, 4.2, -39.2, 16, .32, false);
    cityHaze1.material.color.multiplyScalar(1.45);
    const cityHaze2 = addGlowSprite(group, 16760190, 20.9, 3.2, -41.5, 12.5, .28, false);
    cityHaze2.material.color.multiplyScalar(1.4);
    const cityHazeSheet = new THREE.Mesh(new THREE.PlaneGeometry(26, 11), new THREE.MeshBasicMaterial({
        map: glowTexture,
        color: 16754538,
        transparent: true,
        opacity: .11,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        fog: false
    }));
    cityHazeSheet.position.set(16.6, 4.3, -38.5);
    cityHazeSheet.material.opacity = .15;
    group.add(cityHazeSheet);
    addGlowSprite(group, 16752469, 16.4, 4.8, -35, 9.5, .11, false).material.color.multiplyScalar(1.2);
    addGlowSprite(group, 16753244, 16.6, 5.4, -34.35, 14, .12, true).material.color.multiplyScalar(1.25);
    addGlowSprite(group, 8234188, 10.2, 7.6, -45.8, 9, .07, false);
    const facadeTextures = [];
    for (let fi = 0; fi < 3; fi++) {
        const {canvas: wc, ctx: wctx} = canvas2d(256, 512);
        const wr = mulberry32(8700 + fi * 31);
        const bg = wctx.createLinearGradient(0, 0, 0, 512);
        bg.addColorStop(0, "#0a111a");
        bg.addColorStop(1, "#0f1923");
        wctx.fillStyle = bg;
        wctx.fillRect(0, 0, 256, 512);
        for (let wy = 18; wy < 500; wy += 22) {
            for (let wx = 14; wx < 242; wx += 20) {
                if (wr() < .42) {
                    const warm = wr() < .7;
                    wctx.fillStyle = warm ? `rgba(255,196,124,${.25 + wr() * .75})` : `rgba(165,210,240,${.16 + wr() * .55})`;
                    wctx.fillRect(wx, wy, 7 + Math.floor(wr() * 4), 4 + Math.floor(wr() * 3));
                }
            }
        }
        for (let k = 0; k < 5; k++) {
            wctx.fillStyle = "rgba(255,205,141,.18)";
            wctx.fillRect(10, 40 + k * 74, 236, 8);
        }
        facadeTextures.push(makeCanvasTexture(wc));
    }
    const buildingDefs = [ [ 7.4, -57, 4.2, 8.4, 3.2, 1 ], [ 12.2, -55.5, 3.4, 12.6, 2.8, 0 ], [ 16.6, -58, 4.8, 6.8, 3.6, 2 ], [ 21.6, -56, 3.7, 10.2, 3, 1 ], [ 25, -54.5, 2.8, 7.6, 2.5, 0 ], [ 9.8, -52.8, 1.6, 5.4, 1.8, 2 ] ];
    for (let i = 0; i < buildingDefs.length; i++) {
        const [bx, bz, bw, bh, bd, texI] = buildingDefs[i];
        const frontMat = new THREE.MeshBasicMaterial({
            map: facadeTextures[texI],
            color: 14674417,
            fog: true
        });
        frontMat.color.multiplyScalar(.98);
        const sideMat = new THREE.MeshBasicMaterial({
            color: 461584,
            fog: true
        });
        const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), [ sideMat, sideMat, sideMat, sideMat, frontMat, sideMat ]);
        b.name = "Exterior city building " + i;
        b.position.set(bx, bh / 2, bz);
        group.add(b);
        if (i % 2 === 0) {
            const beacon = new THREE.Mesh(new THREE.SphereGeometry(.08, 6, 5), new THREE.MeshBasicMaterial({
                color: 16731187,
                toneMapped: false
            }));
            beacon.position.set(bx, bh + .15, bz);
            group.add(beacon);
        }
    }
    const pipeMatC = new THREE.MeshStandardMaterial({
        color: 3488319,
        metalness: .88,
        roughness: .44
    });
    const pipeSpecs = [ {
        y: 20,
        z: -7.8,
        sag: .55,
        r: .13,
        mat: pipeMatC
    }, {
        y: 19.4,
        z: -14.2,
        sag: .4,
        r: .075,
        mat: M.trussRust
    }, {
        y: 20.5,
        z: -21,
        sag: .6,
        r: .18,
        mat: pipeMatC
    }, {
        y: 18.9,
        z: -11.5,
        sag: .25,
        r: .045,
        mat: M.darkSteel
    } ];
    for (const spec of pipeSpecs) {
        const pts = [];
        for (let x = -30; x <= 30.1; x += 5) {
            const t = (x + 30) / 60;
            pts.push(new THREE.Vector3(x, spec.y - Math.sin(t * Math.PI) * spec.sag, spec.z));
        }
        const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", .3);
        const pipe = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, spec.r, 7, false), spec.mat);
        group.add(pipe);
        for (let x = -27; x <= 27; x += 9) {
            const t = (x + 30) / 60;
            const py = spec.y - Math.sin(t * Math.PI) * spec.sag;
            rodBetween(group, new THREE.Vector3(x, py + .1, spec.z), new THREE.Vector3(x, 22, spec.z), .025, M.darkSteel, 5);
        }
    }
    addBox(group, 50, .08, .72, M.darkSteel, -2, 18.6, -16.8);
    for (let x = -27; x < 24; x += 3.4) {
        addBox(group, .08, .25, .72, M.steel, x, 18.74, -16.8);
    }
    const outdoor = new THREE.Mesh(new THREE.PlaneGeometry(84, 44), new THREE.MeshStandardMaterial({
        color: 921618,
        roughness: .38,
        metalness: .3
    }));
    outdoor.rotation.x = -Math.PI / 2;
    outdoor.position.set(16, -.02, -51);
    group.add(outdoor);
    const outsidePool = new THREE.Mesh(new THREE.PlaneGeometry(30, 15), new THREE.MeshBasicMaterial({
        map: glowTexture,
        color: 16753246,
        transparent: true,
        opacity: .2,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
    }));
    outsidePool.rotation.x = -Math.PI / 2;
    outsidePool.position.set(16.6, .03, -38.5);
    group.add(outsidePool);
    function streetLamp(x, z, h = 5.4) {
        const g = new THREE.Group;
        const pole = addCylinder(g, .055, .085, h, M.darkSteel, 0, h / 2, 0, 8);
        pole.castShadow = false;
        const arm = addCylinder(g, .04, .04, 1.6, M.darkSteel, .7, h - .12, 0, 6);
        arm.rotation.z = Math.PI / 2;
        const lampMat = new THREE.MeshBasicMaterial({
            color: 16766624,
            toneMapped: false
        });
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(.19, 10, 8), lampMat);
        bulb.position.set(1.38, h - .14, 0);
        g.add(bulb);
        addGlowSprite(g, 16757350, 1.38, h - .14, .04, 5.2, .78, false);
        addGlowSprite(g, 16773332, 1.38, h - .14, .02, 2.1, .6, false);
        g.position.set(x, 0, z);
        group.add(g);
    }
    streetLamp(10.9, -35.3, 5.3);
    streetLamp(17.9, -35, 5.8);
    streetLamp(23.3, -35.4, 6.2);
    streetLamp(14.7, -38.1, 6.6);
    streetLamp(21, -39.4, 6.4);
    const bollardMat = new THREE.MeshStandardMaterial({
        color: 1514013,
        metalness: .55,
        roughness: .48
    });
    const bollardBand = new THREE.MeshBasicMaterial({
        color: 13804355,
        toneMapped: false
    });
    for (const [bx, bz] of [ [ 9.4, -35.8 ], [ 14.6, -36.2 ], [ 20.4, -35.7 ], [ 24, -36.4 ] ]) {
        addCylinder(group, .11, .14, .88, bollardMat, bx, .44, bz, 10);
        addCylinder(group, .122, .122, .09, bollardBand, bx, .7, bz, 10);
        addGlowSprite(group, 16757350, bx, .83, bz + .04, .85, .3, false);
    }
    const outsideLight = new THREE.PointLight(16755558, 320, 28, 1.7);
    outsideLight.position.set(15.8, 4.2, -36.4);
    group.add(outsideLight);
    const bannerMat = new THREE.MeshStandardMaterial({
        map: bannerTexture,
        side: THREE.DoubleSide,
        roughness: .82,
        metalness: .02,
        emissive: 16777215,
        emissiveMap: bannerTexture,
        emissiveIntensity: .07
    });
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(2.25, 5.65), bannerMat);
    banner.position.set(27.1, 9.5, -33.32);
    banner.rotation.z = -.008;
    group.add(banner);
    addCylinder(group, .028, .028, 2.9, M.steel, 27.1, 12.45, -33.35, 8).rotation.z = Math.PI / 2;
    addCylinder(group, .028, .028, 2.9, M.steel, 27.1, 6.55, -33.35, 8).rotation.z = Math.PI / 2;
    const serviceDoor = new THREE.Mesh(new THREE.BoxGeometry(.08, 3.6, 2.1), new THREE.MeshStandardMaterial({
        color: 2369579,
        metalness: .75,
        roughness: .42
    }));
    serviceDoor.position.set(-29.72, 1.8, -11.5);
    group.add(serviceDoor);
    addBox(group, .12, .14, 2.5, M.steel, -29.65, 3.65, -11.5);
    addGlowSprite(group, 9484253, -29.4, 9.4, -11.5, 2.1, .13);
    for (let i = 0; i < 4; i++) {
        const x = -21 + i * 12.4;
        const pipeGeo = new THREE.CylinderGeometry(.17 + i % 2 * .07, .17 + i % 2 * .07, 53, 8);
        const pipe = new THREE.Mesh(pipeGeo, i === 2 ? M.trussRust : M.darkSteel);
        pipe.rotation.x = Math.PI / 2;
        pipe.position.set(x, 19.4 + i % 3 * .38, -7);
        group.add(pipe);
        for (let z = -30; z < 20; z += 8) {
            addBox(group, .09, .55, .09, M.steel, x, 19.9 + i % 3 * .38, z);
        }
    }
    const duct = addBox(group, 26, 1.2, 1.7, new THREE.MeshStandardMaterial({
        color: 2435372,
        metalness: .75,
        roughness: .55
    }), -14.5, 20.4, -17.5);
    duct.receiveShadow = true;
    for (let i = 0; i < 8; i++) {
        addBox(group, .12, 1.36, 1.82, M.darkSteel, -26 + i * 3.3, 20.4, -17.5);
    }
    const stripMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(13821174).multiplyScalar(1.55),
        toneMapped: false
    });
    ceilingStripMaterial = stripMat;
    const stripShadeMat = new THREE.MeshStandardMaterial({
        color: 1777702,
        metalness: .6,
        roughness: .5
    });
    for (const [sx, sy, sz, len] of [ [ -6, 19.1, -6.5, 11 ], [ 5.5, 19.1, -11, 10 ], [ -2, 19.15, -17.5, 9 ], [ 9, 19.1, -24, 8 ] ]) {
        addBox(group, len, .34, .46, stripShadeMat, sx, sy + .1, sz);
        const tube = addBox(group, len - .6, .055, .22, stripMat, sx, sy - .09, sz);
        tube.castShadow = false;
        for (let gx = -len / 2 + 1.6; gx <= len / 2 - 1.6; gx += 2.8) {
            addGlowSprite(group, 13624568, sx + gx, sy - .12, sz + .05, 2.3, .12, true);
            addCylinder(group, .016, .016, 2, M.darkSteel, sx + gx, sy + 1.2, sz, 5);
        }
    }
    group.scale.y = .82;
    buildTrusses(group);
    return group;
}

function buildTrusses(parent) {
    const trussMaterial = M.truss;
    const trussRust = M.trussRust;
    const bottomY = 18.35;
    const apexY = 23.25;
    const eaveY = 21.7;
    const zs = [ 14, 6, -2, -10, -14, -18, -22, -26, -30 ];
    for (let ti = 0; ti < zs.length; ti++) {
        const z = zs[ti];
        beamBetween(parent, new THREE.Vector3(-30, bottomY, z), new THREE.Vector3(30, bottomY, z), .34, .44, ti === 2 ? trussRust : trussMaterial);
        beamBetween(parent, new THREE.Vector3(-30, eaveY, z), new THREE.Vector3(0, apexY, z), .38, .46, trussMaterial);
        beamBetween(parent, new THREE.Vector3(0, apexY, z), new THREE.Vector3(30, eaveY, z), .38, .46, trussMaterial);
        for (let x = -28; x <= 28; x += 4.6) {
            const topY = apexY - Math.abs(x) / 30 * (apexY - eaveY);
            beamBetween(parent, new THREE.Vector3(x, bottomY, z), new THREE.Vector3(x, topY, z), .18, .23, trussMaterial);
            if (x < 28) {
                const nextTopY = apexY - Math.abs(x + 4.6) / 30 * (apexY - eaveY);
                if ((Math.round(x / 4.6) & 1) === 0) {
                    beamBetween(parent, new THREE.Vector3(x, bottomY, z), new THREE.Vector3(x + 4.6, nextTopY, z), .15, .19, trussMaterial);
                } else {
                    beamBetween(parent, new THREE.Vector3(x, topY, z), new THREE.Vector3(x + 4.6, bottomY, z), .15, .19, trussMaterial);
                }
            }
        }
        for (const x of [ -30, 30 ]) {
            addBox(parent, .8, 1.1, .95, M.darkSteel, x, eaveY - .35, z);
        }
        if (ti % 2 === 0) {
            const bulb = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 6), new THREE.MeshBasicMaterial({
                color: 16726574,
                toneMapped: false
            }));
            bulb.position.set(.2, apexY + .2, z);
            parent.add(bulb);
            addGlowSprite(parent, 16726829, .2, apexY + .2, z + .08, 1.1, .32);
        }
        if (ti < zs.length - 1) {
            const nextZ = zs[ti + 1];
            if (ti % 2 === 0) {
                beamBetween(parent, new THREE.Vector3(-24, bottomY + .1, z), new THREE.Vector3(-18, bottomY + .1, nextZ), .11, .13, M.darkSteel);
                beamBetween(parent, new THREE.Vector3(18, bottomY + .1, z), new THREE.Vector3(24, bottomY + .1, nextZ), .11, .13, M.darkSteel);
            }
        }
    }
    for (const x of [ -24, -16, -8, 0, 8, 16, 24 ]) {
        beamBetween(parent, new THREE.Vector3(x, apexY - Math.abs(x) / 30 * (apexY - 21.7) + .35, 17), new THREE.Vector3(x, apexY - Math.abs(x) / 30 * (apexY - 21.7) + .35, -31), .2, .24, M.truss);
    }
    const visualLamps = [ [ -2.4, 16.6, 4.2 ], [ 9.8, 16.1, -4.8 ], [ -12.2, 15.7, -7.4 ], [ 7.2, 15.2, -21 ], [ -8.5, 15.3, 10.5 ], [ 15.7, 14.7, 6.5 ], [ 1.5, 15, -15.8 ], [ -13.5, 14.4, -16.8 ], [ 13.2, 13.9, -14.5 ], [ -16, 14.2, -10.2 ], [ 17.4, 13.8, -11.6 ], [ -2, 13.8, -25.4 ] ];
    for (let i = 0; i < visualLamps.length; i++) {
        const [x, y, z] = visualLamps[i];
        addHangingFixture(parent, x, y, z, i < 4);
    }
}

function addHangingFixture(parent, x, y, z, realLamp) {
    const g = new THREE.Group;
    g.position.set(x, y, z);
    const cable = addCylinder(g, .012, .012, 2.45, M.black, 0, 1.55, 0, 5);
    cable.castShadow = false;
    addCylinder(g, .14, .14, .12, M.darkSteel, 0, 2.75, 0, 8);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(.56, .94, .48, 28, 1, true), new THREE.MeshStandardMaterial({
        color: 2107179,
        metalness: .84,
        roughness: .3,
        side: THREE.DoubleSide
    }));
    shade.position.y = .16;
    g.add(shade);
    addCylinder(g, .94, .94, .04, M.darkSteel, 0, -.08, 0, 28);
    const diffuser = new THREE.Mesh(new THREE.CircleGeometry(.78, 24), new THREE.MeshBasicMaterial({
        color: new THREE.Color(16774625).multiplyScalar(2.8),
        toneMapped: false
    }));
    diffuser.rotation.x = Math.PI / 2;
    diffuser.position.y = -.095;
    g.add(diffuser);
    const glowMat = new THREE.SpriteMaterial({
        map: glowTexture,
        color: 14215423,
        transparent: true,
        opacity: .58,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        fog: false
    });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.set(3.3, 3.3, 1);
    glow.position.y = -.15;
    g.add(glow);
    glowMat.color.multiplyScalar(1.7);
    lampGlowMaterials.push(glowMat);
    if (realLamp) {
        const shaftMat = new THREE.ShaderMaterial({
            uniforms: {
                uColor: {
                    value: new THREE.Color(12967167)
                },
                uIntensity: {
                    value: .008
                },
                uTime: {
                    value: 0
                }
            },
            vertexShader: `\n        varying vec2 vUv;\n        varying vec3 vLocal;\n        void main() {\n          vUv = uv;\n          vLocal = position;\n          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n        }\n      `,
            fragmentShader: `\n        uniform vec3 uColor;\n        uniform float uIntensity;\n        uniform float uTime;\n        varying vec2 vUv;\n        varying vec3 vLocal;\n        void main() {\n          float edge = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x);\n          float fade = smoothstep(0.0, 0.12, vUv.y) * (1.0 - smoothstep(0.55, 1.0, vUv.y));\n          float dust = 0.82 + 0.18 * sin(vUv.x * 50.265 + uTime * 0.13);\n          float a = edge * fade * dust * uIntensity;\n          gl_FragColor = vec4(uColor, a);\n        }\n      `,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            toneMapped: false
        });
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.9, 4.8, 12.2, 28, 1, true), shaftMat);
        shaft.position.y = -6.35;
        shaft.renderOrder = 4;
        shaft.visible = false;
        g.add(shaft);
        lightShaftMaterials.push(shaftMat);
    }
    parent.add(g);
    return g;
}

buildFloor();

buildHangar();

const floatGroup = new THREE.Group;

floatGroup.name = "Float 19 — The Algorithm";

world.add(floatGroup);

const PLATFORM = {
    x: -1,
    z: -4.5,
    w: 16.4,
    d: 7,
    front: -1,
    back: -8
};

function buildPlatform() {
    const g = floatGroup;
    addBox(g, PLATFORM.w, 1.06, PLATFORM.d, M.black, PLATFORM.x, .53, PLATFORM.z);
    addBox(g, PLATFORM.w + .18, .2, PLATFORM.d + .18, M.darkSteel, PLATFORM.x, 1.06, PLATFORM.z);
    addBox(g, PLATFORM.w + .12, .12, PLATFORM.d + .12, M.softBlack, PLATFORM.x, 1.22, PLATFORM.z);
    addBox(g, PLATFORM.w - .12, .06, PLATFORM.d - .12, M.softBlack, PLATFORM.x, 1.29, PLATFORM.z);
    addBox(g, PLATFORM.w - 2, .3, PLATFORM.d - 1.4, M.darkSteel, PLATFORM.x, .14, PLATFORM.z);
    for (const x of [ -7, -1, 5 ]) {
        addBox(g, .22, .25, PLATFORM.d - .7, M.midSteel, x, .055, PLATFORM.z);
    }
    addBox(g, PLATFORM.w + .2, .09, .17, M.steel, PLATFORM.x, 1.235, PLATFORM.front + .06);
    addBox(g, .17, .09, PLATFORM.d + .2, M.steel, PLATFORM.x + PLATFORM.w / 2 + .06, 1.235, PLATFORM.z);
    addBox(g, .17, .09, PLATFORM.d + .2, M.steel, PLATFORM.x - PLATFORM.w / 2 - .06, 1.235, PLATFORM.z);
    const coveMat = new THREE.MeshBasicMaterial({
        color: 1523078,
        toneMapped: false
    });
    const cove = new THREE.Mesh(new THREE.BoxGeometry(PLATFORM.w - .8, .035, .05), coveMat);
    cove.position.set(PLATFORM.x, 1.12, PLATFORM.front + .08);
    g.add(cove);
    addGlowSprite(g, 2774696, PLATFORM.x - 4.2, .75, PLATFORM.front + .4, 3.4, .07);
    addGlowSprite(g, 2774696, PLATFORM.x + 3.9, .75, PLATFORM.front + .4, 3.2, .065);
    const badgeMat = new THREE.MeshStandardMaterial({
        color: 527118,
        metalness: .8,
        roughness: .24
    });
    const badge = new THREE.Mesh(new THREE.BoxGeometry(3, .34, .06), badgeMat);
    badge.position.set(2.25, 1.19, PLATFORM.front + .11);
    g.add(badge);
    const badgeText = canvas2d(768, 96);
    badgeText.ctx.clearRect(0, 0, 768, 96);
    badgeText.ctx.fillStyle = "rgba(224,233,240,.9)";
    badgeText.ctx.font = '500 38px "Arial Narrow", Arial, sans-serif';
    badgeText.ctx.textAlign = "center";
    badgeText.ctx.fillText("A L G O R I T H M   /   1 9", 384, 60);
    const badgeTex = makeCanvasTexture(badgeText.canvas);
    const badgeLabel = new THREE.Mesh(new THREE.PlaneGeometry(2.86, .25), new THREE.MeshBasicMaterial({
        map: badgeTex,
        transparent: true,
        depthWrite: false,
        toneMapped: false
    }));
    badgeLabel.position.set(2.25, 1.19, PLATFORM.front + .145);
    g.add(badgeLabel);
    buildFringeSkirt(g);
    buildSafetyRail(g);
}

function makeFringeStripGeometry() {
    const geo = new THREE.PlaneGeometry(1, 1, 2, 6);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const y = p.getY(i);
        const down = .5 - y;
        const curl = Math.pow(clamp(down, 0, 1), 1.7);
        p.setZ(i, curl * .09 + Math.sin(x * 5.2 + y * 2.3) * .008);
        p.setX(i, x + Math.sin(down * 5) * .035 * (x + .5));
    }
    geo.computeVertexNormals();
    return geo;
}

function buildFringeSkirt(parent) {
    const frontZ = PLATFORM.front + .12;
    const silverCount = 840;
    const blueCount = 780;
    const stripGeo = makeFringeStripGeometry();
    const silverMat = new THREE.MeshStandardMaterial({
        color: 16777215,
        metalness: .9,
        roughness: .34,
        side: THREE.DoubleSide,
        envMapIntensity: 1.05,
        dithering: true
    });
    const blueMat = new THREE.MeshStandardMaterial({
        color: 16777215,
        metalness: .86,
        roughness: .36,
        side: THREE.DoubleSide,
        envMapIntensity: 1.05,
        dithering: true
    });
    const silver = new THREE.InstancedMesh(stripGeo, silverMat, silverCount);
    const blue = new THREE.InstancedMesh(stripGeo, blueMat, blueCount);
    silver.frustumCulled = false;
    blue.frustumCulled = false;
    silver.receiveShadow = true;
    blue.receiveShadow = true;
    const dummy = new THREE.Object3D;
    const color = new THREE.Color;
    const silverColors = [ 14410472, 11121853, 15067886, 8358805, 12371921, 6253430 ];
    const blueColors = [ 397875, 597066, 928358, 1325960, 331304, 2051206, 3366810, 7311278 ];
    let idx = 0;
    const edges = [];
    for (let i = 0; i < silverCount; i++) {
        const sideChance = i > silverCount * .86;
        let x, z;
        if (sideChance) {
            x = PLATFORM.x + PLATFORM.w / 2 + .08 + rr(-.04, .05);
            z = rr(PLATFORM.back + .3, PLATFORM.front - .2);
        } else {
            x = rr(PLATFORM.x - PLATFORM.w / 2 + .05, PLATFORM.x + PLATFORM.w / 2 - .05);
            z = frontZ + rr(-.025, .03);
        }
        const topSilver = rr(0, 1) > .34;
        const h = topSilver ? rr(.5, .82) : rr(.92, 1.16);
        dummy.position.set(x, 1.24 - h * .5, z);
        dummy.rotation.set(rr(-.07, .07), sideChance ? Math.PI / 2 + rr(-.3, .3) : rr(-.28, .28), rr(-.055, .055));
        dummy.scale.set(rr(.038, .098), h, 1);
        dummy.updateMatrix();
        silver.setMatrixAt(idx, dummy.matrix);
        color.setHex(silverColors[Math.floor(rr(0, silverColors.length))]);
        silver.setColorAt(idx, color);
        idx++;
    }
    idx = 0;
    for (let i = 0; i < blueCount; i++) {
        const sideChance = i > blueCount * .89;
        let x, z;
        if (sideChance) {
            x = PLATFORM.x + PLATFORM.w / 2 + .015 + rr(-.04, .03);
            z = rr(PLATFORM.back + .4, PLATFORM.front - .15);
        } else {
            x = rr(PLATFORM.x - PLATFORM.w / 2, PLATFORM.x + PLATFORM.w / 2);
            z = frontZ + rr(.005, .075);
        }
        const h = rr(.96, 1.22);
        dummy.position.set(x, 1.24 - h * .5, z);
        dummy.rotation.set(rr(-.06, .06), sideChance ? Math.PI / 2 + rr(-.35, .35) : rr(-.3, .3), rr(-.05, .05));
        dummy.scale.set(rr(.048, .13), h, 1);
        dummy.updateMatrix();
        blue.setMatrixAt(idx, dummy.matrix);
        color.setHex(blueColors[Math.floor(rr(0, blueColors.length))]);
        blue.setColorAt(idx, color);
        idx++;
    }
    silver.instanceMatrix.needsUpdate = true;
    blue.instanceMatrix.needsUpdate = true;
    if (silver.instanceColor) silver.instanceColor.needsUpdate = true;
    if (blue.instanceColor) blue.instanceColor.needsUpdate = true;
    parent.add(blue, silver);
    parent.userData.fringe = {
        silver: silver,
        blue: blue
    };
    const garlandPts = [];
    for (let x = PLATFORM.x - PLATFORM.w / 2; x <= PLATFORM.x + PLATFORM.w / 2; x += .7) {
        garlandPts.push(new THREE.Vector3(x, 1.265 + Math.sin(x * 3.2) * .012, PLATFORM.front + .12));
    }
    const garland = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(garlandPts), 170, .022, 5, false), M.chrome);
    parent.add(garland);
    const fleckGeo = new THREE.BufferGeometry;
    const fleckPositions = [];
    const fleckColors = [];
    const cWarm = new THREE.Color(16761466);
    const cCool = new THREE.Color(7317759);
    for (let i = 0; i < 70; i++) {
        const side = random() > .86;
        const x = side ? PLATFORM.x + PLATFORM.w / 2 + .1 : rr(PLATFORM.x - PLATFORM.w / 2, PLATFORM.x + PLATFORM.w / 2);
        const z = side ? rr(PLATFORM.back, PLATFORM.front) : PLATFORM.front + rr(.1, .16);
        fleckPositions.push(x, rr(.35, 1.08), z);
        const c = random() < .62 ? cCool : cWarm;
        fleckColors.push(c.r, c.g, c.b);
    }
    fleckGeo.setAttribute("position", new THREE.Float32BufferAttribute(fleckPositions, 3));
    fleckGeo.setAttribute("color", new THREE.Float32BufferAttribute(fleckColors, 3));
    const flecks = new THREE.Points(fleckGeo, new THREE.PointsMaterial({
        size: .035,
        vertexColors: true,
        map: glowTexture,
        transparent: true,
        opacity: .75,
        alphaTest: .02,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
    }));
    flecks.renderOrder = 5;
    parent.add(flecks);
}

function buildSafetyRail(parent) {
    const deckY = PLATFORM_TOP;
    const frontZ = PLATFORM.front + .25;
    const rightX = PLATFORM.x + PLATFORM.w / 2 - .16;
    const leftX = PLATFORM.x - PLATFORM.w / 2 + .16;
    const backZ = PLATFORM.back + .25;
    const topY = deckY + 1.55;
    const midY = deckY + .88;
    function railPath(points, mat, radius = .026) {
        const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", .18);
        const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 140, radius, 7, false), mat);
        mesh.castShadow = false;
        parent.add(mesh);
        return mesh;
    }
    const perimeter = [ new THREE.Vector3(leftX, 0, frontZ), new THREE.Vector3(rightX, 0, frontZ), new THREE.Vector3(rightX, 0, backZ), new THREE.Vector3(leftX, 0, backZ), new THREE.Vector3(leftX, 0, frontZ) ];
    for (const y of [ topY, midY ]) {
        railPath(perimeter.map(p => new THREE.Vector3(p.x, y, p.z)), y === topY ? M.silver : M.steel, y === topY ? .034 : .022);
    }
    const postMat = M.steel;
    const postPositions = [];
    for (let x = leftX; x <= rightX + .01; x += 1.95) {
        postPositions.push(new THREE.Vector3(x, 0, frontZ));
    }
    for (let z = frontZ - 1.6; z >= backZ + .1; z -= 1.7) {
        postPositions.push(new THREE.Vector3(rightX, 0, z));
        postPositions.push(new THREE.Vector3(leftX, 0, z));
    }
    for (const p of postPositions) {
        rodBetween(parent, new THREE.Vector3(p.x, deckY, p.z), new THREE.Vector3(p.x, topY + .04, p.z), .031, postMat, 8);
        const foot = new THREE.Mesh(new THREE.CylinderGeometry(.09, .11, .05, 12), M.darkSteel);
        foot.position.set(p.x, deckY + .025, p.z);
        parent.add(foot);
    }
    for (const x of [ leftX, rightX ]) {
        for (const z of [ frontZ, backZ ]) {
            const ball = new THREE.Mesh(new THREE.SphereGeometry(.045, 10, 8), M.chrome);
            ball.position.set(x, topY, z);
            parent.add(ball);
        }
    }
    addBox(parent, .07, .035, .05, M.darkSteel, 1.05, topY - .01, frontZ);
    addBox(parent, .07, .035, .05, M.darkSteel, 1.95, topY - .01, frontZ);
}

const rackLEDs = {
    positions: [],
    colors: [],
    phases: [],
    sizes: [],
    rates: []
};

const ledPalette = [ 6160320, 4971007, 4357631, 16761192, 16739410, 13955583 ];

function createMonitorTexture(kind, seed) {
    const W = 512;
    const H = 320;
    const {canvas: c, ctx: ctx} = canvas2d(W, H);
    const rng = mulberry32(seed * 7717 + 19);
    const bg = ctx.createRadialGradient(W * .5, H * .48, 10, W * .5, H * .48, W * .66);
    bg.addColorStop(0, "#071827");
    bg.addColorStop(.65, "#040b14");
    bg.addColorStop(1, "#010307");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(126,190,235,.14)";
    ctx.lineWidth = 1;
    for (let x = 20; x < W; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
    }
    for (let y = 20; y < H; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
    }
    ctx.fillStyle = "rgba(20,53,78,.8)";
    ctx.fillRect(0, 0, W, 34);
    ctx.fillStyle = "rgba(169,225,255,.9)";
    ctx.font = "700 16px monospace";
    ctx.fillText(kind === 0 ? "CORE TOPOLOGY · LIVE" : kind === 1 ? "EVENT STREAM · FLOAT 19" : "SIGNAL ANALYSIS · A", 16, 23);
    ctx.fillStyle = "rgba(118,197,245,.8)";
    ctx.fillRect(W - 74, 11, 56, 11);
    if (kind === 0) {
        const nodes = [];
        for (let i = 0; i < 22; i++) {
            nodes.push({
                x: 32 + rng() * (W - 64),
                y: 58 + rng() * (H - 96),
                r: 2 + rng() * 3.6
            });
        }
        ctx.strokeStyle = "rgba(81,166,220,.42)";
        ctx.lineWidth = 1.1;
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dx = nodes[i].x - nodes[j].x;
                const dy = nodes[i].y - nodes[j].y;
                if (dx * dx + dy * dy < 10500 && rng() > .35) {
                    ctx.beginPath();
                    ctx.moveTo(nodes[i].x, nodes[i].y);
                    ctx.lineTo(nodes[j].x, nodes[j].y);
                    ctx.stroke();
                }
            }
        }
        for (const n of nodes) {
            ctx.fillStyle = rng() > .75 ? "rgba(255,206,120,.95)" : "rgba(111,211,255,.92)";
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.r, 0, TAU);
            ctx.fill();
            ctx.strokeStyle = "rgba(128,200,244,.35)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.r + 4, 0, TAU);
            ctx.stroke();
        }
        ctx.fillStyle = "rgba(136,218,255,.75)";
        ctx.font = "600 14px monospace";
        ctx.fillText("NODES 4096   LINKS 40G   LAT 0.8ms", 16, H - 18);
        ctx.fillStyle = "rgba(255,190,104,.9)";
        ctx.font = "700 27px monospace";
        ctx.textAlign = "right";
        ctx.fillText("98.7%", W - 16, 72);
        ctx.textAlign = "left";
    } else if (kind === 1) {
        const lines = [ "04:37:01  core.init          OK", "04:37:02  routing.table     OK", "04:37:03  display.matrix    OK", "04:37:04  audio.bus.01      OK", "04:37:05  drive.array       OK", "04:37:06  choreo.sync       OK", "04:37:07  signal.return     OK", "04:37:08  reserve.power     OK" ];
        for (let i = 0; i < lines.length; i++) {
            ctx.fillStyle = i === 5 ? "rgba(255,196,112,.9)" : "rgba(108,216,183,.82)";
            ctx.font = "13px monospace";
            ctx.fillText(lines[i], 16, 66 + i * 25);
        }
        ctx.fillStyle = "rgba(81,152,196,.24)";
        ctx.fillRect(358, 58, 132, 184);
        for (let i = 0; i < 9; i++) {
            const hgt = 8 + rng() * 14;
            ctx.fillStyle = i === 7 ? "rgba(255,198,119,.9)" : "rgba(92,190,244,.72)";
            ctx.fillRect(366 + i * 13, 230 - hgt, 7, hgt);
        }
        ctx.fillStyle = "rgba(120,224,250,.74)";
        ctx.font = "11px monospace";
        ctx.fillText("PACKET THROUGHPUT", 358, 258);
        ctx.fillStyle = "rgba(239,183,108,.94)";
        ctx.font = "700 36px monospace";
        ctx.textAlign = "right";
        ctx.fillText("04:37", W - 16, H - 18);
        ctx.textAlign = "left";
    } else {
        ctx.strokeStyle = "rgba(72,183,230,.5)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let x = 16; x < W - 16; x += 2) {
            const y = 165 + Math.sin(x * .062 + seed) * 32 + Math.sin(x * .019) * 21 + Math.sin(x * .24) * 6;
            if (x === 16) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,192,111,.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 16; x < W - 16; x += 2) {
            const y = 170 + Math.cos(x * .033 + 1.2) * 25 + Math.sin(x * .105) * 11;
            if (x === 16) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.fillStyle = "rgba(177,231,255,.9)";
        ctx.font = '700 66px "Arial Narrow", Arial, sans-serif';
        ctx.fillText("98.7", 20, 96);
        ctx.fillStyle = "rgba(129,191,231,.64)";
        ctx.font = "13px monospace";
        ctx.fillText("SIGNAL INTEGRITY / %", 22, 118);
        ctx.fillStyle = "rgba(255,196,112,.84)";
        ctx.font = "13px monospace";
        ctx.fillText("CH 01-04  ▮▮▮▮▮▮▮▯", 22, H - 42);
        ctx.fillStyle = "rgba(122,207,244,.7)";
        ctx.fillText("CH 05-08  ▮▮▮▮▮▯▯▯", 22, H - 22);
    }
    const glare = ctx.createLinearGradient(0, 0, W, H);
    glare.addColorStop(0, "rgba(170,220,255,.08)");
    glare.addColorStop(.32, "rgba(170,220,255,.0)");
    glare.addColorStop(.68, "rgba(170,220,255,.035)");
    glare.addColorStop(1, "rgba(0,0,0,.12)");
    ctx.fillStyle = glare;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(0,0,0,.22)";
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
    ctx.strokeStyle = "rgba(112,176,220,.28)";
    ctx.lineWidth = 2;
    ctx.strokeRect(3, 3, W - 6, H - 6);
    return makeCanvasTexture(c, {
        srgb: true
    });
}

const monitorTextures = [ createMonitorTexture(0, 3), createMonitorTexture(1, 7), createMonitorTexture(2, 11) ];

function addRackMonitor(g, x, y, z, w, h, texIndex, rng) {
    addBox(g, w + .11, h + .11, .07, M.black, x, y, z + .035, {
        cast: true
    });
    addBox(g, w + .07, .018, .085, M.steel, x, y - h / 2 - .03, z + .045);
    const mat = new THREE.MeshBasicMaterial({
        map: monitorTextures[texIndex % monitorTextures.length],
        toneMapped: false
    });
    mat.color.setScalar(2.15);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    screen.position.set(x, y, z + .078);
    screen.name = "Rack telemetry display";
    g.add(screen);
    for (const sx of [ -1, 1 ]) {
        for (const sy of [ -1, 1 ]) {
            const sc = new THREE.Mesh(new THREE.SphereGeometry(.012, 5, 4), M.chrome);
            sc.position.set(x + sx * (w / 2 + .025), y + sy * (h / 2 + .025), z + .073);
            g.add(sc);
        }
    }
    const lampCol = rng() > .45 ? 6944699 : 16760938;
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(.011, 5, 4), new THREE.MeshBasicMaterial({
        color: lampCol,
        toneMapped: false
    }));
    lamp.position.set(x + w / 2 - .03, y - h / 2 - .028, z + .086);
    g.add(lamp);
    return screen;
}

function createRackIdTexture(label, sub) {
    const {canvas: c, ctx: ctx} = canvas2d(512, 160);
    ctx.clearRect(0, 0, 512, 160);
    ctx.fillStyle = "rgba(9,13,17,.9)";
    ctx.fillRect(6, 6, 500, 148);
    ctx.strokeStyle = "rgba(178,197,212,.55)";
    ctx.lineWidth = 3;
    ctx.strokeRect(14, 14, 484, 132);
    ctx.fillStyle = "rgba(224,235,242,.94)";
    ctx.font = '700 54px "Arial Narrow", Arial, sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(label, 256, 80);
    ctx.fillStyle = "rgba(144,176,198,.8)";
    ctx.font = "22px monospace";
    ctx.fillText(sub, 256, 118);
    ctx.fillStyle = "rgba(224,166,74,.85)";
    ctx.fillRect(28, 128, 66, 4);
    return makeCanvasTexture(c, {
        srgb: true
    });
}

const rackIdTextures = [ createRackIdTexture("CORE / 01", "ALGORITHM·19"), createRackIdTexture("CORE / 02", "PRIMARY NODE"), createRackIdTexture("SYNC / 03", "SIGNAL ARRAY"), createRackIdTexture("STORAGE / 04", "DRIVE WALL"), createRackIdTexture("MEMORY / 05", "CACHE BANK"), createRackIdTexture("I/O / 06", "EDGE RELAY") ];

function addRackFaceDetail(g, def, idTex) {
    const {w: w, d: d, h: h} = def;
    const faceZ = d / 2;
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(.78, .24), new THREE.MeshBasicMaterial({
        map: idTex,
        transparent: true,
        toneMapped: false,
        color: 14542830
    }));
    plate.position.set(0, h * .915, faceZ + .075);
    g.add(plate);
    const sticker = new THREE.Mesh(new THREE.PlaneGeometry(.19, .13), new THREE.MeshBasicMaterial({
        map: warningTexture,
        toneMapped: false
    }));
    sticker.position.set(-w * .22, h * .2, faceZ + .076);
    g.add(sticker);
    const faceRng = mulberry32(Math.floor(71e3 + def.x * 53 + seedFromZ(def.z) * 7));
    for (let c = 0; c < 3; c++) {
        const sx = (c - 1) * w * .28 + (faceRng() - .5) * .05;
        const zoff = faceZ + .11 + c * .014;
        const pts = [ new THREE.Vector3(sx + (faceRng() - .5) * .06, h - .2, zoff), new THREE.Vector3(sx + (faceRng() - .5) * .16, h * .75, zoff + .03), new THREE.Vector3(sx + (faceRng() - .5) * .16, h * .42, zoff), new THREE.Vector3(sx + (faceRng() - .5) * .08, h * .12, zoff + .02) ];
        const curve = new THREE.CatmullRomCurve3(pts);
        const mat = c === 1 ? M.cableBlueBright : c === 2 ? M.cableGrey : M.cableSilver;
        const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, .018 + faceRng() * .014, 5, false), mat);
        cable.castShadow = false;
        g.add(cable);
        for (const t of [ .18, .5, .82 ]) {
            const p = curve.getPointAt(t);
            addBox(g, .07, .022, .045, M.darkSteel, p.x, p.y, p.z + .015);
        }
    }
}

function addLed3D(parent, x, y, z) {
    const led = new THREE.Mesh(new THREE.SphereGeometry(.018, 6, 5), new THREE.MeshBasicMaterial({
        color: ledPalette[Math.floor(rr(0, 1) * ledPalette.length)],
        toneMapped: false
    }));
    led.position.set(x, y, z);
    parent.add(led);
    return led;
}

function buildRack(def, parent) {
    const {x: x, z: z, w: w, d: d, h: h, variant: variant} = def;
    const g = new THREE.Group;
    g.position.set(x, PLATFORM_TOP, z);
    const frontMat = rackFronts[variant % rackFronts.length];
    const materials = [ rackSide, rackSide, rackBack, rackBack, frontMat, rackSide ];
    addRackFaceDetail(g, def, rackIdTextures[(variant + (x < 0 ? 0 : 3)) % rackIdTextures.length]);
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), materials);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);
    const ledOverlay = new THREE.Mesh(new THREE.PlaneGeometry(w - .02, h - .03), new THREE.MeshBasicMaterial({
        map: rackTextureVariants[variant % rackTextureVariants.length].emissiveMap,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        color: 16777215
    }));
    ledOverlay.position.set(0, h / 2, d / 2 + .004);
    ledOverlay.renderOrder = 2;
    g.add(ledOverlay);
    addBox(g, w + .04, .1, d + .04, M.black, 0, h + .05, 0);
    addBox(g, w + .1, .07, d + .1, M.darkSteel, 0, .04, 0);
    addBox(g, .04, h, .06, M.darkSteel, -w / 2 + .035, h / 2, d / 2 + .02);
    addBox(g, .04, h, .06, M.darkSteel, w / 2 - .035, h / 2, d / 2 + .02);
    addBox(g, .05, h + .15, .07, M.midSteel, -w / 2 + .01, h / 2, d / 2 + .015);
    addBox(g, .05, h + .15, .07, M.midSteel, w / 2 - .01, h / 2, d / 2 + .015);
    const channel = addBox(g, .13, h * .8, .11, M.darkSteel, w / 2 - .09, h * .48, d / 2 + .07);
    for (let i = 0; i < 7; i++) {
        addBox(g, .04, .018, .13, M.steel, w / 2 - .09, h * .24 + i * h * .08, d / 2 + .09);
    }
    const deckRng = mulberry32(Math.floor(1e3 + x * 31 + z * 19));
    for (let i = 0; i < 4; i++) {
        const sy = 1 + (i + deckRng() * .5) * ((h - 2) / 4);
        const bw = w * (.74 + deckRng() * .08);
        const bx = (deckRng() - .5) * w * .08;
        addBox(g, bw, .16, .09, M.black, bx, sy, d / 2 + .055);
        addBox(g, bw, .012, .1, M.midSteel, bx, sy + .085, d / 2 + .065);
        const driveCount = 7;
        for (let k = 0; k < driveCount; k++) {
            const dx = bx - bw / 2 + .07 + k * ((bw - .14) / driveCount);
            addBox(g, .04, .075, .025, M.midSteel, dx, sy, d / 2 + .11);
            addBox(g, .008, .06, .028, M.chrome, dx + .016, sy, d / 2 + .118);
        }
        for (let l = 0; l < 3; l++) {
            const led = new THREE.Mesh(new THREE.SphereGeometry(.014, 5, 4), new THREE.MeshBasicMaterial({
                color: ledPalette[Math.floor(deckRng() * ledPalette.length)],
                toneMapped: false
            }));
            led.position.set(bx - bw / 2 + .07 + l * .065, sy + .05, d / 2 + .12);
            g.add(led);
        }
    }
    const railGlowMat = new THREE.MeshBasicMaterial({
        color: 1459854,
        toneMapped: false
    });
    addBox(g, .014, h * .45, .02, railGlowMat, -w / 2 + .105, h * .5, d / 2 + .075);
    addBox(g, .014, h * .18, .02, new THREE.MeshBasicMaterial({
        color: 8940344,
        toneMapped: false
    }), w / 2 - .115, h * .42, d / 2 + .075);
    if (h > 5.2) {
        const screenRng = mulberry32(Math.floor(24e3 + x * 37 + seedFromZ(z) * 3));
        const mw = h > 10 ? Math.min(1.75, w * .74) : Math.min(1.28, Math.max(.76, w * .58));
        const mh = mw * .625;
        const mx = (screenRng() - .5) * w * .12;
        addRackMonitor(g, mx, h * (.55 + screenRng() * .08), d / 2, mw, mh, variant + (x > 0 ? 1 : 0), screenRng);
    }
    for (let j = 0; j < Math.max(2, Math.floor(h / 3)); j++) {
        const hy = .75 + j * (h - 1.2) / Math.max(2, Math.floor(h / 3) - 1);
        addBox(g, .022, .24, .05, M.steel, -w * .29, hy, d / 2 + .055);
        addBox(g, .022, .24, .05, M.steel, w * .29, hy, d / 2 + .055);
    }
    if (h > 6) {
        const pullRng = mulberry32(Math.floor(33e3 + x * 19 + seedFromZ(z)));
        for (let p = 0; p < 3; p++) {
            const py = h * (.24 + p * .23) + pullRng() * .2;
            const pw = w * (.34 + pullRng() * .18);
            const px = (pullRng() - .5) * w * .18;
            addBox(g, pw, .055, .09, M.midSteel, px, py, d / 2 + .085);
            addBox(g, .09, .1, .11, M.darkSteel, px - pw / 2 + .07, py - .02, d / 2 + .085);
            addBox(g, .09, .1, .11, M.darkSteel, px + pw / 2 - .07, py - .02, d / 2 + .085);
            addLed3D(g, px + pw / 2 - .05, py + .01, d / 2 + .135);
        }
    }
    const ledRng = mulberry32(Math.floor(8e3 + x * 13 + seedFromZ(z)));
    for (let i = 0; i < 22; i++) {
        const lx = x + (ledRng() - .5) * (w - .32);
        const ly = PLATFORM_TOP + .55 + ledRng() * (h - 1.1);
        const lz = z + d / 2 + .083;
        const c = new THREE.Color(ledPalette[Math.floor(ledRng() * ledPalette.length)]);
        rackLEDs.positions.push(lx, ly, lz);
        rackLEDs.colors.push(c.r, c.g, c.b);
        rackLEDs.phases.push(ledRng() * TAU);
        rackLEDs.sizes.push(.06 + ledRng() * .13 + (i % 5 === 0 ? .08 : 0));
        rackLEDs.rates.push(.7 + ledRng() * 2.2);
    }
    for (let i = 0; i < 2; i++) {
        const sx = x + (i === 0 ? -1 : 1) * w * .3;
        const sy = PLATFORM_TOP + h - .18;
        const points = [ new THREE.Vector3(sx, sy, z + d * .38), new THREE.Vector3(sx + rr(-.5, .5), sy - .5, z + d * .44), new THREE.Vector3(sx + rr(-.7, .7), sy - 1.1, z + d * .4), new THREE.Vector3(sx + rr(-.8, .8), sy - 1.45, z + d * .47) ];
        const curve = new THREE.CatmullRomCurve3(points);
        const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, .026, 5, false), i % 2 ? M.cableBlueBright : M.cableGrey);
        g.add(cable);
    }
    parent.add(g);
    return g;
}

function seedFromZ(z) {
    return Math.abs(Math.round(z * 173));
}

const rackDefs = [ {
    x: -4.55,
    z: -5.9,
    w: 1.95,
    d: 2,
    h: 8.6,
    variant: 0
}, {
    x: -1.7,
    z: -6.35,
    w: 2.35,
    d: 2.2,
    h: 12.4,
    variant: 1
}, {
    x: 1.15,
    z: -5.15,
    w: 1.9,
    d: 1.85,
    h: 9,
    variant: 2
}, {
    x: 3.5,
    z: -6.8,
    w: 1.8,
    d: 1.9,
    h: 6.8,
    variant: 0
}, {
    x: -6.9,
    z: -6.65,
    w: 1.85,
    d: 1.8,
    h: 8.8,
    variant: 2
}, {
    x: -8.35,
    z: -6.15,
    w: 1.5,
    d: 1.7,
    h: 6.9,
    variant: 1
}, {
    x: 4.9,
    z: -3.25,
    w: 1.5,
    d: 1.3,
    h: 2.4,
    variant: 1
}, {
    x: -3.25,
    z: -2.95,
    w: 1.55,
    d: 1.4,
    h: 3.3,
    variant: 2
}, {
    x: -5.85,
    z: -4.05,
    w: 1.6,
    d: 1.35,
    h: 2.7,
    variant: 0
}, {
    x: 2.15,
    z: -3.95,
    w: 1.7,
    d: 1.4,
    h: 2.9,
    variant: 1
} ];

buildPlatform();

for (let i = 0; i < rackDefs.length; i++) {
    buildRack(rackDefs[i], floatGroup);
}

function addRackHardwareModules() {
    const units = [];
    const unitRng = mulberry32(60607);
    for (const def of rackDefs) {
        const {x: x, z: z, w: w, d: d, h: h} = def;
        const count = Math.floor(h / .52);
        for (let i = 0; i < count; i++) {
            if (unitRng() < .42) continue;
            const mh = .25 + unitRng() * .18;
            const mw = w * (.56 + unitRng() * .33);
            const depth = .045 + unitRng() * .075;
            const mx = x + (unitRng() - .5) * (w - mw) * .75;
            const my = PLATFORM_TOP + .35 + i * .52 + unitRng() * .06;
            const mz = z + d / 2 + .012 + depth / 2;
            units.push({
                x: mx,
                y: my,
                z: mz,
                sx: mw,
                sy: mh,
                sz: depth
            });
        }
    }
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({
        color: 922393,
        metalness: .36,
        roughness: .58,
        envMapIntensity: .14
    });
    const inst = new THREE.InstancedMesh(geo, mat, units.length);
    inst.name = "Dark server hardware modules";
    inst.castShadow = false;
    inst.receiveShadow = true;
    const dummy = new THREE.Object3D;
    units.forEach((u, i) => {
        dummy.position.set(u.x, u.y, u.z);
        dummy.scale.set(u.sx, u.sy, u.sz);
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
    });
    inst.instanceMatrix.needsUpdate = true;
    floatGroup.add(inst);
    const lipGeo = new THREE.BoxGeometry(1, 1, 1);
    const lipMat = new THREE.MeshStandardMaterial({
        color: 3752522,
        metalness: .9,
        roughness: .46,
        envMapIntensity: .35
    });
    const lipUnits = units.filter((u, i) => i % 3 === 0);
    const lips = new THREE.InstancedMesh(lipGeo, lipMat, lipUnits.length);
    lips.name = "Server module lips";
    lipUnits.forEach((u, i) => {
        dummy.position.set(u.x, u.y - u.sy / 2 + .005, u.z + u.sz / 2 + .002);
        dummy.scale.set(u.sx * .96, .005, .007);
        dummy.updateMatrix();
        lips.setMatrixAt(i, dummy.matrix);
    });
    lips.instanceMatrix.needsUpdate = true;
    lips.receiveShadow = true;
    floatGroup.add(lips);
}

addRackHardwareModules();

function buildRackBracing() {
    const g = new THREE.Group;
    for (const [y, mat, r] of [ [ 4.25, M.darkSteel, .04 ], [ 7.9, M.darkSteel, .03 ], [ 11.1, M.darkSteel, .04 ] ]) {
        rodBetween(g, new THREE.Vector3(-7.6, y, -4.52), new THREE.Vector3(4.25, y, -4.9), r, mat, 8);
        rodBetween(g, new THREE.Vector3(-7.6, y - .16, -4.52), new THREE.Vector3(-7.6, y + .5, -4.52), .025, M.steel, 6);
        rodBetween(g, new THREE.Vector3(4.25, y - .16, -4.9), new THREE.Vector3(4.25, y + .5, -4.9), .025, M.steel, 6);
    }
    beamBetween(g, new THREE.Vector3(4.25, PLATFORM_TOP + .1, -3.95), new THREE.Vector3(5.35, PLATFORM_TOP + 3.8, -4.4), .07, .08, M.steel);
    floatGroup.add(g);
}

buildRackBracing();

function buildRackCrown() {
    const g = new THREE.Group;
    addBox(g, 1.5, .45, .95, M.black, -1.85, PLATFORM_TOP + 13.05, -6.25);
    addBox(g, 1.16, .16, .12, M.darkSteel, -1.85, PLATFORM_TOP + 13.32, -5.7);
    for (let i = 0; i < 2; i++) {
        const fan = new THREE.Mesh(new THREE.CylinderGeometry(.28, .28, .065, 20), new THREE.MeshStandardMaterial({
            color: 658704,
            metalness: .8,
            roughness: .38
        }));
        fan.rotation.x = Math.PI / 2;
        fan.position.set(-2.25 + i * .8, PLATFORM_TOP + 13.08, -5.58);
        g.add(fan);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(.3, .012, 4, 24), M.steel);
        ring.position.copy(fan.position);
        g.add(ring);
    }
    addCylinder(g, .02, .02, 1.6, M.steel, .2, PLATFORM_TOP + 13, -6.7, 6);
    const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(.045, 8, 6), new THREE.MeshBasicMaterial({
        color: 16735551,
        toneMapped: false
    }));
    antennaTip.position.set(.2, PLATFORM_TOP + 13.8, -6.7);
    g.add(antennaTip);
    addGlowSprite(g, 16735551, .2, PLATFORM_TOP + 13.8, -6.65, .65, .35);
    floatGroup.add(g);
}

buildRackCrown();

const screenCanvas = createScreenCanvas();

const screenTexture = makeCanvasTexture(screenCanvas.canvas);

screenTexture.minFilter = THREE.LinearFilter;

const screenMaterial = new THREE.MeshBasicMaterial({
    map: screenTexture,
    toneMapped: false
});

screenMaterial.color.setScalar(1.8);

const screenGroup = new THREE.Group;

const screenBezel = addBox(screenGroup, 1.62, 1, .06, M.softBlack, 0, 0, 0);

const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.48, .84), screenMaterial);

screenMesh.position.z = .036;

screenGroup.add(screenMesh);

screenGroup.position.set(.88, PLATFORM_TOP + 5.15, -4.39);

floatGroup.add(screenGroup);

addGlowSprite(floatGroup, 2787071, .88, PLATFORM_TOP + 5.15, -4.28, 1.8, .12);

function drawScreen(t) {
    const {ctx: ctx, W: W, H: H} = screenCanvas;
    ctx.fillStyle = "#02080e";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(72,137,179,.09)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 24) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
    }
    for (let y = 0; y < H; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
    }
    ctx.fillStyle = "rgba(127,220,255,.92)";
    ctx.font = "700 22px monospace";
    ctx.fillText("ALGORITHM CORE", 22, 35);
    ctx.fillStyle = "rgba(86,177,230,.54)";
    ctx.font = "12px monospace";
    ctx.fillText("STAGING 07  /  NODE 19  /  04:37", 22, 55);
    ctx.strokeStyle = "rgba(96,192,247,.4)";
    ctx.beginPath();
    ctx.moveTo(22, 65);
    ctx.lineTo(W - 22, 65);
    ctx.stroke();
    ctx.strokeStyle = "rgba(72,214,255,.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 22; x < W - 150; x += 4) {
        const p = (x - 22) / (W - 172);
        const y = 118 + Math.sin(p * 11.2 + t * 1.8) * 14 + Math.sin(p * 31 - t * 2.7) * 5 + Math.sin(p * 73 + t * .6) * 2.2;
        if (x === 22) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = "rgba(72,214,255,.12)";
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.fillStyle = "rgba(154,235,255,.95)";
    ctx.font = '300 62px "Arial Narrow", Arial, sans-serif';
    ctx.fillText("98.7", W - 145, 120);
    ctx.fillStyle = "rgba(98,188,230,.6)";
    ctx.font = "12px monospace";
    ctx.fillText("SYNC", W - 139, 139);
    const nodes = [ [ 36, 205 ], [ 98, 176 ], [ 153, 219 ], [ 215, 189 ], [ 272, 230 ], [ 326, 184 ] ];
    ctx.strokeStyle = "rgba(84,164,214,.34)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < nodes.length - 1; i++) {
        ctx.moveTo(nodes[i][0], nodes[i][1]);
        ctx.lineTo(nodes[i + 1][0], nodes[i + 1][1]);
    }
    ctx.stroke();
    for (let i = 0; i < nodes.length; i++) {
        const pulse = .5 + .5 * Math.sin(t * 2.1 + i);
        ctx.fillStyle = `rgba(128,225,255,${.25 + pulse * .65})`;
        ctx.beginPath();
        ctx.arc(nodes[i][0], nodes[i][1], 3 + pulse * 1.3, 0, TAU);
        ctx.fill();
    }
    ctx.font = "10px monospace";
    for (let i = 0; i < 4; i++) {
        const y = 172 + i * 16;
        const base = [ "SYNC  0x3F9A", "BUS   07.42", "LOAD  0.914", "TX    19/19" ][i];
        ctx.fillStyle = `rgba(85,167,211,${.32 + Math.sin(t + i) * .08})`;
        ctx.fillText(base, W - 176, y + 5);
    }
    const scanY = 70 + t * 28 % (H - 80);
    const grad = ctx.createLinearGradient(0, scanY - 14, 0, scanY + 14);
    grad.addColorStop(0, "rgba(86,198,255,0)");
    grad.addColorStop(.5, "rgba(110,218,255,.10)");
    grad.addColorStop(1, "rgba(86,198,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, scanY - 14, W, 28);
    screenTexture.needsUpdate = true;
}

drawScreen(0);

function buildWhiteArch() {
    const g = new THREE.Group;
    g.name = "White parade arch";
    g.position.set(5.25, 5.25, -8.35);
    g.rotation.y = -.17;
    const arc = Math.PI * 1.52;
    const rotZ = -THREE.MathUtils.degToRad(46.8);
    const mainMat = new THREE.MeshPhysicalMaterial({
        color: 13223610,
        metalness: .16,
        roughness: .52,
        clearcoat: .42,
        clearcoatRoughness: .4,
        envMapIntensity: .48
    });
    const main = new THREE.Mesh(new THREE.TorusGeometry(4.15, .42, 20, 128, arc), mainMat);
    main.rotation.z = rotZ;
    main.scale.set(.92, 1.04, 1);
    main.castShadow = true;
    g.add(main);
    const second = new THREE.Mesh(new THREE.TorusGeometry(3.48, .135, 10, 110, arc), M.silver);
    second.rotation.z = rotZ + .04;
    second.scale.set(.92, 1.04, 1);
    second.castShadow = true;
    g.add(second);
    const inlayMat = new THREE.MeshStandardMaterial({
        color: 729936,
        metalness: .58,
        roughness: .32,
        emissive: 1064078,
        emissiveIntensity: .2
    });
    const inlay = new THREE.Mesh(new THREE.TorusGeometry(3.82, .13, 8, 110, arc), inlayMat);
    inlay.rotation.z = rotZ;
    inlay.scale.set(.92, 1.04, 1);
    g.add(inlay);
    const plateGeo = new THREE.BoxGeometry(.27, .16, .07);
    const plateMat = new THREE.MeshStandardMaterial({
        vertexColors: false,
        metalness: .52,
        roughness: .3
    });
    const plateCount = 96;
    const plates = new THREE.InstancedMesh(plateGeo, plateMat, plateCount);
    const dummy = new THREE.Object3D;
    const palette = [ 15197658, 13095388, 1527466, 929654, 10337248, 12030540 ];
    const col = new THREE.Color;
    for (let i = 0; i < plateCount; i++) {
        const a = rotZ + i / (plateCount - 1) * arc;
        const rr0 = 3.6 + i % 3 * .08;
        dummy.position.set(Math.cos(a) * rr0 * .92, Math.sin(a) * rr0 * 1.04, .22);
        dummy.rotation.set(.15 * Math.sin(i * 1.7), .35 * Math.cos(i * .7), a + Math.PI / 2);
        dummy.scale.set(.8 + i % 4 * .11, .8 + i % 5 * .08, 1);
        dummy.updateMatrix();
        plates.setMatrixAt(i, dummy.matrix);
        col.setHex(palette[i % palette.length]);
        plates.setColorAt(i, col);
    }
    plates.instanceMatrix.needsUpdate = true;
    if (plates.instanceColor) plates.instanceColor.needsUpdate = true;
    g.add(plates);
    for (const a of [ rotZ, rotZ + arc ]) {
        const x = Math.cos(a) * 4.15 * .92;
        const y = Math.sin(a) * 4.15 * 1.04;
        addBox(g, .35, .58, .4, M.darkSteel, x, y - .3, -.05);
        addBox(g, .22, .1, .22, M.steel, x, y - .02, .03);
    }
    addGlowSprite(g, 13624575, -3.3, 3.8, -.4, 3.2, .175);
    addGlowSprite(g, 11982335, 3.54, 1.6, -.2, 2.2, .16);
    addGlowSprite(g, 14478079, .4, 4.8, -.7, 3.6, .12);
    floatGroup.add(g);
    return g;
}

buildWhiteArch();

function createShedSkirt(parent, count, frontZ, sideX, width) {
    const geo = makeFringeStripGeometry();
    const silverMat = new THREE.MeshStandardMaterial({
        color: 16777215,
        metalness: 1,
        roughness: .2,
        side: THREE.DoubleSide,
        envMapIntensity: 1.8
    });
    const blueMat = new THREE.MeshStandardMaterial({
        color: 16777215,
        metalness: .85,
        roughness: .28,
        side: THREE.DoubleSide,
        envMapIntensity: 1.4
    });
    const silver = new THREE.InstancedMesh(geo, silverMat, Math.floor(count * .6));
    const blue = new THREE.InstancedMesh(geo, blueMat, Math.floor(count * .4));
    const dummy = new THREE.Object3D;
    const col = new THREE.Color;
    const silverColors = [ 14278885, 15725556, 11056059, 16382972 ];
    const blueColors = [ 1391526, 2253039, 662882, 5082111, 666248 ];
    for (let i = 0; i < silver.count; i++) {
        const side = i > silver.count * .85;
        const x = side ? sideX + rr(-.03, .06) : rr(-width / 2, width / 2);
        const z = side ? rr(-1.5, 1.45) : frontZ + rr(-.015, .07);
        dummy.position.set(x, .45, z);
        dummy.rotation.set(rr(-.05, .05), side ? Math.PI / 2 + rr(-.25, .25) : rr(-.25, .25), rr(-.06, .06));
        dummy.scale.set(rr(.035, .08), rr(.6, .86), 1);
        dummy.updateMatrix();
        silver.setMatrixAt(i, dummy.matrix);
        col.setHex(silverColors[Math.floor(rr(0, silverColors.length))]);
        silver.setColorAt(i, col);
    }
    for (let i = 0; i < blue.count; i++) {
        const side = i > blue.count * .87;
        const x = side ? sideX + rr(-.02, .02) : rr(-width / 2, width / 2);
        const z = side ? rr(-1.45, 1.4) : frontZ - .045 + rr(-.02, .02);
        dummy.position.set(x, .42, z);
        dummy.rotation.set(rr(-.05, .05), side ? Math.PI / 2 + rr(-.3, .3) : rr(-.3, .3), rr(-.04, .04));
        dummy.scale.set(rr(.04, .095), rr(.55, .85), 1);
        dummy.updateMatrix();
        blue.setMatrixAt(i, dummy.matrix);
        col.setHex(blueColors[Math.floor(rr(0, blueColors.length))]);
        blue.setColorAt(i, col);
    }
    silver.instanceMatrix.needsUpdate = true;
    blue.instanceMatrix.needsUpdate = true;
    if (silver.instanceColor) silver.instanceColor.needsUpdate = true;
    if (blue.instanceColor) blue.instanceColor.needsUpdate = true;
    parent.add(blue, silver);
}

function buildShed() {
    const g = new THREE.Group;
    g.name = "Workshop shed float";
    g.position.set(9.35, 0, -7.25);
    g.rotation.y = -.06;
    addBox(g, 4.3, .23, 3.55, M.black, 0, .115, 0);
    addContactShadow(world, 9.25, -7.2, 6.2, 4.8, .28);
    createShedSkirt(g, 330, 1.82, 2.17, 4.2);
    addBox(g, 4.36, .07, 3.62, M.steel, 0, .31, 0);
    const floorY = .35;
    const postPositions = [ [ -1.72, floorY, 1.42 ], [ 1.72, floorY, 1.42 ], [ -1.72, floorY, -1.45 ], [ 1.72, floorY, -1.45 ] ];
    for (const [x, y, z] of postPositions) {
        addBox(g, .16, 2.55, .16, M.wood, x, y + 1.275, z, {
            cast: true
        });
    }
    addBox(g, 3.7, .18, .17, M.wood, 0, floorY + .1, 1.42, {
        cast: true
    });
    addBox(g, 3.7, .16, .16, M.wood, 0, floorY + 2.46, 1.42, {
        cast: true
    });
    addBox(g, 3.7, .18, .17, M.wood, 0, floorY + .1, -1.45);
    addBox(g, 3.7, .16, .16, M.wood, 0, floorY + 2.46, -1.45);
    addBox(g, 3.5, .14, .14, M.wood, 0, floorY + 2.45, 1.43);
    const wallMat = new THREE.MeshStandardMaterial({
        map: woodTexture,
        color: 14274491,
        roughness: .78,
        metalness: .02
    });
    addBox(g, .08, 2.2, 2.72, wallMat, -1.73, floorY + 1.2, -.02, {
        cast: true
    });
    addBox(g, .08, 2.2, 2.72, wallMat, 1.73, floorY + 1.2, -.02, {
        cast: true
    });
    addBox(g, 3.36, 2.2, .08, wallMat, 0, floorY + 1.2, -1.42, {
        cast: true
    });
    for (const x of [ -1.12, -.38, .38, 1.12 ]) {
        addBox(g, .035, 2.1, .03, M.wood, x, floorY + 1.18, -1.37);
    }
    const gableShape = new THREE.Shape;
    gableShape.moveTo(-1.78, 0);
    gableShape.lineTo(0, 1.02);
    gableShape.lineTo(1.78, 0);
    gableShape.closePath();
    const gable = new THREE.Mesh(new THREE.ShapeGeometry(gableShape), new THREE.MeshStandardMaterial({
        map: woodTexture,
        color: 13747631,
        roughness: .77,
        side: THREE.DoubleSide
    }));
    gable.position.set(0, floorY + 2.48, 1.44);
    g.add(gable);
    beamBetween(g, new THREE.Vector3(-1.86, floorY + 2.44, 1.47), new THREE.Vector3(0, floorY + 3.5, 1.47), .15, .13, M.wood);
    beamBetween(g, new THREE.Vector3(0, floorY + 3.5, 1.47), new THREE.Vector3(1.86, floorY + 2.44, 1.47), .15, .13, M.wood);
    const roofAngle = Math.atan2(1.05, 1.86);
    const roofPanelMat = new THREE.MeshStandardMaterial({
        map: woodTexture,
        color: 16777215,
        roughness: .74,
        metalness: .02
    });
    const roofL = new THREE.Mesh(new THREE.BoxGeometry(2.12, .1, 3.2), roofPanelMat);
    roofL.position.set(-.94, floorY + 2.99, 0);
    roofL.rotation.z = roofAngle;
    roofL.castShadow = true;
    g.add(roofL);
    const roofR = new THREE.Mesh(new THREE.BoxGeometry(2.12, .1, 3.2), roofPanelMat);
    roofR.position.set(.94, floorY + 2.99, 0);
    roofR.rotation.z = -roofAngle;
    roofR.castShadow = true;
    g.add(roofR);
    addBox(g, 3.9, .08, .11, M.woodTrim, 0, floorY + 3.54, 1.47);
    for (let z = -1.4; z <= 1.4; z += .46) {
        const battenL = new THREE.Mesh(new THREE.BoxGeometry(2.18, .035, .06), M.woodTrim);
        battenL.position.set(-.94, floorY + 3.055, z);
        battenL.rotation.z = roofAngle;
        g.add(battenL);
        const battenR = new THREE.Mesh(new THREE.BoxGeometry(2.18, .035, .06), M.woodTrim);
        battenR.position.set(.94, floorY + 3.055, z);
        battenR.rotation.z = -roofAngle;
        g.add(battenR);
    }
    const glowPanel = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.7), new THREE.MeshBasicMaterial({
        color: 16758383,
        transparent: true,
        opacity: .24,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
    }));
    glowPanel.position.set(0, floorY + 1.22, -1.31);
    g.add(glowPanel);
    addBox(g, 1.4, .52, .55, M.woodTrim, .7, floorY + .33, -.55, {
        cast: true
    });
    addBox(g, .9, .38, .4, M.darkSteel, -.8, floorY + .24, -.75);
    addBox(g, .45, .8, .35, M.steel, 1.2, floorY + .4, -1.02);
    addGlowSprite(g, 16758378, 0, floorY + 1.4, -.9, 3.9, .24);
    addCylinder(g, .005, .005, .7, M.black, 0, floorY + 2.6, .15, 4);
    const shedBulb = new THREE.Mesh(new THREE.SphereGeometry(.1, 10, 8), new THREE.MeshBasicMaterial({
        color: new THREE.Color(16765596).multiplyScalar(2.2),
        toneMapped: false
    }));
    shedBulb.position.set(0, floorY + 2.22, .15);
    g.add(shedBulb);
    const shedGlow = addGlowSprite(g, 16757097, 0, floorY + 2.24, .15, 2.4, .42);
    shedGlow.material.color.multiplyScalar(1.35);
    const stringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(16766109).multiplyScalar(1.9),
        toneMapped: false
    });
    for (let i = 0; i < 17; i++) {
        const t = i / 16;
        const x = -1.78 + t * 3.56;
        const y = floorY + 2.47 + Math.sin(t * Math.PI) * .16;
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(.037, 6, 5), stringMat);
        bulb.position.set(x, y, 1.51);
        g.add(bulb);
        if (i % 3 === 0) addGlowSprite(g, 16761216, x, y, 1.55, .55, .22);
    }
    const signCanvas = canvas2d(512, 160);
    signCanvas.ctx.fillStyle = "#211b16";
    signCanvas.ctx.fillRect(0, 0, 512, 160);
    signCanvas.ctx.strokeStyle = "rgba(231,219,194,.55)";
    signCanvas.ctx.lineWidth = 5;
    signCanvas.ctx.strokeRect(12, 12, 488, 136);
    signCanvas.ctx.fillStyle = "rgba(238,225,199,.9)";
    signCanvas.ctx.font = '700 58px "Arial Narrow", Arial, sans-serif';
    signCanvas.ctx.textAlign = "center";
    signCanvas.ctx.fillText("STAGING 19", 256, 78);
    signCanvas.ctx.font = "26px monospace";
    signCanvas.ctx.fillStyle = "rgba(231,216,186,.62)";
    signCanvas.ctx.fillText("NIGHT SHIFT · CREW OF 12", 256, 118);
    const signTex = makeCanvasTexture(signCanvas.canvas);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.45, .46), new THREE.MeshBasicMaterial({
        map: signTex,
        toneMapped: false
    }));
    sign.position.set(0, floorY + 2.87, 1.47);
    g.add(sign);
    floatGroup.add(g);
    return g;
}

buildShed();

function buildGlobe() {
    const g = new THREE.Group;
    g.name = "Map globe prop";
    g.position.set(-8.35, 0, 1.4);
    addCylinder(g, .92, 1.12, .22, M.darkSteel, 0, .11, 0, 24);
    addCylinder(g, .62, .8, .82, M.navyPaint, 0, .61, 0, 24);
    addCylinder(g, .74, .65, .1, M.steel, 0, 1.06, 0, 24);
    addCylinder(g, .09, .13, 1.28, M.steel, 0, 1.55, 0, 12);
    const baseGlow = addGlowSprite(g, 4432639, 0, 1.08, .25, 2.8, .13);
    const globeMat = new THREE.MeshPhysicalMaterial({
        map: globeTexture,
        color: 9018028,
        metalness: .2,
        roughness: .62,
        clearcoat: .24,
        clearcoatRoughness: .48,
        envMapIntensity: .42,
        emissive: 397598,
        emissiveIntensity: .32
    });
    const globe = new THREE.Mesh(new THREE.SphereGeometry(2.16, 76, 54), globeMat);
    globe.position.y = 3.28;
    globe.rotation.y = Math.PI * .27;
    globe.rotation.z = .14;
    globe.castShadow = true;
    globe.receiveShadow = true;
    g.add(globe);
    const ringMat = new THREE.MeshStandardMaterial({
        color: 11844544,
        metalness: 1,
        roughness: .22
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.34, .045, 8, 90, Math.PI * 1.7), ringMat);
    ring.position.y = 3.28;
    ring.rotation.set(.14, .2, .35);
    g.add(ring);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.42, .027, 6, 90, Math.PI * 1.35), M.gold);
    ring2.position.y = 3.28;
    ring2.rotation.set(.38, -.4, 1.85);
    g.add(ring2);
    rodBetween(g, new THREE.Vector3(0, 1.05, 0), new THREE.Vector3(-.28, 2.36, 0), .09, M.steel, 10);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(.17, 12, 10), M.chrome);
    cap.position.set(-.28, 2.36, 0);
    g.add(cap);
    const crescent = new THREE.Mesh(new THREE.TorusGeometry(3.06, .19, 10, 90, Math.PI * .95), new THREE.MeshStandardMaterial({
        color: 461842,
        metalness: .88,
        roughness: .3
    }));
    crescent.position.set(-.25, 4, -.9);
    crescent.rotation.set(.12, .18, -.55);
    crescent.castShadow = true;
    g.add(crescent);
    const crescentEdge = new THREE.Mesh(new THREE.TorusGeometry(3.06, .027, 6, 90, Math.PI * .95), M.silver);
    crescentEdge.position.copy(crescent.position);
    crescentEdge.rotation.copy(crescent.rotation);
    g.add(crescentEdge);
    const plaqueCanvas = canvas2d(512, 128);
    plaqueCanvas.ctx.fillStyle = "#352913";
    plaqueCanvas.ctx.fillRect(0, 0, 512, 128);
    plaqueCanvas.ctx.strokeStyle = "rgba(241,214,158,.7)";
    plaqueCanvas.ctx.lineWidth = 4;
    plaqueCanvas.ctx.strokeRect(10, 10, 492, 108);
    plaqueCanvas.ctx.fillStyle = "rgba(243,216,160,.92)";
    plaqueCanvas.ctx.font = '600 44px "Arial Narrow", Arial, sans-serif';
    plaqueCanvas.ctx.textAlign = "center";
    plaqueCanvas.ctx.fillText("THE WORLD, 04:37", 256, 65);
    plaqueCanvas.ctx.font = "22px monospace";
    plaqueCanvas.ctx.fillStyle = "rgba(240,213,158,.58)";
    plaqueCanvas.ctx.fillText("PROP 19 / PARADE OPS", 256, 100);
    const plaqueTex = makeCanvasTexture(plaqueCanvas.canvas);
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.35, .34), new THREE.MeshStandardMaterial({
        map: plaqueTex,
        metalness: .5,
        roughness: .42
    }));
    plaque.position.set(0, .58, .77);
    g.add(plaque);
    addContactShadow(world, -8.35, 1.4, 4.1, 3.4, .3);
    floatGroup.add(g);
    return g;
}

buildGlobe();

function buildCircuitPanel() {
    const g = new THREE.Group;
    g.name = "Circuit-pattern side panel";
    g.position.set(-6.15, 0, 1.6);
    g.rotation.y = .065;
    const boardMat = new THREE.MeshStandardMaterial({
        map: circuitTexture,
        emissiveMap: circuitTexture,
        emissive: 4885456,
        emissiveIntensity: .55,
        metalness: .48,
        roughness: .27,
        envMapIntensity: 1
    });
    const edgeMat = M.darkSteel;
    const board = new THREE.Mesh(new THREE.BoxGeometry(3.72, 2.95, .14), [ edgeMat, edgeMat, edgeMat, edgeMat, boardMat, edgeMat ]);
    board.position.y = 1.9;
    board.castShadow = true;
    board.receiveShadow = true;
    g.add(board);
    addBox(g, 3.86, .055, .19, M.steel, 0, 3.39, 0);
    addBox(g, 3.86, .055, .19, M.steel, 0, .43, 0);
    addBox(g, .055, 2.98, .19, M.steel, -1.9, 1.9, 0);
    addBox(g, .055, 2.98, .19, M.steel, 1.9, 1.9, 0);
    addBox(g, .1, 1.3, .1, M.darkSteel, -1.32, .3, -.28);
    addBox(g, .1, 1.3, .1, M.darkSteel, 1.32, .3, -.28);
    addBox(g, 2.4, .07, .26, M.darkSteel, 0, .09, -.04);
    for (const x of [ -1.44, 1.44 ]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, .065, 12), M.blackRubber);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, .08, .22);
        g.add(wheel);
    }
    const chipRng = mulberry32(3312);
    for (let i = 0; i < 8; i++) {
        const w = .18 + chipRng() * .38;
        const h = .1 + chipRng() * .2;
        const x = -1.55 + chipRng() * 3.1;
        const y = .8 + chipRng() * 2.1;
        addBox(g, w, h, .03, M.darkSteel, x, y, .095);
        addBox(g, w * .72, .022, .022, M.steel, x, y + h * .2, .115);
        const led = new THREE.Mesh(new THREE.SphereGeometry(.012, 5, 4), new THREE.MeshBasicMaterial({
            color: 6870783,
            toneMapped: false
        }));
        led.position.set(x - w * .3, y - h * .3, .12);
        g.add(led);
    }
    for (let i = 0; i < 7; i++) {
        const stud = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, .028, 12), M.steel);
        stud.rotation.x = Math.PI / 2;
        stud.position.set(-1.5 + chipRng() * 3, .65 + chipRng() * 2.35, .11);
        g.add(stud);
    }
    addGlowSprite(g, 5019625, 0, 2, .35, 3.1, .16);
    const boardLight = new THREE.SpotLight(11127272, 95, 11, .62, .9, 1.5);
    boardLight.position.set(-4.2, 5.6, 5);
    boardLight.target = createLightTarget(-6.15, 1.8, 1.6);
    scene.add(boardLight);
    lighting.boardLight = boardLight;
    addContactShadow(world, -6.15, 1.65, 4.5, 2.1, .28);
    floatGroup.add(g);
    return g;
}

buildCircuitPanel();

function buildLadder() {
    const g = new THREE.Group;
    g.name = "Orange step ladder";
    g.position.set(.5, 0, 7.2);
    g.rotation.y = .055;
    g.scale.setScalar(1.2);
    const orangeMat = new THREE.MeshStandardMaterial({
        color: 10368269,
        metalness: 0,
        roughness: .7,
        envMapIntensity: .55
    });
    const orangeDarkMat = new THREE.MeshStandardMaterial({
        color: 7939848,
        metalness: .05,
        roughness: .58
    });
    const rubber = M.blackRubber;
    const topY = 2.65;
    const halfW = .37;
    const frontBottomZ = .58;
    const rearBottomZ = -.58;
    const frontTopZ = .035;
    const rearTopZ = -.035;
    const railPairs = [ [ -halfW, frontBottomZ, frontTopZ ], [ halfW, frontBottomZ, frontTopZ ], [ -halfW, rearBottomZ, rearTopZ ], [ halfW, rearBottomZ, rearTopZ ] ];
    for (const [x, bz, tz] of railPairs) {
        beamBetween(g, new THREE.Vector3(x, .075, bz), new THREE.Vector3(x, topY, tz), .085, .13, orangeMat, {
            cast: true
        });
    }
    const stepYs = [ .28, .61, .94, 1.27, 1.6, 1.93, 2.26 ];
    for (let i = 0; i < stepYs.length; i++) {
        const y = stepYs[i];
        const t = y / topY;
        const z = lerp(frontBottomZ, frontTopZ, t) + .07;
        addBox(g, .74, .06, .22, orangeMat, 0, y, z, {
            cast: true
        });
        addBox(g, .7, .012, .18, M.midSteel, 0, y + .036, z + .006);
        addBox(g, .58, .01, .13, M.softBlack, 0, y + .044, z + .017);
        addBox(g, .72, .018, .022, orangeDarkMat, 0, y - .022, z + .088);
        addBox(g, .72, .018, .022, orangeDarkMat, 0, y - .022, z - .088);
    }
    addBox(g, .78, .065, .34, orangeMat, 0, topY, .04, {
        cast: true
    });
    addBox(g, .68, .014, .22, M.softBlack, 0, topY + .04, .04);
    const ladderSign = canvas2d(512, 192);
    ladderSign.ctx.fillStyle = "#e9e6d8";
    ladderSign.ctx.fillRect(0, 0, 512, 192);
    ladderSign.ctx.fillStyle = "#bb3e17";
    ladderSign.ctx.fillRect(0, 0, 512, 26);
    ladderSign.ctx.fillStyle = "#25211a";
    ladderSign.ctx.font = '900 68px "Arial Narrow", Arial, sans-serif';
    ladderSign.ctx.textAlign = "center";
    ladderSign.ctx.fillText("GREEN", 256, 110);
    ladderSign.ctx.font = "600 25px monospace";
    ladderSign.ctx.fillStyle = "rgba(37,33,26,.65)";
    ladderSign.ctx.fillText("TYPE IA · 300 LB", 256, 150);
    const ladderSignTex = makeCanvasTexture(ladderSign.canvas);
    const ladderLabel = new THREE.Mesh(new THREE.PlaneGeometry(.42, .18), new THREE.MeshBasicMaterial({
        map: ladderSignTex,
        toneMapped: false
    }));
    ladderLabel.position.set(.18, 2.49, .221);
    g.add(ladderLabel);
    const warn = new THREE.Mesh(new THREE.PlaneGeometry(.2, .1), new THREE.MeshBasicMaterial({
        map: warningTexture,
        toneMapped: false
    }));
    warn.position.set(-.25, 2.48, .221);
    g.add(warn);
    const hingeY = 2.53;
    for (const x of [ -halfW, halfW ]) {
        addCylinder(g, .045, .045, .12, M.steel, x, hingeY, 0, 10).rotation.z = Math.PI / 2;
        addCylinder(g, .028, .028, .12, M.steel, x, hingeY - .1, 0, 8).rotation.z = Math.PI / 2;
    }
    rodBetween(g, new THREE.Vector3(-.32, 1.25, .32), new THREE.Vector3(-.32, 1.22, -.33), .018, M.steel, 6);
    rodBetween(g, new THREE.Vector3(.32, 1.25, .32), new THREE.Vector3(.32, 1.22, -.33), .018, M.steel, 6);
    rodBetween(g, new THREE.Vector3(-.35, 1.25, .15), new THREE.Vector3(.35, 1.25, .15), .014, M.steel, 6);
    addBox(g, .12, .08, .3, M.darkSteel, 0, 1.08, -.2);
    for (const [x, z] of [ [ -halfW, frontBottomZ ], [ halfW, frontBottomZ ], [ -halfW, rearBottomZ ], [ halfW, rearBottomZ ] ]) {
        addBox(g, .1, .07, .17, rubber, x, .035, z, {
            cast: true
        });
    }
    addBox(g, .78, .035, .06, M.blackRubber, 0, topY + .075, .17);
    addContactShadow(world, .5, 7.2, 2.7, 2.5, .36);
    g.rotation.y = -.14;
    floatGroup.add(g);
    return g;
}

buildLadder();

function makeCaseStencilTexture() {
    const {canvas: c, ctx: ctx} = canvas2d(768, 384);
    ctx.clearRect(0, 0, 768, 384);
    ctx.strokeStyle = "rgba(225,228,222,.62)";
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, 736, 352);
    ctx.strokeStyle = "rgba(225,228,222,.22)";
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, 708, 324);
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(238,238,228,.82)";
    ctx.font = '700 84px "Arial Narrow", Arial, sans-serif';
    ctx.fillText("ALGORITHM", 384, 150);
    ctx.font = '700 72px "Arial Narrow", Arial, sans-serif';
    ctx.fillText("STAGE KIT · 19", 384, 236);
    ctx.font = "600 26px monospace";
    ctx.fillStyle = "rgba(228,229,219,.5)";
    ctx.fillText("PARADE OPS / HANGAR 7 / DO NOT LOAD", 384, 290);
    ctx.font = "500 21px monospace";
    ctx.fillStyle = "rgba(228,229,219,.36)";
    ctx.fillText("RUSH  ·  HANDLE WITH CARE  ·  04:37", 384, 328);
    ctx.save();
    ctx.translate(88, 42);
    ctx.rotate(-.08);
    ctx.fillStyle = "rgba(203,98,33,.78)";
    ctx.fillRect(0, 0, 168, 22);
    ctx.restore();
    ctx.fillStyle = "rgba(205,102,36,.6)";
    ctx.fillRect(574, 328, 130, 18);
    const rng = mulberry32(9912);
    for (let i = 0; i < 80; i++) {
        ctx.fillStyle = `rgba(7,9,10,${.08 + rng() * .22})`;
        ctx.fillRect(rng() * 768, rng() * 384, 1 + rng() * 20, 1 + rng() * 3);
    }
    return makeCanvasTexture(c, {
        srgb: true
    });
}

const caseStencilTexture = makeCaseStencilTexture();

function buildRoadCase(x, z, w, h, d, labelTex, rotation = 0, scale = 1) {
    const g = new THREE.Group;
    g.position.set(x, 0, z);
    g.rotation.y = rotation;
    g.scale.setScalar(scale);
    const bodyMat = new THREE.MeshStandardMaterial({
        map: caseShellTexture,
        color: 9409948,
        metalness: .3,
        roughness: .58,
        envMapIntensity: .28
    });
    const wheelY = .16;
    addBox(g, w, h, d, bodyMat, 0, wheelY + h / 2, 0, {
        cast: true,
        receive: true
    });
    const trim = .055;
    for (const xEdge of [ -w / 2 + trim / 2, w / 2 - trim / 2 ]) {
        for (const zEdge of [ -d / 2 + trim / 2, d / 2 - trim / 2 ]) {
            addBox(g, trim, h, trim, M.steel, xEdge, wheelY + h / 2, zEdge, {
                cast: true
            });
        }
    }
    for (const yEdge of [ wheelY, wheelY + h ]) {
        for (const zEdge of [ -d / 2 + trim / 2, d / 2 - trim / 2 ]) {
            addBox(g, w, trim, trim, M.steel, 0, yEdge, zEdge);
        }
        for (const xEdge of [ -w / 2 + trim / 2, w / 2 - trim / 2 ]) {
            addBox(g, trim, trim, d, M.steel, xEdge, yEdge, 0);
        }
    }
    for (const sx of [ -1, 1 ]) {
        for (const sy of [ -1, 1 ]) {
            for (const sz of [ -1, 1 ]) {
                const corner = new THREE.Mesh(new THREE.SphereGeometry(.095, 10, 8), M.steel);
                corner.position.set(sx * w / 2 - sx * .04, wheelY + h / 2 + sy * h / 2 - sy * .04, sz * d / 2 - sz * .04);
                g.add(corner);
            }
        }
    }
    addBox(g, .035, h * .92, .025, M.darkSteel, 0, wheelY + h / 2, d / 2 + .004);
    const latchMat = new THREE.MeshStandardMaterial({
        color: 1514012,
        metalness: .9,
        roughness: .28
    });
    for (const lx of [ -w * .31, w * .31 ]) {
        for (const ly of [ wheelY + h * .3, wheelY + h * .78 ]) {
            addBox(g, .18, .12, .035, latchMat, lx, ly, d / 2 + .018);
            addBox(g, .1, .035, .045, M.steel, lx, ly + .02, d / 2 + .038);
            const rivet = new THREE.Mesh(new THREE.SphereGeometry(.016, 6, 5), M.chrome);
            rivet.position.set(lx + .04, ly - .025, d / 2 + .044);
            g.add(rivet);
        }
    }
    for (const sx of [ -1, 1 ]) {
        addBox(g, .04, .3, .1, M.steel, sx * (w / 2 + .02), wheelY + h * .62, .06);
        addBox(g, .04, .3, .1, M.steel, sx * (w / 2 + .02), wheelY + h * .62, -d * .3);
        rodBetween(g, new THREE.Vector3(sx * (w / 2 + .05), wheelY + h * .62 + .15, .06), new THREE.Vector3(sx * (w / 2 + .05), wheelY + h * .62 + .15, -d * .3), .02, M.steel, 6);
    }
    if (labelTex) {
        const stencil = new THREE.Mesh(new THREE.PlaneGeometry(1.6, .8), new THREE.MeshBasicMaterial({
            map: caseStencilTexture,
            transparent: true,
            toneMapped: false,
            color: 13554641
        }));
        stencil.position.set(.08, wheelY + h * .52, d / 2 + .05);
        stencil.renderOrder = 3;
        g.add(stencil);
        const label = new THREE.Mesh(new THREE.PlaneGeometry(.82, .4), new THREE.MeshBasicMaterial({
            map: labelTex,
            transparent: true,
            toneMapped: false
        }));
        label.position.set(-w * .3, wheelY + h * .2, d / 2 + .045);
        g.add(label);
        const sideLabel = new THREE.Mesh(new THREE.PlaneGeometry(.92, .46), new THREE.MeshBasicMaterial({
            map: labelTex,
            transparent: true,
            toneMapped: false,
            color: 14870504
        }));
        sideLabel.rotation.y = Math.PI / 2;
        sideLabel.position.set(w / 2 + .012, wheelY + h * .5, -d * .1);
        g.add(sideLabel);
        for (const sy of [ wheelY + .06, wheelY + h - .06 ]) {
            addBox(g, .075, .075, d, M.chrome, w / 2, sy, 0, {
                cast: true
            });
        }
    }
    for (const sx of [ -1, 1 ]) {
        for (const sz of [ -1, 1 ]) {
            const wheelX = sx * (w * .35);
            const wheelZ = sz * (d * .32);
            addBox(g, .12, .16, .16, M.steel, wheelX, .14, wheelZ);
            const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .09, 16), M.blackRubber);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(wheelX + .02, .13, wheelZ);
            wheel.castShadow = true;
            g.add(wheel);
        }
    }
    const rng = mulberry32(Math.floor(5e3 + x * 17 + z * 31));
    const coilPts = [];
    for (let i = 0; i < 6; i++) {
        coilPts.push(new THREE.Vector3(rr(-.5, .5), wheelY + h + .035, rr(-.2, .2)));
    }
    const coilCurve = new THREE.CatmullRomCurve3(coilPts, false, "centripetal");
    const coil = new THREE.Mesh(new THREE.TubeGeometry(coilCurve, 40, .018, 5, false), M.blackRubber);
    g.add(coil);
    addBox(g, .22, .1, .16, M.darkSteel, w * .25, wheelY + h + .1, -.2);
    const led = new THREE.Mesh(new THREE.SphereGeometry(.018, 6, 5), new THREE.MeshBasicMaterial({
        color: 16736067,
        toneMapped: false
    }));
    led.position.set(w * .25, wheelY + h + .155, -.16);
    g.add(led);
    addContactShadow(world, x, z, w * 2.4, d * 2.2, .34);
    floatGroup.add(g);
    return g;
}

buildRoadCase(-5.05, 7, 3, 2.25, 2.15, caseLabelTexture, .57, 1);

buildRoadCase(-8.1, 4.75, 2.15, 1.55, 1.65, null, .22, 1);

buildRoadCase(-7.9, 9.65, 1.55, 1.1, 1.2, null, -.35, 1);

const rampLabelTexture = makeRampLabelTexture();

function buildCableRamp(x, z, rotation, length = 4.6) {
    const g = new THREE.Group;
    g.position.set(x, .015, z);
    g.rotation.y = rotation;
    const shape = new THREE.Shape;
    shape.moveTo(-.62, 0);
    shape.lineTo(-.62, .035);
    shape.lineTo(-.48, .148);
    shape.lineTo(-.27, .158);
    shape.lineTo(.27, .158);
    shape.lineTo(.48, .148);
    shape.lineTo(.62, .035);
    shape.lineTo(.62, 0);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, {
        depth: length,
        bevelEnabled: true,
        bevelThickness: .018,
        bevelSize: .02,
        bevelSegments: 2,
        steps: 1
    });
    geo.translate(0, 0, -length / 2);
    const rampBodyMat = new THREE.MeshStandardMaterial({
        color: 1514013,
        metalness: .22,
        roughness: .71,
        envMapIntensity: .35
    });
    const body = new THREE.Mesh(geo, rampBodyMat);
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);
    const topMat = new THREE.MeshStandardMaterial({
        map: rampTexture,
        color: 1513235,
        metalness: .01,
        roughness: .94,
        emissive: 131585,
        emissiveIntensity: .04
    });
    const top = new THREE.Mesh(new THREE.PlaneGeometry(.79, length - .08), topMat);
    top.rotation.x = -Math.PI / 2;
    top.position.y = .159;
    top.receiveShadow = true;
    g.add(top);
    const edgeMat = new THREE.MeshStandardMaterial({
        color: 13870140,
        metalness: .3,
        roughness: .5,
        emissive: 3023112,
        emissiveIntensity: .7
    });
    for (const sx of [ -1, 1 ]) {
        addBox(g, .065, .012, length - .16, edgeMat, sx * .335, .164, 0);
        addBox(g, .022, .018, length - .14, M.steel, sx * .385, .16, 0);
    }
    const flankTex = hazardTexture.clone();
    flankTex.needsUpdate = true;
    flankTex.wrapS = THREE.RepeatWrapping;
    flankTex.wrapT = THREE.RepeatWrapping;
    flankTex.repeat.set(3.2, 1);
    const flankMat = new THREE.MeshBasicMaterial({
        map: flankTex,
        color: 8616031,
        side: THREE.DoubleSide,
        toneMapped: false
    });
    for (const sx of [ -1, 1 ]) {
        const flank = new THREE.Mesh(new THREE.PlaneGeometry(length - .08, .072), flankMat);
        flank.rotation.y = sx * Math.PI / 2;
        flank.position.set(sx * .624, .075, 0);
        g.add(flank);
    }
    const sideLabelMat = new THREE.MeshBasicMaterial({
        map: rampLabelTexture,
        transparent: true,
        depthWrite: false,
        color: 10789786,
        toneMapped: false
    });
    for (const sx of [ -1, 1 ]) {
        const lbl = new THREE.Mesh(new THREE.PlaneGeometry(.68, .215), sideLabelMat);
        lbl.rotation.y = sx * Math.PI / 2;
        lbl.position.set(sx * .626, .073, .55);
        lbl.renderOrder = 5;
        g.add(lbl);
    }
    for (const sz of [ -1, 1 ]) {
        addBox(g, 1.22, .055, .105, M.blackRubber, 0, .04, sz * (length / 2 - .055));
        for (const sx of [ -1, 1 ]) {
            addBox(g, .075, .05, .05, new THREE.MeshBasicMaterial({
                color: 14066486,
                toneMapped: false
            }), sx * .44, .09, sz * (length / 2 - .01));
        }
    }
    for (let i = 0; i < 8; i++) {
        const zz = -length / 2 + .28 + i / 7 * (length - .56);
        for (const sx of [ -1, 1 ]) {
            const bolt = new THREE.Mesh(new THREE.SphereGeometry(.012, 5, 4), M.steel);
            bolt.position.set(sx * .5, .155, zz);
            g.add(bolt);
        }
    }
    addContactShadow(world, x, z, 5.8, 1.9, .22);
    floatGroup.add(g);
    return g;
}

buildCableRamp(2.9, 8.05, Math.PI / 2 + .18, 4.2);

buildCableRamp(7.5, 9.35, Math.PI / 2 - .09, 4.5);

function addFloorCable(points, radius, mat, segments = 150) {
    const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", .35);
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, segments, radius, 6, false), mat);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
}

const floorCableMat = new THREE.MeshStandardMaterial({
    color: 329223,
    metalness: .04,
    roughness: .6,
    bumpMap: cableRibTexture,
    bumpScale: .004
});

const floorCableMat2 = new THREE.MeshStandardMaterial({
    color: 526861,
    metalness: .05,
    roughness: .64,
    bumpMap: cableRibTexture,
    bumpScale: .004
});

addFloorCable([ new THREE.Vector3(3.4, .055, -.65), new THREE.Vector3(3, .055, 2.5), new THREE.Vector3(3.7, .055, 5.7), new THREE.Vector3(2.7, .055, 8.8), new THREE.Vector3(3, .055, 11.7), new THREE.Vector3(2.1, .055, 14.8) ], .055, floorCableMat, 190);

addFloorCable([ new THREE.Vector3(-3.55, .05, -.35), new THREE.Vector3(-3.8, .05, 2), new THREE.Vector3(-2.4, .05, 4.5), new THREE.Vector3(-1.3, .05, 6.6), new THREE.Vector3(.4, .05, 8.8), new THREE.Vector3(1.3, .05, 11.6), new THREE.Vector3(.7, .05, 14) ], .042, floorCableMat2, 180);

addFloorCable([ new THREE.Vector3(-6.1, .05, -.3), new THREE.Vector3(-5.5, .05, 2.1), new THREE.Vector3(-4, .05, 4), new THREE.Vector3(-5.3, .05, 6.1), new THREE.Vector3(-3.3, .05, 8.5), new THREE.Vector3(-1.6, .05, 10.9) ], .038, floorCableMat, 160);

addFloorCable([ new THREE.Vector3(5, .055, -.5), new THREE.Vector3(5.8, .055, 2.2), new THREE.Vector3(7.1, .055, 5.1), new THREE.Vector3(6.7, .055, 8.3), new THREE.Vector3(8.5, .055, 11.1), new THREE.Vector3(9.2, .055, 14.1) ], .05, floorCableMat2, 180);

addFloorCable([ new THREE.Vector3(1.4, .048, 1.2), new THREE.Vector3(1.1, .048, 4.2), new THREE.Vector3(1.9, .048, 7.1), new THREE.Vector3(1.6, .048, 10.8) ], .025, M.cableBlue, 120);

addFloorCable([ new THREE.Vector3(-5.7, .045, 5.3), new THREE.Vector3(-3.2, .045, 5.9), new THREE.Vector3(-1, .045, 6.4) ], .026, M.cableBlueBright, 90);

addFloorCable([ new THREE.Vector3(.2, .058, 10.9), new THREE.Vector3(1.7, .058, 10.15), new THREE.Vector3(3.5, .058, 9.15), new THREE.Vector3(5.2, .058, 8.25), new THREE.Vector3(6.3, .058, 6.9), new THREE.Vector3(6.85, .058, 5.7) ], .074, floorCableMat, 170);

addFloorCable([ new THREE.Vector3(6.9, .056, 11.6), new THREE.Vector3(8.35, .056, 10.5), new THREE.Vector3(8.9, .056, 8.9), new THREE.Vector3(7.6, .056, 7.75), new THREE.Vector3(7, .056, 6.45) ], .058, floorCableMat2, 160);

function addFloorCoil(x, z, radius, turns, mat) {
    const pts = [];
    for (let i = 0; i <= 80; i++) {
        const t = i / 80;
        const a = t * TAU * turns;
        pts.push(new THREE.Vector3(x + Math.cos(a) * radius * (.7 + t * .3), .045, z + Math.sin(a) * radius * (.7 + t * .3)));
    }
    const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 200, .023, 5, false), mat);
    scene.add(mesh);
}

addFloorCoil(.1, 11.3, .58, 2.3, floorCableMat);

addFloorCoil(8.3, 8.9, .38, 2.5, floorCableMat2);

const cableGroup = new THREE.Group;

cableGroup.name = "Silver and blue cable ribbons";

floatGroup.add(cableGroup);

const interactiveCables = [];

const cableHitMeshes = [];

const pulseLight = new THREE.PointLight(10477823, 0, 7, 1.7);

pulseLight.castShadow = false;

scene.add(pulseLight);

const pulseSpriteMat = new THREE.SpriteMaterial({
    map: glowTexture,
    color: 10149887,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false
});

const pulseSprite = new THREE.Sprite(pulseSpriteMat);

pulseSprite.scale.setScalar(1.35);

pulseSprite.visible = false;

scene.add(pulseSprite);

function makeCableGeometry(points, radius, tubularSegments = 180, radialSegments = 8, tension = 0) {
    let pts = points;
    if (tension > .001) {
        const start = points[0];
        const end = points[points.length - 1];
        const line = new THREE.Vector3;
        pts = points.map((p, i) => {
            const t = i / (points.length - 1);
            line.copy(start).lerp(end, t);
            const out = p.clone().lerp(line, .16 * tension);
            out.y += Math.sin(t * Math.PI) * .07 * tension;
            return out;
        });
    }
    const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", .36);
    return {
        geometry: new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false),
        curve: curve
    };
}

function makePulseMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            uPulse: {
                value: -1
            },
            uActive: {
                value: 0
            },
            uTime: {
                value: 0
            },
            uColor: {
                value: new THREE.Color(10475775)
            }
        },
        vertexShader: `\n      varying vec2 vUv;\n      void main() {\n        vUv = uv;\n        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n      }\n    `,
        fragmentShader: `\n      uniform float uPulse;\n      uniform float uActive;\n      uniform float uTime;\n      uniform vec3 uColor;\n      varying vec2 vUv;\n      void main() {\n        float bandWidth = 0.042;\n        float head = exp(-pow((vUv.x - uPulse) / bandWidth, 2.0));\n        float halo = exp(-pow((vUv.x - uPulse + 0.052) / 0.15, 2.0));\n        float softLine = 0.05 + 0.022 * sin(vUv.x * 130.0 - uTime * 5.0);\n        float alpha = uActive * (head * 1.0 + halo * 0.4 + softLine * 0.7);\n        vec3 color = uColor * (1.35 + head * 3.4 + halo * 0.7);\n        if (alpha < 0.002) discard;\n        gl_FragColor = vec4(color, alpha);\n      }\n    `,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        toneMapped: false
    });
}

function addInteractiveCable(name, points, radius, bodyMat) {
    const {geometry: geometry, curve: curve} = makeCableGeometry(points, radius, 190, 9);
    const mesh = new THREE.Mesh(geometry, bodyMat);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    cableGroup.add(mesh);
    const {geometry: glowGeo} = makeCableGeometry(points, radius * 1.16, 190, 9);
    const glowMat = makePulseMaterial();
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.renderOrder = 6;
    glow.castShadow = false;
    cableGroup.add(glow);
    const hitGeo = new THREE.TubeGeometry(curve, 80, Math.max(.2, radius * 2.8), 5, false);
    const hit = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        colorWrite: false
    }));
    hit.name = name + " collider";
    cableGroup.add(hit);
    const cable = {
        id: interactiveCables.length + 1,
        name: name,
        basePoints: points.map(p => p.clone()),
        points: points,
        radius: radius,
        mesh: mesh,
        glow: glow,
        glowMat: glowMat,
        curve: curve,
        tighten: 0,
        tightenTarget: 0,
        activation: 0,
        pulsePos: -1,
        pulseHold: 0,
        hit: hit
    };
    hit.userData.cable = cable;
    mesh.userData.cable = cable;
    interactiveCables.push(cable);
    cableHitMeshes.push(hit);
    return cable;
}

const dimCableMaterials = new Map;

function dimCableMaterial(mat) {
    if (dimCableMaterials.has(mat.uuid)) return dimCableMaterials.get(mat.uuid);
    const m = mat.clone();
    m.color.multiplyScalar(.58);
    m.roughness = Math.min(1, m.roughness + .08);
    m.envMapIntensity = Math.max(.2, (m.envMapIntensity ?? .5) * .62);
    dimCableMaterials.set(mat.uuid, m);
    return m;
}

function addStaticCable(points, radius, mat, {tubularSegments: tubularSegments = 150, radialSegments: radialSegments = 7, ties: ties = 0} = {}) {
    if (radius < .045) mat = dimCableMaterial(mat);
    const {geometry: geometry, curve: curve} = makeCableGeometry(points, radius, tubularSegments, radialSegments);
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.castShadow = radius > .045;
    mesh.receiveShadow = true;
    cableGroup.add(mesh);
    for (let i = 0; i < ties; i++) {
        const t = .22 + (i + .5) / ties * .56;
        const p = curve.getPointAt(t);
        const tangent = curve.getTangentAt(t);
        const tie = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.4, .011, 4, 9), M.softBlack);
        tie.position.copy(p);
        tie.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
        cableGroup.add(tie);
    }
    return mesh;
}

addInteractiveCable("SILVER RETURN / 01", [ new THREE.Vector3(-4.75, 12.85, -5), new THREE.Vector3(-6.65, 11.15, -3.9), new THREE.Vector3(-7.5, 8.85, -2.35), new THREE.Vector3(-6.35, 6.85, -1.35), new THREE.Vector3(-4, 5.72, -.82), new THREE.Vector3(-2.82, 4.35, -.66), new THREE.Vector3(-4.3, 3.2, -.76), new THREE.Vector3(-6.2, 2.55, -1.15), new THREE.Vector3(-6.9, 1.55, -1.3) ], .108, M.cableSilverHero);

addInteractiveCable("BLUE SIGNAL / 02", [ new THREE.Vector3(3.55, 12.9, -5.65), new THREE.Vector3(5.4, 11.3, -4.25), new THREE.Vector3(6, 8.95, -2.7), new THREE.Vector3(4.6, 7.28, -1.48), new THREE.Vector3(2.2, 6.58, -.82), new THREE.Vector3(1.7, 5.2, -.62), new THREE.Vector3(3.55, 4.35, -.8), new THREE.Vector3(4.62, 3, -1.3), new THREE.Vector3(3.4, 2.1, -1.6) ], .098, M.cableBlueHero);

addInteractiveCable("SILVER FEED / 03", [ new THREE.Vector3(-2.2, 11.75, -4.95), new THREE.Vector3(-4.72, 10.05, -3), new THREE.Vector3(-3.9, 8.2, -1.6), new THREE.Vector3(-1.55, 7.3, -.72), new THREE.Vector3(.42, 6.12, -.56), new THREE.Vector3(-.62, 5, -.66), new THREE.Vector3(-2.72, 4.1, -.96), new THREE.Vector3(-1.15, 3, -1.25) ], .104, M.cableSilverHero);

addInteractiveCable("BLUE RETURN / 04", [ new THREE.Vector3(1, 13.35, -5.95), new THREE.Vector3(2.8, 11.72, -4.22), new THREE.Vector3(1.25, 9.92, -2.62), new THREE.Vector3(-1.4, 8.95, -1.4), new THREE.Vector3(-1, 7.72, -.77), new THREE.Vector3(1.2, 6.5, -.5), new THREE.Vector3(2.6, 5.5, -.8), new THREE.Vector3(.82, 4.2, -1.12) ], .09, M.cableBlueHero);

for (const cable of interactiveCables) {
    for (const t of [ .16, .48, .8 ]) {
        const p = cable.curve.getPointAt(t);
        const tangent = cable.curve.getTangentAt(t);
        const collar = new THREE.Mesh(new THREE.TorusGeometry(cable.radius * 1.42, .016, 5, 12), M.darkSteel);
        collar.position.copy(p);
        collar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
        cableGroup.add(collar);
        const bolt = new THREE.Mesh(new THREE.SphereGeometry(.014, 5, 4), M.chrome);
        bolt.position.copy(p).addScaledVector(tangent, 0);
        cableGroup.add(bolt);
    }
}

function addRackBelt(yStart, yEnd, zStart, zEnd, sag, mats, baseRadius) {
    for (let i = 0; i < mats.length; i++) {
        const o = i * .055;
        const pts = [ new THREE.Vector3(-7.1, yStart + o, zStart + i * .06), new THREE.Vector3(-4.9, yStart - sag * .32 + o, zStart + .32 + i * .06), new THREE.Vector3(-2.4, yStart - sag * .62 + o, zStart + .8 + i * .07), new THREE.Vector3(.2, yStart - sag + o, zStart + .95 + i * .07), new THREE.Vector3(2.7, yStart - sag * .52 + o, zStart + .62 + i * .06), new THREE.Vector3(4.4, yEnd + o, zEnd + i * .06) ];
        const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", .38);
        const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, baseRadius * (1 - i * .12), 7, false), mats[i]);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        cableGroup.add(mesh);
        for (const t of [ .24, .5, .76 ]) {
            const p = curve.getPointAt(t);
            const tangent = curve.getTangentAt(t);
            const bracket = new THREE.Mesh(new THREE.TorusGeometry(baseRadius * 1.35, .012, 4, 9), M.softBlack);
            bracket.position.copy(p);
            bracket.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
            cableGroup.add(bracket);
        }
    }
}

addRackBelt(9, 8.7, -4.8, -4.6, 1.05, [ M.cableSilver, M.cableBlue, M.cableSilver ], .068);

addRackBelt(6.65, 6.35, -4.7, -4.5, .9, [ M.cableSilver, M.cableBlueBright, M.cableGrey ], .058);

addRackBelt(4.5, 4.35, -4.9, -4.7, .7, [ M.cableBlue, M.cableSilver, M.cableNavy ], .052);

(function addHeroBundles() {
    const offsets = [ {
        x: .105,
        y: .045,
        z: -.025,
        scale: .68,
        mat: null
    }, {
        x: -.082,
        y: -.05,
        z: .06,
        scale: .56,
        mat: null
    }, {
        x: .018,
        y: .11,
        z: .095,
        scale: .46,
        mat: null
    } ];
    for (const cable of interactiveCables) {
        const silverLead = cable.mesh.material === M.cableSilverHero;
        for (let i = 0; i < offsets.length; i++) {
            const o = offsets[i];
            const pts = cable.basePoints.map(p => new THREE.Vector3(p.x + o.x, p.y + o.y, p.z + o.z));
            const mat = i === 0 ? silverLead ? M.cableSilverHero : M.cableBlueHero : silverLead ? M.cableBlue : M.cableGrey;
            addStaticCable(pts, Math.max(.048, cable.radius * o.scale), mat, {
                tubularSegments: 140,
                ties: i === 0 ? 2 : 0
            });
        }
    }
})();

addStaticCable([ new THREE.Vector3(-3.2, 12.1, -5.42), new THREE.Vector3(-1, 10.8, -2.85), new THREE.Vector3(1.8, 9.8, -1.25), new THREE.Vector3(3.7, 8.6, -.95), new THREE.Vector3(5, 7.1, -1.55), new THREE.Vector3(6.05, 5.2, -2.25) ], .061, M.cableBlue, {
    ties: 2
});

addStaticCable([ new THREE.Vector3(-1.2, 12.25, -5.85), new THREE.Vector3(-3, 11.4, -3.2), new THREE.Vector3(0, 10.2, -1.5), new THREE.Vector3(2.2, 9.1, -1.8), new THREE.Vector3(1.4, 7.8, -2.4), new THREE.Vector3(-1.2, 6.8, -2), new THREE.Vector3(-2.5, 5.4, -1.2) ], .047, M.cableSilver, {
    ties: 2
});

addStaticCable([ new THREE.Vector3(-5.2, 9.8, -5.05), new THREE.Vector3(-6.7, 8.7, -3.55), new THREE.Vector3(-6.3, 7.1, -1.8), new THREE.Vector3(-4.5, 6.1, -1.2), new THREE.Vector3(-2.8, 5.2, -1), new THREE.Vector3(-3.2, 4, -1.2), new THREE.Vector3(-5, 3.1, -1.4) ], .052, M.cableBlueBright, {
    ties: 2
});

addStaticCable([ new THREE.Vector3(-5.13, 9.72, -5.1), new THREE.Vector3(-6.58, 8.58, -3.48), new THREE.Vector3(-6.2, 6.98, -1.72), new THREE.Vector3(-4.38, 5.99, -1.14), new THREE.Vector3(-2.7, 5.1, -.94), new THREE.Vector3(-3.1, 3.94, -1.14), new THREE.Vector3(-4.92, 3.02, -1.34) ], .035, M.cableBlue, {
    tubularSegments: 140
});

addStaticCable([ new THREE.Vector3(-5.34, 9.88, -5.15), new THREE.Vector3(-6.8, 8.78, -3.6), new THREE.Vector3(-6.4, 7.17, -1.86), new THREE.Vector3(-4.58, 6.18, -1.26), new THREE.Vector3(-2.92, 5.26, -1.06), new THREE.Vector3(-3.3, 4.06, -1.26), new THREE.Vector3(-5.1, 3.16, -1.46) ], .035, M.cableBlue, {
    tubularSegments: 140
});

addStaticCable([ new THREE.Vector3(-6.92, 8.1, -4.3), new THREE.Vector3(-7.35, 6.15, -2.05), new THREE.Vector3(-7, 4.15, -1.42), new THREE.Vector3(-6.72, 2.45, -1.2), new THREE.Vector3(-6.48, 1.32, -1.3) ], .075, M.blackRubber, {
    ties: 1
});

addStaticCable([ new THREE.Vector3(2, 10.5, -5.18), new THREE.Vector3(.5, 9.12, -3.03), new THREE.Vector3(2.45, 7.9, -1.38), new THREE.Vector3(.55, 6.8, -.78), new THREE.Vector3(1.78, 5.72, -.7), new THREE.Vector3(3.4, 4.9, -1) ], .018, M.cableBlueBright, {
    tubularSegments: 120
});

addStaticCable([ new THREE.Vector3(2.08, 10.4, -5.22), new THREE.Vector3(.58, 9.02, -3.08), new THREE.Vector3(2.53, 7.78, -1.44), new THREE.Vector3(.62, 6.69, -.84), new THREE.Vector3(1.88, 5.62, -.76), new THREE.Vector3(3.48, 4.8, -1.06) ], .018, M.cableNavy, {
    tubularSegments: 120
});

addStaticCable([ new THREE.Vector3(3.7, 10.72, -5.56), new THREE.Vector3(4.5, 9.3, -3.8), new THREE.Vector3(2.7, 8, -2.42), new THREE.Vector3(3.3, 6.8, -1.3), new THREE.Vector3(1.42, 5.9, -.94) ], .043, M.cableSilver, {
    ties: 1
});

addStaticCable([ new THREE.Vector3(3.5, 10, -6), new THREE.Vector3(5.4, 8.7, -5.3), new THREE.Vector3(6.1, 6.8, -4.5), new THREE.Vector3(5.4, 5, -3), new THREE.Vector3(4, 3.7, -2), new THREE.Vector3(2.5, 3.2, -1.8) ], .049, M.cableBlue, {
    ties: 2
});

addStaticCable([ new THREE.Vector3(-6.6, 6.75, -5), new THREE.Vector3(-7.5, 5.9, -3.4), new THREE.Vector3(-7.1, 4.7, -2), new THREE.Vector3(-5.8, 3.85, -1.5) ], .036, M.cableGrey, {
    tubularSegments: 110
});

addStaticCable([ new THREE.Vector3(-.2, 12.1, -6.1), new THREE.Vector3(.6, 10.6, -3.6), new THREE.Vector3(-.4, 9.4, -2), new THREE.Vector3(.9, 8.1, -1.2), new THREE.Vector3(-.5, 6.7, -.9), new THREE.Vector3(.2, 5.3, -.95), new THREE.Vector3(-.9, 4, -1.2) ], .025, M.cableNavy, {
    tubularSegments: 150
});

addStaticCable([ new THREE.Vector3(3.9, 11.2, -6.2), new THREE.Vector3(4.8, 10.1, -4), new THREE.Vector3(4, 8.9, -2.4), new THREE.Vector3(5.1, 7.2, -1.6), new THREE.Vector3(4.6, 5.6, -1.3) ], .024, M.cableBlueBright, {
    tubularSegments: 110
});

addStaticCable([ new THREE.Vector3(-4.7, 11.6, -5.8), new THREE.Vector3(-5.9, 10.4, -3.9), new THREE.Vector3(-4.9, 9.2, -2.2), new THREE.Vector3(-6, 7.8, -1.4), new THREE.Vector3(-5.2, 6.2, -1) ], .022, M.cableSilver, {
    tubularSegments: 120
});

const fineBlue = new THREE.MeshStandardMaterial({
    color: 3900415,
    metalness: .36,
    roughness: .24
});

for (let k = 0; k < 3; k++) {
    addStaticCable([ new THREE.Vector3(-6.75, 9.9 - k * .07, -5.4 + k * .06), new THREE.Vector3(-7.85, 8.4, -3.9), new THREE.Vector3(-7.25, 6.45, -2.25), new THREE.Vector3(-5.55, 5.25, -1.25), new THREE.Vector3(-3.35, 4.65, -.9), new THREE.Vector3(-1.95, 3.75, -1.02), new THREE.Vector3(-1.15, 2.55, -1.18) ], .021 + k * .006, M.cableSilver, {
        tubularSegments: 130,
        radialSegments: 5
    });
}

addStaticCable([ new THREE.Vector3(-3.65, 11.95, -5.45), new THREE.Vector3(-.4, 12.55, -4.1), new THREE.Vector3(2.8, 11.9, -3.55), new THREE.Vector3(4.6, 10.85, -4.25), new THREE.Vector3(3.2, 9.72, -3.2), new THREE.Vector3(.35, 9.35, -2.7), new THREE.Vector3(-2.6, 9.25, -3.15) ], .024, M.cableSilver, {
    tubularSegments: 170,
    ties: 2
});

addStaticCable([ new THREE.Vector3(4.85, 8.65, -5.65), new THREE.Vector3(5.65, 7.1, -4.15), new THREE.Vector3(4.9, 5.3, -2.55), new THREE.Vector3(3.65, 3.95, -1.85), new THREE.Vector3(2.25, 2.75, -1.62) ], .033, M.cableBlue, {
    ties: 1
});

addStaticCable([ new THREE.Vector3(5.02, 8.5, -5.72), new THREE.Vector3(5.82, 6.96, -4.22), new THREE.Vector3(5.05, 5.18, -2.62), new THREE.Vector3(3.82, 3.82, -1.9), new THREE.Vector3(2.42, 2.64, -1.68) ], .018, M.cableNavy, {
    tubularSegments: 130
});

addStaticCable([ new THREE.Vector3(.25, 12.2, -5.95), new THREE.Vector3(-1.7, 11.15, -4), new THREE.Vector3(-.35, 10.05, -2.4), new THREE.Vector3(1.85, 9.2, -1.45), new THREE.Vector3(1.4, 7.95, -1.25), new THREE.Vector3(.05, 6.75, -1.24), new THREE.Vector3(-1.2, 5.5, -1.18) ], .028, M.cableSilver, {
    tubularSegments: 160,
    ties: 1
});

addStaticCable([ new THREE.Vector3(-5.8, 10.45, -5.75), new THREE.Vector3(-3.8, 9.9, -3.4), new THREE.Vector3(-5.15, 8.62, -2.05), new THREE.Vector3(-3.5, 7.45, -1.25), new THREE.Vector3(-1.2, 6.7, -.85), new THREE.Vector3(-.45, 5.35, -1.05) ], .038, M.cableBlue, {
    tubularSegments: 150
});

addStaticCable([ new THREE.Vector3(-5.67, 10.32, -5.82), new THREE.Vector3(-3.68, 9.77, -3.46), new THREE.Vector3(-5.03, 8.49, -2.12), new THREE.Vector3(-3.38, 7.32, -1.3), new THREE.Vector3(-1.08, 6.57, -.9), new THREE.Vector3(-.32, 5.23, -1.1) ], .02, M.cableGrey, {
    tubularSegments: 135
});

addStaticCable([ new THREE.Vector3(1.12, 11.72, -5.35), new THREE.Vector3(2.55, 10.85, -3.72), new THREE.Vector3(1.42, 9.9, -2.38), new THREE.Vector3(2.38, 8.9, -1.5), new THREE.Vector3(.82, 7.88, -1.22), new THREE.Vector3(1.7, 6.7, -1.23), new THREE.Vector3(.4, 5.6, -1.1) ], .026, M.cableSilver, {
    tubularSegments: 150
});

addStaticCable([ new THREE.Vector3(-4.8, 12.4, -5.85), new THREE.Vector3(-6.3, 11.8, -4.2), new THREE.Vector3(-5.35, 10.8, -2.55), new THREE.Vector3(-3.6, 10.1, -1.85), new THREE.Vector3(-1.8, 9.4, -1.55) ], .02, M.cableBlueBright, {
    tubularSegments: 120
});

addStaticCable([ new THREE.Vector3(4.2, 8.1, -5.7), new THREE.Vector3(5.2, 6.4, -4.6), new THREE.Vector3(5.4, 4.5, -3.35), new THREE.Vector3(5.25, 2.75, -2.6), new THREE.Vector3(5.6, 1.55, -2.2) ], .03, M.cableGrey, {
    ties: 1
});

addStaticCable([ new THREE.Vector3(4.45, 4.3, -3.7), new THREE.Vector3(3.8, 3.7, -2.55), new THREE.Vector3(4.6, 3.15, -1.9), new THREE.Vector3(3.55, 2.55, -1.65), new THREE.Vector3(3.9, 1.6, -1.8) ], .012, fineBlue, {
    tubularSegments: 90,
    radialSegments: 4
});

for (let i = 0; i < 5; i++) {
    const x0 = -2.2 + i * 1.27;
    addStaticCable([ new THREE.Vector3(x0, 8.3 + i % 2 * .8, -4.9), new THREE.Vector3(x0 - .5, 7.65 + i % 2 * .55, -2.9), new THREE.Vector3(x0 + .45, 7 + i % 2 * .4, -1.7), new THREE.Vector3(x0 - .1, 6.35 + i % 2 * .28, -1.1) ], .011, i % 2 ? fineBlue : M.cableBlueBright, {
        tubularSegments: 80,
        radialSegments: 4
    });
}

function addRibbon(points, width, mat) {
    const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", .35);
    const sampleCount = 100;
    const positions = [];
    const uvs = [];
    const indices = [];
    const up = new THREE.Vector3(0, 1, 0);
    const side = new THREE.Vector3;
    for (let i = 0; i <= sampleCount; i++) {
        const t = i / sampleCount;
        const p = curve.getPointAt(t);
        const tangent = curve.getTangentAt(t);
        side.crossVectors(up, tangent);
        if (side.lengthSq() < 1e-4) side.set(1, 0, 0);
        side.normalize().multiplyScalar(width / 2);
        positions.push(p.x - side.x, p.y - side.y, p.z - side.z);
        positions.push(p.x + side.x, p.y + side.y, p.z + side.z);
        uvs.push(0, t * 10, 1, t * 10);
    }
    for (let i = 0; i < sampleCount; i++) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const geo = new THREE.BufferGeometry;
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mat);
    cableGroup.add(mesh);
    return mesh;
}

addRibbon([ new THREE.Vector3(-5.8, 9.2, -5.5), new THREE.Vector3(-7.1, 7.7, -3.7), new THREE.Vector3(-6.6, 5.5, -1.7), new THREE.Vector3(-4.4, 4.1, -1), new THREE.Vector3(-1.5, 3.2, -.9) ], .22, new THREE.MeshStandardMaterial({
    color: 12174799,
    metalness: 1,
    roughness: .23,
    side: THREE.DoubleSide
}));

addRibbon([ new THREE.Vector3(2.8, 12, -6.1), new THREE.Vector3(1.1, 10.4, -3.9), new THREE.Vector3(2.5, 8.6, -2), new THREE.Vector3(1.2, 6.7, -1.1), new THREE.Vector3(2.6, 4.7, -1.2) ], .17, new THREE.MeshStandardMaterial({
    color: 2381775,
    metalness: .82,
    roughness: .27,
    side: THREE.DoubleSide
}));

function makeRampLabelTexture() {
    const {canvas: c, ctx: ctx} = canvas2d(512, 160);
    ctx.clearRect(0, 0, 512, 160);
    ctx.fillStyle = "rgba(7,8,8,.86)";
    roundRectPath(ctx, 6, 6, 500, 148, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(188,154,68,.82)";
    ctx.lineWidth = 5;
    roundRectPath(ctx, 15, 15, 482, 130, 7);
    ctx.stroke();
    ctx.fillStyle = "rgba(237,226,199,.88)";
    ctx.font = '700 48px "Arial Narrow", Arial, sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("CABLE RAMP", 256, 79);
    ctx.font = "22px monospace";
    ctx.fillStyle = "rgba(226,208,172,.55)";
    ctx.fillText("KEEP CLEAR  /  FLOAT 19", 256, 117);
    return makeCanvasTexture(c, {
        srgb: true
    });
}

function addSuspendedWorkLight(x, y, z, hang, color = 14215423, size = 1) {
    const g = new THREE.Group;
    g.position.set(x, y, z);
    addCylinder(g, .014, .014, hang, M.black, 0, hang / 2, 0, 5);
    addBox(g, 1.5, .09, .24, M.darkSteel, 0, .04, 0);
    const diffMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color).multiplyScalar(2.5),
        toneMapped: false
    });
    for (const dx of [ -.38, .38 ]) {
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, 1, 8), diffMat);
        tube.rotation.z = Math.PI / 2;
        tube.position.set(dx * .2, -.06, 0);
        g.add(tube);
        addGlowSprite(g, color, .3, -.08, .03, 1.9, .3, true);
    }
    addGlowSprite(g, color, 0, -.04, .02, 3.2, .22);
    world.add(g);
    return g;
}

addSuspendedWorkLight(-13.8, 12.2, -9.8, 6.4, 13360369, 1);

addSuspendedWorkLight(12.9, 11.6, -12.8, 7, 16765603, .95);

addSuspendedWorkLight(-2.2, 12.7, -24, 6.2, 12769516, .9);

addSuspendedWorkLight(-8.6, 13.7, -17.5, 4.8, 13689329, .85);

addSuspendedWorkLight(7.4, 13.9, -19, 5.2, 16766640, .8);

function addAtmosphereSprites() {
    const cool = addGlowSprite(scene, 4086909, -3, 11.6, -24, 38, .035, true);
    cool.material.depthWrite = false;
    const cool2 = addGlowSprite(scene, 2110539, 12, 14.2, -28, 28, .035, true);
    cool2.material.depthWrite = false;
    const warm = addGlowSprite(scene, 16751184, 17.3, 4.5, -33.6, 17, .05, true);
    warm.material.depthWrite = false;
    addGlowSprite(scene, 16759160, 11, 5.8, -38.8, 5.2, .13, true).material.color.multiplyScalar(1.2);
    addGlowSprite(scene, 16762255, 22.1, 4.8, -40.2, 4.6, .11, true).material.color.multiplyScalar(1.1);
    const backHaze = addGlowSprite(scene, 4022924, -.5, 7.8, -17.5, 24, .085, true);
    backHaze.material.depthWrite = false;
    const backHazeWarm = addGlowSprite(scene, 10247993, 7, 5.2, -13.5, 12, .075, true);
    backHazeWarm.material.depthWrite = false;
}

addAtmosphereSprites();

function addCaseHardware() {
    let target = null;
    floatGroup.traverse(o => {
        if (o.isGroup && Math.abs(o.position.x + 5.05) < .01 && Math.abs(o.position.z - 7) < .01) target = o;
    });
    if (!target) return;
    const chrome = M.chrome;
    const w = 3;
    const h = 2.25;
    const d = 2.15;
    const yBase = .16;
    const front = d / 2 + .025;
    addBox(target, .075, h + .04, .075, chrome, -w / 2 - .02, yBase + h / 2, front);
    addBox(target, .075, h + .04, .075, chrome, w / 2 + .02, yBase + h / 2, front);
    addBox(target, w + .12, .075, .075, chrome, 0, yBase + h + .02, front);
    addBox(target, w + .12, .075, .075, chrome, 0, yBase - .02, front);
    const right = w / 2 + .025;
    addBox(target, .075, h + .04, .075, chrome, right, yBase + h / 2, -d / 2 - .02);
    addBox(target, .075, h + .04, .075, chrome, right, yBase + h / 2, d / 2 + .02);
    addBox(target, .075, .075, d + .12, chrome, right, yBase + h + .02, 0);
    addBox(target, .075, .075, d + .12, chrome, right, yBase - .02, 0);
    const latchMat = new THREE.MeshStandardMaterial({
        color: 1711650,
        metalness: .92,
        roughness: .3
    });
    for (const lx of [ -w * .68, 0, w * .68 ]) {
        addBox(target, .2, .13, .045, latchMat, lx, yBase + h * .8, front + .02);
        addBox(target, .13, .04, .06, chrome, lx, yBase + h * .82, front + .055);
    }
    for (const lz of [ -d * .32, d * .32 ]) {
        addBox(target, .045, .13, .2, latchMat, right + .02, yBase + h * .6, lz);
        addBox(target, .06, .04, .12, chrome, right + .055, yBase + h * .62, lz);
    }
    for (let i = 0; i < 8; i++) {
        for (const sx of [ -1, 1 ]) {
            const rv = new THREE.Mesh(new THREE.SphereGeometry(.019, 6, 5), M.chrome);
            rv.position.set(sx * (w / 2 + .02), yBase + .16 + i * .26, front + .055);
            target.add(rv);
        }
    }
    const pts = [];
    for (let i = 0; i < 26; i++) {
        const a = i / 25 * TAU * 1.8;
        pts.push(new THREE.Vector3(-.65 + Math.cos(a) * .38, yBase + h + .05, -.28 + Math.sin(a) * .24));
    }
    const coilCurve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    const coil = new THREE.Mesh(new THREE.TubeGeometry(coilCurve, 110, .022, 5, false), M.blackRubber);
    target.add(coil);
}

addCaseHardware();

function buildStatusLights() {
    const geometry = new THREE.BufferGeometry;
    const positions = rackLEDs.positions;
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("aColor", new THREE.Float32BufferAttribute(rackLEDs.colors, 3));
    geometry.setAttribute("aPhase", new THREE.Float32BufferAttribute(rackLEDs.phases, 1));
    geometry.setAttribute("aSize", new THREE.Float32BufferAttribute(rackLEDs.sizes, 1));
    geometry.setAttribute("aRate", new THREE.Float32BufferAttribute(rackLEDs.rates, 1));
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: {
                value: 0
            },
            uPixelRatio: {
                value: Math.min(window.devicePixelRatio || 1, 1.6)
            }
        },
        vertexShader: `\n      attribute vec3 aColor;\n      attribute float aPhase;\n      attribute float aSize;\n      attribute float aRate;\n      uniform float uTime;\n      uniform float uPixelRatio;\n      varying vec3 vColor;\n      varying float vAlpha;\n      void main() {\n        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);\n        float tw1 = 0.5 + 0.5 * sin(uTime * aRate + aPhase);\n        float tw2 = 0.5 + 0.5 * sin(uTime * aRate * 3.7 + aPhase * 2.3);\n        float on = smoothstep(0.28, 0.78, tw1 * 0.65 + tw2 * 0.35);\n        vAlpha = 0.18 + on * 0.9;\n        vColor = aColor;\n        gl_PointSize = clamp(aSize * 640.0 * uPixelRatio / max(1.0, -mvPosition.z), 1.8, 9.0);\n        gl_Position = projectionMatrix * mvPosition;\n      }\n    `,
        fragmentShader: `\n      varying vec3 vColor;\n      varying float vAlpha;\n      void main() {\n        vec2 p = gl_PointCoord - 0.5;\n        float d = length(p);\n        if (d > 0.5) discard;\n        float core = smoothstep(0.48, 0.06, d);\n        float halo = smoothstep(0.5, 0.23, d);\n        vec3 c = vColor * (0.55 + core * 3.2) + vec3(core * 0.28);\n        gl_FragColor = vec4(c, vAlpha * (core + halo * 0.25));\n      }\n    `,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        toneMapped: false
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    points.renderOrder = 7;
    scene.add(points);
    return material;
}

const statusLEDMaterial = buildStatusLights();

function buildDust() {
    const count = 260;
    const positions = [];
    const phase = [];
    const size = [];
    const rng = mulberry32(5812);
    for (let i = 0; i < count; i++) {
        positions.push(rerange(rng, -20, 20), rerange(rng, .8, 19), rerange(rng, -27, 12));
        phase.push(rng() * TAU);
        size.push(.5 + rng() * 1.8);
    }
    function rerange(r, a, b) {
        return a + (b - a) * r();
    }
    const geometry = new THREE.BufferGeometry;
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("aPhase", new THREE.Float32BufferAttribute(phase, 1));
    geometry.setAttribute("aSize", new THREE.Float32BufferAttribute(size, 1));
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: {
                value: 0
            },
            uPixelRatio: {
                value: Math.min(window.devicePixelRatio || 1, 1.6)
            },
            uColor: {
                value: new THREE.Color(12506860)
            }
        },
        vertexShader: `\n      attribute float aPhase;\n      attribute float aSize;\n      uniform float uTime;\n      uniform float uPixelRatio;\n      varying float vAlpha;\n      void main() {\n        vec3 p = position;\n        p.x += sin(uTime * 0.075 + aPhase) * 0.75;\n        p.y += sin(uTime * 0.048 + aPhase * 1.7) * 0.42;\n        p.z += cos(uTime * 0.061 + aPhase * 0.8) * 0.58;\n        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);\n        gl_PointSize = max(0.7, aSize * 42.0 * uPixelRatio / max(2.0, -mvPosition.z));\n        vAlpha = 0.05 + 0.17 * (0.5 + 0.5 * sin(uTime * 0.22 + aPhase));\n        gl_Position = projectionMatrix * mvPosition;\n      }\n    `,
        fragmentShader: `\n      uniform vec3 uColor;\n      varying float vAlpha;\n      void main() {\n        float d = length(gl_PointCoord - 0.5);\n        if (d > 0.5) discard;\n        float a = smoothstep(0.5, 0.0, d) * vAlpha;\n        gl_FragColor = vec4(uColor, a);\n      }\n    `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    scene.add(points);
    return material;
}

const dustMaterial = buildDust();

const raycaster = new THREE.Raycaster;

const pointerNDC = new THREE.Vector2(-10, -10);

let pointerDirty = false;

const DEFAULT_HINT = "Trace a cable to wake the float";

const DEFAULT_SUB = "Hover the thick silver + blue runs · drag to orbit · scroll to inspect";

function setHoveredCable(cable) {
    if (state.hoveredCable === cable) return;
    if (state.hoveredCable) {
        state.hoveredCable.tightenTarget = 0;
        state.hoveredCable.mesh.userData.hovered = false;
    }
    state.hoveredCable = cable;
    if (cable) {
        cable.tightenTarget = 1;
        cable.pulsePos = .02;
        cable.mesh.userData.hovered = true;
        diagnostics.interactions.cableHover = true;
        dock.classList.add("energized");
        hintTitle.textContent = `${cable.name} · WAKING`;
        hintSub.textContent = "Cable tension rising · signal pulse in transit · release pointer to let it settle";
        renderer.domElement.style.cursor = "crosshair";
    } else {
        dock.classList.remove("energized");
        hintTitle.textContent = DEFAULT_HINT;
        hintSub.textContent = DEFAULT_SUB;
        renderer.domElement.style.cursor = "grab";
    }
}

function updatePointerHit(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointerNDC.x = (clientX - rect.left) / rect.width * 2 - 1;
    pointerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNDC, camera);
    const hits = raycaster.intersectObjects(cableHitMeshes, false);
    setHoveredCable(hits.length ? hits[0].object.userData.cable : null);
}

renderer.domElement.addEventListener("pointermove", e => {
    if (e.pointerType === "touch") return;
    state.pointerInside = true;
    updatePointerHit(e.clientX, e.clientY);
});

renderer.domElement.addEventListener("pointerdown", e => {
    if (e.pointerType !== "touch") return;
    updatePointerHit(e.clientX, e.clientY);
});

renderer.domElement.addEventListener("pointerup", e => {
    if (e.pointerType !== "touch") return;
    setTimeout(() => setHoveredCable(null), 1400);
});

renderer.domElement.addEventListener("pointerleave", () => {
    state.pointerInside = false;
    setHoveredCable(null);
});

window.addEventListener("blur", () => setHoveredCable(null));

renderer.domElement.style.cursor = "grab";

controls.addEventListener("start", () => {
    diagnostics.interactions.orbited = true;
    renderer.domElement.style.cursor = "grabbing";
});

controls.addEventListener("end", () => {
    renderer.domElement.style.cursor = state.hoveredCable ? "crosshair" : "grab";
});

let warmthDirty = true;

warmthInput.addEventListener("input", () => {
    state.warmthTarget = Number(warmthInput.value) / 100;
    diagnostics.interactions.warmthChanged = true;
    warmthDirty = true;
});

function resetView() {
    const damping = controls.enableDamping;
    controls.enableDamping = false;
    camera.position.copy(HOME_POSITION);
    controls.target.copy(HOME_TARGET);
    controls.update();
    camera.position.copy(HOME_POSITION);
    controls.target.copy(HOME_TARGET);
    controls.update();
    controls.enableDamping = damping;
}

resetButton.addEventListener("click", resetView);

window.addEventListener("keydown", e => {
    if (e.key === "r" || e.key === "R") resetView();
});

function onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.setSize(width, height);
    composer.setSize(width, height);
    const pr = renderer.getPixelRatio();
    fxaaPass.material.uniforms.resolution.value.set(1 / (width * pr), 1 / (height * pr));
    bloomPass.resolution.set(width, height);
    statusLEDMaterial.uniforms.uPixelRatio.value = pr;
    dustMaterial.uniforms.uPixelRatio.value = pr;
}

window.addEventListener("resize", onResize);

const composer = new EffectComposer(renderer);

composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));

composer.setSize(window.innerWidth, window.innerHeight);

const renderPass = new RenderPass(scene, camera);

composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), .16, .48, 1.32);

composer.addPass(bloomPass);

const outputPass = new OutputPass;

composer.addPass(outputPass);

const fxaaPass = new ShaderPass(FXAAShader);

fxaaPass.material.uniforms.resolution.value.set(1 / (window.innerWidth * renderer.getPixelRatio()), 1 / (window.innerHeight * renderer.getPixelRatio()));

composer.addPass(fxaaPass);

updateWarmth(state.warmth);

const clock = new THREE.Clock;

let frameCount = 0;

let lastScreenDraw = 0;

let lastHudUpdate = 0;

let lastDiagnosticsSample = 0;

let smoothFrame = 1 / 60;

const tempColor = new THREE.Color;

const tempVec = new THREE.Vector3;

function updateCableVisuals(dt, motionDt = dt) {
    let activePulseCable = null;
    let bestActivation = 0;
    for (const c of interactiveCables) {
        const isHovered = state.hoveredCable === c;
        c.tighten += ((isHovered ? 1 : 0) - c.tighten) * Math.min(1, motionDt * 4.8);
        if (Math.abs(c.tighten - (isHovered ? 1 : 0)) < .003) c.tighten = isHovered ? 1 : 0;
        c.activation += ((isHovered ? 1 : 0) - c.activation) * Math.min(1, motionDt * (isHovered ? 9 : 2.5));
        if (!c.lastBuilt || Math.abs(c.tighten - c.lastBuilt) > .018) {
            const {geometry: geometry, curve: curve} = makeCableGeometry(c.basePoints, c.radius, 180, 9, c.tighten);
            const glowGeo = new THREE.TubeGeometry(curve, 180, c.radius * 1.16, 9, false);
            c.mesh.geometry.dispose();
            c.glow.geometry.dispose();
            c.mesh.geometry = geometry;
            c.glow.geometry = glowGeo;
            c.curve = curve;
            c.lastBuilt = c.tighten;
        }
        if (isHovered) {
            c.pulsePos += motionDt * .52;
            if (c.pulsePos > 1.16) c.pulsePos = -.04;
        } else if (c.activation < .02) {
            c.pulsePos = -1;
        }
        c.glowMat.uniforms.uTime.value = state.time;
        c.glowMat.uniforms.uPulse.value = c.pulsePos;
        c.glowMat.uniforms.uActive.value = c.activation;
        c.glow.visible = c.activation > .008;
        if (c.activation > bestActivation) {
            bestActivation = c.activation;
            activePulseCable = c;
        }
    }
    if (activePulseCable && activePulseCable.activation > .02 && activePulseCable.pulsePos >= 0 && activePulseCable.pulsePos <= 1.02) {
        const p = activePulseCable.curve.getPointAt(clamp(activePulseCable.pulsePos, 0, 1));
        pulseSprite.position.copy(p);
        pulseSprite.position.y += .015;
        pulseSprite.visible = true;
        pulseSpriteMat.opacity = .7 * activePulseCable.activation;
        pulseLight.position.copy(p);
        pulseLight.intensity = 52 * activePulseCable.activation;
    } else {
        pulseSprite.visible = false;
        pulseSpriteMat.opacity = 0;
        pulseLight.intensity = 0;
    }
}

function animate() {
    const rawFrameDt = clock.getDelta();
    const dt = Math.min(rawFrameDt, .05);
    const motionDt = Math.min(rawFrameDt, .5);
    state.time += dt;
    smoothFrame = lerp(smoothFrame, rawFrameDt, .08);
    if (Math.abs(state.warmthTarget - state.warmth) > 2e-4) {
        state.warmth += (state.warmthTarget - state.warmth) * Math.min(1, motionDt * 3.2);
        updateWarmth(state.warmth);
    }
    controls.update();
    if (camera.position.y < .55) {
        camera.position.y = .55;
        controls.update();
    }
    updateCableVisuals(dt, motionDt);
    statusLEDMaterial.uniforms.uTime.value = state.time;
    dustMaterial.uniforms.uTime.value = state.time;
    for (const mat of lightShaftMaterials) {
        mat.uniforms.uTime.value = state.time;
        tempColor.copy(WARMTH.coldRim).lerp(WARMTH.warmRim, smooth(state.warmth));
        mat.uniforms.uColor.value.copy(tempColor);
        mat.uniforms.uIntensity.value = .021 + smooth(state.warmth) * .009;
    }
    if (state.time - lastScreenDraw > .095) {
        drawScreen(state.time);
        lastScreenDraw = state.time;
    }
    if (performance.now() - lastHudUpdate > 500) {
        if (!state.hoveredCable) {
            const activity = .5 + .5 * Math.sin(state.time * .55);
            warmthInput.setAttribute("aria-valuetext", warmthState.textContent);
            if (!document.hidden) {}
        }
        lastHudUpdate = performance.now();
    }
    composer.render();
    frameCount++;
    if (!state.ready && frameCount >= 3) {
        state.ready = true;
        window.__sceneReady = true;
        diagnostics.readyAtMs = Math.round(performance.now() - state.startTime);
        loader.classList.add("done");
        try {
            diagnostics.triangles = renderer.info.render.triangles;
            diagnostics.drawCalls = renderer.info.render.calls;
            diagnostics.textures = renderer.info.memory.textures;
            diagnostics.geometries = renderer.info.memory.geometries;
            diagnostics.programs = renderer.info.programs ? renderer.info.programs.length : 0;
            diagnostics.fps = Math.round(1 / smoothFrame);
        } catch (err) {
            diagnostics.errors.push(String(err));
        }
    }
    const now = performance.now();
    if (now - lastDiagnosticsSample > 250) {
        diagnostics.frameTimes.push(Math.round(rawFrameDt * 1e3));
        if (diagnostics.frameTimes.length > 60) diagnostics.frameTimes.shift();
        lastDiagnosticsSample = now;
    }
    requestAnimationFrame(animate);
}

renderer.compile(scene, camera);

window.__scene = {
    THREE: THREE,
    scene: scene,
    camera: camera,
    renderer: renderer,
    controls: controls,
    state: state,
    diagnostics: diagnostics,
    interactiveCables: interactiveCables,
    setWarmth: value => {
        state.warmthTarget = clamp(value, 0, 1);
        warmthInput.value = String(Math.round(state.warmthTarget * 100));
        diagnostics.interactions.warmthChanged = true;
    },
    applyWarmth: value => {
        state.warmth = state.warmthTarget = clamp(value, 0, 1);
        warmthInput.value = String(Math.round(state.warmth * 100));
        updateWarmth(state.warmth);
        diagnostics.interactions.warmthChanged = true;
        return state.warmth;
    },
    nudgeCable: (index = 0) => {
        const cable = interactiveCables[index];
        if (!cable) return;
        setHoveredCable(cable);
    },
    releaseCable: () => setHoveredCable(null),
    resetView: resetView,
    floorReflector: floorReflector,
    rackFronts: rackFronts,
    lighting: lighting,
    bloomPass: bloomPass,
    composer: composer,
    renderPass: renderPass,
    lightShaftMaterials: lightShaftMaterials,
    lampGlowMaterials: lampGlowMaterials,
    world: world,
    materials: M,
    sampleRenderStats: () => {
        const info = renderer.info;
        const prevAuto = info.autoReset;
        info.autoReset = false;
        info.reset();
        renderer.setRenderTarget(null);
        renderer.render(scene, camera);
        const stats = {
            drawCalls: info.render.calls,
            triangles: info.render.triangles,
            points: info.render.points,
            lines: info.render.lines,
            textures: info.memory.textures,
            geometries: info.memory.geometries,
            programs: info.programs ? info.programs.length : 0,
            composerPasses: composer.passes.map(p => p.constructor.name),
            bloom: bloomPass ? {
                strength: bloomPass.strength,
                radius: bloomPass.radius,
                threshold: bloomPass.threshold
            } : null,
            shadows: renderer.shadowMap.enabled,
            shadowType: renderer.shadowMap.type
        };
        info.reset();
        info.autoReset = prevAuto;
        composer.render();
        return stats;
    }
};

window.__sceneReady = false;

animate();
