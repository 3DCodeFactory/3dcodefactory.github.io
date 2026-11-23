import * as THREE from "../vendor/three.module.js";

import { RoundedBoxGeometry } from "../vendor/addons/geometries/RoundedBoxGeometry.js";

import { WORLD } from "./textures.js";

const TAU = Math.PI * 2;

const SERIF = '"DejaVu Serif", "Liberation Serif", Georgia, serif';

const SANS = '"DejaVu Sans", "Liberation Sans", sans-serif';

const SANS_NARROW = '"Liberation Sans Narrow", "DejaVu Sans", sans-serif';

const Y_AXIS = new THREE.Vector3(0, 1, 0);

function mulberry32(seed) {
    let a = seed >>> 0;
    return function() {
        a |= 0;
        a = a + 1831565813 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

function box(parent, mat, w, h, d, x, y, z, opts = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    if (opts.rx) m.rotation.x = opts.rx;
    if (opts.ry) m.rotation.y = opts.ry;
    if (opts.rz) m.rotation.z = opts.rz;
    m.castShadow = opts.cast !== false;
    m.receiveShadow = opts.receive !== false;
    parent.add(m);
    return m;
}

function roundedBox(parent, mat, w, h, d, r, x, y, z, opts = {}) {
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, opts.segments ?? 4, r), mat);
    m.position.set(x, y, z);
    if (opts.rx) m.rotation.x = opts.rx;
    if (opts.ry) m.rotation.y = opts.ry;
    if (opts.rz) m.rotation.z = opts.rz;
    m.castShadow = opts.cast !== false;
    m.receiveShadow = opts.receive !== false;
    parent.add(m);
    return m;
}

function cyl(parent, mat, rt, rb, h, seg, x, y, z, opts = {}) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, !!opts.open), mat);
    m.position.set(x, y, z);
    if (opts.rx) m.rotation.x = opts.rx;
    if (opts.ry) m.rotation.y = opts.ry;
    if (opts.rz) m.rotation.z = opts.rz;
    m.castShadow = opts.cast !== false;
    m.receiveShadow = opts.receive !== false;
    parent.add(m);
    return m;
}

function plane(parent, mat, w, h, x, y, z, opts = {}) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h, opts.segW || 1, opts.segH || 1), mat);
    m.position.set(x, y, z);
    if (opts.rx) m.rotation.x = opts.rx;
    if (opts.ry) m.rotation.y = opts.ry;
    if (opts.rz) m.rotation.z = opts.rz;
    m.castShadow = opts.cast === true;
    m.receiveShadow = opts.receive !== false;
    parent.add(m);
    return m;
}

function cylinderBetween(parent, mat, a, b, radius, seg = 8) {
    const dir = (new THREE.Vector3).subVectors(b, a);
    const len = dir.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, seg), mat);
    m.position.copy(a).addScaledVector(dir, .5);
    m.quaternion.setFromUnitVectors(Y_AXIS, dir.normalize());
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
}

function makeLocalCanvas(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return {
        canvas: c,
        ctx: c.getContext("2d")
    };
}

function localTexture(canvas, srgb = true) {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 8;
    t.needsUpdate = true;
    return t;
}

let _glowTexture = null;

function glowTexture() {
    if (_glowTexture) return _glowTexture;
    const {canvas: canvas, ctx: ctx} = makeLocalCanvas(256, 256);
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(.08, "rgba(255,255,255,.9)");
    g.addColorStop(.24, "rgba(255,255,255,.35)");
    g.addColorStop(.55, "rgba(255,255,255,.07)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    _glowTexture = localTexture(canvas);
    return _glowTexture;
}

function glow(parent, color, size, opacity, x, y, z) {
    const mat = new THREE.SpriteMaterial({
        map: glowTexture(),
        color: color,
        transparent: true,
        opacity: opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
    });
    const s = new THREE.Sprite(mat);
    s.position.set(x, y, z);
    s.scale.set(size, size, 1);
    s.renderOrder = 6;
    parent.add(s);
    return s;
}

let _shadowTexture = null;

function shadowTexture() {
    if (_shadowTexture) return _shadowTexture;
    const {canvas: canvas, ctx: ctx} = makeLocalCanvas(256, 256);
    const g = ctx.createRadialGradient(128, 128, 2, 128, 128, 128);
    g.addColorStop(0, "rgba(0,0,0,.9)");
    g.addColorStop(.5, "rgba(0,0,0,.48)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    _shadowTexture = localTexture(canvas);
    return _shadowTexture;
}

function contactShadow(parent, x, z, sx, sz, opacity = .4, rot = 0) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
        map: shadowTexture(),
        transparent: true,
        opacity: opacity,
        depthWrite: false,
        color: 0,
        blending: THREE.NormalBlending
    }));
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = rot;
    m.scale.set(sx, sz, 1);
    m.position.set(x, .028, z);
    m.renderOrder = 2;
    parent.add(m);
    return m;
}

function makeTextTexture(w, h, draw, srgb = true) {
    const {canvas: canvas, ctx: ctx} = makeLocalCanvas(w, h);
    draw(ctx, w, h);
    return localTexture(canvas, srgb);
}

function buildGround(root, tex, renderer) {
    const {ground: ground, sidewalkZ: sidewalkZ} = WORLD;
    const width = ground.xMax - ground.xMin;
    const sideMin = ground.zMin, sideMax = sidewalkZ;
    const asphMin = sidewalkZ, asphMax = ground.zMax;
    const sideDepth = sideMax - sideMin;
    const asphDepth = asphMax - asphMin;
    tex.ground.sidewalk.map.wrapS = THREE.ClampToEdgeWrapping;
    tex.ground.sidewalk.map.wrapT = THREE.ClampToEdgeWrapping;
    tex.ground.sidewalk.roughnessMap.wrapS = THREE.ClampToEdgeWrapping;
    tex.ground.sidewalk.roughnessMap.wrapT = THREE.ClampToEdgeWrapping;
    tex.ground.sidewalk.bumpMap.wrapS = THREE.ClampToEdgeWrapping;
    tex.ground.sidewalk.bumpMap.wrapT = THREE.ClampToEdgeWrapping;
    tex.ground.asphalt.map.wrapS = THREE.ClampToEdgeWrapping;
    tex.ground.asphalt.map.wrapT = THREE.ClampToEdgeWrapping;
    tex.ground.asphalt.roughnessMap.wrapS = THREE.ClampToEdgeWrapping;
    tex.ground.asphalt.roughnessMap.wrapT = THREE.ClampToEdgeWrapping;
    tex.ground.asphalt.bumpMap.wrapS = THREE.ClampToEdgeWrapping;
    tex.ground.asphalt.bumpMap.wrapT = THREE.ClampToEdgeWrapping;
    const sidewalkMat = new THREE.MeshPhysicalMaterial({
        map: tex.ground.sidewalk.map,
        roughnessMap: tex.ground.sidewalk.roughnessMap,
        bumpMap: tex.ground.sidewalk.bumpMap,
        bumpScale: .025,
        roughness: .92,
        metalness: .13,
        clearcoat: .75,
        clearcoatRoughness: .16,
        envMapIntensity: 1.25
    });
    const asphaltMat = new THREE.MeshPhysicalMaterial({
        map: tex.ground.asphalt.map,
        roughnessMap: tex.ground.asphalt.roughnessMap,
        bumpMap: tex.ground.asphalt.bumpMap,
        bumpScale: .018,
        roughness: 1,
        metalness: .22,
        clearcoat: .9,
        clearcoatRoughness: .09,
        envMapIntensity: 1.5
    });
    const sidewalk = new THREE.Mesh(new THREE.PlaneGeometry(width, sideDepth), sidewalkMat);
    sidewalk.rotation.x = -Math.PI / 2;
    sidewalk.position.set((ground.xMin + ground.xMax) / 2, .012, (sideMin + sideMax) / 2);
    sidewalk.receiveShadow = true;
    root.add(sidewalk);
    const asphalt = new THREE.Mesh(new THREE.PlaneGeometry(width, asphDepth), asphaltMat);
    asphalt.rotation.x = -Math.PI / 2;
    asphalt.position.set((ground.xMin + ground.xMax) / 2, .011, (asphMin + asphMax) / 2);
    asphalt.receiveShadow = true;
    root.add(asphalt);
    const gutterMat = new THREE.MeshPhysicalMaterial({
        color: 3423545,
        roughness: .3,
        metalness: .18,
        clearcoat: .8,
        clearcoatRoughness: .1,
        envMapIntensity: 1.25
    });
    const gutter = new THREE.Mesh(new THREE.PlaneGeometry(width, .18), gutterMat);
    gutter.rotation.x = -Math.PI / 2;
    gutter.position.set(0, .016, sidewalkZ);
    gutter.receiveShadow = true;
    root.add(gutter);
    const curbMat = new THREE.MeshStandardMaterial({
        color: 4081217,
        roughness: .5,
        metalness: .08
    });
    for (const [x0, x1] of [ [ -6.1, -3.1 ], [ 3.55, 6.2 ] ]) {
        const len = x1 - x0;
        const c = box(root, curbMat, len, .055, .19, (x0 + x1) / 2, .035, sidewalkZ, {
            cast: false
        });
        c.receiveShadow = true;
    }
    const drainMat = new THREE.MeshStandardMaterial({
        color: 2304552,
        roughness: .38,
        metalness: .8
    });
    const drain = new THREE.Group;
    drain.position.set(3.05, .025, 2.5);
    const cover = new THREE.Mesh(new THREE.BoxGeometry(.56, .025, .36), drainMat);
    cover.receiveShadow = true;
    drain.add(cover);
    for (let i = 0; i < 6; i++) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(.045, .012, .31), new THREE.MeshStandardMaterial({
            color: 593164,
            roughness: .6,
            metalness: .6
        }));
        b.position.set(-.22 + i * .088, .02, 0);
        drain.add(b);
    }
    root.add(drain);
    const leafMat = new THREE.MeshStandardMaterial({
        map: tex.leaf,
        transparent: true,
        roughness: .55,
        metalness: .05,
        alphaTest: .35,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    const rng = (() => {
        let s = 1734;
        return () => {
            s = s * 16807 % 2147483647;
            return (s - 1) / 2147483646;
        };
    })();
    for (let i = 0; i < 14; i++) {
        const l = new THREE.Mesh(new THREE.PlaneGeometry(.07 + rng() * .1, .09 + rng() * .13), leafMat);
        l.rotation.x = -Math.PI / 2;
        l.rotation.z = rng() * TAU;
        l.position.set(-3.4 + rng() * 5.8, .03, 2.1 + rng() * 3.4);
        l.renderOrder = 2;
        root.add(l);
    }
    const waterDark = new THREE.Mesh(new THREE.PlaneGeometry(width, ground.zMax - ground.zMin), new THREE.MeshBasicMaterial({
        color: 462866,
        alphaMap: tex.puddle.texture,
        transparent: true,
        opacity: .38,
        depthWrite: false
    }));
    waterDark.rotation.x = -Math.PI / 2;
    waterDark.position.set(0, .021, (ground.zMin + ground.zMax) / 2);
    waterDark.renderOrder = 3;
    root.add(waterDark);
    const spillTex = makeTextTexture(512, 256, (ctx, w, h) => {
        const g = ctx.createRadialGradient(w * .45, h * .25, 2, w * .45, h * .5, w * .55);
        g.addColorStop(0, "rgba(255,186,95,.34)");
        g.addColorStop(.4, "rgba(228,145,58,.12)");
        g.addColorStop(1, "rgba(218,130,50,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
    });
    const spill = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.6), new THREE.MeshBasicMaterial({
        map: spillTex,
        transparent: true,
        opacity: .55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
    }));
    spill.rotation.x = -Math.PI / 2;
    spill.rotation.z = Math.PI;
    spill.position.set(-2.55, .026, 1.95);
    spill.renderOrder = 4;
    root.add(spill);
    contactShadow(root, .68, .4, 1.5, .8, .4);
    contactShadow(root, -1.34, 1.23, 1.05, .9, .48);
    contactShadow(root, -2.56, 1.3, .9, .8, .32);
    return {
        sidewalkMat: sidewalkMat,
        asphaltMat: asphaltMat
    };
}

