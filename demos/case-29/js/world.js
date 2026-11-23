import * as THREE from "three";

import { box, cylinder, mesh, sphere, torus, disc, flange, pipeThrough, curveFrom, pointedArchShape, archBandShape, wallWithArchHoles, clusteredPier, plateGirder, archCurvePoints, makeMistSprite, setShadows, rng, cylinderBetween, canvasLabelTexture, TAU } from "./lib.js";

export const HALL = {
    halfWidth: 7.2,
    farZ: -19,
    nearZ: 14,
    wallHeight: 22,
    vaultSpring: 14.6,
    vaultApex: 21.9
};

export const WINDOW = {
    centers: [ -2.9, 2.9 ],
    width: 3.5,
    sill: 3.5,
    spring: 7.6,
    apex: 12.4,
    border: .33
};

export const COLUMN_Z = [ -3.1, -9.5, -15.9 ];

export function buildHall(scene, T, M) {
    const root = new THREE.Group;
    root.name = "PumpingStationArchitecture";
    scene.add(root);
    const animated = {
        wisps: [],
        windowGlows: [],
        dust: null,
        upperWindowMat: null
    };
    const floor = mesh(new THREE.PlaneGeometry(HALL.halfWidth * 2, HALL.nearZ - HALL.farZ, 1, 1), M.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, (HALL.nearZ + HALL.farZ) / 2);
    floor.receiveShadow = true;
    floor.castShadow = false;
    root.add(floor);
    const gutterMat = M.dirt;
    for (const x of [ -HALL.halfWidth + .18, HALL.halfWidth - .18 ]) {
        const g = box(.28, .025, HALL.nearZ - HALL.farZ, gutterMat, x, .014, (HALL.nearZ + HALL.farZ) / 2);
        g.receiveShadow = true;
        root.add(g);
    }
    const grate = new THREE.Group;
    const frameMat = M.ironBlack;
    const grateFrame = box(1.25, .025, .78, frameMat, 0, .013, 0);
    grate.add(grateFrame);
    const slotMat = M.dirt;
    for (let i = 0; i < 9; i++) {
        const slat = box(1.08, .012, .035, slotMat, 0, .028, -.3 + i * .075);
        grate.add(slat);
    }
    grate.position.set(3.8, 0, 1.6);
    grate.rotation.y = -.06;
    root.add(grate);
    const channel = box(6.2, .035, .26, M.ironBlack, .8, .018, -2);
    root.add(channel);
    for (let i = 0; i < 14; i++) {
        root.add(box(.035, .02, .34, M.iron, .8 - 2.9 + i * .45, .038, -2));
    }
    const sideDepth = HALL.nearZ - HALL.farZ;
    const sideCenterZ = (HALL.nearZ + HALL.farZ) / 2;
    const leftWall = mesh(new THREE.PlaneGeometry(sideDepth, HALL.wallHeight), M.wall);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-HALL.halfWidth, HALL.wallHeight / 2, sideCenterZ);
    leftWall.receiveShadow = true;
    leftWall.castShadow = false;
    root.add(leftWall);
    const rightWallMat = M.wall.clone();
    const rightBrickMap = T.wallMap.clone();
    rightBrickMap.repeat.set(8, 5);
    rightBrickMap.needsUpdate = true;
    const rightBrickBump = T.wallBump.clone();
    rightBrickBump.repeat.copy(rightBrickMap.repeat);
    rightBrickBump.needsUpdate = true;
    const rightBrickRough = T.wallRough.clone();
    rightBrickRough.repeat.copy(rightBrickMap.repeat);
    rightBrickRough.needsUpdate = true;
    rightWallMat.map = rightBrickMap;
    rightWallMat.bumpMap = rightBrickBump;
    rightWallMat.bumpScale = .07;
    rightWallMat.roughnessMap = rightBrickRough;
    rightWallMat.color.setHex(4208685);
    rightWallMat.roughness = .98;
    rightWallMat.envMapIntensity = .1;
    rightWallMat.needsUpdate = true;
    const rightWall = mesh(new THREE.PlaneGeometry(sideDepth, HALL.wallHeight), rightWallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(HALL.halfWidth, HALL.wallHeight / 2, sideCenterZ);
    rightWall.receiveShadow = true;
    rightWall.castShadow = false;
    root.add(rightWall);
    for (const side of [ -1, 1 ]) {
        const x = side * (HALL.halfWidth - .13);
        const base = box(.26, .75, sideDepth, M.stoneDark, x, .38, sideCenterZ);
        base.receiveShadow = true;
        root.add(base);
        const ledge = box(.4, .13, sideDepth, M.stoneTrim, side * (HALL.halfWidth - .18), .82, sideCenterZ);
        root.add(ledge);
        const band = box(.28, .18, sideDepth, M.stoneTrim, side * (HALL.halfWidth - .12), 6.8, sideCenterZ);
        root.add(band);
        for (let i = 0; i < 5; i++) {
            const z = 8 - i * 6.2;
            const p = box(.33, 6.5, .65, M.stoneDark, side * (HALL.halfWidth - .14), 3.4, z);
            p.receiveShadow = true;
            root.add(p);
        }
    }
    for (const z of [ -7.4, -13.9 ]) {
        const x = -HALL.halfWidth + .36;
        root.add(pipeThrough([ [ x, .15, z ], [ x, 2.5, z ], [ x + .02, 5.8, z ], [ x, 9.6, z ], [ x - .1, 13.2, z ] ], .075, M.ironBlack, 40, 8));
        for (let y = 1.5; y < 11; y += 2.2) {
            const bracket = box(.26, .08, .16, M.iron, x + .15, y, z);
            root.add(bracket);
        }
    }
    {
        const addStain = (side, y, z, sx, sy, opacity = .66, tint = 16777215) => {
            const mat = M.dampStain.clone();
            mat.opacity = opacity;
            mat.color.setHex(tint);
            const p = new THREE.Mesh(new THREE.PlaneGeometry(sx, sy), mat);
            p.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
            p.position.set(side * (HALL.halfWidth - .055), y, z);
            p.renderOrder = 1;
            root.add(p);
        };
        addStain(-1, 8.7, -5, 4.8, 5.4, .42);
        addStain(-1, 3.2, -6.8, 5, 5.6, .52);
        addStain(-1, 1, 2.6, 4.3, 2.4, .46, 9278588);
        addStain(-1, 6.4, -3.2, 4.8, 5, .38, 9146236);
        addStain(-1, 6.8, -9.6, 5.4, 6.4, .5, 7896426);
        addStain(-1, 2.2, -10.4, 4, 3, .39, 7830119);
        addStain(1, 6.9, -5.6, 4.4, 5.8, .42);
        addStain(1, 5.2, -1, 4, 4.6, .34, 9076843);
        addStain(1, 1.2, -.3, 4.6, 2.8, .42, 9409659);
        addStain(1, 7.8, 4.2, 4, 4.2, .3);
    }
    {
        const px = -6.25, pz = HALL.farZ + 1.1;
        root.add(pipeThrough([ [ px, .25, pz ], [ px + .03, 4.2, pz + .02 ], [ px + .06, 8.7, pz + .05 ], [ px, 12.8, pz - .02 ] ], .085, M.ironBlack, 40, 8));
        for (const y of [ 1.2, 4.8, 8.4, 11.6 ]) {
            root.add(box(.34, .1, .16, M.iron, px + .12, y, pz));
        }
        const wheel = new THREE.Mesh(new THREE.TorusGeometry(.22, .035, 8, 18), M.iron);
        wheel.position.set(px + .2, 3.35, pz);
        wheel.rotation.y = Math.PI / 2;
        root.add(wheel);
        for (let i = 0; i < 3; i++) {
            const spoke = cylinder(.018, .018, .42, M.iron, px + .2, 3.35, pz, 6);
            spoke.rotation.set(Math.PI / 2, 0, i * Math.PI / 3);
            root.add(spoke);
        }
        const farDampMat = M.dampStain.clone();
        farDampMat.opacity = .44;
        farDampMat.color.setHex(7630174);
        const farDamp = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 8.4), farDampMat);
        farDamp.position.set(-6.05, 8.1, HALL.farZ + .075);
        farDamp.renderOrder = 1;
        root.add(farDamp);
        const farDamp2 = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 4.2), farDampMat.clone());
        farDamp2.material.opacity = .31;
        farDamp2.position.set(-4.65, 4.3, HALL.farZ + .08);
        farDamp2.renderOrder = 1;
        root.add(farDamp2);
    }
    const holes = WINDOW.centers.map(cx => {
        const s = pointedArchShape(WINDOW.width, WINDOW.spring, WINDOW.apex, WINDOW.sill);
        s.userData = {
            cx: cx
        };
        return {
            shape: s,
            cx: cx
        };
    });
    const wallShapeHoles = holes.map(({shape: shape, cx: cx}) => {
        const p = new THREE.Path;
        const pts = shape.getPoints(80);
        pts.forEach((pt, i) => {
            if (i === 0) p.moveTo(pt.x + cx, pt.y); else p.lineTo(pt.x + cx, pt.y);
        });
        p.closePath();
        return p;
    });
    const farShape = new THREE.Shape;
    farShape.moveTo(-HALL.halfWidth, 0);
    farShape.lineTo(HALL.halfWidth, 0);
    farShape.lineTo(HALL.halfWidth, HALL.wallHeight);
    farShape.lineTo(-HALL.halfWidth, HALL.wallHeight);
    farShape.closePath();
    farShape.holes.push(...wallShapeHoles);
    const farGeo = new THREE.ExtrudeGeometry(farShape, {
        depth: .85,
        bevelEnabled: false,
        curveSegments: 64
    });
    farGeo.translate(0, 0, -.85);
    {
        const pos = farGeo.attributes.position;
        const uv = new Float32Array(pos.count * 2);
        for (let i = 0; i < pos.count; i++) {
            uv[i * 2] = (pos.getX(i) / HALL.halfWidth / 2 + .5) * 5;
            uv[i * 2 + 1] = pos.getY(i) / HALL.wallHeight * 4.8;
        }
        farGeo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
        farGeo.computeVertexNormals();
    }
    const farWall = new THREE.Mesh(farGeo, M.wallFar);
    farWall.position.z = HALL.farZ;
    farWall.receiveShadow = true;
    farWall.castShadow = true;
    root.add(farWall);
    for (let i = 0; i < 5; i++) {
        const w = 2.05;
        const panel = box(w, 1.8, .1, M.stoneDark, -5.3 + i * 2.65, 1.05, HALL.farZ + .08);
        root.add(panel);
        const cap = box(w + .16, .12, .2, M.stoneTrim, -5.3 + i * 2.65, 2, HALL.farZ + .15);
        root.add(cap);
    }
    const windowBarMat = M.windowBar;
    const windowStoneMat = M.stone;
    const windowDarkMat = M.stoneDark;
    for (let wi = 0; wi < WINDOW.centers.length; wi++) {
        const cx = WINDOW.centers[wi];
        const group = new THREE.Group;
        group.position.set(cx, 0, HALL.farZ);
        root.add(group);
        const glassShape = pointedArchShape(WINDOW.width, WINDOW.spring, WINDOW.apex, 0);
        const glassGeo = new THREE.ShapeGeometry(glassShape, 64);
        {
            glassGeo.computeBoundingBox();
            const bb = glassGeo.boundingBox;
            const pos = glassGeo.attributes.position;
            const uv = new Float32Array(pos.count * 2);
            const sx = bb.max.x - bb.min.x;
            const sy = bb.max.y - bb.min.y;
            for (let i = 0; i < pos.count; i++) {
                uv[i * 2] = (pos.getX(i) - bb.min.x) / sx;
                uv[i * 2 + 1] = (pos.getY(i) - bb.min.y) / sy;
            }
            glassGeo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
        }
        const glass = new THREE.Mesh(glassGeo, M.glass);
        glass.position.set(0, WINDOW.sill, -.63);
        glass.castShadow = false;
        glass.receiveShadow = false;
        group.add(glass);
        const band = archBandShape(WINDOW.width, WINDOW.spring, WINDOW.apex, WINDOW.sill, WINDOW.border);
        const bandGeo = new THREE.ExtrudeGeometry(band, {
            depth: .34,
            bevelEnabled: true,
            bevelSize: .025,
            bevelThickness: .02,
            bevelSegments: 2
        });
        const frame = new THREE.Mesh(bandGeo, windowStoneMat);
        frame.position.set(0, 0, .32);
        frame.castShadow = true;
        frame.receiveShadow = true;
        group.add(frame);
        const outerBand = archBandShape(WINDOW.width, WINDOW.spring, WINDOW.apex, WINDOW.sill, WINDOW.border + .22);
        const outerGeo = new THREE.ExtrudeGeometry(outerBand, {
            depth: .16,
            bevelEnabled: true,
            bevelSize: .018,
            bevelThickness: .02,
            bevelSegments: 1
        });
        const outerFrame = new THREE.Mesh(outerGeo, windowStoneMat);
        outerFrame.position.set(0, 0, .77);
        outerFrame.castShadow = true;
        group.add(outerFrame);
        const hoodPts = archCurvePoints(WINDOW.width + .4, WINDOW.spring + WINDOW.sill + .55, WINDOW.apex + WINDOW.sill + .72, 28);
        const hoodCurve = new THREE.CatmullRomCurve3(hoodPts.map(p => new THREE.Vector3(p.x, p.y, 0)));
        const hood = new THREE.Mesh(new THREE.TubeGeometry(hoodCurve, 52, .1, 6, false), windowStoneMat);
        hood.position.z = .86;
        hood.castShadow = true;
        group.add(hood);
        const sill = box(WINDOW.width + 1.25, .26, .9, windowStoneMat, 0, WINDOW.sill - .13, .48);
        sill.castShadow = true;
        group.add(sill);
        const sillLip = box(WINDOW.width + 1.5, .08, .34, windowDarkMat, 0, WINDOW.sill - .01, .98);
        group.add(sillLip);
        const mullionGeo = new THREE.BoxGeometry(.19, WINDOW.spring - .2, .3);
        const centerMull = new THREE.Mesh(mullionGeo, windowDarkMat);
        centerMull.position.set(0, WINDOW.sill + (WINDOW.spring - .2) / 2, -.19);
        centerMull.castShadow = true;
        group.add(centerMull);
        for (const off of [ -WINDOW.width * .27, WINDOW.width * .27 ]) {
            const m = new THREE.Mesh(new THREE.BoxGeometry(.048, WINDOW.spring - .3, .16), windowDarkMat);
            m.position.set(off, WINDOW.sill + (WINDOW.spring - .3) / 2, -.23);
            group.add(m);
        }
        for (let ti = 1; ti <= 7; ti++) {
            const y = WINDOW.sill + WINDOW.spring * ti / 8;
            const tr = new THREE.Mesh(new THREE.BoxGeometry(WINDOW.width - .22, ti % 2 ? .032 : .045, .15), windowBarMat);
            tr.position.set(0, y, -.24);
            group.add(tr);
        }
        const springBlock = box(.5, .18, .4, windowStoneMat, 0, WINDOW.sill + WINDOW.spring - .12, -.08);
        group.add(springBlock);
        for (const off of [ -WINDOW.width / 2 + .22, WINDOW.width / 2 - .22 ]) {
            const col = cylinder(.075, .09, WINDOW.spring - .6, windowDarkMat, off, WINDOW.sill + (WINDOW.spring - .6) / 2, -.1, 8);
            group.add(col);
            group.add(cylinder(.16, .08, .18, windowStoneMat, off, WINDOW.sill + .1, -.1, 10));
        }
        const quat = new THREE.Group;
        quat.position.set(0, WINDOW.sill + WINDOW.spring + 1.5, -.265);
        const qr = .205;
        for (const [dx, dy] of [ [ 0, .16 ], [ 0, -.16 ], [ .16, 0 ], [ -.16, 0 ] ]) {
            const lobe = new THREE.Mesh(new THREE.TorusGeometry(qr, .026, 5, 22), windowDarkMat);
            lobe.position.set(dx, dy, 0);
            quat.add(lobe);
        }
        const quatRim = new THREE.Mesh(new THREE.TorusGeometry(.37, .026, 5, 28), windowDarkMat);
        quat.add(quatRim);
        const qPin = new THREE.Mesh(new THREE.SphereGeometry(.055, 8, 6), windowStoneMat);
        quat.add(qPin);
        group.add(quat);
        for (const side of [ -1, 1 ]) {
            const subPts = [ new THREE.Vector3(side * .08, WINDOW.sill + WINDOW.spring + .02, -.24), new THREE.Vector3(side * .16, WINDOW.sill + WINDOW.spring + .66, -.24), new THREE.Vector3(side * .37, WINDOW.sill + WINDOW.spring + .92, -.24), new THREE.Vector3(side * .58, WINDOW.sill + WINDOW.spring + .57, -.24) ];
            const subCurve = new THREE.CatmullRomCurve3(subPts);
            const subBar = new THREE.Mesh(new THREE.TubeGeometry(subCurve, 20, .022, 5, false), windowDarkMat);
            group.add(subBar);
        }
        const glowMat = new THREE.SpriteMaterial({
            map: T.glowTex,
            color: 11453901,
            transparent: true,
            opacity: .08,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        const glow = new THREE.Sprite(glowMat);
        glow.scale.set(WINDOW.width * 1.35, (WINDOW.spring + WINDOW.apex) * 1.03, 1);
        glow.position.set(0, WINDOW.sill + WINDOW.apex * .5, -.34);
        group.add(glow);
        animated.windowGlows.push(glow);
    }
    {
        const z = HALL.farZ + .42;
        root.add(box(.5, 8.95, .38, M.stone, 0, 8.02, z));
        for (const s of [ -1, 1 ]) {
            root.add(cylinder(.09, .1, 8.75, M.stoneTrim, s * .34, 8, z + .12, 10));
            root.add(cylinder(.13, .11, .18, M.stoneDark, s * .34, 12.48, z + .12, 10));
        }
        root.add(box(.94, .24, .52, M.stoneDark, 0, 3.53, z + .04));
        root.add(box(.92, .3, .55, M.stoneTrim, 0, 12.55, z + .04));
        root.add(box(1.08, .14, .6, M.stoneDark, 0, 12.78, z));
        root.add(box(.76, .12, .46, M.stoneDark, 0, 7.42, z + .03));
        for (const s of [ -1, 1 ]) {
            const x = s * 5.18;
            root.add(box(.4, 9, .34, M.stone, x, 8.02, z));
            root.add(box(.54, .24, .46, M.stoneDark, x, 3.54, z + .04));
            root.add(box(.6, .3, .5, M.stoneTrim, x, 12.56, z + .04));
        }
        root.add(box(11.2, .23, .34, M.stoneTrim, 0, 13.02, HALL.farZ + .24));
        for (let i = -4; i <= 4; i++) {
            root.add(box(.34, .16, .46, M.stoneDark, i * 1.18, 12.86, HALL.farZ + .28));
        }
    }
    {
        const w = 10.8, h = 4.2;
        const mat = M.glass.clone();
        const glassClone = T.glassTex.clone();
        glassClone.wrapS = glassClone.wrapT = THREE.RepeatWrapping;
        glassClone.repeat.set(3, .6);
        glassClone.needsUpdate = true;
        mat.map = glassClone;
        mat.emissiveMap = glassClone;
        mat.emissiveIntensity = 1.4;
        animated.upperWindowMat = mat;
        const plane = mesh(new THREE.PlaneGeometry(w, h), mat, {
            cast: false,
            receive: false
        });
        plane.position.set(0, 16.62, HALL.farZ + .02);
        root.add(plane);
        const beam = box(w + .9, .2, .62, M.stoneTrim, 0, 14.5, HALL.farZ + .4);
        root.add(beam);
        for (let i = 0; i <= 9; i++) {
            const x = -w / 2 + i / 9 * w;
            root.add(box(.1, h, .14, M.windowBar, x, 16.62, HALL.farZ + .14));
        }
        for (let j = 0; j <= 4; j++) {
            root.add(box(w, .085, .14, M.windowBar, 0, 16.62 - h / 2 + j * h / 4, HALL.farZ + .14));
        }
        for (let i = 0; i <= 4; i++) {
            const x = -w / 2 + i / 4 * w;
            root.add(box(.15, h, .26, M.stoneDark, x, 16.62, HALL.farZ + .1));
        }
        root.add(box(w, .16, .28, M.stoneDark, 0, 14.68, HALL.farZ + .12));
        root.add(box(w, .13, .28, M.stoneDark, 0, 16.62, HALL.farZ + .12));
        root.add(box(w + .7, .22, .55, M.stoneTrim, 0, 18.9, HALL.farZ + .3));
        for (const s of [ -1, 1 ]) {
            root.add(box(.24, h, .3, M.stoneTrim, s * (w / 2 + .1), 16.62, HALL.farZ + .16));
            root.add(box(.34, .22, .42, M.stoneDark, s * (w / 2 + .1), 14.58, HALL.farZ + .16));
        }
    }
    for (const z of COLUMN_Z) {
        const pier = clusteredPier(9.2, .54, {
            stone: M.stone,
            stoneDark: M.stoneDark,
            iron: M.ironBlack
        });
        pier.position.set(HALL.halfWidth - .66, 0, z);
        root.add(pier);
    }
    const archBayMat = new THREE.MeshStandardMaterial({
        color: 1514265,
        roughness: .96,
        metalness: .1,
        envMapIntensity: .15
    });
    const sideGlowMat = new THREE.MeshStandardMaterial({
        map: T.glassTex,
        emissiveMap: T.glassTex,
        emissive: 10203575,
        emissiveIntensity: .62,
        color: 3424838,
        roughness: .4,
        metalness: 0,
        side: THREE.DoubleSide
    });
    for (let b = 0; b < COLUMN_Z.length - 1; b++) {
        const zc = (COLUMN_Z[b] + COLUMN_Z[b + 1]) / 2;
        const bayW = 4.6;
        const baseY = 2.35;
        const hSpring = 6.2;
        const hApex = 9.9;
        const recessShape = pointedArchShape(bayW, hSpring, hApex, baseY);
        const recessGeo = new THREE.ShapeGeometry(recessShape, 48);
        const recess = new THREE.Mesh(recessGeo, archBayMat);
        recess.rotation.y = -Math.PI / 2;
        recess.position.set(HALL.halfWidth - .02, 0, zc);
        recess.receiveShadow = true;
        root.add(recess);
        const bandShape = archBandShape(bayW, hSpring, hApex, baseY, .3);
        const bandGeo = new THREE.ExtrudeGeometry(bandShape, {
            depth: .26,
            bevelEnabled: true,
            bevelSize: .018,
            bevelThickness: .02,
            bevelSegments: 1
        });
        const band = new THREE.Mesh(bandGeo, M.stoneDark);
        band.rotation.y = -Math.PI / 2;
        band.position.set(HALL.halfWidth - .14, 0, zc);
        band.castShadow = true;
        band.receiveShadow = true;
        root.add(band);
        const sideShape = pointedArchShape(1.28, 4.4, 6.2, 4.9);
        const sideGeo = new THREE.ShapeGeometry(sideShape, 32);
        const sg = new THREE.Mesh(sideGeo, sideGlowMat);
        sg.rotation.y = -Math.PI / 2;
        sg.position.set(HALL.halfWidth - .1, 0, zc - .15);
        root.add(sg);
        for (let i = 0; i < 3; i++) {
            const bar = box(.05, 6.4, .05, M.windowBar, HALL.halfWidth - .2, 8.05, zc - .66 + i * .5);
            bar.rotation.y = 0;
            root.add(bar);
        }
        const cap = box(.3, .04, .3, M.ironBlack, HALL.halfWidth - .55, 3, zc);
        root.add(cap);
    }
    for (const z of COLUMN_Z) {
        const corbel = box(.9, .18, 1, M.stoneTrim, HALL.halfWidth - .65, 9.29, z);
        root.add(corbel);
    }
    {
        const zc = -1.55;
        const bayW = 3.2, baseY = 2.25, springY = 4.78, apexY = 6.95;
        for (const s of [ -1, 1 ]) {
            const zz = zc + s * (bayW / 2 + .18);
            root.add(box(.2, springY - baseY + .25, .34, M.stoneTrim, HALL.halfWidth - .16, (baseY + springY) / 2 + .12, zz));
            root.add(box(.34, .16, .46, M.stone, HALL.halfWidth - .23, springY + .22, zz));
            root.add(box(.32, .13, .42, M.stoneTrim, HALL.halfWidth - .22, baseY - .05, zz));
        }
        root.add(box(.38, .15, bayW - .35, M.stoneDark, HALL.halfWidth - .25, baseY, zc));
        const bayRecessMat = M.wall.clone();
        const bayBrickMap = T.wallMap.clone();
        bayBrickMap.repeat.set(3.4, 3.6);
        bayBrickMap.needsUpdate = true;
        bayRecessMat.map = bayBrickMap;
        bayRecessMat.color.setHex(4011821);
        bayRecessMat.roughness = 1;
        bayRecessMat.envMapIntensity = .06;
        const bayRecessShape = pointedArchShape(bayW - .22, springY - .05, apexY - .28, baseY + .08);
        const bayRecess = new THREE.Mesh(new THREE.ShapeGeometry(bayRecessShape, 48), bayRecessMat);
        bayRecess.rotation.y = -Math.PI / 2;
        bayRecess.position.set(HALL.halfWidth - .045, 0, zc);
        bayRecess.receiveShadow = true;
        root.add(bayRecess);
        const archShape = archBandShape(bayW, springY, apexY, baseY, .42);
        const archGeo = new THREE.ExtrudeGeometry(archShape, {
            depth: .22,
            bevelEnabled: true,
            bevelSize: .018,
            bevelThickness: .016,
            bevelSegments: 1
        });
        const nearArchMat = M.stoneTrim.clone();
        nearArchMat.color.setHex(6708817);
        nearArchMat.roughness = 1;
        nearArchMat.envMapIntensity = .08;
        const nearArchMap = T.ashlarMap.clone();
        nearArchMap.repeat.set(.34, .34);
        nearArchMap.needsUpdate = true;
        nearArchMat.map = nearArchMap;
        const arch = new THREE.Mesh(archGeo, nearArchMat);
        arch.rotation.y = -Math.PI / 2;
        arch.position.set(HALL.halfWidth - .2, 0, zc);
        arch.castShadow = true;
        arch.receiveShadow = true;
        root.add(arch);
        root.add(box(.24, .52, .38, M.stone, HALL.halfWidth - .38, apexY + .18, zc));
        const boss = sphere(.15, M.stoneTrim, HALL.halfWidth - .38, apexY - .04, zc, 12);
        boss.scale.z = .6;
        root.add(boss);
        const sideWinMat = new THREE.MeshStandardMaterial({
            map: T.glassTex,
            emissiveMap: T.glassTex,
            emissive: 9086123,
            emissiveIntensity: .55,
            color: 1515811,
            roughness: .48,
            metalness: 0,
            side: THREE.DoubleSide
        });
        const winZ = -.72, winW = .94, winSill = 3.18, winSpring = 4.88, winApex = 6.28;
        const winShape = pointedArchShape(winW, winSpring, winApex, winSill);
        const winGlass = new THREE.Mesh(new THREE.ShapeGeometry(winShape, 40), sideWinMat);
        winGlass.rotation.y = -Math.PI / 2;
        winGlass.position.set(HALL.halfWidth - .075, 0, winZ);
        root.add(winGlass);
        const winBand = archBandShape(winW + .12, winSpring, winApex + .08, winSill - .04, .16);
        const winBandGeo = new THREE.ExtrudeGeometry(winBand, {
            depth: .14,
            bevelEnabled: true,
            bevelSize: .015,
            bevelThickness: .012,
            bevelSegments: 1
        });
        const winFrame = new THREE.Mesh(winBandGeo, M.stoneDark);
        winFrame.rotation.y = -Math.PI / 2;
        winFrame.position.set(HALL.halfWidth - .17, 0, winZ);
        winFrame.castShadow = true;
        winFrame.receiveShadow = true;
        root.add(winFrame);
        root.add(box(.22, .11, winW + .35, M.stoneTrim, HALL.halfWidth - .19, winSill - .07, winZ));
        root.add(box(.045, winSpring - winSill + .55, .045, M.windowBar, HALL.halfWidth - .135, (winSill + winSpring) / 2, winZ));
        for (const off of [ -.3, .3 ]) {
            root.add(box(.035, winSpring - winSill, .03, M.windowBar, HALL.halfWidth - .14, (winSill + winSpring) / 2, winZ + off));
        }
        for (let i = 0; i < 4; i++) {
            const yy = winSill + .28 + i * .43;
            root.add(box(.035, .032, winW - .04, M.windowBar, HALL.halfWidth - .14, yy, winZ));
        }
        root.add(box(.2, .35, .24, M.stone, HALL.halfWidth - .26, winApex + .2, winZ));
    }
    {
        const zc = 1.45;
        const bayW = 2.35, baseY = 2.65, springY = 5.75, apexY = 8.35;
        const backingMat = M.wall.clone();
        const backingMap = T.wallMap.clone();
        backingMap.repeat.set(3.2, 3.4);
        backingMap.needsUpdate = true;
        backingMat.map = backingMap;
        backingMat.color.setHex(4209200);
        backingMat.roughness = 1;
        backingMat.envMapIntensity = .08;
        const nicheShapeF = pointedArchShape(bayW - .2, springY, apexY - .25, baseY + .06);
        const niche = new THREE.Mesh(new THREE.ShapeGeometry(nicheShapeF, 48), backingMat);
        niche.rotation.y = -Math.PI / 2;
        niche.position.set(HALL.halfWidth - .035, 0, zc);
        niche.receiveShadow = true;
        root.add(niche);
        const bandShapeF = archBandShape(bayW, springY, apexY, baseY, .3);
        const bandGeoF = new THREE.ExtrudeGeometry(bandShapeF, {
            depth: .2,
            bevelEnabled: true,
            bevelSize: .018,
            bevelThickness: .016,
            bevelSegments: 1
        });
        const bandF = new THREE.Mesh(bandGeoF, M.stoneDark);
        bandF.rotation.y = -Math.PI / 2;
        bandF.position.set(HALL.halfWidth - .14, 0, zc);
        bandF.castShadow = true;
        bandF.receiveShadow = true;
        root.add(bandF);
        root.add(box(.36, .14, bayW + .1, M.stoneTrim, HALL.halfWidth - .22, baseY, zc));
        root.add(box(.22, .48, .34, M.stone, HALL.halfWidth - .34, apexY + .1, zc));
        const sideShapeF = pointedArchShape(.66, 4.55, 6.55, 4.15);
        const sgF = new THREE.Mesh(new THREE.ShapeGeometry(sideShapeF, 32), sideGlowMat);
        sgF.rotation.y = -Math.PI / 2;
        sgF.position.set(HALL.halfWidth - .12, 0, zc);
        root.add(sgF);
        for (const zOff of [ -.2, .2 ]) {
            root.add(box(.05, 2.2, .05, M.windowBar, HALL.halfWidth - .22, 5.38, zc + zOff));
        }
        for (const yy of [ 4.78, 5.38, 5.98, 6.5 ]) {
            root.add(box(.04, .045, .66, M.windowBar, HALL.halfWidth - .22, yy, zc));
        }
    }
    const vault = buildVault(M, T);
    root.add(vault);
    for (const z of [ -16.2, -9.5, -2.8, 3.9, 10.6 ]) {
        const geo = archRibPointsGeo(HALL.halfWidth, HALL.vaultSpring, HALL.vaultApex);
        const rib = new THREE.Mesh(geo, M.stoneDark);
        rib.position.z = z;
        rib.castShadow = true;
        root.add(rib);
    }
    const tieZ = [ -12.1, -3.4, 5.3 ];
    for (let i = 0; i < tieZ.length; i++) {
        const tie = cylinderBetween([ -HALL.halfWidth + .1, 12.15, tieZ[i] ], [ HALL.halfWidth - .1, 12.15, tieZ[i] ], .055, M.ironBlack, 8);
        root.add(tie);
        const finial = torus(.17, .03, M.iron, -HALL.halfWidth + .6, 12.15, tieZ[i], 6, 16);
        finial.rotation.y = Math.PI / 2;
        root.add(finial);
    }
    const gantry = plateGirder(14.15, 1.05, M.ironBlack, {
        rivetMat: M.iron,
        depth: .34
    });
    gantry.position.set(0, 13.4, -11.65);
    root.add(gantry);
    const walkway = box(9.6, .1, 1.35, M.perforated, 0, 13.98, -11.65);
    walkway.material = M.perforated;
    root.add(walkway);
    for (let i = 0; i < 12; i++) {
        const x = -4.75 + i * .86;
        const rail = cylinderBetween([ x, 14.03, -12.28 ], [ x, 14.85, -12.28 ], .018, M.ironBlack, 6);
        root.add(rail);
    }
    root.add(cylinderBetween([ -4.8, 14.83, -12.28 ], [ 4.8, 14.83, -12.28 ], .035, M.ironBlack, 8));
    root.add(cylinderBetween([ -4.8, 14.44, -12.28 ], [ 4.8, 14.44, -12.28 ], .02, M.ironBlack, 8));
    for (const s of [ -1, 1 ]) {
        root.add(cylinderBetween([ s * 6.9, 12, -11.6 ], [ s * 4.8, 13.93, -11.6 ], .045, M.ironBlack, 8));
    }
    const chainMat = M.iron;
    const chain = [];
    for (let i = 0; i < 18; i++) {
        const link = new THREE.Mesh(new THREE.TorusGeometry(.075, .018, 5, 10), chainMat);
        link.position.set(-2.65, 13.85 - i * .15, -11.65);
        link.rotation.x = i % 2 ? Math.PI / 2 : 0;
        link.castShadow = true;
        root.add(link);
    }
    const hook = new THREE.Mesh(new THREE.TorusGeometry(.13, .028, 6, 14, Math.PI * 1.4), chainMat);
    hook.position.set(-2.65, 11.25, -11.65);
    hook.rotation.z = .4;
    root.add(hook);
    const mapW = 6, mapH = 4.4;
    const mapX = -HALL.halfWidth + .045;
    const mapY = 4.15;
    const mapZ = 2;
    const map = mesh(new THREE.PlaneGeometry(mapW, mapH), M.blueprint, {
        cast: false,
        receive: true
    });
    map.rotation.y = Math.PI / 2;
    map.position.set(mapX, mapY, mapZ);
    root.add(map);
    for (const yy of [ mapY - mapH / 2, mapY + mapH / 2 ]) {
        root.add(box(.06, .09, mapW + .16, M.woodDark, -HALL.halfWidth + .1, yy, mapZ));
    }
    for (const zz of [ mapZ - mapW / 2, mapZ + mapW / 2 ]) {
        root.add(box(.06, mapH + .16, .09, M.woodDark, -HALL.halfWidth + .1, mapY, zz));
    }
    const mapNails = new THREE.InstancedMesh(new THREE.SphereGeometry(.035, 8, 6), M.brass, 8);
    {
        const m4 = new THREE.Matrix4;
        let idx = 0;
        for (const yy of [ mapY - mapH / 2 + .2, mapY + mapH / 2 - .2 ]) {
            for (const zz of [ mapZ - mapW / 2 + .2, mapZ, mapZ + mapW / 2 - .2 ]) {
                m4.makeTranslation(-HALL.halfWidth + .11, yy, zz);
                mapNails.setMatrixAt(idx++, m4);
            }
        }
        mapNails.count = idx;
        root.add(mapNails);
    }
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(.45, .64), new THREE.MeshStandardMaterial({
        color: 2699308,
        roughness: .85,
        metalness: .12
    }));
    tag.rotation.y = Math.PI / 2;
    tag.position.set(-HALL.halfWidth + .07, 1.6, 2.4);
    root.add(tag);
    root.add(cylinderBetween([ -HALL.halfWidth + .08, 2.8, 2.4 ], [ -HALL.halfWidth + .08, 2.12, 2.4 ], .006, M.ironBlack, 4));
    const plaqueW = 1.22, plaqueH = 1.88, plaqueY = 2.94;
    const plaque = mesh(new THREE.PlaneGeometry(plaqueW, plaqueH), M.plaque, {
        cast: false,
        receive: true
    });
    plaque.position.set(6.5, plaqueY, -2.42);
    root.add(plaque);
    const plaqueBack = box(plaqueW + .16, plaqueH + .16, .09, M.ironBlack, 6.5, plaqueY, -2.5);
    root.add(plaqueBack);
    for (const [x, y] of [ [ -.49, plaqueY - .88 ], [ .49, plaqueY - .88 ], [ -.49, plaqueY + .88 ], [ .49, plaqueY + .88 ] ]) {
        root.add(sphere(.032, M.brass, 6.5 + x, y, -2.375, 8));
    }
    const rightPipe = pipeThrough([ [ HALL.halfWidth - .45, .2, -7.6 ], [ HALL.halfWidth - .42, 1.8, -7.6 ], [ HALL.halfWidth - .42, 3.7, -7.8 ], [ HALL.halfWidth - .45, 5.2, -8.6 ], [ HALL.halfWidth - .55, 6, -9.8 ] ], .11, M.ironBlack, 48, 8);
    rightPipe.castShadow = true;
    root.add(rightPipe);
    for (const y of [ 1.3, 3, 4.7 ]) {
        const fl = flange(.19, .08, M.ironBlack, new THREE.Vector3(HALL.halfWidth - .43, y, -7.75), "y");
        root.add(fl);
    }
    const mistRnd = rng(855);
    for (let i = 0; i < 9; i++) {
        const s = makeMistSprite(T.mistTex, 6 + mistRnd() * 12, .045 + mistRnd() * .045, 12176337);
        s.position.set(-4 + mistRnd() * 8, .4 + mistRnd() * 2, -15.5 + mistRnd() * 12);
        s.userData.phase = mistRnd() * TAU;
        s.userData.baseOpacity = s.material.opacity;
        root.add(s);
        animated.wisps.push(s);
    }
    const dust = createDust(T.dustTex);
    root.add(dust);
    animated.dust = dust;
    const bounceMat = new THREE.MeshBasicMaterial({
        color: 1845808,
        transparent: true,
        opacity: .32,
        depthWrite: false
    });
    for (const x of [ -4.1, 4.1 ]) {
        const c = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 6.5), bounceMat);
        c.position.set(x, 5, HALL.farZ + .3);
        root.add(c);
    }
    root.traverse(o => {
        if (o.isMesh) {
            o.castShadow = o.castShadow || false;
            o.receiveShadow = true;
        }
    });
    return {
        root: root,
        floor: floor,
        leftWall: leftWall,
        rightWall: rightWall,
        farWall: farWall,
        animated: animated,
        windows: WINDOW
    };
}

