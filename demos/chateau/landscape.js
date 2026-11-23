import * as THREE from "./vendor/three.module.js";

import { mergeGeometries, mergeVertices } from "./vendor/addons/utils/BufferGeometryUtils.js";

import { mulberry32 } from "./textures.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const lerp = (a, b, t) => a + (b - a) * t;

const smoothstep = (a, b, x) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
};

const smooth = t => t * t * (3 - 2 * t);

let _noiseSeed = 71;

function hash(x, y, z = 0) {
    const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
    return n - Math.floor(n);
}

function valueNoise(x, y, z = 0) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = smooth(x - xi), yf = smooth(y - yi), zf = smooth(z - zi);
    const c = (a, b, d) => hash(xi + a, yi + b, zi + d);
    return lerp(lerp(lerp(c(0, 0, 0), c(1, 0, 0), xf), lerp(c(0, 1, 0), c(1, 1, 0), xf), yf), lerp(lerp(c(0, 0, 1), c(1, 0, 1), xf), lerp(c(0, 1, 1), c(1, 1, 1), xf), yf), zf);
}

function fbm(x, y, oct = 4, z = 0) {
    let v = 0, a = .5, f = 1;
    for (let i = 0; i < oct; i++) {
        v += a * valueNoise(x * f, y * f, z + i * 2.13);
        f *= 2.03;
        a *= .5;
    }
    return v;
}

export function terrainHeight(x, z) {
    const d = Math.max(0, -z - 18);
    const far = smoothstep(0, 110, d);
    const farther = smoothstep(95, 235, d);
    let h = 7.2 * far + 11 * farther;
    const hill = (cx, cz, sx, sz, amp) => {
        const u = (x - cx) / sx, v = (z - cz) / sz;
        return amp * Math.exp(-(u * u + v * v));
    };
    h += hill(-118, -112, 92, 58, 9.5);
    h += hill(83, -145, 118, 84, 12.5);
    h += hill(-36, -190, 160, 90, 8);
    h += hill(182, -72, 115, 105, 7);
    h += hill(-218, -52, 130, 85, 6);
    h += hill(-72, -20, 52, 42, 2.2) * (1 - far * .2);
    h += hill(77, -8, 58, 38, 2.7) * (1 - far * .2);
    const roughness = (.35 + .65 * far) * 2.4;
    h += (fbm(x * .025, z * .025, 4, 1.7) - .42) * roughness;
    h += (fbm(x * .085, z * .085, 3, 4.1) - .5) * .35 * far;
    const lawnMask = smoothstep(-32, -13, z) * (1 - smoothstep(42, 72, Math.abs(x)));
    h *= 1 - lawnMask;
    return h;
}

function buildTerrain() {
    const X0 = -275, X1 = 275, Z0 = -330, Z1 = 125;
    const NX = 156, NZ = 138;
    const positions = [], uvs = [], colors = [], indices = [];
    const col = new THREE.Color;
    for (let iz = 0; iz <= NZ; iz++) {
        const z = lerp(Z0, Z1, iz / NZ);
        for (let ix = 0; ix <= NX; ix++) {
            const x = lerp(X0, X1, ix / NX);
            const y = terrainHeight(x, z);
            positions.push(x, y, z);
            uvs.push(x / 3.7, z / 3.7);
            const distBack = smoothstep(-15, -170, z);
            const variation = fbm(x * .06, z * .06, 3, 3.3);
            const patch = fbm(x * .015 + 4.2, z * .015 + 7.7, 3, 9.1);
            const dry = fbm(x * .03 + 9.2, z * .03 + 3.4, 3, 2.5);
            col.setHSL(.198 + variation * .045 - distBack * .012 + (dry > .55 ? .012 : 0), .24 + distBack * .06 + dry * .04, (.54 + variation * .19 - distBack * .22) * (.9 + patch * .14));
            if (distBack > .35 && hash(ix, iz, 4) > .89) col.setHSL(.105, .3, .32);
            colors.push(col.r, col.g, col.b);
        }
    }
    for (let iz = 0; iz < NZ; iz++) {
        for (let ix = 0; ix < NX; ix++) {
            const a = iz * (NX + 1) + ix;
            const b = a + 1;
            const c = a + NX + 1;
            const d = c + 1;
            indices.push(a, c, b, b, c, d);
        }
    }
    const geo = new THREE.BufferGeometry;
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
}

function driveCenterX(z) {
    return 3.4 * Math.sin((z - 4) * .049) * Math.exp(-(z - 4) * .0041);
}

function driveHalfWidth(z) {
    const t = Math.max(0, z - 10);
    return 5 + .052 * t + 75e-5 * t * t;
}

function driveHeight(z) {
    return .035 + .035 * smoothstep(50, 4, z);
}

function buildDrive(M) {
    const N = 112, Mseg = 26;
    const pos = [], uv = [], col = [], idx = [];
    const c = new THREE.Color;
    for (let i = 0; i <= N; i++) {
        const z = lerp(3.2, 126, i / N);
        const cx = driveCenterX(z);
        const hw = driveHalfWidth(z);
        for (let j = 0; j <= Mseg; j++) {
            const u = j / Mseg;
            const edgeNoise = .85 + fbm(z * .16 + j * .13, u * 2.1, 2, 1) * .25;
            const side = (u - .5) * 2;
            const x = cx + side * hw * (u < .08 || u > .92 ? edgeNoise : 1);
            const bulge = 1 - side * side;
            const y = driveHeight(z) + bulge * .038 + (fbm(x * .6, z * .6, 2, 4) - .5) * .012;
            pos.push(x, y, z);
            uv.push(side * hw / 2.35, z / 2.35);
            const wet = fbm(x * .055, z * .055, 3, 8.1);
            const macro = fbm(x * .018 + 8.3, z * .018 + 2.2, 4, 5.5);
            const light = .64 + wet * .35 + macro * .16;
            c.setRGB(light, light * (.945 + wet * .07), light * .9);
            const track = Math.exp(-Math.pow((Math.abs(side) - .43) / .13, 2));
            c.multiplyScalar(1 - track * .14);
            const edge = Math.pow(Math.abs(side), 3);
            c.multiplyScalar(1 - edge * .16);
            col.push(c.r, c.g, c.b);
        }
    }
    for (let i = 0; i < N; i++) {
        for (let j = 0; j < Mseg; j++) {
            const a = i * (Mseg + 1) + j;
            const b = a + 1;
            const cc = a + Mseg + 1;
            const d = cc + 1;
            idx.push(a, cc, b, b, cc, d);
        }
    }
    const geo = new THREE.BufferGeometry;
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mat = M.gravel.clone();
    mat.vertexColors = true;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    return mesh;
}

