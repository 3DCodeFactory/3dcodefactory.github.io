import * as THREE from "three";

const TAU = Math.PI * 2;

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

function canvas(w, h = w) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
}

function hash2(x, y, seed = 0) {
    let h = x * 374761393 + y * 668265263 + seed * 2147483647;
    h = (h ^ h >>> 13) * 1274126177;
    return ((h ^ h >>> 16) >>> 0) / 4294967295;
}

function smoothNoise(x, y, seed = 0) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const a = hash2(xi, yi, seed);
    const b = hash2(xi + 1, yi, seed);
    const c = hash2(xi, yi + 1, seed);
    const d = hash2(xi + 1, yi + 1, seed);
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

function fbm(x, y, octaves = 4, seed = 0) {
    let n = 0, amp = .5, freq = 1;
    for (let i = 0; i < octaves; i++) {
        n += smoothNoise(x * freq, y * freq, seed + i * 17) * amp;
        freq *= 2.02;
        amp *= .5;
    }
    return n;
}

function textureFrom(c, {srgb: srgb = true, repeat: repeat = [ 1, 1 ], anisotropy: anisotropy = 8} = {}) {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
    t.anisotropy = anisotropy;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.needsUpdate = true;
    return t;
}

function grain(ctx, w, h, amount = .055, seed = 2, cool = false) {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const rnd = mulberry32(seed);
    for (let i = 0; i < d.length; i += 4) {
        const n = (rnd() - .5) * 255 * amount;
        d[i] = Math.max(0, Math.min(255, d[i] + n * (cool ? .8 : 1.05)));
        d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
        d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n * (cool ? 1.18 : .9)));
    }
    ctx.putImageData(img, 0, 0);
}

