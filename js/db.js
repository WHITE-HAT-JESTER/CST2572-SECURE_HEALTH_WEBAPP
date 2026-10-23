const DB_NAME = "XHospitalDB";
const DB_VERSION = 1;
let db;

//Open or Create the Database
function openDatabase() {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
        console.error("Error opening database:", request.error);
        reject(request.error);
    };

    request.onsuccess = () => {
        console.log("Database opened successfully!");
        resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
        const db = event.target.result;

        //Patients
        if (!db.ObjectStoreNames.contains("patients")) {
            const patientsStore = db.createObjectStore("patients", { keyPath: "patientID"});

            patientsStore.createIndex("NHS", "NHS", { unique: true });
            patientsStore.createIndex("Title", "Title", { unique: false });
            patientsStore.createIndex("First", "First", { unique: false });
            patientsStore.createIndex("Last", "Last", { unique: false });
            patientsStore.createIndex("DOB", "DOB", { unique: false });
            patientsStore.createIndex("Gender", "Gender", { unique: false });
            patientsStore.createIndex("Address", "Address", { unique: false });
            patientsStore.createIndex("email", "email", { unique: false });
            patientsStore.createIndex("telephone", "telephone");
        }

        //Doctors
        if (!db.ObjectStoreNames.contains("doctors")) {

            const doctorsStore = db.createObjectStore("doctors", { keyPath: "doctorID" });

            doctorsStore.createIndex("Title", "Title", { unique: false });
            doctorsStore.createIndex("First", "First", { unique: false });
            doctorsStore.createIndex("Last", "Last", { unique: false });
            doctorsStore.createIndex("Specialization", "Specialization", { unique: false });
            doctorsStore.createIndex("dob", "dob", { unique: false });
            doctorsStore.createIndex("gender", "gender", { unique: false });
            doctorsStore.createIndex("address", "address", { unique: false });
            doctorsStore.createIndex("email", "email", { unique: true });
            doctorsStore.createIndex("telephone", "telephone");
        }

        //Admins
        if (!db.ObjectStoreNames.contains("admins")) {

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
        if (!db.ObjectStoreNames.contains("medicines")) {

            const medicinesStore = db.createObjectStore("medicines", { keyPath: "medicineID" });

            medicinesStore.createIndex("medicineID", "medicineID", { unique: true });
            medicinesStore.createIndex("drug", "drug", { unique: false });
            medicinesStore.createIndex("description", "description", { unique: false });
        }
        
        //Appointments
        if (!db.ObjectStoreNames.contains("appointments")) {

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
        if (!db.ObjectStoreNames.contains("medicalRecords")) {

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
        if (!db.ObjectStoreNames.contains("activityLogs")) {

            const activityLogsStore = db.createObjectStore("activityLogs", { keyPath: "logID" });

            activityLogsStore.createIndex("logID", "logID", { unique: true });
            activityLogsStore.createIndex("role", "role", { unique: false });
            activityLogsStore.createIndex("userID", "userID", { unique: false });
            activityLogsStore.createIndex("action", "action", { unique: false });
            activityLogsStore.createIndex("timestamp", "timestamp", { unique: false });
        }

        //Feedback
        if (!db.ObjectStoreNames.contains("feedback")) {

            const feedbackStore = db.createObjectStore("feedback", { keyPath: "feedbackID" });

            feedbackStore.createIndex("feedbackID", "feedbackID", { unique: true });
            feedbackStore.createIndex("SenderName", "SenderName", { unique: false });
            feedbackStore.createIndex("SenderEmail", "SenderEmail", { unique: false });
        }

        console.log("Database setup completed!");

    
    }
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
        const store = transaction.ObjectStore(storeName);
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
async function updateRecord(params) {
    
}

