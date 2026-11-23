(() => {
    const root = document.querySelector(".synthesis-animation");
    if (!root) return;
    const layers = [ ...root.querySelectorAll(".syn-stage") ];
    const play = root.querySelector("[data-syn-play]");
    const replay = root.querySelector("[data-syn-replay]");
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const timeScale = 10e3 / 28100;
    root.style.setProperty("--syn-time-scale", timeScale);
    const dwell = [ 2300, 2400, 2200, 2600, 8200, 2800, 3e3, 2900, 1700 ].map(ms => ms * timeScale);
    let phase = 0, playing = false, visible = false, started = false;
    let timer = null, due = 0, remaining = dwell[0], finished = true;
    function sync() {
        const label = playing ? "暂停" : finished ? "播放" : "继续";
        play.textContent = playing ? "Ⅱ" : "▷";
        play.title = label;
        play.setAttribute("aria-label", label + "任务合成动画");
        root.classList.toggle("is-paused", !playing || !visible || document.hidden);
    }
    function stopTimer() {
        if (timer !== null) {
            remaining = Math.max(0, due - performance.now());
            clearTimeout(timer);
            timer = null;
        }
    }
    function show(next) {
        phase = next;
        remaining = dwell[phase];
        root.dataset.phase = String(phase);
        layers.forEach(layer => {
            const step = Number(layer.dataset.synStage);
            layer.classList.toggle("is-shown", step <= phase);
            layer.classList.remove("is-active");
        });
        void root.getBoundingClientRect();
        layers.filter(layer => Number(layer.dataset.synStage) === phase).forEach(layer => layer.classList.add("is-active"));
    }
    function schedule() {
        stopTimer();
        sync();
        if (!playing || !visible || document.hidden) return;
        due = performance.now() + remaining;
        timer = setTimeout(() => {
            timer = null;
            if (phase === dwell.length - 1) {
                finished = true;
                playing = false;
                root.dataset.static = "true";
                sync();
            } else {
                show(phase + 1);
                schedule();
            }
        }, remaining);
    }
    function restart() {
        stopTimer();
        started = true;
        finished = false;
        playing = true;
        const rect = root.getBoundingClientRect();
        visible = rect.bottom > 0 && rect.top < innerHeight;
        root.dataset.static = "false";
        show(0);
        schedule();
    }
    play.addEventListener("click", () => {
        if (finished) return restart();
        playing = !playing;
        schedule();
    });
    replay.addEventListener("click", restart);
    new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !started && !motion.matches) restart(); else schedule();
    }, {
        threshold: 0
    }).observe(root);
    document.addEventListener("visibilitychange", schedule);
    motion.addEventListener("change", () => {
        if (!motion.matches) return;
        stopTimer();
        playing = false;
        finished = true;
        root.dataset.static = "true";
        sync();
    });
    sync();
})();
