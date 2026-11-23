(() => {
    const get = () => window.__app || window.__getApp?.() || window.__TEMPLE__ || window.__scene || window.__bay || window.__AFTER_HOURS__ || window.__sceneApp || window.atelier || window.__WOOD__ || window.__SCENE__ || window.__AGENCE__;
    let attempts = 0;
    const timer = setInterval(() => {
        const raw = get(), app = raw?.bay || raw, c = app?.controls;
        if (!c || !app.camera) {
            if (++attempts > 1200) clearInterval(timer);
            return;
        }
        const distance = app.camera.position.distanceTo(c.target);
        if (!Number.isFinite(distance) || distance <= 0) return;
        const az = c.getAzimuthalAngle(), pol = c.getPolarAngle();
        c.enablePan = false;
        c.autoRotate = false;
        c.rotateSpeed = Math.min(c.rotateSpeed, .35);
        c.zoomSpeed = Math.min(c.zoomSpeed, .45);
        c.minAzimuthAngle = az - .12;
        c.maxAzimuthAngle = az + .12;
        c.minPolarAngle = Math.max(.05, pol - .07);
        c.maxPolarAngle = Math.min(Math.PI - .05, pol + .07);
        c.minDistance = distance * .94;
        c.maxDistance = distance * 1.08;
        c.update();
        window.__showcaseCameraLimits = {
            azimuth: [ c.minAzimuthAngle, c.maxAzimuthAngle ],
            polar: [ c.minPolarAngle, c.maxPolarAngle ],
            distance: [ c.minDistance, c.maxDistance ]
        };
        clearInterval(timer);
    }, 250);
})();
