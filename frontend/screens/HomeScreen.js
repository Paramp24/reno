import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [businessProfiles, setBusinessProfiles] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('authToken');
    navigation.replace('Login');
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [bizRes, reqRes] = await Promise.all([
          axios.get('http://127.0.0.1:8000/api/business-profiles/'),
          axios.get('http://127.0.0.1:8000/api/service-requests/'),
        ]);
        setBusinessProfiles(bizRes.data || []);
        setServiceRequests(reqRes.data || []);
      } catch (err) {
        setBusinessProfiles([]);
        setServiceRequests([]);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Welcome!</Text>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => navigation.navigate('ServiceRequest')}
      >
        <Text style={styles.buttonText}>Create Service Request</Text>
      </TouchableOpacity>

      <Text style={styles.sectionHeader}>Business Profiles</Text>
      {businessProfiles.length === 0 && <Text style={styles.emptyText}>No business profiles found.</Text>}
      {businessProfiles.map((biz) => (
        <View key={biz.id} style={styles.card}>
          <Text style={styles.cardTitle}>{biz.business_name}</Text>
          <Text style={styles.cardSubtitle}>By: {biz.user} ({biz.email})</Text>
          <Text style={styles.cardDetail}>Industry: {Array.isArray(biz.industry) ? biz.industry.join(', ') : biz.industry}</Text>
          <Text style={styles.cardDetail}>Services: {Array.isArray(biz.services) ? biz.services.join(', ') : biz.services}</Text>
        </View>
      ))}

      <Text style={styles.sectionHeader}>Service Requests</Text>
      {serviceRequests.length === 0 && <Text style={styles.emptyText}>No service requests found.</Text>}
      {serviceRequests.map((req) => (
        <View key={req.id} style={styles.card}>
          <Text style={styles.cardTitle}>{req.title}</Text>
          <Text style={styles.cardSubtitle}>By: {req.user}</Text>
          <Text style={styles.cardDetail}>Location: {req.location}</Text>
          <Text style={styles.cardDetail}>Services Needed: {Array.isArray(req.services_needed) ? req.services_needed.join(', ') : req.services_needed}</Text>
          <Text style={styles.cardDetail}>Posted as Business: {req.business_posted ? 'Yes' : 'No'}</Text>
          <Text style={styles.cardDetail}>Created: {new Date(req.created_at).toLocaleString()}</Text>
          {req.images && req.images.length > 0 && (
            <ScrollView horizontal style={{ marginTop: 5 }}>
              {req.images.map((img, idx) => (
                <Image
                  key={idx}
                  source={{ uri: img.startsWith('/') ? `http://127.0.0.1:8000${img}` : img }}
                  style={styles.image}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', padding: 20, backgroundColor: '#f9f9f9' },
  header: { fontWeight: 'bold', fontSize: 24, marginTop: 20, marginBottom: 10 },
  sectionHeader: { fontWeight: 'bold', fontSize: 18, marginTop: 25, marginBottom: 8, alignSelf: 'flex-start' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginVertical: 7,
    width: 320,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 2 },
  cardSubtitle: { color: '#555', fontSize: 13, marginBottom: 2 },
  cardDetail: { color: '#333', fontSize: 13, marginBottom: 1 },
  image: { width: 80, height: 80, borderRadius: 8, marginRight: 6 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  logoutButton: { backgroundColor: '#dc3545', padding: 10, borderRadius: 5, marginTop: 10, width: 150, alignItems: 'center' },
  createButton: { backgroundColor: '#007bff', padding: 10, borderRadius: 5, marginTop: 10, width: 200, alignItems: 'center' },
  emptyText: { color: '#888', fontStyle: 'italic', marginBottom: 10 },
});
