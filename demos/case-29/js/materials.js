import * as THREE from "three";

export function createMaterials(T) {
    const wall = new THREE.MeshStandardMaterial({
        map: T.wallMap,
        bumpMap: T.wallBump,
        bumpScale: .055,
        roughnessMap: T.wallRough,
        roughness: .95,
        metalness: 0,
        color: 3946544,
        envMapIntensity: .22
    });
    const wallFar = new THREE.MeshStandardMaterial({
        map: T.wallFarMap,
        bumpMap: T.wallFarBump,
        bumpScale: .06,
        roughnessMap: T.wallFarRough,
        roughness: .96,
        metalness: 0,
        color: 6446418,
        envMapIntensity: .16
    });
    const stone = new THREE.MeshStandardMaterial({
        map: T.ashlarMap,
        bumpMap: T.ashlarBump,
        bumpScale: .045,
        roughnessMap: T.ashlarRough,
        roughness: .9,
        metalness: 0,
        color: 10392192,
        envMapIntensity: .24
    });
    const stoneDark = new THREE.MeshStandardMaterial({
        map: T.ashlarMap,
        bumpMap: T.ashlarBump,
        bumpScale: .055,
        roughnessMap: T.ashlarRough,
        roughness: .93,
        metalness: 0,
        color: 6709332,
        envMapIntensity: .22
    });
    const stoneTrim = new THREE.MeshStandardMaterial({
        map: T.ashlarMap,
        bumpMap: T.ashlarBump,
        bumpScale: .06,
        roughness: .87,
        metalness: 0,
        color: 8945001,
        envMapIntensity: .23
    });
    const floor = new THREE.MeshBasicMaterial({
        map: T.floorMap,
        fog: true
    });
    floor.color.setRGB(3.9, 3.65, 3.25);
    const wood = new THREE.MeshStandardMaterial({
        map: T.woodMap,
        bumpMap: T.woodBump,
        bumpScale: .016,
        roughness: .73,
        metalness: 0,
        color: 13282440,
        envMapIntensity: .32
    });
    const woodDark = new THREE.MeshStandardMaterial({
        map: T.woodDarkMap,
        bumpMap: T.woodDarkBump,
        bumpScale: .018,
        roughness: .82,
        metalness: 0,
        color: 9339508,
        envMapIntensity: .25
    });
    const iron = new THREE.MeshStandardMaterial({
        map: T.ironMap,
        roughnessMap: T.ironRough,
        roughness: .62,
        metalness: .62,
        color: 8225146,
        envMapIntensity: .82
    });
    const ironBlack = new THREE.MeshStandardMaterial({
        map: T.ironMap,
        roughnessMap: T.ironRough,
        color: 3026987,
        roughness: .82,
        metalness: .26,
        envMapIntensity: .26
    });
    const greenIron = new THREE.MeshPhysicalMaterial({
        map: T.greenIronMap,
        roughnessMap: T.greenIronRough,
        roughness: .52,
        metalness: .52,
        color: 8358013,
        clearcoat: .14,
        clearcoatRoughness: .62,
        envMapIntensity: .82
    });
    const greenBlack = new THREE.MeshPhysicalMaterial({
        map: T.greenIronMap,
        roughnessMap: T.greenIronRough,
        roughness: .56,
        metalness: .5,
        color: 5068365,
        clearcoat: .12,
        envMapIntensity: .78
    });
    const copper = new THREE.MeshStandardMaterial({
        map: T.copperMap,
        roughnessMap: T.copperRough,
        roughness: .31,
        metalness: .98,
        color: 13079917,
        envMapIntensity: 1.12
    });
    const copperDark = new THREE.MeshStandardMaterial({
        map: T.copperMap,
        roughnessMap: T.copperRough,
        roughness: .44,
        metalness: .92,
        color: 9135175,
        envMapIntensity: 1
    });
    const brass = new THREE.MeshStandardMaterial({
        map: T.brassMap,
        roughnessMap: T.brassRough,
        roughness: .27,
        metalness: 1,
        color: 13281906,
        envMapIntensity: 1.05
    });
    const steel = new THREE.MeshStandardMaterial({
        roughness: .46,
        metalness: .88,
        color: 5133653,
        envMapIntensity: .85
    });
    const glass = new THREE.MeshStandardMaterial({
        map: T.glassTex,
        emissiveMap: T.glassTex,
        emissive: 14148584,
        emissiveIntensity: 1.88,
        color: 1712673,
        roughness: .34,
        metalness: .04,
        envMapIntensity: .18,
        side: THREE.DoubleSide,
        toneMapped: true
    });
    const lampGlass = new THREE.MeshPhysicalMaterial({
        color: 16766880,
        emissive: 16753992,
        emissiveIntensity: 3.8,
        roughness: .2,
        metalness: 0,
        transmission: .35,
        transparent: true,
        opacity: .9,
        envMapIntensity: .4
    });
    const lampIron = new THREE.MeshStandardMaterial({
        roughness: .5,
        metalness: .68,
        color: 1513751,
        envMapIntensity: .8
    });
    const blueprint = new THREE.MeshBasicMaterial({
        map: T.blueprintTex,
        color: 10654841,
        fog: true
    });
    const plaque = new THREE.MeshStandardMaterial({
        map: T.plaqueTex,
        roughnessMap: T.ironRough,
        roughness: .5,
        metalness: .3,
        color: 13813682,
        emissive: 11771259,
        emissiveMap: T.plaqueTex,
        emissiveIntensity: .85,
        envMapIntensity: .65
    });
    const gaugeFace = new THREE.MeshStandardMaterial({
        map: T.gaugeTex,
        emissiveMap: T.gaugeTex,
        emissive: 14273958,
        emissiveIntensity: 0,
        roughness: .78,
        metalness: .03,
        color: 5919557,
        envMapIntensity: .3
    });
    const needle = new THREE.MeshStandardMaterial({
        color: 2957591,
        roughness: .4,
        metalness: .62
    });
    const rope = new THREE.MeshStandardMaterial({
        color: 7100992,
        roughness: .94,
        metalness: 0
    });
    const bristle = new THREE.MeshStandardMaterial({
        color: 7956294,
        roughness: .95,
        metalness: 0
    });
    const wax = new THREE.MeshStandardMaterial({
        color: 3025182,
        roughness: .8,
        metalness: 0
    });
    const perforated = new THREE.MeshStandardMaterial({
        map: T.perforatedTex,
        alphaTest: .5,
        transparent: false,
        side: THREE.DoubleSide,
        color: 5789520,
        roughness: .72,
        metalness: .38,
        envMapIntensity: .45
    });
    const stairIron = new THREE.MeshStandardMaterial({
        map: T.ironMap,
        roughnessMap: T.ironRough,
        color: 2303263,
        roughness: .8,
        metalness: .22,
        envMapIntensity: .22
    });
    const treadIron = new THREE.MeshLambertMaterial({
        map: T.perforatedTex,
        alphaTest: .34,
        transparent: false,
        side: THREE.DoubleSide,
        color: 1513490
    });
    const windowBar = new THREE.MeshStandardMaterial({
        map: T.ironMap,
        color: 4934725,
        roughness: .65,
        metalness: .58,
        envMapIntensity: .6
    });
    const dampStain = new THREE.MeshStandardMaterial({
        map: T.dampTex,
        transparent: true,
        opacity: .72,
        roughness: 1,
        metalness: 0,
        color: 16777215,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    const dirt = new THREE.MeshStandardMaterial({
        color: 725264,
        roughness: .5,
        metalness: .25
    });
    const bone = new THREE.MeshStandardMaterial({
        color: 12103319,
        roughness: .65,
        metalness: 0
    });
    return {
        wall: wall,
        wallFar: wallFar,
        stone: stone,
        stoneDark: stoneDark,
        stoneTrim: stoneTrim,
        floor: floor,
        wood: wood,
        woodDark: woodDark,
        iron: iron,
        ironBlack: ironBlack,
        greenIron: greenIron,
        greenBlack: greenBlack,
        copper: copper,
        copperDark: copperDark,
        brass: brass,
        steel: steel,
        glass: glass,
        lampGlass: lampGlass,
        lampIron: lampIron,
        blueprint: blueprint,
        plaque: plaque,
        gaugeFace: gaugeFace,
        needle: needle,
        rope: rope,
        bristle: bristle,
        wax: wax,
        perforated: perforated,
        stairIron: stairIron,
        treadIron: treadIron,
        windowBar: windowBar,
        dampStain: dampStain,
        dirt: dirt,
        bone: bone
    };
}
