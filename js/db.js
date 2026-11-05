// ============================================================
//  db.js  -  IndexedDB layer for X Hospital
//  Load order: encryption.js, db.js, auth.js, (page script)
//  Needs from encryption.js: importKey, initialiseEncryptionKey,
//  encrypt, decrypt, encryptDeterministic, hashPassword
// ============================================================

const DB_NAME = "XHospitalDB";
const DB_VERSION = 2;          // bumped: schema changed (autoIncrement keys, extra indexes)
const SCHEMA_RESET_BELOW = 2;  // databases older than this are wiped and re-seeded on upgrade

// ---------- Schema ----------
// indexes: [name, unique]  (index keyPath = name)
const SCHEMA = {
    patients: {
        keyPath: "id", autoIncrement: true,
        indexes: [["NHS", true], ["Title", false], ["First", false], ["Last", false], ["DOB", false],
                  ["Gender", false], ["Address", false], ["Email", false], ["Telephone", true]]
    },
    doctors: {
        keyPath: "doctorID", autoIncrement: true,
        indexes: [["First", false], ["Last", false], ["email", true], ["gender", false],
                  ["Address", false], ["Telephone", true]]
    },
    admins: {
        keyPath: "username", autoIncrement: false,
        indexes: [["passwordHash", false]]
    },
    patientsCred: {
        keyPath: "id", autoIncrement: false,
        indexes: [["email", true], ["username", false], ["passwordHash", false]]
    },
    doctorsCred: {
        keyPath: "id", autoIncrement: false,
        indexes: [["email", false], ["username", false], ["passwordHash", false]]
    },
    medicines: {
        keyPath: "medicineID", autoIncrement: true,
        indexes: [["drug", false]]
    },
    appointments: {
        keyPath: "appointmentID", autoIncrement: true,
        indexes: [["patientID", false], ["patientName", false], ["doctorID", false], ["doctorName", false],
                  ["description", false], ["date", false], ["time", false], ["status", false]]
    },
    medicalRecords: {
        keyPath: "medicalRecordID", autoIncrement: true,
        indexes: [["patientID", false], ["patientName", false], ["doctorID", false], ["diagnosis", false],
                  ["treatment", false], ["date", false], ["time", false]]
    },
    activityLogs: {
        keyPath: "logID", autoIncrement: true,
        indexes: [["role", false], ["userID", false], ["action", false], ["timestamp", false]]
    },
    feedback: {
        keyPath: "feedbackID", autoIncrement: true,
        indexes: [["SenderName", false], ["SenderEmail", false], ["feedbackMessage", false], ["status", false]]
    }
};

// Stores filled from the JSON files
const SEEDED_STORES = ["patients", "doctors", "medicines", "admins", "doctorsCred",
                       "patientsCred", "appointments", "medicalRecords"];

// Field that holds the id in each JSON file
const JSON_ID_FIELD = {
    patients: "id",
    doctors: "doctorID",
    medicines: "medicineID",
    admins: "username",
    doctorsCred: "id",
    patientsCred: "id",
    appointments: "appointmentID",
    medicalRecords: "medicalRecordID"
};

// ---------- Connection (one shared connection) ----------
let dbPromise = null;

function openDatabase() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const database = request.result;
            const upgradeTx = request.transaction;

            // Old structure can't be altered in place (keys/autoIncrement), so rebuild it
            if (event.oldVersion > 0 && event.oldVersion < SCHEMA_RESET_BELOW) {
                for (const name of Array.from(database.objectStoreNames)) {
                    database.deleteObjectStore(name);
                }
            }

            for (const [name, def] of Object.entries(SCHEMA)) {
                if (database.objectStoreNames.contains(name)) continue;

                const store = database.createObjectStore(name, {
                    keyPath: def.keyPath,
                    autoIncrement: def.autoIncrement
                });
                for (const [indexName, unique] of def.indexes) {
                    store.createIndex(indexName, indexName, { unique });
                }
            }
            console.log("Database setup completed!");
        };

        request.onsuccess = () => {
            const database = request.result;
            // If another tab upgrades the DB, let it through instead of blocking it
            database.onversionchange = () => {
                database.close();
                dbPromise = null;
            };
            resolve(database);
        };

        request.onerror = () => {
            console.error("Error opening database:", request.error);
            dbPromise = null;
            reject(request.error);
        };

        request.onblocked = () => {
            console.warn("Database upgrade is blocked: close the other tabs of this site.");
        };
    });

    return dbPromise;
}

