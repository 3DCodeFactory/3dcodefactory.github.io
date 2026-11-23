import * as THREE from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";

import { RenderPass } from "three/addons/postprocessing/RenderPass.js";

import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

const VIEW_TARGET = new THREE.Vector3(0, 0, 0);

const DEFAULT_CAMERA = new THREE.Vector3(0, 0, 1.4);

const BOARD_HEIGHT = 2;

const GAP = .0035;

const BOARDS = [ {
    id: "b1",
    left: -.662,
    width: .1285,
    depth: .016,
    front: .001,
    tilt: .0016,
    yaw: -.0014,
    side: 8018492,
    phase: .7
}, {
    id: "b2",
    left: -.5335,
    width: .0764,
    depth: .015,
    front: .0015,
    tilt: -.0012,
    yaw: .0016,
    side: 7426099,
    phase: 2.1
}, {
    id: "b3",
    left: -.4571,
    width: .1055,
    depth: .017,
    front: 8e-4,
    tilt: .0022,
    yaw: -.001,
    side: 8215614,
    phase: 4.4
}, {
    id: "b4",
    left: -.3516,
    width: .2082,
    depth: .016,
    front: .0012,
    tilt: -.0015,
    yaw: 8e-4,
    side: 7228464,
    phase: .9
}, {
    id: "b5",
    left: -.1434,
    width: .6267,
    depth: .02,
    front: .0018,
    tilt: -6e-4,
    yaw: -6e-4,
    side: 8806464,
    phase: 3.3,
    hero: true,
    bakedNails: true
}, {
    id: "b6",
    left: .4833,
    width: .62,
    depth: .022,
    front: 9e-4,
    tilt: .0014,
    yaw: 9e-4,
    side: 4601382,
    phase: 5.1,
    tint: [ 1.55, 1.66, 1.58 ],
    bakedNails: true
} ];

const BEAM_OFFSET = new THREE.Vector3(-.55, .58, .96);

const AUTO_LIGHT = {
    cx: -.56,
    ax: .075,
    sx: .053,
    px: -1.05,
    cy: .005,
    ay: .05,
    sy: .041,
    py: .42
};

const clockDOM = document.getElementById("clock");

const coordsDOM = document.getElementById("coords");

const whisperDOM = document.getElementById("whisper");

const whisperCnDOM = document.getElementById("whisper-cn");

const whisperEnDOM = document.getElementById("whisper-en");

const reticleDOM = document.getElementById("reticle");

const diagDOM = document.getElementById("diag");

const stageDOM = document.getElementById("stage");

const noglDOM = document.getElementById("nogl");

const state = {
    ready: false,
    renderer: null,
    renderTime: 0,
    frame: 0,
    pointer: new THREE.Vector2(0, 0),
    pointerPx: new THREE.Vector2(-100, -100),
    pointerInside: false,
    lastPointerMove: -100,
    dragging: false,
    hoverKnot: -1,
    focus: [ 0, 0 ],
    focusTarget: [ 0, 0 ],
    beam: new THREE.Vector2(AUTO_LIGHT.cx + AUTO_LIGHT.ax * Math.sin(AUTO_LIGHT.px), AUTO_LIGHT.cy + AUTO_LIGHT.ay * Math.sin(AUTO_LIGHT.py)),
    beamDesired: new THREE.Vector2,
    knotHoverMix: 0,
    fps: 0,
    hintTimer: 0
};

let renderer;

try {
    renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: false,
        powerPreference: "high-performance",
        preserveDrawingBuffer: true
    });
} catch (err) {
    console.error(err);
    noglDOM.classList.add("is-on");
    throw err;
}

if (!renderer.capabilities.isWebGL2) {
    noglDOM.classList.add("is-on");
}

state.renderer = renderer;

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

renderer.setSize(window.innerWidth, window.innerHeight);

renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.toneMapping = THREE.ACESFilmicToneMapping;

renderer.toneMappingExposure = .875;

renderer.shadowMap.enabled = true;

renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.info.autoReset = false;

stageDOM.appendChild(renderer.domElement);

const scene = new THREE.Scene;

scene.background = new THREE.Color(722950);

scene.fog = new THREE.FogExp2(722950, .045);

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, .05, 18);

camera.position.copy(DEFAULT_CAMERA);

camera.up.set(0, 1, 0);

const controls = new OrbitControls(camera, renderer.domElement);

controls.target.copy(VIEW_TARGET);

controls.enableDamping = true;

controls.dampingFactor = .055;

controls.rotateSpeed = .34;

controls.zoomSpeed = .65;

controls.enablePan = false;

controls.minDistance = .58;

controls.maxDistance = 1.95;

controls.minPolarAngle = 1.18;

controls.maxPolarAngle = 1.94;

controls.minAzimuthAngle = -.42;

controls.maxAzimuthAngle = .42;

controls.update();

function canvasTexture(w, h, draw) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    draw(ctx, w, h);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
}

const dustSprite = canvasTexture(64, 64, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(255,238,207,0.95)");
    g.addColorStop(.18, "rgba(255,217,163,0.45)");
    g.addColorStop(.5, "rgba(255,187,116,0.09)");
    g.addColorStop(1, "rgba(255,174,100,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
});

dustSprite.colorSpace = THREE.SRGBColorSpace;

const haloTexture = canvasTexture(512, 512, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(255,196,106,0.70)");
    g.addColorStop(.18, "rgba(250,170,77,0.38)");
    g.addColorStop(.48, "rgba(228,121,45,0.12)");
    g.addColorStop(.76, "rgba(190,92,32,0.03)");
    g.addColorStop(1, "rgba(160,70,25,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
});