function tuftTexture() {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const x = c.getContext("2d");
    const rnd = mulberry32(90);
    x.clearRect(0, 0, 256, 256);
    for (let i = 0; i < 55; i++) {
        const bx = 128 + (rnd() - .5) * 150;
        const h = 60 + rnd() * 155;
        const lean = (rnd() - .5) * 75;
        const grad = x.createLinearGradient(bx, 256, bx + lean, 256 - h);
        const dark = rnd() > .5;
        grad.addColorStop(0, dark ? "#3d4a28" : "#5a6636");
        grad.addColorStop(.7, dark ? "#52602e" : "#74783e");
        grad.addColorStop(1, dark ? "#7a813f" : "#9a9252");
        x.strokeStyle = grad;
        x.lineWidth = 1 + rnd() * 2.4;
        x.beginPath();
        x.moveTo(bx, 257);
        x.quadraticCurveTo(bx + lean * .2, 256 - h * .54, bx + lean, 256 - h);
        x.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
}

function leafShapeGeometry() {
    const s = new THREE.Shape;
    s.moveTo(0, .125);
    s.bezierCurveTo(.105, .08, .105, -.055, 0, -.125);
    s.bezierCurveTo(-.105, -.055, -.105, .08, 0, .125);
    const g = new THREE.ShapeGeometry(s, 3);
    g.rotateX(-Math.PI / 2);
    return g;
}

function cylinderBetween(a, b, rBottom, rTop, segments = 6) {
    const dir = (new THREE.Vector3).subVectors(b, a);
    const len = dir.length();
    const g = new THREE.CylinderGeometry(rTop, rBottom, len, segments, 1, true);
    g.translate(0, len / 2, 0);
    const q = (new THREE.Quaternion).setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    const m = (new THREE.Matrix4).makeRotationFromQuaternion(q);
    m.setPosition(a);
    g.applyMatrix4(m);
    return g;
}

function crossedCardGeometry() {
    const a = new THREE.PlaneGeometry(1, 1);
    const b = new THREE.PlaneGeometry(1, 1);
    b.rotateY(Math.PI / 2.4);
    return mergeGeometries([ a, b ]);
}

let _cardGeo = null;

function cardGeometry() {
    if (!_cardGeo) _cardGeo = crossedCardGeometry();
    return _cardGeo;
}

function createDeciduousTree(M, {x: x, z: z, height: height, spread: spread, seed: seed = 1, palette: palette = "oak", cards: cards = 650, shadow: shadow = true, baseY: baseY = null, trunkSegments: trunkSegments = 3, branchDepth: branchDepth = 3, leanX: leanX = 0, cardScale: cardScale = 1}) {
    const rnd = mulberry32(seed * 117 + 23);
    const g = new THREE.Group;
    const ground = baseY === null ? terrainHeight(x, z) : baseY;
    g.position.set(x, ground, z);
    const geomList = [];
    const base = new THREE.Vector3(0, 0, 0);
    const trunkR = height * .033;
    const p0 = base.clone();
    const p1 = new THREE.Vector3(leanX * .35, height * .16, 0);
    const p2 = new THREE.Vector3(leanX, height * .31, -height * .012);
    geomList.push(cylinderBetween(p0, p1, trunkR, trunkR * .83, 7));
    geomList.push(cylinderBetween(p1, p2, trunkR * .83, trunkR * .64, 7));
    const tips = [];
    const grow = (start, dir, len, rad, depth) => {
        const end = start.clone().addScaledVector(dir, len);
        geomList.push(cylinderBetween(start, end, rad, rad * .58, depth > 1 ? 6 : 4));
        if (depth <= 0) {
            tips.push(end);
            return;
        }
        const n = depth > 1 ? 3 : 2;
        for (let i = 0; i < n; i++) {
            const outward = new THREE.Vector3(Math.cos(rnd() * Math.PI * 2) * (.5 + rnd() * .8), .5 + rnd() * .8, Math.sin(rnd() * Math.PI * 2) * (.5 + rnd() * .8));
            const nd = dir.clone().multiplyScalar(.55).add(outward).normalize();
            nd.y = Math.max(.13, nd.y + (rnd() - .5) * .2);
            const startBranched = end.clone().addScaledVector(dir, -len * .07);
            grow(startBranched, nd, len * (.57 + rnd() * .13), rad * .58, depth - 1);
        }
    };
    const limbs = 4;
    for (let i = 0; i < limbs; i++) {
        const a = i / limbs * Math.PI * 2 + rnd() * .7;
        const d = new THREE.Vector3(Math.cos(a) * (.58 + rnd() * .36), .8 + rnd() * .5, Math.sin(a) * (.58 + rnd() * .36)).normalize();
        grow(p2.clone(), d, height * (.18 + rnd() * .035), trunkR * .63, branchDepth - 1);
    }
    if (geomList.length) {
        const merged = mergeGeometries(geomList, false);
        const branches = new THREE.Mesh(merged, M.bark);
        branches.castShadow = shadow;
        branches.receiveShadow = true;
        g.add(branches);
    }
    const foliageMat = palette === "gold" ? M.foliageGold : palette === "deep" ? M.foliageDeep : palette === "darkgold" ? M.foliageDarkGold : M.foliageOak;
    const depthMat = palette === "gold" ? M.foliageGoldDepth : palette === "deep" ? M.foliageDeepDepth : palette === "darkgold" ? M.foliageDarkGoldDepth : M.foliageOakDepth;
    const tipCards = 2;
    const leafMesh = new THREE.InstancedMesh(cardGeometry(), foliageMat, cards + tips.length * tipCards);
    const m = new THREE.Matrix4;
    const p = new THREE.Vector3;
    const q = new THREE.Quaternion;
    const e = new THREE.Euler;
    const s = new THREE.Vector3;
    const col = new THREE.Color;
    const crownY = height * (.62 + rnd() * .05);
    const lobes = [];
    const lobeCount = 4 + (rnd() * 2 | 0);
    for (let i = 0; i < lobeCount; i++) {
        const a = i / lobeCount * Math.PI * 2 + rnd() * .55;
        const rr = i === 0 ? 0 : spread * (.28 + rnd() * .35);
        lobes.push({
            x: Math.cos(a) * rr,
            y: crownY + (i === 0 ? height * .09 : (rnd() - .35) * height * .13),
            z: Math.sin(a) * rr * .82,
            rx: spread * (i === 0 ? .68 : .42 + rnd() * .2),
            ry: height * (i === 0 ? .19 : .12 + rnd() * .05),
            rz: spread * (i === 0 ? .62 : .4 + rnd() * .2)
        });
    }
    if (height > 18) {
        for (const sx of [ -1, 1 ]) {
            lobes.push({
                x: sx * spread * (.48 + rnd() * .22),
                y: crownY - height * (.13 + rnd() * .07),
                z: (rnd() - .5) * spread * .65,
                rx: spread * (.28 + rnd() * .14),
                ry: height * (.075 + rnd() * .04),
                rz: spread * (.28 + rnd() * .16)
            });
        }
    }
    let li = 0;
    for (let i = 0; i < cards; i++) {
        const lb = lobes[rnd() * lobes.length | 0];
        const theta = rnd() * Math.PI * 2;
        const phi = Math.acos(2 * rnd() - 1);
        const rr = Math.pow(rnd(), .28);
        const px = lb.x + Math.sin(phi) * Math.cos(theta) * lb.rx * rr;
        const py = lb.y + Math.cos(phi) * lb.ry * rr;
        const pz = lb.z + Math.sin(phi) * Math.sin(theta) * lb.rz * rr;
        p.set(px, py, pz);
        e.set((rnd() - .5) * 1.25, rnd() * Math.PI * 2, (rnd() - .5) * .7);
        q.setFromEuler(e);
        const sc = spread * (.055 + rnd() * .075) * (height / 24) * cardScale;
        s.set(sc * (.8 + rnd() * .4), sc * (.75 + rnd() * .45), sc);
        m.compose(p, q, s);
        leafMesh.setMatrixAt(li, m);
        const outer = rr;
        const heightTint = clamp((py - (crownY - height * .18)) / (height * .35), 0, 1);
        const brightness = .56 + outer * .33 + heightTint * .12 + rnd() * .13;
        col.setHSL(.1 + rnd() * .05, .2 + rnd() * .18, Math.min(1.12, brightness));
        leafMesh.setColorAt(li, col);
        li++;
    }
    for (const tip of tips) {
        for (let k = 0; k < tipCards; k++) {
            p.set(tip.x + (rnd() - .5) * spread * .16, tip.y + (rnd() - .4) * height * .05, tip.z + (rnd() - .5) * spread * .16);
            e.set((rnd() - .5) * 1.2, rnd() * Math.PI * 2, (rnd() - .5) * .7);
            q.setFromEuler(e);
            const sc = spread * (.045 + rnd() * .06) * (height / 24) * cardScale;
            s.set(sc * (.85 + rnd() * .4), sc * (.75 + rnd() * .45), sc);
            m.compose(p, q, s);
            leafMesh.setMatrixAt(li, m);
            const outer = clamp((tip.y - (crownY - height * .18)) / (height * .4), 0, 1);
            col.setHSL(.1 + rnd() * .05, .18 + rnd() * .18, .52 + outer * .25 + rnd() * .16);
            leafMesh.setColorAt(li, col);
            li++;
        }
    }
    leafMesh.instanceMatrix.needsUpdate = true;
    if (leafMesh.instanceColor) leafMesh.instanceColor.needsUpdate = true;
    leafMesh.castShadow = shadow;
    leafMesh.receiveShadow = false;
    leafMesh.customDepthMaterial = depthMat;
    leafMesh.frustumCulled = false;
    g.add(leafMesh);
    return g;
}

function createConifer(M, {x: x, z: z, height: height = 28, radius: radius = 4.2, seed: seed = 3, shadow: shadow = false}) {
    const rnd = mulberry32(seed * 59 + 11);
    const g = new THREE.Group;
    const ground = terrainHeight(x, z);
    g.position.set(x, ground, z);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.13, height * .025, height * .74, 7), M.bark);
    trunk.position.y = height * .37;
    trunk.castShadow = shadow;
    g.add(trunk);
    const rings = 32, radial = 12;
    const pos = [], col = [], idx = [];
    const c = new THREE.Color;
    for (let l = 0; l <= rings; l++) {
        const t = l / rings;
        const y = height * (.1 + t * .9);
        const ringR = radius * Math.pow(1 - t, 1.25) + .16;
        for (let r = 0; r < radial; r++) {
            const a = r / radial * Math.PI * 2;
            const spike = .74 + .36 * rnd() + .12 * Math.sin(a * 3 + l);
            const rr = ringR * spike;
            pos.push(Math.cos(a) * rr, y + (rnd() - .5) * .32, Math.sin(a) * rr);
            const light = .11 + rnd() * .085 + (1 - t) * .02;
            c.setHSL(.27 + rnd() * .03, .28 + rnd() * .18, light);
            col.push(c.r, c.g, c.b);
        }
    }
    const capIdx = pos.length / 3;
    pos.push(0, height * 1.02, 0);
    c.setHSL(.27, .35, .16);
    col.push(c.r, c.g, c.b);
    for (let l = 0; l < rings; l++) {
        for (let r = 0; r < radial; r++) {
            const a = l * radial + r;
            const b = l * radial + (r + 1) % radial;
            const cc = a + radial;
            const d = b + radial;
            idx.push(a, cc, b, b, cc, d);
        }
    }
    for (let r = 0; r < radial; r++) {
        idx.push(rings * radial + r, capIdx, rings * radial + (r + 1) % radial);
    }
    const geo = new THREE.BufferGeometry;
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const coreMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: .98,
        side: THREE.DoubleSide
    });
    const core = new THREE.Mesh(geo, coreMat);
    core.castShadow = shadow;
    core.receiveShadow = false;
    g.add(core);
    const levels = 22, perLevel = 5;
    const count = levels * perLevel;
    const mesh = new THREE.InstancedMesh(cardGeometry(), M.fir, count);
    const m = new THREE.Matrix4, q = new THREE.Quaternion, e = new THREE.Euler;
    const p = new THREE.Vector3, sc = new THREE.Vector3;
    const cc = new THREE.Color;
    let k = 0;
    for (let l = 0; l < levels; l++) {
        const t = l / (levels - 1);
        const y = height * (.2 + t * .74);
        const ringR = radius * Math.pow(1 - t, 1.2) + .2;
        for (let b = 0; b < perLevel; b++) {
            const a = b / perLevel * Math.PI * 2 + l * .83 + rnd() * .7;
            const rr = ringR * (.65 + rnd() * .5);
            p.set(Math.cos(a) * rr, y + (rnd() - .5) * .6, Math.sin(a) * rr);
            e.set((rnd() - .5) * .35, a + Math.PI / 2 + (rnd() - .5) * .6, (rnd() - .5) * .25);
            q.setFromEuler(e);
            const sw = ringR * 1.8 + 1.2;
            sc.set(sw, 1.3 + rnd() * .8, sw);
            m.compose(p, q, sc);
            mesh.setMatrixAt(k, m);
            cc.setHSL(.27 + rnd() * .03, .28 + rnd() * .15, .17 + rnd() * .12 + (1 - t) * .015);
            mesh.setColorAt(k, cc);
            k++;
        }
    }
    mesh.castShadow = shadow;
    mesh.receiveShadow = false;
    mesh.customDepthMaterial = M.firDepth;
    mesh.frustumCulled = false;
    g.add(mesh);
    return g;
}

