/*
   How this file works with db.js:
   - This whole file is wrapped in ( function () { ... } )(); so none of its names
     can clash with the names in db.js or encryption.js. The two files stay separate.
   - It only ASKS db.js for things (getRecord, getAllRecords, addRecord, dbReady, ...).
   - If db.js is not on the page, or the database cannot start, the page does not crash:
     it falls back to ../data/Patients.json and tells the patient what happened.
*/

( function () {
'use strict';

//---GENERAL-HELPERS---//

function getById(id) {
    return document.getElementById(id);
}

function getByClass(className) {
    return document.getElementsByClassName(className);
}

function createElement(tagName) {
    return document.createElement(tagName);
}

function pad(num) {
    return String(num).padStart(2, "0");
}

function markSelected(groupClass, chosenButton) {
    var group = getByClass(groupClass);

    for (var i = 0; i < group.length; i++) {
        group[i].classList.remove("selected");
    }

    chosenButton.classList.add("selected");
}

//a short unique id for a new record for example "NHS 00388592"
function makeId(prefix) {
    return prefix + "-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
}

//a message at the top of the page, used when something goes wrong
function showPageMessage(text) {
    var box = getById("page-message");

    if (box === null) {
        box = createElement("p");
        box.id = "page-message";
        box.setAttribute("role", "alert");

        var main = document.querySelector("main");
        if (main === null) {
            console.warn(text);
            return;
        }
        main.insertBefore(box, main.firstChild);
    }

    box.textContent = text;
}


//---LOGGED-IN-PATIENT---//

// For the demo we pretend patient number 1 is logged in.
// Later, the login page saves the real id with sessionStorage.setItem("patientId", id)
// and this file picks it up here.
var loggedInPatientId = 1;

try {
    var savedId = Number(sessionStorage.getItem("patientId"));
    if (savedId > 0) {
        loggedInPatientId = savedId;
    }
} catch (err) {
    //sessionStorage can be blocked by the browser so let us demo patient for now.
}

var loggedInPatientName = "";   //filled in once the profile is loaded

function fullName(p) {
    return p.First + " " + p.Last;
}


//---TALKING-TO-DB.JS---//
// Everything that touches db.js is in this one part. so if any change happens in db this is the only one that will need a fix later.

var databaseReady = false;   

function waitForDatabase() {
    //in the case db.js is not on this page
    if (typeof dbReady === "undefined" || typeof getRecord !== "function") {
        return Promise.resolve(false);
    }

    var ready = dbReady.then(
        function () { return true; },
        function () { return false; }   
    );

    var timeout = new Promise(function (resolve) {
        setTimeout(function () { resolve(false); }, 8000);
    });

    return Promise.race([ready, timeout]);
}

//db.js getRecord() uses a callback and never calls it on an error,
//so this wraps it in a promise with a time limit
function readRecord(storeName, key) {
    return new Promise(function (resolve) {
        var timer = setTimeout(function () { resolve(null); }, 4000);

        try {
            getRecord(storeName, key, function (record) {
                clearTimeout(timer);
                resolve(record);
            });
        } catch (err) {
            clearTimeout(timer);
            resolve(null);
        }
    });
}

//reading every record in a store
async function readAll(storeName) {
    try {
        return await getAllRecords(storeName);
    } catch (err) {
        console.warn("Could not read " + storeName + ":", err);
        return [];
    }
}

//add record.
async function saveRecord(storeName, record) {
    if (databaseReady === false || typeof addRecord !== "function") {
        return false;
    }

    try {
        await addRecord(storeName, record);
        return true; //"true" means "sent", not "100% saved"
    } catch (err) {
        console.warn("Could not save to " + storeName + ":", err);
        return false;
    }
}
//encrypted fields.
var ENCRYPTED_PROFILE_FIELDS = ["NHS", "DOB", "Gender", "Address", "Email", "Telephone"];

//decrypted profile.
async function readProfileFromDatabase(id) {
    if (databaseReady === false) {
        return null;
    }

    var record = await readRecord("patients", id);
    if (record === null) {
        return null;
    }

    try {
        var key = await importKey(localStorage.getItem("storedKey"));
        var profile = Object.assign({}, record);   //a copy, so the stored record is not changed

        for (var i = 0; i < ENCRYPTED_PROFILE_FIELDS.length; i++) {
            var field = ENCRYPTED_PROFILE_FIELDS[i];

            if (typeof profile[field] === "string") {
                profile[field] = await decrypt(profile[field], key);
            }
        }

        return profile;

    } catch (err) {
        console.warn("Could not decrypt the profile, using the JSON file instead:", err);
        return null;
    }
}


//---JSON-FILE-(BACKUP-AND-DEMO-RECORDS)---//

var jsonPromise = null;

//reads ../data/Patients.json once, and remembers the answer
function loadJsonFile() {
    if (jsonPromise === null) {
        jsonPromise = fetch("../data/Patients.json")
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("Could not load patient data.");
                }
                return response.json();   //turn the JSON text into a JavaScript object
            })
            .catch(function (err) {
                console.warn("Patients.json not available:", err);
                return null;
            });
    }

    return jsonPromise;
}


