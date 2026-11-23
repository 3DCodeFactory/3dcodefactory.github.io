import * as THREE from "three";

import { ROOM, clamp, lerp, smoothstep } from "./helpers.js";

import { buildArchitecture } from "./architecture.js";

import { createSofa, createCoffeeTable, createSideboard, createBookcase, createArmchair, createPouf, createSideTable, createFloorLamp, createForegroundLibraryTable, createStackOfBooksOnFloor, createRugsideCushion, createPianoStoolSeat } from "./furniture.js";

import { createFiddleLeaf, createMonstera, createParlorPalm, createFern, createPothos, createHangingPothos } from "./plants.js";

export const DEFAULT_HOUR = 16.8;

export const TIME_MIN = 6;

export const TIME_MAX = 21;

const LIGHT_KEYS = [ {
    h: 6,
    sunStrength: .18,
    sunColor: 16757370,
    hemiSky: 10200756,
    hemiGround: 5191982,
    hemiIntensity: .42,
    ambient: .18,
    areaIntensity: 2.2,
    areaColor: 16769732,
    glassEmissive: .52,
    exteriorColor: 14201226,
    lampIntensity: 9
}, {
    h: 7.5,
    sunStrength: .52,
    sunColor: 16765859,
    hemiSky: 14208437,
    hemiGround: 5980465,
    hemiIntensity: .55,
    ambient: .14,
    areaIntensity: 3.2,
    areaColor: 16769725,
    glassEmissive: .84,
    exteriorColor: 15851709,
    lampIntensity: 7
}, {
    h: 10,
    sunStrength: .86,
    sunColor: 16774372,
    hemiSky: 14147545,
    hemiGround: 6642511,
    hemiIntensity: .82,
    ambient: .22,
    areaIntensity: 4.6,
    areaColor: 16775408,
    glassEmissive: 1,
    exteriorColor: 15397340,
    lampIntensity: 4
}, {
    h: 13,
    sunStrength: .92,
    sunColor: 16775405,
    hemiSky: 14541790,
    hemiGround: 6905425,
    hemiIntensity: .84,
    ambient: .24,
    areaIntensity: 5.2,
    areaColor: 16776181,
    glassEmissive: 1.12,
    exteriorColor: 15660256,
    lampIntensity: 3
}, {
    h: 15.8,
    sunStrength: .82,
    sunColor: 16772827,
    hemiSky: 13819095,
    hemiGround: 6641737,
    hemiIntensity: .82,
    ambient: .24,
    areaIntensity: 4.6,
    areaColor: 16775149,
    glassEmissive: 1.08,
    exteriorColor: 15265502,
    lampIntensity: 7
}, {
    h: 17.4,
    sunStrength: .62,
    sunColor: 16768962,
    hemiSky: 12832714,
    hemiGround: 6246725,
    hemiIntensity: .76,
    ambient: .22,
    areaIntensity: 3.8,
    areaColor: 16773860,
    glassEmissive: 1.2,
    exteriorColor: 15000267,
    lampIntensity: 15
}, {
    h: 18.7,
    sunStrength: .43,
    sunColor: 16750688,
    hemiSky: 11043432,
    hemiGround: 4796454,
    hemiIntensity: .36,
    ambient: .16,
    areaIntensity: 2.8,
    areaColor: 16765098,
    glassEmissive: 1.32,
    exteriorColor: 15249796,
    lampIntensity: 26
}, {
    h: 19.7,
    sunStrength: .16,
    sunColor: 14252124,
    hemiSky: 7303552,
    hemiGround: 3679775,
    hemiIntensity: .3,
    ambient: .1,
    areaIntensity: .65,
    areaColor: 13602162,
    glassEmissive: .72,
    exteriorColor: 9334110,
    lampIntensity: 42
}, {
    h: 20.6,
    sunStrength: .02,
    sunColor: 7241627,
    hemiSky: 4937065,
    hemiGround: 2957338,
    hemiIntensity: .22,
    ambient: .08,
    areaIntensity: .12,
    areaColor: 8355734,
    glassEmissive: .2,
    exteriorColor: 4081240,
    lampIntensity: 54
}, {
    h: 21,
    sunStrength: 0,
    sunColor: 5464953,
    hemiSky: 4147805,
    hemiGround: 2365974,
    hemiIntensity: .2,
    ambient: .07,
    areaIntensity: .05,
    areaColor: 7172741,
    glassEmissive: .12,
    exteriorColor: 2962499,
    lampIntensity: 58
} ];

