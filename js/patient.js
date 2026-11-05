//Patient dashboard: fills the page using the rendering helpers in db.js
//Load order in the HTML:  encryption.js, db.js, auth.js, patient.js

//Short helper for document.getElementById
const $ = (id) => document.getElementById(id);

//"Mr John Smith" (Title, First and Last are stored in plaintext)
function fullName(patient) {
    return [patient.Title, patient.First, patient.Last].filter(Boolean).join(" ");
}


// Decrypts the listed fields of a picked record (in place)
async function decryptFields(data, encryptedFields, key) {
    for (const field of encryptedFields) {
        if (typeof data[field] === "string" && data[field] !== "") {
            try {
                data[field] = await decrypt(data[field], key);
            } catch (err) {
                console.error(`Could not decrypt "${field}":`, err);
                data[field] = "[decryption failed]";
            }
        }
    }
}

//Elements this script expects in the page (rename here if yours differ)
const IDS = {
    welcome: "welcomeName",             //e.g. <h1 id="welcomeName"></h1>
    appointmentsHead: "appointmentsHead",
    appointmentsBody: "appointmentsBody",   //<tbody id="appointmentsBody">
    recordsBody: "medicalRecordsBody"       //<tbody id="medicalRecordsBody">
};

//Which element id shows which profile value 
const PROFILE_IDS = {
    NHS: "NHS",
    Title: "title",
    name: "name",
    DOB: "DOB",
    Gender: "gender",
    Address: "address",
    Email: "email",
    Telephone: "contact"
};

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

//Decrypts one stored field with the data key kept in localStorage
let dataKeyPromise = null;

async function getDataKey() {
    if (!dataKeyPromise) {
        const stored = localStorage.getItem("storedKey");
        if (!stored) throw new Error("Encryption key is missing from localStorage");
        dataKeyPromise = importKey(stored);
    }
    return dataKeyPromise;
}

async function decryptField(value, context) {
    if (typeof value !== "string" || value === "") return "";
    try {
        return await decrypt(value, await getDataKey(), context);
    } catch (err) {
        console.error("Could not decrypt a profile field:", err);
        return "[decryption failed]";
    }
}

//Shows a dash for empty values
const dash = (value) =>
    value === undefined || value === null || String(value).trim() === "" ? "\u2014" : value;



//Fills the profile section of the page
async function renderProfile(patient) {
    const [nhs, dob, gender, address, email, phone] = await Promise.all([
        decryptField(patient.NHS, ""),
        decryptField(patient.DOB, ""),
        decryptField(patient.Gender, ""),
        decryptField(patient.Address, ""),
        decryptField(patient.Email, "email"),
        decryptField(patient.Telephone, "")
    ]);

    const set = (id, value) => {
        const el = $(id);

        if (el) {
            el.textContent = dash(value);
        } else {
            console.warn(`Profile element #${id} was not found in the page.`);
        }
    };

    set(PROFILE_IDS.NHS, nhs);
    set(PROFILE_IDS.Title, patient.Title);
    set(PROFILE_IDS.name, fullName(patient));
    set(PROFILE_IDS.DOB, dob);
    set(PROFILE_IDS.Gender, gender);
    set(PROFILE_IDS.Address, address);
    set(PROFILE_IDS.Email, email);
    set(PROFILE_IDS.Telephone, phone);
}

//"Welcome, Mr John Smith"
function showWelcome(patientKey) {
    getRecord("patients", patientKey, (record) => {
        const el = document.getElementById(IDS.welcome);
        if (!el || record === null) return;

        el.textContent = `Welcome, ${fullName(record)}`;
    });
}

// Table of one patient's rows from a store (appointments, medicalRecords)
async function renderSelectedFields(storeName, patientID, attributes, tbodyId, encryptedFields = []) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) {
        console.error(`Element ${tbodyId} not found`);
        return;
    }

    const records = await getAllRecords(storeName);
    const patientRecords = records.filter((r) => String(r.patientID) === String(patientID));

    if (patientRecords.length === 0) {
        console.log(`No records found in ${storeName}!`);
        return; // the caller's "no records" row stays visible
    }

    const key = await loadDataKey();
    tbody.replaceChildren();

    for (const record of patientRecords) {
        const data = pickAttributes(record, attributes);
        await decryptFields(data, encryptedFields, key);
        addRow(tbody, data, attributes);
    }
}

