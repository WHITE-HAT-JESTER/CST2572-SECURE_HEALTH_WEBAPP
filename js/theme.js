
/* Shared theme for the whole website */

let currentTheme =
    localStorage.getItem("hospital-theme") || "light";

// Apply the saved theme to the current page
function applyTheme() {
    document.body.setAttribute("data-theme", currentTheme);

    const icon = document.getElementById("theme-icon");
    const text = document.getElementById("theme-text");
    const button = document.getElementById("theme-toggle");

    // Update the button only if it exists
    if (icon && text && button) {
        if (currentTheme === "dark") {
            
            text.textContent = "White Mode";
        } else {
            
            text.textContent = "Dark Mode";
        }
    }
}

// Change the theme and save it for every page
function toggleTheme() {
    currentTheme =
        currentTheme === "dark" ? "light" : "dark";

    localStorage.setItem("hospital-theme", currentTheme);
    applyTheme();
}

// Apply the saved theme
applyTheme();

// Activate the button only on pages where it exists
const themeButton = document.getElementById("theme-toggle");

if (themeButton) {
    themeButton.addEventListener("click", toggleTheme);
}
 