function createHotelTexture() {
    return makeTextTexture(512, 220, (ctx, w, h) => {
        ctx.fillStyle = "#111813";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "#c4b78f";
        ctx.lineWidth = 4;
        ctx.strokeRect(13, 13, w - 26, h - 26);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `700 118px ${SANS_NARROW}`;
        ctx.shadowColor = "rgba(255,187,94,.95)";
        ctx.shadowBlur = 28;
        ctx.fillStyle = "#ffe4ac";
        ctx.fillText("HOTEL", w / 2, h / 2 + 4);
        ctx.shadowBlur = 10;
        ctx.fillStyle = "rgba(255,244,210,.94)";
        ctx.font = `16px ${SERIF}`;
        ctx.fillText("R O O M S   ·   H O T   W A T E R", w / 2, h - 36);
    });
}

function buildFacades(root, tex, renderer) {
    const tileMat = new THREE.MeshPhysicalMaterial({
        map: tex.tiles.map,
        roughnessMap: tex.tiles.roughnessMap,
        bumpMap: tex.tiles.bumpMap,
        bumpScale: .005,
        roughness: .46,
        metalness: .06,
        clearcoat: .9,
        clearcoatRoughness: .08,
        envMapIntensity: 2
    });
    tex.tiles.map.repeat.set(4.5, 2.35);
    tex.tiles.roughnessMap.repeat.set(4.5, 2.35);
    tex.tiles.bumpMap.repeat.set(4.5, 2.35);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(10.4, 5.5), tileMat);
    wall.position.set(3.9, 2.75, WORLD.wallZ);
    wall.receiveShadow = true;
    wall.castShadow = true;
    root.add(wall);
    const skirtMat = new THREE.MeshPhysicalMaterial({
        color: 1055512,
        roughness: .34,
        metalness: .22,
        clearcoat: .45,
        clearcoatRoughness: .18
    });
    box(root, skirtMat, 10.4, .28, .09, 3.9, .14, WORLD.wallZ + .04);
    box(root, skirtMat, .12, 3.4, .13, -.96, 1.7, WORLD.wallZ + .03);
    box(root, skirtMat, 10.4, .08, .14, 3.9, 3.55, WORLD.wallZ + .04);
    const stoneMat = new THREE.MeshStandardMaterial({
        color: 2830636,
        roughness: .62,
        metalness: .06
    });
    box(root, stoneMat, 10.4, .26, .22, 3.9, 3.64, WORLD.wallZ + .06);
    box(root, stoneMat, 10.4, .16, .26, 3.9, 4.46, WORLD.wallZ + .08);
    const brickMat = new THREE.MeshStandardMaterial({
        map: tex.brick,
        roughness: .84,
        metalness: .02
    });
    tex.brick.repeat.set(2, 1.4);
    const upper = new THREE.Mesh(new THREE.PlaneGeometry(5.7, 3.6), brickMat);
    upper.position.set(-3.02, 4.02, -.6);
    upper.receiveShadow = true;
    root.add(upper);
    box(root, stoneMat, 5.7, .12, .18, -3.02, 2.98, -.53);
    const upperWinGroup = new THREE.Group;
    upperWinGroup.position.set(-2.05, 4.08, -.52);
    const winFrameMat = new THREE.MeshStandardMaterial({
        color: 3883064,
        roughness: .52,
        metalness: .2
    });
    const paneMat = new THREE.MeshPhysicalMaterial({
        color: 4282710,
        roughness: .22,
        metalness: .15,
        transparent: true,
        opacity: .52,
        clearcoat: .5,
        clearcoatRoughness: .12,
        envMapIntensity: 1.3
    });
    box(upperWinGroup, winFrameMat, 1.45, 1.72, .12, 0, 0, 0);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.27, 1.54), paneMat);
    pane.position.z = .071;
    upperWinGroup.add(pane);
    box(upperWinGroup, winFrameMat, .06, 1.54, .05, 0, 0, .1);
    box(upperWinGroup, winFrameMat, 1.27, .06, .05, 0, 0, .1);
    const warmCurtain = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 1.2), new THREE.MeshBasicMaterial({
        color: 10249267,
        transparent: true,
        opacity: .7,
        toneMapped: true
    }));
    warmCurtain.position.set(0, -.12, -.02);
    upperWinGroup.add(warmCurtain);
    const lace = new THREE.Mesh(new THREE.PlaneGeometry(.55, 1.1), new THREE.MeshBasicMaterial({
        color: 2826262,
        transparent: true,
        opacity: .45
    }));
    lace.position.set(-.3, -.17, 0);
    upperWinGroup.add(lace);
    box(upperWinGroup, winFrameMat, 1.58, .11, .2, 0, -.9, .04, {
        cast: false
    });
    glow(upperWinGroup, 16758125, 1.3, .12, 0, -.1, .15);
    root.add(upperWinGroup);
    const pipeMat = new THREE.MeshStandardMaterial({
        color: 2502701,
        roughness: .55,
        metalness: .48
    });
    const rustMat = new THREE.MeshStandardMaterial({
        color: 4797222,
        roughness: .82,
        metalness: .15
    });
    for (const [x, z, y0, y1, r] of [ [ -.88, -.54, .12, 3.8, .045 ], [ 3.88, -.52, .16, 4.9, .035 ], [ 4.22, -.51, 2.2, 4.9, .023 ] ]) {
        cyl(root, pipeMat, r, r, y1 - y0, 10, x, (y0 + y1) / 2, z);
        cyl(root, pipeMat, r * 1.45, r * 1.45, .05, 12, x, y0 + .15, z);
        cyl(root, rustMat, r * .8, r * .8, .018, 10, x, y0 + .09, z + .04);
    }
    for (const y of [ 1.1, 2.5, 3.6 ]) {
        box(root, pipeMat, .2, .025, .04, 3.88, y, -.57);
    }
    const meter = box(root, new THREE.MeshStandardMaterial({
        color: 5002576,
        roughness: .62,
        metalness: .36
    }), .38, .5, .13, -.53, 1.55, -.51);
    box(root, pipeMat, .035, 1.1, .035, -.54, 1, -.55);
    box(root, new THREE.MeshStandardMaterial({
        color: 1120021,
        roughness: .3,
        metalness: .6
    }), .25, .16, .012, -.53, 1.61, -.436);
    for (let i = 0; i < 3; i++) {
        cyl(root, rustMat, .012, .012, .035, 8, -.64 + i * .11, 1.66, -.43, {
            rx: Math.PI / 2
        });
    }
    const cableMat = new THREE.MeshStandardMaterial({
        color: 790800,
        roughness: .7,
        metalness: .1
    });
    const cableCurve = new THREE.CatmullRomCurve3([ new THREE.Vector3(-.9, 3.9, -.48), new THREE.Vector3(.9, 3.55, -.28), new THREE.Vector3(2.5, 3.62, -.42), new THREE.Vector3(4.4, 3.9, -.5) ]);
    const cable = new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 30, .012, 4, false), cableMat);
    cable.castShadow = false;
    root.add(cable);
    const backdrop = new THREE.Group;
    backdrop.position.set(-6.65, 0, -2.55);
    const blackBrick = new THREE.MeshStandardMaterial({
        color: 1447701,
        roughness: .92,
        metalness: .01
    });
    box(backdrop, blackBrick, 4.8, 7.8, .7, 0, 3.9, 0, {
        cast: false
    });
    const bgWinMat = new THREE.MeshBasicMaterial({
        color: 14918482,
        transparent: true,
        opacity: .55,
        toneMapped: true
    });
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 3; c++) {
            const lit = (r + c) % 3 === 0;
            const w = new THREE.Mesh(new THREE.PlaneGeometry(.52, .74), lit ? bgWinMat : new THREE.MeshBasicMaterial({
                color: 659472
            }));
            w.position.set(-1.65 + c * 1.35, 2.1 + r * 1.05, .356);
            backdrop.add(w);
            const frame = box(backdrop, new THREE.MeshStandardMaterial({
                color: 2631971,
                roughness: .9
            }), .62, .84, .05, -1.65 + c * 1.35, 2.1 + r * 1.05, .38, {
                cast: false
            });
            frame.receiveShadow = false;
        }
    }
    const hotelTex = createHotelTexture();
    const hotelMat = new THREE.MeshStandardMaterial({
        map: hotelTex,
        emissiveMap: hotelTex,
        emissive: 16764811,
        emissiveIntensity: 1.25,
        roughness: .5,
        transparent: true,
        toneMapped: true
    });
    const hotel = new THREE.Mesh(new THREE.PlaneGeometry(1.9, .82), hotelMat);
    hotel.position.set(0, 4.9, .37);
    backdrop.add(hotel);
    glow(backdrop, 16758127, 1.8, .17, 0, 4.9, .5);
    const shopDoor = new THREE.Mesh(new THREE.PlaneGeometry(.9, 1.65), new THREE.MeshBasicMaterial({
        color: 8279083,
        transparent: true,
        opacity: .45
    }));
    shopDoor.position.set(1.4, 1.2, .357);
    backdrop.add(shopDoor);
    root.add(backdrop);
    const fogTex = makeTextTexture(512, 256, (ctx, w, h) => {
        const g = ctx.createRadialGradient(w * .5, h * .58, 3, w * .5, h * .58, w * .5);
        g.addColorStop(0, "rgba(126,149,148,.18)");
        g.addColorStop(.5, "rgba(80,105,105,.08)");
        g.addColorStop(1, "rgba(10,20,22,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
    });
    const mist = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), new THREE.MeshBasicMaterial({
        map: fogTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    }));
    mist.position.set(-1.7, 1.6, -6.5);
    root.add(mist);
    return {
        tileMat: tileMat
    };
}

function makeMagazine(tex, w, h, backingMat) {
    const g = new THREE.Group;
    const back = new THREE.Mesh(new THREE.BoxGeometry(w + .012, h + .012, .012), backingMat);
    back.castShadow = true;
    back.receiveShadow = true;
    g.add(back);
    const coverMat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: .8,
        metalness: .01
    });
    const cover = new THREE.Mesh(new THREE.PlaneGeometry(w, h), coverMat);
    cover.position.z = .0075;
    cover.castShadow = true;
    g.add(cover);
    return g;
}

function makeNewspaperSheet(tex, w, h, thinMat) {
    const coverMat = new THREE.MeshStandardMaterial({
        map: tex,
        color: 12695716,
        roughness: .95,
        metalness: .01,
        emissiveMap: tex,
        emissive: 2761755,
        emissiveIntensity: .34
    });
    const mats = [ thinMat, thinMat, thinMat, thinMat, coverMat, thinMat ];
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, .004, h), mats);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
}

function makeStack(root, texture, x, y, z, w = .46, d = .33, count = 9, rotation = 0, oldPaperMat) {
    const g = new THREE.Group;
    g.position.set(x, y, z);
    g.rotation.y = rotation;
    for (let i = 0; i < count; i++) {
        const sheet = new THREE.Mesh(new THREE.BoxGeometry(w + i % 3 * .008, .0035, d + i % 2 * .006), oldPaperMat);
        sheet.position.set((i % 2 ? 1 : -1) * .003 * i, i * .0037, (i % 3 - 1) * .0015 * i);
        sheet.rotation.y = (i % 4 - 1.5) * .008;
        sheet.castShadow = true;
        sheet.receiveShadow = true;
        g.add(sheet);
    }
    const topMats = [ oldPaperMat, oldPaperMat, new THREE.MeshStandardMaterial({
        map: texture,
        color: 12103837,
        roughness: .96,
        metalness: 0
    }), oldPaperMat, oldPaperMat, oldPaperMat ];
    const top = new THREE.Mesh(new THREE.BoxGeometry(w, .003, d), topMats);
    top.position.y = count * .0037 + .002;
    top.rotation.y = .016;
    top.castShadow = true;
    top.receiveShadow = true;
    g.add(top);
    root.add(g);
    return g;
}

