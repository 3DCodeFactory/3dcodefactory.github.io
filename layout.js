(() => {
    const gallery = document.querySelector("#gallery");
    const secondary = document.querySelector("#threejs-case-grid");
    const filters = [ ...document.querySelectorAll("[data-gallery-filter]") ];
    const cases = new Map([ ...scenes.map(scene => [ scene.name, scene ]), ...datasetCases.map(scene => [ scene.title, scene ]) ]);
    const galleryLabels = {
        "01": [ "Laboratory", "晶圆检测室", "显微检测台置于洁净暗室，晶圆虹彩映出双屏冷光。" ],
        "04": [ "Streetscape", "乡间通学路", "校门车棚沿缓坡排布，午后斜阳掠过挡土石墙与街道。" ],
        "06": [ "Streetscape", "雨夜报刊亭", "报刊橱窗与售卖机映入积水，天气照明支持实时交互。" ],
        "07": [ "Outdoors", "雨林滑索", "巨树间架设木台与钢索，安全带与头盔沿挂架陈列。" ],
        "08": [ "Aviation", "航空机库", "钢桁架机库陈列四发客机，抛光机身映出天窗冷光。" ],
        "09": [ "Interior", "校车房车", "胡桃木料理台沿车厢展开，卡座与床铺自然紧凑衔接。" ],
        10: [ "Landscape", "河谷栈道", "木栈道沿乱石溪流蜿蜒，晨雾中的林岭展现空间纵深。" ],
        11: [ "Ecology", "雨林花树", "巨型花树撑起雨林冠层，苔藓气根间点缀簇状红花。" ],
        12: [ "Instrument", "温室钢琴", "常春藤漫过旧钢琴弦列，荒废温室透入柔和午后天光。" ],
        13: [ "Archive", "地图绘图室", "高窗斜光照亮绘图桌，大头针与丝线标注城市路网。" ],
        14: [ "Outpost", "雪地补给屋", "覆霜门框通向寒林，室内货架堆叠燃料绳索与工具。" ],
        17: [ "Architecture", "月下楼阁", "重檐木塔矗立湿润石阶，回廊灯笼与夜雾可交互调节。" ],
        18: [ "Industrial", "花车工坊", "脚手架环绕机库花车，线缆脉冲与灯光可交互切换。" ],
        19: [ "Robotics", "机器人车间", "巡检通道排布机柜与充电桩，支持触发充电和警示灯。" ],
        20: [ "Underground", "地下涂鸦通道", "涂鸦覆盖潮湿拱墙，灯光闪烁映入积水并改变反光。" ],
        21: [ "Interior", "艺术客厅", "彩绘玻璃投影丝绒沙发，日照切换改变室内彩色色斑。" ],
        22: [ "Craftsmanship", "珠宝工作台", "绿绒垫散落齿轮与宝石，旋动放大镜可检视精密细部。" ],
        23: [ "Materiality", "旧木余晖", "近景呈现木板裂隙与树节，移动暖光掠过铁钉表面。" ],
        24: [ "Industrial", "夜间仓库", "钢桁架仓库地面留有车辙，手电光束照亮浮尘长影。" ],
        26: [ "Industrial", "工业泵站", "尖拱窗冷光映入浅水石地，旋动铜阀触发泵体涟漪。" ]
    };
    const cards = [ ...gallery.children, ...secondary.children ];
    for (const card of cards) {
        const scene = cases.get(card.querySelector("h3,strong")?.textContent.trim());
        if (!scene) throw new Error("Gallery card has no matching scene");
        card.dataset.caseId = scene.id;
        card.dataset.backend = scene.backend;
        const label = galleryLabels[scene.id];
        if (label) {
            const caption = card.querySelector(".scene-caption");
            const category = document.createElement("span");
            category.className = "gallery-leaf";
            category.textContent = label[0];
            const title = document.createElement("strong");
            title.textContent = label[1];
            const description = document.createElement("p");
            description.className = "gallery-description";
            description.textContent = label[2];
            caption.replaceChildren(category, title, description);
            card.setAttribute("aria-label", label[1] + " · " + label[0]);
        }
    }
    function matches(card, filter) {
        const omitted = filter === "Blender" ? [ "15", "28" ] : [ "02", "25" ];
        return card.dataset.backend === filter && !omitted.includes(card.dataset.caseId);
    }
    function selectGallery(filter) {
        for (const video of gallery.querySelectorAll("video")) video.pause();
        const swapped = filter === "Blender" ? {
            12: 13,
            13: 12
        } : {
            22: 23,
            23: 22
        };
        const rank = card => filter === "Three.js" && card.dataset.caseId === "21" ? 100 : filter === "Blender" && card.dataset.caseId === "11" ? -1 : swapped[card.dataset.caseId] ?? Number(card.dataset.caseId);
        const sorted = [ ...cards ].sort((a, b) => rank(a) - rank(b));
        for (const card of sorted) card.hidden = !matches(card, filter);
        gallery.replaceChildren(...sorted);
        for (const button of filters) {
            const active = button.dataset.galleryFilter === filter;
            button.classList.toggle("active", active);
            button.setAttribute("aria-pressed", String(active));
        }
        const shown = sorted.filter(card => !card.hidden);
        const formats = filter === "Blender" ? [ "wide", "landscape", "landscape", "landscape", "landscape", "landscape", "landscape", "wide", "landscape", "landscape" ] : [ "wide", "landscape", "landscape", "landscape", "landscape", "landscape", "landscape", "landscape", "landscape", "wide" ];
        shown.forEach((card, index) => {
            card.dataset.format = formats[index % formats.length];
        });
        const label = filter === "Blender" ? "Blender 场景" : "Three.js 场景";
        document.querySelector("#gallery-status").textContent = label;
        window.SiteMedia?.refresh();
    }
    for (const button of filters) {
        button.onclick = () => selectGallery(button.dataset.galleryFilter);
    }
    document.querySelector("#replay-demos").onclick = () => window.SiteMedia.replay(cards.filter(card => !card.hidden).flatMap(card => [ ...card.querySelectorAll("video") ]));
    selectGallery("Blender");
    document.querySelector(".showcase-filters").hidden = false;
    const sections = [ ...document.querySelectorAll("main > .section") ];
    const navLinks = [ ...document.querySelectorAll('header nav a[href^="#"]') ];
    const header = document.querySelector("body > header");
    let scheduled = false;
    function updateNavigation() {
        scheduled = false;
        const threshold = header.getBoundingClientRect().height + 90;
        const active = sections.filter(section => section.getBoundingClientRect().top <= threshold).at(-1);
        for (const link of navLinks) {
            if (active && link.hash === "#" + active.id) link.setAttribute("aria-current", "location"); else link.removeAttribute("aria-current");
        }
    }
    function scheduleNavigation() {
        if (!scheduled) {
            scheduled = true;
            requestAnimationFrame(updateNavigation);
        }
    }
    addEventListener("scroll", scheduleNavigation, {
        passive: true
    });
    addEventListener("resize", scheduleNavigation);
    updateNavigation();
})();

