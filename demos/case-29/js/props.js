import * as THREE from "three";

import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

import { box, cylinder, mesh, sphere, torus, disc, flange, pipeThrough, curveFrom, cylinderBetween, handwheel, chainBetween, setShadows, rng, TAU, canvasLabelTexture, makeGlowSprite, makeMistSprite } from "./lib.js";

import { HALL } from "./world.js";

export function buildStaircase(T, M) {
    const group = new THREE.Group;
    group.name = "CastIronStaircase";
    const steps = 18;
    const rise = .29;
    const run = .5;
    const width = 1.72;
    const totalRise = steps * rise;
    const totalRun = steps * run;
    group.position.set(-4.25, 0, -1.95);
    group.rotation.y = .095;
    const iron = M.stairIron;
    const treadMat = M.treadIron;
    const dark = M.greenBlack;
    const angle = Math.atan2(totalRise, totalRun);
    const L = Math.hypot(totalRise, totalRun);
    for (const side of [ -1, 1 ]) {
        const stringer = box(.13, .26, L + .2, iron, side * (width / 2 + .04), totalRise / 2 + .02, totalRun / 2);
        stringer.userData.label = "stringer";
        stringer.rotation.x = -angle;
        group.add(stringer);
        const lowerStringer = box(.08, .11, L + .1, iron, side * (width / 2 + .1), totalRise / 2 - .52, totalRun / 2);
        lowerStringer.userData.label = "lower-stringer";
        lowerStringer.rotation.x = -angle;
        group.add(lowerStringer);
        for (let k = 1; k < 17; k++) {
            const t = k / 17;
            const z = totalRun * t;
            const yy = totalRise * t;
            group.add(cylinderBetween([ side * (width / 2 + .08), yy - .11, z ], [ side * (width / 2 + .11), yy - .47, z - .06 ], .014, iron, 5));
        }
        for (let i = 0; i < 22; i++) {
            const t = (i + .5) / 22;
            const rivet = sphere(.026, M.iron, side * (width / 2 + .17), totalRise * t + .1, totalRun * t, 6);
            group.add(rivet);
        }
    }
    for (let i = 0; i < steps; i++) {
        const y = (i + 1) * rise;
        const z = (i + .5) * run;
        const top = new THREE.Mesh(new THREE.PlaneGeometry(width - .08, run + .02), treadMat);
        top.rotation.x = -Math.PI / 2;
        top.position.set(0, y, z);
        top.castShadow = true;
        top.receiveShadow = true;
        top.userData.label = "tread-top";
        group.add(top);
        const nose = box(width, .075, .09, iron, 0, y - .02, z + run / 2);
        nose.userData.label = "tread-nose";
        group.add(nose);
        const noseEdge = box(width - .04, .012, .022, M.iron, 0, y + .02, z + run / 2 + .036);
        noseEdge.userData.label = "tread-edge";
        group.add(noseEdge);
        for (const side of [ -1, 1 ]) {
            const edging = box(.055, .06, run + .04, iron, side * (width / 2 - .03), y - .03, z);
            edging.userData.label = "tread-frame";
            group.add(edging);
        }
        if (i % 2 === 0) {
            for (const side of [ -1, 1 ]) {
                const brace = cylinderBetween([ side * (width / 2 - .1), y - .28, z + .11 ], [ side * (width / 2 + .05), y - .6, z - .15 ], .026, iron, 6);
                brace.userData.label = "tread-brace";
                group.add(brace);
            }
        }
    }
    for (let i = 1; i < 4; i++) {
        const z = i * totalRun / 3.4;
        const yy = z / run * rise;
        if (yy > .1) {
            const brace = cylinderBetween([ -width / 2 + .12, yy - .48, z - .2 ], [ width / 2 - .12, yy - .48, z - .2 ], .033, iron, 6);
            group.add(brace);
        }
    }
    const railX = width / 2 + .1;
    const wallRailX = -width / 2 - .1;
    const railStart = new THREE.Vector3(railX, rise + 1.06, run * .5);
    const railEnd = new THREE.Vector3(railX, totalRise + 1.06, totalRun - run * .35);
    const handrail = cylinderBetween(railStart, railEnd, .064, iron, 8);
    handrail.userData.label = "handrail";
    group.add(handrail);
    group.add(cylinderBetween(new THREE.Vector3(railX, rise + .54, run * .5), new THREE.Vector3(railX, totalRise + .54, totalRun - run * .35), .018, iron, 6));
    for (let i = 0; i < steps; i += 2) {
        const z = (i + .5) * run;
        const y = (i + 1) * rise;
        const post = cylinderBetween([ railX, y, z ], [ railX, y + 1.06, z ], .036, iron, 6);
        post.userData.label = "rail-post";
        group.add(post);
        const collar = torus(.045, .012, M.iron, railX, y + .62, z, 5, 12);
        collar.rotation.y = Math.PI / 2;
        group.add(collar);
        if (i % 6 === 0) {
            const ball = sphere(.07, M.brass, railX, y + 1.1, z, 10);
            group.add(ball);
        }
    }
    {
        const geo = new THREE.CylinderGeometry(.015, .018, 1, 5);
        const count = steps * 2;
        const inst = new THREE.InstancedMesh(geo, iron, count);
        const m4 = new THREE.Matrix4;
        let idx = 0;
        for (let i = 0; i < steps; i++) {
            for (const k of [ .34, .72 ]) {
                const z = (i + k) * run;
                const y = (i + 1) * rise;
                m4.identity();
                m4.makeTranslation(railX, y + .53, z);
                m4.scale(new THREE.Vector3(1, .98, 1));
                inst.setMatrixAt(idx++, m4);
            }
        }
        inst.count = idx;
        inst.castShadow = true;
        group.add(inst);
    }
    for (let i = 2; i < steps - 2; i += 3) {
        const z = (i + .5) * run;
        const y = (i + 1) * rise + .78;
        const ring = torus(.092, .013, iron, railX, y, z, 4, 22);
        ring.rotation.y = Math.PI / 2;
        group.add(ring);
        for (const off of [ -.055, .055 ]) {
            group.add(cylinderBetween([ railX, y - .055, z + off ], [ railX, y + .055, z + off ], .008, iron, 4));
            group.add(cylinderBetween([ railX, y - .055, z + off + .11 ], [ railX, y + .055, z + off + .11 ], .008, iron, 4));
        }
    }
    for (let i = 1; i < steps - 2; i += 3) {
        const z = (i + .2) * run;
        const y = (i + 1) * rise + .18;
        const pts = [ new THREE.Vector3(railX - .006, y, z), new THREE.Vector3(railX + .02, y + .2, z + .06), new THREE.Vector3(railX + .02, y + .34, z + .2), new THREE.Vector3(railX - .01, y + .22, z + .31), new THREE.Vector3(railX - .02, y + .08, z + .25), new THREE.Vector3(railX - .01, y + .14, z + .12) ];
        const sc = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 18, .014, 5, false), iron);
        sc.castShadow = true;
        group.add(sc);
    }
    group.add(cylinder(.115, .15, .18, iron, railX, .09, run * .5, 12));
    group.add(cylinder(.085, .11, 1.3, iron, railX, .72, run * .5, 12));
    group.add(sphere(.15, M.brass, railX, 1.48, run * .5, 14));
    group.add(torus(.1, .022, iron, railX, 1.36, run * .5, 6, 20));
    const curlPts = [ new THREE.Vector3(railX, rise + 1.06, run * .7), new THREE.Vector3(railX, 1.42, -.02), new THREE.Vector3(railX + .02, 1.55, -.26), new THREE.Vector3(railX + .1, 1.42, -.34), new THREE.Vector3(railX + .12, 1.26, -.23), new THREE.Vector3(railX + .04, 1.28, -.12) ];
    const curl = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curlPts), 32, .045, 6, false), iron);
    curl.castShadow = true;
    group.add(curl);
    const landing = box(width + .35, .1, 1.65, treadMat, 0, totalRise + .02, totalRun + .8);
    landing.castShadow = true;
    group.add(landing);
    for (const side of [ -1, 1 ]) {
        group.add(cylinderBetween([ side * (width / 2 + .15), totalRise + .1, totalRun + .12 ], [ side * (width / 2 + .15), totalRise + 1.1, totalRun + .12 ], .035, iron, 6));
        group.add(cylinderBetween([ side * (width / 2 + .15), totalRise + 1.08, totalRun + .1 ], [ side * (width / 2 + .15), totalRise + 1.08, totalRun + 1.5 ], .04, iron, 6));
    }
    setShadows(group, true, true);
    return {
        group: group,
        totalRise: totalRise,
        totalRun: totalRun,
        width: width,
        railX: railX
    };
}

