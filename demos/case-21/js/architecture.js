import * as THREE from "three";

import { ROOM, archShape, archHole, normalizeShapeUV, mesh, box, roundedBox, plane, tube, cloneTextureWithRepeat, lathe, sphere, cylinder, TAU } from "./helpers.js";

function wallMaterial(base, repX, repY, extra = {}) {
    const mat = base.clone();
    mat.map = cloneTextureWithRepeat(base.map, repX, repY);
    if (base.bumpMap) mat.bumpMap = cloneTextureWithRepeat(base.bumpMap, repX, repY);
    mat.needsUpdate = true;
    Object.assign(mat, extra);
    return mat;
}

function archPerimeter(cx, r, base, spring, inset = 0, segments = 48) {
    const pts = [];
    const rr = r + inset;
    pts.push(new THREE.Vector3(cx - rr, base, 0));
    pts.push(new THREE.Vector3(cx - rr, spring, 0));
    for (let i = 1; i <= segments; i++) {
        const a = Math.PI - i / segments * Math.PI;
        pts.push(new THREE.Vector3(cx + Math.cos(a) * rr, spring + Math.sin(a) * rr, 0));
    }
    pts.push(new THREE.Vector3(cx + rr, base, 0));
    return pts;
}

function curveFromPoints(points) {
    return new THREE.CatmullRomCurve3(points, false, "centripetal", .4);
}

