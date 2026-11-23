import * as THREE from "three";

import { createMoonPosterCanvas, createSmallPosterCanvas, createBrochureCoverAtlas, createBrochureSpreadAtlas, createGlobeCanvas, createGlobeBumpCanvas, SMALL_POSTERS, mulberry32 } from "./art.js";

const TAU = Math.PI * 2;

function canvasTex(canvas, {colorSpace: colorSpace = THREE.SRGBColorSpace, wrap: wrap = THREE.ClampToEdgeWrapping, repeat: repeat = null, anisotropy: anisotropy = 8, filter: filter = THREE.LinearFilter} = {}) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = colorSpace;
    tex.wrapS = wrap;
    tex.wrapT = wrap;
    if (repeat) tex.repeat.set(repeat[0], repeat[1]);
    tex.anisotropy = anisotropy;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = filter;
    tex.needsUpdate = true;
    return tex;
}

export function cloneTexture(tex, repeat, rotation = 0) {
    const t = tex.clone();
    t.needsUpdate = true;
    if (repeat) t.repeat.set(repeat[0], repeat[1]);
    if (rotation) {
        t.center.set(.5, .5);
        t.rotation = rotation;
    }
    return t;
}

export function makeWoodTexture(w = 1024, h = 1024, seed = 37) {
    const color = document.createElement("canvas");
    color.width = w;
    color.height = h;
    const ctx = color.getContext("2d");
    const bump = document.createElement("canvas");
    bump.width = Math.round(w / 2);
    bump.height = Math.round(h / 2);
    const bctx = bump.getContext("2d");
    bctx.scale(.5, .5);
    const rand = mulberry32(seed);
    const base = ctx.createLinearGradient(0, 0, w, 0);
    base.addColorStop(0, "#2b180f");
    base.addColorStop(.22, "#412619");
    base.addColorStop(.5, "#513121");
    base.addColorStop(.76, "#362016");
    base.addColorStop(1, "#24140e");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    bctx.fillStyle = "#858585";
    bctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 44; i++) {
        const x0 = rand() * w;
        const ww = 2 + rand() * 42;
        const alpha = .018 + rand() * .055;
        ctx.strokeStyle = rand() > .46 ? `rgba(199,144,89,${alpha})` : `rgba(8,5,3,${alpha * 1.8})`;
        ctx.lineWidth = ww;
        ctx.beginPath();
        ctx.moveTo(x0, -20);
        for (let y = 0; y <= h + 20; y += 26) {
            const x = x0 + Math.sin(y * .006 + i) * 6 + (rand() - .5) * 3;
            ctx.lineTo(x, y);
        }
        ctx.stroke();
        bctx.strokeStyle = rand() > .46 ? `rgba(255,255,255,${alpha * 2.4})` : `rgba(0,0,0,${alpha * 3.2})`;
        bctx.lineWidth = ww;
        bctx.beginPath();
        bctx.moveTo(x0, -20);
        for (let y = 0; y <= h + 20; y += 26) {
            const x = x0 + Math.sin(y * .006 + i) * 6;
            bctx.lineTo(x, y);
        }
        bctx.stroke();
    }
    for (let i = 0; i < 430; i++) {
        const x0 = rand() * w;
        const drift = 2 + rand() * 14;
        const alpha = .025 + rand() * .12;
        const isLight = rand() > .62;
        ctx.strokeStyle = isLight ? `rgba(198,148,93,${alpha})` : `rgba(10,6,3,${alpha})`;
        ctx.lineWidth = .4 + rand() * 1.7;
        ctx.beginPath();
        ctx.moveTo(x0, -10);
        for (let y = 0; y <= h + 10; y += 32 + rand() * 45) {
            ctx.lineTo(x0 + Math.sin(y * (.002 + rand() * .003) + i) * drift + (rand() - .5) * 1.5, y);
        }
        ctx.stroke();
        bctx.strokeStyle = isLight ? `rgba(255,255,255,${alpha * .9})` : `rgba(0,0,0,${alpha * 1.6})`;
        bctx.lineWidth = .4 + rand() * 1.8;
        bctx.beginPath();
        bctx.moveTo(x0, -10);
        for (let y = 0; y <= h + 10; y += 30) {
            bctx.lineTo(x0 + Math.sin(y * .004 + i) * drift, y);
        }
        bctx.stroke();
    }
    for (let k = 0; k < 4; k++) {
        const kx = w * (.1 + rand() * .8), ky = h * (.15 + rand() * .7);
        const kr = 10 + rand() * 32;
        for (let i = 0; i < 9; i++) {
            ctx.strokeStyle = `rgba(${i % 3 ? "12,7,4" : "151,97,55"},${.12 + rand() * .13})`;
            ctx.lineWidth = .8 + rand() * 1.5;
            ctx.beginPath();
            ctx.ellipse(kx + (rand() - .5) * 9, ky, kr * (1 - i * .075), kr * (1.5 - i * .11), .2, 0, TAU);
            ctx.stroke();
            bctx.strokeStyle = `rgba(${i % 2 ? "0,0,0" : "255,255,255"},${.1 + rand() * .15})`;
            bctx.beginPath();
            bctx.ellipse(kx, ky, kr * (1 - i * .075), kr * (1.5 - i * .11), .2, 0, TAU);
            bctx.stroke();
        }
    }
    for (let i = 0; i < 1250; i++) {
        const x = rand() * w, y = rand() * h;
        const len = 2 + rand() * 25;
        ctx.strokeStyle = `rgba(15,9,5,${.05 + rand() * .15})`;
        ctx.lineWidth = .5 + rand() * .8;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + len);
        ctx.stroke();
    }
    for (let i = 0; i < 16; i++) {
        const x = rand() * w, y = rand() * h;
        ctx.strokeStyle = `rgba(203,163,113,${.06 + rand() * .12})`;
        ctx.lineWidth = .5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + 15 + rand() * 25, y + 2, x + 35 + rand() * 40, y + (rand() - .5) * 5);
        ctx.stroke();
    }
    const sheen = ctx.createLinearGradient(0, 0, 0, h);
    sheen.addColorStop(0, "rgba(255,210,150,0.035)");
    sheen.addColorStop(.5, "rgba(255,210,150,0)");
    sheen.addColorStop(1, "rgba(0,0,0,0.09)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, w, h);
    return {
        colorCanvas: color,
        bumpCanvas: bump,
        color: canvasTex(color, {
            wrap: THREE.RepeatWrapping
        }),
        bump: canvasTex(bump, {
            colorSpace: THREE.NoColorSpace,
            wrap: THREE.RepeatWrapping
        })
    };
}

