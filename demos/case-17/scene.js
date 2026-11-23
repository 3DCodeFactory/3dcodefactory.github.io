import * as THREE from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";

import { RenderPass } from "three/addons/postprocessing/RenderPass.js";

import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const stage = document.getElementById("stage");

const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: true,
    stencil: false
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));

renderer.setSize(stage.clientWidth, stage.clientHeight);

renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.toneMapping = THREE.ACESFilmicToneMapping;

renderer.toneMappingExposure = 1.44;

renderer.shadowMap.enabled = true;

renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.info.autoReset = false;

renderer.domElement.setAttribute("aria-label", "Interactive three dimensional moonlit temple courtyard");

stage.prepend(renderer.domElement);

const scene = new THREE.Scene;

scene.fog = new THREE.FogExp2(2241606, .0125);

const camera = new THREE.PerspectiveCamera(50, stage.clientWidth / stage.clientHeight, .08, 520);

const CAM_START = new THREE.Vector3(0, 2.15, 19.5);

const CAM_TARGET = new THREE.Vector3(2.6, 8.35, -4.3);

camera.position.copy(CAM_START);

camera.lookAt(CAM_TARGET);

camera.updateMatrixWorld();

const controls = new OrbitControls(camera, renderer.domElement);

controls.target.copy(CAM_TARGET);

controls.enableDamping = true;

controls.dampingFactor = .045;

controls.rotateSpeed = .42;

controls.zoomSpeed = .55;

controls.panSpeed = .4;

controls.enablePan = false;

controls.minDistance = 13;

controls.maxDistance = 44;

controls.minPolarAngle = 1.68;

controls.maxPolarAngle = 1.93;

controls.minAzimuthAngle = -.34;

controls.maxAzimuthAngle = .29;

controls.update();

const clock = new THREE.Clock;

const MAX_ANISO = Math.min(renderer.capabilities.getMaxAnisotropy(), 16);

const state = {
    hanging: 1,
    standing: 1,
    mist: .34,
    selected: null,
    uiHidden: false,
    time: 0,
    fps: 0,
    frames: 0,
    fpsWindowStart: performance.now()
};

const lanterns = [];

const pickables = [];

const mistSprites = [];

const cloudSprites = [];

const animatedReflections = [];

let moonLight;

let skyDome;

let moonSprite;

let composer;

