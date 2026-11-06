     
// AUTHENTICATION CONFIGURATION
const LOGIN_PAGE = "login_page.html";

// Object Stores for credentials and profiles according to role
const LOGIN_STORES = {
    patient: {
        credStore: "patientsCred",
        profileStore: "patients"
    },

    doctor: {
        credStore: "doctorsCred",
        profileStore: "doctors"
    },

    admin: {
        credStore: "admins",
        profileStore: null
    }
};

// Home pages for each role
const ROLE_HOME_PAGES = {
    patient: "patient_page.html",
    doctor: "doctor_page.html",
    admin: "admin_page.html"
};

// Valid Roles
const VALID_ROLES = ["patient", "doctor", "admin"];

     
// HELPER FUNCTIONS
     

// Check whether a value is empty
const isBlank = (v) =>
v === undefined ||
v === null ||
String(v).trim() === "";

// Normalize email / username
const normEmail = (v) =>
String(v ?? "").trim().toLowerCase();

// Normalize NHS number
const normNHS = (v) =>
String(v ?? "").replace(/[\s-]/g, "");

// Normalize phone number
const normPhone = (v) =>
String(v ?? "").replace(/[\s()-]/g, "");

     
// CREDENTIAL RETRIEVAL
     

// Retrieve credentials using email or username
async function getCredentialByLogin(storeName, login) {
    const wanted = normEmail(login);

    if (!wanted) return null;

    // Admin primary-key lookup
    if (storeName === "admins") {
        const admin = await findRecord(storeName, wanted);
        if (admin) return admin;
    }

    // Try searching through available indexes
    const indexes = ["email", "username", "id"];

    for (const indexName of indexes) {
        try {
            const hit = await findByIndex(
                storeName,
                indexName,
                wanted
            );
            if (hit) return hit;

        } catch (error) {

            // Ignore missing indexes and continue to fallback
            if (error.name === "NotFoundError") {
                console.warn(
                    `Index "${indexName}" not found in "${storeName}".`
                );
                continue;
            }

            throw error;
        }
    }

    // Fallback: Search all credentials
    const all = await getAllRecords(storeName);
    const credential = all.find((c) => {
        return [
            "email",
            "Email",
            "username",
            "Username"
        ].some((field) => normEmail(c[field]) === wanted);

    });

    return credential || null;
 

}

     
// USER PROFILE RETRIEVAL
     

// Retrieve user using primary key
async function getUserByKey(storeName, key) {
    const recordFound = await findRecord(storeName, key);
    return recordFound || null;

}

     
// PASSWORD TIMING PROTECTION
     

// Used when a username does not exist.
// Performs a dummy password verification to reduce timing differences.

let dummyHashPromise = null;

async function burnPasswordCheck(password) {
    try {

        if (!dummyHashPromise) {
            dummyHashPromise = hashPassword(
                crypto.randomUUID()
            );
        }

        await verifyPassword(
            password,
            await dummyHashPromise
        );

    } catch (error) {
        console.error("Dummy password check failed:", error);
    }
 
}

     
// LOGIN FUNCTION

async function loginUser(username, password, chosenRole) {
    // Normalize login identifier
    username = normEmail(username);

    // Validate input
    if (!username || !password) {

        return {
            success: false,
            message: "Please enter your username and password."
        };

    }

    // Generic authentication failure
    const FAIL = {
        success: false,
        message: "Invalid username or password."
    };

    // Validate selected role
    if (!Object.hasOwn(LOGIN_STORES, chosenRole)) {

        return FAIL;

    }

    const {
        credStore,
        profileStore
    } = LOGIN_STORES[chosenRole];

    try {
        // Wait until database initialization completes
        await dbReady;

        // STEP 1: Retrieve credentials
        const cred = await getCredentialByLogin(
            credStore,
            username
        );
        
        // STEP 2: Check whether credentials exist
        if (!cred) {
            await burnPasswordCheck(password);
            return FAIL;
        }

        // STEP 3: Verify password
        if (!cred.passwordHash) {
            console.error("Credential record has no passwordHash.");
            return FAIL;
        }

        const passwordValid = await verifyPassword(
            password,
            cred.passwordHash
        );

        if (!passwordValid) {
            return FAIL;
        }

        // STEP 4: Retrieve user ID
        let userId;
        if (chosenRole === "admin") {
            // Admin credentials
            userId = cred.username || cred.id || username;
        } else {
            // Patient / Doctor credentials
            userId = cred.id;

            if (userId === undefined || userId === null) {
                console.error("Credential record has no user ID.");
                return FAIL;
            }

            // STEP 5: Verify corresponding user profile
            const profile = await getUserByKey(
                profileStore,
                userId
            );

            if (!profile) {
                console.error(
                    `Profile not found for ${chosenRole}:`,
                    userId
                );
                return FAIL;

            }
        }
        
        // STEP 6: Create authenticated session
        const sessionCreated = await saveSession(
            userId,
            username,
            chosenRole
        );

        if (!sessionCreated) {
            return {
                success: false,
                message: "Could not start your session. Try again."
            };

        }

        // Step 7: Add login log to DB
        activityLogMessage = `User ${username} logged in as ${chosenRole}.`;
        await addActivityLog(chosenRole, userId, activityLogMessage);

        
        // STEP 8: Return successful authentication
        return {
            success: true,
            message: "Login successful."
        };

    } catch (error) {
        console.error("Login error:", error);
        return {
            success: false,
            message: "An error occurred during login."
        };
    }
}

