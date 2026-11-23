import * as THREE from "./vendor/three.module.js";

import { mulberry32 } from "./textures.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const lerp = (a, b, t) => a + (b - a) * t;

function hash2(x, y) {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
    return n - Math.floor(n);
}

function smooth(t) {
    return t * t * (3 - 2 * t);
}

function periodicNoise(x, y, period) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = smooth(x - xi), yf = smooth(y - yi);
    const wrap = v => (v % period + period) % period;
    const x0 = wrap(xi), x1 = wrap(xi + 1), y0 = wrap(yi), y1 = wrap(yi + 1);
    const a = hash2(x0, y0), b = hash2(x1, y0), c = hash2(x0, y1), d = hash2(x1, y1);
    return lerp(lerp(a, b, xf), lerp(c, d, xf), yf);
}

function tileFbm(x, y, period = 8, oct = 5) {
    let v = 0, amp = .5, p = period;
    for (let i = 0; i < oct; i++) {
        v += amp * periodicNoise(x * p, y * p, p);
        p *= 2;
        amp *= .5;
    }
    return v;
}

function makeMistNoise() {
    const S = 512;
    const c = document.createElement("canvas");
    c.width = S;
    c.height = S;
    const ctx = c.getContext("2d");
    const img = ctx.createImageData(S, S);
    for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
            const u = x / S, v = y / S;
            const a = tileFbm(u, v, 4, 5);
            const b = tileFbm(u + .37, v + .61, 8, 4);
            const d = tileFbm(u * 1.1 + .2, v * 1.1 + .8, 16, 3);
            const i = (y * S + x) * 4;
            img.data[i] = clamp((a - .16) / .68, 0, 1) * 255;
            img.data[i + 1] = clamp((b - .14) / .7, 0, 1) * 255;
            img.data[i + 2] = clamp(d, 0, 1) * 255;
            img.data[i + 3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.NoColorSpace;
    t.anisotropy = 4;
    return t;
}

function makeCloudTexture() {
    const S = 1024;
    const c = document.createElement("canvas");
    c.width = S;
    c.height = S;
    const ctx = c.getContext("2d");
    const img = ctx.createImageData(S, S);
    const pnoise = (x, y, px, py) => {
        const xi = Math.floor(x), yi = Math.floor(y);
        const xf = smooth(x - xi), yf = smooth(y - yi);
        const wrap = (v, p) => (v % p + p) % p;
        const h = (a, b) => hash2(wrap(a, px), wrap(b, py));
        return lerp(lerp(h(xi, yi), h(xi + 1, yi), xf), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), xf), yf);
    };
    const fbp = (u, v, px, py, oct = 5) => {
        let val = 0, amp = .5;
        for (let i = 0; i < oct; i++) {
            val += amp * pnoise(u * px, v * py, px, py);
            px *= 2;
            py *= 2;
            amp *= .5;
        }
        return val;
    };
    for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
            const u = x / S, v = y / S;
            const wx = fbp(u + .31, v + .17, 3, 3, 3) - .5;
            const wy = fbp(u + .73, v + .61, 3, 3, 3) - .5;
            const uu = u + wx * .16, vv = v + wy * .16;
            const broad = fbp(uu, vv, 3, 3, 6);
            const billow = fbp(uu + .19, vv + .43, 7, 7, 5);
            const detail = fbp(uu + .57, vv + .11, 17, 17, 4);
            const fine = fbp(uu * 2 + .9, vv * 2 + .3, 41, 41, 3);
            const i = (y * S + x) * 4;
            img.data[i] = clamp((broad - .18) / .64, 0, 1) * 255;
            img.data[i + 1] = clamp((billow * .72 + detail * .28 - .16) / .68, 0, 1) * 255;
            img.data[i + 2] = clamp((detail * .58 + fine * .42 - .14) / .72, 0, 1) * 255;
            img.data[i + 3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.NoColorSpace;
    t.anisotropy = 8;
    return t;
}

const skyVert = `\n  varying vec3 vDir;\n  void main() {\n    vec4 world = modelMatrix * vec4(position, 1.0);\n    vDir = world.xyz - cameraPosition;\n    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n  }\n`;