function forestCrownGeometry() {
    let g = new THREE.IcosahedronGeometry(1, 1);
    g = mergeVertices(g);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
        const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i));
        const n = 1 + (valueNoise(v.x * 2.4 + 5, v.y * 2.4, v.z * 2.4) - .5) * .34;
        v.multiplyScalar(n);
        v.y *= .85;
        p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
}

function buildFirGrove(M, placements) {
    const rnd = mulberry32(7613);
    const geo = cardGeometry();
    const mesh = new THREE.InstancedMesh(geo, M.firCard, placements.length);
    const m = new THREE.Matrix4, q = new THREE.Quaternion, e = new THREE.Euler;
    const p = new THREE.Vector3, sc = new THREE.Vector3;
    const col = new THREE.Color;
    placements.forEach(([x, z, h, seed], i) => {
        const ground = terrainHeight(x, z);
        p.set(x, ground + h * .49, z);
        e.set(0, seed * 1.37 + rnd() * 1.2, 0);
        q.setFromEuler(e);
        sc.set(h * .58, h, h * .58);
        m.compose(p, q, sc);
        mesh.setMatrixAt(i, m);
        col.setHSL(.27 + rnd() * .035, .2 + rnd() * .12, .56 + rnd() * .18);
        mesh.setColorAt(i, col);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    const g = new THREE.Group;
    g.add(mesh);
    const far = 12;
    const farMesh = new THREE.InstancedMesh(geo, M.firCard, far);
    for (let i = 0; i < far; i++) {
        const x = (rnd() - .5) * 520;
        const z = -60 - rnd() * 220;
        const h = 8 + rnd() * 11;
        const y = terrainHeight(x, z);
        p.set(x, y + h * .49, z);
        e.set(0, rnd() * Math.PI * 2, 0);
        q.setFromEuler(e);
        sc.set(h * .52, h, h * .52);
        m.compose(p, q, sc);
        farMesh.setMatrixAt(i, m);
        col.setHSL(.27 + rnd() * .03, .16 + rnd() * .1, .5 + rnd() * .18);
        farMesh.setColorAt(i, col);
    }
    farMesh.instanceMatrix.needsUpdate = true;
    if (farMesh.instanceColor) farMesh.instanceColor.needsUpdate = true;
    farMesh.castShadow = false;
    farMesh.frustumCulled = false;
    g.add(farMesh);
    return g;
}

function buildForest(M) {
    const rnd = mulberry32(9221);
    const treeCount = 2250;
    const cardsPerTree = 4;
    const kinds = [ {
        mat: M.foliageDeep,
        weight: .46,
        hue: [ .235, .29 ],
        sat: [ .12, .26 ],
        tone: [ .42, .68 ]
    }, {
        mat: M.foliageOak,
        weight: .34,
        hue: [ .17, .23 ],
        sat: [ .15, .3 ],
        tone: [ .42, .7 ]
    }, {
        mat: M.foliageDarkGold,
        weight: .2,
        hue: [ .085, .13 ],
        sat: [ .18, .34 ],
        tone: [ .42, .66 ]
    } ];
    const trees = [];
    for (let i = 0; i < treeCount; i++) {
        let x, z, tries = 0;
        const nearBand = i < 1050;
        do {
            x = (rnd() - .5) * (nearBand ? 400 : 600);
            if (nearBand) {
                const farX = Math.abs(x) > 58;
                z = (farX ? -7 : -22) - Math.pow(rnd(), .9) * (farX ? 140 : 150);
            } else {
                z = -95 - Math.pow(rnd(), .7) * 250;
            }
            tries++;
            const nearHouse = z > -20 && Math.abs(x) < 48;
            const driveArea = z > -16 && Math.abs(x - driveCenterX(z)) < driveHalfWidth(z) + 13;
            if (!nearHouse && !driveArea && tries < 24) break;
        } while (tries < 24);
        const pick = rnd();
        let kind = 0;
        if (pick > kinds[0].weight) kind = pick > kinds[0].weight + kinds[1].weight ? 2 : 1;
        const emergent = rnd() > .86;
        trees.push({
            x: x,
            z: z,
            ground: terrainHeight(x, z),
            tall: emergent ? 19.5 + rnd() * 9 : 7.5 + rnd() * 13.5,
            kind: kind,
            trunkH: 0,
            phase: rnd() * Math.PI * 2
        });
    }
    const g = new THREE.Group;
    const m = new THREE.Matrix4, q = new THREE.Quaternion, e = new THREE.Euler;
    const p = new THREE.Vector3, sc = new THREE.Vector3;
    const col = new THREE.Color;
    for (let k = 0; k < kinds.length; k++) {
        const kd = kinds[k];
        const list = trees.filter(t => t.kind === k);
        const mesh = new THREE.InstancedMesh(cardGeometry(), kd.mat, list.length * cardsPerTree);
        let idx = 0;
        for (const t of list) {
            const trunkH = t.tall * (.3 + .16 * (.5 + .5 * Math.sin(t.phase * 7.3)));
            t.trunkH = trunkH;
            for (let c = 0; c < cardsPerTree; c++) {
                const a = t.phase + c * 2.399 + rnd() * .7;
                const rr = t.tall * (.04 + rnd() * .19);
                const cy = trunkH + t.tall * (.24 + rnd() * .3);
                p.set(t.x + Math.cos(a) * rr, t.ground + cy, t.z + Math.sin(a) * rr);
                e.set((rnd() - .5) * .12, rnd() * Math.PI * 2, (rnd() - .5) * .1);
                q.setFromEuler(e);
                const w = t.tall * (.34 + rnd() * .19);
                const h = t.tall * (.3 + rnd() * .17);
                sc.set(w, h, w);
                m.compose(p, q, sc);
                mesh.setMatrixAt(idx, m);
                const tone = kd.tone[0] + rnd() * (kd.tone[1] - kd.tone[0]);
                const hue = kd.hue[0] + rnd() * (kd.hue[1] - kd.hue[0]);
                const sat = kd.sat[0] + rnd() * (kd.sat[1] - kd.sat[0]);
                col.setHSL(hue, sat, tone * .62);
                col.multiplyScalar(.85 + rnd() * .3);
                mesh.setColorAt(idx, col);
                idx++;
            }
        }
        mesh.instanceMatrix.needsUpdate = true;
        mesh.instanceColor.needsUpdate = true;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.frustumCulled = false;
        mesh.customDepthMaterial = null;
        g.add(mesh);
    }
    g.children.forEach(mesh => {
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
    const shrub = new THREE.InstancedMesh(cardGeometry(), M.foliageDeep, 380);
    for (let i = 0; i < 380; i++) {
        const side = rnd() > .5 ? 1 : -1;
        const x = side * (28 + rnd() * 180);
        const z = -6 - Math.pow(rnd(), .8) * 96;
        const hh = terrainHeight(x, z);
        const sw = 1.8 + rnd() * 3.8;
        p.set(x, hh + sw * .34, z);
        e.set(0, rnd() * Math.PI * 2, 0);
        q.setFromEuler(e);
        sc.set(sw, sw * (.6 + rnd() * .45), sw);
        m.compose(p, q, sc);
        shrub.setMatrixAt(i, m);
        col.setHSL(.225 + rnd() * .05, .22 + rnd() * .12, .1 + rnd() * .09);
        shrub.setColorAt(i, col);
    }
    shrub.instanceMatrix.needsUpdate = true;
    if (shrub.instanceColor) shrub.instanceColor.needsUpdate = true;
    shrub.castShadow = false;
    shrub.receiveShadow = false;
    shrub.frustumCulled = false;
    g.add(shrub);
    return g;
}

function createWall(M, {points: points, heightBase: heightBase = 1, seed: seed = 4, pierAtEnd: pierAtEnd = true, pierAtStart: pierAtStart = false}) {
    const rnd = mulberry32(seed * 173 + 5);
    const g = new THREE.Group;
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], 0, p[1])));
    curve.curveType = "catmullrom";
    const nSeg = 30;
    const samples = curve.getSpacedPoints(nSeg);
    const wallGeos = [];
    const capItems = [];
    const pierPoints = [];
    if (pierAtStart) pierPoints.push({
        p: samples[0],
        t: 0
    });
    if (pierAtEnd) pierPoints.push({
        p: samples[samples.length - 1],
        t: 1
    });
    for (let i = 0; i < nSeg; i++) {
        const a = samples[i], b = samples[i + 1];
        const dx = b.x - a.x, dz = b.z - a.z;
        const len = Math.hypot(dx, dz);
        if (len < 1e-4) continue;
        const dir = new THREE.Vector3(dx, 0, dz).normalize();
        const mid = (new THREE.Vector3).addVectors(a, b).multiplyScalar(.5);
        const t = i / nSeg;
        const h = heightBase * (.78 + Math.sin(t * Math.PI * 2.1 + seed) * .08 + rnd() * .17) + smoothstep(0, .2, t) * .15;
        const rough = .52 + rnd() * .09;
        const angle = Math.atan2(-dir.z, dir.x);
        const geo = new THREE.BoxGeometry(len + .09, h, rough);
        const uv = geo.attributes.uv;
        const faceDims = [ [ rough, h ], [ rough, h ], [ len, rough ], [ len, rough ], [ len, h ], [ len, h ] ];
        for (let f = 0; f < 6; f++) {
            for (let k = 0; k < 4; k++) {
                const idx = f * 4 + k;
                uv.setXY(idx, uv.getX(idx) * faceDims[f][0] / 2.7, uv.getY(idx) * faceDims[f][1] / 1.7);
            }
        }
        const m = (new THREE.Matrix4).makeRotationY(angle);
        m.setPosition(mid.x, h / 2 - .05, mid.z);
        geo.applyMatrix4(m);
        wallGeos.push(geo);
        capItems.push({
            x: mid.x,
            y: h - .03,
            z: mid.z,
            w: len + .1,
            h: .16,
            d: rough + .12,
            rotY: angle
        });
        if (len > 1.5) {
            const a2 = (new THREE.Vector3).lerpVectors(a, b, .33);
            const b2 = (new THREE.Vector3).lerpVectors(a, b, .66);
            capItems.push({
                x: a2.x,
                y: h - .05 + rnd() * .04,
                z: a2.z,
                w: len * .35,
                h: .11 + rnd() * .05,
                d: rough + .02,
                rotY: angle + (rnd() - .5) * .05
            });
            capItems.push({
                x: b2.x,
                y: h - .04 + rnd() * .04,
                z: b2.z,
                w: len * .3,
                h: .12 + rnd() * .06,
                d: rough + .05,
                rotY: angle + (rnd() - .5) * .06
            });
        }
    }
    const merged = mergeGeometries(wallGeos);
    const wall = new THREE.Mesh(merged, M.fieldstone);
    wall.castShadow = true;
    wall.receiveShadow = true;
    g.add(wall);
    const capGeo = new THREE.BoxGeometry(1, 1, 1);
    const caps = new THREE.InstancedMesh(capGeo, M.fieldstoneCap, capItems.length);
    const cm = new THREE.Matrix4, cq = new THREE.Quaternion, cp = new THREE.Vector3, cs = new THREE.Vector3;
    capItems.forEach((it, i) => {
        cp.set(it.x, it.y, it.z);
        cq.setFromEuler(new THREE.Euler(0, it.rotY || 0, 0));
        cs.set(it.w, it.h, it.d);
        cm.compose(cp, cq, cs);
        caps.setMatrixAt(i, cm);
    });
    caps.castShadow = true;
    caps.receiveShadow = true;
    caps.frustumCulled = false;
    g.add(caps);
    const mossGeo = new THREE.SphereGeometry(1, 7, 4);
    const mossMat = new THREE.MeshStandardMaterial({
        color: 5660980,
        roughness: 1
    });
    const moss = new THREE.InstancedMesh(mossGeo, mossMat, 64);
    for (let i = 0; i < 64; i++) {
        const t = rnd();
        const pt = curve.getPointAt(t);
        const tangent = curve.getTangentAt(t);
        cp.set(pt.x + (rnd() - .5) * .22, heightBase * (.84 + rnd() * .16), pt.z + (rnd() - .5) * .14);
        cs.set(.13 + rnd() * .3, .035 + rnd() * .035, .1 + rnd() * .22);
        cq.setFromEuler(new THREE.Euler(0, rnd() * Math.PI, 0));
        cm.compose(cp, cq, cs);
        moss.setMatrixAt(i, cm);
    }
    moss.frustumCulled = false;
    g.add(moss);
    const ivyCount = 160;
    const ivy = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), M.ivy, ivyCount);
    for (let i = 0; i < ivyCount; i++) {
        const t = rnd();
        const pt = curve.getPointAt(t);
        const tangent = curve.getTangentAt(t);
        const side = rnd() > .5 ? 1 : -1;
        cp.set(pt.x + (rnd() - .5) * .45, .18 + rnd() * heightBase, pt.z + side * .25);
        cq.setFromEuler(new THREE.Euler(0, Math.atan2(tangent.x, tangent.z) + (rnd() - .5) * .8, rnd() * Math.PI));
        const sc = .22 + rnd() * .32;
        cs.set(sc, sc, sc);
        cm.compose(cp, cq, cs);
        ivy.setMatrixAt(i, cm);
        colIvy.setHSL(.25 + rnd() * .03, .3, .14 + rnd() * .12);
        ivy.setColorAt(i, colIvy);
    }
    ivy.castShadow = false;
    ivy.frustumCulled = false;
    g.add(ivy);
    for (const pp of pierPoints) {
        const h = heightBase + .58;
        const pier = new THREE.Mesh(new THREE.BoxGeometry(.85, h, .85), M.fieldstone);
        pier.position.set(pp.p.x, h / 2, pp.p.z);
        pier.castShadow = true;
        pier.receiveShadow = true;
        g.add(pier);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(1.05, .17, 1.05), M.fieldstoneCap);
        cap.position.set(pp.p.x, h + .05, pp.p.z);
        cap.castShadow = true;
        g.add(cap);
        const base = new THREE.Mesh(new THREE.CylinderGeometry(.28, .36, .28, 8), M.carvedStone);
        base.position.set(pp.p.x, h + .27, pp.p.z);
        g.add(base);
        const ball = new THREE.Mesh(new THREE.SphereGeometry(.34, 18, 12), M.fieldstoneCap);
        ball.position.set(pp.p.x, h + .63, pp.p.z);
        ball.castShadow = true;
        g.add(ball);
    }
    return g;
}

