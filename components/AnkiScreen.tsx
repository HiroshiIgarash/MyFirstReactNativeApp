import React, { useContext, useState, useRef, useMemo, useEffect } from "react";
import {
  View,
  Text,
  Animated,
  Easing,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  PanGestureHandler,
  State as GestureState,
} from "react-native-gesture-handler";
import { FlashcardContext } from "../contexts/FlashcardContext";
import { useRoute } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Flashcard } from "../models/flashcard";

const SCREEN_WIDTH = Dimensions.get("window").width;

// 短期間隔 spaced repetition インターバル（分単位）
const INTERVALS_MINUTES = [5, 15, 60, 360, 1440, 4320, 10080]; // 5分, 15分, 1h, 6h, 1d, 3d, 7d
const MAX_INTERVAL_INDEX = INTERVALS_MINUTES.length - 1;

function getDueAndRandomizedCards(cards: Flashcard[]): Flashcard[] {
  const now = new Date();
  // nextDueが未設定または過去のもの、かつmasteredでないカードのみ対象
  const due = cards.filter(
    (c) => !c.mastered && (!c.nextDue || new Date(c.nextDue) <= now)
  );
  // シャッフル（Fisher-Yates）
  for (let i = due.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [due[i], due[j]] = [due[j], due[i]];
  }
  return due;
}