export function buildWorkbench(T, M) {
    const group = new THREE.Group;
    group.name = "WornWorkbench";
    const centerX = -5.02;
    const centerZ = 5.1;
    const topY = .98;
    const topW = 1.58;
    const topL = 4.62;
    const topGeo = new RoundedBoxGeometry(topW, .13, topL, 2, .035);
    const benchTopMat = M.wood.clone();
    benchTopMat.color.setHex(7164732);
    benchTopMat.roughness = .86;
    benchTopMat.envMapIntensity = .18;
    const top = new THREE.Mesh(topGeo, benchTopMat);
    top.position.set(centerX, topY, centerZ);
    top.castShadow = top.receiveShadow = true;
    group.add(top);
    group.add(box(topW + .08, .055, topL + .08, M.ironBlack, centerX, topY - .095, centerZ));
    group.add(box(topW - .12, .19, topL - .2, M.woodDark, centerX, topY - .22, centerZ));
    group.add(box(topW + .05, .14, .08, M.ironBlack, centerX, topY - .12, centerZ - topL / 2 + .04));
    group.add(box(topW + .05, .14, .08, M.ironBlack, centerX, topY - .12, centerZ + topL / 2 - .04));
    for (const dz of [ -topL / 2 + .21, topL / 2 - .21 ]) {
        for (const dx of [ -topW / 2 + .16, topW / 2 - .16 ]) {
            const leg = box(.09, .84, .09, M.ironBlack, centerX + dx, .48, centerZ + dz);
            group.add(leg);
            group.add(box(.22, .07, .22, M.ironBlack, centerX + dx, .035, centerZ + dz));
        }
        group.add(box(topW - .12, .07, .07, M.ironBlack, centerX, .25, centerZ + dz));
        group.add(box(.07, .07, .56, M.ironBlack, centerX - topW / 2 + .16, .22, centerZ + dz + (dz > 0 ? -.12 : .12)));
        group.add(box(.07, .07, .56, M.ironBlack, centerX + topW / 2 - .16, .22, centerZ + dz + (dz > 0 ? -.12 : .12)));
    }
    const shelf = box(topW - .24, .065, topL - .5, M.woodDark, centerX, .36, centerZ);
    group.add(shelf);
    const crate = new THREE.Mesh(new RoundedBoxGeometry(.52, .28, .32, 2, .02), M.woodDark);
    crate.position.set(centerX - .16, .54, centerZ - 1.45);
    crate.rotation.y = .16;
    crate.castShadow = true;
    group.add(crate);
    for (const o of [ -.13, .13 ]) {
        group.add(box(.025, .2, .33, M.iron, centerX - .16 + o, .54, centerZ - 1.45));
    }
    const rag = new THREE.Mesh(new THREE.PlaneGeometry(.5, .38), M.bristle);
    rag.rotation.set(-Math.PI / 2, .3, .2);
    rag.position.set(centerX + .32, .405, centerZ + 1.3);
    group.add(rag);
    const vise = new THREE.Group;
    vise.position.set(centerX + .24, topY + .11, centerZ - 1.3);
    vise.scale.setScalar(1.55);
    const viseBase = box(.26, .25, .3, M.iron, 0, .11, 0);
    vise.add(viseBase);
    vise.add(box(.3, .12, .28, M.iron, 0, .3, 0));
    vise.add(box(.22, .12, .13, M.iron, -.04, .41, .09));
    vise.add(box(.22, .12, .13, M.iron, -.04, .41, -.11));
    const screw = cylinderBetween([ .16, .35, .15 ], [ .48, .35, .15 ], .035, M.brass, 8);
    vise.add(screw);
    vise.add(cylinder(.035, .035, .42, M.iron, .48, .35, .15, 8));
    const viseHandle = cylinder(.022, .022, .52, M.brass, .48, .35, .15, 8);
    viseHandle.rotation.x = Math.PI / 2;
    vise.add(viseHandle);
    for (const dz of [ -.26, .26 ]) vise.add(sphere(.035, M.iron, .48, .35, .15 + dz, 8));
    vise.rotation.y = .34;
    group.add(vise);
    const lamp = new THREE.Group;
    lamp.position.set(centerX - .02, topY + .065, centerZ - 1.82);
    lamp.scale.setScalar(1.28);
    const base = cylinder(.14, .17, .045, M.brass, 0, .025, 0, 16);
    lamp.add(base);
    lamp.add(cylinder(.018, .024, .44, M.brass, 0, .27, 0, 8));
    const arm = cylinderBetween([ 0, .48, 0 ], [ .18, .62, .15 ], .016, M.brass, 6);
    lamp.add(arm);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(.18, .145, 24, 1, true), M.greenBlack);
    shade.position.set(.22, .6, .18);
    shade.rotation.z = .08;
    shade.castShadow = true;
    lamp.add(shade);
    const inner = new THREE.Mesh(new THREE.SphereGeometry(.055, 12, 8), new THREE.MeshStandardMaterial({
        color: 16765578,
        emissive: 16756818,
        emissiveIntensity: 2.4,
        roughness: .25
    }));
    inner.position.set(.22, .555, .18);
    lamp.add(inner);
    const benchGlow = makeGlowSprite(T.glowTex, .95, 16760182, .22);
    benchGlow.position.set(.22, .55, .18);
    lamp.add(benchGlow);
    group.add(lamp);
    const benchLight = new THREE.PointLight(16757604, 26, 8, 2);
    benchLight.position.set(centerX + .08, topY + 1.05, centerZ - 1.55);
    group.add(benchLight);
    const cablePts = [ new THREE.Vector3(centerX - .29, topY + .1, centerZ - 1.55), new THREE.Vector3(centerX - .72, topY + .02, centerZ - 1.15), new THREE.Vector3(centerX - 1.08, .42, centerZ - .95), new THREE.Vector3(centerX - 1.1, .05, centerZ - .9) ];
    group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cablePts), 32, .011, 5, false), M.ironBlack));
    const scatter = rng(502);
    const toolGroup = new THREE.Group;
    for (let i = 0; i < 3; i++) {
        const x = centerX - .55 + scatter() * .55;
        const z = centerZ - 2.15 + scatter() * 1.35;
        const len = .3 + scatter() * .26;
        const wr = box(.035, .018, len, i % 2 ? M.steel : M.brass, x, topY + .017, z);
        wr.rotation.y = scatter() * Math.PI;
        toolGroup.add(wr);
        const head = torus(.052, .014, i % 2 ? M.steel : M.brass, x + len / 2 * Math.sin(wr.rotation.y), topY + .02, z + len / 2 * Math.cos(wr.rotation.y), 4, 10);
        head.rotation.x = Math.PI / 2;
        toolGroup.add(head);
    }
    for (let i = 0; i < 4; i++) {
        const x = centerX - .62 + scatter() * .7;
        const z = centerZ - 2.05 + scatter() * 1.7;
        const h = box(.022, .022, .27 + scatter() * .28, i % 2 ? M.steel : M.woodDark, x, topY + .023, z);
        h.rotation.y = scatter() * .8 - .4;
        toolGroup.add(h);
        const handle = cylinder(.026, .02, .11, M.woodDark, x + Math.sin(h.rotation.y) * .16, topY + .02, z + Math.cos(h.rotation.y) * .16, 8);
        handle.rotation.x = Math.PI / 2;
        handle.rotation.z = h.rotation.y;
        toolGroup.add(handle);
    }
    const tray = box(.3, .035, .21, M.copperDark, centerX - .38, topY + .025, centerZ - 1.7);
    toolGroup.add(tray);
    for (let i = 0; i < 15; i++) {
        const b = cylinder(.018, .018, .025, M.steel, centerX - .51 + scatter() * .24, topY + .055, centerZ - 1.78 + scatter() * .18, 6);
        b.rotation.z = Math.PI / 2;
        toolGroup.add(b);
    }
    const note = new THREE.Mesh(new THREE.PlaneGeometry(.32, .25), new THREE.MeshStandardMaterial({
        map: T.blueprintTex,
        color: 11906455,
        roughness: .8,
        metalness: 0
    }));
    note.rotation.set(-Math.PI / 2, .25, .2);
    note.position.set(centerX - .48, topY + .071, centerZ - 1.25);
    toolGroup.add(note);
    const hammer = new THREE.Group;
    const hx = centerX - .44, hz = centerZ - 1.95;
    const shaft = box(.032, .028, .38, M.woodDark, hx, topY + .07, hz);
    shaft.rotation.y = .45;
    hammer.add(shaft);
    const head = box(.11, .055, .055, M.steel, hx + Math.sin(.45) * .19, topY + .07, hz + Math.cos(.45) * .19);
    head.rotation.y = .45;
    hammer.add(head);
    toolGroup.add(hammer);
    group.add(toolGroup);
    const benchSpot = new THREE.SpotLight(16760445, 5.5, 5.2, 1.02, 1, 1.45);
    benchSpot.position.set(centerX + .02, topY + 1.3, centerZ - 1.3);
    benchSpot.target.position.set(centerX + .1, topY - .02, centerZ - .95);
    group.add(benchSpot);
    group.add(benchSpot.target);
    const paperMat = new THREE.MeshStandardMaterial({
        color: 12826786,
        roughness: .92,
        metalness: 0
    });
    const sheetMat = new THREE.MeshStandardMaterial({
        map: T.blueprintTex,
        color: 11115910,
        roughness: .92,
        metalness: 0
    });
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(.94, 1.12), sheetMat);
    sheet.rotation.set(-Math.PI / 2, .1, .05);
    sheet.position.set(centerX - .01, topY + .011, centerZ - .36);
    group.add(sheet);
    const loosePaper = new THREE.Mesh(new THREE.PlaneGeometry(.52, .4), paperMat);
    loosePaper.rotation.set(-Math.PI / 2, .18, .12);
    loosePaper.position.set(centerX + .28, topY + .014, centerZ - 1.06);
    group.add(loosePaper);
    for (let i = 0; i < 3; i++) {
        group.add(box(.34 - i * .04, .002, .006, M.ironBlack, centerX + .28, topY + .016, centerZ - 1.15 + i * .05));
    }
    {
        const plane = new THREE.Group;
        plane.position.set(centerX - .3, topY + .065, centerZ - .52);
        plane.rotation.y = .22;
        const bodyMat = M.wood.clone();
        bodyMat.color.setHex(13674357);
        bodyMat.roughness = .7;
        const body = new THREE.Mesh(new RoundedBoxGeometry(.15, .1, .5, 2, .014), bodyMat);
        body.position.y = .055;
        body.castShadow = true;
        plane.add(body);
        plane.add(box(.155, .018, .5, M.woodDark, 0, .007, 0));
        const blade = box(.13, .012, .16, M.steel, 0, .11, -.1);
        blade.rotation.x = -.24;
        plane.add(blade);
        const tote = new THREE.Mesh(new THREE.TorusGeometry(.065, .018, 6, 14, Math.PI), M.woodDark);
        tote.rotation.y = Math.PI / 2;
        tote.position.set(0, .17, .16);
        plane.add(tote);
        const knob = new THREE.Mesh(new THREE.TorusGeometry(.055, .016, 6, 12, Math.PI), M.woodDark);
        knob.rotation.y = Math.PI / 2;
        knob.rotation.z = Math.PI;
        knob.position.set(0, .155, -.14);
        plane.add(knob);
        group.add(plane);
    }
    {
        const bonnet = new THREE.Group;
        bonnet.position.set(centerX + .4, topY + .115, centerZ - 1.48);
        bonnet.rotation.y = .24;
        const b1 = cylinder(.095, .13, .2, M.brass, 0, .02, 0, 18);
        bonnet.add(b1);
        bonnet.add(cylinder(.135, .115, .055, M.copperDark, 0, .145, 0, 18));
        bonnet.add(cylinder(.045, .075, .1, M.brass, 0, .21, 0, 12));
        const stem = cylinder(.026, .026, .16, M.steel, 0, .28, 0, 8);
        bonnet.add(stem);
        bonnet.add(torus(.052, .014, M.brass, 0, .35, 0, 6, 16));
        group.add(bonnet);
    }
    const rag2 = new THREE.Mesh(new THREE.PlaneGeometry(.3, .22), new THREE.MeshStandardMaterial({
        color: 10394245,
        roughness: .98,
        metalness: 0,
        side: THREE.DoubleSide
    }));
    rag2.rotation.set(-Math.PI / 2, .6, .3);
    rag2.position.set(centerX + .05, topY + .013, centerZ - .86);
    group.add(rag2);
    for (let i = 0; i < 3; i++) {
        const coil = torus(.16 - i * .018, .016, i === 1 ? M.brass : M.copper, centerX - .5, topY + .035 + i * .018, centerZ - .72, 6, 26);
        coil.rotation.x = Math.PI / 2;
        group.add(coil);
    }
    const adj = new THREE.Group;
    adj.position.set(centerX - .1, topY + .04, centerZ - .68);
    adj.rotation.y = .62;
    adj.add(box(.05, .028, .56, M.steel, 0, 0, 0));
    adj.add(box(.16, .055, .07, M.steel, 0, .005, -.3));
    adj.add(cylinder(.032, .032, .05, M.brass, 0, .03, -.05, 8));
    group.add(adj);
    const mallet = new THREE.Group;
    mallet.position.set(centerX - .48, topY + .12, centerZ - 1.32);
    mallet.rotation.y = .8;
    const mH = cylinder(.035, .04, .42, M.wood, 0, 0, 0, 8);
    mH.rotation.z = Math.PI / 2;
    mallet.add(mH);
    const mHead = cylinder(.105, .115, .3, M.woodDark, .27, 0, 0, 12);
    mHead.rotation.z = Math.PI / 2;
    mallet.add(mHead);
    for (let i = 0; i < 2; i++) {
        const band = torus(.11, .01, M.ironBlack, .27 + (i ? .08 : -.08), 0, 0, 6, 20);
        band.rotation.y = Math.PI / 2;
        mallet.add(band);
    }
    group.add(mallet);
    {
        const caddy = new THREE.Group;
        caddy.position.set(centerX - .3, topY + .115, centerZ - 1.05);
        caddy.rotation.y = .22;
        caddy.scale.setScalar(1.38);
        caddy.add(box(.42, .23, .26, M.wood, 0, 0, 0));
        caddy.add(box(.38, .035, .22, M.woodDark, 0, .11, 0));
        for (let i = 0; i < 5; i++) {
            const h = .38 + i % 3 * .12;
            const rod = cylinder(.018, .022, h, i % 2 ? M.brass : M.steel, -.13 + i * .065, .12 + h / 2, .02, 6);
            rod.rotation.z = i % 2 ? .055 : -.055;
            caddy.add(rod);
            if (i === 2) caddy.add(box(.13, .06, .045, M.iron, -.13 + i * .065, .12 + h, .02));
        }
        group.add(caddy);
        const pipeWrench = new THREE.Group;
        pipeWrench.position.set(centerX - .05, topY + .05, centerZ - .35);
        pipeWrench.rotation.y = -.5;
        const shaftW = box(.045, .035, .62, M.iron, 0, 0, 0);
        pipeWrench.add(shaftW);
        const jaw = new THREE.Mesh(new THREE.TorusGeometry(.085, .022, 5, 12, Math.PI * 1.35), M.brass);
        jaw.position.set(0, .012, -.34);
        jaw.rotation.x = Math.PI / 2;
        jaw.rotation.z = .2;
        pipeWrench.add(jaw);
        pipeWrench.add(box(.14, .06, .09, M.iron, 0, .02, -.28));
        group.add(pipeWrench);
    }
    const oil = new THREE.Group;
    oil.position.set(centerX - .54, topY + .16, centerZ - 1.82);
    oil.add(cylinder(.075, .095, .22, M.ironBlack, 0, 0, 0, 12));
    oil.add(cylinder(.025, .035, .11, M.ironBlack, 0, .16, 0, 8));
    const spout = cylinderBetween([ 0, .18, 0 ], [ .22, .35, .09 ], .009, M.brass, 5);
    oil.add(spout);
    group.add(oil);
    const can = cylinder(.2, .16, .25, M.steel, centerX - .55, .14, centerZ + 1.6, 16);
    can.castShadow = true;
    group.add(can);
    setShadows(group, true, true);
    return {
        group: group,
        benchLight: benchLight,
        topCenter: new THREE.Vector3(centerX, topY, centerZ)
    };
}

