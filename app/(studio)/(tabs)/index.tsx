import { useTheme } from '@/hooks/useTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCameraPermission } from 'react-native-vision-camera';
import { WebView } from 'react-native-webview';

export default function StudioConfigScreen() {
  const { colors, isDark } = useTheme();
  const { hasPermission, requestPermission } = useCameraPermission();
  const isFocused = useIsFocused();
  
  const [landmarksData, setLandmarksData] = useState<any[]>([]);
  const [manualConfigName, setManualConfigName] = useState('');

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission]);

  const onMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.error) return;
      setLandmarksData(data);
    } catch (e) {}
  };

  const handleSaveManualConfig = async () => {
    if (!manualConfigName.trim()) {
      Alert.alert("Falta el nombre", "Por favor, escriba el nombre de la configuración manual.");
      return;
    }
    if (landmarksData.length === 0) {
      Alert.alert("Mano no detectada", "Asegúrese de que la cámara esté viendo su mano.");
      return;
    }

    const newConfig = {
      name: manualConfigName.trim(),
      landmarks: landmarksData[0],
      timestamp: new Date().toISOString()
    };

    try {
      const storedData = await AsyncStorage.getItem('@ensenas_manual_configs');
      const currentData = storedData ? JSON.parse(storedData) : [];
      await AsyncStorage.setItem('@ensenas_manual_configs', JSON.stringify([...currentData, newConfig]));
      
      setManualConfigName('');
      Alert.alert("Guardado", "La configuración manual se guardó correctamente.");
    } catch (e) {
      Alert.alert("Error", "Ocurrió un problema al guardar.");
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
                // Colores pastel para el esqueleto también
                drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color: "rgba(255,255,255,0.6)", lineWidth: 4 });
                drawingUtils.drawLandmarks(landmarks, { color: "#A2D2FF", lineWidth: 2, radius: 4 });
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
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isDetected = landmarksData.length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        
        {/* Cabecera estilo limpio y alineado a la izquierda */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Capturar</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Configuración manual</Text>
        </View>

        {/* Cámara como tarjeta flotante */}
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
          </View>
        </View>
        
        {/* Panel de captura flotante */}
        <View style={[styles.capturePanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          
          {/* Píldora indicadora de estado */}
          <View style={[styles.statusPill, { backgroundColor: isDetected ? colors.successBg : colors.dangerBg }]}>
            <View style={[styles.dot, { backgroundColor: isDetected ? colors.success : colors.danger }]} />
            <Text style={[styles.statusText, { color: isDetected ? colors.success : colors.danger }]}>
              {isDetected ? "Mano detectada" : "Buscando mano..."}
            </Text>
          </View>

          <TextInput
            style={[styles.input, { 
              color: colors.text, 
              backgroundColor: colors.input, 
              borderColor: manualConfigName ? colors.primary : colors.border 
            }]}
            placeholder="Ej: Letra A, Pulgar arriba..."
            placeholderTextColor={colors.textSecondary}
            value={manualConfigName}
            onChangeText={setManualConfigName}
          />

          <Pressable 
            style={[
              styles.captureBtn, 
              { 
                backgroundColor: colors.primary, 
                opacity: isDetected && manualConfigName ? 1 : 0.4 
              }
            ]} 
            onPress={handleSaveManualConfig}
            disabled={!isDetected || !manualConfigName}
          >
            {/* Texto dinámico según el tema para que resalte sobre el color pastel */}
            <Text style={[styles.captureBtnText, { color: (colors as any).primaryText || '#000' }]}>
              GUARDAR CONFIGURACIÓN
            </Text>
          </Pressable>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Tipografía jerárquica
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 16, fontWeight: '500', marginTop: 4 },
  
  // Wrapper para separar la cámara de los bordes (Efecto Tarjeta)
  cameraWrapper: { flex: 1, paddingHorizontal: 20, paddingBottom: 20 },
  cameraContainer: { 
    flex: 1, 
    borderRadius: 32, // Súper redondeado
    overflow: 'hidden', 
    backgroundColor: '#000',
    borderWidth: 1,
  },
  webview: { flex: 1, backgroundColor: 'transparent' },
  
  // Panel inferior flotante
  capturePanel: { 
    marginHorizontal: 20,
    marginBottom: Platform.OS === 'ios' ? 20 : 30,
    padding: 24, 
    gap: 20, 
    borderRadius: 32, // Súper redondeado
    borderWidth: 1,
  },
  
  // Píldora de estado (estilo moderno)
  statusPill: { 
    alignSelf: 'flex-start',
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 8 
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  
  // Inputs y botones generosos
  input: { 
    paddingHorizontal: 20, 
    paddingVertical: 18, 
    borderRadius: 20, 
    fontSize: 16, 
    borderWidth: 1,
    fontWeight: '500'
  },
  captureBtn: { 
    paddingVertical: 20, 
    borderRadius: 24, // Bordes súper suaves en botones
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  captureBtnText: { 
    fontWeight: '800', 
    fontSize: 15, 
    letterSpacing: 1,
    textTransform: 'uppercase'
  },
}); 