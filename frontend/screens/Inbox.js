import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useIsFocused } from '@react-navigation/native';

export default function Inbox({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [chatRooms, setChatRooms] = useState([]);
    const isFocused = useIsFocused();

    useEffect(() => {
        if (isFocused) {
            fetchChatRooms();
        }
    }, [isFocused]);

    const fetchChatRooms = async () => {
        try {
            const token = await AsyncStorage.getItem('authToken');
            if (!token) {
                navigation.replace('Login');
                return;
            }

            const response = await axios.get('http://127.0.0.1:8000/api/chat-rooms/', {
                headers: { Authorization: `Token ${token}` }
            });

            setChatRooms(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching chat rooms:', error);
            setLoading(false);
        }
    };

    const navigateToChat = (roomId, title) => {
        navigation.navigate('Chat', {
            roomId: roomId,
            roomTitle: title
        });
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        // If less than 24 hours, show time
        if (diff < 24 * 60 * 60 * 1000) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        // If this year, show date without year
        if (date.getFullYear() === now.getFullYear()) {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
        // Otherwise show full date
        return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#007bff" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerText}>Messages</Text>
                <TouchableOpacity 
                    style={styles.backButton} 
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
            </View>

            {chatRooms.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No messages yet</Text>
                    <Text style={styles.emptySubtext}>
                        Your conversations will appear here
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={chatRooms}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.chatRoom}
                            onPress={() => navigateToChat(item.id, item.service_request.title)}
                        >
                            <View style={styles.chatRoomContent}>
                                <View style={styles.chatRoomHeader}>
                                    <Text style={styles.serviceTitle}>
                                        {item.service_request.title}
                                    </Text>
                                    <Text style={styles.timestamp}>
                                        {formatTimestamp(item.latest_message?.timestamp || item.created_at)}
                                    </Text>
                                </View>
                                <Text style={styles.participantName}>
                                    {item.other_participant.username}
                                </Text>
                                <Text style={styles.lastMessage} numberOfLines={1}>
                                    {item.latest_message ? 
                                        `${item.latest_message.sender === item.other_participant.username ? '' : 'You: '}${item.latest_message.content}` 
                                        : 'No messages yet'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}
                    style={styles.chatList}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerText: {
        fontSize: 24,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
    },
    backButton: {
        position: 'absolute',
        left: 20,
        bottom: 20,
    },
    backButtonText: {
        fontSize: 24,
        color: '#007bff',
    },
    chatList: {
        flex: 1,
    },
    chatRoom: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    chatRoomContent: {
        padding: 16,
    },
    chatRoomHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    serviceTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    participantName: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    lastMessage: {
        fontSize: 14,
        color: '#666',
    },
    timestamp: {
        fontSize: 12,
        color: '#999',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#666',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
    },
});
