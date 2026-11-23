import * as THREE from "three";

export const TAU = Math.PI * 2;

export const UP = new THREE.Vector3(0, 1, 0);

export function rng(seed = 1) {
    let a = seed >>> 0;
    return () => {
        a |= 0;
        a = a + 1831565813 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

export function lerp(a, b, t) {
    return a + (b - a) * t;
}

export function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
}

export function damp(current, target, lambda, dt) {
    return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

export function smoothstep(a, b, x) {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
}

export function pointedArchShape(width, springHeight, apexHeight, baseY = 0) {
    const half = width * .5;
    const rise = apexHeight - springHeight;
    const c = (rise * rise - half * half) / width;
    const R = half + c;
    const apexAngle = Math.atan2(rise, c);
    const s = new THREE.Shape;
    s.moveTo(-half, baseY);
    s.lineTo(-half, baseY + springHeight);
    s.absarc(c, baseY + springHeight, R, Math.PI, Math.PI - apexAngle, true);
    s.absarc(-c, baseY + springHeight, R, apexAngle, 0, true);
    s.lineTo(half, baseY);
    s.closePath();
    return s;
}

export function archBandShape(width, springHeight, apexHeight, baseY, border) {
    const outer = pointedArchShape(width + border * 2, springHeight + border, apexHeight + border, baseY - border);
    const inner = pointedArchShape(width, springHeight, apexHeight, baseY);
    outer.holes.push(new THREE.Path(inner.getPoints(64)));
    return outer;
}

export function wallWithArchHoles(width, height, holes, depth = .8, uvRepeat = [ 4, 4.5 ]) {
    const shape = new THREE.Shape;
    shape.moveTo(-width / 2, 0);
    shape.lineTo(width / 2, 0);
    shape.lineTo(width / 2, height);
    shape.lineTo(-width / 2, height);
    shape.closePath();
    for (const h of holes) {
        shape.holes.push(new THREE.Path(h.getPoints(72)));
    }
    const geo = new THREE.ExtrudeGeometry(shape, {
        depth: depth,
        bevelEnabled: false,
        curveSegments: 48
    });
    geo.translate(0, 0, -depth);
    const pos = geo.attributes.position;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
        uv[i * 2] = (pos.getX(i) / width + .5) * uvRepeat[0];
        uv[i * 2 + 1] = pos.getY(i) / height * uvRepeat[1];
    }
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    geo.computeVertexNormals();
    return geo;
}

export function cylinderBetween(a, b, r, material, radialSegments = 10, rTop = r) {
    const start = new THREE.Vector3(...Array.isArray(a) ? a : a.toArray());
    const end = new THREE.Vector3(...Array.isArray(b) ? b : b.toArray());
    const dir = (new THREE.Vector3).subVectors(end, start);
    const len = dir.length();
    const geo = new THREE.CylinderGeometry(rTop, r, len, radialSegments, 1);
    const m = new THREE.Mesh(geo, material);
    m.position.copy(start).addScaledVector(dir, .5);
    m.quaternion.setFromUnitVectors(UP, dir.normalize());
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
}

export function pipeThrough(points, radius, material, tubularSegments = 64, radialSegments = 10) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => Array.isArray(p) ? new THREE.Vector3(...p) : p.clone()), false, "centripetal", .45);
    const geo = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false);
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

export function curveFrom(points) {
    return new THREE.CatmullRomCurve3(points.map(p => Array.isArray(p) ? new THREE.Vector3(...p) : p.clone()), false, "centripetal", .3);
}

export function mesh(geo, mat, {cast: cast = true, receive: receive = true} = {}) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = cast;
    m.receiveShadow = receive;
    return m;
}

export function box(w, h, d, mat, x = 0, y = 0, z = 0) {
    const m = mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    return m;
}

export function cylinder(rTop, rBot, h, mat, x = 0, y = 0, z = 0, seg = 24) {
    const m = mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
    m.position.set(x, y, z);
    return m;
}

export function sphere(r, mat, x = 0, y = 0, z = 0, seg = 20) {
    const m = mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg * .6 | 0)), mat);
    m.position.set(x, y, z);
    return m;
}

export function torus(r, tube, mat, x = 0, y = 0, z = 0, radial = 12, tubular = 48) {
    const m = mesh(new THREE.TorusGeometry(r, tube, radial, tubular), mat);
    m.position.set(x, y, z);
    return m;
}

export function disc(r, mat, x = 0, y = 0, z = 0, seg = 32) {
    const m = mesh(new THREE.CircleGeometry(r, seg), mat, {
        cast: false
    });
    m.position.set(x, y, z);
    return m;
}

