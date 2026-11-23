import * as THREE from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";

import { RenderPass } from "three/addons/postprocessing/RenderPass.js";

import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

import { createFloorTextures, createFloorDetailTexture, createFloorWearTexture, createFloorStainOverlay, createJambEdgeTexture, createFineNormalTexture, createWallTextures, createDoorTextures, createConcreteTextures, createPaintedSteelTextures, createPersonnelDoorTexture, createExitSignTexture, createLabelTexture, createGlowTexture, createBeamDustTexture, createSafetyPostTextures, createFlashlightCookie, createEnvironmentTexture, mulberry32 } from "./textures.js";

const QUERY = new URLSearchParams(window.location.search);

const CAPTURE = QUERY.has("capture");

const STILL = QUERY.has("still");

const STILL_TIME = 8.4;

const HALL = {
    xMin: -15,
    xMax: 22,
    zMin: -32,
    zMax: 12,
    height: 10.8,
    roof: 10.62
};

const CAMERA_HOME = new THREE.Vector3(-9.8, 1.65, 9.8);

const LOOK_FAR = new THREE.Vector3(-5, 2.45, -48.2);

const BASE_FOV = 53;

const app = document.getElementById("app");

const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: true,
    stencil: false
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.4));

renderer.setSize(window.innerWidth, window.innerHeight);

renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.toneMapping = THREE.ACESFilmicToneMapping;

renderer.toneMappingExposure = 1.16;

renderer.shadowMap.enabled = true;

renderer.shadowMap.type = THREE.PCFShadowMap;

renderer.info.autoReset = false;

app.appendChild(renderer.domElement);

const scene = new THREE.Scene;

scene.background = new THREE.Color(131843);

scene.fog = new THREE.FogExp2(526601, .0095);

const camera = new THREE.PerspectiveCamera(BASE_FOV, window.innerWidth / window.innerHeight, .08, 150);

camera.position.copy(CAMERA_HOME);

const homeDir = LOOK_FAR.clone().sub(CAMERA_HOME).normalize();

camera.lookAt(LOOK_FAR);

const pmrem = new THREE.PMREMGenerator(renderer);

const envSource = createEnvironmentTexture();

const envRT = pmrem.fromEquirectangular(envSource);

scene.environment = envRT.texture;

scene.environmentIntensity = .18;

envSource.dispose();

pmrem.dispose();

const maxAniso = renderer.capabilities.getMaxAnisotropy();

function tuneMaps(obj) {
    for (const t of Object.values(obj)) {
        if (t && t.isTexture) t.anisotropy = Math.min(maxAniso, 8);
    }
    return obj;
}

const floorTx = tuneMaps(createFloorTextures());

const floorDetailTx = createFloorDetailTexture();

const floorWearTx = createFloorWearTexture();

const floorStainTx = createFloorStainOverlay();

const jambEdgeTx = createJambEdgeTexture();

const fineNormalTx = createFineNormalTexture(512);

for (const t of [ ...Object.values(floorTx), floorDetailTx, floorWearTx, floorStainTx, fineNormalTx ]) {
    if (t && t.isTexture) t.anisotropy = Math.min(maxAniso, 16);
}

const wallTx = tuneMaps(createWallTextures());

const doorTx = tuneMaps(createDoorTextures());

const concreteTx = tuneMaps(createConcreteTextures());

const paintedTx = tuneMaps(createPaintedSteelTextures());

const personDoorTx = tuneMaps(createPersonnelDoorTexture());

const exitSignTx = createExitSignTexture();

const bayLabelTx = createLabelTexture("03", "BAY");

const glowTx = createGlowTexture();

const dustTx = createBeamDustTexture();

const safetyPostTx = createSafetyPostTextures();

const torchCookie = createFlashlightCookie();

const MAT = {};

MAT.floor = new THREE.MeshStandardMaterial({
    color: 13289148,
    map: floorTx.map,
    roughnessMap: floorTx.roughnessMap,
    roughness: 1,
    metalness: .015,
    normalMap: floorTx.normalMap,
    normalScale: new THREE.Vector2(.82, .82),
    envMapIntensity: .2
});

MAT.floor.onBeforeCompile = shader => {
    shader.uniforms.uFloorDetail = {
        value: floorDetailTx
    };
    shader.uniforms.uFineNormal = {
        value: fineNormalTx
    };
    shader.uniforms.uFloorWear = {
        value: floorWearTx
    };
    shader.fragmentShader = "uniform sampler2D uFloorDetail;\nuniform sampler2D uFineNormal;\nuniform sampler2D uFloorWear;\n" + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `#include <map_fragment>\n     vec3 fdA = texture2D(uFloorDetail, vMapUv * vec2(9.0, 14.0)).rgb;\n     vec3 fdB = texture2D(uFloorDetail, vMapUv * vec2(24.0, 39.0) + vec2(0.37, 0.61)).rgb;\n     vec3 fd = mix(fdA, fdB, 0.36);\n     diffuseColor.rgb *= mix(vec3(1.0), fd * 1.50, 0.66);\n     vec3 wear = texture2D(uFloorWear, vMapUv).rgb;\n     diffuseColor.rgb *= mix(vec3(1.0), wear, 0.88);`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>\n     float fRough = texture2D(uFloorDetail, vMapUv * vec2(19.0, 31.0) + vec2(0.11, 0.53)).g;\n     float fRough2 = texture2D(uFloorDetail, vMapUv * vec2(47.0, 77.0)).g;\n     roughnessFactor = clamp(roughnessFactor * mix(0.9, 0.72 + fRough * 0.62, 0.6), 0.06, 1.0);\n     roughnessFactor *= 0.94 + fRough2 * 0.12;`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>\n     vec3 fineN = texture2D(uFineNormal, vMapUv * vec2(46.0, 74.0)).xyz * 2.0 - 1.0;\n     vec3 worldFine = vec3(fineN.x, 0.0, fineN.y);\n     vec3 viewFine = (viewMatrix * vec4(worldFine, 0.0)).xyz;\n     normal = normalize(normal + viewFine * 0.46);`);
};

MAT.wallUpper = new THREE.MeshStandardMaterial({
    color: 13684155,
    map: wallTx.map,
    normalMap: wallTx.normalMap,
    normalScale: new THREE.Vector2(.5, .5),
    roughnessMap: wallTx.roughnessMap,
    roughness: 1,
    metalness: .08,
    envMapIntensity: .2
});

MAT.wallLower = new THREE.MeshStandardMaterial({
    color: 6710362,
    map: wallTx.lowerMap,
    roughness: .9,
    metalness: .04,
    envMapIntensity: .16
});

MAT.wallUpper.emissiveMap = wallTx.map;

MAT.wallUpper.emissive = new THREE.Color(16777215);

MAT.wallUpper.emissiveIntensity = .55;

MAT.wallUpperDark = MAT.wallUpper.clone();

MAT.wallUpperDark.color.setHex(4079674);

MAT.wallUpperDark.emissiveIntensity = 0;

MAT.wallLowerDark = MAT.wallLower.clone();

MAT.wallLowerDark.color.setHex(10262924);

MAT.concrete = new THREE.MeshStandardMaterial({
    color: 10131597,
    map: concreteTx.map,
    roughness: .92,
    metalness: .02,
    envMapIntensity: .2
});

MAT.concreteDark = MAT.concrete.clone();

MAT.concreteDark.color.setHex(5921877);

MAT.farHeader = MAT.concreteDark.clone();

MAT.farHeader.color.setHex(3092780);

const farHeaderMap = concreteTx.map.clone();

farHeaderMap.wrapS = farHeaderMap.wrapT = THREE.RepeatWrapping;

farHeaderMap.repeat.set(5, 2);

farHeaderMap.needsUpdate = true;

MAT.farHeader.map = farHeaderMap;

MAT.steel = new THREE.MeshStandardMaterial({
    color: 1974558,
    metalness: .34,
    roughness: .64,
    envMapIntensity: .34
});

MAT.steelColumn = new THREE.MeshStandardMaterial({
    color: 5922390,
    emissive: 131842,
    metalness: .24,
    roughness: .74,
    envMapIntensity: .35
});

MAT.steelDull = new THREE.MeshStandardMaterial({
    color: 2830122,
    metalness: .3,
    roughness: .72,
    envMapIntensity: .3
});

MAT.steelEdge = new THREE.MeshStandardMaterial({
    color: 4012852,
    metalness: .5,
    roughness: .58,
    envMapIntensity: .38
});

MAT.roof = new THREE.MeshStandardMaterial({
    color: 1645336,
    metalness: .4,
    roughness: .76,
    envMapIntensity: .2
});

const roofDeckMap = wallTx.map.clone();

roofDeckMap.wrapS = roofDeckMap.wrapT = THREE.RepeatWrapping;

roofDeckMap.repeat.set(13, 23);

roofDeckMap.needsUpdate = true;

MAT.roofDeck = new THREE.MeshStandardMaterial({
    color: 10196610,
    map: roofDeckMap,
    metalness: .22,
    roughness: .78,
    side: THREE.DoubleSide
});

MAT.doorRib = new THREE.MeshStandardMaterial({
    color: 2369315,
    metalness: .3,
    roughness: .72,
    envMapIntensity: .25
});

MAT.rubber = new THREE.MeshStandardMaterial({
    color: 1052944,
    metalness: .05,
    roughness: .78
});

MAT.yellow = new THREE.MeshStandardMaterial({
    color: 9402933,
    emissive: 985859,
    emissiveIntensity: .9,
    map: paintedTx.map,
    roughnessMap: paintedTx.roughnessMap,
    roughness: .8,
    metalness: .14,
    envMapIntensity: .24
});

MAT.yellowPlain = new THREE.MeshStandardMaterial({
    color: 11309366,
    roughness: .7,
    metalness: .25
});

MAT.safetyPost = new THREE.MeshStandardMaterial({
    color: 4868895,
    map: safetyPostTx.map,
    roughnessMap: safetyPostTx.roughnessMap,
    roughness: .95,
    metalness: .05,
    envMapIntensity: .18
});

MAT.door = new THREE.MeshStandardMaterial({
    color: 8749688,
    map: personDoorTx.map,
    emissive: 526343,
    roughness: .66,
    metalness: .22,
    envMapIntensity: .35
});

MAT.rollDoor = new THREE.MeshStandardMaterial({
    color: 10922397,
    map: doorTx.map,
    roughnessMap: doorTx.roughnessMap,
    roughness: .8,
    metalness: .3,
    envMapIntensity: .25
});

MAT.rollDoorDark = MAT.rollDoor.clone();

MAT.rollDoorDark.color.setHex(9409416);

MAT.rollDoorWarm = MAT.rollDoor.clone();

MAT.rollDoorWarm.color.setHex(10065290);

MAT.paper = new THREE.MeshStandardMaterial({
    color: 5657417,
    roughness: .95,
    metalness: 0,
    side: THREE.DoubleSide
});

MAT.plastic = new THREE.MeshStandardMaterial({
    color: 4935755,
    roughness: .55,
    metalness: .02,
    side: THREE.DoubleSide
});

const glowYellow = new THREE.Color(16767904);

const glowCold = new THREE.Color(13032674);

const rng = mulberry32(3255305);

const boxGeo = new THREE.BoxGeometry(1, 1, 1);

const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 12);

function boxMesh(w, h, d, material, x, y, z, opts = {}) {
    const mesh = new THREE.Mesh(boxGeo, material);
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y, z);
    if (opts.rotY) mesh.rotation.y = opts.rotY;
    if (opts.rotZ) mesh.rotation.z = opts.rotZ;
    if (opts.rotX) mesh.rotation.x = opts.rotX;
    mesh.castShadow = opts.cast !== false;
    mesh.receiveShadow = opts.receive !== false;
    if (opts.name) mesh.name = opts.name;
    return mesh;
}