function buildEnvironment() {
    const w = 1024;
    const h = 512;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#4a3522");
    sky.addColorStop(.38, "#9a7650");
    sky.addColorStop(.56, "#67472c");
    sky.addColorStop(1, "#160e09");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    const win = ctx.createRadialGradient(w * .2, h * .39, 2, w * .2, h * .39, w * .2);
    win.addColorStop(0, "rgba(255,241,209,1)");
    win.addColorStop(.22, "rgba(255,220,164,0.88)");
    win.addColorStop(.58, "rgba(224,167,102,0.28)");
    win.addColorStop(1, "rgba(224,167,102,0)");
    ctx.fillStyle = win;
    ctx.fillRect(0, 0, w, h);
    const low = ctx.createRadialGradient(w * .68, h * .69, 2, w * .68, h * .69, w * .29);
    low.addColorStop(0, "rgba(154,113,73,0.30)");
    low.addColorStop(1, "rgba(40,25,15,0)");
    ctx.fillStyle = low;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
        const x = Math.random() * w;
        const y = h * (.12 + Math.random() * .5);
        const rw = 60 + Math.random() * 230;
        const rh = 10 + Math.random() * 36;
        const g = ctx.createRadialGradient(x, y, 0, x, y, rw);
        g.addColorStop(0, `rgba(255,228,184,${.025 + Math.random() * .04})`);
        g.addColorStop(1, "rgba(255,228,184,0)");
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, rh / rw);
        ctx.translate(-x, -y);
        ctx.fillStyle = g;
        ctx.fillRect(x - rw, y - rw, rw * 2, rw * 2);
        ctx.restore();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromEquirectangular(tex).texture;
    pmrem.dispose();
    tex.dispose();
    return env;
}

scene.environment = buildEnvironment();

scene.environmentIntensity = 1.05;

const textureLoader = new THREE.TextureLoader;

const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

function texture(url, srgb = false) {
    return new Promise((resolve, reject) => {
        textureLoader.load(url, tex => {
            tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
            tex.anisotropy = maxAniso;
            tex.wrapS = THREE.ClampToEdgeWrapping;
            tex.wrapT = THREE.ClampToEdgeWrapping;
            tex.minFilter = THREE.LinearMipmapLinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.generateMipmaps = true;
            resolve(tex);
        }, undefined, reject);
    });
}

async function loadAssets() {
    const boardAssets = {};
    const promises = BOARDS.map(async board => {
        const [color, normal, rough] = await Promise.all([ texture(`./assets/planks/${board.id}_color.png`, true), texture(`./assets/planks/${board.id}_normal.png`, false), texture(`./assets/planks/${board.id}_rough.png`, false) ]);
        boardAssets[board.id] = {
            color: color,
            normal: normal,
            rough: rough,
            bump: null
        };
    });
    const extras = Promise.all([ texture("./assets/sun_gobo.png", true), texture("./assets/backdrop.png", true), texture("./assets/iron_color.png", true), texture("./assets/iron_rough.png", false), texture("./assets/detail_bump.png", false) ]);
    let manifest = null;
    const manifestP = fetch("./assets/manifest.json").then(r => r.json()).catch(() => null);
    let resinMeta = null;
    const resinMetaP = fetch("./assets/resin.json").then(r => r.json()).catch(() => null);
    const [sunMap, backdropMap, ironColor, ironRough, detailBump] = await extras;
    detailBump.wrapS = detailBump.wrapT = THREE.RepeatWrapping;
    detailBump.repeat.set(2.4, 4.2);
    detailBump.anisotropy = maxAniso;
    await Promise.all(promises);
    manifest = await manifestP;
    resinMeta = await resinMetaP;
    for (const id of Object.keys(boardAssets)) boardAssets[id].bump = detailBump;
    return {
        boardAssets: boardAssets,
        sunMap: sunMap,
        backdropMap: backdropMap,
        ironColor: ironColor,
        ironRough: ironRough,
        detailBump: detailBump,
        manifest: manifest,
        resinMeta: resinMeta
    };
}

const woodVertexDecl = "varying vec2 vWoodUv;";

const focusGLSL = `\n  uniform vec4 uKnotA;\n  uniform vec4 uKnotB;\n  uniform float uFocusA;\n  uniform float uFocusB;\n  uniform float uTime;\n  varying vec2 vWoodUv;\n\n  float knotMask(vec2 uv, vec4 k, float focus) {\n    vec2 p = (uv - k.xy) / max(k.zw, vec2(1e-5));\n    float r = length(p);\n    float mask = smoothstep(1.16, 0.24, r) * focus;\n    float rings = 0.5 + 0.5 * sin(r * 22.0 - atan(p.y, p.x) * 2.0 + uTime * 0.18);\n    return mask * (0.82 + 0.18 * rings);\n  }\n`;

