//Convert a string to and from bytes
const enc = new TextEncoder();
const dec = new TextDecoder();

function toBase64(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromBase64(text) {
    return Uint8Array.from(atob(text), c => c.charCodeAt(0));
}

//Generate a key
async function generateKey() {
    return await crypto.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 256
        },
        true,
        ["encrypt", "decrypt"]
    );
}

//Encrypt
async function encrypt(text, key, context='') {
    //Generate a random 12-byte iv. AES-GCM needs a unique iv for every encryption with the same key
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const cipher = await crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv,
            additionalData: enc.encode(context) 
        },
        key, 
        enc.encode(String(text))
    );

    return toBase64(iv) + '.' + toBase64(cipher);
}

//Decrypt
async function decrypt(stored, key, context = '') {
    const [ivPart, dataPart] = stored.split('.');

    try {
        const plain = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: fromBase64(ivPart),
                additionalData: enc.encode(context)
            },
            key,
            fromBase64(dataPart)
        );

        return dec.decode(plain);
    } catch {
        throw new Error('Decryption failed!')
    }
}

//Export the key
async function exportKey(key) {
    const raw = await crypto.subtle.exportKey("raw", key);

    return btoa(
        String.fromCharCode(...new Uint8Array(raw))
    );
}

//Import the key
async function importKey(base64Key) {
    const raw = Uint8Array.from(
        atob(base64Key),
        c => c.charCodeAt(0)
    );

    return await crypto.subtle.importKey(
        "raw",
        raw.buffer,
        { name: "AES-GCM" },
        true,
        ["encrypt", "decrypt"]
    );
}

async function initialiseEncryptionKey(){
    let keyString = localStorage.getItem("storedKey");

    if (!keyString) {
        const key = await generateKey();
        keyString = await exportKey(key);

        localStorage.setItem("storedKey", keyString);
    }

    return keyString;
}

//Password Hashing using Bcrypt
const BCRYPT_SRC = '/lib/bcryptjs/umd/index.js';
const BCRYPT_COST = 12;

let bcryptPromise = null;

function getBcrypt() {
    if (!bcryptPromise) {
        bcryptPromise = new Promise((resolve, reject) => {
            const existing = window.bcrypt || (window.dcodeIO && window.dcodeIO.bcrypt);
            if (existing) return resolve(existing);

            const script = document.createElement('script');
            script.src = BCRYPT_SRC
            script.onload = () => {
                const lib = window.bcrypt || (window.dcodeIO && window.dcodeIO.bcrypt);
                lib ? resolve(lib) : reject(new Error('bcrypt loaded but global not found!'));
            };
            script.onerror = () => reject(new Error('Could not load ' + BCRYPT_SRC));
            document.head.appendChild(script);
        }).catch(err => { bcryptPromise = null; throw err; });
    }

    return bcryptPromise;
}

async function prepPassword(password) {
    const digest = await crypto.subtle.digest(
        'SHA-256',
        enc.encode(password.normalize('NFKC'))
    );

    return toBase64(digest);
}

//Hash the Password
async function hashPassword(password) {
        if (typeof password !== 'string' || password.length === 0 || password.length > 1024) {
        throw new Error('Invalid Password!');
    }
    const bcrypt = await getBcrypt();
    return await bcrypt.hash(await prepPassword(password), BCRYPT_COST);
}

async function verifyPassword(password, storedHash) {
    try {
        if (typeof password !== 'string' || password.length === 0 || password.length > 1024) {
            return false;
        }
        const bcrypt = await getBcrypt();
        return await bcrypt.compare(await prepPassword(password, storedHash), storedHash);
    } catch (err) {
        console.error("Verify password error", err);
        return false;
    }
    
}