async function loadPatientDashboard(patientKey) {
    //The database is seeded asynchronously on first load, so wait for it
    await dbReady;

    showMessageRow(IDS.appointmentsBody, APPOINTMENT_FIELDS.length, "No appointments found.");
    showMessageRow(IDS.recordsBody, RECORD_FIELDS.length, "No medical records found.");

    //Profile details
    const patient = await findRecord("patients", patientKey);

    if (patient) {
        console.log("EMAIL ENCRYPTION DEBUG:", {
            email: patient.Email,
            emailType: typeof patient.Email,
            emailLength: patient.Email?.length,
            storedKeyExists: !!localStorage.getItem("storedKey")
        });
        await renderProfile(patient);
    } else {
        console.error("No patient record found for id:", patientKey);
    }

    //Appointments table (rows whose patientID matches)
    await renderSelectedFields(
        "appointments", patientKey, APPOINTMENT_FIELDS, IDS.appointmentsBody, APPOINTMENT_ENCRYPTED
    );

    //Medical records table (rows whose patientID matches)
    await renderSelectedFields(
        "medicalRecords", patientKey, RECORD_FIELDS, IDS.recordsBody, RECORD_ENCRYPTED
    );
}

let currentUserId;
let currentUsername;
let currentRole;

document.addEventListener("DOMContentLoaded", async () => {
    const session = await requireRole("patient"); // redirects if not a logged-in patient

    if (!session) return;

    //The session id is stored as a string, but the patients store uses numeric keys
    currentUserId = Number(session.userId);
    currentUsername = session.username;
    currentRole = session.role;

    if (!Number.isInteger(currentUserId)) {
        console.error("Session has no valid patient id:", session.userId);
        logout();
        return;
    }

    await dbReady;

    showWelcome(currentUserId);

    try {
        if (document.getElementById(IDS.appointmentsBody)) {
            await loadPatientDashboard(currentUserId);
        }
    } catch (error) {
        console.error("Dashboard load failed", error);
    }

    if (document.getElementById("bookingForm")) {
        setupBooking(session);
    }
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

            // Get doctor records. Stored doctors have first_name / last_name
            // (there is no doctorName field), so match on the name without "Dr."
            const doctors = await getAllRecords("doctors");

            const wanted = doctorName.replace(/^dr\.?\s*/i, "").trim().toLowerCase();
            const doctor = doctors.find(d =>
                `${d.first_name} ${d.last_name}`.toLowerCase() === wanted
            );

            if (!doctor) {
                alert("Doctor record could not be found.");
                return;
            }

            // Look the patient up directly by key (the patients store key is "id")
            const patient = await findRecord("patients", Number(session.userId));

            if (!patient) {
                throw new Error("Patient record could not be found.");
            }

            // Register appointment
            await registerAppointment({

                patientID: session.userId,

                patientName: fullName(patient),

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

            // Refresh the appointments table so the new booking appears
            await renderSelectedFields(
                "appointments", currentUserId, APPOINTMENT_FIELDS, IDS.appointmentsBody, APPOINTMENT_ENCRYPTED
            );

        } catch (error) {

            console.error("Appointment booking failed:", error);

            alert(error.message || "Something went wrong while booking your appointment.");

        }

    });
}

//Medical Records


// Prescriptions


//Book Appointments
const now = new Date();
const appointment = {

    patientID: profile[PROFILE_IDS.NHS],
    patientName: `${profile[PROFILE_IDS.Title]} ${profile[PROFILE_IDS.name]}`,

    doctorID: document.getElementById("doctor").value,
    doctorName: document.getElementById("doctor").options[
        document.getElementById("doctor").selectedIndex
    ].text,

    description: document.getElementById("description").value,

    date: now.toISOString().split("T")[0],
    time: now.toLocaleTimeString("en-GB"),

    status: "Confirmed"
};

//Request Prescriptions
document.addEventListener("DOMContentLoaded", () => {

    document.getElementById("prescriptionForm")
        .addEventListener("submit", async (event) => {

            event.preventDefault();

            const doctor = document.getElementById("doctor").value;
            const medicine = document.getElementById("medicine").value;

            if (!doctor || !medicine) {
                alert("Please select a doctor and medication.");
                return;
            }

            const prescription = {
                patientID: profile[PROFILE_IDS.NHS],
                doctor,
                medication: medicine
            };

            console.log(prescription);
        });

});

// Delete Account with All Info
async function deleteAccount() {

    const confirmation = confirm(
        "Are you sure you want to delete your account?\n\n" +
        "This will permanently delete your profile, credentials, " +
        "appointments and associated medical records.\n\n" +
        "This action cannot be undone."
    );

    if (!confirmation) return;

    try {

        const result = await deletePatientAllInfo({
            id: currentUserId
        });

        if (result.success) {

            alert("Your account and all associated information have been deleted.");

            logout();

        }

    } catch (error) {

        console.error("Error deleting account:", error);

        alert(
            "An error occurred while trying to delete your account. " +
            "Please try again later."
        );

    }
}


// Event Listener for the Delete Account button
const deleteAccountBtn = document.getElementById("deleteAccountButton");

if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener("click", (event) => {
        event.preventDefault();
        deleteAccount();
    });
}