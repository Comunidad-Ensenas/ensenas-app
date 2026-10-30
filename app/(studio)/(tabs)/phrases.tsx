import { Button } from '@/components/common/Button';
import { Typography } from '@/components/common/Typography';
import { FormField } from '@/components/studio/FormField';
import { PickerModal } from '@/components/studio/PickerModal';
import { db } from '@/db';
import { signs } from '@/db/schema';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { useTheme } from '@/hooks/useTheme';
import { useStudioStore } from '@/store/useStudioStore';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, Plus, Xmark } from 'iconoir-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StudioPhraseScreen() {
  const { colors } = useTheme();
  const palette = (colors as any).palette;
  const keyboardHeight = useKeyboardHeight();

  const { phraseId } = useLocalSearchParams<{ phraseId?: string }>();

  const { signs: localSignsRaw, phrases: localPhrasesRaw, setPhrases } = useStudioStore();

  const [spanishTranslation, setSpanishTranslation] = useState('');
  const [lsvGloss, setLsvGloss] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSigns, setSelectedSigns] = useState<any[]>([]);

  const [dbSignsState, setDbSignsState] = useState<any[]>([]);
  const [isSignSelectorOpen, setIsSignSelectorOpen] = useState(false);

  const formattedLocalSigns = useMemo(() => localSignsRaw.map((item: any) => ({
    id: item.local_id || item.timestamp,
    meanings: item.meanings || [],
    isLocal: true
  })), [localSignsRaw]);

  const availableSigns = useMemo(() => [...formattedLocalSigns, ...dbSignsState], [formattedLocalSigns, dbSignsState]);

  const signItems = useMemo(() => availableSigns.map((sign) => ({
    id: sign.id,
    label: sign.meanings[0] || 'Seña sin nombre',
    secondary: sign.meanings.length > 1 ? sign.meanings.slice(1).join(', ') : undefined,
    isLocal: sign.isLocal,
  })), [availableSigns]);

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

  const handleAddSign = (item: { id: string }) => {
    const sign = availableSigns.find(s => s.id === item.id);
    if (!sign) return;
    setSelectedSigns([...selectedSigns, { ...sign, listId: Date.now().toString() + Math.random().toString() }]);
    setIsSignSelectorOpen(false);
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

  const isFormValid = selectedSigns.length > 0 && spanishTranslation.trim() !== '' && lsvGloss.trim() !== '';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background, paddingBottom: keyboardHeight }]}
      edges={['top']}
    >

      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Typography variant="h3">{phraseId ? 'Editar Frase' : 'Crear Frase'}</Typography>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Typography variant="label" color={colors.textSecondary} style={styles.sectionTitle}>SEÑAS EN ORDEN *</Typography>
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
                <Pressable
                  onPress={() => handleRemoveSign(sign.listId)}
                  style={[styles.removeSignBtn, { backgroundColor: colors.input }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Quitar ${sign.meanings[0]}`}
                >
                  <Xmark width={16} height={16} color={colors.textSecondary} strokeWidth={2.5} />
                </Pressable>
              </View>
            ))}

            <Pressable
              style={[styles.addSignBtn, { borderColor: palette.deepSkyBlue, backgroundColor: `${palette.deepSkyBlue}15` }]}
              onPress={() => setIsSignSelectorOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Agregar seña"
            >
              <Plus width={28} height={28} color={palette.deepSkyBlue} strokeWidth={2.5} />
              <Typography variant="label" color={palette.deepSkyBlue} style={{ fontWeight: '700', marginTop: 4 }}>Agregar</Typography>
            </Pressable>
          </ScrollView>
        </View>

        <FormField
          label="Traducción al español"
          required
          placeholder="Ej: Hola, ¿cómo estás?"
          value={spanishTranslation}
          onChangeText={setSpanishTranslation}
          containerStyle={styles.section}
        />

        <FormField
          label="Glosa LSV"
          required
          hint="Estructura gramatical propia de la Lengua de Señas."
          placeholder="Ej: HOLA TU COMO ESTAS"
          value={lsvGloss}
          onChangeText={setLsvGloss}
          autoCapitalize="characters"
          autoCorrect={false}
          containerStyle={styles.section}
        />

        <FormField
          label="Descripción"
          hint="Opcional. Contexto de uso o intención de la frase."
          placeholder="Contexto de uso o intención de la frase"
          value={description}
          onChangeText={setDescription}
          multiline
          containerStyle={styles.section}
        />

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
          title={phraseId ? "Actualizar Frase" : "Guardar Frase"}
          color={palette.deepSkyBlue}
          textColor="#FFFFFF"
          icon={<Check width={20} height={20} color="#FFFFFF" strokeWidth={2.5} />}
          onPress={handleSavePhrase}
          disabled={!isFormValid}
          style={{ opacity: !isFormValid ? 0.5 : 1 }}
        />
      </View>

      <PickerModal
        visible={isSignSelectorOpen}
        onClose={() => setIsSignSelectorOpen(false)}
        title="Seleccionar Seña"
        items={signItems}
        onSelect={handleAddSign}
        searchPlaceholder="Buscar significado"
        emptyText="No se encontraron señas."
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
  signsListContainer: { gap: 12, paddingBottom: 4, paddingRight: 24 },
  selectedSignCard: { width: 140, height: 120, borderRadius: 20, borderWidth: 2, padding: 16, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  orderBadge: { position: 'absolute', top: -8, left: -8, width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  removeSignBtn: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  addSignBtn: { width: 140, height: 120, borderRadius: 20, borderWidth: 2, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  bottomBar: { paddingHorizontal: 24, paddingTop: 16, borderTopWidth: 1 },
});
