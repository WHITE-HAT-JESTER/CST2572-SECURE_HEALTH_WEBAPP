const DB_NAME = "XHospitalDB";
const DB_VERSION = 1;
let db;
let cryptoKey = null;


const unwrap = (data) => {
    if (Array.isArray(data)) return data;
    const firstArray = Object.values(data).find(Array.isArray);
    return firstArray ?? Object.values(data);
};

// ---------- Fetching the JSON files ----------
//Fetching the json files
let patients, doctors, medicines, admins, doctorsCred, patientsCred;
async function fetchData () {
    try {
        const responses = await Promise.all([
        fetch("https://raw.githubusercontent.com/sajjadalijuma-design/securewebtech_data/main/data/Patients.json"),
        fetch("https://raw.githubusercontent.com/sajjadalijuma-design/securewebtech_data/main/data/doctor.json"),
        fetch("https://raw.githubusercontent.com/sajjadalijuma-design/securewebtech_data/main/data/Medicines.json"),
        fetch("https://raw.githubusercontent.com/sajjadalijuma-design/securewebtech_data/main/data/Admin.json"),
        fetch("https://raw.githubusercontent.com/sajjadalijuma-design/securewebtech_data/main/data/doctors_cred.json"),
        fetch("https://raw.githubusercontent.com/sajjadalijuma-design/securewebtech_data/main/data/patients_cred.json"),
        fetch("https://raw.githubusercontent.com/sajjadalijuma-design/securewebtech_data/main/data/Appointments.json"),
        fetch("https://raw.githubusercontent.com/sajjadalijuma-design/securewebtech_data/main/data/MedicalRecords.json")
        ]);

        responses.forEach((response) => {
            if (!response.ok) {
                throw new Error(`Failed to fetch ${response.url} (HTTP ${response.status})`);
            }

        });

        const [patientsResponse, doctorsResponse, medicinesResponse, adminsResponse, doctorsCredResponse, patientsCredResponse, appointmentsResponse, medicalRecordsResponse] = responses;

        [patients, doctors, medicines, admins, doctorsCred, patientsCred, appointments, medicalRecords] = await Promise.all(
            [patientsResponse.json(),
                doctorsResponse.json(),
                medicinesResponse.json(),
                adminsResponse.json(),
                doctorsCredResponse.json(),
                patientsCredResponse.json(),
                appointmentsResponse.json(),
                medicalRecordsResponse.json()
            ]
        );

        doctorsCred = unwrap(doctorsCred);
        patientsCred = unwrap(patientsCred);

        //Ensure each file is an array
        const files = {patients, doctors, medicines, admins, doctorsCred, patientsCred, appointments, medicalRecords};

        for (const [name, data] of Object.entries(files)) {
            if (!Array.isArray(data)) {
                throw new Error(`${name}.json is not an array`);
            }
        }

        return {patients, doctors, medicines, admins, doctorsCred, patientsCred, appointments, medicalRecords};

    } catch (error) {
        console.error("Failed to load JSON data: ", error);
        throw error;
    }
}

//JSON Field IDs
const JSON_ID_FIELD = {
    patients: "id",
    doctors: "doctorID",
    medicines: "medicineID",
    admins: "username",
    doctorsCred: "id",
    patientsCred: "id",
    appointments: "appointmentID",
    medicalRecords: "medicalRecordID"
}

// DATABASE SETUP

