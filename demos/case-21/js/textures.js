import { CanvasTexture, SRGBColorSpace, RepeatWrapping, ClampToEdgeWrapping, NoColorSpace, Color } from "three";

const TAU = Math.PI * 2;

export function makeCanvas(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return {
        canvas: c,
        ctx: c.getContext("2d")
    };
}

export function rng(seed = 1) {
    let a = seed >>> 0;
    return function random() {
        a |= 0;
        a = a + 1831565813 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

export function makeTexture(canvas, options = {}) {
    const {repeat: repeat = [ 1, 1 ], srgb: srgb = true, wrap: wrap = false, anisotropy: anisotropy = 8, minFilter: minFilter = null} = options;
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
    tex.wrapS = wrap ? RepeatWrapping : ClampToEdgeWrapping;
    tex.wrapT = wrap ? RepeatWrapping : ClampToEdgeWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
    tex.anisotropy = anisotropy;
    if (minFilter !== null) tex.minFilter = minFilter;
    tex.needsUpdate = true;
    return tex;
}

function smoothstep(a, b, x) {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
}

function noiseSpeckle(ctx, rnd, W, H, count, colors, maxR = 1.6, alpha = .12) {
    for (let i = 0; i < count; i++) {
        ctx.globalAlpha = alpha * (.3 + rnd() * .7);
        ctx.fillStyle = colors[rnd() * colors.length | 0];
        const r = .3 + rnd() * maxR;
        ctx.beginPath();
        ctx.arc(rnd() * W, rnd() * H, r, 0, TAU);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

function softenEdges(ctx, W, H, color, strength = .3) {
    const g = ctx.createRadialGradient(W * .5, H * .45, W * .2, W * .5, H * .5, W * .78);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, color);
    ctx.globalAlpha = strength;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
}

export function createWallPatina(options = {}) {
    const {seed: seed = 31, cool: cool = false} = options;
    const W = 1024, H = 1024;
    const {canvas: canvas, ctx: ctx} = makeCanvas(W, H);
    const rnd = rng(seed);
    ctx.clearRect(0, 0, W, H);
    const worn = cool ? "#a9ab9b" : "#b49f86";
    const cream = cool ? "#c1bfad" : "#c9b498";
    const shadow = cool ? "#646d62" : "#6a5540";
    const moss = cool ? "rgba(95,111,94,0.22)" : "rgba(110,92,67,0.2)";
    const blobPath = (cx, cy, rx, ry, rough, points = 26, skew = 0) => {
        ctx.beginPath();
        const p1 = rnd() * TAU, p2 = rnd() * TAU;
        const radii = [];
        for (let k = 0; k <= points; k++) {
            const a = k / points * TAU;
            const wob = 1 + Math.sin(a * 3 + p1) * .17 + Math.sin(a * 7 + p2) * .07 + (rnd() - .5) * rough * .62;
            const rr = Math.max(.25, wob);
            const px = cx + Math.cos(a) * rx * rr;
            const py = cy + Math.sin(a) * ry * rr;
            radii.push([ px, py, a ]);
            k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        return radii;
    };
    const patch = (cx, cy, rx, ry, alpha, rough = .6) => {
        const lobes = 1 + (rnd() * 2 | 0);
        for (let layer = 0; layer < lobes; layer++) {
            const ox = layer === 0 ? 0 : (rnd() - .5) * rx * .7;
            const oy = layer === 0 ? 0 : (rnd() - .5) * ry * .7;
            const lx = rx * (layer === 0 ? 1 : .5 + rnd() * .35);
            const ly = ry * (layer === 0 ? 1 : .45 + rnd() * .35);
            blobPath(cx + ox, cy + oy, lx, ly, rough);
            ctx.fillStyle = hexA(layer === 0 ? cream : worn, alpha * (layer === 0 ? 1 : .8));
            ctx.fill();
            if (layer === 0) {
                ctx.strokeStyle = hexA(shadow, Math.min(.55, alpha * .75));
                ctx.lineWidth = 2 + rnd() * 3.2;
                ctx.stroke();
            } else {
                ctx.strokeStyle = hexA(shadow, alpha * .2);
                ctx.lineWidth = 1 + rnd() * 1.8;
                ctx.stroke();
            }
        }
        ctx.save();
        blobPath(cx, cy, rx * .92, ry * .92, rough);
        ctx.clip();
        for (let i = 0; i < 26; i++) {
            const a = rnd() * TAU, rr = Math.sqrt(rnd());
            const gx = cx + Math.cos(a) * rx * rr, gy = cy + Math.sin(a) * ry * rr;
            ctx.fillStyle = rnd() > .45 ? hexA(worn, .12 + rnd() * .22) : hexA(shadow, .07 + rnd() * .15);
            ctx.beginPath();
            ctx.ellipse(gx, gy, 1 + rnd() * 5, .7 + rnd() * 3.5, rnd() * TAU, 0, TAU);
            ctx.fill();
        }
        for (let i = 0; i < 10; i++) {
            const a = rnd() * TAU, rr = Math.sqrt(rnd());
            ctx.fillStyle = hexA(shadow, .1 + rnd() * .12);
            ctx.beginPath();
            ctx.arc(cx + Math.cos(a) * rx * rr, cy + Math.sin(a) * ry * rr, .5 + rnd() * 1.5, 0, TAU);
            ctx.fill();
        }
        ctx.restore();
    };
    for (let i = 0; i < 3; i++) {
        const cx = W * (.03 + rnd() * .94);
        const cy = H * (.03 + Math.pow(rnd(), 1.45) * .6);
        const rx = W * (.022 + rnd() * .035);
        const ry = H * (.012 + rnd() * .025);
        patch(cx, cy, rx, ry, .22 + rnd() * .16, .85);
    }
    for (let i = 0; i < 9; i++) {
        const cx = W * (.02 + rnd() * .96);
        const cy = H * (.04 + rnd() * .9);
        const rx = W * (.009 + rnd() * .018);
        const ry = H * (.005 + rnd() * .013);
        patch(cx, cy, rx, ry, .2 + rnd() * .22, .86);
    }
    for (let i = 0; i < 54; i++) {
        const cx = W * (.01 + rnd() * .98);
        const cy = H * (.02 + rnd() * .96);
        const rx = W * (.002 + rnd() * .009);
        const ry = H * (.0015 + rnd() * .007);
        patch(cx, cy, rx, ry, .18 + rnd() * .28, .95);
    }
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 160; i++) {
        const x = W * rnd(), y = H * rnd();
        const r = 2 + Math.pow(rnd(), 2.2) * 34;
        ctx.beginPath();
        for (let k = 0; k <= 7; k++) {
            const a = k / 7 * TAU;
            const rr = r * (.35 + rnd() * .9);
            const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * .7;
            k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(0,0,0,${.3 + rnd() * .5})`;
        ctx.fill();
    }
    ctx.restore();
    ctx.lineCap = "round";
    for (let i = 0; i < 26; i++) {
        let x = W * rnd(), y = H * rnd() * .85;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.strokeStyle = hexA(shadow, .12 + rnd() * .22);
        ctx.lineWidth = .6 + rnd() * 1.2;
        for (let k = 0; k < 9; k++) {
            x += (rnd() - .5) * 42;
            y += 6 + rnd() * 34;
            ctx.lineTo(x, y);
            if (rnd() > .8) {
                ctx.moveTo(x, y);
                ctx.lineTo(x + (rnd() - .5) * 32, y + rnd() * 24);
                ctx.moveTo(x, y);
            }
        }
        ctx.stroke();
    }
    for (let i = 0; i < 14; i++) {
        const x = W * rnd();
        const y0 = H * rnd() * .12;
        const len = H * (.06 + rnd() * .3);
        const g = ctx.createLinearGradient(0, y0, 0, y0 + len);
        g.addColorStop(0, hexA(shadow, .08 + rnd() * .1));
        g.addColorStop(1, hexA(shadow, 0));
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.5 + rnd() * 7;
        ctx.beginPath();
        ctx.moveTo(x, y0);
        ctx.quadraticCurveTo(x + (rnd() - .5) * 18, y0 + len * .5, x + (rnd() - .5) * 26, y0 + len);
        ctx.stroke();
    }
    for (let i = 0; i < 18; i++) {
        const x = W * rnd(), y = H * rnd() * .7, r = 6 + rnd() * 28;
        const g = ctx.createRadialGradient(x, y, 1, x, y, r);
        g.addColorStop(0, hexA(cream, .12));
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 22; i++) {
        const x = W * rnd(), y = H * rnd(), r = 4 + rnd() * 26;
        const g = ctx.createRadialGradient(x, y, 1, x, y, r);
        g.addColorStop(0, moss);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    return makeTexture(canvas, {
        anisotropy: 8
    });
}

export function createPlaster(options = {}) {
    const {base: base = "#b9684f", light: light = "#d89677", shadow: shadow = "#7f4337", worn: worn = "#d9bfa1", seed: seed = 12, stains: stains = 7} = options;
    const W = 1024, H = 1024;
    const {canvas: canvas, ctx: ctx} = makeCanvas(W, H);
    const rnd = rng(seed);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "rgba(255,240,215,0.07)");
    bg.addColorStop(.5, "rgba(0,0,0,0)");
    bg.addColorStop(1, "rgba(55,25,18,0.13)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) {
        const x = rnd() * W, y = rnd() * H, r = 30 + rnd() * 260;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        const c = rnd() > .52 ? light : shadow;
        g.addColorStop(0, hexA(c, .035 + rnd() * .05));
        g.addColorStop(1, hexA(c, 0));
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.strokeStyle = hexA(shadow, .28);
    for (let i = 0; i < 16; i++) {
        ctx.lineWidth = .5 + rnd() * 1.2;
        let x = rnd() * W, y = rnd() * H;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let s = 0; s < 7; s++) {
            x += (rnd() - .5) * 34;
            y += 8 + rnd() * 36;
            ctx.lineTo(x, y);
            if (rnd() > .72) {
                ctx.moveTo(x, y);
                ctx.lineTo(x + (rnd() - .5) * 70, y + rnd() * 30);
                ctx.moveTo(x, y);
            }
        }
        ctx.stroke();
    }
    for (let i = 0; i < 24; i++) {
        const x = rnd() * W, y = rnd() * H, r = 6 + rnd() * 58;
        ctx.beginPath();
        const n = 8 + (rnd() * 6 | 0);
        for (let k = 0; k <= n; k++) {
            const a = k / n * TAU;
            const rr = r * (.55 + rnd() * .6);
            const px = x + Math.cos(a) * rr * 1.5;
            const py = y + Math.sin(a) * rr;
            k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = hexA(worn, .04 + rnd() * .09);
        ctx.fill();
        ctx.strokeStyle = hexA(worn, .12);
        ctx.lineWidth = 1.2;
        ctx.stroke();
    }
    for (let i = 0; i < stains; i++) {
        const x = rnd() * W, y = rnd() * H, r = 45 + rnd() * 190;
        const g = ctx.createRadialGradient(x, y, r * .1, x, y, r);
        g.addColorStop(0, hexA(shadow, .045));
        g.addColorStop(.7, hexA(shadow, .02));
        g.addColorStop(1, hexA(shadow, 0));
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    noiseSpeckle(ctx, rnd, W, H, 6200, [ light, shadow, worn, base ], 1.7, .11);
    for (let i = 0; i < 900; i++) {
        ctx.globalAlpha = .04 + rnd() * .12;
        ctx.fillStyle = rnd() > .5 ? light : shadow;
        ctx.beginPath();
        ctx.arc(rnd() * W, rnd() * H, .4 + rnd() * 1.1, 0, TAU);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    softenEdges(ctx, W, H, "rgba(45,22,15,0.22)", .65);
    const map = makeTexture(canvas, {
        wrap: true,
        anisotropy: 8
    });
    const bump = makeTexture(canvas, {
        wrap: true,
        srgb: false,
        anisotropy: 4
    });
    return {
        canvas: canvas,
        map: map,
        bump: bump
    };
}

export function createWood(options = {}) {
    const {base: base = "#704a2d", dark: dark = "#3f2717", light: light = "#b07a45", seed: seed = 3, knots: knots = 4, W: W = 1024, H: H = 1024} = options;
    const {canvas: canvas, ctx: ctx} = makeCanvas(W, H);
    const rnd = rng(seed);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 260; i++) {
        const y = rnd() * H;
        const x = rnd() * W * .4 - W * .1;
        const len = W * (.35 + rnd() * .8);
        const amp = 2 + rnd() * 13;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let s = 0; s <= 24; s++) {
            const px = x + s / 24 * len;
            const py = y + Math.sin(s * .5 + i) * amp * Math.sin(s / 24 * Math.PI) + (rnd() - .5) * 2;
            ctx.lineTo(px, py);
        }
        ctx.strokeStyle = hexA(rnd() > .48 ? dark : light, .03 + rnd() * .08);
        ctx.lineWidth = .5 + rnd() * 2.4;
        ctx.stroke();
    }
    for (let k = 0; k < knots; k++) {
        const cx = W * (.15 + rnd() * .7);
        const cy = H * (.15 + rnd() * .7);
        for (let a = 0; a < 12; a++) {
            ctx.beginPath();
            ctx.ellipse(cx, cy, 10 + a * (5 + rnd() * 3), 26 + a * (11 + rnd() * 4), rnd() * .2, 0, TAU);
            ctx.strokeStyle = hexA(rnd() > .4 ? dark : light, .06 + rnd() * .045);
            ctx.lineWidth = .6 + rnd() * 2.2;
            ctx.stroke();
        }
        const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, 30);
        g.addColorStop(0, hexA(dark, .7));
        g.addColorStop(.5, hexA(dark, .25));
        g.addColorStop(1, hexA(dark, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 28, 18, .3, 0, TAU);
        ctx.fill();
    }
    const sheen = ctx.createLinearGradient(0, 0, W, H);
    sheen.addColorStop(0, "rgba(255,222,170,0.08)");
    sheen.addColorStop(.45, "rgba(255,255,255,0)");
    sheen.addColorStop(1, "rgba(30,12,4,0.16)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, W, H);
    noiseSpeckle(ctx, rnd, W, H, 1600, [ dark, light ], 1.2, .07);
    const map = makeTexture(canvas, {
        wrap: true
    });
    const bump = makeTexture(canvas, {
        wrap: true,
        srgb: false
    });
    return {
        canvas: canvas,
        map: map,
        bump: bump
    };
}

export function createFloorTexture() {
    const W = 2048, H = 2048;
    const {canvas: canvas, ctx: ctx} = makeCanvas(W, H);
    const rnd = rng(41);
    ctx.fillStyle = "#795334";
    ctx.fillRect(0, 0, W, H);
    let x = 0;
    const planks = [];
    while (x < W) {
        const w = 95 + rnd() * 95;
        planks.push([ x, Math.min(w, W - x) ]);
        x += w;
    }
    const seamY = [ 0, 410, 980, 1510, 2020 ];
    for (const [px, pw] of planks) {
        const tint = rnd();
        ctx.fillStyle = tint > .66 ? "#8a6040" : tint > .33 ? "#745031" : "#80593a";
        ctx.fillRect(px, 0, pw, H);
        for (let g = 0; g < 70; g++) {
            ctx.beginPath();
            const gx = px + rnd() * pw;
            let gy = rnd() * H;
            ctx.moveTo(gx, gy);
            for (let s = 0; s < 7; s++) {
                gy += 40 + rnd() * 130;
                ctx.lineTo(gx + Math.sin(gy * .02 + g) * (1 + rnd() * 3), gy);
            }
            ctx.strokeStyle = hexA(rnd() > .5 ? "#3f2918" : "#c09567", .05 + rnd() * .1);
            ctx.lineWidth = .5 + rnd() * 1.8;
            ctx.stroke();
        }
        const hg = ctx.createLinearGradient(px, 0, px + pw, 0);
        hg.addColorStop(0, "rgba(30,15,6,0.28)");
        hg.addColorStop(.06, "rgba(255,220,170,0.05)");
        hg.addColorStop(.85, "rgba(255,230,180,0.035)");
        hg.addColorStop(1, "rgba(25,12,4,0.4)");
        ctx.fillStyle = hg;
        ctx.fillRect(px, 0, pw, H);
        const joints = seamY.slice(1 + (rnd() * 2 | 0));
        for (const j of joints) {
            ctx.strokeStyle = "rgba(38,20,8,0.48)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(px, j);
            ctx.lineTo(px + pw, j);
            ctx.stroke();
            ctx.strokeStyle = "rgba(255,225,180,0.06)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(px, j + 2);
            ctx.lineTo(px + pw, j + 2);
            ctx.stroke();
        }
    }
    for (let i = 0; i < 24; i++) {
        const cx = rnd() * W, cy = rnd() * H, r = 70 + rnd() * 350;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, hexA(rnd() > .5 ? "#d2a775" : "#2d1a0d", .05));
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    noiseSpeckle(ctx, rnd, W, H, 9e3, [ "#d3aa7a", "#26160b", "#5e3d25" ], 1.3, .08);
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < 7; i++) {
        const g = ctx.createLinearGradient(0, i * 300, 0, i * 300 + 200);
        g.addColorStop(0, "rgba(255,226,180,0)");
        g.addColorStop(.5, "rgba(255,226,180,0.035)");
        g.addColorStop(1, "rgba(255,226,180,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
    }
    ctx.globalCompositeOperation = "source-over";
    const map = makeTexture(canvas, {
        wrap: true
    });
    const bump = makeTexture(canvas, {
        wrap: true,
        srgb: false
    });
    return {
        map: map,
        bump: bump
    };
}

function drawRosette(ctx, x, y, r, petal, center, petals = 8, outline = null, alpha = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = alpha;
    for (let i = 0; i < petals; i++) {
        ctx.rotate(TAU / petals);
        ctx.beginPath();
        ctx.moveTo(0, -r * .08);
        ctx.bezierCurveTo(-r * .34, -r * .22, -r * .3, -r * .74, 0, -r * .97);
        ctx.bezierCurveTo(r * .3, -r * .74, r * .34, -r * .22, 0, -r * .08);
        ctx.closePath();
        ctx.fillStyle = petal;
        ctx.fill();
        if (outline) {
            ctx.strokeStyle = outline;
            ctx.lineWidth = Math.max(.7, r * .026);
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(0, -r * .2);
        ctx.quadraticCurveTo(-r * .1, -r * .42, 0, -r * .7);
        ctx.quadraticCurveTo(r * .1, -r * .42, 0, -r * .2);
        ctx.fillStyle = hexA("#f2deb7", .13);
        ctx.fill();
    }
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
        const a = i / 8 * TAU;
        const rr = r * .2;
        i === 0 ? ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = center;
    ctx.fill();
    if (outline) {
        ctx.strokeStyle = outline;
        ctx.lineWidth = Math.max(.6, r * .022);
        ctx.stroke();
    }
    ctx.restore();
}

function drawDiamondGul(ctx, x, y, w, h, colors, line) {
    const levels = [ [ 1, colors[0] ], [ .82, colors[1] ], [ .55, colors[2] ], [ .26, colors[3] ] ];
    for (const [s, c] of levels) {
        ctx.beginPath();
        ctx.moveTo(x, y - h * s);
        ctx.quadraticCurveTo(x + w * s * .62, y - h * s * .5, x + w * s, y);
        ctx.quadraticCurveTo(x + w * s * .62, y + h * s * .5, x, y + h * s);
        ctx.quadraticCurveTo(x - w * s * .62, y + h * s * .5, x - w * s, y);
        ctx.quadraticCurveTo(x - w * s * .62, y - h * s * .5, x, y - h * s);
        ctx.closePath();
        ctx.fillStyle = c;
        ctx.fill();
        ctx.strokeStyle = line;
        ctx.lineWidth = 1.4;
        ctx.stroke();
    }
}

function fruitColor(hex, shift = 0) {
    const c = new Color(hex);
    const hsl = {};
    c.getHSL(hsl);
    c.setHSL(hsl.h, hsl.s, Math.max(.02, Math.min(.95, hsl.l + shift / 255)));
    return "#" + c.getHexString();
}

function drawBorderMotif(ctx, x, y, scale, colors, angle = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, -scale);
    ctx.lineTo(scale * .72, -scale * .36);
    ctx.lineTo(scale * .34, scale * .45);
    ctx.lineTo(0, scale * .94);
    ctx.lineTo(-scale * .34, scale * .45);
    ctx.lineTo(-scale * .72, -scale * .36);
    ctx.closePath();
    ctx.fillStyle = colors[0];
    ctx.fill();
    ctx.strokeStyle = colors[1];
    ctx.lineWidth = Math.max(1, scale * .06);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -scale * .6);
    ctx.lineTo(scale * .23, 0);
    ctx.lineTo(0, scale * .6);
    ctx.lineTo(-scale * .23, 0);
    ctx.closePath();
    ctx.fillStyle = colors[2];
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, scale * .13, 0, TAU);
    ctx.fillStyle = colors[3];
    ctx.fill();
    ctx.restore();
}

function drawBoteh(ctx, x, y, w, h, rot, fill, outline, accent, alpha = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(0, h * .52);
    ctx.bezierCurveTo(-w * .52, h * .34, -w * .68, -h * .16, -w * .24, -h * .44);
    ctx.bezierCurveTo(w * .08, -h * .65, w * .58, -h * .4, w * .42, -h * .02);
    ctx.bezierCurveTo(w * .3, h * .24, w * .1, h * .3, 0, h * .52);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = Math.max(1, w * .055);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w * .35, -h * .03);
    ctx.bezierCurveTo(w * .5, -h * .2, w * .28, -h * .34, w * .18, -h * .22);
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(.8, w * .035);
    ctx.stroke();
    drawRosette(ctx, -w * .06, 0, w * .16, accent, outline, 6, null, 1);
    ctx.globalAlpha = 1;
    ctx.restore();
}

function drawLobedPath(ctx, cx, cy, rx, ry, lobes, amp, rotation = 0) {
    const steps = 160;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
        const a = i / steps * TAU;
        const k = 1 + amp * Math.cos(lobes * a + rotation);
        const x = cx + Math.cos(a) * rx * k;
        const y = cy + Math.sin(a) * ry * k;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
}

function drawSpandrel(ctx, x, y, sx, sy, size, colors) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sx, sy);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size, 0);
    ctx.bezierCurveTo(size * .86, size * .3, size * .74, size * .48, size * .52, size * .58);
    ctx.bezierCurveTo(size * .32, size * .68, size * .2, size * .84, 0, size);
    ctx.closePath();
    ctx.fillStyle = colors[0];
    ctx.fill();
    ctx.strokeStyle = colors[1];
    ctx.lineWidth = Math.max(2, size * .022);
    ctx.stroke();
    ctx.save();
    ctx.clip();
    for (let i = 0; i < 3; i++) {
        const off = i * .18;
        drawVine(ctx, [ [ size * (.04 + off), size * .08 ], [ size * (.3 + off), size * .3 ], [ size * (.6 + off * .4), size * .5 ], [ size * (.88 + off * .2), size * .86 ] ], hexA(colors[2], .45), 1.4);
    }
    for (let i = 0; i < 5; i++) {
        drawRosette(ctx, size * (.18 + i * .12), size * (.14 + i * .12), size * .045, colors[3], colors[4], 7, colors[2], .78);
    }
    ctx.restore();
    ctx.restore();
}

function drawRugLeaf(ctx, x, y, len, angle, fill, outline, alpha = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-len * .4, -len * .14, -len * .43, -len * .66, 0, -len);
    ctx.bezierCurveTo(len * .43, -len * .66, len * .4, -len * .14, 0, 0);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = Math.max(.8, len * .035);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -len * .08);
    ctx.quadraticCurveTo(len * .07, -len * .52, 0, -len * .9);
    ctx.strokeStyle = hexA(outline, .45);
    ctx.lineWidth = Math.max(.6, len * .018);
    ctx.stroke();
    ctx.restore();
}

function drawHerati(ctx, x, y, s, kit, rot = 0, alpha = .9) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.rotate(i / 4 * TAU + Math.PI / 4);
        ctx.beginPath();
        ctx.moveTo(s * .1, 0);
        ctx.bezierCurveTo(s * .34, -s * .2, s * .62, -s * .28, s * .92, -s * .06);
        ctx.strokeStyle = hexA(kit.stem, .7);
        ctx.lineWidth = Math.max(.9, s * .035);
        ctx.stroke();
        drawRugLeaf(ctx, s * .33, -s * .08, s * .38, .62, kit.leaf, kit.outline, alpha * .85);
        drawRugLeaf(ctx, s * .55, -s * .19, s * .3, .28, kit.leafAlt, kit.outline, alpha * .8);
        ctx.beginPath();
        ctx.arc(s * .86, -s * .1, s * .06, 0, TAU);
        ctx.fillStyle = kit.bud;
        ctx.fill();
        ctx.strokeStyle = kit.outline;
        ctx.lineWidth = Math.max(.7, s * .02);
        ctx.stroke();
        ctx.restore();
    }
    ctx.beginPath();
    ctx.moveTo(0, -s * .72);
    ctx.lineTo(s * .8, 0);
    ctx.lineTo(0, s * .72);
    ctx.lineTo(-s * .8, 0);
    ctx.closePath();
    ctx.strokeStyle = hexA(kit.outline, .26);
    ctx.lineWidth = Math.max(.8, s * .018);
    ctx.stroke();
    drawRosette(ctx, 0, 0, s * .34, kit.petal, kit.center, 8, kit.outline, alpha * .95);
    drawRosette(ctx, 0, 0, s * .155, kit.accent, kit.petal, 6, kit.outline, alpha);
    for (let i = 0; i < 4; i++) {
        const a = i / 4 * TAU + Math.PI / 4;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * s * .54, Math.sin(a) * s * .54, s * .045, 0, TAU);
        ctx.fillStyle = kit.bud;
        ctx.fill();
        ctx.strokeStyle = hexA(kit.outline, .55);
        ctx.lineWidth = .7;
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
}

function drawRugSpandrel(ctx, x, y, sx, sy, size, kit) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sx, sy);
    const path = () => {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(size, 0);
        ctx.bezierCurveTo(size * .86, size * .18, size * .7, size * .28, size * .61, size * .4);
        ctx.bezierCurveTo(size * .5, size * .54, size * .54, size * .68, size * .4, size * .7);
        ctx.bezierCurveTo(size * .28, size * .72, size * .25, size * .86, 0, size);
        ctx.closePath();
    };
    path();
    ctx.fillStyle = kit.fill;
    ctx.fill();
    ctx.strokeStyle = kit.line;
    ctx.lineWidth = Math.max(2, size * .012);
    ctx.stroke();
    ctx.save();
    path();
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(size * .08, size * .04);
    ctx.bezierCurveTo(size * .22, size * .13, size * .38, size * .1, size * .42, size * .25);
    ctx.bezierCurveTo(size * .45, size * .4, size * .32, size * .46, size * .38, size * .58);
    ctx.bezierCurveTo(size * .44, size * .68, size * .3, size * .8, size * .16, size * .86);
    ctx.strokeStyle = hexA(kit.line, .55);
    ctx.lineWidth = Math.max(1.2, size * .006);
    ctx.stroke();
    for (let i = 0; i < 3; i++) {
        const pts = [ [ size * (.08 + i * .06), size * .08 ], [ size * (.3 + i * .11), size * (.2 + i * .03) ], [ size * (.44 + i * .05), size * (.42 + i * .04) ], [ size * (.56 + i * .03), size * (.6 + i * .08) ] ];
        drawVine(ctx, pts, hexA(kit.vine, .65), Math.max(1, size * .007));
        for (let j = 0; j < 3; j++) {
            const px = size * (.17 + j * .13 + i * .02);
            const py = size * (.16 + j * .14 + i * .07);
            drawRosette(ctx, px, py, size * (.038 + j * .004), j % 2 ? kit.rose : kit.cream, kit.line, 7, kit.line, .9);
            drawRugLeaf(ctx, px + size * .045, py + size * .014, size * .095, 1.8, hexA(kit.vine, .6), kit.line, .7);
        }
    }
    ctx.restore();
    ctx.restore();
}

export function createRug(options = {}) {
    const {seed: seed = 88, W: W = 1400, H: H = 1580, field: field = "#6b3934", fieldDeep: fieldDeep = "#492929", border: border = "#bba681", borderIn: borderIn = "#413138", indigo: indigo = "#2a3a49", rose: rose = "#9c6a60", cream: cream = "#d0bd9a", gold: gold = "#a67d4e", worn: worn = "#b6a282", medallion: medallion = false} = options;
    const {canvas: canvas, ctx: ctx} = makeCanvas(W, H);
    const rnd = rng(seed);
    const edge = W * .011;
    const b0 = W * .022;
    const b1 = W * .113;
    const g1 = W * .136;
    const f0 = g1;
    const fw = W - f0 * 2;
    const fh = H - f0 * 2;
    const fieldDeep2 = hexA(fieldDeep, .65);
    ctx.fillStyle = cornerMix(borderIn, indigo, .45);
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = border;
    ctx.fillRect(b0, b0, W - b0 * 2, H - b0 * 2);
    for (let i = 0; i < 24; i++) {
        ctx.globalAlpha = .02 + rnd() * .035;
        ctx.fillStyle = i % 2 ? cream : hexA(rose, .5);
        ctx.fillRect(b0, b0 + rnd() * (H - b0 * 2), W - b0 * 2, 30 + rnd() * 160);
    }
    ctx.globalAlpha = 1;
    const lines = [ [ edge, 2.2, indigo ], [ b0 - W * .004, 1.1, gold ], [ b0 + W * .007, W * .0022, indigo ], [ b1 - W * .018, W * .002, rose ], [ b1 - W * .008, W * .0018, gold ], [ b1, W * .0042, indigo ] ];
    for (const [inset, lw, col] of lines) {
        ctx.strokeStyle = typeof col === "string" ? col : col;
        ctx.lineWidth = lw;
        ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
    }
    const bMid = (b0 + b1) / 2;
    const bWidth = b1 - b0;
    const step = W * .052;
    const borderVine = () => {
        const off = bMid;
        ctx.save();
        ctx.strokeStyle = hexA(indigo, .55);
        ctx.lineWidth = Math.max(1.1, W * .002);
        for (let x = b0 + step * .5; x < W - b0; x += step) {
            ctx.beginPath();
            ctx.arc(x, off, bWidth * .29, Math.PI, TAU);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(x, H - off, bWidth * .29, 0, Math.PI);
            ctx.stroke();
        }
        for (let y = b0 + step * .5; y < H - b0; y += step) {
            ctx.beginPath();
            ctx.arc(off, y, bWidth * .29, -Math.PI / 2, Math.PI / 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(W - off, y, bWidth * .29, Math.PI / 2, Math.PI * 1.5);
            ctx.stroke();
        }
        ctx.restore();
    };
    borderVine();
    const borderColors = [ [ rose, indigo, cream, fieldDeep ], [ indigo, cream, rose, fieldDeep ], [ gold, indigo, cream, rose ] ];
    let bi = 0;
    for (let x = b0 + step * .5; x < W - b0; x += step) {
        if (x > W * .08 && x < W * .92) {
            drawBorderMotif(ctx, x, bMid, bWidth * .26, borderColors[bi % 3], 0);
            drawBorderMotif(ctx, x + step * .5, H - bMid, bWidth * .24, borderColors[(bi + 1) % 3], Math.PI);
        }
        bi++;
    }
    for (let y = b0 + step * .5; y < H - b0; y += step) {
        if (y > H * .075 && y < H * .925) {
            drawBorderMotif(ctx, bMid, y, bWidth * .26, borderColors[bi % 3], Math.PI / 2);
            drawBorderMotif(ctx, W - bMid, y + step * .5, bWidth * .24, borderColors[(bi + 2) % 3], -Math.PI / 2);
        }
        bi++;
    }
    for (let i = 0; i < 130; i++) {
        const side = i % 4;
        let x, y;
        const t = rnd();
        const off = bMid + (rnd() - .5) * bWidth * .5;
        if (side === 0) {
            x = b0 + 20 + t * (W - 2 * b0 - 40);
            y = off;
        } else if (side === 1) {
            x = b0 + 20 + t * (W - 2 * b0 - 40);
            y = H - off;
        } else if (side === 2) {
            x = off;
            y = b0 + 20 + t * (H - 2 * b0 - 40);
        } else {
            x = W - off;
            y = b0 + 20 + t * (H - 2 * b0 - 40);
        }
        drawRosette(ctx, x, y, W * (.004 + rnd() * .003), i % 3 ? rose : cream, indigo, 6, gold, .76);
    }
    for (const [cx, cy] of [ [ bMid, bMid ], [ W - bMid, bMid ], [ bMid, H - bMid ], [ W - bMid, H - bMid ] ]) {
        drawDiamondGul(ctx, cx, cy, bWidth * .38, bWidth * .46, [ indigo, cream, rose, fieldDeep ], indigo);
        drawRosette(ctx, cx, cy, bWidth * .34, cream, indigo, 8, gold, .5);
        drawRosette(ctx, cx, cy, bWidth * .16, rose, cream, 6, indigo, .95);
    }
    ctx.fillStyle = cornerMix(borderIn, indigo, .6);
    ctx.fillRect(b1, b1, W - b1 * 2, H - b1 * 2);
    ctx.fillStyle = indigo;
    ctx.fillRect(b1 + W * .002, b1 + W * .002, W - (b1 + W * .002) * 2, H - (b1 + W * .002) * 2);
    ctx.strokeStyle = hexA(cream, .65);
    ctx.lineWidth = Math.max(1, W * .0016);
    ctx.strokeRect(b1 + W * .007, b1 + W * .007, W - (b1 + W * .007) * 2, H - (b1 + W * .007) * 2);
    const gStep = W * .03;
    for (let x = b1 + gStep * .6; x < W - b1; x += gStep) {
        for (const yy of [ b1 + (g1 - b1) / 2, H - b1 - (g1 - b1) / 2 ]) {
            drawRosette(ctx, x, yy, W * .0075, cream, rose, 8, indigo, .86);
            ctx.beginPath();
            ctx.arc(x + gStep / 2, yy, W * .0018, 0, TAU);
            ctx.fillStyle = gold;
            ctx.fill();
        }
    }
    for (let y = b1 + gStep * .6; y < H - b1; y += gStep) {
        for (const xx of [ b1 + (g1 - b1) / 2, W - b1 - (g1 - b1) / 2 ]) {
            drawRosette(ctx, xx, y, W * .0075, cream, rose, 8, indigo, .86);
            ctx.beginPath();
            ctx.arc(xx, y + gStep / 2, W * .0018, 0, TAU);
            ctx.fillStyle = gold;
            ctx.fill();
        }
    }
    ctx.fillStyle = field;
    ctx.fillRect(f0, f0, fw, fh);
    const fg = ctx.createRadialGradient(W * .46, H * .44, W * .05, W * .5, H * .5, Math.max(fw, fh) * .62);
    fg.addColorStop(0, hexA(rose, .08));
    fg.addColorStop(.6, "rgba(0,0,0,0)");
    fg.addColorStop(1, hexA(fieldDeep, .26));
    ctx.fillStyle = fg;
    ctx.fillRect(f0, f0, fw, fh);
    for (let i = 0; i < 55; i++) {
        ctx.globalAlpha = .018 + rnd() * .042;
        ctx.fillStyle = rnd() > .52 ? fieldDeep : rnd() > .4 ? rose : worn;
        ctx.fillRect(f0, f0 + rnd() * fh, fw, 18 + rnd() * 130);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = hexA(cream, .45);
    ctx.lineWidth = Math.max(1, W * .0016);
    ctx.strokeRect(f0 + W * .005, f0 + W * .005, fw - W * .01, fh - W * .01);
    ctx.strokeStyle = hexA(gold, .4);
    ctx.lineWidth = Math.max(.8, W * .001);
    ctx.strokeRect(f0 + W * .012, f0 + W * .012, fw - W * .024, fh - W * .024);
    ctx.save();
    ctx.lineCap = "round";
    for (let i = 0; i < 18; i++) {
        const y0 = f0 + fh * (.03 + i * .055);
        drawVine(ctx, [ [ f0 + fw * .01, y0 ], [ f0 + fw * .25, y0 + Math.sin(i * 1.9) * fh * .018 ], [ f0 + fw * .5, y0 - Math.sin(i * 1.4) * fh * .015 ], [ f0 + fw * .75, y0 + Math.sin(i * 2.5) * fh * .018 ], [ f0 + fw * .99, y0 ] ], hexA(cream, .11), 1);
    }
    for (let i = 0; i < 14; i++) {
        const x0 = f0 + fw * (.035 + i * .072);
        drawVine(ctx, [ [ x0, f0 + fh * .01 ], [ x0 + Math.sin(i * 2.1) * fw * .02, f0 + fh * .25 ], [ x0 - Math.sin(i * 1.7) * fw * .018, f0 + fh * .5 ], [ x0 + Math.sin(i * 2.6) * fw * .018, f0 + fh * .75 ], [ x0, f0 + fh * .99 ] ], hexA(gold, .1), 1);
    }
    ctx.restore();
    const sp = Math.min(fw, fh) * .23;
    const spKit = {
        fill: hexA(cornerMix(indigo, fieldDeep, .35), .94),
        line: hexA(cream, .75),
        vine: cream,
        cream: cream,
        rose: rose,
        gold: gold
    };
    drawRugSpandrel(ctx, f0, f0, 1, 1, sp, spKit);
    drawRugSpandrel(ctx, f0 + fw, f0, -1, 1, sp, spKit);
    drawRugSpandrel(ctx, f0, f0 + fh, 1, -1, sp, spKit);
    drawRugSpandrel(ctx, f0 + fw, f0 + fh, -1, -1, sp, spKit);
    const cols = 9;
    const rows = 11;
    const cellX = fw / cols;
    const cellY = fh / rows;
    const kits = [ {
        petal: cream,
        center: indigo,
        accent: rose,
        outline: hexA(fieldDeep, .95),
        leaf: hexA(indigo, .7),
        leafAlt: hexA(rose, .48),
        bud: gold,
        stem: cream
    }, {
        petal: hexA(rose, .92),
        center: cream,
        accent: hexA(indigo, .9),
        outline: hexA(fieldDeep, .95),
        leaf: hexA(indigo, .62),
        leafAlt: hexA(cream, .45),
        bud: cream,
        stem: cream
    }, {
        petal: hexA(cream, .92),
        center: rose,
        accent: gold,
        outline: hexA(fieldDeep, .95),
        leaf: hexA(gold, .55),
        leafAlt: hexA(indigo, .55),
        bud: rose,
        stem: gold
    }, {
        petal: hexA(indigo, .82),
        center: cream,
        accent: rose,
        outline: hexA(fieldDeep, .95),
        leaf: hexA(rose, .52),
        leafAlt: hexA(cream, .4),
        bud: gold,
        stem: cream
    } ];
    ctx.save();
    ctx.lineCap = "round";
    for (let r = 0; r <= rows; r++) {
        for (let c = 0; c <= cols; c++) {
            const x = f0 + cellX * (c + (r % 2 ? .5 : 0)) + cellX * .1;
            const y = f0 + cellY * (r + .25);
            if (c < cols) {
                ctx.beginPath();
                ctx.moveTo(x + cellX * .28, y);
                ctx.quadraticCurveTo(x + cellX * .6, y - cellY * .11, x + cellX * .95, y);
                ctx.strokeStyle = hexA(cream, .17);
                ctx.lineWidth = 1.1;
                ctx.stroke();
            }
            if (r < rows) {
                ctx.beginPath();
                ctx.moveTo(x, y + cellY * .2);
                ctx.quadraticCurveTo(x + cellX * .13, y + cellY * .52, x, y + cellY * .86);
                ctx.strokeStyle = hexA(gold, .16);
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }
    }
    ctx.restore();
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const x = f0 + cellX * (c + .5 + (r % 2 ? .5 : 0));
            const y = f0 + cellY * (r + .5);
            if (x > f0 + fw - cellX * .4) continue;
            const kit = kits[(r * 3 + c) % kits.length];
            const scale = cellX * (.39 + (r + c) % 3 * .016);
            const cornerD = Math.min(Math.hypot(x - f0, y - f0), Math.hypot(x - f0 - fw, y - f0), Math.hypot(x - f0, y - f0 - fh), Math.hypot(x - f0 - fw, y - f0 - fh));
            if (cornerD < sp * .8) {
                drawHerati(ctx, x, y, scale * .82, kit, (r + c) % 2 ? Math.PI / 4 : 0, .6);
                continue;
            }
            drawHerati(ctx, x, y, scale, kit, (r * 7 + c) % 2 ? Math.PI / 4 : 0, .82 + rnd() * .12);
            if ((r + c) % 2 === 0) {
                const px = x + cellX * .5;
                const py = y + cellY * .5;
                drawRosette(ctx, px, py, W * .0055, cream, gold, 4, hexA(fieldDeep, .6), .62);
            }
        }
    }
    if (medallion) {
        const cx = f0 + fw * .5;
        const cy = f0 + fh * .5;
        drawRosette(ctx, cx, cy, cellX * .9, cream, rose, 16, indigo, .9);
        drawRosette(ctx, cx, cy, cellX * .62, rose, indigo, 12, cream, .75);
        drawRosette(ctx, cx, cy, cellX * .32, cream, gold, 8, indigo, .9);
    }
    for (let i = 0; i < 240; i++) {
        const x = f0 + rnd() * fw;
        const y = f0 + rnd() * fh;
        const sz = W * (.003 + rnd() * .005);
        if (rnd() > .55) {
            drawRugLeaf(ctx, x, y, sz * 1.8, rnd() * TAU, hexA(rnd() > .5 ? cream : gold, .3), hexA(indigo, .3), .6);
        } else {
            drawRosette(ctx, x, y, sz, rnd() > .5 ? cream : rose, indigo, 5, hexA(fieldDeep, .5), .55);
        }
    }
    for (let i = 0; i < 180; i++) {
        ctx.beginPath();
        ctx.arc(f0 + rnd() * fw, f0 + rnd() * fh, W * (.0011 + rnd() * .0018), 0, TAU);
        ctx.fillStyle = hexA(rnd() > .5 ? cream : gold, .24 + rnd() * .22);
        ctx.fill();
    }
    for (let i = 0; i < 46; i++) {
        const x = f0 + rnd() * fw;
        const y = f0 + rnd() * fh;
        const r = Math.min(fw, fh) * (.025 + rnd() * .11);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, hexA(worn, .022 + rnd() * .05));
        g.addColorStop(.65, hexA(worn, .01));
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let y = 0; y < H; y += 3) {
        ctx.globalAlpha = .018;
        ctx.strokeStyle = rnd() > .5 ? "#f4dfb6" : "#2a1712";
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y + (rnd() - .5) * 1.6);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 240; i++) {
        ctx.fillStyle = hexA(rnd() > .5 ? cream : indigo, .05 + rnd() * .08);
        ctx.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 5, 1);
    }
    softenEdges(ctx, W, H, "rgba(27,15,11,0.38)", .85);
    noiseSpeckle(ctx, rnd, W, H, 7e3, [ cream, fieldDeep, indigo, gold, rose ], 1.1, .04);
    const map = makeTexture(canvas, {
        anisotropy: 16
    });
    const bump = makeTexture(canvas, {
        srgb: false,
        anisotropy: 8
    });
    return {
        map: map,
        bump: bump,
        canvas: canvas
    };
}

function cornerMix(a, b, t = .5) {
    const pa = parseInt(a.slice(1), 16);
    const pb = parseInt(b.slice(1), 16);
    const ar = pa >> 16 & 255, ag = pa >> 8 & 255, ab = pa & 255;
    const br = pb >> 16 & 255, bg = pb >> 8 & 255, bb = pb & 255;
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const bl = Math.round(ab + (bb - ab) * t);
    return `#${(r << 16 | g << 8 | bl).toString(16).padStart(6, "0")}`;
}

function drawVine(ctx, pts, color, width) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
        const p = pts[i], pp = pts[i - 1];
        const mx = (p[0] + pp[0]) / 2, my = (p[1] + pp[1]) / 2;
        ctx.quadraticCurveTo(pp[0], pp[1], mx, my);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last[0], last[1]);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.stroke();
}

function drawGlassFlower(ctx, x, y, r, rotate, colors, lead, petals = 6) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotate);
    const aura = ctx.createRadialGradient(0, 0, r * .1, 0, 0, r * 2.2);
    aura.addColorStop(0, hexA(colors[2], .38));
    aura.addColorStop(.55, hexA(colors[1], .11));
    aura.addColorStop(1, hexA(colors[1], 0));
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.2, 0, TAU);
    ctx.fill();
    for (let i = 0; i < petals; i++) {
        ctx.save();
        ctx.rotate(i / petals * TAU);
        const g = ctx.createLinearGradient(0, 0, 0, -r * 1.28);
        g.addColorStop(0, colors[0]);
        g.addColorStop(.58, colors[1]);
        g.addColorStop(1, colors[2]);
        ctx.beginPath();
        ctx.moveTo(0, -r * .13);
        ctx.bezierCurveTo(-r * .48, -r * .28, -r * .52, -r * .9, 0, -r * 1.22);
        ctx.bezierCurveTo(r * .52, -r * .9, r * .48, -r * .28, 0, -r * .13);
        ctx.closePath();
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = lead;
        ctx.lineWidth = Math.max(2.4, r * .045);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -r * .26);
        ctx.quadraticCurveTo(r * .06, -r * .7, 0, -r * 1.02);
        ctx.strokeStyle = hexA(colors[3], .46);
        ctx.lineWidth = Math.max(1, r * .025);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(-r * .1, -r * .7, r * .07, r * .26, -.16, 0, TAU);
        ctx.fillStyle = hexA(colors[3], .18);
        ctx.fill();
        ctx.restore();
    }
    for (let i = 0; i < 7; i++) {
        const a = i / 7 * TAU + .3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(Math.cos(a) * r * .2, Math.sin(a) * r * .2, Math.cos(a) * r * .3, Math.sin(a) * r * .3);
        ctx.strokeStyle = colors[4] || lead;
        ctx.lineWidth = Math.max(1.2, r * .018);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r * .32, Math.sin(a) * r * .32, r * .028, 0, TAU);
        ctx.fillStyle = colors[4] || lead;
        ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, r * .09, 0, TAU);
    ctx.fillStyle = colors[4] || colors[0];
    ctx.fill();
    ctx.strokeStyle = lead;
    ctx.lineWidth = Math.max(2, r * .035);
    ctx.stroke();
    ctx.restore();
}

