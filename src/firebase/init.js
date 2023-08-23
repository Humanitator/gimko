// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAeO0_MiTu01F9ez2z2vbEaSyOxkSjLrmM",
  authDomain: "gimko-3f300.firebaseapp.com",
  projectId: "gimko-3f300",
  storageBucket: "gimko-3f300.appspot.com",
  messagingSenderId: "323393576457",
  appId: "1:323393576457:web:e4f6af2c8d6abfbf3722d8",
  measurementId: "G-39J7C5NKW1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// init firestore database
const db = getFirestore();
export default db