function mulberry32(a) {
    return function() {
        a |= 0;
        a = a + 1831565813 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

function makeCanvas(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
}

function canvasTexture(canvas, {srgb: srgb = true, repeat: repeat = null, clamp: clamp = false} = {}) {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.wrapS = clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
    t.wrapT = clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
    t.anisotropy = MAX_ANISO;
    if (repeat) t.repeat.set(repeat[0], repeat[1]);
    t.needsUpdate = true;
    return t;
}

const grainCanvas = (() => {
    const c = makeCanvas(256, 256);
    const ctx = c.getContext("2d");
    const r = mulberry32(117);
    const img = ctx.createImageData(256, 256);
    for (let i = 0; i < img.data.length; i += 4) {
        const v = 110 + Math.floor(r() * 48);
        img.data[i] = v;
        img.data[i + 1] = v;
        img.data[i + 2] = v;
        img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c;
})();

function grain(ctx, w, h, alpha = .1, mode = "overlay") {
    const pat = ctx.createPattern(grainCanvas, "repeat");
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = mode;
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
}

function softBlob(ctx, x, y, rx, ry, color, alpha = 1, rotation = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(rx, ry);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, color);
    g.addColorStop(.55, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = alpha;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function makeWoodTextures() {
    const W = 512, H = 1024;
    const c = makeCanvas(W, H);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#6a513b";
    ctx.fillRect(0, 0, W, H);
    const bg = ctx.createLinearGradient(0, 0, W, 0);
    bg.addColorStop(0, "rgba(20,12,7,0.3)");
    bg.addColorStop(.24, "rgba(111,82,58,0.18)");
    bg.addColorStop(.52, "rgba(175,132,89,0.12)");
    bg.addColorStop(.78, "rgba(36,22,12,0.16)");
    bg.addColorStop(1, "rgba(10,6,3,0.36)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    const r = mulberry32(71);
    for (let i = 0; i < 760; i++) {
        const x = r() * W;
        const y0 = r() * H;
        const len = 70 + r() * 700;
        const bend = (r() - .5) * 22;
        const w = .35 + r() * 2.4;
        const light = r();
        ctx.strokeStyle = light > .72 ? `rgba(112, 83, 57, ${.045 + r() * .11})` : `rgba(7, 4, 2, ${.05 + r() * .16})`;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(x, y0);
        ctx.bezierCurveTo(x + bend, y0 + len * .32, x - bend * .7, y0 + len * .7, x + bend * .35, y0 + len);
        ctx.stroke();
    }
    for (let i = 0; i < 12; i++) {
        const x = r() * W;
        const y = r() * H;
        const rx = 3 + r() * 11;
        const ry = 12 + r() * 32;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, ry / rx);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        g.addColorStop(0, "rgba(8,4,2,0.55)");
        g.addColorStop(.7, "rgba(36,21,11,0.25)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, rx, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    for (let i = 0; i < 90; i++) {
        ctx.strokeStyle = `rgba(196, 159, 111, ${.016 + r() * .035})`;
        ctx.lineWidth = .4 + r();
        ctx.beginPath();
        const x = r() * W, y = r() * H;
        ctx.moveTo(x, y);
        ctx.lineTo(x + (r() - .5) * 40, y + 20 + r() * 130);
        ctx.stroke();
    }
    grain(ctx, W, H, .16, "overlay");
    const tex = canvasTexture(c, {
        repeat: [ 1.6, 2.4 ]
    });
    const bump = canvasTexture(c, {
        srgb: false,
        repeat: [ 1.6, 2.4 ]
    });
    return {
        map: tex,
        bump: bump
    };
}

function makeStoneTextures(seed = 3, tint = "neutral") {
    const S = 1024;
    const c = makeCanvas(S, S);
    const ctx = c.getContext("2d");
    const r = mulberry32(seed);
    ctx.fillStyle = tint === "dark" ? "#4c5152" : "#7e837b";
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 160; i++) {
        const x = r() * S, y = r() * S, rad = 15 + r() * 180;
        softBlob(ctx, x, y, rad, rad * (.35 + r() * .9), r() > .5 ? "rgba(113,117,110,0.13)" : "rgba(20,24,24,0.16)", .75, r() * Math.PI);
    }
    for (let i = 0; i < 7800; i++) {
        const x = r() * S, y = r() * S, s = .3 + r() * 2.1;
        const v = r();
        ctx.fillStyle = v > .55 ? `rgba(195,198,188,${.025 + r() * .13})` : `rgba(10,14,14,${.03 + r() * .18})`;
        ctx.fillRect(x, y, s, s);
    }
    for (let i = 0; i < 46; i++) {
        const x = r() * S, y = r() * S;
        ctx.strokeStyle = `rgba(14,17,16,${.08 + r() * .2})`;
        ctx.lineWidth = .7 + r() * 2.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        let px = x, py = y;
        for (let k = 0; k < 7; k++) {
            px += (r() - .5) * 44;
            py += 10 + r() * 33;
            ctx.lineTo(px, py);
        }
        ctx.stroke();
    }
    for (let i = 0; i < 150; i++) {
        const x = r() * S, y = r() * S;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 8 + r() * 48);
        g.addColorStop(0, `rgba(43,54,30,${.06 + r() * .16})`);
        g.addColorStop(1, "rgba(20,30,20,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, 56, 0, Math.PI * 2);
        ctx.fill();
    }
    grain(ctx, S, S, .18, "overlay");
    const map = canvasTexture(c, {
        repeat: [ 1.8, 1.8 ]
    });
    const bump = canvasTexture(c, {
        srgb: false,
        repeat: [ 1.8, 1.8 ]
    });
    return {
        map: map,
        bump: bump
    };
}

function makeRoofTextures() {
    const W = 512, H = 512;
    const c = makeCanvas(W, H);
    const ctx = c.getContext("2d");
    const r = mulberry32(24);
    ctx.fillStyle = "#2e3e48";
    ctx.fillRect(0, 0, W, H);
    const colW = 42;
    for (let x = -colW; x < W + colW; x += colW) {
        for (let y = -20; y < H + 20; y += 46) {
            const ox = x + Math.floor(y / 46) % 2 * colW * .5;
            ctx.save();
            ctx.translate(ox, y);
            const g = ctx.createLinearGradient(-colW * .5, 0, colW * .5, 0);
            g.addColorStop(0, "rgba(4,8,11,0.70)");
            g.addColorStop(.18, "rgba(69,91,106,0.48)");
            g.addColorStop(.5, "rgba(151,172,184,0.46)");
            g.addColorStop(.72, "rgba(47,66,79,0.34)");
            g.addColorStop(1, "rgba(2,5,7,0.74)");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.roundRect(-colW * .42, 0, colW * .84, 47, 7);
            ctx.fill();
            ctx.strokeStyle = "rgba(140,158,167,0.12)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-colW * .18, 6);
            ctx.quadraticCurveTo(-colW * .08, 24, -colW * .16, 42);
            ctx.stroke();
            ctx.restore();
        }
    }
    for (let y = 23; y < H; y += 46) {
        ctx.strokeStyle = "rgba(2,5,7,0.65)";
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
        ctx.strokeStyle = "rgba(122,144,155,0.10)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y + 3);
        ctx.lineTo(W, y + 3);
        ctx.stroke();
    }
    for (let i = 0; i < 65; i++) {
        const x = r() * W, y = r() * H;
        softBlob(ctx, x, y, 8 + r() * 55, 4 + r() * 22, r() > .58 ? "rgba(67,76,51,0.14)" : "rgba(4,8,11,0.21)", .9, r() * Math.PI);
    }
    for (let i = 0; i < 160; i++) {
        ctx.fillStyle = `rgba(166,178,176,${.015 + r() * .06})`;
        ctx.fillRect(r() * W, r() * H, .6 + r() * 2, .6 + r() * 6);
    }
    grain(ctx, W, H, .12, "overlay");
    const map = canvasTexture(c, {
        repeat: [ 3.2, 2 ]
    });
    const bump = canvasTexture(c, {
        srgb: false,
        repeat: [ 3.2, 2 ]
    });
    return {
        map: map,
        bump: bump
    };
}

function makeGrassTexture() {
    const S = 256;
    const c = makeCanvas(S, S);
    const ctx = c.getContext("2d");
    const r = mulberry32(7113);
    ctx.clearRect(0, 0, S, S);
    ctx.lineCap = "round";
    for (let i = 0; i < 42; i++) {
        const bx = S * .5 + (r() - .5) * 54;
        const h = S * (.35 + r() * .58);
        const lean = (r() - .5) * 92;
        const topX = bx + lean;
        const topY = S - h;
        const w = 1.1 + r() * 3;
        const grad = ctx.createLinearGradient(bx, S, topX, topY);
        grad.addColorStop(0, `rgba(${38 + r() * 20}, ${53 + r() * 25}, ${30 + r() * 16}, ${.7 + r() * .3})`);
        grad.addColorStop(.7, `rgba(${68 + r() * 28}, ${83 + r() * 30}, ${43 + r() * 20}, ${.55 + r() * .35})`);
        grad.addColorStop(1, `rgba(${96 + r() * 30}, ${108 + r() * 30}, ${58 + r() * 20}, ${.25 + r() * .3})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(bx, S);
        ctx.quadraticCurveTo(bx + lean * .25, S - h * .58, topX, topY);
        ctx.stroke();
    }
    grain(ctx, S, S, .06, "overlay");
    return canvasTexture(c, {
        clamp: true
    });
}

function makePavingTextures() {
    const S = 1536;
    const colorC = makeCanvas(S, S);
    const roughC = makeCanvas(S, S);
    const bumpC = makeCanvas(S, S);
    const c = colorC.getContext("2d");
    const ro = roughC.getContext("2d");
    const b = bumpC.getContext("2d");
    const r = mulberry32(987);
    c.fillStyle = "#111618";
    c.fillRect(0, 0, S, S);
    ro.fillStyle = "#d8d8d8";
    ro.fillRect(0, 0, S, S);
    b.fillStyle = "#282828";
    b.fillRect(0, 0, S, S);
    const rows = 22;
    const rowH = S / rows;
    let y = -rowH * .35;
    for (let row = 0; row < rows + 1; row++) {
        const h = rowH * (.86 + r() * .24);
        let x = -90 - r() * 120;
        while (x < S + 60) {
            const w = 105 + r() * 160;
            const inset = 3.5 + r() * 3.5;
            const jitter = (r() - .5) * 2.5;
            const shade = .78 + r() * .32;
            const base = Math.floor(98 * shade);
            const g = c.createLinearGradient(x, y, x + w, y + h);
            g.addColorStop(0, `rgb(${base + 11}, ${base + 14}, ${base + 14})`);
            g.addColorStop(.5, `rgb(${base + 3}, ${base + 7}, ${base + 8})`);
            g.addColorStop(1, `rgb(${base - 12}, ${base - 9}, ${base - 8})`);
            c.fillStyle = g;
            c.beginPath();
            c.roundRect(x + inset, y + inset + jitter, w - inset * 2, h - inset * 2, 2.5);
            c.fill();
            c.strokeStyle = "rgba(170,174,164,0.10)";
            c.lineWidth = 1.3;
            c.beginPath();
            c.moveTo(x + inset + 3, y + inset + jitter + 2);
            c.lineTo(x + w - inset - 3, y + inset + jitter + 2);
            c.stroke();
            for (let k = 0; k < 15; k++) {
                const px = x + inset + r() * Math.max(1, w - inset * 2);
                const py = y + inset + jitter + r() * Math.max(1, h - inset * 2);
                c.fillStyle = r() > .53 ? `rgba(195,192,175,${.012 + r() * .07})` : `rgba(5,9,10,${.015 + r() * .1})`;
                c.beginPath();
                c.ellipse(px, py, 1 + r() * 10, .5 + r() * 4, r() * Math.PI, 0, Math.PI * 2);
                c.fill();
            }
            if (r() > .5) {
                const side = Math.floor(r() * 4);
                const mx = side < 2 ? x + inset + r() * w : side === 2 ? x + inset : x + w - inset;
                const my = side < 2 ? side === 0 ? y + inset : y + h - inset : y + inset + r() * h;
                softBlob(c, mx, my, 9 + r() * 28, 4 + r() * 15, "rgba(48,61,33,0.22)", .9, r() * Math.PI);
            }
            const rv = Math.floor(100 + r() * 72);
            ro.fillStyle = `rgb(${rv},${rv},${rv})`;
            ro.beginPath();
            ro.roundRect(x + inset, y + inset + jitter, w - inset * 2, h - inset * 2, 2.5);
            ro.fill();
            const bv = Math.floor(138 + r() * 60);
            b.fillStyle = `rgb(${bv},${bv},${bv})`;
            b.beginPath();
            b.roundRect(x + inset, y + inset + jitter, w - inset * 2, h - inset * 2, 3);
            b.fill();
            b.strokeStyle = "rgba(40,40,40,0.9)";
            b.lineWidth = 2;
            b.stroke();
            x += w;
        }
        y += h;
    }
    for (let i = 0; i < 24; i++) {
        const px = r() * S, py = r() * S;
        const rx = 55 + r() * 230, ry = 12 + r() * 70;
        const rot = r() * Math.PI;
        c.save();
        c.translate(px, py);
        c.rotate(rot);
        c.scale(rx, ry);
        const g = c.createRadialGradient(0, 0, .08, 0, 0, 1);
        g.addColorStop(0, "rgba(5,13,17,0.48)");
        g.addColorStop(.55, "rgba(7,14,18,0.27)");
        g.addColorStop(1, "rgba(5,9,10,0)");
        c.fillStyle = g;
        c.beginPath();
        c.arc(0, 0, 1, 0, Math.PI * 2);
        c.fill();
        c.restore();
        ro.save();
        ro.translate(px, py);
        ro.rotate(rot);
        ro.scale(rx, ry);
        const rg = ro.createRadialGradient(0, 0, .05, 0, 0, 1);
        rg.addColorStop(0, "rgba(22,22,22,0.88)");
        rg.addColorStop(.7, "rgba(52,52,52,0.5)");
        rg.addColorStop(1, "rgba(120,120,120,0)");
        ro.fillStyle = rg;
        ro.beginPath();
        ro.arc(0, 0, 1, 0, Math.PI * 2);
        ro.fill();
        ro.restore();
        b.save();
        b.translate(px, py);
        b.rotate(rot);
        b.scale(rx, ry);
        const bg2 = b.createRadialGradient(0, 0, .05, 0, 0, 1);
        bg2.addColorStop(0, "rgba(88,88,88,0.6)");
        bg2.addColorStop(1, "rgba(100,100,100,0)");
        b.fillStyle = bg2;
        b.beginPath();
        b.arc(0, 0, 1, 0, Math.PI * 2);
        b.fill();
        b.restore();
    }
    for (let i = 0; i < 90; i++) {
        const x = r() * S, yy = r() * S;
        c.strokeStyle = `rgba(2,5,6,${.05 + r() * .14})`;
        c.lineWidth = .5 + r() * 1.3;
        c.beginPath();
        c.moveTo(x, yy);
        c.lineTo(x + (r() - .5) * 90, yy + (r() - .5) * 22);
        c.stroke();
    }
    grain(c, S, S, .12, "overlay");
    const map = canvasTexture(colorC, {
        repeat: [ 6.4, 4.35 ]
    });
    const roughnessMap = canvasTexture(roughC, {
        srgb: false,
        repeat: [ 6.4, 4.35 ]
    });
    const bumpMap = canvasTexture(bumpC, {
        srgb: false,
        repeat: [ 6.4, 4.35 ]
    });
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    for (const t of [ map, roughnessMap, bumpMap ]) t.anisotropy = Math.min(8, maxAniso);
    return {
        map: map,
        roughnessMap: roughnessMap,
        bumpMap: bumpMap
    };
}

function makePaperTexture() {
    const W = 512, H = 1024;
    const c = makeCanvas(W, H);
    const ctx = c.getContext("2d");
    const r = mulberry32(31);
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, "#b98e57");
    g.addColorStop(.18, "#f0d5a5");
    g.addColorStop(.5, "#f7e2bd");
    g.addColorStop(.82, "#eed0a0");
    g.addColorStop(1, "#a97844");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 950; i++) {
        const x = r() * W, y = r() * H;
        ctx.strokeStyle = r() > .5 ? `rgba(108,66,31,${.025 + r() * .06})` : `rgba(255,248,225,${.04 + r() * .11})`;
        ctx.lineWidth = .4 + r() * 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + (r() - .5) * 48, y + r() * 50, x + (r() - .5) * 74, y + 40 + r() * 160);
        ctx.stroke();
    }
    for (let y = 60; y < H; y += 96) {
        ctx.fillStyle = "rgba(83,52,25,0.11)";
        ctx.fillRect(0, y, W, 4);
        ctx.fillStyle = "rgba(255,244,211,0.16)";
        ctx.fillRect(0, y + 5, W, 2);
    }
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(25,18,12,0.78)";
    ctx.font = '600 118px "WenQuanYi Zen Hei", "Noto Serif CJK SC", serif';
    const columns = [ {
        x: W * .27,
        chars: [ "月", "華" ],
        size: 86
    }, {
        x: W * .5,
        chars: [ "無", "量", "光" ],
        size: 84
    }, {
        x: W * .73,
        chars: [ "長", "夜" ],
        size: 72
    } ];
    for (const col of columns) {
        ctx.font = `600 ${col.size}px "WenQuanYi Zen Hei", "Noto Serif CJK SC", serif`;
        const start = H * .5 - (col.chars.length - 1) * col.size * .62;
        col.chars.forEach((ch, i) => {
            ctx.save();
            ctx.translate(col.x, start + i * col.size * 1.24);
            ctx.rotate((i - .5) * .015);
            ctx.fillText(ch, 0, 0);
            ctx.restore();
        });
    }
    ctx.restore();
    ctx.font = '500 21px "WenQuanYi Zen Hei", "Noto Serif CJK SC", serif';
    ctx.fillStyle = "rgba(30,22,16,0.56)";
    ctx.textAlign = "center";
    ctx.fillText("月 下 長 明", W / 2, H * .85);
    ctx.fillStyle = "rgba(137,42,31,0.72)";
    ctx.fillRect(W * .46, H * .77, 42, 42);
    ctx.strokeStyle = "rgba(247,212,168,0.78)";
    ctx.lineWidth = 2;
    ctx.strokeRect(W * .46 + 7, H * .77 + 7, 28, 28);
    const sideShade = ctx.createLinearGradient(0, 0, W, 0);
    sideShade.addColorStop(0, "rgba(82,42,13,0.55)");
    sideShade.addColorStop(.12, "rgba(82,42,13,0)");
    sideShade.addColorStop(.88, "rgba(82,42,13,0)");
    sideShade.addColorStop(1, "rgba(82,42,13,0.55)");
    ctx.fillStyle = sideShade;
    ctx.fillRect(0, 0, W, H);
    const topShade = ctx.createLinearGradient(0, 0, 0, H);
    topShade.addColorStop(0, "rgba(74,39,13,0.55)");
    topShade.addColorStop(.12, "rgba(74,39,13,0)");
    topShade.addColorStop(.86, "rgba(74,39,13,0)");
    topShade.addColorStop(1, "rgba(74,39,13,0.5)");
    ctx.fillStyle = topShade;
    ctx.fillRect(0, 0, W, H);
    grain(ctx, W, H, .07, "overlay");
    return canvasTexture(c, {
        clamp: true
    });
}

function makeInscriptionTexture(chars, seed = 5) {
    const W = 512, H = 1536;
    const c = makeCanvas(W, H);
    const ctx = c.getContext("2d");
    const r = mulberry32(seed);
    ctx.clearRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = '700 142px "WenQuanYi Zen Hei", "Noto Serif CJK SC", serif';
    chars.forEach((ch, i) => {
        const x = W * .5 + (r() - .5) * 12;
        const y = 185 + i * 300;
        ctx.fillStyle = "rgba(245,246,236,0.30)";
        ctx.fillText(ch, x + 3, y + 3);
        ctx.fillStyle = "rgba(10,15,15,0.9)";
        ctx.fillText(ch, x, y);
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        for (let k = 0; k < 30; k++) {
            ctx.fillStyle = `rgba(0,0,0,${.15 + r() * .45})`;
            ctx.beginPath();
            ctx.ellipse(x + (r() - .5) * 190, y + (r() - .5) * 210, 1 + r() * 8, 1 + r() * 4, r() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    });
    ctx.strokeStyle = "rgba(28,34,31,0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(52, 48, W - 104, H - 96);
    return canvasTexture(c, {
        clamp: true
    });
}

function makePlaqueTexture() {
    const W = 1024, H = 384;
    const c = makeCanvas(W, H);
    const ctx = c.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#21170f");
    g.addColorStop(.5, "#332317");
    g.addColorStop(1, "#170f0a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 240; i++) {
        ctx.strokeStyle = `rgba(132,97,54,${.02 + Math.random() * .05})`;
        const x = Math.random() * W;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + (Math.random() - .5) * 30, H);
        ctx.stroke();
    }
    ctx.strokeStyle = "rgba(190,150,88,0.72)";
    ctx.lineWidth = 9;
    ctx.strokeRect(23, 23, W - 46, H - 46);
    ctx.strokeStyle = "rgba(87,58,26,0.8)";
    ctx.lineWidth = 3;
    ctx.strokeRect(42, 42, W - 84, H - 84);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = '600 173px "WenQuanYi Zen Hei", "Noto Serif CJK SC", serif';
    const chars = [ "萬", "象", "塔" ];
    chars.forEach((ch, i) => {
        ctx.save();
        ctx.shadowColor = "rgba(255,180,72,0.45)";
        ctx.shadowBlur = 16;
        ctx.fillStyle = "rgba(224,177,92,0.9)";
        ctx.fillText(ch, W * .5 + (i - 1) * 230, H * .53);
        ctx.restore();
    });
    grain(ctx, W, H, .09, "overlay");
    return canvasTexture(c, {
        clamp: true
    });
}

function makeSkyTexture() {
    const W = 2048, H = 1024;
    const c = makeCanvas(W, H);
    const ctx = c.getContext("2d");
    const r = mulberry32(241);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#07131f");
    g.addColorStop(.2, "#0e2030");
    g.addColorStop(.38, "#2b4354");
    g.addColorStop(.47, "#475d6e");
    g.addColorStop(.515, "#556b7a");
    g.addColorStop(.6, "#2f4250");
    g.addColorStop(1, "#080d12");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W * .36, H * .2);
    ctx.rotate(-.48);
    for (let i = 0; i < 110; i++) {
        const x = (r() - .5) * W * .54;
        const y = (r() - .5) * 150;
        softBlob(ctx, x, y, 40 + r() * 190, 12 + r() * 60, "rgba(102,126,151,0.035)", .7, r() * Math.PI);
    }
    ctx.restore();
    for (let i = 0; i < 760; i++) {
        const x = r() * W;
        const y = Math.pow(r(), .72) * H * .53;
        const bright = Math.pow(r(), 3.6);
        const rad = .28 + bright * .9;
        ctx.fillStyle = `rgba(${196 + bright * 42}, ${207 + bright * 32}, ${226 + bright * 21}, ${.06 + bright * .32})`;
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, Math.PI * 2);
        ctx.fill();
        if (bright > .55) {
            softBlob(ctx, x, y, 3 + bright * 4, 3 + bright * 4, "rgba(186,208,233,0.035)", .65);
        }
    }
    for (let i = 0; i < 26; i++) {
        const cx = r() * W;
        const cy = H * (.1 + r() * .33);
        const len = 120 + r() * 360;
        const dir = -.18 + r() * .22;
        const strength = .028 + r() * .062;
        for (let k = 0; k < 22; k++) {
            const t = k / 21 - .5;
            const x = cx + Math.cos(dir) * t * len + (r() - .5) * 54;
            const y = cy + Math.sin(dir) * t * len + (r() - .5) * 30;
            softBlob(ctx, x, y, 18 + r() * 90, 2.5 + r() * 15, `rgba(176,196,215,${strength * (.6 + r() * .7)})`, .72, dir);
            if (r() > .68) {
                softBlob(ctx, x + (r() - .5) * 40, y + 10 + r() * 22, 30 + r() * 120, 3 + r() * 10, "rgba(112,135,157,0.035)", .7, dir);
            }
        }
    }
    for (let i = 0; i < 12; i++) {
        const cx = r() * W;
        const cy = H * (.16 + r() * .25);
        const len = 120 + r() * 300;
        const dir = -.16 + r() * .2;
        for (let k = 0; k < 13; k++) {
            const t = k / 12 - .5;
            const x = cx + Math.cos(dir) * t * len + (r() - .5) * 60;
            const y = cy + Math.sin(dir) * t * len + (r() - .5) * 26;
            softBlob(ctx, x, y, 30 + r() * 100, 3 + r() * 14, "rgba(15,27,39,0.055)", .7, dir);
        }
    }
    return canvasTexture(c, {
        clamp: true
    });
}

function makeMoonTexture() {
    const S = 512;
    const c = makeCanvas(S, S);
    const ctx = c.getContext("2d");
    const cx = S / 2, cy = S / 2;
    ctx.clearRect(0, 0, S, S);
    const halo = ctx.createRadialGradient(cx, cy, 44, cx, cy, 250);
    halo.addColorStop(0, "rgba(218,232,255,0.24)");
    halo.addColorStop(.1, "rgba(157,187,225,0.11)");
    halo.addColorStop(.3, "rgba(108,148,196,0.045)");
    halo.addColorStop(.65, "rgba(76,110,151,0.01)");
    halo.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, 252, 0, Math.PI * 2);
    ctx.fill();
    const disc = ctx.createRadialGradient(cx - 22, cy - 22, 3, cx, cy, 76);
    disc.addColorStop(0, "#ffffff");
    disc.addColorStop(.53, "#f1f4f2");
    disc.addColorStop(.88, "#d9dfe0");
    disc.addColorStop(1, "#b3bdc4");
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(cx, cy, 72, 0, Math.PI * 2);
    ctx.fill();
    const r = mulberry32(8);
    for (let i = 0; i < 26; i++) {
        const ang = r() * Math.PI * 2;
        const dist = Math.sqrt(r()) * 55;
        const px = cx + Math.cos(ang) * dist;
        const py = cy + Math.sin(ang) * dist;
        const rad = 3 + r() * 15;
        const gg = ctx.createRadialGradient(px - rad * .2, py - rad * .2, 0, px, py, rad);
        gg.addColorStop(0, `rgba(110,116,116,${.09 + r() * .12})`);
        gg.addColorStop(.7, `rgba(143,145,136,${.06 + r() * .1})`);
        gg.addColorStop(1, "rgba(240,238,218,0.03)");
        ctx.fillStyle = gg;
        ctx.beginPath();
        ctx.arc(px, py, rad, 0, Math.PI * 2);
        ctx.fill();
    }
    for (let i = 0; i < 80; i++) {
        const ang = r() * Math.PI * 2;
        const dist = Math.sqrt(r()) * 66;
        const px = cx + Math.cos(ang) * dist;
        const py = cy + Math.sin(ang) * dist;
        const rad = .7 + r() * 4.3;
        ctx.fillStyle = `rgba(116,120,118,${.05 + r() * .1})`;
        ctx.beginPath();
        ctx.arc(px, py, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,253,230,0.12)";
        ctx.lineWidth = .7;
        ctx.beginPath();
        ctx.arc(px - .5, py - .5, rad + .5, Math.PI * .8, Math.PI * 1.8);
        ctx.stroke();
    }
    const limb = ctx.createRadialGradient(cx, cy, 53, cx, cy, 73);
    limb.addColorStop(0, "rgba(52,63,75,0)");
    limb.addColorStop(.78, "rgba(52,63,75,0.02)");
    limb.addColorStop(1, "rgba(38,46,56,0.32)");
    ctx.fillStyle = limb;
    ctx.beginPath();
    ctx.arc(cx, cy, 73, 0, Math.PI * 2);
    ctx.fill();
    return canvasTexture(c, {
        clamp: true
    });
}

function makeCloudTexture(seed = 1) {
    const W = 1024, H = 512;
    const c = makeCanvas(W, H);
    const ctx = c.getContext("2d");
    const r = mulberry32(seed);
    ctx.clearRect(0, 0, W, H);
    ctx.filter = "blur(12px)";
    for (let i = 0; i < 150; i++) {
        const t = r();
        const x = W * (.08 + t * .84) + (r() - .5) * 130;
        const y = H * .5 + Math.sin(t * 6 + seed) * 35 + (r() - .5) * 75;
        const rx = 35 + r() * 160;
        const ry = 8 + r() * 38;
        const a = .04 + r() * .12;
        softBlob(ctx, x, y, rx, ry, `rgba(218,229,241,${a})`, 1, (r() - .5) * .18);
    }
    ctx.filter = "none";
    ctx.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 110; i++) {
        const x = r() * W, y = r() * H;
        softBlob(ctx, x, y, 30 + r() * 120, 8 + r() * 45, "rgba(0,0,0,0.2)", .75, r() * Math.PI);
    }
    ctx.globalCompositeOperation = "source-over";
    return canvasTexture(c, {
        clamp: true
    });
}

function makeGlowTexture() {
    const S = 256;
    const c = makeCanvas(S, S);
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, "rgba(255,236,205,0.92)");
    g.addColorStop(.12, "rgba(255,194,118,0.62)");
    g.addColorStop(.36, "rgba(255,151,63,0.18)");
    g.addColorStop(1, "rgba(255,128,39,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    return canvasTexture(c, {
        clamp: true
    });
}

function makeStreakTexture() {
    const W = 128, H = 1024;
    const c = makeCanvas(W, H);
    const ctx = c.getContext("2d");
    const r = mulberry32(55);
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) {
        const x = W / 2 + (r() - .5) * 15;
        const y = r() * H;
        const rx = 6 + r() * 32;
        const ry = 12 + r() * 100;
        softBlob(ctx, x, y, rx, ry, "rgba(255,215,166,0.075)", 1, 0);
    }
    const v = ctx.createLinearGradient(0, 0, 0, H);
    v.addColorStop(0, "rgba(255,200,130,0)");
    v.addColorStop(.06, "rgba(255,200,130,0.85)");
    v.addColorStop(.28, "rgba(255,177,95,0.32)");
    v.addColorStop(.7, "rgba(255,150,69,0.09)");
    v.addColorStop(1, "rgba(255,140,55,0)");
    ctx.globalCompositeOperation = "destination-in";
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
    return canvasTexture(c, {
        clamp: true
    });
}

function makeMistTexture(seed = 2) {
    const W = 512, H = 256;
    const c = makeCanvas(W, H);
    const ctx = c.getContext("2d");
    const r = mulberry32(seed);
    ctx.clearRect(0, 0, W, H);
    ctx.filter = "blur(16px)";
    for (let i = 0; i < 70; i++) {
        const x = W * (.12 + r() * .76);
        const y = H * (.3 + r() * .46);
        const rx = 25 + r() * 100;
        const ry = 10 + r() * 42;
        softBlob(ctx, x, y, rx, ry, "rgba(194,211,227,0.14)", 1, (r() - .5) * .25);
    }
    ctx.filter = "none";
    const v = ctx.createLinearGradient(0, 0, 0, H);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(.28, "rgba(255,255,255,0.72)");
    v.addColorStop(.68, "rgba(255,255,255,0.58)");
    v.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalCompositeOperation = "destination-in";
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
    return canvasTexture(c, {
        clamp: true
    });
}

function makeLeafTexture() {
    const S = 512;
    const c = makeCanvas(S, S);
    const ctx = c.getContext("2d");
    const r = mulberry32(73);
    ctx.clearRect(0, 0, S, S);
    for (let i = 0; i < 148; i++) {
        const cx = 256 + (r() - .5) * 320;
        const cy = 256 + (r() - .5) * 320;
        const len = 38 + r() * 98;
        const wid = len * (.2 + r() * .2);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(r() * Math.PI * 2);
        ctx.fillStyle = `rgba(${55 + r() * 36}, ${73 + r() * 40}, ${48 + r() * 34}, ${.65 + r() * .35})`;
        ctx.beginPath();
        ctx.moveTo(0, -len / 2);
        ctx.bezierCurveTo(wid, -len * .2, wid * .7, len * .55, 0, len / 2);
        ctx.bezierCurveTo(-wid * .7, len * .55, -wid, -len * .2, 0, -len / 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(177,184,141,0.2)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -len / 2 + 4);
        ctx.lineTo(0, len / 2 - 3);
        ctx.stroke();
        ctx.restore();
    }
    return canvasTexture(c, {
        clamp: true
    });
}

function makeBarkTextures() {
    const W = 512, H = 1024;
    const c = makeCanvas(W, H);
    const ctx = c.getContext("2d");
    const r = mulberry32(441);
    ctx.fillStyle = "#3c352c";
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 180; i++) {
        const x = r() * W;
        ctx.strokeStyle = r() > .5 ? `rgba(9,8,6,${.18 + r() * .4})` : `rgba(151,134,106,${.07 + r() * .22})`;
        ctx.lineWidth = 1.2 + r() * 6.5;
        ctx.beginPath();
        ctx.moveTo(x, -20);
        let px = x;
        for (let y = 0; y < H + 20; y += 55) {
            px += (r() - .5) * 28;
            ctx.lineTo(px, y);
        }
        ctx.stroke();
    }
    for (let i = 0; i < 85; i++) {
        softBlob(ctx, r() * W, r() * H, 3 + r() * 22, 12 + r() * 58, r() > .5 ? "rgba(9,9,7,0.4)" : "rgba(142,130,104,0.09)", .8, 0);
    }
    for (let i = 0; i < 100; i++) {
        softBlob(ctx, r() * W * .6, H * (.3 + r() * .7), 5 + r() * 24, 3 + r() * 16, "rgba(43,64,38,0.18)", .8, r() * Math.PI);
    }
    grain(ctx, W, H, .18, "overlay");
    return {
        map: canvasTexture(c, {
            repeat: [ 1.4, 2.1 ]
        }),
        bump: canvasTexture(c, {
            srgb: false,
            repeat: [ 1.4, 2.1 ]
        })
    };
}

function makeLeafLitterTexture() {
    const S = 256;
    const c = makeCanvas(S, S);
    const ctx = c.getContext("2d");
    const r = mulberry32(29);
    ctx.clearRect(0, 0, S, S);
    ctx.translate(S / 2, S / 2);
    const len = 200;
    ctx.fillStyle = "#6e4b2d";
    ctx.beginPath();
    ctx.moveTo(0, -len / 2);
    ctx.bezierCurveTo(50, -70, 54, 60, 0, len / 2);
    ctx.bezierCurveTo(-54, 60, -50, -70, 0, -len / 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(35,22,12,0.6)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -len / 2 + 8);
    ctx.lineTo(0, len / 2 - 8);
    ctx.stroke();
    for (let i = -4; i <= 4; i++) {
        ctx.strokeStyle = "rgba(40,26,14,0.32)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, i * 18);
        ctx.lineTo(i > 0 ? 28 : -28, i * 18 - 22);
        ctx.stroke();
    }
    grain(ctx, S, S, .2, "overlay");
    return canvasTexture(c, {
        clamp: true
    });
}

function makeConiferCardTexture(seed = 1) {
    const W = 512, H = 1024;
    const c = makeCanvas(W, H);
    const ctx = c.getContext("2d");
    const r = mulberry32(seed * 71 + 9);
    ctx.clearRect(0, 0, W, H);
    const cx = W * (.48 + (r() - .5) * .06);
    const topY = 42 + r() * 38;
    const baseY = 930 + r() * 26;
    const tiers = 34;
    const right = [];
    const left = [];
    for (let i = 0; i <= tiers; i++) {
        const t = i / tiers;
        const y = topY + t * (baseY - topY);
        const grow = Math.pow(t, .82);
        const maxHalf = W * .085 + grow * (W * .36) * (.8 + r() * .34);
        const droop = r() * 22;
        right.push({
            y: y + droop * (.2 + r()),
            x: cx + maxHalf * (.75 + r() * .35),
            tipY: y + 7 + r() * 24
        });
        left.push({
            y: y + droop * (.2 + r()),
            x: cx - maxHalf * (.75 + r() * .35),
            tipY: y + 7 + r() * 24
        });
    }
    const body = new Path2D;
    body.moveTo(cx, topY - 8);
    for (let i = 0; i < right.length; i++) {
        const p = right[i];
        body.lineTo(p.x, p.y);
        if (i < right.length - 1) {
            body.lineTo(cx + (p.x - cx) * .44, p.tipY + 10);
        }
    }
    body.lineTo(cx + 9, baseY);
    body.lineTo(cx - 9, baseY);
    for (let i = left.length - 1; i >= 0; i--) {
        const p = left[i];
        body.lineTo(p.x, p.y);
        if (i > 0) {
            body.lineTo(cx - (cx - p.x) * .44, p.tipY + 10);
        }
    }
    body.closePath();
    const fill = ctx.createLinearGradient(0, topY, 0, baseY);
    fill.addColorStop(0, "rgba(53, 74, 60, 0.94)");
    fill.addColorStop(.5, "rgba(28, 44, 35, 0.96)");
    fill.addColorStop(1, "rgba(13, 24, 20, 0.98)");
    ctx.fillStyle = fill;
    ctx.fill(body);
    ctx.save();
    ctx.clip(body);
    for (let i = 0; i < 260; i++) {
        const t = Math.pow(r(), .7);
        const side = r() > .5 ? 1 : -1;
        const y = topY + t * (baseY - topY - 30);
        const half = W * .03 + t * W * .39;
        const x = cx + side * half * (.15 + r() * .85);
        ctx.strokeStyle = r() > .68 ? `rgba(113, 132, 111, ${.035 + r() * .1})` : `rgba(5, 13, 10, ${.05 + r() * .2})`;
        ctx.lineWidth = 1.2 + r() * 3.8;
        ctx.beginPath();
        ctx.moveTo(cx + side * half * .08, y);
        ctx.quadraticCurveTo(x - side * 12, y + 12 + r() * 18, x, y + 26 + r() * 34);
        ctx.stroke();
    }
    for (let i = 0; i < 420; i++) {
        const t = Math.pow(r(), .6);
        const y = topY + t * (baseY - topY);
        const half = W * .025 + t * W * .4;
        const side = r() > .5 ? 1 : -1;
        const x = cx + side * r() * half;
        const rad = 1.5 + r() * 7.5;
        ctx.fillStyle = r() > .76 ? `rgba(105, 126, 106, ${.035 + r() * .1})` : `rgba(9, 20, 15, ${.05 + r() * .16})`;
        ctx.beginPath();
        ctx.ellipse(x, y, rad * 1.5, rad, r() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }
    for (let i = 0; i < 90; i++) {
        const t = Math.pow(r(), .8);
        const y = topY + 20 + t * (baseY - topY) * .5;
        const x = cx - (W * .02 + t * W * .28) * r();
        ctx.strokeStyle = `rgba(153, 171, 159, ${.04 + r() * .12})`;
        ctx.lineWidth = .8 + r() * 1.8;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 9 - r() * 22, y + 9 + r() * 25);
        ctx.stroke();
    }
    ctx.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 70; i++) {
        const t = Math.pow(r(), .55);
        const y = topY + 80 + t * (baseY - topY - 100);
        const half = W * .03 + t * W * .32;
        const x = cx + (r() - .5) * 2 * half;
        softBlob(ctx, x, y, 2 + r() * 8, 1 + r() * 5, "rgba(0,0,0,0.65)", .7, r() * Math.PI);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
    ctx.strokeStyle = "rgba(22, 24, 20, 0.9)";
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(cx, baseY + 70);
    ctx.quadraticCurveTo(cx + 5, baseY * .7, cx + 1, topY + 20);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
        const y = baseY - i * 46 - r() * 30;
        ctx.lineWidth = 2.5 - i * .2;
        ctx.beginPath();
        ctx.moveTo(cx, y);
        ctx.quadraticCurveTo(cx + (r() - .5) * 60, y + 30, cx + (r() - .5) * 130, y + 65);
        ctx.stroke();
    }
    return canvasTexture(c, {
        clamp: true
    });
}

function makeBroadleafCardTexture(seed = 1) {
    const W = 512, H = 1024;
    const c = makeCanvas(W, H);
    const ctx = c.getContext("2d");
    const r = mulberry32(seed * 137 + 31);
    ctx.clearRect(0, 0, W, H);
    const cx = W * (.5 + (r() - .5) * .08);
    const crownBase = 720 + r() * 40;
    const crownTop = 60 + r() * 40;
    ctx.strokeStyle = "rgba(22, 22, 17, 0.92)";
    ctx.lineCap = "round";
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.moveTo(cx + 8, H - 8);
    ctx.bezierCurveTo(cx + 20, 790, cx - 20, 570, cx - 8, 340);
    ctx.stroke();
    ctx.lineWidth = 8;
    const branches = [];
    for (let i = 0; i < 9; i++) {
        const baseY = 350 + r() * 310;
        const side = r() > .5 ? 1 : -1;
        const ex = cx + side * (60 + r() * 170);
        const ey = baseY - 80 - r() * 180;
        branches.push([ cx + (r() - .5) * 20, baseY, ex, ey ]);
        ctx.beginPath();
        ctx.moveTo(cx, baseY);
        ctx.quadraticCurveTo(cx + side * 60, baseY - 50, ex, ey);
        ctx.stroke();
    }
    const crownPath = new Path2D;
    crownPath.moveTo(cx, crownTop);
    const crownPts = [];
    for (let i = 0; i <= 34; i++) {
        const a = i / 34 * Math.PI * 2;
        const rr = .67 + .33 * Math.sin(a * 3 + seed) + r() * .12;
        const x = cx + Math.cos(a) * 208 * rr;
        const y = (crownTop + crownBase) * .5 + Math.sin(a) * 235 * rr;
        crownPts.push([ x, y ]);
        if (i === 0) crownPath.moveTo(x, y); else crownPath.lineTo(x, y);
    }
    crownPath.closePath();
    const cg = ctx.createLinearGradient(0, crownTop, 0, crownBase);
    cg.addColorStop(0, "rgba(62, 86, 68, 0.9)");
    cg.addColorStop(.5, "rgba(28, 47, 36, 0.94)");
    cg.addColorStop(1, "rgba(10, 22, 17, 0.96)");
    ctx.fillStyle = cg;
    ctx.fill(crownPath);
    ctx.save();
    ctx.clip(crownPath);
    for (let i = 0; i < 900; i++) {
        const a = r() * Math.PI * 2;
        const rad = Math.sqrt(r());
        const x = cx + Math.cos(a) * 215 * rad;
        const y = (crownTop + crownBase) * .5 + Math.sin(a) * 245 * rad;
        const s = 2 + r() * 12;
        const bright = r();
        ctx.fillStyle = bright > .82 ? `rgba(125, 145, 116, ${.05 + r() * .12})` : bright > .5 ? `rgba(44, 65, 48, ${.08 + r() * .14})` : `rgba(8, 18, 13, ${.08 + r() * .2})`;
        ctx.beginPath();
        ctx.ellipse(x, y, s * 1.5, s * .72, r() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 90; i++) {
        const a = r() * Math.PI * 2;
        const rad = .35 + Math.sqrt(r()) * .75;
        const x = cx + Math.cos(a) * 210 * rad;
        const y = (crownTop + crownBase) * .5 + Math.sin(a) * 240 * rad;
        softBlob(ctx, x, y, 3 + r() * 12, 2 + r() * 7, "rgba(0,0,0,0.6)", .7, r() * Math.PI);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
    ctx.strokeStyle = "rgba(24, 25, 19, 0.55)";
    for (const b of branches) {
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(b[0], b[1]);
        ctx.quadraticCurveTo((b[0] + b[2]) * .5, b[1] - 45, b[2], b[3]);
        ctx.stroke();
    }
    return canvasTexture(c, {
        clamp: true
    });
}

function makeShojiTexture() {
    const S = 512;
    const c = makeCanvas(S, S);
    const ctx = c.getContext("2d");
    const r = mulberry32(315);
    const g = ctx.createRadialGradient(S * .46, S * .42, 10, S * .5, S * .5, S * .75);
    g.addColorStop(0, "#fff0ce");
    g.addColorStop(.52, "#f6dfb6");
    g.addColorStop(1, "#b98d5a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 520; i++) {
        const x = r() * S, y = r() * S;
        ctx.strokeStyle = r() > .5 ? `rgba(101,64,31,${.02 + r() * .05})` : `rgba(255,246,218,${.03 + r() * .08})`;
        ctx.lineWidth = .4 + r() * 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + (r() - .5) * 30, y + 22, x + (r() - .5) * 52, y + 44 + r() * 90);
        ctx.stroke();
    }
    const vg = ctx.createLinearGradient(0, 0, S, S);
    vg.addColorStop(0, "rgba(63,35,15,0.26)");
    vg.addColorStop(.18, "rgba(63,35,15,0)");
    vg.addColorStop(.82, "rgba(63,35,15,0)");
    vg.addColorStop(1, "rgba(51,27,10,0.32)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, S, S);
    grain(ctx, S, S, .06, "overlay");
    return canvasTexture(c, {
        clamp: true
    });
}

function makeForestPanoramaTexture(seed = 1) {
    const W = 4096, H = 1024;
    const c = makeCanvas(W, H);
    const ctx = c.getContext("2d");
    const r = mulberry32(seed * 271 + 17);
    ctx.clearRect(0, 0, W, H);
    const ridgeTop = (x, base, amp, phase) => base - amp * (.52 + .31 * Math.sin(x / W * Math.PI * 2 * 2 + phase)) - amp * .22 * Math.sin(x / W * Math.PI * 2 * 5 + phase * 2.3) - amp * .11 * Math.sin(x / W * Math.PI * 2 * 11 + phase * .7);
    const drawWrapped = (x, pad, fn) => {
        fn(x);
        if (x < pad) fn(x + W);
        if (x > W - pad) fn(x - W);
    };
    const layers = [ {
        base: 790,
        amp: 82,
        phase: .8,
        fill: "#273a45",
        clumps: [ "#2e4350", "#20323c", "#354b57", "#1a2b34" ],
        high: "rgba(123,149,162,0.10)",
        trunks: "#1b2b34",
        count: 780,
        talles: 11,
        trunkCount: 22
    }, {
        base: 890,
        amp: 72,
        phase: 2.1,
        fill: "#172b33",
        clumps: [ "#1d333b", "#11242b", "#243c43", "#0c1c23" ],
        high: "rgba(104,131,141,0.075)",
        trunks: "#0d1d23",
        count: 940,
        talles: 8,
        trunkCount: 34
    }, {
        base: 1032,
        amp: 58,
        phase: 4.2,
        fill: "#091719",
        clumps: [ "#0d2022", "#061113", "#132628", "#041011" ],
        high: "rgba(79,104,100,0.045)",
        trunks: "#071312",
        count: 1120,
        talles: 4,
        trunkCount: 46
    } ];
    const addConifer = (x, baseY, topY, halfW, color) => {
        const tiers = 15;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x, topY);
        for (let i = 1; i <= tiers; i++) {
            const t = i / tiers;
            const y = topY + (baseY - topY) * t * .86;
            const hw = halfW * Math.pow(t, .9) * (.72 + r() * .36);
            ctx.lineTo(x + hw, y);
            ctx.lineTo(x + hw * .24, y + (baseY - topY) * .024);
        }
        ctx.lineTo(x + 3, baseY);
        ctx.lineTo(x - 3, baseY);
        for (let i = tiers; i >= 1; i--) {
            const t = i / tiers;
            const y = topY + (baseY - topY) * t * .86;
            const hw = halfW * Math.pow(t, .9) * (.72 + r() * .36);
            ctx.lineTo(x - hw * .24, y + (baseY - topY) * .024);
            ctx.lineTo(x - hw, y);
        }
        ctx.closePath();
        ctx.fill();
    };
    for (let li = 0; li < layers.length; li++) {
        const L = layers[li];
        const phase = L.phase;
        const step = 8;
        ctx.beginPath();
        ctx.moveTo(-10, H);
        for (let x = -10; x <= W + 10; x += step) {
            ctx.lineTo(x, ridgeTop(x, L.base, L.amp, phase));
        }
        ctx.lineTo(W + 10, H);
        ctx.closePath();
        ctx.fillStyle = L.fill;
        ctx.fill();
        const edgeGrad = ctx.createLinearGradient(0, L.base - L.amp * 1.3, 0, H);
        ctx.fillStyle = L.fill;
        for (let i = 0; i < L.count; i++) {
            const x = r() * W;
            const top = ridgeTop(x, L.base, L.amp, phase);
            const bias = Math.pow(r(), .7);
            const y = top - 34 + bias * (L.base - top + 74);
            const rx = 4 + Math.pow(r(), 1.5) * (28 + li * 4);
            const ry = 3 + Math.pow(r(), 1.35) * (18 + li * 2);
            const color = L.clumps[Math.floor(r() * L.clumps.length)];
            const alpha = .55 + r() * .45;
            drawWrapped(x, rx + 4, xx => {
                ctx.globalAlpha = alpha;
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.ellipse(xx, y, rx, ry, (r() - .5) * .3, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(xx + rx * .42, y + ry * .2, rx * .58, ry * .64, .2, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(xx - rx * .38, y + ry * .28, rx * .55, ry * .58, -.15, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = alpha * .26;
                ctx.fillStyle = L.high;
                ctx.beginPath();
                ctx.ellipse(xx - rx * .2, y - ry * .36, rx * .52, ry * .42, -.3, 0, Math.PI * 2);
                ctx.fill();
            });
        }
        ctx.globalAlpha = 1;
        for (let i = 0; i < L.talles; i++) {
            const x = 90 + r() * (W - 180);
            const top = ridgeTop(x, L.base, L.amp, phase);
            const topY = Math.min(top - 90 - r() * 160, L.base - 320);
            const halfW = 28 + r() * 45;
            const col = li === 0 ? "#253943" : li === 1 ? "#14272e" : "#0a191b";
            drawWrapped(x, 120, xx => addConifer(xx, L.base - 20, topY, halfW, col));
        }
        for (let i = 0; i < L.trunkCount; i++) {
            const x = r() * W;
            const top = ridgeTop(x, L.base, L.amp, phase);
            const baseY = L.base - 20 + r() * (H - L.base + 40);
            const startY = top + 90 + r() * 170;
            const lean = (r() - .5) * 34;
            ctx.strokeStyle = L.trunks;
            ctx.globalAlpha = .38 + r() * .4;
            ctx.lineWidth = 1.4 + r() * (2.4 + li * .7);
            ctx.beginPath();
            ctx.moveTo(x, baseY);
            ctx.quadraticCurveTo(x + lean * .4, (baseY + startY) * .5, x + lean, startY);
            ctx.stroke();
            if (r() > .42) {
                ctx.lineWidth *= .5;
                ctx.beginPath();
                ctx.moveTo(x + lean * .7, startY + 36);
                ctx.lineTo(x + lean + (r() - .5) * 80, startY - 8 + r() * 40);
                ctx.stroke();
            }
        }
        ctx.globalAlpha = 1;
        for (let i = 0; i < 5200; i++) {
            const x = r() * W;
            const top = ridgeTop(x, L.base, L.amp, phase);
            const y = top - 28 + r() * (L.base - top + 55);
            const g = r();
            ctx.fillStyle = g > .74 ? L.high : g > .4 ? "rgba(2,8,8,0.16)" : "rgba(45,65,66,0.08)";
            ctx.fillRect(x, y, .8 + r() * 2.6, .6 + r() * 2.2);
        }
        if (li < 2) {
            for (let i = 0; i < 17; i++) {
                const x = r() * W;
                const y = L.base - 90 - r() * 180;
                softBlob(ctx, x, y, 150 + r() * 360, 8 + r() * 26, li === 0 ? "rgba(118,142,157,0.06)" : "rgba(99,126,137,0.05)", .8, (r() - .5) * .1);
                if (x < 380 || x > W - 380) {
                    softBlob(ctx, (x + W / 2) % W, y, 150 + r() * 360, 8 + r() * 26, li === 0 ? "rgba(118,142,157,0.06)" : "rgba(99,126,137,0.05)", .8, (r() - .5) * .1);
                }
            }
        }
    }
    const baseGrad = ctx.createLinearGradient(0, H * .82, 0, H);
    baseGrad.addColorStop(0, "rgba(4,10,11,0)");
    baseGrad.addColorStop(1, "rgba(2,7,8,0.98)");
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, H * .8, W, H * .2);
    grain(ctx, W, H, .08, "overlay");
    const tex = canvasTexture(c, {
        clamp: false
    });
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(2, 1);
    return tex;
}

function makeWaterNormalTexture() {
    const S = 256;
    const c = makeCanvas(S, S);
    const ctx = c.getContext("2d");
    const img = ctx.createImageData(S, S);
    const h = (x, y) => {
        const u = (x + S) % S / S;
        const v = (y + S) % S / S;
        return Math.sin(u * Math.PI * 2 * 3 + Math.sin(v * Math.PI * 2 * 2) * 1.4) * .46 + Math.sin(v * Math.PI * 2 * 7 + Math.cos(u * Math.PI * 2 * 3) * 1.1) * .32 + Math.sin((u * 11 + v * 13) * Math.PI * 2 + 1.3) * .13;
    };
    for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
            const dx = (h(x + 1, y) - h(x - 1, y)) * 2.4;
            const dy = (h(x, y + 1) - h(x, y - 1)) * 2.4;
            let nx = -dx, ny = -dy, nz = 1;
            const len = Math.hypot(nx, ny, nz);
            nx /= len;
            ny /= len;
            nz /= len;
            const i = (y * S + x) * 4;
            img.data[i] = (nx * .5 + .5) * 255;
            img.data[i + 1] = (ny * .5 + .5) * 255;
            img.data[i + 2] = (nz * .5 + .5) * 255;
            img.data[i + 3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.NoColorSpace;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    tex.needsUpdate = true;
    return tex;
}

const woodTex = makeWoodTextures();

const waterNormalTex = makeWaterNormalTexture();

const groundRippleTex = waterNormalTex.clone();

groundRippleTex.repeat.set(18, 13);

groundRippleTex.needsUpdate = true;

const stoneTex = makeStoneTextures(3, "neutral");

const darkStoneTex = makeStoneTextures(44, "dark");

const roofTex = makeRoofTextures();

const grassTex = makeGrassTexture();

const pavingTex = makePavingTextures();

const paperTex = makePaperTexture();

const shojiTex = makeShojiTexture();

const plaqueTex = makePlaqueTexture();

const skyTex = makeSkyTexture();

const moonTex = makeMoonTexture();

const cloudTexA = makeCloudTexture(14);

const cloudTexB = makeCloudTexture(57);

const glowTex = makeGlowTexture();

const streakTex = makeStreakTexture();

const mistTexA = makeMistTexture(2);

const mistTexB = makeMistTexture(9);

const leafTex = makeLeafTexture();

const distantFoliageTex = (() => {
    const S = 512;
    const c = makeCanvas(S, S);
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, S, S);
    ctx.filter = "grayscale(1) brightness(1.8) contrast(0.72)";
    ctx.drawImage(leafTex.image, 0, 0);
    ctx.filter = "none";
    const shade = ctx.createLinearGradient(0, 0, 0, S);
    shade.addColorStop(0, "rgba(255,255,255,0)");
    shade.addColorStop(1, "rgba(30,44,36,0.28)");
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, S, S);
    ctx.globalCompositeOperation = "source-over";
    return canvasTexture(c, {
        clamp: true
    });
})();

const barkTex = makeBarkTextures();

const litterTex = makeLeafLitterTexture();

const coniferCardTex = [ makeConiferCardTexture(3), makeConiferCardTexture(7), makeConiferCardTexture(13) ];

const broadleafCardTex = [ makeBroadleafCardTexture(5), makeBroadleafCardTexture(11) ];

const forestPanoramaTex = makeForestPanoramaTexture(9);

const woodMat = new THREE.MeshStandardMaterial({
    map: woodTex.map,
    bumpMap: woodTex.bump,
    bumpScale: .035,
    color: 14667709,
    roughness: .68,
    metalness: .02,
    envMapIntensity: .28
});

const darkWoodMat = new THREE.MeshStandardMaterial({
    map: woodTex.map,
    bumpMap: woodTex.bump,
    bumpScale: .04,
    color: 10257001,
    roughness: .8,
    metalness: .015,
    envMapIntensity: .2
});

const wovenMat = new THREE.MeshStandardMaterial({
    map: roofTex.map,
    bumpMap: roofTex.bump,
    bumpScale: .05,
    color: 4410706,
    roughness: .9,
    metalness: .02
});

const roofMat = new THREE.MeshPhysicalMaterial({
    map: roofTex.map,
    bumpMap: roofTex.bump,
    bumpScale: .13,
    color: 14739169,
    roughness: .6,
    metalness: .1,
    clearcoat: .25,
    clearcoatRoughness: .22,
    envMapIntensity: .4
});

const roofUnderMat = new THREE.MeshStandardMaterial({
    map: roofTex.map,
    bumpMap: roofTex.bump,
    bumpScale: .045,
    color: 9871006,
    roughness: .8,
    metalness: .04,
    emissive: new THREE.Color(1582897),
    emissiveIntensity: .27,
    side: THREE.DoubleSide,
    envMapIntensity: .24
});

const stoneMat = new THREE.MeshStandardMaterial({
    map: stoneTex.map,
    bumpMap: stoneTex.bump,
    bumpScale: .055,
    color: 14474444,
    roughness: .8,
    metalness: .02,
    envMapIntensity: .4
});

const darkStoneMat = new THREE.MeshStandardMaterial({
    map: darkStoneTex.map,
    bumpMap: darkStoneTex.bump,
    bumpScale: .065,
    color: 12830911,
    roughness: .84,
    metalness: .02,
    envMapIntensity: .32
});

const stoneCarveMat = new THREE.MeshStandardMaterial({
    map: stoneTex.map,
    bumpMap: stoneTex.bump,
    bumpScale: .045,
    color: 15461085,
    roughness: .76,
    metalness: .02,
    envMapIntensity: .34
});

const bronzeMat = new THREE.MeshStandardMaterial({
    color: 7491884,
    roughness: .35,
    metalness: .86,
    envMapIntensity: 1.15
});

const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 1907479,
    roughness: .5,
    metalness: .65,
    envMapIntensity: .65
});

const pavingMat = new THREE.MeshPhysicalMaterial({
    map: pavingTex.map,
    roughnessMap: pavingTex.roughnessMap,
    bumpMap: pavingTex.bumpMap,
    bumpScale: .12,
    color: 10003098,
    roughness: .95,
    metalness: .08,
    clearcoat: .34,
    clearcoatRoughness: .29,
    clearcoatNormalMap: groundRippleTex,
    clearcoatNormalScale: new THREE.Vector2(.15, .15),
    envMapIntensity: .62
});

const mossMat = new THREE.MeshStandardMaterial({
    color: 2438431,
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide
});

const paperMatBase = new THREE.MeshStandardMaterial({
    map: paperTex,
    emissiveMap: paperTex,
    emissive: new THREE.Color(16749638),
    emissiveIntensity: .62,
    color: 4139798,
    roughness: .88,
    metalness: 0,
    side: THREE.DoubleSide,
    transparent: false
});

const interiorGlowMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(16761978).multiplyScalar(1.15),
    toneMapped: true
});

const windowGlowMat = new THREE.MeshStandardMaterial({
    color: 2825487,
    emissive: new THREE.Color(16752206),
    emissiveIntensity: .62,
    roughness: .95,
    metalness: 0
});

const plaqueMat = new THREE.MeshStandardMaterial({
    map: plaqueTex,
    color: 11969149,
    roughness: .62,
    metalness: .12,
    emissive: new THREE.Color(2889480),
    emissiveIntensity: .4,
    envMapIntensity: .42
});

const barkMat = new THREE.MeshStandardMaterial({
    map: barkTex.map,
    bumpMap: barkTex.bump,
    bumpScale: .24,
    color: 12102548,
    roughness: .76,
    metalness: .02,
    emissive: new THREE.Color(2365968),
    emissiveMap: barkTex.map,
    emissiveIntensity: .3,
    envMapIntensity: .32
});

const leafMat = new THREE.MeshStandardMaterial({
    map: leafTex,
    color: 2832685,
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide,
    alphaTest: .38,
    transparent: false,
    envMapIntensity: .12
});

const litterMat = new THREE.MeshStandardMaterial({
    map: litterTex,
    color: 11569756,
    roughness: .82,
    metalness: 0,
    side: THREE.DoubleSide,
    alphaTest: .28,
    transparent: false
});

const unitBox = new THREE.BoxGeometry(1, 1, 1);

const unitCylinder = new THREE.CylinderGeometry(.5, .5, 1, 10, 1);

const unitPlane = new THREE.PlaneGeometry(1, 1);

class BoxBatch {
    constructor(material, options = {}) {
        this.material = material;
        this.items = [];
        this.castShadow = options.castShadow ?? false;
        this.receiveShadow = options.receiveShadow ?? true;
        this.geo = options.geometry || unitBox;
    }
    add(position, scale, quat = null, color = null) {
        this.items.push({
            p: position.clone ? position.clone() : new THREE.Vector3(position[0], position[1], position[2]),
            s: scale.clone ? scale.clone() : new THREE.Vector3(scale[0], scale[1], scale[2]),
            q: quat ? quat.clone() : new THREE.Quaternion,
            c: color
        });
        return this;
    }
    addEuler(position, scale, rx, ry, rz, color = null) {
        const q = (new THREE.Quaternion).setFromEuler(new THREE.Euler(rx, ry, rz));
        return this.add(new THREE.Vector3(...position), new THREE.Vector3(...scale), q, color);
    }
    build(parent) {
        if (!this.items.length) return null;
        const mesh = new THREE.InstancedMesh(this.geo, this.material, this.items.length);
        const m = new THREE.Matrix4;
        for (let i = 0; i < this.items.length; i++) {
            const it = this.items[i];
            m.compose(it.p, it.q, it.s);
            mesh.setMatrixAt(i, m);
            if (it.c !== null) mesh.setColorAt(i, new THREE.Color(it.c));
        }
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.castShadow = this.castShadow;
        mesh.receiveShadow = this.receiveShadow;
        mesh.frustumCulled = false;
        parent.add(mesh);
        return mesh;
    }
}

function addBox(parent, material, size, position, rotation = null, cast = true, receive = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
    mesh.position.set(position[0], position[1], position[2]);
    if (rotation) mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    parent.add(mesh);
    return mesh;
}

function addCylinder(parent, material, rTop, rBottom, height, position, segments = 12, cast = true) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, height, segments), material);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
}

function worldDirectionFromScreen(ndcX, ndcY, cameraRef = camera) {
    cameraRef.updateMatrixWorld();
    return new THREE.Vector3(ndcX, ndcY, .25).unproject(cameraRef).sub(cameraRef.position).normalize();
}

function buildSky() {
    const skyGeo = new THREE.SphereGeometry(360, 64, 36);
    const skyMat = new THREE.MeshBasicMaterial({
        map: skyTex,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false
    });
    skyDome = new THREE.Mesh(skyGeo, skyMat);
    skyDome.renderOrder = -10;
    scene.add(skyDome);
    const moonDirection = worldDirectionFromScreen(-.507, .806);
    const moonDistance = 245;
    const moonMaterial = new THREE.SpriteMaterial({
        map: moonTex,
        color: new THREE.Color(1.95, 2, 2.15),
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        fog: false
    });
    moonSprite = new THREE.Sprite(moonMaterial);
    moonSprite.position.copy(camera.position).addScaledVector(moonDirection, moonDistance);
    moonSprite.scale.set(34, 34, 1);
    moonSprite.renderOrder = -6;
    scene.add(moonSprite);
    const haloMat = new THREE.SpriteMaterial({
        map: glowTex,
        color: new THREE.Color(.28, .38, .55),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        opacity: .34,
        fog: false
    });
    const moonHalo = new THREE.Sprite(haloMat);
    moonHalo.position.copy(moonSprite.position);
    moonHalo.position.z += .3;
    moonHalo.scale.set(56, 56, 1);
    moonHalo.renderOrder = -9;
    scene.add(moonHalo);
    const envCanvas = makeCanvas(1024, 512);
    const ectx = envCanvas.getContext("2d");
    const eg = ectx.createLinearGradient(0, 0, 0, 512);
    eg.addColorStop(0, "#07121f");
    eg.addColorStop(.43, "#1d3043");
    eg.addColorStop(.56, "#415266");
    eg.addColorStop(1, "#101820");
    ectx.fillStyle = eg;
    ectx.fillRect(0, 0, 1024, 512);
    const hg = ectx.createLinearGradient(0, 230, 0, 330);
    hg.addColorStop(0, "rgba(0,0,0,0)");
    hg.addColorStop(.48, "rgba(132,155,179,0.13)");
    hg.addColorStop(.74, "rgba(159,176,191,0.08)");
    hg.addColorStop(1, "rgba(0,0,0,0)");
    ectx.fillStyle = hg;
    ectx.fillRect(0, 200, 1024, 160);
    const envTex = new THREE.CanvasTexture(envCanvas);
    envTex.mapping = THREE.EquirectangularReflectionMapping;
    envTex.colorSpace = THREE.SRGBColorSpace;
    envTex.needsUpdate = true;
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromEquirectangular(envTex).texture;
    pmrem.dispose();
    envTex.dispose();
    const cloudDefs = [ {
        tex: cloudTexA,
        ndc: [ -.63, .83 ],
        dist: 205,
        scale: [ 78, 31 ],
        opacity: .36,
        drift: .11,
        tint: 12175836
    }, {
        tex: cloudTexB,
        ndc: [ -.36, .71 ],
        dist: 210,
        scale: [ 98, 28 ],
        opacity: .3,
        drift: -.08,
        tint: 10137799
    }, {
        tex: cloudTexA,
        ndc: [ -.76, .56 ],
        dist: 218,
        scale: [ 80, 24 ],
        opacity: .27,
        drift: .06,
        tint: 10926541
    }, {
        tex: cloudTexB,
        ndc: [ -.05, .51 ],
        dist: 220,
        scale: [ 124, 30 ],
        opacity: .22,
        drift: -.05,
        tint: 8164266
    }, {
        tex: cloudTexA,
        ndc: [ .23, .72 ],
        dist: 230,
        scale: [ 108, 26 ],
        opacity: .17,
        drift: .04,
        tint: 7572388
    }, {
        tex: cloudTexB,
        ndc: [ .02, .86 ],
        dist: 228,
        scale: [ 94, 22 ],
        opacity: .12,
        drift: .03,
        tint: 8953784
    }, {
        tex: cloudTexA,
        ndc: [ -.2, .91 ],
        dist: 214,
        scale: [ 72, 18 ],
        opacity: .15,
        drift: -.04,
        tint: 10860748
    } ];
    for (let i = 0; i < cloudDefs.length; i++) {
        const def = cloudDefs[i];
        const dir = worldDirectionFromScreen(def.ndc[0], def.ndc[1]);
        const mat = new THREE.SpriteMaterial({
            map: def.tex,
            color: def.tint,
            transparent: true,
            opacity: def.opacity,
            depthWrite: false,
            blending: THREE.NormalBlending,
            toneMapped: true,
            fog: false
        });
        const sp = new THREE.Sprite(mat);
        sp.position.copy(camera.position).addScaledVector(dir, def.dist);
        sp.scale.set(def.scale[0], def.scale[1], 1);
        sp.renderOrder = -7;
        sp.userData.baseX = sp.position.x;
        sp.userData.baseY = sp.position.y;
        sp.userData.baseOpacity = def.opacity;
        sp.userData.drift = def.drift;
        sp.userData.phase = i * 1.73;
        cloudSprites.push(sp);
        scene.add(sp);
    }
    return {
        moonDirection: moonDirection
    };
}

const SKY = buildSky();

const hemisphere = new THREE.HemisphereLight(7441835, 4473917, 1.18);

scene.add(hemisphere);

const ambient = new THREE.AmbientLight(3031382, .8);

scene.add(ambient);

const fillLight = new THREE.DirectionalLight(10336213, .16);

fillLight.position.set(28, 25, 18);

scene.add(fillLight);

const skyFill = new THREE.DirectionalLight(10467800, 1.52);

skyFill.position.set(-24, 30, 38);

skyFill.target.position.set(1, 5, -5);

scene.add(skyFill.target);

scene.add(skyFill);

moonLight = new THREE.DirectionalLight(12111087, 2.34);

moonLight.position.copy(SKY.moonDirection).multiplyScalar(85).add(new THREE.Vector3(0, 0, -4));

moonLight.target.position.set(0, 0, -4);

scene.add(moonLight.target);

moonLight.castShadow = true;

moonLight.shadow.mapSize.set(2048, 2048);

moonLight.shadow.camera.left = -25;

moonLight.shadow.camera.right = 25;

moonLight.shadow.camera.top = 30;

moonLight.shadow.camera.bottom = -14;

moonLight.shadow.camera.near = 10;

moonLight.shadow.camera.far = 170;

moonLight.shadow.bias = -38e-5;

moonLight.shadow.normalBias = .035;

moonLight.shadow.radius = 3.4;

scene.add(moonLight);

const groundBounce = new THREE.Object3D;

scene.add(groundBounce);

const groundGroup = new THREE.Group;

scene.add(groundGroup);

const contactShadowTex = (() => {
    const S = 256;
    const c = makeCanvas(S, S);
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(S / 2, S / 2, 2, S / 2, S / 2, S / 2);
    g.addColorStop(0, "rgba(0,0,0,0.88)");
    g.addColorStop(.45, "rgba(0,0,0,0.55)");
    g.addColorStop(.78, "rgba(0,0,0,0.15)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    return canvasTexture(c, {
        clamp: true
    });
})();

function addContactShadow(x, z, w, d, opacity = .35, rot = 0) {
    const mat = new THREE.MeshBasicMaterial({
        map: contactShadowTex,
        color: 0,
        transparent: true,
        opacity: opacity,
        depthWrite: false,
        blending: THREE.NormalBlending
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = rot;
    mesh.position.set(x, .014, z);
    mesh.renderOrder = 1;
    scene.add(mesh);
    return mesh;
}

const earthMat = new THREE.MeshStandardMaterial({
    map: stoneTex.map,
    bumpMap: stoneTex.bump,
    bumpScale: .08,
    color: 2766121,
    roughness: 1,
    metalness: 0,
    envMapIntensity: .1
});

const earth = new THREE.Mesh(new THREE.PlaneGeometry(190, 150), earthMat);

earth.rotation.x = -Math.PI / 2;

earth.position.set(0, -.045, -10);

earth.receiveShadow = true;

groundGroup.add(earth);

const courtyard = new THREE.Mesh(new THREE.PlaneGeometry(92, 62), pavingMat);

courtyard.rotation.x = -Math.PI / 2;

courtyard.position.set(0, 0, 4);

courtyard.receiveShadow = true;

groundGroup.add(courtyard);

function makePuddle(x, z, rx, rz, rot = 0, opacity = .62) {
    const shape = new THREE.Shape;
    const pts = 22;
    for (let i = 0; i <= pts; i++) {
        const a = i / pts * Math.PI * 2;
        const wobble = 1 + .12 * Math.sin(a * 3 + 1.7) + .08 * Math.sin(a * 7 - .4);
        const px = Math.cos(a) * rx * wobble;
        const py = Math.sin(a) * rz * wobble;
        if (i === 0) shape.moveTo(px, py); else shape.lineTo(px, py);
    }
    const geo = new THREE.ShapeGeometry(shape, 3);
    const mat = new THREE.MeshPhysicalMaterial({
        color: 726556,
        roughness: .12,
        metalness: .22,
        clearcoat: 1,
        clearcoatRoughness: .12,
        normalMap: waterNormalTex,
        normalScale: new THREE.Vector2(.08, .08),
        envMapIntensity: .82,
        transparent: true,
        opacity: opacity * .54,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = "puddle";
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = rot;
    mesh.position.set(x, .018, z);
    mesh.receiveShadow = false;
    groundGroup.add(mesh);
    return mesh;
}

makePuddle(-1.8, 12.5, 3.6, 1.9, .18, .6);

makePuddle(3.9, 8.9, 2.4, .95, .12, .5);

makePuddle(-5.1, 9.3, 1.9, .78, -.25, .54);

makePuddle(8.3, 9.2, 1.7, .72, .24, .46);

makePuddle(6.9, 13.8, 2.2, 1.25, -.4, .48);

makePuddle(1.4, 7.8, 2.8, 1, .06, .44);

makePuddle(-7.2, 17, 2.3, .8, -.22, .38);

makePuddle(10.9, 8.6, 1.35, .62, .3, .38);

(function addLeafLitter() {
    const r = mulberry32(404);
    const count = 330;
    const geo = new THREE.PlaneGeometry(.28, .17);
    const mesh = new THREE.InstancedMesh(geo, litterMat, count);
    const m = new THREE.Matrix4;
    const q = new THREE.Quaternion;
    const e = new THREE.Euler;
    const pos = new THREE.Vector3;
    const scale = new THREE.Vector3;
    for (let i = 0; i < count; i++) {
        let x, z;
        if (i < 100) {
            x = -16 + r() * 33;
            z = 5 + r() * 15;
        } else if (i < 180) {
            x = (r() > .5 ? -1 : 1) * (18 + r() * 17);
            z = -4 + r() * 24;
        } else if (i < 260) {
            x = 9 + r() * 18;
            z = -2 + r() * 18;
        } else {
            x = -2 + r() * 13;
            z = 3.5 + r() * 5.2;
        }
        pos.set(x, .024 + r() * .005, z);
        e.set(-Math.PI / 2 + (r() - .5) * .1, 0, r() * Math.PI * 2);
        q.setFromEuler(e);
        const s = .34 + r() * .78;
        scale.set(s, s, s);
        m.compose(pos, q, scale);
        mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.receiveShadow = true;
    groundGroup.add(mesh);
})();

(function addMossStones() {
    const r = mulberry32(93);
    const stoneGeo = new THREE.DodecahedronGeometry(.15, 0);
    const stoneMesh = new THREE.InstancedMesh(stoneGeo, darkStoneMat, 38);
    const m = new THREE.Matrix4;
    const q = new THREE.Quaternion;
    const pos = new THREE.Vector3;
    const sc = new THREE.Vector3;
    for (let i = 0; i < 38; i++) {
        const a = r() * Math.PI * 2;
        const rad = 5.5 + r() * 8.5;
        pos.set(Math.cos(a) * rad + 1.2, .05 + r() * .04, Math.sin(a) * rad - 1.4);
        q.setFromEuler(new THREE.Euler(r() * .5, r() * Math.PI, r() * .5));
        sc.set(.5 + r() * 1.6, .35 + r() * .8, .5 + r() * 1.3);
        m.compose(pos, q, sc);
        stoneMesh.setMatrixAt(i, m);
    }
    stoneMesh.instanceMatrix.needsUpdate = true;
    stoneMesh.receiveShadow = true;
    groundGroup.add(stoneMesh);
})();

(function addMossPatches() {
    const r = mulberry32(188);
    const geo = new THREE.CircleGeometry(1, 12);
    const count = 24;
    const mesh = new THREE.InstancedMesh(geo, mossMat, count);
    const m = new THREE.Matrix4;
    const q = (new THREE.Quaternion).setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    const pos = new THREE.Vector3;
    const scale = new THREE.Vector3;
    for (let i = 0; i < count; i++) {
        let x = (r() - .5) * 34;
        let z = -4 + r() * 23;
        if (Math.abs(x - 4) < 5 && z > -1) x += 8 * Math.sign(x || 1);
        pos.set(x, .012, z);
        scale.set(.6 + r() * 2.7, .3 + r() * 1.1, 1);
        m.compose(pos, q, scale);
        mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.receiveShadow = true;
    groundGroup.add(mesh);
})();

(function addGroundGrowth() {
    const grassMat = new THREE.MeshStandardMaterial({
        map: grassTex,
        color: 9674873,
        roughness: .95,
        metalness: 0,
        side: THREE.DoubleSide,
        alphaTest: .25,
        transparent: false
    });
    const tuftPositions = [ [ 1.35, 3.3, .62 ], [ 2.15, 2.1, .75 ], [ 2.25, .45, .85 ], [ 8.9, .35, .7 ], [ 8.3, 2.2, .6 ], [ 9.25, 3.3, .8 ], [ 10.6, 4.9, .65 ], [ 9.3, 5.35, .55 ], [ 8.85, 6.8, .72 ], [ 9.95, 7.05, .9 ], [ 10.7, 6.8, .55 ], [ -4.75, 6.65, .7 ], [ -6.1, 6.8, .8 ], [ -11.9, 6.6, .65 ], [ -3.2, .2, .55 ], [ 12.3, 2, .8 ], [ -1, 2.2, .5 ], [ .8, 1.8, .45 ] ];
    const r = mulberry32(735);
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.translate(0, .5, 0);
    const inst = new THREE.InstancedMesh(geo, grassMat, tuftPositions.length * 2);
    const m = new THREE.Matrix4;
    const q = new THREE.Quaternion;
    const p = new THREE.Vector3;
    const sc = new THREE.Vector3;
    let k = 0;
    for (const [x, z, h] of tuftPositions) {
        for (let side = 0; side < 2; side++) {
            p.set(x + (r() - .5) * .14, .01, z + (r() - .5) * .14);
            q.setFromEuler(new THREE.Euler(0, r() * Math.PI + side * Math.PI / 2, 0));
            sc.set(h * (.8 + r() * .3), h, 1);
            m.compose(p, q, sc);
            inst.setMatrixAt(k++, m);
        }
    }
    inst.instanceMatrix.needsUpdate = true;
    inst.castShadow = false;
    inst.receiveShadow = true;
    scene.add(inst);
    const mossGeo = new THREE.DodecahedronGeometry(.2, 0);
    const mossMesh = new THREE.InstancedMesh(mossGeo, mossMat, 80);
    const mm = new THREE.Matrix4;
    const mq = new THREE.Quaternion;
    const mp = new THREE.Vector3;
    const ms = new THREE.Vector3;
    const mr = mulberry32(924);
    for (let i = 0; i < 80; i++) {
        let x, z;
        if (i < 28) {
            x = (i < 14 ? 1.5 : 8.7) + (mr() - .5) * 1.1;
            z = -.2 + mr() * 4.2;
        } else if (i < 52) {
            x = 1 + mr() * 8.4;
            z = .15 + mr() * 1;
        } else if (i < 68) {
            x = -4.8 - mr() * 1.6;
            z = 6.3 + mr() * 1.2;
        } else {
            x = 9.3 + mr() * 1.7;
            z = 6.6 + mr() * 1.4;
        }
        mp.set(x, .035 + mr() * .05, z);
        mq.setFromEuler(new THREE.Euler(mr() * .4, mr() * Math.PI, mr() * .4));
        ms.set(.45 + mr() * 1.5, .18 + mr() * .4, .4 + mr() * 1.2);
        mm.compose(mp, mq, ms);
        mossMesh.setMatrixAt(i, mm);
    }
    mossMesh.instanceMatrix.needsUpdate = true;
    mossMesh.castShadow = false;
    mossMesh.receiveShadow = true;
    scene.add(mossMesh);
})();

function makeRidge(radius, amp, color, seed, segments = 220) {
    const positions = [];
    const indices = [];
    const r = mulberry32(seed);
    const phaseA = r() * Math.PI * 2;
    const phaseB = r() * Math.PI * 2;
    const phaseC = r() * Math.PI * 2;
    for (let i = 0; i <= segments; i++) {
        const a = i / segments * Math.PI * 2;
        const h = amp * (.58 + .22 * Math.sin(a * 2.3 + phaseA) + .13 * Math.sin(a * 5.1 + phaseB) + .07 * Math.sin(a * 11.7 + phaseC)) + amp * .22 * Math.exp(-Math.pow((a - 2.7 - phaseA * .02) * 1.9, 2)) + amp * .15 * Math.exp(-Math.pow((a - 5 + phaseB * .01) * 2.5, 2));
        const x = Math.sin(a) * radius;
        const z = -Math.cos(a) * radius;
        positions.push(x, -4, z, x, h, z);
        if (i < segments) {
            const k = i * 2;
            indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
        }
    }
    const geo = new THREE.BufferGeometry;
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mat = new THREE.MeshBasicMaterial({
        color: color,
        side: THREE.DoubleSide,
        fog: true
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = -5;
    scene.add(mesh);
    return mesh;
}

const farRidge = makeRidge(190, 38, 2240829, 91, 240);

farRidge.position.y = -.5;

const midRidge = makeRidge(112, 30, 1517101, 71, 220);

midRidge.position.y = -.3;

const nearRidge = makeRidge(72, 20, 1056807, 38, 200);

nearRidge.position.y = -.2;

const forestPanorama = new THREE.Mesh(new THREE.CylinderGeometry(47, 47, 29, 160, 1, true), new THREE.MeshBasicMaterial({
    map: forestPanoramaTex,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    fog: true
}));

forestPanorama.position.y = 14.5;

forestPanorama.renderOrder = -4;

scene.add(forestPanorama);

const forestGroup = new THREE.Group;

scene.add(forestGroup);

const forestCardGeo = new THREE.PlaneGeometry(1, 1);

forestCardGeo.translate(0, .5, 0);

(function buildBillboardForest() {
    const r = mulberry32(772);
    const buckets = [ {
        tex: coniferCardTex[0],
        trees: [],
        ratio: .52
    }, {
        tex: coniferCardTex[1],
        trees: [],
        ratio: .57
    }, {
        tex: coniferCardTex[2],
        trees: [],
        ratio: .46
    } ];
    const trees = [];
    const pushTree = (x, z, h, type = -1) => {
        if (type < 0) type = Math.floor(r() * 3);
        trees.push({
            x: x,
            z: z,
            h: h,
            type: type,
            tint: r(),
            phase: r() * Math.PI * 2
        });
    };
    pushTree(-41, -22, 21, 0);
    pushTree(-34, -29, 17, 1);
    pushTree(-27, -19, 22, 2);
    pushTree(-48, -14, 15, 0);
    pushTree(38, -24, 21, 2);
    pushTree(31, -31, 17, 0);
    pushTree(46, -18, 16, 1);
    pushTree(24, -38, 19, 0);
    pushTree(-9, -45, 23, 2);
    pushTree(57, -33, 19, 1);
    pushTree(-58, -37, 20, 2);
    pushTree(12, -52, 18, 0);
    pushTree(-19, -24, 25, 1);
    for (const t of trees) buckets[t.type].trees.push(t);
    for (const bucket of buckets) {
        if (!bucket.trees.length) continue;
        const mat = new THREE.MeshBasicMaterial({
            map: bucket.tex,
            color: 16777215,
            alphaTest: .3,
            side: THREE.DoubleSide,
            transparent: false,
            fog: true
        });
        const mesh = new THREE.InstancedMesh(forestCardGeo, mat, bucket.trees.length * 2);
        const m = new THREE.Matrix4;
        const pos = new THREE.Vector3;
        const q = new THREE.Quaternion;
        const e = new THREE.Euler;
        const sc = new THREE.Vector3;
        const c = new THREE.Color;
        let k = 0;
        for (const tree of bucket.trees) {
            const width = tree.h * bucket.ratio * (.84 + tree.tint * .3);
            const ang = (tree.tint - .5) * .35;
            for (let card = 0; card < 2; card++) {
                pos.set(tree.x, -.1, tree.z);
                e.set(0, ang + card * Math.PI / 2, 0);
                q.setFromEuler(e);
                sc.set(width, tree.h, 1);
                m.compose(pos, q, sc);
                mesh.setMatrixAt(k, m);
                const depthMix = THREE.MathUtils.clamp((-tree.z - 9) / 58, 0, 1);
                const light = .17 + depthMix * .12 + tree.tint * .045;
                c.setHSL(.5 + tree.tint * .035, .12 + tree.tint * .03, light);
                mesh.setColorAt(k, c);
                k++;
            }
        }
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.frustumCulled = false;
        forestGroup.add(mesh);
    }
})();

const canopyForest = new THREE.Group;

scene.add(canopyForest);

(function buildCanopyForest() {
    const r = mulberry32(1517);
    const clusters = [];
    const trunks = [];
    const moonNdc = new THREE.Vector2(-.507, .806);
    const temp = new THREE.Vector3;
    const addTree = (x, z, h, spread, tintSeed, near = false) => {
        const crownY = h * (.63 + r() * .08);
        const n = 6 + Math.floor(r() * 4);
        for (let k = 0; k < n; k++) {
            const a = r() * Math.PI * 2;
            const rad = Math.sqrt(r()) * spread;
            const cx = x + Math.cos(a) * rad;
            const cz = z + Math.sin(a) * rad * .8;
            const cy = crownY + (r() - .45) * h * .22;
            temp.set(cx, cy, cz).project(camera);
            if (Math.abs(temp.x - moonNdc.x) < .12 && Math.abs(temp.y - moonNdc.y) < .1) continue;
            const size = h * (.17 + r() * .13);
            clusters.push({
                x: cx,
                y: cy,
                z: cz,
                sx: size * (.9 + r() * .3),
                sy: size * (.68 + r() * .28),
                rotY: (r() - .5) * .9,
                rotZ: (r() - .5) * .55,
                depth: THREE.MathUtils.clamp((-z - 8) / 48, 0, 1),
                seed: tintSeed + r(),
                near: near
            });
        }
        if (h > 11 && r() > .28) {
            trunks.push({
                x: x,
                z: z,
                h: h * .72,
                r: .13 + h * .008
            });
        }
        if (r() > .3) {
            const nBush = 2 + Math.floor(r() * 3);
            for (let k = 0; k < nBush; k++) {
                const bx = x + (r() - .5) * spread * 2.5;
                const bz = z + (r() - .5) * spread * 2 + 1;
                const bs = 1.1 + r() * 2.2;
                temp.set(bx, bs * .7, bz).project(camera);
                if (Math.abs(temp.x - moonNdc.x) < .1 && Math.abs(temp.y - moonNdc.y) < .1) continue;
                clusters.push({
                    x: bx,
                    y: bs * .62,
                    z: bz,
                    sx: bs * 1.65,
                    sy: bs * 1.1,
                    rotY: (r() - .5) * 1.2,
                    rotZ: (r() - .5) * .35,
                    depth: THREE.MathUtils.clamp((-z - 8) / 48, 0, 1) + .1,
                    seed: tintSeed + r() + 3,
                    near: true
                });
            }
        }
    };
    for (let i = 0; i < 30; i++) {
        addTree(-50 + r() * 42, -10 - r() * 22, 9 + r() * 13, 2.5 + r() * 3.2, r(), true);
    }
    for (let i = 0; i < 32; i++) {
        addTree(10 + r() * 44, -11 - r() * 24, 9 + r() * 14, 2.5 + r() * 3.4, r(), true);
    }
    for (let i = 0; i < 50; i++) {
        addTree(-65 + r() * 130, -28 - r() * 29, 8 + r() * 15, 2.2 + r() * 3.5, r(), false);
    }
    for (let i = 0; i < 9; i++) {
        addTree(-24 + r() * 53, -18 - r() * 12, 19 + r() * 8, 3.2 + r() * 2.6, r(), false);
    }
    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({
        map: distantFoliageTex,
        color: 16777215,
        transparent: false,
        alphaTest: .3,
        depthWrite: true,
        side: THREE.DoubleSide,
        fog: true
    });
    const mesh = new THREE.InstancedMesh(geo, mat, clusters.length);
    const m = new THREE.Matrix4;
    const q = new THREE.Quaternion;
    const e = new THREE.Euler;
    const p = new THREE.Vector3;
    const sc = new THREE.Vector3;
    const c = new THREE.Color;
    for (let i = 0; i < clusters.length; i++) {
        const it = clusters[i];
        p.set(it.x, it.y, it.z);
        e.set(it.rotZ * .35, it.rotY, it.rotZ);
        q.setFromEuler(e);
        sc.set(it.sx, it.sy, 1);
        m.compose(p, q, sc);
        mesh.setMatrixAt(i, m);
        const light = .055 + it.depth * .115 + (it.near ? -.012 : .018) + it.seed % 1 * .022;
        c.setHSL(.365 + it.seed % .055, .17 + it.seed % .07, light);
        mesh.setColorAt(i, c);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.frustumCulled = false;
    mesh.renderOrder = 0;
    canopyForest.add(mesh);
})();

(function addDistantMist() {
    const r = mulberry32(613);
    for (let i = 0; i < 11; i++) {
        const mat = new THREE.SpriteMaterial({
            map: i % 2 ? mistTexA : mistTexB,
            color: 9282742,
            transparent: true,
            opacity: .09 + r() * .08,
            depthWrite: false,
            blending: THREE.NormalBlending,
            fog: true
        });
        const sp = new THREE.Sprite(mat);
        sp.position.set(-33 + r() * 66, 3 + r() * 5, -24 - r() * 20);
        const s = 22 + r() * 34;
        sp.scale.set(s, s * .3, 1);
        sp.renderOrder = 1;
        sp.userData.baseOpacity = mat.opacity;
        sp.userData.isStaticMist = true;
        mistSprites.push(sp);
        scene.add(sp);
    }
})();

const tileEndMat = new THREE.MeshStandardMaterial({
    color: 5134942,
    roughness: .62,
    metalness: .18,
    envMapIntensity: .45
});

const roofRidgeMat = new THREE.MeshStandardMaterial({
    color: 3753291,
    roughness: .48,
    metalness: .22,
    envMapIntensity: .65
});

const fasciaMat = new THREE.MeshStandardMaterial({
    color: 5982008,
    roughness: .8,
    metalness: .025,
    envMapIntensity: .14
});

function roofFacePoint(face, u, t, W, D, IW, ID, rise, lift, sag) {
    const absU = Math.abs(u);
    const easeT = Math.pow(t, 1.22);
    const y = rise * easeT + lift * Math.pow(absU, 5.3) * Math.pow(1 - t, 1.6) - sag * Math.pow(Math.max(0, 1 - absU * 1.36), 2) * Math.pow(1 - t, 2.1);
    let x, z;
    const lerp = (a, b, f) => a + (b - a) * f;
    if (face === 0) {
        x = u * lerp(W, IW, t);
        z = lerp(D, ID, t);
    } else if (face === 1) {
        x = -u * lerp(W, IW, t);
        z = -lerp(D, ID, t);
    } else if (face === 2) {
        x = lerp(W, IW, t);
        z = -u * lerp(D, ID, t);
    } else {
        x = -lerp(W, IW, t);
        z = u * lerp(D, ID, t);
    }
    return {
        x: x,
        y: y,
        z: z,
        u: u,
        t: t
    };
}

function createHipRoof(options) {
    const {width: width, depth: depth, eaveY: eaveY = 0, rise: rise = 1.2, lift: lift = .46, innerScale: innerScale = .31, sag: sag = .045, cols: cols = 22, rows: rows = 7, cap: cap = false} = options;
    const group = new THREE.Group;
    group.position.y = eaveY;
    const W = width / 2, D = depth / 2;
    const IW = W * innerScale, ID = D * innerScale;
    const topPositions = [], uvs = [], topIndices = [];
    const fasciaPositions = [], fasciaIndices = [];
    const edgeCurves = [];
    const addFace = face => {
        const base = topPositions.length / 3;
        for (let iv = 0; iv <= rows; iv++) {
            const t = iv / rows;
            for (let iu = 0; iu <= cols; iu++) {
                const u = iu / cols * 2 - 1;
                const p = roofFacePoint(face, u, t, W, D, IW, ID, rise, lift, sag);
                topPositions.push(p.x, p.y, p.z);
                uvs.push(iu / cols * (face < 2 ? 1.4 : 1.2), iv / rows * 1);
            }
        }
        for (let iv = 0; iv < rows; iv++) {
            for (let iu = 0; iu < cols; iu++) {
                const a = base + iv * (cols + 1) + iu;
                const b = a + 1;
                const c = a + cols + 1;
                const d = c + 1;
                topIndices.push(a, b, c, b, d, c);
            }
        }
        const fBase = fasciaPositions.length / 3;
        const N = 18;
        for (let side = 0; side < 2; side++) {
            for (let i = 0; i <= N; i++) {
                const u = i / N * 2 - 1;
                const p = roofFacePoint(face, u, 0, W, D, IW, ID, rise, lift, sag);
                const yy = side === 0 ? p.y : p.y - .28;
                fasciaPositions.push(p.x, yy, p.z);
            }
        }
        for (let i = 0; i < N; i++) {
            const a = fBase + i;
            const b = a + 1;
            const c = fBase + N + 1 + i;
            const d = c + 1;
            fasciaIndices.push(a, c, b, b, c, d);
        }
        const pts = [];
        for (let i = 0; i <= 20; i++) {
            const u = i / 20 * 2 - 1;
            const p = roofFacePoint(face, u, 0, W, D, IW, ID, rise, lift, sag);
            pts.push(new THREE.Vector3(p.x, p.y, p.z));
        }
        edgeCurves.push(pts);
    };
    for (let f = 0; f < 4; f++) addFace(f);
    const geo = new THREE.BufferGeometry;
    geo.setAttribute("position", new THREE.Float32BufferAttribute(topPositions, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(topIndices);
    geo.computeVertexNormals();
    const roof = new THREE.Mesh(geo, roofMat);
    roof.castShadow = true;
    roof.receiveShadow = true;
    group.add(roof);
    const underPositions = [];
    const underUvs = [];
    const underIndices = [];
    {
        const base = 0;
        for (let f = 0; f < 4; f++) {
            for (let iv = 0; iv <= 2; iv++) {
                const t = iv / 2;
                for (let iu = 0; iu <= cols; iu++) {
                    const u = iu / cols * 2 - 1;
                    const p = roofFacePoint(f, u, t, W, D, IW, ID, rise, lift, sag);
                    underPositions.push(p.x, p.y - .2, p.z);
                    underUvs.push(iu / cols, t);
                }
            }
        }
        for (let f = 0; f < 4; f++) {
            const fBase = f * 3 * (cols + 1);
            for (let iv = 0; iv < 2; iv++) {
                for (let iu = 0; iu < cols; iu++) {
                    const a = fBase + iv * (cols + 1) + iu;
                    const b = a + 1;
                    const c = a + cols + 1;
                    const d = c + 1;
                    underIndices.push(a, c, b, b, c, d);
                }
            }
        }
        const underGeo = new THREE.BufferGeometry;
        underGeo.setAttribute("position", new THREE.Float32BufferAttribute(underPositions, 3));
        underGeo.setAttribute("uv", new THREE.Float32BufferAttribute(underUvs, 2));
        underGeo.setIndex(underIndices);
        underGeo.computeVertexNormals();
        const under = new THREE.Mesh(underGeo, roofUnderMat);
        under.receiveShadow = true;
        group.add(under);
    }
    const fasciaGeo = new THREE.BufferGeometry;
    fasciaGeo.setAttribute("position", new THREE.Float32BufferAttribute(fasciaPositions, 3));
    fasciaGeo.setIndex(fasciaIndices);
    fasciaGeo.computeVertexNormals();
    const fascia = new THREE.Mesh(fasciaGeo, fasciaMat);
    fascia.castShadow = true;
    group.add(fascia);
    const eaveBeamPts = edgeCurves.map(pts => new THREE.CatmullRomCurve3(pts));
    for (const curve of eaveBeamPts) {
        const tube = new THREE.TubeGeometry(curve, 30, .052, 5, false);
        const m = new THREE.Mesh(tube, fasciaMat);
        m.castShadow = true;
        group.add(m);
    }
    const ends = [];
    for (let f = 0; f < 4; f++) {
        const n = 25;
        for (let i = 0; i < n; i++) {
            const u = i / (n - 1) * 1.78 - .89;
            const p = roofFacePoint(f, u, 0, W, D, IW, ID, rise, lift, sag);
            let normal;
            if (f === 0) normal = new THREE.Vector3(0, 0, 1); else if (f === 1) normal = new THREE.Vector3(0, 0, -1); else if (f === 2) normal = new THREE.Vector3(1, 0, 0); else normal = new THREE.Vector3(-1, 0, 0);
            const q = (new THREE.Quaternion).setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
            ends.push({
                x: p.x + normal.x * .025,
                y: p.y - .105,
                z: p.z + normal.z * .025,
                q: q
            });
        }
    }
    const endGeo = new THREE.CylinderGeometry(.073, .073, .065, 8);
    const endMesh = new THREE.InstancedMesh(endGeo, tileEndMat, ends.length);
    const mat4 = new THREE.Matrix4;
    const one = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < ends.length; i++) {
        mat4.compose(new THREE.Vector3(ends[i].x, ends[i].y, ends[i].z), ends[i].q, one);
        endMesh.setMatrixAt(i, mat4);
    }
    endMesh.instanceMatrix.needsUpdate = true;
    endMesh.castShadow = false;
    group.add(endMesh);
    {
        const ridgeU = [];
        for (let i = -4; i <= 4; i++) if (i !== 0) ridgeU.push(i / 5.2);
        const ringSegs = 9;
        const total = 4 * ridgeU.length * ringSegs;
        const ridgeGeom = new THREE.CylinderGeometry(.033, .033, 1, 4, 1, true);
        const ridgeMesh = new THREE.InstancedMesh(ridgeGeom, new THREE.MeshStandardMaterial({
            color: 4806493,
            roughness: .58,
            metalness: .08,
            envMapIntensity: .25
        }), total);
        const rm = new THREE.Matrix4;
        const rp = new THREE.Vector3;
        const rq = new THREE.Quaternion;
        const rs = new THREE.Vector3;
        const up = new THREE.Vector3(0, 1, 0);
        const pa = new THREE.Vector3;
        const pb = new THREE.Vector3;
        const dir = new THREE.Vector3;
        let ri = 0;
        for (let f = 0; f < 4; f++) {
            for (const u of ridgeU) {
                for (let k = 0; k < ringSegs; k++) {
                    const ta = .04 + k / ringSegs * .9;
                    const tb = .04 + (k + 1) / ringSegs * .9;
                    const A = roofFacePoint(f, u, ta, W, D, IW, ID, rise, lift, sag);
                    const B = roofFacePoint(f, u, tb, W, D, IW, ID, rise, lift, sag);
                    pa.set(A.x, A.y + .012, A.z);
                    pb.set(B.x, B.y + .012, B.z);
                    rp.addVectors(pa, pb).multiplyScalar(.5);
                    dir.subVectors(pb, pa);
                    const len = dir.length();
                    dir.normalize();
                    rq.setFromUnitVectors(up, dir);
                    rs.set(1, len, 1);
                    rm.compose(rp, rq, rs);
                    ridgeMesh.setMatrixAt(ri++, rm);
                }
            }
        }
        ridgeMesh.instanceMatrix.needsUpdate = true;
        ridgeMesh.castShadow = false;
        ridgeMesh.receiveShadow = true;
        group.add(ridgeMesh);
    }
    const rafterBatch = new BoxBatch(woodMat, {
        castShadow: false
    });
    const rafterY = -.34;
    const rafterDepth = (D - ID) * .93;
    const rafterInnerZ = (D + ID) * .5;
    for (let side = 0; side < 4; side++) {
        const n = 18;
        for (let i = 0; i < n; i++) {
            const u = (i / (n - 1) - .5) * 1.4;
            if (side === 0) {
                rafterBatch.add(new THREE.Vector3(u * IW * 1.28, rafterY, rafterInnerZ), new THREE.Vector3(.085, .14, rafterDepth));
            } else if (side === 1) {
                rafterBatch.add(new THREE.Vector3(u * IW * 1.28, rafterY, -rafterInnerZ), new THREE.Vector3(.085, .14, rafterDepth));
            } else if (side === 2) {
                rafterBatch.add(new THREE.Vector3(rafterInnerZ, rafterY, u * IW * 1.28), new THREE.Vector3(rafterDepth, .14, .085));
            } else {
                rafterBatch.add(new THREE.Vector3(-rafterInnerZ, rafterY, u * IW * 1.28), new THREE.Vector3(rafterDepth, .14, .085));
            }
        }
    }
    rafterBatch.build(group);
    const corners = [ [ W, -1, D, -1, 1, 1 ], [ -W, 1, D, 1, 1, -1 ], [ W, -1, -D, -1, -1, 1 ], [ -W, 1, -D, 1, -1, -1 ] ];
    for (const c of corners) {
        const [ox, sx, oz, sz] = c;
        const outer = new THREE.Vector3(ox, lift + .035, oz);
        const mid = new THREE.Vector3(ox * .64, rise * .58 + lift * .34, oz * .64);
        const inner = new THREE.Vector3(IW * (ox > 0 ? 1 : -1), rise + .02, ID * (oz > 0 ? 1 : -1));
        const ridgeCurve = new THREE.CatmullRomCurve3([ outer, mid, inner ]);
        const ridge = new THREE.Mesh(new THREE.TubeGeometry(ridgeCurve, 16, .066, 5, false), roofRidgeMat);
        ridge.castShadow = false;
        group.add(ridge);
        const dirX = Math.sign(ox) * .7;
        const dirZ = Math.sign(oz) * .7;
        const horn = new THREE.CatmullRomCurve3([ new THREE.Vector3(ox - Math.sign(ox) * .05, lift - .02, oz - Math.sign(oz) * .05), new THREE.Vector3(ox + dirX * .16, lift + .09, oz + dirZ * .16), new THREE.Vector3(ox + dirX * .34, lift + .31, oz + dirZ * .34), new THREE.Vector3(ox + dirX * .47, lift + .67, oz + dirZ * .47) ]);
        const hornMesh = new THREE.Mesh(new THREE.TubeGeometry(horn, 12, .058, 5, false), fasciaMat);
        hornMesh.castShadow = false;
        group.add(hornMesh);
        const jewel = new THREE.Mesh(new THREE.SphereGeometry(.065, 8, 6), bronzeMat);
        jewel.position.copy(horn.getPoint(1));
        jewel.castShadow = false;
        group.add(jewel);
    }
    if (cap) {
        const capGeo = new THREE.ConeGeometry(IW * 1.5, .34, 8, 1, false);
        const capMesh = new THREE.Mesh(capGeo, roofRidgeMat);
        capMesh.position.y = rise + .12;
        capMesh.rotation.y = Math.PI / 8;
        capMesh.castShadow = false;
        group.add(capMesh);
        addCylinder(group, bronzeMat, .07, .13, .55, [ 0, rise + .5, 0 ], 8);
        const orb = new THREE.Mesh(new THREE.SphereGeometry(.14, 12, 9), bronzeMat);
        orb.position.y = rise + .82;
        group.add(orb);
    }
    return group;
}

const pagoda = new THREE.Group;

pagoda.position.set(5.2, 0, -4.5);

pagoda.scale.set(1.22, 1, 1.1);

pagoda.rotation.y = .055;

pagoda.name = "pagoda";

scene.add(pagoda);

const PAGODA = {
    platformW: 9.3,
    platformD: 7.9,
    platformH: 1.5
};

const stoneBatch = new BoxBatch(stoneMat, {
    castShadow: true
});

const stoneTrimBatch = new BoxBatch(stoneCarveMat, {
    castShadow: true
});

const darkStoneBatch = new BoxBatch(darkStoneMat, {
    castShadow: true
});

const woodBatch = new BoxBatch(woodMat, {
    castShadow: true
});

const woodTrimBatch = new BoxBatch(woodMat, {
    castShadow: true
});

const columnBatch = new BoxBatch(woodMat, {
    geometry: unitCylinder,
    castShadow: true
});

const upperWindowItems = [];

const groundWindowItems = [];

const doorGlowItems = [];

{
    const pw = PAGODA.platformW, pd = PAGODA.platformD, ph = PAGODA.platformH;
    const platform = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, pd), stoneMat);
    platform.position.set(0, ph / 2, 0);
    platform.castShadow = true;
    platform.receiveShadow = true;
    pagoda.add(platform);
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(pw + .8, .22, pd + .8), darkStoneMat);
    plinth.position.set(0, .11, 0);
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    pagoda.add(plinth);
    const topCourse = new THREE.Mesh(new THREE.BoxGeometry(pw + .38, .17, pd + .38), stoneCarveMat);
    topCourse.position.set(0, ph + .03, 0);
    topCourse.castShadow = true;
    topCourse.receiveShadow = true;
    pagoda.add(topCourse);
    const stepCount = 11;
    const stepH = ph / stepCount;
    const stepD = .43;
    const stairW = 4.15;
    const stairFront = pd / 2 + .34;
    for (let i = 0; i < stepCount; i++) {
        const h = ph - i * stepH;
        const z = stairFront + i * stepD;
        const step = new THREE.Mesh(new THREE.BoxGeometry(stairW, h, stepD + .02), stoneMat);
        step.position.set(0, h / 2, z);
        step.castShadow = true;
        step.receiveShadow = true;
        pagoda.add(step);
        const lip = new THREE.Mesh(new THREE.BoxGeometry(stairW + .02, .035, .08), stoneCarveMat);
        lip.position.set(0, h + .005, z + stepD * .5);
        lip.receiveShadow = true;
        pagoda.add(lip);
    }
    for (let side = -1; side <= 1; side += 2) {
        for (let i = 0; i < stepCount; i++) {
            const h = ph - i * stepH;
            const z = stairFront + i * stepD;
            stoneBatch.add(new THREE.Vector3(side * (stairW / 2 + .2), h * .5 + .16, z), new THREE.Vector3(.4, h + .32, stepD + .03));
            stoneTrimBatch.add(new THREE.Vector3(side * (stairW / 2 + .2), h + .35, z), new THREE.Vector3(.52, .12, stepD + .08));
        }
        stoneBatch.add(new THREE.Vector3(side * (stairW / 2 + .38), .62, stairFront + stepCount * stepD + .18), new THREE.Vector3(.54, 1.24, .54));
        stoneTrimBatch.add(new THREE.Vector3(side * (stairW / 2 + .38), 1.3, stairFront + stepCount * stepD + .18), new THREE.Vector3(.7, .14, .7));
        const orb = new THREE.Mesh(new THREE.SphereGeometry(.23, 12, 9), stoneCarveMat);
        orb.position.set(side * (stairW / 2 + .38), 1.48, stairFront + stepCount * stepD + .18);
        orb.castShadow = true;
        pagoda.add(orb);
    }
    const railY = ph + .08;
    const railH = .82;
    const edgeX = pw / 2 - .08;
    const edgeZ = pd / 2 - .08;
    const makePost = (x, z, tall = false) => {
        const h = railH + (tall ? .2 : 0);
        stoneBatch.add(new THREE.Vector3(x, railY + h / 2, z), new THREE.Vector3(.18, h, .18));
        stoneTrimBatch.add(new THREE.Vector3(x, railY + h + .04, z), new THREE.Vector3(.28, .08, .28));
        if (tall) {
            const cap = new THREE.Mesh(new THREE.SphereGeometry(.13, 8, 6), stoneCarveMat);
            cap.position.set(x, railY + h + .14, z);
            cap.castShadow = true;
            pagoda.add(cap);
        }
    };
    const railSegments = [ {
        axis: "x",
        fixed: edgeZ,
        from: -edgeX,
        to: -2.25,
        y: railY
    }, {
        axis: "x",
        fixed: edgeZ,
        from: 2.25,
        to: edgeX,
        y: railY
    }, {
        axis: "z",
        fixed: edgeX,
        from: -edgeZ,
        to: edgeZ,
        y: railY
    }, {
        axis: "z",
        fixed: -edgeX,
        from: -edgeZ,
        to: edgeZ,
        y: railY
    }, {
        axis: "x",
        fixed: -edgeZ,
        from: -edgeX,
        to: edgeX,
        y: railY
    } ];
    for (const seg of railSegments) {
        const len = Math.abs(seg.to - seg.from);
        const n = Math.max(2, Math.ceil(len / .58));
        for (let i = 0; i <= n; i++) {
            const t = i / n;
            const p = seg.from + (seg.to - seg.from) * t;
            const tall = i === 0 || i === n;
            if (seg.axis === "x") makePost(p, seg.fixed, tall); else makePost(seg.fixed, p, tall);
        }
        if (seg.axis === "x") {
            woodTrimBatch.add(new THREE.Vector3((seg.from + seg.to) / 2, railY + railH - .04, seg.fixed), new THREE.Vector3(len, .12, .18));
            stoneBatch.add(new THREE.Vector3((seg.from + seg.to) / 2, railY + .17, seg.fixed), new THREE.Vector3(len, .14, .17));
        } else {
            woodTrimBatch.add(new THREE.Vector3(seg.fixed, railY + railH - .04, (seg.from + seg.to) / 2), new THREE.Vector3(.18, .12, len));
            stoneBatch.add(new THREE.Vector3(seg.fixed, railY + .17, (seg.from + seg.to) / 2), new THREE.Vector3(.17, .14, len));
        }
    }
    for (let i = 0; i < 24; i++) {
        const t = i / 23;
        const x = -pw / 2 - .7 + t * (pw + 1.4);
        darkStoneBatch.add(new THREE.Vector3(x, .035, pd / 2 + .62), new THREE.Vector3(.6, .18, .54));
    }
}

const tiers = [ {
    w: 5.7,
    d: 5,
    base: 1.5,
    h: 3.32,
    eaveW: 8.65,
    eaveD: 7.65,
    rise: 1.38,
    lift: .55
}, {
    w: 5.15,
    d: 4.52,
    base: 6.2,
    h: 2.05,
    eaveW: 7.95,
    eaveD: 7.02,
    rise: 1.28,
    lift: .5
}, {
    w: 4.6,
    d: 4.04,
    base: 9.53,
    h: 2,
    eaveW: 7.2,
    eaveD: 6.38,
    rise: 1.18,
    lift: .45
}, {
    w: 4.05,
    d: 3.56,
    base: 12.71,
    h: 1.93,
    eaveW: 6.46,
    eaveD: 5.72,
    rise: 1.08,
    lift: .4
}, {
    w: 3.5,
    d: 3.08,
    base: 15.72,
    h: 1.85,
    eaveW: 5.7,
    eaveD: 5.04,
    rise: .98,
    lift: .35
} ];

for (let i = 1; i < tiers.length; i++) {
    tiers[i].base = tiers[i - 1].base + tiers[i - 1].h + tiers[i - 1].rise;
}

function faceTransform(face, x, y, z) {
    if (face === 0) return {
        pos: new THREE.Vector3(x, y, z),
        rot: 0
    };
    if (face === 1) return {
        pos: new THREE.Vector3(-x, y, -z),
        rot: Math.PI
    };
    if (face === 2) return {
        pos: new THREE.Vector3(z, y, -x),
        rot: Math.PI / 2
    };
    return {
        pos: new THREE.Vector3(-z, y, x),
        rot: -Math.PI / 2
    };
}

function queueWindow(face, w, d, x, y, width, height, list) {
    const t = faceTransform(face, x, y, d / 2 + .025);
    list.push({
        pos: t.pos,
        rot: t.rot,
        width: width,
        height: height
    });
}

const latticeMat = new THREE.MeshLambertMaterial({
    map: woodTex.map,
    color: 8152914,
    emissive: new THREE.Color(854278),
    emissiveIntensity: 1
});

const windowFrameBatch = new BoxBatch(latticeMat, {
    castShadow: false
});

function addLatticeWindow(face, w, d, x, y, width, height, opts = {}) {
    const t = faceTransform(face, x, y, d / 2 + .045);
    const q = (new THREE.Quaternion).setFromEuler(new THREE.Euler(0, t.rot, 0));
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
    const frameMatBatch = opts.frameBatch || windowFrameBatch;
    const frameDepth = .07;
    const verticals = 5;
    const horizontals = opts.horizontal ?? 4;
    const fw = .055;
    for (let i = 0; i <= verticals; i++) {
        const u = i / verticals - .5;
        const p = t.pos.clone().add(new THREE.Vector3(u * width, 0, 0).applyQuaternion(q)).addScaledVector(forward, frameDepth * .5);
        frameMatBatch.add(p, new THREE.Vector3(fw, height, frameDepth), q);
    }
    for (let i = 0; i <= horizontals; i++) {
        const v = i / horizontals - .5;
        const p = t.pos.clone().add(new THREE.Vector3(0, v * height, 0)).addScaledVector(forward, frameDepth * .5);
        frameMatBatch.add(p, new THREE.Vector3(width, fw, frameDepth), q);
    }
    const thick = .11;
    for (let s = -1; s <= 1; s += 2) {
        const p = t.pos.clone().add(new THREE.Vector3(s * (width / 2 + thick / 2), 0, 0).applyQuaternion(q)).addScaledVector(forward, .01);
        frameMatBatch.add(p, new THREE.Vector3(thick, height + thick * 2, .1), q);
    }
    for (let s = -1; s <= 1; s += 2) {
        const p = t.pos.clone().add(new THREE.Vector3(0, s * (height / 2 + thick / 2), 0)).addScaledVector(forward, .01);
        frameMatBatch.add(p, new THREE.Vector3(width + thick * 2, thick, .1), q);
    }
    if (opts.light !== false) queueWindow(face, w, d, x, y, width, height, opts.door ? doorGlowItems : y < 5 ? groundWindowItems : upperWindowItems);
}

{
    const t = tiers[0];
    const body = new THREE.Mesh(new THREE.BoxGeometry(t.w, t.h, t.d), darkWoodMat);
    body.position.set(0, t.base + t.h / 2, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    pagoda.add(body);
    const dado = new THREE.Mesh(new THREE.BoxGeometry(t.w + .16, .52, t.d + .16), darkStoneMat);
    dado.position.set(0, t.base + .26, 0);
    dado.castShadow = true;
    dado.receiveShadow = true;
    pagoda.add(dado);
    const doorW = 2.15, doorH = 2.62;
    addLatticeWindow(0, t.w, t.d, 0, t.base + doorH / 2 + .1, doorW, doorH, {
        door: true,
        frameBatch: windowFrameBatch,
        horizontal: 5
    });
    woodTrimBatch.add(new THREE.Vector3(0, t.base + .08, t.d / 2 + .13), new THREE.Vector3(doorW + .42, .16, .28));
    woodTrimBatch.add(new THREE.Vector3(-doorW / 2 - .2, t.base + doorH / 2 + .1, t.d / 2 + .1), new THREE.Vector3(.2, doorH + .3, .22));
    woodTrimBatch.add(new THREE.Vector3(doorW / 2 + .2, t.base + doorH / 2 + .1, t.d / 2 + .1), new THREE.Vector3(.2, doorH + .3, .22));
    addLatticeWindow(0, t.w, t.d, -t.w * .34, t.base + 2, 1.18, 1.78);
    addLatticeWindow(0, t.w, t.d, t.w * .34, t.base + 2, 1.18, 1.78);
    addLatticeWindow(2, t.w, t.d, .8, t.base + 2, 1.25, 1.7);
    addLatticeWindow(2, t.w, t.d, -1.1, t.base + 2, 1.25, 1.7);
    addLatticeWindow(3, t.w, t.d, .8, t.base + 2, 1.25, 1.7);
    addLatticeWindow(3, t.w, t.d, -1.1, t.base + 2, 1.25, 1.7);
    const plaqueFrame = new THREE.Group;
    const pm = new THREE.Mesh(new THREE.PlaneGeometry(1.78, .61), plaqueMat);
    plaqueFrame.add(pm);
    const border = new THREE.Mesh(new THREE.BoxGeometry(1.94, .77, .08), darkWoodMat);
    border.position.z = -.045;
    border.castShadow = true;
    plaqueFrame.add(border);
    plaqueFrame.position.set(0, t.base + t.h - .62, t.d / 2 + .11);
    pagoda.add(plaqueFrame);
    for (let sx = -1; sx <= 1; sx += 2) {
        columnBatch.add(new THREE.Vector3(sx * 1.62, t.base + 1.95, t.d / 2 + .24), new THREE.Vector3(.28, 3.7, .28));
        stoneTrimBatch.add(new THREE.Vector3(sx * 1.62, t.base + .14, t.d / 2 + .24), new THREE.Vector3(.48, .28, .48));
    }
    woodTrimBatch.add(new THREE.Vector3(0, t.base + 3.78, t.d / 2 + .24), new THREE.Vector3(3.7, .2, .27));
    woodTrimBatch.add(new THREE.Vector3(0, t.base + 3.55, t.d / 2 + .23), new THREE.Vector3(3.35, .12, .2));
}

for (let ti = 0; ti < tiers.length; ti++) {
    const t = tiers[ti];
    if (ti > 0) {
        const body = new THREE.Mesh(new THREE.BoxGeometry(t.w, t.h, t.d), darkWoodMat);
        body.position.set(0, t.base + t.h / 2, 0);
        body.castShadow = true;
        body.receiveShadow = true;
        pagoda.add(body);
        const bw = t.w + 1.22;
        const bd = t.d + 1.22;
        const deckY = t.base - .09;
        const deckT = .16;
        woodBatch.add(new THREE.Vector3(0, deckY, bd / 2 - .12), new THREE.Vector3(bw, deckT, .26));
        woodBatch.add(new THREE.Vector3(0, deckY, -bd / 2 + .12), new THREE.Vector3(bw, deckT, .26));
        woodBatch.add(new THREE.Vector3(bw / 2 - .12, deckY, 0), new THREE.Vector3(.26, deckT, bd - .3));
        woodBatch.add(new THREE.Vector3(-bw / 2 + .12, deckY, 0), new THREE.Vector3(.26, deckT, bd - .3));
        const railH = .7;
        const postY = deckY + deckT / 2 + railH / 2;
        const makeRailSide = side => {
            const horizontal = side < 2 ? bw : bd;
            const lengthN = Math.round(horizontal / .38);
            for (let i = 0; i <= lengthN; i++) {
                const p = -horizontal / 2 + i * (horizontal / lengthN);
                const px = side < 2 ? p : side === 2 ? bw / 2 - .08 : -bw / 2 + .08;
                const pz = side < 2 ? side === 0 ? bd / 2 - .08 : -bd / 2 + .08 : p;
                woodBatch.add(new THREE.Vector3(px, postY, pz), new THREE.Vector3(.055, railH, .055));
            }
            const railPos = side < 2 ? new THREE.Vector3(0, deckY + railH + .06, side === 0 ? bd / 2 - .08 : -bd / 2 + .08) : new THREE.Vector3(side === 2 ? bw / 2 - .08 : -bw / 2 + .08, deckY + railH + .06, 0);
            const railScale = side < 2 ? new THREE.Vector3(horizontal, .09, .1) : new THREE.Vector3(.1, .09, horizontal);
            woodTrimBatch.add(railPos, railScale);
            const midPos = railPos.clone();
            midPos.y -= railH * .54;
            woodBatch.add(midPos, railScale.clone().multiplyScalar(.7));
        };
        for (let s = 0; s < 4; s++) makeRailSide(s);
        const colPositions = [];
        for (let s = 0; s < 4; s++) {
            for (let j = 0; j < 3; j++) {
                const o = (j / 2 - .5) * (s < 2 ? t.w : t.d) * .9;
                let x, z;
                if (s === 0) {
                    x = o;
                    z = t.d / 2 + .025;
                } else if (s === 1) {
                    x = -o;
                    z = -t.d / 2 - .025;
                } else if (s === 2) {
                    x = t.w / 2 + .025;
                    z = -o;
                } else {
                    x = -t.w / 2 - .025;
                    z = o;
                }
                colPositions.push({
                    x: x,
                    z: z
                });
            }
        }
        for (const c of colPositions) {
            columnBatch.add(new THREE.Vector3(c.x, t.base + t.h / 2, c.z), new THREE.Vector3(.17, t.h, .17));
        }
        for (let sx = -1; sx <= 1; sx += 2) {
            for (let sz = -1; sz <= 1; sz += 2) {
                columnBatch.add(new THREE.Vector3(sx * t.w / 2, t.base + t.h / 2, sz * t.d / 2), new THREE.Vector3(.23, t.h + .08, .23));
            }
        }
        woodTrimBatch.add(new THREE.Vector3(0, t.base + t.h - .16, t.d / 2 + .04), new THREE.Vector3(t.w + .22, .2, .18));
        woodTrimBatch.add(new THREE.Vector3(0, t.base + t.h - .16, -t.d / 2 - .04), new THREE.Vector3(t.w + .22, .2, .18));
        woodTrimBatch.add(new THREE.Vector3(t.w / 2 + .04, t.base + t.h - .16, 0), new THREE.Vector3(.18, .2, t.d + .22));
        woodTrimBatch.add(new THREE.Vector3(-t.w / 2 - .04, t.base + t.h - .16, 0), new THREE.Vector3(.18, .2, t.d + .22));
        addLatticeWindow(0, t.w, t.d, -t.w * .21, t.base + t.h * .56, .82, 1.25);
        addLatticeWindow(0, t.w, t.d, t.w * .21, t.base + t.h * .56, .82, 1.25);
        addLatticeWindow(2, t.w, t.d, 0, t.base + t.h * .56, .76, 1.18);
        addLatticeWindow(3, t.w, t.d, 0, t.base + t.h * .56, .76, 1.18);
    }
    const eaveY = t.base + t.h;
    const by = eaveY - .47;
    const armZ = t.d / 2 + .24;
    const armX = t.w / 2 + .24;
    for (let s = 0; s < 4; s++) {
        const n = 6;
        for (let i = 0; i < n; i++) {
            const o = (i / (n - 1) - .5) * (s < 2 ? t.w : t.d) * .8;
            let px, pz;
            if (s === 0) {
                px = o;
                pz = armZ;
            } else if (s === 1) {
                px = -o;
                pz = -armZ;
            } else if (s === 2) {
                px = armX;
                pz = -o;
            } else {
                px = -armX;
                pz = o;
            }
            const inward = s === 0 ? -1 : s === 1 ? 1 : s === 2 ? -1 : 1;
            const outward = -inward;
            woodBatch.add(new THREE.Vector3(px, by, pz), new THREE.Vector3(.15, .44, .15));
            if (s < 2) {
                woodBatch.add(new THREE.Vector3(px, by + .2, pz + outward * .18), new THREE.Vector3(.62, .13, .4));
                woodBatch.add(new THREE.Vector3(px, by - .02, pz + outward * .11), new THREE.Vector3(.34, .13, .46));
                woodBatch.add(new THREE.Vector3(px, by + .35, pz + outward * .11), new THREE.Vector3(.24, .14, .22));
            } else {
                woodBatch.add(new THREE.Vector3(px + outward * .18, by + .2, pz), new THREE.Vector3(.4, .13, .62));
                woodBatch.add(new THREE.Vector3(px + outward * .11, by - .02, pz), new THREE.Vector3(.46, .13, .34));
                woodBatch.add(new THREE.Vector3(px + outward * .11, by + .35, pz), new THREE.Vector3(.22, .14, .24));
            }
        }
        if (s < 2) {
            woodTrimBatch.add(new THREE.Vector3(0, eaveY - .2, s === 0 ? t.d / 2 + .09 : -t.d / 2 - .09), new THREE.Vector3(t.w + .3, .18, .15));
        } else {
            woodTrimBatch.add(new THREE.Vector3(s === 2 ? t.w / 2 + .09 : -t.w / 2 - .09, eaveY - .2, 0), new THREE.Vector3(.15, .18, t.d + .3));
        }
    }
    const roof = createHipRoof({
        width: t.eaveW,
        depth: t.eaveD,
        eaveY: eaveY,
        rise: t.rise,
        lift: t.lift,
        innerScale: ti === tiers.length - 1 ? .24 : .32,
        sag: .055 + ti * .002
    });
    pagoda.add(roof);
}

{
    const topBase = tiers[4].base + tiers[4].h + tiers[4].rise;
    const lotus = new THREE.Mesh(new THREE.CylinderGeometry(.92, 1.13, .26, 8), stoneCarveMat);
    lotus.position.y = topBase + .1;
    lotus.castShadow = true;
    pagoda.add(lotus);
    const saucer = new THREE.Mesh(new THREE.CylinderGeometry(.5, .78, .24, 12), bronzeMat);
    saucer.position.y = topBase + .34;
    saucer.castShadow = true;
    pagoda.add(saucer);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(.045, .085, 4.25, 8), bronzeMat);
    mast.position.y = topBase + 2.33;
    mast.castShadow = true;
    pagoda.add(mast);
    for (let i = 0; i < 9; i++) {
        const rr = .34 - i * .022;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, .026, 6, 22), bronzeMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = topBase + .58 + i * .34;
        ring.castShadow = true;
        pagoda.add(ring);
    }
    const flame = new THREE.Mesh(new THREE.SphereGeometry(.18, 12, 10), bronzeMat);
    flame.scale.set(.7, 1.3, .7);
    flame.position.y = topBase + 3.72;
    pagoda.add(flame);
    const flame2 = new THREE.Mesh(new THREE.ConeGeometry(.12, .48, 8), bronzeMat);
    flame2.position.y = topBase + 4.04;
    pagoda.add(flame2);
}

stoneBatch.build(pagoda);

stoneTrimBatch.build(pagoda);

darkStoneBatch.build(pagoda);

woodBatch.build(pagoda);

woodTrimBatch.build(pagoda);

columnBatch.build(pagoda);

windowFrameBatch.build(pagoda);

function buildGlowInstances(items, material, parent) {
    if (!items.length) return;
    const geo = new THREE.PlaneGeometry(1, 1);
    const mesh = new THREE.InstancedMesh(geo, material, items.length);
    const m = new THREE.Matrix4;
    const q = new THREE.Quaternion;
    const sc = new THREE.Vector3;
    const r = mulberry32(509);
    const c = new THREE.Color;
    for (let i = 0; i < items.length; i++) {
        const it = items[i];
        q.setFromEuler(new THREE.Euler(0, it.rot, 0));
        sc.set(it.width, it.height, 1);
        m.compose(it.pos, q, sc);
        mesh.setMatrixAt(i, m);
        const v = .64 + r() * .55;
        c.setRGB(v * (.95 + r() * .1), v * (.85 + r() * .12), v * (.7 + r() * .12));
        mesh.setColorAt(i, c);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.renderOrder = 2;
    parent.add(mesh);
    return mesh;
}

const upperGlowMat = new THREE.MeshBasicMaterial({
    map: shojiTex,
    color: new THREE.Color(16755046).multiplyScalar(.105),
    transparent: false,
    fog: true
});

const groundGlowMat = new THREE.MeshBasicMaterial({
    map: shojiTex,
    color: new THREE.Color(16756847).multiplyScalar(.4),
    transparent: false,
    fog: true
});

const doorPaperTex = (() => {
    const S = 512;
    const c = makeCanvas(S, S);
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(S * .5, S * .46, 12, S * .5, S * .5, S * .72);
    g.addColorStop(0, "#ffe9c2");
    g.addColorStop(.44, "#f7d49a");
    g.addColorStop(.78, "#c89258");
    g.addColorStop(1, "#7d4e2a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    const v = ctx.createLinearGradient(0, S * .55, 0, S);
    v.addColorStop(0, "rgba(53,26,8,0)");
    v.addColorStop(1, "rgba(35,16,4,0.46)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, S, S);
    const h = ctx.createLinearGradient(0, 0, S, 0);
    h.addColorStop(0, "rgba(35,16,4,0.28)");
    h.addColorStop(.16, "rgba(35,16,4,0)");
    h.addColorStop(.84, "rgba(35,16,4,0)");
    h.addColorStop(1, "rgba(35,16,4,0.28)");
    ctx.fillStyle = h;
    ctx.fillRect(0, 0, S, S);
    const r = mulberry32(906);
    for (let i = 0; i < 360; i++) {
        ctx.strokeStyle = r() > .5 ? "rgba(91,56,24,0.05)" : "rgba(255,246,218,0.05)";
        ctx.lineWidth = .5 + r() * 1.2;
        const x = r() * S, y = r() * S;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + (r() - .5) * 14, y + 18, x + (r() - .5) * 24, y + 44 + r() * 70);
        ctx.stroke();
    }
    grain(ctx, S, S, .055, "overlay");
    return canvasTexture(c, {
        clamp: true
    });
})();

const doorGlowMat = new THREE.MeshBasicMaterial({
    map: doorPaperTex,
    color: new THREE.Color(16758129).multiplyScalar(.34),
    transparent: false,
    fog: true
});

upperGlowMat.name = "upper-window-glow";

groundGlowMat.name = "ground-window-glow";

doorGlowMat.name = "door-glow";

const upperGlowMesh = buildGlowInstances(upperWindowItems, upperGlowMat, pagoda);

const groundGlowMesh = buildGlowInstances(groundWindowItems, groundGlowMat, pagoda);

const doorGlowMesh = buildGlowInstances(doorGlowItems, doorGlowMat, pagoda);

if (upperGlowMesh) upperGlowMesh.name = "upper-window-glow-mesh";

if (groundGlowMesh) groundGlowMesh.name = "ground-window-glow-mesh";

if (doorGlowMesh) doorGlowMesh.name = "door-glow-mesh";

const doorLight = new THREE.PointLight(16753752, 8, 8, 2);

doorLight.name = "door-light";

doorLight.position.set(5.2, 1.05, 1.2);

doorLight.intensity = 8;

doorLight.distance = 8;

scene.add(doorLight);

const pavilion = new THREE.Group;

pavilion.position.set(-8.85, 0, 3.8);

pavilion.rotation.y = .06;

pavilion.name = "pavilion";

scene.add(pavilion);

const pavilionAnchors = {};

{
    const stoneBase = new THREE.Mesh(new THREE.BoxGeometry(7.6, .36, 5.4), darkStoneMat);
    stoneBase.position.y = .18;
    stoneBase.castShadow = true;
    stoneBase.receiveShadow = true;
    pavilion.add(stoneBase);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(7.05, .16, 4.95), woodMat);
    deck.position.y = .39;
    deck.castShadow = true;
    deck.receiveShadow = true;
    pavilion.add(deck);
    const pavilionWood = new BoxBatch(woodMat, {
        castShadow: true
    });
    const pavilionDark = new BoxBatch(darkWoodMat, {
        castShadow: true
    });
    const pavilionStone = new BoxBatch(stoneMat, {
        castShadow: true
    });
    const pavilionCols = new BoxBatch(woodMat, {
        geometry: unitCylinder,
        castShadow: true
    });
    const colX = 3.04, colZ = 2.06;
    const columnPositions = [ [ -colX, -colZ ], [ colX, -colZ ], [ -colX, colZ ], [ colX, colZ ], [ -colX, 0 ], [ colX, 0 ], [ 0, colZ ] ];
    for (const [x, z] of columnPositions) {
        pavilionCols.add(new THREE.Vector3(x, 2.83, z), new THREE.Vector3(.34, 4.8, .34));
        pavilionStone.add(new THREE.Vector3(x, .61, z), new THREE.Vector3(.46, .3, .46));
    }
    pavilionWood.add(new THREE.Vector3(0, 5.05, colZ), new THREE.Vector3(6.9, .25, .3));
    pavilionWood.add(new THREE.Vector3(0, 5.05, -colZ), new THREE.Vector3(6.9, .25, .3));
    pavilionWood.add(new THREE.Vector3(colX, 5.05, 0), new THREE.Vector3(.3, .25, 4.5));
    pavilionWood.add(new THREE.Vector3(-colX, 5.05, 0), new THREE.Vector3(.3, .25, 4.5));
    pavilionWood.add(new THREE.Vector3(0, 4.65, colZ + .01), new THREE.Vector3(6.3, .13, .23));
    pavilionWood.add(new THREE.Vector3(0, 4.28, colZ + .01), new THREE.Vector3(6.3, .11, .2));
    for (let s = 0; s < 4; s++) {
        for (let i = 0; i < 7; i++) {
            const o = (i / 6 - .5) * (s < 2 ? 5.9 : 3.8);
            const x = s === 0 ? o : s === 1 ? -o : s === 2 ? colX + .14 : -colX - .14;
            const z = s === 0 ? colZ + .14 : s === 1 ? -colZ - .14 : o;
            pavilionDark.add(new THREE.Vector3(x, 4.88, z), new THREE.Vector3(s < 2 ? .18 : .22, .38, s < 2 ? .22 : .18));
            if (s === 0) {
                pavilionDark.add(new THREE.Vector3(x, 5.05, colZ + .3), new THREE.Vector3(.6, .12, .4));
                pavilionDark.add(new THREE.Vector3(x, 4.78, colZ + .2), new THREE.Vector3(.34, .12, .34));
            } else if (s === 1) {
                pavilionDark.add(new THREE.Vector3(x, 5.05, -colZ - .3), new THREE.Vector3(.6, .12, .4));
            } else if (s === 2) {
                pavilionDark.add(new THREE.Vector3(colX + .3, 5.05, z), new THREE.Vector3(.4, .12, .6));
            } else {
                pavilionDark.add(new THREE.Vector3(-colX - .3, 5.05, z), new THREE.Vector3(.4, .12, .6));
            }
        }
    }
    const wall = new THREE.Mesh(new THREE.BoxGeometry(6.2, 3.3, .18), darkWoodMat);
    wall.position.set(0, 2.35, -2.02);
    wall.castShadow = true;
    wall.receiveShadow = true;
    pavilion.add(wall);
    const backGlow = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 1.95), new THREE.MeshBasicMaterial({
        color: new THREE.Color(16753755).multiplyScalar(.055)
    }));
    backGlow.position.set(0, 2.25, -1.915);
    pavilion.add(backGlow);
    for (let i = 0; i < 9; i++) {
        pavilionDark.add(new THREE.Vector3(-2.05 + i * .52, 2.25, -1.86), new THREE.Vector3(.045, 2.3, .055));
    }
    for (let i = 0; i < 4; i++) {
        pavilionDark.add(new THREE.Vector3(0, 1.3 + i * .5, -1.86), new THREE.Vector3(4.3, .045, .055));
    }
    for (let i = 0; i <= 13; i++) {
        const x = -3 + i * .5;
        if (Math.abs(x) < .8) continue;
        pavilionDark.add(new THREE.Vector3(x, 1.08, colZ - .05), new THREE.Vector3(.06, .75, .06));
    }
    pavilionDark.add(new THREE.Vector3(-1.9, 1.42, colZ - .05), new THREE.Vector3(2.2, .08, .1));
    pavilionDark.add(new THREE.Vector3(1.9, 1.42, colZ - .05), new THREE.Vector3(2.2, .08, .1));
    const roof = createHipRoof({
        width: 10.4,
        depth: 8.2,
        eaveY: 5.28,
        rise: 1.22,
        lift: .62,
        innerScale: .16,
        sag: .07,
        cap: true
    });
    pavilion.add(roof);
    const lowerEave = new THREE.Mesh(new THREE.BoxGeometry(8.4, .16, .72), roofMat);
    lowerEave.position.set(0, 4.99, colZ + .88);
    lowerEave.rotation.x = .08;
    lowerEave.castShadow = true;
    pavilion.add(lowerEave);
    pavilionDark.add(new THREE.Vector3(-1.7, .85, .9), new THREE.Vector3(2.2, .12, .65));
    pavilionDark.add(new THREE.Vector3(-2.55, .55, .9), new THREE.Vector3(.12, .5, .55));
    pavilionDark.add(new THREE.Vector3(-.85, .55, .9), new THREE.Vector3(.12, .5, .55));
    const jar = new THREE.Mesh(new THREE.SphereGeometry(.33, 12, 10), darkStoneMat);
    jar.scale.y = .8;
    jar.position.set(1.6, .68, .9);
    jar.castShadow = true;
    pavilion.add(jar);
    pavilionWood.build(pavilion);
    pavilionDark.build(pavilion);
    pavilionStone.build(pavilion);
    pavilionCols.build(pavilion);
    pavilion.updateMatrixWorld(true);
    pavilionAnchors.bigLantern = new THREE.Vector3(2.35, 4.48, 2.25);
    pavilionAnchors.smallLantern = new THREE.Vector3(.72, 4.18, 1.9);
    pavilionAnchors.glow = new THREE.Vector3(1.2, 2.3, .9);
    pavilionAnchors.bigLanternWorld = pavilion.localToWorld(pavilionAnchors.bigLantern.clone());
    pavilionAnchors.smallLanternWorld = pavilion.localToWorld(pavilionAnchors.smallLantern.clone());
    pavilionAnchors.glowWorld = pavilion.localToWorld(pavilionAnchors.glow.clone());
}

const backgroundHall = new THREE.Group;

backgroundHall.position.set(-10.4, 0, -15.2);

backgroundHall.rotation.y = .13;

scene.add(backgroundHall);

{
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(10.8, .55, 6), darkStoneMat);
    plinth.position.y = .275;
    plinth.receiveShadow = true;
    backgroundHall.add(plinth);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(9.5, 2.8, 5), darkWoodMat);
    wall.position.y = 1.95;
    wall.castShadow = true;
    wall.receiveShadow = true;
    backgroundHall.add(wall);
    const loggiaMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(16753759).multiplyScalar(.26)
    });
    for (let i = -1; i <= 1; i++) {
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 1.52), loggiaMat);
        glow.position.set(i * 2.1, 2, 2.51);
        backgroundHall.add(glow);
        const frame = new THREE.Mesh(new THREE.BoxGeometry(1.28, 1.62, .1), darkWoodMat);
        frame.position.set(i * 2.1, 2, 2.46);
        backgroundHall.add(frame);
    }
    const hallRoof = createHipRoof({
        width: 12.2,
        depth: 7.8,
        eaveY: 3.4,
        rise: 1.2,
        lift: .48,
        innerScale: .18,
        sag: .05,
        cap: true
    });
    const hallRoofMat = new THREE.MeshStandardMaterial({
        map: roofTex.map,
        bumpMap: roofTex.bump,
        bumpScale: .05,
        color: 9082520,
        roughness: .94,
        metalness: .02,
        envMapIntensity: .1
    });
    const hallUnderMat = new THREE.MeshStandardMaterial({
        map: roofTex.map,
        bumpMap: roofTex.bump,
        bumpScale: .04,
        color: 6121062,
        roughness: .98,
        metalness: .02,
        emissive: new THREE.Color(791574),
        emissiveIntensity: .2,
        side: THREE.DoubleSide,
        envMapIntensity: .05
    });
    const hallTrimMat = new THREE.MeshStandardMaterial({
        color: 4142122,
        roughness: .92,
        metalness: .02,
        envMapIntensity: .05
    });
    hallRoof.traverse(o => {
        if (!o.isMesh) return;
        if (o.material === roofMat) o.material = hallRoofMat; else if (o.material === roofUnderMat) o.material = hallUnderMat; else if (o.material === fasciaMat) o.material = hallTrimMat; else if (o.material === roofRidgeMat) o.material = hallTrimMat; else if (o.material === tileEndMat) o.material = hallTrimMat; else if (o.material === bronzeMat) o.material = hallTrimMat;
    });
    backgroundHall.add(hallRoof);
}

const stoneMarker = new THREE.Group;

stoneMarker.position.set(10.45, 0, 4);

stoneMarker.rotation.y = -.59;

stoneMarker.name = "stoneMarker";

scene.add(stoneMarker);

{
    const base1 = new THREE.Mesh(new THREE.BoxGeometry(1.85, .28, 1.3), darkStoneMat);
    base1.position.y = .14;
    base1.castShadow = true;
    base1.receiveShadow = true;
    stoneMarker.add(base1);
    const base2 = new THREE.Mesh(new THREE.BoxGeometry(1.55, .3, 1.02), stoneMat);
    base2.position.y = .42;
    base2.castShadow = true;
    base2.receiveShadow = true;
    stoneMarker.add(base2);
    const base3 = new THREE.Mesh(new THREE.BoxGeometry(1.25, .22, .82), stoneCarveMat);
    base3.position.y = .68;
    base3.castShadow = true;
    stoneMarker.add(base3);
    const markerStone = new THREE.MeshStandardMaterial({
        map: stoneTex.map,
        bumpMap: stoneTex.bump,
        bumpScale: .085,
        color: 13224116,
        roughness: .84,
        metalness: .015,
        emissive: new THREE.Color(1316370),
        emissiveMap: stoneTex.map,
        emissiveIntensity: .32,
        envMapIntensity: .5
    });
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(1.08, 5.72, .7), markerStone);
    shaft.position.y = 3.68;
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    stoneMarker.add(shaft);
    const carveMat = new THREE.MeshStandardMaterial({
        map: makeInscriptionTexture([ "長", "樂", "寺" ], 12),
        transparent: true,
        roughness: .82,
        metalness: .01,
        depthWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2
    });
    const inscription = new THREE.Mesh(new THREE.PlaneGeometry(.78, 4.5), carveMat);
    inscription.position.set(0, 3.86, .358);
    stoneMarker.add(inscription);
    const borderMat = new THREE.MeshStandardMaterial({
        color: 4935752,
        roughness: .94,
        metalness: .01
    });
    for (let s2 = -1; s2 <= 1; s2 += 2) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(.055, 4.55, .035), borderMat);
        b.position.set(s2 * .43, 3.86, .355);
        stoneMarker.add(b);
    }
    for (let s2 = -1; s2 <= 1; s2 += 2) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(.92, .055, .035), borderMat);
        b.position.set(0, 3.86 + s2 * 2.28, .355);
        stoneMarker.add(b);
    }
    const upperBand = new THREE.Mesh(new THREE.BoxGeometry(1.28, .18, .84), stoneCarveMat);
    upperBand.position.y = 6.63;
    upperBand.castShadow = true;
    stoneMarker.add(upperBand);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.48, .17, .96), darkStoneMat);
    cap.position.y = 6.82;
    cap.castShadow = true;
    stoneMarker.add(cap);
    const cap2 = new THREE.Mesh(new THREE.BoxGeometry(1.15, .14, .8), stoneCarveMat);
    cap2.position.y = 6.97;
    cap2.castShadow = true;
    stoneMarker.add(cap2);
    const crownShape = new THREE.Shape;
    crownShape.moveTo(-.45, 0);
    crownShape.bezierCurveTo(-.5, .2, -.2, .22, -.28, .44);
    crownShape.bezierCurveTo(-.06, .37, -.03, .65, 0, .77);
    crownShape.bezierCurveTo(.05, .6, .16, .52, .26, .44);
    crownShape.bezierCurveTo(.2, .2, .48, .17, .43, 0);
    crownShape.closePath();
    const crownGeo = new THREE.ExtrudeGeometry(crownShape, {
        depth: .38,
        bevelEnabled: true,
        bevelSize: .03,
        bevelThickness: .03,
        bevelSegments: 2
    });
    crownGeo.center();
    const crown = new THREE.Mesh(crownGeo, stoneCarveMat);
    crown.position.set(0, 7.32, 0);
    crown.castShadow = true;
    stoneMarker.add(crown);
    const bud = new THREE.Mesh(new THREE.SphereGeometry(.22, 10, 8), stoneMat);
    bud.scale.set(.72, 1.35, .72);
    bud.position.y = 7.75;
    bud.castShadow = true;
    stoneMarker.add(bud);
    const mossGeo = new THREE.IcosahedronGeometry(.12, 0);
    const moss = new THREE.InstancedMesh(mossGeo, mossMat, 24);
    const mm = new THREE.Matrix4;
    const q = new THREE.Quaternion;
    const p = new THREE.Vector3;
    const sc = new THREE.Vector3;
    const r = mulberry32(551);
    for (let i = 0; i < 24; i++) {
        const side = r() > .5 ? 1 : -1;
        p.set((r() - .5) * 1.2, r() * (i < 15 ? .7 : 5.5), side * (.36 + r() * .12));
        q.setFromEuler(new THREE.Euler(r(), r() * Math.PI, r()));
        sc.set(.4 + r() * 1.6, .25 + r() * .5, .4 + r() * 1.2);
        mm.compose(p, q, sc);
        moss.setMatrixAt(i, mm);
    }
    moss.instanceMatrix.needsUpdate = true;
    moss.castShadow = true;
    stoneMarker.add(moss);
}

const rightWing = new THREE.Group;

rightWing.position.set(14.2, 0, -8.2);

rightWing.rotation.y = -.09;

scene.add(rightWing);

{
    const base = new THREE.Mesh(new THREE.BoxGeometry(9.5, .4, 4.6), darkStoneMat);
    base.position.y = .2;
    base.castShadow = true;
    base.receiveShadow = true;
    rightWing.add(base);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(8.6, 2.4, 3.9), darkWoodMat);
    wall.position.y = 1.62;
    wall.castShadow = true;
    wall.receiveShadow = true;
    rightWing.add(wall);
    const wingRoof = createHipRoof({
        width: 10.6,
        depth: 5.7,
        eaveY: 3.15,
        rise: 1,
        lift: .35,
        innerScale: .12,
        sag: .04
    });
    wingRoof.traverse(o => {
        if (o.isMesh && o.material === roofMat) o.material = roofUnderMat;
    });
    rightWing.add(wingRoof);
    const warm = new THREE.MeshBasicMaterial({
        color: new THREE.Color(16754024).multiplyScalar(.38)
    });
    for (let i = -1; i <= 1; i++) {
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(.9, 1.1), warm);
        pane.position.set(i * 2.3, 1.65, 1.965);
        rightWing.add(pane);
        const mull = new THREE.Mesh(new THREE.BoxGeometry(1, 1.2, .04), darkWoodMat);
        mull.position.set(i * 2.3, 1.65, 1.945);
        rightWing.add(mull);
        for (let k = -1; k <= 1; k++) {
            const bar = new THREE.Mesh(new THREE.BoxGeometry(.035, 1.16, .06), darkWoodMat);
            bar.position.set(i * 2.3 + k * .28, 1.65, 1.96);
            rightWing.add(bar);
        }
    }
}

const wallGroup = new THREE.Group;

wallGroup.position.set(-16.5, 0, -5.5);

wallGroup.rotation.y = .03;

scene.add(wallGroup);

{
    const r = mulberry32(15);
    const mat = new THREE.MeshStandardMaterial({
        map: stoneTex.map,
        bumpMap: stoneTex.bump,
        bumpScale: .04,
        color: 7173741,
        roughness: .95
    });
    for (let i = 0; i < 12; i++) {
        const seg = new THREE.Mesh(new THREE.BoxGeometry(2.1, .85 + r() * .08, .42), mat);
        seg.position.set(i * 2.15, .44, 0);
        seg.rotation.y = (r() - .5) * .015;
        seg.castShadow = true;
        seg.receiveShadow = true;
        wallGroup.add(seg);
        const capstone = new THREE.Mesh(new THREE.BoxGeometry(2.2, .12, .56), roofRidgeMat);
        capstone.position.set(i * 2.15, .92, 0);
        capstone.castShadow = true;
        wallGroup.add(capstone);
    }
}

const leafInstances = [];

const leafRng = mulberry32(8881);

function addFoliageCluster(cx, cy, cz, rx, ry, rz, count, sizeMin = .9, sizeMax = 1.9, dark = 1) {
    for (let i = 0; i < count; i++) {
        const a = leafRng() * Math.PI * 2;
        const b = Math.acos(2 * leafRng() - 1);
        const rad = Math.pow(leafRng(), .55);
        const x = cx + Math.cos(a) * Math.sin(b) * rx * rad;
        const y = cy + Math.cos(b) * ry * rad;
        const z = cz + Math.sin(a) * Math.sin(b) * rz * rad;
        const s = sizeMin + leafRng() * (sizeMax - sizeMin);
        const q = (new THREE.Quaternion).setFromEuler(new THREE.Euler(leafRng() * Math.PI * 2, leafRng() * Math.PI * 2, leafRng() * Math.PI * 2));
        const c = (new THREE.Color).setHSL(.28 + leafRng() * .045, .16 + leafRng() * .14, (.065 + leafRng() * .04) * dark);
        leafInstances.push({
            p: new THREE.Vector3(x, y, z),
            q: q,
            s: s,
            c: c
        });
    }
}

function addBarkSegment(group, a, b, ra, rb) {
    const dir = (new THREE.Vector3).subVectors(b, a);
    const len = dir.length();
    const geo = new THREE.CylinderGeometry(rb, ra, len, 9, 1, false);
    geo.translate(0, len / 2, 0);
    const mesh = new THREE.Mesh(geo, barkMat);
    mesh.position.copy(a);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
}

function addBarkCurve(group, points, radii, segments = 10) {
    const curve = new THREE.CatmullRomCurve3(points);
    for (let i = 0; i < segments; i++) {
        const t0 = i / segments;
        const t1 = (i + 1) / segments;
        const a = curve.getPoint(t0);
        const b = curve.getPoint(t1);
        const ra = THREE.MathUtils.lerp(radii[0], radii[1], t0);
        const rb = THREE.MathUtils.lerp(radii[0], radii[1], t1);
        addBarkSegment(group, a, b, ra, rb);
    }
    return curve;
}

function buildForegroundTree(options) {
    const {x: x, z: z, scale: scale = 1, lean: lean = 0, side: side = 1, canopy: canopy = "right"} = options;
    const group = new THREE.Group;
    group.position.set(x, 0, z);
    scene.add(group);
    const basePoints = [ new THREE.Vector3(0, -.1, 0), new THREE.Vector3(.1 * side, 2, .12), new THREE.Vector3(-.25 * side + lean, 4.4, .05), new THREE.Vector3(.45 * side + lean, 7.2, .25), new THREE.Vector3(.75 * side + lean, 10.5, .35), new THREE.Vector3(1.1 * side + lean, 14.2, .15) ].map(v => v.multiplyScalar(scale));
    addBarkCurve(group, basePoints, [ .7 * scale, .28 * scale ], 12);
    const rr = mulberry32(31 + Math.floor(x * 7));
    for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2 + rr() * .5;
        const start = new THREE.Vector3(0, 1.1, 0);
        const mid = new THREE.Vector3(Math.cos(a) * .8 * scale, .3, Math.sin(a) * .8 * scale);
        const end = new THREE.Vector3(Math.cos(a) * (1.55 + rr()) * scale, -.06, Math.sin(a) * (1.55 + rr()) * scale);
        addBarkSegment(group, start, mid, .3 * scale, .14 * scale);
        addBarkSegment(group, mid, end, .14 * scale, .035 * scale);
    }
    const branchGroup = new THREE.Group;
    group.add(branchGroup);
    if (canopy === "right") {
        const b1 = [ new THREE.Vector3(.4 * scale, 7.4 * scale, .2), new THREE.Vector3(1.8 * scale, 10 * scale, 0), new THREE.Vector3(3.4 * scale, 13 * scale, .4), new THREE.Vector3(4.8 * scale, 16.4 * scale, .7) ];
        addBarkCurve(branchGroup, b1, [ .24 * scale, .065 * scale ], 8);
        const b2 = [ new THREE.Vector3(.55 * scale, 9.4 * scale, .3), new THREE.Vector3(1.9 * scale, 12 * scale, 1.7), new THREE.Vector3(2.7 * scale, 15 * scale, 2.5), new THREE.Vector3(3.2 * scale, 18 * scale, 2.4) ];
        addBarkCurve(branchGroup, b2, [ .2 * scale, .045 * scale ], 7);
        const b3 = [ new THREE.Vector3(.1 * scale, 8.8 * scale, .15), new THREE.Vector3(-.8 * scale, 12 * scale, -1), new THREE.Vector3(-1.1 * scale, 15.5 * scale, -1.7) ];
        addBarkCurve(branchGroup, b3, [ .13 * scale, .03 * scale ], 5);
        const b4 = [ new THREE.Vector3(.7 * scale, 10.6 * scale, .1), new THREE.Vector3(.4 * scale, 12.5 * scale, -1.6), new THREE.Vector3(-.3 * scale, 14.6 * scale, -2.4) ];
        addBarkCurve(branchGroup, b4, [ .11 * scale, .022 * scale ], 4);
        const tips = [ [ 1.1, 15.6, .4, 3, 2, 2.3, 78 ], [ 2.7, 16.7, 1.2, 3.6, 1.9, 2.5, 92 ], [ 4.2, 16.2, .2, 2.9, 1.7, 2.1, 64 ], [ 2.1, 13.8, 2.2, 2.4, 1.5, 2.1, 48 ], [ .1, 17.8, -1, 2.7, 1.5, 2, 45 ], [ -.2, 14.8, -2.2, 2.15, 1.25, 1.8, 40 ], [ -.6, 12.6, -1.5, 1.75, 1, 1.5, 24 ] ];
        for (const t of tips) {
            addFoliageCluster(x + t[0] * scale, t[1] * scale, z + t[2] * scale, t[3] * scale, t[4] * scale, t[5] * scale, t[6], 1.05 * scale, 2.15 * scale, .92);
        }
    } else {
        const b1 = [ new THREE.Vector3(.2 * scale, 9.2 * scale, .2), new THREE.Vector3(1.8 * scale, 12 * scale, -.4), new THREE.Vector3(4.2 * scale, 15.2 * scale, -.8), new THREE.Vector3(6.3 * scale, 17.1 * scale, -.5) ];
        addBarkCurve(branchGroup, b1, [ .25 * scale, .05 * scale ], 8);
        const b2 = [ new THREE.Vector3(-.2 * scale, 11.5 * scale, .3), new THREE.Vector3(1.9 * scale, 14.3 * scale, 2.5), new THREE.Vector3(4.2 * scale, 15.9 * scale, 3.8) ];
        addBarkCurve(branchGroup, b2, [ .16 * scale, .035 * scale ], 5);
        const tips = [ [ 5, 16.4, -.1, 3.8, 1.9, 2.8, 110 ], [ 4, 13.8, 3.2, 3, 1.6, 2.2, 65 ], [ 7.1, 16.7, .6, 2.4, 1.3, 2, 45 ] ];
        for (const t of tips) {
            addFoliageCluster(x + t[0] * scale, t[1] * scale, z + t[2] * scale, t[3] * scale, t[4] * scale, t[5] * scale, t[6], 1.15 * scale, 2.3 * scale, .82);
        }
    }
    return group;
}

buildForegroundTree({
    x: 9.7,
    z: 7.3,
    scale: 1.14,
    lean: -.35,
    side: 1,
    canopy: "right"
});

buildForegroundTree({
    x: -14.8,
    z: 9.6,
    scale: 1.05,
    lean: .1,
    side: -1,
    canopy: "left"
});

(function addRightOverheadCanopy() {
    const branchGroup = new THREE.Group;
    scene.add(branchGroup);
    const bough = [ new THREE.Vector3(9.95, 8.9, 7), new THREE.Vector3(9.7, 10.5, 6.1), new THREE.Vector3(9.2, 12, 5.1), new THREE.Vector3(8.8, 13.2, 4.7) ];
    addBarkCurve(branchGroup, bough, [ .11, .025 ], 5);
    addFoliageCluster(8.8, 13.3, 4.8, 2.4, 1.4, 2, 55, .9, 1.95, .94);
    addFoliageCluster(9.9, 14.6, 5.7, 2.7, 1.6, 2.3, 78, 1, 2.1, .9);
    addFoliageCluster(10.7, 12.2, 6.1, 2.1, 1.2, 1.8, 38, .8, 1.7, .96);
})();

(function addLeftOverheadCanopy() {
    const branchGroup = new THREE.Group;
    scene.add(branchGroup);
    const branch = [ new THREE.Vector3(-15, 10.6, 8.1), new THREE.Vector3(-11.3, 12.6, 6), new THREE.Vector3(-8.2, 14.2, 4.1), new THREE.Vector3(-4.9, 14.8, 2.9) ];
    addBarkCurve(branchGroup, branch, [ .21, .035 ], 8);
    const fork = [ new THREE.Vector3(-8.2, 14.1, 4.1), new THREE.Vector3(-7.1, 15.7, 4.8), new THREE.Vector3(-6.4, 17.1, 5.3) ];
    addBarkCurve(branchGroup, fork, [ .09, .02 ], 4);
    addFoliageCluster(-7.1, 16.1, 4.1, 2.8, 1.5, 2.4, 82, .85, 1.8, .9);
    addFoliageCluster(-7, 12.9, 2.2, 1.55, .9, 1.35, 28, .75, 1.5, .92);
    addFoliageCluster(-9.1, 13.1, 5, 2.2, 1.1, 1.9, 44, .9, 1.8, .88);
})();

(function buildLeafCards() {
    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = leafMat.clone();
    mat.color = new THREE.Color(11912613);
    const mesh = new THREE.InstancedMesh(geo, mat, leafInstances.length);
    const m = new THREE.Matrix4;
    const sc = new THREE.Vector3;
    for (let i = 0; i < leafInstances.length; i++) {
        const it = leafInstances[i];
        sc.set(it.s, it.s * (.78 + leafRng() * .35), 1);
        m.compose(it.p, it.q, sc);
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, it.c);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    scene.add(mesh);
})();

const hangingBodyGeo = (() => {
    const pts = [ new THREE.Vector2(.065, 0), new THREE.Vector2(.19, .025), new THREE.Vector2(.285, .12), new THREE.Vector2(.315, .34), new THREE.Vector2(.315, .56), new THREE.Vector2(.285, .78), new THREE.Vector2(.19, .875), new THREE.Vector2(.065, .9) ];
    return new THREE.LatheGeometry(pts, 26);
})();

const lanternAnchorMat = new THREE.MeshStandardMaterial({
    color: 2168591,
    roughness: .58,
    metalness: .15
});

const glowPoolCache = new Map;

function createHangingLantern(options) {
    const {anchor: anchor, scale: scale = 1, type: type = "hanging", baseLight: baseLight = 26, distance: distance = 14, haloSize: haloSize = 2.6, label: label = "Hanging lantern", warm: warm = 16751179} = options;
    const group = new THREE.Group;
    group.position.copy(anchor);
    group.scale.setScalar(scale);
    scene.add(group);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(.014, .014, .42, 5), lanternAnchorMat);
    cord.position.y = -.2;
    group.add(cord);
    const bracket = new THREE.Mesh(new THREE.CylinderGeometry(.13, .18, .055, 10), lanternAnchorMat);
    bracket.position.y = -.43;
    group.add(bracket);
    const topCap = new THREE.Mesh(new THREE.CylinderGeometry(.23, .27, .07, 14), lanternAnchorMat);
    topCap.position.y = -.47;
    group.add(topCap);
    const bodyMat = paperMatBase.clone();
    bodyMat.map = paperTex;
    bodyMat.emissiveMap = paperTex;
    bodyMat.emissive = new THREE.Color(warm);
    bodyMat.color = new THREE.Color(10252093);
    bodyMat.emissiveIntensity = paperMatBase.emissiveIntensity;
    bodyMat.emissive.setHex(16751183);
    bodyMat.color.setHex(4861720);
    const body = new THREE.Mesh(hangingBodyGeo, bodyMat);
    body.position.y = -1.36;
    body.castShadow = false;
    group.add(body);
    const bottomCap = new THREE.Mesh(new THREE.CylinderGeometry(.22, .25, .06, 14), lanternAnchorMat);
    bottomCap.position.y = -1.38;
    group.add(bottomCap);
    const tassel = new THREE.Mesh(new THREE.CylinderGeometry(.02, .035, .25, 6), new THREE.MeshStandardMaterial({
        color: 5972760,
        roughness: .8
    }));
    tassel.position.y = -1.56;
    group.add(tassel);
    const tasselBead = new THREE.Mesh(new THREE.SphereGeometry(.055, 8, 6), bronzeMat);
    tasselBead.position.y = -1.68;
    group.add(tasselBead);
    const haloMat = new THREE.SpriteMaterial({
        map: glowTex,
        color: new THREE.Color(warm),
        transparent: true,
        opacity: .3,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        fog: false
    });
    const halo = new THREE.Sprite(haloMat);
    halo.position.y = -.9;
    halo.scale.set(haloSize, haloSize, 1);
    group.add(halo);
    const light = new THREE.PointLight(warm, baseLight, distance, 2);
    light.position.y = -.88;
    group.add(light);
    const hitMat = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        colorWrite: false
    });
    const hit = new THREE.Mesh(new THREE.SphereGeometry(.55, 8, 6), hitMat);
    hit.position.y = -.92;
    hit.scale.set(1.35, 1.6, 1.35);
    group.add(hit);
    const record = {
        kind: type,
        label: label,
        group: group,
        body: body,
        materials: [ bodyMat ],
        lights: [ {
            light: light,
            base: baseLight
        } ],
        halo: halo,
        haloBase: .16,
        baseEmissive: paperMatBase.emissiveIntensity,
        boost: 1,
        phase: Math.random() * Math.PI * 2,
        reflections: []
    };
    hit.userData.lanternRecord = record;
    body.userData.lanternRecord = record;
    pickables.push(hit, body);
    lanterns.push(record);
    group.userData.lanternRecord = record;
    return record;
}

const stoneLanternCoreMatBase = new THREE.MeshBasicMaterial({
    color: new THREE.Color(16757354).multiplyScalar(.92),
    fog: true
});

function createStandingLantern(options) {
    const {x: x, z: z, scale: scale = 1, baseLight: baseLight = 17, distance: distance = 12, label: label = "Stone lantern"} = options;
    const group = new THREE.Group;
    group.position.set(x, 0, z);
    group.scale.setScalar(scale);
    scene.add(group);
    const stoneBits = [];
    const addStone = (geo, mat, y, rot = 0) => {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = y;
        mesh.rotation.y = rot;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        return mesh;
    };
    addStone(new THREE.CylinderGeometry(.52, .62, .2, 6), darkStoneMat, .1);
    addStone(new THREE.CylinderGeometry(.42, .48, .16, 6), stoneCarveMat, .27);
    addStone(new THREE.BoxGeometry(.26, .95, .26), stoneMat, .82);
    addStone(new THREE.CylinderGeometry(.34, .26, .16, 8), stoneCarveMat, 1.37);
    addStone(new THREE.BoxGeometry(.63, .12, .63), stoneMat, 1.49);
    const glowMat = stoneLanternCoreMatBase.clone();
    const glowMatSide = glowMat;
    for (let s = 0; s < 4; s++) {
        const angle = s * Math.PI / 2;
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(.33, .34), glowMatSide);
        pane.position.set(Math.sin(angle) * .211, 1.78, Math.cos(angle) * .211);
        pane.rotation.y = angle;
        group.add(pane);
    }
    const fireboxFrame = new THREE.Group;
    for (let sx = -1; sx <= 1; sx += 2) {
        for (let sz = -1; sz <= 1; sz += 2) {
            const post = new THREE.Mesh(new THREE.BoxGeometry(.11, .55, .11), stoneCarveMat);
            post.position.set(sx * .245, 1.79, sz * .245);
            post.castShadow = true;
            fireboxFrame.add(post);
        }
    }
    group.add(fireboxFrame);
    addStone(new THREE.BoxGeometry(.74, .11, .74), stoneCarveMat, 2.09);
    addStone(new THREE.CylinderGeometry(.06, .1, .55, 6), stoneMat, 2.38);
    const roof = addStone(new THREE.ConeGeometry(.68, .32, 4), darkStoneMat, 2.19, Math.PI / 4);
    roof.rotation.x = 0;
    const jewel = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 6), stoneCarveMat);
    jewel.position.y = 2.68;
    jewel.castShadow = true;
    group.add(jewel);
    const mossGeo = new THREE.IcosahedronGeometry(.08, 0);
    const moss = new THREE.InstancedMesh(mossGeo, mossMat, 9);
    const mm = new THREE.Matrix4;
    const q = new THREE.Quaternion;
    const r = mulberry32(500 + x * 11 + z * 7);
    for (let i = 0; i < 9; i++) {
        q.setFromEuler(new THREE.Euler(r(), r() * Math.PI, r()));
        mm.compose(new THREE.Vector3((r() - .5) * .9, .03 + r() * .12, (r() - .5) * .9), q, new THREE.Vector3(.5 + r(), .3 + r() * .5, .5 + r()));
        moss.setMatrixAt(i, mm);
    }
    moss.instanceMatrix.needsUpdate = true;
    moss.castShadow = true;
    group.add(moss);
    const light = new THREE.PointLight(16751439, baseLight, distance, 2);
    light.position.set(0, 1.8, .12);
    group.add(light);
    const haloMat = new THREE.SpriteMaterial({
        map: glowTex,
        color: new THREE.Color(16754526),
        transparent: true,
        opacity: .2,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
    });
    const halo = new THREE.Sprite(haloMat);
    halo.position.y = 1.78;
    halo.scale.set(1.5, 1.5, 1);
    group.add(halo);
    const hitMat = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        colorWrite: false
    });
    const hit = new THREE.Mesh(new THREE.SphereGeometry(.65, 8, 6), hitMat);
    hit.position.y = 1.55;
    hit.scale.set(1, 2.1, 1);
    group.add(hit);
    const record = {
        kind: "standing",
        label: label,
        group: group,
        materials: [ glowMat ],
        lights: [ {
            light: light,
            base: baseLight
        } ],
        halo: halo,
        haloBase: .12,
        baseEmissive: 1,
        boost: 1,
        phase: Math.random() * Math.PI * 2,
        reflections: []
    };
    hit.userData.lanternRecord = record;
    pickables.push(hit);
    lanterns.push(record);
    group.userData.lanternRecord = record;
    return record;
}

const pavilionAnchor = pavilion.localToWorld(new THREE.Vector3(1.98, 4.88, 2.15));

const bigHangingLantern = createHangingLantern({
    anchor: pavilionAnchor,
    scale: 1.36,
    baseLight: 34,
    distance: 18,
    haloSize: 2.8,
    label: "Pavilion paper lantern"
});

const pagodaLeftHang = pagoda.localToWorld(new THREE.Vector3(-2.15, 4.83, 2.82));

const pagodaRightHang = pagoda.localToWorld(new THREE.Vector3(2.15, 4.83, 2.82));

const pagodaLanternA = createHangingLantern({
    anchor: pagodaLeftHang,
    scale: .55,
    baseLight: 12,
    distance: 10,
    haloSize: 1.2,
    label: "Pagoda lantern"
});

const pagodaLanternB = createHangingLantern({
    anchor: pagodaRightHang,
    scale: .55,
    baseLight: 12,
    distance: 10,
    haloSize: 1.2,
    label: "Pagoda lantern"
});

const standingLanternA = createStandingLantern({
    x: 1.8,
    z: 4.25,
    scale: 1.08,
    baseLight: 30,
    distance: 14,
    label: "Stair lantern"
});

const standingLanternB = createStandingLantern({
    x: 8.45,
    z: 4.25,
    scale: 1.08,
    baseLight: 30,
    distance: 14,
    label: "Stair lantern"
});

const standingLanternC = createStandingLantern({
    x: -2.3,
    z: -.6,
    scale: .92,
    baseLight: 18,
    distance: 11,
    label: "Courtyard lantern"
});

function addLightReflection(record, x, z, width, length, baseOpacity, color = 16753500) {
    const mat = new THREE.MeshBasicMaterial({
        map: streakTex,
        color: color,
        transparent: true,
        opacity: baseOpacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        fog: true
    });
    const geo = new THREE.PlaneGeometry(width, length);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = "lantern-streak";
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, .035, z - length * .23);
    mesh.renderOrder = 3;
    scene.add(mesh);
    const poolMat = new THREE.MeshBasicMaterial({
        map: glowTex,
        color: color,
        transparent: true,
        opacity: baseOpacity * .55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        fog: true
    });
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(width * 2.35, width * 2.35), poolMat);
    pool.name = "lantern-pool";
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(x, .03, z + .35);
    pool.renderOrder = 3;
    scene.add(pool);
    record.reflections.push({
        mat: mat,
        poolMat: poolMat,
        baseOpacity: baseOpacity
    });
    animatedReflections.push(mesh, pool);
}

addLightReflection(bigHangingLantern, pavilionAnchor.x + .5, pavilionAnchor.z + 2, 2.1, 14, .38);

addLightReflection(pagodaLanternA, pagodaLeftHang.x, pagodaLeftHang.z + 4.2, .85, 6.2, .17);

addLightReflection(pagodaLanternB, pagodaRightHang.x, pagodaRightHang.z + 4.2, .85, 6.2, .17);

addLightReflection(standingLanternA, 1.8, 5.2, 1.35, 9.4, .46);

addLightReflection(standingLanternB, 8.45, 5.2, 1.35, 9.4, .46);

addLightReflection(standingLanternC, -2.3, .5, 1, 7, .27);

(function addAmbientWetGlints() {
    const doorGlow = new THREE.MeshBasicMaterial({
        map: streakTex,
        color: 16754788,
        transparent: true,
        opacity: .15,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        fog: true
    });
    const dm = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 14), doorGlow);
    dm.name = "door-wet-reflection";
    dm.rotation.x = -Math.PI / 2;
    dm.position.set(5.15, .028, 6.2);
    dm.renderOrder = 2;
    scene.add(dm);
    const moonGlow = new THREE.MeshBasicMaterial({
        map: glowTex,
        color: 8363195,
        transparent: true,
        opacity: .13,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        fog: true
    });
    const mg = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 16), moonGlow);
    mg.name = "moon-wet-reflection";
    mg.rotation.x = -Math.PI / 2;
    mg.position.set(-4.4, .022, 11);
    mg.renderOrder = 2;
    scene.add(mg);
})();

function addMistSprite(config) {
    const {x: x, y: y, z: z, sx: sx, sy: sy, opacity: opacity, seed: seed = 1, drift: drift = 1, rot: rot = 0} = config;
    const mat = new THREE.SpriteMaterial({
        map: seed % 2 ? mistTexA : mistTexB,
        color: 9480380,
        transparent: true,
        opacity: opacity,
        depthWrite: false,
        blending: THREE.NormalBlending,
        fog: true
    });
    const sp = new THREE.Sprite(mat);
    sp.position.set(x, y, z);
    sp.scale.set(sx, sy, 1);
    sp.material.rotation = rot;
    sp.renderOrder = 1;
    sp.userData.baseX = x;
    sp.userData.baseY = y;
    sp.userData.baseOpacity = opacity;
    sp.userData.drift = drift;
    sp.userData.phase = Math.random() * Math.PI * 2;
    sp.userData.speed = .035 + Math.random() * .04;
    mistSprites.push(sp);
    scene.add(sp);
    return sp;
}

addMistSprite({
    x: -4.5,
    y: 1.15,
    z: 1.2,
    sx: 15,
    sy: 3.7,
    opacity: .105,
    seed: 1,
    drift: 1.35,
    rot: -.04
});

addMistSprite({
    x: 2.8,
    y: 1.9,
    z: 1.8,
    sx: 12,
    sy: 3.2,
    opacity: .085,
    seed: 2,
    drift: -.8,
    rot: .02
});

addMistSprite({
    x: 10.1,
    y: 1.25,
    z: .7,
    sx: 10,
    sy: 3,
    opacity: .075,
    seed: 1,
    drift: .65,
    rot: .06
});

addMistSprite({
    x: -10.2,
    y: 2.4,
    z: -3,
    sx: 14,
    sy: 4,
    opacity: .11,
    seed: 2,
    drift: .5,
    rot: -.05
});

addMistSprite({
    x: 12.5,
    y: 2.1,
    z: -4.5,
    sx: 12,
    sy: 4,
    opacity: .09,
    seed: 1,
    drift: -.55,
    rot: .03
});

addMistSprite({
    x: -2,
    y: 1.35,
    z: 8.5,
    sx: 9,
    sy: 2.2,
    opacity: .045,
    seed: 2,
    drift: 1.1,
    rot: .03
});

addMistSprite({
    x: 17,
    y: 3,
    z: -9,
    sx: 17,
    sy: 5,
    opacity: .09,
    seed: 1,
    drift: .65,
    rot: -.02
});

addMistSprite({
    x: -16,
    y: 4.2,
    z: -14,
    sx: 20,
    sy: 6,
    opacity: .08,
    seed: 2,
    drift: .35,
    rot: .04
});

addMistSprite({
    x: -12.5,
    y: 5.2,
    z: -13,
    sx: 27,
    sy: 8,
    opacity: .075,
    seed: 1,
    drift: .4,
    rot: .02
});

addMistSprite({
    x: 17.5,
    y: 4.3,
    z: -19,
    sx: 24,
    sy: 7,
    opacity: .065,
    seed: 2,
    drift: -.3,
    rot: -.03
});

addMistSprite({
    x: 1.5,
    y: 5.6,
    z: -25,
    sx: 38,
    sy: 9,
    opacity: .08,
    seed: 1,
    drift: .2,
    rot: .01
});

addMistSprite({
    x: -24,
    y: 6.2,
    z: -28,
    sx: 34,
    sy: 9,
    opacity: .07,
    seed: 2,
    drift: .3,
    rot: -.04
});

addMistSprite({
    x: 25,
    y: 7.5,
    z: -34,
    sx: 44,
    sy: 11,
    opacity: .06,
    seed: 1,
    drift: -.25,
    rot: .03
});

addMistSprite({
    x: 7,
    y: 5.2,
    z: -18,
    sx: 34,
    sy: 10,
    opacity: .075,
    seed: 2,
    drift: .35,
    rot: .01
});

addMistSprite({
    x: -18,
    y: 6.4,
    z: -25,
    sx: 38,
    sy: 11,
    opacity: .065,
    seed: 1,
    drift: -.28,
    rot: -.02
});

(function addHorizonHaze() {
    const mat = new THREE.SpriteMaterial({
        map: mistTexB,
        color: 10335174,
        transparent: true,
        opacity: .16,
        depthWrite: false,
        blending: THREE.NormalBlending,
        fog: true
    });
    const sp = new THREE.Sprite(mat);
    sp.position.set(0, 8.5, -36);
    sp.scale.set(76, 17, 1);
    sp.renderOrder = 1;
    sp.userData.baseOpacity = .16;
    sp.userData.isStaticMist = true;
    sp.userData.baseX = sp.position.x;
    sp.userData.baseY = sp.position.y;
    sp.userData.phase = 1.4;
    sp.userData.drift = .2;
    sp.userData.speed = .018;
    mistSprites.push(sp);
    scene.add(sp);
})();

(function addMoonVeil() {
    const dir = SKY.moonDirection;
    const mat = new THREE.SpriteMaterial({
        map: cloudTexB,
        color: 10663369,
        transparent: true,
        opacity: .05,
        depthWrite: false,
        blending: THREE.NormalBlending,
        fog: false
    });
    mat.toneMapped = true;
    const sp = new THREE.Sprite(mat);
    sp.position.copy(camera.position).addScaledVector(dir, 200);
    sp.position.x += 14;
    sp.position.y -= 4;
    sp.scale.set(72, 26, 1);
    sp.renderOrder = -5;
    sp.userData.baseX = sp.position.x;
    sp.userData.baseY = sp.position.y;
    sp.userData.baseOpacity = .04;
    sp.userData.drift = .2;
    sp.userData.phase = 2.4;
    sp.userData.isMoonVeil = true;
    cloudSprites.push(sp);
    scene.add(sp);
})();

addContactShadow(5.2, -4.5, 13.2, 11, .2);

addContactShadow(-8.85, 3.8, 9.4, 7.2, .2, .06);

addContactShadow(10.45, 4, 2.5, 2.2, .2, -.59);

addContactShadow(9.7, 7.3, 3.8, 3.2, .22);

addContactShadow(1.8, 4.25, 1.6, 1.6, .16);

addContactShadow(8.45, 4.25, 1.6, 1.6, .16);

addContactShadow(-2.3, -.6, 1.4, 1.4, .14);

addContactShadow(-1.2, 9, 2.4, 4.8, .12, -.1);

function createGradeShader() {
    return {
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
        vertexShader: `\n      varying vec2 vUv;\n      void main() {\n        vUv = uv;\n        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n      }\n    `,
        fragmentShader: `\n      uniform sampler2D tDiffuse;\n      uniform float uTime;\n      uniform vec2 uResolution;\n      varying vec2 vUv;\n\n      float hash(vec2 p) {\n        p = fract(p * vec2(123.34, 456.21));\n        p += dot(p, p + 45.32);\n        return fract(p.x * p.y);\n      }\n\n      void main() {\n        vec2 uv = vUv;\n        vec3 col;\n        // Barely-there chromatic separation at the edges of the lens.\n        vec2 q = uv - 0.5;\n        q.x *= uResolution.x / uResolution.y;\n        float edge = smoothstep(0.2, 0.86, length(q));\n        float ca = edge * 0.00075;\n        col.r = texture2D(tDiffuse, uv + vec2(ca, 0.0)).r;\n        col.g = texture2D(tDiffuse, uv).g;\n        col.b = texture2D(tDiffuse, uv - vec2(ca, 0.0)).b;\n\n        float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));\n        // Cool the shadows toward ink-blue; keep the lanterns amber.\n        col = mix(col, col * vec3(0.90, 0.985, 1.045), smoothstep(0.54, 0.03, lum));\n        col = mix(col, col * vec3(1.035, 1.0, 0.94), smoothstep(0.4, 0.96, lum));\n        float finalLum = dot(col, vec3(0.2126, 0.7152, 0.0722));\n        col = mix(vec3(finalLum), col, 0.96);\n\n        // Gentle S-curve for a large-format film density.\n        col = clamp((col - 0.5) * 1.065 + 0.5, 0.0, 1.0);\n        col += vec3(0.010, 0.013, 0.018);\n\n        // A restrained unsharp mask keeps the wood grain and stone pores from\n        // dissolving under bloom and the film grain.\n        vec2 px = 1.0 / uResolution;\n        vec3 soft = texture2D(tDiffuse, uv + vec2(px.x, 0.0)).rgb\n                  + texture2D(tDiffuse, uv - vec2(px.x, 0.0)).rgb\n                  + texture2D(tDiffuse, uv + vec2(0.0, px.y)).rgb\n                  + texture2D(tDiffuse, uv - vec2(0.0, px.y)).rgb;\n        soft *= 0.25;\n        col = clamp(col + (col - soft) * 0.16, 0.0, 1.0);\n\n        float vig = smoothstep(0.78, 0.17, length(q * vec2(0.88, 1.0)));\n        col *= mix(0.55, 1.0, vig);\n\n        float n = hash(uv * uResolution + fract(uTime) * 113.0);\n        col += (n - 0.5) * 0.024;\n        gl_FragColor = vec4(col, 1.0);\n      }\n    `
    };
}

const composerRT = new THREE.WebGLRenderTarget(Math.floor(stage.clientWidth * renderer.getPixelRatio()), Math.floor(stage.clientHeight * renderer.getPixelRatio()), {
    type: THREE.HalfFloatType,
    samples: 4
});

composer = new EffectComposer(renderer, composerRT);

composer.setPixelRatio(renderer.getPixelRatio());

composer.setSize(stage.clientWidth, stage.clientHeight);

const renderPass = new RenderPass(scene, camera);

composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(new THREE.Vector2(stage.clientWidth, stage.clientHeight), .48, .56, .88);

composer.addPass(bloomPass);

const outputPass = new OutputPass;

composer.addPass(outputPass);

const gradePass = new ShaderPass(createGradeShader());

gradePass.uniforms.uResolution.value.set(stage.clientWidth * renderer.getPixelRatio(), stage.clientHeight * renderer.getPixelRatio());

composer.addPass(gradePass);

const fogThin = new THREE.Color(1780798);

const fogThick = new THREE.Color(3755102);

function applyMist(value) {
    const m = THREE.MathUtils.clamp(value, 0, 1);
    state.mist = m;
    scene.fog.density = .0058 + Math.pow(m, .88) * .03;
    scene.fog.color.copy(fogThin).lerp(fogThick, Math.pow(m, .8));
    moonLight.intensity = 2.7 * (1 - m * .18);
    moonLight.color.setRGB(.72 - m * .035, .8 - m * .02, .94);
    for (const sp of mistSprites) {
        const base = sp.userData.baseOpacity || .08;
        const factor = sp.userData.isStaticMist ? .7 + m * .9 : .28 + m * 1.75;
        if (sp.material) sp.material.opacity = base * factor;
    }
    for (const sp of cloudSprites) {
        const base = sp.userData.baseOpacity || .2;
        const veilBoost = sp.userData.isMoonVeil ? .65 + m * 2.2 : .92 + m * .35;
        if (sp.material) sp.material.opacity = base * veilBoost;
    }
    moonSprite.material.opacity = .94 - m * .1;
    const out = document.getElementById("mistOut");
    if (out) out.textContent = m < .2 ? "Thin veil" : m < .55 ? "Drifting" : m < .82 ? "Thick haze" : "Dense drift";
}

function applyLanternLevels() {
    const h = document.getElementById("hangGlow");
    const s = document.getElementById("standGlow");
    if (h) {
        h.style.setProperty("--fill", `${state.hanging / 2 * 100}%`);
        document.getElementById("hangOut").textContent = `${Math.round(state.hanging * 100)}%`;
    }
    if (s) {
        s.style.setProperty("--fill", `${state.standing / 2 * 100}%`);
        document.getElementById("standOut").textContent = `${Math.round(state.standing * 100)}%`;
    }
    const m = document.getElementById("mist");
    if (m) m.style.setProperty("--fill", `${state.mist * 100}%`);
}

function updateLanterns(time) {
    for (const rec of lanterns) {
        const typeLevel = rec.kind === "standing" ? state.standing : state.hanging;
        const flicker = .955 + Math.sin(time * 2.13 + rec.phase) * .036 + Math.sin(time * 6.7 + rec.phase * 1.91) * .012;
        const effective = Math.max(0, typeLevel * rec.boost * flicker);
        rec.lights.forEach(l => {
            l.light.intensity = l.base * effective;
        });
        rec.materials.forEach(m => {
            if (rec.kind === "standing") {
                m.color.setRGB(.96 * effective, .62 * effective, .33 * effective);
            } else {
                m.emissiveIntensity = rec.baseEmissive * (.15 + .85 * effective);
            }
        });
        rec.halo.material.opacity = rec.haloBase * Math.min(1.65, .2 + effective * .86);
        for (const ref of rec.reflections) {
            ref.mat.opacity = ref.baseOpacity * Math.min(1.8, .12 + effective);
            ref.poolMat.opacity = ref.baseOpacity * .4 * Math.min(1.8, .12 + effective);
        }
    }
}

function animateAtmosphere(time, dt) {
    const m = state.mist;
    for (const sp of mistSprites) {
        if (!sp.userData.baseX) continue;
        const phase = sp.userData.phase || 0;
        const drift = sp.userData.drift || 1;
        const speed = sp.userData.speed || .035;
        sp.position.x = sp.userData.baseX + Math.sin(time * speed + phase) * 2.6 * drift + Math.sin(time * .13 + phase) * 1.6;
        sp.position.y = sp.userData.baseY + Math.sin(time * .17 + phase * 1.7) * .22;
        if (!sp.userData.isStaticMist) {
            const pulse = .94 + Math.sin(time * .24 + phase) * .06;
            sp.material.opacity = sp.userData.baseOpacity * (.28 + m * 1.75) * pulse;
        }
    }
    for (const sp of cloudSprites) {
        const phase = sp.userData.phase || 0;
        const drift = sp.userData.drift || .05;
        sp.position.x = sp.userData.baseX + Math.sin(time * .0075 + phase) * 9.5 * drift;
        sp.position.y = sp.userData.baseY + Math.sin(time * .012 + phase * 1.2) * 1.8;
    }
    if (moonSprite) {
        const p = 1 + Math.sin(time * .08) * .008;
        moonSprite.scale.set(34 * p, 34 * p, 1);
    }
}

let toastTimer = 0;

function showToast(text) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1900);
}

const hangGlow = document.getElementById("hangGlow");

const standGlow = document.getElementById("standGlow");

const mistInput = document.getElementById("mist");

hangGlow.addEventListener("input", () => {
    state.hanging = Number(hangGlow.value) / 100;
    applyLanternLevels();
});

standGlow.addEventListener("input", () => {
    state.standing = Number(standGlow.value) / 100;
    applyLanternLevels();
});

mistInput.addEventListener("input", () => {
    applyMist(Number(mistInput.value) / 100);
    applyLanternLevels();
});

document.getElementById("resetView").addEventListener("click", () => {
    camera.position.copy(CAM_START);
    controls.target.copy(CAM_TARGET);
    controls.update();
    showToast("View restored");
});

function renderFresh() {
    renderer.info.reset();
    composer.render();
}

function canvasDataURL() {
    renderFresh();
    return renderer.domElement.toDataURL("image/png");
}

document.getElementById("saveImage").addEventListener("click", () => {
    const url = canvasDataURL();
    const a = document.createElement("a");
    a.download = "moonlit-pagoda.png";
    a.href = url;
    a.click();
    showToast("Still captured · 1536 × 1024");
});

window.addEventListener("keydown", e => {
    if (e.key === "h" || e.key === "H") {
        state.uiHidden = !state.uiHidden;
        stage.classList.toggle("ui-hidden", state.uiHidden);
    }
});

const raycaster = new THREE.Raycaster;

const pointer = new THREE.Vector2;

let pointerDownAt = null;

function updatePointer(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = (e.clientX - rect.left) / rect.width * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
}

function pickLantern() {
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickables, false);
    if (!hits.length) return null;
    return hits[0].object.userData.lanternRecord || null;
}

renderer.domElement.addEventListener("pointermove", e => {
    updatePointer(e);
    const rec = pickLantern();
    renderer.domElement.style.cursor = rec ? "pointer" : "";
});

renderer.domElement.addEventListener("pointerdown", e => {
    pointerDownAt = {
        x: e.clientX,
        y: e.clientY
    };
});

renderer.domElement.addEventListener("pointerup", e => {
    if (!pointerDownAt) return;
    const move = Math.hypot(e.clientX - pointerDownAt.x, e.clientY - pointerDownAt.y);
    pointerDownAt = null;
    if (move > 5) return;
    updatePointer(e);
    const rec = pickLantern();
    if (!rec) return;
    const levels = [ 1, 1.55, .35 ];
    const next = levels[(levels.indexOf(rec.boost) + 1) % levels.length] ?? 1.55;
    rec.boost = next;
    const label = next > 1.2 ? "brighter" : next < .6 ? "dimmed" : "restored";
    showToast(`${rec.label} · ${label}`);
});

function onResize() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    bloomPass.setSize(w * dpr, h * dpr);
    gradePass.uniforms.uResolution.value.set(w * dpr, h * dpr);
    if (moonSprite) {
        const d = moonSprite.position.distanceTo(camera.position);
        const angular = 2 * Math.atan(17 / 245);
        const scale = 2 * d * Math.tan(angular / 2);
        moonSprite.scale.setScalar(scale);
    }
}

window.addEventListener("resize", onResize);

let sceneStats = null;

function gatherSceneStats() {
    let meshes = 0, instanced = 0, triangles = 0, lines = 0;
    const seen = new Set;
    scene.traverse(o => {
        if (!o.isMesh && !o.isLine) return;
        if (o.isMesh) meshes++;
        if (o.isInstancedMesh) instanced += o.count;
        if (o.geometry && !seen.has(o.geometry.uuid)) {
            seen.add(o.geometry.uuid);
            if (o.geometry.index) triangles += o.geometry.index.count / 3; else if (o.geometry.attributes.position) triangles += o.geometry.attributes.position.count / 3;
        }
        if (o.isInstancedMesh && o.geometry) {
            const base = o.geometry.index ? o.geometry.index.count / 3 : (o.geometry.attributes.position?.count || 0) / 3;
            triangles += base * (o.count - 1);
        }
    });
    return {
        meshes: meshes,
        instancedMeshes: instanced,
        sceneTriangles: Math.round(triangles),
        uniqueGeometries: seen.size
    };
}

function getDiagnostics() {
    const gl = renderer.getContext();
    return {
        application: "Moonlit Pagoda — editable Three.js scene",
        threeRevision: THREE.REVISION,
        webglVersion: gl.getParameter(gl.VERSION),
        renderer: gl.getParameter(gl.RENDERER),
        vendor: gl.getParameter(gl.VENDOR),
        canvas: {
            width: renderer.domElement.width,
            height: renderer.domElement.height,
            cssWidth: renderer.domElement.clientWidth,
            cssHeight: renderer.domElement.clientHeight,
            aspect: +(renderer.domElement.width / renderer.domElement.height).toFixed(4),
            pixelRatio: renderer.getPixelRatio()
        },
        camera: {
            position: camera.position.toArray().map(v => +v.toFixed(3)),
            target: controls.target.toArray().map(v => +v.toFixed(3)),
            fov: camera.fov,
            near: camera.near,
            far: camera.far
        },
        controls: {
            enabled: controls.enabled,
            damping: controls.enableDamping,
            minDistance: controls.minDistance,
            maxDistance: controls.maxDistance
        },
        fogDensity: +scene.fog.density.toFixed(5),
        lanterns: lanterns.map(l => ({
            label: l.label,
            kind: l.kind,
            individualBoost: l.boost,
            brightness: l.kind === "standing" ? state.standing : state.hanging
        })),
        mist: {
            level: state.mist,
            label: document.getElementById("mistOut")?.textContent
        },
        performance: {
            fps: +state.fps.toFixed(1),
            framesRendered: state.frames,
            drawCallsLastFrame: renderer.info.render.calls,
            trianglesLastFrame: renderer.info.render.triangles,
            ...sceneStats || gatherSceneStats()
        },
        screenshot: {
            requestedAspect: "3:2",
            exportedBy: "canvasDataURL() / Save still button"
        }
    };
}

window.__TEMPLE__ = {
    version: "1.0.0",
    THREE: THREE,
    scene: scene,
    camera: camera,
    controls: controls,
    renderer: renderer,
    composer: composer,
    lanterns: lanterns,
    getDiagnostics: getDiagnostics,
    setLanterns(hanging, standing) {
        state.hanging = THREE.MathUtils.clamp(hanging, 0, 2);
        state.standing = THREE.MathUtils.clamp(standing, 0, 2);
        hangGlow.value = String(Math.round(state.hanging * 100));
        standGlow.value = String(Math.round(state.standing * 100));
        applyLanternLevels();
        updateLanterns(clock.elapsedTime);
    },
    setMist(value) {
        state.mist = THREE.MathUtils.clamp(value, 0, 1);
        mistInput.value = String(Math.round(state.mist * 100));
        applyMist(state.mist);
        applyLanternLevels();
    },
    setCamera(position, target) {
        camera.position.fromArray(position);
        if (target) controls.target.fromArray(target);
        controls.update();
    },
    resetCamera() {
        camera.position.copy(CAM_START);
        controls.target.copy(CAM_TARGET);
        controls.update();
    },
    canvasDataURL: canvasDataURL,
    captureStill() {
        return canvasDataURL();
    },
    exportPNG() {
        return canvasDataURL();
    },
    setPaused(paused) {
        state.paused = !!paused;
    }
};

applyMist(state.mist);

applyLanternLevels();

sceneStats = gatherSceneStats();

onResize();

controls.update();

let firstFrameDone = false;

const startTime = performance.now();

function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), .05);
    if (!state.paused) state.time += dt;
    const t = state.time;
    updateLanterns(t);
    animateAtmosphere(t, dt);
    controls.update();
    gradePass.uniforms.uTime.value = t;
    skyDome.position.copy(camera.position);
    renderer.info.reset();
    composer.render();
    state.frames++;
    const now = performance.now();
    if (now - state.fpsWindowStart > 600) {
        state.fps = state.frames / ((now - startTime) / 1e3);
        state.fpsWindowStart = now;
    }
    if (!firstFrameDone) {
        firstFrameDone = true;
        renderer.shadowMap.autoUpdate = false;
        setTimeout(() => {
            const loader = document.getElementById("loader");
            if (loader) loader.classList.add("out");
            window.__TEMPLE_READY__ = true;
            window.__TEMPLE__.readyAt = (new Date).toISOString();
        }, 450);
    }
}

animate();
