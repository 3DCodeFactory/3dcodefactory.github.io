import * as THREE from "../vendor/three.module.js";

export const WORLD = {
    ground: {
        xMin: -6.3,
        xMax: 6.3,
        zMin: -.8,
        zMax: 8
    },
    sidewalkZ: 2.65,
    wallZ: -.62
};

const TAU = Math.PI * 2;

const SERIF = '"DejaVu Serif", "Liberation Serif", Georgia, serif';

const SANS = '"DejaVu Sans", "Liberation Sans", sans-serif';

const SANS_NARROW = '"Liberation Sans Narrow", "DejaVu Sans", sans-serif';

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

function makeCanvas(w, h) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    return {
        canvas: canvas,
        ctx: canvas.getContext("2d", {
            willReadFrequently: true
        })
    };
}

function rr(ctx, x, y, w, h, r) {
    const rad = Math.min(r, w * .5, h * .5);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
}

function grain(ctx, w, h, amount = 7, seed = 12, tint = null) {
    const rng = mulberry32(seed);
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
        const n = (rng() - .5) * amount;
        d[i] = Math.max(0, Math.min(255, d[i] + n + (tint ? tint[0] : 0)));
        d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n + (tint ? tint[1] : 0)));
        d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n + (tint ? tint[2] : 0)));
    }
    ctx.putImageData(img, 0, 0);
}

function blob(ctx, x, y, rx, ry, color, alpha = 1, blur = 0, rot = 0) {
    ctx.save();
    ctx.globalAlpha = alpha;
    if (blur) ctx.filter = `blur(${blur}px)`;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot, 0, TAU);
    ctx.fill();
    ctx.restore();
}

function line(ctx, x1, y1, x2, y2, color, width = 1, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
}

function fitText(ctx, text, maxWidth, startSize, family, weight = "400", style = "") {
    let size = startSize;
    do {
        ctx.font = `${style} ${weight} ${size}px ${family}`;
        if (ctx.measureText(text).width <= maxWidth || size <= 8) break;
        size -= 1;
    } while (size > 8);
    return size;
}

