import { Avatar } from '@/components/common/Avatar';
import { Card } from '@/components/common/Card';
import { IconBox } from '@/components/common/IconBox';
import { IconButton } from '@/components/common/IconButton';
import { SectionHeader } from '@/components/common/SectionHeader';
import { Typography } from '@/components/common/Typography';
import { useTheme } from '@/hooks/useTheme';
import { router } from 'expo-router';
import { Calendar, Code, FireFlame, HalfMoon, Handbag, Medal, NavArrowRight, Settings, Star, SunLight, User, Xmark } from 'iconoir-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
const palette = (colors as any).palette;
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

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
    }
  }, [isSettingsVisible]);

  const handleOpenDebug = () => {
    setIsSettingsVisible(false);
    setTimeout(() => router.push('../debug'), 150);
  };

  const weeklyData = [
    { day: 'L', value: 40 }, { day: 'M', value: 65 }, { day: 'X', value: 30 },
    { day: 'J', value: 85 }, { day: 'V', value: 50 }, { day: 'S', value: 20 }, { day: 'D', value: 10 }
  ];

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
          <Avatar 
            icon={<User width={48} height={48} color={palette.deepSkyBlue} strokeWidth={1.5} />}
            size={100}
            backgroundColor={palette.deepSkyBlue + '20'}
            badgeText="Lvl 5"
            badgeColor={palette.powderBlush}
            style={{ marginBottom: 16 }}
          />
          <Typography variant="h1" style={{ marginBottom: 4 }}>Jorge</Typography>
          <Typography variant="subtitle" color={colors.textSecondary}>Estudiante Principiante</Typography>
        </View>

        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <IconBox icon={<FireFlame width={28} height={28} color={palette.powderBlush} strokeWidth={2} />} backgroundColor={palette.powderBlush + '20'} style={{ marginBottom: 12 }} />
            <Typography variant="h2" style={{ marginBottom: 4 }}>12</Typography>
            <Typography variant="label" color={colors.textSecondary}>RACHA</Typography>
          </Card>
          <Card style={styles.statCard}>
            <IconBox icon={<Handbag width={28} height={28} color={palette.deepSkyBlue} strokeWidth={2} />} backgroundColor={palette.deepSkyBlue + '20'} style={{ marginBottom: 12 }} />
            <Typography variant="h2" style={{ marginBottom: 4 }}>85</Typography>
            <Typography variant="label" color={colors.textSecondary}>SEÑAS</Typography>
          </Card>
          <Card style={styles.statCard}>
            <IconBox icon={<Star width={28} height={28} color={isDark ? '#FACC15' : '#CA8A04'} strokeWidth={2} />} backgroundColor={'#FACC15' + '20'} style={{ marginBottom: 12 }} />
            <Typography variant="h2" style={{ marginBottom: 4 }}>450</Typography>
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
            <View style={styles.modalDragHandle} />
            <View style={styles.modalHeader}>
              <Typography variant="h2">Configuración</Typography>
              <IconButton icon={<Xmark width={20} height={20} color={colors.text} strokeWidth={2} />} size={36} onPress={() => setIsSettingsVisible(false)} />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLabelContainer}>
                <IconBox size={44} icon={isDark ? <HalfMoon width={22} height={22} color={palette.deepSkyBlue} strokeWidth={2} /> : <SunLight width={22} height={22} color={palette.deepSkyBlue} strokeWidth={2} />} backgroundColor={palette.deepSkyBlue + '20'} />
                <Typography variant="subtitle">Modo Oscuro</Typography>
              </View>
              <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false: isDark ? '#333' : '#E5E7EB', true: palette.powderBlush }} thumbColor={'#FFFFFF'} />
            </View>
            <Pressable style={styles.settingRow} onPress={handleOpenDebug}>
              <View style={styles.settingLabelContainer}>
                <IconBox size={44} icon={<Code width={22} height={22} color={colors.textSecondary} strokeWidth={2} />} backgroundColor={colors.textSecondary + '20'} />
                <Typography variant="subtitle">Herramientas de Desarrollo</Typography>
              </View>
              <NavArrowRight width={24} height={24} color={colors.textSecondary} strokeWidth={2} />
            </Pressable>
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
  modalContent: { borderTopLeftRadius: 36, borderTopRightRadius: 36, paddingHorizontal: 24, paddingBottom: 48, paddingTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  modalDragHandle: { width: 40, height: 5, backgroundColor: 'rgba(150,150,150,0.3)', borderRadius: 3, alignSelf: 'center', marginBottom: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, marginBottom: 8 },
  settingLabelContainer: { flexDirection: 'row', alignItems: 'center', gap: 16 },
});