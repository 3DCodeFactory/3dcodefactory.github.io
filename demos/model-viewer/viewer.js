import * as THREE from "three";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";

import { RenderPass } from "three/addons/postprocessing/RenderPass.js";

import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";

import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const id = new URLSearchParams(location.search).get("case");

const scene = new THREE.Scene;

scene.background = new THREE.Color("#eef1f2");

const renderer = new THREE.WebGLRenderer({
    antialias: true
});

renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));

renderer.toneMapping = THREE.ACESFilmicToneMapping;

renderer.toneMappingExposure = 1;

document.body.prepend(renderer.domElement);

const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment;

scene.environment = pmrem.fromScene(room, .04).texture;

room.dispose();

pmrem.dispose();

scene.environmentIntensity = .65;

const camera = new THREE.PerspectiveCamera(45, 1, .01, 1e3);

const controls = new OrbitControls(camera, renderer.domElement);

controls.enableDamping = true;

controls.enablePan = false;

controls.rotateSpeed = .35;

controls.zoomSpeed = .4;

const inspectLight = new THREE.HemisphereLight(16777215, 9016219, 2);

scene.add(inspectLight);

const key = new THREE.DirectionalLight(16777215, 2);

key.position.set(8, 15, 10);

scene.add(key);

const composer = new EffectComposer(renderer);

const ao = new SSAOPass(scene, camera, innerWidth, innerHeight);

ao.kernelRadius = 12;

ao.minDistance = .001;

ao.maxDistance = .1;

composer.addPass(new RenderPass(scene, camera));

composer.addPass(ao);

composer.addPass(new OutputPass);

let dirty = true, model, view, initial, complex = false, meshes = [], sourceLights = [], mode = "wire";

const originals = new Map, edgeCache = new Map, edges = [];

const solid = new THREE.MeshStandardMaterial({
    color: 14673127,
    roughness: .85,
    metalness: 0,
    side: THREE.DoubleSide
});

const wire = new THREE.MeshBasicMaterial({
    color: 4613493,
    wireframe: true,
    side: THREE.DoubleSide
});

const edgeMat = new THREE.LineBasicMaterial({
    color: 5268334,
    transparent: true,
    opacity: .6
});

function makeEdges() {
    if (edges.length) return;
    for (const mesh of meshes) {
        if (mesh.isSkinnedMesh || mesh.isInstancedMesh) continue;
        let geo = edgeCache.get(mesh.geometry);
        if (!geo) {
            geo = new THREE.EdgesGeometry(mesh.geometry, 32);
            edgeCache.set(mesh.geometry, geo);
        }
        const line = new THREE.LineSegments(geo, edgeMat);
        line.visible = false;
        mesh.add(line);
        edges.push(line);
    }
}

function setMode(next) {
    if (![ "wire", "edges", "render" ].includes(next)) return;
    dirty = true;
    mode = next;
    if (next === "edges") makeEdges();
    for (const mesh of meshes) mesh.material = next === "render" ? originals.get(mesh) : next === "wire" ? wire : solid;
    for (const e of edges) e.visible = next === "edges";
    sourceLights.forEach(l => l.visible = false);
    inspectLight.intensity = next === "render" ? .35 : .5;
    key.intensity = next === "render" ? 1.4 : 2;
    scene.environmentIntensity = next === "render" ? .65 : .25;
    document.querySelectorAll("[data-mode]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === next)));
    window.__modelViewer.mode = mode;
}

function resize() {
    dirty = true;
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h);
    composer.setSize(w, h);
    camera.aspect = w / h;
    if (view) {
        const vf = THREE.MathUtils.degToRad(view.fov);
        camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(vf / 2) * Math.max(1, view.aspect / camera.aspect)));
    }
    camera.updateProjectionMatrix();
}

window.addEventListener("resize", resize);

resize();

renderer.setAnimationLoop(() => {
    const moving = controls.update();
    if (!dirty && !moving) return;
    if (model && !complex && mode === "render") composer.render(); else renderer.render(scene, camera);
    dirty = false;
});

