import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import { lightColors, darkColors } from "./tokens";

type Mode = "light" | "dark";

type ThemeValue = {
  mode: Mode;
  colors: typeof lightColors;
  setMode: (m: Mode) => void;
};

const ThemeContext = createContext<ThemeValue>({
  mode: "light",
  colors: lightColors,
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme(); // light | dark | null

  // userMode = override từ Settings; nếu null thì dùng system
  const [userMode, setUserMode] = useState<Mode | null>(null);

  const mode: Mode = userMode ?? (system === "dark" ? "dark" : "light");

  const colors = mode === "dark" ? darkColors : lightColors;

  const value = useMemo(
    () => ({
      mode,
      colors,
      setMode: (m: Mode) => setUserMode(m),
    }),
    [mode, colors],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
