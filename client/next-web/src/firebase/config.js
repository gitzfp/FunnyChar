// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";

// const firebaseConfig = {
//   apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
//   authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
//   projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
//   storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
//   appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
//   measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
// };

const firebaseConfig = {
  apiKey: "AIzaSyCf8ROnYUah-HXe-jqYt8fjP6QditGuo2s",
  authDomain: "character-speak.firebaseapp.com",
  projectId: "character-speak",
  storageBucket: "character-speak.appspot.com",
  messagingSenderId: "1049458837614",
  appId: "1:1049458837614:web:68f41f0f329d41fff0fe7f",
  measurementId: "G-22JHKCXELB"
};


// Initialize Firebase
let firebase_app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export default firebase_app;
