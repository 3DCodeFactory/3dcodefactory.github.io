import * as THREE from "three";

import { mesh, box, roundedBox, sphere, cylinder, lathe, tube, plane, TAU, ROOM } from "./helpers.js";

import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

let seedValue = 1;

function rnd() {
    seedValue = seedValue * 1664525 + 1013904223 >>> 0;
    return seedValue / 4294967296;
}

function rr(a, b) {
    return a + rnd() * (b - a);
}

function seededRng(seed) {
    let s = seed >>> 0 || 1;
    return () => {
        s = s * 1664525 + 1013904223 >>> 0;
        return s / 4294967296;
    };
}

const bookPalette = [ 6962486, 3032402, 5068609, 10254154, 5387851, 9133123, 8204085, 4018784, 7236427, 10390114, 4929064, 12100219, 2703933, 8080694, 4010552, 5858384 ];

function coverMaterialFor(color, mats) {
    const mat = mats.leatherTan.clone();
    mat.color = new THREE.Color(color);
    mat.roughness = .55 + Math.random() * .25;
    return mat;
}

export function createBook(w, h, d, mats, options = {}) {
    const g = new THREE.Group;
    const coverColor = options.color ?? bookPalette[rnd() * bookPalette.length | 0];
    const coverMat = coverMaterialFor(coverColor, mats);
    const cover = box(w, h, d, coverMat, {
        cast: true
    });
    g.add(cover);
    const pages = box(w * .9, h * .77, d * 1.006, mats.bookPage, {
        pos: [ 0, 0, .008 ],
        cast: false
    });
    g.add(pages);
    if (options.gilt) {
        for (const sy of [ -.28, .28 ]) {
            const line = box(w * .94, h * .022, d * 1.012, mats.gold, {
                pos: [ 0, h * sy, 0 ],
                cast: false,
                receive: false
            });
            g.add(line);
        }
    }
    if (options.title === true) {
        const label = box(w * .4, h * .16, d * 1.014, mats.paper, {
            pos: [ 0, 0, .01 ],
            cast: false,
            receive: false
        });
        label.material = mats.paper.clone();
        label.material.color = new THREE.Color(13812384);
        g.add(label);
    }
    if (options.position) g.position.set(...options.position);
    if (options.rotation) g.rotation.set(...options.rotation);
    return g;
}

export function createBookStack(mats, options = {}) {
    const {count: count = 5, position: position = [ 0, 0, 0 ], rotation: rotation = 0, baseY: baseY = .005, spread: spread = .06} = options;
    const g = new THREE.Group;
    let y = baseY;
    let maxW = 0;
    for (let i = 0; i < count; i++) {
        const w = rr(.36, .52) * (i === 0 ? 1 : .96);
        const h = rr(.035, .085);
        const d = rr(.26, .38);
        const book = createBook(w, h, d, mats, {
            gilt: i % 3 === 0,
            color: bookPalette[rnd() * bookPalette.length | 0]
        });
        book.position.set((rnd() - .5) * spread, y + h / 2, (rnd() - .5) * spread);
        book.rotation.y = (rnd() - .5) * .22;
        g.add(book);
        y += h;
        maxW = Math.max(maxW, w);
    }
    if (options.topObject !== false) {
        const bowl = lathe([ [ .001, 0 ], [ .075, .005 ], [ .09, .03 ], [ .075, .05 ], [ .06, .045 ] ], mats.brassAged, {
            pos: [ .02, y + .025, 0 ],
            segments: 24
        });
        g.add(bowl);
        const sphereObj = sphere(.035, mats.brass, {
            pos: [ .02, y + .045, 0 ],
            segments: 16
        });
        g.add(sphereObj);
    }
    g.position.set(...position);
    g.rotation.y = rotation;
    return g;
}

function bloomPetalGeometry(length, width, thickness, segments = 10) {
    const petal = new THREE.SphereGeometry(1, segments, 7);
    petal.scale(width * .5, length * .5, thickness * .5);
    petal.translate(0, length * .5, 0);
    return petal;
}

function leafBladeGeometry(length, width) {
    const shape = new THREE.Shape;
    shape.moveTo(0, 0);
    shape.bezierCurveTo(width * .5, length * .16, width * .46, length * .7, 0, length);
    shape.bezierCurveTo(-width * .46, length * .7, -width * .5, length * .16, 0, 0);
    const geo = new THREE.ShapeGeometry(shape, 8);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i);
        pos.setZ(i, -Math.abs(x) * .26 - (y / length) ** 2 * length * .14);
    }
    geo.computeVertexNormals();
    geo.translate(0, 0, 0);
    return geo;
}