function drawCentered(ctx, text, x, y, maxW, size, family, color, weight = "400", style = "") {
    const s = fitText(ctx, text, maxW, size, family, weight, style);
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${style} ${weight} ${s}px ${family}`;
    ctx.fillText(text, x, y);
    return s;
}

function makeTexture(canvas, renderer, opts = {}) {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = opts.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    t.wrapS = opts.wrapS || THREE.ClampToEdgeWrapping;
    t.wrapT = opts.wrapT || THREE.ClampToEdgeWrapping;
    if (opts.repeat) t.repeat.set(opts.repeat[0], opts.repeat[1]);
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    if (opts.nearest) {
        t.magFilter = THREE.NearestFilter;
        t.minFilter = THREE.LinearFilter;
    }
    t.needsUpdate = true;
    return t;
}

function weatherText(ctx, w, h, rng, strength = .004, color = null) {
    ctx.save();
    if (color) {
        ctx.fillStyle = color;
    } else {
        ctx.globalCompositeOperation = "destination-out";
    }
    const n = Math.floor(w * h * strength);
    for (let i = 0; i < n; i++) {
        const x = rng() * w;
        const y = rng() * h;
        ctx.globalAlpha = .08 + rng() * .5;
        ctx.fillRect(x, y, .5 + rng() * 2.8, .5 + rng() * 2.4);
    }
    ctx.restore();
}

function wetStreaks(ctx, w, h, rng, count = 16, alpha = .12) {
    for (let i = 0; i < count; i++) {
        const x = rng() * w;
        const len = h * (.1 + rng() * .55);
        const g = ctx.createLinearGradient(x, 0, x + 8, len);
        g.addColorStop(0, "rgba(180,200,196,0)");
        g.addColorStop(.25, `rgba(170,190,186,${alpha})`);
        g.addColorStop(1, "rgba(5,10,11,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x, rng() * h * .4, 1 + rng() * 9, len);
    }
}

function createTileTextures(renderer) {
    const W = 1024, H = 1024;
    const mapC = makeCanvas(W, H);
    const rufC = makeCanvas(W, H);
    const bmpC = makeCanvas(W, H);
    const c = mapC.ctx, r = rufC.ctx, b = bmpC.ctx;
    const rng = mulberry32(88103);
    c.fillStyle = "#0a1215";
    c.fillRect(0, 0, W, H);
    r.fillStyle = "#e1e1e1";
    r.fillRect(0, 0, W, H);
    b.fillStyle = "#303030";
    b.fillRect(0, 0, W, H);
    const cols = 8, rows = 10;
    const cw = W / cols, ch = H / rows;
    const gap = 3.4;
    const colors = [ "#1c4558", "#1a4254", "#1e485a", "#194053", "#204b5d", "#1b4659" ];
    for (let row = 0; row < rows; row++) {
        const offset = row % 2 * cw * .5;
        for (let col = -1; col < cols + 1; col++) {
            const x = col * cw + offset + gap * .5;
            const y = row * ch + gap * .5;
            const w = cw - gap;
            const h = ch - gap;
            let color = colors[Math.floor(rng() * colors.length)];
            const grd = c.createLinearGradient(x, y, x, y + h);
            grd.addColorStop(0, color);
            grd.addColorStop(.16, color);
            grd.addColorStop(.7, "#173e50");
            grd.addColorStop(1, "#153a4b");
            c.fillStyle = grd;
            c.fillRect(x, y, w, h);
            const glaze = c.createLinearGradient(x, y, x + w, y + h);
            glaze.addColorStop(0, "rgba(143,182,192,.055)");
            glaze.addColorStop(.55, "rgba(112,153,166,.012)");
            glaze.addColorStop(1, "rgba(3,12,16,.06)");
            c.fillStyle = glaze;
            c.fillRect(x, y, w, h);
            line(c, x + 1, y + 1, x + w - 1, y + 1, "rgba(192,224,230,.28)", 1.1);
            line(c, x + 1, y + 1, x + 1, y + h - 1, "rgba(164,202,211,.10)", 1);
            line(c, x + 1, y + h - 1, x + w - 1, y + h - 1, "rgba(0,6,9,.48)", 1.8);
            line(c, x + w - 1, y + 2, x + w - 1, y + h - 1, "rgba(0,6,9,.24)", 1.2);
            if (rng() > .52) {
                c.fillStyle = `rgba(183,209,212,${.012 + rng() * .018})`;
                c.beginPath();
                c.ellipse(x + w * (.25 + rng() * .5), y + h * (.2 + rng() * .6), 5 + rng() * 20, 2 + rng() * 6, rng() * 2, 0, TAU);
                c.fill();
            }
            if (rng() > .9) {
                const px = x + 5 + rng() * (w - 10);
                const py = y + 5 + rng() * (h - 10);
                const rad = 2 + rng() * 5;
                const pg = c.createRadialGradient(px, py, 0, px, py, rad);
                pg.addColorStop(0, "rgba(137,156,155,.55)");
                pg.addColorStop(1, "rgba(137,156,155,0)");
                c.fillStyle = pg;
                c.beginPath();
                c.arc(px, py, rad, 0, TAU);
                c.fill();
            }
            if (rng() > .82) {
                const cx = x + (rng() > .5 ? w - 5 : 5);
                const cy = y + (rng() > .5 ? h - 5 : 5);
                c.fillStyle = "#25302f";
                c.beginPath();
                c.ellipse(cx, cy, 5 + rng() * 8, 3 + rng() * 5, rng(), 0, TAU);
                c.fill();
                c.fillStyle = "rgba(160,180,176,.35)";
                c.fillRect(cx - 2, cy - 1, 3, 1);
            }
            const rv = 34 + Math.floor(rng() * 35);
            r.fillStyle = `rgb(${rv},${rv},${rv})`;
            rr(r, x, y, w, h, 3);
            r.fill();
            r.save();
            rr(r, x, y, w, h, 3);
            r.clip();
            for (let k = 0; k < 4; k++) {
                const sx = x + rng() * w;
                const sy = y + rng() * h;
                r.fillStyle = `rgba(28,28,28,${.25 + rng() * .35})`;
                r.fillRect(sx, sy, 1 + rng() * 4, h * (.15 + rng() * .6));
            }
            r.restore();
            const hgt = 188 + rng() * 16;
            b.fillStyle = `rgb(${hgt},${hgt},${hgt})`;
            rr(b, x, y, w, h, 2);
            b.fill();
            b.strokeStyle = "#242424";
            b.lineWidth = 2.2;
            b.stroke();
        }
    }
    for (let i = 0; i < 35; i++) {
        blob(c, rng() * W, rng() * H, 14 + rng() * 70, 10 + rng() * 38, rng() > .4 ? "rgba(5,15,18,.12)" : "rgba(65,98,105,.09)", 1, 10, rng() * 2);
    }
    for (let i = 0; i < 18; i++) {
        const x = rng() * W;
        const y = rng() * H * .75;
        const len = 40 + rng() * 260;
        line(c, x, y, x + (rng() - .5) * 8, y + len, "rgba(2,8,10,.18)", 1 + rng() * 4);
    }
    for (let i = 0; i < 14; i++) {
        const x = rng() * W, y = H * (.72 + rng() * .28);
        blob(c, x, y, 2 + rng() * 10, 4 + rng() * 24, "rgba(81,45,28,.20)", 1, 5);
    }
    c.save();
    c.globalCompositeOperation = "screen";
    for (let i = 0; i < 6; i++) {
        const x = 20 + rng() * (W - 80);
        const grad = c.createLinearGradient(x - 70, 0, x + 110, H);
        grad.addColorStop(0, "rgba(144,190,203,0)");
        grad.addColorStop(.3, "rgba(144,190,203,.075)");
        grad.addColorStop(.55, "rgba(205,229,231,.17)");
        grad.addColorStop(.8, "rgba(144,190,203,.035)");
        grad.addColorStop(1, "rgba(144,190,203,0)");
        c.fillStyle = grad;
        c.beginPath();
        c.moveTo(x - 80, 0);
        c.bezierCurveTo(x + 30, H * .22, x - 50, H * .68, x + 30, H);
        c.lineTo(x + 160, H);
        c.bezierCurveTo(x + 40, H * .65, x + 120, H * .25, x + 15, 0);
        c.closePath();
        c.fill();
    }
    c.restore();
    c.save();
    c.globalCompositeOperation = "screen";
    for (let i = 0; i < 3; i++) {
        const x = 90 + rng() * (W - 180);
        const y = 40 + rng() * (H * .35);
        const g2 = c.createRadialGradient(x, y, 0, x, y + 210, 180);
        g2.addColorStop(0, "rgba(196,219,219,.18)");
        g2.addColorStop(.4, "rgba(128,164,173,.07)");
        g2.addColorStop(1, "rgba(128,164,173,0)");
        c.fillStyle = g2;
        c.beginPath();
        c.ellipse(x, y + 210, 34, 220, 0, 0, TAU);
        c.fill();
    }
    c.restore();
    const damp = c.createLinearGradient(0, H * .72, 0, H);
    damp.addColorStop(0, "rgba(3,10,12,0)");
    damp.addColorStop(.8, "rgba(3,10,12,.16)");
    damp.addColorStop(1, "rgba(3,10,12,.30)");
    c.fillStyle = damp;
    c.fillRect(0, 0, W, H);
    wetStreaks(c, W, H, rng, 24, .055);
    grain(c, W, H, 6, 44);
    grain(r, W, H, 12, 77);
    return {
        map: makeTexture(mapC.canvas, renderer, {
            wrapS: THREE.RepeatWrapping,
            wrapT: THREE.RepeatWrapping,
            repeat: [ 2, 1.6 ]
        }),
        roughnessMap: makeTexture(rufC.canvas, renderer, {
            srgb: false,
            wrapS: THREE.RepeatWrapping,
            wrapT: THREE.RepeatWrapping,
            repeat: [ 2, 1.6 ]
        }),
        bumpMap: makeTexture(bmpC.canvas, renderer, {
            srgb: false,
            wrapS: THREE.RepeatWrapping,
            wrapT: THREE.RepeatWrapping,
            repeat: [ 2, 1.6 ]
        })
    };
}

function createGroundTextures(renderer) {
    const SW = 2048, SH = 620;
    const sc = makeCanvas(SW, SH);
    const sr = makeCanvas(SW, SH);
    const sb = makeCanvas(SW, SH);
    const c = sc.ctx, r = sr.ctx, b = sb.ctx;
    const rng = mulberry32(33019);
    c.fillStyle = "#101716";
    c.fillRect(0, 0, SW, SH);
    r.fillStyle = "#8c8c8c";
    r.fillRect(0, 0, SW, SH);
    b.fillStyle = "#3d3d3d";
    b.fillRect(0, 0, SW, SH);
    const rows = 6;
    const rowH = SH / rows;
    const palette = [ "#394541", "#424c47", "#343f3d", "#4a514a", "#3e4742", "#303b39", "#4b5048" ];
    for (let row = 0; row < rows; row++) {
        let x = -rng() * 180;
        const y = row * rowH;
        while (x < SW) {
            const w = 150 + rng() * 260;
            const gap = 4;
            const col = palette[Math.floor(rng() * palette.length)];
            const g = c.createLinearGradient(x, y, x + w, y + rowH);
            g.addColorStop(0, col);
            g.addColorStop(.55, "#333d3b");
            g.addColorStop(1, "#293331");
            c.fillStyle = g;
            c.fillRect(x + gap * .5, y + gap * .5, w - gap, rowH - gap);
            c.save();
            c.globalAlpha = .07 + rng() * .12;
            c.fillStyle = rng() > .45 ? "#adc0b8" : "#0c1516";
            c.beginPath();
            c.ellipse(x + w * (.25 + rng() * .5), y + rowH * (.2 + rng() * .6), w * .25, rowH * .3, rng(), 0, TAU);
            c.fill();
            c.restore();
            line(c, x + 8, y + 4, x + w - 8, y + 4, "rgba(190,204,195,.12)", 1.2);
            line(c, x + 6, y + rowH - 5, x + w - 6, y + rowH - 5, "rgba(0,0,0,.36)", 1.4);
            if (rng() > .5) {
                let cx = x + w * rng();
                let cy = y + rowH * rng();
                c.strokeStyle = "rgba(10,16,16,.5)";
                c.lineWidth = 1 + rng();
                c.beginPath();
                c.moveTo(cx, cy);
                const seg = 2 + Math.floor(rng() * 4);
                for (let s = 0; s < seg; s++) {
                    cx += (rng() - .5) * 55;
                    cy += (rng() - .5) * 22;
                    c.lineTo(cx, cy);
                }
                c.stroke();
            }
            if (rng() > .72) {
                c.fillStyle = "rgba(101,113,94,.25)";
                c.beginPath();
                c.ellipse(x + 12 + rng() * 22, y + 9 + rng() * 18, 4 + rng() * 13, 2 + rng() * 6, rng(), 0, TAU);
                c.fill();
            }
            const rv = 95 + Math.floor(rng() * 70);
            r.fillStyle = `rgb(${rv},${rv},${rv})`;
            r.fillRect(x + gap, y + gap, w - gap * 2, rowH - gap * 2);
            b.fillStyle = `rgb(${190 + Math.floor(rng() * 25)},${190 + Math.floor(rng() * 25)},${190 + Math.floor(rng() * 25)})`;
            b.fillRect(x + gap, y + gap, w - gap * 2, rowH - gap * 2);
            b.strokeStyle = "#222";
            b.lineWidth = 3;
            b.strokeRect(x + gap, y + gap, w - gap * 2, rowH - gap * 2);
            x += w;
        }
    }
    for (let i = 0; i < 28; i++) {
        blob(c, rng() * SW, rng() * SH, 25 + rng() * 110, 10 + rng() * 46, "rgba(5,11,13,.25)", 1, 14, rng() * 2);
        blob(r, rng() * SW, rng() * SH, 30 + rng() * 100, 12 + rng() * 38, "rgba(25,25,25,.5)", 1, 14, rng() * 2);
    }
    wetStreaks(c, SW, SH, rng, 25, .1);
    grain(c, SW, SH, 9, 23);
    grain(r, SW, SH, 13, 51);
    const sidewalk = {
        map: makeTexture(sc.canvas, renderer, {
            wrapS: THREE.RepeatWrapping,
            wrapT: THREE.RepeatWrapping
        }),
        roughnessMap: makeTexture(sr.canvas, renderer, {
            srgb: false,
            wrapS: THREE.RepeatWrapping,
            wrapT: THREE.RepeatWrapping
        }),
        bumpMap: makeTexture(sb.canvas, renderer, {
            srgb: false,
            wrapS: THREE.RepeatWrapping,
            wrapT: THREE.RepeatWrapping
        })
    };
    const AW = 2048, AH = 900;
    const ac = makeCanvas(AW, AH);
    const ar = makeCanvas(AW, AH);
    const ab = makeCanvas(AW, AH);
    const ca = ac.ctx, ra = ar.ctx, ba = ab.ctx;
    const r2 = mulberry32(99173);
    ca.fillStyle = "#111718";
    ca.fillRect(0, 0, AW, AH);
    ra.fillStyle = "#5d5d5d";
    ra.fillRect(0, 0, AW, AH);
    ba.fillStyle = "#505050";
    ba.fillRect(0, 0, AW, AH);
    for (let i = 0; i < 18e3; i++) {
        const x = r2() * AW, y = r2() * AH;
        const v = 34 + Math.floor(r2() * 50);
        ca.fillStyle = `rgba(${v},${v + 4},${v + 3},${.22 + r2() * .4})`;
        ca.fillRect(x, y, .6 + r2() * 2.2, .6 + r2() * 1.8);
    }
    for (let i = 0; i < 22; i++) {
        const x = r2() * AW, y = r2() * AH;
        blob(ca, x, y, 40 + r2() * 180, 20 + r2() * 80, r2() > .5 ? "rgba(4,9,10,.35)" : "rgba(63,74,72,.09)", 1, 14, r2() * 2);
    }
    for (let i = 0; i < 16; i++) {
        let x = r2() * AW, y = r2() * AH;
        ca.strokeStyle = "rgba(3,6,7,.65)";
        ca.lineWidth = 1 + r2() * 3.2;
        ca.beginPath();
        ca.moveTo(x, y);
        const seg = 4 + Math.floor(r2() * 6);
        for (let s = 0; s < seg; s++) {
            x += (r2() - .4) * 80;
            y += (r2() - .5) * 50;
            ca.lineTo(x, y);
        }
        ca.stroke();
        ca.strokeStyle = "rgba(119,128,118,.06)";
        ca.lineWidth = 1;
        ca.stroke();
    }
    for (let i = 0; i < 16; i++) {
        const v = 60 + Math.floor(r2() * 30);
        ca.fillStyle = `rgba(${v},${v + 3},${v},.14)`;
        rr(ca, r2() * AW, r2() * AH, 18 + r2() * 90, 7 + r2() * 28, 8);
        ca.fill();
    }
    for (let i = 0; i < 18; i++) {
        const x = r2() * AW;
        const g = ca.createLinearGradient(x, 0, x + (r2() - .5) * 40, AH);
        g.addColorStop(0, "rgba(4,8,9,.0)");
        g.addColorStop(.4, "rgba(4,8,9,.35)");
        g.addColorStop(1, "rgba(90,110,112,.04)");
        ca.fillStyle = g;
        ca.fillRect(x, 0, 5 + r2() * 52, AH);
    }
    wetStreaks(ca, AW, AH, r2, 30, .055);
    for (let i = 0; i < 20; i++) {
        blob(ra, r2() * AW, r2() * AH, 25 + r2() * 120, 10 + r2() * 50, "rgba(20,20,20,.4)", 1, 13, r2() * 2);
        blob(ba, r2() * AW, r2() * AH, 18 + r2() * 80, 8 + r2() * 30, "rgba(90,90,90,.25)", 1, 12, r2() * 2);
    }
    grain(ca, AW, AH, 10, 91);
    grain(ra, AW, AH, 16, 17);
    grain(ba, AW, AH, 15, 19);
    const asphalt = {
        map: makeTexture(ac.canvas, renderer, {
            wrapS: THREE.RepeatWrapping,
            wrapT: THREE.RepeatWrapping
        }),
        roughnessMap: makeTexture(ar.canvas, renderer, {
            srgb: false,
            wrapS: THREE.RepeatWrapping,
            wrapT: THREE.RepeatWrapping
        }),
        bumpMap: makeTexture(ab.canvas, renderer, {
            srgb: false,
            wrapS: THREE.RepeatWrapping,
            wrapT: THREE.RepeatWrapping
        })
    };
    return {
        sidewalk: sidewalk,
        asphalt: asphalt
    };
}

function createPuddleMask(renderer) {
    const W = 1024, H = 716;
    const {canvas: canvas, ctx: ctx} = makeCanvas(W, H);
    const {xMin: xMin, xMax: xMax, zMin: zMin, zMax: zMax} = WORLD.ground;
    const xr = xMax - xMin, zr = zMax - zMin;
    const rng = mulberry32(70707);
    const px = x => (x - xMin) / xr * W;
    const py = z => (z - zMin) / zr * H;
    const sx = W / xr, sy = H / zr;
    ctx.fillStyle = "#080b0c";
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 22; i++) {
        blob(ctx, rng() * W, rng() * H, 50 + rng() * 160, 20 + rng() * 70, "rgba(35,39,39,.55)", 1, 20, rng() * 2);
    }
    for (let i = 0; i < 20; i++) {
        const x = rng() * W;
        ctx.strokeStyle = "rgba(50,55,54,.35)";
        ctx.lineWidth = 2 + rng() * 12;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.bezierCurveTo(x + 10, H * .3, x - 18, H * .6, x + 8, H);
        ctx.stroke();
    }
    ctx.save();
    ctx.filter = "blur(9px)";
    ctx.fillStyle = "rgba(245,245,245,.96)";
    const puddles = [ {
        x: .25,
        z: 2.52,
        rx: 2.78,
        rz: 1.02,
        rot: -.03,
        seed: 3
    }, {
        x: -.98,
        z: 4.12,
        rx: 1.98,
        rz: .66,
        rot: .015,
        seed: 34
    }, {
        x: -2.95,
        z: 2.34,
        rx: 1.48,
        rz: .53,
        rot: -.05,
        seed: 8
    }, {
        x: 1.38,
        z: 1.12,
        rx: 1.15,
        rz: .31,
        rot: .03,
        seed: 14
    }, {
        x: 4.25,
        z: 1.55,
        rx: .85,
        rz: .34,
        rot: -.04,
        seed: 21
    }, {
        x: -.55,
        z: 1.36,
        rx: .65,
        rz: .22,
        rot: .02,
        seed: 28
    } ];
    for (const p of puddles) {
        const rrng = mulberry32(500 + p.seed);
        const cxp = px(p.x), cyp = py(p.z);
        ctx.save();
        ctx.translate(cxp, cyp);
        ctx.rotate(p.rot);
        ctx.beginPath();
        const steps = 80;
        for (let i = 0; i <= steps; i++) {
            const a = i / steps * TAU;
            const wobble = 1 + .14 * Math.sin(a * 3 + p.seed) + .075 * Math.sin(a * 7 + p.seed * 2.1) + .055 * Math.sin(a * 11 - p.seed);
            const rx = p.rx * sx * wobble;
            const ry = p.rz * sy * wobble;
            const xx = Math.cos(a) * rx;
            const yy = Math.sin(a) * ry;
            if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
        }
        ctx.closePath();
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        ctx.restore();
    }
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(205,205,205,.5)";
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(px(-4.05), py(2.44));
    ctx.bezierCurveTo(px(-2.3), py(2.7), px(-1.3), py(2.8), px(-.4), py(2.6));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px(.9), py(2.9));
    ctx.bezierCurveTo(px(2.1), py(2.8), px(2.6), py(2.05), px(2.55), py(1.12));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px(-.7), py(3.3));
    ctx.bezierCurveTo(px(-.5), py(3.6), px(.2), py(3.5), px(.5), py(3));
    ctx.stroke();
    ctx.restore();
    for (let i = 0; i < 170; i++) {
        const a = rng() * TAU;
        const cxw = .25 + Math.cos(a) * (2.5 + rng() * 1.1);
        const czw = 2.52 + Math.sin(a) * (.9 + rng() * .65);
        blob(ctx, px(cxw), py(czw), 1 + rng() * 6, 1 + rng() * 4, "rgba(255,255,255,.12)", 1, 1.5);
    }
    for (let i = 0; i < 110; i++) {
        const a = rng() * TAU;
        const cxw = -.98 + Math.cos(a) * (1.85 + rng() * .7);
        const czw = 4.12 + Math.sin(a) * (.6 + rng() * .35);
        blob(ctx, px(cxw), py(czw), 1 + rng() * 7, 1 + rng() * 4, "rgba(255,255,255,.14)", 1, 1.5);
    }
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.filter = "blur(1.6px)";
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();
    grain(ctx, W, H, 12, 68);
    const texture = makeTexture(canvas, renderer, {
        srgb: false,
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping
    });
    texture.flipY = true;
    texture.needsUpdate = true;
    const sampleData = ctx.getImageData(0, 0, W, H).data;
    const sample = (x, z) => {
        const u = (x - xMin) / xr;
        const v = (z - zMin) / zr;
        if (u < 0 || u > 1 || v < 0 || v > 1) return 0;
        const xx = Math.max(0, Math.min(W - 1, Math.floor(u * W)));
        const yy = Math.max(0, Math.min(H - 1, Math.floor(v * H)));
        return sampleData[(yy * W + xx) * 4] / 255;
    };
    return {
        texture: texture,
        sample: sample,
        width: W,
        height: H,
        canvas: canvas
    };
}

function createPaintedTimber(renderer) {
    const W = 1024, H = 1024;
    const {canvas: canvas, ctx: ctx} = makeCanvas(W, H);
    const rng = mulberry32(4409);
    ctx.fillStyle = "#14231f";
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 150; i++) {
        const x = rng() * W;
        const g = ctx.createLinearGradient(x, 0, x + 16 + rng() * 46, H);
        g.addColorStop(0, "rgba(55,78,67,0)");
        g.addColorStop(.5, `rgba(61,85,72,${.03 + rng() * .1})`);
        g.addColorStop(1, "rgba(5,10,9,0.05)");
        ctx.fillStyle = g;
        ctx.fillRect(x, 0, 3 + rng() * 20, H);
    }
    for (let i = 0; i < 34; i++) {
        blob(ctx, rng() * W, rng() * H, 5 + rng() * 55, 3 + rng() * 28, rng() > .55 ? "rgba(74,82,68,.13)" : "rgba(3,10,8,.22)", 1, 5, rng() * 2);
    }
    for (let i = 0; i < 22; i++) {
        const x = rng() * W, y = rng() * H;
        line(ctx, x, y, x + (rng() - .5) * 60, y + (rng() - .5) * 200, "rgba(142,145,123,.1)", 1);
    }
    wetStreaks(ctx, W, H, rng, 12, .05);
    grain(ctx, W, H, 11, 31);
    return makeTexture(canvas, renderer, {
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping,
        repeat: [ 1.5, 1.5 ]
    });
}

function createAwningTextures(renderer) {
    const W = 1024, H = 1024;
    const cloth = makeCanvas(W, H);
    const c = cloth.ctx;
    const rng = mulberry32(2244);
    c.fillStyle = "#172720";
    c.fillRect(0, 0, W, H);
    for (let i = 0; i < 320; i++) {
        c.fillStyle = i % 2 ? "rgba(70,93,78,.055)" : "rgba(3,10,8,.05)";
        c.fillRect(i * 3.2, 0, 1.4, H);
        c.fillRect(0, i * 3.2, W, 1.1);
    }
    for (let i = 0; i < 80; i++) {
        blob(c, rng() * W, rng() * H, 6 + rng() * 60, 3 + rng() * 25, rng() > .45 ? "rgba(12,25,19,.12)" : "rgba(79,98,78,.06)", 1, 8, rng() * 2);
    }
    for (const sx of [ W * .25, W * .5, W * .75 ]) {
        line(c, sx, 0, sx + 2, H, "rgba(5,13,10,.30)", 2.2);
        line(c, sx + 2, 0, sx + 3, H, "rgba(116,125,101,.10)", 1);
        for (let y = 8; y < H; y += 11) {
            c.fillStyle = "rgba(190,185,155,.07)";
            c.fillRect(sx - 2, y, 6, 1);
        }
    }
    c.save();
    c.globalCompositeOperation = "screen";
    const sheen = c.createLinearGradient(0, 0, W * .7, H);
    sheen.addColorStop(0, "rgba(151,173,155,.06)");
    sheen.addColorStop(.5, "rgba(119,145,128,.025)");
    sheen.addColorStop(1, "rgba(151,173,155,0)");
    c.fillStyle = sheen;
    c.fillRect(0, 0, W, H);
    c.restore();
    const g = c.createLinearGradient(0, H * .72, 0, H);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(2,6,5,.44)");
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    grain(c, W, H, 10, 45);
    const SW = 2048, SH = 220;
    const sign = makeCanvas(SW, SH);
    const s = sign.ctx;
    const r2 = mulberry32(644);
    s.fillStyle = "#16251f";
    s.fillRect(0, 0, SW, SH);
    for (let i = 0; i < 50; i++) {
        blob(s, r2() * SW, r2() * SH, 8 + r2() * 60, 4 + r2() * 24, "rgba(5,12,9,.12)", 1, 7, r2() * 2);
    }
    s.strokeStyle = "rgba(198,195,171,.35)";
    s.lineWidth = 2;
    s.beginPath();
    s.moveTo(30, 25);
    s.lineTo(SW - 30, 25);
    s.stroke();
    s.beginPath();
    s.moveTo(30, SH - 26);
    s.lineTo(SW - 30, SH - 26);
    s.stroke();
    s.strokeStyle = "rgba(190,188,165,.16)";
    s.lineWidth = 1;
    s.beginPath();
    s.moveTo(30, 33);
    s.lineTo(SW - 30, 33);
    s.stroke();
    s.beginPath();
    s.moveTo(30, SH - 34);
    s.lineTo(SW - 30, SH - 34);
    s.stroke();
    const label = "NEWS  ✦  CIGARETTES  ✦  MAGAZINES  ✦  COLD DRINKS";
    fitText(s, label, 1760, 122, SERIF, "600");
    s.textAlign = "center";
    s.textBaseline = "middle";
    s.fillStyle = "#ddd7c2";
    s.shadowColor = "rgba(0,0,0,.38)";
    s.shadowBlur = 4;
    s.shadowOffsetY = 2;
    s.fillText(label, SW / 2, SH / 2 + 3);
    s.shadowColor = "transparent";
    for (const sx of [ SW * .24, SW * .53, SW * .79 ]) {
        line(s, sx, 8, sx + 1, SH - 8, "rgba(4,10,8,.24)", 2);
        line(s, sx + 2, 8, sx + 2, SH - 8, "rgba(210,205,181,.075)", 1);
        for (let y = 14; y < SH - 14; y += 9) {
            s.fillStyle = "rgba(215,208,182,.1)";
            s.fillRect(sx - 2, y, 5, 1);
        }
    }
    weatherText(s, SW, SH, r2, .0034);
    for (let i = 0; i < 26; i++) {
        blob(s, r2() * SW, r2() * SH, 5 + r2() * 30, 2 + r2() * 12, "rgba(8,16,12,.13)", 1, 4, r2() * 2);
    }
    grain(s, SW, SH, 5, 22);
    return {
        cloth: makeTexture(cloth.canvas, renderer, {
            wrapS: THREE.RepeatWrapping,
            wrapT: THREE.RepeatWrapping
        }),
        strip: makeTexture(sign.canvas, renderer)
    };
}

function createAwningReflection(renderer) {
    const W = 2048, H = 256;
    const base = makeCanvas(W, H);
    const tmp = makeCanvas(W, H);
    const label = "NEWS  ✦  CIGARETTES  ✦  MAGAZINES  ✦  COLD DRINKS";
    const t = tmp.ctx;
    t.clearRect(0, 0, W, H);
    t.textAlign = "center";
    t.textBaseline = "middle";
    const size = fitText(t, label, 1760, 132, SERIF, "600");
    t.font = `600 ${size}px ${SERIF}`;
    t.fillStyle = "rgba(236,230,210,.76)";
    t.shadowColor = "rgba(255,238,201,.55)";
    t.shadowBlur = 9;
    t.fillText(label, W / 2, H / 2);
    t.shadowBlur = 0;
    t.fillStyle = "rgba(235,209,165,.18)";
    t.fillText(label, W / 2 + 9, H / 2 + 3);
    const c = base.ctx;
    c.clearRect(0, 0, W, H);
    for (let x = 0; x < W; x += 8) {
        const dy = Math.sin(x * .013 + 1.2) * 5 + Math.sin(x * .037 + .4) * 2.2;
        c.globalAlpha = .78 + .22 * Math.sin(x * .047 + 1.9);
        c.drawImage(tmp.canvas, x, 0, 8, H, x, dy, 8, H);
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = "destination-in";
    const gx = c.createLinearGradient(0, 0, W, 0);
    gx.addColorStop(0, "rgba(255,255,255,0)");
    gx.addColorStop(.075, "rgba(255,255,255,.92)");
    gx.addColorStop(.9, "rgba(255,255,255,.8)");
    gx.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = gx;
    c.fillRect(0, 0, W, H);
    const gy = c.createLinearGradient(0, 0, 0, H);
    gy.addColorStop(0, "rgba(255,255,255,0)");
    gy.addColorStop(.2, "rgba(255,255,255,.9)");
    gy.addColorStop(.7, "rgba(255,255,255,.75)");
    gy.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = gy;
    c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = "destination-out";
    const rrng = mulberry32(1751);
    for (let i = 0; i < 46; i++) {
        blob(c, rrng() * W, H * (.18 + rrng() * .64), 5 + rrng() * 34, 1 + rrng() * 4, `rgba(0,0,0,${.1 + rrng() * .3})`, 1, 5);
    }
    c.globalCompositeOperation = "source-over";
    return makeTexture(base.canvas, renderer, {
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping
    });
}

function createKioskSigns(renderer) {
    const rng = mulberry32(6182);
    const AW = 1024, AH = 512;
    const ad = makeCanvas(AW, AH);
    const a = ad.ctx;
    a.fillStyle = "#d7ceb5";
    a.fillRect(0, 0, AW, AH);
    for (let i = 0; i < 18; i++) {
        blob(a, rng() * AW, rng() * AH, 20 + rng() * 130, 10 + rng() * 55, rng() > .5 ? "rgba(115,96,59,.07)" : "rgba(255,251,230,.12)", 1, 14, rng() * 2);
    }
    a.strokeStyle = "#2c332e";
    a.lineWidth = 8;
    a.strokeRect(25, 25, AW - 50, AH - 50);
    a.lineWidth = 2;
    a.strokeRect(42, 42, AW - 84, AH - 84);
    a.fillStyle = "#242a26";
    a.textAlign = "center";
    a.textBaseline = "middle";
    fitText(a, "The Daily Chronicle", AW - 160, 102, SERIF, "700", "italic");
    a.font = `700 italic ${fitText(a, "The Daily Chronicle", AW - 160, 102, SERIF, "700", "italic")}px ${SERIF}`;
    a.fillText("The Daily Chronicle", AW / 2, AH * .35);
    a.fillStyle = "#9f2e28";
    a.font = `italic 22px ${SANS_NARROW}`;
    a.fillText("E V E N I N G   E D I T I O N   ·   F I V E   C E N T S", AW / 2, AH * .47);
    a.strokeStyle = "#6a6654";
    a.lineWidth = 1.5;
    a.beginPath();
    a.moveTo(130, AH * .55);
    a.lineTo(AW - 130, AH * .55);
    a.stroke();
    a.fillStyle = "#34382f";
    a.font = `italic 30px ${SERIF}`;
    a.fillText("Your City. Your Paper.", AW / 2, AH * .65);
    a.font = `16px ${SANS}`;
    a.fillStyle = "#605b4b";
    a.fillText("LATE NEWS FROM THE HARBOUR · WEATHER: RAIN CLEARING", AW / 2, AH * .78);
    a.fillText("NINTH YEAR                              TEN CENTS", AW / 2, AH * .86);
    for (let i = 0; i < 90; i++) {
        blob(a, rng() * AW, rng() * AH, .5 + rng() * 2.2, .5 + rng() * 1.6, "rgba(71,53,29,.24)", 1);
    }
    weatherText(a, AW, AH, rng, .0014);
    grain(a, AW, AH, 7, 33);
    const CW = 512, CH = 700;
    const chalk = makeCanvas(CW, CH);
    const k = chalk.ctx;
    const r3 = mulberry32(7521);
    k.fillStyle = "#13231f";
    k.fillRect(0, 0, CW, CH);
    const cg = k.createRadialGradient(CW * .5, CH * .4, 0, CW * .5, CH * .4, CW * .8);
    cg.addColorStop(0, "rgba(100,130,115,.12)");
    cg.addColorStop(1, "rgba(0,0,0,.3)");
    k.fillStyle = cg;
    k.fillRect(0, 0, CW, CH);
    for (let i = 0; i < 70; i++) {
        blob(k, r3() * CW, r3() * CH, 4 + r3() * 30, 2 + r3() * 8, "rgba(220,230,210,.035)", 1, 3, r3() * 2);
    }
    k.strokeStyle = "rgba(222,225,203,.58)";
    k.lineWidth = 2;
    k.strokeRect(20, 20, CW - 40, CH - 40);
    k.textAlign = "center";
    k.textBaseline = "middle";
    k.fillStyle = "rgba(231,227,202,.88)";
    k.font = `26px ${SANS_NARROW}`;
    k.fillText("FRESH", CW / 2, 95);
    k.font = `italic 700 45px ${SERIF}`;
    k.fillText("Sandwiches", CW / 2, 142);
    k.strokeStyle = "rgba(231,227,202,.42)";
    k.lineWidth = 1.5;
    k.beginPath();
    k.moveTo(60, 180);
    k.quadraticCurveTo(CW / 2, 195, CW - 60, 178);
    k.stroke();
    k.font = `italic 700 72px ${SERIF}`;
    k.fillText("Hot", CW / 2, 255);
    k.fillText("Coffee", CW / 2, 327);
    k.font = `23px ${SERIF}`;
    k.fillText("~ fresh every hour ~", CW / 2, 394);
    k.font = `italic 700 44px ${SERIF}`;
    k.fillStyle = "rgba(225,211,170,.8)";
    k.fillText("Always Fresh.", CW / 2, 510);
    k.font = `20px ${SANS}`;
    k.fillStyle = "rgba(224,225,206,.6)";
    k.fillText("THE DAILY CHRONICLE", CW / 2, 580);
    k.fillText("EST. 1938  ·  CORNER STAND No. 4", CW / 2, 612);
    weatherText(k, CW, CH, r3, .002, null);
    const IW = 384, IH = 768;
    const ice = makeCanvas(IW, IH);
    const ic = ice.ctx;
    const r4 = mulberry32(3572);
    const ig = ic.createLinearGradient(0, 0, 0, IH);
    ig.addColorStop(0, "#16251f");
    ig.addColorStop(1, "#0d1815");
    ic.fillStyle = ig;
    ic.fillRect(0, 0, IW, IH);
    ic.strokeStyle = "rgba(221,219,195,.35)";
    ic.lineWidth = 3;
    ic.strokeRect(16, 16, IW - 32, IH - 32);
    ic.textAlign = "center";
    ic.textBaseline = "middle";
    ic.fillStyle = "#e5e1cd";
    ic.font = `32px ${SANS_NARROW}`;
    ic.fillText("I C E", IW / 2, 120);
    ic.font = `italic 700 74px ${SERIF}`;
    ic.fillText("COLD", IW / 2, 200);
    ic.fillText("DRINKS", IW / 2, 280);
    ic.save();
    ic.translate(IW / 2, 455);
    ic.fillStyle = "rgba(150,183,187,.75)";
    rr(ic, -58, -105, 116, 200, 32);
    ic.fill();
    ic.fillStyle = "rgba(198,215,210,.7)";
    rr(ic, -13, -180, 26, 90, 11);
    ic.fill();
    ic.fillStyle = "rgba(27,74,87,.6)";
    rr(ic, -47, -84, 94, 104, 22);
    ic.fill();
    ic.fillStyle = "rgba(198,54,45,.85)";
    ic.font = `italic 700 30px ${SERIF}`;
    ic.fillText("COLA", 0, -24);
    ic.strokeStyle = "rgba(239,236,218,.72)";
    ic.lineWidth = 4;
    ic.beginPath();
    ic.arc(0, -24, 55, .15, Math.PI - .15);
    ic.stroke();
    ic.restore();
    ic.font = `18px ${SANS_NARROW}`;
    ic.fillStyle = "rgba(229,226,205,.72)";
    ic.fillText("SERVED HERE — FIVE CENTS", IW / 2, 640);
    ic.strokeStyle = "rgba(220,217,195,.25)";
    ic.beginPath();
    ic.moveTo(60, 680);
    ic.lineTo(IW - 60, 680);
    ic.stroke();
    ic.font = `14px ${SANS}`;
    ic.fillText("NEWS  ·  CIGARETTES  ·  ALL HOURS", IW / 2, 712);
    for (let i = 0; i < 24; i++) {
        blob(ic, r4() * IW, r4() * IH, 5 + r4() * 36, 2 + r4() * 18, "rgba(3,10,8,.14)", 1, 4);
    }
    weatherText(ic, IW, IH, r4, .0025);
    grain(ic, IW, IH, 8, 75);
    return {
        chronicle: makeTexture(ad.canvas, renderer),
        chalk: makeTexture(chalk.canvas, renderer),
        icePoster: makeTexture(ice.canvas, renderer)
    };
}

function addRustCluster(ctx, rng, x, y, size) {
    const blobs = 4 + Math.floor(rng() * 8);
    for (let i = 0; i < blobs; i++) {
        const xx = x + (rng() - .5) * size * 1.45;
        const yy = y + (rng() - .5) * size * .8;
        const rad = size * (.07 + Math.pow(rng(), 1.6) * .27);
        blob(ctx, xx, yy, rad * (1 + rng()), rad * .55, `rgba(${58 + rng() * 22},${44 + rng() * 13},${34 + rng() * 10},${.18 + rng() * .32})`, 1, 2.2, rng() * 2);
        blob(ctx, xx - rad * .18, yy - rad * .16, rad * .47, rad * .25, `rgba(${118 + rng() * 24},${81 + rng() * 16},${51 + rng() * 12},${.1 + rng() * .18})`, 1, 1.2, rng() * 2);
        if (rng() > .55) {
            blob(ctx, xx + rad * .1, yy + rad * .06, rad * .18, rad * .12, "rgba(30,25,21,.55)", 1, .8);
        }
    }
    if (rng() > .35) {
        const dx = x + (rng() - .5) * size;
        const len = size * (.6 + rng() * 2.2);
        const grd = ctx.createLinearGradient(dx, y, dx, y + len);
        grd.addColorStop(0, `rgba(${82 + rng() * 20},${54 + rng() * 12},${35 + rng() * 10},.32)`);
        grd.addColorStop(1, "rgba(92,58,33,0)");
        ctx.fillStyle = grd;
        ctx.fillRect(dx, y, .7 + rng() * 2.4, len);
    }
}

function createVendingTextures(renderer) {
    const W = 768, H = 1280;
    const front = makeCanvas(W, H);
    const c = front.ctx;
    const rng = mulberry32(1979);
    const bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#a4c1c5");
    bg.addColorStop(.22, "#92b2b8");
    bg.addColorStop(.65, "#82a5ab");
    bg.addColorStop(1, "#6d8f94");
    c.fillStyle = bg;
    c.fillRect(0, 0, W, H);
    const bleach = c.createLinearGradient(W * .15, 0, W * .62, H * .7);
    bleach.addColorStop(0, "rgba(221,226,217,.10)");
    bleach.addColorStop(.55, "rgba(216,222,211,.03)");
    bleach.addColorStop(1, "rgba(33,53,56,.10)");
    c.fillStyle = bleach;
    c.fillRect(0, 0, W, H);
    for (let i = 0; i < 95; i++) {
        blob(c, rng() * W, rng() * H, 20 + rng() * 150, 10 + rng() * 90, rng() > .45 ? "rgba(206,220,216,.065)" : "rgba(35,56,59,.08)", 1, 22, rng() * 2);
    }
    c.save();
    c.globalAlpha = .21;
    c.fillStyle = "#e2ddc8";
    c.textAlign = "center";
    c.font = `18px ${SANS_NARROW}`;
    c.fillText("I C E   C O L D", W / 2, 88);
    c.fillText("S E R V I C E   ·   C O L D   D R I N K S", W / 2, 113);
    c.globalAlpha = .1;
    c.font = `12px ${SANS_NARROW}`;
    c.fillText("P E P S I - C O L A   B O T T L I N G   C O .", W / 2, H - 86);
    c.restore();
    for (let i = 0; i < 24; i++) {
        const y = rng() * H;
        line(c, 0, y, W, y, "rgba(35,53,55,.055)", 1 + rng() * 5);
    }
    blob(c, W * .5, H * .18, W * .45, H * .22, "rgba(220,220,198,.09)", 1, 32);
    blob(c, W * .3, H * .06, W * .2, H * .1, "rgba(255,244,213,.1)", 1, 20);
    function paintChip(x, y, rx, ry, rusted) {
        const points = 7 + Math.floor(rng() * 5);
        const angles = [];
        for (let k = 0; k < points; k++) angles.push(rng() * TAU);
        angles.sort((a, b) => a - b);
        c.save();
        c.beginPath();
        for (let k = 0; k < points; k++) {
            const a = angles[k];
            const wobble = .56 + rng() * .62;
            const px = x + Math.cos(a) * rx * wobble;
            const py = y + Math.sin(a) * ry * wobble;
            if (k === 0) c.moveTo(px, py); else c.lineTo(px, py);
        }
        c.closePath();
        c.fillStyle = rusted ? `rgb(${63 + rng() * 24},${44 + rng() * 14},${33 + rng() * 10})` : "#59635e";
        c.fill();
        c.strokeStyle = "rgba(207,216,203,.24)";
        c.lineWidth = .9;
        c.stroke();
        c.fillStyle = `rgba(${119 + rng() * 28},${83 + rng() * 17},${54 + rng() * 12},${.26 + rng() * .28})`;
        c.beginPath();
        c.ellipse(x + rx * .08, y - ry * .06, rx * .45, ry * .36, rng(), 0, TAU);
        c.fill();
        c.restore();
    }
    const chipCount = 210;
    for (let i = 0; i < chipCount; i++) {
        const edgeBias = rng();
        let x, y;
        if (edgeBias > .46) {
            x = rng() < .5 ? rng() * W * .12 : W - rng() * W * .12;
            y = rng() * H;
        } else if (edgeBias > .13) {
            x = rng() * W;
            y = H - rng() * H * .32;
        } else {
            x = rng() * W;
            y = rng() * H;
        }
        const rx = 1.4 + Math.pow(rng(), 2.15) * 22;
        const ry = .9 + Math.pow(rng(), 1.9) * 12;
        paintChip(x, y, rx, ry, rng() > .38);
    }
    for (let i = 0; i < 22; i++) {
        const side = rng() > .5;
        paintChip(side ? 26 + rng() * 120 : W - 26 - rng() * 120, H * (.8 + rng() * .18), 7 + rng() * 36, 4 + rng() * 19, true);
    }
    for (let i = 0; i < 10; i++) {
        paintChip(W - 42 - rng() * 40, 220 + rng() * (H - 480), 3 + rng() * 9, 4 + rng() * 22, true);
    }
    const rustPoints = [ [ 26, 340, 30 ], [ 40, 840, 30 ], [ 720, 520, 26 ], [ 700, 1120, 42 ], [ 130, 1240, 48 ], [ 600, 160, 22 ], [ 280, 490, 16 ], [ 360, 1120, 24 ], [ 70, 620, 20 ], [ 680, 880, 22 ], [ 520, 90, 17 ], [ 160, 1e3, 20 ], [ 740, 300, 22 ], [ 540, 760, 14 ], [ 420, 380, 12 ], [ 620, 1040, 30 ], [ 92, 1120, 32 ], [ 18, 1010, 24 ], [ 740, 760, 20 ], [ 34, 180, 16 ], [ 690, 120, 14 ], [ 530, 1160, 34 ], [ 120, 700, 17 ] ];
    for (const [x, y, s] of rustPoints) addRustCluster(c, rng, x, y, s);
    const rustBase = c.createLinearGradient(0, H * .86, 0, H);
    rustBase.addColorStop(0, "rgba(94,64,43,0)");
    rustBase.addColorStop(.55, "rgba(82,55,39,.28)");
    rustBase.addColorStop(1, "rgba(58,37,27,.68)");
    c.fillStyle = rustBase;
    c.fillRect(0, 0, W, H);
    for (let i = 0; i < 58; i++) {
        addRustCluster(c, rng, rng() * W, H * (.84 + rng() * .15), 5 + rng() * 18);
    }
    for (let i = 0; i < 13; i++) {
        const x = 24 + rng() * (W - 48);
        const y = H * (.58 + rng() * .28);
        const len = 20 + rng() * 150;
        const rr = 1 + rng() * 4;
        line(c, x, y, x + (rng() - .5) * 8, y + len, `rgba(${96 + rng() * 40},${59 + rng() * 22},${35 + rng() * 15},${.08 + rng() * .16})`, rr);
    }
    c.save();
    c.globalCompositeOperation = "screen";
    for (let i = 0; i < 9; i++) {
        const x = 30 + rng() * (W - 60);
        const grad = c.createLinearGradient(x, 0, x + 16, H);
        grad.addColorStop(0, "rgba(214,225,217,.05)");
        grad.addColorStop(.45, "rgba(207,219,211,.09)");
        grad.addColorStop(1, "rgba(214,225,217,0)");
        c.fillStyle = grad;
        c.fillRect(x, 0, 2 + rng() * 12, H * (.6 + rng() * .4));
    }
    c.restore();
    for (let i = 0; i < 150; i++) {
        const x = rng() * W, y = rng() * H;
        const len = 2 + rng() * 34;
        line(c, x, y, x + len * (rng() - .5), y + len * (rng() - .5), rng() > .5 ? "rgba(213,220,200,.18)" : "rgba(41,52,50,.26)", .5 + rng() * 1.2);
    }
    c.strokeStyle = "rgba(30,45,46,.46)";
    c.lineWidth = 10;
    c.strokeRect(15, 15, W - 30, H - 30);
    c.strokeStyle = "rgba(226,221,197,.16)";
    c.lineWidth = 2;
    c.strokeRect(23, 23, W - 46, H - 46);
    c.strokeStyle = "rgba(34,50,51,.42)";
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(W - 92, 28);
    c.lineTo(W - 92, H - 28);
    c.stroke();
    c.strokeStyle = "rgba(226,221,197,.11)";
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(W - 87, 32);
    c.lineTo(W - 87, H - 32);
    c.stroke();
    for (const corner of [ [ 0, 0, 1, 1 ], [ W, 0, -1, 1 ], [ 0, H, 1, -1 ], [ W, H, -1, -1 ] ]) {
        const [cx, cy, sx, sy] = corner;
        const g = c.createRadialGradient(cx, cy, 2, cx, cy, corner[1] === 0 ? 46 : 34);
        g.addColorStop(0, "rgba(26,38,39,.62)");
        g.addColorStop(.55, "rgba(36,52,53,.26)");
        g.addColorStop(1, "rgba(36,52,53,0)");
        c.fillStyle = g;
        c.beginPath();
        c.ellipse(cx, cy, 42, corner[1] === 0 ? 34 : 26, 0, 0, TAU);
        c.fill();
    }
    c.strokeStyle = "rgba(33,49,50,.29)";
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(20, H * .235);
    c.lineTo(W - 20, H * .235);
    c.stroke();
    c.strokeStyle = "rgba(230,228,205,.09)";
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(24, H * .239);
    c.lineTo(W - 24, H * .239);
    c.stroke();
    c.save();
    c.translate(W - 45, H - 160);
    c.rotate(-Math.PI / 2);
    c.font = `13px ${SANS_NARROW}`;
    c.fillStyle = "rgba(34,45,43,.4)";
    c.fillText("PROPERTY OF PEPSI-COLA  ·  No. 1947", 0, 0);
    c.restore();
    const specks = c.createImageData(W, H);
    for (let i = 0; i < 1300; i++) {
        const x = Math.floor(rng() * W), y = Math.floor(rng() * H);
        const p = (y * W + x) * 4;
        specks.data[p] = 20 + rng() * 30;
        specks.data[p + 1] = 18 + rng() * 25;
        specks.data[p + 2] = 14 + rng() * 20;
        specks.data[p + 3] = 20 + rng() * 50;
    }
    const speckC = document.createElement("canvas");
    speckC.width = W;
    speckC.height = H;
    speckC.getContext("2d").putImageData(specks, 0, 0);
    c.drawImage(speckC, 0, 0);
    weatherText(c, W, H, rng, .0012);
    grain(c, W, H, 8, 53);
    const rough = makeCanvas(W, H);
    const rc = rough.ctx;
    const r2 = mulberry32(810);
    rc.fillStyle = "#8d8d8d";
    rc.fillRect(0, 0, W, H);
    for (let i = 0; i < 80; i++) {
        blob(rc, r2() * W, r2() * H, 15 + r2() * 100, 8 + r2() * 55, r2() > .5 ? "rgba(45,45,45,.3)" : "rgba(210,210,210,.22)", 1, 18, r2() * 2);
    }
    for (const [x, y, s] of rustPoints) {
        blob(rc, x, y, s * 1.2, s * .65, "rgba(246,246,246,.8)", 1, 5, r2() * 2);
    }
    const rrBase = rc.createLinearGradient(0, H * .85, 0, H);
    rrBase.addColorStop(0, "rgba(200,200,200,0)");
    rrBase.addColorStop(1, "rgba(235,235,235,.7)");
    rc.fillStyle = rrBase;
    rc.fillRect(0, 0, W, H);
    grain(rc, W, H, 22, 27);
    const metal = makeCanvas(W, H);
    const mc = metal.ctx;
    const r3 = mulberry32(912);
    mc.fillStyle = "#2a2a2a";
    mc.fillRect(0, 0, W, H);
    for (let i = 0; i < 180; i++) {
        blob(mc, r3() * W, r3() * H, 1 + r3() * 8, .7 + r3() * 4, "rgba(220,220,220,.4)", 1, 1.5, r3() * 2);
    }
    const frontMat = makeTexture(front.canvas, renderer);
    const roughMat = makeTexture(rough.canvas, renderer, {
        srgb: false
    });
    const metalMat = makeTexture(metal.canvas, renderer, {
        srgb: false
    });
    const BW = 512, BH = 1024;
    const sideC = makeCanvas(BW, BH);
    const sc = sideC.ctx;
    const r4 = mulberry32(55561);
    const sg = sc.createLinearGradient(0, 0, BW, BH);
    sg.addColorStop(0, "#86a9b0");
    sg.addColorStop(.5, "#71959b");
    sg.addColorStop(1, "#5a7c81");
    sc.fillStyle = sg;
    sc.fillRect(0, 0, BW, BH);
    for (let i = 0; i < 35; i++) {
        blob(sc, r4() * BW, r4() * BH, 10 + r4() * 70, 6 + r4() * 50, r4() > .5 ? "rgba(208,220,214,.06)" : "rgba(28,45,46,.09)", 1, 12, r4() * 2);
    }
    for (let i = 0; i < 32; i++) {
        addRustCluster(sc, r4, r4() < .5 ? r4() * 60 : BW - r4() * 60, r4() * BH, 8 + r4() * 25);
    }
    const sBase = sc.createLinearGradient(0, BH * .88, 0, BH);
    sBase.addColorStop(0, "rgba(87,55,36,0)");
    sBase.addColorStop(1, "rgba(75,48,31,.65)");
    sc.fillStyle = sBase;
    sc.fillRect(0, 0, BW, BH);
    for (let i = 0; i < 900; i++) {
        sc.fillStyle = `rgba(20,28,28,${.02 + r4() * .05})`;
        sc.fillRect(r4() * BW, r4() * BH, 1, 1);
    }
    grain(sc, BW, BH, 7, 26);
    const sideMap = makeTexture(sideC.canvas, renderer, {
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping
    });
    return {
        frontMat: frontMat,
        roughMat: roughMat,
        metalMat: metalMat,
        sideMap: sideMap
    };
}

function createPepsiLogo(renderer) {
    const W = 1024, H = 512;
    const {canvas: canvas, ctx: ctx} = makeCanvas(W, H);
    const rng = mulberry32(1937);
    ctx.clearRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#b52224";
    ctx.font = `italic 700 62px ${SERIF}`;
    ctx.fillText("Drink", W * .54, 95);
    ctx.save();
    ctx.translate(W * .5, 265);
    ctx.rotate(-.025);
    ctx.scale(1.02, 1);
    ctx.font = `italic 700 190px ${SERIF}`;
    ctx.fillStyle = "#b52224";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Pepsi-Cola", 0, 0);
    ctx.restore();
    ctx.strokeStyle = "#b52224";
    ctx.lineWidth = 18;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(120, 372);
    ctx.bezierCurveTo(280, 410, 640, 405, 878, 350);
    ctx.stroke();
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(884, 304);
    ctx.bezierCurveTo(948, 298, 966, 336, 920, 360);
    ctx.stroke();
    ctx.fillStyle = "#b52224";
    ctx.font = `20px ${SANS}`;
    ctx.textAlign = "left";
    ctx.fillText("®", 885, 208);
    weatherText(ctx, W, H, rng, .007);
    for (let i = 0; i < 38; i++) {
        blob(ctx, rng() * W, rng() * H, .5 + rng() * 4, .5 + rng() * 3, "rgba(255,255,255,.08)", 1);
    }
    const t = makeTexture(canvas, renderer);
    return t;
}

function createCoinBadge(renderer) {
    const W = 256, H = 256;
    const {canvas: canvas, ctx: ctx} = makeCanvas(W, H);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#a51f22";
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 113, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#d9c9a3";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 100, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = "#f1e5c8";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 108px ${SANS_NARROW}`;
    ctx.fillText("5¢", W / 2, H / 2 + 8);
    ctx.font = `18px ${SANS_NARROW}`;
    ctx.fillText("ICE COLD", W / 2, H / 2 + 86);
    grain(ctx, W, H, 8, 444);
    return makeTexture(canvas, renderer);
}

