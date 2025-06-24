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

export default function LoginScreen() {
  const navigation = useNavigation();
  const [hello, setHello] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const res = await axios.post('http://127.0.0.1:8000/api/login/', {
        username: email,
        password,
      });
      if (res.status === 200 && res.data && res.data.key) {
        await AsyncStorage.setItem('authToken', res.data.key);
        setHello('');
        navigation.replace('Home');
      } else if (res.data && res.data.error === 'User not verified') {
        setHello('Please verify your email before logging in.');
      } else {
        setHello('Login failed');
      }
    } catch (err) {
      setHello('Login failed');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Manual Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Email or Username"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <CustomButton title="Sign In" onPress={handleLogin} />
      <CustomButton title="Go to Register" onPress={() => navigation.replace('Register')} style={{ backgroundColor: '#6c757d' }} />
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
