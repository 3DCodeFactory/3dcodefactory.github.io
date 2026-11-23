(() => {
    "use strict";
    const dictionary = window.SITE_EN || {};
    const normalize = value => value.replace(/\s+/g, " ").trim();
    const hasChinese = value => /[\u3400-\u9fff]/.test(value);
    const ignored = "script,style,pre,code,[data-no-i18n]";
    const attrs = [ "aria-label", "title", "alt", "placeholder" ];
    const states = new WeakMap;
    const roots = new Map;
    const frames = new WeakSet;
    const key = "3dcodefactory-lang";
    let language = "en";
    try {
        language = new URL(location.href).searchParams.get("lang") || localStorage.getItem(key) || "en";
    } catch {}
    language = language === "zh" ? "zh" : "en";
    const phraseKeys = Object.keys(dictionary).filter(k => k.length > 1).sort((a, b) => b.length - a.length);
    function translate(value) {
        const normalized = normalize(value);
        if (!hasChinese(normalized)) return value.replace(/[（）：；。，]/g, char => ({
            "（": "(",
            "）": ")",
            "：": ":",
            "；": ";",
            "。": ".",
            "，": ","
        }[char]));
        if (Object.hasOwn(dictionary, normalized)) return dictionary[normalized];
        if (/^已读取 [\d.]+ MB$/.test(normalized)) return normalized.replace("已读取", "Loaded");
        if (/^\d[\d,]* 行$/.test(normalized)) return normalized.replace("行", "lines");
        let result = normalized;
        for (const phrase of phraseKeys) if (result.includes(phrase)) result = result.split(phrase).join(dictionary[phrase]);
        return hasChinese(result) ? value : result;
    }
    function update(node, field, value, write) {
        let record = states.get(node);
        if (!record) {
            record = new Map;
            states.set(node, record);
        }
        let state = record.get(field);
        if (!state || value !== state.output) state = {
            source: value,
            output: value
        };
        let output = language === "en" ? translate(state.source) : state.source;
        if (language === "en" && field === "text" && output !== state.source && node.parentElement?.namespaceURI !== "http://www.w3.org/2000/svg") output = " " + output.trim() + " ";
        state.output = output;
        record.set(field, state);
        if (value !== output) write(output);
    }
    function process(node) {
        if (node.nodeType === 3) {
            if (node.parentElement?.closest(ignored)) return;
            update(node, "text", node.data, text => {
                node.data = text;
            });
            return;
        }
        if (node.nodeType !== 1 && node.nodeType !== 9 && node.nodeType !== 11) return;
        if (node.nodeType === 1) {
            if (node.closest("script,style,[data-no-i18n]")) return;
            for (const attr of attrs) if (node.hasAttribute(attr)) {
                update(node, attr, node.getAttribute(attr), text => node.setAttribute(attr, text));
            }
            if (node.closest("pre,code")) return;
            if (node.tagName === "IFRAME" && !frames.has(node)) {
                frames.add(node);
                const connect = () => {
                    try {
                        if (node.contentDocument?.documentElement) observe(node.contentDocument);
                    } catch {}
                };
                node.addEventListener("load", connect);
                connect();
            }
            if (node.shadowRoot) observe(node.shadowRoot);
        }
        for (const child of node.childNodes) process(child);
    }
    function observe(root) {
        if (roots.has(root)) return;
        const observer = new MutationObserver(records => {
            for (const record of records) {
                if (record.type === "childList") for (const node of record.addedNodes) process(node); else process(record.target);
            }
        });
        roots.set(root, observer);
        process(root);
        observer.observe(root, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: attrs
        });
        if (root.nodeType === 9) root.documentElement.lang = language === "en" ? "en" : "zh-CN";
    }
    const control = document.createElement("div");
    control.className = "language-switch";
    control.setAttribute("data-no-i18n", "");
    control.setAttribute("role", "group");
    control.setAttribute("aria-label", "Language / 语言");
    control.innerHTML = '<button type="button" data-lang="zh" lang="zh-CN" aria-label="切换为中文">中文</button><button type="button" data-lang="en" lang="en" aria-label="Switch to English">EN</button>';
    document.querySelector("body > header").append(control);
    function syncControl() {
        for (const button of control.querySelectorAll("button")) button.setAttribute("aria-pressed", String(button.dataset.lang === language));
    }
    function setLanguage(next) {
        language = next === "en" ? "en" : "zh";
        try {
            localStorage.setItem(key, language);
        } catch {}
        const url = new URL(location.href);
        url.searchParams.set("lang", language);
        history.replaceState(history.state, "", url);
        for (const [root, observer] of roots) {
            if (root.nodeType === 9 && root !== document && !root.defaultView?.frameElement?.isConnected) {
                observer.disconnect();
                roots.delete(root);
                continue;
            }
            process(root);
            if (root.nodeType === 9) root.documentElement.lang = language === "en" ? "en" : "zh-CN";
        }
        syncControl();
        window.dispatchEvent(new CustomEvent("languagechange", {
            detail: {
                language: language
            }
        }));
    }
    control.addEventListener("click", event => {
        const button = event.target.closest("button[data-lang]");
        if (button) setLanguage(button.dataset.lang);
    });
    window.SiteI18n = {
        setLanguage: setLanguage,
        translate: translate,
        get language() {
            return language;
        }
    };
    observe(document);
    syncControl();
})();
