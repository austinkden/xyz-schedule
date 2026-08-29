document.addEventListener("DOMContentLoaded", () => {
    const btnSemester1 = document.getElementById("btn-semester-1");
    const btnSemester2 = document.getElementById("btn-semester-2");
    const scheduleGrid = document.getElementById("schedule-grid");

    let currentSemester = 1;

    // Render Classes Grid
    function renderSchedule() {
        if (!scheduleGrid) return;
        scheduleGrid.innerHTML = "";

        const scheduleData = window.SCHOOL_SCHEDULE || {};
        const semesterKey = currentSemester === 1 ? "semester1" : "semester2";
        const classes = scheduleData[semesterKey] || [];

        classes.forEach(item => {
            const card = document.createElement("div");
            card.className = "class-card";

            card.innerHTML = `
                <div class="class-left">
                    <div class="period-badge">P${item.period}</div>
                    <div class="class-info">
                        <div class="class-name">${item.name}</div>
                        <div class="class-teacher">${item.teacher}</div>
                    </div>
                </div>
                <div class="class-room-badge">${item.room}</div>
            `;

            scheduleGrid.appendChild(card);
        });
    }

    // Semester Toggle Handlers
    if (btnSemester1 && btnSemester2) {
        btnSemester1.addEventListener("click", () => {
            if (currentSemester !== 1) {
                currentSemester = 1;
                btnSemester1.classList.add("active");
                btnSemester2.classList.remove("active");
                renderSchedule();
            }
        });

        btnSemester2.addEventListener("click", () => {
            if (currentSemester !== 2) {
                currentSemester = 2;
                btnSemester2.classList.add("active");
                btnSemester1.classList.remove("active");
                renderSchedule();
            }
        });
    }

    // Initialize Page
    renderSchedule();

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
