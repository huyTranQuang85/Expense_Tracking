import React from "react";

type Props = { children: React.ReactNode };

export const CategoriesContext = React.createContext<any>(null);

export function CategoriesProvider({ children }: Props) {
  // Minimal provider: can be expanded later with actual state/actions
  const value = {
    categories: [],
    refresh: async () => {},
  };

  return (
    <CategoriesContext.Provider value={value}>
      {children}
    </CategoriesContext.Provider>
  );
}

export default CategoriesContext;