function buildKiosk(root, tex) {
    const k = new THREE.Group;
    k.position.set(-2.65, 0, 0);
    root.add(k);
    const paintMat = new THREE.MeshPhysicalMaterial({
        map: tex.timber,
        color: 12040361,
        roughness: .56,
        metalness: .21,
        clearcoat: .36,
        clearcoatRoughness: .2,
        envMapIntensity: 1
    });
    const trimMat = new THREE.MeshStandardMaterial({
        color: 792596,
        roughness: .38,
        metalness: .3
    });
    const darkWoodMat = new THREE.MeshStandardMaterial({
        color: 2497812,
        roughness: .67,
        metalness: .03
    });
    const paperMat = new THREE.MeshStandardMaterial({
        color: 12169632,
        roughness: .98,
        metalness: 0
    });
    const agedPaperMat = new THREE.MeshStandardMaterial({
        color: 10721926,
        roughness: 1,
        metalness: 0
    });
    const interiorMap = tex.wood.side.clone();
    interiorMap.repeat.set(2.2, 1.8);
    interiorMap.wrapS = THREE.RepeatWrapping;
    interiorMap.wrapT = THREE.RepeatWrapping;
    interiorMap.needsUpdate = true;
    const interiorWood = new THREE.MeshStandardMaterial({
        map: interiorMap,
        color: 12163698,
        roughness: .82,
        metalness: .02
    });
    const shelfWood = new THREE.MeshStandardMaterial({
        color: 5192232,
        roughness: .68,
        metalness: .04
    });
    const brass = new THREE.MeshStandardMaterial({
        color: 9071160,
        roughness: .3,
        metalness: .82
    });
    const W = 3.4, H_BASE = 1.08, H_TOP = 2.56, FRONT = .64, BACK = -.56;
    const DEPTH = FRONT - BACK;
    const plinthMat = new THREE.MeshStandardMaterial({
        color: 1712157,
        roughness: .8,
        metalness: .04
    });
    box(k, plinthMat, W + .08, .08, DEPTH + .08, 0, .04, (FRONT + BACK) / 2, {
        cast: false
    });
    box(k, paintMat, W, H_BASE - .08, DEPTH, 0, (H_BASE + .08) / 2 - .04, (FRONT + BACK) / 2);
    box(k, trimMat, W + .06, .1, .07, 0, H_BASE - .03, FRONT + .035);
    box(k, trimMat, W + .04, .08, .07, 0, .13, FRONT + .045);
    for (const x of [ -W / 2 + .05, -W / 6, W / 6, W / 2 - .05 ]) {
        box(k, trimMat, .055, H_BASE - .2, .045, x, H_BASE * .5, FRONT + .055);
    }
    box(k, trimMat, W + .04, .05, .1, 0, .66, FRONT + .065);
    box(k, interiorWood, W - .16, H_TOP - H_BASE, .06, 0, (H_BASE + H_TOP) / 2, BACK + .03);
    box(k, interiorWood, .07, H_TOP - H_BASE, DEPTH - .08, -W / 2 + .1, (H_BASE + H_TOP) / 2, (FRONT + BACK) / 2);
    box(k, interiorWood, .07, H_TOP - H_BASE, DEPTH - .08, W / 2 - .1, (H_BASE + H_TOP) / 2, (FRONT + BACK) / 2);
    box(k, darkWoodMat, W - .16, .08, DEPTH - .06, 0, H_TOP - .04, (FRONT + BACK) / 2);
    box(k, darkWoodMat, W - .16, .07, DEPTH - .05, 0, H_BASE + .035, (FRONT + BACK) / 2);
    const stepMat = new THREE.MeshStandardMaterial({
        color: 3352090,
        roughness: .7,
        metalness: .04
    });
    box(k, stepMat, W - .25, .06, .33, 0, 1.15, .46);
    box(k, stepMat, W - .25, .06, .32, 0, 1.47, .32);
    box(k, stepMat, W - .25, .06, .3, 0, 1.79, .19);
    box(k, stepMat, W - .25, .045, .26, 0, 2.09, .07);
    for (const y of [ 1.37, 1.67, 1.97, 2.27 ]) {
        box(k, shelfWood, W - .3, .045, .24, 0, y, -.29);
    }
    for (const x of [ -1.16, -.58, 0, .58, 1.16 ]) {
        box(k, shelfWood, .035, 1.24, .21, x, 1.86, -.3);
    }
    const corkMat = new THREE.MeshStandardMaterial({
        color: 6178608,
        roughness: .96,
        metalness: 0
    });
    box(k, corkMat, 1.25, .65, .02, -.64, 2.19, -.435);
    const notePalette = [ 14076841, 13615521, 12101249, 14735035 ];
    for (let i = 0; i < 7; i++) {
        const noteMat = new THREE.MeshStandardMaterial({
            color: notePalette[i % notePalette.length],
            roughness: .92
        });
        const note = box(k, noteMat, .18 + Math.random() * .05, .21 + Math.random() * .05, .006, -1.05 + i % 4 * .25, 2.08 + Math.floor(i / 4) * .25, -.422);
        note.rotation.z = (i % 3 - 1) * .08;
        note.castShadow = false;
    }
    const shelfCovers = tex.magazines;
    for (let i = 0; i < 10; i++) {
        const mw = .22 + i % 3 * .015;
        const mh = mw * 1.32;
        const mag = makeMagazine(shelfCovers[(i + 2) % shelfCovers.length], mw, mh, agedPaperMat);
        mag.position.set(-1.26 + i % 5 * .58, 1.48 + Math.floor(i / 5) * .61, -.33);
        mag.rotation.x = -.1;
        mag.rotation.z = (i % 2 ? -1 : 1) * .025;
        k.add(mag);
    }
    for (let i = 0; i < 8; i++) {
        const colors = [ 7558726, 3754816, 7296820, 6045243, 4938587, 9072198 ];
        const bm = new THREE.MeshStandardMaterial({
            color: colors[i % colors.length],
            roughness: .75
        });
        const b = box(k, bm, .18 + i % 3 * .08, .035 + i % 2 * .02, .14, -1.2 + i % 4 * .64, 1.69 + Math.floor(i / 4) * .3, -.18, {
            cast: false
        });
        b.rotation.y = i % 2 * .15;
    }
    const tobaccoMat = new THREE.MeshStandardMaterial({
        color: 4404522,
        roughness: .72,
        metalness: .03
    });
    box(k, tobaccoMat, .55, .76, .24, 1.25, 1.74, -.26);
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            const packColors = [ 11882821, 13612156, 5074277, 9534809, 9325379, 13814189 ];
            const pmat = new THREE.MeshStandardMaterial({
                color: packColors[(r * 3 + c) % packColors.length],
                roughness: .55
            });
            const p = box(k, pmat, .105, .055, .03, 1.08 + c * .13, 2.06 - r * .09, -.125, {
                cast: false
            });
            p.rotation.z = (r - 1) * .02;
        }
    }
    const clockFaceTex = makeTextTexture(256, 256, (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = "#d9cfb6";
        ctx.beginPath();
        ctx.arc(128, 128, 118, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "#2d2b25";
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(128, 128, 113, 0, TAU);
        ctx.stroke();
        for (let i = 0; i < 12; i++) {
            const a = i / 12 * TAU;
            ctx.strokeStyle = "#2d2b25";
            ctx.lineWidth = i % 3 === 0 ? 5 : 2;
            ctx.beginPath();
            ctx.moveTo(128 + Math.cos(a) * 92, 128 + Math.sin(a) * 92);
            ctx.lineTo(128 + Math.cos(a) * 104, 128 + Math.sin(a) * 104);
            ctx.stroke();
        }
        ctx.strokeStyle = "#252821";
        ctx.lineWidth = 7;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(128, 128);
        ctx.lineTo(128, 66);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(128, 128);
        ctx.lineTo(177, 143);
        ctx.stroke();
        ctx.fillStyle = "#252821";
        ctx.beginPath();
        ctx.arc(128, 128, 6, 0, TAU);
        ctx.fill();
        ctx.font = `16px ${SERIF}`;
        ctx.fillStyle = "#58503e";
        ctx.textAlign = "center";
        ctx.fillText("CHRONICLE", 128, 174);
    });
    const clockRing = new THREE.MeshStandardMaterial({
        color: 3352346,
        roughness: .4,
        metalness: .4
    });
    const clock = new THREE.Group;
    clock.position.set(-1.29, 2.27, -.29);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, .035, 32), clockRing);
    rim.rotation.x = Math.PI / 2;
    rim.castShadow = true;
    clock.add(rim);
    const face = new THREE.Mesh(new THREE.CircleGeometry(.165, 32), new THREE.MeshStandardMaterial({
        map: clockFaceTex,
        roughness: .7,
        metalness: 0,
        transparent: true
    }));
    face.position.z = .022;
    clock.add(face);
    k.add(clock);
    const coverPositions = [ {
        y: 1.37,
        z: .53,
        h: .47,
        xs: [ -1.44, -.79, -.14, .51, 1.16 ]
    }, {
        y: 1.7,
        z: .39,
        h: .45,
        xs: [ -1.37, -.74, -.11, .52, 1.15 ]
    }, {
        y: 2.02,
        z: .25,
        h: .41,
        xs: [ -1.19, -.58, .03, .64, 1.19 ]
    } ];
    let ci = 0;
    for (const row of coverPositions) {
        for (let j = 0; j < row.xs.length; j++) {
            const mw = row.h / 1.34 * (j % 2 ? 1.04 : .98);
            const mag = makeMagazine(shelfCovers[ci % shelfCovers.length], mw, row.h, agedPaperMat);
            mag.position.set(row.xs[j], row.y, row.z - j * .008);
            mag.rotation.x = -.18;
            mag.rotation.z = (j % 3 - 1) * .019;
            mag.rotation.y = (j % 2 ? -1 : 1) * .018;
            k.add(mag);
            const foot = box(k, shelfWood, .06, .02, .1, row.xs[j], row.y - row.h * .48, row.z + .015, {
                cast: false
            });
            foot.rotation.x = -.18;
            ci++;
        }
    }
    for (const [px, py, pz, pw, pd, pc, rot] of [ [ -1.12, 1.16, .56, .42, .29, 7, -.04 ], [ -.46, 1.15, .6, .36, .25, 6, .05 ], [ .36, 1.16, .58, .4, .27, 8, -.02 ], [ 1.05, 1.15, .57, .34, .24, 5, .07 ] ]) {
        makeStack(k, tex.newspapers[(Math.round(px * 7) + 8) % tex.newspapers.length], px, py, pz, pw, pd, pc, rot, paperMat);
    }
    for (const [mx, my, mz, mrot] of [ [ -.46, 1.205, .63, .12 ], [ .38, 1.213, .63, -.18 ] ]) {
        const leaf = makeMagazine(shelfCovers[(ci + 3) % shelfCovers.length], .3, .37, agedPaperMat);
        leaf.rotation.x = -Math.PI / 2 + .1;
        leaf.rotation.z = mrot;
        leaf.position.set(mx, my, mz);
        k.add(leaf);
        ci++;
    }
    const bookPalette = [ 7093046, 4149832, 8218690, 4865590, 7438458, 9072976, 3754842, 10191198 ];
    for (let r = 0; r < 4; r++) {
        for (let j = 0; j < 10; j++) {
            const rng2 = mulberry32(600 + r * 20 + j);
            const bm = new THREE.MeshStandardMaterial({
                color: bookPalette[(r * 3 + j) % bookPalette.length],
                roughness: .84
            });
            const book = box(k, bm, .06 + rng2() * .035, .19 + rng2() * .1, .13, -1.43 + j * .31 + (rng2() - .5) * .05, 1.28 + r * .3, -.25 + rng2() * .05, {
                cast: false
            });
            book.rotation.z = (rng2() - .5) * .12;
            book.rotation.y = (rng2() - .5) * .13;
        }
    }
    const bottleMats = [ new THREE.MeshStandardMaterial({
        color: 2378302,
        roughness: .2,
        metalness: .05
    }), new THREE.MeshStandardMaterial({
        color: 7227935,
        roughness: .22,
        metalness: .05
    }), new THREE.MeshStandardMaterial({
        color: 3557718,
        roughness: .2,
        metalness: .05
    }) ];
    for (let i = 0; i < 7; i++) {
        const b = new THREE.Group;
        const bm = bottleMats[i % 3];
        const body = cyl(b, bm, .035, .04, .19, 12, 0, .095, 0);
        const neck = cyl(b, bm, .015, .025, .09, 10, 0, .225, 0);
        const cap = cyl(b, new THREE.MeshStandardMaterial({
            color: 9399099,
            metalness: .6,
            roughness: .35
        }), .017, .017, .012, 10, 0, .276, 0);
        b.position.set(-1.15 + i * .16, 2.32, -.31);
        k.add(b);
    }
    const radio = new THREE.Group;
    radio.position.set(.82, 2.27, -.26);
    const radioBody = new THREE.MeshStandardMaterial({
        color: 4928806,
        roughness: .55,
        metalness: .08
    });
    roundedBox(radio, radioBody, .34, .23, .16, .025, 0, 0, 0, {
        segments: 2
    });
    const speakerTex = makeTextTexture(256, 160, (ctx, w, h) => {
        ctx.fillStyle = "#3c3226";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "rgba(196,171,124,.25)";
        for (let y = 16; y < h; y += 13) for (let x = 14; x < w * .52; x += 12) ctx.fillRect(x, y, 4, 2);
        ctx.fillStyle = "#c9b787";
        ctx.textAlign = "center";
        ctx.font = `italic 17px ${SERIF}`;
        ctx.fillText("RADIO", w * .76, h * .28);
        ctx.strokeStyle = "#9e8456";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(w * .76, h * .58, 26, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = "#7c623e";
        ctx.beginPath();
        ctx.arc(w * .76, h * .58, 9, 0, TAU);
        ctx.fill();
    });
    const radioFace = new THREE.Mesh(new THREE.PlaneGeometry(.3, .18), new THREE.MeshStandardMaterial({
        map: speakerTex,
        roughness: .8
    }));
    radioFace.position.z = .085;
    radio.add(radioFace);
    k.add(radio);
    const tagTex = makeTextTexture(256, 320, (ctx, w, h) => {
        ctx.fillStyle = "#ddd4c0";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "#5b5646";
        ctx.lineWidth = 4;
        ctx.strokeRect(9, 9, w - 18, h - 18);
        ctx.fillStyle = "#373a30";
        ctx.textAlign = "center";
        ctx.font = `italic 700 45px ${SERIF}`;
        ctx.fillText("NEWS", w / 2, 100);
        ctx.font = `25px ${SANS_NARROW}`;
        ctx.fillText("DAILY", w / 2, 141);
        ctx.font = `italic 700 56px ${SERIF}`;
        ctx.fillText("5¢", w / 2, 224);
    });
    const tagMat = new THREE.MeshStandardMaterial({
        map: tagTex,
        color: 11116685,
        roughness: .98
    });
    const stringMat = new THREE.MeshBasicMaterial({
        color: 2828834
    });
    for (let i = 0; i < 4; i++) {
        const hx = -.92 + i * .62;
        const tag = new THREE.Mesh(new THREE.PlaneGeometry(.105, .15), tagMat);
        tag.position.set(hx, 2.26 + i % 2 * .035, .4 + i % 2 * .06);
        tag.rotation.z = (i - 1.5) * .04;
        tag.rotation.x = -.05;
        k.add(tag);
        cyl(k, stringMat, .0025, .0025, .14, 4, hx, 2.4 + i % 2 * .035, .4 + i % 2 * .06, {
            cast: false
        });
    }
    for (let i = 0; i < 3; i++) {
        makeStack(k, tex.newspapers[i % tex.newspapers.length], -1.5 + i * .45, 1.12, .65 + i % 2 * .015, .4, .3, 7, -.05 + i * .03, paperMat);
    }
    makeStack(k, tex.newspapers[3], 1.28, 1.12, .6, .38, .28, 5, .06, paperMat);
    const cardTex = makeTextTexture(256, 160, (ctx, w, h) => {
        ctx.fillStyle = "#ded5bf";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "#474434";
        ctx.lineWidth = 3;
        ctx.strokeRect(9, 9, w - 18, h - 18);
        ctx.font = `italic 700 37px ${SERIF}`;
        ctx.fillStyle = "#35372e";
        ctx.textAlign = "center";
        ctx.fillText("NEWSPAPERS", w / 2, 62);
        ctx.font = `26px ${SANS_NARROW}`;
        ctx.fillText("EVERY EVENING  ·  5¢", w / 2, 105);
        ctx.font = `italic 19px ${SERIF}`;
        ctx.fillText("The Daily Chronicle", w / 2, 136);
    });
    const card = new THREE.Mesh(new THREE.PlaneGeometry(.31, .19), new THREE.MeshStandardMaterial({
        map: cardTex,
        color: 9406582,
        roughness: .96
    }));
    card.position.set(.25, 1.24, .62);
    card.rotation.x = -.25;
    k.add(card);
    const chalkFrame = new THREE.Group;
    chalkFrame.position.set(-1.47, 1.74, .62);
    box(chalkFrame, darkWoodMat, .61, .82, .035, 0, 0, 0);
    const chalkFace = new THREE.Mesh(new THREE.PlaneGeometry(.55, .75), new THREE.MeshStandardMaterial({
        map: tex.signs.chalk,
        roughness: .95,
        metalness: 0
    }));
    chalkFace.position.z = .022;
    chalkFrame.add(chalkFace);
    chalkFrame.rotation.z = .015;
    chalkFrame.rotation.x = -.035;
    k.add(chalkFrame);
    const iceFrame = new THREE.Group;
    iceFrame.position.set(1.27, 1.72, .655);
    iceFrame.rotation.z = -.015;
    box(iceFrame, darkWoodMat, .4, .87, .026, 0, 0, 0);
    const iceMat = new THREE.MeshStandardMaterial({
        map: tex.signs.icePoster,
        color: 12498596,
        roughness: .82,
        emissiveMap: tex.signs.icePoster,
        emissive: 6640184,
        emissiveIntensity: .08
    });
    const ice = new THREE.Mesh(new THREE.PlaneGeometry(.34, .8), iceMat);
    ice.position.z = .018;
    iceFrame.add(ice);
    k.add(iceFrame);
    const flyerMat = new THREE.MeshStandardMaterial({
        color: 12563871,
        roughness: .96
    });
    const flyer = new THREE.Mesh(new THREE.PlaneGeometry(.15, .2), flyerMat);
    flyer.position.set(1.02, 1.3, .668);
    flyer.rotation.z = -.14;
    k.add(flyer);
    const glassMat = new THREE.MeshPhysicalMaterial({
        color: 11125433,
        metalness: .08,
        roughness: .035,
        transparent: true,
        opacity: .17,
        clearcoat: 1,
        clearcoatRoughness: .025,
        envMapIntensity: 2.4,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    const glassSmudge = makeTextTexture(512, 512, (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        const r = (() => {
            let s = 441;
            return () => {
                s = s * 16807 % 2147483647;
                return (s - 1) / 2147483646;
            };
        })();
        const sky = ctx.createLinearGradient(0, 0, w * .9, h);
        sky.addColorStop(0, "rgba(187,213,215,.20)");
        sky.addColorStop(.28, "rgba(168,199,204,.07)");
        sky.addColorStop(.6, "rgba(178,207,209,.015)");
        sky.addColorStop(1, "rgba(178,207,209,0)");
        ctx.fillStyle = sky;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(w, 0);
        ctx.lineTo(w * .55, h * .78);
        ctx.lineTo(0, h * .5);
        ctx.closePath();
        ctx.fill();
        for (let i = 0; i < 10; i++) {
            const g = ctx.createLinearGradient(r() * w, 0, r() * w, h);
            g.addColorStop(0, "rgba(208,227,220,0)");
            g.addColorStop(.45, `rgba(208,227,220,${.035 + r() * .055})`);
            g.addColorStop(1, "rgba(208,227,220,0)");
            ctx.fillStyle = g;
            ctx.save();
            ctx.translate(w / 2, h / 2);
            ctx.rotate(-.45 + r() * .2);
            ctx.fillRect(-w, -h * (.05 + r() * .2), w * 2, 6 + r() * 38);
            ctx.restore();
        }
        const warm = ctx.createRadialGradient(w * .17, h * .62, 2, w * .17, h * .62, w * .42);
        warm.addColorStop(0, "rgba(255,187,110,.12)");
        warm.addColorStop(.5, "rgba(232,166,94,.035)");
        warm.addColorStop(1, "rgba(232,166,94,0)");
        ctx.fillStyle = warm;
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 150; i++) {
            const x = r() * w, y = h * .42 + r() * h * .58, rad = .5 + r() * 3.6;
            ctx.fillStyle = `rgba(221,235,225,${.05 + r() * .19})`;
            ctx.beginPath();
            ctx.arc(x, y, rad, 0, TAU);
            ctx.fill();
            if (r() > .75) {
                ctx.fillStyle = "rgba(238,241,226,.11)";
                ctx.fillRect(x, y, .7, 2 + r() * 14);
            }
        }
    });
    const smudgeMat = new THREE.MeshBasicMaterial({
        map: glassSmudge,
        transparent: true,
        opacity: .55,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    box(k, paintMat, .16, H_TOP - H_BASE + .16, .18, -W / 2 + .06, (H_BASE + H_TOP) / 2, FRONT);
    box(k, paintMat, .16, H_TOP - H_BASE + .16, .18, W / 2 - .06, (H_BASE + H_TOP) / 2, FRONT);
    box(k, trimMat, .055, H_TOP - H_BASE + .12, .09, -.64, (H_BASE + H_TOP) / 2, FRONT - .015);
    box(k, trimMat, .055, H_TOP - H_BASE + .12, .09, .64, (H_BASE + H_TOP) / 2, FRONT - .015);
    box(k, paintMat, W + .1, .16, .25, 0, H_TOP + .03, FRONT - .02);
    box(k, trimMat, W + .14, .06, .2, 0, H_TOP - .07, FRONT + .02);
    box(k, paintMat, W + .12, .12, .32, 0, H_BASE + .01, FRONT + .05);
    const paneCenters = [ -1.25, 0, 1.25 ];
    const paneWidths = [ 1.06, 1.16, 1.06 ];
    for (let i = 0; i < 3; i++) {
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(paneWidths[i], H_TOP - H_BASE - .12), glassMat);
        glass.position.set(paneCenters[i], (H_BASE + H_TOP) / 2, FRONT + .055);
        glass.castShadow = false;
        k.add(glass);
        const sm = new THREE.Mesh(new THREE.PlaneGeometry(paneWidths[i], H_TOP - H_BASE - .12), smudgeMat);
        sm.position.set(paneCenters[i], (H_BASE + H_TOP) / 2, FRONT + .062);
        sm.renderOrder = 5;
        k.add(sm);
    }
    for (const x of [ -W / 2 + .06, W / 2 - .06 ]) {
        for (const y of [ H_BASE + .05, H_TOP - .05 ]) {
            box(k, brass, .2, .04, .22, x, y, FRONT + .02);
        }
    }
    const bulbMat = new THREE.MeshBasicMaterial({
        color: 16768416,
        toneMapped: false
    });
    const shadeMat = new THREE.MeshStandardMaterial({
        color: 6115128,
        metalness: .48,
        roughness: .37,
        side: THREE.DoubleSide,
        emissive: 16755032,
        emissiveIntensity: .035
    });
    const shadeInner = new THREE.MeshBasicMaterial({
        color: 16762234,
        side: THREE.BackSide,
        toneMapped: false
    });
    const lampBulbs = [];
    for (const lx of [ -1.03, .33 ]) {
        const lz = .5;
        cyl(k, trimMat, .0055, .0055, .3, 6, lx, 2.42, lz);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(.038, .048, .045, 16), brass);
        cap.position.set(lx, 2.315, lz);
        k.add(cap);
        const shade = new THREE.Mesh(new THREE.CylinderGeometry(.074, .158, .115, 28, 1, true), shadeMat);
        shade.position.set(lx, 2.245, lz);
        shade.castShadow = true;
        k.add(shade);
        const innerShade = new THREE.Mesh(new THREE.CylinderGeometry(.071, .152, .112, 28, 1, true), shadeInner);
        innerShade.position.set(lx, 2.244, lz);
        k.add(innerShade);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(.062, 18, 12), bulbMat);
        bulb.position.set(lx, 2.168, lz);
        k.add(bulb);
        const underGlow = new THREE.Mesh(new THREE.CircleGeometry(.12, 28), new THREE.MeshBasicMaterial({
            color: 16763523,
            toneMapped: false,
            side: THREE.DoubleSide
        }));
        underGlow.rotation.x = Math.PI / 2;
        underGlow.position.set(lx, 2.181, lz);
        k.add(underGlow);
        glow(k, 16758888, .9, .34, lx, 2.145, lz + .03);
        const light = new THREE.PointLight(16760440, .95, 1.7, 2);
        light.position.set(lx, 2.075, lz + .02);
        k.add(light);
        lampBulbs.push(bulb);
    }
    const stripMat = new THREE.MeshBasicMaterial({
        color: 10118454
    });
    box(k, stripMat, 2.15, .014, .055, 0, 2.5, -.06, {
        cast: false
    });
    const adFrame = new THREE.Group;
    adFrame.position.set(-1.02, .56, FRONT + .078);
    box(adFrame, darkWoodMat, 1.38, .7, .07, 0, 0, 0);
    box(adFrame, trimMat, 1.44, .055, .075, 0, .35, .01);
    box(adFrame, trimMat, 1.44, .055, .075, 0, -.35, .01);
    const ad = new THREE.Mesh(new THREE.PlaneGeometry(1.2, .575), new THREE.MeshStandardMaterial({
        map: tex.signs.chronicle,
        color: 11642511,
        roughness: 1,
        metalness: 0,
        emissiveMap: tex.signs.chronicle,
        emissive: 3418908,
        emissiveIntensity: .35
    }));
    ad.position.z = .042;
    adFrame.add(ad);
    box(adFrame, brass, 1.24, .018, .012, 0, .3, .04, {
        cast: false
    });
    box(adFrame, brass, 1.24, .018, .012, 0, -.3, .04, {
        cast: false
    });
    const plaqueTex = makeTextTexture(256, 96, (ctx, w, h) => {
        ctx.fillStyle = "#756139";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "#d6bd78";
        ctx.lineWidth = 3;
        ctx.strokeRect(8, 8, w - 16, h - 16);
        ctx.fillStyle = "#ead79d";
        ctx.textAlign = "center";
        ctx.font = `22px ${SANS_NARROW}`;
        ctx.fillText("NEWS · TOBACCO · SODA", w / 2, 40);
        ctx.font = `16px ${SERIF}`;
        ctx.fillText("OPEN ALL HOURS", w / 2, 69);
    });
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(.52, .195), new THREE.MeshStandardMaterial({
        map: plaqueTex,
        roughness: .5,
        metalness: .35
    }));
    plaque.position.set(.82, .18, .043);
    adFrame.add(plaque);
    k.add(adFrame);
    const clothMat = new THREE.MeshPhysicalMaterial({
        map: tex.awning.cloth,
        color: 11186336,
        roughness: .8,
        metalness: .03,
        clearcoat: .24,
        clearcoatRoughness: .28,
        side: THREE.DoubleSide
    });
    const segU = 28, segV = 9;
    const positions = [], uvs = [], indices = [];
    for (let iv = 0; iv <= segV; iv++) {
        const v = iv / segV;
        for (let iu = 0; iu <= segU; iu++) {
            const u = iu / segU;
            const x = (u - .5) * 3.98;
            const z = FRONT + .61 - v * 1.32;
            const sag = Math.sin(u * Math.PI) * .035 * (1 - v);
            const y = 2.99 + v * .13 - sag;
            positions.push(x, y, z);
            uvs.push(u * 1.7, v);
        }
    }
    for (let iv = 0; iv < segV; iv++) {
        for (let iu = 0; iu < segU; iu++) {
            const a = iv * (segU + 1) + iu;
            const b = a + 1;
            const c = a + segU + 1;
            const d = c + 1;
            indices.push(a, c, b, b, c, d);
        }
    }
    const canopyGeo = new THREE.BufferGeometry;
    canopyGeo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    canopyGeo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    canopyGeo.setIndex(indices);
    canopyGeo.computeVertexNormals();
    const canopy = new THREE.Mesh(canopyGeo, clothMat);
    canopy.castShadow = true;
    canopy.receiveShadow = true;
    k.add(canopy);
    const hem = cyl(k, trimMat, .028, .028, 3.98, 10, 0, 2.955, FRONT + .61, {
        rz: Math.PI / 2
    });
    const signMat = new THREE.MeshStandardMaterial({
        map: tex.awning.strip,
        roughness: .82,
        metalness: .03,
        emissiveMap: tex.awning.strip,
        emissive: 16774879,
        emissiveIntensity: .11
    });
    const valance = new THREE.Mesh(new THREE.PlaneGeometry(3.96, .35), signMat);
    valance.position.set(0, 2.79, FRONT + .61);
    valance.castShadow = false;
    k.add(valance);
    box(k, trimMat, 4.02, .37, .06, 0, 2.79, FRONT + .575, {
        cast: false
    });
    box(k, clothMat, .05, .36, .93, -1.97, 2.8, FRONT + .18, {
        cast: false
    });
    box(k, clothMat, .05, .36, .93, 1.97, 2.8, FRONT + .18, {
        cast: false
    });
    const rodMat = new THREE.MeshStandardMaterial({
        color: 1252631,
        roughness: .35,
        metalness: .65
    });
    for (const x of [ -1.9, 1.9 ]) {
        cylinderBetween(k, rodMat, new THREE.Vector3(x, 2.36, FRONT + .13), new THREE.Vector3(x, 2.96, FRONT + .56), .012, 8);
    }
    for (const x of [ -1.94, -.92, .1, 1.12, 1.94 ]) {
        cyl(k, trimMat, .006, .012, .065, 6, x, 2.59, FRONT + .61);
    }
    box(k, trimMat, W + .18, .1, .34, 0, 3.13, FRONT - .04);
    box(k, paintMat, W, .18, .18, 0, 3.17, BACK + .04);
    const papersTex = makeTextTexture(192, 512, (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, "#15221d");
        g.addColorStop(1, "#0a1310");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "rgba(220,217,197,.32)";
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, w - 20, h - 20);
        ctx.fillStyle = "#ddd8c1";
        ctx.textAlign = "center";
        ctx.font = `26px ${SANS_NARROW}`;
        ctx.fillText("PAPERS", w / 2, 120);
        ctx.font = `italic 700 38px ${SERIF}`;
        ctx.fillText("DAILY", w / 2, 190);
        ctx.fillText("NEWS", w / 2, 237);
        ctx.fillStyle = "rgba(222,212,186,.72)";
        ctx.font = `17px ${SANS}`;
        ctx.fillText("CITY FINAL", w / 2, 300);
        ctx.font = `28px ${SERIF}`;
        ctx.fillText("5¢", w / 2, 372);
        ctx.strokeStyle = "rgba(220,217,197,.22)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(36, 334);
        ctx.lineTo(w - 36, 334);
        ctx.stroke();
        ctx.font = `13px ${SANS}`;
        ctx.fillText("ALL THE NEWS", w / 2, 430);
    });
    const papersBoard = new THREE.Mesh(new THREE.PlaneGeometry(.33, .9), new THREE.MeshStandardMaterial({
        map: papersTex,
        roughness: .72,
        metalness: .05
    }));
    papersBoard.position.set(-1.78, 1.84, FRONT + .13);
    papersBoard.rotation.y = .17;
    k.add(papersBoard);
    box(k, darkWoodMat, .36, .94, .02, -1.78, 1.84, FRONT + .11, {
        ry: .17
    });
    const rackLamp = new THREE.Group;
    rackLamp.position.set(.26, 1.16, FRONT + .08);
    k.add(rackLamp);
    const rackLampMetal = new THREE.MeshStandardMaterial({
        color: 1780258,
        roughness: .36,
        metalness: .55
    });
    box(rackLamp, rackLampMetal, .12, .12, .035, 0, 0, 0, {
        cast: false
    });
    cylinderBetween(rackLamp, rackLampMetal, new THREE.Vector3(0, -.02, .02), new THREE.Vector3(.02, -.15, .26), .012, 8);
    const rackShade = new THREE.Mesh(new THREE.CylinderGeometry(.035, .105, .08, 16, 1, true), rackLampMetal);
    rackShade.position.set(.02, -.19, .27);
    rackShade.rotation.x = .25;
    rackLamp.add(rackShade);
    const rackBulb = new THREE.Mesh(new THREE.SphereGeometry(.032, 12, 8), new THREE.MeshBasicMaterial({
        color: 16763526,
        toneMapped: false
    }));
    rackBulb.position.set(.02, -.235, .28);
    rackLamp.add(rackBulb);
    glow(rackLamp, 16758383, .46, .27, .02, -.24, .3);
    const rackLight = new THREE.PointLight(16758389, .9, 1.8, 2);
    rackLight.position.set(.02, -.24, .32);
    rackLamp.add(rackLight);
    const interiorWarm = new THREE.Mesh(new THREE.PlaneGeometry(3.18, 1.3), new THREE.MeshBasicMaterial({
        color: 14259275,
        transparent: true,
        opacity: .035,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    }));
    interiorWarm.position.set(0, 1.86, BACK + .1);
    k.add(interiorWarm);
    k.scale.set(1, 1.055, 1);
    return {
        group: k,
        bulbMat: bulbMat,
        shadeMat: shadeMat,
        canopy: canopy,
        paintMat: paintMat,
        trimMat: trimMat,
        glassMat: glassMat,
        lampBulbs: lampBulbs,
        dimensions: {
            W: W,
            H_BASE: H_BASE,
            H_TOP: H_TOP,
            FRONT: FRONT,
            BACK: BACK
        },
        interiorWood: interiorWood,
        shelfWood: shelfWood
    };
}

