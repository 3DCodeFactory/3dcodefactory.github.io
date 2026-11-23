import * as THREE from "three";

import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

import { mulberry32 } from "./textures.js";

const UP = new THREE.Vector3(0, 1, 0);

const shadowMaterialCache = new Map;

function shadowMaterial(tex, opacity) {
    const key = opacity.toFixed(3);
    if (!shadowMaterialCache.has(key)) {
        shadowMaterialCache.set(key, new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            opacity: opacity,
            depthWrite: false,
            toneMapped: false,
            color: 0,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2
        }));
    }
    return shadowMaterialCache.get(key);
}

function makeMetalScratchTexture() {
    const S = 384;
    const canvas = document.createElement("canvas");
    canvas.width = S;
    canvas.height = S;
    const ctx = canvas.getContext("2d");
    const rng = mulberry32(771);
    ctx.fillStyle = "#b9b9b9";
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 50; i++) {
        const x = rng() * S, y = rng() * S, r = 8 + rng() * 46;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        const v = rng() > .5 ? 210 : 135;
        g.addColorStop(0, `rgba(${v},${v},${v},${.06 + rng() * .12})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.lineCap = "round";
    for (let i = 0; i < 850; i++) {
        const x = rng() * S, y = rng() * S;
        const len = 3 + rng() * 34;
        const a = (rng() - .5) * .9 + (rng() > .7 ? 1.1 : 0);
        const bright = rng() > .45;
        ctx.strokeStyle = bright ? `rgba(245,245,245,${.08 + rng() * .22})` : `rgba(44,44,44,${.05 + rng() * .18})`;
        ctx.lineWidth = .4 + rng() * 1.1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
        ctx.stroke();
    }
    for (let i = 0; i < 24; i++) {
        const x = rng() * S, y = rng() * S;
        const len = 20 + rng() * 80;
        const a = (rng() - .5) * .5;
        ctx.strokeStyle = `rgba(28,28,28,${.16 + rng() * .2})`;
        ctx.lineWidth = .6 + rng() * 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
        ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2.2, 2.2);
    tex.anisotropy = 4;
    tex.colorSpace = THREE.NoColorSpace;
    return tex;
}

export function createMaterialLibrary(textures) {
    const scratch = makeMetalScratchTexture();
    const benchWood = new THREE.MeshPhysicalMaterial({
        map: textures.benchWood.map,
        bumpMap: textures.benchWood.bumpMap,
        bumpScale: .14,
        roughnessMap: textures.benchWood.roughnessMap,
        color: new THREE.Color(13943212),
        roughness: .67,
        metalness: 0,
        clearcoat: .12,
        clearcoatRoughness: .54,
        envMapIntensity: .3
    });
    const benchFront = benchWood.clone();
    benchFront.color = new THREE.Color(9072985);
    benchFront.roughness = .82;
    benchFront.clearcoat = .03;
    benchFront.clearcoatRoughness = .7;
    benchFront.envMapIntensity = .18;
    const drawerWood = new THREE.MeshPhysicalMaterial({
        map: textures.drawerWood.map,
        color: new THREE.Color(13810077),
        bumpMap: textures.drawerWood.bumpMap,
        bumpScale: .009,
        roughnessMap: textures.drawerWood.roughnessMap,
        roughness: .71,
        metalness: 0,
        clearcoat: .1,
        clearcoatRoughness: .6,
        envMapIntensity: .23
    });
    const drawerWood2 = drawerWood.clone();
    drawerWood2.color = new THREE.Color(12493701);
    const darkWood = new THREE.MeshPhysicalMaterial({
        map: textures.drawerWood.map,
        bumpMap: textures.drawerWood.bumpMap,
        bumpScale: .028,
        color: new THREE.Color(8019784),
        roughness: .64,
        metalness: 0,
        clearcoat: .2,
        clearcoatRoughness: .42,
        envMapIntensity: .3
    });
    const ebony = new THREE.MeshPhysicalMaterial({
        map: textures.drawerWood.map,
        bumpMap: textures.drawerWood.bumpMap,
        bumpScale: .007,
        color: new THREE.Color(3811872),
        roughness: .48,
        metalness: 0,
        clearcoat: .34,
        clearcoatRoughness: .28,
        envMapIntensity: .38
    });
    const brass = new THREE.MeshStandardMaterial({
        color: 11106099,
        metalness: 1,
        roughness: .29,
        envMapIntensity: 1.2
    });
    const polishedBrass = new THREE.MeshStandardMaterial({
        color: 13146447,
        metalness: 1,
        roughness: .17,
        envMapIntensity: 1.35
    });
    const agedBrass = new THREE.MeshStandardMaterial({
        color: 8149550,
        metalness: 1,
        roughness: .42,
        envMapIntensity: .9
    });
    const gold = new THREE.MeshStandardMaterial({
        color: 14202987,
        metalness: 1,
        roughness: .19,
        envMapIntensity: 1.35
    });
    const platinum = new THREE.MeshPhysicalMaterial({
        color: 12762546,
        metalness: .96,
        roughness: .38,
        roughnessMap: scratch,
        bumpMap: scratch,
        bumpScale: .0035,
        envMapIntensity: 1.85,
        clearcoat: .16,
        clearcoatRoughness: .24
    });
    const platinumDark = new THREE.MeshStandardMaterial({
        color: 8551796,
        metalness: 1,
        roughness: .42,
        envMapIntensity: 1.2
    });
    const steel = new THREE.MeshStandardMaterial({
        color: 8159875,
        metalness: .97,
        roughness: .31,
        envMapIntensity: 1.15
    });
    const brushedSteel = new THREE.MeshPhysicalMaterial({
        color: 8752012,
        metalness: 1,
        roughness: .34,
        envMapIntensity: 1.12,
        clearcoat: .15,
        clearcoatRoughness: .35
    });
    const blackenedSteel = new THREE.MeshPhysicalMaterial({
        color: 2566697,
        metalness: .93,
        roughness: .31,
        envMapIntensity: .95
    });
    const darkMetal = new THREE.MeshStandardMaterial({
        color: 2828066,
        metalness: .94,
        roughness: .2,
        envMapIntensity: 1.35
    });
    const lampMetal = new THREE.MeshPhysicalMaterial({
        color: 10721932,
        metalness: .93,
        roughness: .2,
        envMapIntensity: 2.1,
        clearcoat: .52,
        clearcoatRoughness: .16
    });
    const shadeInterior = new THREE.MeshStandardMaterial({
        color: 14200952,
        emissive: 12880452,
        emissiveIntensity: 1.15,
        roughness: .76,
        metalness: .02,
        side: THREE.BackSide,
        envMapIntensity: .3
    });
    const copper = new THREE.MeshStandardMaterial({
        color: 10179885,
        metalness: 1,
        roughness: .31,
        envMapIntensity: 1.05
    });
    const silver = new THREE.MeshPhysicalMaterial({
        color: 13225163,
        metalness: 1,
        roughness: .18,
        envMapIntensity: 1.4
    });
    const ruby = new THREE.MeshPhysicalMaterial({
        color: 3801610,
        metalness: .02,
        roughness: .12,
        clearcoat: .9,
        clearcoatRoughness: .03,
        envMapIntensity: 2.4,
        specularIntensity: 1,
        ior: 1.77,
        reflectivity: .72,
        emissive: 1835014,
        emissiveIntensity: .45,
        flatShading: true,
        transmission: .18,
        thickness: .16,
        attenuationColor: new THREE.Color(4849675),
        attenuationDistance: .1
    });
    const emerald = new THREE.MeshPhysicalMaterial({
        color: 480317,
        metalness: .04,
        roughness: .1,
        clearcoat: .8,
        clearcoatRoughness: .05,
        envMapIntensity: 2,
        emissive: 7956,
        emissiveIntensity: .45,
        flatShading: true,
        transmission: .15,
        thickness: .2,
        attenuationColor: new THREE.Color(16428),
        attenuationDistance: .12
    });
    const sapphire = new THREE.MeshPhysicalMaterial({
        color: 728902,
        metalness: .05,
        roughness: .08,
        clearcoat: 1,
        envMapIntensity: 2.2,
        emissive: 133142,
        emissiveIntensity: .4,
        flatShading: true
    });
    const amethyst = new THREE.MeshPhysicalMaterial({
        color: 4134207,
        metalness: .06,
        roughness: .1,
        clearcoat: 1,
        envMapIntensity: 2.1,
        emissive: 1049104,
        emissiveIntensity: .35,
        flatShading: true
    });
    const pearl = new THREE.MeshPhysicalMaterial({
        color: 14931387,
        metalness: .1,
        roughness: .22,
        clearcoat: 1,
        clearcoatRoughness: .16,
        envMapIntensity: 1.4,
        sheen: 1,
        sheenColor: new THREE.Color(14268870)
    });
    const velvet = new THREE.MeshPhysicalMaterial({
        map: textures.velvet.map,
        bumpMap: textures.velvet.bumpMap,
        roughnessMap: textures.velvet.roughnessMap,
        bumpScale: 1.05,
        color: new THREE.Color(5798002),
        roughness: .9,
        metalness: 0,
        specularIntensity: .32,
        sheen: .55,
        sheenColor: new THREE.Color(9087144),
        sheenRoughness: .54,
        envMapIntensity: .48,
        emissive: new THREE.Color(332816),
        emissiveIntensity: .12
    });
    const glass = new THREE.MeshPhysicalMaterial({
        color: 16315364,
        metalness: 0,
        roughness: .018,
        transmission: 1,
        thickness: .04,
        ior: 1.52,
        envMapIntensity: 3.4,
        transparent: false,
        side: THREE.DoubleSide,
        attenuationColor: new THREE.Color(15853516),
        attenuationDistance: 2.4,
        specularIntensity: 1.35,
        clearcoat: 1,
        clearcoatRoughness: .03
    });
    const thinGlass = new THREE.MeshPhysicalMaterial({
        color: 15789797,
        metalness: .02,
        roughness: .07,
        transmission: .72,
        thickness: .018,
        ior: 1.5,
        transparent: true,
        opacity: .42,
        envMapIntensity: 1.8,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    const rubber = new THREE.MeshStandardMaterial({
        color: 1052172,
        metalness: .08,
        roughness: .76
    });
    const label = new THREE.MeshBasicMaterial({
        map: textures.labels.texture,
        color: 15853001,
        toneMapped: true
    });
    const clockFace = new THREE.MeshBasicMaterial({
        map: textures.clockFace.texture,
        color: 14996922,
        toneMapped: true
    });
    const paper = new THREE.MeshStandardMaterial({
        color: 14273450,
        roughness: .94,
        metalness: 0
    });
    const leather = new THREE.MeshStandardMaterial({
        color: 3810840,
        roughness: .68,
        metalness: 0,
        envMapIntensity: .2
    });
    const dialMats = textures.watchDials.map(t => new THREE.MeshPhysicalMaterial({
        map: t,
        roughness: .4,
        metalness: .01,
        clearcoat: .5,
        clearcoatRoughness: .24,
        envMapIntensity: .7,
        emissive: new THREE.Color(16774109),
        emissiveMap: t,
        emissiveIntensity: .1
    }));
    return {
        benchWood: benchWood,
        benchFront: benchFront,
        drawerWood: drawerWood,
        drawerWood2: drawerWood2,
        darkWood: darkWood,
        ebony: ebony,
        brass: brass,
        polishedBrass: polishedBrass,
        agedBrass: agedBrass,
        gold: gold,
        platinum: platinum,
        platinumDark: platinumDark,
        steel: steel,
        brushedSteel: brushedSteel,
        blackenedSteel: blackenedSteel,
        darkMetal: darkMetal,
        lampMetal: lampMetal,
        shadeInterior: shadeInterior,
        copper: copper,
        silver: silver,
        ruby: ruby,
        emerald: emerald,
        sapphire: sapphire,
        amethyst: amethyst,
        pearl: pearl,
        velvet: velvet,
        glass: glass,
        thinGlass: thinGlass,
        rubber: rubber,
        label: label,
        clockFace: clockFace,
        paper: paper,
        leather: leather,
        dialMats: dialMats,
        handleMats: [ new THREE.MeshPhysicalMaterial({
            color: 1775380,
            roughness: .38,
            metalness: .16,
            clearcoat: .38
        }), new THREE.MeshPhysicalMaterial({
            color: 4856600,
            roughness: .42,
            metalness: .05,
            clearcoat: .3
        }), new THREE.MeshPhysicalMaterial({
            color: 2111274,
            roughness: .44,
            metalness: .04,
            clearcoat: .26
        }), new THREE.MeshPhysicalMaterial({
            color: 9270601,
            roughness: .3,
            metalness: .64
        }), new THREE.MeshPhysicalMaterial({
            color: 3422781,
            roughness: .3,
            metalness: .56
        }), new THREE.MeshPhysicalMaterial({
            color: 4020320,
            roughness: .4,
            metalness: .1,
            clearcoat: .3
        }), new THREE.MeshPhysicalMaterial({
            color: 10258536,
            roughness: .38,
            metalness: .03,
            clearcoat: .28
        }) ]
    };
}

function mesh(geo, mat, parent, pos = [ 0, 0, 0 ], rot = [ 0, 0, 0 ], cast = true, receive = true) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(pos[0], pos[1], pos[2]);
    m.rotation.set(rot[0], rot[1], rot[2]);
    m.castShadow = cast;
    m.receiveShadow = receive;
    if (parent) parent.add(m);
    return m;
}

function rounded(w, h, d, r = .02, seg = 3) {
    return new RoundedBoxGeometry(w, h, d, seg, Math.min(r, Math.min(w, h, d) * .48));
}

function tubeThrough(points, radius, mat, parent, closed = false, segments = 80) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], p[1], p[2])), closed, "catmullrom", .5);
    const geo = new THREE.TubeGeometry(curve, segments, radius, 8, closed);
    return mesh(geo, mat, parent, [ 0, 0, 0 ], [ 0, 0, 0 ]);
}

function ellipsePoints(rx, rz, n, y = 0, cx = 0, cz = 0) {
    const pts = [];
    for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2;
        pts.push([ cx + Math.cos(a) * rx, y, cz + Math.sin(a) * rz ]);
    }
    return pts;
}

function helix(start, end, radius, turns, mat, parent, tubeR = .009, radialSegments = 8) {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const axis = b.clone().sub(a);
    const len = axis.length();
    axis.normalize();
    const u = new THREE.Vector3(1, 0, 0);
    if (Math.abs(axis.dot(u)) > .9) u.set(0, 0, 1);
    const v = (new THREE.Vector3).crossVectors(axis, u).normalize();
    const w = (new THREE.Vector3).crossVectors(axis, v).normalize();
    const pts = [];
    const steps = turns * 28;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const ang = t * turns * Math.PI * 2;
        pts.push(a.clone().addScaledVector(axis, t * len).addScaledVector(u, Math.cos(ang) * radius).addScaledVector(w, Math.sin(ang) * radius));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, steps, tubeR, radialSegments, false);
    return mesh(geo, mat, parent);
}

function contactShadow(parent, tex, size = .6, opacity = .55, y = .041, x = 0, z = 0) {
    if (y < .03) return null;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), shadowMaterial(tex, Math.min(.34, opacity * .52)));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y + .0075, z);
    m.renderOrder = 2;
    parent.add(m);
    return m;
}

function groundShadow(parent, tex, w, d, opacity = .36, x = 0, z = 0, y = .004, rot = 0) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), shadowMaterial(tex.contact, opacity));
    m.rotation.set(-Math.PI / 2, 0, rot);
    m.position.set(x, y, z);
    m.renderOrder = 2;
    parent.add(m);
    return m;
}

function makeOctaJewel(size, mat, parent, pos = [ 0, 0, 0 ], stretch = [ 1, 1.4, .72 ], name = "jewel") {
    const geo = new THREE.OctahedronGeometry(size, 0);
    const m = mesh(geo, mat, parent, pos, [ 0, Math.random() * Math.PI, 0 ], true, true);
    m.scale.set(stretch[0], stretch[1], stretch[2]);
    m.name = name;
    return m;
}

function createGemGeometry(rx = .1, rz = .075, crown = .035, pavilion = .08, n = 20, tableRatio = .44) {
    const pos = [], idx = [];
    const rings = [];
    const ringDefs = [ {
        r: tableRatio,
        y: crown
    }, {
        r: .73,
        y: crown * .66
    }, {
        r: .94,
        y: crown * .16
    }, {
        r: 1,
        y: 0
    }, {
        r: .78,
        y: -pavilion * .36
    }, {
        r: .38,
        y: -pavilion * .8
    } ];
    for (const rd of ringDefs) {
        const ring = [];
        for (let i = 0; i < n; i++) {
            const a = i / n * Math.PI * 2;
            ring.push(new THREE.Vector3(Math.cos(a) * rx * rd.r, rd.y, Math.sin(a) * rz * rd.r));
        }
        rings.push(ring);
    }
    for (let r = 0; r < rings.length - 1; r++) {
        const a = rings[r], b = rings[r + 1];
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            const off = pos.length / 3;
            pos.push(a[i].x, a[i].y, a[i].z, b[i].x, b[i].y, b[i].z, b[j].x, b[j].y, b[j].z);
            pos.push(a[i].x, a[i].y, a[i].z, b[j].x, b[j].y, b[j].z, a[j].x, a[j].y, a[j].z);
            idx.push(off + 2, off + 1, off, off + 5, off + 4, off + 3);
        }
    }
    const tableCenter = pos.length / 3;
    pos.push(0, crown, 0);
    const tableRingStart = pos.length / 3;
    for (const p of rings[0]) pos.push(p.x, p.y, p.z);
    for (let i = 0; i < n; i++) {
        idx.push(tableCenter, tableRingStart + (i + 1) % n, tableRingStart + i);
    }
    const tip = pos.length / 3;
    pos.push(0, -pavilion, 0);
    const lowStart = pos.length / 3;
    for (const p of rings[rings.length - 1]) pos.push(p.x, p.y, p.z);
    for (let i = 0; i < n; i++) {
        idx.push(tip, lowStart + i, lowStart + (i + 1) % n);
    }
    const geo = new THREE.BufferGeometry;
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
}

export function buildRoom(scene, mats, tex) {
    const root = new THREE.Group;
    root.name = "Workroom architecture";
    scene.add(root);
    const wallMat = new THREE.MeshStandardMaterial({
        color: 1906450,
        roughness: .97,
        metalness: 0
    });
    mesh(new THREE.PlaneGeometry(26, 12), wallMat, root, [ 0, 4.2, -3.45 ], [ 0, 0, 0 ], false, true);
    const boardMat = new THREE.MeshStandardMaterial({
        color: 2168850,
        roughness: .89,
        envMapIntensity: .06
    });
    for (let i = -6; i <= 6; i++) {
        const h = 11.7 + i % 3 * .14;
        mesh(new THREE.BoxGeometry(1.28, h, .09), boardMat, root, [ i * 1.31, 4.1, -3.36 ], [ 0, 0, 0 ], false, true);
    }
    const rail = new THREE.MeshStandardMaterial({
        color: 3154200,
        roughness: .72,
        metalness: .05
    });
    mesh(rounded(16, .11, .15, .035), rail, root, [ 0, 2.12, -3.27 ], [ 0, 0, 0 ], false, true);
    mesh(rounded(16, .07, .12, .025), rail, root, [ 0, 5.36, -3.27 ], [ 0, 0, 0 ], false, true);
    buildWindow(root, mats, tex);
    buildPortrait(root, mats, tex);
    buildDrawerBank(root, mats, tex);
    buildClock(root, mats, tex);
    buildRearClutter(root, mats, tex);
    return root;
}

function buildWindow(parent, mats, tex) {
    const g = new THREE.Group;
    g.position.set(-3.12, 2.32, -3.22);
    g.scale.setScalar(1.3);
    parent.add(g);
    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = 512;
    glowCanvas.height = 768;
    const c = glowCanvas.getContext("2d");
    const grad = c.createLinearGradient(0, 0, 512, 768);
    grad.addColorStop(0, "#d8d9ce");
    grad.addColorStop(.36, "#f2ead7");
    grad.addColorStop(.7, "#bbbaa7");
    grad.addColorStop(1, "#5f6056");
    c.fillStyle = grad;
    c.fillRect(0, 0, 512, 768);
    const rng = mulberry32(88);
    for (let i = 0; i < 16; i++) {
        c.fillStyle = `rgba(255,250,228,${.06 + rng() * .17})`;
        c.beginPath();
        c.arc(rng() * 512, 80 + rng() * 450, 18 + rng() * 100, 0, Math.PI * 2);
        c.fill();
    }
    for (let i = 0; i < 200; i++) {
        c.fillStyle = `rgba(38,41,34,${.02 + rng() * .08})`;
        c.fillRect(rng() * 512, 380 + rng() * 380, 2 + rng() * 23, 2 + rng() * 15);
    }
    const windowTex = new THREE.CanvasTexture(glowCanvas);
    windowTex.colorSpace = THREE.SRGBColorSpace;
    const glowMat = new THREE.MeshBasicMaterial({
        map: windowTex,
        color: 16777215,
        toneMapped: true
    });
    const pane = mesh(new THREE.PlaneGeometry(1.55, 2.6), glowMat, g, [ 0, 0, 0 ], [ 0, 0, 0 ], false, false);
    pane.renderOrder = -1;
    const daylight = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 2.35), new THREE.MeshBasicMaterial({
        map: tex.glow,
        color: 11453899,
        transparent: true,
        opacity: .22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: true
    }));
    daylight.position.set(0, .05, .04);
    g.add(daylight);
    const frameMat = mats.darkWood;
    mesh(rounded(1.92, .18, .2, .03), frameMat, g, [ 0, 1.43, .02 ]);
    mesh(rounded(1.92, .13, .2, .03), frameMat, g, [ 0, -1.4, .02 ]);
    mesh(rounded(.15, 2.75, .2, .03), frameMat, g, [ -.86, 0, .02 ]);
    mesh(rounded(.15, 2.75, .2, .03), frameMat, g, [ .86, 0, .02 ]);
    const innerFrameMat = mats.ebony;
    const fw = .095;
    mesh(rounded(fw, 2.64, .11, .018), innerFrameMat, g, [ -.78, 0, .12 ]);
    mesh(rounded(fw, 2.64, .11, .018), innerFrameMat, g, [ .78, 0, .12 ]);
    mesh(rounded(1.66, fw, .11, .018), innerFrameMat, g, [ 0, 1.29, .12 ]);
    mesh(rounded(1.66, fw, .11, .018), innerFrameMat, g, [ 0, -1.29, .12 ]);
    mesh(rounded(.055, 2.55, .085, .012), innerFrameMat, g, [ .02, 0, .15 ]);
    mesh(rounded(1.53, .05, .085, .012), innerFrameMat, g, [ 0, .35, .15 ]);
    mesh(rounded(.055, 1.7, .085, .012), innerFrameMat, g, [ .52, 0, .15 ]);
    mesh(rounded(1.9, .1, .42, .025), mats.darkWood, g, [ 0, -1.44, .19 ]);
    mesh(new THREE.CylinderGeometry(.08, .1, .42, 14), mats.glass, g, [ -.59, -1.19, .22 ], [ 0, 0, 0 ], false, false);
    mesh(new THREE.CylinderGeometry(.07, .08, .5, 14), mats.agedBrass, g, [ .58, -1.16, .24 ], [ 0, 0, 0 ], false, false);
    g.rotation.y = .13;
}

function buildPortrait(parent, mats, tex) {
    const g = new THREE.Group;
    g.position.set(-3.37, 2.42, -3.1);
    g.rotation.y = .24;
    parent.add(g);
    const w = .94, h = 1.22;
    mesh(rounded(w + .17, h + .17, .1, .024), mats.ebony, g, [ 0, 0, 0 ]);
    mesh(rounded(w + .06, h + .06, .04, .014), mats.agedBrass, g, [ 0, 0, .055 ]);
    const pmat = new THREE.MeshStandardMaterial({
        map: tex.portrait,
        roughness: .66,
        metalness: .02,
        envMapIntensity: .16
    });
    mesh(new THREE.PlaneGeometry(w, h), pmat, g, [ 0, 0, .08 ], [ 0, 0, 0 ], false, false);
    mesh(rounded(.015, h + .03, .04, .006), mats.ebony, g, [ 0, 0, .1 ], [ 0, 0, 0 ], false, false);
    g.rotation.x = -.02;
}

function buildDrawerBank(parent, mats, tex) {
    const g = new THREE.Group;
    g.name = "Apothecary cabinet of drawers";
    g.position.set(1.06, 1.34, -2.92);
    parent.add(g);
    const bankW = 4.9, bankH = 2.45, bankD = .58;
    mesh(rounded(bankW + .3, bankH + .25, bankD, .035), mats.ebony, g, [ 0, 0, 0 ]);
    mesh(rounded(bankW + .42, .13, bankD + .14, .025), mats.darkWood, g, [ 0, bankH / 2 + .1, .04 ]);
    mesh(rounded(bankW + .5, .075, bankD + .22, .02), mats.darkWood, g, [ 0, bankH / 2 + .21, .06 ]);
    mesh(rounded(bankW + .38, .08, bankD + .12, .02), mats.ebony, g, [ 0, -bankH / 2 - .1, .02 ]);
    mesh(rounded(.12, bankH, bankD + .13, .02), mats.darkWood, g, [ -bankW / 2 - .11, 0, .03 ]);
    mesh(rounded(.12, bankH, bankD + .13, .02), mats.darkWood, g, [ bankW / 2 + .11, 0, .03 ]);
    mesh(rounded(bankW + .1, .1, bankD + .1, .018), mats.ebony, g, [ 0, .02, .035 ]);
    mesh(rounded(.08, bankH, .08, .01), mats.darkWood, g, [ .04, 0, .06 ]);
    const cols = 5, rows = 6;
    const topY = bankH / 2 - .11;
    const bottomY = -bankH / 2 + .09;
    const cellW = (bankW - .28) / cols;
    const cellH = (topY - bottomY) / rows;
    const rng = mulberry32(3007);
    const handleGeo = new THREE.SphereGeometry(.037, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (c === 3 && r === rows - 1) continue;
            const x = -bankW / 2 + .14 + cellW * (c + .5);
            const y = topY - cellH * (r + .5);
            const drawer = mesh(rounded(cellW - .035, cellH - .028, .045, .006, 2), rng() > .54 ? mats.drawerWood : mats.drawerWood2, g, [ x, y, .315 ]);
            drawer.rotation.y = (rng() - .5) * .006;
            const cellIndex = (r * cols + c) % (tex.labels.cols * tex.labels.rows);
            const lc = cellIndex % tex.labels.cols;
            const lr = Math.floor(cellIndex / tex.labels.cols);
            const slipGeo = new THREE.PlaneGeometry(cellW * .67, cellH * .34);
            const lm = mesh(slipGeo, mats.label, g, [ x, y + cellH * .075, .34 ], [ 0, 0, 0 ], false, false);
            const uv = lm.geometry.attributes.uv;
            const inset = .13;
            const u0 = lc / tex.labels.cols, u1 = (lc + 1) / tex.labels.cols;
            const v0 = 1 - (lr + 1) / tex.labels.rows, v1 = 1 - lr / tex.labels.rows;
            const uu0 = u0 + (u1 - u0) * inset, uu1 = u1 - (u1 - u0) * inset;
            const vv0 = v0 + (v1 - v0) * inset, vv1 = v1 - (v1 - v0) * inset;
            for (let i = 0; i < uv.count; i++) {
                uv.setXY(i, uu0 + uv.getX(i) * (uu1 - uu0), vv0 + uv.getY(i) * (vv1 - vv0));
            }
            uv.needsUpdate = true;
            const cup = mesh(handleGeo, mats.polishedBrass, g, [ x, y - cellH * .2, .352 ], [ Math.PI / 2, 0, 0 ], false, false);
            cup.scale.set(1, .72, 1);
            mesh(new THREE.CylinderGeometry(.018, .02, .018, 10), mats.brass, g, [ x, y - cellH * .2, .338 ], [ Math.PI / 2, 0, 0 ], false, false);
            mesh(new THREE.PlaneGeometry(cellW - .045, .004), new THREE.MeshBasicMaterial({
                color: 460036
            }), g, [ x, y - cellH / 2 - .001, .344 ], [ 0, 0, 0 ], false, false);
        }
    }
    for (let c = 0; c <= cols; c++) {
        const x = -bankW / 2 + .14 + cellW * c - .035;
        if (c === 0 || c === cols) continue;
        mesh(new THREE.BoxGeometry(.012, bankH - .18, .023), mats.ebony, g, [ x, 0, .348 ], [ 0, 0, 0 ], false, false);
    }
    mesh(rounded(bankW + .36, .15, .76, .03), mats.darkWood, g, [ 0, bankH / 2 + .32, .02 ]);
    mesh(rounded(bankW + .6, .06, .9, .02), mats.ebony, g, [ 0, bankH / 2 + .41, .03 ]);
    g.rotation.y = -.025;
}

function buildClock(parent, mats, tex) {
    const g = new THREE.Group;
    g.name = "Grandfather clock";
    g.position.set(4.34, 2.42, -2.65);
    g.rotation.y = -.14;
    g.scale.setScalar(.78);
    parent.add(g);
    mesh(rounded(2.1, 4.15, .64, .045), mats.ebony, g, [ 0, .1, 0 ]);
    mesh(rounded(2.35, .2, .82, .035), mats.darkWood, g, [ 0, -1.93, .06 ]);
    mesh(rounded(2.3, .11, .86, .025), mats.ebony, g, [ 0, 1.94, .07 ]);
    mesh(rounded(.14, 3.96, .73, .03), mats.darkWood, g, [ -1, .09, .02 ]);
    mesh(rounded(.14, 3.96, .73, .03), mats.darkWood, g, [ 1, .09, .02 ]);
    const crestShape = new THREE.Shape;
    crestShape.moveTo(-.9, 0);
    crestShape.quadraticCurveTo(-.62, .72, 0, .86);
    crestShape.quadraticCurveTo(.62, .72, .9, 0);
    crestShape.lineTo(0, 0);
    const crestGeo = new THREE.ExtrudeGeometry(crestShape, {
        depth: .28,
        bevelEnabled: true,
        bevelSize: .03,
        bevelThickness: .03,
        bevelSegments: 2
    });
    mesh(crestGeo, mats.ebony, g, [ 0, 1.93, -.1 ]);
    mesh(new THREE.SphereGeometry(.1, 16, 12), mats.polishedBrass, g, [ 0, 2.8, .06 ], [ 0, 0, 0 ], false, true);
    mesh(new THREE.CylinderGeometry(.03, .05, .32, 12), mats.brass, g, [ 0, 2.62, .06 ], [ 0, 0, 0 ], false, true);
    const faceZ = .37;
    const faceGroup = new THREE.Group;
    faceGroup.position.set(0, .28, faceZ);
    g.add(faceGroup);
    mesh(new THREE.TorusGeometry(1, .075, 14, 96), mats.agedBrass, faceGroup, [ 0, 0, .035 ], [ 0, 0, 0 ], false, true);
    mesh(new THREE.TorusGeometry(.91, .047, 12, 96), mats.polishedBrass, faceGroup, [ 0, 0, .06 ], [ 0, 0, 0 ], false, true);
    mesh(new THREE.TorusGeometry(1.06, .028, 10, 96), mats.ebony, faceGroup, [ 0, 0, .02 ], [ 0, 0, 0 ], false, true);
    const dial = mesh(new THREE.CircleGeometry(.9, 96), mats.clockFace, faceGroup, [ 0, 0, .075 ], [ 0, 0, 0 ], false, true);
    dial.receiveShadow = true;
    const handMat = new THREE.MeshStandardMaterial({
        color: 1512207,
        metalness: .2,
        roughness: .78,
        envMapIntensity: .25
    });
    const handRoot = new THREE.Group;
    handRoot.position.set(0, 0, .102);
    faceGroup.add(handRoot);
    const hour = mesh(new THREE.BoxGeometry(.026, .43, .008), handMat, handRoot, [ 0, .215, 0 ], [ 0, 0, -(10 + 9 / 60) / 12 * Math.PI * 2 ], true, false);
    hour.name = "Clock hour hand";
    const minute = mesh(new THREE.BoxGeometry(.017, .66, .007), handMat, handRoot, [ 0, .33, .008 ], [ 0, 0, -(9 / 60) * Math.PI * 2 ], true, false);
    minute.name = "Clock minute hand";
    const second = mesh(new THREE.BoxGeometry(.005, .74, .004), mats.copper, handRoot, [ 0, .3, .016 ], [ 0, 0, -(34 / 60) * Math.PI * 2 ], false, false);
    second.name = "Clock second hand";
    mesh(new THREE.SphereGeometry(.052, 18, 12), mats.brass, handRoot, [ 0, 0, .024 ], [ 0, 0, 0 ], false, false);
    mesh(new THREE.CylinderGeometry(.022, .022, .006, 14), mats.brass, handRoot, [ .032, -.075, .016 ], [ Math.PI / 2, 0, 0 ], false, false);
    const glassCanvas = document.createElement("canvas");
    glassCanvas.width = 512;
    glassCanvas.height = 512;
    const gc = glassCanvas.getContext("2d");
    gc.clearRect(0, 0, 512, 512);
    const gl = gc.createLinearGradient(80, 0, 460, 512);
    gl.addColorStop(0, "rgba(255,244,215,0.16)");
    gl.addColorStop(.4, "rgba(255,244,215,0)");
    gl.addColorStop(.7, "rgba(235,245,255,0.09)");
    gl.addColorStop(1, "rgba(255,235,200,0)");
    gc.fillStyle = gl;
    gc.fillRect(0, 0, 512, 512);
    gc.strokeStyle = "rgba(255,244,224,0.12)";
    gc.lineWidth = 10;
    gc.beginPath();
    gc.arc(290, 240, 240, 3.7, 4.7);
    gc.stroke();
    const gt = new THREE.CanvasTexture(glassCanvas);
    gt.colorSpace = THREE.SRGBColorSpace;
    const glare = new THREE.MeshBasicMaterial({
        map: gt,
        transparent: true,
        opacity: .13,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
    });
    mesh(new THREE.CircleGeometry(.895, 72), glare, faceGroup, [ 0, 0, .17 ], [ 0, 0, 0 ], false, false);
    mesh(rounded(1.5, .06, .1, .02), mats.brass, g, [ 0, -1.28, .35 ], [ 0, 0, 0 ], false, true);
    const pend = new THREE.Group;
    g.add(pend);
    pend.position.set(0, -1.85, .34);
    mesh(new THREE.CylinderGeometry(.012, .012, 1.2, 8), mats.brass, pend, [ 0, .55, 0 ], [ 0, 0, 0 ], false, true);
    mesh(new THREE.CylinderGeometry(.17, .2, .026, 24), mats.polishedBrass, pend, [ 0, .02, 0 ], [ Math.PI / 2, 0, 0 ], false, true);
    g.userData = {
        clock: true
    };
}

function buildRearClutter(parent, mats, tex) {
    const g = new THREE.Group;
    g.position.set(0, 0, -2.5);
    parent.add(g);
    const rng = mulberry32(1021);
    mesh(rounded(9.8, .14, .9, .025), mats.darkWood, g, [ .1, .6, .15 ]);
    mesh(rounded(9.5, .55, .8, .02), mats.ebony, g, [ .1, .28, .1 ]);
    for (let i = 0; i < 5; i++) {
        mesh(rounded(1.65, .42, .05, .012), mats.drawerWood, g, [ -3.7 + i * 1.86, .25, .52 ]);
        mesh(new THREE.SphereGeometry(.024, 10, 8), mats.polishedBrass, g, [ -3.7 + i * 1.86, .27, .57 ], [ 0, 0, 0 ], false, false);
    }
    const bottleMat = new THREE.MeshPhysicalMaterial({
        color: 7298626,
        roughness: .12,
        metalness: .08,
        transmission: .7,
        thickness: .3,
        transparent: true,
        opacity: .72,
        envMapIntensity: 1.2,
        ior: 1.46
    });
    const darkGlass = new THREE.MeshPhysicalMaterial({
        color: 1712410,
        roughness: .13,
        metalness: .1,
        transmission: .35,
        thickness: .4,
        transparent: true,
        opacity: .9,
        envMapIntensity: 1
    });
    const clutter = [ [ -3.05, .67, .15, .14, .3, bottleMat ], [ -2.58, .67, .09, .09, .46, darkGlass ], [ -1.95, .67, .19, .17, .25, darkGlass ], [ -1.45, .67, .12, .11, .38, bottleMat ], [ .22, .67, .13, .12, .34, darkGlass ], [ .75, .67, .08, .07, .26, bottleMat ], [ 2.28, .67, .16, .14, .29, darkGlass ], [ 2.73, .67, .09, .085, .42, bottleMat ], [ 3.4, .67, .13, .12, .23, darkGlass ] ];
    for (const [x, y, rb, rt, h, m] of clutter) {
        const b = mesh(new THREE.CylinderGeometry(rt, rb, h, 16), m, g, [ x, y + h / 2, .2 + rng() * .08 ], [ 0, 0, 0 ], false, false);
        mesh(new THREE.CylinderGeometry(rt * .64, rt * .74, .05, 14), mats.agedBrass, g, [ x, y + h + .02, b.position.z ], [ 0, 0, 0 ], false, false);
        mesh(new THREE.CylinderGeometry(rt * .36, rt * .42, .04, 12), mats.brass, g, [ x, y + h + .055, b.position.z ], [ 0, 0, 0 ], false, false);
    }
    for (let i = 0; i < 4; i++) {
        mesh(rounded(.3 + rng() * .24, .18 + rng() * .18, .28, .015), i % 2 ? mats.ebony : mats.drawerWood, g, [ 1.2 + i * .45, .67 + (.18 + rng() * .18) / 2, .18 ], [ 0, rng() * .3, 0 ], false, true);
    }
    mesh(new THREE.CylinderGeometry(.27, .27, .05, 36), mats.blackenedSteel, g, [ -.38, .65, .3 ], [ 0, 0, 0 ], false, true);
    mesh(new THREE.TorusGeometry(.24, .022, 12, 48), mats.polishedBrass, g, [ -.38, .68, .3 ], [ Math.PI / 2, 0, 0 ], false, false);
    mesh(new THREE.CylinderGeometry(.15, .17, .38, 20), mats.agedBrass, g, [ 1.72, .84, .12 ], [ 0, 0, 0 ], false, true);
    mesh(new THREE.TorusGeometry(.19, .024, 12, 40), mats.agedBrass, g, [ 1.72, .68, .12 ], [ Math.PI / 2, 0, 0 ], false, false);
    const glintMat = new THREE.MeshBasicMaterial({
        color: 16764811,
        toneMapped: false
    });
    for (let i = 0; i < 8; i++) {
        mesh(new THREE.SphereGeometry(.009 + rng() * .008, 8, 6), glintMat, g, [ -3 + rng() * 6.2, .72 + rng() * .2, .3 ], [ 0, 0, 0 ], false, false);
    }
}

export function buildBench(scene, mats, tex) {
    const g = new THREE.Group;
    g.name = "Watchmaker bench";
    scene.add(g);
    mesh(rounded(13.6, .36, 7.8, .055), mats.benchWood, g, [ 0, -.2, .9 ], [ 0, 0, 0 ], false, true);
    const edge = mesh(rounded(13.65, .15, .26, .04), mats.benchFront, g, [ 0, -.075, 4.78 ]);
    mesh(rounded(12.8, .62, .22, .035), mats.ebony, g, [ 0, -.63, 4.68 ], [ 0, 0, 0 ], false, true);
    mesh(rounded(12.2, .035, .13, .012), mats.agedBrass, g, [ 0, -.36, 4.78 ], [ 0, 0, 0 ], false, false);
    mesh(rounded(1.7, .38, .08, .03), mats.drawerWood, g, [ 0, -.66, 4.8 ], [ 0, 0, 0 ], false, true);
    mesh(new THREE.SphereGeometry(.05, 14, 10), mats.polishedBrass, g, [ 0, -.66, 4.85 ], [ 0, 0, 0 ], false, false);
    mesh(rounded(1.2, .08, 2.1, .03), mats.drawerWood, g, [ -6.15, -.02, 2.6 ]);
    mesh(rounded(.9, .16, 1.4, .025), mats.ebony, g, [ -6, .05, .8 ]);
    const matD = 3.6;
    const matBackL = -1.41, matBackR = 3.79;
    const matFrontL = -1.85, matFrontR = 2.43;
    const matW = matFrontR - matFrontL;
    const matGroup = new THREE.Group;
    matGroup.name = "Velvet work mat";
    matGroup.position.set(.55, .042, .55);
    matGroup.rotation.y = -.022;
    g.add(matGroup);
    function matSurfaceGeometry(backL, backR, frontL, frontR, depth, segX, segZ, yBase, foldAmp) {
        const geo = new THREE.BufferGeometry;
        const verts = [], uvs = [], idx = [];
        for (let j = 0; j <= segZ; j++) {
            const v = j / segZ;
            const z = (v - .5) * depth;
            const l = backL + (frontL - backL) * v;
            const r = backR + (frontR - backR) * v;
            for (let i = 0; i <= segX; i++) {
                const u = i / segX;
                const x = l + (r - l) * u;
                const edge = Math.min(1, (x - l) * 3.5) * Math.min(1, (r - x) * 3.5) * Math.min(1, (depth * .5 - Math.abs(z)) * 3.5);
                const fold = (Math.sin(x * .82 + z * 1.35) * .024 + Math.sin(x * 2.4 - z * 1.1) * .0075 + Math.sin(x * 5.9 - z * 2.1) * .003) * edge * foldAmp;
                verts.push(x, yBase + fold, z);
                uvs.push(u, v);
            }
        }
        for (let j = 0; j < segZ; j++) {
            for (let i = 0; i < segX; i++) {
                const a = j * (segX + 1) + i;
                const b = a + 1;
                const c = a + segX + 1;
                const d = c + 1;
                idx.push(a, c, b, b, c, d);
            }
        }
        geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
        geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        return geo;
    }
    const underGeo = matSurfaceGeometry(matBackL - .1, matBackR + .1, matFrontL - .1, matFrontR + .1, matD + .08, 44, 36, -.014, .4);
    mesh(underGeo, new THREE.MeshStandardMaterial({
        color: 330760,
        roughness: .99
    }), matGroup, [ 0, 0, 0 ], [ 0, 0, 0 ], false, true);
    const matGeo = matSurfaceGeometry(matBackL, matBackR, matFrontL, matFrontR, matD, 120, 84, .006, 1);
    const matPlane = mesh(matGeo, mats.velvet, matGroup, [ 0, .005, 0 ], [ 0, 0, 0 ], false, true);
    matPlane.name = "Velvet surface";
    matPlane.receiveShadow = true;
    const hemMat = new THREE.MeshPhysicalMaterial({
        color: 661264,
        roughness: .94,
        sheen: .18,
        sheenColor: new THREE.Color(1849896),
        sheenRoughness: .78,
        envMapIntensity: .12
    });
    const hemPts = [ [ matBackL + .015, .014, -matD / 2 + .008 ], [ matBackR - .015, .014, -matD / 2 + .008 ], [ matFrontR - .012, .014, matD / 2 - .008 ], [ matFrontL + .012, .014, matD / 2 - .008 ] ];
    tubeThrough(hemPts, .0065, hemMat, matGroup, true, 200);
    const rng = mulberry32(444);
    const fiberMat = new THREE.MeshBasicMaterial({
        color: 2376498,
        transparent: true,
        opacity: .11,
        depthWrite: false
    });
    for (let i = 0; i < 55; i++) {
        const v = rng();
        const z = (v - .5) * (matD - .12);
        const l = matBackL + (matFrontL - matBackL) * v + .1;
        const r = matBackR + (matFrontR - matBackR) * v - .1;
        const x = l + (r - l) * rng();
        const f = mesh(new THREE.PlaneGeometry(.006 + rng() * .03, .0013), fiberMat, matGroup, [ x, .016, z ], [ -Math.PI / 2, 0, rng() * Math.PI ], false, false);
        f.rotation.z = rng() * Math.PI;
    }
    return {
        root: g,
        matGroup: matGroup,
        matW: matW,
        matD: matD,
        matTop: .055
    };
}

function makeLeaf(parent, len, wid, rot, pos, mats, y = .042) {
    const s = new THREE.Shape;
    s.moveTo(0, 0);
    s.bezierCurveTo(len * .26, wid * .85, len * .75, wid * .7, len, 0);
    s.bezierCurveTo(len * .66, -wid * .5, len * .3, -wid * .55, 0, 0);
    const g = new THREE.ExtrudeGeometry(s, {
        depth: .012,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: .003,
        bevelThickness: .003
    });
    g.rotateX(-Math.PI / 2);
    const leaf = mesh(g, mats.platinum, parent, [ pos[0], y, pos[1] ], [ 0, rot, 0 ], true, true);
    const mid = new THREE.CatmullRomCurve3([ new THREE.Vector3(.015, 0, 0), new THREE.Vector3(len * .38, .002, .012), new THREE.Vector3(len * .7, .001, .003), new THREE.Vector3(len * .92, 0, 0) ]);
    const rib = mesh(new THREE.TubeGeometry(mid, 12, .003, 5, false), mats.platinumDark, leaf, [ 0, .006, 0 ], [ 0, 0, 0 ], false, false);
    return leaf;
}

function makeProng(parent, start, end, mat, r = .007) {
    const curve = new THREE.CatmullRomCurve3([ new THREE.Vector3(...start), new THREE.Vector3(start[0] + (end[0] - start[0]) * .48, start[1] + (end[1] - start[1]) * .48 + .005, start[2] + (end[2] - start[2]) * .48), new THREE.Vector3(...end) ]);
    const m = mesh(new THREE.TubeGeometry(curve, 12, r, 5, false), mat, parent, [ 0, 0, 0 ], [ 0, 0, 0 ]);
    return m;
}

export function buildBrooch(parent, mats, tex, pos = [ -.23, .055, 1.97 ]) {
    const g = new THREE.Group;
    g.name = "Platinum filigree brooch with ruby";
    g.position.set(pos[0], pos[1], pos[2]);
    g.rotation.y = -.13;
    parent.add(g);
    const pl = mats.platinum;
    const pd = mats.platinumDark;
    const y = .026;
    const rubyY = .098;
    const bezelOuter = ellipsePoints(.222, .17, 92, y + .02);
    tubeThrough(bezelOuter, .016, pl, g, true, 96);
    const bezelInner = ellipsePoints(.185, .137, 80, y + .038);
    tubeThrough(bezelInner, .011, pd, g, true, 80);
    mesh(new THREE.CylinderGeometry(.184, .194, .052, 40, 1, true), new THREE.MeshStandardMaterial({
        color: 10328208,
        metalness: 1,
        roughness: .32,
        side: THREE.DoubleSide
    }), g, [ 0, y + .048, 0 ], [ 0, 0, 0 ]);
    for (let i = 0; i < 48; i++) {
        const a = i / 48 * Math.PI * 2;
        const px = Math.cos(a) * .231, pz = Math.sin(a) * .177;
        mesh(new THREE.SphereGeometry(.0085 + i % 3 * .0016, 8, 6), i % 4 === 0 ? pd : pl, g, [ px, y + .05, pz ], [ 0, 0, 0 ], false, true);
    }
    const stoneGeo = createGemGeometry(.172, .133, .052, .062, 32, .4);
    const stone = mesh(stoneGeo, mats.ruby, g, [ 0, y + .074, 0 ], [ 0, -.03, 0 ], true, true);
    stone.name = "Center ruby";
    for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2 + .3;
        const sx = Math.cos(a) * .196, sz = Math.sin(a) * .151;
        makeProng(g, [ sx, y + .026, sz ], [ sx * .83, y + .116, sz * .83 ], pl, .0068);
    }
    for (let i = 0; i < 18; i++) {
        const a = i / 18 * Math.PI * 2;
        const len = .105 + i % 2 * .04;
        const px = Math.cos(a) * .26, pz = Math.sin(a) * .205;
        makeLeaf(g, len, .052 + i % 3 * .007, a + Math.PI / 2, [ px, pz ], mats, y + .018 + i % 2 * .005);
    }
    const curls = [ {
        pts: [ [ -.17, -.08 ], [ -.29, -.18 ], [ -.45, -.17 ], [ -.56, -.06 ], [ -.53, .07 ], [ -.4, .12 ], [ -.29, .06 ], [ -.34, -.01 ], [ -.43, .01 ] ],
        r: .0085
    }, {
        pts: [ [ -.16, .08 ], [ -.29, .16 ], [ -.44, .21 ], [ -.6, .18 ], [ -.64, .07 ], [ -.57, -.02 ] ],
        r: .0095
    }, {
        pts: [ [ -.14, -.13 ], [ -.23, -.26 ], [ -.39, -.3 ], [ -.5, -.24 ], [ -.52, -.15 ] ],
        r: .0075
    }, {
        pts: [ [ -.32, .15 ], [ -.32, .27 ], [ -.23, .33 ], [ -.12, .29 ], [ -.13, .19 ] ],
        r: .0078
    }, {
        pts: [ [ -.06, -.15 ], [ -.11, -.26 ], [ -.05, -.34 ], [ .02, -.3 ], [ .01, -.22 ] ],
        r: .0067
    } ];
    for (const c of curls) {
        for (const sign of [ -1, 1 ]) {
            const pts = c.pts.map(([x, z]) => [ x * sign, y, z ]);
            tubeThrough(pts, c.r, pl, g, false, 64);
        }
    }
    for (const sign of [ -1, 1 ]) {
        tubeThrough([ [ sign * .24, y, -.03 ], [ sign * .37, y, -.07 ], [ sign * .57, y, -.12 ], [ sign * .66, y, -.03 ], [ sign * .59, y, .06 ] ], .0065, pd, g, false, 48);
        tubeThrough([ [ sign * .1, y, .13 ], [ sign * .14, y, .23 ], [ sign * .24, y, .27 ], [ sign * .31, y, .22 ], [ sign * .29, y, .16 ] ], .0067, pl, g, false, 48);
        tubeThrough([ [ sign * .09, y, -.16 ], [ sign * .16, y, -.28 ], [ sign * .29, y, -.37 ], [ sign * .4, y, -.35 ], [ sign * .42, y, -.27 ] ], .0058, pl, g, false, 48);
    }
    const leaves = [ [ -.4, -.05, .17, .06, -.5 ], [ -.48, .12, .14, .052, .45 ], [ -.3, .22, .15, .05, 1.2 ], [ -.33, -.25, .16, .055, -1.1 ], [ -.2, .06, .14, .05, -.15 ], [ -.46, -.19, .12, .045, -.25 ], [ -.05, -.3, .11, .04, -.1 ], [ .05, -.3, .09, .035, Math.PI + .1 ] ];
    for (const [lx, lz, len, wid, rot] of leaves) {
        for (const sign of [ -1, 1 ]) {
            makeLeaf(g, len, wid, sign < 0 ? Math.PI - rot : rot, [ sign * Math.abs(lx), lz ], mats, y + .012);
        }
    }
    const innerScrolls = [ [ [ -.22, -.1 ], [ -.3, -.17 ], [ -.36, -.1 ], [ -.31, -.03 ], [ -.25, -.05 ] ], [ [ -.2, .1 ], [ -.27, .18 ], [ -.36, .16 ], [ -.37, .08 ], [ -.31, .04 ] ], [ [ -.34, -.04 ], [ -.4, .02 ], [ -.45, -.03 ], [ -.43, -.1 ], [ -.37, -.1 ] ], [ [ -.24, .22 ], [ -.29, .29 ], [ -.37, .27 ], [ -.38, .21 ] ], [ [ -.11, -.2 ], [ -.16, -.27 ], [ -.24, -.28 ], [ -.26, -.23 ], [ -.2, -.19 ] ] ];
    for (const sign of [ -1, 1 ]) {
        for (const pts of innerScrolls) {
            tubeThrough(pts.map(([x, z]) => [ sign * Math.abs(x), y + .008, z ]), .0058, sign > 0 ? pl : pd, g, false, 44);
        }
    }
    const blossoms = [ [ -.3, .13, .055 ], [ -.3, -.17, .045 ], [ -.16, .28, .043 ], [ -.19, -.27, .038 ], [ -.44, .02, .05 ], [ -.4, -.19, .04 ] ];
    for (const sign of [ -1, 1 ]) {
        for (const [bx, bz, s] of blossoms) {
            for (let k = 0; k < 5; k++) {
                const a = k / 5 * Math.PI * 2 + (sign > 0 ? .2 : .5);
                const petal = mesh(new THREE.SphereGeometry(s * .43, 8, 6), pl, g, [ sign * Math.abs(bx) + Math.cos(a) * s * .7, y + .035, bz + Math.sin(a) * s * .7 ], [ 0, 0, 0 ], false, true);
                petal.scale.set(1, .55, 1.25);
                petal.rotation.y = -a;
            }
            mesh(new THREE.SphereGeometry(s * .23, 8, 6), mats.pearl, g, [ sign * Math.abs(bx), y + .05, bz ], [ 0, 0, 0 ], false, true);
        }
    }
    const shadowMat = new THREE.MeshBasicMaterial({
        map: tex.contact,
        transparent: true,
        opacity: .45,
        depthWrite: false,
        color: 0,
        toneMapped: false
    });
    const shadow = mesh(new THREE.PlaneGeometry(1.23, .7), shadowMat, g, [ 0, .006, 0 ], [ -Math.PI / 2, 0, 0 ], false, false);
    shadow.renderOrder = 2;
    const granulePositions = [ [ -.55, .03 ], [ -.51, -.19 ], [ -.27, .34 ], [ -.08, -.35 ], [ .55, .03 ], [ .51, -.19 ], [ .27, .34 ], [ .08, -.35 ], [ -.62, .09 ], [ .62, .09 ], [ -.44, .22 ], [ .44, .22 ] ];
    for (let i = 0; i < granulePositions.length; i++) {
        const [x, z] = granulePositions[i];
        if (i % 3 === 0) {
            const p = mesh(new THREE.SphereGeometry(.014, 12, 10), mats.pearl, g, [ x, y + .055, z ], [ 0, 0, 0 ], false, true);
            p.scale.y = .82;
        } else {
            mesh(new THREE.SphereGeometry(i % 2 ? .008 : .011, 9, 7), mats.polishedBrass, g, [ x, y + .038, z ], [ 0, 0, 0 ], false, true);
        }
    }
    const accent = [ [ -.32, .155, .032, mats.sapphire ], [ .32, .155, .032, mats.sapphire ], [ -.48, -.12, .025, mats.ruby ], [ .48, -.12, .025, mats.ruby ] ];
    for (const [ax, az, s, m] of accent) {
        mesh(new THREE.TorusGeometry(s * 1.25, s * .2, 8, 20), pl, g, [ ax, y + .04, az ], [ Math.PI / 2, 0, 0 ], false, true);
        const gem = mesh(new THREE.OctahedronGeometry(s, 0), m, g, [ ax, y + .055, az ], [ 0, .4, 0 ], false, true);
        gem.scale.y = .8;
    }
    const pinCurve = new THREE.CatmullRomCurve3([ new THREE.Vector3(-.28, y - .01, -.04), new THREE.Vector3(-.1, y - .015, -.03), new THREE.Vector3(.16, y - .01, -.02), new THREE.Vector3(.28, y + .005, -.01) ]);
    const pin = mesh(new THREE.TubeGeometry(pinCurve, 24, .006, 5, false), mats.steel, g, [ 0, 0, 0 ], [ 0, 0, 0 ]);
    pin.visible = false;
    return g;
}

function gearShape(radius, teeth, rootRatio = .86) {
    const shape = new THREE.Shape;
    const per = 10;
    const count = teeth * per;
    for (let i = 0; i <= count; i++) {
        const a = i / count * Math.PI * 2;
        const phase = i % per / per;
        let f = 0;
        if (phase < .08) f = smooth01(phase / .08); else if (phase < .4) f = 1; else if (phase < .5) f = 1 - smooth01((phase - .4) / .1); else if (phase < .92) f = 0; else f = smooth01((phase - .92) / .08);
        const r = radius * (rootRatio + (1 - rootRatio) * f);
        const x = Math.cos(a) * r, y = Math.sin(a) * r;
        if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    shape.closePath();
    return shape;
}

function smooth01(t) {
    t = Math.max(0, Math.min(1, t));
    return t * t * (3 - 2 * t);
}

export function buildGear(opts = {}) {
    const {radius: radius = .2, teeth: teeth = 36, thickness: thickness = .032, spokes: spokes = 5, rim: rim = .17, material: material = null, hubMaterial: hubMaterial = null, jewel: jewel = null, style: style = "skeleton"} = opts;
    const g = new THREE.Group;
    const brassMat = material || null;
    const actualRim = Math.min(radius * .32, radius * (rim || .17));
    const innerR = Math.max(radius * .16, radius - actualRim);
    const shape = gearShape(radius, teeth, .875);
    shape.holes.push((new THREE.Path).absarc(0, 0, innerR, 0, Math.PI * 2, true));
    const geo = new THREE.ExtrudeGeometry(shape, {
        depth: thickness,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: Math.min(.0035, thickness * .14),
        bevelThickness: Math.min(.0035, thickness * .14)
    });
    geo.rotateX(-Math.PI / 2);
    const ring = mesh(geo, brassMat, g, [ 0, 0, 0 ], [ 0, 0, 0 ], true, true);
    ring.name = "toothed rim";
    const hubR = radius * .11;
    const spokeMat = brassMat;
    for (let i = 0; i < spokes; i++) {
        const a = i / spokes * Math.PI * 2;
        const mid = (innerR + hubR) / 2;
        const len = Math.max(.02, innerR - hubR);
        const spoke = mesh(rounded(len, thickness * .58, Math.max(.009, radius * .045), .003, 2), spokeMat, g, [ Math.cos(a) * mid, thickness * .45, -Math.sin(a) * mid ], [ 0, a, 0 ], true, true);
        spoke.scale.z = 1;
    }
    const hub = mesh(new THREE.CylinderGeometry(hubR, hubR * 1.1, thickness * 1.35, 20), hubMaterial || brassMat, g, [ 0, thickness * .4, 0 ], [ 0, 0, 0 ], true, true);
    const arbor = mesh(new THREE.CylinderGeometry(radius * .042, radius * .042, thickness * 2.9, 14), hubMaterial || brassMat, g, [ 0, thickness * .75, 0 ], [ 0, 0, 0 ], true, true);
    const arborTop = mesh(new THREE.SphereGeometry(radius * .05, 10, 8), hubMaterial || brassMat, g, [ 0, thickness * 2.15, 0 ], [ 0, 0, 0 ], false, false);
    if (jewel) {
        const gem = mesh(new THREE.OctahedronGeometry(radius * .048, 0), jewel, g, [ 0, thickness * 2.15 + radius * .02, 0 ], [ 0, 0, 0 ], false, true);
        gem.scale.y = .55;
    }
    const ringHub = mesh(new THREE.TorusGeometry(hubR * 1.25, thickness * .16, 6, 20), hubMaterial || brassMat, g, [ 0, thickness * 1.02, 0 ], [ Math.PI / 2, 0, 0 ], false, false);
    g.userData.gear = true;
    return g;
}

export function buildBalancePart(mats) {
    const g = new THREE.Group;
    const ringMat = mats.polishedBrass;
    mesh(new THREE.TorusGeometry(.14, .014, 10, 64), ringMat, g, [ 0, .022, 0 ], [ Math.PI / 2, 0, 0 ], true, true);
    mesh(new THREE.TorusGeometry(.15, .006, 8, 64), mats.steel, g, [ 0, .03, 0 ], [ Math.PI / 2, 0, 0 ], false, false);
    for (let i = 0; i < 3; i++) {
        const a = i / 3 * Math.PI * 2;
        mesh(rounded(.13, .008, .012, .0025, 2), ringMat, g, [ 0, .025, 0 ], [ 0, a, 0 ], true, true);
    }
    mesh(new THREE.CylinderGeometry(.014, .016, .02, 12), mats.steel, g, [ 0, .03, 0 ], [ 0, 0, 0 ], true, true);
    const gem = mesh(new THREE.OctahedronGeometry(.016, 0), mats.ruby, g, [ 0, .045, 0 ], [ 0, 0, 0 ], false, true);
    gem.scale.y = .7;
    return g;
}

export function buildLooseParts(scene, mats, tex, benchInfo) {
    const root = new THREE.Group;
    root.name = "Loose movement parts";
    scene.add(root);
    const draggables = [];
    const matY = benchInfo.matTop;
    const rng = mulberry32(777);
    const gearSpecs = [ [ -1.12, .48, .273, 58, 5, .2, "brass", "skeleton", true ], [ -.68, .61, .184, 44, 4, -.34, "polishedBrass", "skeleton", false ], [ -1.38, .78, .108, 34, 5, .65, "gold", "skeleton", true ], [ -.3, .17, .125, 38, 6, -.2, "brass", "skeleton", false ], [ -.52, .82, .09, 28, 4, .45, "agedBrass", "solid", false ], [ -.94, .9, .061, 26, 3, -.6, "gold", "skeleton", false ], [ .18, .55, .155, 40, 5, .1, "polishedBrass", "skeleton", true ], [ .48, .72, .084, 28, 4, .85, "brass", "solid", false ], [ .74, .46, .052, 22, 3, .33, "gold", "skeleton", false ], [ 1.19, .37, .072, 24, 3, -.4, "polishedBrass", "skeleton", true ], [ 1.47, .7, .112, 32, 5, .26, "brass", "skeleton", false ], [ .01, .97, .061, 26, 3, .7, "gold", "skeleton", false ], [ .56, 1.1, .045, 20, 3, -.2, "agedBrass", "solid", false ], [ 1.72, 1.28, .039, 18, 3, .2, "gold", "solid", false ], [ -.15, 1.42, .052, 24, 4, .4, "brass", "skeleton", false ], [ .93, 1.57, .034, 18, 3, .3, "polishedBrass", "solid", false ], [ .03, .78, .205, 52, 5, .55, "gold", "skeleton", true ], [ -.34, .98, .118, 36, 4, -.15, "brass", "skeleton", false ], [ .68, .94, .088, 28, 3, .6, "polishedBrass", "skeleton", true ], [ -.82, 1.55, .071, 26, 4, -.5, "gold", "solid", false ], [ 1.48, 1.62, .055, 22, 3, .22, "brass", "skeleton", false ], [ -.13, 1.12, .046, 20, 3, .9, "agedBrass", "solid", false ] ];
    const matMap = {
        brass: mats.brass,
        polishedBrass: mats.polishedBrass,
        agedBrass: mats.agedBrass,
        gold: mats.gold
    };
    for (let i = 0; i < gearSpecs.length; i++) {
        const [x, z, radius, teeth, spokes, tilt, mk, style, hasJewel] = gearSpecs[i];
        const rootG = new THREE.Group;
        rootG.position.set(x, matY, z);
        rootG.rotation.y = tilt;
        root.add(rootG);
        const gear = buildGear({
            radius: radius,
            teeth: teeth,
            spokes: spokes,
            material: matMap[mk],
            hubMaterial: mats.steel,
            jewel: hasJewel ? mats.ruby : null,
            style: style,
            thickness: radius > .2 ? .036 : .028
        });
        if (i === 0) gear.position.y = .005;
        rootG.add(gear);
        if (i % 4 === 1) {
            const pinion = buildGear({
                radius: radius * .24,
                teeth: 12,
                spokes: 3,
                material: mats.steel,
                hubMaterial: mats.brass,
                thickness: .015
            });
            pinion.position.y = radius > .1 ? .032 : .025;
            rootG.add(pinion);
        }
        rootG.userData.interactive = true;
        rootG.userData.kind = "gear";
        rootG.userData.label = i === 0 ? "Lift the great brass wheel" : "Move the brass wheel";
        const proxy = new THREE.Mesh(new THREE.SphereGeometry(Math.max(radius * .9, .075), 8, 6), new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            depthWrite: false,
            colorWrite: false
        }));
        proxy.position.y = .02;
        proxy.name = "drag proxy";
        rootG.add(proxy);
        draggables.push({
            root: rootG,
            baseY: matY,
            radius: radius * 1.22,
            height: 0,
            vx: 0,
            vz: 0,
            angVel: 0,
            tiltX: 0,
            tiltZ: 0
        });
    }
    for (const [x, z, s, rot] of [ [ -.1, .32, 1.1, .3 ], [ 2.04, 1.72, .82, -.4 ] ]) {
        const g = buildBalancePart(mats);
        g.position.set(x, matY + .005, z);
        g.rotation.y = rot;
        g.scale.setScalar(s);
        root.add(g);
        contactShadow(root, tex.contact, .32 * s, .42, matY + .001, x, z);
    }
    const jewelSpecs = [ [ -1.55, 1.18, .037, "ruby" ], [ -1.21, 1.47, .028, "emerald" ], [ -.65, 1.38, .023, "sapphire" ], [ -.2, 1.7, .021, "ruby" ], [ .46, 1.85, .032, "emerald" ], [ .95, 1.84, .025, "ruby" ], [ 1.6, 1.7, .021, "amethyst" ], [ 1.62, 1.22, .018, "emerald" ], [ .14, 1.12, .016, "ruby" ], [ 1.15, 1.12, .023, "sapphire" ], [ -.27, 1.22, .03, "amethyst" ], [ 2.08, 1.32, .026, "emerald" ], [ -.86, 1.68, .017, "ruby" ], [ .26, 1.32, .015, "emerald" ], [ .82, 1.4, .02, "amethyst" ] ];
    const jewelMap = {
        ruby: mats.ruby,
        emerald: mats.emerald,
        sapphire: mats.sapphire,
        amethyst: mats.amethyst
    };
    for (let i = 0; i < jewelSpecs.length; i++) {
        const [x, z, s, kind] = jewelSpecs[i];
        const g = new THREE.Group;
        g.position.set(x, matY + .008, z);
        root.add(g);
        if (i % 3 === 0) {
            mesh(new THREE.TorusGeometry(s * 1.6, s * .25, 6, 20), mats.polishedBrass, g, [ 0, .025, 0 ], [ Math.PI / 2, 0, 0 ], false, true);
        }
        const stone = mesh(new THREE.OctahedronGeometry(s, 0), jewelMap[kind], g, [ 0, s * 1.1, 0 ], [ 0, rng() * Math.PI, rng() * .1 ], true, true);
        stone.scale.set(1, 1.2, .8);
        if (i === 4) {
            g.userData.interactive = true;
            g.userData.kind = "jewel";
            g.userData.label = "Turn the emerald in the light";
            const proxy = new THREE.Mesh(new THREE.SphereGeometry(.06, 6, 4), new THREE.MeshBasicMaterial({
                colorWrite: false,
                depthWrite: false
            }));
            proxy.position.y = .01;
            g.add(proxy);
            draggables.push({
                root: g,
                baseY: matY + .008,
                radius: .04,
                vx: 0,
                vz: 0,
                angVel: 0,
                tiltX: 0,
                tiltZ: 0
            });
        }
        contactShadow(root, tex.contact, s * 7, .38, matY - .003, x, z);
    }
    const movement = new THREE.Group;
    movement.position.set(-.55, matY + .01, 1.38);
    movement.rotation.y = .6;
    root.add(movement);
    mesh(new THREE.CylinderGeometry(.155, .16, .018, 40), mats.brass, movement, [ 0, .012, 0 ], [ 0, 0, 0 ], true, true);
    mesh(new THREE.CylinderGeometry(.135, .14, .006, 40), mats.age || mats.agedBrass, movement, [ 0, .024, 0 ], [ 0, 0, 0 ], true, true);
    mesh(new THREE.TorusGeometry(.052, .014, 10, 32), mats.polishedBrass, movement, [ .06, .033, .02 ], [ Math.PI / 2, 0, 0 ], false, true);
    mesh(new THREE.OctahedronGeometry(.025, 0), mats.ruby, movement, [ .06, .046, .02 ], [ 0, 0, 0 ], false, true);
    mesh(new THREE.CylinderGeometry(.019, .019, .012, 18), mats.steel, movement, [ -.08, .032, -.03 ]);
    contactShadow(root, tex.contact, .5, .48, matY - .003, -.55, 1.38);
    const springPts = [];
    for (let i = 0; i <= 110; i++) {
        const t = i / 110;
        const a = t * Math.PI * 7.8;
        const r = .005 + t * .095;
        springPts.push([ .83, matY + .021 + t * .002, 1.44 + Math.sin(a) * r ]);
        springPts[i][0] += Math.cos(a) * r;
    }
    tubeThrough(springPts, .0017, mats.copper, root, false, 160);
    const balance = buildBalancePart(mats);
    balance.position.set(-.53, matY + .012, 1.28);
    balance.rotation.y = .62;
    balance.scale.setScalar(1.45);
    root.add(balance);
    const balanceSpring = [];
    for (let i = 0; i <= 105; i++) {
        const t = i / 105;
        const a = t * Math.PI * 7.2;
        const rr = .012 + t * .13;
        balanceSpring.push([ -.53 + Math.cos(a) * rr, matY + .045 + t * .004, 1.28 + Math.sin(a) * rr ]);
    }
    tubeThrough(balanceSpring, .0015, mats.steel, root, false, 160);
    const bareMovement = new THREE.Group;
    bareMovement.position.set(.72, matY + .012, .38);
    bareMovement.rotation.y = -.55;
    root.add(bareMovement);
    mesh(new THREE.CylinderGeometry(.135, .14, .014, 36), mats.brass, bareMovement, [ 0, 0, 0 ]);
    mesh(new THREE.CylinderGeometry(.12, .122, .008, 36), mats.agedBrass, bareMovement, [ 0, .011, 0 ]);
    mesh(new THREE.TorusGeometry(.1, .009, 7, 36), mats.polishedBrass, bareMovement, [ 0, .018, 0 ], [ Math.PI / 2, 0, 0 ], false, true);
    mesh(new THREE.BoxGeometry(.2, .018, .044), mats.brass, bareMovement, [ .02, .027, .025 ], [ 0, .6, 0 ], true, true);
    mesh(new THREE.CylinderGeometry(.025, .025, .02, 14), mats.polishedBrass, bareMovement, [ -.05, .033, -.03 ]);
    mesh(new THREE.CylinderGeometry(.013, .013, .021, 12), mats.blackenedSteel, bareMovement, [ .07, .035, .02 ]);
    mesh(new THREE.OctahedronGeometry(.018, 0), mats.ruby, bareMovement, [ .06, .045, .02 ], [ 0, .4, 0 ], false, true);
    const crystal = new THREE.Group;
    crystal.position.set(1.28, matY + .02, 1.7);
    crystal.rotation.y = .25;
    root.add(crystal);
    mesh(new THREE.CylinderGeometry(.105, .105, .006, 36), mats.thinGlass, crystal, [ 0, .002, 0 ], [ 0, 0, 0 ], false, false);
    mesh(new THREE.TorusGeometry(.107, .008, 6, 40), mats.polishedBrass, crystal, [ 0, .004, 0 ], [ Math.PI / 2, 0, 0 ], false, false);
    for (const [x, z, s, m] of [ [ 1.12, 1.45, .023, mats.sapphire ], [ 1.39, 1.52, .017, mats.ruby ], [ .4, .68, .018, mats.emerald ], [ -.74, .42, .021, mats.ruby ] ]) {
        const chaton = new THREE.Group;
        chaton.position.set(x, matY + .006, z);
        root.add(chaton);
        mesh(new THREE.TorusGeometry(s * 1.7, s * .28, 6, 18), mats.polishedBrass, chaton, [ 0, .01, 0 ], [ Math.PI / 2, 0, 0 ], false, true);
        mesh(new THREE.OctahedronGeometry(s, 0), m, chaton, [ 0, s * .8, 0 ], [ 0, .3, 0 ], false, true);
    }
    const accentStones = [ [ .42, 1.4, .048, "emerald" ], [ .69, 1.78, .056, "ruby" ], [ .94, 2.11, .047, "amethyst" ], [ .49, 2.02, .036, "sapphire" ], [ .78, 2.4, .052, "emerald" ], [ 1.32, 2.19, .045, "ruby" ], [ 1.16, 2.41, .04, "emerald" ], [ 1.47, 1.79, .044, "sapphire" ], [ .68, 1.62, .034, "ruby" ], [ 1.02, 1.95, .03, "amethyst" ] ];
    for (let i = 0; i < accentStones.length; i++) {
        const [x, z, rawSc, kind] = accentStones[i];
        const sc = rawSc * .62;
        const g2 = new THREE.Group;
        g2.position.set(x, matY + .006, z);
        root.add(g2);
        if (i % 3 === 0) {
            mesh(new THREE.TorusGeometry(sc * 1.6, sc * .22, 6, 22), mats.polishedBrass, g2, [ 0, sc * .45, 0 ], [ Math.PI / 2, 0, 0 ], false, true);
            for (let k = 0; k < 4; k++) {
                const a = k / 4 * Math.PI * 2;
                mesh(new THREE.SphereGeometry(sc * .14, 6, 5), mats.brass, g2, [ Math.cos(a) * sc * 1.6, sc * .56, Math.sin(a) * sc * 1.6 ], [ 0, 0, 0 ], false, false);
            }
        }
        const stone = mesh(createGemGeometry(sc, sc * 1.18, sc * .52, sc * .7, 8, .5), jewelMap[kind], g2, [ 0, sc * .6, 0 ], [ 0, rng() * 6, 0 ], true, true);
        stone.name = "loose " + kind;
        contactShadow(root, tex.contact, sc * 7.5, .32, matY - .003, x, z);
    }
    const screwGeo = new THREE.CylinderGeometry(.013, .013, .014, 14);
    const slotGeo = new THREE.BoxGeometry(.022, .002, .003);
    for (const [x, z] of [ [ -1.01, 1.08 ], [ -.47, .47 ], [ .31, .27 ], [ .98, .83 ], [ 1.32, 1.5 ], [ -1.61, .66 ], [ .64, .37 ] ]) {
        const sg = new THREE.Group;
        sg.position.set(x, matY + .012, z);
        sg.rotation.y = rng() * 6;
        root.add(sg);
        mesh(screwGeo, mats.steel, sg, [ 0, 0, 0 ], [ 0, 0, 0 ], false, false);
        mesh(slotGeo, mats.blackenedSteel, sg, [ 0, .008, 0 ], [ 0, 0, 0 ], false, false);
    }
    return {
        root: root,
        draggables: draggables
    };
}

export function buildTray(parent, mats, tex, pos = [ -2.26, 0, 1.86 ]) {
    const g = new THREE.Group;
    g.name = "Parts tray";
    g.position.set(...pos);
    g.rotation.y = .07;
    parent.add(g);
    const w = 1.78, d = 1.16;
    const trayWood = mats.drawerWood.clone();
    trayWood.color = new THREE.Color(8282182);
    trayWood.roughness = .58;
    trayWood.envMapIntensity = .35;
    mesh(rounded(w, .18, d, .03), trayWood, g, [ 0, .09, 0 ]);
    mesh(rounded(w + .035, .045, .055, .018), trayWood, g, [ 0, .185, d / 2 - .025 ]);
    mesh(rounded(w + .035, .045, .055, .018), trayWood, g, [ 0, .185, -d / 2 + .025 ]);
    mesh(rounded(.05, .045, d - .06, .012), trayWood, g, [ -w / 2 + .025, .185, 0 ]);
    mesh(rounded(.05, .045, d - .06, .012), trayWood, g, [ w / 2 - .025, .185, 0 ]);
    mesh(new THREE.PlaneGeometry(w - .09, d - .09), mats.velvet, g, [ 0, .176, 0 ], [ -Math.PI / 2, 0, 0 ], false, true);
    const dividerMat = mats.ebony;
    mesh(new THREE.BoxGeometry(w - .08, .026, .014), dividerMat, g, [ 0, .184, .12 ]);
    for (const x of [ -.42, 0, .42 ]) {
        mesh(new THREE.BoxGeometry(.013, .026, d - .08), dividerMat, g, [ x, .184, 0 ]);
    }
    const dialPositions = [ [ -.62, -.21, .125 ], [ .21, -.2, .1 ], [ .62, -.22, .086 ], [ -.62, .35, .11 ], [ -.21, .34, .086 ], [ .62, .35, .116 ] ];
    for (let i = 0; i < dialPositions.length; i++) {
        const [x, z, r] = dialPositions[i];
        const y = .18;
        const dial = new THREE.Group;
        dial.position.set(x, y, z);
        dial.rotation.y = i * 1.7 % (Math.PI * 2);
        g.add(dial);
        mesh(new THREE.CircleGeometry(r, 40), mats.dialMats[i % mats.dialMats.length], dial, [ 0, .003, 0 ], [ -Math.PI / 2, 0, 0 ], false, true);
        mesh(new THREE.TorusGeometry(r * 1.04, r * .05, 8, 44), i % 2 ? mats.polishedBrass : mats.silver, dial, [ 0, .004, 0 ], [ Math.PI / 2, 0, 0 ], false, false);
        mesh(new THREE.CylinderGeometry(r * .98, r * .98, .01, 36), mats.brass, dial, [ 0, -.005, 0 ], [ 0, 0, 0 ], false, false);
        const tickMat = new THREE.MeshBasicMaterial({
            color: 2760983
        });
        for (let k = 0; k < 12; k++) {
            const a = k / 12 * Math.PI * 2;
            const rr = r * .83;
            mesh(new THREE.BoxGeometry(.0075, .0012, r * .085), tickMat, dial, [ Math.cos(a) * rr, .006, Math.sin(a) * rr ], [ 0, -a, 0 ], false, false);
        }
        mesh(new THREE.TorusGeometry(r * .7, .0018, 4, 48), tickMat, dial, [ 0, .006, 0 ], [ Math.PI / 2, 0, 0 ], false, false);
        const handMat = new THREE.MeshBasicMaterial({
            color: 2169362
        });
        for (const [len, width, angle] of [ [ r * .44, .008, i * 1.25 + .4 ], [ r * .62, .005, i * 2.3 - .7 ] ]) {
            const pivot = new THREE.Group;
            pivot.position.set(0, .012, 0);
            pivot.rotation.y = angle;
            dial.add(pivot);
            mesh(new THREE.BoxGeometry(width, .0015, len), handMat, pivot, [ 0, 0, -len / 2 ], [ 0, 0, 0 ], false, false);
        }
        mesh(new THREE.CylinderGeometry(r * .05, r * .05, .006, 12), mats.blackenedSteel, dial, [ 0, .011, 0 ], [ 0, 0, 0 ], false, false);
    }
    mesh(new THREE.CylinderGeometry(.125, .13, .025, 40), mats.brass, g, [ -.21, .19, -.2 ], [ 0, .4, 0 ], true, true);
    mesh(new THREE.CylinderGeometry(.105, .11, .014, 40), mats.agedBrass, g, [ -.21, .208, -.2 ], [ 0, .4, 0 ], true, true);
    mesh(new THREE.TorusGeometry(.07, .008, 8, 36), mats.polishedBrass, g, [ -.18, .218, -.2 ], [ Math.PI / 2, 0, 0 ], false, false);
    const mini = buildGear({
        radius: .044,
        teeth: 22,
        spokes: 3,
        material: mats.gold,
        hubMaterial: mats.steel,
        thickness: .014
    });
    mini.position.set(.21, .192, .34);
    mini.rotation.y = .3;
    g.add(mini);
    const mini2 = buildGear({
        radius: .029,
        teeth: 16,
        spokes: 3,
        material: mats.brass,
        hubMaterial: mats.steel,
        thickness: .011
    });
    mini2.position.set(.28, .193, .28);
    mini2.rotation.y = 1.1;
    g.add(mini2);
    groundShadow(g, tex, 2, 1.4, .34, 0, 0, .006, 0);
    contactShadow(g, tex.contact, 2.2, .62, .008);
    return g;
}

export function buildJar(parent, mats, tex, pos = [ -2.16, 0, .22 ]) {
    const g = new THREE.Group;
    g.name = "Glass jar";
    g.position.set(...pos);
    parent.add(g);
    const height = 1.34;
    const pts = [ new THREE.Vector2(.02, 0), new THREE.Vector2(.335, 0), new THREE.Vector2(.39, .025), new THREE.Vector2(.415, .07), new THREE.Vector2(.42, .34), new THREE.Vector2(.418, .76), new THREE.Vector2(.405, .98), new THREE.Vector2(.34, 1.17), new THREE.Vector2(.285, 1.235), new THREE.Vector2(.27, 1.255) ];
    const shell = mesh(new THREE.LatheGeometry(pts, 72), mats.glass, g, [ 0, 0, 0 ], [ 0, 0, 0 ], true, false);
    shell.renderOrder = 3;
    const rimShellMat = new THREE.ShaderMaterial({
        uniforms: {
            uWarm: {
                value: new THREE.Color(16769200)
            },
            uCool: {
                value: new THREE.Color(12374485)
            }
        },
        vertexShader: `\n      varying vec3 vN;\n      varying vec3 vV;\n      varying vec3 vWorld;\n      void main() {\n        vN = normalize(mat3(modelMatrix) * normal);\n        vec4 wp = modelMatrix * vec4(position, 1.0);\n        vWorld = wp.xyz;\n        vV = normalize(cameraPosition - wp.xyz);\n        gl_Position = projectionMatrix * viewMatrix * wp;\n      }\n    `,
        fragmentShader: `\n      uniform vec3 uWarm;\n      uniform vec3 uCool;\n      varying vec3 vN;\n      varying vec3 vV;\n      varying vec3 vWorld;\n      void main() {\n        float ndv = abs(dot(normalize(vN), normalize(vV)));\n        float rim = pow(1.0 - ndv, 3.2);\n        float vertical = smoothstep(0.05, 1.0, vWorld.y) * 0.35 + 0.65;\n        vec3 tint = mix(uWarm, uCool, smoothstep(0.15, 1.2, vWorld.y) * 0.35);\n        gl_FragColor = vec4(tint * rim * 0.52 * vertical, rim * 0.6);\n      }\n    `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false
    });
    const rimShell = mesh(new THREE.LatheGeometry(pts, 72), rimShellMat, g, [ 0, 0, 0 ], [ 0, 0, 0 ], false, false);
    rimShell.scale.setScalar(1.004);
    rimShell.renderOrder = 4;
    mesh(new THREE.CylinderGeometry(.36, .35, .015, 48), new THREE.MeshPhysicalMaterial({
        color: 7044706,
        transparent: true,
        opacity: .3,
        roughness: .26,
        metalness: .1,
        envMapIntensity: 1.3
    }), g, [ 0, .018, 0 ]);
    const m = new THREE.Group;
    m.position.set(.06, .05, .02);
    m.rotation.y = .4;
    g.add(m);
    mesh(new THREE.CylinderGeometry(.15, .16, .022, 32), mats.brass, m, [ 0, .02, 0 ], [ 0, 0, 0 ], false, true);
    mesh(new THREE.CylinderGeometry(.12, .125, .008, 32), mats.agedBrass, m, [ 0, .035, 0 ], [ 0, 0, 0 ], false, true);
    mesh(new THREE.TorusGeometry(.04, .011, 8, 24), mats.polishedBrass, m, [ .03, .042, -.01 ], [ Math.PI / 2, 0, 0 ], false, false);
    const lidY = height - .03;
    mesh(new THREE.CylinderGeometry(.305, .3, .08, 48), mats.silver, g, [ 0, lidY, 0 ], [ 0, 0, 0 ], true, true);
    mesh(new THREE.TorusGeometry(.294, .014, 8, 48), mats.polishedBrass, g, [ 0, lidY + .044, 0 ], [ Math.PI / 2, 0, 0 ], false, true);
    const knobPts = [ new THREE.Vector2(.02, 0), new THREE.Vector2(.13, 0), new THREE.Vector2(.16, .02), new THREE.Vector2(.12, .06), new THREE.Vector2(.08, .085), new THREE.Vector2(.09, .12), new THREE.Vector2(.11, .15), new THREE.Vector2(.07, .185), new THREE.Vector2(.03, .2), new THREE.Vector2(.012, .205) ];
    mesh(new THREE.LatheGeometry(knobPts, 40), mats.silver, g, [ 0, lidY + .04, 0 ], [ 0, 0, 0 ], true, true);
    for (let i = 0; i < 36; i++) {
        const a = i / 36 * Math.PI * 2;
        mesh(new THREE.BoxGeometry(.008, .06, .014), mats.brushedSteel, g, [ Math.cos(a) * .31, lidY, Math.sin(a) * .31 ], [ 0, -a, 0 ], false, false);
    }
    const glintMat = new THREE.MeshBasicMaterial({
        color: 16767137,
        transparent: true,
        opacity: .45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
    });
    for (const [x, y, z, sx, sy, rz] of [ [ -.405, .74, .12, .032, .52, .1 ], [ .408, .56, .08, .023, .38, -.08 ], [ -.32, 1.08, .12, .014, .2, -.16 ], [ -.19, .28, .37, .011, .22, -.1 ], [ .1, .44, .4, .008, .3, .04 ] ]) {
        const q = mesh(new THREE.PlaneGeometry(sx, sy), glintMat, g, [ x, y, z ], [ 0, Math.PI / 2, rz ], false, false);
        q.renderOrder = 5;
    }
    const lidGlintMat = new THREE.MeshBasicMaterial({
        color: 16773326,
        transparent: true,
        opacity: .5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
    });
    mesh(new THREE.TorusGeometry(.3, .006, 4, 48, Math.PI * 1.2), lidGlintMat, g, [ 0, height - .07, 0 ], [ Math.PI / 2, 0, .5 ], false, false).renderOrder = 5;
    mesh(new THREE.TorusGeometry(.287, .004, 4, 48, Math.PI * .9), lidGlintMat, g, [ 0, 1.235, 0 ], [ Math.PI / 2, 0, -.3 ], false, false).renderOrder = 5;
    const innerLamp = new THREE.PointLight(16763273, .55, 1.1, 2);
    innerLamp.position.set(.02, .3, .1);
    g.add(innerLamp);
    const rimGlint = new THREE.MeshBasicMaterial({
        color: 16773846,
        transparent: true,
        opacity: .28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
    });
    mesh(new THREE.TorusGeometry(.292, .005, 4, 56), rimGlint, g, [ 0, height - .075, 0 ], [ Math.PI / 2, 0, 0 ], false, false).renderOrder = 4;
    mesh(new THREE.TorusGeometry(.405, .004, 4, 64), rimGlint, g, [ 0, .31, 0 ], [ Math.PI / 2, 0, 0 ], false, false).renderOrder = 4;
    const hlCanvas = document.createElement("canvas");
    hlCanvas.width = 128;
    hlCanvas.height = 512;
    const hc = hlCanvas.getContext("2d");
    const hg = hc.createLinearGradient(0, 0, 128, 0);
    hg.addColorStop(0, "rgba(255,250,232,0)");
    hg.addColorStop(.32, "rgba(255,249,226,0.35)");
    hg.addColorStop(.52, "rgba(255,255,246,0.95)");
    hg.addColorStop(.7, "rgba(255,244,214,0.28)");
    hg.addColorStop(1, "rgba(255,240,210,0)");
    const vg = hc.createLinearGradient(0, 0, 0, 512);
    vg.addColorStop(0, "rgba(255,255,255,0)");
    vg.addColorStop(.16, "rgba(255,255,255,0.55)");
    vg.addColorStop(.5, "rgba(255,255,255,1)");
    vg.addColorStop(.86, "rgba(255,255,255,0.5)");
    vg.addColorStop(1, "rgba(255,255,255,0)");
    hc.fillStyle = hg;
    hc.fillRect(0, 0, 128, 512);
    hc.globalCompositeOperation = "destination-in";
    hc.fillStyle = vg;
    hc.fillRect(0, 0, 128, 512);
    const hlTex = new THREE.CanvasTexture(hlCanvas);
    hlTex.colorSpace = THREE.SRGBColorSpace;
    const hlMat = new THREE.SpriteMaterial({
        map: hlTex,
        color: 16773332,
        transparent: true,
        opacity: .5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
    });
    const hl1 = new THREE.Sprite(hlMat);
    hl1.position.set(-.36, .76, .24);
    hl1.scale.set(.16, .9, 1);
    hl1.renderOrder = 6;
    g.add(hl1);
    const hlMat2 = hlMat.clone();
    hlMat2.color = new THREE.Color(12571605);
    hlMat2.opacity = .3;
    const hl2 = new THREE.Sprite(hlMat2);
    hl2.position.set(.35, .64, .2);
    hl2.scale.set(.1, .68, 1);
    hl2.renderOrder = 6;
    g.add(hl2);
    const innerWatch = new THREE.Group;
    innerWatch.position.set(-.06, .23, .08);
    innerWatch.rotation.set(-.35, .7, .12);
    innerWatch.scale.setScalar(1.35);
    g.add(innerWatch);
    mesh(new THREE.CylinderGeometry(.115, .12, .015, 32), mats.gold, innerWatch, [ 0, 0, 0 ], [ 0, 0, 0 ], false, true);
    mesh(new THREE.TorusGeometry(.12, .012, 8, 40), mats.brass, innerWatch, [ 0, .012, 0 ], [ Math.PI / 2, 0, 0 ], false, true);
    mesh(new THREE.CylinderGeometry(.035, .035, .02, 14), mats.steel, innerWatch, [ .03, .02, 0 ], [ 0, 0, 0 ], false, false);
    mesh(new THREE.OctahedronGeometry(.02, 0), mats.ruby, innerWatch, [ .03, .035, 0 ], [ 0, 0, 0 ], false, false);
    mesh(new THREE.BoxGeometry(.16, .008, .035), mats.brass, innerWatch, [ -.01, .026, .02 ], [ 0, .3, 0 ], false, false);
    mesh(new THREE.CylinderGeometry(.43, .45, .028, 48), mats.ebony, g, [ 0, -.005, 0 ], [ 0, 0, 0 ], false, true);
    groundShadow(g, tex, 1.1, 1.1, .4, .02, 0, .007, 0);
    contactShadow(g, tex.contact, 1.2, .7, .008);
    return g;
}

export function buildArborStand(parent, mats, tex, pos = [ -.22, 0, -.05 ]) {
    const g = new THREE.Group;
    g.name = "Staking stand";
    g.position.set(...pos);
    parent.add(g);
    mesh(rounded(1.34, .14, .78, .02), mats.ebony, g, [ 0, .07, 0 ]);
    mesh(rounded(1.26, .02, .7, .008), mats.brass, g, [ 0, .148, 0 ]);
    const heights = [ .36, .49, .26, .58, .21, .42, .33 ];
    for (let i = 0; i < heights.length; i++) {
        const x = -.48 + i * .15 + (i % 2 ? .02 : 0);
        const z = -.16 + i % 3 * .15;
        const h = heights[i];
        mesh(new THREE.CylinderGeometry(.006, .012, h, 8), mats.steel, g, [ x, .15 + h / 2, z ], [ 0, 0, (i - 3) * .015 ], true, true);
        mesh(new THREE.CylinderGeometry(.022, .02, .015, 12), mats.brass, g, [ x, .158, z ]);
        if (i % 2 === 0) {
            const wheel = buildGear({
                radius: .04,
                teeth: 18,
                spokes: 3,
                material: mats.gold,
                hubMaterial: mats.steel,
                thickness: .012
            });
            wheel.position.set(x + .01, .17 + h * .45, z);
            g.add(wheel);
        }
        mesh(new THREE.CylinderGeometry(.004, .007, .014, 8), mats.polishedBrass, g, [ x, .16 + h, z ]);
    }
    const pot = new THREE.Group;
    pot.position.set(.47, .15, .08);
    g.add(pot);
    mesh(new THREE.CylinderGeometry(.11, .1, .22, 24, 1, true), mats.brass, pot, [ 0, .11, 0 ], [ 0, 0, 0 ], true, true);
    mesh(new THREE.CylinderGeometry(.1, .1, .012, 24), mats.agedBrass, pot, [ 0, .01, 0 ]);
    for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2;
        const h = .62 + i % 3 * .2;
        const b = mesh(new THREE.CylinderGeometry(.007, .01, h, 6), i % 2 ? mats.ebony : mats.brass, pot, [ Math.cos(a) * .05, .14 + h / 2, Math.sin(a) * .05 ], [ Math.sin(a) * .15, 0, -Math.cos(a) * .15 ], false, true);
        if (i % 2 === 0) mesh(new THREE.SphereGeometry(.022, 8, 6), mats.paper, pot, [ b.position.x, .14 + h, b.position.z ], [ 0, 0, 0 ], false, false);
    }
    groundShadow(g, tex, 1.65, 1.05, .36, 0, 0, .007, 0);
    contactShadow(g, tex.contact, 1.7, .58, .008);
    return g;
}

export function buildScrewdriverBlock(parent, mats, tex, pos = [ 2.62, 0, 1.12 ]) {
    const g = new THREE.Group;
    g.name = "Screwdriver block";
    g.position.set(...pos);
    g.rotation.y = -.1;
    parent.add(g);
    const w = 1.08, h = .5, d = .8;
    const blockWood = mats.drawerWood.clone();
    blockWood.color = new THREE.Color(13805695);
    blockWood.roughness = .5;
    blockWood.clearcoat = .18;
    blockWood.clearcoatRoughness = .4;
    blockWood.envMapIntensity = .5;
    mesh(rounded(w, h, d, .065, 5), blockWood, g, [ 0, h / 2, 0 ]);
    mesh(rounded(w + .02, .035, d + .02, .018), blockWood, g, [ 0, h - .012, 0 ]);
    const rng = mulberry32(883);
    const slots = [];
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            if (rng() < .3) continue;
            slots.push([ -.36 + c * .24 + r % 2 * .04, -.24 + r * .16 ]);
        }
    }
    for (const [x, z] of slots) {
        mesh(new THREE.CylinderGeometry(.019, .019, .01, 12), mats.blackenedSteel, g, [ x, h + .002, z ]);
    }
    const slotted = slots.slice(0, 12);
    for (let i = 0; i < slotted.length; i++) {
        const [x, z] = slotted[i];
        const hh = .3 + rng() * .2;
        const tool = new THREE.Group;
        tool.position.set(x, h, z);
        tool.rotation.set((rng() - .5) * .1, rng() * Math.PI * 2, (rng() - .5) * .1);
        g.add(tool);
        mesh(new THREE.CylinderGeometry(.0055, .0085, hh, 10), mats.steel, tool, [ 0, hh / 2, 0 ], [ 0, 0, 0 ], true, true);
        const handleMat = mats.handleMats[(i * 3 + 1) % mats.handleMats.length];
        const hh2 = .18 + rng() * .09;
        const pts = [];
        const segs = 12;
        for (let k = 0; k <= segs; k++) {
            const t = k / segs;
            let r = .029 + Math.sin(t * Math.PI) * .017;
            if (t < .2) r *= .78 + t * 1.1;
            if (t > .1 && t < .36) r += .0018 * Math.sin(t * 70);
            if (t > .72) r *= 1 - (t - .72) * .55;
            pts.push(new THREE.Vector2(r, t * hh2));
        }
        mesh(new THREE.LatheGeometry(pts, 20), handleMat, tool, [ 0, hh - hh2 * .12, 0 ], [ 0, 0, 0 ], true, true);
        mesh(new THREE.CylinderGeometry(.012, .014, .022, 14), mats.brass, tool, [ 0, hh - hh2 * .14, 0 ], [ 0, 0, 0 ], false, true);
        mesh(new THREE.TorusGeometry(.023, .0026, 6, 16), mats.brass, tool, [ 0, hh - hh2 * .68, 0 ], [ Math.PI / 2, 0, 0 ], false, false);
    }
    for (const [x, z, hh] of [ [ -.2, -.24, .46 ], [ .2, -.08, .38 ] ]) {
        mesh(new THREE.CylinderGeometry(.0035, .006, hh, 8), mats.steel, g, [ x, h + hh / 2, z ], [ .02, 0, .03 ], true, true);
    }
    groundShadow(g, tex, 1.45, 1.12, .4, 0, 0, .007, 0);
    contactShadow(g, tex.contact, 1.55, .62, .008);
    return g;
}

function taperedBarGeometry(length, width, thickness, tipScale = .36) {
    const shape = new THREE.Shape;
    const hw = width / 2;
    shape.moveTo(-length / 2, -hw);
    shape.lineTo(length / 2, -hw * tipScale);
    shape.quadraticCurveTo(length / 2 + .02, 0, length / 2, hw * tipScale);
    shape.lineTo(-length / 2, hw);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, {
        depth: thickness,
        bevelEnabled: true,
        bevelSegments: 1,
        bevelSize: thickness * .3,
        bevelThickness: thickness * .3
    });
    geo.rotateX(-Math.PI / 2);
    return geo;
}

export function buildTweezers(parent, mats, tex, pos = [ 1.29, .06, 1.96 ], rot = -.25) {
    const g = new THREE.Group;
    g.name = "Steel tweezers";
    g.position.set(...pos);
    g.rotation.y = rot + Math.PI;
    parent.add(g);
    const tweezerSteel = new THREE.MeshStandardMaterial({
        color: 4015427,
        metalness: .92,
        roughness: .44,
        envMapIntensity: 1
    });
    const tweezerEdge = new THREE.MeshStandardMaterial({
        color: 10135201,
        metalness: .9,
        roughness: .34,
        envMapIntensity: 1
    });
    for (const s of [ -1, 1 ]) {
        mesh(taperedBarGeometry(1.72, .052, .026, .07), tweezerSteel, g, [ 0, .023, s * .078 ], [ 0, s * .062, 0 ], true, true);
        mesh(taperedBarGeometry(1.34, .008, .0024, .22), tweezerEdge, g, [ .1, .039, s * .078 ], [ 0, s * .062, 0 ], false, false);
        mesh(rounded(.16, .022, .064, .009, 2), tweezerSteel, g, [ -.68, .03, s * .088 ], [ 0, 0, 0 ], true, true);
    }
    mesh(new THREE.CylinderGeometry(.036, .036, .2, 18), mats.blackenedSteel, g, [ -.56, .026, 0 ], [ Math.PI / 2, 0, 0 ], true, true);
    mesh(new THREE.CylinderGeometry(.042, .042, .024, 18), mats.agedBrass, g, [ -.56, .026, 0 ], [ Math.PI / 2, 0, 0 ], true, true);
    mesh(new THREE.CylinderGeometry(.006, .006, .22, 8), mats.steel, g, [ -.56, .026, 0 ], [ Math.PI / 2, 0, 0 ], false, false);
    groundShadow(g, tex, 2, .2, .34, .02, 0, .006, 0);
    contactShadow(g, tex.contact, 1.9, .38, .004);
    return g;
}

export function buildWoodTool(parent, mats, tex, pos = [ 1.15, .058, 2.28 ], rot = .025) {
    const g = new THREE.Group;
    g.name = "Rosewood burnisher";
    g.position.set(...pos);
    g.rotation.y = rot;
    parent.add(g);
    const shaft = mesh(new THREE.CylinderGeometry(.0065, .025, .85, 20), mats.polishedBrass, g, [ -.43, .042, 0 ], [ 0, 0, Math.PI / 2 ], true, true);
    mesh(new THREE.CylinderGeometry(.026, .034, .07, 18), mats.agedBrass, g, [ .02, .042, 0 ], [ 0, 0, Math.PI / 2 ], true, true);
    mesh(new THREE.SphereGeometry(.008, 10, 8), mats.steel, g, [ -.855, .042, 0 ], [ 0, 0, 0 ], false, true);
    mesh(new THREE.BoxGeometry(.7, .004, .007), mats.silver, g, [ -.43, .062, 0 ], [ 0, 0, .005 ], false, false);
    const handleMat = new THREE.MeshPhysicalMaterial({
        map: tex.drawerWood.map,
        color: 14987652,
        roughness: .26,
        metalness: .02,
        clearcoat: .65,
        clearcoatRoughness: .16,
        envMapIntensity: 1.4
    });
    const pts = [];
    for (let i = 0; i <= 26; i++) {
        const t = i / 26;
        let r;
        if (t < .06) r = .035 * (t / .06); else if (t < .16) r = .035 + (t - .06) / .1 * .022; else if (t < .78) r = .057 + Math.sin((t - .16) / .62 * Math.PI) * .023 + Math.sin(t * 31) * .0022; else r = .057 * (1 - Math.pow((t - .78) / .22, 1.6) * .72);
        pts.push(new THREE.Vector2(Math.max(.005, r), t * .43));
    }
    mesh(new THREE.LatheGeometry(pts, 36), handleMat, g, [ .07, .042, 0 ], [ 0, 0, -Math.PI / 2 ], true, true);
    mesh(new THREE.CylinderGeometry(.043, .046, .035, 22), mats.brass, g, [ .085, .042, 0 ], [ 0, 0, Math.PI / 2 ], true, true);
    mesh(new THREE.TorusGeometry(.046, .006, 8, 24), mats.polishedBrass, g, [ .49, .042, 0 ], [ 0, Math.PI / 2, 0 ], false, false);
    mesh(new THREE.SphereGeometry(.038, 18, 12), mats.darkWood, g, [ .512, .042, 0 ], [ 0, 0, 0 ], false, true);
    groundShadow(g, tex, 1.28, .24, .4, -.12, 0, .006, 0);
    contactShadow(g, tex.contact, 1.7, .34, .004);
    return g;
}

export function buildLensCup(parent, mats, tex, pos = [ 1.22, 0, .23 ]) {
    const g = new THREE.Group;
    g.position.set(...pos);
    parent.add(g);
    mesh(new THREE.CylinderGeometry(.14, .16, .15, 28), mats.darkMetal, g, [ 0, .075, 0 ], [ 0, 0, 0 ], true, true);
    mesh(new THREE.CylinderGeometry(.162, .162, .025, 28), mats.brass, g, [ 0, .01, 0 ], [ 0, 0, 0 ], true, true);
    mesh(new THREE.CylinderGeometry(.11, .11, .035, 24), mats.blackenedSteel, g, [ 0, .155, 0 ], [ 0, 0, 0 ], true, true);
    groundShadow(g, tex, .36, .36, .42, 0, 0, .007, 0);
    contactShadow(g, tex.contact, .42, .55, .008);
    return g;
}

export function buildCable(parent, mats, tex) {
    const pts = [ [ -2.05, .018, .7 ], [ -1.9, .018, .85 ], [ -1.54, .018, .9 ], [ -1.25, .018, 1.06 ], [ -1.03, .018, 1.21 ], [ -.95, .018, 1.42 ], [ -1.14, .018, 1.54 ], [ -1.35, .018, 1.4 ], [ -1.42, .018, 1.2 ], [ -1.62, .018, 1.08 ], [ -1.7, .018, .92 ] ];
    const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
    mesh(new THREE.TubeGeometry(curve, 120, .012, 8, false), mats.rubber, parent);
    mesh(new THREE.CylinderGeometry(.018, .022, .07, 10), mats.agedBrass, parent, [ -2.03, .035, .69 ], [ .2, 0, .4 ], true, true);
}

export function buildPaperwork(parent, mats, tex, pos = [ 2.08, .06, .28 ]) {
    const g = new THREE.Group;
    g.position.set(...pos);
    g.rotation.y = .18;
    parent.add(g);
    for (let i = 0; i < 3; i++) {
        const sheet = mesh(new THREE.PlaneGeometry(.55, .72), mats.paper, g, [ i * .012, i * .001, i * .006 ], [ -Math.PI / 2, 0, -.12 + i * .06 ], false, true);
        sheet.material = mats.paper;
    }
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const c = canvas.getContext("2d");
    c.clearRect(0, 0, 512, 512);
    c.strokeStyle = "rgba(76,59,39,0.42)";
    c.lineWidth = 2;
    c.beginPath();
    c.arc(240, 230, 135, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.arc(240, 230, 100, 0, Math.PI * 2);
    c.stroke();
    for (let i = 0; i < 14; i++) {
        const a = i / 14 * Math.PI * 2;
        c.beginPath();
        c.moveTo(240 + Math.cos(a) * 105, 230 + Math.sin(a) * 105);
        c.lineTo(240 + Math.cos(a) * 132, 230 + Math.sin(a) * 132);
        c.stroke();
    }
    c.font = "italic 23px Georgia, serif";
    c.fillStyle = "rgba(71,51,30,0.45)";
    c.fillText("échappement — 12 1/2′", 88, 430);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.MeshBasicMaterial({
        map: t,
        transparent: true,
        depthWrite: false
    });
    mesh(new THREE.PlaneGeometry(.52, .52), m, g, [ 0, .01, .006 ], [ -Math.PI / 2, 0, -.08 ], false, false);
    contactShadow(g, tex.contact, .7, .25, .004);
    return g;
}

export function buildCounterStillLife(parent, mats, tex) {
    const g = new THREE.Group;
    g.name = "Counter still life";
    parent.add(g);
    const tray2 = new THREE.Group;
    tray2.position.set(-.96, .015, -1.16);
    tray2.rotation.y = .12;
    g.add(tray2);
    mesh(rounded(1.55, .11, .74, .02), mats.darkWood, tray2, [ 0, .055, 0 ]);
    mesh(rounded(1.43, .04, .62, .012), mats.ebony, tray2, [ 0, .115, 0 ]);
    mesh(new THREE.PlaneGeometry(1.36, .56), mats.velvet, tray2, [ 0, .138, 0 ], [ -Math.PI / 2, 0, 0 ], false, true);
    for (const x of [ -.38, .17, .5 ]) mesh(new THREE.BoxGeometry(.02, .065, .56), mats.brass, tray2, [ x, .13, 0 ]);
    mesh(new THREE.BoxGeometry(1.28, .05, .018), mats.brass, tray2, [ 0, .13, .05 ]);
    for (let i = 0; i < 6; i++) {
        const x = -.55 + i % 3 * .42;
        const z = -.13 + Math.floor(i / 3) * .24;
        const dial = new THREE.Group;
        dial.position.set(x, .145, z);
        dial.rotation.y = i * .8;
        tray2.add(dial);
        mesh(new THREE.CircleGeometry(.12 + i % 2 * .03, 30), mats.dialMats[i % mats.dialMats.length], dial, [ 0, .002, 0 ], [ -Math.PI / 2, 0, 0 ]);
        mesh(new THREE.TorusGeometry(.13 + i % 2 * .03, .007, 6, 32), mats.polishedBrass, dial, [ 0, .004, 0 ], [ Math.PI / 2, 0, 0 ], false, false);
    }
    const brushPot = new THREE.Group;
    brushPot.position.set(-1.68, 0, -.82);
    g.add(brushPot);
    mesh(new THREE.CylinderGeometry(.095, .085, .22, 22, 1, true), mats.brass, brushPot, [ 0, .12, 0 ]);
    mesh(new THREE.CylinderGeometry(.09, .09, .012, 22), mats.agedBrass, brushPot, [ 0, .012, 0 ]);
    for (let i = 0; i < 7; i++) {
        const a = i / 7 * Math.PI * 2;
        const hh = .42 + i % 3 * .14;
        const handle = mesh(new THREE.CylinderGeometry(.006, .01, hh, 6), i % 3 ? mats.ebony : mats.darkWood, brushPot, [ Math.cos(a) * .04, .26 + hh / 2, Math.sin(a) * .04 ], [ Math.sin(a) * .18, 0, -Math.cos(a) * .18 ], false, true);
        mesh(new THREE.SphereGeometry(.017 + i % 2 * .006, 8, 6), mats.paper, brushPot, [ Math.cos(a) * .06, .25 + hh + .02, Math.sin(a) * .06 ], [ 0, 0, 0 ], false, false);
    }
    const tinMat = mats.agedBrass;
    for (const [x, z, r, h] of [ [ -2.52, -1.16, .16, .12 ], [ -2.13, -1.35, .12, .09 ], [ -2.82, -1.42, .1, .2 ], [ -3.05, -.92, .13, .08 ] ]) {
        mesh(new THREE.CylinderGeometry(r, r * 1.02, h, 24), tinMat, g, [ x, h / 2, z ], [ 0, 0, 0 ], false, true);
        mesh(new THREE.TorusGeometry(r * .94, .009, 6, 24), mats.polishedBrass, g, [ x, h, z ], [ Math.PI / 2, 0, 0 ], false, false);
    }
    for (let i = 0; i < 3; i++) {
        mesh(rounded(.34 - i * .03, .17, .27 - i * .02, .014), i === 1 ? mats.drawerWood2 : mats.darkWood, g, [ 2.11, .085 + i * .173, -1.52 ], [ 0, .12 * i, 0 ], false, true);
        mesh(new THREE.BoxGeometry(.34 - i * .03, .018, .28 - i * .02), mats.brass, g, [ 2.11, .085 + i * .173, -1.52 ], [ 0, 0, 0 ], false, false);
    }
    const amber = new THREE.MeshPhysicalMaterial({
        color: 6106896,
        roughness: .08,
        metalness: .02,
        transmission: .55,
        thickness: .22,
        transparent: true,
        opacity: .88,
        ior: 1.46,
        envMapIntensity: 1.8
    });
    const bottle = new THREE.Group;
    bottle.position.set(.93, 0, -1.34);
    g.add(bottle);
    mesh(new THREE.CylinderGeometry(.12, .14, .48, 20), amber, bottle, [ 0, .24, 0 ], [ 0, 0, 0 ], false, false);
    mesh(new THREE.CylinderGeometry(.055, .1, .15, 18), amber, bottle, [ 0, .54, 0 ], [ 0, 0, 0 ], false, false);
    mesh(new THREE.CylinderGeometry(.058, .058, .06, 14), mats.agedBrass, bottle, [ 0, .63, 0 ]);
    mesh(new THREE.CylinderGeometry(.045, .06, .06, 14), mats.ebony, bottle, [ 0, .69, 0 ]);
    mesh(new THREE.CylinderGeometry(.16, .17, .04, 20), mats.blackenedSteel, g, [ 1.58, .02, -1.19 ]);
    mesh(new THREE.CylinderGeometry(.15, .15, .24, 20), mats.darkMetal, g, [ 1.58, .15, -1.19 ]);
    mesh(new THREE.CylinderGeometry(.17, .17, .012, 20), mats.brass, g, [ 1.58, .275, -1.19 ]);
    const disk = new THREE.Group;
    disk.position.set(-1.52, .02, .12);
    disk.rotation.x = .02;
    g.add(disk);
    mesh(new THREE.CylinderGeometry(.235, .235, .03, 44), mats.blackenedSteel, disk, [ 0, .015, 0 ]);
    mesh(new THREE.TorusGeometry(.225, .022, 10, 52), mats.agedBrass, disk, [ 0, .035, 0 ], [ Math.PI / 2, 0, 0 ], false, true);
    mesh(new THREE.CircleGeometry(.2, 44), new THREE.MeshPhysicalMaterial({
        color: 1120279,
        metalness: .25,
        roughness: .09,
        envMapIntensity: 1.4
    }), disk, [ 0, .033, 0 ], [ -Math.PI / 2, 0, 0 ], false, true);
    const brassTool = new THREE.Group;
    brassTool.position.set(1.85, 0, -.95);
    g.add(brassTool);
    mesh(new THREE.CylinderGeometry(.08, .1, .06, 18), mats.brass, brassTool, [ 0, .03, 0 ]);
    mesh(new THREE.CylinderGeometry(.022, .028, .44, 12), mats.brass, brassTool, [ 0, .25, 0 ]);
    mesh(new THREE.TorusGeometry(.12, .012, 7, 30), mats.polishedBrass, brassTool, [ 0, .47, 0 ], [ Math.PI / 2, 0, 0 ], false, false);
    mesh(new THREE.CylinderGeometry(.008, .012, .3, 8), mats.steel, brassTool, [ .08, .48, 0 ], [ 0, 0, .6 ], false, true);
    mesh(new THREE.SphereGeometry(.025, 10, 8), mats.polishedBrass, brassTool, [ .16, .6, 0 ], [ 0, 0, 0 ], false, false);
    const bokehMat = new THREE.MeshBasicMaterial({
        color: 16763523,
        transparent: true,
        opacity: .55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
    });
    for (const [x, y, z, r] of [ [ -2.7, 1.13, -2.2, .02 ], [ 2.1, 1.49, -2.3, .018 ], [ .7, 2.85, -2.7, .014 ], [ 2.7, 2.5, -2.5, .012 ] ]) {
        mesh(new THREE.SphereGeometry(r, 8, 6), bokehMat, g, [ x, y, z ], [ 0, 0, 0 ], false, false);
    }
    return g;
}

export function buildLamp(parent, mats, tex, pos = [ -1.25, 0, .16 ]) {
    const g = new THREE.Group;
    g.name = "Tungsten task lamp";
    g.position.set(...pos);
    parent.add(g);
    const armCurve = new THREE.CatmullRomCurve3([ new THREE.Vector3(-3.18, 2.82, -.58), new THREE.Vector3(-2.46, 3.12, -.5), new THREE.Vector3(-1.62, 3.18, -.36), new THREE.Vector3(-.84, 3.02, -.12), new THREE.Vector3(-.42, 3.18, .02) ]);
    const arm = mesh(new THREE.TubeGeometry(armCurve, 80, .034, 12, false), mats.polishedBrass, g);
    mesh(new THREE.TubeGeometry(armCurve, 80, .01, 6, false), mats.agedBrass, g).position.set(0, .024, 0);
    const standBase = new THREE.Vector3(-3.18, 0, -.58);
    mesh(new THREE.CylinderGeometry(.26, .32, .09, 28), mats.ebony, g, [ standBase.x, .045, standBase.z ], [ 0, 0, 0 ], false, true);
    mesh(new THREE.CylinderGeometry(.05, .065, 2.76, 18), mats.brass, g, [ standBase.x, 1.42, standBase.z ], [ 0, 0, 0 ], true, true);
    for (const yy of [ .28, 1.42, 2.6 ]) {
        mesh(new THREE.CylinderGeometry(.09, .09, .12, 22), mats.agedBrass, g, [ standBase.x, yy, standBase.z ], [ 0, 0, 0 ], true, true);
    }
    mesh(new THREE.SphereGeometry(.12, 18, 14), mats.brass, g, [ standBase.x, 2.81, standBase.z ], [ 0, 0, 0 ], false, true);
    for (const t of [ .16, .52, .82 ]) {
        const p = armCurve.getPoint(t);
        const tangent = armCurve.getTangent(t);
        const collar = mesh(new THREE.CylinderGeometry(.062, .052, .1, 18), mats.polishedBrass, g, [ p.x, p.y, p.z ]);
        collar.quaternion.setFromUnitVectors(UP, tangent);
    }
    helix([ -2.35, 2.98, -.47 ], [ -1.56, 3.09, -.32 ], .045, 20, mats.brass, g, .0055, 6);
    mesh(new THREE.SphereGeometry(.095, 18, 14), mats.blackenedSteel, g, [ -3.17, 2.82, -.58 ], [ 0, 0, 0 ], false, true);
    const shade = new THREE.Group;
    shade.name = "Enamel shade";
    shade.position.set(-.34, 2.36, .08);
    shade.rotation.set(-.3, .18, .035);
    g.add(shade);
    const prof = [];
    const N = 30;
    for (let i = 0; i <= N; i++) {
        const t = i / N;
        const rr = .81 * Math.pow(Math.cos(t * Math.PI / 2), .7) + .012;
        const yy = Math.sin(t * Math.PI / 2) * .63;
        prof.push(new THREE.Vector2(rr, yy));
    }
    prof.unshift(new THREE.Vector2(.74, -.055), new THREE.Vector2(.785, -.038), new THREE.Vector2(.8, 0));
    const geo = new THREE.LatheGeometry(prof, 96);
    const outside = mesh(geo, mats.lampMetal, shade, [ 0, 0, 0 ], [ 0, 0, 0 ], true, false);
    outside.material.side = THREE.FrontSide;
    const inside = mesh(geo, mats.shadeInterior, shade, [ 0, .004, 0 ], [ 0, 0, 0 ], false, false);
    inside.scale.set(.988, .993, .988);
    mesh(new THREE.TorusGeometry(.789, .019, 10, 96), mats.polishedBrass, shade, [ 0, -.008, 0 ], [ Math.PI / 2, 0, 0 ], false, false);
    mesh(new THREE.TorusGeometry(.74, .012, 8, 96), mats.brass, shade, [ 0, -.05, 0 ], [ Math.PI / 2, 0, 0 ], false, false);
    mesh(new THREE.CylinderGeometry(.075, .15, .2, 28), mats.brass, shade, [ 0, .66, 0 ], [ 0, 0, 0 ], true, false);
    mesh(new THREE.SphereGeometry(.05, 16, 12), mats.polishedBrass, shade, [ 0, .79, 0 ], [ 0, 0, 0 ], false, false);
    const fin = mesh(new THREE.SphereGeometry(.07, 16, 12), mats.blackenedSteel, shade, [ 0, .72, 0 ], [ 0, 0, 0 ], false, false);
    mesh(rounded(.19, .08, .11, .018), mats.brass, shade, [ .02, .83, -.02 ], [ 0, .15, 0 ], true, false);
    const bulbY = .1;
    const bulbMat = new THREE.MeshBasicMaterial({
        color: 16774100,
        toneMapped: true
    });
    const bulb = mesh(new THREE.SphereGeometry(.108, 24, 18), bulbMat, shade, [ 0, bulbY, 0 ], [ 0, 0, 0 ], false, false);
    bulb.scale.set(1, 1.08, 1);
    mesh(new THREE.TorusGeometry(.023, .004, 6, 18), new THREE.MeshBasicMaterial({
        color: 16775390,
        toneMapped: false
    }), shade, [ 0, bulbY - .015, .02 ], [ .45, 0, 0 ], false, false);
    mesh(new THREE.SphereGeometry(.038, 16, 10), new THREE.MeshBasicMaterial({
        color: 16775135,
        toneMapped: false
    }), shade, [ 0, bulbY - .004, .01 ], [ 0, 0, 0 ], false, false);
    mesh(new THREE.CylinderGeometry(.032, .047, .075, 16), mats.brass, shade, [ 0, bulbY + .09, 0 ], [ 0, 0, 0 ], false, false);
    mesh(new THREE.CylinderGeometry(.05, .05, .012, 18), mats.agedBrass, shade, [ 0, bulbY + .135, 0 ], [ 0, 0, 0 ], false, false);
    const innerBulbGlow = new THREE.PointLight(16758905, .3, 1.15, 2);
    innerBulbGlow.position.set(0, bulbY, 0);
    shade.add(innerBulbGlow);
    const glowMat = new THREE.SpriteMaterial({
        map: tex.glow,
        color: 16765850,
        transparent: true,
        opacity: .14,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
        toneMapped: false
    });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.set(1.9, 1.9, 1);
    glow.position.set(0, bulbY - .01, .03);
    shade.add(glow);
    const hotGlowMat = new THREE.SpriteMaterial({
        map: tex.glow,
        color: 16766603,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        toneMapped: false
    });
    const hotGlow = new THREE.Sprite(hotGlowMat);
    hotGlow.scale.set(.72, .72, 1);
    hotGlow.position.set(0, bulbY - .01, .035);
    hotGlow.renderOrder = 28;
    shade.add(hotGlow);
    const hotCoreMat = new THREE.SpriteMaterial({
        map: tex.glow,
        color: 16776175,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        toneMapped: false
    });
    const hotCore = new THREE.Sprite(hotCoreMat);
    hotCore.scale.set(.21, .21, 1);
    hotCore.position.set(0, bulbY - .008, .04);
    hotCore.renderOrder = 29;
    shade.add(hotCore);
    const collarGlow = new THREE.PointLight(16758124, .36, 1, 2);
    collarGlow.position.set(0, .5, 0);
    shade.add(collarGlow);
    shade.updateWorldMatrix(true, true);
    const bulbWorld = new THREE.Vector3(0, bulbY, 0).applyMatrix4(shade.matrixWorld);
    const openingWorld = new THREE.Vector3(0, -.08, 0).applyMatrix4(shade.matrixWorld);
    const target = new THREE.Vector3(-.15, 0, 1.35);
    return {
        root: g,
        shade: shade,
        bulbWorld: bulbWorld,
        openingWorld: openingWorld,
        target: target,
        glow: glow
    };
}

const LENS_VERT = `\n  varying vec2 vUv;\n  void main() {\n    vUv = uv;\n    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n  }\n`;

const LENS_FRAG = `\n  uniform sampler2D tScene;\n  uniform float uClarity;\n  uniform float uTime;\n  uniform float uReflect;\n  varying vec2 vUv;\n\n  float hash(vec2 p) {\n    p = fract(p * vec2(123.34, 456.21));\n    p += dot(p, p + 45.32);\n    return fract(p.x * p.y);\n  }\n\n  void main() {\n    vec2 p = vUv * 2.0 - 1.0;\n    float r = length(p);\n    // true loupe distortion: a very slight barrel pull at the periphery\n    vec2 uv = 0.5 + p * (0.994 + 0.008 * r * r) * 0.5;\n    float transmission = smoothstep(0.1, 0.9, uClarity);\n\n    // crisp magnified scene; a whisper of unsharp mask restores the metal edges\n    vec3 base = texture2D(tScene, uv).rgb;\n    vec2 tx = vec2(1.0 / 768.0);\n    vec3 soft = texture2D(tScene, uv + tx * vec2(1.0, 0.0)).rgb\n              + texture2D(tScene, uv - tx * vec2(1.0, 0.0)).rgb\n              + texture2D(tScene, uv + tx * vec2(0.0, 1.0)).rgb\n              + texture2D(tScene, uv - tx * vec2(0.0, 1.0)).rgb;\n    soft *= 0.25;\n    base += (base - soft) * (0.12 + 0.14 * transmission);\n    base *= mix(0.8, 1.05, transmission);\n\n    // Reflections of the workshop caught in the crown glass. The cool window\n    // sits lower-left, the lamp crests upper-right; a soft rectangular pane\n    // and its muntins give the mirror something architectural to describe.\n    vec3 refl = vec3(0.0);\n    vec2 wp = p - vec2(-0.4, -0.22);\n    float pane = smoothstep(0.62, 0.34, abs(wp.x * 1.1)) * smoothstep(0.68, 0.4, abs(wp.y * 1.35));\n    refl += vec3(0.44, 0.6, 0.62) * pane * 0.85;\n    float mull = smoothstep(0.018, 0.0, abs(p.x + 0.44)) + smoothstep(0.018, 0.0, abs(p.y - 0.3));\n    refl += vec3(0.72, 0.84, 0.84) * mull * 0.55;\n    vec2 wq = p - vec2(-0.44, -0.4);\n    float win = exp(-dot(wq * vec2(1.0, 1.8), wq * vec2(1.0, 1.8)) * 14.0);\n    refl += vec3(0.37, 0.52, 0.54) * win * 1.8;\n    vec2 lq = p - vec2(-0.32 + uReflect * 0.11, 0.42 + sin(uTime * 0.23) * 0.02);\n    float lamp = exp(-dot(lq * vec2(2.0, 1.05), lq * vec2(2.0, 1.05)) * 26.0);\n    refl += vec3(1.0, 0.71, 0.4) * lamp * 2.3;\n    float streak = smoothstep(0.05, 0.0, abs(p.y - p.x * 0.58 - 0.1 + uReflect * 0.05));\n    streak *= smoothstep(0.93, 0.25, r);\n    refl += vec3(1.0, 0.84, 0.6) * streak * 0.5;\n    float sky = smoothstep(1.0, 0.18, r) * smoothstep(0.7, -0.1, p.y) * smoothstep(-0.8, 0.2, p.x);\n    refl += vec3(0.14, 0.2, 0.21) * sky * 0.4;\n    // a reflected glint high on the crown, opposite the lamp\n    vec2 cq = p - vec2(0.44, -0.35);\n    refl += vec3(0.85, 0.9, 0.88) * exp(-dot(cq, cq) * 220.0) * 0.9;\n\n    // At rest the glass is a dark mirror; in focus the real magnified image\n    // rises through it almost untouched. The architectural reflection drops\n    // away as the eye settles on the work — only travelling glints remain.\n    vec3 restGlass = vec3(0.018, 0.016, 0.011) + refl;\n    vec3 col = mix(restGlass + base * 0.18, base * 1.04, transmission);\n    col += refl * 0.055 * transmission;\n\n    // a narrow travelling lamp caustic on the crown when in focus\n    vec2 gq = p - vec2(0.34 + uReflect * 0.08, 0.28);\n    float caustic = exp(-dot(gq * vec2(2.6, 1.2), gq * vec2(2.6, 1.2)) * 36.0);\n    col += vec3(1.0, 0.82, 0.55) * caustic * 0.045 * transmission;\n\n    // bright edge where glass meets the barrel\n    float rim = smoothstep(0.86, 0.98, r) * (1.0 - smoothstep(0.985, 1.0, r));\n    col += vec3(0.9, 0.72, 0.45) * rim * (0.1 + 0.18 * (1.0 - transmission));\n    float edge = smoothstep(0.7, 1.0, r);\n    col *= mix(1.0, 0.4, edge * edge);\n    col = mix(col, vec3(0.12, 0.09, 0.052), edge * 0.45);\n    col *= 1.0 - 0.16 * smoothstep(0.45, 1.0, r);\n    gl_FragColor = vec4(max(col, 0.0), 1.0);\n  }\n`;

export function buildLoupe(parent, mats, tex) {
    const rig = new THREE.Group;
    rig.name = "Articulated loupe";
    parent.add(rig);
    const base = new THREE.Vector3(2.18, .06, -1.3);
    const shoulder = new THREE.Vector3(2.25, 1, -1.28);
    const restPos = new THREE.Vector3(.95, 1.83, .52);
    const focusPos = new THREE.Vector3(.12, .98, 1.36);
    mesh(rounded(.82, .22, .72, .06), mats.ebony, rig, [ base.x, base.y + .08, base.z ]);
    mesh(rounded(.68, .12, .6, .035), mats.darkMetal, rig, [ base.x, base.y + .22, base.z ]);
    mesh(new THREE.CylinderGeometry(.24, .27, .08, 32), mats.brass, rig, [ base.x, base.y + .29, base.z ]);
    for (const [dx, dz] of [ [ -.22, -.18 ], [ .22, -.18 ], [ -.22, .18 ], [ .22, .18 ] ]) {
        mesh(new THREE.SphereGeometry(.017, 10, 8), mats.polishedBrass, rig, [ base.x + dx, base.y + .16, base.z + dz ], [ 0, 0, 0 ], false, false);
    }
    mesh(new THREE.CylinderGeometry(.035, .048, .74, 18), mats.brass, rig, [ shoulder.x, base.y + .55, shoulder.z ], [ 0, 0, 0 ], true, true);
    mesh(new THREE.CylinderGeometry(.06, .06, .075, 24), mats.polishedBrass, rig, [ shoulder.x, .8, shoulder.z ], [ 0, 0, 0 ], true, true);
    mesh(new THREE.SphereGeometry(.056, 18, 14), mats.blackenedSteel, rig, [ shoulder.x, shoulder.y, shoulder.z ], [ 0, 0, 0 ], true, true);
    const knobPts = [ new THREE.Vector2(.01, 0), new THREE.Vector2(.035, .008), new THREE.Vector2(.04, .028), new THREE.Vector2(.026, .05), new THREE.Vector2(.012, .062) ];
    const knob1 = mesh(new THREE.LatheGeometry(knobPts, 20), mats.brass, rig, [ shoulder.x + .064, shoulder.y + .01, shoulder.z ], [ 0, 0, -Math.PI / 2 ], true, true);
    const knob2 = mesh(new THREE.LatheGeometry(knobPts, 20), mats.brass, rig, [ shoulder.x, shoulder.y - .065, shoulder.z + .03 ], [ Math.PI, 0, 0 ], true, true);
    const barGeo = new THREE.BoxGeometry(1, 1, 1);
    const armSegments = [];
    for (let i = 0; i < 2; i++) {
        const bar = mesh(barGeo, mats.brass, rig, [ 0, 0, 0 ], [ 0, 0, 0 ], true, true);
        const accent = mesh(barGeo, mats.agedBrass, rig, [ 0, 0, 0 ], [ 0, 0, 0 ], false, false);
        armSegments.push({
            bar: bar,
            accent: accent
        });
    }
    const jointA = mesh(new THREE.SphereGeometry(.042, 18, 14), mats.blackenedSteel, rig);
    const jointB = mesh(new THREE.SphereGeometry(.033, 16, 12), mats.brass, rig);
    const lensAssembly = new THREE.Group;
    lensAssembly.name = "Loupe head";
    lensAssembly.scale.setScalar(.86);
    rig.add(lensAssembly);
    const innerRadius = .352;
    const ringGeo = new THREE.TorusGeometry(.392, .034, 18, 96);
    const lensRimMat = new THREE.MeshStandardMaterial({
        color: 6048565,
        metalness: .95,
        roughness: .3,
        envMapIntensity: 1.6
    });
    const lensRing = mesh(ringGeo, lensRimMat, lensAssembly, [ 0, 0, 0 ], [ 0, 0, 0 ], true, true);
    const lensTrim = mesh(new THREE.TorusGeometry(.432, .011, 10, 96), mats.agedBrass, lensAssembly, [ 0, 0, .004 ], [ 0, 0, 0 ], true, true);
    const lensInnerTrim = mesh(new THREE.TorusGeometry(.342, .009, 8, 96), mats.brushedSteel, lensAssembly, [ 0, 0, .03 ], [ 0, 0, 0 ], false, false);
    mesh(new THREE.CylinderGeometry(.34, .305, .14, 64, 1, true), mats.blackenedSteel, lensAssembly, [ 0, 0, -.085 ], [ Math.PI / 2, 0, 0 ], true, true);
    mesh(new THREE.TorusGeometry(.306, .014, 8, 64), mats.agedBrass, lensAssembly, [ 0, 0, -.154 ], [ 0, 0, 0 ], false, true);
    const lensArcMat = new THREE.MeshBasicMaterial({
        color: 16770749,
        transparent: true,
        opacity: .3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
    });
    const arc1 = mesh(new THREE.TorusGeometry(.326, .0032, 4, 96, Math.PI * 1.05), lensArcMat, lensAssembly, [ 0, 0, .05 ], [ 0, 0, .45 ], false, false);
    arc1.renderOrder = 5;
    const knurlGeo = new THREE.BoxGeometry(.01, .01, .044);
    const knurls = new THREE.InstancedMesh(knurlGeo, mats.agedBrass, 96);
    const dummy = new THREE.Object3D;
    for (let i = 0; i < 96; i++) {
        const a = i / 96 * Math.PI * 2;
        dummy.position.set(Math.cos(a) * .437, Math.sin(a) * .437, .006);
        dummy.rotation.set(0, 0, a);
        dummy.updateMatrix();
        knurls.setMatrixAt(i, dummy.matrix);
    }
    knurls.castShadow = true;
    lensAssembly.add(knurls);
    const lensUniforms = {
        tScene: {
            value: null
        },
        uClarity: {
            value: .45
        },
        uTime: {
            value: 0
        },
        uReflect: {
            value: 0
        }
    };
    const lensMaterial = new THREE.ShaderMaterial({
        uniforms: lensUniforms,
        vertexShader: LENS_VERT,
        fragmentShader: LENS_FRAG,
        toneMapped: false,
        side: THREE.DoubleSide
    });
    const lensGlass = mesh(new THREE.CircleGeometry(innerRadius, 96), lensMaterial, lensAssembly, [ 0, 0, .034 ], [ 0, 0, 0 ], false, false);
    lensGlass.name = "Magnifying glass";
    const rimGlow = new THREE.MeshBasicMaterial({
        color: 15123853,
        transparent: true,
        opacity: .28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
    });
    mesh(new THREE.TorusGeometry(.398, .003, 4, 96), rimGlow, lensAssembly, [ 0, 0, .054 ], [ 0, 0, 0 ], false, false);
    mesh(rounded(.12, .09, .09, .018), mats.brass, lensAssembly, [ .432, .02, -.01 ], [ 0, 0, .2 ], true, true);
    mesh(new THREE.SphereGeometry(.03, 14, 10), mats.blackenedSteel, lensAssembly, [ .464, .04, 0 ], [ 0, 0, 0 ], true, true);
    const gripMat = new THREE.MeshStandardMaterial({
        color: 2758162,
        roughness: .82
    });
    mesh(new THREE.CylinderGeometry(.04, .04, .07, 16), gripMat, lensAssembly, [ .478, -.055, 0 ], [ 0, 0, Math.PI / 2 ], false, false);
    const loupeTargets = [ lensRing, lensGlass, lensTrim, lensInnerTrim, lensAssembly ];
    lensAssembly.userData.isLoupe = true;
    lensRing.userData.isLoupe = true;
    const attachmentLocal = new THREE.Vector3(.482, .03, 0);
    const tmpQuat = new THREE.Quaternion;
    const tmpVec = new THREE.Vector3;
    const tmpElbow = new THREE.Vector3;
    const tmpAttach = new THREE.Vector3;
    function update(t, cameraObj, time = 0) {
        const eased = t * t * (3 - 2 * t);
        const swing = Math.sin(Math.PI * eased) * .28;
        const lensPos = restPos.clone().lerp(focusPos, eased);
        lensPos.y += swing;
        lensPos.z += Math.sin(Math.PI * eased) * .17;
        lensAssembly.position.copy(lensPos);
        lensAssembly.quaternion.copy(cameraObj.quaternion);
        lensAssembly.rotateX(.115 - eased * .045 + Math.sin(time * .22) * .006);
        lensAssembly.rotateY(-.07 + eased * .05);
        lensAssembly.rotateZ(-.025);
        lensAssembly.updateMatrixWorld(true);
        tmpAttach.copy(attachmentLocal).applyMatrix4(lensAssembly.matrixWorld);
        tmpElbow.copy(shoulder).lerp(tmpAttach, .48);
        tmpElbow.y += .31 - eased * .17;
        tmpElbow.x += .17 - eased * .06;
        tmpElbow.z -= .08;
        setBar(armSegments[0], shoulder, tmpElbow, .052, .017);
        setBar(armSegments[1], tmpElbow, tmpAttach, .038, .014);
        jointA.position.copy(tmpElbow);
        jointB.position.copy(tmpAttach);
        jointA.scale.set(1, 1, 1);
        knob2.position.copy(shoulder).add(new THREE.Vector3(0, -.07, .04));
        lensUniforms.uTime.value = time;
        lensUniforms.uReflect.value = Math.max(-1, Math.min(1, (cameraObj.position.x - .2) * .14));
    }
    function setBar(segment, a, b, w, h) {
        const {bar: bar, accent: accent} = segment;
        const dir = b.clone().sub(a);
        const len = dir.length();
        bar.position.copy(a).addScaledVector(dir, .5);
        bar.quaternion.setFromUnitVectors(UP, dir.normalize());
        bar.scale.set(w, len, h);
        accent.position.copy(bar.position);
        accent.quaternion.copy(bar.quaternion);
        accent.scale.set(w * .14, len * 1.01, h * 1.06);
        accent.position.add(new THREE.Vector3(0, 0, h * .56).applyQuaternion(bar.quaternion));
    }
    update(0, {
        quaternion: new THREE.Quaternion,
        position: new THREE.Vector3(.2, 2.5, 6.5)
    }, 0);
    return {
        rig: rig,
        base: base,
        shoulder: shoulder,
        restPos: restPos,
        focusPos: focusPos,
        lensAssembly: lensAssembly,
        lensGlass: lensGlass,
        lensMaterial: lensMaterial,
        lensUniforms: lensUniforms,
        loupeTargets: loupeTargets,
        update: update,
        innerRadius: innerRadius,
        attachmentLocal: attachmentLocal
    };
}

export function buildDust(scene, tex, lamp) {
    const N = 95;
    const positions = new Float32Array(N * 3);
    const rng = mulberry32(31415);
    const center = lamp.bulbWorld;
    for (let i = 0; i < N; i++) {
        const a = rng() * Math.PI * 2;
        const rad = Math.pow(rng(), .6) * 1.55;
        positions[i * 3] = center.x + Math.cos(a) * rad;
        positions[i * 3 + 1] = .12 + rng() * 2.1;
        positions[i * 3 + 2] = center.z + Math.sin(a) * rad + (rng() - .5) * .8;
    }
    const geo = new THREE.BufferGeometry;
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
        map: tex.dust,
        color: 16764817,
        size: .017,
        transparent: true,
        opacity: .34,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
        toneMapped: false
    });
    const points = new THREE.Points(geo, mat);
    points.name = "Dust motes";
    scene.add(points);
    return {
        points: points,
        positions: positions,
        count: N
    };
}
