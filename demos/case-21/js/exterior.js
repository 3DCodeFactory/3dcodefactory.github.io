import { makeCanvas, makeTexture, rng } from "./textures.js";

const TAU = Math.PI * 2;

function hexA(hex, a) {
    const h = hex.replace("#", "");
    const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
    return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
}

export function createExteriorView() {
    const W = 1600, H = 1280;
    const {canvas: canvas, ctx: ctx} = makeCanvas(W, H);
    const rnd = rng(812);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#cfdfe3");
    sky.addColorStop(.2, "#e6e9de");
    sky.addColorStop(.44, "#f4eed7");
    sky.addColorStop(.68, "#e2e2bc");
    sky.addColorStop(.84, "#c1cb9e");
    sky.addColorStop(1, "#9cac82");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    const sun = ctx.createRadialGradient(W * .29, H * .13, 8, W * .29, H * .13, W * .68);
    sun.addColorStop(0, "rgba(255,252,225,1)");
    sun.addColorStop(.12, "rgba(255,244,198,0.88)");
    sun.addColorStop(.4, "rgba(255,227,158,0.24)");
    sun.addColorStop(1, "rgba(255,224,150,0)");
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.fillStyle = "rgba(126,129,121,.55)";
    ctx.beginPath();
    ctx.moveTo(W * 0, H * .27);
    ctx.lineTo(W * .18, H * .19);
    ctx.lineTo(W * .33, H * .235);
    ctx.lineTo(W * .48, H * .17);
    ctx.lineTo(W * .64, H * .23);
    ctx.lineTo(W * .81, H * .165);
    ctx.lineTo(W * 1, H * .225);
    ctx.lineTo(W * 1, H * .3);
    ctx.lineTo(W * 0, H * .34);
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 7; i++) {
        const x = W * (.09 + i * .135);
        ctx.fillStyle = "rgba(142,137,124,.4)";
        ctx.fillRect(x, H * (.17 + i % 3 * .015), W * .018, H * .055);
    }
    ctx.restore();
    const bx = W * .245, by = H * .26, bw = W * .8, bh = H * .57;
    const stone = ctx.createLinearGradient(0, by, 0, by + bh);
    stone.addColorStop(0, "#e5dac6");
    stone.addColorStop(.5, "#d4c8b3");
    stone.addColorStop(1, "#b6aa96");
    ctx.fillStyle = stone;
    ctx.fillRect(bx, by, bw, bh);
    const shade = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    shade.addColorStop(0, "rgba(255,250,232,0.35)");
    shade.addColorStop(.55, "rgba(228,219,199,0.05)");
    shade.addColorStop(1, "rgba(138,145,135,0.32)");
    ctx.fillStyle = shade;
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = "rgba(130,117,97,.17)";
    ctx.lineWidth = 1.4;
    for (let row = 1; row < 15; row++) {
        const y = by + row / 15 * bh;
        ctx.beginPath();
        ctx.moveTo(bx, y);
        ctx.lineTo(bx + bw, y);
        ctx.stroke();
    }
    for (const yy of [ .12, .36, .62, .9 ]) {
        ctx.fillStyle = "rgba(255,250,236,.6)";
        ctx.fillRect(bx - 10, by + bh * yy, bw + 20, H * .009);
        ctx.fillStyle = "rgba(117,101,80,.26)";
        ctx.fillRect(bx - 10, by + bh * yy + H * .009, bw + 20, H * .006);
    }
    for (const fx of [ .04, .255, .47, .685, .9 ]) {
        ctx.fillStyle = "rgba(255,248,232,.46)";
        ctx.fillRect(bx + bw * fx, by, W * .013, bh);
        ctx.fillStyle = "rgba(122,107,86,.16)";
        ctx.fillRect(bx + bw * fx + W * .013, by, W * .006, bh);
    }
    function drawBalcony(x, y, w, h, bars = 7) {
        ctx.save();
        ctx.strokeStyle = "rgba(36,36,30,.86)";
        ctx.lineCap = "round";
        ctx.lineWidth = 3.4;
        ctx.beginPath();
        ctx.moveTo(x - w * .08, y);
        ctx.lineTo(x + w * 1.08, y);
        ctx.stroke();
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x - w * .06, y - h);
        ctx.lineTo(x + w * 1.06, y - h);
        ctx.stroke();
        for (let i = 0; i <= bars; i++) {
            const xx = x + i / bars * w;
            ctx.lineWidth = 1.35;
            ctx.beginPath();
            ctx.moveTo(xx, y);
            ctx.lineTo(xx, y - h);
            ctx.stroke();
            if (i < bars) {
                ctx.lineWidth = .9;
                ctx.beginPath();
                ctx.arc(xx + .5 / bars * w, y - h * .45, w * .022, -Math.PI * .8, Math.PI * .8);
                ctx.stroke();
            }
        }
        ctx.restore();
    }
    const cols = [ .105, .32, .535, .75 ];
    const rows = [ {
        y: .16,
        h: .21,
        w: .115
    }, {
        y: .43,
        h: .22,
        w: .115
    }, {
        y: .71,
        h: .19,
        w: .115
    } ];
    for (const row of rows) {
        for (const fx of cols) {
            const x = bx + bw * fx;
            const y = by + bh * row.y;
            const w = bw * row.w;
            const h = bh * row.h;
            ctx.fillStyle = "rgba(84,86,80,.9)";
            ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
            const gl = ctx.createLinearGradient(x, y, x + w, y + h);
            gl.addColorStop(0, "#43524f");
            gl.addColorStop(.38, "#677a75");
            gl.addColorStop(.6, "#35423f");
            gl.addColorStop(1, "#28302f");
            ctx.fillStyle = gl;
            ctx.fillRect(x, y, w, h);
            ctx.fillStyle = "rgba(214,228,222,.18)";
            ctx.beginPath();
            ctx.moveTo(x, y + h * .72);
            ctx.lineTo(x + w * .55, y);
            ctx.lineTo(x + w * .82, y);
            ctx.lineTo(x + w * .16, y + h);
            ctx.lineTo(x, y + h);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = "rgba(238,232,218,.92)";
            ctx.lineWidth = 3;
            ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + w / 2, y);
            ctx.lineTo(x + w / 2, y + h);
            ctx.moveTo(x, y + h * .3);
            ctx.lineTo(x + w, y + h * .3);
            ctx.moveTo(x, y + h * .68);
            ctx.lineTo(x + w, y + h * .68);
            ctx.stroke();
            drawBalcony(x, y + h * 1.02, w, h * .2);
            ctx.fillStyle = "rgba(198,192,178,.8)";
            ctx.fillRect(x - w * .19, y, w * .1, h);
            ctx.fillRect(x + w * 1.09, y, w * .1, h);
            ctx.strokeStyle = "rgba(132,126,112,.45)";
            ctx.lineWidth = 1;
            for (let s = 1; s < 8; s++) {
                ctx.beginPath();
                ctx.moveTo(x - w * .19, y + s / 8 * h);
                ctx.lineTo(x - w * .09, y + s / 8 * h);
                ctx.moveTo(x + w * 1.09, y + s / 8 * h);
                ctx.lineTo(x + w * 1.19, y + s / 8 * h);
                ctx.stroke();
            }
        }
    }
    ctx.save();
    ctx.strokeStyle = "rgba(40,39,32,.52)";
    ctx.lineWidth = 2.2;
    const by2 = by + bh * .71;
    ctx.beginPath();
    ctx.moveTo(bx + bw * .06, by2);
    ctx.lineTo(bx + bw * .94, by2);
    ctx.stroke();
    for (let i = 0; i < 46; i++) {
        const xx = bx + bw * (.06 + i / 45 * .88);
        ctx.beginPath();
        ctx.moveTo(xx, by2);
        ctx.lineTo(xx, by2 - H * .026);
        ctx.stroke();
    }
    ctx.restore();
    const facadeGlow = ctx.createLinearGradient(bx, by, bx + bw * .7, by + bh * .5);
    facadeGlow.addColorStop(0, "rgba(255,246,213,.54)");
    facadeGlow.addColorStop(.45, "rgba(255,247,220,.16)");
    facadeGlow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = facadeGlow;
    ctx.fillRect(bx, by, bw, bh);
    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(92,76,51,.92)";
    ctx.lineWidth = 56;
    ctx.beginPath();
    ctx.moveTo(W * .23, H * 1.03);
    ctx.bezierCurveTo(W * .255, H * .72, W * .215, H * .5, W * .31, H * .22);
    ctx.stroke();
    ctx.strokeStyle = "rgba(116,96,64,.6)";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(W * .235, H * 1);
    ctx.bezierCurveTo(W * .265, H * .72, W * .23, H * .5, W * .305, H * .28);
    ctx.stroke();
    ctx.strokeStyle = "rgba(86,70,46,.82)";
    ctx.lineWidth = 17;
    const limbs = [ [ W * .27, H * .58, W * .04, H * .34 ], [ W * .285, H * .46, W * .44, H * .2 ], [ W * .3, H * .34, W * .3, H * .07 ], [ W * .3, H * .5, W * .52, H * .44 ], [ W * .31, H * .33, W * .6, H * .14 ], [ W * .33, H * .42, W * .7, H * .32 ] ];
    for (const [x0, y0, x1, y1] of limbs) {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.bezierCurveTo(x0 - 30, y0 - 120, x1 + 60, y1 + 90, x1, y1);
        ctx.stroke();
    }
    ctx.restore();
    const depths = [ "#4e663c", "#627942", "#7e9154", "#3f5734", "#96a45f", "#33482b", "#a8a760" ];
    ctx.save();
    for (let i = 0; i < 130; i++) {
        let x, y;
        const pick = rnd();
        if (pick < .4) {
            x = W * (0 + rnd() * .34);
            y = H * (.02 + rnd() * .5);
        } else if (pick < .66) {
            x = W * (.68 + rnd() * .34);
            y = H * (.02 + rnd() * .48);
        } else if (pick < .82) {
            x = W * (.05 + rnd() * .9);
            y = H * (0 + rnd() * .13);
        } else {
            x = W * (.25 + rnd() * .6);
            y = H * (.58 + rnd() * .34);
        }
        ctx.globalAlpha = .14 + rnd() * .26;
        ctx.fillStyle = depths[rnd() * depths.length | 0];
        const r = 12 + rnd() * 38;
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * (.5 + rnd() * .6), rnd() * TAU, 0, TAU);
        ctx.fill();
    }
    ctx.restore();
    ctx.save();
    for (let i = 0; i < 55; i++) {
        ctx.globalAlpha = .05 + rnd() * .11;
        ctx.fillStyle = rnd() > .5 ? "#78855d" : "#596a4a";
        const x = W * (.08 + rnd() * .86), y = H * (.22 + rnd() * .5);
        ctx.beginPath();
        ctx.ellipse(x, y, 20 + rnd() * 70, 9 + rnd() * 34, rnd() * TAU, 0, TAU);
        ctx.fill();
    }
    ctx.restore();
    const palettes = [ [ "#32492b", "#5c7a3f", "#8a9f55", "#243722" ], [ "#3d542d", "#6f8945", "#b0b768", "#2c3d27" ], [ "#475e33", "#7a914e", "#c1bd74", "#32422b" ], [ "#59682f", "#8a9449", "#cdc07a", "#3c4827" ], [ "#6b5f2d", "#9a8548", "#d4c281", "#493d22" ], [ "#2b4028", "#4c6939", "#7c9152", "#1f2f20" ] ];
    const anchors = [ [ .02, .12, .15 ], [ .13, .06, .13 ], [ .24, .045, .11 ], [ .36, .03, .1 ], [ .52, .02, .09 ], [ .68, .035, .1 ], [ .82, .07, .12 ], [ .94, .15, .14 ], [ .02, .33, .12 ], [ .13, .28, .12 ], [ .25, .17, .11 ], [ .4, .14, .09 ], [ .62, .14, .08 ], [ .8, .25, .1 ], [ .95, .38, .12 ], [ .02, .55, .1 ], [ .17, .47, .1 ], [ .3, .62, .09 ], [ .88, .55, .1 ], [ .72, .44, .08 ], [ .98, .68, .05 ], [ .42, .74, .08 ], [ .6, .68, .07 ], [ .34, .27, .075 ], [ .46, .23, .07 ], [ .58, .3, .06 ], [ .69, .23, .065 ], [ .38, .43, .07 ], [ .49, .5, .06 ], [ .63, .46, .065 ], [ .74, .36, .06 ], [ .29, .53, .075 ], [ .54, .61, .065 ], [ .77, .61, .06 ], [ .45, .66, .065 ], [ .22, .71, .06 ], [ .86, .33, .07 ], [ .67, .55, .055 ] ];
    function leaf(x, y, len, ang, pal, alpha) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang);
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-len * .42, -len * .2, -len * .4, -len * .72, 0, -len);
        ctx.bezierCurveTo(len * .4, -len * .72, len * .42, -len * .2, 0, 0);
        ctx.fillStyle = pal[1];
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, -len * .06);
        ctx.bezierCurveTo(-len * .32, -len * .26, -len * .24, -len * .66, 0, -len * .95);
        ctx.bezierCurveTo(-len * .02, -len * .64, -len * .03, -len * .3, 0, -len * .06);
        ctx.fillStyle = hexA(pal[2], .62);
        ctx.fill();
        ctx.strokeStyle = hexA(pal[0], .8);
        ctx.lineWidth = Math.max(.6, len * .018);
        ctx.stroke();
        ctx.restore();
    }
    for (let i = 0; i < 1280; i++) {
        const a = anchors[rnd() * anchors.length | 0];
        const spread = .075 + rnd() * .08;
        const x = W * (a[0] + (rnd() - .5) * spread * 2);
        const y = H * (a[1] + (rnd() - .5) * spread * 1.4);
        const edge = Math.min(a[0], 1 - a[0], a[1]) < .16;
        const len = (edge ? 11 : 6) + rnd() * (edge ? 26 : 17);
        const pal = palettes[rnd() * palettes.length | 0];
        leaf(x, y, len, rnd() * TAU, pal, .72 + rnd() * .28);
    }
    for (let i = 0; i < 36; i++) {
        const left = i % 2 === 0;
        const x = W * (left ? rnd() * .2 : .8 + rnd() * .22);
        const y = H * (.08 + rnd() * .76);
        const pal = palettes[rnd() * palettes.length | 0];
        leaf(x, y, 34 + rnd() * 48, rnd() * TAU, pal, .5 + rnd() * .3);
    }
    for (let i = 0; i < 700; i++) {
        const a = anchors[rnd() * anchors.length | 0];
        const x = W * (a[0] + (rnd() - .5) * .16);
        const y = H * (a[1] + (rnd() - .5) * .11);
        const pal = palettes[rnd() * palettes.length | 0];
        leaf(x, y, 3 + rnd() * 9, rnd() * TAU, pal, .5 + rnd() * .4);
    }
    ctx.save();
    ctx.strokeStyle = "rgba(96,78,50,.68)";
    ctx.lineCap = "round";
    for (let i = 0; i < 8; i++) {
        ctx.lineWidth = 2 + rnd() * 5;
        ctx.beginPath();
        ctx.moveTo(W * (.02 + rnd() * .26), H * (.02 + rnd() * .2));
        ctx.bezierCurveTo(W * .4, H * (.05 + rnd() * .18), W * .55, H * (.14 + rnd() * .2), W * (.78 + rnd() * .2), H * (.08 + rnd() * .3));
        ctx.stroke();
    }
    ctx.restore();
    ctx.save();
    const railY = H * .775;
    ctx.strokeStyle = "rgba(34,34,28,.9)";
    ctx.lineCap = "round";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(W * .02, railY);
    ctx.lineTo(W * .98, railY);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(W * .02, railY + H * .028);
    ctx.lineTo(W * .98, railY + H * .028);
    ctx.stroke();
    for (let i = 0; i < 36; i++) {
        const x = W * (.035 + i * .026);
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(x, railY);
        ctx.lineTo(x, railY + H * .028);
        ctx.stroke();
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x + W * .009, railY + H * .014, W * .008, Math.PI * .2, Math.PI * 1.15);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x - W * .009, railY + H * .014, W * .008, Math.PI * 1.85, Math.PI * 2.8);
        ctx.stroke();
    }
    ctx.fillStyle = "rgba(190,178,148,.9)";
    ctx.fillRect(0, H * .9, W, H * .1);
    ctx.fillStyle = "rgba(230,220,194,.72)";
    ctx.fillRect(0, H * .9, W, H * .014);
    ctx.fillStyle = "rgba(126,113,91,.55)";
    ctx.fillRect(0, H * .938, W, H * .03);
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < 9; i++) {
        const x0 = W * (.12 + rnd() * .5), y0 = H * (0 + rnd() * .18);
        const g = ctx.createLinearGradient(x0, y0, x0 + W * .2, y0 + H * .6);
        g.addColorStop(0, "rgba(255,247,208,0.2)");
        g.addColorStop(.55, "rgba(255,238,181,0.06)");
        g.addColorStop(1, "rgba(255,235,170,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 + W * (.02 + rnd() * .05), y0);
        ctx.lineTo(x0 + W * (.22 + rnd() * .16), y0 + H * .8);
        ctx.lineTo(x0 + W * (.12 + rnd() * .16), y0 + H * .8);
        ctx.closePath();
        ctx.fill();
    }
    for (let i = 0; i < 48; i++) {
        const x = W * (.02 + rnd() * .94), y = H * (.03 + rnd() * .7);
        const r = 2 + rnd() * 9;
        const bg = ctx.createRadialGradient(x, y, 0, x, y, r);
        bg.addColorStop(0, "rgba(255,248,208,.65)");
        bg.addColorStop(1, "rgba(255,240,180,0)");
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
    }
    ctx.restore();
    const haze = ctx.createLinearGradient(0, 0, W, H);
    haze.addColorStop(0, "rgba(255,248,219,0.1)");
    haze.addColorStop(.55, "rgba(255,246,214,0.02)");
    haze.addColorStop(1, "rgba(196,214,191,0.07)");
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, W, H);
    return makeTexture(canvas, {
        anisotropy: 8
    });
}
