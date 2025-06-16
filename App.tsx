import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import {
  Button,
  StyleSheet,
  Text,
  View,
  Animated,
  Easing,
  TouchableOpacity,
  TextInput,
  FlatList,
} from "react-native";
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import React, {
  useState,
  useEffect,
  useRef,
  createContext,
  useContext,
  useMemo, // 追加
} from "react";
import * as DocumentPicker from "expo-document-picker";
import Papa from "papaparse";
import {
  PanGestureHandler,
  State as GestureState,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";

// === フラッシュカードの型定義 ===
interface Flashcard {
  id: string; // ユニークなID
  front: string;
  back: string;
  folderId: string; // どのフォルダに属するかを示すIDを追加
  correctCount: number; // 正解回数
  incorrectCount: number; // 不正解回数
  passCount: number; // パス回数
  shownCount: number; // 出題回数
  lastAnsweredAt?: string; // 最後に回答した日時（ISO文字列）
  lastResult?: "correct" | "incorrect" | "pass";
  streak?: number; // 連続正解数
}

// === フォルダの型定義 ===
interface Folder {
  id: string; // ユニークなID
  name: string;
}

// === Context API の設定 ===
interface FlashcardContextType {
  flashcards: Flashcard[];
  addFlashcard: (front: string, back: string, folderId: string) => void; // folderId を追加
  folders: Folder[]; // フォルダのリストを追加
  addFolder: (name: string) => void; // フォルダ追加関数を追加
  editFlashcard?: (id: string, front: string, back: string) => void; // 編集関数を追加
  deleteFlashcard?: (id: string) => void; // 削除関数を追加
  setFlashcards?: React.Dispatch<React.SetStateAction<Flashcard[]>>; // 追加: 履歴更新用
}

// FlashcardContext を作成します。初期値は null ですが、Provider で上書きされます
const FlashcardContext = createContext<FlashcardContextType | null>(null);

// RootStackParamList に新しい画面を追加します
type RootStackParamList = {
  Home: undefined;
  Details: undefined; // DetailsScreen は残しておきますが、必要なければ削除できます
  Anki: undefined;
  CardManagement: undefined;
  FolderManagement: undefined;
  FolderCards: { folderId: string }; // フォルダ内カード一覧画面を追加
};

// 各画面のPropsの型を定義します
type AnkiScreenProps = NativeStackScreenProps<RootStackParamList, "Anki">;
type HomeScreenProps = NativeStackScreenProps<RootStackParamList, "Home">;
type DetailsScreenProps = NativeStackScreenProps<RootStackParamList, "Details">;
type CardManagementScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "CardManagement"
>;
type FolderManagementScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "FolderManagement"
>;

// === FolderCardsScreen コンポーネント ===
const FolderCardsScreen: React.FC<
  NativeStackScreenProps<RootStackParamList, "FolderCards">
> = ({ route, navigation }) => {
  const { folderId } = route.params;
  const flashcardContext = useContext(FlashcardContext);
  if (!flashcardContext) {
    return <Text>エラー: カードデータをロードできません。</Text>;
  }
  const { flashcards, folders } = flashcardContext;
  const [editCardId, setEditCardId] = useState<string | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");
  const [cards, setCards] = useState<Flashcard[]>(
    flashcards.filter((card) => card.folderId === folderId)
  );
  const folder = folders.find((f) => f.id === folderId);

  useEffect(() => {
    setCards(flashcards.filter((card) => card.folderId === folderId));
  }, [flashcards, folderId]);

  // --- 編集・削除機能 ---
  const handleEdit = (cardId: string) => {
    const card = cards.find((c) => c.id === cardId);
    if (card) {
      setEditCardId(cardId);
      setEditFront(card.front);
      setEditBack(card.back);
    }
  };
  const handleEditSave = () => {
    if (!editCardId) return;
    if (editFront.trim() === "" || editBack.trim() === "") {
      alert("問題と答えを入力してください……！");
      return;
    }
    // Contextのflashcardsを直接編集できないので、App側にeditFlashcardを追加するのが本来ですが、
    // ここではsetFlashcardsをAppに追加してContextに渡す形にします。
    if (flashcardContext.editFlashcard) {
      flashcardContext.editFlashcard(editCardId, editFront, editBack);
    }
    setEditCardId(null);
    setEditFront("");
    setEditBack("");
  };
  const handleEditCancel = () => {
    setEditCardId(null);
    setEditFront("");
    setEditBack("");
  };
  const handleDelete = (cardId: string) => {
    if (window.confirm && !window.confirm("本当に削除しますか……？")) return;
    if (flashcardContext.deleteFlashcard) {
      flashcardContext.deleteFlashcard(cardId);
    }
  };

  return (
    <View style={styles.cardManagementContainer}>
      <Text style={styles.cardManagementTitle}>
        {folder
          ? `「${folder.name}」のカード一覧（${cards.length}枚）`
          : "フォルダが見つかりません……"}
      </Text>
      {cards.length === 0 ? (
        <View style={{ alignItems: "center", marginTop: 40 }}>
          <Text style={styles.noDataText}>
            このフォルダにはカードがありません……
          </Text>
          <Text style={{ fontSize: 40, marginTop: 20 }}>📭</Text>
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(item, idx) => `${item.id}_${idx}`}
          renderItem={({ item }) =>
            editCardId === item.id ? (
              <View style={styles.cardListCard}>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={styles.textInput}
                    value={editFront}
                    onChangeText={setEditFront}
                    placeholder="問題（表面）"
                  />
                  <TextInput
                    style={styles.textInput}
                    value={editBack}
                    onChangeText={setEditBack}
                    placeholder="答え（裏面）"
                  />
                </View>
                <View style={styles.cardListButtonRow}>
                  <TouchableOpacity
                    style={styles.cardListEditButton}
                    onPress={handleEditSave}
                  >
                    <Text style={styles.cardListEditButtonText}>保存</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cardListDeleteButton}
                    onPress={handleEditCancel}
                  >
                    <Text style={styles.cardListDeleteButtonText}>
                      キャンセル
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.cardListCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardListFront}>{item.front}</Text>
                  <Text style={styles.cardListBack}>{item.back}</Text>
                </View>
                <View style={styles.cardListButtonRow}>
                  <TouchableOpacity
                    style={styles.cardListEditButton}
                    onPress={() => handleEdit(item.id)}
                  >
                    <Text style={styles.cardListEditButtonText}>編集</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cardListDeleteButton}
                    onPress={() => handleDelete(item.id)}
                  >
                    <Text style={styles.cardListDeleteButtonText}>削除</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          }
          style={styles.folderListTall}
        />
      )}
      <View style={{ height: 20 }} />
      <Button title="戻る" onPress={() => navigation.goBack()} />
      <StatusBar style="auto" />
    </View>
  );
};
// === FolderCardsScreen コンポーネントの追加ここまで ===