export function makeStoneTexture(w = 1024, h = 1536, seed = 73) {
    const rand = mulberry32(seed);
    const color = document.createElement("canvas");
    color.width = w;
    color.height = h;
    const ctx = color.getContext("2d");
    const bump = document.createElement("canvas");
    bump.width = w;
    bump.height = h;
    const bctx = bump.getContext("2d");
    ctx.fillStyle = "#8f8a7e";
    ctx.fillRect(0, 0, w, h);
    bctx.fillStyle = "#303030";
    bctx.fillRect(0, 0, w, h);
    const rows = 8;
    const rowH = h / rows;
    for (let row = 0; row < rows; row++) {
        const y = row * rowH;
        let x = -rand() * w * .25;
        while (x < w) {
            const bw = w * (.2 + rand() * .27);
            const inset = 2.5;
            const g = ctx.createLinearGradient(x, y, x + bw, y + rowH);
            const tone = 122 + Math.floor(rand() * 40);
            g.addColorStop(0, `rgb(${tone + 8},${tone + 5},${tone - 3})`);
            g.addColorStop(.5, `rgb(${tone},${tone - 2},${tone - 9})`);
            g.addColorStop(1, `rgb(${tone - 14},${tone - 15},${tone - 19})`);
            ctx.fillStyle = g;
            ctx.fillRect(x + inset, y + inset, bw - inset * 2, rowH - inset * 2);
            bctx.fillStyle = `rgb(${tone + 26},${tone + 26},${tone + 26})`;
            bctx.fillRect(x + inset, y + inset, bw - inset * 2, rowH - inset * 2);
            for (let i = 0; i < 42; i++) {
                const px = x + rand() * bw, py = y + rand() * rowH;
                const rr = 1 + rand() * (w * .022);
                const dark = rand() > .52;
                ctx.fillStyle = dark ? `rgba(47,47,42,${.015 + rand() * .06})` : `rgba(228,220,200,${.012 + rand() * .05})`;
                ctx.beginPath();
                ctx.ellipse(px, py, rr, rr * (.5 + rand() * .8), rand() * TAU, 0, TAU);
                ctx.fill();
                bctx.fillStyle = dark ? `rgba(0,0,0,${.07 + rand() * .08})` : `rgba(255,255,255,${.05 + rand() * .08})`;
                bctx.beginPath();
                bctx.ellipse(px, py, rr, rr * (.5 + rand() * .8), rand() * TAU, 0, TAU);
                bctx.fill();
            }
            for (let i = 0; i < 22; i++) {
                const px = x + rand() * bw, py = y + rand() * rowH;
                ctx.fillStyle = `rgba(36,35,31,${.08 + rand() * .18})`;
                ctx.beginPath();
                ctx.arc(px, py, .5 + rand() * 3.4, 0, TAU);
                ctx.fill();
            }
            ctx.strokeStyle = "rgba(49,47,42,0.17)";
            ctx.lineWidth = 1;
            for (let i = 0; i < 8; i++) {
                const px = x + rand() * bw, py = y + inset + 2;
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(px + 5 + rand() * 14, py + 3 + rand() * 4);
                ctx.stroke();
            }
            if (rand() > .5) {
                const sg = ctx.createLinearGradient(0, y + rowH * .55, 0, y + rowH - inset);
                sg.addColorStop(0, "rgba(44,47,39,0)");
                sg.addColorStop(1, `rgba(44,47,39,${.05 + rand() * .08})`);
                ctx.fillStyle = sg;
                ctx.fillRect(x + inset, y + rowH * .55, bw - inset * 2, rowH * .45 - inset);
            }
            x += bw;
        }
    }
    for (let i = 0; i < 24; i++) {
        ctx.strokeStyle = `rgba(44,42,36,${.12 + rand() * .16})`;
        ctx.lineWidth = .5 + rand() * 1.2;
        const x = rand() * w, y = rand() * h;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rand() - .5) * 18, y + 12 + rand() * 35);
        ctx.lineTo(x + (rand() - .5) * 28, y + 38 + rand() * 48);
        ctx.stroke();
    }
    const wash = ctx.createLinearGradient(0, 0, 0, h);
    wash.addColorStop(0, "rgba(188,180,162,0.11)");
    wash.addColorStop(.45, "rgba(75,78,69,0.02)");
    wash.addColorStop(1, "rgba(36,40,35,0.18)");
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 4800; i++) {
        ctx.fillStyle = `rgba(${rand() > .5 ? "230,225,207" : "38,37,32"},${.015 + rand() * .055})`;
        ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 2.5, 1 + rand() * 2.5);
    }
    for (let i = 0; i < 90; i++) {
        const y = h * (.55 + rand() * .45);
        ctx.fillStyle = `rgba(${rand() > .5 ? "103,108,79" : "129,124,94"},${.015 + rand() * .04})`;
        ctx.beginPath();
        ctx.arc(rand() * w, y, 1 + rand() * 5, 0, TAU);
        ctx.fill();
    }
    return {
        canvas: color,
        bumpCanvas: bump,
        map: canvasTex(color, {
            wrap: THREE.RepeatWrapping
        }),
        bump: canvasTex(bump, {
            colorSpace: THREE.NoColorSpace,
            wrap: THREE.RepeatWrapping
        })
    };
}

