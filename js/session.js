'use strict';
/* session.js - remembers who is logged in and what each account type may do.

   sessionStorage is used because cookies do not work on file:// in Chrome.
   It is emptied when the tab is closed, which is what we want for a login.

   On a private page:   <script src="../js/session.js"></script>
                        <script>Session.guard('admin');</script>       (in the <head>, before the page is drawn)
   Hide a button:       <button data-needs="deletePatient">Delete</button>
   Log out button:      <button data-logout>Log out</button>                                                  */

const Session = (() => {
  const KEY = 'clinicUser';

  // Change these file names to the names of your pages
  const PAGES = {
    home: 'index.html',
    login: 'login_page.html',
    patient: 'patient_page.html',
    doctor: 'doctor_page.html',
    admin: 'admin_page.html'
  };

  // What each account type is allowed to do (assessment: account types and permissions)
  const PERMISSIONS = {
    patient: ['viewOwnRecord', 'bookAppointment', 'requestPrescription'],
    doctor: ['viewPatients', 'addNote', 'addMedicine'],
    admin: ['addPatient', 'updatePatient', 'deletePatient']
  };

  function current() {                               // the logged-in user, or null
    try { return JSON.parse(sessionStorage.getItem(KEY)); } catch (error) { return null; }
  }

  function start(user) {                             // call after a successful login
    sessionStorage.setItem(KEY, JSON.stringify({ id: user.id, role: user.role, name: user.name }));
    location.href = PAGES[user.role];
  }

  function logout() {
    sessionStorage.removeItem(KEY);
    location.href = PAGES.home;
  }

  // Sends visitors who are not logged in with this account type back to the login page
  function guard(role) {
    const user = current();
    if (!user || user.role !== role) {
      location.replace(`${PAGES.login}?role=${role}`);
      return null;
    }
    return user;
  }

  function can(action) {
    const user = current();
    return !!user && PERMISSIONS[user.role].includes(action);
  }

  // Hides every element marked data-needs="..." that the user is not allowed to use
  function applyPermissions() {
    document.querySelectorAll('[data-needs]').forEach(el => { el.hidden = !can(el.dataset.needs); });
  }

  document.addEventListener('DOMContentLoaded', applyPermissions);
  document.addEventListener('click', event => {
    if (event.target.closest('[data-logout]')) logout();
  });

  return { PAGES, PERMISSIONS, current, start, logout, guard, can, applyPermissions };
})();