// === FolderManagementScreen コンポーネント ===
const FolderManagementScreen: React.FC<FolderManagementScreenProps> = ({
  navigation,
}) => {
  const [newFolderName, setNewFolderName] = useState("");

  const flashcardContext = useContext(FlashcardContext);
  if (!flashcardContext) {
    return <Text>エラー: フォルダデータをロードできません。</Text>;
  }
  const { folders, addFolder } = flashcardContext;

  const handleAddFolder = () => {
    if (newFolderName.trim() === "") {
      alert("フォルダ名を入力してくださいね……！");
      return;
    }
    // 既に同じ名前のフォルダがないかチェック (簡易的)
    if (folders.some((folder) => folder.name === newFolderName.trim())) {
      alert("その名前のフォルダは既に存在します……！");
      return;
    }
    addFolder(newFolderName.trim());
    setNewFolderName("");
    alert("フォルダを追加しました！");
  };

  return (
    <View style={styles.folderManagementContainer}>
      <Text style={styles.cardManagementTitle}>フォルダ管理ですよ……</Text>

      <View style={styles.inputSection}>
        <TextInput
          style={styles.textInput}
          placeholder="新しいフォルダ名を入力……"
          value={newFolderName}
          onChangeText={setNewFolderName}
        />
        <Button title="フォルダを追加" onPress={handleAddFolder} />
      </View>

      <Text style={styles.subHeading}>--- 既存のフォルダ ---</Text>
      {folders.length === 0 ? (
        <Text style={styles.noDataText}>フォルダがありません……</Text>
      ) : (
        <FlatList
          data={folders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.folderItem}
              onPress={() =>
                navigation.navigate("FolderCards", { folderId: item.id })
              }
            >
              <Text style={styles.folderName}>{item.name}</Text>
            </TouchableOpacity>
          )}
          style={styles.folderList}
        />
      )}

      <View style={{ height: 20 }} />
      <Button title="戻る" onPress={() => navigation.goBack()} />
      <StatusBar style="auto" />
    </View>
  );
};
// === FolderManagementScreen コンポーネントの追加ここまで ===

