const siteMediaAssets = {
    images: {
        "assets/01-render.webp": "assets/thumbs/01-card.webp",
        "assets/02-render.webp": "assets/thumbs/02-card.webp",
        "assets/04-render.webp": "assets/thumbs/04-card.webp",
        "assets/06-render.webp": "assets/thumbs/06-card.webp",
        "assets/07-render.webp": "assets/thumbs/07-card.webp",
        "assets/08-render.webp": "assets/thumbs/08-card.webp",
        "assets/09-render.webp": "assets/thumbs/09-card.webp",
        "assets/dataset-cases/10-hero.webp": "assets/thumbs/10-card.webp",
        "assets/dataset-cases/11-hero.webp": "assets/thumbs/11-card.webp",
        "assets/dataset-cases/12-hero.webp": "assets/thumbs/12-card.webp",
        "assets/dataset-cases/13-hero.webp": "assets/thumbs/13-card.webp",
        "assets/dataset-cases/14-hero.webp": "assets/thumbs/14-card.webp",
        "assets/dataset-cases/15-hero.webp": "assets/thumbs/15-card.webp",
        "assets/dataset-cases/16-hero.webp": "assets/thumbs/16-card.webp",
        "assets/dataset-cases/17-hero.webp": "assets/thumbs/17-card.webp",
        "assets/threejs-videos/18-0000.webp": "assets/thumbs/18-card.webp",
        "assets/threejs-videos/19-0000.webp": "assets/thumbs/19-card.webp",
        "assets/threejs-videos/20-0000.webp": "assets/thumbs/20-card.webp",
        "assets/threejs-videos/21-0000.webp": "assets/thumbs/21-card.webp",
        "assets/threejs-videos/22-0000.webp": "assets/thumbs/22-card.webp",
        "assets/threejs-videos/23-0000.webp": "assets/thumbs/23-card.webp",
        "assets/threejs-videos/24-0000.webp": "assets/thumbs/24-card.webp",
        "assets/threejs-videos/25-0000.webp": "assets/thumbs/25-card.webp",
        "assets/08-reference.webp": "assets/thumbs/08-reference.webp",
        "assets/08-clay.webp": "assets/thumbs/08-clay.webp"
    },
    videos: {
        "assets/videos/01-pan-hd.mp4": "assets/loops/01.mp4",
        "assets/videos/04-pan-hd.mp4": "assets/loops/04.mp4",
        "assets/videos/07-pan-hd.mp4": "assets/loops/07.mp4",
        "assets/videos/08-hero-multiview-hd.mp4": "assets/loops/08.mp4",
        "assets/videos/09-pan-hd.mp4": "assets/loops/09.mp4",
        "assets/dataset-videos/10-pan-hd.mp4": "assets/loops/10.mp4",
        "assets/dataset-videos/11-pan-hd.mp4": "assets/loops/11.mp4",
        "assets/dataset-videos/12-pan-hd.mp4": "assets/loops/12.mp4",
        "assets/dataset-videos/13-pan-hd.mp4": "assets/loops/13.mp4",
        "assets/dataset-videos/14-pan-hd.mp4": "assets/loops/14.mp4",
        "assets/dataset-videos/15-pan-hd.mp4": "assets/loops/15.mp4",
        "assets/threejs-videos/17-pan-hd.mp4": "assets/loops/17.mp4",
        "assets/threejs-videos/18-pan-hd.mp4": "assets/loops/18.mp4",
        "assets/threejs-videos/19-pan-hd.mp4": "assets/loops/19.mp4",
        "assets/threejs-videos/20-pan-hd.mp4": "assets/loops/20.mp4",
        "assets/threejs-videos/21-pan-hd.mp4": "assets/loops/21.mp4",
        "assets/threejs-videos/22-pan-hd.mp4": "assets/loops/22.mp4",
        "assets/threejs-videos/23-pan-hd.mp4": "assets/loops/23.mp4",
        "assets/threejs-videos/24-pan-hd.mp4": "assets/loops/24.mp4",
        "assets/threejs-videos/25-pan-hd.mp4": "assets/loops/25.mp4"
    }
};