export function buildValveAssembly(T, M) {
    const root = new THREE.Group;
    root.name = "CopperValveAssembly";
    root.position.set(-2.88, 0, 3.1);
    const plinth = cylinder(.61, .72, .22, M.ironBlack, 0, .11, .05, 16);
    root.add(plinth);
    root.add(cylinder(.53, .57, .1, M.iron, 0, .27, .05, 16));
    root.add(cylinder(.34, .4, .63, M.copperDark, 0, .63, .05, 20));
    root.add(cylinder(.42, .37, .12, M.brass, 0, .98, .05, 20));
    root.add(cylinder(.26, .28, .34, M.brass, 0, 1.17, .05, 16));
    root.add(torus(.28, .045, M.brass, 0, 1.3, .05, 8, 20));
    const dome = new THREE.Mesh(new THREE.SphereGeometry(.26, 18, 10, 0, TAU, 0, Math.PI / 2), M.copperDark);
    dome.position.set(0, 1.34, .05);
    root.add(dome);
    root.add(cylinder(.13, .17, .42, M.brass, 0, 1.64, .05, 16));
    root.add(pipeThrough([ [ 0, 1.84, .05 ], [ 0, 2.06, .02 ], [ -.32, 2.24, .02 ], [ -.58, 2.22, -.2 ], [ -.58, 1.3, -.3 ] ], .095, M.copperDark, 36, 10));
    root.add(pipeThrough([ [ 0, .18, .05 ], [ 0, .24, -.42 ], [ -.1, .22, -1.3 ], [ -.32, .22, -2.6 ], [ -.42, .22, -4.2 ] ], .13, M.ironBlack, 42, 10));
    root.add(cylinderBetween([ 0, 1.3, .1 ], [ 0, 1.3, .66 ], .075, M.brass, 10));
    root.add(flange(.22, .075, M.copperDark, new THREE.Vector3(0, 1.3, .4), "z"));
    const wheelGroup = new THREE.Group;
    wheelGroup.position.set(0, 1.34, .72);
    wheelGroup.scale.setScalar(.7);
    wheelGroup.rotation.y = -.11;
    const wheelMat = M.copperDark.clone();
    wheelMat.color.setHex(7295288);
    wheelMat.roughness = .52;
    wheelMat.metalness = .72;
    wheelMat.envMapIntensity = .65;
    const wheel = handwheel(.59, wheelMat, {
        spokes: 7,
        rimTube: .047,
        hubMat: M.brass
    });
    wheelGroup.add(wheel);
    const outerBead = new THREE.Mesh(new THREE.TorusGeometry(.64, .014, 5, 64), M.brass);
    outerBead.scale.setScalar(1);
    wheelGroup.add(outerBead);
    for (let i = 0; i < 7; i++) {
        const a = i / 7 * TAU;
        const bead = sphere(.028, M.brass, Math.cos(a) * .59, Math.sin(a) * .59, 0, 6);
        wheelGroup.add(bead);
    }
    wheelGroup.traverse(o => {
        if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
        }
    });
    root.add(wheelGroup);
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(.76, .76, .24, 24), new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        colorWrite: false
    }));
    hit.rotation.x = Math.PI / 2;
    hit.position.set(0, 1.34, .72);
    hit.userData.isValveHit = true;
    root.add(hit);
    const gauge = makeGauge(T, M, .105);
    gauge.position.set(.48, 1.72, .52);
    gauge.rotation.y = .24;
    root.add(gauge);
    const needlePivot = gauge.userData.needlePivot;
    const plateTex = canvasLabelTexture("RIVERDALE\nPUMP No. 2", {
        width: 512,
        height: 256,
        bg: "#1f2420",
        ink: "rgba(195,180,144,.85)",
        font: "600 46px Georgia, serif",
        lineHeight: 58
    });
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(.28, .14), new THREE.MeshStandardMaterial({
        map: plateTex,
        roughness: .5,
        metalness: .4,
        color: 12630179
    }));
    plate.position.set(0, .66, .44);
    root.add(plate);
    const glint = new THREE.PointLight(16760960, .35, 1.2, 2);
    glint.position.set(.25, 1.5, .9);
    root.add(glint);
    setShadows(root, true, true);
    hit.castShadow = false;
    hit.receiveShadow = false;
    return {
        group: root,
        wheelGroup: wheelGroup,
        wheel: wheel,
        hit: hit,
        gauge: gauge,
        needlePivot: needlePivot,
        axisStart: new THREE.Vector3(-2.88, 1.34, 3.82)
    };
}

