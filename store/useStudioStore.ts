import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

interface StudioState {
  configs: any[];
  signs: any[];
  phrases: any[];
  modules: any[];
  isLoaded: boolean;
  
  loadAllData: () => Promise<void>;
  
  setConfigs: (configs: any[]) => Promise<void>;
  setSigns: (signs: any[]) => Promise<void>;
  setPhrases: (phrases: any[]) => Promise<void>;
  setModules: (modules: any[]) => Promise<void>;
}

export const useStudioStore = create<StudioState>((set) => ({
  configs: [],
  signs: [],
  phrases: [],
  modules: [],
  isLoaded: false,

  loadAllData: async () => {
    try {
      const [c, s, p, m] = await Promise.all([
        AsyncStorage.getItem('@ensenas_manual_configs'),
        AsyncStorage.getItem('@ensenas_recorded_signs'),
        AsyncStorage.getItem('@ensenas_recorded_phrases'),
        AsyncStorage.getItem('@ensenas_recorded_modules')
      ]);

      set({
        configs: c ? JSON.parse(c) : [],
        signs: s ? JSON.parse(s) : [],
        phrases: p ? JSON.parse(p) : [],
        modules: m ? JSON.parse(m) : [],
        isLoaded: true
      });
    } catch (error) {
      console.error("Error cargando caché del Studio", error);
    }
  },

  setConfigs: async (configs) => {
    set({ configs });
    await AsyncStorage.setItem('@ensenas_manual_configs', JSON.stringify(configs));
  },
  
  setSigns: async (signs) => {
    set({ signs });
    await AsyncStorage.setItem('@ensenas_recorded_signs', JSON.stringify(signs));
  },
  
  setPhrases: async (phrases) => {
    set({ phrases });
    await AsyncStorage.setItem('@ensenas_recorded_phrases', JSON.stringify(phrases));
  },
  
  setModules: async (modules) => {
    set({ modules });
    await AsyncStorage.setItem('@ensenas_recorded_modules', JSON.stringify(modules));
  }
}));