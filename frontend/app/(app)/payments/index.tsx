import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../src/api/client";

const transactionSchema = z.object({
  account_id: z.string().min(1, "Account ID is required"),
  type: z.enum(["income", "expense", "transfer"]),
  category: z.string().min(1, "Category is required"),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((val) => !Number.isNaN(Number(val)) && Number(val) > 0, {
      message: "Enter a valid amount",
    }),
  date: z.string().min(1, "Date is required"),
  description: z.string().optional(),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;

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

async function createTransaction(values: TransactionFormValues): Promise<Transaction> {
  const payload = {
    ...values,
    amount: Number(values.amount),
  };
  const res = await apiClient.post<Transaction>("/transactions", payload);
  return res.data;
}

export default function PaymentsScreen() {
  const queryClient = useQueryClient();

  const {
    data: transactions,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["transactions"],
    queryFn: fetchTransactions,
  });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      account_id: "",
      type: "expense",
      category: "",
      amount: "",
      date: new Date().toISOString(),
      description: "",
    },
  });

  const typeValue = watch("type");
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const { mutate: submitTransaction, isLoading: isSubmitting } = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      reset({
        account_id: "",
        type: "expense",
        category: "",
        amount: "",
        date: new Date().toISOString(),
        description: "",
      });
      setSubmitError(null);
      Keyboard.dismiss();
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.detail || "Failed to save transaction. Please try again.";
      setSubmitError(message);
    },
  });

  const onSubmit = (values: TransactionFormValues) => {
    setSubmitError(null);
    submitTransaction(values);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
            <Text style={styles.title}>Transactions</Text>
            <Text style={styles.subtitle}>
              View and record income, expenses and transfers via /api/transactions.
            </Text>

            {/* Quick entry form */}
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>New transaction</Text>

              <Controller
                control={control}
                name="account_id"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Account ID</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Paste an account ID from Accounts tab"
                      placeholderTextColor="#4B5563"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                    {errors.account_id && (
                      <Text style={styles.errorText}>{errors.account_id.message}</Text>
                    )}
                  </View>
                )}
              />

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Type</Text>
                <View style={styles.typeRow}>
                  {(["expense", "income", "transfer"] as const).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.typeChip,
                        typeValue === t && styles.typeChipActive,
                      ]}
                      onPress={() => {
                        // manually set value in form
                        control.setValue?.("type" as any, t);
                      }}
                    >
                      <Text
                        style={[
                          styles.typeChipText,
                          typeValue === t && styles.typeChipTextActive,
                        ]}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.type && (
                  <Text style={styles.errorText}>{errors.type.message}</Text>
                )}
              </View>

              <Controller
                control={control}
                name="category"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Category</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Groceries, Salary"
                      placeholderTextColor="#4B5563"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                    {errors.category && (
                      <Text style={styles.errorText}>{errors.category.message}</Text>
                    )}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="amount"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Amount</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor="#4B5563"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                    {errors.amount && (
                      <Text style={styles.errorText}>{errors.amount.message}</Text>
                    )}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="date"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Date (ISO)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="2025-12-06T10:00:00Z"
                      placeholderTextColor="#4B5563"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                    {errors.date && (
                      <Text style={styles.errorText}>{errors.date.message}</Text>
                    )}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="description"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                      style={[styles.input, styles.inputMultiline]}
                      placeholder="Optional note"
                      placeholderTextColor="#4B5563"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      multiline
                    />
                  </View>
                )}
              />

              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
                onPress={handleSubmit(onSubmit)}
                disabled={isSubmitting}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? "Saving..." : "Save Transaction"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Transactions list */}
            {isLoading && (
              <ActivityIndicator style={styles.spinner} color="#22C55E" />
            )}

            {isError && (
              <TouchableOpacity onPress={() => refetch()}>
                <Text style={styles.errorText}>
                  Failed to load transactions. Tap to try again.
                </Text>
              </TouchableOpacity>
            )}

            {!isLoading && !isError && (
              <FlashList
                data={transactions ?? []}
                estimatedItemSize={80}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                  <View style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.cardTitle}>{item.category}</Text>
                      <Text
                        style={[
                          styles.amount,
                          item.type === "income"
                            ? styles.amountIncome
                            : styles.amountExpense,
                        ]}
                      >
                        {item.type === "expense" ? "-" : "+"}
                        {item.amount.toFixed(2)}
                      </Text>
                    </View>
                    <Text style={styles.cardMeta}>
                      {item.type.toUpperCase()} • Account {item.account_id}
                    </Text>
                    {item.description ? (
                      <Text style={styles.cardDescription}>{item.description}</Text>
                    ) : null}
                    <Text style={styles.cardTimestamp}>
                      {new Date(item.date).toLocaleString()}
                    </Text>
                  </View>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>
                    No transactions yet. Add one using the form above.
                  </Text>
                }
              />
            )}
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#020617",
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
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
    marginBottom: 12,
  },
  formCard: {
    borderRadius: 16,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#111827",
    padding: 12,
    marginBottom: 12,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F9FAFB",
    marginBottom: 8,
  },
  fieldGroup: {
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    color: "#D1D5DB",
    marginBottom: 4,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1F2937",
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#F9FAFB",
    fontSize: 14,
    backgroundColor: "#020617",
  },
  inputMultiline: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  typeRow: {
    flexDirection: "row",
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#374151",
  },
  typeChipActive: {
    backgroundColor: "#22C55E33",
    borderColor: "#22C55E",
  },
  typeChipText: {
    fontSize: 13,
    color: "#D1D5DB",
  },
  typeChipTextActive: {
    color: "#BBF7D0",
  },
  submitButton: {
    marginTop: 4,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#22C55E",
    alignItems: "center",
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#022C22",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  spinner: {
    marginTop: 12,
  },
  errorText: {
    marginTop: 2,
    color: "#F97373",
    fontSize: 12,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  card: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#111827",
    marginBottom: 8,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#F9FAFB",
  },
  amount: {
    fontSize: 15,
    fontWeight: "600",
  },
  amountIncome: {
    color: "#4ADE80",
  },
  amountExpense: {
    color: "#F97373",
  },
  cardMeta: {
    marginTop: 4,
    color: "#9CA3AF",
    fontSize: 12,
  },
  cardDescription: {
    marginTop: 4,
    color: "#E5E7EB",
    fontSize: 13,
  },
  cardTimestamp: {
    marginTop: 4,
    color: "#6B7280",
    fontSize: 11,
  },
  emptyText: {
    marginTop: 12,
    textAlign: "center",
    color: "#6B7280",
    fontSize: 14,
  },
});
