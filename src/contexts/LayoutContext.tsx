import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LayoutContextType {
  activeFilters: Record<string, string>;
  setActiveFilter: (tab: string, filterId: string) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
    home: 'For You',
    post: 'For You',
    hub: 'Explore',
    chats: 'Chats',
    reels: 'Trending',
    profile: 'Post',
  });

  const setActiveFilter = (tab: string, filterId: string) => {
    setActiveFilters((prev) => ({
      ...prev,
      [tab]: filterId,
    }));
  };

  return (
    <LayoutContext.Provider value={{ activeFilters, setActiveFilter }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
}
