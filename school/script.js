document.addEventListener("DOMContentLoaded", () => {
    const btnSemester1 = document.getElementById("btn-semester-1");
    const btnSemester2 = document.getElementById("btn-semester-2");
    const toggleContainer = document.querySelector(".semester-toggle-container");
    const grid1 = document.getElementById("semester-1-grid");
    const grid2 = document.getElementById("semester-2-grid");

    // Browser Storage & Cookie Helpers for Semester Preference Persistence
    function getCookie(name) {
        try {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
        } catch (e) {}
        return null;
    }

    function setCookie(name, val) {
        try {
            const hostname = window.location.hostname;
            const domainStr = hostname.endsWith('astrong.xyz') ? '; domain=.astrong.xyz' : '';
            const secureStr = window.location.protocol === 'https:' ? '; Secure' : '';
            document.cookie = `${name}=${encodeURIComponent(val)}; path=/; max-age=31536000; SameSite=Lax${secureStr}${domainStr}`;
        } catch (e) {}
    }

    function getStoredSemester() {
        const cookieVal = getCookie("school-semester-pref");
        if (cookieVal === "1" || cookieVal === "2") return cookieVal;
        try {
            const localVal = localStorage.getItem("school-semester-pref");
            if (localVal === "1" || localVal === "2") return localVal;
        } catch (e) {}
        return "1";
    }

    function saveSemester(val) {
        try {
            localStorage.setItem("school-semester-pref", val);
        } catch (e) {}
        setCookie("school-semester-pref", val);
    }

    if (btnSemester1 && btnSemester2 && toggleContainer && grid1 && grid2) {
        function applySemester(sem) {
            if (sem === "2") {
                btnSemester2.classList.add("active");
                btnSemester1.classList.remove("active");
                toggleContainer.setAttribute("data-active", "1");
                grid2.style.display = "";
                grid1.style.display = "none";
            } else {
                btnSemester1.classList.add("active");
                btnSemester2.classList.remove("active");
                toggleContainer.setAttribute("data-active", "0");
                grid1.style.display = "";
                grid2.style.display = "none";
            }
        }

        applySemester(getStoredSemester());

        btnSemester1.addEventListener("click", () => {
            if (btnSemester1.classList.contains("active")) return;
            saveSemester("1");
            applySemester("1");
        });

        btnSemester2.addEventListener("click", () => {
            if (btnSemester2.classList.contains("active")) return;
            saveSemester("2");
            applySemester("2");
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
