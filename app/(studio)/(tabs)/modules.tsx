import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { IconButton } from '@/components/common/IconButton';
import { Typography } from '@/components/common/Typography';
import { db } from '@/db';
import { phrases, signs } from '@/db/schema';
import { useTheme } from '@/hooks/useTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { ChatBubble, Check, Plus, Search, VideoCamera, Xmark } from 'iconoir-react-native';
import React, { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StudioModuleScreen() {
  const { colors } = useTheme();
  const palette = (colors as any).palette;
  
  const { moduleId } = useLocalSearchParams<{ moduleId?: string }>();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficultyLevel, setDifficultyLevel] = useState(1);
  const [moduleItems, setModuleItems] = useState<any[]>([]);

  const [availableSigns, setAvailableSigns] = useState<any[]>([]);
  const [availablePhrases, setAvailablePhrases] = useState<any[]>([]);
  
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'signs' | 'phrases'>('signs');
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        try {
          const dbSigns = await db.select().from(signs);
          const formattedDbSigns = dbSigns.map(s => ({
            id: s.id,
            label: s.meaningsJson ? JSON.parse(s.meaningsJson)[0] : s.title,
            type: 'sign',
            isLocal: false
          }));

          const localSignsStr = await AsyncStorage.getItem('@ensenas_recorded_signs');
          const localSignsData = localSignsStr ? JSON.parse(localSignsStr) : [];
          const formattedLocalSigns = localSignsData.map((item: any, index: number) => ({
            id: `local_sign_${item.timestamp || index}`,
            label: item.meanings?.[0] || 'Seña sin nombre',
            type: 'sign',
            isLocal: true
          }));

          const allSigns = [...formattedLocalSigns, ...formattedDbSigns];
          setAvailableSigns(allSigns);

          const dbPhrases = await db.select().from(phrases);
          const formattedDbPhrases = dbPhrases.map(p => ({
            id: p.id,
            label: p.spanishTranslation,
            type: 'phrase',
            isLocal: false
          }));

          const localPhrasesStr = await AsyncStorage.getItem('@ensenas_recorded_phrases');
          const localPhrasesData = localPhrasesStr ? JSON.parse(localPhrasesStr) : [];
          const formattedLocalPhrases = localPhrasesData.map((item: any, index: number) => ({
            id: item.id || `local_phrase_${item.timestamp || index}`,
            label: item.spanishTranslation,
            type: 'phrase',
            isLocal: true
          }));

          const allPhrases = [...formattedLocalPhrases, ...formattedDbPhrases];
          setAvailablePhrases(allPhrases);

          if (moduleId) {
            const storedModulesStr = await AsyncStorage.getItem('@ensenas_recorded_modules');
            const storedModules = storedModulesStr ? JSON.parse(storedModulesStr) : [];
            const moduleToEdit = storedModules.find((m: any) => m.id === moduleId);

            if (moduleToEdit) {
              setTitle(moduleToEdit.title);
              setDescription(moduleToEdit.description || '');
              setDifficultyLevel(moduleToEdit.difficultyLevel || 1);

              const loadedItems = moduleToEdit.items.map((item: any, index: number) => {
                let label = 'Elemento eliminado o desconocido';
                let isLocal = false;
                
                if (item.itemType === 'sign') {
                  const foundSign = allSigns.find(s => s.id === item.itemId);
                  if (foundSign) { label = foundSign.label; isLocal = foundSign.isLocal; }
                } else {
                  const foundPhrase = allPhrases.find(p => p.id === item.itemId);
                  if (foundPhrase) { label = foundPhrase.label; isLocal = foundPhrase.isLocal; }
                }

                return {
                  id: item.itemId,
                  label,
                  type: item.itemType,
                  isLocal,
                  listId: `loaded_${item.itemId}_${index}_${Date.now()}`
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

        } catch (e) {
          console.error("Error cargando datos:", e);
        }
      };
      
      fetchData();
    }, [moduleId])
  );

  const handleAddItem = (item: any) => {
    setModuleItems([...moduleItems, { ...item, listId: Date.now().toString() + Math.random().toString() }]);
    setIsSelectorOpen(false);
    setSearchQuery('');
  };

  const handleRemoveItem = (listIdToRemove: string) => {
    setModuleItems(moduleItems.filter(item => item.listId !== listIdToRemove));
  };

  const handleSaveModule = async () => {
    if (!title.trim() || moduleItems.length === 0) return;

    try {
      const storedData = await AsyncStorage.getItem('@ensenas_recorded_modules');
      let currentData = storedData ? JSON.parse(storedData) : [];

      const targetId = moduleId || `local_module_${Date.now()}`;
      
      const moduleData = {
        id: targetId,
        title: title.trim(),
        description: description.trim(),
        difficultyLevel,
        items: moduleItems.map((item, index) => ({
          itemType: item.type,
          itemId: item.id,
          orderIndex: index
        })),
        timestamp: moduleId 
          ? (currentData.find((m:any) => m.id === moduleId)?.timestamp || new Date().toISOString()) 
          : new Date().toISOString()
      };

      if (moduleId) {
        currentData = currentData.map((m: any) => m.id === moduleId ? moduleData : m);
        await AsyncStorage.setItem('@ensenas_recorded_modules', JSON.stringify(currentData));
        Alert.alert("Módulo Actualizado", "Los cambios se han guardado correctamente.", [
          { text: "OK", onPress: () => router.back() }
        ]);
      } else {
        await AsyncStorage.setItem('@ensenas_recorded_modules', JSON.stringify([...currentData, moduleData]));
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

  const activeData = activeTab === 'signs' ? availableSigns : availablePhrases;
  const filteredData = activeData.filter(item => 
    item.label.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const isFormValid = title.trim() !== '' && moduleItems.length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Typography variant="h3">{moduleId ? 'Editar Módulo' : 'Crear Módulo'}</Typography>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.section}>
          <Typography variant="subtitle" color={colors.textSecondary} style={styles.sectionTitle}>TÍTULO DEL MÓDULO *</Typography>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: title ? palette.deepSkyBlue : colors.border }]}
            placeholder="Ej: Saludos Básicos II"
            placeholderTextColor={colors.textSecondary}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.section}>
          <Typography variant="subtitle" color={colors.textSecondary} style={styles.sectionTitle}>DESCRIPCIÓN</Typography>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: description ? palette.deepSkyBlue : colors.border, height: 80 }]}
            placeholder="¿Qué aprenderá el estudiante aquí?"
            placeholderTextColor={colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline={true}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Typography variant="subtitle" color={colors.textSecondary} style={styles.sectionTitle}>NIVEL DE DIFICULTAD</Typography>
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
            <Typography variant="subtitle" color={colors.textSecondary} style={styles.sectionTitle}>CONTENIDO DEL MÓDULO *</Typography>
            <Typography variant="label" color={colors.textSecondary}>{moduleItems.length} elementos</Typography>
          </View>
          
          <View style={styles.itemsListContainer}>
            {moduleItems.map((item, index) => (
              <View key={item.listId} style={[styles.moduleItemRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.itemTypeIcon, { backgroundColor: item.type === 'sign' ? `${palette.deepSkyBlue}20` : `${palette.powderBlush}20` }]}>
                  {item.type === 'sign' 
                    ? <VideoCamera width={20} height={20} color={palette.deepSkyBlue} strokeWidth={2} />
                    : <ChatBubble width={20} height={20} color={palette.powderBlush} strokeWidth={2} />
                  }
                </View>
                <View style={styles.itemInfo}>
                  <Typography variant="body" color={colors.text} style={{ fontWeight: '600' }}>{item.label}</Typography>
                  <Typography variant="label" color={colors.textSecondary}>{item.type === 'sign' ? 'Seña Individual' : 'Frase'}</Typography>
                </View>
                <Typography variant="h3" color={colors.textSecondary} style={{ marginRight: 16 }}>#{index + 1}</Typography>
                <Pressable onPress={() => handleRemoveItem(item.listId)} style={[styles.removeItemBtn, { backgroundColor: colors.input }]}>
                  <Xmark width={18} height={18} color={colors.textSecondary} strokeWidth={2.5} />
                </Pressable>
              </View>
            ))}

            <Pressable 
              style={[styles.addItemBtn, { borderColor: palette.deepSkyBlue, backgroundColor: `${palette.deepSkyBlue}10` }]} 
              onPress={() => setIsSelectorOpen(true)}
            >
              <Plus width={24} height={24} color={palette.deepSkyBlue} strokeWidth={2.5} />
              <Typography variant="body" color={palette.deepSkyBlue} style={{ fontWeight: '600', marginLeft: 8 }}>Agregar Seña o Frase</Typography>
            </Pressable>
          </View>
        </View>

      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
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

      <Modal visible={isSelectorOpen} transparent={true} animationType="slide" onRequestClose={() => setIsSelectorOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsSelectorOpen(false)} />
          <Card style={[styles.dialogCard, { backgroundColor: colors.background }]}>
            
            <View style={[styles.dialogHeader, { paddingBottom: 16 }]}>
              <Typography variant="h2">Agregar al Módulo</Typography>
              <IconButton size={36} icon={<Xmark width={22} height={22} color={colors.text} strokeWidth={2} />} backgroundColor={colors.surface} onPress={() => setIsSelectorOpen(false)} />
            </View>

            <View style={styles.tabsContainer}>
              <Pressable 
                style={[styles.tabBtn, activeTab === 'signs' && { borderBottomColor: palette.deepSkyBlue }]} 
                onPress={() => { setActiveTab('signs'); setSearchQuery(''); }}
              >
                <Typography variant="body" color={activeTab === 'signs' ? palette.deepSkyBlue : colors.textSecondary} style={{ fontWeight: activeTab === 'signs' ? '700' : '500' }}>
                  Señas
                </Typography>
              </Pressable>
              <Pressable 
                style={[styles.tabBtn, activeTab === 'phrases' && { borderBottomColor: palette.deepSkyBlue }]} 
                onPress={() => { setActiveTab('phrases'); setSearchQuery(''); }}
              >
                <Typography variant="body" color={activeTab === 'phrases' ? palette.deepSkyBlue : colors.textSecondary} style={{ fontWeight: activeTab === 'phrases' ? '700' : '500' }}>
                  Frases
                </Typography>
              </Pressable>
            </View>

            <View style={{ paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <View style={[styles.searchBar, { backgroundColor: colors.input }]}>
                <Search width={20} height={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder={`Buscar ${activeTab === 'signs' ? 'seña' : 'frase'}...`}
                  placeholderTextColor={colors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus={true}
                />
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ padding: 24 }}>
              {filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <Pressable 
                    key={`search-${item.id}`}
                    style={[styles.listItem, { borderBottomColor: colors.border }]}
                    onPress={() => handleAddItem(item)}
                  >
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Typography variant="body" color={colors.text} style={{ fontWeight: '600' }}>
                        {item.label}
                      </Typography>
                      {item.isLocal && (
                        <View style={{ backgroundColor: palette.powderBlush, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                          <Typography variant="label" color="#111" style={{ fontSize: 10, fontWeight: '800' }}>NUEVO</Typography>
                        </View>
                      )}
                    </View>
                    <Plus width={24} height={24} color={palette.deepSkyBlue} strokeWidth={2.5} />
                  </Pressable>
                ))
              ) : (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Typography variant="body" color={colors.textSecondary}>No se encontraron resultados.</Typography>
                </View>
              )}
            </ScrollView>

          </Card>
        </KeyboardAvoidingView>
      </Modal>

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
  sectionTitle: { fontWeight: '700', letterSpacing: 0.5, marginBottom: 12 },
  input: { fontSize: 16, borderRadius: 20, paddingVertical: 16, paddingHorizontal: 20, fontWeight: '500', borderWidth: 2 },
  difficultyContainer: { flexDirection: 'row', gap: 8 },
  difficultyBox: { flex: 1, height: 48, borderRadius: 12, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  itemsListContainer: { gap: 12 },
  moduleItemRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 2 },
  itemTypeIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemInfo: { flex: 1 },
  removeItemBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20, borderRadius: 20, borderWidth: 2, borderStyle: 'dashed', marginTop: 8 },
  bottomBar: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 110, borderTopWidth: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end', alignItems: 'center' },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  dialogCard: { width: '100%', height: '85%', padding: 0, overflow: 'hidden', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  dialogHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 0 },
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)' },
  tabBtn: { flex: 1, paddingVertical: 16, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, gap: 10 },
  searchInput: { flex: 1, fontSize: 16, fontWeight: '500' },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
});