function createCupLabel(renderer) {
    const W = 512, H = 256;
    const {canvas: canvas, ctx: ctx} = makeCanvas(W, H);
    ctx.fillStyle = "#f0ece0";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#a72225";
    ctx.fillRect(0, 0, W, 34);
    ctx.fillRect(0, H - 34, W, 34);
    ctx.fillStyle = "#21445c";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `italic 700 54px ${SERIF}`;
    ctx.fillText("Pepsi-Cola", W / 2, H * .43);
    ctx.font = `17px ${SANS_NARROW}`;
    ctx.fillText("ICE COLD · ENJOY", W / 2, H * .65);
    ctx.strokeStyle = "rgba(33,68,92,.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(90, H * .56);
    ctx.lineTo(W - 90, H * .56);
    ctx.stroke();
    grain(ctx, W, H, 5, 20);
    return makeTexture(canvas, renderer);
}

function createWallPoster(renderer) {
    const W = 640, H = 1050;
    const {canvas: canvas, ctx: ctx} = makeCanvas(W, H);
    const rng = mulberry32(70712);
    ctx.fillStyle = "#d9cfb5";
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(255,250,226,.16)");
    g.addColorStop(.6, "rgba(146,118,73,.04)");
    g.addColorStop(1, "rgba(74,48,25,.18)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#1c3852";
    ctx.lineWidth = 18;
    ctx.strokeRect(23, 23, W - 46, H - 46);
    ctx.strokeStyle = "#5a5a44";
    ctx.lineWidth = 2;
    ctx.strokeRect(42, 42, W - 84, H - 84);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#a52225";
    ctx.font = `italic 700 70px ${SERIF}`;
    ctx.fillText("A Colder", W / 2, 190);
    ctx.fillText("Drink", W / 2, 272);
    ctx.fillStyle = "#223c51";
    ctx.font = `italic 600 55px ${SERIF}`;
    ctx.fillText("for a", W / 2, 345);
    ctx.fillStyle = "#a52225";
    ctx.font = `italic 700 57px ${SERIF}`;
    ctx.fillText("Brighter Day", W / 2, 417);
    ctx.strokeStyle = "rgba(37,55,64,.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(100, 465);
    ctx.lineTo(W - 100, 465);
    ctx.stroke();
    ctx.save();
    ctx.translate(W / 2, 625);
    ctx.fillStyle = "rgba(67,103,114,.72)";
    rr(ctx, -78, -58, 156, 210, 22);
    ctx.fill();
    ctx.fillStyle = "rgba(218,230,222,.5)";
    rr(ctx, -66, -48, 132, 90, 18);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.45)";
    ctx.beginPath();
    ctx.ellipse(-28, 18, 26, 70, -.25, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#e4ddc8";
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(32, -58);
    ctx.lineTo(64, -198);
    ctx.stroke();
    ctx.strokeStyle = "#a52225";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(37, -82);
    ctx.lineTo(61, -183);
    ctx.stroke();
    ctx.fillStyle = "#f0e8d2";
    ctx.beginPath();
    ctx.arc(0, 284, 86, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#274259";
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.fillStyle = "#a52225";
    ctx.beginPath();
    ctx.arc(0, 284, 70, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#f1e5c8";
    ctx.font = `italic 700 33px ${SERIF}`;
    ctx.fillText("Pepsi-Cola", 0, 282);
    ctx.font = `13px ${SANS}`;
    ctx.fillText("FIVE CENTS", 0, 316);
    ctx.restore();
    ctx.fillStyle = "#3b3b2f";
    ctx.font = `18px ${SANS_NARROW}`;
    ctx.fillText("THE COLD DRINK WITH THE LIGHTER TASTE", W / 2, 925);
    ctx.font = `15px ${SANS}`;
    ctx.fillStyle = "rgba(56,54,40,.65)";
    ctx.fillText("DRINK PEPSI-COLA  ·  AT YOUR CORNER STAND", W / 2, 960);
    for (let i = 0; i < 65; i++) {
        blob(ctx, rng() * W, rng() * H, 1 + rng() * 30, 1 + rng() * 12, "rgba(94,68,34,.08)", 1, 5, rng() * 2);
    }
    wetStreaks(ctx, W, H, rng, 10, .04);
    weatherText(ctx, W, H, rng, .0012);
    grain(ctx, W, H, 7, 39);
    return makeTexture(canvas, renderer);
}

function createCupSign(renderer) {
    const W = 384, H = 192;
    const {canvas: canvas, ctx: ctx} = makeCanvas(W, H);
    ctx.fillStyle = "#151918";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#c9c4ad";
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, W - 16, H - 16);
    ctx.fillStyle = "#dad6c2";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `26px ${SANS_NARROW}`;
    ctx.fillText("CLEAN CUPS", W / 2, 66);
    ctx.font = `italic 24px ${SERIF}`;
    ctx.fillText("self-serve", W / 2, 105);
    ctx.font = `15px ${SANS}`;
    ctx.fillStyle = "rgba(224,218,198,.55)";
    ctx.fillText("PLEASE TAKE ONE", W / 2, 143);
    grain(ctx, W, H, 8, 81);
    return makeTexture(canvas, renderer);
}

function createWoodTextures(renderer) {
    const W = 512, H = 512;
    const front = makeCanvas(W, H);
    const side = makeCanvas(W, H);
    const top = makeCanvas(W, H);
    const rng = mulberry32(9108);
    for (const {ctx: ctx, withText: withText} of [ {
        ctx: front.ctx,
        withText: true
    }, {
        ctx: side.ctx,
        withText: false
    }, {
        ctx: top.ctx,
        withText: false
    } ]) {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "#7e6f54");
        g.addColorStop(.55, "#6b5c45");
        g.addColorStop(1, "#514630");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        const plankH = H / 5;
        for (let i = 0; i < 5; i++) {
            const y = i * plankH;
            const shift = (rng() - .5) * 45;
            const gg = ctx.createLinearGradient(0, y, W, y);
            gg.addColorStop(0, "rgba(255,240,206,.08)");
            gg.addColorStop(.45, "rgba(31,24,16,.05)");
            gg.addColorStop(1, "rgba(0,0,0,.12)");
            ctx.fillStyle = gg;
            ctx.fillRect(0, y + 2, W, plankH - 4);
            line(ctx, 0, y, W, y, "rgba(30,22,14,.6)", 3);
            line(ctx, 0, y + 3, W, y + 3, "rgba(237,220,183,.13)", 1);
            for (let k = 0; k < 12; k++) {
                const yy = y + 5 + rng() * (plankH - 10);
                ctx.strokeStyle = `rgba(${42 + rng() * 25},${33 + rng() * 20},${21 + rng() * 15},${.1 + rng() * .18})`;
                ctx.lineWidth = .7 + rng();
                ctx.beginPath();
                ctx.moveTo(shift + rng() * 50, yy);
                ctx.bezierCurveTo(W * .3, yy + (rng() - .5) * 12, W * .6, yy + (rng() - .5) * 12, W, yy + (rng() - .5) * 8);
                ctx.stroke();
            }
            if (rng() > .3) {
                const nx = 20 + rng() * (W - 40);
                const ny = y + 14;
                ctx.fillStyle = "rgba(31,26,20,.8)";
                ctx.beginPath();
                ctx.arc(nx, ny, 3.2, 0, TAU);
                ctx.fill();
                ctx.fillStyle = "rgba(195,184,153,.22)";
                ctx.beginPath();
                ctx.arc(nx - .8, ny - .8, 1.2, 0, TAU);
                ctx.fill();
            }
        }
        for (let i = 0; i < 15; i++) {
            blob(ctx, rng() * W, rng() * H, 3 + rng() * 30, 1 + rng() * 10, "rgba(202,197,171,.11)", 1, 2, rng() * 2);
        }
        const wet = ctx.createLinearGradient(0, H * .65, 0, H);
        wet.addColorStop(0, "rgba(25,19,12,0)");
        wet.addColorStop(1, "rgba(20,15,11,.55)");
        ctx.fillStyle = wet;
        ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 45; i++) {
            blob(ctx, rng() * W, rng() * H, 1 + rng() * 16, 1 + rng() * 5, "rgba(34,25,16,.12)", 1, 3);
        }
        if (withText) {
            ctx.save();
            ctx.translate(W / 2, H * .53);
            ctx.rotate(-.08);
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.globalAlpha = .96;
            ctx.fillStyle = "#a8322a";
            ctx.font = `italic 700 58px ${SERIF}`;
            ctx.fillText("Quality", 0, -35);
            ctx.font = `italic 700 50px ${SERIF}`;
            ctx.fillText("Beverages", 0, 28);
            ctx.globalAlpha = .42;
            ctx.font = `17px ${SANS_NARROW}`;
            ctx.fillText("ICE COLD  ·  BOTTLED LOCALLY", 0, 76);
            ctx.restore();
            weatherText(ctx, W, H, rng, .0035, "rgba(102,84,56,.5)");
        }
        grain(ctx, W, H, 9, 92);
    }
    return {
        front: makeTexture(front.canvas, renderer),
        side: makeTexture(side.canvas, renderer),
        top: makeTexture(top.canvas, renderer)
    };
}

