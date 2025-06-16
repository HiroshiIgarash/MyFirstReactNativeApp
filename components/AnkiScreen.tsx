import React, { useContext, useState, useRef, useMemo, useEffect } from "react";
import {
  View,
  Text,
  Button,
  Animated,
  Easing,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  PanGestureHandler,
  State as GestureState,
} from "react-native-gesture-handler";
import { FlashcardContext } from "../contexts/FlashcardContext";

const AnkiScreen: React.FC = () => {
  const context = useContext(FlashcardContext);
  const flashcards = context?.flashcards || [];
  const folders = context?.folders || [];
  const setFlashcards = context?.setFlashcards;

  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [cardResults, setCardResults] = useState<{
    [id: string]: "known" | "unknown" | undefined;
  }>({});
  const [dragging, setDragging] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [swipeZone, setSwipeZone] = useState<"known" | "unknown" | null>(null);
  const [gesture, setGesture] = useState({ x: 0, y: 0 });

  const filteredFlashcards = useMemo(
    () =>
      flashcards.filter((card) =>
        selectedFolderId ? card.folderId === selectedFolderId : true
      ),
    [flashcards, selectedFolderId]
  );

  const cardAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    setCurrentCardIndex(0);
    setShowAnswer(false);
    animatedValue.setValue(0);
    cardAnim.setValue({ x: 0, y: 0 });
  }, [selectedFolderId, filteredFlashcards.length]);

  useEffect(() => {
    if (folders.length > 0 && selectedFolderId === null) {
      setSelectedFolderId(folders[0].id);
    }
  }, [folders, selectedFolderId]);

  // カードのフリップアニメーション
  const frontInterpolate = animatedValue.interpolate({
    inputRange: [0, 180],
    outputRange: ["0deg", "180deg"],
  });
  const backInterpolate = animatedValue.interpolate({
    inputRange: [0, 180],
    outputRange: ["180deg", "360deg"],
  });
  const frontOpacity = animatedValue.interpolate({
    inputRange: [89, 90],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const backOpacity = animatedValue.interpolate({
    inputRange: [89, 90],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const frontAnimatedStyle = {
    transform: [{ rotateY: frontInterpolate }],
    opacity: frontOpacity,
  };
  const backAnimatedStyle = {
    transform: [{ rotateY: backInterpolate }],
    opacity: backOpacity,
  };

  const flipCard = () => {
    if (isFlipped) {
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 300,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => setIsFlipped(false));
    } else {
      Animated.timing(animatedValue, {
        toValue: 180,
        duration: 300,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => setIsFlipped(true));
    }
    setShowAnswer(!showAnswer);
  };

  // 出題時 shownCount をインクリメント
  useEffect(() => {
    if (!setFlashcards) return;
    const card = filteredFlashcards[currentCardIndex];
    if (!card) return;
    setFlashcards((prev) => {
      const prevCard = prev.find((c) => c.id === card.id);
      if (!prevCard) return prev;
      if (prevCard.shownCount > card.shownCount) return prev;
      return prev.map((c) =>
        c.id === card.id ? { ...c, shownCount: c.shownCount + 1 } : c
      );
    });
  }, [currentCardIndex, selectedFolderId]);

  // スワイプ判定・アニメーション
  const handleGestureEvent = (event: any) => {
    const { translationX, translationY } = event.nativeEvent;
    setGesture({ x: translationX, y: translationY });
    if (translationX < -50 && translationY < -40) {
      setSwipeZone("known");
    } else if (translationX > 50 && translationY < -40) {
      setSwipeZone("unknown");
    } else {
      setSwipeZone(null);
    }
    cardAnim.setValue({ x: translationX, y: translationY });
  };

  // --- カードをスワイプ方向にアニメーションで消す ---
  const animateCardOut = (toX: number, toY: number, onComplete: () => void) => {
    setAnimating(true);
    Animated.timing(cardAnim, {
      toValue: { x: toX, y: toY },
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      cardAnim.setValue({ x: 0, y: 0 });
      setAnimating(false);
      setShowAnswer(false); // スワイプ時に必ず表に戻す
      setIsFlipped(false); // アニメーション値もリセット
      animatedValue.setValue(0);
      onComplete();
    });
  };

  const handleHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === GestureState.END && !animating) {
      const { translationX, translationY } = event.nativeEvent;
      let swiped = false;
      const card = filteredFlashcards[currentCardIndex];
      if (translationX < -50 && translationY < -40) {
        setCardResults((prev) => ({ ...prev, [card?.id || ""]: "known" }));
        setFlashcards &&
          setFlashcards((prev) =>
            prev.map((c) =>
              c.id !== card.id
                ? c
                : {
                    ...c,
                    correctCount: (c.correctCount || 0) + 1,
                    lastAnsweredAt: new Date().toISOString(),
                    lastResult: "correct",
                    streak: (c.streak || 0) + 1,
                  }
            )
          );
        animateCardOut(-300, -300, () => goToNextCard());
        swiped = true;
      } else if (translationX > 50 && translationY < -40) {
        setCardResults((prev) => ({ ...prev, [card?.id || ""]: "unknown" }));
        setFlashcards &&
          setFlashcards((prev) =>
            prev.map((c) =>
              c.id !== card.id
                ? c
                : {
                    ...c,
                    incorrectCount: (c.incorrectCount || 0) + 1,
                    lastAnsweredAt: new Date().toISOString(),
                    lastResult: "incorrect",
                    streak: 0,
                  }
            )
          );
        animateCardOut(300, -300, () => goToNextCard());
        swiped = true;
      }
      if (!swiped) {
        Animated.spring(cardAnim, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
        }).start();
      }
      setDragging(false);
      setSwipeZone(null);
      setGesture({ x: 0, y: 0 });
    } else if (event.nativeEvent.state === GestureState.BEGAN) {
      setDragging(true);
    }
  };

  const goToNextCard = () => {
    if (filteredFlashcards.length === 0) {
      alert("まだこのフォルダにカードがありません……！");
      return;
    }
    if (currentCardIndex < filteredFlashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else {
      alert("このフォルダの最後のカードです……！");
    }
  };

  const goToPreviousCard = () => {
    if (filteredFlashcards.length === 0) {
      alert("まだこのフォルダにカードがありません……！");
      return;
    }
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
    } else {
      alert("このフォルダの最初のカードです……！");
    }
  };

  const currentCard =
    filteredFlashcards.length > 0 ? filteredFlashcards[currentCardIndex] : null;

  // 透明度計算: swipeZoneに入ったときのスワイプ量で濃さを変える
  let ellipseOpacity = 0;
  if (swipeZone === "known") {
    const xRatio = Math.min(1, Math.max(0, (-gesture.x - 50) / 150));
    ellipseOpacity = 0.1 + 0.9 * xRatio;
  } else if (swipeZone === "unknown") {
    const xRatio = Math.min(1, Math.max(0, (gesture.x - 50) / 150));
    ellipseOpacity = 0.1 + 0.9 * xRatio;
  }

  // 履歴表示
  const renderCardHistory = (card: any) => {
    if (!card) return null;
    return (
      <View style={{ marginBottom: 10, alignItems: "center" }}>
        <Text style={{ fontSize: 15, color: "#333" }}>
          出題回数: {card.shownCount}　正解: {card.correctCount}　不正解:{" "}
          {card.incorrectCount}
        </Text>
        <Text style={{ fontSize: 15, color: "#333" }}>
          連続正解: {card.streak ?? 0}　最終:{" "}
          {card.lastResult === "correct"
            ? "○"
            : card.lastResult === "incorrect"
            ? "×"
            : "-"}
        </Text>
        <Text style={{ fontSize: 13, color: "#888" }}>
          最終回答日時:{" "}
          {card.lastAnsweredAt
            ? card.lastAnsweredAt.replace("T", " ").slice(0, 19)
            : "-"}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.ankiContainer}>
      {/* --- 半楕円の色エリア --- */}
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
        }}
        pointerEvents="none"
      >
        {swipeZone === "known" && (
          <View
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "60%",
              height: "100%",
              justifyContent: "center",
              alignItems: "flex-start",
            }}
          >
            <View
              style={{
                width: 320,
                height: 640,
                borderTopRightRadius: 320,
                borderBottomRightRadius: 320,
                backgroundColor: "#e0ffe0",
                opacity: ellipseOpacity,
                position: "absolute",
                left: -160,
                top: "10%",
              }}
            />
          </View>
        )}
        {swipeZone === "unknown" && (
          <View
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              width: "60%",
              height: "100%",
              justifyContent: "center",
              alignItems: "flex-end",
            }}
          >
            <View
              style={{
                width: 320,
                height: 640,
                borderTopLeftRadius: 320,
                borderBottomLeftRadius: 320,
                backgroundColor: "#ffe0e0",
                opacity: ellipseOpacity,
                position: "absolute",
                right: -160,
                top: "10%",
              }}
            />
          </View>
        )}
      </View>
      <Text style={styles.ankiTitle}>暗記アプリですよ……</Text>
      {renderCardHistory(currentCard)}
      <Text style={{ fontSize: 16, color: "#888", marginBottom: 8 }}>
        swipeZone: {swipeZone ?? "null"}
      </Text>
      {currentCard && (
        <View style={{ marginBottom: 8, alignItems: "center" }}>
          <Text style={{ fontSize: 14, color: "#333" }}>
            出題回数: {currentCard.shownCount}　正解: {currentCard.correctCount}
            　不正解: {currentCard.incorrectCount}　連続正解:{" "}
            {currentCard.streak ?? 0}
          </Text>
          <Text style={{ fontSize: 12, color: "#888" }}>
            最終回答:{" "}
            {currentCard.lastResult
              ? currentCard.lastResult === "correct"
                ? "正解"
                : currentCard.lastResult === "incorrect"
                ? "不正解"
                : "パス"
              : "-"}
            {currentCard.lastAnsweredAt
              ? `（${new Date(currentCard.lastAnsweredAt).toLocaleString()}）`
              : ""}
          </Text>
        </View>
      )}
      <Text style={styles.inputLabel}>学習するフォルダを選択……</Text>
      <View style={styles.pickerContainer}>
        {folders.length > 0 ? (
          <View>
            <Text style={styles.selectedFolderText}>
              選択中:{" "}
              {folders.find((f) => f.id === selectedFolderId)?.name || "未選択"}
            </Text>
            <View style={styles.folderSelectionButtons}>
              {folders.map((folder) => (
                <TouchableOpacity
                  key={folder.id}
                  style={[
                    styles.folderSelectButton,
                    selectedFolderId === folder.id &&
                      styles.selectedFolderButton,
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
          </View>
        ) : (
          <Text style={styles.noDataText}>
            フォルダがありません。カード管理画面で作成してくださいね。
          </Text>
        )}
      </View>
      {currentCard ? (
        <PanGestureHandler
          onGestureEvent={handleGestureEvent}
          onHandlerStateChange={handleHandlerStateChange}
          enabled={!animating}
        >
          <Animated.View
            style={[
              styles.cardWrapper,
              {
                transform: [
                  { translateX: cardAnim.x },
                  { translateY: cardAnim.y },
                ],
              },
              dragging && { opacity: 0.8 },
              dragging &&
                swipeZone === "known" && { backgroundColor: "#e0ffe0" },
              dragging &&
                swipeZone === "unknown" && { backgroundColor: "#ffe0e0" },
            ]}
          >
            <TouchableOpacity
              onPress={flipCard}
              activeOpacity={1}
              style={{ flex: 1 }}
            >
              <Animated.View
                style={[styles.card, styles.cardFront, frontAnimatedStyle]}
              >
                <Text style={styles.cardText}>{currentCard.front}</Text>
              </Animated.View>
              <Animated.View
                style={[styles.card, styles.cardBack, backAnimatedStyle]}
              >
                <Text style={styles.cardAnswerText}>{currentCard.back}</Text>
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>
        </PanGestureHandler>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardText}>カードがありません……</Text>
          <Text style={styles.subtitle}>
            このフォルダにカードがありません。下のボタンで追加してくださいね……
          </Text>
        </View>
      )}
      <View style={styles.buttonRow}>
        <Button
          title="前へ"
          onPress={goToPreviousCard}
          disabled={!currentCard}
        />
        <View style={{ width: 20 }} />
        <Button title="次へ" onPress={goToNextCard} disabled={!currentCard} />
      </View>
      <Button
        title="カードを追加・編集する……"
        onPress={() => {
          /* navigation.navigate("CardManagement") */
        }}
      />
      <View style={{ height: 10 }} />
      {/* ホームに戻るボタンはナビゲーションpropsが必要な場合は追加 */}
      <StatusBar style="auto" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2e7d32",
    marginBottom: 20,
  },
  cardBox: {
    width: "100%",
    minHeight: 180,
    backgroundColor: "#f1f8e9",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  cardText: {
    fontSize: 22, // 少し小さめに
    color: "#333",
    textAlign: "center",
    marginBottom: 10,
  },
  flipHint: { fontSize: 14, color: "#888", textAlign: "center" },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 20,
  },
  progress: { fontSize: 16, color: "#888", marginTop: 10 },
  emptyText: { fontSize: 20, color: "#888", textAlign: "center" },
  ankiContainer: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
    position: "relative",
  },
  ankiTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2e7d32",
    marginBottom: 16,
    textAlign: "center",
  },
  cardWrapper: {
    width: "100%",
    aspectRatio: 0.75,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    maxWidth: 340,
    alignSelf: "center",
    maxHeight: 340,
    minHeight: 180,
    backgroundColor: "#fff",
  },
  card: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    padding: 16,
    position: "relative",
    width: "100%",
    backgroundColor: "#f1f8e9",
  },
  cardFront: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    backgroundColor: "#f1f8e9",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBack: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    backgroundColor: "#e8f5e9",
    alignItems: "center",
    justifyContent: "center",
  },
  cardAnswerText: {
    fontSize: 20, // 少し小さめに
    color: "#2e7d32",
    textAlign: "center",
    fontWeight: "bold",
  },
  subtitle: { fontSize: 14, color: "#888", textAlign: "center", marginTop: 8 },
  inputLabel: { fontSize: 16, color: "#333", marginBottom: 8 },
  pickerContainer: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 16,
  },
  selectedFolderText: {
    fontSize: 16,
    color: "#2e7d32",
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  folderSelectionButtons: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  folderSelectButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#f1f8e9",
    margin: 4,
    elevation: 2,
  },
  selectedFolderButton: { backgroundColor: "#e8f5e9" },
  folderSelectButtonText: { fontSize: 16, color: "#333", textAlign: "center" },
  selectedFolderButtonTextActive: { color: "#2e7d32", fontWeight: "bold" },
  noDataText: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
    marginTop: 16,
  },
});

export default AnkiScreen;