export function makePavementTexture(w = 1536, h = 1536, seed = 53) {
    const rand = mulberry32(seed);
    const color = document.createElement("canvas");
    color.width = w;
    color.height = h;
    const ctx = color.getContext("2d");
    const bump = document.createElement("canvas");
    bump.width = w;
    bump.height = h;
    const bctx = bump.getContext("2d");
    ctx.fillStyle = "#5d5750";
    ctx.fillRect(0, 0, w, h);
    bctx.fillStyle = "#202020";
    bctx.fillRect(0, 0, w, h);
    const rows = 5;
    const rowH = h / rows;
    for (let r = 0; r < rows; r++) {
        let x = r % 2 ? -w * .12 : 0;
        while (x < w) {
            const bw = w * (.22 + rand() * .23);
            const y = r * rowH;
            const t = 70 + Math.floor(rand() * 34);
            const g = ctx.createLinearGradient(x, y, x + bw * .8, y + rowH);
            g.addColorStop(0, `rgb(${t + 16},${t + 10},${t + 3})`);
            g.addColorStop(.6, `rgb(${t + 1},${t - 2},${t - 7})`);
            g.addColorStop(1, `rgb(${t - 11},${t - 12},${t - 13})`);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(x + 4, y + 4);
            ctx.lineTo(x + bw - 5, y + 3 + rand() * 2);
            ctx.lineTo(x + bw - 4, y + rowH - 4);
            ctx.lineTo(x + 5, y + rowH - 5 - rand() * 2);
            ctx.closePath();
            ctx.fill();
            bctx.fillStyle = `rgb(${t + 55},${t + 55},${t + 55})`;
            bctx.fillRect(x + 6, y + 6, bw - 12, rowH - 12);
            for (let i = 0; i < 65; i++) {
                const px = x + rand() * bw, py = y + rand() * rowH;
                const rr = .5 + rand() * 3;
                ctx.fillStyle = rand() > .52 ? `rgba(27,27,24,${.03 + rand() * .12})` : `rgba(220,210,190,${.02 + rand() * .08})`;
                ctx.beginPath();
                ctx.arc(px, py, rr, 0, TAU);
                ctx.fill();
            }
            if (rand() > .45) {
                const sg = ctx.createRadialGradient(x + bw * rand(), y + rowH * rand(), 0, x + bw * .4, y + rowH * .5, bw * .5);
                sg.addColorStop(0, `rgba(39,41,34,${.03 + rand() * .07})`);
                sg.addColorStop(1, "rgba(39,41,34,0)");
                ctx.fillStyle = sg;
                ctx.fillRect(x, y, bw, rowH);
            }
            if (rand() > .77) {
                ctx.strokeStyle = "rgba(37,36,31,0.26)";
                ctx.lineWidth = .7;
                const cx = x + rand() * bw, cy = y + rand() * rowH;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                for (let s = 0; s < 4; s++) ctx.lineTo(cx + (rand() - .5) * 24, cy + rand() * 34);
                ctx.stroke();
            }
            x += bw;
        }
    }
    for (let i = 0; i < 900; i++) {
        ctx.fillStyle = `rgba(${rand() > .45 ? "31,30,27" : "179,169,148"},${.01 + rand() * .06})`;
        ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 4, 1 + rand() * 4);
    }
    for (let i = 0; i < 22; i++) {
        const x = rand() * w, y = rand() * h, rr = 4 + rand() * 17;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rand() * TAU);
        ctx.fillStyle = `rgba(${90 + rand() * 30},${62 + rand() * 25},${38 + rand() * 15},${.25 + rand() * .2})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, rr, rr * .38, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
    }
    ctx.strokeStyle = "rgba(35,34,29,0.13)";
    for (let i = 0; i < 70; i++) {
        ctx.lineWidth = .5 + rand();
        const x = rand() * w, y = rand() * h;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 3 + rand() * 22, y + (rand() - .5) * 3);
        ctx.stroke();
    }
    return {
        map: canvasTex(color, {
            wrap: THREE.RepeatWrapping
        }),
        bump: canvasTex(bump, {
            colorSpace: THREE.NoColorSpace,
            wrap: THREE.RepeatWrapping
        }),
        canvas: color
    };
}

export function makeNavyBoardTexture(w = 1536, h = 1024, seed = 311) {
    const rand = mulberry32(seed);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    const bump = document.createElement("canvas");
    bump.width = w;
    bump.height = h;
    const bctx = bump.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, w * .65, h);
    g.addColorStop(0, "#10283b");
    g.addColorStop(.45, "#0d2133");
    g.addColorStop(1, "#091925");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    bctx.fillStyle = "#7f7f7f";
    bctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2200; i++) {
        const x = rand() * w, y = rand() * h;
        ctx.fillStyle = `rgba(${rand() > .5 ? "84,113,126" : "3,10,15"},${.012 + rand() * .035})`;
        ctx.fillRect(x, y, 1 + rand() * 6, 1);
        ctx.fillStyle = `rgba(${rand() > .5 ? "89,116,126" : "4,10,15"},${.008 + rand() * .024})`;
        ctx.fillRect(x, y, 1, 1 + rand() * 4);
    }
    for (let i = 0; i < 13; i++) {
        const x = rand() * w;
        const lg = ctx.createLinearGradient(x - 70, 0, x + 70, 0);
        lg.addColorStop(0, "rgba(123,143,145,0)");
        lg.addColorStop(.5, `rgba(123,143,145,${.008 + rand() * .016})`);
        lg.addColorStop(1, "rgba(123,143,145,0)");
        ctx.fillStyle = lg;
        ctx.fillRect(x - 70, 0, 140, h);
    }
    ctx.strokeStyle = "rgba(3,11,17,0.45)";
    ctx.lineWidth = 2;
    for (let i = 1; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(w / 3 * i, 0);
        ctx.lineTo(w / 3 * i, h);
        ctx.stroke();
    }
    for (let i = 0; i < 60; i++) {
        ctx.strokeStyle = `rgba(145,143,121,${.01 + rand() * .035})`;
        ctx.lineWidth = .5 + rand();
        const x = rand() * w, y = h * (.82 + rand() * .18);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rand() - .5) * 30, y + (rand() - .5) * 3);
        ctx.stroke();
    }
    const v = ctx.createRadialGradient(w * .46, h * .42, 0, w * .46, h * .42, Math.max(w, h) * .8);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(1,5,8,0.38)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
    return {
        map: canvasTex(canvas),
        bump: canvasTex(bump, {
            colorSpace: THREE.NoColorSpace
        }),
        canvas: canvas
    };
}

export function makeWallpaperTexture(w = 1024, h = 1024, seed = 841) {
    const rand = mulberry32(seed);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#263936";
    ctx.fillRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(148,145,112,0.12)");
    g.addColorStop(.5, "rgba(20,33,31,0.05)");
    g.addColorStop(1, "rgba(7,15,14,0.2)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) {
        ctx.fillStyle = x % 32 ? "rgba(129,134,103,0.028)" : "rgba(7,19,17,0.055)";
        ctx.fillRect(x, 0, x % 32 ? 8 : 10, h);
    }
    const cols = 4, rows = 4;
    for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
            const cx = (i + .5) * (w / cols);
            const cy = (j + .5) * (h / rows);
            ctx.save();
            ctx.translate(cx, cy);
            ctx.strokeStyle = "rgba(176,164,129,0.065)";
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(0, 42);
            ctx.bezierCurveTo(-20, 12, -13, -29, 0, -48);
            ctx.bezierCurveTo(13, -29, 20, 12, 0, 42);
            ctx.stroke();
            for (let k = 0; k < 5; k++) {
                const a = -1.2 + k * .6;
                ctx.beginPath();
                ctx.ellipse(Math.cos(a) * 13, Math.sin(a) * 22, 3.6, 11, a, 0, TAU);
                ctx.stroke();
            }
            ctx.restore();
        }
    }
    for (let i = 0; i < 650; i++) {
        ctx.fillStyle = `rgba(${rand() > .5 ? "112,111,84" : "7,17,15"},${.01 + rand() * .035})`;
        ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 3, 1 + rand() * 3);
    }
    const v = ctx.createRadialGradient(w * .5, h * .44, 0, w * .5, h * .44, w * .7);
    v.addColorStop(0, "rgba(24,33,29,0)");
    v.addColorStop(1, "rgba(5,11,10,0.38)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
    return canvasTex(canvas, {
        wrap: THREE.RepeatWrapping
    });
}

function drawSpacedText(ctx, text, x, y, font, color, tracking, align = "center") {
    ctx.save();
    ctx.font = font;
    const chars = Array.from(text);
    const ws = chars.map(c => ctx.measureText(c).width);
    const total = ws.reduce((a, b) => a + b, 0) + tracking * (chars.length - 1);
    let cx = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
    ctx.fillStyle = color;
    ctx.textAlign = "left";
    for (let i = 0; i < chars.length; i++) {
        ctx.fillText(chars[i], cx, y);
        cx += ws[i] + tracking;
    }
    ctx.restore();
}

function drawTextOnArc(ctx, text, cx, cy, radius, startAngle, endAngle, font, color) {
    ctx.save();
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const chars = Array.from(text);
    const widths = chars.map(c => ctx.measureText(c).width);
    const tracking = radius * .023;
    const total = widths.reduce((a, b) => a + b, 0) + tracking * (chars.length - 1);
    const span = endAngle - startAngle;
    const scale = Math.min(1, span * radius / total);
    let a = startAngle + (span - total * scale / radius) * .5;
    for (let i = 0; i < chars.length; i++) {
        const charAngle = widths[i] / 2 * scale / radius;
        a += charAngle;
        ctx.save();
        ctx.translate(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
        ctx.rotate(a + Math.PI / 2);
        ctx.fillText(chars[i], 0, 0);
        ctx.restore();
        a += (widths[i] / 2 + tracking) * scale / radius;
    }
    ctx.restore();
}

export function makeDoorDecalCanvas(w = 1024, h = 2048) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, w, h);
    const ink = "rgba(229,218,190,0.88)";
    const dim = "rgba(221,209,182,0.68)";
    drawTextOnArc(ctx, "AGENCE DE VOYAGES", w * .5, h * .26, w * .29, Math.PI * 1.22, Math.PI * 1.78, `500 ${Math.round(w * .048)}px "Italiana", "Cormorant Garamond", serif`, ink);
    ctx.strokeStyle = "rgba(225,213,185,0.38)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.arc(w * .5, h * .26, w * (.345 + i * .017), Math.PI * 1.24, Math.PI * 1.76);
        ctx.stroke();
    }
    const cx = w * .5, cy = h * .405, r = w * .135;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = "rgba(225,213,185,0.52)";
    ctx.fillStyle = "rgba(225,213,185,0.15)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r * .7, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.02, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < 64; i++) {
        const a = i / 64 * TAU;
        const r1 = r * 1.04, r2 = r * (i % 4 === 0 ? 1.13 : 1.08);
        ctx.strokeStyle = "rgba(225,213,185,0.34)";
        ctx.lineWidth = i % 4 === 0 ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
        ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
        ctx.stroke();
    }
    for (let i = 0; i < 16; i++) {
        const a = i / 16 * TAU - Math.PI / 2;
        const len = r * (i % 2 === 0 ? 1 : .62);
        const half = r * (i % 2 === 0 ? .13 : .08);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a - .5) * half, Math.sin(a - .5) * half);
        ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
        ctx.lineTo(Math.cos(a + .5) * half, Math.sin(a + .5) * half);
        ctx.closePath();
        ctx.fillStyle = i % 2 ? "rgba(229,218,190,0.06)" : "rgba(229,218,190,0.22)";
        ctx.fill();
        ctx.strokeStyle = "rgba(229,218,190,0.58)";
        ctx.lineWidth = 1.2;
        ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, r * .075, 0, TAU);
    ctx.fillStyle = "rgba(229,218,190,0.62)";
    ctx.fill();
    ctx.fillStyle = "rgba(229,218,190,0.66)";
    ctx.font = `500 ${Math.round(w * .032)}px "Cormorant Garamond", serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("N", 0, -r * 1.22);
    ctx.fillText("E", r * 1.22, 0);
    ctx.fillText("S", 0, r * 1.23);
    ctx.fillText("O", -r * 1.22, 0);
    ctx.restore();
    const lines = [ "SÉJOURS", "CIRCUITS", "CROISIÈRES", "WEEK-END", "SUR MESURE" ];
    ctx.textAlign = "center";
    ctx.fillStyle = ink;
    ctx.font = `500 ${Math.round(w * .042)}px "Cormorant Garamond", serif`;
    let y = h * .57;
    for (let i = 0; i < lines.length; i++) {
        drawSpacedText(ctx, lines[i], w * .5, y, `500 ${Math.round(w * .042)}px "Cormorant Garamond", serif`, ink, w * .012);
        if (i < lines.length - 1) {
            ctx.strokeStyle = "rgba(229,218,190,0.24)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(w * .3, y + h * .025);
            ctx.lineTo(w * .7, y + h * .025);
            ctx.stroke();
        }
        y += h * .055;
    }
    ctx.strokeStyle = "rgba(229,218,190,0.3)";
    ctx.beginPath();
    ctx.moveTo(w * .34, h * .87);
    ctx.lineTo(w * .66, h * .87);
    ctx.stroke();
    ctx.fillStyle = dim;
    ctx.font = `italic 500 ${Math.round(w * .028)}px "Cormorant Garamond", serif`;
    ctx.fillText("Conseils de voyage depuis 1926", w * .5, h * .905);
    const rand = mulberry32(211);
    ctx.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 85; i++) {
        ctx.fillStyle = `rgba(0,0,0,${.025 + rand() * .06})`;
        ctx.beginPath();
        ctx.arc(rand() * w, rand() * h, 1 + rand() * 5, 0, TAU);
        ctx.fill();
    }
    return canvas;
}

