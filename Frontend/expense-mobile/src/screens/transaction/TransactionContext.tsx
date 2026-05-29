import React from "react";

type Props = { children: React.ReactNode };

export const TransactionContext = React.createContext<any>(null);

export function TransactionProvider({ children }: Props) {
  const value = {
    transactions: [],
    refresh: async () => {},
  };

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
}

export default TransactionContext;
