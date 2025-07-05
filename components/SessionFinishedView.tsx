import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface SessionFinishedViewProps {
  onBack?: () => void;
  onRestart?: () => void;
}

const SessionFinishedView: React.FC<SessionFinishedViewProps> = ({
  onBack,
  onRestart,
}) => (
  <View
    style={[
      styles.card,
      { minHeight: 180, height: undefined, justifyContent: "center" },
    ]}
  >
    <Text
      style={[
        styles.cardText,
        {
          fontSize: 24,
          color: "#1976d2",
          fontWeight: "bold",
          marginBottom: 16,
        },
      ]}
    >
      すべてのカードを学習しました！お疲れ様です！
    </Text>
    <TouchableOpacity
      style={[
        styles.passButton,
        { backgroundColor: "#1976d2", marginBottom: 12 },
      ]}
      onPress={onBack}
      activeOpacity={0.8}
    >
      <Text style={[styles.passButtonText, { color: "#fff" }]}>
        学習タブに戻る
      </Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={styles.passButton}
      onPress={onRestart}
      activeOpacity={0.8}
    >
      <Text style={styles.passButtonText}>もう一度学習する</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    padding: 16,
    position: "relative",
    width: "100%",
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#bbb",
  },
  cardText: {
    fontSize: 22,
    color: "#333",
    textAlign: "center",
    marginBottom: 10,
  },
  passButton: {
    marginTop: 18,
    backgroundColor: "#eee",
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 48,
    alignSelf: "center",
    elevation: 2,
  },
  passButtonText: {
    color: "#888",
    fontWeight: "bold",
    fontSize: 20,
    textAlign: "center",
  },
});

export default SessionFinishedView;
