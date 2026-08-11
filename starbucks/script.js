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

    function parseTimeString(t) {
        if (!t) return { h: 0, m: 0 };
        const p = t.trim().split(/\s+/);
        const sp = p[0].split(":");
        let h = parseInt(sp[0], 10);
        const m = parseInt(sp[1] || "0", 10);
        if (p.length >= 2) {
            const ap = p[1].toUpperCase();
            if (ap === "PM" && h < 12) h += 12;
            else if (ap === "AM" && h === 12) h = 0;
        }
        return { h, m };
    }

    function parseTimeToMinutes(t) {
        const { h, m } = parseTimeString(t);
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
        const { h, m } = parseTimeString(t);
        if (is24h) {
            return `${pad(h)}:${pad(m)}`;
        }
        const ap = h >= 12 ? "PM" : "AM";
        let h12 = h % 12;
        if (h12 === 0) h12 = 12;
        return `${pad(h12)}:${pad(m)} ${ap}`;
    }

    function formatShortTime(t, is24h) {
        if (!t) return "";
        const { h, m } = parseTimeString(t);
        if (is24h) {
            return `${pad(h)}:${pad(m)}`;
        }
        const ap = h >= 12 ? "p" : "a";
        let h12 = h % 12;
        if (h12 === 0) h12 = 12;
        return `${h12}:${pad(m)}${ap}`;
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
            const fullText = `${formatShortTime(shift.start, is24h)}-${formatShortTime(shift.end, is24h)}`;
            const startText = formatShortTime(shift.start, is24h);
            tag.textContent = fullText;
            tag.dataset.fullText = fullText;
            tag.dataset.startText = startText;
            cell.appendChild(tag);
        }
        cell.addEventListener("click", () => showShiftDetails(dateStr));
        return cell;
    }

    function adjustShiftTags() {
        if (currentView !== "month") return;
        const tags = document.querySelectorAll(".shift-tag");
        tags.forEach(tag => {
            tag.textContent = tag.dataset.fullText;
            const containerWidth = tag.getBoundingClientRect().width;
            
            // Temporarily disable text-truncation style properties to measure true text size
            tag.style.overflow = "visible";
            tag.style.textOverflow = "clip";
            tag.style.whiteSpace = "nowrap";
            tag.style.width = "auto";
            tag.style.display = "inline-block";
            
            const textWidth = tag.getBoundingClientRect().width;
            
            // Restore styles
            tag.style.overflow = "";
            tag.style.textOverflow = "";
            tag.style.whiteSpace = "";
            tag.style.width = "";
            tag.style.display = "";
            
            if (textWidth > containerWidth + 0.1) {
                tag.textContent = tag.dataset.startText;
            }
        });
    }

    window.addEventListener("resize", adjustShiftTags);

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
            adjustShiftTags();
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

    prevMonthBtn.addEventListener("click", () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderAll();
        syncCalendarShifts(currentDate);
    });
    nextMonthBtn.addEventListener("click", () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderAll();
        syncCalendarShifts(currentDate);
    });
    currentMonthYearHeader.addEventListener("click", () => {
        const now = new Date();
        currentDate = new Date(now.getFullYear(), now.getMonth(), 1);
        renderAll();
        showShiftDetails(formatDateKey(now.getFullYear(), now.getMonth(), now.getDate()));
        syncCalendarShifts(currentDate);
    });
    document.addEventListener("keydown", (e) => {
        if (e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return;
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
        if (e.key === "ArrowLeft") {
            e.preventDefault();
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderAll();
            syncCalendarShifts(currentDate);
        } else if (e.key === "ArrowRight") {
            e.preventDefault();
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderAll();
            syncCalendarShifts(currentDate);
        } else if (e.key === "t" || e.key === "T") {
            const now = new Date();
            currentDate = new Date(now.getFullYear(), now.getMonth(), 1);
            renderAll();
            showShiftDetails(formatDateKey(now.getFullYear(), now.getMonth(), now.getDate()));
            syncCalendarShifts(currentDate);
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
    showShiftDetails(todayStr2);

    // Automatic Google Calendar Sync (for any event named "Starbucks Shift")
    const CALENDAR_ID = "dolphin.kden@gmail.com";
    const API_KEY = "AIzaSyBIwrZ7LnEPCEGs5CM_Pq61YtGZ3jHVQHY";
    const CACHE_KEY = "starbucks_schedule_cache_v2";

    function notifyScheduleReady() {
        window.__ASTRONG_SCHEDULE_READY__ = true;
        window.dispatchEvent(new Event("astrong-schedule-ready"));
    }

    // Try loading cache immediately for instant sub-millisecond render
    try {
        const cachedRaw = localStorage.getItem(CACHE_KEY);
        if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            if (cached && cached.data && Object.keys(cached.data).length > 0) {
                window.STARBUCKS_SCHEDULE = Object.assign({}, window.STARBUCKS_SCHEDULE, cached.data);
                renderAll();
                if (selectedDateStr) showShiftDetails(selectedDateStr);
                notifyScheduleReady();
            }
        }
    } catch (e) {
        console.warn("[Starbucks Schedule] Cache load error", e);
    }

    function parseIcsDateString(clean) {
        if (!clean) return "";
        clean = clean.trim();
        if (clean.length === 8) {
            return `${clean.substr(0,4)}-${clean.substr(4,2)}-${clean.substr(6,2)}`;
        }
        if (clean.includes("T")) {
            const y = clean.substr(0, 4), m = clean.substr(4, 2), d = clean.substr(6, 2);
            const hh = clean.substr(9, 2), mm = clean.substr(11, 2), ss = clean.substr(13, 2);
            return clean.endsWith("Z") ? `${y}-${m}-${d}T${hh}:${mm}:${ss}Z` : `${y}-${m}-${d}T${hh}:${mm}:${ss}`;
        }
        return clean;
    }

    function parseIcsText(icsText) {
        const events = [];
        const vevents = icsText.split("BEGIN:VEVENT");
        for (let i = 1; i < vevents.length; i++) {
            const block = vevents[i].split("END:VEVENT")[0];
            const lines = block.split(/\r?\n/);
            let summary = "", description = "", dtstart = "", dtend = "", status = "confirmed";
            for (let j = 0; j < lines.length; j++) {
                let line = lines[j];
                while (j + 1 < lines.length && (lines[j + 1].startsWith(" ") || lines[j + 1].startsWith("\t"))) {
                    line += lines[j + 1].substring(1);
                    j++;
                }
                if (line.startsWith("SUMMARY:")) summary = line.substring(8).trim();
                else if (line.startsWith("DESCRIPTION:")) description = line.substring(12).trim().replace(/\\n/g, "\n").replace(/\\,/g, ",");
                else if (line.startsWith("DTSTART")) {
                    const idx = line.indexOf(":");
                    if (idx !== -1) dtstart = parseIcsDateString(line.substring(idx + 1));
                } else if (line.startsWith("DTEND")) {
                    const idx = line.indexOf(":");
                    if (idx !== -1) dtend = parseIcsDateString(line.substring(idx + 1));
                } else if (line.startsWith("STATUS:")) status = line.substring(7).trim().toLowerCase();
            }
            if (dtstart && dtend) {
                events.push({
                    summary,
                    description,
                    status,
                    start: dtstart.length === 10 ? { date: dtstart } : { dateTime: dtstart },
                    end: dtend.length === 10 ? { date: dtend } : { dateTime: dtend }
                });
            }
        }
        return events;
    }

    const fetchedMonths = new Set();
    let activeSyncPromise = null;

    async function syncCalendarShifts(targetDate = currentDate) {
        const baseDate = targetDate || currentDate || new Date();
        const targetY = baseDate.getFullYear();
        const targetM = baseDate.getMonth();
        const monthKey = `${targetY}-${targetM}`;

        if (fetchedMonths.has(monthKey)) {
            notifyScheduleReady();
            return;
        }

        let items = null;

        // 1. High-speed Google Calendar REST API Query with pagination & maxResults=2500
        try {
            const timeMin = new Date(targetY, targetM - 2, 1).toISOString();
            const timeMax = new Date(targetY, targetM + 6, 1).toISOString();

            let pageToken = "";
            let allItems = [];
            do {
                let restUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?key=${API_KEY}&singleEvents=true&maxResults=2500&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&orderBy=startTime`;
                if (pageToken) {
                    restUrl += `&pageToken=${encodeURIComponent(pageToken)}`;
                }
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3500);

                const res = await fetch(restUrl, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (res.ok) {
                    const data = await res.json();
                    if (data.items && Array.isArray(data.items)) {
                        allItems.push(...data.items);
                    }
                    pageToken = data.nextPageToken || "";
                } else {
                    break;
                }
            } while (pageToken);

            if (allItems.length > 0) {
                items = allItems;
            }
        } catch (err) {
            console.warn("[Starbucks Schedule] Google Calendar REST API fast fetch skipped/failed:", err);
        }

        // 2. Serverless proxy fallback
        if (!items) {
            try {
                const res = await fetch(`/api/calendar?calendarId=${encodeURIComponent(CALENDAR_ID)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.items && Array.isArray(data.items)) {
                        items = data.items;
                    }
                }
            } catch (err) {
                console.warn("[Starbucks Schedule] /api/calendar serverless proxy unavailable:", err);
            }
        }

        // 3. Direct iCal CORS proxy fallback
        if (!items) {
            try {
                const icsUrl = `https://calendar.google.com/calendar/ical/${encodeURIComponent(CALENDAR_ID)}/public/basic.ics`;
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(icsUrl)}`;
                const res = await fetch(proxyUrl);
                if (res.ok) {
                    const icsText = await res.text();
                    items = parseIcsText(icsText);
                }
            } catch (err) {
                console.warn("[Starbucks Schedule] Direct iCal fetch failed:", err);
            }
        }

        if (!items || items.length === 0) {
            notifyScheduleReady();
            return;
        }

        const liveSchedule = {};
        const pad = (n) => String(n).padStart(2, "0");

        for (const item of items) {
            if (item.status === "cancelled") continue;

            const summary = (item.summary || "").trim();
            const summaryLower = summary.toLowerCase();

            // Match any event named "Starbucks Shift" or containing "starbucks shift" / "starbucks"
            if (!summaryLower.includes("starbucks shift") && !summaryLower.includes("starbucks")) {
                continue;
            }

            let startObj, endObj;
            if (item.start && item.start.dateTime) {
                startObj = new Date(item.start.dateTime);
                endObj = new Date(item.end.dateTime);
            } else if (item.start && item.start.date) {
                const [sy, sm, sd] = item.start.date.split("-").map(Number);
                const [ey, em, ed] = item.end.date.split("-").map(Number);
                startObj = new Date(sy, sm - 1, sd, 0, 0, 0);
                endObj = new Date(ey, em - 1, ed, 0, 0, 0);
            } else {
                continue;
            }

            if (isNaN(startObj.getTime()) || isNaN(endObj.getTime())) continue;

            const dateKey = `${startObj.getFullYear()}-${pad(startObj.getMonth() + 1)}-${pad(startObj.getDate())}`;
            const startTime = `${pad(startObj.getHours())}:${pad(startObj.getMinutes())}`;
            const endTime = `${pad(endObj.getHours())}:${pad(endObj.getMinutes())}`;

            let notes = item.description || "";
            if (!notes) {
                const cleaned = summary.replace(/starbucks\s*shift/i, "").replace(/starbucks/i, "").trim();
                if (cleaned.startsWith("-") || cleaned.startsWith(":") || cleaned.startsWith("–")) {
                    notes = cleaned.substring(1).trim();
                } else if (cleaned) {
                    notes = cleaned;
                }
            }

            liveSchedule[dateKey] = {
                start: startTime,
                end: endTime,
                notes: notes
            };
        }

        if (Object.keys(liveSchedule).length > 0) {
            window.STARBUCKS_SCHEDULE = Object.assign({}, window.STARBUCKS_SCHEDULE || {}, liveSchedule);
            try {
                const rawCache = localStorage.getItem(CACHE_KEY);
                let cachedData = {};
                if (rawCache) {
                    const parsed = JSON.parse(rawCache);
                    if (parsed && parsed.data) cachedData = parsed.data;
                }
                const mergedCache = Object.assign({}, cachedData, window.STARBUCKS_SCHEDULE);
                localStorage.setItem(CACHE_KEY, JSON.stringify({ time: Date.now(), data: mergedCache }));
            } catch (e) {}

            for (let offset = -2; offset <= 5; offset++) {
                const d = new Date(targetY, targetM + offset, 1);
                fetchedMonths.add(`${d.getFullYear()}-${d.getMonth()}`);
            }

            renderAll();
            if (selectedDateStr) {
                showShiftDetails(selectedDateStr);
            }
        }

        notifyScheduleReady();
    }

    // Trigger auto-sync on page load
    syncCalendarShifts();

    // iCal Export Handler
    const exportIcsBtn = document.getElementById("export-ics-btn");
    if (exportIcsBtn) {
        exportIcsBtn.addEventListener("click", exportScheduleToICS);
    }

    function exportScheduleToICS() {
        const schedule = window.STARBUCKS_SCHEDULE || {};
        const icsLines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//astrong.xyz//Starbucks Schedule//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            "X-WR-CALNAME:Starbucks Shifts"
        ];

        const nowStr = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

        Object.keys(schedule).forEach((dateStr, idx) => {
            const shift = schedule[dateStr];
            if (!shift || !shift.start || !shift.end) return;

            const dateParts = dateStr.split("-");
            const startParts = shift.start.split(":");
            const endParts = shift.end.split(":");

            const dtStart = `${dateParts[0]}${dateParts[1]}${dateParts[2]}T${startParts[0]}${startParts[1]}00`;
            const dtEnd = `${dateParts[0]}${dateParts[1]}${dateParts[2]}T${endParts[0]}${endParts[1]}00`;

            const uid = `starbucks-shift-${dateStr}-${idx}@astrong.xyz`;
            const summary = "Starbucks Shift";
            const description = shift.notes ? `Shift Notes: ${shift.notes}` : "Starbucks Shift";

            icsLines.push("BEGIN:VEVENT");
            icsLines.push(`UID:${uid}`);
            icsLines.push(`DTSTAMP:${nowStr}`);
            icsLines.push(`DTSTART:${dtStart}`);
            icsLines.push(`DTEND:${dtEnd}`);
            icsLines.push(`SUMMARY:${summary}`);
            icsLines.push(`DESCRIPTION:${description}`);
            icsLines.push("LOCATION:Starbucks");
            icsLines.push("END:VEVENT");
        });

        icsLines.push("END:VCALENDAR");

        const icsContent = icsLines.join("\r\n");
        const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "starbucks-schedule.ics";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        if (window.showToast) {
            window.showToast("Exported starbucks-schedule.ics");
        }
    }
});