function addBox(parent, w, h, d, material, x, y, z, opts = {}) {
    const m = boxMesh(w, h, d, material, x, y, z, opts);
    parent.add(m);
    return m;
}

function planeMesh(w, h, material, x, y, z, rotationY = 0, opts = {}) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotationY;
    if (opts.rotationX !== undefined) mesh.rotation.x = opts.rotationX;
    mesh.castShadow = !!opts.cast;
    mesh.receiveShadow = opts.receive !== false;
    return mesh;
}

function cylMesh(radius, height, material, x, y, z, opts = {}) {
    const mesh = new THREE.Mesh(cylinderGeo, material);
    mesh.scale.set(radius, height, radius);
    mesh.position.set(x, y, z);
    if (opts.rotZ) mesh.rotation.z = opts.rotZ;
    if (opts.rotX) mesh.rotation.x = opts.rotX;
    if (opts.rotY) mesh.rotation.y = opts.rotY;
    mesh.castShadow = opts.cast !== false;
    mesh.receiveShadow = opts.receive !== false;
    return mesh;
}

function addCylinder(parent, radius, height, material, x, y, z, opts = {}) {
    const m = cylMesh(radius, height, material, x, y, z, opts);
    parent.add(m);
    return m;
}

function barBetween(a, b, thickness, depth = thickness) {
    const p1 = new THREE.Vector3(...a);
    const p2 = new THREE.Vector3(...b);
    const mid = p1.clone().add(p2).multiplyScalar(.5);
    const dir = p2.clone().sub(p1);
    const length = dir.length();
    dir.normalize();
    const q = (new THREE.Quaternion).setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const m = (new THREE.Matrix4).compose(mid, q, new THREE.Vector3(thickness, length, depth));
    return m;
}

function buildBars(matrices, material, cast = false) {
    const mesh = new THREE.InstancedMesh(boxGeo, material, matrices.length);
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    return mesh;
}

function metalRod(parent, a, b, radius = .035, material = MAT.steel) {
    const p1 = new THREE.Vector3(...a);
    const p2 = new THREE.Vector3(...b);
    const mid = p1.clone().add(p2).multiplyScalar(.5);
    const dir = p2.clone().sub(p1);
    const len = dir.length();
    const mesh = new THREE.Mesh(cylinderGeo, material);
    mesh.scale.set(radius, len, radius);
    mesh.position.copy(mid);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
}

const world = new THREE.Group;

world.name = "Bay 03";

scene.add(world);

const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALL.xMax - HALL.xMin, HALL.zMax - HALL.zMin), MAT.floor);

floor.name = "Worn concrete slab";

floor.rotation.x = -Math.PI / 2;

floor.position.set((HALL.xMin + HALL.xMax) / 2, 0, (HALL.zMin + HALL.zMax) / 2);

floor.receiveShadow = true;

world.add(floor);

{
    const stainGeo = new THREE.PlaneGeometry(HALL.xMax - HALL.xMin, HALL.zMax - HALL.zMin);
    const stainMat = new THREE.MeshBasicMaterial({
        map: floorStainTx,
        transparent: true,
        opacity: .82,
        depthWrite: false,
        side: THREE.FrontSide,
        fog: true,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
    });
    const stains = new THREE.Mesh(stainGeo, stainMat);
    stains.name = "Slab stains and tyre arcs";
    stains.rotation.x = -Math.PI / 2;
    stains.position.set((HALL.xMin + HALL.xMax) / 2, .012, (HALL.zMin + HALL.zMax) / 2);
    stains.renderOrder = 2;
    stains.receiveShadow = false;
    stains.castShadow = false;
    scene.add(stains);
}

addBox(world, .36, .32, HALL.zMax - HALL.zMin, MAT.concreteDark, HALL.xMin + .18, .16, (HALL.zMin + HALL.zMax) / 2, {
    cast: false
});

addBox(world, .36, .28, HALL.zMax - HALL.zMin, MAT.concreteDark, HALL.xMax - .18, .14, (HALL.zMin + HALL.zMax) / 2, {
    cast: false
});

function buildWall(x, side) {
    const group = new THREE.Group;
    group.name = side < 0 ? "Left wall / corrugated skin" : "Right wall / corrugated skin";
    const isLeft = side < 0;
    const upperMat = isLeft ? MAT.wallUpper : MAT.wallUpperDark;
    const lowerMat = isLeft ? MAT.wallLower : MAT.wallLowerDark;
    const rot = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    const skinX = x - side * .02;
    const length = HALL.zMax - HALL.zMin;
    const midZ = (HALL.zMin + HALL.zMax) / 2;
    addBox(group, .22, HALL.height, length, MAT.steelDull, x + side * .12, HALL.height / 2, midZ, {
        cast: false,
        receive: false
    });
    const lowerH = 3.35;
    group.add(planeMesh(length, lowerH, lowerMat, skinX, lowerH / 2, midZ, rot));
    group.add(planeMesh(length, HALL.height - lowerH, upperMat, skinX, lowerH + (HALL.height - lowerH) / 2, midZ, rot));
    const innerX = x - side * .34;
    for (const y of [ 3.34, 4.35, 6.7, 9.15 ]) {
        addBox(group, .24, y === 3.34 ? .34 : .2, length, MAT.steelDull, innerX, y, midZ, {
            cast: false
        });
    }
    for (let z = HALL.zMin + 3; z < HALL.zMax - 2; z += 4.9) {
        addBox(group, .1, HALL.height - 3.4, .12, MAT.steelDull, x - side * .18, 3.4 + (HALL.height - 3.4) / 2, z, {
            cast: false
        });
    }
    return group;
}

const leftWall = buildWall(HALL.xMin, -1);

const rightWall = buildWall(HALL.xMax, 1);

world.add(leftWall, rightWall);

function createIBeamColumn(x, z, height = HALL.height - .18, options = {}) {
    const g = new THREE.Group;
    g.name = options.name || "Structural I-beam";
    const depthX = options.depthX || .48;
    const widthZ = options.widthZ || .54;
    const mat = options.mat || MAT.steel;
    addBox(g, depthX, height, .085, mat, 0, height / 2, -widthZ / 2, {
        cast: true
    });
    addBox(g, depthX, height, .085, mat, 0, height / 2, widthZ / 2, {
        cast: true
    });
    addBox(g, .09, height, widthZ, mat, 0, height / 2, 0, {
        cast: true
    });
    addBox(g, .82, .06, .75, MAT.steelDull, 0, .03, 0, {
        cast: false
    });
    addBox(g, .65, .06, .58, MAT.steelDull, 0, height + .02, 0, {
        cast: false
    });
    for (const dz of [ -.26, .26 ]) {
        for (const dx of [ -.29, .29 ]) {
            addCylinder(g, .035, .035, MAT.steelEdge, dx, .085, dz, {
                rotZ: Math.PI / 2,
                cast: false
            });
        }
    }
    if (options.guard) {
        const guard = addBox(g, depthX + .14, 1.12, widthZ + .16, MAT.yellow, 0, .66, 0, {
            cast: true
        });
        guard.name = "Yellow column guard";
        addBox(g, depthX + .19, .08, widthZ + .21, MAT.rubber, 0, .11, 0, {
            cast: false
        });
        for (const yy of [ .94, 1.18 ]) {
            addBox(g, depthX + .15, .055, widthZ + .17, MAT.rubber, 0, yy, 0, {
                cast: false
            });
        }
    }
    if (options.label) {
        const signMat = new THREE.MeshBasicMaterial({
            map: options.label,
            color: 1447699,
            transparent: true,
            opacity: .9,
            depthWrite: false
        });
        const sign = planeMesh(.32, .32, signMat, depthX / 2 + .007, 2.05, .02, Math.PI / 2, {
            receive: false
        });
        g.add(sign);
    }
    g.position.set(x, 0, z);
    g.traverse(c => {
        if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
        }
    });
    return g;
}

const leftColumnZ = [ 2.4, -10.1, -17, -23.9, -30.7 ];

leftColumnZ.forEach((z, i) => {
    const col = createIBeamColumn(HALL.xMin + .56, z, HALL.height - .5, {
        guard: i > 1 && i % 2 === 0,
        label: i === 3 ? bayLabelTx : null,
        mat: MAT.steel
    });
    leftWall.add(col);
});

for (let i = 0; i < leftColumnZ.length - 1; i++) {
    const z1 = leftColumnZ[i];
    const z2 = leftColumnZ[i + 1];
    metalRod(leftWall, [ HALL.xMin + .4, 4.35, z1 ], [ HALL.xMin + .4, 8.95, z2 ], .085);
    metalRod(leftWall, [ HALL.xMin + .4, 8.95, z1 ], [ HALL.xMin + .4, 4.35, z2 ], .085);
}

const rightColumnZ = [ -1, -8.5, -16, -23.5, -30.7 ];

rightColumnZ.forEach((z, i) => {
    rightWall.add(createIBeamColumn(HALL.xMax - .52, z, HALL.height - .5, {
        guard: i === 1 || i === 4,
        mat: MAT.steelDull
    }));
});

const interiorColumns = [];

const interiorColZ = [ -13.5, -22.5, -30.5 ];

for (const z of interiorColZ) {
    const c = createIBeamColumn(5, z, 9.05, {
        guard: true,
        mat: MAT.steelColumn,
        depthX: .62,
        widthZ: .72,
        name: "Interior column"
    });
    world.add(c);
    interiorColumns.push(c);
}

addBox(world, .4, .62, HALL.zMax - HALL.zMin, MAT.steel, 5, 9.15, (HALL.zMin + HALL.zMax) / 2, {
    cast: false,
    receive: true
});

const conduitGroup = new THREE.Group;

conduitGroup.name = "Wall services";

for (const [y, radius, zOff] of [ [ 2.77, .046, 0 ], [ 3.05, .028, .15 ], [ 7.25, .062, 0 ] ]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, HALL.zMax - HALL.zMin, 10), MAT.steelEdge);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(HALL.xMin + .72, y, (HALL.zMin + HALL.zMax) / 2 + zOff);
    pipe.castShadow = false;
    pipe.receiveShadow = true;
    conduitGroup.add(pipe);
}

for (const z of [ 3.8, -1.2, -6.8, -12.6 ]) {
    const drop = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 2.6, 8), MAT.steelEdge);
    drop.position.set(HALL.xMin + .72, 1.48, z);
    drop.castShadow = false;
    drop.receiveShadow = true;
    conduitGroup.add(drop);
    addBox(conduitGroup, .16, .32, .24, MAT.steelDull, HALL.xMin + .7, 2.55, z + .2, {
        cast: false
    });
}

for (let z = -42; z < 10; z += 3.2) {
    addBox(conduitGroup, .04, .07, .11, MAT.steelDull, HALL.xMin + .7, 2.77, z, {
        cast: false
    });
}

world.add(conduitGroup);

const trussBars = [];

const trussGroup = new THREE.Group;

trussGroup.name = "Roof trusses";

const trussZ = [];

for (let z = HALL.zMax - 2.8; z > HALL.zMin; z -= 4.35) trussZ.push(z);

const trussTopY = 10.18;

const trussBottomY = 8.78;

const panel = 2.55;

for (const z of trussZ) {
    trussBars.push(barBetween([ HALL.xMin, trussTopY, z ], [ HALL.xMax, trussTopY, z ], .15, .22));
    trussBars.push(barBetween([ HALL.xMin, trussBottomY, z ], [ HALL.xMax, trussBottomY, z ], .16, .18));
    let flip = false;
    let node = 0;
    for (let x = HALL.xMin; x < HALL.xMax - .01; x += panel) {
        const x2 = Math.min(x + panel, HALL.xMax);
        if (flip) {
            trussBars.push(barBetween([ x, trussBottomY, z ], [ x2, trussTopY, z ], .085, .12));
        } else {
            trussBars.push(barBetween([ x, trussTopY, z ], [ x2, trussBottomY, z ], .085, .12));
        }
        if (node % 2 === 0) {
            trussBars.push(barBetween([ x, trussBottomY, z ], [ x, trussTopY, z ], .075, .1));
        }
        trussBars.push(barBetween([ x2, trussTopY, z ], [ x2, HALL.roof, z ], .06, .08));
        flip = !flip;
        node++;
    }
}

