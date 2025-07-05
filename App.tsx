// Storybookを有効にする場合は下記1行を有効化
// export { default } from "./.rnstorybook";

// 通常アプリを有効にする場合は下記を有効化
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import React from "react";
import RootNavigator from "./navigation/RootNavigator";
import { FlashcardProvider } from "./contexts/FlashcardContext";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <FlashcardProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </FlashcardProvider>
    </GestureHandlerRootView>
  );
}
