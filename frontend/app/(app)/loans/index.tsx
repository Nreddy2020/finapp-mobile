import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../src/api/client";

interface Account {
  id: string;
  name: string;
  type: "bank" | "cash" | "wallet" | "other";
  currency: string;
  opening_balance: number;
  created_at: string;
}

async function fetchAccounts(): Promise<Account[]> {
  const res = await apiClient.get<Account[]>("/accounts");
  return res.data;
}

async function createSampleAccount(): Promise<Account> {
  const now = new Date();
  const res = await apiClient.post<Account>("/accounts", {
    name: `Mobile Account ${now.toLocaleTimeString()}`,
    type: "bank",
    currency: "INR",
    opening_balance: 0,
  });
  return res.data;
}

export default function LoansScreen() {
  const queryClient = useQueryClient();

  const {
    data: accounts,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["accounts"],
    queryFn: fetchAccounts,
  });

  const { mutate: addAccount, isLoading: isAdding } = useMutation({
    mutationFn: createSampleAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Accounts</Text>
      <Text style={styles.subtitle}>
        This list is powered by /api/accounts. Use it as the base for Loans/Wallets.
      </Text>

      <TouchableOpacity
        style={[styles.button, isAdding && styles.buttonDisabled]}
        onPress={() => addAccount()}
        disabled={isAdding}
      >
        <Text style={styles.buttonText}>
          {isAdding ? "Creating..." : "Add Sample Account"}
        </Text>
      </TouchableOpacity>

      {isLoading && (
        <ActivityIndicator style={styles.spinner} color="#22C55E" />
      )}

      {isError && (
        <TouchableOpacity onPress={() => refetch()}>
          <Text style={styles.errorText}>
            Failed to load accounts. Tap to try again.
          </Text>
        </TouchableOpacity>
      )}

      {!isLoading && !isError && (
        <FlashList
          data={accounts ?? []}
          estimatedItemSize={72}
          contentContainerStyle={styles.listContent}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardMeta}>
                {item.type.toUpperCase()} • {item.currency}
              </Text>
              <Text style={styles.cardMeta}>
                Opening balance: {item.opening_balance.toFixed(2)}
              </Text>
              <Text style={styles.cardMeta} numberOfLines={1}>
                ID: {item.id}
              </Text>
              <Text style={styles.cardTimestamp}>
                Created {new Date(item.created_at).toLocaleString()}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No accounts yet. Tap "Add Sample Account" to create one.
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#020617",
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
  button: {
    marginTop: 4,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#3B82F6",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#F9FAFB",
    fontSize: 16,
    fontWeight: "600",
  },
  spinner: {
    marginTop: 16,
  },
  errorText: {
    marginTop: 16,
    color: "#F97373",
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#111827",
    marginBottom: 8,
  },
  cardTitle: {
    color: "#F9FAFB",
    fontSize: 16,
    fontWeight: "500",
  },
  cardMeta: {
    marginTop: 4,
    color: "#9CA3AF",
    fontSize: 13,
  },
  cardTimestamp: {
    marginTop: 4,
    color: "#6B7280",
    fontSize: 12,
  },
  emptyText: {
    marginTop: 24,
    color: "#6B7280",
    fontSize: 14,
    textAlign: "center",
  },
});