const colIvy = new THREE.Color;

let _topiaryGeo = null;

function topiaryGeometry() {
    if (_topiaryGeo) return _topiaryGeo;
    const g = new THREE.SphereGeometry(1, 36, 28);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
        const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i));
        const n = fbm(v.x * 2.4 + 3, v.z * 2.4 + v.y * 1.3, 3, 7.2);
        v.multiplyScalar(1 + (n - .5) * .13);
        p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    _topiaryGeo = g;
    return g;
}

function addTopiary(M, parent, x, z, height, seed = 1, squat = 1) {
    const rnd = mulberry32(seed * 41 + 3);
    const g = new THREE.Group;
    const base = terrainHeight(x, z);
    g.position.set(x, base, z);
    const h = height;
    const mesh = new THREE.Mesh(topiaryGeometry(), M.topiary);
    mesh.scale.set(h * .37 * squat, h * .55, h * .37);
    mesh.position.y = h * .49;
    mesh.rotation.y = rnd() * Math.PI * 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(h * .035, h * .045, h * .18, 6), M.bark);
    stem.position.y = h * .09;
    stem.castShadow = true;
    g.add(stem);
    const fuzzCount = 34;
    const fuzz = new THREE.InstancedMesh(cardGeometry(), M.foliageDeep, fuzzCount);
    const fm = new THREE.Matrix4, fq = new THREE.Quaternion, fe = new THREE.Euler;
    const fp = new THREE.Vector3, fs = new THREE.Vector3;
    const fc = new THREE.Color;
    const sx = h * .37 * squat, sy = h * .55, sz = h * .37;
    for (let i = 0; i < fuzzCount; i++) {
        const theta = rnd() * Math.PI * 2;
        const phi = Math.acos(2 * rnd() - 1);
        const dir = new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
        fp.set(dir.x * sx * .99, h * .49 + dir.y * sy * .99, dir.z * sz * .99);
        fe.set((rnd() - .5) * 1.4, rnd() * Math.PI * 2, (rnd() - .5) * .8);
        fq.setFromEuler(fe);
        const sc = h * (.06 + rnd() * .045);
        fs.set(sc, sc * (.8 + rnd() * .5), sc);
        fm.compose(fp, fq, fs);
        fuzz.setMatrixAt(i, fm);
        fc.setHSL(.24 + rnd() * .03, .24 + rnd() * .12, .18 + rnd() * .12);
        fuzz.setColorAt(i, fc);
    }
    fuzz.castShadow = false;
    fuzz.frustumCulled = false;
    if (fuzz.instanceColor) fuzz.instanceColor.needsUpdate = true;
    g.add(fuzz);
    parent.add(g);
    return g;
}

