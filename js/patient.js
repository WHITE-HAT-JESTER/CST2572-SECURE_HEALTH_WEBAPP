'use strict';
//---PATIENT-DASHBOARD---//

// General helper functions
function getById(id) {
    return document.getElementById(id);
}

function getByClass(className){
    return document.getElementsByClassName(className);
}

function createElement(tagName){
    return document.createElement(tagName);
}

function pad(num){
    return String(num).padStart(2,"0");
}

function markSelected(groupClass, chosenButton){
    var group = getByClass(groupClass);

    for (var i = 0; i < group.length; i++){
        group[i].classList.remove("selected");
    }

    chosenButton.classList.add("selected");
}


//---LOGGED-IN-PATIENT---//

// For the demo we pretend patient number 1 is logged in.
// Later, the login page only has to put the real patient's id in here
// (null means nobody is logged in).
var loggedInPatientId = 1;

function fullName(p) {
    return p.First + " " + p.Last;
}


//---PATIENT-PROFILE---//

async function loadPatientData(){
    try{
        const response = await fetch("../data/Patients.json");

        if (!response.ok) {
            throw new Error("Could not load patient data.");
        }

        const pData = await response.json();  //turn a string in JSON file into an object in javascript

        //pick out the patient who is logged in
        const patient = pData.patientProfile.find(p => p.id === loggedInPatientId);

        if (patient === undefined) {
            throw new Error("No patient is logged in.");
        }

        //each page only has some of these parts, so check before filling them in
        if (getById("NHS")) {
            showPersonalDetails(patient);
        }

        if (getById("histTable")) {
            showMedicalRecords(pData);
        }

        if (getById("patient-name")) {
            fillFormDetails(patient);
        }

    } catch (err) {
        console.error("Data Load Error:", err);
        alert("Failed to load patient data: " + err.message);
    }
}

//load personal details
function showPersonalDetails(patient){
    getById("NHS").textContent = patient.NHS;
    getById("title").textContent = patient.Title;
    getById("name").textContent = fullName(patient);
    getById("DOB").textContent = patient.DOB;
    getById("gender").textContent = patient.Gender;
    getById("address").textContent = patient.Address;
    getById("email").textContent = patient.Email;
    getById("contact").textContent = patient.Telephone;
}

//booking and prescription forms start with the patient's own name and phone
function fillFormDetails(patient){
    getById("patient-name").value = fullName(patient);
    getById("patient-name").readOnly = true;

    getById("patient-contact").value = patient.Telephone;
    getById("patient-contact").readOnly = true;
}


//---MEDICAL-RECORD-TABLES--//

function showMedicalRecords(pData){
    //the JSON file holds everybody's records,keeping only sample patients
    const myHistory = pData.medicalHistory.filter(record => record.patientId === loggedInPatientId);
    const myRequests = pData.medicalRequests.filter(req => req.patientId === loggedInPatientId);

    //med-history
    const historyRows = myHistory.map(record => [
        record.LastCheckIn,
        record.reason,
        record.status,
        record.doctor,
        record.department,
        record.prescription || "None",
        record.notes
    ]);
    fillTable(getById("histTable"), historyRows, 7);

    //med-requests
    const requestRows = myRequests.map(req => [
        req.NextAppointment,
        req.reason,
        req.status,
        req.doctor,
        req.department,
        req.prescription || "None"
    ]);
    fillTable(getById("requestTable"), requestRows, 6);
}