export function flange(radius, thickness, mat, position, axis = "y") {
    const g = new THREE.Group;
    const disk = mesh(new THREE.CylinderGeometry(radius, radius, thickness, 32), mat);
    g.add(disk);
    const ring = mesh(new THREE.TorusGeometry(radius * .82, thickness * .42, 8, 32), mat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = thickness * .35;
    g.add(ring);
    const boltMat = mat;
    const n = 8;
    for (let i = 0; i < n; i++) {
        const a = i / n * TAU;
        const b = mesh(new THREE.CylinderGeometry(radius * .035, radius * .035, thickness * 1.5, 6), boltMat);
        b.position.set(Math.cos(a) * radius * .94, 0, Math.sin(a) * radius * .94);
        g.add(b);
    }
    if (axis === "x") g.rotation.z = Math.PI / 2;
    if (axis === "z") g.rotation.x = Math.PI / 2;
    g.position.copy(position);
    return g;
}

export function handwheel(radius, material, {spokes: spokes = 7, rimTube: rimTube = .035, hubMat: hubMat = material} = {}) {
    const g = new THREE.Group;
    const rim = mesh(new THREE.TorusGeometry(radius, rimTube, 10, 72), material);
    g.add(rim);
    const innerRim = radius * .91;
    const hubR = Math.max(.055, radius * .12);
    const hub = mesh(new THREE.CylinderGeometry(hubR, hubR, rimTube * 2.4, 16), hubMat);
    hub.rotation.x = Math.PI / 2;
    g.add(hub);
    for (let i = 0; i < spokes; i++) {
        const a = i / spokes * TAU;
        const start = new THREE.Vector3(Math.cos(a) * hubR * .7, Math.sin(a) * hubR * .7, 0);
        const end = new THREE.Vector3(Math.cos(a) * innerRim, Math.sin(a) * innerRim, 0);
        const spoke = cylinderBetween(start, end, rimTube * .55, material, 8);
        g.add(spoke);
        const knob = sphere(rimTube * 1.35, hubMat, Math.cos(a) * innerRim, Math.sin(a) * innerRim, rimTube * .5, 8);
        g.add(knob);
    }
    const nut = mesh(new THREE.CylinderGeometry(hubR * 1.3, hubR * 1.3, rimTube * 1.4, 6), hubMat);
    nut.rotation.x = Math.PI / 2;
    nut.position.z = rimTube * 1.6;
    g.add(nut);
    g.traverse(o => {
        if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
        }
    });
    return g;
}

export function chainBetween(a, b, linkMat, links = 18, size = .06) {
    const start = new THREE.Vector3(...a);
    const end = new THREE.Vector3(...b);
    const dir = (new THREE.Vector3).subVectors(end, start);
    const len = dir.length();
    dir.normalize();
    const g = new THREE.Group;
    const q = (new THREE.Quaternion).setFromUnitVectors(UP, dir);
    for (let i = 0; i < links; i++) {
        const t = (i + .5) / links;
        const link = mesh(new THREE.TorusGeometry(size * (1 - t * .12), size * .22, 5, 12), linkMat);
        link.position.copy(start).addScaledVector(dir, len * t);
        link.quaternion.copy(q);
        link.rotateX(i % 2 ? Math.PI / 2 : 0);
        link.rotateY(i % 2 ? Math.PI / 2 : 0);
        g.add(link);
    }
    return g;
}

export function plateGirder(length, height, mat, {rivetMat: rivetMat = mat, endCaps: endCaps = true, depth: depth = .22} = {}) {
    const g = new THREE.Group;
    const flangeW = depth * 1.4;
    const top = box(length, height * .16, flangeW, mat, 0, height * .42, 0);
    const bottom = box(length, height * .16, flangeW, mat, 0, -height * .42, 0);
    const web = box(length, height * .7, depth * .36, mat, 0, 0, 0);
    g.add(top, bottom, web);
    if (endCaps) {
        g.add(box(depth * 1.1, height * 1.02, flangeW, mat, -length / 2 + depth * .55, 0, 0));
        g.add(box(depth * 1.1, height * 1.02, flangeW, mat, length / 2 - depth * .55, 0, 0));
    }
    const rivetGeo = new THREE.SphereGeometry(depth * .14, 8, 6);
    const count = Math.max(6, Math.floor(length / .55));
    const inst = new THREE.InstancedMesh(rivetGeo, rivetMat, count * 2);
    const m4 = new THREE.Matrix4;
    for (let i = 0; i < count; i++) {
        const x = -length / 2 + .3 + i / Math.max(1, count - 1) * (length - .6);
        m4.makeTranslation(x, height * .42, flangeW * .52);
        inst.setMatrixAt(i * 2, m4);
        m4.makeTranslation(x, -height * .42, flangeW * .52);
        inst.setMatrixAt(i * 2 + 1, m4);
    }
    g.add(inst);
    g.traverse(o => {
        if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
        }
    });
    return g;
}