let _bloomGeo = null;

function bloomGeometry() {
    if (_bloomGeo) return _bloomGeo;
    const parts = [];
    const rnd = mulberry32(342);
    for (let i = 0; i < 5; i++) {
        const g = new THREE.IcosahedronGeometry(.65 + rnd() * .25, 1);
        const p = g.attributes.position;
        for (let k = 0; k < p.count; k++) {
            const s = 1 + (hash(k, i, 5) - .5) * .18;
            p.setXYZ(k, p.getX(k) * s, p.getY(k) * s, p.getZ(k) * s);
        }
        g.translate((rnd() - .5) * .7, (rnd() - .35) * .5, (rnd() - .5) * .7);
        g.computeVertexNormals();
        parts.push(g);
    }
    _bloomGeo = mergeGeometries(parts);
    return _bloomGeo;
}

function addHydrangea(M, parent, x, z, scale = 1, seed = 1) {
    const rnd = mulberry32(seed * 71 + 9);
    const g = new THREE.Group;
    g.position.set(x, terrainHeight(x, z), z);
    parent.add(g);
    const core = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), M.hydrangeaLeaf);
    core.scale.set(.58 * scale, .4 * scale, .54 * scale);
    core.position.y = .33 * scale;
    core.castShadow = true;
    core.receiveShadow = true;
    g.add(core);
    const leafCount = 30;
    const leafMesh = new THREE.InstancedMesh(cardGeometry(), M.hydrangeaLeafCard, leafCount);
    const lm = new THREE.Matrix4, lq = new THREE.Quaternion, le = new THREE.Euler;
    const lp = new THREE.Vector3, ls = new THREE.Vector3;
    const lc = new THREE.Color;
    for (let i = 0; i < leafCount; i++) {
        const a = rnd() * Math.PI * 2;
        const rr = Math.pow(rnd(), .6) * .62 * scale;
        const sc = (.34 + rnd() * .26) * scale;
        lp.set(Math.cos(a) * rr, (.1 + rnd() * .48) * scale, Math.sin(a) * rr * .9);
        le.set((rnd() - .5) * 1, rnd() * Math.PI * 2, (rnd() - .5) * .7);
        lq.setFromEuler(le);
        ls.set(sc, sc * (.8 + rnd() * .35), sc);
        lm.compose(lp, lq, ls);
        leafMesh.setMatrixAt(i, lm);
        lc.setHSL(.23 + rnd() * .035, .2 + rnd() * .14, .3 + rnd() * .16);
        leafMesh.setColorAt(i, lc);
    }
    leafMesh.castShadow = true;
    leafMesh.receiveShadow = true;
    leafMesh.customDepthMaterial = M.hydrangeaLeafDepth;
    leafMesh.frustumCulled = false;
    g.add(leafMesh);
    const bloomCount = 28;
    const bloomMesh = new THREE.InstancedMesh(cardGeometry(), M.hydrangea, bloomCount);
    const bm = new THREE.Matrix4, bq = new THREE.Quaternion, be = new THREE.Euler;
    const bp = new THREE.Vector3, bs = new THREE.Vector3;
    const col = new THREE.Color;
    for (let i = 0; i < bloomCount; i++) {
        const a = rnd() * Math.PI * 2;
        const rr = (.05 + Math.pow(rnd(), .7) * .6) * scale;
        const sc = (.2 + rnd() * .16) * scale;
        bp.set(Math.cos(a) * rr, (.45 + rnd() * .42) * scale, Math.sin(a) * rr * .85);
        be.set((rnd() - .5) * .7, rnd() * Math.PI * 2, (rnd() - .5) * .5);
        bq.setFromEuler(be);
        bs.set(sc, sc * (.85 + rnd() * .25), sc);
        bm.compose(bp, bq, bs);
        bloomMesh.setMatrixAt(i, bm);
        const kind = rnd();
        if (kind > .7) col.setHSL(.94 + rnd() * .04, .16 + rnd() * .1, .8 + rnd() * .08); else if (kind > .28) col.setHSL(.12 + rnd() * .03, .1 + rnd() * .08, .83 + rnd() * .07); else col.setHSL(.6 + rnd() * .03, .1 + rnd() * .08, .8 + rnd() * .07);
        bloomMesh.setColorAt(i, col);
    }
    bloomMesh.castShadow = true;
    bloomMesh.receiveShadow = true;
    bloomMesh.customDepthMaterial = M.hydrangeaDepth;
    bloomMesh.frustumCulled = false;
    g.add(bloomMesh);
    return g;
}

