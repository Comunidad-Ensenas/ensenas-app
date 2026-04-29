import { useTheme } from '@/hooks/useTheme';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StudioExportScreen() {
  const { colors, isDark } = useTheme();
  
  const [sessionStats, setSessionStats] = useState({ manualConfigsCount: 0, recordedSignsCount: 0 });
  const [persistedData, setPersistedData] = useState({ manualConfigs: [], recordedSigns: [] });
  
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedSignMeanings, setSelectedSignMeanings] = useState<string[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      const loadPersistedData = async () => {
        try {
          const storedConfigs = await AsyncStorage.getItem('@ensenas_manual_configs');
          const storedSigns = await AsyncStorage.getItem('@ensenas_recorded_signs');
          
          const parsedConfigs = storedConfigs ? JSON.parse(storedConfigs) : [];
          const parsedSigns = storedSigns ? JSON.parse(storedSigns) : [];

          setSessionStats({ manualConfigsCount: parsedConfigs.length, recordedSignsCount: parsedSigns.length });
          setPersistedData({ manualConfigs: parsedConfigs, recordedSigns: parsedSigns });
        } catch (e) {}
      };
      loadPersistedData();
    }, [])
  );

  const handleDataExport = async () => {
    if (sessionStats.manualConfigsCount === 0 && sessionStats.recordedSignsCount === 0) {
      Alert.alert("Vacio", "No hay informacion para compartir todavia.");
      return;
    }

    try {
      const exportPayload = {
        metadata: {
          exportDate: new Date().toISOString(),
        },
        manualConfigs: persistedData.manualConfigs,
        recordedSigns: persistedData.recordedSigns 
      };

      const jsonPayload = JSON.stringify(exportPayload, null, 2);
      const fileUri = `${FileSystem.documentDirectory}dataset_ensenas.json`;
      
      await FileSystem.writeAsStringAsync(fileUri, jsonPayload, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Compartir Dataset',
          UTI: 'public.json'
        });
      } else {
        Alert.alert("Error", "No se puede compartir archivos en este dispositivo.");
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo preparar el archivo para compartir.");
    }
  };

  const handleClearData = () => {
    if (sessionStats.manualConfigsCount === 0 && sessionStats.recordedSignsCount === 0) {
      Alert.alert("Vacio", "Ya no hay datos guardados en el telefono.");
      return;
    }

    Alert.alert(
      "¿Borrar todo?",
      "Asegurese de haber compartido el archivo primero. Esta accion eliminara todas las configuraciones manuales y señas guardadas.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Borrar Todo",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['@ensenas_manual_configs', '@ensenas_recorded_signs']);
              setSessionStats({ manualConfigsCount: 0, recordedSignsCount: 0 });
              setPersistedData({ manualConfigs: [], recordedSigns: [] });
              Alert.alert("Listo", "El almacenamiento ha sido limpiado.");
            } catch (e) {
              Alert.alert("Error", "No se pudo limpiar el almacenamiento.");
            }
          }
        }
      ]
    );
  };

  const handleDeleteManualConfig = (timestampToRemove: string) => {
    Alert.alert(
      "¿Borrar configuración?",
      "Se eliminara esta configuracion manual. Las señas que la usan no se borraran, pero quedaran huerfanas.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Borrar",
          style: "destructive",
          onPress: async () => {
            try {
              const updatedConfigs = persistedData.manualConfigs.filter((c: any) => c.timestamp !== timestampToRemove);
              await AsyncStorage.setItem('@ensenas_manual_configs', JSON.stringify(updatedConfigs));
              setPersistedData({ ...persistedData, manualConfigs: updatedConfigs });
              setSessionStats({ ...sessionStats, manualConfigsCount: updatedConfigs.length });
            } catch (e) {
              Alert.alert("Error", "No se pudo borrar la configuracion.");
            }
          }
        }
      ]
    );
  };

  const handleDeleteRecordedSign = (timestampToRemove: string) => {
    Alert.alert(
      "¿Borrar seña?",
      "Esta accion no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Borrar",
          style: "destructive",
          onPress: async () => {
            try {
              const updatedSigns = persistedData.recordedSigns.filter((s: any) => s.timestamp !== timestampToRemove);
              await AsyncStorage.setItem('@ensenas_recorded_signs', JSON.stringify(updatedSigns));
              setPersistedData({ ...persistedData, recordedSigns: updatedSigns });
              setSessionStats({ ...sessionStats, recordedSignsCount: updatedSigns.length });
            } catch (e) {
              Alert.alert("Error", "No se pudo borrar la seña.");
            }
          }
        }
      ]
    );
  };

  const handleOpenDetails = (meanings: string[]) => {
    setSelectedSignMeanings(meanings);
    setIsDetailsModalOpen(true);
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month} - ${hours}:${minutes}`;
  };

  const lowerQuery = searchQuery.toLowerCase();
  
  const filteredConfigs = persistedData.manualConfigs.filter((config: any) => 
    config.name && config.name.toLowerCase().includes(lowerQuery)
  );

  const filteredSigns = persistedData.recordedSigns.filter((sign: any) => 
    (sign.manualConfig && sign.manualConfig.toLowerCase().includes(lowerQuery)) ||
    (sign.meanings && sign.meanings.some((m: string) => m.toLowerCase().includes(lowerQuery)))
  );

  const groupedFilteredSigns = filteredSigns.reduce((acc: any, sign: any) => {
    const configName = sign.manualConfig || 'Desconocida';
    if (!acc[configName]) {
      acc[configName] = [];
    }
    acc[configName].push(sign);
    return acc;
  }, {});

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerText, { color: colors.text }]}>Compartir Trabajo</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Resumen de la sesion</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Informacion que ha sido guardada en este telefono.
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{sessionStats.manualConfigsCount}</Text>
            <Text style={[styles.statLabel, { color: colors.text }]}>Configuraciones</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
            <Text style={[styles.statValue, { color: colors.success }]}>{sessionStats.recordedSignsCount}</Text>
            <Text style={[styles.statLabel, { color: colors.text }]}>Señas guardadas</Text>
          </View>
        </View>

        <View style={styles.actionContainer}>
          <Pressable 
            style={[styles.exportBtn, { backgroundColor: colors.primary }]} 
            onPress={handleDataExport}
          >
            <Text style={styles.exportBtnText}>COMPARTIR ARCHIVO</Text>
          </Pressable>

          <Pressable 
            style={[styles.viewDataBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} 
            onPress={() => setIsDataModalOpen(true)}
          >
            <Text style={[styles.viewDataBtnText, { color: colors.text }]}>VER DATOS GUARDADOS</Text>
          </Pressable>

          <Pressable 
            style={[styles.clearBtn, { borderColor: colors.danger }]} 
            onPress={handleClearData}
          >
            <Text style={[styles.clearBtnText, { color: colors.danger }]}>LIMPIAR TODO</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={isDataModalOpen}
        animationType="slide"
        onRequestClose={() => setIsDataModalOpen(false)}
      >
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Datos Guardados</Text>
            <Pressable onPress={() => setIsDataModalOpen(false)} style={styles.closeBtn}>
              <MaterialIcons name="close" size={28} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.searchWrapper}>
            <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <MaterialIcons name="search" size={24} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Buscar configuraciones o señas..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')}>
                  <MaterialIcons name="cancel" size={20} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            
            <View style={styles.listSection}>
              <Text style={[styles.listSectionTitle, { color: colors.text }]}>Configuraciones Registradas ({filteredConfigs.length})</Text>
              {filteredConfigs.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No se encontraron configuraciones.</Text>
              ) : (
                filteredConfigs.map((config: any, index: number) => (
                  <View key={`config-${index}`} style={[styles.dataItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.dataItemTitle, { color: colors.text }]} numberOfLines={1}>{config.name}</Text>
                    <View style={styles.dataItemActions}>
                      <Text style={[styles.dataItemDate, { color: colors.textSecondary }]}>{formatDate(config.timestamp)}</Text>
                      <Pressable onPress={() => handleDeleteManualConfig(config.timestamp)} style={styles.deleteIconBtn}>
                        <MaterialIcons name="delete-outline" size={22} color={colors.danger} />
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={styles.listSection}>
              <Text style={[styles.listSectionTitle, { color: colors.text }]}>Señas Registradas ({filteredSigns.length})</Text>
              {Object.keys(groupedFilteredSigns).length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No se encontraron señas.</Text>
              ) : (
                Object.entries(groupedFilteredSigns).map(([configName, signs]: [string, any], groupIndex: number) => (
                  <View key={`group-${groupIndex}`} style={styles.groupContainer}>
                    <View style={[styles.groupHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.groupTitle, { color: colors.primary }]}>{configName}</Text>
                      <Text style={[styles.groupCount, { color: colors.textSecondary }]}>{signs.length} señas</Text>
                    </View>
                    
                    <View style={styles.groupContent}>
                      {signs.map((sign: any, signIndex: number) => (
                        <View key={`sign-${signIndex}`} style={[styles.signItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                          <Pressable style={styles.signItemContent} onPress={() => handleOpenDetails(sign.meanings)}>
                            <View style={styles.signItemRow}>
                              <Text style={[styles.signItemTitle, { color: colors.text }]} numberOfLines={1}>
                                {sign.meanings[0]} {sign.meanings.length > 1 ? `(+${sign.meanings.length - 1})` : ''}
                              </Text>
                              <MaterialIcons name="chevron-right" size={20} color={colors.icon} />
                            </View>
                            <Text style={[styles.dataItemDate, { color: colors.textSecondary }]}>{formatDate(sign.timestamp)}</Text>
                          </Pressable>
                          
                          <View style={styles.signItemActions}>
                            <Pressable onPress={() => handleDeleteRecordedSign(sign.timestamp)} style={styles.deleteIconBtn}>
                              <MaterialIcons name="delete-outline" size={22} color={colors.danger} />
                            </Pressable>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={isDetailsModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsDetailsModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.detailsModalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.detailsModalTitle, { color: colors.text }]}>Significados Guardados</Text>
            
            <ScrollView style={styles.meaningsListContainer}>
              {selectedSignMeanings.map((meaning, idx) => (
                <View key={`meaning-${idx}`} style={[styles.meaningBubble, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <MaterialIcons name="label" size={16} color={colors.primary} />
                  <Text style={[styles.meaningText, { color: colors.text }]}>{meaning}</Text>
                </View>
              ))}
            </ScrollView>

            <Pressable 
              style={[styles.closeDetailsBtn, { backgroundColor: colors.primary }]} 
              onPress={() => setIsDetailsModalOpen(false)}
            >
              <Text style={styles.closeDetailsBtnText}>CERRAR</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 24, paddingBottom: 12 },
  headerText: { fontSize: 24, fontWeight: 'bold' },
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 110 },
  infoSection: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  sectionSubtitle: { fontSize: 14, lineHeight: 20 },
  statsGrid: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  statCard: { flex: 1, padding: 20, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 32, fontWeight: 'bold', marginBottom: 8 },
  statLabel: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
  actionContainer: { gap: 16 },
  exportBtn: { padding: 18, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  exportBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  viewDataBtn: { padding: 18, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  viewDataBtnText: { fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  clearBtn: { padding: 18, borderRadius: 12, alignItems: 'center', borderWidth: 1, backgroundColor: 'transparent' },
  clearBtnText: { fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  closeBtn: { padding: 4 },
  searchWrapper: { padding: 20, paddingBottom: 10 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderRadius: 12, borderWidth: 1 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 16 },
  modalScrollContent: { padding: 20, paddingBottom: 80 },
  listSection: { marginBottom: 32 },
  listSectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  emptyText: { fontSize: 14, fontStyle: 'italic' },
  dataItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 16, paddingRight: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  dataItemTitle: { fontSize: 16, fontWeight: '500', flex: 1, paddingRight: 10 },
  dataItemActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dataItemDate: { fontSize: 12 },
  deleteIconBtn: { padding: 8 },
  groupContainer: { marginBottom: 20 },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  groupTitle: { fontSize: 14, fontWeight: 'bold' },
  groupCount: { fontSize: 12, fontWeight: '500' },
  groupContent: { paddingLeft: 12 },
  signItem: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, marginBottom: 8, overflow: 'hidden' },
  signItemContent: { flex: 1, padding: 14 },
  signItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  signItemTitle: { fontSize: 15, fontWeight: '500', flex: 1 },
  signItemActions: { paddingRight: 8 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  detailsModalContent: { width: '100%', padding: 24, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10 },
  detailsModalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  meaningsListContainer: { maxHeight: 300, marginBottom: 24 },
  meaningBubble: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 10, gap: 10 },
  meaningText: { fontSize: 16, fontWeight: '500', flex: 1 },
  closeDetailsBtn: { padding: 16, borderRadius: 12, alignItems: 'center' },
  closeDetailsBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
});