//Open or Create the Database
function openDatabase() {
    return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
        console.error("Error opening database:", request.error);
        reject(request.error);
    };

    request.onsuccess = () => {
        console.log("Database opened successfully!");
        resolve(request.result);
    };

    request.onblocked = () => {
        reject(new Error("Database is blocked by another open tab"));
    }

    request.onupgradeneeded = (event) => {
        const db = event.target.result;

        //Patients
        if (!db.objectStoreNames.contains("patients")) {
            const patientsStore = db.createObjectStore("patients", { keyPath: "id", autoIncrement: true });

            patientsStore.createIndex("NHS", "NHS", { unique: true });
            patientsStore.createIndex("Title", "Title", { unique: false });
            patientsStore.createIndex("First", "First", { unique: false });
            patientsStore.createIndex("Last", "Last", { unique: false });
            patientsStore.createIndex("DOB", "DOB", { unique: false });
            patientsStore.createIndex("Gender", "Gender", { unique: false });
            patientsStore.createIndex("Address", "Address", { unique: false });
            patientsStore.createIndex("Email", "Email", { unique: true });
            patientsStore.createIndex("Telephone", "Telephone", { unique: true});
        }

        //Doctors
        if (!db.objectStoreNames.contains("doctors")) {

            const doctorsStore = db.createObjectStore("doctors", { keyPath: "id", autoIncrement: true });

            doctorsStore.createIndex("First", "First", { unique: false });
            doctorsStore.createIndex("Last", "Last", { unique: false });
            doctorsStore.createIndex("email", "email", { unique: true });
            doctorsStore.createIndex("gender", "gender", { unique: false });
            doctorsStore.createIndex("Address", "Address", { unique: false });
            doctorsStore.createIndex("Telephone", "Telephone", { unique:true });
        }

        //Admins
        if (!db.objectStoreNames.contains("admins")) {

            const adminsStore = db.createObjectStore("admins", { keyPath: "username"});

            adminsStore.createIndex("passwordHash", "passwordHash", { unique: false });
        }

        //Patients Credentials
        if (!db.objectStoreNames.contains("patientsCred")) {

            const patientsCredStore = db.createObjectStore("patientsCred", { keyPath: "id", autoIncrement: true });

            patientsCredStore.createIndex("email", "email", { unique: true });
            patientsCredStore.createIndex("passwordHash", "passwordHash", { unique: false });
        }

        //Doctors Credentials
        if (!db.objectStoreNames.contains("doctorsCred")) {

            const doctorsCredStore = db.createObjectStore("doctorsCred", { keyPath: "id" });

            doctorsCredStore.createIndex("email", "email", { unique: true });
            doctorsCredStore.createIndex("passwordHash", "passwordHash", { unique: false });
        }

        //Medicines
        if (!db.objectStoreNames.contains("medicines")) {

            const medicinesStore = db.createObjectStore("medicines", { keyPath: "id", autoIncrement: true });

            medicinesStore.createIndex("drug", "drug", { unique: false });
        }
        
        //Appointments
        if (!db.objectStoreNames.contains("appointments")) {

            const appointmentsStore = db.createObjectStore("appointments", { keyPath: "appointmentID", autoIncrement: true });

            appointmentsStore.createIndex("appointmentID", "appointmentID", { unique: true });
            appointmentsStore.createIndex("patientID", "patientID", { unique: false });
            appointmentsStore.createIndex("patientName", "patientName", { unique: false });
            appointmentsStore.createIndex("doctorID", "doctorID", { unique: false });
            appointmentsStore.createIndex("doctorName", "doctorName", { unique: false });
            appointmentsStore.createIndex("description", "description", { unique: false });
            appointmentsStore.createIndex("date", "date", { unique: false });
            appointmentsStore.createIndex("time", "time", { unique: false });
            appointmentsStore.createIndex("status", "status", { unique: false });
        }

        //Medical Records
        if (!db.objectStoreNames.contains("medicalRecords")) {

            const medicalRecordsStore = db.createObjectStore("medicalRecords", { keyPath: "medicalRecordID" });

            medicalRecordsStore.createIndex("medicalRecordID", "medicalRecordID", { unique: true });
            medicalRecordsStore.createIndex("patientID", "patientID", { unique: false });
            medicalRecordsStore.createIndex("patientName", "patientName", { unique: false });
            medicalRecordsStore.createIndex("doctorID", "doctorID", { unique: false });
            medicalRecordsStore.createIndex("diagnosis", "diagnosis", { unique: false });
            medicalRecordsStore.createIndex("treatment", "treatment", { unique: false });
            medicalRecordsStore.createIndex("date", "date", { unique: false });
            medicalRecordsStore.createIndex("time", "time", { unique: false });
        }
        
        //Activity Logs
        if (!db.objectStoreNames.contains("activityLogs")) {

            const activityLogsStore = db.createObjectStore("activityLogs", { keyPath: "logID", autoIncrement: true});

            activityLogsStore.createIndex("logID", "logID", { unique: true });
            activityLogsStore.createIndex("role", "role", { unique: false });
            activityLogsStore.createIndex("userID", "userID", { unique: false });
            activityLogsStore.createIndex("action", "action", { unique: false });
            activityLogsStore.createIndex("timestamp", "timestamp", { unique: false });
        }

        //Feedback
        if (!db.objectStoreNames.contains("feedback")) {

            const feedbackStore = db.createObjectStore("feedback", { keyPath: "feedbackID", autoIncrement: true});

            feedbackStore.createIndex("feedbackID", "feedbackID", { unique: true });
            feedbackStore.createIndex("SenderName", "SenderName", { unique: false });
            feedbackStore.createIndex("SenderEmail", "SenderEmail", { unique: false });
            feedbackStore.createIndex("feedbackMessage", "feedbackMessage", { unique: false });
            feedbackStore.createIndex("status", "status", { unique: false });
        }

        //Prescriptions
        if (!db.objectStoreNames.contains("prescriptions")) {

            const prescriptionsStore = db.createObjectStore("prescriptions", { keyPath: "prescriptionRequestID", autoIncrement: true});

            prescriptionsStore.createIndex("prescriptionRequestID", "prescriptionRequestID", { unique: true });
            prescriptionsStore.createIndex("PatientID", "PatientID", { unique: false });
            prescriptionsStore.createIndex("DoctorName", "DoctorName", { unique: false });
            prescriptionsStore.createIndex("Medication", "Medication", { unique: false });
        }

        console.log("Database setup completed!");

    
    }
});
}