for (let x = HALL.xMin + 1.2; x < HALL.xMax; x += 2.55) {
    trussBars.push(barBetween([ x, HALL.roof - .12, HALL.zMin ], [ x, HALL.roof - .12, HALL.zMax ], .1, .15));
}

for (let x = HALL.xMin + 2.5; x < HALL.xMax; x += 1.55) {
    trussBars.push(barBetween([ x, HALL.roof - .035, HALL.zMin ], [ x, HALL.roof - .035, HALL.zMax ], .045, .07));
}

for (const z of trussZ) {
    if (trussZ.indexOf(z) % 2 === 0) {
        const z2 = z - 4.35;
        if (z2 > HALL.zMin) {
            trussBars.push(barBetween([ HALL.xMin + 4, trussTopY, z ], [ HALL.xMin + 9, trussTopY, z2 ], .045, .045));
            trussBars.push(barBetween([ HALL.xMin + 13, trussTopY, z ], [ HALL.xMin + 18, trussTopY, z2 ], .045, .045));
        }
    }
}

for (let i = 0; i < trussZ.length - 1; i++) {
    const z1 = trussZ[i];
    const z2 = trussZ[i + 1];
    const shift = i % 2 * 3.2;
    for (const bx of [ -11.5, -2.5, 6.5, 15.5 ]) {
        const x1 = bx + shift;
        trussBars.push(barBetween([ x1, trussTopY - .08, z1 ], [ x1 + 3.4, trussTopY - .08, z2 ], .048, .048));
        trussBars.push(barBetween([ x1 + 3.4, trussTopY - .08, z1 ], [ x1, trussTopY - .08, z2 ], .048, .048));
    }
}

const trussMat = MAT.steel.clone();

trussMat.name = "Truss steel";

trussMat.color.setHex(1777178);

trussMat.metalness = .34;

trussMat.roughness = .66;

trussMat.emissive = new THREE.Color(132099);

trussMat.emissiveIntensity = 1;

const trussMesh = buildBars(trussBars, trussMat, false);

trussMesh.name = "Welded steel roof trusses";

trussGroup.add(trussMesh);

const roof = new THREE.Mesh(new THREE.PlaneGeometry(HALL.xMax - HALL.xMin, HALL.zMax - HALL.zMin), MAT.roofDeck);

roof.rotation.x = Math.PI / 2;

roof.position.set((HALL.xMin + HALL.xMax) / 2, HALL.roof, (HALL.zMin + HALL.zMax) / 2);

roof.receiveShadow = false;

trussGroup.add(roof);

const pipeMat = MAT.steelDull;

for (const [x, y, r] of [ [ -5.7, 8.32, .085 ], [ 11.6, 8.05, .115 ], [ 16.7, 8.7, .055 ] ]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(r, r, HALL.zMax - HALL.zMin, 10), pipeMat);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(x, y, (HALL.zMin + HALL.zMax) / 2);
    pipe.castShadow = false;
    pipe.receiveShadow = true;
    trussGroup.add(pipe);
}

for (let z = HALL.zMin + 3; z < HALL.zMax; z += 5.4) {
    metalRod(trussGroup, [ 11.6, 8.05, z ], [ 11.6, 10.08, z ], .026, MAT.steelDull);
    metalRod(trussGroup, [ -5.7, 8.32, z ], [ -5.7, 10.08, z ], .022, MAT.steelDull);
}

world.add(trussGroup);

const farWall = new THREE.Group;

farWall.name = "Far wall / loading bays";

world.add(farWall);

const BAYS = {
    centers: [ -12.9, -8, -3.1, 1.8, 6.7, 11.6, 16.5, 20.75 ],
    width: 4.25,
    openWidth: 3.95,
    openHeight: 4.72,
    headerY: 5.16,
    openIndex: 1
};

const farZ = HALL.zMin;

const farUpper = addBox(farWall, HALL.xMax - HALL.xMin, HALL.height - BAYS.headerY, .34, MAT.farHeader, (HALL.xMin + HALL.xMax) / 2, BAYS.headerY + (HALL.height - BAYS.headerY) / 2, farZ + .17, {
    cast: false
});

farUpper.name = "Far wall header";

farWall.add(planeMesh(HALL.xMax - HALL.xMin, 2.6, MAT.wallUpperDark, (HALL.xMin + HALL.xMax) / 2, 7.8, farZ + .001 + .35, 0, {
    receive: true
}));

const pierCenters = [];

for (let i = 0; i < BAYS.centers.length - 1; i++) {
    pierCenters.push((BAYS.centers[i] + BAYS.centers[i + 1]) / 2);
}

pierCenters.forEach(x => {
    addBox(farWall, .65, BAYS.headerY, .5, MAT.concrete, x, BAYS.headerY / 2, farZ + .25, {
        cast: false
    });
});

addBox(farWall, .7, BAYS.headerY, .5, MAT.concrete, HALL.xMin + .35, BAYS.headerY / 2, farZ + .25, {
    cast: false
});

addBox(farWall, .7, BAYS.headerY, .5, MAT.concrete, HALL.xMax - .35, BAYS.headerY / 2, farZ + .25, {
    cast: false
});

for (let i = 0; i < BAYS.centers.length; i++) {
    if (i === BAYS.openIndex) continue;
    addBox(farWall, BAYS.width, BAYS.headerY, .08, MAT.steelDull, BAYS.centers[i], BAYS.headerY / 2, farZ + .08, {
        cast: false
    });
}

for (const [i, x] of BAYS.centers.entries()) {
    addBox(farWall, BAYS.width + .6, .5, .55, MAT.steelDull, x, BAYS.headerY - .2, farZ + .4, {
        cast: false
    });
    addBox(farWall, .22, .34, .32, MAT.steel, x - BAYS.width / 2 - .29, BAYS.headerY - .22, farZ + .5, {
        cast: false
    });
    addBox(farWall, .22, .34, .32, MAT.steel, x + BAYS.width / 2 + .29, BAYS.headerY - .22, farZ + .5, {
        cast: false
    });
    if (i === BAYS.openIndex) continue;
    const doorMat = i % 3 === 0 ? MAT.rollDoorDark : i % 3 === 1 ? MAT.rollDoor : MAT.rollDoorWarm;
    const door = planeMesh(BAYS.width, BAYS.openHeight, doorMat, x, BAYS.openHeight / 2 + .03, farZ + .53, 0, {
        receive: true
    });
    door.name = `Closed roll-up door ${i + 1}`;
    farWall.add(door);
    for (const s of [ -1, 1 ]) {
        addBox(farWall, .12, BAYS.openHeight, .2, MAT.steel, x + s * (BAYS.width / 2 + .08), BAYS.openHeight / 2, farZ + .52, {
            cast: false
        });
    }
    for (let ry = 1; ry < 14; ry++) {
        addBox(farWall, BAYS.width - .1, .03, .045, MAT.doorRib, x, ry / 14 * BAYS.openHeight, farZ + .556, {
            cast: false,
            receive: true
        });
    }
    addBox(farWall, BAYS.width + .02, .09, .1, MAT.rubber, x, .05, farZ + .55, {
        cast: false
    });
    if (i === 3 || i === 6) {
        const paper = planeMesh(.32, .42, MAT.paper, x + .8, 1.55, farZ + .56, 0, {
            receive: true
        });
        paper.material = MAT.paper;
        farWall.add(paper);
    }
    if (i === 5) {
        metalRod(farWall, [ x + 1.3, BAYS.headerY - .2, farZ + .6 ], [ x + 1.3, 2.7, farZ + .6 ], .012, MAT.steelEdge);
    }
}

const openX = BAYS.centers[BAYS.openIndex];

for (const px of [ -5.55, 4.25, 9.15 ]) {
    addBox(farWall, .16, .8, .16, MAT.yellow, px, .4, farZ + .95, {
        cast: true
    });
    addBox(farWall, .18, .05, .18, MAT.rubber, px, .025, farZ + .95, {
        cast: false
    });
    addBox(farWall, .17, .07, .17, MAT.rubber, px, .68, farZ + .95, {
        cast: false
    });
}

for (const y of [ 3.35, 4.88 ]) {
    addBox(farWall, HALL.xMax - HALL.xMin - .2, .16, .22, MAT.steelDull, (HALL.xMin + HALL.xMax) / 2, y, farZ + .57, {
        cast: false
    });
}

for (const [yy, zz] of [ [ 7.7, .16 ], [ 8, .08 ] ]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(zz, zz, HALL.xMax - HALL.xMin - 1.2, 8), MAT.steelEdge);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set((HALL.xMin + HALL.xMax) / 2, yy, farZ + .46);
    pipe.castShadow = false;
    pipe.receiveShadow = true;
    farWall.add(pipe);
}

for (let x = HALL.xMin + 2; x < HALL.xMax - 1; x += 3.4) {
    addBox(farWall, .07, .26, .14, MAT.steelDull, x, 7.55, farZ + .44, {
        cast: false
    });
}

{
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, 1.15, 6), MAT.steelDull);
    wire.position.set(openX, 8.75, farZ + .4);
    farWall.add(wire);
    addBox(farWall, .3, .12, .3, MAT.steelDull, openX, 8.13, farZ + .4, {
        cast: false
    });
    addBox(farWall, .18, .045, .18, new THREE.MeshBasicMaterial({
        color: 4338974,
        toneMapped: false
    }), openX, 8.055, farZ + .4, {
        cast: false
    });
}

const corridor = new THREE.Group;

corridor.name = "Open dock corridor";

