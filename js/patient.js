
// patient.js: dashboard logic for patient_page.html
// Load AFTER encryption.js, db.js and auth.js.
// Everything is wrapped in a function so it can't clash with globals in db.js / auth.js / script.js.
(() => {
    "use strict";

    // ---------- Helpers ----------
    const $ = (id) => document.getElementById(id);

    // db.js getRecord is callback-based, so wrap it in a promise
    const getOne = (store, key) => new Promise((resolve) => getRecord(store, key, resolve));

    // db.js searchByIndex only logs to the console, so this returns the rows instead
    async function getByIndex(storeName, indexName, value) {
        const database = await openDatabase();

        try {
            return await new Promise((resolve, reject) => {
                const req = database
                    .transaction(storeName, "readonly")
                    .objectStore(storeName)
                    .index(indexName)
                    .getAll(value);

                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        } finally {
            database.close();
        }
    }

    let aesKey = null;

    async function decryptField(value) {
        if (typeof value !== "string" || value === "") return value ?? "";

        try {
            if (!aesKey) aesKey = await importKey(localStorage.getItem("storedKey"));
            return await decrypt(value, aesKey);
        } catch (err) {
            console.error("Could not decrypt a value:", err);
            return "[could not decrypt]";
        }
    }

    const dash = (v) => (v === undefined || v === null || v === "" ? "\u2014" : v);

    // "2026-11-04" -> "04/11/2026" (leaves anything else as stored)
    function formatDate(d) {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d ?? "");
        return m ? `${m[3]}/${m[2]}/${m[1]}` : d ?? "";
    }

    const when = (r) => [formatDate(r.date), r.time].filter(Boolean).join(" ");
    const toTime = (r) => new Date(`${r.date}T${r.time || "00:00"}`).getTime();

    const fullName = (p) => [p.First, p.Last].filter(Boolean).join(" ");

    // Safe table filling: textContent only, never innerHTML
    function fillTable(tbodyId, rows, columns, emptyText) {
        const tbody = $(tbodyId);
        if (!tbody) return;

        tbody.replaceChildren();

        if (!rows.length) {
            const td = document.createElement("td");
            td.colSpan = columns;
            td.textContent = emptyText;
            tbody.appendChild(document.createElement("tr")).appendChild(td);
            return;
        }

        for (const values of rows) {
            const tr = tbody.insertRow();
            for (const v of values) tr.insertCell().textContent = dash(v);
        }
    }

    function showError(text) {
        const box = $("personal-details");
        if (!box) return;

        const p = document.createElement("p");
        p.setAttribute("role", "alert");
        p.textContent = text;
        box.prepend(p);
    }

    // ---------- Personal details (patients store) ----------
    async function renderProfile(patient, email, id) {

        const [nhs, dob, gender, address, phone] = await Promise.all(
            [patient.NHS, patient.DOB, patient.Gender, patient.Address, patient.Telephone].map(decryptField)
        );

        const set = (id, value) => {
            const el = $(id);
            if (el) el.textContent = dash(value);
        };

        set("NHS", nhs);
        set("title", patient.Title);
        set("name", fullName(patient));
        set("DOB", dob);
        set("gender", gender);
        set("address", address);
        set("email", email);
        set("contact", phone);

        // Display all selected medical record fields for this patient
        await renderSelectedFields(
            "medicalRecords",
            id,
            ["medicalRecordID", "doctorID", "diagnosis", "treatment", "date", "time"],
            "medicalRecordsBody",
            ["diagnosis", "treatment"]
        );
    }

    // ---------- Appointment Booking ----------

    function setupBooking(session) {

        const bookingForm = $("bookingForm");
        const doctorSelect = $("doctor");
        const dateInput = $("date");
        const timeInput = $("time");
        const notesInput = $("other-notes");
        const confirmation = $("confirmation-message");

        if (!bookingForm) return;

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

                // Highlight selected department
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

                // Validate department
                if (!selectedDepartment) {
                    alert("Please select a department.");
                    return;
                }

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

                // Get doctor record
                const doctors = await getAllRecords("doctors");

                const doctor = doctors.find(d =>
                    doctorName === `Dr. ${fullName(d)}` ||
                    doctorName === `Dr ${fullName(d)}`
                );

                if (!doctor) {
                    alert("Doctor record could not be found.");
                    return;
                }

                // Prepare appointment record
                const appointment = {

                    patientID: String(session.userId),

                    doctorID: doctor.doctorID,

                    doctorName: doctorName,

                    department: selectedDepartment,

                    date: date,

                    time: time,

                    description: description,

                    status: "Pending"

                };

                // Add appointment record to IndexedDB
                await addRecord("appointments", appointment);

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

                alert("Something went wrong while booking your appointment.");

            }

        });

    }

    // ---------- Page setup ----------
    document.addEventListener("DOMContentLoaded", async () => {

        const session = await requirePatient(); // redirects if not a logged-in patient
        if (!session) return;

        setupBooking(session);

        try {

            await dbReady;

            // 1. Look the patient up by the id saved in the session
            const id = Number(session.userId);

            if (!Number.isInteger(id)) {
                console.error("Session has no valid patient id:", session.userId);
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

            if (String(session.username).trim().toLowerCase() !== String(email).trim().toLowerCase()) {
                console.error("Session username does not match the patient record. Logging out.");
                logout();
                return;
            }

            // 3. Render
            const doctors = await getAllRecords("doctors");
            const doctorsById = new Map(doctors.map((d) => [String(d.doctorID), d]));

            // Pass the same patient ID into renderProfile
            await renderProfile(patient, email, id);

            await renderTables(String(id), doctorsById); // appointments/records store patientID as a string

        } catch (err) {

            console.error("Patient dashboard failed to load:", err);
            showError("Something went wrong loading your dashboard.");

        }

    });

})();
