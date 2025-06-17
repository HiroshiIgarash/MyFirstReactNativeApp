import React, { useContext, useState, useRef, useMemo, useEffect } from "react";
import {
  View,
  Text,
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
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "../navigation/RootNavigator";

const AnkiScreen: React.FC = () => {
  const context = useContext(FlashcardContext);
  const flashcards = context?.flashcards || [];
  const setFlashcards = context?.setFlashcards;
  const route = useRoute<RouteProp<RootStackParamList, "Anki">>();
  const folderId = route.params?.folderId;

  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [cardResults, setCardResults] = useState<{
    [id: string]: "known" | "unknown" | undefined;
  }>({});
  const [dragging, setDragging] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [swipeZone, setSwipeZone] = useState<"known" | "unknown" | null>(null);
  const [gesture, setGesture] = useState({ x: 0, y: 0 });

  // Only use cards from the selected folder
  const filteredFlashcards = useMemo(
    () =>
      flashcards.filter((card) =>
        folderId ? card.folderId === folderId : false
      ),
    [flashcards, folderId]
  );

  const cardAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    setCurrentCardIndex(0);
    setShowAnswer(false);
    animatedValue.setValue(0);
    cardAnim.setValue({ x: 0, y: 0 });
  }, [folderId, filteredFlashcards.length]);

  // Show count increment
  useEffect(() => {
    if (filteredFlashcards.length === 0) return;
    const card = filteredFlashcards[currentCardIndex];
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
  }, [currentCardIndex, folderId]);

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

  // Swipe gesture logic
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

  const animateCardOut = (toX: number, toY: number, onComplete: () => void) => {
    setAnimating(true);
    Animated.timing(cardAnim, {
      toValue: { x: toX, y: toY },
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      cardAnim.setValue({ x: 0, y: 0 });
      setAnimating(false);
      setShowAnswer(false);
      setIsFlipped(false);
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

  const currentCard =
    filteredFlashcards.length > 0 ? filteredFlashcards[currentCardIndex] : null;

  // Swipe zone opacity
  let ellipseOpacity = 0;
  if (swipeZone === "known") {
    const xRatio = Math.min(1, Math.max(0, (-gesture.x - 50) / 150));
    ellipseOpacity = 0.1 + 0.9 * xRatio;
  } else if (swipeZone === "unknown") {
    const xRatio = Math.min(1, Math.max(0, (gesture.x - 50) / 150));
    ellipseOpacity = 0.1 + 0.9 * xRatio;
  }

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
      <Text style={styles.ankiTitle}>暗記アプリ</Text>
      {currentCard ? (
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
            </Animated.View>
          </PanGestureHandler>
          {/* パスボタン */}
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
  ankiTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2e7d32",
    marginBottom: 16,
    textAlign: "center",
  },
  cardWrapper: {
    width: 340,
    maxWidth: "100%",
    aspectRatio: 0.75,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    alignSelf: "center",
    maxHeight: 340,
    minHeight: 180,
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
    width: "100%",
    height: "100%",
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
    width: "100%",
    height: "100%",
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