function buildNewspaperRack(root, tex) {
    const g = new THREE.Group;
    g.position.set(-2.31, 0, 1.31);
    g.rotation.y = -.04;
    root.add(g);
    const metal = new THREE.MeshStandardMaterial({
        color: 1778465,
        roughness: .36,
        metalness: .72
    });
    const metalLight = new THREE.MeshStandardMaterial({
        color: 6845035,
        roughness: .32,
        metalness: .8
    });
    const paperMat = new THREE.MeshStandardMaterial({
        color: 13617333,
        roughness: .9
    });
    for (const side of [ -1, 1 ]) {
        const x = side * .31;
        cylinderBetween(g, metal, new THREE.Vector3(x, .02, .12), new THREE.Vector3(x, .94, .02), .011, 8);
        cylinderBetween(g, metal, new THREE.Vector3(x, .02, -.16), new THREE.Vector3(x, .94, .02), .011, 8);
        cylinderBetween(g, metal, new THREE.Vector3(x, .01, .12), new THREE.Vector3(x, .01, -.16), .009, 8);
        cylinderBetween(g, metal, new THREE.Vector3(x, .01, .12), new THREE.Vector3(x + side * .08, .01, .22), .012, 8);
        cylinderBetween(g, metal, new THREE.Vector3(x, .01, -.16), new THREE.Vector3(x + side * .08, .01, -.26), .012, 8);
    }
    for (const y of [ .18, .42, .68, .92 ]) {
        cylinderBetween(g, metal, new THREE.Vector3(-.33, y, .02), new THREE.Vector3(.33, y, .02), .009, 8);
    }
    const topSignTex = makeTextTexture(512, 128, (ctx, w, h) => {
        ctx.fillStyle = "#ded7c4";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "#3e3b2e";
        ctx.lineWidth = 3;
        ctx.strokeRect(6, 6, w - 12, h - 12);
        ctx.textAlign = "center";
        ctx.fillStyle = "#292a23";
        ctx.font = `700 40px ${SERIF}`;
        ctx.fillText("Evening Papers", w / 2, 50);
        ctx.font = `20px ${SANS_NARROW}`;
        ctx.fillText("DAILY & SUNDAY  ·  FIVE CENTS", w / 2, 88);
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(.52, .125), new THREE.MeshStandardMaterial({
        map: topSignTex,
        color: 11971992,
        roughness: 1
    }));
    board.position.set(0, .86, .085);
    g.add(board);
    const rows = [ {
        y: .575,
        z: .05,
        t: 1
    }, {
        y: .355,
        z: .09,
        t: 2
    }, {
        y: .145,
        z: .13,
        t: 3
    } ];
    rows.forEach((r, idx) => {
        const back = makeNewspaperSheet(tex.newspapers[(idx + 2) % tex.newspapers.length], .36, .41, paperMat);
        back.position.set(-.015, r.y, r.z);
        back.rotation.x = -.17;
        back.rotation.z = -.018;
        g.add(back);
        const front = makeNewspaperSheet(tex.newspapers[idx % tex.newspapers.length], .355, .405, paperMat);
        front.position.set(.012, r.y + .007, r.z + .045);
        front.rotation.x = -.23;
        front.rotation.z = .022;
        g.add(front);
        cylinderBetween(g, metalLight, new THREE.Vector3(-.33, r.y - .21, r.z + .105), new THREE.Vector3(.33, r.y - .21, r.z + .105), .006, 6);
        box(g, metalLight, .035, .14, .018, -.17, r.y + .02, r.z + .08, {
            cast: false
        });
    });
    for (const x of [ -.21, .21 ]) {
        const clip = box(g, metalLight, .035, .075, .022, x, .94, .08);
        clip.rotation.x = .2;
    }
    contactShadow(root, -2.31, 1.31, .8, .6, .32);
    return g;
}

function buildCrate(root, tex) {
    const g = new THREE.Group;
    g.position.set(-1.3, 0, 1.23);
    g.rotation.y = .045;
    root.add(g);
    const creamMat = new THREE.MeshStandardMaterial({
        color: 13551279,
        roughness: .92
    });
    const darkMat = new THREE.MeshStandardMaterial({
        color: 2826775,
        roughness: .78
    });
    const frontMat = new THREE.MeshStandardMaterial({
        map: tex.wood.front,
        color: 14732714,
        roughness: .68,
        metalness: .02
    });
    const sideMat = new THREE.MeshStandardMaterial({
        map: tex.wood.side,
        roughness: .78,
        metalness: .02
    });
    const topMat = new THREE.MeshStandardMaterial({
        map: tex.wood.top,
        roughness: .8,
        metalness: .02
    });
    const mats = [ sideMat, sideMat, topMat, darkMat, frontMat, sideMat ];
    const crate = new THREE.Mesh(new THREE.BoxGeometry(.68, .54, .6), mats);
    crate.position.y = .28;
    crate.rotation.x = -.015;
    crate.castShadow = true;
    crate.receiveShadow = true;
    g.add(crate);
    const strap = new THREE.MeshStandardMaterial({
        color: 2960164,
        roughness: .5,
        metalness: .55
    });
    for (const x of [ -.35, .35 ]) {
        for (const z of [ -.31, .31 ]) {
            box(g, strap, .035, .56, .035, x, .28, z, {
                cast: false
            });
        }
    }
    for (const y of [ .03, .53 ]) {
        box(g, strap, .71, .025, .63, 0, y, 0, {
            cast: false
        });
    }
    const ropeMat = new THREE.MeshStandardMaterial({
        color: 7692618,
        roughness: .95
    });
    for (const x of [ -.355, .355 ]) {
        const curve = new THREE.CatmullRomCurve3([ new THREE.Vector3(x, .23, .08), new THREE.Vector3(x + (x < 0 ? -.045 : .045), .18, 0), new THREE.Vector3(x, .23, -.08) ]);
        const rope = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, .009, 5, false), ropeMat);
        g.add(rope);
    }
    makeStack(g, tex.newspapers[0], .02, .56, .015, .46, .35, 12, .05, creamMat);
    const twine = new THREE.MeshStandardMaterial({
        color: 6508858,
        roughness: .9
    });
    box(g, twine, .47, .006, .012, .02, .613, .015);
    box(g, twine, .012, .006, .36, .02, .616, .015);
    contactShadow(root, -1.3, 1.23, 1, .9, .4);
    return g;
}

