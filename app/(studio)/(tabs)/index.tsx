import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { IconButton } from '@/components/common/IconButton';
import { Typography } from '@/components/common/Typography';
import { useTheme } from '@/hooks/useTheme';
import { bakeAnimationLocal } from '@/lib/animationBaker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { Camera, Check, DragHandGesture, Plus, Settings, Xmark } from 'iconoir-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCameraPermission } from 'react-native-vision-camera';
import { WebView } from 'react-native-webview';

export default function StudioConfigScreen() {
  const { colors } = useTheme();
  const palette = (colors as any).palette;
  const { hasPermission, requestPermission } = useCameraPermission();
  const isFocused = useIsFocused();

  const [landmarksData, setLandmarksData] = useState<any[]>([]);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [manualConfigName, setManualConfigName] = useState('');
  const [currentTip, setCurrentTip] = useState('');
  const [learningTips, setLearningTips] = useState<string[]>([]);

  const isFormValid = manualConfigName.trim().length > 0;
  const isDetected = landmarksData.length > 0;
  const isReadyToCapture = isFormValid && isDetected;

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission]);

  const onMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.error) return;
      setLandmarksData(data);
    } catch (e) { }
  };

  const handleAddTip = () => {
    const trimmedTip = currentTip.trim();
    if (trimmedTip && !learningTips.includes(trimmedTip)) {
      setLearningTips([...learningTips, trimmedTip]);
      setCurrentTip('');
    }
  };

  const handleRemoveTip = (tipToRemove: string) => {
    setLearningTips(learningTips.filter((tip) => tip !== tipToRemove));
  };

  const handleSaveConfig = async () => {
    if (!isReadyToCapture) return;

    const capturedLandmarks = landmarksData[0];

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
      const storedData = await AsyncStorage.getItem('@ensenas_manual_configs');
      const currentData = storedData ? JSON.parse(storedData) : [];
      await AsyncStorage.setItem('@ensenas_manual_configs', JSON.stringify([...currentData, newConfig]));

      setManualConfigName('');
      setCurrentTip('');
      setLearningTips([]);
    } catch (e) {
      console.error("Error guardando config", e);
    }
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <style>
        body { margin: 0; padding: 0; background-color: #000; overflow: hidden; display: flex; justify-content: center; align-items: center; height: 100vh; }
        video { position: absolute; width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); z-index: 1; }
        canvas { position: absolute; width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); z-index: 2; pointer-events: none; background-color: transparent; }
        #status { z-index: 100; position: absolute; top: 20px; text-align: center; width: 100%; background: rgba(0,0,0,0.7); padding: 10px 0; color: white; font-family: sans-serif; border-radius: 20px; font-size: 14px;}
      </style>
    </head>
    <body>
      <div id="status">Encendiendo cámara...</div>
      <video id="video" autoplay playsinline muted></video>
      <canvas id="canvas"></canvas>
      <script type="module">
        import { HandLandmarker, FilesetResolver, DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";
        const video = document.getElementById("video");
        const canvas = document.getElementById("canvas");
        const ctx = canvas.getContext("2d");
        const statusEl = document.getElementById("status");
        let handLandmarker;
        let drawingUtils;
        let lastVideoTime = -1;
        let lastPostTime = 0;
        let hadHandsLastFrame = false;

        async function init() {
          try {
            const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
            handLandmarker = await HandLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task",
                delegate: "GPU"
              },
              runningMode: "VIDEO",
              numHands: 1,
              minHandDetectionConfidence: 0.6,
              minHandPresenceConfidence: 0.6,
              minTrackingConfidence: 0.6
            });
            drawingUtils = new DrawingUtils(ctx);
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
            video.srcObject = stream;
            video.addEventListener("loadeddata", predictWebcam);
            statusEl.style.display = "none";
          } catch (err) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ error: err.message }));
          }
        }

        async function predictWebcam() {
          if (canvas.width !== video.videoWidth) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }
          let startTimeMs = performance.now();
          if (lastVideoTime !== video.currentTime) {
            lastVideoTime = video.currentTime;
            const results = handLandmarker.detectForVideo(video, startTimeMs);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (results.landmarks && results.landmarks.length > 0) {
              if (startTimeMs - lastPostTime > 150) {
                window.ReactNativeWebView.postMessage(JSON.stringify(results.landmarks));
                lastPostTime = startTimeMs;
              }
              hadHandsLastFrame = true;
              for (const landmarks of results.landmarks) {
                drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color: "rgba(255,255,255,0.7)", lineWidth: 4 });
                drawingUtils.drawLandmarks(landmarks, { color: "#38BDF8", lineWidth: 2, radius: 5 });
              }
            } else {
              if (hadHandsLastFrame) {
                 window.ReactNativeWebView.postMessage(JSON.stringify([]));
                 hadHandsLastFrame = false;
              }
            }
          }
          window.requestAnimationFrame(predictWebcam);
        }
        init();
      </script>
    </body>
    </html>
  `;

  if (!hasPermission) {
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
    overlayText = "Enfoca tu mano...";
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
              source={{ html: htmlContent, baseUrl: 'https://localhost' }}
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
          onPress={() => setIsSettingsOpen(true)}
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
        >
          <View style={[styles.shutterInner, { backgroundColor: isReadyToCapture ? palette.deepSkyBlue : colors.surface }]}>
            <Camera width={32} height={32} color={isReadyToCapture ? "#FFFFFF" : colors.textSecondary} strokeWidth={2} />
          </View>
        </Pressable>

        <View style={styles.spacer} />
      </View>

      {/* Modal para rellenar los datos ANTES de guardar */}
      <Modal animationType="fade" transparent={true} visible={isSettingsOpen} onRequestClose={() => setIsSettingsOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsSettingsOpen(false)} />

          <Card style={[styles.dialogCard, { backgroundColor: colors.background, maxHeight: '90%' }]}>
            <View style={styles.dialogHeader}>
              <Typography variant="h2">Detalles de Configuración</Typography>
              <IconButton size={36} icon={<Xmark width={22} height={22} color={colors.text} strokeWidth={2} />} backgroundColor={colors.surface} onPress={() => setIsSettingsOpen(false)} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.dialogBody}>
              <Typography variant="subtitle" color={colors.textSecondary} style={{ marginBottom: 8, letterSpacing: 0.5 }}>NOMBRE DE LA FORMA *</Typography>
              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: manualConfigName ? palette.deepSkyBlue : colors.border, marginBottom: 24 }]}
                placeholder="Ej: Letra A, Índice extendido..."
                placeholderTextColor={colors.textSecondary}
                value={manualConfigName}
                onChangeText={setManualConfigName}
              />

              <Typography variant="subtitle" color={colors.textSecondary} style={{ marginBottom: 8, letterSpacing: 0.5 }}>TIPS DE APRENDIZAJE (OPCIONAL)</Typography>
              <View style={styles.inputRow}>
                <TextInput 
                  style={[styles.input, { flex: 1, color: colors.text, backgroundColor: colors.input, borderColor: currentTip ? palette.deepSkyBlue : colors.border }]} 
                  placeholder="Ej: Parece un perro..."
                  placeholderTextColor={colors.textSecondary}
                  value={currentTip} 
                  onChangeText={setCurrentTip} 
                  onSubmitEditing={handleAddTip} 
                />
                <Pressable style={[styles.addBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleAddTip} disabled={!currentTip.trim()}>
                  <Plus width={24} height={24} color={currentTip.trim() ? palette.deepSkyBlue : colors.textSecondary} />
                </Pressable>
              </View>

              <View style={styles.chipsWrapContainer}>
                {learningTips.map((tip, index) => (
                  <View key={`tip-${index}`} style={[styles.chip, { backgroundColor: palette.deepSkyBlue }]}>
                    <Typography variant="label" color="#FFFFFF">{tip}</Typography>
                    <Pressable onPress={() => handleRemoveTip(tip)} style={styles.chipRemoveBtn}>
                      <Xmark width={16} height={16} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ))}
              </View>
            </ScrollView>

            <View style={[styles.dialogFooter, { borderTopColor: colors.border }]}>
              <Button
                title="Confirmar Datos"
                color={palette.deepSkyBlue}
                textColor="#FFFFFF"
                icon={<Check width={20} height={20} color="#FFFFFF" strokeWidth={2.5} />}
                onPress={() => setIsSettingsOpen(false)}
                disabled={!isFormValid}
                style={{ flex: 1, opacity: !isFormValid ? 0.6 : 1 }}
              />
            </View>
          </Card>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 12 },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  cameraWrapper: { flex: 1, paddingHorizontal: 16, paddingBottom: 4 },
  cameraContainer: {
    flex: 1,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#111',
    borderWidth: 1,
    position: 'relative'
  },
  webview: { flex: 1, backgroundColor: 'transparent' },
  statusOverlay: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    gap: 10,
  },
  controlsWrapper: {
    flexDirection: 'row',
    paddingVertical: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 100,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingsButton: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    borderWidth: 1, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  shutterButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: { width: 56 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end', alignItems: 'center' },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  dialogCard: { width: '100%', padding: 0, overflow: 'hidden', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  dialogHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 16 },
  dialogBody: { paddingHorizontal: 24, paddingBottom: 24 },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  input: {
    fontSize: 16,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontWeight: '600',
    borderWidth: 2
  },
  addBtn: { width: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 20, borderWidth: 2 },
  chipsWrapContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingLeft: 14, paddingRight: 8, borderRadius: 20, gap: 8 },
  chipRemoveBtn: { padding: 4, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.2)' },
  dialogFooter: { flexDirection: 'row', gap: 12, padding: 24, paddingTop: 16, borderTopWidth: 1 },
});