function radialDamp(ctx, w, h, count, seed, color = "13,18,20", alpha = .22) {
    const rnd = mulberry32(seed);
    ctx.save();
    for (let i = 0; i < count; i++) {
        const x = rnd() * w;
        const y = rnd() * h;
        const rx = w * (.05 + rnd() * .22);
        const ry = h * (.03 + rnd() * .18);
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, ry / rx);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        g.addColorStop(0, `rgba(${color},${alpha * (.5 + rnd() * .7)})`);
        g.addColorStop(.62, `rgba(${color},${alpha * .35})`);
        g.addColorStop(1, `rgba(${color},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
        ctx.restore();
    }
    ctx.restore();
}

function verticalStreaks(ctx, w, h, seed, count = 28, dark = "10,13,14") {
    const rnd = mulberry32(seed);
    ctx.save();
    for (let i = 0; i < count; i++) {
        const x = rnd() * w;
        const ww = w * (.002 + rnd() * .018);
        const top = rnd() * h * .45;
        const len = h * (.2 + rnd() * .8);
        const g = ctx.createLinearGradient(0, top, 0, Math.min(h, top + len));
        g.addColorStop(0, `rgba(${dark},0)`);
        g.addColorStop(.2, `rgba(${dark},${.08 + rnd() * .18})`);
        g.addColorStop(.7, `rgba(${dark},${.04 + rnd() * .12})`);
        g.addColorStop(1, `rgba(${dark},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(x, top, ww, len);
    }
    ctx.restore();
}

function chips(ctx, w, h, seed, count = 160, color = "rgba(22,22,21,.55)") {
    const rnd = mulberry32(seed);
    ctx.save();
    ctx.fillStyle = color;
    for (let i = 0; i < count; i++) {
        const x = rnd() * w, y = rnd() * h;
        ctx.beginPath();
        ctx.ellipse(x, y, 1 + rnd() * 5, .6 + rnd() * 2.4, rnd() * TAU, 0, TAU);
        ctx.fill();
    }
    ctx.restore();
}

function drawBrickWall(opts = {}) {
    const W = 1024, H = 1024;
    const rnd = mulberry32(opts.seed || 7);
    const col = canvas(W, H), bump = canvas(W, H);
    const c = col.getContext("2d");
    const b = bump.getContext("2d");
    const base = opts.base || [ 82, 76, 66 ];
    const mortar = opts.mortar || [ 31, 31, 29 ];
    c.fillStyle = `rgb(${mortar.join(",")})`;
    c.fillRect(0, 0, W, H);
    b.fillStyle = "#292929";
    b.fillRect(0, 0, W, H);
    const rowCount = opts.rowCount || 22;
    let heights = [];
    let sum = 0;
    for (let i = 0; i < rowCount; i++) {
        const v = .7 + rnd() * .65;
        heights.push(v);
        sum += v;
    }
    heights = heights.map(v => Math.round(v / sum * H));
    heights[heights.length - 1] += H - heights.reduce((a, n) => a + n, 0);
    let y = 0;
    for (let row = 0; row < rowCount; row++) {
        const rh = heights[row];
        let x = -rnd() * 150;
        const offset = (row % 2 ? 34 : -8) + rnd() * 22;
        x += offset;
        while (x < W) {
            const bw = 76 + rnd() * 78;
            const inset = 2.1 + rnd() * 1.7;
            const bx = x + inset, by = y + inset;
            const bh = rh - inset * 2;
            const shade = .74 + rnd() * .5;
            const warm = (rnd() - .5) * 9;
            const r = Math.max(18, Math.min(150, base[0] * shade + warm));
            const g = Math.max(17, Math.min(143, base[1] * shade + warm * .7));
            const bl = Math.max(16, Math.min(137, base[2] * shade + warm * .4));
            const grad = c.createLinearGradient(0, by, 0, by + bh);
            grad.addColorStop(0, `rgb(${r * 1.08 | 0},${g * 1.06 | 0},${bl * 1.03 | 0})`);
            grad.addColorStop(.14, `rgb(${r | 0},${g | 0},${bl | 0})`);
            grad.addColorStop(1, `rgb(${r * .76 | 0},${g * .76 | 0},${bl * .77 | 0})`);
            c.fillStyle = grad;
            c.fillRect(bx, by, bw - inset * 2, bh);
            c.fillStyle = `rgba(178,167,142,${.05 + rnd() * .075})`;
            c.fillRect(bx + 1, by + 1, bw - inset * 2 - 2, 1.1);
            const rn = mulberry32(row * 997 + Math.floor(x));
            for (let k = 0; k < 10; k++) {
                c.fillStyle = `rgba(${10 + rn() * 45},${10 + rn() * 42},${9 + rn() * 36},${.1 + rn() * .2})`;
                const px = bx + rn() * (bw - inset * 2);
                const py = by + rn() * bh;
                c.fillRect(px, py, .6 + rn() * 2.6, .5 + rn() * 1.6);
            }
            if (rnd() > .9) {
                c.strokeStyle = "rgba(18,16,14,.35)";
                c.lineWidth = .8 + rnd();
                c.beginPath();
                const cx0 = bx + rnd() * (bw - inset * 2);
                const cy0 = by + rnd() * bh;
                c.moveTo(cx0, cy0);
                c.lineTo(cx0 + (rnd() - .5) * 22, cy0 + rnd() * 8);
                c.lineTo(cx0 + (rnd() - .5) * 30, cy0 + 12 + rnd() * 10);
                c.stroke();
            }
            const bhTone = 138 + (rnd() - .5) * 42;
            b.fillStyle = `rgb(${bhTone | 0},${bhTone | 0},${bhTone | 0})`;
            b.fillRect(bx, by, bw - inset * 2, bh);
            b.strokeStyle = "rgba(62,62,62,.8)";
            b.lineWidth = 1.5;
            b.strokeRect(bx + .8, by + .8, bw - inset * 2 - 1.6, bh - 1.6);
            for (let k = 0; k < 9; k++) {
                b.fillStyle = `rgba(${50 + rnd() * 80 | 0},${50 + rnd() * 80 | 0},${50 + rnd() * 80 | 0},.35)`;
                b.beginPath();
                b.ellipse(bx + rnd() * bw, by + rnd() * bh, .5 + rnd() * 3, .5 + rnd() * 2, rnd() * TAU, 0, TAU);
                b.fill();
            }
            x += bw;
        }
        y += rh;
    }
    c.save();
    c.globalCompositeOperation = "screen";
    for (let i = 0; i < 38; i++) {
        const x = rnd() * W, yy = rnd() * H;
        const g = c.createRadialGradient(x, yy, 0, x, yy, 10 + rnd() * 35);
        g.addColorStop(0, `rgba(203,197,175,${.035 + rnd() * .055})`);
        g.addColorStop(1, "rgba(203,197,175,0)");
        c.fillStyle = g;
        c.fillRect(x - 60, yy - 60, 120, 120);
    }
    c.restore();
    radialDamp(c, W, H, 22, opts.seed + 44, "9,14,16", .27);
    verticalStreaks(c, W, H, opts.seed + 8, 42);
    chips(c, W, H, opts.seed + 3, 110, "rgba(15,15,14,.3)");
    grain(c, W, H, .055, opts.seed + 10, true);
    grain(b, W, H, .045, opts.seed + 12, false);
    return {
        color: col,
        bump: bump,
        roughness: (() => {
            const rc = canvas(W, H);
            const rg = rc.getContext("2d");
            rg.drawImage(col, 0, 0);
            rg.globalCompositeOperation = "saturation";
            rg.fillStyle = "#808080";
            rg.fillRect(0, 0, W, H);
            rg.globalCompositeOperation = "source-over";
            rg.globalCompositeOperation = "multiply";
            rg.fillStyle = "rgba(96,96,96,.72)";
            rg.fillRect(0, 0, W, H);
            rg.globalCompositeOperation = "source-over";
            grain(rg, W, H, .1, opts.seed + 14, false);
            return rc;
        })()
    };
}

function drawSlabFloor(opts = {}) {
    const W = 1024, H = 1024;
    const rnd = mulberry32(opts.seed || 11);
    const col = canvas(W, H), bump = canvas(W, H), rough = canvas(W, H);
    const c = col.getContext("2d");
    const b = bump.getContext("2d");
    const r = rough.getContext("2d");
    c.fillStyle = "#0c0d0b";
    c.fillRect(0, 0, W, H);
    b.fillStyle = "#242424";
    b.fillRect(0, 0, W, H);
    r.fillStyle = "#767676";
    r.fillRect(0, 0, W, H);
    const cols = 3, rows = 4;
    const cw = W / cols, ch = H / rows;
    for (let row = 0; row < rows; row++) {
        const offset = row % 2 * (cw * .32);
        for (let cc = -1; cc <= cols; cc++) {
            const x = cc * cw + offset;
            const y = row * ch;
            const px = x + 5, py = y + 5, pw = cw - 10, ph = ch - 10;
            const v = 30 + rnd() * 27;
            const warm = (rnd() - .35) * 13;
            const g = c.createLinearGradient(x, y, x + cw, y + ch);
            g.addColorStop(0, `rgb(${v + 8 + warm | 0},${v + 5 + warm * .45 | 0},${v + 1 | 0})`);
            g.addColorStop(.48, `rgb(${v + warm * .6 | 0},${v + 1 + warm * .2 | 0},${v - 2 | 0})`);
            g.addColorStop(1, `rgb(${v - 10 + warm * .4 | 0},${v - 8 | 0},${v - 7 | 0})`);
            c.fillStyle = g;
            if (row === rows - 1) c.fillRect(px, py, pw, ph + 5); else c.fillRect(px, py, pw, ph);
            c.strokeStyle = `rgba(46,45,40,${.1 + rnd() * .14})`;
            c.lineWidth = 1;
            c.strokeRect(px + 1.5, py + 1.5, pw - 3, ph - 3);
            for (let k = 0; k < 3; k++) {
                const corner = rnd() > .5 ? 1 : -1;
                c.fillStyle = `rgba(8,9,8,${.35 + rnd() * .3})`;
                c.beginPath();
                c.moveTo(corner > 0 ? px + pw : px, py + (rnd() > .5 ? 0 : ph));
                c.lineTo(px + (corner > 0 ? pw - 15 - rnd() * 35 : 8 + rnd() * 30), py + 2);
                c.lineTo(px + (corner > 0 ? pw - 4 : 2), py + 8 + rnd() * 24);
                c.closePath();
                c.fill();
            }
            for (let k = 0; k < 36; k++) {
                c.fillStyle = `rgba(${12 + rnd() * 55 | 0},${14 + rnd() * 55 | 0},${14 + rnd() * 50 | 0},${.15 + rnd() * .3})`;
                c.fillRect(px + rnd() * pw, py + rnd() * ph, .8 + rnd() * 5, .5 + rnd() * 2.4);
            }
            if (rnd() > .45) {
                c.strokeStyle = `rgba(10,12,12,${.22 + rnd() * .25})`;
                c.lineWidth = .8 + rnd() * 1.2;
                c.beginPath();
                let sx = px + rnd() * pw, sy = py + rnd() * ph;
                c.moveTo(sx, sy);
                for (let k = 0; k < 4; k++) {
                    sx += (rnd() - .5) * 90;
                    sy += 20 + rnd() * 50;
                    c.lineTo(sx, sy);
                }
                c.stroke();
            }
            const hv = 112 + rnd() * 48;
            b.fillStyle = `rgb(${hv | 0},${hv | 0},${hv | 0})`;
            b.fillRect(px, py, pw, ph + (row === rows - 1 ? 5 : 0));
            b.strokeStyle = "rgba(38,38,38,.8)";
            b.lineWidth = 2;
            b.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
            const rv = 110 + rnd() * 65;
            r.fillStyle = `rgb(${rv | 0},${rv | 0},${rv | 0})`;
            r.fillRect(px, py, pw, ph);
        }
    }
    c.save();
    for (let i = 0; i < 35; i++) {
        const x = rnd() * W, y = rnd() * H;
        c.strokeStyle = `rgba(130,134,128,${.018 + rnd() * .035})`;
        c.lineWidth = 1 + rnd() * 3;
        c.beginPath();
        c.ellipse(x, y, 15 + rnd() * 130, 8 + rnd() * 70, rnd() * TAU, 0, TAU);
        c.stroke();
    }
    c.restore();
    radialDamp(c, W, H, 30, 82, "5,9,11", .33);
    radialDamp(r, W, H, 28, 88, "25,25,25", .45);
    c.save();
    c.globalCompositeOperation = "screen";
    for (let i = 0; i < 10; i++) {
        const x = rnd() * W, y = rnd() * H;
        const gg = c.createRadialGradient(x, y, 0, x, y, 40 + rnd() * 180);
        gg.addColorStop(0, "rgba(117,115,103,.05)");
        gg.addColorStop(1, "rgba(117,115,103,0)");
        c.fillStyle = gg;
        c.fillRect(x - 220, y - 220, 440, 440);
    }
    c.restore();
    c.save();
    c.globalCompositeOperation = "multiply";
    for (let i = 0; i < 22; i++) {
        const x = rnd() * W, y = rnd() * H;
        const rad = 45 + rnd() * 240;
        const gg = c.createRadialGradient(x, y, 0, x, y, rad);
        const brown = 34 + rnd() * 26;
        gg.addColorStop(0, `rgba(${brown | 0},${brown * .92 | 0},${brown * .78 | 0},${.1 + rnd() * .22})`);
        gg.addColorStop(1, "rgba(255,255,255,0)");
        c.fillStyle = gg;
        c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    for (let i = 0; i < 7; i++) {
        const x = rnd() * W, y = rnd() * H;
        const rx = 50 + rnd() * 180, ry = 30 + rnd() * 130;
        const gg = c.createRadialGradient(x, y, 0, x, y, rx);
        gg.addColorStop(0, "rgba(7,11,10,.38)");
        gg.addColorStop(.7, "rgba(12,17,15,.18)");
        gg.addColorStop(1, "rgba(20,24,20,0)");
        c.save();
        c.translate(x, y);
        c.scale(1, ry / rx);
        c.fillStyle = gg;
        c.beginPath();
        c.arc(0, 0, rx, 0, TAU);
        c.fill();
        c.restore();
    }
    c.restore();
    c.save();
    c.globalCompositeOperation = "screen";
    for (let i = 0; i < 10; i++) {
        const x = rnd() * W, y = rnd() * H;
        const rad = 20 + rnd() * 80;
        const gg = c.createRadialGradient(x, y, 0, x, y, rad);
        gg.addColorStop(0, "rgba(126,124,104,.10)");
        gg.addColorStop(1, "rgba(126,124,104,0)");
        c.fillStyle = gg;
        c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    c.restore();
    grain(c, W, H, .06, 35, true);
    grain(b, W, H, .045, 33, false);
    return {
        color: col,
        bump: bump,
        roughness: rough
    };
}

function drawWood(opts = {}) {
    const W = 1024, H = 1024;
    const rnd = mulberry32(opts.seed || 51);
    const col = canvas(W, H), bump = canvas(W, H);
    const c = col.getContext("2d");
    const b = bump.getContext("2d");
    c.fillStyle = opts.dark ? "#2b2119" : "#44301f";
    c.fillRect(0, 0, W, H);
    b.fillStyle = "#777";
    b.fillRect(0, 0, W, H);
    const planks = 6;
    const pw = W / planks;
    for (let p = 0; p < planks; p++) {
        const x = p * pw;
        const shade = .7 + rnd() * .4;
        c.fillStyle = opts.dark ? `rgb(${38 * shade | 0},${30 * shade | 0},${23 * shade | 0})` : `rgb(${76 * shade | 0},${54 * shade | 0},${34 * shade | 0})`;
        c.fillRect(x + 1.5, 0, pw - 3, H);
        b.fillStyle = `rgb(${120 + rnd() * 45 | 0},${120 + rnd() * 45 | 0},${120 + rnd() * 45 | 0})`;
        b.fillRect(x + 2, 0, pw - 4, H);
        for (let k = 0; k < 42; k++) {
            const gy = rnd() * H;
            const amp = 2 + rnd() * 14;
            const alpha = .045 + rnd() * .13;
            c.strokeStyle = rnd() > .25 ? `rgba(20,13,8,${alpha})` : `rgba(177,145,101,${alpha * .5})`;
            c.lineWidth = .6 + rnd() * 2.6;
            c.beginPath();
            for (let sx = 0; sx <= pw; sx += 8) {
                const yy = gy + Math.sin(sx * (.018 + rnd() * .02) + k) * amp + Math.sin(sx * .07) * 1.4;
                if (sx === 0) c.moveTo(x + sx, yy); else c.lineTo(x + sx, yy);
            }
            c.stroke();
        }
        if (rnd() > .45) {
            const kx = x + 15 + rnd() * (pw - 30), ky = 60 + rnd() * (H - 120);
            for (let rr = 20; rr > 2; rr -= 4) {
                c.strokeStyle = `rgba(22,14,9,${.15 + (20 - rr) * .016})`;
                c.lineWidth = 1.2;
                c.beginPath();
                c.ellipse(kx, ky, rr * 1.7, rr * .46, .5 + rnd() * .4, 0, TAU);
                c.stroke();
            }
        }
        c.fillStyle = "rgba(15,10,7,.45)";
        c.fillRect(x, 0, 2.5, H);
        c.fillStyle = "rgba(195,165,120,.05)";
        c.fillRect(x + 3, 0, 1.4, H);
        for (let k = 0; k < 16; k++) {
            c.strokeStyle = `rgba(190,163,120,${.03 + rnd() * .1})`;
            c.lineWidth = .5 + rnd();
            const sx = x + rnd() * pw, sy = rnd() * H;
            c.beginPath();
            c.moveTo(sx, sy);
            c.lineTo(sx + (rnd() - .5) * 30, sy + (rnd() - .5) * 130);
            c.stroke();
        }
    }
    radialDamp(c, W, H, 18, 63, "8,6,4", .42);
    grain(c, W, H, .055, 19);
    grain(b, W, H, .05, 21);
    return {
        color: col,
        bump: bump
    };
}

function drawMetal(opts = {}) {
    const W = opts.size || 512;
    const rnd = mulberry32(opts.seed || 91);
    const col = canvas(W, W), rough = canvas(W, W);
    const c = col.getContext("2d");
    const r = rough.getContext("2d");
    const base = opts.base || "#202725";
    c.fillStyle = base;
    c.fillRect(0, 0, W, W);
    r.fillStyle = `rgb(${opts.roughBase || 125},${opts.roughBase || 125},${opts.roughBase || 125})`;
    r.fillRect(0, 0, W, W);
    for (let i = 0; i < 180; i++) {
        const x = rnd() * W, y = rnd() * W;
        const rad = 2 + rnd() * 40;
        const g = c.createRadialGradient(x, y, 0, x, y, rad);
        const v = rnd();
        if (opts.patina && v > .55) {
            g.addColorStop(0, `rgba(66,101,84,${.04 + rnd() * .12})`);
        } else {
            g.addColorStop(0, v > .5 ? `rgba(93,95,83,${.025 + rnd() * .08})` : `rgba(3,4,4,${.04 + rnd() * .12})`);
        }
        g.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = g;
        c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    for (let i = 0; i < 50; i++) {
        c.fillStyle = `rgba(3,5,5,${.025 + rnd() * .08})`;
        c.fillRect(rnd() * W, rnd() * W * .5, .5 + rnd() * 2, 10 + rnd() * W * .5);
    }
    for (let i = 0; i < 45; i++) {
        c.strokeStyle = rnd() > .5 ? `rgba(183,174,153,${.02 + rnd() * .06})` : `rgba(170,72,35,${.02 + rnd() * .05})`;
        c.lineWidth = .5 + rnd();
        c.beginPath();
        const x = rnd() * W, y = rnd() * W;
        c.moveTo(x, y);
        c.lineTo(x + (rnd() - .5) * 50, y + (rnd() - .5) * 6);
        c.stroke();
    }
    for (let i = 0; i < 90; i++) {
        const x = rnd() * W, y = rnd() * W;
        const rad = 1 + rnd() * 8;
        const g = r.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, `rgba(${rnd() > .5 ? 210 : 45},${rnd() > .5 ? 210 : 45},${rnd() > .5 ? 210 : 45},${.06 + rnd() * .18})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        r.fillStyle = g;
        r.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    grain(c, W, W, .055, opts.seed + 3);
    grain(r, W, W, .1, opts.seed + 9);
    return {
        color: col,
        roughness: rough
    };
}

function drawPerforatedPlate() {
    const W = 512, H = 512;
    const col = canvas(W, H);
    const c = col.getContext("2d");
    c.clearRect(0, 0, W, H);
    c.save();
    const rnd = mulberry32(5);
    c.fillStyle = "#252624";
    c.fillRect(0, 0, W, H);
    for (let i = 0; i < 150; i++) {
        c.fillStyle = `rgba(${70 + rnd() * 60 | 0},${45 + rnd() * 30 | 0},${26 + rnd() * 20 | 0},${rnd() * .1})`;
        c.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 10, 1 + rnd() * 6);
    }
    c.globalCompositeOperation = "destination-out";
    const cols = 11, rows = 6;
    for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
            const x = (i + .5) * W / cols + (j % 2 ? W / cols / 2 : 0);
            const y = (j + .5) * H / rows;
            const rx = W / cols * .27;
            const ry = H / rows * .34;
            c.beginPath();
            c.ellipse(x, y, rx, ry, 0, 0, TAU);
            c.fill();
        }
    }
    c.restore();
    c.strokeStyle = "rgba(155,148,127,.12)";
    c.lineWidth = 3;
    c.strokeRect(3, 3, W - 6, H - 6);
    return col;
}

function drawBlueprint() {
    const W = 2048, H = 1280;
    const col = canvas(W, H);
    const c = col.getContext("2d");
    const rnd = mulberry32(803);
    c.fillStyle = "#a3997f";
    c.fillRect(0, 0, W, H);
    for (let i = 0; i < 100; i++) {
        const x = rnd() * W, y = rnd() * H, rad = 25 + rnd() * 250;
        const g = c.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, rnd() > .4 ? `rgba(78,68,49,${.015 + rnd() * .035})` : `rgba(235,225,199,${.02 + rnd() * .04})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = g;
        c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    c.strokeStyle = "rgba(62,59,49,.58)";
    c.lineWidth = 2;
    c.strokeRect(44, 42, W - 88, H - 84);
    c.strokeStyle = "rgba(62,59,49,.24)";
    c.strokeRect(56, 54, W - 112, H - 108);
    c.save();
    c.strokeStyle = "rgba(74,81,74,.15)";
    c.lineWidth = 1;
    for (let x = 90; x < W - 80; x += 32) {
        c.beginPath();
        c.moveTo(x, 64);
        c.lineTo(x, H - 64);
        c.stroke();
    }
    for (let y = 90; y < H - 70; y += 32) {
        c.beginPath();
        c.moveTo(66, y);
        c.lineTo(W - 66, y);
        c.stroke();
    }
    c.strokeStyle = "rgba(57,65,59,.28)";
    c.lineWidth = 1.6;
    for (let x = 90; x < W - 80; x += 160) {
        c.beginPath();
        c.moveTo(x, 64);
        c.lineTo(x, H - 64);
        c.stroke();
    }
    for (let y = 90; y < H - 70; y += 160) {
        c.beginPath();
        c.moveTo(66, y);
        c.lineTo(W - 66, y);
        c.stroke();
    }
    c.restore();
    c.save();
    c.strokeStyle = "rgba(59,70,66,.52)";
    c.lineWidth = 26;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(105, 1160);
    c.bezierCurveTo(390, 1030, 400, 875, 675, 815);
    c.bezierCurveTo(980, 745, 1220, 790, 1510, 650);
    c.bezierCurveTo(1710, 553, 1810, 414, 1945, 380);
    c.stroke();
    c.strokeStyle = "rgba(173,166,143,.45)";
    c.lineWidth = 18;
    c.stroke();
    c.strokeStyle = "rgba(50,61,58,.55)";
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(105, 1144);
    c.bezierCurveTo(390, 1015, 395, 860, 672, 797);
    c.bezierCurveTo(980, 727, 1220, 772, 1512, 633);
    c.bezierCurveTo(1710, 537, 1810, 398, 1948, 365);
    c.stroke();
    c.restore();
    c.save();
    c.strokeStyle = "rgba(57,59,50,.46)";
    c.lineWidth = 1.1;
    const blocks = [ [ 180, 240, 320, 150, -.03 ], [ 520, 220, 250, 180, .02 ], [ 810, 280, 210, 120, -.04 ], [ 1110, 220, 300, 170, .03 ], [ 1470, 265, 220, 140, -.02 ], [ 1750, 300, 160, 120, .02 ], [ 150, 540, 270, 160, .01 ], [ 470, 500, 240, 150, -.03 ], [ 760, 520, 190, 95, .01 ], [ 1060, 490, 250, 140, -.02 ], [ 1410, 505, 230, 115, .04 ], [ 1735, 520, 170, 130, 0 ], [ 240, 850, 210, 120, .02 ], [ 520, 830, 300, 145, -.02 ], [ 900, 850, 210, 100, .03 ], [ 1250, 790, 230, 150, 0 ], [ 1580, 760, 200, 120, -.03 ], [ 1880, 770, 100, 160, .02 ] ];
    for (const [x, y, w, h, a] of blocks) {
        c.save();
        c.translate(x, y);
        c.rotate(a);
        c.strokeRect(0, 0, w, h);
        c.fillStyle = "rgba(68,68,57,.025)";
        c.fillRect(0, 0, w, h);
        for (let k = 0; k < 4; k++) {
            c.strokeStyle = `rgba(69,69,56,${.1 + rnd() * .14})`;
            c.strokeRect(8 + rnd() * (w - 40), 8 + rnd() * (h - 40), 12 + rnd() * (w * .35), 8 + rnd() * (h * .35));
        }
        c.restore();
    }
    c.strokeStyle = "rgba(54,58,51,.55)";
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(80, 465);
    c.bezierCurveTo(500, 490, 980, 420, 1980, 470);
    c.stroke();
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(760, 80);
    c.bezierCurveTo(720, 430, 790, 760, 750, 1230);
    c.stroke();
    c.beginPath();
    c.moveTo(1390, 80);
    c.bezierCurveTo(1350, 400, 1370, 820, 1320, 1240);
    c.stroke();
    c.restore();
    c.save();
    c.translate(310, 735);
    c.strokeStyle = "rgba(38,41,36,.92)";
    c.lineWidth = 3;
    c.beginPath();
    c.rect(0, 0, 590, 285);
    c.stroke();
    c.strokeStyle = "rgba(46,49,43,.55)";
    c.lineWidth = 1.5;
    c.beginPath();
    c.rect(30, 40, 210, 115);
    c.stroke();
    c.beginPath();
    c.rect(270, 40, 170, 115);
    c.stroke();
    c.beginPath();
    c.rect(68, 188, 300, 60);
    c.stroke();
    c.beginPath();
    c.rect(400, 195, 130, 52);
    c.stroke();
    c.restore();
    c.save();
    c.setLineDash([ 8, 9 ]);
    c.strokeStyle = "rgba(96,62,48,.62)";
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(650, 960);
    c.bezierCurveTo(850, 890, 940, 950, 1120, 835);
    c.bezierCurveTo(1300, 720, 1520, 735, 1780, 610);
    c.stroke();
    c.strokeStyle = "rgba(70,72,63,.55)";
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(350, 610);
    c.bezierCurveTo(650, 660, 860, 700, 1050, 650);
    c.stroke();
    c.restore();
    c.strokeStyle = "rgba(57,59,51,.42)";
    c.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
        const y = 1080 + i * 42;
        c.beginPath();
        c.moveTo(160, y);
        c.lineTo(820 + i * 220, y);
        c.stroke();
        c.beginPath();
        c.moveTo(160, y - 8);
        c.lineTo(160, y + 8);
        c.stroke();
        c.beginPath();
        c.moveTo(820 + i * 220, y - 8);
        c.lineTo(820 + i * 220, y + 8);
        c.stroke();
        c.font = '17px "Courier New", monospace';
        c.fillStyle = "rgba(57,59,51,.55)";
        c.fillText(`Scale 1:${400 + i * 100}`, 430, y - 10);
    }
    c.strokeStyle = "rgba(54,58,51,.75)";
    c.lineWidth = 2;
    c.strokeRect(1448, 995, 494, 206);
    c.font = "600 27px Georgia, serif";
    c.fillStyle = "rgba(38,41,36,.9)";
    c.fillText("RIVERDALE MUNICIPAL WATERWORKS", 1468, 1035);
    c.font = '18px "Courier New", monospace';
    c.fillStyle = "rgba(40,45,40,.78)";
    c.fillText("PLAN OF SUPPLY MAINS & WORKS", 1468, 1066);
    c.fillText("SURVEYED 1896   ·   REVISED 1926", 1468, 1103);
    c.fillText("SHEET 03 / 12     ENGINEER: W. H. MERCER", 1468, 1132);
    c.strokeStyle = "rgba(54,58,51,.35)";
    c.beginPath();
    c.moveTo(1468, 1080);
    c.lineTo(1922, 1080);
    c.stroke();
    c.save();
    c.translate(1880, 850);
    c.strokeStyle = "rgba(51,55,48,.6)";
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(0, 0, 45, 0, TAU);
    c.stroke();
    c.beginPath();
    c.moveTo(0, -58);
    c.lineTo(14, 20);
    c.lineTo(0, 9);
    c.lineTo(-14, 20);
    c.closePath();
    c.fillStyle = "rgba(51,55,48,.45)";
    c.fill();
    c.stroke();
    c.font = "20px Georgia, serif";
    c.fillStyle = "rgba(51,55,48,.65)";
    c.fillText("N", -7, -7);
    c.restore();
    c.save();
    c.globalCompositeOperation = "multiply";
    for (let i = 0; i < 38; i++) {
        const x = rnd() * W, y = rnd() * H;
        const rx = 18 + rnd() * 180, ry = 10 + rnd() * 110;
        const g = c.createRadialGradient(x, y, 0, x, y, rx);
        g.addColorStop(0, `rgba(97,83,58,${.03 + rnd() * .08})`);
        g.addColorStop(1, "rgba(255,255,255,0)");
        c.fillStyle = g;
        c.save();
        c.translate(x, y);
        c.scale(1, ry / rx);
        c.fillRect(-rx, -rx, rx * 2, rx * 2);
        c.restore();
    }
    c.globalCompositeOperation = "screen";
    for (let i = 0; i < 10; i++) {
        c.fillStyle = "rgba(225,215,189,.055)";
        c.fillRect(rnd() * W, 0, 10 + rnd() * 40, H);
    }
    c.restore();
    c.strokeStyle = "rgba(70,63,48,.22)";
    c.lineWidth = 2.2;
    for (let i = 1; i < 4; i++) {
        c.beginPath();
        c.moveTo(i * W / 4, 0);
        c.lineTo(i * W / 4, H);
        c.stroke();
    }
    for (let i = 1; i < 3; i++) {
        c.beginPath();
        c.moveTo(0, i * H / 3);
        c.lineTo(W, i * H / 3);
        c.stroke();
    }
    c.save();
    c.globalCompositeOperation = "destination-out";
    c.beginPath();
    c.moveTo(0, H);
    c.lineTo(0, H - 110);
    c.lineTo(38, H - 134);
    c.lineTo(75, H - 116);
    c.lineTo(114, H - 146);
    c.lineTo(146, H - 122);
    c.lineTo(180, H - 155);
    c.lineTo(220, H - 131);
    c.lineTo(240, H);
    c.closePath();
    c.fill();
    c.restore();
    c.save();
    c.lineCap = "round";
    c.lineJoin = "round";
    c.strokeStyle = "rgba(38,41,35,.82)";
    c.lineWidth = 11;
    c.strokeRect(58, 54, W - 116, H - 108);
    c.strokeStyle = "rgba(38,41,35,.42)";
    c.lineWidth = 4;
    c.strokeRect(84, 78, W - 168, H - 156);
    c.strokeStyle = "rgba(43,53,49,.82)";
    c.lineWidth = 70;
    c.beginPath();
    c.moveTo(96, 1170);
    c.bezierCurveTo(390, 1030, 420, 885, 690, 815);
    c.bezierCurveTo(980, 745, 1220, 790, 1510, 650);
    c.bezierCurveTo(1710, 553, 1810, 414, 1950, 380);
    c.stroke();
    c.strokeStyle = "rgba(169,158,132,.55)";
    c.lineWidth = 42;
    c.stroke();
    c.strokeStyle = "rgba(44,47,39,.78)";
    c.lineWidth = 18;
    c.beginPath();
    c.moveTo(78, 465);
    c.bezierCurveTo(500, 490, 980, 420, 1980, 470);
    c.stroke();
    c.lineWidth = 8;
    c.beginPath();
    c.moveTo(760, 80);
    c.bezierCurveTo(720, 430, 790, 760, 750, 1230);
    c.stroke();
    c.beginPath();
    c.moveTo(1390, 80);
    c.bezierCurveTo(1350, 400, 1370, 820, 1320, 1240);
    c.stroke();
    c.strokeStyle = "rgba(34,37,32,.90)";
    c.lineWidth = 10;
    c.strokeRect(310, 735, 590, 285);
    c.lineWidth = 6;
    c.strokeRect(340, 775, 210, 115);
    c.strokeRect(580, 775, 170, 115);
    c.strokeRect(378, 923, 300, 60);
    c.strokeRect(710, 930, 130, 52);
    c.strokeStyle = "rgba(92,57,42,.74)";
    c.lineWidth = 10;
    c.setLineDash([ 17, 16 ]);
    c.beginPath();
    c.moveTo(650, 960);
    c.bezierCurveTo(850, 890, 940, 950, 1120, 835);
    c.bezierCurveTo(1300, 720, 1520, 735, 1780, 610);
    c.stroke();
    c.setLineDash([]);
    c.strokeStyle = "rgba(44,46,38,.64)";
    c.lineWidth = 10;
    for (const [bx, by, bw, bh] of [ [ 180, 240, 320, 150 ], [ 520, 220, 250, 180 ], [ 810, 280, 210, 120 ], [ 1110, 220, 300, 170 ], [ 1470, 265, 220, 140 ], [ 150, 540, 270, 160 ], [ 470, 500, 240, 150 ], [ 1060, 490, 250, 140 ], [ 1410, 505, 230, 115 ], [ 240, 850, 210, 120 ], [ 520, 830, 300, 145 ], [ 1250, 790, 230, 150 ] ]) {
        c.strokeRect(bx, by, bw, bh);
    }
    c.save();
    c.translate(690, 292);
    c.rotate(-.006);
    c.font = "600 92px Georgia, serif";
    c.fillStyle = "rgba(34,38,32,.88)";
    c.fillText("RIVERDALE WATERWORKS", 0, 0);
    c.font = '600 42px "Courier New", monospace';
    c.fillStyle = "rgba(39,44,37,.76)";
    c.fillText("PLAN OF THE MUNICIPAL SUPPLY  ·  1896", 12, 58);
    c.restore();
    c.font = "600 31px Georgia, serif";
    c.fillStyle = "rgba(35,38,32,.82)";
    c.fillText("SETTLING BASIN No. 1", 366, 855);
    c.fillText("FILTER BEDS", 600, 855);
    c.font = "600 27px Georgia, serif";
    c.fillText("ENGINE HOUSE", 392, 990);
    c.fillText("BOILER HOUSE", 726, 990);
    c.font = '600 29px "Courier New", monospace';
    c.fillStyle = "rgba(37,41,35,.72)";
    c.fillText("SUPPLY MAIN  18in.", 1160, 660);
    c.restore();
    grain(c, W, H, .05, 68);
    {
        const img = c.getImageData(0, 0, W, H);
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) {
            if (d[i + 3] === 0) continue;
            for (let k = 0; k < 3; k++) {
                const v = d[i + k];
                d[i + k] = Math.max(0, Math.min(255, 150 + (v - 150) * 1.42));
            }
        }
        c.putImageData(img, 0, 0);
    }
    return col;
}

function drawSpaced(ctx, text, x, y, spacing) {
    let px = x;
    for (const ch of text) {
        ctx.fillText(ch, px, y);
        px += ctx.measureText(ch).width + spacing;
    }
}

function drawPlaque() {
    const W = 900, H = 1200;
    const col = canvas(W, H);
    const c = col.getContext("2d");
    const rnd = mulberry32(44);
    c.fillStyle = "#222321";
    c.fillRect(0, 0, W, H);
    const g = c.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "rgba(95,96,85,.16)");
    g.addColorStop(.45, "rgba(9,10,9,.15)");
    g.addColorStop(1, "rgba(100,95,79,.13)");
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    for (let i = 0; i < 160; i++) {
        c.fillStyle = rnd() > .5 ? `rgba(145,136,113,${.01 + rnd() * .035})` : `rgba(0,0,0,${.03 + rnd() * .08})`;
        c.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 8, 1 + rnd() * 8);
    }
    c.strokeStyle = "rgba(170,157,126,.48)";
    c.lineWidth = 7;
    c.strokeRect(38, 38, W - 76, H - 76);
    c.strokeStyle = "rgba(15,15,13,.8)";
    c.lineWidth = 3;
    c.strokeRect(51, 51, W - 102, H - 102);
    c.fillStyle = "rgba(195,184,156,.74)";
    c.textAlign = "center";
    c.font = "600 44px Georgia, serif";
    drawSpacedCentered(c, "CITY OF RIVERDALE", W / 2, 176, 5);
    c.font = "600 31px Georgia, serif";
    c.fillStyle = "rgba(191,181,154,.66)";
    drawSpacedCentered(c, "WATER SUPPLY", W / 2, 238, 7);
    c.font = "500 42px Georgia, serif";
    c.fillStyle = "rgba(198,187,159,.8)";
    drawSpacedCentered(c, "PUMPING STATION", W / 2, 345, 4);
    c.strokeStyle = "rgba(178,166,137,.34)";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(170, 390);
    c.lineTo(W - 170, 390);
    c.stroke();
    c.font = '24px "Courier New", monospace';
    c.fillStyle = "rgba(186,176,151,.58)";
    c.fillText("ERECTED 1897", W / 2, 468);
    c.fillText("REBUILT 1926", W / 2, 511);
    c.save();
    c.translate(W / 2, 700);
    c.strokeStyle = "rgba(178,166,137,.36)";
    c.lineWidth = 3;
    c.beginPath();
    c.arc(0, 0, 94, 0, TAU);
    c.stroke();
    c.beginPath();
    c.arc(0, 0, 78, 0, TAU);
    c.stroke();
    c.fillStyle = "rgba(178,166,137,.28)";
    c.beginPath();
    c.moveTo(-52, 18);
    c.bezierCurveTo(-20, -40, -13, -26, 2, -57);
    c.bezierCurveTo(14, -26, 29, -40, 54, 18);
    c.bezierCurveTo(24, 6, 16, 31, 0, 42);
    c.bezierCurveTo(-15, 28, -25, 8, -52, 18);
    c.fill();
    c.fillStyle = "rgba(178,166,137,.5)";
    c.font = "22px Georgia, serif";
    c.fillText("AQUA · VITA", 0, 68);
    c.restore();
    c.font = '18px "Courier New", monospace';
    c.fillStyle = "rgba(184,174,150,.42)";
    drawSpacedCentered(c, "MUNICIPAL ENGINEER · W. H. MERCER", W / 2, 975, 3);
    drawSpacedCentered(c, "RIVERDALE · YORKSHIRE", W / 2, 1018, 3);
    for (const [x, y] of [ [ 78, 78 ], [ W - 78, 78 ], [ 78, H - 78 ], [ W - 78, H - 78 ] ]) {
        c.fillStyle = "rgba(8,8,7,.8)";
        c.beginPath();
        c.arc(x, y, 16, 0, TAU);
        c.fill();
        c.fillStyle = "rgba(149,137,109,.47)";
        c.beginPath();
        c.arc(x - 2, y - 3, 9, 0, TAU);
        c.fill();
        c.fillStyle = "rgba(38,35,28,.75)";
        c.fillRect(x - 7, y - 1, 14, 2.5);
    }
    radialDamp(c, W, H, 15, 212, "9,8,6", .22);
    grain(c, W, H, .055, 91);
    return col;
}

function drawSpacedCentered(ctx, text, cx, y, spacing) {
    let total = 0;
    for (const ch of text) total += ctx.measureText(ch).width + spacing;
    total -= spacing;
    let x = cx - total / 2;
    for (const ch of text) {
        ctx.fillText(ch, x + ctx.measureText(ch).width / 2, y);
        x += ctx.measureText(ch).width + spacing;
    }
}

function drawWindowGlass() {
    const W = 768, H = 1536;
    const col = canvas(W, H);
    const c = col.getContext("2d");
    const rnd = mulberry32(191);
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#e6eef0");
    g.addColorStop(.34, "#d8e4e7");
    g.addColorStop(.72, "#b4c5c9");
    g.addColorStop(1, "#879aa0");
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    for (let i = 0; i < 55; i++) {
        const x = rnd() * W, y = rnd() * H;
        const rx = 50 + rnd() * 320;
        const ry = 20 + rnd() * 220;
        const gg = c.createRadialGradient(x, y, 0, x, y, rx);
        gg.addColorStop(0, `rgba(${222 + rnd() * 24 | 0},${231 + rnd() * 18 | 0},${234 + rnd() * 16 | 0},${.02 + rnd() * .09})`);
        gg.addColorStop(1, "rgba(255,255,255,0)");
        c.save();
        c.translate(x, y);
        c.scale(1, ry / rx);
        c.fillStyle = gg;
        c.fillRect(-rx, -rx, rx * 2, rx * 2);
        c.restore();
    }
    c.save();
    c.globalAlpha = .2;
    c.fillStyle = "#637477";
    for (let i = 0; i < 20; i++) {
        const x = rnd() * W;
        const base = H * (.72 + rnd() * .12);
        const tw = 6 + rnd() * 20;
        c.fillRect(x, base - 90 - rnd() * 130, tw, 210);
        c.beginPath();
        c.ellipse(x + tw / 2, base - 230 - rnd() * 70, 25 + rnd() * 70, 20 + rnd() * 42, rnd(), 0, TAU);
        c.fill();
    }
    c.fillStyle = "#69787a";
    c.fillRect(0, H * .82, W, H * .18);
    for (let i = 0; i < 5; i++) {
        const x = i * W / 5 + 20 + rnd() * 40;
        c.fillRect(x, H * .76 - 20 - rnd() * 80, 70 + rnd() * 50, 260);
        c.beginPath();
        c.moveTo(x, H * .76 - 20 - rnd() * 80);
        c.lineTo(x + 40, H * .75 - 100 - rnd() * 50);
        c.lineTo(x + 100, H * .76 - 20);
        c.fill();
    }
    c.restore();
    c.save();
    for (let i = 0; i < 380; i++) {
        c.strokeStyle = `rgba(234,242,244,${.012 + rnd() * .03})`;
        c.lineWidth = .5 + rnd() * 1.6;
        c.beginPath();
        c.arc(rnd() * W, rnd() * H, 4 + rnd() * 55, rnd() * TAU, rnd() * TAU);
        c.stroke();
    }
    c.restore();
    for (let i = 0; i < 70; i++) {
        c.fillStyle = `rgba(91,111,115,${.01 + rnd() * .04})`;
        c.fillRect(rnd() * W, rnd() * H * .6, 1 + rnd() * 4, 20 + rnd() * 400);
    }
    c.strokeStyle = "rgba(32,40,39,.82)";
    c.lineWidth = 4;
    const cols = 8;
    for (let i = 1; i < cols; i++) {
        const x = W / cols * i;
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x, H);
        c.stroke();
    }
    const rowH = H / 20;
    for (let j = 1; j < 20; j++) {
        c.strokeStyle = "rgba(35,43,42,.62)";
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(0, j * rowH);
        c.lineTo(W, j * rowH);
        c.stroke();
    }
    c.strokeStyle = "rgba(36,44,43,.28)";
    c.lineWidth = 1.2;
    for (let j = 0; j < 16; j++) {
        for (let i = 0; i < 8; i++) {
            c.beginPath();
            c.moveTo(i * W / 8 + rnd() * 20, j * rowH);
            c.lineTo(i * W / 8 + W / 8 - rnd() * 20, (j + 1) * rowH);
            c.stroke();
        }
    }
    c.strokeStyle = "rgba(49,56,54,.34)";
    c.lineWidth = 2.5;
    for (let i = 0; i < 4; i++) {
        c.beginPath();
        c.moveTo(W * (.14 + i * .23), H * .28);
        c.quadraticCurveTo(W * (.2 + i * .23), H * .09, W * (.255 + i * .23), H * .03);
        c.stroke();
    }
    c.save();
    c.globalCompositeOperation = "multiply";
    for (let i = 0; i < 8; i++) {
        c.fillStyle = `rgba(73,81,78,${.05 + rnd() * .08})`;
        c.beginPath();
        c.ellipse(rnd() * W, rnd() < .5 ? 0 : H, 60 + rnd() * 160, 40 + rnd() * 120, 0, 0, TAU);
        c.fill();
    }
    c.restore();
    grain(c, W, H, .035, 441);
    return col;
}