export function makePlaqueCanvas(w = 640, h = 1280) {
    const rand = mulberry32(701);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#171f1a");
    g.addColorStop(.45, "#0e1512");
    g.addColorStop(1, "#1b211b");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 950; i++) {
        ctx.fillStyle = `rgba(${rand() > .55 ? "130,122,90" : "4,8,6"},${.01 + rand() * .055})`;
        ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 2.5, 1 + rand() * 6);
    }
    const edge = ctx.createRadialGradient(w * .5, h * .48, w * .2, w * .5, h * .5, h * .68);
    edge.addColorStop(0, "rgba(64,91,69,0)");
    edge.addColorStop(.8, "rgba(70,94,70,0.09)");
    edge.addColorStop(1, "rgba(91,115,82,0.21)");
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(189,176,136,0.31)";
    ctx.lineWidth = 3;
    ctx.strokeRect(w * .08, h * .045, w * .84, h * .91);
    ctx.strokeStyle = "rgba(189,176,136,0.17)";
    ctx.lineWidth = 1;
    ctx.strokeRect(w * .105, h * .062, w * .79, h * .876);
    const amber = "rgba(210,194,151,0.82)";
    ctx.textAlign = "center";
    drawSpacedText(ctx, "SERVICES", w * .5, h * .17, `500 ${Math.round(w * .073)}px "Cormorant Garamond", serif`, amber, w * .025);
    ctx.strokeStyle = "rgba(210,194,151,0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * .31, h * .195);
    ctx.lineTo(w * .69, h * .195);
    ctx.stroke();
    const lines = [ "CONSEILS", "RÉSERVATIONS", "BILLETS", "VOYAGES", "SUR MESURE" ];
    const font = `500 ${Math.round(w * .06)}px "Cormorant Garamond", serif`;
    let y = h * .29;
    lines.forEach((line, i) => {
        drawSpacedText(ctx, line, w * .5, y, font, "rgba(206,193,156,0.72)", w * .018);
        if (i < lines.length - 1) {
            ctx.strokeStyle = "rgba(182,171,137,0.17)";
            ctx.beginPath();
            ctx.moveTo(w * .22, y + h * .037);
            ctx.lineTo(w * .78, y + h * .037);
            ctx.stroke();
        }
        y += h * .092;
    });
    ctx.strokeStyle = "rgba(206,193,156,0.45)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(w * .5, h * .8, w * .048, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(w * .5, h * .8);
        ctx.lineTo(w * .5 + Math.cos(a) * w * .08, h * .8 + Math.sin(a) * w * .08);
        ctx.stroke();
    }
    drawSpacedText(ctx, "AGENCE DE VOYAGES", w * .5, h * .9, `500 ${Math.round(w * .042)}px "Cormorant Garamond", serif`, "rgba(206,193,156,0.65)", w * .013);
    drawSpacedText(ctx, "PARIS  ·  1926", w * .5, h * .935, `500 ${Math.round(w * .032)}px "Cormorant Garamond", serif`, "rgba(206,193,156,0.45)", w * .02);
    for (let i = 0; i < 22; i++) {
        ctx.strokeStyle = `rgba(221,210,179,${.015 + rand() * .04})`;
        ctx.lineWidth = .5 + rand();
        const x = rand() * w, y = rand() * h;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + rand() * 30, y + (rand() - .5) * 5);
        ctx.stroke();
    }
    return canvas;
}

