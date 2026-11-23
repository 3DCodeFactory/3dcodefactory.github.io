(() => {
    function cleanDisplayPrompt(raw) {
        return (raw || "").replace(/\n*(详细尺寸、材质|尺度、开间节奏|交付可编辑的\s*\.blend|技术要求：使用纯\s*Three\.js|完成后请从实际三维|完成后从实际三维).*$/s, "").replace(/\n*(Exact dimensions|Detailed dimensions|Work to the dimensions|Deliver an editable|After modeling|When (it's |it’s )?finished|Once it’s done|For final delivery).*$/is, "").trim();
    }
    function tidyDialog(dialog) {
        if (!dialog.open) return;
        const raw = dialog.querySelector("#task-original, #dataset-case-description");
        if (!raw) return;
        const drawer = raw.closest("details");
        if (drawer) drawer.open = false;
        const type = dialog.querySelector("#viewer-type, #dataset-case-type");
        if (type) type.textContent = type.textContent.replace(/\s*[·/]\s*/g, "　").replace(/单向运镜视频|模型与渲染/g, "").trim();
    }
    for (const id of [ "viewer", "dataset-viewer" ]) {
        const dialog = document.getElementById(id);
        new MutationObserver(() => tidyDialog(dialog)).observe(dialog, {
            attributes: true,
            attributeFilter: [ "open" ]
        });
        tidyDialog(dialog);
    }
    const caption = document.querySelector("#code figcaption");
    function tidyCaption() {
        const text = caption.textContent;
        if (text.includes(" · ")) caption.textContent = text.trim().replace(" · Three.js", "（Three.js 实时渲染）");
    }
    new MutationObserver(tidyCaption).observe(caption, {
        childList: true,
        characterData: true,
        subtree: true
    });
    tidyCaption();
})();
