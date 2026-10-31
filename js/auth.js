const LOGIN_PAGE = "login_page.html"

//Login Functions
const LOGIN_STORES = {
  patient: { store: "patients", idField: "patientID" },
  doctor:  { store: "doctors",  idField: "doctorID"  },
  admin:   { store: "admins",   idField: "adminID"   },
};

const ROLE_HOME_PAGES = {
  patient: "patient_page.html",
  doctor: "doctor_page.html",
  admin: "admin_page.html"
}
 

function getUserByKey(storeName, key) {
  return new Promise((resolve) => getRecord(storeName, key, resolve));
}
 
async function loginUser(username, password, chosenRole) {
  username = (username || "").trim();
  if (!username || !password) {
    return { success: false, message: "Please enter your username and password." };
  }
 
  const FAIL = { success: false, message: "Invalid username or password." };
  if (!Object.hasOwn(LOGIN_STORES, chosenRole)) return FAIL; // whitelist the role
  const { store, idField } = LOGIN_STORES[chosenRole];
 
  try {
    await dbReady; // first visit: wait until the database has been seeded
 
    const user = await getUserByKey(store, username);

    console.log("user found:", !!user, "| hash:", user && user.passwordHash);
    if (!user || !(await verifyPassword(password, user.passwordHash))) return FAIL;
 const ok = user ? await verifyPassword(password, user.passwordHash) : false;
console.log("password ok:", ok);
    if (!(await saveSession(user[idField], username, chosenRole))) {
      return { success: false, message: "Could not start your session. Try again." };
    }
    return { success: true, role: chosenRole };
  } catch (err) {
    console.error("loginUser error:", err);
    return { success: false, message: "Something went wrong. Please try again." };
  }
}
 

//Session Storage
//Keys used in the Session Storage
const SESSION_KEYS = {
    userId: "sess_uid",
    username: "sess_uname",
    role: "sess_role",
    key: "sess_key"
};

//Assigning a role according to the Object Store the username was found in:
const VALID_ROLES = ["patient", "doctor", "admin"]

//Creating the session key, exporting it and 
async function createSessionKey() {
    const key = await generateKey();
    const exported = await exportKey(key);
    // If your exportKey returns an object (e.g. a JWK), stringify it:
    const exportedString =
        typeof exported === "string" ? exported : JSON.stringify(exported);
    sessionStorage.setItem(SESSION_KEYS.key, exportedString);
    return key;
}

//Loading the session key from the session storage
async function loadSessionKey() {
  const stored = sessionStorage.getItem(SESSION_KEYS.key);
  if (!stored) throw new Error("No session key found");
  // If your importKey expects an object (e.g. a JWK), parse it first:
  // return await importKey(JSON.parse(stored));
  return await importKey(stored);
}

//Calls the function to encrypt plaintext
async function encryptValue(plainText, key) {
  return await encrypt(String(plainText), key);
}
 
//Calls the function to decrypt plain text
async function decryptValue(cipherText, key) {
  return await decrypt(cipherText, key);
}

//Saving the session with the info. into session storage, while encrypting it by calling the encrypt function
async function saveSession(userId, username, role) {
  if (!VALID_ROLES.includes(role)) {
    console.error(`saveSession: unknown role "${role}"`);
    return false;
  }
 
  try {
    const key = await createSessionKey(); // new key for this login
    sessionStorage.setItem(SESSION_KEYS.userId, await encryptValue(userId, key));
    sessionStorage.setItem(SESSION_KEYS.username, await encryptValue(username, key));
    sessionStorage.setItem(SESSION_KEYS.role, await encryptValue(role, key));
    return true;
  } catch (err) {
    console.error("saveSession failed:", err);
    clearSession();
    return false;
  }
}

//Retrieving a session from session storage with the details
async function getSession() {
  const encId = sessionStorage.getItem(SESSION_KEYS.userId);
  const encName = sessionStorage.getItem(SESSION_KEYS.username);
  const encRole = sessionStorage.getItem(SESSION_KEYS.role);
 
  if (!encId || !encName || !encRole) return null;
 
  try {
    const key = await loadSessionKey();
    const userId = await decryptValue(encId, key);
    const username = await decryptValue(encName, key);
    const role = await decryptValue(encRole, key);
 
    // A decrypted role must be one we recognise, otherwise treat as tampered
    if (!userId || !username || !VALID_ROLES.includes(role)) {
      clearSession();
      return null;
    }
    return { userId, username, role };
  } catch (err) {
    console.error("getSession: could not decrypt session, clearing it.", err);
    clearSession();
    return null;
  }
}
 
/** Only users whose role is in allowedRoles may view the page.
 *  allowedRoles: array like ["admin", "teacher"] or a single string.
 *  Returns the session if allowed; otherwise redirects and returns null. */
async function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const session = await getSession();
 
  if (!session) {
    redirectToHome();
    return null;
  }
 
  if (!roles.includes(session.role)) {
    // Logged in but wrong role: send them to their own dashboard
    redirectToHome();
    return null;
  }
  return session;
}
 
/* Convenience wrappers, one per role */
const requireAdmin = () => requireRole("admin");
const requireDoctor = () => requireRole("doctor");
const requirePatient = () => requireRole("patient");

 
/** Non-redirecting check, handy for showing/hiding UI elements. */
async function hasRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const session = await getSession();
  return !!session && roles.includes(session.role);
}

//Redirect if logged in
async function redirectIfLoggedIn() {
  const session = await getSession();
  if (session) redirectToRoleHome(session.role);
}

//Redirecting to Home Page 
function redirectToHome () {
  window.location.replace("index.html");
}

function redirectToRoleHome(role) {
  window.location.replace(ROLE_HOME_PAGES[role] || LOGIN_PAGE);
}
 
//Removing the session keys
function clearSession() {
  Object.values(SESSION_KEYS).forEach((key) => sessionStorage.removeItem(key));
}
 
// Logs out the user by clearing the session and redirecting 
function logout() {
  clearSession();
  sessionStorage.clear(); // remove anything else left over for this tab
  redirectToHome();
}

document.getElementById("hosp-logo").addEventListener("click", (event) => {
  event.preventDefault();
  logout();
});