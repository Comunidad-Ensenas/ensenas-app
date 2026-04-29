import { useTheme } from '@/hooks/useTheme';
import StaticServer from '@dr.pogodin/react-native-static-server';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCameraPermission } from 'react-native-vision-camera';
import { WebView } from 'react-native-webview';

const assetsToLoad = [
  { module: require('@/assets/models/hand_landmarker.task'), name: 'hand.task' },
  { module: require('@/assets/models/pose_landmarker_lite.task'), name: 'pose.task' },
  { module: require('@/assets/models/vision_bundle.js.bin'), name: 'vision_bundle.js' },
  { module: require('@/assets/models/vision_wasm_internal.js.bin'), name: 'vision_wasm_internal.js' },
  { module: require('@/assets/models/vision_wasm_internal.wasm'), name: 'vision_wasm_internal.wasm' },
];

export default function StudioCaptureScreen() {
  const { colors, isDark } = useTheme();
  const { hasPermission, requestPermission } = useCameraPermission();
  const isFocused = useIsFocused();
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [manualConfig, setManualConfig] = useState('');
  const [currentMeaning, setCurrentMeaning] = useState('');
  const [meaningsList, setMeaningsList] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  const [serverUrl, setServerUrl] = useState('');
  const serverRef = useRef<any>(null);
  const framesBuffer = useRef<any[]>([]);

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission]);

  useEffect(() => {
    let isMounted = true;

    const setupOfflineServer = async () => {
      try {
        const wwwPath = FileSystem.documentDirectory + 'www/';
        
        const dirInfo = await FileSystem.getInfoAsync(wwwPath);
        if (dirInfo.exists) {
          await FileSystem.deleteAsync(wwwPath, { idempotent: true });
        }
        await FileSystem.makeDirectoryAsync(wwwPath, { intermediates: true });

        for (const item of assetsToLoad) {
          const asset = Asset.fromModule(item.module);
          await asset.downloadAsync();
          
          await FileSystem.copyAsync({
            from: asset.localUri || asset.uri,
            to: wwwPath + item.name
          });
        }

        const serverPath = wwwPath.replace(/^file:\/\//, '');

        const server = new StaticServer({
          port: 0,
          fileDir: serverPath,
        });
        
        const rawUrl = await server.start(); 
        const safeUrl = rawUrl.endsWith('/') ? rawUrl : rawUrl + '/';
        
        if (isMounted) {
          serverRef.current = server;
          setServerUrl(safeUrl);
        }
      } catch (e: any) {
        Alert.alert("Error del Servidor", "No se pudo iniciar: " + e.message);
      }
    };

    setupOfflineServer();

    return () => {
      isMounted = false;
      if (serverRef.current) {
        serverRef.current.stop();
      }
    };
  }, []);

  const onMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.status === 'READY') {
        setIsReady(true);
        return;
      }

      if (data.error) {
        Alert.alert("Alerta de IA", data.error);
        return;
      }
      
      if (isRecording) {
        framesBuffer.current.push({
          timestamp: Date.now(),
          hands: data.hands || [],
          handednesses: data.handednesses || [],
          pose: data.pose || []
        });
      }
    } catch (e) {}
  };

  const handleAddMeaning = () => {
    const trimmedMeaning = currentMeaning.trim();
    if (trimmedMeaning && !meaningsList.includes(trimmedMeaning)) {
      setMeaningsList([...meaningsList, trimmedMeaning]);
      setCurrentMeaning('');
    }
  };

  const handleRemoveMeaning = (meaningToRemove: string) => {
    setMeaningsList(meaningsList.filter(m => m !== meaningToRemove));
  };

  const handleOpenSettings = () => setIsSettingsOpen(true);

  const toggleRecording = async () => {
    if (!manualConfig.trim() || meaningsList.length === 0) {
      setIsSettingsOpen(true);
      return;
    }

    if (!isRecording) {
      framesBuffer.current = [];
      setIsRecording(true);
    } else {
      setIsRecording(false);
      const capturedFrames = framesBuffer.current.length;
      
      if (capturedFrames > 5) {
        try {
          const framesToSave = capturedFrames > 15 ? framesBuffer.current.slice(0, -15) : framesBuffer.current;

          const newSign = {
            manualConfig: manualConfig.trim(),
            meanings: meaningsList,
            frames: framesToSave,
            timestamp: new Date().toISOString()
          };
          
          const storedData = await AsyncStorage.getItem('@ensenas_recorded_signs');
          const currentData = storedData ? JSON.parse(storedData) : [];
          await AsyncStorage.setItem('@ensenas_recorded_signs', JSON.stringify([...currentData, newSign]));

          Alert.alert("Bien hecho", "El movimiento se guardo correctamente.");
          
          setMeaningsList([]);
          setCurrentMeaning('');
        } catch (e) {
          Alert.alert("Error", "Ocurrio un problema al guardar la seña.");
        }
      } else {
        Alert.alert("Muy corto", "El movimiento fue muy rapido. Por favor, intentelo de nuevo.");
      }
    }
  };

  const htmlContent = serverUrl ? `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <style>
        body { margin: 0; padding: 0; background-color: #000; overflow: hidden; display: flex; justify-content: center; align-items: center; height: 100vh; }
        video { position: absolute; width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); z-index: 1; }
        canvas { position: absolute; width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); z-index: 2; pointer-events: none; background-color: transparent; }
        #status-container { z-index: 100; position: absolute; top: 20px; width: 90%; background: rgba(0,0,0,0.8); border-radius: 10px; padding: 15px; color: white; font-family: monospace; font-size: 14px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
        .error { color: #ff6b6b; font-weight: bold; }
      </style>
      <script>
        function logStatus(msg, isError = false) {
          const el = document.getElementById("status-text");
          if(el) el.innerHTML = isError ? '<span class="error">❌ ' + msg + '</span>' : '⏳ ' + msg;
          if(isError && window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ error: msg }));
          }
        }
        window.addEventListener('error', e => logStatus(e.message || "Error desconocido", true));
      </script>
    </head>
    <body>
      <div id="status-container"><span id="status-text">Inicializando scripts...</span></div>
      <video id="video" autoplay playsinline muted></video>
      <canvas id="canvas"></canvas>
      
      <script type="module">
        import { HandLandmarker, PoseLandmarker, FilesetResolver, DrawingUtils } from "./vision_bundle.js";
        
        const video = document.getElementById("video");
        const canvas = document.getElementById("canvas");
        const ctx = canvas.getContext("2d");
        
        let handLandmarker;
        let poseLandmarker;
        let drawingUtils;
        let lastVideoTime = -1;
        let lastPostTime = 0;
        
        function roundPoint(pt) {
          return {
            x: Math.round(pt.x * 10000) / 10000,
            y: Math.round(pt.y * 10000) / 10000,
            z: Math.round(pt.z * 10000) / 10000
          };
        }

        async function init() {
          try {
            logStatus("Paso 1: Iniciando motor (Modo Optimizado)...");
            const vision = await FilesetResolver.forVisionTasks("./");
            
            handLandmarker = await HandLandmarker.createFromOptions(vision, {
              baseOptions: { modelAssetPath: "./hand.task", delegate: "GPU" },
              runningMode: "VIDEO", numHands: 2, minHandDetectionConfidence: 0.5, minHandPresenceConfidence: 0.5, minTrackingConfidence: 0.5
            });

            poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
              baseOptions: { modelAssetPath: "./pose.task", delegate: "GPU" },
              runningMode: "VIDEO", minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5
            });

            drawingUtils = new DrawingUtils(ctx);
            
            const stream = await navigator.mediaDevices.getUserMedia({ 
              video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, 
              audio: false 
            });
            video.srcObject = stream;
            video.addEventListener("loadeddata", predictWebcam);
            
            document.getElementById("status-container").style.display = "none";
            window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'READY' }));
          } catch (err) {
            logStatus(err.message, true);
          }
        }

        async function predictWebcam() {
          try {
            if (canvas.width !== video.videoWidth) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
            }
            let startTimeMs = performance.now();
            
            if (lastVideoTime !== video.currentTime) {
              lastVideoTime = video.currentTime;
              
              const poseResults = poseLandmarker.detectForVideo(video, startTimeMs);
              const handResults = handLandmarker.detectForVideo(video, startTimeMs);
              
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              
              let frameData = { hands: [], handednesses: [], pose: [] };

              if (poseResults && poseResults.landmarks && poseResults.landmarks.length > 0) {
                frameData.pose = poseResults.landmarks[0].map(roundPoint);
                
                for (const landmark of poseResults.landmarks) {
                  drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS, { color: "rgba(255,255,255,0.5)", lineWidth: 2 });
                  drawingUtils.drawLandmarks(landmark, { color: "#FF6347", lineWidth: 1, radius: 2 });
                }
              }

              if (handResults && handResults.landmarks && handResults.landmarks.length > 0) {
                frameData.hands = handResults.landmarks.map(hand => hand.map(roundPoint));
                frameData.handednesses = handResults.handednesses;
                
                for (const landmarks of handResults.landmarks) {
                  drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color: "#3B82F6", lineWidth: 4 });
                  drawingUtils.drawLandmarks(landmarks, { color: "#F59E0B", lineWidth: 2, radius: 3 });
                }
              }

              if (startTimeMs - lastPostTime > 100) {
                if(frameData.hands.length > 0 || frameData.pose.length > 0) {
                   window.ReactNativeWebView.postMessage(JSON.stringify(frameData));
                }
                lastPostTime = startTimeMs;
              }
            }
            window.requestAnimationFrame(predictWebcam);
          } catch (err) {
            document.getElementById("status-container").style.display = "block";
            logStatus("Error: " + err.message, true);
          }
        }
        
        init();
      </script>
    </body>
    </html>
  ` : '';

  if (!hasPermission || !serverUrl) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 12, fontWeight: '500' }}>Preparando servidor interno...</Text>
      </View>
    );
  }

  const isFormValid = meaningsList.length > 0 && manualConfig.trim().length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerText, { color: colors.text }]}>Grabar Movimiento</Text>
      </View>

      <View style={[styles.cameraContainer, isRecording && styles.recordingBorder]}>
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
        {isRecording && (
          <View style={styles.recordingOverlay}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>GRABANDO</Text>
          </View>
        )}
      </View>
      
      <View style={[styles.bottomBar, { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderTopColor: isDark ? '#374151' : '#E5E7EB' }]}>
        {!isRecording && isFormValid && (
          <View style={styles.summaryBadge}>
            <Text style={styles.summaryText} numberOfLines={1}>
              {manualConfig} • {meaningsList.join(', ')}
            </Text>
          </View>
        )}

        <View style={styles.actionRow}>
          {!isRecording && (
            <Pressable style={[styles.settingsBtn, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]} onPress={handleOpenSettings}>
              <MaterialIcons name="tune" size={26} color={colors.text} />
            </Pressable>
          )}

          <Pressable 
            style={[styles.captureBtn, isRecording && styles.stopBtn, { backgroundColor: isRecording ? '#EF4444' : colors.primary, opacity: isReady ? 1 : 0.5 }]} 
            onPress={toggleRecording}
            disabled={!isReady && !isRecording}
          >
            <Text style={styles.captureBtnText}>
              {isRecording ? "DETENER GRABACION" : "COMENZAR A GRABAR"}
            </Text>
          </Pressable>
        </View>
      </View>

      <Modal visible={isSettingsOpen} transparent={true} animationType="slide" onRequestClose={() => setIsSettingsOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsSettingsOpen(false)} />
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Detalles de la Seña</Text>
              <Pressable onPress={() => setIsSettingsOpen(false)} style={styles.closeBtn}>
                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: isDark ? '#374151' : '#F9FAFB', borderColor: isDark ? '#4B5563' : '#D1D5DB' }]}
              placeholder="Configuracion manual (Ej: Letra A)"
              placeholderTextColor={colors.textSecondary}
              value={manualConfig}
              onChangeText={setManualConfig}
            />

            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { flex: 1, color: colors.text, backgroundColor: isDark ? '#374151' : '#F9FAFB', borderColor: isDark ? '#4B5563' : '#D1D5DB' }]}
                placeholder="Añadir significado..."
                placeholderTextColor={colors.textSecondary}
                value={currentMeaning}
                onChangeText={setCurrentMeaning}
                onSubmitEditing={handleAddMeaning}
              />
              <Pressable style={[styles.addBtn, { backgroundColor: isDark ? '#374151' : '#F9FAFB', borderColor: isDark ? '#4B5563' : '#D1D5DB' }]} onPress={handleAddMeaning} disabled={!currentMeaning.trim()}>
                <MaterialIcons name="add" size={24} color={currentMeaning.trim() ? colors.primary : colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.meaningsWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
                {meaningsList.map((meaning, index) => (
                  <View key={`meaning-chip-${index}`} style={[styles.chip, { backgroundColor: colors.primary }]}>
                    <Text style={styles.chipText}>{meaning}</Text>
                    <Pressable onPress={() => handleRemoveMeaning(meaning)} style={styles.chipRemoveBtn}>
                      <MaterialIcons name="close" size={16} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            </View>

            <Pressable style={[styles.doneBtn, { backgroundColor: colors.primary }]} onPress={() => setIsSettingsOpen(false)}>
              <Text style={styles.doneBtnText}>LISTO</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  headerText: { fontSize: 18, fontWeight: 'bold' },
  cameraContainer: { flex: 1, borderRadius: 12, overflow: 'hidden', marginHorizontal: 16, marginBottom: 16, backgroundColor: '#000', borderWidth: 3, borderColor: 'transparent' },
  recordingBorder: { borderColor: '#EF4444' },
  webview: { flex: 1, backgroundColor: 'transparent' },
  recordingOverlay: { position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 8 },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
  recordingText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },
  bottomBar: { paddingHorizontal: 20, paddingBottom: 110, paddingTop: 16, borderTopWidth: 1 },
  summaryBadge: { backgroundColor: 'rgba(59, 130, 246, 0.1)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginBottom: 12, alignSelf: 'center' },
  summaryText: { color: '#3B82F6', fontWeight: '600', fontSize: 13, textAlign: 'center' },
  actionRow: { flexDirection: 'row', gap: 12 },
  settingsBtn: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  captureBtn: { flex: 1, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  stopBtn: { backgroundColor: '#EF4444' },
  captureBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 16, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  closeBtn: { padding: 4 },
  inputRow: { flexDirection: 'row', gap: 10 },
  input: { padding: 14, borderRadius: 12, fontSize: 16, borderWidth: 1 },
  addBtn: { width: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 12, borderWidth: 1 },
  meaningsWrapper: { minHeight: 40, justifyContent: 'center' },
  chipsContainer: { gap: 8, alignItems: 'center', paddingRight: 20 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingLeft: 12, paddingRight: 6, borderRadius: 20, gap: 6 },
  chipText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  chipRemoveBtn: { padding: 2, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.2)' },
  doneBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  doneBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
});