function drawGlassLeaf(ctx, x, y, len, angle, lead, fillA, fillB) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const g = ctx.createLinearGradient(0, 0, 0, -len);
    g.addColorStop(0, fillA);
    g.addColorStop(1, fillB);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-len * .3, -len * .12, -len * .33, -len * .72, 0, -len);
    ctx.bezierCurveTo(len * .33, -len * .72, len * .3, -len * .12, 0, 0);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = lead;
    ctx.lineWidth = Math.max(1.6, len * .028);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -len * .04);
    ctx.quadraticCurveTo(len * .05, -len * .5, 0, -len * .92);
    ctx.strokeStyle = hexA(lead, .55);
    ctx.lineWidth = Math.max(1, len * .018);
    ctx.stroke();
    for (let i = 1; i < 5; i++) {
        const t = i / 6;
        ctx.beginPath();
        ctx.moveTo(0, -len * t);
        ctx.quadraticCurveTo(-len * .22, -len * (t + .05), -len * .3, -len * (t + .13));
        ctx.moveTo(0, -len * t);
        ctx.quadraticCurveTo(len * .22, -len * (t + .05), len * .3, -len * (t + .13));
        ctx.strokeStyle = hexA(lead, .28);
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    ctx.restore();
}

function drawGlassVine(ctx, pts, lead, greenA, greenB) {
    drawVine(ctx, pts, lead, 7);
    drawVine(ctx, pts, hexA(greenA, .7), 4);
    for (let i = 1; i < pts.length; i++) {
        const p = pts[i], pp = pts[i - 1];
        const dx = p[0] - pp[0], dy = p[1] - pp[1];
        const a = Math.atan2(dy, dx);
        for (const side of [ -1, 1 ]) {
            const t = .35 + i % 3 * .2;
            const x = pp[0] + dx * t + side * 22;
            const y = pp[1] + dy * t;
            drawGlassLeaf(ctx, x, y, 62 + i % 2 * 26, a + side * 1.03 - Math.PI / 2, lead, greenA, greenB);
            if (i % 3 === 0) {
                drawGlassLeaf(ctx, x + side * 28, y + 24, 42, a + side * .5 - Math.PI / 2, lead, greenB, greenA);
            }
        }
    }
}

