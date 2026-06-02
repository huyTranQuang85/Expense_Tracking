import React from "react";

type Props = { children: React.ReactNode };

export const WalletContext = React.createContext<any>(null);

export function WalletProvider({ children }: Props) {
  const value = {
    wallets: [],
    refresh: async () => {},
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export default WalletContext;
