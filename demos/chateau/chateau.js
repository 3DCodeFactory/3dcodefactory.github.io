import * as THREE from "./vendor/three.module.js";

import { scaledBoxGeometry, getMaterials } from "./materials.js";

import { mulberry32 } from "./textures.js";

export const CHATEAU = {
    grade: 0,
    terrace: .55,
    halfWidth: 24.5,
    centralWidth: 23,
    wingWidth: 13,
    wingFront: 2.8,
    entranceZ: 1.15,
    roofPeak: 19.2
};

const unitBox = new THREE.BoxGeometry(1, 1, 1);

const unitPlane = new THREE.PlaneGeometry(1, 1);

function box(parent, w, h, d, mat, x, y, z, {cast: cast = true, receive: receive = true, rotY: rotY = 0, rotZ: rotZ = 0} = {}) {
    const m = new THREE.Mesh(unitBox, mat);
    m.scale.set(w, h, d);
    m.position.set(x, y, z);
    m.rotation.y = rotY;
    m.rotation.z = rotZ;
    m.castShadow = cast;
    m.receiveShadow = receive;
    parent.add(m);
    return m;
}

function stoneBox(parent, w, h, d, mat, x, y, z, {cast: cast = true, receive: receive = true, tileU: tileU = 4, tileV: tileV = 2.7, rotY: rotY = 0} = {}) {
    const m = new THREE.Mesh(scaledBoxGeometry(w, h, d, tileU, tileV), mat);
    m.position.set(x, y, z);
    m.rotation.y = rotY;
    m.castShadow = cast;
    m.receiveShadow = receive;
    parent.add(m);
    return m;
}

function plane(parent, w, h, mat, x, y, z, {rotY: rotY = 0, cast: cast = false, receive: receive = false} = {}) {
    const m = new THREE.Mesh(unitPlane, mat);
    m.scale.set(w, h, 1);
    m.position.set(x, y, z);
    m.rotation.y = rotY;
    m.castShadow = cast;
    m.receiveShadow = receive;
    parent.add(m);
    return m;
}

function addInstancedBoxes(parent, items, material, {cast: cast = true, receive: receive = true} = {}) {
    if (!items.length) return null;
    const mesh = new THREE.InstancedMesh(unitBox, material, items.length);
    const m = new THREE.Matrix4;
    const q = new THREE.Quaternion;
    const p = new THREE.Vector3;
    const s = new THREE.Vector3;
    items.forEach((it, i) => {
        p.set(it.x, it.y, it.z);
        q.setFromEuler(new THREE.Euler(0, it.rotY || 0, it.rotZ || 0));
        s.set(it.w, it.h, it.d);
        m.compose(p, q, s);
        mesh.setMatrixAt(i, m);
    });
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    mesh.frustumCulled = false;
    parent.add(mesh);
    return mesh;
}

function windowUnit(parent, M, {x: x, y: y, z: z, w: w, h: h, rotY: rotY = 0, lit: lit = false, arch: arch = false, balconyDoor: balconyDoor = false, surround: surround = true, muntins3d: muntins3d = true}) {
    const g = new THREE.Group;
    g.position.set(x, y, z);
    g.rotation.y = rotY;
    parent.add(g);
    const glassMat = lit ? M.glassLit : M.glass;
    box(g, w + .18, h + .18, .24, M.darkOpening, 0, h / 2, -.19, {
        cast: false
    });
    const glassGeo = arch ? archGeometry(w, h) : new THREE.PlaneGeometry(w, h);
    if (!arch) glassGeo.translate(0, h / 2, 0);
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.set(0, 0, .015);
    glass.receiveShadow = true;
    g.add(glass);
    if (surround) {
        const jambW = .3;
        const depth = .2;
        box(g, jambW, h + .38, depth, M.limestoneTrim, -w / 2 - jambW / 2, h / 2, .06);
        box(g, jambW, h + .38, depth, M.limestoneTrim, w / 2 + jambW / 2, h / 2, .06);
        box(g, w + 1, .3, depth + .16, M.limestoneTrim, 0, h + .22, .09);
        box(g, w + .98, .17, .34, M.limestoneTrim, 0, -.09, .11);
        box(g, w + 1.05, .08, .08, M.carvedStone, 0, -.205, .24);
        const key = box(g, .25, .4, .18, M.carvedStone, 0, h + .32, .19);
        key.rotation.z = 0;
        box(g, w * .48, .15, .07, M.carvedStone, 0, -.28, .19);
    }
    if (muntins3d) {
        box(g, .065, h, .06, M.windowTrimPaint, 0, h / 2, .055, {
            cast: false
        });
        box(g, w, .055, .05, M.windowTrimPaint, 0, h * .52, .057, {
            cast: false
        });
    }
    if (balconyDoor) {
        box(g, .035, .18, .035, M.copper, -.1, h * .48, .065, {
            cast: false
        });
        box(g, .035, .18, .035, M.copper, .1, h * .48, .065, {
            cast: false
        });
    }
    return g;
}

function archGeometry(w, h) {
    const r = w / 2;
    const straight = Math.max(.01, h - r);
    const s = new THREE.Shape;
    s.moveTo(-w / 2, 0);
    s.lineTo(-w / 2, straight);
    s.absarc(0, straight, r, Math.PI, 0, true);
    s.lineTo(w / 2, 0);
    s.closePath();
    const g = new THREE.ShapeGeometry(s, 24);
    g.computeBoundingBox();
    const bb = g.boundingBox;
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
        uv.setXY(i, (pos.getX(i) - bb.min.x) / (bb.max.x - bb.min.x), (pos.getY(i) - bb.min.y) / (bb.max.y - bb.min.y));
    }
    uv.needsUpdate = true;
    return g;
}