function createWoodMaterial(board, maps) {
    const material = new THREE.MeshStandardMaterial({
        map: maps.color,
        color: new THREE.Color(...board.tint || [ 1, 1, 1 ]),
        normalMap: maps.normal,
        normalScale: new THREE.Vector2(.8, .8),
        bumpMap: maps.bump,
        bumpScale: 8e-4,
        roughnessMap: maps.rough,
        roughness: .95,
        metalness: 0,
        envMapIntensity: .45,
        dithering: true,
        alphaTest: .35,
        side: THREE.FrontSide
    });
    const woodUniforms = {
        uKnotA: {
            value: new THREE.Vector4(.5, .5, .15, .05)
        },
        uKnotB: {
            value: new THREE.Vector4(.5, .5, .15, .05)
        },
        uFocusA: {
            value: 0
        },
        uFocusB: {
            value: 0
        },
        uTime: {
            value: 0
        }
    };
    material.onBeforeCompile = shader => {
        shader.uniforms.uKnotA = woodUniforms.uKnotA;
        shader.uniforms.uKnotB = woodUniforms.uKnotB;
        shader.uniforms.uFocusA = woodUniforms.uFocusA;
        shader.uniforms.uFocusB = woodUniforms.uFocusB;
        shader.uniforms.uTime = woodUniforms.uTime;
        shader.vertexShader = `${woodVertexDecl}\n${shader.vertexShader}`.replace("#include <uv_vertex>", "#include <uv_vertex>\n  vWoodUv = uv;");
        shader.fragmentShader = `${focusGLSL}\n${shader.fragmentShader}`;
        shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `\n      #include <map_fragment>\n      float resinA = knotMask(vWoodUv, uKnotA, uFocusA);\n      float resinB = knotMask(vWoodUv, uKnotB, uFocusB);\n      float resin = clamp(resinA + resinB, 0.0, 1.0);\n      // Resin seeps into the pores: deeper amber, a warmer shadow, never a flat decal.\n      vec3 amberDark = vec3(0.100, 0.036, 0.008);\n      vec3 amberLift = vec3(0.26, 0.090, 0.016);\n      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.72, 0.58, 0.44) + amberDark, resin * 0.40);\n      diffuseColor.rgb += amberLift * resin * (0.12 + 0.08 * sin(vWoodUv.y * 720.0 + uTime * 0.3));\n      `);
        shader.fragmentShader = shader.fragmentShader.replace("#include <roughnessmap_fragment>", `\n      #include <roughnessmap_fragment>\n      float resinRough = clamp(knotMask(vWoodUv, uKnotA, uFocusA) + knotMask(vWoodUv, uKnotB, uFocusB), 0.0, 1.0);\n      roughnessFactor = mix(roughnessFactor, 0.22, resinRough * 0.72);\n      `);
        shader.fragmentShader = shader.fragmentShader.replace("#include <opaque_fragment>", `\n      #include <opaque_fragment>\n      float resinGlow = clamp(knotMask(vWoodUv, uKnotA, uFocusA) + knotMask(vWoodUv, uKnotB, uFocusB), 0.0, 1.0);\n      gl_FragColor.rgb += vec3(0.100, 0.036, 0.008) * resinGlow * 0.10;\n      `);
        material.userData.shader = shader;
    };
    material.customProgramCacheKey = () => "old-pine-resin-v2";
    material.userData.woodUniforms = woodUniforms;
    return material;
}

const wallGroup = new THREE.Group;

scene.add(wallGroup);

function warpBoardGeometry(geometry, width, depth, phase) {
    const pos = geometry.attributes.position;
    const normal = geometry.attributes.normal;
    for (let i = 0; i < pos.count; i++) {
        if (normal.getZ(i) < .5) continue;
        const x = pos.getX(i);
        const y = pos.getY(i);
        const nx = x / (width * .5);
        const ny = y / (BOARD_HEIGHT * .5);
        const edge = 1 - smoothstep(.82, 1, Math.abs(nx));
        const longBow = .0022 * Math.cos(nx * 1.25 + phase * .7);
        const lengthWave = 95e-5 * Math.sin(ny * 3.3 + phase * 2.1) * Math.sin(nx * 2.8 + phase);
        const tooth = 28e-5 * Math.sin(nx * 19 + ny * 9 + phase * 3);
        const cup = 75e-5 * (1 - nx * nx) * Math.sin(ny * 1.6 + phase * .5);
        const roundover = -.0013 * smoothstep(.86, 1, Math.abs(nx));
        pos.setZ(i, pos.getZ(i) + (longBow + lengthWave + tooth + cup) * edge + roundover);
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
}

function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

const boardMeshes = [];

const boardLookup = new Map;

let heroBoard = null;

let heroMesh = null;

let ironMaterial = null;

function buildWall(assets) {
    sun.map = null;
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(.498, 1.546), new THREE.MeshBasicMaterial({
        map: assets.backdropMap,
        toneMapped: false,
        color: new THREE.Color(1.4, 1.39, 1.36)
    }));
    bg.position.set(-1.0523, 0, -.3);
    scene.add(bg);
    const backing = new THREE.Mesh(new THREE.PlaneGeometry(1.76, 2.15), new THREE.MeshStandardMaterial({
        color: 3811868,
        roughness: .98,
        metalness: 0
    }));
    backing.position.set(.225, 0, -.052);
    backing.receiveShadow = true;
    scene.add(backing);
    ironMaterial = new THREE.MeshStandardMaterial({
        color: 7035465,
        map: assets.ironColor,
        roughnessMap: assets.ironRough,
        roughness: .62,
        metalness: .45,
        envMapIntensity: 1.2
    });
    const nailGeometry = new THREE.SphereGeometry(1, 14, 9);
    {
        const p = nailGeometry.attributes.position;
        for (let i = 0; i < p.count; i++) {
            const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
            const a = Math.atan2(y, x);
            const k = 1 + .055 * Math.sin(a * 5 + 1.3) + .035 * Math.sin(a * 9);
            p.setX(i, x * k);
            p.setY(i, y * k);
        }
        nailGeometry.computeVertexNormals();
    }
    const manifestMap = new Map;
    if (assets.manifest) {
        for (const m of assets.manifest) manifestMap.set(m.id, m);
    }
    for (const board of BOARDS) {
        const maps = assets.boardAssets[board.id];
        const actualWidth = board.width - GAP;
        const geo = new THREE.BoxGeometry(actualWidth, BOARD_HEIGHT, board.depth, 22, 120, 1);
        warpBoardGeometry(geo, actualWidth, board.depth, board.phase);
        const frontMaterial = createWoodMaterial(board, maps);
        const sideMaterial = new THREE.MeshStandardMaterial({
            color: board.side,
            roughness: .9,
            metalness: 0,
            envMapIntensity: .28
        });
        const backMaterial = new THREE.MeshStandardMaterial({
            color: 657157,
            roughness: 1,
            metalness: 0
        });
        const materials = [ sideMaterial, sideMaterial, sideMaterial, sideMaterial, frontMaterial, backMaterial ];
        const mesh = new THREE.Mesh(geo, materials);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const group = new THREE.Group;
        group.position.set(board.left + board.width * .5, 0, board.front - board.depth * .5);
        group.rotation.z = board.tilt;
        group.rotation.y = board.yaw;
        group.add(mesh);
        wallGroup.add(group);
        const record = {
            ...board,
            group: group,
            mesh: mesh,
            materials: materials,
            manifest: manifestMap.get(board.id) || null,
            actualWidth: actualWidth,
            knots: [],
            resin: [],
            nails: [],
            uniforms: frontMaterial.userData.woodUniforms
        };
        const hero = board.hero;
        if (hero) {
            heroBoard = record;
            heroMesh = mesh;
        }
        const nailData = board.bakedNails ? [] : record.manifest?.nails || [];
        for (const nail of nailData) {
            const localX = (nail.u - .5) * actualWidth;
            const localY = (.5 - nail.y) * BOARD_HEIGHT;
            const r = (nail.three_d ? 1.12 : .86) * nail.r;
            const nailMesh = new THREE.Mesh(nailGeometry, ironMaterial);
            nailMesh.scale.set(r, r, r * .22);
            nailMesh.position.set(localX, localY, board.depth * .5 - r * .1);
            nailMesh.rotation.z = (nail.u * 13.7 + nail.y * 31) % 1;
            nailMesh.castShadow = true;
            nailMesh.receiveShadow = true;
            group.add(nailMesh);
            record.nails.push(nailMesh);
        }
        if (hero) {
            const knots = record.manifest?.knots || [];
            let heroIndex = 0;
            for (let i = 0; i < knots.length; i++) {
                const knot = knots[i];
                if (!knot.hero) continue;
                const entry = {
                    index: heroIndex,
                    u: knot.u,
                    v: 1 - knot.y,
                    uImage: knot.y,
                    rx: knot.rx,
                    ry: knot.ry,
                    sizeX: knot.rx * board.width,
                    sizeY: knot.ry * BOARD_HEIGHT,
                    rot: knot.rot,
                    centerLocal: new THREE.Vector3((knot.u - .5) * actualWidth, (.5 - knot.y) * BOARD_HEIGHT, 0),
                    group: group,
                    mesh: mesh,
                    board: board
                };
                record.knots.push(entry);
                heroIndex++;
            }
        }
        boardMeshes.push(mesh);
        boardLookup.set(board.id, record);
    }
    addResinLayers(assets.resinMeta);
    scene.updateMatrixWorld(true);
}