function sampleKeys(hour) {
    const h = clamp(hour, LIGHT_KEYS[0].h, LIGHT_KEYS[LIGHT_KEYS.length - 1].h);
    let i = 0;
    while (i < LIGHT_KEYS.length - 2 && h > LIGHT_KEYS[i + 1].h) i++;
    const a = LIGHT_KEYS[i];
    const b = LIGHT_KEYS[i + 1];
    const f = smoothstep(a.h, b.h, h);
    return {
        sunStrength: lerp(a.sunStrength, b.sunStrength, f),
        sunColor: new THREE.Color(a.sunColor).lerp(new THREE.Color(b.sunColor), f),
        hemiSky: new THREE.Color(a.hemiSky).lerp(new THREE.Color(b.hemiSky), f),
        hemiGround: new THREE.Color(a.hemiGround).lerp(new THREE.Color(b.hemiGround), f),
        hemiIntensity: lerp(a.hemiIntensity, b.hemiIntensity, f),
        ambient: lerp(a.ambient, b.ambient, f),
        areaIntensity: lerp(a.areaIntensity, b.areaIntensity, f),
        areaColor: new THREE.Color(a.areaColor).lerp(new THREE.Color(b.areaColor), f),
        glassEmissive: lerp(a.glassEmissive, b.glassEmissive, f),
        exteriorColor: new THREE.Color(a.exteriorColor).lerp(new THREE.Color(b.exteriorColor), f),
        lampIntensity: lerp(a.lampIntensity, b.lampIntensity, f)
    };
}

function dotTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,243,213,1)");
    g.addColorStop(.3, "rgba(255,224,168,0.55)");
    g.addColorStop(1, "rgba(255,210,140,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function makeDust(scene) {
    const n = 210;
    const positions = new Float32Array(n * 3);
    const seeds = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
        positions[i * 3] = lerp(-3.2, 2.8, Math.random());
        positions[i * 3 + 1] = lerp(.15, 4.45, Math.random());
        positions[i * 3 + 2] = lerp(-5.85, 2.4, Math.random());
        seeds[i * 2] = Math.random() * Math.PI * 2;
        seeds[i * 2 + 1] = .3 + Math.random() * .9;
    }
    const geo = new THREE.BufferGeometry;
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
        size: .022,
        map: dotTexture(),
        transparent: true,
        opacity: .4,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        color: 16770225,
        sizeAttenuation: true,
        toneMapped: false
    });
    const pts = new THREE.Points(geo, mat);
    pts.name = "sunDust";
    scene.add(pts);
    const base = positions.slice();
    return {
        points: pts,
        update(elapsed) {
            const arr = geo.attributes.position.array;
            for (let i = 0; i < n; i++) {
                const s = seeds[i * 2];
                const sp = seeds[i * 2 + 1];
                arr[i * 3] = base[i * 3] + Math.sin(elapsed * .07 * sp + s) * .16;
                arr[i * 3 + 1] = base[i * 3 + 1] + Math.sin(elapsed * .11 * sp + s * 1.7) * .12;
                arr[i * 3 + 2] = base[i * 3 + 2] + Math.cos(elapsed * .06 * sp + s) * .12;
            }
            geo.attributes.position.needsUpdate = true;
        },
        material: mat
    };
}