function archPanel(parent, M, {x: x, y: y, z: z, w: w, h: h, rotY: rotY = 0, glassW: glassW = .9, glassH: glassH = null, lit: lit = false}) {
    const group = new THREE.Group;
    group.position.set(x, y, z);
    group.rotation.y = rotY;
    parent.add(group);
    const stoneGeo = archGeometry(w, h);
    const stone = new THREE.Mesh(stoneGeo, M.limestoneTrim);
    stone.castShadow = true;
    stone.receiveShadow = true;
    group.add(stone);
    const gw = glassW;
    const gh = glassH ?? h - .35;
    box(group, gw + .18, gh + .12, .12, M.darkOpening, 0, (gh + .12) / 2, -.01, {
        cast: false
    });
    const gl = new THREE.Mesh(archGeometry(gw, gh), lit ? M.glassLit : M.glass);
    gl.position.set(0, .09, .13);
    group.add(gl);
    box(group, .23, .35, .16, M.carvedStone, 0, h - .04, .1);
    box(group, w + .22, .16, .28, M.limestoneTrim, 0, -.02, .1);
    const arc = new THREE.Mesh(new THREE.TorusGeometry(w * .5 - .12, .045, 5, 26, Math.PI), M.carvedStone);
    arc.position.set(0, h - w * .5, .1);
    arc.rotation.z = 0;
    group.add(arc);
    return group;
}

function balcony(parent, M, {x: x, y: y, z: z, width: width = 5.5, depth: depth = 1.25}) {
    const g = new THREE.Group;
    g.position.set(x, y, z);
    parent.add(g);
    box(g, width, .18, depth, M.limestoneTrim, 0, 0, depth / 2, {
        cast: true,
        receive: true
    });
    box(g, width - .12, .11, .22, M.carvedStone, 0, -.12, depth - .12);
    for (const cx of [ -width * .36, 0, width * .36 ]) {
        box(g, .27, .5, depth * .72, M.carvedStone, cx, -.36, depth * .36);
        box(g, .44, .17, depth * .5, M.carvedStone, cx, -.61, depth * .27);
    }
    const railY = 1.02;
    const zFront = depth - .06;
    box(g, width - .1, .055, .055, M.iron, 0, railY, zFront);
    box(g, width - .1, .04, .04, M.iron, 0, .12, zFront);
    box(g, width - .1, .04, .04, M.iron, 0, .56, zFront);
    const n = Math.max(12, Math.round(width / .25));
    for (let i = 0; i <= n; i++) {
        const bx = -width / 2 + .09 + i / n * (width - .18);
        box(g, .031, railY - .1, .031, M.iron, bx, railY / 2 + .04, zFront, {
            cast: false
        });
    }
    for (const sx of [ -1, 1 ]) {
        box(g, .04, railY, .04, M.iron, sx * (width / 2 - .06), railY / 2 + .04, depth / 2 + .02);
        box(g, .04, .05, depth - .1, M.iron, sx * (width / 2 - .06), railY, depth / 2);
        for (let i = 1; i < 5; i++) {
            box(g, .03, railY - .1, .03, M.iron, sx * (width / 2 - .06), railY / 2 + .04, .2 + i / 5 * (depth - .3), {
                cast: false
            });
        }
    }
    for (const cx of [ -1.25, 0, 1.25 ]) {
        const t = new THREE.Mesh(new THREE.TorusGeometry(.17, .014, 4, 18), M.iron);
        t.position.set(cx, .58, zFront + .005);
        g.add(t);
        const t2 = t.clone();
        t2.scale.set(.65, 1, 1);
        t2.position.x -= .31;
        g.add(t2);
        const t3 = t.clone();
        t3.scale.set(.65, 1, 1);
        t3.position.x += .31;
        g.add(t3);
    }
    for (let i = 0; i < 5; i++) {
        const bx = -width * .4 + i * width * .2;
        const sp = new THREE.Mesh(new THREE.ConeGeometry(.055, .2, 6), M.iron);
        sp.position.set(bx, railY + .1, zFront);
        g.add(sp);
    }
    return g;
}

