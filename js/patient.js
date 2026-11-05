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
    if (PATIENT_ID === null) {
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

let userid;
let username;
let role;

document.addEventListener("DOMContentLoaded", async () => {
    const session = await requireRole("patient");

    if (!session) return;

    const {userid, username, role} = session;
    
    loadPatientDashboard().catch((error) => {
        console.error("Failed to load patient dashboard: ", error);
    });
});

// Appointments
function setupBooking(session) {

    const bookingForm = $("bookingForm");
    const doctorSelect = $("doctor");
    const dateInput = $("date");
    const timeInput = $("appointmentTime");
    const notesInput = $("other-notes");
    const confirmation = $("confirmation-message");

    if (!bookingForm || !doctorSelect || !dateInput ||
        !timeInput || !notesInput || !confirmation) {
        console.error("One or more booking form elements are missing.");
        return;
    }

    let selectedDepartment = "";

    // Set minimum date to today
    const today = new Date();

    const localDate = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0")
    ].join("-");

    dateInput.min = localDate;

    // Department selection
    document.querySelectorAll(".dept-btn").forEach(button => {

        button.addEventListener("click", () => {

            selectedDepartment = button.getAttribute("department");

            document.querySelectorAll(".dept-btn").forEach(btn => {
                btn.classList.remove("selected");
            });

            button.classList.add("selected");

            // Filter doctors
            const doctors = Array.from(doctorSelect.options);

            doctors.forEach(option => {

                if (!option.value) return;

                const department = option.textContent.split(" - ")[1];

                option.hidden = department !== selectedDepartment;

            });

            // Reset doctor selection
            doctorSelect.value = "";

        });

    });

    // Handle appointment submission
    bookingForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        try {

            const doctorName = doctorSelect.value;
            const date = dateInput.value;
            const time = timeInput.value;
            const description = notesInput.value.trim();

            // Validate doctor
            if (!doctorName) {
                alert("Please select a doctor.");
                return;
            }

            // Validate date
            if (!date || date < localDate) {
                alert("Please select a valid appointment date.");
                return;
            }

            // Validate time
            if (!time) {
                alert("Please select an appointment time.");
                return;
            }

            // Get patient session
            if (!session) {
                alert("Your session has expired. Please log in again.");
                return;
            }

            // Get doctor records
            const doctors = await getAllRecords("doctors");

            const doctor = doctors.find(d => doctorName === d.doctorName);

            if (!doctor) {
                alert("Doctor record could not be found.");
                return;
            }

            // Register appointment
            await registerAppointment({

                patientID: session.userId,

                patientName: await (async () => {
                    const patients = await getAllRecords("patients");

                    const patient = patients.find(p =>
                        String(p.patientID) === String(session.userId)
                    );

                    if (!patient) {
                        throw new Error("Patient record could not be found.");
                    }

                    return fullName(patient);
                })(),

                doctorID: doctor.doctorID,

                doctorName: doctorName,

                department: selectedDepartment,

                description: description,

                date: date,

                time: time,

                status: "pending"

            });

            // Display confirmation
            confirmation.hidden = false;

            confirmation.textContent =
                "Appointment request submitted successfully!";

            // Reset form
            bookingForm.reset();

            // Reset department selection
            selectedDepartment = "";

            document.querySelectorAll(".dept-btn").forEach(btn => {
                btn.classList.remove("selected");
            });

            // Show all doctors again
            Array.from(doctorSelect.options).forEach(option => {
                option.hidden = false;
            });

            dateInput.min = localDate;

        } catch (error) {

            console.error("Appointment booking failed:", error);

            alert(error.message || "Something went wrong while booking your appointment.");

        }

    });
}

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



// Page Setup
document.addEventListener("DOMContentLoaded", async () => {

    const session = await requirePatient(); // redirects if not a logged-in patient

    if (!session) return;


    setupBooking(session);

    try {

        await dbReady;

        // 1. Look the patient up by the ID saved in the session
        const id = Number(session.sess_uid);

        if (!Number.isInteger(id)) {
            console.error("Session has no valid patient id:", session.sess_uid);
            showError("Could not load your profile. Please log in again.");
            return;
        }

        const patient = await getOne("patients", id);

        if (!patient) {
            showError("We could not find your profile. Please log in again.");
            return;
        }

        // 2. Check the record really belongs to the username (email) saved in the session
        const email = await decryptField(patient.Email);

        if (
            String(session.username).trim().toLowerCase() !==
            String(email).trim().toLowerCase()
        ) {
            console.error("Session username does not match the patient record. Logging out.");
            logout();
            return;
        }

        // 3. Render personal details
        await renderProfile(patient, email);

        // 4. Render the logged-in patient's medical records
        await renderSelectedFields(
            "medicalRecords",
            id,
            [
                "medicalRecordID",
                "doctorID",
                "diagnosis",
                "treatment",
                "date",
                "time"
            ],
            "medicalRecordsBody",
            ["diagnosis", "treatment"])

        // 5. Render the logged-in patient's appointments
        await renderSelectedFields(
            "appointments",
            id,
            [
                "appointmentID",
                "doctorName",
                "description",
                "date",
                "time",
                "status"
            ],
            "appointmentsBody",
            ["description"]
        );

    } catch (err) {

        console.error("Patient dashboard failed to load:", err);

        showError("Something went wrong loading your dashboard.");

    }
});

document.getElementById("yourButtonID").addEventListener("click", function () {
    FormData = {
        email: 
        password
    }
    
    yourFunction();
});