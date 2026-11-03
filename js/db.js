const DB_NAME = "XHospitalDB";
const DB_VERSION = 1;
let db;
let cryptoKey = null;


//Fetching the json files
let patients, doctors, medicines, admins;
async function fetchData () {
    try {
        const responses = await Promise.all([
        fetch("https://mrinalsharma14.github.io/medical/JSON/patients.json"),
        fetch("https://mrinalsharma14.github.io/medical/JSON/doctors.json"),
        fetch("https://mrinalsharma14.github.io/medical/JSON/medicines.json"),
        fetch("https://mrinalsharma14.github.io/medical/JSON/admin.json")
        ]);

        responses.forEach((response) => {
            if (!response.ok) {
                throw new Error(`Failed to fetch ${response.url} (HTTP ${response.status})`);
            }

        });

        const [patientsResponse, doctorsResponse, medicinesResponse, adminsResponse] = responses;

        [patients, doctors, medicines, admins] = await Promise.all(
            [patientsResponse.json(),
                doctorsResponse.json(),
                medicinesResponse.json(),
                adminsResponse.json()
            ]
        );

        //Ensure each file is an array
        const files = {patients, doctors, medicines, admins};

        for (const [name, data] of Object.entries(files)) {
            if (!Array.isArray(data)) {
                throw new Error(`${name}.json is not an array`);
            }
        }

        return {patients, doctors, medicines, admins};

    } catch (error) {
        console.error("Failed to load JSON data: ", error);
        throw error;
    }
}


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
            patientsStore.createIndex("Email", "Email", { unique: false });
            patientsStore.createIndex("Telephone", "Telephone", { unique: true});
        }

        //Doctors
        if (!db.objectStoreNames.contains("doctors")) {

            const doctorsStore = db.createObjectStore("doctors", { keyPath: "doctorID" });

            doctorsStore.createIndex("First", "First", { unique: false });
            doctorsStore.createIndex("Last", "Last", { unique: false });
            doctorsStore.createIndex("email", "email", { unique: true });
            doctorsStore.createIndex("gender", "gender", { unique: false });
            doctorsStore.createIndex("address", "address", { unique: false });
            doctorsStore.createIndex("telephone", "telephone");
        }

        //Admins
        if (!db.objectStoreNames.contains("admins")) {

            const adminsStore = db.createObjectStore("admins", { keyPath: "adminID"});

            adminsStore.createIndex("AdminId", "AdminId", { unique: false });
            adminsStore.createIndex("First", "First", { unique: false });
            adminsStore.createIndex("Last", "Last", { unique: false });
            adminsStore.createIndex("dob", "dob", { unique: false });
            adminsStore.createIndex("gender", "gender", { unique: false });
            adminsStore.createIndex("address", "address", { unique: false });
            adminsStore.createIndex("email", "email", { unique: true });
            adminsStore.createIndex("telephone", "telephone", { unique: true });
        }

        //Medicines
        if (!db.objectStoreNames.contains("medicines")) {

            const medicinesStore = db.createObjectStore("medicines", { keyPath: "medicineID", autoIncrement: true });

            medicinesStore.createIndex("medicineID", "medicineID", { unique: true });
            medicinesStore.createIndex("drug", "drug", { unique: false });
        }
        
        //Appointments
        if (!db.objectStoreNames.contains("appointments")) {

            const appointmentsStore = db.createObjectStore("appointments", { keyPath: "appointmentID" });

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
            medicalRecordsStore.createIndex("doctorID", "doctorID", { unique: false });
            medicalRecordsStore.createIndex("diagnosis", "diagnosis", { unique: false });
            medicalRecordsStore.createIndex("treatment", "treatment", { unique: false });
            medicalRecordsStore.createIndex("date", "date", { unique: false });
            medicalRecordsStore.createIndex("time", "time", { unique: false });
        }
        
        //Activity Logs
        if (!db.objectStoreNames.contains("activityLogs")) {

            const activityLogsStore = db.createObjectStore("activityLogs", { keyPath: "logID" });

            activityLogsStore.createIndex("logID", "logID", { unique: true });
            activityLogsStore.createIndex("role", "role", { unique: false });
            activityLogsStore.createIndex("userID", "userID", { unique: false });
            activityLogsStore.createIndex("action", "action", { unique: false });
            activityLogsStore.createIndex("timestamp", "timestamp", { unique: false });
        }

        //Feedback
        if (!db.objectStoreNames.contains("feedback")) {

            const feedbackStore = db.createObjectStore("feedback", { keyPath: "feedbackID" });

            feedbackStore.createIndex("feedbackID", "feedbackID", { unique: true });
            feedbackStore.createIndex("SenderName", "SenderName", { unique: false });
            feedbackStore.createIndex("SenderEmail", "SenderEmail", { unique: false });
            feedbackStore.createIndex("feedbackMessage", "feedbackMessage", { unique: false });
            feedbackStore.createIndex("status", "status", { unique: false });
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
        }
    }

    catch(error){
        console.error("Get record error: ", error);
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

//
async function isSeeded () {
    const db = await openDatabase();
    try {
        return await new Promise((resolve, reject) => {
            const request = db. transaction("patients").objectStore("patients").count();
            request.onsuccess = () => resolve(request.result > 0);
            request.onerror = () => reject(request.error);
        });
    }

    finally {
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

//JSON Field IDs
const JSON_ID_FIELD = {
    patients: "id",
    doctors: "id",
    medicines: "id",
    admins: "username"
}

//Putting the JSON data into IndexedDB
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
async function saveData ({patients, doctors, medicines, admins}) {
    
    //Hash passwords before ny transaction continues
    const hashedAdmins = [];

    for (const admin of admins) {
        const record = { ...admin };
        record.passwordHash = await hashPassword(record.password);
        delete record.password;
        hashedAdmins.push(record);
    }

    
    //Encrypting sensitive patient data
    const encryptedPatients = [];

    for (const patient of patients) {
        const record = { ...patient };

        const cryptoKey = await importKey(localStorage.getItem("storedKey"));
        
        console.log("Patient gen key", cryptoKey)
        record.NHS = await encrypt(record.NHS, cryptoKey);
        record.DOB = await encrypt(record.DOB, cryptoKey);
        record.Gender = await encrypt(record.Gender, cryptoKey);
        record.Address = await encrypt(record.Address, cryptoKey);
        record.Email = await encrypt(record.Email, cryptoKey);
        record.Telephone = await encrypt(record.Telephone, cryptoKey);

        delete record.password;

        encryptedPatients.push(record);
    }

    //Encrypting sensitive doctor data
    const encryptedDoctors = [];

    for (const doctor of doctors) {
        const record = { ...doctor };

        const cryptoKey = await importKey(localStorage.getItem("storedKey"));

        record.email = await encrypt(record.email, cryptoKey);
        record.gender = await encrypt(record.gender, cryptoKey);
        record.Address = await encrypt(record.Address, cryptoKey);
        record.Telephone = await encrypt(record.Telephone, cryptoKey);

        encryptedDoctors.push(record)
    }

    
    
    const db = await openDatabase();

    try {
        const tx = db.transaction(["patients", "doctors", "medicines", "admins"], "readwrite");

        putAll(tx, "patients", encryptedPatients);
        putAll(tx, "doctors", encryptedDoctors);
        putAll(tx, "medicines", medicines);
        putAll(tx, "admins", hashedAdmins);

        await new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
        });
    } finally {
    db.close();
    }
}

async function initDatabase () {
    if (await isSeeded()) return;

    await initialiseEncryptionKey();
    const data = await fetchData();
    await saveData(data);
    console.log("Database seeded from JSON")
}

const dbReady = initDatabase();
dbReady.catch((error) => console.error("Failed to initialise database: ", error));

//Rendering and Helper Functions

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
            resolve(request.result > 0);
        };

        request.onerror = () => {
            console.error(`Error checking existence in ${storeName}: `, request.error);
            reject(request.error);
        };
    });
}