function buildStreetlamp(root, tex) {
    const g = new THREE.Group;
    g.position.set(-5.08, 0, 1.72);
    root.add(g);
    const iron = new THREE.MeshStandardMaterial({
        color: 1120021,
        roughness: .38,
        metalness: .72
    });
    const glassMat = new THREE.MeshStandardMaterial({
        color: 16765581,
        emissive: 16760168,
        emissiveIntensity: 1.8,
        transparent: true,
        opacity: .6,
        roughness: .15,
        metalness: .1,
        toneMapped: true
    });
    cyl(g, iron, .16, .22, .18, 12, 0, .09, 0);
    cyl(g, iron, .06, .13, .55, 12, 0, .4, 0);
    cyl(g, iron, .035, .052, 2.7, 10, 0, 1.97, 0);
    for (const y of [ .86, 2.7 ]) {
        const collar = new THREE.Mesh(new THREE.TorusGeometry(.07, .016, 5, 12), iron);
        collar.position.y = y;
        collar.rotation.x = Math.PI / 2;
        g.add(collar);
    }
    cyl(g, iron, .02, .035, .55, 8, 0, 3.55, 0);
    const lantern = new THREE.Group;
    lantern.position.set(0, 3.35, 0);
    box(lantern, iron, .22, .26, .22, 0, 0, 0, {
        cast: false
    });
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(.14, .17, .14), glassMat);
    bulb.position.y = .01;
    lantern.add(bulb);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(.19, .14, 4), iron);
    cap.position.y = .2;
    cap.rotation.y = Math.PI / 4;
    cap.castShadow = true;
    lantern.add(cap);
    for (const x of [ -.11, .11 ]) {
        for (const z of [ -.11, .11 ]) {
            cyl(lantern, iron, .008, .008, .28, 6, x, 0, z);
        }
    }
    g.add(lantern);
    glow(g, 16758627, 1.3, .38, 0, 3.35, .02);
    contactShadow(root, -5.08, 1.72, .8, .7, .4);
    return {
        group: g,
        bulbMat: glassMat,
        lightPos: new THREE.Vector3(-5.08, 3.32, 1.72)
    };
}

