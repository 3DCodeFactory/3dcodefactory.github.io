const gallery = document.querySelector("#gallery"), viewer = document.querySelector("#viewer");

let selected = 0;

const cats = {
    Architecture: "建筑与街景",
    Interiors: "室内空间",
    Nature: "自然场景"
};

function renderGallery(filter = "All") {
    gallery.querySelectorAll("video").forEach(v => SiteMedia.unregister(v));
    gallery.replaceChildren();
    scenes.forEach((s, i) => {
        if (s.backend === "Three.js") return;
        if (filter !== "All" && (filter === "Live" ? !s.demo : filter === "Blender" ? s.backend !== "Blender" : s.category !== filter)) return;
        const card = document.createElement("article");
        card.className = "demo-card";
        gallery.classList.toggle("is-filtered", filter !== "All");
        card.setAttribute("aria-label", s.name);
        const media = document.createElement("div");
        media.className = "demo-media";
        if (s.video) {
            const v = document.createElement("video");
            v.dataset.src = s.video;
            v.dataset.poster = `assets/${s.id}-render.webp`;
            v.muted = true;
            v.defaultMuted = true;
            v.loop = false;
            v.playsInline = true;
            v.controls = false;
            v.preload = "none";
            v.setAttribute("aria-label", s.name + "高清单向运镜视频");
            v.addEventListener("ended", () => {
                v.dataset.finished = "1";
            });
            v.addEventListener("error", () => {
                const message = document.createElement("p");
                message.className = "video-error";
                message.textContent = "视频暂时无法加载，请刷新或查看静态图。";
                media.append(message);
            }, {
                once: true
            });
            media.append(v);
            const open = document.createElement("button");
            open.className = "demo-open";
            open.setAttribute("aria-label", "查看" + s.name + "模型与视频");
            open.onclick = () => openScene(i);
            media.append(open);
            SiteMedia.register(v);
        } else {
            const b = document.createElement("button");
            b.className = "demo-launch";
            b.setAttribute("aria-label", "打开" + s.name + "实时场景");
            b.innerHTML = `<img src="${SiteMedia.thumbnail("assets/" + s.id + "-render.webp")}" alt="${s.name}" loading="lazy">`;
            b.onclick = () => openScene(i, true);
            media.append(b);
        }
        const meta = document.createElement("div");
        meta.className = "demo-meta scene-caption";
        meta.innerHTML = `<div><span class="demo-category">${s.backend} · ${cats[s.category]}</span><h3>${s.name}</h3></div>`;
        card.append(media, meta);
        gallery.append(card);
    });
}

function setView(kind) {
    const s = scenes[selected];
    if (kind === "model" && !s.model) return;
    if (kind === "live" && !s.demo) return;
    if (kind === "video" && !s.video) return;
    const stage = document.querySelector("#viewer-stage");
    stage.querySelectorAll("video").forEach(v => v.pause());
    stage.replaceChildren();
    document.querySelectorAll("[data-view]").forEach(b => {
        const on = b.dataset.view === kind;
        b.classList.toggle("active", on);
        b.setAttribute("aria-pressed", on);
    });
    if (kind === "model") {
        const frame = document.createElement("iframe");
        frame.src = `demos/model-viewer/index.html?case=${s.model}&v=20261115-wire-first`;
        frame.title = s.name + "三维模型";
        frame.allow = "fullscreen";
        stage.append(frame);
    } else if (kind === "live") {
        const frame = document.createElement("iframe");
        frame.src = `demos/${s.demo}/index.html?v=1`;
        frame.title = `${s.name}实时三维场景`;
        frame.allow = "fullscreen";
        stage.append(frame);
    } else if (kind === "video") {
        const v = document.createElement("video");
        v.src = s.video;
        v.poster = `assets/${s.id}-render.webp`;
        v.controls = true;
        v.loop = false;
        v.muted = true;
        v.playsInline = true;
        v.preload = "metadata";
        v.setAttribute("aria-label", s.name + "场景单向运镜视频");
        stage.append(v);
        v.play().catch(() => {});
        v.addEventListener("error", () => {
            document.querySelector("#view-note").textContent = "视频暂时无法加载，请尝试刷新页面或切换渲染图。";
        });
    } else {
        const im = document.createElement("img");
        im.src = `assets/${s.id}-${kind}.webp`;
        im.alt = `${s.name}：${kind === "reference" ? "输入视觉参考" : kind === "clay" ? "无材质几何视图" : "场景渲染图"}`;
        stage.append(im);
    }
    document.querySelector("#view-note").textContent = {
        model: "实时模型预览 · 原工程几何与网页材质",
        render: "场景渲染",
        reference: "输入参考图",
        clay: "几何白模",
        live: "实时 WebGL · 拖拽旋转 · 滚轮缩放",
        video: "Blender 场景视频 · 支持重播与全屏"
    }[kind];
}