function addArchive(frame, mats) {
    const g = new THREE.Group;
    const {window: W} = ROOM;
    const cx = W.x;
    const r = W.width / 2;
    const zFrame = ROOM.back + .09;
    const perimeter = archPerimeter(cx, r, W.sill, W.spring, .015);
    const archCurve = new THREE.CatmullRomCurve3(perimeter.map(p => new THREE.Vector3(p.x, p.y, 0)), false, "centripetal", .2);
    const archTube = mesh(new THREE.TubeGeometry(archCurve, 96, .115, 8, false), mats.windowWood);
    archTube.position.z = zFrame;
    archTube.castShadow = true;
    g.add(archTube);
    for (const sx of [ -1, 1 ]) {
        const jamb = box(.16, W.spring - W.sill, .16, mats.windowWoodDark, {
            pos: [ cx + sx * (r + .02), (W.sill + W.spring) / 2, zFrame ],
            cast: true
        });
        g.add(jamb);
        const plinth = box(.26, .3, .22, mats.windowWoodDark, {
            pos: [ cx + sx * (r + .02), W.sill + .1, zFrame ],
            cast: true
        });
        g.add(plinth);
    }
    const innerCurve = new THREE.CatmullRomCurve3(archPerimeter(cx, r - .1, W.sill + .02, W.spring, -.03).map(p => new THREE.Vector3(p.x, p.y, 0)), false, "centripetal", .2);
    const inner = mesh(new THREE.TubeGeometry(innerCurve, 96, .055, 6, false), mats.windowWoodDark);
    inner.position.z = zFrame + .06;
    g.add(inner);
    const dividerXs = [ -.34, 0, .34 ].map(t => cx + t * W.width);
    for (let i = 0; i < dividerXs.length; i++) {
        const x = dividerXs[i];
        const top = W.spring + Math.sqrt(Math.max(0, r * r - (x - cx) ** 2)) - .09;
        const height = top - W.sill;
        const bar = box(.085, height, .11, i === 1 ? mats.windowWoodDark : mats.windowWood, {
            pos: [ x, W.sill + height / 2, zFrame + .055 ],
            cast: true
        });
        g.add(bar);
        const collar = box(.13, .1, .14, mats.windowWoodDark, {
            pos: [ x, top - .02, zFrame + .06 ],
            cast: true
        });
        g.add(collar);
    }
    {
        const transomPts = [];
        for (let i = 0; i <= 20; i++) {
            const f = i / 20;
            const a = Math.PI - f * Math.PI;
            transomPts.push(new THREE.Vector3(cx + Math.cos(a) * 1.62, 3.82 + Math.sin(a) * .98, 0));
        }
        const transomCurve = new THREE.CatmullRomCurve3(transomPts, false, "centripetal", .25);
        const transom = mesh(new THREE.TubeGeometry(transomCurve, 60, .055, 7, false), mats.windowWood);
        transom.position.z = zFrame + .075;
        transom.castShadow = true;
        g.add(transom);
        const springRail = box(3.34, .07, .075, mats.windowWood, {
            pos: [ cx, 3.82, zFrame + .075 ],
            cast: true
        });
        g.add(springRail);
        for (const sx of [ -1, 1 ]) {
            const c = new THREE.CatmullRomCurve3([ new THREE.Vector3(cx + sx * 1.62, 3.82, 0), new THREE.Vector3(cx + sx * 1.3, 4.42, 0), new THREE.Vector3(cx + sx * .95, 4.76, 0) ], false, "centripetal", .3);
            const bar = mesh(new THREE.TubeGeometry(c, 18, .022, 5, false), mats.windowWoodDark);
            bar.position.z = zFrame + .085;
            g.add(bar);
        }
    }
    const traceryGroup = new THREE.Group;
    const th = .026;
    const curls = [ [ [ cx - 1.64, 3.22 ], [ cx - 1.3, 3.65 ], [ cx - 1.56, 4.18 ], [ cx - 1.12, 4.64 ], [ cx - 1.38, 4.9 ] ], [ [ cx + 1.64, 3.22 ], [ cx + 1.3, 3.65 ], [ cx + 1.56, 4.18 ], [ cx + 1.12, 4.64 ], [ cx + 1.38, 4.9 ] ], [ [ cx - .6, 4.83 ], [ cx - .48, 4.5 ], [ cx - .16, 4.38 ], [ cx - .04, 4.15 ] ], [ [ cx + .6, 4.83 ], [ cx + .48, 4.5 ], [ cx + .16, 4.38 ], [ cx + .04, 4.15 ] ], [ [ cx - .25, 4.18 ], [ cx - .4, 4.34 ], [ cx - .6, 4.32 ], [ cx - .78, 4.19 ] ], [ [ cx + .25, 4.18 ], [ cx + .4, 4.34 ], [ cx + .6, 4.32 ], [ cx + .78, 4.19 ] ] ];
    for (const pts of curls) {
        const c = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, "catmullrom", .4);
        const t = mesh(new THREE.TubeGeometry(c, 32, th, 5, false), mats.windowWoodDark);
        t.position.z = zFrame + .085;
        t.castShadow = true;
        traceryGroup.add(t);
    }
    const rosette = new THREE.Group;
    for (let i = 0; i < 10; i++) {
        const a = i / 10 * TAU;
        const petal = sphere(.045, mats.windowWoodDark, {
            segments: 8
        });
        petal.scale.set(1.65, 1, .32);
        petal.position.set(Math.cos(a) * .11, Math.sin(a) * .11, 0);
        petal.rotation.z = a;
        rosette.add(petal);
    }
    const roseCenter = cylinder(.04, .04, .03, mats.brassAged, {
        rot: [ Math.PI / 2, 0, 0 ],
        segments: 12
    });
    rosette.add(roseCenter);
    rosette.position.set(cx, W.spring + r - .28, zFrame + .095);
    traceryGroup.add(rosette);
    g.add(traceryGroup);
    const outerPts = archPerimeter(cx, r, W.sill - .12, W.spring, .31);
    const outerCurve = new THREE.CatmullRomCurve3(outerPts.map(p => new THREE.Vector3(p.x, p.y, 0)), false, "centripetal", .2);
    const plasterArchMat = mats.plasterShadow.clone();
    plasterArchMat.color = new THREE.Color(12365465);
    const plasterArch = mesh(new THREE.TubeGeometry(outerCurve, 96, .035, 7, false), plasterArchMat);
    plasterArch.position.z = ROOM.back + .055;
    g.add(plasterArch);
    const ghostPts = archPerimeter(cx, r, W.sill - .26, W.spring, .5);
    const ghostCurve = new THREE.CatmullRomCurve3(ghostPts.map(p => new THREE.Vector3(p.x, p.y, 0)), false, "centripetal", .2);
    const ghostArch = mesh(new THREE.TubeGeometry(ghostCurve, 96, .008, 5, false), mats.plasterShadow);
    ghostArch.position.z = ROOM.back + .035;
    ghostArch.material = mats.plasterRelief.clone();
    ghostArch.material.color = new THREE.Color(11115914);
    g.add(ghostArch);
    for (const sx of [ -1, 1 ]) {
        const sway = new THREE.CatmullRomCurve3([ new THREE.Vector3(cx + sx * (r + .28), W.spring + .06, 0), new THREE.Vector3(cx + sx * (r + .56), W.spring + .22, 0), new THREE.Vector3(cx + sx * (r + .49), W.spring + .55, 0), new THREE.Vector3(cx + sx * (r + .75), W.spring + .62, 0) ], false, "catmullrom", .4);
        const swirl = mesh(new THREE.TubeGeometry(sway, 28, .02, 5, false), mats.plasterRelief);
        swirl.position.z = ROOM.back + .06;
        g.add(swirl);
        const leaf = mesh(new THREE.SphereGeometry(.075, 12, 8), mats.plasterRelief);
        leaf.scale.set(1.6, .55, .4);
        leaf.position.set(cx + sx * (r + .72), W.spring + .55, ROOM.back + .06);
        leaf.rotation.z = sx * .6;
        g.add(leaf);
    }
    const sill = box(W.width + .45, .12, .34, mats.windowSill, {
        pos: [ cx, W.sill - .04, ROOM.back + .2 ],
        cast: true
    });
    g.add(sill);
    const sillLip = box(W.width + .7, .05, .12, mats.plasterRelief, {
        pos: [ cx, W.sill - .11, ROOM.back + .36 ]
    });
    g.add(sillLip);
    for (const sx of [ -1, 1 ]) {
        const pts = [ new THREE.Vector3(sx * 3.55, 4.98, ROOM.back + .05), new THREE.Vector3(sx * 3.8, 4.85, ROOM.back + .05), new THREE.Vector3(sx * 3.95, 4.97, ROOM.back + .05), new THREE.Vector3(sx * 3.85, 5.2, ROOM.back + .05), new THREE.Vector3(sx * 4.14, 5.3, ROOM.back + .05) ];
        const c = new THREE.CatmullRomCurve3(pts, false, "catmullrom", .4);
        const roc = mesh(new THREE.TubeGeometry(c, 24, .018, 5, false), mats.plasterRelief);
        g.add(roc);
    }
    return g;
}

