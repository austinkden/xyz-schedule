document.addEventListener("DOMContentLoaded", () => {
    const authOverlay = document.getElementById("auth-modal-overlay");
    const authForm = document.getElementById("auth-form");
    const authInput = document.getElementById("auth-input");
    const authError = document.getElementById("auth-error");

    const btnSemester1 = document.getElementById("btn-semester-1");
    const btnSemester2 = document.getElementById("btn-semester-2");
    const scheduleGrid = document.getElementById("schedule-grid");

    let currentSemester = 1;

    // Cookie Utilities
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    function setCookie(name, value, days) {
        const d = new Date();
        d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = `expires=${d.toUTCString()}`;
        document.cookie = `${name}=${value}; ${expires}; path=/; SameSite=Lax`;
    }

    // Client-side School Authentication Check
    function checkSchoolVerification() {
        const isVerified = getCookie("school_verified") === "true";
        if (isVerified) {
            if (authOverlay) {
                authOverlay.classList.add("hidden");
            }
        } else {
            if (authOverlay) {
                authOverlay.classList.remove("hidden");
                setTimeout(() => authInput && authInput.focus(), 100);
            }
        }
    }

    function isValidSchoolName(input) {
        if (!input) return false;
        const normalized = input.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
        const validAliases = [
            "mountainvistahighschool",
            "mountainvista",
            "mvhs",
            "mountainvistahs"
        ];
        return validAliases.includes(normalized);
    }

    if (authForm) {
        authForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const val = authInput ? authInput.value : "";
            if (isValidSchoolName(val)) {
                setCookie("school_verified", "true", 365);
                if (authError) authError.style.display = "none";
                if (authOverlay) authOverlay.classList.add("hidden");
                renderSchedule();
            } else {
                if (authError) {
                    authError.textContent = "Incorrect school name. Please try again.";
                    authError.style.display = "block";
                }
            }
        });
    }

    // Render Classes Grid
    function renderSchedule() {
        if (!scheduleGrid) return;
        scheduleGrid.innerHTML = "";

        const isVerified = getCookie("school_verified") === "true";
        const scheduleData = window.SCHOOL_SCHEDULE || {};
        const semesterKey = currentSemester === 1 ? "semester1" : "semester2";
        const realClasses = scheduleData[semesterKey] || [];

        const placeholderClasses = [
            { period: 1, name: "Class Name 1", teacher: "Teacher Name", room: "Room 101" },
            { period: 2, name: "Class Name 2", teacher: "Teacher Name", room: "Room 102" },
            { period: 3, name: "Class Name 3", teacher: "Teacher Name", room: "Room 103" },
            { period: 4, name: "Class Name 4", teacher: "Teacher Name", room: "Room 104" },
            { period: 5, name: "Class Name 5", teacher: "Teacher Name", room: "Room 105" },
            { period: 6, name: "Class Name 6", teacher: "Teacher Name", room: "Room 106" },
            { period: 7, name: "Class Name 7", teacher: "Teacher Name", room: "Room 107" }
        ];

        const classes = isVerified ? realClasses : placeholderClasses;

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
    checkSchoolVerification();
    renderSchedule();
});
