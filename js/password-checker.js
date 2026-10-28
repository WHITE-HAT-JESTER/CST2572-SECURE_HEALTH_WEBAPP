
const password = document.getElementById("password");
const confirmPassword = document.getElementById("confirmPassword");

const strengthBar = document.getElementById("strength-bar");
const strengthText = document.getElementById("strength-text");
const matchMessage = document.getElementById("password-match");

// Check each password requirement
function checkPassword() {
    const value = password.value;

    const rules = {
        "rule-length": value.length >= 8,
        "rule-upper": /[A-Z]/.test(value),
        "rule-lower": /[a-z]/.test(value),
        "rule-number": /[0-9]/.test(value),
        "rule-symbol": /[^\w\s]/.test(value)
    };

    let score = 0;

    for (const id in rules) {
        const item = document.getElementById(id);
        const passed = rules[id];

        if (passed) {
            score++;
            item.textContent = "✓ " + item.textContent.slice(2);
            item.classList.add("rule-passed");
        } else {
            item.textContent = "✗ " + item.textContent.slice(2);
            item.classList.remove("rule-passed");
        }
    }

    // Update strength bar
    strengthBar.style.width = (score * 20) + "%";

    if (value.length === 0) {
        strengthText.textContent = "Enter a password";
        strengthBar.className = "strength-bar";
    } else if (score <= 2) {
        strengthText.textContent = "Weak password";
        strengthBar.className = "strength-bar strength-weak";
    } else if (score <= 4) {
        strengthText.textContent = "Medium password";
        strengthBar.className = "strength-bar strength-medium";
    } else {
        strengthText.textContent = "Strong password";
        strengthBar.className = "strength-bar strength-strong";
    }

    checkMatch();
}

// Check whether both passwords match
function checkMatch() {
    if (confirmPassword.value === "") {
        matchMessage.textContent = "";
        confirmPassword.setCustomValidity("");
    } else if (password.value === confirmPassword.value) {
        matchMessage.textContent = "✓ Passwords match";
        matchMessage.style.color = "#17694A";
        confirmPassword.setCustomValidity("");
    } else {
        matchMessage.textContent = "✗ Passwords do not match";
        matchMessage.style.color = "#B3261E";
        confirmPassword.setCustomValidity("Passwords do not match");
    }
}

password.addEventListener("input", checkPassword);
confirmPassword.addEventListener("input", checkMatch);

// Check initial state
checkPassword();
 