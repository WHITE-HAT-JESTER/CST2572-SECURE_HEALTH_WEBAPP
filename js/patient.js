'use strict';

//---CALENDAR---//

  //--referencing the HTML elements that structure the calendar and storing them as variables to make modification easier

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
//--End of Calendar Feature--//