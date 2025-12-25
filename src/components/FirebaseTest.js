import React, { useState, useEffect } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import { auth, db } from '../services/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const FirebaseTest = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return unsubscribe;
  }, []);

  const testSignUp = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, 'test@example.com', 'password123');
      Alert.alert('Success', 'User created successfully!');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const testFirestore = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in first');
      return;
    }
    
    try {
      await setDoc(doc(db, 'users', user.uid), {
        name: 'Test User',
        email: user.email,
        createdAt: new Date()
      });
      Alert.alert('Success', 'Data saved to Firestore!');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const testSignOut = async () => {
    try {
      await signOut(auth);
      Alert.alert('Success', 'Signed out successfully!');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Firebase Connection Test</Text>
      <Text>User: {user ? user.email : 'Not signed in'}</Text>
      
      <Button title="Test Sign Up" onPress={testSignUp} />
      <Button title="Test Firestore" onPress={testFirestore} />
      <Button title="Sign Out" onPress={testSignOut} />
    </View>
  );
};

export default FirebaseTest;