function openScene(i, live = false) {
    document.querySelectorAll("main video").forEach(v => v.pause());
    selected = i;
    const s = scenes[i];
    const download = document.querySelector("#viewer-download");
    download.hidden = !s.video || s.backend === "Three.js";
    if (s.video) download.href = s.video;
    document.querySelector("#viewer-title").textContent = s.name;
    document.querySelector("#viewer-type").textContent = `${s.backend} · ${cats[s.category]}`;
    const sum = document.querySelector("#task-summary");
    if (sum) sum.textContent = s.summary || "";
    document.querySelector("#task-original").textContent = s.prompt;
    document.querySelector("#model-tab").hidden = !s.model;
    document.querySelector("#live-tab").hidden = !s.demo;
    document.querySelector("#video-tab").hidden = !s.video;
    const link = document.querySelector("#source-link");
    link.hidden = !s.demo;
    if (s.demo) link.href = `demos/${s.demo}/index.html`;
    viewer.querySelectorAll("details").forEach(d => d.open = false);
    setView(live && s.demo ? "live" : s.model ? "model" : s.video ? "video" : "render");
    viewer.showModal();
    viewer.querySelector(".viewer-sidebar").scrollTop = 0;
    document.body.style.overflow = "hidden";
}

viewer.addEventListener("close", () => {
    document.querySelector("#viewer-stage").querySelectorAll("video").forEach(v => v.pause());
    document.querySelector("#viewer-stage").replaceChildren();
    document.body.style.overflow = "";
});

document.querySelector("#close-viewer").onclick = () => viewer.close();

viewer.addEventListener("click", e => {
    if (e.target === viewer) {
        const r = viewer.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) viewer.close();
    }
});

document.querySelectorAll("[data-view]").forEach(b => b.onclick = () => setView(b.dataset.view));

document.querySelectorAll("[data-filter]").forEach(b => b.onclick = () => {
    document.querySelectorAll("[data-filter]").forEach(x => {
        x.classList.toggle("active", x === b);
        x.setAttribute("aria-pressed", x === b);
    });
    renderGallery(b.dataset.filter);
});

document.querySelectorAll("[data-open]").forEach(b => b.onclick = () => openScene(Number(b.dataset.open), true));

renderGallery();

const codePanel = document.querySelector("#source-code");

const escapeHTML = s => s.replace(/[&<>]/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;"
}[c]));

