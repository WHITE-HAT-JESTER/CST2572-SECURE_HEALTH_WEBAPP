//Generate a brand new random 256-bit AES key
async function generateKey() {
    return crypto.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 256
        },
        true,
        ["encrypt", "decrypt"]
    );
}

//Encrypt a text using this key
async function encryptText(text, key) {
    //Generate a random 12-byte iv. AES-GCM needs a unique iv for every encryption with the same key
    const iv = crypto.getRandomValues(new Uint8Array(12));

    //Converting the text into binary data
    const encodedText = new TextEncoder().encode(text);

    //Encrypt the bytes using AES-GCM, the iv and the secret key
    const encrypted = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        key,
        encodedText
    );

    //Return the iv and encrypted data in an easy-to-store format
    return {
        iv: Array.from(iv), //Converts the iv bytes into a normal array
        encryptedData: Array.from(new Uint8Array(encrypted)) //Convert the encrypted bytes into normal array too
    };
}

//Decrypt the encrypted message using the same key
async function decryptText(encryptedData, key) {
    //Rebuild the iv
    const iv = new Uint8Array(encryptedData.iv);

    //Rebuild the encrypted bytes from their stored array
    const data = new Uint8Array(encryptedData.encryptedData);

    //Decrypt the data suing the same AES-GCM key and iv
    const decrypted = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        key,
        data
    );

    return new TextDecoder.decode(decrypted);
}

//Encrypt Patient Info
async function encryptPatientInfo (patient) {
    const data = {
        NHS: patient.nhs,
        title: patient.title,
        first: patient.first,
        last: patient.last,
        dob: patient.dob,
        gender: patient,gender,
        address: patient.address,
        email: patient.email,
        telephone: patient.telephone
    };

    const patientJSON = JSON.stringify(data);

    encryptedPatient = await encryptText(patientJSON, key);
}

//Decrypt Patient Info
async function decryptPatientInfo (patientJSON) {
    const decryptedPatient = await decryptPatientInfo(patientJSON, key)
    const patient = JSON.parse(decryptedPatient);
    return patient
}