import * as THREE from "three";

import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

import { box, cylinder, mesh, sphere, torus, pipeThrough, cylinderBetween, flange, handwheel, plateGirder, setShadows, rng, TAU, canvasLabelTexture, makeGlowSprite } from "./lib.js";

import { makeGauge as makePressureGauge } from "./props.js";

import { HALL } from "./world.js";

export function buildMachinery(T, M) {
    const root = new THREE.Group;
    root.name = "PumpingMachinery";
    const animated = {
        flywheel: null,
        flywheel2: null,
        crosshead: null,
        pumpGaugeNeedle: null,
        consoleNeedles: [],
        pumpBody: null,
        piston: null,
        connectingRod: null,
        lever: null,
        belts: []
    };
    const railGroup = new THREE.Group;
    const railZ = -3.35;
    const railStart = -5.35, railEnd = 5.55;
    const topRailY = .92;
    const topRail = cylinderBetween([ railStart, topRailY, railZ ], [ railEnd, topRailY, railZ ], .031, M.ironBlack, 8);
    railGroup.add(topRail);
    railGroup.add(cylinderBetween([ railStart, .48, railZ ], [ railEnd, .48, railZ ], .019, M.ironBlack, 6));
    const postCount = 14;
    for (let i = 0; i <= postCount; i++) {
        const x = railStart + i / postCount * (railEnd - railStart);
        railGroup.add(cylinderBetween([ x, .02, railZ ], [ x, topRailY, railZ ], .026, M.ironBlack, 6));
        railGroup.add(sphere(.045, M.iron, x, topRailY + .045, railZ, 8));
        if (i % 3 === 0) {
            railGroup.add(cylinder(.09, .06, .1, M.iron, x, .5, railZ, 8));
        }
    }
    for (const x of [ railStart, railEnd ]) {
        railGroup.add(cylinder(.07, .11, 1.12, M.ironBlack, x, .56, railZ, 8));
        railGroup.add(sphere(.08, M.brass, x, 1.16, railZ, 10));
    }
    root.add(railGroup);
    const steps = new THREE.Group;
    for (let i = 0; i < 3; i++) {
        const st = box(1.25 - i * .08, .11, .36, M.stoneDark, 0, .055 + i * .11, -3.2 - i * .3);
        st.receiveShadow = true;
        steps.add(st);
    }
    steps.position.set(-4.72, 0, 0);
    root.add(steps);
    root.add(box(9.6, .1, 12.6, M.stoneDark, .35, .05, -9.7));
    root.add(box(4.8, .16, 2.9, M.ironBlack, 2.45, .13, -9.1));
    root.add(box(3, .11, 2.2, M.stoneDark, -1.7, .06, -10.6));
    root.add(pipeThrough([ [ -3.95, .2, -.55 ], [ -3.9, .2, -3 ], [ -3.6, .22, -4.7 ], [ -2.8, .24, -5.6 ], [ -1.9, .26, -5.8 ] ], .16, M.ironBlack, 50, 10));
    for (const p of [ [ -3.9, .23, -3.2 ], [ -2.8, .25, -5.6 ] ]) {
        const f = flange(.235, .075, M.copperDark, new THREE.Vector3(...p), "y");
        root.add(f);
    }
    const engine = new THREE.Group;
    engine.position.set(3.1, 0, -9);
    root.add(engine);
    engine.add(box(3.6, .3, 2.6, M.greenBlack, 0, .3, 0));
    engine.add(box(3.05, .18, 2.15, M.ironBlack, 0, .48, 0));
    for (let i = 0; i < 7; i++) {
        engine.add(box(.02, .1, 2.16, M.iron, -1.4 + i * .46, .47, 0));
    }
    const receiver = new THREE.Group;
    receiver.position.set(-.2, 1.12, -.34);
    const recBody = cylinder(.63, .63, 2.4, M.greenIron, 0, 0, 0, 28);
    recBody.rotation.z = Math.PI / 2;
    receiver.add(recBody);
    for (const s of [ -1, 1 ]) {
        const cap = sphere(.63, M.greenIron, s * 1.2, 0, 0, 24);
        cap.scale.set(.48, 1, 1);
        receiver.add(cap);
        const f = flange(.76, .11, M.brass, new THREE.Vector3(s * 1.03, 0, 0), "x");
        receiver.add(f);
    }
    for (const x of [ -.65, .24, .67 ]) {
        const band = new THREE.Mesh(new THREE.TorusGeometry(.635, .026, 7, 32), M.brass);
        band.rotation.y = Math.PI / 2;
        band.position.x = x;
        receiver.add(band);
    }
    const rivetGeo = new THREE.SphereGeometry(.028, 6, 4);
    const rivets = new THREE.InstancedMesh(rivetGeo, M.brass, 32);
    {
        const m4 = new THREE.Matrix4;
        let ii = 0;
        for (let i = 0; i < 16; i++) {
            const a = i / 16 * TAU;
            for (const xx of [ -1.02, .96 ]) {
                m4.makeTranslation(xx, Math.sin(a) * .6, Math.cos(a) * .6);
                rivets.setMatrixAt(ii++, m4);
            }
        }
        receiver.add(rivets);
    }
    engine.add(receiver);
    engine.add(cylinder(.82, .94, .22, M.ironBlack, .55, .58, .34, 18));
    engine.add(cylinder(.74, .79, 1.38, M.greenIron, .55, 1.25, .34, 22));
    engine.add(cylinder(.88, .8, .2, M.brass, .55, 1.93, .34, 22));
    const dome = new THREE.Mesh(new THREE.SphereGeometry(.62, 24, 12, 0, TAU, 0, Math.PI / 2), M.greenIron);
    dome.position.set(.55, 2.02, .34);
    engine.add(dome);
    engine.add(cylinder(.24, .33, .52, M.brass, .55, 2.57, .34, 16));
    engine.add(torus(.28, .045, M.brass, .55, 2.7, .34, 8, 20));
    engine.add(cylinder(.14, .18, .18, M.brass, .55, 2.92, .34, 12));
    for (let i = 0; i < 7; i++) {
        const a = i / 7 * TAU;
        const rib = cylinderBetween([ .55 + Math.cos(a) * .55, .62, .34 + Math.sin(a) * .55 ], [ .55 + Math.cos(a) * .45, 1.88, .34 + Math.sin(a) * .45 ], .03, M.ironBlack, 5);
        engine.add(rib);
    }
    const steam = new THREE.Group;
    steam.position.set(1.85, 0, .42);
    steam.add(cylinder(.68, .72, .22, M.ironBlack, 0, .58, 0, 18));
    steam.add(cylinder(.5, .55, 1.75, M.greenBlack, 0, 1.52, 0, 20));
    steam.add(cylinder(.62, .56, .14, M.brass, 0, 2.39, 0, 20));
    steam.add(sphere(.48, M.greenBlack, 0, 2.52, 0, 18));
    steam.add(cylinder(.13, .2, .24, M.brass, 0, 2.91, 0, 12));
    for (const y of [ 1.2, 1.86 ]) {
        const band = torus(.55, .027, M.brass, 0, y, 0, 7, 24);
        band.rotation.x = Math.PI / 2;
        steam.add(band);
    }
    const sight = cylinder(.06, .06, .36, new THREE.MeshPhysicalMaterial({
        color: 7768955,
        emissive: 3228975,
        emissiveIntensity: .6,
        metalness: .2,
        roughness: .15,
        transmission: .4
    }), 0, 1.75, .56, 10);
    steam.add(sight);
    for (const y of [ 1.54, 1.96 ]) {
        steam.add(cylinder(.12, .09, .08, M.brass, 0, y, .56, 10));
    }
    engine.add(steam);
    const shaftZ = .72;
    const shaft = cylinder(.12, .12, 1.8, M.steel, .1, 1.08, shaftZ, 12);
    shaft.rotation.z = Math.PI / 2;
    engine.add(shaft);
    const wheelAssembly = makeFlywheel(1.18, .17, M.greenBlack, M.brass);
    wheelAssembly.position.set(-1.22, 1.08, .72);
    wheelAssembly.rotation.y = .03;
    engine.add(wheelAssembly);
    animated.flywheel = wheelAssembly;
    const wheel2 = makeFlywheel(.34, .08, M.greenBlack, M.brass);
    wheel2.position.set(-1.9, 1.08, .72);
    wheel2.rotation.y = .03;
    engine.add(wheel2);
    animated.flywheel2 = wheel2;
    const pistonGroup = new THREE.Group;
    pistonGroup.position.set(.72, 1.08, .72);
    const rod = cylinder(.055, .055, 1.18, M.steel, 0, 0, 0, 10);
    rod.rotation.z = Math.PI / 2;
    rod.position.x = .52;
    pistonGroup.add(rod);
    const cross = box(.26, .25, .23, M.iron, 0, 0, 0);
    cross.rotation.z = 0;
    pistonGroup.add(cross);
    const pin = cylinder(.035, .035, .32, M.brass, -.05, 0, .12, 8);
    pin.rotation.z = Math.PI / 2;
    pistonGroup.add(pin);
    engine.add(pistonGroup);
    animated.crosshead = pistonGroup;
    const connRod = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1, 8), M.steel);
    connRod.castShadow = true;
    connRod.userData.dynamic = true;
    engine.add(connRod);
    animated.connectingRod = connRod;
    for (const z of [ .52, .92 ]) {
        engine.add(cylinderBetween([ 1.15, .9, z ], [ 1.15, 1.32, z ], .025, M.steel, 6));
    }
    engine.add(cylinderBetween([ 1.1, .86, .72 ], [ 1.1, 1.35, .72 ], .021, M.steel, 6));
    const gauge = makePressureGauge(T, M, .34);
    gauge.position.set(.55, 1.15, 1.04);
    gauge.rotation.y = .05;
    engine.add(gauge);
    animated.pumpGaugeNeedle = gauge.userData.needlePivot;
    engine.add(pipeThrough([ [ .55, .83, .65 ], [ .55, .83, .96 ], [ .55, .96, 1 ] ], .018, M.brass, 12, 5));
    const nameTex = canvasLabelTexture("RIVERDALE\nSTEAM PUMP  ·  1897", {
        width: 768,
        height: 256,
        bg: "#1a201c",
        ink: "rgba(205,188,149,.9)",
        font: "600 46px Georgia, serif",
        lineHeight: 57,
        border: true
    });
    const nameplate = new THREE.Mesh(new THREE.PlaneGeometry(.82, .28), new THREE.MeshStandardMaterial({
        map: nameTex,
        roughness: .45,
        metalness: .45,
        color: 12432544
    }));
    nameplate.position.set(1.85, .96, .79);
    engine.add(nameplate);
    const riser = pipeThrough([ [ .55, 2.94, .34 ], [ .55, 3.26, .28 ], [ .52, 4.24, .12 ], [ .48, 5.05, -.18 ], [ .22, 5.58, -.86 ], [ -.2, 5.82, -2.2 ], [ -.3, 5.84, -4 ] ], .145, M.greenBlack, 64, 12);
    engine.add(riser);
    for (const [y, z] of [ [ 3.35, .28 ], [ 4.5, .05 ], [ 5.55, -.78 ], [ 5.83, -2.2 ] ]) {
        const band = new THREE.Mesh(new THREE.TorusGeometry(.18, .03, 7, 20), M.brass);
        band.position.set(.55, y, z);
        band.rotation.x = Math.PI / 2;
        engine.add(band);
    }
    const riserValve = handwheel(.27, M.brass, {
        spokes: 5,
        rimTube: .023
    });
    riserValve.position.set(.9, 4.45, .04);
    riserValve.rotation.y = Math.PI / 2;
    engine.add(riserValve);
    engine.add(pipeThrough([ [ 1.85, 2.92, .42 ], [ 1.86, 3.65, .42 ], [ 2.14, 3.95, .18 ], [ 2.85, 3.95, -.4 ], [ 3.1, 3.7, -1.2 ], [ 3.12, 2.5, -1.2 ] ], .1, M.ironBlack, 45, 9));
    engine.add(pipeThrough([ [ -.2, .52, .55 ], [ .18, .44, .9 ], [ .72, .38, 1.15 ], [ .84, .38, 1.35 ] ], .075, M.copperDark, 28, 8));
    engine.add(handwheel(.2, M.brass, {
        spokes: 5,
        rimTube: .02
    }));
    engine.children[engine.children.length - 1].position.set(.9, .6, 1.12);
    engine.children[engine.children.length - 1].rotation.x = Math.PI / 2;
    const secondary = new THREE.Group;
    secondary.position.set(-1.55, 0, -7.35);
    secondary.add(box(1.65, .18, 1.45, M.ironBlack, 0, .24, 0));
    secondary.add(box(1.35, .25, 1.16, M.greenBlack, 0, .43, 0));
    const secCyl = cylinder(.38, .42, 1.15, M.greenIron, 0, 1.02, 0, 20);
    secCyl.rotation.z = Math.PI / 2;
    secondary.add(secCyl);
    secondary.add(sphere(.38, M.greenIron, .58, 1.02, 0, 16));
    secondary.add(sphere(.38, M.greenIron, -.58, 1.02, 0, 16));
    for (const x of [ -.42, 0, .42 ]) {
        const b = new THREE.Mesh(new THREE.TorusGeometry(.39, .02, 6, 20), M.brass);
        b.rotation.y = Math.PI / 2;
        b.position.set(x, 1.02, 0);
        secondary.add(b);
    }
    secondary.add(cylinder(.08, .12, .7, M.brass, 0, 1.65, 0, 10));
    const secGauge = makePressureGauge(T, M, .16);
    secGauge.position.set(0, 1.82, .02);
    secGauge.rotation.y = -.3;
    secondary.add(secGauge);
    animated.secondaryNeedle = secGauge.userData.needlePivot;
    const sw = handwheel(.31, M.iron, {
        spokes: 6,
        rimTube: .02,
        hubMat: M.brass
    });
    sw.position.set(-.9, 1.35, 0);
    sw.rotation.y = Math.PI / 2;
    secondary.add(sw);
    secondary.add(pipeThrough([ [ -.6, .42, .2 ], [ -1.2, .3, .9 ], [ -1.6, .28, 2.2 ], [ -1.75, .23, 3 ] ], .06, M.copperDark, 30, 8));
    root.add(secondary);
    const uGroup = new THREE.Group;
    uGroup.position.set(-2.15, 0, -12.55);
    const uPipe = pipeThrough([ [ 0, .1, 0 ], [ 0, 1.2, 0 ], [ 0, 3.15, 0 ], [ .06, 4.55, 0 ], [ .42, 5.16, 0 ], [ .9, 5.34, 0 ], [ 1.32, 5.02, 0 ], [ 1.45, 4.1, 0 ], [ 1.45, 2.35, 0 ], [ 1.45, 1.16, 0 ], [ 1.6, .5, 0 ] ], .16, M.ironBlack, 70, 12);
    uGroup.add(uPipe);
    for (const [x, y] of [ [ 0, .22 ], [ 0, 1.2 ], [ 0, 3.2 ], [ 1.45, 2.35 ], [ 1.45, .5 ] ]) {
        const f = flange(.23, .08, M.copperDark, new THREE.Vector3(x, y, 0), "y");
        uGroup.add(f);
    }
    const tap = pipeThrough([ [ 0, 2.85, 0 ], [ .32, 2.7, 0 ], [ .38, 2.4, 0 ] ], .052, M.brass, 18, 7);
    uGroup.add(tap);
    const tapWheel = handwheel(.2, M.brass, {
        spokes: 5,
        rimTube: .017
    });
    tapWheel.position.set(.38, 2.32, 0);
    tapWheel.rotation.y = .2;
    uGroup.add(tapWheel);
    root.add(uGroup);
    root.add(pipeThrough([ [ -5.55, .2, -13.5 ], [ -5.55, 3.3, -13.5 ], [ -5.52, 5.8, -13.5 ], [ -5.1, 6.5, -13.6 ], [ -4.7, 6.7, -14.4 ], [ -4.65, 7.8, -14.6 ] ], .115, M.greenBlack, 48, 9));
    root.add(pipeThrough([ [ -4.7, .35, -5.6 ], [ -3.6, .33, -5.5 ], [ -2.2, .33, -5.5 ], [ -1, .35, -5.55 ], [ .2, .35, -5.5 ], [ .3, .55, -5.5 ] ], .095, M.ironBlack, 44, 8));
    for (let i = 0; i < 1; i++) {
        const hw = handwheel(.24, M.brass, {
            spokes: 6,
            rimTube: .018
        });
        hw.position.set(-2.2, .65, -5.5);
        hw.rotation.y = Math.PI / 2;
        root.add(hw);
    }
    const consoleGroup = new THREE.Group;
    consoleGroup.position.set(-4.6, 0, -10.75);
    consoleGroup.rotation.y = .16;
    consoleGroup.add(box(2.15, 1.3, .92, M.ironBlack, 0, .65, 0));
    consoleGroup.add(box(2.32, .12, 1.06, M.iron, 0, 1.31, .02));
    const panel = new THREE.Group;
    panel.position.set(0, 1.62, .28);
    panel.rotation.x = -.32;
    panel.add(box(2.2, .95, .1, M.ironBlack, 0, 0, 0));
    panel.add(box(1.98, .075, .11, M.brass, 0, .48, .02));
    for (let i = 0; i < 3; i++) {
        const gg = makePressureGauge(T, M, .165);
        gg.position.set(-.66 + i * .66, .1, .1);
        panel.add(gg);
        animated.consoleNeedles.push(gg.userData.needlePivot);
    }
    for (let i = 0; i < 5; i++) {
        panel.add(box(.045, .2, .04, M.steel, -.8 + i * .4, -.3, .1));
        panel.add(sphere(.035, i === 2 ? M.copper : M.brass, -.8 + i * .4, -.2, .13, 8));
    }
    consoleGroup.add(panel);
    consoleGroup.add(box(2, .2, .92, M.stoneDark, 0, 1.4, 0));
    consoleGroup.add(box(2.4, 2.65, .1, M.woodDark, 0, 1.35, -.52));
    consoleGroup.add(pipeThrough([ [ .9, 1.4, -.42 ], [ 1.15, 1.4, -.4 ], [ 1.15, 3.5, -.5 ], [ 1.8, 3.7, -.8 ] ], .028, M.ironBlack, 22, 6));
    root.add(consoleGroup);
    for (let i = 0; i < 3; i++) {
        const st = box(1.8 - i * .18, .13, .44, M.stoneDark, -5.65, .065 + i * .13, -8.6 - i * .35);
        root.add(st);
    }
    root.add(box(.6, 1, .08, M.ironBlack, -6.52, .5, -8.8));
    root.add(cylinderBetween([ -6.52, 1, -8.8 ], [ -6.52, 1, -9.3 ], .028, M.ironBlack, 6));
    const aux = new THREE.Group;
    aux.position.set(-3.2, 0, -7.9);
    aux.add(box(.85, .24, .7, M.ironBlack, 0, .17, 0));
    aux.add(cylinder(.21, .26, .85, M.greenBlack, 0, .72, 0, 14));
    aux.add(cylinder(.27, .22, .16, M.brass, 0, 1.2, 0, 14));
    const lever = new THREE.Group;
    lever.position.set(0, 1.25, 0);
    lever.add(cylinderBetween([ 0, 0, 0 ], [ .06, .9, -.2 ], .035, M.steel, 6));
    lever.add(sphere(.08, M.brass, .06, .9, -.2, 10));
    aux.add(lever);
    animated.lever = lever;
    root.add(aux);
    const can = new THREE.Group;
    can.position.set(4.35, .02, -4.5);
    can.add(cylinder(.13, .17, .44, M.steel, 0, .22, 0, 14));
    can.add(cylinder(.04, .06, .12, M.brass, 0, .49, 0, 8));
    root.add(can);
    for (const x of [ -5.05, 5.1 ]) {
        root.add(pipeThrough([ [ x, .2, -17.5 ], [ x, 1.2, -17.5 ], [ x + .1, 3, -17.5 ], [ x + .25, 4.4, -17.7 ], [ x + .4, 5.1, -18.2 ] ], .08, M.ironBlack, 28, 8));
    }
    const indicatorMat = new THREE.MeshStandardMaterial({
        color: 16763243,
        emissive: 16748338,
        emissiveIntensity: 3
    });
    const indicator = sphere(.035, indicatorMat, -4, 1.55, -9.85, 8);
    root.add(indicator);
    const indLight = new THREE.PointLight(16747576, .6, 2.5, 2);
    indLight.position.set(-4, 1.6, -9.8);
    root.add(indLight);
    const casting = new THREE.Group;
    casting.position.set(-4.35, .02, -2.9);
    casting.rotation.y = .5;
    const cast = new THREE.Mesh(new THREE.TorusGeometry(.34, .1, 8, 16, Math.PI), M.ironBlack);
    cast.rotation.x = Math.PI / 2;
    cast.position.y = .1;
    casting.add(cast);
    root.add(casting);
    const steamGlow = makeGlowSprite(T.glowTex, 2.6, 10466488, .1);
    steamGlow.position.set(2.2, 4.1, -1);
    root.add(steamGlow);
    setShadows(root, true, true);
    root.traverse(o => {
        if (o.isMesh && (o.material === M.glass || o.material === M.lampGlass)) {
            o.castShadow = false;
        }
    });
    for (const n of animated.consoleNeedles) n.rotation.z = -1.9;
    animated.pumpGaugeNeedle.rotation.z = -2.2;
    if (animated.secondaryNeedle) animated.secondaryNeedle.rotation.z = -2.1;
    animated.engine = engine;
    animated.steam = steam;
    animated.secondary = secondary;
    animated.root = root;
    return {
        group: root,
        animated: animated,
        railGroup: railGroup,
        engineGroup: engine,
        gauge: gauge,
        consoleGroup: consoleGroup,
        update(dt, pressure, time) {
            const target = pressure;
            animated._pressure = THREE.MathUtils.damp(animated._pressure ?? 0, target, 1.4, dt);
            const p = animated._pressure;
            const speed = .22 + p * 5.2;
            animated._angle = (animated._angle || 0) + dt * speed;
            const a = animated._angle;
            if (animated.flywheel) animated.flywheel.rotation.z = a;
            if (animated.flywheel2) animated.flywheel2.rotation.z = -a * 1.7;
            if (animated.crosshead) animated.crosshead.position.x = .72 + Math.sin(a * 2) * (.03 + p * .13);
            if (animated.piston) animated.piston.position.x = Math.sin(a * 2) * .1 * p;
            if (animated.lever) animated.lever.rotation.z = Math.sin(a * .5) * .05 * p;
            if (animated.connectingRod) {
                const crossX = .72 + Math.sin(a * 2) * (.03 + p * .13);
                const crankCenterX = -1.22, crankCenterY = 1.08;
                const crankR = .72;
                const sx = crankCenterX + Math.cos(a + Math.PI) * crankR;
                const sy = crankCenterY + Math.sin(a + Math.PI) * crankR;
                const start = new THREE.Vector3(sx, sy, .72);
                const end = new THREE.Vector3(crossX, 1.08, .72);
                const dir = (new THREE.Vector3).subVectors(end, start);
                const len = dir.length();
                animated.connectingRod.position.copy(start).addScaledVector(dir, .5);
                animated.connectingRod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
                animated.connectingRod.scale.set(1, len, 1);
            }
            const gaugeTarget = -2.15 + p * 2.5;
            if (animated.pumpGaugeNeedle) animated.pumpGaugeNeedle.rotation.z = THREE.MathUtils.damp(animated.pumpGaugeNeedle.rotation.z, gaugeTarget, 2, dt);
            for (let i = 0; i < animated.consoleNeedles.length; i++) {
                const n = animated.consoleNeedles[i];
                const tgt = -1.9 + p * (1.9 + i * .34) + Math.sin(time * 1.3 + i) * .035 * p;
                n.rotation.z = THREE.MathUtils.damp(n.rotation.z, tgt, 2.2, dt);
            }
            if (animated.secondaryNeedle) {
                animated.secondaryNeedle.rotation.z = THREE.MathUtils.damp(animated.secondaryNeedle.rotation.z, -2.1 + p * 2.2, 2, dt);
            }
        }
    };
}

