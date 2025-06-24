import React, { useState } from 'react';
import { Text, View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CustomButton = ({ title, onPress, style }) => (
  <TouchableOpacity onPress={onPress} style={[styles.button, style]}>
    <Text style={styles.buttonText}>{title}</Text>
  </TouchableOpacity>
);

export default function RegisterScreen() {
  const navigation = useNavigation();
  const [hello, setHello] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword1, setRegisterPassword1] = useState('');
  const [registerPassword2, setRegisterPassword2] = useState('');
  const [step, setStep] = useState(1);
  const [code, setCode] = useState('');

  const handleRegister = async () => {
    try {
      await axios.post('http://127.0.0.1:8000/api/register/', {
        email: registerEmail,
        username: registerUsername,
        password1: registerPassword1,
        password2: registerPassword2,
      });
      setStep(2);
      setHello('Check your email for the verification code.');
    } catch (err) {
      setHello('Registration failed');
    }
  };

  const handleVerify = async () => {
    try {
      const res = await axios.post('http://127.0.0.1:8000/api/verify/', {
        username: registerUsername,
        code: code,
      });
      if (res.status === 200 && res.data && res.data.key) {
        await AsyncStorage.setItem('authToken', res.data.key);
        setHello('');
        navigation.replace('Home');
      } else {
        setHello('Verification failed');
      }
    } catch (err) {
      setHello('Verification failed');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Register</Text>
      {step === 1 ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Email"
            autoCapitalize="none"
            value={registerEmail}
            onChangeText={setRegisterEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Username"
            autoCapitalize="none"
            value={registerUsername}
            onChangeText={setRegisterUsername}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry
            value={registerPassword1}
            onChangeText={setRegisterPassword1}
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            secureTextEntry
            value={registerPassword2}
            onChangeText={setRegisterPassword2}
          />
          <CustomButton title="Sign Up" onPress={handleRegister} />
        </>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="Enter verification code"
            autoCapitalize="none"
            value={code}
            onChangeText={setCode}
          />
          <CustomButton title="Verify" onPress={handleVerify} />
        </>
      )}
      <CustomButton title="Go to Login" onPress={() => navigation.replace('Login')} style={{ backgroundColor: '#6c757d' }} />
      <Text style={{ marginTop: 20 }}>{hello}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  input: { width: 250, borderWidth: 1, borderColor: '#ccc', padding: 8, margin: 5, borderRadius: 5 },
  header: { fontWeight: 'bold', marginTop: 20, marginBottom: 5 },
  button: { backgroundColor: '#007bff', padding: 10, borderRadius: 5, margin: 5, width: 250, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' }
});