function hipRoof(parent, M, {x: x, z: z, width: width, depth: depth, eaveY: eaveY, ridgeY: ridgeY, ridgeLen: ridgeLen, axis: axis = "x", overhang: overhang = .55}) {
    const W = width + overhang * 2;
    const D = depth + overhang * 2;
    const pos = [], uvs = [], indices = [];
    const cols = 7;
    const rows = 4;
    const pushQuad = (a, b, c, d, ua, va, ub, vb, uc, vc, ud, vd) => {
        const base = pos.length / 3;
        pos.push(...a, ...b, ...c, ...d);
        uvs.push(ua, va, ub, vb, uc, vc, ud, vd);
        indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    };
    const addGridFace = (u0, u1, edgeA, edgeB, ridgeA, ridgeB, uvScaleU, uvScaleV) => {
        for (let r = 0; r < rows; r++) {
            const t0 = r / rows, t1 = (r + 1) / rows;
            const y0 = eaveY + (ridgeY - eaveY) * Math.pow(t0, 1.12);
            const y1 = eaveY + (ridgeY - eaveY) * Math.pow(t1, 1.12);
            for (let c = 0; c < cols; c++) {
                const u0f = c / cols, u1f = (c + 1) / cols;
                const e0 = (new THREE.Vector3).lerpVectors(edgeA, edgeB, u0f);
                const e1 = (new THREE.Vector3).lerpVectors(edgeA, edgeB, u1f);
                const r0 = (new THREE.Vector3).lerpVectors(ridgeA, ridgeB, u0f);
                const r1 = (new THREE.Vector3).lerpVectors(ridgeA, ridgeB, u1f);
                const p00 = (new THREE.Vector3).lerpVectors(e0, r0, t0);
                p00.y = y0;
                const p10 = (new THREE.Vector3).lerpVectors(e1, r1, t0);
                p10.y = y0;
                const p01 = (new THREE.Vector3).lerpVectors(e0, r0, t1);
                p01.y = y1;
                const p11 = (new THREE.Vector3).lerpVectors(e1, r1, t1);
                p11.y = y1;
                const baseLen = edgeA.distanceTo(edgeB);
                const slopeLen = e0.distanceTo(r0);
                const uA = u0f * baseLen * uvScaleU, uB = u1f * baseLen * uvScaleU;
                const vA = t0 * slopeLen * uvScaleV, vB = t1 * slopeLen * uvScaleV;
                pushQuad([ p00.x, p00.y, p00.z ], [ p10.x, p10.y, p10.z ], [ p11.x, p11.y, p11.z ], [ p01.x, p01.y, p01.z ], uA, vA, uB, vA, uB, vB, uA, vB);
            }
        }
    };
    const hw = W / 2, hd = D / 2, hr = ridgeLen / 2;
    if (axis === "x") {
        addGridFace(-1, 1, new THREE.Vector3(-hw, eaveY, hd), new THREE.Vector3(hw, eaveY, hd), new THREE.Vector3(-hr, ridgeY, 0), new THREE.Vector3(hr, ridgeY, 0), 1 / 3.05, 1 / 2.35);
        addGridFace(-1, 1, new THREE.Vector3(hw, eaveY, -hd), new THREE.Vector3(-hw, eaveY, -hd), new THREE.Vector3(hr, ridgeY, 0), new THREE.Vector3(-hr, ridgeY, 0), 1 / 3.05, 1 / 2.35);
        addGridFace(-1, 1, new THREE.Vector3(-hw, eaveY, -hd), new THREE.Vector3(-hw, eaveY, hd), new THREE.Vector3(-hr, ridgeY, 0), new THREE.Vector3(-hr, ridgeY, 0), 1 / 3.05, 1 / 2.35);
        addGridFace(-1, 1, new THREE.Vector3(hw, eaveY, hd), new THREE.Vector3(hw, eaveY, -hd), new THREE.Vector3(hr, ridgeY, 0), new THREE.Vector3(hr, ridgeY, 0), 1 / 3.05, 1 / 2.35);
    } else {
        addGridFace(-1, 1, new THREE.Vector3(hw, eaveY, -hd), new THREE.Vector3(hw, eaveY, hd), new THREE.Vector3(0, ridgeY, -hr), new THREE.Vector3(0, ridgeY, hr), 1 / 3.05, 1 / 2.35);
        addGridFace(-1, 1, new THREE.Vector3(-hw, eaveY, hd), new THREE.Vector3(-hw, eaveY, -hd), new THREE.Vector3(0, ridgeY, hr), new THREE.Vector3(0, ridgeY, -hr), 1 / 3.05, 1 / 2.35);
        addGridFace(-1, 1, new THREE.Vector3(-hw, eaveY, -hd), new THREE.Vector3(hw, eaveY, -hd), new THREE.Vector3(0, ridgeY, -hr), new THREE.Vector3(0, ridgeY, -hr), 1 / 3.05, 1 / 2.35);
        addGridFace(-1, 1, new THREE.Vector3(hw, eaveY, hd), new THREE.Vector3(-hw, eaveY, hd), new THREE.Vector3(0, ridgeY, hr), new THREE.Vector3(0, ridgeY, hr), 1 / 3.05, 1 / 2.35);
    }
    const geo = new THREE.BufferGeometry;
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, M.slate);
    mesh.position.set(x, 0, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    const g = new THREE.Group;
    parent.add(g);
    g.position.set(x, 0, z);
    const eaveZ = hd, eaveX = hw;
    box(g, W + .15, .17, .13, M.zinc, 0, eaveY - .06, eaveZ - .04, {
        cast: true
    });
    box(g, W + .15, .17, .13, M.zinc, 0, eaveY - .06, -eaveZ + .04, {
        cast: true
    });
    box(g, .13, .17, D, M.zinc, eaveX - .04, eaveY - .06, 0, {
        cast: true
    });
    box(g, .13, .17, D, M.zinc, -eaveX + .04, eaveY - .06, 0, {
        cast: true
    });
    if (axis === "x") {
        const ridge = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, ridgeLen + .2, 8), M.zinc);
        ridge.rotation.z = Math.PI / 2;
        ridge.position.set(0, ridgeY + .02, 0);
        ridge.castShadow = true;
        g.add(ridge);
    } else {
        const ridge = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, ridgeLen + .2, 8), M.zinc);
        ridge.rotation.x = Math.PI / 2;
        ridge.position.set(0, ridgeY + .02, 0);
        ridge.castShadow = true;
        g.add(ridge);
    }
    return {
        group: g,
        W: W,
        D: D,
        hw: hw,
        hd: hd
    };
}

function chimney(parent, M, {x: x, z: z, baseY: baseY, topY: topY = 22.1, scale: scale = 1, pots: pots = 2}) {
    const g = new THREE.Group;
    g.position.set(x, 0, z);
    parent.add(g);
    const w = .95 * scale, d = .95 * scale;
    box(g, w + .36, .34, d + .36, M.plinth, 0, baseY - .05, 0);
    const h = topY - baseY;
    const shaft = new THREE.Mesh(scaledBoxGeometry(w, h, d, 1.15, .95), M.brick);
    shaft.position.set(0, baseY + h / 2, 0);
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    g.add(shaft);
    box(g, w + .13, .15, d + .13, M.carvedStone, 0, baseY + h * .36, 0);
    box(g, w + .25, .21, d + .25, M.carvedStone, 0, topY - .65, 0);
    box(g, w + .4, .16, d + .4, M.carvedStone, 0, topY - .48, 0);
    box(g, w + .2, .09, d + .2, M.soot, 0, topY - .39, 0);
    box(g, w + .015, .58, d + .015, M.soot, 0, topY - .13, 0);
    const rnd = mulberry32(x * 131 + z * 17 | 0);
    for (let p = 0; p < pots; p++) {
        const ox = (p - (pots - 1) / 2) * .38 * scale;
        const potH = (.46 + rnd() * .18) * scale;
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(.13 * scale, .17 * scale, potH, 10), M.terracotta);
        pot.position.set(ox, topY + potH / 2 - .01, (rnd() - .5) * .1);
        pot.castShadow = true;
        g.add(pot);
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(.17 * scale, .15 * scale, .075, 10), M.soot);
        rim.position.set(ox, topY + potH - .02, pot.position.z);
        g.add(rim);
    }
    return g;
}

let patinaTex = null;

