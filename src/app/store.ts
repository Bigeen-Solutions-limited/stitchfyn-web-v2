import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  pendingCommandIds: string[];
  
  toggleSidebar: () => void;
  addPendingCommand: (id: string) => void;
  removePendingCommand: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  theme: 'light',
  pendingCommandIds: [],

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  addPendingCommand: (id) => set((state) => ({ 
    pendingCommandIds: [...state.pendingCommandIds, id] 
  })),
  removePendingCommand: (id) => set((state) => ({ 
    pendingCommandIds: state.pendingCommandIds.filter(cid => cid !== id) 
  })),
}));
