import React, { useContext, useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ScrollView,
  Modal,
  Pressable,
} from "react-native";
import { FlashcardContext } from "../contexts/FlashcardContext";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { MaterialIcons } from "@expo/vector-icons";

const FOLDER_COLORS = [
  "#e53935",
  "#1976d2",
  "#388e3c",
  "#fbc02d",
  "#7b1fa2",
  "#757575",
  "#c2185b",
];
const FOLDER_ICONS = [
  "folder",
  "star",
  "book",
  "school",
  "work",
  "favorite",
  "lightbulb",
  "label",
];
const SORT_OPTIONS = [
  { key: "manual", label: "フォルダ一覧順" },
  { key: "name", label: "名前順" },
  { key: "recent", label: "学習履歴順" },
];

const SelectFolderScreen: React.FC = () => {
  const context = useContext(FlashcardContext);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // --- フィルター・ソート用 state ---
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filterColors, setFilterColors] = useState<string[]>([]);
  const [filterIcons, setFilterIcons] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<string>("manual");

  // --- グリッド表示切替 ---
  const isGrid = false; // 常にリスト表示

  if (!context) {
    return (
      <View style={styles.container}>
        <Text>データをロードできません</Text>
      </View>
    );
  }
  const { folders, flashcards } = context;

  // --- 並び順・フィルター適用 ---
  const filteredFolders = useMemo(() => {
    let arr = [...folders];
    if (filterColors.length > 0) {
      arr = arr.filter((f) => filterColors.includes(f.color || ""));
    }
    if (filterIcons.length > 0) {
      arr = arr.filter((f) => filterIcons.includes(f.icon || ""));
    }
    if (sortKey === "name") {
      arr = arr.sort((a, b) => (a.name > b.name ? 1 : -1));
    } else if (sortKey === "recent") {
      arr = arr.sort((a, b) => {
        const aMax = Math.max(
          ...flashcards
            .filter((c) => c.folderId === a.id)
            .map((c) => new Date(c.lastAnsweredAt || 0).getTime() || 0),
          0
        );
        const bMax = Math.max(
          ...flashcards
            .filter((c) => c.folderId === b.id)
            .map((c) => new Date(c.lastAnsweredAt || 0).getTime() || 0),
          0
        );
        return bMax - aMax;
      });
    }
    return arr;
  }, [folders, filterColors, filterIcons, sortKey, flashcards]);

  return (
    <View style={styles.container}>
      {/* --- フィルター・ソートボタン --- */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 8,
          backgroundColor: "#f5f5f5",
        }}
      >
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: "#e3f2fd",
            borderRadius: 18,
            marginRight: 10,
          }}
          onPress={() => setFilterModalVisible(true)}
        >
          <MaterialIcons name="tune" size={20} color="#1976d2" />
          <Text style={{ color: "#1976d2", fontWeight: "bold", marginLeft: 6 }}>
            絞り込み・並び替え
          </Text>
        </TouchableOpacity>
      </View>
      {/* --- シンプルな中央モーダル --- */}
      <Modal
        visible={filterModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <Pressable
          style={styles.centeredModalOverlay}
          onPress={() => setFilterModalVisible(false)}
        />
        <View
          style={[
            styles.centeredModalContent,
            {
              alignSelf: "center",
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: [{ translateX: -160 }, { translateY: -180 }],
            },
          ]}
        >
          <Text style={styles.modalTitle}>絞り込み・並び替え</Text>
          {/* 色フィルター */}
          <Text style={{ fontWeight: "bold", marginBottom: 6 }}>
            色で絞り込み
          </Text>
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 14 }}
          >
            {FOLDER_COLORS.map((color) => {
              const selected = filterColors.includes(color);
              return (
                <TouchableOpacity
                  key={color}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: color,
                    margin: 4,
                    borderWidth: 1,
                    borderColor: "#ccc",
                    opacity: selected ? 1 : 0.2,
                  }}
                  onPress={() =>
                    setFilterColors(
                      selected
                        ? filterColors.filter((c) => c !== color)
                        : [...filterColors, color]
                    )
                  }
                />
              );
            })}
          </View>
          {/* アイコンフィルター */}
          <Text style={{ fontWeight: "bold", marginBottom: 6 }}>
            アイコンで絞り込み
          </Text>
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 14 }}
          >
            {FOLDER_ICONS.map((icon) => {
              const selected = filterIcons.includes(icon);
              return (
                <TouchableOpacity
                  key={icon}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: selected ? "#e3f2fd" : "#f5f5f5",
                    margin: 4,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: "#ccc",
                    opacity: selected ? 1 : 0.2,
                  }}
                  onPress={() =>
                    setFilterIcons(
                      selected
                        ? filterIcons.filter((i) => i !== icon)
                        : [...filterIcons, icon]
                    )
                  }
                >
                  <MaterialIcons name={icon as any} size={18} color="#1976d2" />
                </TouchableOpacity>
              );
            })}
          </View>
          {/* 並び替え */}
          <Text style={{ fontWeight: "bold", marginBottom: 6 }}>並び替え</Text>
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 18 }}
          >
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={{ marginRight: 16, marginBottom: 8 }}
                onPress={() => setSortKey(opt.key)}
              >
                <Text
                  style={{
                    color: sortKey === opt.key ? "#1976d2" : "#333",
                    fontWeight: sortKey === opt.key ? "bold" : "normal",
                    fontSize: 15,
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => setFilterModalVisible(false)}
          >
            <Text style={styles.modalButtonText}>閉じる</Text>
          </TouchableOpacity>
        </View>
      </Modal>
      {/* --- フォルダリスト --- */}
      <View style={{ flex: 1 }}>
        {folders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 54, marginBottom: 12 }}>📂</Text>
            <Text style={styles.emptyTitle}>まだフォルダがありません</Text>
            <Text style={styles.emptyDescription}>
              学習を始めるには、まずフォルダを作成してください。
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate("FolderManagement")}
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
        ) : isGrid ? null : ( // --- グリッド表示は廃止 ---
          <FlatList
            data={filteredFolders}
            key={"list"}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => {
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
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        flex: 1,
                      }}
                    >
                      <View
                        style={{
                          backgroundColor: item.color || "#1976d2",
                          borderRadius: 20,
                          width: 36,
                          height: 36,
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 16,
                        }}
                      >
                        <MaterialIcons
                          name={(item.icon as any) || "folder"}
                          size={22}
                          color="#fff"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.folderRowText}>{item.name}</Text>
                        <Text style={styles.folderRowSub}>
                          {cardCount}枚のカード
                        </Text>
                      </View>
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
  centeredModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  centeredModalContent: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 28,
    alignItems: "center",
    width: 320,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    zIndex: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1976d2",
    marginBottom: 18,
  },
  modalButton: {
    backgroundColor: "#1976d2",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginHorizontal: 8,
    width: "100%",
    alignItems: "center",
    marginTop: 8,
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
  },
});

export default SelectFolderScreen;