export function createStainedGlass(options = {}) {
    const S = 1600;
    const {canvas: canvas, ctx: ctx} = makeCanvas(S, S);
    const rnd = rng(1902);
    const lead = "#2e1b12";
    const leadSoft = "#4a2e1c";
    const gold = {
        deep: "#b97024",
        mid: "#e2a63d",
        light: "#f4cc67",
        cream: "#ffe9b2",
        ink: "#623b1a"
    };
    const amber = {
        deep: "#ac5f26",
        mid: "#d88731",
        light: "#eeb75a",
        cream: "#ffe1a0",
        ink: "#5e3518"
    };
    const rose = {
        deep: "#8b4b3d",
        mid: "#b66d57",
        light: "#dcaa84",
        cream: "#f2d7b2",
        ink: "#4a281c"
    };
    const pale = {
        deep: "#a98a48",
        mid: "#d2b167",
        light: "#ecd48e",
        cream: "#f8e9bd",
        ink: "#5f4724"
    };
    const leafA = "#7d935f";
    const leafB = "#b2c17f";
    const leafC = "#d2dca3";
    const bg = ctx.createLinearGradient(0, 0, 0, S);
    bg.addColorStop(0, "#c9cfa1");
    bg.addColorStop(.22, "#cdc995");
    bg.addColorStop(.48, "#b9c487");
    bg.addColorStop(.72, "#9fb377");
    bg.addColorStop(1, "#7f9464");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, S, S);
    const glow = ctx.createRadialGradient(S * .5, S * .33, S * .02, S * .5, S * .36, S * .7);
    glow.addColorStop(0, "rgba(255,247,205,0.62)");
    glow.addColorStop(.4, "rgba(255,225,153,0.17)");
    glow.addColorStop(1, "rgba(141,163,104,0.02)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, S, S);
    const sheetColors = [ "#e7c978", "#c9d6a5", "#a9c07f", "#dcc27f", "#c19570", "#8fa96c", "#e8bd68", "#b85840", "#c8dbe2", "#d9dcc4" ];
    for (let i = 0; i < 118; i++) {
        const x = rnd() * S, y = rnd() * S;
        const w = 130 + rnd() * 420, h = 120 + rnd() * 430;
        const tint = sheetColors[rnd() * sheetColors.length | 0];
        ctx.beginPath();
        ctx.moveTo(x, y + h * .35);
        ctx.bezierCurveTo(x + w * .18, y - h * .14, x + w * .58, y - h * .2, x + w, y + h * .18);
        ctx.bezierCurveTo(x + w * .84, y + h * .76, x + w * .26, y + h * .98, x, y + h * .35);
        ctx.fillStyle = hexA(tint, .1 + rnd() * .16);
        ctx.fill();
    }
    for (let i = 0; i < 3e3; i++) {
        ctx.beginPath();
        ctx.arc(rnd() * S, rnd() * S, .4 + rnd() * 3.4, 0, TAU);
        ctx.fillStyle = hexA(rnd() > .5 ? "#fff2c8" : "#6b7952", .025 + rnd() * .06);
        ctx.fill();
    }
    const margin = S * .038;
    const springY = S * .501;
    const archOuter = () => {
        ctx.beginPath();
        ctx.moveTo(margin, S - margin);
        ctx.lineTo(margin, springY);
        ctx.bezierCurveTo(margin, springY * .52, S * .18, margin, S * .5, margin);
        ctx.bezierCurveTo(S * .82, margin, S - margin, springY * .52, S - margin, springY);
        ctx.lineTo(S - margin, S - margin);
    };
    ctx.save();
    ctx.strokeStyle = lead;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 18;
    archOuter();
    ctx.closePath();
    ctx.stroke();
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(margin + 36, S - margin - 24);
    ctx.lineTo(margin + 36, springY);
    ctx.bezierCurveTo(margin + 36, springY * .55 + 24, S * .2, margin + 36, S * .5, margin + 36);
    ctx.bezierCurveTo(S * .8, margin + 36, S - margin - 36, springY * .55 + 24, S - margin - 36, springY);
    ctx.lineTo(S - margin - 36, S - margin - 24);
    ctx.stroke();
    for (const f of [ 1 / 3, 2 / 3 ]) {
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(S * f, S - margin - 8);
        ctx.lineTo(S * f, springY + 20);
        ctx.stroke();
    }
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(margin + 8, springY);
    ctx.lineTo(S - margin - 8, springY);
    ctx.stroke();
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(margin + 8, S * .815);
    ctx.lineTo(S - margin - 8, S * .815);
    ctx.stroke();
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(S * .232, springY);
    ctx.bezierCurveTo(S * .25, S * .22, S * .35, S * .1, S * .5, S * .085);
    ctx.bezierCurveTo(S * .65, S * .1, S * .75, S * .22, S * .768, springY);
    ctx.stroke();
    for (const side of [ -1, 1 ]) {
        const x0 = S * .5 + side * S * .25;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(x0, springY - 4);
        ctx.bezierCurveTo(x0 + side * S * .06, S * .33, x0 - side * S * .015, S * .2, S * .5 + side * S * .035, S * .15);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x0, springY - 4);
        ctx.bezierCurveTo(x0 + side * S * .02, S * .4, x0 + side * S * .16, S * .35, x0 + side * S * .2, S * .33);
        ctx.stroke();
    }
    for (let i = 0; i < 22; i++) {
        const t = i / 22;
        const x = S * .11 + t * S * .78;
        const y = S - margin - 17;
        ctx.beginPath();
        ctx.arc(x, y, 7.5, 0, TAU);
        ctx.fillStyle = i % 3 === 0 ? "#d9aa54" : i % 3 === 1 ? "#b56b4b" : "#9eae74";
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = lead;
        ctx.stroke();
    }
    for (const side of [ -1, 1 ]) {
        for (let i = 0; i < 13; i++) {
            const y = springY + i * (S - springY - margin - 22) / 13;
            ctx.beginPath();
            ctx.arc(margin + 17, y, 6, 0, TAU);
            ctx.fillStyle = i % 3 === 0 ? "#e0b661" : i % 3 === 1 ? "#b96c4e" : "#a5b67c";
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = lead;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(S - margin - 17, y, 6, 0, TAU);
            ctx.fillStyle = i % 3 === 1 ? "#e0b661" : i % 3 === 2 ? "#b96c4e" : "#a5b67c";
            ctx.fill();
            ctx.stroke();
        }
    }
    ctx.restore();
    const vines = [ [ [ .11, .97 ], [ .14, .79 ], [ .1, .64 ], [ .18, .52 ], [ .15, .4 ], [ .23, .27 ], [ .29, .2 ] ], [ [ .89, .97 ], [ .86, .79 ], [ .9, .64 ], [ .82, .52 ], [ .85, .4 ], [ .77, .27 ], [ .71, .2 ] ], [ [ .5, .98 ], [ .47, .83 ], [ .53, .73 ], [ .45, .62 ], [ .51, .51 ], [ .48, .39 ], [ .5, .28 ] ], [ [ .3, .98 ], [ .34, .84 ], [ .29, .71 ], [ .36, .58 ], [ .32, .45 ], [ .38, .34 ] ], [ [ .7, .98 ], [ .66, .84 ], [ .71, .71 ], [ .64, .58 ], [ .68, .45 ], [ .62, .34 ] ] ];
    for (const v of vines) {
        drawGlassVine(ctx, v.map(([x, y]) => [ x * S, y * S ]), lead, leafA, leafB);
    }
    for (const [x, y, r, a] of [ [ .2, .6, 42, .6 ], [ .8, .58, 38, -2.4 ], [ .37, .71, 30, -1.1 ], [ .63, .72, 30, 2.4 ], [ .33, .36, 26, 1.7 ], [ .67, .36, 26, 1.4 ], [ .5, .86, 26, -1.6 ] ]) {
        ctx.beginPath();
        for (let i = 0; i <= 30; i++) {
            const t = i / 30;
            const rr = r * (1 - t * .72) * (S / 1600);
            const ang = a + t * Math.PI * 2.2;
            const px = x * S + Math.cos(ang) * rr;
            const py = y * S + Math.sin(ang) * rr;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.strokeStyle = lead;
        ctx.lineWidth = 3.2;
        ctx.stroke();
        ctx.strokeStyle = hexA(leafB, .6);
        ctx.lineWidth = 1.2;
        ctx.stroke();
    }
    const bud = (x, y, len, angle, colors) => {
        drawGlassLeaf(ctx, x, y, len, angle, lead, colors[0], colors[1]);
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(angle) * len * .9, y + Math.sin(angle) * len * .9, len * .14, len * .26, angle + .4, 0, TAU);
        ctx.fillStyle = colors[1];
        ctx.fill();
        ctx.strokeStyle = lead;
        ctx.lineWidth = 3;
        ctx.stroke();
    };
    drawGlassFlower(ctx, S * .5, S * .163, S * .06, .1, [ gold.deep, gold.mid, gold.light, gold.cream, gold.ink ], lead, 9);
    drawGlassFlower(ctx, S * .385, S * .195, S * .042, -.28, [ amber.deep, amber.mid, amber.light, amber.cream, amber.ink ], lead, 8);
    drawGlassFlower(ctx, S * .615, S * .195, S * .042, .25, [ amber.deep, amber.mid, amber.light, amber.cream, amber.ink ], lead, 8);
    drawGlassFlower(ctx, S * .29, S * .27, S * .048, .4, [ amber.deep, amber.mid, amber.light, amber.cream, amber.ink ], lead, 8);
    drawGlassFlower(ctx, S * .71, S * .27, S * .048, -.4, [ gold.deep, gold.mid, gold.light, gold.cream, gold.ink ], lead, 8);
    drawGlassFlower(ctx, S * .215, S * .365, S * .038, .15, [ rose.deep, rose.mid, rose.light, rose.cream, rose.ink ], lead, 7);
    drawGlassFlower(ctx, S * .785, S * .365, S * .038, -.15, [ rose.deep, rose.mid, rose.light, rose.cream, rose.ink ], lead, 7);
    drawGlassFlower(ctx, S * .45, S * .29, S * .03, .7, [ pale.deep, pale.mid, pale.light, pale.cream, pale.ink ], lead, 7);
    drawGlassFlower(ctx, S * .55, S * .3, S * .028, -.6, [ gold.deep, gold.mid, gold.light, gold.cream, gold.ink ], lead, 7);
    for (const [x, y, r, colors] of [ [ .105, .55, .038, rose ], [ .105, .68, .032, amber ], [ .105, .8, .035, pale ], [ .895, .55, .035, gold ], [ .895, .68, .038, rose ], [ .895, .81, .031, amber ], [ .075, .9, .036, amber ], [ .925, .9, .036, gold ], [ .16, .46, .025, amber ], [ .84, .46, .025, rose ] ]) {
        drawGlassFlower(ctx, S * x, S * y, S * r, x * 7, [ colors.deep, colors.mid, colors.light, colors.cream, colors.ink ], lead, 6);
    }
    for (let i = 0; i < 14; i++) {
        const x = S * (.08 + rnd() * .84);
        const y = S * (.08 + rnd() * .43);
        const pal = [ amber, gold, rose, pale ][rnd() * 4 | 0];
        drawGlassFlower(ctx, x, y, S * (.01 + rnd() * .014), rnd() * TAU, [ pal.deep, pal.mid, pal.light, pal.cream, pal.ink ], lead, 5);
    }
    for (const side of [ -1, 1 ]) {
        const pts = [ [ S * (.5 + side * .11), S * .965 ], [ S * (.5 + side * .18), S * .78 ], [ S * (.5 + side * .12), S * .61 ], [ S * (.5 + side * .2), S * .46 ], [ S * (.5 + side * .17), S * .31 ], [ S * (.5 + side * .22), S * .19 ] ];
        drawGlassVine(ctx, pts, lead, leafA, leafB);
    }
    for (const side of [ -1, 1 ]) {
        const x = S * (.5 + side * .25);
        for (let i = 0; i < 9; i++) {
            const yy = S * (.5 + i * .035);
            drawGlassFlower(ctx, x + Math.sin(i * 1.8) * S * .018, yy, S * (.013 - i * 6e-4), rnd() * TAU, [ pale.deep, pale.mid, pale.light, pale.cream, pale.ink ], lead, 5);
        }
    }
    bud(S * .46, S * .37, S * .034, -1.25, [ leafB, leafC ]);
    bud(S * .54, S * .37, S * .03, -1.9, [ leafB, leafC ]);
    bud(S * .27, S * .44, S * .028, .35, [ amber.mid, gold.light ]);
    bud(S * .72, S * .44, S * .03, -.35, [ rose.mid, rose.light ]);
    bud(S * .36, S * .49, S * .022, -.2, [ pale.mid, pale.light ]);
    bud(S * .6, S * .48, S * .023, .3, [ amber.mid, gold.light ]);
    bud(S * .14, S * .62, S * .02, .2, [ rose.mid, rose.light ]);
    bud(S * .86, S * .7, S * .023, -.4, [ gold.mid, gold.light ]);
    for (let i = 0; i < 20; i++) {
        const px = S * (.08 + rnd() * .84);
        const py = S * (.32 + rnd() * .6);
        drawGlassLeaf(ctx, px, py, 10 + rnd() * 16, rnd() * TAU, lead, rnd() > .5 ? gold.light : rose.light, rnd() > .5 ? gold.cream : rose.cream);
    }
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < 14; i++) {
        const x = rnd() * S, y = rnd() * S;
        const w = 120 + rnd() * 380;
        const h = 30 + rnd() * 120;
        const g = ctx.createLinearGradient(x, y, x + w, y + h);
        g.addColorStop(0, "rgba(255,247,214,0)");
        g.addColorStop(.5, "rgba(255,247,214,0.12)");
        g.addColorStop(1, "rgba(255,247,214,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(x, y, w / 2, h / 2, -.5 + rnd() * .4, 0, TAU);
        ctx.fill();
    }
    ctx.restore();
    const crownGlow = ctx.createRadialGradient(S * .5, S * .29, 0, S * .5, S * .29, S * .48);
    crownGlow.addColorStop(0, "rgba(255,247,211,0.0)");
    crownGlow.addColorStop(.55, "rgba(255,236,176,0.055)");
    crownGlow.addColorStop(1, "rgba(255,220,150,0)");
    ctx.fillStyle = crownGlow;
    ctx.fillRect(0, 0, S, S);
    const vig = ctx.createRadialGradient(S * .5, S * .55, S * .24, S * .5, S * .55, S * .78);
    vig.addColorStop(0, "rgba(34,20,10,0)");
    vig.addColorStop(1, "rgba(34,20,10,0.16)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, S, S);
    const paneL = {
        x0: S * .173,
        x1: S * .492,
        y0: S * .525,
        y1: S * .958
    };
    const paneR = {
        x0: S * .508,
        x1: S * .827,
        y0: S * .525,
        y1: S * .958
    };
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    for (const pane of [ paneL, paneR ]) {
        const gx = ctx.createLinearGradient(pane.x0, 0, pane.x1, 0);
        gx.addColorStop(0, "rgba(0,0,0,0.86)");
        gx.addColorStop(.05, "rgba(0,0,0,0.985)");
        gx.addColorStop(.95, "rgba(0,0,0,0.985)");
        gx.addColorStop(1, "rgba(0,0,0,0.86)");
        ctx.fillStyle = gx;
        ctx.fillRect(pane.x0, pane.y0, pane.x1 - pane.x0, pane.y1 - pane.y0);
        const gy = ctx.createLinearGradient(0, pane.y1 - S * .025, 0, pane.y1);
        gy.addColorStop(0, "rgba(0,0,0,0)");
        gy.addColorStop(1, "rgba(0,0,0,0.94)");
        ctx.fillStyle = gy;
        ctx.fillRect(pane.x0, pane.y1 - S * .025, pane.x1 - pane.x0, S * .025);
    }
    ctx.restore();
    ctx.save();
    const paneTint = ctx.createLinearGradient(0, paneL.y0, 0, paneL.y1);
    paneTint.addColorStop(0, "rgba(239,205,125,0.035)");
    paneTint.addColorStop(.45, "rgba(208,215,160,0.02)");
    paneTint.addColorStop(1, "rgba(155,184,130,0.028)");
    ctx.fillStyle = paneTint;
    ctx.fillRect(paneL.x0, paneL.y0, paneR.x1 - paneL.x0, paneL.y1 - paneL.y0);
    ctx.strokeStyle = lead;
    ctx.lineWidth = 5;
    ctx.strokeRect(paneL.x0 + 3, paneL.y0 + 3, paneL.x1 - paneL.x0 - 6, paneL.y1 - paneL.y0 - 6);
    ctx.strokeRect(paneR.x0 + 3, paneR.y0 + 3, paneR.x1 - paneR.x0 - 6, paneR.y1 - paneR.y0 - 6);
    for (const [x, mirror] of [ [ paneL.x0 + S * .03, 1 ], [ paneL.x1 - S * .025, -1 ], [ paneR.x0 + S * .025, 1 ], [ paneR.x1 - S * .03, -1 ] ]) {
        const pts = [ [ x, paneL.y1 - S * .012 ], [ x + mirror * S * .022, paneL.y1 - S * .1 ], [ x - mirror * S * .012, paneL.y1 - S * .2 ], [ x + mirror * S * .02, paneL.y1 - S * .3 ], [ x - mirror * S * .005, paneL.y1 - S * .38 ] ];
        drawGlassVine(ctx, pts, lead, leafA, leafB);
        for (let i = 0; i < 5; i++) {
            const yy = paneL.y1 - S * (.045 + i * .066);
            drawGlassFlower(ctx, x + (i % 2 ? mirror : -mirror) * S * .027, yy, S * (.011 - i * 6e-4), rnd() * TAU, [ amber.deep, amber.mid, amber.light, amber.cream, amber.ink ], lead, 5);
        }
    }
    for (const [cxPane, dir] of [ [ paneL.x0 + S * .026, 1 ], [ paneR.x1 - S * .026, -1 ] ]) {
        const vine = [ [ cxPane, paneL.y1 - S * .02 ], [ cxPane + dir * S * .026, S * .8 ], [ cxPane - dir * S * .006, S * .69 ], [ cxPane + dir * S * .022, S * .6 ] ];
        drawGlassVine(ctx, vine, lead, leafA, leafB);
    }
    ctx.save();
    ctx.globalAlpha = .18;
    ctx.strokeStyle = leadSoft;
    ctx.lineWidth = 2;
    for (const pane of [ paneL, paneR ]) {
        for (let k = 0; k < 4; k++) {
            ctx.beginPath();
            ctx.moveTo(pane.x0 + k / 4 * (pane.x1 - pane.x0), pane.y0);
            ctx.lineTo(pane.x1 - k / 4 * (pane.x1 - pane.x0), pane.y1);
            ctx.stroke();
        }
    }
    ctx.restore();
    for (const side of [ 1, -1 ]) {
        const x0 = S * (.5 + side * .17);
        const pts = [ [ x0, S * .94 ], [ x0 + side * S * .07, S * .925 ], [ x0 + side * S * .14, S * .945 ], [ x0 + side * S * .21, S * .928 ] ];
        drawGlassVine(ctx, pts, lead, leafA, leafB);
        for (let i = 0; i < 4; i++) {
            drawGlassFlower(ctx, x0 + side * S * (.035 + i * .05), S * (.935 + i % 2 * .012), S * .012, rnd() * TAU, [ rose.deep, rose.mid, rose.light, rose.cream, rose.ink ], lead, 5);
        }
    }
    ctx.globalAlpha = .035;
    for (let i = 0; i < 16; i++) {
        const x = paneL.x0 + rnd() * (paneR.x1 - paneL.x0);
        const y = paneL.y0 + rnd() * (paneL.y1 - paneL.y0);
        ctx.strokeStyle = rnd() > .5 ? "#f8f3d9" : "#d3ddb4";
        ctx.lineWidth = .8 + rnd() * 1.6;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + 30, y - 20, x + 90, y + 10);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    const glassTex = makeTexture(canvas, {
        anisotropy: 16
    });
    const PS = 900;
    const proj = makeCanvas(PS, PS);
    const small = makeCanvas(PS, PS);
    small.ctx.drawImage(canvas, 0, 0, PS, PS);
    const src = small.ctx.getImageData(0, 0, PS, PS).data;
    const out = proj.ctx.createImageData(PS, PS);
    const dst = out.data;
    for (let i = 0; i < src.length; i += 4) {
        const r = src[i] / 255, g = src[i + 1] / 255, b = src[i + 2] / 255;
        const alpha = src[i + 3] / 255;
        const luma = .2126 * r + .7152 * g + .0722 * b;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        const sat = mx > .001 ? (mx - mn) / mx : 0;
        const glassness = smoothstep(.18, .72, alpha);
        const keep = smoothstep(.06, .3, sat);
        const boosted = Math.min(1, luma + (r - luma) * (1.25 + keep * .8));
        const boostG = Math.min(1, luma + (g - luma) * (1.25 + keep * .8));
        const boostB = Math.min(1, luma + (b - luma) * (1.25 + keep * .8));
        const glow = .72 + .32 * Math.min(1, luma * 1.5);
        const sr = 1, sg = .9, sb = .7;
        dst[i] = Math.min(255, (sr * (1 - glassness) + boosted * glow * glassness) * 255);
        dst[i + 1] = Math.min(255, (sg * (1 - glassness) + boostG * glow * glassness) * 255);
        dst[i + 2] = Math.min(255, (sb * (1 - glassness) + boostB * glow * glassness) * 255);
        dst[i + 3] = 255;
    }
    proj.ctx.putImageData(out, 0, 0);
    const maskSpring = PS * .501;
    proj.ctx.globalCompositeOperation = "destination-in";
    proj.ctx.beginPath();
    proj.ctx.moveTo(0, PS);
    proj.ctx.lineTo(0, maskSpring);
    proj.ctx.bezierCurveTo(0, maskSpring * .55, PS * .16, 0, PS * .5, 0);
    proj.ctx.bezierCurveTo(PS * .84, 0, PS, maskSpring * .55, PS, maskSpring);
    proj.ctx.lineTo(PS, PS);
    proj.ctx.closePath();
    proj.ctx.fill();
    proj.ctx.globalCompositeOperation = "destination-over";
    proj.ctx.fillStyle = "#000";
    proj.ctx.fillRect(0, 0, PS, PS);
    proj.ctx.globalCompositeOperation = "source-over";
    const projTex = makeTexture(proj.canvas, {
        anisotropy: 8
    });
    return {
        map: glassTex,
        projection: projTex,
        canvas: canvas,
        goboCanvas: proj.canvas
    };
}

export function createVelvet(options = {}) {
    const {base: base = "#75412f", highlight: highlight = "#9e6046", seed: seed = 5, W: W = 512, H: H = 512} = options;
    const {canvas: canvas, ctx: ctx} = makeCanvas(W, H);
    const rnd = rng(seed);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 9e3; i++) {
        ctx.globalAlpha = .015 + rnd() * .04;
        ctx.fillStyle = rnd() > .5 ? highlight : "#3a1e16";
        const x = rnd() * W, y = rnd() * H;
        ctx.fillRect(x, y, .6 + rnd() * 1.6, 1 + rnd() * 8);
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 26; i++) {
        const x = rnd() * W, y = rnd() * H;
        const r = 10 + rnd() * 70;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, hexA(highlight, .06));
        g.addColorStop(.5, hexA("#2b1710", .03));
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    return {
        map: makeTexture(canvas, {
            wrap: true
        }),
        bump: makeTexture(canvas, {
            wrap: true,
            srgb: false
        })
    };
}