//Helper Functions to create Records

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

    //Deterministic Encryption to check for duplicates
    const encryptedNHS = await encryptDeterministic(nhs, cryptoKey, "NHS");
    const encryptedEmail = await encryptDeterministic(email, cryptoKey, "Email");
    const encryptedTelephone = await encryptDeterministic(telephone, cryptoKey, "Telephone");

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

//Function to Register a Doctor
async function registerDoctor(formData) {
    const cryptoKey = await importKey(localStorage.getItem("storedKey"));

    const username = String(formData.Username).trim().toLowerCase();

    if (!username || !formData.Password) {
        throw new Error("Username and password are required!");
    }

    // Deterministic encryption so the existing index can match it
    const encryptedUsername = await encryptDeterministic(username, cryptoKey, "username");

    // Duplicate check for an existing doctor
    if (await recordExists("doctors", "Username", encryptedUsername)) {
        throw new Error("This username is already taken.");
    }

    // Hash the password with your existing function
    const hashedPassword = await hashPassword(formData.Password);

    const doctorRecord = {
        Username: encryptedUsername,
        Password: hashedPassword,
    };

    const doctorID = await addRecord("doctors", doctorRecord);
    console.log("Doctor registered, id:", doctorID);
    return doctorID;
}

//Function to add a Medicine
async function registerMedicine(formData) {
 
    //Normalizing for consistency
    const drug = String(formData.drug).trim().toLowerCase();
 
    if (!drug) {
        throw new Error("Drug name is required!");
    }
 
    //Duplicate checking by drug name
    if (await recordExists("medicines", "drug", encryptedDrug)) {
        throw new Error("This drug has already been added!");
    }
 
    const medicineRecord = {
        drug: drug
    };
 
    const medicineID = await addRecord("medicines", medicineRecord);
    console.log("Medicine added with ID: ", medicineID);
    return medicineID;
}

