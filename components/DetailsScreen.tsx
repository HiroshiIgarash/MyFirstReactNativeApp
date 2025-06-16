import React from "react";
import { View, Text } from "react-native";
import { StatusBar } from "expo-status-bar";

const DetailsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 10 }}>
        詳細画面です
      </Text>
      <Text style={{ fontSize: 18, color: "gray", marginBottom: 20 }}>
        戻るボタンを押してください
      </Text>
      <Text
        onPress={() => navigation.goBack()}
        style={{ color: "#007bff", fontSize: 18 }}
      >
        戻る
      </Text>
      <StatusBar style="auto" />
    </View>
  );
};
export default DetailsScreen;
