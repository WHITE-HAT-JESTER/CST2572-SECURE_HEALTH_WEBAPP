//Login a user
function login(user) {
    sessionStorage.setItem("userID", user.userID);
    sessionStorage.setItem("username", user.username);
    sessionStorage.setItem("role", user.role);

    console.log(`User ${user.username} logged in as ${user.role}`);
}

//Logout a User
function logout () {
    sessionStorage.clear();
    console.log("User logged out");
}

//Check if a user is logged in
function isLoggedIn () {
    return sessionStorage.getItem("userID") !== null;
}

//Get current user
function getCurrentUser () {
    return {
        userID: sessionStorage.getItem("userID"),
        username: sessionStorage.getItem("username"),
        role: sessionStorage.getItem("role")
    };
}

//Restrict Access by Role
function hasRole () {
    const user = getCurrentUser();

    if (!user || !user.role) {
        return false;
    }

    return allowedRoles.includes(user.role);
}

//Require admin role
function requireAdmin () {
    if (!hasRole("Admin")) {
        alert("Access Denied!");
        window.location.href = "login_page.html"
    }
}

function requirePatient () {
    if (!hasRole("Patient")) {
        alert("Access Denied!");
        window.location.href = "login_page.html";
    }
}

function requireDoctor () {
    if (!hasRole("Doctor")) {
        alert("Access Denied!");
        window.location.href = "login_page.html";
    }
}