function createBouquet(mats) {
    const g = new THREE.Group;
    const rnd = seededRng(4471);
    const UP = new THREE.Vector3(0, 1, 0);
    const Z = new THREE.Vector3(0, 0, 1);
    const X = new THREE.Vector3(1, 0, 0);
    const petalCache = new Map;
    const petalBatches = new Map;
    const centreGeos = [];
    const leafBatches = new Map;
    const addBatch = (map, mat, geo) => {
        if (!map.has(mat)) map.set(mat, []);
        map.get(mat).push(geo);
    };
    const addPetal = (mat, geo) => addBatch(petalBatches, mat, geo);
    const addLeaf = (mat, geo) => addBatch(leafBatches, mat, geo);
    const getPetalGeo = (len, wid, thick) => {
        const key = `${len.toFixed(3)}-${wid.toFixed(3)}-${thick.toFixed(3)}`;
        if (!petalCache.has(key)) petalCache.set(key, bloomPetalGeometry(len, wid, thick));
        return petalCache.get(key);
    };
    const vaseProfile = [ [ .001, 0 ], [ .105, .003 ], [ .13, .035 ], [ .143, .12 ], [ .112, .2 ], [ .076, .252 ], [ .073, .282 ], [ .088, .3 ], [ .08, .313 ], [ .001, .313 ] ];
    const glassMat = mats.glassAmber.clone();
    glassMat.color = new THREE.Color(12880452);
    glassMat.opacity = .52;
    glassMat.roughness = .07;
    glassMat.envMapIntensity = 1.2;
    const vase = mesh(new THREE.LatheGeometry(vaseProfile.map(([r, y]) => new THREE.Vector2(r, y)), 32), glassMat, {
        cast: true
    });
    g.add(vase);
    const water = mesh(new THREE.CylinderGeometry(.098, .116, .115, 24), new THREE.MeshPhysicalMaterial({
        color: 6968372,
        roughness: .12,
        transparent: true,
        opacity: .5,
        metalness: 0
    }), {
        pos: [ 0, .115, 0 ]
    });
    g.add(water);
    const rim = mesh(new THREE.TorusGeometry(.08, .005, 5, 24), mats.brassAged, {
        pos: [ 0, .312, 0 ],
        rot: [ Math.PI / 2, 0, 0 ],
        receive: false
    });
    g.add(rim);
    const neckGlow = mesh(new THREE.SphereGeometry(.087, 16, 10), new THREE.MeshBasicMaterial({
        color: 16766107,
        transparent: true,
        opacity: .1,
        depthWrite: false,
        toneMapped: false
    }), {
        pos: [ 0, .27, 0 ],
        scale: [ 1, .7, 1 ]
    });
    g.add(neckGlow);
    const stems = [];
    const sprays = [];
    const bloomSpots = [];
    const N = 22;
    const palettes = [ {
        outer: mats.flowerBlush,
        inner: mats.flowerPink,
        center: mats.flowerCenter,
        size: .088
    }, {
        outer: mats.flowerPink,
        inner: mats.flowerBlush,
        center: mats.flowerCenterDark,
        size: .084
    }, {
        outer: mats.flowerPeach,
        inner: mats.flowerCream,
        center: mats.flowerCenter,
        size: .087
    }, {
        outer: mats.flowerRed,
        inner: mats.flowerPinkLight,
        center: mats.flowerCenter,
        size: .077
    }, {
        outer: mats.flowerCream,
        inner: mats.flowerPeach,
        center: mats.flowerCenter,
        size: .08
    }, {
        outer: mats.flowerPinkLight,
        inner: mats.flowerCreamLight,
        center: mats.flowerCenter,
        size: .073
    } ];
    for (let i = 0; i < N; i++) {
        const a = i / N * TAU + (rnd() - .5) * .35;
        const lean = .075 + rnd() * .36;
        const top = .12 + rnd() * .38;
        const bend = .02 + rnd() * .07;
        const pts = [ new THREE.Vector3(Math.cos(a) * .012, .3, Math.sin(a) * .012), new THREE.Vector3(Math.cos(a) * lean * .32, .3 + top * .38, Math.sin(a) * lean * .32), new THREE.Vector3(Math.cos(a) * (lean * .66 + bend), .3 + top * .78, Math.sin(a) * (lean * .66 + bend)), new THREE.Vector3(Math.cos(a) * lean, .3 + top, Math.sin(a) * lean) ];
        const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal", .35);
        stems.push(new THREE.TubeGeometry(curve, 14, .0033, 4, false));
        const tip = pts[3];
        const isSpray = i % 9 === 8;
        if (isSpray) {
            sprays.push({
                pos: tip.clone(),
                angle: a,
                top: top
            });
        } else {
            const pal = palettes[(i + (i > 9 ? 1 : 0)) % palettes.length];
            bloomSpots.push({
                pos: tip.clone(),
                normal: new THREE.Vector3(Math.sin(a) * .55 + (rnd() - .5) * .2, .62 + rnd() * .28, Math.cos(a) * .35 + .75).normalize(),
                size: pal.size * (.82 + rnd() * .34),
                outer: pal.outer,
                inner: pal.inner,
                center: pal.center,
                angle: a
            });
        }
        const leafCount = isSpray ? 2 : 3;
        for (let lf = 0; lf < leafCount; lf++) {
            const t = .28 + lf * .2 + rnd() * .1;
            const base = curve.getPoint(t);
            const len = (.07 + rnd() * .07) * (1 - lf * .1);
            const lg = leafBladeGeometry(len, len * (.5 + rnd() * .12));
            const rot = new THREE.Euler(-.7 + rnd() * .55, a + (rnd() - .5) * 2.4, 0, "YXZ");
            const q = (new THREE.Quaternion).setFromEuler(rot);
            lg.applyMatrix4((new THREE.Matrix4).compose(base, q, new THREE.Vector3(1, 1, 1)));
            addLeaf(lf === 1 || i % 5 === 0 ? mats.leafDark : mats.leafBouquet, lg);
        }
    }
    const stemsMesh = mesh(mergeGeometries(stems, false), mats.stem, {
        cast: true
    });
    stems.forEach(s => s.dispose());
    g.add(stemsMesh);
    const petalSphere = new THREE.SphereGeometry(1, 10, 8);
    for (const bloom of bloomSpots) {
        const size = bloom.size;
        const flowerQ = (new THREE.Quaternion).setFromUnitVectors(UP, bloom.normal);
        const flowerM = (new THREE.Matrix4).compose(bloom.pos, flowerQ, new THREE.Vector3(1, 1, 1));
        const bloomRot = rnd() * TAU;
        const layers = [ {
            n: 10,
            ring: .38,
            lx: .56,
            ly: .48,
            lz: .25,
            tilt: .35,
            lift: 0,
            mat: bloom.outer
        }, {
            n: 8,
            ring: .22,
            lx: .46,
            ly: .42,
            lz: .22,
            tilt: .55,
            lift: .024 * size,
            mat: bloom.inner
        }, {
            n: 6,
            ring: .1,
            lx: .33,
            ly: .33,
            lz: .18,
            tilt: .72,
            lift: .05 * size,
            mat: bloom.outer
        }, {
            n: 4,
            ring: .015,
            lx: .23,
            ly: .25,
            lz: .16,
            tilt: .82,
            lift: .072 * size,
            mat: bloom.inner
        } ];
        for (const layer of layers) {
            for (let p = 0; p < layer.n; p++) {
                const a = p / layer.n * TAU + bloomRot + (rnd() - .5) * .22;
                const ring = size * (layer.ring + (rnd() - .5) * .03);
                const local = (new THREE.Matrix4).makeTranslation(Math.cos(a) * ring, Math.sin(a) * ring, layer.lift).multiply((new THREE.Matrix4).makeRotationZ(a)).multiply((new THREE.Matrix4).makeRotationX(layer.tilt + (rnd() - .5) * .22)).multiply((new THREE.Matrix4).makeScale(size * layer.lx * (.9 + rnd() * .2), size * layer.ly * (.9 + rnd() * .2), size * layer.lz * (.9 + rnd() * .2)));
                const geo = petalSphere.clone();
                geo.applyMatrix4((new THREE.Matrix4).multiplyMatrices(flowerM, local));
                addPetal(layer.mat, geo);
            }
        }
        const core = new THREE.SphereGeometry(size * .06, 8, 6);
        core.applyMatrix4((new THREE.Matrix4).multiplyMatrices(flowerM, (new THREE.Matrix4).makeTranslation(0, 0, size * .085)));
        centreGeos.push({
            mat: bloom.center,
            geo: core
        });
        for (let p = 0; p < 5; p++) {
            const a = p / 5 * TAU + bloomRot;
            const len = size * .32;
            const lg = leafBladeGeometry(len, len * .26);
            const q = (new THREE.Quaternion).setFromEuler(new THREE.Euler(-Math.PI / 2 + .9, a, 0, "YXZ"));
            const base = new THREE.Vector3(0, 0, -size * .04);
            const local = (new THREE.Matrix4).compose(base, q, new THREE.Vector3(1, 1, 1));
            lg.applyMatrix4((new THREE.Matrix4).multiplyMatrices(flowerM, local));
            addLeaf(mats.leafBouquet, lg);
        }
    }
    petalSphere.dispose();
    for (const [mat, geos] of petalBatches) {
        const merged = mergeGeometries(geos, false);
        geos.forEach(geo => geo.dispose());
        const petals = mesh(merged, mat, {
            cast: true,
            receive: true
        });
        g.add(petals);
    }
    for (const [mat, geos] of leafBatches) {
        const merged = mergeGeometries(geos, false);
        geos.forEach(geo => geo.dispose());
        g.add(mesh(merged, mat, {
            cast: true,
            receive: true
        }));
    }
    if (centreGeos.length) {
        const merged = mergeGeometries(centreGeos.map(c => c.geo), false);
        centreGeos.forEach(c => c.geo.dispose());
        g.add(mesh(merged, mats.flowerCenter, {
            cast: false,
            receive: true
        }));
    }
    g.name = "bouquet";
    return g;
}

function createSmallBowl(mats, options = {}) {
    const g = new THREE.Group;
    const bowl = lathe([ [ .001, 0 ], [ .08, .002 ], [ .12, .03 ], [ .135, .07 ], [ .12, .085 ], [ .105, .065 ], [ .08, .045 ], [ .001, .02 ] ], options.mat ?? mats.brassAged, {
        segments: 28,
        cast: true
    });
    g.add(bowl);
    if (options.fruit) {
        for (let i = 0; i < 3; i++) {
            const f = sphere(.042, mats.ceramicRose, {
                pos: [ Math.cos(i * 2.1) * .043, .075, Math.sin(i * 2.1) * .043 ],
                segments: 12
            });
            f.scale.y = .88;
            g.add(f);
        }
    }
    return g;
}

function sofaPathPoint(t, halfW, zBack, bow) {
    return {
        x: halfW * t,
        z: zBack + bow * t * t
    };
}

function softCushionGeo(w, h, d, r, puff = .05) {
    const geo = new RoundedBoxGeometry(w, h, d, 7, r);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const ax = Math.min(1, Math.abs(x) / (w * .5));
        const ay = Math.min(1, Math.abs(y) / (h * .5));
        const bulge = Math.pow(Math.max(0, 1 - ax * ax), .75) * Math.pow(Math.max(0, 1 - ay * ay), .75) * (.7 + .3 * Math.sin(x * 7.1 + y * 4.3));
        pos.setZ(i, z + Math.sign(z) * puff * bulge);
        pos.setY(i, y - h * .045 * Math.pow(ax, 2) * (z > 0 ? 1 : .4));
    }
    geo.computeVertexNormals();
    return geo;
}

function sweptOval(points, halfWidth, halfHeight, centerY, radialSegments = 14) {
    const n = points.length;
    const positions = [];
    const uvs = [];
    const indices = [];
    const tangent = new THREE.Vector3;
    const prev = new THREE.Vector3;
    const next = new THREE.Vector3;
    for (let i = 0; i < n; i++) {
        const p = points[i];
        prev.copy(points[Math.max(0, i - 1)]);
        next.copy(points[Math.min(n - 1, i + 1)]);
        tangent.subVectors(next, prev);
        tangent.y = 0;
        if (tangent.lengthSq() < 1e-8) tangent.set(1, 0, 0);
        tangent.normalize();
        const nx = tangent.z;
        const nz = -tangent.x;
        for (let j = 0; j < radialSegments; j++) {
            const a = j / radialSegments * TAU;
            const ox = Math.cos(a) * halfWidth;
            const oy = Math.sin(a) * halfHeight;
            positions.push(p.x + nx * ox, centerY + oy, p.z + nz * ox);
            uvs.push(i / (n - 1), j / radialSegments);
        }
    }
    for (let i = 0; i < n - 1; i++) {
        for (let j = 0; j < radialSegments; j++) {
            const j2 = (j + 1) % radialSegments;
            const a = i * radialSegments + j;
            const b = (i + 1) * radialSegments + j;
            const c = (i + 1) * radialSegments + j2;
            const d = i * radialSegments + j2;
            indices.push(a, b, d, b, c, d);
        }
    }
    for (const [i, flip] of [ [ 0, true ], [ n - 1, false ] ]) {
        const p = points[i];
        const center = positions.length / 3;
        positions.push(p.x, centerY, p.z);
        uvs.push(.5, .5);
        for (let j = 0; j < radialSegments; j++) {
            const j2 = (j + 1) % radialSegments;
            const a = i * radialSegments + j;
            const b = i * radialSegments + j2;
            if (flip) indices.push(center, b, a); else indices.push(center, a, b);
        }
    }
    const geo = new THREE.BufferGeometry;
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
}

function bentCushionGeo(w, h, d, r, puff, bow) {
    const geo = new RoundedBoxGeometry(w, h, d, 10, r);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const t = THREE.MathUtils.clamp(x / (w * .5), -1, 1);
        const across = Math.abs(t);
        const zz = z + bow * t * t;
        const sag = -.018 * (1 - across * across) * (.55 + .45 * (z / (d * .5)));
        const crown = puff * Math.pow(Math.max(0, 1 - across * across), .6);
        pos.setXYZ(i, x, y + sag + crown, zz);
    }
    geo.computeVertexNormals();
    return geo;
}