//Function to add Appointment Info
async function registerAppointment(formData) {
    const cryptoKey = await importKey(localStorage.getItem("storedKey"));
 
    //Normalizing the foreign keys for consistency
    const patientID = String(formData.patientID ?? "").trim();
    const doctorID = String(formData.doctorID ?? "").trim();
 
    if (!patientID || !doctorID ||
        !formData.patientName || !formData.doctorName || !formData.description ||
        !formData.date || !formData.time || !formData.status) {
        throw new Error("All appointment fields are required!");
    }
 
    //Encrypting the data
    const appointmentRecord = {
        patientID: patientID,
        patientName: formData.patientName,
        doctorID: doctorID,
        doctorName: formData.doctorName,
        description: await encrypt(formData.description, cryptoKey),
        date: formData.date,
        time: formData.time,
        status: formData.status
    };

    const appointmentID = await addRecord("appointments", appointmentRecord);
    console.log("Appointment added with ID: ", appointmentID);
    return appointmentID;
}

//Function to add Medical Record Info
async function registerMedicalRecord(formData) {
    const cryptoKey = await importKey(localStorage.getItem("storedKey"));
 
    //Normalizing the foreign keys for consistency
    const patientID = String(formData.patientID ?? "").trim();
    const doctorID = String(formData.doctorID ?? "").trim();
 
    if (!patientID || !doctorID ||
        !formData.diagnosis || !formData.treatment || !formData.date || !formData.time) {
        throw new Error("All medical record fields are required!");
    }
 
    //Encrypting the data
    const medicalRecord = {
        patientID: patientID,
        doctorID: doctorID,
        diagnosis: await encrypt(formData.diagnosis, cryptoKey),
        treatment: await encrypt(formData.treatment, cryptoKey),
        date: formData.date,
        time: formData.time
    };
 
    //addRecord returns the auto-generated medicalRecordID
    const medicalRecordID = await addRecord("medicalRecords", medicalRecord);
    console.log("Medical record added with ID: ", medicalRecordID);
    return medicalRecordID;
}