function addWindowLightbox(parent, mats, tex) {
    const {window: W} = ROOM;
    const cx = W.x, r = W.width / 2;
    const ext = plane(10, 8.5, mats.exterior.clone(), {
        pos: [ cx, 3, ROOM.back - 1.35 ],
        receive: false
    });
    ext.material.toneMapped = true;
    ext.renderOrder = -3;
    parent.add(ext);
    const glassShape = archShape({
        width: W.width,
        base: W.sill,
        spring: W.spring,
        top: W.top,
        cx: W.x
    });
    const glassGeo = new THREE.ShapeGeometry(glassShape, 48);
    normalizeShapeUV(glassGeo, W.width, W.top - W.sill, cx - r, W.sill);
    const glass = mesh(glassGeo, mats.stainedGlass, {
        pos: [ cx - cx, 0, ROOM.back + .02 ],
        receive: false
    });
    glass.position.set(0, 0, ROOM.back + .02);
    glass.castShadow = false;
    glass.renderOrder = 1;
    glass.position.set(0, 0, ROOM.back + .02);
    glass.name = "stainedGlass";
    parent.add(glass);
    const backGlowMat = new THREE.MeshBasicMaterial({
        color: 16770988,
        transparent: true,
        opacity: .06,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.FrontSide,
        toneMapped: false
    });
    const glow = mesh(glassGeo.clone(), backGlowMat, {
        pos: [ 0, 0, ROOM.back - .06 ],
        receive: false
    });
    glow.name = "glassGlow";
    glow.scale.set(.995, .995, 1);
    parent.add(glow);
    return {
        ext: ext,
        glass: glass,
        glow: glow,
        backGlowMat: backGlowMat
    };
}