const resinSystems = [];

function addResinLayers(meta) {
    if (!heroBoard) return;
    const knots = heroBoard.knots;
    knots.forEach((knot, i) => {
        const group = new THREE.Group;
        group.position.copy(knot.centerLocal);
        group.position.z = heroBoard.depth * .5 + .0012;
        group.rotation.z = 0;
        heroBoard.group.add(group);
        const haloMaterial = new THREE.MeshBasicMaterial({
            map: haloTexture,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            toneMapped: false
        });
        const haloW = knot.sizeX * 3.4;
        const haloH = knot.sizeY * 3;
        const halo = new THREE.Mesh(new THREE.PlaneGeometry(haloW, haloH), haloMaterial);
        halo.position.z = -4e-4;
        halo.renderOrder = 2;
        group.add(halo);
        const light = new THREE.PointLight(16753231, 0, .4, 1.6);
        light.position.set(0, .012, .15);
        group.add(light);
        const uniforms = heroBoard.uniforms;
        if (i === 0) {
            uniforms.uKnotA.value.set(knot.u, knot.v, knot.rx, knot.ry);
        } else {
            uniforms.uKnotB.value.set(knot.u, knot.v, knot.rx, knot.ry);
        }
        resinSystems.push({
            i: i,
            halo: halo,
            haloMaterial: haloMaterial,
            light: light,
            group: group,
            knot: knot
        });
    });
}

const dust = (() => {
    const count = 200;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const scales = new Float32Array(count);
    const rng = mulberry32(9481);
    for (let i = 0; i < count; i++) {
        positions[i * 3 + 0] = (rng() - .5) * 1.52;
        positions[i * 3 + 1] = (rng() - .5) * 1.12;
        positions[i * 3 + 2] = .035 + rng() * .55;
        seeds[i] = rng();
        scales[i] = 1.25 + rng() * 4.1;
    }
    const geo = new THREE.BufferGeometry;
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    geo.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
    const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
            uTime: {
                value: 0
            },
            uLight: {
                value: new THREE.Vector2(0, 0)
            },
            uPixelRatio: {
                value: renderer.getPixelRatio()
            },
            uMap: {
                value: dustSprite
            }
        },
        vertexShader: `\n      uniform float uTime;\n      uniform vec2 uLight;\n      uniform float uPixelRatio;\n      attribute float aSeed;\n      attribute float aScale;\n      varying float vGlow;\n      varying float vSeed;\n      void main() {\n        vec3 p = position;\n        p.x += sin(uTime * 0.037 + aSeed * 21.0) * 0.028;\n        p.y += sin(uTime * 0.021 + aSeed * 14.0) * 0.020;\n        p.z += cos(uTime * 0.029 + aSeed * 8.0) * 0.014;\n        float d = distance(p.xy, uLight);\n        vGlow = 0.18 + 0.82 * smoothstep(0.68, 0.04, d);\n        vGlow *= 0.45 + 0.55 * smoothstep(0.86, 1.0, fract(p.y * 1.9 + aSeed * 4.0 + uTime * 0.012));\n        vSeed = aSeed;\n        vec4 mv = modelViewMatrix * vec4(p, 1.0);\n        gl_PointSize = aScale * uPixelRatio / max(0.55, -mv.z);\n        gl_Position = projectionMatrix * mv;\n      }\n    `,
        fragmentShader: `\n      uniform sampler2D uMap;\n      varying float vGlow;\n      varying float vSeed;\n      void main() {\n        vec4 t = texture2D(uMap, gl_PointCoord);\n        float alpha = t.a * vGlow * 0.34;\n        vec3 warm = mix(vec3(1.0, 0.69, 0.36), vec3(1.0, 0.87, 0.68), vSeed);\n        gl_FragColor = vec4(warm * t.rgb, alpha);\n      }\n    `
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    points.renderOrder = 6;
    scene.add(points);
    return {
        points: points,
        mat: mat
    };
})();

