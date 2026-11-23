import * as THREE from "three";

let ANISO = 8;

export function setTextureAnisotropy(value) {
    ANISO = Math.max(1, Math.min(16, value || 8));
}

function makeCanvas(width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
}

function toTexture(canvas, {srgb: srgb = true, repeat: repeat = null, wrap: wrap = THREE.RepeatWrapping} = {}) {
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.anisotropy = ANISO;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = wrap;
    texture.wrapT = wrap;
    if (repeat) {
        texture.repeat.set(repeat[0], repeat[1]);
    }
    texture.needsUpdate = true;
    return texture;
}

function rngFactory(seed) {
    let s = seed >>> 0;
    return function rand() {
        s += 1831565813;
        let t = s;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

function roundedRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.arcTo(x + w, y, x + w, y + rr, rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
    ctx.lineTo(x + rr, y + h);
    ctx.arcTo(x, y + h, x, y + h - rr, rr);
    ctx.lineTo(x, y + rr);
    ctx.arcTo(x, y, x + rr, y, rr);
    ctx.closePath();
}

function drawNoise(ctx, width, height, amount, alpha, seed = 1, color = false) {
    const rand = rngFactory(seed);
    const image = ctx.getImageData(0, 0, width, height);
    const data = image.data;
    for (let i = 0; i < data.length; i += 4) {
        const n = (rand() - .5) * amount;
        if (color) {
            data[i] = Math.max(0, Math.min(255, data[i] + n * .84));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n * .96));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
        } else {
            data[i] = Math.max(0, Math.min(255, data[i] + n));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
        }
        if (alpha !== undefined) {
            data[i + 3] = Math.max(0, Math.min(255, alpha + n * .6));
        }
    }
    ctx.putImageData(image, 0, 0);
}

function brushedLines(ctx, width, height, count, alpha, seed = 14) {
    const rand = rngFactory(seed);
    ctx.save();
    for (let i = 0; i < count; i++) {
        const x = rand() * width;
        const y = rand() * height;
        const len = 20 + rand() * height * .65;
        const lift = rand() > .5 ? 1 : -1;
        ctx.strokeStyle = `rgba(${lift > 0 ? 255 : 0},${lift > 0 ? 255 : 0},${lift > 0 ? 255 : 0},${alpha * (.25 + rand())})`;
        ctx.lineWidth = .4 + rand() * 1.3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + len, y + (rand() - .5) * 4);
        ctx.stroke();
    }
    ctx.restore();
}

