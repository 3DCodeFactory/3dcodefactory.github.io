(() => {
    const video = document.getElementById('hero-video');
    if (!video) return;
    const playlist = 'assets/videos/film-v12-stream/master.m3u8';
    const fallback = () => {
        video.src = 'assets/videos/project-overview-v12-web.mp4';
        if (video.autoplay) video.play().catch(() => {});
    };
    video.muted = true;
    video.defaultMuted = true;
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = playlist;
        if (video.autoplay) video.play().catch(() => {});
        return;
    }
    const script = document.createElement('script');
    script.src = 'vendor/hls.light.min.js';
    script.onload = () => {
        if (!window.Hls || !Hls.isSupported()) return fallback();
        const hls = new Hls({ startLevel: 0, maxBufferLength: 12, maxMaxBufferLength: 24 });
        hls.on(Hls.Events.ERROR, (_, data) => {
            if (!data.fatal) return;
            hls.destroy();
            fallback();
        });
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (video.autoplay) video.play().catch(() => {});
        });
        hls.loadSource(playlist);
        hls.attachMedia(video);
    };
    script.onerror = fallback;
    document.head.append(script);
})();
