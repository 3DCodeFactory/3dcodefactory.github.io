import { CanvasTexture, SRGBColorSpace, LinearSRGBColorSpace, RepeatWrapping, ClampToEdgeWrapping, EquirectangularReflectionMapping, LinearFilter, NoColorSpace } from "three";

export function rng(seed = 1) {
    let s = seed >>> 0;
    return function random() {
        s += 1831565813;
        let t = s;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

const lerp = (a, b, t) => a + (b - a) * t;

const smooth = t => t * t * (3 - 2 * t);

function hash2i(x, y, seed) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1442695041);
    h = Math.imul(h ^ h >>> 13, 1274126177);
    return ((h ^ h >>> 16) >>> 0) / 4294967295;
}

function periodicNoise(u, v, period, seed, octave = 0) {
    const x = u * period;
    const y = v * period;
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const tx = smooth(x - xi);
    const ty = smooth(y - yi);
    const p = Math.max(1, period | 0);
    const x0 = (xi % p + p) % p;
    const y0 = (yi % p + p) % p;
    const x1 = (x0 + 1) % p;
    const y1 = (y0 + 1) % p;
    const s = seed + octave * 137;
    const a = hash2i(x0, y0, s);
    const b = hash2i(x1, y0, s);
    const c = hash2i(x0, y1, s);
    const d = hash2i(x1, y1, s);
    return lerp(lerp(a, b, tx), lerp(c, d, tx), ty);
}

export function fbm(u, v, seed = 1, period = 4, octaves = 5, gain = .52) {
    let sum = 0;
    let amp = 1;
    let norm = 0;
    let p = period;
    for (let o = 0; o < octaves; o++) {
        sum += periodicNoise(u, v, p, seed, o) * amp;
        norm += amp;
        amp *= gain;
        p *= 2;
    }
    return sum / norm;
}

function makeCanvas(w, h) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", {
        alpha: true
    });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    return {
        canvas: canvas,
        ctx: ctx
    };
}

function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
}

function rgba(r, g, b, a = 1) {
    return `rgba(${r | 0},${g | 0},${b | 0},${clamp(a, 0, 1)})`;
}

function hsl(h, s, l, a = 1) {
    return `hsla(${h},${s}%,${l}%,${a})`;
}

function makeNoiseCanvas(size, seed, period = 4, octaves = 5, gain = .55, mode = "gray") {
    const {canvas: canvas, ctx: ctx} = makeCanvas(size, size);
    const img = ctx.createImageData(size, size);
    const d = img.data;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const n = fbm(x / size, y / size, seed, period, octaves, gain);
            const i = (y * size + x) * 4;
            d[i] = d[i + 1] = d[i + 2] = n * 255;
            d[i + 3] = mode === "alpha" ? n * 255 : 255;
        }
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
}

const noiseCache = new Map;

function cachedNoise(key, size, seed, period, octaves, gain, mode) {
    if (!noiseCache.has(key)) {
        noiseCache.set(key, makeNoiseCanvas(size, seed, period, octaves, gain, mode));
    }
    return noiseCache.get(key);
}

function drawNoiseOverlay(ctx, W, H, noise, alpha = .3, comp = "multiply", tint = null) {
    const tmp = makeCanvas(W, H);
    if (tint) {
        tmp.ctx.fillStyle = tint;
        tmp.ctx.fillRect(0, 0, W, H);
        tmp.ctx.globalCompositeOperation = "multiply";
    }
    tmp.ctx.drawImage(noise, 0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = comp;
    ctx.drawImage(tmp.canvas, 0, 0);
    ctx.restore();
}

function drawVerticalStreaks(ctx, W, H, rand, count, color, alphaMax = .2) {
    ctx.save();
    for (let i = 0; i < count; i++) {
        const x = rand() * W;
        const y = rand() * H * .25;
        const len = H * (.18 + rand() * .78);
        const w = 1 + rand() * (W / 500);
        const g = ctx.createLinearGradient(0, y, 0, y + len);
        g.addColorStop(0, rgba(color[0], color[1], color[2], 0));
        g.addColorStop(.15, rgba(color[0], color[1], color[2], alphaMax * (.3 + rand() * .7)));
        g.addColorStop(.75, rgba(color[0], color[1], color[2], alphaMax * .24));
        g.addColorStop(1, rgba(color[0], color[1], color[2], 0));
        ctx.fillStyle = g;
        ctx.fillRect(x, y, w, len);
        if (rand() > .65) {
            ctx.fillStyle = rgba(color[0], color[1], color[2], alphaMax * .22);
            ctx.fillRect(x + (rand() - .5) * w * 7, y + len * .2, Math.max(1, w * .35), len * .65);
        }
    }
    ctx.restore();
}

function splatter(ctx, W, H, rand, count, colors, sizeScale = 1, alpha = .5) {
    ctx.save();
    for (let i = 0; i < count; i++) {
        ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
        ctx.globalAlpha = alpha * (.2 + rand() * .8);
        const x = rand() * W;
        const y = rand() * H;
        const r = Math.pow(rand(), 2.4) * 5 * sizeScale + .4;
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * (.45 + rand()), rand() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
        if (rand() > .87) {
            ctx.strokeStyle = ctx.fillStyle;
            ctx.lineWidth = r * .6;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + (rand() - .5) * 24 * sizeScale, y + (rand() - .7) * 24 * sizeScale);
            ctx.stroke();
        }
    }
    ctx.restore();
}