function buildVault(M, T) {
    const span = HALL.halfWidth * 2;
    const spring = HALL.vaultSpring;
    const apex = HALL.vaultApex;
    const z0 = HALL.farZ - .8;
    const z1 = HALL.nearZ + 2;
    const segX = 44;
    const segZ = 12;
    const pts = archCurvePoints(span, spring, apex, segX);
    const positions = [];
    const uvs = [];
    const indices = [];
    for (let zi = 0; zi <= segZ; zi++) {
        const z = z0 + zi / segZ * (z1 - z0);
        for (let i = 0; i < pts.length; i++) {
            positions.push(pts[i].x, pts[i].y, z);
            uvs.push(i / (pts.length - 1) * 5, zi / segZ * 7);
        }
    }
    const row = pts.length;
    for (let zi = 0; zi < segZ; zi++) {
        for (let i = 0; i < row - 1; i++) {
            const a = zi * row + i;
            const b = a + 1;
            const c = (zi + 1) * row + i;
            const d = c + 1;
            indices.push(a, c, b, b, c, d);
        }
    }
    const geo = new THREE.BufferGeometry;
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
        map: T.wallFarMap,
        bumpMap: T.wallFarBump,
        bumpScale: .04,
        color: 5327683,
        roughness: .96,
        metalness: 0,
        side: THREE.DoubleSide,
        envMapIntensity: .2
    });
    const m = new THREE.Mesh(geo, mat);
    m.receiveShadow = true;
    return m;
}

