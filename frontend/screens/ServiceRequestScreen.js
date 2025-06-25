import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Switch, ScrollView, Alert } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CustomButton = ({ title, onPress, selected }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      styles.choiceButton,
      selected ? styles.choiceButtonSelected : {},
    ]}
  >
    <Text style={[styles.choiceButtonText, selected ? { color: '#fff' } : {}]}>{title}</Text>
  </TouchableOpacity>
);

const SERVICES_CHOICES = [
  'Renovation',
  'Repair',
  'Installation',
  'Consultation',
  'Maintenance',
  'Inspection',
  'Design',
  'Other',
];

export default function ServiceRequestScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [servicesNeeded, setServicesNeeded] = useState([]);
  const [servicesSearch, setServicesSearch] = useState('');
  const [businessPosted, setBusinessPosted] = useState(false);

  const toggleService = (choice) => {
    setServicesNeeded((prev) =>
      prev.includes(choice)
        ? prev.filter((item) => item !== choice)
        : [...prev, choice]
    );
  };

  const removeService = (choice) => {
    setServicesNeeded((prev) => prev.filter((item) => item !== choice));
  };

  const handleSubmit = async () => {
    const token = await AsyncStorage.getItem('authToken');
    try {
      await axios.post('http://127.0.0.1:8000/api/service-request/', {
        title,
        description,
        price: price ? parseFloat(price) : null,
        location,
        services_needed: servicesNeeded,
        business_posted: businessPosted,
      }, {
        headers: { Authorization: `Token ${token}` }
      });
      Alert.alert('Success', 'Service request created!');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Failed to create service request.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Create Service Request</Text>
      <TextInput
        style={styles.input}
        placeholder="Title"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={styles.input}
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <TextInput
        style={styles.input}
        placeholder="Price (optional)"
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Location"
        value={location}
        onChangeText={setLocation}
      />
      <View style={styles.switchRow}>
        <Text>Post as Business?</Text>
        <Switch value={businessPosted} onValueChange={setBusinessPosted} />
      </View>
      <Text style={{ marginTop: 10, fontWeight: 'bold' }}>Services Needed</Text>
      <View style={styles.selectedChipsRow}>
        {servicesNeeded.map((choice) => (
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
          {SERVICES_CHOICES
            .filter(choice =>
              choice.toLowerCase().includes(servicesSearch.toLowerCase()) &&
              !servicesNeeded.includes(choice)
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
      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Submit Request</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { fontWeight: 'bold', fontSize: 22, marginBottom: 20 },
  input: { width: 250, borderWidth: 1, borderColor: '#ccc', padding: 8, margin: 5, borderRadius: 5 },
  button: { backgroundColor: '#007bff', padding: 10, borderRadius: 5, marginTop: 20, width: 200, alignItems: 'center' },
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