function patinaTexture() {
    if (patinaTex) return patinaTex;
    const W = 512, H = 512;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const x = c.getContext("2d");
    x.clearRect(0, 0, W, H);
    const rnd = mulberry32(446);
    const base = x.createLinearGradient(0, H, 0, 0);
    base.addColorStop(0, "rgba(43,52,34,0.56)");
    base.addColorStop(.16, "rgba(63,67,49,0.31)");
    base.addColorStop(.46, "rgba(55,58,45,0.06)");
    base.addColorStop(.82, "rgba(49,52,42,0.02)");
    base.addColorStop(1, "rgba(37,41,35,0.2)");
    x.fillStyle = base;
    x.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) {
        const px = rnd() * W;
        const g = x.createLinearGradient(px, H * .08, px, H);
        g.addColorStop(0, "rgba(44,53,36,0)");
        g.addColorStop(.6, `rgba(52,59,41,${.03 + rnd() * .08})`);
        g.addColorStop(1, `rgba(43,54,33,${.12 + rnd() * .16})`);
        x.fillStyle = g;
        x.fillRect(px, H * .05, 1.5 + rnd() * 14, H);
    }
    for (let i = 0; i < 550; i++) {
        const px = rnd() * W, py = H * (.25 + rnd() * .75);
        const a = rnd() * .25;
        x.fillStyle = `rgba(${68 + rnd() * 30},${76 + rnd() * 25},${45 + rnd() * 18},${a})`;
        x.beginPath();
        x.arc(px, py, 1 + rnd() * 6, 0, Math.PI * 2);
        x.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    patinaTex = t;
    return t;
}

function patinaOverlay(parent, w, h, x, y, z, repeatX = 1, opacity = .7) {
    const map = patinaTexture().clone();
    map.needsUpdate = true;
    map.repeat.set(repeatX, 1);
    const mat = new THREE.MeshBasicMaterial({
        map: map,
        transparent: true,
        opacity: opacity,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        toneMapped: false
    });
    const m = plane(parent, w, h, mat, x, y, z, {
        rotY: 0
    });
    m.renderOrder = 1;
    return m;
}

let eaveTex = null;

function eaveShadowTexture() {
    if (eaveTex) return eaveTex;
    const W = 8, H = 128;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(18,17,12,0.62)");
    g.addColorStop(.22, "rgba(20,19,13,0.38)");
    g.addColorStop(.62, "rgba(24,22,16,0.12)");
    g.addColorStop(1, "rgba(24,22,16,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    eaveTex = t;
    return t;
}

function eaveShadow(parent, w, h, x, y, z, opacity = .7) {
    const mat = new THREE.MeshBasicMaterial({
        map: eaveShadowTexture(),
        transparent: true,
        opacity: opacity,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2
    });
    const m = plane(parent, w, h, mat, x, y, z, {});
    m.renderOrder = 2;
    return m;
}

function dormer(parent, M, {x: x, y: y, z: z, width: width = 2.2, bodyH: bodyH = 2.2, pedimentH: pedimentH = .65, lit: lit = false, arched: arched = true, tall: tall = false, faceZ: faceZ = 0}) {
    const g = new THREE.Group;
    g.position.set(x, y, z);
    parent.add(g);
    const depth = 3;
    stoneBox(g, width, bodyH, depth, M.limestoneTrim, 0, bodyH / 2, -depth / 2 + .02, {
        tileU: 2.4,
        tileV: 2.2
    });
    box(g, width + .34, .16, depth + .2, M.carvedStone, 0, bodyH + .02, -depth / 2 + .09);
    box(g, width + .18, .09, depth + .2, M.limestoneTrim, 0, bodyH + .13, -depth / 2 + .09);
    const ww = width * (tall ? .43 : .46);
    const wh = bodyH * .62;
    const wy = bodyH * .18;
    if (arched) {
        archPanel(g, M, {
            x: 0,
            y: wy,
            z: .04,
            w: ww + .5,
            h: wh + .32,
            glassW: ww,
            glassH: wh,
            lit: lit
        });
    } else {
        windowUnit(g, M, {
            x: 0,
            y: wy,
            z: .02,
            w: ww,
            h: wh,
            lit: lit,
            surround: true,
            muntins3d: true
        });
    }
    if (pedimentH > 0) {
        const shape = new THREE.Shape;
        shape.moveTo(-width * .56, 0);
        shape.lineTo(0, pedimentH);
        shape.lineTo(width * .56, 0);
        shape.closePath();
        const geo = new THREE.ExtrudeGeometry(shape, {
            depth: .18,
            bevelEnabled: true,
            bevelThickness: .025,
            bevelSize: .025,
            bevelSegments: 1
        });
        geo.translate(0, 0, 0);
        const ped = new THREE.Mesh(geo, M.limestoneTrim);
        ped.position.set(0, bodyH + .2, -.05);
        ped.castShadow = true;
        g.add(ped);
        const rake = new THREE.Mesh(new THREE.BoxGeometry(width * .76, .07, .055), M.carvedStone);
        rake.rotation.z = Math.atan2(pedimentH, width * .56);
        rake.position.set(-width * .28, bodyH + .2 + pedimentH * .5, .2);
        g.add(rake);
        const rake2 = rake.clone();
        rake2.rotation.z = -rake.rotation.z;
        rake2.position.x = width * .28;
        g.add(rake2);
        const slope = Math.atan2(pedimentH, width * .56);
        const roofW = width * .56 / Math.cos(slope) + .24;
        const roofL = new THREE.Mesh(new THREE.BoxGeometry(roofW, .08, depth + .28), M.slate);
        roofL.position.set(-width * .28, bodyH + .2 + pedimentH * .5, -depth / 2 + .09);
        roofL.rotation.z = slope;
        roofL.castShadow = true;
        g.add(roofL);
        const roofR = roofL.clone();
        roofR.rotation.z = -slope;
        roofR.position.x = width * .28;
        g.add(roofR);
        const f = new THREE.Mesh(new THREE.ConeGeometry(.07, .35, 6), M.zinc);
        f.position.set(0, bodyH + .2 + pedimentH + .17, .02);
        g.add(f);
        const ball = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 6), M.zinc);
        ball.position.set(0, bodyH + .2 + pedimentH + .01, .02);
        g.add(ball);
    }
    return g;
}

