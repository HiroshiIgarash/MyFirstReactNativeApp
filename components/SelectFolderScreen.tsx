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

const SelectFolderScreen: React.FC = () => {
  const context = useContext(FlashcardContext);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  if (!context) {
    return (
      <View style={styles.container}>
        <Text>データをロードできません</Text>
      </View>
    );
  }
  const { folders } = context;

  return (
    <View style={styles.container}>
      <View style={styles.folderList}>
        {folders.length === 0 ? (
          <Text style={styles.noDataText}>
            フォルダがありません。カード管理画面で作成してください。
          </Text>
        ) : (
          <FlatList
            data={folders}
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
});

export default SelectFolderScreen;
