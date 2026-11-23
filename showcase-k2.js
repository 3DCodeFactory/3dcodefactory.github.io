(() => {
    const entries = [ {
        id: "11",
        backend: "Blender",
        cat: "Ecology",
        title: "雨林花树",
        thumb: "assets/thumbs/11-card.webp",
        video: "assets/loops/11.mp4"
    }, {
        id: "17",
        backend: "Three.js",
        cat: "Architecture",
        title: "月下楼阁",
        thumb: "assets/thumbs/17-card.webp",
        video: "assets/loops/17.mp4"
    }, {
        id: "01",
        backend: "Blender",
        cat: "Laboratory",
        title: "晶圆检测室",
        thumb: "assets/thumbs/01-card.webp",
        video: "assets/loops/01.mp4"
    }, {
        id: "18",
        backend: "Three.js",
        cat: "Industrial",
        title: "花车工坊",
        thumb: "assets/thumbs/18-card.webp",
        video: "assets/loops/18.mp4"
    }, {
        id: "04",
        backend: "Blender",
        cat: "Streetscape",
        title: "乡间通学路",
        thumb: "assets/thumbs/04-card.webp",
        video: "assets/loops/04.mp4"
    }, {
        id: "21",
        backend: "Three.js",
        cat: "Interior",
        title: "艺术客厅",
        thumb: "assets/thumbs/21-card.webp",
        video: "assets/loops/21.mp4"
    }, {
        id: "08",
        backend: "Blender",
        cat: "Aviation",
        title: "航空机库",
        thumb: "assets/thumbs/08-card.webp",
        video: "assets/loops/08.mp4"
    }, {
        id: "19",
        backend: "Three.js",
        cat: "Robotics",
        title: "机器人车间",
        thumb: "assets/thumbs/19-card.webp",
        video: "assets/loops/19.mp4"
    }, {
        id: "07",
        backend: "Blender",
        cat: "Outdoors",
        title: "雨林滑索",
        thumb: "assets/thumbs/07-card.webp",
        video: "assets/loops/07.mp4"
    }, {
        id: "06",
        backend: "Three.js",
        cat: "Streetscape",
        title: "雨夜报刊亭",
        thumb: "assets/thumbs/06-card.webp",
        video: "assets/loops/06.mp4"
    }, {
        id: "09",
        backend: "Blender",
        cat: "Interior",
        title: "校车房车",
        thumb: "assets/thumbs/09-card.webp",
        video: "assets/loops/09.mp4"
    }, {
        id: "22",
        backend: "Three.js",
        cat: "Craftsmanship",
        title: "珠宝工作台",
        thumb: "assets/thumbs/22-card.webp",
        video: "assets/loops/22.mp4"
    }, {
        id: "13",
        backend: "Blender",
        cat: "Archive",
        title: "地图绘图室",
        thumb: "assets/thumbs/13-card.webp",
        video: "assets/loops/13.mp4"
    }, {
        id: "20",
        backend: "Three.js",
        cat: "Underground",
        title: "地下涂鸦通道",
        thumb: "assets/thumbs/20-card.webp",
        video: "assets/loops/20.mp4"
    }, {
        id: "10",
        backend: "Blender",
        cat: "Landscape",
        title: "河谷栈道",
        thumb: "assets/thumbs/10-card.webp",
        video: "assets/loops/10.mp4"
    }, {
        id: "23",
        backend: "Three.js",
        cat: "Materiality",
        title: "旧木余晖",
        thumb: "assets/thumbs/23-card.webp",
        video: "assets/loops/23.mp4"
    }, {
        id: "12",
        backend: "Blender",
        cat: "Instrument",
        title: "温室钢琴",
        thumb: "assets/thumbs/12-card.webp",
        video: "assets/loops/12.mp4"
    }, {
        id: "24",
        backend: "Three.js",
        cat: "Industrial",
        title: "夜间仓库",
        thumb: "assets/thumbs/24-card.webp",
        video: "assets/loops/24.mp4"
    }, {
        id: "14",
        backend: "Blender",
        cat: "Outpost",
        title: "雪地补给屋",
        thumb: "assets/thumbs/14-card.webp",
        video: "assets/loops/14.mp4"
    }, {
        id: "26",
        backend: "Three.js",
        cat: "Industrial",
        title: "工业泵站",
        thumb: "assets/dataset-cases/29-hero.png",
        video: "assets/loops/26.mp4"
    } ];
    const descriptions = {
        "01": "显微检测台置于洁净暗室，晶圆虹彩映出双屏冷光。",
        "04": "校门车棚沿缓坡排布，午后斜阳掠过挡土石墙与街道。",
        "06": "报刊橱窗与售卖机映入积水，天气照明支持实时交互。",
        "07": "巨树间架设木台与钢索，安全带与头盔沿挂架陈列。",
        "08": "钢桁架机库陈列四发客机，抛光机身映出天窗冷光。",
        "09": "胡桃木料理台沿车厢展开，卡座与床铺自然紧凑衔接。",
        10: "木栈道沿乱石溪流蜿蜒，晨雾中的林岭展现空间纵深。",
        11: "巨型花树撑起雨林冠层，苔藓气根间点缀簇状红花。",
        12: "常春藤漫过旧钢琴弦列，荒废温室透入柔和午后天光。",
        13: "高窗斜光照亮绘图桌，大头针与丝线标注城市路网。",
        14: "覆霜门框通向寒林，室内货架堆叠燃料绳索与工具。",
        17: "重檐木塔矗立湿润石阶，回廊灯笼与夜雾可交互调节。",
        18: "脚手架环绕机库花车，线缆脉冲与灯光可交互切换。",
        19: "巡检通道排布机柜与充电桩，支持触发充电和警示灯。",
        20: "涂鸦覆盖潮湿拱墙，灯光闪烁映入积水并改变反光。",
        21: "彩绘玻璃投影丝绒沙发，日照切换改变室内彩色色斑。",
        22: "绿绒垫散落齿轮与宝石，旋动放大镜可检视精密细部。",
        23: "近景呈现木板裂隙与树节，移动暖光掠过铁钉表面。",
        24: "钢桁架仓库地面留有车辙，手电光束照亮浮尘长影。",
        26: "尖拱窗冷光映入浅水石地，旋动铜阀触发泵体涟漪。"
    };
    const viewport = document.querySelector("#gallery");
    if (!viewport) return;
    const toolbar = document.querySelector("#showcase .showcase-toolbar");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let offset = 0, wrap = 1, frame = 0, last = 0;
    let visible = false, hovering = false, focused = false, speed = 55;
    let track, drag = null, slide = null, holdUntil = 0, suppressClickUntil = 0;
    toolbar.replaceChildren();
    toolbar.hidden = true;
    function card(entry, main = false) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "k2-card" + (main ? " k2-main" : "");
        button.dataset.caseId = entry.id;
        button.dataset.backend = entry.backend;
        button.setAttribute("aria-label", `${entry.title} · ${entry.backend}`);
        if (entry.video) {
            const video = document.createElement("video");
            video.muted = true;
            video.defaultMuted = true;
            video.playsInline = true;
            video.loop = true;
            video.preload = "none";
            video.dataset.src = entry.video;
            video.dataset.poster = entry.thumb;
            video.setAttribute("aria-label", entry.title + "场景视频");
            button.append(video);
            SiteMedia.register(video);
        } else {
            const image = document.createElement("img");
            image.src = entry.thumb;
            image.alt = entry.title;
            image.loading = "lazy";
            button.append(image);
        }
        const tag = document.createElement("span");
        tag.className = "k2-mono-tag";
        tag.textContent = entry.backend;
        const meta = document.createElement("span");
        meta.className = "k2-meta";
        const category = document.createElement("span");
        category.className = "k2-category";
        category.textContent = entry.cat;
        const name = document.createElement("strong");
        name.className = "k2-name";
        name.textContent = entry.title;
        const description = document.createElement("span");
        description.className = "k2-description";
        description.textContent = descriptions[entry.id] || "";
        meta.append(category, name, description);
        button.append(tag, meta);
        button.onclick = () => {
            if (performance.now() < suppressClickUntil) return;
            const i = scenes.findIndex(s => s.id === entry.id);
            if (i >= 0) openScene(i, entry.backend === "Three.js"); else {
                const j = datasetCases.findIndex(c => c.id === entry.id);
                if (j >= 0) showDatasetCase(j);
            }
            sync();
        };
        return button;
    }
    function render() {
        cancelAnimationFrame(frame);
        frame = 0;
        last = 0;
        viewport.querySelectorAll("video").forEach(v => SiteMedia.unregister(v));
        viewport.replaceChildren();
        viewport.className = "k2-viewport";
        const pool = entries;
        track = document.createElement("div");
        track.className = "k2-track";
        for (let copy = 0; copy < 2; copy++) {
            const sequence = document.createElement("div");
            sequence.className = "k2-sequence";
            let index = 0;
            const next = () => pool[index++ % pool.length];
            for (const kind of [ "left", "middle", "right", "middle-reverse", "left", "middle", "right", "middle-reverse" ]) {
                const column = document.createElement("div");
                column.className = "k2-column k2-" + kind;
                if (kind.startsWith("middle")) {
                    const main = card(next(), true);
                    const pair = document.createElement("div");
                    pair.className = "k2-subpair";
                    pair.append(card(next()), card(next()));
                    column.append(...kind === "middle" ? [ main, pair ] : [ pair, main ]);
                } else column.append(card(next()), card(next()));
                sequence.append(column);
            }
            track.append(sequence);
        }
        viewport.append(track);
        wrap = track.firstElementChild.getBoundingClientRect().width;
        offset = 0;
        holdUntil = performance.now() + 1800;
        paint();
        sync();
        SiteMedia.refresh();
    }
    function paint() {
        track.style.transform = `translate3d(${-offset}px,0,0)`;
    }
    function move(delta) {
        offset += delta;
        while (offset >= wrap) {
            track.append(track.firstElementChild);
            offset -= wrap;
        }
        while (offset < 0) {
            track.prepend(track.lastElementChild);
            offset += wrap;
        }
        paint();
    }
    function blocked() {
        return !visible || document.hidden || !!document.querySelector("dialog[open]") || reduced.matches && !slide;
    }
    function tick(now) {
        frame = 0;
        if (blocked()) {
            last = 0;
            return;
        }
        const dt = last ? Math.min((now - last) / 1e3, .05) : 0;
        last = now;
        if (slide) {
            const t = Math.min(1, (now - slide.start) / 460), eased = 1 - Math.pow(1 - t, 3);
            move(slide.distance * (eased - slide.progress));
            slide.progress = eased;
            if (t === 1) {
                slide = null;
                holdUntil = now + 1400;
                speed = 0;
            }
        } else if (!drag && now >= holdUntil) {
            const target = hovering || focused ? 16 : 55;
            speed += (target - speed) * (1 - Math.exp(-dt * 5));
            move(speed * dt);
        }
        frame = requestAnimationFrame(tick);
    }
    function sync() {
        if (blocked()) {
            cancelAnimationFrame(frame);
            frame = 0;
            last = 0;
        } else if (!frame) frame = requestAnimationFrame(tick);
    }
    function nudge(direction) {
        speed = 0;
        slide = null;
        if (reduced.matches) {
            move(direction * 420);
            return;
        }
        slide = {
            distance: direction * 420,
            start: performance.now(),
            progress: 0
        };
        sync();
    }
    viewport.addEventListener("pointerdown", event => {
        if (event.button !== 0 || !event.target.closest(".k2-card")) return;
        slide = null;
        speed = 0;
        drag = {
            id: event.pointerId,
            startX: event.clientX,
            lastX: event.clientX,
            moved: false
        };
    });
    viewport.addEventListener("pointermove", event => {
        if (!drag || event.pointerId !== drag.id) return;
        if (!drag.moved && Math.abs(event.clientX - drag.startX) > 5) {
            drag.moved = true;
            viewport.setPointerCapture(event.pointerId);
            viewport.classList.add("is-dragging");
        }
        if (drag.moved) {
            event.preventDefault();
            move(drag.lastX - event.clientX);
            suppressClickUntil = performance.now() + 400;
        }
        drag.lastX = event.clientX;
    });
    function release(event) {
        if (!drag || event.pointerId !== drag.id) return;
        if (drag.moved) suppressClickUntil = performance.now() + 400;
        if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
        drag = null;
        viewport.classList.remove("is-dragging");
        holdUntil = performance.now() + 1600;
        speed = 0;
        sync();
    }
    window.addEventListener("pointerup", release);
    viewport.addEventListener("pointercancel", release);
    viewport.addEventListener("lostpointercapture", release);
    viewport.addEventListener("dragstart", event => event.preventDefault());
    viewport.addEventListener("wheel", event => {
        if (event.ctrlKey) return;
        const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.shiftKey ? event.deltaY : 0;
        if (!delta) return;
        event.preventDefault();
        slide = null;
        speed = 0;
        holdUntil = performance.now() + 1600;
        move(delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientWidth : 1));
        sync();
    }, {
        passive: false
    });
    viewport.addEventListener("keydown", event => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            nudge(event.key === "ArrowRight" ? 1 : -1);
        }
    });
    viewport.addEventListener("mouseenter", () => {
        hovering = true;
    });
    viewport.addEventListener("mouseleave", () => {
        hovering = false;
    });
    viewport.addEventListener("focusin", () => {
        focused = true;
    });
    viewport.addEventListener("focusout", () => {
        focused = false;
    });
    new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        sync();
    }, {
        threshold: 0
    }).observe(viewport);
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    document.querySelectorAll("dialog").forEach(d => new MutationObserver(() => {
        sync();
        SiteMedia.refresh();
    }).observe(d, {
        attributes: true,
        attributeFilter: [ "open" ]
    }));
    addEventListener("resize", () => {
        wrap = track.firstElementChild.getBoundingClientRect().width;
        offset %= wrap;
        paint();
    }, {
        passive: true
    });
    function sizeColumns() {
        const available = viewport.clientWidth - 28;
        for (const [name, width] of [ [ "left", 364 ], [ "middle", 480 ], [ "right", 348 ] ]) viewport.style.setProperty("--k2-" + name, available * width / 1192 + "px");
    }
    sizeColumns();
    addEventListener("resize", () => {
        sizeColumns();
        wrap = track.firstElementChild.getBoundingClientRect().width;
        offset %= wrap;
        paint();
    });
    render();
    for (const [direction, label, path] of [ [ -1, "向左浏览", "M14 5l-7 7 7 7" ], [ 1, "向右浏览", "M10 5l7 7-7 7" ] ]) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "k2-nav " + (direction < 0 ? "k2-prev" : "k2-next");
        button.setAttribute("aria-label", label);
        button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
        button.onclick = () => nudge(direction);
        viewport.append(button);
    }
})();