async function load() {
    if (!/^\d{2}$/.test(id || "")) throw Error("无效案例");
    view = await fetch(`../../assets/models/${id}.json`).then(r => {
        if (!r.ok) throw Error("场景信息暂不可用");
        return r.json();
    });
    const draco = new DRACOLoader;
    draco.setDecoderPath("./vendor/examples/jsm/libs/draco/gltf/");
    draco.setWorkerLimit(2);
    const loader = new GLTFLoader;
    loader.setDRACOLoader(draco);
    const progress = document.querySelector("#progress");
    const data = await (new THREE.FileLoader).setResponseType("arraybuffer").loadAsync(`../../assets/models/${id}.glb`, e => {
        progress.textContent = `已读取 ${(e.loaded / 1048576).toFixed(1)} MB`;
    });
    progress.textContent = "正在解析模型与材质…";
    await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
    const gltf = await loader.parseAsync(data, "../../assets/models/");
    draco.dispose();
    model = gltf.scene;
    model.traverse(o => {
        if (o.isMesh) {
            for (const m of Array.isArray(o.material) ? o.material : [ o.material ]) {
                if (m.normalMap && /height|bump|displace/i.test(m.normalMap.name)) {
                    m.bumpMap = m.normalMap;
                    m.bumpScale = .025;
                    m.normalMap = null;
                    m.needsUpdate = true;
                }
            }
            meshes.push(o);
            originals.set(o, o.material);
        }
        if (o.isLight) sourceLights.push(o);
    });
    complex = meshes.length > 3e3 || meshes.reduce((n, o) => n + (o.geometry.index?.count || o.geometry.attributes.position.count) / 3, 0) > 2e6;
    scene.add(model);
    const box = (new THREE.Box3).setFromObject(model);
    const radius = box.getSize(new THREE.Vector3).length();
    camera.position.fromArray(view.position);
    camera.up.fromArray(view.up);
    camera.near = Math.max(.01, view.near);
    camera.far = Math.max(view.far, radius * 4);
    const distance = Math.max(1, Math.min(30, radius * .15));
    controls.target.copy(camera.position).add((new THREE.Vector3).fromArray(view.forward).multiplyScalar(distance));
    if (view.presentation === "object") {
        const bounds = new THREE.Box3;
        meshes.filter(o => !/backdrop|floor|ground|^ENV_/i.test(o.name)).forEach(o => bounds.union((new THREE.Box3).setFromObject(o)));
        controls.target.copy(bounds.getCenter(new THREE.Vector3));
    }
    camera.lookAt(controls.target);
    controls.update();
    const az = controls.getAzimuthalAngle(), pol = controls.getPolarAngle();
    controls.minAzimuthAngle = az - .12;
    controls.maxAzimuthAngle = az + .12;
    controls.minPolarAngle = Math.max(.03, pol - .07);
    controls.maxPolarAngle = Math.min(Math.PI - .03, pol + .07);
    controls.minDistance = distance * .94;
    controls.maxDistance = distance * 1.08;
    if (view.presentation === "object") {
        const d = camera.position.distanceTo(controls.target);
        controls.minAzimuthAngle = -Infinity;
        controls.maxAzimuthAngle = Infinity;
        controls.minPolarAngle = .1;
        controls.maxPolarAngle = Math.PI / 2;
        controls.minDistance = d * .6;
        controls.maxDistance = d * 1.6;
    }
    initial = {
        position: camera.position.clone(),
        target: controls.target.clone()
    };
    window.__modelViewer = {
        scene: scene,
        model: model,
        camera: camera,
        controls: controls,
        renderer: renderer,
        meshes: meshes,
        mode: mode,
        setMode: setMode
    };
    resize();
    setMode("wire");
    document.querySelector("#loading").hidden = true;
    document.querySelectorAll("button").forEach(b => b.disabled = false);
    document.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => setMode(b.dataset.mode));
    document.querySelector("#reset").onclick = () => {
        dirty = true;
        camera.position.copy(initial.position);
        controls.target.copy(initial.target);
        controls.update();
    };
    parent.postMessage({
        type: "model-viewer-ready",
        id: id
    }, location.origin);
}

load().catch(e => {
    document.querySelector("#loading b").textContent = "模型暂时无法加载";
    document.querySelector("#progress").textContent = "请刷新重试，或返回场景视频查看。";
    console.error(e);
});
