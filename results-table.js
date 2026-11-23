(() => {
    const results = document.getElementById("paper-results");
    if (!results) return;
    const buttons = results.querySelectorAll("[data-results-view]");
    buttons.forEach(button => button.addEventListener("click", () => {
        const view = button.dataset.resultsView;
        results.dataset.view = view;
        buttons.forEach(item => item.setAttribute("aria-pressed", String(item === button)));
        results.querySelectorAll(".paper-result-group th").forEach(cell => {
            cell.colSpan = view === "detail" ? 11 : 5;
        });
    }));
})();