function sweptSuperellipse(points, halfWidth, halfHeight, centerY, radialSegments = 20, power = 4) {
    const n = points.length;
    const positions = [];
    const uvs = [];
    const indices = [];
    const tangent = new THREE.Vector3;
    const prev = new THREE.Vector3;
    const next = new THREE.Vector3;
    const eased = v => Math.sign(v) * Math.pow(Math.abs(v), 2 / power);
    for (let i = 0; i < n; i++) {
        const p = points[i];
        prev.copy(points[Math.max(0, i - 1)]);
        next.copy(points[Math.min(n - 1, i + 1)]);
        tangent.subVectors(next, prev);
        tangent.y = 0;
        if (tangent.lengthSq() < 1e-8) tangent.set(1, 0, 0);
        tangent.normalize();
        const nx = tangent.z;
        const nz = -tangent.x;
        for (let j = 0; j < radialSegments; j++) {
            const a = j / radialSegments * TAU;
            const ox = eased(Math.cos(a)) * halfWidth;
            const oy = eased(Math.sin(a)) * halfHeight;
            positions.push(p.x + nx * ox, centerY + oy, p.z + nz * ox);
            uvs.push(i / (n - 1), j / radialSegments);
        }
    }
    for (let i = 0; i < n - 1; i++) {
        for (let j = 0; j < radialSegments; j++) {
            const j2 = (j + 1) % radialSegments;
            const a = i * radialSegments + j;
            const b = (i + 1) * radialSegments + j;
            const c = (i + 1) * radialSegments + j2;
            const d = i * radialSegments + j2;
            indices.push(a, b, d, b, c, d);
        }
    }
    for (const [i, flip] of [ [ 0, true ], [ n - 1, false ] ]) {
        const p = points[i];
        const center = positions.length / 3;
        positions.push(p.x, centerY, p.z);
        uvs.push(.5, .5);
        for (let j = 0; j < radialSegments; j++) {
            const j2 = (j + 1) % radialSegments;
            const a = i * radialSegments + j;
            const b = i * radialSegments + j2;
            if (flip) indices.push(center, b, a); else indices.push(center, a, b);
        }
    }
    const geo = new THREE.BufferGeometry;
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
}

function sweptCurvedWall(points, halfDepthAt, halfHeightAt, centerYAt, radialSegments = 26, power = 2.6) {
    const n = points.length;
    const positions = [];
    const uvs = [];
    const indices = [];
    const eased = v => Math.sign(v) * Math.pow(Math.abs(v), 2 / power);
    const tangent = new THREE.Vector3;
    const prev = new THREE.Vector3;
    const next = new THREE.Vector3;
    for (let i = 0; i < n; i++) {
        const p = points[i];
        prev.copy(points[Math.max(0, i - 1)]);
        next.copy(points[Math.min(n - 1, i + 1)]);
        tangent.subVectors(next, prev);
        tangent.y = 0;
        if (tangent.lengthSq() < 1e-8) tangent.set(1, 0, 0);
        tangent.normalize();
        const nx = tangent.z;
        const nz = -tangent.x;
        const hd = halfDepthAt(i / (n - 1));
        const hh = halfHeightAt(i / (n - 1));
        const cy = centerYAt(i / (n - 1));
        for (let j = 0; j < radialSegments; j++) {
            const a = j / radialSegments * TAU;
            const ox = eased(Math.cos(a)) * hd;
            const oy = eased(Math.sin(a)) * hh;
            positions.push(p.x + nx * ox, cy + oy, p.z + nz * ox);
            uvs.push(i / (n - 1), j / radialSegments);
        }
    }
    for (let i = 0; i < n - 1; i++) {
        for (let j = 0; j < radialSegments; j++) {
            const j2 = (j + 1) % radialSegments;
            const a = i * radialSegments + j;
            const b = (i + 1) * radialSegments + j;
            const c = (i + 1) * radialSegments + j2;
            const d = i * radialSegments + j2;
            indices.push(a, b, d, b, c, d);
        }
    }
    for (const [i, flip] of [ [ 0, true ], [ n - 1, false ] ]) {
        const p = points[i];
        const center = positions.length / 3;
        positions.push(p.x, centerYAt(i / (n - 1)), p.z);
        uvs.push(.5, .5);
        for (let j = 0; j < radialSegments; j++) {
            const j2 = (j + 1) % radialSegments;
            const a = i * radialSegments + j;
            const b = i * radialSegments + j2;
            if (flip) indices.push(center, b, a); else indices.push(center, a, b);
        }
    }
    const geo = new THREE.BufferGeometry;
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
}

