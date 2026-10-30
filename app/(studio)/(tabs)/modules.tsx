import { Button } from '@/components/common/Button';
import { Typography } from '@/components/common/Typography';
import { FormField } from '@/components/studio/FormField';
import { PickerModal, PickerTab } from '@/components/studio/PickerModal';
import { db } from '@/db';
import { manualConfigurations, phrases, signs } from '@/db/schema';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { useTheme } from '@/hooks/useTheme';
import { useStudioStore } from '@/store/useStudioStore';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { ChatBubble, Check, DragHandGesture, Plus, VideoCamera, Xmark } from 'iconoir-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TabKey = 'configs' | 'signs' | 'phrases';

const TABS: PickerTab[] = [
  { key: 'configs', label: 'Configs' },
  { key: 'signs', label: 'Señas' },
  { key: 'phrases', label: 'Frases' },
];

export default function StudioModuleScreen() {
  const { colors } = useTheme();
  const palette = (colors as any).palette;
  const keyboardHeight = useKeyboardHeight();

  const { moduleId } = useLocalSearchParams<{ moduleId?: string }>();

  const { configs: localConfigsRaw, signs: localSignsRaw, phrases: localPhrasesRaw, modules: localModulesRaw, setModules } = useStudioStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficultyLevel, setDifficultyLevel] = useState(1);
  const [moduleItems, setModuleItems] = useState<any[]>([]);

  const [dbConfigsState, setDbConfigsState] = useState<any[]>([]);
  const [dbSignsState, setDbSignsState] = useState<any[]>([]);
  const [dbPhrasesState, setDbPhrasesState] = useState<any[]>([]);

  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('signs');

  const formattedLocalConfigs = useMemo(() => localConfigsRaw.map((item: any) => ({
    id: item.local_id || item.timestamp,
    label: item.name || 'Configuración sin nombre',
    type: 'config',
    isLocal: true
  })), [localConfigsRaw]);

  const formattedLocalSigns = useMemo(() => localSignsRaw.map((item: any) => ({
    id: item.local_id || item.timestamp,
    label: item.meanings?.[0] || 'Seña sin nombre',
    type: 'sign',
    isLocal: true
  })), [localSignsRaw]);

  const formattedLocalPhrases = useMemo(() => localPhrasesRaw.map((item: any) => ({
    id: item.id || item.local_id,
    label: item.spanish_translation,
    type: 'phrase',
    isLocal: true
  })), [localPhrasesRaw]);

  const availableConfigs = useMemo(() => [...formattedLocalConfigs, ...dbConfigsState], [formattedLocalConfigs, dbConfigsState]);
  const availableSigns = useMemo(() => [...formattedLocalSigns, ...dbSignsState], [formattedLocalSigns, dbSignsState]);
  const availablePhrases = useMemo(() => [...formattedLocalPhrases, ...dbPhrasesState], [formattedLocalPhrases, dbPhrasesState]);

  useFocusEffect(
    useCallback(() => {
      const fetchDb = async () => {
        try {
          const dbC = await db.select().from(manualConfigurations);
          setDbConfigsState(dbC.map(c => ({ id: c.localId, label: c.name, type: 'config', isLocal: false })));

          const dbS = await db.select().from(signs);
          setDbSignsState(dbS.map(s => ({ id: s.localId, label: s.meaningsJson ? JSON.parse(s.meaningsJson)[0] : s.title, type: 'sign', isLocal: false })));

          const dbP = await db.select().from(phrases);
          setDbPhrasesState(dbP.map(p => ({ id: p.localId, label: p.spanishTranslation, type: 'phrase', isLocal: false })));
        } catch (e) {}
      };
      fetchDb();
    }, [])
  );

  useEffect(() => {
    if (moduleId) {
      const moduleToEdit = localModulesRaw.find((m: any) => m.id === moduleId || m.local_id === moduleId);
      if (moduleToEdit) {
        setTitle(moduleToEdit.title);
        setDescription(moduleToEdit.description || '');
        setDifficultyLevel(moduleToEdit.difficulty_level || 1);

        const loadedItems = moduleToEdit.items_list.map((item: any) => {
          let label = 'Elemento eliminado o desconocido';
          let isLocal = false;

          if (item.item_type === 'config') {
            const foundConfig = availableConfigs.find(c => c.id === item.config_id);
            if (foundConfig) { label = foundConfig.label; isLocal = foundConfig.isLocal; }
          } else if (item.item_type === 'sign') {
            const foundSign = availableSigns.find(s => s.id === item.sign_id);
            if (foundSign) { label = foundSign.label; isLocal = foundSign.isLocal; }
          } else {
            const foundPhrase = availablePhrases.find(p => p.id === item.phrase_id);
            if (foundPhrase) { label = foundPhrase.label; isLocal = foundPhrase.isLocal; }
          }

          return {
            id: item.config_id || item.sign_id || item.phrase_id,
            label,
            type: item.item_type,
            isLocal,
            listId: `loaded_${item.item_type}_${item.order_index}_${Date.now()}`
          };
        });

        setModuleItems(loadedItems);
      }
    } else {
      setTitle('');
      setDescription('');
      setDifficultyLevel(1);
      setModuleItems([]);
    }
  }, [moduleId, localModulesRaw, availableConfigs, availableSigns, availablePhrases]);

  const activeData = activeTab === 'configs' ? availableConfigs : activeTab === 'signs' ? availableSigns : availablePhrases;

  const handleAddItem = (item: { id: string }) => {
    const source = activeData.find(candidate => candidate.id === item.id);
    if (!source) return;
    setModuleItems([...moduleItems, { ...source, listId: Date.now().toString() + Math.random().toString() }]);
    setIsSelectorOpen(false);
  };

  const handleRemoveItem = (listIdToRemove: string) => {
    setModuleItems(moduleItems.filter(item => item.listId !== listIdToRemove));
  };

  const handleSaveModule = async () => {
    if (!title.trim() || moduleItems.length === 0) return;

    try {
      const targetId = moduleId || `local_module_${Date.now()}`;

      const moduleData = {
        local_id: targetId,
        id: targetId,
        title: title.trim(),
        description: description.trim(),
        difficulty_level: difficultyLevel,
        items_list: moduleItems.map((item, index) => ({
          item_type: item.type,
          config_id: item.type === 'config' ? item.id : null,
          sign_id: item.type === 'sign' ? item.id : null,
          phrase_id: item.type === 'phrase' ? item.id : null,
          order_index: index
        }))
      };

      if (moduleId) {
        const updatedModules = localModulesRaw.map((m: any) => (m.id === moduleId || m.local_id === moduleId) ? moduleData : m);
        await setModules(updatedModules);
        Alert.alert("Módulo Actualizado", "Los cambios se han guardado correctamente.", [
          { text: "OK", onPress: () => router.back() }
        ]);
      } else {
        await setModules([...localModulesRaw, moduleData]);
        Alert.alert("Módulo Guardado", "El módulo educativo se estructuró correctamente.");
        setTitle('');
        setDescription('');
        setDifficultyLevel(1);
        setModuleItems([]);
      }

    } catch (e) {
      Alert.alert("Error", "Ocurrió un problema al guardar el módulo.");
    }
  };

  const isFormValid = title.trim() !== '' && moduleItems.length > 0;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background, paddingBottom: keyboardHeight }]}
      edges={['top']}
    >

      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Typography variant="h3">{moduleId ? 'Editar Módulo' : 'Crear Módulo'}</Typography>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >

        <FormField
          label="Título del módulo"
          required
          placeholder="Ej: Saludos Básicos II"
          value={title}
          onChangeText={setTitle}
          containerStyle={styles.section}
        />

        <FormField
          label="Descripción"
          hint="Opcional. ¿Qué aprenderá el estudiante aquí?"
          placeholder="¿Qué aprenderá el estudiante aquí?"
          value={description}
          onChangeText={setDescription}
          multiline
          containerStyle={styles.section}
        />

        <View style={styles.section}>
          <Typography variant="label" color={colors.textSecondary} style={[styles.sectionTitle, { marginBottom: 12 }]}>NIVEL DE DIFICULTAD</Typography>
          <View style={styles.difficultyContainer}>
            {[1, 2, 3, 4, 5].map((level) => (
              <Pressable
                key={`diff-${level}`}
                onPress={() => setDifficultyLevel(level)}
                style={[
                  styles.difficultyBox,
                  {
                    backgroundColor: difficultyLevel === level ? palette.deepSkyBlue : colors.input,
                    borderColor: difficultyLevel === level ? palette.deepSkyBlue : colors.border
                  }
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Nivel ${level}`}
                accessibilityState={{ selected: difficultyLevel === level }}
              >
                <Typography variant="label" color={difficultyLevel === level ? '#FFFFFF' : colors.textSecondary} style={{ fontWeight: '800' }}>
                  {level}
                </Typography>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Typography variant="label" color={colors.textSecondary} style={styles.sectionTitle}>CONTENIDO DEL MÓDULO *</Typography>
            <Typography variant="label" color={colors.textSecondary}>{moduleItems.length} elementos</Typography>
          </View>

          <View style={styles.itemsListContainer}>
            {moduleItems.map((item, index) => (
              <View key={item.listId} style={[styles.moduleItemRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.itemTypeIcon, { backgroundColor: item.type === 'config' ? `${palette.deepSkyBlue}20` : item.type === 'sign' ? `${colors.success}20` : `${palette.powderBlush}20` }]}>
                  {item.type === 'config'
                    ? <DragHandGesture width={20} height={20} color={palette.deepSkyBlue} strokeWidth={2} />
                    : item.type === 'sign'
                    ? <VideoCamera width={20} height={20} color={colors.success} strokeWidth={2} />
                    : <ChatBubble width={20} height={20} color={palette.powderBlush} strokeWidth={2} />
                  }
                </View>
                <View style={styles.itemInfo}>
                  <Typography variant="body" color={colors.text} style={{ fontWeight: '600' }} numberOfLines={1}>{item.label}</Typography>
                  <Typography variant="label" color={colors.textSecondary}>{item.type === 'config' ? 'Configuración' : item.type === 'sign' ? 'Seña Individual' : 'Frase'}</Typography>
                </View>
                <Typography variant="h3" color={colors.textSecondary} style={{ marginRight: 16 }}>#{index + 1}</Typography>
                <Pressable
                  onPress={() => handleRemoveItem(item.listId)}
                  style={[styles.removeItemBtn, { backgroundColor: colors.input }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Quitar ${item.label}`}
                >
                  <Xmark width={18} height={18} color={colors.textSecondary} strokeWidth={2.5} />
                </Pressable>
              </View>
            ))}

            <Pressable
              style={[styles.addItemBtn, { borderColor: palette.deepSkyBlue, backgroundColor: `${palette.deepSkyBlue}10` }]}
              onPress={() => setIsSelectorOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Agregar elemento al módulo"
            >
              <Plus width={24} height={24} color={palette.deepSkyBlue} strokeWidth={2.5} />
              <Typography variant="body" color={palette.deepSkyBlue} style={{ fontWeight: '600', marginLeft: 8 }}>Agregar Elemento</Typography>
            </Pressable>
          </View>
        </View>

      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: keyboardHeight ? 16 : 110,
          },
        ]}
      >
        <Button
          title={moduleId ? "Actualizar Módulo" : "Guardar Módulo"}
          color={palette.deepSkyBlue}
          textColor="#FFFFFF"
          icon={<Check width={20} height={20} color="#FFFFFF" strokeWidth={2.5} />}
          onPress={handleSaveModule}
          disabled={!isFormValid}
          style={{ opacity: !isFormValid ? 0.5 : 1 }}
        />
      </View>

      <PickerModal
        visible={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
        title="Agregar al Módulo"
        items={activeData}
        onSelect={handleAddItem}
        searchPlaceholder={`Buscar ${activeTab === 'configs' ? 'configuración' : activeTab === 'signs' ? 'seña' : 'frase'}...`}
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={(key) => setActiveTab(key as TabKey)}
        heightRatio={0.85}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 12 },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 10 },
  section: { marginBottom: 32 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { letterSpacing: 0.5 },
  difficultyContainer: { flexDirection: 'row', gap: 8 },
  difficultyBox: { flex: 1, height: 48, borderRadius: 12, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  itemsListContainer: { gap: 12 },
  moduleItemRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 2 },
  itemTypeIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemInfo: { flex: 1, paddingRight: 8 },
  removeItemBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20, borderRadius: 20, borderWidth: 2, borderStyle: 'dashed', marginTop: 8 },
  bottomBar: { paddingHorizontal: 24, paddingTop: 16, borderTopWidth: 1 },
});