//CRUD Operations

// Add a new record to the specified object store
async function addRecord(storeName, record) {
        const db = await openDatabase();
        const transaction = db.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);

        return new Promise((resolve, reject) => {
            const request = store.add(record);
            let key;

            request.onsuccess = () => {
                key = request.result;
            }

            transaction.oncomplete = () => {
                console.log(`Record added to ${storeName} with key: ${key}`);
                resolve(key);
            };

            transaction.onerror = () => {
                console.error(`Failed to add record to ${storeName}`, transaction.error);
                reject(transaction.error);
            };

            transaction.onabort = () => {
                console.error(`Transaction aborted while adding record to ${storeName}`, transaction.error);
                reject(transaction.error || new Error("Transaction aborted"));
            };
        });
}

//Function to Find the record
async function findRecord(storeName, key) {
    try {
        const db = await openDatabase();

        return new Promise((resolve, reject) => {

            const transaction = db.transaction(storeName, "readonly");
            const store = transaction.objectStore(storeName);

            const request = store.get(key);

            request.onsuccess = () => {
                resolve(request.result || null);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });

    } catch (error) {
        throw error;
    }
}

//Read 1 Record
async function getRecord(storeName, key, callback) {
    try {
        const db = await openDatabase();
        const transaction = db.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = () => {
            const record = request.result;

            if (record === undefined) {
                console.log("No record found for key: ", key);
                callback(null);
                return;
            }

            callback(record);
        };

        request.onerror = () => {
            console.error(`Failed to retrieve record from ${storeName}`, request.error);
            callback(null)
        };
    }

    catch(error){
        console.error("Get record error: ", error);
        callback(null);
    }
}

//Read all Records
async function getAllRecords(storeName) {
    try {
        const db = await openDatabase();
        const transaction = db.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    catch(error) {
        console.error("Get All Records Error: ", error);
        throw error;
    }
}

//Update an Existing Record
async function updateRecord(storeName, record) {
    try {
        const db = await openDatabase();

        return await new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, "readwrite");
            const store = transaction.objectStore(storeName);
            const request = store.put(record);

            //Resolves with the record's key once the write is committed
            transaction.oncomplete = () => {
                console.log(`Record updated in ${storeName}`);
                resolve(request.result);
            };

            request.onerror = () => {
                console.error(`Failed to update record in ${storeName}`, request.error);
                reject(request.error);
            };

            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
    }

    catch (error) {
        console.error("Update Record Error: ", error);
        throw error; //let the caller know the update failed
    }
}

//Delete an Existing Record
async function deleteRecord(storeName, key) {
    try {
        const db = await openDatabase();

        return await new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, "readwrite");
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            //Resolves once the delete is committed
            transaction.oncomplete = () => {
                console.log(`Record ${key} deleted from ${storeName}`);
                resolve(true);
            };

            request.onerror = () => {
                console.error(`Failed to delete record from ${storeName}`, request.error);
                reject(request.error);
            };

            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
    }

    catch (error) {
        console.error("Delete Record Error: ", error);
        throw error; //let the caller know the delete failed
    }
}