// ---------- Small helpers ----------
const isBlank = (v) => v === undefined || v === null || String(v).trim() === "";

const normEmail = (v) => String(v ?? "").trim().toLowerCase();
const normNHS   = (v) => String(v ?? "").replace(/[\s-]/g, "");
const normPhone = (v) => String(v ?? "").replace(/[\s()-]/g, "");

// IDs that look like numbers become numbers, anything else stays a string
function parseID(value, label = "ID") {
    const text = String(value ?? "").trim();
    if (!text) throw new Error(`Valid ${label} required!`);
    return /^\d+$/.test(text) ? Number(text) : text;
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

async function encryptDeterministic(value, cryptoKey, purpose = "") {
    const encoder = new TextEncoder();

    const data = encoder.encode(
        `${purpose}:${String(value).trim().toLowerCase()}`
    );

    const hashBuffer = await crypto.subtle.digest(
        "SHA-256",
        data
    );

    return btoa(
        String.fromCharCode(
            ...new Uint8Array(hashBuffer)
        )
    );
}

// Encrypt only when there is a value (empty/missing values are left as they are)
async function encOpt(value, key, context) {
    if (isBlank(value)) return value;
    return context === undefined
        ? encrypt(String(value), key)
        : encrypt(String(value), key, context);
}
async function encDet(value, key, context) {
    if (isBlank(value)) return value;
    return encryptDeterministic(String(value), key, context);
}

// ---------- Fetching the JSON files ----------
const DATA_URL = "https://raw.githubusercontent.com/sajjadalijuma-design/securewebtech_data/main/data/";
const DATA_FILES = {
    patients: "Patients.json",
    doctors: "doctor.json",
    medicines: "Medicines.json",
    admins: "Admin.json",
    doctorsCred: "doctors_cred.json",
    patientsCred: "patients_cred.json",
    appointments: "Appointments.json",
    medicalRecords: "MedicalRecords.json"
};

// Accepts [..] or { "something": [..] }
const unwrap = (data) => {
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object") {
        const firstArray = Object.values(data).find(Array.isArray);
        return firstArray ?? Object.values(data);
    }
    return [];
};

async function fetchData() {
    try {
        const names = Object.keys(DATA_FILES);
        const responses = await Promise.all(names.map((n) => fetch(DATA_URL + DATA_FILES[n])));

        responses.forEach((r) => {
            if (!r.ok) throw new Error(`Failed to fetch ${r.url} (HTTP ${r.status})`);
        });

        const parsed = await Promise.all(responses.map((r) => r.json()));
        const result = {};
        names.forEach((n, i) => { result[n] = unwrap(parsed[i]); });
        return result;
    } catch (error) {
        console.error("Failed to load JSON data: ", error);
        throw error;
    }
}

// ---------- CRUD ----------
async function addRecord(storeName, record) {
    const database = await openDatabase();

    return new Promise((resolve, reject) => {
        const tx = database.transaction(storeName, "readwrite");
        let key;
        const request = tx.objectStore(storeName).add(record);

        request.onsuccess = () => { key = request.result; };
        tx.oncomplete = () => {
            console.log(`Record added to ${storeName} with key: ${key}`);
            resolve(key);
        };
        tx.onerror = () => {
            console.error(`Failed to add record to ${storeName}`, tx.error);
            reject(tx.error);
        };
        tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    });
}

