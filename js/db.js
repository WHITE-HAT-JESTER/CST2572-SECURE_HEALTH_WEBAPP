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
            const patientsStore = db.createObjectStore("patients", { keyPath: "patientID"});

            patientsStore.createIndex("NHS", "NHS", { unique: true });
            patientsStore.createIndex("Title", "Title", { unique: false });
            patientsStore.createIndex("First", "First", { unique: false });
            patientsStore.createIndex("Last", "Last", { unique: false });
            patientsStore.createIndex("DOB", "DOB", { unique: false });
            patientsStore.createIndex("Gender", "Gender", { unique: false });
            patientsStore.createIndex("Address", "Address", { unique: false });
            patientsStore.createIndex("Email", "Email", { unique: false });
            patientsStore.createIndex("Telephone", "Telephone");
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

            const adminsStore = db.createObjectStore("admins", { keyPath: "adminID" });

            adminsStore.createIndex("AdminId", "AdminId", { unique: false });
            adminsStore.createIndex("First", "First", { unique: false });
            adminsStore.createIndex("Last", "Last", { unique: false });
            adminsStore.createIndex("dob", "dob", { unique: false });
            adminsStore.createIndex("gender", "gender", { unique: false });
            adminsStore.createIndex("address", "address", { unique: false });
            adminsStore.createIndex("email", "email", { unique: true });
            adminsStore.createIndex("telephone", "telephone");
        }

        //Medicines
        if (!db.objectStoreNames.contains("medicines")) {

            const medicinesStore = db.createObjectStore("medicines", { keyPath: "medicineID" });

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
        }

        console.log("Database setup completed!");

    
    }
});
}

//CRUD Operations

// Add a new record to the specified object store
async function addRecord(storeName, record) {
    try {
        const db = await openDatabase();
        const transaction = db.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.add(record);

        request.onsuccess = () => {
            console.log(`Record added to ${storeName}:`);
        };

        request.onerror = () => {
            console.error(`Failed to add record to ${storeName}`, request.error);
        };
    }

    catch (error) {
        console.error("Error adding record:", error);   
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
        const transaction = db.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.put(record);

        request.onsuccess = () => {
            console.log(`Record updated in ${storeName}`);
        };

        request.onerror = () => {
            console.error(`Failed to update record in ${storeName}`, request.error);
        };
    }

    catch(error) {
        console.error("Update Record Error: ", error);
    };
}

//Delete an Existing Record
async function deleteRecord (storeName, key) {
    try {
        const db = await openDatabase();

        const transaction = db.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);

        request.onsuccess = () => {
            console.log(`Record ${key} deleted from ${storeName}`);
        };

        request.onerror = () => {
            console.error(`Failed to delete record from ${storeName}`, request.error);
        };
    }
    
    catch(error) {
        console.error("Delete Record Error: ", error);
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