function mulberry32(a) {
    return function() {
        a |= 0;
        a = a + 1831565813 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

const sawdustSystems = new Map;

function getSawdust(knotIndex) {
    if (sawdustSystems.has(knotIndex)) return sawdustSystems.get(knotIndex);
    const count = 44;
    const geo = new THREE.BufferGeometry;
    const positions = new Float32Array(count * 3);
    const velocities = [];
    const seeds = new Float32Array(count);
    const rng = mulberry32(1271 + knotIndex * 97);
    for (let i = 0; i < count; i++) {
        const a = rng() * Math.PI * 2;
        const rr = Math.sqrt(rng()) * .62;
        positions[i * 3] = Math.cos(a) * rr * .09;
        positions[i * 3 + 1] = Math.sin(a) * rr * .1;
        positions[i * 3 + 2] = .002 + rng() * .008;
        velocities.push(new THREE.Vector3(Math.cos(a) * (.01 + rng() * .025), .014 + rng() * .032, .005 + rng() * .022));
        seeds[i] = rng();
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    const mat = new THREE.PointsMaterial({
        map: dustSprite,
        color: 16761983,
        size: .0048,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
        toneMapped: true
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    points.renderOrder = 7;
    const knot = heroBoard.knots[knotIndex];
    const group = new THREE.Group;
    group.position.copy(knot.centerLocal);
    group.position.z = heroBoard.depth * .5 + .004;
    group.rotation.z = 0;
    group.add(points);
    heroBoard.group.add(group);
    const sys = {
        points: points,
        mat: mat,
        velocities: velocities,
        t: 99,
        duration: 3.8,
        count: count
    };
    sawdustSystems.set(knotIndex, sys);
    return sys;
}

function burstSawdust(knotIndex) {
    const sys = getSawdust(knotIndex);
    sys.t = 0;
}

function updateSawdust(dt) {
    for (const sys of sawdustSystems.values()) {
        if (sys.t > sys.duration) {
            sys.mat.opacity = 0;
            continue;
        }
        sys.t += dt;
        const t = sys.t;
        const pos = sys.points.geometry.attributes.position;
        for (let i = 0; i < sys.count; i++) {
            const v = sys.velocities[i];
            const age = Math.max(0, t - i % 9 * .028);
            pos.setXYZ(i, pos.getX(i) + v.x * dt * .55, pos.getY(i) + (v.y - age * .018) * dt, pos.getZ(i) + v.z * dt * .5);
            v.x *= .992;
        }
        pos.needsUpdate = true;
        const k = Math.max(0, 1 - t / sys.duration);
        sys.mat.opacity = Math.pow(k, 1.5) * .65;
        sys.mat.size = .0042 + (1 - k) * .0016;
    }
}

const hemi = new THREE.HemisphereLight(16775150, 3812384, 1.9);

scene.add(hemi);

const key = new THREE.DirectionalLight(16775922, 1);

key.position.set(-2.2, 1.7, 1.8);

key.target.position.set(-.12, -.02, 0);

key.castShadow = true;

key.shadow.mapSize.set(1024, 1024);

key.shadow.camera.left = -1.1;

key.shadow.camera.right = 1.1;

key.shadow.camera.top = 1.25;

key.shadow.camera.bottom = -1.25;

key.shadow.camera.near = .4;

key.shadow.camera.far = 5.2;

key.shadow.bias = -22e-5;

key.shadow.normalBias = .012;

key.shadow.radius = 4;

scene.add(key, key.target);

const fill = new THREE.DirectionalLight(13820142, .62);

fill.position.set(1.8, .2, 1.2);

fill.target.position.set(.2, -.2, 0);

scene.add(fill, fill.target);

const bounce = new THREE.DirectionalLight(16767416, .6);

bounce.position.set(-.8, -2, 1.4);

bounce.target.position.set(-.2, .2, 0);

scene.add(bounce, bounce.target);

const sunTarget = new THREE.Object3D;

scene.add(sunTarget);

const sun = new THREE.SpotLight(16772564, 4.5, 7, .28, .92, 1.2);

sun.map = null;

sun.target = sunTarget;

sun.position.copy(sunTarget.position).add(BEAM_OFFSET);

sun.castShadow = false;

scene.add(sun);

const windowGlow = new THREE.SpotLight(16774116, 3.2, 7, 1.05, 1, 1.2);

windowGlow.position.set(-3.2, 2.1, 2.4);

windowGlow.target.position.set(-.55, .18, 0);

scene.add(windowGlow, windowGlow.target);

const renderSize = new THREE.Vector2;

renderer.getDrawingBufferSize(renderSize);

const composerTarget = new THREE.WebGLRenderTarget(Math.max(1, renderSize.x), Math.max(1, renderSize.y), {
    type: THREE.HalfFloatType,
    samples: 0
});

const composer = new EffectComposer(renderer, composerTarget);

composer.setPixelRatio(renderer.getPixelRatio());

composer.setSize(window.innerWidth, window.innerHeight);

const renderPass = new RenderPass(scene, camera);

composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), .16, .62, .92);

composer.addPass(bloomPass);

const outputPass = new OutputPass;

composer.addPass(outputPass);

const filmShader = {
    uniforms: {
        tDiffuse: {
            value: null
        },
        uTime: {
            value: 0
        },
        uAspect: {
            value: window.innerWidth / window.innerHeight
        },
        uGrain: {
            value: .008
        },
        uVignette: {
            value: .05
        },
        uWarmth: {
            value: .03
        },
        uLift: {
            value: .012
        },
        uSaturation: {
            value: .9
        },
        uBalance: {
            value: new THREE.Vector3(.93, 1, 1.06)
        },
        uTexel: {
            value: new THREE.Vector2(1 / 1536, 1 / 1024)
        }
    },
    vertexShader: `\n    varying vec2 vUv;\n    void main() {\n      vUv = uv;\n      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n    }\n  `,
    fragmentShader: `\n    uniform sampler2D tDiffuse;\n    uniform float uTime;\n    uniform float uAspect;\n    uniform float uGrain;\n    uniform float uVignette;\n    uniform float uWarmth;\n    uniform float uLift;\n    uniform float uSaturation;\n    uniform vec3 uBalance;\n    uniform vec2 uTexel;\n    varying vec2 vUv;\n\n    float hash(vec2 p) {\n      p = fract(p * vec2(123.34, 345.45));\n      p += dot(p, p + 34.345);\n      return fract(p.x * p.y);\n    }\n\n    void main() {\n      vec2 c = vUv - 0.5;\n      vec2 uv = vUv;\n      // a very light lens fringe, only toward the corners\n      vec2 fringe = c * dot(c, c) * vec2(0.0011, 0.0008);\n      vec3 col;\n      col.r = texture2D(tDiffuse, uv + fringe).r;\n      col.g = texture2D(tDiffuse, uv).g;\n      col.b = texture2D(tDiffuse, uv - fringe).b;\n\n      // the reference is a photograph at a close focus: give the fibre a breath\n      // of optical softness rather than pixel-sharp aliasing\n      vec2 d = uTexel * 1.15;\n      vec3 soft = texture2D(tDiffuse, uv + vec2(d.x, 0.0)).rgb;\n      soft += texture2D(tDiffuse, uv - vec2(d.x, 0.0)).rgb;\n      soft += texture2D(tDiffuse, uv + vec2(0.0, d.y)).rgb;\n      soft += texture2D(tDiffuse, uv - vec2(0.0, d.y)).rgb;\n      soft += texture2D(tDiffuse, uv).rgb;\n      soft /= 5.0;\n      col = mix(col, soft, 0.45);\n\n      // a soft, late-afternoon falloff; the corners darken but keep their wood\n      vec2 vc = c * vec2(1.0, 1.05);\n      float vig = smoothstep(0.82, 0.20, length(vc));\n      col *= mix(vec3(1.0 - uVignette), vec3(1.0), vig);\n\n      // a dry, low-contrast silver-halide sort of grain\n      float n = hash(vUv * vec2(1366.0, 952.0) + fract(uTime) * 41.0);\n      col += (n - 0.5) * uGrain;\n      col = mix(col, col * vec3(1.016, 1.003, 0.976), uWarmth);\n      col *= uBalance;\n      float grey = dot(col, vec3(0.2126, 0.7152, 0.0722));\n      col = mix(vec3(grey), col, uSaturation);\n      col += uLift * vec3(0.72, 0.62, 0.50);\n\n      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);\n    }\n  `
};

const filmPass = new ShaderPass(filmShader);

composer.addPass(filmPass);

const raycaster = new THREE.Raycaster;

const pointerNDC = new THREE.Vector2;

let pointerDownAt = null;

function clockTime() {
    return performance.now() * .001;
}

function updateBeam(time, dt, immediate = false) {
    const idle = time - state.lastPointerMove;
    let desiredX;
    let desiredY;
    if (state.pointerInside && idle < 3.2 && !state.dragging) {
        desiredX = THREE.MathUtils.clamp(state.pointer.x * .62, -.56, .58);
        desiredY = THREE.MathUtils.clamp(state.pointer.y * .4, -.31, .32);
    } else {
        desiredX = AUTO_LIGHT.cx + AUTO_LIGHT.ax * Math.sin(time * AUTO_LIGHT.sx + AUTO_LIGHT.px);
        desiredY = AUTO_LIGHT.cy + AUTO_LIGHT.ay * Math.sin(time * AUTO_LIGHT.sy + AUTO_LIGHT.py);
    }
    state.beamDesired.set(desiredX, desiredY);
    if (immediate) {
        state.beam.copy(state.beamDesired);
    } else {
        const damp = 1 - Math.exp(-dt * 1.55);
        state.beam.lerp(state.beamDesired, damp);
    }
    sunTarget.position.set(state.beam.x, state.beam.y, 0);
    const sway = Math.sin(time * .055) * .035;
    sun.position.set(state.beam.x + BEAM_OFFSET.x + sway, state.beam.y + BEAM_OFFSET.y + Math.sin(time * .042) * .025, BEAM_OFFSET.z);
    sunTarget.updateMatrixWorld();
    sun.target = sunTarget;
    if (coordsDOM) {
        const ax = Math.round(THREE.MathUtils.radToDeg(Math.atan2(state.beam.x - sun.position.x, sun.position.z)));
        const ay = Math.round(THREE.MathUtils.radToDeg(Math.atan2(state.beam.y - sun.position.y, sun.position.z)));
        coordsDOM.textContent = `LIGHT ${Math.abs(ax)}° / ${Math.abs(ay)}°`;
    }
}

function hitTestKnot(event) {
    if (!heroMesh || !heroBoard) return -1;
    const rect = renderer.domElement.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    pointerNDC.set(x, y);
    state.pointer.set(x, y);
    raycaster.setFromCamera(pointerNDC, camera);
    const hits = raycaster.intersectObject(heroMesh, false);
    if (!hits.length) return -1;
    const uv = hits[0].uv;
    if (!uv) return -1;
    let closest = -1;
    let best = 1;
    for (const knot of heroBoard.knots) {
        const dx = (uv.x - knot.u) / (knot.rx * 1.18);
        const dy = (1 - uv.y - knot.uImage) / (knot.ry * 1.28);
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < best) {
            best = d;
            closest = knot.index;
        }
    }
    return closest;
}

function setWhisper(cn, en, on, timeout = 0) {
    if (whisperDOM) {
        whisperCnDOM.textContent = cn;
        whisperEnDOM.textContent = en;
        whisperDOM.classList.toggle("is-on", on);
    }
    if (state.hintTimer) clearTimeout(state.hintTimer);
    if (on && timeout) {
        state.hintTimer = setTimeout(() => {
            whisperDOM.classList.remove("is-on");
        }, timeout);
    }
}

function activateKnot(index, force) {
    if (index < 0) return;
    const current = state.focusTarget[index] > .5;
    const next = typeof force === "boolean" ? force : !current;
    state.focusTarget[index] = next ? 1 : 0;
    if (next) {
        burstSawdust(index);
        const labels = [ [ "树脂正在醒来", "resin stirs beneath the grain" ], [ "年轮暖了起来", "the inner rings hold the sun" ] ];
        setWhisper(labels[index][0], labels[index][1], true, 3200);
    } else {
        setWhisper("微光收回木纹", "the grain settles back into shadow", true, 1600);
    }
    if (typeof force !== "boolean" || force) {
        state.focusTarget[index] = next ? 1 : 0;
    }
}

function clearKnots() {
    state.focusTarget[0] = 0;
    state.focusTarget[1] = 0;
    setWhisper("微光收回木纹", "the grain settles back into shadow", true, 1500);
}

function updateFocusUniforms(time) {
    const u = heroBoard?.uniforms;
    if (!u) return;
    const damping = 1 - Math.exp(-.006 * 1);
    const f = state.fastDamp ?? damping;
    state.focus[0] += (state.focusTarget[0] - state.focus[0]) * f;
    state.focus[1] += (state.focusTarget[1] - state.focus[1]) * f;
    u.uFocusA.value = state.focus[0];
    u.uFocusB.value = state.focus[1];
    u.uTime.value = time;
    for (const sys of resinSystems) {
        const v = state.focus[sys.i];
        sys.haloMaterial.opacity = v * .18;
        const pulse = 1 + Math.sin(time * .7 + sys.i) * .018;
        sys.group.scale.setScalar(pulse);
        sys.light.intensity = v * .045;
        sys.light.color.setHSL(.073, .82, .55);
    }
}

function onPointerMove(event) {
    state.pointerInside = true;
    state.lastPointerMove = clockTime();
    state.pointerPx.set(event.clientX, event.clientY);
    const rect = renderer.domElement.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    state.pointer.set(x, y);
    if (event.pointerType === "mouse" || event.pointerType === "pen") {
        document.body.classList.add("has-pointer");
        reticleDOM.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
    }
    const knot = state.dragging ? -1 : hitTestKnot(event);
    if (knot !== state.hoverKnot) {
        state.hoverKnot = knot;
        document.body.classList.toggle("over-knot", knot >= 0);
        if (knot >= 0 && !state.dragging) {
            setWhisper("木节 · 轻触唤醒", "a knot holding old resin", true);
        } else if (state.focusTarget.every(v => v < .5)) {
            whisperDOM.classList.remove("is-on");
        }
    }
}

function onPointerLeave() {
    state.pointerInside = false;
    state.hoverKnot = -1;
    document.body.classList.remove("over-knot");
    document.body.classList.remove("has-pointer");
    if (state.focusTarget.every(v => v < .5)) whisperDOM.classList.remove("is-on");
}

function onPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    state.dragging = true;
    pointerDownAt = {
        x: event.clientX,
        y: event.clientY,
        t: clockTime()
    };
}

function onPointerUp(event) {
    state.dragging = false;
    if (!pointerDownAt) return;
    const moved = Math.hypot(event.clientX - pointerDownAt.x, event.clientY - pointerDownAt.y);
    const elapsed = clockTime() - pointerDownAt.t;
    pointerDownAt = null;
    if (moved > 7 || elapsed > 650) return;
    const knot = hitTestKnot(event);
    if (knot >= 0) {
        activateKnot(knot);
    } else if (event.target === renderer.domElement) {
        clearKnots();
    }
}

renderer.domElement.addEventListener("pointermove", onPointerMove);

renderer.domElement.addEventListener("pointerdown", onPointerDown);

renderer.domElement.addEventListener("pointerup", onPointerUp);

renderer.domElement.addEventListener("pointerleave", onPointerLeave);

function settleControls() {
    const damping = controls.enableDamping;
    controls.enableDamping = false;
    controls.update();
    controls.enableDamping = damping;
}

let resetTween = null;

function resetView() {
    settleControls();
    const fromPos = camera.position.clone();
    const fromTarget = controls.target.clone();
    const start = performance.now();
    const duration = 1050;
    resetTween = () => {
        const t = Math.min(1, (performance.now() - start) / duration);
        const k = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        camera.position.lerpVectors(fromPos, DEFAULT_CAMERA, k);
        controls.target.lerpVectors(fromTarget, VIEW_TARGET, k);
        controls.update();
        if (t >= 1) {
            resetTween = null;
            camera.position.copy(DEFAULT_CAMERA);
            controls.target.copy(VIEW_TARGET);
            settleControls();
        }
    };
}

renderer.domElement.addEventListener("dblclick", event => {
    const knot = hitTestKnot(event);
    if (knot < 0) resetView();
});

window.addEventListener("keydown", event => {
    if (event.key === "r" || event.key === "R") resetView();
    if (event.key === "Escape") clearKnots();
    if (event.key === "d" || event.key === "D") {
        document.body.classList.toggle("show-diag");
        refreshDiagnostics(Math.round(state.fps));
    }
});

function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(w, h);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
    bloomPass.setSize(w, h);
    filmShader.uniforms.uAspect.value = w / h;
    filmShader.uniforms.uTexel.value.set(1 / (w * renderer.getPixelRatio()), 1 / (h * renderer.getPixelRatio()));
    dust.mat.uniforms.uPixelRatio.value = renderer.getPixelRatio();
    state.renderer.getDrawingBufferSize(renderSize);
}