function buildStrayPapers(root, tex) {
    const rngSeed = 991;
    const g = new THREE.Group;
    root.add(g);
    const mat = new THREE.MeshStandardMaterial({
        color: 12432804,
        roughness: .94
    });
    for (let i = 0; i < 5; i++) {
        const w = .15 + Math.random() * .1;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * .7), mat);
        m.rotation.x = -Math.PI / 2;
        m.rotation.z = Math.random() * TAU;
        m.position.set(-3.05 + i * .72, .035 + i * .001, 1.62 + i % 2 * .55);
        m.receiveShadow = true;
        g.add(m);
    }
    return g;
}

function makePaperCup(labelTex, simple = false) {
    const g = new THREE.Group;
    const paper = new THREE.MeshStandardMaterial({
        color: 15854814,
        roughness: .78,
        metalness: .01
    });
    const bodyMat = simple ? paper : new THREE.MeshStandardMaterial({
        map: labelTex,
        roughness: .66,
        metalness: .02,
        side: THREE.DoubleSide
    });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.052, .039, .12, 20, 1, true), bodyMat);
    body.castShadow = true;
    g.add(body);
    const bottom = new THREE.Mesh(new THREE.CircleGeometry(.039, 20), paper);
    bottom.rotation.x = Math.PI / 2;
    bottom.position.y = -.06;
    g.add(bottom);
    const inside = new THREE.Mesh(new THREE.CircleGeometry(.05, 20), new THREE.MeshStandardMaterial({
        color: 13288111,
        roughness: .9
    }));
    inside.rotation.x = -Math.PI / 2;
    inside.position.y = .058;
    g.add(inside);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.051, .005, 5, 20), new THREE.MeshStandardMaterial({
        color: 16183780,
        roughness: .55
    }));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = .06;
    g.add(rim);
    return g;
}