//Function to add Feedback Info
async function registerFeedback(formData) {
    const cryptoKey = await importKey(localStorage.getItem("storedKey"));
 
    //Normalizing for consistency
    const senderEmail = String(formData.senderEmail ?? "").trim().toLowerCase();
 
    if (!formData.senderName || !senderEmail) {
        throw new Error("Sender Name and Sender Email are required!");
    }
 
    //Encrypting the data
    const feedbackRecord = {
        senderName: formData.SenderName,
        senderEmail: await encrypt(formData.SenderEmail, cryptoKey),
        feedbackMessage: await encrypt(formData.feedbackMessage, cryptoKey),
        status: "New"
    };
 
    //addRecord returns the auto-generated feedbackID
    const feedbackID = await addRecord("feedback", feedbackRecord);
    console.log("Feedback added with ID: ", feedbackID);
    return feedbackID;
}

//Helper Functions to update records

//Function to Update Patient Info
async function updatePatient(formData) {
    const cryptoKey = await importKey(localStorage.getItem("storedKey"));
 
    const provided = (value) => value !== undefined && value !== null;
 
    const originalEmail = String(formData.originalEmail ?? "").trim().toLowerCase();
    if (!originalEmail) {
        throw new Error("The patient's current email is required to find the record!");
    }
 
    //Deterministic Encryption
    const encryptedOriginalEmail = await encryptDeterministic(originalEmail, cryptoKey, "Email");
 
    const existing = await getRecord("patients", encryptedOriginalEmail);
    if (!existing) {
        throw new Error("Patient not found!");
    }
 
    //Starting from the stored record, then applying only the fields that were sent
    const updatedRecord = { ...existing };
 
    //Email (the key). Omitted = unchanged
    if (provided(formData.Email)) {
        const email = String(formData.Email).trim().toLowerCase();
        if (!email) {
            throw new Error("Email cannot be empty!");
        }
        updatedRecord.Email = await encryptDeterministic(email, cryptoKey, "Email");
    }
 
    //NHS number
    if (provided(formData.NHS)) {
        const nhs = String(formData.NHS).replace(/[\s-]/g, "");
        if (!nhs) {
            throw new Error("NHS number cannot be empty!");
        }
        updatedRecord.NHS = await encryptDeterministic(nhs, cryptoKey, "NHS");
    }
 
    //Telephone
    if (provided(formData.Telephone)) {
        const telephone = String(formData.Telephone).replace(/[\s()-]/g, "");
        if (!telephone) {
            throw new Error("Telephone cannot be empty!");
        }
        updatedRecord.Telephone = await encryptDeterministic(telephone, cryptoKey, "Telephone");
    }
 
    //Plaintext fields
    for (const field of ["Title", "First", "Last"]) {
        if (provided(formData[field])) {
            updatedRecord[field] = formData[field];
        }
    }
 
    //Encrypted fields
    for (const field of ["DOB", "Gender", "Address"]) {
        if (provided(formData[field])) {
            updatedRecord[field] = await encrypt(formData[field], cryptoKey);
        }
    }
 
    const emailChanged = updatedRecord.Email !== existing.Email;
 
    //Duplicate checking, only for values that actually changed
    //(an unchanged value would otherwise match this patient's own record)
    if (emailChanged &&
        await recordExists("patients", "Email", updatedRecord.Email)) {
        throw new Error("A patient with this email already exists!");
    }
 
    if (updatedRecord.NHS !== existing.NHS &&
        await recordExists("patients", "NHS", updatedRecord.NHS)) {
        throw new Error("A patient with this NHS number already exists!");
    }
 
    if (updatedRecord.Telephone !== existing.Telephone &&
        await recordExists("patients", "Telephone", updatedRecord.Telephone)) {
        throw new Error("A patient with this telephone number already exists!");
    }
 
    if (emailChanged || updatedRecord.NHS !== existing.NHS || updatedRecord.Telephone !== existing.Telephone || updatedRecord.DOB !== existing.DOB || updatedRecord.Gender !== existing.Gender || updatedRecord.Address !== existing.Address || updatedRecord.Title !== existing.Title || updatedRecord.First !== existing.First || updatedRecord.Last !== existing.Last) {
        await addRecord("patients", updatedRecord);
        await deleteRecord("patients", encryptedOriginalEmail);
    } else {
        //Same key: a normal overwrite
        await updateRecord("patients", updatedRecord);
    }
 
    console.log("Patient updated with ID: ", updatedRecord.Email);
    return updatedRecord.Email;
}