export function clusteredPier(height, radius, materials) {
    const {stone: stone, stoneDark: stoneDark} = materials;
    const g = new THREE.Group;
    g.add(box(radius * 3.6, .28, radius * 3.6, stoneDark, 0, .14, 0));
    g.add(cylinder(radius * 1.38, radius * 1.55, .55, stoneDark, 0, .48, 0, 12));
    g.add(cylinder(radius * 1.22, radius * 1.3, .22, stone, 0, .86, 0, 12));
    const shaft = cylinder(radius * .76, radius * .92, height - 1.1, stone, 0, .95 + (height - 1.1) / 2, 0, 10);
    g.add(shaft);
    const cols = 4;
    for (let i = 0; i < cols; i++) {
        const a = i / cols * TAU + Math.PI / 4;
        const cr = radius * .34;
        const c = cylinder(cr, cr * 1.02, height - 1.4, stone, Math.cos(a) * radius * .82, .95 + (height - 1.4) / 2, Math.sin(a) * radius * .82, 8);
        g.add(c);
        const cap = cylinder(cr * 1.4, cr * 1.05, .22, stoneDark, Math.cos(a) * radius * .82, height - .35, Math.sin(a) * radius * .82, 8);
        g.add(cap);
        const base = cylinder(cr * 1.35, cr * 1.45, .2, stoneDark, Math.cos(a) * radius * .82, .93, Math.sin(a) * radius * .82, 8);
        g.add(base);
    }
    g.add(cylinder(radius * 1.15, radius * .92, .5, stoneDark, 0, height - .25, 0, 12));
    g.add(cylinder(radius * 1.34, radius * 1.2, .3, stone, 0, height + .15, 0, 12));
    g.add(box(radius * 3.2, .2, radius * 3.2, stoneDark, 0, height + .38, 0));
    for (const yy of [ 1.35, height * .48, height - 1.25 ]) {
        const band = mesh(new THREE.TorusGeometry(radius * .95, .028, 6, 24), materials.iron);
        band.rotation.x = Math.PI / 2;
        band.position.y = yy;
        g.add(band);
    }
    g.traverse(o => {
        if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
        }
    });
    return g;
}

export function archRibGeometry(span, springY, apexY, depth = .2, segments = 28) {
    const half = span / 2;
    const rise = apexY - springY;
    const c = (rise * rise - half * half) / span;
    const R = half + c;
    const apexAngle = Math.atan2(rise, c);
    const pts = [];
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const a = Math.PI - apexAngle * t;
        pts.push(new THREE.Vector3(Math.cos(a) * R + c, springY + Math.sin(a) * R, 0));
    }
    for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const a = apexAngle * (1 - t);
        pts.push(new THREE.Vector3(Math.cos(a) * R - c, springY + Math.sin(a) * R, 0));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    return new THREE.TubeGeometry(curve, segments * 2, depth, 8, false);
}

export function archCurvePoints(span, springY, apexY, segments = 28) {
    const half = span / 2;
    const rise = apexY - springY;
    const c = (rise * rise - half * half) / span;
    const R = half + c;
    const apexAngle = Math.atan2(rise, c);
    const left = [], right = [];
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const a = Math.PI - apexAngle * t;
        left.push(new THREE.Vector3(Math.cos(a) * R + c, springY + Math.sin(a) * R, 0));
    }
    for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const a = apexAngle * (1 - t);
        right.push(new THREE.Vector3(Math.cos(a) * R - c, springY + Math.sin(a) * R, 0));
    }
    return left.concat(right);
}

export function makeMistSprite(texture, size, opacity = .2, color = 12045266) {
    const mat = new THREE.SpriteMaterial({
        map: texture,
        color: color,
        transparent: true,
        opacity: opacity,
        depthWrite: false,
        blending: THREE.NormalBlending,
        toneMapped: false
    });
    const s = new THREE.Sprite(mat);
    s.scale.set(size, size * .58, 1);
    return s;
}

export function makeGlowSprite(texture, size = 1, color = 16764810, opacity = .8) {
    const mat = new THREE.SpriteMaterial({
        map: texture,
        color: color,
        transparent: true,
        opacity: opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: true
    });
    const s = new THREE.Sprite(mat);
    s.scale.set(size, size, 1);
    return s;
}

export function setShadows(object, cast = true, receive = true) {
    object.traverse(o => {
        if (o.isMesh) {
            o.castShadow = cast;
            o.receiveShadow = receive;
        }
    });
    return object;
}

export function canvasLabelTexture(text, opts = {}) {
    const W = opts.width || 512, H = opts.height || 256;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d");
    ctx.fillStyle = opts.bg || "#1c201d";
    ctx.fillRect(0, 0, W, H);
    if (opts.border !== false) {
        ctx.strokeStyle = opts.borderColor || "rgba(188,170,124,.45)";
        ctx.lineWidth = opts.borderWidth || 5;
        ctx.strokeRect(12, 12, W - 24, H - 24);
    }
    ctx.fillStyle = opts.ink || "rgba(220,207,172,.88)";
    ctx.textAlign = "center";
    ctx.font = opts.font || "600 42px Georgia, serif";
    const lines = String(text).split("\n");
    lines.forEach((line, i) => ctx.fillText(line, W / 2, H / 2 + (i - (lines.length - 1) / 2) * (opts.lineHeight || 54)));
    const r = rng(opts.seed || 19);
    for (let i = 0; i < 50; i++) {
        ctx.fillStyle = `rgba(9,9,8,${.02 + r() * .07})`;
        ctx.fillRect(r() * W, r() * H, 1 + r() * 7, 1 + r() * 3);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
}