window.addEventListener("resize", onResize);

onResize();

function refreshDiagnostics(fps) {
    if (!diagDOM || !document.body.classList.contains("show-diag")) return;
    const info = renderer.info.render;
    const gl = renderer.getContext();
    const cam = camera.position;
    const tgt = controls.target;
    diagDOM.textContent = [ `WEBGL ${renderer.capabilities.isWebGL2 ? 2 : 1} · ${gl.getParameter(gl.VERSION)}`, `${info.calls} CALLS · ${Math.round(info.triangles / 1e3)}K TRI · ${renderer.info.memory.textures} TEX`, `${fps} FPS · ${renderSize.x}×${renderSize.y} @${renderer.getPixelRatio().toFixed(2)}X`, `CAM ${cam.x.toFixed(2)} ${cam.y.toFixed(2)} ${cam.z.toFixed(2)} → ${tgt.x.toFixed(2)} ${tgt.y.toFixed(2)} ${tgt.z.toFixed(2)}`, `BEAM ${state.beam.x.toFixed(3)} ${state.beam.y.toFixed(3)} · FOCUS ${state.focus[0].toFixed(2)} ${state.focus[1].toFixed(2)}` ].join("\n");
}

const clock = new THREE.Clock;

let paused = false;

let diagLastRefresh = 0;

