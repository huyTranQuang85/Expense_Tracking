import React, { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ChatbotFab from "./ChatbotFab";
import ChatbotModal from "./ChatbotModal";

const TAB_BAR_HEIGHT = 62;

export default function ChatbotOverlay({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const bottomOffset = TAB_BAR_HEIGHT + insets.bottom + 16;

  return (
    <>
      {children}

      {/* luôn hiện trong MainTabs */}
      <ChatbotFab bottomOffset={bottomOffset} onPress={() => setOpen(true)} />
      <ChatbotModal visible={open} onClose={() => setOpen(false)} />
    </>
  );
}