//Function to Update Doctor Info
async function updateDoctor(formData) {
    const cryptoKey = await importKey(localStorage.getItem("storedKey"));
 
    const provided = (value) => value !== undefined && value !== null;
 
    const doctorID = parseID(formData.doctorID, "Doctor ID");
 
    const existing = await getRecord("doctors", doctorID);
    if (!existing) {
        throw new Error("Doctor not found!");
    }
 
    //Starting from the stored record, then applying only the fields that were sent
    const updatedRecord = { ...existing, doctorID: doctorID };
 
    //Username. Omitted = unchanged
    if (provided(formData.Username)) {
        const username = String(formData.Username).trim().toLowerCase();
        if (!username) {
            throw new Error("Username cannot be empty!");
        }
 
        // Deterministic encryption so the existing index can match it
        updatedRecord.Username = await encryptDeterministic(username, cryptoKey, "username");
    }
 
    //Password. Omitted = unchanged
    if (provided(formData.Password)) {
        if (!formData.Password) {
            throw new Error("Password cannot be empty!");
        }
 
        // Hash the password with your existing function
        updatedRecord.Password = await hashPassword(formData.Password);
    }
 
    //Duplicate check, only if the username actually changed
    //(an unchanged username would otherwise match this doctor's own record)
    if (updatedRecord.Username !== existing.Username &&
        await recordExists("doctors", "Username", updatedRecord.Username)) {
        throw new Error("This username is already taken.");
    }
 
    await updateRecord("doctors", updatedRecord);
    console.log("Doctor updated, id:", doctorID);
    return doctorID;
}

//Function to update Medicine
async function updateMedicine(formData) {
    const cryptoKey = await importKey(localStorage.getItem("storedKey"));
 
    const medicineID = parseID(formData.medicineID, "Medicine ID");
    const drug = String(formData.drug ?? "").trim().toLowerCase();
 
    if (!drug) {
        throw new Error("Drug is required!");
    }
 
    const existing = await getRecord("medicines", medicineID);
    if (!existing) {
        throw new Error("Medicine not found!");
    }
 
    const encryptedDrug = await encryptDeterministic(drug, cryptoKey, "drug");
 
    //Duplicate checking by drug name, only if the drug actually changed
    if (encryptedDrug !== existing.drug &&
        await recordExists("medicines", "drug", encryptedDrug)) {
        throw new Error("This drug has already been added!");
    }
 
    const updatedRecord = {
        ...existing,
        medicineID: medicineID,
        drug: encryptedDrug
    };
 
    await updateRecord("medicines", updatedRecord);
    console.log("Medicine updated with ID: ", medicineID);
    return medicineID;
}

//Function to update Appointment Info
async function updateAppointment(formData) {
    const cryptoKey = await importKey(localStorage.getItem("storedKey"));
 
    const appointmentID = parseID(formData.appointmentID, "Appointment ID");
    const patientID = String(formData.patientID ?? "").trim();
    const doctorID = String(formData.doctorID ?? "").trim();
 
    if (!patientID || !doctorID ||
        !formData.patientName || !formData.doctorName || !formData.description ||
        !formData.date || !formData.time || !formData.status) {
        throw new Error("All appointment fields are required!");
    }
 
    const existing = await getRecord("appointments", appointmentID);
    if (!existing) {
        throw new Error("Appointment not found!");
    }
 
    const updatedRecord = {
        ...existing,
        appointmentID: appointmentID,
        patientID: patientID,
        patientName: formData.patientName,
        doctorID: doctorID,
        doctorName: formData.doctorName,
        description: await encrypt(formData.description, cryptoKey),
        date: await formData.date,
        time: formData.time,
        status: formData.status
    };
 
    await updateRecord("appointments", updatedRecord);
    console.log("Appointment updated with ID: ", appointmentID);
    return appointmentID;
}

