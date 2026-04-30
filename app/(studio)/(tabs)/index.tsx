import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { IconButton } from '@/components/common/IconButton';
import { Typography } from '@/components/common/Typography';
import { useTheme } from '@/hooks/useTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { Camera, Check, DragHandGesture, Xmark } from 'iconoir-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCameraPermission } from 'react-native-vision-camera';
import { WebView } from 'react-native-webview';

export default function StudioConfigScreen() {
  const { colors } = useTheme();
  const palette = (colors as any).palette;
  const { hasPermission, requestPermission } = useCameraPermission();
  const isFocused = useIsFocused();

  const [landmarksData, setLandmarksData] = useState<any[]>([]);
  const [capturedLandmarks, setCapturedLandmarks] = useState<any | null>(null);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [manualConfigName, setManualConfigName] = useState('');

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

  const handleCapture = () => {
    if (landmarksData.length > 0) {
      setCapturedLandmarks(landmarksData[0]);
      setIsModalVisible(true);
    }
  };

  const handleSaveConfig = async () => {
    if (!manualConfigName.trim() || !capturedLandmarks) return;

    const newConfig = {
      name: manualConfigName.trim(),
      landmarks: capturedLandmarks,
      timestamp: new Date().toISOString()
    };

    try {
      const storedData = await AsyncStorage.getItem('@ensenas_manual_configs');
      const currentData = storedData ? JSON.parse(storedData) : [];
      await AsyncStorage.setItem('@ensenas_manual_configs', JSON.stringify([...currentData, newConfig]));

      setManualConfigName('');
      setCapturedLandmarks(null);
      setIsModalVisible(false);
    } catch (e) {
      console.error("Error guardando config", e);
    }
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setManualConfigName('');
    setCapturedLandmarks(null);
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

  const isDetected = landmarksData.length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>

      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Typography variant="h3">Configuraciones manuales</Typography>
        </View>
      </View>

      <View style={styles.cameraWrapper}>
        <View style={[styles.cameraContainer, { borderColor: colors.border }]}>
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

          <View style={[styles.statusOverlay, { backgroundColor: isDetected ? 'rgba(16, 185, 129, 0.8)' : 'rgba(0,0,0,0.6)' }]}>
            <DragHandGesture width={18} height={18} color="#FFF" strokeWidth={2} />
            <Typography variant="label" color="#FFFFFF" style={{ fontWeight: '600' }}>
              {isDetected ? "Mano lista para capturar" : "Enfoca tu mano..."}
            </Typography>
          </View>
        </View>
      </View>

      <View style={styles.controlsWrapper}>
        <Pressable
          style={[styles.shutterButton, {
            borderColor: isDetected ? palette.deepSkyBlue : colors.border,
            opacity: isDetected ? 1 : 0.5
          }]}
          onPress={handleCapture}
          disabled={!isDetected}
        >
          <View style={[styles.shutterInner, { backgroundColor: isDetected ? palette.deepSkyBlue : colors.surface }]}>
            <Camera width={32} height={32} color={isDetected ? "#FFFFFF" : colors.textSecondary} strokeWidth={2} />
          </View>
        </Pressable>
      </View>

      <Modal animationType="fade" transparent={true} visible={isModalVisible} onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeModal} />

          <Card style={[styles.dialogCard, { backgroundColor: colors.background }]}>
            <View style={styles.dialogHeader}>
              <Typography variant="h2">Nombrar Configuración</Typography>
              <IconButton size={36} icon={<Xmark width={22} height={22} color={colors.text} strokeWidth={2} />} backgroundColor={colors.surface} onPress={closeModal} />
            </View>

            <View style={styles.dialogBody}>
              <Typography variant="body" color={colors.textSecondary} style={{ marginBottom: 16 }}>
                Asigna un nombre descriptivo para esta forma de la mano. Esto ayudará a buscarla más rápido en el futuro.
              </Typography>

              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: manualConfigName ? palette.deepSkyBlue : 'transparent' }]}
                placeholder="Ej: Letra A, Índice extendido..."
                placeholderTextColor={colors.textSecondary}
                value={manualConfigName}
                onChangeText={setManualConfigName}
                autoFocus={true}
              />
            </View>

            <View style={[styles.dialogFooter, { borderTopColor: colors.border }]}>
              <Button
                title="Cancelar"
                variant="secondary"
                color={colors.surface}
                textColor={colors.text}
                onPress={closeModal}
                style={{ flex: 1 }}
              />
              <Button
                title="Guardar"
                color={palette.deepSkyBlue}
                textColor="#FFFFFF"
                icon={<Check width={20} height={20} color="#FFFFFF" strokeWidth={2.5} />}
                onPress={handleSaveConfig}
                disabled={!manualConfigName.trim()}
                style={{ flex: 1.5, opacity: !manualConfigName.trim() ? 0.6 : 1 }}
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
    paddingVertical: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 100,
    alignItems: 'center',
    justifyContent: 'center',
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  dialogCard: { width: '90%', padding: 0, overflow: 'hidden' },
  dialogHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 16 },
  dialogBody: { paddingHorizontal: 24, paddingBottom: 24 },
  input: {
    fontSize: 16,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontWeight: '600',
    width: '100%',
    borderWidth: 2
  },
  dialogFooter: { flexDirection: 'row', gap: 12, padding: 24, paddingTop: 16, borderTopWidth: 1 },
});