import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { IconButton } from '@/components/common/IconButton';
import { Typography } from '@/components/common/Typography';
import { db } from '@/db';
import { manualConfigurations } from '@/db/schema';
import { useTheme } from '@/hooks/useTheme';
import { bakeAnimationLocal } from '@/lib/animationBaker';
import StaticServer from '@dr.pogodin/react-native-static-server';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Camera,
  Check,
  Pause,
  Plus,
  Search,
  Settings,
  Xmark,
} from 'iconoir-react-native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useCameraPermission } from 'react-native-vision-camera';
import { WebView } from 'react-native-webview';

const ANIMATIONS_DIRECTORY = `${FileSystem.documentDirectory}ensenas/animations/`;

const assetsToLoad = [
  {
    module: require('@/assets/models/pose_landmarker_lite.task'),
    name: 'pose.task',
  },
  {
    module: require('@/assets/models/hand_landmarker.task'),
    name: 'hand.task',
  },
  {
    module: require('@/assets/models/vision_bundle.js.bin'),
    name: 'vision_bundle.js',
  },
  {
    module: require('@/assets/models/vision_wasm_internal.js.bin'),
    name: 'vision_wasm_internal.js',
  },
  {
    module: require('@/assets/models/vision_wasm_internal.wasm'),
    name: 'vision_wasm_internal.wasm',
  },
];

type AnimationData = {
  duration: number;
  tracks: Array<{
    name: string;
    times: number[];
    values: number[];
  }>;
};

const ensureAnimationsDirectory = async () => {
  const info = await FileSystem.getInfoAsync(ANIMATIONS_DIRECTORY);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(ANIMATIONS_DIRECTORY, {
      intermediates: true,
    });
  }
};

const saveAnimationLocally = async (fileName: string, animation: AnimationData) => {
  await ensureAnimationsDirectory();
  const safeFileName = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
  const fileUri = ANIMATIONS_DIRECTORY + safeFileName;
  
  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(animation), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  
  const info = await FileSystem.getInfoAsync(fileUri);
  if (!info.exists) {
    throw new Error('');
  }
  return safeFileName;
};

