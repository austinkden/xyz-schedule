document.addEventListener("DOMContentLoaded", () => {
    const btnSemester1 = document.getElementById("btn-semester-1");
    const btnSemester2 = document.getElementById("btn-semester-2");
    const toggleContainer = document.querySelector(".semester-toggle-container");
    const grid1 = document.getElementById("semester-1-grid");
    const grid2 = document.getElementById("semester-2-grid");

    if (btnSemester1 && btnSemester2 && toggleContainer && grid1 && grid2) {
        toggleContainer.setAttribute("data-active", "0");

        btnSemester1.addEventListener("click", () => {
            if (btnSemester1.classList.contains("active")) return;
            btnSemester1.classList.add("active");
            btnSemester2.classList.remove("active");
            toggleContainer.setAttribute("data-active", "0");

            grid1.style.display = "";
            grid2.style.display = "none";
        });

        btnSemester2.addEventListener("click", () => {
            if (btnSemester2.classList.contains("active")) return;
            btnSemester2.classList.add("active");
            btnSemester1.classList.remove("active");
            toggleContainer.setAttribute("data-active", "1");

            grid2.style.display = "";
            grid1.style.display = "none";
        });
    }

    // Remove loading screen
    window.__ASTRONG_SCHEDULE_READY__ = true;
    window.dispatchEvent(new Event("astrong-schedule-ready"));
    const loader = document.getElementById('astrong-loading-screen');
    if (loader) {
        loader.classList.add('fade-out');
        setTimeout(() => {
            if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
        }, 300);
    }
});
