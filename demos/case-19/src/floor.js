import * as THREE from "three";

import { Reflector } from "three/addons/objects/Reflector.js";

const floorShader = {
    name: "HeliosFloorShader",
    uniforms: {
        color: {
            value: null
        },
        tDiffuse: {
            value: null
        },
        textureMatrix: {
            value: null
        },
        tTile: {
            value: null
        },
        uTileScale: {
            value: new THREE.Vector2(.833333, .833333)
        },
        uTexel: {
            value: new THREE.Vector2(1 / 1024, 1 / 683)
        },
        uTime: {
            value: 0
        },
        uReflStrength: {
            value: .9
        },
        uDockPos: {
            value: new THREE.Vector2(-2.02, 1.45)
        },
        uDockReady: {
            value: 0
        },
        uDockPulse: {
            value: 0
        },
        uWarnMood: {
            value: 0
        },
        uWarnWave: {
            value: -30
        },
        uWarnActive: {
            value: 0
        },
        uDockColor: {
            value: new THREE.Color(7401958)
        },
        uWarnColor: {
            value: new THREE.Color(16730671)
        },
        uFogColor: {
            value: new THREE.Color(329997)
        },
        uFogDensity: {
            value: .0105
        },
        uFloorTint: {
            value: new THREE.Color(13027786)
        },
        uLampLineZ: {
            value: new THREE.Vector4(2.1, -2.85, -7.7, -12.55)
        },
        uLampTint: {
            value: new THREE.Color(8365245)
        }
    },
    vertexShader: `\n    #include <common>\n    #include <logdepthbuf_pars_vertex>\n    uniform mat4 textureMatrix;\n    varying vec4 vReflectUv;\n    varying vec3 vWorld;\n    varying vec3 vView;\n\n    void main() {\n      vec4 world = modelMatrix * vec4(position, 1.0);\n      vWorld = world.xyz;\n      vReflectUv = textureMatrix * vec4(position, 1.0);\n      vView = cameraPosition - world.xyz;\n      gl_Position = projectionMatrix * viewMatrix * world;\n      #include <logdepthbuf_vertex>\n    }\n  `,
    fragmentShader: `\n    #include <common>\n    #include <logdepthbuf_pars_fragment>\n\n    uniform vec3 color;\n    uniform sampler2D tDiffuse;\n    uniform sampler2D tTile;\n    uniform vec2 uTileScale;\n    uniform vec2 uTexel;\n    uniform float uTime;\n    uniform float uReflStrength;\n    uniform vec2 uDockPos;\n    uniform float uDockReady;\n    uniform float uDockPulse;\n    uniform float uWarnMood;\n    uniform float uWarnWave;\n    uniform float uWarnActive;\n    uniform vec3 uDockColor;\n    uniform vec3 uWarnColor;\n    uniform vec3 uFogColor;\n    uniform float uFogDensity;\n    uniform vec3 uFloorTint;\n    uniform vec4 uLampLineZ;\n    uniform vec3 uLampTint;\n\n    varying vec4 vReflectUv;\n    varying vec3 vWorld;\n    varying vec3 vView;\n\n    float hash21(vec2 p) {\n      p = fract(p * vec2(123.34, 456.21));\n      p += dot(p, p + 45.32);\n      return fract(p.x * p.y);\n    }\n\n    float vnoise(vec2 p) {\n      vec2 i = floor(p);\n      vec2 f = fract(p);\n      uvec2 u = uvec2(i);\n      f = f * f * (3.0 - 2.0 * f);\n      float a = hash21(vec2(i.x, i.y));\n      float b = hash21(vec2(i.x + 1.0, i.y));\n      float c = hash21(vec2(i.x, i.y + 1.0));\n      float d = hash21(vec2(i.x + 1.0, i.y + 1.0));\n      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);\n    }\n\n    void main() {\n      #include <logdepthbuf_fragment>\n\n      vec3 viewDir = normalize(vView);\n      float viewDist = length(vView);\n      vec2 tileUv = vWorld.xz * uTileScale;\n      vec3 tileCol = texture2D(tTile, tileUv).rgb;\n\n      // Macro-scale tonal drift removes any obvious repeat from the tile atlas.\n      float macro = vnoise(vWorld.xz * 0.083 + vec2(3.1, -1.7));\n      float macro2 = vnoise(vWorld.xz * 0.31 + vec2(-8.2, 4.4));\n      float tileLuma = dot(tileCol, vec3(0.2126, 0.7152, 0.0722));\n\n      // Recessed perforations are less mirror-like than the metal landings.\n      float metalMask = smoothstep(0.047, 0.16, tileLuma);\n\n      // Mirror-space sample with a directional, anisotropic smear.\n      vec2 reflUv = vReflectUv.xy / max(vReflectUv.w, 0.0001);\n      vec2 wobble = vec2(\n        vnoise(tileUv * 3.7 + uTime * 0.007),\n        vnoise(tileUv * 5.3 - uTime * 0.005)\n      ) - 0.5;\n      wobble *= mix(0.0015, 0.0032, uDockReady * 0.5 + uWarnMood * 0.4);\n      reflUv += wobble + (macro2 - 0.5) * 0.00045;\n\n      vec2 texel = uTexel;\n      // Anisotropic vertical smear: crosswise tubes become long, soft\n      // vertical streaks in the floor, exactly the way a brushed composite\n      // access tile bends a specular reflection.\n      vec3 refl = texture2D(tDiffuse, reflUv).rgb * 0.185;\n      refl += texture2D(tDiffuse, reflUv + vec2(0.2, 1.6) * texel).rgb * 0.135;\n      refl += texture2D(tDiffuse, reflUv - vec2(0.2, 1.6) * texel).rgb * 0.135;\n      refl += texture2D(tDiffuse, reflUv + vec2(-0.35, 4.0) * texel).rgb * 0.11;\n      refl += texture2D(tDiffuse, reflUv - vec2(-0.35, 4.0) * texel).rgb * 0.11;\n      refl += texture2D(tDiffuse, reflUv + vec2(0.1, 7.7) * texel).rgb * 0.085;\n      refl += texture2D(tDiffuse, reflUv - vec2(0.1, 7.7) * texel).rgb * 0.075;\n      refl += texture2D(tDiffuse, reflUv + vec2(-0.15, 12.5) * texel).rgb * 0.045;\n      refl += texture2D(tDiffuse, reflUv - vec2(-0.15, 12.5) * texel).rgb * 0.04;\n\n      // Cold, slightly blue-silver handling of the reflected image.\n      vec3 reflCold = refl * vec3(0.89, 0.97, 1.08);\n      vec3 reflWarm = refl * vec3(1.55, 0.64, 0.36);\n      vec3 reflCol = mix(reflCold, reflWarm, clamp(uWarnMood * 0.78, 0.0, 1.0));\n\n      // Fresnel with a low-roughness metal read.\n      float cosTheta = clamp(viewDir.y, 0.0, 1.0);\n      float fresnel = pow(1.0 - cosTheta, 3.0);\n      fresnel = mix(0.13, 1.0, fresnel);\n\n      vec3 base = tileCol * uFloorTint;\n      base *= 0.78 + macro * 0.28;\n      base *= 0.9 + macro2 * 0.18;\n      base += vec3(0.012, 0.017, 0.024) * (1.0 - metalMask);\n\n      // Fine vertical brushed grain, strongest on the perforated plates.\n      float grain = vnoise(vec2(vWorld.x * 170.0, vWorld.z * 2.6));\n      base *= 0.92 + grain * 0.13;\n      float speck = step(0.9992, hash21(floor(vWorld.xz * 900.0)));\n      base += speck * vec3(0.035, 0.045, 0.05);\n\n      // Access tile / vent-land geometry and the physical perforation field.\n      vec2 tileCell = fract(vWorld.xz / 0.6);\n      vec2 panelUv = fract(tileCell * 2.0);\n      float panelInner = step(0.055, panelUv.x) * step(0.055, panelUv.y) *\n                         step(panelUv.x, 0.945) * step(panelUv.y, 0.945);\n      vec2 holeCell = vWorld.xz / 0.026;\n      vec2 holeLocal = fract(holeCell) - 0.5;\n      float holeD = length(holeLocal);\n      float holeAA = clamp(fwidth(holeD), 0.004, 0.055);\n      float holeShape = 1.0 - smoothstep(0.215 - holeAA, 0.215 + holeAA, holeD);\n      float holeFootprint = max(fwidth(holeCell.x), fwidth(holeCell.y));\n      float holeLod = 1.0 - smoothstep(0.4, 0.78, holeFootprint);\n      float perforation = holeShape * panelInner * holeLod;\n      float holeRim = smoothstep(0.215, 0.26, holeD) * (1.0 - smoothstep(0.28, 0.34, holeD));\n      base *= 1.0 - perforation * 0.86;\n      base += vec3(0.026, 0.031, 0.034) * holeRim * panelInner * holeLod * (0.35 + fresnel);\n      // Holes are drill-throughs; their walls interrupt the mirror.\n      metalMask *= 1.0 - perforation * 0.92;\n\n      float reflectivity = uReflStrength * fresnel * mix(0.40, 1.0, metalMask);\n      reflectivity *= (0.68 + macro * 0.35) * (1.0 - perforation * 0.5);\n\n      // Left and right edges settle into occlusion beneath the rows.\n      float occlL = smoothstep(-2.28, -3.45, vWorld.x);\n      float occlR = smoothstep(1.13, 1.9, vWorld.x);\n      float occl = clamp(occlL + occlR, 0.0, 1.0);\n      reflectivity *= 1.0 - occl * 0.54;\n      base *= 1.0 - occl * 0.38;\n\n      vec3 col = mix(base * 1.42, reflCol * 0.90 + base * 0.16, clamp(reflectivity, 0.0, 0.90));\n\n      // Keep the drilled pattern legible even where a bright lamp reflection\n      // passes over it: holes remain dark and their front lip catches light.\n      col *= 1.0 - perforation * 0.20;\n      col += vec3(0.026, 0.032, 0.036) * holeRim * panelInner * holeLod * (0.24 + 0.5 * fresnel);\n\n      // Panel seams are reinforced in world space so they survive the\n      // reflection mix and read clearly in the near field.\n      float seamX = smoothstep(0.456, 0.494, abs(tileCell.x - 0.5));\n      float seamZ = smoothstep(0.456, 0.494, abs(tileCell.y - 0.5));\n      float seam = max(seamX, seamZ);\n      float lip = smoothstep(0.433, 0.456, max(abs(tileCell.x - 0.5), abs(tileCell.y - 0.5))) *\n                  (1.0 - smoothstep(0.456, 0.476, max(abs(tileCell.x - 0.5), abs(tileCell.y - 0.5))));\n      col *= 1.0 - seam * 0.34;\n      col += vec3(0.026, 0.034, 0.041) * lip * (0.42 + 0.58 * fresnel);\n\n      // The four vent lands within every 600 mm tile sit a few millimetres\n      // proud of their frames. A little procedural bevel catches the lamps.\n      float groove = smoothstep(0.030, 0.070, min(panelUv.x, panelUv.y)) *\n                     smoothstep(0.030, 0.070, min(1.0 - panelUv.x, 1.0 - panelUv.y));\n      col *= 0.91 + groove * 0.16;\n      float plateRim = smoothstep(0.030, 0.020, abs(panelUv.x - 0.5)) +\n                       smoothstep(0.030, 0.020, abs(panelUv.y - 0.5));\n      col += vec3(0.012, 0.016, 0.019) * plateRim * 0.16;\n      // A tight highlight running down the aisle reads as the polished tile edge.\n      float centreRun = exp(-pow((vWorld.x - 0.18) / 0.62, 2.0));\n      col += vec3(0.026, 0.038, 0.049) * centreRun * (0.55 + macro * 0.55) * fresnel;\n\n      // Long reflected luminaire smears. These reinforce the physically\n      // reflected ceiling tubes with the elongated streak the reference floor\n      // carries toward the camera.\n      float lampLane = exp(-pow((vWorld.x - 0.22) / 0.15, 2.0));\n      float lampLaneWide = exp(-pow((vWorld.x - 0.42) / 0.34, 2.0)) * 0.48;\n      float lampStreak = 0.0;\n      lampStreak += exp(-abs(vWorld.z - uLampLineZ.x) * 0.30);\n      lampStreak += exp(-abs(vWorld.z - uLampLineZ.y) * 0.30);\n      lampStreak += exp(-abs(vWorld.z - uLampLineZ.z) * 0.30);\n      lampStreak += exp(-abs(vWorld.z - uLampLineZ.w) * 0.30);\n      col += uLampTint * (lampLane + lampLaneWide) * lampStreak * (0.19 + 0.22 * fresnel);\n      col += vec3(0.06, 0.078, 0.092) * (lampLane * 1.25 + lampLaneWide) * fresnel * 0.8;\n\n      // In lieu of a light-map, a soft cool wash from the ceiling tubes.\n      float coolWash = exp(-pow((vWorld.x - 0.25) * 0.48, 2.0));\n      col += vec3(0.026, 0.040, 0.052) * coolWash;\n      float farPool = smoothstep(7.0, -21.0, vWorld.z);\n      col += vec3(0.018, 0.028, 0.036) * farPool * (0.55 + macro * 0.45);\n\n      // --- Interaction light pool beneath the hero charging dock ----------\n      vec2 dockDelta = (vWorld.xz - uDockPos) * vec2(1.0, 0.42);\n      float dockPool = exp(-dot(dockDelta, dockDelta) * 3.6);\n      float dockEdge = exp(-dot(dockDelta * vec2(1.1, 0.55), dockDelta * vec2(1.1, 0.55)) * 10.0);\n      col += uDockColor * uDockReady * (dockPool * 0.12 + dockEdge * 0.04);\n      reflCol += uDockColor * uDockReady * dockPool * 0.09;\n\n      float pulse = uDockPulse;\n      if (pulse > 0.001 && pulse < 0.999) {\n        vec2 pr = (vWorld.xz - uDockPos) * vec2(1.0, 0.63);\n        float radius = pulse * 2.35;\n        float ring = abs(length(pr) - radius);\n        float ringMask = exp(-ring * ring * 30.0) * (1.0 - pulse);\n        col += uDockColor * ringMask * 0.20;\n      }\n\n      // --- Warning signal travels along the aisle as a red band --------------\n      float warnBand = exp(-pow((vWorld.z - uWarnWave) / 1.05, 2.0));\n      warnBand *= uWarnActive;\n      col += uWarnColor * warnBand * 0.16;\n      col += uWarnColor * uWarnMood * 0.020 * (0.4 + macro);\n      float beaconPool = exp(-pow((vWorld.x - 1.9) / 2.7, 2.0) - pow((vWorld.z + 19.3) / 2.0, 2.0));\n      col += uWarnColor * beaconPool * (0.06 + uWarnMood * 0.14);\n\n      // A quiet, permanent ember line from the far beacon on the polished\n      // tiles. This is the red streak the reference floor carries down the\n      // right side of the aisle even when the bay is idle.\n      float beaconLine = exp(-pow((vWorld.x - 0.74) / 0.075, 2.0)) *\n                         exp(-pow((vWorld.z + 10.62) / 3.6, 2.0)) *\n                         smoothstep(2.2, -8.5, vWorld.z);\n      float beaconWash = exp(-pow((vWorld.x - 0.74) / 0.52, 2.0)) *\n                         exp(-pow((vWorld.z + 10.9) / 5.2, 2.0));\n      col += uWarnColor * beaconLine * (0.075 + uWarnMood * 0.16) * (0.35 + fresnel);\n      col += uWarnColor * beaconWash * (0.008 + uWarnMood * 0.03);\n\n      // A faint high-frequency sheen keeps the floor alive at grazing angles.\n      col += vec3(0.014, 0.022, 0.031) * pow(vnoise(vec2(vWorld.z * 0.7, vWorld.x * 0.9) + uTime * 0.01), 5.0) * fresnel;\n\n      float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * viewDist * viewDist);\n      col = mix(col, uFogColor, clamp(fogFactor, 0.0, 0.84));\n\n      gl_FragColor = vec4(col, 1.0);\n      #include <tonemapping_fragment>\n      #include <colorspace_fragment>\n    }\n  `
};