function archRibPointsGeo(span, spring, apex) {
    const pts = archCurvePoints(span, spring, apex, 40);
    const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p.x, p.y, 0)));
    return new THREE.TubeGeometry(curve, 80, .14, 8, false);
}

function createDust(texture) {
    const count = 950;
    const pos = new Float32Array(count * 3);
    const phase = new Float32Array(count);
    const size = new Float32Array(count);
    const r = rng(1202);
    for (let i = 0; i < count; i++) {
        let x, y, z;
        if (i < count * .62) {
            const which = i % 2 ? 1 : -1;
            const t = r();
            x = which * WINDOW.centers[1] + (r() - .5) * 6;
            y = 1 + r() * 15;
            z = -17 + r() * 18;
            x += (t - .5) * 2.5 * (1 - y / 18);
        } else {
            x = (r() - .5) * 12.5;
            y = .5 + r() * 11;
            z = -15 + r() * 24;
        }
        pos[i * 3] = x;
        pos[i * 3 + 1] = y;
        pos[i * 3 + 2] = z;
        phase[i] = r() * TAU;
        size[i] = .7 + r() * 2.2;
    }
    const geo = new THREE.BufferGeometry;
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
    geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    const mat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: {
                value: 0
            },
            uMap: {
                value: texture
            },
            uColor: {
                value: new THREE.Color(14082788)
            },
            uOpacity: {
                value: .38
            },
            uPixelRatio: {
                value: Math.min(window.devicePixelRatio || 1, 2)
            }
        },
        vertexShader: `\n      attribute float aPhase;\n      attribute float aSize;\n      uniform float uTime;\n      uniform float uPixelRatio;\n      varying float vFade;\n      varying float vTwinkle;\n      void main() {\n        vec3 p = position;\n        float t = uTime * 0.11;\n        p.x += sin(t + aPhase) * 0.42;\n        p.y += sin(t * 0.72 + aPhase * 1.7) * 0.22 - mod(uTime * 0.035 + aPhase * 0.02, 1.4) * 0.4;\n        p.z += cos(t * 0.8 + aPhase * 1.3) * 0.36;\n        vec4 mv = modelViewMatrix * vec4(p, 1.0);\n        gl_Position = projectionMatrix * mv;\n        gl_PointSize = aSize * uPixelRatio * (7.5 / max(1.0, -mv.z)) * 1.4;\n        gl_PointSize = clamp(gl_PointSize, 0.8, 8.0);\n        vFade = smoothstep(52.0, 5.0, -mv.z);\n        vTwinkle = 0.55 + 0.45 * sin(uTime * 0.7 + aPhase * 3.0);\n      }\n    `,
        fragmentShader: `\n      uniform sampler2D uMap;\n      uniform vec3 uColor;\n      uniform float uOpacity;\n      varying float vFade;\n      varying float vTwinkle;\n      void main() {\n        vec4 t = texture2D(uMap, gl_PointCoord);\n        if (t.a < 0.03) discard;\n        gl_FragColor = vec4(uColor, t.a * uOpacity * vFade * vTwinkle);\n      }\n    `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    const p = new THREE.Points(geo, mat);
    p.frustumCulled = false;
    return p;
}