(() => {
    const cards = new Set, allowed = new Set, timers = new Map;
    let pending = false;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const thumbnail = src => siteMediaAssets.images[src] || src;
    function release(v) {
        v.pause();
        if (v.hasAttribute("src")) {
            v.removeAttribute("src");
            v.load();
        }
    }
    function blocked() {
        const h = document.querySelector("#hero-video");
        return document.hidden || !!document.querySelector("dialog[open]") || h && !h.paused && !h.ended;
    }
    function schedule() {
        if (!pending) {
            pending = true;
            requestAnimationFrame(update);
        }
    }
    function update() {
        pending = false;
        allowed.clear();
        const saving = navigator.connection?.saveData;
        if (!blocked()) [ ...cards ].filter(v => v.isConnected && v.dataset.visible === "1" && !v.closest("[hidden]") && !v.dataset.failed && (!(reduced.matches || saving) || v.dataset.manual === "1")).forEach(v => allowed.add(v));
        for (const v of cards) {
            if (!allowed.has(v)) {
                v.pause();
                continue;
            }
            clearTimeout(timers.get(v));
            timers.delete(v);
            if (!v.poster) v.poster = v.dataset.poster;
            if (!v.hasAttribute("src")) v.src = v.dataset.src;
            if (v.paused && !v.dataset.starting) {
                v.dataset.starting = "1";
                v.play().catch(() => {}).finally(() => {
                    delete v.dataset.starting;
                });
            }
        }
    }
    const posters = new IntersectionObserver(entries => entries.forEach(({target: v, isIntersecting: isIntersecting}) => {
        if (isIntersecting) {
            v.poster = v.dataset.poster;
            posters.unobserve(v);
        }
    }), {
        rootMargin: "300px"
    });
    const visibility = new IntersectionObserver(entries => {
        for (const {target: v, isIntersecting: isIntersecting, intersectionRatio: intersectionRatio} of entries) {
            v.dataset.visible = isIntersecting && intersectionRatio >= .25 ? "1" : "0";
            if (v.dataset.visible === "1") {
                clearTimeout(timers.get(v));
                timers.delete(v);
            } else {
                v.pause();
                clearTimeout(timers.get(v));
                timers.set(v, setTimeout(() => {
                    if (v.dataset.visible !== "1") release(v);
                    timers.delete(v);
                }, 5e3));
            }
        }
        schedule();
    }, {
        threshold: [ 0, .25, .5, .75, 1 ]
    });
    function register(v) {
        cards.add(v);
        v.loop = true;
        v.preload = "none";
        v.dataset.originalSrc = v.dataset.src;
        v.dataset.src = siteMediaAssets.videos[v.dataset.src] || v.dataset.src;
        v.dataset.poster = thumbnail(v.dataset.poster || v.poster);
        v.removeAttribute("poster");
        v.dataset.visible = "0";
        v.addEventListener("ended", () => {
            v.dataset.finished = "1";
            delete v.dataset.manual;
            schedule();
        });
        v.addEventListener("error", () => {
            if (v.hasAttribute("src")) {
                v.dataset.failed = "1";
                schedule();
            }
        });
        posters.observe(v);
        visibility.observe(v);
    }
    function unregister(v) {
        cards.delete(v);
        allowed.delete(v);
        visibility.unobserve(v);
        posters.unobserve(v);
        clearTimeout(timers.get(v));
        timers.delete(v);
        release(v);
    }
    function replay(videos) {
        for (const v of videos) {
            delete v.dataset.finished;
            delete v.dataset.failed;
            v.dataset.manual = "1";
            if (v.readyState >= 1) v.currentTime = 0;
        }
        schedule();
    }
    document.addEventListener("play", e => {
        const v = e.target;
        if (cards.has(v)) {
            if (!allowed.has(v) || blocked()) v.pause();
        } else if (v instanceof HTMLMediaElement) {
            for (const c of cards) c.pause();
            schedule();
        }
    }, true);
    document.addEventListener("pause", e => {
        if (e.target.id === "hero-video") schedule();
    }, true);
    let resumeHeroWhenVisible = false;
    document.addEventListener("visibilitychange", () => {
        const hero = document.querySelector("#hero-video");
        if (document.hidden) {
            resumeHeroWhenVisible = !!hero && !hero.paused && !hero.ended;
            document.querySelectorAll("video").forEach(v => v.pause());
            cards.forEach(release);
        } else {
            if (resumeHeroWhenVisible && hero && !document.querySelector("dialog[open]")) {
                const rect = hero.getBoundingClientRect();
                if (rect.bottom > 0 && rect.top < innerHeight) hero.play().catch(() => {});
            }
            resumeHeroWhenVisible = false;
            schedule();
        }
    });
    document.querySelectorAll("dialog").forEach(d => new MutationObserver(schedule).observe(d, {
        attributes: true,
        attributeFilter: [ "open" ]
    }));
    const hero = document.querySelector("#hero-video");
    if (hero) new IntersectionObserver(es => {
        if (!es[0].isIntersecting && !hero.paused && !hero.closest("dialog[open]")) {
            const r = hero.getBoundingClientRect();
            if (r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth || !r.width || !r.height) hero.pause();
        }
    }, {
        threshold: 0
    }).observe(hero);
    reduced.addEventListener("change", schedule);
    window.SiteMedia = {
        thumbnail: thumbnail,
        register: register,
        unregister: unregister,
        replay: replay,
        refresh: schedule
    };
})();
