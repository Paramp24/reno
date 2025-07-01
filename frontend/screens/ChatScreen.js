import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export default function ChatScreen({ route }) {
  const { roomId, roomTitle } = route.params;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const ws = useRef(null);
  const [username, setUsername] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        // Optionally fetch user info if needed
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    // Fetch previous messages
    const fetchMessages = async () => {
      const token = await AsyncStorage.getItem('authToken');
      const res = await axios.get(`http://127.0.0.1:8000/api/chat-rooms/${roomId}/messages/`, {
        headers: { Authorization: `Token ${token}` },
      });
      setMessages(res.data);
    };
    fetchMessages();
  }, [roomId]);

  useEffect(() => {
    // Connect to websocket
    ws.current = new WebSocket(`ws://127.0.0.1:8000/ws/chat/${roomId}/`);
    ws.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setMessages((prev) => [...prev, { content: data.message, sender: { username: data.username }, timestamp: new Date().toISOString() }]);
    };
    return () => ws.current && ws.current.close();
  }, [roomId]);

  const sendMessage = () => {
    if (input.trim() && ws.current) {
      ws.current.send(JSON.stringify({ message: input }));
      setInput('');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{roomTitle || 'Chat'}</Text>
      <FlatList
        data={messages}
        keyExtractor={(_, idx) => idx.toString()}
        renderItem={({ item }) => (
          <View style={styles.messageRow}>
            <Text style={styles.sender}>{item.sender?.username || 'You'}:</Text>
            <Text style={styles.message}>{item.content}</Text>
          </View>
        )}
        style={styles.messages}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
        />
        <Button title="Send" onPress={sendMessage} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: '#fff' },
  header: { fontWeight: 'bold', fontSize: 18, marginBottom: 10 },
  messages: { flex: 1 },
  messageRow: { flexDirection: 'row', marginVertical: 2 },
  sender: { fontWeight: 'bold', marginRight: 5 },
  message: { flex: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 8, marginRight: 5 },
});