{
    addBox(corridor, BAYS.openWidth + .12, .08, 6.6, MAT.concreteDark, openX, .02, farZ - 3.25, {
        cast: false
    });
    addBox(corridor, BAYS.openWidth + .12, .1, 6.6, MAT.concreteDark, openX, 4.92, farZ - 3.25, {
        cast: false
    });
    addBox(corridor, .1, 4.9, 6.6, MAT.concreteDark, openX - BAYS.openWidth / 2 - .05, 2.45, farZ - 3.25, {
        cast: false
    });
    addBox(corridor, .1, 4.9, 6.6, MAT.concreteDark, openX + BAYS.openWidth / 2 + .05, 2.45, farZ - 3.25, {
        cast: false
    });
    const glowGeo = new THREE.PlaneGeometry(BAYS.openWidth - .5, BAYS.openHeight - .26);
    const doorGlowMat = new THREE.ShaderMaterial({
        name: "Far doorway light",
        uniforms: {
            uTime: {
                value: 0
            },
            uIntensity: {
                value: 1
            },
            uFlare: {
                value: 0
            }
        },
        vertexShader: `\n      varying vec2 vUv;\n      void main() {\n        vUv = uv;\n        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n      }\n    `,
        fragmentShader: `\n      uniform float uTime;\n      uniform float uIntensity;\n      uniform float uFlare;\n      varying vec2 vUv;\n      float hash(vec2 p) {\n        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);\n      }\n      float noise(vec2 p) {\n        vec2 i = floor(p); vec2 f = fract(p);\n        f = f*f*(3.0-2.0*f);\n        float a = hash(i);\n        float b = hash(i + vec2(1.0,0.0));\n        float c = hash(i + vec2(0.0,1.0));\n        float d = hash(i + vec2(1.0,1.0));\n        return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);\n      }\n      void main() {\n        vec2 uv = vUv;\n        // Diffuse daylight, brighter toward the top and at the threshold.\n        vec3 low = vec3(0.34, 0.40, 0.395);\n        vec3 high = vec3(1.42, 1.52, 1.47);\n        float h = smoothstep(0.0, 0.82, uv.y);\n        vec3 col = mix(low, high, h);\n        // Soft banks of atmospheric mist.\n        float n = noise(uv * vec2(5.0, 3.0) + vec2(0.0, uTime * 0.045));\n        col *= 0.86 + n * 0.26;\n        col += vec3(0.18, 0.21, 0.20) * smoothstep(0.65, 1.0, uv.y);\n        // Frame falloff keeps the opening from feeling like a flat cutout.\n        float edgeX = smoothstep(0.0, 0.075, uv.x) * smoothstep(1.0, 0.925, uv.x);\n        float edgeY = smoothstep(0.0, 0.035, uv.y) * smoothstep(1.0, 0.98, uv.y);\n        col *= edgeX * edgeY;\n        // A little haze / bloom energy on the flare.\n        col += vec3(0.5, 0.55, 0.52) * uFlare * (0.25 + 0.75 * h) * edgeX * edgeY;\n        gl_FragColor = vec4(col * uIntensity, 1.0);\n      }\n    `,
        toneMapped: false,
        fog: false,
        side: THREE.FrontSide
    });
    const dockWork = new THREE.PointLight(16756835, 5.5, 5.2, 2);
    dockWork.position.set(openX + 1.35, 1.05, farZ - 4.6);
    corridor.add(dockWork);
    const dockBulb = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 6), new THREE.MeshBasicMaterial({
        color: 16761210,
        toneMapped: false
    }));
    dockBulb.position.copy(dockWork.position);
    corridor.add(dockBulb);
    const glow = new THREE.Mesh(glowGeo, doorGlowMat);
    glow.position.set(openX, BAYS.openHeight / 2 + .01, farZ - 6.45);
    glow.name = "Daylight beyond the dock";
    corridor.add(glow);
    addBox(corridor, .18, BAYS.openHeight + .25, .7, MAT.steel, openX - BAYS.openWidth / 2 - .12, (BAYS.openHeight + .25) / 2, farZ + .24, {
        cast: true
    });
    addBox(corridor, .18, BAYS.openHeight + .25, .7, MAT.steel, openX + BAYS.openWidth / 2 + .12, (BAYS.openHeight + .25) / 2, farZ + .24, {
        cast: true
    });
    addBox(corridor, BAYS.openWidth + .52, .16, .7, MAT.steel, openX, BAYS.openHeight + .2, farZ + .24, {
        cast: true
    });
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(.21, .21, BAYS.openWidth - .2, 16), MAT.steelDull);
    drum.rotation.z = Math.PI / 2;
    drum.position.set(openX, BAYS.openHeight + .04, farZ + .3);
    drum.castShadow = true;
    corridor.add(drum);
    const shutterMat = new THREE.MeshBasicMaterial({
        color: 5525831,
        fog: true
    });
    const shutter = planeMesh(BAYS.openWidth - .16, .88, shutterMat, openX, BAYS.openHeight - .46, farZ + .46, 0, {
        receive: false
    });
    shutter.name = "Raised roller shutter";
    corridor.add(shutter);
    for (let ry = 0; ry < 6; ry++) {
        addBox(corridor, BAYS.openWidth - .2, .04, .035, MAT.doorRib, openX, BAYS.openHeight - .78 + ry * .14, farZ + .49, {
            cast: false
        });
    }
    addBox(corridor, BAYS.openWidth - .05, .075, .12, new THREE.MeshBasicMaterial({
        color: 7828068,
        fog: true
    }), openX, BAYS.openHeight - .9, farZ + .52, {
        cast: true
    });
    for (const s of [ -1, 1 ]) {
        const post = new THREE.Group;
        addBox(post, .16, .9, .16, MAT.yellow, openX + s * (BAYS.openWidth / 2 + .25), .46, farZ + .72, {
            cast: true
        });
        addBox(post, .2, .05, .2, MAT.rubber, openX + s * (BAYS.openWidth / 2 + .25), .03, farZ + .72, {
            cast: false
        });
        corridor.add(post);
    }
    for (const s of [ -1, 1 ]) {
        addBox(corridor, .3, .42, .18, MAT.rubber, openX + s * (BAYS.openWidth / 2 + .06), 1.25, farZ + .56, {
            cast: false
        });
    }
    const threshold = planeMesh(1.15, .05, new THREE.MeshBasicMaterial({
        color: 16761212,
        toneMapped: false,
        transparent: true,
        opacity: .5,
        fog: true,
        depthWrite: false
    }), openX + .55, .075, farZ + .58, 0, {
        receive: false
    });
    corridor.add(threshold);
    const dockMouthLight = new THREE.PointLight(16758901, 4, 5, 2);
    dockMouthLight.position.set(openX + .55, .7, farZ + .95);
    dockMouthLight.castShadow = false;
    corridor.add(dockMouthLight);
    metalRod(corridor, [ openX - BAYS.openWidth / 2 + .2, 2.62, farZ + .34 ], [ openX + BAYS.openWidth / 2 - .2, 2.62, farZ + .34 ], .018, MAT.steelDull);
    addBox(corridor, BAYS.openWidth - .35, .1, .18, MAT.steelDull, openX, .64, farZ - .8, {
        cast: false
    });
    for (const dx of [ -1.28, 1.12 ]) {
        addBox(corridor, .16, 4.75, .2, MAT.steel, openX + dx, 2.38, farZ - 3.1, {
            cast: true
        });
    }
    addBox(corridor, BAYS.openWidth - .2, .16, .22, MAT.steel, openX, 3.98, farZ - 3.1, {
        cast: true
    });
    const spill = planeMesh(BAYS.openWidth - .1, 4.4, new THREE.MeshBasicMaterial({
        color: 9675682,
        transparent: true,
        opacity: .12,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: true
    }), openX, .012, farZ - 2.2, 0, {
        receive: false
    });
    spill.rotation.x = -Math.PI / 2;
    corridor.add(spill);
    farWall.add(corridor);
    farWall.userData.doorGlowMat = doorGlowMat;
}

const doorGroup = new THREE.Group;

doorGroup.name = "Personnel door M-03";

doorGroup.position.set(0, 0, 0);

{
    const dz = -3.5;
    const wx = HALL.xMin + .035;
    addBox(doorGroup, .06, 2.62, 1.5, MAT.concreteDark, wx + .02, 1.31, dz, {
        cast: false
    });
    addBox(doorGroup, .16, 2.72, .12, MAT.steelEdge, wx + .11, 1.36, dz - .68, {
        cast: true
    });
    addBox(doorGroup, .16, 2.72, .12, MAT.steelEdge, wx + .11, 1.36, dz + .68, {
        cast: true
    });
    addBox(doorGroup, .16, .12, 1.48, MAT.steelEdge, wx + .11, 2.69, dz, {
        cast: true
    });
    const face = planeMesh(1.22, 2.45, MAT.door, wx + .1, 1.29, dz, Math.PI / 2, {
        receive: true
    });
    face.name = "Weatherbeaten steel door";
    doorGroup.add(face);
    addBox(doorGroup, .09, .075, .88, MAT.steelEdge, wx + .16, 1.12, dz - .05, {
        cast: false
    });
    addBox(doorGroup, .08, .24, .06, MAT.steelEdge, wx + .14, 1.05, dz + .35, {
        cast: false
    });
    addCylinder(doorGroup, .035, .095, MAT.steelEdge, wx + .2, .94, dz + .38, {
        rotX: Math.PI / 2,
        cast: false
    });
    addBox(doorGroup, .035, .36, .95, MAT.steelDull, wx + .09, .23, dz, {
        cast: false
    });
    for (const y of [ .45, 1.35, 2.2 ]) {
        addBox(doorGroup, .075, .14, .07, MAT.steelDull, wx + .105, y, dz + .57, {
            cast: false
        });
    }
    const paneMat = new THREE.MeshStandardMaterial({
        color: 1054229,
        metalness: .25,
        roughness: .18,
        transparent: true,
        opacity: .85
    });
    doorGroup.add(planeMesh(.58, .52, paneMat, wx + .115, 1.78, dz, Math.PI / 2, {
        receive: false
    }));
    for (let i = 0; i < 5; i++) {
        addBox(doorGroup, .015, .52, .013, MAT.steelDull, wx + .128, 1.78, dz - .25 + i * .125, {
            cast: false
        });
    }
    addBox(doorGroup, .12, .28, .19, MAT.steelDull, wx + .15, 1.32, dz + .92, {
        cast: false
    });
    addBox(doorGroup, .015, .13, .1, new THREE.MeshStandardMaterial({
        color: 1185044,
        emissive: 1453090,
        emissiveIntensity: .22,
        roughness: .4,
        metalness: .2
    }), wx + .212, 1.36, dz + .92, {
        cast: false
    });
    const label = planeMesh(.28, .34, new THREE.MeshBasicMaterial({
        map: bayLabelTx,
        color: 6249294,
        transparent: true,
        opacity: .55
    }), wx + .125, 2.24, dz + .86, Math.PI / 2, {
        receive: false
    });
    doorGroup.add(label);
    const hose = new THREE.Group;
    hose.name = "Fire hose reel";
    const redMat = new THREE.MeshStandardMaterial({
        color: 4332567,
        roughness: .72,
        metalness: .18
    });
    const reel = new THREE.Mesh(new THREE.TorusGeometry(.26, .055, 8, 20), redMat);
    reel.rotation.y = Math.PI / 2;
    reel.position.set(wx + .29, 1.05, dz - 1.45);
    reel.castShadow = true;
    hose.add(reel);
    const hub = addCylinder(hose, .11, .13, MAT.steelDull, wx + .29, 1.05, dz - 1.45, {
        rotZ: Math.PI / 2,
        cast: true
    });
    hub.rotation.z = Math.PI / 2;
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, 4.2, 8), redMat);
    pipe.position.set(HALL.xMin + .64, 2.1, dz - 1.65);
    pipe.castShadow = false;
    hose.add(pipe);
    addCylinder(hose, .043, .5, redMat, wx + .48, .33, dz - 1.45, {
        cast: false
    });
    doorGroup.add(hose);
}

world.add(doorGroup);

const bulkhead = new THREE.Group;

bulkhead.name = "Caged bulkhead lamp";

{
    const bx = HALL.xMin + .205;
    const bz = -2.25;
    const by = 3.12;
    addBox(bulkhead, .2, .3, .25, MAT.steelDull, bx, by, bz, {
        cast: true
    });
    addBox(bulkhead, .07, .045, .17, MAT.steelDull, bx + .08, by + .17, bz, {
        cast: false
    });
    const glassMat = new THREE.MeshBasicMaterial({
        color: 16765593,
        toneMapped: false
    });
    const lens = addBox(bulkhead, .025, .17, .14, glassMat, bx + .105, by - .025, bz, {
        cast: false
    });
    lens.name = "Bulkhead diffuser";
    for (let i = 0; i < 3; i++) {
        addBox(bulkhead, .012, .22, .011, MAT.steelDull, bx + .118, by - .015, bz - .08 + i * .08, {
            cast: false
        });
    }
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTx,
        color: 16762506,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: .18
    }));
    glow.scale.setScalar(.34);
    glow.position.set(bx + .16, by - .02, bz);
    bulkhead.add(glow);
    const lamp = new THREE.PointLight(16763023, 3, 6.5, 2);
    lamp.position.set(bx + .55, by - .25, bz);
    bulkhead.add(lamp);
}

world.add(bulkhead);

const rightLamp = new THREE.Group;

rightLamp.name = "Right wall emergency lamp";