function addGroundDetails(M, parent, drive) {
    const rnd = mulberry32(667);
    const leafGeo = leafShapeGeometry();
    const leafMat = new THREE.MeshStandardMaterial({
        color: 16777215,
        roughness: .9,
        side: THREE.DoubleSide
    });
    const leafCount = 1650;
    const leaves = new THREE.InstancedMesh(leafGeo, leafMat, leafCount);
    const m = new THREE.Matrix4, q = new THREE.Quaternion, e = new THREE.Euler;
    const p = new THREE.Vector3, s = new THREE.Vector3;
    const col = new THREE.Color;
    const leafSpots = [ [ -12.6, 66.5, 8.5 ], [ 16.6, 62, 6.5 ], [ -30, 36.5, 11 ], [ 32.2, 38, 9 ], [ -21, 60, 8 ], [ 24, 55, 7 ], [ -14, 43, 4 ], [ 13.2, 36, 4 ], [ -8.6, 27, 3 ] ];
    for (let i = 0; i < leafCount; i++) {
        let x, y, z;
        if (i < 1e3) {
            z = 4 + rnd() * 122;
            const cx = driveCenterX(z);
            const hw = driveHalfWidth(z);
            x = cx + (rnd() > .5 ? 1 : -1) * (hw * (.82 + rnd() * .7));
            y = Math.max(terrainHeight(x, z) + .025, .055);
        } else {
            const spot = leafSpots[rnd() * leafSpots.length | 0];
            const a = rnd() * Math.PI * 2;
            const rr = Math.pow(rnd(), .55) * spot[2];
            x = spot[0] + Math.cos(a) * rr;
            z = spot[1] + Math.sin(a) * rr;
            y = Math.max(terrainHeight(x, z) + .025, .05);
        }
        p.set(x, y, z);
        e.set((rnd() - .5) * .25, rnd() * Math.PI * 2, (rnd() - .5) * .15);
        q.setFromEuler(e);
        const sc = .1 + rnd() * .26;
        s.set(sc, sc, sc);
        m.compose(p, q, s);
        leaves.setMatrixAt(i, m);
        col.setHSL(.06 + rnd() * .08, .34 + rnd() * .24, .14 + rnd() * .17);
        leaves.setColorAt(i, col);
    }
    leaves.frustumCulled = false;
    leaves.castShadow = false;
    leaves.receiveShadow = true;
    parent.add(leaves);
    const tuftMat = new THREE.MeshStandardMaterial({
        map: tuftTexture(),
        alphaTest: .35,
        side: THREE.DoubleSide,
        roughness: .95
    });
    const tuftCount = 780;
    const tufts = new THREE.InstancedMesh(cardGeometry(), tuftMat, tuftCount);
    const tuftSpots = [ [ -12.6, 66.5, 9 ], [ 16.6, 62, 7 ], [ -30, 36.5, 11 ], [ 32.2, 38, 9 ], [ -21, 60, 8 ], [ 24, 55, 7 ], [ -19, 49, 6 ], [ 19, 47, 6 ], [ -10.2, 34, 4 ], [ 11.2, 31, 4 ] ];
    for (let i = 0; i < tuftCount; i++) {
        let x, z, y;
        if (i < 260) {
            z = 8 + rnd() * 116;
            const cx = driveCenterX(z), hw = driveHalfWidth(z);
            x = cx + (rnd() > .5 ? 1 : -1) * (hw + .1 + rnd() * .9);
            y = .03;
        } else if (i < 560) {
            const side = rnd() > .5 ? 1 : -1;
            x = side * (5 + rnd() * 30);
            z = 3 + rnd() * 40;
            y = .02;
        } else {
            const spot = tuftSpots[rnd() * tuftSpots.length | 0];
            const a = rnd() * Math.PI * 2;
            const rr = Math.pow(rnd(), .6) * spot[2];
            x = spot[0] + Math.cos(a) * rr;
            z = spot[1] + Math.sin(a) * rr;
            y = terrainHeight(x, z) + .01;
        }
        p.set(x, y + .2 + rnd() * .18, z);
        e.set(0, rnd() * Math.PI * 2, 0);
        q.setFromEuler(e);
        const sc = .18 + rnd() * .3;
        s.set(sc, sc * (.7 + rnd() * .45), sc);
        m.compose(p, q, s);
        tufts.setMatrixAt(i, m);
        col.setHSL(.19 + rnd() * .07, .2 + rnd() * .16, .3 + rnd() * .16);
        tufts.setColorAt(i, col);
    }
    tufts.frustumCulled = false;
    tufts.castShadow = false;
    parent.add(tufts);
}

