import * as THREE from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";

import { createIndustrialFloor } from "./floor.js";

const PI = Math.PI;

const UP = new THREE.Vector3(0, 1, 0);

const dummy = new THREE.Object3D;

RectAreaLightUniformsLib.init();

const AISLE = {
    leftWall: -3.38,
    rightFront: 1.42,
    backZ: -15.05,
    frontZ: 7.6,
    ceiling: 4.18,
    floor: 0,
    cabinetStart: 4.54,
    cabinetSpacing: .842,
    cabinetCount: 32,
    rowX: -2.03,
    heroZ: 1.52,
    beaconCabinet: 18
};

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

function mesh(geometry, material, opts = {}) {
    const obj = new THREE.Mesh(geometry, material);
    obj.castShadow = !!opts.cast;
    obj.receiveShadow = !!opts.receive;
    obj.name = opts.name || "";
    if (opts.position) obj.position.set(opts.position[0], opts.position[1], opts.position[2]);
    if (opts.rotation) obj.rotation.set(opts.rotation[0], opts.rotation[1], opts.rotation[2]);
    if (opts.scale) obj.scale.set(opts.scale[0], opts.scale[1], opts.scale[2]);
    if (opts.layer !== undefined) obj.layers.set(opts.layer);
    if (opts.renderOrder !== undefined) obj.renderOrder = opts.renderOrder;
    return obj;
}

function addBox(parent, width, height, depth, material, x, y, z, opts = {}) {
    const m = mesh(new THREE.BoxGeometry(width, height, depth), material, {
        cast: opts.cast,
        receive: opts.receive,
        name: opts.name,
        layer: opts.layer
    });
    m.position.set(x, y, z);
    if (opts.rotation) m.rotation.set(opts.rotation[0], opts.rotation[1], opts.rotation[2]);
    parent.add(m);
    return m;
}

function createPool(geometry, material, count, opts = {}) {
    const pool = new THREE.InstancedMesh(geometry, material, count);
    pool.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    pool.castShadow = !!opts.cast;
    pool.receiveShadow = !!opts.receive;
    pool.frustumCulled = false;
    if (opts.name) pool.name = opts.name;
    if (opts.layer !== undefined) pool.layers.set(opts.layer);
    return pool;
}

function setInstance(pool, index, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
    dummy.position.set(x, y, z);
    dummy.rotation.set(rx, ry, rz);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    pool.setMatrixAt(index, dummy.matrix);
}

function finishPool(pool) {
    pool.instanceMatrix.needsUpdate = true;
    pool.computeBoundingSphere();
    return pool;
}

function makeCanvasTextureDrawer(renderer, textures) {
    return textures;
}

function buildEnvironment(renderer) {
    const envScene = new THREE.Scene;
    envScene.background = new THREE.Color(263946);
    const room = new THREE.Mesh(new THREE.BoxGeometry(26, 11, 46), new THREE.MeshBasicMaterial({
        color: 329739,
        side: THREE.BackSide
    }));
    room.position.y = 2.5;
    envScene.add(room);
    const darkMetal = new THREE.MeshBasicMaterial({
        color: 725012
    });
    const midPanel = new THREE.MeshBasicMaterial({
        color: 4871260
    });
    const coldBar = new THREE.MeshBasicMaterial({
        color: new THREE.Color(15134194).multiplyScalar(4.8)
    });
    const softBar = new THREE.MeshBasicMaterial({
        color: new THREE.Color(12767450).multiplyScalar(1.6)
    });
    const blueFin = new THREE.MeshBasicMaterial({
        color: new THREE.Color(7968422).multiplyScalar(.8)
    });
    const thread = new THREE.MeshBasicMaterial({
        color: new THREE.Color(10070709).multiplyScalar(.3)
    });
    for (let i = 0; i < 9; i++) {
        const z = -20 + i * 5;
        const bar = new THREE.Mesh(new THREE.BoxGeometry(7.5, .12, .35), i % 3 === 0 ? coldBar : softBar);
        bar.position.set(.3, 7.3, z);
        envScene.add(bar);
    }
    for (let i = 0; i < 6; i++) {
        const z = -18 + i * 7;
        const side = new THREE.Mesh(new THREE.BoxGeometry(.12, 2.2, 5.2), softBar);
        side.position.set(10.4, 3.3, z);
        envScene.add(side);
    }
    for (let side = -1; side <= 1; side += 2) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(.5, 6, 38), midPanel);
        wall.position.set(side * 6.1, 2.9, -4);
        envScene.add(wall);
        for (let i = 0; i < 16; i++) {
            const z = -21 + i * 2.7;
            const slit = new THREE.Mesh(new THREE.BoxGeometry(.06, .1, .62), blueFin);
            slit.position.set(side * 5.82, 1.2 + i % 4 * .58, z);
            envScene.add(slit);
        }
    }
    const floor = new THREE.Mesh(new THREE.BoxGeometry(24, .2, 44), new THREE.MeshBasicMaterial({
        color: 856598
    }));
    floor.position.y = -2.6;
    envScene.add(floor);
    for (let i = 0; i < 12; i++) {
        const t = new THREE.Mesh(new THREE.BoxGeometry(.035, 9, .035), thread);
        t.position.set(-3 + i % 6 * 1.2, 2.4, -18 + Math.floor(i / 6) * 16);
        envScene.add(t);
    }
    const warm = new THREE.Mesh(new THREE.BoxGeometry(.5, .22, .5), new THREE.MeshBasicMaterial({
        color: new THREE.Color(16727583).multiplyScalar(3)
    }));
    warm.position.set(4.6, 4, -21);
    envScene.add(warm);
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileCubemapShader();
    const rt = pmrem.fromScene(envScene, .035, .1, 100);
    pmrem.dispose();
    envScene.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
    });
    return rt.texture;
}

