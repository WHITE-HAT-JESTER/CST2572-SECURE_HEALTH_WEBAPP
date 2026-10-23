"use strict";

// Helper functions for dates
function dateText(date) {
  var year = date.getFullYear();
  var month = String(date.getMonth() + 1).padStart(2, "0");
  var day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function daysFromToday(n) {
  var d = new Date();
  d.setDate(d.getDate() + n);
  return dateText(d);
}

// Sample appointments
var appointments = [
  { date: daysFromToday(-14), time: "10:30", patientId: 5, reason: "Persistent cough", followUp: false, status: "done" },
  { date: daysFromToday(-9), time: "14:00", patientId: 2, reason: "Blood pressure review", followUp: true, status: "done" },
  { date: daysFromToday(-7), time: "09:30", patientId: 4, reason: "Lower back pain", followUp: false, status: "done" },
  { date: daysFromToday(-7), time: "11:00", patientId: 9, reason: "Vaccination", followUp: false, status: "done" },
  { date: daysFromToday(-3), time: "15:30", patientId: 5, reason: "Cough follow-up", followUp: true, status: "done" },
  { date: daysFromToday(0), time: "08:30", patientId: 21, reason: "Migraine", followUp: false, status: "done" },
  { date: daysFromToday(0), time: "13:30", patientId: 2, reason: "Blood pressure follow-up", followUp: true, status: "upcoming" },
  { date: daysFromToday(0), time: "15:00", patientId: 45, reason: "Diabetes check", followUp: false, status: "upcoming" },
  { date: daysFromToday(2), time: "09:00", patientId: 1, reason: "Lab results discussion", followUp: true, status: "upcoming" },
  { date: daysFromToday(5), time: "10:00", patientId: 4, reason: "Back pain follow-up", followUp: true, status: "upcoming" },
];

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
  var patient = findPatient(id);
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

  if (appointment.followUp) {
    container.appendChild(makeElement("span", "pill follow", "Follow-up"));
  } else {
    container.appendChild(makeElement("span", "pill new", "New visit"));
  }
}