const skyFrag = `\n  uniform vec3 uZenith;\n  uniform vec3 uHorizon;\n  uniform vec3 uHorizonWarm;\n  uniform vec3 uCloudShade;\n  uniform vec3 uCloudLight;\n  uniform vec3 uSunColor;\n  uniform vec3 uSunDir;\n  uniform float uCloudCover;\n  uniform float uSunPower;\n  uniform float uWarmth;\n  uniform float uTime;\n  uniform float uHaze;\n  uniform sampler2D uClouds;\n  varying vec3 vDir;\n\n  float saturate(float x) { return clamp(x, 0.0, 1.0); }\n\n  void main() {\n    vec3 d = normalize(vDir);\n    float y = max(d.y, -0.08);\n    float up = saturate(y);\n    vec3 col = mix(uHorizon, uZenith, pow(up, 0.42));\n    // a warm/cool breath at the horizon\n    float horizonBand = pow(1.0 - up, 9.0);\n    col = mix(col, uHorizonWarm, horizonBand * (0.5 + uWarmth * 0.42));\n\n    // A cloud deck projected onto a plane overhead: the low masses spread\n    // and soften as they recede toward the horizon.\n    vec2 p = d.xz / max(d.y + 0.30, 0.085);\n    vec2 drift = vec2(uTime * 0.0022, uTime * 0.00042);\n    vec2 uvA = p * 0.105 + drift;\n    vec2 uvB = p * 0.27 - drift * 0.8 + vec2(0.37, 0.11);\n    vec2 uvC = p * 0.70 + drift * 0.35 + vec2(0.73, 0.41);\n    float c1 = texture2D(uClouds, uvA).r;\n    float c2 = texture2D(uClouds, uvB).g;\n    float c3 = texture2D(uClouds, uvC).b;\n    float field = c1 * 0.58 + c2 * 0.32 + c3 * 0.10;\n    float dens = smoothstep(0.20, 0.58, field);\n    // let gaps in the deck open onto the sky gradient: the overcast is broken\n    // enough to show cloud structure rather than an even grey wash\n    float cover = (0.16 + 0.84 * dens) * (0.55 + uCloudCover * 0.75);\n    cover = saturate(cover);\n    cover *= smoothstep(-0.02, 0.022, d.y);\n\n    float sunDot = max(dot(d, normalize(uSunDir)), 0.0);\n    // tiny height-field normal, enough to give the overcast a soft relief\n    vec2 e = vec2(0.003);\n    float hx = texture2D(uClouds, uvA + vec2(e.x, 0.0)).r - texture2D(uClouds, uvA - vec2(e.x, 0.0)).r;\n    float hz = texture2D(uClouds, uvA + vec2(0.0, e.y)).r - texture2D(uClouds, uvA - vec2(0.0, e.y)).r;\n    vec3 cn = normalize(vec3(-hx * 7.0, 1.25, -hz * 7.0));\n    vec3 ldir = normalize(vec3(uSunDir.x * 0.55, 0.9, uSunDir.z * 0.55));\n    float relief = dot(cn, ldir) * 0.5 + 0.5;\n    // tone comes mostly from the structure of the deck; the tiny normal only\n    // adds a soft directional breath on top\n    float lum = saturate(0.05 + smoothstep(0.22, 0.74, c2) * 0.44\n                         + smoothstep(0.26, 0.78, c3) * 0.17\n                         + relief * 0.16 + (0.5 - c1) * 0.28);\n    lum = saturate((lum - 0.47) * 1.55 + 0.47);\n    vec3 cloudCol = mix(uCloudShade, uCloudLight, smoothstep(0.06, 0.8, lum));\n    cloudCol *= 0.9 + 0.1 * smoothstep(0.2, 0.82, c1);\n    float rim = smoothstep(0.46, 0.8, c3) * (1.0 - cover * 0.5);\n    cloudCol += uSunColor * (rim * 0.12 * (0.4 + sunDot) * uSunPower\n                           + pow(sunDot, 5.0) * 0.18 * uSunPower);\n    cloudCol = mix(cloudCol, uHorizonWarm, (1.0 - smoothstep(0.0, 0.05, d.y)) * (0.16 + uWarmth * 0.1));\n    col = mix(col, cloudCol, cover * 0.96);\n\n    // soft solar veil, hidden behind overcast at dawn but glowing late\n    float glow = pow(sunDot, 7.0) * 0.22 + pow(sunDot, 70.0) * 0.5 + pow(sunDot, 1500.0);\n    col += uSunColor * glow * uSunPower;\n    // an additional low, wide horizon bloom\n    vec3 sunFlat = normalize(vec3(uSunDir.x, 0.0, uSunDir.z));\n    float az = max(dot(normalize(vec3(d.x, 0.0, d.z)), sunFlat), 0.0);\n    col += uSunColor * pow(az, 3.5) * pow(1.0 - up, 5.0) * 0.13 * uSunPower;\n\n    // a broad, slow variation in the overcast keeps the sky from reading\n    // as a flat gradient\n    float broad = texture2D(uClouds, p * 0.065 + vec2(0.17, 0.63)).r;\n    col *= 0.93 + 0.14 * smoothstep(0.18, 0.82, broad);\n    // cool atmospheric veil over the whole dome\n    col = mix(col, uHorizonWarm, uHaze * 0.16 * (1.0 - up * 0.55));\n    if (d.y < 0.0) col = mix(col, uHorizon * 0.63, saturate(-d.y * 7.0));\n    gl_FragColor = vec4(col, 1.0);\n  }\n`;

