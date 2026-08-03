import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../src/api/client";

type StatusCheck = {
  id: string;
  client_name: string;
  timestamp: string;
};

type Account = {
  id: string;
  name: string;
  type: "bank" | "cash" | "wallet" | "other";
  currency: string;
  opening_balance: number;
  created_at: string;
};

type Transaction = {
  id: string;
  account_id: string;
  type: "income" | "expense" | "transfer";
  category: string;
  amount: number;
  date: string;
  description?: string | null;
  created_at: string;
};

async function fetchStatusChecks(): Promise<StatusCheck[]> {
  const res = await apiClient.get<StatusCheck[]>("/status");
  return res.data;
}

async function createStatusCheck(): Promise<StatusCheck> {
  const res = await apiClient.post<StatusCheck>("/status", {
    client_name: "fintrack-mobile",
  });
  return res.data;
}

async function fetchAccounts(): Promise<Account[]> {
  const res = await apiClient.get<Account[]>("/accounts");
  return res.data;
}

async function fetchTransactions(): Promise<Transaction[]> {
  const res = await apiClient.get<Transaction[]>("/transactions");
  return res.data;
}

export default function DashboardScreen() {
  const queryClient = useQueryClient();

  const {
    data: statusChecks,
    isLoading: statusLoading,
    isError: statusError,
    refetch: refetchStatus,
  } = useQuery({
    queryKey: ["statusChecks"],
    queryFn: fetchStatusChecks,
  });

  const {
    data: accounts,
    isLoading: accountsLoading,
    isError: accountsError,
    refetch: refetchAccounts,
  } = useQuery({
    queryKey: ["accountsDashboard"],
    queryFn: fetchAccounts,
  });

  const {
    data: transactions,
    isLoading: txLoading,
    isError: txError,
    refetch: refetchTx,
  } = useQuery({
    queryKey: ["transactionsDashboard"],
    queryFn: fetchTransactions,
  });

  const { mutate: addStatus, isLoading: isAdding } = useMutation({
    mutationFn: createStatusCheck,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["statusChecks"] });
    },
  });

  const totalIncome = useMemo(() => {
    if (!transactions) return 0;
    return transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const totalExpenses = useMemo(() => {
    if (!transactions) return 0;
    return transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const netCashFlow = useMemo(
    () => totalIncome - totalExpenses,
    [totalIncome, totalExpenses],
  );

  const openingBalances = useMemo(() => {
    if (!accounts) return 0;
    return accounts.reduce((sum, a) => sum + a.opening_balance, 0);
  }, [accounts]);

  const currentBalance = openingBalances + netCashFlow;

  const anyLoading = statusLoading || accountsLoading || txLoading;
  const anyError = statusError || accountsError || txError;

  const handleRefetchAll = () => {
    refetchStatus();
    refetchAccounts();
    refetchTx();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>FinTrack Dashboard</Text>
      <Text style={styles.subtitle}>
        Overview of your accounts, income and expenses powered by FinTrack API.
      </Text>

      {/* KPI cards */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Current balance</Text>
          <Text style={styles.kpiValue}>{currentBalance.toFixed(2)}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Total income</Text>
          <Text style={styles.kpiValuePositive}>{totalIncome.toFixed(2)}</Text>
        </View>
      </View>
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Total expenses</Text>
          <Text style={styles.kpiValueNegative}>{totalExpenses.toFixed(2)}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Net cash flow</Text>
          <Text
            style={
              netCashFlow >= 0
                ? styles.kpiValuePositive
                : styles.kpiValueNegative
            }
          >
            {netCashFlow.toFixed(2)}
          </Text>
        </View>
      </View>

      {anyLoading && (
        <ActivityIndicator style={styles.spinner} color="#22C55E" />
      )}

      {anyError && (
        <TouchableOpacity onPress={handleRefetchAll}>
          <Text style={styles.errorText}>
            Failed to load dashboard data. Tap to try again.
          </Text>
        </TouchableOpacity>
      )}

      {/* Status checks section */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>System status checks</Text>
        <TouchableOpacity
          style={[styles.buttonSmall, isAdding && styles.buttonDisabled]}
          onPress={() => addStatus()}
          disabled={isAdding}
        >
          <Text style={styles.buttonSmallText}>
            {isAdding ? "Recording..." : "Record"}
          </Text>
        </TouchableOpacity>
      </View>

      {!statusLoading && !statusError && (
        <FlatList
          data={statusChecks ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.client_name}</Text>
              <Text style={styles.cardTimestamp}>
                {new Date(item.timestamp).toLocaleString()}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No status checks yet. Tap "Record" above to create one.
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
  kpiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#111827",
  },
  kpiLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F9FAFB",
  },
  kpiValuePositive: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4ADE80",
  },
  kpiValueNegative: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F97373",
  },
  spinner: {
    marginTop: 16,
  },
  errorText: {
    marginTop: 16,
    color: "#F97373",
    fontSize: 14,
  },
  sectionHeaderRow: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F9FAFB",
  },
  buttonSmall: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#22C55E",
    alignItems: "center",
  },
  buttonSmallText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#022C22",
  },
  buttonDisabled: {
    opacity: 0.7,
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
    marginTop: 12,
  },
  cardTitle: {
    color: "#F9FAFB",
    fontSize: 16,
    fontWeight: "500",
  },
  cardTimestamp: {
    marginTop: 4,
    color: "#9CA3AF",
    fontSize: 12,
  },
  emptyText: {
    marginTop: 12,
    color: "#6B7280",
    fontSize: 14,
    textAlign: "center",
  },
});