function paperGrain(ctx, W, H, rnd, alpha = .05) {
    for (let i = 0; i < 4500; i++) {
        ctx.globalAlpha = alpha * rnd();
        ctx.fillStyle = rnd() > .5 ? "#2a1a0e" : "#fff2d0";
        ctx.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 2.5, 1 + rnd() * 2);
    }
    ctx.globalAlpha = 1;
}

function fabricBase(ctx, W, H, color, rnd) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 2) {
        ctx.globalAlpha = .03;
        ctx.strokeStyle = rnd() > .5 ? "#fff4da" : "#2e1e14";
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
    }
    for (let x = 0; x < W; x += 3) {
        ctx.globalAlpha = .022;
        ctx.strokeStyle = rnd() > .5 ? "#fff4da" : "#2e1e14";
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
    paperGrain(ctx, W, H, rnd, .035);
}

export function createPillowTextures() {
    const S = 512;
    const textures = {};
    {
        const {canvas: canvas, ctx: ctx} = makeCanvas(S, S);
        const rnd = rng(17);
        fabricBase(ctx, S, S, "#334253", rnd);
        const motif = (x, y, s, c1, c2) => {
            drawDiamondGul(ctx, x, y, s, s * 1.25, [ c1, "#b16e58", "#d8c099", c2 ], "#1c2530");
            ctx.strokeStyle = "rgba(231,210,170,.55)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x - s, y);
            ctx.lineTo(x + s, y);
            ctx.stroke();
        };
        for (let iy = 0; iy < 4; iy++) for (let ix = 0; ix < 4; ix++) {
            motif(64 + ix * 128 + iy % 2 * 22, 60 + iy * 130, 36, iy % 2 ? "#b56f58" : "#d8b990", iy % 2 ? "#d8c099" : "#8e5348");
        }
        ctx.strokeStyle = "#d6bf95";
        ctx.lineWidth = 18;
        ctx.strokeRect(9, 9, S - 18, S - 18);
        ctx.strokeStyle = "#7e4b41";
        ctx.lineWidth = 4;
        ctx.strokeRect(23, 23, S - 46, S - 46);
        for (let i = 0; i < 18; i++) {
            drawBorderMotif(ctx, 28 + i * 26, 15, 9, [ "#d6bf95", "#334253", "#b16e58", "#d6bf95" ], i % 2 ? 0 : Math.PI);
            drawBorderMotif(ctx, 28 + i * 26, S - 15, 9, [ "#d6bf95", "#334253", "#b16e58", "#d6bf95" ], i % 2 ? Math.PI : 0);
        }
        textures.kilim = {
            map: makeTexture(canvas),
            bump: makeTexture(canvas, {
                srgb: false
            })
        };
    }
    {
        const {canvas: canvas, ctx: ctx} = makeCanvas(S, S);
        const rnd = rng(31);
        fabricBase(ctx, S, S, "#cfad91", rnd);
        for (let i = 0; i < 18; i++) {
            const x = 30 + rnd() * (S - 60), y = 30 + rnd() * (S - 60);
            const r = 12 + rnd() * 20;
            for (let l = 0; l < 4; l++) {
                const a = l / 4 * TAU + rnd();
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(a);
                ctx.beginPath();
                ctx.ellipse(0, -r * 1.2, r * .23, r * .62, .2, 0, TAU);
                ctx.fillStyle = l % 2 ? "#65735b" : "#7d8a68";
                ctx.fill();
                ctx.strokeStyle = "rgba(45,50,35,.45)";
                ctx.lineWidth = 1.3;
                ctx.stroke();
                ctx.restore();
            }
            for (let ring = 0; ring < 4; ring++) {
                const rr = r * (1 - ring * .19);
                for (let p = 0; p < 5 + ring; p++) {
                    const a = p / (5 + ring) * TAU + ring * .5;
                    ctx.beginPath();
                    ctx.ellipse(x + Math.cos(a) * rr * .3, y + Math.sin(a) * rr * .3, rr * .38, rr * .22, a, 0, TAU);
                    ctx.fillStyle = ring % 2 ? "#b1716a" : "#c6867c";
                    ctx.globalAlpha = .9;
                    ctx.fill();
                    ctx.strokeStyle = "rgba(94,51,44,.28)";
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.arc(x, y, r * .18, 0, TAU);
            ctx.fillStyle = "#7b5741";
            ctx.fill();
        }
        for (let i = 0; i < 9; i++) {
            drawVine(ctx, [ [ 10, 50 + i * 52 ], [ 130, 20 + i * 50 ], [ 300, 80 + i * 48 ], [ 500, 35 + i * 50 ] ], "rgba(84,99,75,.45)", 2);
        }
        ctx.strokeStyle = "#8f5b51";
        ctx.lineWidth = 14;
        ctx.strokeRect(7, 7, S - 14, S - 14);
        ctx.strokeStyle = "#d8baa1";
        ctx.lineWidth = 3;
        ctx.strokeRect(19, 19, S - 38, S - 38);
        textures.floral = {
            map: makeTexture(canvas),
            bump: makeTexture(canvas, {
                srgb: false
            })
        };
    }
    {
        const {canvas: canvas, ctx: ctx} = makeCanvas(S, S);
        const rnd = rng(44);
        fabricBase(ctx, S, S, "#b77b4c", rnd);
        for (let i = 0; i < 14; i++) {
            const x = i * 40 + 8;
            ctx.fillStyle = i % 3 === 0 ? "#3a4653" : i % 3 === 1 ? "#e0c793" : "#8c4e43";
            ctx.globalAlpha = .85;
            ctx.fillRect(x, 0, i % 3 === 1 ? 10 : 21, S);
        }
        ctx.globalAlpha = 1;
        for (let i = 0; i < 1200; i++) {
            ctx.fillStyle = rnd() > .4 ? "rgba(230,205,161,.35)" : "rgba(45,55,70,.3)";
            const x = rnd() * S, y = rnd() * S;
            ctx.fillRect(x, y, 1 + rnd() * 4, 3 + rnd() * 14);
        }
        for (let iy = 0; iy < 5; iy++) for (let ix = 0; ix < 5; ix++) {
            ctx.strokeStyle = "rgba(236,215,177,.6)";
            ctx.lineWidth = 3;
            const x = 60 + ix * 98, y = 60 + iy * 98;
            ctx.beginPath();
            ctx.moveTo(x, y - 25);
            ctx.lineTo(x + 25, y);
            ctx.lineTo(x, y + 25);
            ctx.lineTo(x - 25, y);
            ctx.closePath();
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, TAU);
            ctx.fillStyle = "rgba(44,58,73,.8)";
            ctx.fill();
        }
        textures.stripe = {
            map: makeTexture(canvas),
            bump: makeTexture(canvas, {
                srgb: false
            })
        };
    }
    {
        const {canvas: canvas, ctx: ctx} = makeCanvas(S, S);
        const rnd = rng(71);
        fabricBase(ctx, S, S, "#717759", rnd);
        const leaves = [ "#c7b88e", "#a8413b", "#ded0a9", "#8e9672" ];
        for (let i = 0; i < 12; i++) {
            const x0 = 30 + rnd() * 452, y0 = 30 + rnd() * 452;
            const angle = rnd() * TAU;
            const ln = 50 + rnd() * 130;
            ctx.save();
            ctx.translate(x0, y0);
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(ln * .3, -ln * .2, ln, 0);
            ctx.strokeStyle = "#d0c199";
            ctx.lineWidth = 3;
            ctx.stroke();
            for (let l = 0; l < 6; l++) {
                const t = (l + .6) / 7;
                const lx = ln * t;
                const ly = -ln * .12 * Math.sin(t * Math.PI);
                drawGlassLeaf(ctx, lx, ly, 25 + rnd() * 18, -Math.PI / 2 + (l % 2 ? .9 : -.9), "rgba(60,72,47,.5)", leaves[l % leaves.length], leaves[(l + 1) % leaves.length]);
            }
            ctx.restore();
        }
        ctx.strokeStyle = "#b3a67c";
        ctx.lineWidth = 10;
        ctx.strokeRect(11, 11, S - 22, S - 22);
        textures.botanical = {
            map: makeTexture(canvas),
            bump: makeTexture(canvas, {
                srgb: false
            })
        };
    }
    {
        const {canvas: canvas, ctx: ctx} = makeCanvas(S, S);
        const rnd = rng(94);
        fabricBase(ctx, S, S, "#6d3b3b", rnd);
        for (let iy = 0; iy < 6; iy++) for (let ix = 0; ix < 6; ix++) {
            const x = 42 + ix * 86 + iy % 2 * 43;
            const y = 42 + iy * 86;
            drawRosette(ctx, x, y, 22, "#c79867", "#b25e50", 8, "rgba(228,198,145,.5)", .85);
        }
        for (let i = 0; i < 7; i++) {
            drawVine(ctx, [ [ 0, 40 + i * 74 ], [ 150, 90 + i * 62 ], [ 330, 15 + i * 78 ], [ 512, 60 + i * 70 ] ], "rgba(221,191,139,.3)", 2);
        }
        textures.wine = {
            map: makeTexture(canvas),
            bump: makeTexture(canvas, {
                srgb: false
            })
        };
    }
    {
        const {canvas: canvas, ctx: ctx} = makeCanvas(S, S);
        const rnd = rng(101);
        fabricBase(ctx, S, S, "#d7c4a0", rnd);
        for (let iy = 0; iy < 4; iy++) for (let ix = 0; ix < 4; ix++) {
            const x = 60 + ix * 130 + iy % 2 * 35;
            const y = 60 + iy * 130;
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate((ix + iy) % 2 ? .2 : -.3);
            ctx.beginPath();
            ctx.moveTo(0, 30);
            ctx.bezierCurveTo(-42, 14, -18, -44, 8, -34);
            ctx.bezierCurveTo(38, -22, 21, 10, 3, 3);
            ctx.strokeStyle = "#8d5c54";
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.fillStyle = "rgba(72,89,103,.45)";
            ctx.beginPath();
            ctx.ellipse(0, 0, 17, 24, .4, 0, TAU);
            ctx.fill();
            ctx.restore();
        }
        ctx.strokeStyle = "rgba(86,104,108,.6)";
        ctx.lineWidth = 4;
        ctx.strokeRect(14, 14, S - 28, S - 28);
        ctx.strokeStyle = "rgba(148,90,79,.4)";
        ctx.lineWidth = 2;
        ctx.strokeRect(24, 24, S - 48, S - 48);
        textures.paisley = {
            map: makeTexture(canvas),
            bump: makeTexture(canvas, {
                srgb: false
            })
        };
    }
    return textures;
}

export function createChairTextile() {
    const W = 700, H = 700;
    const {canvas: canvas, ctx: ctx} = makeCanvas(W, H);
    const rnd = rng(731);
    const base = ctx.createLinearGradient(0, 0, W, H);
    base.addColorStop(0, "#586b6a");
    base.addColorStop(.5, "#4c6161");
    base.addColorStop(1, "#405657");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);
    const cream = "#cfc5ad";
    const sage = "#82937f";
    const rose = "#a27262";
    const gold = "#b1935e";
    const teal = "#6f8987";
    const ink = "#2e4041";
    const leaf = (x, y, len, ang, fill, alpha = .7) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang);
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-len * .45, -len * .14, -len * .36, -len * .72, 0, -len);
        ctx.bezierCurveTo(len * .38, -len * .72, len * .44, -len * .2, 0, 0);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = hexA(ink, .5);
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -len * .1);
        ctx.quadraticCurveTo(len * .06, -len * .5, 0, -len * .9);
        ctx.strokeStyle = hexA(ink, .35);
        ctx.lineWidth = .9;
        ctx.stroke();
        ctx.restore();
    };
    const flower = (x, y, r, petals = 8, fill = rose, alpha = .8) => {
        ctx.save();
        ctx.globalAlpha = alpha;
        for (let i = 0; i < petals; i++) {
            const a = i / petals * TAU;
            ctx.beginPath();
            ctx.ellipse(x + Math.cos(a) * r * .56, y + Math.sin(a) * r * .56, r * .32, r * .5, a, 0, TAU);
            ctx.fillStyle = fill;
            ctx.fill();
            ctx.strokeStyle = hexA(ink, .45);
            ctx.lineWidth = .8;
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(x, y, r * .22, 0, TAU);
        ctx.fillStyle = cream;
        ctx.fill();
        ctx.strokeStyle = hexA(ink, .5);
        ctx.lineWidth = .8;
        ctx.stroke();
        ctx.restore();
    };
    const vine = (x0, y0, x1, y1, bend, color = sage, alpha = .7) => {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo((x0 + x1) / 2 + bend, (y0 + y1) / 2, x1, y1);
        ctx.strokeStyle = hexA(color, alpha);
        ctx.lineWidth = 2.4;
        ctx.stroke();
    };
    const cells = [ [ 130, 145 ], [ 480, 145 ], [ 305, 330 ], [ 130, 530 ], [ 480, 530 ] ];
    for (const [cx, cy] of cells) {
        ctx.save();
        ctx.translate(cx, cy);
        vine(0, 105, 0, -60, 12, sage, .75);
        vine(0, 40, -70, -40, -40, teal, .65);
        vine(0, 40, 70, -40, 40, teal, .65);
        leaf(-28, 52, 58, .6, sage, .72);
        leaf(32, 34, 52, -.7, teal, .66);
        leaf(-18, 10, 44, .25, gold, .6);
        leaf(22, -18, 56, -.2, sage, .7);
        leaf(-44, -26, 46, 1, teal, .6);
        flower(0, -54, 29, 9, rose, .82);
        flower(-58, -36, 16, 7, gold, .7);
        flower(60, -25, 13, 7, cream, .6);
        for (const [dx, dy, rr, aa] of [ [ -82, 20, 20, 1.2 ], [ 82, 40, 24, -2.1 ], [ 28, 82, 16, 2.4 ] ]) {
            ctx.beginPath();
            for (let i = 0; i <= 20; i++) {
                const t = i / 20;
                const rad = rr * (1 - t * .8);
                const ang = aa + t * Math.PI * 2;
                const px = dx + Math.cos(ang) * rad, py = dy + Math.sin(ang) * rad;
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.strokeStyle = hexA(cream, .3);
            ctx.lineWidth = 1.2;
            ctx.stroke();
        }
        ctx.restore();
    }
    for (let i = 0; i < 26; i++) {
        const x = rnd() * W, y = rnd() * H;
        if (rnd() > .5) flower(x, y, 5 + rnd() * 8, 6, rnd() > .5 ? gold : cream, .3 + rnd() * .2); else leaf(x, y, 12 + rnd() * 22, rnd() * TAU, rnd() > .5 ? sage : teal, .22 + rnd() * .2);
    }
    ctx.globalAlpha = 1;
    for (let y = 0; y < H; y += 3) {
        ctx.fillStyle = hexA("#1d2c2c", .04);
        ctx.fillRect(0, y, W, 1);
    }
    for (let x = 0; x < W; x += 4) {
        ctx.fillStyle = hexA("#e4d7b8", .025);
        ctx.fillRect(x, 0, 1, H);
    }
    for (let i = 0; i < 8e3; i++) {
        ctx.fillStyle = hexA(rnd() > .5 ? "#1f3030" : "#e2d6b8", .02 + rnd() * .045);
        ctx.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 2, 1);
    }
    for (let i = 0; i < 9; i++) {
        const x = rnd() * W, y = rnd() * H, r = 50 + rnd() * 170;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, hexA("#e0d3b3", .1 + rnd() * .12));
        g.addColorStop(1, "rgba(224,211,179,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const edge = ctx.createRadialGradient(W * .5, H * .5, W * .2, W * .5, H * .5, W * .72);
    edge.addColorStop(0, "rgba(20,28,25,0)");
    edge.addColorStop(1, "rgba(20,28,25,0.3)");
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, W, H);
    const map = makeTexture(canvas, {
        anisotropy: 8
    });
    const bumpCanvas = makeCanvas(W, H);
    bumpCanvas.ctx.drawImage(canvas, 0, 0);
    const bump = makeTexture(bumpCanvas.canvas, {
        srgb: false,
        anisotropy: 4
    });
    return {
        map: map,
        bump: bump,
        canvas: canvas
    };
}

