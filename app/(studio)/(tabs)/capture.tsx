import { Button } from '@/components/common/Button';
import { Typography } from '@/components/common/Typography';
import { PickerModal } from '@/components/studio/PickerModal';
import { SheetModal } from '@/components/studio/SheetModal';
import { TagField } from '@/components/studio/TagField';
import { useCameraServer } from '@/context/CameraServerContext';
import { db } from '@/db';
import { manualConfigurations } from '@/db/schema';
import { useTheme } from '@/hooks/useTheme';
import { bakeAnimationLocal } from '@/lib/animationBaker';
import { getCaptureHtml } from '@/lib/cameraTemplates';
import { useStudioStore } from '@/store/useStudioStore';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Camera, Check, NavArrowRight, Pause, Refresh, Settings, Xmark } from 'iconoir-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCameraPermission } from 'react-native-vision-camera';
import { WebView } from 'react-native-webview';

const ANIMATIONS_DIRECTORY = `${FileSystem.documentDirectory}ensenas/animations/`;

type AnimationData = {
  duration: number;
  tracks: Array<{ name: string; times: number[]; values: number[] }>;
};

const ensureAnimationsDirectory = async () => {
  const info = await FileSystem.getInfoAsync(ANIMATIONS_DIRECTORY);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(ANIMATIONS_DIRECTORY, { intermediates: true });
  }
};

const saveAnimationLocally = async (fileName: string, animation: AnimationData) => {
  await ensureAnimationsDirectory();
  const safeFileName = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
  const fileUri = ANIMATIONS_DIRECTORY + safeFileName;
  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(animation), { encoding: FileSystem.EncodingType.UTF8 });
  return safeFileName;
};

const saveRawLocally = async (fileName: string, data: any) => {
  await ensureAnimationsDirectory();
  const safeFileName = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
  const fileUri = ANIMATIONS_DIRECTORY + safeFileName;
  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(data), { encoding: FileSystem.EncodingType.UTF8 });
  return safeFileName;
};

const extractAnimationFileName = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!trimmed.includes('/')) return trimmed;
  const parts = trimmed.split('/');
  return parts[parts.length - 1] || null;
};

const getStoredAnimationFile = (sign: any) => {
  if (sign?.baked_animation) return sign.baked_animation;
  if (sign?.animationFile) return sign.animationFile;
  return extractAnimationFileName(sign?.animationUrl);
};