// === CardManagementScreen コンポーネント ===
const CardManagementScreen: React.FC<CardManagementScreenProps> = ({
  navigation,
}) => {
  const [frontText, setFrontText] = useState("");
  const [backText, setBackText] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const flashcardContext = useContext(FlashcardContext);
  if (!flashcardContext) {
    return <Text>エラー: カードデータをロードできません。</Text>;
  }
  const { addFlashcard, folders } = flashcardContext;

  useEffect(() => {
    if (folders.length > 0 && selectedFolderId === null) {
      setSelectedFolderId(folders[0].id);
    }
  }, [folders, selectedFolderId]);

  const handleAddCard = () => {
    if (frontText.trim() === "" || backText.trim() === "") {
      alert("問題と答えを入力してくださいね……！");
      return;
    }
    if (selectedFolderId === null) {
      alert("フォルダを選択してくださいね……！");
      return;
    }
    addFlashcard(frontText, backText, selectedFolderId);
    setFrontText("");
    setBackText("");
    alert("カードを追加しました！");
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
      // サンプル: ヘッダーは front, back であることを想定
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
    <View style={styles.cardManagementContainer}>
      <Text style={styles.cardManagementTitle}>新しいカードを追加する……</Text>

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
        placeholder="問題（表面）を入力……"
        value={frontText}
        onChangeText={setFrontText}
      />
      <TextInput
        style={styles.textInput}
        placeholder="答え（裏面）を入力……"
        value={backText}
        onChangeText={setBackText}
      />

      <Text style={styles.inputLabel}>フォルダを選択……</Text>
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
            フォルダがありません。先にフォルダを作成してくださいね。
          </Text>
        )}
      </View>

      <Button
        title="カードを追加"
        onPress={handleAddCard}
        disabled={folders.length === 0}
      />
      <View style={{ height: 20 }} />
      <Button title="戻る" onPress={() => navigation.goBack()} />
      <StatusBar style="auto" />
    </View>
  );
};

