import React, { useEffect, useState, createContext, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import ServiceRequestScreen from './screens/ServiceRequestScreen';
import ChatScreen from './screens/ChatScreen';
import Inbox from './screens/Inbox';
import BusinessProfileScreen from './screens/BusinessProfileScreen';

// Create the AuthContext to be used across the app
export const AuthContext = createContext();

const Stack = createStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userToken, setUserToken] = useState(null);
  const navigationRef = useRef(null);
  const [initialRoute, setInitialRoute] = useState('Home');
  const [routeReady, setRouteReady] = useState(false);
  const [postAuthAction, setPostAuthAction] = useState(null);
  
  useEffect(() => {
    // Check authentication once at startup
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        const lastScreen = await AsyncStorage.getItem('lastScreen');
        
        setUserToken(token);
        setIsAuthenticated(!!token);
        
        // Set initial route if we have a saved screen
        if (token && lastScreen) {
          setInitialRoute(lastScreen);
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
      } finally {
        setRouteReady(true);
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated && postAuthAction && navigationRef.current) {
      navigationRef.current.navigate(postAuthAction.screen, postAuthAction.params);
      setPostAuthAction(null); // Reset after navigation
    }
  }, [isAuthenticated, postAuthAction]);

  // Save the current screen when navigation changes
  const handleStateChange = async (state) => {
    if (state && state.routes.length > 0) {
      const currentRouteName = state.routes[state.index].name;
      if (isAuthenticated && currentRouteName) {
        try {
          await AsyncStorage.setItem('lastScreen', currentRouteName);
        } catch (error) {
          console.error('Error saving navigation state:', error);
        }
      }
    }
  };

  // Create the auth context value
  const authContextValue = {
    signIn: async (token, action = null) => {
      try {
        await AsyncStorage.setItem('authToken', token);
        setUserToken(token);
        if (action) {
          setPostAuthAction(action);
        }
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error signing in:', error);
      }
    },
    signOut: async () => {
      try {
        await AsyncStorage.removeItem('authToken');
        setUserToken(null);
        setIsAuthenticated(false);
      } catch (error) {
        console.error('Error signing out:', error);
      }
    },
    userToken
  };

  if (isLoading || !routeReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={authContextValue}>
      <NavigationContainer 
        ref={navigationRef}
        onStateChange={handleStateChange}
      >
        <Stack.Navigator 
          initialRouteName={initialRoute}
          screenOptions={{ 
            headerShown: false,
            animationEnabled: true
          }}
        >
          {isAuthenticated ? (
            // Authenticated stack
            <>
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="BusinessProfile" component={BusinessProfileScreen} />
              <Stack.Screen name="ServiceRequest" component={ServiceRequestScreen} />
              <Stack.Screen name="Chat" component={ChatScreen} />
              <Stack.Screen name="Inbox" component={Inbox} />
            </>
          ) : (
            // Authentication stack
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}