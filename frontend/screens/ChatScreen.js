import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { format } from 'date-fns';

export default function ChatScreen({ route, navigation }) {
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
    const fetchMessages = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        const res = await axios.get(
          `http://127.0.0.1:8000/api/chat-rooms/${roomId}/messages/`, 
          { headers: { Authorization: `Token ${token}` }}
        );
        setMessages(res.data.reverse()); // Reverse to show newest messages at bottom
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };
    fetchMessages();
  }, [roomId]);

  useEffect(() => {
    const connectWebSocket = async () => {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        try {
          ws.current = new WebSocket(
            `ws://127.0.0.1:8000/ws/chat/${roomId}/?token=${token}`
          );

          ws.current.onopen = () => {
            console.log('WebSocket Connected');
          };

          ws.current.onmessage = (e) => {
            const data = JSON.parse(e.data);
            setMessages((prev) => [
              ...prev,
              {
                content: data.message,
                sender: { username: data.username },
                timestamp: new Date().toISOString(),
              },
            ]);
          };

          ws.current.onerror = (e) => {
            console.error('WebSocket error:', e);
          };

          ws.current.onclose = () => {
            console.log('WebSocket closed');
            // Try to reconnect after 3 seconds
            setTimeout(connectWebSocket, 3000);
          };
        } catch (error) {
          console.error('WebSocket connection error:', error);
        }
      }
    };

    connectWebSocket();
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [roomId]);

  const sendMessage = () => {
    if (input.trim() && ws.current) {
      ws.current.send(JSON.stringify({ message: input }));
      setInput('');
    }
  };

  const formatMessageTime = (timestamp) => {
    return format(new Date(timestamp), 'h:mm a');
  };

  const renderMessage = ({ item }) => {
    const isOwnMessage = item.sender.username === username;
    return (
      <View style={[
        styles.messageRow,
        isOwnMessage ? styles.ownMessageRow : null
      ]}>
        <View style={[
          styles.messageContent,
          isOwnMessage ? styles.ownMessageContent : null
        ]}>
          <Text style={styles.messageText}>{item.content}</Text>
          <Text style={styles.timestamp}>{formatMessageTime(item.timestamp)}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{roomTitle}</Text>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={renderMessage}
        style={styles.messages}
        inverted={false}
        contentContainerStyle={styles.messagesList}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          multiline
        />
        <TouchableOpacity 
          style={styles.sendButton} 
          onPress={sendMessage}
          disabled={!input.trim()}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    fontSize: 24,
    marginRight: 15,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  messages: { flex: 1 },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 10,
  },
  ownMessageRow: {
    justifyContent: 'flex-end',
  },
  messageContent: {
    maxWidth: '80%',
    backgroundColor: '#f0f0f0',
    borderRadius: 15,
    padding: 10,
  },
  ownMessageContent: {
    backgroundColor: '#007AFF',
  },
  messageText: {
    color: '#000',
    fontSize: 16,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 8, marginRight: 5 },
  sendButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 20,
    marginLeft: 10,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  messagesList: {
    paddingVertical: 15,
  },
});
