import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../src/api/client";
import { useAuthStore } from "../../../src/store/authStore";

interface User {
  id: string;
  email: string;
  full_name?: string | null;
  created_at: string;
}

async function fetchCurrentUser(): Promise<User> {
  const res = await apiClient.get<User>("/auth/me");
  return res.data;
}

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const logout = useAuthStore((s) => s.logout);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["me"],
    queryFn: fetchCurrentUser,
  });

  const handleLogout = async () => {
    await logout();
    queryClient.clear();
    router.replace("/(auth)/login");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Manage your FinTrack account.</Text>

        {isLoading && (
          <ActivityIndicator style={styles.spinner} color="#22C55E" />
        )}

        {isError && (
          <TouchableOpacity onPress={() => refetch()}>
            <Text style={styles.errorText}>
              Failed to load profile. Tap to try again.
            </Text>
          </TouchableOpacity>
        )}

        {!isLoading && !isError && data && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Email</Text>
            <Text style={styles.cardValue}>{data.email}</Text>

            {data.full_name ? (
              <>
                <Text style={styles.cardLabel}>Name</Text>
                <Text style={styles.cardValue}>{data.full_name}</Text>
              </>
            ) : null}

            <Text style={styles.cardLabel}>Member since</Text>
            <Text style={styles.cardValue}>
              {new Date(data.created_at).toLocaleDateString()}
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#020617",
  },
  container: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: "#F9FAFB",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 16,
  },
  spinner: {
    marginTop: 16,
  },
  errorText: {
    marginTop: 16,
    color: "#F97373",
    fontSize: 14,
  },
  card: {
    borderRadius: 16,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#111827",
    padding: 16,
    marginBottom: 24,
  },
  cardLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 8,
  },
  cardValue: {
    fontSize: 14,
    color: "#F9FAFB",
  },
  logoutButton: {
    marginTop: "auto",
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#EF4444",
    alignItems: "center",
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FEF2F2",
  },
});
