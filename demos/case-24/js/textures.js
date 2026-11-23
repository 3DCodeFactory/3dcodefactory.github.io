import * as THREE from "three";

export function mulberry32(seed) {
    let a = seed >>> 0;
    return function() {
        a += 1831565813;
        let t = a;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

function canvas2d(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
}

function tex(canvas, {srgb: srgb = true, repeat: repeat = null, aniso: aniso = 8} = {}) {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = aniso;
    t.wrapS = THREE.ClampToEdgeWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    if (repeat) {
        t.wrapS = THREE.RepeatWrapping;
        t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(repeat[0], repeat[1]);
    }
    t.needsUpdate = true;
    return t;
}

function drawSoftBlob(ctx, x, y, rx, ry, color, alpha, rotation = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(rx, ry);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, color.replace("ALPHA", String(alpha)));
    g.addColorStop(.38, color.replace("ALPHA", String(alpha * .72)));
    g.addColorStop(1, color.replace("ALPHA", "0"));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function addFineNoise(ctx, w, h, rand, amount = .18, size = 256) {
    const tile = canvas2d(size, size);
    const tctx = tile.getContext("2d");
    const img = tctx.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
        const v = 96 + Math.floor(rand() * 80);
        img.data[i] = v;
        img.data[i + 1] = v;
        img.data[i + 2] = v;
        img.data[i + 3] = Math.floor(rand() * 90);
    }
    tctx.putImageData(img, 0, 0);
    const pattern = ctx.createPattern(tile, "repeat");
    ctx.save();
    ctx.globalAlpha = amount;
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
}

function fieldBlots(ctx, w, h, rand, count, palette, alphaScale = 1) {
    for (let i = 0; i < count; i++) {
        const r = palette[Math.floor(rand() * palette.length)];
        const x = rand() * w;
        const y = rand() * h;
        const rx = r.min + rand() * (r.max - r.min);
        const ry = rx * (.3 + rand() * 1.7);
        const alpha = (r.alpha[0] + rand() * (r.alpha[1] - r.alpha[0])) * alphaScale;
        drawSoftBlob(ctx, x, y, rx, ry, r.col, alpha, rand() * Math.PI);
    }
}

function drawCrack(ctx, x, y, steps, scale, rand, color = "rgba(35,31,25,0.42)") {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = .65 + rand() * 1.3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    let dir = -Math.PI / 2 + (rand() - .5) * 1.3;
    for (let i = 0; i < steps; i++) {
        dir += (rand() - .5) * .85;
        x += Math.cos(dir) * scale * (.35 + rand());
        y += Math.sin(dir) * scale * (.35 + rand());
        ctx.lineTo(x, y);
        if (rand() < .09 && i > 2) {
            ctx.stroke();
            const sx = x;
            const sy = y;
            let bdir = dir + (rand() < .5 ? -1 : 1) * (.45 + rand() * .7);
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            for (let j = 0; j < 6; j++) {
                bdir += (rand() - .5) * .8;
                x += Math.cos(bdir) * scale * .55;
                y += Math.sin(bdir) * scale * .55;
                ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y);
        }
    }
    ctx.stroke();
    ctx.restore();
}

function drawRustStreak(ctx, x, y, w, h, rand, strength = .18) {
    ctx.save();
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, `rgba(88,52,27,${strength})`);
    g.addColorStop(.5, `rgba(78,48,28,${strength * .55})`);
    g.addColorStop(1, "rgba(70,43,24,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w * (.72 + rand() * .35), y + h);
    ctx.lineTo(x + w * (.08 + rand() * .22), y + h * (.7 + rand() * .3));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

const FLOOR = {
    x0: -15,
    x1: 22,
    z0: -32,
    z1: 12,
    w: 37,
    d: 44
};

function floorUv(x, z, w, h) {
    return [ (x - FLOOR.x0) / FLOOR.w * w, (z - FLOOR.z0) / FLOOR.d * h ];
}

function bezierWorld(p0, p1, p2, p3, n = 30) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
        const t = i / n;
        const it = 1 - t;
        pts.push([ it * it * it * p0[0] + 3 * it * it * t * p1[0] + 3 * it * t * t * p2[0] + t * t * t * p3[0], it * it * it * p0[1] + 3 * it * it * t * p1[1] + 3 * it * t * t * p2[1] + t * t * t * p3[1] ]);
    }
    return pts;
}

function drawTyreScuff(ctx, W, H, rand, points, widthPx, opacity) {
    const mapped = points.map(([x, z]) => floorUv(x, z, W, H));
    const normals = mapped.map((p, i) => {
        const a = mapped[Math.max(i - 1, 0)];
        const b = mapped[Math.min(i + 1, mapped.length - 1)];
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const len = Math.hypot(dx, dy) || 1;
        return [ -dy / len, dx / len ];
    });
    const passes = 7;
    for (let pass = 0; pass < passes; pass++) {
        const spread = (pass / (passes - 1) - .5) * widthPx * .9;
        ctx.save();
        ctx.strokeStyle = `rgba(21,19,16,${opacity * (.22 + (1 - Math.abs(spread) / (widthPx * .45)) * .58)})`;
        ctx.lineWidth = widthPx * (.44 - pass * .028);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        for (let i = 0; i < mapped.length; i++) {
            const jitter = (rand() - .5) * widthPx * .13;
            const x = mapped[i][0] + normals[i][0] * spread + jitter;
            const y = mapped[i][1] + normals[i][1] * spread + (rand() - .5) * widthPx * .18;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
    }
    for (let r = 0; r < 9; r++) {
        ctx.save();
        ctx.strokeStyle = `rgba(13,12,10,${opacity * (.18 + rand() * .24)})`;
        ctx.lineWidth = 1 + rand() * 3.5;
        ctx.lineCap = "round";
        for (let i = 0; i < mapped.length; i += 2) {
            if (rand() < .42) continue;
            const off = (rand() - .5) * widthPx * .78;
            const x = mapped[i][0] + normals[i][0] * off;
            const y = mapped[i][1] + normals[i][1] * off;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + normals[i][0] * (2 + rand() * 9), y + normals[i][1] * (2 + rand() * 9));
            ctx.stroke();
        }
        ctx.restore();
    }
    for (let i = 0; i < 720; i++) {
        const p = mapped[Math.floor(rand() * mapped.length)];
        const a = rand() * Math.PI * 2;
        const rad = widthPx * (.15 + rand() * .95);
        ctx.fillStyle = `rgba(16,15,13,${.03 + rand() * .1})`;
        ctx.beginPath();
        ctx.ellipse(p[0] + Math.cos(a) * rad, p[1] + Math.sin(a) * rad, .7 + rand() * 3.4, .5 + rand() * 2.2, a, 0, Math.PI * 2);
        ctx.fill();
    }
}