// Check whether the database has been seeded
async function isSeeded() {
    const db = await openDatabase();

    const requiredStores = [
        "patients",
        "doctors",
        "medicines",
        "admins",
        "doctorsCred",
        "patientsCred",
        "appointments",
        "medicalRecords"
    ];

    try {
        return await new Promise((resolve, reject) => {
            const transaction = db.transaction(requiredStores, "readonly");

            const counts = {};
            let completed = 0;

            for (const storeName of requiredStores) {
                const request = transaction
                    .objectStore(storeName)
                    .count();

                request.onsuccess = () => {
                    counts[storeName] = request.result;
                    completed++;

                    if (completed === requiredStores.length) {
                        // Every required store must contain records
                        const seeded = requiredStores.every(
                            storeName => counts[storeName] > 0
                        );

                        resolve(seeded);
                    }
                };

                request.onerror = () => reject(request.error);
            }

            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
    } finally {
        db.close();
    }

}


//Search by Index Function
async function searchByIndex(storeName, indexName, value) {
    try {
        const db = await openDatabase();
        const transaction = db.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.index(indexName).getAll(value);

        request.onsuccess = () => {
            console.log("Search Results: ");
            console.table(request.result);
        };

        request.onerror = () => {
            console.error(`Search failed in ${storeName}: `, request.error);
        };
    }

    catch(error) {
        console.error("Search Error: ", error);
    }
}



// Importing Data from JSON files into the database
function putAll (tx, storeName, items) {
    const store = tx.objectStore(storeName);
    items.forEach((item, i) => {
        const record = { ...item};
        if (record[store.keyPath] === undefined) {
            record[store.keyPath] = item[JSON_ID_FIELD[storeName]];
        }
        if (record[store.keyPath] === undefined) {
            console.error('Still no key', i, store.name, Object.keys(item));
            return;
        }
        store.put(record)
    });
}

//Saving all the fetched data
async function saveData ({patients, doctors, medicines, admins, doctorsCred, patientsCred, appointments, medicalRecords}) {
    
    //Hash passwords before any transaction continues
    const hashedAdmins = [];

    for (const admin of admins) {
        const record = { ...admin };
        record.passwordHash = await hashPassword(record.password);
        delete record.password;
        hashedAdmins.push(record);
    }

    const hashedDoctorsCred = [];

    for (const doctorCred of doctorsCred) {
        const record = { ...doctorCred };
        record.passwordHash = await hashPassword(record.password);
        delete record.password;
        hashedDoctorsCred.push(record);
    }

    const hashedPatientsCred = [];

    for (const patientCred of patientsCred) {
        const record = { ...patientCred };
        record.passwordHash = await hashPassword(record.password);
        delete record.password;
        hashedPatientsCred.push(record);
    }

    //Encrypting sensitive patient data
    const encryptedPatients = [];

    const cryptoKey = await importKey(localStorage.getItem("storedKey"));

    for (const patient of patients) {
        const record = { ...patient };
        
        record.NHS = await encrypt(record.NHS, cryptoKey);
        record.DOB = await encrypt(record.DOB, cryptoKey);
        record.Gender = await encrypt(record.Gender, cryptoKey);
        record.Address = await encrypt(record.Address, cryptoKey);
        record.Email = await encrypt(record.Email, cryptoKey, "email");
        record.Telephone = await encrypt(record.Telephone, cryptoKey);

        delete record.password;

        encryptedPatients.push(record);
    }

    //Encrypting sensitive doctor data
    const encryptedDoctors = [];

    
    for (const doctor of doctors) {
        const record = { ...doctor };

        record.email = await encrypt(record.email, cryptoKey, "email");
        record.gender = await encrypt(record.gender, cryptoKey);
        record.Address = await encrypt(record.Address, cryptoKey);
        record.Telephone = await encrypt(record.Telephone, cryptoKey, "Telephone");

        encryptedDoctors.push(record)
    }

    //Encrypting Sensitive Appointment Data
    const encryptedAppointments = [];

    for (const appointment of appointments) {
        const record = { ...appointment };

        record.description = await encrypt(record.description, cryptoKey);

        encryptedAppointments.push(record);
    }

    //Encrypting Sensitive Medical Record Data
    const encryptedMedicalRecords = [];

    for (const medicalRecord of medicalRecords) {
        const record = { ...medicalRecord };


        record.diagnosis = await encrypt(record.diagnosis, cryptoKey);
        record.treatment = await encrypt(record.treatment, cryptoKey);

        encryptedMedicalRecords.push(record);
    }

    const db = await openDatabase();

    try {
        const tx = db.transaction(["patients", "doctors", "medicines", "admins", "doctorsCred", "patientsCred", "appointments", "medicalRecords"], "readwrite");

        putAll(tx, "patients", encryptedPatients);
        putAll(tx, "doctors", encryptedDoctors);
        putAll(tx, "medicines", medicines);
        putAll(tx, "admins", hashedAdmins);
        putAll(tx, "doctorsCred", hashedDoctorsCred);
        putAll(tx, "patientsCred", hashedPatientsCred);
        putAll(tx, "appointments", encryptedAppointments);
        putAll(tx, "medicalRecords", encryptedMedicalRecords);
        await new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
        });
    } finally {
    db.close();
    }
}

async function clearStore(storeName) {
    const db = await openDatabase();
    try {
        await new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, "readwrite");
            tx.objectStore(storeName).clear();
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
    } finally {
        db.close();
    }
}

async function initDatabase() {
    const hadKey = !!localStorage.getItem("storedKey");

    const seeded = await isSeeded();

    if (seeded && hadKey) {
        console.log("Database already initialised.");
        return;
    }

    if (seeded && !hadKey) {
        console.warn("Encryption key missing, reseeding the database.");

        const stores = [
            "patients",
            "doctors",
            "medicines",
            "admins",
            "doctorsCred",
            "patientsCred",
            "appointments",
            "medicalRecords"
        ];

        for (const store of stores) {
            await clearStore(store);
        }
    }

    await initialiseEncryptionKey();

    const data = await fetchData();

    await saveData(data);

    console.log("Database seeded from JSON");


}

