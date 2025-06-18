import React, { useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from "react-native";
import { FlashcardContext } from "../contexts/FlashcardContext";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { MaterialIcons } from "@expo/vector-icons";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

const SelectFolderScreen: React.FC = () => {
  const context = useContext(FlashcardContext);
  // ここでBottomTabNavigationPropを使ってタブ切り替え用のnavigationを取得
  const navigation = useNavigation<BottomTabNavigationProp<any>>();
  if (!context) {
    return (
      <View style={styles.container}>
        <Text>データをロードできません</Text>
      </View>
    );
  }
  const { folders } = context;
  // 未分類は常に先頭
  const uncategorized = folders.find((f) => f.id === "uncategorized");
  const rest = folders.filter((f) => f.id !== "uncategorized");
  const orderedFolders = uncategorized ? [uncategorized, ...rest] : rest;

  return (
    <View style={styles.container}>
      <View style={styles.folderList}>
        {folders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 54, marginBottom: 12 }}>📂</Text>
            <Text style={styles.emptyTitle}>まだフォルダがありません</Text>
            <Text style={styles.emptyDescription}>
              学習を始めるには、まずフォルダを作成してください。
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate("フォルダ")}
              activeOpacity={0.8}
              accessibilityLabel="新しいフォルダを作成"
            >
              <MaterialIcons
                name="arrow-forward"
                size={28}
                color="#1976d2"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.createButtonText}>新しいフォルダを作成</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={orderedFolders}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              // カード枚数を取得
              const cardCount = context.flashcards.filter(
                (card) => card.folderId === item.id
              ).length;
              const disabled = cardCount === 0;
              return (
                <>
                  <TouchableOpacity
                    style={[
                      styles.folderRow,
                      disabled && styles.folderRowDisabled,
                    ]}
                    onPress={() =>
                      !disabled &&
                      navigation.navigate("Anki", { folderId: item.id })
                    }
                    activeOpacity={0.6}
                    disabled={disabled}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.folderRowText}>{item.name}</Text>
                      <Text style={styles.folderRowSub}>
                        {cardCount}枚のカード
                      </Text>
                    </View>
                    <MaterialIcons
                      name="chevron-right"
                      size={28}
                      color={disabled ? "#ccc" : "#888"}
                      style={styles.chevronIcon}
                    />
                  </TouchableOpacity>
                  <View style={styles.separator} />
                </>
              );
            }}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 0,
  },
  folderList: {
    width: "100%",
    flex: 1,
    marginTop: 0,
  },
  folderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 20,
    width: "100%",
    backgroundColor: "#fff",
  },
  folderRowDisabled: {
    opacity: 0.4,
  },
  separator: {
    height: 1,
    backgroundColor: "#e0e0e0",
    width: "100%",
    alignSelf: "center",
  },
  folderRowText: {
    fontSize: 20,
    color: "#333",
    fontWeight: "bold",
  },
  folderRowSub: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },
  chevronIcon: {
    marginLeft: 8,
  },
  noDataText: {
    fontSize: 16,
    color: "gray",
    textAlign: "center",
    marginTop: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingBottom: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 15,
    color: "#888",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e3f2fd",
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
    elevation: 2,
  },
  createButtonText: {
    color: "#1976d2",
    fontWeight: "bold",
    fontSize: 17,
    marginLeft: 10,
  },
});

export default SelectFolderScreen;