function makeFlywheel(radius, thickness, ironMat, hubMat) {
    const g = new THREE.Group;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, thickness * .62, 10, 48), ironMat);
    g.add(rim);
    const inner = new THREE.Mesh(new THREE.TorusGeometry(radius * .85, thickness * .16, 6, 40), ironMat);
    g.add(inner);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * .14, radius * .17, thickness * 1.8, 16), hubMat);
    hub.rotation.x = Math.PI / 2;
    g.add(hub);
    const spokes = 8;
    for (let i = 0; i < spokes; i++) {
        const a = i / spokes * TAU;
        const start = new THREE.Vector3(Math.cos(a) * radius * .15, Math.sin(a) * radius * .15, 0);
        const end = new THREE.Vector3(Math.cos(a) * radius * .87, Math.sin(a) * radius * .87, 0);
        const spoke = cylinderBetween(start, end, radius * .035, ironMat, 6);
        g.add(spoke);
    }
    const crankR = .72;
    const crank = box(radius * .18, radius * .2, thickness * 1.1, ironMat, -crankR, 0, 0);
    g.add(crank);
    const crankPin = new THREE.Mesh(new THREE.CylinderGeometry(radius * .035, radius * .035, thickness * 1.6, 8), M_brass_placeholder);
    g.add(crankPin);
    return g;
}

const M_brass_placeholder = new THREE.MeshStandardMaterial({
    color: 11570774,
    roughness: .3,
    metalness: .9
});
