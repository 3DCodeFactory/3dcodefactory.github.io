import * as THREE from "three";

import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

import { mesh, lathe, cylinder, TAU } from "./helpers.js";

const UP = new THREE.Vector3(0, 1, 0);

const _leafGeoCache = new Map;

function leafGeometry(kind = "ovate") {
    if (_leafGeoCache.has(kind)) return _leafGeoCache.get(kind);
    const segU = 16, segV = 9;
    const positions = [], uvs = [], indices = [];
    const seedOffset = {
        fiddle: .4,
        monstera: 1.1,
        heart: 2,
        narrow: .7,
        fern: 2.5,
        ovate: 0
    }[kind] || 0;
    for (let iu = 0; iu <= segU; iu++) {
        const u = iu / segU;
        let width;
        if (kind === "fiddle") {
            width = Math.pow(Math.sin(Math.PI * Math.pow(u, .8)), .55) * .46 * (.82 + .22 * u - .18 * Math.exp(-(((u - .27) / .15) ** 2)));
        } else if (kind === "monstera") {
            width = Math.pow(Math.sin(Math.PI * Math.pow(u, .72)), .48) * .53;
        } else if (kind === "heart") {
            width = Math.pow(Math.sin(Math.PI * Math.pow(u, .74)), .55) * .48;
        } else if (kind === "narrow") {
            width = Math.pow(Math.sin(Math.PI * Math.pow(u, .8)), .8) * .18;
        } else if (kind === "fern") {
            width = Math.pow(Math.sin(Math.PI * Math.pow(u, .7)), .8) * .14;
        } else {
            width = Math.pow(Math.sin(Math.PI * Math.pow(u, .82)), .65) * .44;
        }
        const serration = kind === "fern" ? .82 + .18 * Math.abs(Math.sin(u * 52)) : 1;
        width *= serration;
        const curl = .028 * Math.sin(u * Math.PI);
        for (let iv = 0; iv <= segV; iv++) {
            const v = iv / segV * 2 - 1;
            const edgeWave = 1 + (kind === "fiddle" ? .02 : .03) * Math.sin(u * 17 + v * 2.4 + seedOffset);
            const x = v * width * edgeWave;
            const y = u;
            const z = .05 * (1 - v * v) * (1 - .35 * u) + curl * (1 - v * v) - .07 * u * u + .008 * Math.sin(u * 7.5 + v * 3.1);
            positions.push(x, y, z);
            uvs.push(iv / segV, u);
        }
    }
    for (let iu = 0; iu < segU; iu++) {
        for (let iv = 0; iv < segV; iv++) {
            const a = iu * (segV + 1) + iv;
            const b = a + 1;
            const c = a + segV + 1;
            const d = c + 1;
            indices.push(a, c, b, b, c, d);
        }
    }
    const g = new THREE.BufferGeometry;
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(indices);
    g.computeVertexNormals();
    _leafGeoCache.set(kind, g);
    return g;
}

function stemGeometry(points, radius = .01, closed = false) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), closed, "centripetal", .3);
    return new THREE.TubeGeometry(curve, Math.max(10, points.length * 7), radius, 5, closed);
}

function createStems(stemSets, material, group) {
    const geos = [];
    for (const set of stemSets) {
        geos.push(stemGeometry(set.points, set.radius ?? .01));
    }
    if (!geos.length) return;
    const merged = mergeGeometries(geos, false);
    geos.forEach(g => g.dispose());
    const m = mesh(merged, material, {
        cast: true,
        receive: true
    });
    group.add(m);
}

function createLeaves(specs, material, group, kind = "ovate") {
    if (!specs.length) return null;
    const geo = leafGeometry(kind);
    const inst = new THREE.InstancedMesh(geo, material, specs.length);
    inst.castShadow = true;
    inst.receiveShadow = true;
    const dummy = new THREE.Object3D;
    const q = new THREE.Quaternion;
    const rollQ = new THREE.Quaternion;
    const color = new THREE.Color;
    for (let i = 0; i < specs.length; i++) {
        const s = specs[i];
        q.setFromUnitVectors(UP, s.dir.clone().normalize());
        rollQ.setFromAxisAngle(UP, s.roll ?? 0);
        q.multiply(rollQ);
        dummy.position.copy(s.pos);
        dummy.quaternion.copy(q);
        dummy.scale.set(s.width ?? .24, s.length ?? .34, 1);
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
        inst.setColorAt(i, color.set(s.color ?? "#829a61"));
    }
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    group.add(inst);
    return inst;
}

