import React from "react";
import { View, Text, Button } from "react-native";
import { StatusBar } from "expo-status-bar";

const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <Text
        style={{
          fontSize: 32,
          fontWeight: "bold",
          marginBottom: 15,
          color: "#2e7d32",
          textAlign: "center",
        }}
      >
        暗記アプリへようこそ！
      </Text>
      <Text
        style={{
          fontSize: 18,
          color: "#4caf50",
          marginBottom: 40,
          textAlign: "center",
          paddingHorizontal: 10,
        }}
      >
        学習を始めたり、カードやフォルダを管理しましょう。
      </Text>
      <View style={{ width: "80%" }}>
        <Button
          title="暗記を始める……"
          onPress={() => navigation.navigate("SelectFolder")}
        />
        <View style={{ height: 15 }} />
        <Button
          title="フォルダを管理する……"
          onPress={() => navigation.navigate("FolderManagement")}
        />
      </View>
      <StatusBar style="auto" />
    </View>
  );
};
export default HomeScreen;
