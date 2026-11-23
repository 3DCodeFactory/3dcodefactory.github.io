(() => {
    for (const dialog of document.querySelectorAll("dialog.scene-detail")) {
        const reference = document.createElement("figure");
        reference.className = "viewer-reference";
        const caption = document.createElement("figcaption");
        caption.textContent = "输入参考图";
        const link = document.createElement("a");
        link.target = "_blank";
        link.rel = "noopener";
        const img = document.createElement("img");
        link.append(img);
        reference.append(caption, link);
        const sidebar = dialog.querySelector(".viewer-sidebar");
        const descBox = dialog.querySelector(".viewer-description, .dataset-case-notes");
        const drawer = dialog.querySelector("details.prompt-drawer");
        if (descBox && drawer) {
            descBox.insertBefore(reference, drawer);
        } else {
            sidebar.append(reference);
        }
        function update() {
            if (!dialog.open) return;
            const dataset = dialog.id === "dataset-viewer";
            const item = dataset ? datasetCases[selectedDataset] : scenes[selected];
            const src = dataset ? item.views.find(v => v.label.includes("参考"))?.src : `assets/${item.id}-reference.webp`;
            reference.hidden = !src;
            if (src) {
                img.src = src;
                img.alt = (item.title || item.name) + "输入参考图";
                link.href = src;
            }
        }
        new MutationObserver(update).observe(dialog, {
            attributes: true,
            attributeFilter: [ "open" ]
        });
        update();
    }
})();
