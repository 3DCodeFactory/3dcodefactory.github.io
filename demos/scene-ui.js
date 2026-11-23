(() => {
    const parts = location.pathname.split("/").filter(Boolean);
    const scene = parts[parts.lastIndexOf("demos") + 1];
    const overlays = {
        chateau: "#hud",
        newsstand: "#ui",
        "case-17": ".hud",
        "case-18": ".hud,#dock,#reset",
        "case-19": "#hud",
        "case-20": ".ui,#intro-note",
        "case-21": "#uiLayer",
        "case-22": ".ui,#focusCard,#tooltip",
        "case-23": ".hud,#diag,#reticle",
        "case-24": ".ui:not(#loader),#reticle",
        "case-25": ".hud,#tooltip,#reset-view"
    };
    const selector = overlays[scene];
    if (!selector) return;
    const targets = [ ...document.querySelectorAll(selector) ];
    targets.forEach(el => el.classList.add("showcase-overlay"));
    const style = document.createElement("style");
    style.textContent = "html.showcase-ui-hidden .showcase-overlay,html.showcase-ui-hidden .showcase-overlay *{visibility:hidden!important;pointer-events:none!important}";
    document.head.append(style);
    const host = document.createElement("div");
    host.id = "showcase-ui-toggle";
    host.style.cssText = "position:fixed!important;right:12px!important;top:12px!important;z-index:2147483647!important;pointer-events:auto!important;visibility:visible!important;";
    const shadow = host.attachShadow({
        mode: "open"
    });
    shadow.innerHTML = `<style>:host{all:initial}button{display:block;box-sizing:border-box;margin:0;padding:9px 13px;border:1px solid #c5d8df;border-radius:7px;background:rgba(255,255,255,.96);color:#174858;box-shadow:0 2px 10px #0002;font:12px/1.4 -apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;cursor:pointer;white-space:nowrap;touch-action:manipulation}button:hover{background:#eaf5f7}button:focus-visible{outline:3px solid #30a5be;outline-offset:3px}</style><button type="button" aria-pressed="false" title="收起场景标题、提示与操作面板">隐藏界面</button>`;
    document.body.append(host);
    const button = shadow.querySelector("button");
    let hidden = false;
    const originalInert = new Map(targets.map(el => [ el, el.inert ]));
    const displays = new Map(targets.map(el => [ el, [ el.style.getPropertyValue("display"), el.style.getPropertyPriority("display") ] ]));
    button.addEventListener("click", event => {
        event.stopPropagation();
        hidden = !hidden;
        document.documentElement.classList.toggle("showcase-ui-hidden", hidden);
        targets.forEach(el => {
            el.inert = hidden || originalInert.get(el);
            if (hidden) el.style.setProperty("display", "none", "important"); else {
                const [value, priority] = displays.get(el);
                if (value) el.style.setProperty("display", value, priority); else el.style.removeProperty("display");
            }
        });
        button.textContent = hidden ? "显示界面" : "隐藏界面";
        button.setAttribute("aria-pressed", String(hidden));
        button.title = hidden ? "恢复场景标题、提示与操作面板" : "收起场景标题、提示与操作面板";
    });
})();
