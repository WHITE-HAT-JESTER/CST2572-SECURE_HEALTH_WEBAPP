const DB_NAME = "XHospitalDB";
const DB_VERSION = 1;
let db;


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
async function getRecord(storeName, key) {
    try {
        const db = await openDatabase();
        const transaction = db.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = () => {
            console.log("Record Found", request.result);
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

        request.onsuccess = () => {
            console.log(`${storeName} Records: `);
            console.log(request.result)
        };

        request.onerror = () => {
            console.error(`Failed to retrieve records from ${storeName}`, request.error);
        }
    }

    catch(error) {
        console.error("Get All Records Error: ", error);
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
    const db = await openDatabase();

    try {
        const tx = db.transaction(["patients", "doctors", "medicines", "admins"], "readwrite");

        putAll(tx, "patients", patients);
        putAll(tx, "doctors", doctors);
        putAll(tx, "medicines", medicines);
        putAll(tx, "admins", admins);

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

    const data = await fetchData();
    await saveData(data);
    console.log("Database seeded from JSON")
}

const dbReady = initDatabase();
dbReady.catch((error) => console.error("Failed to initialise database: ", error));