export function makeGauge(T, M, radius = .2) {
    const g = new THREE.Group;
    const housing = cylinder(radius * 1.12, radius * 1.1, .11, M.brass, 0, 0, 0, 28);
    housing.rotation.x = Math.PI / 2;
    g.add(housing);
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.08, .018, 6, 32), M.brass);
    bezel.position.z = .06;
    g.add(bezel);
    const face = disc(radius, M.gaugeFace, 0, 0, .064, 32);
    g.add(face);
    const needlePivot = new THREE.Group;
    needlePivot.position.set(0, 0, .079);
    const needle = box(.011, radius * .78, .008, M.needle, 0, radius * .34, 0);
    needlePivot.add(needle);
    needlePivot.add(cylinder(.018, .018, .018, M.brass, 0, 0, 0, 8));
    g.add(needlePivot);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(radius * 1.03, 32), new THREE.MeshPhysicalMaterial({
        color: 12241096,
        roughness: .07,
        metalness: 0,
        transmission: .9,
        transparent: true,
        opacity: .22,
        depthWrite: false
    }));
    glass.position.z = .085;
    g.add(glass);
    g.userData.needlePivot = needlePivot;
    return g;
}

export function buildRightSide(T, M) {
    const root = new THREE.Group;
    root.name = "RightSideDressing";
    const lampGroup = new THREE.Group;
    lampGroup.position.set(HALL.halfWidth - .04, 6.65, -1.9);
    const bracket = new THREE.Group;
    lampGroup.add(bracket);
    const armCurve = new THREE.CatmullRomCurve3([ new THREE.Vector3(0, .78, 0), new THREE.Vector3(-.22, .76, 0), new THREE.Vector3(-.42, .64, 0), new THREE.Vector3(-.53, .45, 0), new THREE.Vector3(-.56, .2, 0) ]);
    const arm = new THREE.Mesh(new THREE.TubeGeometry(armCurve, 30, .043, 6, false), M.lampIron);
    arm.castShadow = true;
    bracket.add(arm);
    bracket.add(box(.12, .4, .16, M.lampIron, .03, .58, 0));
    bracket.add(sphere(.055, M.brass, .03, .83, 0, 8));
    for (const s of [ -1, 1 ]) {
        const scrollPts = [];
        for (let i = 0; i <= 10; i++) {
            const t = i / 10;
            const a = t * Math.PI * 1.5;
            scrollPts.push(new THREE.Vector3(-.2 - Math.sin(a) * .12 * t, .68 + Math.cos(a) * .1 * t, s * .06));
        }
        const scroll = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(scrollPts), 20, .014, 5, false), M.lampIron);
        bracket.add(scroll);
    }
    const chain = chainBetween([ -.56, .21, 0 ], [ -.56, -.25, 0 ], M.ironBlack, 9, .045);
    bracket.add(chain);
    const lantern = new THREE.Group;
    lantern.position.set(-.56, -.88, 0);
    lantern.scale.setScalar(1.15);
    lantern.add(cylinder(.025, .09, .12, M.brass, 0, .45, 0, 4));
    lantern.add(cylinder(.09, .27, .12, M.lampIron, 0, .35, 0, 4));
    lantern.add(cylinder(.03, .27, .18, M.brass, 0, .35, 0, 4));
    lantern.add(cylinder(.21, .24, .055, M.brass, 0, .26, 0, 4));
    lantern.add(cylinder(.17, .22, .07, M.brass, 0, -.25, 0, 4));
    lantern.add(cylinder(.22, .17, .055, M.lampIron, 0, -.285, 0, 4));
    lantern.add(cylinder(.045, .07, .12, M.brass, 0, -.38, 0, 4));
    lantern.add(cylinder(.1, .14, .09, M.brass, 0, -.31, 0, 4));
    for (let i = 0; i < 4; i++) {
        const a = i / 4 * TAU + Math.PI / 4;
        const x = Math.cos(a) * .18, z = Math.sin(a) * .18;
        lantern.add(cylinderBetween([ x, -.23, z ], [ x, .25, z ], .022, M.brass, 5));
    }
    lantern.add(torus(.185, .011, M.brass, 0, .01, 0, 4, 24));
    const midring = lantern.children[lantern.children.length - 1];
    midring.rotation.x = Math.PI / 2;
    lantern.add(sphere(.06, M.brass, 0, .55, 0, 10));
    const core = new THREE.Mesh(new THREE.BoxGeometry(.3, .42, .3), new THREE.MeshStandardMaterial({
        color: 16761720,
        emissive: 16748335,
        emissiveIntensity: 1.65,
        roughness: .4
    }));
    core.position.y = .01;
    lantern.add(core);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.06, 12, 8), new THREE.MeshStandardMaterial({
        color: 16763271,
        emissive: 16752446,
        emissiveIntensity: 3.1,
        roughness: .2
    }));
    bulb.position.set(0, .05, 0);
    lantern.add(bulb);
    bracket.add(lantern);
    const glow = makeGlowSprite(T.glowTex, 1.55, 16758122, .44);
    glow.position.copy(lantern.position);
    glow.position.y -= .02;
    bracket.add(glow);
    lampGroup.add(bracket);
    root.add(lampGroup);
    const lampLight = new THREE.PointLight(16758636, 6, 7, 2);
    const worldLampPos = new THREE.Vector3(lampGroup.position.x - .56, lampGroup.position.y - .62, lampGroup.position.z);
    lampLight.position.copy(worldLampPos);
    lampLight.castShadow = false;
    root.add(lampLight);
    const wallWash = new THREE.SpotLight(16751178, .9, 6.5, .55, .9, 1.5);
    wallWash.position.copy(worldLampPos);
    wallWash.target.position.set(HALL.halfWidth, 2, -1.9);
    root.add(wallWash);
    root.add(wallWash.target);
    const sootMat = new THREE.MeshBasicMaterial({
        color: 591878,
        transparent: true,
        opacity: .3,
        depthWrite: false
    });
    const soot = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.6), sootMat);
    soot.rotation.y = -Math.PI / 2;
    soot.position.set(HALL.halfWidth - .06, 6.05, -1.8);
    root.add(soot);
    const sootAbove = new THREE.Mesh(new THREE.PlaneGeometry(.75, 2.2), sootMat.clone());
    sootAbove.material.opacity = .22;
    sootAbove.rotation.y = -Math.PI / 2;
    sootAbove.position.set(HALL.halfWidth - .06, 7.9, -1.7);
    root.add(sootAbove);
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(3, 3.8), new THREE.MeshBasicMaterial({
        map: T.glowTex,
        color: 16751174,
        transparent: true,
        opacity: .09,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    }));
    halo.rotation.y = -Math.PI / 2;
    halo.position.set(HALL.halfWidth - .065, 5.95, -1.9);
    halo.renderOrder = 2;
    root.add(halo);
    const downlight = new THREE.SpotLight(16753490, 7.5, 9, .85, 1, 1.8);
    downlight.position.copy(worldLampPos);
    downlight.target.position.set(HALL.halfWidth - 1.35, .08, .55);
    root.add(downlight);
    root.add(downlight.target);
    const toolRng = rng(112);
    const leanCenter = new THREE.Vector3(HALL.halfWidth - 1.35, 0, -.85);
    const tools = [];
    function handle(fromBottom, toTop, radius, material) {
        return cylinderBetween(fromBottom, toTop, radius, material, 7);
    }
    {
        const g = new THREE.Group;
        const bottom = new THREE.Vector3(leanCenter.x - .26, .03, leanCenter.z + .32);
        const top = new THREE.Vector3(leanCenter.x - .6, 2.55, leanCenter.z - .25);
        g.add(handle(bottom, top, .034, M.wood));
        const head = new THREE.Group;
        head.position.copy(bottom).lerp(top, .035);
        head.position.y += .05;
        g.add(head);
        const block = box(.3, .09, .16, M.woodDark, 0, .03, 0);
        block.rotation.y = .08;
        head.add(block);
        for (let i = 0; i < 24; i++) {
            const bx = (toolRng() - .5) * .28;
            const bz = (toolRng() - .5) * .12;
            const bristle = cylinderBetween([ bx, -.02, bz ], [ bx + (toolRng() - .5) * .09, -.25 - toolRng() * .08, bz + (toolRng() - .5) * .08 ], .0065, M.bristle, 3);
            head.add(bristle);
        }
        g.add(head);
        g.add(cylinder(.044, .038, .12, M.iron, bottom.x * .95 + top.x * .05, .34, bottom.z * .95 + top.z * .05, 8));
        root.add(g);
        tools.push(g);
    }
    {
        const g = new THREE.Group;
        const bottom = new THREE.Vector3(leanCenter.x - .05, .02, leanCenter.z + .37);
        const top = new THREE.Vector3(leanCenter.x - .36, 2.92, leanCenter.z - .34);
        g.add(handle(bottom, top, .03, M.wood));
        const headY = .12;
        for (let i = 0; i < 20; i++) {
            const a = i / 20 * TAU;
            const rr = .12 + toolRng() * .12;
            g.add(cylinderBetween([ bottom.x + Math.cos(a) * .03, headY, bottom.z + Math.sin(a) * .03 ], [ bottom.x + Math.cos(a) * rr, .015, bottom.z + Math.sin(a) * rr ], .009, i % 3 ? M.bristle : M.rope, 3));
        }
        root.add(g);
        tools.push(g);
    }
    {
        const g = new THREE.Group;
        const bottom = new THREE.Vector3(leanCenter.x + .19, .015, leanCenter.z + .38);
        const top = new THREE.Vector3(leanCenter.x - .17, 3.15, leanCenter.z - .31);
        g.add(handle(bottom, top, .029, M.wood));
        g.add(box(.24, .4, .025, M.steel, bottom.x + .015, .23, bottom.z + .04));
        const blade = new THREE.Mesh(new THREE.SphereGeometry(.19, 12, 8), M.steel);
        blade.scale.set(1, 1.15, .1);
        blade.position.set(bottom.x, .23, bottom.z + .05);
        blade.rotation.x = -.46;
        g.add(blade);
        root.add(g);
        tools.push(g);
    }
    {
        const g = new THREE.Group;
        const bottom = new THREE.Vector3(leanCenter.x + .36, .02, leanCenter.z + .28);
        const top = new THREE.Vector3(leanCenter.x + .03, 2.75, leanCenter.z - .38);
        g.add(handle(bottom, top, .024, M.steel));
        g.add(box(.42, .035, .06, M.ironBlack, bottom.x + .1, .12, bottom.z + .08));
        g.add(box(.42, .09, .025, M.wax, bottom.x + .1, .065, bottom.z + .13));
        root.add(g);
        tools.push(g);
    }
    {
        const g = new THREE.Group;
        const start = new THREE.Vector3(leanCenter.x + .1, .07, leanCenter.z + .8);
        const end = new THREE.Vector3(leanCenter.x - .4, 3.4, leanCenter.z + .1);
        g.add(cylinderBetween(start, end, .014, M.iron, 6));
        const hook = new THREE.Mesh(new THREE.TorusGeometry(.075, .014, 5, 16, Math.PI * 1.5), M.iron);
        hook.position.copy(end);
        hook.rotation.z = .5;
        g.add(hook);
        root.add(g);
        tools.push(g);
    }
    const bucketGroup = new THREE.Group;
    bucketGroup.position.set(HALL.halfWidth - 1.15, .02, .45);
    bucketGroup.scale.setScalar(1.25);
    const profile = [ new THREE.Vector2(.16, 0), new THREE.Vector2(.2, .02), new THREE.Vector2(.22, .08), new THREE.Vector2(.235, .38), new THREE.Vector2(.24, .46), new THREE.Vector2(.218, .46) ];
    const bucket = new THREE.Mesh(new THREE.LatheGeometry(profile, 28), M.steel);
    bucket.castShadow = true;
    bucket.receiveShadow = true;
    bucketGroup.add(bucket);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.233, .014, 5, 28), M.steel);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = .46;
    bucketGroup.add(rim);
    const handlePts = [];
    for (let i = 0; i <= 16; i++) {
        const a = Math.PI * (i / 16);
        handlePts.push(new THREE.Vector3(Math.cos(a) * .235, .49 + Math.sin(a) * .27, 0));
    }
    bucketGroup.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(handlePts), 30, .01, 5, false), M.ironBlack));
    const water = new THREE.Mesh(new THREE.CircleGeometry(.21, 24), new THREE.MeshStandardMaterial({
        color: 462865,
        roughness: .08,
        metalness: .22,
        envMapIntensity: 1.5
    }));
    water.rotation.x = -Math.PI / 2;
    water.position.y = .31;
    bucketGroup.add(water);
    root.add(bucketGroup);
    const chest = new THREE.Group;
    chest.position.set(HALL.halfWidth - 1.6, 0, -.05);
    chest.rotation.y = -.08;
    const chestBody = new THREE.Mesh(new RoundedBoxGeometry(1.05, .52, .62, 2, .025), M.woodDark);
    chestBody.position.y = .33;
    chestBody.castShadow = chestBody.receiveShadow = true;
    chest.add(chestBody);
    const lid = new THREE.Mesh(new RoundedBoxGeometry(1.09, .12, .66, 2, .025), M.woodDark);
    lid.position.set(0, .64, 0);
    lid.castShadow = true;
    chest.add(lid);
    for (const x of [ -.42, .42 ]) {
        chest.add(box(.055, .62, .68, M.ironBlack, x, .35, 0));
        chest.add(box(.08, .07, .7, M.ironBlack, x, .4, 0));
    }
    for (const x of [ -.28, .28 ]) {
        const hinge = box(.12, .025, .16, M.iron, x, .7, -.3);
        chest.add(hinge);
    }
    chest.add(box(.16, .12, .035, M.brass, 0, .38, .325));
    const labelTex = canvasLabelTexture("RIVERDALE\nW.W.  ·  04", {
        width: 512,
        height: 256,
        bg: "#2a241b",
        ink: "rgba(197,177,136,.72)",
        font: '600 46px "Courier New", monospace',
        lineHeight: 58,
        border: true
    });
    const label = new THREE.Mesh(new THREE.PlaneGeometry(.36, .18), new THREE.MeshStandardMaterial({
        map: labelTex,
        roughness: .8,
        metalness: .05,
        color: 11838861
    }));
    label.position.set(0, .35, .318);
    chest.add(label);
    root.add(chest);
    const jug = new THREE.Group;
    jug.position.set(HALL.halfWidth - 1.85, 0, -1.55);
    const jugBody = new THREE.Mesh(new THREE.CylinderGeometry(.15, .19, .44, 16), M.steel);
    jugBody.position.y = .22;
    jug.add(jugBody);
    jug.add(cylinder(.08, .11, .12, M.steel, 0, .48, 0, 12));
    jug.add(torus(.1, .014, M.iron, 0, .51, 0, 5, 16));
    root.add(jug);
    const dripMat = new THREE.MeshBasicMaterial({
        color: 659473,
        transparent: true,
        opacity: .34,
        depthWrite: false
    });
    for (let i = 0; i < 4; i++) {
        const stain = new THREE.Mesh(new THREE.PlaneGeometry(.35 + toolRng() * .8, 1.4 + toolRng() * 2.3), dripMat);
        stain.rotation.y = -Math.PI / 2;
        stain.position.set(HALL.halfWidth - .07, 1.3 + toolRng() * 1.2, -3.6 + toolRng() * 3.7);
        root.add(stain);
    }
    setShadows(root, true, true);
    for (const t of tools) setShadows(t, true, true);
    return {
        group: root,
        lampLight: lampLight,
        wallWash: wallWash,
        lampGroup: lampGroup,
        lantern: lantern,
        halo: halo,
        downlight: downlight,
        bulb: bulb,
        glow: glow,
        worldLampPos: worldLampPos,
        tools: tools,
        bucketGroup: bucketGroup,
        chest: chest
    };
}

