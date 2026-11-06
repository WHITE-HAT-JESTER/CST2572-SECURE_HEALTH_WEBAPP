"use strict";


//CALENDAR FUNCTIONS
(function () { //wrapper function to keep variables private 


//connecting the calendar to the database

var appointmentPatients = []; //hold decrypted data of the patients who have an appointment

function findAppointmentPatient(id) {
//returns the patient from appointmentPatients with this id, or null if there is none

  for (var n = 0; n < appointmentPatients.length; n++) {
    if (appointmentPatients[n].id === id) {
      return appointmentPatients[n];
    }
  }
  return null;
}

function filterAppointmentsByDoctorId(allAppointments, doctorId) {
//returns an array of only the appointments that belong to the doctor id

  var doctorAppointments = [];
  for (var n = 0; n < allAppointments.length; n++) {
    if (String(allAppointments[n].doctorID) === String(doctorId)) {
      doctorAppointments.push(allAppointments[n]);
    }
  }
  return doctorAppointments;
}

function appointmentStatus(status) {
//converts the status in the table to the two statuses the calendar uses

  var text = String(status).toLowerCase();
  if (text === "done" || text === "completed") {
    return "done";
  }
  return "upcoming";
}

async function loadAppointments(doctorId, key) {
//displays the appointments for this doctor and the decrypted patient data
  try {
    var allAppointments = await getAllRecords("appointments");
    var doctorAppointments = filterAppointmentsByDoctorId(allAppointments, doctorId);

    appointmentPatients = await fetchPatients(collectPatientIds(doctorAppointments), key);

    var loaded = [];

    //creates the array of appointments with decrypted patient data
    for (var n = 0; n < doctorAppointments.length; n++) {
      var appointment = doctorAppointments[n];
      loaded.push({
        date: appointment.date,
        time: appointment.time,
        patientId: appointment.patientID,
        reason: await decryptPatientField(appointment.description, [""], key),
        status: appointmentStatus(appointment.status),
      });
    }
    appointments = loaded;

    //displays the data
    showCalendar();
    showDay();
    showHistory();

  } catch (error) {
    console.error("Could not load appointments:", error);
    var box = getById("dayList");
    box.innerHTML = "";
    box.appendChild(makeElement("p", "empty", "Could not load appointments."));
  }
}

// Helper functions for dates
function dateText(date) {
  var year = date.getFullYear();
  var month = String(date.getMonth() + 1).padStart(2, "0");
  var day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

// This doctor's appointments, filled by loadAppointments
var appointments = [];

// General helper functions
function getById(id) {
  return document.getElementById(id);
}

function makeElement(tag, className, text) {
  var element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (text) {
    element.textContent = text;
  }
  return element;
}

function appointmentsOn(date) {
  var found = [];
  for (var i = 0; i < appointments.length; i++) {
    if (appointments[i].date === date) {
      found.push(appointments[i]);
    }
  }
  found.sort(function (a, b) {
    return a.time.localeCompare(b.time);
  });
  return found;
}

function prettyDate(date) {
  return new Date(date + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function statusText(status) {
  if (status === "done") {
    return "Done";
  }
  return "Coming";
}

function findPatient(id) {
  for (var i = 0; i < patients.length; i++) {
    if (patients[i].id === id) {
      return patients[i];
    }
  }
  return null;
}

function nameOf(id) {
  var patient = findAppointmentPatient(id);
  if (patient === null) {
    return "Patient " + id;
  }
  return fullName(patient);
}

function addContact(container, patient) {
  if (patient === null) {
    return;
  }

  var phone = makeElement("a", "", patient.Telephone);
  phone.href = "tel:" + patient.Telephone.replace(/[^0-9+]/g, "");

  var email = makeElement("a", "", patient.Email);
  email.href = "mailto:" + patient.Email;

  container.appendChild(phone);
  container.appendChild(email);
}

function addPills(container, appointment) {
  container.appendChild(
    makeElement(
      "span",
      "pill " + appointment.status,
      statusText(appointment.status),
    ),
  );
}

function makePatientLink(patientId) {
  //patients without a shared medical record are not in the Patients tab, so only show their name and not provide the link to their medical record

  if (findPatient(patientId) === null) {
    return makeElement("span", "", nameOf(patientId));
  }

  var button = makeElement("button", "linkbtn", nameOf(patientId));
  button.type = "button";
  button.addEventListener("click", function () {
    openPatient(patientId);
  });
  return button;
}

// Calendar
var todayText = dateText(new Date());
var selectedDate = todayText;
var shownYear = new Date().getFullYear();
var shownMonth = new Date().getMonth();

var dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
for (var i = 0; i < dayNames.length; i++) {
  getById("dows").appendChild(makeElement("div", "dow", dayNames[i]));
}

function makeDayButton(date) {
  var key = dateText(date);
  var count = appointmentsOn(key).length;

  var classes = "day";
  if (date.getMonth() !== shownMonth) {
    classes += " out";
  }
  if (key === todayText) {
    classes += " today";
  }
  if (key === selectedDate) {
    classes += " sel";
  }

  var button = makeElement("button", classes);
  button.type = "button";
  button.setAttribute(
    "aria-label",
    prettyDate(key) + ", " + count + " appointments",
  );
  button.appendChild(makeElement("span", "n", String(date.getDate())));

  if (count > 0) {
    button.appendChild(makeElement("span", "c", String(count)));
  }

  button.addEventListener("click", function () {
    selectedDate = key;
    shownYear = date.getFullYear();
    shownMonth = date.getMonth();
    showCalendar();
    showDay();
  });

  return button;
}

function showCalendar() {
  var monthStart = new Date(shownYear, shownMonth, 1);
  getById("monthLabel").textContent = monthStart.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  var box = getById("days");
  box.innerHTML = "";

  var startOffset = monthStart.getDay();
  for (var d = 0; d < 42; d++) {
    var date = new Date(shownYear, shownMonth, 1 - startOffset + d);
    box.appendChild(makeDayButton(date));
  }
}

function showDay() {
  var list = appointmentsOn(selectedDate);
  getById("dayTitle").textContent = prettyDate(selectedDate);
  getById("dayCount").textContent = list.length + " appointment(s)";

  var box = getById("dayList");
  box.innerHTML = "";

  if (list.length === 0) {
    box.appendChild(makeElement("p", "empty", "No appointments on this day."));
    return;
  }

  for (var n = 0; n < list.length; n++) {
    var a = list[n];

    var card = makeElement("article", "appt " + a.status);
    card.appendChild(makeElement("div", "time", a.time));

    var who = makeElement("div", "who");
    who.appendChild(makePatientLink(a.patientId));
    card.appendChild(who);

    card.appendChild(makeElement("div", "why", a.reason));

    var tags = makeElement("div", "tags");
    addPills(tags, a);
    card.appendChild(tags);

    var contact = makeElement("div", "contact");
    addContact(contact, findAppointmentPatient(a.patientId));
    card.appendChild(contact);

    box.appendChild(card);
  }
}

// Calendar navigation
getById("prev").addEventListener("click", function () {
  shownMonth = shownMonth - 1;
  if (shownMonth < 0) {
    shownMonth = 11;
    shownYear = shownYear - 1;
  }
  showCalendar();
});

getById("next").addEventListener("click", function () {
  shownMonth = shownMonth + 1;
  if (shownMonth > 11) {
    shownMonth = 0;
    shownYear = shownYear + 1;
  }
  showCalendar();
});

getById("todayBtn").addEventListener("click", function () {
  selectedDate = todayText;
  shownYear = new Date().getFullYear();
  shownMonth = new Date().getMonth();
  showCalendar();
  showDay();
});










// APPOINTMENT FUNCTIONS
function showHistory() {
  var search = getById("q").value.trim().toLowerCase();
  var filter = getById("filter").value;

  var results = [];
  for (var n = 0; n < appointments.length; n++) {
    var a = appointments[n];

    var matchesFilter = true;
    if (filter === "done" || filter === "upcoming") {
      matchesFilter = a.status === filter;
    } else if (filter === "follow") {
      matchesFilter = a.followUp;
    }

    var text = (nameOf(a.patientId) + " " + a.reason).toLowerCase();
    var matchesSearch = search === "" || text.indexOf(search) !== -1;

    if (matchesFilter && matchesSearch) {
      results.push(a);
    }
  }

  results.sort(function (x, y) {
    return (y.date + y.time).localeCompare(x.date + x.time);
  });

  var body = getById("histBody");
  body.innerHTML = "";

  for (var j = 0; j < results.length; j++) {
    var item = results[j];
    var row = makeElement("tr");

    row.appendChild(makeElement("td", "nw", item.date));
    row.appendChild(makeElement("td", "nw", item.time));

    var patientCell = makeElement("td");
    patientCell.appendChild(makePatientLink(item.patientId));
    row.appendChild(patientCell);

    row.appendChild(makeElement("td", "", item.reason));

    var statusCell = makeElement("td");
    statusCell.appendChild(
      makeElement("span", "pill " + item.status, statusText(item.status)),
    );
    row.appendChild(statusCell);

    var contactCell = makeElement("td");
    addContact(contactCell, findAppointmentPatient(item.patientId));
    row.appendChild(contactCell);

    body.appendChild(row);
  }

  getById("histEmpty").hidden = results.length > 0;
}

getById("q").addEventListener("input", showHistory);
getById("filter").addEventListener("change", showHistory);

// Switch between dashboard views
function showView(name) {
  getById("calView").hidden = name !== "cal";
  getById("histView").hidden = name !== "hist";
  getById("patView").hidden = name !== "pat";

  getById("tabCal").setAttribute("aria-pressed", String(name === "cal"));
  getById("tabHist").setAttribute("aria-pressed", String(name === "hist"));
  getById("tabPat").setAttribute("aria-pressed", String(name === "pat"));

  if (name === "hist") {
    showHistory();
  }
}

getById("tabCal").addEventListener("click", function () {
  showView("cal");
});
getById("tabHist").addEventListener("click", function () {
  showView("hist");
});
getById("tabPat").addEventListener("click", function () {
  showView("pat");
});





//PATIENTS FUNCTIONS


// Patient records
var patients = [];
var selectedPatient = null;
var recordKind = "history";

// Decrypted entries from the medicalRecords table, grouped by patient ID
var records = {};
var currentDoctorName = "";

// Doctor IDs by name, because medical records store the doctor's name in doctorID
var doctorNames = {};

function getRecordOfPatient(id) {
//returns the medical record object for a patient
  if (!records[id]) {
    records[id] = { history: [], notes: [], medicines: [] };
  }
  return records[id];
}

function fullName(p) {
//function to mix the first and last name for display
  return p.First + " " + p.Last;
}


function normaliseDoctorName(name) {
//removes the dr and other prefixes from the name to prepare for comparison
  return String(name).replace(/^dr\.?\s*/i, "").trim().toLowerCase();
}


async function loadDoctorIds() {
//gets the doctor ids and names from the database and creates an array with the following structure:
//'doctorname' : doctorid

  var doctors = await getAllRecords("doctors");
  doctorNames = {}; 
  for (var n = 0; n < doctors.length; n++) {
    var name = normaliseDoctorName(doctors[n].first_name + " " + doctors[n].last_name);
    doctorNames[name] = doctors[n].id;
  }
}

//the context with which each field has been encrypted
var patientEncryptionContext = {
  NHS: ["", "NHS"],
  DOB: [""],
  Gender: [""],
  Address: [""],
  Email: ["email", "Email"],
  Telephone: ["", "Telephone"],
};

async function decryptPatientField(value, contexts, key) {
//tries each contexts until one works, else an error message is returned. returns the decrypted value
  for (var n = 0; n < contexts.length; n++) {
    try {
      return await decrypt(value, key, contexts[n]);
    } catch (error) {
      // Wrong context, so try the next one.
    }
  }
  return "[decryption failed]";
}

async function decryptPatient(patient, key) {
//decrypts the patient data from the database using patientEncryptionContext
//patient is the encrypted patient data as object

  var result = Object.assign({}, patient);
  var fields = Object.keys(patientEncryptionContext);

  for (var n = 0; n < fields.length; n++) {
    result[fields[n]] = await decryptPatientField(  
      patient[fields[n]],
      patientEncryptionContext[fields[n]],
      key,
    );
  }
  return result;
}


function makeEntry(record, text) {
//create the object for the medical record display
  return { date: record.date, time: record.time, doctor: record.doctorID, text: text };
}




function addEntries(record, diagnosis, treatment) {
  var entries = getRecordOfPatient(record.patientID);

  if (diagnosis) {
    entries.history.unshift(makeEntry(record, diagnosis)); //unshift used to show the newer diagnosis at the top
  }
  if (treatment) {
    var list;
    if (record.isMedicine) { //checks whether the input was a medicine or a note and adds it to the proper array
      list = entries.medicines;
    } else {
      list = entries.notes;
    }
    list.unshift(makeEntry(record, treatment));
  }
}


function filterRecordsByDoctor(allRecords, doctorId) {
//returns an array of only the medical records that belong to the doctor id
//allRecords is the array of all medical records

  var doctorRecords = [];
  for (var n = 0; n < allRecords.length; n++) {
    if (doctorNames[normaliseDoctorName(allRecords[n].doctorID)] === doctorId) {
      doctorRecords.push(allRecords[n]);
    }
  }
  return doctorRecords;
}


function collectPatientIds(doctorRecords) {
//returns an object with all the patient ids which will be used to fetch the patient data

  var patientIds = {};
  for (var n = 0; n < doctorRecords.length; n++) {
    patientIds[doctorRecords[n].patientID] = true;
  }
  return patientIds;
}


async function fetchPatients(patientIds, key) {
//returns an array of decrypted patient data using db.js function findrecord()

  var ids = Object.keys(patientIds);
  var found = [];

  for (var n = 0; n < ids.length; n++) {
    var patient = await findRecord("patients", Number(ids[n])); //number() used because ids are stored as string
    if (patient !== null) {
      found.push(await decryptPatient(patient, key));
    }
  }
  return found;
}

// Step 3: loads and decrypts the medical records of those patients.
async function loadRecords(allRecords, patientIds, key) {
//loads and decrypts the patient medical records 

  var patientData = allRecords.filter(function (record) {
    return patientIds[record.patientID] === true;
  });

  patientData.sort(function (a, b) { //sort the records from newest to oldest
    return (a.date + a.time).localeCompare(b.date + b.time); 
  });

  records = {};
  for (var n = 0; n < patientData.length; n++) {
    addEntries(
      patientData[n],
      await decryptPatientField(patientData[n].diagnosis, [""], key),
      await decryptPatientField(patientData[n].treatment, [""], key),
    );
  }
}




async function saveMedicalRecord(patient, diagnosis, treatment, isMedicine) {
//encrypts the medical record and saves it to the database

  var key = await loadDataKey();
  var allRecords = await getAllRecords("medicalRecords");

  //the id of the medical record has to be generated. getAllRecords returns the records
  var highest = 1;
  if (allRecords.length > 0) {
    var latestRecord = allRecords[allRecords.length - 1];
    highest = Number(latestRecord.medicalRecordID.replace("MR", "")) + 1;
  }

  var now = new Date(); //prepares the record to be added using addrecord() from db.js
  var record = {
    medicalRecordID: "MR" + String(highest).padStart(3, "0"),
    patientID: patient.id,
    patientName: fullName(patient),
    doctorID: currentDoctorName,
    diagnosis: await encrypt(diagnosis, key),
    treatment: await encrypt(treatment, key),
    date: dateText(now),
    time: now.toTimeString().slice(0, 5),
    isMedicine: isMedicine,
  };

  await addRecord("medicalRecords", record);
  addEntries(record, diagnosis, treatment);

  const session = await getSession();

  activityLogMessage = `User ${session.userId} added a new medical record.`;
  addActivityLog(session.role, session.userId, activityLogMessage);
}

// Shows the patients who share a medical record with the logged-in doctor.
async function loadMyPatients() {
  try {
    // Sends anyone who is not logged in as a doctor away from this page.
    var session = await requireDoctor();
    if (session === null) {
      return;
    }

    await dbReady;

    // The session stores the ID as a string, but the doctors store uses numbers.
    var doctor = await findRecord("doctors", Number(session.userId));
    if (doctor === null) {
      throw new Error("No doctor found for the current session.");
    }

    currentDoctorName = "Dr. " + doctor.first_name + " " + doctor.last_name;
    getById("doctorTitle").textContent = currentDoctorName + "'s schedule";

    loadMedicines();
    await loadDoctorIds();

    var allRecords = await getAllRecords("medicalRecords");
    var doctorRecords = filterRecordsByDoctor(allRecords, doctor.id);
    var patientIds = collectPatientIds(doctorRecords);

    var key = await loadDataKey();
    patients = await fetchPatients(patientIds, key);
    await loadRecords(allRecords, patientIds, key);

    showPatients();
    await loadAppointments(doctor.id, key);

    if (patients.length === 0) {
      var box = getById("patList");
      box.innerHTML = "";
      box.appendChild(makeElement("p", "empty", "You have no patients with medical records."));
    }
  } catch (error) {
    console.error("Could not load patient data:", error);
    var list = getById("patList");
    list.innerHTML = "";
    list.appendChild(makeElement("p", "empty", "Could not load patient data."));
  }
}



//DISPLAY FUNCTIONS FOR PATIENT RECORDS

var medicines = [];


async function loadMedicines() {
//load medicines data
  try {
    medicines = await getAllRecords("medicines");
    fillMedicineList();
  } catch (error) {
    console.error("Could not load medicine data:", error);
  }
}

function fillMedicineList() {
//medicine list used for autocomplete in the form 
  var list = getById("medicineList");
  list.innerHTML = "";

  for (var n = 0; n < medicines.length; n++) {
    var option = document.createElement("option");
    option.value = medicines[n].Drug;
    list.appendChild(option);
  }
}


function findMedicine(name) {
//fetches the medicine data from the database
  for (var n = 0; n < medicines.length; n++) {
    if (medicines[n].Drug.toLowerCase() === name.toLowerCase()) {
      return medicines[n];
    }
  }
  return null;
}

function createPatientButton(p) {
//creates the button which will let the doctor select the patient and view their record
  var classes = "patient";
  if (selectedPatient !== null && selectedPatient.id === p.id) {
    classes += " sel";
  }

  var button = makeElement("button", classes);
  button.type = "button";
  button.appendChild(makeElement("span", "pname", fullName(p)));
  button.appendChild(makeElement("span", "psub", "NHS " + p.NHS));

  button.addEventListener("click", function () {
    selectedPatient = p;
    showPatients();
    showRecord();
  });

  return button;
}


function showPatients() {
//creates the list of the doctor's patients
  var search = getById("patSearch").value.trim().toLowerCase();
  var box = getById("patList");
  box.innerHTML = "";

  var shown = 0;
  for (var n = 0; n < patients.length; n++) {
    var p = patients[n];
    var text = (fullName(p) + " " + p.NHS).toLowerCase();

    if (search !== "" && text.indexOf(search) === -1) {
      continue;
    }

    box.appendChild(createPatientButton(p));
    shown++;
  }

  if (shown === 0) {
    box.appendChild(makeElement("p", "empty", "No patients match."));
  }
}

getById("patSearch").addEventListener("input", showPatients);



function openPatient(id) {
  var patient = findPatient(id);
  if (patient === null) {
    return;
  }

  selectedPatient = patient;
  showView("pat");
  showPatients();
  showRecord();
}

function showRecord() {
  var p = selectedPatient;
  getById("patEmpty").hidden = true;
  getById("patRecord").hidden = false;
  getById("patName").textContent = fullName(p);
  getById("patMeta").textContent = p.Gender;

  var rows = [
    ["NHS number", p.NHS],
    ["Date of birth", p.DOB],
    ["Address", p.Address],
    ["Email", p.Email],
    ["Telephone", p.Telephone],
  ];

  var info = getById("patInfo");
  info.innerHTML = "";

  for (var n = 0; n < rows.length; n++) {
    info.appendChild(makeElement("div", "k", rows[n][0]));
    info.appendChild(makeElement("div", "", rows[n][1]));
  }

  showEntries();
}

function showEntries() {
  var list = getRecordOfPatient(selectedPatient.id)[recordKind];
  var isMedicine = recordKind === "medicines";
  getById("medError").hidden = true;
  getById("recError").hidden = true;

  getById("kindHistory").setAttribute("aria-pressed", String(recordKind === "history"));
  getById("kindNotes").setAttribute("aria-pressed", String(recordKind === "notes"));
  getById("kindMedicines").setAttribute("aria-pressed", String(isMedicine));

  getById("textField").hidden = isMedicine;
  getById("medFields").hidden = !isMedicine;
  getById("recText").required = !isMedicine;
  getById("medName").required = isMedicine;
  getById("medDose").required = isMedicine;
  getById("medFreq").required = isMedicine;

  var texts = {
    history: ["Add to patient history", "Add to history"],
    notes: ["Add a medical note", "Add note"],
    medicines: ["", "Add medicine"],
  };

  getById("textLabel").textContent = texts[recordKind][0];
  getById("addBtn").textContent = texts[recordKind][1];

  var box = getById("recList");
  box.innerHTML = "";

  if (list.length === 0) {
    box.appendChild(makeElement("p", "empty", "Nothing recorded yet."));
    return;
  }

  for (var n = 0; n < list.length; n++) {
    var item = list[n];
    var card = makeElement("article", "entry");
    card.appendChild(makeElement("div", "edate", item.date + " " + item.time));
    card.appendChild(makeElement("div", "ewho", item.doctor));
    card.appendChild(makeElement("div", "etext", item.text));

    box.appendChild(card);
  }
}

// Switch between patient record sections
function chooseKind(kind) {
  recordKind = kind;
  showEntries();
}

getById("kindHistory").addEventListener("click", function () {
  chooseKind("history");
});
getById("kindNotes").addEventListener("click", function () {
  chooseKind("notes");
});
getById("kindMedicines").addEventListener("click", function () {
  chooseKind("medicines");
});

// Add a note or medicine
getById("recForm").addEventListener("submit", async function (event) {
  event.preventDefault();
  var diagnosis = "";
  var treatment = "";

  if (recordKind === "medicines") {
    var name = getById("medName").value.trim();
    var dose = getById("medDose").value.trim();
    var frequency = getById("medFreq").value.trim();

    if (name === "" || dose === "" || frequency === "") {
      return;
    }

    var medicine = findMedicine(name);
    if (medicine === null) {
      getById("medError").hidden = false;
      return;
    }

    getById("medError").hidden = true;
    treatment = medicine.Drug + ", " + dose + ", " + frequency;
  } else {
    var text = getById("recText").value.trim();
    if (text === "") {
      return;
    }

    if (recordKind === "history") {
      diagnosis = text;
    } else {
      treatment = text;
    }
  }

  var button = getById("addBtn");
  button.disabled = true;
  getById("recError").hidden = true;

  try {
    await saveMedicalRecord(selectedPatient, diagnosis, treatment, recordKind === "medicines");

    getById("recText").value = "";
    getById("medName").value = "";
    getById("medDose").value = "";
    getById("medFreq").value = "";
    showEntries();
  } catch (error) {
    console.error("Could not save the medical record:", error);
    getById("recError").hidden = false;
  } finally {
    button.disabled = false;
  }
});







// Start the dashboard
showCalendar();
showDay();
loadMyPatients();

})();