{
    const rx = HALL.xMax - .22;
    const rz = -22.8;
    const ry = 4.15;
    addBox(rightLamp, .25, .28, .34, MAT.steelDull, rx - .1, ry, rz, {
        cast: true
    });
    addBox(rightLamp, .03, .13, .2, new THREE.MeshBasicMaterial({
        color: 9067055,
        toneMapped: false
    }), rx - .235, ry - .01, rz, {
        cast: false
    });
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTx,
        color: 16757871,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: .12
    }));
    glow.scale.setScalar(.25);
    glow.position.set(rx - .3, ry, rz);
    rightLamp.add(glow);
    const light = new THREE.SpotLight(16763024, 92, 19, .62, 1, 1.8);
    light.position.set(rx - .3, ry - .05, rz);
    light.target.position.set(6.5, 0, -21);
    light.castShadow = false;
    rightLamp.add(light);
    rightLamp.add(light.target);
}

world.add(rightLamp);

const rightBounce = new THREE.PointLight(9676973, 33, 22, 1.9);

rightBounce.position.set(14.4, 5.2, -14);

scene.add(rightBounce);

const columnRim = new THREE.PointLight(11058368, 28, 12, 2);

columnRim.position.set(10.2, 4.6, -21);

scene.add(columnRim);

const postFill = new THREE.SpotLight(16769722, .6, 5, .4, 1, 2);

postFill.position.set(-10.55, 2.2, 7);

postFill.target.position.set(-11.78, 1.15, 5.7);

postFill.castShadow = false;

scene.add(postFill, postFill.target);

const roomBounce = new THREE.DirectionalLight(9348007, 1.15);

roomBounce.position.set(-5, 5.2, 8);

roomBounce.target.position.set(5, 3.2, -20);

scene.add(roomBounce, roomBounce.target);

const farRightWash = new THREE.PointLight(10137266, 8, 12, 1.9);

farRightWash.position.set(13.2, 4.2, -28.5);

scene.add(farRightWash);

const sideWorkLight = new THREE.PointLight(16765600, 1.1, 5.5, 2);

sideWorkLight.position.set(HALL.xMin + 1.6, 3, 6.4);

scene.add(sideWorkLight);

const safetyColumn = new THREE.Group;

safetyColumn.name = "Yellow safety column";

{
    const g = new THREE.Group;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.17, .185, 2.3, 36, 6), MAT.safetyPost);
    body.position.y = 1.195;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);
    const topCap = new THREE.Mesh(new THREE.CylinderGeometry(.19, .178, .1, 32, 1, false), MAT.steelDull);
    topCap.position.y = 2.39;
    topCap.castShadow = true;
    g.add(topCap);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(.172, .177, .05, 32), MAT.steelDull);
    collar.position.y = .17;
    g.add(collar);
    const baseRing = new THREE.Mesh(new THREE.CylinderGeometry(.215, .235, .12, 28), MAT.rubber);
    baseRing.position.y = .06;
    baseRing.receiveShadow = true;
    baseRing.castShadow = true;
    g.add(baseRing);
    const plate = addBox(g, .46, .035, .46, MAT.steelDull, 0, .018, 0, {
        cast: false
    });
    plate.rotation.y = .36;
    for (let i = 0; i < 7; i++) {
        const a = rng() * Math.PI * 2;
        const r = .22 + rng() * .12;
        const chip = new THREE.Mesh(new THREE.DodecahedronGeometry(.016 + rng() * .035, 0), rng() < .72 ? MAT.rubber : MAT.paper);
        chip.position.set(Math.cos(a) * r, .02 + rng() * .04, Math.sin(a) * r);
        chip.scale.y = .45;
        chip.rotation.set(rng(), rng() * 6.28, rng());
        chip.castShadow = true;
        g.add(chip);
    }
    g.position.set(-11.68, 0, 5.7);
    safetyColumn.add(g);
}

world.add(safetyColumn);

const foregroundJamb = new THREE.Group;

foregroundJamb.name = "Near jamb";

{
    const edgeMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(1.36, 1.32, 1.2),
        map: jambEdgeTx,
        toneMapped: false,
        fog: false
    });
    const edge = planeMesh(.15, 7, edgeMat, -11.32, 3.44, 7.3, 0, {
        receive: false
    });
    edge.name = "Pale near jamb edge";
    foregroundJamb.add(edge);
    addBox(foregroundJamb, .035, 7, .22, MAT.steel, -11.405, 3.4, 7.16, {
        cast: false
    });
}

world.add(foregroundJamb);

const jambFill = new THREE.PointLight(16773858, .8, 3.5, 2);

jambFill.position.set(-10.85, 2, 8.1);

scene.add(jambFill);

const nearDarkColumn = createIBeamColumn(-12.36, 5, 8.9, {
    depthX: .25,
    widthZ: .4,
    mat: MAT.steel,
    name: "Near black column"
});

world.add(nearDarkColumn);

{
    const exitGroup = new THREE.Group;
    const exitX = HALL.xMin + .13;
    const sign = planeMesh(.56, .28, new THREE.MeshBasicMaterial({
        map: exitSignTx,
        color: 10235170,
        transparent: false
    }), exitX + .16, 2.55, -28.4, Math.PI / 2, {
        receive: false
    });
    exitGroup.add(sign);
    addBox(exitGroup, .12, .36, .68, MAT.steelDull, exitX + .06, 2.55, -28.4, {
        cast: false
    });
    const exitLight = new THREE.PointLight(16727326, 2.2, 3.2, 2);
    exitLight.position.set(exitX + .4, 2.55, -28.4);
    exitGroup.add(exitLight);
    world.add(exitGroup);
}

{
    const cab = new THREE.Group;
    const cabMat = new THREE.MeshStandardMaterial({
        color: 5725268,
        metalness: .5,
        roughness: .58
    });
    addBox(cab, .18, .92, .68, cabMat, HALL.xMin + .14, 1.52, -8.15, {
        cast: true
    });
    addBox(cab, .02, .74, .52, MAT.steelDull, HALL.xMin + .24, 1.52, -8.15, {
        cast: false
    });
    addBox(cab, .045, .06, .06, MAT.steelEdge, HALL.xMin + .25, 1.56, -8.43, {
        cast: false
    });
    world.add(cab);
}

const fixtureData = [];

const fixtures = new THREE.Group;

fixtures.name = "Suspended service lamps";

function makeFixture(x, y, z, withLight) {
    const g = new THREE.Group;
    g.position.set(x, y, z);
    const hang = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, HALL.roof - y, 6), MAT.steelDull);
    hang.position.y = (HALL.roof - y) / 2;
    hang.castShadow = false;
    g.add(hang);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(.12, .38, .24, 14, 1, true), MAT.steelDull);
    shade.position.y = .04;
    shade.castShadow = true;
    shade.material.side = THREE.DoubleSide;
    g.add(shade);
    const bulbMat = new THREE.MeshBasicMaterial({
        color: glowYellow.clone().multiplyScalar(1.4)
    });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.085, 12, 8), bulbMat);
    bulb.position.y = -.06;
    g.add(bulb);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(.3, 20), new THREE.MeshBasicMaterial({
        color: 789515,
        transparent: true,
        opacity: .85,
        side: THREE.DoubleSide
    }));
    disc.rotation.x = Math.PI / 2;
    disc.position.y = .145;
    g.add(disc);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTx,
        color: 16766106,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: .38
    }));
    glow.scale.set(.75, .75, .75);
    glow.position.y = -.05;
    g.add(glow);
    const light = withLight ? new THREE.PointLight(16764820, 1, 18, 2) : null;
    if (light) {
        light.position.y = -.08;
        g.add(light);
    }
    fixtures.add(g);
    const data = {
        group: g,
        bulbMat: bulbMat,
        glow: glow,
        light: light,
        base: withLight ? 26 : 0,
        seed: rng() * 10
    };
    fixtureData.push(data);
    return g;
}

makeFixture(-2.4, 7.35, -6.8, true);

makeFixture(1.8, 7.6, -12.4, true);

makeFixture(-3.2, 7.45, -17.5, true);

makeFixture(5, 7.75, -22.5, true);

makeFixture(-5.4, 7.2, -28.8, true);

fixtures.userData.noMerge = true;

world.add(fixtures);

const debris = new THREE.Group;

debris.name = "Floor debris";

{
    const paperGeo = new THREE.PlaneGeometry(1, 1);
    const chunkGeo = new THREE.DodecahedronGeometry(1, 0);
    const stripGeo = new THREE.BoxGeometry(1, 1, 1);
    const scrapGeo = (() => {
        const g = new THREE.BufferGeometry;
        const verts = [];
        const n = 7;
        for (let i = 0; i < n; i++) {
            const a = i / n * Math.PI * 2;
            const r = .55 + rng() * .45;
            verts.push(Math.cos(a) * r, Math.sin(a) * r, 0);
        }
        const idx = [];
        for (let i = 1; i < n - 1; i++) idx.push(0, i, i + 1);
        g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
        g.setIndex(idx);
        g.computeVertexNormals();
        const uv = [];
        for (let i = 0; i < n; i++) uv.push(.5 + Math.cos(i / n * Math.PI * 2) * .5, .5 + Math.sin(i / n * Math.PI * 2) * .5);
        g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
        return g;
    })();
    for (let i = 0; i < 28; i++) {
        const m = new THREE.Mesh(scrapGeo, i % 8 === 0 ? MAT.plastic : MAT.paper);
        m.rotation.x = -Math.PI / 2;
        m.rotation.z = rng() * Math.PI;
        m.position.set(-13.3 + rng() * 10.2, .006 + rng() * .006, -7 + rng() * 12);
        const s = .06 + rng() * .16;
        m.scale.set(s, s * (.35 + rng() * .7), 1);
        m.receiveShadow = true;
        m.castShadow = false;
        debris.add(m);
    }
    for (let i = 0; i < 52; i++) {
        const m = new THREE.Mesh(chunkGeo, MAT.concreteDark);
        m.position.set(-13.5 + rng() * 14, .008 + rng() * .02, -13 + rng() * 19);
        const s = .012 + rng() * .06;
        m.scale.set(s, s * (.5 + rng()), s * (.6 + rng() * .8));
        m.rotation.set(rng() * 3, rng() * 3, rng() * 3);
        m.receiveShadow = true;
        m.castShadow = true;
        debris.add(m);
    }
    for (let i = 0; i < 18; i++) {
        const m = new THREE.Mesh(stripGeo, i % 3 === 0 ? MAT.plastic : MAT.paper);
        m.position.set(-12.6 + rng() * 10.5, .004, -9 + rng() * 14.5);
        m.rotation.x = 0;
        m.rotation.y = rng() * Math.PI;
        m.rotation.z = (rng() - .5) * .1;
        m.scale.set(.018 + rng() * .035, .003, .2 + rng() * .85);
        m.receiveShadow = true;
        debris.add(m);
    }
    const closePiece = new THREE.Mesh(new THREE.DodecahedronGeometry(.085, 0), MAT.plastic);
    closePiece.position.set(-10.35, .03, 1.9);
    closePiece.scale.set(1.1, .3, .7);
    closePiece.rotation.set(.2, .5, .1);
    closePiece.castShadow = true;
    closePiece.receiveShadow = true;
    debris.add(closePiece);
    const can = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .12, 12), MAT.steelEdge);
    can.rotation.z = Math.PI / 2;
    can.rotation.y = .6;
    can.position.set(-9.8, .205, 4.2);
    can.scale.set(.2, 2.3, .2);
    can.castShadow = true;
    debris.add(can);
}

world.add(debris);

const hemi = new THREE.HemisphereLight(7306624, 920843, .245);

scene.add(hemi);

const ambient = new THREE.AmbientLight(1647140, .13);

scene.add(ambient);

const farDoorLight = new THREE.PointLight(13230049, 8, 6.2, 1.85);

farDoorLight.position.set(openX, 3.1, farZ - 3.5);

scene.add(farDoorLight);

const doorSpill = new THREE.SpotLight(12374739, 7, 13, .55, 1, 2);

doorSpill.position.set(openX, 2.15, farZ + .4);

doorSpill.target.position.set(openX - .9, 0, farZ + 6);

doorSpill.castShadow = false;

scene.add(doorSpill, doorSpill.target);