export function createSofa(mats) {
    const g = new THREE.Group;
    g.name = "curvedVelvetSofa";
    g.position.set(-1, 0, -2.86);
    g.rotation.y = .035;
    g.scale.set(.94, 1, 1);
    const velvet = mats.velvetRust;
    const velvetDark = mats.velvetRustDark;
    const velvetLight = mats.velvetRust.clone();
    velvetLight.color = new THREE.Color(13211520);
    velvetLight.roughness = .9;
    g.add(box(3.3, .08, 1.6, mats.woodDark, {
        pos: [ 0, .05, .22 ],
        cast: true,
        receive: true
    }));
    for (const sx of [ -1, 1 ]) {
        for (const zz of [ .02, 1.16 ]) {
            g.add(lathe([ [ .001, 0 ], [ .055, .004 ], [ .062, .03 ], [ .04, .08 ], [ .046, .12 ], [ .03, .14 ] ], mats.woodDark, {
                pos: [ sx * 1.34, 0, zz ],
                segments: 10,
                cast: true
            }));
        }
    }
    const seatTop = .585;
    const bow = .5;
    const seatHalfW = 1.58;
    {
        const seat = mesh(bentCushionGeo(3.16, .36, 1.42, .2, .095, bow), velvet, {
            pos: [ 0, .3, .25 ],
            cast: true,
            receive: true
        });
        g.add(seat);
        for (const sx of [ -1, 1 ]) {
            const pts = [];
            for (let i = 0; i <= 12; i++) {
                const v = i / 12;
                const x = sx * .5;
                const t = x / seatHalfW;
                const z = .25 - .6 + v * 1.26 + bow * t * t;
                const y = seatTop - Math.sin(v * Math.PI) * .014 + .002;
                pts.push(new THREE.Vector3(x, y, z));
            }
            g.add(tube(pts.map(v => v.toArray()), .006, velvetDark, {
                segments: 26,
                radialSegments: 4
            }));
        }
        const lipPts = [];
        for (let i = 0; i <= 38; i++) {
            const t = -1 + i / 38 * 2;
            const x = seatHalfW * t;
            const z = .25 + .71 + bow * t * t;
            lipPts.push(new THREE.Vector3(x, .475 + Math.sin(i * 1.8) * .006, z + .03));
        }
        g.add(tube(lipPts.map(v => v.toArray()), .09, velvet, {
            segments: 100,
            radialSegments: 10
        }));
        const highlight = lipPts.map(v => new THREE.Vector3(v.x, .565, v.z + .015));
        g.add(tube(highlight.map(v => v.toArray()), .0065, velvetLight, {
            segments: 100,
            radialSegments: 4
        }));
    }
    const wallPts = [ [ -1.78, -.3 ], [ -1.62, -.57 ], [ -1.35, -.74 ], [ -.95, -.83 ], [ -.5, -.86 ], [ 0, -.87 ], [ .5, -.86 ], [ .95, -.83 ], [ 1.35, -.74 ], [ 1.62, -.57 ], [ 1.78, -.3 ] ].map(([x, z]) => new THREE.Vector3(x, 0, z));
    const wallCurve = new THREE.CatmullRomCurve3(wallPts, false, "centripetal", .32);
    const wallSamples = [];
    const wallUs = [];
    for (let i = 0; i <= 84; i++) {
        const u = i / 84;
        wallUs.push(u);
        wallSamples.push(wallCurve.getPointAt(u));
    }
    const wallTopAt = p => .9 + .33 * Math.pow(Math.max(0, 1 - Math.pow(p.x / 1.78, 2)), .8);
    const wallBottom = .1;
    const wallGeo = sweptCurvedWall(wallSamples, () => .3, u => (wallTopAt(wallSamples[Math.round(u * 84)]) - wallBottom) / 2, u => (wallTopAt(wallSamples[Math.round(u * 84)]) + wallBottom) / 2, 26, 2.5);
    g.add(mesh(wallGeo, velvet, {
        cast: true,
        receive: true
    }));
    const topPts = wallSamples.map(p => new THREE.Vector3(p.x, wallTopAt(p) - .015, p.z));
    g.add(tube(topPts.map(p => p.toArray()), .125, velvet, {
        segments: 160,
        radialSegments: 12,
        cast: true,
        receive: true
    }));
    const rollCrest = topPts.map(p => new THREE.Vector3(p.x, p.y + .093, p.z));
    g.add(tube(rollCrest.map(p => p.toArray()), .006, velvetLight, {
        segments: 160,
        radialSegments: 4
    }));
    for (let i = 6; i < 79; i += 7) {
        const u = i / 84;
        const p = wallSamples[i];
        const tangent = wallCurve.getTangentAt(u);
        const nx = tangent.z;
        const nz = -tangent.x;
        const top = wallTopAt(p);
        const seamPts = [];
        for (let k = 0; k <= 7; k++) {
            const f = k / 7;
            seamPts.push(new THREE.Vector3(p.x + nx * .286, wallBottom + .1 + (top - wallBottom - .18) * f, p.z + nz * .286));
        }
        g.add(tube(seamPts.map(v => v.toArray()), .0045, velvetDark, {
            segments: 14,
            radialSegments: 4
        }));
    }
    for (const sx of [ -1, 1 ]) {
        const ax = sx * 1.7;
        const armBody = mesh(softCushionGeo(.6, .74, 1.68, .255, .05), velvet, {
            pos: [ ax, .55, .55 ],
            rot: [ 0, 0, -sx * .012 ],
            cast: true,
            receive: true
        });
        g.add(armBody);
        const seamPts = [];
        for (let i = 0; i <= 12; i++) {
            const f = i / 12;
            const z = 1.36 - f * 1.62;
            const y = .89 - Math.pow(Math.abs(f - .5) * 2, 2) * .035;
            seamPts.push(new THREE.Vector3(ax + sx * .29, y, z));
        }
        g.add(tube(seamPts.map(v => v.toArray()), .0055, velvetLight, {
            segments: 30,
            radialSegments: 4
        }));
        g.add(sphere(.032, mats.brassAged, {
            pos: [ ax + sx * .24, .83, -.12 ],
            segments: 9
        }));
    }
    for (const [x, w, y] of [ [ -1.08, .9, .81 ], [ -.36, .92, .83 ], [ .36, .92, .83 ], [ 1.08, .9, .81 ] ]) {
        const t = x / 1.35;
        const z = -.53 + .46 * t * t;
        const cushion = mesh(softCushionGeo(w, .5, .28, .15, .055), velvet, {
            pos: [ x, y, z ],
            rot: [ -.2, -x * .08, 0 ],
            cast: true,
            receive: true
        });
        g.add(cushion);
        g.add(sphere(.014, velvetDark, {
            pos: [ x, y + .2, z + .145 ],
            segments: 7,
            receive: false
        }));
    }
    const pillowSet = [ {
        x: -1.26,
        w: .68,
        h: .6,
        mat: mats.pillow.floral,
        y: .05,
        dz: .02,
        tilt: -.27,
        rot: .11
    }, {
        x: -.82,
        w: .79,
        h: .66,
        mat: mats.pillow.kilim,
        y: 0,
        dz: .13,
        tilt: -.22,
        rot: -.14
    }, {
        x: -.31,
        w: .76,
        h: .67,
        mat: mats.pillow.paisley,
        y: .015,
        dz: .16,
        tilt: -.2,
        rot: .07
    }, {
        x: .19,
        w: .88,
        h: .69,
        mat: mats.pillow.floral,
        y: .03,
        dz: .13,
        tilt: -.26,
        rot: -.02
    }, {
        x: .69,
        w: .7,
        h: .62,
        mat: mats.pillow.wine,
        y: 0,
        dz: .1,
        tilt: -.23,
        rot: .09
    }, {
        x: 1.12,
        w: .64,
        h: .64,
        mat: mats.pillow.botanical,
        y: .02,
        dz: .06,
        tilt: -.27,
        rot: -.08
    }, {
        x: 1.35,
        w: .54,
        h: .6,
        mat: mats.plainSlate,
        y: .03,
        dz: 0,
        tilt: -.23,
        rot: .12
    } ];
    pillowSet.forEach((p, idx) => {
        const t = p.x / 1.35;
        const z = -.3 + .46 * t * t + p.dz;
        const pillow = mesh(softCushionGeo(p.w, p.h, .28, .155, .085), p.mat, {
            pos: [ p.x, seatTop + p.h * .34 + p.y, z ],
            cast: true,
            receive: true
        });
        pillow.rotation.order = "YXZ";
        pillow.rotation.y = -p.x * .08 + p.rot;
        pillow.rotation.x = p.tilt;
        pillow.rotation.z = (idx % 2 ? 1 : -1) * .05;
        g.add(pillow);
    });
    for (const [x, w, h, mat, rz] of [ [ -.48, .51, .44, mats.pillow.tulip || mats.pillow.floral, .06 ], [ .48, .49, .42, mats.pillow.velvet || mats.pillow.wine, -.05 ] ]) {
        const t = x / 1.35;
        const pil = mesh(softCushionGeo(w, h, .18, .1, .04), mat, {
            pos: [ x, seatTop + h * .42, .56 + bow * t * t ],
            rot: [ 0, x * .1, rz ],
            cast: true
        });
        g.add(pil);
    }
    {
        const pil = mesh(softCushionGeo(.72, .26, .17, .075, .03), mats.pillow.stripe, {
            pos: [ .55, seatTop + .18, .5 + bow * (.55 / 1.58) ** 2 ],
            rot: [ 0, .06, 0 ],
            cast: true
        });
        g.add(pil);
    }
    {
        const W = .6, L = 1.9;
        const geo = new THREE.PlaneGeometry(W, L, 26, 42);
        const pos = geo.attributes.position;
        const x0 = -1.76;
        const z0 = -.3;
        for (let i = 0; i < pos.count; i++) {
            const u = pos.getX(i) / W + .5;
            const v = .5 - pos.getY(i) / L;
            const fold = Math.sin(v * 15 + u * 3.1) * .018 + Math.sin(u * 9 + v * 4) * .013;
            let x = x0 + (u - .5) * W + Math.sin(v * 5.4) * .032;
            let z, y;
            if (v < .63) {
                z = z0 + v / .63 * 1.86;
                y = .98 - v * .07 + fold;
            } else {
                const f = (v - .63) / .37;
                z = z0 + 1.86 + f * .06;
                y = .91 - f * .64 + fold * .8;
                x += Math.sin(f * 4.2) * .025;
            }
            pos.setXYZ(i, x, y, z);
        }
        geo.computeVertexNormals();
        const throwMesh = mesh(geo, mats.throwCream, {
            cast: true,
            receive: true
        });
        throwMesh.material = mats.throwCream.clone();
        throwMesh.material.map = mats.throw.map;
        throwMesh.material.bumpMap = mats.throw.bumpMap || mats.throw.bump;
        throwMesh.material.color = new THREE.Color(11969935);
        throwMesh.material.roughness = .96;
        throwMesh.material.side = THREE.DoubleSide;
        g.add(throwMesh);
        g.add(tube([ [ -2.32, 1.12, -.5 ], [ -2.33, 1.05, .3 ], [ -2.3, .96, 1.1 ], [ -2.26, .32, 1.7 ] ], .007, mats.dried[1], {
            segments: 40,
            radialSegments: 4,
            receive: false
        }));
        for (let i = 0; i < 14; i++) {
            const u = i / 13;
            const x = x0 + (u - .5) * W * .92;
            g.add(tube([ [ x, .31, z0 + 1.915 ], [ x + Math.sin(i * 2.2) * .015, .245, z0 + 1.925 ] ], .0042, mats.flowerCream, {
                segments: 4,
                radialSegments: 3,
                receive: false
            }));
        }
    }
    return g;
}

export function createCoffeeTable(mats) {
    const g = new THREE.Group;
    g.name = "coffeeTable";
    g.position.set(-.62, 0, -1.15);
    g.rotation.y = .04;
    const topMat = mats.woodOak.clone();
    topMat.color = new THREE.Color(13677713);
    topMat.roughness = .66;
    topMat.envMapIntensity = .25;
    const edgeMat = mats.woodDark.clone();
    edgeMat.color = new THREE.Color(7162673);
    edgeMat.roughness = .7;
    const R = .82;
    const topProfile = [ new THREE.Vector2(.001, .47), new THREE.Vector2(R * .72, .468), new THREE.Vector2(R * .92, .458), new THREE.Vector2(R, .43), new THREE.Vector2(R * .985, .401), new THREE.Vector2(R * .86, .388), new THREE.Vector2(.001, .382) ];
    const top = mesh(new THREE.LatheGeometry(topProfile, 64), topMat, {
        cast: true,
        receive: true
    });
    top.scale.z = .78;
    g.add(top);
    const capMat = topMat.clone();
    capMat.map = capMat.map.clone();
    capMat.map.center.set(.5, .5);
    capMat.map.rotation = .07;
    capMat.map.repeat.set(1.15, 1.15);
    capMat.map.needsUpdate = true;
    const cap = mesh(new THREE.CircleGeometry(R * .955, 72), capMat, {
        pos: [ 0, .4685, 0 ],
        rot: [ -Math.PI / 2, 0, 0 ],
        receive: true
    });
    cap.scale.y = .78;
    g.add(cap);
    const rim = mesh(new THREE.TorusGeometry(R * .985, .012, 6, 84), edgeMat, {
        pos: [ 0, .432, 0 ],
        rot: [ Math.PI / 2, 0, 0 ],
        receive: false
    });
    rim.scale.z = .78;
    g.add(rim);
    const legMat = mats.woodOak.clone();
    legMat.color = new THREE.Color(8871996);
    legMat.roughness = .66;
    for (let i = 0; i < 4; i++) {
        const a = i / 4 * TAU + Math.PI / 4;
        const x = Math.cos(a) * .5;
        const z = Math.sin(a) * .36;
        const leg = lathe([ [ .001, 0 ], [ .038, .006 ], [ .045, .04 ], [ .031, .1 ], [ .038, .2 ], [ .029, .31 ], [ .04, .37 ], [ .001, .4 ] ], legMat, {
            pos: [ x, 0, z ],
            segments: 14,
            cast: true
        });
        leg.rotation.z = Math.cos(a) * .055;
        leg.rotation.x = -Math.sin(a) * .055;
        g.add(leg);
        g.add(cylinder(.032, .038, .04, mats.brassAged, {
            pos: [ x, .02, z ],
            segments: 10
        }));
    }
    for (const a of [ Math.PI / 4, -Math.PI / 4 ]) {
        const rail = box(1, .035, .035, legMat, {
            pos: [ 0, .32, 0 ],
            rot: [ 0, a, 0 ],
            receive: false
        });
        g.add(rail);
    }
    const stack = createBookStack(mats, {
        count: 2,
        position: [ -.33, .47, .12 ],
        rotation: -.12,
        topObject: false
    });
    stack.children.forEach(b => {
        b.scale.setScalar(.9);
    });
    g.add(stack);
    const smallBook = createBook(.38, .05, .27, mats, {
        color: 8146237,
        gilt: true
    });
    smallBook.position.set(.16, .52, .34);
    smallBook.rotation.y = .22;
    g.add(smallBook);
    const bouquet = createBouquet(mats);
    bouquet.position.set(-.02, .484, -.1);
    bouquet.scale.setScalar(1.12);
    g.add(bouquet);
    const bowl = createSmallBowl(mats, {
        fruit: true
    });
    bowl.position.set(.46, .48, .18);
    bowl.scale.setScalar(.7);
    g.add(bowl);
    const cup = lathe([ [ .001, 0 ], [ .05, 0 ], [ .06, .02 ], [ .055, .11 ], [ .045, .13 ], [ .001, .13 ] ], mats.ceramicIndigo, {
        pos: [ .36, .48, -.3 ],
        segments: 20,
        cast: true
    });
    g.add(cup);
    const candle = cylinder(.032, .036, .09, mats.candle, {
        pos: [ .36, .61, -.3 ],
        segments: 16
    });
    g.add(candle);
    const flame = mesh(new THREE.SphereGeometry(.011, 8, 8), mats.flame, {
        pos: [ .36, .68, -.3 ],
        receive: false
    });
    flame.scale.y = 1.8;
    g.add(flame);
    return g;
}