function grandDormer(parent, M, {x: x, y: y, z: z, width: width = 4.4, bodyH: bodyH = 3.1}) {
    const g = new THREE.Group;
    g.position.set(x, y, z);
    parent.add(g);
    const depth = 4.2;
    stoneBox(g, width, bodyH, depth, M.limestoneTrim, 0, bodyH / 2, -depth / 2 + .02, {
        tileU: 2.6,
        tileV: 2.4
    });
    for (const sx of [ -1, 1 ]) {
        box(g, .28, bodyH + .08, .38, M.carvedStone, sx * (width / 2 - .12), bodyH / 2, .24);
        box(g, .43, .16, .48, M.carvedStone, sx * (width / 2 - .12), bodyH - .12, .26);
        box(g, .4, .2, .42, M.carvedStone, sx * (width / 2 - .12), .08, .24);
    }
    box(g, width + .5, .2, depth + .25, M.carvedStone, 0, bodyH + .08, -depth / 2 + .09);
    box(g, width + .3, .1, depth + .25, M.limestoneTrim, 0, bodyH + .23, -depth / 2 + .09);
    windowUnit(g, M, {
        x: 0,
        y: .4,
        z: .075,
        w: 1.55,
        h: 2.35,
        lit: true,
        surround: true,
        muntins3d: true
    });
    const crownShape = new THREE.Shape;
    crownShape.moveTo(-2.15, 0);
    crownShape.bezierCurveTo(-2.42, .3, -2.28, .6, -1.98, .72);
    crownShape.bezierCurveTo(-1.54, .9, -1.28, 1.02, -1.1, 1.38);
    crownShape.quadraticCurveTo(-.88, 1.72, -.42, 1.72);
    crownShape.quadraticCurveTo(0, 1.72, 0, 1.9);
    crownShape.quadraticCurveTo(0, 1.72, .42, 1.72);
    crownShape.quadraticCurveTo(.88, 1.72, 1.1, 1.38);
    crownShape.bezierCurveTo(1.28, 1.02, 1.54, .9, 1.98, .72);
    crownShape.bezierCurveTo(2.28, .6, 2.42, .3, 2.15, 0);
    crownShape.closePath();
    const crownGeo = new THREE.ExtrudeGeometry(crownShape, {
        depth: .28,
        bevelEnabled: true,
        bevelThickness: .035,
        bevelSize: .035,
        bevelSegments: 2
    });
    const crown = new THREE.Mesh(crownGeo, M.limestoneTrim);
    crown.position.set(0, bodyH + .18, .08);
    crown.castShadow = true;
    crown.receiveShadow = true;
    g.add(crown);
    for (let i = 0; i < 3; i++) {
        const arc = new THREE.Mesh(new THREE.TorusGeometry(.88 - i * .18, .028, 5, 28, Math.PI), M.carvedStone);
        arc.position.set(0, bodyH + 1.08, .37 + i * .002);
        arc.rotation.z = 0;
        g.add(arc);
    }
    for (const sx of [ -1, 1 ]) {
        const v = new THREE.Mesh(new THREE.TorusGeometry(.21, .065, 5, 16, Math.PI * 1.55), M.carvedStone);
        v.position.set(sx * 2.12, bodyH + .42, .36);
        v.rotation.z = sx > 0 ? -.45 : .45;
        v.castShadow = true;
        g.add(v);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(.12, 8, 6), M.carvedStone);
        knob.position.set(sx * 2.18, bodyH + .55, .36);
        g.add(knob);
    }
    const acro = new THREE.Mesh(new THREE.ConeGeometry(.11, .48, 8), M.zinc);
    acro.position.set(0, bodyH + 1.9, .1);
    g.add(acro);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(.08, 8, 6), M.zinc);
    orb.position.set(0, bodyH + 1.63, .1);
    g.add(orb);
    const slope = Math.atan2(1.45, width * .64);
    const slabW = width * .64 / Math.cos(slope) + .2;
    const roofDepth = depth + .6;
    for (const sx of [ -1, 1 ]) {
        const slab = new THREE.Mesh(new THREE.BoxGeometry(slabW, .09, roofDepth), M.slate);
        slab.position.set(sx * width * .32, bodyH + .85, -roofDepth / 2 + .35);
        slab.rotation.z = -sx * slope;
        slab.castShadow = true;
        g.add(slab);
    }
    return g;
}