const mistVert = `\n  varying vec2 vUv;\n  varying vec3 vWorld;\n  void main() {\n    vUv = uv;\n    vec4 world = modelMatrix * vec4(position, 1.0);\n    vWorld = world.xyz;\n    gl_Position = projectionMatrix * viewMatrix * world;\n  }\n`;

const mistFrag = `\n  uniform sampler2D uNoise;\n  uniform vec3 uMistLow;\n  uniform vec3 uMistHigh;\n  uniform vec3 uSunColor;\n  uniform vec3 uSunDir;\n  uniform float uOpacity;\n  uniform float uThreshold;\n  uniform float uScale;\n  uniform float uSpeed;\n  uniform float uTime;\n  uniform float uVertical;\n  uniform float uSeed;\n  uniform float uHorizonLight;\n  varying vec2 vUv;\n  varying vec3 vWorld;\n\n  void main() {\n    vec2 p = vUv * uScale;\n    float t = uTime * uSpeed;\n    vec2 drift = vec2(t * 0.014, t * 0.0032);\n    float n1 = texture2D(uNoise, p * 0.62 + vec2(uSeed, uSeed * 0.7) + drift).r;\n    float n2 = texture2D(uNoise, p * 1.35 - vec2(uSeed * 0.4, uSeed) - drift * 1.6).g;\n    float n3 = texture2D(uNoise, p * 2.7 + vec2(uSeed * 2.1, -uSeed) + drift * 0.45).b;\n    float field = n1 * 0.56 + n2 * 0.31 + n3 * 0.13;\n    float density = smoothstep(uThreshold, uThreshold + 0.24, field);\n    density = pow(density, 0.9);\n\n    // feathered, roughly oval bank so no rectangular edge ever reads\n    vec2 q = vUv - vec2(0.5, 0.5);\n    float radial = length(q * vec2(1.0, 1.25));\n    float mask = 1.0 - smoothstep(0.30, 0.62, radial);\n    mask *= smoothstep(0.0, 0.18, vUv.x) * (1.0 - smoothstep(0.82, 1.0, vUv.x));\n    mask *= smoothstep(0.0, 0.16, vUv.y) * (1.0 - smoothstep(0.68, 1.0, vUv.y));\n    if (uVertical > 0.5) {\n      // the heart of a bank hangs low, its crown frays into the hill\n      density *= mix(1.0, 0.55, smoothstep(0.25, 0.85, vUv.y));\n    }\n    density *= mask * uOpacity;\n\n    // a whisper of warm light when the sun is behind the bank\n    float sunDot = max(dot(normalize(vWorld - cameraPosition), normalize(uSunDir)), 0.0);\n    float hemi = clamp(vUv.y * 0.5 + 0.35 + (n2 - 0.5) * 0.4, 0.0, 1.0);\n    vec3 c = mix(uMistLow, uMistHigh, hemi);\n    c += uSunColor * sunDot * sunDot * uHorizonLight;\n    // thin edges catch a little more light than the dense heart\n    c += vec3(0.02) * (1.0 - density) * dot(uMistHigh, vec3(0.333));\n    gl_FragColor = vec4(c, density);\n  }\n`;

