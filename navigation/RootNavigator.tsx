import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AnkiScreen from "../components/AnkiScreen";
import CardManagementScreen from "../components/CardManagementScreen";
import FolderManagementScreen from "../components/FolderManagementScreen";
import FolderCardsScreen from "../components/FolderCardsScreen";
import HomeScreen from "../components/HomeScreen";
import DetailsScreen from "../components/DetailsScreen";
import EditCardScreen from "../components/EditCardScreen";

// 画面間パラメータ型定義
export type RootStackParamList = {
  Home: undefined;
  Details: undefined;
  Anki: undefined;
  CardManagement: undefined;
  FolderManagement: undefined;
  FolderCards: { folderId: string } | undefined;
  EditCard: { cardId: string; folderId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => (
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
    <Stack.Screen
      name="EditCard"
      component={EditCardScreen}
      options={{ title: "カード編集" }}
    />
  </Stack.Navigator>
);

export default RootNavigator;