export function makeRackSignCanvas(w = 1024, h = 256) {
    const rand = mulberry32(517);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#152b3a");
    g.addColorStop(1, "#0b1c27");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 280; i++) {
        ctx.fillStyle = `rgba(${rand() > .55 ? "135,125,95" : "2,9,13"},${.012 + rand() * .05})`;
        ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 5, 1 + rand() * 2);
    }
    ctx.strokeStyle = "rgba(206,190,149,0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(w * .025, h * .11, w * .95, h * .78);
    ctx.strokeStyle = "rgba(206,190,149,0.16)";
    ctx.lineWidth = 1;
    ctx.strokeRect(w * .041, h * .16, w * .918, h * .68);
    drawSpacedText(ctx, "NOS PLUS BELLES DESTINATIONS", w * .5, h * .49, `500 ${Math.round(w * .045)}px "Cormorant Garamond", serif`, "rgba(224,207,167,0.93)", w * .009);
    drawSpacedText(ctx, "CARTES & CARNETS DE VOYAGE", w * .5, h * .65, `500 ${Math.round(w * .023)}px "Cormorant Garamond", serif`, "rgba(214,197,159,0.58)", w * .011);
    for (const x of [ w * .075, w * .925 ]) {
        ctx.save();
        ctx.translate(x, h * .47);
        ctx.strokeStyle = "rgba(213,196,157,0.4)";
        ctx.lineWidth = 1.3;
        for (let i = 0; i < 4; i++) {
            const a = i * Math.PI / 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * h * .065, Math.sin(a) * h * .16);
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(0, 0, h * .04, 0, TAU);
        ctx.stroke();
        ctx.restore();
    }
    return canvas;
}