function drawNewsprintBase(ctx, W, H, rng, tone = "#d8d2c0") {
    ctx.fillStyle = tone;
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "rgba(255,252,230,.12)");
    g.addColorStop(.5, "rgba(128,118,90,.045)");
    g.addColorStop(1, "rgba(71,60,37,.13)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 16; i++) {
        blob(ctx, rng() * W, rng() * H, 10 + rng() * 80, 5 + rng() * 40, "rgba(106,87,49,.045)", 1, 12, rng() * 2);
    }
    grain(ctx, W, H, 5, Math.floor(rng() * 1e3));
}

function makeNewspaperTextures(renderer) {
    const headlines = [ [ "RAIN CLEARS", "OVER THE CITY", "A softer evening after", "the long downpour" ], [ "LATE EDITION", "HARBOUR LIGHTS", "Ferries return as the", "storm moves eastward" ], [ "CORNER STORIES", "A City Wakes", "Coffee, papers and", "the morning edition" ], [ "THE WEEKEND", "NIGHT MARKET", "Crowds gather beneath", "the old arcades" ] ];
    const textures = [];
    for (let v = 0; v < 4; v++) {
        const W = 512, H = 700;
        const {canvas: canvas, ctx: ctx} = makeCanvas(W, H);
        const rng = mulberry32(200 + v * 17);
        drawNewsprintBase(ctx, W, H, rng, v % 2 ? "#d3cfc0" : "#ded7c3");
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#252720";
        fitText(ctx, "The Daily Chronicle", W - 50, 55, SERIF, "700");
        ctx.font = `700 ${fitText(ctx, "The Daily Chronicle", W - 50, 55, SERIF, "700")}px ${SERIF}`;
        ctx.fillText("The Daily Chronicle", W / 2, 60);
        ctx.font = `italic 13px ${SERIF}`;
        ctx.fillText("YOUR CITY. YOUR PAPER.", W / 2, 97);
        line(ctx, 28, 116, W - 28, 116, "rgba(33,34,28,.65)", 2);
        ctx.textAlign = "left";
        ctx.font = `10px ${SANS}`;
        ctx.fillText("EVENING EDITION", 30, 135);
        ctx.textAlign = "right";
        ctx.fillText("FIVE CENTS", W - 30, 135);
        line(ctx, 28, 148, W - 28, 148, "rgba(33,34,28,.4)", 1);
        ctx.textAlign = "center";
        ctx.fillStyle = "#1f211b";
        ctx.font = `700 48px ${SANS_NARROW}`;
        ctx.fillText(headlines[v][0], W / 2, 202);
        ctx.font = `700 38px ${SANS_NARROW}`;
        ctx.fillText(headlines[v][1], W / 2, 246);
        ctx.font = `italic 15px ${SERIF}`;
        ctx.fillText(headlines[v][2], W / 2, 286);
        ctx.fillText(headlines[v][3], W / 2, 307);
        const px = 30, py = 330, pw = W - 60, ph = 150;
        ctx.fillStyle = "#716f64";
        ctx.fillRect(px, py, pw, ph);
        const pg = ctx.createLinearGradient(px, py, px + pw, py + ph);
        pg.addColorStop(0, "#a19f93");
        pg.addColorStop(.5, "#5f615c");
        pg.addColorStop(1, "#33393a");
        ctx.fillStyle = pg;
        ctx.fillRect(px + 4, py + 4, pw - 8, ph - 8);
        ctx.fillStyle = "rgba(32,35,34,.7)";
        ctx.fillRect(px + 14, py + 72, pw * .28, ph - 80);
        ctx.fillRect(px + pw * .35, py + 42, pw * .25, ph - 50);
        ctx.beginPath();
        ctx.arc(px + pw * .74, py + 55, 22, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "rgba(227,216,176,.7)";
        for (let i = 0; i < 24; i++) {
            ctx.fillRect(px + 16 + rng() * pw * .65, py + 22 + rng() * 100, 2 + rng() * 5, 2 + rng() * 3);
        }
        ctx.fillStyle = "rgba(228,224,210,.17)";
        for (let yy = py + 10; yy < py + ph - 8; yy += 6) {
            for (let xx = px + 10; xx < px + pw - 8; xx += 6) {
                if (rng() > .25) ctx.fillRect(xx, yy, 1.2, 1.2);
            }
        }
        ctx.fillStyle = "#454337";
        ctx.font = `italic 12px ${SERIF}`;
        ctx.textAlign = "left";
        ctx.fillText("A wet slate street, photographed after the rain.", px, py + ph + 20);
        const cols = 3, gutter = 14, colW = (W - 60 - gutter * 2) / cols;
        ctx.fillStyle = "rgba(48,47,40,.8)";
        for (let col = 0; col < cols; col++) {
            let yy = 540;
            const xx = 30 + col * (colW + gutter);
            while (yy < H - 35) {
                const lw = colW * (.55 + rng() * .45);
                ctx.fillRect(xx, yy, lw, 1.6 + rng() * 1.2);
                yy += 8 + rng() * 4;
            }
        }
        const fold = ctx.createLinearGradient(W / 2 - 14, 0, W / 2 + 14, 0);
        fold.addColorStop(0, "rgba(255,255,255,0)");
        fold.addColorStop(.5, "rgba(44,39,26,.11)");
        fold.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = fold;
        ctx.fillRect(0, 0, W, H);
        line(ctx, W / 2 + 1, 0, W / 2 + 1, H, "rgba(84,73,48,.25)", 1);
        weatherText(ctx, W, H, rng, 8e-4);
        textures.push(makeTexture(canvas, renderer));
    }
    return textures;
}

function makeMagazineTextures(renderer) {
    const specs = [ {
        name: "LIFE",
        style: "life",
        bg: "#a12c27",
        fg: "#f4efe1",
        photo: "portrait"
    }, {
        name: "BETTER HOMES",
        style: "small",
        bg: "#4b7a72",
        fg: "#f4ecd7",
        photo: "house"
    }, {
        name: "SATURDAY EVENING",
        style: "post",
        bg: "#d7c08c",
        fg: "#283d4b",
        photo: "street"
    }, {
        name: "THE WEEKLY",
        style: "classic",
        bg: "#d5d1c4",
        fg: "#1e313b",
        photo: "harbour"
    }, {
        name: "SCREEN STORY",
        style: "screen",
        bg: "#b57843",
        fg: "#f3e8d5",
        photo: "portrait"
    }, {
        name: "MODERN AGE",
        style: "modern",
        bg: "#263f50",
        fg: "#e8e1c7",
        photo: "city"
    }, {
        name: "TRUE CRIME",
        style: "pulp",
        bg: "#c9b164",
        fg: "#8c2925",
        photo: "shadow"
    }, {
        name: "HOME & GARDEN",
        style: "garden",
        bg: "#6f7d57",
        fg: "#f5ecd8",
        photo: "flowers"
    }, {
        name: "PICTURE POST",
        style: "post",
        bg: "#87999d",
        fg: "#1d2930",
        photo: "street"
    }, {
        name: "RADIO STARS",
        style: "classic",
        bg: "#a15e44",
        fg: "#f0e2c4",
        photo: "portrait"
    }, {
        name: "WOMAN & HOME",
        style: "small",
        bg: "#caa999",
        fg: "#323f42",
        photo: "flowers"
    }, {
        name: "THE OUTDOORS",
        style: "modern",
        bg: "#4e6258",
        fg: "#f3e4b9",
        photo: "mountains"
    }, {
        name: "CITY LIGHTS",
        style: "screen",
        bg: "#343f5e",
        fg: "#f3d9b7",
        photo: "city"
    }, {
        name: "ALL STORIES",
        style: "pulp",
        bg: "#7e3030",
        fg: "#eddaab",
        photo: "shadow"
    } ];
    const textures = [];
    for (let idx = 0; idx < specs.length; idx++) {
        const spec = specs[idx];
        const W = 256, H = 336;
        const {canvas: canvas, ctx: ctx} = makeCanvas(W, H);
        const rng = mulberry32(630 + idx * 13);
        ctx.fillStyle = spec.bg;
        ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 35; i++) {
            blob(ctx, rng() * W, rng() * H, 2 + rng() * 40, 1 + rng() * 12, "rgba(255,248,221,.06)", 1, 5, rng() * 2);
        }
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = spec.fg;
        if (spec.style === "life") {
            ctx.fillStyle = "#f4efe1";
            ctx.fillRect(0, 0, W, 55);
            ctx.fillStyle = "#9e2824";
            ctx.font = `800 50px ${SANS_NARROW}`;
            ctx.fillText("LIFE", W / 2, 30);
        } else if (spec.style === "post") {
            ctx.strokeStyle = spec.fg;
            ctx.lineWidth = 4;
            ctx.strokeRect(7, 7, W - 14, 48);
            drawCentered(ctx, spec.name, W / 2, 31, W - 26, 25, SERIF, spec.fg, "700");
        } else if (spec.style === "screen") {
            ctx.font = `italic 700 28px ${SERIF}`;
            ctx.fillText(spec.name, W / 2, 32);
        } else if (spec.style === "modern") {
            ctx.font = `700 25px ${SANS_NARROW}`;
            ctx.fillText(spec.name, W / 2, 29);
            ctx.fillRect(28, 44, W - 56, 3);
        } else if (spec.style === "pulp") {
            ctx.font = `700 27px ${SERIF}`;
            ctx.fillText(spec.name, W / 2, 30);
            ctx.fillRect(22, 45, W - 44, 2);
        } else if (spec.style === "garden") {
            ctx.font = `italic 700 24px ${SERIF}`;
            ctx.fillText(spec.name, W / 2, 28);
        } else if (spec.style === "classic") {
            ctx.font = `700 22px ${SERIF}`;
            ctx.fillText(spec.name, W / 2, 28);
            line(ctx, 50, 43, W - 50, 43, spec.fg, 1.4);
        } else {
            ctx.font = `700 20px ${SANS_NARROW}`;
            ctx.fillText(spec.name, W / 2, 28);
            ctx.fillRect(50, 42, W - 100, 2);
        }
        const ix = 10, iy = 58, iw = W - 20, ih = 185;
        const ig = ctx.createLinearGradient(ix, iy, ix + iw, iy + ih);
        ig.addColorStop(0, "rgba(227,216,184,.8)");
        ig.addColorStop(.55, "rgba(88,105,103,.8)");
        ig.addColorStop(1, "rgba(29,41,43,.95)");
        ctx.fillStyle = ig;
        ctx.fillRect(ix, iy, iw, ih);
        ctx.save();
        ctx.beginPath();
        ctx.rect(ix, iy, iw, ih);
        ctx.clip();
        if (spec.photo === "portrait") {
            ctx.fillStyle = "rgba(42,43,41,.72)";
            ctx.beginPath();
            ctx.ellipse(W * .5, iy + 82, 44, 55, 0, 0, TAU);
            ctx.fill();
            ctx.fillStyle = "rgba(232,217,190,.72)";
            ctx.beginPath();
            ctx.ellipse(W * .5 - 12, iy + 72, 14, 24, -.2, 0, TAU);
            ctx.fill();
            ctx.fillStyle = "rgba(33,34,33,.45)";
            ctx.beginPath();
            ctx.ellipse(W * .5, iy + 175, 88, 72, 0, 0, TAU);
            ctx.fill();
            ctx.fillStyle = "rgba(210,190,150,.25)";
            ctx.fillRect(ix, iy, iw, 20);
        } else if (spec.photo === "house") {
            ctx.fillStyle = "rgba(231,222,195,.7)";
            ctx.beginPath();
            ctx.moveTo(ix + 24, iy + 110);
            ctx.lineTo(W / 2, iy + 45);
            ctx.lineTo(ix + iw - 24, iy + 110);
            ctx.closePath();
            ctx.fill();
            ctx.fillRect(ix + 42, iy + 108, iw - 84, 62);
            ctx.fillStyle = "rgba(65,81,75,.65)";
            ctx.fillRect(ix + 57, iy + 122, 22, 30);
            ctx.fillRect(ix + iw - 80, iy + 122, 22, 30);
            ctx.fillStyle = "rgba(67,98,63,.55)";
            ctx.beginPath();
            ctx.arc(ix + 22, iy + 155, 22, 0, TAU);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(ix + iw - 18, iy + 148, 30, 0, TAU);
            ctx.fill();
        } else if (spec.photo === "street") {
            ctx.fillStyle = "rgba(229,216,184,.68)";
            ctx.fillRect(ix + 10, iy + 24, iw - 20, 60);
            ctx.fillStyle = "rgba(37,47,48,.8)";
            ctx.fillRect(ix + 14, iy + 104, 38, 70);
            ctx.fillRect(ix + 62, iy + 84, 50, 90);
            ctx.fillRect(ix + 120, iy + 118, 36, 56);
            ctx.fillRect(ix + 170, iy + 72, 40, 102);
            ctx.fillStyle = "rgba(235,190,103,.85)";
            for (let i = 0; i < 10; i++) ctx.fillRect(ix + 18 + i % 4 * 48, iy + 96 + Math.floor(i / 4) * 24, 5, 7);
            ctx.fillStyle = "rgba(11,20,20,.45)";
            ctx.beginPath();
            ctx.moveTo(ix, iy + 150);
            ctx.lineTo(ix + iw, iy + 135);
            ctx.lineTo(ix + iw, iy + ih);
            ctx.lineTo(ix, iy + ih);
            ctx.closePath();
            ctx.fill();
        } else if (spec.photo === "harbour") {
            ctx.fillStyle = "rgba(31,52,59,.75)";
            ctx.fillRect(ix, iy + 100, iw, ih - 100);
            ctx.fillStyle = "rgba(226,212,179,.55)";
            ctx.beginPath();
            ctx.arc(ix + iw * .7, iy + 65, 22, 0, TAU);
            ctx.fill();
            ctx.fillStyle = "rgba(38,49,50,.8)";
            ctx.beginPath();
            ctx.moveTo(ix + 45, iy + 140);
            ctx.lineTo(ix + 92, iy + 95);
            ctx.lineTo(ix + 112, iy + 140);
            ctx.fill();
            ctx.fillStyle = "rgba(222,201,154,.62)";
            for (let i = 0; i < 9; i++) ctx.fillRect(ix + 20 + rng() * (iw - 50), iy + 145 + rng() * 32, 2 + rng() * 5, 2);
        } else if (spec.photo === "city") {
            ctx.fillStyle = "rgba(210,191,147,.45)";
            ctx.fillRect(ix, iy, iw, ih);
            ctx.fillStyle = "rgba(27,37,42,.86)";
            for (let i = 0; i < 7; i++) {
                const bx = ix + 5 + i * 30 + rng() * 10;
                const bh = 50 + rng() * 110;
                ctx.fillRect(bx, iy + ih - bh, 20 + rng() * 12, bh);
            }
            ctx.fillStyle = "rgba(244,190,90,.9)";
            for (let i = 0; i < 24; i++) ctx.fillRect(ix + 10 + rng() * (iw - 24), iy + 75 + rng() * 100, 2.5, 3.2);
        } else if (spec.photo === "shadow") {
            ctx.fillStyle = "rgba(22,24,22,.9)";
            ctx.beginPath();
            ctx.ellipse(ix + iw * .55, iy + 100, 34, 50, .2, 0, TAU);
            ctx.fill();
            ctx.fillStyle = "rgba(196,177,132,.62)";
            ctx.beginPath();
            ctx.ellipse(ix + iw * .45, iy + 90, 20, 30, -.2, 0, TAU);
            ctx.fill();
            ctx.strokeStyle = "rgba(210,192,145,.25)";
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(ix + 10, iy + 20);
            ctx.lineTo(ix + iw - 10, iy + 160);
            ctx.stroke();
        } else if (spec.photo === "flowers") {
            ctx.fillStyle = "rgba(49,74,58,.8)";
            ctx.fillRect(ix, iy + 100, iw, ih - 100);
            for (let i = 0; i < 20; i++) {
                ctx.fillStyle = i % 3 === 0 ? "rgba(219,178,153,.85)" : i % 3 === 1 ? "rgba(232,215,179,.8)" : "rgba(172,103,85,.8)";
                ctx.beginPath();
                ctx.arc(ix + 15 + rng() * (iw - 30), iy + 40 + rng() * 120, 4 + rng() * 9, 0, TAU);
                ctx.fill();
            }
            ctx.strokeStyle = "rgba(72,101,66,.8)";
            ctx.lineWidth = 2;
            for (let i = 0; i < 8; i++) {
                ctx.beginPath();
                ctx.moveTo(ix + rng() * iw, iy + 100);
                ctx.lineTo(ix + rng() * iw, iy + ih);
                ctx.stroke();
            }
        } else if (spec.photo === "mountains") {
            ctx.fillStyle = "rgba(218,205,170,.75)";
            ctx.fillRect(ix, iy, iw, 60);
            ctx.fillStyle = "rgba(54,74,69,.75)";
            ctx.beginPath();
            ctx.moveTo(ix, iy + 120);
            ctx.lineTo(ix + 55, iy + 55);
            ctx.lineTo(ix + 110, iy + 120);
            ctx.lineTo(ix + 160, iy + 45);
            ctx.lineTo(ix + iw, iy + 130);
            ctx.lineTo(ix + iw, iy + ih);
            ctx.lineTo(ix, iy + ih);
            ctx.fill();
            ctx.fillStyle = "rgba(229,220,193,.35)";
            ctx.beginPath();
            ctx.moveTo(ix + 160, iy + 45);
            ctx.lineTo(ix + 185, iy + 75);
            ctx.lineTo(ix + 135, iy + 75);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
        ctx.textAlign = "left";
        ctx.fillStyle = spec.fg;
        const lineY = [ iy + ih + 17, iy + ih + 36, iy + ih + 55 ];
        const coverLines = [ "Six pages of city stories", "The season’s small pleasures", "News · Pictures · People" ];
        let i = 0;
        for (const l of coverLines) {
            ctx.font = `${i === 0 ? "italic 700 13px" : "11px"} ${i === 0 ? SERIF : SANS}`;
            ctx.fillText(l, 12, lineY[i]);
            i++;
        }
        ctx.fillStyle = spec.style === "pulp" ? "#f5e6bd" : spec.fg;
        ctx.font = `10px ${SANS_NARROW}`;
        ctx.textAlign = "right";
        ctx.fillText("25¢", W - 12, iy + ih + 17);
        ctx.textAlign = "left";
        ctx.font = `8px ${SANS}`;
        ctx.globalAlpha = .7;
        ctx.fillText("VOL. XII    No. 4", 12, H - 10);
        ctx.globalAlpha = 1;
        line(ctx, W - 30, 0, W - 32, H, "rgba(19,24,23,.15)", 2);
        for (let i = 0; i < 18; i++) {
            line(ctx, rng() * W, rng() * H, rng() * W, rng() * H, "rgba(239,231,206,.09)", .7);
        }
        weatherText(ctx, W, H, rng, .0018);
        grain(ctx, W, H, 6, 71 + idx);
        textures.push(makeTexture(canvas, renderer));
    }
    return textures;
}

function createBrickTexture(renderer) {
    const W = 1024, H = 1024;
    const {canvas: canvas, ctx: ctx} = makeCanvas(W, H);
    const rng = mulberry32(2877);
    ctx.fillStyle = "#171513";
    ctx.fillRect(0, 0, W, H);
    const rows = 22, bh = H / rows;
    for (let row = 0; row < rows; row++) {
        const off = row % 2 * 24;
        for (let col = -1; col < 12; col++) {
            const x = col * 62 + off + 2;
            const y = row * bh + 2;
            const v = rng();
            ctx.fillStyle = v > .7 ? "#3a3029" : v > .4 ? "#2d2722" : "#282522";
            ctx.fillRect(x, y, 58, bh - 4);
            ctx.fillStyle = "rgba(255,236,207,.025)";
            ctx.fillRect(x, y, 58, 1);
        }
    }
    for (let i = 0; i < 30; i++) {
        blob(ctx, rng() * W, rng() * H, 10 + rng() * 70, 5 + rng() * 30, "rgba(0,0,0,.18)", 1, 9);
    }
    wetStreaks(ctx, W, H, rng, 20, .035);
    grain(ctx, W, H, 8, 12);
    return makeTexture(canvas, renderer, {
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping
    });
}

function createFacadeTexture(renderer) {
    const W = 1024, H = 1024;
    const {canvas: canvas, ctx: ctx} = makeCanvas(W, H);
    const rng = mulberry32(9643);
    ctx.fillStyle = "#101817";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#18211e";
    ctx.fillRect(0, 0, W, H * .36);
    for (let i = 0; i < 12; i++) {
        ctx.fillStyle = `rgba(${45 + rng() * 25},${55 + rng() * 20},${48 + rng() * 15},.15)`;
        ctx.fillRect(0, i * 22, W, 2);
    }
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 5; col++) {
            const x = 70 + col * 185;
            const y = 95 + row * 190;
            const glow = rng() > .55;
            ctx.fillStyle = glow ? "rgba(222,168,92,.3)" : "rgba(5,10,10,.62)";
            ctx.fillRect(x, y, 104, 126);
            ctx.strokeStyle = "rgba(116,128,115,.22)";
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, 104, 126);
            if (glow) {
                ctx.fillStyle = "rgba(255,206,128,.13)";
                ctx.fillRect(x + 8, y + 8, 88, 110);
            }
            line(ctx, x + 52, y, x + 52, y + 126, "rgba(8,12,11,.7)", 3);
            line(ctx, x, y + 63, x + 104, y + 63, "rgba(8,12,11,.7)", 3);
        }
    }
    ctx.save();
    ctx.globalAlpha = .12;
    ctx.fillStyle = "#d1c9ab";
    ctx.font = `700 72px ${SERIF}`;
    ctx.textAlign = "center";
    ctx.fillText("HOTEL", W * .52, H * .48);
    ctx.restore();
    wetStreaks(ctx, W, H, rng, 30, .06);
    grain(ctx, W, H, 8, 89);
    return makeTexture(canvas, renderer, {
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping
    });
}

