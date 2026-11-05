const LOGIN_PAGE = "login_page.html";

//Object Stores for credentials and profiles according to name
const LOGIN_STORES = {
  patient: { credStore: "patientsCred", profileStore: "patients" },
  doctor:  { credStore: "doctorsCred",  profileStore: "doctors" },
  admin:   { credStore: "admins",       profileStore: null },
};

//Home pages for each role
const ROLE_HOME_PAGES = {
  patient: "patient_page.html",
  doctor: "doctor_page.html",
  admin: "admin_page.html"
};

//Getting the user from object store
function getUserByKey(storeName, key) {
  return findRecord(storeName, key);
}

// Used when a username doesn't exist, so the response takes about as long as
// a real bcrypt check and doesn't reveal which usernames are registered.
// Built only from hashPassword/verifyPassword in encryption.js.
let dummyHashPromise = null;

async function burnPasswordCheck(password) {
  try {
    if (!dummyHashPromise) {
      dummyHashPromise = hashPassword(crypto.randomUUID());
    }
    await verifyPassword(password, await dummyHashPromise);
  } catch {
    /* ignore: this exists only to spend time */
  }
}

//
async function loginUser(username, password, chosenRole) {
  // Normalise the same way you do at registration
  username = (username || "").trim().toLowerCase();

  if (!username || !password) {
    return { success: false, message: "Please enter your username and password." };
  }

  const FAIL = { success: false, message: "Invalid username or password." };

  if (!Object.hasOwn(LOGIN_STORES, chosenRole)) return FAIL;

  const { credStore, profileStore } = LOGIN_STORES[chosenRole];

  try {
    await dbReady;

    const cred = await getUserByKey(credStore, username);

    if (!cred) {
      await burnPasswordCheck(password); // keep timing similar to a real check
      return FAIL;
    }

    if (!(await verifyPassword(password, cred.passwordHash))) return FAIL;

    let userId;
    if (chosenRole === "admin") {
      userId = cred.username || username;
    } else {
      userId = cred.id; // id stored in the credential record
      if (userId === undefined || userId === null) return FAIL;

      // Direct key lookup instead of scanning and decrypting every profile
      const profile = await getUserByKey(profileStore, userId);
      if (!profile) return FAIL;
    }

    if (!(await saveSession(userId, username, chosenRole))) {
      return { success: false, message: "Could not start your session. Try again." };
    }

    return { success: true, message: "Login successful." };

  } catch (error) {
    console.error("Login error:", error);
    return { success: false, message: "An error occurred during login." };
  }
}

//Session Storage of userid, username, role and encyrption key
const SESSION_KEYS = {
  userId: "sess_uid",
  username: "sess_uname",
  role: "sess_role",
  key: "sess_key"
};

//Valid Roles
const VALID_ROLES = ["patient", "doctor", "admin"];

// Each field is bound to its own context (AAD) so values can't be swapped
const SESSION_CTX = {
  userId: "session:userId",
  username: "session:username",
  role: "session:role"
};

// Creates a fresh session key, stores it (exported) and returns it
async function createSessionKey() {
  const key = await generateKey();
  sessionStorage.setItem(SESSION_KEYS.key, await exportKey(key));
  return key;
}

//Get session key from local storage
async function loadSessionKey() {
  const stored = sessionStorage.getItem(SESSION_KEYS.key);
  if (!stored) throw new Error("No session key found");
  return await importKey(stored);
}

//Calling the encrypt function from encryption.js
async function encryptValue(plainText, key, context = '') {
  return await encrypt(String(plainText), key, context);
}

//Calling the decrypt function from encryption.js
async function decryptValue(cipherText, key, context = '') {
  return await decrypt(cipherText, key, context);
}

// Saves the session into sessionStorage, encrypting each field
async function saveSession(userId, username, role) {
  if (!VALID_ROLES.includes(role)) {
    console.error(`saveSession: unknown role "${role}"`);
    return false;
  }

  if (userId === undefined || userId === null || userId === "" || !username) {
    console.error("saveSession: missing userId or username");
    return false;
  }

  try {
    const key = await createSessionKey(); // new key for this login
    sessionStorage.setItem(SESSION_KEYS.userId, await encryptValue(userId, key, SESSION_CTX.userId));
    sessionStorage.setItem(SESSION_KEYS.username, await encryptValue(username, key, SESSION_CTX.username));
    sessionStorage.setItem(SESSION_KEYS.role, await encryptValue(role, key, SESSION_CTX.role));
    return true;
  } catch (err) {
    console.error("saveSession failed:", err);
    clearSession();
    return false;
  }
}

// Reads and decrypts the session; returns { userId, username, role } or null
async function getSession() {
  const encId = sessionStorage.getItem(SESSION_KEYS.userId);
  const encName = sessionStorage.getItem(SESSION_KEYS.username);
  const encRole = sessionStorage.getItem(SESSION_KEYS.role);

  if (!encId || !encName || !encRole) return null;

  try {
    const key = await loadSessionKey();
    const userId = await decryptValue(encId, key, SESSION_CTX.userId);
    const username = await decryptValue(encName, key, SESSION_CTX.username);
    const role = await decryptValue(encRole, key, SESSION_CTX.role);

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

//Access Control
async function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const session = await getSession();

  if (!session) {
    redirectToHome();
    return null;
  }

  if (!roles.includes(session.role)) {
    // Logged in but wrong role: send them to their own dashboard
    redirectToRoleHome(session.role);
    return null;
  }
  return session;
}

//Convenience Functions
const requireAdmin = () => requireRole("admin");
const requireDoctor = () => requireRole("doctor");
const requirePatient = () => requireRole("patient");

//hasRole Function
async function hasRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const session = await getSession();
  return !!session && roles.includes(session.role);
}

//Ridirecting to home page of role if already logged in
async function redirectIfLoggedIn() {
  const session = await getSession();
  if (session) redirectToRoleHome(session.role);
}

//Redirecting to Home Page
function redirectToHome() {
  window.location.replace("index.html");
}

//Redirecting to home page of role or login page
function redirectToRoleHome(role) {
  window.location.replace(ROLE_HOME_PAGES[role] || LOGIN_PAGE);
}

//Logout Functions

//Removing all key items in session storage
function clearSession() {
  Object.values(SESSION_KEYS).forEach((key) => sessionStorage.removeItem(key));
}

// Clears the session and redirects
function logout() {
  clearSession();
  sessionStorage.clear(); 
  redirectToHome();
}

// Guarded so pages without #hosp-logo don't throw and halt the script
document.getElementById("hosp-logo")?.addEventListener("click", (event) => {
  event.preventDefault();
  logout();
});