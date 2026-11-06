function initialiseAdminPage() {

    //add click event listener to each tab button
    document.querySelectorAll(".tabButton").forEach((tab) => {
    tab.addEventListener("click", () => {
        showSection(tab.getAttribute("aria-controls"));
    });

    showSection("mainSection"); //show the main section by default
});

    //initialise each section of the admin page
    initialiseAddPatientForm();
    initialiseSearch();
    initialiseEditForm();
}

function showSection(sectionId) {
//shows only the selected section
    const sections = document.querySelectorAll(".adminSection");
    const tabs = document.querySelectorAll(".tabButton");

    //Hide every section except the chosen one
    sections.forEach((section) => {
        if (section.id === sectionId) {
            section.classList.remove("hidden");
        } else {
            section.classList.add("hidden");
        }
    });

    //Highlight the tab that controls the chosen section
    tabs.forEach((tab) => {
        const tabSectionId = tab.getAttribute("aria-controls");
        let isActive;
        if (tabSectionId === sectionId) {
            isActive = true;
        } else {
            isActive = false;
        }
        tab.setAttribute("aria-selected", String(isActive));
    });
}



//ADD NEW PATIENT FUNCTIONS//

//drop down values in the form
const PATIENT_TITLES = ["Mr", "Mrs", "Ms", "Miss", "Dr", "Mx"];
const PATIENT_GENDERS = ["Female", "Male", "Other", "Prefer not to say"];


function normaliseNumber(value) {
//removes all the unecessary characters
    return String(value ?? "").replace(/[\s()-]/g, "");
}

function preparePatientForm(form) {
//reads the patient form and checks the values using functions from validation.js
    const data = Object.fromEntries(new FormData(form));

    const values = {
    //prepares all the attributes using .clean function
        Title: Check.clean(data.Title),
        First: Check.clean(data.First),
        Last: Check.clean(data.Last),
        DOB: Check.clean(data.DOB),
        Gender: Check.clean(data.Gender),
        NHS: normaliseNumber(Check.clean(data.NHS)),
        Address: Check.clean(data.Address),
        Email: Check.clean(data.Email).toLowerCase(),
        Telephone: Check.clean(data.Telephone)
    };

    const errors = {};
    //create a js object which contains all the errors when filling in the form using functions from validation.js
    if (!PATIENT_TITLES.includes(values.Title)) errors.Title = "Choose a title";
    if (!Check.isName(values.First)) errors.First = "Enter a valid first name";
    if (!Check.isName(values.Last)) errors.Last = "Enter a valid last name";
    if (!Check.isPastDate(values.DOB)) errors.DOB = "Enter a valid date of birth";
    if (!PATIENT_GENDERS.includes(values.Gender)) errors.Gender = "Choose a gender";
    if (!Check.isNhs(values.NHS)) errors.NHS = "The NHS number has 10 digits";
    if (values.Address.length < 5) errors.Address = "Enter the patient's address";
    if (!Check.isEmail(values.Email)) errors.Email = "Enter a valid email address";
    if (!Check.isPhone(values.Telephone)) errors.Telephone = "Enter a valid telephone number";

    values.Telephone = normaliseNumber(values.Telephone);

    const validForm = Object.keys(errors).length === 0;
    return { validForm, errors, values };
}



const FIELD_CONTEXTS = {
    NHS: ["", "NHS"],
    Email: ["email", "Email", ""],
    email: ["email", "Email", ""],
    Telephone: ["", "Telephone"]
};

function contextsFor(field) {
    return FIELD_CONTEXTS[field] ?? [""];
}

async function decryptField(value, cryptoKey, field) {
//decrypt the encrypted value obtained from the database using the key in local storage
//tries each context the attribute may use, and returns null if none of them work
    if (typeof value !== "string") return null;

    for (const context of contextsFor(field)) {
        try {
            return await decrypt(value, cryptoKey, context);
        } catch {
            //wrong context, so try the next one
        }
    }

    return null;
}


async function patientNHSExists(nhs, cryptoKey) {
    const patients = await getAllRecords("patients");

    for (const patient of patients) {
        const storedNHS = await decryptField(patient.NHS, cryptoKey, "NHS");
        if (storedNHS !== null && normaliseNumber(storedNHS) === nhs) return true;
    }

    return false;
}

