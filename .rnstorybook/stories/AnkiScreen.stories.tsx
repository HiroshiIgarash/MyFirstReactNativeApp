import React from "react";
import { View } from "react-native";
import AnkiScreen from "../../components/AnkiScreen";
import { FlashcardContext } from "../../contexts/FlashcardContext";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";

const mockFlashcards = [
  {
    id: "1",
    front: "犬",
    back: "dog",
    folderId: "f1",
    shownCount: 2,
    correctCount: 1,
    incorrectCount: 1,
    passCount: 0,
    lastAnsweredAt: new Date().toISOString(),
    lastResult: "correct" as const,
    streak: 1,
    intervalIndex: 2,
    nextDue: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    mastered: false,
  },
  {
    id: "2",
    front: "猫",
    back: "cat",
    folderId: "f1",
    shownCount: 3,
    correctCount: 2,
    incorrectCount: 1,
    passCount: 0,
    lastAnsweredAt: new Date().toISOString(),
    lastResult: "incorrect" as const,
    streak: 0,
    intervalIndex: 1,
    nextDue: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    mastered: false,
  },
];

const mockFolders = [{ id: "f1", name: "動物" }];

const mockContext = {
  flashcards: mockFlashcards,
  setFlashcards: () => {},
  folders: mockFolders,
  addFlashcard: () => {},
  deleteFlashcard: () => {},
  addFolder: () => {},
};

const Stack = createNativeStackNavigator();

export default {
  title: "screens/AnkiScreen",
  component: AnkiScreen,
  decorators: [
    (Story) => (
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen
              name="Anki"
              options={{ headerShown: false }}
              initialParams={{ folderId: "f1" }}
            >
              {() => (
                <FlashcardContext.Provider value={mockContext}>
                  <View style={{ flex: 1 }}>
                    <Story />
                  </View>
                </FlashcardContext.Provider>
              )}
            </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    ),
  ],
};

export const Default = {
  render: () => <AnkiScreen />,
};

// 覚えるべきカードがない状態のストーリー
const noDueCardsContext = {
  ...mockContext,
  flashcards: [], // カードが0件の状態
};

export const NoDueCards = {
  decorators: [
    (Story) => (
      <FlashcardContext.Provider value={noDueCardsContext}>
        <View style={{ flex: 1 }}>
          <Story />
        </View>
      </FlashcardContext.Provider>
    ),
  ],
  render: () => <AnkiScreen />,
};
