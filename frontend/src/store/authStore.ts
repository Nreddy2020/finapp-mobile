import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthToken } from "../api/client";

interface AuthState {
  accessToken: string | null;
  initializing: boolean;
  setAccessToken: (token: string | null) => Promise<void>;
  hydrateToken: () => Promise<void>;
  logout: () => Promise<void>;
}

const TOKEN_KEY = "fintrack_access_token";

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  initializing: true,
  setAccessToken: async (accessToken) => {
    if (accessToken) {
      await AsyncStorage.setItem(TOKEN_KEY, accessToken);
    } else {
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
    setAuthToken(accessToken ?? null);
    set({ accessToken });
  },
  hydrateToken: async () => {
    try {
      const stored = await AsyncStorage.getItem(TOKEN_KEY);
      setAuthToken(stored);
      set({ accessToken: stored, initializing: false });
    } catch (e) {
      setAuthToken(null);
      set({ accessToken: null, initializing: false });
    }
  },
  logout: async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setAuthToken(null);
    set({ accessToken: null });
  },
}));