//Checks for an existing patient, encrypts the sensitive fields and saves the new record.
//Returns the new patient's id.
async function addNewPatient(values) {
    await dbReady; //wait until db.js has created and seeded the database

    const keyString = localStorage.getItem("storedKey");
    if (!keyString) {
        throw userError("Encryption key not found. Reload the page and try again.");
    }
    const cryptoKey = await importKey(keyString);

    if (await patientNHSExists(values.NHS, cryptoKey)) {
        throw userError("A patient with this NHS number already exists.");
    }

    //Encrypted the same way as the seeded patients in saveData(), so renderSelectedFields() can decrypt them
    const patientRecord = {
        Title: values.Title,
        First: values.First,
        Last: values.Last,
        NHS: await encrypt(values.NHS, cryptoKey),
        DOB: await encrypt(values.DOB, cryptoKey),
        Gender: await encrypt(values.Gender, cryptoKey),
        Address: await encrypt(values.Address, cryptoKey),
        Email: await encrypt(values.Email, cryptoKey, contextsFor("Email")[0]),
        Telephone: await encrypt(values.Telephone, cryptoKey)
    };

    const session = await getSession();

    activityLogMessage = `User ${session.userId} added a new patient.`;
    addActivityLog(session.role, session.userId, activityLogMessage);

    //No id: the patients store uses autoIncrement to create one
    return await addRecord("patients", patientRecord);
}


function initialiseAddPatientForm() {
//sets each button to the proper functions
    const form = document.getElementById("addPatientForm");

    const message = document.getElementById("addPatientMessage");
    const submitButton = form.querySelector('button[type="submit"]');

    //No date of birth in the future
    const dob = document.getElementById("patientDOB");
    if (dob) dob.max = new Date().toISOString().slice(0, 10);

    //Typing in a field clears its error
    form.addEventListener("input", (event) => event.target.setCustomValidity(""));

    //Clearing the form also clears the errors and the message
    form.addEventListener("reset", () => {
        for (const field of form.elements) field.setCustomValidity("");
        message.textContent = "";
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault(); //stop the page reloading
        message.textContent = "";

        const result = preparePatientForm(form);
        if (!result.validForm) {
            showFieldErrors(form, result.errors);
            return;
        }

        submitButton.disabled = true; //stop the same patient being submitted twice
        message.textContent = "Saving patient...";

        try {
            const patientId = await addNewPatient(result.values);
            form.reset();
            message.textContent = `Patient ${result.values.First} ${result.values.Last} added (ID ${patientId}).`;
        } catch (error) {
            console.error("Add patient error: ", error);
            message.textContent = error.showToUser
                ? error.message
                : "The patient could not be added. Please try again.";
        } finally {
            submitButton.disabled = false;
        }
    });
}


//ERROR MESSAGE FOR ADD PATIENT

function userError(message) {
//show the admin the specific error 
    const error = new Error(message);
    error.showToUser = true;
    return error;
}


//Shows the browser's own error bubble on the first invalid field
function showFieldErrors(form, errors) {
//sets a custom validity message for each field with an error
    for (const field of form.elements) {
        if (field.name) field.setCustomValidity(errors[field.name] || "");
    }
    form.reportValidity();
}


//SEARCH DATA FUNCTIONS

//Fields encrypted by saveData() and addNewPatient(), decrypted before they are shown or searched
const ENCRYPTED_FIELDS = {
    patients: ["NHS", "DOB", "Gender", "Address", "Email", "Telephone"],
    doctors: ["email", "gender", "Address", "Telephone"]
};

//Fields that are never shown or searched
const HIDDEN_FIELDS = ["password", "passwordHash"];

//Names used in the "Showing x of y ..." message
const STORE_LABELS = {
    patients: "patients",
    doctors: "doctors",
    admins: "admins",
    medicines: "medicines",
    activityLogs: "activity logs",
    feedback: "feedback"
};

//The key field of each table (its keyPath in openDatabase())
const KEY_FIELDS = {
    patients: "id",
    doctors: "doctorID",
    admins: "adminID",
    medicines: "medicineID",
    activityLogs: "logID",
    feedback: "feedbackID"
};

