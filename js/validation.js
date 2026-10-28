'use strict';
/* validation.js - checks and cleans what the user types.

   Why JavaScript: the HTML rules (required, pattern...) can be removed with the browser tools,
   so the code must check again. This file does not touch the page, so it is easy to test.

   Use:  const result = Check.register(data);   // data = what the form contains
         result.ok       true / false
         result.errors   { fieldName: 'message' }
         result.values   the cleaned values, ready to be saved */

const Check = (() => {

  /* ---------- Cleaning ---------- */

  // Input: removes the characters used to inject HTML or scripts, and extra spaces
  const clean = text => String(text ?? '').replace(/[<>"`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100);

  // Output: use it when you write data with innerHTML (textContent does not need it)
  const escapeHtml = text => String(text ?? '').replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- One rule at a time (true = valid) ---------- */

  const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  const isUsername = v => /^[A-Za-z0-9_.-]{3,20}$/.test(v);
  const isName = v => /^\p{L}[\p{L} '.-]{0,48}$/u.test(v);        // letters, space, ' . -  (O'Crigan is fine)
  const isPhone = v => /^\+?[0-9 -]{7,20}$/.test(v);              // real numbers go up to 17 characters
  const isNhs = v => /^\d{10}$/.test(v);

  function isPastDate(iso) {                                       // iso = yyyy-mm-dd
    const date = new Date(iso);
    return /^\d{4}-\d{2}-\d{2}$/.test(iso) && !isNaN(date) && date <= new Date() && date.getFullYear() >= 1900;
  }

  // Returns the rules the password breaks (empty list = strong enough)
  function passwordProblems(password) {
    const problems = [];
    if (password.length < 8) problems.push('at least 8 characters');
    if (!/[a-z]/.test(password)) problems.push('a lower case letter');
    if (!/[A-Z]/.test(password)) problems.push('an upper case letter');
    if (!/\d/.test(password)) problems.push('a digit');
    if (!/[^\w\s]/.test(password)) problems.push('a symbol');
    return problems;
  }

  /* ---------- Whole forms ---------- */

  function register(data) {
    const v = {
      firstName: clean(data.firstName),
      lastName: clean(data.lastName),
      username: clean(data.username).toLowerCase(),
      email: clean(data.email).toLowerCase(),
      telephone: clean(data.telephone),
      dob: clean(data.dob),
      nhs: clean(data.nhs).replace(/\s/g, ''),
      address: clean(data.address),
      password: data.password ?? ''                                // a password is never changed
    };
    const errors = {};
    if (!isName(v.firstName)) errors.firstName = 'Enter a valid first name';
    if (!isName(v.lastName)) errors.lastName = 'Enter a valid last name';
    if (!isUsername(v.username)) errors.username = 'Username: 3 to 20 letters, digits, _ . or -';
    if (!isEmail(v.email)) errors.email = 'Enter a valid email address';
    if (!isPhone(v.telephone)) errors.telephone = 'Enter a valid telephone number';
    if (!isPastDate(v.dob)) errors.dob = 'Enter a valid date of birth';
    if (!isNhs(v.nhs)) errors.nhs = 'The NHS number has 10 digits';
    if (v.address.length < 5) errors.address = 'Enter your address';
    const missing = passwordProblems(v.password);
    if (missing.length) errors.password = 'The password needs ' + missing.join(', ');
    if (v.password !== data.confirmPassword) errors.confirmPassword = 'The passwords do not match';
    return { ok: Object.keys(errors).length === 0, errors, values: v };
  }

  function login(data) {
    const v = {
      username: clean(data.username).toLowerCase(),
      email: clean(data.email).toLowerCase(),
      password: data.password ?? ''
    };
    const errors = {};
    if (!v.username) errors.username = 'Enter your username';
    if (!isEmail(v.email)) errors.email = 'Enter a valid email address';
    if (!v.password) errors.password = 'Enter your password';
    return { ok: Object.keys(errors).length === 0, errors, values: v };
  }

  return { clean, escapeHtml, isEmail, isUsername, isName, isPhone, isNhs, isPastDate, passwordProblems, register, login };
})();
 