export function createThrowTexture() {
    const W = 640, H = 512;
    const {canvas: canvas, ctx: ctx} = makeCanvas(W, H);
    const rnd = rng(62);
    fabricBase(ctx, W, H, "#9d5a4b", rnd);
    for (let i = 0; i < 8; i++) {
        ctx.fillStyle = [ "#3c4d5d", "#d3b98c", "#7e3e3b", "#d99c72" ][i % 4];
        ctx.globalAlpha = .65;
        ctx.fillRect(0, i * 64, W, 22);
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 9; j++) {
            drawRosette(ctx, 38 + j * 70, 38 + i * 62, 17, "#dcc59d", "#a75d4d", 8, "rgba(49,62,74,.5)", .9);
        }
    }
    ctx.strokeStyle = "#e0cba3";
    ctx.lineWidth = 5;
    ctx.setLineDash([ 12, 10 ]);
    ctx.strokeRect(4, 4, W - 8, H - 8);
    ctx.setLineDash([]);
    return {
        map: makeTexture(canvas),
        bump: makeTexture(canvas, {
            srgb: false
        })
    };
}

export function createArtNouveauPoster() {
    const W = 700, H = 1080;
    const {canvas: canvas, ctx: ctx} = makeCanvas(W, H);
    const rnd = rng(1900);
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#d5b98d");
    bg.addColorStop(.5, "#c9a878");
    bg.addColorStop(1, "#b38f64");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    paperGrain(ctx, W, H, rnd, .16);
    const halo = ctx.createRadialGradient(W * .51, H * .32, 30, W * .51, H * .34, W * .42);
    halo.addColorStop(0, "rgba(238,210,150,0.95)");
    halo.addColorStop(.55, "rgba(218,180,116,0.4)");
    halo.addColorStop(1, "rgba(155,115,73,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#57422b";
    ctx.lineWidth = 8;
    ctx.strokeRect(26, 26, W - 52, H - 52);
    ctx.strokeStyle = "#8f713e";
    ctx.lineWidth = 2;
    ctx.strokeRect(42, 42, W - 84, H - 84);
    ctx.fillStyle = "#dfc68f";
    for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        ctx.arc(47, 70 + i * 46, 5, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(W - 47, 70 + i * 46, 5, 0, TAU);
        ctx.fill();
    }
    ctx.strokeStyle = "rgba(74,91,62,.8)";
    ctx.lineWidth = 4;
    for (const side of [ -1, 1 ]) {
        ctx.beginPath();
        ctx.moveTo(W * .5 + side * W * .43, H * .9);
        ctx.bezierCurveTo(W * .5 + side * W * .55, H * .68, W * .5 + side * W * .24, H * .58, W * .5 + side * W * .36, H * .36);
        ctx.bezierCurveTo(W * .5 + side * W * .43, H * .2, W * .5 + side * W * .2, H * .14, W * .5 + side * W * .31, H * .05);
        ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(W * .5, H * .32, 168, 0, TAU);
    ctx.strokeStyle = "rgba(108,81,44,.6)";
    ctx.lineWidth = 3;
    ctx.stroke();
    for (let i = 0; i < 22; i++) {
        const a = i / 22 * TAU;
        ctx.beginPath();
        ctx.arc(W * .5 + Math.cos(a) * 177, H * .32 + Math.sin(a) * 177, 5, 0, TAU);
        ctx.fillStyle = "rgba(90,68,36,.65)";
        ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(W * .5 - 72, H * .5);
    ctx.bezierCurveTo(W * .5 - 150, H * .42, W * .5 - 175, H * .22, W * .5 - 72, H * .16);
    ctx.bezierCurveTo(W * .5 - 36, H * .11, W * .5 + 24, H * .12, W * .5 + 55, H * .2);
    ctx.bezierCurveTo(W * .5 + 110, H * .28, W * .5 + 160, H * .3, W * .5 + 145, H * .55);
    ctx.bezierCurveTo(W * .5 + 115, H * .48, W * .5 + 95, H * .5, W * .5 + 82, H * .61);
    ctx.lineTo(W * .5 + 50, H * .49);
    ctx.closePath();
    ctx.fillStyle = "#5e3c2b";
    ctx.fill();
    ctx.strokeStyle = "#3d2a1c";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = "rgba(198,155,83,.6)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 13; i++) {
        ctx.beginPath();
        ctx.moveTo(W * .5 - 60 + i * 9, H * .17 + i % 3 * 5);
        ctx.bezierCurveTo(W * .5 - 130 + i * 8, H * .28, W * .5 + 70 + i * 5, H * .3, W * .5 + 88 + i * 2, H * .47);
        ctx.stroke();
    }
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(W * .5 + 12, H * .298, 58, 78, -.12, 0, TAU);
    ctx.fillStyle = "#e3c6a1";
    ctx.fill();
    ctx.strokeStyle = "#6d4c32";
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(W * .5 + 63, H * .29);
    ctx.bezierCurveTo(W * .5 + 74, H * .32, W * .5 + 73, H * .33, W * .5 + 63, H * .335);
    ctx.lineTo(W * .5 + 58, H * .345);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(W * .5 + 28, H * .292);
    ctx.quadraticCurveTo(W * .5 + 42, H * .282, W * .5 + 53, H * .293);
    ctx.strokeStyle = "#5a3c28";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(W * .5 + 46, H * .347);
    ctx.quadraticCurveTo(W * .5 + 56, H * .35, W * .5 + 62, H * .344);
    ctx.strokeStyle = "#a55446";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(W * .5 - 82, H * .39);
    ctx.bezierCurveTo(W * .5 - 180, H * .49, W * .5 - 210, H * .68, W * .5 - 230, H * .9);
    ctx.lineTo(W * .5 + 230, H * .9);
    ctx.bezierCurveTo(W * .5 + 190, H * .68, W * .5 + 155, H * .5, W * .5 + 96, H * .39);
    ctx.bezierCurveTo(W * .5 + 50, H * .47, W * .5 - 20, H * .45, W * .5 - 82, H * .39);
    ctx.closePath();
    ctx.fillStyle = "#758066";
    ctx.fill();
    ctx.strokeStyle = "#4f5a44";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = "rgba(216,199,154,.45)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
        ctx.beginPath();
        ctx.moveTo(W * .5 - 70 + i * 28, H * .44);
        ctx.bezierCurveTo(W * .5 - 110 + i * 31, H * .62, W * .5 - 140 + i * 38, H * .78, W * .5 - 160 + i * 45, H * .9);
        ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(W * .5 - 35, H * .365);
    ctx.bezierCurveTo(W * .5 - 59, H * .42, W * .5 - 78, H * .44, W * .5 - 95, H * .46);
    ctx.bezierCurveTo(W * .5 - 45, H * .51, W * .5 + 45, H * .51, W * .5 + 83, H * .45);
    ctx.bezierCurveTo(W * .5 + 62, H * .43, W * .5 + 40, H * .4, W * .5 + 30, H * .36);
    ctx.closePath();
    ctx.fillStyle = "#e3c6a1";
    ctx.fill();
    ctx.strokeStyle = "#6d4c32";
    ctx.lineWidth = 2;
    ctx.stroke();
    for (let i = 0; i < 11; i++) {
        const x = W * .5 + (rnd() - .5) * 260;
        const y = H * .2 + rnd() * 220;
        if (Math.abs(x - W * .5) < 80 && y < H * .36) continue;
        const colors = [ [ "#c87a55", "#d99b62", "#ecc98e", "#fae4b6", "#5e3c23" ], [ "#9c5041", "#bf7857", "#dcb278", "#f4d6a3", "#59371f" ] ][i % 2];
        drawGlassFlower(ctx, x, y, 20 + rnd() * 16, rnd() * TAU, colors, "#50331f", 6);
        drawGlassLeaf(ctx, x + 22, y + 5, 42 + rnd() * 22, rnd() * TAU, "#503923", "#78836b", "#abb08c");
    }
    ctx.fillStyle = "#4b3825";
    ctx.font = "italic 34px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("LA DAME", W * .5, H * .935);
    ctx.font = "22px Georgia, serif";
    ctx.fillText("DES FLEURS", W * .5, H * .963);
    softenEdges(ctx, W, H, "rgba(57,36,18,0.4)", .5);
    return makeTexture(canvas, {
        anisotropy: 8
    });
}

export function createBotanicalPrint() {
    const W = 620, H = 850;
    const {canvas: canvas, ctx: ctx} = makeCanvas(W, H);
    const rnd = rng(515);
    ctx.fillStyle = "#304436";
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "rgba(211,195,147,.09)");
    g.addColorStop(.5, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,.2)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    paperGrain(ctx, W, H, rnd, .1);
    ctx.strokeStyle = "rgba(213,196,149,.72)";
    ctx.lineWidth = 3;
    ctx.strokeRect(24, 24, W - 48, H - 48);
    ctx.strokeStyle = "rgba(213,196,149,.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(34, 34, W - 68, H - 68);
    const cx = W * .5, base = H * .82, top = H * .13;
    ctx.strokeStyle = "#d8c99d";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, base);
    ctx.quadraticCurveTo(cx - 20, (base + top) / 2, cx + 6, top);
    ctx.stroke();
    for (let i = 0; i < 18; i++) {
        const t = i / 18;
        const y = base - (base - top) * t;
        const x = cx + Math.sin(t * 2.4) * -12 - 20 * t * (1 - t);
        const len = 145 * (1 - t) + 22;
        for (const side of [ -1, 1 ]) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.bezierCurveTo(x + side * len * .3, y - 25, x + side * len * .8, y - 14, x + side * len, y - 30);
            ctx.strokeStyle = `rgba(219,205,161,${.8 - t * .15})`;
            ctx.lineWidth = 2.2;
            ctx.stroke();
            ctx.strokeStyle = "rgba(219,205,161,.25)";
            ctx.lineWidth = 1;
            for (let l = 0; l < 7; l++) {
                const lt = (l + 1) / 8;
                ctx.beginPath();
                ctx.moveTo(x + side * len * lt * .9, y - 25 * lt);
                ctx.lineTo(x + side * len * lt + side * 5, y - 25 * lt + (side > 0 ? 12 : -12));
                ctx.stroke();
            }
        }
    }
    for (let i = 0; i < 12; i++) {
        const a = i / 12 * TAU;
        ctx.beginPath();
        ctx.ellipse(cx - 74, H * .29, 15, 38, a + .4, 0, TAU);
        ctx.strokeStyle = "rgba(219,205,161,.65)";
        ctx.lineWidth = 1.4;
        ctx.stroke();
    }
    ctx.fillStyle = "#dfd0a5";
    ctx.textAlign = "center";
    ctx.font = "24px Georgia, serif";
    ctx.fillText("JARDIN", W * .5, H * .9);
    ctx.font = "italic 19px Georgia, serif";
    ctx.fillText("des plantes", W * .5, H * .928);
    ctx.font = "12px Georgia, serif";
    ctx.fillText("ÉTUDES BOTANIQUES · PARIS", W * .5, H * .955);
    return makeTexture(canvas, {
        anisotropy: 8
    });
}