// === AnkiScreen コンポーネント ---
const AnkiScreen: React.FC<AnkiScreenProps> = ({ navigation }) => {
  const flashcardContext = useContext(FlashcardContext);
  if (!flashcardContext) {
    return <Text>エラー: カードデータをロードできません。</Text>;
  }
  const { flashcards, folders, setFlashcards } = flashcardContext;

  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [cardResults, setCardResults] = useState<{
    [id: string]: "known" | "unknown" | undefined;
  }>({});
  const [dragging, setDragging] = useState(false);
  const [animating, setAnimating] = useState(false);
  // --- 追加: スワイプゾーンの状態 ---
  const [swipeZone, setSwipeZone] = useState<"known" | "unknown" | null>(null);

  // --- 追加: スワイプ中の座標をstateで管理 ---
  const [gesture, setGesture] = useState({ x: 0, y: 0 });

  // --- filteredFlashcardsをuseMemoでメモ化 ---
  const filteredFlashcards = useMemo(
    () =>
      flashcards.filter((card) =>
        selectedFolderId ? card.folderId === selectedFolderId : true
      ),
    [flashcards, selectedFolderId]
  );

  // --- カードのアニメーション ---
  const cardAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

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

  const animatedValue = useRef(new Animated.Value(0)).current;
  const [isFlipped, setIsFlipped] = useState(false);

  // --- front/backAnimatedStyleの定義をここに移動 ---
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

  // --- 履歴更新: 出題時 shownCount をインクリメント ---
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

  // --- スワイプ判定・アニメーション拡張 ---
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
    // カードのアニメーションも反映
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
      onComplete();
    });
  };

  // --- スワイプ時に履歴値を更新 ---
  const handleHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === GestureState.END && !animating) {
      const { translationX, translationY } = event.nativeEvent;
      let swiped = false;
      const card = filteredFlashcards[currentCardIndex];
      if (translationX < -50 && translationY < -40) {
        setCardResults((prev) => ({
          ...prev,
          [card?.id || ""]: "known",
        }));
        // 履歴値を更新
        setFlashcards &&
          setFlashcards((prev: Flashcard[]) =>
            prev.map((c) => {
              if (c.id !== card.id) return c;
              const now = new Date().toISOString();
              return {
                ...c,
                correctCount: (c.correctCount || 0) + 1,
                lastAnsweredAt: now,
                lastResult: "correct",
                streak: (c.streak || 0) + 1,
              };
            })
          );
        animateCardOut(-300, -300, () => goToNextCard());
        swiped = true;
      } else if (translationX > 50 && translationY < -40) {
        setCardResults((prev) => ({
          ...prev,
          [card?.id || ""]: "unknown",
        }));
        // 履歴値を更新
        setFlashcards &&
          setFlashcards((prev: Flashcard[]) =>
            prev.map((c) => {
              if (c.id !== card.id) return c;
              const now = new Date().toISOString();
              return {
                ...c,
                incorrectCount: (c.incorrectCount || 0) + 1,
                lastAnsweredAt: now,
                lastResult: "incorrect",
                streak: 0,
              };
            })
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

  // --- 透明度計算: swipeZoneに入ったときのスワイプ量で濃さを変える ---
  let ellipseOpacity = 0;
  if (swipeZone === "known") {
    // X軸のみで透明度を決定（左上: Xが-50→-200で最大濃度）
    const xRatio = Math.min(1, Math.max(0, (-gesture.x - 50) / 150));
    ellipseOpacity = 0.1 + 0.9 * xRatio; // 0.1〜1.0
  } else if (swipeZone === "unknown") {
    // X軸のみで透明度を決定（右上: Xが50→200で最大濃度）
    const xRatio = Math.min(1, Math.max(0, (gesture.x - 50) / 150));
    ellipseOpacity = 0.1 + 0.9 * xRatio; // 0.1〜1.0
  }

  // --- 履歴表示用 ---
  const renderCardHistory = (card: Flashcard | null) => {
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
      {/* --- 履歴表示 --- */}
      {renderCardHistory(currentCard)}
      {/* --- デバッグ用: swipeZoneの値を表示 --- */}
      <Text style={{ fontSize: 16, color: "#888", marginBottom: 8 }}>
        swipeZone: {swipeZone ?? "null"}
      </Text>
      {/* --- 学習履歴の表示 --- */}
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
              cardResults[currentCard.id] === "known" && {
                borderColor: "#4caf50",
                borderWidth: 3,
              },
              cardResults[currentCard.id] === "unknown" && {
                borderColor: "#f44336",
                borderWidth: 3,
              },
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
        title="カードを追加・編集する……s"
        onPress={() => navigation.navigate("CardManagement")}
      />
      <View style={{ height: 10 }} />
      <Button title="ホームに戻る……" onPress={() => navigation.goBack()} />

      <View style={{ marginTop: 10 }}>
        <Text style={{ fontSize: 14, color: "#4caf50" }}>
          左上スワイプ: 覚えた
        </Text>
        <Text style={{ fontSize: 14, color: "#f44336" }}>
          右上スワイプ: 覚えられなかった
        </Text>
      </View>

      <StatusBar style="auto" />
    </View>
  );
};

// === HomeScreen コンポーネント ===
const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  // カウンターやAPIデータの状態は削除しました
  // useEffect も削除しました

  return (
    <View style={styles.homeContainer}>
      <Text style={styles.homeTitle}>暗記アプリへようこそ！</Text>
      <Text style={styles.homeSubtitle}>
        学習を始めたり、カードやフォルダを管理しましょう。
      </Text>

      <View style={styles.homeButtonSection}>
        <Button
          title="暗記を始める……"
          onPress={() => navigation.navigate("Anki")}
        />
        <View style={{ height: 15 }} />
        <Button
          title="カードを管理する……"
          onPress={() => navigation.navigate("CardManagement")}
        />
        <View style={{ height: 15 }} />
        <Button
          title="フォルダを管理する……"
          onPress={() => navigation.navigate("FolderManagement")}
        />
      </View>

      <StatusBar style="auto" />
    </View>
  );
};

// === DetailsScreen コンポーネント ===
const DetailsScreen: React.FC<DetailsScreenProps> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>詳細画面です</Text>
      <Text style={styles.subtitle}>戻るボタンを押してください</Text>
      <Button title="戻る" onPress={() => navigation.goBack()} />
      <StatusBar style="auto" />
    </View>
  );
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// === App コンポーネントに FlashcardContext.Provider を追加 ===
export default function App() {
  const [folders, setFolders] = useState<Folder[]>([
    { id: "uncategorized", name: "未分類" },
  ]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([
    {
      id: "1",
      front: "りんご",
      back: "apple",
      folderId: "uncategorized",
      correctCount: 0,
      incorrectCount: 0,
      passCount: 0,
      shownCount: 0,
      lastAnsweredAt: undefined,
      lastResult: undefined,
      streak: 0,
    },
    {
      id: "2",
      front: "みかん",
      back: "orange",
      folderId: "uncategorized",
      correctCount: 0,
      incorrectCount: 0,
      passCount: 0,
      shownCount: 0,
      lastAnsweredAt: undefined,
      lastResult: undefined,
      streak: 0,
    },
    {
      id: "3",
      front: "ぶどう",
      back: "grape",
      folderId: "uncategorized",
      correctCount: 0,
      incorrectCount: 0,
      passCount: 0,
      shownCount: 0,
      lastAnsweredAt: undefined,
      lastResult: undefined,
      streak: 0,
    },
    {
      id: "4",
      front: "ばなな",
      back: "banana",
      folderId: "uncategorized",
      correctCount: 0,
      incorrectCount: 0,
      passCount: 0,
      shownCount: 0,
      lastAnsweredAt: undefined,
      lastResult: undefined,
      streak: 0,
    },
    {
      id: "5",
      front: "地球の衛星",
      back: "月",
      folderId: "uncategorized",
      correctCount: 0,
      incorrectCount: 0,
      passCount: 0,
      shownCount: 0,
      lastAnsweredAt: undefined,
      lastResult: undefined,
      streak: 0,
    },
  ]);
  const [loading, setLoading] = useState(true);

  // --- AsyncStorageから復元 ---
  useEffect(() => {
    (async () => {
      try {
        const [fc, fd] = await Promise.all([
          AsyncStorage.getItem("flashcards"),
          AsyncStorage.getItem("folders"),
        ]);
        if (fc) setFlashcards(JSON.parse(fc));
        if (fd) setFolders(JSON.parse(fd));
      } catch (e) {
        // 読み込み失敗時は初期値のまま
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // --- flashcards/folders変更時に保存 ---
  useEffect(() => {
    if (!loading) {
      AsyncStorage.setItem("flashcards", JSON.stringify(flashcards));
    }
  }, [flashcards, loading]);
  useEffect(() => {
    if (!loading) {
      AsyncStorage.setItem("folders", JSON.stringify(folders));
    }
  }, [folders, loading]);

  // カードを追加する関数
  const addFlashcard = (front: string, back: string, folderId: string) => {
    const newCard: Flashcard = {
      id: Date.now().toString(),
      front,
      back,
      folderId,
      correctCount: 0,
      incorrectCount: 0,
      passCount: 0,
      shownCount: 0,
      lastAnsweredAt: undefined,
      lastResult: undefined,
      streak: 0,
    };
    setFlashcards((prevCards) => [...prevCards, newCard]);
  };

  // フォルダを追加する関数
  const addFolder = (name: string) => {
    const newFolder: Folder = {
      id: Date.now().toString(), // 簡単なユニークIDを生成
      name,
    };
    setFolders((prevFolders) => [...prevFolders, newFolder]);
  };

  // カードを編集する関数
  const editFlashcard = (id: string, front: string, back: string) => {
    setFlashcards((prev) =>
      prev.map((card) => (card.id === id ? { ...card, front, back } : card))
    );
  };

  // カードを削除する関数
  const deleteFlashcard = (id: string) => {
    setFlashcards((prev) => prev.filter((card) => card.id !== id));
  };

  const flashcardContextValue: FlashcardContextType = {
    flashcards,
    addFlashcard,
    folders,
    addFolder,
    editFlashcard,
    deleteFlashcard,
    setFlashcards, // 追加
  };

  if (loading) {
    return (
      <GestureHandlerRootView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 20, color: "#888" }}>
          データを読み込み中……
        </Text>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <FlashcardContext.Provider value={flashcardContextValue}>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ title: "ようこそ" }}
            />
            <Stack.Screen
              name="Details"
              component={DetailsScreen}
              options={{ title: "詳細" }}
            />
            <Stack.Screen
              name="Anki"
              component={AnkiScreen}
              options={{ title: "暗記アプリ" }}
            />
            <Stack.Screen
              name="CardManagement"
              component={CardManagementScreen}
              options={{ title: "カード管理" }}
            />
            <Stack.Screen
              name="FolderManagement"
              component={FolderManagementScreen}
              options={{ title: "フォルダ管理" }}
            />
            <Stack.Screen
              name="FolderCards"
              component={FolderCardsScreen}
              options={{ title: "カード一覧" }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </FlashcardContext.Provider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  // 既存のコンテナ、タイトル、サブタイトルスタイルはHomeScreenから移動し、名前をhomeContainerなどに変更
  // Home画面用の新しいスタイル
  homeContainer: {
    flex: 1,
    backgroundColor: "#e8f5e9", // 明るい緑系の背景
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  homeTitle: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#2e7d32", // 深い緑色
    textAlign: "center",
  },
  homeSubtitle: {
    fontSize: 18,
    color: "#4caf50", // 明るい緑色
    marginBottom: 40,
    textAlign: "center",
    paddingHorizontal: 10,
  },
  homeButtonSection: {
    width: "80%",
    // ボタンの並び順や間隔は、Buttonコンポーネント自体やその親Viewで調整します
  },

  // APIデータ関連のスタイルは削除しました
  // apiDataContainer: { ... }, apiDataTitle: { ... }, postItem: { ... },
  // postTitle: { ... }, postBody: { ... },

  // 元々のcontainer, title, subtitle（DetailsScreenで利用）
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: "gray",
    marginBottom: 20,
  },

  // AnkiScreen 用のスタイル
  ankiContainer: {
    flex: 1,
    backgroundColor: "#f0f8ff", // 少し薄い青の背景
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  ankiTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30,
    color: "#333",
  },
  cardWrapper: {
    width: "90%",
    height: 200,
    marginBottom: 30,
  },
  card: {
    width: "100%",
    height: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
    padding: 20,
    position: "absolute",
    backfaceVisibility: "hidden",
  },
  cardFront: {
    // 表面のスタイル
  },
  cardBack: {
    backgroundColor: "#e0ffe0",
    transform: [{ rotateY: "180deg" }],
  },
  cardText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#000",
  },
  cardAnswerText: {
    fontSize: 24,
    color: "#555",
    fontStyle: "italic",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "80%",
    marginBottom: 20,
  },
  // カード管理画面用のスタイル
  cardManagementContainer: {
    flex: 1,
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
    alignSelf: "flex-start", // 左寄せ
    marginLeft: "5%", // TextInput と合わせる
  },
  // フォルダ選択ボタン用のスタイル（簡易Pickerの代わり）
  pickerContainer: {
    width: "90%",
    marginBottom: 20,
  },
  selectedFolderText: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    color: "#007bff",
  },
  folderSelectionButtons: {
    flexDirection: "row",
    flexWrap: "wrap", // 折り返し
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
  // フォルダ管理画面の新しいスタイル
  folderManagementContainer: {
    flex: 1,
    backgroundColor: "#f8f8f8",
    alignItems: "center",
    padding: 20,
    paddingTop: 80,
  },
  inputSection: {
    width: "90%",
    marginBottom: 30,
    alignItems: "center",
  },
  subHeading: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#555",
  },
  folderList: {
    width: "90%",
    maxHeight: 300, // 高さを制限してスクロール可能に
  },
  // --- 高さを大きくした新しいスタイル ---
  folderListTall: {
    width: "90%",
    maxHeight: 500, // 高さを大きく
    minHeight: 200,
  },
  folderItem: {
    backgroundColor: "#ffffff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    flexDirection: "row", // ボタンなどを横に並べるため
    justifyContent: "space-between",
    alignItems: "center",
  },
  folderName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },

  // --- カード一覧画面用のリッチなカードスタイル追加 ---
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
    flexDirection: "row",
    alignItems: "center",
  },
  cardListFront: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 6,
  },
  cardListBack: {
    fontSize: 16,
    color: "#00796b",
    fontStyle: "italic",
  },
  cardListButtonRow: {
    flexDirection: "column",
    marginLeft: 12,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  cardListEditButton: {
    backgroundColor: "#e3f2fd",
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  cardListEditButtonText: {
    color: "#1976d2",
    fontWeight: "bold",
    fontSize: 14,
  },
  cardListDeleteButton: {
    backgroundColor: "#ffebee",
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  cardListDeleteButtonText: {
    color: "#d32f2f",
    fontWeight: "bold",
    fontSize: 14,
  },
});
