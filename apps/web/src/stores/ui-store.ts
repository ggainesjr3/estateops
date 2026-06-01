'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  sidebarOpen: boolean;
  accessToken: string | null;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setAccessToken: (token: string | null) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      accessToken: null,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setAccessToken: (accessToken) => {
        set({ accessToken });
        if (typeof window !== 'undefined') {
          if (accessToken) {
            localStorage.setItem('estateops_token', accessToken);
          } else {
            localStorage.removeItem('estateops_token');
          }
        }
      },
    }),
    { name: 'estateops-ui', partialize: (s) => ({ accessToken: s.accessToken }) },
  ),
);
