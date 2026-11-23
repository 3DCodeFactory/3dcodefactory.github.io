import * as THREE from "three";

import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export const TAU = Math.PI * 2;

export const ROOM = {
    width: 9.4,
    depth: 12,
    height: 5.5,
    left: -4.7,
    right: 4.7,
    back: -6.25,
    front: 5.75,
    window: {
        x: .55,
        width: 5,
        sill: .26,
        spring: 2.75,
        top: 5.25
    }
};

export const lerp = (a, b, t) => a + (b - a) * t;

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export const smoothstep = (a, b, x) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
};

export const easeInOut = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

export function mesh(geometry, material, options = {}) {
    const m = new THREE.Mesh(geometry, material);
    if (options.pos) m.position.set(...options.pos);
    if (options.rot) m.rotation.set(...options.rot);
    if (options.scale) m.scale.set(...options.scale);
    m.castShadow = !!options.cast;
    m.receiveShadow = options.receive !== false;
    if (options.name) m.name = options.name;
    if (options.renderOrder !== undefined) m.renderOrder = options.renderOrder;
    return m;
}

export function box(w, h, d, material, options = {}) {
    return mesh(new THREE.BoxGeometry(w, h, d), material, options);
}

export function roundedBox(w, h, d, radius, material, options = {}) {
    const seg = options.segments ?? 3;
    return mesh(new RoundedBoxGeometry(w, h, d, seg, radius), material, options);
}

export function cylinder(rt, rb, h, material, options = {}) {
    const seg = options.segments ?? 24;
    return mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, !!options.open), material, options);
}

export function sphere(r, material, options = {}) {
    const seg = options.segments ?? 32;
    return mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg / 2)), material, options);
}

export function tube(points, radius, material, options = {}) {
    const curve = options.curve instanceof THREE.Curve ? options.curve : new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), !!options.closed, options.type || "catmullrom", options.tension ?? .35);
    const geo = new THREE.TubeGeometry(curve, options.segments ?? 72, radius, options.radialSegments ?? 7, !!options.closed);
    return mesh(geo, material, options);
}

export function archShape({width: width = 4.6, base: base = 0, spring: spring = 3.05, top: top = 5.25, cx: cx = 0}) {
    const r = width * .5;
    const springY = Math.min(spring, top - r);
    const shape = new THREE.Shape;
    shape.moveTo(cx - r, base);
    shape.lineTo(cx + r, base);
    shape.lineTo(cx + r, springY);
    shape.absarc(cx, springY, r, 0, Math.PI, false);
    shape.lineTo(cx - r, base);
    shape.closePath();
    return shape;
}

export function archHole({width: width = 4.6, base: base = 0, spring: spring = 3.05, top: top = 5.25, cx: cx = 0}) {
    const r = width * .5;
    const springY = Math.min(spring, top - r);
    const path = new THREE.Path;
    path.moveTo(cx - r, base);
    path.lineTo(cx - r, springY);
    path.absarc(cx, springY, r, Math.PI, 0, true);
    path.lineTo(cx + r, base);
    path.closePath();
    return path;
}

export function normalizeShapeUV(geometry, width, height, offsetX = 0, offsetY = 0) {
    const pos = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
        uv.setXY(i, (pos.getX(i) - offsetX) / width, (pos.getY(i) - offsetY) / height);
    }
    uv.needsUpdate = true;
    return geometry;
}

export function roundedRectShape(w, h, r, cx = 0, cy = 0) {
    const s = new THREE.Shape;
    const x = cx - w / 2, y = cy - h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    return s;
}

export function plane(w, h, material, options = {}) {
    return mesh(new THREE.PlaneGeometry(w, h), material, options);
}

export function lathe(profile, material, options = {}) {
    const pts = profile.map(([x, y]) => new THREE.Vector2(Math.max(1e-4, x), y));
    return mesh(new THREE.LatheGeometry(pts, options.segments ?? 32), material, options);
}

export function setShadows(root, cast = true, receive = true) {
    root.traverse(o => {
        if (o.isMesh) {
            o.castShadow = cast;
            o.receiveShadow = receive;
        }
    });
    return root;
}

export function groupAt(x, y, z, rotationY = 0) {
    const g = new THREE.Group;
    g.position.set(x, y, z);
    g.rotation.y = rotationY;
    return g;
}

export function colorVariation(colors, rnd) {
    return colors[Math.floor(rnd() * colors.length)];
}

export function makeGlowTexture(color = "#ffdf9e", softness = .65) {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, color);
    g.addColorStop(softness, color.replace("rgb", "rgba").replace(")", ",0.18)"));
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

export function radialGlowMaterial(color = 16768416, opacity = .7) {
    const tex = makeGlowTexture("#ffdda0");
    return new THREE.SpriteMaterial({
        map: tex,
        color: color,
        transparent: true,
        opacity: opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
    });
}

export function textTexture(text, options = {}) {
    const {width: width = 1024, height: height = 256, color: color = "#3b2a1c", background: background = "rgba(0,0,0,0)", font: font = "italic 80px Georgia, serif", align: align = "center"} = options;
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, width, height);
    if (background !== "transparent") {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width, height);
    }
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    const lines = String(text).split("\n");
    const lh = height / (lines.length + 1);
    lines.forEach((line, i) => ctx.fillText(line, width / 2, lh * (i + 1)));
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
}

export function cloneTextureWithRepeat(tex, repeatX, repeatY) {
    const t = tex.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeatX, repeatY);
    t.needsUpdate = true;
    return t;
}

export function bezierPoints(p0, p1, p2, p3, n = 24) {
    const out = [];
    for (let i = 0; i <= n; i++) {
        const t = i / n;
        const u = 1 - t;
        out.push(new THREE.Vector3(u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1], u * u * u * p0[2] + 3 * u * u * t * p1[2] + 3 * u * t * t * p2[2] + t * t * t * p3[2]));
    }
    return out;
}

export function ellipseTubeCurve(rx, ry, y = 0, cx = 0, cz = 0, segments = 80) {
    const pts = [];
    for (let i = 0; i < segments; i++) {
        const a = i / segments * TAU;
        pts.push(new THREE.Vector3(cx + Math.cos(a) * rx, y + Math.sin(a) * ry, cz));
    }
    return new THREE.CatmullRomCurve3(pts, true);
}

export function randomAround(rnd, spread = 1) {
    return (rnd() * 2 - 1) * spread;
}