function createOvalMirror(mats, width, height) {
    const g = new THREE.Group;
    const ellipse = new THREE.Shape;
    ellipse.absellipse(0, 0, width / 2, height / 2, 0, TAU, false, 0);
    const mirGeo = new THREE.ShapeGeometry(ellipse, 48);
    const p = mirGeo.attributes.position;
    const uv = mirGeo.attributes.uv;
    for (let i = 0; i < p.count; i++) {
        uv.setXY(i, p.getX(i) / width + .5, p.getY(i) / height + .5);
    }
    const mirror = mesh(mirGeo, mats.mirror, {
        receive: false
    });
    mirror.position.z = .02;
    g.add(mirror);
    const backEllipse = new THREE.Shape;
    backEllipse.absellipse(0, 0, width / 2 + .05, height / 2 + .055, 0, TAU, false, 0);
    const backBoard = mesh(new THREE.ShapeGeometry(backEllipse, 48), mats.woodDark, {
        receive: false
    });
    backBoard.position.z = 0;
    g.add(backBoard);
    const pts = [];
    for (let i = 0; i < 100; i++) {
        const a = i / 100 * TAU;
        pts.push(new THREE.Vector3(Math.cos(a) * (width / 2 + .02), Math.sin(a) * (height / 2 + .02), .045));
    }
    const frameCurve = new THREE.CatmullRomCurve3(pts, true);
    g.add(mesh(new THREE.TubeGeometry(frameCurve, 120, .045, 7, true), mats.mirrorFrame, {
        cast: true
    }));
    const brassPts = pts.map((p2, i) => {
        const a = i / 100 * TAU;
        return new THREE.Vector3(Math.cos(a) * (width / 2 + .02), Math.sin(a) * (height / 2 + .02), .075);
    });
    g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(brassPts, true), 120, .009, 5, true), mats.brassAged, {
        receive: false
    }));
    for (const sy of [ -1, 1 ]) {
        const a = sy > 0 ? .2 : .8;
        const curlPts = [ new THREE.Vector3(-.18, sy * (height / 2 + .02), .055), new THREE.Vector3(-.32, sy * (height / 2 + .14), .055), new THREE.Vector3(-.08, sy * (height / 2 + .22), .055), new THREE.Vector3(.08, sy * (height / 2 + .14), .055) ];
        const c = new THREE.CatmullRomCurve3(curlPts, false, "catmullrom", .4);
        g.add(mesh(new THREE.TubeGeometry(c, 20, .02, 5, false), mats.mirrorFrame, {
            cast: true
        }));
    }
    return g;
}

export function createSideboard(mats) {
    const g = new THREE.Group;
    g.name = "carvedSideboard";
    g.position.set(-4.38, 0, -2.45);
    const length = 2.85;
    const depth = .56;
    const bodyH = .83;
    const y0 = .18;
    const body = box(depth, bodyH, length, mats.woodWalnut, {
        pos: [ 0, y0 + bodyH / 2, 0 ],
        cast: true
    });
    g.add(body);
    const top = box(depth + .1, .065, length + .14, mats.woodWalnut, {
        pos: [ 0, y0 + bodyH + .03, 0 ],
        cast: true
    });
    g.add(top);
    const topEdge = box(depth + .14, .03, length + .18, mats.woodDark, {
        pos: [ 0, y0 + bodyH - .01, 0 ],
        cast: true
    });
    g.add(topEdge);
    const frieze = box(depth + .02, .11, length - .04, mats.carvedWood, {
        pos: [ 0, y0 + bodyH - .08, 0 ],
        cast: true
    });
    g.add(frieze);
    for (const [x, z] of [ [ -.2, -1.27 ], [ .2, -1.27 ], [ -.2, 1.27 ], [ .2, 1.27 ] ]) {
        const leg = lathe([ [ .001, 0 ], [ .07, .005 ], [ .09, .06 ], [ .06, .13 ], [ .075, .18 ], [ .05, .21 ] ], mats.woodDark, {
            pos: [ x, 0, z ],
            segments: 12,
            cast: true
        });
        g.add(leg);
    }
    const apron = box(depth + .03, .09, length - .12, mats.carvedWood, {
        pos: [ 0, .23, 0 ],
        cast: true
    });
    g.add(apron);
    const doorZ = [ -.95, 0, .95 ];
    for (let i = 0; i < 3; i++) {
        const z = doorZ[i];
        const panel = plane(.88, .64, mats.carvedWood, {
            pos: [ depth / 2 + .006, y0 + bodyH / 2 - .01, z ],
            rot: [ 0, Math.PI / 2, 0 ],
            cast: false
        });
        g.add(panel);
        const frameW = .92;
        const frameH = .68;
        const fmat = mats.woodDark;
        g.add(box(.022, .055, frameW, fmat, {
            pos: [ depth / 2 + .015, y0 + bodyH / 2 + .335, z ],
            cast: true
        }));
        g.add(box(.022, .055, frameW, fmat, {
            pos: [ depth / 2 + .015, y0 + bodyH / 2 - .345, z ],
            cast: true
        }));
        g.add(box(.022, frameH, .055, fmat, {
            pos: [ depth / 2 + .015, y0 + bodyH / 2, z - frameW / 2 + .02 ],
            cast: true
        }));
        g.add(box(.022, frameH, .055, fmat, {
            pos: [ depth / 2 + .015, y0 + bodyH / 2, z + frameW / 2 - .02 ],
            cast: true
        }));
        const knob = sphere(.035, mats.brass, {
            pos: [ depth / 2 + .06, y0 + bodyH / 2 - .02, z + .3 ],
            segments: 16
        });
        g.add(knob);
        const keyhole = box(.012, .06, .04, mats.brassAged, {
            pos: [ depth / 2 + .03, y0 + bodyH / 2 - .04, z + .22 ],
            receive: false
        });
        g.add(keyhole);
    }
    for (const z of [ -length / 2 + .08, length / 2 - .08 ]) {
        for (let k = 0; k < 4; k++) {
            const fl = cylinder(.012, .012, bodyH - .18, mats.woodOak, {
                pos: [ depth / 2 + .035, y0 + bodyH / 2, z + (k - 1.5) * .035 ],
                segments: 8,
                cast: false
            });
            g.add(fl);
        }
    }
    const mirror = createOvalMirror(mats, 1.3, 1.85);
    mirror.position.set(-depth / 2 - .035, y0 + bodyH + .96, 0);
    mirror.rotation.y = Math.PI / 2;
    g.add(mirror);
    const lampGroup = new THREE.Group;
    const lampBase = lathe([ [ .001, 0 ], [ .12, .005 ], [ .16, .04 ], [ .12, .1 ], [ .06, .14 ], [ .045, .3 ], [ .06, .34 ], [ .03, .38 ], [ .001, .4 ] ], mats.ceramicOlive, {
        pos: [ 0, 0, 0 ],
        segments: 24,
        cast: true
    });
    lampGroup.add(lampBase);
    const shade = lathe([ [ .235, .38 ], [ .225, .405 ], [ .18, .52 ], [ .135, .585 ] ], mats.linenLight, {
        pos: [ 0, 0, 0 ],
        segments: 36,
        cast: false
    });
    shade.material = mats.linenLight.clone();
    shade.material.side = THREE.DoubleSide;
    shade.material.color = new THREE.Color(15193267);
    shade.material.emissive = new THREE.Color(16761461);
    shade.material.emissiveIntensity = .32;
    lampGroup.add(shade);
    lampGroup.add(mesh(new THREE.TorusGeometry(.235, .008, 5, 36), mats.brassAged, {
        pos: [ 0, .38, 0 ],
        rot: [ Math.PI / 2, 0, 0 ],
        receive: false
    }));
    lampGroup.add(mesh(new THREE.TorusGeometry(.135, .006, 5, 30), mats.brassAged, {
        pos: [ 0, .585, 0 ],
        rot: [ Math.PI / 2, 0, 0 ],
        receive: false
    }));
    const lampGlow = mesh(new THREE.SphereGeometry(.075, 14, 10), mats.lampGlow, {
        pos: [ 0, .47, 0 ],
        receive: false
    });
    lampGroup.add(lampGlow);
    lampGroup.scale.setScalar(.92);
    lampGroup.position.set(depth / 2 - .02, y0 + bodyH + .06, .45);
    g.add(lampGroup);
    for (const [cz, scale] of [ [ -.35, 1 ], [ 1.2, .85 ] ]) {
        const cg = new THREE.Group;
        cg.add(lathe([ [ .001, 0 ], [ .07, .005 ], [ .08, .02 ], [ .035, .035 ], [ .022, .24 ], [ .055, .26 ], [ .06, .29 ], [ .025, .31 ], [ .001, .31 ] ], mats.brass, {
            segments: 20,
            cast: true
        }));
        cg.add(cylinder(.022, .026, .24, mats.candle, {
            pos: [ 0, .44, 0 ],
            segments: 14
        }));
        cg.add(mesh(new THREE.SphereGeometry(.014, 8, 8), mats.flame, {
            pos: [ 0, .575, 0 ],
            receive: false,
            scale: [ 1, 1.7, 1 ]
        }));
        cg.position.set(depth / 2 - .1, y0 + bodyH + .06, cz);
        cg.scale.setScalar(scale);
        g.add(cg);
    }
    const stack = createBookStack(mats, {
        count: 4,
        position: [ .06, y0 + bodyH + .065, .4 ],
        rotation: Math.PI / 2 + .06,
        topObject: false
    });
    stack.scale.setScalar(.82);
    g.add(stack);
    const littleFrame = new THREE.Group;
    littleFrame.add(box(.24, .32, .025, mats.gold, {
        pos: [ 0, 0, 0 ],
        cast: true
    }));
    littleFrame.add(plane(.19, .27, mats.sketchB, {
        pos: [ 0, 0, .015 ],
        receive: false
    }));
    littleFrame.position.set(.08, y0 + bodyH + .2, .35);
    littleFrame.rotation.y = .2;
    littleFrame.rotation.x = -.1;
    g.add(littleFrame);
    const bust = new THREE.Group;
    bust.add(lathe([ [ .001, 0 ], [ .12, 0 ], [ .13, .02 ], [ .08, .06 ], [ .06, .08 ] ], mats.brassDark, {
        segments: 16,
        cast: true
    }));
    const shoulders = sphere(.13, mats.brassDark, {
        pos: [ 0, .17, 0 ],
        segments: 20,
        cast: true
    });
    shoulders.scale.set(1, .55, .55);
    bust.add(shoulders);
    const neck = cylinder(.045, .06, .1, mats.brassDark, {
        pos: [ 0, .27, 0 ],
        segments: 16
    });
    bust.add(neck);
    const head = sphere(.075, mats.brassDark, {
        pos: [ 0, .36, 0 ],
        segments: 20,
        cast: true
    });
    head.scale.set(.75, 1.05, .8);
    bust.add(head);
    const hair = sphere(.08, mats.brassDark, {
        pos: [ 0, .39, -.02 ],
        segments: 16
    });
    hair.scale.set(.78, .85, .75);
    bust.add(hair);
    bust.position.set(.05, y0 + bodyH + .06, 1.13);
    bust.rotation.y = -.5;
    g.add(bust);
    const bowl = createSmallBowl(mats, {});
    bowl.position.set(.1, y0 + bodyH + .06, -.5);
    bowl.scale.setScalar(.72);
    g.add(bowl);
    return {
        group: g,
        lampPosition: new THREE.Vector3(-4.1, y0 + bodyH + .7, -3.55)
    };
}