function makeRugs(parent, mats) {
    const group = new THREE.Group;
    group.name = "rugs";
    const baseGeo = new THREE.PlaneGeometry(8.15, 10.1, 1, 1);
    const base = mesh(baseGeo, mats.rugCream, {
        rot: [ -Math.PI / 2, 0, .013 ],
        pos: [ .03, .006, -.25 ]
    });
    base.receiveShadow = true;
    group.add(base);
    const mainGeo = new THREE.PlaneGeometry(6.25, 9.1, 1, 1);
    const main = mesh(mainGeo, mats.rug, {
        rot: [ -Math.PI / 2, 0, -.012 ],
        pos: [ -.12, .014, -.24 ]
    });
    main.receiveShadow = true;
    main.name = "mainRug";
    group.add(main);
    parent.add(group);
    return group;
}

function buildDoorway(parent, mats) {
    const g = new THREE.Group;
    const zDoor = -4.9;
    const width = 1.25;
    const height = 3.35;
    const spring = 2.55;
    const base = 0;
    const hall = new THREE.Group;
    const floorMat = mats.woodDark.clone();
    const floor = box(1.7, .05, 2, floorMat, {
        pos: [ -5.55, -.026, zDoor ]
    });
    hall.add(floor);
    const backMat = mats.terracotta.clone();
    backMat.color = new THREE.Color(7689026);
    const back = plane(2, 3.9, backMat, {
        pos: [ -6.42, 1.95, zDoor ],
        rot: [ 0, Math.PI / 2, 0 ]
    });
    hall.add(back);
    const ceil = box(1.7, .08, 2, mats.woodWalnut, {
        pos: [ -5.55, 3.55, zDoor ]
    });
    hall.add(ceil);
    const sideA = box(1.7, 3.9, .08, backMat, {
        pos: [ -5.55, 1.95, zDoor - 1 ]
    });
    const sideB = sideA.clone();
    sideB.position.z = zDoor + 1;
    hall.add(sideA, sideB);
    const shelf = new THREE.Group;
    const shelfMat = mats.woodDark;
    const backShelf = box(.1, 2.4, 1.2, shelfMat, {
        pos: [ -6.25, 1.6, zDoor ]
    });
    hall.add(backShelf);
    for (let s = 0; s < 3; s++) {
        const board = box(.26, .055, 1.15, shelfMat, {
            pos: [ -6.13, .7 + s * .62, zDoor ]
        });
        hall.add(board);
        const rnd = Math.random;
        for (let b = 0; b < 9; b++) {
            const book = box(.17, .25 + rnd() * .16, .045 + rnd() * .035, mats.book, {
                pos: [ -6.13, .86 + s * .62 + (.25 + rnd() * .16) / 2, zDoor - .48 + b * .105 ],
                rot: [ 0, 0, 0 ],
                receive: false
            });
            book.material = [ mats.leatherRed, mats.leatherBlue, mats.leatherGreen, mats.leatherTan ][(b + s) % 4];
            hall.add(book);
        }
    }
    const glowMat = mats.lampShadeInner.clone();
    glowMat.emissiveIntensity = .8;
    const littleLamp = mesh(new THREE.SphereGeometry(.07, 12, 8), new THREE.MeshBasicMaterial({
        color: 16763003,
        toneMapped: false
    }), {
        pos: [ -5.9, 2.35, zDoor - .1 ]
    });
    hall.add(littleLamp);
    const lampBase = cylinder(.03, .06, .55, mats.brassAged, {
        pos: [ -5.9, 2.02, zDoor - .1 ],
        segments: 12
    });
    hall.add(lampBase);
    g.add(hall);
    const revealMat = mats.terracotta.clone();
    revealMat.color = new THREE.Color(8215368);
    for (const sz of [ -1, 1 ]) {
        const reveal = box(.28, height, .025, revealMat, {
            pos: [ ROOM.left - .14, height / 2, zDoor + sz * width / 2 ]
        });
        g.add(reveal);
    }
    const headReveal = new THREE.Mesh(new THREE.CylinderGeometry(width / 2, width / 2, .28, 32, 1, false, 0, Math.PI), revealMat);
    headReveal.rotation.z = Math.PI / 2;
    headReveal.rotation.y = Math.PI / 2;
    headReveal.position.set(ROOM.left - .14, spring, zDoor);
    g.add(headReveal);
    const frame = new THREE.Group;
    const pts = archPerimeter(0, width / 2, 0, spring - 0, .01);
    const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(0, p.y, p.x)), false, "centripetal", .2);
    const arch = mesh(new THREE.TubeGeometry(curve, 56, .065, 7, false), mats.woodDark);
    arch.position.set(ROOM.left + .025, .12, zDoor);
    arch.castShadow = true;
    frame.add(arch);
    for (const sx of [ -1, 1 ]) {
        const jamb = box(.13, spring, .13, mats.woodDark, {
            pos: [ ROOM.left + .03, spring / 2, zDoor + sx * (width / 2 + .01) ],
            cast: true
        });
        frame.add(jamb);
    }
    const haloPts = archPerimeter(0, width / 2, .07, spring, .18);
    const haloCurve = new THREE.CatmullRomCurve3(haloPts.map(p => new THREE.Vector3(0, p.y, p.x)), false, "centripetal", .2);
    const halo = mesh(new THREE.TubeGeometry(haloCurve, 48, .035, 6, false), mats.plasterRelief);
    halo.position.set(ROOM.left + .06, .12, zDoor);
    frame.add(halo);
    g.add(frame);
    parent.add(g);
    return {
        group: g,
        doorZ: zDoor,
        width: width,
        height: height
    };
}

