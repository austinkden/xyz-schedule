// =========================================================================
// AUSTIN'S SCHOOL SCHEDULE DATA
// =========================================================================
// Schedule structured by Semester 1 and Semester 2 (7 periods per semester).
// =========================================================================

const SCHOOL_SCHEDULE = {
    semester1: [
        { period: 1, name: "Mindfulness", teacher: "Cari Risby", room: "U508" },
        { period: 2, name: "Physics", teacher: "Mark McConnell", room: "L417" },
        { period: 3, name: "Intro to AI", teacher: "Jason Cochrane", room: "L528" },
        { period: 4, name: "ACC US History", teacher: "Kelly Hale", room: "L508" },
        { period: 5, name: "Trigonometry / Pre-Calc", teacher: "Jenny Jones", room: "L405" },
        { period: 6, name: "AP Cybersecurity", teacher: "Jason Cochrane", room: "L528" },
        { period: 7, name: "English 3", teacher: "Becky Garrett", room: "U318" }
    ],
    semester2: [
        { period: 1, name: "Physics", teacher: "Mark McConnell", room: "L417" },
        { period: 2, name: "Aquatic Biology", teacher: "Brad Shores", room: "U413" },
        { period: 3, name: "Criminal Justice", teacher: "Jaclyn Ekhoff", room: "U505" },
        { period: 4, name: "ACC US History", teacher: "Adam Woody", room: "L511" },
        { period: 5, name: "Trigonometry / Pre-Calc", teacher: "Jenny Jones", room: "L405" },
        { period: 6, name: "AP Cybersecurity", teacher: "Jason Cochrane", room: "L528" },
        { period: 7, name: "English 3", teacher: "Becky Garrett", room: "U318" }
    ]
};

window.SCHOOL_SCHEDULE = SCHOOL_SCHEDULE;