function drawGaugeFace() {
    const S = 512;
    const col = canvas(S, S);
    const c = col.getContext("2d");
    c.fillStyle = "#d7d0b7";
    c.beginPath();
    c.arc(S / 2, S / 2, S / 2 - 6, 0, TAU);
    c.fill();
    c.strokeStyle = "#3a352b";
    c.lineWidth = 14;
    c.beginPath();
    c.arc(S / 2, S / 2, S / 2 - 13, 0, TAU);
    c.stroke();
    c.strokeStyle = "#6d6250";
    c.lineWidth = 4;
    c.beginPath();
    c.arc(S / 2, S / 2, S / 2 - 40, 0, TAU);
    c.stroke();
    c.save();
    c.translate(S / 2, S / 2);
    for (let i = 0; i <= 50; i++) {
        const a = -Math.PI * 1.22 + i / 50 * Math.PI * 1.44;
        const long = i % 5 === 0;
        c.strokeStyle = "#3b372e";
        c.lineWidth = long ? 5 : 2;
        c.beginPath();
        c.moveTo(Math.cos(a) * (S / 2 - 58), Math.sin(a) * (S / 2 - 58));
        c.lineTo(Math.cos(a) * (S / 2 - (long ? 94 : 76)), Math.sin(a) * (S / 2 - (long ? 94 : 76)));
        c.stroke();
        if (long) {
            c.save();
            c.rotate(a);
            c.font = "600 26px Georgia, serif";
            c.fillStyle = "#443e33";
            c.textAlign = "center";
            c.fillText(String(i * 2), S / 2 - 112, 9);
            c.restore();
        }
    }
    c.font = "600 30px Georgia, serif";
    c.fillStyle = "#4a4438";
    c.textAlign = "center";
    c.fillText("lb / in²", 0, -95);
    c.font = '18px "Courier New", monospace';
    c.fillText("RIVERDALE · 1897", 0, 145);
    c.restore();
    const rnd = mulberry32(67);
    radialDamp(c, S, S, 7, 77, "40,35,24", .2);
    c.strokeStyle = "rgba(50,45,35,.22)";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(330, 77);
    c.lineTo(350, 112);
    c.lineTo(335, 130);
    c.lineTo(352, 158);
    c.stroke();
    return col;
}

