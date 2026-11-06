'use strict';
/* register-validation.js - connects the registration form to validation.js (Check.register).
   Why: the HTML rules (required, pattern...) can be removed in the browser tools, so the
   data is checked again in JavaScript before anything is saved.
   Load AFTER validation.js. */

(() => {
  const form = document.getElementById('registerForm');
  const message = document.getElementById('form-message');
  if (!form || !message || typeof Check === 'undefined') return;

  // JavaScript is the authority: turn off the browser's own checks so our messages are shown
  form.noValidate = true;

  // Read what the form contains (names match Check.register)
  function readForm() {
    const value = id => (document.getElementById(id) ? document.getElementById(id).value : '');
    return {
      firstName: value('firstName'),
      lastName: value('lastName'),
      email: value('email'),
      telephone: value('Telephone'),
      dob: value('dob'),
      nhs: value('nhs'),
      address: value('address'),
      password: value('password'),
      confirmPassword: value('confirmPassword'),
      username: ''                       // this form has no username field (see below)
    };
  }

  // Show the messages with textContent
  function showErrors(errors) {
    message.replaceChildren();
    message.style.color = '#B3261E';
    for (const field in errors) {
      const line = document.createElement('div');
      line.textContent = errors[field];
      message.appendChild(line);
      const input = document.getElementById(field === 'telephone' ? 'Telephone' : field);
      if (input) input.setAttribute('aria-invalid', 'true');
    }
  }

  function clearErrors() {
    form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
    message.replaceChildren();
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    clearErrors();

    const result = Check.register(readForm());
    delete result.errors.username;       // the register form has no username field

    if (Object.keys(result.errors).length > 0) {
      showErrors(result.errors);
      return;
    }

    message.style.color = '#17694A';
    message.textContent = 'Details are valid.';

    // The cleaned values are handed over to the code that saves the patient
    document.dispatchEvent(new CustomEvent('register:valid', { detail: result.values }));
  });
})();