let elapsed = 0;

let firstFrame = true;

function animate() {
    if (!paused) requestAnimationFrame(animate);
    const rawDt = clock.getDelta();
    const dt = Math.min(rawDt, .05);
    elapsed += dt;
    state.renderTime = elapsed;
    state.fastDamp = 1 - Math.exp(-dt * 3.2);
    if (resetTween) resetTween(); else controls.update();
    updateBeam(elapsed, dt);
    updateFocusUniforms(elapsed);
    updateSawdust(dt);
    dust.mat.uniforms.uTime.value = elapsed;
    dust.mat.uniforms.uLight.value.copy(state.beam);
    filmShader.uniforms.uTime.value = elapsed;
    renderer.info.reset();
    composer.render();
    state.frame++;
    state.fps = state.fps * .92 + (rawDt > 0 ? 1 / rawDt * .08 : 0);
    const wallNow = performance.now();
    if (wallNow - diagLastRefresh > 650) {
        diagLastRefresh = wallNow;
        refreshDiagnostics(Math.round(state.fps));
    }
    if (firstFrame) {
        firstFrame = false;
    }
}

async function boot() {
    try {
        const assets = await loadAssets();
        buildWall(assets);
        await new Promise(r => requestAnimationFrame(r));
        updateBeam(0, .016, true);
        updateFocusUniforms(0);
        try {
            await renderer.compileAsync(scene, camera);
        } catch (e) {
            renderer.compile(scene, camera);
        }
        clock.start();
        animate();
        setTimeout(() => {
            document.body.classList.add("is-ready");
            state.ready = true;
            window.__READY__ = true;
        }, 140);
    } catch (error) {
        console.error("Unable to build the wall:", error);
        noglDOM.classList.add("is-on");
        window.__READY__ = false;
        window.__ERROR__ = String(error?.stack || error);
    }
}