function shaftTexture() {
    const W = 256, H = 512;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const x = c.getContext("2d");
    x.clearRect(0, 0, W, H);
    const rnd = mulberry32(551);
    for (let i = 0; i < 8; i++) {
        const cx = W * (.14 + rnd() * .72);
        const spread = 8 + rnd() * 36;
        const top = -20 + rnd() * 90;
        const bottom = H * (.72 + rnd() * .3);
        const grad = x.createLinearGradient(cx - spread, 0, cx + spread, 0);
        grad.addColorStop(0, "rgba(255,236,198,0)");
        grad.addColorStop(.3, `rgba(255,238,204,${.08 + rnd() * .11})`);
        grad.addColorStop(.5, `rgba(255,243,216,${.16 + rnd() * .18})`);
        grad.addColorStop(.7, `rgba(255,230,188,${.07 + rnd() * .09})`);
        grad.addColorStop(1, "rgba(255,230,188,0)");
        x.fillStyle = grad;
        x.beginPath();
        x.moveTo(cx - spread * .25, top);
        x.lineTo(cx + spread * .35, top);
        x.lineTo(cx + spread * .9, bottom);
        x.lineTo(cx - spread * .8, bottom);
        x.closePath();
        x.fill();
    }
    for (let i = 0; i < 36; i++) {
        const cx = rnd() * W;
        const alpha = .01 + rnd() * .05;
        x.strokeStyle = `rgba(255,245,220,${alpha})`;
        x.lineWidth = .4 + rnd() * 2.4;
        x.beginPath();
        x.moveTo(cx, H * .02);
        x.lineTo(cx + (rnd() - .5) * 90, H * .95);
        x.stroke();
    }
    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
}

function makeEnvironment(renderer) {
    const W = 768, H = 384;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const x = c.getContext("2d");
    const sky = x.createLinearGradient(0, 0, 0, H * .52);
    sky.addColorStop(0, "#92a4af");
    sky.addColorStop(.55, "#c0c9ca");
    sky.addColorStop(1, "#e4e2d8");
    x.fillStyle = sky;
    x.fillRect(0, 0, W, H * .52);
    const ground = x.createLinearGradient(0, H * .52, 0, H);
    ground.addColorStop(0, "#6d7254");
    ground.addColorStop(1, "#323827");
    x.fillStyle = ground;
    x.fillRect(0, H * .52, W, H * .48);
    const rnd = mulberry32(777);
    for (let i = 0; i < 80; i++) {
        const cx = rnd() * W, cy = rnd() * H * .48;
        const rx = 20 + rnd() * 120, ry = 3 + rnd() * 20;
        const g = x.createRadialGradient(cx, cy, 0, cx, cy, rx);
        g.addColorStop(0, `rgba(255,252,240,${.025 + rnd() * .07})`);
        g.addColorStop(1, "rgba(255,252,240,0)");
        x.fillStyle = g;
        x.save();
        x.translate(cx, cy);
        x.scale(1, ry / rx);
        x.translate(-cx, -cy);
        x.beginPath();
        x.arc(cx, cy, rx, 0, Math.PI * 2);
        x.fill();
        x.restore();
    }
    const sunG = x.createRadialGradient(W * .72, H * .38, 2, W * .72, H * .38, W * .22);
    sunG.addColorStop(0, "rgba(255,246,215,0.32)");
    sunG.addColorStop(.3, "rgba(255,239,195,0.1)");
    sunG.addColorStop(1, "rgba(255,239,195,0)");
    x.fillStyle = sunG;
    x.fillRect(0, 0, W, H * .52);
    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const rt = pmrem.fromEquirectangular(tex);
    tex.dispose();
    pmrem.dispose();
    return rt.texture;
}

