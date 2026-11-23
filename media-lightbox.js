document.addEventListener("click", e => {
    const img = e.target.closest("img");
    if (!img || img.closest("#gallery,.intro,header,.traj-filmstrip,dialog")) return;
    if (img.closest("main figure,main .task-pair,main .native-task-strip,main .native-bmk-wrap,main .traj-player")) {
        e.preventDefault();
        e.stopImmediatePropagation();
    }
}, true);

(() => {
    const modal = document.createElement("dialog");
    modal.id = "media-lightbox";
    modal.setAttribute("aria-label", "媒体预览");
    modal.innerHTML = '<button class="media-close" type="button" aria-label="关闭预览">×</button><div class="media-lightbox-content"></div>';
    document.body.append(modal);
    const content = modal.querySelector(".media-lightbox-content");
    let previousOverflow = "", sourceVideo = null, sourceSlot = null, origin = null, resumeOnClose = false;
    const time = n => Number.isFinite(n) ? `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, "0")}` : "0:00";
    function openMedia(element) {
        if (modal.open) return;
        if (content.childElementCount) cleanup();
        origin = document.activeElement;
        previousOverflow = document.body.style.overflow;
        document.querySelectorAll("video").forEach(v => {
            if (v !== element) v.pause();
        });
        content.replaceChildren();
        if (element instanceof HTMLVideoElement) {
            sourceVideo = element;
            const player = element.closest(".silent-player");
            sourceSlot = document.createComment("video-inline-position");
            player.before(sourceSlot);
            const playing = !element.paused && !element.ended;
            if (content.moveBefore) content.moveBefore(player, null); else content.append(player);
            if (playing) requestAnimationFrame(() => {
                if (modal.open && sourceVideo === element) element.play().catch(() => {});
            });
        } else {
            const img = document.createElement("img");
            const a = element.closest("a");
            img.src = element.id === "comparison-image" ? element.currentSrc : a && /\.(png|jpe?g|webp|svg)(\?|$)/i.test(a.href) ? a.href : element.currentSrc || element.src;
            img.alt = element.alt || "放大图片";
            content.append(img);
        }
        modal.showModal();
        document.body.style.overflow = "hidden";
        modal.querySelector(".media-close").focus();
    }
    function closeMedia() {
        resumeOnClose = !!sourceVideo && !sourceVideo.paused && !sourceVideo.ended;
        modal.close();
    }
    modal.querySelector(".media-close").onclick = closeMedia;
    modal.addEventListener("cancel", e => {
        e.preventDefault();
        closeMedia();
    });
    modal.addEventListener("click", e => {
        if (e.target === modal) {
            const r = modal.getBoundingClientRect();
            if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeMedia();
        }
    });
    function cleanup() {
        if (sourceVideo && sourceSlot) {
            const playing = resumeOnClose || !sourceVideo.paused && !sourceVideo.ended;
            const player = sourceVideo.closest(".silent-player"), parent = sourceSlot.parentElement;
            if (parent.moveBefore) {
                parent.moveBefore(player, sourceSlot);
                sourceSlot.remove();
            } else sourceSlot.replaceWith(player);
            const restored = sourceVideo;
            if (playing) requestAnimationFrame(() => {
                if (!modal.open && restored.isConnected) restored.play().catch(() => {});
            });
        }
        sourceVideo = null;
        sourceSlot = null;
        resumeOnClose = false;
        content.replaceChildren();
        document.body.style.overflow = previousOverflow;
        origin?.focus({
            preventScroll: true
        });
        window.SiteMedia?.refresh();
    }
    modal.addEventListener("close", () => {
        if (!modal.open) cleanup();
    });
    function enhanceVideo(video) {
        if (!video.controls || video.closest(".silent-player")) return;
        video.controls = false;
        video.muted = true;
        video.defaultMuted = true;
        video.playsInline = true;
        video.disablePictureInPicture = true;
        if (video.preload === "none") video.preload = "metadata";
        const player = document.createElement("div");
        player.className = "silent-player";
        video.before(player);
        player.append(video);
        const bar = document.createElement("div");
        bar.className = "silent-controls";
        bar.innerHTML = '<button type="button" class="silent-play" aria-label="播放">▶</button><input class="silent-seek" type="range" min="0" max="100" value="0" step="0.1" aria-label="播放进度"><span class="silent-time">0:00 / 0:00</span>';
        player.append(bar);
        const status = document.createElement("span");
        status.className = "silent-status";
        status.setAttribute("role", "status");
        status.hidden = true;
        player.append(status);
        let waiting = false, scrubbing = false, userRequestedPlayback = false;
        let autoplayPending = video.id === "hero-video" && video.autoplay;
        let syncHero = () => {};
        const isPaused = () => !autoplayPending && video.paused;
        const play = bar.querySelector("button"), seek = bar.querySelector("input"), label = bar.querySelector("span");
        const toggle = () => {
            const shouldPlay = isPaused() || !!video.error;
            userRequestedPlayback = true;
            autoplayPending = false;
            if (video.error) video.load();
            if (shouldPlay) {
                waiting = video.readyState < 3;
                video.play().catch(() => {
                    waiting = false;
                    update();
                });
            } else video.pause();
            update();
        };
        play.onclick = toggle;
        video.onclick = toggle;
        function update() {
            play.textContent = isPaused() ? "▶" : "Ⅱ";
            play.setAttribute("aria-label", isPaused() ? "播放" : "暂停");
            seek.disabled = !Number.isFinite(video.duration) || !video.duration;
            if (!scrubbing) seek.value = seek.disabled ? 0 : video.currentTime / video.duration * 100;
            seek.setAttribute("aria-valuetext", `${time(video.currentTime)} / ${time(video.duration)}`);
            label.textContent = `${time(video.currentTime)} / ${Number.isFinite(video.duration) ? time(video.duration) : "—:—"}`;
            status.textContent = video.error ? "视频加载失败，点击播放重试" : "正在加载…";
            status.hidden = !video.error && (!(waiting || autoplayPending) || isPaused());
            syncHero();
        }
        for (const event of [ "playing", "ended", "error" ]) video.addEventListener(event, () => {
            autoplayPending = false;
        });
        for (const event of [ "play", "pause", "timeupdate", "loadedmetadata", "durationchange", "ended", "emptied" ]) video.addEventListener(event, update);
        for (const event of [ "waiting", "seeking" ]) video.addEventListener(event, () => {
            waiting = true;
            update();
        });
        for (const event of [ "playing", "canplay", "seeked", "error" ]) video.addEventListener(event, () => {
            waiting = false;
            update();
        });
        const seekToPosition = () => {
            if (!Number.isFinite(video.duration) || video.duration <= 0) return;
            player.classList.remove("shows-poster");
            video.currentTime = Number(seek.value) / 100 * video.duration;
        };
        seek.addEventListener("pointerdown", () => { scrubbing = true; });
        seek.addEventListener("input", seekToPosition);
        seek.addEventListener("change", () => { seekToPosition(); scrubbing = false; update(); });
        seek.addEventListener("pointerup", () => { scrubbing = false; });
        seek.addEventListener("pointercancel", () => { scrubbing = false; update(); });
        if (!video.closest("#media-lightbox")) {
            const expand = document.createElement("button");
            expand.type = "button";
            expand.className = "silent-expand";
            expand.textContent = "放大";
            expand.setAttribute("aria-label", "在浮窗中放大视频");
            expand.onclick = () => openMedia(video);
            bar.append(expand);
        }
        if (video.id === "hero-video") {
            player.classList.add("hero-player", "shows-poster");
            const poster = document.createElement("img");
            poster.className = "hero-finished-poster";
            poster.src = video.poster;
            poster.alt = "3DCodeFactory";
            const center = document.createElement("button");
            center.type = "button";
            center.className = "hero-center-toggle";
            player.append(poster, center);
            syncHero = () => {
                center.textContent = isPaused() ? "▶" : "Ⅱ";
                center.setAttribute("aria-label", isPaused() ? "播放视频" : "暂停视频");
                player.classList.toggle("is-paused", isPaused());
            };
            center.onclick = () => {
                if (video.ended) video.currentTime = 0;
                toggle();
            };
            video.addEventListener("play", () => {
                if (video.currentTime < 0.1) poster.src = video.poster;
                syncHero();
            });
            video.addEventListener("waiting", syncHero);
            video.addEventListener("canplay", syncHero);
            video.addEventListener("playing", () => {
                player.classList.remove("shows-poster");
                syncHero();
            });
            video.addEventListener("pause", syncHero);
            video.addEventListener("ended", () => {
                video.pause();
                video.currentTime = 0;
                poster.src = video.dataset.endedPoster || video.poster;
                player.classList.add("shows-poster");
                syncHero();
            });
            syncHero();
            if (video.hasAttribute("autoplay")) {
                let started = false;
                video.addEventListener("playing", () => { started = true; }, { once: true });
                const startWhenReady = () => {
                    if (started || userRequestedPlayback || document.hidden) return;
                    video.play().catch(error => {
                        if (error.name === "NotAllowedError" || error.name === "NotSupportedError") {
                            autoplayPending = false;
                            update();
                        }
                    });
                };
                video.addEventListener("canplay", startWhenReady);
                document.addEventListener("visibilitychange", startWhenReady);
                startWhenReady();
            }
        }
        update();
    }
    document.querySelectorAll("video[controls]").forEach(enhanceVideo);
    new MutationObserver(records => {
        for (const record of records) {
            if (record.target instanceof Element && record.target.matches(".silent-player") && !record.target.querySelector("video")) record.target.remove();
        }
        for (const record of records) for (const node of record.addedNodes) if (node instanceof Element) {
            if (node.matches("video[controls]")) enhanceVideo(node);
            node.querySelectorAll("video[controls]").forEach(enhanceVideo);
        }
    }).observe(document.body, {
        childList: true,
        subtree: true
    });
    document.addEventListener("click", e => {
        const img = e.target.closest("img");
        if (!img || img.closest("#media-lightbox, #gallery, header, .intro, .traj-filmstrip")) return;
        if (img.closest("main figure, .task-pair, .native-task-strip, .native-bmk-wrap, .traj-player, .viewer-reference, .dataset-view-stage, #viewer-stage")) {
            e.preventDefault();
            e.stopPropagation();
            openMedia(img);
        }
    }, true);
    document.addEventListener("click", e => {
        const link = e.target.closest("a");
        if (e.defaultPrevented || !link || link.closest("#media-lightbox, #gallery, header, .intro, .traj-filmstrip")) return;
        const img = link.querySelector("img");
        if (img && link.closest("main figure, .task-pair, .native-task-strip, .native-bmk-wrap, .traj-player, .viewer-reference, .dataset-view-stage")) {
            e.preventDefault();
            openMedia(img);
        }
    });
})();