function irregularBlobPath(ctx, cx, cy, rx, ry, rand, points = 26, wobble = .35) {
    ctx.beginPath();
    const offsets = [];
    for (let i = 0; i < points; i++) offsets.push(1 - wobble * .5 + rand() * wobble);
    for (let i = 0; i <= points; i++) {
        const a = i / points * Math.PI * 2;
        const r = offsets[i % points];
        const x = cx + Math.cos(a) * rx * r;
        const y = cy + Math.sin(a) * ry * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
}

export function makeTileRelief(anisotropy = 8) {
    const TW = 1024;
    const TH = 512;
    const COLS = 10;
    const ROWS = 4;
    const height = new Float32Array(TW * TH);
    const cw = TW / COLS;
    const ch = TH / ROWS;
    for (let y = 0; y < TH; y++) {
        for (let x = 0; x < TW; x++) {
            const cx = Math.min(COLS - 1, Math.floor(x / cw));
            const cy = Math.min(ROWS - 1, Math.floor(y / ch));
            const fx = (x - cx * cw) / cw;
            const fy = (y - cy * ch) / ch;
            const edge = Math.min(fx, 1 - fx, fy, 1 - fy);
            const bevel = smoothstep(.008, .035, edge);
            const n = fbm(x / TW, y / TH, 211 + cx * 7 + cy * 33, 16, 3, .55);
            const low = fbm(x / TW, y / TH, 701 + cx + cy * 9, 4, 2, .6);
            const pit = Math.pow(n, 18) * .32;
            height[y * TW + x] = .44 + bevel * .5 + (n - .5) * .07 - pit + (low - .5) * .025;
        }
    }
    const {canvas: canvas, ctx: ctx} = makeCanvas(TW, TH);
    const img = ctx.createImageData(TW, TH);
    const d = img.data;
    const strength = 2.35;
    for (let y = 0; y < TH; y++) {
        for (let x = 0; x < TW; x++) {
            const l = height[y * TW + (x - 1 + TW) % TW];
            const r = height[y * TW + (x + 1) % TW];
            const u = height[(y - 1 + TH) % TH * TW + x];
            const dn = height[(y + 1) % TH * TW + x];
            let nx = (l - r) * strength;
            let ny = (dn - u) * strength;
            const nz = 1;
            const inv = 1 / Math.hypot(nx, ny, nz);
            nx *= inv;
            ny *= inv;
            const i = (y * TW + x) * 4;
            d[i] = (nx * .5 + .5) * 255;
            d[i + 1] = (ny * .5 + .5) * 255;
            d[i + 2] = (nz * inv * .5 + .5) * 255;
            d[i + 3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
    const texture = new CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.colorSpace = NoColorSpace;
    texture.anisotropy = anisotropy;
    texture.needsUpdate = true;
    return texture;
}

export function makeWetRoughness(anisotropy = 8, seed = 7) {
    const S = 512;
    const {canvas: canvas, ctx: ctx} = makeCanvas(S, S);
    const img = ctx.createImageData(S, S);
    const d = img.data;
    for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
            const a = fbm(x / S, y / S, seed, 4, 5, .56);
            const b = fbm(x / S, y / S, seed + 13, 16, 3, .6);
            let r = .33 + a * .5 + b * .09;
            const run = Math.abs(Math.sin(x / S * Math.PI * 11 + a * 4));
            r -= Math.pow(1 - run, 9) * .16;
            r = clamp(r, .12, .94);
            const i = (y * S + x) * 4;
            d[i] = d[i + 1] = d[i + 2] = r * 255;
            d[i + 3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
    const tex = new CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = RepeatWrapping;
    tex.colorSpace = NoColorSpace;
    tex.anisotropy = anisotropy;
    return tex;
}

const MURAL = {
    cyan: "#4a99a6",
    cyanDeep: "#357e8c",
    yellow: "#cbb13d",
    yellowPale: "#bfaa4b",
    cream: "#e0dbcd",
    offWhite: "#d1cec0",
    ink: "#101313",
    inkSoft: "#171a1a",
    rust: "#8e4034"
};

const leftShards = [ [ MURAL.cyan, [ [ 3.5, 3 ], [ 2.2, 2.8 ], [ .9, 2.2 ], [ -1, .7 ], [ -1.75, .28 ], [ 1.5, .28 ], [ 2.9, 1.1 ], [ 3.95, .28 ] ] ], [ MURAL.ink, [ [ 1.9, 3 ], [ .8, 3 ], [ -.6, 1.6 ], [ -1.8, .28 ], [ -.7, .28 ], [ 1.2, 2.2 ], [ 2.6, 3 ] ] ], [ MURAL.cream, [ [ 3.5, 3 ], [ 2.68, 3 ], [ 2.46, 2.56 ], [ 3.22, 2.08 ], [ 3.5, 2.5 ] ] ], [ MURAL.yellow, [ [ 3.5, .28 ], [ 2.02, .28 ], [ 2.55, .95 ], [ 3.27, 1.54 ] ] ], [ MURAL.ink, [ [ 1.58, 3 ], [ .92, 3 ], [ -1.25, .28 ], [ -.55, .28 ] ] ], [ MURAL.cream, [ [ 2.02, 2.55 ], [ 1.42, 2.12 ], [ 1.76, 1.44 ], [ 2.36, 1.89 ] ] ], [ MURAL.yellow, [ [ .55, .28 ], [ -.2, .28 ], [ .4, 1.45 ], [ .95, 1.45 ] ] ], [ MURAL.ink, [ [ -.7, .28 ], [ -3.5, .28 ], [ -2.55, 1.5 ], [ -1.65, 3 ], [ .15, 3 ] ] ], [ MURAL.cyan, [ [ -2.5, .28 ], [ -5.4, .28 ], [ -4.6, 2.9 ], [ -1.7, 2.9 ] ] ], [ MURAL.cream, [ [ -3.85, 2.9 ], [ -4.55, .28 ], [ -5.2, .28 ], [ -4.4, 2.9 ] ] ], [ MURAL.yellow, [ [ -4.95, .28 ], [ -7.7, .28 ], [ -6.35, 2.9 ], [ -5.2, 1.2 ] ] ], [ MURAL.ink, [ [ -6, .28 ], [ -9.4, .28 ], [ -8.25, 1.5 ], [ -7.6, 2.9 ], [ -5, 2.9 ] ] ], [ MURAL.cyan, [ [ -8.4, .28 ], [ -10.5, .28 ], [ -9.8, 2.9 ], [ -8.1, 2.9 ] ] ], [ MURAL.cream, [ [ -9.8, 2.9 ], [ -10.45, 2.9 ], [ -10.7, 1.5 ], [ -10.05, 1 ] ] ], [ MURAL.yellowPale, [ [ -10.1, .28 ], [ -13, .28 ], [ -11.7, 3 ], [ -10.4, 1.5 ] ] ], [ MURAL.ink, [ [ -12, .28 ], [ -15.4, .28 ], [ -14.2, 2 ], [ -13.3, 3 ], [ -10.9, 3 ] ] ], [ MURAL.cyanDeep, [ [ -14.2, .28 ], [ -17.6, .28 ], [ -16.2, 2.2 ], [ -15.5, 3 ], [ -13.1, 3 ] ] ], [ MURAL.rust, [ [ -3.36, .28 ], [ -3.75, .28 ], [ -3.15, 3 ], [ -2.72, 3 ] ] ], [ MURAL.cream, [ [ -16.1, 3 ], [ -17.2, 1.3 ], [ -16.5, .28 ], [ -17.5, .28 ] ] ], [ MURAL.ink, [ [ -17.3, .28 ], [ -21, .28 ], [ -19.9, 1.55 ], [ -19, 3 ], [ -16.2, 3 ] ] ], [ MURAL.cyanDeep, [ [ -19.9, .28 ], [ -23, .28 ], [ -21.9, 1.6 ], [ -21.2, 3 ], [ -18.7, 3 ] ] ], [ MURAL.yellowPale, [ [ -22.5, .28 ], [ -25.1, .28 ], [ -24.3, 1.9 ], [ -23.1, 2.85 ] ] ], [ MURAL.ink, [ [ -24.6, 3 ], [ -27.8, 3 ], [ -26.6, .7 ], [ -25, .28 ], [ -23.4, 2.5 ] ] ], [ MURAL.cyanDeep, [ [ -27, .28 ], [ -32.2, .28 ], [ -30.1, 1.9 ], [ -28.3, 3 ], [ -26, 3 ] ] ], [ MURAL.ink, [ [ -31, .28 ], [ -35, .28 ], [ -33.9, 1.5 ], [ -33.2, 3 ], [ -29.8, 3 ] ] ], [ MURAL.yellowPale, [ [ -34.3, .28 ], [ -35.6, 2.9 ], [ -32.1, 2.9 ] ] ], [ MURAL.cream, [ [ -35.4, 3 ], [ -38.4, 3 ], [ -36.9, .7 ], [ -36, .28 ] ] ], [ MURAL.ink, [ [ -38.1, .28 ], [ -44, .28 ], [ -43.2, 3 ], [ -40.3, 3 ] ] ], [ MURAL.cyanDeep, [ [ -43.6, .28 ], [ -47.4, .28 ], [ -45, 2.1 ], [ -44.1, 3 ], [ -41.7, 3 ] ] ], [ MURAL.ink, [ [ -47.1, .28 ], [ -54, .28 ], [ -52.6, 2.1 ], [ -51.2, 3 ], [ -46.5, 3 ] ] ], [ MURAL.ink, [ [ 4.5, 3 ], [ 3.42, 3 ], [ 3.12, 2.58 ], [ 4.15, 2.67 ] ] ], [ MURAL.ink, [ [ 2.62, .28 ], [ 1.55, .28 ], [ 1.85, 1.02 ], [ 2.58, .78 ] ] ], [ MURAL.yellowPale, [ [ 1.72, .28 ], [ 1.08, .28 ], [ 1.26, .7 ], [ 1.72, .9 ], [ 1.98, .6 ] ] ], [ MURAL.ink, [ [ 2.98, 3 ], [ 2.42, 3 ], [ 2.12, 2.4 ], [ 2.58, 2.22 ], [ 2.94, 2.6 ] ] ] ];

const edgeHighlights = new Set([ 1, 3, 6, 8, 10, 13, 19, 21, 32 ]);

function drawTileGrid(ctx, x0, y0, W, H, cols, rows, color, alpha, lw) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = lw;
    for (let c = 0; c <= cols; c++) {
        const x = x0 + c * W / cols;
        ctx.beginPath();
        ctx.moveTo(x, y0);
        ctx.lineTo(x, y0 + H);
        ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
        const y = y0 + r * H / rows;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x0 + W, y);
        ctx.stroke();
    }
    ctx.restore();
}

function drawBakedHandTag(ctx, text, x, y, pxSize, color, rand, rotation = 0, alpha = .7) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `400 ${pxSize}px "Permanent Marker"`;
    ctx.fillStyle = color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let pass = 0; pass < 8; pass++) {
        ctx.globalAlpha = alpha * (.04 + pass * .015);
        ctx.fillText(text, (rand() - .5) * pxSize * .05, (rand() - .5) * pxSize * .04);
    }
    ctx.globalAlpha = alpha;
    ctx.fillText(text, 0, 0);
    ctx.fillText(text, (rand() - .5) * 2.5, (rand() - .5) * 2.5);
    ctx.globalAlpha = alpha * .6;
    for (let i = 0; i < 3; i++) {
        const px = (rand() - .5) * pxSize * Math.max(1, text.length) * .45;
        const len = pxSize * (.2 + rand() * .7);
        const grad = ctx.createLinearGradient(px, 0, px, len);
        grad.addColorStop(0, color);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = Math.max(1, pxSize * (.025 + rand() * .025));
        ctx.beginPath();
        ctx.moveTo(px, pxSize * .28);
        ctx.lineTo(px + (rand() - .5) * 5, pxSize * .28 + len);
        ctx.stroke();
    }
    ctx.restore();
}

function paintLeftWall(ctx, W, H, zNear, zFar, yTop, seed, detail = 1) {
    const rand = rng(seed);
    const len = zNear - zFar;
    const pxPerM = W / len;
    const pyPerM = H / yTop;
    const X = z => (zNear - z) / len * W;
    const Y = y => H * (1 - y / yTop);
    const TILE_W = .2;
    const TILE_H = .25;
    const cols = Math.round(len / TILE_W);
    const rows = Math.round(yTop / TILE_H);
    const cw = W / cols;
    const ch = H / rows;
    ctx.fillStyle = "#48483f";
    ctx.fillRect(0, 0, W, H);
    const tilePalette = [ [ 201, 200, 184 ], [ 212, 210, 194 ], [ 190, 192, 178 ], [ 215, 207, 185 ], [ 180, 183, 169 ], [ 204, 197, 173 ], [ 196, 198, 188 ] ];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const x = c * cw;
            const y = r * ch;
            const p = tilePalette[Math.floor(rand() * tilePalette.length)];
            const shade = .86 + rand() * .23;
            const inset = Math.max(1, cw * .014);
            ctx.fillStyle = rgba(p[0] * shade, p[1] * shade, p[2] * shade);
            ctx.fillRect(x + inset, y + inset, cw - inset * 2.1, ch - inset * 2.1);
            if (rand() > .3) {
                const g = ctx.createLinearGradient(x, y, x + cw, y + ch);
                g.addColorStop(0, rgba(255, 250, 230, .07 * rand()));
                g.addColorStop(.55, rgba(255, 255, 255, 0));
                g.addColorStop(1, rgba(20, 25, 20, .09 * rand()));
                ctx.fillStyle = g;
                ctx.fillRect(x + inset, y + inset, cw - inset * 2.1, ch - inset * 2.1);
            }
            ctx.strokeStyle = rgba(245, 244, 226, .1 + rand() * .12);
            ctx.lineWidth = Math.max(1, cw * .008);
            ctx.strokeRect(x + inset + .5, y + inset + .5, cw - inset * 2.1, ch - inset * 2.1);
            if (rand() > .93) {
                ctx.strokeStyle = rgba(70, 68, 58, .35);
                ctx.lineWidth = Math.max(1, cw * .006);
                ctx.beginPath();
                const px = x + cw * (.2 + rand() * .6);
                const py = y + ch * .12;
                ctx.moveTo(px, py);
                ctx.lineTo(px + (rand() - .5) * cw * .3, py + ch * .32);
                ctx.lineTo(px + (rand() - .5) * cw * .5, py + ch * .85);
                ctx.stroke();
            }
            if (rand() > .955) {
                ctx.fillStyle = rgba(148, 128, 70, .18);
                ctx.fillRect(x + inset, y + inset, cw - inset * 2, ch - inset * 2);
            }
        }
    }
    const cloudA = cachedNoise("wall-cloud-a", 256, 3151, 4, 5, .58);
    const cloudB = cachedNoise("wall-cloud-b", 256, 8807, 12, 4, .6);
    drawNoiseOverlay(ctx, W, H, cloudA, .34, "multiply", "#746b58");
    drawNoiseOverlay(ctx, W, H, cloudB, .16, "soft-light", null);
    drawNoiseOverlay(ctx, W, H, cachedNoise("wall-grime-fine", 512, 9631, 24, 3, .64), .14, "multiply", "#726855");
    ctx.save();
    for (let si = 0; si < leftShards.length; si++) {
        const [color, pts] = leftShards[si];
        ctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
            const [z, y] = pts[i];
            const x = X(z);
            const yy = Y(y);
            if (i === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
        }
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        if (edgeHighlights.has(si)) {
            ctx.save();
            ctx.strokeStyle = rgba(18, 20, 18, .2);
            ctx.lineWidth = Math.max(2, pxPerM * .025);
            ctx.setLineDash([ pxPerM * (.12 + rand() * .1), pxPerM * (.05 + rand() * .08) ]);
            ctx.stroke();
            ctx.restore();
        }
    }
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = rgba(8, 10, 10, .74);
    ctx.fillStyle = rgba(8, 10, 10, .68);
    ctx.lineCap = "round";
    const scribble = (zx, zy, scale, seedOffset) => {
        const rr = rng(seed + seedOffset);
        const px = X(zx);
        const py = Y(zy);
        const s = scale * pxPerM;
        ctx.lineWidth = Math.max(1.4, s * .035);
        for (let l = 0; l < 4; l++) {
            ctx.beginPath();
            let x = px + (rr() - .5) * s * .9;
            let y = py + (rr() - .5) * s * .55;
            ctx.moveTo(x, y);
            for (let k = 0; k < 3; k++) {
                ctx.bezierCurveTo(x + (rr() - .3) * s * .5, y - (rr() + .2) * s * .3, x + (rr() + .1) * s * .6, y + (rr() - .5) * s * .45, x + (rr() - .2) * s * .45, y + (rr() - .2) * s * .35);
            }
            ctx.stroke();
        }
    };
    scribble(3.05, 1.28, .34, 131);
    scribble(-.2, 1.2, .6, 11);
    scribble(1.55, 2.42, .42, 139);
    scribble(-5, 1.5, .85, 29);
    scribble(-8.7, 1.02, .7, 43);
    scribble(-12.4, 1.75, .9, 57);
    ctx.restore();
    drawTileGrid(ctx, 0, 0, W, H, cols, rows, "#1d1e1a", .4, Math.max(1, cw * .019));
    drawTileGrid(ctx, 0, 0, W, H, cols, rows, "#e9e5cf", .055, Math.max(1, cw * .006));
    const chipCount = Math.floor(len * yTop * 32 * detail);
    for (let i = 0; i < chipCount; i++) {
        const x = rand() * W;
        const y = H * (.56 + rand() * .44);
        const r = (.004 + Math.pow(rand(), 2) * .048) * pxPerM;
        const base = tilePalette[Math.floor(rand() * tilePalette.length)];
        ctx.save();
        ctx.globalAlpha = .18 + rand() * .5;
        ctx.fillStyle = rgba(base[0] * .76, base[1] * .74, base[2] * .7);
        irregularBlobPath(ctx, x, y, r, r * (.18 + rand() * .8), rand, 8, .75);
        ctx.fill();
        ctx.restore();
    }
    for (let i = 0; i < Math.floor(len * 2.2 * detail); i++) {
        const x = rand() * W;
        const y = H * (.45 + rand() * .55);
        const r = (.006 + rand() * .022) * pxPerM;
        ctx.save();
        ctx.globalAlpha = .38 + rand() * .28;
        ctx.fillStyle = rand() > .45 ? "#a8a695" : "#7b7d71";
        irregularBlobPath(ctx, x, y, r * (1 + rand()), r * (.2 + rand() * .4), rand, 7, .8);
        ctx.fill();
        ctx.restore();
    }
    drawTileGrid(ctx, 0, 0, W, H, cols, rows, "#30312a", .31, Math.max(1, cw * .014));
    const bottom = ctx.createLinearGradient(0, H, 0, H * .78);
    bottom.addColorStop(0, "rgba(5,9,8,0.84)");
    bottom.addColorStop(.2, "rgba(8,11,9,0.52)");
    bottom.addColorStop(.62, "rgba(16,18,13,0.14)");
    bottom.addColorStop(1, "rgba(16,18,13,0)");
    ctx.fillStyle = bottom;
    ctx.fillRect(0, H * .74, W, H * .26);
    const top = ctx.createLinearGradient(0, 0, 0, H * .22);
    top.addColorStop(0, "rgba(8,10,8,0.55)");
    top.addColorStop(1, "rgba(8,10,8,0)");
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, W, H * .24);
    const wideStreaks = Math.floor(len * 1.5 * detail);
    drawVerticalStreaks(ctx, W, H, rand, Math.floor(wideStreaks * 1.5), [ 34, 31, 22 ], .25);
    drawVerticalStreaks(ctx, W, H, rand, Math.max(4, wideStreaks * .36), [ 92, 29, 18 ], .15);
    ctx.save();
    for (let i = 0; i < Math.floor(len * .85); i++) {
        const x = rand() * W;
        const y = H * (.02 + rand() * .16);
        const r = pxPerM * (.2 + rand() * .8);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, rgba(92, 38, 21, .17 + rand() * .16));
        g.addColorStop(1, rgba(92, 38, 21, 0));
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();
    drawNoiseOverlay(ctx, W, H, cloudA, .18, "multiply", "#5d594a");
    drawNoiseOverlay(ctx, W, H, cloudB, .1, "overlay", null);
    ctx.save();
    ctx.lineCap = "round";
    for (let i = 0; i < Math.floor(len * 7 * detail); i++) {
        const x = rand() * W;
        const y = rand() * H;
        const lenPx = 2 + rand() * 26 * detail;
        ctx.strokeStyle = rand() > .55 ? "rgba(216,211,190,0.13)" : "rgba(16,16,12,0.18)";
        ctx.lineWidth = .7 + rand() * 1.6;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rand() - .5) * lenPx, y + (rand() - .5) * lenPx * .3);
        ctx.stroke();
    }
    ctx.restore();
    splatter(ctx, W, H, rand, Math.floor(len * 5 * detail), [ "rgba(20,20,16,0.5)", "rgba(129,112,78,0.26)", "rgba(191,186,166,0.14)" ], detail, .36);
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    for (let i = 0; i < Math.floor(len * 2.4); i++) {
        const x = rand() * W;
        const y = H * (.2 + rand() * .8);
        const rx = pxPerM * (.2 + rand() * 1.5);
        const ry = pyPerM * (.15 + rand() * .8);
        const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
        const brown = rand() > .72;
        g.addColorStop(0, brown ? `rgba(78,56,30,${.08 + rand() * .18})` : `rgba(18,22,16,${.05 + rand() * .18})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, ry / Math.max(rx, ry));
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(rx, ry), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    for (let i = 0; i < 64; i++) {
        const z = 3.45 - rand() * 5.2;
        const x = X(z) + (rand() - .5) * pxPerM * .7;
        const y = H * (.42 + rand() * .58);
        const rx = pxPerM * (.1 + rand() * .7);
        const ry = pyPerM * (.08 + rand() * .55);
        const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
        const warm = rand() > .62;
        g.addColorStop(0, warm ? `rgba(77,57,32,${.06 + rand() * .16})` : `rgba(15,19,15,${.05 + rand() * .15})`);
        g.addColorStop(.7, warm ? `rgba(54,48,32,${.02 + rand() * .07})` : `rgba(9,12,10,${.015 + rand() * .06})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, ry / Math.max(rx, ry));
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(rx, ry), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    ctx.restore();
    ctx.save();
    ctx.lineCap = "round";
    for (let i = 0; i < 18; i++) {
        const z = 3.5 - rand() * 6.2;
        const x = X(z);
        const y = Y(.6 + rand() * 1.8);
        const run = pyPerM * (.08 + rand() * .42);
        ctx.globalAlpha = .08 + rand() * .18;
        ctx.strokeStyle = rand() > .7 ? "#cfa92b" : "#101412";
        ctx.lineWidth = Math.max(1, pxPerM * (.006 + rand() * .014));
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x + (rand() - .5) * 3, y + run * .3, x + (rand() - .5) * 6, y + run * .7, x + (rand() - .5) * 3, y + run);
        ctx.stroke();
    }
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = .22;
    ctx.fillStyle = "#cbc6b3";
    ctx.beginPath();
    ctx.moveTo(X(-.15), Y(1.1));
    ctx.lineTo(X(-1.25), Y(1.15));
    ctx.lineTo(X(-1.15), Y(.5));
    ctx.lineTo(X(-.25), Y(.56));
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = .1;
    ctx.strokeStyle = "#2d3029";
    for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(X(-.1 - rand() * 1), Y(.55 + rand() * .5));
        ctx.lineTo(X(-.1 - rand() * 1), Y(.55 + rand() * .5));
        ctx.stroke();
    }
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = .1;
    ctx.fillStyle = "#0b0d0c";
    irregularBlobPath(ctx, X(3.38), Y(1.78), pxPerM * .55, pyPerM * .34, rand, 24, .55);
    ctx.fill();
    ctx.globalAlpha = .06;
    ctx.beginPath();
    ctx.ellipse(X(3.32), Y(1.62), pxPerM * .42, pyPerM * .16, .02, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawBakedHandTag(ctx, "ONE", X(2.18), Y(2.18), pyPerM * .18, "rgba(12,14,12,0.5)", rand, .08, .34);
    drawBakedHandTag(ctx, "NIX", X(1.62), Y(1.5), pyPerM * .2, "rgba(226,221,204,0.46)", rand, -.1, .28);
    drawBakedHandTag(ctx, "RHE", X(3.12), Y(1.16), pyPerM * .11, "rgba(11,13,12,0.42)", rand, .24, .26);
    drawBakedHandTag(ctx, "SIN", X(2.9), Y(2.55), pyPerM * .17, "rgba(13,15,14,0.58)", rand, -.16, .38);
    drawBakedHandTag(ctx, "MIS", X(3.28), Y(1.03), pyPerM * .15, "rgba(224,219,201,0.52)", rand, -.06, .32);
    drawBakedHandTag(ctx, "PLZ", X(1.95), Y(2.7), pyPerM * .12, "rgba(221,216,197,0.48)", rand, .11, .3);
    drawBakedHandTag(ctx, "K4", X(.55), Y(2.48), pyPerM * .17, "rgba(10,12,11,0.5)", rand, -.05, .34);
    drawBakedHandTag(ctx, "4K", X(1.28), Y(1.13), pyPerM * .21, "rgba(218,213,194,0.74)", rand, .1, .44);
    drawBakedHandTag(ctx, "RHE", X(-.45), Y(2.56), pyPerM * .28, "rgba(11,13,12,0.8)", rand, .12, .55);
    drawBakedHandTag(ctx, "08", X(-.9), Y(.62), pyPerM * .14, "rgba(214,209,190,0.48)", rand, -.08, .3);
    drawBakedHandTag(ctx, "NOX", X(-2.6), Y(1.7), pyPerM * .42, "rgba(202,198,179,0.72)", rand, -.08, .44);
    drawBakedHandTag(ctx, "10", X(-4.15), Y(2.36), pyPerM * .3, "rgba(14,15,14,0.68)", rand, .05, .38);
    drawBakedHandTag(ctx, "SYN", X(-6.3), Y(1.3), pyPerM * .3, "rgba(215,209,190,0.55)", rand, -.12, .35);
    drawBakedHandTag(ctx, "wnd", X(-8.9), Y(2.2), pyPerM * .36, "rgba(19,21,19,0.55)", rand, .06, .36);
    const smallWords = [ "NOX", "RHE", "SIN", "ONE", "K4", "4K", "NIX", "WND", "MIS", "PLZ", "SYN", "OZ", "10" ];
    const smallColors = [ "rgba(12,14,12,0.62)", "rgba(209,204,188,0.55)", "rgba(150,56,42,0.4)", "rgba(38,72,69,0.42)", "rgba(12,14,12,0.45)", "rgba(222,216,198,0.36)" ];
    const smallCount = Math.floor(len * 1.9 * detail);
    for (let i = 0; i < smallCount; i++) {
        const zz = zNear - rand() * len;
        const yy = .42 + rand() * 2.34;
        const px = pyPerM * (.07 + rand() * .15);
        const word = smallWords[Math.floor(rand() * smallWords.length)];
        const color = smallColors[Math.floor(rand() * smallColors.length)];
        drawBakedHandTag(ctx, word, X(zz), Y(yy), px, color, rand, (rand() - .5) * .36, .38 + rand() * .5);
    }
    ctx.save();
    ctx.lineCap = "round";
    for (let i = 0; i < Math.floor(len * 5); i++) {
        const x = rand() * W;
        const y = rand() * H * .55;
        const size = 1 + rand() * (3 + detail * 2);
        const len = H * (.04 + rand() * .3);
        ctx.strokeStyle = `rgba(10,12,10,${.04 + rand() * .13})`;
        ctx.lineWidth = size;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rand() - .5) * 3, y + len);
        ctx.stroke();
        if (rand() > .7) {
            ctx.fillStyle = `rgba(10,12,10,${.1 + rand() * .15})`;
            ctx.beginPath();
            ctx.ellipse(x, y + len, size * .6, size * .9, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
    drawVerticalStreaks(ctx, W, H, rand, Math.floor(len * 2.8 * detail), [ 15, 17, 12 ], .26);
    splatter(ctx, W, H, rand, Math.floor(len * 16 * detail), [ "rgba(12,13,11,0.35)", "rgba(154,143,112,0.18)", "rgba(215,207,181,0.14)" ], detail, .5);
    splatter(ctx, W, H, rand, Math.floor(len * 3), [ "rgba(10,12,10,0.55)", "rgba(42,38,28,0.4)", "rgba(138,118,80,0.22)" ], 2.6, .55);
    const bloom = ctx.createLinearGradient(0, H * .35, W, H * .8);
    bloom.addColorStop(0, "rgba(40,79,76,0.06)");
    bloom.addColorStop(.42, "rgba(0,0,0,0)");
    bloom.addColorStop(1, "rgba(70,64,42,0.09)");
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, W, H);
}