const farFaceLight = new THREE.PointLight(14213597, 2.5, 6, 1.8);

farFaceLight.position.set(openX, 4.2, farZ + 1.4);

scene.add(farFaceLight);

const farSpill = new THREE.SpotLight(12441047, 6, 42, .4, 1, 1.75);

farSpill.position.set(openX, 4.5, farZ - 1.3);

farSpill.target.position.set(openX - 1.4, 0, farZ + 31);

farSpill.castShadow = false;

scene.add(farSpill, farSpill.target);

const flashlight = new THREE.SpotLight(16773858, 14e4, 21, .44, .85, 2.05);

flashlight.position.copy(camera.position);

flashlight.castShadow = true;

flashlight.shadow.mapSize.set(1024, 1024);

flashlight.shadow.radius = 2.2;

flashlight.map = torchCookie;

flashlight.shadow.camera.near = .45;

flashlight.shadow.camera.far = 44;

flashlight.shadow.bias = -2e-4;

flashlight.shadow.normalBias = .035;

flashlight.target.position.set(-10.6, 0, 5.2);

scene.add(flashlight, flashlight.target);

const torchSpill = new THREE.SpotLight(14868179, 230, 21, 1.1, 1, 1.44);

torchSpill.position.copy(camera.position);

torchSpill.target.position.set(-9.7, 0, 5);

torchSpill.castShadow = false;

scene.add(torchSpill, torchSpill.target);

const torchMid = new THREE.SpotLight(16773604, 1400, 23, .82, 1, 1.35);

torchMid.position.copy(camera.position);

torchMid.target.position.set(-10, 0, 4.8);

torchMid.castShadow = false;

torchMid.map = torchCookie;

scene.add(torchMid, torchMid.target);

const nearBounce = new THREE.SpotLight(14604491, 30, 11, .9, 1, 1.4);

nearBounce.position.copy(camera.position);

nearBounce.target.position.set(-12.2, .1, 5);

nearBounce.castShadow = false;

scene.add(nearBounce, nearBounce.target);

const torchRight = new THREE.SpotLight(16772316, 60, 12, 1, 1, 1.5);

torchRight.position.copy(camera.position);

torchRight.target.position.set(-8, 0, 4.2);

torchRight.castShadow = false;

scene.add(torchRight, torchRight.target);

const torchNear = new THREE.SpotLight(16773085, 0, 13, 1.15, 1, 1.5);

torchNear.castShadow = false;

scene.add(torchNear, torchNear.target);

const floorBounce = new THREE.SpotLight(14275269, 285, 18, .92, 1, 1.6);

floorBounce.position.set(-9.5, 8.2, 4);

floorBounce.target.position.set(-9.5, 0, 2);

floorBounce.castShadow = false;

scene.add(floorBounce, floorBounce.target);

const farFloorBounce = new THREE.SpotLight(12567744, 60, 14, 1.15, 1, 1.6);

farFloorBounce.position.set(-6, 6.6, -8);

farFloorBounce.target.position.set(-6.5, 0, -7.5);

farFloorBounce.castShadow = false;

scene.add(farFloorBounce, farFloorBounce.target);

const farFill = new THREE.DirectionalLight(7703440, .07);

farFill.position.set(-7, 8, -44);

farFill.target.position.set(0, 0, 5);

scene.add(farFill, farFill.target);

const underFill = new THREE.PointLight(8886170, 28, 37, 1.7);

underFill.position.set(-2.5, -3.5, -12);

scene.add(underFill);

const underGlow = new THREE.DirectionalLight(10856866, 7.2);

underGlow.position.set(-1, -12, 0);

underGlow.target.position.set(-1, 12, 0);

scene.add(underGlow, underGlow.target);

const farWallWash = new THREE.DirectionalLight(10728116, .92);

farWallWash.position.set(-2, 4.4, 18);

farWallWash.target.position.set(-2, 3.8, farZ);

scene.add(farWallWash, farWallWash.target);

function addHighWallLamp(z, targetZ, intensity) {
    const g = new THREE.Group;
    g.name = "High wall washer";
    const bx = HALL.xMin + .46;
    addBox(g, .26, .22, .46, MAT.steelDull, bx, 7.72, z, {
        cast: true
    });
    addBox(g, .03, .13, .3, new THREE.MeshBasicMaterial({
        color: 10464938,
        toneMapped: false
    }), bx + .145, 7.68, z, {
        cast: false
    });
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTx,
        color: 12899535,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: .14
    }));
    glow.scale.setScalar(.5);
    glow.position.set(bx + .2, 7.63, z);
    g.add(glow);
    const light = new THREE.SpotLight(11123128, intensity, 46, .52, 1, 1.36);
    light.name = "High wall washer light";
    light.position.set(bx + .28, 7.7, z);
    light.target.position.set(HALL.xMin + .1, 4.7, targetZ);
    light.castShadow = false;
    g.add(light, light.target);
    world.add(g);
    return light;
}

addHighWallLamp(4.2, -17, 112);

addHighWallLamp(-15.5, -38, 58);

const workLampMat = new THREE.MeshStandardMaterial({
    color: 3814179,
    emissive: 16761723,
    emissiveIntensity: .22,
    roughness: .6
});

const workLamp = new THREE.Group;

addBox(workLamp, .22, .55, .16, MAT.steelDull, HALL.xMin + .32, 2.35, -14.2, {
    cast: true
});

const lampGlass = addBox(workLamp, .1, .36, .03, workLampMat, HALL.xMin + .46, 2.35, -14.2, {
    cast: false
});

world.add(workLamp);

const workLampGlow = new THREE.PointLight(16761723, 5.5, 8, 2);

workLampGlow.position.set(HALL.xMin + .62, 2.28, -14.2);

scene.add(workLampGlow);

function mergeStaticWorld(root) {
    root.updateMatrixWorld(true);
    const groups = new Map;
    const originals = [];
    root.traverse(obj => {
        if (!obj.isMesh || obj.isInstancedMesh) return;
        if (!obj.material || Array.isArray(obj.material)) return;
        if (!(obj.material.isMeshStandardMaterial || obj.material.isMeshBasicMaterial)) return;
        if (obj.material.transparent) return;
        let parent = obj.parent;
        while (parent) {
            if (parent.userData && parent.userData.noMerge) return;
            parent = parent.parent;
        }
        const key = `${obj.material.uuid}|${obj.castShadow ? 1 : 0}|${obj.receiveShadow ? 1 : 0}`;
        if (!groups.has(key)) {
            groups.set(key, {
                material: obj.material,
                cast: obj.castShadow,
                receive: obj.receiveShadow,
                geometries: [],
                meshes: []
            });
        }
        const g = groups.get(key);
        const geo = obj.geometry.index ? obj.geometry.toNonIndexed() : obj.geometry.clone();
        geo.applyMatrix4(obj.matrixWorld);
        g.geometries.push(geo);
        g.meshes.push(obj);
        originals.push(obj);
    });
    let mergedCount = 0;
    for (const group of groups.values()) {
        if (group.geometries.length < 2) {
            group.geometries.forEach(g => g.dispose());
            continue;
        }
        const merged = mergeGeometries(group.geometries, false);
        group.geometries.forEach(g => g.dispose());
        if (!merged) {
            console.warn("Static batch skipped for", group.material.name || group.material.type);
            continue;
        }
        merged.computeBoundingSphere();
        const mesh = new THREE.Mesh(merged, group.material);
        mesh.name = `Batched ${group.material.name || group.material.type}`;
        mesh.castShadow = group.cast;
        mesh.receiveShadow = group.receive;
        mesh.frustumCulled = false;
        for (const original of group.meshes) {
            if (original.parent) original.parent.remove(original);
        }
        root.add(mesh);
        mergedCount++;
    }
    const empties = [];
    root.traverse(obj => {
        if (obj !== root && obj.isGroup && obj.children.length === 0) empties.push(obj);
    });
    for (const empty of empties) empty.parent.remove(empty);
    return mergedCount;
}

mergeStaticWorld(world);

const dustCount = 520;

const dustPositions = new Float32Array(dustCount * 3);

const dustSeeds = new Float32Array(dustCount);

const dustSizes = new Float32Array(dustCount);

for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3] = -14 + rng() * 22;
    dustPositions[i * 3 + 1] = .16 + Math.pow(rng(), 1.7) * 6.7;
    dustPositions[i * 3 + 2] = -22 + rng() * 32;
    dustSeeds[i] = rng() * 100;
    dustSizes[i] = .34 + Math.pow(rng(), 2.4) * 2.2;
}

const dustGeo = new THREE.BufferGeometry;

dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));

dustGeo.setAttribute("aSeed", new THREE.BufferAttribute(dustSeeds, 1));

dustGeo.setAttribute("aSize", new THREE.BufferAttribute(dustSizes, 1));

const dustMat = new THREE.ShaderMaterial({
    name: "Torch-lit air dust",
    uniforms: {
        uTime: {
            value: 0
        },
        uBeamPos: {
            value: new THREE.Vector3
        },
        uBeamDir: {
            value: new THREE.Vector3(0, -.1, -1)
        },
        uBeamCos: {
            value: .8
        },
        uOpacity: {
            value: .38
        },
        uPixelRatio: {
            value: renderer.getPixelRatio()
        },
        uTurbulence: {
            value: 0
        },
        uTexture: {
            value: dustTx
        },
        uColor: {
            value: new THREE.Color(16771528)
        }
    },
    vertexShader: `\n    uniform float uTime;\n    uniform vec3 uBeamPos;\n    uniform vec3 uBeamDir;\n    uniform float uBeamCos;\n    uniform float uTurbulence;\n    uniform float uPixelRatio;\n    attribute float aSeed;\n    attribute float aSize;\n    varying float vGlow;\n    varying float vTwinkle;\n    varying float vDistance;\n    varying float vCore;\n    void main() {\n      vec3 p = position;\n      float t = uTime * 0.14;\n      p.x += sin(t * 1.31 + aSeed * 2.17) * (0.085 + uTurbulence * 0.16);\n      p.y += sin(t * 0.83 + aSeed * 3.91) * 0.065 + sin(uTime * 0.13 + aSeed) * 0.035;\n      p.z += cos(t * 1.07 + aSeed * 1.73) * (0.11 + uTurbulence * 0.2);\n\n      vec4 mv = modelViewMatrix * vec4(p, 1.0);\n      vec4 worldPos = modelMatrix * vec4(p, 1.0);\n      vec3 toP = worldPos.xyz - uBeamPos;\n      float dist = length(toP);\n      float angleCos = dot(normalize(toP + vec3(0.0001)), uBeamDir);\n      float beam = smoothstep(uBeamCos, 0.985, angleCos);\n      float falloff = 1.0 / (1.0 + dist * dist * 0.012);\n      // ambient faint glints outside the cone keep the air alive\n      vGlow = (0.008 + beam * 0.85 * falloff) * (0.55 + 0.45 * sin(aSeed * 7.3));\n      vCore = beam;\n      vTwinkle = 0.64 + 0.36 * sin(uTime * (0.55 + fract(aSeed) * 1.1) + aSeed * 9.0);\n      vDistance = dist;\n      gl_Position = projectionMatrix * mv;\n      gl_PointSize = clamp(aSize * 21.0 / max(1.0, -mv.z), 0.8, 5.0) * uPixelRatio;\n    }\n  `,
    fragmentShader: `\n    uniform vec3 uColor;\n    uniform float uOpacity;\n    uniform sampler2D uTexture;\n    varying float vGlow;\n    varying float vTwinkle;\n    varying float vDistance;\n    varying float vCore;\n    void main() {\n      vec2 uv = gl_PointCoord - 0.5;\n      float d = length(uv);\n      if (d > 0.5) discard;\n      float soft = smoothstep(0.5, 0.02, d);\n      float halo = smoothstep(0.48, 0.18, d) * 0.35;\n      float alpha = (soft * 0.65 + halo) * vGlow * vTwinkle * uOpacity;\n      // Motes very close to the lens are out of focus and dimmer.\n      alpha *= smoothstep(0.6, 2.4, vDistance);\n      if (alpha < 0.0015) discard;\n      vec3 tint = mix(uColor, vec3(1.0, 0.96, 0.85), vCore * 0.25);\n      gl_FragColor = vec4(tint, alpha);\n    }\n  `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    fog: false
});