//---PATIENT-DATA---//
// Each function below tries the database first, then the JSON file.

async function getPatientProfile() {
    var fromDatabase = await readProfileFromDatabase(loggedInPatientId);
    if (fromDatabase !== null) {
        return fromDatabase;
    }

    var file = await loadJsonFile();
    if (file !== null && file.patientProfile) {
        var found = file.patientProfile.find(function (p) {
            return p.id === loggedInPatientId;
        });

        return found === undefined ? null : found;
    }

    return null;
}

//Medical History table
async function getMedicalHistory() {
    var rows = [];

    if (databaseReady) {
        var all = await readAll("medicalRecords");

        //the doctor side may save records with different field names, this is a safeguard to avoid conflicts
        rows = all
            .filter(function (r) { return r.patientID === loggedInPatientId; })
            .map(function (r) {
                return {
                    LastCheckIn: r.LastCheckIn || r.date,
                    reason: r.reason || r.diagnosis,
                    status: r.status || "",
                    doctor: r.doctor || r.doctorName || "",
                    department: r.department || "",
                    prescription: r.prescription || "",
                    notes: r.notes || r.treatment || ""
                };
            });
    }

    if (rows.length === 0) {
        var file = await loadJsonFile();

        if (file !== null && file.medicalHistory) {
            rows = file.medicalHistory.filter(function (r) {
                return r.patientId === loggedInPatientId;  
            });
        }
    }

    return rows;
}

// Medical Requests table
async function getMedicalRequests() {
    var rows = [];

    var file = await loadJsonFile();
    if (file !== null && file.medicalRequests) {
        rows = file.medicalRequests.filter(function (r) {
            return r.patientId === loggedInPatientId;
        });
    }

    if (databaseReady) {
        var all = await readAll("appointments");

        all.filter(function (a) { return a.patientID === loggedInPatientId; })
           .forEach(function (a) {
                rows.push({
                    NextAppointment: (a.date + " " + (a.time || "")).trim(),
                    reason: a.reason || a.description,
                    status: a.status,
                    doctor: a.doctorName || "",
                    department: a.department || "",
                    prescription: a.prescription || ""
                });
            });
    }

    //sorting the text sorts the dates
    rows.sort(function (a, b) {
        return String(a.NextAppointment).localeCompare(String(b.NextAppointment));
    });

    return rows;
}


//---PATIENT-PROFILE---//

async function loadPatientData() {
    try {
        //each page only has some of these parts, so check before filling them in
        if (getById("NHS") || getById("patient-name")) {
            var patient = await getPatientProfile();

            if (patient === null) {
                throw new Error("No patient is logged in.");
            }

            loggedInPatientName = fullName(patient);

            if (getById("NHS")) {
                showPersonalDetails(patient);
            }

            if (getById("patient-name")) {
                fillFormDetails(patient);
            }
        }

        if (getById("histTable") || getById("requestTable")) {
            var history = await getMedicalHistory();
            var requests = await getMedicalRequests();
            showMedicalRecords(history, requests);
        }

    } catch (err) {
        console.error("Data Load Error:", err);
        showPageMessage("Sorry, we could not load your details. " + err.message);
    }
}

