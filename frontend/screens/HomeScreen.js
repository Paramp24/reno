import React, { useEffect, useState, useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../App';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { signOut } = useContext(AuthContext);
  const [businessProfiles, setBusinessProfiles] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Modify the handleLogout function
  const handleLogout = async () => {
    await signOut();
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem('authToken');
        // Fetch current user info
        let userRes = null;
        if (token) {
          userRes = await axios.get('http://127.0.0.1:8000/api/hello/', {
            headers: { Authorization: `Token ${token}` },
          });
        }
        // Fetch business profiles and service requests
        const [bizRes, reqRes] = await Promise.all([
          axios.get('http://127.0.0.1:8000/api/business-profiles/'),
          axios.get('http://127.0.0.1:8000/api/service-requests/'),
        ]);
        setBusinessProfiles(bizRes.data);
        setServiceRequests(reqRes.data);
        if (userRes && userRes.data && userRes.data.username) {
          setCurrentUser(userRes.data);
        } else {
          setCurrentUser(null);
        }
      } catch (err) {
        setBusinessProfiles([]);
        setServiceRequests([]);
        setCurrentUser(null);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleLetsChat = async (serviceRequestId, serviceRequestTitle) => {
    const token = await AsyncStorage.getItem('authToken');
    try {
      const res = await axios.post('http://127.0.0.1:8000/api/chat-rooms/create/', { service_request_id: serviceRequestId }, {
        headers: { Authorization: `Token ${token}` },
      })
      
      if (res.data && res.data.room_id) {
        navigation.navigate('Chat', { roomId: res.data.room_id, roomTitle: serviceRequestTitle });
        
      }
    } catch (err) {
      alert('Could not start chat.');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Header and business profiles for FlatList
  const ListHeader = () => (
    <>
      {currentUser && (
        <View style={styles.currentUserBox}>
          <Text style={styles.currentUserText}>Logged in as: <Text style={{ fontWeight: 'bold', color: '#007bff' }}>{currentUser.username}</Text></Text>
        </View>
      )}
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
    </>
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        contentContainerStyle={styles.container}
        data={serviceRequests}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={<Text style={styles.emptyText}>No service requests found.</Text>}
        renderItem={({ item }) => (
          <View style={styles.serviceCard}>
            <Text style={styles.serviceTitle}>{item.title}</Text>
            <Text style={styles.serviceDesc}>{item.description}</Text>
            <Text style={styles.serviceMeta}>Location: {item.location}</Text>
            <Text style={styles.serviceMeta}>Posted by: <Text style={{ fontWeight: 'bold' }}>{item.user}</Text></Text>
            <TouchableOpacity onPress={() => handleLetsChat(item.id, item.title)} style={styles.letsChatButton}>
              <Text style={styles.buttonText}>Let's Chat</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      <TouchableOpacity style={styles.inboxButton} onPress={() => navigation.navigate('Inbox')}>
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Inbox</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { fontWeight: 'bold', fontSize: 22, marginBottom: 20 },
  logoutButton: { backgroundColor: '#dc3545', padding: 10, borderRadius: 5, margin: 5, width: 250, alignItems: 'center' },
  createButton: { backgroundColor: '#28a745', padding: 10, borderRadius: 5, margin: 5, width: 250, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  sectionHeader: { fontWeight: 'bold', fontSize: 18, marginTop: 20, marginBottom: 8 },
  emptyText: { color: '#888', marginBottom: 10 },
  card: { backgroundColor: '#f8f9fa', borderRadius: 10, padding: 15, marginVertical: 6, width: 320, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  cardTitle: { fontWeight: 'bold', fontSize: 16 },
  cardSubtitle: { color: '#555', marginBottom: 2 },
  cardDetail: { color: '#333', fontSize: 13 },
  serviceCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginVertical: 8, width: 340, shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 6, elevation: 3, borderWidth: 1, borderColor: '#eee' },
  serviceTitle: { fontWeight: 'bold', fontSize: 17, marginBottom: 4 },
  serviceDesc: { color: '#444', marginBottom: 6 },
  serviceMeta: { color: '#666', fontSize: 13, marginBottom: 2 },
  letsChatButton: { backgroundColor: '#007bff', padding: 10, borderRadius: 5, marginTop: 10, width: 120, alignItems: 'center', alignSelf: 'flex-end' },
  inboxButton: { position: 'absolute', bottom: 30, right: 30, backgroundColor: '#28a745', padding: 15, borderRadius: 50 },
  currentUserBox: { backgroundColor: '#e9f5ff', borderRadius: 8, padding: 10, marginBottom: 10, alignSelf: 'stretch', alignItems: 'center' },
  currentUserText: { color: '#007bff', fontSize: 15 },
});
 