function createEnvironmentTexture(renderer) {
    const W = 2048, H = 1024;
    const {canvas: canvas, ctx: ctx} = makeCanvas(W, H);
    const rng = mulberry32(4938);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0a1118");
    g.addColorStop(.3, "#12232b");
    g.addColorStop(.46, "#26444e");
    g.addColorStop(.52, "#3f5f64");
    g.addColorStop(.58, "#345055");
    g.addColorStop(.67, "#192724");
    g.addColorStop(1, "#080b0a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const bloom = ctx.createRadialGradient(W * .62, H * .46, 10, W * .62, H * .5, W * .34);
    bloom.addColorStop(0, "rgba(141,169,173,.22)");
    bloom.addColorStop(.55, "rgba(80,112,118,.08)");
    bloom.addColorStop(1, "rgba(30,52,58,0)");
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, W, H * .72);
    ctx.restore();
    for (let i = 0; i < 80; i++) {
        blob(ctx, rng() * W, H * (.08 + rng() * .32), 40 + rng() * 170, 8 + rng() * 34, rng() > .5 ? "rgba(57,74,80,.20)" : "rgba(5,8,11,.15)", 1, 26, rng() * 2);
    }
    for (let i = 0; i < 160; i++) {
        const x = rng() * W;
        const y = H * (.42 + rng() * .14);
        const warm = rng() > .32;
        ctx.fillStyle = warm ? `rgba(${210 + rng() * 40},${150 + rng() * 60},${65 + rng() * 45},${.25 + rng() * .5})` : `rgba(${90 + rng() * 40},${140 + rng() * 40},${160 + rng() * 40},${.12 + rng() * .3})`;
        ctx.fillRect(x, y, 2 + rng() * 7, 1 + rng() * 3);
    }
    blob(ctx, W * .22, H * .5, 165, 58, "rgba(238,170,79,.30)", 1, 48);
    blob(ctx, W * .34, H * .53, 92, 37, "rgba(251,195,107,.22)", 1, 26);
    blob(ctx, W * .7, H * .57, 110, 42, "rgba(140,55,47,.20)", 1, 30);
    blob(ctx, W * .83, H * .52, 80, 25, "rgba(222,157,72,.14)", 1, 22);
    const hg = ctx.createLinearGradient(0, H * .58, 0, H);
    hg.addColorStop(0, "rgba(111,139,141,.17)");
    hg.addColorStop(.2, "rgba(24,38,38,.16)");
    hg.addColorStop(1, "rgba(4,7,8,.5)");
    ctx.fillStyle = hg;
    ctx.fillRect(0, H * .55, W, H * .45);
    for (let i = 0; i < 34; i++) {
        line(ctx, rng() * W, H * .62 + rng() * H * .24, rng() * W, H * .62 + rng() * H * .3, "rgba(231,183,105,.08)", 1 + rng() * 3);
    }
    grain(ctx, W, H, 10, 53);
    const texture = makeTexture(canvas, renderer, {
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.ClampToEdgeWrapping
    });
    texture.mapping = THREE.EquirectangularReflectionMapping;
    return texture;
}

