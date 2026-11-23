import * as THREE from "three";

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

export function hash2(x, y) {
    let h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
    return h - Math.floor(h);
}

function smooth(t) {
    return t * t * (3 - 2 * t);
}

export function valueNoise2(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const a = hash2(xi, yi), b = hash2(xi + 1, yi);
    const c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
    const u = smooth(xf), v = smooth(yf);
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

export function fbm(x, y, octaves = 4, persistence = .5) {
    let sum = 0, amp = 1, norm = 0;
    for (let i = 0; i < octaves; i++) {
        sum += valueNoise2(x, y) * amp;
        norm += amp;
        x *= 2.03;
        y *= 2.01;
        amp *= persistence;
    }
    return sum / norm;
}

function canvas2d(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return [ c, c.getContext("2d", {
        willReadFrequently: true
    }) ];
}

function textureFromCanvas(canvas, {srgb: srgb = false, repeat: repeat = null, anisotropy: anisotropy = 8, wrap: wrap = false, flipY: flipY = true} = {}) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    tex.anisotropy = anisotropy;
    tex.flipY = flipY;
    if (wrap) {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    }
    if (repeat) {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(repeat[0], repeat[1]);
    }
    tex.needsUpdate = true;
    return tex;
}

export function makeWoodTextures(seed = 11, opts = {}) {
    const W = opts.width || 1600;
    const H = opts.height || 1e3;
    const hue = opts.hue || "walnut";
    const isDark = hue === "dark";
    const rng = mulberry32(seed);
    const [canvas, ctx] = canvas2d(W, H);
    const img = ctx.createImageData(W, H);
    const data = img.data;
    const knots = [ {
        x: .18 + rng() * .12,
        y: .3 + rng() * .18,
        s: .055 + rng() * .035
    }, {
        x: .64 + rng() * .16,
        y: .62 + rng() * .18,
        s: .035 + rng() * .025
    }, {
        x: .91 + rng() * .05,
        y: .22 + rng() * .16,
        s: .022 + rng() * .02
    } ];
    const base = isDark ? [ 46, 27, 15 ] : [ 83, 50, 28 ];
    const dark = isDark ? [ 17, 9, 5 ] : [ 31, 17, 9 ];
    const light = isDark ? [ 77, 48, 28 ] : [ 137, 91, 52 ];
    for (let y = 0; y < H; y++) {
        const v = y / H;
        for (let x = 0; x < W; x++) {
            const u = x / W;
            let warp = (fbm(u * 3.4, v * 6.5, 4) - .5) * 2.8;
            warp += (fbm(u * 11 + 8.1, v * 23, 3) - .5) * .8;
            let ringBoost = 0;
            for (const k of knots) {
                const dx = (u - k.x) * 1;
                const dy = (v - k.y) * (W / H) * .9;
                const d = Math.sqrt(dx * dx + dy * dy);
                const fall = Math.exp(-d * d / (k.s * k.s * 1.4));
                warp += Math.sin(d * 155 * (.48 / k.s) + fbm(u * 20, v * 20, 2) * 8) * fall * 2.4;
                ringBoost += fall * .45;
            }
            const grainCoord = v * 104 + warp * 5.2 + fbm(u * 9, v * 31, 2) * 1.2;
            let grain = Math.pow(Math.sin(grainCoord * .62) * .5 + .5, 3.6);
            grain += .28 * Math.pow(Math.sin(grainCoord * .19 + 1.4) * .5 + .5, 1.7);
            const fine = fbm(u * 90, v * 500, 2);
            const broad = fbm(u * 2.2 + 3.2, v * 3.1, 3);
            const pore = Math.pow(valueNoise2(u * 820, v * 87), 6) * .35;
            const t = Math.min(1, Math.max(0, grain * .62 + broad * .42 - .08 + ringBoost));
            const lightMix = Math.min(1, Math.max(0, (1 - t) * .9 + fine * .12));
            let r = dark[0] + (light[0] - dark[0]) * lightMix;
            let g = dark[1] + (light[1] - dark[1]) * lightMix;
            let b = dark[2] + (light[2] - dark[2]) * lightMix;
            const darkVein = Math.pow(1 - grain, 8);
            r -= darkVein * 16;
            g -= darkVein * 9;
            b -= darkVein * 5;
            r += (fine - .5) * 11 + pore * 8;
            g += (fine - .5) * 8 + pore * 5;
            b += (fine - .5) * 5 + pore * 3;
            r *= .92 + base[0] / 140;
            g *= .93 + base[1] / 150;
            b *= .94 + base[2] / 170;
            const edgeDark = Math.pow(Math.abs(v - .5) * 2, 6) * .18;
            r *= 1 - edgeDark;
            g *= 1 - edgeDark;
            b *= 1 - edgeDark;
            const i = (y * W + x) * 4;
            data[i] = Math.max(0, Math.min(255, r));
            data[i + 1] = Math.max(0, Math.min(255, g));
            data[i + 2] = Math.max(0, Math.min(255, b));
            data[i + 3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < 330; i++) {
        const y = rng() * H;
        const amp = 1.5 + rng() * 8;
        const wob = rng() * Math.PI * 2;
        ctx.beginPath();
        for (let x = -20; x <= W + 20; x += 22) {
            const yy = y + Math.sin(x * .009 + wob) * amp + Math.sin(x * .026 + wob * 2) * amp * .28;
            if (x === -20) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
        }
        ctx.strokeStyle = `rgba(${170 + rng() * 40},${120 + rng() * 30},${72 + rng() * 20},${.018 + rng() * .045})`;
        ctx.lineWidth = .5 + rng() * 1.4;
        ctx.stroke();
    }
    ctx.restore();
    for (let i = 0; i < 15; i++) {
        const x = rng() * W, y = rng() * H;
        const r = 20 + rng() * 145;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, `rgba(24,11,5,${.035 + rng() * .07})`);
        grad.addColorStop(.72, `rgba(24,11,5,${.012 + rng() * .025})`);
        grad.addColorStop(1, "rgba(24,11,5,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.lineCap = "round";
    for (let i = 0; i < 76; i++) {
        const x = rng() * W, y = rng() * H;
        const len = 25 + rng() * 320;
        const slope = (rng() - .5) * .035;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + len * .55, y + len * slope + (rng() - .5) * 5, x + len, y + len * slope);
        ctx.strokeStyle = `rgba(${Math.random() > .45 ? "204,169,112" : "26,13,7"},${.035 + rng() * .09})`;
        ctx.lineWidth = .35 + rng() * 1.1;
        ctx.stroke();
    }
    const lightGrad = ctx.createLinearGradient(0, H * .86, 0, H);
    lightGrad.addColorStop(0, "rgba(190,141,86,0)");
    lightGrad.addColorStop(.66, "rgba(190,141,86,0.075)");
    lightGrad.addColorStop(1, "rgba(220,171,110,0.14)");
    ctx.fillStyle = lightGrad;
    ctx.fillRect(0, H * .86, W, H * .14);
    const [roughCanvas, rctx] = canvas2d(768, 512);
    rctx.fillStyle = isDark ? "#b0b0b0" : "#989898";
    rctx.fillRect(0, 0, 768, 512);
    for (let i = 0; i < 900; i++) {
        const x = rng() * 768, y = rng() * 512;
        rctx.fillStyle = `rgba(${rng() > .5 ? "58,58,58" : "218,218,218"},${.02 + rng() * .08})`;
        rctx.fillRect(x, y, 8 + rng() * 120, .6 + rng() * 1.6);
    }
    for (let i = 0; i < 8; i++) {
        const x = rng() * 768, y = rng() * 512, r = 30 + rng() * 110;
        const grad = rctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, "rgba(220,220,220,0.2)");
        grad.addColorStop(1, "rgba(220,220,220,0)");
        rctx.fillStyle = grad;
        rctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const map = textureFromCanvas(canvas, {
        srgb: true,
        anisotropy: 16,
        wrap: true,
        repeat: opts.repeat
    });
    const bumpMap = textureFromCanvas(canvas, {
        anisotropy: 8,
        wrap: true,
        repeat: opts.repeat
    });
    const roughnessMap = textureFromCanvas(roughCanvas, {
        anisotropy: 8,
        wrap: true,
        repeat: opts.repeat
    });
    return {
        map: map,
        bumpMap: bumpMap,
        roughnessMap: roughnessMap,
        canvas: canvas
    };
}

export function makeVelvetTextures() {
    const S = 1024;
    const rng = mulberry32(9182);
    const [canvas, ctx] = canvas2d(S, S);
    const img = ctx.createImageData(S, S);
    const d = img.data;
    for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
            const u = x / S, v = y / S;
            const nap = valueNoise2(u * 1050, v * 190) * .35 + fbm(u * 30, v * 35, 3) * .65;
            const broad = fbm(u * 4.5, v * 4, 4);
            const patch = smooth(Math.min(1, Math.max(0, (fbm(u * 2.9 + 3.7, v * 2.6 + 1.3, 4) - .36) / .4)));
            const darkPatch = smooth(Math.min(1, Math.max(0, (fbm(u * 3.4 + 8.1, v * 3.1 + 5.7, 3) - .42) / .34)));
            const worn = Math.exp(-((u - .47) ** 2 / .12 + (v - .42) ** 2 / .19)) * .42;
            const curtain = Math.pow(Math.sin(v * 14 + fbm(u * 5, v * 3, 2) * 4) * .5 + .5, 1.6);
            let r = 2 + nap * 4 + broad * 5 + patch * 22 + (1 - darkPatch) * 7 + curtain * 1.2 + worn * 8;
            let g = 8 + nap * 10 + broad * 9 + patch * 48 + (1 - darkPatch) * 13 + curtain * 2.6 + worn * 21;
            let b = 4.5 + nap * 5.5 + broad * 8 + patch * 24 + (1 - darkPatch) * 8 + curtain * 1.4 + worn * 12;
            const fleck = valueNoise2(u * 1500, v * 650);
            if (fleck > .86) {
                r += 5;
                g += 12.5;
                b += 6.5;
            }
            const edge = Math.pow(Math.max(0, Math.abs(u - .5) * 1.85), 4) + Math.pow(Math.max(0, Math.abs(v - .5) * 1.85), 4);
            const eo = 1 - Math.min(.28, edge * .28);
            const i = (y * S + x) * 4;
            d[i] = r * eo;
            d[i + 1] = g * eo;
            d[i + 2] = b * eo;
            d[i + 3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
    ctx.lineCap = "round";
    for (let i = 0; i < 22e3; i++) {
        const x = rng() * S, y = rng() * S;
        const len = 2 + rng() * 15;
        const lean = (rng() - .5) * 2.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + lean, y + len);
        const light = rng() > .62;
        ctx.strokeStyle = light ? `rgba(${26 + rng() * 22},${58 + rng() * 32},${38 + rng() * 20},${.022 + rng() * .05})` : `rgba(1,6,4,${.045 + rng() * .085})`;
        ctx.lineWidth = .4 + rng() * 1.1;
        ctx.stroke();
    }
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < 30; i++) {
        const x = rng() * S, y = rng() * S, r = 40 + rng() * 150;
        const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, `rgba(32,78,54,${.022 + rng() * .036})`);
        gr.addColorStop(1, "rgba(32,78,54,0)");
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalCompositeOperation = "overlay";
    for (let i = 0; i < 620; i++) {
        const x = rng() * S, y = rng() * S;
        const len = 30 + rng() * 170;
        const lean = (rng() - .5) * 30;
        const light = rng() > .5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + lean * .5, y + len * .5, x + lean, y + len);
        ctx.strokeStyle = light ? `rgba(${52 + rng() * 46},${104 + rng() * 70},${72 + rng() * 44},${.06 + rng() * .12})` : `rgba(2,10,6,${.06 + rng() * .13})`;
        ctx.lineWidth = 2.5 + rng() * 11;
        ctx.stroke();
    }
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < 900; i++) {
        const x = rng() * S, y = rng() * S;
        const len = 20 + rng() * 90;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rng() - .5) * 8, y + len);
        ctx.strokeStyle = `rgba(${30 + rng() * 24},${74 + rng() * 42},${44 + rng() * 24},${.025 + rng() * .065})`;
        ctx.lineWidth = .8 + rng() * 2.4;
        ctx.stroke();
    }
    for (let i = 0; i < 90; i++) {
        const x = rng() * S, y = rng() * S, r = 24 + rng() * 150;
        const light = rng() > .42;
        const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, light ? `rgba(${42 + rng() * 34},${105 + rng() * 58},${62 + rng() * 31},${.06 + rng() * .08})` : `rgba(1,7,4,${.06 + rng() * .09})`);
        gr.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    const B = 512;
    const [bCanvas, bctx] = canvas2d(B, B);
    const bimg = bctx.createImageData(B, B);
    const bd = bimg.data;
    for (let y = 0; y < B; y++) {
        for (let x = 0; x < B; x++) {
            const u = x / B, v = y / B;
            const n = valueNoise2(u * 600, v * 280) * .45 + fbm(u * 95, v * 95, 3) * .55;
            const crease = fbm(u * 7.5 + 2.1, v * 8.6, 4);
            const napRidge = valueNoise2(u * 900, v * 110) * .5 + fbm(u * 180, v * 30, 2) * .5;
            const val = 42 + n * 150 + (crease - .5) * 92 + (napRidge - .5) * 60;
            const i = (y * B + x) * 4;
            bd[i] = bd[i + 1] = bd[i + 2] = val;
            bd[i + 3] = 255;
        }
    }
    bctx.putImageData(bimg, 0, 0);
    for (let i = 0; i < 13e3; i++) {
        const x = rng() * B, y = rng() * B;
        bctx.strokeStyle = `rgba(${rng() > .5 ? 245 : 18},${rng() > .5 ? 245 : 18},${rng() > .5 ? 245 : 18},${.03 + rng() * .1})`;
        bctx.beginPath();
        bctx.moveTo(x, y);
        bctx.lineTo(x + (rng() - .5) * 2, y + 2 + rng() * 9);
        bctx.stroke();
    }
    const R = 512;
    const [rCanvas, rctx] = canvas2d(R, R);
    const rimg = rctx.createImageData(R, R);
    const rd = rimg.data;
    for (let y = 0; y < R; y++) {
        for (let x = 0; x < R; x++) {
            const u = x / R, v = y / R;
            const grain = fbm(u * 70, v * 140, 3) * .45 + valueNoise2(u * 900, v * 500) * .2;
            const broad = fbm(u * 3.6 + 7, v * 3.1, 3);
            const patch = fbm(u * 6.5 + 2.4, v * 5.3 + 9.1, 3);
            const val = 232 - grain * 24 - (1 - broad) * 44 - Math.max(0, .5 - patch) * 56;
            const i = (y * R + x) * 4;
            rd[i] = rd[i + 1] = rd[i + 2] = Math.max(0, Math.min(255, val));
            rd[i + 3] = 255;
        }
    }
    rctx.putImageData(rimg, 0, 0);
    const roughnessMap = textureFromCanvas(rCanvas, {
        anisotropy: 4,
        repeat: [ 2.25, 1.6 ]
    });
    const map = textureFromCanvas(canvas, {
        srgb: true,
        anisotropy: 16,
        repeat: [ 2.25, 1.6 ]
    });
    const bumpMap = textureFromCanvas(bCanvas, {
        anisotropy: 8,
        repeat: [ 2.25, 1.6 ]
    });
    return {
        map: map,
        bumpMap: bumpMap,
        roughnessMap: roughnessMap,
        canvas: canvas
    };
}