export function makeClosedSignCanvas(w = 512, h = 512) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#e4d8bf";
    ctx.fillRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "rgba(255,247,224,0.4)");
    g.addColorStop(1, "rgba(119,101,73,0.18)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(64,61,48,0.55)";
    ctx.lineWidth = 4;
    ctx.strokeRect(w * .07, h * .07, w * .86, h * .86);
    drawSpacedText(ctx, "FERMÉ", w * .5, h * .48, `600 ${Math.round(w * .19)}px "Cormorant Garamond", serif`, "rgba(46,55,48,0.86)", w * .02);
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(60,67,55,0.65)";
    ctx.font = `italic 500 ${Math.round(w * .055)}px "Cormorant Garamond", serif`;
    ctx.fillText("De retour demain à dix heures", w * .5, h * .62);
    ctx.strokeStyle = "rgba(79,73,56,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * .31, h * .68);
    ctx.lineTo(w * .69, h * .68);
    ctx.stroke();
    ctx.fillStyle = "rgba(57,50,39,0.6)";
    ctx.beginPath();
    ctx.arc(w * .34, h * .12, w * .022, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(w * .66, h * .12, w * .022, 0, TAU);
    ctx.fill();
    return canvas;
}

export function makeGlobeLabelCanvas(w = 512, h = 128) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#d8c9aa";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(72,60,42,0.55)";
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    drawSpacedText(ctx, "MAPPEMONDE", w * .5, h * .52, `500 ${Math.round(w * .09)}px "Cormorant Garamond", serif`, "rgba(52,56,45,0.84)", w * .02);
    ctx.textAlign = "center";
    ctx.font = `500 ${Math.round(w * .042)}px "Cormorant Garamond", serif`;
    ctx.fillStyle = "rgba(65,67,52,0.6)";
    ctx.fillText("GÉOGRAPHIE ANCIENNE  ·  PARIS", w * .5, h * .72);
    return canvas;
}

export function makeGlassSmudgeCanvas(w = 1024, h = 1536, seed = 17) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    const rand = mulberry32(seed);
    ctx.clearRect(0, 0, w, h);
    for (const [x, y, rx, ry, a] of [ [ w * .26, h * .73, w * .22, h * .25, .1 ], [ w * .74, h * .88, w * .18, h * .16, .09 ], [ w * .52, h * .2, w * .3, h * .12, .045 ] ]) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
        g.addColorStop(0, `rgba(204,199,177,${a})`);
        g.addColorStop(.65, `rgba(177,174,157,${a * .4})`);
        g.addColorStop(1, "rgba(170,167,150,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - rx, y - ry, rx * 2, ry * 2);
    }
    for (let i = 0; i < 650; i++) {
        const x = rand() * w, y = rand() * h;
        const r = .4 + Math.pow(rand(), 2) * 2.6;
        const a = .04 + rand() * .35;
        ctx.fillStyle = rand() > .35 ? `rgba(209,204,187,${a})` : `rgba(52,53,48,${a * .8})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
    }
    for (let i = 0; i < 36; i++) {
        ctx.strokeStyle = `rgba(222,217,200,${.025 + rand() * .08})`;
        ctx.lineWidth = .4 + rand() * .8;
        const x = rand() * w, y = rand() * h;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + (rand() - .5) * 40, y + rand() * 50, x + (rand() - .5) * 35, y + 60 + rand() * 90);
        ctx.stroke();
    }
    for (let i = 0; i < 10; i++) {
        const x = rand() * w, y = rand() * h * .8;
        const r = 4 + rand() * 12;
        ctx.strokeStyle = `rgba(224,218,201,${.04 + rand() * .1})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = "rgba(228,220,205,0.05)";
        ctx.beginPath();
        ctx.arc(x, y, r * .7, 0, TAU);
        ctx.fill();
    }
    const smear = ctx.createRadialGradient(w * .46, h * .42, 0, w * .46, h * .42, w * .12);
    smear.addColorStop(0, "rgba(202,196,181,0.035)");
    smear.addColorStop(1, "rgba(202,196,181,0)");
    ctx.fillStyle = smear;
    ctx.fillRect(0, 0, w, h);
    return canvas;
}