//load personal details
function showPersonalDetails(patient) {
    getById("NHS").textContent = patient.NHS;
    getById("title").textContent = patient.Title;
    getById("name").textContent = fullName(patient);
    getById("DOB").textContent = patient.DOB;
    getById("gender").textContent = patient.Gender;
    getById("address").textContent = patient.Address;
    getById("email").textContent = patient.Email;
    getById("contact").textContent = patient.Telephone;
}

//booking and prescription forms start with the patient's own name and phone
function fillFormDetails(patient) {
    getById("patient-name").value = fullName(patient);
    getById("patient-name").readOnly = true;

    getById("patient-contact").value = patient.Telephone;
    getById("patient-contact").readOnly = true;
}


//---MEDICAL-RECORD-TABLES--//

//finds the <tbody> to fill. If the HTML has a <div> where a <tbody> should be
//(a <div> cannot live inside a <table>), it uses the real table's own body instead
function getTableBody(sectionId, bodyId) {
    var element = getById(bodyId);

    if (element !== null && element.tagName === "TBODY") {
        return element;
    }

    var table = document.querySelector("#" + sectionId + " table");
    if (table === null) {
        return null;
    }

    return table.tBodies[0] || table.createTBody();
}

function showMedicalRecords(myHistory, myRequests) {
    //med-history
    var historyBody = getTableBody("med-history", "histTable");

    if (historyBody !== null) {
        var historyRows = myHistory.map(function (record) {
            return [
                record.LastCheckIn,
                record.reason,
                record.status,
                record.doctor,
                record.department,
                record.prescription || "None",
                record.notes
            ];
        });
        fillTable(historyBody, historyRows, 7);
    }

    //med-requests
    var requestBody = getTableBody("med-requests", "requestTable");

    if (requestBody !== null) {
        var requestRows = myRequests.map(function (req) {
            return [
                req.NextAppointment,
                req.reason,
                req.status,
                req.doctor,
                req.department,
                req.prescription || "None"
            ];
        });
        fillTable(requestBody, requestRows, 6);
    }
}

//one row per record
function fillTable(tableBody, rows, columnCount) {
    tableBody.innerHTML = "";

    if (rows.length === 0) {
        var emptyRow = createElement("tr");
        var emptyCell = createElement("td");
        emptyCell.colSpan = columnCount;
        emptyCell.textContent = "No records found.";
        emptyRow.appendChild(emptyCell);
        tableBody.appendChild(emptyRow);
        return;
    }

    rows.forEach(function (values) {
        var row = createElement("tr");

        values.forEach(function (value) {
            var cell = createElement("td");
            cell.textContent = value;   //textContent (not innerHTML) so stored text can never run as code
            row.appendChild(cell);
        });

        tableBody.appendChild(row);
    });
}
//--End-of-medical-records--//


//---FORMS---//

const DOCTORS = {
    "Cardiology": ["Dr. Smith", "Dr. Brown"],
    "General Medicine": ["Dr. Johnson"],
    "Neurology": ["Dr. Williams"],
    "Orthopedics": ["Dr. Davis"],
    "Pediatrics": ["Dr. Miller"]
};

//what the patient has picked so far on the booking page
var selectedDepartment = null;
var selectedDateKey = null;
var selectedSlotIndex = null;

function showConfirmation(message, state) {
    var messageBox = getById("confirmation-message");

    messageBox.textContent = message;
    messageBox.dataset.state = state;
    messageBox.hidden = false;
}

//selected doctor
function currentDoctor() {
    var list = getById("doctor");

    if (list === null || list.selectedIndex < 0) {
        return "";
    }

    var option = list.options[list.selectedIndex];
    return option.value === "" ? "" : option.textContent.trim();
}