export function createFloorTexture() {
    const S = 2048;
    const tile = S / 2;
    const canvas = makeCanvas(S, S);
    const ctx = canvas.getContext("2d", {
        willReadFrequently: true
    });
    const rand = rngFactory(8021);
    ctx.fillStyle = "#30363d";
    ctx.fillRect(0, 0, S, S);
    for (let ty = 0; ty < 2; ty++) {
        for (let tx = 0; tx < 2; tx++) {
            const ox = tx * tile;
            const oy = ty * tile;
            const g = ctx.createLinearGradient(ox, oy, ox + tile, oy + tile);
            const shade = 92 + Math.floor(rand() * 12);
            g.addColorStop(0, `rgb(${shade + 15},${shade + 21},${shade + 28})`);
            g.addColorStop(.34, `rgb(${shade + 3},${shade + 9},${shade + 16})`);
            g.addColorStop(.7, `rgb(${shade - 10},${shade - 3},${shade + 5})`);
            g.addColorStop(1, `rgb(${shade - 18},${shade - 10},${shade})`);
            ctx.fillStyle = g;
            ctx.fillRect(ox + 2, oy + 2, tile - 4, tile - 4);
            ctx.strokeStyle = "rgba(8,12,16,0.92)";
            ctx.lineWidth = 8;
            ctx.strokeRect(ox + 4, oy + 4, tile - 8, tile - 8);
            ctx.strokeStyle = "rgba(184,203,215,0.25)";
            ctx.lineWidth = 2;
            ctx.strokeRect(ox + 13, oy + 13, tile - 26, tile - 26);
            ctx.strokeStyle = "rgba(5,8,11,0.42)";
            ctx.lineWidth = 2;
            ctx.strokeRect(ox + 18, oy + 18, tile - 36, tile - 36);
            for (const [cx, cy] of [ [ 36, 36 ], [ tile - 36, 36 ], [ 36, tile - 36 ], [ tile - 36, tile - 36 ] ]) {
                ctx.beginPath();
                ctx.fillStyle = "rgba(23,29,35,0.9)";
                ctx.arc(ox + cx, oy + cy, 8.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = "rgba(173,190,200,0.28)";
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.beginPath();
                ctx.strokeStyle = "rgba(178,195,207,0.32)";
                ctx.lineWidth = 1.2;
                ctx.moveTo(ox + cx - 3.5, oy + cy);
                ctx.lineTo(ox + cx + 3.5, oy + cy);
                ctx.moveTo(ox + cx, oy + cy - 3.5);
                ctx.lineTo(ox + cx, oy + cy + 3.5);
                ctx.stroke();
            }
            const pad = 34;
            const gap = 10;
            const plateW = (tile - pad * 2 - gap) / 2;
            const plateH = (tile - pad * 2 - gap) / 2;
            const tint = 70 + rand() * 12;
            for (let py = 0; py < 2; py++) {
                for (let px = 0; px < 2; px++) {
                    const ix = ox + pad + px * (plateW + gap);
                    const iy = oy + pad + py * (plateH + gap);
                    const plateGrad = ctx.createLinearGradient(ix, iy, ix + plateW, iy + plateH);
                    plateGrad.addColorStop(0, `rgb(${tint + 35},${tint + 43},${tint + 52})`);
                    plateGrad.addColorStop(.5, `rgb(${tint + 8},${tint + 15},${tint + 23})`);
                    plateGrad.addColorStop(1, `rgb(${tint - 5},${tint + 1},${tint + 8})`);
                    ctx.fillStyle = plateGrad;
                    ctx.fillRect(ix, iy, plateW, plateH);
                    ctx.strokeStyle = "rgba(6,9,12,0.65)";
                    ctx.lineWidth = 6;
                    ctx.strokeRect(ix + 3, iy + 3, plateW - 6, plateH - 6);
                    ctx.strokeStyle = "rgba(196,215,226,0.24)";
                    ctx.lineWidth = 1.4;
                    ctx.strokeRect(ix + 8, iy + 8, plateW - 16, plateH - 16);
                    const cols = 14;
                    const rows = 14;
                    const stepX = (plateW - 28) / cols;
                    const stepY = (plateH - 28) / rows;
                    for (let ry = 0; ry < rows; ry++) {
                        for (let rx = 0; rx < cols; rx++) {
                            const hx = ix + 14 + stepX * (rx + .5);
                            const hy = iy + 14 + stepY * (ry + .5);
                            const rr = 4.1 + rand() * .7;
                            ctx.beginPath();
                            ctx.fillStyle = "rgba(2,5,8,0.96)";
                            ctx.arc(hx, hy, rr, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.beginPath();
                            ctx.strokeStyle = "rgba(216,233,242,0.55)";
                            ctx.lineWidth = 1.35;
                            ctx.arc(hx, hy, rr + 1, .3, Math.PI - .1);
                            ctx.stroke();
                        }
                    }
                }
            }
            brushedLines(ctx, tile, tile, 46, .04, 131 + tx * 9 + ty * 17);
            ctx.save();
            ctx.translate(ox, oy);
            ctx.strokeStyle = "rgba(210,226,235,0.12)";
            ctx.lineWidth = 1;
            for (let i = 0; i < 4; i++) {
                const sx = 50 + rand() * (tile - 100);
                const sy = 50 + rand() * (tile - 100);
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx + 12 + rand() * 70, sy + (rand() - .5) * 8);
                ctx.stroke();
            }
            ctx.fillStyle = "rgba(12,17,22,0.5)";
            ctx.font = '10px "Helios Mono", monospace';
            ctx.fillText("ANTI—STATIC  /  600", tile - 206, tile - 15);
            ctx.restore();
        }
    }
    drawNoise(ctx, S, S, 8, undefined, 91, true);
    return toTexture(canvas, {
        srgb: true
    });
}

export function createMeshAlphaTexture() {
    const W = 512;
    const H = 1024;
    const canvas = makeCanvas(W, H);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#000000";
    const startX = 39;
    const endX = W - 39;
    const startY = 102;
    const endY = H - 118;
    const step = 7.2;
    for (let y = startY; y < endY; y += step) {
        for (let x = startX + Math.round(y / step) % 2 * step * .5; x < endX; x += step) {
            ctx.beginPath();
            ctx.arc(x, y, 1.95, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, 100);
    ctx.fillRect(0, H - 120, W, 120);
    ctx.fillRect(0, 0, 37, H);
    ctx.fillRect(W - 37, 0, 37, H);
    ctx.fillRect(0, H * .55, W, 5);
    return toTexture(canvas, {
        srgb: false
    });
}

function drawDoorBase(ctx, w, h, variant, seed) {
    const rand = rngFactory(seed);
    const g = ctx.createLinearGradient(0, 0, w * .75, h);
    const warm = variant === 2 ? 5 : 2;
    g.addColorStop(0, `rgb(${28 + warm},${32 + warm},${35 + warm})`);
    g.addColorStop(.2, "rgb(16,19,22)");
    g.addColorStop(.64, "rgb(9,11,13)");
    g.addColorStop(1, `rgb(${11 + warm},${13 + warm},${15 + warm})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const border = ctx.createLinearGradient(0, 0, w, h);
    border.addColorStop(0, "rgba(99,111,122,0.28)");
    border.addColorStop(.22, "rgba(33,39,44,0.18)");
    border.addColorStop(.8, "rgba(2,4,6,0.55)");
    border.addColorStop(1, "rgba(86,96,104,0.13)");
    ctx.strokeStyle = border;
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, w - 14, h - 14);
    ctx.strokeStyle = "rgba(3,5,7,0.9)";
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, w - 40, h - 40);
    ctx.strokeStyle = "rgba(151,168,178,0.12)";
    ctx.lineWidth = 1;
    ctx.strokeRect(24.5, 24.5, w - 49, h - 49);
    const sheen = ctx.createLinearGradient(0, 0, 0, h * .8);
    sheen.addColorStop(0, "rgba(156,178,192,0.085)");
    sheen.addColorStop(.25, "rgba(92,111,124,0.018)");
    sheen.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(20, 20, w - 40, h * .8);
    ctx.save();
    ctx.translate(w * .62, 0);
    ctx.rotate(-.055);
    ctx.fillStyle = "rgba(184,208,219,0.026)";
    ctx.fillRect(0, 0, w * .16, h);
    ctx.restore();
    roundedRect(ctx, 46, 104, w - 92, h - 208, 4);
    ctx.fillStyle = "rgba(3,5,7,0.38)";
    ctx.fill();
    ctx.strokeStyle = "rgba(130,147,158,0.12)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "rgba(163,183,193,0.62)";
    ctx.font = '700 14px "Helios Narrow", sans-serif';
    ctx.letterSpacing = "2px";
    ctx.fillText("HELIOS", 50, 68);
    ctx.fillStyle = "rgba(150,171,181,0.27)";
    ctx.font = '10px "Helios Mono", monospace';
    ctx.fillText(`NODE 07—${String(variant + 1).padStart(2, "0")}`, 50, 85);
    ctx.textAlign = "right";
    ctx.fillText(`SN ${seed.toString(16).toUpperCase().slice(-6)}`, w - 50, 85);
    ctx.textAlign = "left";
    const slotY = h - 182;
    ctx.save();
    ctx.globalAlpha = .54;
    for (let i = 0; i < 9; i++) {
        const y = slotY + i * 10;
        const grd = ctx.createLinearGradient(64, 0, w - 64, 0);
        grd.addColorStop(0, "rgba(47,55,61,0.8)");
        grd.addColorStop(.5, "rgba(23,28,32,1)");
        grd.addColorStop(1, "rgba(47,55,61,0.8)");
        ctx.fillStyle = grd;
        ctx.fillRect(64, y, w - 128, 4);
        ctx.fillStyle = "rgba(106,119,127,0.22)";
        ctx.fillRect(64, y + 4, w - 128, 1);
    }
    ctx.restore();
    ctx.fillStyle = "rgba(138,158,169,0.33)";
    ctx.font = '9px "Helios Mono", monospace';
    ctx.fillText("CAB / 2200 × 800 / 42U", 50, h - 167);
    ctx.fillText("DOOR ACCESS  ⟂  04", 50, h - 151);
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < 20; i++) {
        ctx.strokeStyle = `rgba(180,198,209,${.014 + rand() * .018})`;
        ctx.lineWidth = .5 + rand();
        const x = 35 + rand() * (w - 70);
        const y = 140 + rand() * (h - 320);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rand() - .5) * 36, y + 18 + rand() * 80);
        ctx.stroke();
    }
    ctx.restore();
    return rand;
}

export function createServerDoorTextures() {
    const W = 512;
    const H = 1024;
    const variants = [];
    for (let variant = 0; variant < 3; variant++) {
        const canvas = makeCanvas(W, H);
        const ctx = canvas.getContext("2d", {
            willReadFrequently: true
        });
        const rand = drawDoorBase(ctx, W, H, variant, 231 + variant * 71);
        if (variant === 0) {
            const x0 = 56, y0 = 204, x1 = W - 56, y1 = H - 300;
            ctx.save();
            ctx.fillStyle = "rgba(4,6,8,0.72)";
            ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
            ctx.strokeStyle = "rgba(140,158,169,0.16)";
            ctx.lineWidth = 2;
            ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
            for (let y = y0 + 9; y < y1; y += 8.1) {
                for (let x = x0 + 8; x < x1; x += 8.1) {
                    ctx.beginPath();
                    ctx.fillStyle = "rgba(2,3,4,0.93)";
                    ctx.arc(x, y, 1.95, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.strokeStyle = "rgba(151,174,188,0.08)";
                    ctx.lineWidth = .6;
                    ctx.arc(x, y, 2.4, .4, Math.PI - .2);
                    ctx.stroke();
                }
            }
            ctx.restore();
        } else if (variant === 1) {
            roundedRect(ctx, 79, 268, W - 158, 368, 3);
            ctx.fillStyle = "rgba(4,7,9,0.5)";
            ctx.fill();
            ctx.strokeStyle = "rgba(133,153,164,0.15)";
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.strokeStyle = "rgba(135,154,164,0.07)";
            ctx.strokeRect(92, 281, W - 184, 342);
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    const x = 60 + i * (W - 120) / 3;
                    const y = 734 + [ 0, 1 ][j] * 104;
                    ctx.fillStyle = "rgba(2,4,6,0.7)";
                    ctx.beginPath();
                    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            const gl = ctx.createLinearGradient(110, 300, 230, 620);
            gl.addColorStop(0, "rgba(154,184,202,0.06)");
            gl.addColorStop(.4, "rgba(60,83,96,0.02)");
            gl.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = gl;
            ctx.fillRect(110, 300, 250, 420);
        } else {
            ctx.fillStyle = "rgba(92,63,29,0.15)";
            ctx.fillRect(56, H - 320, W - 112, 26);
            for (let x = 56; x < W - 56; x += 22) {
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(x, H - 320);
                ctx.lineTo(x + 11, H - 320);
                ctx.lineTo(x + 22, H - 294);
                ctx.lineTo(x + 11, H - 294);
                ctx.closePath();
                ctx.fillStyle = "rgba(229,171,53,0.14)";
                ctx.fill();
                ctx.restore();
            }
            roundedRect(ctx, 222, 180, 68, 34, 2);
            ctx.fillStyle = "rgba(4,6,7,0.72)";
            ctx.fill();
            ctx.strokeStyle = "rgba(154,174,184,0.22)";
            ctx.stroke();
            ctx.fillStyle = "rgba(109,231,200,0.72)";
            ctx.fillRect(265, 194, 3, 3);
            ctx.fillStyle = "rgba(195,213,221,0.22)";
            ctx.font = '9px "Helios Mono", monospace';
            ctx.textAlign = "center";
            ctx.fillText("RESTRICTED  /  B3", W / 2, 230);
            ctx.textAlign = "left";
        }
        drawNoise(ctx, W, H, 7, undefined, 811 + variant * 12, true);
        variants.push(toTexture(canvas, {
            srgb: true
        }));
    }
    return variants;
}

export function createAssetPlateTexture(label, sub) {
    const canvas = makeCanvas(512, 160);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#d7dde0";
    ctx.fillRect(0, 0, 512, 160);
    ctx.strokeStyle = "rgba(30,38,42,0.35)";
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 504, 152);
    ctx.fillStyle = "#1c2328";
    ctx.font = '700 40px "Helios Narrow", sans-serif';
    ctx.letterSpacing = "5px";
    ctx.fillText(label, 30, 66);
    ctx.fillStyle = "rgba(24,33,39,0.6)";
    ctx.font = '18px "Helios Mono", monospace';
    ctx.letterSpacing = "1px";
    ctx.fillText(sub, 32, 108);
    const rand = rngFactory(19);
    for (let i = 0; i < 32; i++) {
        const w = 1 + Math.floor(rand() * 3);
        ctx.fillStyle = "rgba(20,28,33,0.62)";
        ctx.fillRect(388 + i * 3.2, 34, w, 58);
    }
    return toTexture(canvas, {
        srgb: true
    });
}

export function createDockScreenTexture(state = "idle", dockIndex = 2) {
    const W = 512, H = 256;
    const canvas = makeCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const ready = state === "ready";
    const accent = ready ? "#93f5ca" : "#78e2ee";
    ctx.fillStyle = "#041014";
    ctx.fillRect(0, 0, W, H);
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, ready ? "rgba(18,75,58,0.55)" : "rgba(12,57,67,0.52)");
    bg.addColorStop(1, "rgba(1,9,12,0.2)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = accent;
    ctx.globalAlpha = .6;
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, W - 20, H - 20);
    ctx.globalAlpha = 1;
    ctx.fillStyle = accent;
    ctx.font = '14px "Helios Mono", monospace';
    ctx.letterSpacing = "3px";
    ctx.fillText(`CHARGE PORT  /  ${String(dockIndex).padStart(2, "0")}`, 29, 45);
    ctx.textAlign = "right";
    ctx.fillText(ready ? "LINKED" : "STANDBY", W - 30, 45);
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(223,250,254,0.94)";
    ctx.font = '700 74px "Helios Narrow", sans-serif';
    ctx.letterSpacing = "4px";
    ctx.fillText(ready ? "READY" : "VACANT", 28, 132);
    ctx.strokeStyle = "rgba(153,230,237,0.19)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, 168);
    ctx.lineTo(W - 30, 168);
    ctx.stroke();
    ctx.strokeStyle = accent;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(30, 168);
    ctx.lineTo(ready ? 408 : 118, 168);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(196,231,238,0.54)";
    ctx.font = '14px "Helios Mono", monospace';
    ctx.letterSpacing = "1.3px";
    ctx.fillText(ready ? "HANDSHAKE  98%" : "AWAITING ROBOT", 30, 204);
    ctx.fillStyle = accent;
    ctx.fillText(ready ? "7.4 kW  ·  48 V" : "0.0 kW  ·  — V", 30, 228);
    for (let i = 0; i < 5; i++) {
        ctx.fillStyle = i < (ready ? 5 : 2) ? accent : "rgba(137,219,227,0.15)";
        ctx.fillRect(W - 108 + i * 15, 218 - i * 6, 8, 10 + i * 6);
    }
    ctx.globalAlpha = .08;
    for (let y = 0; y < H; y += 4) {
        ctx.fillStyle = "#b8f7fb";
        ctx.fillRect(0, y, W, 1);
    }
    ctx.globalAlpha = 1;
    return toTexture(canvas, {
        srgb: true
    });
}

export function createDockBrandTexture(index) {
    const canvas = makeCanvas(512, 128);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#d8dde0";
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = "#14191d";
    ctx.font = '700 34px "Helios Narrow", sans-serif';
    ctx.letterSpacing = "7px";
    ctx.fillText("HELIOS  //  CHARGE", 26, 53);
    ctx.fillStyle = "rgba(20,25,29,0.58)";
    ctx.font = '16px "Helios Mono", monospace';
    ctx.fillText(`FLEET DOCK  C—${String(index).padStart(2, "0")}`, 28, 88);
    ctx.fillStyle = "#1a2227";
    ctx.fillRect(452, 23, 31, 75);
    ctx.fillStyle = "#c4e0e5";
    ctx.beginPath();
    ctx.moveTo(461, 45);
    ctx.lineTo(474, 45);
    ctx.lineTo(466, 59);
    ctx.lineTo(473, 59);
    ctx.lineTo(458, 81);
    ctx.lineTo(464, 62);
    ctx.lineTo(457, 62);
    ctx.closePath();
    ctx.fill();
    return toTexture(canvas, {
        srgb: true
    });
}

export function createWallTexture() {
    const W = 1024, H = 1024;
    const canvas = makeCanvas(W, H);
    const ctx = canvas.getContext("2d", {
        willReadFrequently: true
    });
    const rand = rngFactory(335);
    const base = ctx.createLinearGradient(0, 0, 0, H);
    base.addColorStop(0, "#8d9aa4");
    base.addColorStop(.38, "#7a8791");
    base.addColorStop(.7, "#69757e");
    base.addColorStop(1, "#535e66");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(29,40,48,0.38)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, H * .66);
    ctx.lineTo(W, H * .66);
    ctx.stroke();
    ctx.strokeStyle = "rgba(230,239,244,0.13)";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, H * .66 - 5);
    ctx.lineTo(W, H * .66 - 5);
    ctx.stroke();
    for (let x = 0; x < W; x += 256) {
        ctx.strokeStyle = "rgba(26,37,45,0.22)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
        ctx.strokeStyle = "rgba(234,242,246,0.08)";
        ctx.beginPath();
        ctx.moveTo(x + 4, 0);
        ctx.lineTo(x + 4, H);
        ctx.stroke();
    }
    for (let i = 0; i < 18; i++) {
        const x = rand() * W;
        const y = rand() * H;
        const g = ctx.createRadialGradient(x, y, 1, x, y, 40 + rand() * 150);
        g.addColorStop(0, `rgba(20,29,35,${.015 + rand() * .03})`);
        g.addColorStop(1, "rgba(20,29,35,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - 200, y - 200, 400, 400);
    }
    brushedLines(ctx, W, H, 90, .018, 452);
    drawNoise(ctx, W, H, 10, undefined, 929, true);
    return toTexture(canvas, {
        srgb: true
    });
}

export function createCeilingTexture() {
    const W = 512, H = 512;
    const canvas = makeCanvas(W, H);
    const ctx = canvas.getContext("2d", {
        willReadFrequently: true
    });
    const rand = rngFactory(12);
    ctx.fillStyle = "#15191d";
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "rgba(57,65,72,0.25)");
    g.addColorStop(1, "rgba(0,0,0,0.4)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 30; i++) {
        const x = rand() * W;
        const y = rand() * H;
        ctx.strokeStyle = `rgba(140,155,166,${.02 + rand() * .035})`;
        ctx.lineWidth = .6;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 20 + rand() * 80, y + (rand() - .5) * 4);
        ctx.stroke();
    }
    drawNoise(ctx, W, H, 13, undefined, 72, true);
    return toTexture(canvas, {
        srgb: true,
        repeat: [ 4, 8 ]
    });
}

export function createBlackPanelTexture() {
    const W = 512, H = 1024;
    const canvas = makeCanvas(W, H);
    const ctx = canvas.getContext("2d", {
        willReadFrequently: true
    });
    const rand = rngFactory(551);
    const base = ctx.createLinearGradient(0, 0, W, 0);
    base.addColorStop(0, "#0c0f12");
    base.addColorStop(.24, "#15191d");
    base.addColorStop(.5, "#0a0d0f");
    base.addColorStop(.78, "#111519");
    base.addColorStop(1, "#06080a");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(121,140,151,0.24)";
    ctx.lineWidth = 2;
    ctx.strokeRect(11, 11, W - 22, H - 22);
    ctx.strokeStyle = "rgba(0,0,0,0.8)";
    ctx.lineWidth = 5;
    ctx.strokeRect(18, 18, W - 36, H - 36);
    ctx.fillStyle = "#7d8380";
    ctx.fillRect(63, 86, 172, 94);
    ctx.strokeStyle = "rgba(17,22,25,0.55)";
    ctx.strokeRect(67, 90, 164, 86);
    for (let i = 0; i < 5; i++) {
        ctx.fillStyle = `rgba(39,48,53,${.48 - i * .06})`;
        ctx.fillRect(78, 104 + i * 12, 90 + i * 17 % 58, 3);
    }
    ctx.fillStyle = "rgba(34,43,48,0.7)";
    ctx.font = '11px "Helios Mono", monospace';
    ctx.fillText("CE / EAC / ISO 9001", 78, 168);
    ctx.fillStyle = "#090c0e";
    ctx.fillRect(354, 60, 88, 142);
    ctx.strokeStyle = "rgba(142,162,172,0.15)";
    ctx.strokeRect(354, 60, 88, 142);
    ctx.fillStyle = "rgba(154,191,207,0.11)";
    ctx.fillRect(365, 74, 66, 80);
    ctx.fillStyle = "rgba(118,220,228,0.55)";
    ctx.fillRect(365, 158, 4, 4);
    ctx.fillStyle = "rgba(194,213,222,0.25)";
    ctx.font = '8px "Helios Mono", monospace';
    ctx.fillText("ACCESS 03", 365, 181);
    ctx.fillStyle = "rgba(178,192,201,0.36)";
    ctx.fillRect(62, 706, 388, 1);
    ctx.font = '11px "Helios Mono", monospace';
    ctx.fillStyle = "rgba(188,201,209,0.32)";
    ctx.fillText("HX—RCS / 07          ROBOTICS CHARGE CONTROL", 62, 733);
    ctx.fillStyle = "rgba(212,221,223,0.82)";
    ctx.font = '58px "Helios Han", "WenQuanYi Zen Hei", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("机器人充电区", W / 2, 458);
    ctx.fillStyle = "rgba(201,219,226,0.42)";
    ctx.font = '15px "Helios Mono", monospace';
    ctx.letterSpacing = "4px";
    ctx.fillText("ROBOT CHARGING ZONE", W / 2, 495);
    ctx.textAlign = "left";
    ctx.letterSpacing = "0px";
    ctx.strokeStyle = "rgba(0,0,0,0.9)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(472, 30);
    ctx.lineTo(472, H - 30);
    ctx.stroke();
    roundedRect(ctx, 430, 540, 16, 110, 7);
    ctx.fillStyle = "rgba(0,0,0,0.9)";
    ctx.fill();
    ctx.strokeStyle = "rgba(129,147,157,0.2)";
    ctx.stroke();
    brushedLines(ctx, W, H, 60, .018, 212);
    drawNoise(ctx, W, H, 7, undefined, 284, true);
    return toTexture(canvas, {
        srgb: true
    });
}

export function createWarningDecalTexture() {
    const W = 512, H = 384;
    const canvas = makeCanvas(W, H);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#d5d9d8";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(35,44,48,0.35)";
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, W - 16, H - 16);
    ctx.fillStyle = "#1d2428";
    ctx.font = '700 27px "Helios Narrow", sans-serif';
    ctx.letterSpacing = "2px";
    ctx.fillText("CAUTION", 30, 54);
    ctx.fillStyle = "rgba(29,36,40,0.6)";
    ctx.font = '13px "Helios Mono", monospace';
    ctx.letterSpacing = "1px";
    ctx.fillText("HIGH VOLTAGE  /  ROBOT CHARGE CIRCUIT", 30, 81);
    ctx.strokeStyle = "rgba(32,40,44,0.45)";
    ctx.beginPath();
    ctx.moveTo(30, 98);
    ctx.lineTo(W - 30, 98);
    ctx.stroke();
    ctx.fillStyle = "#e4b532";
    ctx.beginPath();
    ctx.moveTo(124, 130);
    ctx.lineTo(200, 268);
    ctx.lineTo(48, 268);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#1a2024";
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.fillStyle = "#1a2024";
    ctx.font = '700 92px "Helios Narrow", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("!", 124, 247);
    ctx.textAlign = "left";
    ctx.strokeStyle = "#20282c";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(322, 196, 36, -Math.PI * .72, Math.PI * .72);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(336, 158);
    ctx.lineTo(366, 128);
    ctx.moveTo(360, 172);
    ctx.lineTo(390, 142);
    ctx.stroke();
    ctx.fillStyle = "#20282c";
    ctx.font = '700 18px "Helios Mono", monospace';
    ctx.fillText("400 VAC", 278, 278);
    ctx.fillStyle = "rgba(25,32,36,0.54)";
    ctx.font = '11px "Helios Mono", monospace';
    ctx.fillText("ISOLATE BEFORE SERVICE", 30, 343);
    return toTexture(canvas, {
        srgb: true
    });
}

export function createServiceLogTexture() {
    const canvas = makeCanvas(512, 640);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#d4d8d5";
    ctx.fillRect(0, 0, 512, 640);
    ctx.fillStyle = "rgba(37,46,49,0.75)";
    ctx.font = '700 24px "Helios Narrow", sans-serif';
    ctx.letterSpacing = "2px";
    ctx.fillText("SERVICE NOTICE", 36, 52);
    ctx.strokeStyle = "rgba(42,51,54,0.35)";
    ctx.strokeRect(18, 16, 476, 608);
    ctx.strokeStyle = "rgba(42,51,54,0.2)";
    for (let i = 0; i < 14; i++) {
        ctx.beginPath();
        ctx.moveTo(40, 110 + i * 30);
        ctx.lineTo(472, 110 + i * 30);
        ctx.stroke();
    }
    for (let i = 0; i < 12; i++) {
        const y = 102 + i * 30;
        ctx.fillStyle = `rgba(38,48,52,${.25 + i % 3 * .12})`;
        ctx.fillRect(48, y, 90 + i * 53 % 250, 4);
    }
    ctx.fillStyle = "#12181b";
    ctx.font = '12px "Helios Mono", monospace';
    ctx.fillText("AUTO RELEASE — DO NOT OBSTRUCT", 36, 580);
    return toTexture(canvas, {
        srgb: true
    });
}

export function createDoorSignTexture() {
    const W = 512, H = 160;
    const canvas = makeCanvas(W, H);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#d2d7d6";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#151b1f";
    ctx.font = '700 42px "Helios Narrow", sans-serif';
    ctx.letterSpacing = "5px";
    ctx.fillText("AISLE 03", 30, 67);
    ctx.fillStyle = "rgba(27,35,39,0.55)";
    ctx.font = '16px "Helios Mono", monospace';
    ctx.letterSpacing = "1px";
    ctx.fillText("AUTHORISED SERVICE ACCESS ONLY", 30, 107);
    ctx.fillStyle = "#202930";
    ctx.fillRect(W - 110, 32, 66, 92);
    ctx.fillStyle = "#b9c4c0";
    ctx.font = '12px "Helios Mono", monospace';
    ctx.fillText("B3", W - 95, 68);
    ctx.fillText("SEC", W - 98, 88);
    ctx.fillText("07", W - 98, 108);
    return toTexture(canvas, {
        srgb: true
    });
}

export function createExitSignTexture() {
    const W = 512, H = 160;
    const canvas = makeCanvas(W, H);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#082e24";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(132,239,195,0.6)";
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, W - 12, H - 12);
    ctx.fillStyle = "#8bf0c6";
    ctx.font = '700 68px "Helios Narrow", sans-serif';
    ctx.letterSpacing = "4px";
    ctx.fillText("EXIT", 38, 101);
    ctx.fillStyle = "rgba(139,240,198,0.58)";
    ctx.font = '16px "Helios Mono", monospace';
    ctx.fillText("03  /  EAST", 256, 92);
    ctx.fillStyle = "#8bf0c6";
    ctx.beginPath();
    ctx.arc(422, 48, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 9;
    ctx.strokeStyle = "#8bf0c6";
    ctx.beginPath();
    ctx.moveTo(421, 64);
    ctx.lineTo(412, 94);
    ctx.lineTo(391, 112);
    ctx.moveTo(414, 82);
    ctx.lineTo(444, 94);
    ctx.lineTo(460, 125);
    ctx.moveTo(416, 70);
    ctx.lineTo(447, 68);
    ctx.stroke();
    return toTexture(canvas, {
        srgb: true
    });
}

export function createStencilTexture() {
    const W = 1024, H = 1024;
    const canvas = makeCanvas(W, H);
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(185,219,224,0.42)";
    ctx.lineWidth = 5;
    ctx.setLineDash([ 26, 15 ]);
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 405, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(151,211,217,0.16)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 362, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(208,236,238,0.36)";
    ctx.font = '700 176px "Helios Narrow", sans-serif';
    ctx.textAlign = "center";
    ctx.letterSpacing = "4px";
    ctx.fillText("C2", W / 2, H / 2 + 48);
    ctx.fillStyle = "rgba(186,229,233,0.38)";
    ctx.font = '24px "Helios Mono", monospace';
    ctx.letterSpacing = "8px";
    ctx.fillText("ROBOT CHARGE BAY", W / 2, H / 2 + 112);
    ctx.strokeStyle = "rgba(177,225,230,0.3)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + Math.PI / 4;
        const x = W / 2 + Math.cos(a) * 434;
        const y = H / 2 + Math.sin(a) * 434;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a);
        ctx.strokeRect(-22, -22, 44, 44);
        ctx.restore();
    }
    ctx.fillStyle = "rgba(195,225,230,0.2)";
    ctx.font = '17px "Helios Mono", monospace';
    ctx.textAlign = "left";
    ctx.fillText("KEEP CLEAR  /  AUTO RELEASE", 62, H - 58);
    ctx.textAlign = "right";
    ctx.fillText("ANTI—STATIC ZONE", W - 62, H - 58);
    ctx.textAlign = "left";
    return toTexture(canvas, {
        srgb: true
    });
}

export function createHazardTapeTexture() {
    const canvas = makeCanvas(512, 128);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#20241e";
    ctx.fillRect(0, 0, 512, 128);
    ctx.save();
    for (let x = -128; x < 640; x += 100) {
        ctx.fillStyle = "rgba(210,171,50,0.78)";
        ctx.beginPath();
        ctx.moveTo(x, 128);
        ctx.lineTo(x + 40, 128);
        ctx.lineTo(x + 168, 0);
        ctx.lineTo(x + 128, 0);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = .16;
    for (let y = 0; y < 128; y += 7) {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, y, 512, 2);
    }
    ctx.globalAlpha = 1;
    return toTexture(canvas, {
        srgb: true,
        repeat: [ 1, 1 ]
    });
}

export function createFarDoorTexture() {
    const W = 512, H = 1024;
    const canvas = makeCanvas(W, H);
    const ctx = canvas.getContext("2d", {
        willReadFrequently: true
    });
    const rand = rngFactory(102);
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#49565f");
    g.addColorStop(.45, "#3c4851");
    g.addColorStop(1, "#2c363e");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(14,20,24,0.7)";
    ctx.lineWidth = 6;
    ctx.strokeRect(9, 9, W - 18, H - 18);
    ctx.strokeStyle = "rgba(177,196,205,0.15)";
    ctx.lineWidth = 2;
    ctx.strokeRect(22, 22, W - 44, H - 44);
    ctx.fillStyle = "rgba(24,32,37,0.34)";
    ctx.fillRect(0, H - 170, W, 170);
    ctx.fillStyle = "rgba(193,210,217,0.08)";
    ctx.fillRect(0, H - 172, W, 2);
    brushedLines(ctx, W, H, 80, .023, 832);
    drawNoise(ctx, W, H, 11, undefined, 377, true);
    ctx.fillStyle = "rgba(175,190,198,0.36)";
    ctx.fillRect(68, 470, 18, 210);
    ctx.fillStyle = "rgba(28,36,41,0.7)";
    ctx.fillRect(67, 534, 20, 56);
    return toTexture(canvas, {
        srgb: true
    });
}

export function createNoticeTexture(kind = "paper") {
    const W = 384, H = 512;
    const canvas = makeCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const rand = rngFactory(kind === "paper" ? 23 : 99);
    ctx.fillStyle = kind === "paper" ? "#cfd2cb" : "#1f2a30";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = kind === "paper" ? "rgba(33,41,44,0.45)" : "rgba(154,201,211,0.3)";
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, W - 12, H - 12);
    ctx.fillStyle = kind === "paper" ? "#21292d" : "rgba(189,231,237,0.72)";
    ctx.font = '700 30px "Helios Narrow", sans-serif';
    ctx.letterSpacing = "3px";
    ctx.fillText(kind === "paper" ? "NOTICE / 07" : "ACCESS LOG", 30, 58);
    ctx.strokeStyle = kind === "paper" ? "rgba(33,41,44,0.22)" : "rgba(150,198,208,0.2)";
    for (let i = 0; i < 9; i++) {
        ctx.beginPath();
        ctx.moveTo(30, 100 + i * 38);
        ctx.lineTo(W - 30, 100 + i * 38);
        ctx.stroke();
    }
    for (let i = 0; i < 8; i++) {
        const w = 60 + rand() * 180;
        ctx.fillStyle = kind === "paper" ? "rgba(36,46,50,0.3)" : "rgba(163,216,224,0.26)";
        ctx.fillRect(42, 95 + i * 38, w, 4);
    }
    ctx.fillStyle = kind === "paper" ? "#2b3437" : "rgba(161,227,235,0.55)";
    ctx.font = '13px "Helios Mono", monospace';
    ctx.fillText("HX.FAC / MAINTENANCE", 30, H - 44);
    return toTexture(canvas, {
        srgb: true
    });
}

export function createRadialTexture(inner = "rgba(255,255,255,1)", outer = "rgba(255,255,255,0)", size = 256) {
    const canvas = makeCanvas(size, size);
    const ctx = canvas.getContext("2d");
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, inner);
    g.addColorStop(.24, "rgba(255,255,255,0.7)");
    g.addColorStop(.62, "rgba(255,255,255,0.16)");
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return toTexture(canvas, {
        srgb: true,
        wrap: THREE.ClampToEdgeWrapping
    });
}

export function createShadowTexture() {
    const size = 256;
    const canvas = makeCanvas(size, size);
    const ctx = canvas.getContext("2d");
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(0,0,0,0.72)");
    g.addColorStop(.4, "rgba(0,0,0,0.42)");
    g.addColorStop(.8, "rgba(0,0,0,0.08)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return toTexture(canvas, {
        srgb: false,
        wrap: THREE.ClampToEdgeWrapping
    });
}

export function createFloorPoolTexture() {
    const size = 256;
    const canvas = makeCanvas(size, size);
    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.scale(1, 2.3);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, size / 2);
    g.addColorStop(0, "rgba(179,250,249,0.85)");
    g.addColorStop(.3, "rgba(111,223,229,0.28)");
    g.addColorStop(1, "rgba(72,170,188,0)");
    ctx.fillStyle = g;
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.restore();
    return toTexture(canvas, {
        srgb: true,
        wrap: THREE.ClampToEdgeWrapping
    });
}

export function createSkyStripTexture() {
    const W = 32, H = 256;
    const canvas = makeCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(223,246,255,0)");
    g.addColorStop(.14, "rgba(223,246,255,0.8)");
    g.addColorStop(.46, "rgba(223,246,255,0.42)");
    g.addColorStop(.72, "rgba(223,246,255,0.08)");
    g.addColorStop(1, "rgba(223,246,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    return toTexture(canvas, {
        srgb: true,
        wrap: THREE.ClampToEdgeWrapping
    });
}

export function createLabelTexture(text, sub = "", options = {}) {
    const W = options.width || 512;
    const H = options.height || 160;
    const canvas = makeCanvas(W, H);
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    if (options.fill) {
        ctx.fillStyle = options.fill;
        ctx.fillRect(0, 0, W, H);
    }
    ctx.fillStyle = options.color || "rgba(225,240,244,0.9)";
    ctx.font = `700 ${options.fontSize || 52}px "Helios Narrow", sans-serif`;
    ctx.letterSpacing = `${options.tracking || 3}px`;
    ctx.textAlign = options.align || "left";
    const x = options.align === "center" ? W / 2 : options.padding || 24;
    ctx.fillText(text, x, options.baseline || 76);
    if (sub) {
        ctx.fillStyle = options.subColor || "rgba(184,215,224,0.5)";
        ctx.font = `${options.subSize || 18}px "Helios Mono", monospace`;
        ctx.letterSpacing = "2px";
        ctx.fillText(sub, x, options.subBaseline || 116);
    }
    ctx.textAlign = "left";
    return toTexture(canvas, {
        srgb: true
    });
}

export function createSignalPulseTexture() {
    const W = 64, H = 512;
    const canvas = makeCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(.38, "rgba(255,255,255,0.05)");
    g.addColorStop(.48, "rgba(255,255,255,0.9)");
    g.addColorStop(.52, "rgba(255,255,255,1)");
    g.addColorStop(.6, "rgba(255,255,255,0.08)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    return toTexture(canvas, {
        srgb: false,
        wrap: THREE.ClampToEdgeWrapping
    });
}

export function createDustTexture() {
    const size = 64;
    const canvas = makeCanvas(size, size);
    const ctx = canvas.getContext("2d");
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,0.9)");
    g.addColorStop(.25, "rgba(230,247,255,0.45)");
    g.addColorStop(1, "rgba(230,247,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return toTexture(canvas, {
        srgb: true,
        wrap: THREE.ClampToEdgeWrapping
    });
}

export function createRackInteriorTexture() {
    const W = 512, H = 1024;
    const canvas = makeCanvas(W, H);
    const ctx = canvas.getContext("2d", {
        willReadFrequently: true
    });
    const rand = rngFactory(9301);
    ctx.fillStyle = "#020405";
    ctx.fillRect(0, 0, W, H);
    const wall = ctx.createLinearGradient(0, 0, W, 0);
    wall.addColorStop(0, "#05080a");
    wall.addColorStop(.25, "#10161a");
    wall.addColorStop(.5, "#090d10");
    wall.addColorStop(.8, "#10161a");
    wall.addColorStop(1, "#020304");
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(91,106,115,0.22)";
    ctx.fillRect(31, 40, 26, H - 80);
    ctx.fillRect(W - 57, 40, 26, H - 80);
    for (let i = 0; i < 22; i++) {
        ctx.fillStyle = "rgba(2,4,5,0.7)";
        ctx.fillRect(36, 56 + i * 41, 5, 5);
        ctx.fillRect(W - 41, 56 + i * 41, 5, 5);
    }
    for (let i = 0; i < 11; i++) {
        const y = 66 + i * 78;
        const h = 50 + i % 3 * 9;
        const grad = ctx.createLinearGradient(75, y, W - 75, y + h);
        grad.addColorStop(0, i % 2 ? "#191f23" : "#11161a");
        grad.addColorStop(.55, "#080b0d");
        grad.addColorStop(1, "#1a2024");
        ctx.fillStyle = grad;
        ctx.fillRect(76, y, W - 152, h);
        ctx.strokeStyle = "rgba(115,133,144,0.14)";
        ctx.strokeRect(76.5, y + .5, W - 153, h - 1);
        for (let j = 0; j < 8; j++) {
            const x = 92 + j * 38;
            ctx.fillStyle = "rgba(4,6,8,0.65)";
            ctx.fillRect(x, y + 9, 28, h - 18);
            ctx.fillStyle = "rgba(103,120,130,0.18)";
            ctx.fillRect(x + 4, y + 13, 20, 3);
            ctx.fillStyle = rand() > .7 ? "rgba(77,219,255,0.9)" : "rgba(31,93,112,0.45)";
            ctx.fillRect(x + 24, y + h - 16, 2, 2);
        }
        if (i % 3 === 1) {
            ctx.fillStyle = "rgba(2,3,4,0.5)";
            ctx.fillRect(365, y + 5, 80, h - 10);
            for (let l = 0; l < 4; l++) {
                ctx.fillStyle = [ "#6be6ff", "#68ffc5", "#2e7d96", "#ffb44e" ][l];
                ctx.globalAlpha = .45 + rand() * .5;
                ctx.fillRect(373 + l * 12, y + 16, 4, 2);
            }
            ctx.globalAlpha = 1;
        }
    }
    const cableColors = [ "#2e9dc3", "#3ed2da", "#1c74a2", "#68c9e0" ];
    for (let i = 0; i < 7; i++) {
        const x0 = 92 + i * 18;
        const x1 = 330 + i % 4 * 26;
        const y0 = 530 + i % 3 * 22;
        ctx.strokeStyle = cableColors[i % cableColors.length];
        ctx.globalAlpha = .33 + i % 3 * .12;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.bezierCurveTo(x0 + 40, y0 + 95, x1 - 35, y0 + 72, x1, y0 + 178);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
    ctx.fillStyle = "rgba(1,5,7,0.8)";
    ctx.fillRect(224, 486, 64, 205);
    ctx.fillStyle = "rgba(70,225,242,0.2)";
    ctx.fillRect(228, 490, 2, 196);
    const glow = ctx.createRadialGradient(256, 610, 5, 256, 610, 190);
    glow.addColorStop(0, "rgba(49,178,215,0.16)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(60, 430, 400, 380);
    drawNoise(ctx, W, H, 9, undefined, 413, true);
    return toTexture(canvas, {
        srgb: true
    });
}

export function createBaseAOStripTexture(flip = false) {
    const W = 512, H = 64;
    const canvas = makeCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, W, 0);
    const dark = "rgba(0,0,0,0.8)";
    const clear = "rgba(0,0,0,0)";
    g.addColorStop(0, clear);
    g.addColorStop(.48, "rgba(0,0,0,0.08)");
    g.addColorStop(.72, "rgba(0,0,0,0.5)");
    g.addColorStop(.9, "rgba(0,0,0,0.72)");
    g.addColorStop(1, dark);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (flip) {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(canvas, -W, 0);
        ctx.restore();
    }
    return toTexture(canvas, {
        srgb: false,
        wrap: THREE.ClampToEdgeWrapping
    });
}

export function createLightShaftTexture() {
    const W = 64, H = 512;
    const canvas = makeCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const gx = ctx.createLinearGradient(0, 0, W, 0);
    gx.addColorStop(0, "rgba(194,226,241,0)");
    gx.addColorStop(.36, "rgba(194,226,241,0.42)");
    gx.addColorStop(.5, "rgba(227,246,255,0.72)");
    gx.addColorStop(.64, "rgba(194,226,241,0.42)");
    gx.addColorStop(1, "rgba(194,226,241,0)");
    ctx.fillStyle = gx;
    ctx.fillRect(0, 0, W, H);
    const gy = ctx.createLinearGradient(0, 0, 0, H);
    gy.addColorStop(0, "rgba(255,255,255,0.9)");
    gy.addColorStop(.25, "rgba(255,255,255,0.55)");
    gy.addColorStop(1, "rgba(255,255,255,0)");
    ctx.globalCompositeOperation = "destination-in";
    ctx.fillStyle = gy;
    ctx.fillRect(0, 0, W, H);
    return toTexture(canvas, {
        srgb: true,
        wrap: THREE.ClampToEdgeWrapping
    });
}

export function createDockTagTexture() {
    const W = 512, H = 128;
    const canvas = makeCanvas(W, H);
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(3, 10, 13, 0.72)";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(141, 225, 232, 0.45)";
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, W - 4, H - 4);
    ctx.fillStyle = "rgba(144, 233, 239, 0.9)";
    ctx.fillRect(16, 24, 3, 80);
    ctx.fillStyle = "rgba(216, 246, 248, 0.92)";
    ctx.font = '700 34px "Helios Narrow", sans-serif';
    ctx.letterSpacing = "3px";
    ctx.fillText("DOCK 02", 34, 56);
    ctx.fillStyle = "rgba(134, 221, 230, 0.62)";
    ctx.font = '16px "Helios Mono", monospace';
    ctx.letterSpacing = "2px";
    ctx.fillText("VACANT / READY TO LINK", 35, 91);
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(143, 235, 241, 0.8)";
    ctx.font = '14px "Helios Mono", monospace';
    ctx.fillText("C2", W - 24, 56);
    ctx.textAlign = "left";
    return toTexture(canvas, {
        srgb: true,
        wrap: THREE.ClampToEdgeWrapping
    });
}