const dust = new THREE.Points(dustGeo, dustMat);

dust.name = "Suspended dust";

dust.frustumCulled = false;

scene.add(dust);

const bokehCount = 42;

const bokehPositions = new Float32Array(bokehCount * 3);

for (let i = 0; i < bokehCount; i++) {
    bokehPositions[i * 3] = -12.5 + rng() * 10;
    bokehPositions[i * 3 + 1] = .2 + rng() * 3;
    bokehPositions[i * 3 + 2] = -1 + rng() * 10;
}

const bokehGeo = new THREE.BufferGeometry;

bokehGeo.setAttribute("position", new THREE.BufferAttribute(bokehPositions, 3));

const bokehMat = new THREE.PointsMaterial({
    map: dustTx,
    color: 16770495,
    size: .02,
    sizeAttenuation: true,
    transparent: true,
    opacity: .055,
    alphaTest: .01,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false
});

const bokeh = new THREE.Points(bokehGeo, bokehMat);

bokeh.name = "Near-lens dust";

scene.add(bokeh);

const renderTarget = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    samples: 0
});

const composer = new EffectComposer(renderer, renderTarget);

composer.setPixelRatio(renderer.getPixelRatio());

composer.setSize(window.innerWidth, window.innerHeight);

const renderPass = new RenderPass(scene, camera);

composer.addPass(renderPass);

const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth * .5, window.innerHeight * .5), .38, .66, .86);

bloom.threshold = 1.12;

bloom.strength = .15;

bloom.radius = .58;

composer.addPass(bloom);

const outputPass = new OutputPass;

composer.addPass(outputPass);

const FilmShader = {
    name: "FilmStillShader",
    uniforms: {
        tDiffuse: {
            value: null
        },
        uTime: {
            value: 0
        },
        uGrain: {
            value: .115
        },
        uVignette: {
            value: .54
        },
        uFlare: {
            value: 0
        },
        uResolution: {
            value: new THREE.Vector2(window.innerWidth, window.innerHeight)
        }
    },
    vertexShader: `\n    varying vec2 vUv;\n    void main() {\n      vUv = uv;\n      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n    }\n  `,
    fragmentShader: `\n    uniform sampler2D tDiffuse;\n    uniform float uTime;\n    uniform float uGrain;\n    uniform float uVignette;\n    uniform float uFlare;\n    uniform vec2 uResolution;\n    varying vec2 vUv;\n\n    float hash12(vec2 p) {\n      vec3 p3 = fract(vec3(p.xyx) * 0.1031);\n      p3 += dot(p3, p3.yzx + 33.33);\n      return fract((p3.x + p3.y) * p3.z);\n    }\n\n    void main() {\n      vec2 uv = vUv;\n      // Very slight lateral colour fringing at the edge of the lens.\n      vec2 fromCenter = uv - 0.5;\n      float fringe = 0.00025 + length(fromCenter) * 0.0010;\n      float r = texture2D(tDiffuse, uv + fromCenter * fringe).r;\n      float g = texture2D(tDiffuse, uv).g;\n      float b = texture2D(tDiffuse, uv - fromCenter * fringe).b;\n      vec3 col = vec3(r, g, b);\n\n      // Grading: cool, slightly green shadowed metal; amber high notes.\n      float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));\n      col = mix(col, col * vec3(0.91, 1.01, 1.035), smoothstep(0.26, 0.0, lum) * 0.72);\n      col = mix(col, col * vec3(1.055, 1.012, 0.91), smoothstep(0.24, 0.95, lum) * 0.42);\n      float gray = dot(col, vec3(0.2126, 0.7152, 0.0722));\n      col = mix(vec3(gray), col, 1.06);\n      col = max(col, 0.0);\n      // Gentle filmic S-curve: keep the mids dirty, let the torch clip.\n      col = mix(col, smoothstep(0.0, 1.0, col), 0.68);\n      // A very slight film-black lift keeps the shadows from clipping.\n      col = col * 0.988 + vec3(0.011, 0.013, 0.0135) * (1.0 - smoothstep(0.0, 0.32, lum));\n\n      // Uneven, soft lens vignette.\n      vec2 q = (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);\n      float vign = 1.0 - smoothstep(0.24, 0.92, length(q) * 1.22);\n      vign = pow(max(vign, 0.0), 1.15);\n      // The white threshold frame at the left is a lens-edge highlight:\n      // let that narrow strip survive the vignette while the rest of the\n      // frame keeps its full falloff.\n      float edgeSpare = (1.0 - smoothstep(0.050, 0.090, uv.x))\n        * smoothstep(0.0, 0.14, uv.y)\n        * mix(0.70, 1.0, 1.0 - smoothstep(0.70, 1.0, uv.y));\n      float vigAmt = uVignette * mix(1.0, 0.12, edgeSpare);\n      col *= mix(1.0, vign, vigAmt);\n      // Film base fog: the gate never renders a true zero, so the blacks\n      // stay alive under the grain instead of clipping flat.\n      col = col * 0.982 + vec3(0.0105, 0.0115, 0.0120);\n\n      // A breath of veiling glare at the far doorway, strongest on flare.\n      vec2 doorGlowCenter = vec2(0.458, 0.505);\n      float glare = smoothstep(0.16, 0.0, distance(uv, doorGlowCenter));\n      col += vec3(0.036, 0.043, 0.043) * glare * (1.0 + uFlare * 2.5);\n\n      // Film grain: two frequencies, more visible in the shadow tones.\n      vec2 px = gl_FragCoord.xy;\n      float t = uTime;\n      float n1 = hash12(px + vec2(t * 37.0, -t * 11.0));\n      float n2 = hash12(px * 0.47 + vec2(-t * 17.0, t * 29.0));\n      float n3 = hash12(floor(px * 0.53) + vec2(t * 11.0, t * 6.0));\n      float grain = (n1 - 0.5) * 0.52 + (n2 - 0.5) * 0.28 + (n3 - 0.5) * 0.34;\n      float grainWeight = 0.46 + 1.05 * (1.0 - smoothstep(0.0, 0.58, lum));\n      col += grain * uGrain * grainWeight;\n      col += (n1 - 0.5) * uGrain * 0.2 * smoothstep(0.2, 0.9, lum);\n\n      // Very faint film weave and gate speckle.\n      float dust = step(0.99962, hash12(floor(px * 0.51) + floor(t * 3.0) * 57.0));\n      col += dust * 0.13 * vec3(0.9, 0.85, 0.72);\n\n      // A trace of cool base fog in the deepest cells of the frame.\n      col = max(col, vec3(0.0105, 0.0125, 0.0145));\n      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);\n    }\n  `
};

const filmPass = new ShaderPass(FilmShader);

filmPass.renderToScreen = true;

composer.addPass(filmPass);

const controls = new OrbitControls(camera, renderer.domElement);

controls.target.copy(camera.position).add(homeDir.clone().multiplyScalar(26));

controls.enableDamping = true;

controls.dampingFactor = .055;

controls.enablePan = false;

controls.rotateSpeed = .36;

controls.zoomSpeed = .62;

controls.minDistance = 1.8;

controls.maxDistance = 27;

controls.minAzimuthAngle = -.26;

controls.maxAzimuthAngle = 2.1;

controls.minPolarAngle = .4;

controls.maxPolarAngle = Math.PI * .53;

controls.update();

const pointer = new THREE.Vector2(0, 0);

const pointerSmooth = new THREE.Vector2(0, 0);

let pointerActive = false;

let dragging = false;

let flashFlicker = 1;

let lastPointerUpdate = 0;

const reticle = document.getElementById("reticle");

const flareButton = document.getElementById("flare");

const statusEl = document.getElementById("status");

function setPointerFromEvent(e) {
    if (CAPTURE) return;
    if (e.pointerType === "touch") return;
    pointer.x = e.clientX / window.innerWidth * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight * 2 - 1);
    pointerActive = true;
    lastPointerUpdate = performance.now();
    if (reticle) {
        reticle.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
        reticle.classList.add("on");
    }
    document.body.classList.add("pointer-live");
}

window.addEventListener("pointermove", e => {
    setPointerFromEvent(e);
}, {
    passive: true
});

window.addEventListener("pointerdown", e => {
    if (e.button === 0) dragging = true;
    if (reticle) reticle.classList.add("pressed");
}, {
    passive: true
});

window.addEventListener("pointerup", () => {
    dragging = false;
    if (reticle) reticle.classList.remove("pressed");
}, {
    passive: true
});

window.addEventListener("pointerleave", () => {
    pointerActive = false;
    if (reticle) reticle.classList.remove("on");
}, {
    passive: true
});

let eventStart = -Infinity;

let eventActive = false;

let eventEndedAt = 0;

function triggerEvent() {
    if (eventActive) return;
    eventActive = true;
    eventStart = performance.now() / 1e3;
    const body = document.body;
    body.classList.add("disturbance");
    if (flareButton) flareButton.classList.add("active");
    if (statusEl) statusEl.textContent = "UNSTABLE";
}

function endEvent() {
    eventActive = false;
    eventEndedAt = performance.now() / 1e3;
    if (flareButton) flareButton.classList.remove("active");
    if (statusEl) statusEl.textContent = "STILL";
    document.body.classList.remove("disturbance");
}

function resetView() {
    controls.enableDamping = false;
    controls.update();
    camera.position.copy(CAMERA_HOME);
    camera.lookAt(LOOK_FAR);
    controls.target.copy(CAMERA_HOME).add(homeDir.clone().multiplyScalar(26));
    controls.update();
    controls.enableDamping = true;
    pointer.set(0, 0);
    pointerSmooth.set(0, 0);
}

if (flareButton) {
    flareButton.addEventListener("click", e => {
        e.preventDefault();
        triggerEvent();
    });
}

window.addEventListener("keydown", e => {
    if (e.repeat) return;
    if (e.code === "KeyF" || e.code === "Space") {
        e.preventDefault();
        triggerEvent();
    }
    if (e.code === "KeyR" || e.code === "Home") {
        resetView();
    }
    if (e.code === "KeyH") {
        document.body.classList.toggle("ui-hidden");
    }
});

const clock = new THREE.Clock;

let elapsed = STILL ? STILL_TIME : 0;

let frameCount = 0;

let fpsAccum = 0;

let fpsFrames = 0;

let fps = 0;

let readySent = false;

let lastTimeMs = performance.now();

let paused = false;

let rafId = null;

const aimEuler = new THREE.Euler(0, 0, 0, "YXZ");

const aimDir = new THREE.Vector3(0, 0, -1);

const flashPos = new THREE.Vector3;

const flashTarget = new THREE.Vector3;

const tempColor = new THREE.Color;