function makePot(mat, scale = 1) {
    const g = new THREE.Group;
    const profile = [ [ .02, 0 ], [ .13, 0 ], [ .18, .025 ], [ .205, .15 ], [ .225, .32 ], [ .275, .37 ], [ .28, .43 ], [ .245, .445 ], [ .238, .4 ], [ .2, .37 ] ];
    const pot = lathe(profile, mat, {
        segments: 32,
        cast: true
    });
    pot.scale.setScalar(scale);
    g.add(pot);
    const soil = cylinder(.205 * scale, .195 * scale, .025, new THREE.MeshStandardMaterial({
        color: 3417626,
        roughness: 1
    }), {
        pos: [ 0, .405 * scale, 0 ],
        segments: 24
    });
    soil.receiveShadow = true;
    g.add(soil);
    const saucer = cylinder(.27 * scale, .29 * scale, .025, mat, {
        pos: [ 0, .012, 0 ],
        segments: 28
    });
    g.add(saucer);
    return g;
}

function rndFactory(seed) {
    let a = seed;
    return () => {
        a |= 0;
        a = a + 1831565813 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

const leafGreens = [ "#3b5537", "#48633e", "#557146", "#617c4e", "#6e8959", "#334b30", "#7b9164" ];

const leafBrights = [ "#6b864d", "#7d965d", "#8ba266", "#98ad74", "#5c7547" ];

const leafDark = [ "#304a31", "#3c5738", "#47623d", "#526d46" ];

export function createFiddleLeaf(mats, options = {}) {
    const {position: position = [ 0, 0, 0 ], rotation: rotation = 0, scale: scale = 1, potMat: potMat = mats.ceramicCream, seed: seed = 5} = options;
    const rnd = rndFactory(seed);
    const g = new THREE.Group;
    g.position.set(...position);
    g.rotation.y = rotation;
    g.scale.setScalar(scale);
    const pot = makePot(potMat, 1);
    g.add(pot);
    const stems = [];
    const leaves = [];
    const trunkPts = [ [ 0, .4, 0 ], [ .02, .8, .01 ], [ -.03, 1.25, .02 ], [ .03, 1.7, -.01 ], [ .01, 2.25, .01 ], [ .08, 2.6, 0 ] ];
    stems.push({
        points: trunkPts,
        radius: .023
    });
    const branches = [];
    for (let b = 0; b < 6; b++) {
        const y0 = .8 + b * .28;
        const a = b * 1.73 + .6;
        const reach = .24 + rnd() * .34;
        const pts = [ [ 0 + (rnd() - .5) * .06, y0, 0 ], [ Math.cos(a) * reach * .55, y0 + .12, Math.sin(a) * reach * .55 ], [ Math.cos(a) * reach, y0 + .18 + rnd() * .12, Math.sin(a) * reach ] ];
        branches.push({
            points: pts,
            radius: .013
        });
        stems.push({
            points: pts,
            radius: .013
        });
        for (let l = 0; l < 5; l++) {
            const aa = a + (l - 2) * .43 + rnd() * .2;
            const rr = .06 + rnd() * .24;
            const base = new THREE.Vector3(Math.cos(a) * reach + Math.cos(aa) * rr, y0 + .18 + rnd() * .26, Math.sin(a) * reach + Math.sin(aa) * rr);
            const dir = new THREE.Vector3(Math.cos(aa) * (.45 + rnd() * .4), .8 + rnd() * .5, Math.sin(aa) * (.45 + rnd() * .4)).normalize();
            leaves.push({
                pos: base,
                dir: dir,
                length: .23 + rnd() * .16,
                width: .18 + rnd() * .08,
                roll: rnd() * TAU,
                color: leafGreens[rnd() * leafGreens.length | 0]
            });
        }
    }
    for (let l = 0; l < 22; l++) {
        const a = l * 2.399 + rnd();
        const y = 1.45 + rnd() * 1.18;
        const rr = .06 + rnd() * .45;
        const base = new THREE.Vector3(Math.cos(a) * rr, y, Math.sin(a) * rr * .8);
        const dir = new THREE.Vector3(Math.cos(a) * .55, .82 + rnd() * .4, Math.sin(a) * .55);
        leaves.push({
            pos: base,
            dir: dir,
            length: .24 + rnd() * .18,
            width: .18 + rnd() * .09,
            roll: rnd() * TAU,
            color: leafGreens[rnd() * leafGreens.length | 0]
        });
    }
    createStems(stems, mats.stem, g);
    createLeaves(leaves, mats.leaf, g, "fiddle");
    g.name = "fiddleLeaf";
    return g;
}

export function createMonstera(mats, options = {}) {
    const {position: position = [ 0, 0, 0 ], rotation: rotation = 0, scale: scale = 1, potMat: potMat = mats.ceramicOlive, seed: seed = 9} = options;
    const rnd = rndFactory(seed);
    const g = new THREE.Group;
    g.position.set(...position);
    g.rotation.y = rotation;
    g.scale.setScalar(scale);
    g.add(makePot(potMat, 1.08));
    const stems = [];
    const leaves = [];
    for (let s = 0; s < 5; s++) {
        const a = s * 1.37 + rnd() * .3;
        const reach = .4 + rnd() * .45;
        const h = .9 + rnd() * .9;
        const pts = [ [ 0, .42, 0 ], [ Math.cos(a) * reach * .3, h * .55, Math.sin(a) * reach * .3 ], [ Math.cos(a) * reach * .7, h, Math.sin(a) * reach * .7 ], [ Math.cos(a) * reach, h + .3 + rnd() * .25, Math.sin(a) * reach ] ];
        stems.push({
            points: pts,
            radius: .015
        });
        const tip = pts[3];
        for (let l = 0; l < 3; l++) {
            const aa = a + (l - 1) * .65;
            const dir = new THREE.Vector3(Math.cos(aa) * .6, .65 + rnd() * .5, Math.sin(aa) * .6);
            leaves.push({
                pos: new THREE.Vector3(tip[0] - Math.cos(aa) * .05, tip[1] - .03 + rnd() * .15, tip[2] - Math.sin(aa) * .05),
                dir: dir,
                length: .4 + rnd() * .2,
                width: .38 + rnd() * .14,
                roll: rnd() * TAU,
                color: leafGreens[rnd() * leafGreens.length | 0]
            });
        }
    }
    createStems(stems, mats.stemLight, g);
    createLeaves(leaves, mats.leafMonstera || mats.leafDark, g, "monstera");
    g.name = "monstera";
    return g;
}

export function createParlorPalm(mats, options = {}) {
    const {position: position = [ 0, 0, 0 ], rotation: rotation = 0, scale: scale = 1, potMat: potMat = mats.ceramicIndigo, seed: seed = 16} = options;
    const rnd = rndFactory(seed);
    const g = new THREE.Group;
    g.position.set(...position);
    g.rotation.y = rotation;
    g.scale.setScalar(scale);
    g.add(makePot(potMat, .9));
    const stems = [];
    const leaves = [];
    const fronds = 18;
    for (let f = 0; f < fronds; f++) {
        const a = f / fronds * TAU + (rnd() - .5) * .25;
        const len = 1.25 + rnd() * .85;
        const lift = .7 + rnd() * .8;
        const p0 = [ 0, .42, 0 ];
        const p1 = [ Math.cos(a) * len * .22, .42 + lift * .6, Math.sin(a) * len * .22 ];
        const p2 = [ Math.cos(a) * len * .62, .42 + lift * .95, Math.sin(a) * len * .62 ];
        const p3 = [ Math.cos(a) * len, .42 + lift * .86 + rnd() * .2, Math.sin(a) * len ];
        stems.push({
            points: [ p0, p1, p2, p3 ],
            radius: .007
        });
        for (let l = 0; l < 9; l++) {
            const t = .25 + l * .08;
            const bx = (1 - t) ** 3 * p0[0] + 3 * (1 - t) ** 2 * t * p1[0] + 3 * (1 - t) * t * t * p2[0] + t ** 3 * p3[0];
            const by = (1 - t) ** 3 * p0[1] + 3 * (1 - t) ** 2 * t * p1[1] + 3 * (1 - t) * t * t * p2[1] + t ** 3 * p3[1];
            const bz = (1 - t) ** 3 * p0[2] + 3 * (1 - t) ** 2 * t * p1[2] + 3 * (1 - t) * t * t * p2[2] + t ** 3 * p3[2];
            for (const side of [ -1, 1 ]) {
                const aa = a + side * (1.05 + rnd() * .2);
                const dir = new THREE.Vector3(Math.cos(aa) * .65, .65 + rnd() * .25, Math.sin(aa) * .65);
                leaves.push({
                    pos: new THREE.Vector3(bx, by, bz),
                    dir: dir,
                    length: .27 + rnd() * .15,
                    width: .075 + rnd() * .04,
                    roll: rnd() * TAU,
                    color: leafGreens[rnd() * leafGreens.length | 0]
                });
            }
        }
    }
    createStems(stems, mats.stemLight, g);
    createLeaves(leaves, mats.leaf, g, "narrow");
    g.name = "parlorPalm";
    return g;
}

export function createFern(mats, options = {}) {
    const {position: position = [ 0, 0, 0 ], rotation: rotation = 0, scale: scale = 1, potMat: potMat = mats.ceramicRose, seed: seed = 21, size: size = 1} = options;
    const rnd = rndFactory(seed);
    const g = new THREE.Group;
    g.position.set(...position);
    g.rotation.y = rotation;
    g.scale.setScalar(scale);
    g.add(makePot(potMat, .8 * size));
    const stems = [];
    const leaves = [];
    const fronds = 13;
    for (let f = 0; f < fronds; f++) {
        const a = f / fronds * TAU + rnd() * .4;
        const len = (.5 + rnd() * .5) * size;
        const pts = [ [ 0, .35, 0 ], [ Math.cos(a) * len * .25, .35 + len * .6, Math.sin(a) * len * .25 ], [ Math.cos(a) * len * .7, .35 + len * .8, Math.sin(a) * len * .7 ], [ Math.cos(a) * len, .35 + len * .5, Math.sin(a) * len ] ];
        stems.push({
            points: pts,
            radius: .005
        });
        for (let l = 0; l < 10; l++) {
            const t = .2 + l * .075;
            const bx = (1 - t) ** 3 * pts[0][0] + 3 * (1 - t) ** 2 * t * pts[1][0] + 3 * (1 - t) * t * t * pts[2][0] + t ** 3 * pts[3][0];
            const by = (1 - t) ** 3 * pts[0][1] + 3 * (1 - t) ** 2 * t * pts[1][1] + 3 * (1 - t) * t * t * pts[2][1] + t ** 3 * pts[3][1];
            const bz = (1 - t) ** 3 * pts[0][2] + 3 * (1 - t) ** 2 * t * pts[1][2] + 3 * (1 - t) * t * t * pts[2][2] + t ** 3 * pts[3][2];
            for (const side of [ -1, 1 ]) {
                const aa = a + side * 1.05;
                leaves.push({
                    pos: new THREE.Vector3(bx, by, bz),
                    dir: new THREE.Vector3(Math.cos(aa) * .6, .85, Math.sin(aa) * .6),
                    length: .18 * size + rnd() * .09,
                    width: .07,
                    roll: rnd() * TAU,
                    color: leafBrights[rnd() * leafBrights.length | 0]
                });
            }
        }
    }
    createStems(stems, mats.stemLight, g);
    createLeaves(leaves, mats.leaf, g, "fern");
    g.name = "fern";
    return g;
}

export function createPothos(mats, options = {}) {
    const {position: position = [ 0, 0, 0 ], rotation: rotation = 0, scale: scale = 1, potMat: potMat = mats.ceramicCream, seed: seed = 32, flowing: flowing = .8, pot: pot = true} = options;
    const rnd = rndFactory(seed);
    const g = new THREE.Group;
    g.position.set(...position);
    g.rotation.y = rotation;
    g.scale.setScalar(scale);
    if (pot) g.add(makePot(potMat, .82));
    const stems = [];
    const leaves = [];
    const vineCount = 5;
    for (let v = 0; v < vineCount; v++) {
        const a = v / vineCount * TAU + rnd() * .4;
        const reach = .36 + rnd() * .25;
        const drop = flowing * (.8 + rnd() * 1.3);
        const pts = [ [ 0, .42, 0 ], [ Math.cos(a) * reach * .4, .52 + rnd() * .12, Math.sin(a) * reach * .4 ], [ Math.cos(a) * reach * .8, .48 + rnd() * .1, Math.sin(a) * reach * .8 ], [ Math.cos(a) * reach, .55 + rnd() * .2, Math.sin(a) * reach ], [ Math.cos(a) * reach * 1.05, .55 - drop * .45, Math.sin(a) * reach * 1.05 ], [ Math.cos(a) * reach * 1.1 + (rnd() - .5) * .25, .55 - drop * .85, Math.sin(a) * reach * 1.1 + (rnd() - .5) * .25 ], [ Math.cos(a) * reach * 1.15 + (rnd() - .5) * .3, .55 - drop, Math.sin(a) * reach * 1.15 + (rnd() - .5) * .3 ] ];
        stems.push({
            points: pts,
            radius: .006
        });
        for (let l = 0; l < 15; l++) {
            const t = .2 + l * .052;
            const segCount = pts.length - 1;
            const fp = t * segCount;
            const si = Math.min(segCount - 1, Math.floor(fp));
            const u = fp - si;
            const p0 = pts[si], p1 = pts[si + 1];
            const bx = p0[0] + (p1[0] - p0[0]) * u;
            const by = p0[1] + (p1[1] - p0[1]) * u;
            const bz = p0[2] + (p1[2] - p0[2]) * u;
            const aa = a + Math.PI + (l % 2 ? .4 : -.4);
            const dir = new THREE.Vector3(Math.cos(aa) * .45, .72, Math.sin(aa) * .45);
            leaves.push({
                pos: new THREE.Vector3(bx, by, bz),
                dir: dir,
                length: .1 + rnd() * .06,
                width: .13 + rnd() * .05,
                roll: rnd() * TAU,
                color: (l % 3 === 0 ? leafBrights : leafGreens)[rnd() * 5 | 0]
            });
        }
    }
    createStems(stems, mats.stemLight, g);
    createLeaves(leaves, mats.leaf, g, "heart");
    g.name = "pothos";
    return g;
}

export function createHangingPothos(mats, options = {}) {
    const {position: position = [ 0, 0, 0 ], scale: scale = 1, seed: seed = 71, spread: spread = 1.4, drop: drop = 2.2} = options;
    const rnd = rndFactory(seed);
    const g = new THREE.Group;
    g.position.set(...position);
    g.scale.setScalar(scale);
    const stems = [];
    const leaves = [];
    for (let v = 0; v < 7; v++) {
        const xoff = (rnd() - .5) * spread;
        const zoff = (rnd() - .5) * .25;
        const pts = [ [ 0, 0, 0 ], [ xoff * .4, .1, zoff ], [ xoff * .75, -.15 - rnd() * .3, zoff + .05 ], [ xoff, -.6 - rnd() * .5, zoff + .16 ], [ xoff + (rnd() - .5) * .3, -drop * (.45 + rnd() * .2), zoff + .25 ], [ xoff + (rnd() - .5) * .4, -drop * (.75 + rnd() * .15), zoff + .28 ], [ xoff + (rnd() - .5) * .4, -drop, zoff + .24 ] ];
        stems.push({
            points: pts,
            radius: .006
        });
        for (let l = 0; l < 19; l++) {
            const t = .15 + l * .042;
            const segCount = pts.length - 1;
            const fp = Math.min(.999, t) * segCount;
            const si = Math.min(segCount - 1, Math.floor(fp));
            const u = fp - si;
            const p0 = pts[si], p1 = pts[si + 1];
            const bx = p0[0] + (p1[0] - p0[0]) * u;
            const by = p0[1] + (p1[1] - p0[1]) * u;
            const bz = p0[2] + (p1[2] - p0[2]) * u;
            const side = l % 2 ? 1 : -1;
            leaves.push({
                pos: new THREE.Vector3(bx, by, bz - .01),
                dir: new THREE.Vector3(side * .8, .25, .8 + rnd() * .4),
                length: .1 + rnd() * .06,
                width: .13 + rnd() * .05,
                roll: rnd() * TAU,
                color: leafBrights[rnd() * leafBrights.length | 0]
            });
        }
    }
    createStems(stems, mats.stemLight, g);
    createLeaves(leaves, mats.leaf, g, "heart");
    g.name = "hangingPothos";
    return g;
}