export default function StudioCaptureScreen() {
  const { colors } = useTheme();
  const palette = (colors as any).palette;
  const { hasPermission, requestPermission } = useCameraPermission();
  const isFocused = useIsFocused();
  const { signId } = useLocalSearchParams<{ signId?: string }>();
  
  const { serverUrl } = useCameraServer();
  const { configs: localConfigsRaw, signs: localSignsRaw, setSigns } = useStudioStore();

  const [dbConfigsState, setDbConfigsState] = useState<any[]>([]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConfigSelectorOpen, setIsConfigSelectorOpen] = useState(false);
  const [selectingHand, setSelectingHand] = useState<'dominant' | 'recessive' | null>(null);

  const [selectedDominantConfig, setSelectedDominantConfig] = useState<any | null>(null);
  const [selectedRecessiveConfig, setSelectedRecessiveConfig] = useState<any | null>(null);

  const [meaningsList, setMeaningsList] = useState<string[]>([]);
  const [learningTips, setLearningTips] = useState<string[]>([]);
  
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  
  const [originalAnimationFile, setOriginalAnimationFile] = useState<string | null>(null);
  const [originalRawFile, setOriginalRawFile] = useState<string | null>(null);

  const countdownTimerRef = useRef<any>(null);
  const framesBuffer = useRef<any[]>([]);

  const isFormValid = meaningsList.length > 0 && selectedDominantConfig !== null;

  const formattedLocalConfigs = useMemo(() => localConfigsRaw.map((item: any, index: number) => ({
    id: item.local_id || `local_config_${item.timestamp || index}`,
    name: item.name,
    code: null,
    imagePath: null,
    vectorData: JSON.stringify(item.raw_landmarks || item.landmarks),
    isLocal: true,
  })), [localConfigsRaw]);

  const availableConfigs = useMemo(() => [...formattedLocalConfigs, ...dbConfigsState], [formattedLocalConfigs, dbConfigsState]);

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      const fetchDb = async () => {
        try {
          const dbConfigs = await db.select().from(manualConfigurations);
          setDbConfigsState(dbConfigs.map(c => ({
            id: c.localId,
            name: c.name,
            code: null,
            imagePath: null,
            vectorData: JSON.stringify(c.rawLandmarks),
            isLocal: false,
          })));
        } catch (error) {}
      };
      fetchDb();
    }, [])
  );

  useEffect(() => {
    if (signId) {
      const signToEdit = localSignsRaw.find((s: any) => s.local_id === signId || s.timestamp === signId);

      if (signToEdit) {
        setMeaningsList(signToEdit.meanings || []);
        setLearningTips(signToEdit.learning_tips || []);
        setOriginalAnimationFile(getStoredAnimationFile(signToEdit));
        setOriginalRawFile(signToEdit.raw_frames || null);

        const domConfigId = signToEdit.dominant_config_id || signToEdit.configHandDominantId || `local_${signToEdit.configHandDominantId}`;
        const domConfig = availableConfigs.find((c) => c.id === domConfigId);
        if (domConfig) setSelectedDominantConfig(domConfig);

        const recConfigId = signToEdit.recessive_config_id || signToEdit.configHandRecessiveId || `local_${signToEdit.configHandRecessiveId}`;
        if (recConfigId) {
          const recConfig = availableConfigs.find((c) => c.id === recConfigId);
          if (recConfig) setSelectedRecessiveConfig(recConfig);
        }
      }
    } else {
      setMeaningsList([]);
      setLearningTips([]);
      setSelectedDominantConfig(null);
      setSelectedRecessiveConfig(null);
      setOriginalAnimationFile(null);
      setOriginalRawFile(null);
    }
  }, [signId, localSignsRaw, availableConfigs]);

  const onMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.status === 'READY') {
        setIsReady(true);
        return;
      }
      if (data.error) return;
      if (isRecording) {
        framesBuffer.current.push({
          timestamp: data.timestamp,
          pose3D: data.pose3D || null,
          pose2D: data.pose2D || null,
          leftHand: data.leftHand || null,
          rightHand: data.rightHand || null,
        });
      }
    } catch (error) {}
  }, [isRecording]);

  const saveEditedMetadataOnly = async () => {
    if (!selectedDominantConfig || meaningsList.length === 0) return;
    try {
      const updatedSign = {
        local_id: signId,
        dominant_config_id: selectedDominantConfig.id,
        recessive_config_id: selectedRecessiveConfig?.id || null,
        meanings: meaningsList,
        learning_tips: learningTips,
        baked_animation: originalAnimationFile,
        raw_frames: originalRawFile
      };

      const currentData = localSignsRaw.map((s: any) => (s.local_id === signId || s.timestamp === signId) ? { ...s, ...updatedSign } : s);
      await setSigns(currentData);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {}
  };

  const toggleRecording = async () => {
    if (!selectedDominantConfig || meaningsList.length === 0) {
      setIsSettingsOpen(true);
      return;
    }

    if (!isRecording) {
      if (countdown !== null) {
        clearInterval(countdownTimerRef.current);
        setCountdown(null);
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setCountdown(3);
      countdownTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev === 1) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
            framesBuffer.current = [];
            setIsRecording(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return null;
          }
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          return prev ? prev - 1 : null;
        });
      }, 1000);
      return;
    }

    setIsRecording(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
    const capturedFrames = framesBuffer.current.length;
    if (capturedFrames <= 5) return;

    try {
      const framesToSave = framesBuffer.current;
      const currentSignId = signId || `local_sign_${Date.now()}`;

      const numericId = currentSignId.replace('local_sign_', '');
      
      const rawFileName = await saveRawLocally(`raw_${numericId}.json`, framesToSave);
      const animationData = bakeAnimationLocal(framesToSave, selectedRecessiveConfig === null);
      const animationFile = `sign_${numericId}.json`;
      const savedFileName = await saveAnimationLocally(animationFile, animationData);

      const newSign = {
        local_id: currentSignId,
        dominant_config_id: selectedDominantConfig.id,
        recessive_config_id: selectedRecessiveConfig?.id || null,
        meanings: meaningsList,
        learning_tips: learningTips,
        baked_animation: savedFileName,
        raw_frames: rawFileName
      };

      if (signId) {
        const currentData = localSignsRaw.map((s: any) => (s.local_id === signId || s.timestamp === signId) ? { ...s, ...newSign } : s);
        await setSigns(currentData);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
        return;
      }

      await setSigns([...localSignsRaw, newSign]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      setMeaningsList([]);
      setLearningTips([]);
      setSelectedDominantConfig(null);
      setSelectedRecessiveConfig(null);
      setOriginalAnimationFile(null);
      setOriginalRawFile(null);
      framesBuffer.current = [];
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'No se pudo generar la animación localmente.');
    }
  };

  const openConfigSelector = (hand: 'dominant' | 'recessive') => {
    setSelectingHand(hand);
    setIsConfigSelectorOpen(true);
  };

  const selectConfig = (config: any | null) => {
    if (selectingHand === 'dominant') setSelectedDominantConfig(config);
    else setSelectedRecessiveConfig(config);
    setIsConfigSelectorOpen(false);
  };

  const htmlContent = useMemo(() => {
    if (!serverUrl) return '';
    return getCaptureHtml(facingMode);
  }, [serverUrl, facingMode]);

  const renderCameraView = () => (
    <View style={[styles.cameraContainer, { borderColor: isRecording ? '#EF4444' : colors.border, borderWidth: isRecording ? 4 : 1 }]}>
      {isFocused && htmlContent ? (
        <WebView
          style={styles.webview}
          source={{ html: htmlContent, baseUrl: serverUrl }}
          mixedContentMode="always"
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onMessage={onMessage}
        />
      ) : null}
      
      {countdown !== null && (
        <View style={styles.countdownOverlay}>
          <Typography variant="h1" color="#FFFFFF" style={styles.countdownText}>{countdown}</Typography>
        </View>
      )}

      {isFormValid && !isRecording && countdown === null && (
        <View style={styles.infoOverlay}>
          <Typography variant="subtitle" color="#FFFFFF">{meaningsList.join(', ')}</Typography>
        </View>
      )}

      {isRecording && (
        <View style={styles.recordingOverlay}>
          <View style={styles.recordingDot} />
          <Typography variant="label" color="#FFFFFF">GRABANDO</Typography>
        </View>
      )}

      {!isReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#FFFFFF" />
        </View>
      )}
    </View>
  );

  const renderControls = () => (
    <View style={styles.controlsWrapper}>
      {!isRecording && countdown === null && (
        <Pressable 
          style={[styles.settingsButton, { backgroundColor: isFormValid ? colors.surface : palette.powderBlush, borderColor: colors.border }]} 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsSettingsOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Editar detalles de la seña"
        >
          <Settings width={24} height={24} color={isFormValid ? colors.text : '#000'} />
        </Pressable>
      )}

      {!isRecording && countdown !== null && <View style={styles.spacer} />}

      <Pressable 
        style={[styles.shutterButton, { borderColor: isRecording || countdown !== null ? '#EF4444' : isReady && isFormValid ? palette.deepSkyBlue : colors.border, opacity: isReady ? 1 : 0.5 }]} 
        onPress={toggleRecording} 
        disabled={!isReady}
        accessibilityRole="button"
        accessibilityLabel={isRecording ? 'Detener grabación' : 'Iniciar grabación'}
      >
        <View style={[styles.shutterInner, { backgroundColor: isRecording || countdown !== null ? '#EF4444' : isReady && isFormValid ? palette.deepSkyBlue : colors.surface }]}>
          {isRecording ? (
            <Pause width={28} height={28} color="#FFFFFF" />
          ) : countdown !== null ? (
            <Xmark width={32} height={32} color="#FFFFFF" />
          ) : (
            <Camera width={32} height={32} color={isReady && isFormValid ? '#FFFFFF' : colors.textSecondary} />
          )}
        </View>
      </Pressable>

      {!isRecording && countdown === null && (
        <Pressable 
          style={[styles.settingsButton, { backgroundColor: colors.surface, borderColor: colors.border }]} 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setIsReady(false);
            setFacingMode((prev) => prev === 'user' ? 'environment' : 'user');
          }}
          accessibilityRole="button"
          accessibilityLabel="Cambiar de cámara"
        >
          <Refresh width={24} height={24} color={colors.text} />
        </Pressable>
      )}

      {!isRecording && countdown !== null && <View style={styles.spacer} />}
    </View>
  );

  const renderSettingsModal = () => (
    <SheetModal
      visible={isSettingsOpen}
      onClose={() => setIsSettingsOpen(false)}
      title={signId ? 'Editar Detalles' : 'Detalles de la Seña'}
      footer={
        <View style={styles.footerColumn}>
          {signId ? (
            <Button
              title="Guardar Solo Textos"
              color={colors.surface}
              textColor={colors.text}
              onPress={saveEditedMetadataOnly}
              disabled={!isFormValid}
              style={[styles.saveMetadataBtn, { borderColor: colors.border, opacity: !isFormValid ? 0.6 : 1 }]}
            />
          ) : null}
          <Button
            title={signId ? "Listo para Regrabar" : "Confirmar Detalles"}
            color={palette.deepSkyBlue}
            textColor="#FFFFFF"
            icon={<Check width={20} height={20} color="#FFFFFF" />}
            onPress={() => setIsSettingsOpen(false)}
            disabled={!isFormValid}
            style={{ opacity: !isFormValid ? 0.6 : 1 }}
          />
        </View>
      }
    >
      <View>
        <Typography variant="label" color={colors.textSecondary} style={styles.fieldLabel}>
          MANO DOMINANTE *
        </Typography>
        <Pressable
          style={[styles.selectInput, { backgroundColor: colors.input, borderColor: selectedDominantConfig ? palette.deepSkyBlue : colors.border }]}
          onPress={() => openConfigSelector('dominant')}
          accessibilityRole="button"
          accessibilityLabel="Seleccionar mano dominante"
        >
          <Typography variant="body" color={selectedDominantConfig ? colors.text : colors.textSecondary} numberOfLines={1} style={{ flex: 1 }}>
            {selectedDominantConfig ? selectedDominantConfig.name : 'Seleccionar'}
          </Typography>
          <NavArrowRight width={18} height={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View>
        <Typography variant="label" color={colors.textSecondary} style={styles.fieldLabel}>
          MANO RECESIVA
        </Typography>
        <Pressable
          style={[styles.selectInput, { backgroundColor: colors.input, borderColor: selectedRecessiveConfig ? palette.deepSkyBlue : colors.border }]}
          onPress={() => openConfigSelector('recessive')}
          accessibilityRole="button"
          accessibilityLabel="Seleccionar mano recesiva"
        >
          <Typography variant="body" color={selectedRecessiveConfig ? colors.text : colors.textSecondary} numberOfLines={1} style={{ flex: 1 }}>
            {selectedRecessiveConfig ? selectedRecessiveConfig.name : 'Ninguna'}
          </Typography>
          <NavArrowRight width={18} height={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      <TagField
        label="Significados"
        required
        hint="Escribe un significado y pulsa + para agregar otro."
        placeholder="Ej: Hola"
        tags={meaningsList}
        onChange={setMeaningsList}
      />

      <TagField
        label="Tips de aprendizaje"
        hint="Opcional."
        placeholder="Ej: Recuerda la postura recta"
        tags={learningTips}
        onChange={setLearningTips}
      />
    </SheetModal>
  );

  const renderConfigSelectorModal = () => (
    <PickerModal
      visible={isConfigSelectorOpen}
      onClose={() => setIsConfigSelectorOpen(false)}
      title="Buscar Configuración"
      items={availableConfigs.map((config) => ({
        id: config.id,
        label: config.name || 'Configuración sin nombre',
        isLocal: config.isLocal,
      }))}
      onSelect={(item) => selectConfig(availableConfigs.find((config) => config.id === item.id) ?? null)}
      searchPlaceholder="Buscar configuración"
      emptyText="No se encontraron configuraciones."
      clearAction={selectingHand === 'recessive' ? { label: 'Ninguna (Quitar)', onPress: () => selectConfig(null) } : undefined}
    />
  );

  if (!hasPermission || !serverUrl) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={palette.deepSkyBlue} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Typography variant="h3">{signId ? 'Editar Seña' : 'Grabar Seña'}</Typography>
        </View>
      </View>

      <View style={styles.cameraWrapper}>
        {renderCameraView()}
      </View>

      {renderControls()}
      {renderSettingsModal()}
      {renderConfigSelectorModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 12 },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  cameraWrapper: { flex: 1, paddingHorizontal: 16, paddingBottom: 16 },
  cameraContainer: { flex: 1, borderRadius: 32, overflow: 'hidden', backgroundColor: '#111', position: 'relative' },
  webview: { flex: 1, backgroundColor: 'transparent' },
  infoOverlay: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.6)', padding: 16, borderRadius: 20 },
  recordingOverlay: { position: 'absolute', top: 20, alignSelf: 'center', backgroundColor: 'rgba(239, 68, 68, 0.9)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 8 },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFFFFF' },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  countdownOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', zIndex: 50 },
  countdownText: { fontSize: 120 },
  controlsWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 40, paddingBottom: 100, paddingTop: 10 },
  settingsButton: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  shutterButton: { width: 84, height: 84, borderRadius: 42, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center' },
  spacer: { width: 56 },
  footerColumn: { flex: 1, gap: 12 },
  fieldLabel: { letterSpacing: 0.5, marginBottom: 8 },
  selectInput: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 18, borderRadius: 20, borderWidth: 2 },
  saveMetadataBtn: { borderWidth: 1 },
});