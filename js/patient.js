//Patient dashboard: fills the page using the rendering helpers in db.js
//Load order in the HTML:  encryption.js, db.js, patientDashboard.js

//CHANGE THIS to match however auth.js stores the logged-in patient after login.
//It must be the patient's "id" (the key of the patients store).
const PATIENT_ID = sessionStorage.getItem("sess_uid") || null;

//Elements this script expects in the page (rename here if yours differ)
const IDS = {
    welcome: "welcomeName",             //e.g. <h1 id="welcomeName"></h1>
    profileCard: "patientCard",         //e.g. <div id="patientCard"></div>
    appointmentsHead: "appointmentsHead",
    appointmentsBody: "appointmentsBody",   //<tbody id="appointmentsBody">
    recordsBody: "medicalRecordsBody"       //<tbody id="medicalRecordsBody">
};

//Fields to show (in column order) and which of them are stored encrypted
const PROFILE_FIELDS = ["NHS", "DOB", "Gender", "Address", "Email", "Telephone"];
const PROFILE_ENCRYPTED = ["NHS", "DOB", "Gender", "Address", "Email", "Telephone"];

const APPOINTMENT_FIELDS = ["appointmentID", "doctorName", "description", "date", "time", "status"];
const APPOINTMENT_ENCRYPTED = ["description"];

const RECORD_FIELDS = ["medicalRecordID", "doctorID", "diagnosis", "treatment", "date", "time"];
const RECORD_ENCRYPTED = ["diagnosis", "treatment"];

//Puts a single message row in a table body. renderSelectedFields replaces it
//when there are records, so it stays visible only when there are none.
function showMessageRow(tbodyId, columns, message) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    tbody.replaceChildren();
    const cell = tbody.insertRow().insertCell();
    cell.colSpan = columns;
    cell.textContent = message;
}

//"Welcome, Mr John Smith" (Title, First and Last are stored in plaintext)
function showWelcome(patientKey) {
    getRecord("patients", patientKey, (record) => {
        const el = document.getElementById(IDS.welcome);
        if (!el || record === null) return;

        const name = [record.Title, record.First, record.Last].filter(Boolean).join(" ");
        el.textContent = `Welcome, ${name}`;
    });
}

async function loadPatientDashboard() {
    //The database is seeded asynchronously on first load, so wait for it
    await dbReady;

    //Not logged in (or a bad value) -> back to the login page
    if (PATIENT_ID === null || isNaN(Number(PATIENT_ID))) {
        window.location.href = "login_page.html";
        return;
    }

    //The patients store uses a numeric auto-increment key
    const patientKey = Number(PATIENT_ID);

    showMessageRow(IDS.appointmentsBody, APPOINTMENT_FIELDS.length, "No appointments found.");
    showMessageRow(IDS.recordsBody, RECORD_FIELDS.length, "No medical records found.");

    showWelcome(patientKey);

    //Profile card
    await renderSelectedFieldsAsCard(
        "patients", patientKey, PROFILE_FIELDS, IDS.profileCard, PROFILE_ENCRYPTED
    );

    //Appointments table (rows whose patientID matches)
    await renderSelectedFields(
        "appointments", patientKey, APPOINTMENT_FIELDS, IDS.appointmentsBody, APPOINTMENT_ENCRYPTED
    );

    //Medical records table (rows whose patientID matches)
    await renderSelectedFields(
        "medicalRecords", patientKey, RECORD_FIELDS, IDS.recordsBody, RECORD_ENCRYPTED
    );
}

document.addEventListener("DOMContentLoaded", () => {
    loadPatientDashboard().catch((error) => {
        console.error("Failed to load patient dashboard: ", error);
    });
});

// Appointments


//Medical Records


// Personal Records
async function renderProfile(patient, email) {

    const [nhs, dob, gender, address, phone] = await Promise.all(
        [
            patient.NHS,
            patient.DOB,
            patient.Gender,
            patient.Address,
            patient.Telephone
        ].map(decryptField)
    );

    const set = (id, value) => {
        const el = $(id);

        if (el) {
            el.textContent = dash(value);
        }
    };

    set("NHS", nhs);
    set("title", patient.Title);
    set("name", fullName(patient));
    set("DOB", dob);
    set("gender", gender);
    set("address", address);
    set("email", email);
    set("contact", phone);
}

// Prescriptions