function drawAgedLabel(text, opts = {}) {
    const W = 512, H = 256;
    const col = canvas(W, H);
    const c = col.getContext("2d");
    c.fillStyle = opts.background || "#202420";
    c.fillRect(0, 0, W, H);
    c.strokeStyle = opts.border || "rgba(184,165,115,.45)";
    c.lineWidth = 5;
    c.strokeRect(12, 12, W - 24, H - 24);
    c.fillStyle = opts.ink || "rgba(213,198,161,.85)";
    c.textAlign = "center";
    c.font = opts.font || "600 44px Georgia, serif";
    const lines = text.split("\n");
    lines.forEach((line, i) => c.fillText(line, W / 2, H / 2 + (i - (lines.length - 1) / 2) * 55));
    const rnd = mulberry32(123);
    for (let i = 0; i < 80; i++) {
        c.fillStyle = `rgba(8,8,7,${.03 + rnd() * .08})`;
        c.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 7, 1 + rnd() * 3);
    }
    return col;
}

function drawNoise(color = false) {
    const S = 512;
    const col = canvas(S, S);
    const c = col.getContext("2d");
    const img = c.createImageData(S, S);
    for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
            const v = fbm(x / 70, y / 70, 5, 39) * .7 + fbm(x / 18, y / 18, 3, 91) * .3;
            const i = (y * S + x) * 4;
            if (color) {
                img.data[i] = 22 + v * 55;
                img.data[i + 1] = 29 + v * 58;
                img.data[i + 2] = 34 + v * 62;
            } else {
                img.data[i] = img.data[i + 1] = img.data[i + 2] = v * 255;
            }
            img.data[i + 3] = 255;
        }
    }
    c.putImageData(img, 0, 0);
    return col;
}