export class Bay extends EventTarget {
    constructor(renderer, textures) {
        super();
        this.renderer = renderer;
        this.textures = textures;
        this.clock = new THREE.Clock;
        this.elapsed = 0;
        this.scene = new THREE.Scene;
        this.scene.background = new THREE.Color(198153);
        this.scene.fog = new THREE.FogExp2(527117, .0165);
        this.camera = this.makeCamera();
        this.controls = this.makeControls();
        this.interactive = [];
        this.animated = [];
        this.state = {
            dockReady: false,
            dockHover: false,
            beaconHover: false,
            warning: false,
            warningMood: 0,
            warningWave: -30,
            warningStart: -1,
            dockPulse: 0,
            dockPulseActive: false,
            dockGlow: 0,
            warningCount: 0
        };
        this.cabinetData = [];
        this.tempColor = new THREE.Color;
        this.rayTargets = [];
        this.build();
    }
    makeCamera() {
        const aspect = 3 / 2;
        const camera = new THREE.PerspectiveCamera(50, aspect, .055, 130);
        camera.position.set(-.22, 1.62, 5.95);
        const yaw = THREE.MathUtils.degToRad(-4.35);
        const pitch = THREE.MathUtils.degToRad(-3.9);
        const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)).normalize();
        this.initialDir = dir.clone();
        this.initialTarget = camera.position.clone().addScaledVector(dir, 8.2);
        camera.lookAt(this.initialTarget);
        camera.layers.enable(1);
        camera.layers.enable(2);
        return camera;
    }
    makeControls() {
        const controls = new OrbitControls(this.camera, this.renderer.domElement);
        controls.target.copy(this.initialTarget);
        controls.enableDamping = true;
        controls.dampingFactor = .065;
        controls.enablePan = false;
        controls.minDistance = 2.1;
        controls.maxDistance = 11.5;
        controls.minPolarAngle = .62;
        controls.maxPolarAngle = 1.535;
        controls.minAzimuthAngle = -.65;
        controls.maxAzimuthAngle = .55;
        controls.rotateSpeed = .55;
        controls.zoomSpeed = .72;
        controls.update();
        return controls;
    }
    build() {
        const {renderer: renderer, scene: scene, textures: textures} = this;
        scene.environment = buildEnvironment(renderer);
        scene.environmentIntensity = .92;
        this.setupMaterials();
        this.buildAtmosphere();
        this.buildFloor();
        this.buildRoomShell();
        this.buildLeftWall();
        this.buildCabinets();
        this.buildChargers();
        this.buildCeiling();
        this.buildFarEnd();
        this.buildDust();
        this.buildLighting();
        this.buildAtmosphereMotes();
        this.sceneReady = true;
    }
    setupMaterials() {
        const t = this.textures;
        this.mat = {
            cabinet: new THREE.MeshPhysicalMaterial({
                color: 592654,
                metalness: .82,
                roughness: .34,
                clearcoat: .14,
                clearcoatRoughness: .38,
                envMapIntensity: 1.15
            }),
            cabinetEdge: new THREE.MeshStandardMaterial({
                color: 1316892,
                metalness: .9,
                roughness: .26,
                envMapIntensity: 1.3
            }),
            doorFrame: new THREE.MeshStandardMaterial({
                color: 5792360,
                metalness: .95,
                roughness: .25,
                envMapIntensity: 1.5
            }),
            handle: new THREE.MeshPhysicalMaterial({
                color: 11976900,
                metalness: 1,
                roughness: .2,
                clearcoat: .45,
                clearcoatRoughness: .15,
                envMapIntensity: 1.8
            }),
            chrome: new THREE.MeshStandardMaterial({
                color: 9608612,
                metalness: 1,
                roughness: .18,
                envMapIntensity: 1.8
            }),
            pedestalSteel: new THREE.MeshPhysicalMaterial({
                color: 6582133,
                metalness: .86,
                roughness: .34,
                clearcoat: .2,
                clearcoatRoughness: .3,
                envMapIntensity: 1.2
            }),
            pedestalDarkSteel: new THREE.MeshStandardMaterial({
                color: 2567731,
                metalness: .82,
                roughness: .36,
                envMapIntensity: 1.1
            }),
            darkSteel: new THREE.MeshStandardMaterial({
                color: 1909544,
                metalness: .88,
                roughness: .37,
                envMapIntensity: 1
            }),
            tray: new THREE.MeshStandardMaterial({
                color: 8884629,
                metalness: .76,
                roughness: .42,
                envMapIntensity: 1.15
            }),
            steel: new THREE.MeshStandardMaterial({
                color: 7042685,
                metalness: .9,
                roughness: .33,
                envMapIntensity: 1.45
            }),
            galvanized: new THREE.MeshStandardMaterial({
                color: 9608610,
                metalness: .88,
                roughness: .43,
                envMapIntensity: 1.25
            }),
            brushed: new THREE.MeshPhysicalMaterial({
                color: 5594982,
                metalness: .83,
                roughness: .4,
                clearcoat: .18,
                clearcoatRoughness: .4,
                envMapIntensity: 1.15
            }),
            blackMetal: new THREE.MeshPhysicalMaterial({
                color: 395273,
                metalness: .7,
                roughness: .44,
                clearcoat: .1,
                clearcoatRoughness: .5,
                envMapIntensity: .9
            }),
            rubber: new THREE.MeshStandardMaterial({
                color: 329223,
                metalness: .14,
                roughness: .5,
                envMapIntensity: .6
            }),
            rubberEdge: new THREE.MeshStandardMaterial({
                color: 658445,
                metalness: .12,
                roughness: .58,
                envMapIntensity: .4
            }),
            wall: new THREE.MeshStandardMaterial({
                map: t.wall,
                color: 14277591,
                metalness: .22,
                roughness: .72,
                envMapIntensity: .85
            }),
            wallDark: new THREE.MeshStandardMaterial({
                color: 2831420,
                metalness: .35,
                roughness: .6,
                envMapIntensity: .8
            }),
            ceiling: new THREE.MeshStandardMaterial({
                map: t.ceiling,
                color: 10661040,
                metalness: .18,
                roughness: .88,
                envMapIntensity: .65,
                emissive: 1186333,
                emissiveIntensity: .82
            }),
            concrete: new THREE.MeshStandardMaterial({
                color: 3159868,
                metalness: .1,
                roughness: .9,
                envMapIntensity: .4
            }),
            whitePlastic: new THREE.MeshStandardMaterial({
                color: 11844281,
                metalness: .05,
                roughness: .63,
                envMapIntensity: .7
            }),
            paleMetal: new THREE.MeshStandardMaterial({
                color: 10002852,
                metalness: .6,
                roughness: .5,
                envMapIntensity: 1
            }),
            socket: new THREE.MeshStandardMaterial({
                color: 395531,
                metalness: .62,
                roughness: .42,
                envMapIntensity: .9
            }),
            socketRing: new THREE.MeshPhysicalMaterial({
                color: 5661546,
                metalness: .95,
                roughness: .26,
                clearcoat: .4,
                clearcoatRoughness: .2,
                envMapIntensity: 1.6
            }),
            amber: new THREE.MeshBasicMaterial({
                color: 16754719
            }),
            red: new THREE.MeshBasicMaterial({
                color: 16723220
            }),
            green: new THREE.MeshBasicMaterial({
                color: 7667647
            }),
            cyan: new THREE.MeshBasicMaterial({
                color: 8908276
            }),
            doorTextures: t.serverDoors.map(texture => new THREE.MeshPhysicalMaterial({
                map: texture,
                color: new THREE.Color(.8, .8, .8),
                metalness: .26,
                roughness: .52,
                clearcoat: .04,
                clearcoatRoughness: .5,
                envMapIntensity: .36,
                emissive: new THREE.Color(1712164),
                emissiveMap: texture,
                emissiveIntensity: .18
            })),
            meshDoor: null,
            screen: null,
            screenReady: null,
            label: new THREE.MeshBasicMaterial({
                map: t.dockBrand,
                transparent: false
            })
        };
        this.mat.meshDoor = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(1843492),
            metalness: .5,
            roughness: .5,
            envMapIntensity: .52,
            alphaMap: t.meshAlpha,
            alphaTest: .44,
            side: THREE.DoubleSide
        });
    }
    buildAtmosphere() {
        const shaftMat = new THREE.MeshBasicMaterial({
            map: this.textures.lightShaft,
            color: new THREE.Color(9420772),
            transparent: true,
            opacity: .045,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            toneMapped: true
        });
        this.shaftMaterial = shaftMat;
        for (const z of [ 2.2, -2.9, -7.75, -12.6 ]) {
            const shaft = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 3.6), shaftMat);
            shaft.position.set(.3, 1.72, z);
            shaft.rotation.x = -.02;
            shaft.layers.set(1);
            shaft.renderOrder = 1;
            this.scene.add(shaft);
            this.shaft = shaft;
        }
    }
    buildFloor() {
        this.floor = createIndustrialFloor(this.renderer, this.textures.floor, {
            width: 7.55,
            length: 35,
            x: .22,
            z: -7.75,
            dockPos: new THREE.Vector2(AISLE.rowX + .55, AISLE.heroZ - .35),
            fogColor: 329998,
            fogDensity: .0132,
            reflectionWidth: Math.min(1280, Math.round(window.innerWidth * .72))
        });
        this.floor.position.y = 0;
        this.floor.userData.setLampLine([ 2.1, -2.85, -7.7, -12.55 ]);
        this.scene.add(this.floor);
        const catcherMat = new THREE.ShadowMaterial({
            color: 0,
            opacity: .6
        });
        this.shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(7.45, 34.8), catcherMat);
        this.shadowCatcher.rotation.x = -Math.PI / 2;
        this.shadowCatcher.position.set(.22, .004, -7.75);
        this.shadowCatcher.receiveShadow = true;
        this.shadowCatcher.renderOrder = 1;
        this.scene.add(this.shadowCatcher);
        const aoMat = new THREE.MeshBasicMaterial({
            map: this.textures.baseAO,
            color: 0,
            transparent: true,
            opacity: .34,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        const ao = new THREE.Mesh(new THREE.PlaneGeometry(.95, 28.5), aoMat);
        ao.rotation.x = -Math.PI / 2;
        ao.position.set(1.18, .008, -8.5);
        ao.layers.set(1);
        ao.renderOrder = 2;
        this.scene.add(ao);
        const tapeMat = new THREE.MeshBasicMaterial({
            map: this.textures.hazardTape,
            color: 9208168,
            transparent: true,
            opacity: .38,
            depthWrite: false,
            toneMapped: true
        });
        for (const [z, length] of [ [ 1.55, 3.2 ], [ -7.2, 4.6 ], [ -16.4, 4 ] ]) {
            const tape = new THREE.Mesh(new THREE.PlaneGeometry(.085, length), tapeMat);
            tape.rotation.x = -Math.PI / 2;
            tape.position.set(-1.28, .011, z);
            tape.layers.set(1);
            tape.renderOrder = 3;
            this.scene.add(tape);
        }
        const stencilMat = new THREE.MeshBasicMaterial({
            map: this.textures.stencil,
            transparent: true,
            opacity: .46,
            depthWrite: false,
            color: 11984096,
            toneMapped: true
        });
        const stencil = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.05), stencilMat);
        stencil.rotation.x = -Math.PI / 2;
        stencil.position.set(AISLE.rowX + .38, .012, AISLE.heroZ - .12);
        stencil.layers.set(1);
        stencil.renderOrder = 3;
        this.scene.add(stencil);
        this.stencil = stencil;
    }
    buildRoomShell() {
        const {scene: scene, mat: mat} = this;
        const room = new THREE.Group;
        room.name = "Architectural shell";
        scene.add(room);
        const ceilMat = mat.ceiling.clone();
        ceilMat.map = mat.ceiling.map;
        const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 34.2), ceilMat);
        ceiling.rotation.x = PI / 2;
        ceiling.position.set(.2, AISLE.ceiling, -7.7);
        ceiling.receiveShadow = true;
        room.add(ceiling);
        const beamB = createPool(new THREE.BoxGeometry(1, 1, 1), mat.darkSteel, 9 * 3, {
            cast: true,
            name: "I-beam pool"
        });
        const beamZs = [ 5.4, 1.7, -2, -5.7, -9.4, -13.1, -16.8, -20.5, -23.1 ];
        let bi = 0;
        for (const z of beamZs) {
            setInstance(beamB, bi++, .18, 3.99, z, 7.5, .055, .22);
            setInstance(beamB, bi++, .18, 4.09, z, 7.5, .18, .065);
            setInstance(beamB, bi++, .18, 4.2, z, 7.5, .05, .22);
        }
        finishPool(beamB);
        room.add(beamB);
        const pipeMat = mat.galvanized;
        const pipeGeo = new THREE.CylinderGeometry(.026, .026, 29, 8);
        for (const [x, y, z] of [ [ -2.86, 3.72, -7.5 ], [ -2.54, 3.62, -7.5 ], [ 2.97, 3.82, -7.2 ], [ 2.81, 3.58, -7.2 ] ]) {
            const pipe = new THREE.Mesh(pipeGeo, pipeMat);
            pipe.rotation.x = PI / 2;
            pipe.position.set(x, y, z);
            room.add(pipe);
        }
        addBox(room, .24, .22, 29, mat.paleMetal, -2.97, 3.34, -7.4, {
            cast: true
        });
        addBox(room, .27, .03, 29, mat.darkSteel, -2.97, 3.45, -7.4);
        for (let i = 0; i < 10; i++) {
            addBox(room, .06, .16, .035, mat.darkSteel, -2.82, 3.3, 5 - i * 2.8);
        }
        const rib = createPool(new THREE.BoxGeometry(1, 1, 1), mat.paleMetal, 16, {
            receive: true
        });
        for (let i = 0; i < 16; i++) {
            setInstance(rib, i, -3.365, 1.91, 5.7 - i * 1.85, .035, 3.62, .055);
        }
        room.add(finishPool(rib));
        addBox(room, 6.85, .11, .07, mat.darkSteel, .05, .055, -22.68);
    }
    buildLeftWall() {
        const {scene: scene, mat: mat} = this;
        const group = new THREE.Group;
        group.name = "Charging wall";
        scene.add(group);
        const wallMat = mat.wall.clone();
        wallMat.map = this.textures.wall;
        if (wallMat.map) {
            wallMat.map.wrapS = THREE.RepeatWrapping;
            wallMat.map.wrapT = THREE.RepeatWrapping;
            wallMat.map.repeat.set(3.4, 1);
            wallMat.map.needsUpdate = true;
        }
        const wall = new THREE.Mesh(new THREE.PlaneGeometry(30.2, 4.25), wallMat);
        wall.rotation.y = PI / 2;
        wall.position.set(AISLE.leftWall, 2.12, -7.45);
        wall.receiveShadow = true;
        group.add(wall);
        addBox(group, .055, .42, 30.2, mat.wallDark, AISLE.leftWall + .04, .21, -7.45);
        addBox(group, .035, .018, 30.2, mat.darkSteel, AISLE.leftWall + .07, .43, -7.45);
        addBox(group, .045, .055, 30.2, mat.paleMetal, AISLE.leftWall + .06, 2.74, -7.45);
        const pipeMat = mat.galvanized;
        const conduitGroup = new THREE.Group;
        const conduitPoints = [ [ AISLE.leftWall + .13, .12, 5.63 ], [ AISLE.leftWall + .13, 4.02, 3.9 ], [ AISLE.leftWall + .13, 4.04, -.72 ], [ AISLE.leftWall + .13, 4.04, -4.95 ], [ AISLE.leftWall + .13, 4.04, -9.28 ], [ AISLE.leftWall + .13, 4.04, -14.66 ], [ AISLE.leftWall + .13, 4.04, -20.1 ] ];
        for (const p of conduitPoints) {
            const h = p[1] - .4;
            const c = new THREE.Mesh(new THREE.CylinderGeometry(.029, .034, h, 9), pipeMat);
            c.position.set(p[0], .4 + h / 2, p[2]);
            c.castShadow = true;
            conduitGroup.add(c);
            for (let i = 0; i < 4; i++) {
                const collar = new THREE.Mesh(new THREE.TorusGeometry(.045, .009, 5, 12), mat.chrome);
                collar.rotation.x = PI / 2;
                collar.position.set(p[0], .85 + i * .83, p[2]);
                conduitGroup.add(collar);
            }
            const elbow = new THREE.Mesh(new THREE.TorusGeometry(.13, .029, 7, 14, PI / 2), pipeMat);
            elbow.position.set(p[0], 3.58, p[2] - .13);
            elbow.rotation.set(0, 0, 0);
            elbow.rotation.y = PI / 2;
            conduitGroup.add(elbow);
        }
        group.add(conduitGroup);
        const panelZ = 1.28;
        const panelGroup = new THREE.Group;
        panelGroup.position.set(AISLE.leftWall + .17, 0, panelZ);
        const panelBody = new THREE.Mesh(new RoundedBoxGeometry(.34, 3.12, 1.9, 3, .03), mat.blackMetal);
        panelBody.position.set(0, 1.65, 0);
        panelBody.castShadow = true;
        panelBody.receiveShadow = true;
        panelGroup.add(panelBody);
        addBox(panelGroup, .48, .13, 2.02, mat.blackMetal, .02, .065, 0, {
            cast: true
        });
        addBox(panelGroup, .04, .34, 1.94, mat.cabinetEdge, .17, .28, 0, {
            cast: true
        });
        const faceMat = new THREE.MeshPhysicalMaterial({
            map: this.textures.blackPanel,
            color: 12172473,
            metalness: .35,
            roughness: .58,
            clearcoat: 0,
            clearcoatRoughness: .5,
            envMapIntensity: .38,
            emissiveMap: this.textures.blackPanel,
            emissive: 8357252,
            emissiveIntensity: .06
        });
        const face = new THREE.Mesh(new THREE.PlaneGeometry(1.82, 2.96), faceMat);
        face.rotation.y = PI / 2;
        face.position.set(.176, 1.67, 0);
        panelGroup.add(face);
        addBox(panelGroup, .03, .035, 1.92, mat.steel, .18, 3.17, 0, {
            cast: true
        });
        addBox(panelGroup, .03, .05, 1.92, mat.darkSteel, .18, .135, 0);
        addBox(panelGroup, .03, 3.03, .035, mat.steel, .18, 1.65, .95);
        addBox(panelGroup, .03, 3.03, .035, mat.steel, .18, 1.65, -.95);
        addBox(panelGroup, .14, .3, .35, mat.paleMetal, .245, 2.24, -.5, {
            cast: true
        });
        addBox(panelGroup, .012, .11, .11, mat.darkSteel, .318, 2.24, -.5);
        addBox(group, .56, .075, .82, mat.paleMetal, AISLE.leftWall + .5, .04, panelZ - .62, {
            cast: true
        });
        addBox(group, .44, .022, .62, mat.brushed, AISLE.leftWall + .51, .085, panelZ - .64, {
            cast: true
        });
        addBox(group, .08, .045, .68, mat.darkSteel, AISLE.leftWall + .72, .105, panelZ - .64);
        for (const dz of [ -.77, -.34 ]) {
            addBox(group, .1, .16, .1, mat.darkSteel, AISLE.leftWall + .34, .08, panelZ + dz, {
                cast: true
            });
        }
        group.add(panelGroup);
        const boxZ = [ -.68, -8.3, -15.25 ];
        for (let k = 0; k < boxZ.length; k++) {
            const z = boxZ[k];
            const service = new THREE.Group;
            service.position.set(AISLE.leftWall + .15, 0, z);
            const shell = new THREE.Mesh(new RoundedBoxGeometry(.17, .72, .55, 2, .015), mat.paleMetal);
            shell.position.y = 1.73;
            shell.castShadow = true;
            service.add(shell);
            const door = new THREE.Mesh(new THREE.PlaneGeometry(.48, .64), new THREE.MeshStandardMaterial({
                map: this.textures.warningDecal,
                roughness: .6,
                metalness: .15,
                envMapIntensity: .6
            }));
            door.rotation.y = PI / 2;
            door.position.set(.087, 1.74, 0);
            service.add(door);
            const hub = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, .08, 18), mat.darkSteel);
            hub.rotation.z = PI / 2;
            hub.position.set(.13, 1.48, .17);
            service.add(hub);
            const lever = new THREE.Mesh(new RoundedBoxGeometry(.07, .22, .05, 2, .014), mat.red);
            lever.position.set(.18, 1.46, .2);
            lever.rotation.x = .3;
            service.add(lever);
            const drop = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .85, 8), mat.chrome);
            drop.position.set(-.02, 2.49, -.16);
            service.add(drop);
            group.add(service);
        }
        const paperMat = new THREE.MeshStandardMaterial({
            map: this.textures.noticePaper,
            roughness: .8,
            metalness: 0,
            side: THREE.DoubleSide
        });
        const paperDarkMat = new THREE.MeshStandardMaterial({
            map: this.textures.noticeDark,
            roughness: .7,
            metalness: .1,
            side: THREE.DoubleSide
        });
        const notices = [ [ -4.1, 2.28, .34, .46, paperMat, -.035 ], [ -4.55, 2.3, .2, .3, paperDarkMat, .02 ], [ -11.2, 1.92, .3, .42, paperMat, .018 ], [ -12.05, 2.1, .23, .32, paperDarkMat, -.04 ], [ .85, 2.13, .28, .39, paperMat, .01 ] ];
        for (const [z, y, w, h, m, rot] of notices) {
            const notice = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
            notice.rotation.y = PI / 2;
            notice.rotation.z = rot;
            notice.position.set(AISLE.leftWall + .022, y, z);
            group.add(notice);
            addBox(group, .025, .025, w + .045, mat.steel, AISLE.leftWall + .035, y + h / 2 - .01, z);
        }
        const exit = new THREE.Mesh(new THREE.PlaneGeometry(.46, .145), new THREE.MeshBasicMaterial({
            map: this.textures.exitSign,
            toneMapped: true
        }));
        exit.rotation.y = PI / 2;
        exit.position.set(AISLE.leftWall + .03, 2.39, -12.2);
        group.add(exit);
        const exitGlow = new THREE.PointLight(7274432, .65, 1.8, 2);
        exitGlow.position.set(AISLE.leftWall + .3, 2.35, -12.2);
        group.add(exitGlow);
        this.addLadderTray(group, {
            x: AISLE.leftWall + .42,
            y: 3.47,
            width: .5,
            zStart: 6.7,
            zEnd: -14.4,
            rungStep: .52,
            rails: true,
            cables: 4,
            name: "wall cable basket"
        });
    }
    buildCabinets() {
        const {scene: scene, mat: mat, textures: textures} = this;
        const group = new THREE.Group;
        group.name = "Server cabinet row";
        scene.add(group);
        const rand = mulberry32(1601);
        const data = [];
        const meshDoorIndices = new Set([ 2, 12, 23 ]);
        for (let i = 0; i < AISLE.cabinetCount; i++) {
            const z = AISLE.cabinetStart - i * AISLE.cabinetSpacing;
            const hBase = 2.36 + (Math.sin(i * 1.73 + .7) * .5 + .5) * .29;
            let h = Math.round(hBase * 100) / 100;
            if (i === 2 || i === 3) h = 2.59;
            if (i === 27) h = 2.52;
            const width = .815;
            const variant = rand() * 3 | 0;
            const dataRow = {
                i: i,
                z: z,
                width: width,
                height: h,
                variant: variant,
                meshDoor: meshDoorIndices.has(i),
                topY: h
            };
            data.push(dataRow);
            if (i === AISLE.beaconCabinet) this.beaconCabinetData = dataRow;
        }
        this.cabinetData = data;
        const bodyPool = createPool(new THREE.BoxGeometry(1, 1, 1), mat.cabinet, data.length, {
            cast: true,
            receive: true,
            name: "Cabinet bodies"
        });
        const plinthPool = createPool(new RoundedBoxGeometry(1, 1, 1, 2, .018), mat.blackMetal, data.length, {
            cast: true,
            name: "Cabinet plinths"
        });
        const trimPool = createPool(new THREE.BoxGeometry(1, 1, 1), mat.cabinetEdge, data.length * 4, {
            cast: true,
            name: "Cabinet trims"
        });
        const capPool = createPool(new RoundedBoxGeometry(1, 1, 1, 2, .012), mat.cabinetEdge, data.length, {
            cast: true,
            name: "Cabinet caps"
        });
        const footPool = createPool(new THREE.BoxGeometry(1, 1, 1), mat.darkSteel, data.length * 2, {
            name: "Cabinet feet"
        });
        const framePool = createPool(new THREE.BoxGeometry(1, 1, 1), mat.doorFrame, data.length * 4, {
            name: "Door frame"
        });
        const handlePool = createPool(new THREE.BoxGeometry(1, 1, 1), mat.handle, data.length * 3, {
            cast: true,
            name: "Door handles"
        });
        const hingePool = createPool(new THREE.CylinderGeometry(.011, .011, .036, 8), mat.chrome, data.length * 3, {
            name: "Hinges"
        });
        const ledPool = createPool(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({
            color: 16777215,
            toneMapped: false
        }), data.length * 2, {
            name: "Cabinet status LEDs"
        });
        ledPool.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(data.length * 2 * 3), 3);
        const doorBuckets = [ [], [], [] ];
        let trim = 0, cap = 0, foot = 0, frame = 0, handle = 0, hinge = 0, led = 0;
        for (const c of data) {
            const bodyY = c.height / 2 + .06;
            setInstance(bodyPool, c.i, AISLE.rightFront + .66, bodyY, c.z, 1.32, c.height - .1, c.width - .024);
            setInstance(plinthPool, c.i, AISLE.rightFront + .63, .055, c.z, 1.44, .11, c.width - .015);
            setInstance(capPool, c.i, AISLE.rightFront + .65, c.height + .015, c.z, 1.38, .05, c.width + .018);
            setInstance(footPool, foot++, AISLE.rightFront + .08, .06, c.z - c.width * .34, .11, .12, .09);
            setInstance(footPool, foot++, AISLE.rightFront + .08, .06, c.z + c.width * .34, .11, .12, .09);
            setInstance(trimPool, trim++, AISLE.rightFront - .005, c.height / 2 + .08, c.z - c.width / 2, .036, c.height - .18, .028);
            setInstance(trimPool, trim++, AISLE.rightFront - .005, c.height / 2 + .08, c.z + c.width / 2, .036, c.height - .18, .028);
            setInstance(trimPool, trim++, AISLE.rightFront - .004, c.height - .06, c.z, .045, .055, c.width);
            setInstance(trimPool, trim++, AISLE.rightFront - .004, .115, c.z, .045, .04, c.width);
            if (!c.meshDoor) doorBuckets[c.variant].push(c);
            const fw = c.width - .075;
            const fh = c.height - .19;
            const fy = c.height / 2 + .03;
            const fx = AISLE.rightFront - .045;
            setInstance(framePool, frame++, fx, fy + fh / 2, c.z, .045, .023, fw + .045);
            setInstance(framePool, frame++, fx, fy - fh / 2, c.z, .045, .023, fw + .045);
            setInstance(framePool, frame++, fx, fy, c.z - fw / 2, .045, fh, .023);
            setInstance(framePool, frame++, fx, fy, c.z + fw / 2, .045, fh, .023);
            const hx = AISLE.rightFront - .085;
            setInstance(handlePool, handle++, hx, c.height * .51, c.z + c.width * .34, .031, .36, .045);
            setInstance(handlePool, handle++, hx + .014, c.height * .51 + .19, c.z + c.width * .34, .022, .035, .026);
            setInstance(handlePool, handle++, hx + .014, c.height * .51 - .19, c.z + c.width * .34, .022, .035, .026);
            for (let hg = 0; hg < 3; hg++) {
                setInstance(hingePool, hinge++, AISLE.rightFront - .03, .45 + hg * (c.height - .9) / 2, c.z - c.width * .38, 1, 1, 1, 0, 0, 0);
            }
            const ledColors = [ new THREE.Color(c.i === AISLE.beaconCabinet ? 3571680 : 3111814).multiplyScalar(.7), new THREE.Color(c.i % 7 === 0 ? 7985151 : 1919829).multiplyScalar(.5) ];
            setInstance(ledPool, led++, AISLE.rightFront - .068, c.height * .72, c.z + c.width * .34, .018, .008, .052);
            setInstance(ledPool, led++, AISLE.rightFront - .068, c.height - .24, c.z - c.width * .27, .016, .006, .036);
            ledPool.setColorAt(led - 2, ledColors[0]);
            ledPool.setColorAt(led - 1, ledColors[1]);
        }
        finishPool(bodyPool);
        finishPool(plinthPool);
        finishPool(trimPool);
        finishPool(capPool);
        finishPool(footPool);
        finishPool(framePool);
        finishPool(handlePool);
        finishPool(hingePool);
        ledPool.count = led;
        if (ledPool.instanceColor) ledPool.instanceColor.needsUpdate = true;
        group.add(bodyPool, plinthPool, trimPool, capPool, footPool, framePool, handlePool, hingePool, ledPool);
        this.cabinetLEDs = ledPool;
        for (let v = 0; v < 3; v++) {
            const bucket = doorBuckets[v];
            const pool = createPool(new THREE.PlaneGeometry(1, 1), mat.doorTextures[v], bucket.length, {
                name: `Cabinet doors v${v}`
            });
            bucket.forEach((c, idx) => {
                setInstance(pool, idx, AISLE.rightFront - .04, c.height / 2 + .03, c.z, c.width - .075, c.height - .23, 1, 0, -PI / 2, 0);
            });
            finishPool(pool);
            group.add(pool);
        }
        const interiorMat = new THREE.MeshBasicMaterial({
            map: textures.rackInterior,
            color: new THREE.Color(1.02, 1.12, 1.16),
            toneMapped: true
        });
        let meshDoorCounter = 0;
        for (const c of data) {
            if (!c.meshDoor) continue;
            const door = new THREE.Mesh(new THREE.PlaneGeometry(c.width - .075, c.height - .23), mat.meshDoor);
            door.rotation.y = -PI / 2;
            door.position.set(AISLE.rightFront - .045, c.height / 2 + .03, c.z);
            group.add(door);
            const interior = new THREE.Mesh(new THREE.PlaneGeometry(c.width - .11, c.height - .32), interiorMat);
            interior.rotation.y = -PI / 2;
            interior.position.set(AISLE.rightFront - .0045, c.height / 2 + .03, c.z);
            group.add(interior);
            const spill = new THREE.PointLight(4108240, .5, 1.8, 2);
            spill.position.set(AISLE.rightFront - .78, 1.25, c.z);
            group.add(spill);
            const topGlow = new THREE.Mesh(new THREE.PlaneGeometry(c.width - .12, .02), new THREE.MeshBasicMaterial({
                color: new THREE.Color(8830150).multiplyScalar(.16),
                toneMapped: true
            }));
            topGlow.rotation.y = -PI / 2;
            topGlow.position.set(AISLE.rightFront - .075, c.height - .16, c.z);
            group.add(topGlow);
            const plate = new THREE.Mesh(new THREE.PlaneGeometry(.19, .06), new THREE.MeshBasicMaterial({
                map: meshDoorCounter === 0 ? textures.plateHero : textures.plateRack,
                color: 7107958,
                toneMapped: true
            }));
            plate.rotation.y = -PI / 2;
            plate.position.set(AISLE.rightFront - .07, 1.65, c.z + c.width * .26);
            group.add(plate);
            meshDoorCounter++;
        }
        const busY = 2.88;
        addBox(group, .1, .12, 30, mat.darkSteel, 2.13, busY, -8.1, {
            cast: true
        });
        addBox(group, .12, .02, 30, mat.brushed, 2.13, busY + .07, -8.1);
        this.addLadderTray(group, {
            x: 2.03,
            y: 3.03,
            width: .52,
            zStart: 5.6,
            zEnd: -14.4,
            rungStep: .46,
            rails: true,
            cables: 5,
            name: "cabinet overhead tray"
        });
        const dropMat = mat.rubber;
        for (let i = 1; i < data.length; i += 5) {
            const c = data[i];
            const points = [ new THREE.Vector3(2.03, 3.02, c.z), new THREE.Vector3(2, 2.7, c.z + .02), new THREE.Vector3(1.82, c.height + .3, c.z + .04), new THREE.Vector3(1.65, c.height + .05, c.z + .03), new THREE.Vector3(1.5, c.height + .02, c.z + .01) ];
            const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
            const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 26, .014 + i % 3 * .004, 5, false), dropMat);
            group.add(tube);
        }
        const cyanMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(7314850).multiplyScalar(.5),
            toneMapped: true
        });
        for (let i = 4; i < data.length; i += 7) {
            const c = data[i];
            const hook = new THREE.Mesh(new THREE.TorusGeometry(.075, .012, 6, 14, PI * 1.25), mat.chrome);
            hook.position.set(1.58, c.height + .03, c.z + .18);
            hook.rotation.y = PI / 2;
            hook.rotation.z = .35;
            group.add(hook);
            const cap = addBox(group, .01, .006, c.width * .32, cyanMat, 1.43, c.height - .22, c.z + c.width * .2);
            cap.layers.set(1);
        }
        const plateMat = new THREE.MeshBasicMaterial({
            map: textures.plateRack,
            transparent: true,
            color: 6186599
        });
        for (let i = 2; i < 8; i++) {
            const c = data[i];
            const plate = new THREE.Mesh(new THREE.PlaneGeometry(.13, .042), plateMat);
            plate.rotation.y = -PI / 2;
            plate.position.set(AISLE.rightFront - .071, c.height * .31, c.z - c.width * .25);
            group.add(plate);
        }
        const warningCount = data.length;
        this.warningBars = createPool(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({
            color: 16777215,
            toneMapped: false
        }), warningCount * 2, {
            name: "Cabinet warning rails"
        });
        this.warningBars.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(warningCount * 2 * 3), 3);
        data.forEach((c, i) => {
            setInstance(this.warningBars, i * 2, AISLE.rightFront - .075, c.height - .085, c.z, .015, .009, c.width * .8);
            setInstance(this.warningBars, i * 2 + 1, AISLE.rightFront - .075, c.height * .58, c.z + c.width * .36, .014, c.height * .28, .009);
            this.warningBars.setColorAt(i * 2, new THREE.Color(2771536));
            this.warningBars.setColorAt(i * 2 + 1, new THREE.Color(1193018));
        });
        this.warningBars.instanceColor.needsUpdate = true;
        group.add(this.warningBars);
        const baseShade = new THREE.Mesh(new THREE.PlaneGeometry(.72, 28), new THREE.MeshBasicMaterial({
            map: textures.baseAO,
            color: 0,
            transparent: true,
            opacity: .22,
            depthWrite: false
        }));
        baseShade.rotation.x = -PI / 2;
        baseShade.position.set(AISLE.rightFront - .45, .01, -8.6);
        baseShade.layers.set(1);
        group.add(baseShade);
    }
    addLadderTray(parent, opts) {
        const {x: x, y: y, width: width, zStart: zStart, zEnd: zEnd, rungStep: rungStep = .32, cables: cables = 3, rails: rails = true} = opts;
        const mat = this.mat;
        const g = new THREE.Group;
        g.name = opts.name || "Ladder tray";
        const length = Math.abs(zStart - zEnd);
        const zCenter = (zStart + zEnd) / 2;
        if (rails) {
            for (const side of [ -1, 1 ]) {
                addBox(g, .028, .12, length, mat.tray, x + side * width / 2, y, zCenter, {
                    cast: true
                });
                addBox(g, .06, .014, length, mat.darkSteel, x + side * width / 2, y + .06, zCenter);
            }
        }
        const rungCount = Math.max(2, Math.floor(length / rungStep));
        const rungs = createPool(new THREE.BoxGeometry(1, 1, 1), mat.tray, rungCount, {
            cast: false
        });
        for (let i = 0; i < rungCount; i++) {
            setInstance(rungs, i, x, y - .035, zStart - (i + .5) * (length / rungCount), width - .015, .018, .023);
        }
        g.add(finishPool(rungs));
        const cableColors = [ 197637, 725010, 2303787, 2902866, 3417359 ];
        for (let c = 0; c < cables; c++) {
            const points = [];
            const segments = 8;
            for (let i = 0; i <= segments; i++) {
                const z = zStart - i / segments * length;
                const wobble = Math.sin(i * 1.9 + c * 2.1) * .012;
                points.push(new THREE.Vector3(x + (c - (cables - 1) / 2) * .055, y + .035 + wobble, z));
            }
            const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
            const cableMat = c === 3 ? new THREE.MeshStandardMaterial({
                color: 1799301,
                roughness: .5,
                metalness: .2
            }) : c === 4 ? new THREE.MeshStandardMaterial({
                color: 5913110,
                roughness: .55,
                metalness: .2
            }) : new THREE.MeshStandardMaterial({
                color: cableColors[c % 3],
                roughness: .62,
                metalness: .1
            });
            const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 90, .013 + c % 2 * .005, 5, false), cableMat);
            tube.castShadow = false;
            g.add(tube);
        }
        const rodCount = Math.max(2, Math.floor(length / 3.1));
        const rods = createPool(new THREE.CylinderGeometry(.008, .008, 1, 5), mat.chrome, rodCount * 2, {});
        let ri = 0;
        for (let i = 0; i < rodCount; i++) {
            const z = zStart - .5 - i * (length / rodCount);
            for (const side of [ -1, 1 ]) {
                const rodLen = AISLE.ceiling - (y + .2);
                setInstance(rods, ri++, x + side * width * .38, y + .1 + rodLen / 2, z, 1, rodLen, 1);
            }
        }
        g.add(finishPool(rods));
        parent.add(g);
        return g;
    }
    buildChargers() {
        const {scene: scene, mat: mat, textures: textures} = this;
        const group = new THREE.Group;
        group.name = "Robot charging row";
        scene.add(group);
        this.pedestalPositions = [ AISLE.heroZ, -.42, -2.34, -4.38, -6.52, -8.83, -11.32, -13.96, -16.75, -19.62 ];
        const displayIds = [ 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 ];
        const pedestalLocal = {
            plinth: new RoundedBoxGeometry(.63, .115, .6, 3, .024),
            body: new RoundedBoxGeometry(.475, 1.035, .475, 3, .026),
            shoulder: new RoundedBoxGeometry(.545, .235, .545, 4, .055),
            face: new RoundedBoxGeometry(.035, .59, .335, 2, .014),
            screenBezel: new RoundedBoxGeometry(.026, .205, .34, 2, .012),
            screen: new THREE.PlaneGeometry(.286, .162),
            status: new THREE.BoxGeometry(1, 1, 1),
            sideRail: new RoundedBoxGeometry(.035, .92, .042, 2, .01),
            headRail: new RoundedBoxGeometry(.035, .035, .48, 2, .012),
            topPlate: new RoundedBoxGeometry(.5, .025, .5, 2, .012),
            gunBody: new RoundedBoxGeometry(.072, .16, .095, 3, .02),
            gunGrip: new RoundedBoxGeometry(.052, .11, .062, 2, .014),
            sidePanel: new RoundedBoxGeometry(.33, .76, .02, 2, .012),
            sideInset: new RoundedBoxGeometry(.21, .38, .012, 2, .01),
            sideStatus: new THREE.BoxGeometry(1, 1, 1),
            gunLed: new THREE.BoxGeometry(1, 1, 1),
            socketRing: new THREE.TorusGeometry(.0705, .0085, 8, 30),
            socketFace: new THREE.CircleGeometry(.0605, 28),
            pin: new THREE.CylinderGeometry(.0041, .0041, .018, 6),
            hanger: new THREE.BoxGeometry(.032, .025, .43),
            vent: new THREE.BoxGeometry(1, 1, 1),
            shadow: new THREE.PlaneGeometry(.92, .78)
        };
        this.pedestalLocal = pedestalLocal;
        const cableA = this.makePedestalCable(0);
        const cableB = this.makePedestalCable(1);
        this.cableCurves = [ cableA.curve, cableB.curve ];
        const n = this.pedestalPositions.length - 1;
        const jitter = mulberry32(488);
        const pools = {
            plinth: createPool(pedestalLocal.plinth, mat.blackMetal, n, {
                cast: true,
                receive: true
            }),
            body: createPool(pedestalLocal.body, mat.cabinet, n, {
                cast: true,
                receive: true
            }),
            shoulder: createPool(pedestalLocal.shoulder, mat.cabinetEdge, n, {
                cast: true
            }),
            face: createPool(pedestalLocal.face, mat.pedestalSteel, n, {
                receive: true
            }),
            sideRail: createPool(pedestalLocal.sideRail, mat.handle, n * 2, {}),
            headRail: createPool(pedestalLocal.headRail, mat.pedestalSteel, n, {}),
            topPlate: createPool(pedestalLocal.topPlate, mat.pedestalSteel, n, {}),
            gunBody: createPool(pedestalLocal.gunBody, mat.blackMetal, n, {
                cast: true
            }),
            gunGrip: createPool(pedestalLocal.gunGrip, mat.rubberEdge, n, {}),
            sidePanel: createPool(pedestalLocal.sidePanel, mat.pedestalSteel, n, {
                receive: true
            }),
            sideInset: createPool(pedestalLocal.sideInset, mat.brushed, n, {}),
            sideStatus: createPool(pedestalLocal.sideStatus, new THREE.MeshBasicMaterial({
                color: new THREE.Color(8382449).multiplyScalar(.8),
                toneMapped: true
            }), n, {}),
            gunLed: createPool(pedestalLocal.gunLed, new THREE.MeshBasicMaterial({
                color: 7667663,
                toneMapped: false
            }), n, {}),
            bezel: createPool(pedestalLocal.screenBezel, mat.blackMetal, n, {}),
            screen: createPool(pedestalLocal.screen, new THREE.MeshBasicMaterial({
                map: textures.screenGeneric,
                toneMapped: true
            }), n, {
                name: "Dock displays"
            }),
            status: createPool(pedestalLocal.status, new THREE.MeshBasicMaterial({
                color: new THREE.Color(10485759).multiplyScalar(.95),
                toneMapped: true
            }), n, {}),
            socketRing: createPool(pedestalLocal.socketRing, mat.socketRing, n * 2, {}),
            socketFace: createPool(pedestalLocal.socketFace, mat.socket, n * 2, {}),
            pin: createPool(pedestalLocal.pin, mat.chrome, n * 2 * 5, {}),
            hanger: createPool(pedestalLocal.hanger, mat.chrome, n, {}),
            vent: createPool(pedestalLocal.vent, mat.rubberEdge, n * 4, {}),
            cableA: createPool(cableA.geometry, mat.rubber, n, {
                cast: true
            }),
            cableB: createPool(cableB.geometry, mat.rubberEdge, n, {
                cast: true
            }),
            shadows: createPool(pedestalLocal.shadow, new THREE.MeshBasicMaterial({
                map: textures.shadow,
                color: 0,
                transparent: true,
                opacity: .58,
                depthWrite: false,
                side: THREE.DoubleSide
            }), n + 1, {
                layer: 1
            })
        };
        pools.screen.material = new THREE.MeshBasicMaterial({
            map: textures.screenGeneric,
            toneMapped: true
        });
        pools.shadows.renderOrder = 3;
        let si = 0;
        for (let k = 0; k < n; k++) {
            const z = this.pedestalPositions[k + 1];
            const x = AISLE.rowX + (jitter() - .5) * .04;
            const s = .965 + jitter() * .075;
            setInstance(pools.plinth, k, x, .058 * s, z, 1, s, 1);
            setInstance(pools.body, k, x, .64 * s, z, 1, s, 1);
            setInstance(pools.shoulder, k, x, 1.245 * s, z, 1, s, 1);
            setInstance(pools.face, k, x + .257, .7 * s, z, 1, s, 1);
            setInstance(pools.sideRail, k * 2, x + .255, .66 * s, z - .222, 1, s, 1);
            setInstance(pools.sideRail, k * 2 + 1, x + .255, .66 * s, z + .222, 1, s, 1);
            setInstance(pools.headRail, k, x + .265, 1.345 * s, z, 1, s, 1);
            setInstance(pools.topPlate, k, x, 1.378 * s, z, 1, s, 1);
            setInstance(pools.bezel, k, x + .27, 1.245 * s, z, 1, s, 1);
            setInstance(pools.screen, k, x + .285, 1.245 * s, z, 1, s, 1, 0, PI / 2, 0);
            setInstance(pools.status, k, x + .285, 1.365 * s, z, .018, .012, .41);
            setInstance(pools.gunBody, k, x + .35, 1.03 * s, z + .2, 1, s, 1);
            setInstance(pools.gunGrip, k, x + .34, .925 * s, z + .225, 1, s, 1, .18, 0, 0);
            setInstance(pools.gunLed, k, x + .353, 1.1 * s, z + .247, .012, .008, .01);
            setInstance(pools.sidePanel, k, x, .66 * s, z + .241, 1, s, 1);
            setInstance(pools.sideInset, k, x, .69 * s, z + .253, 1, s, 1);
            setInstance(pools.sideStatus, k, x + .07, 1.3 * s, z + .25, .26, .009, .012);
            for (let sck = 0; sck < 2; sck++) {
                const zz = z + (sck === 0 ? -.112 : .112);
                const idx = k * 2 + sck;
                setInstance(pools.socketRing, idx, x + .278, .835 * s, zz, 1, s, 1, 0, PI / 2, 0);
                setInstance(pools.socketFace, idx, x + .277, .835 * s, zz, 1, s, 1, 0, PI / 2, 0);
                const pins = [ [ 0, .026 ], [ -.028, .006 ], [ .028, .006 ], [ -.018, -.027 ], [ .018, -.027 ] ];
                for (let p = 0; p < 5; p++) {
                    setInstance(pools.pin, idx * 5 + p, x + .283, .835 * s + pins[p][1] * s, zz + pins[p][0], 1, s, 1, 0, 0, PI / 2);
                }
            }
            for (let v = 0; v < 4; v++) {
                setInstance(pools.vent, k * 4 + v, x + .259, (.285 + v * .046) * s, z, .008, .012, .3);
            }
            setInstance(pools.hanger, k, x + .296, 1.08 * s, z, 1, s, 1);
            setInstance(pools.cableA, k, x, 0, z, 1, s, 1);
            setInstance(pools.cableB, k, x, 0, z, 1, s, 1);
            setInstance(pools.shadows, si++, x + .08, .014, z, 1, 1, 1, -PI / 2, 0, 0);
        }
        setInstance(pools.shadows, si++, AISLE.rowX + .08, .014, AISLE.heroZ, 1.12, 1.12, 1, -PI / 2, 0, 0);
        for (const p of Object.values(pools)) {
            if (p.isInstancedMesh) finishPool(p);
            group.add(p);
        }
        this.pedestalPools = pools;
        this.buildHeroDock(group, displayIds);
    }
    makePedestalCable(which) {
        const pts = which === 0 ? [ [ .235, 1.105, .205 ], [ .39, .99, .238 ], [ .487, .7, .228 ], [ .512, .35, .16 ], [ .438, .09, .05 ], [ .272, .04, -.1 ], [ .06, .148, -.25 ], [ .028, .43, -.322 ], [ .155, .635, -.286 ] ] : [ [ .22, 1.08, -.195 ], [ .38, .94, -.245 ], [ .465, .575, -.248 ], [ .445, .195, -.155 ], [ .318, .06, .02 ], [ .15, .165, .19 ], [ .095, .42, .296 ], [ .205, .59, .272 ] ];
        const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2])), false, "centripetal");
        return {
            curve: curve,
            geometry: new THREE.TubeGeometry(curve, 110, which === 0 ? .029 : .024, 8, false)
        };
    }
    buildHeroDock(parent, ids) {
        const {mat: mat, textures: textures} = this;
        const g = new THREE.Group;
        g.name = "Charging dock 02 — interactive";
        g.position.set(AISLE.rowX, 0, AISLE.heroZ);
        parent.add(g);
        this.heroDock = g;
        const local = this.pedestalLocal;
        const addLocal = (geometry, material, x, y, z, opts = {}) => {
            const m = mesh(geometry, material, {
                cast: opts.cast !== false,
                receive: true,
                layer: opts.layer
            });
            m.position.set(x, y, z);
            if (opts.rotation) m.rotation.set(...opts.rotation);
            m.name = opts.name || "";
            g.add(m);
            return m;
        };
        addLocal(local.plinth, mat.blackMetal, 0, .058, 0);
        for (const [dx, dz] of [ [ .2, .2 ], [ -.2, .2 ], [ .2, -.2 ], [ -.2, -.2 ] ]) {
            addLocal(new THREE.CylinderGeometry(.025, .031, .026, 10), mat.darkSteel, dx, .014, dz);
        }
        addLocal(local.body, mat.cabinet, 0, .64, 0);
        addLocal(new RoundedBoxGeometry(.5, .63, .5, 3, .03), mat.cabinetEdge, 0, .63, 0, {
            cast: false
        });
        addLocal(local.face, mat.pedestalSteel, .257, .7, 0);
        addLocal(new RoundedBoxGeometry(.035, .32, .3, 2, .012), mat.darkSteel, .262, .86, 0);
        for (const side of [ -1, 1 ]) {
            const rail = addLocal(new RoundedBoxGeometry(.035, .92, .042, 2, .01), mat.handle, .255, .66, side * .222);
            rail.castShadow = true;
        }
        addLocal(new RoundedBoxGeometry(.035, .035, .48, 2, .012), mat.pedestalSteel, .265, 1.345, 0);
        addLocal(new RoundedBoxGeometry(.5, .025, .5, 2, .012), mat.pedestalSteel, 0, 1.378, 0);
        addLocal(new RoundedBoxGeometry(.072, .16, .095, 3, .02), mat.blackMetal, .35, 1.03, .2);
        addLocal(new RoundedBoxGeometry(.052, .11, .062, 2, .014), mat.rubberEdge, .34, .925, .225);
        addLocal(new RoundedBoxGeometry(.33, .76, .02, 2, .012), mat.pedestalSteel, 0, .66, .241, {
            cast: false
        });
        addLocal(new RoundedBoxGeometry(.21, .38, .012, 2, .01), mat.brushed, 0, .69, .253, {
            cast: false
        });
        const sideRail = addLocal(new THREE.BoxGeometry(.26, .009, .012), new THREE.MeshBasicMaterial({
            color: new THREE.Color(8382449).multiplyScalar(.9),
            toneMapped: true
        }), .07, 1.3, .25, {
            layer: 2,
            cast: false
        });
        const gunLed = addLocal(new THREE.BoxGeometry(.012, .008, .01), new THREE.MeshBasicMaterial({
            color: 7667663,
            toneMapped: false
        }), .353, 1.1, .247, {
            layer: 2,
            cast: false
        });
        addLocal(local.shoulder, mat.cabinetEdge, 0, 1.245, 0);
        addLocal(new RoundedBoxGeometry(.565, .045, .565, 2, .018), mat.steel, 0, 1.362, 0);
        addLocal(new THREE.BoxGeometry(.07, .16, .56), mat.cabinet, -.06, 1.31, 0);
        for (const side of [ -1, 1 ]) {
            addLocal(new RoundedBoxGeometry(.23, .07, .055, 2, .014), mat.blackMetal, .06, 1.37, side * .235);
        }
        const screenAssembly = new THREE.Group;
        screenAssembly.position.set(.288, 1.248, 0);
        screenAssembly.rotation.z = .105;
        g.add(screenAssembly);
        const bezel = mesh(new RoundedBoxGeometry(.032, .215, .355, 2, .013), mat.blackMetal, {
            cast: false
        });
        screenAssembly.add(bezel);
        this.heroScreenMat = new THREE.MeshBasicMaterial({
            map: textures.screenIdleHero,
            toneMapped: true
        });
        this.heroScreen = mesh(new THREE.PlaneGeometry(.304, .174), this.heroScreenMat, {
            layer: 0
        });
        this.heroScreen.rotation.y = PI / 2;
        this.heroScreen.position.x = .0175;
        screenAssembly.add(this.heroScreen);
        const screenLip = mesh(new THREE.BoxGeometry(.012, .007, .275), new THREE.MeshBasicMaterial({
            color: new THREE.Color(7860725).multiplyScalar(2.6),
            toneMapped: false
        }), {
            layer: 2
        });
        screenLip.position.set(.303, 1.14, 0);
        g.add(screenLip);
        this.heroStatusMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(3828851)
        });
        const statusRail = mesh(new THREE.BoxGeometry(.022, .014, .44), this.heroStatusMat, {
            layer: 2
        });
        statusRail.position.set(.297, 1.365, 0);
        g.add(statusRail);
        this.heroStatusRail = statusRail;
        this.heroSocketMats = [];
        const pins = [ [ 0, .026 ], [ -.028, .006 ], [ .028, .006 ], [ -.018, -.027 ], [ .018, -.027 ] ];
        for (const side of [ -1, 1 ]) {
            const zz = side * .113;
            const ringMat = mat.socketRing;
            const ring = mesh(new THREE.TorusGeometry(.075, .0095, 8, 40), ringMat, {
                cast: true
            });
            ring.position.set(.278, .835, zz);
            ring.rotation.y = PI / 2;
            g.add(ring);
            const ringInner = mesh(new THREE.TorusGeometry(.061, .004, 6, 32), mat.chrome, {});
            ringInner.position.set(.282, .835, zz);
            ringInner.rotation.y = PI / 2;
            g.add(ringInner);
            const portMat = new THREE.MeshBasicMaterial({
                color: 462866
            });
            this.heroSocketMats.push(portMat);
            const port = mesh(new THREE.CircleGeometry(.0602, 32), portMat, {
                layer: 2
            });
            port.position.set(.2785, .835, zz);
            port.rotation.y = PI / 2;
            g.add(port);
            for (let p = 0; p < 5; p++) {
                const pin = mesh(new THREE.CylinderGeometry(.0043, .0043, .02, 6), mat.chrome, {});
                pin.rotation.z = PI / 2;
                pin.position.set(.287, .835 + pins[p][1], zz + pins[p][0]);
                g.add(pin);
            }
            const dustRing = mesh(new THREE.RingGeometry(.065, .0715, 32), new THREE.MeshBasicMaterial({
                color: new THREE.Color(5617602).multiplyScalar(.4),
                transparent: true,
                opacity: .45,
                side: THREE.DoubleSide,
                depthWrite: false,
                toneMapped: false
            }), {
                layer: 2
            });
            dustRing.position.set(.2792, .835, zz);
            dustRing.rotation.y = PI / 2;
            g.add(dustRing);
        }
        const brand = mesh(new THREE.PlaneGeometry(.3, .075), new THREE.MeshBasicMaterial({
            map: textures.dockBrand,
            toneMapped: true
        }), {});
        brand.rotation.y = PI / 2;
        brand.position.set(.276, .515, 0);
        g.add(brand);
        for (let v = 0; v < 5; v++) {
            const slot = mesh(new THREE.BoxGeometry(.01, .012, .3), mat.rubberEdge, {});
            slot.position.set(.267, .27 + v * .041, 0);
            g.add(slot);
        }
        const hanger = mesh(new THREE.BoxGeometry(.034, .026, .45), mat.chrome, {});
        hanger.position.set(.3, 1.09, 0);
        g.add(hanger);
        for (const side of [ -1, 1 ]) {
            const hook = mesh(new THREE.TorusGeometry(.045, .007, 5, 12, PI * 1.35), mat.chrome, {});
            hook.position.set(.31, 1.055, side * .21);
            hook.rotation.y = PI / 2;
            hook.rotation.z = -.2;
            g.add(hook);
        }
        const cableMatA = mat.rubber;
        const cableMatB = mat.rubberEdge;
        const curveA = this.cableCurves[0];
        const curveB = this.cableCurves[1];
        const tubeA = mesh(new THREE.TubeGeometry(curveA, 140, .03, 9, false), cableMatA, {
            cast: true
        });
        const tubeB = mesh(new THREE.TubeGeometry(curveB, 120, .025, 8, false), cableMatB, {
            cast: true
        });
        g.add(tubeA, tubeB);
        for (const t of [ .11, .83 ]) {
            const p = curveA.getPointAt(t);
            const cuff = mesh(new THREE.TorusGeometry(.033, .0055, 5, 16), mat.chrome, {});
            cuff.position.copy(p);
            const tangent = curveA.getTangentAt(t);
            cuff.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
            g.add(cuff);
        }
        this.cablePulseUniforms = {
            uPulse: {
                value: -1
            },
            uActive: {
                value: 0
            },
            uColor: {
                value: new THREE.Color(8650729)
            }
        };
        const pulseMat = new THREE.ShaderMaterial({
            uniforms: this.cablePulseUniforms,
            vertexShader: `\n        varying vec2 vUv;\n        void main() {\n          vUv = uv;\n          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n        }\n      `,
            fragmentShader: `\n        uniform float uPulse;\n        uniform float uActive;\n        uniform vec3 uColor;\n        varying vec2 vUv;\n        void main() {\n          float d = abs(vUv.x - uPulse);\n          float head = smoothstep(0.055, 0.0, d);\n          float trail = uPulse > vUv.x ? exp(-(uPulse - vUv.x) * 15.0) : 0.0;\n          float body = 0.022;\n          float glow = head * 4.5 + trail * 0.75 + body;\n          gl_FragColor = vec4(uColor * glow, (head * 0.9 + trail * 0.22 + body) * uActive);\n        }\n      `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false
        });
        const glowTube = mesh(new THREE.TubeGeometry(curveA, 150, .037, 7, false), pulseMat, {
            layer: 2
        });
        glowTube.renderOrder = 4;
        g.add(glowTube);
        this.cableGlowTube = glowTube;
        const sparkMat = new THREE.SpriteMaterial({
            map: textures.radial,
            color: new THREE.Color(11403252),
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: true
        });
        this.dockSpark = new THREE.Sprite(sparkMat);
        this.dockSpark.scale.set(.16, .16, 1);
        this.dockSpark.position.copy(curveA.getPointAt(0));
        this.dockSpark.layers.set(2);
        this.dockSpark.renderOrder = 5;
        g.add(this.dockSpark);
        this.dockHaloMat = new THREE.MeshBasicMaterial({
            map: textures.floorPool,
            color: new THREE.Color(7860200),
            transparent: true,
            opacity: .1,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            toneMapped: true
        });
        this.dockHalo = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.9), this.dockHaloMat);
        this.dockHalo.rotation.x = -PI / 2;
        this.dockHalo.position.set(.25, .018, -.1);
        this.dockHalo.layers.set(1);
        this.dockHalo.renderOrder = 4;
        g.add(this.dockHalo);
        const edge = mesh(new THREE.BoxGeometry(.015, .95, .012), new THREE.MeshBasicMaterial({
            color: new THREE.Color(3233631).multiplyScalar(.65),
            toneMapped: true
        }), {
            layer: 2,
            cast: false
        });
        edge.position.set(.245, .68, .232);
        g.add(edge);
        this.dockLight = new THREE.PointLight(7536611, .18, 2.8, 2);
        this.dockLight.position.set(.42, .5, 0);
        g.add(this.dockLight);
        const tagMat = new THREE.SpriteMaterial({
            map: textures.dockTag,
            color: 16777215,
            transparent: true,
            opacity: .62,
            depthWrite: false,
            depthTest: false
        });
        this.dockTag = new THREE.Sprite(tagMat);
        this.dockTag.scale.set(.78, .19, 1);
        this.dockTag.position.set(.32, 1.72, 0);
        this.dockTag.layers.set(1);
        this.dockTag.renderOrder = 10;
        g.add(this.dockTag);
        const hit = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.66, .98), new THREE.MeshBasicMaterial({
            visible: false
        }));
        hit.position.set(.1, .82, 0);
        hit.userData.interactive = "dock";
        hit.userData.label = "DOCK 02";
        hit.name = "Dock 02 pick proxy";
        g.add(hit);
        this.rayTargets.push(hit);
        this.dockPick = hit;
        this.dockHoverTargets = [ hit ];
        this.dispatchEvent(new CustomEvent("dockinteractive", {
            detail: {
                object: g
            }
        }));
    }
    buildCeiling() {
        const {scene: scene, mat: mat, textures: textures} = this;
        const group = new THREE.Group;
        group.name = "Overhead services";
        scene.add(group);
        this.addLadderTray(group, {
            x: -1.27,
            y: 3.37,
            width: .62,
            zStart: 6.9,
            zEnd: -14.4,
            rungStep: .48,
            cables: 7,
            name: "Main cable tray A"
        });
        addBox(group, .56, .03, 21, mat.tray, -2.22, 3.55, -4, {
            cast: true
        });
        addBox(group, .035, .15, 21, mat.tray, -2.5, 3.6, -4);
        addBox(group, .035, .15, 21, mat.tray, -1.94, 3.6, -4);
        const racewayCables = [ [ -2.33, 3.6, -4, .024 ], [ -2.23, 3.62, -4, .018 ], [ -2.12, 3.61, -4, .028 ] ];
        for (const [x, y, z, r] of racewayCables) {
            const cable = mesh(new THREE.CylinderGeometry(r, r, 20.9, 6), new THREE.MeshStandardMaterial({
                color: 1844008,
                roughness: .62,
                metalness: .2
            }), {});
            cable.rotation.x = PI / 2;
            cable.position.set(x, y, z);
            group.add(cable);
        }
        this.signalUniforms = {
            uWaveZ: {
                value: -40
            },
            uActive: {
                value: 0
            },
            uMood: {
                value: 0
            },
            uColor: {
                value: new THREE.Color(16730918)
            },
            uBase: {
                value: new THREE.Color(2242876)
            }
        };
        const signalMat = new THREE.ShaderMaterial({
            uniforms: this.signalUniforms,
            vertexShader: `\n        varying vec3 vWorld;\n        void main() {\n          vec4 world = modelMatrix * vec4(position, 1.0);\n          vWorld = world.xyz;\n          gl_Position = projectionMatrix * viewMatrix * world;\n        }\n      `,
            fragmentShader: `\n        uniform float uWaveZ;\n        uniform float uActive;\n        uniform float uMood;\n        uniform vec3 uColor;\n        uniform vec3 uBase;\n        varying vec3 vWorld;\n        void main() {\n          float d = vWorld.z - uWaveZ;\n          float band = exp(-d * d / 5.5) * uActive;\n          float edge = exp(-d * d / 0.32) * uActive;\n          vec3 c = mix(uBase, uColor, clamp(band * 1.3 + uMood * 0.8, 0.0, 1.0));\n          float a = 0.062 + band * 0.82 + edge * 0.7 + uMood * 0.08;\n          gl_FragColor = vec4(c * (1.0 + band * 2.2 + edge * 4.0 + uMood * 0.7), a);\n        }\n      `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            toneMapped: false
        });
        this.traySignalMat = signalMat;
        const strips = [ [ -.94, 3.295, .037, 21.2, -3.9 ], [ -1.58, 3.295, .037, 21.2, -3.9 ], [ -2.22, 3.53, .03, 20.9, -4 ] ];
        for (const [x, y, w, l, z] of strips) {
            const strip = mesh(new THREE.PlaneGeometry(w, l), signalMat, {
                layer: 0
            });
            strip.rotation.x = -PI / 2;
            strip.position.set(x, y, z);
            strip.renderOrder = 3;
            group.add(strip);
        }
        this.fixtureLights = [];
        const fixtures = [ {
            z: 2.1,
            x: .4,
            length: 1.85,
            power: 112,
            shadow: true
        }, {
            z: -2.85,
            x: .18,
            length: 1.7,
            power: 92,
            shadow: false
        }, {
            z: -7.7,
            x: .47,
            length: 1.7,
            power: 78,
            shadow: false
        }, {
            z: -12.55,
            x: .2,
            length: 1.6,
            power: 64,
            shadow: false
        } ];
        this.fixtures = fixtures;
        this.lampLineZ = fixtures.map(f => f.z);
        for (const f of fixtures) this.addLinearFixture(group, f);
        this.addLinearFixture(group, {
            z: AISLE.backZ + .62,
            x: -.4,
            length: .72,
            power: 11,
            shadow: false,
            height: 3.12,
            small: true
        });
        for (const z of [ -1.15, -6.15, -11.15 ]) {
            for (const [y, r] of [ [ 3.78, .024 ], [ 3.87, .015 ] ]) {
                const run = mesh(new THREE.CylinderGeometry(r, r, 5.85, 8), mat.galvanized, {
                    cast: false
                });
                run.rotation.z = PI / 2;
                run.position.set(-.18, y, z);
                group.add(run);
            }
            for (const cx of [ -2.72, 2.36 ]) {
                const clamp = mesh(new THREE.BoxGeometry(.06, .055, .11), mat.darkSteel, {});
                clamp.position.set(cx, 3.79, z);
                group.add(clamp);
            }
        }
        addBox(group, .24, .1, 13.4, mat.tray, .92, 3.93, -4.9, {
            cast: true
        });
        addBox(group, .26, .014, 13.4, mat.paleMetal, .92, 3.885, -4.9);
        for (let i = 0; i < 7; i++) {
            addBox(group, .27, .055, .035, mat.darkSteel, .92, 3.955, 1.4 - i * 1.9);
        }
        const dropMat = mat.chrome;
        for (let i = 0; i < 10; i++) {
            const z = 5.5 - i * 2.8;
            const rod = mesh(new THREE.CylinderGeometry(.009, .009, .65, 6), dropMat, {});
            rod.position.set(-1.27, 3.84, z);
            group.add(rod);
            const clamp = mesh(new THREE.TorusGeometry(.045, .006, 5, 12), mat.darkSteel, {});
            clamp.rotation.x = PI / 2;
            clamp.position.set(-1.27, 3.52, z);
            group.add(clamp);
        }
        const sensor = new THREE.Group;
        sensor.position.set(2.56, 3.46, -6.2);
        const sensorBox = mesh(new RoundedBoxGeometry(.22, .15, .28, 2, .02), mat.darkSteel, {
            cast: true
        });
        sensor.add(sensorBox);
        const eye = mesh(new THREE.CylinderGeometry(.045, .045, .04, 18), mat.blackMetal, {});
        eye.rotation.z = PI / 2;
        eye.position.x = -.14;
        sensor.add(eye);
        const sensorLED = mesh(new THREE.SphereGeometry(.014, 10, 8), new THREE.MeshBasicMaterial({
            color: new THREE.Color(6553550).multiplyScalar(1.7),
            toneMapped: false
        }), {
            layer: 2
        });
        sensorLED.position.set(-.16, .04, .05);
        sensor.add(sensorLED);
        group.add(sensor);
        this.ceilingGroup = group;
    }
    addLinearFixture(parent, f) {
        const {mat: mat} = this;
        const group = new THREE.Group;
        group.name = `Luminaire z=${f.z}`;
        const y = f.height ?? 3.18;
        const housing = mesh(new RoundedBoxGeometry(f.length, .055, .17, 2, .014), mat.darkSteel, {
            cast: true
        });
        housing.position.set(f.x, y + .06, f.z);
        group.add(housing);
        for (const side of [ -1, 1 ]) {
            const cap = mesh(new THREE.BoxGeometry(.055, .07, .185), mat.galvanized, {
                cast: true
            });
            cap.position.set(f.x + side * f.length / 2, y + .055, f.z);
            group.add(cap);
        }
        const diffuserMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(14674674).multiplyScalar(f.small ? 1.5 : 1.9),
            toneMapped: true
        });
        const diffuser = mesh(new THREE.PlaneGeometry(f.length - .1, .085), diffuserMat, {
            layer: 0
        });
        diffuser.rotation.x = PI / 2;
        diffuser.position.set(f.x, y + .018, f.z);
        group.add(diffuser);
        for (const side of [ -1, 1 ]) {
            const rod = mesh(new THREE.CylinderGeometry(.007, .007, AISLE.ceiling - y - .08, 5), mat.chrome, {});
            rod.position.set(f.x + side * (f.length * .38), (AISLE.ceiling + y) / 2, f.z);
            group.add(rod);
        }
        const glareMat = new THREE.MeshBasicMaterial({
            map: this.textures.radial,
            color: new THREE.Color(10209258),
            transparent: true,
            opacity: f.small ? .035 : .07,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        const glare = new THREE.Mesh(new THREE.PlaneGeometry(f.length * 1.35, .62), glareMat);
        glare.rotation.x = PI / 2;
        glare.position.set(f.x, y + .005, f.z);
        glare.layers.set(1);
        group.add(glare);
        const spot = new THREE.SpotLight(14148588, f.power, f.small ? 6.5 : 10.5, f.small ? .75 : .98, .82, 2);
        spot.position.set(f.x, y - .03, f.z);
        spot.target.position.set(f.x - .2, 0, f.z - .5);
        spot.castShadow = !!f.shadow;
        if (f.shadow) {
            spot.shadow.mapSize.set(2048, 2048);
            spot.shadow.camera.near = .4;
            spot.shadow.camera.far = 9.5;
            spot.shadow.bias = -25e-5;
            spot.shadow.normalBias = .02;
            spot.shadow.radius = 2.2;
        }
        group.add(spot, spot.target);
        this.fixtureLights.push(spot);
        parent.add(group);
        return group;
    }
    buildFarEnd() {
        const {scene: scene, mat: mat, textures: textures} = this;
        const g = new THREE.Group;
        g.name = "End wall";
        scene.add(g);
        const backTex = this.textures.wall.clone();
        backTex.wrapS = THREE.RepeatWrapping;
        backTex.wrapT = THREE.RepeatWrapping;
        backTex.repeat.set(.95, 1);
        backTex.needsUpdate = true;
        const backMat = new THREE.MeshStandardMaterial({
            map: backTex,
            color: 9345697,
            metalness: .2,
            roughness: .74,
            envMapIntensity: .8
        });
        const back = new THREE.Mesh(new THREE.PlaneGeometry(7.55, 4.25), backMat);
        back.position.set(.2, 2.125, AISLE.backZ);
        back.receiveShadow = true;
        g.add(back);
        addBox(g, 7.55, .82, .12, mat.wallDark, .2, .41, AISLE.backZ + .04);
        addBox(g, 7.55, .028, .13, mat.chrome, .2, .84, AISLE.backZ + .055);
        addBox(g, 7.55, .035, .13, mat.paleMetal, .2, 2.92, AISLE.backZ + .055);
        const doorX = -.34;
        const doorZ = AISLE.backZ + .085;
        addBox(g, .08, 2.62, .18, mat.galvanized, doorX - .71, 1.31, doorZ);
        addBox(g, .08, 2.62, .18, mat.galvanized, doorX + .71, 1.31, doorZ);
        addBox(g, 1.5, .08, .18, mat.galvanized, doorX, 2.63, doorZ);
        addBox(g, 1.58, .03, .46, mat.darkSteel, doorX, .025, doorZ + .06);
        const door = new THREE.Mesh(new THREE.PlaneGeometry(1.28, 2.48), new THREE.MeshStandardMaterial({
            map: this.textures.farDoor,
            color: 7634047,
            roughness: .63,
            metalness: .35,
            envMapIntensity: .5
        }));
        door.position.set(doorX, 1.28, doorZ + .095);
        g.add(door);
        addBox(g, .035, .24, .045, mat.handle, doorX + .41, 1.15, doorZ + .13, {
            cast: true
        });
        addBox(g, .035, .26, .07, mat.darkSteel, doorX + .43, 1.15, doorZ + .12);
        addBox(g, .035, .26, .07, mat.darkSteel, doorX + .39, 1.15, doorZ + .12);
        const plate = new THREE.Mesh(new THREE.PlaneGeometry(.3, .095), new THREE.MeshBasicMaterial({
            map: this.textures.doorSign,
            toneMapped: true
        }));
        plate.position.set(doorX, 2.76, doorZ + .1);
        g.add(plate);
        const notice = new THREE.Mesh(new THREE.PlaneGeometry(.29, .39), new THREE.MeshStandardMaterial({
            map: this.textures.noticePaper,
            roughness: .85,
            metalness: 0
        }));
        notice.position.set(doorX - .29, 1.58, doorZ + .11);
        notice.rotation.z = .025;
        g.add(notice);
        const accessPlate = new THREE.Mesh(new THREE.PlaneGeometry(.23, .34), new THREE.MeshStandardMaterial({
            map: this.textures.noticeDark,
            roughness: .66,
            metalness: .04
        }));
        accessPlate.position.set(doorX + .31, 1.12, doorZ + .112);
        g.add(accessPlate);
        const bigNotice = new THREE.Mesh(new THREE.PlaneGeometry(.42, .54), new THREE.MeshStandardMaterial({
            map: this.textures.noticePaper,
            roughness: .86,
            metalness: 0,
            color: 14212566
        }));
        bigNotice.position.set(doorX + .02, 1.72, doorZ + .115);
        bigNotice.rotation.z = -.018;
        g.add(bigNotice);
        const cautionStrip = new THREE.Mesh(new THREE.PlaneGeometry(.42, .055), new THREE.MeshBasicMaterial({
            map: this.textures.hazardTape,
            color: 13612399,
            toneMapped: true
        }));
        cautionStrip.position.set(doorX + .02, 1.38, doorZ + .118);
        g.add(cautionStrip);
        addBox(g, .98, 2.16, .09, mat.cabinetEdge, doorX + 1.55, 1.1, doorZ - .02, {
            cast: true
        });
        addBox(g, .1, .38, .04, mat.handle, doorX + 1.12, 1.1, doorZ + .035);
        const rightHatch = new THREE.Mesh(new THREE.PlaneGeometry(.17, .24), new THREE.MeshBasicMaterial({
            map: this.textures.warningDecal,
            color: 6976367,
            toneMapped: true
        }));
        rightHatch.position.set(doorX + 1.55, 1.45, doorZ + .04);
        g.add(rightHatch);
        const exit = new THREE.Mesh(new THREE.PlaneGeometry(.53, .17), new THREE.MeshBasicMaterial({
            map: this.textures.exitSign,
            toneMapped: true
        }));
        exit.position.set(-1.36, 2.36, doorZ + .12);
        g.add(exit);
        const exitHalo = new THREE.Mesh(new THREE.PlaneGeometry(.75, .36), new THREE.MeshBasicMaterial({
            map: this.textures.radial,
            color: 6750143,
            transparent: true,
            opacity: .14,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        }));
        exitHalo.position.set(-1.36, 2.36, doorZ + .08);
        exitHalo.layers.set(1);
        g.add(exitHalo);
        addBox(g, .92, 1.56, .1, mat.cabinetEdge, 1.48, 1.02, doorZ - .015, {
            cast: true
        });
        addBox(g, .82, .08, .08, mat.chrome, 1.48, 1.78, doorZ + .03);
        const hatchScreen = new THREE.Mesh(new THREE.PlaneGeometry(.3, .16), new THREE.MeshBasicMaterial({
            map: this.textures.screenGeneric,
            color: 9350838,
            toneMapped: true
        }));
        hatchScreen.position.set(1.48, 1.48, doorZ + .045);
        g.add(hatchScreen);
        addBox(g, .05, .24, .04, mat.handle, 1.9, .98, doorZ + .055);
        addBox(g, .12, .2, .06, mat.red, 2.68, .42, doorZ + .07);
        const pipe = mesh(new THREE.CylinderGeometry(.026, .03, 2.9, 8), mat.galvanized, {
            cast: true
        });
        pipe.position.set(2.93, 2.55, doorZ + .03);
        g.add(pipe);
        for (let i = 0; i < 4; i++) {
            const clamp = mesh(new THREE.TorusGeometry(.04, .008, 5, 12), mat.darkSteel, {});
            clamp.position.set(2.93, 1.35 + i * .62, doorZ + .03);
            clamp.rotation.x = PI / 2;
            g.add(clamp);
        }
        addBox(g, .62, .055, .16, mat.darkSteel, doorX, 2.84, doorZ + .1, {
            cast: true
        });
        const soffit = new THREE.Mesh(new THREE.PlaneGeometry(.55, .12), new THREE.MeshBasicMaterial({
            color: new THREE.Color(14807807).multiplyScalar(2.8),
            toneMapped: true
        }));
        soffit.rotation.x = PI / 2;
        soffit.position.set(doorX, 2.81, doorZ + .1);
        g.add(soffit);
        const doorGlow = new THREE.PointLight(12573416, 2.1, 5, 2);
        doorGlow.position.set(doorX, 2.6, doorZ + .25);
        g.add(doorGlow);
        const farFill = new THREE.PointLight(10335168, 3.2, 9, 2);
        farFill.position.set(.3, 2.55, AISLE.backZ + 1.2);
        g.add(farFill);
        const readerLED = new THREE.Mesh(new THREE.PlaneGeometry(.018, .018), new THREE.MeshBasicMaterial({
            color: new THREE.Color(6619067).multiplyScalar(3),
            toneMapped: false
        }));
        readerLED.position.set(doorX + .38, 1.23, doorZ + .14);
        readerLED.layers.set(2);
        g.add(readerLED);
        addBox(g, 1.7, .012, .07, mat.chrome, .2, .012, AISLE.backZ + .95);
        const rearStencil = new THREE.Mesh(new THREE.PlaneGeometry(.72, 1.4), new THREE.MeshBasicMaterial({
            map: this.textures.baseAO,
            transparent: true,
            opacity: .35,
            color: 0,
            depthWrite: false
        }));
        rearStencil.rotation.x = -PI / 2;
        rearStencil.position.set(doorX, .015, AISLE.backZ + 1.1);
        rearStencil.layers.set(1);
        g.add(rearStencil);
        this.buildWarningBeacon(g);
    }
    buildWarningBeacon(parent) {
        const c = this.beaconCabinetData || this.cabinetData[Math.min(AISLE.beaconCabinet, this.cabinetData.length - 1)];
        const z = c ? c.z - .24 : -17.2;
        const y = (c ? c.height : 2.45) + .065;
        const x = 1.37;
        const beacon = new THREE.Group;
        beacon.name = "Far warning beacon";
        beacon.position.set(x, y, z);
        parent.add(beacon);
        const base = mesh(new THREE.CylinderGeometry(.079, .094, .07, 24), this.mat.darkSteel, {
            cast: true
        });
        base.position.y = .035;
        beacon.add(base);
        const gasket = mesh(new THREE.TorusGeometry(.068, .009, 7, 24), this.mat.rubberEdge, {});
        gasket.rotation.x = PI / 2;
        gasket.position.y = .062;
        beacon.add(gasket);
        this.beaconOuterMat = new THREE.MeshPhysicalMaterial({
            color: 4130564,
            emissive: 10687749,
            emissiveIntensity: 2.1,
            roughness: .16,
            metalness: .1,
            transparent: true,
            opacity: .73,
            clearcoat: 1,
            clearcoatRoughness: .05,
            envMapIntensity: .9
        });
        const dome = mesh(new THREE.SphereGeometry(.082, 28, 16, 0, PI * 2, 0, PI / 2), this.beaconOuterMat, {
            layer: 0
        });
        dome.position.y = .069;
        dome.scale.y = 1.08;
        beacon.add(dome);
        this.beaconCoreMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(16723215).multiplyScalar(3.2),
            toneMapped: false
        });
        const bulb = mesh(new THREE.SphereGeometry(.042, 16, 12), this.beaconCoreMat, {
            layer: 2
        });
        bulb.position.y = .107;
        beacon.add(bulb);
        for (let i = 0; i < 3; i++) {
            const a = i / 3 * PI * 2;
            const bar = mesh(new THREE.CylinderGeometry(.004, .004, .13, 5), this.mat.chrome, {});
            bar.position.set(Math.cos(a) * .086, .12, Math.sin(a) * .086);
            bar.rotation.z = Math.cos(a) * .12;
            bar.rotation.x = Math.sin(a) * .12;
            beacon.add(bar);
        }
        const ring = mesh(new THREE.TorusGeometry(.086, .005, 6, 24), this.mat.chrome, {});
        ring.rotation.x = PI / 2;
        ring.position.y = .18;
        beacon.add(ring);
        this.beaconLight = new THREE.PointLight(16726807, 3.8, 5.6, 2);
        this.beaconLight.position.set(0, .22, 0);
        beacon.add(this.beaconLight);
        this.beaconHaloMat = new THREE.SpriteMaterial({
            map: this.textures.radial,
            color: new THREE.Color(16728866),
            transparent: true,
            opacity: .28,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: true
        });
        this.beaconHalo = new THREE.Sprite(this.beaconHaloMat);
        this.beaconHalo.scale.set(.98, .98, 1);
        this.beaconHalo.position.y = .14;
        this.beaconHalo.layers.set(1);
        beacon.add(this.beaconHalo);
        const plate = mesh(new THREE.PlaneGeometry(.2, .055), new THREE.MeshBasicMaterial({
            map: this.textures.plateRack,
            color: 7568252,
            toneMapped: true
        }), {});
        plate.rotation.y = -PI / 2;
        plate.position.set(-.09, .05, -.14);
        beacon.add(plate);
        const hit = new THREE.Mesh(new THREE.SphereGeometry(.48, 12, 8), new THREE.MeshBasicMaterial({
            visible: false
        }));
        hit.position.y = .13;
        hit.userData.interactive = "beacon";
        hit.userData.label = "WARNING BEACON";
        hit.name = "Beacon pick proxy";
        beacon.add(hit);
        this.rayTargets.push(hit);
        this.beaconPick = hit;
        this.beacon = beacon;
    }
    buildDust() {
        const rand = mulberry32(774);
        const count = 560;
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            positions[i * 3] = -2.9 + rand() * 5.9;
            positions[i * 3 + 1] = .25 + rand() * 3.45;
            positions[i * 3 + 2] = -21.5 + rand() * 27;
            sizes[i] = .5 + rand();
        }
        const geo = new THREE.BufferGeometry;
        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({
            map: this.textures.dust,
            color: 12573160,
            size: .018,
            transparent: true,
            opacity: .38,
            depthWrite: false,
            depthTest: true,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });
        this.dust = new THREE.Points(geo, mat);
        this.dust.layers.set(1);
        this.dust.renderOrder = 2;
        this.scene.add(this.dust);
        this.dustMaterial = mat;
    }
    buildAtmosphereMotes() {
        const rand = mulberry32(818);
        const count = 46;
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            positions[i * 3] = -1.8 + rand() * 4;
            positions[i * 3 + 1] = .55 + rand() * 2.15;
            positions[i * 3 + 2] = -6 + rand() * 11;
        }
        const geo = new THREE.BufferGeometry;
        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({
            map: this.textures.radial,
            color: 9549775,
            size: .05,
            transparent: true,
            opacity: .11,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });
        this.motes = new THREE.Points(geo, mat);
        this.motes.layers.set(1);
        this.scene.add(this.motes);
    }
    buildLighting() {
        const {scene: scene} = this;
        this.hemi = new THREE.HemisphereLight(12041406, 526601, 1);
        scene.add(this.hemi);
        this.ambient = new THREE.AmbientLight(2764079, .6);
        scene.add(this.ambient);
        this.dirFill = new THREE.DirectionalLight(13094352, .78);
        this.dirFill.position.set(4.5, 6.2, 3.5);
        this.dirFill.target.position.set(-.4, .8, -7.5);
        scene.add(this.dirFill, this.dirFill.target);
        const sideFill = new THREE.PointLight(11188157, 12, 10.5, 2);
        sideFill.position.set(-2.55, 2.72, 1);
        scene.add(sideFill);
        const midFill = new THREE.PointLight(11516865, 10, 12, 2);
        midFill.position.set(-1.6, 2.55, -7.8);
        scene.add(midFill);
        this.washLights = [];
        const washSpecs = [ {
            x: .02,
            y: 1.7,
            z: 1.7,
            tx: 1.42,
            ty: 1.15,
            tz: 1.2,
            w: 2.4,
            h: 1.2,
            intensity: 35
        }, {
            x: .02,
            y: 1.7,
            z: -4.25,
            tx: 1.42,
            ty: 1.15,
            tz: -4.8,
            w: 2.4,
            h: 1.2,
            intensity: 28
        }, {
            x: .02,
            y: 1.7,
            z: -9.8,
            tx: 1.42,
            ty: 1.15,
            tz: -10.4,
            w: 2.2,
            h: 1.1,
            intensity: 21
        }, {
            x: -.2,
            y: 1.75,
            z: .8,
            tx: -3.3,
            ty: 1.35,
            tz: .1,
            w: 2.4,
            h: 1.35,
            intensity: 15
        }, {
            x: -.2,
            y: 1.75,
            z: -7.6,
            tx: -3.3,
            ty: 1.35,
            tz: -8.4,
            w: 2.2,
            h: 1.2,
            intensity: 10
        } ];
        for (const spec of washSpecs) {
            const wash = new THREE.RectAreaLight(13819363, spec.intensity, spec.w, spec.h);
            wash.position.set(spec.x, spec.y, spec.z);
            wash.lookAt(spec.tx, spec.ty, spec.tz);
            scene.add(wash);
            this.washLights.push(wash);
        }
        const ceilingFill1 = new THREE.PointLight(10466240, 4.8, 5.5, 2);
        ceilingFill1.position.set(-.6, 3.62, 2.2);
        scene.add(ceilingFill1);
        const dockFill = new THREE.PointLight(13161430, 6, 4, 2);
        dockFill.position.set(-.9, 1.55, 2.9);
        scene.add(dockFill);
        const ceilingFill2 = new THREE.PointLight(10466240, 3.8, 5.5, 2);
        ceilingFill2.position.set(-.9, 3.55, -6.5);
        scene.add(ceilingFill2);
        this.waveLight = new THREE.PointLight(16730662, 0, 7.5, 2);
        this.waveLight.position.set(.8, 2.7, -10.8);
        scene.add(this.waveLight);
        this.baseFog = this.scene.fog.color.clone();
        this.warningFog = new THREE.Color(1574660);
        this.baseHemiSky = this.hemi.color.clone();
        this.warningHemiSky = new THREE.Color(9063480);
        this.baseHemiGround = this.hemi.groundColor.clone();
        this.warningHemiGround = new THREE.Color(1049346);
        this.baseBackground = this.scene.background.clone();
        this.warningBackground = new THREE.Color(722180);
        this.baseDirColor = this.dirFill.color.clone();
        this.warningDirColor = new THREE.Color(13995634);
        for (const light of this.fixtureLights) {
            light.userData.baseIntensity = light.intensity;
            light.userData.baseColor = light.color.clone();
        }
    }
    setDockReady(ready) {
        ready = !!ready;
        if (this.state.dockReady === ready) return;
        this.state.dockReady = ready;
        this.state.dockPulseStart = this.elapsed;
        this.state.dockPulseActive = true;
        if (this.heroScreenMat) {
            this.heroScreenMat.map = ready ? this.textures.screenReadyHero : this.textures.screenIdleHero;
            this.heroScreenMat.needsUpdate = true;
        }
        if (this.dockPick) {
            this.dockPick.userData.label = ready ? "DOCK 02 / READY" : "DOCK 02 / VACANT";
        }
        this.dispatchEvent(new CustomEvent("dockchange", {
            detail: {
                ready: ready,
                label: ready ? "READY" : "IDLE"
            }
        }));
    }
    setDockHovered(hovered) {
        this.state.dockHover = !!hovered;
    }
    setBeaconHovered(hovered) {
        this.state.beaconHover = !!hovered;
    }
    triggerBeacon() {
        if (this.state.warning) return false;
        this.state.warning = true;
        this.state.warningStart = this.elapsed;
        this.state.warningCount += 1;
        this.dispatchEvent(new CustomEvent("warningstart", {
            detail: {
                waveStart: -11.4,
                waveEnd: 6.8
            }
        }));
        return true;
    }
    resetCamera() {
        const damping = this.controls.enableDamping;
        this.controls.enableDamping = false;
        this.controls.update();
        this.camera.position.set(-.22, 1.62, 5.95);
        this.controls.target.copy(this.initialTarget);
        this.controls.update();
        this.controls.enableDamping = damping;
        this.camera.updateMatrixWorld();
    }
    setCaptureMode(enabled) {
        if (this.dockTag) this.dockTag.visible = !enabled;
        if (this.stencil) this.stencil.material.opacity = enabled ? .36 : .46;
        this.capture = enabled;
    }
    update(delta) {
        this.elapsed += Math.min(delta, .05);
        const t = this.elapsed;
        this.controls.update();
        this.floor.userData.tick(t);
        const targetGlow = this.state.dockReady ? 1 : 0;
        this.state.dockGlow = THREE.MathUtils.damp(this.state.dockGlow, targetGlow, 2.3, delta);
        this.floor.userData.setDockReady(this.state.dockGlow);
        const pulseAge = t - (this.state.dockPulseStart ?? -100);
        let pulse = 0;
        if (this.state.dockPulseActive && pulseAge >= 0 && pulseAge < 1.85) {
            const p = THREE.MathUtils.clamp(pulseAge / 1.7, 0, 1);
            const eased = p * p * (3 - 2 * p);
            pulse = eased;
            this.cablePulseUniforms.uPulse.value = .015 + eased * .96;
            this.cablePulseUniforms.uActive.value = Math.min(1, p * 8) * (1 - THREE.MathUtils.smoothstep(p, .8, 1));
            const point = this.cableCurves[0].getPointAt(THREE.MathUtils.clamp(eased, .01, .99));
            this.dockSpark.position.copy(point);
            this.dockSpark.material.opacity = .85 * Math.sin(p * PI);
            this.dockSpark.scale.setScalar(.14 + Math.sin(p * PI) * .08);
            this.floor.userData.setDockPulse(THREE.MathUtils.clamp(pulseAge / 1.5, 0, 1));
        } else {
            if (this.state.dockPulseActive && pulseAge >= 1.85) {
                this.state.dockPulseActive = false;
                this.floor.userData.setDockPulse(0);
            }
            this.cablePulseUniforms.uPulse.value = -1;
            this.cablePulseUniforms.uActive.value = 0;
            this.dockSpark.material.opacity = 0;
        }
        const glow = this.state.dockGlow;
        const idlePulse = .5 + Math.sin(t * 1.75) * .5;
        const hoverLift = this.state.dockHover && !this.state.dockReady ? .05 : 0;
        if (this.dockHaloMat) {
            this.dockHaloMat.opacity = .1 + hoverLift + glow * (.25 + idlePulse * .05);
            this.dockHaloMat.color.setRGB(THREE.MathUtils.lerp(.28, .43, glow), THREE.MathUtils.lerp(.86, 1, glow), THREE.MathUtils.lerp(.88, .82, glow));
            this.dockHalo.scale.set(1 + glow * .24 + Math.sin(t * 1.2) * .01, 1 + glow * .15, 1);
        }
        if (this.heroStatusMat) {
            const c1 = new THREE.Color(7853275);
            const c2 = new THREE.Color(10485716);
            const col = c1.lerp(c2, glow);
            this.heroStatusMat.color.copy(col).multiplyScalar(.95 + glow * 2.2 + idlePulse * .15);
        }
        if (this.dockLight) {
            this.dockLight.intensity = .14 + glow * 1.1 + (this.state.dockHover ? .18 : 0);
            this.dockLight.color.setRGB(.4 + glow * .06, .95, .84);
        }
        for (const m of this.heroSocketMats) {
            m.color.setRGB(.02 + glow * .05, .05 + glow * .34, .055 + glow * .27);
        }
        if (this.heroScreenMat) {
            const hoverGlow = this.state.dockHover ? 1.1 : 1;
            this.heroScreenMat.color.setScalar(hoverGlow);
        }
        if (this.dockTag) {
            this.dockTag.material.opacity = this.capture ? 0 : this.state.dockHover ? .88 : .55;
            this.dockTag.material.color.set(glow > .5 ? 10158041 : 14154751);
        }
        if (this.dockSpark && this.dockSpark.material.opacity > 0) {
            this.dockSpark.material.color.set(11993074);
        }
        let beaconBoost = 0;
        let mood = this.state.warningMood;
        let warnActive = 0;
        let waveZ = -40;
        if (this.state.warning) {
            const wt = t - this.state.warningStart;
            const waveT = THREE.MathUtils.clamp((wt - .28) / 2.45, 0, 1);
            waveZ = THREE.MathUtils.lerp(-11.4, 6.8, waveT);
            warnActive = THREE.MathUtils.smoothstep(wt, .2, .55) * (1 - THREE.MathUtils.smoothstep(wt, 2.95, 3.28));
            const up = THREE.MathUtils.smoothstep(wt, .08, .9);
            const down = 1 - THREE.MathUtils.smoothstep(wt, 2.65, 4.55);
            mood = up * down;
            beaconBoost = Math.max(warnActive, Math.max(0, 1 - wt / 1.1));
            this.state.warningWave = waveZ;
            this.state.warningMood = mood;
            if (this.waveLight) {
                this.waveLight.position.set(.85, 2.75, waveZ);
                this.waveLight.intensity = 34 * warnActive + 6 * mood;
            }
            if (wt > 4.85) {
                this.state.warning = false;
                this.state.warningMood = 0;
                this.state.warningWave = -40;
                mood = 0;
                warnActive = 0;
                waveZ = -40;
                if (this.waveLight) this.waveLight.intensity = 0;
                this.dispatchEvent(new CustomEvent("warningend", {
                    detail: {
                        count: this.state.warningCount
                    }
                }));
            }
        } else {
            this.state.warningMood = THREE.MathUtils.damp(this.state.warningMood, 0, 3, delta);
            mood = this.state.warningMood;
            if (this.waveLight) this.waveLight.intensity = THREE.MathUtils.damp(this.waveLight.intensity, 0, 4, delta);
        }
        this.floor.userData.setWarning(mood * .75, warnActive, waveZ);
        if (this.signalUniforms) {
            this.signalUniforms.uWaveZ.value = waveZ;
            this.signalUniforms.uActive.value = warnActive;
            this.signalUniforms.uMood.value = mood * .72;
        }
        const breath = .5 + .5 * Math.sin(t * 1.55 + .4);
        const strong = beaconBoost;
        if (this.beaconOuterMat) {
            this.beaconOuterMat.emissiveIntensity = 1.5 + breath * .65 + strong * 5.5;
        }
        if (this.beaconCoreMat) {
            this.beaconCoreMat.color.setRGB(2.8 + breath * .9 + strong * 5, .16 + strong * 1.3, .055 + strong * .4);
        }
        if (this.beaconLight) {
            this.beaconLight.intensity = 2.6 + breath * .7 + strong * 26;
        }
        if (this.beaconHalo) {
            const s = .88 + breath * .16 + strong * 2.4;
            this.beaconHalo.scale.set(s, s, 1);
            this.beaconHaloMat.opacity = .23 + breath * .09 + strong * .65 + (this.state.beaconHover ? .14 : 0);
        }
        this.updateWarningBars(waveZ, warnActive, mood, t);
        if (this.scene.fog) this.scene.fog.color.copy(this.baseFog).lerp(this.warningFog, mood * .65);
        if (this.scene.background) this.scene.background.copy(this.baseBackground).lerp(this.warningBackground, mood * .4);
        if (this.hemi) {
            this.hemi.color.copy(this.baseHemiSky).lerp(this.warningHemiSky, mood * .6);
            this.hemi.groundColor.copy(this.baseHemiGround).lerp(this.warningHemiGround, mood * .4);
        }
        if (this.dirFill) {
            this.dirFill.color.copy(this.baseDirColor).lerp(this.warningDirColor, mood * .6);
            this.dirFill.intensity = .78 * (1 - mood * .22);
        }
        for (const light of this.fixtureLights) {
            const base = light.userData.baseIntensity || 0;
            const z = light.position.z;
            const rush = Math.exp(-Math.pow((z - waveZ) / 2.1, 2)) * warnActive;
            light.intensity = base * (1 - mood * .2 + rush * .1);
        }
        if (this.dust) {
            this.dust.position.y = Math.sin(t * .08) * .035;
            this.dust.position.x = Math.sin(t * .045 + 1.2) * .045;
            this.dustMaterial.opacity = .33 + Math.sin(t * .4) * .03;
        }
        if (this.motes) {
            this.motes.position.z = Math.sin(t * .055) * .18;
            this.motes.position.y = Math.cos(t * .07) * .025;
        }
        if (this.shaftMaterial) {
            this.shaftMaterial.opacity = .042 + Math.sin(t * .12) * .006 + mood * .012;
        }
        if (this.stencil) {
            this.stencil.material.opacity = (this.capture ? .34 : .44) + Math.sin(t * .55) * .025;
        }
    }
    updateWarningBars(waveZ, active, mood, time) {
        if (!this.warningBars) return;
        const col = this.tempColor;
        const count = this.cabinetData.length;
        for (let i = 0; i < count; i++) {
            const c = this.cabinetData[i];
            const d = c.z - waveZ;
            const wave = Math.exp(-d * d / 3.4) * active;
            const idle = .035 + .02 * Math.sin(time * 1.8 + i * .9);
            const rr = idle * .15 + wave * 2.4 + mood * .11;
            const gg = idle * .38 + wave * .2 + mood * .03;
            const bb = idle * .42 + wave * .06 + mood * .015;
            col.setRGB(rr, gg, bb, THREE.LinearSRGBColorSpace);
            this.warningBars.setColorAt(i * 2, col);
            const verticalWave = Math.exp(-d * d / 1.6) * active;
            col.setRGB(idle * .12 + verticalWave * 1.9 + mood * .08, idle * .3 + verticalWave * .14, idle * .35 + verticalWave * .04, THREE.LinearSRGBColorSpace);
            this.warningBars.setColorAt(i * 2 + 1, col);
        }
        if (this.warningBars.instanceColor) this.warningBars.instanceColor.needsUpdate = true;
    }
}

export function createBay(renderer, textures) {
    const bay = new Bay(renderer, textures);
    return bay;
}