// Gets one record by primary key (null if missing).
// Falls back between 5 and "5" so number/string id mismatches don't hide a record.
async function findRecord(storeName, key) {
    const database = await openDatabase();

    const get = (k) => new Promise((resolve, reject) => {
        const request = database.transaction(storeName, "readonly").objectStore(storeName).get(k);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    let record = await get(key);
    if (record === undefined && typeof key === "number") record = await get(String(key));
    else if (record === undefined && typeof key === "string" && /^\d+$/.test(key)) record = await get(Number(key));
    return record ?? null;
}

// Same as findRecord but with a callback (used by the render helpers)
async function getRecord(storeName, key, callback) {
    try {
        const record = await findRecord(storeName, key);
        if (record === null) console.log("No record found for key: ", key);
        callback(record);
    } catch (error) {
        console.error("Get record error: ", error);
        callback(null);
    }
}

async function getAllRecords(storeName) {
    const database = await openDatabase();

    return new Promise((resolve, reject) => {
        const request = database.transaction(storeName, "readonly").objectStore(storeName).getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function updateRecord(storeName, record) {
    const database = await openDatabase();

    return new Promise((resolve, reject) => {
        const tx = database.transaction(storeName, "readwrite");
        const request = tx.objectStore(storeName).put(record);

        tx.oncomplete = () => {
            console.log(`Record updated in ${storeName}`);
            resolve(request.result);
        };
        tx.onerror = () => {
            console.error(`Failed to update record in ${storeName}`, tx.error);
            reject(tx.error);
        };
        tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    });
}

async function deleteRecord(storeName, key) {
    const database = await openDatabase();

    return new Promise((resolve, reject) => {
        const tx = database.transaction(storeName, "readwrite");
        tx.objectStore(storeName).delete(key);

        tx.oncomplete = () => {
            console.log(`Record ${key} deleted from ${storeName}`);
            resolve(true);
        };
        tx.onerror = () => {
            console.error(`Failed to delete record from ${storeName}`, tx.error);
            reject(tx.error);
        };
        tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    });
}

async function clearStore(storeName) {
    const database = await openDatabase();

    return new Promise((resolve, reject) => {
        const tx = database.transaction(storeName, "readwrite");
        tx.objectStore(storeName).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    });
}

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

// Returns the matching records (also prints them to the console)
async function searchByIndex(storeName, indexName, value) {
    const database = await openDatabase();

    return new Promise((resolve, reject) => {
        const request = database.transaction(storeName, "readonly")
            .objectStore(storeName).index(indexName).getAll(value);
        request.onsuccess = () => {
            console.table(request.result);
            resolve(request.result);
        };
        request.onerror = () => {
            console.error(`Search failed in ${storeName}: `, request.error);
            reject(request.error);
        };
    });
}

async function recordExists(storeName, indexName, value) {
    const database = await openDatabase();

    return new Promise((resolve, reject) => {
        const request = database.transaction(storeName, "readonly")
            .objectStore(storeName).index(indexName).count(value);
        request.onsuccess = () => resolve(request.result > 0);
        request.onerror = () => reject(request.error);
    });
}

// Finds a credential record from what the user typed at login.
// Credentials are keyed by "id", so a plain key lookup with the email never works.
async function getCredentialByLogin(storeName, login) {
    const wanted = normEmail(login);
    if (!wanted) return null;

    if (storeName === "admins") return findRecord("admins", wanted);

    const hit = (await findByIndex(storeName, "email", wanted))
             || (await findByIndex(storeName, "username", wanted));
    if (hit) return hit;

    // Fallback for JSON files that use other field names (Email, Username, ...)
    const all = await getAllRecords(storeName);
    return all.find((c) => ["email", "Email", "username", "Username"]
        .some((f) => normEmail(c[f]) === wanted)) || null;
}

// ---------- Seeding ----------
async function isSeeded() {
    const database = await openDatabase();

    const count = (storeName) => new Promise((resolve, reject) => {
        const request = database.transaction(storeName, "readonly").objectStore(storeName).count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    // Both must have data, otherwise a half-finished seed would be treated as complete
    return (await count("patients")) > 0 && (await count("admins")) > 0;
}

// Hashes the password and normalises the login fields. Returns null if unusable.
async function prepareCredential(cred) {
    const record = { ...cred };

    if (record.password !== undefined) {
        record.passwordHash = await hashPassword(String(record.password));
        delete record.password;
    }
    if (!record.passwordHash) {
        console.warn("Skipping credential without password/passwordHash:", cred);
        return null;
    }
    if (record.email) record.email = normEmail(record.email);
    if (record.username) record.username = normEmail(record.username);
    return record;
}

// putAll: a single bad row (duplicate, missing id) is skipped instead of killing the whole seed
function putAll(tx, storeName, items) {
    const store = tx.objectStore(storeName);
    const idField = JSON_ID_FIELD[storeName];

    items.forEach((item, i) => {
        const record = { ...item };

        if (record[store.keyPath] === undefined && item[idField] !== undefined) {
            record[store.keyPath] = item[idField];
        }
        if (record[store.keyPath] === undefined && !store.autoIncrement) {
            console.error("Still no key", i, store.name, Object.keys(item));
            return;
        }

        const request = store.put(record);
        request.onerror = (event) => {
            event.preventDefault();   // keep the transaction alive
            console.error(`Skipped row ${i} in ${store.name}:`, request.error);
        };
    });
}

async function saveData(data) {
    const key = await loadDataKey();

    // Passwords: hash everything before opening the transaction
    const prepare = async (list) => (await Promise.all(list.map(prepareCredential))).filter(Boolean);
    const hashedAdmins = await prepare(data.admins);
    const hashedDoctorsCred = await prepare(data.doctorsCred);
    const hashedPatientsCred = await prepare(data.patientsCred);

    // Same normalisation + same encryption context as registerPatient/updatePatient
    const encryptedPatients = [];
    for (const patient of data.patients) {
        const record = { ...patient };
        record.NHS = await encDet(normNHS(record.NHS), key, "NHS");
        record.DOB = await encOpt(record.DOB, key);
        record.Gender = await encOpt(record.Gender, key);
        record.Address = await encOpt(record.Address, key);
        record.Email = await encDet(normEmail(record.Email), key, "Email");
        record.Telephone = await encDet(normPhone(record.Telephone), key, "Telephone");
        delete record.password;
        encryptedPatients.push(record);
    }

    // Same as registerDoctor/updateDoctor
    const encryptedDoctors = [];
    for (const doctor of data.doctors) {
        const record = { ...doctor };
        record.email = await encDet(normEmail(record.email), key, "email");
        record.gender = await encOpt(record.gender, key);
        record.Address = await encOpt(record.Address, key);
        record.Telephone = await encDet(normPhone(record.Telephone), key, "Telephone");
        encryptedDoctors.push(record);
    }

    const encryptedAppointments = [];
    for (const appointment of data.appointments) {
        const record = { ...appointment };
        record.description = await encOpt(record.description, key);
        encryptedAppointments.push(record);
    }

    const encryptedMedicalRecords = [];
    for (const medicalRecord of data.medicalRecords) {
        const record = { ...medicalRecord };
        record.diagnosis = await encOpt(record.diagnosis, key);
        record.treatment = await encOpt(record.treatment, key);
        encryptedMedicalRecords.push(record);
    }

    const database = await openDatabase();
    const tx = database.transaction(SEEDED_STORES, "readwrite");

    putAll(tx, "patients", encryptedPatients);
    putAll(tx, "doctors", encryptedDoctors);
    putAll(tx, "medicines", data.medicines);
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
}

async function initDatabase() {
    const database = await openDatabase();
    const hadKey = !!localStorage.getItem("storedKey");

    if (await isSeeded()) {
        if (hadKey) return; // everything is consistent

        // The key was lost: encrypted data is unreadable, start again
        console.warn("Encryption key missing, reseeding the database.");
        for (const name of Array.from(database.objectStoreNames)) {
            await clearStore(name);
        }
    }

    await initialiseEncryptionKey();
    const data = await fetchData();
    await saveData(data);
    console.log("Database seeded from JSON");
}

const dbReady = initDatabase();
dbReady.catch((error) => console.error("Failed to initialise database: ", error));

// ============================================================
//  Create
// ============================================================

// Registers a patient. If formData.Password is given, the login record is created too.
async function registerPatient(formData) {
    const key = await loadDataKey();

    const nhs = normNHS(formData.NHS);
    const email = normEmail(formData.Email);
    const telephone = normPhone(formData.Telephone);

    if (!nhs || !email || !telephone) {
        throw new Error("NHS number, Email, and Telephone are required!");
    }

    const encryptedNHS = await encDet(nhs, key, "NHS");
    const encryptedEmail = await encDet(email, key, "Email");
    const encryptedTelephone = await encDet(telephone, key, "Telephone");

    if (await recordExists("patients", "Email", encryptedEmail)) {
        throw new Error("A patient with this email already exists!");
    }
    if (await recordExists("patients", "NHS", encryptedNHS)) {
        throw new Error("A patient with this NHS number already exists!");
    }
    if (await recordExists("patients", "Telephone", encryptedTelephone)) {
        throw new Error("A patient with this telephone number already exists!");
    }
    if (formData.Password && await recordExists("patientsCred", "email", email)) {
        throw new Error("An account with this email already exists!");
    }

    const passwordHash = formData.Password ? await hashPassword(String(formData.Password)) : null;

    const patientRecord = {
        NHS: encryptedNHS,
        Title: formData.Title,
        First: formData.First,
        Last: formData.Last,
        DOB: await encOpt(formData.DOB, key),
        Gender: await encOpt(formData.Gender, key),
        Address: await encOpt(formData.Address, key),
        Email: encryptedEmail,
        Telephone: encryptedTelephone
    };

    const patientID = await addRecord("patients", patientRecord);

    if (passwordHash) {
        try {
            await addRecord("patientsCred", { id: patientID, email, username: email, passwordHash });
        } catch (error) {
            await deleteRecord("patients", patientID); // don't leave a patient who can't log in
            throw error;
        }
    }

    console.log("Patient registered with ID: ", patientID);
    return patientID;
}

// Registers a doctor + login. Needs: email, Password, Telephone (+ any profile fields, e.g. First, Last)
async function registerDoctor(formData) {
    const key = await loadDataKey();

    const email = normEmail(formData.email ?? formData.Email ?? formData.Username);
    const telephone = normPhone(formData.Telephone);

    if (!email || !formData.Password) {
        throw new Error("Email and password are required!");
    }
    if (!telephone) {
        throw new Error("Telephone is required!");
    }

    const encryptedEmail = await encDet(email, key, "email");
    const encryptedTelephone = await encDet(telephone, key, "Telephone");

    if (await recordExists("doctors", "email", encryptedEmail)) {
        throw new Error("A doctor with this email already exists!");
    }
    if (await recordExists("doctors", "Telephone", encryptedTelephone)) {
        throw new Error("A doctor with this telephone number already exists!");
    }

    const passwordHash = await hashPassword(String(formData.Password));

    const { Password, Username, Email, ...profile } = formData;
    const doctorRecord = {
        ...profile,
        email: encryptedEmail,
        gender: await encOpt(formData.gender, key),
        Address: await encOpt(formData.Address, key),
        Telephone: encryptedTelephone
    };

    const doctorID = await addRecord("doctors", doctorRecord);

    try {
        await addRecord("doctorsCred", {
            id: doctorID,
            email,
            username: normEmail(formData.Username ?? email),
            passwordHash
        });
    } catch (error) {
        await deleteRecord("doctors", doctorID);
        throw error;
    }

    console.log("Doctor registered, id:", doctorID);
    return doctorID;
}

// Medicines are not sensitive, so they are stored in plain text (lowercase)
async function registerMedicine(formData) {
    const drug = String(formData.drug ?? "").trim().toLowerCase();

    if (!drug) throw new Error("Drug name is required!");

    if (await recordExists("medicines", "drug", drug)) {
        throw new Error("This drug has already been added!");
    }

    const medicineID = await addRecord("medicines", { drug });
    console.log("Medicine added with ID: ", medicineID);
    return medicineID;
}

async function registerAppointment(formData) {
    const key = await loadDataKey();

    const patientID = String(formData.patientID ?? "").trim();
    const doctorID = String(formData.doctorID ?? "").trim();

    if (!patientID || !doctorID ||
        !formData.patientName || !formData.doctorName || !formData.description ||
        !formData.date || !formData.time || !formData.status) {
        throw new Error("All appointment fields are required!");
    }

    const appointmentRecord = {
        patientID,
        patientName: formData.patientName,
        doctorID,
        doctorName: formData.doctorName,
        department: formData.department ?? "",
        description: await encOpt(formData.description, key),
        date: formData.date,
        time: formData.time,
        status: formData.status
    };

    const appointmentID = await addRecord("appointments", appointmentRecord);
    console.log("Appointment added with ID: ", appointmentID);
    return appointmentID;
}

async function registerMedicalRecord(formData) {
    const key = await loadDataKey();

    const patientID = String(formData.patientID ?? "").trim();
    const doctorID = String(formData.doctorID ?? "").trim();

    if (!patientID || !doctorID ||
        !formData.diagnosis || !formData.treatment || !formData.date || !formData.time) {
        throw new Error("All medical record fields are required!");
    }

    const medicalRecord = {
        patientID,
        patientName: formData.patientName ?? "",
        doctorID,
        diagnosis: await encOpt(formData.diagnosis, key),
        treatment: await encOpt(formData.treatment, key),
        date: formData.date,
        time: formData.time
    };

    const medicalRecordID = await addRecord("medicalRecords", medicalRecord);
    console.log("Medical record added with ID: ", medicalRecordID);
    return medicalRecordID;
}

// Accepts SenderName/SenderEmail (as in the store) or senderName/senderEmail
async function registerFeedback(formData) {
    const key = await loadDataKey();

    const senderName = String(formData.SenderName ?? formData.senderName ?? "").trim();
    const senderEmail = normEmail(formData.SenderEmail ?? formData.senderEmail);

    if (!senderName || !senderEmail) {
        throw new Error("Sender Name and Sender Email are required!");
    }

    const feedbackRecord = {
        SenderName: senderName,
        SenderEmail: await encOpt(senderEmail, key),
        feedbackMessage: await encOpt(formData.feedbackMessage ?? "", key),
        status: "New"
    };

    const feedbackID = await addRecord("feedback", feedbackRecord);
    console.log("Feedback added with ID: ", feedbackID);
    return feedbackID;
}

// ============================================================
//  Update
// ============================================================

async function updatePatient(formData) {
    const key = await loadDataKey();
    const provided = (v) => v !== undefined && v !== null;

    const patientID = parseID(formData.id, "patient ID");
    const existing = await findRecord("patients", patientID);
    if (!existing) throw new Error("Patient not found!");

    const updatedRecord = { ...existing }; // keeps the stored key

    if (provided(formData.Email)) {
        const email = normEmail(formData.Email);
        if (!email) throw new Error("Email cannot be empty!");
        updatedRecord.Email = await encDet(email, key, "Email");
    }
    if (provided(formData.NHS)) {
        const nhs = normNHS(formData.NHS);
        if (!nhs) throw new Error("NHS number cannot be empty!");
        updatedRecord.NHS = await encDet(nhs, key, "NHS");
    }
    if (provided(formData.Telephone)) {
        const telephone = normPhone(formData.Telephone);
        if (!telephone) throw new Error("Telephone cannot be empty!");
        updatedRecord.Telephone = await encDet(telephone, key, "Telephone");
    }

    for (const field of ["Title", "First", "Last"]) {
        if (provided(formData[field])) updatedRecord[field] = formData[field];
    }
    for (const field of ["DOB", "Gender", "Address"]) {
        if (provided(formData[field])) updatedRecord[field] = await encOpt(formData[field], key);
    }

    if (updatedRecord.Email !== existing.Email &&
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

    await updateRecord("patients", updatedRecord);

    // Keep the login email in sync when the email changed
    if (provided(formData.Email) && updatedRecord.Email !== existing.Email) {
        const cred = await findRecord("patientsCred", existing.id);
        if (cred) {
            const email = normEmail(formData.Email);
            await updateRecord("patientsCred", { ...cred, email, username: email });
        }
    }

    console.log("Patient updated with ID:", existing.id);
    return existing.id;
}

async function updateDoctor(formData) {
    const key = await loadDataKey();
    const provided = (v) => v !== undefined && v !== null;

    const doctorID = parseID(formData.doctorID, "Doctor ID");
    const existing = await findRecord("doctors", doctorID);
    if (!existing) throw new Error("Doctor not found!");

    const updatedRecord = { ...existing };

    if (provided(formData.email)) {
        const email = normEmail(formData.email);
        if (!email) throw new Error("Email cannot be empty!");
        updatedRecord.email = await encDet(email, key, "email");
    }
    if (provided(formData.gender)) {
        updatedRecord.gender = await encOpt(formData.gender, key);
    }
    if (provided(formData.Address)) {
        updatedRecord.Address = await encOpt(formData.Address, key);
    }
    if (provided(formData.Telephone)) {
        const telephone = normPhone(formData.Telephone);
        if (!telephone) throw new Error("Telephone cannot be empty!");
        updatedRecord.Telephone = await encDet(telephone, key, "Telephone");
    }
    for (const field of ["First", "Last"]) {
        if (provided(formData[field])) updatedRecord[field] = formData[field];
    }

    if (updatedRecord.email !== existing.email &&
        await recordExists("doctors", "email", updatedRecord.email)) {
        throw new Error("A doctor with this email already exists!");
    }
    if (updatedRecord.Telephone !== existing.Telephone &&
        await recordExists("doctors", "Telephone", updatedRecord.Telephone)) {
        throw new Error("A doctor with this telephone number already exists!");
    }

    await updateRecord("doctors", updatedRecord);
    console.log("Doctor updated with ID:", existing.doctorID);
    return existing.doctorID;
}

// formData: { email, Password }
async function updatePatientCredentials(formData) {
    const email = normEmail(formData.email);
    const newPassword = formData.Password;

    if (!email || !newPassword) {
        throw new Error("Email and new password are required!");
    }

    const existing = await getCredentialByLogin("patientsCred", email);
    if (!existing) throw new Error("Patient credentials not found!");

    const passwordHash = await hashPassword(String(newPassword));
    await updateRecord("patientsCred", { ...existing, passwordHash });

    console.log("Patient credentials updated for email: ", email);
    return email;
}

async function updateMedicine(formData) {
    const medicineID = parseID(formData.medicineID, "Medicine ID");
    const drug = String(formData.drug ?? "").trim().toLowerCase();

    if (!drug) throw new Error("Drug is required!");

    const existing = await findRecord("medicines", medicineID);
    if (!existing) throw new Error("Medicine not found!");

    // Plain text, same as registerMedicine
    if (drug !== existing.drug && await recordExists("medicines", "drug", drug)) {
        throw new Error("This drug has already been added!");
    }

    await updateRecord("medicines", { ...existing, drug });
    console.log("Medicine updated with ID: ", existing.medicineID);
    return existing.medicineID;
}

async function updateAppointment(formData) {
    const key = await loadDataKey();

    const appointmentID = parseID(formData.appointmentID, "Appointment ID");
    const patientID = String(formData.patientID ?? "").trim();
    const doctorID = String(formData.doctorID ?? "").trim();

    if (!patientID || !doctorID ||
        !formData.patientName || !formData.doctorName || !formData.description ||
        !formData.date || !formData.time || !formData.status) {
        throw new Error("All appointment fields are required!");
    }

    const existing = await findRecord("appointments", appointmentID);
    if (!existing) throw new Error("Appointment not found!");

    await updateRecord("appointments", {
        ...existing,
        patientID,
        patientName: formData.patientName,
        doctorID,
        doctorName: formData.doctorName,
        description: await encOpt(formData.description, key),
        date: formData.date,
        time: formData.time,
        status: formData.status
    });

    console.log("Appointment updated with ID: ", existing.appointmentID);
    return existing.appointmentID;
}

async function updateMedicalRecord(formData) {
    const key = await loadDataKey();

    const medicalRecordID = parseID(formData.medicalRecordID, "Medical Record ID");
    const patientID = String(formData.patientID ?? "").trim();
    const doctorID = String(formData.doctorID ?? "").trim();

    if (!patientID || !doctorID ||
        !formData.diagnosis || !formData.treatment || !formData.date || !formData.time) {
        throw new Error("All medical record fields are required!");
    }

    const existing = await findRecord("medicalRecords", medicalRecordID);
    if (!existing) throw new Error("Medical record not found!");

    await updateRecord("medicalRecords", {
        ...existing,
        patientID,
        doctorID,
        diagnosis: await encOpt(formData.diagnosis, key),
        treatment: await encOpt(formData.treatment, key),
        date: formData.date,
        time: formData.time
    });

    console.log("Medical record updated with ID: ", existing.medicalRecordID);
    return existing.medicalRecordID;
}

// Only changes the status (default "Read"); the stored message/sender are left untouched
async function updateFeedback(formData) {
    const feedbackID = parseID(formData.feedbackID, "Feedback ID");

    const existing = await findRecord("feedback", feedbackID);
    if (!existing) throw new Error("Feedback not found!");

    await updateRecord("feedback", { ...existing, status: formData.status ?? "Read" });
    console.log("Feedback updated with ID: ", existing.feedbackID);
    return existing.feedbackID;
}

// ============================================================
//  Delete
// ============================================================

async function deletePatient(formData) {
    const patientID = parseID(formData.id, "patient ID");

    const existing = await findRecord("patients", patientID);
    if (!existing) throw new Error("Patient not found!");

    await deleteRecord("patients", existing.id);
    await deleteRecord("patientsCred", existing.id); // login goes with the patient

    console.log("Patient deleted", existing.id);
    return true;
}

async function deleteDoctor(formData) {
    const doctorID = parseID(formData.doctorID, "Doctor ID");

    const existing = await findRecord("doctors", doctorID);
    if (!existing) throw new Error("Doctor not found!");

    await deleteRecord("doctors", existing.doctorID);
    await deleteRecord("doctorsCred", existing.doctorID);

    console.log("Doctor deleted, id:", existing.doctorID);
    return true;
}

async function deletePatientCred(formData) {
    const existing = await getCredentialByLogin("patientsCred", formData.email);
    if (!existing) throw new Error("Patient credentials not found!");

    await deleteRecord("patientsCred", existing.id);
    console.log("Patient credentials have been deleted", existing.email);
    return true;
}

async function deleteMedicine(formData) {
    const medicineID = parseID(formData.medicineID, "Medicine ID");

    const existing = await findRecord("medicines", medicineID);
    if (!existing) throw new Error("Medicine not found!");

    await deleteRecord("medicines", existing.medicineID);
    console.log("Medicine deleted, id:", existing.medicineID);
    return true;
}

// ============================================================
//  Rendering helpers
// ============================================================

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

// Shows every field of one record (header + one row)
function renderAllFields(storeName, key, tbodyId, theadId) {
    getRecord(storeName, key, (record) => {
        if (record === null) {
            console.log("No records found!");
            return;
        }

        const thead = document.getElementById(theadId);
        const tbody = document.getElementById(tbodyId);

        if (!thead || !tbody) {
            console.error(`Element ${!thead ? theadId : tbodyId} not found`);
            return;
        }

        const fields = Object.keys(record);

        thead.replaceChildren();
        const headRow = thead.insertRow();
        for (const field of fields) {
            const th = document.createElement("th");
            th.className = "med-requests";
            th.textContent = field;
            headRow.appendChild(th);
        }

        tbody.replaceChildren();
        addRow(tbody, record, fields);
    });
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

// Same data as a card
async function renderSelectedFieldsAsCard(storeName, key, attributes, containerId, encryptedFields = []) {
    const record = await findRecord(storeName, key);
    if (!record) {
        console.log("No records found");
        return;
    }

    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container with ID "${containerId}" not found.`);
        return;
    }

    const dataKey = await loadDataKey();
    const data = pickAttributes(record, attributes);
    await decryptFields(data, encryptedFields, dataKey);

    const card = document.createElement("div");
    card.className = "card";

    for (const [field, value] of Object.entries(data)) {
        const row = document.createElement("div");
        row.className = "card-row";

        const label = document.createElement("span");
        label.className = "card-label";
        label.textContent = field;

        const val = document.createElement("span");
        val.className = "card-value";
        val.textContent = typeof value === "object" ? JSON.stringify(value) : String(value);

        row.append(label, val);
        card.appendChild(row);
    }

    container.replaceChildren(card);
}

// ============================================================
//  Export (downloads one JSON file per store)
// ============================================================

async function exportIndexedDB() {
    const database = await openDatabase();
    for (const storeName of Array.from(database.objectStoreNames)) {
        await exportStore(database, storeName);
    }
}

function exportStore(database, storeName) {
    return new Promise((resolve, reject) => {
        const request = database.transaction(storeName, "readonly").objectStore(storeName).getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const blob = new Blob([JSON.stringify(request.result, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = `${storeName}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            resolve();
        };
    });
}