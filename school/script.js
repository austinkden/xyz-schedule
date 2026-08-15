document.addEventListener("DOMContentLoaded", () => {
    const authOverlay = document.getElementById("auth-modal-overlay");
    const authForm = document.getElementById("auth-form");
    const authInput = document.getElementById("auth-input");
    const authError = document.getElementById("auth-error");

    const btnSemester1 = document.getElementById("btn-semester-1");
    const btnSemester2 = document.getElementById("btn-semester-2");
    const scheduleGrid = document.getElementById("schedule-grid");

    let currentSemester = 1;
    let sessionVerified = false;

    // Cookie & Auth Utilities
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        try { return localStorage.getItem(name); } catch (e) {}
        return null;
    }

    function setCookie(name, value, days) {
        const d = new Date();
        d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = `expires=${d.toUTCString()}`;
        const domainStr = window.location.hostname.endsWith('astrong.xyz') ? '; domain=.astrong.xyz' : '';
        const secureStr = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `${name}=${value}; ${expires}; path=/; SameSite=Lax${domainStr}${secureStr}`;
        try { localStorage.setItem(name, value); } catch (e) {}
    }

    function isSchoolVerified() {
        if (sessionVerified) return true;
        if (getCookie("school_verified") === "true") return true;
        try {
            if (localStorage.getItem("school_verified") === "true") return true;
        } catch (e) {}
        return false;
    }

    // Extract auth token from URL parameters (expects format: auth=school+[token] or auth=school [token])
    function extractSchoolAuthToken() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            let rawAuth = urlParams.get("auth") || "";
            if (!rawAuth) return null;
            rawAuth = rawAuth.trim();
            if (rawAuth.startsWith("school ")) {
                return "school+" + rawAuth.slice(7).trim();
            }
            if (rawAuth.startsWith("school+")) {
                return rawAuth;
            }
            return "school+" + rawAuth;
        } catch (e) {
            console.error("[School Auth] Error parsing URL auth param:", e);
        }
        return null;
    }

    // Client-side Firestore Token Verification with Timeout
    async function verifyUrlToken(token) {
        if (!token) return false;
        try {
            const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
            const { getFirestore, doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
            const { firebaseConfig } = await import("https://astrong.xyz/firebase-config.js");

            const app = initializeApp(firebaseConfig);
            const db = getFirestore(app);
            let tokenRef = doc(db, "tokens", token);

            const fetchPromise = getDoc(tokenRef);
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Token verification timeout")), 2500)
            );

            let tokenSnap = await Promise.race([fetchPromise, timeoutPromise]);
            
            // Fallback for tokens in legacy collection "school_auth_tokens" or legacy tokens stored without "school+" prefix
            if (!tokenSnap || !tokenSnap.exists()) {
                const legacyCollRef = doc(db, "school_auth_tokens", token);
                tokenSnap = await getDoc(legacyCollRef).catch(() => null);
                if (tokenSnap && tokenSnap.exists()) {
                    tokenRef = legacyCollRef;
                } else if (token.startsWith("school+")) {
                    const legacyToken = token.slice(7);
                    if (legacyToken) {
                        const legacyRef = doc(db, "tokens", legacyToken);
                        tokenSnap = await getDoc(legacyRef).catch(() => null);
                        if (tokenSnap && tokenSnap.exists()) {
                            tokenRef = legacyRef;
                        } else {
                            const legacyCollRef2 = doc(db, "school_auth_tokens", legacyToken);
                            tokenSnap = await getDoc(legacyCollRef2).catch(() => null);
                            if (tokenSnap && tokenSnap.exists()) {
                                tokenRef = legacyCollRef2;
                            }
                        }
                    }
                }
            }

            const deviceId = getCookie('astrong_device_id') || localStorage.getItem('astrong_device_id') || window.__ASTRONG_DEVICE_ID__;

            if (tokenSnap && tokenSnap.exists()) {
                const data = tokenSnap.data();
                if (data && data.active === true) {
                    // Valid active token
                    try {
                        const { setDoc, increment, arrayUnion } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
                        const updatePayload = {
                            usesCount: increment(1),
                            lastUsedAt: new Date().toISOString()
                        };
                        if (data.oneTimeUse === true) {
                            updatePayload.active = false;
                        }
                        setDoc(tokenRef, updatePayload, { merge: true }).catch(e => console.warn("[School Auth] Could not update token record:", e));

                        // Log valid token redemption to visitor's device telemetry
                        if (deviceId) {
                            const deviceRef = doc(db, "devices", deviceId);
                            setDoc(deviceRef, {
                                tokenUsages: arrayUnion({
                                    token: token,
                                    tokenType: "school",
                                    label: data.label || "Unlabeled Token",
                                    usedAt: new Date().toISOString(),
                                    page: window.location.pathname,
                                    valid: true,
                                    status: "valid"
                                }),
                                "authorizations.schoolSchedule": true,
                                schoolVerified: true
                            }, { merge: true }).catch(e => console.warn("[Telemetry] Could not log token usage to device:", e));
                        }
                    } catch (e) {}
                    return true;
                } else {
                    // Token exists but is inactive / revoked
                    if (deviceId) {
                        try {
                            const { setDoc, arrayUnion } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
                            const deviceRef = doc(db, "devices", deviceId);
                            setDoc(deviceRef, {
                                tokenUsages: arrayUnion({
                                    token: token,
                                    tokenType: "school",
                                    label: data && data.label ? `${data.label} (Inactive)` : "Inactive Token",
                                    usedAt: new Date().toISOString(),
                                    page: window.location.pathname,
                                    valid: false,
                                    status: "inactive"
                                })
                            }, { merge: true }).catch(e => console.warn("[Telemetry] Could not log inactive token attempt:", e));
                        } catch (e) {}
                    }
                    return false;
                }
            } else {
                // Token does NOT exist (invalid / unknown token attempt)
                if (deviceId) {
                    try {
                        const { setDoc, arrayUnion } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
                        const deviceRef = doc(db, "devices", deviceId);
                        setDoc(deviceRef, {
                            tokenUsages: arrayUnion({
                                token: token,
                                tokenType: "school",
                                label: "Invalid / Unknown Token",
                                usedAt: new Date().toISOString(),
                                page: window.location.pathname,
                                valid: false,
                                status: "invalid"
                            })
                        }, { merge: true }).catch(e => console.warn("[Telemetry] Could not log invalid token attempt:", e));
                    } catch (e) {}
                }
                return false;
            }
        } catch (err) {
            console.warn("[School Auth] Token verification error or timeout:", err);
            try {
                const deviceId = getCookie('astrong_device_id') || localStorage.getItem('astrong_device_id') || window.__ASTRONG_DEVICE_ID__;
                if (deviceId) {
                    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
                    const { getFirestore, doc, setDoc, arrayUnion } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
                    const { firebaseConfig } = await import("https://astrong.xyz/firebase-config.js");
                    const app = initializeApp(firebaseConfig);
                    const db = getFirestore(app);
                    const deviceRef = doc(db, "devices", deviceId);
                    setDoc(deviceRef, {
                        tokenUsages: arrayUnion({
                            token: token,
                            tokenType: "school",
                            label: "Verification Error",
                            usedAt: new Date().toISOString(),
                            page: window.location.pathname,
                            valid: false,
                            status: "error"
                        })
                    }, { merge: true }).catch(() => {});
                }
            } catch (e) {}
        }
        return false;
    }

    // Client-side School Authentication Check
    function checkSchoolVerification() {
        const isVerified = isSchoolVerified();
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
                sessionVerified = true;
                setCookie("school_verified", "true", 450);
                try { localStorage.setItem("school_verified", "true"); } catch (e) {}
                if (authError) authError.style.display = "none";
                if (authOverlay) authOverlay.classList.add("hidden");
                renderSchedule();

                // Update device telemetry authorization
                try {
                    const deviceId = getCookie('astrong_device_id') || localStorage.getItem('astrong_device_id') || window.__ASTRONG_DEVICE_ID__;
                    if (deviceId) {
                        import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js").then(({ initializeApp }) => {
                            import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js").then(({ getFirestore, doc, setDoc }) => {
                                import("https://astrong.xyz/firebase-config.js").then(({ firebaseConfig }) => {
                                    const app = initializeApp(firebaseConfig);
                                    const db = getFirestore(app);
                                    setDoc(doc(db, "devices", deviceId), {
                                        "authorizations.schoolSchedule": true,
                                        schoolVerified: true
                                    }, { merge: true }).catch(() => {});
                                });
                            });
                        });
                    }
                } catch(e) {}
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

        const isVerified = isSchoolVerified();
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
    const urlToken = extractSchoolAuthToken();
    const isAlreadyVerified = isSchoolVerified();

    if (urlToken) {
        window.__ASTRONG_WAIT_FOR_SCHEDULE__ = true;
        verifyUrlToken(urlToken).then((isValid) => {
            if (isValid) {
                sessionVerified = true;
                setCookie("school_verified", "true", 450);
                if (authOverlay) authOverlay.classList.add("hidden");
            } else if (!isAlreadyVerified) {
                if (authOverlay) {
                    authOverlay.classList.remove("hidden");
                    setTimeout(() => authInput && authInput.focus(), 100);
                }
            } else {
                checkSchoolVerification();
            }
            renderSchedule();
            window.__ASTRONG_SCHEDULE_READY__ = true;
            const loader = document.getElementById('astrong-loading-screen');
            if (loader) {
                loader.classList.add('fade-out');
                setTimeout(() => {
                    if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
                }, 300);
            }
        });
    } else {
        checkSchoolVerification();
        renderSchedule();
    }
});