function makePatientLink(patientId) {
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
    addContact(contact, findPatient(a.patientId));
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

// Appointment history
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

    var typeCell = makeElement("td");
    if (item.followUp) {
      typeCell.appendChild(makeElement("span", "pill follow", "Follow-up"));
    } else {
      typeCell.appendChild(makeElement("span", "pill new", "New visit"));
    }
    row.appendChild(typeCell);

    var contactCell = makeElement("td");
    addContact(contactCell, findPatient(item.patientId));
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

// Patient records
var patients = [];
var selectedPatient = null;
var recordKind = "history";

// Sample records for the dashboard
var records = {
  2: {
    history: [{ date: "2025-11-20", text: "High blood pressure diagnosed. Advised less salt and more exercise." }],
    notes: [{ date: "2026-10-12", text: "Blood pressure still a little high. Medicine dose to be reviewed at the next visit." }],
    medicines: [{ date: "2025-11-20", drugId: 33, name: "Amlodipine Besylate", dose: "5 mg", frequency: "once a day" }],
  },
  4: {
    history: [{ date: "2026-10-14", text: "Lower back pain for two weeks after lifting heavy boxes." }],
    notes: [{ date: "2026-10-14", text: "No numbness in the legs. Rest and gentle stretching. Back for review in 12 days." }],
    medicines: [{ date: "2026-10-14", drugId: 1, name: "Nabumetone", dose: "500 mg", frequency: "twice a day" }],
  },
  5: {
    history: [{ date: "2026-10-07", text: "Dry cough for more than a week, no fever." }],
    notes: [{ date: "2026-10-18", text: "Cough is getting better. Chest sounds clear." }],
    medicines: [{ date: "2026-10-07", drugId: 22, name: "Acetaminophen", dose: "500 mg", frequency: "every 6 hours if needed" }],
  },
};

function getRecord(id) {
  if (!records[id]) {
    records[id] = { history: [], notes: [], medicines: [] };
  }
  return records[id];
}

function fullName(p) {
  return p.First + " " + p.Last;
}

// Load patient data
fetch("../data/Patients.json")
  .then(function (response) {
    if (!response.ok) {
      throw new Error("Could not load patient data.");
    }
    return response.json();
  })
  .then(function (data) {
    patients = data;
    showPatients();
    showDay();
    showHistory();
  })
  .catch(function () {
    getById("patList").appendChild(
      makeElement("p", "empty", "Could not load patient data."),
    );
  });

var drugs = [];

// Load medicine data
fetch("../data/Medicines.json")
  .then(function (response) {
    if (!response.ok) {
      throw new Error("Could not load medicine data.");
    }
    return response.json();
  })
  .then(function (data) {
    drugs = data;
    fillDrugList();
  })
  .catch(function () {
    // The rest of the dashboard can still work if this fails.
  });

function fillDrugList() {
  var list = getById("drugList");
  list.innerHTML = "";

  for (var n = 0; n < drugs.length; n++) {
    var option = document.createElement("option");
    option.value = drugs[n].Drug;
    list.appendChild(option);
  }
}

function findDrug(name) {
  for (var n = 0; n < drugs.length; n++) {
    if (drugs[n].Drug.toLowerCase() === name.toLowerCase()) {
      return drugs[n];
    }
  }
  return null;
}

function makePatientButton(p) {
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

    box.appendChild(makePatientButton(p));
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

function showPatientAppointments(id) {
  var box = getById("patAppts");
  box.innerHTML = "";

  var found = [];
  for (var n = 0; n < appointments.length; n++) {
    if (appointments[n].patientId === id) {
      found.push(appointments[n]);
    }
  }

  found.sort(function (x, y) {
    return (y.date + y.time).localeCompare(x.date + x.time);
  });

  if (found.length === 0) {
    box.appendChild(makeElement("p", "note", "No appointments."));
    return;
  }

  for (var j = 0; j < found.length; j++) {
    var line = makeElement("div", "apptline");
    line.appendChild(makeElement("span", "when", found[j].date + " " + found[j].time));
    line.appendChild(makeElement("span", "", found[j].reason));
    addPills(line, found[j]);
    box.appendChild(line);
  }
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

  showPatientAppointments(p.id);
  showEntries();
}

function showEntries() {
  var list = getRecord(selectedPatient.id)[recordKind];
  var isMedicine = recordKind === "medicines";
  getById("medError").hidden = true;

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
    card.appendChild(makeElement("div", "edate", item.date));

    if (isMedicine) {
      card.appendChild(makeElement("div", "ewho", item.name));
      card.appendChild(makeElement("div", "", item.dose + ", " + item.frequency));
    } else {
      card.appendChild(makeElement("div", "etext", item.text));
    }

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
getById("recForm").addEventListener("submit", function (event) {
  event.preventDefault();
  var record = getRecord(selectedPatient.id);

  if (recordKind === "medicines") {
    var name = getById("medName").value.trim();
    var dose = getById("medDose").value.trim();
    var frequency = getById("medFreq").value.trim();

    if (name === "" || dose === "" || frequency === "") {
      return;
    }

    var drug = findDrug(name);
    if (drug === null) {
      getById("medError").hidden = false;
      return;
    }

    getById("medError").hidden = true;
    record.medicines.unshift({
      date: todayText,
      drugId: drug.id,
      name: drug.Drug,
      dose: dose,
      frequency: frequency,
    });

    getById("medName").value = "";
    getById("medDose").value = "";
    getById("medFreq").value = "";
  } else {
    var text = getById("recText").value.trim();
    if (text === "") {
      return;
    }

    record[recordKind].unshift({ date: todayText, text: text });
    getById("recText").value = "";
  }

  showEntries();
});

// Start the dashboard
showCalendar();
showDay();