//Names used for one record, e.g. "Delete patient 3"
const SINGULAR_LABELS = {
    patients: "patient",
    doctors: "doctor",
    admins: "admin",
    medicines: "medicine",
    activityLogs: "activity log",
    feedback: "feedback entry"
};

//Icons for the buttons in the first column (the spaces in the file names are written as %20)
const ACTION_ICONS = {
    edit: "../images/edit%20icon.jpg",
    delete: "../images/delete%20icon.png"
};

//The chosen table's records, already decrypted, so typing only filters what is in memory.
//rawByKey keeps the records exactly as stored (still encrypted), looked up by their key.
let searchData = { store: null, fields: [], records: [], rawByKey: new Map() };

//Counts table loads, so a slow load can't overwrite a newer one
let searchLoadId = 0;


function valueToText(value) {
//turns any stored value into text that can be shown and searched
    if (value === undefined || value === null) return "";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
}


async function decryptRecord(record, encryptedFields, cryptoKey) {
//returns a copy of the record with its encrypted fields decrypted
    const copy = { ...record };

    for (const field of encryptedFields) {
        if (typeof copy[field] === "string") {
            const plain = await decryptField(copy[field], cryptoKey, field);
            copy[field] = plain ?? "[decryption failed]";
        }
    }

    return copy;
}


function getSelectedStore() {
//the table chosen in the + options
    const checked = document.querySelector('#searchForm input[name="store"]:checked');
    return checked ? checked.value : "patients";
}


function getSelectedCriteria() {
//the attributes ticked in the + options; none ticked means search every attribute
    const ticked = [...document.querySelectorAll('#searchCriteria input[name="criteria"]:checked')]
        .map((box) => box.value);

    return ticked.length > 0 ? ticked : searchData.fields;
}


function buildCriteriaOptions(fields) {
//creates one ticked checkbox per attribute of the chosen table
    const fieldset = document.getElementById("searchCriteria");
    const legend = fieldset.querySelector("legend");
    fieldset.replaceChildren(legend);

    for (const field of fields) {
        const label = document.createElement("label");
        const box = document.createElement("input");
        box.type = "checkbox";
        box.name = "criteria";
        box.value = field;
        box.checked = true;

        label.append(box, " " + field);
        fieldset.appendChild(label);
    }
}


function renderSearchTable(fields, records) {
//draws the header row and one row per record (textContent, so stored data can't run as HTML)
    const thead = document.getElementById("searchHead");
    const tbody = document.getElementById("searchBody");
    thead.replaceChildren();
    tbody.replaceChildren();

    if (fields.length === 0) return;

    const headRow = thead.insertRow();

    //first column holds the edit and delete buttons
    const actionsHeader = document.createElement("th");
    actionsHeader.scope = "col";
    actionsHeader.textContent = "Edit and Delete";
    headRow.appendChild(actionsHeader);

    for (const field of fields) { //loops for header of the table
        const th = document.createElement("th");
        th.scope = "col";
        th.textContent = field;
        headRow.appendChild(th);
    }

    for (const record of records) { //loops for each record to create a row in the table
        const row = tbody.insertRow();

        const actionsCell = row.insertCell();
        actionsCell.className = "actionsCell";
        actionsCell.append(makeActionButton("edit", record), makeActionButton("delete", record));

        for (const field of fields) {
            row.insertCell().textContent = valueToText(record[field]);
        }
    }
}


function updateSearchResults() {
//filters the loaded records by the search bar and redraws the table
    const message = document.getElementById("searchMessage");
    const term = document.getElementById("searchValue").value;

    //every word typed must appear in at least one ticked attribute, so each extra word narrows the results
    const words = term.toLowerCase().split(/\s+/).filter(Boolean);
    const criteria = getSelectedCriteria();

    const matches = searchData.records.filter((record) =>
        words.every((word) =>
            criteria.some((field) => valueToText(record[field]).toLowerCase().includes(word))
        )
    );

    renderSearchTable(searchData.fields, matches);

    const label = STORE_LABELS[searchData.store] ?? "records";
    if (searchData.records.length === 0) {
        message.textContent = `There are no ${label} yet.`;
    } else if (matches.length === 0) {
        message.textContent = `No ${label} match "${term.trim()}".`;
    } else {
        message.textContent = `Showing ${matches.length} of ${searchData.records.length} ${label}.`;
    }
}