(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const elements = document.querySelectorAll(".section-heading, #gallery > *, #method .steps > *, .stage-card, .generation-stage, .task-pair > article, #dataset .paper-figure, .result-highlights > *, .benchmark-comparison, .comparison, .resource-grid > *");
    if (reduced.matches || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(entries => {
        for (const {target: target, isIntersecting: isIntersecting} of entries) if (isIntersecting) {
            target.classList.add("is-revealed");
            observer.unobserve(target);
        }
    }, {
        rootMargin: "0px 0px -5% 0px",
        threshold: 0
    });
    for (const element of elements) {
        const rect = element.getBoundingClientRect();
        element.classList.add("scroll-reveal");
        if (!element.hidden && rect.top < innerHeight * .95 && rect.bottom > 0) element.classList.add("is-revealed"); else observer.observe(element);
    }
    reduced.addEventListener("change", () => {
        if (reduced.matches) {
            observer.disconnect();
            elements.forEach(element => element.classList.add("is-revealed"));
        }
    });
})();

(() => {
    const genVideo = document.querySelector("#generation-video");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    if (!genVideo || !("IntersectionObserver" in window)) return;
    new IntersectionObserver(([entry]) => {
        if (genVideo.closest("#media-lightbox")) return;
        if (entry.isIntersecting && entry.intersectionRatio >= .35) {
            if (!reduced.matches && genVideo.paused) genVideo.play().catch(() => {});
        } else if (!entry.isIntersecting && !genVideo.paused) {
            genVideo.pause();
        }
    }, {
        threshold: [ 0, .35 ]
    }).observe(genVideo);
})();

(() => {
    const sections = document.querySelectorAll(".stats, .data-facts");
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches || !("IntersectionObserver" in window)) return;
    sections.forEach(section => {
        const numbers = [ ...section.querySelectorAll("strong") ].map(element => {
            const original = element.textContent.trim();
            const match = original.match(/^([^\d]*)([\d,]+(?:\.\d+)?)(.*)$/);
            if (!match) return null;
            const decimals = (match[2].split(".")[1] || "").length;
            element.setAttribute("aria-label", original);
            element.style.fontVariantNumeric = "tabular-nums";
            return {
                element: element,
                original: original,
                prefix: match[1],
                suffix: match[3],
                value: Number(match[2].replaceAll(",", "")),
                decimals: decimals
            };
        }).filter(Boolean);
        let frame;
        const finish = () => {
            cancelAnimationFrame(frame);
            numbers.forEach(({element: element, original: original}) => {
                element.textContent = original;
            });
        };
        const observer = new IntersectionObserver(entries => {
            if (!entries.some(entry => entry.isIntersecting)) return;
            observer.disconnect();
            const start = performance.now();
            function tick(now) {
                const progress = Math.min(1, (now - start) / 1100);
                const eased = 1 - Math.pow(1 - progress, 3);
                numbers.forEach(({element: element, value: value, decimals: decimals, prefix: prefix, suffix: suffix}) => {
                    element.textContent = prefix + (value * eased).toLocaleString("en-US", {
                        minimumFractionDigits: decimals,
                        maximumFractionDigits: decimals
                    }) + suffix;
                });
                if (progress < 1 && !motion.matches) frame = requestAnimationFrame(tick); else finish();
            }
            frame = requestAnimationFrame(tick);
        }, {
            threshold: .25
        });
        observer.observe(section);
        motion.addEventListener("change", () => {
            if (motion.matches) {
                observer.disconnect();
                finish();
            }
        });
    });
})();