export function createIndustrialFloor(renderer, tileTexture, opts = {}) {
    const width = opts.width || 7.4;
    const length = opts.length || 35;
    const reflectionWidth = opts.reflectionWidth || Math.min(1280, Math.round(window.innerWidth * .72));
    const reflectionHeight = Math.round(reflectionWidth * (window.innerHeight / window.innerWidth));
    const floor = new Reflector(new THREE.PlaneGeometry(width, length), {
        clipBias: .0015,
        textureWidth: reflectionWidth,
        textureHeight: reflectionHeight,
        color: 16777215,
        multisample: 0,
        shader: floorShader
    });
    floor.name = "Reflective anti-static floor";
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(opts.x ?? .22, opts.y ?? 0, opts.z ?? -7.8);
    floor.receiveShadow = false;
    const mat = floor.material;
    const uniforms = mat.uniforms;
    uniforms.tTile.value = tileTexture;
    uniforms.uTexel.value.set(1 / reflectionWidth, 1 / reflectionHeight);
    if (opts.dockPos) uniforms.uDockPos.value.copy(opts.dockPos);
    uniforms.uFogColor.value.set(opts.fogColor ?? 329997);
    uniforms.uFogDensity.value = opts.fogDensity ?? .0135;
    mat.transparent = false;
    mat.depthWrite = true;
    mat.extensions = mat.extensions || {};
    mat.extensions.derivatives = true;
    floor.userData.setResolution = (w, h) => {
        uniforms.uTexel.value.set(1 / w, 1 / h);
    };
    floor.userData.uniforms = uniforms;
    floor.userData.setDockReady = v => {
        uniforms.uDockReady.value = v;
    };
    floor.userData.setDockPulse = v => {
        uniforms.uDockPulse.value = v;
    };
    floor.userData.setWarning = (mood, active, waveZ) => {
        uniforms.uWarnMood.value = mood;
        uniforms.uWarnActive.value = active;
        uniforms.uWarnWave.value = waveZ;
    };
    floor.userData.tick = t => {
        uniforms.uTime.value = t;
    };
    floor.userData.setLampLine = zs => {
        if (zs && zs.length >= 4) uniforms.uLampLineZ.value.set(zs[0], zs[1], zs[2], zs[3]);
    };
    floor.frustumCulled = false;
    return floor;
}
