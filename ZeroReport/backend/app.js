// import firebase sdk
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, addDoc } from "firebase/firestore";

// your config from firebase console
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyARzeyulL-4c_ATw7NcUP-gsUh2-qE3fNU",
  authDomain: "sigma-app-e9397.firebaseapp.com",
  projectId: "sigma-app-e9397",
  storageBucket: "sigma-app-e9397.firebasestorage.app",
  messagingSenderId: "561606435145",
  appId: "1:561606435145:web:c68e3629ce50215f177a98",
  measurementId: "G-1KG5C55LEB"
};
// init app
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ====== AUTH (signup user) ======
document.getElementById("signup").addEventListener("click", async () => {
  try {
    const userCred = await createUserWithEmailAndPassword(auth, "sigma@chad.com", "123456");
    console.log("User signed up:", userCred.user.email);
  } catch (err) {
    console.error("Signup error:", err.message);
  }
});

// ====== DATABASE (add data) ======
document.getElementById("addData").addEventListener("click", async () => {
  try {
    await addDoc(collection(db, "notes"), {
      text: "Grind never stops 💪",
      date: new Date()
    });
    console.log("Data saved, sigma move.");
  } catch (err) {
    console.error("DB error:", err.message);
  }
});