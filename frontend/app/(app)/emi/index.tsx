import React, { useMemo } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../src/api/client";

interface Transaction {
  id: string;
  account_id: string;
  type: "income" | "expense" | "transfer";
  category: string;
  amount: number;
  date: string;
  description?: string | null;
  created_at: string;
}

async function fetchTransactions(): Promise<Transaction[]> {
  const res = await apiClient.get<Transaction[]>("/transactions");
  return res.data;
}

export default function EmiTrackerScreen() {
  const { data: transactions, isLoading, isError, refetch } = useQuery({
    queryKey: ["emiTransactions"],
    queryFn: fetchTransactions,
  });

  const emiTx = useMemo(() => {
    if (!transactions) return [] as Transaction[];
    return transactions.filter((t) =>
      t.category.toLowerCase().includes("emi"),
    );
  }, [transactions]);

  const monthlySummary = useMemo(() => {
    const map: Record<string, { amount: number; count: number }> = {};
    emiTx.forEach((t) => {
      const monthKey = new Date(t.date).toISOString().slice(0, 7); // YYYY-MM
      if (!map[monthKey]) {
        map[monthKey] = { amount: 0, count: 0 };
      }
      map[monthKey].amount += t.amount;
      map[monthKey].count += 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([month, v]) => ({ month, ...v }));
  }, [emiTx]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>EMI Tracker</Text>
      <Text style={styles.subtitle}>
        This view groups all transactions whose category contains "EMI".
      </Text>

      {isLoading && (
        <ActivityIndicator style={styles.spinner} color="#22C55E" />
      )}

      {isError && (
        <Text style={styles.errorText} onPress={() => refetch()}>
          Failed to load EMI data. Tap to try again.
        </Text>
      )}

      {!isLoading && !isError && (
        <>
          <Text style={styles.sectionTitle}>Monthly EMI summary</Text>
          {monthlySummary.length === 0 ? (
            <Text style={styles.emptyText}>
              No EMI-tagged transactions yet. Create transactions with category
              containing "EMI" to see them here.
            </Text>
          ) : (
            monthlySummary.map((row) => (
              <View key={row.month} style={styles.summaryCard}>
                <Text style={styles.summaryMonth}>{row.month}</Text>
                <Text style={styles.summaryAmount}>{row.amount.toFixed(2)}</Text>
                <Text style={styles.summaryCount}>{row.count} payments</Text>
              </View>
            ))
          )}

          <Text style={styles.sectionTitle}>Recent EMI payments</Text>
          {emiTx.map((t) => (
            <View key={t.id} style={styles.txCard}>
              <Text style={styles.txCategory}>{t.category}</Text>
              <Text style={styles.txAmount}>-{t.amount.toFixed(2)}</Text>
              <Text style={styles.txMeta}>
                Account {t.account_id} • {new Date(t.date).toLocaleDateString()}
              </Text>
              {t.description ? (
                <Text style={styles.txDescription}>{t.description}</Text>
              ) : null}
            </View>
          ))}
          {emiTx.length === 0 && (
            <Text style={styles.emptyText}>No EMI payments recorded yet.</Text>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },
  content: {
    padding: 24,
    paddingBottom: 32,
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
  sectionTitle: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: "600",
    color: "#F9FAFB",
  },
  emptyText: {
    marginTop: 8,
    color: "#6B7280",
    fontSize: 14,
  },
  summaryCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#111827",
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: "#020617",
  },
  summaryMonth: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  summaryAmount: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "600",
    color: "#F9FAFB",
  },
  summaryCount: {
    marginTop: 2,
    fontSize: 12,
    color: "#9CA3AF",
  },
  txCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#111827",
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: "#020617",
  },
  txCategory: {
    fontSize: 15,
    fontWeight: "500",
    color: "#F9FAFB",
  },
  txAmount: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: "600",
    color: "#F97373",
  },
  txMeta: {
    marginTop: 4,
    fontSize: 12,
    color: "#9CA3AF",
  },
  txDescription: {
    marginTop: 4,
    fontSize: 13,
    color: "#E5E7EB",
  },
});