export function createChateau(M) {
    const root = new THREE.Group;
    root.name = "Château de la Vallée";
    const litWindows = [];
    const entranceLights = [];
    const baseY = 0;
    const centralTop = 11.15;
    const wingTop = 11.95;
    stoneBox(root, 23, centralTop - .1, 13, M.limestone, 0, .1 + (centralTop - .1) / 2, -6.5, {
        tileU: 4,
        tileV: 2.7
    });
    stoneBox(root, 23.5, .72, 13.5, M.plinth, 0, .36 - .14, -6.45, {
        tileU: 2.3,
        tileV: 1.25
    });
    stoneBox(root, 8.7, centralTop - .1, 1.1, M.limestone, 0, .1 + (centralTop - .1) / 2, .5, {
        tileU: 3.8,
        tileV: 2.5
    });
    stoneBox(root, 9.1, .72, 1.45, M.plinth, 0, .22, .52, {
        tileU: 2.4,
        tileV: 1.25
    });
    for (const side of [ -1, 1 ]) {
        const wx = side * 18;
        stoneBox(root, 13, wingTop - .1, 15.6, M.limestone, wx, .1 + (wingTop - .1) / 2, -5, {
            tileU: 4,
            tileV: 2.7
        });
        stoneBox(root, 13.6, .78, 16.2, M.plinth, wx, .25, -4.9, {
            tileU: 2.4,
            tileV: 1.3
        });
    }
    const carveBand = (x, y, z, w, h = .16, d = .24, mat = M.carvedStone) => box(root, w, h, d, mat, x, y, z, {
        cast: true
    });
    carveBand(0, 6.42, .1, 22.6, .2, .26);
    carveBand(0, 11.12, .04, 23.6, .19, .3);
    carveBand(0, 1.17, .03, 23.2, .14, .22);
    carveBand(0, 6.42, 1.1, 8.9, .2, .28);
    carveBand(0, 11.17, 1.08, 9.2, .22, .34);
    box(root, 9.45, .28, .45, M.carvedStone, 0, 11.42, .98);
    box(root, 9.15, .09, .3, M.limestoneTrim, 0, 11.1, 1.2);
    for (const side of [ -1, 1 ]) {
        const wx = side * 18;
        carveBand(wx, 6.82, 2.9, 12.6, .2, .26);
        carveBand(wx, 11.92, 2.87, 13.5, .24, .34);
        carveBand(wx, 1.22, 2.89, 13.1, .14, .22);
        box(root, 13.7, .28, .4, M.carvedStone, wx, 12.18, 2.77);
        box(root, 13.4, .1, .28, M.limestoneTrim, wx, 11.85, 2.96);
    }
    const dentils = [];
    for (let i = 0; i < 48; i++) {
        const x = -11.2 + i * .474;
        dentils.push({
            x: x,
            y: 10.94,
            z: .23,
            w: .19,
            h: .16,
            d: .18
        });
        dentils.push({
            x: x,
            y: 10.99,
            z: 1.29,
            w: .18,
            h: .15,
            d: .16
        });
    }
    for (const side of [ -1, 1 ]) {
        const wx = side * 18;
        for (let i = 0; i < 26; i++) {
            dentils.push({
                x: wx - 6 + i * .47,
                y: 11.69,
                z: 3.1,
                w: .2,
                h: .16,
                d: .18
            });
        }
    }
    addInstancedBoxes(root, dentils, M.carvedStone);
    for (const sx of [ -1, 1 ]) {
        box(root, .42, 9.7, .27, M.limestoneTrim, sx * 4.03, 5.55, 1.13);
        box(root, .6, .26, .42, M.carvedStone, sx * 4.03, 10.5, 1.15);
        box(root, .6, .22, .42, M.carvedStone, sx * 4.03, 1.33, 1.15);
        box(root, .3, 1.5, .18, M.carvedStone, sx * 4.03, 9.8, 1.25);
    }
    const quoins = [];
    const addQuoins = (x, z, yBase, height, faceSign = 1) => {
        let y = yBase + .18;
        let i = 0;
        while (y < yBase + height) {
            const hh = i % 2 ? .38 : .55;
            const ww = i % 2 ? 1.1 : .8;
            quoins.push({
                x: x + faceSign * -.03,
                y: y + hh / 2,
                z: z + .055,
                w: ww,
                h: hh,
                d: .3
            });
            quoins.push({
                x: x + faceSign * .12,
                y: y + hh / 2,
                z: z - .18,
                w: .22,
                h: hh,
                d: .74
            });
            y += hh + .055;
            i++;
        }
    };
    for (const sx of [ -1, 1 ]) {
        addQuoins(sx * 11.43, 0, 1, 10, sx);
        addQuoins(sx * 4.38, 1.07, 1.08, 9.8, sx);
        addQuoins(sx * 24.47, 2.8, 1, 10.6, sx);
    }
    addInstancedBoxes(root, quoins, M.limestoneTrim);
    const centralWindows = [];
    for (const sx of [ -1, 1 ]) {
        centralWindows.push(windowUnit(root, M, {
            x: sx * 8.9,
            y: 2.18,
            z: .055,
            w: 1.46,
            h: 3.82,
            lit: false
        }));
        centralWindows.push(windowUnit(root, M, {
            x: sx * 8.9,
            y: 6.85,
            z: .055,
            w: 1.4,
            h: 3.78,
            lit: false
        }));
    }
    for (const sx of [ -1, 1 ]) {
        centralWindows.push(windowUnit(root, M, {
            x: sx * 2.62,
            y: 2.18,
            z: 1.11,
            w: 1.4,
            h: 3.82,
            lit: false
        }));
    }
    centralWindows.push(windowUnit(root, M, {
        x: -2.62,
        y: 6.85,
        z: 1.11,
        w: 1.32,
        h: 3.74,
        lit: false
    }));
    centralWindows.push(windowUnit(root, M, {
        x: 2.62,
        y: 6.85,
        z: 1.11,
        w: 1.32,
        h: 3.74,
        lit: true
    }));
    centralWindows.push(windowUnit(root, M, {
        x: 0,
        y: 6.82,
        z: 1.12,
        w: 1.62,
        h: 3.66,
        lit: true,
        balconyDoor: true
    }));
    for (const side of [ -1, 1 ]) {
        const wx = side * 18;
        centralWindows.push(windowUnit(root, M, {
            x: wx,
            y: 2.13,
            z: 2.865,
            w: 1.82,
            h: 4.12,
            lit: side > 0
        }));
        centralWindows.push(windowUnit(root, M, {
            x: wx,
            y: 6.82,
            z: 2.865,
            w: 1.76,
            h: 4.16,
            lit: false
        }));
        for (const by of [ 2.3, 6.95 ]) {
            windowUnit(root, M, {
                x: side * 11.47,
                y: by,
                z: 1.45,
                w: .82,
                h: 3.35,
                rotY: side > 0 ? -Math.PI / 2 : Math.PI / 2,
                lit: false
            });
        }
        for (const zz of [ -9.2, -4.2, .6 ]) {
            for (const by of [ 2.28, 6.95 ]) {
                windowUnit(root, M, {
                    x: side * 24.53,
                    y: by,
                    z: zz,
                    w: 1.1,
                    h: 3.32,
                    rotY: side > 0 ? Math.PI / 2 : -Math.PI / 2,
                    lit: false,
                    muntins3d: false
                });
            }
        }
    }
    const doorGroup = new THREE.Group;
    doorGroup.position.set(0, .58, 1.18);
    root.add(doorGroup);
    box(doorGroup, 2.24, 3.45, .26, M.darkOpening, 0, 1.72, -.1, {
        cast: false
    });
    box(doorGroup, 1.92, 2.48, .12, M.door, 0, 1.24, .06);
    for (const sx of [ -1, 1 ]) {
        for (let r = 0; r < 2; r++) {
            box(doorGroup, .62, .78, .035, M.door, sx * .43, .75 + r * 1.1, .132, {
                cast: false
            });
        }
    }
    box(doorGroup, .06, 1.05, .06, M.door, 0, 1.18, .135, {
        cast: false
    });
    box(doorGroup, 1.82, .62, .1, M.glass, 0, 2.77, .06, {
        cast: false
    });
    for (let i = 0; i < 9; i++) {
        box(doorGroup, .022, .58, .035, M.iron, -.78 + i * .195, 2.77, .13, {
            cast: false
        });
    }
    box(doorGroup, 1.95, .08, .08, M.iron, 0, 2.42, .13, {
        cast: false
    });
    box(doorGroup, 2.5, .28, .35, M.limestoneTrim, 0, 3.55, .06);
    box(doorGroup, 2.95, .18, .52, M.carvedStone, 0, 3.8, .15);
    for (const sx of [ -1, 1 ]) {
        box(doorGroup, .28, 3.34, .3, M.limestoneTrim, sx * 1.2, 1.64, .08);
        box(doorGroup, .46, .22, .4, M.carvedStone, sx * 1.2, 3.25, .11);
        box(doorGroup, .4, .22, .37, M.carvedStone, sx * 1.2, .1, .11);
    }
    for (const sx of [ -1, 1 ]) {
        const h = new THREE.Mesh(new THREE.SphereGeometry(.045, 8, 6), M.copper);
        h.position.set(sx * .16, 1.2, .19);
        doorGroup.add(h);
    }
    const stepTop = .56;
    for (let i = 0; i < 3; i++) {
        const w = 3.15 + i * .55;
        const y = stepTop - (i + 1) * .145;
        box(root, w, .15, .55, M.limestoneTrim, 0, y, 1.9 + i * .48, {
            cast: true,
            receive: true
        });
    }
    box(root, 4.25, .7, 2.35, M.limestoneTrim, 0, .17, 2.3, {
        receive: true
    });
    balcony(root, M, {
        x: 0,
        y: 6.68,
        z: 1.22,
        width: 5.8,
        depth: 1.4
    });
    for (const sx of [ -1, 1 ]) {
        const lg = new THREE.Group;
        lg.position.set(sx * 1.95, 3.25, 1.34);
        root.add(lg);
        box(lg, .07, .4, .07, M.iron, 0, .2, -.12, {
            cast: false
        });
        box(lg, .4, .04, .04, M.iron, 0, .38, -.03, {
            cast: false
        });
        box(lg, .24, .5, .04, M.iron, sx * -.13, .1, .01, {
            cast: false
        });
        box(lg, .04, .5, .04, M.iron, sx * -.25, .1, .01, {
            cast: false
        });
        const glass = new THREE.Mesh(new THREE.BoxGeometry(.2, .34, .18), new THREE.MeshStandardMaterial({
            color: 15975546,
            emissive: 16757850,
            emissiveIntensity: .35,
            roughness: .3,
            metalness: 0
        }));
        glass.position.set(sx * -.25, .08, .02);
        lg.add(glass);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(.2, .16, 4), M.iron);
        cap.position.set(sx * -.25, .33, .02);
        lg.add(cap);
        const light = new THREE.PointLight(16756064, .15, 7, 2.2);
        light.position.set(sx * 1.95, 3.35, 2);
        root.add(light);
        entranceLights.push(light);
    }
    const centralRoof = hipRoof(root, M, {
        x: 0,
        z: -6.4,
        width: 23,
        depth: 13.1,
        eaveY: centralTop + .18,
        ridgeY: 17.35,
        ridgeLen: 8.2,
        axis: "x",
        overhang: .62
    });
    hipRoof(root, M, {
        x: 0,
        z: -1.2,
        width: 8.7,
        depth: 4.8,
        eaveY: 11.28,
        ridgeY: 18.05,
        ridgeLen: 2.2,
        axis: "z",
        overhang: .55
    });
    box(root, 8.9, .22, .5, M.zinc, 0, 11.42, 1);
    for (const side of [ -1, 1 ]) {
        const wx = side * 18;
        hipRoof(root, M, {
            x: wx,
            z: -5,
            width: 13,
            depth: 15.6,
            eaveY: wingTop + .17,
            ridgeY: 19.2,
            ridgeLen: 5.2,
            axis: "z",
            overhang: .68
        });
        const fin = new THREE.Group;
        fin.position.set(wx, 19.2, -5);
        box(fin, .16, .18, .16, M.zinc, 0, .05, 0);
        const spike = new THREE.Mesh(new THREE.ConeGeometry(.095, .72, 8), M.zinc);
        spike.position.y = .5;
        fin.add(spike);
        const ball = new THREE.Mesh(new THREE.SphereGeometry(.1, 8, 6), M.zinc);
        ball.position.y = .13;
        fin.add(ball);
        root.add(fin);
    }
    const cf = new THREE.Group;
    cf.position.set(0, 17.35, -6.4);
    box(cf, .13, .14, .13, M.zinc, 0, 0, 0);
    const csp = new THREE.Mesh(new THREE.ConeGeometry(.075, .5, 8), M.zinc);
    csp.position.y = .38;
    cf.add(csp);
    root.add(cf);
    stoneBox(root, 13.5, 7.6, 10, M.limestoneWarm, 31, 3.8, -8.2, {
        tileU: 4,
        tileV: 2.7
    });
    stoneBox(root, 14, .7, 10.5, M.plinth, 31, .2, -8.2, {
        tileU: 2.3,
        tileV: 1.25
    });
    hipRoof(root, M, {
        x: 31,
        z: -8.2,
        width: 13.5,
        depth: 10,
        eaveY: 7.6,
        ridgeY: 12.1,
        ridgeLen: 5.1,
        axis: "z",
        overhang: .55
    });
    const oc = new THREE.Mesh(new THREE.CircleGeometry(.68, 32), M.oculus);
    oc.position.set(28.2, 5.45, -3.16);
    root.add(oc);
    const ocRing = new THREE.Mesh(new THREE.TorusGeometry(.7, .09, 6, 32), M.limestoneTrim);
    ocRing.position.set(28.2, 5.45, -3.08);
    root.add(ocRing);
    for (const xx of [ 31.6, 34.6 ]) {
        windowUnit(root, M, {
            x: xx,
            y: 1.5,
            z: -3.14,
            w: .92,
            h: 2.25,
            lit: false,
            muntins3d: false
        });
    }
    box(root, 13.5, .24, .35, M.carvedStone, 31, 7.45, -3.15);
    chimney(root, M, {
        x: -22.1,
        z: -7.1,
        baseY: 17.25,
        topY: 22.2,
        scale: 1,
        pots: 2
    });
    chimney(root, M, {
        x: -13.9,
        z: -7.5,
        baseY: 17.1,
        topY: 21.9,
        scale: .92,
        pots: 2
    });
    chimney(root, M, {
        x: 13.9,
        z: -7.6,
        baseY: 17,
        topY: 22.35,
        scale: 1.03,
        pots: 2
    });
    chimney(root, M, {
        x: 22.1,
        z: -7.2,
        baseY: 17.3,
        topY: 21.95,
        scale: .94,
        pots: 2
    });
    chimney(root, M, {
        x: -6.9,
        z: -8,
        baseY: 15.95,
        topY: 21.1,
        scale: .88,
        pots: 1
    });
    chimney(root, M, {
        x: 7.1,
        z: -8.2,
        baseY: 15.8,
        topY: 21,
        scale: .92,
        pots: 2
    });
    chimney(root, M, {
        x: 35.7,
        z: -10.5,
        baseY: 10.9,
        topY: 15.5,
        scale: .75,
        pots: 1
    });
    dormer(root, M, {
        x: -8.55,
        y: 12,
        z: .68,
        width: 2.25,
        bodyH: 2.05,
        pedimentH: .68,
        arched: true,
        lit: false
    });
    dormer(root, M, {
        x: 8.55,
        y: 12,
        z: .68,
        width: 2.25,
        bodyH: 2.05,
        pedimentH: .68,
        arched: true,
        lit: false
    });
    for (const side of [ -1, 1 ]) {
        dormer(root, M, {
            x: side * 18,
            y: 12.7,
            z: 2.98,
            width: 2.75,
            bodyH: 2.5,
            pedimentH: .8,
            arched: true,
            tall: true,
            lit: false
        });
    }
    grandDormer(root, M, {
        x: 0,
        y: 11.9,
        z: 1.82,
        width: 4.95,
        bodyH: 3.25
    });
    patinaOverlay(root, 22.6, 10.8, 0, 5.5, .009, 2.2, .74);
    for (const side of [ -1, 1 ]) {
        patinaOverlay(root, 13.1, 11.4, side * 18, 5.7, 2.806, 1.4, .74);
        patinaOverlay(root, 8, 10.9, side * 4.36, 5.6, 1.079, .9, .64);
    }
    eaveShadow(root, 22.3, 1.15, 0, 10.5, .012, .62);
    eaveShadow(root, 8.6, 1.1, 0, 10.6, 1.06, .62);
    for (const side of [ -1, 1 ]) {
        eaveShadow(root, 12.8, 1.15, side * 18, 11.25, 2.818, .6);
        eaveShadow(root, 12.6, .34, side * 18, 6.65, 2.818, .5);
    }
    eaveShadow(root, 22.3, .34, 0, 6.25, .012, .46);
    eaveShadow(root, 8.6, .32, 0, 6.25, 1.06, .44);
    for (const side of [ -1, 1 ]) {
        const wx = side * 18;
        box(root, 13.2, .22, .07, M.plinth, wx, .64, 2.89, {
            cast: false
        });
        box(root, 1, .14, .07, M.plinth, side * 24.53, .75, 1, {
            cast: false,
            rotY: side > 0 ? Math.PI / 2 : -Math.PI / 2
        });
    }
    addIvy(root, M, {
        x: 32.6,
        y: 1.7,
        z: -3.18,
        w: 6.2,
        h: 5.9,
        count: 620,
        seed: 5
    });
    addIvy(root, M, {
        x: 23.9,
        y: 2.4,
        z: 2.9,
        w: 1.4,
        h: 7.4,
        count: 260,
        seed: 8,
        facing: "front"
    });
    root.traverse(o => {
        if (o.isMesh) {
            o.receiveShadow = true;
            if (o.material === M.leafLitter) o.receiveShadow = false;
        }
    });
    return {
        group: root,
        centralWindows: centralWindows,
        entranceLights: entranceLights,
        roofTop: CHATEAU.roofPeak,
        materials: M
    };
}