function createLeafTexture(renderer) {
    const W = 128, H = 128;
    const {canvas: canvas, ctx: ctx} = makeCanvas(W, H);
    ctx.clearRect(0, 0, W, H);
    const rng = mulberry32(3001);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(.5);
    ctx.fillStyle = "#3b2b15";
    ctx.beginPath();
    ctx.moveTo(0, -42);
    ctx.bezierCurveTo(35, -30, 38, 18, 0, 43);
    ctx.bezierCurveTo(-38, 18, -35, -30, 0, -42);
    ctx.fill();
    ctx.strokeStyle = "rgba(123,95,48,.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -38);
    ctx.lineTo(0, 38);
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
        line(ctx, 0, -18 + i * 12, (i % 2 ? 1 : -1) * (12 + rng() * 12), -24 + i * 12, "rgba(123,95,48,.5)", 1);
    }
    ctx.restore();
    return makeTexture(canvas, renderer);
}

export function buildTextures(renderer) {
    return {
        tiles: createTileTextures(renderer),
        ground: createGroundTextures(renderer),
        puddle: createPuddleMask(renderer),
        timber: createPaintedTimber(renderer),
        awning: createAwningTextures(renderer),
        awningReflection: createAwningReflection(renderer),
        signs: createKioskSigns(renderer),
        vending: createVendingTextures(renderer),
        pepsiLogo: createPepsiLogo(renderer),
        coinBadge: createCoinBadge(renderer),
        cupLabel: createCupLabel(renderer),
        wallPoster: createWallPoster(renderer),
        cupSign: createCupSign(renderer),
        wood: createWoodTextures(renderer),
        newspapers: makeNewspaperTextures(renderer),
        magazines: makeMagazineTextures(renderer),
        brick: createBrickTexture(renderer),
        facade: createFacadeTexture(renderer),
        environment: createEnvironmentTexture(renderer),
        leaf: createLeafTexture(renderer)
    };
}
