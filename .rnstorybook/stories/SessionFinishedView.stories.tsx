import React from "react";
import { View } from "react-native";
import SessionFinishedView from "../../components/SessionFinishedView";

export default {
  title: "screens/SessionFinishedView",
  component: SessionFinishedView,
};

export const Default = {
  render: () => (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <SessionFinishedView />
    </View>
  ),
};