function highlight(text) {
    return text.split("\n").map(line => '<span class="code-line"><span class="code-text">' + line.split(/(\/\/.*$|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b(?:const|let|function|return|new|if|else|import|from|class|export)\b|\b\d+(?:\.\d+)?\b)/g).map(x => {
        let k = x.startsWith("//") ? "comment" : /^['"]/.test(x) ? "str" : /^(const|let|function|return|new|if|else|import|from|class|export)$/.test(x) ? "key" : /^\d/.test(x) ? "number" : "";
        return k ? '<span class="tok-' + k + '">' + escapeHTML(x) + "</span>" : escapeHTML(x);
    }).join("") + "</span></span>").join("");
}

let sourceRequest = 0;

async function loadCode() {
    if (!document.querySelector("#code-select")) return;
    const request = ++sourceRequest, key = document.querySelector("#code-select").value;
    const file = key === "chateau" ? "chateau.js" : "src/world.js";
    try {
        const r = await fetch(`demos/${key}/${file}`);
        if (!r.ok) throw Error();
        const text = await r.text();
        if (request !== sourceRequest || !document.querySelector("#code-select")) return;
        codePanel.replaceChildren();
        const lines = text.split("\n");
        for (let offset = 0; offset < lines.length; offset += 80) {
            if (request !== sourceRequest || !document.querySelector("#code-select")) return;
            codePanel.insertAdjacentHTML("beforeend", highlight(lines.slice(offset, offset + 80).join("\n")));
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        document.querySelector("#source-count").textContent = text.split("\n").length + " 行";
        document.querySelector("#code .text-link").href = `demos/${key}/${file}`;
        const scene = scenes.find(s => s.demo === key);
        const img = document.querySelector("#code figure img");
        img.src = SiteMedia.thumbnail(`assets/${scene.id}-render.webp`);
        img.alt = scene.name;
        document.querySelector("#code figcaption").textContent = scene.name + " · Three.js";
    } catch (e) {
        if (document.querySelector("#code-select")) codePanel.textContent = "源码加载失败，请稍后重试。";
    }
}

document.querySelector("#code-select").onchange = loadCode;

document.querySelector("#code-live").onclick = () => openScene(scenes.findIndex(s => s.demo === document.querySelector("#code-select").value), true);

const codeObserver = new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting)) {
        codeObserver.disconnect();
        loadCode();
    }
}, {
    rootMargin: "300px"
});

codeObserver.observe(document.querySelector("#code"));

const hero = document.querySelector("#hero-video");

hero.addEventListener("play", () => document.querySelectorAll("main video").forEach(video => {
    if (video !== hero) video.pause();
}));

hero.addEventListener("ended", () => {
    hero.pause();
});

document.querySelectorAll("[data-comparison]").forEach(b => b.onclick = () => {
    const key = b.dataset.comparison, src = `assets/comparison-${key}.webp?v=1`;
    document.querySelector("#comparison-link").href = src;
    const capLink = document.querySelector("#comparison-caption-link");
    if (capLink) capLink.href = src;
    const capText = document.querySelector("#comparison-caption-text");
    if (capText) capText.textContent = b.textContent.trim() + "定性对比 · 对照输入参考图、开源基座与微调模型渲染结果。";
    document.querySelector("#comparison-image").src = src;
    document.querySelector("#comparison-image").alt = b.textContent.trim() + "定性对比";
    document.querySelectorAll("[data-comparison]").forEach(x => {
        x.classList.toggle("active", x === b);
        x.setAttribute("aria-pressed", x === b);
    });
});

document.querySelector("#replay-demos").onclick = () => SiteMedia.replay(gallery.querySelectorAll("video"));

const datasetGrid = gallery, datasetViewer = document.querySelector("#dataset-viewer");

function stopDatasetVideo() {
    datasetViewer.querySelectorAll("iframe").forEach(f => f.remove());
    const v = datasetViewer.querySelector("video");
    if (v) {
        v.pause();
        v.removeAttribute("src");
        v.load();
        v.remove();
    }
}

let selectedDataset = 0;

