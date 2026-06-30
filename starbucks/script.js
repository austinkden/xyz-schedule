document.addEventListener("DOMContentLoaded", () => {
    const prevMonthBtn = document.getElementById("prev-month");
    const nextMonthBtn = document.getElementById("next-month");
    const currentMonthYearHeader = document.getElementById("current-month-year");
    const btnViewMonth = document.getElementById("btn-view-month");
    const btnViewAgenda = document.getElementById("btn-view-agenda");
    const monthViewContainer = document.getElementById("month-view-container");
    const agendaViewContainer = document.getElementById("agenda-view-container");
    const settingsToggle = document.getElementById("settings-toggle");
    const settingsTray = document.getElementById("settings-tray");
    const btnFormat12h = document.getElementById("btn-format-12h");
    const btnFormat24h = document.getElementById("btn-format-24h");
    const btnWeekSun = document.getElementById("btn-week-sun");
    const btnWeekMon = document.getElementById("btn-week-mon");
    const btnAdjacentOn = document.getElementById("btn-adjacent-on");
    const btnAdjacentOff = document.getElementById("btn-adjacent-off");

    const calendarDaysGrid = document.getElementById("calendar-days");
    const agendaListContainer = document.getElementById("agenda-list");
    const weekdaysHeader = document.getElementById("weekdays-header");
    const monthSummaryEl = document.getElementById("month-summary");
    const calendarCard = document.querySelector(".calendar-card");
    const detailsPlaceholder = document.getElementById("details-placeholder");
    const detailsContent = document.getElementById("details-content");
    const detailsDate = document.getElementById("details-date");
    const detailsCountdown = document.getElementById("details-countdown");
    const detailsTime = document.getElementById("details-time");
    const detailsDuration = document.getElementById("details-duration");
    const detailsNotes = document.getElementById("details-notes");
    const detailsNotesRow = document.getElementById("details-notes-row");

    let currentDate = new Date();
    let selectedDateStr = null;
    let currentView = "month";
    let timeFormat = localStorage.getItem("time-format-pref") || "12h";
    let weekStart = localStorage.getItem("week-start-pref") || "sun";
    let showAdjacentDays = localStorage.getItem("show-adjacent-pref") !== "false";


    const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const labelsSun = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const labelsMon = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

    function pad(n) { return String(n).padStart(2, "0"); }
    function formatDateKey(y, m, d) { return `${y}-${pad(m+1)}-${pad(d)}`; }

    function parseTimeToMinutes(t) {
        if (!t) return 0;
        const p = t.trim().split(/\s+/);
        if (p.length < 2) return 0;
        const sp = p[0].split(":");
        let h = parseInt(sp[0], 10);
        const m = parseInt(sp[1] || "0", 10);
        const ap = p[1].toUpperCase();
        if (ap === "PM" && h < 12) h += 12;
        else if (ap === "AM" && h === 12) h = 0;
        return h * 60 + m;
    }

    function calculateDuration(s, e) {
        let d = parseTimeToMinutes(e) - parseTimeToMinutes(s);
        if (d < 0) d += 1440;
        const h = Math.floor(d / 60), m = d % 60;
        const parts = [];
        if (h > 0) parts.push(`${h}h`);
        if (m > 0) parts.push(`${m}m`);
        return parts.length ? parts.join(" ") : "0m";
    }

    function formatLongDate(dateStr) {
        const p = dateStr.split("-");
        return new Date(Date.UTC(p[0], p[1]-1, p[2])).toLocaleDateString("en-US", {weekday:"long",month:"long",day:"numeric",year:"numeric",timeZone:"UTC"});
    }

    function formatTime(t, is24h) {
        if (!t) return "";
        const p = t.trim().split(/\s+/);
        if (p.length < 2) return t;
        if (is24h) {
            const sp = p[0].split(":");
            let h = parseInt(sp[0], 10);
            const m = sp[1] || "00";
            const ap = p[1].toUpperCase();
            if (ap === "PM" && h < 12) h += 12;
            if (ap === "AM" && h === 12) h = 0;
            return `${pad(h)}:${m}`;
        }
        return t.trim();
    }

    function formatShortTime(t, is24h) {
        if (!t) return "";
        const p = t.trim().split(/\s+/);
        if (p.length < 2) return t;
        const sp = p[0].split(":");
        let h = parseInt(sp[0], 10);
        const m = parseInt(sp[1] || "0", 10);
        const ap = p[1].toUpperCase();
        if (is24h) {
            let h24 = h;
            if (ap === "PM" && h < 12) h24 += 12;
            if (ap === "AM" && h === 12) h24 = 0;
            return `${pad(h24)}:${pad(m)}`;
        }
        return `${m > 0 ? h+":"+pad(m) : h}${ap === "PM" ? "p" : "a"}`;
    }

    function getShiftCountdown(dateStr) {
        const p = dateStr.split("-");
        const shift = new Date(Date.UTC(+p[0], +p[1]-1, +p[2]));
        const now = new Date();
        const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        const diff = Math.round((shift - today) / 86400000);
        if (diff === 0)  return { text: "Today",     type: "today"  };
        if (diff === 1)  return { text: "Tomorrow",  type: "soon"   };
        if (diff > 1)    return { text: `in ${diff} days`, type: "future" };
        if (diff === -1) return { text: "Yesterday", type: "past"   };
        return { text: `${Math.abs(diff)} days ago`, type: "past" };
    }

    function renderWeekdayHeader() {
        if (!weekdaysHeader) return;
        const labels = weekStart === "mon" ? labelsMon : labelsSun;
        weekdaysHeader.innerHTML = labels.map(d => `<div>${d}</div>`).join("");
    }

    function renderMonthSummary() {
        if (!monthSummaryEl) return;
        const y = currentDate.getFullYear(), mo = currentDate.getMonth();
        const total = new Date(y, mo+1, 0).getDate();
        const sched = window.STARBUCKS_SCHEDULE || {};
        let count = 0, mins = 0;
        for (let d = 1; d <= total; d++) {
            const shift = sched[formatDateKey(y, mo, d)];
            if (shift) {
                count++;
                let diff = parseTimeToMinutes(shift.end) - parseTimeToMinutes(shift.start);
                if (diff < 0) diff += 1440;
                mins += diff;
            }
        }
        if (count === 0) {
            monthSummaryEl.textContent = "No shifts this month";
        } else {
            const h = Math.floor(mins/60), m = mins%60;
            monthSummaryEl.textContent = `${count} shift${count !== 1 ? "s" : ""} \u00b7 ${m > 0 ? h+"h "+m+"m" : h+"h"} total`;
        }
    }

    function showShiftDetails(dateStr) {
        selectedDateStr = dateStr;
        document.querySelectorAll(".day-cell").forEach(c => c.classList.toggle("selected", c.dataset.date === dateStr));
        document.querySelectorAll(".agenda-item").forEach(r => r.classList.toggle("selected", r.dataset.date === dateStr));

        const shift = (window.STARBUCKS_SCHEDULE || {})[dateStr];
        const is24h = timeFormat === "24h";

        if (shift) {
            detailsPlaceholder.classList.add("hidden");
            detailsContent.classList.remove("hidden");
            detailsDate.textContent = formatLongDate(dateStr);
            detailsTime.textContent = `${formatTime(shift.start, is24h)} \u2013 ${formatTime(shift.end, is24h)}`;
            detailsDuration.textContent = `(${calculateDuration(shift.start, shift.end)})`;
            if (detailsCountdown) {
                const c = getShiftCountdown(dateStr);
                detailsCountdown.textContent = c.text;
                detailsCountdown.className = `countdown-badge countdown-${c.type}`;
            }
            if (shift.notes) { detailsNotes.textContent = shift.notes; detailsNotesRow.style.display = "flex"; }
            else { detailsNotesRow.style.display = "none"; }
        } else {
            detailsPlaceholder.classList.remove("hidden");
            detailsContent.classList.add("hidden");
            if (detailsCountdown) { detailsCountdown.textContent = ""; detailsCountdown.className = "countdown-badge"; }
        }
    }

    function createDayCell(dayNum, dateStr, isAdj, isToday, is24h) {
        const cell = document.createElement("div");
        cell.className = "day-cell";
        cell.dataset.date = dateStr;
        if (isAdj)   cell.classList.add("adjacent-month");
        if (isToday) cell.classList.add("today");
        const shift = (window.STARBUCKS_SCHEDULE || {})[dateStr];
        if (shift) cell.classList.add("has-shift");
        const num = document.createElement("span");
        num.className = "day-number";
        num.textContent = dayNum;
        cell.appendChild(num);
        if (shift) {
            const tag = document.createElement("span");
            tag.className = "shift-tag";
            tag.textContent = `${formatShortTime(shift.start, is24h)}-${formatShortTime(shift.end, is24h)}`;
            cell.appendChild(tag);
        }
        cell.addEventListener("click", () => showShiftDetails(dateStr));
        return cell;
    }

    function renderMonthGrid() {
        calendarDaysGrid.innerHTML = "";
        const y = currentDate.getFullYear(), mo = currentDate.getMonth();
        const is24h = timeFormat === "24h";
        const offset = weekStart === "mon" ? 1 : 0;
        const firstDayIdx = (new Date(y, mo, 1).getDay() - offset + 7) % 7;
        const totalDays = new Date(y, mo+1, 0).getDate();
        const prevTotal = new Date(y, mo, 0).getDate();
        const now = new Date();
        const todayStr = formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());

        for (let i = firstDayIdx; i > 0; i--) {
            const dn = prevTotal - i + 1;
            const pm = mo === 0 ? 11 : mo-1, py = mo === 0 ? y-1 : y;
            if (showAdjacentDays) calendarDaysGrid.appendChild(createDayCell(dn, formatDateKey(py, pm, dn), true, false, is24h));
            else { const s = document.createElement("div"); s.className = "day-cell-spacer"; calendarDaysGrid.appendChild(s); }
        }
        for (let d = 1; d <= totalDays; d++) {
            const ds = formatDateKey(y, mo, d);
            calendarDaysGrid.appendChild(createDayCell(d, ds, false, ds === todayStr, is24h));
        }
        const nextPad = (7 - ((firstDayIdx + totalDays) % 7)) % 7;
        for (let i = 1; i <= nextPad; i++) {
            const nm = mo === 11 ? 0 : mo+1, ny = mo === 11 ? y+1 : y;
            if (showAdjacentDays) calendarDaysGrid.appendChild(createDayCell(i, formatDateKey(ny, nm, i), true, false, is24h));
            else { const s = document.createElement("div"); s.className = "day-cell-spacer"; calendarDaysGrid.appendChild(s); }
        }
        if (selectedDateStr) {
            const cell = calendarDaysGrid.querySelector(`.day-cell[data-date="${selectedDateStr}"]`);
            if (cell) cell.classList.add("selected");
        }
    }

    function renderAgendaList() {
        agendaListContainer.innerHTML = "";
        const y = currentDate.getFullYear(), mo = currentDate.getMonth();
        const totalDays = new Date(y, mo+1, 0).getDate();
        const sched = window.STARBUCKS_SCHEDULE || {};
        const is24h = timeFormat === "24h";
        let count = 0;

        for (let d = 1; d <= totalDays; d++) {
            const dateStr = formatDateKey(y, mo, d);
            const shift = sched[dateStr];
            if (!shift) continue;
            count++;
            const item = document.createElement("div");
            item.className = "agenda-item";
            item.dataset.date = dateStr;
            if (selectedDateStr === dateStr) item.classList.add("selected");

            const p = dateStr.split("-");
            const dObj = new Date(Date.UTC(p[0], p[1]-1, p[2]));
            const dateInfo = document.createElement("div");
            dateInfo.className = "agenda-date-info";
            const wdEl = document.createElement("span"); wdEl.className = "agenda-weekday";
            wdEl.textContent = dObj.toLocaleDateString("en-US", {weekday:"short",timeZone:"UTC"});
            const dayEl = document.createElement("span"); dayEl.className = "agenda-day";
            dayEl.textContent = dObj.toLocaleDateString("en-US", {month:"short",day:"numeric",timeZone:"UTC"});
            dateInfo.appendChild(wdEl); dateInfo.appendChild(dayEl);
            item.appendChild(dateInfo);

            const si = document.createElement("div"); si.className = "agenda-shift-info";
            const tEl = document.createElement("div"); tEl.className = "agenda-time";
            tEl.textContent = `${formatTime(shift.start, is24h)} \u2013 ${formatTime(shift.end, is24h)}`;
            const durEl = document.createElement("span"); durEl.className = "agenda-duration";
            durEl.textContent = calculateDuration(shift.start, shift.end);
            tEl.appendChild(durEl);
            const nEl = document.createElement("div"); nEl.className = "agenda-notes";
            nEl.textContent = shift.notes || "Shift";
            si.appendChild(tEl); si.appendChild(nEl);
            item.appendChild(si);

            const c = getShiftCountdown(dateStr);
            const cEl = document.createElement("span");
            cEl.className = `countdown-badge countdown-${c.type}`;
            cEl.textContent = c.text;
            item.appendChild(cEl);

            item.addEventListener("click", () => showShiftDetails(dateStr));
            agendaListContainer.appendChild(item);
        }

        if (count === 0) {
            const empty = document.createElement("div");
            empty.className = "agenda-empty";
            empty.textContent = "No shifts scheduled for this month.";
            agendaListContainer.appendChild(empty);
        }
    }

    function renderAll() {
        currentMonthYearHeader.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        renderWeekdayHeader();
        renderMonthSummary();
        if (currentView === "month") {
            monthViewContainer.classList.remove("hidden");
            agendaViewContainer.classList.add("hidden");
            renderMonthGrid();
        } else {
            monthViewContainer.classList.add("hidden");
            agendaViewContainer.classList.remove("hidden");
            renderAgendaList();
        }
        if (selectedDateStr) showShiftDetails(selectedDateStr);
    }

    function setTimeFormat(f) {
        timeFormat = f; localStorage.setItem("time-format-pref", f);
        btnFormat12h.classList.toggle("active", f === "12h");
        btnFormat24h.classList.toggle("active", f === "24h");
        renderAll();
    }
    function setWeekStart(v) {
        weekStart = v; localStorage.setItem("week-start-pref", v);
        btnWeekSun.classList.toggle("active", v === "sun");
        btnWeekMon.classList.toggle("active", v === "mon");
        renderAll();
    }
    function setAdjacentDays(v) {
        showAdjacentDays = v; localStorage.setItem("show-adjacent-pref", String(v));
        btnAdjacentOn.classList.toggle("active", v);
        btnAdjacentOff.classList.toggle("active", !v);
        renderAll();
    }

    function setView(view) {
        currentView = view;
        btnViewMonth.classList.toggle("active", view === "month");
        btnViewAgenda.classList.toggle("active", view === "agenda");
        renderAll();
    }

    prevMonthBtn.addEventListener("click", () => { currentDate.setMonth(currentDate.getMonth()-1); renderAll(); });
    nextMonthBtn.addEventListener("click", () => { currentDate.setMonth(currentDate.getMonth()+1); renderAll(); });
    currentMonthYearHeader.addEventListener("click", () => {
        const now = new Date();
        currentDate = new Date(now.getFullYear(), now.getMonth(), 1);
        renderAll();
        showShiftDetails(formatDateKey(now.getFullYear(), now.getMonth(), now.getDate()));
    });
    document.addEventListener("keydown", (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
        if (e.key === "ArrowLeft")  { e.preventDefault(); currentDate.setMonth(currentDate.getMonth()-1); renderAll(); }
        else if (e.key === "ArrowRight") { e.preventDefault(); currentDate.setMonth(currentDate.getMonth()+1); renderAll(); }
        else if (e.key === "t" || e.key === "T") {
            const now = new Date();
            currentDate = new Date(now.getFullYear(), now.getMonth(), 1);
            renderAll();
            showShiftDetails(formatDateKey(now.getFullYear(), now.getMonth(), now.getDate()));
        }
    });
    btnViewMonth.addEventListener("click", () => setView("month"));
    btnViewAgenda.addEventListener("click", () => setView("agenda"));
    settingsToggle.addEventListener("click", () => {
        settingsTray.classList.toggle("hidden");
        settingsToggle.classList.toggle("active");
    });
    btnFormat12h.addEventListener("click", () => setTimeFormat("12h"));
    btnFormat24h.addEventListener("click", () => setTimeFormat("24h"));
    btnWeekSun.addEventListener("click", () => setWeekStart("sun"));
    btnWeekMon.addEventListener("click", () => setWeekStart("mon"));
    btnAdjacentOn.addEventListener("click", () => setAdjacentDays(true));
    btnAdjacentOff.addEventListener("click", () => setAdjacentDays(false));


    // Init UI state from localStorage (single render)
    btnFormat12h.classList.toggle("active", timeFormat === "12h");
    btnFormat24h.classList.toggle("active", timeFormat === "24h");
    btnWeekSun.classList.toggle("active", weekStart === "sun");
    btnWeekMon.classList.toggle("active", weekStart === "mon");
    btnAdjacentOn.classList.toggle("active", showAdjacentDays);
    btnAdjacentOff.classList.toggle("active", !showAdjacentDays);

    renderAll();

    // Default selection
    const now2 = new Date();
    const todayStr2 = formatDateKey(now2.getFullYear(), now2.getMonth(), now2.getDate());
    const sched2 = window.STARBUCKS_SCHEDULE || {};
    if (sched2[todayStr2]) {
        showShiftDetails(todayStr2);
    } else {
        const y2 = currentDate.getFullYear(), mo2 = currentDate.getMonth();
        let first = null;
        for (let d = 1; d <= 31; d++) { const s = formatDateKey(y2, mo2, d); if (sched2[s]) { first = s; break; } }
        showShiftDetails(first || todayStr2);
    }
});