export function createFloorTextures() {
    const W = 2048;
    const H = 4096;
    const rand = mulberry32(2638157729);
    const c = canvas2d(W, H);
    const ctx = c.getContext("2d", {
        willReadFrequently: false
    });
    ctx.fillStyle = "#716d61";
    ctx.fillRect(0, 0, W, H);
    fieldBlots(ctx, W, H, rand, 86, [ {
        col: "rgba(24,22,18,ALPHA)",
        alpha: [ .07, .24 ],
        min: 180,
        max: 760
    }, {
        col: "rgba(124,107,78,ALPHA)",
        alpha: [ .03, .12 ],
        min: 140,
        max: 480
    }, {
        col: "rgba(198,192,175,ALPHA)",
        alpha: [ .022, .075 ],
        min: 120,
        max: 430
    } ]);
    for (let i = 0; i < 44; i++) {
        const x = rand() * W;
        const y = rand() * H;
        drawSoftBlob(ctx, x, y, 35 + rand() * 160, 500 + rand() * 1e3, "rgba(28,26,21,ALPHA)", .035 + rand() * .075, (rand() - .5) * .2);
    }
    const dampPatches = [ [ -9.6, 6.4, 300, 130, .26 ], [ -6.9, 5.1, 260, 180, .31 ], [ -4.1, 3.2, 210, 320, .24 ], [ -11.4, 1.2, 220, 260, .29 ], [ -8.3, -1.7, 330, 150, .32 ], [ -3, -3.5, 260, 190, .22 ], [ -6.1, -7.7, 180, 260, .19 ], [ -12.1, -6.4, 170, 230, .25 ], [ 1.2, -2, 280, 260, .16 ], [ -.8, 6.5, 240, 180, .18 ], [ -9, 9.5, 260, 120, .22 ], [ -5.4, 8.6, 190, 130, .18 ] ];
    for (const [wx, wz, rx, ry, a] of dampPatches) {
        const [px, py] = floorUv(wx, wz, W, H);
        drawSoftBlob(ctx, px, py, rx, ry, "rgba(20,19,16,ALPHA)", a, (rand() - .5) * 1.4);
        drawSoftBlob(ctx, px + (rand() - .5) * rx, py + (rand() - .5) * ry, rx * .46, ry * .55, "rgba(13,13,11,ALPHA)", a * .72, rand() * Math.PI);
    }
    for (const [wx, wz, rx, ry, a] of [ [ -7.3, 4.3, 280, 105, .36 ], [ -5.2, 1.7, 330, 150, .3 ], [ -9.1, -.7, 240, 190, .3 ], [ -2.6, .9, 270, 125, .26 ], [ -4.1, 4.6, 200, 90, .25 ], [ -7.9, -2.3, 190, 150, .23 ] ]) {
        const [px, py] = floorUv(wx, wz, W, H);
        drawSoftBlob(ctx, px, py, rx, ry, "rgba(18,17,14,ALPHA)", a, (rand() - .5) * 1.1);
        drawSoftBlob(ctx, px + (rand() - .5) * rx * .7, py + (rand() - .5) * ry * .6, rx * .5, ry * .5, "rgba(12,12,10,ALPHA)", a * .7, rand() * Math.PI);
    }
    for (const [pts, rx, ry, alpha] of [ [ bezierWorld([ -1, 7.2 ], [ -.5, 3.4 ], [ -1.6, -.6 ], [ -5.1, -4.2 ], 34), 210, 85, .26 ], [ bezierWorld([ 2.4, 2.2 ], [ 1.2, -1.1 ], [ -.9, -5.2 ], [ -4.4, -7.4 ], 30), 190, 72, .21 ], [ bezierWorld([ -6.2, 8.6 ], [ -5, 5 ], [ -3.4, 1.4 ], [ -1.1, -2 ], 28), 170, 64, .2 ] ]) {
        for (const [x, z] of pts) {
            const [px, py] = floorUv(x, z, W, H);
            drawSoftBlob(ctx, px, py, rx, ry, "rgba(24,22,18,ALPHA)", alpha, (rand() - .5) * .7);
        }
    }
    drawTyreScuff(ctx, W, H, rand, bezierWorld([ -.4, 6.7 ], [ .1, 2.9 ], [ -1.9, -1.7 ], [ -5.9, -4.4 ], 36), 36, .3);
    drawTyreScuff(ctx, W, H, rand, bezierWorld([ 2.7, 1.8 ], [ 1.6, -1.8 ], [ -.3, -5.4 ], [ -3.4, -8.2 ], 32), 30, .26);
    for (let i = 0; i < 26; i++) {
        const cx = W * (.18 + rand() * .64);
        const cy = H * (.48 + rand() * .44);
        const rad = 120 + rand() * 620;
        ctx.save();
        ctx.strokeStyle = rand() < .55 ? `rgba(210,203,184,${.014 + rand() * .03})` : `rgba(24,23,19,${.02 + rand() * .05})`;
        ctx.lineWidth = 3 + rand() * 16;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, rand() * Math.PI, Math.PI + rand() * Math.PI);
        ctx.stroke();
        ctx.restore();
    }
    for (let i = 0; i < 18; i++) {
        const [px] = [ W * (.14 + rand() * .55) ];
        const py = H * (.52 + rand() * .44);
        for (let j = 0; j < 5; j++) {
            ctx.fillStyle = `rgba(14,14,12,${.05 + rand() * .13})`;
            ctx.beginPath();
            ctx.ellipse(px + (rand() - .5) * 130, py + (rand() - .5) * 70, 14 + rand() * 70, 7 + rand() * 34, rand() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    addFineNoise(ctx, W, H, rand, .25, 512);
    for (let i = 0; i < 22e3; i++) {
        const x = rand() * W;
        const y = rand() * H;
        const r = .4 + rand() * 2.7;
        const light = rand() < .42;
        ctx.fillStyle = light ? `rgba(213,204,185,${.06 + rand() * .28})` : `rgba(26,24,19,${.06 + rand() * .34})`;
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * (.5 + rand() * 1.3), rand() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }
    for (let i = 0; i < 1e3; i++) {
        const x = rand() * W;
        const y = rand() * H;
        const r = 2 + rand() * 8;
        const kind = rand();
        ctx.fillStyle = kind < .28 ? `rgba(19,18,15,${.15 + rand() * .28})` : kind < .55 ? `rgba(224,216,197,${.07 + rand() * .22})` : `rgba(91,73,48,${.06 + rand() * .18})`;
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * (.45 + rand()), rand() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }
    for (let i = 0; i < 34; i++) {
        const [x, z] = [ -15 + rand() * 5.5, -10 + rand() * 19 ];
        const [px, py] = floorUv(x, z, W, H);
        drawSoftBlob(ctx, px, py, 40 + rand() * 220, 80 + rand() * 420, "rgba(22,20,16,ALPHA)", .035 + rand() * .11, rand() * Math.PI);
    }
    {
        const [px, py] = floorUv(-12.3, -2.6, W, H);
        drawSoftBlob(ctx, px, py, 210, 130, "rgba(15,14,12,ALPHA)", .46, .25);
        drawSoftBlob(ctx, px + 80, py - 45, 90, 46, "rgba(12,12,11,ALPHA)", .52, -.2);
        for (let i = 0; i < 18; i++) {
            ctx.strokeStyle = `rgba(16,15,12,${.1 + rand() * .16})`;
            ctx.lineWidth = 1 + rand() * 4;
            ctx.beginPath();
            ctx.moveTo(px + (rand() - .5) * 150, py + (rand() - .5) * 80);
            ctx.quadraticCurveTo(px + (rand() - .5) * 260, py + (rand() - .5) * 160, px + (rand() - .5) * 300, py + 40 + (rand() - .5) * 180);
            ctx.stroke();
        }
    }
    for (const [wx, wz, rx, ry, a] of [ [ -8.2, 1.2, 260, 150, .3 ], [ -5.8, -2.8, 190, 240, .23 ], [ -11.4, 2.8, 180, 100, .36 ], [ -3.9, 1.8, 120, 90, .18 ], [ -7.9, 5.6, 150, 70, .23 ], [ -2.2, -6.5, 300, 95, .16 ], [ -9.8, -1.3, 120, 70, .26 ], [ -6.4, 4.2, 110, 55, .2 ] ]) {
        const [px, py] = floorUv(wx, wz, W, H);
        drawSoftBlob(ctx, px, py, rx, ry, "rgba(26,24,20,ALPHA)", a, (rand() - .5) * .8);
    }
    {
        const pts = bezierWorld([ -9.25, 3.9 ], [ -9, 2.2 ], [ -7.4, .1 ], [ -4.2, -1 ], 30);
        ctx.save();
        ctx.strokeStyle = "rgba(22,20,16,0.12)";
        ctx.lineWidth = 20;
        ctx.lineCap = "round";
        ctx.beginPath();
        pts.forEach(([x, z], i) => {
            const [px, py] = floorUv(x, z, W, H);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        });
        ctx.stroke();
        ctx.restore();
    }
    const mainA = bezierWorld([ -10.85, 5.2 ], [ -10.5, 3.9 ], [ -8.8, .5 ], [ -4.25, -2.15 ], 42);
    const mainB = bezierWorld([ -10.75, 6.05 ], [ -9.9, 4 ], [ -8.15, 1.15 ], [ -3.25, -1.2 ], 42);
    const otherA = bezierWorld([ -11.7, 4.4 ], [ -11.2, 2.5 ], [ -9.8, -.7 ], [ -7.2, -3.15 ], 34);
    drawTyreScuff(ctx, W, H, rand, mainA, 60, .55);
    drawTyreScuff(ctx, W, H, rand, mainB, 54, .48);
    drawTyreScuff(ctx, W, H, rand, otherA, 46, .38);
    drawTyreScuff(ctx, W, H, rand, bezierWorld([ -13.2, -.6 ], [ -11.6, -2.8 ], [ -8.6, -4.8 ], [ -3.8, -5 ], 40), 48, .3);
    drawTyreScuff(ctx, W, H, rand, bezierWorld([ -4.6, 4.6 ], [ -2.3, 2.1 ], [ -.6, -2.4 ], [ 1.7, -7.5 ], 36), 42, .24);
    for (let i = 0; i < 22; i++) {
        const x = -14 + rand() * 7;
        const z = -7 + rand() * 14;
        const [px, py] = floorUv(x, z, W, H);
        const len = 60 + rand() * 360;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(-.35 + (rand() - .5) * .8);
        ctx.strokeStyle = `rgba(28,25,20,${.025 + rand() * .055})`;
        ctx.lineWidth = 3 + rand() * 10;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-len / 2, 0);
        ctx.quadraticCurveTo(0, (rand() - .5) * 30, len / 2, (rand() - .5) * 50);
        ctx.stroke();
        ctx.restore();
    }
    for (let i = 0; i < 38; i++) {
        drawCrack(ctx, rand() * W, rand() * H, 9 + Math.floor(rand() * 35), 2 + rand() * 9, rand, `rgba(35,31,24,${.16 + rand() * .3})`);
    }
    {
        const [px, py] = floorUv(-7.5, 1, W, H);
        drawCrack(ctx, px, py, 36, 8, rand, "rgba(30,27,21,0.62)");
    }
    for (let i = 0; i < 140; i++) {
        const x = rand() * W;
        const y = rand() * H;
        ctx.strokeStyle = `rgba(218,210,191,${.035 + rand() * .1})`;
        ctx.lineWidth = .5 + rand();
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rand() - .5) * 70, y + (rand() - .5) * 18);
        ctx.stroke();
    }
    ctx.save();
    ctx.globalAlpha = .15;
    ctx.fillStyle = "#b38e32";
    for (let z = -34; z < 7; z += 3.2) {
        if (rand() < .18) continue;
        const [px, py] = floorUv(-14.3, z, W, H);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate((rand() - .5) * .02);
        ctx.fillRect(-3, 0, 6, 120 + rand() * 80);
        ctx.restore();
    }
    ctx.restore();
    const map = tex(c, {
        srgb: true
    });
    map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
    const rw = 1024;
    const rh = 2048;
    const rc = canvas2d(rw, rh);
    const rctx = rc.getContext("2d");
    rctx.fillStyle = "#b3aea5";
    rctx.fillRect(0, 0, rw, rh);
    fieldBlots(rctx, rw, rh, rand, 80, [ {
        col: "rgba(96,90,81,ALPHA)",
        alpha: [ .06, .26 ],
        min: 60,
        max: 320
    }, {
        col: "rgba(222,218,208,ALPHA)",
        alpha: [ .03, .16 ],
        min: 60,
        max: 300
    }, {
        col: "rgba(54,52,48,ALPHA)",
        alpha: [ .04, .2 ],
        min: 45,
        max: 230
    } ]);
    addFineNoise(rctx, rw, rh, rand, .22, 256);
    for (const [pts, width] of [ [ mainA, 22 ], [ mainB, 19 ], [ otherA, 16 ] ]) {
        rctx.save();
        rctx.strokeStyle = "rgba(58,55,50,0.17)";
        rctx.lineWidth = width;
        rctx.lineCap = "round";
        rctx.lineJoin = "round";
        rctx.beginPath();
        pts.forEach(([x, z], i) => {
            const [px, py] = floorUv(x, z, rw, rh);
            if (i === 0) rctx.moveTo(px, py); else rctx.lineTo(px, py);
        });
        rctx.stroke();
        rctx.restore();
    }
    {
        const [px, py] = floorUv(-12.3, -2.6, rw, rh);
        drawSoftBlob(rctx, px, py, 75, 40, "rgba(54,51,46,ALPHA)", .55, .2);
        const g = rctx.createRadialGradient(px + 30, py - 12, 2, px + 30, py - 12, 90);
        g.addColorStop(0, "rgba(215,210,198,0.30)");
        g.addColorStop(1, "rgba(215,210,198,0)");
        rctx.fillStyle = g;
        rctx.beginPath();
        rctx.arc(px + 30, py - 12, 90, 0, Math.PI * 2);
        rctx.fill();
    }
    const roughnessMap = tex(rc, {
        srgb: false
    });
    const hw = 1024;
    const hh = 2048;
    const hc = canvas2d(hw, hh);
    const hctx = hc.getContext("2d");
    hctx.fillStyle = "#808080";
    hctx.fillRect(0, 0, hw, hh);
    fieldBlots(hctx, hw, hh, rand, 90, [ {
        col: "rgba(40,40,40,ALPHA)",
        alpha: [ .04, .2 ],
        min: 40,
        max: 220
    }, {
        col: "rgba(220,220,220,ALPHA)",
        alpha: [ .03, .15 ],
        min: 40,
        max: 200
    } ]);
    addFineNoise(hctx, hw, hh, rand, .35, 256);
    for (let i = 0; i < 16e3; i++) {
        const v = Math.floor(60 + rand() * 150);
        hctx.fillStyle = `rgba(${v},${v},${v},${.06 + rand() * .3})`;
        const x = rand() * hw;
        const y = rand() * hh;
        const r = .4 + rand() * 2.2;
        hctx.beginPath();
        hctx.arc(x, y, r, 0, Math.PI * 2);
        hctx.fill();
    }
    const normC = canvas2d(hw, hh);
    const nctx = normC.getContext("2d");
    const src = hctx.getImageData(0, 0, hw, hh).data;
    const out = nctx.createImageData(hw, hh);
    const strength = 2.4;
    for (let y = 0; y < hh; y++) {
        const yu = Math.max(0, y - 1);
        const yd = Math.min(hh - 1, y + 1);
        for (let x = 0; x < hw; x++) {
            const xl = Math.max(0, x - 1);
            const xr = Math.min(hw - 1, x + 1);
            const l = src[(y * hw + xl) * 4] / 255;
            const r = src[(y * hw + xr) * 4] / 255;
            const u = src[(yu * hw + x) * 4] / 255;
            const d = src[(yd * hw + x) * 4] / 255;
            let nx = (l - r) * strength;
            let ny = (d - u) * strength;
            const nz = 1;
            const inv = 1 / Math.hypot(nx, ny, nz);
            const i = (y * hw + x) * 4;
            out.data[i] = (nx * inv * .5 + .5) * 255;
            out.data[i + 1] = (ny * inv * .5 + .5) * 255;
            out.data[i + 2] = (nz * inv * .5 + .5) * 255;
            out.data[i + 3] = 255;
        }
    }
    nctx.putImageData(out, 0, 0);
    const normalMap = tex(normC, {
        srgb: false
    });
    return {
        map: map,
        roughnessMap: roughnessMap,
        normalMap: normalMap
    };
}