export function createLandscape(M) {
    const root = new THREE.Group;
    root.name = "Wooded valley";
    const terrainMat = M.grass.clone();
    terrainMat.vertexColors = true;
    terrainMat.color.set(16777215);
    const terrain = new THREE.Mesh(buildTerrain(), terrainMat);
    terrain.receiveShadow = true;
    terrain.castShadow = false;
    root.add(terrain);
    const skirt = new THREE.Mesh(new THREE.CircleGeometry(700, 40), new THREE.MeshStandardMaterial({
        color: 2962726,
        roughness: 1
    }));
    skirt.rotation.x = -Math.PI / 2;
    skirt.position.y = -1.6;
    skirt.receiveShadow = false;
    root.add(skirt);
    const drive = buildDrive(M);
    root.add(drive);
    const leftWall = createWall(M, {
        points: [ [ -18.5, 76 ], [ -15.2, 67 ], [ -12.8, 58 ], [ -11.2, 50 ], [ -10, 42 ], [ -9.2, 34 ], [ -8.6, 27 ], [ -8.2, 21 ], [ -8.1, 16.5 ] ],
        heightBase: 1.42,
        seed: 4,
        pierAtEnd: true,
        pierAtStart: false
    });
    root.add(leftWall);
    const rightWall = createWall(M, {
        points: [ [ 16.5, 70 ], [ 14.3, 59 ], [ 12.6, 49 ], [ 11.4, 41 ], [ 10.6, 34 ], [ 9.9, 28 ], [ 9.4, 22.5 ] ],
        heightBase: 1.24,
        seed: 9,
        pierAtEnd: true,
        pierAtStart: false
    });
    root.add(rightWall);
    const gardenWall = createWall(M, {
        points: [ [ -17.4, 64 ], [ -15.2, 57 ], [ -13.1, 50 ], [ -11.5, 44 ] ],
        heightBase: .92,
        seed: 16,
        pierAtEnd: true,
        pierAtStart: false
    });
    root.add(gardenWall);
    const topiaries = [ [ -6.4, 15.2, 4.5, .94 ], [ -8.3, 21.6, 3.25, 1.02 ], [ -10.4, 28.2, 4, .92 ], [ -12.8, 35.8, 2.9, 1.04 ], [ -14.3, 43.4, 3.35, .9 ], [ -12.9, 55, 2.55, .96 ], [ 6.8, 15, 4.15, .96 ], [ 8.9, 21.4, 3.6, .92 ], [ 11.1, 28.6, 3, 1 ], [ 13.2, 36.6, 3.45, .9 ], [ 14.8, 45, 2.4, .98 ], [ 13.1, 52.5, 2.1, .9 ], [ -4.4, 9.5, 2.45, .84 ], [ 4.6, 9.3, 2.3, .86 ], [ -15.7, 22.6, 2.35, .9 ], [ 15, 24, 2.2, .9 ], [ 7.4, 4.9, 1.15, .78 ], [ -6.6, 5, 1.2, .82 ], [ 10.9, 7.6, 1.05, .8 ], [ -9.9, 7, 1, .84 ] ];
    topiaries.forEach((t, i) => addTopiary(M, root, t[0], t[1], t[2], i + 3, t[3]));
    addHydrangea(M, root, -14, 52, 3.15, 2);
    addHydrangea(M, root, -11.9, 43, 2.35, 7);
    addHydrangea(M, root, -16.4, 60.5, 2.35, 13);
    addHydrangea(M, root, -10.4, 35, 1.55, 5);
    addHydrangea(M, root, -12.9, 27, 1.45, 17);
    addHydrangea(M, root, -15.4, 47, 1.85, 23);
    for (const sx of [ -1, 1 ]) {
        const urn = new THREE.Group;
        urn.position.set(sx * 2.85, .06, 2.6);
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(.28, .2, .45, 12), M.terracotta);
        pot.position.y = .23;
        pot.castShadow = true;
        urn.add(pot);
        const soil = new THREE.Mesh(new THREE.CylinderGeometry(.255, .255, .04, 12), M.soot);
        soil.position.y = .46;
        urn.add(soil);
        const bush = new THREE.Mesh(topiaryGeometry(), M.topiary);
        bush.scale.set(.28, .4, .28);
        bush.position.y = .72;
        bush.castShadow = true;
        urn.add(bush);
        root.add(urn);
    }
    const treeLeft = createDeciduousTree(M, {
        x: -30,
        z: 36.5,
        height: 31,
        spread: 15.2,
        palette: "oak",
        cards: 3800,
        seed: 5,
        shadow: true,
        leanX: -1.7
    });
    root.add(treeLeft);
    const treeRight = createDeciduousTree(M, {
        x: 32.2,
        z: 38,
        height: 27.5,
        spread: 12.8,
        palette: "gold",
        cards: 3e3,
        seed: 8,
        shadow: true,
        leanX: .9
    });
    root.add(treeRight);
    const treeLeftNear = createDeciduousTree(M, {
        x: -12.6,
        z: 66.5,
        height: 27.5,
        spread: 11,
        palette: "gold",
        cards: 5200,
        seed: 31,
        shadow: true,
        leanX: 1.6
    });
    root.add(treeLeftNear);
    const treeRightNear = createDeciduousTree(M, {
        x: 16.6,
        z: 62,
        height: 25,
        spread: 8.4,
        palette: "darkgold",
        cards: 3100,
        seed: 34,
        shadow: true,
        leanX: -.8
    });
    root.add(treeRightNear);
    const treeLeftLow = createDeciduousTree(M, {
        x: -23,
        z: 58,
        height: 21,
        spread: 10.5,
        palette: "darkgold",
        cards: 2100,
        seed: 21,
        shadow: false,
        leanX: -.8,
        branchDepth: 2
    });
    root.add(treeLeftLow);
    const treeRightLow = createDeciduousTree(M, {
        x: 24,
        z: 55,
        height: 18.5,
        spread: 9,
        palette: "gold",
        cards: 1700,
        seed: 22,
        shadow: false,
        leanX: .5,
        branchDepth: 2
    });
    root.add(treeRightLow);
    const mids = [ [ -28.5, -2, 24, 8.6, "oak", 5, 1600 ], [ 29, -5, 22, 8.2, "gold", 7, 1500 ], [ -25, -19, 20, 7.2, "deep", 9, 1200 ], [ 26, -21, 21, 7.4, "darkgold", 11, 1200 ], [ -9, -25, 21, 7.2, "oak", 13, 1e3 ], [ 14, -30, 19, 6.6, "deep", 15, 1e3 ], [ -43, -18, 25, 9.2, "gold", 17, 1200 ], [ 45, -33, 23, 8.4, "oak", 19, 1100 ] ];
    mids.forEach(([x, z, h, sp, pal, seed, cards]) => {
        root.add(createDeciduousTree(M, {
            x: x,
            z: z,
            height: h,
            spread: sp,
            palette: pal,
            cards: cards,
            seed: seed,
            shadow: false,
            branchDepth: 2,
            cardScale: 1.55
        }));
    });
    root.add(buildFirGrove(M, [ [ -4.5, -33, 22, 3 ], [ 10.5, -36, 23, 6 ], [ -36, -48, 26, 9 ], [ 44, -55, 21, 12 ], [ -58, -74, 25, 15 ], [ 78, -96, 23, 18 ], [ -96, -118, 21, 21 ], [ 26, -142, 27, 24 ], [ -150, -96, 20, 27 ], [ 148, -134, 24, 30 ], [ -122, -62, 18, 33 ], [ 104, -58, 19.5, 36 ], [ -182, -156, 22, 39 ], [ 190, -176, 23, 42 ], [ -48, -196, 24, 45 ] ]));
    root.add(buildForest(M));
    addGroundDetails(M, root, drive);
    return {
        group: root,
        terrain: terrain,
        drive: drive,
        treeLeft: treeLeft,
        treeRight: treeRight
    };
}
