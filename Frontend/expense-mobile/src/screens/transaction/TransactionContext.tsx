import React, { createContext, useContext, useMemo, useState } from "react";

export type TransactionType = "income" | "expense";

export type TransactionRecord = {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  categoryId: string | number | null;
  subCategoryId: string | number | null;
  walletId: string;
  walletName: string;
  deletedAt: string | null;
};

export type TransactionDraft = {
  id?: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  categoryId: string | number | null;
  subCategoryId: string | number | null;
  walletId: string;
  walletName: string;
};

type WalletOption = {
  id: string;
  name: string;
};

type TransactionContextValue = {
  transactions: TransactionRecord[];
  trashedTransactions: TransactionRecord[];
  walletOptions: WalletOption[];
  getTransaction: (id?: string | null) => TransactionRecord | null;
  saveTransaction: (draft: TransactionDraft) => TransactionRecord;
  moveToTrash: (id: string) => void;
  restoreTransaction: (id: string) => void;
  forceDeleteTransaction: (id: string) => void;
};

const TransactionContext = createContext<TransactionContextValue | undefined>(
  undefined,
);

const DEFAULT_WALLET: WalletOption = {
  id: "main-wallet",
  name: "Ví chính",
};

function createTransactionId() {
  return `tx-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function TransactionProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [trashedTransactions, setTrashedTransactions] = useState<
    TransactionRecord[]
  >([]);

  const value = useMemo<TransactionContextValue>(
    () => ({
      transactions,
      trashedTransactions,
      walletOptions: [DEFAULT_WALLET],
      getTransaction: (id?: string | null) => {
        if (!id) return null;
        return (
          transactions.find((item) => item.id === id) ??
          trashedTransactions.find((item) => item.id === id) ??
          null
        );
      },
      saveTransaction: (draft: TransactionDraft) => {
        const next: TransactionRecord = {
          id: draft.id ?? createTransactionId(),
          type: draft.type,
          amount: Number(draft.amount || 0),
          description: draft.description.trim(),
          date: draft.date,
          categoryId: draft.categoryId,
          subCategoryId: draft.subCategoryId,
          walletId: draft.walletId,
          walletName: draft.walletName,
          deletedAt: null,
        };

        setTransactions((prev) => {
          const without = prev.filter((item) => item.id !== next.id);
          return [next, ...without];
        });
        setTrashedTransactions((prev) =>
          prev.filter((item) => item.id !== next.id),
        );

        return next;
      },
      moveToTrash: (id: string) => {
        setTransactions((prev) => {
          const target = prev.find((item) => item.id === id);
          if (!target) return prev;

          const removed = {
            ...target,
            deletedAt: new Date().toISOString(),
          };

          setTrashedTransactions((trash) => {
            const without = trash.filter((item) => item.id !== id);
            return [removed, ...without];
          });

          return prev.filter((item) => item.id !== id);
        });
      },
      restoreTransaction: (id: string) => {
        setTrashedTransactions((prev) => {
          const target = prev.find((item) => item.id === id);
          if (!target) return prev;

          const restored = { ...target, deletedAt: null };
          setTransactions((current) => [restored, ...current.filter((item) => item.id !== id)]);
          return prev.filter((item) => item.id !== id);
        });
      },
      forceDeleteTransaction: (id: string) => {
        setTrashedTransactions((prev) => prev.filter((item) => item.id !== id));
      },
    }),
    [transactions, trashedTransactions],
  );

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  const ctx = useContext(TransactionContext);
  if (!ctx) {
    throw new Error("useTransactions must be used inside TransactionProvider");
  }
  return ctx;
}
