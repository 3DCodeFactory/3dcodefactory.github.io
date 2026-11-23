import * as THREE from "three";

import { HALL } from "./world.js";

export class WaterSystem {
    constructor(renderer, scene, camera, textures, options = {}) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.width = options.width || HALL.halfWidth * 2;
        this.length = options.length || HALL.nearZ - HALL.farZ;
        this.centerZ = (HALL.nearZ + HALL.farZ) / 2;
        this.floorY = options.y ?? .026;
        this.NX = options.nx || 160;
        this.NZ = options.nz || 256;
        this.heights = new Float32Array(this.NX * this.NZ);
        this.prev = new Float32Array(this.NX * this.NZ);
        this.next = new Float32Array(this.NX * this.NZ);
        this.rippleCanvas = document.createElement("canvas");
        this.rippleCanvas.width = this.NX;
        this.rippleCanvas.height = this.NZ;
        this.rippleCtx = this.rippleCanvas.getContext("2d");
        this.rippleImage = this.rippleCtx.createImageData(this.NX, this.NZ);
        this.accumulator = 0;
        this.time = 0;
        this.agitation = 0;
        this.valvePressure = 0;
        this._ambientTimer = 2.1;
        this._valveTimer = 0;
        this._frame = 0;
        this._lastCamera = new Float32Array(16);
        this.rippleTexture = new THREE.CanvasTexture(this.rippleCanvas);
        this.rippleTexture.minFilter = THREE.LinearFilter;
        this.rippleTexture.magFilter = THREE.LinearFilter;
        this.rippleTexture.wrapS = THREE.ClampToEdgeWrapping;
        this.rippleTexture.wrapT = THREE.ClampToEdgeWrapping;
        this.rippleTexture.colorSpace = THREE.NoColorSpace;
        this.rippleTexture.generateMipmaps = false;
        this.rippleTexture.needsUpdate = true;
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        const aspect = window.innerWidth / Math.max(1, window.innerHeight);
        const rtHeight = Math.min(384, Math.round(window.innerHeight * dpr * .6));
        const rtWidth = Math.max(420, Math.round(rtHeight * aspect));
        const rtOptions = {
            type: THREE.HalfFloatType,
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            depthBuffer: true,
            stencilBuffer: false
        };
        this.renderTarget = new THREE.WebGLRenderTarget(rtWidth, rtHeight, rtOptions);
        this.renderTarget.texture.colorSpace = THREE.NoColorSpace;
        this.textureMatrix = new THREE.Matrix4;
        this.virtualCamera = new THREE.PerspectiveCamera;
        this.material = new THREE.ShaderMaterial({
            name: "RiverdaleWetStoneWater",
            uniforms: {
                tReflection: {
                    value: this.renderTarget.texture
                },
                tRipple: {
                    value: this.rippleTexture
                },
                tMask: {
                    value: textures.waterMaskTex
                },
                tNoise: {
                    value: textures.noiseTex
                },
                tFloor: {
                    value: textures.floorMap
                },
                tPuddle: {
                    value: textures.puddleTex
                },
                textureMatrix: {
                    value: this.textureMatrix
                },
                uTime: {
                    value: 0
                },
                uAgitation: {
                    value: 0
                },
                uDebugReflection: {
                    value: 0
                },
                uCombinedFloor: {
                    value: 1
                },
                uTexel: {
                    value: new THREE.Vector2(1 / this.NX, 1 / this.NZ)
                },
                uFogColor: {
                    value: new THREE.Color(3026729)
                },
                uFogDensity: {
                    value: .0138
                },
                uWaterColor: {
                    value: new THREE.Color(528653)
                },
                uDeepTint: {
                    value: new THREE.Color(922898)
                }
            },
            vertexShader: `\n        uniform mat4 textureMatrix;\n        varying vec4 vReflectionCoord;\n        varying vec2 vUv;\n        varying vec3 vWorld;\n        varying float vViewDepth;\n\n        void main() {\n          vUv = uv;\n          vec4 world = modelMatrix * vec4(position, 1.0);\n          vWorld = world.xyz;\n          vReflectionCoord = textureMatrix * vec4(position, 1.0);\n          vec4 mv = viewMatrix * world;\n          vViewDepth = -mv.z;\n          gl_Position = projectionMatrix * mv;\n        }\n      `,
            fragmentShader: `\n        uniform sampler2D tReflection;\n        uniform sampler2D tRipple;\n        uniform sampler2D tMask;\n        uniform sampler2D tNoise;\n        uniform sampler2D tFloor;\n        uniform sampler2D tPuddle;\n        uniform float uTime;\n        uniform float uCombinedFloor;\n        uniform float uAgitation;\n        uniform float uDebugReflection;\n        uniform vec2 uTexel;\n        uniform vec3 uFogColor;\n        uniform float uFogDensity;\n        uniform vec3 uWaterColor;\n        uniform vec3 uDeepTint;\n\n        varying vec4 vReflectionCoord;\n        varying vec2 vUv;\n        varying vec3 vWorld;\n        varying float vViewDepth;\n\n        float hash12(vec2 p) {\n          vec3 p3 = fract(vec3(p.xyx) * 0.1031);\n          p3 += dot(p3, p3.yzx + 33.33);\n          return fract((p3.x + p3.y) * p3.z);\n        }\n\n        void main() {\n          // --- large-scale wetness / dry islands -------------------------\n          vec4 pud = texture2D(tPuddle, vUv);\n          float film = smoothstep(0.10, 0.72, pud.r);\n          float puddle = smoothstep(0.28, 0.66, pud.g);\n          float wet = max(film * 0.58, puddle * 0.96);\n          float maskFine = texture2D(tMask, vUv * vec2(8.5, 18.0)).r;\n\n          // --- ripple height field gradient -------------------------------\n          vec2 e = uTexel;\n          float hL = texture2D(tRipple, vUv - vec2(e.x, 0.0)).r;\n          float hR = texture2D(tRipple, vUv + vec2(e.x, 0.0)).r;\n          float hD = texture2D(tRipple, vUv - vec2(0.0, e.y)).r;\n          float hU = texture2D(tRipple, vUv + vec2(0.0, e.y)).r;\n          vec2 grad = vec2(hR - hL, hU - hD);\n          // attenuate at the borders where the field is clamped\n          float edgeFade = smoothstep(0.0, 0.018, vUv.x) * smoothstep(0.0, 0.018, 1.0 - vUv.x)\n                         * smoothstep(0.0, 0.012, vUv.y) * smoothstep(0.0, 0.012, 1.0 - vUv.y);\n          grad *= edgeFade;\n\n          // --- fine animated surface texture ------------------------------\n          vec2 nuv = vWorld.xz * vec2(0.27, 0.20);\n          float n0 = texture2D(tNoise, nuv + vec2(uTime * 0.0021, uTime * 0.0009)).r;\n          float nX = texture2D(tNoise, nuv + vec2(0.022, 0.0) + vec2(uTime * 0.0021, uTime * 0.0009)).r;\n          float nZ = texture2D(tNoise, nuv + vec2(0.0, 0.026) + vec2(uTime * 0.0021, uTime * 0.0009)).r;\n          vec2 fineGrad = vec2(nX - n0, nZ - n0);\n\n          // small live agitation running through the water\n          float microA = 0.0026 + uAgitation * 0.008;\n          vec2 micro = vec2(\n            sin(vWorld.z * 7.3 + uTime * (1.15 + uAgitation * 2.4)) +\n            sin(vWorld.x * 11.7 - uTime * (0.7 + uAgitation * 1.3)),\n            cos(vWorld.x * 9.1 - uTime * (1.35 + uAgitation * 2.1)) +\n            cos(vWorld.z * 13.2 + uTime * (0.53 + uAgitation))\n          ) * microA;\n\n          vec2 surfaceSlope = vec2(\n            grad.x * 2.6 + fineGrad.x * 0.13 + micro.x,\n            grad.y * 2.6 + fineGrad.y * 0.13 + micro.y\n          );\n          vec3 N = normalize(vec3(-surfaceSlope.x, 1.0, -surfaceSlope.y));\n\n          // --- view / Fresnel --------------------------------------------\n          vec3 V = normalize(cameraPosition - vWorld);\n          float cosV = clamp(dot(N, V), 0.0, 1.0);\n          float fresnel = pow(1.0 - cosV, 3.7);\n          float grazing = clamp(fresnel * 1.35, 0.0, 1.0);\n\n          // --- planar reflection ------------------------------------------\n          vec4 rp = vReflectionCoord;\n          vec2 distortion = vec2(\n            N.x * (0.028 + 0.045 * grazing) + N.z * 0.012,\n            N.z * (0.020 + 0.018 * grazing) - N.x * 0.008\n          );\n          distortion *= (0.30 + 0.18 * wet);\n          vec2 ruv = rp.xy / max(0.0001, rp.w);\n          vec2 blur = vec2(0.00016, 0.00050 + 0.0020 * puddle) * (0.45 + (1.0 - grazing) * 0.55 + uAgitation * 0.35);\n\n          vec3 refl = vec3(0.0);\n          vec4 c1 = vec4((ruv + distortion) * rp.w, rp.z, rp.w);\n          vec4 c2 = vec4((ruv + distortion + blur) * rp.w, rp.z, rp.w);\n          vec4 c3 = vec4((ruv + distortion - blur * vec2(1.0, 0.55)) * rp.w, rp.z, rp.w);\n          refl += texture2DProj(tReflection, c1).rgb * 0.66;\n          refl += texture2DProj(tReflection, c2).rgb * 0.17;\n          refl += texture2DProj(tReflection, c3).rgb * 0.17;\n\n          if (uDebugReflection > 0.5) {\n            if (uDebugReflection > 2.5) {\n              gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0);\n              return;\n            }\n            if (uDebugReflection > 1.5) {\n              // diagnostic: puddle film / alpha coverage\n              gl_FragColor = vec4(vec3(wet * 0.6 + puddle * 0.4 + film * 0.25), 1.0);\n              return;\n            }\n            gl_FragColor = vec4(refl * 1.4, 1.0);\n            return;\n          }\n\n          // a cold veil over reflected geometry, then a little contrast so the\n          // reflected windows read as sharp streaks rather than a grey veil\n          refl = mix(refl, refl * vec3(0.88, 0.94, 0.98), 0.08);\n          refl *= 0.74 + 0.14 * wet;\n          refl = pow(max(refl, 0.0), vec3(1.18)) * 1.36;\n\n          // --- specular glints from the window light ----------------------\n          vec3 L = normalize(vec3(-0.28, 0.82, -0.60));\n          vec3 H = normalize(L + V);\n          float spec = pow(max(dot(N, H), 0.0), 340.0);\n          float microSpec = pow(max(0.0, sin(vWorld.x * 31.0 + uTime * 0.7) * cos(vWorld.z * 27.0 - uTime * 0.9) * 0.5 + 0.5), 14.0);\n          vec3 specCol = vec3(0.55, 0.67, 0.75) * spec * (0.65 + uAgitation * 1.3);\n          specCol += vec3(0.34, 0.48, 0.54) * microSpec * (0.025 + uAgitation * 0.09);\n\n          // --- water film colour ------------------------------------------\n          vec3 col = mix(uDeepTint, refl * 1.15, 0.34 + grazing * 0.58);\n          col += specCol;\n          col = mix(col, uWaterColor, 0.065 * (1.0 - grazing));\n\n          // dither tiny alpha modulation keeps the film from looking like glass\n          float dither = hash12(gl_FragCoord.xy + uTime * 0.37) - 0.5;\n          float alpha = film * (0.05 + grazing * 0.05)\n                      + wet * (0.07 + grazing * 0.20)\n                      + puddle * (0.38 + grazing * 0.30);\n          alpha = clamp(alpha + dither * 0.015, 0.0, 0.94);\n\n          // depth fog, matched manually to the hall's atmospheric depth\n          float fog = 1.0 - exp(-pow(uFogDensity * vViewDepth, 2.0));\n          col = mix(col, uFogColor, fog * 0.25);\n\n          if (uCombinedFloor > 0.5) {\n            // Opaque wet-stone pass: the slab, its damp darkening and the\n            // mirror are resolved together, so puddles read as pools in the\n            // flagging rather than a uniform glass sheet.\n            // The floor map was painted for a 2.4 x 4.1 tiling; custom shader\n            // sampling does not inherit Three's texture matrix, so tile here.\n            vec3 texFloor = texture2D(tFloor, vUv * vec2(2.4, 4.1)).rgb;\n            vec3 stone = texFloor * vec3(1.74, 1.64, 1.51);\n            // Keep the flag joints legible through the thin sheets of water.\n            float slab = smoothstep(0.010, 0.075, dot(texFloor, vec3(0.2126, 0.7152, 0.0722)));\n            float var = texture2D(tNoise, vWorld.xz * 0.055).r;\n            stone *= 0.90 + 0.24 * var;\n            float grime = texture2D(tNoise, vWorld.xz * vec2(0.31, 0.23) + vec2(0.17, 0.51)).r;\n            stone *= 0.82 + 0.34 * grime;\n            float edgeAO = mix(0.78, 1.0, smoothstep(7.1, 2.2, abs(vWorld.x)));\n            float depthShade = mix(1.08, 0.90, smoothstep(-19.0, -2.0, vWorld.z));\n            stone *= edgeAO * depthShade;\n            float wetAmt = clamp(wet * 0.24 + puddle * 0.56, 0.0, 1.0);\n            stone += vec3(0.009, 0.010, 0.010) * (1.0 - wetAmt * 0.6);\n            stone *= mix(1.0, 0.70, wetAmt);\n            stone = mix(stone, stone * vec3(0.70, 0.79, 0.77), wetAmt * 0.55);\n            float reflectivity = clamp(puddle * 0.99 + wet * 0.11 + grazing * 0.09, 0.0, 0.98);\n            float reflLuma = dot(refl, vec3(0.2126, 0.7152, 0.0722));\n            vec3 mir = refl * (2.32 + puddle * 0.38) + vec3(0.084, 0.096, 0.102) * smoothstep(0.22, 0.82, reflLuma);\n            reflectivity *= mix(0.72, 1.0, slab);\n            mir *= mix(0.84, 1.0, slab);\n            vec3 colF = mix(stone, mir, reflectivity);\n            colF += specCol * 0.9;\n            colF *= smoothstep(0.0, 0.035, vUv.x) * smoothstep(1.0, 0.965, vUv.x);\n            colF = mix(colF, uFogColor, fog * 0.26);\n            gl_FragColor = vec4(colF, 1.0);\n            return;\n          }\n\n          gl_FragColor = vec4(col, alpha);\n        }\n      `,
            transparent: true,
            depthWrite: false,
            side: THREE.FrontSide,
            toneMapped: false
        });
        this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(this.width, this.length, 1, 1), this.material);
        this.mesh.name = "ShallowWaterSurface";
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.position.set(0, this.floorY, this.centerZ);
        this.mesh.renderOrder = 2;
        this.mesh.receiveShadow = false;
        scene.add(this.mesh);
        this._reflectorPlane = new THREE.Plane;
        this._normal = new THREE.Vector3;
        this._reflectorWorldPosition = new THREE.Vector3;
        this._cameraWorldPosition = new THREE.Vector3;
        this._rotationMatrix = new THREE.Matrix4;
        this._lookAtPosition = new THREE.Vector3(0, 0, -1);
        this._clipPlane = new THREE.Vector4;
        this._view = new THREE.Vector3;
        this._target = new THREE.Vector3;
        this._q = new THREE.Vector4;
        this._up = new THREE.Vector3;
        this._textureMatrix = this.textureMatrix;
        this._reflectionNeeded = true;
        this._lastReflectionTime = 0;
        const scope = this;
        this.mesh.onBeforeRender = function(renderer, scene, camera) {
            scope._renderReflection(renderer, scene, camera);
        };
        this.mesh.userData.waterSystem = this;
        this._prewarm();
    }
    _encode() {
        const data = this.rippleImage.data;
        const h = this.heights;
        for (let i = 0, j = 0; i < h.length; i++, j += 4) {
            const v = Math.max(-.49, Math.min(.49, h[i]));
            const b = (v * .5 + .5) * 255;
            data[j] = b;
            data[j + 1] = b;
            data[j + 2] = b;
            data[j + 3] = 255;
        }
        this.rippleCtx.putImageData(this.rippleImage, 0, 0);
        this.rippleTexture.needsUpdate = true;
    }
    _simulate() {
        const NX = this.NX, NZ = this.NZ;
        const a = this.heights, p = this.prev, n = this.next;
        const damping = .982;
        const c2 = .135;
        for (let y = 1; y < NZ - 1; y++) {
            const row = y * NX;
            for (let x = 1; x < NX - 1; x++) {
                const i = row + x;
                const val = (2 * a[i] - p[i]) * damping + c2 * (a[i - 1] + a[i + 1] + a[i - NX] + a[i + NX] - 4 * a[i]);
                n[i] = Math.max(-.75, Math.min(.75, val));
            }
        }
        for (let x = 0; x < NX; x++) {
            n[x] = 0;
            n[(NZ - 1) * NX + x] = 0;
        }
        for (let y = 0; y < NZ; y++) {
            n[y * NX] = 0;
            n[y * NX + NX - 1] = 0;
        }
        this.prev = a;
        this.heights = n;
        this.next = p;
    }
    _prewarm() {
        this.addRippleWorld(-1.2, -.5, .12, 2.4);
        this.addRippleWorld(1.9, 1.8, .07, 1.8);
        this.addRippleWorld(.2, -8.5, .05, 2);
        for (let i = 0; i < 34; i++) this._simulate();
        this._encode();
    }
    addRippleWorld(x, z, strength = .35, radius = 2.2) {
        const u = (x - -this.width / 2) / this.width;
        const v = .5 - (z - this.centerZ) / this.length;
        if (u < .01 || u > .99 || v < .01 || v > .99) return;
        const gx = Math.round(u * (this.NX - 1));
        const gy = Math.round(v * (this.NZ - 1));
        const rr = Math.max(1.2, radius);
        const rint = Math.ceil(rr * 1.8);
        const a = this.heights;
        for (let dy = -rint; dy <= rint; dy++) {
            const y = gy + dy;
            if (y <= 0 || y >= this.NZ - 1) continue;
            for (let dx = -rint; dx <= rint; dx++) {
                const x2 = gx + dx;
                if (x2 <= 0 || x2 >= this.NX - 1) continue;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d > rint) continue;
                const fall = Math.exp(-(d * d) / (rr * rr));
                a[y * this.NX + x2] += strength * fall;
            }
        }
    }
    setAgitation(value) {
        this.agitation = value;
        this.material.uniforms.uAgitation.value = value;
    }
    setValvePressure(value) {
        this.valvePressure = value;
    }
    update(dt, elapsed) {
        this.time = elapsed;
        this._frame++;
        this.material.uniforms.uTime.value = elapsed;
        this.material.uniforms.uAgitation.value = this.agitation;
        this.accumulator += Math.min(dt, .05);
        const step = 1 / 60;
        let iterations = 0;
        while (this.accumulator >= step && iterations < 3) {
            this._simulate();
            this.accumulator -= step;
            iterations++;
        }
        if (iterations > 0) this._encode();
        this._ambientTimer -= dt;
        if (this._ambientTimer <= 0) {
            this._ambientTimer = 3.2 + Math.random() * 4.8;
            const x = -5.4 + Math.random() * 10.4;
            const z = -14 + Math.random() * 20;
            this.addRippleWorld(x, z, .035 + Math.random() * .055, 1.5 + Math.random() * 1.1);
        }
        if (this.valvePressure > .06) {
            this._valveTimer -= dt;
            if (this._valveTimer <= 0) {
                this._valveTimer = 1.65 - this.valvePressure * 1.05;
                const pulseX = 2.2 + Math.random() * .5;
                this.addRippleWorld(pulseX, -5.15 + Math.random() * 1, .04 + this.valvePressure * .18, 2);
                this.addRippleWorld(-2 + Math.random() * .4, -3.9 + Math.random() * .6, .025 + this.valvePressure * .11, 1.8);
            }
        } else {
            this._valveTimer = .2;
        }
    }
    _renderReflection(renderer, scene, camera) {
        if (this._frame < 0) return;
        const camEls = camera.matrixWorld.elements;
        let cameraMoved = false;
        for (let i = 0; i < 16; i++) {
            if (this._lastCamera[i] !== camEls[i]) {
                cameraMoved = true;
                break;
            }
        }
        if (!cameraMoved && this._lastReflectionFrame !== undefined && this._frame - this._lastReflectionFrame < 5 && !this._reflectionNeeded) return;
        for (let i = 0; i < 16; i++) this._lastCamera[i] = camEls[i];
        this._lastReflectionFrame = this._frame;
        this._reflectionNeeded = false;
        const scope = this;
        const normal = this._normal;
        const reflectorWorldPosition = this._reflectorWorldPosition;
        const cameraWorldPosition = this._cameraWorldPosition;
        const rotationMatrix = this._rotationMatrix;
        const lookAtPosition = this._lookAtPosition;
        const view = this._view;
        const target = this._target;
        reflectorWorldPosition.setFromMatrixPosition(scope.mesh.matrixWorld);
        cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld);
        rotationMatrix.extractRotation(scope.mesh.matrixWorld);
        normal.set(0, 0, 1);
        normal.applyMatrix4(rotationMatrix);
        view.subVectors(reflectorWorldPosition, cameraWorldPosition);
        if (view.dot(normal) > 0) return;
        view.reflect(normal).negate();
        view.add(reflectorWorldPosition);
        rotationMatrix.extractRotation(camera.matrixWorld);
        lookAtPosition.set(0, 0, -1).applyMatrix4(rotationMatrix).add(cameraWorldPosition);
        target.subVectors(reflectorWorldPosition, lookAtPosition);
        target.reflect(normal).negate();
        target.add(reflectorWorldPosition);
        const virtualCamera = this.virtualCamera;
        virtualCamera.position.copy(view);
        virtualCamera.up.set(0, 1, 0).applyMatrix4(rotationMatrix).reflect(normal);
        virtualCamera.lookAt(target);
        virtualCamera.far = camera.far;
        virtualCamera.near = camera.near;
        virtualCamera.aspect = camera.aspect;
        virtualCamera.updateProjectionMatrix();
        virtualCamera.updateMatrixWorld();
        virtualCamera.projectionMatrix.copy(camera.projectionMatrix);
        this.textureMatrix.set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1);
        this.textureMatrix.multiply(virtualCamera.projectionMatrix);
        this.textureMatrix.multiply(virtualCamera.matrixWorldInverse);
        this.textureMatrix.multiply(scope.mesh.matrixWorld);
        this._reflectorPlane.setFromNormalAndCoplanarPoint(normal, reflectorWorldPosition);
        this._reflectorPlane.applyMatrix4(virtualCamera.matrixWorldInverse);
        const clipPlane = this._clipPlane;
        clipPlane.set(this._reflectorPlane.normal.x, this._reflectorPlane.normal.y, this._reflectorPlane.normal.z, this._reflectorPlane.constant);
        const projectionMatrix = virtualCamera.projectionMatrix;
        const q = this._q;
        q.x = (Math.sign(clipPlane.x) + projectionMatrix.elements[8]) / projectionMatrix.elements[0];
        q.y = (Math.sign(clipPlane.y) + projectionMatrix.elements[9]) / projectionMatrix.elements[5];
        q.z = -1;
        q.w = (1 + projectionMatrix.elements[10]) / projectionMatrix.elements[14];
        clipPlane.multiplyScalar(2 / clipPlane.dot(q));
        projectionMatrix.elements[2] = clipPlane.x;
        projectionMatrix.elements[6] = clipPlane.y;
        projectionMatrix.elements[10] = clipPlane.z + 1 - .0035;
        projectionMatrix.elements[14] = clipPlane.w;
        scope.mesh.visible = false;
        const currentRenderTarget = renderer.getRenderTarget();
        const currentXrEnabled = renderer.xr.enabled;
        const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;
        renderer.xr.enabled = false;
        renderer.shadowMap.autoUpdate = false;
        renderer.setRenderTarget(this.renderTarget);
        renderer.state.buffers.depth.setMask(true);
        if (renderer.autoClear === false) renderer.clear();
        renderer.render(scene, virtualCamera);
        renderer.xr.enabled = currentXrEnabled;
        renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;
        renderer.setRenderTarget(currentRenderTarget);
        const viewport = camera.viewport;
        if (viewport !== undefined) renderer.state.viewport(viewport);
        scope.mesh.visible = true;
    }
    resize(width, height) {
        const aspect = width / Math.max(1, height);
        const rtHeight = Math.min(512, Math.round(height * .8));
        const rtWidth = Math.max(420, Math.round(rtHeight * aspect));
        this.renderTarget.setSize(rtWidth, rtHeight);
        this._reflectionNeeded = true;
    }
    dispose() {
        this.mesh.geometry.dispose();
        this.material.dispose();
        this.rippleTexture.dispose();
        this.renderTarget.dispose();
        this.mesh.removeFromParent();
    }
}