function addIvy(parent, M, {x: x, y: y, z: z, w: w, h: h, count: count = 400, seed: seed = 1, facing: facing = "front"}) {
    const rnd = mulberry32(seed * 997 + 3);
    const geo = new THREE.PlaneGeometry(1, 1);
    const mesh = new THREE.InstancedMesh(geo, M.ivy, count);
    const m = new THREE.Matrix4, q = new THREE.Quaternion, e = new THREE.Euler;
    const p = new THREE.Vector3, s = new THREE.Vector3;
    for (let i = 0; i < count; i++) {
        const u = rnd();
        const vy = Math.pow(rnd(), .72);
        const column = Math.sin(u * Math.PI * 5 + seed) * .16 + (rnd() - .5) * .18;
        p.set(x + (u - .5) * w + column * w * .3, y + vy * h, z + (rnd() - .5) * .12 + vy * .01);
        e.set(0, (rnd() - .5) * .55, rnd() * Math.PI * 2);
        q.setFromEuler(e);
        const sc = .34 + rnd() * .42;
        s.set(sc, sc, sc);
        m.compose(p, q, s);
        mesh.setMatrixAt(i, m);
        const col = (new THREE.Color).setHSL(.245 + rnd() * .05, .28 + rnd() * .16, .13 + rnd() * .13);
        mesh.setColorAt(i, col);
    }
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.customDepthMaterial = M.ivyDepth;
    mesh.frustumCulled = false;
    parent.add(mesh);
    for (let i = 0; i < 6; i++) {
        const sx = x + (rnd() - .5) * w * .9;
        const pts = [];
        let px = sx, py = y - .1;
        for (let k = 0; k < 6; k++) {
            pts.push(new THREE.Vector3(px, py, z + .015 + rnd() * .03));
            py += h / 6 * (.75 + rnd() * .4);
            px += (rnd() - .5) * .45;
        }
        const curve = new THREE.CatmullRomCurve3(pts);
        const stem = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, .018, 4, false), M.bark);
        stem.castShadow = false;
        parent.add(stem);
    }
    return mesh;
}