const dbReady = initDatabase();
dbReady.catch(error => { console.error("Failed to initialise database:", error); });


// RENDER AND HELPER FUNCTIONS

//Rendering all fields:
function renderAllFields(storeName, key, tbodyId, theadId) {
    getRecord(storeName, key, (record) => {
        if (record === null) {
            console.log("No records found!");
            return;
        }

        const fields = Object.keys(record);

        const thead = document.getElementById(theadId);
        thead.replaceChildren();
        const headRow = thead.insertRow();
        for (const field of fields) {
            const th = document.createElement("th");
            th.className = "med-requests";
            th.textContent = field;
            headRow.appendChild(th);
        }

        const tbody = document.getElementById(tbodyId);
        
        if (!tbody) {
            console.error(`Element ${tbodyId} not found`);
            return;
        }

        tbody.replaceChildren();
        addRow(tbody, record, fields);
    });
}

//Check if a record exists based on an index
async function recordExists (storeName, indexName, value) {
    const db = await openDatabase();
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);

    return new Promise((resolve, reject) => {
        const request = index.get(value);

        request.onsuccess = () => {
            resolve(!!request.result);
        };

        request.onerror = () => {
            console.error(`Error checking existence in ${storeName}: `, request.error);
            reject(request.error);
        };
    });
}

// Patient Helper functions
//Adding patient info to Object Stores upon registration
async function registerPatient(formData) {
    const cryptoKey = await importKey(localStorage.getItem("storedKey"));
    
    //Normalizing the NHS number and email for consistency
    const nhs = String(formData.NHS).replace(/[\s-]/g, "");
    const email = formData.Email.trim().toLowerCase();
    const telephone = String(formData.Telephone).replace(/[\s()-]/g, "");

    if (!nhs || !email || !telephone) {
        throw new Error("NHS number, Email, and Telephone are required!");
    }

    // Encryption to check for duplicates
    const encryptedNHS = await encrypt(nhs, cryptoKey, "NHS");
    const encryptedEmail = await encrypt(email, cryptoKey, "Email");
    const encryptedTelephone = await encrypt(telephone, cryptoKey, "Telephone");

    //Duplicate checking by email
    if (await recordExists("patients", "Email", encryptedEmail)) {
        throw new Error("A patient with this email already exists!");
    }

    //Duplicate checking by NHS number
    if (await recordExists("patients", "NHS", encryptedNHS)) {
        throw new Error("A patient with this NHS number already exists!");
    }

    //Duplicate checking by Telephone
    if (await recordExists("patients", "Telephone", encryptedTelephone)) {
        throw new Error("A patient with this telephone number already exists!");
    }

    //Encrypting the data
    const patientRecord = {
        NHS: encryptedNHS,
        Title: formData.Title,
        First: formData.First,
        Last: formData.Last,
        DOB: await encrypt(formData.DOB, cryptoKey),
        Gender: await encrypt(formData.Gender, cryptoKey),
        Address: await encrypt(formData.Address, cryptoKey),
        Email: encryptedEmail,
        Telephone: encryptedTelephone
    };

    //Saving the encrypted data to the database
    const patientID = await addRecord("patients", patientRecord);
    console.log("Patient registered with ID: ", patientID);
    return patientID;
}

