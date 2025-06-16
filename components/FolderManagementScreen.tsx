import React, { useContext, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { FlashcardContext } from "../contexts/FlashcardContext";
import { Folder } from "../models/folder";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";

const FolderManagementScreen: React.FC = () => {
  const context = useContext(FlashcardContext);
  const folders = context?.folders || [];
  const addFolder = context?.addFolder;
  const [newFolderName, setNewFolderName] = useState("");
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // フォルダ追加
  const handleAddFolder = () => {
    if (!newFolderName.trim()) {
      Alert.alert("エラー", "フォルダ名を入力してください");
      return;
    }
    if (addFolder) {
      addFolder(newFolderName.trim());
      setNewFolderName("");
    }
  };

  // --- フォルダ削除（未分類は削除不可） ---
  // ContextにdeleteFolderが未定義のため、暫定的にundefinedで実装
  const deleteFolder = context?.deleteFolder as
    | ((id: string) => void)
    | undefined;
  const handleDeleteFolder = (id: string) => {
    if (id === "uncategorized") {
      Alert.alert("未分類フォルダは削除できません");
      return;
    }
    Alert.alert("確認", "本当に削除しますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: () => deleteFolder && deleteFolder(id),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>フォルダ管理</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="新しいフォルダ名"
          value={newFolderName}
          onChangeText={setNewFolderName}
        />
        <Button title="追加" onPress={handleAddFolder} />
      </View>
      <FlatList
        data={folders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.folderRow}>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("FolderCards", { folderId: item.id })
              }
            >
              <Text style={styles.folderName}>{item.name}</Text>
            </TouchableOpacity>
            {item.id !== "uncategorized" && (
              <TouchableOpacity onPress={() => handleDeleteFolder(item.id)}>
                <Text style={styles.deleteText}>削除</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ color: "gray", textAlign: "center" }}>
            フォルダがありません
          </Text>
        }
      />
      <StatusBar style="auto" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#2e7d32",
    textAlign: "center",
  },
  inputRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 8,
    marginRight: 10,
  },
  folderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  folderName: { fontSize: 18 },
  deleteText: { color: "#e53935", fontWeight: "bold", marginLeft: 10 },
});

export default FolderManagementScreen;