export function createJambEdgeTexture() {
    const rand = mulberry32(3107473);
    const W = 128;
    const H = 1024;
    const c = canvas2d(W, H);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#d9d2c3";
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 220; i++) {
        ctx.strokeStyle = rand() < .65 ? `rgba(68,62,52,${.02 + rand() * .08})` : `rgba(255,252,242,${.02 + rand() * .06})`;
        ctx.lineWidth = .5 + rand() * 1.8;
        const x = rand() * W;
        ctx.beginPath();
        ctx.moveTo(x, rand() * H);
        ctx.lineTo(x + (rand() - .5) * 4, rand() * H);
        ctx.stroke();
    }
    for (let i = 0; i < 30; i++) {
        const x = rand() * W;
        const y0 = rand() * H * .7;
        const len = 60 + rand() * 460;
        const g = ctx.createLinearGradient(0, y0, 0, y0 + len);
        g.addColorStop(0, "rgba(40,35,28,0)");
        g.addColorStop(.35, `rgba(40,35,28,${.05 + rand() * .18})`);
        g.addColorStop(1, "rgba(40,35,28,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x, y0, 1 + rand() * 6, len);
    }
    ctx.fillStyle = "rgba(45,40,32,0.26)";
    ctx.fillRect(0, H * .42, W, 2 + rand() * 3);
    ctx.fillStyle = "rgba(35,31,25,0.18)";
    ctx.fillRect(0, H * .7, W, 1 + rand() * 2);
    for (let i = 0; i < 34; i++) {
        const x = rand() * W;
        const y = rand() * H;
        ctx.fillStyle = `rgba(34,30,24,${.06 + rand() * .2})`;
        ctx.beginPath();
        ctx.ellipse(x, y, .8 + rand() * 4, .6 + rand() * 12, rand() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }
    const foot = ctx.createLinearGradient(0, H * .86, 0, H);
    foot.addColorStop(0, "rgba(58,42,26,0)");
    foot.addColorStop(1, "rgba(58,42,26,0.22)");
    ctx.fillStyle = foot;
    ctx.fillRect(0, H * .86, W, H * .14);
    const shade = ctx.createLinearGradient(0, 0, W, 0);
    shade.addColorStop(0, "rgba(52,46,37,0)");
    shade.addColorStop(.42, "rgba(52,46,37,0.035)");
    shade.addColorStop(.72, "rgba(52,46,37,0.13)");
    shade.addColorStop(.9, "rgba(34,30,23,0.34)");
    shade.addColorStop(.965, "rgba(24,21,16,0.50)");
    shade.addColorStop(1, "rgba(16,14,11,0.60)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, W, H);
    const smear = ctx.createLinearGradient(W * .5, 0, W * .88, 0);
    smear.addColorStop(0, "rgba(38,33,26,0)");
    smear.addColorStop(.55, "rgba(38,33,26,0.11)");
    smear.addColorStop(1, "rgba(38,33,26,0)");
    ctx.fillStyle = smear;
    ctx.fillRect(W * .5, 0, W * .38, H);
    ctx.fillStyle = "rgba(38,33,26,0.20)";
    ctx.fillRect(W * .43, 0, 1.2, H);
    ctx.fillStyle = "rgba(255,250,238,0.10)";
    ctx.fillRect(W * .43 + 1.4, 0, 1, H);
    for (let i = 0; i < 12; i++) {
        const x = W * (.2 + rand() * .72);
        const y = H * (.3 + rand() * .55);
        ctx.strokeStyle = `rgba(48,42,33,${.08 + rand() * .16})`;
        ctx.lineWidth = .6 + rand() * 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rand() - .5) * 9, y + 6 + rand() * 34);
        ctx.stroke();
    }
    const depth = ctx.createLinearGradient(0, 0, 0, H);
    depth.addColorStop(0, "rgba(24,21,16,0)");
    depth.addColorStop(.62, "rgba(24,21,16,0.025)");
    depth.addColorStop(.88, "rgba(24,21,16,0.11)");
    depth.addColorStop(1, "rgba(24,21,16,0.20)");
    ctx.fillStyle = depth;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 7; i++) {
        const x = W * (.18 + rand() * .76);
        const y = H * (.06 + rand() * .4);
        const len = H * (.25 + rand() * .6);
        const g = ctx.createLinearGradient(0, y, 0, y + len);
        g.addColorStop(0, "rgba(50,43,33,0)");
        g.addColorStop(.3, `rgba(50,43,33,${.05 + rand() * .1})`);
        g.addColorStop(1, "rgba(50,43,33,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x, y, 3 + rand() * 12, len);
    }
    const t = tex(c, {
        srgb: true
    });
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.anisotropy = 8;
    return t;
}