// Function to Update Patient Info
async function updatePatient(formData) {

    const cryptoKey = await importKey(
        localStorage.getItem("storedKey")
    );

    const provided = (value) =>
        value !== undefined && value !== null;

    const NHS = Number(formData.NHS);

    if (!Number.isInteger(NHS)) {
        throw new Error("Valid NHS number required!");
    }

    const existing = await findRecord(
        "patients",
        id
    );

    if (!existing) {
        throw new Error("Patient not found!");
    }

    // Start from current record
    const updatedRecord = {
        ...existing,
        id: id
    };

    // Email
    if (provided(formData.Email)) {

        const email = String(formData.Email)
            .trim()
            .toLowerCase();

        if (!email) {
            throw new Error("Email cannot be empty!");
        }

        updatedRecord.Email =
            await encrypt(
                email,
                cryptoKey,
                "Email"
            );
    }

    // NHS
    if (provided(formData.NHS)) {

        const nhs = String(formData.NHS)
            .replace(/[\s-]/g, "");

        if (!nhs) {
            throw new Error("NHS number cannot be empty!");
        }

        updatedRecord.NHS =
            await encrypt(
                nhs,
                cryptoKey,
                "NHS"
            );
    }

    // Telephone
    if (provided(formData.Telephone)) {

        const telephone = String(formData.Telephone)
            .replace(/[\s()-]/g, "");

        if (!telephone) {
            throw new Error("Telephone cannot be empty!");
        }

        updatedRecord.Telephone =
            await encrypt(
                telephone,
                cryptoKey,
                "Telephone"
            );
    }

    // Plain text fields
    for (const field of ["Title", "First", "Last"]) {
        if (provided(formData[field])) {
            updatedRecord[field] = formData[field];
        }
    }

    // Encrypted fields
    for (const field of ["DOB", "Gender", "Address"]) {

        if (provided(formData[field])) {

            updatedRecord[field] =
                await encrypt(
                    formData[field],
                    cryptoKey
                );
        }
    }

    // Duplicate checks

    if (
        updatedRecord.Email !== existing.Email &&
        await recordExists(
            "patients",
            "Email",
            updatedRecord.Email
        )
    ) {
        throw new Error(
            "A patient with this email already exists!"
        );
    }

    if (
        updatedRecord.NHS !== existing.NHS &&
        await recordExists(
            "patients",
            "NHS",
            updatedRecord.NHS
        )
    ) {
        throw new Error(
            "A patient with this NHS number already exists!"
        );
    }

    if (
        updatedRecord.Telephone !== existing.Telephone &&
        await recordExists(
            "patients",
            "Telephone",
            updatedRecord.Telephone
        )
    ) {
        throw new Error(
            "A patient with this telephone number already exists!"
        );
    }

    // Update existing record
    await updateRecord(
        "patients",
        updatedRecord
    );

    console.log(
        "Patient updated with ID:",
        id
    );
    
    return id;
}

//Function to delete Patient Info
async function deletePatientSomeInfo(formData) {

    const id = Number(formData.id);

    if (!Number.isInteger(id)) {
        throw new Error("Valid patient ID required!");
    }

    const existing = await findRecord(
        "patients",
        id
    );

    if (!existing) {
        throw new Error("Patient not found!");
    }

    await deleteRecord(
        "patients",
        id
    );

    console.log(
        "Patient deleted",
        id
    );

    logout()

    return true;
}

// Function to delete all information related to a patient
async function deletePatientAllInfo(formData) {

    const id = Number(formData.id);

    if (!Number.isInteger(id)) {
        throw new Error("Valid patient ID required!");
    }

    // Check whether the patient exists
    const existingPatient = await findRecord("patients", id);

    if (!existingPatient) {
        throw new Error("Patient not found!");
    }

    // All stores containing patient-related information
    const PATIENT_STORES = [
        "patients",
        "patientsCred",
        "appointments",
        "medicalRecords",
        "prescriptions",
        "activityLogs"
    ];

    return new Promise(async (resolve, reject) => {

        const db = await openDatabase();

        const tx = db.transaction(PATIENT_STORES, "readwrite");
        console.log(`Deleting patient and associated information for ID: ${id}`);

        // Delete patient profile
        tx.objectStore("patients").delete(id);
        console.log(`Deleted patient profile with ID: ${id}`);

        // Delete patient credentials
        tx.objectStore("patientsCred").delete(id);
        console.log(`Deleted patient credentials with ID: ${id}`);

        // Delete all appointments belonging to the patient
        const appointments = tx.objectStore("appointments");

        const appointmentRequest = appointments.openCursor();

        appointmentRequest.onsuccess = (event) => {

            const cursor = event.target.result;

            if (cursor) {

                if (Number(cursor.value.patientID) === id) {
                    cursor.delete();
                }

                cursor.continue();
            }
        };

        // Delete all medical records belonging to the patient
        const medicalRecords = tx.objectStore("medicalRecords");

        const recordsRequest = medicalRecords.openCursor();

        recordsRequest.onsuccess = (event) => {

            const cursor = event.target.result;

            if (cursor) {

                if (Number(cursor.value.patientID) === id) {
                    cursor.delete();
                }

                cursor.continue();
            }
        };

        // Delete all prescriptions belonging to the patient
        const prescriptions = tx.objectStore("prescriptions");

        const prescriptionsRequest = prescriptions.openCursor();

        prescriptionsRequest.onsuccess = (event) => {

            const cursor = event.target.result;

            if (cursor) {

                if (Number(cursor.value.patientID) === id) {
                    cursor.delete();
                }

                cursor.continue();
            }
        };

        // Delete all activity logs belonging to the patient
        const activityLogs = tx.objectStore("activityLogs");

        const logsRequest = activityLogs.openCursor();

        logsRequest.onsuccess = (event) => {

            const cursor = event.target.result;

            if (cursor) {

                if (Number(cursor.value.patientID) === id) {
                    cursor.delete();
                }

                cursor.continue();
            }
        };

        // Transaction completed successfully
        tx.oncomplete = () => {
            resolve({
                success: true,
                message: "Patient and all associated information deleted successfully."
            });
        };

        // Handle transaction errors
        tx.onerror = () => {
            reject(tx.error);
        };

        tx.onabort = () => {
            reject(tx.error || new Error("Patient deletion failed."));
        };

    });
}