export function buildInterior(scene, mats, tex) {
    const architecture = buildArchitecture(scene, mats, tex);
    const furniture = new THREE.Group;
    furniture.name = "furniture";
    const sofa = createSofa(mats);
    furniture.add(sofa);
    furniture.add(createCoffeeTable(mats));
    const sideboard = createSideboard(mats);
    furniture.add(sideboard.group);
    furniture.add(createBookcase(mats));
    furniture.add(createArmchair(mats));
    const pouf = createPouf(mats);
    pouf.position.set(.55, 0, .5);
    pouf.rotation.y = -.7;
    pouf.scale.setScalar(1);
    furniture.add(pouf);
    furniture.add(createSideTable(mats));
    furniture.add(createForegroundLibraryTable(mats));
    const floorLamp = createFloorLamp(mats);
    furniture.add(floorLamp.group);
    furniture.add(createStackOfBooksOnFloor(mats, {
        position: [ -3.35, .01, -3.6 ],
        rotation: .3,
        count: 6,
        scale: 1
    }));
    furniture.add(createStackOfBooksOnFloor(mats, {
        position: [ 2.85, .01, -3.05 ],
        rotation: -.4,
        count: 4,
        scale: .82
    }));
    furniture.add(createStackOfBooksOnFloor(mats, {
        position: [ -2.9, .01, 1.05 ],
        rotation: .2,
        count: 3,
        scale: .66
    }));
    scene.add(furniture);
    const plants = new THREE.Group;
    plants.name = "plants";
    plants.add(createFiddleLeaf(mats, {
        position: [ -4.2, 0, -5.35 ],
        rotation: .7,
        scale: .8,
        potMat: mats.ceramicCream,
        seed: 8
    }));
    plants.add(createMonstera(mats, {
        position: [ 3.8, 0, -4.55 ],
        rotation: -.2,
        scale: .95,
        potMat: mats.ceramicIndigo,
        seed: 12
    }));
    plants.add(createParlorPalm(mats, {
        position: [ -4.2, 0, -4.02 ],
        rotation: .2,
        scale: .62,
        potMat: mats.ceramicRose,
        seed: 6
    }));
    plants.add(createPothos(mats, {
        position: [ -4.28, 0, -2.55 ],
        rotation: .4,
        scale: .74,
        potMat: mats.ceramicRose,
        seed: 33,
        flowing: .8
    }));
    plants.add(createParlorPalm(mats, {
        position: [ -2.52, 0, -4.42 ],
        rotation: -.4,
        scale: .8,
        potMat: mats.ceramicCream,
        seed: 47
    }));
    plants.add(createFern(mats, {
        position: [ -4.05, 0, -.72 ],
        rotation: .4,
        scale: .7,
        potMat: mats.ceramicRose,
        seed: 19,
        size: .9
    }));
    plants.add(createHangingPothos(mats, {
        position: [ 4.12, 4.3, -2.75 ],
        scale: .95,
        seed: 41,
        spread: 1.3,
        drop: 2.25
    }));
    plants.add(createHangingPothos(mats, {
        position: [ 4.13, 4.1, .15 ],
        scale: .8,
        seed: 51,
        spread: 1,
        drop: 1.85
    }));
    scene.add(plants);
    const shadowGeo = new THREE.PlaneGeometry(1, 1);
    function contactShadow(x, z, w, d, opacity = .4, rot = 0) {
        const mat = mats.contactShadow.clone();
        mat.opacity = opacity;
        const m = new THREE.Mesh(shadowGeo, mat);
        m.rotation.x = -Math.PI / 2;
        m.rotation.z = rot;
        m.position.set(x, .024, z);
        m.scale.set(w, d, 1);
        m.renderOrder = 2;
        m.castShadow = false;
        m.receiveShadow = false;
        furniture.add(m);
        return m;
    }
    contactShadow(-1.05, -2.45, 4, 2.8, .44, .015);
    contactShadow(-.62, -1.15, 1.8, 1.35, .3, .06);
    contactShadow(-4.15, -2.4, 2.9, 1.05, .34);
    contactShadow(4.32, -1.35, 1.75, 1.05, .34);
    contactShadow(2.62, -2.98, 1.55, 1.55, .3, -.94);
    contactShadow(.55, .5, 1.05, .9, .24, -.7);
    contactShadow(3.18, -.55, .9, .9, .22);
    contactShadow(-3, -3.25, .7, .7, .2);
    contactShadow(-.22, 2.5, 1.15, 1.15, .25, -.22);
    contactShadow(-2.52, -4.42, 1.15, 1, .22);
    contactShadow(-3.95, -3.5, 1, .85, .18);
    contactShadow(4.05, -3.45, 1, .9, .18);
    contactShadow(2.8, -3.2, .8, .7, .15);
    const hemi = new THREE.HemisphereLight(15720644, 6243892, .6);
    scene.add(hemi);
    const ambient = new THREE.AmbientLight(16773858, .14);
    scene.add(ambient);
    const roomFill = new THREE.DirectionalLight(16774118, .32);
    roomFill.position.set(.8, 5.1, 3.2);
    roomFill.target.position.set(-.2, 0, -2.2);
    scene.add(roomFill, roomFill.target);
    const ceilingBounce = new THREE.PointLight(15986920, 7.5, 9.5, 2);
    ceilingBounce.position.set(-.2, 4.68, -1.3);
    scene.add(ceilingBounce);
    const areaLight = new THREE.RectAreaLight(16773074, 4.5, ROOM.window.width * .9, 4.4);
    areaLight.position.set(ROOM.window.x, 2.7, ROOM.back + .12);
    areaLight.lookAt(ROOM.window.x, 1.8, 3);
    scene.add(areaLight);
    const sunTarget = new THREE.Object3D;
    sunTarget.position.set(-.8, .1, -2.5);
    scene.add(sunTarget);
    const sunSpot = new THREE.SpotLight(16767398, 260, 26, .58, .72, 1.6);
    sunSpot.position.set(ROOM.window.x, 3.2, ROOM.back + .35);
    sunSpot.target = sunTarget;
    sunSpot.map = tex.stained.projection;
    sunSpot.castShadow = true;
    sunSpot.shadow.mapSize.set(2048, 2048);
    sunSpot.shadow.camera.near = .6;
    sunSpot.shadow.camera.far = 26;
    sunSpot.shadow.bias = -45e-5;
    sunSpot.shadow.normalBias = .028;
    sunSpot.shadow.radius = 2.6;
    scene.add(sunSpot);
    const frontSun = new THREE.SpotLight(16768944, 85, 18, .3, .92, 1.6);
    frontSun.position.set(-3.6, 3, 1.8);
    frontSun.target.position.set(-.8, .55, -2.15);
    frontSun.map = tex.stained.projection;
    frontSun.castShadow = false;
    scene.add(frontSun, frontSun.target);
    const hallLight = new THREE.PointLight(16760190, 5.5, 5.5, 2);
    hallLight.position.set(-5.5, 2.35, -4.9);
    scene.add(hallLight);
    const sideboardLight = new THREE.PointLight(16765088, 4.2, 3.6, 2);
    sideboardLight.position.set(-3.9, 1.65, -2.9);
    scene.add(sideboardLight);
    const tableFill = new THREE.PointLight(16180946, 5.2, 4.4, 2);
    tableFill.position.set(-1.1, 1.65, .8);
    scene.add(tableFill);
    const frontFill = new THREE.PointLight(15725038, 8.5, 9, 2);
    frontFill.position.set(.2, 2.2, 2.3);
    scene.add(frontFill);
    const eastFill = new THREE.PointLight(16115926, 4.2, 6, 2);
    eastFill.position.set(3.25, 2.3, -1.9);
    scene.add(eastFill);
    const sofaFill = new THREE.PointLight(16181209, 8, 6.2, 2);
    sofaFill.position.set(-.35, 1.95, -1.35);
    scene.add(sofaFill);
    floorLamp.group.updateMatrixWorld(true);
    const lampWorld = new THREE.Vector3;
    floorLamp.shadeGroup.getWorldPosition(lampWorld);
    const lampLight = new THREE.PointLight(16762754, 16, 6.5, 1.9);
    lampLight.position.copy(lampWorld).add(new THREE.Vector3(0, -.2, 0));
    scene.add(lampLight);
    const lampSpot = new THREE.SpotLight(16766106, 10, 5.5, .8, .9, 1.6);
    lampSpot.position.copy(lampLight.position);
    lampSpot.target.position.set(lampWorld.x - .2, 0, lampWorld.z + 1.4);
    scene.add(lampSpot, lampSpot.target);
    const sideboardShadeMat = sideboard.group.children.flatMap(c => c.children || []);
    const dust = makeDust(scene);
    const shaftMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: {
            uColorA: {
                value: new THREE.Color(16761455)
            },
            uColorB: {
                value: new THREE.Color(12570765)
            },
            uOpacity: {
                value: 0
            },
            uTime: {
                value: 0
            }
        },
        vertexShader: `\n      varying vec2 vUv;\n      varying vec3 vWorld;\n      void main() {\n        vUv = uv;\n        vec4 w = modelMatrix * vec4(position, 1.0);\n        vWorld = w.xyz;\n        gl_Position = projectionMatrix * viewMatrix * w;\n      }\n    `,
        fragmentShader: `\n      uniform vec3 uColorA;\n      uniform vec3 uColorB;\n      uniform float uOpacity;\n      uniform float uTime;\n      varying vec2 vUv;\n      varying vec3 vWorld;\n      void main() {\n        float edge = smoothstep(0.0, 0.28, vUv.x) * smoothstep(1.0, 0.72, vUv.x);\n        float fall = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.5, vUv.y);\n        float bands = 0.55 + 0.45 * sin(vWorld.y * 2.6 + vWorld.x * 1.2 + uTime * 0.08);\n        vec3 col = mix(uColorA, uColorB, smoothstep(0.1, 0.9, vUv.x));\n        gl_FragColor = vec4(col, edge * fall * bands * uOpacity);\n      }\n    `
    });
    const shaftGeo = new THREE.CylinderGeometry(2.4, 1.4, 9.5, 24, 1, true);
    shaftGeo.translate(0, -4.75, 0);
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.set(ROOM.window.x, ROOM.back + 0, 0);
    shaft.rotation.x = -1.05;
    shaft.renderOrder = 2;
    shaft.name = "windowShaft";
    scene.add(shaft);
    const state = {
        hour: DEFAULT_HOUR,
        label: "Golden afternoon"
    };
    function setTime(hour) {
        const h = clamp(hour, TIME_MIN, TIME_MAX);
        state.hour = h;
        const k = sampleKeys(h);
        const t = clamp((h - TIME_MIN) / (TIME_MAX - TIME_MIN), 0, 1);
        const elev = Math.sin(Math.PI * t);
        const elevSoft = Math.pow(Math.max(.001, elev), .8);
        hemi.color.copy(k.hemiSky);
        hemi.groundColor.copy(k.hemiGround);
        hemi.intensity = k.hemiIntensity * .728;
        ambient.intensity = k.ambient * .81;
        ambient.color.copy(k.sunColor).lerp(new THREE.Color(15988209), .7);
        roomFill.intensity = .09 + .13 * k.sunStrength;
        ceilingBounce.intensity = 2.3 + 3.85 * k.sunStrength;
        areaLight.color.copy(k.areaColor);
        areaLight.intensity = k.areaIntensity * .636;
        const targetX = lerp(1.2, -2.6, t);
        const targetZ = 1.2 - 2.9 * elevSoft;
        const sourceY = 1.55 + 2.55 * elev;
        sunSpot.position.set(ROOM.window.x + Math.sin(t * Math.PI * 2) * .3, sourceY, ROOM.back + .42);
        sunTarget.position.set(targetX, .045, targetZ);
        sunTarget.updateMatrixWorld();
        sunSpot.target.updateMatrixWorld();
        sunSpot.color.copy(k.sunColor).lerp(new THREE.Color(16775921), .58);
        sunSpot.intensity = 480 * Math.pow(k.sunStrength, .9);
        sunSpot.angle = .44 + .08 * (1 - elev);
        sunSpot.penumbra = .66 + .18 * (1 - elev);
        frontSun.position.set(-3.9 + t * .5, 2.85 + elev * .35, 2.15 - t * .5);
        frontSun.target.position.set(lerp(-.2, -1.9, t), .5 + (1 - elev) * .12, lerp(-1.5, -2.35, t));
        frontSun.target.updateMatrixWorld();
        frontSun.color.copy(k.sunColor).lerp(new THREE.Color(16774884), .55);
        frontSun.intensity = 175 * Math.pow(k.sunStrength, .85);
        frontSun.angle = .28 + .04 * (1 - elev);
        frontSun.penumbra = .9;
        const glassGlow = .5 + .52 * k.glassEmissive;
        const glassTint = k.sunColor.clone().lerp(new THREE.Color(16774882), .38);
        mats.stainedGlass.color.copy(glassTint).multiplyScalar(glassGlow);
        if (architecture.windowParts?.ext?.material) {
            architecture.windowParts.ext.material.color.copy(k.exteriorColor).lerp(new THREE.Color(16777215), .1).multiplyScalar(.85);
        }
        if (architecture.windowParts?.backGlowMat) {
            architecture.windowParts.backGlowMat.color.copy(k.sunColor).lerp(new THREE.Color(16777215), .35);
            architecture.windowParts.backGlowMat.opacity = .004 + .012 * k.sunStrength;
        }
        lampLight.intensity = k.lampIntensity;
        lampSpot.intensity = k.lampIntensity * .5;
        tableFill.intensity = .675 + 1.8 * k.sunStrength;
        frontFill.intensity = 1.125 + 2.475 * k.sunStrength;
        sofaFill.intensity = 1.35 + 2.14 * k.sunStrength;
        eastFill.intensity = 1.875 + 3.5 * k.sunStrength;
        sunSpot.shadow.intensity = clamp(.35 + k.sunStrength * .65, .2, 1);
        shaftMat.uniforms.uOpacity.value = .012 + .035 * k.sunStrength;
        shaftMat.uniforms.uColorA.value.copy(k.sunColor);
        shaftMat.uniforms.uColorB.value.set(11325595).lerp(new THREE.Color(16769955), .35);
        const dir = new THREE.Vector3(targetX - sunSpot.position.x, -sourceY + .1, targetZ - sunSpot.position.z).normalize();
        const q = (new THREE.Quaternion).setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
        shaft.position.set(sunSpot.position.x, Math.max(3.8, sourceY), ROOM.back + .22);
        shaft.quaternion.copy(q);
        shaft.scale.set(.75 + (1 - elev) * .55, 1, .75 + (1 - elev) * .55);
        dust.material.opacity = .2 + .28 * k.sunStrength;
        dust.material.color.copy(k.sunColor).lerp(new THREE.Color(16777215), .4);
        if (sideboardShadeMat) {}
        state.period = describeTime(h);
        return state;
    }
    function describeTime(h) {
        if (h < 7.2) return "First light";
        if (h < 10.5) return "Bright morning";
        if (h < 13.5) return "High noon";
        if (h < 16) return "Long afternoon";
        if (h < 18.2) return "Golden hour";
        if (h < 19.8) return "Amber dusk";
        if (h < 20.6) return "Blue hour";
        return "Lamplight";
    }
    function update(elapsed) {
        dust.update(elapsed);
        shaftMat.uniforms.uTime.value = elapsed;
        const breath = 1 + Math.sin(elapsed * .7) * .012;
        lampLight.intensity *= 1;
        lampSpot.intensity = sampleKeys(state.hour).lampIntensity * .5 * breath;
    }
    setTime(DEFAULT_HOUR);
    return {
        architecture: architecture,
        furniture: furniture,
        plants: plants,
        lights: {
            hemi: hemi,
            ambient: ambient,
            roomFill: roomFill,
            ceilingBounce: ceilingBounce,
            areaLight: areaLight,
            sunSpot: sunSpot,
            sunTarget: sunTarget,
            frontSun: frontSun,
            hallLight: hallLight,
            sideboardLight: sideboardLight,
            lampLight: lampLight,
            lampSpot: lampSpot,
            tableFill: tableFill,
            frontFill: frontFill,
            sofaFill: sofaFill,
            eastFill: eastFill
        },
        dust: dust,
        shaft: shaft,
        setTime: setTime,
        update: update,
        state: state,
        describeTime: describeTime
    };
}
