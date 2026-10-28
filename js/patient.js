'use strict';
//---PATIENT-DASHBOARD---//

//---NAVIGATION-BUTTON-TABS---//

//--End-of-navigation-button-tabs--//


//---PATIENT-PROFILE---//

//storing sample patient info in one object


//--End-of-patient-profile--//


//---MEDICAL-RECORD-TABLES---//

//--End-of-medical-records--//


//---APPOINTMENT-FORMS---//

//--End-of-appointment-forms--//


//---CALENDAR---//

  //--referencing the HTML elements that structure the calendar and storing them as variables to make modification easier

var todayText = dateText(new Date());
var selectedDate = todayText;
var shownYear = new Date().getFullYear();
var shownMonth = new Date().getMonth();

var days = getById("days");
for (var i = 0; i < dayNames.length; i++) {
  days.appendChild(makeElement("div", "days", days[i]));
}

function makeDayButton(date) {
  var key = dateText(date);

  var classes = "day";
  if (date.getMonth() !== shownMonth) {
    classes += " out";
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

//--End of Calendar Feature--//


//---PRESCRIPTION-REQUESTS---//

//--End-of-prescription-requests--//

//--End-of-patient-dashboard--//
