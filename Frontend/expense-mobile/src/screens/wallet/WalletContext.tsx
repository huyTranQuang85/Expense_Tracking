import React, { createContext, useContext, useMemo, useState } from "react";

export type WalletRecord = {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: string;
  balance: number;
  color: string;
  isArchived: boolean;
  createdAt: string;
};

export type WalletDraft = {
  id?: string;
  name: string;
  description?: string;
  icon?: string;
  type?: string;
  balance?: number;
  color?: string;
};

type WalletContextValue = {
  wallets: WalletRecord[];
  getWallet: (id?: string | null) => WalletRecord | null;
  saveWallet: (draft: WalletDraft) => WalletRecord;
  deleteWallet: (id: string) => void;
  totalBalance: number;
};

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

function createWalletId() {
  return `wallet-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [wallets, setWallets] = useState<WalletRecord[]>([]);

  const value = useMemo<WalletContextValue>(
    () => ({
      wallets,
      getWallet: (id?: string | null) => {
        if (!id) return null;
        return wallets.find((item) => item.id === id) ?? null;
      },
      saveWallet: (draft: WalletDraft) => {
        const next: WalletRecord = {
          id: draft.id ?? createWalletId(),
          name: draft.name.trim(),
          description: draft.description?.trim() ?? "",
          icon: draft.icon ?? "💰",
          type: draft.type ?? "standard",
          balance: Number(draft.balance ?? 0),
          color: draft.color ?? "#2EC98E",
          isArchived: false,
          createdAt: new Date().toISOString(),
        };

        setWallets((prev) => {
          const without = prev.filter((item) => item.id !== next.id);
          return [next, ...without];
        });

        return next;
      },
      deleteWallet: (id: string) => {
        setWallets((prev) => prev.filter((item) => item.id !== id));
      },
      totalBalance: wallets.reduce((sum, item) => sum + Number(item.balance || 0), 0),
    }),
    [wallets],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallets() {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallets must be used inside WalletProvider");
  }
  return ctx;
}