export function createSmallSketch(seed = 3) {
    const W = 460, H = 580;
    const {canvas: canvas, ctx: ctx} = makeCanvas(W, H);
    const rnd = rng(seed);
    ctx.fillStyle = "#d7c6a5";
    ctx.fillRect(0, 0, W, H);
    paperGrain(ctx, W, H, rnd, .15);
    ctx.strokeStyle = "rgba(90,73,52,.7)";
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 18, W - 36, H - 36);
    ctx.strokeStyle = "rgba(73,58,42,.72)";
    const cx = W * .5, cy = H * .44;
    if (seed % 2 === 0) {
        for (let i = 0; i < 7; i++) {
            const a = i / 7 * TAU;
            ctx.beginPath();
            ctx.ellipse(cx + Math.cos(a) * 46, cy + Math.sin(a) * 46, 25, 62, a, 0, TAU);
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(cx, cy, 23, 0, TAU);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy + 60);
        ctx.quadraticCurveTo(cx - 20, cy + 170, cx + 4, cy + 220);
        ctx.stroke();
    } else {
        ctx.beginPath();
        ctx.moveTo(cx - 40, cy + 110);
        ctx.bezierCurveTo(cx - 85, cy + 15, cx - 12, cy - 35, cx + 6, cy - 122);
        ctx.bezierCurveTo(cx + 45, cy - 52, cx + 84, cy - 22, cx + 38, cy + 15);
        ctx.bezierCurveTo(cx + 86, cy + 52, cx + 54, cy + 118, cx - 40, cy + 110);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx + 4, cy - 128, 34, 0, TAU);
        ctx.stroke();
    }
    ctx.font = "italic 15px Georgia, serif";
    ctx.fillStyle = "rgba(76,61,44,.7)";
    ctx.textAlign = "center";
    ctx.fillText(seed % 2 ? "étude" : "fleur de l'été", W * .5, H * .88);
    return makeTexture(canvas, {
        anisotropy: 8
    });
}

