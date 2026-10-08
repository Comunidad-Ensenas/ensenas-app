import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { IconButton } from '@/components/common/IconButton';
import { Typography } from '@/components/common/Typography';
import { db } from '@/db';
import { signs } from '@/db/schema';
import { useTheme } from '@/hooks/useTheme';
import { useStudioStore } from '@/store/useStudioStore';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, Plus, Search, Xmark } from 'iconoir-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StudioPhraseScreen() {
  const { colors } = useTheme();
  const palette = (colors as any).palette;

  const { phraseId } = useLocalSearchParams<{ phraseId?: string }>();

  const { signs: localSignsRaw, phrases: localPhrasesRaw, setPhrases } = useStudioStore();

  const [spanishTranslation, setSpanishTranslation] = useState('');
  const [lsvGloss, setLsvGloss] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSigns, setSelectedSigns] = useState<any[]>([]);

  const [dbSignsState, setDbSignsState] = useState<any[]>([]);
  const [isSignSelectorOpen, setIsSignSelectorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const formattedLocalSigns = useMemo(() => localSignsRaw.map((item: any) => ({
    id: item.local_id || item.timestamp,
    meanings: item.meanings || [],
    isLocal: true
  })), [localSignsRaw]);

  const availableSigns = useMemo(() => [...formattedLocalSigns, ...dbSignsState], [formattedLocalSigns, dbSignsState]);

  useFocusEffect(
    useCallback(() => {
      const fetchDb = async () => {
        try {
          const dbS = await db.select().from(signs);
          setDbSignsState(dbS.map(s => ({
            id: s.localId,
            meanings: s.meaningsJson ? JSON.parse(s.meaningsJson) : [s.title],
            isLocal: false
          })));
        } catch (e) { }
      };
      fetchDb();
    }, [])
  );

  useEffect(() => {
    if (phraseId) {
      const phraseToEdit = localPhrasesRaw.find((p: any) => p.id === phraseId || p.local_id === phraseId);

      if (phraseToEdit) {
        setSpanishTranslation(phraseToEdit.spanish_translation);
        setLsvGloss(phraseToEdit.lsv_gloss);
        setDescription(phraseToEdit.description || '');

        const loadedSigns = phraseToEdit.signs_list.map((item: any) => {
          const foundSign = availableSigns.find(s => s.id === item.sign_id);
          return {
            id: item.sign_id,
            meanings: foundSign ? foundSign.meanings : ['Seña eliminada'],
            isLocal: foundSign ? foundSign.isLocal : false,
            listId: `loaded_sign_${item.sign_id}_${item.order_index}_${Date.now()}`
          };
        });

        setSelectedSigns(loadedSigns);
      }
    } else {
      setSpanishTranslation('');
      setLsvGloss('');
      setDescription('');
      setSelectedSigns([]);
    }
  }, [phraseId, localPhrasesRaw, availableSigns]);

  const handleAddSign = (sign: any) => {
    setSelectedSigns([...selectedSigns, { ...sign, listId: Date.now().toString() + Math.random().toString() }]);
    setIsSignSelectorOpen(false);
    setSearchQuery('');
  };

  const handleRemoveSign = (listIdToRemove: string) => {
    setSelectedSigns(selectedSigns.filter(s => s.listId !== listIdToRemove));
  };

  const handleSavePhrase = async () => {
    if (selectedSigns.length === 0 || !spanishTranslation.trim() || !lsvGloss.trim()) return;

    try {
      const targetId = phraseId || `local_phrase_${Date.now()}`;

      const phraseData = {
        local_id: targetId,
        id: targetId,
        spanish_translation: spanishTranslation.trim(),
        lsv_gloss: lsvGloss.trim(),
        description: description.trim(),
        signs_list: selectedSigns.map((s, index) => ({
          sign_id: s.id,
          order_index: index
        }))
      };

      if (phraseId) {
        const updatedPhrases = localPhrasesRaw.map((p: any) => (p.id === phraseId || p.local_id === phraseId) ? phraseData : p);
        await setPhrases(updatedPhrases);
        Alert.alert("Frase Actualizada", "Los cambios se han guardado correctamente.", [
          { text: "OK", onPress: () => router.back() }
        ]);
      } else {
        await setPhrases([...localPhrasesRaw, phraseData]);
        Alert.alert("Frase Guardada", "La frase se estructuró y guardó correctamente.");
        setSpanishTranslation('');
        setLsvGloss('');
        setDescription('');
        setSelectedSigns([]);
      }

    } catch (e) {
      Alert.alert("Error", "Ocurrió un problema al guardar la frase.");
    }
  };

  const filteredSigns = availableSigns.filter(sign =>
    sign.meanings.some((m: string) => m.toLowerCase().includes(searchQuery.toLowerCase().trim()))
  );

  const isFormValid = selectedSigns.length > 0 && spanishTranslation.trim() !== '' && lsvGloss.trim() !== '';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>

      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Typography variant="h3">{phraseId ? 'Editar Frase' : 'Crear Frase'}</Typography>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Typography variant="subtitle" color={colors.textSecondary} style={styles.sectionTitle}>SEÑAS EN ORDEN *</Typography>
            <Typography variant="label" color={colors.textSecondary}>{selectedSigns.length} seleccionadas</Typography>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.signsListContainer}>
            {selectedSigns.map((sign, index) => (
              <View key={sign.listId} style={[styles.selectedSignCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.orderBadge, { backgroundColor: palette.deepSkyBlue }]}>
                  <Typography variant="label" color="#FFFFFF" style={{ fontWeight: '800', fontSize: 12 }}>{index + 1}</Typography>
                </View>
                <Typography variant="body" color={colors.text} style={{ fontWeight: '600', marginBottom: 4 }} numberOfLines={2} align="center">
                  {sign.meanings[0]}
                </Typography>
                <Pressable onPress={() => handleRemoveSign(sign.listId)} style={[styles.removeSignBtn, { backgroundColor: colors.input }]}>
                  <Xmark width={16} height={16} color={colors.textSecondary} strokeWidth={2.5} />
                </Pressable>
              </View>
            ))}

            <Pressable
              style={[styles.addSignBtn, { borderColor: palette.deepSkyBlue, backgroundColor: `${palette.deepSkyBlue}15` }]}
              onPress={() => setIsSignSelectorOpen(true)}
            >
              <Plus width={28} height={28} color={palette.deepSkyBlue} strokeWidth={2.5} />
              <Typography variant="label" color={palette.deepSkyBlue} style={{ fontWeight: '700', marginTop: 4 }}>Agregar</Typography>
            </Pressable>
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Typography variant="subtitle" color={colors.textSecondary} style={styles.sectionTitle}>TRADUCCIÓN AL ESPAÑOL *</Typography>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: spanishTranslation ? palette.deepSkyBlue : colors.border }]}
            placeholder="Ej: Hola, ¿cómo estás?"
            placeholderTextColor={colors.textSecondary}
            value={spanishTranslation}
            onChangeText={setSpanishTranslation}
          />
        </View>

        <View style={styles.section}>
          <Typography variant="subtitle" color={colors.textSecondary} style={styles.sectionTitle}>GLOSA LSV *</Typography>
          <Typography variant="label" color={colors.textSecondary} style={{ marginBottom: 12 }}>
            Estructura gramatical propia de la Lengua de Señas.
          </Typography>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: lsvGloss ? palette.deepSkyBlue : colors.border }]}
            placeholder="Ej: HOLA TU COMO ESTAS"
            placeholderTextColor={colors.textSecondary}
            value={lsvGloss}
            onChangeText={setLsvGloss}
            autoCapitalize="characters"
          />
        </View>

        <View style={styles.section}>
          <Typography variant="subtitle" color={colors.textSecondary} style={styles.sectionTitle}>DESCRIPCIÓN (OPCIONAL)</Typography>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: description ? palette.deepSkyBlue : colors.border, height: 100 }]}
            placeholder="Contexto de uso o intención de la frase..."
            placeholderTextColor={colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline={true}
            textAlignVertical="top"
          />
        </View>

      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Button
          title={phraseId ? "Actualizar Frase" : "Guardar Frase"}
          color={palette.deepSkyBlue}
          textColor="#FFFFFF"
          icon={<Check width={20} height={20} color="#FFFFFF" strokeWidth={2.5} />}
          onPress={handleSavePhrase}
          disabled={!isFormValid}
          style={{ opacity: !isFormValid ? 0.5 : 1 }}
        />
      </View>

      <Modal visible={isSignSelectorOpen} transparent={true} animationType="slide" onRequestClose={() => setIsSignSelectorOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsSignSelectorOpen(false)} />
          <Card style={[styles.dialogCard, { backgroundColor: colors.background }]}>

            <View style={[styles.dialogHeader, { paddingBottom: 16 }]}>
              <Typography variant="h2">Seleccionar Seña</Typography>
              <IconButton size={36} icon={<Xmark width={22} height={22} color={colors.text} strokeWidth={2} />} backgroundColor={colors.surface} onPress={() => setIsSignSelectorOpen(false)} />
            </View>

            <View style={{ paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <View style={[styles.searchBar, { backgroundColor: colors.input }]}>
                <Search width={20} height={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Buscar significado..."
                  placeholderTextColor={colors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus={true}
                />
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ padding: 24 }}>
              {filteredSigns.length > 0 ? (
                filteredSigns.map((sign) => (
                  <Pressable
                    key={`search-${sign.id}`}
                    style={[styles.signListItem, { borderBottomColor: colors.border }]}
                    onPress={() => handleAddSign(sign)}
                  >
                    <View style={{ flex: 1, gap: 6 }}>
                      <Typography variant="body" color={colors.text} style={{ fontWeight: '600' }}>
                        {sign.meanings[0]}
                      </Typography>
                      {sign.meanings.length > 1 && (
                        <Typography variant="label" color={colors.textSecondary}>
                          {sign.meanings.slice(1).join(', ')}
                        </Typography>
                      )}
                    </View>
                    {sign.isLocal && (
                      <View style={{ backgroundColor: palette.powderBlush, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 12 }}>
                        <Typography variant="label" color="#111" style={{ fontSize: 10, fontWeight: '800' }}>NUEVO</Typography>
                      </View>
                    )}
                    <Plus width={24} height={24} color={palette.deepSkyBlue} strokeWidth={2.5} />
                  </Pressable>
                ))
              ) : (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Typography variant="body" color={colors.textSecondary}>No se encontraron señas.</Typography>
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
  sectionTitle: { fontWeight: '700', letterSpacing: 0.5 },
  signsListContainer: { gap: 12, paddingBottom: 4, paddingRight: 24 },
  selectedSignCard: { width: 140, height: 120, borderRadius: 20, borderWidth: 2, padding: 16, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  orderBadge: { position: 'absolute', top: -8, left: -8, width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  removeSignBtn: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  addSignBtn: { width: 140, height: 120, borderRadius: 20, borderWidth: 2, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  input: { fontSize: 16, borderRadius: 20, paddingVertical: 16, paddingHorizontal: 20, fontWeight: '500', borderWidth: 2 },
  bottomBar: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 110, borderTopWidth: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end', alignItems: 'center' },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  dialogCard: { width: '100%', height: '80%', padding: 0, overflow: 'hidden', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  dialogHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, gap: 10 },
  searchInput: { flex: 1, fontSize: 16, fontWeight: '500' },
  signListItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
});