// firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// --- 1. Firebase config & init ---
const firebaseConfig = {
    apiKey: "AIzaSyCGh3SgU1wHZI-TqRmrUxg0M2LDdPq747Q",
    authDomain: "wedding-website-f633d.firebaseapp.com",
    projectId: "wedding-website-f633d",
    storageBucket: "wedding-website-f633d.firebasestorage.app",
    messagingSenderId: "390342030900",
    appId: "1:390342030900:web:40237aa8fa08acb8887c61",
    measurementId: "G-6EKZT39HLG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Make db available globally
window.db = db;