function drawWaterMask() {
    const S = 512;
    const col = canvas(S, S);
    const c = col.getContext("2d");
    const img = c.createImageData(S, S);
    for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
            const low = fbm(x / 90, y / 90, 4, 6);
            const high = fbm(x / 24, y / 24, 3, 18);
            const v = Math.min(1, Math.max(0, (low - .27) * 2.2 + high * .35));
            const i = (y * S + x) * 4;
            const g = 35 + Math.pow(v, .7) * 215;
            img.data[i] = img.data[i + 1] = img.data[i + 2] = g;
            img.data[i + 3] = 255;
        }
    }
    c.putImageData(img, 0, 0);
    radialDamp(c, S, S, 20, 29, "8,8,8", .34);
    c.strokeStyle = "rgba(25,25,25,.22)";
    c.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
        c.beginPath();
        c.moveTo(0, i * 70 + 20);
        c.bezierCurveTo(S * .3, i * 70 + 80, S * .7, i * 70 - 20, S, i * 70 + 50);
        c.stroke();
    }
    grain(c, S, S, .12, 5);
    return col;
}

function drawPuddleMap() {
    const W = 512, H = 1024;
    const cv = canvas(W, H);
    const c = cv.getContext("2d");
    const img = c.createImageData(W, H);
    const ss = (a, b, x) => {
        const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
        return t * t * (3 - 2 * t);
    };
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const u = x / (W - 1), v = y / (H - 1);
            const n1 = fbm(x / 54, y / 82, 4, 31);
            const n2 = fbm(x / 140, y / 210, 3, 77);
            const n3 = fbm(x / 22, y / 33, 3, 53);
            const cx = u - .5 + Math.sin(v * 6) * .035;
            const center = Math.exp(-(cx * cx) / (2 * .24 * .24));
            let film = .18 + .34 * center + .22 * n2 + .08 * n3;
            const edge = ss(.015, .1, u) * ss(.985, .9, u);
            film *= .5 + .5 * edge;
            let p = ss(.5, .68, n1 * .55 + n2 * .35 + n3 * .1 + center * .18);
            const pool1 = Math.exp(-(Math.pow((u - .47) / .26, 2) / 2 + Math.pow((v - .43) / .27, 2) / 2));
            p = Math.max(p, pool1 * ss(.34, .6, n2 * .6 + n3 * .4));
            const pool2 = Math.exp(-(Math.pow((u - .62) / .2, 2) / 2 + Math.pow((v - .72) / .18, 2) / 2));
            p = Math.max(p, pool2 * ss(.4, .66, n1 * .5 + n2 * .5));
            const pool3 = Math.exp(-(Math.pow((u - .38) / .16, 2) / 2 + Math.pow((v - .18) / .14, 2) / 2));
            p = Math.max(p, pool3 * ss(.35, .62, n3));
            const runnel = Math.exp(-Math.pow((u - .51 + Math.sin(v * 10) * .02) / .06, 2)) * ss(.1, .3, v);
            p = Math.max(p, runnel * .62);
            const dry = ss(.56, .68, fbm(x / 31, y / 47, 4, 101));
            p *= 1 - .55 * dry;
            p *= .35 + .65 * edge;
            p *= ss(0, .03, v) * ss(1, .97, v);
            film = Math.max(0, Math.min(1, film));
            p = Math.max(0, Math.min(1, p));
            const i = (y * W + x) * 4;
            img.data[i] = film * 255;
            img.data[i + 1] = p * 255;
            img.data[i + 2] = n3 * 255;
            img.data[i + 3] = 255;
        }
    }
    c.putImageData(img, 0, 0);
    return cv;
}