const saveRawLocally = async (fileName: string, data: any) => {
  await ensureAnimationsDirectory();
  const safeFileName = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
  const fileUri = ANIMATIONS_DIRECTORY + safeFileName;
  
  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(data), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  
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

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConfigSelectorOpen, setIsConfigSelectorOpen] = useState(false);
  const [selectingHand, setSelectingHand] = useState<'dominant' | 'recessive' | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [availableConfigs, setAvailableConfigs] = useState<any[]>([]);
  const [selectedDominantConfig, setSelectedDominantConfig] = useState<any | null>(null);
  const [selectedRecessiveConfig, setSelectedRecessiveConfig] = useState<any | null>(null);
  
  const [currentMeaning, setCurrentMeaning] = useState('');
  const [meaningsList, setMeaningsList] = useState<string[]>([]);

  const [currentTip, setCurrentTip] = useState('');
  const [learningTips, setLearningTips] = useState<string[]>([]);
  
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  const [originalAnimationFile, setOriginalAnimationFile] = useState<string | null>(null);
  const [originalRawFile, setOriginalRawFile] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState('');

  const countdownTimerRef = useRef<any>(null);
  const serverRef = useRef<any>(null);
  const framesBuffer = useRef<any[]>([]);

  const isFormValid = meaningsList.length > 0 && selectedDominantConfig !== null;

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
      let cancelled = false;
      const fetchData = async () => {
        try {
          const [dbConfigs, localDataStr] = await Promise.all([
            db.select().from(manualConfigurations),
            AsyncStorage.getItem('@ensenas_manual_configs'),
          ]);

          const localData = localDataStr ? JSON.parse(localDataStr) : [];
          const formattedLocalConfigs = localData.map((item: any, index: number) => ({
            id: item.local_id || `local_config_${item.timestamp || index}`,
            name: item.name,
            code: null,
            imagePath: null,
            vectorData: JSON.stringify(item.raw_landmarks || item.landmarks),
            isLocal: true,
          }));

          const combinedConfigs = [...formattedLocalConfigs, ...dbConfigs];
          if (cancelled) return;
          setAvailableConfigs(combinedConfigs);

          if (signId) {
            const storedSignsStr = await AsyncStorage.getItem('@ensenas_recorded_signs');
            const storedSigns = storedSignsStr ? JSON.parse(storedSignsStr) : [];
            const signToEdit = storedSigns.find((s: any) => s.local_id === signId || s.timestamp === signId);

            if (signToEdit) {
              setMeaningsList(signToEdit.meanings || []);
              setLearningTips(signToEdit.learning_tips || []);
              setOriginalAnimationFile(getStoredAnimationFile(signToEdit));
              setOriginalRawFile(signToEdit.raw_frames || null);

              const domConfigId = signToEdit.dominant_config_id || signToEdit.configHandDominantId || `local_${signToEdit.configHandDominantId}`;
              const domConfig = combinedConfigs.find((c) => c.id === domConfigId);
              if (domConfig) setSelectedDominantConfig(domConfig);

              const recConfigId = signToEdit.recessive_config_id || signToEdit.configHandRecessiveId || `local_${signToEdit.configHandRecessiveId}`;
              if (recConfigId) {
                const recConfig = combinedConfigs.find((c) => c.id === recConfigId);
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
        } catch (error) {}
      };

      fetchData();
      return () => { cancelled = true; };
    }, [signId])
  );

  useEffect(() => {
    let isMounted = true;
    const setupOfflineServer = async () => {
      try {
        const wwwPath = `${FileSystem.documentDirectory}www/`;
        const dirInfo = await FileSystem.getInfoAsync(wwwPath);
        if (dirInfo.exists) {
          await FileSystem.deleteAsync(wwwPath, { idempotent: true });
        }
        await FileSystem.makeDirectoryAsync(wwwPath, { intermediates: true });

        for (const item of assetsToLoad) {
          const asset = Asset.fromModule(item.module);
          await asset.downloadAsync();
          if (!asset.localUri) throw new Error();
          await FileSystem.copyAsync({
            from: asset.localUri,
            to: wwwPath + item.name,
          });
        }

        const serverPath = wwwPath.replace(/^file:\/\//, '');
        const server = new StaticServer({ port: 0, fileDir: serverPath });
        const rawUrl = await server.start();
        const safeUrl = rawUrl.endsWith('/') ? rawUrl : `${rawUrl}/`;

        if (!isMounted) {
          await server.stop();
          return;
        }
        serverRef.current = server;
        setServerUrl(safeUrl);
      } catch (error: any) {}
    };

    setupOfflineServer();
    return () => {
      isMounted = false;
      if (serverRef.current) {
        try { serverRef.current.stop(); } catch (error) {}
        serverRef.current = null;
      }
    };
  }, []);

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

  const handleAddMeaning = () => {
    const trimmedMeaning = currentMeaning.trim();
    if (trimmedMeaning && !meaningsList.includes(trimmedMeaning)) {
      setMeaningsList([...meaningsList, trimmedMeaning]);
      setCurrentMeaning('');
    }
  };

  const handleRemoveMeaning = (meaningToRemove: string) => {
    setMeaningsList(meaningsList.filter((meaning) => meaning !== meaningToRemove));
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

  const saveEditedMetadataOnly = async () => {
    if (!selectedDominantConfig || meaningsList.length === 0) return;
    try {
      const storedData = await AsyncStorage.getItem('@ensenas_recorded_signs');
      let currentData = storedData ? JSON.parse(storedData) : [];
      const updatedSign = {
        local_id: signId,
        dominant_config_id: selectedDominantConfig.id,
        recessive_config_id: selectedRecessiveConfig?.id || null,
        meanings: meaningsList,
        learning_tips: learningTips,
        baked_animation: originalAnimationFile,
        raw_frames: originalRawFile
      };

      currentData = currentData.map((s: any) => (s.local_id === signId || s.timestamp === signId) ? { ...s, ...updatedSign } : s);
      await AsyncStorage.setItem('@ensenas_recorded_signs', JSON.stringify(currentData));
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
      setCountdown(3);
      countdownTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev === 1) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
            framesBuffer.current = [];
            setIsRecording(true);
            return null;
          }
          return prev ? prev - 1 : null;
        });
      }, 1000);
      return;
    }

    setIsRecording(false);
    const capturedFrames = framesBuffer.current.length;
    if (capturedFrames <= 5) return;

    try {
      const framesToSave = framesBuffer.current;
      const currentSignId = signId || `local_sign_${Date.now()}`;

      const rawFileName = await saveRawLocally(`raw_${currentSignId}.json`, framesToSave);

      const animationData = bakeAnimationLocal(
        framesToSave,
        selectedRecessiveConfig === null
      );

      const animationFile = `sena_${currentSignId}.json`;
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

      const storedData = await AsyncStorage.getItem('@ensenas_recorded_signs');
      let currentData = storedData ? JSON.parse(storedData) : [];

      if (signId) {
        currentData = currentData.map((s: any) => (s.local_id === signId || s.timestamp === signId) ? { ...s, ...newSign } : s);
        await AsyncStorage.setItem('@ensenas_recorded_signs', JSON.stringify(currentData));
        router.back();
        return;
      }

      await AsyncStorage.setItem('@ensenas_recorded_signs', JSON.stringify([...currentData, newSign]));
      setMeaningsList([]);
      setCurrentMeaning('');
      setLearningTips([]);
      setCurrentTip('');
      setSelectedDominantConfig(null);
      setSelectedRecessiveConfig(null);
      setOriginalAnimationFile(null);
      setOriginalRawFile(null);
      framesBuffer.current = [];
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo generar la animación localmente.');
    }
  };

  const openConfigSelector = (hand: 'dominant' | 'recessive') => {
    setSelectingHand(hand);
    setSearchQuery('');
    setIsConfigSelectorOpen(true);
  };

  const selectConfig = (config: any | null) => {
    if (selectingHand === 'dominant') setSelectedDominantConfig(config);
    else setSelectedRecessiveConfig(config);
    setIsConfigSelectorOpen(false);
  };

  const filteredConfigs = useMemo(() => {
    return availableConfigs.filter((config) =>
      config.name?.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
  }, [availableConfigs, searchQuery]);

  const htmlContent = useMemo(() => {
    if (!serverUrl) return '';
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    body { margin: 0; padding: 0; background-color: #000; overflow: hidden; display: flex; justify-content: center; align-items: center; height: 100vh; }
    video { position: absolute; width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); z-index: 1; }
    canvas { position: absolute; width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); z-index: 2; pointer-events: none; background-color: transparent; }
  </style>
</head>
<body>
  <video id="video" autoplay playsinline muted></video>
  <canvas id="canvas"></canvas>
  <script type="module">
    import { PoseLandmarker, HandLandmarker, FilesetResolver, DrawingUtils } from "./vision_bundle.js";
    const video = document.getElementById("video");
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    let poseLandmarker;
    let handLandmarker;
    let drawingUtils;
    let lastVideoTime = -1;
    let lastPostTime = 0;

    function roundPoint(pt) {
      if (!pt) return pt;
      return {
        x: Math.round(pt.x * 10000) / 10000,
        y: Math.round(pt.y * 10000) / 10000,
        z: Math.round(pt.z * 10000) / 10000,
        visibility: pt.visibility !== undefined ? pt.visibility : 1
      };
    }

    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks("./");
        poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: "./pose.task", delegate: "GPU" },
          runningMode: "VIDEO", minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5
        });
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: "./hand.task", delegate: "GPU" },
          runningMode: "VIDEO", numHands: 2, minHandDetectionConfidence: 0.5, minHandPresenceConfidence: 0.5, minTrackingConfidence: 0.5
        });
        drawingUtils = new DrawingUtils(ctx);
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
        video.srcObject = stream;
        video.addEventListener("loadeddata", predictWebcam);
        window.ReactNativeWebView.postMessage(JSON.stringify({ status: "READY" }));
      } catch (err) {}
    }

    async function predictWebcam() {
      try {
        if (canvas.width !== video.videoWidth) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
        const startTimeMs = performance.now();
        if (lastVideoTime !== video.currentTime) {
          lastVideoTime = video.currentTime;
          const poseResults = poseLandmarker.detectForVideo(video, startTimeMs);
          const handResults = handLandmarker.detectForVideo(video, startTimeMs);
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (poseResults && poseResults.landmarks && poseResults.landmarks.length > 0) {
            drawingUtils.drawConnectors(poseResults.landmarks[0], PoseLandmarker.POSE_CONNECTIONS, { color: "rgba(255,255,255,0.3)", lineWidth: 2 });
          }
          if (handResults && handResults.landmarks && handResults.landmarks.length > 0) {
            for (const landmarks of handResults.landmarks) {
              drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color: "#38BDF8", lineWidth: 2 });
            }
          }

          if (startTimeMs - lastPostTime > 66) {
            const frameData = { timestamp: Date.now(), pose3D: null, pose2D: null, leftHand: null, rightHand: null };

            if (poseResults && poseResults.worldLandmarks && poseResults.worldLandmarks.length > 0 && poseResults.landmarks.length > 0) {
              frameData.pose3D = poseResults.worldLandmarks[0].map(roundPoint);
              frameData.pose2D = poseResults.landmarks[0].map(roundPoint);
            }

            if (handResults && handResults.landmarks && handResults.landmarks.length > 0) {
              handResults.landmarks.forEach((hand, index) => {
                const classification = handResults.handednesses[index][0].category;
                if (classification === "Left") {
                  frameData.leftHand = hand.map(roundPoint);
                } else {
                  frameData.rightHand = hand.map(roundPoint);
                }
              });
            }

            if (frameData.pose3D || frameData.leftHand || frameData.rightHand) {
              window.ReactNativeWebView.postMessage(JSON.stringify(frameData));
            }
            lastPostTime = startTimeMs;
          }
        }
        window.requestAnimationFrame(predictWebcam);
      } catch (err) {}
    }
    init();
  </script>
