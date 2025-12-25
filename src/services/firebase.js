import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';


const firebaseConfig = {
  apiKey: "AIzaSyAEbRqbnqonvBSKVsjblaHMCbZfUAB9gL0",
  authDomain: "befit-3a7ca.firebaseapp.com",
  projectId: "befit-3a7ca",
  storageBucket: "befit-3a7ca.firebasestorage.app",
  messagingSenderId: "44764302316",
  appId: "1:44764302316:web:c959737ad695b6f2690f99"
};


const app = initializeApp(firebaseConfig);


const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});


const db = getFirestore(app);


const storage = getStorage(app);

export { auth, db, storage };
export default app;