export function makeLeftWallTexture({zNear: zNear, zFar: zFar, yTop: yTop = 3, width: width = 2048, height: height = 1024, seed: seed = 1, anisotropy: anisotropy = 8, detail: detail = 1}) {
    const {canvas: canvas, ctx: ctx} = makeCanvas(width, height);
    paintLeftWall(ctx, width, height, zNear, zFar, yTop, seed, detail);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = anisotropy;
    texture.wrapS = texture.wrapT = ClampToEdgeWrapping;
    texture.needsUpdate = true;
    return texture;
}

function tintedTextStroke(ctx, text, x, y, size, font, fill, outline, outlineWidth, rand, opts = {}) {
    ctx.save();
    ctx.translate(x, y);
    if (opts.rotate) ctx.rotate(opts.rotate);
    if (opts.skew) ctx.transform(1, 0, opts.skew, 1, 0, 0);
    ctx.font = `${opts.weight || 700} ${size}px ${font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    if (outline && outlineWidth > 0) {
        ctx.strokeStyle = outline;
        ctx.lineWidth = outlineWidth;
        ctx.strokeText(text, 0, 0);
    }
    ctx.fillStyle = fill;
    ctx.fillText(text, 0, 0);
    if (opts.spray !== false) {
        for (let i = 0; i < 38; i++) {
            ctx.globalAlpha = .08 + rand() * .24;
            ctx.fillStyle = i % 4 === 0 ? outline || fill : fill;
            ctx.beginPath();
            ctx.arc((rand() - .5) * size * 3.2, (rand() - .5) * size * 1.5, rand() * 2.2 + .4, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
}

function paintRightWall(ctx, W, H, zNear, zFar, yTop, seed, detail = 1) {
    const rand = rng(seed);
    const len = zNear - zFar;
    const X = z => (zNear - z) / len * W;
    const Y = y => H * (1 - y / yTop);
    const pxPerM = W / len;
    const pyPerM = H / yTop;
    const TILE_W = .2;
    const TILE_H = .25;
    const cols = Math.round(len / TILE_W);
    const rows = Math.round(yTop / TILE_H);
    const cw = W / cols;
    const ch = H / rows;
    ctx.fillStyle = "#393b35";
    ctx.fillRect(0, 0, W, H);
    const pal = [ [ 166, 164, 148 ], [ 151, 154, 140 ], [ 177, 171, 151 ], [ 141, 148, 138 ], [ 186, 179, 157 ], [ 159, 156, 140 ] ];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const x = c * cw;
            const y = r * ch;
            const p = pal[Math.floor(rand() * pal.length)];
            const v = .72 + rand() * .3;
            const inset = Math.max(1, cw * .015);
            ctx.fillStyle = rgba(p[0] * v, p[1] * v, p[2] * v);
            ctx.fillRect(x + inset, y + inset, cw - inset * 2, ch - inset * 2);
            if (rand() > .55) {
                ctx.fillStyle = rgba(22, 24, 19, .12 + rand() * .15);
                ctx.fillRect(x + inset, y + inset + ch * (.4 + rand() * .4), cw - inset * 2, ch * .25);
            }
        }
    }
    ctx.save();
    for (let i = 0; i < Math.floor(len * 1.8); i++) {
        const zz = zNear - rand() * len;
        const yy = .35 + rand() * 2.3;
        const rx = pxPerM * (.35 + rand() * 1.5);
        const ry = pyPerM * (.25 + rand() * .9);
        const cols = [ "#8d382d", "#2f5050", "#b08c29", "#1a1b18", "#6f3428" ];
        ctx.globalAlpha = .22 + rand() * .4;
        ctx.fillStyle = cols[Math.floor(rand() * cols.length)];
        irregularBlobPath(ctx, X(zz), Y(yy), rx, ry, rand, 16, .55);
        ctx.fill();
    }
    ctx.restore();
    const pieces = [ {
        z: 7,
        y: 1.45,
        size: 1.32,
        text: "NACHT",
        font: "Bangers",
        fill: "#d6d1bf",
        outline: "#0b0c0c",
        bg: "#9a3a2d",
        rot: -.08
    }, {
        z: 5.4,
        y: 2,
        size: 1.1,
        text: "ROH",
        font: "Sedgwick Ave Display",
        fill: "#171918",
        outline: "#d4cfbc",
        bg: "#b18f2d",
        rot: .04
    }, {
        z: 4,
        y: 1.05,
        size: 1.25,
        text: "WAND",
        font: "Bangers",
        fill: "#d4d0bd",
        outline: "#0d0e0e",
        bg: "#2e5252",
        rot: -.03
    }, {
        z: 2.4,
        y: 1.75,
        size: 1.48,
        text: "STILL",
        font: "Bangers",
        fill: "#ddd8c5",
        outline: "#0b0d0d",
        bg: "#8d372d",
        rot: .06
    }, {
        z: 1,
        y: .95,
        size: 1.12,
        text: "NIX",
        font: "Permanent Marker",
        fill: "#171817",
        outline: "#d2cdb9",
        bg: "#a18125",
        rot: -.04
    }, {
        z: -.4,
        y: 1.9,
        size: 1.3,
        text: "RHE",
        font: "Sedgwick Ave Display",
        fill: "#d8d3c0",
        outline: "#111212",
        bg: "#77352a",
        rot: .03
    }, {
        z: -2.15,
        y: 1.52,
        size: 1.95,
        text: "NACHT",
        font: "Bowlby One SC",
        fill: "#e6e1cf",
        outline: "#080a09",
        bg: "#733128",
        rot: -.035
    }, {
        z: -3.7,
        y: 2,
        size: 1.5,
        text: "AUS",
        font: "Bangers",
        fill: "#dad5c2",
        outline: "#0a0b0b",
        bg: "#3a4a47",
        rot: .065
    }, {
        z: -4.9,
        y: .95,
        size: 1.24,
        text: "NACHT",
        fill: "#cfcbb7",
        outline: "#0c0d0d",
        bg: "#7d5f21",
        rot: -.02
    }, {
        z: -6.3,
        y: 1.8,
        size: 1.35,
        text: "TUN",
        font: "Bangers",
        fill: "#d1ccb9",
        outline: "#0b0c0c",
        bg: "#2e4c4b",
        rot: .035
    }, {
        z: -7.8,
        y: 1.15,
        size: 1.1,
        text: "STILL",
        fill: "#171918",
        outline: "#c8c3b0",
        bg: "#793429",
        rot: -.06
    }, {
        z: -9.4,
        y: 1.75,
        size: 1.29,
        text: "ROH",
        fill: "#c8c3af",
        outline: "#0b0c0c",
        bg: "#5e4a23",
        rot: .02
    }, {
        z: -11.2,
        y: 1.05,
        size: 1.05,
        text: "NIX",
        fill: "#c2bda9",
        outline: "#0b0c0c",
        bg: "#284644",
        rot: -.04
    }, {
        z: -12.6,
        y: 1.9,
        size: 1.18,
        text: "WAND",
        fill: "#161817",
        outline: "#c3beab",
        bg: "#763127",
        rot: .05
    }, {
        z: -14.4,
        y: 1.3,
        size: 1.12,
        text: "AUS",
        font: "Sedgwick Ave Display",
        fill: "#bcb7a4",
        outline: "#0a0b0b",
        bg: "#4f4324",
        rot: -.03
    }, {
        z: -16.1,
        y: 1.8,
        size: 1.04,
        text: "NACHT",
        fill: "#b6b29f",
        outline: "#090a0a",
        bg: "#354746",
        rot: .03
    }, {
        z: -18,
        y: 1.1,
        size: 1.15,
        text: "RHE",
        fill: "#b2ae9b",
        outline: "#080909",
        bg: "#623329",
        rot: -.04
    }, {
        z: -20,
        y: 1.85,
        size: 1,
        text: "ROH",
        fill: "#aaa693",
        outline: "#080909",
        bg: "#574522",
        rot: .02
    }, {
        z: -22.5,
        y: 1.2,
        size: .95,
        text: "STILL",
        font: "Bangers",
        fill: "#a6a28f",
        outline: "#080909",
        bg: "#314746",
        rot: -.03
    }, {
        z: -25.1,
        y: 1.75,
        size: .9,
        text: "WAND",
        fill: "#9e9a87",
        outline: "#070808",
        bg: "#57322a",
        rot: .02
    }, {
        z: -28,
        y: 1.25,
        size: .86,
        text: "NACHT",
        font: "Bangers",
        fill: "#96927f",
        outline: "#070808",
        bg: "#493f21",
        rot: -.02
    }, {
        z: -31,
        y: 1.6,
        size: .8,
        text: "AUS",
        fill: "#8c8875",
        outline: "#060707",
        bg: "#2f4442",
        rot: .02
    }, {
        z: -34,
        y: 1.3,
        size: .75,
        text: "NIX",
        fill: "#817d6b",
        outline: "#060707",
        bg: "#4b2c25",
        rot: -.02
    }, {
        z: -37.5,
        y: 1.55,
        size: .66,
        text: "STILL",
        fill: "#777362",
        outline: "#050606",
        bg: "#313d3b",
        rot: .02
    } ];
    for (const p of pieces) {
        const x = X(p.z);
        const y = Y(p.y);
        const size = p.size * pyPerMFor(H, yTop);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.bg;
        ctx.globalAlpha = .72;
        irregularBlobPath(ctx, 0, 0, size * 1.15, size * .62, rand, 16, .4);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
        tintedTextStroke(ctx, p.text, x, y, size, `"${p.font || "TunnelTag"}"`, p.fill, p.outline, size * .12, rand, {
            rotate: p.rot,
            skew: -.08,
            weight: 700,
            spray: true
        });
        ctx.save();
        ctx.globalAlpha = .2 + rand() * .2;
        ctx.font = `700 ${size * .97}px "${p.font || "TunnelTag"}"`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#e8d73c";
        ctx.translate(x + size * .03, y + size * .02);
        ctx.rotate(p.rot);
        ctx.fillText(p.text, 0, 0);
        ctx.restore();
    }
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const scrawl = (x, y, s, seedOffset, color) => {
        const rr = rng(seed + seedOffset);
        ctx.strokeStyle = color;
        for (let i = 0; i < 5; i++) {
            ctx.lineWidth = Math.max(1, s * .035);
            ctx.globalAlpha = .45 + rr() * .45;
            ctx.beginPath();
            let px = x + (rr() - .5) * s * 1.4;
            let py = y + (rr() - .5) * s * .7;
            ctx.moveTo(px, py);
            for (let j = 0; j < 5; j++) {
                const nx = px + (rr() - .2) * s * .48;
                const ny = py + (rr() - .5) * s * .46;
                ctx.quadraticCurveTo(px + (rr() - .5) * s * .35, py - s * .3, nx, ny);
                px = nx;
                py = ny;
            }
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    };
    for (let i = 0; i < Math.floor(len * .8); i++) {
        const zz = zNear - rand() * len;
        const yy = .35 + rand() * 2.25;
        scrawl(X(zz), Y(yy), .28 + rand() * .55, i * 19 + 3, rand() > .52 ? "#d8d3c0" : "#0c0d0d");
    }
    for (let i = 0; i < Math.floor(len * .22); i++) {
        const x = rand() * W;
        const y = H * (.18 + rand() * .65);
        const s = pxPerM * (.12 + rand() * .2);
        ctx.globalAlpha = .3 + rand() * .35;
        ctx.strokeStyle = rand() > .4 ? "#d5cfba" : "#121313";
        ctx.lineWidth = Math.max(1, s * .1);
        ctx.beginPath();
        ctx.moveTo(x - s, y + s * .5);
        ctx.lineTo(x, y - s * .35);
        ctx.lineTo(x + s, y + s * .5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - s * .7, y + s * .1);
        ctx.lineTo(x + s * .7, y + s * .1);
        ctx.stroke();
    }
    ctx.restore();
    for (let i = 0; i < Math.floor(len * 2.2); i++) {
        const zz = zNear - rand() * len;
        const yy = .25 + rand() * 2.5;
        const palette = [ "rgba(216,211,194,0.6)", "rgba(9,11,10,0.72)", "rgba(181,64,43,0.42)", "rgba(40,113,113,0.34)" ];
        const color = palette[Math.floor(rand() * palette.length)];
        const txt = [ "NOX", "RHE", "4", "SIN", "10", "K4", "WND", "OX" ][Math.floor(rand() * 8)];
        drawBakedHandTag(ctx, txt, X(zz), Y(yy), pyPerM * (.11 + rand() * .2), color, rand, (rand() - .5) * .3, .32 + rand() * .38);
    }
    ctx.save();
    for (let i = 0; i < Math.floor(len * 4); i++) {
        const x = rand() * W;
        const y = H * (.2 + rand() * .5);
        const lenPx = H * (.04 + rand() * .18);
        const g = ctx.createLinearGradient(x, y, x, y + lenPx);
        g.addColorStop(0, "rgba(9,10,9,0.35)");
        g.addColorStop(1, "rgba(9,10,9,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 1 + rand() * 3.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rand() - .5) * 5, y + lenPx);
        ctx.stroke();
    }
    ctx.restore();
    drawTileGrid(ctx, 0, 0, W, H, cols, rows, "#1c1d19", .3, Math.max(1, cw * .017));
    drawTileGrid(ctx, 0, 0, W, H, cols, rows, "#e1ddc6", .045, 1);
    const bottom = ctx.createLinearGradient(0, H, 0, H * .5);
    bottom.addColorStop(0, "rgba(3,6,5,0.82)");
    bottom.addColorStop(.35, "rgba(5,8,7,0.48)");
    bottom.addColorStop(1, "rgba(6,8,7,0)");
    ctx.fillStyle = bottom;
    ctx.fillRect(0, H * .45, W, H * .55);
    const dark = ctx.createLinearGradient(0, 0, W, H);
    dark.addColorStop(0, "rgba(4,7,7,0.32)");
    dark.addColorStop(.55, "rgba(4,7,7,0.12)");
    dark.addColorStop(1, "rgba(4,7,7,0.55)");
    ctx.fillStyle = dark;
    ctx.fillRect(0, 0, W, H);
    drawVerticalStreaks(ctx, W, H, rand, Math.floor(len * 1.4), [ 23, 24, 18 ], .25);
    drawVerticalStreaks(ctx, W, H, rand, Math.floor(len * .24), [ 84, 29, 17 ], .16);
    const rough = cachedNoise("right-cloud", 256, 4511, 3, 5, .55);
    drawNoiseOverlay(ctx, W, H, rough, .25, "multiply", "#5b5648");
    splatter(ctx, W, H, rand, Math.floor(len * 6), [ "#101110", "#8b8067", "#c4bca2", "#5f2d23" ], detail, .32);
    const grime = ctx.createLinearGradient(0, H, 0, H * .8);
    grime.addColorStop(0, "rgba(2,4,3,0.9)");
    grime.addColorStop(1, "rgba(2,4,3,0)");
    ctx.fillStyle = grime;
    ctx.fillRect(0, H * .8, W, H * .2);
}

function pyPerMFor(H, yTop) {
    return H / yTop;
}

export function makeRightWallTexture({zNear: zNear, zFar: zFar, yTop: yTop = 3, width: width = 2048, height: height = 1024, seed: seed = 2, anisotropy: anisotropy = 8, detail: detail = 1}) {
    const {canvas: canvas, ctx: ctx} = makeCanvas(width, height);
    paintRightWall(ctx, width, height, zNear, zFar, yTop, seed, detail);
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = anisotropy;
    tex.wrapS = tex.wrapT = ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
}

export function makeFloorTextures({anisotropy: anisotropy = 8, seed: seed = 21} = {}) {
    const S = 1024;
    const {canvas: canvas, ctx: ctx} = makeCanvas(S, S);
    const rand = rng(seed);
    const cols = 3;
    const rows = 2;
    ctx.fillStyle = "#151a18";
    ctx.fillRect(0, 0, S, S);
    const slabs = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const x = c * S / cols;
            const y = r * S / rows;
            const w = S / cols;
            const h = S / rows;
            const v = .75 + rand() * .25;
            ctx.fillStyle = rgba(53 * v, 59 * v, 54 * v);
            ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
            slabs.push([ x, y, w, h ]);
            const g = ctx.createLinearGradient(x, y, x + w, y + h);
            g.addColorStop(0, rgba(18, 24, 21, .18 + rand() * .25));
            g.addColorStop(.5, rgba(129, 119, 84, .03 + rand() * .06));
            g.addColorStop(1, rgba(11, 15, 13, .28));
            ctx.fillStyle = g;
            ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
            ctx.strokeStyle = "rgba(8,11,10,0.5)";
            ctx.lineWidth = 3 + rand() * 2;
            ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
            for (let i = 0; i < 7; i++) {
                ctx.strokeStyle = `rgba(150,145,113,${.025 + rand() * .06})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                let px = x + rand() * w;
                let py = y + rand() * h;
                ctx.moveTo(px, py);
                for (let k = 0; k < 4; k++) {
                    px += (rand() - .5) * w * .25;
                    py += (rand() - .5) * h * .18;
                    ctx.lineTo(px, py);
                }
                ctx.stroke();
            }
        }
    }
    for (let i = 0; i < 22; i++) {
        ctx.strokeStyle = `rgba(5,8,7,${.25 + rand() * .4})`;
        ctx.lineWidth = .7 + rand() * 1.5;
        ctx.beginPath();
        let x = rand() * S;
        let y = rand() * S;
        ctx.moveTo(x, y);
        for (let k = 0; k < 12; k++) {
            x += (rand() - .5) * 20;
            y += (rand() - .45) * 18;
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    const n = cachedNoise("floor-cloud", 512, 9341, 4, 6, .58);
    drawNoiseOverlay(ctx, S, S, n, .35, "multiply", "#4f4d3f");
    const n2 = cachedNoise("floor-fine", 512, 1153, 24, 4, .6);
    drawNoiseOverlay(ctx, S, S, n2, .18, "soft-light", null);
    splatter(ctx, S, S, rand, 900, [ "rgba(0,0,0,0.5)", "rgba(124,118,89,0.2)", "rgba(160,152,118,0.11)" ], 1.1, .4);
    ctx.strokeStyle = "rgba(3,5,4,0.85)";
    ctx.lineWidth = 6;
    for (let c = 1; c < cols; c++) {
        ctx.beginPath();
        ctx.moveTo(c * S / cols, 0);
        ctx.lineTo(c * S / cols, S);
        ctx.stroke();
    }
    for (let r = 1; r < rows; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * S / rows);
        ctx.lineTo(S, r * S / rows);
        ctx.stroke();
    }
    const {canvas: rCanvas, ctx: rctx} = makeCanvas(S, S);
    const rimg = rctx.createImageData(S, S);
    const rd = rimg.data;
    for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
            const a = fbm(x / S, y / S, 813, 6, 5, .58);
            const wet = Math.pow(1 - Math.abs(Math.sin(x / S * Math.PI * 7 + a * 2)), 4);
            const v = clamp(.16 + a * .4 + wet * .15, .08, .6);
            const i = (y * S + x) * 4;
            rd[i] = rd[i + 1] = rd[i + 2] = v * 255;
            rd[i + 3] = 255;
        }
    }
    rctx.putImageData(rimg, 0, 0);
    const {canvas: nCanvas, ctx: nctx} = makeCanvas(S, S);
    const nimg = nctx.createImageData(S, S);
    const nd = nimg.data;
    const sample = (x, y) => {
        const xx = (x + S) % S;
        const yy = (y + S) % S;
        const seamX = Math.abs(xx / S * cols - Math.round(xx / S * cols)) < .018;
        const seamY = Math.abs(yy / S * rows - Math.round(yy / S * rows)) < .018;
        const grain = fbm(xx / S, yy / S, 3109, 32, 3, .6);
        return .5 + grain * .2 - (seamX || seamY ? .18 : 0);
    };
    for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
            const l = sample(x - 1, y);
            const r = sample(x + 1, y);
            const u = sample(x, y - 1);
            const dn = sample(x, y + 1);
            let nx = (l - r) * 2.5;
            let ny = (dn - u) * 2.5;
            const inv = 1 / Math.hypot(nx, ny, 1);
            const i = (y * S + x) * 4;
            nd[i] = (nx * inv * .5 + .5) * 255;
            nd[i + 1] = (ny * inv * .5 + .5) * 255;
            nd[i + 2] = (inv * .5 + .5) * 255;
            nd[i + 3] = 255;
        }
    }
    nctx.putImageData(nimg, 0, 0);
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    map.wrapS = map.wrapT = RepeatWrapping;
    map.anisotropy = anisotropy;
    const rough = new CanvasTexture(rCanvas);
    rough.colorSpace = NoColorSpace;
    rough.wrapS = rough.wrapT = RepeatWrapping;
    rough.anisotropy = anisotropy;
    const normal = new CanvasTexture(nCanvas);
    normal.colorSpace = NoColorSpace;
    normal.wrapS = normal.wrapT = RepeatWrapping;
    normal.anisotropy = anisotropy;
    return {
        map: map,
        roughnessMap: rough,
        normalMap: normal
    };
}

