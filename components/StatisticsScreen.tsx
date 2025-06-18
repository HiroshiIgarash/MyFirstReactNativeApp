import React from "react";
import { View, Text, StyleSheet } from "react-native";

const StatisticsScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>成績（ダミー画面）</Text>
      <Text style={styles.text}>ここに成績や統計情報を表示できます。</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2e7d32",
    marginBottom: 16,
  },
  text: {
    fontSize: 18,
    color: "#555",
  },
});

export default StatisticsScreen;
