let currentMonth = new Date().getMonth();
let year = new Date().getFullYear();

let firstDayOfMonth = new Date(year, currentMonth, 1);
let totalDaysInMonth = new Date(year, currentMonth+1, 0).getDate();
const listOfMonths = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
];
let monthName = listOfMonths[currentMonth];
generateCalendar(monthName+ " " + year, firstDayOfMonth.getDay(), totalDaysInMonth);


function NextMonth(CurrentMonth) {
    /*generates the next month when the next button is clicked*/
    buttons = document.getElementById("monthButtons");
    buttons.innerHTML = "";
    buttons.innerHTML = "<button onclick='PreviousMonth(currentMonth)'>Previous Month</button><button onclick='NextMonth(currentMonth)'>Next Month</button>";
    if (CurrentMonth === 11) {
        currentMonth = 0;
        year++;
    } else {
        currentMonth++;
    }
    generateCalendar(listOfMonths[currentMonth] + " " + year, new Date(year, currentMonth, 1).getDay(), new Date(year, currentMonth+1, 0).getDate());
}

function PreviousMonth(CurrentMonthPara) {
    /*generates the previous month when the previous button is clicked*/
    buttons = document.getElementById("monthButtons");
    buttons.innerHTML = "";
    buttons.innerHTML = "<button onclick='PreviousMonth(currentMonth)'>Previous Month</button><button onclick='NextMonth(currentMonth)'>Next Month</button>";
    if (CurrentMonthPara === 0) {
        currentMonth = 11;
        year--;
    } else {
        currentMonth--;
    }
    generateCalendar(listOfMonths[currentMonth] +" " + year, new Date(year, currentMonth, 1).getDay(), new Date(year, currentMonth+1, 0).getDate());
}

function generateCalendar(Month, startDayIndex, totalDays) {
/*genereates the calendar for the specific month selected*/
    removeExistingCalendar();
    const monthHeader = document.getElementById("monthHeader");
    monthHeader.textContent = Month;
    const tableBody = document.getElementById("calendarBody");
    let dayNumber = 1;
    let tableColCount = 0;
    let skipdays = 0
    for (let i = 0; i < Math.trunc(totalDays / 7) + 1; i++) {
        const tr = document.createElement("tr");
        while (tableColCount < 7 && dayNumber <= totalDays) { 
            const td = document.createElement("td");
            if (skipdays < startDayIndex) { /* fills in the empty cells before the 1st*/  
                skipdays++;
            }
            else{
                const btn = document.createElement("button");
                btn.setAttribute("id", "scheduleButton" + dayNumber)
                btn.textContent = dayNumber;
                btn.addEventListener('click', () => generateTodaySchedule(btn.textContent));
                btn.classList.add("calendarButton");
                td.appendChild(btn);
                dayNumber++;
            }
            tr.appendChild(td);
            
            tableColCount++;    
        }
        tableColCount = 0;
        tableBody.appendChild(tr);
    }
}

function removeExistingCalendar() {
/*removes any existing calendar when a new month is selected*/
    const monthHeader = document.getElementById("monthHeader");
    monthHeader.textContent = "";
    const tableBody = document.getElementById("calendarBody");
    while (tableBody.firstChild) {
        tableBody.removeChild(tableBody.firstChild);
    }
}
 
    
function generateTodaySchedule(dayNumber) {
/*generates the schedule for the specific button click*/
    removeExistingSchedule();
    let p = document.getElementById("scheduleParagraph");
    p.textContent = "This is the schedule for the " + dayNumber + "th of " + document.getElementById("monthHeader").textContent;
    let ul = document.getElementById("scheduleList");
    let string = "";
    for (let i= 0; i<24; i++) {
        if (i < 10) {
            string = "0" + i.toString() + ":00";
        }
        else {
            string = i.toString() + ":00";
        }
    const li = document.createElement("li");
    li.classList.add("scheduleItem");
    li.id = "scheduleTime" + i;

    const row = document.createElement("div");
    row.classList.add("scheduleRow");

    const time = document.createElement("span");
    time.textContent = string;
    row.appendChild(time);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.classList.add("scheduleToggle");
    btn.setAttribute("aria-label", "Show schedule for " + string);
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-controls", "scheduleDetails" + i);
    btn.addEventListener("click", () => extendSchedule(i, btn, string));
    const arrow = document.createElement("span");
    arrow.classList.add("scheduleArrow");
    arrow.setAttribute("aria-hidden", "true");
    btn.appendChild(arrow);
    row.appendChild(btn);
    li.appendChild(row);

    const details = document.createElement("div");
    details.classList.add("scheduleDetails");
    details.id = "scheduleDetails" + i;
    details.hidden = true;
    li.appendChild(details);
    ul.appendChild(li);
    
    }
}

function removeExistingSchedule() {
/*checks and removes any existing schedule for the day when a new day is selected*/
    const ul = document.getElementById("scheduleList");
    const p = document.getElementById("scheduleParagraph");
    p.textContent = "";
    while (ul.firstChild) {
        ul.removeChild(ul.firstChild);
    }
 }
    
function extendSchedule(Time, button, timeLabel) {
    /*drops down the shedule for each hour slot of the calendar*/

    const details = document.getElementById("scheduleDetails" + Time);
    const isExpanded = button.getAttribute("aria-expanded") === "true";

    if (isExpanded) {
        details.hidden = true;
        button.setAttribute("aria-expanded", "false");
        button.setAttribute("aria-label", "Show schedule for " + timeLabel);
        return;
    }

    if (!details.hasChildNodes()) {
        const table = document.createElement("table");
        const thead = document.createElement("thead");
        const tr = document.createElement("tr");
        const headings = [
            "Start Time",
            "End Time",
            "Activity",
            "Doctor ID",
            "Patient ID",
            "Room Number"
        ];

        headings.forEach(text => {
            const th = document.createElement("th");
            th.textContent = text;
            tr.appendChild(th);
        });

        thead.appendChild(tr);
        table.appendChild(thead);
        details.appendChild(table);
    }

    details.hidden = false;
    button.setAttribute("aria-expanded", "true");
    button.setAttribute("aria-label", "Hide schedule for " + timeLabel);
}
    
function updateSearchBar() {
        /*updates the search bar when a new letter is added to the search bar to show the possible options*/
        let searchBarTable = document.getElementById("patientSearchBarOptions");
        let searchBarData = document.getElementById("searchBarData").value;
        if (/^\d+$/.test(searchBarData)) { 
            alert("this will return the possible options for a NHS number"); 
        } else { 
            alert("this will return the possible options for a name"); 
        }

    }
        
    function updateTable() {
        /*updates the table when a name has been submitted when a new letter is added in the search bar*/

        deleteExistingTable();
        let patientIdentifier = document.getElementById("searchBarData").value;
        alert("this will return the patient information of " + patientIdentifier);

        let table = document.getElementById("patientInfoTable");


    }

    function deleteExistingTable() {
        /*deletes the existing table when the new search is initiated*/
        let table = document.getElementById("patientInfoTable");
        table.innerHTML = "";
    }


    function addingNewPatient() {
        /*adds a new patient to the database*/
        let form = document.getElementById("addNewPatientForm");
        form.hidden = false;
    }
    

    function editPatientDetails() {
        /*edits the patient details*/
        alert("this will allow the admin to edit the patient details");
    }