export function createBookcase(mats) {
    const g = new THREE.Group;
    g.name = "bookcase";
    g.position.set(4.36, 0, -1.35);
    const length = 4.7;
    const height = 4.45;
    const depth = .46;
    const carcassMat = mats.woodWalnut;
    const back = box(.035, height, length, mats.woodDark, {
        pos: [ depth / 2 - .02, height / 2, 0 ],
        cast: false
    });
    g.add(back);
    const top = box(depth + .09, .1, length + .12, carcassMat, {
        pos: [ .01, height - .04, 0 ],
        cast: true
    });
    g.add(top);
    const crown = box(depth + .14, .06, length + .2, mats.woodDark, {
        pos: [ 0, height + .01, 0 ],
        cast: true
    });
    g.add(crown);
    g.add(box(depth + .04, .12, length + .05, carcassMat, {
        pos: [ 0, .06, 0 ],
        cast: true
    }));
    for (const z of [ -length / 2, -length / 6, length / 6, length / 2 ]) {
        g.add(box(depth, height, .075, carcassMat, {
            pos: [ 0, height / 2, z ],
            cast: true
        }));
    }
    const shelfYs = [ .34, .96, 1.58, 2.2, 2.82, 3.44, 4.06 ];
    for (const y of shelfYs) {
        g.add(box(depth - .02, .045, length - .06, carcassMat, {
            pos: [ 0, y, 0 ],
            cast: true
        }));
    }
    for (const z of [ -length / 2 + .16, length / 2 - .16 ]) {
        const bracket = new THREE.CatmullRomCurve3([ new THREE.Vector3(.05, height - .12, z), new THREE.Vector3(-.2, height - .16, z), new THREE.Vector3(-.3, height - .36, z), new THREE.Vector3(-.26, height - .52, z) ]);
        g.add(mesh(new THREE.TubeGeometry(bracket, 18, .018, 5, false), mats.woodDark, {
            cast: true
        }));
    }
    const colors = bookPalette;
    const bookGeo = new THREE.BoxGeometry(1, 1, 1);
    const bookCount = 520;
    const bookMesh = new THREE.InstancedMesh(bookGeo, mats.book, bookCount);
    bookMesh.castShadow = true;
    bookMesh.receiveShadow = true;
    const dummy = new THREE.Object3D;
    const col = new THREE.Color;
    let count = 0;
    const bays = [ -length / 3, 0, length / 3 ];
    const baySpan = length / 3 - .12;
    for (let s = 0; s < shelfYs.length - 1; s++) {
        const baseY = shelfYs[s] + .025;
        for (let bay = 0; bay < 3; bay++) {
            let z = bays[bay] - baySpan / 2 + .03;
            const endZ = bays[bay] + baySpan / 2 - .03;
            let guard = 0;
            while (z < endZ - .04 && count < bookCount && guard++ < 200) {
                const w = rr(.042, .085);
                const h = rr(.23, .36);
                const d = rr(.2, .29);
                const gap = rnd() < .09 ? rr(.03, .12) : .004;
                z += w / 2 + gap;
                if (z > endZ) break;
                dummy.position.set(-.04 + (rnd() - .5) * .02, baseY + h / 2, z);
                let lean = 0;
                if (rnd() > .94) lean = (rnd() - .5) * .22;
                dummy.rotation.set(lean, 0, 0);
                dummy.scale.set(d, h, w);
                dummy.updateMatrix();
                bookMesh.setMatrixAt(count, dummy.matrix);
                col.set(colors[rnd() * colors.length | 0]);
                col.offsetHSL(0, (rnd() - .5) * .06, (rnd() - .5) * .08);
                bookMesh.setColorAt(count, col);
                count++;
                z += w / 2 + .006;
            }
        }
    }
    bookMesh.count = count;
    bookMesh.instanceMatrix.needsUpdate = true;
    if (bookMesh.instanceColor) bookMesh.instanceColor.needsUpdate = true;
    g.add(bookMesh);
    const stack1 = createBookStack(mats, {
        count: 4,
        position: [ -.02, .99, -1.25 ],
        rotation: Math.PI / 2 + .1,
        topObject: true
    });
    stack1.scale.setScalar(.72);
    g.add(stack1);
    const stack2 = createBookStack(mats, {
        count: 3,
        position: [ -.02, 2.23, 1.3 ],
        rotation: Math.PI / 2 - .1,
        topObject: false
    });
    stack2.scale.setScalar(.66);
    g.add(stack2);
    const vase = lathe([ [ .001, 0 ], [ .075, 0 ], [ .11, .06 ], [ .08, .16 ], [ .045, .24 ], [ .055, .29 ], [ .035, .31 ], [ .001, .3 ] ], mats.ceramicRose, {
        segments: 22,
        cast: true,
        pos: [ -.03, 2.84, -1.58 ]
    });
    g.add(vase);
    const vase2 = lathe([ [ .001, 0 ], [ .075, 0 ], [ .1, .05 ], [ .06, .13 ], [ .038, .23 ], [ .05, .27 ], [ .001, .25 ] ], mats.ceramicCream, {
        segments: 22,
        cast: true,
        pos: [ -.07, 3.47, 1.7 ]
    });
    g.add(vase2);
    const figure = new THREE.Group;
    figure.add(sphere(.055, mats.brassDark, {
        pos: [ 0, .33, 0 ],
        segments: 16,
        cast: true
    }));
    figure.add(cylinder(.03, .06, .26, mats.brassDark, {
        pos: [ 0, .15, 0 ],
        segments: 12
    }));
    figure.add(box(.16, .04, .11, mats.brassDark, {
        pos: [ 0, .015, 0 ],
        segments: 12
    }));
    figure.position.set(-.03, 1.61, 0);
    g.add(figure);
    return g;
}