function drawGlow() {
    const S = 256;
    const cv = canvas(S, S);
    const c = cv.getContext("2d");
    const g = c.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, "rgba(255,247,221,1)");
    g.addColorStop(.08, "rgba(255,236,188,.90)");
    g.addColorStop(.28, "rgba(255,190,105,.25)");
    g.addColorStop(.62, "rgba(255,160,70,.055)");
    g.addColorStop(1, "rgba(255,160,70,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, S, S);
    return cv;
}

function drawMist() {
    const S = 256;
    const cv = canvas(S, S);
    const c = cv.getContext("2d");
    const img = c.createImageData(S, S);
    for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
            const nx = x / S - .5, ny = y / S - .5;
            const rad = Math.sqrt(nx * nx + ny * ny) * 2;
            const n = fbm(x / 42, y / 42, 4, 24);
            const a = Math.max(0, 1 - rad) * (.35 + n * .65);
            const i = (y * S + x) * 4;
            img.data[i] = 203;
            img.data[i + 1] = 218;
            img.data[i + 2] = 222;
            img.data[i + 3] = Math.min(255, a * 255 * .55);
        }
    }
    c.putImageData(img, 0, 0);
    return cv;
}

function drawDampStain() {
    const S = 512;
    const cv = canvas(S, S);
    const c = cv.getContext("2d");
    const img = c.createImageData(S, S);
    for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
            const broad = fbm(x / 130, y / 95, 4, 21);
            const runnel = fbm(x / 26, y / 190, 4, 73);
            const fine = fbm(x / 9, y / 38, 3, 17);
            let a = broad * .62 + runnel * .52 + fine * .18 - .58;
            a = Math.max(0, Math.min(1, a * 2.8));
            const edgeX = Math.min(1, x / 44, (S - 1 - x) / 44);
            const edgeY = Math.min(1, y / 32, (S - 1 - y) / 32);
            a *= Math.max(0, Math.min(1, edgeX)) * Math.max(0, Math.min(1, edgeY));
            const i = (y * S + x) * 4;
            img.data[i] = 31 + fine * 16;
            img.data[i + 1] = 36 + fine * 16;
            img.data[i + 2] = 30 + fine * 12;
            img.data[i + 3] = Math.round(a * 235);
        }
    }
    c.putImageData(img, 0, 0);
    return cv;
}