const AnkiScreen: React.FC = () => {
  const context = useContext(FlashcardContext);
  const flashcards = context?.flashcards || [];
  const setFlashcards = context?.setFlashcards;
  const route = useRoute<RouteProp<RootStackParamList, "Anki">>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const folderId = route.params?.folderId;
  const insets = useSafeAreaInsets();

  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [cardResults, setCardResults] = useState<{
    [id: string]: "known" | "unknown" | undefined;
  }>({});
  const [dragging, setDragging] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [swipeZone, setSwipeZone] = useState<"known" | "unknown" | null>(null);
  const [gesture, setGesture] = useState({ x: 0, y: 0 });
  const [sessionFinished, setSessionFinished] = useState(false);

  // セッション用カード配列（抽出＆シャッフル済み）
  const [sessionCards, setSessionCards] = useState<Flashcard[]>([]);

  // フォルダ変更時のみ、該当カードを抽出＆シャッフル
  useEffect(() => {
    if (!folderId) {
      setSessionCards([]);
      setCurrentCardIndex(0);
      setShowAnswer(false);
      return;
    }
    // フォルダ内、dueなカードのみ抽出
    const now = new Date();
    const due = flashcards.filter(
      (c) =>
        c.folderId === folderId &&
        !c.mastered &&
        (!c.nextDue || new Date(c.nextDue) <= now)
    );
    // シャッフル（Fisher-Yates）
    for (let i = due.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [due[i], due[j]] = [due[j], due[i]];
    }
    setSessionCards(due);
    setCurrentCardIndex(0);
    setShowAnswer(false);
  }, [folderId]);

  const cardAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [isFlipped, setIsFlipped] = useState(false);

  // Show count increment
  useEffect(() => {
    if (sessionCards.length === 0) return;
    const card = sessionCards[currentCardIndex];
    if (!card) return;
    setFlashcards &&
      setFlashcards((prev) => {
        const prevCard = prev.find((c) => c.id === card.id);
        if (!prevCard) return prev;
        if (prevCard.shownCount > card.shownCount) return prev;
        return prev.map((c) =>
          c.id === card.id ? { ...c, shownCount: c.shownCount + 1 } : c
        );
      });
  }, [currentCardIndex, folderId, sessionCards.length]);

  // Card flip animation
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

  // --- spaced repetition用: 次回復習日時を計算 ---
  function getNextDue(intervalIndex: number): string {
    const now = new Date();
    const minutes =
      INTERVALS_MINUTES[Math.min(intervalIndex, MAX_INTERVAL_INDEX)];
    return new Date(now.getTime() + minutes * 60 * 1000).toISOString();
  }

  // Swipe gesture logic
  const handleGestureEvent = (event: any) => {
    if (animating) return; // アニメーション中は無視
    const { translationX, translationY } = event.nativeEvent;
    setGesture({ x: translationX, y: translationY });
    if (translationX < -50) {
      setSwipeZone("known");
    } else if (translationX > 50) {
      setSwipeZone("unknown");
    } else {
      setSwipeZone(null);
    }
    cardAnim.setValue({ x: translationX, y: translationY });
  };

  const animateCardOut = (toX: number, toY: number, onComplete: () => void) => {
    setAnimating(true);
    Animated.timing(cardAnim, {
      toValue: { x: toX, y: toY },
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      setShowAnswer(false);
      setIsFlipped(false);
      animatedValue.setValue(0);
      setTimeout(() => {
        cardAnim.setValue({ x: 0, y: 0 });
        setAnimating(false);
        onComplete();
      }, 50); // ← ここを50msに短縮
    });
  };

  const handleHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === GestureState.END && !animating) {
      const { translationX, translationY } = event.nativeEvent;
      let swiped = false;
      const card = sessionCards[currentCardIndex];
      if (translationX < -50) {
        // 正解（known）
        setCardResults((prev) => ({ ...prev, [card?.id || ""]: "known" }));
        setFlashcards &&
          setFlashcards((prev) =>
            prev.map((c) => {
              if (c.id !== card.id) return c;
              const prevIdx = c.intervalIndex ?? 0;
              const nextIdx = Math.min(
                (c.intervalIndex ?? 0) + 1,
                MAX_INTERVAL_INDEX
              );
              const mastered = nextIdx === MAX_INTERVAL_INDEX;
              return {
                ...c,
                correctCount: (c.correctCount || 0) + 1,
                lastAnsweredAt: new Date().toISOString(),
                lastResult: "correct",
                streak: (c.streak || 0) + 1,
                intervalIndex: nextIdx,
                nextDue: getNextDue(nextIdx),
                mastered,
              };
            })
          );
        animateCardOut(-SCREEN_WIDTH * 1.2, -SCREEN_WIDTH * 0.8, () =>
          goToNextCard()
        ); // 左上に大きく場外へ
        swiped = true;
      } else if (translationX > 50) {
        // 不正解（unknown）
        setCardResults((prev) => ({ ...prev, [card?.id || ""]: "unknown" }));
        setFlashcards &&
          setFlashcards((prev) =>
            prev.map((c) => {
              if (c.id !== card.id) return c;
              return {
                ...c,
                incorrectCount: (c.incorrectCount || 0) + 1,
                lastAnsweredAt: new Date().toISOString(),
                lastResult: "incorrect",
                streak: 0,
                intervalIndex: 0,
                nextDue: getNextDue(0),
                mastered: false,
              };
            })
          );
        animateCardOut(SCREEN_WIDTH * 1.2, -SCREEN_WIDTH * 0.8, () =>
          goToNextCard()
        ); // 右上に大きく場外へ
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
    if (sessionCards.length === 0) {
      alert("まだこのフォルダにカードがありません……！");
      return;
    }
    if (currentCardIndex < sessionCards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else {
      setSessionFinished(true);
    }
  };

  // --- セッション再スタート用 ---
  const restartSession = () => {
    if (!folderId) return;
    // フォルダ内、dueなカードのみ抽出＆シャッフル
    const now = new Date();
    const due = flashcards.filter(
      (c) =>
        c.folderId === folderId &&
        !c.mastered &&
        (!c.nextDue || new Date(c.nextDue) <= now)
    );
    for (let i = due.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [due[i], due[j]] = [due[j], due[i]];
    }
    setSessionCards(due);
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setSessionFinished(false);
  };

  const currentCard =
    sessionCards.length > 0 ? sessionCards[currentCardIndex] : null;

  // Swipe zone opacity
  let ellipseOpacity = 0;
  if (swipeZone === "known") {
    const xRatio = Math.min(1, Math.max(0, (-gesture.x - 50) / 150));
    ellipseOpacity = 0.1 + 0.9 * xRatio;
  } else if (swipeZone === "unknown") {
    const xRatio = Math.min(1, Math.max(0, (gesture.x - 50) / 150));
    ellipseOpacity = 0.1 + 0.9 * xRatio;
  }

  const folder = context?.folders?.find((f) => f.id === folderId);

  return (
    <View style={styles.ankiContainer}>
      {/* 閉じるボタン・フォルダ名・カウント・swipeZone色エリアなど復活 */}
      <TouchableOpacity
        style={[styles.closeButton, { top: insets.top + 8 }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
        accessibilityLabel="閉じる"
      >
        <Text style={styles.closeButtonText}>×</Text>
      </TouchableOpacity>
      {folder && (
        <>
          <Text style={styles.folderName}>{folder.name}</Text>
          <Text style={styles.cardCount}>
            {sessionCards.length > 0
              ? `${currentCardIndex + 1} / ${sessionCards.length}`
              : `0 / 0`}
          </Text>
        </>
      )}
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
      {sessionFinished ? (
        <View
          style={[
            styles.card,
            { minHeight: 180, height: undefined, justifyContent: "center" },
          ]}
        >
          <Text
            style={[
              styles.cardText,
              {
                fontSize: 24,
                color: "#1976d2",
                fontWeight: "bold",
                marginBottom: 16,
              },
            ]}
          >
            すべてのカードを学習しました！お疲れ様です！
          </Text>
          <TouchableOpacity
            style={[
              styles.passButton,
              { backgroundColor: "#1976d2", marginBottom: 12 },
            ]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={[styles.passButtonText, { color: "#fff" }]}>
              学習タブに戻る
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.passButton}
            onPress={restartSession}
            activeOpacity={0.8}
          >
            <Text style={styles.passButtonText}>もう一度学習する</Text>
          </TouchableOpacity>
        </View>
      ) : currentCard ? (
        <>
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
              ]}
            >
              {/* カード裏表アニメーション・flipCardも一時コメントアウト */}
              <TouchableOpacity
                onPress={flipCard}
                activeOpacity={1}
                style={{ flex: 1, width: "100%" }}
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
              {/* <View style={styles.card}>
                <Text style={styles.cardText}>{currentCard.front}</Text>
              </View> */}
            </Animated.View>
          </PanGestureHandler>
          {/* パスボタンも一時コメントアウト */}
          <TouchableOpacity
            style={styles.passButton}
            onPress={() => {
              if (!currentCard) return;
              setFlashcards &&
                setFlashcards((prev) =>
                  prev.map((c) =>
                    c.id !== currentCard.id
                      ? c
                      : {
                          ...c,
                          passCount: (c.passCount || 0) + 1,
                          lastAnsweredAt: new Date().toISOString(),
                          lastResult: "pass",
                          streak: 0,
                          intervalIndex: 0,
                          nextDue: getNextDue(0),
                          mastered: false,
                        }
                  )
                );
              goToNextCard();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.passButtonText}>パス</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardText}>カードがありません……</Text>
        </View>
      )}
      <StatusBar style="auto" />
    </View>
  );
};

const styles = StyleSheet.create({
  ankiContainer: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    position: "absolute",
    top: 32,
    left: 16,
    zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  closeButtonText: {
    fontSize: 28,
    color: "#444",
    fontWeight: "bold",
    lineHeight: 36,
    textAlign: "center",
  },
  folderName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1976d2",
    marginTop: 8,
    marginBottom: 4,
    textAlign: "center",
    alignSelf: "center",
    letterSpacing: 1,
  },
  cardCount: {
    fontSize: 15,
    color: "#888",
    marginBottom: 10,
    textAlign: "center",
    alignSelf: "center",
    letterSpacing: 0.5,
  },
  cardWrapper: {
    width: "95%",
    maxWidth: 600,
    borderRadius: 16,
    overflow: "visible", // ← ここをvisibleに変更
    alignSelf: "center",
    height: 360,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    display: "flex",
    flexDirection: "column",
  },
  card: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    padding: 16,
    position: "relative",
    width: "100%",
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#bbb",
  },
  cardFront: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
    borderWidth: 2,
    borderColor: "#bbb",
  },
  cardBack: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
    borderWidth: 2,
    borderColor: "#bbb",
  },
  cardText: {
    fontSize: 22,
    color: "#333",
    textAlign: "center",
    marginBottom: 10,
  },
  cardAnswerText: {
    fontSize: 20,
    color: "#2e7d32",
    textAlign: "center",
    fontWeight: "bold",
  },
  passButton: {
    marginTop: 18,
    backgroundColor: "#eee",
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 48,
    alignSelf: "center",
    elevation: 2,
  },
  passButtonText: {
    color: "#888",
    fontWeight: "bold",
    fontSize: 20,
    textAlign: "center",
  },
});

export default AnkiScreen;
