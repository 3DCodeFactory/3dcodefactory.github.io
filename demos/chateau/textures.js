import * as THREE from "./vendor/three.module.js";

export function mulberry32(seed) {
    let a = seed >>> 0;
    return function() {
        a |= 0;
        a = a + 1831565813 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const lerp = (a, b, t) => a + (b - a) * t;

const smooth = t => t * t * (3 - 2 * t);

function hash2(x, y) {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
    return n - Math.floor(n);
}

function valueNoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = smooth(x - xi), yf = smooth(y - yi);
    return lerp(lerp(hash2(xi, yi), hash2(xi + 1, yi), xf), lerp(hash2(xi, yi + 1), hash2(xi + 1, yi + 1), xf), yf);
}

function fbm(x, y, octaves = 4, gain = .5, lac = 2) {
    let value = 0, amp = .5, freq = 1;
    for (let i = 0; i < octaves; i++) {
        value += amp * valueNoise(x * freq, y * freq);
        freq *= lac;
        amp *= gain;
    }
    return value;
}

function canvas(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
}

function tex(c, {srgb: srgb = true, repeat: repeat = [ 1, 1 ], aniso: aniso = 8} = {}) {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = aniso;
    t.repeat.set(repeat[0], repeat[1]);
    t.needsUpdate = true;
    return t;
}

function rgba(r, g, b, a = 1) {
    return `rgba(${r | 0},${g | 0},${b | 0},${a})`;
}

function shade(hex, amount) {
    const c = new THREE.Color(hex);
    const hsl = {};
    c.getHSL(hsl);
    c.setHSL(hsl.h, hsl.s, clamp(hsl.l + amount, 0, 1));
    return c.getStyle();
}

function paintGrain(ctx, w, h, seed = 1, strength = .16, scale = 1.7) {
    const rnd = mulberry32(seed);
    const noise = canvas(256, 256);
    const nctx = noise.getContext("2d");
    const img = nctx.createImageData(256, 256);
    for (let y = 0; y < 256; y++) {
        for (let x = 0; x < 256; x++) {
            const n = fbm(x / 38 * scale, y / 38 * scale, 4) * .7 + fbm(x / 7 * scale + 11.3, y / 7 * scale + 4.8, 3) * .3;
            const v = clamp(110 + (n - .5) * 210, 0, 255);
            const i = (y * 256 + x) * 4;
            img.data[i] = v;
            img.data[i + 1] = v;
            img.data[i + 2] = v;
            img.data[i + 3] = 255;
        }
    }
    nctx.putImageData(img, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    ctx.globalAlpha = strength;
    for (let y = 0; y < h; y += 256) {
        for (let x = 0; x < w; x += 256) ctx.drawImage(noise, x, y);
    }
    ctx.restore();
}

function wrapEllipse(ctx, x, y, rx, ry, w, h) {
    for (const dx of [ -w, 0, w ]) {
        for (const dy of [ -h, 0, h ]) {
            ctx.beginPath();
            ctx.ellipse(x + dx, y + dy, rx, ry, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

export function limestoneTextures() {
    const S = 1024;
    const c = canvas(S, S), x = c.getContext("2d");
    const b = canvas(S, S), bx = b.getContext("2d");
    const rnd = mulberry32(74);
    x.fillStyle = "#938b7a";
    x.fillRect(0, 0, S, S);
    bx.fillStyle = "#4a4a46";
    bx.fillRect(0, 0, S, S);
    paintGrain(x, S, S, 71, .3, 1.1);
    const rows = 6;
    const rh = S / rows;
    for (let r = 0; r < rows; r++) {
        const y = r * rh;
        let xx = r % 2 ? -70 - rnd() * 90 : 0;
        while (xx < S) {
            const w = 132 + rnd() * 145;
            const gap = 9 + rnd() * 7;
            const tone = .5 + (rnd() - .5) * .34;
            const warm = rnd();
            const cr = lerp(184, 233, tone) + warm * 4;
            const cg = lerp(179, 228, tone) + warm * 2;
            const cb = lerp(160, 210, tone) - warm * 1;
            x.fillStyle = rgba(cr, cg, cb, 1);
            x.fillRect(xx + gap, y + gap, w - gap * 2, rh - gap * 2);
            const g = x.createLinearGradient(xx, y, xx + w * .75, y + rh);
            g.addColorStop(0, rgba(255, 252, 234, .13));
            g.addColorStop(.32, rgba(255, 252, 234, .01));
            g.addColorStop(.82, rgba(74, 61, 40, .055));
            g.addColorStop(1, rgba(61, 51, 34, .11));
            x.fillStyle = g;
            x.fillRect(xx + gap, y + gap, w - gap * 2, rh - gap * 2);
            x.fillStyle = rgba(49, 45, 36, .3);
            x.fillRect(xx + gap, y + rh - gap - 2, w - gap * 2, 3);
            x.fillStyle = rgba(249, 245, 230, .22);
            x.fillRect(xx + gap, y + gap, w - gap * 2, 2);
            x.fillStyle = rgba(44, 41, 32, .22);
            x.fillRect(xx + w - gap - 3, y + gap, 3, rh - gap * 2);
            for (let p = 0; p < 34; p++) {
                const px = xx + gap + rnd() * (w - gap * 2);
                const py = y + gap + rnd() * (rh - gap * 2);
                x.fillStyle = rnd() > .58 ? rgba(72, 63, 45, .11 + rnd() * .18) : rgba(247, 241, 220, .12 + rnd() * .17);
                x.beginPath();
                x.ellipse(px, py, .6 + rnd() * 2.8, .4 + rnd() * 2.1, rnd() * 3, 0, Math.PI * 2);
                x.fill();
            }
            if (rnd() > .58) {
                x.strokeStyle = rgba(98, 86, 62, .17);
                x.lineWidth = .8;
                x.beginPath();
                x.arc(xx + gap + rnd() * (w - gap * 2), y + gap + rnd() * (rh - gap * 2), 2 + rnd() * 5, 0, Math.PI * 2);
                x.stroke();
            }
            bx.fillStyle = rgba(174 + rnd() * 45, 174, 174, 1);
            bx.fillRect(xx + gap, y + gap, w - gap * 2, rh - gap * 2);
            bx.fillStyle = rgba(35, 35, 35, 1);
            bx.fillRect(xx + gap, y + rh - gap - 5, w - gap * 2, 5);
            bx.fillRect(xx + w - gap - 4, y + gap, 4, rh - gap * 2);
            bx.fillStyle = rgba(235, 235, 235, 1);
            bx.fillRect(xx + gap, y + gap, w - gap * 2, 2);
            if (rnd() > .71) {
                x.strokeStyle = rgba(77, 68, 50, .25);
                x.lineWidth = .9;
                x.beginPath();
                let lx = xx + w * (.25 + rnd() * .5), ly = y + gap;
                x.moveTo(lx, ly);
                for (let k = 0; k < 5; k++) {
                    lx += (rnd() - .5) * 28;
                    ly += rh / 6;
                    x.lineTo(lx, ly);
                }
                x.stroke();
            }
            xx += w;
        }
    }
    for (let i = 0; i < 43; i++) {
        const gx = rnd() * S, gy = rnd() * S;
        const grd = x.createLinearGradient(gx, gy, gx, gy + 80 + rnd() * 260);
        grd.addColorStop(0, rgba(58, 61, 49, 0));
        grd.addColorStop(.25, rgba(58, 61, 49, .05 + rnd() * .09));
        grd.addColorStop(1, rgba(58, 61, 49, 0));
        x.fillStyle = grd;
        x.fillRect(gx, gy, 2 + rnd() * 14, 270 + rnd() * 250);
    }
    for (let i = 0; i < 140; i++) {
        const px = rnd() * S, py = rnd() * S;
        if (rnd() > .68) {
            x.fillStyle = rgba(126, 135, 88, .08 + rnd() * .15);
            for (let k = 0; k < 6; k++) {
                x.beginPath();
                x.arc(px + (rnd() - .5) * 26, py + (rnd() - .5) * 18, 1 + rnd() * 5, 0, Math.PI * 2);
                x.fill();
            }
        }
    }
    for (let i = 0; i < 55; i++) {
        const px = rnd() * S, py = rnd() * S, rad = 60 + rnd() * 260;
        const grd = x.createRadialGradient(px, py, 0, px, py, rad);
        const grey = rnd() > .5;
        grd.addColorStop(0, grey ? "rgba(82,84,74,0.11)" : "rgba(240,229,203,0.075)");
        grd.addColorStop(.6, grey ? "rgba(95,96,84,0.04)" : "rgba(235,225,200,0.02)");
        grd.addColorStop(1, "rgba(120,115,100,0)");
        x.fillStyle = grd;
        x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    }
    paintGrain(x, S, S, 93, .09, 3.1);
    return {
        map: tex(c),
        bump: tex(b, {
            srgb: false
        }),
        roughness: .9
    };
}

export function slateTextures() {
    const S = 1024;
    const c = canvas(S, S), x = c.getContext("2d");
    const b = canvas(S, S), bx = b.getContext("2d");
    const rnd = mulberry32(182);
    x.fillStyle = "#20272a";
    x.fillRect(0, 0, S, S);
    bx.fillStyle = "#5c5c5c";
    bx.fillRect(0, 0, S, S);
    const cols = 7, rows = 7;
    const tw = S / cols, th = S / rows;
    for (let r = 0; r < rows; r++) {
        const off = r % 2 * tw * .5;
        for (let i = -1; i <= cols; i++) {
            const px = i * tw + off + rnd() * 6;
            const py = r * th;
            const hue = .55 + (rnd() - .5) * .16;
            const light = .09 + rnd() * .1;
            const col = (new THREE.Color).setHSL(hue, .08 + rnd() * .09, light);
            x.fillStyle = col.getStyle();
            x.beginPath();
            const w = tw - 4 - rnd() * 4;
            x.moveTo(px + 2, py);
            x.lineTo(px + w, py);
            x.lineTo(px + w - 1 - rnd() * 3, py + th - 3);
            x.lineTo(px + 2 + rnd() * 3, py + th - 4);
            x.closePath();
            x.fill();
            x.strokeStyle = rgba(182, 200, 203, .32 + rnd() * .22);
            x.lineWidth = 1.4;
            x.beginPath();
            x.moveTo(px + 2, py + 1);
            x.lineTo(px + w, py + 1);
            x.stroke();
            x.strokeStyle = rgba(2, 5, 6, .82);
            x.lineWidth = 3;
            x.beginPath();
            x.moveTo(px + 2, py + th - 4);
            x.lineTo(px + w, py + th - 4);
            x.stroke();
            bx.fillStyle = rgba(120 + rnd() * 40, 120, 120, 1);
            bx.fillRect(px + 2, py, w, th - 4);
            bx.fillStyle = rgba(45, 45, 45, 1);
            bx.fillRect(px + 2, py + th - 5, w, 5);
        }
    }
    for (let i = 0; i < 220; i++) {
        const px = rnd() * S, py = rnd() * S;
        const g = rnd() > .55;
        x.fillStyle = g ? rgba(120, 132, 95, .12 + rnd() * .18) : rgba(200, 208, 196, .06 + rnd() * .13);
        for (let k = 0; k < 5; k++) {
            x.beginPath();
            x.arc(px + (rnd() - .5) * 24, py + (rnd() - .5) * 18, 1 + rnd() * 3.4, 0, Math.PI * 2);
            x.fill();
        }
    }
    for (let i = 0; i < 30; i++) {
        const px = rnd() * S, py = rnd() * S, rad = 80 + rnd() * 260;
        const g = x.createRadialGradient(px, py, 0, px, py, rad);
        const dark = rnd() > .46;
        g.addColorStop(0, dark ? "rgba(4,8,9,0.25)" : "rgba(160,174,166,0.11)");
        g.addColorStop(1, dark ? "rgba(4,8,9,0)" : "rgba(160,174,166,0)");
        x.fillStyle = g;
        x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    }
    for (let i = 0; i < 26; i++) {
        const px = rnd() * S, py = rnd() * S;
        x.strokeStyle = rgba(8, 12, 13, .3);
        x.lineWidth = .7;
        x.beginPath();
        x.moveTo(px, py);
        x.lineTo(px + (rnd() - .5) * 100, py + rnd() * 150);
        x.stroke();
    }
    paintGrain(x, S, S, 22, .16, 2.8);
    return {
        map: tex(c),
        bump: tex(b, {
            srgb: false
        }),
        roughness: .72
    };
}

export function fieldstoneTextures() {
    const S = 1024;
    const c = canvas(S, S), x = c.getContext("2d");
    const b = canvas(S, S), bx = b.getContext("2d");
    const rnd = mulberry32(311);
    x.fillStyle = "#6c6954";
    x.fillRect(0, 0, S, S);
    bx.fillStyle = "#414141";
    bx.fillRect(0, 0, S, S);
    const rows = 8;
    const rh = S / rows;
    for (let r = 0; r < rows; r++) {
        let xx = -rnd() * 70;
        while (xx < S) {
            const w = 85 + rnd() * 170;
            const h = rh - 4 - rnd() * 20;
            const y = r * rh + 2 + rnd() * 10;
            const verts = [];
            const n = 6 + (rnd() * 4 | 0);
            for (let i = 0; i < n; i++) {
                const ang = i / n * Math.PI * 2;
                verts.push([ xx + w / 2 + Math.cos(ang) * (w / 2) * (.8 + rnd() * .25), y + h / 2 + Math.sin(ang) * (h / 2) * (.82 + rnd() * .25) ]);
            }
            const baseColor = (new THREE.Color).setHSL(.1 + rnd() * .08, .06 + rnd() * .16, .38 + rnd() * .28);
            x.fillStyle = baseColor.getStyle();
            x.beginPath();
            verts.forEach(([vx, vy], i) => i ? x.lineTo(vx, vy) : x.moveTo(vx, vy));
            x.closePath();
            x.fill();
            x.strokeStyle = rgba(225, 220, 193, .22);
            x.lineWidth = 2.2;
            x.stroke();
            const g = x.createLinearGradient(xx, y, xx, y + h);
            g.addColorStop(0, rgba(255, 255, 255, .08));
            g.addColorStop(.6, rgba(255, 255, 255, 0));
            g.addColorStop(1, rgba(22, 28, 16, .22));
            x.fillStyle = g;
            x.fill();
            for (let p = 0; p < 40; p++) {
                x.fillStyle = rnd() > .45 ? rgba(40, 36, 24, .16) : rgba(241, 235, 210, .12);
                x.beginPath();
                x.arc(xx + rnd() * w, y + rnd() * h, .5 + rnd() * 2, 0, Math.PI * 2);
                x.fill();
            }
            bx.fillStyle = rgba(160 + rnd() * 50, 160, 160, 1);
            bx.beginPath();
            verts.forEach(([vx, vy], i) => i ? bx.lineTo(vx, vy) : bx.moveTo(vx, vy));
            bx.closePath();
            bx.fill();
            xx += w + 6 + rnd() * 18;
        }
    }
    for (let i = 0; i < 520; i++) {
        const px = rnd() * S, py = Math.pow(rnd(), .68) * S;
        const rad = 6 + rnd() * 34;
        const grd = x.createRadialGradient(px, py, 0, px, py, rad);
        const green = rnd() > .6;
        grd.addColorStop(0, green ? "rgba(67,94,38,0.68)" : "rgba(102,96,66,0.32)");
        grd.addColorStop(.6, green ? "rgba(63,82,40,0.27)" : "rgba(94,88,59,0.14)");
        grd.addColorStop(1, "rgba(50,60,30,0)");
        x.fillStyle = grd;
        x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    }
    x.fillStyle = "rgba(36,44,22,0.26)";
    x.fillRect(0, S * .76, S, S * .24);
    paintGrain(x, S, S, 51, .24, 2.2);
    return {
        map: tex(c),
        bump: tex(b, {
            srgb: false
        }),
        roughness: .95
    };
}

export function brickTextures() {
    const S = 512;
    const c = canvas(S, S), x = c.getContext("2d");
    const b = canvas(S, S), bx = b.getContext("2d");
    const rnd = mulberry32(912);
    x.fillStyle = "#a6997f";
    x.fillRect(0, 0, S, S);
    bx.fillStyle = "#686868";
    bx.fillRect(0, 0, S, S);
    const rows = 11, cols = 5;
    const bw = S / cols, bh = S / rows;
    for (let r = 0; r < rows; r++) {
        const off = r % 2 * bw * .5;
        for (let i = -1; i <= cols; i++) {
            const px = i * bw + off + 3, py = r * bh + 3;
            const hue = .035 + rnd() * .035;
            const sat = .18 + rnd() * .26;
            const light = .29 + rnd() * .16;
            const col = (new THREE.Color).setHSL(hue, sat, light);
            x.fillStyle = col.getStyle();
            x.fillRect(px, py, bw - 6 - rnd() * 3, bh - 6 - rnd() * 2);
            x.fillStyle = rgba(245, 231, 203, .055 + rnd() * .07);
            x.fillRect(px, py, bw - 7, 2);
            x.fillStyle = rgba(35, 22, 16, .13 + rnd() * .1);
            x.fillRect(px, py + bh - 9, bw - 7, 3);
            for (let p = 0; p < 18; p++) {
                x.fillStyle = rnd() > .6 ? rgba(211, 201, 178, .15) : rgba(49, 35, 27, .14);
                x.beginPath();
                x.arc(px + rnd() * (bw - 8), py + rnd() * (bh - 8), .4 + rnd() * 2.2, 0, Math.PI * 2);
                x.fill();
            }
            bx.fillStyle = rgba(135 + rnd() * 60, 135, 135, 1);
            bx.fillRect(px, py, bw - 6, bh - 6);
            bx.fillStyle = rgba(55, 55, 55, 1);
            bx.fillRect(px, py + bh - 7, bw - 6, 7);
        }
    }
    for (let i = 0; i < 36; i++) {
        const px = rnd() * S;
        const g = x.createLinearGradient(px, 0, px, S);
        g.addColorStop(0, "rgba(25,20,16,0.1)");
        g.addColorStop(.4, "rgba(25,20,16,0.03)");
        g.addColorStop(1, "rgba(232,221,199,0.09)");
        x.fillStyle = g;
        x.fillRect(px, 0, 3 + rnd() * 11, S);
    }
    paintGrain(x, S, S, 31, .22, 2.6);
    return {
        map: tex(c),
        bump: tex(b, {
            srgb: false
        }),
        roughness: .93
    };
}

export function gravelTextures() {
    const S = 1536;
    const c = canvas(S, S), x = c.getContext("2d");
    const b = canvas(S, S), bx = b.getContext("2d");
    const r = canvas(S, S), rx = r.getContext("2d");
    const rnd = mulberry32(501);
    x.fillStyle = "#8b8170";
    x.fillRect(0, 0, S, S);
    bx.fillStyle = "#3e3e3a";
    bx.fillRect(0, 0, S, S);
    rx.fillStyle = "#d7d7d7";
    rx.fillRect(0, 0, S, S);
    paintGrain(x, S, S, 12, .42, 1.5);
    for (let i = 0; i < 90; i++) {
        const px = rnd() * S, py = rnd() * S, rad = 50 + rnd() * 260;
        const g = x.createRadialGradient(px, py, 0, px, py, rad);
        const damp = rnd() > .5;
        g.addColorStop(0, damp ? "rgba(48,50,44,0.26)" : "rgba(222,211,183,0.15)");
        g.addColorStop(1, damp ? "rgba(48,50,44,0)" : "rgba(222,211,183,0)");
        x.fillStyle = g;
        x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
        if (damp) {
            const gr = rx.createRadialGradient(px, py, 0, px, py, rad * .8);
            gr.addColorStop(0, "rgba(80,80,80,0.62)");
            gr.addColorStop(1, "rgba(80,80,80,0)");
            rx.fillStyle = gr;
            rx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
        }
    }
    for (let i = 0; i < 12500; i++) {
        const px = rnd() * S, py = rnd() * S;
        const big = rnd() > .94;
        const rx0 = big ? 14 + rnd() * 22 : 2.4 + Math.pow(rnd(), 1.7) * 15;
        const ry0 = rx0 * (.4 + rnd() * .55);
        const ang = rnd() * Math.PI;
        const tone = rnd();
        let cr, cg, cb;
        if (tone < .38) {
            cr = 178 + rnd() * 48;
            cg = 170 + rnd() * 44;
            cb = 147 + rnd() * 40;
        } else if (tone < .7) {
            cr = 132 + rnd() * 46;
            cg = 126 + rnd() * 42;
            cb = 108 + rnd() * 36;
        } else if (tone < .9) {
            cr = 93 + rnd() * 40;
            cg = 88 + rnd() * 36;
            cb = 76 + rnd() * 30;
        } else {
            cr = 69 + rnd() * 26;
            cg = 72 + rnd() * 24;
            cb = 58 + rnd() * 22;
        }
        const verts = 5 + (rnd() * 3 | 0);
        const shape = [];
        for (let k = 0; k < verts; k++) {
            const aa = k / verts * Math.PI * 2;
            const rr = .76 + rnd() * .34;
            shape.push([ Math.cos(aa) * rx0 * rr, Math.sin(aa) * ry0 * rr ]);
        }
        x.save();
        x.translate(px + rx0 * .3, py + ry0 * .5);
        x.rotate(ang);
        x.fillStyle = "rgba(32,32,27,0.34)";
        x.beginPath();
        shape.forEach((v, k) => k ? x.lineTo(v[0], v[1]) : x.moveTo(v[0], v[1]));
        x.closePath();
        x.fill();
        x.restore();
        x.save();
        x.translate(px, py);
        x.rotate(ang);
        x.fillStyle = rgba(cr, cg, cb, 1);
        x.beginPath();
        shape.forEach((v, k) => k ? x.lineTo(v[0], v[1]) : x.moveTo(v[0], v[1]));
        x.closePath();
        x.fill();
        x.fillStyle = rgba(cr + 38, cg + 35, cb + 29, .5);
        x.beginPath();
        x.ellipse(-rx0 * .2, -ry0 * .32, rx0 * .5, ry0 * .4, 0, 0, Math.PI * 2);
        x.fill();
        x.strokeStyle = rgba(cr - 54, cg - 50, cb - 44, .45);
        x.lineWidth = .9;
        x.beginPath();
        shape.forEach((v, k) => k ? x.lineTo(v[0], v[1]) : x.moveTo(v[0], v[1]));
        x.closePath();
        x.stroke();
        x.restore();
        bx.save();
        bx.translate(px, py);
        bx.rotate(ang);
        const bv = 92 + (cr - 70) * .6;
        bx.fillStyle = rgba(bv, bv, bv, 1);
        bx.beginPath();
        shape.forEach((v, k) => k ? bx.lineTo(v[0], v[1]) : bx.moveTo(v[0], v[1]));
        bx.closePath();
        bx.fill();
        bx.restore();
    }
    for (let i = 0; i < 170; i++) {
        const px = rnd() * S, py = rnd() * S;
        x.fillStyle = rnd() > .5 ? "rgba(84,62,33,0.55)" : "rgba(58,56,44,0.4)";
        x.save();
        x.translate(px, py);
        x.rotate(rnd() * Math.PI);
        x.beginPath();
        x.ellipse(0, 0, 2.5 + rnd() * 6, 1 + rnd() * 2.6, 0, 0, Math.PI * 2);
        x.fill();
        x.restore();
    }
    paintGrain(x, S, S, 7, .16, 1);
    return {
        map: tex(c, {
            aniso: 12
        }),
        bump: tex(b, {
            srgb: false,
            aniso: 12
        }),
        roughnessMap: tex(r, {
            srgb: false
        }),
        roughness: .84
    };
}

export function grassTextures() {
    const S = 1024;
    const c = canvas(S, S), x = c.getContext("2d");
    const b = canvas(S, S), bx = b.getContext("2d");
    const rnd = mulberry32(881);
    x.fillStyle = "#4c5734";
    x.fillRect(0, 0, S, S);
    bx.fillStyle = "#777777";
    bx.fillRect(0, 0, S, S);
    for (let i = 0; i < 55; i++) {
        const px = rnd() * S, py = rnd() * S, rr = 30 + rnd() * 220;
        const g = x.createRadialGradient(px, py, 0, px, py, rr);
        const kind = rnd();
        g.addColorStop(0, kind > .62 ? "rgba(124,124,65,0.3)" : kind > .3 ? "rgba(49,65,35,0.42)" : "rgba(95,91,49,0.28)");
        g.addColorStop(1, "rgba(70,82,45,0)");
        x.fillStyle = g;
        x.fillRect(px - rr, py - rr, rr * 2, rr * 2);
    }
    for (let i = 0; i < 26e3; i++) {
        const px = rnd() * S, py = rnd() * S;
        const h = 1.5 + rnd() * 7;
        const col = (new THREE.Color).setHSL(.17 + rnd() * .09, .2 + rnd() * .2, .16 + rnd() * .2);
        x.strokeStyle = col.getStyle();
        x.lineWidth = .7 + rnd() * 1.3;
        x.beginPath();
        x.moveTo(px, py + h);
        x.quadraticCurveTo(px + (rnd() - .5) * 3, py + h * .4, px + (rnd() - .5) * 3, py);
        x.stroke();
    }
    for (let i = 0; i < 900; i++) {
        const px = rnd() * S, py = rnd() * S;
        x.fillStyle = rnd() > .55 ? "rgba(205,204,152,0.3)" : "rgba(61,79,39,0.4)";
        x.beginPath();
        x.ellipse(px, py, 1 + rnd() * 2.5, .7 + rnd() * 1.4, rnd() * 3, 0, Math.PI * 2);
        x.fill();
    }
    bx.globalAlpha = .5;
    paintGrain(bx, S, S, 17, .5, 2);
    return {
        map: tex(c),
        bump: tex(b, {
            srgb: false
        }),
        roughness: .95
    };
}

export function barkTextures() {
    const S = 512;
    const c = canvas(S, S * 2), x = c.getContext("2d");
    const b = canvas(S, S * 2), bx = b.getContext("2d");
    const rnd = mulberry32(1002);
    x.fillStyle = "#665d4d";
    x.fillRect(0, 0, S, S * 2);
    bx.fillStyle = "#666";
    bx.fillRect(0, 0, S, S * 2);
    for (let i = 0; i < 230; i++) {
        const px = rnd() * S, py = rnd() * S * 2;
        const w = 2 + rnd() * 11, h = 30 + rnd() * 260;
        const g = x.createLinearGradient(px, py, px + w, py);
        const dark = rnd() > .42;
        g.addColorStop(0, dark ? "rgba(38,33,26,0.55)" : "rgba(152,139,112,0.33)");
        g.addColorStop(.5, dark ? "rgba(67,59,47,0.4)" : "rgba(126,115,91,0.22)");
        g.addColorStop(1, "rgba(70,61,47,0)");
        x.fillStyle = g;
        x.beginPath();
        x.moveTo(px, py);
        x.bezierCurveTo(px + w, py + h * .3, px - w, py + h * .6, px + w * .2, py + h);
        x.lineTo(px + w * 1.2, py + h);
        x.bezierCurveTo(px + w * .4, py + h * .55, px + w * 2, py + h * .3, px + w, py);
        x.closePath();
        x.fill();
        bx.strokeStyle = dark ? "rgba(40,40,40,0.8)" : "rgba(185,185,185,0.55)";
        bx.lineWidth = 1 + rnd() * 3;
        bx.beginPath();
        bx.moveTo(px, py);
        bx.lineTo(px + w * .4, py + h);
        bx.stroke();
    }
    for (let i = 0; i < 45; i++) {
        const px = rnd() * S, py = rnd() * S * 2;
        x.strokeStyle = "rgba(26,24,20,0.42)";
        x.lineWidth = 1.3;
        x.beginPath();
        x.ellipse(px, py, 10 + rnd() * 45, 2 + rnd() * 8, rnd() * Math.PI, 0, Math.PI * 2);
        x.stroke();
    }
    for (let i = 0; i < 80; i++) {
        const px = rnd() * S, py = rnd() * S * 2;
        x.fillStyle = "rgba(110,118,70,0.16)";
        x.beginPath();
        x.arc(px, py, 2 + rnd() * 9, 0, Math.PI * 2);
        x.fill();
    }
    paintGrain(x, S, S * 2, 4, .22, 2.5);
    return {
        map: tex(c),
        bump: tex(b, {
            srgb: false
        }),
        roughness: .98
    };
}

export function hydrangeaLeafTexture() {
    const S = 512;
    const c = canvas(S, S), x = c.getContext("2d");
    const rnd = mulberry32(4271);
    x.clearRect(0, 0, S, S);
    const cx = S * .5, cy = S * .53;
    for (let i = 0; i < 13; i++) {
        const ang = i / 13 * Math.PI * 2 + rnd() * .35;
        const rr = S * (.1 + rnd() * .18);
        const len = S * (.21 + rnd() * .16);
        const wid = len * (.48 + rnd() * .22);
        const px = cx + Math.cos(ang) * rr;
        const py = cy + Math.sin(ang) * rr;
        x.save();
        x.translate(px, py);
        x.rotate(ang);
        const grd = x.createLinearGradient(0, 0, len, 0);
        grd.addColorStop(0, [ "#2d4021", "#344a26", "#3b522b" ][rnd() * 3 | 0]);
        grd.addColorStop(.55, [ "#465f30", "#516b37", "#3d5528" ][rnd() * 3 | 0]);
        grd.addColorStop(1, [ "#6f7d45", "#7c854d", "#5e713c" ][rnd() * 3 | 0]);
        x.fillStyle = grd;
        x.beginPath();
        x.moveTo(0, 0);
        const ser = 9;
        for (let k = 0; k <= ser; k++) {
            const t = k / ser;
            x.lineTo(len * t, -Math.sin(t * Math.PI) * wid * (1 + (k % 2 ? .12 : -.03)));
        }
        for (let k = ser; k >= 0; k--) {
            const t = k / ser;
            x.lineTo(len * t, Math.sin(t * Math.PI) * wid * (1 + (k % 2 ? .12 : -.03)));
        }
        x.closePath();
        x.fill();
        x.strokeStyle = "rgba(24,38,17,0.45)";
        x.lineWidth = 1.1;
        x.stroke();
        x.strokeStyle = "rgba(158,173,111,0.3)";
        x.lineWidth = 1;
        x.beginPath();
        x.moveTo(len * .08, 0);
        x.quadraticCurveTo(len * .55, 2, len * .96, 0);
        x.stroke();
        x.restore();
    }
    return tex(c, {
        aniso: 4
    });
}

export function hydrangeaBloomTexture(seed = 1) {
    const S = 512;
    const c = canvas(S, S), x = c.getContext("2d");
    const rnd = mulberry32(seed * 131 + 17);
    x.clearRect(0, 0, S, S);
    const cx = S * .5, cy = S * .5;
    const heads = 7 + (rnd() * 5 | 0);
    for (let h = 0; h < heads; h++) {
        const ha = h / heads * Math.PI * 2 + rnd() * .5;
        const hr = S * (.08 + rnd() * .2);
        const hx = cx + Math.cos(ha) * hr;
        const hy = cy + Math.sin(ha) * hr * .85;
        const blooms = 26;
        for (let i = 0; i < blooms; i++) {
            const a = rnd() * Math.PI * 2;
            const rr = Math.pow(rnd(), .65) * S * .11;
            const px = hx + Math.cos(a) * rr;
            const py = hy + Math.sin(a) * rr * .9;
            const u = rnd();
            let fill;
            if (u < .52) fill = `rgba(${232 + rnd() * 18},${196 + rnd() * 24},${198 + rnd() * 24},1)`; else if (u < .82) fill = `rgba(${237 + rnd() * 16},${227 + rnd() * 18},${202 + rnd() * 20},1)`; else fill = `rgba(${196 + rnd() * 26},${204 + rnd() * 22},${214 + rnd() * 24},1)`;
            for (let p = 0; p < 4; p++) {
                const pa = p / 4 * Math.PI * 2 + a;
                x.fillStyle = fill;
                x.beginPath();
                x.ellipse(px + Math.cos(pa) * 3.4, py + Math.sin(pa) * 3, 3.4 + rnd() * 1.3, 2.6 + rnd() * .9, pa, 0, Math.PI * 2);
                x.fill();
            }
            x.fillStyle = "rgba(222,205,156,0.85)";
            x.beginPath();
            x.arc(px, py, 1.1, 0, Math.PI * 2);
            x.fill();
        }
    }
    return tex(c, {
        aniso: 8
    });
}

export function topiaryTextures() {
    const S = 512;
    const c = canvas(S, S), x = c.getContext("2d");
    const rnd = mulberry32(27);
    x.fillStyle = "#27351e";
    x.fillRect(0, 0, S, S);
    for (let i = 0; i < 7e3; i++) {
        const px = rnd() * S, py = rnd() * S;
        const col = (new THREE.Color).setHSL(.22 + rnd() * .06, .33 + rnd() * .2, .09 + rnd() * .15);
        x.fillStyle = col.getStyle();
        x.save();
        x.translate(px, py);
        x.rotate(rnd() * Math.PI);
        x.beginPath();
        x.ellipse(0, 0, 1.2 + rnd() * 3.2, .8 + rnd() * 1.8, 0, 0, Math.PI * 2);
        x.fill();
        x.restore();
    }
    return {
        map: tex(c),
        bump: tex(c, {
            srgb: false
        }),
        roughness: .98
    };
}

function drawLeaf(x, cx, cy, len, wid, ang, fill, edge) {
    x.save();
    x.translate(cx, cy);
    x.rotate(ang);
    x.fillStyle = fill;
    x.beginPath();
    x.moveTo(0, 0);
    x.bezierCurveTo(len * .28, -wid, len * .72, -wid, len, 0);
    x.bezierCurveTo(len * .72, wid, len * .28, wid, 0, 0);
    x.closePath();
    x.fill();
    x.strokeStyle = edge;
    x.lineWidth = .8;
    x.stroke();
    x.strokeStyle = edge;
    x.globalAlpha *= .55;
    x.beginPath();
    x.moveTo(len * .08, 0);
    x.lineTo(len * .9, 0);
    x.stroke();
    x.restore();
}

const leafPalettes = {
    oak: {
        colors: [ "#39482a", "#43532f", "#526034", "#657141", "#737d4b", "#4c5b34", "#867f46", "#8f8543" ],
        edge: "rgba(30,40,20,0.55)"
    },
    gold: {
        colors: [ "#5d5b2c", "#777330", "#8d8437", "#a39a48", "#6b672e", "#b2a860", "#7c6b2d", "#5a4f25" ],
        edge: "rgba(55,48,19,0.5)"
    },
    deep: {
        colors: [ "#202f1c", "#2b3c22", "#354728", "#40532d", "#485b31", "#2c3f24" ],
        edge: "rgba(16,25,12,0.55)"
    },
    darkgold: {
        colors: [ "#4d4a24", "#625a26", "#78662b", "#8d7434", "#6f5525", "#9b823e" ],
        edge: "rgba(46,38,18,0.55)"
    }
};

export function foliageTexture(name = "oak", seed = 1, size = 512) {
    const pal = leafPalettes[name] || leafPalettes.oak;
    const rnd = mulberry32(seed * 101 + 7);
    const c = canvas(size, size), x = c.getContext("2d");
    x.clearRect(0, 0, size, size);
    const cx = size * .5, cy = size * .5;
    const clusters = [];
    const nc = 5 + (rnd() * 4 | 0);
    for (let i = 0; i < nc; i++) {
        clusters.push({
            x: cx + (rnd() - .5) * size * .5,
            y: cy + (rnd() - .5) * size * .54,
            r: size * (.14 + rnd() * .16)
        });
    }
    x.strokeStyle = "rgba(48,39,25,0.68)";
    for (let i = 0; i < 9; i++) {
        x.lineWidth = 1 + rnd() * 2.4;
        const sx = cx + (rnd() - .5) * size * .5;
        const sy = cy + (rnd() - .5) * size * .4;
        x.beginPath();
        x.moveTo(sx, sy);
        x.quadraticCurveTo(sx + (rnd() - .5) * 90, sy + (rnd() - .5) * 80, sx + (rnd() - .5) * 170, sy + (rnd() - .5) * 140);
        x.stroke();
    }
    const count = Math.floor(size * 2.8);
    for (let i = 0; i < count; i++) {
        const cl = clusters[rnd() * clusters.length | 0];
        const ang = rnd() * Math.PI * 2;
        const rr = Math.pow(rnd(), .6) * cl.r;
        const px = cl.x + Math.cos(ang) * rr;
        const py = cl.y + Math.sin(ang) * rr * .82;
        const distance = Math.hypot((px - cx) / (size * .52), (py - cy) / (size * .48));
        if (distance > 1 && rnd() < .75) continue;
        const len = size * (.025 + rnd() * .045);
        const wid = len * (.32 + rnd() * .24);
        const color = pal.colors[rnd() * pal.colors.length | 0];
        drawLeaf(x, px, py, len, wid, rnd() * Math.PI * 2, color, pal.edge);
    }
    x.globalAlpha = .45;
    for (let i = 0; i < 50; i++) {
        const ang = rnd() * Math.PI * 2;
        const rr = size * (.38 + rnd() * .1);
        drawLeaf(x, cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr * .92, size * .035, size * .014, rnd() * Math.PI * 2, pal.colors[rnd() * pal.colors.length | 0], pal.edge);
    }
    return tex(c, {
        aniso: 4
    });
}

export function ivyTexture() {
    const S = 256;
    const c = canvas(S, S), x = c.getContext("2d");
    const rnd = mulberry32(921);
    x.clearRect(0, 0, S, S);
    for (let i = 0; i < 130; i++) {
        const px = rnd() * S, py = rnd() * S;
        const rad = 5 + rnd() * 10;
        x.fillStyle = [ "#263a1d", "#324828", "#3c522d", "#2b4022", "#455a31" ][rnd() * 5 | 0];
        x.save();
        x.translate(px, py);
        x.rotate(rnd() * Math.PI * 2);
        x.beginPath();
        x.moveTo(0, -rad);
        x.bezierCurveTo(rad * .9, -rad * .65, rad * .9, rad * .4, 0, rad);
        x.bezierCurveTo(-rad * .9, rad * .4, -rad * .9, -rad * .65, 0, -rad);
        x.fill();
        x.strokeStyle = "rgba(176,190,125,0.22)";
        x.lineWidth = .7;
        x.stroke();
        x.restore();
    }
    return tex(c, {
        aniso: 4
    });
}

export function firSilhouetteTexture(seed = 1) {
    const W = 512, H = 1024;
    const c = canvas(W, H), x = c.getContext("2d");
    const rnd = mulberry32(seed * 97 + 31);
    x.clearRect(0, 0, W, H);
    const cx = W * .5;
    const bodyGrad = x.createLinearGradient(0, H, 0, 0);
    bodyGrad.addColorStop(0, "rgba(31,45,25,0.98)");
    bodyGrad.addColorStop(.6, "rgba(44,60,34,0.98)");
    bodyGrad.addColorStop(1, "rgba(62,79,46,0.94)");
    x.fillStyle = bodyGrad;
    x.beginPath();
    x.moveTo(cx - W * .06, H * .995);
    for (let i = 0; i <= 16; i++) {
        const t = i / 16;
        const y = H * (.985 - t * .96);
        const w = W * (.54 * Math.pow(1 - t, .82) + .015);
        x.lineTo(cx - w * (.92 + rnd() * .1), y);
    }
    for (let i = 16; i >= 0; i--) {
        const t = i / 16;
        const y = H * (.985 - t * .96);
        const w = W * (.54 * Math.pow(1 - t, .82) + .015);
        x.lineTo(cx + w * (.92 + rnd() * .1), y);
    }
    x.closePath();
    x.fill();
    for (let tier = 0; tier < 30; tier++) {
        const t = tier / 30;
        const y = H * (.965 - t * .91);
        const w = W * (.55 * Math.pow(1 - t, .85) + .035);
        for (let side = -1; side <= 1; side += 2) {
            const reach = w * (.55 + rnd() * .5);
            const droop = H * (.012 + rnd() * .024) * (.5 + (1 - t));
            const col = `rgba(${32 + rnd() * 28},${50 + rnd() * 32},${27 + rnd() * 22},${.55 + rnd() * .35})`;
            x.fillStyle = col;
            x.beginPath();
            const bx = cx + side * W * .01;
            x.moveTo(bx, y - 6 - rnd() * 7);
            x.quadraticCurveTo(cx + side * reach * .55, y - 10 - rnd() * 10, cx + side * reach, y + droop);
            x.quadraticCurveTo(cx + side * reach * .55, y + 12 + rnd() * 8, bx, y + 7 + rnd() * 6);
            x.closePath();
            x.fill();
            for (let n = 0; n < 20; n++) {
                const u = .06 + rnd() * .9;
                const px = cx + side * reach * u;
                const py = y + droop * u * u;
                const len = (5 + rnd() * 14) * (1.2 - t * .4);
                const light = rnd() > .72;
                x.strokeStyle = light ? `rgba(${98 + rnd() * 54},${120 + rnd() * 50},${78 + rnd() * 40},${.3 + rnd() * .32})` : `rgba(${36 + rnd() * 30},${56 + rnd() * 36},${32 + rnd() * 26},${.35 + rnd() * .35})`;
                x.lineWidth = .7 + rnd() * 1.8;
                x.beginPath();
                x.moveTo(px, py);
                x.lineTo(px + side * len * .7, py + len * .55);
                x.stroke();
            }
        }
    }
    for (let i = 0; i < 95; i++) {
        const t = rnd() * .5;
        const y = H * (.04 + t * .5);
        const w = W * (.3 * Math.pow(1 - t, .7) + .01);
        const side = rnd() > .5 ? 1 : -1;
        const px = cx + side * Math.pow(rnd(), 1.3) * w;
        x.fillStyle = `rgba(${26 + rnd() * 26},${42 + rnd() * 30},${22 + rnd() * 20},${.35 + rnd() * .4})`;
        x.beginPath();
        x.ellipse(px, y + rnd() * 10, 8 + rnd() * 30, 3 + rnd() * 9, (rnd() - .5) * .5, 0, Math.PI * 2);
        x.fill();
    }
    x.strokeStyle = "rgba(45,34,23,0.9)";
    x.lineWidth = W * .019;
    x.beginPath();
    x.moveTo(cx, H);
    x.lineTo(cx, H * .02);
    x.stroke();
    for (let i = 0; i < 260; i++) {
        const t = rnd();
        const y = H * (.03 + t * .45);
        const w = W * (.15 * Math.pow(1 - t, 1.1) + .008);
        const side = rnd() > .5 ? 1 : -1;
        x.strokeStyle = `rgba(${44 + rnd() * 38},${64 + rnd() * 36},${40 + rnd() * 26},${.35 + rnd() * .4})`;
        x.lineWidth = .8 + rnd() * 1.6;
        x.beginPath();
        x.moveTo(cx, y);
        x.lineTo(cx + side * w * (.5 + rnd() * .6), y + 4 + rnd() * 8);
        x.stroke();
    }
    return tex(c, {
        aniso: 8
    });
}

export function firTexture(seed = 1) {
    const W = 512, H = 512;
    const c = canvas(W, H), x = c.getContext("2d");
    const rnd = mulberry32(seed * 73 + 9);
    x.clearRect(0, 0, W, H);
    x.strokeStyle = "rgba(46,35,23,0.8)";
    x.lineWidth = 5;
    x.beginPath();
    x.moveTo(W * .02, H * .52);
    x.lineTo(W * .98, H * .52);
    x.stroke();
    for (let side = -1; side <= 1; side += 2) {
        for (let i = 0; i < 240; i++) {
            const u = Math.pow(rnd(), .75);
            const px = W * .5 + side * u * W * .47;
            const py = H * .52 + (rnd() - .5) * (12 + u * 54);
            const len = 6 + rnd() * 22;
            const ang = (side > 0 ? 0 : Math.PI) + (rnd() - .5) * 1.1 + (rnd() > .5 ? .25 : -.25);
            x.strokeStyle = [ "#2b3d27", "#33482b", "#3d5230", "#26381f" ][rnd() * 4 | 0];
            x.lineWidth = 1 + rnd() * 2.2;
            x.beginPath();
            x.moveTo(px, py);
            x.lineTo(px + Math.cos(ang) * len, py + Math.sin(ang) * len);
            x.stroke();
        }
    }
    return tex(c, {
        aniso: 4
    });
}

export function windowTextures(lit = false) {
    const W = 320, H = 720;
    const c = canvas(W, H), x = c.getContext("2d");
    const e = canvas(W, H), ex = e.getContext("2d");
    const rnd = mulberry32(lit ? 662 : 615);
    x.fillStyle = "#0b1114";
    x.fillRect(0, 0, W, H);
    ex.fillStyle = "#000";
    ex.fillRect(0, 0, W, H);
    const grd = x.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, lit ? "#8c7a66" : "#b3c1c2");
    grd.addColorStop(.18, lit ? "#8d7961" : "#83979a");
    grd.addColorStop(.42, lit ? "#5e4c39" : "#52696c");
    grd.addColorStop(.74, lit ? "#30261c" : "#1d2e30");
    grd.addColorStop(1, lit ? "#17130e" : "#0b1517");
    x.fillStyle = grd;
    x.fillRect(0, 0, W, H);
    for (let i = 0; i < 17; i++) {
        x.fillStyle = lit ? `rgba(244, 207, 147,${.045 + rnd() * .09})` : `rgba(207, 218, 218,${.035 + rnd() * .095})`;
        x.beginPath();
        x.ellipse(rnd() * W, rnd() * H * .55, 18 + rnd() * 110, 8 + rnd() * 30, -.5 + rnd() * 1, 0, Math.PI * 2);
        x.fill();
    }
    const sheen = x.createLinearGradient(0, H * .08, W, H * .45);
    sheen.addColorStop(0, "rgba(235,240,236,0)");
    sheen.addColorStop(.42, lit ? "rgba(255,225,171,0.2)" : "rgba(232,240,237,0.24)");
    sheen.addColorStop(.6, "rgba(235,240,236,0.04)");
    sheen.addColorStop(1, "rgba(235,240,236,0)");
    x.fillStyle = sheen;
    x.fillRect(0, 0, W, H * .55);
    if (!lit) {
        for (let i = 0; i < 6; i++) {
            const px = rnd() * W;
            x.fillStyle = `rgba(24,38,33,${.05 + rnd() * .07})`;
            x.beginPath();
            x.ellipse(px, H * (.34 + rnd() * .22), 12 + rnd() * 42, 40 + rnd() * 100, (rnd() - .5) * .3, 0, Math.PI * 2);
            x.fill();
        }
    }
    if (lit) {
        const cg = x.createRadialGradient(W * .52, H * .56, 10, W * .52, H * .56, W * .75);
        cg.addColorStop(0, "rgba(255,193,104,0.58)");
        cg.addColorStop(.48, "rgba(176,105,44,0.27)");
        cg.addColorStop(1, "rgba(20,15,11,0)");
        x.fillStyle = cg;
        x.fillRect(0, 0, W, H);
        const eg = ex.createRadialGradient(W * .52, H * .56, 20, W * .52, H * .56, W * .92);
        eg.addColorStop(0, "rgba(255,199,121,0.95)");
        eg.addColorStop(.5, "rgba(206,130,61,0.45)");
        eg.addColorStop(1, "rgba(65,35,15,0.06)");
        ex.fillStyle = eg;
        ex.fillRect(0, 0, W, H);
        for (const side of [ 0, W ]) {
            const lg = x.createLinearGradient(side ? W : 0, 0, side ? W - 36 : 36, 0);
            lg.addColorStop(0, "rgba(255,213,155,0.22)");
            lg.addColorStop(1, "rgba(255,213,155,0)");
            x.fillStyle = lg;
            x.fillRect(side ? W - 40 : 0, 0, 40, H);
        }
    } else {
        const cg = x.createLinearGradient(0, H * .52, 0, H);
        cg.addColorStop(0, "rgba(28,25,19,0)");
        cg.addColorStop(1, "rgba(21,18,13,0.75)");
        x.fillStyle = cg;
        x.fillRect(0, 0, W, H);
        for (const side of [ 0, 1 ]) {
            const lg = x.createLinearGradient(side ? W : 0, 0, side ? W - 28 : 28, 0);
            lg.addColorStop(0, "rgba(226,220,204,0.17)");
            lg.addColorStop(1, "rgba(226,220,204,0)");
            x.fillStyle = lg;
            x.fillRect(side ? W - 30 : 0, 0, 30, H);
        }
    }
    for (let i = 0; i < 45; i++) {
        x.fillStyle = `rgba(228,235,229,${.018 + rnd() * .04})`;
        x.save();
        x.translate(rnd() * W, rnd() * H);
        x.rotate(rnd() * Math.PI);
        x.fillRect(0, 0, 8 + rnd() * 85, 1 + rnd() * 4);
        x.restore();
    }
    const cols = 3, rows = 5;
    const bar = lit ? "#cec0a0" : "#cfcdc2";
    x.strokeStyle = bar;
    x.lineWidth = 13;
    for (let i = 1; i < cols; i++) {
        x.beginPath();
        x.moveTo(W / cols * i, 0);
        x.lineTo(W / cols * i, H);
        x.stroke();
    }
    for (let i = 1; i < rows; i++) {
        x.beginPath();
        x.moveTo(0, H / rows * i);
        x.lineTo(W, H / rows * i);
        x.stroke();
    }
    x.lineWidth = 22;
    x.beginPath();
    x.moveTo(W * .5, 0);
    x.lineTo(W * .5, H);
    x.stroke();
    x.lineWidth = 27;
    x.strokeRect(18, 18, W - 36, H - 36);
    x.strokeStyle = "rgba(57,56,50,0.55)";
    x.lineWidth = 3;
    x.strokeRect(26, 26, W - 52, H - 52);
    x.strokeStyle = "rgba(70,68,60,0.35)";
    x.lineWidth = 5;
    for (let i = 1; i < cols; i++) {
        x.beginPath();
        x.moveTo(W / cols * i + 7, 0);
        x.lineTo(W / cols * i + 7, H);
        x.stroke();
    }
    for (let i = 1; i < rows; i++) {
        x.beginPath();
        x.moveTo(0, H / rows * i + 7);
        x.lineTo(W, H / rows * i + 7);
        x.stroke();
    }
    ex.strokeStyle = "#000";
    ex.lineWidth = 28;
    for (let i = 1; i < cols; i++) {
        ex.beginPath();
        ex.moveTo(W / cols * i, 0);
        ex.lineTo(W / cols * i, H);
        ex.stroke();
    }
    for (let i = 1; i < rows; i++) {
        ex.beginPath();
        ex.moveTo(0, H / rows * i);
        ex.lineTo(W, H / rows * i);
        ex.stroke();
    }
    ex.lineWidth = 52;
    ex.strokeRect(6, 6, W - 12, H - 12);
    const map = tex(c, {
        aniso: 8
    });
    const em = tex(e, {
        aniso: 8
    });
    map.generateMipmaps = false;
    map.minFilter = THREE.LinearFilter;
    em.generateMipmaps = false;
    em.minFilter = THREE.LinearFilter;
    return {
        map: map,
        emissive: em
    };
}

export function oculusTexture() {
    const S = 256;
    const c = canvas(S, S), x = c.getContext("2d");
    x.clearRect(0, 0, S, S);
    const g = x.createRadialGradient(S * .5, S * .45, 10, S * .5, S * .5, S * .5);
    g.addColorStop(0, "#5f6b6e");
    g.addColorStop(.72, "#131b1e");
    g.addColorStop(1, "#090e10");
    x.fillStyle = g;
    x.beginPath();
    x.arc(S / 2, S / 2, S * .49, 0, Math.PI * 2);
    x.fill();
    x.strokeStyle = "#d1cbb9";
    x.lineWidth = 9;
    x.beginPath();
    x.arc(S / 2, S / 2, S * .47, 0, Math.PI * 2);
    x.stroke();
    x.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 4;
        x.beginPath();
        x.moveTo(S / 2 + Math.cos(a) * S * .47, S / 2 + Math.sin(a) * S * .47);
        x.lineTo(S / 2 - Math.cos(a) * S * .47, S / 2 - Math.sin(a) * S * .47);
        x.stroke();
    }
    x.beginPath();
    x.arc(S / 2, S / 2, S * .17, 0, Math.PI * 2);
    x.stroke();
    return tex(c);
}

export function leafLitterTexture() {
    const S = 256;
    const c = canvas(S, S), x = c.getContext("2d");
    const rnd = mulberry32(554);
    x.clearRect(0, 0, S, S);
    for (let i = 0; i < 18; i++) {
        x.save();
        x.translate(rnd() * S, rnd() * S);
        x.rotate(rnd() * Math.PI);
        x.fillStyle = [ "#785a2b", "#9a7935", "#6d4f28", "#b08a42", "#5e4c2d" ][rnd() * 5 | 0];
        x.beginPath();
        x.ellipse(0, 0, 6 + rnd() * 11, 2 + rnd() * 5, 0, 0, Math.PI * 2);
        x.fill();
        x.restore();
    }
    return tex(c);
}
