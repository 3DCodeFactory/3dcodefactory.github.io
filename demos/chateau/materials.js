import * as THREE from "./vendor/three.module.js";

import { limestoneTextures, slateTextures, fieldstoneTextures, brickTextures, gravelTextures, grassTextures, barkTextures, topiaryTextures, foliageTexture, ivyTexture, firTexture, firSilhouetteTexture, windowTextures, oculusTexture, hydrangeaLeafTexture, hydrangeaBloomTexture, leafLitterTexture, mulberry32 } from "./textures.js";

export function scaledBoxGeometry(w, h, d, tileU = 4, tileV = 2.7) {
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv;
    const faceDims = [ [ d, h ], [ d, h ], [ w, d ], [ w, d ], [ w, h ], [ w, h ] ];
    for (let f = 0; f < 6; f++) {
        const [fs, ft] = faceDims[f];
        for (let i = 0; i < 4; i++) {
            const k = f * 4 + i;
            uv.setXY(k, uv.getX(k) * fs / tileU, uv.getY(k) * ft / tileV);
        }
    }
    uv.needsUpdate = true;
    return g;
}

let _cache = null;

export function getMaterials() {
    if (_cache) return _cache;
    const limestone = limestoneTextures();
    const slate = slateTextures();
    const fieldstone = fieldstoneTextures();
    const brick = brickTextures();
    const gravel = gravelTextures();
    const grass = grassTextures();
    const bark = barkTextures();
    const topiary = topiaryTextures();
    const glazing = windowTextures(false);
    const glazingLit = windowTextures(true);
    const ivy = ivyTexture();
    const fir = firTexture(3);
    const litter = leafLitterTexture();
    const oculus = oculusTexture();
    const M = {};
    M.limestone = new THREE.MeshStandardMaterial({
        map: limestone.map,
        bumpMap: limestone.bump,
        bumpScale: .085,
        roughness: .9,
        metalness: 0,
        color: 15327179,
        envMapIntensity: .55
    });
    M.limestoneWarm = M.limestone.clone();
    M.limestoneWarm.color.set(15722712);
    M.limestoneTrim = new THREE.MeshStandardMaterial({
        map: limestone.map,
        bumpMap: limestone.bump,
        bumpScale: .06,
        roughness: .88,
        color: 15524817
    });
    M.plinth = new THREE.MeshStandardMaterial({
        map: limestone.map,
        bumpMap: limestone.bump,
        bumpScale: .14,
        roughness: .98,
        color: 8947065
    });
    M.fieldstone = new THREE.MeshStandardMaterial({
        map: fieldstone.map,
        bumpMap: fieldstone.bump,
        bumpScale: .22,
        roughness: .98,
        color: 11579292
    });
    M.fieldstoneCap = new THREE.MeshStandardMaterial({
        map: fieldstone.map,
        bumpMap: fieldstone.bump,
        bumpScale: .1,
        roughness: .97,
        color: 9409664
    });
    M.slate = new THREE.MeshStandardMaterial({
        map: slate.map,
        side: THREE.DoubleSide,
        bumpMap: slate.bump,
        bumpScale: .12,
        roughness: .74,
        metalness: .035,
        color: 9541781,
        envMapIntensity: .48
    });
    M.brick = new THREE.MeshStandardMaterial({
        map: brick.map,
        bumpMap: brick.bump,
        bumpScale: .1,
        roughness: .95,
        color: 10521977
    });
    M.gravel = new THREE.MeshStandardMaterial({
        map: gravel.map,
        bumpMap: gravel.bump,
        bumpScale: .22,
        roughnessMap: gravel.roughnessMap,
        roughness: .82,
        metalness: 0,
        color: 14275010,
        envMapIntensity: .38
    });
    M.grass = new THREE.MeshStandardMaterial({
        map: grass.map,
        bumpMap: grass.bump,
        bumpScale: .075,
        roughness: .98,
        color: 12895142
    });
    M.bark = new THREE.MeshStandardMaterial({
        map: bark.map,
        bumpMap: bark.bump,
        bumpScale: .16,
        roughness: .98,
        color: 12760479
    });
    M.topiary = new THREE.MeshStandardMaterial({
        map: topiary.map,
        bumpMap: topiary.bump,
        bumpScale: .24,
        roughness: .98,
        color: 12832169
    });
    M.zinc = new THREE.MeshStandardMaterial({
        color: 3225658,
        roughness: .42,
        metalness: .65
    });
    M.iron = new THREE.MeshStandardMaterial({
        color: 2501674,
        roughness: .46,
        metalness: .66
    });
    M.lead = new THREE.MeshStandardMaterial({
        color: 5528926,
        roughness: .5,
        metalness: .42
    });
    M.terracotta = new THREE.MeshStandardMaterial({
        color: 9392437,
        roughness: .88
    });
    M.soot = new THREE.MeshStandardMaterial({
        color: 3353896,
        roughness: .98
    });
    M.door = new THREE.MeshStandardMaterial({
        color: 2890256,
        roughness: .46,
        metalness: .05
    });
    M.copper = new THREE.MeshStandardMaterial({
        color: 5203802,
        roughness: .6,
        metalness: .35
    });
    M.windowTrimPaint = new THREE.MeshStandardMaterial({
        color: 14209730,
        roughness: .7
    });
    M.glass = new THREE.MeshStandardMaterial({
        map: glazing.map,
        emissiveMap: glazing.emissive,
        emissive: new THREE.Color(16761210),
        emissiveIntensity: .002,
        roughness: .21,
        metalness: .12,
        envMapIntensity: 2.5,
        color: 12832208
    });
    M.glassLit = new THREE.MeshStandardMaterial({
        map: glazing.map,
        emissiveMap: glazingLit.emissive,
        emissive: new THREE.Color(16758117),
        emissiveIntensity: .08,
        roughness: .27,
        metalness: .12,
        envMapIntensity: 2.2,
        color: 16777215
    });
    M.glassUnlit = M.glass;
    M.oculus = new THREE.MeshStandardMaterial({
        map: oculus,
        roughness: .35,
        metalness: .25,
        emissive: new THREE.Color(16758638),
        emissiveIntensity: .04,
        envMapIntensity: 1.1
    });
    M.foliageOak = new THREE.MeshStandardMaterial({
        map: foliageTexture("oak", 5),
        alphaTest: .3,
        side: THREE.DoubleSide,
        roughness: .93,
        color: 14211771,
        emissive: new THREE.Color(1844242),
        emissiveIntensity: .04
    });
    M.foliageGold = new THREE.MeshStandardMaterial({
        map: foliageTexture("gold", 8),
        alphaTest: .3,
        side: THREE.DoubleSide,
        roughness: .93,
        color: 14669494,
        emissive: new THREE.Color(2367248),
        emissiveIntensity: .04
    });
    M.foliageDeep = new THREE.MeshStandardMaterial({
        map: foliageTexture("deep", 13),
        alphaTest: .34,
        side: THREE.DoubleSide,
        roughness: .95,
        color: 12372386,
        emissive: new THREE.Color(1186573),
        emissiveIntensity: .03
    });
    M.foliageDarkGold = new THREE.MeshStandardMaterial({
        map: foliageTexture("darkgold", 17),
        alphaTest: .3,
        side: THREE.DoubleSide,
        roughness: .93,
        color: 14076841,
        emissive: new THREE.Color(2367248),
        emissiveIntensity: .035
    });
    const leafDepth = map => new THREE.MeshDepthMaterial({
        depthPacking: THREE.RGBADepthPacking,
        map: map,
        alphaTest: .34,
        side: THREE.DoubleSide
    });
    M.foliageOakDepth = leafDepth(M.foliageOak.map);
    M.foliageGoldDepth = leafDepth(M.foliageGold.map);
    M.foliageDeepDepth = leafDepth(M.foliageDeep.map);
    M.foliageDarkGoldDepth = leafDepth(M.foliageDarkGold.map);
    M.ivy = new THREE.MeshStandardMaterial({
        map: ivy,
        alphaTest: .34,
        side: THREE.DoubleSide,
        roughness: .93,
        color: 14082998
    });
    M.ivyDepth = leafDepth(M.ivy.map);
    M.fir = new THREE.MeshStandardMaterial({
        map: fir,
        alphaTest: .28,
        side: THREE.DoubleSide,
        roughness: .95,
        color: 10464391
    });
    M.firDepth = leafDepth(M.fir.map);
    M.firCard = new THREE.MeshStandardMaterial({
        map: firSilhouetteTexture(4),
        alphaTest: .22,
        side: THREE.DoubleSide,
        roughness: 1,
        color: 14541770,
        emissive: new THREE.Color(2240538),
        emissiveIntensity: .16
    });
    M.litter = new THREE.MeshStandardMaterial({
        map: litter,
        transparent: true,
        alphaTest: .25,
        roughness: .9
    });
    M.hydrangea = new THREE.MeshStandardMaterial({
        color: 16777215,
        roughness: .94,
        emissive: 2763548,
        emissiveIntensity: .02,
        map: hydrangeaBloomTexture(6),
        alphaTest: .28,
        side: THREE.DoubleSide
    });
    M.hydrangeaRose = new THREE.MeshStandardMaterial({
        color: 14206382,
        roughness: .92
    });
    M.hydrangeaLeaf = new THREE.MeshStandardMaterial({
        color: 5069880,
        roughness: .95,
        side: THREE.DoubleSide
    });
    M.hydrangeaLeafCard = new THREE.MeshStandardMaterial({
        map: hydrangeaLeafTexture(),
        alphaTest: .3,
        side: THREE.DoubleSide,
        roughness: .95,
        color: 13162158
    });
    const hydrDepth = map => new THREE.MeshDepthMaterial({
        depthPacking: THREE.RGBADepthPacking,
        map: map,
        alphaTest: .34,
        side: THREE.DoubleSide
    });
    M.hydrangeaDepth = hydrDepth(M.hydrangea.map);
    M.hydrangeaLeafDepth = hydrDepth(M.hydrangeaLeafCard.map);
    M.carvedStone = new THREE.MeshStandardMaterial({
        color: 15854299,
        roughness: .83,
        bumpMap: limestone.bump,
        bumpScale: .025
    });
    M.darkOpening = new THREE.MeshStandardMaterial({
        color: 723979,
        roughness: .8
    });
    _cache = M;
    return M;
}