async function loadSearchTable(store) {
//loads and decrypts every record of the chosen table, then shows them
    const loadId = ++searchLoadId;
    const message = document.getElementById("searchMessage");
    message.textContent = "Loading...";

    try {
        await dbReady; //wait until db.js has created and seeded the database
        const records = await getAllRecords(store);

        const encryptedFields = ENCRYPTED_FIELDS[store] ?? [];
        let decrypted = records;

        if (encryptedFields.length > 0) {
            const keyString = localStorage.getItem("storedKey");
            if (!keyString) {
                throw userError("Encryption key not found. Reload the page and try again.");
            }
            const cryptoKey = await importKey(keyString);
            decrypted = await Promise.all(
                records.map((record) => decryptRecord(record, encryptedFields, cryptoKey))
            );
        }

        if (loadId !== searchLoadId) return; //a different table was chosen while this one loaded

        //every attribute found in any record, except the hidden ones
        const fields = [...new Set(decrypted.flatMap((record) => Object.keys(record)))]
            .filter((field) => !HIDDEN_FIELDS.includes(field));

        const keyField = KEY_FIELDS[store];
        const rawByKey = new Map(records.map((record) => [record[keyField], record]));

        searchData = { store, fields, records: decrypted, rawByKey };
        buildCriteriaOptions(fields);
        updateSearchResults();

    } catch (error) {
        if (loadId !== searchLoadId) return;

        console.error("Search load error: ", error);
        searchData = { store, fields: [], records: [], rawByKey: new Map() };
        buildCriteriaOptions([]);
        renderSearchTable([], []);
        message.textContent = error.showToUser
            ? error.message
            : "The records could not be loaded. Please try again.";
    }
}


function initialiseSearch() {
//assigns each button to their respective functions

    const form = document.getElementById("searchForm");
    if (!form) return; //this page has no search form

    const searchInput = document.getElementById("searchValue");
    const optionsButton = document.getElementById("searchOptionsButton");
    const options = document.getElementById("searchOptions");

    //pressing Enter must not reload the page
    form.addEventListener("submit", (event) => event.preventDefault());

    //the table updates on every key press
    searchInput.addEventListener("input", updateSearchResults);

    //the + button opens and closes the options
    optionsButton.addEventListener("click", () => {
        const isOpen = !options.classList.toggle("hidden");
        optionsButton.setAttribute("aria-expanded", String(isOpen));
        optionsButton.textContent = isOpen ? "−" : "+";
    });

    //choosing a table reloads the data, ticking an attribute re-filters it
    form.addEventListener("change", (event) => {
        if (event.target.name === "store") {
            searchInput.placeholder = `Search ${STORE_LABELS[event.target.value]}`;
            loadSearchTable(event.target.value);
        } else if (event.target.name === "criteria") {
            updateSearchResults();
        }
    });

    //reload whenever the Search tab is opened, so newly added patients appear
    const searchTab = document.getElementById("searchTabButtonId");
    if (searchTab) {
        searchTab.addEventListener("click", () => loadSearchTable(getSelectedStore()));
    }
}



//EDIT AND DELETE RECORD FUNCTIONS


const FIELD_CHECKS = { //prepare values to be checked
    NHS: { prepare: normaliseNumber, test: (value) => Check.isNhs(value), message: "The NHS number has 10 digits" },
    First: { test: (value) => Check.isName(value), message: "Enter a valid first name" },
    Last: { test: (value) => Check.isName(value), message: "Enter a valid last name" },
    Email: { prepare: (value) => value.toLowerCase(), test: (value) => Check.isEmail(value), message: "Enter a valid email address" },
    email: { prepare: (value) => value.toLowerCase(), test: (value) => Check.isEmail(value), message: "Enter a valid email address" },
    Telephone: { prepare: normaliseNumber, test: (value) => Check.isPhone(value), message: "Enter a valid telephone number" },
    telephone: { prepare: normaliseNumber, test: (value) => Check.isPhone(value), message: "Enter a valid telephone number" },
    DOB: { test: (value) => Check.isPastDate(value), message: "Enter a valid date of birth (yyyy-mm-dd)" },
    dob: { test: (value) => Check.isPastDate(value), message: "Enter a valid date of birth (yyyy-mm-dd)" }
};


