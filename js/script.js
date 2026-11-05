'use strict'; //turns on strict mode

const LEADS = {
  patient: 'Book appointments, request prescriptions, view past appointments and read your medical notes.',
  doctor: 'Review patient history, add notes and prescriptions.',
  admin: 'Add, update and remove patient records.'
};

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

  const input = document.getElementById('username');
  if (role === 'patient' || role === 'doctor') {
    input.type = 'email';
    input.autocomplete = 'email';
    document.getElementById('username-label').textContent = 'Email';
  }

  // If someone is already logged in, skip the login page
  redirectIfLoggedIn();

  // ---------- Wire the form to loginUser ----------
  const form = input.closest('form');
  const passwordInput = document.getElementById('password');

  // Message area: uses #login-error if your HTML has one, otherwise creates it
  let errorBox = document.getElementById('login-error');
  if (!errorBox) {
    errorBox = document.createElement('p');
    errorBox.id = 'login-error';
    form.appendChild(errorBox);
  }
  errorBox.setAttribute('role', 'alert');
  errorBox.hidden = true;

  function showError(message) {
    errorBox.textContent = message; // textContent, never innerHTML
    errorBox.hidden = false;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.hidden = true;

    const submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true; // stop double submits while bcrypt runs

    try {
      // Use the whitelisted role from above, not whatever is in the DOM
      const result = await loginUser(input.value, passwordInput.value, role);

      if (result.success) {
        redirectToRoleHome(role);
        return;
      }

      showError(result.message);
      passwordInput.value = '';
      passwordInput.focus();
    } catch (err) {
      console.error('Login submit error:', err);
      showError('Something went wrong. Please try again.');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

// ---------- Register page ----------
const dob = document.getElementById('dob');
if (dob) dob.max = new Date().toISOString().slice(0, 10); // no date of birth in the future

const pw = document.getElementById('password');
const confirmPw = document.getElementById('confirmPassword');
function checkMatch() {
  confirmPw.setCustomValidity(pw.value === confirmPw.value ? '' : 'Passwords do not match');
}
if (pw && confirmPw) {
  pw.addEventListener('input', checkMatch);
  confirmPw.addEventListener('input', checkMatch);
}