import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Switch, ScrollView, Alert, Image } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

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
  const [images, setImages] = useState([]); // changed from image to images array

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

  // Image picker handler (multiple)
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType, // fallback to supported API
      allowsMultipleSelection: true,
      selectionLimit: 5, // optional: limit to 5 images
      quality: 0.7,
      base64: false,
      // allowsEditing: true, // REMOVE this line to fix the warning
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImages((prev) => [...prev, ...result.assets]);
    }
  };

  const removeImage = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    const token = await AsyncStorage.getItem('authToken');
    if (!token) {
      Alert.alert('Error', 'No token found. Please log in again.');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      if (price) formData.append('price', parseFloat(price));
      formData.append('location', location);
      formData.append('services_needed', JSON.stringify(servicesNeeded));
      formData.append('business_posted', businessPosted);
      // Append all images with unique keys: image0, image1, ...
      images.forEach((img, idx) => {
        let uri = img.uri;
        if (uri.startsWith('file://')) {
          let filename = uri.split('/').pop() || `service_image_${idx}.jpg`;
          let match = /\.(\w+)$/.exec(filename);
          let ext = match ? match[1].toLowerCase() : 'jpg';
          let mimeType = 'image/jpeg';
          if (ext === 'png') mimeType = 'image/png';
          else if (ext === 'heic') mimeType = 'image/heic';
          formData.append(`image${idx}`, {
            uri,
            name: filename,
            type: mimeType,
          });
        } else if (uri.startsWith('data:')) {
          // Handle base64 data URI (web)
          let matches = uri.match(/^data:(.+);base64,(.+)$/);
          if (matches) {
            let mimeType = matches[1];
            let base64Data = matches[2];
            let filename = `service_image_${idx}.${mimeType.split('/')[1] || 'jpg'}`;
            // Convert base64 to blob for web
            if (typeof window !== 'undefined' && window.Blob) {
              const byteCharacters = atob(base64Data);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: mimeType });
              formData.append(`image${idx}`, blob, filename);
            }
          }
        } else {
          console.warn('Skipping invalid image uri:', uri);
        }
      });

      await axios.post('http://127.0.0.1:8000/api/service-request/', formData, {
        headers: {
          Authorization: `Token ${token}`,
          // Do NOT set Content-Type manually!
        },
      });
      Alert.alert('Success', 'Service request created!');
      // Navigate to Home and trigger refresh
      navigation.navigate('Home', { refresh: true });
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
      <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
        <Text style={styles.imageButtonText}>{images.length > 0 ? 'Add More Images' : 'Upload Images (jpg, png, heic)'}</Text>
      </TouchableOpacity>
      {images.length > 0 && (
        <ScrollView horizontal style={{ marginVertical: 10 }}>
          {images.map((img, idx) => (
            <View key={idx} style={{ marginRight: 10, alignItems: 'center' }}>
              <Image
                source={{ uri: img.uri }}
                style={{ width: 100, height: 100, borderRadius: 10 }}
                resizeMode="cover"
              />
              <TouchableOpacity onPress={() => removeImage(idx)}>
                <Text style={{ color: 'red', fontWeight: 'bold', marginTop: 2 }}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
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
  imageButton: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    width: 200,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  imageButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
});