//one row per record
function fillTable(tableBody, rows, columnCount){
    tableBody.innerHTML = "";

    if (rows.length === 0) {
        const emptyRow = createElement("tr");
        const emptyCell = createElement("td");
        emptyCell.colSpan = columnCount;
        emptyCell.textContent = "No records found.";
        emptyRow.appendChild(emptyCell);
        tableBody.appendChild(emptyRow);
        return;
    }

    rows.forEach(values => {
        const row = createElement("tr");

        values.forEach(value => {
            const cell = createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        tableBody.appendChild(row);
    });
}
//--End-of-medical-records--//

//--End-of-patient-profile--//


//---FORMS---//

const DOCTORS = {
    "Cardiology": ["Dr. Smith", "Dr. Brown"],
    "General Medicine": ["Dr. Johnson"],
    "Neurology": ["Dr. Williams"],
    "Orthopedics": ["Dr. Davis"],
    "Pediatrics": ["Dr. Miller"]
};

//what the patient has picked so far on the booking page
var selectedDepartment = null;
var selectedDateKey = null;
var selectedSlotIndex = null;


function showConfirmation(message, state){
    var messageBox = getById("confirmation-message");

    messageBox.textContent = message;
    messageBox.dataset.state = state;
    messageBox.hidden = false;
}

//department buttons
function setUpDepartmentButtons(){
    var deptButtons = getByClass("dept-btn");

    for (var i = 0; i < deptButtons.length; i++){
        deptButtons[i].onclick = function() {
            selectedDepartment = this.getAttribute("department");

            markSelected("dept-btn", this);
            showDoctors(selectedDepartment);
        };
    }
}

//the doctor drop-down only lists doctors from the chosen department
function showDoctors(department){
    var doctorList = getById("doctor");
    doctorList.innerHTML = '<option value="" disabled selected></option>';

    DOCTORS[department].forEach(name => {
        const option = createElement("option");
        option.value = name;
        option.textContent = name;
        doctorList.appendChild(option);
    });
}


//---APPOINTMENTS--//


    //---CALENDAR---//

    //initialize calendar
    let today = new Date();
    let currentMonth = today.getMonth();  
    let currentYear = today.getFullYear();

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const HOSPITAL = {
        openDays: [1, 2, 3, 4, 5, 6] , 
        firstSlot: "09:30", //opening hour
        lastSlot: "17:00", //final appointment slot before closing
        slotDuration: 30
    }

    //appointments only live in the page while it is open (saving is not done here)
    var appointments = {};

    //a date written the way the browser understands
    function makeDateKey(year, month, dayNum){
        return `${year}-${pad(month + 1)}-${pad(dayNum)}`;
    }

    function generateTimeSlot(dateKey){
        if(appointments[dateKey]){
            return appointments[dateKey];
        }

        var slots = [];
        var currentTime = new Date(`${dateKey}T${HOSPITAL.firstSlot}`);
        var endTime = new Date(`${dateKey}T${HOSPITAL.lastSlot}`);

        //  time comparison
        while (currentTime <= endTime) {
            // 24-hour formatting
            var timeLabel = currentTime.toTimeString().slice(0, 5);

            slots.push({
                time: timeLabel,
                booked: false
            });

            currentTime.setMinutes(currentTime.getMinutes() + HOSPITAL.slotDuration)
        }
        appointments[dateKey] = slots;
        return appointments[dateKey];
    }

    //is there anything on this date?
    function hasBookedSlot(dateKey){
        var daySlots = appointments[dateKey];

        if (daySlots === undefined) {
            return false;
        }

        for (var i = 0; i < daySlots.length; i++) {
            if (daySlots[i].booked === true) {
                return true; // exit as soon as one booked slot is found
            }
        }

        return false;
    }

    function appointmentCalendar() {
        try{
            var calendarHeader = getById("month-year");
            var grid = getById("dateGrid");
            grid.innerHTML = ""; 

            calendarHeader.textContent = `${months[currentMonth]} ${currentYear}`;

            //no going back to months that have already passed
            getById("prev-month").disabled = (
                currentYear === today.getFullYear() 
                && currentMonth === today.getMonth()
            );

            let firstDayIndex = new Date(currentYear, currentMonth, 1).getDay() ;
            let totalDays = new Date(currentYear, currentMonth + 1, 0).getDate() ;

            //create blanks before day one of the month
            for (let i = 0; i < firstDayIndex; i++){
                let blank = createElement("button");
                blank.type = "button";
                blank.className = "date-box empty";
                grid.appendChild(blank);
            }

            for(let day = 1; day <= totalDays; day++) {
                let box = createElement("button");
                let boxDate = new Date(currentYear, currentMonth, day);
                let boxKey = makeDateKey(currentYear, currentMonth, day);

                box.type = "button";  //buttons inside a form submit it unless they are told otherwise
                box.className = "date-box";
                box.textContent = day;

                //today's day
                if(
                    day === today.getDate() &&
                    currentMonth === today.getMonth() &&
                    currentYear === today.getFullYear()
                ) {
                    box.classList.add("today");
                }

                //unavailable: the hospital is closed that day
                if (!HOSPITAL.openDays.includes(boxDate.getDay()) || boxDate < today) {
                    box.disabled = true;
                }

                if (hasBookedSlot(boxKey) === true) {
                    box.classList.add("has-event");
                }

                //the day the patient is booking
                if (boxKey === selectedDateKey) {
                    box.classList.add("selected");
                }

                //  open up the time window
                box.onclick = function() {
                    markSelected("date-box", box);
                    openTimePicker(boxKey, day);
                };

                grid.appendChild(box);
            }
        }

        catch (err){
            console.log(err); //if something breaks in the calendar it will be caught and logged
        }
    }

    //time-slots
    function openTimePicker(dateKey, dayNum){
        var popup = getById("timeContainer");
        var popupTitle = getById("appointmentTime");
        var timeSlotList = getById("timeSlot");

        //a new day was picked, so the old time and old message no longer apply
        selectedDateKey = dateKey;
        selectedSlotIndex = null;
        getById("confirmation-message").hidden = true;

        popupTitle.textContent=`Available Slots: ${months[currentMonth]} ${dayNum}`;
        timeSlotList.innerHTML = "";

        var slots = generateTimeSlot(dateKey);

        slots.forEach((slot, index) => {
            const btn = createElement("button");
            btn.type = "button";
            btn.className = "slot-btn";
            btn.textContent = slot.time;

            if (slot.booked) {
                btn.disabled = true;
            } else {
                btn.onclick = function() {
                    selectedSlotIndex = index;
                    markSelected("slot-btn", btn);
                };
            }

            timeSlotList.appendChild(btn);
        });

        popup.hidden = false;
    }

    //calendar nav-buttons
    function setUpCalendar(){
        var prevBtn = getById("prev-month");
        var nextBtn = getById("next-month");

        prevBtn.addEventListener("click", function() {
            currentMonth--;

            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear-- ;
            }

            appointmentCalendar();
        } );

        nextBtn.addEventListener("click", function() {
            currentMonth++;

            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++ ;
            }

            appointmentCalendar(); //update calendar
        } );

        getById("closeModal").onclick = function() {
            getById("timeContainer").hidden = true;
        };

        appointmentCalendar();
    }
    //--End of Calendar Feature--//

    function bookSlot() {
        var slot = appointments[selectedDateKey][selectedSlotIndex];
        slot.booked = true;

        showConfirmation(`All set! See you soon!`, "ok");

        selectedSlotIndex = null;
        getById("timeContainer").hidden = true;
        appointmentCalendar();
    }

    function setUpBookingForm(){
        getById("bookingForm").addEventListener("submit", function(event) {
            event.preventDefault();  //stay on this page, there is no server to send the form to

            if (selectedDepartment === null) {
                showConfirmation("Please choose a department first.", "error");
                return;
            }

            if (selectedSlotIndex === null) {
                showConfirmation("Please pick a date and a time.", "error");
                return;
            }

            bookSlot();
        });
    }

//--End-of-appointments--//


//---PRESCRIPTION-REQUEST---//

// check the dates make sense, then confirm
function setUpPrescriptionForm(){
    getById("prescriptionForm").addEventListener("submit", function(event) {
        event.preventDefault();  

        
        if (getById("refill-date").value < getById("last-dose").value) {
            showConfirmation("The refill date cannot be before your last dose.", "error");
            return;
        }

        showConfirmation("Request sent!", "ok");
    });
}

//--End-of-forms--//



//each part only starts if its page has it

loadPatientData();

if (getById("dateGrid")) {
    setUpDepartmentButtons();
    setUpCalendar();
    setUpBookingForm();
}

if (getById("prescriptionForm")) {
    setUpPrescriptionForm();
}

//--End-of-patient-dashboard--//