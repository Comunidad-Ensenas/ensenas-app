import { Avatar } from '@/components/common/Avatar';
import { Card } from '@/components/common/Card';
import { IconBox } from '@/components/common/IconBox';
import { IconButton } from '@/components/common/IconButton';
import { SectionHeader } from '@/components/common/SectionHeader';
import { Typography } from '@/components/common/Typography';
import { db } from '@/db';
import { profile } from '@/db/schema';
import { useTheme } from '@/hooks/useTheme';
import { useUserData } from '@/hooks/useUserData';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { eq } from 'drizzle-orm';
import { router, useFocusEffect } from 'expo-router';
import { Bell, Calendar, ChatBubble, CheckCircle, Clock, EditPencil, FireFlame, HalfMoon, Handbag, Medal, NavArrowRight, SeaWaves, Settings, Star, SunLight, User, View360, Xmark } from 'iconoir-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SKIN_TONES = [
  { label: 'Claro', color: '#FAD8C3' },
  { label: 'Medio Claro', color: '#E3BA9A' },
  { label: 'Medio', color: '#C6936A' },
  { label: 'Medio Oscuro', color: '#8F5835' },
  { label: 'Oscuro', color: '#503525' }
];

const REMINDER_TIMES = ['08:00', '12:00', '18:00', '20:00'];

