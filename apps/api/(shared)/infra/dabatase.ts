import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCPrABtoAb7zo8HilskMWfQDwhMbmQM0AU",
    authDomain: "next-boilerplate-576d0.firebaseapp.com",
    projectId: "next-boilerplate-576d0",
    storageBucket: "next-boilerplate-576d0.firebasestorage.app",
    messagingSenderId: "786542195136",
    appId: "1:786542195136:web:d6656e8d50b2a2d5ae9825",
    measurementId: "G-7GTD0J4EK3",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default db;
