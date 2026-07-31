import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AuthService } from '../../services/auth';
import { useRouter, useSegments } from 'expo-router';

const AuthContext = createContext({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState({ id: 'dev-user', email: 'dev@test.com', fullName: 'Dev Tester' }); // DEV: bypass login
  const [loading, setLoading] = useState(false); // DEV: skip loading state
  const router = useRouter();
  const segments = useSegments();
  const isMounted = useRef(false);

  // Initial session check — DISABLED for dev testing
  /*
  useEffect(() => {
    isMounted.current = true;
    const init = async () => {
      try {
        const session = await AuthService.getSession();
        if (session) {
          setUser(session.user);
        }
      } catch (e) {
        console.warn('Auth init error', e);
      } finally {
        setLoading(false);
      }
    };
    init();
    return () => { isMounted.current = false; };
  }, []);
  */

  // Navigation guard — DISABLED for dev testing
  /*
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const onLoginPage = segments[0] === 'login';

    if (!user && !onLoginPage && !inAuthGroup) {
      router.replace('/login');
    } else if (user && (onLoginPage || inAuthGroup)) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);
  */

  // Logout listener from AuthService
  useEffect(() => {
    const onLogout = () => {
      if (!isMounted.current) return;
      setUser(null);
      try { router.replace('/login'); } catch (e) { /* no-op */ }
    };
    AuthService.addLogoutListener?.(onLogout);
    return () => { AuthService.removeLogoutListener?.(onLogout); };
  }, []);

  const login = async (email, password) => {
    const result = await AuthService.login(email, password);
    if (result.success) {
      setUser(result.user);
    }
    return result;
  };

  const register = async (email, password, fullName) => {
    const result = await AuthService.register(email, password, fullName);
    if (result.success) {
      setUser(result.user);
    }
    return result;
  };

  const logout = async () => {
    await AuthService.logout();
    setUser(null);
    router.replace('/login');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer} accessibilityLabel="Restoring your session">
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#09090B',
  },
});
