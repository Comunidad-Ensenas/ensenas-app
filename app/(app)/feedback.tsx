import { Button } from '@/components/common/Button';
import { IconBox } from '@/components/common/IconBox';
import { IconButton } from '@/components/common/IconButton';
import { Typography } from '@/components/common/Typography';
import { useTheme } from '@/hooks/useTheme';
import { useUserData } from '@/hooks/useUserData';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { router, Stack } from 'expo-router';
import { ChatBubble, Check, InfoCircle, LightBulb, NavArrowLeft, Send, Star, WarningTriangle } from 'iconoir-react-native';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const FEEDBACK_TYPES = [
  { id: 'suggestion', label: 'Sugerencia', icon: LightBulb },
  { id: 'bug', label: 'Problema', icon: WarningTriangle },
  { id: 'other', label: 'Otro', icon: ChatBubble },
];

export default function FeedbackScreen() {
  const { colors, isDark } = useTheme();
  const palette = (colors as any).palette;
  const insets = useSafeAreaInsets();
  const { userData } = useUserData();

  const [feedbackType, setFeedbackType] = useState('suggestion');
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    syncPendingFeedback();
  }, []);

  const syncPendingFeedback = async () => {
    try {
      const queueStr = await AsyncStorage.getItem('@feedback_queue');
      if (queueStr) {
        const queue = JSON.parse(queueStr);
        if (queue.length > 0) {
          console.log(`[Sync] Intentando enviar ${queue.length} comentarios pendientes...`);
          console.log("[Backend Simulado] Comentarios sincronizados:", queue);
          await AsyncStorage.removeItem('@feedback_queue');
        }
      }
    } catch (e) {
      console.error("Error sincronizando comentarios:", e);
    }
  };

  const saveToQueue = async (payload: any) => {
    try {
      const queueStr = await AsyncStorage.getItem('@feedback_queue');
      const queue = queueStr ? JSON.parse(queueStr) : [];
      queue.push(payload);
      await AsyncStorage.setItem('@feedback_queue', JSON.stringify(queue));
      console.log("[Offline] Comentario guardado en la cola local para envío posterior.");
    } catch (e) {
      console.error("Error guardando en la cola:", e);
    }
  };

  const handleSendFeedback = async () => {
    if (message.trim().length < 10 || rating === 0) return;
    
    setIsSubmitting(true);

    const userPayload = userData ? {
      id: userData.id,
      name: `${userData.firstName} ${userData.lastName || ''}`.trim(),
      experienceLevel: userData.experienceLevel,
      motivations: userData.learningMotivation,
      streak: userData.streakDays,
      dailyGoal: userData.dailyGoalMinutes,
      isLeftHanded: userData.isLeftHanded
    } : { id: 'anonymous' };

    const devicePayload = {
      os: Platform.OS,
      osVersion: Device.osVersion,
      brand: Device.brand,
      model: Device.modelName,
      isPad: Platform.OS === 'ios' ? Platform.isPad : false,
      isTV: Platform.isTV,
    };

    const feedbackPayload = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type: feedbackType,
      rating: rating,
      message: message.trim(),
      user: userPayload,
      device: devicePayload
    };

    try {
      console.log(JSON.stringify(feedbackPayload, null, 2));
      
      await new Promise(resolve => setTimeout(resolve, 1500));

      setIsSuccess(true);
      setTimeout(() => router.back(), 2000);

    } catch (error) {
      console.warn("Fallo el envío. Guardando en cola...");
      await saveToQueue(feedbackPayload);
      
      setIsSuccess(true);
      setTimeout(() => router.back(), 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      <View style={styles.header}>
        <IconButton 
          icon={<NavArrowLeft width={24} height={24} color={colors.text} strokeWidth={2.5} />} 
          onPress={() => router.back()} 
          backgroundColor={colors.surface}
          size={44}
        />
        <Typography variant="h3">Comentarios</Typography>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          <IconBox 
            size={72} 
            icon={<ChatBubble width={32} height={32} color={palette.deepSkyBlue} strokeWidth={2} />} 
            backgroundColor={palette.deepSkyBlue + '20'}
            style={{ marginBottom: 24, alignSelf: 'center' }}
          />

          <Typography variant="h2" style={{ textAlign: 'center', marginBottom: 8 }}>Ayúdanos a mejorar</Typography>
          <Typography variant="body" color={colors.textSecondary} style={{ textAlign: 'center', marginBottom: 32, paddingHorizontal: 16 }}>
            ¿Encontraste un error o tienes una idea increíble? Cuéntanos.
          </Typography>

          <Typography variant="label" color={colors.textSecondary} style={styles.sectionTitle}>TU EXPERIENCIA</Typography>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable key={star} onPress={() => setRating(star)} style={styles.starButton}>
                <Star 
                  width={42} 
                  height={42} 
                  color={rating >= star ? '#FACC15' : colors.surface} 
                  fill={rating >= star ? '#FACC15' : 'transparent'}
                  strokeWidth={rating >= star ? 0 : 2} 
                />
              </Pressable>
            ))}
          </View>

          <Typography variant="label" color={colors.textSecondary} style={[styles.sectionTitle, { marginTop: 12 }]}>TIPO DE COMENTARIO</Typography>
          <View style={styles.chipContainer}>
            {FEEDBACK_TYPES.map((type) => {
              const isActive = feedbackType === type.id;
              return (
                <Pressable
                  key={type.id}
                  style={[styles.chip, { backgroundColor: colors.surface, borderColor: isActive ? palette.deepSkyBlue : 'transparent' }]}
                  onPress={() => setFeedbackType(type.id)}
                >
                  <type.icon width={18} height={18} color={isActive ? palette.deepSkyBlue : colors.textSecondary} strokeWidth={2} />
                  <Typography variant="subtitle" color={isActive ? palette.deepSkyBlue : colors.textSecondary} style={{ fontWeight: '600' }}>
                    {type.label}
                  </Typography>
                </Pressable>
              );
            })}
          </View>

          <Typography variant="label" color={colors.textSecondary} style={[styles.sectionTitle, { marginTop: 24 }]}>TU MENSAJE</Typography>
          <View style={[styles.textAreaContainer, { backgroundColor: colors.input, borderColor: message.length > 0 ? palette.deepSkyBlue : 'transparent' }]}>
            <TextInput
              style={[styles.textArea, { color: colors.text }]}
              placeholder="Escribe tus comentarios aquí... (mínimo 10 caracteres)"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={message}
              onChangeText={setMessage}
            />
          </View>
          <Typography variant="label" color={colors.textSecondary} style={{ alignSelf: 'flex-end', marginTop: 8 }}>
            {message.length} caracteres
          </Typography>

          <View style={styles.privacyNote}>
            <InfoCircle width={16} height={16} color={colors.textSecondary} strokeWidth={2} />
            <Typography variant="label" color={colors.textSecondary} style={{ flex: 1 }}>
              Incluiremos información básica de tu perfil y versión del dispositivo para poder entender mejor el contexto de tu mensaje.
            </Typography>
          </View>

        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 12, 24) }]}>
          <Button 
            title={isSuccess ? "¡Recibido! Gracias" : isSubmitting ? "Enviando..." : "Enviar Comentario"}
            icon={isSuccess ? <Check width={20} height={20} color={isDark ? '#111418' : '#FFFFFF'} strokeWidth={3} /> : (!isSubmitting ? <Send width={20} height={20} color={(message.length < 10 || rating === 0) ? colors.textSecondary : (isDark ? '#111418' : '#FFFFFF')} strokeWidth={2.5} /> : undefined)}
            onPress={handleSendFeedback}
            disabled={message.trim().length < 10 || rating === 0 || isSubmitting || isSuccess}
            color={(message.length < 10 || rating === 0) ? colors.surface : (isSuccess ? colors.success : palette.deepSkyBlue)}
            textColor={(message.length < 10 || rating === 0) ? colors.textSecondary : (isDark ? '#111418' : '#FFFFFF')}
            style={{ paddingVertical: 18 }}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16 },
  headerSpacer: { width: 44 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 10 },
  starsContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 32 },
  starButton: { padding: 8 },
  sectionTitle: { marginBottom: 16, letterSpacing: 1, fontWeight: '700' },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, width: '100%' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 24, borderWidth: 2 },
  textAreaContainer: { borderRadius: 24, borderWidth: 2, padding: 4 },
  textArea: { fontSize: 16, minHeight: 140, padding: 16, paddingTop: 16, fontWeight: '500' },
  privacyNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 32, opacity: 0.8 },
  footer: { paddingHorizontal: 24, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(150,150,150,0.1)' },
});