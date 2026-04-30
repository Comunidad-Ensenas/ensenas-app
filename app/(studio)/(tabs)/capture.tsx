import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { IconButton } from '@/components/common/IconButton';
import { Typography } from '@/components/common/Typography';
import { db } from '@/db';
import { manualConfigurations } from '@/db/schema';
import { useTheme } from '@/hooks/useTheme';
import StaticServer from '@dr.pogodin/react-native-static-server';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { Camera, Check, NavArrowLeft, Pause, Plus, Search, Settings, Xmark } from 'iconoir-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
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
  const palette = (colors as any).palette;
  const { hasPermission, requestPermission } = useCameraPermission();
  const isFocused = useIsFocused();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConfigSelectorOpen, setIsConfigSelectorOpen] = useState(false);
  const [selectingHand, setSelectingHand] = useState<'dominant' | 'recessive' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [availableConfigs, setAvailableConfigs] = useState<any[]>([]);
  const [selectedDominantConfig, setSelectedDominantConfig] = useState<any | null>(null);
  const [selectedRecessiveConfig, setSelectedRecessiveConfig] = useState<any | null>(null);
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

  useFocusEffect(
    useCallback(() => {
      const fetchAllConfigs = async () => {
        try {
          const dbConfigs = await db.select().from(manualConfigurations);

          const localDataStr = await AsyncStorage.getItem('@ensenas_manual_configs');
          const localData = localDataStr ? JSON.parse(localDataStr) : [];

          const formattedLocalConfigs = localData.map((item: any, index: number) => ({
            id: `local_${item.timestamp || index}`,
            name: item.name,
            code: null,
            imagePath: null,
            vectorData: JSON.stringify(item.landmarks),
            isLocal: true
          }));

          const combinedConfigs = [...formattedLocalConfigs, ...dbConfigs];
          setAvailableConfigs(combinedConfigs);
        } catch (e) {
          console.error(e);
        }
      };
      fetchAllConfigs();
    }, [])
  );

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
    } catch (e) { }
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

  const toggleRecording = async () => {
    if (!selectedDominantConfig || meaningsList.length === 0) {
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
            configHandDominantId: selectedDominantConfig.id,
            configHandRecessiveId: selectedRecessiveConfig?.id || null,
            meanings: meaningsList,
            frames: framesToSave,
            timestamp: new Date().toISOString()
          };

          const storedData = await AsyncStorage.getItem('@ensenas_recorded_signs');
          const currentData = storedData ? JSON.parse(storedData) : [];
          await AsyncStorage.setItem('@ensenas_recorded_signs', JSON.stringify([...currentData, newSign]));

          Alert.alert("Bien hecho", "El movimiento se guardó correctamente.");

          setMeaningsList([]);
          setCurrentMeaning('');
          setSelectedDominantConfig(null);
          setSelectedRecessiveConfig(null);
        } catch (e) {
          Alert.alert("Error", "Ocurrió un problema al guardar la seña.");
        }
      } else {
        Alert.alert("Muy corto", "El movimiento fue muy rápido. Por favor, inténtelo de nuevo.");
      }
    }
  };

  const filteredConfigs = availableConfigs.filter(config =>
    config.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const openConfigSelector = (hand: 'dominant' | 'recessive') => {
    setSelectingHand(hand);
    setSearchQuery('');
    setIsConfigSelectorOpen(true);
  };

  const selectConfig = (config: any | null) => {
    if (selectingHand === 'dominant') {
      setSelectedDominantConfig(config);
    } else {
      setSelectedRecessiveConfig(config);
    }
    setIsConfigSelectorOpen(false);
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
        #status-container { z-index: 100; position: absolute; top: 20px; width: 90%; background: rgba(0,0,0,0.8); border-radius: 10px; padding: 15px; color: white; font-family: monospace; font-size: 14px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); text-align: center; }
        .error { color: #EF4444; font-weight: bold; }
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
      <div id="status-container"><span id="status-text">Inicializando modelo...</span></div>
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
                  drawingUtils.drawLandmarks(landmark, { color: "#38BDF8", lineWidth: 1, radius: 2 });
                }
              }

              if (handResults && handResults.landmarks && handResults.landmarks.length > 0) {
                frameData.hands = handResults.landmarks.map(hand => hand.map(roundPoint));
                frameData.handednesses = handResults.handednesses;
                
                for (const landmarks of handResults.landmarks) {
                  drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color: "rgba(255,255,255,0.7)", lineWidth: 4 });
                  drawingUtils.drawLandmarks(landmarks, { color: "#38BDF8", lineWidth: 2, radius: 4 });
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
        <ActivityIndicator size="large" color={palette.deepSkyBlue} />
      </View>
    );
  }

  const isFormValid = meaningsList.length > 0 && selectedDominantConfig !== null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>

      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Typography variant="h3">Grabar Seña</Typography>
        </View>
      </View>

      <View style={styles.cameraWrapper}>
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

          {isFormValid && !isRecording && (
            <View style={styles.infoOverlay}>
              <Typography variant="subtitle" color="#FFFFFF" style={{ fontWeight: '700' }}>
                {meaningsList.join(', ')}
              </Typography>
              <Typography variant="label" color="rgba(255,255,255,0.8)">
                Dom: {selectedDominantConfig.name} {selectedRecessiveConfig ? `| Rec: ${selectedRecessiveConfig.name}` : ''}
              </Typography>
            </View>
          )}

          {isRecording && (
            <View style={styles.recordingOverlay}>
              <View style={styles.recordingDot} />
              <Typography variant="label" color="#FFFFFF" style={{ fontWeight: '700' }}>GRABANDO</Typography>
            </View>
          )}

          {!isReady && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Typography variant="label" color="#FFFFFF" style={{ marginTop: 8 }}>Preparando IA...</Typography>
            </View>
          )}
        </View>
      </View>

      <View style={styles.controlsWrapper}>
        {!isRecording && (
          <Pressable
            style={[styles.settingsButton, { backgroundColor: isFormValid ? colors.surface : palette.powderBlush, borderColor: colors.border }]}
            onPress={() => setIsSettingsOpen(true)}
          >
            <Settings width={24} height={24} color={isFormValid ? colors.text : '#000'} strokeWidth={isFormValid ? 2 : 2.5} />
          </Pressable>
        )}

        <Pressable
          style={[styles.shutterButton, {
            borderColor: isRecording ? '#EF4444' : (isReady && isFormValid ? palette.deepSkyBlue : colors.border),
            opacity: isReady ? 1 : 0.5
          }]}
          onPress={toggleRecording}
          disabled={!isReady}
        >
          <View style={[styles.shutterInner, { backgroundColor: isRecording ? '#EF4444' : (isReady && isFormValid ? palette.deepSkyBlue : colors.surface) }]}>
            {isRecording ? (
              <Pause width={28} height={28} color="#FFFFFF" strokeWidth={2.5} />
            ) : (
              <Camera width={32} height={32} color={isReady && isFormValid ? "#FFFFFF" : colors.textSecondary} strokeWidth={2} />
            )}
          </View>
        </Pressable>

        {!isRecording && (
          <View style={{ width: 56 }} />
        )}
      </View>

      <Modal visible={isSettingsOpen} transparent={true} animationType="fade" onRequestClose={() => setIsSettingsOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsSettingsOpen(false)} />
          <Card style={[styles.dialogCard, { backgroundColor: colors.background, maxHeight: '90%' }]}>

            <View style={styles.dialogHeader}>
              <Typography variant="h2">Detalles de la Seña</Typography>
              <IconButton size={36} icon={<Xmark width={22} height={22} color={colors.text} strokeWidth={2} />} backgroundColor={colors.surface} onPress={() => setIsSettingsOpen(false)} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.dialogBody}>

              <Typography variant="subtitle" color={colors.textSecondary} style={{ marginBottom: 12, fontWeight: '700' }}>MANO DOMINANTE *</Typography>
              <Pressable
                style={[styles.selectInput, { backgroundColor: colors.input, borderColor: selectedDominantConfig ? palette.deepSkyBlue : colors.border }]}
                onPress={() => openConfigSelector('dominant')}
              >
                <Typography variant="body" color={selectedDominantConfig ? colors.text : colors.textSecondary} style={{ fontWeight: '600' }}>
                  {selectedDominantConfig ? selectedDominantConfig.name : 'Toca para seleccionar...'}
                </Typography>
                <NavArrowLeft width={20} height={20} color={colors.textSecondary} style={{ transform: [{ rotate: '-90deg' }] }} />
              </Pressable>

              <Typography variant="subtitle" color={colors.textSecondary} style={{ marginTop: 24, marginBottom: 12, fontWeight: '700' }}>MANO RECESIVA (OPCIONAL)</Typography>
              <Pressable
                style={[styles.selectInput, { backgroundColor: colors.input, borderColor: colors.border }]}
                onPress={() => openConfigSelector('recessive')}
              >
                <Typography variant="body" color={selectedRecessiveConfig ? colors.text : colors.textSecondary} style={{ fontWeight: '600' }}>
                  {selectedRecessiveConfig ? selectedRecessiveConfig.name : 'Ninguna'}
                </Typography>
                <NavArrowLeft width={20} height={20} color={colors.textSecondary} style={{ transform: [{ rotate: '-90deg' }] }} />
              </Pressable>

              <Typography variant="subtitle" color={colors.textSecondary} style={{ marginTop: 24, marginBottom: 12, fontWeight: '700' }}>SIGNIFICADOS *</Typography>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, { flex: 1, color: colors.text, backgroundColor: colors.input, borderColor: currentMeaning ? palette.deepSkyBlue : 'transparent' }]}
                  placeholder="Ej: Hola, Saludos..."
                  placeholderTextColor={colors.textSecondary}
                  value={currentMeaning}
                  onChangeText={setCurrentMeaning}
                  onSubmitEditing={handleAddMeaning}
                />
                <Pressable
                  style={[styles.addBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={handleAddMeaning}
                  disabled={!currentMeaning.trim()}
                >
                  <Plus width={24} height={24} color={currentMeaning.trim() ? palette.deepSkyBlue : colors.textSecondary} strokeWidth={2} />
                </Pressable>
              </View>

              <View style={styles.meaningsWrapper}>
                <View style={styles.chipsWrapContainer}>
                  {meaningsList.map((meaning, index) => (
                    <View key={`meaning-chip-${index}`} style={[styles.chip, { backgroundColor: palette.deepSkyBlue }]}>
                      <Typography variant="label" color="#FFFFFF" style={{ fontWeight: '600' }}>{meaning}</Typography>
                      <Pressable onPress={() => handleRemoveMeaning(meaning)} style={styles.chipRemoveBtn}>
                        <Xmark width={16} height={16} color="#FFFFFF" strokeWidth={2} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>

            </ScrollView>

            <View style={[styles.dialogFooter, { borderTopColor: colors.border }]}>
              <Button
                title="Confirmar"
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

      <Modal visible={isConfigSelectorOpen} transparent={true} animationType="slide" onRequestClose={() => setIsConfigSelectorOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsConfigSelectorOpen(false)} />
          <Card style={[styles.dialogCard, { backgroundColor: colors.background, height: '80%' }]}>

            <View style={[styles.dialogHeader, { paddingBottom: 16 }]}>
              <Typography variant="h2">Buscar Configuración</Typography>
              <IconButton size={36} icon={<Xmark width={22} height={22} color={colors.text} strokeWidth={2} />} backgroundColor={colors.surface} onPress={() => setIsConfigSelectorOpen(false)} />
            </View>

            <View style={{ paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <View style={[styles.searchBar, { backgroundColor: colors.input }]}>
                <Search width={20} height={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Buscar por nombre..."
                  placeholderTextColor={colors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus={true}
                />
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ padding: 24 }}>
              {selectingHand === 'recessive' && (
                <Pressable
                  style={[styles.configListItem, { borderBottomColor: colors.border }]}
                  onPress={() => selectConfig(null)}
                >
                  <Typography variant="body" color={colors.textSecondary} style={{ fontWeight: '600' }}>Ninguna (Quitar)</Typography>
                </Pressable>
              )}

              {filteredConfigs.length > 0 ? (
                filteredConfigs.map((config) => (
                  <Pressable
                    key={`search-${config.id}`}
                    style={[styles.configListItem, { borderBottomColor: colors.border }]}
                    onPress={() => selectConfig(config)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Typography variant="body" color={colors.text} style={{ fontWeight: '600' }}>{config.name}</Typography>
                      {config.isLocal && (
                        <View style={{ backgroundColor: palette.powderBlush, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                          <Typography variant="label" color="#111" style={{ fontSize: 10, fontWeight: '800' }}>NUEVO</Typography>
                        </View>
                      )}
                    </View>
                    <Plus width={20} height={20} color={palette.deepSkyBlue} strokeWidth={2.5} />
                  </Pressable>
                ))
              ) : (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Typography variant="body" color={colors.textSecondary}>No se encontraron resultados.</Typography>
                </View>
              )}
            </ScrollView>

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
  cameraWrapper: { flex: 1, paddingHorizontal: 16, paddingBottom: 16 },
  cameraContainer: { flex: 1, borderRadius: 32, overflow: 'hidden', backgroundColor: '#111', position: 'relative' },
  webview: { flex: 1, backgroundColor: 'transparent' },
  infoOverlay: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.6)', padding: 16, borderRadius: 20, backdropFilter: 'blur(10px)' },
  recordingOverlay: { position: 'absolute', top: 20, alignSelf: 'center', backgroundColor: 'rgba(239, 68, 68, 0.9)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 8 },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFFFFF' },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  controlsWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 40, paddingBottom: 100, paddingTop: 10 },
  settingsButton: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  shutterButton: { width: 84, height: 84, borderRadius: 42, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end', alignItems: 'center' },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  dialogCard: { width: '100%', padding: 0, overflow: 'hidden', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  dialogHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 16 },
  dialogBody: { paddingHorizontal: 24, paddingBottom: 24 },
  selectInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 18, borderRadius: 20, borderWidth: 2 },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  input: { fontSize: 16, borderRadius: 20, paddingVertical: 16, paddingHorizontal: 20, fontWeight: '600', borderWidth: 2 },
  addBtn: { width: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 20, borderWidth: 2 },
  meaningsWrapper: { minHeight: 44, justifyContent: 'flex-start' },
  chipsWrapContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingLeft: 14, paddingRight: 8, borderRadius: 20, gap: 8 },
  chipRemoveBtn: { padding: 4, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.2)' },
  dialogFooter: { flexDirection: 'row', padding: 24, paddingTop: 16, borderTopWidth: 1 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, gap: 10 },
  searchInput: { flex: 1, fontSize: 16, fontWeight: '500' },
  configListItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1 },
});