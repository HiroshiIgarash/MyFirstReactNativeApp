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
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { FlashcardContext } from "../contexts/FlashcardContext";
import { Folder } from "../models/folder";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { MaterialIcons } from "@expo/vector-icons";
import DraggableFlatList, {
  RenderItemParams,
} from "react-native-draggable-flatlist";

const FOLDER_COLORS = [
  "#e53935", // 国語（赤）
  "#1976d2", // 算数（青）
  "#388e3c", // 理科（緑）
  "#fbc02d", // 社会（黄）
  "#7b1fa2", // 英語（紫）
  "#757575", // グレー（その他・未分類）
  "#c2185b", // ピンク（アクセント・自由）
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

const FolderManagementScreen: React.FC = () => {
  const context = useContext(FlashcardContext);
  const folders = context?.folders || [];
  const setFolders = context?.setFolders;
  const addFolder = context?.addFolder;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<any>();
  const flashcards = context?.flashcards || [];
  const [showAdd, setShowAdd] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);
  const [newFolderIcon, setNewFolderIcon] = useState(FOLDER_ICONS[0]);
  // フォルダ名編集用
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [editingFolderColor, setEditingFolderColor] = useState(
    FOLDER_COLORS[0]
  );
  const [editingFolderIcon, setEditingFolderIcon] = useState(FOLDER_ICONS[0]);

  // openAddModalパラメータで自動モーダル表示
  React.useEffect(() => {
    if (route?.params?.openAddModal) {
      setModalVisible(true);
      // 1回だけ開くようにパラメータを消す
      navigation.setParams?.({ openAddModal: undefined });
    }
  }, [route?.params?.openAddModal]);

  // フォルダ追加
  const handleAddFolder = () => {
    if (!newFolderName.trim()) {
      Alert.alert("エラー", "フォルダ名を入力してください");
      return;
    }
    if (addFolder) {
      addFolder(newFolderName.trim(), newFolderColor, newFolderIcon);
      setNewFolderName("");
      setNewFolderColor(FOLDER_COLORS[0]);
      setNewFolderIcon(FOLDER_ICONS[0]);
    }
  };

  const handleAddFolderModal = () => {
    if (!newFolderName.trim()) return;
    addFolder && addFolder(newFolderName.trim(), newFolderColor, newFolderIcon);
    setNewFolderName("");
    setNewFolderColor(FOLDER_COLORS[0]);
    setNewFolderIcon(FOLDER_ICONS[0]);
    setModalVisible(false);
  };

  // --- フォルダ削除（未分類は削除不可） ---
  const deleteFolder = context?.deleteFolder as
    | ((id: string) => void)
    | undefined;
  const handleDeleteFolder = (id: string) => {
    Alert.alert("確認", "本当に削除しますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: () => deleteFolder && deleteFolder(id),
      },
    ]);
  };

  // 編集開始
  const startEditFolder = (
    folderId: string,
    currentName: string,
    color?: string,
    icon?: string
  ) => {
    setEditingFolderId(folderId);
    setEditingFolderName(currentName);
    setEditingFolderColor(color || FOLDER_COLORS[0]);
    setEditingFolderIcon(icon || FOLDER_ICONS[0]);
    setEditModalVisible(true);
  };

  // フォルダ名編集確定
  const handleEditFolder = () => {
    if (!editingFolderId || !editingFolderName.trim()) return;
    context?.editFolderName &&
      context.editFolderName(
        editingFolderId,
        editingFolderName.trim(),
        editingFolderColor,
        editingFolderIcon
      );
    setEditModalVisible(false);
    setEditingFolderId(null);
    setEditingFolderName("");
  };

  const renderDraggableItem = ({
    item,
    drag,
    isActive,
  }: RenderItemParams<Folder>) => {
    const cardCount = flashcards.filter(
      (card) => card.folderId === item.id
    ).length;
    return (
      <>
        <TouchableOpacity
          style={[styles.folderRow, isActive && { backgroundColor: "#f0f8ff" }]}
          onPress={() =>
            navigation.navigate("FolderCards", { folderId: item.id })
          }
          activeOpacity={0.7}
        >
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                marginRight: 16,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  backgroundColor: item.color || FOLDER_COLORS[0],
                  borderRadius: 20,
                  width: 36,
                  height: 36,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons
                  name={
                    FOLDER_ICONS.includes(item.icon as any)
                      ? (item.icon as any)
                      : "folder"
                  }
                  size={22}
                  color="#fff"
                />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.folderRowText}>{item.name}</Text>
              <Text style={styles.folderRowSub}>{cardCount}枚のカード</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() =>
              startEditFolder(item.id, item.name, item.color, item.icon)
            }
            style={{ marginLeft: 8 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="フォルダ名を編集"
          >
            <MaterialIcons name="edit" size={24} color="#1976d2" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeleteFolder(item.id)}
            style={{ marginLeft: 8 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="フォルダを削除"
          >
            <MaterialIcons name="delete" size={24} color="#e53935" />
          </TouchableOpacity>
          {/* ドラッグハンドル */}
          <TouchableOpacity
            onLongPress={drag}
            delayLongPress={150}
            style={{ marginLeft: 8, padding: 4 }}
            accessibilityLabel="ドラッグして並び替え"
          >
            <MaterialIcons name="drag-handle" size={28} color="#888" />
          </TouchableOpacity>
          <MaterialIcons
            name="chevron-right"
            size={28}
            color="#888"
            style={styles.chevronIcon}
          />
        </TouchableOpacity>
        <View style={styles.separator} />
      </>
    );
  };

  return (
    <View style={styles.container}>
      {/* paddingを0にしてリストを画面幅いっぱいに */}
      {folders.length === 0 ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={styles.noDataText}>フォルダがありません</Text>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={styles.bigAddButton}
            accessibilityLabel="フォルダ追加"
          >
            <MaterialIcons name="add-circle" size={48} color="#1976d2" />
            <Text style={styles.bigAddText}>新しいフォルダを作成</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <DraggableFlatList
          data={folders}
          keyExtractor={(item) => item.id}
          renderItem={renderDraggableItem}
          onDragEnd={({ data }) => {
            setFolders && setFolders(data);
          }}
          activationDistance={12}
          containerStyle={styles.folderList}
          dragItemOverflow={false}
          renderPlaceholder={(params) => null}
        />
      )}
      {/* 右下フローティング＋ボタン */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        accessibilityLabel="フォルダ追加"
        activeOpacity={0.8}
      >
        <MaterialIcons name="add" size={32} color="#fff" />
      </TouchableOpacity>
      {/* 新規フォルダ作成モーダル */}
      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.centeredModalOverlay}>
            <View style={styles.centeredModalContent}>
              <Text style={styles.modalTitle}>新規フォルダを作成</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="フォルダ名"
                value={newFolderName}
                onChangeText={setNewFolderName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleAddFolderModal}
              />
              {/* 色選択 */}
              <Text style={{ fontWeight: "bold", marginBottom: 6 }}>
                色を選択
              </Text>
              <View style={{ flexDirection: "row", marginBottom: 14 }}>
                {FOLDER_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: color,
                      marginHorizontal: 4,
                      borderWidth:
                        modalVisible && newFolderColor === color ? 3 : 1,
                      borderColor:
                        modalVisible && newFolderColor === color
                          ? "#333"
                          : "#ccc",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onPress={() => setNewFolderColor(color)}
                  />
                ))}
              </View>
              {/* アイコン選択 */}
              <Text style={{ fontWeight: "bold", marginBottom: 6 }}>
                アイコンを選択
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  marginBottom: 18,
                }}
              >
                {FOLDER_ICONS.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor:
                        modalVisible && newFolderIcon === icon
                          ? "#e3f2fd"
                          : "#f5f5f5",
                      margin: 4,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: "#ccc",
                    }}
                    onPress={() => setNewFolderIcon(icon)}
                  >
                    <MaterialIcons
                      name={icon as any}
                      size={22}
                      color="#1976d2"
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleAddFolderModal}
              >
                <Text style={styles.modalButtonText}>作成</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalCancelButton,
                  { marginTop: 8 },
                ]}
                onPress={() => {
                  setModalVisible(false);
                  setNewFolderName("");
                }}
              >
                <Text style={[styles.modalButtonText, { color: "#888" }]}>
                  キャンセル
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      {/* フォルダ名編集モーダル */}
      <Modal
        visible={editModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.centeredModalOverlay}>
            <View style={styles.centeredModalContent}>
              <Text style={styles.modalTitle}>フォルダ名を編集</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="新しいフォルダ名"
                value={editingFolderName}
                onChangeText={setEditingFolderName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleEditFolder}
              />
              {/* 色選択 */}
              <Text style={{ fontWeight: "bold", marginBottom: 6 }}>
                色を選択
              </Text>
              <View style={{ flexDirection: "row", marginBottom: 14 }}>
                {FOLDER_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: color,
                      marginHorizontal: 4,
                      borderWidth:
                        editModalVisible && editingFolderColor === color
                          ? 3
                          : 1,
                      borderColor:
                        editModalVisible && editingFolderColor === color
                          ? "#333"
                          : "#ccc",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onPress={() => setEditingFolderColor(color)}
                  />
                ))}
              </View>
              {/* アイコン選択 */}
              <Text style={{ fontWeight: "bold", marginBottom: 6 }}>
                アイコンを選択
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  marginBottom: 18,
                }}
              >
                {FOLDER_ICONS.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor:
                        editModalVisible && editingFolderIcon === icon
                          ? "#e3f2fd"
                          : "#f5f5f5",
                      margin: 4,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: "#ccc",
                    }}
                    onPress={() => setEditingFolderIcon(icon)}
                  >
                    <MaterialIcons
                      name={icon as any}
                      size={22}
                      color="#1976d2"
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleEditFolder}
              >
                <Text style={styles.modalButtonText}>保存</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalCancelButton,
                  { marginTop: 8 },
                ]}
                onPress={() => {
                  setEditModalVisible(false);
                  setEditingFolderId(null);
                  setEditingFolderName("");
                }}
              >
                <Text style={[styles.modalButtonText, { color: "#888" }]}>
                  キャンセル
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      <StatusBar style="auto" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 0, // paddingを0に
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
  separator: {
    height: 1,
    backgroundColor: "#e0e0e0",
    width: "100%",
    alignSelf: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    marginTop: 8,
  },
  addButton: {
    padding: 4,
    marginRight: 2,
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
  folderRowDisabled: {
    opacity: 0.4,
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
  bigAddButton: {
    flexDirection: "column",
    alignItems: "center",
    marginTop: 24,
  },
  bigAddText: {
    color: "#1976d2",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 6,
  },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 32,
    backgroundColor: "#1976d2",
    borderRadius: 32,
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    zIndex: 20,
  },
  centeredModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1976d2",
    marginBottom: 18,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 17,
    width: 260,
    marginBottom: 18,
    backgroundColor: "#f9f9f9",
  },
  modalButton: {
    backgroundColor: "#1976d2",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginHorizontal: 8,
    width: "100%",
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
  },
  modalCancelButton: {
    backgroundColor: "#eee",
  },
});

export default FolderManagementScreen;