//Function to update Medical Record Info
async function updateMedicalRecord(formData) {
    const cryptoKey = await importKey(localStorage.getItem("storedKey"));
 
    const medicalRecordID = parseID(formData.medicalRecordID, "Medical Record ID");
    const patientID = String(formData.patientID ?? "").trim();
    const doctorID = String(formData.doctorID ?? "").trim();
 
    if (!patientID || !doctorID ||
        !formData.diagnosis || !formData.treatment || !formData.date || !formData.time) {
        throw new Error("All medical record fields are required!");
    }
 
    const existing = await getRecord("medicalRecords", medicalRecordID);
    if (!existing) {
        throw new Error("Medical record not found!");
    }
 
    const updatedRecord = {
        ...existing,
        medicalRecordID: medicalRecordID,
        patientID: patientID,
        doctorID: doctorID,
        diagnosis: await encrypt(formData.diagnosis, cryptoKey),
        treatment: await encrypt(formData.treatment, cryptoKey),
        date: formData.date,
        time: formData.time
    };
 
    await updateRecord("medicalRecords", updatedRecord);
    console.log("Medical record updated with ID: ", medicalRecordID);
    return medicalRecordID;
}

//Function to update Feedback Info
async function updateFeedback(formData) {
    const cryptoKey = await importKey(localStorage.getItem("storedKey"));
 
    const feedbackID = parseID(formData.feedbackID, "Feedback ID");
    const senderEmail = String(formData.senderEmail ?? "").trim().toLowerCase();
 
    if (!formData.senderName || !senderEmail) {
        throw new Error("Sender Name and Sender Email are required!");
    }
 
    const existing = await getRecord("feedback", feedbackID);
    if (!existing) {
        throw new Error("Feedback not found!");
    }
 
    const updatedRecord = {
        ...existing,
        feedbackID: feedbackID,
        senderName: await encrypt(formData.senderName, cryptoKey),
        senderEmail: await encrypt(senderEmail, cryptoKey),
        status: "Read"
    };
 
    await updateRecord("feedback", updatedRecord);
    console.log("Feedback updated with ID: ", feedbackID);
    return feedbackID;
}

//Helper Functions to delete records

//Function to delete Patient Info
async function deletePatient(formData) {
    const cryptoKey = await importKey(localStorage.getItem("storedKey"));
 
    const email = String(formData.Email ?? "").trim().toLowerCase();
 
    if (!email) {
        throw new Error("The patient's email is required!");
    }
 
    //Same deterministic encryption as registration, so it matches the stored key
    const encryptedEmail = await encryptDeterministic(email, cryptoKey, "Email");
 
    const existing = await getRecord("patients", encryptedEmail);
    if (!existing) {
        throw new Error("Patient not found!");
    }
 
    await deleteRecord("patients", encryptedEmail);
    console.log("Patient deleted");
    return true;
}

//Function to delete Doctor Info
async function deleteDoctor(formData) {
    const doctorID = parseID(formData.doctorID, "Doctor ID");
 
    const existing = await getRecord("doctors", doctorID);
    if (!existing) {
        throw new Error("Doctor not found!");
    }
 
    await deleteRecord("doctors", doctorID);
    console.log("Doctor deleted, id:", doctorID);
    return true;
}

//Function to delete Medicine Info
async function deleteMedicine(formData) {
    const medicineID = parseID(formData.medicineID, "Medicine ID");
 
    const existing = await getRecord("medicines", medicineID);
    if (!existing) {
        throw new Error("Medicine not found!");
    }
 
    await deleteRecord("medicines", medicineID);
    console.log("Medicine deleted, id:", medicineID);
    return true;
}