let editingRecord = null;  //The record currently open in the edit form


function prepareRecord(record) {
//prepare record to to display

    const store = searchData.store;
    const singular = SINGULAR_LABELS[store] ?? "record";
    const key = record[KEY_FIELDS[store]];
    const name = [record.First, record.Last].filter(Boolean).join(" ");

    return name ? `${singular} ${key} (${name})` : `${singular} ${key}`;
}


function makeActionButton(action, record) {
//creates an edit or delete button showing its icon from the images folder

    const button = document.createElement("button");
    button.type = "button";
    button.className = "actionButton";

    const label = `${action === "edit" ? "Edit" : "Delete"} ${prepareRecord(record)}`;
    button.setAttribute("aria-label", label); 

    const icon = document.createElement("img");
    icon.src = ACTION_ICONS[action];
    icon.alt = ""; 
    button.appendChild(icon);

    button.addEventListener("click", () => {
        if (action === "edit") {
            openEditForm(record);
        } else {
            confirmDeleteRecord(record);
        }
    });

    return button;
}


async function confirmDeleteRecord(record) {
//asks the admin to confirm, then deletes the record from the database (deleteRecord from db.js)

    const store = searchData.store;
    const key = record[KEY_FIELDS[store]];
    const description = prepareRecord(record);

    if (!confirm(`Are you sure you want to delete ${description}? This cannot be undone.`)) return;

    try {
        await deleteRecord(store, key);

        //remove it from the loaded data and redraw, keeping the current search
        searchData.records = searchData.records.filter((r) => r !== record);
        searchData.rawByKey.delete(key);
        updateSearchResults();

        const session = await getSession();

        activityLogMessage = `User ${session.userId} deleted a record.`;
        addActivityLog(session.role, session.userId, activityLogMessage);

        document.getElementById("searchMessage").textContent = `Deleted ${description}.`;
    } catch (error) {
        console.error("Delete record error: ", error);
        document.getElementById("searchMessage").textContent = "The record could not be deleted. Please try again.";
    }
}


function openEditForm(record) {
//fills the edit form with one input per attribute of the record and opens it\

    const store = searchData.store;
    const keyField = KEY_FIELDS[store];
    const fieldsBox = document.getElementById("editFields");

    editingRecord = record;
    fieldsBox.replaceChildren();
    document.getElementById("editDialogTitle").textContent = `Edit ${prepareRecord(record)}`;
    document.getElementById("editMessage").textContent = "";

    for (const field of Object.keys(record)) {
        if (HIDDEN_FIELDS.includes(field)) continue;

        const inputId = "edit" + field.replace(/[^A-Za-z0-9]/g, "");

        const label = document.createElement("label");
        label.htmlFor = inputId;
        label.textContent = field;

        const input = document.createElement("input");
        input.type = "text";
        input.id = inputId;
        input.name = field;
        input.value = valueToText(record[field]);
        input.autocomplete = "off";

        //the key identifies the record, so it can't be changed
        if (field === keyField) input.readOnly = true;

        fieldsBox.append(label, input);
    }

    document.getElementById("editDialog").showModal();
}


function readEditedValue(field, text, originalValue) {
//turns the text typed for one attribute back into the right type and checks it
    if (typeof originalValue === "number") {
        const number = Number(text);
        if (text.trim() === "" || Number.isNaN(number)) return { error: "Enter a number" };
        return { value: number };
    }

    if (typeof originalValue === "boolean") {
        if (text !== "true" && text !== "false") return { error: "Enter true or false" };
        return { value: text === "true" };
    }

    if (originalValue !== null && typeof originalValue === "object") {
        try {
            return { value: JSON.parse(text) };
        } catch {
            return { error: "Enter valid JSON" };
        }
    }

    //text: use the rules from validation.js when this attribute has one
    const check = FIELD_CHECKS[field];
    if (!check) return { value: text.trim() };

    let value = Check.clean(text);
    if (check.prepare) value = check.prepare(value);
    if (!check.test(value)) return { error: check.message };

    return { value };
}