function showDatasetCase(index) {
    selectedDataset = index;
    document.querySelectorAll("main video").forEach(v => v.pause());
    const c = datasetCases[index];
    const download = document.querySelector("#dataset-viewer-download"), live = document.querySelector("#dataset-live-link");
    download.hidden = !c.video || !!c.demo;
    if (c.video) download.href = c.video;
    live.hidden = !c.demo;
    if (c.demo) live.href = `demos/${c.demo}/index.html?v=1`;
    document.querySelector("#dataset-case-title").textContent = c.title;
    document.querySelector("#dataset-case-type").textContent = `${c.backend} · ${c.category || (c.model ? "模型与渲染" : c.demo ? "实时交互" : "多视角渲染")}`;
    const sum = document.querySelector("#dataset-case-summary");
    if (sum) sum.textContent = c.summary || "";
    document.querySelector("#dataset-case-description").textContent = c.prompt;
    datasetViewer.querySelectorAll("details").forEach(d => d.open = false);
    const tabs = document.querySelector("#dataset-view-tabs"), stage = datasetViewer.querySelector(".dataset-view-stage"), full = document.querySelector("#dataset-full-image");
    tabs.replaceChildren();
    function activate(b) {
        tabs.querySelectorAll("button").forEach(x => {
            x.classList.toggle("active", x === b);
            x.setAttribute("aria-pressed", String(x === b));
        });
    }
    if (c.model) {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = "三维模型";
        b.onclick = () => {
            stopDatasetVideo();
            full.hidden = true;
            const f = document.createElement("iframe");
            f.src = `demos/model-viewer/index.html?case=${c.model}&v=20261115-wire-first`;
            f.title = c.title + "三维模型";
            f.allow = "fullscreen";
            stage.append(f);
            activate(b);
        };
        tabs.append(b);
    }
    if (c.demo) {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = "实时交互";
        b.onclick = () => {
            stopDatasetVideo();
            full.hidden = true;
            const f = document.createElement("iframe");
            f.src = `demos/${c.demo}/index.html?v=1`;
            f.title = c.title + "实时交互";
            f.allow = "fullscreen";
            stage.append(f);
            activate(b);
        };
        tabs.append(b);
    }
    if (c.video && !c.demo) {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = "场景视频";
        b.onclick = () => {
            stopDatasetVideo();
            full.hidden = true;
            const v = document.createElement("video");
            v.src = c.video;
            v.poster = c.views[0].src;
            v.controls = true;
            v.muted = true;
            v.playsInline = true;
            v.loop = false;
            v.setAttribute("aria-label", c.title + "单向运镜视频");
            stage.append(v);
            v.play().catch(() => {});
            activate(b);
        };
        tabs.append(b);
    }
    c.views.forEach(v => {
        const b = document.createElement("button");
        b.textContent = v.label;
        b.type = "button";
        b.onclick = () => {
            stopDatasetVideo();
            full.hidden = false;
            const img = document.querySelector("#dataset-case-image");
            img.src = v.src;
            img.alt = c.title + " · " + v.label;
            full.href = v.src;
            activate(b);
        };
        tabs.append(b);
    });
    tabs.firstElementChild.click();
    datasetViewer.showModal();
    datasetViewer.querySelector(".viewer-sidebar").scrollTop = 0;
    document.body.style.overflow = "hidden";
}

scenes.forEach((s, i) => {
    if (s.backend !== "Three.js") return;
    const card = document.createElement("button");
    card.className = "dataset-case-card";
    card.type = "button";
    card.innerHTML = `<img src="${SiteMedia.thumbnail("assets/" + s.id + "-render.webp")}" alt="${s.name}" loading="lazy" width="1536" height="1024"><div class="scene-caption"><span>Three.js · ${cats[s.category]}</span><strong>${s.name}</strong></div>`;
    card.onclick = () => openScene(i, true);
    document.querySelector("#threejs-case-grid").append(card);
});