function drawDust() {
    const S = 64;
    const cv = canvas(S, S);
    const c = cv.getContext("2d");
    const g = c.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, "rgba(255,255,255,.92)");
    g.addColorStop(.3, "rgba(255,255,255,.5)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, S, S);
    return cv;
}

function drawEnvironment() {
    const W = 1024, H = 512;
    const col = canvas(W, H);
    const c = col.getContext("2d");
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#05080b");
    g.addColorStop(.28, "#172026");
    g.addColorStop(.5, "#4b5d64");
    g.addColorStop(.56, "#1b2326");
    g.addColorStop(1, "#050505");
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    const rnd = mulberry32(90);
    for (let i = 0; i < 8; i++) {
        const x = rnd() * W;
        const w = 18 + rnd() * 60;
        const gg = c.createLinearGradient(0, H * .18, 0, H * .7);
        gg.addColorStop(0, "rgba(162,193,209,0)");
        gg.addColorStop(.3, "rgba(175,207,220,.16)");
        gg.addColorStop(.7, "rgba(128,158,173,.08)");
        gg.addColorStop(1, "rgba(128,158,173,0)");
        c.fillStyle = gg;
        c.fillRect(x, H * .15, w, H * .58);
    }
    const warm = c.createRadialGradient(W * .81, H * .46, 0, W * .81, H * .46, 120);
    warm.addColorStop(0, "rgba(255,177,94,.28)");
    warm.addColorStop(1, "rgba(255,177,94,0)");
    c.fillStyle = warm;
    c.fillRect(0, 0, W, H);
    return col;
}