export function makeGlassReflectionCanvas(w = 1024, h = 1536) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, w, h);
    const lx = w * .245, ly = h * .17;
    const halo = ctx.createRadialGradient(lx, ly, 0, lx, ly, w * .15);
    halo.addColorStop(0, "rgba(255,196,103,0.52)");
    halo.addColorStop(.06, "rgba(255,190,96,0.32)");
    halo.addColorStop(.28, "rgba(255,172,76,0.075)");
    halo.addColorStop(1, "rgba(255,160,62,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,222,154,0.64)";
    ctx.beginPath();
    ctx.arc(lx, ly, w * .016, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(14,19,21,0.11)";
    ctx.beginPath();
    ctx.moveTo(lx - w * .036, ly - h * .03);
    ctx.lineTo(lx + w * .036, ly - h * .03);
    ctx.lineTo(lx + w * .026, ly + h * .022);
    ctx.lineTo(lx - w * .026, ly + h * .022);
    ctx.closePath();
    ctx.fill();
    const streak = ctx.createLinearGradient(lx - w * .02, 0, lx + w * .06, 0);
    streak.addColorStop(0, "rgba(255,178,84,0)");
    streak.addColorStop(.5, "rgba(255,178,84,0.11)");
    streak.addColorStop(1, "rgba(255,178,84,0)");
    ctx.fillStyle = streak;
    ctx.fillRect(lx - w * .02, ly, w * .08, h * .5);
    const rand = mulberry32(95);
    for (let i = 0; i < 7; i++) {
        const x = w * (.73 + rand() * .2), y = h * (.18 + rand() * .52);
        const r = w * (.005 + rand() * .014);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.4);
        g.addColorStop(0, `rgba(255,211,139,${.2 + rand() * .3})`);
        g.addColorStop(.4, `rgba(255,188,98,${.06 + rand() * .1})`);
        g.addColorStop(1, "rgba(255,180,84,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
        ctx.fillStyle = "rgba(255,226,170,0.3)";
        ctx.beginPath();
        ctx.arc(x, y, r * .45, 0, TAU);
        ctx.fill();
    }
    ctx.strokeStyle = "rgba(173,189,188,0.055)";
    ctx.lineWidth = w * .006;
    for (let i = 0; i < 4; i++) {
        const x = w * (.08 + i * .15);
        ctx.beginPath();
        ctx.moveTo(x, h * .02);
        ctx.lineTo(x + w * .045, h * .85);
        ctx.stroke();
    }
    ctx.save();
    ctx.translate(w * .82, h * .33);
    ctx.rotate(-.24);
    const sheen = ctx.createLinearGradient(-w * .2, 0, w * .2, 0);
    sheen.addColorStop(0, "rgba(189,208,207,0)");
    sheen.addColorStop(.47, "rgba(189,208,207,0.07)");
    sheen.addColorStop(.55, "rgba(218,228,218,0.11)");
    sheen.addColorStop(1, "rgba(189,208,207,0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(-w * .2, -h * .4, w * .4, h * .8);
    ctx.restore();
    ctx.save();
    ctx.translate(w * .46, h * .38);
    ctx.rotate(.16);
    const broad = ctx.createLinearGradient(-w * .2, 0, w * .2, 0);
    broad.addColorStop(0, "rgba(186,204,203,0)");
    broad.addColorStop(.4, "rgba(193,209,206,0.028)");
    broad.addColorStop(.62, "rgba(216,224,212,0.05)");
    broad.addColorStop(1, "rgba(186,204,203,0)");
    ctx.fillStyle = broad;
    ctx.fillRect(-w * .22, -h * .45, w * .44, h * .92);
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = "rgba(196,206,199,0.045)";
    for (const [x, slant] of [ [ w * .32, w * .035 ], [ w * .52, w * .025 ], [ w * .67, w * .04 ] ]) {
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(x, h * .04);
        ctx.lineTo(x + slant, h * .72);
        ctx.stroke();
    }
    ctx.strokeStyle = "rgba(208,214,203,0.03)";
    ctx.lineWidth = 1.4;
    for (const y of [ h * .22, h * .47, h * .66 ]) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y - h * .045);
        ctx.stroke();
    }
    const pillar = ctx.createLinearGradient(lx - w * .02, 0, lx + w * .03, 0);
    pillar.addColorStop(0, "rgba(255,183,89,0)");
    pillar.addColorStop(.45, "rgba(255,193,108,0.06)");
    pillar.addColorStop(1, "rgba(255,183,89,0)");
    ctx.fillStyle = pillar;
    ctx.fillRect(lx - w * .02, ly, w * .05, h * .62);
    ctx.restore();
    const sky = ctx.createLinearGradient(0, 0, 0, h * .35);
    sky.addColorStop(0, "rgba(105,137,158,0.11)");
    sky.addColorStop(1, "rgba(105,137,158,0)");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h * .35);
    return canvas;
}

export function makeGlowTexture(size = 256, warm = true) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    if (warm) {
        g.addColorStop(0, "rgba(255,246,216,1)");
        g.addColorStop(.08, "rgba(255,218,151,0.92)");
        g.addColorStop(.28, "rgba(255,178,92,0.36)");
        g.addColorStop(.64, "rgba(239,137,57,0.08)");
        g.addColorStop(1, "rgba(223,120,45,0)");
    } else {
        g.addColorStop(0, "rgba(240,247,239,0.9)");
        g.addColorStop(.3, "rgba(198,220,214,0.24)");
        g.addColorStop(1, "rgba(160,192,188,0)");
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return canvas;
}

export function makeDustSprite(size = 64) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,247,218,0.9)");
    g.addColorStop(.18, "rgba(255,236,192,0.45)");
    g.addColorStop(.55, "rgba(255,220,160,0.08)");
    g.addColorStop(1, "rgba(255,220,160,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return canvas;
}

export function makePageEdgeTexture(w = 512, h = 512) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#d8cdb3";
    ctx.fillRect(0, 0, w, h);
    const rand = mulberry32(23);
    for (let y = 0; y < h; y += 2) {
        ctx.fillStyle = `rgba(${rand() > .5 ? "87,76,58" : "250,244,225"},${.05 + rand() * .2})`;
        ctx.fillRect(0, y, w, .7 + rand() * 1.2);
    }
    for (let i = 0; i < 50; i++) {
        ctx.fillStyle = `rgba(130,108,73,${.015 + rand() * .05})`;
        ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 8, 1 + rand() * 3);
    }
    return canvasTex(canvas);
}

export function makeLeatherTexture(w = 512, h = 512, seed = 19) {
    const rand = mulberry32(seed);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#4b2d24";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 6500; i++) {
        const x = rand() * w, y = rand() * h;
        ctx.fillStyle = `rgba(${rand() > .5 ? "117,81,64" : "25,13,11"},${.01 + rand() * .05})`;
        ctx.beginPath();
        ctx.arc(x, y, .4 + rand() * 2.4, 0, TAU);
        ctx.fill();
    }
    for (let i = 0; i < 40; i++) {
        ctx.strokeStyle = `rgba(145,103,75,${.03 + rand() * .08})`;
        ctx.lineWidth = .5;
        const x = rand() * w, y = rand() * h;
        ctx.beginPath();
        ctx.arc(x, y, 3 + rand() * 24, rand() * TAU, rand() * TAU);
        ctx.stroke();
    }
    return canvasTex(canvas, {
        wrap: THREE.RepeatWrapping
    });
}