function buildVendingMachine(root, tex) {
    const v = new THREE.Group;
    v.position.set(.72, 0, -.18);
    root.add(v);
    const frontZ = .355;
    const faceZ = frontZ + .014;
    const bodyMat = new THREE.MeshPhysicalMaterial({
        map: tex.vending.sideMap,
        color: 16777215,
        roughness: .48,
        metalness: .2,
        clearcoat: .25,
        clearcoatRoughness: .23,
        envMapIntensity: 1.35
    });
    const body = new THREE.Mesh(new RoundedBoxGeometry(1.16, 1.9, .72, 5, .06), bodyMat);
    body.position.y = .98;
    body.castShadow = true;
    body.receiveShadow = true;
    v.add(body);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.085, 1.8), new THREE.MeshPhysicalMaterial({
        map: tex.vending.frontMat,
        roughnessMap: tex.vending.roughMat,
        metalnessMap: tex.vending.metalMat,
        bumpMap: tex.vending.roughMat,
        bumpScale: .0025,
        roughness: .88,
        metalness: .42,
        clearcoat: .32,
        clearcoatRoughness: .2,
        envMapIntensity: 1.7
    }));
    face.position.set(0, .985, faceZ);
    face.receiveShadow = true;
    v.add(face);
    const rimMat = new THREE.MeshStandardMaterial({
        color: 2502701,
        roughness: .46,
        metalness: .55
    });
    box(v, rimMat, 1.12, .03, .03, 0, 1.89, faceZ + .003, {
        cast: false
    });
    box(v, rimMat, 1.12, .03, .03, 0, .085, faceZ + .003, {
        cast: false
    });
    box(v, rimMat, .03, 1.82, .03, -.55, .99, faceZ + .003, {
        cast: false
    });
    box(v, rimMat, .03, 1.82, .03, .55, .99, faceZ + .003, {
        cast: false
    });
    const rust = new THREE.MeshStandardMaterial({
        color: 5979437,
        roughness: .9,
        metalness: .18
    });
    box(v, rust, 1.08, .11, .66, 0, .045, 0, {
        cast: false
    });
    const blackRubber = new THREE.MeshStandardMaterial({
        color: 1053458,
        roughness: .67,
        metalness: .05
    });
    for (const x of [ -.46, .46 ]) {
        for (const z of [ -.26, .26 ]) {
            box(v, blackRubber, .1, .03, .1, x, .015, z, {
                cast: false
            });
        }
    }
    const logoMat = new THREE.MeshStandardMaterial({
        map: tex.pepsiLogo,
        transparent: true,
        roughness: .47,
        metalness: .2,
        emissiveMap: tex.pepsiLogo,
        emissive: 11807266,
        emissiveIntensity: .02,
        depthWrite: false
    });
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(.66, .33), logoMat);
    logo.position.set(0, 1.685, faceZ + .008);
    v.add(logo);
    const chrome = new THREE.MeshPhysicalMaterial({
        color: 12172464,
        metalness: 1,
        roughness: .22,
        clearcoat: .55,
        clearcoatRoughness: .15,
        envMapIntensity: 2.6
    });
    const chromeDim = new THREE.MeshPhysicalMaterial({
        color: 8817536,
        metalness: .96,
        roughness: .34,
        envMapIntensity: 1.9
    });
    const plateGroup = new THREE.Group;
    plateGroup.position.set(.265, 1.255, faceZ + .006);
    v.add(plateGroup);
    roundedBox(plateGroup, chrome, .235, .6, .032, .02, 0, 0, 0, {
        segments: 4
    });
    const plateFaceMat = new THREE.MeshPhysicalMaterial({
        color: 1581085,
        roughness: .34,
        metalness: .62,
        clearcoat: .5,
        clearcoatRoughness: .2,
        envMapIntensity: 1.3
    });
    roundedBox(plateGroup, plateFaceMat, .192, .552, .01, .012, 0, 0, .017, {
        segments: 3
    });
    const coinEscutcheon = new THREE.Group;
    coinEscutcheon.position.set(0, .195, .022);
    plateGroup.add(coinEscutcheon);
    roundedBox(coinEscutcheon, chrome, .102, .152, .014, .012, 0, 0, 0, {
        segments: 3
    });
    const slotMat = new THREE.MeshStandardMaterial({
        color: 329478,
        roughness: .3,
        metalness: .55
    });
    box(coinEscutcheon, slotMat, .032, .088, .006, 0, 0, .01);
    box(coinEscutcheon, chromeDim, .06, .009, .009, 0, .05, .013);
    box(coinEscutcheon, chromeDim, .06, .009, .009, 0, -.05, .013);
    const coinLabelTex = makeTextTexture(256, 64, (ctx, w, h) => {
        ctx.fillStyle = "#161c19";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "rgba(208,204,185,.7)";
        ctx.textAlign = "center";
        ctx.font = `16px ${SANS_NARROW}`;
        ctx.fillText("INSERT 5¢", w / 2, 40);
    });
    const coinLabel = new THREE.Mesh(new THREE.PlaneGeometry(.095, .024), new THREE.MeshStandardMaterial({
        map: coinLabelTex,
        roughness: .72,
        metalness: .1
    }));
    coinLabel.position.set(0, -.068, .022);
    coinEscutcheon.add(coinLabel);
    const priceTex = makeTextTexture(256, 96, (ctx, w, h) => {
        ctx.fillStyle = "#202a24";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "#787968";
        ctx.lineWidth = 3;
        ctx.strokeRect(4, 4, w - 8, h - 8);
        ctx.fillStyle = "#d7cfb4";
        ctx.textAlign = "center";
        ctx.font = `italic 700 39px ${SERIF}`;
        ctx.fillText("ICE COLD", w / 2, 39);
        ctx.font = `17px ${SANS_NARROW}`;
        ctx.fillText("FIVE CENTS", w / 2, 68);
    });
    box(plateGroup, chromeDim, .14, .054, .008, 0, .082, .024);
    const pricePlate = new THREE.Mesh(new THREE.PlaneGeometry(.13, .045), new THREE.MeshStandardMaterial({
        map: priceTex,
        color: 12169626,
        roughness: .84,
        metalness: .05
    }));
    pricePlate.position.set(0, .082, .029);
    plateGroup.add(pricePlate);
    box(plateGroup, chromeDim, .168, .024, .012, 0, -.018, .025);
    const selectorGroup = new THREE.Group;
    selectorGroup.position.set(0, -.088, .027);
    plateGroup.add(selectorGroup);
    const buttonMats = [];
    const buttons = [];
    const buttonTints = [ 12174774, 11095362, 12624478 ];
    for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(.024, .005, 6, 20), chrome);
        ring.position.set(-.055 + i * .055, 0, .002);
        selectorGroup.add(ring);
        const bm = new THREE.MeshPhysicalMaterial({
            color: buttonTints[i],
            roughness: .3,
            metalness: .24,
            emissive: buttonTints[i],
            emissiveIntensity: .035,
            clearcoat: .6,
            clearcoatRoughness: .18
        });
        buttonMats.push(bm);
        const b = new THREE.Mesh(new THREE.CylinderGeometry(.021, .021, .016, 20), bm);
        b.rotation.x = Math.PI / 2;
        b.position.set(-.055 + i * .055, 0, .004);
        selectorGroup.add(b);
        buttons.push(b);
    }
    const selectTex = makeTextTexture(256, 64, (ctx, w, h) => {
        ctx.fillStyle = "#202823";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#c6c5ae";
        ctx.textAlign = "center";
        ctx.font = `15px ${SANS_NARROW}`;
        ctx.fillText("1     2     3", w / 2, 28);
        ctx.fillStyle = "rgba(197,195,171,.55)";
        ctx.font = `11px ${SANS}`;
        ctx.fillText("SELECT", w / 2, 48);
    });
    const selectPlate = new THREE.Mesh(new THREE.PlaneGeometry(.135, .038), new THREE.MeshStandardMaterial({
        map: selectTex,
        roughness: .7,
        metalness: .2
    }));
    selectPlate.position.set(0, -.136, .024);
    plateGroup.add(selectPlate);
    const returnGroup = new THREE.Group;
    returnGroup.position.set(0, -.215, .024);
    plateGroup.add(returnGroup);
    roundedBox(returnGroup, chrome, .125, .1, .014, .014, 0, 0, 0, {
        segments: 3
    });
    box(returnGroup, slotMat, .087, .042, .008, 0, 0, .011);
    const lever = new THREE.Mesh(new THREE.CylinderGeometry(.008, .01, .062, 10), chrome);
    lever.rotation.z = Math.PI / 2;
    lever.position.set(.012, -.073, .012);
    returnGroup.add(lever);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(.012, 10, 8), chrome);
    knob.position.set(-.025, -.073, .014);
    returnGroup.add(knob);
    const coinGlowMat = new THREE.MeshBasicMaterial({
        color: 16757085,
        transparent: true,
        opacity: 0,
        toneMapped: false
    });
    const coinGlow = new THREE.Mesh(new THREE.PlaneGeometry(.09, .012), coinGlowMat);
    coinGlow.position.set(0, .11, .031);
    plateGroup.add(coinGlow);
    const keyLight = new THREE.PointLight(16752463, 0, .7, 2);
    keyLight.position.set(0, .34, faceZ + .18);
    v.add(keyLight);
    const badge = new THREE.Mesh(new THREE.CircleGeometry(.135, 40), new THREE.MeshStandardMaterial({
        map: tex.coinBadge,
        transparent: true,
        roughness: .48,
        metalness: .25,
        emissiveMap: tex.coinBadge,
        emissive: 6166292,
        emissiveIntensity: .16
    }));
    badge.position.set(-.16, .71, faceZ + .009);
    v.add(badge);
    const outletY = .36;
    const outletGroup = new THREE.Group;
    outletGroup.position.set(-.04, outletY, faceZ + .013);
    v.add(outletGroup);
    const outletInside = new THREE.Mesh(new THREE.PlaneGeometry(.31, .19), new THREE.MeshStandardMaterial({
        color: 462863,
        roughness: .55,
        metalness: .2
    }));
    outletInside.position.z = .001;
    outletGroup.add(outletInside);
    const rimPieces = [ [ .36, .025, 0, .105 ], [ .36, .025, 0, -.105 ], [ .025, .21, -.18, 0 ], [ .025, .21, .18, 0 ] ];
    for (const [w, h, x, y] of rimPieces) {
        box(outletGroup, chrome, w, h, .028, x, y, .018);
    }
    box(outletGroup, new THREE.MeshStandardMaterial({
        color: 2435880,
        roughness: .4,
        metalness: .6
    }), .37, .035, .13, 0, .12, .055, {
        rx: -.22
    });
    const outletGlowMat = new THREE.MeshBasicMaterial({
        color: 16757863,
        transparent: true,
        opacity: .02,
        toneMapped: false
    });
    const outletLight = new THREE.Mesh(new THREE.PlaneGeometry(.22, .12), outletGlowMat);
    outletLight.position.set(0, -.02, .006);
    outletGroup.add(outletLight);
    const outletPoint = new THREE.PointLight(16754781, 0, .75, 2);
    outletPoint.position.set(-.04, .3, faceZ + .2);
    v.add(outletPoint);
    box(outletGroup, chrome, .4, .018, .19, 0, -.135, .09, {
        rx: .05
    });
    const handle = new THREE.Group;
    handle.position.set(.47, .83, faceZ + .03);
    cylinderBetween(handle, chrome, new THREE.Vector3(0, -.34, 0), new THREE.Vector3(0, .34, 0), .017, 10);
    for (const y of [ -.28, .28 ]) {
        box(handle, chrome, .04, .04, .06, -.03, y, -.02);
    }
    v.add(handle);
    const rivetMat = new THREE.MeshStandardMaterial({
        color: 5987666,
        roughness: .36,
        metalness: .8
    });
    for (const [x, y] of [ [ -.5, 1.79 ], [ .5, 1.79 ], [ -.5, .15 ], [ .5, .15 ], [ .26, 1.78 ] ]) {
        const rv = new THREE.Mesh(new THREE.SphereGeometry(.012, 8, 6), rivetMat);
        rv.position.set(x, y, faceZ + .012);
        v.add(rv);
    }
    const serialTex = makeTextTexture(256, 64, (ctx, w, h) => {
        ctx.fillStyle = "#b2ac98";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "#5e5a4a";
        ctx.lineWidth = 2;
        ctx.strokeRect(3, 3, w - 6, h - 6);
        ctx.fillStyle = "#3e4038";
        ctx.font = `18px ${SANS_NARROW}`;
        ctx.textAlign = "center";
        ctx.fillText("PEPSI-COLA  ·  ICE COLD", w / 2, 28);
        ctx.font = `13px ${SANS}`;
        ctx.fillText("SER. 1947-08  ·  5¢", w / 2, 48);
    });
    const serial = new THREE.Mesh(new THREE.PlaneGeometry(.23, .06), new THREE.MeshStandardMaterial({
        map: serialTex,
        roughness: .65,
        metalness: .3
    }));
    serial.position.set(-.32, .14, faceZ + .009);
    v.add(serial);
    const ventMat = new THREE.MeshStandardMaterial({
        color: 3228223,
        roughness: .48,
        metalness: .45
    });
    for (let i = 0; i < 6; i++) {
        box(v, ventMat, .012, .21, .02, -.58, .55 + i * .047, -.05 + i * .018, {
            cast: false
        });
    }
    const dispensedCup = makePaperCup(tex.cupLabel, false);
    dispensedCup.position.set(-.04, outletY - .02, faceZ + .1);
    dispensedCup.visible = false;
    v.add(dispensedCup);
    const cupLabel = makeTextTexture(512, 256, (ctx, w, h) => {
        ctx.fillStyle = "#f0ebdd";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#a52225";
        ctx.fillRect(0, 32, w, 18);
        ctx.fillStyle = "#243c50";
        ctx.textAlign = "center";
        ctx.font = `italic 700 45px ${SERIF}`;
        ctx.fillText("Pepsi-Cola", w / 2, 135);
        ctx.font = `18px ${SANS_NARROW}`;
        ctx.fillText("ICE COLD", w / 2, 175);
    });
    const coinMat = new THREE.MeshStandardMaterial({
        color: 11635787,
        roughness: .28,
        metalness: .9
    });
    const coin1 = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .004, 16), coinMat);
    coin1.position.set(.18, .12, faceZ + .021);
    coin1.rotation.x = Math.PI / 2;
    v.add(coin1);
    const holder = new THREE.Group;
    holder.position.set(1.62, 0, WORLD.wallZ + .01);
    root.add(holder);
    const holderMetal = new THREE.MeshStandardMaterial({
        color: 5594452,
        roughness: .25,
        metalness: .78,
        side: THREE.DoubleSide
    });
    const holderDark = new THREE.MeshStandardMaterial({
        color: 725007,
        roughness: .82,
        metalness: .1
    });
    const tubeShell = new THREE.Mesh(new THREE.CylinderGeometry(.19, .19, .76, 32, 1, true, Math.PI * .5, Math.PI), holderMetal);
    tubeShell.position.set(0, 1.7, .05);
    tubeShell.castShadow = true;
    tubeShell.receiveShadow = true;
    holder.add(tubeShell);
    box(holder, holderDark, .37, .73, .036, 0, 1.7, -.07);
    const tubeTop = new THREE.Mesh(new THREE.CylinderGeometry(.201, .201, .04, 32), holderMetal);
    tubeTop.position.set(0, 2.085, .05);
    tubeTop.castShadow = true;
    holder.add(tubeTop);
    const tubeBottom = new THREE.Mesh(new THREE.CylinderGeometry(.201, .201, .034, 32), holderMetal);
    tubeBottom.position.set(0, 1.315, .05);
    tubeBottom.castShadow = true;
    holder.add(tubeBottom);
    for (const y of [ 2.062, 1.335 ]) {
        const rimRing = new THREE.Mesh(new THREE.TorusGeometry(.192, .01, 6, 32), chrome);
        rimRing.rotation.x = Math.PI / 2;
        rimRing.position.set(0, y, .05);
        holder.add(rimRing);
    }
    for (const x of [ -.178, .178 ]) {
        cylinderBetween(holder, holderMetal, new THREE.Vector3(x, 1.34, .168), new THREE.Vector3(x, 2.055, .168), .0075, 8);
        box(holder, holderMetal, .055, .026, .035, x, 2.085, .135, {
            cast: false
        });
    }
    for (const y of [ 1.94, 1.46 ]) {
        box(holder, holderMetal, .33, .04, .055, 0, y, -.135);
        cylinderBetween(holder, holderMetal, new THREE.Vector3(-.145, y, -.12), new THREE.Vector3(-.145, y, .02), .014, 8);
        cylinderBetween(holder, holderMetal, new THREE.Vector3(.145, y, -.12), new THREE.Vector3(.145, y, .02), .014, 8);
    }
    for (const x of [ -.13, .13 ]) {
        for (const y of [ 1.94, 1.46 ]) {
            const scr = new THREE.Mesh(new THREE.CylinderGeometry(.011, .011, .02, 8), holderMetal);
            scr.rotation.x = Math.PI / 2;
            scr.position.set(x, y, -.1);
            holder.add(scr);
        }
    }
    const cupStack = new THREE.Group;
    cupStack.position.set(0, 1.35, .065);
    holder.add(cupStack);
    const cupsInHolder = [];
    const cupPaperMat = new THREE.MeshStandardMaterial({
        color: 13353648,
        roughness: 1,
        metalness: 0
    });
    const cupRimMat = new THREE.MeshStandardMaterial({
        color: 16183264,
        roughness: .68,
        metalness: 0
    });
    const cupSeamMat = new THREE.MeshBasicMaterial({
        color: 7761246
    });
    for (const sx of [ -.075, .075 ]) {
        const pile = new THREE.Group;
        pile.position.x = sx;
        cupStack.add(pile);
        for (let i = 0; i < 18; i++) {
            const c = new THREE.Group;
            const cupH = .061;
            const body = new THREE.Mesh(new THREE.CylinderGeometry(.073, .059, cupH, 22, 1, true), cupPaperMat);
            body.castShadow = false;
            body.position.y = cupH * .5;
            c.add(body);
            const rim = new THREE.Mesh(new THREE.TorusGeometry(.0722, .0031, 5, 22), cupRimMat);
            rim.rotation.x = Math.PI / 2;
            rim.position.y = cupH + .002;
            c.add(rim);
            const seam = new THREE.Mesh(new THREE.TorusGeometry(.0685, .0012, 4, 22), cupSeamMat);
            seam.rotation.x = Math.PI / 2;
            seam.position.y = cupH - .005;
            c.add(seam);
            c.position.y = i * .034;
            pile.add(c);
            cupsInHolder.push(c);
        }
    }
    const cupSign = new THREE.Mesh(new THREE.PlaneGeometry(.385, .185), new THREE.MeshStandardMaterial({
        map: tex.cupSign,
        color: 15525331,
        roughness: .72,
        metalness: .06,
        emissiveMap: tex.cupSign,
        emissive: 9075548,
        emissiveIntensity: .045
    }));
    cupSign.position.set(0, 1.14, .165);
    holder.add(cupSign);
    box(holder, holderMetal, .39, .022, .19, 0, 1.245, .06, {
        cast: false
    });
    const cupWarm = new THREE.PointLight(16765084, .4, 1.1, 2);
    cupWarm.position.set(1.62, 1.62, -.12);
    root.add(cupWarm);
    glow(holder, 16764822, .5, .15, 0, 1.64, .18);
    const posterGroup = new THREE.Group;
    posterGroup.position.set(2.55, 0, WORLD.wallZ + .04);
    root.add(posterGroup);
    const frameMat = new THREE.MeshStandardMaterial({
        color: 2961448,
        roughness: .52,
        metalness: .25
    });
    box(posterGroup, frameMat, .84, 1.64, .055, 0, 1.76, 0);
    box(posterGroup, new THREE.MeshStandardMaterial({
        color: 1515034,
        roughness: .35,
        metalness: .3
    }), .88, .035, .075, 0, 2.575, .01);
    for (const x of [ -.39, .39 ]) {
        for (const y of [ .96, 2.56 ]) {
            const b = new THREE.Mesh(new THREE.SphereGeometry(.017, 8, 6), new THREE.MeshStandardMaterial({
                color: 8219463,
                roughness: .4,
                metalness: .6
            }));
            b.position.set(x, y, .035);
            posterGroup.add(b);
        }
    }
    const poster = new THREE.Mesh(new THREE.PlaneGeometry(.75, 1.52), new THREE.MeshStandardMaterial({
        map: tex.wallPoster,
        color: 13155749,
        roughness: .95,
        metalness: 0,
        emissiveMap: tex.wallPoster,
        emissive: 3878944,
        emissiveIntensity: .035
    }));
    poster.position.set(0, 1.76, .032);
    posterGroup.add(poster);
    cylinderBetween(posterGroup, holderMetal, new THREE.Vector3(-.45, 2.57, .02), new THREE.Vector3(-.45, 2.86, .02), .008, 5);
    const joineryMat = new THREE.MeshPhysicalMaterial({
        color: 792340,
        roughness: .44,
        metalness: .16,
        clearcoat: .35,
        clearcoatRoughness: .26
    });
    const joineryTrim = new THREE.MeshStandardMaterial({
        color: 1779233,
        roughness: .36,
        metalness: .3
    });
    const pilaster = new THREE.Group;
    pilaster.position.set(3.3, 0, WORLD.wallZ + .06);
    root.add(pilaster);
    box(pilaster, joineryMat, .3, 4.15, .16, 0, 2.075, 0);
    box(pilaster, joineryTrim, .38, .1, .22, 0, .32, .01);
    box(pilaster, joineryTrim, .38, .09, .22, 0, 3.02, .01);
    box(pilaster, joineryTrim, .34, .07, .2, 0, 4.08, .01);
    for (const x of [ -.11, .11 ]) {
        box(pilaster, joineryTrim, .022, 2.55, .02, x, 1.68, .085);
    }
    const door = new THREE.Group;
    door.position.set(4.02, 0, WORLD.wallZ + .05);
    root.add(door);
    box(door, joineryMat, 1.05, 3.05, .1, 0, 1.525, 0);
    box(door, joineryTrim, 1.15, .1, .13, 0, .12, .01);
    for (const py of [ .74, 2.05 ]) {
        box(door, joineryTrim, .8, .035, .02, 0, py, .058);
        box(door, joineryMat, .72, 1.02, .025, 0, py + .015, .062);
        box(door, joineryTrim, .68, .025, .012, 0, py - .42, .08);
    }
    const doorKnob = new THREE.Mesh(new THREE.SphereGeometry(.043, 12, 10), new THREE.MeshStandardMaterial({
        color: 8153668,
        roughness: .32,
        metalness: .75
    }));
    doorKnob.position.set(-.38, 1.25, .1);
    door.add(doorKnob);
    const wallLamp = new THREE.Group;
    wallLamp.position.set(2.55, 2.73, WORLD.wallZ + .12);
    root.add(wallLamp);
    const cageMat = new THREE.MeshStandardMaterial({
        color: 1843485,
        roughness: .4,
        metalness: .6
    });
    box(wallLamp, cageMat, .15, .08, .12, 0, .14, 0);
    const lampArm = cylinderBetween(wallLamp, cageMat, new THREE.Vector3(0, .11, 0), new THREE.Vector3(0, .14, .22), .015, 6);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(.052, .17, .105, 18, 1, true), cageMat);
    shade.position.set(0, .15, .24);
    wallLamp.add(shade);
    const glassBulb = new THREE.Mesh(new THREE.SphereGeometry(.035, 12, 8), new THREE.MeshBasicMaterial({
        color: 16764550,
        toneMapped: false
    }));
    glassBulb.position.set(0, .09, .24);
    wallLamp.add(glassBulb);
    for (let i = 0; i < 4; i++) {
        const a = i / 4 * TAU;
        cyl(wallLamp, cageMat, .003, .003, .2, 4, Math.cos(a) * .115, 0, .24 + Math.sin(a) * .115);
    }
    glow(wallLamp, 16758382, .7, .24, 0, .1, .28);
    const serviceTex = makeTextTexture(384, 160, (ctx, w, h) => {
        ctx.fillStyle = "#c8c0a9";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "#4e493b";
        ctx.lineWidth = 4;
        ctx.strokeRect(9, 9, w - 18, h - 18);
        ctx.fillStyle = "#34352d";
        ctx.textAlign = "center";
        ctx.font = `italic 700 36px ${SERIF}`;
        ctx.fillText("ICE COLD", w / 2, 56);
        ctx.font = `16px ${SANS}`;
        ctx.fillText("DROP A COIN · LIFT A CUP", w / 2, 91);
        ctx.font = `13px ${SANS}`;
        ctx.fillStyle = "rgba(50,49,39,.7)";
        ctx.fillText("THE CORNER STAND · SINCE 1938", w / 2, 124);
        ctx.strokeStyle = "rgba(58,55,42,.35)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(50, 105);
        ctx.lineTo(w - 50, 105);
        ctx.stroke();
    });
    const servicePlate = new THREE.Mesh(new THREE.PlaneGeometry(.36, .15), new THREE.MeshStandardMaterial({
        map: serviceTex,
        roughness: .82
    }));
    servicePlate.position.set(2.55, .82, WORLD.wallZ + .043);
    root.add(servicePlate);
    box(root, frameMat, .4, .18, .03, 2.55, .82, WORLD.wallZ + .025, {
        cast: false
    });
    const hitboxes = [];
    const hitMat = new THREE.MeshBasicMaterial({
        visible: false
    });
    const hit = new THREE.Mesh(new THREE.BoxGeometry(1.25, 2.02, .82), hitMat);
    hit.position.set(0, 1.02, 0);
    v.add(hit);
    hitboxes.push(hit);
    const hitHolder = new THREE.Mesh(new THREE.BoxGeometry(.58, .92, .36), hitMat);
    hitHolder.position.set(1.62, 1.56, WORLD.wallZ + .1);
    root.add(hitHolder);
    hitboxes.push(hitHolder);
    contactShadow(root, .7, .12, 1.55, .78, .5);
    contactShadow(root, 1.6, -.38, .55, .4, .25);
    v.traverse(o => {
        if (o.isMesh) {
            o.castShadow = o.castShadow !== false;
        }
    });
    v.position.set(.7, 0, -.18);
    v.scale.set(1.13, 1.24, 1.13);
    return {
        group: v,
        holder: holder,
        posterGroup: posterGroup,
        hitboxes: hitboxes,
        logoMat: logoMat,
        coinGlowMat: coinGlowMat,
        coinGlow: coinGlow,
        buttonMats: buttonMats,
        buttons: buttons,
        keyLight: keyLight,
        outletGlowMat: outletGlowMat,
        outletLight: outletLight,
        outletPoint: outletPoint,
        dispensedCup: dispensedCup,
        cupStack: cupStack,
        cupsInHolder: cupsInHolder,
        badge: badge,
        cupLabel: cupLabel,
        frontZ: frontZ,
        outletY: outletY,
        machinePosition: new THREE.Vector3(.72, 1.35, frontZ - .18),
        glowHandles: [],
        localToWorld(x, y, z) {
            return v.localToWorld(new THREE.Vector3(x, y, z));
        }
    };
}

