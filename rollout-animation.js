(() => {
    const root = document.querySelector(".rollout-animation");
    if (!root) return;
    const layers = [ ...root.querySelectorAll(".roll-stage") ];
    const play = root.querySelector("[data-roll-play]");
    const replay = root.querySelector("[data-roll-replay]");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const starts = [ 600, 3100, 5500, 11e3, 12500, 14e3, 15500, 18e3, 19200, 19200, 19200, 20800, 23600, 26400, 29800, 32500 ];
    const timeScale = 10e3 / 34700;
    const duration = 10e3;
    const itemOffsets = {
        1: [ 0, 550, 1100 ],
        "sandbox-tools": [ 0, 550 ],
        6: [ 600, 820, 1040, 1260 ],
        11: [ 600, 1e3, 1400, 600, 1e3, 1400 ],
        12: [ 600, 1e3, 1400 ],
        13: [ 600, 1200, 1600, 2e3 ],
        14: [ 600, 1300 ]
    };
    const animations = [];
    let elapsed = 0, anchor = 0, raf = 0;
    let started = false, finished = true, requested = false, visible = false, running = false;
    const ease = "cubic-bezier(.4,0,.2,1)";
    function effect(node, frames, delay, time) {
        const animation = node.animate(frames, {
            delay: delay * timeScale,
            duration: time * timeScale,
            easing: ease,
            fill: "both"
        });
        animation.pause();
        animation.currentTime = 0;
        animations.push(animation);
    }
    function build() {
        animations.splice(0).forEach(a => a.cancel());
        layers.forEach(layer => {
            const start = layer.hasAttribute("data-roll-start") ? Number(layer.dataset.rollStart) : starts[Number(layer.dataset.rollStage)];
            const items = [ ...layer.querySelectorAll(".roll-item") ];
            const capture = [ "8", "9", "10" ].includes(layer.dataset.rollStage);
            const onlyItems = [ ...layer.children ].every(node => node.classList.contains("roll-item"));
            effect(layer, [ {
                opacity: 0
            }, {
                opacity: 1
            } ], start, onlyItems && !capture ? 1 : 800);
            if (!capture) items.forEach((item, i) => {
                const offset = itemOffsets[layer.dataset.rollStage]?.[i] ?? 0;
                effect(item, [ {
                    opacity: 0,
                    transform: "translateY(3px)"
                }, {
                    opacity: 1,
                    transform: "translateY(0)"
                } ], start + offset, 700);
            });
            layer.querySelectorAll(".roll-arrow").forEach(arrow => {
                const length = arrow.getTotalLength();
                effect(arrow, [ {
                    strokeDasharray: `${length}`,
                    strokeDashoffset: `${length}`,
                    opacity: 0
                }, {
                    strokeDasharray: `${length}`,
                    strokeDashoffset: "0",
                    opacity: 1
                } ], start, 900);
            });
        });
    }
    function controls() {
        play.textContent = requested ? "Ⅱ" : "▷";
        const label = requested ? "暂停" : finished ? "播放" : "继续";
        play.title = label;
        play.setAttribute("aria-label", label + "采集与验证动画");
    }
    function tick() {
        elapsed = Math.min(duration, performance.now() - anchor);
        root.dataset.phase = String(starts.findLastIndex(t => elapsed >= t * timeScale));
        if (elapsed >= duration) {
            running = false;
            finished = true;
            requested = false;
            root.dataset.static = "true";
            animations.forEach(a => a.finish());
            controls();
            return;
        }
        raf = requestAnimationFrame(tick);
    }
    function sync() {
        const shouldRun = requested && visible && !document.hidden;
        if (running && !shouldRun) {
            elapsed = Math.min(duration, performance.now() - anchor);
            cancelAnimationFrame(raf);
            animations.forEach(a => {
                a.pause();
                a.currentTime = elapsed;
            });
            running = false;
        } else if (!running && shouldRun) {
            anchor = performance.now() - elapsed;
            const start = document.timeline.currentTime - elapsed;
            animations.forEach(a => {
                a.currentTime = elapsed;
                a.play();
                a.startTime = start;
            });
            running = true;
            raf = requestAnimationFrame(tick);
        }
        controls();
    }
    function restart() {
        cancelAnimationFrame(raf);
        running = false;
        elapsed = 0;
        started = true;
        finished = false;
        requested = true;
        root.dataset.static = "false";
        root.dataset.phase = "0";
        build();
        const box = root.getBoundingClientRect();
        visible = box.bottom > 0 && box.top < innerHeight;
        sync();
    }
    play.addEventListener("click", () => {
        if (finished) restart(); else {
            requested = !requested;
            sync();
        }
    });
    replay.addEventListener("click", restart);
    if (!reduced.matches) {
        root.dataset.static = "false";
        build();
    }
    new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting && entry.intersectionRatio >= .6;
        if (visible && !started && !reduced.matches) restart(); else sync();
    }, {
        threshold: [ 0, .6 ]
    }).observe(root);
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", () => {
        if (!reduced.matches) return;
        requested = false;
        sync();
        animations.splice(0).forEach(a => a.cancel());
        finished = true;
        root.dataset.static = "true";
        controls();
    });
    controls();
})();
