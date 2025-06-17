import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import React from "react";
import RootNavigator from "./navigation/RootNavigator";
import { FlashcardProvider } from "./contexts/FlashcardContext";

// Storybook切り替え
let StorybookUIRoot: any;
try {
  StorybookUIRoot = require("./storybook").default;
} catch (e) {
  StorybookUIRoot = null;
}

const SHOW_STORYBOOK = false; // trueでstorybookを起動

export default function App() {
  if (SHOW_STORYBOOK && StorybookUIRoot) {
    return <StorybookUIRoot />;
  }
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