function buildPuddleRings(scene) {
    const group = new THREE.Group;
    scene.add(group);
    const rings = [];
    for (let i = 0; i < 8; i++) {
        const mat = new THREE.MeshBasicMaterial({
            color: 10335666,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
            toneMapped: false
        });
        const mesh = new THREE.Mesh(new THREE.RingGeometry(.968, 1, 96), mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = .04;
        mesh.visible = false;
        mesh.renderOrder = 6;
        group.add(mesh);
        rings.push({
            mesh: mesh,
            mat: mat,
            active: false,
            t0: 0,
            life: 0,
            max: 1
        });
    }
    return {
        group: group,
        rings: rings
    };
}

function buildFallingDrips(scene) {
    const group = new THREE.Group;
    scene.add(group);
    const mat = new THREE.MeshBasicMaterial({
        color: 10204853,
        transparent: true,
        opacity: .25,
        toneMapped: false
    });
    const drops = [];
    for (let i = 0; i < 8; i++) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(.012, 6, 5), mat);
        m.visible = false;
        group.add(m);
        drops.push({
            mesh: m,
            active: false,
            t: 0,
            x: 0,
            z: 0,
            startY: 2.8
        });
    }
    return {
        group: group,
        drops: drops,
        mat: mat
    };
}

export function buildWorld(scene, tex, renderer) {
    const root = new THREE.Group;
    scene.add(root);
    const ground = buildGround(root, tex, renderer);
    const facades = buildFacades(root, tex, renderer);
    const kiosk = buildKiosk(root, tex);
    const rack = buildNewspaperRack(root, tex);
    const crate = buildCrate(root, tex);
    const lamp = buildStreetlamp(root, tex);
    const vending = buildVendingMachine(root, tex);
    const ripples = buildPuddleRings(scene);
    const drips = buildFallingDrips(scene);
    return {
        root: root,
        ground: ground,
        facades: facades,
        kiosk: kiosk,
        rack: rack,
        crate: crate,
        lamp: lamp,
        vending: vending,
        ripples: ripples,
        drips: drips
    };
}
