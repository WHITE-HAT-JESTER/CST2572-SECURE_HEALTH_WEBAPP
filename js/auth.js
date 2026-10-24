const SESSION_KEY = "userSession";
const ENCRYPTION_KEY = "sessionEncryptionKey";

//Convert bytes to Base 64
function toBase64 (bytes) {
    return btoa(String.fromCharCode(...bytes));
}

//Convert Base64 to bytes
function fromBase64(value) {
    return Uint8Array.from(atob(value), c => c.charCodeAt(0));
}

//Generate or retrieve the session encryption key
async function getEncryptionKey () {
    let storedKey = sessionStorage.getItem(ENCRYPTION_KEY);

    if (storedKey) {
        return crypto.subtle.importKey(
            "raw",
            fromBase64(storedKey),
            "AES-GCM",
            false,
            ["encrypt", "decrypt"]
        );
    }

    const key = await crypto.subtle.generateKey(
        {name: "AES-GCM", length: 256},
        true,
        ["encrypt", "decrypt"]
    );

    const rawKey = await crypto.subtle.exportKey("raw", key)

    sessionStorage.setItem(
        ENCRYPTION_KEY, toBase64(new Uint8Array(rawKey))
    );

    return crypto.subtle.importKey(
        "raw",
        rawKey,
        "AES-GCM",
        false,
        ["encrypt", "decrypt"]
    );
}

// Encrypt and store the session
async function loginUser(user) {
    const session = {
        userId: user.id,
        role: user.role,
        loggedIn: true,
        expiresAt: Date.now() + 30 * 60 * 1000
    };

    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        new TextEncoder().encode(JSON.stringify(session))
    );

    sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
            iv: toBase64(iv),
            data: toBase64(new Uint8Array(encrypted))
        })
    );
}

// Decrypt and verify the session
async function getSession() {
    try {
        const stored = sessionStorage.getItem(SESSION_KEY);

        if (!stored) return null;

        const encryptedSession = JSON.parse(stored);
        const key = await getEncryptionKey();

        const decrypted = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: fromBase64(encryptedSession.iv)
            },
            key,
            fromBase64(encryptedSession.data)
        );

        const session = JSON.parse(
            new TextDecoder().decode(decrypted)
        );

        if (
            session.loggedIn !== true ||
            !["admin", "doctor", "patient"].includes(session.role) ||
            !Number.isFinite(session.expiresAt) ||
            session.expiresAt <= Date.now()
        ) {
            logoutUser();
            return null;
        }

        return session;
    } catch {
        // Modified data or invalid encryption: reject the session
        logoutUser();
        return null;
    }
}

// Restrict access to specified roles
async function restrictPage(allowedRoles) {
    const session = await getSession();

    if (!session) {
        window.location.replace("login_page.html");
        return false;
    }

    if (!allowedRoles.includes(session.role)) {
        window.location.replace("login_page.html");
        return false;
    }

    return true;
}

// Display navigation links based on role
async function displayRoleLinks() {
    const session = await getSession();

    if (!session) {
        window.location.replace("login_page.html");
        return;
    }

    document.querySelectorAll("[data-roles]").forEach(element => {
        const roles = element.dataset.roles
            .split(",")
            .map(role => role.trim());

        element.hidden = !roles.includes(session.role);
    });
}

// Clear the session
function logoutUser() {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(ENCRYPTION_KEY);
    window.location.replace("login_page.html");
}