async function saveEditedRecord(form) {
//checks the edit form, encrypts changed sensitive attributes and saves the record (updateRecord from db.js)
    const store = searchData.store;
    const keyField = KEY_FIELDS[store];
    const original = editingRecord;
    const key = original[keyField];
    const raw = searchData.rawByKey.get(key);
    const encryptedFields = ENCRYPTED_FIELDS[store] ?? [];

    const changes = {};
    const errors = {};

    for (const input of form.querySelectorAll("#editFields input")) {
        const field = input.name;
        if (field === keyField) continue;

        //unchanged attributes are kept exactly as stored, without checking them again
        if (input.value === valueToText(original[field])) continue;

        const result = readEditedValue(field, input.value, original[field]);
        if (result.error) {
            errors[field] = result.error;
        } else {
            changes[field] = result.value;
        }
    }

    if (Object.keys(errors).length > 0) {
        showFieldErrors(form, errors);
        return false;
    }

    if (Object.keys(changes).length === 0) {
        throw userError("Nothing has been changed.");
    }

    let cryptoKey = null;
    if (Object.keys(changes).some((field) => encryptedFields.includes(field))) {
        const keyString = localStorage.getItem("storedKey");
        if (!keyString) {
            throw userError("Encryption key not found. Reload the page and try again.");
        }
        cryptoKey = await importKey(keyString);
    }

    //checks if new nhs number already exists in the database
    if (store === "patients" && "NHS" in changes && await patientNHSExists(changes.NHS, cryptoKey)) {
        throw userError("A patient with this NHS number already exists.");
    }

    //start from the stored record so hidden attributes (e.g. passwordHash) are kept
    const updatedRaw = { ...raw };
    for (const [field, value] of Object.entries(changes)) {
        updatedRaw[field] = encryptedFields.includes(field)
            ? await encrypt(value, cryptoKey, contextsFor(field)[0])
            : value;
    }

    await updateRecord(store, updatedRaw);

    //update the loaded data so the table shows the change straight away
    const updatedPlain = { ...original, ...changes };
    searchData.records = searchData.records.map((r) => (r === original ? updatedPlain : r));
    searchData.rawByKey.set(key, updatedRaw);

    return true;
}


function initialiseEditForm() {
//connects the edit form's buttons
    const dialog = document.getElementById("editDialog");
    const form = document.getElementById("editForm");
    if (!dialog || !form) return; //this page has no edit form

    const message = document.getElementById("editMessage");
    const saveButton = form.querySelector('button[type="submit"]');

    document.getElementById("editCancelButton").addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", () => { editingRecord = null; });

    //clicking outside the edit window closes it without saving.
    //Clicks on the dark backdrop are reported on the dialog itself, so check the click is outside its box.
    dialog.addEventListener("click", (event) => {
        if (event.target !== dialog) return; //a click on something inside the form

        const box = dialog.getBoundingClientRect();
        const clickedOutside =
            event.clientX < box.left || event.clientX > box.right ||
            event.clientY < box.top || event.clientY > box.bottom;

        if (clickedOutside) dialog.close();
    });

    //typing in a field clears its error
    form.addEventListener("input", (event) => event.target.setCustomValidity(""));

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!editingRecord) return;

        const description = prepareRecord(editingRecord);
        saveButton.disabled = true;
        message.textContent = "Saving...";

        try {
            const saved = await saveEditedRecord(form);
            if (!saved) {
                message.textContent = "";
                return;
            }

            dialog.close();
            updateSearchResults();
            document.getElementById("searchMessage").textContent = `Saved changes to ${description}.`;
        } catch (error) {
            console.error("Edit record error: ", error);
            message.textContent = error.showToUser
                ? error.message
                : "The changes could not be saved. Please try again.";
        } finally {
            saveButton.disabled = false;
        }
    });
}



async function startAdminPage() {
//sends anyone who is not logged in as an admin away from this page (requireAdmin from auth.js)
    const session = await requireAdmin();
    if (session === null) return;

    initialiseAdminPage();
}

//call functions in the script
startAdminPage();