//the time or date picked earlier no longer fits when the doctor changes
function resetPickedTime() {
    selectedSlotIndex = null;
    selectedDateKey = null;

    if (getById("timeContainer")) {
        getById("timeContainer").hidden = true;
    }

    if (getById("dateGrid")) {
        appointmentCalendar();
    }
}

//department buttons
function setUpDepartmentButtons() {
    var deptButtons = getByClass("dept-btn");

    for (var i = 0; i < deptButtons.length; i++) {
        deptButtons[i].onclick = function () {
            //works with data-department="..." and with the older department="..."
            selectedDepartment = this.dataset.department || this.getAttribute("department");

            markSelected("dept-btn", this);
            showDoctors(selectedDepartment);
        };
    }
}

//showing doctors from the chosen dept.
function showDoctors(department) {
    var doctorList = getById("doctor");
    doctorList.innerHTML = '<option value="" disabled selected></option>';

    (DOCTORS[department] || []).forEach(function (name) {
        var option = createElement("option");
        option.value = name;
        option.textContent = name;
        doctorList.appendChild(option);
    });

    doctorList.selectedIndex = 0;   
    resetPickedTime();
}

//populating the medicine drop-down  from database
async function fillMedicineList() {
    if (databaseReady === false) {
        return;   //keep the list that is already written in the HTML
    }

    var medicines = await readAll("medicines");
    if (medicines.length === 0) {
        return;
    }

    var names = medicines
        .map(function (m) { return m.Drug || m.drug; })
        .filter(function (name) { return name; })
        .sort();

    var list = getById("medicine");
    list.innerHTML = '<option value="" disabled selected></option>';
    names.forEach(function (name) {
        var option = createElement("option");
        option.value = name;
        option.textContent = name;
        list.appendChild(option);
    });

    list.selectedIndex = 0;
}