// Function to export all information related to a specific patient
async function exportPatientAllInfo(formData) {

    const id = Number(formData.id);

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error("Valid patient ID required!");
    }

    // All stores containing patient-related information
    const PATIENT_STORES = [
        "patients",
        "patientsCred",
        "appointments",
        "medicalRecords",
        "prescriptions",
        "activityLogs"
    ];

    try {

        const db = await openDatabase();

        // Check whether the patient exists
        const patientTransaction = db.transaction("patients", "readonly");

        const patient = await new Promise((resolve, reject) => {

            const request = patientTransaction
                .objectStore("patients")
                .get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);

        });

        if (!patient) {
            throw new Error("Patient not found!");
        }

        console.log(`Exporting information for patient ID: ${id}`);

        // Open readonly transaction for all patient stores
        const tx = db.transaction(PATIENT_STORES, "readonly");

        // Retrieve patient profile
        const patientProfileRequest = tx.objectStore("patients").get(id);

        // Retrieve patient credentials
        const patientCredRequest = tx.objectStore("patientsCred").get(id);

        // Retrieve associated records
        const appointmentsRequest = tx.objectStore("appointments").getAll();

        const medicalRecordsRequest = tx.objectStore("medicalRecords").getAll();

        const prescriptionsRequest = tx.objectStore("prescriptions").getAll();

        const activityLogsRequest = tx.objectStore("activityLogs").getAll();

        // Convert IndexedDB requests into Promises
        const requestToPromise = (request) => {

            return new Promise((resolve, reject) => {

                request.onsuccess = () => resolve(request.result);

                request.onerror = () => reject(request.error);

            });

        };

        // Wait for all database requests
        const [
            patientProfile,
            patientCredentials,
            allAppointments,
            allMedicalRecords,
            allPrescriptions,
            allActivityLogs
        ] = await Promise.all([
            requestToPromise(patientProfileRequest),
            requestToPromise(patientCredRequest),
            requestToPromise(appointmentsRequest),
            requestToPromise(medicalRecordsRequest),
            requestToPromise(prescriptionsRequest),
            requestToPromise(activityLogsRequest)

        ]);

        // Retrieve the existing encryption key
        const key = await importKey(
            localStorage.getItem("storedKey")
        );

        // Decrypt sensitive patient information
        const decryptedPatientProfile = { ...patientProfile };

        // Map fields to their original encryption contexts
        const encryptedFields = {
            NHS: "",
            DOB: "",
            Gender: "",
            Address: "",
            Email: "email",
            Telephone: ""
        };


        for (const [field, context] of Object.entries(encryptedFields)) {
            if (decryptedPatientProfile[field]) {
                try {
                    decryptedPatientProfile[field] = await decrypt(
                        decryptedPatientProfile[field],
                        key,
                        context
                    );

                } catch (error) {
                    console.error(`Failed to decrypt ${field}:`, error);
                    throw error;
                }
            }
        }

        

        // Filter records belonging to the selected patient
        const appointments = allAppointments.filter(
            record => Number(record.patientID) === id
        );

        const medicalRecords = allMedicalRecords.filter(
            record => Number(record.patientID) === id
        );

        const prescriptions = allPrescriptions.filter(
            record => Number(record.patientID) === id
        );

        const activityLogs = allActivityLogs.filter(
            record => Number(record.userID) === id
        );

        // Decrypt sensitive appointment information
        // Map fields to their original encryption contexts
        const encryptedAppointmentsFields = {
            description: "",
        };

        const decryptedPatientAppointments = [];

        for (const record of appointments) {
            const decryptedRecord = { ...record };

            for (const [field, context] of Object.entries(encryptedAppointmentsFields)) {
                if (decryptedRecord[field]) {
                    try {
                        decryptedRecord[field] = await decrypt(
                            decryptedRecord[field],
                            key,
                            context
                        );
                    } catch (error) {
                        console.error(`Failed to decrypt appointment ${field}:`, error);
                        throw error;
                    }
                }
            }

            decryptedPatientAppointments.push(decryptedRecord);
        }

        // Decrypt sensitive medical record information
        // Map fields to their original encryption contexts
        const encryptedMedicalRecordsFields = {
            diagnosis: "",
            treatment: "",
        };

        const decryptedMedicalRecords = [];

        for (const record of medicalRecords) {
            const decryptedRecord = { ...record };

            for (const [field, context] of Object.entries(encryptedMedicalRecordsFields)) {
                if (decryptedRecord[field]) {
                    try {
                        decryptedRecord[field] = await decrypt(
                            decryptedRecord[field],
                            key,
                            context
                        );
                    } catch (error) {
                        console.error(`Failed to decrypt medical record ${field}:`, error);
                        throw error;
                    }
                }
            }

            decryptedMedicalRecords.push(decryptedRecord);
        }

        // Remove password hashes from exported credentials
        const safeCredentials = patientCredentials
            ? { ...patientCredentials, passwordHash: undefined }
            : null;

        // Create ZIP archive
        const zip = new JSZip();

        // Helper function to add JSON files
        const addJSON = (filename, data) => {

            zip.file(
                filename,
                JSON.stringify(data, null, 4)
            );

        };

        // Add individual patient data files
        addJSON("patient_profile.json", decryptedPatientProfile);
        addJSON("patient_credentials.json", safeCredentials);
        addJSON("appointments.json", decryptedPatientAppointments);
        addJSON("medical_records.json", decryptedMedicalRecords);
        addJSON("prescriptions.json", prescriptions);
        addJSON("activity_logs.json", activityLogs);

        // Export manifest
        const manifest = {
            exportDate: new Date().toISOString(),
            patientID: id,
            exportedBy: "Patient Management System",
            exportedStores: PATIENT_STORES,
            recordCounts: {
                patientProfile: patientProfile ? 1 : 0,
                patientCredentials: safeCredentials ? 1 : 0,
                appointments: appointments.length,
                medicalRecords: medicalRecords.length,
                prescriptions: prescriptions.length,
                activityLogs: activityLogs.length
            }
        };

        addJSON("export_manifest.json", manifest);

        // Generate ZIP file
        const zipBlob = await zip.generateAsync({
            type: "blob",
            compression: "DEFLATE",
            compressionOptions: {
                level: 6
            }
        });

        // Generate download link
        const downloadURL = URL.createObjectURL(zipBlob);
        const downloadLink = document.createElement("a");
        downloadLink.href = downloadURL;
        downloadLink.download = `Patient_${id}_Export.zip`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(downloadURL);
        console.log(`Patient ${id} exported successfully!`);
        return true;

    } catch (error) {
        console.error("Error exporting patient information:", error);
        throw error;

    }

}