function createFoldedThrow(mats, w = .8, h = .9) {
    const geo = new THREE.PlaneGeometry(w, h, 16, 18);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i);
        const z = Math.sin(x * 13 + y * 4) * .012 + Math.cos(y * 15) * .01;
        p.setZ(i, z);
    }
    geo.computeVertexNormals();
    return mesh(geo, mats.throw, {
        cast: true,
        receive: true
    });
}

export function createArmchair(mats) {
    const g = new THREE.Group;
    g.name = "armchair";
    g.position.set(2.44, 0, -2.8);
    g.rotation.y = -.86;
    const fabric = mats.velvetBlue;
    const seatFabric = mats.armchairFabric || mats.velvetBlue;
    const wood = mats.woodDark;
    const piping = mats.velvetRustDark;
    const legProfile = [ [ .001, 0 ], [ .043, .004 ], [ .052, .026 ], [ .034, .075 ], [ .043, .14 ], [ .03, .22 ], [ .047, .28 ], [ .001, .3 ] ];
    for (const [x, z] of [ [ -.43, -.36 ], [ .43, -.36 ], [ -.43, .38 ], [ .43, .38 ] ]) {
        g.add(lathe(legProfile, wood, {
            pos: [ x, 0, z ],
            segments: 14,
            cast: true
        }));
        g.add(cylinder(.041, .047, .028, mats.brassAged, {
            pos: [ x, .014, z ],
            segments: 12
        }));
    }
    for (const z of [ -.38, .42 ]) {
        g.add(box(.94, .055, .05, wood, {
            pos: [ 0, .33, z ],
            cast: true
        }));
    }
    for (const x of [ -.46, .46 ]) {
        g.add(box(.05, .055, .82, wood, {
            pos: [ x, .33, .02 ],
            cast: true
        }));
    }
    g.add(mesh(softCushionGeo(.96, .2, .86, .065, .025), seatFabric, {
        pos: [ 0, .42, .02 ],
        cast: true,
        receive: true
    }));
    const seat = mesh(softCushionGeo(.88, .19, .76, .08, .05), seatFabric, {
        pos: [ 0, .57, .045 ],
        cast: true,
        receive: true
    });
    g.add(seat);
    const seatPipe = mesh(new THREE.TorusGeometry(.42, .007, 4, 52), piping, {
        pos: [ 0, .66, .045 ],
        rot: [ Math.PI / 2, 0, 0 ],
        receive: false
    });
    seatPipe.scale.z = .86;
    g.add(seatPipe);
    const back = mesh(softCushionGeo(.98, .68, .18, .09, .045), seatFabric, {
        pos: [ 0, .92, -.35 ],
        rot: [ -.13, 0, 0 ],
        cast: true,
        receive: true
    });
    g.add(back);
    const headRollPts = [];
    for (let i = 0; i <= 16; i++) {
        const t = i / 16;
        headRollPts.push([ -.45 + t * .9, 1.268 + Math.sin(t * Math.PI) * .012, -.378 - Math.sin(t * Math.PI) * .02 ]);
    }
    g.add(tube(headRollPts, .055, seatFabric, {
        segments: 32,
        radialSegments: 8,
        cast: true
    }));
    for (const sx of [ -1, 1 ]) {
        const stile = box(.055, .74, .09, wood, {
            pos: [ sx * .475, .88, -.35 ],
            rot: [ -.13, 0, 0 ],
            cast: true
        });
        g.add(stile);
        const finial = sphere(.047, wood, {
            pos: [ sx * .475, 1.245, -.4 ],
            segments: 14,
            cast: true
        });
        g.add(finial);
    }
    {
        const crestPts = [];
        for (let i = 0; i <= 16; i++) {
            const t = i / 16;
            crestPts.push(new THREE.Vector3(-.475 + t * .95, 1.235 + Math.sin(t * Math.PI) * .035, -.398 - Math.sin(t * Math.PI) * .018));
        }
        g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(crestPts), 36, .034, 6, false), wood, {
            cast: true
        }));
    }
    for (const sx of [ -1, 1 ]) {
        const armBody = mesh(softCushionGeo(.17, .32, .74, .07, .018), fabric, {
            pos: [ sx * .49, .6, .02 ],
            cast: true,
            receive: true
        });
        g.add(armBody);
        const armRoll = mesh(softCushionGeo(.18, .12, .68, .055, .02), fabric, {
            pos: [ sx * .49, .76, .005 ],
            cast: true
        });
        g.add(armRoll);
        const cap = box(.135, .032, .7, wood, {
            pos: [ sx * .49, .827, .005 ],
            rot: [ 0, 0, 0 ],
            cast: true
        });
        g.add(cap);
        const knop = lathe([ [ .001, 0 ], [ .035, 0 ], [ .042, .022 ], [ .025, .05 ], [ .033, .075 ], [ .001, .088 ] ], wood, {
            pos: [ sx * .49, .77, .36 ],
            segments: 12,
            cast: true
        });
        knop.rotation.x = Math.PI / 2;
        g.add(knop);
        for (let i = 0; i < 7; i++) {
            g.add(sphere(.012, mats.brassAged, {
                pos: [ sx * .575, .72, -.27 + i * .1 ],
                segments: 7
            }));
        }
    }
    const cushion = mesh(softCushionGeo(.48, .47, .155, .09, .05), mats.pillow.floral, {
        pos: [ .02, .82, -.17 ],
        rot: [ -.2, .1, .06 ],
        cast: true
    });
    g.add(cushion);
    const smallCushion = mesh(softCushionGeo(.38, .36, .14, .075, .04), mats.pillow.kilim, {
        pos: [ -.25, .78, -.25 ],
        rot: [ -.24, -.14, -.1 ],
        cast: true
    });
    g.add(smallCushion);
    {
        const clothGeo = new THREE.PlaneGeometry(.6, 1.15, 16, 24);
        const pos = clothGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const u = pos.getX(i) / .6 + .5;
            const v = .5 - pos.getY(i) / 1.15;
            const fold = Math.sin(v * 12 + u * 2) * .018 + Math.sin(u * 9) * .014;
            const x = -.62 + u * .64 + Math.sin(v * 4.6) * .035;
            const z = -.34 + v * .68;
            const y = 1.2 - v * .07 + fold - THREE.MathUtils.smoothstep(v, .58, 1) * .54;
            pos.setXYZ(i, x, y, z);
        }
        clothGeo.computeVertexNormals();
        const throwMesh = mesh(clothGeo, mats.woolTeal, {
            cast: true
        });
        throwMesh.material = mats.woolTeal.clone();
        throwMesh.material.side = THREE.DoubleSide;
        g.add(throwMesh);
        for (let i = 0; i < 7; i++) {
            g.add(tube([ [ -.6 + i * .095, .6, .33 + Math.abs(i - 3) * .006 ], [ -.6 + i * .095, .57, .345 + Math.abs(i - 3) * .006 ] ], .003, mats.flowerCream, {
                segments: 4,
                radialSegments: 3,
                receive: false
            }));
        }
    }
    const book = createBook(.28, .045, .2, mats, {
        color: 3557956,
        gilt: true
    });
    book.position.set(.3, .7, .22);
    book.rotation.set(0, .6, -.05);
    g.add(book);
    return g;
}

export function createForegroundLibraryTable(mats) {
    const g = new THREE.Group;
    g.name = "foregroundLibraryTable";
    g.position.set(-.22, 0, 2.5);
    g.rotation.y = -.22;
    g.scale.setScalar(.9);
    const topMat = mats.woodWalnut.clone();
    topMat.color = new THREE.Color(7293489);
    topMat.roughness = .55;
    const legMat = mats.woodDark;
    const topGeo = new THREE.LatheGeometry([ new THREE.Vector2(.001, .6), new THREE.Vector2(.55, .598), new THREE.Vector2(.575, .585), new THREE.Vector2(.55, .565), new THREE.Vector2(.48, .552), new THREE.Vector2(.001, .548) ], 36);
    const column = new THREE.LatheGeometry([ new THREE.Vector2(.001, .03), new THREE.Vector2(.11, .02), new THREE.Vector2(.14, .06), new THREE.Vector2(.06, .13), new THREE.Vector2(.052, .3), new THREE.Vector2(.075, .34), new THREE.Vector2(.05, .43), new THREE.Vector2(.08, .5), new THREE.Vector2(.001, .56) ], 14);
    const parts = [ topGeo, column ];
    for (let i = 0; i < 3; i++) {
        const a = i / 3 * TAU + .6;
        const footGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([ new THREE.Vector3(0, .1, 0), new THREE.Vector3(Math.cos(a) * .2, .045, Math.sin(a) * .2), new THREE.Vector3(Math.cos(a) * .44, .035, Math.sin(a) * .44) ]), 8, .035, 6, false);
        parts.push(footGeo);
    }
    const wood = mesh(mergeGeometries(parts, false), topMat, {
        cast: true,
        receive: true
    });
    g.add(wood);
    const b1 = mesh(new THREE.BoxGeometry(.5, .07, .36), mats.leatherBlue, {
        pos: [ -.02, .69, 0 ],
        cast: true
    });
    b1.rotation.y = .28;
    g.add(b1);
    const b2 = mesh(new THREE.BoxGeometry(.44, .055, .31), mats.leatherTan, {
        pos: [ .01, .75, .02 ],
        cast: true
    });
    b2.rotation.y = -.1;
    b2.rotation.z = -.02;
    g.add(b2);
    const pages = mesh(new THREE.BoxGeometry(.46, .045, .33), mats.paper, {
        pos: [ .012, .752, .018 ],
        receive: false
    });
    pages.rotation.y = -.1;
    g.add(pages);
    const small = mesh(new THREE.BoxGeometry(.26, .04, .19), mats.leatherRed, {
        pos: [ .22, .8, .15 ],
        cast: true
    });
    small.rotation.y = .6;
    g.add(small);
    const bowlGeo = new THREE.LatheGeometry([ new THREE.Vector2(.001, 0), new THREE.Vector2(.11, .004), new THREE.Vector2(.16, .035), new THREE.Vector2(.175, .08), new THREE.Vector2(.15, .095), new THREE.Vector2(.13, .07), new THREE.Vector2(.11, .05), new THREE.Vector2(.001, .02) ], 24);
    const bowl = mesh(bowlGeo, mats.brassAged, {
        pos: [ .12, .76, -.12 ],
        cast: true
    });
    g.add(bowl);
    for (const [x, z] of [ [ .08, -.14 ], [ .15, -.1 ] ]) {
        g.add(mesh(new THREE.SphereGeometry(.045, 10, 8), mats.flowerPeach, {
            pos: [ x, .8, z ],
            segments: 10,
            cast: true
        }));
    }
    return g;
}