const P = {
    morning: {
        zenith: new THREE.Color(8821669),
        horizon: new THREE.Color(14804190),
        horizonWarm: new THREE.Color(15722196),
        cloudShade: new THREE.Color(7307408),
        cloudLight: new THREE.Color(16513780),
        sunTint: new THREE.Color(16118243),
        sunDir: new THREE.Vector3(-.54, .38, .58).normalize(),
        cloudCover: .6,
        sunPower: .52,
        haze: .3,
        fog: new THREE.Color(13226185),
        fogDensity: .0024,
        mistLow: new THREE.Color(10135972),
        mistHigh: new THREE.Color(15526880),
        hemiSky: new THREE.Color(14673895),
        hemiGround: new THREE.Color(5657921),
        hemiIntensity: .6,
        sunColor: new THREE.Color(16249571),
        sunIntensity: 2.95,
        fillColor: new THREE.Color(10993094),
        fillIntensity: .14,
        exposure: .91,
        envIntensity: .55,
        gradeTint: new THREE.Color(1.004, 1.002, .994),
        saturation: 1.035,
        contrast: 1.06,
        vignette: .28
    },
    evening: {
        zenith: new THREE.Color(5862284),
        horizon: new THREE.Color(16171396),
        horizonWarm: new THREE.Color(16765851),
        cloudShade: new THREE.Color(8877179),
        cloudLight: new THREE.Color(16766886),
        sunTint: new THREE.Color(16761218),
        sunDir: new THREE.Vector3(-.62, .26, .56).normalize(),
        cloudCover: .32,
        sunPower: 1.7,
        haze: .23,
        fog: new THREE.Color(13612179),
        fogDensity: .0024,
        mistLow: new THREE.Color(11044975),
        mistHigh: new THREE.Color(16240801),
        hemiSky: new THREE.Color(15849398),
        hemiGround: new THREE.Color(4866355),
        hemiIntensity: .58,
        sunColor: new THREE.Color(16761994),
        sunIntensity: 3.2,
        fillColor: new THREE.Color(10334399),
        fillIntensity: .2,
        exposure: .98,
        envIntensity: .52,
        gradeTint: new THREE.Color(1.045, 1, .935),
        saturation: 1.07,
        contrast: 1.045,
        vignette: .32
    }
};

function lerpPalette(a, b, t) {
    const out = {};
    for (const k in a) {
        const av = a[k], bv = b[k];
        if (av instanceof THREE.Color) out[k] = av.clone().lerp(bv, t); else if (av instanceof THREE.Vector3) out[k] = av.clone().lerp(bv, t).normalize(); else out[k] = lerp(av, bv, t);
    }
    return out;
}

