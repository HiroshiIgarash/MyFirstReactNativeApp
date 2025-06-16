import React, { useContext, useState, useEffect, useLayoutEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  Modal,
  Pressable,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { FlashcardContext } from "../contexts/FlashcardContext";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RootStackParamList } from "../navigation/RootNavigator";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as DocumentPicker from "expo-document-picker";
import Papa from "papaparse";
import { MaterialIcons } from "@expo/vector-icons";
import { ActionSheetIOS, Platform } from "react-native";

const FolderCardsScreen: React.FC = () => {
  const context = useContext(FlashcardContext);
  const route = useRoute<any>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const folderId = route.params?.folderId;

  if (!context) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>データをロードできません</Text>
      </View>
    );
  }
  const { flashcards, folders, deleteFlashcard } = context;
  const cards = flashcards.filter((card) => card.folderId === folderId);
  const folder = folders.find((f) => f.id === folderId);

  // 削除
  const handleDelete = (cardId: string) => {
    Alert.alert("確認", "本当に削除しますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: () => deleteFlashcard && deleteFlashcard(cardId),
      },
    ]);
  };
  // 重複カード一括削除
  const handleRemoveDuplicates = () => {
    if (cards.length === 0) return;
    // front+backが同じものを1つだけ残す
    const seen = new Set<string>();
    const idsToKeep = new Set<string>();
    const idsToDelete: string[] = [];
    cards.forEach((card) => {
      const key = `${card.front}\u0000${card.back}`;
      if (!seen.has(key)) {
        seen.add(key);
        idsToKeep.add(card.id); // 最初の1枚は残す
      }
    });
    cards.forEach((card) => {
      const key = `${card.front}\u0000${card.back}`;
      if (!idsToKeep.has(card.id)) {
        idsToDelete.push(card.id);
      }
    });
    if (idsToDelete.length === 0) {
      Alert.alert("重複カードなし", "このフォルダに重複カードはありません。");
      return;
    }
    Alert.alert(
      "重複カードを削除",
      `${idsToDelete.length}件の重複カードを削除します。よろしいですか？`,
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: () => {
            idsToDelete.forEach((id) => deleteFlashcard && deleteFlashcard(id));
          },
        },
      ]
    );
  };
  // --- CSVインポート処理 ---
  const handleImportCSV = async () => {
    if (!folderId) {
      Alert.alert("エラー", "フォルダが見つかりません");
      return;
    }
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "text/csv",
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets || res.assets.length === 0) return;
      const fileUri = res.assets[0].uri;
      const response = await fetch(fileUri);
      const text = await response.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      if (parsed.errors.length > 0) {
        Alert.alert(
          "CSVの読み込み中にエラーが発生しました……\n" + parsed.errors[0].message
        );
        return;
      }
      let count = 0;
      for (const row of parsed.data as any[]) {
        if (row.front && row.back) {
          context.addFlashcard(row.front, row.back, folderId);
          count++;
        }
      }
      Alert.alert(`${count}件のカードをインポートしました！`);
    } catch (e: any) {
      Alert.alert("インポート中にエラーが発生しました……\n" + (e?.message || e));
    }
  };

  // --- 既存カードのID重複を修正する関数 ---
  function fixDuplicateCardIds(cards: typeof flashcards): typeof flashcards {
    const seen = new Set<string>();
    return cards.map((card) => {
      if (seen.has(card.id)) {
        // 重複IDなら新しいIDを割り当て
        const newId = `${card.id}_${Math.random().toString(36).slice(2, 8)}`;
        seen.add(newId);
        return { ...card, id: newId };
      } else {
        seen.add(card.id);
        return card;
      }
    });
  }

  // --- 統計情報の表示/非表示トグル ---
  const [showStats, setShowStats] = useState(true);

  // --- フォルダ内全カードの統計リセット ---
  const handleResetStats = () => {
    Alert.alert(
      "確認",
      "このフォルダ内の全カードの回答情報（出題回数・正解数など）をリセットします。よろしいですか？",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "リセット",
          style: "destructive",
          onPress: () => {
            if (!context) return;
            const updated = context.flashcards.map((card) =>
              card.folderId === folderId
                ? {
                    ...card,
                    shownCount: 0,
                    correctCount: 0,
                    incorrectCount: 0,
                    passCount: 0,
                    lastAnsweredAt: undefined,
                    lastResult: undefined,
                    streak: 0,
                  }
                : card
            );
            context.setFlashcards && context.setFlashcards(updated);
            Alert.alert("リセット完了", "全カードの統計情報をリセットしました。");
          },
        },
      ]
    );
  };

  // --- 3点メニュー用 ---
  const [menuVisible, setMenuVisible] = useState(false);

  // --- 3点メニューを開く ---
  const openMenu = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            "キャンセル",
            "重複カード一括削除",
            "このフォルダの統計情報をリセット",
            "CSVインポート",
          ],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) handleRemoveDuplicates();
          if (buttonIndex === 2) handleResetStats();
          if (buttonIndex === 3) handleImportCSV();
        }
      );
    } else {
      setMenuVisible(true);
    }
  };

  // --- ナビゲーションバー右端に3点メニューを設置 ---
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={openMenu}
          style={{ padding: 8 }}
          accessibilityLabel="その他の操作"
        >
          <MaterialIcons name="more-vert" size={28} color="#333" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, showStats]);

  useEffect(() => {
    if (!context) return;
    // 1回だけ重複ID修正
    if (context.flashcards.length > 0) {
      const ids = context.flashcards.map((c) => c.id);
      const unique = new Set(ids);
      if (unique.size !== ids.length) {
        // 重複があれば修正
        const fixed = fixDuplicateCardIds(context.flashcards);
        context.setFlashcards && context.setFlashcards(fixed);
      }
    }
  }, [context]);

  return (
    <View style={styles.container}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 10,
          width: "100%",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "bold" }}>
          {folder
            ? `「${folder.name}」のカード一覧（${cards.length}枚）`
            : "フォルダが見つかりません"}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ fontSize: 13, color: "#1976d2", marginRight: 4 }}>
            統計表示
          </Text>
          <TouchableOpacity
            onPress={() => setShowStats((s) => !s)}
            style={{
              width: 44,
              height: 28,
              borderRadius: 14,
              backgroundColor: showStats ? "#1976d2" : "#ccc",
              justifyContent: "center",
              padding: 2,
            }}
            accessibilityLabel="統計情報の表示切替"
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: "#fff",
                marginLeft: showStats ? 16 : 2,
              }}
            />
          </TouchableOpacity>
        </View>
      </View>
      {/* Android用モーダルメニュー */}
      {Platform.OS !== "ios" && (
        <Modal
          visible={menuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.2)" }}
            onPress={() => setMenuVisible(false)}
          >
            <View
              style={{
                position: "absolute",
                top: 80,
                right: 24,
                backgroundColor: "#fff",
                borderRadius: 12,
                elevation: 6,
                minWidth: 220,
                paddingVertical: 8,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  setMenuVisible(false);
                  handleRemoveDuplicates();
                }}
                style={styles.menuItem}
              >
                <Text style={styles.menuItemText}>重複カード一括削除</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setMenuVisible(false);
                  handleResetStats();
                }}
                style={styles.menuItem}
              >
                <Text style={styles.menuItemText}>このフォルダの統計情報をリセット</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setMenuVisible(false);
                  handleImportCSV();
                }}
                style={styles.menuItem}
              >
                <Text style={styles.menuItemText}>CSVインポート</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setMenuVisible(false)}
                style={[
                  styles.menuItem,
                  { borderTopWidth: 1, borderTopColor: "#eee" },
                ]}
              >
                <Text style={[styles.menuItemText, { color: "#888" }]}>
                  キャンセル
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      )}
      {cards.length === 0 ? (
        <View style={{ alignItems: "center", marginTop: 40 }}>
          <Text style={styles.noDataText}>
            このフォルダにはカードがありません
          </Text>
          <Text style={{ fontSize: 40, marginTop: 20 }}>📭</Text>
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.cardListCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardListFront}>{item.front}</Text>
                <Text style={styles.cardListBack}>{item.back}</Text>
                {showStats && (
                  <>
                    <Text style={styles.cardListStats}>
                      出題回数: {item.shownCount}　正解: {item.correctCount}　不正解:{" "}
                      {item.incorrectCount}
                    </Text>
                    <Text style={styles.cardListStats}>
                      最終回答:{" "}
                      {item.lastResult === "correct"
                        ? "正解"
                        : item.lastResult === "incorrect"
                        ? "不正解"
                        : item.lastResult === "pass"
                        ? "パス"
                        : "-"}
                      {item.lastAnsweredAt
                        ? `（${new Date(
                            item.lastAnsweredAt
                          ).toLocaleString()}）`
                        : ""}
                    </Text>
                    <Text style={styles.cardListStats}>
                      連続正解: {item.streak ?? 0}
                    </Text>
                  </>
                )}
                <View style={styles.cardListButtonRowBottom}>
                  <TouchableOpacity
                    style={styles.cardListEditButtonLarge}
                    onPress={() =>
                      navigation.navigate("EditCard", { cardId: item.id, folderId })
                    }
                  >
                    <Text style={styles.cardListEditButtonTextLarge}>編集</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cardListDeleteButtonLarge}
                    onPress={() => handleDelete(item.id)}
                  >
                    <Text style={styles.cardListDeleteButtonTextLarge}>削除</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          style={styles.folderListTall}
        />
      )}
      <Text
        style={{
          fontSize: 12,
          color: "#888",
          marginBottom: 8,
          alignSelf: "flex-end",
        }}
      >
        サンプルCSV: front,back の2列（1行目はヘッダー）
      </Text>
      <View style={{ height: 20 }} />
      <Button title="戻る" onPress={() => navigation.goBack()} />
      <StatusBar style="auto" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
    textAlign: "center",
  },
  noDataText: {
    fontSize: 16,
    color: "gray",
    textAlign: "center",
    marginTop: 20,
  },
  folderListTall: { width: "98%", maxHeight: 500, minHeight: 200 },
  cardListCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: "column",
    alignItems: "center",
    width: 360,
    maxWidth: "98%",
    alignSelf: "center",
  },
  cardListFront: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 6,
  },
  cardListBack: { fontSize: 16, color: "#00796b", fontStyle: "italic" },
  cardListButtonRow: {
    flexDirection: "column",
    marginLeft: 12,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  cardListButtonRowBottom: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginTop: 18,
    width: "100%",
  },
  cardListEditButton: {
    backgroundColor: "#e3f2fd",
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  cardListEditButtonLarge: {
    backgroundColor: "#e3f2fd",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginHorizontal: 8,
    minWidth: 90,
    alignItems: "center",
  },
  cardListEditButtonText: {
    color: "#1976d2",
    fontWeight: "bold",
    fontSize: 14,
  },
  cardListEditButtonTextLarge: {
    color: "#1976d2",
    fontWeight: "bold",
    fontSize: 18,
  },
  cardListDeleteButton: {
    backgroundColor: "#ffebee",
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  cardListDeleteButtonLarge: {
    backgroundColor: "#ffebee",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginHorizontal: 8,
    minWidth: 90,
    alignItems: "center",
  },
  cardListDeleteButtonText: {
    color: "#d32f2f",
    fontWeight: "bold",
    fontSize: 14,
  },
  cardListDeleteButtonTextLarge: {
    color: "#d32f2f",
    fontWeight: "bold",
    fontSize: 18,
  },
  textInput: {
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
    backgroundColor: "#fff",
    fontSize: 16,
  },
  cardListStats: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  menuItemText: {
    fontSize: 16,
    color: "#333",
  },
});

export default FolderCardsScreen;