export function buildWallDressing(T, M) {
    const group = new THREE.Group;
    const pipe = new THREE.Group;
    pipe.position.set(-6.25, 0, 3.25);
    pipe.add(flange(.19, .1, M.ironBlack, new THREE.Vector3(0, .08, 0), "y"));
    pipe.add(pipeThrough([ [ 0, .1, 0 ], [ 0, 1.2, 0 ], [ 0, 2.4, 0 ], [ 0, 3.4, 0 ], [ .15, 3.7, .12 ], [ .8, 3.7, .12 ] ], .075, M.copperDark, 40, 10));
    pipe.add(flange(.15, .07, M.brass, new THREE.Vector3(0, 1.55, 0), "y"));
    pipe.add(flange(.15, .07, M.brass, new THREE.Vector3(0, 2.65, 0), "y"));
    for (const y of [ 1.55, 2.65 ]) {
        const stub = cylinderBetween([ 0, y, 0 ], [ .28, y, .05 ], .055, M.brass, 8);
        pipe.add(stub);
        const w = handwheel(.2, M.brass, {
            spokes: 5,
            rimTube: .022
        });
        w.position.set(.36, y, .05);
        w.rotation.y = Math.PI / 2;
        pipe.add(w);
    }
    const smallGauge = makeGauge(T, M, .11);
    smallGauge.position.set(.22, 3.08, .1);
    smallGauge.rotation.y = .15;
    pipe.add(smallGauge);
    group.add(pipe);
    const clothMat = new THREE.MeshStandardMaterial({
        color: 2828836,
        roughness: .98,
        metalness: 0
    });
    const cloth = new THREE.Group;
    cloth.position.set(-HALL.halfWidth + .26, 0, 5.1);
    const apron = new THREE.Mesh(new THREE.PlaneGeometry(.72, 1.25), clothMat);
    apron.rotation.y = -Math.PI / 2;
    apron.position.y = 1.25;
    cloth.add(apron);
    for (const z of [ -.29, .29 ]) {
        cloth.add(cylinderBetween([ 0, 2.3, z ], [ 0, 1.8, z * .84 ], .006, M.iron, 4));
    }
    group.add(cloth);
    return group;
}
