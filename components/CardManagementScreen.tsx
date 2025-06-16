import React, { useContext, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { FlashcardContext } from "../contexts/FlashcardContext";
import { StyleSheet } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import Papa from "papaparse";

const CardManagementScreen: React.FC = () => {
  const context = useContext(FlashcardContext);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  if (!context) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>データをロードできません</Text>
      </View>
    );
  }
  const { addFlashcard, folders, flashcards } = context;

  // フォルダ初期選択
  React.useEffect(() => {
    if (folders.length > 0 && !selectedFolderId) {
      setSelectedFolderId(folders[0].id);
    }
  }, [folders, selectedFolderId]);

  const handleAdd = () => {
    if (!front.trim() || !back.trim()) {
      alert("表面と裏面を入力してください");
      return;
    }
    if (!selectedFolderId) {
      alert("フォルダを選択してください");
      return;
    }
    setLoading(true);
    addFlashcard(front.trim(), back.trim(), selectedFolderId);
    setFront("");
    setBack("");
    setLoading(false);
    alert("カードを追加しました");
  };

  // --- CSVインポート処理 ---
  const handleImportCSV = async () => {
    if (!selectedFolderId) {
      alert("先にフォルダを選択してくださいね……");
      return;
    }
    setImporting(true);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "text/csv",
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets || res.assets.length === 0) {
        setImporting(false);
        return;
      }
      const fileUri = res.assets[0].uri;
      const response = await fetch(fileUri);
      const text = await response.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      if (parsed.errors.length > 0) {
        alert(
          "CSVの読み込み中にエラーが発生しました……\n" + parsed.errors[0].message
        );
        setImporting(false);
        return;
      }
      let count = 0;
      for (const row of parsed.data as any[]) {
        if (row.front && row.back) {
          addFlashcard(row.front, row.back, selectedFolderId);
          count++;
        }
      }
      alert(`${count}件のカードをインポートしました！`);
    } catch (e: any) {
      alert("インポート中にエラーが発生しました……\n" + (e?.message || e));
    } finally {
      setImporting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.cardManagementContainer}>
      <Text style={styles.cardManagementTitle}>カード登録</Text>
      {/* CSVインポートボタン */}
      <Button
        title={importing ? "インポート中……" : "CSVインポート"}
        onPress={handleImportCSV}
        disabled={importing || folders.length === 0}
      />
      <Text
        style={{ fontSize: 12, color: "#888", marginTop: 4, marginBottom: 12 }}
      >
        サンプルCSV: front,back の2列（1行目はヘッダー）
      </Text>
      <Text style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>
        例: りんご,apple\nみかん,orange
      </Text>
      <TextInput
        style={styles.textInput}
        placeholder="表面（問題）"
        value={front}
        onChangeText={setFront}
      />
      <TextInput
        style={styles.textInput}
        placeholder="裏面（答え）"
        value={back}
        onChangeText={setBack}
      />
      <Text style={styles.inputLabel}>フォルダを選択</Text>
      <View style={styles.pickerContainer}>
        {folders.length === 0 ? (
          <Text style={styles.noDataText}>
            フォルダがありません。先にフォルダを作成してください。
          </Text>
        ) : (
          <View style={styles.folderSelectionButtons}>
            {folders.map((folder) => (
              <TouchableOpacity
                key={folder.id}
                style={[
                  styles.folderSelectButton,
                  selectedFolderId === folder.id && styles.selectedFolderButton,
                ]}
                onPress={() => setSelectedFolderId(folder.id)}
              >
                <Text
                  style={[
                    styles.folderSelectButtonText,
                    selectedFolderId === folder.id &&
                      styles.selectedFolderButtonTextActive,
                  ]}
                >
                  {folder.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      <Button
        title="カードを追加"
        onPress={handleAdd}
        disabled={loading || folders.length === 0}
      />
      {loading && <ActivityIndicator style={{ marginTop: 10 }} />}
      <StatusBar style="auto" />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  cardManagementContainer: {
    flexGrow: 1,
    backgroundColor: "#f8f8f8",
    alignItems: "center",
    padding: 20,
    paddingTop: 80,
  },
  cardManagementTitle: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 30,
    color: "#333",
  },
  textInput: {
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 10,
    width: "90%",
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: "#ffffff",
    fontSize: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 5,
    color: "#333",
    alignSelf: "flex-start",
    marginLeft: "5%",
  },
  pickerContainer: {
    width: "90%",
    marginBottom: 20,
  },
  folderSelectionButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    width: "100%",
  },
  folderSelectButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#007bff",
    margin: 5,
    backgroundColor: "#f0f8ff",
  },
  selectedFolderButton: {
    backgroundColor: "#007bff",
  },
  folderSelectButtonText: {
    color: "#007bff",
    fontSize: 14,
  },
  selectedFolderButtonTextActive: {
    color: "#ffffff",
  },
  noDataText: {
    fontSize: 16,
    color: "gray",
    textAlign: "center",
    marginTop: 20,
  },
});

export default CardManagementScreen;