export default function ProfileScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const palette = (colors as any).palette;
  const { userData, isLoading, refreshUserData } = useUserData();
  
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  const [isTonePickerOpen, setIsTonePickerOpen] = useState(false);
  const [isReminderPickerOpen, setIsReminderPickerOpen] = useState(false);
  
  const [skinTone, setSkinTone] = useState('#E3BA9A');
  const [reminderTime, setReminderTime] = useState('');

  // ESTO ARREGLA LA ACTUALIZACIÓN: Refresca los datos cuando la pantalla gana el foco
  useFocusEffect(
    useCallback(() => {
      refreshUserData();
    }, [])
  );

  useEffect(() => {
    if (userData) {
      setHapticEnabled(userData.hapticFeedback);
      if (userData.avatarSkinTone) setSkinTone(userData.avatarSkinTone);
      if (userData.reminderTime) setReminderTime(userData.reminderTime);
    }
    AsyncStorage.getItem('@notifications_enabled').then((val) => {
      if (val !== null) setNotificationsEnabled(val === 'true');
    });
  }, [userData]);

  useEffect(() => {
    if (isSettingsVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 0 })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true })
      ]).start();
      setTimeout(() => {
        setIsTonePickerOpen(false);
        setIsReminderPickerOpen(false);
      }, 200);
    }
  }, [isSettingsVisible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 1.0) {
          setIsSettingsVisible(false);
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0
          }).start();
        }
      }
    })
  ).current;

  const handleToggleHaptic = async (val: boolean) => {
    setHapticEnabled(val);
    if (userData) {
      try {
        await db.update(profile).set({ hapticFeedback: val }).where(eq(profile.id, userData.id));
        await refreshUserData();
      } catch (error) {
        setHapticEnabled(!val);
      }
    }
  };

  const handleToggleNotifications = async (val: boolean) => {
    setNotificationsEnabled(val);
    await AsyncStorage.setItem('@notifications_enabled', String(val));
  };

  const handleSkinToneSelect = async (color: string) => {
    setSkinTone(color);
    setIsTonePickerOpen(false);
    if (userData) {
      await db.update(profile).set({ avatarSkinTone: color }).where(eq(profile.id, userData.id));
      await refreshUserData();
    }
  };

  const handleReminderSelect = async (time: string) => {
    const newTime = reminderTime === time ? null : time;
    setReminderTime(newTime || '');
    if (userData) {
      await db.update(profile).set({ reminderTime: newTime }).where(eq(profile.id, userData.id));
      await refreshUserData();
    }
  };

  const handleSendFeedback = () => {
    setIsSettingsVisible(false);
    // router.push('../feedback'); // Descomentar cuando la sección exista
    console.log("Navegando a comentarios...");
  };

  const handleEditProfile = () => {
    setTimeout(() => router.push('../edit-profile'), 150);
  };

  const weeklyData = [
    { day: 'L', value: 40 }, { day: 'M', value: 65 }, { day: 'X', value: 30 },
    { day: 'J', value: 85 }, { day: 'V', value: 50 }, { day: 'S', value: 20 }, { day: 'D', value: 10 }
  ];

  if (isLoading || !userData) {
    return <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} />;
  }

  const currentSkinLabel = SKIN_TONES.find(t => t.color === skinTone)?.label || 'Medio Claro';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Typography variant="h3">Perfil</Typography>
        <IconButton 
          icon={<Settings width={24} height={24} color={colors.text} strokeWidth={2} />} 
          onPress={() => setIsSettingsVisible(true)} 
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Avatar 
              icon={<User width={48} height={48} color={palette.deepSkyBlue} strokeWidth={1.5} />}
              size={100}
              backgroundColor={palette.deepSkyBlue + '20'}
              badgeText={`Lvl 1`}
              badgeColor={palette.powderBlush}
            />
            <Pressable style={[styles.editAvatarBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleEditProfile}>
              <EditPencil width={16} height={16} color={colors.text} strokeWidth={2} />
            </Pressable>
          </View>
          <Typography variant="h1" style={{ marginBottom: 4, marginTop: 16 }}>{userData.firstName} {userData.lastName}</Typography>
          <Typography variant="subtitle" color={colors.textSecondary}>{(userData.experienceLevel && userData.experienceLevel != 'Ninguno') || 'Estudiante Principiante'}</Typography>
        </View>

        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <IconBox icon={<FireFlame width={28} height={28} color={palette.powderBlush} strokeWidth={2} />} backgroundColor={palette.powderBlush + '20'} style={{ marginBottom: 12 }} />
            <Typography variant="h2" style={{ marginBottom: 4 }}>{userData.streakDays}</Typography>
            <Typography variant="label" color={colors.textSecondary}>RACHA</Typography>
          </Card>
          <Card style={styles.statCard}>
            <IconBox icon={<Handbag width={28} height={28} color={palette.deepSkyBlue} strokeWidth={2} />} backgroundColor={palette.deepSkyBlue + '20'} style={{ marginBottom: 12 }} />
            <Typography variant="h2" style={{ marginBottom: 4 }}>85</Typography>
            <Typography variant="label" color={colors.textSecondary}>SEÑAS</Typography>
          </Card>
          <Card style={styles.statCard}>
            <IconBox icon={<Star width={28} height={28} color={isDark ? '#FACC15' : '#CA8A04'} strokeWidth={2} />} backgroundColor={'#FACC15' + '20'} style={{ marginBottom: 12 }} />
            <Typography variant="h2" style={{ marginBottom: 4 }}>{userData.xpEarnedToday}</Typography>
            <Typography variant="label" color={colors.textSecondary}>PUNTOS</Typography>
          </Card>
        </View>

        <View style={styles.sectionContainer}>
          <SectionHeader title="Mis Medallas" actionText="Ver todas" actionColor={palette.deepSkyBlue} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.medalsList}>
          <Card style={styles.medalCard}>
            <IconBox size={72} icon={<Handbag width={36} height={36} color={palette.deepSkyBlue} strokeWidth={1.5} />} backgroundColor={palette.deepSkyBlue + '15'} style={{ marginBottom: 16 }} />
            <Typography variant="label" align="center">Primer Saludo</Typography>
          </Card>
          <Card style={styles.medalCard}>
            <IconBox size={72} icon={<Calendar width={36} height={36} color={palette.powderBlush} strokeWidth={1.5} />} backgroundColor={palette.powderBlush + '15'} style={{ marginBottom: 16 }} />
            <Typography variant="label" align="center">7 Días</Typography>
          </Card>
          <Card style={[styles.medalCard, { opacity: 0.6 }]}>
            <IconBox size={72} icon={<Medal width={36} height={36} color={colors.textSecondary} strokeWidth={1.5} />} backgroundColor={colors.input} style={{ marginBottom: 16 }} />
            <Typography variant="label" color={colors.textSecondary} align="center">Experto</Typography>
          </Card>
        </ScrollView>

        <View style={styles.sectionContainer}>
          <Typography variant="h3" style={{ marginBottom: 20 }}>Progreso Semanal</Typography>
          <Card style={styles.chartCard}>
            <View style={styles.chartContainer}>
              {weeklyData.map((item, index) => (
                <View key={index} style={styles.barWrapper}>
                  <View style={[styles.barBackground, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
                    <View style={[styles.barFill, { height: `${item.value}%`, backgroundColor: item.value > 60 ? palette.deepSkyBlue : palette.powderBlush }]} />
                  </View>
                  <Typography variant="label" color={colors.textSecondary}>{item.day}</Typography>
                </View>
              ))}
            </View>
          </Card>
        </View>
      </ScrollView>

      <Modal transparent={true} visible={isSettingsVisible} onRequestClose={() => setIsSettingsVisible(false)}>
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          <Pressable style={styles.touchableBackground} onPress={() => setIsSettingsVisible(false)} />
          <Animated.View style={[styles.modalContent, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF', transform: [{ translateY: slideAnim }] }]}>
            
            <View {...panResponder.panHandlers} style={styles.dragAreaWrapper}>
              <View style={styles.modalDragHandle} />
              <View style={styles.modalHeader}>
                <Typography variant="h2">Configuración</Typography>
                <IconButton icon={<Xmark width={20} height={20} color={colors.text} strokeWidth={2} />} size={36} onPress={() => setIsSettingsVisible(false)} />
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              <Typography variant="label" color={colors.textSecondary} style={{ marginBottom: 16, marginTop: 8 }}>APARIENCIA</Typography>
              
              <View style={styles.settingRow}>
                <View style={styles.settingLabelContainer}>
                  <IconBox size={44} icon={isDark ? <HalfMoon width={22} height={22} color={palette.deepSkyBlue} strokeWidth={2} /> : <SunLight width={22} height={22} color={palette.deepSkyBlue} strokeWidth={2} />} backgroundColor={palette.deepSkyBlue + '20'} />
                  <Typography variant="subtitle">Modo Oscuro</Typography>
                </View>
                <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false: isDark ? '#333' : '#E5E7EB', true: palette.powderBlush }} thumbColor={'#FFFFFF'} />
              </View>

              <Pressable style={styles.settingRow} onPress={() => setIsTonePickerOpen(!isTonePickerOpen)}>
                <View style={styles.settingLabelContainer}>
                  <IconBox size={44} icon={<View360 width={22} height={22} color={palette.deepSkyBlue} strokeWidth={2} />} backgroundColor={palette.deepSkyBlue + '20'} />
                  <View>
                    <Typography variant="subtitle">Tono de piel del modelo</Typography>
                    <View style={styles.previewContainer}>
                      <View style={[styles.colorPreviewBubble, { backgroundColor: skinTone }]} />
                      <Typography variant="label" color={colors.textSecondary}>{currentSkinLabel}</Typography>
                    </View>
                  </View>
                </View>
                <NavArrowRight width={24} height={24} color={colors.textSecondary} strokeWidth={2} style={{ transform: [{ rotate: isTonePickerOpen ? '90deg' : '0deg' }] }} />
              </Pressable>

              {isTonePickerOpen && (
                <View style={[styles.expandedSection, { backgroundColor: isDark ? '#2A2A2A' : '#F3F4F6' }]}>
                  {SKIN_TONES.map((tone) => (
                    <Pressable 
                      key={tone.color} 
                      style={[styles.colorOptionRow, skinTone === tone.color && { backgroundColor: isDark ? '#3A3A3A' : '#E5E7EB' }]}
                      onPress={() => handleSkinToneSelect(tone.color)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={[styles.colorPreviewBubbleLarge, { backgroundColor: tone.color }]} />
                        <Typography variant="subtitle">{tone.label}</Typography>
                      </View>
                      {skinTone === tone.color && <CheckCircle width={20} height={20} color={palette.deepSkyBlue} strokeWidth={2.5} />}
                    </Pressable>
                  ))}
                </View>
              )}

              <View style={styles.divider} />
              <Typography variant="label" color={colors.textSecondary} style={{ marginBottom: 16, marginTop: 8 }}>PREFERENCIAS</Typography>

              <View style={styles.settingRow}>
                <View style={styles.settingLabelContainer}>
                  <IconBox size={44} icon={<Bell width={22} height={22} color={palette.powderBlush} strokeWidth={2} />} backgroundColor={palette.powderBlush + '20'} />
                  <Typography variant="subtitle">Notificaciones</Typography>
                </View>
                <Switch value={notificationsEnabled} onValueChange={handleToggleNotifications} trackColor={{ false: isDark ? '#333' : '#E5E7EB', true: palette.powderBlush }} thumbColor={'#FFFFFF'} />
              </View>

              <Pressable style={styles.settingRow} onPress={() => setIsReminderPickerOpen(!isReminderPickerOpen)}>
                <View style={styles.settingLabelContainer}>
                  <IconBox size={44} icon={<Clock width={22} height={22} color={palette.powderBlush} strokeWidth={2} />} backgroundColor={palette.powderBlush + '20'} />
                  <View>
                    <Typography variant="subtitle">Recordatorio de práctica</Typography>
                    <Typography variant="label" color={colors.textSecondary}>{reminderTime || 'No configurado'}</Typography>
                  </View>
                </View>
                <NavArrowRight width={24} height={24} color={colors.textSecondary} strokeWidth={2} style={{ transform: [{ rotate: isReminderPickerOpen ? '90deg' : '0deg' }] }} />
              </Pressable>

              {isReminderPickerOpen && (
                <View style={[styles.expandedSection, { backgroundColor: isDark ? '#2A2A2A' : '#F3F4F6' }]}>
                  <View style={styles.chipsGrid}>
                    {REMINDER_TIMES.map((time) => {
                      const isActive = reminderTime === time;
                      return (
                        <Pressable 
                          key={time} 
                          style={[styles.timeChip, { backgroundColor: isActive ? palette.powderBlush : colors.surface, borderColor: isActive ? palette.powderBlush : colors.border }]}
                          onPress={() => handleReminderSelect(time)}
                        >
                          <Typography variant="subtitle" color={isActive ? '#FFFFFF' : colors.text}>{time}</Typography>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              <View style={styles.settingRow}>
                <View style={styles.settingLabelContainer}>
                  <IconBox size={44} icon={<SeaWaves width={22} height={22} color={palette.powderBlush} strokeWidth={2} />} backgroundColor={palette.powderBlush + '20'} />
                  <View>
                    <Typography variant="subtitle">Vibración</Typography>
                    <Typography variant="label" color={colors.textSecondary}>Al acertar una seña</Typography>
                  </View>
                </View>
                <Switch value={hapticEnabled} onValueChange={handleToggleHaptic} trackColor={{ false: isDark ? '#333' : '#E5E7EB', true: palette.powderBlush }} thumbColor={'#FFFFFF'} />
              </View>

              <View style={styles.divider} />
              <Typography variant="label" color={colors.textSecondary} style={{ marginBottom: 16, marginTop: 8 }}>SOPORTE</Typography>

              {/* CAMBIO: Enviar comentarios en lugar de Debug */}
              <Pressable style={styles.settingRow} onPress={handleSendFeedback}>
                <View style={styles.settingLabelContainer}>
                  <IconBox size={44} icon={<ChatBubble width={22} height={22} color={colors.textSecondary} strokeWidth={2} />} backgroundColor={colors.textSecondary + '20'} />
                  <Typography variant="subtitle">Enviar comentarios</Typography>
                </View>
                <NavArrowRight width={24} height={24} color={colors.textSecondary} strokeWidth={2} />
              </Pressable>

            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, zIndex: 10 },
  headerSpacer: { width: 48 },
  scrollContent: { paddingBottom: 100 },
  profileHeader: { alignItems: 'center', marginBottom: 36, paddingTop: 12 },
  avatarContainer: { position: 'relative' },
  editAvatarBtn: { position: 'absolute', top: 0, right: -4, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  statsContainer: { flexDirection: 'row', paddingHorizontal: 24, gap: 12, marginBottom: 40 },
  statCard: { flex: 1, alignItems: 'center', padding: 16 },
  sectionContainer: { paddingHorizontal: 24 },
  medalsList: { paddingHorizontal: 24, gap: 16, marginBottom: 40 },
  medalCard: { width: 130, padding: 20, alignItems: 'center' },
  chartCard: { padding: 24 },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 180, paddingTop: 20 },
  barWrapper: { alignItems: 'center', width: 32 },
  barBackground: { width: 14, height: 130, borderRadius: 7, justifyContent: 'flex-end', overflow: 'hidden', marginBottom: 12 },
  barFill: { width: '100%', borderRadius: 7 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'flex-end' },
  touchableBackground: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  modalContent: { borderTopLeftRadius: 36, borderTopRightRadius: 36, paddingHorizontal: 24, paddingBottom: 0, paddingTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10, maxHeight: '85%' },
  dragAreaWrapper: { backgroundColor: 'transparent', width: '100%', paddingBottom: 8 },
  modalDragHandle: { width: 40, height: 5, backgroundColor: 'rgba(150,150,150,0.3)', borderRadius: 3, alignSelf: 'center', marginBottom: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, marginBottom: 8 },
  settingLabelContainer: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  divider: { height: 1, backgroundColor: 'rgba(150,150,150,0.1)', marginVertical: 16 },
  previewContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  colorPreviewBubble: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  expandedSection: { borderRadius: 20, padding: 16, marginBottom: 16, marginTop: -4 },
  colorOptionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 4 },
  colorPreviewBubbleLarge: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  chipsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  timeChip: { flex: 1, minWidth: '45%', alignItems: 'center', paddingVertical: 14, borderRadius: 16, borderWidth: 1 },
});