(() => {
    const codeSection = document.querySelector("#code");
    const oldTarget = codeSection?.querySelector(".code-grid, .s2s-workbench");
    if (!codeSection || !oldTarget) return;
    const sectionTitle = codeSection.querySelector(".section-heading h2");
    const sectionIntro = codeSection.querySelector(".section-heading .section-intro");
    if (sectionTitle) {
        sectionTitle.textContent = "拉开渲染画面，看代码如何搭起三维世界";
    }
    if (sectionIntro) {
        sectionIntro.textContent = "建筑开间、屋顶坡度、程序化纹理与环境光影全部在代码中显式定义。左侧可直接浏览完整源码，右侧拖动分界线即可对比无材质几何白模与最终渲染画面。";
    }
    const existingStyle = document.getElementById("s2s-workbench-styles");
    if (existingStyle) existingStyle.remove();
    const st = document.createElement("style");
    st.id = "s2s-workbench-styles";
    st.textContent = `\n    #code .s2s-workbench {\n      display: flex;\n      flex-direction: column;\n      gap: 12px;\n    }\n\n    #code .s2s-topbar {\n      display: flex;\n      align-items: center;\n      justify-content: space-between;\n      gap: 12px;\n    }\n\n    #code .s2s-raw-link {\n      font: 500 12.5px/1.2 system-ui, -apple-system, 'PingFang SC', sans-serif;\n      color: #2f5e4e;\n      text-decoration: none;\n    }\n    #code .s2s-raw-link:hover {\n      text-decoration: underline;\n    }\n\n    #code .s2s-frame {\n      display: grid;\n      grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);\n      grid-template-rows: 460px;\n      border: 1px solid #d5ddd8;\n      border-radius: 10px;\n      background: #ffffff;\n      overflow: hidden;\n      height: 460px;\n    }\n\n    #code .s2s-code-wrap {\n      position: relative;\n      height: 460px;\n      min-height: 0;\n      min-width: 0;\n      border-right: 1px solid #dce3df;\n      background: #ffffff;\n      overflow: hidden;\n    }\n    #code #source-code {\n      position: relative;\n      height: 460px !important;\n      max-height: 460px !important;\n      margin: 0;\n      padding: 14px 0 !important;\n      overflow-y: auto;\n      overflow-x: hidden;\n      background: #ffffff;\n      color: #2d3732;\n      font: 11.5px/1.76 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;\n      counter-reset: none !important;\n    }\n    #code #source-code .code-line {\n      display: flex;\n      align-items: baseline;\n      padding: 0 14px 0 8px;\n      min-height: 1.76em;\n    }\n    #code #source-code .code-line::before {\n      content: attr(data-ln) !important;\n      flex: 0 0 3.2em;\n      width: 3.2em;\n      margin-right: 12px;\n      text-align: right;\n      color: #9ba8a1;\n      font-variant-numeric: tabular-nums;\n      user-select: none;\n    }\n\n    #code .s2s-viewport {\n      position: relative;\n      width: 100%;\n      height: 460px;\n      min-height: 0;\n      background: #18221f;\n      overflow: hidden;\n      user-select: none;\n      cursor: ew-resize;\n    }\n    #code .s2s-layer-img {\n      position: absolute;\n      inset: 0;\n      width: 100% !important;\n      height: 100% !important;\n      object-fit: cover;\n      display: block;\n      pointer-events: none;\n    }\n    #code .s2s-img-clay {\n      clip-path: inset(0 calc(100% - var(--curtain, 46%)) 0 0);\n      will-change: clip-path;\n      z-index: 2;\n    }\n\n    /* Minimalist Curtain Line & Slim Grip Pill */\n    #code .s2s-curtain-line {\n      position: absolute;\n      top: 0;\n      bottom: 0;\n      left: var(--curtain, 46%);\n      width: 1.5px;\n      background: rgba(255, 255, 255, 0.88);\n      box-shadow: 0 0 6px rgba(0, 0, 0, 0.28);\n      z-index: 4;\n      pointer-events: none;\n      transform: translateX(-0.75px);\n    }\n    #code .s2s-curtain-grip {\n      position: absolute;\n      top: 50%;\n      left: 50%;\n      transform: translate(-50%, -50%);\n      width: 5px;\n      height: 32px;\n      border-radius: 999px;\n      background: rgba(255, 255, 255, 0.94);\n      box-shadow: 0 1px 5px rgba(0, 0, 0, 0.32);\n    }\n\n    @media (max-width: 960px) {\n      #code .s2s-frame {\n        grid-template-columns: 1fr;\n        grid-template-rows: 320px 340px;\n        height: auto;\n      }\n      #code .s2s-code-wrap,\n      #code #source-code {\n        height: 320px !important;\n        max-height: 320px !important;\n        border-right: 0;\n        border-bottom: 1px solid #dce3df;\n      }\n      #code .s2s-viewport {\n        height: 340px;\n      }\n    }\n  `;
    document.head.appendChild(st);
    const SCENES = {
        chateau: {
            key: "chateau",
            title: "林谷法式城堡",
            codeUrl: "demos/chateau/chateau.js",
            renderImg: "assets/02-render.webp",
            clayImg: "assets/02-clay.webp"
        },
        hall: {
            key: "hall",
            title: "巴洛克镜厅",
            codeUrl: "demos/hall/build_scene.py",
            renderImg: "assets/dataset-cases/16-hero.webp",
            clayImg: "assets/16-clay.webp"
        }
    };
    let currentSceneKey = "chateau";
    let curtainPercent = 46;
    let fileCache = {};
    let loadSeq = 0;
    const wb = document.createElement("div");
    wb.className = "s2s-workbench";
    wb.innerHTML = `\n    <div class="s2s-topbar">\n      <div class="s2s-scenes" role="tablist" aria-label="切换场景"></div>\n      <a class="s2s-raw-link" id="s2s-raw-link" href="demos/chateau/chateau.js" target="_blank" rel="noopener">打开完整源码 ↗</a>\n    </div>\n\n    <div class="s2s-frame">\n      <div class="s2s-code-wrap">\n        <div class="s2s-editor-bar"><span class="s2s-traffic-lights" aria-hidden="true"><i></i><i></i><i></i></span><span class="s2s-file-name" data-no-i18n>chateau.js</span></div>\n        <pre id="source-code" tabindex="0" aria-label="场景源码">正在加载源码…</pre>\n      </div>\n\n      <div class="s2s-viewport" id="s2s-viewport" style="--curtain: 46%">\n        <img class="s2s-layer-img" id="s2s-img-main" src="assets/02-render.webp" alt="场景渲染产物" width="1600" height="1067">\n        <img class="s2s-layer-img s2s-img-clay" id="s2s-img-clay" src="assets/02-clay.webp" alt="场景几何白模" width="1600" height="1067">\n\n        <span class="s2s-view-label s2s-label-clay">几何白模</span><span class="s2s-view-label s2s-label-render">最终渲染</span><div class="s2s-curtain-line" id="s2s-curtain-line">\n          <div class="s2s-curtain-grip"></div>\n        </div>\n      </div>\n    </div>\n  `;
    oldTarget.replaceWith(wb);
    const scenesEl = wb.querySelector(".s2s-scenes");
    const sourcePreEl = wb.querySelector("#source-code");
    const rawLinkEl = wb.querySelector("#s2s-raw-link");
    const viewportEl = wb.querySelector("#s2s-viewport");
    const imgMainEl = wb.querySelector("#s2s-img-main");
    const imgClayEl = wb.querySelector("#s2s-img-clay");
    const escapeHTML = s => s.replace(/[&<>]/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;"
    }[c]));
    function highlightLine(lineText) {
        return lineText.split(/(\/\/.*$|#.*$|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b(?:const|let|function|return|new|if|elif|else|for|of|in|import|from|class|export|def|with|as|True|False|None)\b|\b\d+(?:\.\d+)?\b)/g).map(tok => {
            if (!tok) return "";
            let cls = "";
            if (tok.startsWith("//") || tok.startsWith("#")) cls = "comment"; else if (/^['"]/.test(tok)) cls = "str"; else if (/^(const|let|function|return|new|if|elif|else|for|of|in|import|from|class|export|def|with|as|True|False|None)$/.test(tok)) cls = "key"; else if (/^\d/.test(tok)) cls = "number";
            return cls ? `<span class="tok-${cls}">${escapeHTML(tok)}</span>` : escapeHTML(tok);
        }).join("");
    }
    let activePointer = null;
    let revealFrame = 0, revealReady = false, revealVisible = false, revealed = false;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    function stopReveal() {
        cancelAnimationFrame(revealFrame);
        wb.classList.remove("is-introducing");
    }
    function setCurtain(value) {
        value = Math.max(0, Math.min(100, value));
        curtainPercent = value;
        viewportEl.setAttribute("aria-valuenow", String(Math.round(value)));
        viewportEl.style.setProperty("--curtain", `${value}%`);
        wb.querySelector(".s2s-label-clay").style.opacity = value < 12 ? "0" : "1";
        wb.querySelector(".s2s-label-render").style.opacity = value > 88 ? "0" : "1";
    }
    function reveal() {
        if (!revealReady || !revealVisible || revealed || reducedMotion.matches) return;
        revealed = true;
        wb.classList.add("is-introducing");
        const start = performance.now();
        const ease = t => (1 - Math.cos(Math.PI * t)) / 2;
        function frame(now) {
            const t = Math.min(1, (now - start) / 4000);
            setCurtain(t < .7 ? 82 - 74 * ease(t / .7) : 8 + 38 * ease((t - .7) / .3));
            if (t < 1) revealFrame = requestAnimationFrame(frame);
            else stopReveal();
        }
        revealFrame = requestAnimationFrame(frame);
    }
    new IntersectionObserver(([entry]) => {
        revealVisible = entry.isIntersecting;
        if (revealVisible) reveal(); else stopReveal();
    }, { threshold: .35 }).observe(viewportEl);
    reducedMotion.addEventListener("change", stopReveal);
    sourcePreEl.addEventListener("pointerdown", stopReveal);
    sourcePreEl.addEventListener("wheel", stopReveal, { passive: true });
    viewportEl.setAttribute("role", "slider");
    viewportEl.setAttribute("tabindex", "0");
    viewportEl.setAttribute("aria-label", "Clay and render comparison");
    viewportEl.setAttribute("aria-valuemin", "0");
    viewportEl.setAttribute("aria-valuemax", "100");
    viewportEl.setAttribute("aria-valuenow", String(curtainPercent));
    viewportEl.setAttribute("aria-orientation", "horizontal");
    function updateCurtainFromX(clientX) {
        const rect = viewportEl.getBoundingClientRect();
        if (rect.width) setCurtain((clientX - rect.left) / rect.width * 100);
    }
    function takeControl() {
        stopReveal();
        revealed = true;
    }
    viewportEl.addEventListener("pointerdown", e => {
        if (!e.isPrimary || e.button !== 0) return;
        takeControl();
        activePointer = e.pointerId;
        viewportEl.setPointerCapture(e.pointerId);
        viewportEl.focus({ preventScroll: true });
        updateCurtainFromX(e.clientX);
    });
    viewportEl.addEventListener("pointermove", e => {
        if (e.pointerId === activePointer) updateCurtainFromX(e.clientX);
    });
    function releasePointer(e) {
        if (e.pointerId !== activePointer) return;
        activePointer = null;
        if (viewportEl.hasPointerCapture(e.pointerId)) viewportEl.releasePointerCapture(e.pointerId);
    }
    viewportEl.addEventListener("pointerup", releasePointer);
    viewportEl.addEventListener("pointercancel", releasePointer);
    viewportEl.addEventListener("lostpointercapture", releasePointer);
    viewportEl.addEventListener("keydown", e => {
        const values = { ArrowLeft: curtainPercent - 2, ArrowRight: curtainPercent + 2, Home: 0, End: 100 };
        if (!(e.key in values)) return;
        e.preventDefault();
        takeControl();
        setCurtain(values[e.key]);
    });
    function renderTabs() {
        scenesEl.innerHTML = Object.values(SCENES).map(s => `\n      <button type="button" role="tab" class="s2s-scene-btn${s.key === currentSceneKey ? " active" : ""}" data-scene-key="${s.key}">${s.title}</button>\n    `).join("");
        scenesEl.querySelectorAll("[data-scene-key]").forEach(btn => {
            btn.addEventListener("click", () => {
                if (btn.dataset.sceneKey !== currentSceneKey) selectScene(btn.dataset.sceneKey);
            });
        });
    }
    async function selectScene(sceneKey) {
        const sceneMeta = SCENES[sceneKey];
        if (!sceneMeta) return;
        stopReveal();
        revealReady = false;
        revealed = false;
        currentSceneKey = sceneKey;
        renderTabs();
        imgMainEl.src = sceneMeta.renderImg;
        imgClayEl.src = sceneMeta.clayImg;
        rawLinkEl.href = sceneMeta.codeUrl;
        wb.querySelector(".s2s-file-name").textContent = sceneMeta.codeUrl.split("/").pop();
        const seq = ++loadSeq;
        try {
            let text = fileCache[sceneMeta.codeUrl];
            if (!text) {
                const res = await fetch(sceneMeta.codeUrl);
                if (!res.ok) throw new Error("HTTP " + res.status);
                text = await res.text();
                fileCache[sceneMeta.codeUrl] = text;
            }
            if (seq !== loadSeq) return;
            const lines = text.split("\n");
            sourcePreEl.innerHTML = lines.map((raw, i) => `<span class="code-line" data-ln="${i + 1}"><span class="code-text">${highlightLine(raw)}</span></span>`).join("");
            sourcePreEl.scrollTop = 0;
            await Promise.all([imgMainEl.decode(), imgClayEl.decode()]).catch(() => {});
            if (seq !== loadSeq) return;
            revealReady = true;
            reveal();
        } catch (_) {
            sourcePreEl.textContent = "源码加载失败，请刷新重试。";
        }
    }
    selectScene("chateau");
})();