export function createPouf(mats) {
    const g = new THREE.Group;
    g.name = "pouf";
    g.position.set(.32, 0, -.02);
    g.rotation.y = -.38;
    const fabric = mats.pillow.kilim.clone();
    fabric.bumpScale = .035;
    const pouf = roundedBox(1.22, .35, .97, .17, fabric, {
        pos: [ 0, .2, 0 ],
        cast: true,
        segments: 5
    });
    g.add(pouf);
    const crown = roundedBox(1.08, .09, .84, .11, fabric, {
        pos: [ 0, .36, 0 ],
        cast: true,
        segments: 3
    });
    g.add(crown);
    const pipe = mesh(new THREE.TorusGeometry(.6, .012, 6, 64), mats.flowerCream, {
        pos: [ 0, .33, 0 ],
        rot: [ Math.PI / 2, 0, 0 ],
        scale: [ 1.02, .81, 1 ],
        cast: true
    });
    g.add(pipe);
    const tuft = sphere(.052, mats.flowerCream, {
        pos: [ 0, .405, 0 ],
        segments: 16
    });
    tuft.scale.y = .52;
    g.add(tuft);
    for (let i = 0; i < 4; i++) {
        const a = i / 4 * TAU + Math.PI / 4;
        const tx = Math.cos(a) * .54;
        const tz = Math.sin(a) * .44;
        g.add(cylinder(.018, .02, .09, mats.brassAged, {
            pos: [ tx, .13, tz ],
            segments: 8,
            cast: false
        }));
        const tassel = mesh(new THREE.ConeGeometry(.035, .15, 8), mats.flowerCream, {
            pos: [ tx, .06, tz ],
            receive: false
        });
        g.add(tassel);
    }
    const b = createBook(.38, .055, .28, mats, {
        color: 3623761,
        gilt: false
    });
    b.position.set(-.12, .44, .03);
    b.rotation.y = .55;
    g.add(b);
    const cup = lathe([ [ .001, 0 ], [ .04, .002 ], [ .045, .02 ], [ .04, .09 ], [ .03, .11 ], [ .001, .1 ] ], mats.ceramicRose, {
        pos: [ .35, .44, .16 ],
        segments: 16,
        cast: true
    });
    g.add(cup);
    return g;
}

export function createSideTable(mats) {
    const g = new THREE.Group;
    g.name = "roundSideTable";
    g.position.set(3.18, 0, -.55);
    const topGeo = new THREE.LatheGeometry([ new THREE.Vector2(.001, .54), new THREE.Vector2(.4, .54), new THREE.Vector2(.5, .52), new THREE.Vector2(.52, .5), new THREE.Vector2(.5, .48), new THREE.Vector2(.001, .48) ], 40);
    g.add(mesh(topGeo, mats.woodWalnut, {
        cast: true
    }));
    const column = lathe([ [ .001, 0 ], [ .13, 0 ], [ .16, .04 ], [ .08, .1 ], [ .06, .22 ], [ .08, .3 ], [ .06, .42 ], [ .1, .46 ], [ .001, .48 ] ], mats.woodDark, {
        segments: 16,
        cast: true
    });
    g.add(column);
    const stack = createBookStack(mats, {
        count: 4,
        position: [ 0, .54, 0 ],
        rotation: .4,
        topObject: true
    });
    stack.scale.setScalar(.72);
    g.add(stack);
    const bowl = createSmallBowl(mats, {});
    bowl.position.set(.21, .78, -.05);
    bowl.scale.setScalar(.55);
    g.add(bowl);
    return g;
}

export function createFloorLamp(mats) {
    const g = new THREE.Group;
    g.name = "archedBrassLamp";
    g.position.set(-3.22, 0, -3.62);
    g.add(lathe([ [ .001, 0 ], [ .24, 0 ], [ .29, .02 ], [ .28, .06 ], [ .18, .08 ], [ .12, .09 ], [ .06, .11 ], [ .04, .18 ], [ .001, .18 ] ], mats.brassDark, {
        segments: 32,
        cast: true
    }));
    const pts = [ [ 0, .16, 0 ], [ .03, .5, .03 ], [ -.04, 1.4, .02 ], [ -.08, 2.4, -.02 ], [ -.1, 2.92, -.05 ], [ .22, 3.18, -.03 ], [ .7, 3.22, .02 ], [ 1.12, 3.04, .06 ] ];
    g.add(tube(pts, .022, mats.brass, {
        segments: 120,
        radialSegments: 7,
        cast: true
    }));
    const collar = cylinder(.045, .05, .08, mats.brassAged, {
        pos: [ -.1, 2.9, -.05 ],
        segments: 16,
        cast: true
    });
    g.add(collar);
    const shadeGroup = new THREE.Group;
    shadeGroup.position.set(1.12, 2.97, .06);
    const shadeProfile = [ [ .001, .005 ], [ .075, 0 ], [ .12, -.02 ], [ .19, -.1 ], [ .23, -.19 ], [ .235, -.205 ] ];
    const shade = lathe(shadeProfile, mats.lampShadeOuter, {
        segments: 36,
        cast: true
    });
    shadeGroup.add(shade);
    const inner = lathe(shadeProfile.map(([x, y]) => [ x * .97, y - .003 ]), mats.lampShadeInner, {
        segments: 36,
        cast: false
    });
    inner.material = mats.lampShadeInner.clone();
    inner.material.side = THREE.BackSide;
    shadeGroup.add(inner);
    const rim = mesh(new THREE.TorusGeometry(.236, .009, 5, 40), mats.brass, {
        pos: [ 0, -.205, 0 ],
        rot: [ Math.PI / 2, 0, 0 ],
        cast: true
    });
    shadeGroup.add(rim);
    const bulb = mesh(new THREE.SphereGeometry(.065, 14, 10), mats.lampGlow, {
        pos: [ 0, -.14, 0 ],
        receive: false
    });
    shadeGroup.add(bulb);
    shadeGroup.scale.setScalar(1.16);
    g.add(shadeGroup);
    return {
        group: g,
        shadePosition: new THREE.Vector3(-3.22 + 1.12, 2.9, -3.62 + .06),
        bulb: bulb,
        shadeGroup: shadeGroup
    };
}

export function createStackOfBooksOnFloor(mats, options = {}) {
    const {position: position = [ 0, 0, 0 ], rotation: rotation = 0, count: count = 6, scale: scale = 1} = options;
    const g = createBookStack(mats, {
        count: count,
        position: position,
        rotation: rotation,
        topObject: true
    });
    g.scale.setScalar(scale);
    return g;
}

export function createPianoStoolSeat(mats) {
    const g = new THREE.Group;
    g.position.set(3.45, 0, -3.6);
    const seat = lathe([ [ .001, .42 ], [ .24, .42 ], [ .3, .4 ], [ .32, .38 ], [ .28, .35 ], [ .001, .35 ] ], mats.leatherTan, {
        segments: 28,
        cast: true
    });
    g.add(seat);
    for (let i = 0; i < 3; i++) {
        const a = i / 3 * TAU;
        g.add(cylinder(.012, .016, .36, mats.brass, {
            pos: [ Math.cos(a) * .19, .18, Math.sin(a) * .19 ],
            rot: [ Math.sin(a) * .1, 0, -Math.cos(a) * .1 ],
            segments: 8,
            cast: true
        }));
    }
    return g;
}

export function createRugsideCushion(mats) {
    const g = new THREE.Group;
    g.position.set(-2.8, .01, .2);
    g.rotation.y = .3;
    const geo = new THREE.LatheGeometry([ new THREE.Vector2(.001, 0), new THREE.Vector2(.3, .01), new THREE.Vector2(.39, .08), new THREE.Vector2(.35, .15), new THREE.Vector2(.001, .17) ], 32);
    const cushion = mesh(geo, mats.pillow.wine, {
        cast: true
    });
    cushion.scale.z = .72;
    g.add(cushion);
    return g;
}
