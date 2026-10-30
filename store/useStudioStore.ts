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
  deleteWithCascade: (type: StudioItemType, targetId: string) => Promise<void>;
}

export type StudioItemType = 'config' | 'sign' | 'phrase' | 'module';

/**
 * Removes an item and everything that depends on it, following the content
 * hierarchy: configs -> signs -> phrases -> modules.
 */
function cascadeDelete(
  state: Pick<StudioState, 'configs' | 'signs' | 'phrases' | 'modules'>,
  type: StudioItemType,
  targetId: string
) {
  let newConfigs = [...state.configs];
  let newSigns = [...state.signs];
  let newPhrases = [...state.phrases];
  let newModules = [...state.modules];

  const deletedSignIds = new Set<string>();
  const deletedPhraseIds = new Set<string>();

  if (type === 'config') {
    newConfigs = newConfigs.filter(c => c.local_id !== targetId);
    newSigns.forEach(s => {
      if (s.dominant_config_id === targetId || s.recessive_config_id === targetId) {
        deletedSignIds.add(s.local_id);
      }
    });
    newSigns = newSigns.filter(s => !deletedSignIds.has(s.local_id));
  }

  if (type === 'sign') {
    deletedSignIds.add(targetId);
    newSigns = newSigns.filter(s => !deletedSignIds.has(s.local_id));
  }

  if (deletedSignIds.size > 0 || type === 'phrase') {
    if (type === 'phrase') deletedPhraseIds.add(targetId);

    newPhrases = newPhrases.map(p => {
      const keptSigns = p.signs_list.filter((s: any) => !deletedSignIds.has(s.sign_id));
      return { ...p, signs_list: keptSigns };
    }).filter(p => {
      if (p.signs_list.length === 0) deletedPhraseIds.add(p.local_id);
      if (type === 'phrase' && p.local_id === targetId) deletedPhraseIds.add(p.local_id);
      return p.signs_list.length > 0 && p.local_id !== targetId;
    });
  }

  if (deletedSignIds.size > 0 || deletedPhraseIds.size > 0 || type === 'module') {
    newModules = newModules.map(m => {
      const keptItems = m.items_list.filter((item: any) => {
        if (item.item_type === 'sign') return !deletedSignIds.has(item.sign_id);
        if (item.item_type === 'phrase') return !deletedPhraseIds.has(item.phrase_id);
        if (item.item_type === 'config') return newConfigs.some(c => c.local_id === item.config_id);
        return true;
      });
      return { ...m, items_list: keptItems };
    });

    if (type === 'module') {
      newModules = newModules.filter(m => m.local_id !== targetId);
    }
  }

  return { configs: newConfigs, signs: newSigns, phrases: newPhrases, modules: newModules };
}

export const useStudioStore = create<StudioState>((set, get) => ({
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
  },

  deleteWithCascade: async (type, targetId) => {
    const next = cascadeDelete(get(), type, targetId);
    set(next);
    await AsyncStorage.multiSet([
      ['@ensenas_manual_configs', JSON.stringify(next.configs)],
      ['@ensenas_recorded_signs', JSON.stringify(next.signs)],
      ['@ensenas_recorded_phrases', JSON.stringify(next.phrases)],
      ['@ensenas_recorded_modules', JSON.stringify(next.modules)],
    ]);
  }
}));