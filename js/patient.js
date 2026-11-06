//JS for the Patient Related Pages
const $ = (id) => document.getElementById(id);

//Creating the full name by combining title, first name and last name
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

//Elements expected
const IDS = {
    welcome: "welcomeName",            
    appointmentsHead: "appointmentsHead",
    appointmentsBody: "appointmentsBody",   
    recordsBody: "medicalRecordsBody"       
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

//Displaying a message in the Table
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

//Getting the encryption key that is stored in local storage
async function getDataKey() {
    if (!dataKeyPromise) {
        const stored = localStorage.getItem("storedKey");
        if (!stored) throw new Error("Encryption key is missing from localStorage");
        dataKeyPromise = importKey(stored);
    }
    return dataKeyPromise;
}

//decryption function
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
    //Decrypting the fields
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

    //Assigning values to ids
    set(PROFILE_IDS.NHS, nhs);
    set(PROFILE_IDS.Title, patient.Title);
    set(PROFILE_IDS.name, fullName(patient));
    set(PROFILE_IDS.DOB, dob);
    set(PROFILE_IDS.Gender, gender);
    set(PROFILE_IDS.Address, address);
    set(PROFILE_IDS.Email, email);
    set(PROFILE_IDS.Telephone, phone);
}

//Welcome Function
function showWelcome(patientKey) {
    getRecord("patients", patientKey, (record) => {
        const el = document.getElementById(IDS.welcome);
        if (!el || record === null) return;

        el.textContent = `Welcome, ${fullName(record)}`;
    });
}

// Extracting certain fields from an Object Store 
async function renderSelectedFields(storeName, patientID, attributes, tbodyId, encryptedFields = []) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) {
        console.error(`Element ${tbodyId} not found`);
        return;
    }

    //Getting all the records from the Object Store
    const records = await getAllRecords(storeName);
    const patientRecords = records.filter((r) => String(r.patientID) === String(patientID));

    if (patientRecords.length === 0) {
        console.log(`No records found in ${storeName}!`);
        return; // the caller's "no records" row stays visible
    }

    const key = await loadDataKey();
    tbody.replaceChildren();

    //Adding each record to the table
    for (const record of patientRecords) {
        const data = pickAttributes(record, attributes);
        await decryptFields(data, encryptedFields, key);
        addRow(tbody, data, attributes);
    }
}

//Loading the patient dashboard
async function loadPatientDashboard(patientKey) {
    await dbReady;

    showMessageRow(IDS.appointmentsBody, APPOINTMENT_FIELDS.length, "No appointments found.");
    showMessageRow(IDS.recordsBody, RECORD_FIELDS.length, "No medical records found.");

    //Profile details
    const patient = await findRecord("patients", patientKey);

    if (patient) {
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

//Executed once the page loads
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

//Book Appointments
document.addEventListener("DOMContentLoaded", () => {
    const bookBtn = document.getElementById("book-appointment");

    if (!bookBtn) return;
    
    bookBtn.addEventListener("click", async () => {
    console.log(currentUserId);
    const patient_info = await findRecord("patients", 1);
    const now = new Date();
    const appointment = {
        
        patientID: patient_info.id,
        patientName: `${patient_info.first_name} ${patient_info.last_name}`,

        doctorID: document.getElementById("doctor").value,
        doctorName: document.getElementById("doctor").options[
            document.getElementById("doctor").selectedIndex
        ].text,

        description: document.getElementById("description").value,

        date: now.toISOString().split("T")[0],
        time: now.toLocaleTimeString("en-GB"),

        status: "Confirmed"
    };

    console.log(appointment);
});


});


//Request Prescriptions
document.addEventListener("DOMContentLoaded", () => {
    getPresc = document.getElementById("prescriptionForm");

    if (!getPresc) return;

    getPresc
        .addEventListener("submit", async (event) => {

            event.preventDefault();

            const doctor = document.getElementById("doctor").value;
            const medicine = document.getElementById("medicine").value;

            if (!doctor || !medicine) {
                alert("Please select a doctor and medication.");
                return;
            }

            const prescription = {
                patientID: patient_info.id,
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

// Event Listener for the Change Password button
const changePasswordBtn = document.getElementById("changePasswordButton");
const oldPasswordInput = document.getElementById("currentPassword");
const newPasswordInput = document.getElementById("newPassword");
const confirmPasswordInput = document.getElementById("confirmNewPassword");

if (changePasswordBtn) {
    changePasswordBtn.addEventListener("click", async (event) => {
        renderPasswordError("");
        event.preventDefault();
        const passwordChangeConfirmation = await changePassword("patientsCred", currentUserId, oldPasswordInput.value, newPasswordInput.value, confirmPasswordInput.value);
        
        if (passwordChangeConfirmation) {
            logout();
        } else {
            renderPasswordError("Error with changing Password. Check console for more information.");
        }
        
        
    });
}

// Event Listener for the Export Data button
const exportDataBtn = document.getElementById("export-btn");
if (exportDataBtn) {
    exportDataBtn.addEventListener("click", async (event) => {
        event.preventDefault();

        const session = await getSession();
        try {
            const success = await exportPatientAllInfo({
                id: session.userId
            });

            if (success) {
                console.log("Patient data exported successfully!");
            }

        } catch (error) {
            console.error(error);
        }
    });
}


// Event Listener for the Presciption Request Form
const prescriptionBtn = document.getElementById("prescriptionBtn");
if (prescriptionBtn) {
    prescriptionBtn.addEventListener("click", async (event) => {
        event.preventDefault();

        const session = await getSession();
        try {
            const doctor = document.getElementById("doctor");
            const medicine = document.getElementById("medicine");

            if (doctor && medicine){
                if (doctor.value && medicine.value) {
                    console.log(doctor.value, medicine.value)
                    renderMedicineError("")
                } else {
                    renderMedicineError("Please fill in all the details!")
                }
            }

        } catch (error) {
            console.error(error);
        }
    });
}