export function createMirrorReflection() {
    const W = 340, H = 460;
    const {canvas: canvas, ctx: ctx} = makeCanvas(W, H);
    const rnd = rng(404);
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#6c7f73");
    bg.addColorStop(.38, "#7b8b7a");
    bg.addColorStop(.68, "#5d6657");
    bg.addColorStop(1, "#3a332a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    const wall = ctx.createLinearGradient(0, 0, W * .32, H);
    wall.addColorStop(0, "rgba(150,91,68,.95)");
    wall.addColorStop(.7, "rgba(123,73,55,.8)");
    wall.addColorStop(1, "rgba(101,61,46,.2)");
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, W * .31, H);
    ctx.fillStyle = "rgba(48,38,28,.55)";
    ctx.fillRect(W * .27, 0, W * .02, H);
    const winX = W * .38, winW = W * .55;
    const glow = ctx.createRadialGradient(winX + winW * .5, H * .42, 4, winX + winW * .5, H * .42, winW);
    glow.addColorStop(0, "rgba(255,246,207,.95)");
    glow.addColorStop(.45, "rgba(243,223,166,.65)");
    glow.addColorStop(1, "rgba(210,196,150,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(winX - winW * .3, H * .05, winW * 1.7, H * .75);
    ctx.save();
    ctx.beginPath();
    const aTop = H * .11, aBase = H * .76, aSpring = H * .42;
    const cx = winX + winW / 2, rad = winW / 2;
    ctx.moveTo(winX, aBase);
    ctx.lineTo(winX, aSpring);
    ctx.bezierCurveTo(winX, aSpring - (aSpring - aTop) * .72, cx - rad * .5, aTop, cx, aTop);
    ctx.bezierCurveTo(cx + rad * .5, aTop, winX + winW, aSpring - (aSpring - aTop) * .72, winX + winW, aSpring);
    ctx.lineTo(winX + winW, aBase);
    ctx.closePath();
    const wg = ctx.createLinearGradient(0, aTop, 0, aBase);
    wg.addColorStop(0, "#f8ecc4");
    wg.addColorStop(.34, "#f0dfae");
    wg.addColorStop(.62, "#d8cd9b");
    wg.addColorStop(1, "#bdbb8f");
    ctx.fillStyle = wg;
    ctx.fill();
    ctx.clip();
    for (let i = 0; i < 22; i++) {
        const x = winX + rnd() * winW, y = H * (.2 + rnd() * .5);
        const r = 8 + rnd() * 34;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, rnd() > .5 ? "rgba(125,150,91,.35)" : "rgba(92,118,74,.3)");
        g.addColorStop(1, "rgba(110,135,84,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();
    ctx.strokeStyle = "rgba(57,42,30,.9)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(winX + winW / 2, aTop + 6);
    ctx.lineTo(winX + winW / 2, aBase);
    ctx.moveTo(winX + winW * .24, aTop + H * .11);
    ctx.lineTo(winX + winW * .24, aBase);
    ctx.moveTo(winX + winW * .76, aTop + H * .11);
    ctx.lineTo(winX + winW * .76, aBase);
    ctx.lineWidth = 4;
    ctx.moveTo(winX, H * .52);
    ctx.lineTo(winX + winW, H * .52);
    ctx.stroke();
    ctx.fillStyle = "rgba(90,47,35,.86)";
    ctx.beginPath();
    ctx.ellipse(W * .62, H * .82, W * .36, H * .105, .015, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(61,30,24,.8)";
    ctx.beginPath();
    ctx.ellipse(W * .59, H * .77, W * .33, H * .045, .02, 0, TAU);
    ctx.fill();
    for (const [x, y, rx, ry, c] of [ [ .45, .78, .055, .045, "rgba(197,174,137,.8)" ], [ .55, .775, .05, .04, "rgba(147,91,67,.85)" ], [ .7, .785, .06, .042, "rgba(176,153,117,.75)" ] ]) {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.ellipse(W * x, H * y, W * rx, H * ry, .1, 0, TAU);
        ctx.fill();
    }
    ctx.fillStyle = "rgba(185,166,131,.5)";
    ctx.beginPath();
    ctx.ellipse(W * .55, H * .92, W * .38, H * .06, 0, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.strokeStyle = "rgba(52,66,46,.85)";
    ctx.lineCap = "round";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(W * .94, H * .98);
    ctx.bezierCurveTo(W * .9, H * .76, W * .95, H * .5, W * .9, H * .15);
    ctx.stroke();
    for (let i = 0; i < 12; i++) {
        const t = i / 12;
        const x = W * (.91 + Math.sin(t * 8) * .04);
        const y = H * (.18 + t * .7);
        ctx.fillStyle = "rgba(49,67,46,.75)";
        ctx.beginPath();
        ctx.ellipse(x, y, 13 + rnd() * 12, 7 + rnd() * 8, -.7 + rnd() * 1.5, 0, TAU);
        ctx.fill();
    }
    ctx.restore();
    const lamp = ctx.createRadialGradient(W * .13, H * .67, 1, W * .13, H * .67, W * .36);
    lamp.addColorStop(0, "rgba(255,222,157,.55)");
    lamp.addColorStop(.5, "rgba(255,203,126,.15)");
    lamp.addColorStop(1, "rgba(255,198,120,0)");
    ctx.fillStyle = lamp;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) {
        const edge = rnd();
        let x, y;
        if (edge < .55) {
            const side = rnd() > .5 ? 1 : -1;
            x = side > 0 ? W * (.86 + rnd() * .12) : W * (0 + rnd() * .12);
            y = rnd() * H;
        } else {
            x = rnd() * W;
            y = rnd() > .5 ? H * (.9 + rnd() * .09) : H * (.01 + rnd() * .07);
        }
        const r = 4 + rnd() * 20;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        const dark = rnd() > .45;
        g.addColorStop(0, dark ? "rgba(47,42,33,.18)" : "rgba(238,225,197,.16)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const sh = ctx.createLinearGradient(0, 0, W, H);
    sh.addColorStop(0, "rgba(255,248,225,.2)");
    sh.addColorStop(.3, "rgba(255,255,255,0)");
    sh.addColorStop(.72, "rgba(255,255,255,.07)");
    sh.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sh;
    ctx.fillRect(0, 0, W, H);
    return makeTexture(canvas, {
        anisotropy: 8
    });
}

export function createContactShadowTexture() {
    const S = 512;
    const {canvas: canvas, ctx: ctx} = makeCanvas(S, S);
    const rnd = rng(404);
    ctx.clearRect(0, 0, S, S);
    const g = ctx.createRadialGradient(S * .5, S * .5, S * .02, S * .5, S * .5, S * .49);
    g.addColorStop(0, "rgba(0,0,0,0.62)");
    g.addColorStop(.28, "rgba(0,0,0,0.46)");
    g.addColorStop(.62, "rgba(0,0,0,0.19)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    ctx.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 24; i++) {
        const a = rnd() * TAU;
        const rr = S * (.3 + rnd() * .24);
        const x = S * .5 + Math.cos(a) * rr;
        const y = S * .5 + Math.sin(a) * rr;
        const r = S * (.03 + rnd() * .09);
        const hole = ctx.createRadialGradient(x, y, 0, x, y, r);
        hole.addColorStop(0, "rgba(0,0,0,0.22)");
        hole.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = hole;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    return makeTexture(canvas, {
        srgb: false,
        anisotropy: 4
    });
}

export function createLeafTexture() {
    const W = 512, H = 1024;
    const {canvas: canvas, ctx: ctx} = makeCanvas(W, H);
    const rnd = rng(53);
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#e6ead0");
    g.addColorStop(.42, "#d3dbbc");
    g.addColorStop(1, "#aebb98");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const edge = ctx.createLinearGradient(0, 0, W, 0);
    edge.addColorStop(0, "rgba(68,87,53,0.38)");
    edge.addColorStop(.16, "rgba(68,87,53,0)");
    edge.addColorStop(.84, "rgba(68,87,53,0)");
    edge.addColorStop(1, "rgba(68,87,53,0.38)");
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 1600; i++) {
        const x = rnd() * W, y = rnd() * H;
        ctx.fillStyle = rnd() > .55 ? "rgba(255,255,226,0.1)" : "rgba(70,91,57,0.045)";
        ctx.beginPath();
        ctx.ellipse(x, y, 1 + rnd() * 14, .6 + rnd() * 6, rnd() * TAU, 0, TAU);
        ctx.fill();
    }
    const drawMidrib = (offset, color, width) => {
        ctx.beginPath();
        ctx.moveTo(W * .5 + offset, H * .985);
        ctx.bezierCurveTo(W * .505 + offset, H * .7, W * .49 + offset, H * .36, W * .5 + offset, H * .015);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = "round";
        ctx.stroke();
    };
    drawMidrib(4, "rgba(63,77,48,0.38)", 10);
    drawMidrib(0, "rgba(197,209,163,0.86)", 5.5);
    drawMidrib(-2.5, "rgba(246,248,218,0.48)", 1.8);
    for (let i = 0; i < 13; i++) {
        const t = .08 + i * .069;
        const y = H * (1 - t);
        for (const side of [ -1, 1 ]) {
            ctx.beginPath();
            ctx.moveTo(W * .5, y);
            ctx.bezierCurveTo(W * (.5 + side * .13), y - H * .025, W * (.5 + side * .29), y - H * .08, W * (.5 + side * .455), y - H * .115);
            ctx.strokeStyle = i % 3 === 0 ? "rgba(90,105,68,0.45)" : "rgba(96,113,75,0.3)";
            ctx.lineWidth = i % 3 === 0 ? 2.2 : 1.3;
            ctx.stroke();
            for (let k = 1; k < 4; k++) {
                const tt = k / 4;
                const sx = W * (.5 + side * (.13 + tt * .25));
                const sy = y - H * (.02 + tt * .06);
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.quadraticCurveTo(sx + side * 13, sy - 18, sx + side * 20, sy - 35);
                ctx.strokeStyle = "rgba(94,112,71,0.15)";
                ctx.lineWidth = .8;
                ctx.stroke();
            }
        }
    }
    const sheen = ctx.createLinearGradient(W * .12, H * .15, W * .86, H * .8);
    sheen.addColorStop(0, "rgba(255,255,229,0.2)");
    sheen.addColorStop(.35, "rgba(255,255,229,0.04)");
    sheen.addColorStop(.7, "rgba(255,255,255,0)");
    sheen.addColorStop(1, "rgba(62,83,48,0.12)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 24; i++) {
        const x = rnd() * W, y = H * (.1 + rnd() * .8);
        ctx.fillStyle = "rgba(124,100,54,0.1)";
        ctx.beginPath();
        ctx.ellipse(x, y, 1 + rnd() * 5, 1 + rnd() * 3, rnd() * TAU, 0, TAU);
        ctx.fill();
    }
    const {canvas: bumpCanvas, ctx: bc} = makeCanvas(W, H);
    bc.fillStyle = "#808080";
    bc.fillRect(0, 0, W, H);
    bc.globalAlpha = .8;
    bc.drawImage(canvas, 0, 0);
    const bg = bc.createLinearGradient(0, 0, W, 0);
    bg.addColorStop(0, "rgba(100,100,100,1)");
    bg.addColorStop(.5, "rgba(210,210,210,1)");
    bg.addColorStop(1, "rgba(100,100,100,1)");
    bc.fillStyle = bg;
    bc.fillRect(0, 0, W, H);
    return {
        map: makeTexture(canvas, {
            anisotropy: 8
        }),
        bump: makeTexture(bumpCanvas, {
            srgb: false,
            anisotropy: 4
        })
    };
}

export function createMonsteraLeafTexture() {
    const leaf = createLeafTexture();
    const W = 512, H = 1024;
    const {canvas: canvas, ctx: ctx} = makeCanvas(W, H);
    ctx.drawImage(leaf.map.image, 0, 0, W, H);
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    for (const [t, side, len, width] of [ [ .24, 1, .22, .065 ], [ .24, -1, .2, .06 ], [ .38, 1, .26, .075 ], [ .38, -1, .22, .065 ], [ .52, 1, .24, .07 ], [ .52, -1, .26, .075 ], [ .66, 1, .2, .06 ], [ .66, -1, .22, .065 ] ]) {
        const y = H * (.8 - t * .58);
        const x0 = side > 0 ? W : 0;
        ctx.beginPath();
        ctx.moveTo(x0, y - H * width);
        ctx.quadraticCurveTo(W * .5 + side * W * (.5 - len), H * Math.min(.97, y / H + .02), W * .5 + side * W * (.5 - len * 1.2), y);
        ctx.quadraticCurveTo(W * .5 + side * W * (.5 - len), H * Math.max(.03, y / H - .02), x0, y + H * width);
        ctx.closePath();
        ctx.fill();
    }
    for (const [x, y, rx, ry] of [ [ .44, .42, .045, .028 ], [ .58, .55, .034, .02 ] ]) {
        ctx.beginPath();
        ctx.ellipse(W * x, H * y, W * rx, H * ry, .25, 0, TAU);
        ctx.fill();
    }
    ctx.restore();
    return {
        map: makeTexture(canvas, {
            anisotropy: 8
        }),
        bump: leaf.bump
    };
}

export function createCarvedPanel() {
    const W = 900, H = 620;
    const {canvas: canvas, ctx: ctx} = makeCanvas(W, H);
    const rnd = rng(202);
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#744b2e");
    bg.addColorStop(1, "#4c2d1a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 130; i++) {
        ctx.beginPath();
        const y = rnd() * H;
        ctx.moveTo(0, y);
        for (let x = 0; x < W; x += 40) ctx.lineTo(x, y + Math.sin(x * .006 + i) * 4 + (rnd() - .5) * 5);
        ctx.strokeStyle = rnd() > .5 ? "rgba(32,17,8,.18)" : "rgba(202,148,82,.08)";
        ctx.lineWidth = .7 + rnd() * 2;
        ctx.stroke();
    }
    ctx.strokeStyle = "rgba(34,17,7,.7)";
    ctx.lineWidth = 18;
    roundRectPath(ctx, 30, 30, W - 60, H - 60, 18);
    ctx.stroke();
    ctx.strokeStyle = "rgba(207,153,84,.35)";
    ctx.lineWidth = 4;
    roundRectPath(ctx, 48, 48, W - 96, H - 96, 12);
    ctx.stroke();
    ctx.strokeStyle = "rgba(21,10,4,.65)";
    ctx.lineWidth = 3;
    roundRectPath(ctx, 42, 42, W - 84, H - 84, 14);
    ctx.stroke();
    const drawReliefStroke = (pathFn, width) => {
        ctx.save();
        ctx.translate(3, 4);
        pathFn();
        ctx.strokeStyle = "rgba(22,11,4,.7)";
        ctx.lineWidth = width;
        ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.translate(-1.5, -2);
        pathFn();
        ctx.strokeStyle = "rgba(224,168,94,.38)";
        ctx.lineWidth = width * .45;
        ctx.stroke();
        ctx.restore();
        pathFn();
        ctx.strokeStyle = "rgba(128,81,40,.9)";
        ctx.lineWidth = width * .8;
        ctx.stroke();
    };
    const stem = () => {
        ctx.beginPath();
        ctx.moveTo(W * .5, H * .87);
        ctx.bezierCurveTo(W * .32, H * .65, W * .72, H * .54, W * .48, H * .34);
        ctx.bezierCurveTo(W * .3, H * .17, W * .54, H * .1, W * .62, H * .22);
    };
    drawReliefStroke(stem, 11);
    for (const side of [ -1, 1 ]) {
        const vine = () => {
            ctx.beginPath();
            ctx.moveTo(W * .5 + side * 55, H * .75);
            ctx.bezierCurveTo(W * .5 + side * 200, H * .8, W * .5 + side * 280, H * .55, W * .5 + side * 190, H * .42);
            ctx.bezierCurveTo(W * .5 + side * 100, H * .28, W * .5 + side * 90, H * .12, W * .5 + side * 160, H * .1);
        };
        drawReliefStroke(vine, 8);
    }
    const flower = (cx, cy, r, n) => {
        for (let p = 0; p < n; p++) {
            const a = p / n * TAU;
            const petal = () => {
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.bezierCurveTo(cx + Math.cos(a - .35) * r, cy + Math.sin(a - .35) * r, cx + Math.cos(a) * r * 1.25, cy + Math.sin(a) * r * 1.25, cx + Math.cos(a + .22) * r * .5, cy + Math.sin(a + .22) * r * .5);
                ctx.bezierCurveTo(cx + Math.cos(a + .38) * r * .8, cy + Math.sin(a + .38) * r * .8, cx + Math.cos(a + .1) * r * .45, cy + Math.sin(a + .1) * r * .45, cx, cy);
                ctx.closePath();
            };
            ctx.save();
            ctx.translate(2, 3);
            petal();
            ctx.fillStyle = "rgba(25,12,5,.55)";
            ctx.fill();
            ctx.restore();
            petal();
            ctx.fillStyle = "rgba(158,107,56,.58)";
            ctx.fill();
            petal();
            ctx.strokeStyle = "rgba(216,165,100,.28)";
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(cx, cy, r * .17, 0, TAU);
        ctx.fillStyle = "rgba(53,31,13,.7)";
        ctx.fill();
    };
    flower(W * .5, H * .32, 74, 7);
    flower(W * .3, H * .55, 46, 6);
    flower(W * .7, H * .57, 43, 6);
    flower(W * .53, H * .73, 30, 5);
    for (let i = 0; i < 12; i++) {
        const angle = i / 12 * TAU + rnd() * .3;
        const cx = W * .5 + Math.cos(angle) * (120 + rnd() * 150);
        const cy = H * .52 + Math.sin(angle) * (110 + rnd() * 110);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle + 1.57);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-22, -30, -16, -72, 0, -92);
        ctx.bezierCurveTo(17, -68, 22, -30, 0, 0);
        ctx.closePath();
        ctx.fillStyle = "rgba(113,72,38,.65)";
        ctx.fill();
        ctx.strokeStyle = "rgba(222,170,102,.22)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }
    const sheen = ctx.createLinearGradient(0, 0, W, H);
    sheen.addColorStop(0, "rgba(255,221,170,.07)");
    sheen.addColorStop(.5, "rgba(255,255,255,0)");
    sheen.addColorStop(1, "rgba(20,9,2,.22)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, W, H);
    noiseSpeckle(ctx, rnd, W, H, 3e3, [ "#2e190c", "#d7a568" ], 1.2, .06);
    return {
        map: makeTexture(canvas),
        bump: makeTexture(canvas, {
            srgb: false
        })
    };
}

export function createBookSpineSet() {
    const W = 64, H = 256;
    const {canvas: canvas, ctx: ctx} = makeCanvas(W, H);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(0,0,0,0.06)";
    ctx.fillRect(0, 0, 4, H);
    ctx.fillRect(W - 5, 0, 5, H);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    for (let y = 8; y < H; y += 9) ctx.fillRect(0, y, W, 1);
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 2;
    ctx.strokeRect(9, 28, W - 18, H - 56);
    const tex = makeTexture(canvas, {
        anisotropy: 4
    });
    return tex;
}

function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function hexA(hex, a) {
    let h = hex.replace("#", "");
    if (h.length === 3) h = h.split("").map(x => x + x).join("");
    const n = parseInt(h, 16);
    return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
}
