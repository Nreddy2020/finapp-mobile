import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Link } from "expo-router";

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>FinTrack Mobile</Text>
      <Link href="/(auth)/login" style={styles.link}>
        <Text style={styles.linkText}>Go to Login</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#020617",
  },
  title: {
    fontSize: 24,
    color: "#F9FAFB",
    marginBottom: 20,
  },
  link: {
    padding: 10,
    backgroundColor: "#22C55E",
    borderRadius: 8,
  },
  linkText: {
    color: "#022C22",
    fontWeight: "600",
  },
});