function updateTorch(dt) {
    const ease = 1 - Math.exp(-dt * 8.5);
    pointerSmooth.lerp(pointer, ease);
    camera.updateMatrixWorld();
    aimEuler.setFromQuaternion(camera.quaternion, "YXZ");
    const handheldX = Math.sin(elapsed * .83) * .01 + Math.sin(elapsed * 2.13) * .0035;
    const handheldY = Math.cos(elapsed * .61) * .008 + Math.sin(elapsed * 1.71) * .003;
    const pitch = -.21 + pointerSmooth.y * .23 + handheldX + (eventActive ? Math.sin(elapsed * 47) * .0025 : 0);
    const yaw = -pointerSmooth.x * .34 + handheldY;
    aimEuler.x += pitch;
    aimEuler.y += yaw;
    aimEuler.z = 0;
    aimDir.set(0, 0, -1).applyEuler(aimEuler);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    flashPos.copy(camera.position).addScaledVector(right, .17).add(new THREE.Vector3(0, -.12, 0));
    flashPos.y = Math.max(flashPos.y, .35);
    flashTarget.copy(flashPos).addScaledVector(aimDir, 18);
    let flick = 1;
    if (eventActive) {
        const tt = performance.now() / 1e3 - eventStart;
        const stutter = Math.sin(tt * 86) * Math.sin(tt * 37);
        if (tt < .32) flick = .25 + .65 * (stutter * .5 + .5); else if (tt > 2.4 && tt < 2.9) flick = .58 + .42 * (stutter * .5 + .5); else flick = 1;
    }
    flashFlicker += (flick - flashFlicker) * Math.min(1, dt * 22);
    const torchCore = 14e4 * flashFlicker;
    const torchHalo = 150 * flashFlicker;
    flashlight.position.copy(flashPos);
    flashlight.target.position.copy(flashTarget);
    flashlight.intensity = torchCore;
    flashlight.target.updateMatrixWorld();
    flashlight.shadow.camera.updateProjectionMatrix();
    torchSpill.position.copy(flashPos).add(new THREE.Vector3(0, .04, 0));
    torchSpill.target.position.copy(flashTarget);
    torchSpill.intensity = torchHalo;
    torchSpill.target.updateMatrixWorld();
    torchMid.position.copy(flashPos).add(new THREE.Vector3(-.02, .03, 0));
    torchMid.target.position.copy(flashTarget);
    torchMid.intensity = 1e3 * flashFlicker;
    torchMid.target.updateMatrixWorld();
    nearBounce.position.copy(flashPos).add(new THREE.Vector3(.1, .06, 0));
    nearBounce.target.position.copy(camera.position).addScaledVector(aimDir, 8).addScaledVector(new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion), -1.3);
    nearBounce.target.updateMatrixWorld();
    nearBounce.intensity = 8 * flashFlicker;
    torchNear.position.copy(flashPos).add(new THREE.Vector3(0, .03, 0));
    const nearPoint = camera.position.clone().addScaledVector(aimDir, 4.1);
    torchNear.target.position.set(nearPoint.x, 0, nearPoint.z);
    torchNear.target.updateMatrixWorld();
    torchNear.intensity = 65 * flashFlicker;
    dustMat.uniforms.uBeamPos.value.copy(flashPos);
    dustMat.uniforms.uBeamDir.value.copy(aimDir);
    dustMat.uniforms.uBeamCos.value = Math.cos(.64);
}

function updateAtmosphere(dt) {
    const now = performance.now() / 1e3;
    let tt = -1;
    if (eventActive) {
        tt = now - eventStart;
        if (tt > 5.4) {
            endEvent();
            tt = -1;
        }
    }
    let doorPulse = 0;
    let openLampFlicker = 0;
    if (tt >= 0) {
        const p1 = Math.exp(-Math.pow((tt - .55) / .16, 2));
        const p2 = Math.exp(-Math.pow((tt - 1.28) / .22, 2));
        const p3 = Math.exp(-Math.pow((tt - 2.15) / .3, 2));
        const p4 = Math.exp(-Math.pow((tt - 3.22) / .42, 2));
        doorPulse = p1 * 1.2 + p2 * 2.1 + p3 * 1.2 + p4 * .65;
        if (tt > 3.8) doorPulse *= Math.max(0, 1 - (tt - 3.8) / 1.6);
        const groupOn = Math.sin(tt * 31) > -.2;
        openLampFlicker = (groupOn ? 1 : 0) * (.65 + .35 * Math.sin(tt * 79));
        if (tt < .35) openLampFlicker *= .2;
    }
    const glowMat = farWall.userData.doorGlowMat;
    if (glowMat) {
        glowMat.uniforms.uTime.value = elapsed;
        glowMat.uniforms.uFlare.value = doorPulse * .55;
        glowMat.uniforms.uIntensity.value = .016 + doorPulse * 1.2;
    }
    farDoorLight.intensity = 8 + doorPulse * 420;
    farFaceLight.intensity = 2.5 + doorPulse * 90;
    farSpill.intensity = 6 + doorPulse * 420;
    farSpill.color.copy(glowCold).lerp(new THREE.Color(16774623), Math.min(1, doorPulse * .5));
    for (let i = 0; i < fixtureData.length; i++) {
        const f = fixtureData[i];
        let m = .08;
        if (tt >= 0) {
            const local = Math.max(0, tt - i * .075);
            const noise = Math.sin(local * (57 + i * 13.1) + f.seed * 4) * Math.sin(local * (23.7 + i * 7.3) + f.seed);
            m = .12 + Math.max(0, openLampFlicker + noise * .2) * (.75 + Math.sin(local * 12 + i) * .25);
            if (local > 3.4) m *= Math.max(.18, 1 - (local - 3.4) / 1.2);
        } else {
            m = .045 + .02 * Math.sin(elapsed * 1.7 + f.seed);
        }
        const intensity = f.base * (tt >= 0 ? 18 : 1) * Math.max(0, m);
        if (f.light) f.light.intensity = tt >= 0 ? 42 * Math.max(0, m) : f.base * .035;
        f.bulbMat.color.copy(glowYellow).multiplyScalar(tt >= 0 ? 1.4 + 4.5 * m : 1.35 + .15 * Math.sin(elapsed * 2 + f.seed));
        f.glow.material.opacity = .2 + (tt >= 0 ? Math.min(1, m * .9) : .03);
        f.glow.scale.setScalar(.52 + (tt >= 0 ? Math.min(1.6, m * 1.2) : .05));
    }
    const eventAmbient = tt >= 0 ? Math.max(0, openLampFlicker) * .09 : 0;
    hemi.intensity = .245 + eventAmbient * .7;
    ambient.intensity = .13 + eventAmbient * .18;
    dustMat.uniforms.uTurbulence.value += ((eventActive ? 1.2 : 0) - dustMat.uniforms.uTurbulence.value) * Math.min(1, dt * 1.8);
    filmPass.uniforms.uFlare.value += (Math.min(1, doorPulse * .55) - filmPass.uniforms.uFlare.value) * Math.min(1, dt * 6);
    filmPass.uniforms.uGrain.value = .115 + (tt >= 0 ? .02 : 0);
    if (eventActive && tt < .65) {
        filmPass.uniforms.uTime.value += Math.sin(tt * 91) * .02;
    }
}

function drawFrame(dt) {
    updateTorch(dt);
    updateAtmosphere(dt);
    const orbitDist = Math.max(camera.position.distanceTo(controls.target), .001);
    const safeFloor = Math.acos(Math.min(.9995, Math.max(-.9995, (.6 - controls.target.y) / orbitDist)));
    const safeRoof = Math.acos(Math.min(.9995, Math.max(-.9995, (9.5 - controls.target.y) / orbitDist)));
    controls.minPolarAngle = Math.max(.4, safeRoof);
    controls.maxPolarAngle = Math.min(Math.PI * .62, safeFloor);
    controls.update();
    dustMat.uniforms.uTime.value = elapsed;
    filmPass.uniforms.uTime.value = elapsed;
    bokeh.rotation.y = Math.sin(elapsed * .02) * .01;
    renderer.info.reset();
    composer.render();
}

function animate(nowMs) {
    rafId = null;
    const dt = STILL ? 1 / 60 : Math.min(clock.getDelta(), .05);
    if (!STILL) elapsed += dt;
    drawFrame(dt);
    if (!readySent && frameCount > 1) {
        readySent = true;
        window.__READY__ = true;
        document.body.classList.add("ready");
        const loader = document.getElementById("loader");
        if (loader) loader.setAttribute("aria-hidden", "true");
    }
    frameCount++;
    const now = performance.now();
    const delta = now - lastTimeMs;
    lastTimeMs = now;
    fpsAccum += delta;
    fpsFrames++;
    if (fpsAccum > 800) {
        fps = fpsFrames * 1e3 / fpsAccum;
        fpsAccum = 0;
        fpsFrames = 0;
    }
    if (CAPTURE) {
        document.body.classList.add("capture");
        document.body.classList.add("ui-hidden");
    }
    if (!paused) rafId = requestAnimationFrame(animate);
}

function pauseRendering() {
    paused = true;
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
}

function resumeRendering() {
    if (!paused) return;
    paused = false;
    lastTimeMs = performance.now();
    clock.getDelta();
    rafId = requestAnimationFrame(animate);
}

function renderOnce(dt = 1 / 60) {
    if (!STILL) elapsed += dt;
    drawFrame(dt);
}

function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    bloom.resolution.set(w * .5, h * .5);
    filmPass.uniforms.uResolution.value.set(w, h);
    dustMat.uniforms.uPixelRatio.value = renderer.getPixelRatio();
}

window.addEventListener("resize", onResize);

window.__SCENE__ = {
    THREE: THREE,
    scene: scene,
    camera: camera,
    renderer: renderer,
    composer: composer,
    controls: controls,
    world: world,
    MAT: MAT,
    flashlight: flashlight,
    torchSpill: torchSpill,
    farDoorLight: farDoorLight,
    farSpill: farSpill,
    torchMid: torchMid,
    nearBounce: nearBounce,
    farWallWash: farWallWash,
    farFaceLight: farFaceLight,
    underGlow: underGlow,
    rightBounce: rightBounce,
    sideWorkLight: sideWorkLight,
    triggerEvent: triggerEvent,
    pause: pauseRendering,
    resume: resumeRendering,
    renderOnce: renderOnce,
    resetCamera() {
        resetView();
    },
    setTorchPointer(x, y) {
        pointer.set(x, y);
    },
    getInfo() {
        const gl = renderer.getContext();
        const dbg = gl.getExtension("WEBGL_debug_renderer_info");
        const unmaskedVendor = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : null;
        const unmaskedRenderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : null;
        return {
            threeRevision: THREE.REVISION,
            webgl: !!gl,
            webglVersion: renderer.capabilities.isWebGL2 ? 2 : 1,
            glVendor: gl.getParameter(gl.VENDOR),
            glRenderer: gl.getParameter(gl.RENDERER),
            gpuVendor: unmaskedVendor,
            gpuRenderer: unmaskedRenderer,
            glVersionString: gl.getParameter(gl.VERSION),
            glslVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
            maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
            maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
            triangles: renderer.info.render.triangles,
            drawCalls: renderer.info.render.calls,
            points: renderer.info.render.points,
            meshCount: (() => {
                let n = 0;
                scene.traverse(o => {
                    if (o.isMesh || o.isPoints) n++;
                });
                return n;
            })(),
            textures: renderer.info.memory.textures,
            geometries: renderer.info.memory.geometries,
            renderSize: [ renderer.domElement.width, renderer.domElement.height ],
            pixelRatio: renderer.getPixelRatio(),
            toneMapping: renderer.toneMapping,
            exposure: renderer.toneMappingExposure,
            outputColorSpace: renderer.outputColorSpace,
            shadowMapEnabled: renderer.shadowMap.enabled,
            camera: {
                position: camera.position.toArray().map(n => +n.toFixed(3)),
                quaternion: camera.quaternion.toArray().map(n => +n.toFixed(4)),
                fov: camera.fov,
                aspect: +camera.aspect.toFixed(4)
            },
            flashlight: {
                intensity: flashlight.intensity,
                target: flashlight.target.position.toArray().map(n => +n.toFixed(3))
            },
            controls: {
                target: controls.target.toArray().map(n => +n.toFixed(3)),
                distance: +camera.position.distanceTo(controls.target).toFixed(3),
                minDistance: controls.minDistance,
                maxDistance: controls.maxDistance
            },
            fps: +fps.toFixed(1),
            ready: !!window.__READY__
        };
    }
};

onResize();

animate(performance.now());