window.__WOOD__ = {
    THREE: THREE,
    scene: scene,
    debug: {
        key: key,
        sun: sun,
        fill: fill,
        hemi: hemi,
        bounce: bounce,
        windowGlow: windowGlow,
        bloomPass: bloomPass,
        filmPass: filmPass,
        composer: composer,
        renderer: renderer,
        sunTarget: sunTarget,
        get heroBoard() {
            return heroBoard;
        },
        get ironMaterial() {
            return ironMaterial;
        }
    },
    camera: camera,
    controls: controls,
    renderer: renderer,
    get ready() {
        return state.ready;
    },
    setLight(x, y) {
        state.pointerInside = true;
        state.lastPointerMove = clockTime();
        state.pointer.set(THREE.MathUtils.clamp(x, -.6, .6) / .62, THREE.MathUtils.clamp(y, -.36, .36) / .4);
        updateBeam(elapsed, .016, true);
    },
    hoverKnot(index) {
        state.hoverKnot = index;
    },
    activateKnot(index) {
        activateKnot(index, true);
    },
    closeKnots: clearKnots,
    toggleDiagnostics() {
        document.body.classList.toggle("show-diag");
        refreshDiagnostics(Math.round(state.fps));
    },
    pause() {
        paused = true;
    },
    resume() {
        if (paused) {
            paused = false;
            clock.getDelta();
            requestAnimationFrame(animate);
        }
    },
    renderOnce() {
        renderer.info.reset();
        composer.render();
    },
    resetView: resetView,
    setSunIntensity(v) {
        sun.intensity = v;
    },
    setKeyIntensity(v) {
        key.intensity = v;
    },
    setFillIntensity(v) {
        fill.intensity = v;
    },
    setFocus(index, value) {
        state.focusTarget[index] = value ? 1 : 0;
        state.focus[index] = value ? 1 : 0;
        updateFocusUniforms(elapsed);
    },
    diagnostics() {
        const gl = renderer.getContext();
        const ext = gl.getExtension("WEBGL_debug_renderer_info");
        const dbg = {
            ready: state.ready,
            frame: state.frame,
            fps: Math.round(state.fps),
            renderer: renderer.info.render,
            memory: renderer.info.memory,
            drawingBuffer: [ gl.drawingBufferWidth, gl.drawingBufferHeight ],
            pixelRatio: renderer.getPixelRatio(),
            webglVersion: gl.getParameter(gl.VERSION),
            shadingLanguage: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
            vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
            device: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
            camera: {
                position: camera.position.toArray().map(v => +v.toFixed(4)),
                target: controls.target.toArray().map(v => +v.toFixed(4)),
                fov: camera.fov,
                aspect: +camera.aspect.toFixed(4)
            },
            beam: [ state.beam.x, state.beam.y ].map(v => +v.toFixed(4)),
            focus: state.focus.map(v => +v.toFixed(3)),
            focusTarget: state.focusTarget.map(v => +v.toFixed(0)),
            hoverKnot: state.hoverKnot,
            dragging: state.dragging,
            knots: heroBoard?.knots.map(k => ({
                u: +k.u.toFixed(3),
                v: +(1 - k.v).toFixed(3),
                rx: +k.rx.toFixed(3),
                ry: +k.ry.toFixed(3)
            })),
            time: +elapsed.toFixed(2)
        };
        return dbg;
    }
};

boot();
