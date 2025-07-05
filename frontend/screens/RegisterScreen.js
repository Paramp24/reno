import React, { useState, useEffect, useContext } from 'react';
import { Text, View, TextInput, StyleSheet, TouchableOpacity, Switch, ScrollView, Alert } from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import for Google Auth
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

// Import AuthContext
import { AuthContext } from '../App';

const CustomButton = ({ title, onPress, style, selected }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      styles.choiceButton,
      selected ? styles.choiceButtonSelected : {},
      style,
    ]}
  >
    <Text style={[styles.choiceButtonText, selected ? { color: '#fff' } : {}]}>{title}</Text>
  </TouchableOpacity>
);

WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen() {
  const navigation = useNavigation();
  const authContext = useContext(AuthContext);
  const [hello, setHello] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword1, setRegisterPassword1] = useState('');
  const [registerPassword2, setRegisterPassword2] = useState('');
  const [step, setStep] = useState(1);
  const [code, setCode] = useState('');
  const [isBusinessOwner, setIsBusinessOwner] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState([]);
  const [services, setServices] = useState([]);
  const [industryChoices, setIndustryChoices] = useState([]);
  const [servicesChoices, setServicesChoices] = useState([]);
  const [industrySearch, setIndustrySearch] = useState('');
  const [servicesSearch, setServicesSearch] = useState('');
  const [showBusinessPrompt, setShowBusinessPrompt] = useState(false);
  const [googleNewUser, setGoogleNewUser] = useState(false);
  const [googleToken, setGoogleToken] = useState('');

  // Google Auth
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: '642552962636-urfk7q3i38dls008ljs65h59veotncjc.apps.googleusercontent.com',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleSignIn(id_token);
    }
  }, [response]);

  const handleGoogleSignIn = async (idToken) => {
    try {
      const res = await axios.post('http://127.0.0.1:8000/api/google-login/', {
        token: idToken,
      });
      console.log(res.data);
      
      if ((res.status === 200 || res.status === 201) && res.data.key) {
        if (res.data.new_user) {
          authContext.signIn(res.data.key, { screen: 'BusinessProfile' });
        } else {
          authContext.signIn(res.data.key, { screen: 'Home' });
        }
      } else {
        Alert.alert('Google Sign-In failed', 'Unable to authenticate with Google.');
      }
    } catch (err) {
      Alert.alert('Google Sign-In error', err.message || 'An error occurred during Google sign-in.');
    }
  };

  useEffect(() => {
    const fetchChoices = async () => {
      try {
        const res = await axios.get('http://127.0.0.1:8000/api/choices/');
        setIndustryChoices(res.data.industry || []);
        setServicesChoices(res.data.services || []);
      } catch (err) {
        console.log('Failed to fetch choices:', err);
      }
    };
    fetchChoices();
  }, []);

  const toggleIndustry = (choice) => {
    setIndustry((prev) =>
      prev.includes(choice)
        ? prev.filter((item) => item !== choice)
        : [...prev, choice]
    );
  };

  const toggleService = (choice) => {
    setServices((prev) =>
      prev.includes(choice)
        ? prev.filter((item) => item !== choice)
        : [...prev, choice]
    );
  };

  const handleRegister = async () => {
    try {
      // Debug log to check what is being sent
      console.log('Register payload:', {
        email: registerEmail,
        username: registerUsername,
        password1: registerPassword1,
        password2: registerPassword2,
        is_business_owner: isBusinessOwner,
        business_name: isBusinessOwner ? businessName : '',
        industry: isBusinessOwner ? industry : [],
        services: isBusinessOwner ? services : [],
      });

      await axios.post('http://127.0.0.1:8000/api/register/', {
        email: registerEmail,
        username: registerUsername,
        password1: registerPassword1,
        password2: registerPassword2,
        is_business_owner: isBusinessOwner,
        business_name: isBusinessOwner ? businessName : '',
        industry: isBusinessOwner ? industry : [],
        services: isBusinessOwner ? services : [],
      });
      setStep(2);
      setHello('Check your email for the verification code.');
    } catch (err) {
      // Improved error handling for duplicate username/email
      if (err.response && err.response.data) {
        if (err.response.data.username) {
          setHello('Username already exists. Please choose another.');
        } else if (err.response.data.email) {
          setHello('Email already exists. Please use another.');
        } else {
          setHello('Registration failed: ' + JSON.stringify(err.response.data));
        }
      } else {
        setHello('Registration failed');
      }
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
        if (isBusinessOwner) {
          authContext.signIn(res.data.key, { screen: 'BusinessProfile' });
        } else {
          authContext.signIn(res.data.key, { screen: 'Home' });
        }
      } else {
        setHello('Verification failed');
      }
    } catch (err) {
      setHello('Verification failed');
    }
  };

  const handleBusinessInfoSubmit = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const res = await axios.post('http://127.0.0.1:8000/api/update-business-info/', {
        is_business_owner: isBusinessOwner,
        business_name: businessName,
        industry: industry,
        services: services,
      }, {
        headers: { Authorization: `Token ${token}` }
      });
      if (res.status === 200) {
        setShowBusinessPrompt(false);
        setGoogleNewUser(false);
        navigation.replace('Home');
      } else {
        Alert.alert('Update failed', 'Unable to update business information.');
      }
    } catch (err) {
      Alert.alert('Update error', err.message || 'An error occurred while updating business info.');
    }
  };

  // Helper to remove selected industry/service
  const removeIndustry = (choice) => {
    setIndustry((prev) => prev.filter((item) => item !== choice));
  };
  const removeService = (choice) => {
    setServices((prev) => prev.filter((item) => item !== choice));
  };

  if (showBusinessPrompt || googleNewUser) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Business Information</Text>
        <View style={styles.switchRow}>
          <Text>Are you a business owner?</Text>
          <Switch
            value={isBusinessOwner}
            onValueChange={setIsBusinessOwner}
          />
        </View>
        {isBusinessOwner && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Business Name"
              value={businessName}
              onChangeText={setBusinessName}
            />
            <Text style={{ marginTop: 10, fontWeight: 'bold' }}>Industry</Text>
            <View style={styles.selectedChipsRow}>
              {industry.map((choice) => (
                <View key={choice} style={styles.chip}>
                  <Text style={styles.chipText}>{choice}</Text>
                  <TouchableOpacity onPress={() => removeIndustry(choice)}>
                    <Text style={styles.chipRemove}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Search Industry"
              value={industrySearch}
              onChangeText={setIndustrySearch}
            />
            {industrySearch.trim().length > 0 && (
              <View style={styles.choicesRow}>
                {(industryChoices.length ? industryChoices : [])
                  .filter(choice =>
                    choice.toLowerCase().includes(industrySearch.toLowerCase()) &&
                    !industry.includes(choice)
                  )
                  .map((choice) => (
                    <CustomButton
                      key={choice}
                      title={choice}
                      onPress={() => toggleIndustry(choice)}
                      selected={false}
                    />
                  ))}
              </View>
            )}
            <Text style={{ marginTop: 10, fontWeight: 'bold' }}>Services</Text>
            <View style={styles.selectedChipsRow}>
              {services.map((choice) => (
                <View key={choice} style={styles.chip}>
                  <Text style={styles.chipText}>{choice}</Text>
                  <TouchableOpacity onPress={() => removeService(choice)}>
                    <Text style={styles.chipRemove}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Search Services"
              value={servicesSearch}
              onChangeText={setServicesSearch}
            />
            {servicesSearch.trim().length > 0 && (
              <View style={styles.choicesRow}>
                {(servicesChoices.length ? servicesChoices : [])
                  .filter(choice =>
                    choice.toLowerCase().includes(servicesSearch.toLowerCase()) &&
                    !services.includes(choice)
                  )
                  .map((choice) => (
                    <CustomButton
                      key={choice}
                      title={choice}
                      onPress={() => toggleService(choice)}
                      selected={false}
                    />
                  ))}
              </View>
            )}
          </>
        )}
        <CustomButton title="Submit" onPress={handleBusinessInfoSubmit} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Register</Text>
      {step === 1 ? (
        <ScrollView contentContainerStyle={{ alignItems: 'center' }}>
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
          <View style={styles.switchRow}>
            <Text>Are you a business owner?</Text>
            <Switch
              value={isBusinessOwner}
              onValueChange={setIsBusinessOwner}
            />
          </View>
          {isBusinessOwner && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Business Name"
                value={businessName}
                onChangeText={setBusinessName}
              />
              <Text style={{ marginTop: 10, fontWeight: 'bold' }}>Industry</Text>
              <View style={styles.selectedChipsRow}>
                {industry.map((choice) => (
                  <View key={choice} style={styles.chip}>
                    <Text style={styles.chipText}>{choice}</Text>
                    <TouchableOpacity onPress={() => removeIndustry(choice)}>
                      <Text style={styles.chipRemove}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              <TextInput
                style={styles.input}
                placeholder="Search Industry"
                value={industrySearch}
                onChangeText={setIndustrySearch}
              />
              {industrySearch.trim().length > 0 && (
                <View style={styles.choicesRow}>
                  {(industryChoices.length ? industryChoices : [])
                    .filter(choice =>
                      choice.toLowerCase().includes(industrySearch.toLowerCase()) &&
                      !industry.includes(choice)
                    )
                    .map((choice) => (
                      <CustomButton
                        key={choice}
                        title={choice}
                        onPress={() => toggleIndustry(choice)}
                        selected={false}
                      />
                    ))}
                </View>
              )}
              <Text style={{ marginTop: 10, fontWeight: 'bold' }}>Services</Text>
              <View style={styles.selectedChipsRow}>
                {services.map((choice) => (
                  <View key={choice} style={styles.chip}>
                    <Text style={styles.chipText}>{choice}</Text>
                    <TouchableOpacity onPress={() => removeService(choice)}>
                      <Text style={styles.chipRemove}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              <TextInput
                style={styles.input}
                placeholder="Search Services"
                value={servicesSearch}
                onChangeText={setServicesSearch}
              />
              {servicesSearch.trim().length > 0 && (
                <View style={styles.choicesRow}>
                  {(servicesChoices.length ? servicesChoices : [])
                    .filter(choice =>
                      choice.toLowerCase().includes(servicesSearch.toLowerCase()) &&
                      !services.includes(choice)
                    )
                    .map((choice) => (
                      <CustomButton
                        key={choice}
                        title={choice}
                        onPress={() => toggleService(choice)}
                        selected={false}
                      />
                    ))}
                </View>
              )}
            </>
          )}
          <CustomButton title="Sign Up" onPress={handleRegister} />
          <CustomButton
            title="Sign in with Google"
            onPress={() => {
              promptAsync();
            }}
            style={{ backgroundColor: '#db4437', marginTop: 10 }}
          />
        </ScrollView>
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
  buttonText: { color: '#fff', fontWeight: 'bold' },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 10, justifyContent: 'space-between', width: 250 },
  choicesRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginVertical: 5 },
  choiceButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    margin: 4,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  choiceButtonSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  choiceButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
  selectedChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 4,
    justifyContent: 'flex-start',
    width: 250,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    margin: 2,
  },
  chipText: {
    fontSize: 14,
    color: '#333',
    marginRight: 4,
  },
  chipRemove: {
    color: '#888',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 2,
    paddingHorizontal: 2,
  },
});

