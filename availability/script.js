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
    const exportIcsBtn = document.getElementById("export-ics-btn");

    const calendarDaysGrid = document.getElementById("calendar-days");
    const agendaListContainer = document.getElementById("agenda-list");
    const weekdaysHeader = document.getElementById("weekdays-header");
    const monthSummaryEl = document.getElementById("month-summary");
    const detailsPlaceholder = document.getElementById("details-placeholder");
    const detailsContent = document.getElementById("details-content");
    const detailsDate = document.getElementById("details-date");
    const detailsCountdown = document.getElementById("details-countdown");
    const detailsEventsList = document.getElementById("details-events-list");

    const todayReal = new Date();
    const minYear = todayReal.getFullYear();
    const minMonth = todayReal.getMonth(); // Current month
    const maxDateLimit = new Date(minYear, minMonth + 1, 1);
    const maxYear = maxDateLimit.getFullYear();
    const maxMonth = maxDateLimit.getMonth(); // Current month + 1

    let currentDate = new Date(minYear, minMonth, 1);
    let selectedDateStr = null;
    let currentView = "month";
    let timeFormat = localStorage.getItem("time-format-pref") || "12h";
    let weekStart = localStorage.getItem("week-start-pref") || "sun";
    let showAdjacentDays = localStorage.getItem("show-adjacent-pref") !== "false";

    // Global in-memory schedule map: dateKey "YYYY-MM-DD" -> array of events
    let AVAILABILITY_SCHEDULE = {};

    const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const labelsSun = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const labelsMon = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

    const CALENDAR_ID = "dolphin.kden@gmail.com";
    const SCHOOL_CALENDAR_ID = "f6c70c75c77b7dbe2af2320f595ceb5c787024238c5be9db11476e9bc8f6f223@group.calendar.google.com";
    const API_KEY = "AIzaSyBIwrZ7LnEPCEGs5CM_Pq61YtGZ3jHVQHY";
    const CACHE_KEY = "availability_schedule_cache_v3";

    function pad(n) { return String(n).padStart(2, "0"); }
    function formatDateKey(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }

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
        return new Date(Date.UTC(p[0], p[1] - 1, p[2])).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
            timeZone: "UTC"
        });
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
        return `${h12}:${pad(m)} ${ap}`;
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
        return `${h12}${m > 0 ? ":" + pad(m) : ""}${ap}`;
    }

    function getShiftCountdown(dateStr, eventObj) {
        const now = new Date();
        const todayStr = formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());
        if (dateStr === todayStr) {
            if (eventObj && eventObj.start && eventObj.end) {
                const nowMinutes = now.getHours() * 60 + now.getMinutes();
                const startMinutes = parseTimeToMinutes(eventObj.start);
                const endMinutes = parseTimeToMinutes(eventObj.end);
                if (nowMinutes >= startMinutes && nowMinutes < endMinutes) {
                    return { text: "Active Now", type: "today" };
                }
            }
            return { text: "Today", type: "today" };
        }
        const [y, m, d] = dateStr.split("-").map(Number);
        const target = new Date(y, m - 1, d);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const diffDays = Math.round((target - today) / 86400000);
        if (diffDays === 1) return { text: "Tomorrow", type: "soon" };
        if (diffDays === -1) return { text: "Yesterday", type: "past" };
        if (diffDays > 1 && diffDays <= 6) return { text: `In ${diffDays} days`, type: "soon" };
        if (diffDays > 6) return { text: `In ${diffDays} days`, type: "future" };
        return { text: `${Math.abs(diffDays)} days ago`, type: "past" };
    }

    function notifyScheduleReady() {
        window.__ASTRONG_SCHEDULE_READY__ = true;
        window.dispatchEvent(new Event("astrong-schedule-ready"));
        const loader = document.getElementById("astrong-loading-screen");
        if (loader) {
            loader.classList.add("fade-out");
        }
    }

    // Try loading cache immediately
    try {
        const cachedRaw = localStorage.getItem(CACHE_KEY);
        if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            if (cached && cached.data) {
                AVAILABILITY_SCHEDULE = Object.assign({}, cached.data);
                renderAll();
                notifyScheduleReady();
            }
        }
    } catch (e) {
        console.warn("[Availability] Cache load error", e);
    }

    function renderWeekdayHeader() {
        if (!weekdaysHeader) return;
        const labels = weekStart === "mon" ? labelsMon : labelsSun;
        weekdaysHeader.innerHTML = labels.map(d => `<div>${d}</div>`).join("");
    }

    function renderMonthSummary() {
        if (!monthSummaryEl) return;
        const y = currentDate.getFullYear(), mo = currentDate.getMonth();
        const total = new Date(y, mo + 1, 0).getDate();
        let count = 0, mins = 0;
        for (let d = 1; d <= total; d++) {
            const events = AVAILABILITY_SCHEDULE[formatDateKey(y, mo, d)] || [];
            for (const ev of events) {
                count++;
                let diff = parseTimeToMinutes(ev.end) - parseTimeToMinutes(ev.start);
                if (diff < 0) diff += 1440;
                mins += diff;
            }
        }
        if (count === 0) {
            monthSummaryEl.textContent = "No scheduled blocks this month";
        } else {
            const h = Math.floor(mins / 60), m = mins % 60;
            monthSummaryEl.textContent = `${count} block${count !== 1 ? "s" : ""} \u00b7 ${m > 0 ? h + "h " + m + "m" : h + "h"} total`;
        }
    }

    function showShiftDetails(dateStr) {
        selectedDateStr = dateStr;
        document.querySelectorAll(".day-cell").forEach(c => c.classList.toggle("selected", c.dataset.date === dateStr));
        document.querySelectorAll(".agenda-item").forEach(r => r.classList.toggle("selected", r.dataset.date === dateStr));

        const events = AVAILABILITY_SCHEDULE[dateStr] || [];
        const is24h = timeFormat === "24h";

        if (events.length > 0) {
            detailsPlaceholder.classList.add("hidden");
            detailsContent.classList.remove("hidden");
            detailsDate.textContent = formatLongDate(dateStr);

            const primaryEvent = events[0];
            if (detailsCountdown) {
                const c = getShiftCountdown(dateStr, primaryEvent);
                detailsCountdown.textContent = c.text;
                detailsCountdown.className = `countdown-badge countdown-${c.type}`;
            }

            let html = "";
            for (const ev of events) {
                const badgeClass = `badge-${ev.type}`;
                const timeText = ev.isAllDay ? "All Day" : `${formatTime(ev.start, is24h)} \u2013 ${formatTime(ev.end, is24h)}`;
                const durationText = ev.isAllDay ? "All Day" : `(${calculateDuration(ev.start, ev.end)})`;

                html += `
                    <div class="availability-event-item">
                        <span class="event-type-badge ${badgeClass}">${ev.label}</span>
                        <div class="detail-row time-row">
                            <span class="detail-label">Hours</span>
                            <div class="detail-val">
                                <span class="details-time">${timeText}</span>
                                <span class="duration">${durationText}</span>
                            </div>
                        </div>
                    </div>
                `;
            }
            detailsEventsList.innerHTML = html;
        } else {
            detailsPlaceholder.classList.add("hidden");
            detailsContent.classList.remove("hidden");
            detailsDate.textContent = formatLongDate(dateStr);
            if (detailsCountdown) {
                const c = getShiftCountdown(dateStr, null);
                detailsCountdown.textContent = c.text;
                detailsCountdown.className = `countdown-badge countdown-${c.type}`;
            }
            detailsEventsList.innerHTML = `
                <div class="detail-row time-row" style="padding: 0.5rem 0;">
                    <span class="detail-label">Status</span>
                    <div class="detail-val">
                        <span style="color: #22c55e;">Available All Day</span>
                        <span class="duration">(No scheduled blocks)</span>
                    </div>
                </div>
            `;
        }
    }

    function createDayCell(dayNum, dateStr, isAdj, isToday, is24h) {
        const cell = document.createElement("div");
        cell.className = "day-cell";
        cell.dataset.date = dateStr;
        if (isAdj) cell.classList.add("adjacent-month");
        if (isToday) cell.classList.add("today");

        const events = AVAILABILITY_SCHEDULE[dateStr] || [];
        if (events.length > 0) {
            cell.classList.add("has-shift");
        }

        const num = document.createElement("span");
        num.className = "day-number";
        num.textContent = dayNum;
        cell.appendChild(num);

        if (events.length > 0) {
            const eventsContainer = document.createElement("div");
            eventsContainer.className = "day-events-container";

            const maxVisible = 3;
            const showCount = events.length > maxVisible ? 2 : Math.min(events.length, maxVisible);

            for (let idx = 0; idx < showCount; idx++) {
                const ev = events[idx];
                const tag = document.createElement("span");
                tag.className = `shift-tag tag-${ev.type}`;

                // User directive: DO NOT show the label name, ONLY show the time
                const fullText = ev.isAllDay ? "All Day" : `${formatShortTime(ev.start, is24h)}-${formatShortTime(ev.end, is24h)}`;
                const startText = ev.isAllDay ? "All Day" : formatShortTime(ev.start, is24h);

                tag.textContent = fullText;
                tag.dataset.fullText = fullText;
                tag.dataset.startText = startText;
                eventsContainer.appendChild(tag);
            }

            if (events.length > maxVisible) {
                const moreTag = document.createElement("span");
                moreTag.className = "shift-tag tag-more";
                moreTag.textContent = `+${events.length - 2} more`;
                eventsContainer.appendChild(moreTag);
            }

            cell.appendChild(eventsContainer);

            // Mobile dots container
            const dotsContainer = document.createElement("div");
            dotsContainer.className = "day-dots-container";
            const maxDots = 4;
            for (let idx = 0; idx < Math.min(events.length, maxDots); idx++) {
                const ev = events[idx];
                const dot = document.createElement("span");
                dot.className = `event-dot dot-${ev.type}`;
                dotsContainer.appendChild(dot);
            }
            cell.appendChild(dotsContainer);
        }

        cell.addEventListener("click", () => showShiftDetails(dateStr));
        return cell;
    }

    function adjustShiftTags() {
        if (currentView !== "month") return;
        const tags = document.querySelectorAll(".shift-tag");
        tags.forEach(tag => {
            if (!tag.dataset.fullText) return;
            tag.textContent = tag.dataset.fullText;
            const containerWidth = tag.getBoundingClientRect().width;
            
            tag.style.overflow = "visible";
            tag.style.textOverflow = "clip";
            tag.style.whiteSpace = "nowrap";
            tag.style.width = "auto";
            tag.style.display = "inline-block";
            
            const textWidth = tag.getBoundingClientRect().width;
            
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
        if (!calendarDaysGrid) return;
        calendarDaysGrid.innerHTML = "";

        const y = currentDate.getFullYear(), mo = currentDate.getMonth();
        const is24h = timeFormat === "24h";
        const offset = weekStart === "mon" ? 1 : 0;
        const firstDayIdx = (new Date(y, mo, 1).getDay() - offset + 7) % 7;
        const totalDays = new Date(y, mo + 1, 0).getDate();
        const prevTotal = new Date(y, mo, 0).getDate();
        const now = new Date();
        const todayStr = formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());

        for (let i = firstDayIdx; i > 0; i--) {
            const dn = prevTotal - i + 1;
            const pm = mo === 0 ? 11 : mo - 1, py = mo === 0 ? y - 1 : y;
            if (showAdjacentDays) calendarDaysGrid.appendChild(createDayCell(dn, formatDateKey(py, pm, dn), true, false, is24h));
            else { const s = document.createElement("div"); s.className = "day-cell-spacer"; calendarDaysGrid.appendChild(s); }
        }
        for (let d = 1; d <= totalDays; d++) {
            const ds = formatDateKey(y, mo, d);
            calendarDaysGrid.appendChild(createDayCell(d, ds, false, ds === todayStr, is24h));
        }
        const nextPad = (7 - ((firstDayIdx + totalDays) % 7)) % 7;
        for (let i = 1; i <= nextPad; i++) {
            const nm = mo === 11 ? 0 : mo + 1, ny = mo === 11 ? y + 1 : y;
            if (showAdjacentDays) calendarDaysGrid.appendChild(createDayCell(i, formatDateKey(ny, nm, i), true, false, is24h));
            else { const s = document.createElement("div"); s.className = "day-cell-spacer"; calendarDaysGrid.appendChild(s); }
        }
        if (selectedDateStr) {
            const cell = calendarDaysGrid.querySelector(`.day-cell[data-date="${selectedDateStr}"]`);
            if (cell) cell.classList.add("selected");
        }
    }

    function renderAgendaList() {
        if (!agendaListContainer) return;
        agendaListContainer.innerHTML = "";

        const y = currentDate.getFullYear(), mo = currentDate.getMonth();
        const totalDays = new Date(y, mo + 1, 0).getDate();
        const is24h = timeFormat === "24h";
        let count = 0;

        for (let d = 1; d <= totalDays; d++) {
            const dateStr = formatDateKey(y, mo, d);
            const events = AVAILABILITY_SCHEDULE[dateStr] || [];
            if (events.length === 0) continue;

            count++;
            const item = document.createElement("div");
            item.className = "agenda-item";
            item.dataset.date = dateStr;
            if (selectedDateStr === dateStr) item.classList.add("selected");

            const p = dateStr.split("-");
            const dObj = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
            const dateInfo = document.createElement("div");
            dateInfo.className = "agenda-date-info";
            const wdEl = document.createElement("span"); wdEl.className = "agenda-weekday";
            wdEl.textContent = dObj.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
            const dayEl = document.createElement("span"); dayEl.className = "agenda-day";
            dayEl.textContent = dObj.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
            dateInfo.appendChild(wdEl); dateInfo.appendChild(dayEl);
            item.appendChild(dateInfo);

            const si = document.createElement("div"); si.className = "agenda-shift-info";
            for (const ev of events) {
                const tEl = document.createElement("div"); tEl.className = "agenda-time";
                const timeSpan = document.createElement("span");
                timeSpan.className = "agenda-time-range";

                const labelStrong = document.createElement("strong");
                labelStrong.className = "agenda-event-label";
                labelStrong.textContent = ev.label;

                const timeValSpan = document.createElement("span");
                timeValSpan.className = "agenda-event-time-val";
                timeValSpan.textContent = ev.isAllDay ? " (All Day)" : `: ${formatTime(ev.start, is24h)} \u2013 ${formatTime(ev.end, is24h)}`;

                timeSpan.appendChild(labelStrong);
                timeSpan.appendChild(timeValSpan);

                const durEl = document.createElement("span"); durEl.className = "agenda-duration";
                durEl.textContent = ev.isAllDay ? "All Day" : calculateDuration(ev.start, ev.end);
                tEl.appendChild(timeSpan);
                tEl.appendChild(durEl);
                si.appendChild(tEl);
            }
            item.appendChild(si);

            const c = getShiftCountdown(dateStr, events[0]);
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
            empty.textContent = "No scheduled blocks for this month.";
            agendaListContainer.appendChild(empty);
        }
    }

    function updateMonthNavBounds() {
        const curY = currentDate.getFullYear();
        const curM = currentDate.getMonth();

        const isAtMin = (curY < minYear) || (curY === minYear && curM <= minMonth);
        const isAtMax = (curY > maxYear) || (curY === maxYear && curM >= maxMonth);

        if (prevMonthBtn) {
            prevMonthBtn.disabled = isAtMin;
            prevMonthBtn.classList.toggle("disabled", isAtMin);
            prevMonthBtn.style.opacity = isAtMin ? "0.25" : "1";
            prevMonthBtn.style.cursor = isAtMin ? "not-allowed" : "pointer";
            prevMonthBtn.style.pointerEvents = isAtMin ? "none" : "auto";
        }

        if (nextMonthBtn) {
            nextMonthBtn.disabled = isAtMax;
            nextMonthBtn.classList.toggle("disabled", isAtMax);
            nextMonthBtn.style.opacity = isAtMax ? "0.25" : "1";
            nextMonthBtn.style.cursor = isAtMax ? "not-allowed" : "pointer";
            nextMonthBtn.style.pointerEvents = isAtMax ? "none" : "auto";
        }
    }

    function renderAll() {
        if (currentMonthYearHeader) {
            currentMonthYearHeader.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        }
        updateMonthNavBounds();
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

    function parseEventsFromItems(items) {
        const scheduleMap = {};
        if (!Array.isArray(items)) return scheduleMap;

        for (const item of items) {
            if (item.status === "cancelled") continue;

            // Only show if event is Busy. Skip if Free (transparent).
            const isFree = item.transparency === "transparent";
            if (isFree) {
                continue;
            }

            const isAllDayRange = Boolean(item.start && item.start.date);
            let sDate, eDate;

            if (item.start && item.start.dateTime) {
                sDate = new Date(item.start.dateTime);
                eDate = new Date(item.end ? item.end.dateTime : item.start.dateTime);
            } else if (item.start && item.start.date) {
                const [sy, sm, sd] = item.start.date.split("-").map(Number);
                sDate = new Date(sy, sm - 1, sd, 0, 0, 0);
                if (item.end && item.end.date) {
                    const [ey, em, ed] = item.end.date.split("-").map(Number);
                    eDate = new Date(ey, em - 1, ed, 0, 0, 0);
                } else {
                    eDate = new Date(sy, sm - 1, sd + 1, 0, 0, 0);
                }
            } else {
                continue;
            }

            const summary = (item.summary || "").trim().toLowerCase();
            const isStarbucks = summary.includes("starbucks shift") || summary.includes("starbucks") || summary.includes("work");
            const isSchool = summary.includes("school") || (item.organizer && item.organizer.email && item.organizer.email.includes("school"));
            const isCalendarBlock = summary.includes("calendar block");
            const isUnavailable = isCalendarBlock || summary.includes("unavailable");

            let type = "busy";
            let label = "Busy";

            if (isStarbucks) {
                type = "work";
                label = "Work";
            } else if (isSchool) {
                type = "school";
                label = "School";
            } else if (isUnavailable) {
                type = "unavailable";
                label = "Unavailable";
            } else {
                type = "busy";
                label = "Busy";
            }

            if (isAllDayRange) {
                const cur = new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate(), 12, 0, 0);
                const limit = new Date(eDate.getFullYear(), eDate.getMonth(), eDate.getDate(), 12, 0, 0);

                while (cur < limit) {
                    const dKey = formatDateKey(cur.getFullYear(), cur.getMonth(), cur.getDate());
                    const eventObj = {
                        type,
                        label,
                        title: item.summary || label,
                        notes: item.description || "",
                        start: "00:00",
                        end: "23:59",
                        isAllDay: true,
                        startDate: sDate.toISOString(),
                        endDate: eDate.toISOString()
                    };
                    if (!scheduleMap[dKey]) scheduleMap[dKey] = [];
                    scheduleMap[dKey].push(eventObj);
                    cur.setDate(cur.getDate() + 1);
                }
            } else {
                const sDay = new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate(), 12, 0, 0);
                const eDay = new Date(eDate.getFullYear(), eDate.getMonth(), eDate.getDate(), 12, 0, 0);

                if (sDay.getTime() === eDay.getTime()) {
                    const dKey = formatDateKey(sDate.getFullYear(), sDate.getMonth(), sDate.getDate());
                    const eventObj = {
                        type,
                        label,
                        title: item.summary || label,
                        notes: item.description || "",
                        start: `${pad(sDate.getHours())}:${pad(sDate.getMinutes())}`,
                        end: `${pad(eDate.getHours())}:${pad(eDate.getMinutes())}`,
                        isAllDay: false,
                        startDate: sDate.toISOString(),
                        endDate: eDate.toISOString()
                    };
                    if (!scheduleMap[dKey]) scheduleMap[dKey] = [];
                    scheduleMap[dKey].push(eventObj);
                } else {
                    const cur = new Date(sDay);
                    while (cur <= eDay) {
                        const isFirstDay = cur.getTime() === sDay.getTime();
                        const isLastDay = cur.getTime() === eDay.getTime();
                        const dKey = formatDateKey(cur.getFullYear(), cur.getMonth(), cur.getDate());

                        if (isLastDay && eDate.getHours() === 0 && eDate.getMinutes() === 0) {
                            cur.setDate(cur.getDate() + 1);
                            continue;
                        }

                        const startTimeStr = isFirstDay ? `${pad(sDate.getHours())}:${pad(sDate.getMinutes())}` : "00:00";
                        const endTimeStr = isLastDay ? `${pad(eDate.getHours())}:${pad(eDate.getMinutes())}` : "23:59";
                        const eventObj = {
                            type,
                            label,
                            title: item.summary || label,
                            notes: item.description || "",
                            start: startTimeStr,
                            end: endTimeStr,
                            isAllDay: !isFirstDay && !isLastDay,
                            startDate: sDate.toISOString(),
                            endDate: eDate.toISOString()
                        };
                        if (!scheduleMap[dKey]) scheduleMap[dKey] = [];
                        scheduleMap[dKey].push(eventObj);
                        cur.setDate(cur.getDate() + 1);
                    }
                }
            }
        }

        return scheduleMap;
    }

    const fetchedMonths = new Set();

    async function syncCalendarAvailability(targetDate = currentDate) {
        const baseDate = targetDate || currentDate || new Date();
        const targetY = baseDate.getFullYear();
        const targetM = baseDate.getMonth();
        const monthKey = `${targetY}-${targetM}`;

        if (fetchedMonths.has(monthKey)) {
            notifyScheduleReady();
            return;
        }

        const timeMin = new Date(targetY, targetM - 2, 1).toISOString();
        const timeMax = new Date(targetY, targetM + 3, 0, 23, 59, 59).toISOString();

        const url1 = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?key=${API_KEY}&singleEvents=true&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&orderBy=startTime&maxResults=2500`;
        const url2 = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(SCHOOL_CALENDAR_ID)}/events?key=${API_KEY}&singleEvents=true&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&orderBy=startTime&maxResults=2500`;

        try {
            const [res1, res2] = await Promise.allSettled([fetch(url1), fetch(url2)]);
            let combinedItems = [];

            if (res1.status === "fulfilled" && res1.value.ok) {
                const d1 = await res1.value.json();
                if (d1.items) combinedItems.push(...d1.items);
            }
            if (res2.status === "fulfilled" && res2.value.ok) {
                const d2 = await res2.value.json();
                if (d2.items) combinedItems.push(...d2.items);
            }

            if (combinedItems.length > 0) {
                const newMap = parseEventsFromItems(combinedItems);
                AVAILABILITY_SCHEDULE = Object.assign({}, AVAILABILITY_SCHEDULE, newMap);
                fetchedMonths.add(monthKey);

                try {
                    localStorage.setItem(CACHE_KEY, JSON.stringify({
                        timestamp: Date.now(),
                        data: AVAILABILITY_SCHEDULE
                    }));
                } catch (e) {}

                renderAll();
                if (selectedDateStr) {
                    showShiftDetails(selectedDateStr);
                }
            }
        } catch (err) {
            console.warn("[Availability] Sync error:", err);
        } finally {
            notifyScheduleReady();
        }
    }

    // Event Listeners
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener("click", () => {
            const curY = currentDate.getFullYear();
            const curM = currentDate.getMonth();
            if ((curY < minYear) || (curY === minYear && curM <= minMonth)) {
                return;
            }
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderAll();
            syncCalendarAvailability(currentDate);
        });
    }

    if (nextMonthBtn) {
        nextMonthBtn.addEventListener("click", () => {
            const curY = currentDate.getFullYear();
            const curM = currentDate.getMonth();
            if ((curY > maxYear) || (curY === maxYear && curM >= maxMonth)) {
                return;
            }
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderAll();
            syncCalendarAvailability(currentDate);
        });
    }

    if (btnViewMonth && btnViewAgenda) {
        btnViewMonth.addEventListener("click", () => {
            currentView = "month";
            btnViewMonth.classList.add("active");
            btnViewAgenda.classList.remove("active");
            renderAll();
        });

        btnViewAgenda.addEventListener("click", () => {
            currentView = "agenda";
            btnViewAgenda.classList.add("active");
            btnViewMonth.classList.remove("active");
            renderAll();
        });
    }

    if (settingsToggle && settingsTray) {
        settingsToggle.addEventListener("click", () => {
            settingsTray.classList.toggle("hidden");
            settingsToggle.classList.toggle("active", !settingsTray.classList.contains("hidden"));
        });
    }

    if (btnFormat12h && btnFormat24h) {
        btnFormat12h.addEventListener("click", () => {
            timeFormat = "12h";
            localStorage.setItem("time-format-pref", "12h");
            btnFormat12h.classList.add("active");
            btnFormat24h.classList.remove("active");
            renderAll();
        });

        btnFormat24h.addEventListener("click", () => {
            timeFormat = "24h";
            localStorage.setItem("time-format-pref", "24h");
            btnFormat24h.classList.add("active");
            btnFormat12h.classList.remove("active");
            renderAll();
        });
    }

    if (btnWeekSun && btnWeekMon) {
        btnWeekSun.addEventListener("click", () => {
            weekStart = "sun";
            localStorage.setItem("week-start-pref", "sun");
            btnWeekSun.classList.add("active");
            btnWeekMon.classList.remove("active");
            renderAll();
        });

        btnWeekMon.addEventListener("click", () => {
            weekStart = "mon";
            localStorage.setItem("week-start-pref", "mon");
            btnWeekMon.classList.add("active");
            btnWeekSun.classList.remove("active");
            renderAll();
        });
    }

    if (btnAdjacentOn && btnAdjacentOff) {
        btnAdjacentOn.addEventListener("click", () => {
            showAdjacentDays = true;
            localStorage.setItem("show-adjacent-pref", "true");
            btnAdjacentOn.classList.add("active");
            btnAdjacentOff.classList.remove("active");
            renderAll();
        });

        btnAdjacentOff.addEventListener("click", () => {
            showAdjacentDays = false;
            localStorage.setItem("show-adjacent-pref", "false");
            btnAdjacentOff.classList.add("active");
            btnAdjacentOn.classList.remove("active");
            renderAll();
        });
    }

    if (exportIcsBtn) {
        exportIcsBtn.addEventListener("click", () => {
            let icsContent = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//astrong.xyz//Availability Calendar//EN\r\nCALSCALE:GREGORIAN\r\n";
            Object.keys(AVAILABILITY_SCHEDULE).forEach(dateKey => {
                const events = AVAILABILITY_SCHEDULE[dateKey];
                events.forEach(ev => {
                    const startClean = (ev.startDate || "").replace(/[-:]/g, "").split(".")[0] + "Z";
                    const endClean = (ev.endDate || "").replace(/[-:]/g, "").split(".")[0] + "Z";
                    icsContent += `BEGIN:VEVENT\r\nSUMMARY:${ev.title || ev.label}\r\nDESCRIPTION:${ev.notes || ""}\r\nDTSTART:${startClean}\r\nDTEND:${endClean}\r\nSTATUS:CONFIRMED\r\nEND:VEVENT\r\n`;
                });
            });
            icsContent += "END:VCALENDAR\r\n";

            const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `austin-availability-${currentDate.getFullYear()}-${pad(currentDate.getMonth() + 1)}.ics`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // Default select today
    const now = new Date();
    const todayStr = formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());
    selectedDateStr = todayStr;

    if (btnFormat12h && btnFormat24h) {
        btnFormat12h.classList.toggle("active", timeFormat === "12h");
        btnFormat24h.classList.toggle("active", timeFormat === "24h");
    }
    if (btnWeekSun && btnWeekMon) {
        btnWeekSun.classList.toggle("active", weekStart === "sun");
        btnWeekMon.classList.toggle("active", weekStart === "mon");
    }
    if (btnAdjacentOn && btnAdjacentOff) {
        btnAdjacentOn.classList.toggle("active", showAdjacentDays);
        btnAdjacentOff.classList.toggle("active", !showAdjacentDays);
    }

    renderAll();
    showShiftDetails(todayStr);

    // Initial Live Sync
    syncCalendarAvailability(currentDate);
});