//---APPOINTMENTS--//


    //---CALENDAR---//

    //initialize calendar
    var today = new Date();
    var currentMonth = today.getMonth();
    var currentYear = today.getFullYear();

    //today at midnight, so that today itself can still be booked
    var startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const HOSPITAL = {
        openDays: [1, 2, 3, 4, 5, 6],
        firstSlot: "09:30", //opening hour
        lastSlot: "17:00", //final appointment slot before closing
        slotDuration: 30
    };

    //times that are already taken, per doctor and day
    var takenSlots = {};

    //date written the way the browser understands
    function makeDateKey(year, month, dayNum) {
        return year + "-" + pad(month + 1) + "-" + pad(dayNum);
    }

    function slotKey(dateKey) {
        return currentDoctor() + "|" + dateKey;
    }

    //every half hour of the day, each marked as booked or free
    function generateTimeSlot(dateKey) {
        var taken = takenSlots[slotKey(dateKey)] || [];
        var slots = [];
        var currentTime = new Date(dateKey + "T" + HOSPITAL.firstSlot);
        var endTime = new Date(dateKey + "T" + HOSPITAL.lastSlot);

        while (currentTime <= endTime) {
            var timeLabel = currentTime.toTimeString().slice(0, 5);   // 24-hour, like 09:30

            slots.push({
                time: timeLabel,
                booked: taken.includes(timeLabel)
            });

            currentTime.setMinutes(currentTime.getMinutes() + HOSPITAL.slotDuration);
        }

        return slots;
    }

    //is there anything on this date?
    function hasBookedSlot(dateKey) {
        var taken = takenSlots[slotKey(dateKey)];
        return taken !== undefined && taken.length > 0;
    }

    //reads the bookings already saved in the database
    async function loadTakenSlots() {
        if (databaseReady === false) {
            return;
        }

        var all = await readAll("appointments");

        all.forEach(function (a) {
            if (a.status === "cancelled" || !a.time || !a.doctorName) {
                return;
            }

            var key = a.doctorName + "|" + a.date;
            takenSlots[key] = (takenSlots[key] || []).concat(a.time);
        });
    }

    function appointmentCalendar() {
        try {
            var calendarHeader = getById("month-year");
            var grid = getById("dateGrid");
            grid.innerHTML = "";

            calendarHeader.textContent = months[currentMonth] + " " + currentYear;

            //no going back to months that have already passed
            getById("prev-month").disabled = (
                currentYear === today.getFullYear()
                && currentMonth === today.getMonth()
            );

            var firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
            var totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

            //create blanks before day one of the month
            for (var i = 0; i < firstDayIndex; i++) {
                var blank = createElement("button");
                blank.type = "button";
                blank.className = "date-box empty";
                blank.disabled = true;
                blank.setAttribute("aria-hidden", "true");
                grid.appendChild(blank);
            }

            for (var day = 1; day <= totalDays; day++) {
                grid.appendChild(makeDateBox(day));
            }
        }

        catch (err) {
            console.log(err); //if something breaks in the calendar it will be caught and logged
        }
    }

    //one clickable day. (A separate function so each button remembers its own day.)
    function makeDateBox(day) {
        var box = createElement("button");
        var boxDate = new Date(currentYear, currentMonth, day);
        var boxKey = makeDateKey(currentYear, currentMonth, day);

        box.type = "button";  //buttons inside a form submit it unless they are told otherwise
        box.className = "date-box";
        box.textContent = day;

        //today
        if (
            day === today.getDate() &&
            currentMonth === today.getMonth() &&
            currentYear === today.getFullYear()
        ) {
            box.classList.add("today");
        }

        //unavailable
        if (!HOSPITAL.openDays.includes(boxDate.getDay()) || boxDate < startOfToday) {
            box.disabled = true;
        }

        if (hasBookedSlot(boxKey)) {
            box.classList.add("has-event");
        }

        //the day the patient is booking
        if (boxKey === selectedDateKey) {
            box.classList.add("selected");
        }

        //  open up the time window
        box.onclick = function () {
            markSelected("date-box", box);
            openTimePicker(boxKey, day);
        };

        return box;
    }

    //time-slots
    function openTimePicker(dateKey, dayNum) {
        var popup = getById("timeContainer");
        var popupTitle = getById("appointmentTime");
        var timeSlotList = getById("timeSlot");

        //a new day was picked, so the old time and old message no longer apply
        selectedDateKey = dateKey;
        selectedSlotIndex = null;
        getById("confirmation-message").hidden = true;

        popupTitle.textContent = "Available Slots: " + months[currentMonth] + " " + dayNum;
        timeSlotList.innerHTML = "";

        var slots = generateTimeSlot(dateKey);

        slots.forEach(function (slot, index) {
            var btn = createElement("button");
            btn.type = "button";
            btn.className = "slot-btn";
            btn.textContent = slot.time;

            if (slot.booked) {
                btn.disabled = true;
            } else {
                btn.onclick = function () {
                    selectedSlotIndex = index;
                    markSelected("slot-btn", btn);
                };
            }

            timeSlotList.appendChild(btn);
        });

        popup.hidden = false;
    }

    //calendar nav-buttons
    function setUpCalendar() {
        var prevBtn = getById("prev-month");
        var nextBtn = getById("next-month");

        prevBtn.addEventListener("click", function () {
            currentMonth--;

            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }

            appointmentCalendar();
        });

        nextBtn.addEventListener("click", function () {
            currentMonth++;

            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }

            appointmentCalendar(); //update calendar
        });

        //the X inside the form is a a plain button that must never submit
        var closeButton = getById("closeModal");
        closeButton.type = "button";
        closeButton.onclick = function () {
            getById("timeContainer").hidden = true;
        };

        //picking another doctor means the times shown may be wrong
        getById("doctor").addEventListener("change", resetPickedTime);

        appointmentCalendar();
    }
    //--End of Calendar Feature--//

    async function bookSlot() {
        var slot = generateTimeSlot(selectedDateKey)[selectedSlotIndex];
        var doctor = currentDoctor();
        var notes = getById("other-notes").value.trim();

        //save it in the database (db.js "appointments" store)
        var saved = await saveRecord("appointments", {
            appointmentID: makeId("APT"),
            patientID: loggedInPatientId,
            patientName: loggedInPatientName,
            doctorID: null,          //filled in later, when doctor.json is added
            doctorName: doctor,
            department: selectedDepartment,
            description: notes || "Appointment",
            reason: notes || "Appointment booking",
            date: selectedDateKey,
            time: slot.time,
            status: "booked"
        });

        //show it as taken straight away
        var key = slotKey(selectedDateKey);
        takenSlots[key] = (takenSlots[key] || []).concat(slot.time);

        if (saved) {
            showConfirmation("All set! See you soon!", "ok");
        } else {
            showConfirmation("Booked on this page, but it could not be saved. Please try again later.", "error");
        }

        selectedSlotIndex = null;
        getById("timeContainer").hidden = true;
        appointmentCalendar();
    }

    function setUpBookingForm() {
        getById("bookingForm").addEventListener("submit", async function (event) {
            event.preventDefault();  //stay on this page, there is no server to send the form to

            if (selectedDepartment === null) {
                showConfirmation("Please choose a department first.", "error");
                return;
            }

            if (selectedSlotIndex === null) {
                showConfirmation("Please pick a date and a time.", "error");
                return;
            }

            await bookSlot();
        });
    }