datasetCases.forEach((c, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "dataset-case-card";
    button.setAttribute("aria-label", "查看" + c.title + (c.model ? "模型与视频" : c.video ? "视频与细节" : "多视角图"));
    if (c.video) {
        const v = document.createElement("video");
        v.dataset.src = c.video;
        v.dataset.poster = c.views[0].src;
        v.muted = true;
        v.defaultMuted = true;
        v.playsInline = true;
        v.loop = false;
        v.preload = "none";
        v.addEventListener("ended", () => {
            v.dataset.finished = "1";
        });
        button.append(v);
        SiteMedia.register(v);
    } else {
        const img = document.createElement("img");
        img.src = SiteMedia.thumbnail(c.views[0].src);
        img.alt = c.title + "实际渲染";
        img.loading = "lazy";
        button.append(img);
    }
    const small = document.createElement("span");
    small.textContent = `${c.backend} · ${c.category || (c.demo ? "实时交互" : "场景视频")}`;
    const title = document.createElement("strong");
    title.textContent = c.title;
    const caption = document.createElement("div");
    caption.className = "scene-caption";
    caption.append(small, title);
    button.append(caption);
    button.onclick = () => showDatasetCase(i);
    (c.backend === "Three.js" ? document.querySelector("#threejs-case-grid") : datasetGrid).append(button);
});

document.querySelector("#close-dataset-viewer").onclick = () => datasetViewer.close();

datasetViewer.addEventListener("close", () => {
    stopDatasetVideo();
    document.body.style.overflow = "";
});

datasetViewer.addEventListener("click", e => {
    if (e.target === datasetViewer) {
        const r = datasetViewer.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) datasetViewer.close();
    }
});

document.querySelector("#replay-dataset-demos").onclick = () => SiteMedia.replay(datasetGrid.querySelectorAll("video"));

document.querySelector("#replay-threejs-demos").onclick = () => document.querySelectorAll("#threejs-case-grid video").forEach(v => {
    delete v.dataset.finished;
    if (v.getAttribute("src")) {
        v.currentTime = 0;
        if (v.dataset.visible === "1") v.play().catch(() => {});
    }
});

document.querySelectorAll("[data-viewer-fullscreen]").forEach(button => button.onclick = async () => {
    const main = document.querySelector("#" + button.dataset.viewerFullscreen + " .viewer-main");
    try {
        if (document.fullscreenElement) await document.exitFullscreen(); else await main.requestFullscreen();
    } catch (e) {
        button.textContent = "全屏暂不可用";
    }
});

document.addEventListener("fullscreenchange", () => document.querySelectorAll("[data-viewer-fullscreen]").forEach(b => b.textContent = document.fullscreenElement ? "⛶ 退出全屏" : "⛶ 全屏"));

document.querySelectorAll("[data-copy-case]").forEach(button => button.onclick = async () => {
    const id = button.dataset.copyCase === "viewer" ? scenes[selected].id : datasetCases[selectedDataset].id;
    const url = new URL(location.href);
    url.searchParams.set("case", id);
    url.hash = "showcase";
    try {
        await navigator.clipboard.writeText(url.href);
        button.textContent = "已复制链接";
    } catch (e) {
        button.textContent = "复制失败，请重试";
    }
    setTimeout(() => button.textContent = "复制案例链接", 1800);
});

const requestedCase = new URLSearchParams(location.search).get("case");

if (requestedCase) {
    const i = scenes.findIndex(s => s.id === requestedCase);
    if (i >= 0) openScene(i, scenes[i].backend === "Three.js"); else {
        const j = datasetCases.findIndex(c => c.id === requestedCase);
        if (j >= 0) showDatasetCase(j);
    }
}

document.querySelectorAll("[data-copy-prompt]").forEach(button => button.onclick = async () => {
    const prompt = button.dataset.copyPrompt === "viewer" ? scenes[selected].prompt : datasetCases[selectedDataset].prompt;
    try {
        await navigator.clipboard.writeText(window.SiteI18n?.language === "en" ? window.SiteI18n.translate(prompt) : prompt);
        button.textContent = "已复制提示词";
    } catch (e) {
        button.textContent = "复制失败，请重试";
    }
    setTimeout(() => button.textContent = "复制提示词", 1800);
});
