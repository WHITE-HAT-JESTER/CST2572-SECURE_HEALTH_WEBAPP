'use strict';
/* front-end .
   - login.html: applies the chosen role (from ?role=): page colour, title, short text; hides Register unless patient
   - register.html: checks that both passwords match, limits the date of birth to today
   - both forms: show a placeholder message on submit. */

const LEADS = {
  patient: 'Book appointments, request prescriptions and read your medical notes.',
  doctor: 'Review patient history and add notes and prescriptions.',
  admin: 'Add, update and remove patient records.'
};

// ---------- Login page: role chosen on the home page ----------
const title = document.getElementById('login-title');
if (title) {
  const asked = new URLSearchParams(location.search).get('role');
  const role = Object.hasOwn(LEADS, asked) ? asked : 'patient';          // whitelist: anything else -> patient
  document.body.dataset.role = role;                                     // CSS picks the role colour from this
  title.textContent = role.charAt(0).toUpperCase() + role.slice(1) + ' login';
  document.getElementById('login-lead').textContent = LEADS[role];
  document.getElementById('role').value = role;
  document.getElementById('register-box').hidden = role !== 'patient';   // only patients can register
}

// ---------- Register page ----------
const dob = document.getElementById('dob');
if (dob) dob.max = new Date().toISOString().slice(0, 10);                // no date of birth in the future

const pw = document.getElementById('password');
const confirmPw = document.getElementById('confirmPassword');
function checkMatch() {
  confirmPw.setCustomValidity(pw.value === confirmPw.value ? '' : 'Passwords do not match');
}
if (pw && confirmPw) {
  pw.addEventListener('input', checkMatch);
  confirmPw.addEventListener('input', checkMatch);
}

// ---------- Submit (placeholder) ----------
// The browser has already checked required / email / pattern before this runs.
// TODO (team): replace the message below with the real code (database, hashing, encryption...).
const form = document.getElementById('login-form') || document.getElementById('register-form');
if (form) {
  form.addEventListener('submit', event => {
    event.preventDefault();
    document.getElementById('form-message').textContent = 'Form is valid. It is not connected to the database yet.';
  });
}
