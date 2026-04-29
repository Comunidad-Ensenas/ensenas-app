import { Avatar } from '@/components/common/Avatar';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { IconBox } from '@/components/common/IconBox';
import { SectionHeader } from '@/components/common/SectionHeader';
import { Typography } from '@/components/common/Typography';
import { useTheme } from '@/hooks/useTheme';
import { useUserData } from '@/hooks/useUserData';
import { FireFlame, Group, Medal, Star, User } from 'iconoir-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const { userData, isLoading } = useUserData();
  const pulseAnim = useRef(new Animated.Value(0.5)).current;
  const palette = (colors as any).palette;

  useEffect(() => {
    if (isLoading || !userData) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.5, duration: 1000, useNativeDriver: true })
      ])).start();
    }
  }, [isLoading, userData]);

  if (isLoading || !userData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.scrollContent}>
          <View style={styles.header}>
            <View>
              <Animated.View style={[styles.skeletonTextSmall, { backgroundColor: colors.border, opacity: pulseAnim }]} />
              <Animated.View style={[styles.skeletonTextLarge, { backgroundColor: colors.border, opacity: pulseAnim }]} />
            </View>
            <Animated.View style={[styles.skeletonAvatar, { backgroundColor: colors.border, opacity: pulseAnim }]} />
          </View>
          <Animated.View style={[styles.skeletonMainCard, { backgroundColor: colors.surface, opacity: pulseAnim }]} />
        </View>
      </SafeAreaView>
    );
  }

  const progressPercentage = Math.min((userData.currentMinutesToday / userData.dailyGoalMinutes) * 100, 100);
  const cardTextColorDark = isDark ? '#111418' : '#FFFFFF';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <View>
            <Typography variant="label" color={colors.textSecondary} style={{ marginBottom: 4 }}>Vamos a aprender</Typography>
            <Typography variant="h1">{userData.firstName}</Typography>
          </View>
          <Avatar 
            icon={<User width={26} height={26} color={colors.primary} strokeWidth={2.2} />} 
            backgroundColor={colors.primary + '25'} 
            size={56} 
          />
        </View>

        <Card variant="contrast" style={styles.mainCard}>
          <View style={[StyleSheet.absoluteFill, styles.cardInnerWrapper]}>
             <View style={[styles.decorativeCircle, { backgroundColor: 'rgba(255,255,255,0.03)', right: -40, top: -20 }]} />
             <View style={[styles.decorativeCircle, { backgroundColor: 'rgba(255,255,255,0.02)', left: 80, bottom: -60 }]} />
          </View>
          <View style={styles.mainCardTextContent}>
            <Typography variant="h3" color="#FFFFFF" style={{ marginBottom: 18 }}>Genial, tu meta de hoy está casi lista</Typography>
            <Button title="Continuar" color={colors.primary} textColor={(colors as any).primaryText} style={{ alignSelf: 'flex-start' }} />
          </View>
          <View style={styles.progressRingContainer}>
            <View style={[styles.progressRingBg, { borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.12)' }]} />
            <View style={[styles.progressRingFill, { borderColor: colors.primary }]} />
            <Typography variant="h3" color="#FFFFFF">{Math.round(progressPercentage)}%</Typography>
          </View>
        </Card>

        <SectionHeader 
          title={<Typography variant="h2">Tu plan de <Typography variant="h2" color={palette.deepSkyBlue}>hoy</Typography></Typography>} 
        />
        
        <View style={styles.masonryContainer}>
          <View style={styles.masonryColumn}>
            <Pressable>
              <Card style={[styles.cardShort, { padding: 20 }]}>
                <View style={styles.cardHeader}>
                   <Typography variant="h3">Repaso</Typography>
                   <Medal width={28} height={28} color={palette.deepSkyBlue} strokeWidth={2} />
                </View>
                <View style={styles.spacer} />
                <Badge text={`${userData.xpEarnedToday} XP hoy`} backgroundColor={palette.deepSkyBlue + '15'} textColor={isDark ? palette.deepSkyBlue : '#0284C7'} />
              </Card>
            </Pressable>

            <Pressable>
              <Card backgroundColor={palette.powderBlush} style={[styles.cardTall, styles.centeredCard]}>
                <View style={[StyleSheet.absoluteFill, styles.cardInnerWrapper]}>
                  <FireFlame width={160} height={160} color={cardTextColorDark} strokeWidth={0.5} style={styles.watermarkIcon} />
                </View>
                <IconBox size={64} icon={<FireFlame width={40} height={40} color={cardTextColorDark} strokeWidth={1.7} />} backgroundColor="rgba(255,255,255,0.2)" style={{ marginBottom: 16 }} />
                <Typography variant="h3" color={cardTextColorDark} style={{ marginBottom: 16 }}>Desafío</Typography>
                <Badge text={`Racha: ${userData.streakDays} días`} backgroundColor="rgba(255,255,255,0.3)" textColor={cardTextColorDark} icon={<Star width={14} height={14} color={cardTextColorDark} strokeWidth={2} />} />
              </Card>
            </Pressable>
          </View>

          <View style={styles.masonryColumn}>
            <Pressable>
              <Card backgroundColor={palette.deepSkyBlue} style={[styles.cardTall, styles.centeredCard]}>
                <View style={[StyleSheet.absoluteFill, styles.cardInnerWrapper]}>
                   <Group width={170} height={170} color="#FFFFFF" strokeWidth={0.5} style={styles.watermarkIcon} />
                </View>
                <IconBox size={64} icon={<Group width={40} height={40} color="#FFFFFF" strokeWidth={1.5} />} backgroundColor="rgba(255,255,255,0.2)" style={{ marginBottom: 16 }} />
                <Typography variant="h3" color="#FFFFFF" style={{ marginBottom: 16 }}>Aprender</Typography>
                <Badge text="Cat: Familia" backgroundColor="rgba(255,255,255,0.3)" textColor="#FFFFFF" />
              </Card>
            </Pressable>

            <Pressable>
              <Card variant="contrast" style={[styles.cardShort, styles.centeredCard]}>
                <View style={[StyleSheet.absoluteFill, styles.cardInnerWrapper]}>
                   <View style={[styles.decorativeCircle, { backgroundColor: 'rgba(255,255,255,0.03)', left: -20, bottom: -20, width: 100, height: 100 }]} />
                </View>
                <Typography variant="h3" color="#FFFFFF" style={{ marginBottom: 12 }}>Ver más</Typography>
                <Badge text="+5 módulos" backgroundColor="rgba(255,255,255,0.1)" textColor="#FFFFFF" />
              </Card>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 90 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  mainCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36, position: 'relative' },
  cardInnerWrapper: { borderRadius: 32, overflow: 'hidden' },
  decorativeCircle: { position: 'absolute', width: 140, height: 140, borderRadius: 70 },
  mainCardTextContent: { flex: 1, paddingRight: 20, zIndex: 2 },
  progressRingContainer: { width: 84, height: 84, justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  progressRingBg: { position: 'absolute', width: 84, height: 84, borderRadius: 42, borderWidth: 8 },
  progressRingFill: { position: 'absolute', width: 84, height: 84, borderRadius: 42, borderWidth: 8, borderLeftColor: 'transparent', borderBottomColor: 'transparent', transform: [{ rotate: '45deg' }] },
  masonryContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  masonryColumn: { flex: 1, gap: 16 },
  cardShort: { height: 150 },
  cardTall: { height: 230 },
  centeredCard: { justifyContent: 'center', alignItems: 'center' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  spacer: { flex: 1 },
  watermarkIcon: { position: 'absolute', bottom: -30, right: -30, opacity: 0.1 },
  skeletonTextSmall: { width: 130, height: 18, borderRadius: 9, marginBottom: 8 },
  skeletonTextLarge: { width: 190, height: 32, borderRadius: 16 },
  skeletonAvatar: { width: 56, height: 56, borderRadius: 28 },
  skeletonMainCard: { width: '100%', height: 180, borderRadius: 32, marginBottom: 36 },
});