// Password and Medicine Message Rendering
const passwordError = document.getElementById("passwordError");
const medicineError = document.getElementById("medicineError");
const medicineSuccess = document.getElementById("medicineSuccess");

function renderPasswordError(message) {
    if (passwordError) {
        passwordError.textContent = message;
    }
}

function renderMedicineError(message) {
    if (medicineError) {
        medicineError.textContent = message;
    }
}

function renderMedicineSuccess(message) {
    if (medicineSuccess) {
        medicineSuccess.textContent = message;
    }
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

function checkPasswordStrength(password) {
    const problems = passwordProblems(password);
    if (problems.length === 0) {
        return "Strong password.";
    }
    return `Password is weak. Please improve it by adding: ${problems.join(', ')}.`;
}

async function getPatientCred(storeName, userID) {
    const cred = await findRecord(storeName, userID);
    return cred
}

async function checkOldPassword(storeName, userId, oldPassword) {
    const storedKey = localStorage.getItem("storedKey");
    
    const cred = await getPatientCred(
        storeName,
        userId
    );
    
    const verifiedPassword = await verifyPassword(oldPassword, cred.passwordHash)

    if (verifiedPassword) {
        console.log("Old Password is Correct!");
        return true;
    } else {
        return null
    }
}


// PASSWORD CHANGER AND PASSWORD MATCH VERIFICATION
async function changePassword(storeName, userId, oldPassword, newPassword, confirmPassword) {

    if (!oldPassword || !newPassword || !confirmPassword) {
        console.log("FAILED: Missing password fields");
        renderPasswordError("Please fill in all password fields.");
        return false;
    }

    if (newPassword !== confirmPassword) {
        console.log("FAILED: Passwords do not match");
        renderPasswordError("New password and confirmation do not match.");
        return false;
    }

    const result = checkPasswordStrength(newPassword);

    const OldPasswordMatch = await checkOldPassword(
        "patientsCred",
        userId,
        oldPassword
    );

    if (!OldPasswordMatch) {
        console.log("FAILED: Old password incorrect");
        renderPasswordError("Old password is incorrect.");
        return false;
    }

    const cred = await getPatientCred("patientsCred", userId);

    if (!cred) {
        console.log("FAILED: Could not retrieve credentials");
        renderPasswordError("User credentials could not be retrieved.");
        return false;
    }

    const patientEmail = cred.email;

    if (result === "Strong password.") {

        const completeChanged = await changeUserPassword(
            storeName,
            userId,
            patientEmail,
            newPassword
        );

        return completeChanged;

    } else {
        console.log("FAILED: Password strength condition not met.");
        renderPasswordError(result);
        return false;
    }
}


     
// SESSION CONFIGURATION   

const SESSION_KEYS = {
    userId: "sess_uid",
    username: "sess_uname",
    role: "sess_role",
    key: "sess_key"
};

// Each field has its own encryption context (AAD)
const SESSION_CTX = {
    userId: "session:userId",
    username: "session:username",
    role: "session:role"
};

     
// SESSION ENCRYPTION
     

// Create a fresh session key
async function createSessionKey() {
    const key = await generateKey();

    sessionStorage.setItem(
        SESSION_KEYS.key,
        await exportKey(key)
    );

    return key;
}

// Retrieve session key
async function loadSessionKey() {
    const stored = sessionStorage.getItem(
        SESSION_KEYS.key
    );

    if (!stored) {
        throw new Error("No session key found");
    }
    return await importKey(stored);
}

// Encrypt session values
async function encryptValue(plainText, key, context = "") {
    return await encrypt(
        String(plainText),
        key,
        context
    ); 
}

// Decrypt session values
async function decryptValue(cipherText, key, context = "") {
    return await decrypt(
        cipherText,
        key,
        context
    );
}

     
// SAVE SESSION
    
async function saveSession(userId, username, role) {
    // Validate role
    if (!VALID_ROLES.includes(role)) {
        console.error(
            `saveSession: unknown role "${role}"`
        );
        return false;
    }


    // Validate session information
    if (
        userId === undefined ||
        userId === null ||
        userId === "" ||
        !username
    ) {
        console.error(
            "saveSession: missing userId or username"
        );
        return false;
    }


    try {

        // Generate a new session key
        const key = await createSessionKey();


        // Encrypt and store user ID
        sessionStorage.setItem(
            SESSION_KEYS.userId,
            await encryptValue(
                userId,
                key,
                SESSION_CTX.userId
            )
        );


        // Encrypt and store username
        sessionStorage.setItem(
            SESSION_KEYS.username,
            await encryptValue(
                username,
                key,
                SESSION_CTX.username
            )
        );


        // Encrypt and store role
        sessionStorage.setItem(
            SESSION_KEYS.role,
            await encryptValue(
                role,
                key,
                SESSION_CTX.role
            )
        );


        return true;

    } catch (error) {

        console.error(
            "saveSession failed:",
            error
        );
        clearSession();
        return false;
    }
}

     
// GET SESSION
     

async function getSession() {

    const encId = sessionStorage.getItem(
        SESSION_KEYS.userId
    );

    const encName = sessionStorage.getItem(
        SESSION_KEYS.username
    );

    const encRole = sessionStorage.getItem(
        SESSION_KEYS.role
    );


    // Check whether session information exists
    if (!encId || !encName || !encRole) {

        return null;

    }


    try {

        const key = await loadSessionKey();


        // Decrypt session information
        const userId = await decryptValue(
            encId,
            key,
            SESSION_CTX.userId
        );

        const username = await decryptValue(
            encName,
            key,
            SESSION_CTX.username
        );

        const role = await decryptValue(
            encRole,
            key,
            SESSION_CTX.role
        );


        // Validate decrypted information
        if (
            userId === undefined ||
            userId === null ||
            userId === "" ||
            !username ||
            !VALID_ROLES.includes(role)
        ) {

            clearSession();

            return null;

        }


        return {
            userId,
            username,
            role
        };


    } catch (error) {

        console.error(
            "getSession: could not decrypt session. Clearing it.",
            error
        );

        clearSession();

        return null;

    }
    
}

     
// ACCESS CONTROL
     

async function requireRole(allowedRoles) { 
    const roles = Array.isArray(allowedRoles)
        ? allowedRoles
        : [allowedRoles];

    const session = await getSession();

    // No active session
    if (!session) {
        console.log("No session found.");
        redirectToHome();
        return null;

    }

    // User does not have permission
    if (!roles.includes(session.role)) {
        console.log("Role mismatch.");
        console.log("User role:", session.role);
        console.log(
            "Redirect target:",
            ROLE_HOME_PAGES[session.role]
        );
        redirectToRoleHome(session.role);
        return null;

    }
    return session;
}

     
// CONVENIENCE ACCESS FUNCTIONS
     

const requireAdmin = () =>
requireRole("admin");

const requireDoctor = () =>
requireRole("doctor");

const requirePatient = () =>
requireRole("patient");

     
// CHECK USER ROLE
     

async function hasRole(allowedRoles) {
    const roles = Array.isArray(allowedRoles)
        ? allowedRoles
        : [allowedRoles];

    const session = await getSession();

    return !!session && roles.includes(session.role);
}

     
// REDIRECTION FUNCTIONS
     

// Redirect users who are already logged in
async function redirectIfLoggedIn() {
    const session = await getSession();

    if (session) {
        redirectToRoleHome(session.role);
    }

}

// Redirect to home page
function redirectToHome() { 
    window.location.replace("index.html");
}

// Redirect to the appropriate role homepage
function redirectToRoleHome(role) {
    window.location.replace(
        ROLE_HOME_PAGES[role] || LOGIN_PAGE
    );
}

// LOGOUT


// Remove authentication-related session information
function clearSession() {
    Object.values(SESSION_KEYS).forEach((key) => {sessionStorage.removeItem(key); });
}

// Logout and redirect
async function logout() { 
    const session = await getSession();

    if (session) {
    activityLogMessage = `User ${session.username} logged out.`;

    await addActivityLog(session.role, session.userId, activityLogMessage); 
    } 

    clearSession();
    redirectToHome();
}

// LOGOUT EVENT LISTENER

// Guard against pages without the hospital logo
document.getElementById("hosp-logo")?.addEventListener("click", (event) => {
    event.preventDefault();
    logout();
});


// Guard against pages without the hospital logo
document.getElementById("logout-btn")?.addEventListener("click", (event) => {
    event.preventDefault();
    logout();
});