import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { format } from 'date-fns';

export default function ChatScreen({ route, navigation }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const ws = useRef(null);
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState(route?.params?.roomId || null);
  const [roomTitle, setRoomTitle] = useState(route?.params?.roomTitle || 'Chat');
  const [loadingParams, setLoadingParams] = useState(!route?.params?.roomId);

  // Save last opened chat info to AsyncStorage
  useEffect(() => {
    if (route?.params?.roomId) {
      AsyncStorage.setItem('lastChatRoom', JSON.stringify({
        roomId: route.params.roomId,
        roomTitle: route.params.roomTitle || 'Chat'
      }));
    }
  }, [route?.params?.roomId, route?.params?.roomTitle]);

  // On mount, if params missing, try to recover from AsyncStorage
  useEffect(() => {
    if (!roomId) {
      (async () => {
        const last = await AsyncStorage.getItem('lastChatRoom');
        if (last) {
          try {
            const parsed = JSON.parse(last);
            if (parsed.roomId) {
              setRoomId(parsed.roomId);
              setRoomTitle(parsed.roomTitle || 'Chat');
            }
          } catch {}
        }
        setLoadingParams(false);
      })();
    } else {
      setLoadingParams(false);
    }
  }, []);

  // Check if we have the required parameters, if not redirect to Home
  useEffect(() => {
    if (!loadingParams && !roomId) {
      Alert.alert(
        "Missing Information",
        "Chat room information is missing. Returning to home screen.",
        [{ text: "OK", onPress: () => navigation.replace('Home') }]
      );
    }
  }, [roomId, navigation, loadingParams]);

  // Only proceed with API calls if we have a roomId
  useEffect(() => {
    if (!roomId) return;
    
    const fetchUser = async () => {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        try {
          const res = await axios.get('http://127.0.0.1:8000/api/hello/', {
            headers: { Authorization: `Token ${token}` }
          });
          setUsername(res.data.username);
          
        } catch (error) {
          console.error('Error fetching user:', error);
        }
      }
    };
    fetchUser();
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    
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
    if (!roomId) return;
    
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
    // Normalize usernames for comparison (trim and convert to lowercase)
    const normalizedSender = item.sender.username.trim().toLowerCase();
    const normalizedUsername = username.trim().toLowerCase();
    console.log('Normalized sender:', normalizedSender, 'Normalized username:', normalizedUsername);
    const isOwnMessage = normalizedSender === normalizedUsername;
    
    console.log('Message from:', item.sender.username, 
      'Current user:', username, 
      'Normalized sender:', normalizedSender,
      'Normalized username:', normalizedUsername,
      'Is own:', isOwnMessage);
    
    return (
      <View style={[
        styles.messageRow,
        isOwnMessage ? styles.ownMessageRow : null
      ]}>
        <View style={[
          styles.messageContent,
          isOwnMessage ? styles.ownMessageContent : null
        ]}>
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : null
          ]}>{item.content}</Text>
          <Text style={[
            styles.timestamp,
            isOwnMessage ? styles.ownTimestamp : null
          ]}>{formatMessageTime(item.timestamp)}</Text>
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
        {/* Add a home button */}
        <TouchableOpacity 
          style={styles.homeButton} 
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.homeButtonText}>🏠</Text>
        </TouchableOpacity>
      </View>

      {loadingParams ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Loading chat...</Text>
        </View>
      ) : !roomId ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Unable to load chat. Room information is missing.
          </Text>
          <TouchableOpacity 
            style={styles.errorButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.errorButtonText}>Go Home</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
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
        </>
      )}
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
  ownMessageText: {
    color: '#fff',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  ownTimestamp: {
    color: '#e0e0e0',
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
  // Add new styles
  homeButton: {
    marginLeft: 'auto',
    padding: 5,
  },
  homeButtonText: {
    fontSize: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
  },
  errorButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