//Rendering only selected fields
async function renderSelectedFields (storeName, key, attributes, tbodyId, encryptedFields = []) {
    getRecord(storeName, key, async (record) => {
        const cryptoKey = await importKey(localStorage.getItem("storedKey"));
        
        if (record === null) {
            console.log("No records found!");
            return;
        }

        const data = pickAttributes(record, attributes);
        
        for (const field of encryptedFields) {
            if (typeof data[field] === "string") {
                try {
                    data[field] = await decrypt(data[field], cryptoKey);
                } catch (err) {
                    console.error(`Could not decrypt "${field}":`, err);
                    data[field] = "[decryption failed]";
                }
            }
        }

        const tbody = document.getElementById(tbodyId);
        tbody.replaceChildren();
        addRow(tbody, data, attributes);
    });
}

//Rendering selected fields as a Card
async function renderSelectedFieldsAsCard(storeName, key, attributes, containerId, encryptedFields=[]) {
    getRecord(storeName, key, async (record) => {
        if (record === null) {
            console.log("No records found!");
            return;
        }

        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container with ID "${containerId}" not found.`);
            return;
        }

        const cryptoKey = await importKey(localStorage.getItem("storedKey"));
        const data = pickAttributes(record, attributes);

        for (const field of encryptedFields) {
            if (typeof data[field] === "string") {
                try {
                    data[field] = await decrypt(data[field], cryptoKey);
                } catch (err) {
                    console.error(`Could not decrypt "${field}":`, err);
                    data[field] = "[decryption failed]";
                }
            }
        }

        //Building the card
        const card = document.createElement("div");
        card.className = "card";

        const titleKey = ["title", "name"].find((k) in data);
        if (titleKey) {
            const h = document.createElement("h3");
            h.className = "card-title";
            h.textContent = data[titleKey];
            card.appendChild(h);
        }

        for (const [field, value] of Object.entries(data)) {
            if (field === titleKey) continue;

            const row = document.createElement('div');
            row.className = "card-row";

            const label = document.createElement("span");
            
            label.className = "card-label";
            label.textContent = field;

            const val = document.createElement("span");
            val.className = "card-value";
            val.textContent =
                typeof value === "object" ? JSON.stringify(value) : String(value);

            row.append(label, val);
            card.appendChild(row);
            }

            container.innerHTML = ""; // replace any previous card
            container.appendChild(card);
    });
}

//Extracting selected Fields
function pickAttributes (obj, attributes) {
    const result = {};

    for (const attr of attributes) {
        let value = obj;

        for (const part of attr.split(".")) {
            if (value === undefined || value === null | !(part in Object(value))) {
                value = undefined;
                break;
            }
            value = value[part];
        }

        if (value !== undefined) {
            result[attr] = value;
        }
    }

    return result;
}

function addRow(tbody, data, fields) {
    const tr = tbody.insertRow();

    for (const field of fields) {
        const value = data[field];

        for (const field of fields) {
        const value = data[field];
        tr.insertCell().textContent =
            value === undefined ? "" :
            typeof value === "object" && value !== null ? JSON.stringify(value) :
            String(value);
        }
    }
}

async function exportIndexedDB(databasename) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(databasename);

        request.onerror = () => reject(request.error);

        request.onsuccess = async () => {
            const db = request.result;
            const storeNames = Array.from(db.objectStoreNames);

            try {
                for (const storeName of storeNames) {
                    await exportStore(db, storeName);
                }

                resolve ();
            } catch (error) {
                reject(error);
            }
        };
    });
}

function exportStore(db, storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);

        const request = store.getAll();

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
            const data = request.result;

            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], {type: "application/json"});

            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = `${storeName}.json`
            document.body.appendChild(a);
            a.click();

            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            resolve();
        };
    });
}