import React, { useContext, useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useRoute } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { FlashcardContext } from "../contexts/FlashcardContext";

const EditCardScreen: React.FC<NativeStackScreenProps<RootStackParamList, 'EditCard'>> = ({ route, navigation }) => {
  const { cardId, folderId } = route.params;
  const context = useContext(FlashcardContext);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!context) return;
    const card = context.flashcards.find(c => c.id === cardId);
    if (card) {
      setFront(card.front);
      setBack(card.back);
    }
    setLoading(false);
  }, [cardId, context]);

  const handleSave = () => {
    if (!context) return;
    if (!front.trim() || !back.trim()) {
      Alert.alert('エラー', '表面と裏面の両方を入力してください。');
      return;
    }
    context.editFlashcard && context.editFlashcard(cardId, front, back);
    navigation.goBack();
  };

  if (loading) {
    return <View style={styles.container}><Text>読み込み中...</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>表面</Text>
      <TextInput
        style={styles.input}
        value={front}
        onChangeText={setFront}
        placeholder="表面のテキスト"
        multiline
      />
      <Text style={styles.label}>裏面</Text>
      <TextInput
        style={styles.input}
        value={back}
        onChangeText={setBack}
        placeholder="裏面のテキスト"
        multiline
      />
      <View style={styles.buttonRow}>
        <Button title="保存" onPress={handleSave} />
        <Button title="キャンセル" color="#888" onPress={() => navigation.goBack()} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    alignSelf: 'flex-start',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginTop: 8,
    backgroundColor: '#f9f9f9',
    minHeight: 60,
    width: 340,
    maxWidth: '95%',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32,
    width: 340,
    maxWidth: '95%',
  },
});

export default EditCardScreen;
