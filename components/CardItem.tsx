import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface CardItemProps {
  item: any;
  showStats: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  navigation: any;
  folderId: string;
}

class CardItem extends React.PureComponent<CardItemProps> {
  render() {
    const { item, showStats, onEdit, onDelete, navigation, folderId } =
      this.props;
    return (
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
                  ? `（${new Date(item.lastAnsweredAt).toLocaleString()}）`
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
              onPress={() => onDelete(item.id)}
            >
              <Text style={styles.cardListDeleteButtonTextLarge}>削除</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
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
  cardListStats: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },
  cardListButtonRowBottom: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginTop: 18,
    width: "100%",
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
  cardListEditButtonTextLarge: {
    color: "#1976d2",
    fontWeight: "bold",
    fontSize: 18,
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
  cardListDeleteButtonTextLarge: {
    color: "#d32f2f",
    fontWeight: "bold",
    fontSize: 18,
  },
});

export default CardItem;
