import * as THREE from "three";

import { createPlaster, createWood, createFloorTexture, createRug, createVelvet, createPillowTextures, createThrowTexture, createStainedGlass, createArtNouveauPoster, createBotanicalPrint, createSmallSketch, createLeafTexture, createCarvedPanel, createMirrorReflection, createContactShadowTexture, createMonsteraLeafTexture, createWallPatina, createChairTextile } from "./textures.js";

import { createExteriorView } from "./exterior.js";

function imageTexture(img, {srgb: srgb = true, anisotropy: anisotropy = 8} = {}) {
    const t = new THREE.Texture(img);
    t.needsUpdate = true;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = anisotropy;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = true;
    return t;
}

export function createMaterialLibrary(photos = {}) {
    const has = k => photos[k] instanceof HTMLImageElement && photos[k].naturalWidth > 0;
    const photoTex = (img, anisotropy = 8) => imageTexture(img, {
        anisotropy: anisotropy
    });
    const photoBump = img => imageTexture(img, {
        srgb: false,
        anisotropy: 8
    });
    const tex = {};
    tex.poster = createArtNouveauPoster();
    tex.botanical = createBotanicalPrint();
    tex.sketchA = createSmallSketch(3);
    tex.sketchB = createSmallSketch(4);
    tex.exterior = createExteriorView();
    tex.leaf = createLeafTexture();
    tex.monsteraLeaf = createMonsteraLeafTexture();
    tex.mirror = createMirrorReflection();
    tex.stained = createStainedGlass();
    tex.contactShadow = createContactShadowTexture();
    tex.patinaWarm = createWallPatina({
        seed: 37,
        cool: false
    });
    tex.patinaCool = createWallPatina({
        seed: 71,
        cool: true
    });
    tex.floor = createFloorTexture();
    tex.carved = createCarvedPanel();
    tex.pillows = createPillowTextures();
    if (has("suzani")) {
        tex.pillows.floral = {
            map: photoTex(photos.suzani),
            bump: photoBump(photos.suzani)
        };
    }
    if (has("kilim")) {
        tex.pillows.kilim = {
            map: photoTex(photos.kilim),
            bump: photoBump(photos.kilim)
        };
    }
    if (has("poppy")) {
        tex.pillows.botanical = {
            map: photoTex(photos.poppy),
            bump: photoBump(photos.poppy)
        };
    }
    if (has("paisley")) {
        tex.pillows.paisley = {
            map: photoTex(photos.paisley),
            bump: photoBump(photos.paisley)
        };
    }
    if (has("crescent")) {
        tex.pillows.wine = {
            map: photoTex(photos.crescent),
            bump: photoBump(photos.crescent)
        };
    }
    if (has("velvetPhoto")) {
        tex.pillows.velvet = {
            map: photoTex(photos.velvetPhoto),
            bump: photoBump(photos.velvetPhoto)
        };
    }
    if (has("throwTextile")) {
        tex.throw = {
            map: photoTex(photos.throwTextile),
            bump: photoBump(photos.throwTextile)
        };
    } else {
        tex.throw = createThrowTexture();
    }
    tex.chairTextile = createChairTextile();
    tex.plasterTerracotta = createPlaster({
        base: "#8f5f51",
        light: "#bf9583",
        shadow: "#64453e",
        worn: "#d6c9b9",
        seed: 23,
        stains: 9
    });
    tex.plasterSage = createPlaster({
        base: "#768b81",
        light: "#a5b5a9",
        shadow: "#4b6159",
        worn: "#d7d0c2",
        seed: 77,
        stains: 7
    });
    tex.plasterCream = createPlaster({
        base: "#d9cdb6",
        light: "#f1e7d2",
        shadow: "#ab9c80",
        worn: "#f6efdf",
        seed: 14,
        stains: 4
    });
    tex.woodWalnut = createWood({
        base: "#6c4630",
        dark: "#392214",
        light: "#b68254",
        seed: 8,
        knots: 5
    });
    tex.woodOak = createWood({
        base: "#8b6038",
        dark: "#4a2f1a",
        light: "#c69a62",
        seed: 18,
        knots: 3
    });
    tex.woodDark = createWood({
        base: "#42251a",
        dark: "#1d0e08",
        light: "#845b39",
        seed: 29,
        knots: 2
    });
    tex.velvet = createVelvet({
        base: "#4a251e",
        highlight: "#7b4734",
        seed: 11
    });
    tex.velvetOlive = createVelvet({
        base: "#8a876c",
        highlight: "#b4ad88",
        seed: 19
    });
    tex.velvetBlue = createVelvet({
        base: "#5f7679",
        highlight: "#9caeaa",
        seed: 31
    });
    if (has("rug")) {
        tex.rug = {
            map: photoTex(photos.rug, 16),
            bump: has("rugBump") ? photoBump(photos.rugBump) : null
        };
    } else {
        tex.rug = createRug({
            seed: 88,
            W: 1400,
            H: 1578,
            field: "#6c3934",
            fieldDeep: "#492929",
            border: "#b9a27e",
            borderIn: "#563f3b",
            indigo: "#283845",
            rose: "#96685f",
            cream: "#d1bd98",
            gold: "#a47c4e",
            worn: "#b6a17f",
            medallion: false
        });
    }
    if (has("rugBase")) {
        tex.rugCream = {
            map: photoTex(photos.rugBase, 16),
            bump: has("rugBaseBump") ? photoBump(photos.rugBaseBump) : null
        };
    } else {
        tex.rugCream = createRug({
            seed: 141,
            W: 900,
            H: 1012,
            field: "#ad987a",
            fieldDeep: "#8d7960",
            border: "#684a43",
            borderIn: "#c0ac8a",
            indigo: "#3d4a53",
            rose: "#91665b",
            cream: "#e1d0b1",
            gold: "#9d7b52",
            worn: "#cbb997",
            medallion: false
        });
    }
    tex.runner = createRug({
        seed: 233,
        W: 600,
        H: 1750,
        field: "#45545d",
        fieldDeep: "#303e47",
        border: "#ac9570",
        borderIn: "#3c4b54",
        indigo: "#26343e",
        rose: "#97604f",
        cream: "#cbb993",
        gold: "#a68454",
        worn: "#a59a82",
        medallion: false
    });
    const std = opts => new THREE.MeshStandardMaterial(opts);
    const m = {};
    m.terracotta = std({
        map: tex.plasterTerracotta.map,
        bumpMap: tex.plasterTerracotta.bump,
        bumpScale: .026,
        roughness: .94,
        metalness: 0,
        envMapIntensity: .35
    });
    m.sage = std({
        map: tex.plasterSage.map,
        bumpMap: tex.plasterSage.bump,
        bumpScale: .028,
        roughness: .96,
        metalness: 0,
        envMapIntensity: .3
    });
    m.creamWall = std({
        map: tex.plasterCream.map,
        bumpMap: tex.plasterCream.bump,
        bumpScale: .018,
        roughness: .95,
        envMapIntensity: .25
    });
    m.ceiling = std({
        color: 15261646,
        roughness: .96,
        envMapIntensity: .2
    });
    m.plasterRelief = std({
        color: 14207922,
        roughness: .88,
        envMapIntensity: .3
    });
    m.plasterShadow = std({
        color: 11773067,
        roughness: .92
    });
    m.wallPatinaWarm = new THREE.MeshStandardMaterial({
        map: tex.patinaWarm,
        transparent: true,
        roughness: .93,
        metalness: 0,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        envMapIntensity: .2,
        opacity: .26,
        side: THREE.DoubleSide
    });
    m.wallPatinaCool = new THREE.MeshStandardMaterial({
        map: tex.patinaCool,
        transparent: true,
        roughness: .94,
        metalness: 0,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        envMapIntensity: .2,
        opacity: .18,
        side: THREE.DoubleSide
    });
    m.floor = std({
        map: tex.floor.map,
        bumpMap: tex.floor.bump,
        bumpScale: .018,
        roughness: .46,
        metalness: .02,
        envMapIntensity: .55
    });
    m.rug = std({
        map: tex.rug.map,
        bumpMap: tex.rug.bump,
        bumpScale: .024,
        roughness: .94,
        envMapIntensity: .13,
        color: 14473686
    });
    m.rugCream = std({
        map: tex.rugCream.map,
        bumpMap: tex.rugCream.bump,
        bumpScale: .01,
        roughness: .95,
        envMapIntensity: .16,
        color: 14077633
    });
    m.runner = std({
        map: tex.runner.map,
        bumpMap: tex.runner.bump,
        bumpScale: .026,
        roughness: .94,
        envMapIntensity: .2
    });
    m.woodWalnut = std({
        map: tex.woodWalnut.map,
        bumpMap: tex.woodWalnut.bump,
        bumpScale: .02,
        roughness: .56,
        metalness: 0,
        envMapIntensity: .6
    });
    m.woodOak = std({
        map: tex.woodOak.map,
        bumpMap: tex.woodOak.bump,
        bumpScale: .017,
        roughness: .52,
        metalness: 0,
        envMapIntensity: .55
    });
    m.woodDark = std({
        map: tex.woodDark.map,
        bumpMap: tex.woodDark.bump,
        bumpScale: .024,
        roughness: .48,
        metalness: 0,
        envMapIntensity: .65
    });
    m.carvedWood = std({
        map: tex.carved.map,
        bumpMap: tex.carved.bump,
        bumpScale: .045,
        roughness: .5,
        metalness: .02,
        envMapIntensity: .8
    });
    m.brass = std({
        color: 11634504,
        metalness: 1,
        roughness: .22,
        envMapIntensity: 1.75
    });
    m.brassAged = std({
        color: 9069873,
        metalness: .92,
        roughness: .36,
        envMapIntensity: 1.3
    });
    m.brassDark = std({
        color: 6178086,
        metalness: .85,
        roughness: .44,
        envMapIntensity: 1
    });
    m.iron = std({
        color: 2761757,
        metalness: .7,
        roughness: .46,
        envMapIntensity: .8
    });
    m.gold = std({
        color: 12293201,
        metalness: .95,
        roughness: .3,
        envMapIntensity: 1.5
    });
    m.velvetRust = new THREE.MeshPhysicalMaterial({
        map: tex.velvet.map,
        bumpMap: tex.velvet.bump,
        bumpScale: .018,
        roughness: .91,
        metalness: 0,
        sheen: .64,
        sheenColor: new THREE.Color(9329477),
        sheenRoughness: .6,
        envMapIntensity: .27,
        color: 14268323
    });
    m.velvetRustDark = new THREE.MeshPhysicalMaterial({
        map: tex.velvet.map,
        bumpMap: tex.velvet.bump,
        bumpScale: .022,
        color: 5911335,
        roughness: .9,
        sheen: .65,
        sheenColor: new THREE.Color(9790029),
        sheenRoughness: .55,
        envMapIntensity: .3
    });
    m.velvetOlive = new THREE.MeshPhysicalMaterial({
        map: tex.velvetOlive.map,
        bumpMap: tex.velvetOlive.bump,
        bumpScale: .02,
        roughness: .82,
        sheen: .85,
        sheenColor: new THREE.Color(13024661),
        sheenRoughness: .52,
        envMapIntensity: .4
    });
    m.velvetBlue = new THREE.MeshPhysicalMaterial({
        map: tex.velvetBlue.map,
        bumpMap: tex.velvetBlue.bump,
        bumpScale: .024,
        color: 16777215,
        roughness: .84,
        sheen: .9,
        sheenColor: new THREE.Color(11123636),
        sheenRoughness: .52,
        envMapIntensity: .42
    });
    m.velvetBlue = new THREE.MeshPhysicalMaterial({
        map: tex.velvetBlue.map,
        bumpMap: tex.velvetBlue.bump,
        bumpScale: .024,
        color: 16777215,
        roughness: .84,
        sheen: .9,
        sheenColor: new THREE.Color(11123636),
        sheenRoughness: .52,
        envMapIntensity: .42
    });
    m.armchairFabric = new THREE.MeshPhysicalMaterial({
        map: tex.chairTextile.map,
        bumpMap: tex.chairTextile.bump,
        bumpScale: .012,
        roughness: .92,
        metalness: 0,
        sheen: .35,
        sheenColor: new THREE.Color(11909286),
        sheenRoughness: .7,
        envMapIntensity: .25,
        color: 16777215
    });
    m.woolTeal = std({
        color: 5466720,
        roughness: .97,
        envMapIntensity: .14
    });
    m.throwCream = new THREE.MeshPhysicalMaterial({
        color: 14076082,
        roughness: .98,
        metalness: 0,
        bumpMap: tex.throw.bump,
        bumpScale: .014,
        sheen: .3,
        sheenColor: new THREE.Color(13351319),
        sheenRoughness: .75,
        side: THREE.DoubleSide,
        envMapIntensity: .12
    });
    m.plainSlate = new THREE.MeshPhysicalMaterial({
        color: 3160642,
        roughness: .9,
        sheen: .65,
        sheenColor: new THREE.Color(7109508),
        sheenRoughness: .6,
        envMapIntensity: .25
    });
    m.linen = std({
        color: 13153169,
        roughness: .92,
        envMapIntensity: .25
    });
    m.linenLight = std({
        color: 14667957,
        roughness: .9,
        envMapIntensity: .25
    });
    m.wine = std({
        color: 6896699,
        roughness: .88,
        envMapIntensity: .25
    });
    m.ceramicCream = std({
        color: 14339502,
        roughness: .32,
        envMapIntensity: .8
    });
    m.ceramicIvory = std({
        color: 15261641,
        roughness: .24,
        envMapIntensity: .9
    });
    m.ceramicRose = std({
        color: 11101782,
        roughness: .34,
        envMapIntensity: .7
    });
    m.ceramicOlive = std({
        color: 7763036,
        roughness: .38,
        envMapIntensity: .7
    });
    m.ceramicIndigo = std({
        color: 3359824,
        roughness: .3,
        envMapIntensity: .8
    });
    m.clay = std({
        color: 10906703,
        roughness: .85,
        envMapIntensity: .2
    });
    m.glass = new THREE.MeshPhysicalMaterial({
        color: 13424837,
        roughness: .07,
        metalness: 0,
        transparent: true,
        opacity: .28,
        envMapIntensity: 1.5,
        side: THREE.DoubleSide,
        depthWrite: false,
        transmission: 0
    });
    m.glassAmber = new THREE.MeshPhysicalMaterial({
        color: 12158783,
        roughness: .08,
        metalness: 0,
        transparent: true,
        opacity: .42,
        envMapIntensity: 1.5,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    m.mirror = new THREE.MeshBasicMaterial({
        map: tex.mirror,
        color: 13617080,
        toneMapped: true
    });
    m.contactShadow = new THREE.MeshBasicMaterial({
        map: tex.contactShadow,
        transparent: true,
        opacity: .5,
        depthWrite: false,
        color: 16777215,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        side: THREE.DoubleSide
    });
    m.mirrorFrame = std({
        color: 8149813,
        metalness: .6,
        roughness: .35,
        envMapIntensity: 1
    });
    m.poster = std({
        map: tex.poster,
        color: 13284507,
        roughness: .9,
        envMapIntensity: .12
    });
    m.botanical = std({
        map: tex.botanical,
        roughness: .9,
        envMapIntensity: .12
    });
    m.sketchA = std({
        map: tex.sketchA,
        color: 13352095,
        roughness: .92,
        envMapIntensity: .1
    });
    m.sketchB = std({
        map: tex.sketchB,
        color: 13352095,
        roughness: .92,
        envMapIntensity: .1
    });
    m.leafBouquet = new THREE.MeshStandardMaterial({
        map: tex.leaf.map,
        bumpMap: tex.leaf.bump,
        bumpScale: .006,
        color: 9674871,
        roughness: .58,
        metalness: 0,
        side: THREE.DoubleSide,
        envMapIntensity: .4
    });
    m.leaf = new THREE.MeshStandardMaterial({
        map: tex.leaf.map,
        bumpMap: tex.leaf.bump,
        bumpScale: .008,
        color: 16777215,
        roughness: .52,
        metalness: 0,
        side: THREE.DoubleSide,
        envMapIntensity: .5
    });
    m.leafMonstera = new THREE.MeshStandardMaterial({
        map: tex.monsteraLeaf.map,
        bumpMap: tex.monsteraLeaf.bump,
        bumpScale: .008,
        color: 16777215,
        roughness: .5,
        metalness: 0,
        side: THREE.DoubleSide,
        alphaTest: .5,
        envMapIntensity: .5
    });
    m.leafDark = m.leaf.clone();
    m.leafDark.color = new THREE.Color(7372894);
    m.stem = std({
        color: 5000494,
        roughness: .8
    });
    m.stemLight = std({
        color: 7172686,
        roughness: .8
    });
    m.bark = std({
        color: 5914922,
        roughness: .9
    });
    m.book = std({
        color: 16777215,
        roughness: .8,
        envMapIntensity: .28
    });
    m.paper = std({
        color: 14075819,
        roughness: .96,
        envMapIntensity: .12
    });
    m.bookPage = std({
        color: 14272163,
        roughness: .95,
        envMapIntensity: .1
    });
    m.leatherRed = std({
        color: 7156527,
        roughness: .62,
        envMapIntensity: .3
    });
    m.leatherBlue = std({
        color: 3096912,
        roughness: .62,
        envMapIntensity: .3
    });
    m.leatherGreen = std({
        color: 4673852,
        roughness: .64,
        envMapIntensity: .3
    });
    m.leatherTan = std({
        color: 10187592,
        roughness: .66,
        envMapIntensity: .3
    });
    m.candle = std({
        color: 15260866,
        roughness: .54,
        envMapIntensity: .4
    });
    m.flame = new THREE.MeshBasicMaterial({
        color: 16760937,
        toneMapped: false
    });
    m.wick = std({
        color: 2892055,
        roughness: 1
    });
    m.windowWood = std({
        map: tex.woodWalnut.map,
        bumpMap: tex.woodWalnut.bump,
        bumpScale: .02,
        color: 14266246,
        roughness: .46,
        metalness: .04,
        envMapIntensity: 1.05
    });
    m.windowWoodDark = std({
        map: tex.woodWalnut.map,
        bumpMap: tex.woodWalnut.bump,
        bumpScale: .024,
        color: 10188631,
        roughness: .44,
        metalness: .04,
        envMapIntensity: 1
    });
    m.stainedGlass = new THREE.MeshBasicMaterial({
        map: tex.stained.map,
        transparent: true,
        opacity: 1,
        side: THREE.FrontSide,
        depthWrite: false,
        toneMapped: true,
        color: 16777215
    });
    m.exterior = new THREE.MeshBasicMaterial({
        map: tex.exterior,
        color: 16774361,
        toneMapped: true
    });
    m.windowSill = std({
        color: 13155493,
        roughness: .8,
        envMapIntensity: .3
    });
    m.lampShadeOuter = std({
        color: 10188607,
        metalness: .95,
        roughness: .3,
        envMapIntensity: 1.4,
        side: THREE.DoubleSide
    });
    m.lampShadeInner = std({
        color: 16769704,
        emissive: new THREE.Color(16758624),
        emissiveIntensity: .45,
        roughness: .8,
        side: THREE.BackSide
    });
    m.lampGlow = new THREE.MeshBasicMaterial({
        color: 16767129,
        toneMapped: false
    });
    m.pillow = {};
    const pillowSpecs = {
        kilim: tex.pillows.kilim,
        floral: tex.pillows.floral,
        stripe: tex.pillows.stripe,
        botanical: tex.pillows.botanical,
        wine: tex.pillows.wine,
        paisley: tex.pillows.paisley
    };
    for (const [name, t] of Object.entries(pillowSpecs)) {
        m.pillow[name] = new THREE.MeshPhysicalMaterial({
            map: t.map,
            bumpMap: t.bump,
            bumpScale: .008,
            roughness: .88,
            sheen: .5,
            sheenColor: new THREE.Color(13152916),
            sheenRoughness: .62,
            envMapIntensity: .28,
            color: new THREE.Color(13811880)
        });
    }
    if (has("tulip")) {
        tex.pillows.tulip = {
            map: photoTex(photos.tulip),
            bump: photoBump(photos.tulip)
        };
        m.pillow.tulip = new THREE.MeshPhysicalMaterial({
            map: tex.pillows.tulip.map,
            bumpMap: tex.pillows.tulip.bump,
            bumpScale: .008,
            roughness: .88,
            sheen: .55,
            sheenColor: new THREE.Color(14205856),
            sheenRoughness: .6,
            envMapIntensity: .28,
            color: 15127232
        });
    }
    if (tex.pillows.velvet) {
        m.pillow.velvet = new THREE.MeshPhysicalMaterial({
            map: tex.pillows.velvet.map,
            bumpMap: tex.pillows.velvet.bump,
            bumpScale: .008,
            roughness: .86,
            sheen: .7,
            sheenColor: new THREE.Color(13086349),
            sheenRoughness: .55,
            envMapIntensity: .28
        });
    }
    m.throw = new THREE.MeshPhysicalMaterial({
        map: tex.throw.map,
        bumpMap: tex.throw.bump,
        bumpScale: .008,
        roughness: .9,
        sheen: .4,
        sheenColor: new THREE.Color(13612173),
        sheenRoughness: .65,
        side: THREE.DoubleSide,
        envMapIntensity: .25,
        color: 13153437
    });
    m.dried = [ std({
        color: 9986367,
        roughness: .85
    }), std({
        color: 12092507,
        roughness: .82
    }), std({
        color: 8215102,
        roughness: .9
    }), std({
        color: 10325091,
        roughness: .8
    }) ];
    const flowerStd = (color, emissive, roughness = .72) => new THREE.MeshStandardMaterial({
        color: color,
        roughness: roughness,
        metalness: 0,
        side: THREE.DoubleSide,
        emissive: new THREE.Color(emissive),
        emissiveIntensity: .22,
        envMapIntensity: .25
    });
    m.flowerPink = flowerStd(13867657, 4923673, .7);
    m.flowerPinkLight = flowerStd(15782072, 6043426, .7);
    m.flowerCream = flowerStd(15852745, 6245423, .68);
    m.flowerCreamLight = flowerStd(16445658, 6969147, .66);
    m.flowerRed = flowerStd(11560538, 4199695, .68);
    m.flowerBlush = flowerStd(14988701, 5515808, .7);
    m.flowerPeach = flowerStd(14660748, 5320733, .7);
    m.flowerCenter = std({
        color: 11569998,
        roughness: .92,
        metalness: 0,
        envMapIntensity: .3
    });
    m.flowerCenterDark = std({
        color: 7492399,
        roughness: .95,
        metalness: 0
    });
    m.waxSeal = std({
        color: 8335146,
        roughness: .6
    });
    m.glow = (color = 16766875, opacity = .18) => new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false
    });
    return {
        mats: m,
        tex: tex
    };
}