function blurMaskInPlace(ctx, W, H, radius = 4, passes = 2) {
    const img = ctx.getImageData(0, 0, W, H);
    const d = img.data;
    const n = W * H;
    let src = new Float32Array(n);
    let tmp = new Float32Array(n);
    for (let i = 0; i < n; i++) src[i] = d[i * 4 + 1];
    const rw = radius * 2 + 1;
    for (let pass = 0; pass < passes; pass++) {
        for (let y = 0; y < H; y++) {
            const row = y * W;
            let sum = 0;
            for (let k = -radius; k <= radius; k++) sum += src[row + clamp(k, 0, W - 1)];
            for (let x = 0; x < W; x++) {
                tmp[row + x] = sum / rw;
                const add = clamp(x + radius + 1, 0, W - 1);
                const sub = clamp(x - radius, 0, W - 1);
                sum += src[row + add] - src[row + sub];
            }
        }
        for (let x = 0; x < W; x++) {
            let sum = 0;
            for (let k = -radius; k <= radius; k++) sum += tmp[clamp(k, 0, H - 1) * W + x];
            for (let y = 0; y < H; y++) {
                src[y * W + x] = sum / rw;
                const add = clamp(y + radius + 1, 0, H - 1);
                const sub = clamp(y - radius, 0, H - 1);
                sum += tmp[add * W + x] - tmp[sub * W + x];
            }
        }
    }
    for (let i = 0; i < n; i++) {
        const v = clamp(src[i], 0, 255);
        d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v;
        d[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
}

export function makePuddleMask({width: width = 4.7, zNear: zNear = 8.4, zFar: zFar = -38, pixelsW: pixelsW = 1024, pixelsL: pixelsL = 4096, anisotropy: anisotropy = 8} = {}) {
    const {canvas: canvas, ctx: ctx} = makeCanvas(pixelsW, pixelsL);
    const rand = rng(944);
    ctx.fillStyle = "#e9e9e9";
    ctx.fillRect(0, 0, pixelsW, pixelsL);
    const U = x => (x + width / 2) / width * pixelsW;
    const V = z => (zNear - z) / (zNear - zFar) * pixelsL;
    const sx = pixelsW / width;
    const sz = pixelsL / (zNear - zFar);
    const puddles = [ {
        x: -.55,
        z: 3.6,
        rx: 1.45,
        rz: 1.6,
        depth: 1
    }, {
        x: .85,
        z: 1.2,
        rx: .8,
        rz: 1.9,
        depth: .85
    }, {
        x: -1.65,
        z: 1.7,
        rx: .48,
        rz: 2.1,
        depth: .9
    }, {
        x: -.15,
        z: -2.3,
        rx: 1.2,
        rz: 2.35,
        depth: 1
    }, {
        x: 1.15,
        z: -4.4,
        rx: .9,
        rz: 2.8,
        depth: .72
    }, {
        x: -1.5,
        z: -5.8,
        rx: .5,
        rz: 1.3,
        depth: .8
    }, {
        x: .1,
        z: -8.1,
        rx: .85,
        rz: 1.9,
        depth: .8
    }, {
        x: -.9,
        z: -12.3,
        rx: 1,
        rz: 2.7,
        depth: .7
    }, {
        x: 1.55,
        z: -13,
        rx: .45,
        rz: 3.6,
        depth: .8
    }, {
        x: -1.75,
        z: -16.7,
        rx: .45,
        rz: 2.3,
        depth: .62
    }, {
        x: .35,
        z: -19.8,
        rx: .95,
        rz: 2.6,
        depth: .5
    }, {
        x: -1.1,
        z: -24,
        rx: .8,
        rz: 2.2,
        depth: .38
    }, {
        x: .7,
        z: -28.4,
        rx: .65,
        rz: 1.8,
        depth: .28
    }, {
        x: -.3,
        z: -32,
        rx: .6,
        rz: 1.4,
        depth: .16
    } ];
    for (const p of puddles) {
        const x = U(p.x);
        const y = V(p.z);
        ctx.save();
        ctx.globalAlpha = .42 + .58 * p.depth;
        ctx.fillStyle = "#000";
        irregularBlobPath(ctx, x, y, p.rx * sx, p.rz * sz, rand, 28, .36);
        ctx.fill();
        for (let k = 0; k < 3; k++) {
            const ox = (rand() - .5) * p.rx * 1.1 * sx;
            const oz = (rand() - .5) * p.rz * .9 * sz;
            ctx.globalAlpha = (.18 + rand() * .5) * p.depth;
            irregularBlobPath(ctx, x + ox, y + oz, p.rx * sx * (.15 + rand() * .42), p.rz * sz * (.2 + rand() * .5), rand, 18, .55);
            ctx.fill();
        }
        ctx.restore();
        ctx.save();
        for (let k = 0; k < 7; k++) {
            const a = rand() * Math.PI * 2;
            const rr = 1.15 + rand() * .7;
            const dx = Math.cos(a) * p.rx * sx * rr;
            const dy = Math.sin(a) * p.rz * sz * rr;
            ctx.globalAlpha = .16 + rand() * .4 * p.depth;
            ctx.fillStyle = "#000";
            irregularBlobPath(ctx, x + dx, y + dy, (2 + rand() * 11) * 1.3, 4 + rand() * 28, rand, 9, .7);
            ctx.fill();
        }
        ctx.restore();
    }
    blurMaskInPlace(ctx, pixelsW, pixelsL, 4, 2);
    ctx.save();
    for (let i = 0; i < 26; i++) {
        const x = U((rand() - .5) * width * .92);
        const y = V(zNear - rand() * (zNear - zFar) * .7);
        ctx.globalAlpha = .08 + rand() * .2;
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.ellipse(x, y, 2 + rand() * 8, 40 + rand() * 170, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
    ctx.save();
    const fadeStartZ = zFar + (zNear - zFar) * .16;
    const fade = ctx.createLinearGradient(0, V(fadeStartZ), 0, V(zFar));
    fade.addColorStop(0, "rgba(255,255,255,0)");
    fade.addColorStop(.7, "rgba(255,255,255,0.86)");
    fade.addColorStop(1, "#ffffff");
    ctx.fillStyle = fade;
    ctx.fillRect(0, V(fadeStartZ), pixelsW, pixelsL - V(fadeStartZ));
    ctx.restore();
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = NoColorSpace;
    tex.wrapS = tex.wrapT = ClampToEdgeWrapping;
    tex.anisotropy = anisotropy;
    tex.minFilter = LinearFilter;
    tex.magFilter = LinearFilter;
    tex.needsUpdate = true;
    return tex;
}

export function makeConcreteTextures({size: size = 1024, seed: seed = 51, anisotropy: anisotropy = 8} = {}) {
    const {canvas: canvas, ctx: ctx} = makeCanvas(size, size);
    const rand = rng(seed);
    ctx.fillStyle = "#67675f";
    ctx.fillRect(0, 0, size, size);
    const cloud = cachedNoise("concrete-cloud", 512, seed, 3, 6, .58);
    const fine = cachedNoise("concrete-fine", 512, seed + 19, 22, 4, .62);
    ctx.save();
    ctx.globalAlpha = .52;
    ctx.globalCompositeOperation = "overlay";
    ctx.drawImage(cloud, 0, 0, size, size);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = .15;
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(fine, 0, 0, size, size);
    ctx.restore();
    for (let i = 0; i < 26; i++) {
        const x = rand() * size;
        const y = rand() * size;
        const r = size * (.05 + rand() * .25);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        const dark = rand() > .4;
        g.addColorStop(0, dark ? `rgba(33,35,31,${.08 + rand() * .2})` : `rgba(191,185,164,${.03 + rand() * .08})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.save();
    ctx.strokeStyle = "rgba(32,32,28,0.33)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 8; i++) {
        const y = i / 8 * size + (rand() - .5) * 12;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size, y + (rand() - .5) * 6);
        ctx.stroke();
    }
    for (let i = 0; i < 5; i++) {
        const x = rand() * size;
        ctx.strokeStyle = `rgba(34,35,30,${.08 + rand() * .15})`;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + (rand() - .5) * 30, size);
        ctx.stroke();
    }
    ctx.restore();
    for (let i = 0; i < 26; i++) {
        let x = rand() * size;
        let y = rand() * size;
        ctx.strokeStyle = `rgba(21,23,20,${.18 + rand() * .3})`;
        ctx.lineWidth = .6 + rand() * 1.3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let k = 0; k < 10; k++) {
            x += (rand() - .5) * 38;
            y += (rand() - .5) * 22;
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    drawVerticalStreaks(ctx, size, size, rand, 16, [ 30, 31, 25 ], .19);
    splatter(ctx, size, size, rand, 1200, [ "rgba(15,16,13,0.3)", "rgba(138,132,112,0.18)", "rgba(83,80,66,0.2)" ], 1, .35);
    for (let i = 0; i < 16; i++) {
        const x = rand() * size;
        const y = rand() * size;
        const r = 10 + rand() * 55;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(210,208,190,${.02 + rand() * .05})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    map.wrapS = map.wrapT = RepeatWrapping;
    map.anisotropy = anisotropy;
    const B = 512;
    const {canvas: bc, ctx: bctx} = makeCanvas(B, B);
    const bimg = bctx.createImageData(B, B);
    const bd = bimg.data;
    for (let y = 0; y < B; y++) {
        for (let x = 0; x < B; x++) {
            let h = .5 + (fbm(x / B, y / B, seed + 5, 8, 5, .55) - .5) * .32;
            h += (fbm(x / B, y / B, seed + 9, 32, 3, .6) - .5) * .15;
            const seam = Math.abs(y / B * 8 - Math.round(y / B * 8));
            if (seam < .007) h -= .12;
            const i = (y * B + x) * 4;
            bd[i] = bd[i + 1] = bd[i + 2] = clamp(h, 0, 1) * 255;
            bd[i + 3] = 255;
        }
    }
    bctx.putImageData(bimg, 0, 0);
    const bump = new CanvasTexture(bc);
    bump.colorSpace = NoColorSpace;
    bump.wrapS = bump.wrapT = RepeatWrapping;
    bump.anisotropy = anisotropy;
    return {
        map: map,
        bump: bump
    };
}

export function makeRustTexture({size: size = 512, seed: seed = 71, anisotropy: anisotropy = 8} = {}) {
    const {canvas: canvas, ctx: ctx} = makeCanvas(size, size);
    const rand = rng(seed);
    ctx.fillStyle = "#3b3c38";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 60; i++) {
        const x = rand() * size;
        const y = rand() * size;
        const r = size * (.01 + rand() * .17);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        const c = rand();
        if (c > .6) {
            g.addColorStop(0, `rgba(112,56,27,${.25 + rand() * .45})`);
            g.addColorStop(.6, `rgba(72,41,24,${.1 + rand() * .3})`);
        } else if (c > .3) {
            g.addColorStop(0, `rgba(67,73,69,${.2 + rand() * .4})`);
            g.addColorStop(.8, "rgba(35,37,34,0)");
        } else {
            g.addColorStop(0, `rgba(163,144,111,${.1 + rand() * .18})`);
        }
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 32; i++) {
        ctx.strokeStyle = `rgba(170,166,143,${.03 + rand() * .14})`;
        ctx.lineWidth = .6 + rand() * 1.8;
        ctx.beginPath();
        const x = rand() * size;
        const y = rand() * size;
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rand() - .5) * 25, y + 30 + rand() * 100);
        ctx.stroke();
    }
    const n = cachedNoise("rust-fine", 256, 131, 16, 4, .62);
    drawNoiseOverlay(ctx, size, size, n, .28, "overlay", null);
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    tex.wrapS = tex.wrapT = RepeatWrapping;
    tex.anisotropy = anisotropy;
    return tex;
}

export function makeDiffuserTexture({anisotropy: anisotropy = 4} = {}) {
    const W = 256;
    const H = 1024;
    const {canvas: canvas, ctx: ctx} = makeCanvas(W, H);
    ctx.fillStyle = "#6f634f";
    ctx.fillRect(0, 0, W, H);
    const panelGrad = ctx.createLinearGradient(0, 0, 0, H);
    panelGrad.addColorStop(0, "rgba(230,214,174,0.75)");
    panelGrad.addColorStop(.35, "rgba(241,224,184,0.96)");
    panelGrad.addColorStop(.78, "rgba(233,213,167,0.9)");
    panelGrad.addColorStop(1, "rgba(176,155,115,0.7)");
    ctx.fillStyle = panelGrad;
    ctx.fillRect(15, 10, W - 30, H - 20);
    ctx.fillStyle = "#17150f";
    ctx.fillRect(0, 0, 12, H);
    ctx.fillRect(W - 12, 0, 12, H);
    ctx.fillRect(0, 0, W, 16);
    ctx.fillRect(0, H - 16, W, 16);
    ctx.fillStyle = "rgba(18,16,12,0.8)";
    ctx.fillRect(W * .5 - 2, 20, 4, H - 40);
    const tube = (cx, w) => {
        const g = ctx.createLinearGradient(cx - w, 0, cx + w, 0);
        g.addColorStop(0, "rgba(255,244,216,0)");
        g.addColorStop(.25, "rgba(255,247,224,0.42)");
        g.addColorStop(.44, "rgba(255,255,249,0.92)");
        g.addColorStop(.5, "rgba(255,255,255,1)");
        g.addColorStop(.56, "rgba(255,252,242,0.92)");
        g.addColorStop(.75, "rgba(255,244,216,0.4)");
        g.addColorStop(1, "rgba(255,244,216,0)");
        ctx.fillStyle = g;
        ctx.fillRect(cx - w, 28, w * 2, H - 56);
        ctx.fillStyle = "rgba(255,251,230,0.8)";
        ctx.fillRect(cx - 1.2, 52, 2.4, H - 104);
    };
    tube(W * .33, W * .107);
    tube(W * .67, W * .107);
    const rand = rng(496);
    for (let i = 0; i < 85; i++) {
        ctx.fillStyle = `rgba(69,54,27,${.04 + rand() * .23})`;
        ctx.beginPath();
        ctx.ellipse(18 + rand() * (W - 36), 20 + rand() * (H - 40), 1 + rand() * 15, 2 + rand() * 36, rand() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }
    for (let i = 0; i < 25; i++) {
        ctx.fillStyle = `rgba(93,47,22,${.05 + rand() * .2})`;
        ctx.beginPath();
        ctx.ellipse(rand() * W, rand() > .5 ? 20 + rand() * 60 : H - 30 - rand() * 70, 4 + rand() * 22, 2 + rand() * 12, rand(), 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.strokeStyle = "rgba(14,13,10,0.8)";
    ctx.lineWidth = 4;
    ctx.strokeRect(9, 9, W - 18, H - 18);
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = anisotropy;
    return tex;
}

function roughTextLayer(canvas, text, {font: font = "TunnelTag", size: size = 300, color: color = "#0b0c0c", lines: lines, lineHeight: lineHeight = .82, weight: weight = 700, spacing: spacing = 0, skew: skew = 0, rotate: rotate = 0, x: x = .5, y: y = .5, stroke: stroke = 0, strokeColor: strokeColor = null, alpha: alpha = .95, seed: seed = 1, chips: chips = true, drips: drips = true, wobble: wobble = true, stagger: stagger = 0, xScale: xScale = 1}) {
    const ctx = canvas.getContext("2d");
    const rand = rng(seed);
    const linesArr = lines || [ text ];
    ctx.save();
    ctx.translate(canvas.width * x, canvas.height * y);
    ctx.rotate(rotate);
    if (skew) ctx.transform(1, 0, skew, 1, 0, 0);
    if (xScale !== 1) ctx.scale(xScale, 1);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${size}px "${font}"`;
    ctx.letterSpacing = `${spacing}px`;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    const glyphs = [];
    linesArr.forEach((line, li) => {
        const baseY = (li - (linesArr.length - 1) / 2) * size * lineHeight;
        if (!wobble) {
            const w = ctx.measureText(line).width;
            glyphs.push({
                line: line,
                x: -w / 2,
                y: baseY,
                rot: 0,
                scaleX: 1,
                scaleY: 1,
                lx: 0,
                ly: 0
            });
            return;
        }
        const chars = [ ...line ];
        const widths = chars.map(ch => ctx.measureText(ch).width);
        const total = widths.reduce((a, b) => a + b, 0) + spacing * Math.max(0, chars.length - 1);
        let cursor = -total / 2;
        if (linesArr.length > 1) cursor += li === 0 ? stagger * size : -stagger * size * .25;
        let drift = (rand() - .5) * size * .025;
        for (let i = 0; i < chars.length; i++) {
            const ch = chars[i];
            const w = widths[i];
            const rotJ = (rand() - .5) * .065;
            const dy = (rand() - .5) * size * .045;
            const sx = 1 + (rand() - .5) * .09;
            const sy = 1 + (rand() - .5) * .1;
            drift = drift * .6 + (rand() - .5) * size * .018;
            glyphs.push({
                ch: ch,
                x: cursor + w / 2,
                y: baseY + dy + drift,
                rot: rotJ,
                scaleX: sx,
                scaleY: sy
            });
            cursor += w + spacing;
        }
    });
    const drawGlyphs = (alphaVal, jitter = 0, strokeWidth = 0, useStroke = false, colorVal = color) => {
        ctx.globalAlpha = alphaVal;
        ctx.fillStyle = colorVal;
        if (useStroke) {
            ctx.strokeStyle = strokeColor || colorVal;
            ctx.lineWidth = strokeWidth;
        }
        for (const g of glyphs) {
            ctx.save();
            ctx.translate(g.x + (rand() - .5) * jitter, g.y + (rand() - .5) * jitter);
            ctx.rotate(g.rot + (rand() - .5) * jitter * .005);
            ctx.scale(g.scaleX, g.scaleY);
            const draw = g.ch ?? g.line;
            if (useStroke && strokeWidth > 0) {
                ctx.strokeText(draw, 0, 0);
                if (jitter < 3) ctx.strokeText(draw, (rand() - .5) * 1.5, (rand() - .5) * 1.5);
            }
            ctx.fillText(draw, 0, 0);
            if (jitter < 3) ctx.fillText(draw, (rand() - .5) * 2.2, (rand() - .5) * 1.4);
            ctx.restore();
        }
        ctx.globalAlpha = 1;
    };
    for (let pass = 0; pass < 13; pass++) {
        drawGlyphs(.022 + pass * .004, 3 + rand() * 8, 0, false, color);
    }
    if (stroke > 0) {
        drawGlyphs(alpha, 2, stroke, true, color);
    }
    drawGlyphs(alpha, 1.1, 0, false, color);
    ctx.restore();
    if (chips) {
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        for (let i = 0; i < 150; i++) {
            const px = rand() * canvas.width;
            const py = canvas.height * (.18 + rand() * .72);
            ctx.globalAlpha = .12 + rand() * .5;
            const rw = .4 + Math.pow(rand(), 2) * 13;
            const rh = .4 + Math.pow(rand(), 2) * 6;
            ctx.beginPath();
            ctx.ellipse(px, py, rw, rh, rand() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
            if (rand() > .86) {
                ctx.beginPath();
                ctx.ellipse(px + (rand() - .5) * 18, py + (rand() - .5) * 9, rw * .4, rh * 2.2, rand() * Math.PI, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = .32;
        ctx.lineCap = "round";
        for (let i = 0; i < 14; i++) {
            ctx.lineWidth = 1 + rand() * 5;
            ctx.beginPath();
            const px = rand() * canvas.width;
            const py = canvas.height * (.3 + rand() * .45);
            ctx.moveTo(px, py);
            ctx.lineTo(px + (rand() - .3) * canvas.width * .3, py + (rand() - .5) * 12);
            ctx.stroke();
        }
        ctx.restore();
    }
    if (drips) {
        ctx.save();
        ctx.globalAlpha = .64;
        ctx.lineCap = "round";
        for (let i = 0; i < 9; i++) {
            const px = canvas.width * (.16 + rand() * .68);
            const py = canvas.height * (.55 + rand() * .25);
            const len = 18 + rand() * canvas.height * .2;
            const w = 2 + rand() * 6.5;
            const grad = ctx.createLinearGradient(px, py, px, py + len);
            grad.addColorStop(0, color);
            grad.addColorStop(.18, color);
            grad.addColorStop(1, "rgba(0,0,0,0)");
            ctx.strokeStyle = grad;
            ctx.lineWidth = w;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.bezierCurveTo(px + (rand() - .5) * 8, py + len * .3, px + (rand() - .5) * 12, py + len * .7, px + (rand() - .5) * 8, py + len);
            ctx.stroke();
            if (rand() > .45) {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(px, py + len, w * .72, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }
    ctx.save();
    for (let i = 0; i < 300; i++) {
        ctx.globalAlpha = .05 + rand() * .22;
        ctx.fillStyle = color;
        const px = rand() * canvas.width;
        const py = rand() * canvas.height;
        ctx.beginPath();
        ctx.arc(px, py, .3 + Math.pow(rand(), 2) * 3.1, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function markerScrawl(canvas, rand, color = "#101111", loops = 6) {
    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const W = canvas.width;
    const H = canvas.height;
    for (let i = 0; i < loops; i++) {
        ctx.lineWidth = W * (.003 + rand() * .007);
        ctx.globalAlpha = .65 + rand() * .3;
        let x = W * (.12 + rand() * .68);
        let y = H * (.2 + rand() * .5);
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let k = 0; k < 6; k++) {
            const nx = x + (rand() - .2) * W * .17;
            const ny = y + (rand() - .5) * H * .18;
            ctx.quadraticCurveTo(x + (rand() - .5) * W * .16, y + (rand() - .5) * H * .22, nx, ny);
            x = nx;
            y = ny;
        }
        ctx.stroke();
    }
    ctx.restore();
}

export function makeTagTexture(opts = {}) {
    const W = opts.width || 2048;
    const H = opts.height || 1024;
    const {canvas: canvas, ctx: ctx} = makeCanvas(W, H);
    const rand = rng(opts.seed || 3);
    if (opts.kind === "logo") {
        ctx.strokeStyle = opts.color || "#d8d3bf";
        ctx.lineWidth = W * .012;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(W * .18, H * .66);
        ctx.lineTo(W * .28, H * .36);
        ctx.lineTo(W * .43, H * .57);
        ctx.lineTo(W * .55, H * .29);
        ctx.lineTo(W * .68, H * .56);
        ctx.lineTo(W * .81, H * .35);
        ctx.lineTo(W * .84, H * .68);
        ctx.stroke();
        markerScrawl(canvas, rand, opts.color || "#d8d3bf", 2);
    } else if (opts.kind === "handstyle") {
        markerScrawl(canvas, rand, opts.color || "#101111", opts.loops || 5);
        if (opts.sig) {
            ctx.save();
            ctx.translate(W * .56, H * .58);
            ctx.rotate(-.08);
            ctx.font = `400 ${H * .27}px "Sedgwick Ave Display"`;
            ctx.fillStyle = opts.color || "#101111";
            ctx.fillText(opts.sig, 0, 0);
            ctx.restore();
        }
    } else if (opts.kind === "sticker") {
        ctx.fillStyle = opts.paper || "#c3bca7";
        ctx.fillRect(W * .1, H * .08, W * .8, H * .84);
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, "rgba(255,255,245,0.2)");
        grad.addColorStop(.5, "rgba(44,40,29,0.1)");
        grad.addColorStop(1, "rgba(12,12,10,0.4)");
        ctx.fillStyle = grad;
        ctx.fillRect(W * .1, H * .08, W * .8, H * .84);
        ctx.fillStyle = opts.color || "#181917";
        ctx.font = `700 ${H * .24}px "TunnelWide"`;
        ctx.textAlign = "center";
        ctx.fillText(opts.text || "NACHT", W * .5, H * .42);
        ctx.font = `700 ${H * .075}px "TunnelTag"`;
        ctx.fillText(opts.subtext || "bitte nicht.", W * .5, H * .56);
        ctx.strokeStyle = "rgba(30,29,24,0.3)";
        ctx.strokeRect(W * .16, H * .63, W * .68, 1);
        ctx.globalCompositeOperation = "destination-out";
        for (let i = 0; i < 90; i++) {
            ctx.globalAlpha = .3 + rand() * .6;
            ctx.beginPath();
            const edge = rand();
            const x = edge < .5 ? W * (.09 + rand() * .05) + (rand() > .5 ? W * .81 : 0) : rand() * W;
            const y = rand() < .5 ? H * (.06 + rand() * .12) : rand() * H;
            ctx.ellipse(x, y, 2 + rand() * 12, 2 + rand() * 5, rand(), 0, Math.PI * 2);
            ctx.fill();
        }
    } else {
        const color = opts.color || "#101111";
        const isOutline = opts.kind === "outline";
        const size = opts.size || 280;
        roughTextLayer(canvas, opts.text || "TAG", {
            font: opts.font || "TunnelTag",
            size: size,
            color: isOutline ? opts.fill || "#ded9c6" : color,
            lines: opts.lines,
            lineHeight: opts.lineHeight || .8,
            stroke: isOutline ? opts.strokeWidth || size * .1 : opts.stroke || 0,
            strokeColor: isOutline ? opts.color || "#131414" : null,
            rotate: opts.rotate || 0,
            skew: opts.skew ?? -.1,
            spacing: opts.spacing || 0,
            stagger: opts.stagger || 0,
            xScale: opts.xScale || 1,
            alpha: opts.alpha ?? .92,
            seed: opts.seed || 3,
            chips: true,
            drips: opts.drips !== false
        });
        if (opts.accent) {
            ctx.save();
            ctx.strokeStyle = opts.accent;
            ctx.lineWidth = H * .018;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(W * .15, H * .82);
            ctx.bezierCurveTo(W * .36, H * .77, W * .63, H * .86, W * .86, H * .8);
            ctx.stroke();
            ctx.restore();
        }
        if (opts.dots) {
            ctx.save();
            ctx.fillStyle = color;
            for (let i = 0; i < 3; i++) {
                const dx = W * (.36 + i * .075);
                const dy = H * (.85 + (rand() - .5) * .02);
                ctx.globalAlpha = .8;
                ctx.beginPath();
                ctx.ellipse(dx, dy, W * (.008 + rand() * .004), H * (.012 + rand() * .005), (rand() - .5) * .5, 0, Math.PI * 2);
                ctx.fill();
                if (rand() > .45) {
                    ctx.globalAlpha = .35;
                    ctx.fillRect(dx + (rand() - .5) * 3, dy, W * .003, H * (.01 + rand() * .02));
                }
            }
            ctx.restore();
        }
        if (opts.spray !== false) {
            ctx.save();
            for (let i = 0; i < 180; i++) {
                const a = rand() * Math.PI * 2;
                const rr = Math.pow(rand(), .5);
                const x = W * .5 + Math.cos(a) * rr * W * .45;
                const y = H * .5 + Math.sin(a) * rr * H * .38;
                ctx.fillStyle = isOutline ? color : color;
                ctx.globalAlpha = .035 + rand() * .18;
                ctx.beginPath();
                ctx.arc(x, y, .5 + rand() * 3.6, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
        if (opts.extraScrawl) markerScrawl(canvas, rand, opts.extraScrawl, 3);
    }
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = opts.anisotropy || 8;
    tex.needsUpdate = true;
    return tex;
}

export function makeDotsTexture({anisotropy: anisotropy = 8} = {}) {
    const {canvas: canvas, ctx: ctx} = makeCanvas(512, 256);
    const rand = rng(712);
    ctx.fillStyle = "#0a0c0b";
    for (let i = 0; i < 3; i++) {
        const x = 132 + i * 124 + (rand() - .5) * 18;
        const y = 118 + (rand() - .5) * 14;
        ctx.globalAlpha = .87;
        ctx.beginPath();
        ctx.ellipse(x, y, 17 + rand() * 9, 14 + rand() * 7, (rand() - .5) * .5, 0, Math.PI * 2);
        ctx.fill();
        if (rand() > .3) {
            ctx.globalAlpha = .5;
            ctx.fillRect(x + (rand() - .5) * 10, y + 12, 3 + rand() * 3, 12 + rand() * 34);
        }
    }
    ctx.globalAlpha = 1;
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = anisotropy;
    return tex;
}

export function makePaperTexture({variant: variant = 0, anisotropy: anisotropy = 4} = {}) {
    const S = 512;
    const {canvas: canvas, ctx: ctx} = makeCanvas(S, S);
    const rand = rng(600 + variant);
    ctx.fillStyle = variant === 1 ? "#bbb9a8" : "#d5d0be";
    ctx.fillRect(0, 0, S, S);
    if (variant === 2) {
        ctx.fillStyle = "rgba(55,32,24,0.5)";
        ctx.fillRect(S * .12, S * .16, S * .76, S * .08);
        ctx.fillStyle = "rgba(38,41,36,0.35)";
        for (let i = 0; i < 8; i++) {
            ctx.fillRect(S * .14, S * (.3 + i * .06), S * (.4 + rand() * .36), 2.3);
        }
    } else {
        for (let i = 0; i < 16; i++) {
            ctx.fillStyle = `rgba(38,37,32,${.04 + rand() * .1})`;
            ctx.fillRect(S * .08, S * (.12 + i * .05), S * (.4 + rand() * .5), 1 + rand() * 2);
        }
    }
    const folds = 7;
    for (let i = 0; i < folds; i++) {
        ctx.strokeStyle = `rgba(45,42,34,${.08 + rand() * .24})`;
        ctx.lineWidth = 1 + rand() * 2;
        ctx.beginPath();
        let x = rand() * S;
        let y = rand() * S;
        ctx.moveTo(x, y);
        for (let k = 0; k < 4; k++) {
            x += (rand() - .5) * S * .4;
            y += (rand() - .5) * S * .2;
            ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.strokeStyle = "rgba(235,232,215,0.13)";
        ctx.beginPath();
        ctx.moveTo(x + 2, y + 2);
        ctx.lineTo(x + 12, y + 4);
        ctx.stroke();
    }
    const g = ctx.createRadialGradient(S * .8, S * .9, 0, S * .8, S * .9, S * .8);
    g.addColorStop(0, "rgba(30,30,23,0.22)");
    g.addColorStop(1, "rgba(30,30,23,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    splatter(ctx, S, S, rand, 40, [ "rgba(30,29,23,0.15)", "rgba(120,104,67,0.18)" ], 1, .3);
    const {canvas: ac, ctx: actx} = makeCanvas(S, S);
    actx.fillStyle = "#fff";
    actx.beginPath();
    const corners = [ [ .12, .2 ], [ .36, .13 ], [ .63, .16 ], [ .9, .1 ], [ .93, .37 ], [ .87, .62 ], [ .9, .88 ], [ .64, .84 ], [ .41, .92 ], [ .15, .83 ], [ .08, .6 ], [ .13, .37 ] ];
    for (let i = 0; i < corners.length; i++) {
        const [cx, cy] = corners[i];
        const [nx, ny] = corners[(i + 1) % corners.length];
        const x = S * (cx + (rand() - .5) * .035);
        const y = S * (cy + (rand() - .5) * .03);
        if (i === 0) actx.moveTo(x, y); else actx.lineTo(x, y);
        const mx = S * ((cx + nx) * .5 + (rand() - .5) * .05);
        const my = S * ((cy + ny) * .5 + (rand() - .5) * .04);
        actx.lineTo(mx, my);
    }
    actx.closePath();
    actx.fill();
    actx.globalCompositeOperation = "destination-out";
    actx.beginPath();
    actx.moveTo(S * .78, S * .08);
    actx.lineTo(S * .97, S * .14);
    actx.lineTo(S * .81, S * .31);
    actx.closePath();
    actx.fill();
    actx.globalCompositeOperation = "source-over";
    for (let i = 0; i < 5; i++) {
        actx.fillStyle = "rgba(0,0,0,1)";
        actx.globalCompositeOperation = "destination-out";
        actx.beginPath();
        actx.ellipse(S * (.1 + rand() * .8), S * (.1 + rand() * .8), 2 + rand() * 7, 1 + rand() * 3, rand() * Math.PI, 0, Math.PI * 2);
        actx.fill();
    }
    actx.globalCompositeOperation = "source-over";
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = anisotropy;
    const alpha = new CanvasTexture(ac);
    alpha.colorSpace = NoColorSpace;
    return {
        map: tex,
        alphaMap: alpha
    };
}

export function makeAusgangTexture() {
    const W = 1024;
    const H = 256;
    const {canvas: canvas, ctx: ctx} = makeCanvas(W, H);
    const rand = rng(288);
    ctx.fillStyle = "#102027";
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) {
        ctx.fillStyle = `rgba(120,150,160,${.015 + rand() * .04})`;
        ctx.fillRect(0, rand() * H, W, 1 + rand() * 3);
    }
    ctx.strokeStyle = "#c7c5ae";
    ctx.lineWidth = 6;
    ctx.strokeRect(15, 15, W - 30, H - 30);
    ctx.fillStyle = "#d6d2bd";
    ctx.font = '500 86px "TunnelTag"';
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("Ausgang", 78, H * .48);
    ctx.strokeStyle = "#d6d2bd";
    ctx.lineWidth = 11;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(W - 174, H * .5);
    ctx.lineTo(W - 86, H * .5);
    ctx.moveTo(W - 120, H * .32);
    ctx.lineTo(W - 82, H * .5);
    ctx.lineTo(W - 120, H * .68);
    ctx.stroke();
    ctx.strokeStyle = "#d6d2bd";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(W - 54, H * .35, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(W - 54, H * .43);
    ctx.lineTo(W - 60, H * .67);
    ctx.moveTo(W - 59, H * .54);
    ctx.lineTo(W - 35, H * .55);
    ctx.moveTo(W - 60, H * .67);
    ctx.lineTo(W - 72, H * .84);
    ctx.moveTo(W - 60, H * .67);
    ctx.lineTo(W - 42, H * .83);
    ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,0.24)";
    for (let i = 0; i < 24; i++) {
        ctx.beginPath();
        ctx.ellipse(rand() * W, rand() * H, 8 + rand() * 80, 2 + rand() * 12, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
}

export function makeGrateTexture({anisotropy: anisotropy = 8} = {}) {
    const W = 256;
    const H = 512;
    const {canvas: canvas, ctx: ctx} = makeCanvas(W, H);
    const rand = rng(77);
    ctx.fillStyle = "#161917";
    ctx.fillRect(0, 0, W, H);
    const cols = 7;
    for (let c = 0; c < cols; c++) {
        const x = c / (cols - 1) * (W - 18) + 9;
        const g = ctx.createLinearGradient(x - 6, 0, x + 6, 0);
        g.addColorStop(0, "#3b3e36");
        g.addColorStop(.3, "#a9ab9a");
        g.addColorStop(.52, "#6a6c5f");
        g.addColorStop(1, "#20231f");
        ctx.fillStyle = g;
        ctx.fillRect(x - 5, 0, 10, H);
    }
    for (let y = 0; y < H; y += 64) {
        const g = ctx.createLinearGradient(0, y, 0, y + 10);
        g.addColorStop(0, "#4a4c43");
        g.addColorStop(.5, "#222520");
        g.addColorStop(1, "#121411");
        ctx.fillStyle = g;
        ctx.fillRect(0, y, W, 11 + rand() * 3);
    }
    splatter(ctx, W, H, rand, 260, [ "rgba(78,53,31,0.3)", "rgba(94,91,72,0.2)", "rgba(0,0,0,0.4)" ], .8, .4);
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    tex.wrapS = tex.wrapT = RepeatWrapping;
    tex.anisotropy = anisotropy;
    return tex;
}

export function makeDoorTexture({anisotropy: anisotropy = 8, seed: seed = 101} = {}) {
    const W = 512;
    const H = 1024;
    const {canvas: canvas, ctx: ctx} = makeCanvas(W, H);
    const rand = rng(seed);
    ctx.fillStyle = "#383b36";
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "rgba(147,140,115,0.13)");
    g.addColorStop(.5, "rgba(22,25,22,0.18)");
    g.addColorStop(1, "rgba(9,12,10,0.55)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(11,13,11,0.75)";
    ctx.lineWidth = 7;
    ctx.strokeRect(W * .1, H * .08, W * .8, H * .3);
    ctx.strokeRect(W * .1, H * .46, W * .8, H * .42);
    ctx.strokeStyle = "rgba(143,136,109,0.2)";
    ctx.lineWidth = 2;
    ctx.strokeRect(W * .13, H * .1, W * .74, H * .26);
    for (let i = 0; i < 16; i++) {
        const x = W * (.1 + i % 2 * .77);
        const y = H * (.1 + Math.floor(i / 2) * .09);
        ctx.fillStyle = "rgba(9,10,9,0.65)";
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(150,142,112,0.22)";
        ctx.beginPath();
        ctx.arc(x - 1, y - 1, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = "#191b18";
    ctx.fillRect(W * .68, H * .52, W * .13, H * .06);
    ctx.fillStyle = "#717066";
    ctx.fillRect(W * .7, H * .545, W * .09, H * .012);
    for (let i = 0; i < 36; i++) {
        const x = rand() * W;
        const y = H * (.5 + rand() * .5);
        const r = 6 + rand() * 48;
        const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
        rg.addColorStop(0, `rgba(107,53,25,${.1 + rand() * .35})`);
        rg.addColorStop(1, "rgba(40,24,13,0)");
        ctx.fillStyle = rg;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    drawVerticalStreaks(ctx, W, H, rand, 12, [ 28, 28, 21 ], .25);
    drawNoiseOverlay(ctx, W, H, cachedNoise("door-grime", 256, 918, 5, 5, .55), .26, "multiply", "#5d5847");
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = anisotropy;
    return tex;
}

export function makeStainTexture({seed: seed = 41, color: color = [ 12, 14, 11 ]} = {}) {
    const S = 512;
    const {canvas: canvas, ctx: ctx} = makeCanvas(S, S);
    const rand = rng(seed);
    ctx.clearRect(0, 0, S, S);
    for (let i = 0; i < 3; i++) {
        const cx = S * (.35 + rand() * .3);
        const cy = S * (.35 + rand() * .3);
        const r = S * (.18 + rand() * .25);
        const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grd.addColorStop(0, rgba(color[0], color[1], color[2], .55));
        grd.addColorStop(.55, rgba(color[0], color[1], color[2], .22));
        grd.addColorStop(1, rgba(color[0], color[1], color[2], 0));
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, S, S);
    }
    ctx.save();
    ctx.filter = "blur(3px)";
    for (let i = 0; i < 5; i++) {
        ctx.strokeStyle = rgba(color[0], color[1], color[2], .12 + rand() * .12);
        ctx.lineWidth = 2 + rand() * 12;
        ctx.beginPath();
        const x = S * (.3 + rand() * .4);
        ctx.moveTo(x, S * .2);
        ctx.bezierCurveTo(x + (rand() - .5) * 60, S * .4, x + (rand() - .5) * 50, S * .6, x + (rand() - .5) * 30, S * .9);
        ctx.stroke();
    }
    ctx.restore();
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    return tex;
}

export function makeEnvironmentTexture() {
    const W = 1024;
    const H = 512;
    const {canvas: canvas, ctx: ctx} = makeCanvas(W, H);
    ctx.fillStyle = "#020303";
    ctx.fillRect(0, 0, W, H);
    const horizon = ctx.createLinearGradient(0, H * .34, 0, H * .72);
    horizon.addColorStop(0, "rgba(0,0,0,0)");
    horizon.addColorStop(.32, "rgba(22,33,32,0.42)");
    horizon.addColorStop(.55, "rgba(8,11,10,0.18)");
    horizon.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = horizon;
    ctx.fillRect(0, 0, W, H);
    const light = (x, y, w, h, color, a) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(w, h));
        g.addColorStop(0, color.replace("A", String(a)));
        g.addColorStop(.35, color.replace("A", String(a * .42)));
        g.addColorStop(1, color.replace("A", "0"));
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, h / w);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, w, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    };
    for (let i = 0; i < 6; i++) {
        light(W * (.2 + i * .12), H * .26, 26 + i * 5, 8 + i * 2, "rgba(255,232,189,A)", .85);
    }
    light(W * .22, H * .55, 80, 90, "rgba(28,133,148,A)", .28);
    light(W * .68, H * .52, 100, 70, "rgba(148,122,36,A)", .18);
    light(W * .5, H * .47, 260, 60, "rgba(28,38,35,A)", .4);
    const tex = new CanvasTexture(canvas);
    tex.mapping = EquirectangularReflectionMapping;
    tex.colorSpace = SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
}

export async function loadFonts() {
    const faces = [ new FontFace("TunnelTag", 'url("./fonts/TunnelTag.ttf")', {
        weight: "700"
    }), new FontFace("TunnelWide", 'url("./fonts/TunnelWide.ttf")', {
        weight: "700"
    }), new FontFace("Permanent Marker", 'url("./fonts/PermanentMarker.ttf")', {
        weight: "400"
    }), new FontFace("Sedgwick Ave Display", 'url("./fonts/SedgwickAveDisplay.ttf")', {
        weight: "400"
    }), new FontFace("Bangers", 'url("./fonts/Bangers.ttf")', {
        weight: "400"
    }), new FontFace("Bowlby One SC", 'url("./fonts/BowlbyOneSC.ttf")', {
        weight: "400"
    }), new FontFace("Anton", 'url("./fonts/Anton.ttf")', {
        weight: "400"
    }) ];
    for (const face of faces) {
        document.fonts.add(await face.load());
    }
    await Promise.all([ document.fonts.load('700 100px "TunnelTag"'), document.fonts.load('700 100px "TunnelWide"'), document.fonts.load('400 100px "Permanent Marker"'), document.fonts.load('400 100px "Sedgwick Ave Display"'), document.fonts.load('400 100px "Bangers"'), document.fonts.load('400 100px "Bowlby One SC"'), document.fonts.load('400 100px "Anton"') ]);
    await document.fonts.ready;
}
