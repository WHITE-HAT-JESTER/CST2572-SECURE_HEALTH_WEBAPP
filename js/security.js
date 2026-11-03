
'use strict';

// SECURITY.JS
// Central XSS protection using DOMPurify.

// Check if DOMPurify is loaded.
if (typeof DOMPurify === "undefined") {
    throw new Error("DOMPurify has not been loaded!");
}

// Sanitize HTML before inserting untrusted HTML.
function sanitizeHTML(input) {
    return DOMPurify.sanitize(String(input ?? ""), {
        USE_PROFILES: { html: true }
    });
}

// Safely display user-provided text.
// Use this for names, addresses, notes and other plain text.
function displaySafeText(element, value) {
    if (!element) return;

    element.textContent = String(value ?? "");
}

// Safely display HTML when HTML formatting is required.
function displaySafeHTML(element, value) {
    if (!element) return;

    element.innerHTML = sanitizeHTML(value);
}