//--End-of-appointments--//


//---PRESCRIPTION-REQUEST---//

//finds the form even if it has no id yet
function findPrescriptionForm() {
    return getById("prescriptionForm") || document.querySelector("#prescription-form form");
}

// check the dates make sense, save the request, then confirm
function setUpPrescriptionForm(form) {
    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        var lastDose = getById("last-dose").value;
        var refillDate = getById("refill-date").value;

        if (refillDate < lastDose) {
            showConfirmation("The refill date cannot be before your last dose.", "error");
            return;
        }

        var sendButton = form.querySelector("button[type='submit']");
        sendButton.disabled = true;   //stops a double click sending it twice

        /*a prescription request is saved in the same store as appointments,
        so it shows up in the Medical Requests table*/

        var saved = await saveRecord("appointments", {
            appointmentID: makeId("RX"),
            patientID: loggedInPatientId,
            patientName: loggedInPatientName,
            doctorID: null,
            doctorName: getById("doctor").options[getById("doctor").selectedIndex].textContent.trim(),
            department: "",
            description: "Prescription request",
            reason: "Prescription request",
            prescription: getById("medicine").value,
            lastDose: lastDose,
            date: refillDate,
            time: "",
            status: "requested"
        });

        if (saved) {
            showConfirmation("Request sent!", "ok");
            //clear the form, but keep the patient's own name and phone filled in
            var nameText = getById("patient-name").value;
            var phoneText = getById("patient-contact").value;

            form.reset();

            getById("patient-name").value = nameText;
            getById("patient-contact").value = phoneText;
            getById("doctor").selectedIndex = 0;     //reset() would pick the first real option
            getById("medicine").selectedIndex = 0;
        } else {
            showConfirmation("We could not save your request. Please try again later.", "error");
        }

        sendButton.disabled = false;
    });
}

//--End-of-forms--//


//---START---//
// buttons start working straight away
//populating the page with data once database is ready.

async function loadEverything() {
    databaseReady = await waitForDatabase();

    await loadPatientData();

    if (getById("dateGrid")) {
        await loadTakenSlots();
        appointmentCalendar();
    }

    if (getById("medicine")) {
        await fillMedicineList();
    }
}

function startPage() {
    //each part only starts if its page has it
    if (getById("dateGrid")) {
        setUpDepartmentButtons();
        setUpCalendar();
        setUpBookingForm();
    }

    var prescriptionForm = findPrescriptionForm();
    if (prescriptionForm !== null) {
        setUpPrescriptionForm(prescriptionForm);
    }

    loadEverything().catch(function (err) {
        console.error("Page start-up problem:", err);
        showPageMessage("Something went wrong while loading this page.");
    });
}

//wait until the whole page (and db.js) has loaded before starting
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startPage);
} else {
    startPage();
}

//--End-of-patient-dashboard--//

} )();