function addFrontDoor(parent, mats) {
    const g = new THREE.Group;
    const doorW = 2.2;
    const doorH = 3.15;
    const thick = .075;
    const panel = new THREE.Group;
    const body = box(doorW, doorH, thick, mats.woodDark, {
        pos: [ doorW / 2, doorH / 2, 0 ],
        cast: true
    });
    panel.add(body);
    const stileMat = mats.carvedWood;
    for (const x of [ .12, doorW / 2, doorW - .1 ]) {
        const stile = box(.1, doorH - .1, thick + .04, stileMat, {
            pos: [ x, doorH / 2, .03 ],
            cast: true
        });
        panel.add(stile);
    }
    for (const y of [ .65, 1.5, 2.4 ]) {
        const rail = box(doorW - .16, .11, thick + .035, stileMat, {
            pos: [ doorW / 2, y, .025 ],
            cast: true
        });
        panel.add(rail);
    }
    for (const x of [ doorW * .28, doorW * .72 ]) {
        const inlay = box(doorW * .33, 1.55, thick + .02, mats.carvedWood, {
            pos: [ x, 1.55, .04 ],
            cast: true
        });
        panel.add(inlay);
        const frame = box(doorW * .36, 1.62, thick + .01, mats.woodDark, {
            pos: [ x, 1.55, .028 ],
            cast: true
        });
        panel.add(frame);
        panel.add(inlay);
    }
    const knob = sphere(.075, mats.brass, {
        pos: [ doorW - .26, 1.06, thick / 2 + .07 ],
        segments: 20
    });
    panel.add(knob);
    const rose = cylinder(.055, .055, .025, mats.brassAged, {
        pos: [ doorW - .26, 1.06, thick / 2 + .04 ],
        rot: [ Math.PI / 2, 0, 0 ],
        segments: 16
    });
    panel.add(rose);
    panel.position.set(ROOM.left + .035, 0, 1.08);
    panel.rotation.y = -.785;
    g.add(panel);
    const frame = box(.12, 3.25, .16, mats.woodDark, {
        pos: [ ROOM.left + .03, 1.62, 1.08 + 1.08 ],
        cast: true
    });
    g.add(frame);
    parent.add(g);
    return g;
}