export function createFloorStainOverlay() {
    const rand = mulberry32(7019598);
    const W = 2048;
    const H = 4096;
    const c = canvas2d(W, H);
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    const xScale = W / FLOOR.w;
    const yScale = H / FLOOR.d;
    const at = (wx, wz) => floorUv(wx, wz, W, H);
    const worldBlob = (wx, wz, radius, alpha, color, stretch = 1, rot = null) => {
        const [px, py] = at(wx, wz);
        drawSoftBlob(ctx, px, py, radius * xScale, radius * yScale * stretch, color, alpha, rot === null ? (rand() - .5) * 1.3 : rot);
    };
    const speck = (x, y, rx, ry, style) => {
        ctx.fillStyle = style;
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, rand() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    };
    for (let i = 0; i < 74; i++) {
        const wx = -14.4 + rand() * 15.6;
        const wz = -11 + rand() * 22;
        const r = .35 + rand() * 2.8;
        worldBlob(wx, wz, r, .03 + rand() * .09, rand() < .22 ? "rgba(176,168,150,ALPHA)" : "rgba(40,36,29,ALPHA)", .55 + rand() * 1.3);
    }
    for (const [wx, wz, r, a, stretch] of [ [ -10.4, 4.7, 2.5, .32, .5 ], [ -9.4, 3.1, 1.9, .28, .45 ], [ -10.9, 1.4, 1.7, .26, .55 ], [ -9, 5.9, 1.55, .24, .65 ], [ -8.5, .6, 1.5, .23, .55 ], [ -6.6, 3.1, 1.7, .22, .7 ], [ -5, .2, 1.45, .2, .6 ], [ -3.4, -2.3, 1.3, .18, .65 ], [ -7.8, -1.2, 1.25, .21, .55 ], [ -11.2, 7.1, 1.5, .2, .5 ], [ -7.3, 5.2, 1.15, .22, .6 ], [ -6.1, -1.6, 1, .17, .55 ] ]) worldBlob(wx, wz, r, a, "rgba(12,11,9,ALPHA)", stretch);
    for (let i = 0; i < 30; i++) {
        const wx = -11.4 + rand() * 8.4;
        const wz = -2.6 + rand() * 9.2;
        worldBlob(wx, wz, .15 + rand() * .95, .16 + rand() * .26, "rgba(7,7,5,ALPHA)", .4 + rand() * .8);
    }
    for (let i = 0; i < 26; i++) {
        const wx = -11.6 + rand() * 7.8;
        const wz = -2.2 + rand() * 8.6;
        worldBlob(wx, wz, .25 + rand() * 1.35, .06 + rand() * .18, "rgba(10,9,7,ALPHA)", .25 + rand() * 1.1);
    }
    for (let i = 0; i < 15; i++) {
        const wx = -12 + rand() * 8.5;
        const wz = -2 + rand() * 10.5;
        worldBlob(wx, wz, .18 + rand() * .9, .035 + rand() * .06, "rgba(221,213,198,ALPHA)", .5 + rand() * .8);
    }
    for (let i = 0; i < 22; i++) {
        const cx = -10.5 + rand() * 9.5;
        const cz = 1.5 + rand() * 7.5;
        const rad = .8 + rand() * 4.5;
        const a0 = rand() * Math.PI * 2;
        const a1 = a0 + .7 + rand() * 2.2;
        ctx.strokeStyle = `rgba(38,34,27,${.022 + rand() * .035})`;
        ctx.lineWidth = 7 + rand() * 15;
        ctx.lineCap = "round";
        ctx.beginPath();
        for (let j = 0; j <= 26; j++) {
            const a = a0 + (a1 - a0) * (j / 26);
            const [px, py] = at(cx + Math.cos(a) * rad, cz + Math.sin(a) * rad * 1.35);
            if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
    }
    function tyreLane(points, laneOffset, width, alpha, treads) {
        const pts = points.map(([x, z]) => {
            const [px, py] = at(x, z);
            return [ px, py ];
        });
        for (const [wMul, aMul] of [ [ 4.8, .22 ], [ 2, .48 ], [ 1, 1 ] ]) {
            ctx.strokeStyle = `rgba(12,10,8,${alpha * aMul})`;
            ctx.lineWidth = width * wMul;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.beginPath();
            for (let i = 0; i < pts.length; i++) {
                const x = pts[i][0] + (rand() - .5) * 3 + laneOffset[0];
                const y = pts[i][1] + (rand() - .5) * 3 + laneOffset[1];
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        if (treads) {
            for (let i = 4; i < pts.length - 3; i += 3) {
                if (rand() < .3) continue;
                const [x, y] = pts[i];
                const [x2, y2] = pts[Math.min(i + 1, pts.length - 1)];
                const dx = x2 - x, dy = y2 - y;
                const len = Math.hypot(dx, dy) || 1;
                const nx = -dy / len, ny = dx / len;
                ctx.strokeStyle = `rgba(10,9,7,${.1 + rand() * .2})`;
                ctx.lineWidth = 1 + rand() * 2.2;
                ctx.beginPath();
                ctx.moveTo(x + nx * (width * 1.1), y + ny * (width * 1.1));
                ctx.lineTo(x - nx * (width * 1.1), y - ny * (width * 1.1));
                ctx.stroke();
            }
        }
    }
    function tyreCurve(points, sepPx, width, alpha) {
        tyreLane(points, [ -sepPx * .5, -sepPx * 1.6 ], width, alpha, true);
        tyreLane(points, [ sepPx * .5, sepPx * 1.6 ], width, alpha, true);
    }
    const ringPts = [];
    for (let i = 0; i <= 64; i++) {
        const a = -.15 + i / 64 * (Math.PI * 1.55);
        ringPts.push([ -5.8 + Math.cos(a) * 3.9, 1.2 + Math.sin(a) * 3.3 ]);
    }
    tyreCurve(ringPts, 38, 4.8, .52);
    tyreCurve(bezierWorld([ -2.4, 9.8 ], [ -4.1, 6.1 ], [ -7, 2.5 ], [ -10.9, 1.1 ], 48), 34, 4.6, .46);
    tyreCurve(bezierWorld([ -8.9, 6.8 ], [ -6.6, 3.9 ], [ -5, 1 ], [ -4.3, -2.2 ], 42), 30, 4.2, .4);
    tyreCurve(bezierWorld([ -11.6, 5.2 ], [ -10.1, 2.3 ], [ -8.8, .3 ], [ -7.1, -.9 ], 34), 24, 3.4, .3);
    for (let i = 0; i < 6400; i++) {
        const wx = -14.6 + rand() * 16.4;
        const wz = -12 + rand() * 23;
        const [px, py] = at(wx, wz);
        const rx = .8 + Math.pow(rand(), 2) * 6.2;
        const ry = rx * (.35 + rand() * 1.5);
        if (rand() < .14) {
            speck(px, py, rx * (.35 + rand() * .7), ry * (.35 + rand() * .7), `rgba(224,216,201,${.05 + rand() * .16})`);
        } else {
            const warm = rand() < .25;
            const col = warm ? "42,37,29" : "21,19,16";
            speck(px, py, rx, ry, `rgba(${col},${.12 + rand() * .34})`);
        }
    }
    for (let i = 0; i < 900; i++) {
        const wx = -14.2 + rand() * 15.4;
        const wz = -10 + rand() * 21;
        const [px, py] = at(wx, wz);
        const rx = 2 + rand() * 9.5;
        speck(px, py, rx, rx * (.2 + rand() * .75), rand() < .18 ? `rgba(196,188,172,${.06 + rand() * .14})` : `rgba(15,13,11,${.13 + rand() * .26})`);
    }
    for (let i = 0; i < 44; i++) {
        const wx = -13.8 + rand() * 14.2;
        const wz = -9 + rand() * 19.5;
        const [cx, cy] = at(wx, wz);
        const n = 10 + Math.floor(rand() * 26);
        for (let j = 0; j < n; j++) {
            const ang = rand() * Math.PI * 2;
            const dist = rand() * 60;
            const r = 1 + rand() * 4.6;
            speck(cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist * 1.4, r, r * (.35 + rand() * 1.2), rand() < .2 ? `rgba(207,199,183,${.05 + rand() * .1})` : `rgba(16,14,11,${.12 + rand() * .28})`);
        }
    }
    for (let i = 0; i < 720; i++) {
        const wx = -13.6 + rand() * 11.8;
        const wz = -6 + rand() * 15.5;
        const [px, py] = at(wx, wz);
        const r = .6 + rand() * 2;
        speck(px, py, r, r * (.5 + rand() * 1.2), `rgba(246,239,223,${.14 + rand() * .3})`);
    }
    for (let i = 0; i < 22; i++) {
        const wx = -14.2 + rand() * 15.2;
        const wz = -10 + rand() * 21;
        let [px, py] = at(wx, wz);
        ctx.strokeStyle = `rgba(18,16,13,${.12 + rand() * .22})`;
        ctx.lineWidth = .7 + rand() * 1.9;
        ctx.beginPath();
        ctx.moveTo(px, py);
        let ang = rand() * Math.PI * 2;
        for (let j = 0; j < 4 + Math.floor(rand() * 5); j++) {
            ang += (rand() - .5) * 1.1;
            px += Math.cos(ang) * (7 + rand() * 26);
            py += Math.sin(ang) * (9 + rand() * 30);
            ctx.lineTo(px, py);
        }
        ctx.stroke();
    }
    for (let i = 0; i < 52; i++) {
        const wx = -13.5 + rand() * 13.8;
        const wz = -8 + rand() * 19;
        const [px, py] = at(wx, wz);
        const ang = rand() * Math.PI;
        for (let j = 0; j < 1 + Math.floor(rand() * 3); j++) {
            const ox = (rand() - .5) * 16;
            const oy = (rand() - .5) * 26;
            const len = 3 + rand() * 24;
            ctx.strokeStyle = rand() < .18 ? `rgba(204,196,180,${.03 + rand() * .07})` : `rgba(16,14,11,${.05 + rand() * .13})`;
            ctx.lineWidth = .6 + rand() * 2;
            ctx.beginPath();
            ctx.moveTo(px + ox, py + oy);
            ctx.lineTo(px + ox + Math.cos(ang) * len, py + oy + Math.sin(ang) * len);
            ctx.stroke();
        }
    }
    for (let i = 0; i < 180; i++) {
        const wx = -10.8 + rand() * 7.4;
        const wz = -1.8 + rand() * 8.2;
        const [px, py] = at(wx, wz);
        const r = .6 + rand() * 2.4;
        speck(px, py, r, r * (.4 + rand() * 1.1), `rgba(13,11,9,${.12 + rand() * .2})`);
    }
    for (let i = 0; i < 16; i++) {
        const [px, py] = at(-14.2 + rand() * 1.1, 2 + rand() * 9.5);
        drawSoftBlob(ctx, px, py, 8 + rand() * 34, 2 + rand() * 9, "rgba(199,190,172,ALPHA)", .04 + rand() * .06, (rand() - .5) * .4);
    }
    const t = tex(c, {
        srgb: true
    });
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.anisotropy = 8;
    return t;
}

export function createFloorWearTexture() {
    const rand = mulberry32(5370023);
    const W = 1024;
    const H = 2048;
    const c = canvas2d(W, H);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#f2f1ed";
    ctx.fillRect(0, 0, W, H);
    const arcs = [ [ [ -13.2, 6.9 ], [ -11, 4 ], [ -7.4, 2.2 ], [ -2.2, 4.1 ] ], [ [ -12.3, 7.8 ], [ -9.8, 4.7 ], [ -6, 3 ], [ -.7, 4.8 ] ], [ [ -8.5, 7.5 ], [ -6.5, 4.2 ], [ -3.6, 1.2 ], [ -.5, -2.4 ] ], [ [ -13.1, 2.6 ], [ -11, .4 ], [ -8.1, -1.7 ], [ -4.3, -2.3 ] ], [ [ -4.6, 7.4 ], [ -3.1, 4.2 ], [ -1, .9 ], [ 2.4, -1 ] ], [ [ -11.4, 5.6 ], [ -9.6, 3.7 ], [ -7.2, 2.8 ], [ -4.8, 3.7 ] ], [ [ -11.2, 1.4 ], [ -9, .4 ], [ -6.8, .3 ], [ -4.6, 1.6 ] ], [ [ -11.1, 6.2 ], [ -9.2, 4.8 ], [ -7.8, 4.1 ], [ -6.1, 4.4 ] ] ];
    for (let a = 0; a < arcs.length; a++) {
        const mapped = bezierWorld(...arcs[a], 38).map(([x, z]) => floorUv(x, z, W, H));
        const passes = 6;
        for (let pass = 0; pass < passes; pass++) {
            ctx.save();
            ctx.strokeStyle = `rgba(58,54,47,${.28 + (a < 3 ? .14 : .08)})`;
            ctx.lineWidth = (a < 3 ? 33 : 23) * (1.45 - pass * .16);
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.beginPath();
            for (let i = 0; i < mapped.length; i++) {
                const x = mapped[i][0] + (rand() - .5) * 14;
                const y = mapped[i][1] + (rand() - .5) * 12;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.restore();
        }
        for (let i = 0; i < mapped.length; i += 3) {
            if (rand() < .45) continue;
            const p = mapped[i];
            const a2 = rand() * Math.PI;
            ctx.fillStyle = `rgba(58,54,47,${.05 + rand() * .09})`;
            ctx.beginPath();
            ctx.ellipse(p[0] + (rand() - .5) * 22, p[1] + (rand() - .5) * 22, 3 + rand() * 14, 1 + rand() * 4, a2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    for (const [wx, wz, rx, ry, alpha] of [ [ -7.2, 3.8, 300, 150, .2 ], [ -8.4, 1.1, 220, 150, .16 ], [ -4.6, 2.8, 190, 110, .15 ], [ -5.7, -1.3, 190, 130, .13 ], [ -9.9, 5, 170, 90, .24 ], [ -10.15, 2.25, 210, 125, .3 ], [ -9.25, 4.25, 160, 90, .24 ], [ -10.8, .1, 150, 100, .22 ], [ -9.75, 4.35, 190, 100, .28 ], [ -9.15, 1.55, 160, 90, .22 ], [ -10.35, 5.55, 180, 95, .34 ], [ -8.85, 3.15, 150, 85, .3 ] ]) {
        const [px, py] = floorUv(wx, wz, W, H);
        drawSoftBlob(ctx, px, py, rx, ry, "rgba(94,87,76,ALPHA)", alpha, (rand() - .5) * 1.3);
    }
    for (let i = 0; i < 620; i++) {
        const x = W * (.18 + rand() * .72);
        const y = H * (.55 + rand() * .4);
        ctx.fillStyle = rand() < .7 ? `rgba(52,48,42,${.06 + rand() * .18})` : `rgba(226,220,205,${.03 + rand() * .06})`;
        ctx.beginPath();
        ctx.ellipse(x, y, .6 + rand() * 5, .4 + rand() * 2.8, rand() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }
    for (let i = 0; i < 22; i++) {
        const x = W * (.15 + rand() * .75);
        const y = H * (.5 + rand() * .45);
        ctx.strokeStyle = `rgba(58,54,47,${.06 + rand() * .12})`;
        ctx.lineWidth = .8 + rand() * 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rand() - .5) * 70, y + (rand() - .5) * 25);
        ctx.stroke();
    }
    const t = tex(c, {
        srgb: true
    });
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.anisotropy = 8;
    return t;
}

export function createWallTextures() {
    const rand = mulberry32(119251015);
    const w = 1024;
    const h = 512;
    const c = canvas2d(w, h);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#585950";
    ctx.fillRect(0, 0, w, h);
    const ribs = 40;
    const pitch = w / ribs;
    for (let i = 0; i < ribs; i++) {
        const x = i * pitch;
        const g = ctx.createLinearGradient(x, 0, x + pitch, 0);
        g.addColorStop(0, "rgba(18,20,18,0.20)");
        g.addColorStop(.18, "rgba(112,114,103,0.11)");
        g.addColorStop(.48, "rgba(186,186,167,0.075)");
        g.addColorStop(.72, "rgba(58,61,55,0.065)");
        g.addColorStop(1, "rgba(12,14,13,0.20)");
        ctx.fillStyle = g;
        ctx.fillRect(x, 0, pitch + .5, h);
    }
    fieldBlots(ctx, w, h, rand, 60, [ {
        col: "rgba(20,23,20,ALPHA)",
        alpha: [ .03, .13 ],
        min: 20,
        max: 160
    }, {
        col: "rgba(170,170,148,ALPHA)",
        alpha: [ .015, .055 ],
        min: 20,
        max: 120
    } ]);
    for (let i = 0; i < 12; i++) {
        const y = rand() * h;
        const g = ctx.createLinearGradient(0, y, 0, y + 8 + rand() * 50);
        g.addColorStop(0, "rgba(18,20,18,0)");
        g.addColorStop(.4, `rgba(15,17,15,${.04 + rand() * .09})`);
        g.addColorStop(1, "rgba(15,17,15,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, y, w, 80);
    }
    for (let i = 0; i < 26; i++) {
        drawRustStreak(ctx, rand() * w, rand() * h * .45, 3 + rand() * 12, 30 + rand() * 180, rand, .12 + rand() * .2);
    }
    for (let i = 0; i < 130; i++) {
        const x = rand() * w;
        const y = rand() * h;
        ctx.fillStyle = rand() < .5 ? `rgba(25,22,17,${.1 + rand() * .2})` : `rgba(197,199,179,${.03 + rand() * .08})`;
        ctx.beginPath();
        ctx.arc(x, y, .5 + rand() * 2.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = "rgba(23,25,22,0.55)";
    for (let i = 0; i <= 4; i++) {
        const x = i / 4 * w;
        ctx.fillRect(x - 2, 0, 4, h);
    }
    addFineNoise(ctx, w, h, rand, .12, 256);
    const map = tex(c, {
        srgb: true,
        repeat: [ 8, 1 ]
    });
    const nc = canvas2d(512, 512);
    const nctx = nc.getContext("2d");
    const img = nctx.createImageData(512, 512);
    const ribsN = 20;
    for (let y = 0; y < 512; y++) {
        for (let x = 0; x < 512; x++) {
            const ph = x / 512 * Math.PI * 2 * ribsN;
            const slope = Math.cos(ph) * .42;
            const i = (y * 512 + x) * 4;
            img.data[i] = (.5 + slope * .5) * 255;
            img.data[i + 1] = (.5 + (rand() - .5) * .035) * 255;
            img.data[i + 2] = 225 + rand() * 25;
            img.data[i + 3] = 255;
        }
    }
    nctx.putImageData(img, 0, 0);
    const normalMap = tex(nc, {
        srgb: false,
        repeat: [ 8, 1 ]
    });
    const roughC = canvas2d(512, 512);
    const rctx = roughC.getContext("2d");
    rctx.fillStyle = "#8d8a82";
    rctx.fillRect(0, 0, 512, 512);
    fieldBlots(rctx, 512, 512, rand, 40, [ {
        col: "rgba(70,65,56,ALPHA)",
        alpha: [ .05, .18 ],
        min: 20,
        max: 120
    }, {
        col: "rgba(210,208,198,ALPHA)",
        alpha: [ .03, .12 ],
        min: 20,
        max: 100
    } ]);
    addFineNoise(rctx, 512, 512, rand, .2, 128);
    const roughnessMap = tex(roughC, {
        srgb: false,
        repeat: [ 8, 1 ]
    });
    const lw = 1024;
    const lh = 512;
    const lc = canvas2d(lw, lh);
    const lctx = lc.getContext("2d");
    lctx.fillStyle = "#858277";
    lctx.fillRect(0, 0, lw, lh);
    for (let i = 0; i < 72; i++) {
        const x = i / 72 * lw;
        const g = lctx.createLinearGradient(x, 0, x + lw / 72, 0);
        g.addColorStop(0, "rgba(28,28,24,0.11)");
        g.addColorStop(.45, "rgba(205,201,186,0.045)");
        g.addColorStop(1, "rgba(28,28,24,0.10)");
        lctx.fillStyle = g;
        lctx.fillRect(x, 0, lw / 72 + .4, lh);
    }
    fieldBlots(lctx, lw, lh, rand, 90, [ {
        col: "rgba(28,27,22,ALPHA)",
        alpha: [ .025, .15 ],
        min: 16,
        max: 160
    }, {
        col: "rgba(230,227,214,ALPHA)",
        alpha: [ .02, .08 ],
        min: 16,
        max: 100
    }, {
        col: "rgba(99,79,50,ALPHA)",
        alpha: [ .02, .07 ],
        min: 20,
        max: 100
    } ]);
    const panels = 4;
    for (let i = 0; i < panels; i++) {
        const x = i / panels * lw;
        const g = lctx.createLinearGradient(x, 0, x + 8, 0);
        g.addColorStop(0, "rgba(33,32,27,0.32)");
        g.addColorStop(.5, "rgba(78,76,67,0.12)");
        g.addColorStop(1, "rgba(32,31,27,0.24)");
        lctx.fillStyle = g;
        lctx.fillRect(x, 0, 8, lh);
        lctx.fillStyle = "rgba(230,226,210,0.025)";
        lctx.fillRect(x + 12, 0, 2, lh);
    }
    for (let i = 0; i < 210; i++) {
        const x = rand() * lw;
        const y = lh * (.25 + rand() * .75);
        lctx.fillStyle = rand() < .65 ? `rgba(35,32,26,${.03 + rand() * .15})` : `rgba(211,207,192,${.02 + rand() * .08})`;
        lctx.beginPath();
        lctx.ellipse(x, y, 1 + rand() * 6, .6 + rand() * 4, rand() * Math.PI, 0, Math.PI * 2);
        lctx.fill();
    }
    for (let i = 0; i < 58; i++) {
        drawRustStreak(lctx, rand() * lw, lh * (.25 + rand() * .55), 2 + rand() * 11, 30 + rand() * 190, rand, .1 + rand() * .2);
    }
    const floorGrime = lctx.createLinearGradient(0, lh * .62, 0, lh);
    floorGrime.addColorStop(0, "rgba(30,28,23,0)");
    floorGrime.addColorStop(.55, "rgba(28,26,21,0.22)");
    floorGrime.addColorStop(1, "rgba(21,20,16,0.55)");
    lctx.fillStyle = floorGrime;
    lctx.fillRect(0, lh * .76, lw, lh * .24);
    addFineNoise(lctx, lw, lh, rand, .15, 256);
    const lowerMap = tex(lc, {
        srgb: true,
        repeat: [ 8, 1 ]
    });
    return {
        map: map,
        normalMap: normalMap,
        roughnessMap: roughnessMap,
        lowerMap: lowerMap
    };
}

export function createDoorTextures() {
    const rand = mulberry32(44551681);
    const c = canvas2d(512, 768);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#5b5f5d";
    ctx.fillRect(0, 0, 512, 768);
    const slats = 26;
    for (let i = 0; i < slats; i++) {
        const y = i / slats * 768;
        const sh = 768 / slats;
        const g = ctx.createLinearGradient(0, y, 0, y + 768 / slats);
        g.addColorStop(0, "rgba(206,205,194,0.16)");
        g.addColorStop(.18, "rgba(91,95,92,0.06)");
        g.addColorStop(.62, "rgba(23,25,24,0.24)");
        g.addColorStop(.92, "rgba(7,8,8,0.55)");
        g.addColorStop(1, "rgba(6,7,7,0.6)");
        ctx.fillStyle = g;
        ctx.fillRect(0, y, 512, sh + .5);
        ctx.fillStyle = "rgba(8,9,8,0.72)";
        ctx.fillRect(0, y + sh - 2.4, 512, 2.4);
        ctx.fillStyle = "rgba(220,219,205,0.18)";
        ctx.fillRect(0, y + 1.2, 512, 1.2);
    }
    fieldBlots(ctx, 512, 768, rand, 60, [ {
        col: "rgba(24,23,20,ALPHA)",
        alpha: [ .04, .17 ],
        min: 15,
        max: 150
    }, {
        col: "rgba(188,184,168,ALPHA)",
        alpha: [ .015, .06 ],
        min: 15,
        max: 90
    } ]);
    for (let i = 0; i < 20; i++) {
        drawRustStreak(ctx, rand() * 512, rand() * 500, 2 + rand() * 8, 30 + rand() * 180, rand, .1 + rand() * .16);
    }
    for (let i = 0; i < 70; i++) {
        const x = rand() * 512;
        const y = rand() * 768;
        ctx.fillStyle = `rgba(16,15,13,${.1 + rand() * .28})`;
        ctx.beginPath();
        ctx.ellipse(x, y, 2 + rand() * 20, 1 + rand() * 9, rand() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }
    for (let i = 0; i < 26; i++) {
        const x = rand() * 512;
        drawSoftBlob(ctx, x, 560 + rand() * 220, 6 + rand() * 26, 30 + rand() * 180, "rgba(25,23,19,ALPHA)", .06 + rand() * .16, (rand() - .5) * .15);
    }
    {
        const g2 = ctx.createLinearGradient(0, 600, 0, 768);
        g2.addColorStop(0, "rgba(20,19,16,0)");
        g2.addColorStop(1, "rgba(13,12,10,0.55)");
        ctx.fillStyle = g2;
        ctx.fillRect(0, 600, 512, 168);
    }
    for (let i = 0; i < 9; i++) {
        drawSoftBlob(ctx, rand() * 512, 330 + rand() * 380, 25 + rand() * 80, 40 + rand() * 130, "rgba(20,18,15,ALPHA)", .12 + rand() * .16, (rand() - .5) * 1.2);
    }
    for (let i = 0; i < 16; i++) {
        const x = rand() * 512;
        const y = 70 + rand() * 560;
        ctx.strokeStyle = `rgba(207,201,182,${.06 + rand() * .16})`;
        ctx.lineWidth = 1 + rand() * 4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 8 + rand() * 60, y + (rand() - .5) * 10);
        ctx.stroke();
    }
    ctx.save();
    ctx.globalAlpha = .5;
    ctx.fillStyle = "#d8d2bd";
    ctx.font = "bold 46px monospace";
    ctx.letterSpacing = "8px";
    ctx.fillText("07", 29, 92);
    ctx.restore();
    addFineNoise(ctx, 512, 768, rand, .16, 256);
    const map = tex(c, {
        srgb: true
    });
    const rc = canvas2d(256, 384);
    const rctx = rc.getContext("2d");
    rctx.fillStyle = "#9c978d";
    rctx.fillRect(0, 0, 256, 384);
    fieldBlots(rctx, 256, 384, rand, 26, [ {
        col: "rgba(55,50,44,ALPHA)",
        alpha: [ .05, .2 ],
        min: 10,
        max: 80
    } ]);
    addFineNoise(rctx, 256, 384, rand, .25, 128);
    const roughnessMap = tex(rc, {
        srgb: false
    });
    return {
        map: map,
        roughnessMap: roughnessMap
    };
}

export function createConcreteTextures() {
    const rand = mulberry32(82935251);
    const w = 1024;
    const h = 1024;
    const c = canvas2d(w, h);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#595950";
    ctx.fillRect(0, 0, w, h);
    fieldBlots(ctx, w, h, rand, 80, [ {
        col: "rgba(17,17,15,ALPHA)",
        alpha: [ .025, .16 ],
        min: 20,
        max: 260
    }, {
        col: "rgba(174,170,153,ALPHA)",
        alpha: [ .015, .07 ],
        min: 20,
        max: 180
    }, {
        col: "rgba(83,66,43,ALPHA)",
        alpha: [ .015, .06 ],
        min: 30,
        max: 180
    } ]);
    for (let i = 1; i < 6; i++) {
        const y = i / 6 * h;
        ctx.fillStyle = "rgba(19,19,16,0.45)";
        ctx.fillRect(0, y, w, 2);
        ctx.fillStyle = "rgba(191,185,166,0.045)";
        ctx.fillRect(0, y + 2, w, 3);
    }
    for (let i = 1; i < 5; i++) {
        ctx.fillStyle = "rgba(20,20,17,0.35)";
        ctx.fillRect(i / 5 * w, 0, 2, h);
    }
    for (let i = 0; i < 20; i++) {
        drawRustStreak(ctx, rand() * w, rand() * h * .65, 4 + rand() * 16, 50 + rand() * 280, rand, .05 + rand() * .12);
    }
    addFineNoise(ctx, w, h, rand, .22, 256);
    const map = tex(c, {
        srgb: true,
        repeat: [ 3, 1 ]
    });
    return {
        map: map
    };
}

export function createPaintedSteelTextures() {
    const rand = mulberry32(150605867);
    const w = 512;
    const h = 1024;
    const c = canvas2d(w, h);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#a68b3d";
    ctx.fillRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(206,190,124,0.22)");
    g.addColorStop(.45, "rgba(130,105,38,0.06)");
    g.addColorStop(.84, "rgba(64,50,24,0.17)");
    g.addColorStop(1, "rgba(29,24,17,0.34)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    fieldBlots(ctx, w, h, rand, 100, [ {
        col: "rgba(33,29,20,ALPHA)",
        alpha: [ .03, .22 ],
        min: 10,
        max: 100
    }, {
        col: "rgba(231,215,160,ALPHA)",
        alpha: [ .03, .11 ],
        min: 8,
        max: 80
    }, {
        col: "rgba(109,72,36,ALPHA)",
        alpha: [ .03, .14 ],
        min: 8,
        max: 50
    } ]);
    for (let i = 0; i < 260; i++) {
        const x = rand() * w;
        const y = rand() * h;
        const r = .8 + rand() * 7;
        ctx.fillStyle = rand() < .7 ? `rgba(35,31,24,${.15 + rand() * .55})` : `rgba(116,89,54,${.12 + rand() * .32})`;
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * (.35 + rand() * .9), rand() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }
    for (let i = 0; i < 16; i++) {
        const x = rand() * w;
        ctx.strokeStyle = `rgba(38,33,25,${.1 + rand() * .22})`;
        ctx.lineWidth = 2 + rand() * 11;
        ctx.beginPath();
        ctx.moveTo(x, h * (.55 + rand() * .25));
        ctx.bezierCurveTo(x + 20, h * .75, x - 15, h * .88, x + 8, h);
        ctx.stroke();
    }
    addFineNoise(ctx, w, h, rand, .26, 256);
    const map = tex(c, {
        srgb: true,
        repeat: [ 2, 1 ]
    });
    const rc = canvas2d(256, 512);
    const rctx = rc.getContext("2d");
    rctx.fillStyle = "#b0ada5";
    rctx.fillRect(0, 0, 256, 512);
    fieldBlots(rctx, 256, 512, rand, 60, [ {
        col: "rgba(74,65,52,ALPHA)",
        alpha: [ .05, .25 ],
        min: 4,
        max: 55
    } ]);
    const roughnessMap = tex(rc, {
        srgb: false,
        repeat: [ 2, 1 ]
    });
    return {
        map: map,
        roughnessMap: roughnessMap
    };
}

export function createPersonnelDoorTexture() {
    const rand = mulberry32(5575337);
    const w = 512;
    const h = 1024;
    const c = canvas2d(w, h);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#7f8177";
    ctx.fillRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(222,220,207,0.16)");
    g.addColorStop(.5, "rgba(98,99,90,0.12)");
    g.addColorStop(1, "rgba(28,27,23,0.34)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(33,33,28,0.5)";
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 38, w - 60, h - 78);
    ctx.strokeStyle = "rgba(213,210,195,0.08)";
    ctx.lineWidth = 2;
    ctx.strokeRect(36, 44, w - 72, h - 90);
    ctx.strokeRect(52, 95, w - 104, 320);
    ctx.strokeRect(52, 455, w - 104, 470);
    ctx.fillStyle = "rgba(39,38,32,0.16)";
    ctx.fillRect(52, 95, w - 104, 320);
    fieldBlots(ctx, w, h, rand, 110, [ {
        col: "rgba(24,23,19,ALPHA)",
        alpha: [ .03, .22 ],
        min: 6,
        max: 90
    }, {
        col: "rgba(216,211,194,ALPHA)",
        alpha: [ .02, .08 ],
        min: 8,
        max: 60
    }, {
        col: "rgba(87,58,30,ALPHA)",
        alpha: [ .02, .09 ],
        min: 4,
        max: 40
    } ]);
    for (let i = 0; i < 80; i++) {
        drawRustStreak(ctx, rand() * w, rand() * h * .75, 1 + rand() * 5, 15 + rand() * 150, rand, .1 + rand() * .2);
    }
    for (let i = 0; i < 120; i++) {
        const x = rand() * w;
        const y = rand() * h;
        ctx.fillStyle = `rgba(28,26,21,${.06 + rand() * .23})`;
        ctx.beginPath();
        ctx.ellipse(x, y, .5 + rand() * 4, .5 + rand() * 2.5, rand() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.save();
    ctx.globalAlpha = .4;
    ctx.fillStyle = "#eee7d2";
    ctx.font = "bold 27px monospace";
    ctx.fillText("M-03", 61, 790);
    ctx.globalAlpha = .25;
    ctx.font = "17px monospace";
    ctx.fillText("AUTHORISED PERSONNEL", 59, 826);
    ctx.restore();
    addFineNoise(ctx, w, h, rand, .2, 256);
    const map = tex(c, {
        srgb: true
    });
    return {
        map: map
    };
}

export function createExitSignTexture() {
    const c = canvas2d(256, 128);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#090a09";
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = "rgba(205,200,180,0.36)";
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, 244, 116);
    ctx.fillStyle = "#b44432";
    ctx.font = "bold 58px monospace";
    ctx.textAlign = "center";
    ctx.fillText("EXIT", 128, 84);
    const map = tex(c, {
        srgb: true
    });
    return map;
}

export function createLabelTexture(text = "03", sub = "BAY") {
    const c = canvas2d(256, 256);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#171a17";
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = "rgba(168,161,138,0.28)";
    ctx.lineWidth = 5;
    ctx.strokeRect(9, 9, 238, 238);
    ctx.fillStyle = "rgba(206,199,177,0.68)";
    ctx.font = "bold 34px monospace";
    ctx.textAlign = "center";
    ctx.fillText(sub, 128, 88);
    ctx.font = "bold 108px monospace";
    ctx.fillText(text, 128, 192);
    return tex(c, {
        srgb: true
    });
}

export function createGlowTexture() {
    const c = canvas2d(512, 512);
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(256, 256, 0, 256, 256, 250);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(.12, "rgba(255,255,255,0.9)");
    g.addColorStop(.38, "rgba(255,255,255,0.25)");
    g.addColorStop(.7, "rgba(255,255,255,0.04)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

export function createSafetyPostTextures() {
    const rand = mulberry32(184621613);
    const w = 1024;
    const h = 1024;
    const c = canvas2d(w, h);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#a88e37";
    ctx.fillRect(0, 0, w, h);
    let g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(212,191,118,0.26)");
    g.addColorStop(.24, "rgba(166,136,47,0.06)");
    g.addColorStop(.62, "rgba(84,67,26,0.13)");
    g.addColorStop(.86, "rgba(42,34,20,0.32)");
    g.addColorStop(1, "rgba(18,16,12,0.68)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    fieldBlots(ctx, w, h, rand, 110, [ {
        col: "rgba(48,39,22,ALPHA)",
        alpha: [ .04, .22 ],
        min: 16,
        max: 170
    }, {
        col: "rgba(215,198,140,ALPHA)",
        alpha: [ .015, .055 ],
        min: 12,
        max: 90
    }, {
        col: "rgba(120,79,33,ALPHA)",
        alpha: [ .025, .14 ],
        min: 10,
        max: 80
    }, {
        col: "rgba(74,70,55,ALPHA)",
        alpha: [ .04, .18 ],
        min: 20,
        max: 150
    } ]);
    for (let i = 0; i < 12; i++) {
        const x = rand() * w;
        drawSoftBlob(ctx, x, h * (.3 + rand() * .45), 30 + rand() * 90, h * (.28 + rand() * .25), "rgba(38,31,20,ALPHA)", .1 + rand() * .16, 0);
    }
    for (let i = 0; i < 22; i++) {
        const x = rand() * w;
        const top = h * (.12 + rand() * .45);
        const len = h * (.12 + rand() * .48);
        ctx.strokeStyle = `rgba(29,25,19,${.06 + rand() * .24})`;
        ctx.lineWidth = 2 + rand() * 18;
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.bezierCurveTo(x + (rand() - .5) * 40, top + len * .3, x + (rand() - .5) * 60, top + len * .7, x + (rand() - .5) * 30, top + len);
        ctx.stroke();
    }
    for (let i = 0; i < 34; i++) {
        const x = rand() * w;
        const top = h * (.18 + rand() * .62);
        const len = h * (.08 + rand() * .4);
        g = ctx.createLinearGradient(x, top, x, top + len);
        const dark = rand() < .72;
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(.22, dark ? `rgba(48,38,23,${.08 + rand() * .16})` : `rgba(210,191,130,${.05 + rand() * .08})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - 1 - rand() * 6, top, 3 + rand() * 15, len);
    }
    for (let i = 0; i < 190; i++) {
        const x = rand() * w;
        const y = rand() * h;
        const r = 1 + Math.pow(rand(), 2) * 9;
        const rot = rand() * Math.PI;
        const ry = r * (.25 + rand() * 1.5);
        ctx.fillStyle = `rgba(32,28,22,${.2 + rand() * .46})`;
        ctx.beginPath();
        ctx.ellipse(x, y, r, ry, rot, 0, Math.PI * 2);
        ctx.fill();
        if (rand() < .16) {
            ctx.strokeStyle = `rgba(222,206,152,${.06 + rand() * .12})`;
            ctx.lineWidth = .6 + rand() * 1.1;
            ctx.beginPath();
            ctx.ellipse(x, y, r + 1.2, ry + 1.2, rot, 0, Math.PI * 2);
            ctx.stroke();
        }
        if (r > 5 && rand() < .4) {
            ctx.fillStyle = `rgba(94,64,28,${.1 + rand() * .16})`;
            ctx.beginPath();
            ctx.ellipse(x + (rand() - .5) * r, y + (rand() - .5) * ry, r * .4, ry * .4, rot, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    for (let i = 0; i < 30; i++) {
        const x = rand() * w;
        const y = h * (.35 + rand() * .62);
        const len = 12 + rand() * 120;
        ctx.strokeStyle = rand() < .72 ? `rgba(26,23,18,${.15 + rand() * .32})` : `rgba(210,196,150,${.05 + rand() * .12})`;
        ctx.lineWidth = .8 + rand() * 5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rand() - .5) * 18, y + len);
        ctx.stroke();
    }
    {
        const yy = h * .52;
        ctx.save();
        ctx.globalAlpha = .44;
        ctx.strokeStyle = "#251f15";
        ctx.lineWidth = 16 + rand() * 18;
        ctx.setLineDash([ 70, 22, 120, 18, 90, 30, 40, 26 ]);
        ctx.beginPath();
        ctx.moveTo(0, yy + (rand() - .5) * 20);
        ctx.bezierCurveTo(w * .3, yy - 14, w * .66, yy + 21, w, yy - 6);
        ctx.stroke();
        ctx.globalAlpha = .18;
        ctx.strokeStyle = "#d8c784";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, yy + 14);
        ctx.bezierCurveTo(w * .3, yy + 2, w * .66, yy + 33, w, yy + 7);
        ctx.stroke();
        ctx.restore();
    }
    for (let i = 0; i < 7; i++) {
        const x = rand() * w;
        const top = h * (.28 + rand() * .3);
        ctx.fillStyle = `rgba(27,23,17,${.12 + rand() * .22})`;
        ctx.beginPath();
        ctx.moveTo(x, top);
        for (let k = 0; k < 5; k++) {
            ctx.lineTo(x + (rand() - .5) * 26, top + (k + 1) * (h * .07));
        }
        ctx.lineTo(x - 7, top + h * .35);
        ctx.lineTo(x + 5, top + h * .35);
        ctx.closePath();
        ctx.fill();
    }
    for (let i = 0; i < 1200; i++) {
        const x = rand() * w;
        const y = rand() * h;
        const r = .3 + pow2(rand()) * 1.7;
        ctx.fillStyle = rand() < .94 ? `rgba(34,30,23,${.06 + rand() * .28})` : `rgba(205,196,170,${.03 + rand() * .1})`;
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * (.4 + rand()), rand() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }
    addFineNoise(ctx, w, h, rand, .28, 256);
    const map = tex(c, {
        srgb: true
    });
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.ClampToEdgeWrapping;
    const rc = canvas2d(512, 512);
    const rctx = rc.getContext("2d");
    rctx.fillStyle = "#ada69a";
    rctx.fillRect(0, 0, 512, 512);
    fieldBlots(rctx, 512, 512, rand, 60, [ {
        col: "rgba(68,58,45,ALPHA)",
        alpha: [ .04, .22 ],
        min: 8,
        max: 80
    }, {
        col: "rgba(213,208,195,ALPHA)",
        alpha: [ .02, .09 ],
        min: 8,
        max: 60
    } ]);
    addFineNoise(rctx, 512, 512, rand, .22, 128);
    const roughnessMap = tex(rc, {
        srgb: false
    });
    roughnessMap.wrapS = THREE.RepeatWrapping;
    roughnessMap.wrapT = THREE.ClampToEdgeWrapping;
    return {
        map: map,
        roughnessMap: roughnessMap
    };
}

function pow2(v) {
    return v * v;
}

export function createBeamDustTexture() {
    const c = canvas2d(64, 64);
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 31);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(.22, "rgba(255,255,255,0.82)");
    g.addColorStop(.52, "rgba(255,255,255,0.24)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

export function createFloorDetailTexture() {
    const rand = mulberry32(124703171);
    const size = 512;
    const c = canvas2d(size, size);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#a8a297";
    ctx.fillRect(0, 0, size, size);
    const blob = (x, y, rx, ry, color, alpha) => {
        for (const ox of [ -size, 0, size ]) {
            for (const oy of [ -size, 0, size ]) {
                ctx.save();
                ctx.translate(x + ox, y + oy);
                ctx.rotate(rand() * Math.PI);
                ctx.scale(rx, ry);
                const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
                g.addColorStop(0, `rgba(${color},${alpha})`);
                g.addColorStop(.6, `rgba(${color},${alpha * .55})`);
                g.addColorStop(1, `rgba(${color},0)`);
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(0, 0, 1, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
    };
    for (let i = 0; i < 150; i++) {
        blob(rand() * size, rand() * size, 4 + rand() * 34, 3 + rand() * 22, rand() < .57 ? "38,35,29" : "220,214,197", .03 + rand() * .11);
    }
    for (let i = 0; i < 6200; i++) {
        const x = rand() * size;
        const y = rand() * size;
        const r = .35 + Math.pow(rand(), 2) * 2.3;
        const light = rand() < .4;
        ctx.fillStyle = light ? `rgba(231,224,207,${.05 + rand() * .3})` : `rgba(23,22,19,${.05 + rand() * .38})`;
        for (const ox of [ -size, 0, size ]) {
            for (const oy of [ -size, 0, size ]) {
                if (x + ox < -4 || x + ox > size + 4 || y + oy < -4 || y + oy > size + 4) continue;
                ctx.beginPath();
                ctx.ellipse(x + ox, y + oy, r, r * (.5 + rand() * 1.2), rand() * Math.PI, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    for (let i = 0; i < 80; i++) {
        const x = rand() * size;
        const y = rand() * size;
        ctx.strokeStyle = rand() < .55 ? `rgba(42,38,30,${.05 + rand() * .14})` : `rgba(223,216,200,${.03 + rand() * .09})`;
        ctx.lineWidth = .4 + rand() * 1.1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        const len = 4 + rand() * 32;
        ctx.lineTo(x + (rand() - .5) * len, y + (rand() - .5) * len * .25);
        ctx.stroke();
    }
    for (let i = 0; i < 4; i++) {
        let x = rand() * size;
        let y = rand() * size;
        let a = rand() * Math.PI * 2;
        ctx.strokeStyle = "rgba(33,30,24,0.22)";
        ctx.lineWidth = .6 + rand();
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let k = 0; k < 12; k++) {
            a += (rand() - .5) * .7;
            x += Math.cos(a) * (4 + rand() * 10);
            y += Math.sin(a) * (4 + rand() * 10);
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    addFineNoise(ctx, size, size, rand, .28, 128);
    const t = tex(c, {
        srgb: true
    });
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    return t;
}

export function createFineNormalTexture(size = 512) {
    const rand = mulberry32(202374887);
    const hc = canvas2d(size, size);
    const hctx = hc.getContext("2d");
    hctx.fillStyle = "#7f7f7f";
    hctx.fillRect(0, 0, size, size);
    const blob = (x, y, rx, ry, v, alpha) => {
        for (const ox of [ -size, 0, size ]) {
            for (const oy of [ -size, 0, size ]) {
                if (x + ox < -rx || x + ox > size + rx || y + oy < -ry || y + oy > size + ry) continue;
                hctx.save();
                hctx.translate(x + ox, y + oy);
                const g = hctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, ry));
                g.addColorStop(0, `rgba(${v},${v},${v},${alpha})`);
                g.addColorStop(.7, `rgba(${v},${v},${v},${alpha * .6})`);
                g.addColorStop(1, `rgba(${v},${v},${v},0)`);
                hctx.fillStyle = g;
                hctx.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry));
                hctx.beginPath();
                hctx.arc(0, 0, Math.max(rx, ry), 0, Math.PI * 2);
                hctx.fill();
                hctx.restore();
            }
        }
    };
    for (let i = 0; i < 190; i++) {
        const light = rand() < .5;
        blob(rand() * size, rand() * size, 2 + rand() * 22, 2 + rand() * 22, light ? 175 : 85, .04 + rand() * .11);
    }
    for (let i = 0; i < 5400; i++) {
        const x = rand() * size;
        const y = rand() * size;
        const v = Math.floor(70 + rand() * 120);
        const r = .35 + Math.pow(rand(), 2) * 1.8;
        hctx.fillStyle = `rgba(${v},${v},${v},${.08 + rand() * .3})`;
        for (const ox of [ -size, 0, size ]) {
            for (const oy of [ -size, 0, size ]) {
                if (x + ox < -3 || x + ox > size + 3 || y + oy < -3 || y + oy > size + 3) continue;
                hctx.beginPath();
                hctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
                hctx.fill();
            }
        }
    }
    addFineNoise(hctx, size, size, rand, .2, 128);
    const src = hctx.getImageData(0, 0, size, size).data;
    const nc = canvas2d(size, size);
    const nctx = nc.getContext("2d");
    const out = nctx.createImageData(size, size);
    const strength = 1.65;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const xl = (x - 1 + size) % size;
            const xr = (x + 1) % size;
            const yu = (y - 1 + size) % size;
            const yd = (y + 1) % size;
            const l = src[(y * size + xl) * 4] / 255;
            const r = src[(y * size + xr) * 4] / 255;
            const u = src[(yu * size + x) * 4] / 255;
            const d = src[(yd * size + x) * 4] / 255;
            const nx = (l - r) * strength;
            const ny = (d - u) * strength;
            const nz = 1;
            const inv = 1 / Math.hypot(nx, ny, nz);
            const i = (y * size + x) * 4;
            out.data[i] = (nx * inv * .5 + .5) * 255;
            out.data[i + 1] = (ny * inv * .5 + .5) * 255;
            out.data[i + 2] = (nz * inv * .5 + .5) * 255;
            out.data[i + 3] = 255;
        }
    }
    nctx.putImageData(out, 0, 0);
    const t = tex(nc, {
        srgb: false
    });
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    return t;
}

export function createFlashlightCookie() {
    const rand = mulberry32(11741841);
    const size = 512;
    const c = canvas2d(size, size);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, size, size);
    const g = ctx.createRadialGradient(256, 256, 4, 256, 256, 250);
    g.addColorStop(0, "rgba(255,255,255,1.0)");
    g.addColorStop(.18, "rgba(237,236,225,0.98)");
    g.addColorStop(.45, "rgba(196,196,184,0.82)");
    g.addColorStop(.72, "rgba(108,110,102,0.42)");
    g.addColorStop(.92, "rgba(34,35,32,0.09)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    ctx.globalCompositeOperation = "multiply";
    for (let i = 0; i < 34; i++) {
        const x = 110 + rand() * 292;
        const y = 110 + rand() * 292;
        const r = 10 + rand() * 80;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        const v = 175 + Math.floor(rand() * 60);
        grad.addColorStop(0, `rgba(${v},${v},${v},${.08 + rand() * .17})`);
        grad.addColorStop(1, `rgba(${v},${v},${v},0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
    }
    ctx.globalCompositeOperation = "lighter";
    const hg = ctx.createRadialGradient(265, 242, 1, 265, 242, 55);
    hg.addColorStop(0, "rgba(255,255,255,0.18)");
    hg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, size, size);
    ctx.globalCompositeOperation = "source-over";
    const t = tex(c, {
        srgb: true
    });
    return t;
}

export function createEnvironmentTexture() {
    const c = canvas2d(1024, 512);
    const ctx = c.getContext("2d");
    const bg = ctx.createLinearGradient(0, 0, 0, 512);
    bg.addColorStop(0, "#0b0f12");
    bg.addColorStop(.4, "#151a1b");
    bg.addColorStop(.53, "#302e27");
    bg.addColorStop(.56, "#141311");
    bg.addColorStop(1, "#050605");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1024, 512);
    const dg = ctx.createRadialGradient(470, 282, 4, 470, 282, 120);
    dg.addColorStop(0, "rgba(208,217,210,0.72)");
    dg.addColorStop(.22, "rgba(124,137,138,0.2)");
    dg.addColorStop(1, "rgba(30,36,37,0)");
    ctx.fillStyle = dg;
    ctx.fillRect(0, 0, 1024, 512);
    ctx.fillStyle = "rgba(200,190,158,0.12)";
    for (let i = 0; i < 7; i++) {
        const x = 80 + i * 145;
        ctx.beginPath();
        ctx.ellipse(x, 300 + i % 3 * 20, 22, 10, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.mapping = THREE.EquirectangularReflectionMapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
}
