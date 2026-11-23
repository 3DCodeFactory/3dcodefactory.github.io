import * as THREE from "three";

import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

function isProtected(object, protectedRoots) {
    let o = object;
    while (o) {
        if (protectedRoots.has(o)) return true;
        if (o.userData && o.userData.noMerge) return true;
        o = o.parent;
    }
    return false;
}

function makeMergeableGeometry(mesh) {
    const src = mesh.geometry;
    if (!src || !src.attributes.position) return null;
    if (src.morphAttributes && Object.keys(src.morphAttributes).length) return null;
    let geo = src.index ? src.toNonIndexed() : src.clone();
    for (const name of Object.keys(geo.attributes)) {
        if (name !== "position" && name !== "normal" && name !== "uv") geo.deleteAttribute(name);
    }
    if (!geo.attributes.normal) geo.computeVertexNormals();
    if (!geo.attributes.uv) {
        geo.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    }
    geo.morphAttributes = {};
    geo.clearGroups();
    return geo;
}

function canMerge(mesh, root) {
    if (!mesh.isMesh || mesh.isInstancedMesh || mesh.isSkinnedMesh) return false;
    if (!mesh.visible) return false;
    const mat = mesh.material;
    if (!mat || Array.isArray(mat)) return false;
    if (mat.transparent || mat.transmission !== undefined && mat.transmission > 0) return false;
    if (mat.depthWrite === false) return false;
    if (mat.blending !== undefined && mat.blending !== THREE.NormalBlending) return false;
    if (mat.opacity < .999) return false;
    if (mesh.renderOrder !== 0) return false;
    if (isProtected(mesh, root.protected)) return false;
    return true;
}

function mergeBucket(bucket, name) {
    if (!bucket.geoms.length) return null;
    const geo = bucket.geoms.length === 1 ? bucket.geoms[0] : mergeGeometries(bucket.geoms, false);
    if (!geo) return null;
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    const merged = new THREE.Mesh(geo, bucket.material);
    merged.name = name;
    merged.castShadow = bucket.cast;
    merged.receiveShadow = bucket.receive;
    merged.renderOrder = bucket.renderOrder;
    merged.frustumCulled = true;
    return merged;
}

export function mergeGroupByMaterial(root) {
    if (!root) return;
    root.updateWorldMatrix(true, true);
    const inverse = (new THREE.Matrix4).copy(root.matrixWorld).invert();
    const buckets = new Map;
    const victims = [];
    const protectedSet = new Set;
    root.traverse(obj => {
        if (obj === root) return;
        if (!canMerge(obj, {
            protected: protectedSet
        })) return;
        const mat = obj.material;
        const key = `${mat.uuid}|${obj.castShadow ? 1 : 0}|${obj.receiveShadow ? 1 : 0}`;
        let bucket = buckets.get(key);
        if (!bucket) {
            bucket = {
                material: mat,
                geoms: [],
                cast: obj.castShadow,
                receive: obj.receiveShadow,
                renderOrder: obj.renderOrder
            };
            buckets.set(key, bucket);
        }
        const geo = makeMergeableGeometry(obj);
        if (!geo) return;
        const local = (new THREE.Matrix4).multiplyMatrices(inverse, obj.matrixWorld);
        geo.applyMatrix4(local);
        bucket.geoms.push(geo);
        victims.push(obj);
    });
    for (const [key, bucket] of buckets) {
        const merged = mergeBucket(bucket, `merged:${bucket.material.name || bucket.material.type}:${key.slice(-6)}`);
        if (merged) root.add(merged);
    }
    for (const obj of victims) {
        obj.parent?.remove(obj);
        obj.geometry?.dispose();
    }
}

export function mergeStaticScene(scene, protectedRoots = []) {
    scene.updateMatrixWorld(true);
    const protectedSet = protectedRoots instanceof Set ? protectedRoots : new Set(protectedRoots);
    const buckets = new Map;
    const victims = [];
    scene.traverse(obj => {
        if (!canMerge(obj, {
            protected: protectedSet
        })) return;
        const mat = obj.material;
        const key = `${mat.uuid}|${obj.castShadow ? 1 : 0}|${obj.receiveShadow ? 1 : 0}|${obj.renderOrder}`;
        let bucket = buckets.get(key);
        if (!bucket) {
            bucket = {
                material: mat,
                geoms: [],
                cast: obj.castShadow,
                receive: obj.receiveShadow,
                renderOrder: obj.renderOrder
            };
            buckets.set(key, bucket);
        }
        const geo = makeMergeableGeometry(obj);
        if (!geo) return;
        geo.applyMatrix4(obj.matrixWorld);
        bucket.geoms.push(geo);
        victims.push(obj);
    });
    const mergedRoot = new THREE.Group;
    mergedRoot.name = "Baked static atelier geometry";
    scene.add(mergedRoot);
    let index = 0;
    for (const [key, bucket] of buckets) {
        const merged = mergeBucket(bucket, `static:${bucket.material.name || bucket.material.type}:${index++}`);
        if (merged) mergedRoot.add(merged);
    }
    for (const obj of victims) {
        obj.parent?.remove(obj);
        obj.geometry?.dispose();
    }
    return {
        mergedRoot: mergedRoot,
        buckets: buckets.size,
        sourceMeshes: victims.length
    };
}