</body>
</html>`;
  }, [serverUrl]);

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
          <Typography variant="h1" color="#FFFFFF" style={styles.countdownText}>
            {countdown}
          </Typography>
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
          onPress={() => setIsSettingsOpen(true)}
        >
          <Settings width={24} height={24} color={isFormValid ? colors.text : '#000'} />
        </Pressable>
      )}

      {!isRecording && countdown !== null && <View style={styles.spacer} />}

      <Pressable 
        style={[styles.shutterButton, { borderColor: isRecording || countdown !== null ? '#EF4444' : isReady && isFormValid ? palette.deepSkyBlue : colors.border, opacity: isReady ? 1 : 0.5 }]} 
        onPress={toggleRecording} 
        disabled={!isReady}
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

      {!isRecording && <View style={styles.spacer} />}
    </View>
  );

  const renderSettingsModal = () => (
    <Modal visible={isSettingsOpen} transparent={true} animationType="fade" onRequestClose={() => setIsSettingsOpen(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={() => setIsSettingsOpen(false)} />
        <Card style={[styles.dialogCard, { backgroundColor: colors.background, maxHeight: '90%' }]}>
          <View style={styles.dialogHeader}>
            <Typography variant="h2">{signId ? 'Editar Detalles' : 'Detalles de la Seña'}</Typography>
            <IconButton size={36} icon={<Xmark width={22} height={22} color={colors.text} />} backgroundColor={colors.surface} onPress={() => setIsSettingsOpen(false)} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.dialogBody}>
            <Typography variant="subtitle" color={colors.textSecondary}>MANO DOMINANTE *</Typography>
            <Pressable style={[styles.selectInput, { backgroundColor: colors.input, borderColor: selectedDominantConfig ? palette.deepSkyBlue : colors.border }]} onPress={() => openConfigSelector('dominant')}>
              <Typography variant="body" color={selectedDominantConfig ? colors.text : colors.textSecondary}>
                {selectedDominantConfig ? selectedDominantConfig.name : 'Seleccionar...'}
              </Typography>
            </Pressable>

            <Typography variant="subtitle" color={colors.textSecondary} style={styles.marginTop24}>MANO RECESIVA</Typography>
            <Pressable style={[styles.selectInput, { backgroundColor: colors.input, borderColor: colors.border }]} onPress={() => openConfigSelector('recessive')}>
              <Typography variant="body" color={selectedRecessiveConfig ? colors.text : colors.textSecondary}>
                {selectedRecessiveConfig ? selectedRecessiveConfig.name : 'Ninguna'}
              </Typography>
            </Pressable>

            <Typography variant="subtitle" color={colors.textSecondary} style={styles.marginTop24}>SIGNIFICADOS *</Typography>
            <View style={styles.inputRow}>
              <TextInput 
                style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: currentMeaning ? palette.deepSkyBlue : 'transparent' }]} 
                value={currentMeaning} 
                onChangeText={setCurrentMeaning} 
                onSubmitEditing={handleAddMeaning} 
              />
              <Pressable style={[styles.addBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleAddMeaning} disabled={!currentMeaning.trim()}>
                <Plus width={24} height={24} color={currentMeaning.trim() ? palette.deepSkyBlue : colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.meaningsWrapper}>
              <View style={styles.chipsWrapContainer}>
                {meaningsList.map((meaning, index) => (
                  <View key={index} style={[styles.chip, { backgroundColor: palette.deepSkyBlue }]}>
                    <Typography variant="label" color="#FFFFFF">{meaning}</Typography>
                    <Pressable onPress={() => handleRemoveMeaning(meaning)} style={styles.chipRemoveBtn}>
                      <Xmark width={16} height={16} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>

            <Typography variant="subtitle" color={colors.textSecondary} style={styles.marginTop24}>TIPS DE APRENDIZAJE (OPCIONAL)</Typography>
            <View style={styles.inputRow}>
              <TextInput 
                style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: currentTip ? palette.deepSkyBlue : 'transparent' }]} 
                placeholder="Ej: Recuerda la postura recta..."
                placeholderTextColor={colors.textSecondary}
                value={currentTip} 
                onChangeText={setCurrentTip} 
                onSubmitEditing={handleAddTip} 
              />
              <Pressable style={[styles.addBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleAddTip} disabled={!currentTip.trim()}>
                <Plus width={24} height={24} color={currentTip.trim() ? palette.deepSkyBlue : colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.meaningsWrapper}>
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
            </View>
          </ScrollView>

          <View style={[styles.dialogFooter, { borderTopColor: colors.border }]}>
            {signId && (
              <Button 
                title="Guardar Solo Textos" 
                color={colors.surface} 
                textColor={colors.text} 
                onPress={saveEditedMetadataOnly} 
                disabled={!isFormValid} 
                style={[styles.saveMetadataBtn, { borderColor: colors.border, opacity: !isFormValid ? 0.6 : 1 }]} 
              />
            )}
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
        </Card>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderConfigSelectorModal = () => (
    <Modal visible={isConfigSelectorOpen} transparent={true} animationType="slide" onRequestClose={() => setIsConfigSelectorOpen(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={() => setIsConfigSelectorOpen(false)} />
        <Card style={[styles.dialogCard, { backgroundColor: colors.background, height: '80%' }]}>
          <View style={[styles.dialogHeader, styles.paddingBottom16]}>
            <Typography variant="h2">Buscar Configuración</Typography>
            <IconButton size={36} icon={<Xmark width={22} height={22} color={colors.text} />} backgroundColor={colors.surface} onPress={() => setIsConfigSelectorOpen(false)} />
          </View>

          <View style={[styles.searchBarWrapper, { borderBottomColor: colors.border }]}>
            <View style={[styles.searchBar, { backgroundColor: colors.input }]}>
              <Search width={20} height={20} color={colors.textSecondary} />
              <TextInput style={[styles.searchInput, { color: colors.text }]} value={searchQuery} onChangeText={setSearchQuery} autoFocus={true} />
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={styles.configScrollContent}>
            {selectingHand === 'recessive' && (
              <Pressable style={[styles.configListItem, { borderBottomColor: colors.border }]} onPress={() => selectConfig(null)}>
                <Typography variant="body" color={colors.textSecondary}>Ninguna (Quitar)</Typography>
              </Pressable>
            )}

            {filteredConfigs.length > 0 ? (
              filteredConfigs.map((config) => (
                <Pressable key={`search-${config.id}`} style={[styles.configListItem, { borderBottomColor: colors.border }]} onPress={() => selectConfig(config)}>
                  <View style={styles.configListItemInner}>
                    <Typography variant="body" color={colors.text}>{config.name}</Typography>
                    {config.isLocal && (
                      <View style={[styles.newBadge, { backgroundColor: palette.powderBlush }]}>
                        <Typography variant="label" color="#111" style={styles.newBadgeText}>NUEVO</Typography>
                      </View>
                    )}
                  </View>
                  <Plus width={20} height={20} color={palette.deepSkyBlue} />
                </Pressable>
              ))
            ) : (
              <View style={styles.emptyStateContainer}>
                <Typography variant="body" color={colors.textSecondary}>No resultados.</Typography>
              </View>
            )}
          </ScrollView>
        </Card>
      </KeyboardAvoidingView>
    </Modal>
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end', alignItems: 'center' },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  dialogCard: { width: '100%', padding: 0, overflow: 'hidden', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  dialogHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 16 },
  dialogBody: { paddingHorizontal: 24, paddingBottom: 24 },
  selectInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 18, borderRadius: 20, borderWidth: 2 },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  input: { flex: 1, fontSize: 16, borderRadius: 20, paddingVertical: 16, paddingHorizontal: 20, fontWeight: '600', borderWidth: 2 },
  addBtn: { width: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 20, borderWidth: 2 },
  meaningsWrapper: { minHeight: 44, justifyContent: 'flex-start' },
  chipsWrapContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingLeft: 14, paddingRight: 8, borderRadius: 20, gap: 8 },
  chipRemoveBtn: { padding: 4, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.2)' },
  dialogFooter: { padding: 24, paddingTop: 16, borderTopWidth: 1, flexDirection: 'column', gap: 12 },
  saveMetadataBtn: { borderWidth: 1 },
  searchBarWrapper: { paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, gap: 10 },
  searchInput: { flex: 1, fontSize: 16, fontWeight: '500' },
  configScrollContent: { padding: 24 },
  configListItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1 },
  configListItemInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  newBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  newBadgeText: { fontSize: 10 },
  emptyStateContainer: { padding: 40, alignItems: 'center' },
  marginTop24: { marginTop: 24 },
  paddingBottom16: { paddingBottom: 16 }
});