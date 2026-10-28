'use strict';
/* forms.js - login page and register page.
   Load it AFTER validation.js and session.js (and after the teammates' file that defines Auth).

   CONTRACT with the database part. Agree on these two names with your teammates:
     Auth.login({ role, username, email, password })   -> { id, role, name }   or throws Error('Invalid credentials')
     Auth.register({ firstName, lastName, username, email, telephone, dob, nhs, address, password })  -> the new id
   Auth is where the password hashing, IndexedDB and encryption live: not in this file. */

(() => {
  const ROLES = {
    patient: 'Book appointments, request prescriptions and read your medical notes.',
    doctor: 'Review patient history and add notes and prescriptions.',
    admin: 'Add, update and remove patient records.'
  };

  const $ = id => document.getElementById(id);
  const setText = (id, text) => { if ($(id)) $(id).textContent = text; };

  const form = $('login-form') || $('register-form');
  if (!form) return;                                 // this page has no form
  const isLogin = form.id === 'login-form';

  /* ---------- 1. Login page: show the role chosen on the home page ---------- */

  if (isLogin) {
    const asked = new URLSearchParams(location.search).get('role');
    const role = Object.hasOwn(ROLES, asked) ? asked : 'patient';      // anything unknown -> patient
    document.body.dataset.role = role;                                 // the CSS uses it for the colours
    setText('login-title', role[0].toUpperCase() + role.slice(1) + ' login');
    setText('login-lead', ROLES[role]);
    if ($('role')) $('role').value = role;
    if ($('register-box')) $('register-box').hidden = role !== 'patient';   // only patients can register
  }

  /* ---------- 2. Register page: no date of birth in the future ---------- */

  if ($('dob')) $('dob').max = new Date().toISOString().slice(0, 10);

  /* ---------- 3. Messages ---------- */

  function show(text, isError) {
    const box = $('form-message');
    if (!box) return alert(text);
    box.textContent = text;
    box.style.color = isError ? 'var(--danger)' : 'var(--ok)';
  }

  // Shows the browser's own bubble on the first wrong field
  function showErrors(errors) {
    for (const field of form.elements) field.setCustomValidity(errors[field.name] || '');
    form.reportValidity();
  }

  form.addEventListener('input', event => event.target.setCustomValidity(''));   // typing again clears the error

  /* ---------- 4. Submit ---------- */

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const result = isLogin ? Check.login(data) : Check.register(data);
    if (!result.ok) return showErrors(result.errors);

    if (typeof Auth === 'undefined') {
      return show('The form is valid, but the database part (Auth) is not connected yet.', false);
    }

    try {
      if (isLogin) {
        const role = Object.hasOwn(ROLES, data.role) ? data.role : 'patient';   // the hidden field can be edited
        Session.start(await Auth.login({ ...result.values, role }));
      } else {
        await Auth.register(result.values);
        show('Account created. Taking you to the login page...', false);
        setTimeout(() => { location.href = `${Session.PAGES.login}?role=patient`; }, 1200);
      }
    } catch (error) {
      show(error.message, true);                     // for example: Invalid credentials
    }
  });
})(); 