const LABEL_WORDS = [ "MAINSPRINGS", "PALLETS", "BALANCE", "HANDS", "JEWELS", "SCREWS", "GEARS", "SPRINGS", "PINIONS", "ESCAPEMENT", "CROWNS", "ARBORS", "STEMS", "ROLLERS", "DIALS", "CASES", "PINS", "LEVERS", "STAKES", "BRIDGES", "BUSHES", "TRAIN", "FUSEE", "CLICKS", "RATCHETS", "KEYS", "CRYSTALS", "BEVELS", "POLISH", "GILT", "PLATINUM", "RUBIES", "PEARLS", "CHAINS", "SWARFS", "OILS", "ENAMEL", "SOLDER", "FILES", "DRILLS", "BROACHES", "SAWS", "BOWS", "PENDANTS", "SNUFFS", "VICES", "BURNISH", "TWEEZERS", "EYEGLASS", "CARRIERS", "MILLING", "WHEELS", "PIVOTS", "STONES", "LANCETS", "BOWS" ];

export function makeLabelAtlas() {
    const COLS = 8, ROWS = 8, CELL = 128;
    const [canvas, ctx] = canvas2d(COLS * CELL, ROWS * CELL);
    const rng = mulberry32(4881);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const idx = r * COLS + c;
            const x = c * CELL + 7 + rng() * 4;
            const y = r * CELL + 13 + rng() * 5;
            const w = CELL - 17 - rng() * 6;
            const h = CELL - 31 - rng() * 7;
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate((rng() - .5) * .018);
            const pale = rng();
            const paper = pale > .55 ? "#cbbb96" : pale > .22 ? "#d6c7a4" : "#c1ae84";
            ctx.fillStyle = paper;
            ctx.fillRect(0, 0, w, h);
            const grad = ctx.createLinearGradient(0, 0, w, h);
            grad.addColorStop(0, "rgba(255,247,218,0.24)");
            grad.addColorStop(.55, "rgba(255,255,255,0)");
            grad.addColorStop(1, "rgba(67,46,23,0.22)");
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
            for (let s = 0; s < 7; s++) {
                ctx.fillStyle = `rgba(88,63,31,${.025 + rng() * .055})`;
                ctx.beginPath();
                ctx.arc(rng() * w, rng() * h, .8 + rng() * 3.3, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.strokeStyle = "rgba(68,49,27,0.72)";
            ctx.lineWidth = .75;
            ctx.strokeRect(.8, .8, w - 1.6, h - 1.6);
            ctx.strokeStyle = "rgba(91,66,35,0.35)";
            ctx.lineWidth = .5;
            ctx.strokeRect(4, 4, w - 8, h - 8);
            const word = LABEL_WORDS[idx % LABEL_WORDS.length];
            const size = word.length > 9 ? 10.5 : word.length > 7 ? 12 : 14;
            ctx.fillStyle = "rgba(36,25,13,0.87)";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = `600 ${size}px "Avenir Next", "Gill Sans", sans-serif`;
            if (ctx.letterSpacing !== undefined) ctx.letterSpacing = "1.3px";
            ctx.fillText(word, w / 2, h * .51);
            ctx.fillStyle = "rgba(78,54,27,0.58)";
            ctx.font = '5.5px "Avenir Next", "Gill Sans", sans-serif';
            if (ctx.letterSpacing !== undefined) ctx.letterSpacing = "1.2px";
            ctx.fillText("VITRINE  " + String(18 + idx).padStart(2, "0"), w / 2, h * .79);
            ctx.fillStyle = "rgba(235,225,195,0.7)";
            ctx.beginPath();
            ctx.arc(w / 2, 9, 1.15, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
    const texture = textureFromCanvas(canvas, {
        srgb: true,
        anisotropy: 8
    });
    return {
        texture: texture,
        cols: COLS,
        rows: ROWS,
        canvas: canvas
    };
}

export function makeClockFaceTexture() {
    const S = 1024;
    const [canvas, ctx] = canvas2d(S, S);
    const cx = S / 2, cy = S / 2;
    const rng = mulberry32(1907);
    ctx.clearRect(0, 0, S, S);
    const bg = ctx.createRadialGradient(cx - 80, cy - 100, 30, cx, cy, 500);
    bg.addColorStop(0, "#f0e7d4");
    bg.addColorStop(.55, "#e7dcc5");
    bg.addColorStop(.86, "#dccdb1");
    bg.addColorStop(1, "#b9a684");
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(cx, cy, 500, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 22; i++) {
        const a = rng() * Math.PI * 2, rr = Math.sqrt(rng()) * 460;
        const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
        const r = 8 + rng() * 65;
        const g = ctx.createRadialGradient(x, y, 0, cx, cy, 500);
        g.addColorStop(0, `rgba(106,77,38,${.008 + rng() * .016})`);
        g.addColorStop(1, "rgba(106,77,38,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.strokeStyle = "rgba(80,61,39,0.11)";
    for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        let x = cx + (rng() - .5) * 300, y = cy + (rng() - .5) * 300;
        ctx.moveTo(x, y);
        for (let j = 0; j < 6; j++) {
            x += (rng() - .5) * 95;
            y += (rng() - .5) * 75;
            ctx.lineTo(x, y);
        }
        ctx.lineWidth = .55;
        ctx.stroke();
    }
    ctx.strokeStyle = "rgba(48,35,21,0.72)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 477, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(54,39,23,0.45)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 449, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 311, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(79,57,32,0.23)";
    ctx.beginPath();
    ctx.arc(cx, cy, 205, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineCap = "round";
    for (let i = 0; i < 300; i++) {
        const a = i / 300 * Math.PI * 2 - Math.PI / 2;
        const major = i % 25 === 0;
        const mid = i % 5 === 0;
        const r0 = major ? 420 : mid ? 432 : 444;
        const r1 = 462;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.strokeStyle = major ? "rgba(20,14,8,0.98)" : mid ? "rgba(28,20,11,0.9)" : "rgba(38,28,16,0.6)";
        ctx.lineWidth = major ? 3.2 : mid ? 1.6 : .9;
        ctx.stroke();
    }
    const numerals = [ "XII", "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X", "XI" ];
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < 12; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 6;
        const x = cx + Math.cos(a) * 358;
        const y = cy + Math.sin(a) * 358;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(0);
        ctx.fillStyle = "rgba(20,14,8,0.99)";
        ctx.font = '700 92px "Iowan Old Style", "Palatino Linotype", Georgia, serif';
        ctx.fillText(numerals[i], 0, 0);
        ctx.restore();
    }
    ctx.fillStyle = "rgba(48,34,19,0.78)";
    ctx.font = 'italic 22px "Iowan Old Style", Georgia, serif';
    ctx.fillText("Maison Verhoeven", cx, cy - 140);
    ctx.font = '12px "Avenir Next", "Gill Sans", sans-serif';
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = "3.2px";
    ctx.fillStyle = "rgba(54,39,22,0.62)";
    ctx.fillText("PARIS", cx, cy - 113);
    ctx.font = 'italic 15px "Iowan Old Style", Georgia, serif';
    ctx.fillStyle = "rgba(58,41,22,0.48)";
    ctx.fillText("Huit jours", cx, cy + 135);
    ctx.fillStyle = "rgba(29,21,12,0.62)";
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(235,223,197,0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.stroke();
    const texture = textureFromCanvas(canvas, {
        srgb: true,
        anisotropy: 16
    });
    return {
        texture: texture,
        canvas: canvas
    };
}

export function makeWatchDialTexture(seed = 3, style = 0) {
    const S = 512;
    const rng = mulberry32(seed);
    const [canvas, ctx] = canvas2d(S, S);
    const cx = S / 2, cy = S / 2;
    const g = ctx.createRadialGradient(cx - 35, cy - 45, 20, cx, cy, 250);
    g.addColorStop(0, style === 1 ? "#e7d7b4" : "#f0e8d6");
    g.addColorStop(.75, style === 1 ? "#cdb78d" : "#ddd0b4");
    g.addColorStop(1, "#a88f67");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, 252, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 20; i++) {
        ctx.fillStyle = `rgba(105,75,36,${.015 + rng() * .03})`;
        ctx.beginPath();
        ctx.arc(rng() * S, rng() * S, 2 + rng() * 32, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.strokeStyle = "rgba(45,31,18,0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 232, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(52,37,20,0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 214, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 60; i++) {
        const a = i / 60 * Math.PI * 2 - Math.PI / 2;
        const outer = 226, inner = i % 5 === 0 ? 196 : 211;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
        ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
        ctx.strokeStyle = "rgba(36,25,15,0.76)";
        ctx.lineWidth = i % 5 === 0 ? 3 : 1.2;
        ctx.stroke();
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const values = style === 1 ? [ "12", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11" ] : [ "XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI" ];
    for (let i = 0; i < 12; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 6;
        const x = cx + Math.cos(a) * 168, y = cy + Math.sin(a) * 168;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a + Math.PI / 2);
        ctx.fillStyle = "rgba(34,25,16,0.9)";
        ctx.font = `${style === 1 ? 48 : 39}px "Iowan Old Style", Georgia, serif`;
        ctx.fillText(values[i], 0, 0);
        ctx.restore();
    }
    ctx.fillStyle = "rgba(55,37,18,0.68)";
    ctx.font = 'italic 17px "Iowan Old Style", Georgia, serif';
    ctx.fillText("V E R H O E V E N", cx, cy + 47);
    ctx.font = '10px "Avenir Next", sans-serif';
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = "2px";
    ctx.fillStyle = "rgba(55,37,18,0.45)";
    ctx.fillText("PARIS", cx, cy + 71);
    ctx.fillStyle = "rgba(40,28,15,0.55)";
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    return textureFromCanvas(canvas, {
        srgb: true,
        anisotropy: 8
    });
}

export function makeContactShadowTexture() {
    const S = 256;
    const [canvas, ctx] = canvas2d(S, S);
    const g = ctx.createRadialGradient(S / 2, S / 2, 4, S / 2, S / 2, S / 2);
    g.addColorStop(0, "rgba(0,0,0,0.78)");
    g.addColorStop(.28, "rgba(0,0,0,0.6)");
    g.addColorStop(.62, "rgba(0,0,0,0.22)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    return textureFromCanvas(canvas, {
        srgb: false
    });
}

export function makeGlowTexture() {
    const S = 256;
    const [canvas, ctx] = canvas2d(S, S);
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, "rgba(255,246,216,1)");
    g.addColorStop(.1, "rgba(255,214,145,0.92)");
    g.addColorStop(.4, "rgba(255,164,85,0.27)");
    g.addColorStop(1, "rgba(255,120,40,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    return textureFromCanvas(canvas, {
        srgb: true
    });
}

export function makeDustTexture() {
    const S = 64;
    const [canvas, ctx] = canvas2d(S, S);
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    g.addColorStop(0, "rgba(255,230,185,1)");
    g.addColorStop(.22, "rgba(255,203,131,0.6)");
    g.addColorStop(1, "rgba(255,180,100,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    return textureFromCanvas(canvas, {
        srgb: true
    });
}

export function makeEnvTexture() {
    const W = 1024, H = 512;
    const values = new Float32Array(W * H * 4);
    for (let y = 0; y < H; y++) {
        const v = 1 - y / (H - 1);
        for (let x = 0; x < W; x++) {
            const u = x / (W - 1);
            let r = .01 + Math.pow(Math.max(0, 1 - Math.abs(v - .5) * 3.2), 2) * .031;
            let g = .006 + Math.pow(Math.max(0, 1 - Math.abs(v - .5) * 3.2), 2) * .018;
            let b = .004 + Math.pow(Math.max(0, 1 - Math.abs(v - .5) * 3.2), 2) * .009;
            r += Math.pow(v, 2.4) * .008;
            g += Math.pow(v, 2.4) * .005;
            b += Math.pow(v, 2.4) * .003;
            const lu = .77, lv = .61;
            let du = u - lu;
            du = du - Math.round(du);
            const dv = v - lv;
            const d2 = (du * 2) ** 2 + (dv * 1.15) ** 2;
            const lampCore = Math.exp(-d2 / .00125) * 24;
            const lampHalo = Math.exp(-d2 / .032) * 1.15;
            r += lampCore * 1 + lampHalo * 1;
            g += lampCore * .56 + lampHalo * .52;
            b += lampCore * .23 + lampHalo * .2;
            const wu = u - .17, wv = v - .48;
            const windowMask = Math.exp(-((wu * 2.9) ** 2 + (wv * 1.4) ** 2) / .045);
            const mullions = Math.sin(u * 150) > .82 || Math.sin(v * 72) > .9 ? .25 : 1;
            r += windowMask * .32 * mullions;
            g += windowMask * .42 * mullions;
            b += windowMask * .55 * mullions;
            for (const [su, sv, sr, sg, sb, amt] of [ [ .38, .44, 1, .55, .21, .32 ], [ .93, .38, 1, .46, .16, .12 ], [ .58, .35, 1, .72, .36, .1 ] ]) {
                let suu = u - su;
                suu -= Math.round(suu);
                const dd = (suu * 2.2) ** 2 + (v - sv) ** 2 * 3;
                const glow = Math.exp(-dd / .014) * amt;
                r += glow * sr;
                g += glow * sg;
                b += glow * sb;
            }
            if (v < .24) {
                const drop = Math.pow((.24 - v) / .24, 1.3);
                r *= 1 - drop * .82;
                g *= 1 - drop * .84;
                b *= 1 - drop * .84;
            }
            const line = Math.exp(-((v - .265) ** 2 / 6e-5)) * .36;
            r += line;
            g += line * .62;
            b += line * .31;
            const i = (y * W + x) * 4;
            values[i] = r;
            values[i + 1] = g;
            values[i + 2] = b;
            values[i + 3] = 1;
        }
    }
    const tex = new THREE.DataTexture(values, W, H, THREE.RGBAFormat, THREE.FloatType);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.LinearSRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
}

export function makePortraitTexture() {
    const W = 420, H = 540;
    const rng = mulberry32(771);
    const [canvas, ctx] = canvas2d(W, H);
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#655b4a");
    bg.addColorStop(.55, "#4d4436");
    bg.addColorStop(1, "#28231b");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(188,177,145,0.22)";
    ctx.fillRect(20, 24, 120, 270);
    ctx.fillStyle = "rgba(30,27,21,0.55)";
    ctx.fillRect(80, 24, 8, 270);
    ctx.fillRect(20, 130, 120, 7);
    const p = (x, y, rx, ry, color) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
    };
    p(145, 385, 92, 140, "rgba(37,33,27,0.92)");
    p(270, 402, 78, 128, "rgba(50,43,33,0.9)");
    p(145, 240, 50, 64, "rgba(99,82,62,0.9)");
    ctx.fillStyle = "rgba(37,30,23,0.9)";
    ctx.beginPath();
    ctx.ellipse(145, 196, 55, 33, .08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(130, 215, 30, 50);
    p(270, 245, 43, 57, "rgba(112,91,67,0.82)");
    ctx.fillStyle = "rgba(45,35,25,0.9)";
    ctx.beginPath();
    ctx.arc(270, 202, 43, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "rgba(168,140,106,0.35)";
    ctx.beginPath();
    ctx.ellipse(145, 253, 30, 39, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(38,28,20,0.65)";
    ctx.fillRect(130, 252, 8, 3);
    ctx.fillRect(154, 252, 8, 3);
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < 20; i++) {
        ctx.fillStyle = `rgba(233,220,182,${.012 + rng() * .032})`;
        ctx.beginPath();
        ctx.arc(rng() * W, rng() * H, 2 + rng() * 44, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    const img = ctx.getImageData(0, 0, W, H), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
        const n = (rng() - .5) * 17;
        d[i] += n;
        d[i + 1] += n * .94;
        d[i + 2] += n * .8;
    }
    ctx.putImageData(img, 0, 0);
    ctx.strokeStyle = "rgba(225,215,190,0.42)";
    ctx.lineWidth = 7;
    ctx.strokeRect(8, 8, W - 16, H - 16);
    ctx.fillStyle = "rgba(230,220,198,0.24)";
    ctx.fillRect(0, H - 34, W, 34);
    return textureFromCanvas(canvas, {
        srgb: true,
        anisotropy: 8
    });
}

export function makeLensClothTexture() {
    const S = 256;
    const [canvas, ctx] = canvas2d(S, S);
    const rng = mulberry32(325);
    ctx.fillStyle = "#bd8a44";
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 3e3; i++) {
        ctx.fillStyle = `rgba(${rng() > .5 ? "250,218,160" : "80,47,18"},${.02 + rng() * .06})`;
        ctx.fillRect(rng() * S, rng() * S, 1 + rng() * 12, .5 + rng() * 1.2);
    }
    ctx.strokeStyle = "rgba(75,45,20,0.35)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 16; i++) {
        ctx.beginPath();
        const y = rng() * S;
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(S * .3, y + 12, S * .7, y - 11, S, y + 4);
        ctx.stroke();
    }
    return textureFromCanvas(canvas, {
        srgb: true,
        anisotropy: 4
    });
}
