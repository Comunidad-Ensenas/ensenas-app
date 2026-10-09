import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { IconBox } from '@/components/common/IconBox';
import { IconButton } from '@/components/common/IconButton';
import { SectionHeader } from '@/components/common/SectionHeader';
import SignPlayer from '@/components/common/SignPlayer';
import { Typography } from '@/components/common/Typography';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';
import { useStudioStore } from '@/store/useStudioStore';
import * as FileSystem from 'expo-file-system/legacy';
import { router } from 'expo-router';
import {
  BookStack,
  ChatBubble,
  CloudUpload,
  DragHandGesture,
  Edit,
  NavArrowRight,
  Trash,
  VideoCamera,
  Xmark,
} from 'iconoir-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: screenWidth } = Dimensions.get('window');
const playerWidth = screenWidth - 88;
const playerHeight = playerWidth * 1.33;
const ANIMATIONS_DIRECTORY = `${FileSystem.documentDirectory}ensenas/animations/`;

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

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [isExporting, setIsExporting] = useState(false);

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

  const proceedExport = async () => {
    try {
      if (configs.length > 0) {
        const rawConfigsPayload = configs.map(c => ({
          local_id: c.local_id,
          name: c.name,
          raw_landmarks: c.raw_landmarks,
          learning_tips: c.learning_tips || []
        }));
        
        const appConfigsPayload = configs.map(c => ({
          id: c.local_id,
          name: c.name,
          vector_data: JSON.stringify(c.raw_landmarks),
          raw_source_id: c.local_id,
          learning_tips: c.learning_tips || []
        }));

        const { error: rawConfError } = await supabase.from('raw_manual_configs').upsert(rawConfigsPayload);
        if (rawConfError) throw rawConfError;
        
        const { error: appConfError } = await supabase.from('app_manual_configs').upsert(appConfigsPayload);
        if (appConfError) throw appConfError;
      }

      if (signs.length > 0) {
        const rawSignsPayload = [];
        const appSignsPayload = [];

        for (const s of signs) {
          let rawFramesJson = {};
          
          try {
            if (s.raw_frames) {
              const fileContent = await FileSystem.readAsStringAsync(`${ANIMATIONS_DIRECTORY}${s.raw_frames}`);
              rawFramesJson = JSON.parse(fileContent);
            }
          } catch (e) {}

          if (s.baked_animation) {
            try {
              const animContent = await FileSystem.readAsStringAsync(`${ANIMATIONS_DIRECTORY}${s.baked_animation}`);
              const { error: uploadError } = await supabase.storage
                .from('animations')
                .upload(s.baked_animation, animContent, {
                  contentType: 'application/json',
                  upsert: true
                });
              if (uploadError) console.error("Aviso: Fallo al subir animación", uploadError);
            } catch (e) {}
          }

          rawSignsPayload.push({
            local_id: s.local_id,
            dominant_config_id: s.dominant_config_id,
            recessive_config_id: s.recessive_config_id,
            meanings: s.meanings,
            learning_tips: s.learning_tips || [],
            raw_frames: rawFramesJson
          });

          appSignsPayload.push({
            id: s.local_id,
            meanings: s.meanings,
            dominant_config_id: s.dominant_config_id,
            recessive_config_id: s.recessive_config_id,
            animation_filename: s.baked_animation || 'missing_animation.json',
            raw_source_id: s.local_id,
            learning_tips: s.learning_tips || []
          });
        }

        const { error: rawSignsError } = await supabase.from('raw_signs').upsert(rawSignsPayload);
        if (rawSignsError) throw rawSignsError;
        
        const { error: appSignsError } = await supabase.from('app_signs').upsert(appSignsPayload);
        if (appSignsError) throw appSignsError;
      }

      if (phrases.length > 0) {
        const phrasesPayload = phrases.map(p => ({
          id: p.local_id,
          spanish_translation: p.spanish_translation,
          lsv_gloss: p.lsv_gloss,
          description: p.description || null
        }));
        const { error: pError } = await supabase.from('phrases').upsert(phrasesPayload);
        if (pError) throw pError;

        const phraseSignsPayload = phrases.flatMap(p => p.signs_list.map((s: any) => ({
          phrase_id: p.local_id,
          sign_id: s.sign_id,
          order_index: s.order_index
        })));
        if (phraseSignsPayload.length > 0) {
          const { error: psError } = await supabase.from('phrase_signs').upsert(phraseSignsPayload);
          if (psError) throw psError;
        }
      }

      if (modules.length > 0) {
        const modulesPayload = modules.map(m => ({
          id: m.local_id,
          title: m.title,
          description: m.description || null,
          difficulty_level: m.difficulty_level
        }));
        const { error: mError } = await supabase.from('modules').upsert(modulesPayload);
        if (mError) throw mError;

        const moduleItemsPayload = modules.flatMap(m => m.items_list.map((item: any) => ({
          module_id: m.local_id,
          item_type: item.item_type,
          config_id: item.config_id || null,
          sign_id: item.sign_id || null,
          phrase_id: item.phrase_id || null,
          order_index: item.order_index
        })));
        if (moduleItemsPayload.length > 0) {
          const { error: miError } = await supabase.from('module_items').upsert(moduleItemsPayload);
          if (miError) throw miError;
        }
      }

      Alert.alert("¡Exportación Exitosa!", "Tus datos procesados han sido subidos a producción y los archivos crudos respaldados.");
    } catch (error: any) {
      Alert.alert("Error en Exportación", error.message || "Ocurrió un problema al subir los datos.");
    } finally {
      setIsExporting(false);
    }
  };

  const checkAuthAndExport = async () => {
    if (configs.length === 0 && signs.length === 0 && phrases.length === 0 && modules.length === 0) {
      Alert.alert("Nada que exportar", "No hay datos locales guardados en el Studio.");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      setIsAuthModalOpen(true);
    } else {
      handleExportToCloud(); 
    }
  };

  const handleLogin = async () => {
    setIsAuthenticating(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsAuthenticating(false);

    if (error) {
      Alert.alert("Error", "Credenciales incorrectas.");
    } else {
      setIsAuthModalOpen(false);
      handleExportToCloud();
    }
  };

  const handleExportToCloud = async () => {
    if (configs.length === 0 && signs.length === 0 && phrases.length === 0 && modules.length === 0) {
      Alert.alert("Nada que exportar", "No hay datos locales guardados en el Studio.");
      return;
    }

    setIsExporting(true);

    try {
      const { data: remoteSigns, error } = await supabase.from('raw_signs').select('meanings');
      if (error) throw error;

      const remoteMeanings = new Set<string>();
      remoteSigns?.forEach(rs => {
        if (Array.isArray(rs.meanings)) {
          rs.meanings.forEach((m: string) => remoteMeanings.add(m.toLowerCase().trim()));
        }
      });

      const conflictingSigns = signs.filter(s => {
        const firstMeaning = s.meanings?.[0]?.toLowerCase().trim();
        return firstMeaning && remoteMeanings.has(firstMeaning);
      });

      if (conflictingSigns.length > 0) {
        setIsExporting(false);
        Alert.alert(
          "Posibles Duplicados en la Nube",
          `Se encontraron ${conflictingSigns.length} señas locales (ej. '${conflictingSigns[0].meanings[0]}') que ya existen en la base de datos principal.\n\n¿Deseas subirlas de todas formas como nuevas variantes, o cancelar para revisarlas?`,
          [
            { text: "Cancelar y Revisar", style: "cancel" },
            { 
              text: "Subir como Variantes", 
              style: "default", 
              onPress: () => {
                setIsExporting(true);
                proceedExport();
              }
            }
          ]
        );
      } else {
        proceedExport();
      }
    } catch (e) {
      setIsExporting(false);
      Alert.alert("Error de Conexión", "No se pudo comprobar la información con Supabase.");
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
            title="Exportar a la Nube"
            color={palette.deepSkyBlue}
            textColor="#FFFFFF"
            icon={<CloudUpload width={20} height={20} color="#FFFFFF" strokeWidth={2.5} />}
            onPress={checkAuthAndExport}
          />
          <Button
            title="Explorar datos locales"
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

      <Modal visible={isAuthModalOpen} transparent={true} animationType="fade" onRequestClose={() => setIsAuthModalOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.detailCard, { backgroundColor: colors.background }]}>
            <Typography variant="h2" style={{ marginBottom: 8 }}>Acceso de Docente</Typography>
            <Typography variant="body" color={colors.textSecondary} style={{ marginBottom: 24 }}>
              Inicia sesión para autorizar la sincronización con la base de datos principal.
            </Typography>

            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: colors.border, marginBottom: 16 }]}
              placeholder="Correo electrónico"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: colors.border, marginBottom: 24 }]}
              placeholder="Contraseña"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <View style={{ gap: 12 }}>
              <Button
                title={isAuthenticating ? "Verificando..." : "Iniciar Sesión y Exportar"}
                color={palette.deepSkyBlue}
                textColor="#FFFFFF"
                onPress={handleLogin}
                disabled={isAuthenticating || !email || !password}
              />
              <Button
                title="Cancelar"
                color={colors.surface}
                textColor={colors.text}
                onPress={() => setIsAuthModalOpen(false)}
                disabled={isAuthenticating}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {isExporting && (
        <View style={styles.exportingOverlay}>
          <ActivityIndicator size="large" color={palette.deepSkyBlue} />
          <Typography variant="h3" color="#FFF" style={{ marginTop: 16 }}>Sincronizando con la nube...</Typography>
          <Typography variant="body" color="#FFF" style={{ marginTop: 8, textAlign: 'center' }}>Por favor, no cierres la aplicación.</Typography>
        </View>
      )}

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
  input: { fontSize: 16, borderRadius: 20, paddingVertical: 16, paddingHorizontal: 20, fontWeight: '600', borderWidth: 2 },
  relationPill: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, gap: 12 },
  exportingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
});

/**
 * TODO:
 * - Exportar tambien los datos procesados ya directamente, no solamente los raw
 * - Preguntar si es necesario un numero que identifique a cada configuracion manual (nombre, tips, numero de configuracion manual)
 * - Refinar la matematica de los dedos para que funcione mejor
 */