export function createTextureLibrary(renderer) {
    const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 4);
    const aniso = maxAniso;
    const wall = drawBrickWall({
        seed: 7,
        base: [ 99, 91, 78 ],
        rowCount: 22
    });
    const wallFar = drawBrickWall({
        seed: 13,
        base: [ 92, 87, 78 ],
        rowCount: 24
    });
    const ashlar = drawBrickWall({
        seed: 21,
        base: [ 112, 107, 96 ],
        rowCount: 12
    });
    const floor = drawSlabFloor({
        seed: 11
    });
    const wood = drawWood({
        seed: 51
    });
    const woodDark = drawWood({
        seed: 73,
        dark: true
    });
    const iron = drawMetal({
        seed: 91,
        base: "#1d2220",
        roughBase: 138
    });
    const greenIron = drawMetal({
        seed: 41,
        base: "#1c2823",
        roughBase: 106,
        patina: true
    });
    const copper = drawMetal({
        seed: 61,
        base: "#5f3d24",
        roughBase: 94,
        patina: true
    });
    const brass = drawMetal({
        seed: 71,
        base: "#69532e",
        roughBase: 102
    });
    const perforated = drawPerforatedPlate();
    const blueprint = drawBlueprint();
    const plaque = drawPlaque();
    const windowGlass = drawWindowGlass();
    const gauge = drawGaugeFace();
    const noise = drawNoise(false);
    const waterMask = drawWaterMask();
    const glow = drawGlow();
    const mist = drawMist();
    const dust = drawDust();
    const damp = drawDampStain();
    const puddles = drawPuddleMap();
    const environment = drawEnvironment();
    const make = (cnv, srgb = true) => textureFrom(cnv, {
        srgb: srgb,
        anisotropy: aniso
    });
    const wallMap = make(wall.color);
    wallMap.repeat.set(5.2, 3.5);
    const wallBump = make(wall.bump, false);
    wallBump.repeat.copy(wallMap.repeat);
    const wallRough = make(wall.roughness, false);
    wallRough.repeat.copy(wallMap.repeat);
    const wallFarMap = make(wallFar.color);
    const wallFarBump = make(wallFar.bump, false);
    const wallFarRough = make(wallFar.roughness, false);
    const ashlarMap = make(ashlar.color);
    ashlarMap.repeat.set(1.4, 3.2);
    const ashlarBump = make(ashlar.bump, false);
    ashlarBump.repeat.copy(ashlarMap.repeat);
    const ashlarRough = make(ashlar.roughness, false);
    ashlarRough.repeat.copy(ashlarMap.repeat);
    const floorMap = make(floor.color);
    floorMap.repeat.set(2.4, 4.1);
    const floorBump = make(floor.bump, false);
    floorBump.repeat.copy(floorMap.repeat);
    const floorRough = make(floor.roughness, false);
    floorRough.repeat.copy(floorMap.repeat);
    const woodMap = make(wood.color);
    woodMap.repeat.set(1.2, 1.5);
    const woodBump = make(wood.bump, false);
    woodBump.repeat.copy(woodMap.repeat);
    const woodDarkMap = make(woodDark.color);
    const woodDarkBump = make(woodDark.bump, false);
    const ironMap = make(iron.color);
    const ironRough = make(iron.roughness, false);
    const greenIronMap = make(greenIron.color);
    const greenIronRough = make(greenIron.roughness, false);
    const copperMap = make(copper.color);
    const copperRough = make(copper.roughness, false);
    const brassMap = make(brass.color);
    const brassRough = make(brass.roughness, false);
    const perforatedTex = make(perforated);
    perforatedTex.wrapS = perforatedTex.wrapT = THREE.ClampToEdgeWrapping;
    perforatedTex.generateMipmaps = false;
    perforatedTex.minFilter = THREE.LinearFilter;
    perforatedTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const blueprintTex = make(blueprint);
    blueprintTex.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
    const plaqueTex = make(plaque);
    const glassTex = make(windowGlass);
    const gaugeTex = make(gauge);
    const noiseTex = make(noise, false);
    noiseTex.wrapS = noiseTex.wrapT = THREE.RepeatWrapping;
    const waterMaskTex = make(waterMask, false);
    waterMaskTex.wrapS = waterMaskTex.wrapT = THREE.RepeatWrapping;
    const glowTex = make(glow);
    glowTex.wrapS = glowTex.wrapT = THREE.ClampToEdgeWrapping;
    const mistTex = make(mist);
    const dampTex = make(damp);
    dampTex.wrapS = dampTex.wrapT = THREE.ClampToEdgeWrapping;
    const puddleTex = make(puddles, false);
    puddleTex.wrapS = puddleTex.wrapT = THREE.ClampToEdgeWrapping;
    mistTex.wrapS = mistTex.wrapT = THREE.ClampToEdgeWrapping;
    const dustTex = make(dust);
    dustTex.wrapS = dustTex.wrapT = THREE.ClampToEdgeWrapping;
    const envTex = textureFrom(environment, {
        srgb: true,
        repeat: [ 1, 1 ],
        anisotropy: 1
    });
    envTex.mapping = THREE.EquirectangularReflectionMapping;
    return {
        wallMap: wallMap,
        wallBump: wallBump,
        wallRough: wallRough,
        wallFarMap: wallFarMap,
        wallFarBump: wallFarBump,
        wallFarRough: wallFarRough,
        ashlarMap: ashlarMap,
        ashlarBump: ashlarBump,
        ashlarRough: ashlarRough,
        floorMap: floorMap,
        floorBump: floorBump,
        floorRough: floorRough,
        woodMap: woodMap,
        woodBump: woodBump,
        woodDarkMap: woodDarkMap,
        woodDarkBump: woodDarkBump,
        ironMap: ironMap,
        ironRough: ironRough,
        greenIronMap: greenIronMap,
        greenIronRough: greenIronRough,
        copperMap: copperMap,
        copperRough: copperRough,
        brassMap: brassMap,
        brassRough: brassRough,
        perforatedTex: perforatedTex,
        blueprintTex: blueprintTex,
        plaqueTex: plaqueTex,
        glassTex: glassTex,
        gaugeTex: gaugeTex,
        noiseTex: noiseTex,
        waterMaskTex: waterMaskTex,
        glowTex: glowTex,
        mistTex: mistTex,
        dustTex: dustTex,
        dampTex: dampTex,
        puddleTex: puddleTex,
        envTex: envTex,
        raw: {
            blueprint: blueprint,
            plaque: plaque,
            windowGlass: windowGlass,
            perforated: perforated,
            floor: floor,
            wall: wall,
            ashlar: ashlar,
            damp: damp,
            wood: wood,
            iron: iron,
            greenIron: greenIron,
            copper: copper,
            brass: brass,
            gauge: gauge,
            noise: noise,
            waterMask: waterMask,
            glow: glow,
            mist: mist,
            dust: dust,
            puddles: puddles,
            environment: environment
        }
    };
}
