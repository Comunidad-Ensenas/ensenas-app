import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { IconBox } from '@/components/common/IconBox';
import { IconButton } from '@/components/common/IconButton';
import { SectionHeader } from '@/components/common/SectionHeader';
import SignPlayer from '@/components/common/SignPlayer';
import { Typography } from '@/components/common/Typography';
import { useTheme } from '@/hooks/useTheme';
import { useStudioStore } from '@/store/useStudioStore';
import { router } from 'expo-router';
import {
  BookStack,
  ChatBubble,
  DragHandGesture,
  Edit,
  NavArrowRight,
  Trash,
  VideoCamera,
  Xmark,
} from 'iconoir-react-native';
import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: screenWidth } = Dimensions.get('window');
const playerWidth = screenWidth - 88;
const playerHeight = playerWidth * 1.33;

const TAB_TITLES = {
  configs: 'Configuraciones',
  signs: 'Señas',
  phrases: 'Frases',
  modules: 'Módulos'
} as const;

export default function StudioExportScreen() {
  const { colors } = useTheme();
  const palette = (colors as any).palette;

  const { configs, signs, phrases, modules, setConfigs, setSigns, setPhrases, setModules } = useStudioStore();

  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'configs' | 'signs' | 'phrases' | 'modules'>('configs');

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedItemType, setSelectedItemType] = useState<'config' | 'sign' | 'phrase' | 'module' | null>(null);

  const getConfigName = (idToFind: string) => {
    if (!idToFind) return 'Ninguna';
    const config = configs.find(c => c.local_id === idToFind);
    return config?.name || 'Configuración eliminada';
  };

  const getSignName = (idToFind: string) => {
    if (!idToFind) return 'Desconocida';
    const sign = signs.find(s => s.local_id === idToFind);
    return sign?.meanings?.[0] || 'Seña eliminada';
  };

  const getPhraseName = (idToFind: string) => {
    if (!idToFind) return 'Desconocida';
    const phrase = phrases.find(p => p.local_id === idToFind);
    return phrase?.spanish_translation || 'Frase eliminada';
  };

  const executeCascadeDelete = async (type: 'config' | 'sign' | 'phrase' | 'module', targetId: string) => {
    let newConfigs = [...configs];
    let newSigns = [...signs];
    let newPhrases = [...phrases];
    let newModules = [...modules];
    
    let deletedSignIds = new Set<string>();
    let deletedPhraseIds = new Set<string>();

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

    await Promise.all([
      setConfigs(newConfigs),
      setSigns(newSigns),
      setPhrases(newPhrases),
      setModules(newModules)
    ]);
    
    setIsDetailOpen(false);
  };

  const handleDeleteConfig = (targetId: string) => {
    Alert.alert("¿Borrar Configuración?", "Se eliminarán en cascada TODAS las señas, frases y módulos que dependan de esta configuración para evitar corromper los datos.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Borrar en Cascada", style: "destructive", onPress: () => executeCascadeDelete('config', targetId) }
    ]);
  };

  const handleDeleteSign = (targetId: string) => {
    Alert.alert("¿Borrar Seña?", "Se eliminará también de las Frases y Módulos que la utilicen.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Borrar en Cascada", style: "destructive", onPress: () => executeCascadeDelete('sign', targetId) }
    ]);
  };

  const handleDeletePhrase = (targetId: string) => {
    Alert.alert("¿Borrar Frase?", "Se eliminará también de los Módulos que la utilicen.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Borrar en Cascada", style: "destructive", onPress: () => executeCascadeDelete('phrase', targetId) }
    ]);
  };

  const handleDeleteModule = (targetId: string) => {
    Alert.alert("¿Borrar Módulo?", "Solo se borrará el módulo, el contenido seguirá existiendo.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Borrar", style: "destructive", onPress: () => executeCascadeDelete('module', targetId) }
    ]);
  };

  const handleClearAll = () => {
    Alert.alert("⚠️ PELIGRO: Borrar Todo", "Esto eliminará permanentemente todo tu trabajo local.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sí, destruir datos", style: "destructive", onPress: async () => {
          await Promise.all([
            setConfigs([]),
            setSigns([]),
            setPhrases([]),
            setModules([])
          ]);
          Alert.alert("Listo", "Almacenamiento local formateado.");
        }
      }
    ]);
  };

  const openDetails = (item: any, type: 'config' | 'sign' | 'phrase' | 'module') => {
    setSelectedItem(item);
    setSelectedItemType(type);
    setIsDetailOpen(true);
  };

  const handleEditItem = () => {
    setIsDetailOpen(false);
    setIsExplorerOpen(false);

    if (selectedItemType === 'module') {
      router.push({ pathname: './modules', params: { moduleId: selectedItem.local_id } } as any);
    } else if (selectedItemType === 'phrase') {
      router.push({ pathname: '/phrases', params: { phraseId: selectedItem.local_id } } as any);
    } else if (selectedItemType === 'sign') {
      router.push({ pathname: '/capture', params: { signId: selectedItem.local_id } } as any);
    }
  };

  const renderExplorerList = () => {
    switch (activeTab) {
      case 'configs':
        return configs.map((item, index) => (
          <View key={item.local_id} style={[styles.listItem, { backgroundColor: colors.surface, padding: 8 }]}>
            <Pressable style={styles.listItemPressable} onPress={() => openDetails(item, 'config')}>
              <Typography variant="label" color={colors.textSecondary} style={{ width: 24, marginLeft: 8 }}>#{index + 1}</Typography>
              <IconBox size={44} icon={<DragHandGesture width={24} height={24} color={palette.deepSkyBlue} />} backgroundColor={palette.deepSkyBlue + '20'} style={{ marginHorizontal: 12 }} />
              <View style={{ flex: 1 }}>
                <Typography variant="body" style={{ fontWeight: '800' }}>{item.name}</Typography>
                <Typography variant="label" color={colors.textSecondary}>Configuración manual</Typography>
              </View>
              <NavArrowRight width={24} height={24} color={colors.icon} />
            </Pressable>
            <IconButton icon={<Trash width={20} height={20} color={colors.danger} />} backgroundColor={colors.dangerBg} onPress={() => handleDeleteConfig(item.local_id)} style={{ marginLeft: 8, marginRight: 8 }} />
          </View>
        ));
      case 'signs':
        return signs.map((item, index) => (
          <View key={item.local_id} style={[styles.listItem, { backgroundColor: colors.surface, padding: 8 }]}>
            <Pressable style={styles.listItemPressable} onPress={() => openDetails(item, 'sign')}>
              <Typography variant="label" color={colors.textSecondary} style={{ width: 24, marginLeft: 8 }}>#{index + 1}</Typography>
              <IconBox size={44} icon={<VideoCamera width={24} height={24} color={colors.success} />} backgroundColor={colors.successBg} style={{ marginHorizontal: 12 }} />
              <View style={{ flex: 1 }}>
                <Typography variant="body" style={{ fontWeight: '800' }}>{item.meanings?.[0] || 'Sin Nombre'}</Typography>
                <Typography variant="label" color={colors.textSecondary}>{item.meanings?.length} significado(s)</Typography>
              </View>
              <NavArrowRight width={24} height={24} color={colors.icon} />
            </Pressable>
            <IconButton icon={<Trash width={20} height={20} color={colors.danger} />} backgroundColor={colors.dangerBg} onPress={() => handleDeleteSign(item.local_id)} style={{ marginLeft: 8, marginRight: 8 }} />
          </View>
        ));
      case 'phrases':
        return phrases.map((item, index) => (
          <View key={item.local_id} style={[styles.listItem, { backgroundColor: colors.surface, padding: 8 }]}>
            <Pressable style={styles.listItemPressable} onPress={() => openDetails(item, 'phrase')}>
              <Typography variant="label" color={colors.textSecondary} style={{ width: 24, marginLeft: 8 }}>#{index + 1}</Typography>
              <IconBox size={44} icon={<ChatBubble width={24} height={24} color={palette.powderBlush} />} backgroundColor={palette.powderBlush + '20'} style={{ marginHorizontal: 12 }} />
              <View style={{ flex: 1 }}>
                <Typography variant="body" style={{ fontWeight: '800' }}>{item.spanish_translation}</Typography>
                <Typography variant="label" color={colors.textSecondary}>{item.signs_list?.length || 0} señas en secuencia</Typography>
              </View>
              <NavArrowRight width={24} height={24} color={colors.icon} />
            </Pressable>
            <IconButton icon={<Trash width={20} height={20} color={colors.danger} />} backgroundColor={colors.dangerBg} onPress={() => handleDeletePhrase(item.local_id)} style={{ marginLeft: 8, marginRight: 8 }} />
          </View>
        ));
      case 'modules':
        return modules.map((item, index) => (
          <View key={item.local_id} style={[styles.listItem, { backgroundColor: colors.surface, padding: 8 }]}>
            <Pressable style={styles.listItemPressable} onPress={() => openDetails(item, 'module')}>
              <Typography variant="label" color={colors.textSecondary} style={{ width: 24, marginLeft: 8 }}>#{index + 1}</Typography>
              <IconBox size={44} icon={<BookStack width={24} height={24} color={palette.berryCrush} />} backgroundColor={palette.berryCrush + '20'} style={{ marginHorizontal: 12 }} />
              <View style={{ flex: 1 }}>
                <Typography variant="body" style={{ fontWeight: '800' }}>{item.title}</Typography>
                <Typography variant="label" color={colors.textSecondary}>Nivel {item.difficulty_level} • {item.items_list?.length || 0} elementos</Typography>
              </View>
              <NavArrowRight width={24} height={24} color={colors.icon} />
            </Pressable>
            <IconButton icon={<Trash width={20} height={20} color={colors.danger} />} backgroundColor={colors.dangerBg} onPress={() => handleDeleteModule(item.local_id)} style={{ marginLeft: 8, marginRight: 8 }} />
          </View>
        ));
    }
  };

  const renderDetailContent = () => {
    if (!selectedItem) return null;

    if (selectedItemType === 'config') {
      return (
        <>
          <View style={{ width: '100%', height: playerHeight, marginBottom: 24, borderRadius: 24, overflow: 'hidden', backgroundColor: '#111' }}>
            <SignPlayer
              animData={selectedItem.baked_quaternions}
              width={playerWidth}
              height={playerHeight}
              orbitTarget={[-0.4, 0.3, 0]}
              isConfigPreview={true}
            />
          </View>
          <View style={styles.detailGroup}>
            <Typography variant="label" color={colors.textSecondary} style={styles.detailLabel}>NOMBRE</Typography>
            <Typography variant="body">{selectedItem.name}</Typography>
          </View>
          <View style={styles.detailGroup}>
            <Typography variant="label" color={colors.textSecondary} style={styles.detailLabel}>PUNTOS CRUDOS CAPTURADOS</Typography>
            <Typography variant="body">21 puntos articulares (HandLandmarker)</Typography>
          </View>
        </>
      );
    }

    if (selectedItemType === 'sign') {
      return (
        <>
          <View style={{ width: '100%', height: playerHeight, marginBottom: 24, borderRadius: 24, overflow: 'hidden', backgroundColor: '#111' }}>
            <SignPlayer
              animationFile={selectedItem.baked_animation || selectedItem.animationFile}
              width={playerWidth}
              height={playerHeight}
            />
          </View>

          <View style={styles.detailGroup}>
            <Typography variant="label" color={colors.textSecondary} style={styles.detailLabel}>SIGNIFICADOS</Typography>
            <Typography variant="body">{selectedItem.meanings?.join(', ')}</Typography>
          </View>
          <View style={styles.detailGroup}>
            <Typography variant="label" color={colors.textSecondary} style={styles.detailLabel}>CONFIGURACIÓN (MANO DOMINANTE)</Typography>
            <View style={[styles.relationPill, { backgroundColor: palette.deepSkyBlue + '15' }]}>
              <DragHandGesture width={20} height={20} color={palette.deepSkyBlue} />
              <Typography variant="body" color={palette.deepSkyBlue} style={{ fontWeight: '700', flex: 1 }}>
                {getConfigName(selectedItem.dominant_config_id || selectedItem.configHandDominantId)}
              </Typography>
            </View>
          </View>
          {(selectedItem.recessive_config_id || selectedItem.configHandRecessiveId) && (
            <View style={styles.detailGroup}>
              <Typography variant="label" color={colors.textSecondary} style={styles.detailLabel}>CONFIGURACIÓN (MANO RECESIVA)</Typography>
              <View style={[styles.relationPill, { backgroundColor: palette.deepSkyBlue + '15' }]}>
                <DragHandGesture width={20} height={20} color={palette.deepSkyBlue} />
                <Typography variant="body" color={palette.deepSkyBlue} style={{ fontWeight: '700', flex: 1 }}>
                  {getConfigName(selectedItem.recessive_config_id || selectedItem.configHandRecessiveId)}
                </Typography>
              </View>
            </View>
          )}
        </>
      );
    }

    if (selectedItemType === 'phrase') {
      return (
        <>
          <View style={styles.detailGroup}>
            <Typography variant="label" color={colors.textSecondary} style={styles.detailLabel}>GLOSA LSV</Typography>
            <Typography variant="body">{selectedItem.lsv_gloss}</Typography>
          </View>
          <View style={styles.detailGroup}>
            <Typography variant="label" color={colors.textSecondary} style={styles.detailLabel}>SECUENCIA DE SEÑAS ({selectedItem.signs_list?.length})</Typography>
            {selectedItem.signs_list?.map((s: any, idx: number) => (
              <View key={idx} style={[styles.relationPill, { backgroundColor: colors.successBg, marginBottom: 8 }]}>
                <Typography variant="body" color={colors.success} style={{ fontWeight: '800' }}>{idx + 1}.</Typography>
                <VideoCamera width={20} height={20} color={colors.success} />
                <Typography variant="body" color={colors.success} style={{ fontWeight: '700', flex: 1 }}>
                  {getSignName(s.sign_id)}
                </Typography>
              </View>
            ))}
          </View>
        </>
      );
    }

    if (selectedItemType === 'module') {
      return (
        <>
          <View style={styles.detailGroup}>
            <Typography variant="label" color={colors.textSecondary} style={styles.detailLabel}>DESCRIPCIÓN</Typography>
            <Typography variant="body">{selectedItem.description || 'Sin descripción'}</Typography>
          </View>
          <View style={styles.detailGroup}>
            <Typography variant="label" color={colors.textSecondary} style={styles.detailLabel}>CONTENIDO DEL MÓDULO ({selectedItem.items_list?.length})</Typography>
            {selectedItem.items_list?.sort((a: any, b: any) => a.order_index - b.order_index).map((item: any, idx: number) => {
              const isSign = item.item_type === 'sign';
              const isPhrase = item.item_type === 'phrase';
              
              const tintColor = isSign ? colors.success : isPhrase ? palette.powderBlush : palette.deepSkyBlue;
              const bgTint = isSign ? colors.successBg : isPhrase ? `${palette.powderBlush}15` : `${palette.deepSkyBlue}15`;
              
              const itemName = isSign ? getSignName(item.sign_id) : isPhrase ? getPhraseName(item.phrase_id) : getConfigName(item.config_id);
              const typeLabel = isSign ? 'Seña' : isPhrase ? 'Frase' : 'Configuración';

              return (
                <View key={idx} style={[styles.relationPill, { backgroundColor: bgTint, marginBottom: 8 }]}>
                  <Typography variant="body" color={tintColor} style={{ fontWeight: '800' }}>{idx + 1}.</Typography>
                  {isSign ? <VideoCamera width={20} height={20} color={tintColor} /> : isPhrase ? <ChatBubble width={20} height={20} color={tintColor} /> : <DragHandGesture width={20} height={20} color={tintColor} />}
                  <Typography variant="body" color={tintColor} style={{ fontWeight: '700', flex: 1 }}>
                    {itemName} <Typography variant="label" style={{ opacity: 0.7 }}>({typeLabel})</Typography>
                  </Typography>
                </View>
              );
            })}
          </View>
        </>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Typography variant="h3">Datos</Typography>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsContainer}>
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconBox size={44} icon={<DragHandGesture width={24} height={24} color={palette.deepSkyBlue} />} backgroundColor={palette.deepSkyBlue + '15'} />
            <Typography variant="h2" style={{ marginTop: 12 }}>{configs.length}</Typography>
            <Typography variant="label" color={colors.textSecondary} style={{ marginTop: 4 }}>Configuraciones</Typography>
          </View>

          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconBox size={44} icon={<VideoCamera width={24} height={24} color={colors.success} />} backgroundColor={colors.successBg} />
            <Typography variant="h2" style={{ marginTop: 12 }}>{signs.length}</Typography>
            <Typography variant="label" color={colors.textSecondary} style={{ marginTop: 4 }}>Señas</Typography>
          </View>

          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconBox size={44} icon={<ChatBubble width={24} height={24} color={palette.powderBlush} />} backgroundColor={palette.powderBlush + '15'} />
            <Typography variant="h2" style={{ marginTop: 12 }}>{phrases.length}</Typography>
            <Typography variant="label" color={colors.textSecondary} style={{ marginTop: 4 }}>Frases</Typography>
          </View>

          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconBox size={44} icon={<BookStack width={24} height={24} color={palette.berryCrush} />} backgroundColor={palette.berryCrush + '15'} />
            <Typography variant="h2" style={{ marginTop: 12 }}>{modules.length}</Typography>
            <Typography variant="label" color={colors.textSecondary} style={{ marginTop: 4 }}>Módulos</Typography>
          </View>
        </View>

        <SectionHeader title="Acciones" />
        <View style={styles.actionsContainer}>
          <Button
            title="EXPLORAR DATOS LOCALES"
            variant="secondary"
            onPress={() => setIsExplorerOpen(true)}
          />
          <Button
            title="Formatear Local"
            color={colors.dangerBg}
            textColor={colors.danger}
            icon={<Trash width={20} height={20} color={colors.danger} strokeWidth={2.5} />}
            onPress={handleClearAll}
          />
        </View>
      </ScrollView>

      <Modal visible={isExplorerOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsExplorerOpen(false)}>
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Typography variant="h2">Explorador Local</Typography>
            <IconButton size={36} icon={<Xmark width={22} height={22} color={colors.text} strokeWidth={2} />} backgroundColor={colors.surface} onPress={() => setIsExplorerOpen(false)} />
          </View>

          <View style={[styles.tabsContainer, { borderBottomColor: colors.border }]}>
            {(Object.keys(TAB_TITLES) as Array<keyof typeof TAB_TITLES>).map((tab) => {
              const isActive = activeTab === tab;
              const tabColor = isActive ? palette.deepSkyBlue : colors.textSecondary;
              const title = TAB_TITLES[tab];

              return (
                <Pressable
                  key={tab}
                  style={[styles.tabBtn, isActive && { borderBottomColor: palette.deepSkyBlue }]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Typography variant="label" color={tabColor} numberOfLines={1} adjustsFontSizeToFit style={{ fontWeight: isActive ? '800' : '500', width: '100%', textAlign: 'center' }}>
                    {title}
                  </Typography>
                </Pressable>
              );
            })}
          </View>

          <ScrollView contentContainerStyle={styles.explorerScroll}>
            {renderExplorerList().length > 0 ? renderExplorerList() : (
              <View style={styles.emptyState}>
                <Typography variant="body" color={colors.textSecondary}>No hay datos en esta categoría.</Typography>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={isDetailOpen} transparent={true} animationType="fade" onRequestClose={() => setIsDetailOpen(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsDetailOpen(false)} />
          <Card style={[styles.detailCard, { backgroundColor: colors.background }]}>
            <View style={styles.detailHeader}>
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Typography variant="h2" numberOfLines={1}>
                  {selectedItemType === 'sign' ? selectedItem?.meanings?.[0] :
                    selectedItemType === 'phrase' ? selectedItem?.spanish_translation :
                      selectedItem?.title || selectedItem?.name}
                </Typography>
              </View>
              <IconButton size={36} icon={<Xmark width={22} height={22} color={colors.text} strokeWidth={2} />} backgroundColor={colors.surface} onPress={() => setIsDetailOpen(false)} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              {renderDetailContent()}
            </ScrollView>

            <View style={{ marginTop: 24, gap: 12 }}>
              {selectedItemType !== 'config' && (
                <Button
                  title="Editar Elemento"
                  color={colors.surface}
                  textColor={colors.text}
                  icon={<Edit width={20} height={20} color={colors.text} strokeWidth={2.5} />}
                  onPress={handleEditItem}
                  style={{ borderWidth: 1, borderColor: colors.border }}
                />
              )}
              <Button
                title="Borrar Elemento"
                color={colors.dangerBg}
                textColor={colors.danger}
                icon={<Trash width={20} height={20} color={colors.danger} strokeWidth={2.5} />}
                onPress={() => {
                  if (selectedItemType === 'config') handleDeleteConfig(selectedItem.local_id);
                  if (selectedItemType === 'sign') handleDeleteSign(selectedItem.local_id);
                  if (selectedItemType === 'phrase') handleDeletePhrase(selectedItem.local_id);
                  if (selectedItemType === 'module') handleDeleteModule(selectedItem.local_id);
                }}
              />
            </View>
          </Card>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 12 },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  content: { paddingHorizontal: 24, paddingBottom: 60, paddingTop: 8 },
  statsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 36, rowGap: 14 },
  statBox: { width: '48%', padding: 20, borderRadius: 24, borderWidth: 1, alignItems: 'flex-start' },
  actionsContainer: { gap: 12 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 16 },
  tabsContainer: { flexDirection: 'row', borderBottomWidth: 1 },
  tabBtn: { flex: 1, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent', paddingHorizontal: 4 },
  explorerScroll: { padding: 24, gap: 16 },
  listItem: { flexDirection: 'row', alignItems: 'center', borderRadius: 24, padding: 16 },
  listItemPressable: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  emptyState: { padding: 40, alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  detailCard: { width: '100%', padding: 24, borderRadius: 32 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  detailGroup: { marginBottom: 20 },
  detailLabel: { marginBottom: 8, letterSpacing: 0.5 },
  relationPill: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, gap: 12 },
});