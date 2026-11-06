# Hospital Management System

## Overview

A web-based Hospital Management System built with HTML, CSS, and JavaScript. It supports three user roles (administrator, doctor, and patient) and provides:

- Authentication
- Appointment management
- Medical records
- Prescriptions
- Feedback
- Activity logging

Data is stored in the browser using **IndexedDB**. Sensitive information is protected with **AES-256-GCM** encryption, and passwords are hashed with **bcrypt**.

> **Note:** When you first open the website, wait a few seconds while IndexedDB is seeded with initial data.

## Requirements

- **[bcrypt.js](https://github.com/dcodeIO/bcrypt.js)**: password hashing and verification
- **[DOMPurify](https://github.com/cure53/DOMPurify)**: input sanitisation and XSS protection
- **Internet connection**: needed to fetch JSON seed data (e.g. doctors and patients) from GitHub repositories

## Running the Project

1. Open the project folder in Visual Studio Code.
2. Install the **Live Server** extension.
3. Right-click `index.html` and select **Open with Live Server**.

## Security Features

- AES-256-GCM encryption for sensitive patient data
- bcrypt password hashing with a cost factor of 12
- Role-based access control for Admin, Doctor, and Patient accounts
- Session management and secure logout

## Database Entities

The IndexedDB database contains the following stores:

- Admin
- Doctor
- Doctor Credentials
- Patient
- Patient Credentials
- Appointments
- Medical Records
- Prescriptions
- Feedback
- Activity Logs

## Notes

- Clearing browser storage removes locally stored sessions **and encryption keys**. Data that was encrypted with a removed key can no longer be decrypted.