export function createAtmosphere(scene, renderer) {
    const cloudTex = makeCloudTexture();
    const mistNoise = makeMistNoise();
    const sunDir = P.morning.sunDir.clone();
    const skyUniforms = {
        uZenith: {
            value: P.morning.zenith.clone()
        },
        uHorizon: {
            value: P.morning.horizon.clone()
        },
        uHorizonWarm: {
            value: P.morning.horizonWarm.clone()
        },
        uCloudShade: {
            value: P.morning.cloudShade.clone()
        },
        uCloudLight: {
            value: P.morning.cloudLight.clone()
        },
        uSunColor: {
            value: P.morning.sunTint.clone()
        },
        uSunDir: {
            value: sunDir
        },
        uCloudCover: {
            value: P.morning.cloudCover
        },
        uSunPower: {
            value: P.morning.sunPower
        },
        uWarmth: {
            value: 0
        },
        uTime: {
            value: 0
        },
        uHaze: {
            value: P.morning.haze
        },
        uClouds: {
            value: cloudTex
        }
    };
    const skyMat = new THREE.ShaderMaterial({
        uniforms: skyUniforms,
        vertexShader: skyVert,
        fragmentShader: skyFrag,
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
        fog: false
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(760, 48, 26), skyMat);
    sky.renderOrder = -100;
    sky.frustumCulled = false;
    scene.add(sky);
    scene.fog = new THREE.FogExp2(P.morning.fog.clone(), P.morning.fogDensity);
    scene.environment = makeEnvironment(renderer);
    scene.environmentIntensity = P.morning.envIntensity;
    const hemi = new THREE.HemisphereLight(P.morning.hemiSky, P.morning.hemiGround, P.morning.hemiIntensity);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(P.morning.sunColor, P.morning.sunIntensity);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    sun.shadow.camera.near = 1.5;
    sun.shadow.camera.far = 360;
    sun.shadow.camera.left = -92;
    sun.shadow.camera.right = 92;
    sun.shadow.camera.top = 80;
    sun.shadow.camera.bottom = -52;
    sun.shadow.bias = -25e-5;
    sun.shadow.normalBias = .035;
    sun.shadow.radius = 3;
    const sunTarget = new THREE.Object3D;
    sunTarget.position.set(0, 4.4, -2);
    scene.add(sunTarget);
    sun.target = sunTarget;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(P.morning.fillColor, P.morning.fillIntensity);
    fill.position.set(50, 60, 110);
    fill.target = sunTarget;
    scene.add(fill);
    const mistGroup = new THREE.Group;
    mistGroup.name = "Valley mist";
    scene.add(mistGroup);
    function makeMistMaterial({color: color = 1, threshold: threshold = .36, scale: scale = 2.2, speed: speed = .016, vertical: vertical = 0, seed: seed = .2, light: light = .12}) {
        return new THREE.ShaderMaterial({
            uniforms: {
                uNoise: {
                    value: mistNoise
                },
                uMistLow: {
                    value: P.morning.mistLow.clone()
                },
                uMistHigh: {
                    value: P.morning.mistHigh.clone()
                },
                uSunColor: {
                    value: P.morning.sunTint.clone()
                },
                uSunDir: {
                    value: sunDir
                },
                uOpacity: {
                    value: 0
                },
                uThreshold: {
                    value: threshold
                },
                uScale: {
                    value: scale
                },
                uSpeed: {
                    value: speed
                },
                uTime: {
                    value: 0
                },
                uVertical: {
                    value: vertical
                },
                uSeed: {
                    value: seed
                },
                uHorizonLight: {
                    value: light
                }
            },
            vertexShader: mistVert,
            fragmentShader: mistFrag,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            fog: false
        });
    }
    const mists = [];
    const mistSpecs = [];
    mistSpecs.push({
        x: -7,
        y: 6.8,
        z: -36,
        w: 205,
        h: 14,
        threshold: .43,
        scale: 2.2,
        opacity: .6,
        seed: .21,
        speed: .01,
        light: .26
    }, {
        x: -58,
        y: 10.5,
        z: -74,
        w: 265,
        h: 20,
        threshold: .4,
        scale: 1.8,
        opacity: .54,
        seed: .47,
        speed: .008,
        light: .2
    }, {
        x: 62,
        y: 9.2,
        z: -92,
        w: 275,
        h: 19,
        threshold: .4,
        scale: 1.9,
        opacity: .48,
        seed: .71,
        speed: .007,
        light: .18
    }, {
        x: 5,
        y: 13.5,
        z: -132,
        w: 390,
        h: 27,
        threshold: .37,
        scale: 1.5,
        opacity: .46,
        seed: .33,
        speed: .006,
        light: .14
    }, {
        x: 0,
        y: 18.5,
        z: -215,
        w: 530,
        h: 35,
        threshold: .35,
        scale: 1.25,
        opacity: .4,
        seed: .88,
        speed: .005,
        light: .1
    }, {
        x: -44,
        y: 3.2,
        z: -23,
        w: 95,
        h: 9,
        threshold: .48,
        scale: 3,
        opacity: .4,
        seed: .14,
        speed: .012,
        light: .3
    }, {
        x: 46,
        y: 4,
        z: -28,
        w: 115,
        h: 10,
        threshold: .47,
        scale: 2.8,
        opacity: .34,
        seed: .63,
        speed: .011,
        light: .3
    });
    for (const spec of mistSpecs) {
        const mat = makeMistMaterial({
            threshold: spec.threshold,
            scale: spec.scale,
            speed: spec.speed,
            seed: spec.seed,
            vertical: 1,
            light: spec.light
        });
        mat.uniforms.uOpacity.value = 0;
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(spec.w, spec.h), mat);
        mesh.position.set(spec.x, spec.y, spec.z);
        mesh.renderOrder = 6;
        mesh.frustumCulled = false;
        mistGroup.add(mesh);
        mists.push({
            mesh: mesh,
            spec: spec,
            mat: mat,
            baseOpacity: spec.opacity
        });
    }
    const beamTex = shaftTexture();
    const shafts = [];
    const shaftPlacements = [ [ -27, 17, 26, 13, 34, -.23 ], [ -13, 16, 17, 8, 30, -.14 ], [ 3, 18, 11, 10, 34, .07 ], [ -35, 22, 42, 18, 44, -.3 ], [ 23, 14, 18, 8, 26, .16 ], [ -2, 21, -2, 8, 32, -.04 ] ];
    for (const [x, y, z, w, h, tilt] of shaftPlacements) {
        const mat = new THREE.MeshBasicMaterial({
            map: beamTex,
            color: P.morning.sunTint,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
            toneMapped: false
        });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
        mesh.scale.set(w, h, 1);
        mesh.position.set(x, y, z);
        mesh.renderOrder = 7;
        mesh.frustumCulled = false;
        scene.add(mesh);
        shafts.push({
            mesh: mesh,
            mat: mat,
            tilt: tilt,
            phase: Math.random() * Math.PI * 2
        });
    }
    const state = {
        mood: 0,
        mist: .4,
        palette: lerpPalette(P.morning, P.evening, 0),
        time: 0
    };
    function update(mood, mist, elapsed, camera) {
        state.mood = clamp(mood, 0, 1);
        state.mist = clamp(mist, 0, 1);
        state.time = elapsed;
        const t = state.mood;
        const p = lerpPalette(P.morning, P.evening, t);
        state.palette = p;
        skyUniforms.uZenith.value.copy(p.zenith);
        skyUniforms.uHorizon.value.copy(p.horizon);
        skyUniforms.uHorizonWarm.value.copy(p.horizonWarm);
        skyUniforms.uCloudShade.value.copy(p.cloudShade);
        skyUniforms.uCloudLight.value.copy(p.cloudLight);
        skyUniforms.uSunColor.value.copy(p.sunTint);
        skyUniforms.uSunDir.value.copy(p.sunDir);
        skyUniforms.uCloudCover.value = p.cloudCover;
        skyUniforms.uSunPower.value = p.sunPower;
        skyUniforms.uWarmth.value = t * t * (3 - 2 * t);
        skyUniforms.uHaze.value = p.haze;
        skyUniforms.uTime.value = elapsed;
        sky.position.copy(camera.position);
        sunDir.copy(p.sunDir);
        hemi.color.copy(p.hemiSky);
        hemi.groundColor.copy(p.hemiGround);
        hemi.intensity = p.hemiIntensity;
        sun.color.copy(p.sunColor);
        sun.intensity = p.sunIntensity;
        sun.position.copy(sunTarget.position).addScaledVector(p.sunDir, 135);
        fill.color.copy(p.fillColor);
        fill.intensity = p.fillIntensity;
        fill.position.set(55 + Math.sin(t * 2.1) * 10, 58, 105);
        scene.environmentIntensity = p.envIntensity;
        scene.fog.color.copy(p.fog);
        scene.fog.density = p.fogDensity * (.46 + mist * 2.1);
        if (renderer) renderer.toneMappingExposure = p.exposure;
        for (const layer of mists) {
            const {spec: spec, mat: mat} = layer;
            const gather = smoothstep(.02, .95, mist);
            const opacity = layer.baseOpacity * (.12 + .88 * gather);
            mat.uniforms.uOpacity.value = opacity;
            mat.uniforms.uThreshold.value = lerp(spec.threshold + .075, spec.threshold - .07, gather);
            mat.uniforms.uMistLow.value.copy(p.mistLow);
            mat.uniforms.uMistHigh.value.copy(p.mistHigh);
            mat.uniforms.uSunColor.value.copy(p.sunTint);
            mat.uniforms.uSunDir.value.copy(p.sunDir);
            mat.uniforms.uTime.value = elapsed;
            if (camera) {
                layer.mesh.rotation.y = Math.atan2(camera.position.x - spec.x, camera.position.z - spec.z);
            }
            layer.mesh.position.y = spec.y + gather * .8;
        }
        const shaftStrength = .014 + t * t * .16 + mist * .02;
        for (let i = 0; i < shafts.length; i++) {
            const s = shafts[i];
            s.mat.opacity = shaftStrength * (.78 + Math.sin(elapsed * .09 + s.phase) * .22);
            s.mat.color.copy(p.sunTint);
            if (camera) {
                s.mesh.quaternion.copy(camera.quaternion);
                s.mesh.rotateZ(s.tilt);
            }
            s.mat.map.offset.x = Math.sin(elapsed * .006 + s.phase) * .015;
            s.mat.map.offset.y = Math.sin(elapsed * .004 + s.phase * 1.7) * .01;
        }
    }
    function smoothstep(a, b, x) {
        const t = clamp((x - a) / (b - a), 0, 1);
        return t * t * (3 - 2 * t);
    }
    return {
        update: update,
        sun: sun,
        hemi: hemi,
        fill: fill,
        sky: sky,
        mists: mists,
        shafts: shafts,
        palettes: P,
        state: state,
        getPalette: () => lerpPalette(P.morning, P.evening, state.mood)
    };
}
