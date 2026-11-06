Hospital Management System

Overview:
This project is a web-based Hospital Management System developed using HTML, CSS, and JavaScript. It supports administrator, doctor, and patient functionalities, including authentication, appointment management, medical records, prescriptions, feedback, and activity logging.

The system uses IndexedDB for storage, AES-256-GCM encryption for protecting sensitive information, and bcrypt for password hashing. You may need to wait for a few seconds when you open the website, until the indexed db has been seeded

Requirements:
The following dependencies are required:
bcrypt.js - Password hashing and verification.
DOMPurify - Input sanitisation and XSS protection.
Internet Connection - Required to fetch JSON data (e.g., doctors and patients) from GitHub repositories.

Running the Project:
Open the project folder in Visual Studio Code.
Install the Live Server extension.
Right-click index.html and select Open with Live Server.

Security Features:
AES-256-GCM encryption for sensitive patient data.
bcrypt hashing with a cost factor of 12 for passwords.
Role-based access control for Admin, Doctor, and Patient accounts.
Session management and secure logout functionality.
Database Entities

The IndexedDB database includes:
Admin
Doctor
Doctor Credentials
Patient
Patient Credentials
Appointments
Medical Records
Medicines
Feedback
Activity Logs

Note: 
Clearing browser storage may remove locally stored sessions and encryption keys.