// Prescription Request Helper functions

// Appointment Helper functions


// Feedback Helper functions


// Activity Logs
async function addActivityLog(role, userID, action) {
    const timestamp = new Date().toISOString();
    const logEntry = { role, userID, action, timestamp };
    const logID = await addRecord("activityLogs", logEntry);
    console.log(`Activity log added with ID: ${logID}`);
    return logID;
}



// EXTRA
// ---------- Index lookups ----------
async function findByIndex(storeName, indexName, value) {
    const database = await openDatabase();

    return new Promise((resolve, reject) => {
        const request = database.transaction(storeName, "readonly")
            .objectStore(storeName).index(indexName).get(value);
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error);
    });
}


// Data key (kept in localStorage by encryption.js)
let dataKeyCache = null;
async function loadDataKey() {
    const stored = localStorage.getItem("storedKey");
    if (!stored) throw new Error("Encryption key is missing from localStorage");
    if (!dataKeyCache || dataKeyCache.stored !== stored) {
        dataKeyCache = { stored, key: await importKey(stored) };
    }
    return dataKeyCache.key;
}

// Extracts selected (optionally nested "a.b") fields from an object
function pickAttributes(obj, attributes) {
    const result = {};

    for (const attr of attributes) {
        let value = obj;

        for (const part of attr.split(".")) {
            if (value === undefined || value === null || !(part in Object(value))) {
                value = undefined;
                break;
            }
            value = value[part];
        }

        if (value !== undefined) result[attr] = value;
    }

    return result;
}

// Adds a row to a table body with the specified fields from the data object
function addRow(tbody, data, fields) {
    const tr = tbody.insertRow();

    for (const field of fields) {
        const value = data[field];

        tr.insertCell().textContent =
            value === undefined ? "" :
            typeof value === "object" && value !== null ? JSON.stringify(value) :
            String(value);
    }
}

// Change User Password
async function changeUserPassword(storeName, userID, email, newPassword) {

    try {

        const hashedPassword = await hashPassword(newPassword);

        await updateRecord(storeName, {
            id: userID,
            email: email,
            passwordHash: hashedPassword
        });

        console.log("Password changed successfully for user ID:", userID);
        return true;

    } catch (error) {
        console.error("Error changing password:", error);
        return false;
    }
}
