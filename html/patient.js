/*/*Patient Page Functionality by Hindu*/

/*Personal profile section*/
/*End of personal profile section*/

/*Medical history section*/
/*End of medical history section*/

/*Booking page*/
/*End of booking page*/

/*prescription page*/
<<<<<<< Updated upstream
/*End of prescription page*/
=======
/*End of prescription page*/

// ---------- Login page: role chosen on the home page ----------
const title = document.getElementById('login-title');
if (title) {
  const asked = new URLSearchParams(location.search).get('role');
  const role = Object.hasOwn(LEADS, asked) ? asked : 'patient'; // whitelist: anything else -> patient
  document.body.dataset.role = role; // CSS picks the role colour from this
  title.textContent = role.charAt(0).toUpperCase() + role.slice(1) + ' Login';
  document.getElementById('login-lead').textContent = LEADS[role];
  document.getElementById('role').value = role;
  document.getElementById('register-box').hidden = role !== 'patient';   // only patients can register
}

// ---------- Submit (placeholder) ----------
// The browser has already checked required / email / pattern before this runs.
const form = document.getElementById('login-form') || document.getElementById('register-form');
if (form) {
  form.addEventListener('submit', event => {
    event.preventDefault();
    document.getElementById('form-message').textContent = 'Form is valid. It is not connected to the database yet.';
  });
}
>>>>>>> Stashed changes