export function buildArchitecture(scene, mats, tex) {
    const root = new THREE.Group;
    root.name = "architecture";
    const {window: W} = ROOM;
    const floor = mesh(new THREE.PlaneGeometry(ROOM.width, ROOM.depth), mats.floor, {
        rot: [ -Math.PI / 2, 0, 0 ],
        pos: [ 0, 0, -.25 ]
    });
    floor.receiveShadow = true;
    root.add(floor);
    const ceilingMat = wallMaterial(mats.creamWall, 2.4, 3);
    ceilingMat.color = new THREE.Color(15789026);
    ceilingMat.emissive = new THREE.Color(6182215);
    ceilingMat.emissiveIntensity = .16;
    const ceiling = mesh(new THREE.PlaneGeometry(ROOM.width, ROOM.depth), ceilingMat, {
        rot: [ Math.PI / 2, 0, 0 ],
        pos: [ 0, ROOM.height, -.25 ]
    });
    ceiling.receiveShadow = true;
    root.add(ceiling);
    const backShape = new THREE.Shape;
    const x0 = ROOM.left, x1 = ROOM.right, yy0 = 0, yy1 = ROOM.height;
    backShape.moveTo(x0, yy0);
    backShape.lineTo(x1, yy0);
    backShape.lineTo(x1, yy1);
    backShape.lineTo(x0, yy1);
    backShape.closePath();
    backShape.holes.push(archHole({
        width: W.width,
        base: W.sill,
        spring: W.spring,
        top: W.top,
        cx: W.x
    }));
    const backGeo = new THREE.ShapeGeometry(backShape, 40);
    normalizeShapeUV(backGeo, ROOM.width, ROOM.height, x0, 0);
    const backMat = wallMaterial(mats.sage, 3.2, 1.9);
    const backWall = mesh(backGeo, backMat, {
        pos: [ 0, 0, ROOM.back ],
        receive: true
    });
    backWall.castShadow = true;
    root.add(backWall);
    const leftShape = new THREE.Shape;
    const L = ROOM.depth, H = ROOM.height;
    leftShape.moveTo(0, 0);
    leftShape.lineTo(L, 0);
    leftShape.lineTo(L, H);
    leftShape.lineTo(0, H);
    leftShape.closePath();
    const doorZ = -4.9;
    const localDoorX = ROOM.front - doorZ;
    leftShape.holes.push(archHole({
        width: 1.25,
        base: 0,
        spring: 2.55,
        top: 3.35,
        cx: localDoorX
    }));
    const leftGeo = new THREE.ShapeGeometry(leftShape, 36);
    normalizeShapeUV(leftGeo, L, H, 0, 0);
    const leftMat = wallMaterial(mats.terracotta, 4.2, 1.95);
    const leftWall = mesh(leftGeo, leftMat, {
        pos: [ ROOM.left, 0, ROOM.front ],
        rot: [ 0, Math.PI / 2, 0 ]
    });
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    root.add(leftWall);
    const rightMat = wallMaterial(mats.sage, 4.2, 1.95);
    rightMat.color = new THREE.Color(11188397);
    const rightWall = mesh(new THREE.PlaneGeometry(ROOM.depth, ROOM.height), rightMat, {
        pos: [ ROOM.right, ROOM.height / 2, -.25 ],
        rot: [ 0, -Math.PI / 2, 0 ]
    });
    rightWall.receiveShadow = true;
    root.add(rightWall);
    const peelBack = mesh(backGeo.clone(), mats.wallPatinaCool, {
        pos: [ 0, 0, ROOM.back + .008 ],
        receive: false
    });
    peelBack.renderOrder = 1;
    root.add(peelBack);
    const peelLeft = mesh(leftGeo.clone(), mats.wallPatinaWarm, {
        pos: [ ROOM.left + .008, 0, ROOM.front ],
        rot: [ 0, Math.PI / 2, 0 ],
        receive: false
    });
    peelLeft.renderOrder = 1;
    root.add(peelLeft);
    {
        const peelRight = mesh(new THREE.PlaneGeometry(ROOM.depth, ROOM.height), mats.wallPatinaCool, {
            pos: [ ROOM.right - .008, ROOM.height / 2, -.25 ],
            rot: [ 0, -Math.PI / 2, 0 ],
            receive: false
        });
        peelRight.renderOrder = 1;
        root.add(peelRight);
    }
    const frontMat = wallMaterial(mats.creamWall, 3.1, 1.8);
    const frontWall = mesh(new THREE.PlaneGeometry(ROOM.width, ROOM.height), frontMat, {
        pos: [ 0, ROOM.height / 2, ROOM.front ],
        rot: [ 0, Math.PI, 0 ]
    });
    frontWall.receiveShadow = true;
    root.add(frontWall);
    const skirtMat = mats.woodDark;
    const skirting = [ box(ROOM.width - .06, .2, .08, skirtMat, {
        pos: [ 0, .1, ROOM.back + .045 ],
        cast: false
    }), box(ROOM.depth - .06, .2, .08, skirtMat, {
        pos: [ ROOM.left + .045, .1, -.25 ],
        rot: [ 0, Math.PI / 2, 0 ],
        cast: false
    }), box(ROOM.depth - .06, .2, .08, skirtMat, {
        pos: [ ROOM.right - .045, .1, -.25 ],
        rot: [ 0, Math.PI / 2, 0 ],
        cast: false
    }), box(ROOM.width - .06, .2, .08, skirtMat, {
        pos: [ 0, .1, ROOM.front - .045 ],
        cast: false
    }) ];
    skirting.forEach(s => root.add(s));
    const corniceMat = mats.plasterRelief;
    const cornice = [ box(ROOM.width, .13, .16, corniceMat, {
        pos: [ 0, ROOM.height - .14, ROOM.back + .09 ],
        receive: false
    }), box(ROOM.depth, .13, .16, corniceMat, {
        pos: [ ROOM.left + .09, ROOM.height - .14, -.25 ],
        rot: [ 0, Math.PI / 2, 0 ],
        receive: false
    }), box(ROOM.depth, .13, .16, corniceMat, {
        pos: [ ROOM.right - .09, ROOM.height - .14, -.25 ],
        rot: [ 0, Math.PI / 2, 0 ],
        receive: false
    }), box(ROOM.width, .13, .16, corniceMat, {
        pos: [ 0, ROOM.height - .14, ROOM.front - .09 ],
        receive: false
    }) ];
    cornice.forEach(c => root.add(c));
    const corniceLine = [ box(ROOM.width, .035, .2, mats.plasterShadow, {
        pos: [ 0, ROOM.height - .23, ROOM.back + .11 ],
        receive: false
    }), box(ROOM.depth, .035, .2, mats.plasterShadow, {
        pos: [ ROOM.left + .11, ROOM.height - .23, -.25 ],
        rot: [ 0, Math.PI / 2, 0 ],
        receive: false
    }), box(ROOM.depth, .035, .2, mats.plasterShadow, {
        pos: [ ROOM.right - .11, ROOM.height - .23, -.25 ],
        rot: [ 0, Math.PI / 2, 0 ],
        receive: false
    }) ];
    corniceLine.forEach(c => root.add(c));
    const rose = new THREE.Group;
    for (let ring = 0; ring < 3; ring++) {
        const torus = mesh(new THREE.TorusGeometry(.23 - ring * .06, .015, 6, 48), mats.plasterRelief, {
            rot: [ Math.PI / 2, 0, 0 ],
            receive: false
        });
        rose.add(torus);
    }
    rose.position.set(0, ROOM.height - .02, -1.1);
    root.add(rose);
    const windowParts = addWindowLightbox(root, mats, tex);
    root.add(addArchive(root, mats));
    makeRugs(root, mats);
    buildDoorway(root, mats);
    addFrontDoor(root, mats);
    const artGroup = new THREE.Group;
    const botanical = plane(.62, .86, mats.botanical, {
        pos: [ 3.92, 2.55, ROOM.back + .035 ],
        receive: false
    });
    botanical.castShadow = false;
    artGroup.add(botanical);
    const botanicalFrameMat = mats.woodDark;
    const bfTop = box(.74, .045, .045, botanicalFrameMat, {
        pos: [ 3.92, 3.02, ROOM.back + .06 ],
        receive: false
    });
    const bfBot = box(.74, .045, .045, botanicalFrameMat, {
        pos: [ 3.92, 2.08, ROOM.back + .06 ],
        receive: false
    });
    const bfL = box(.045, .95, .045, botanicalFrameMat, {
        pos: [ 3.56, 2.55, ROOM.back + .06 ],
        receive: false
    });
    const bfR = box(.045, .95, .045, botanicalFrameMat, {
        pos: [ 4.28, 2.55, ROOM.back + .06 ],
        receive: false
    });
    const mat = plane(.72, .96, mats.paper, {
        pos: [ 3.92, 2.55, ROOM.back + .02 ],
        receive: false
    });
    artGroup.add(mat, bfTop, bfBot, bfL, bfR);
    const small = plane(.34, .42, mats.sketchA, {
        pos: [ 3.98, 1.55, ROOM.back + .062 ],
        receive: false
    });
    artGroup.add(small);
    const smallFrame = box(.4, .48, .035, botanicalFrameMat, {
        pos: [ 3.98, 1.55, ROOM.back + .025 ],
        receive: false
    });
    artGroup.add(smallFrame);
    const posterG = new THREE.Group;
    const poster = plane(1.22, 1.95, mats.poster, {
        receive: false
    });
    posterG.add(poster);
    const pFrameMat = mats.woodWalnut;
    posterG.add(box(1.34, .055, .05, pFrameMat, {
        pos: [ 0, 1, -.015 ],
        receive: false
    }));
    posterG.add(box(1.34, .055, .05, pFrameMat, {
        pos: [ 0, -1, -.015 ],
        receive: false
    }));
    posterG.add(box(.055, 2.05, .05, pFrameMat, {
        pos: [ -.64, 0, -.015 ],
        receive: false
    }));
    posterG.add(box(.055, 2.05, .05, pFrameMat, {
        pos: [ .64, 0, -.015 ],
        receive: false
    }));
    posterG.add(box(.5, .015, .03, mats.brassAged, {
        pos: [ 0, 1.02, .01 ],
        receive: false
    }));
    posterG.position.set(ROOM.left + .045, 2.66, -.65);
    posterG.rotation.y = Math.PI / 2;
    artGroup.add(posterG);
    for (let i = 0; i < 2; i++) {
        const sketchTexMat = i === 0 ? mats.sketchA : mats.sketchB;
        const sg = new THREE.Group;
        const sk = plane(.42 + i * .06, .53, sketchTexMat, {
            receive: false
        });
        sg.add(sk);
        sg.add(box(.52 + i * .06, .62, .035, mats.woodWalnut, {
            pos: [ 0, 0, -.02 ],
            receive: false
        }));
        sg.position.set(ROOM.left + .04, 2.3 - i * .62 + .25, -3.52 - i * .58);
        sg.rotation.y = Math.PI / 2;
        artGroup.add(sg);
    }
    const sketchGroup = new THREE.Group;
    for (let i = 0; i < 2; i++) {
        const s = plane(.52, .68, mats.woodDark, {
            receive: false
        });
        s.position.set(ROOM.left + .04, 3.05, -2.65 - i * .78);
        s.rotation.y = Math.PI / 2;
        const canvas = plane(.43, .59, i === 0 ? mats.sketchA : mats.sketchB, {
            receive: false
        });
        canvas.position.set(ROOM.left + .065, 3.05, -2.65 - i * .78);
        canvas.rotation.y = Math.PI / 2;
        sketchGroup.add(s, canvas);
    }
    artGroup.add(sketchGroup);
    root.add(artGroup);
    scene.add(root);
    return {
        root: root,
        windowParts: windowParts,
        backWall: backWall,
        leftWall: leftWall,
        rightWall: rightWall,
        floor: floor,
        ceiling: ceiling
    };
}
