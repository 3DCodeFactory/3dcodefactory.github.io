(() => {
    document.querySelectorAll(".case-switch").forEach(nav => {
        const buttons = [ ...nav.querySelectorAll('[role="tab"]') ];
        const panels = buttons.map(button => document.getElementById(button.getAttribute("aria-controls")));
        function select(index, focus = false) {
            buttons.forEach((button, i) => {
                const selected = i === index;
                button.setAttribute("aria-selected", String(selected));
                button.tabIndex = selected ? 0 : -1;
                panels[i].hidden = !selected;
            });
            panels[index].parentElement.scrollTop = 0;
            if (focus) buttons[index].focus();
        }
        buttons.forEach((button, i) => {
            button.onclick = () => select(i);
            button.onkeydown = event => {
                const index = {
                    ArrowRight: (i + 1) % buttons.length,
                    ArrowLeft: (i + buttons.length - 1) % buttons.length,
                    Home: 0,
                    End: buttons.length - 1
                }[event.key];
                if (index === undefined) return;
                event.preventDefault();
                select(index, true);
            };
        });
    });
})();
