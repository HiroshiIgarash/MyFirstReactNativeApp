import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AnkiScreen from "../components/AnkiScreen";
import CardManagementScreen from "../components/CardManagementScreen";
import FolderManagementScreen from "../components/FolderManagementScreen";
import FolderCardsScreen from "../components/FolderCardsScreen";
import HomeScreen from "../components/HomeScreen";
import DetailsScreen from "../components/DetailsScreen";
import EditCardScreen from "../components/EditCardScreen";
import SelectFolderScreen from "../components/SelectFolderScreen";
import StatisticsScreen from "../components/StatisticsScreen";
import { MaterialIcons } from "@expo/vector-icons";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";

export type RootStackParamList = {
  Home: undefined;
  Details: undefined;
  Anki: { folderId?: string } | undefined;
  CardManagement: undefined;
  FolderManagement: undefined;
  FolderCards: { folderId: string } | undefined;
  EditCard: { cardId: string; folderId: string };
  SelectFolder: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// 学習タブ用Stack
function StudyStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="SelectFolder"
        component={SelectFolderScreen}
        options={{ title: "フォルダ選択" }}
      />
      <Stack.Screen
        name="Anki"
        component={AnkiScreen}
        options={{
          title: "暗記アプリ",
          presentation: "containedTransparentModal", // ドロワーではなくフルスクリーン
          headerShown: false, // ヘッダーも消す
          // gestureEnabled: false, // 下スワイプで閉じるのを防ぐ（ただしStackのmodal系はiOSで効かない場合あり）
        }}
      />
      <Stack.Screen
        name="EditCard"
        component={EditCardScreen}
        options={{ title: "カード編集" }}
      />
    </Stack.Navigator>
  );
}
// フォルダタブ用Stack
function FolderStack() {
  return (
    <Stack.Navigator>
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
}

const RootNavigator: React.FC = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ color, size }) => {
        if (route.name === "学習") {
          return <MaterialIcons name="school" size={size} color={color} />;
        } else if (route.name === "フォルダ") {
          return <MaterialIcons name="folder" size={size} color={color} />;
        } else if (route.name === "成績") {
          return <MaterialIcons name="bar-chart" size={size} color={color} />;
        }
        return null;
      },
    })}
  >
    <Tab.Screen
      name="学習"
      component={StudyStack}
      options={({ route }) => {
        const routeName = getFocusedRouteNameFromRoute(route) ?? "SelectFolder";
        return {
          tabBarStyle: routeName === "Anki" ? { display: "none" } : undefined,
        };
      }}
    />
    <Tab.Screen name="フォルダ" component={FolderStack} />
    <Tab.Screen name="成績" component={StatisticsScreen} />
  </Tab.Navigator>
);

export default RootNavigator;
