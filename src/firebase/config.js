// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
   apiKey: "AIzaSyDCjugBOc6aPvRdM8Rcsq2TL43CK2BRk50",
  authDomain: "vidhansabha-b1c54.firebaseapp.com",
  databaseURL: "https://vidhansabha-b1c54-default-rtdb.firebaseio.com",
  projectId: "vidhansabha-b1c54",
  storageBucket: "vidhansabha-b1c54.firebasestorage.app",
  messagingSenderId: "167206587699",
  appId: "1:167206587699:web:a67f12bfd9c46086630246",
  measurementId: "G-6H0L59Q17F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const database = getDatabase(app);
export const firestore = getFirestore(app);
export const storage = getStorage(app);
export default app;