export function makeEnvironmentCanvas(w = 2048, h = 1024) {
    const rand = mulberry32(904);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#0b1521");
    sky.addColorStop(.38, "#223542");
    sky.addColorStop(.53, "#755d46");
    sky.addColorStop(.64, "#1d2a2c");
    sky.addColorStop(1, "#090e11");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    const horizon = ctx.createRadialGradient(w * .28, h * .56, 0, w * .28, h * .56, w * .4);
    horizon.addColorStop(0, "rgba(237,176,103,0.4)");
    horizon.addColorStop(.3, "rgba(191,120,66,0.13)");
    horizon.addColorStop(1, "rgba(191,120,66,0)");
    ctx.fillStyle = horizon;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#0d1419";
    ctx.fillRect(0, h * .53, w, h * .47);
    for (let i = 0; i < 18; i++) {
        const bw = w * (.03 + rand() * .08);
        const bh = h * (.15 + rand() * .27);
        const x = rand() * w;
        ctx.fillStyle = "#0c1318";
        ctx.fillRect(x, h * .51 - bh, bw, bh);
        for (let j = 0; j < 12; j++) {
            if (rand() > .78) {
                ctx.fillStyle = `rgba(255,185,94,${.2 + rand() * .5})`;
                ctx.fillRect(x + rand() * bw * .8, h * .51 - bh + rand() * bh * .9, 2 + rand() * 4, 3 + rand() * 5);
            }
        }
    }
    const lamps = [ [ w * .11, h * .5, 1 ], [ w * .78, h * .47, .55 ], [ w * .53, h * .44, .3 ] ];
    for (const [x, y, scale] of lamps) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, h * .18 * scale);
        g.addColorStop(0, "rgba(255,240,196,0.95)");
        g.addColorStop(.04, "rgba(255,205,117,0.7)");
        g.addColorStop(.22, "rgba(255,168,75,0.15)");
        g.addColorStop(1, "rgba(255,160,68,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - h * .2, y - h * .2, h * .4, h * .4);
        const pg = ctx.createLinearGradient(x, y, x, h);
        pg.addColorStop(0, "rgba(255,176,85,0.24)");
        pg.addColorStop(.5, "rgba(255,150,68,0.07)");
        pg.addColorStop(1, "rgba(255,150,68,0)");
        ctx.fillStyle = pg;
        ctx.fillRect(x - h * .06, y, h * .12, h * .4);
    }
    for (let i = 0; i < 7; i++) {
        ctx.fillStyle = `rgba(128,143,144,${.03 + rand() * .05})`;
        ctx.beginPath();
        ctx.ellipse(rand() * w, h * (.12 + rand() * .17), w * (.1 + rand() * .18), h * (.01 + rand() * .03), 0, 0, TAU);
        ctx.fill();
    }
    return canvas;
}

export function buildTextures() {
    const wood = makeWoodTexture();
    const stone = makeStoneTexture();
    const pavement = makePavementTexture();
    const board = makeNavyBoardTexture();
    const poster = createMoonPosterCanvas();
    const smallPosters = [ 0, 1, 2 ].map(i => createSmallPosterCanvas(i));
    const coverAtlas = createBrochureCoverAtlas();
    const spreadAtlas = createBrochureSpreadAtlas();
    const globe = createGlobeCanvas();
    const globeBump = createGlobeBumpCanvas();
    const doorDecal = makeDoorDecalCanvas();
    const plaque = makePlaqueCanvas();
    const rackSign = makeRackSignCanvas();
    const wallPaper = makeWallpaperTexture();
    const glassSmudge = makeGlassSmudgeCanvas();
    const glassReflection = makeGlassReflectionCanvas();
    const env = makeEnvironmentCanvas();
    const glow = makeGlowTexture();
    const dust = makeDustSprite();
    const pages = makePageEdgeTexture();
    const leather = makeLeatherTexture();
    const closedSign = makeClosedSignCanvas();
    const globeLabel = makeGlobeLabelCanvas();
    return {
        wood: wood,
        stone: stone,
        pavement: pavement,
        board: board,
        posterCanvas: poster,
        smallPosterCanvases: smallPosters,
        coverAtlas: coverAtlas,
        spreadAtlas: spreadAtlas,
        globeCanvas: globe,
        globeBumpCanvas: globeBump,
        doorDecalCanvas: doorDecal,
        plaqueCanvas: plaque,
        rackSignCanvas: rackSign,
        wallPaper: wallPaper,
        glassSmudgeCanvas: glassSmudge,
        glassReflectionCanvas: glassReflection,
        envCanvas: env,
        glowCanvas: glow,
        dustCanvas: dust,
        pagesTexture: pages,
        leather: leather,
        closedSignCanvas: closedSign,
        globeLabelCanvas: globeLabel,
        posterMap: canvasTex(poster, {
            anisotropy: 16
        }),
        smallPosterMaps: smallPosters.map(c => canvasTex(c, {
            anisotropy: 16
        })),
        coverMap: canvasTex(coverAtlas.canvas, {
            anisotropy: 8
        }),
        spreadMap: canvasTex(spreadAtlas.canvas, {
            anisotropy: 8
        }),
        globeMap: canvasTex(globe, {
            anisotropy: 8
        }),
        globeBumpMap: canvasTex(globeBump, {
            colorSpace: THREE.NoColorSpace,
            anisotropy: 4
        }),
        doorDecalMap: canvasTex(doorDecal, {
            anisotropy: 8
        }),
        plaqueMap: canvasTex(plaque, {
            anisotropy: 8
        }),
        rackSignMap: canvasTex(rackSign, {
            anisotropy: 8
        }),
        glassSmudgeMap: canvasTex(glassSmudge, {
            anisotropy: 8
        }),
        glassReflectionMap: canvasTex(glassReflection, {
            anisotropy: 8
        }),
        glowMap: canvasTex(glow, {
            anisotropy: 2
        }),
        dustMap: canvasTex(dust, {
            anisotropy: 2
        }),
        closedSignMap: canvasTex(closedSign, {
            anisotropy: 4
        }),
        globeLabelMap: canvasTex(globeLabel, {
            anisotropy: 4
        })
    };
}
