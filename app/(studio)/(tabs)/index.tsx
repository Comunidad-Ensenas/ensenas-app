import { Button } from '@/components/common/Button';
import { Typography } from '@/components/common/Typography';
import { FormField } from '@/components/studio/FormField';
import { SheetModal } from '@/components/studio/SheetModal';
import { TagField } from '@/components/studio/TagField';
import { useCameraServer } from '@/context/CameraServerContext';
import { useTheme } from '@/hooks/useTheme';
import { bakeAnimationLocal } from '@/lib/animationBaker';
import { getConfigHtml } from '@/lib/cameraTemplates';
import { useStudioStore } from '@/store/useStudioStore';
import { useIsFocused } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Camera, Check, DragHandGesture, Refresh, Settings } from 'iconoir-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCameraPermission } from 'react-native-vision-camera';
import { WebView } from 'react-native-webview';

export default function StudioConfigScreen() {
  const { colors } = useTheme();
  const palette = (colors as any).palette;
  const { hasPermission, requestPermission } = useCameraPermission();
  const isFocused = useIsFocused();
  
  const { serverUrl } = useCameraServer();
  const { configs, setConfigs } = useStudioStore();

  const landmarksRef = useRef<any[]>([]);
  const [isDetected, setIsDetected] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [manualConfigName, setManualConfigName] = useState('');
  const [learningTips, setLearningTips] = useState<string[]>([]);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const isFormValid = manualConfigName.trim().length > 0;
  const isReadyToCapture = isFormValid && isDetected;

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission]);

  const onMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.error) return;
      landmarksRef.current = data;
      // Only flips on a real change, so ~7 messages per second never re-render.
      const detected = data.length > 0;
      setIsDetected((previous) => (previous === detected ? previous : detected));
    } catch (e) { }
  };

  const handleSaveConfig = async () => {
    if (!isReadyToCapture) return;

    const capturedLandmarks = landmarksRef.current[0];
    const dummyFrames = [
      { timestamp: 0, pose3D: null, pose2D: null, leftHand: null, rightHand: capturedLandmarks },
      { timestamp: 100, pose3D: null, pose2D: null, leftHand: null, rightHand: capturedLandmarks }
    ];
    
    const animData = bakeAnimationLocal(dummyFrames, true);

    const newConfig = {
      local_id: `local_config_${Date.now()}`,
      name: manualConfigName.trim(),
      raw_landmarks: capturedLandmarks,
      baked_quaternions: animData,
      learning_tips: learningTips
    };

    try {
      await setConfigs([...configs, newConfig]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setManualConfigName('');
      setLearningTips([]);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const htmlContent = useMemo(() => {
    if (!serverUrl) return '';
    return getConfigHtml(facingMode);
  }, [serverUrl, facingMode]);

  if (!hasPermission || !serverUrl) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={palette.deepSkyBlue} />
      </View>
    );
  }

  let overlayText = "";
  if (!isFormValid) {
    overlayText = "Configura los datos primero";
  } else if (!isDetected) {
    overlayText = "Enfoca tu mano";
  } else {
    overlayText = "Mano lista para capturar";
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>

      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Typography variant="h3">Configuraciones manuales</Typography>
        </View>
      </View>

      <View style={styles.cameraWrapper}>
        <View style={[styles.cameraContainer, { borderColor: isReadyToCapture ? palette.deepSkyBlue : colors.border }]}>
          {isFocused && (
            <WebView
              style={styles.webview}
              source={{ html: htmlContent, baseUrl: serverUrl }}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              onMessage={onMessage}
            />
          )}

          <View style={[styles.statusOverlay, { backgroundColor: isReadyToCapture ? 'rgba(16, 185, 129, 0.8)' : 'rgba(0,0,0,0.6)' }]}>
            <DragHandGesture width={18} height={18} color="#FFF" strokeWidth={2} />
            <Typography variant="label" color="#FFFFFF" style={{ fontWeight: '600' }}>
              {overlayText}
            </Typography>
          </View>
        </View>
      </View>

      <View style={styles.controlsWrapper}>
        <Pressable 
          style={[styles.settingsButton, { backgroundColor: isFormValid ? colors.surface : palette.powderBlush, borderColor: colors.border }]} 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsSettingsOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Editar detalles de la configuración"
        >
          <Settings width={24} height={24} color={isFormValid ? colors.text : '#000'} />
        </Pressable>

        <Pressable
          style={[styles.shutterButton, {
            borderColor: isReadyToCapture ? palette.deepSkyBlue : colors.border,
            opacity: isReadyToCapture ? 1 : 0.5
          }]}
          onPress={handleSaveConfig}
          disabled={!isReadyToCapture}
          accessibilityRole="button"
          accessibilityLabel="Guardar configuración"
        >
          <View style={[styles.shutterInner, { backgroundColor: isReadyToCapture ? palette.deepSkyBlue : colors.surface }]}>
            <Camera width={32} height={32} color={isReadyToCapture ? "#FFFFFF" : colors.textSecondary} strokeWidth={2} />
          </View>
        </Pressable>

        <Pressable 
          style={[styles.settingsButton, { backgroundColor: colors.surface, borderColor: colors.border }]} 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            landmarksRef.current = [];
            setIsDetected(false);
            setFacingMode((prev) => prev === 'user' ? 'environment' : 'user');
          }}
          accessibilityRole="button"
          accessibilityLabel="Cambiar de cámara"
        >
          <Refresh width={24} height={24} color={colors.text} />
        </Pressable>
      </View>

      <SheetModal
        visible={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Detalles de Configuración"
        footer={
          <Button
            title="Confirmar Datos"
            color={palette.deepSkyBlue}
            textColor="#FFFFFF"
            icon={<Check width={20} height={20} color="#FFFFFF" strokeWidth={2.5} />}
            onPress={() => setIsSettingsOpen(false)}
            disabled={!isFormValid}
            style={{ flex: 1, opacity: !isFormValid ? 0.6 : 1 }}
          />
        }
      >
        <FormField
          label="Nombre de la forma"
          required
          placeholder="Ej: Letra A, Índice extendido"
          value={manualConfigName}
          onChangeText={setManualConfigName}
          autoFocus
          returnKeyType="next"
        />

        <TagField
          label="Tips de aprendizaje"
          hint="Opcional. Se muestran al estudiante mientras practica."
          placeholder="Ej: Parece un perro"
          tags={learningTips}
          onChange={setLearningTips}
        />
      </SheetModal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 12 },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  cameraWrapper: { flex: 1, paddingHorizontal: 16, paddingBottom: 4 },
  cameraContainer: { flex: 1, borderRadius: 32, overflow: 'hidden', backgroundColor: '#111', borderWidth: 1, position: 'relative' },
  webview: { flex: 1, backgroundColor: 'transparent' },
  statusOverlay: { position: 'absolute', top: 20, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 24, gap: 10 },
  controlsWrapper: { flexDirection: 'row', paddingVertical: 20, paddingBottom: Platform.OS === 'ios' ? 20 : 100, paddingHorizontal: 40, alignItems: 'center', justifyContent: 'space-between' },
  settingsButton: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  shutterButton: { width: 84, height: 84, borderRadius: 42, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center' },
});