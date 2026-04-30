import { Avatar } from '@/components/common/Avatar';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { IconBox } from '@/components/common/IconBox';
import { IconButton } from '@/components/common/IconButton';
import { SectionHeader } from '@/components/common/SectionHeader';
import { Typography } from '@/components/common/Typography';
import { useTheme } from '@/hooks/useTheme';
import { useUserData } from '@/hooks/useUserData';
import { router } from 'expo-router';
import { BookStack, Brain, ChatBubble, Crown, EmojiSatisfied, Group, Heart, NavArrowRight, PeaceHand, Play, User, Xmark } from 'iconoir-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { id: 1, name: 'Básicos', icon: BookStack, color: '#10B981' },
  { id: 2, name: 'Saludos', icon: ChatBubble, color: '#4CB5FF' },
  { id: 3, name: 'Motivación', icon: Brain, color: '#6B7280' },
  { id: 4, name: 'Familia', icon: Group, color: '#FF9B93' },
  { id: 5, name: 'Inspiración', icon: EmojiSatisfied, color: '#14B8A6' },
  { id: 6, name: 'Propósito', icon: Crown, color: '#F59E0B' },
  { id: 7, name: 'Mente', icon: Heart, color: '#B84A6E' },
  { id: 8, name: 'Rendimiento', icon: NavArrowRight, color: '#8B5CF6' },
];

const MOCK_SIGNS = [
  { id: 1, title: 'Hola', description: 'Saludo inicial común' },
  { id: 2, title: 'Gracias', description: 'Expresión de gratitud' },
  { id: 3, title: 'Por favor', description: 'Cortesía básica' },
];

export default function PracticeScreen() {
  const { colors, isDark } = useTheme();
  const { userData, isLoading } = useUserData();
  const pulseAnim = useRef(new Animated.Value(0.5)).current;
  const [selectedCategory, setSelectedCategory] = useState<typeof CATEGORIES[0] | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const palette = (colors as any).palette;

  useEffect(() => {
    if (isLoading || !userData) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.5, duration: 1000, useNativeDriver: true })
      ])).start();
    }
  }, [isLoading, userData]);

  const openCategoryModal = (category: typeof CATEGORIES[0]) => {
    setSelectedCategory(category);
    setIsModalVisible(true);
  };

  if (isLoading || !userData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.scrollContent}>
          <View style={styles.header}>
            <View>
              {/* Skeletons unificados con el inicio */}
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
        
        {/* Cabecera unificada visualmente con HomeScreen */}
        <View style={styles.header}>
          <View>
            <Typography variant="label" color={colors.textSecondary} style={{ marginBottom: 4 }}>Tu plan de estudio</Typography>
            <Typography variant="h1">Práctica</Typography>
          </View>
          <Avatar
            icon={<User width={26} height={26} color={palette.powderBlush} strokeWidth={2.2} />}
            backgroundColor={palette.powderBlush + '25'}
            size={56} // <- Agregado para que mida exactamente lo mismo que en el inicio
            onPress={() => router.push('/profile')}
          />
        </View>

        <Card variant="contrast" style={{ marginBottom: 36 }}>
          <Typography variant="h3" color="#FFFFFF" style={{ marginBottom: 20 }}>Hola {userData.firstName}, ¿listo para aprender?</Typography>
          <View style={styles.progressSection}>
            <Typography variant="label" color="rgba(255,255,255,0.7)" style={{ marginBottom: 8 }}>Progreso diario</Typography>
            <View style={[styles.progressBarBg, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
              <View style={[styles.progressBarFill, { width: `${progressPercentage}%`, backgroundColor: palette.powderBlush }]} />
            </View>
          </View>
          <View style={styles.heroActions}>
            <Button title="Continuar" variant="primary" color={palette.powderBlush} textColor={cardTextColorDark} style={{ flex: 1 }} />
            <Button title="Ver Plan" variant="secondary" color="rgba(255,255,255,0.1)" textColor="#FFFFFF" />
          </View>
        </Card>

        <SectionHeader title="Categorías" />
        <View style={styles.categoriesGrid}>
          {CATEGORIES.map((cat) => (
            <Pressable key={cat.id} style={[styles.categoryItem, { backgroundColor: cat.color + (isDark ? '90' : '70') }]} onPress={() => openCategoryModal(cat)}>
              <cat.icon width={30} height={30} color={colors.text} strokeWidth={1.6} />
              <Typography variant="label" align="center" numberOfLines={1} style={{ fontWeight: '500' }}>{cat.name}</Typography>
            </Pressable>
          ))}
        </View>

        <SectionHeader title="Prácticas Diarias" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent} snapToInterval={width * 0.75 + 16} decelerationRate="fast">
          <Card backgroundColor="#F59E0B" style={styles.doseCard}>
            <View style={styles.doseHeader}>
              <Typography variant="label" color={cardTextColorDark}>Repaso</Typography>
              <Badge text="5 min" backgroundColor="rgba(255,255,255,0.25)" textColor={cardTextColorDark} />
            </View>
            <Typography variant="h2" color={cardTextColorDark}>Construir Confianza</Typography>
            <View style={styles.spacer} />
            <Button title="Iniciar" color="rgba(255,255,255,0.25)" textColor={cardTextColorDark} icon={<Play width={20} height={20} color={cardTextColorDark} strokeWidth={2} />} />
          </Card>
          <Card backgroundColor={palette.powderBlush} style={styles.doseCard}>
            <View style={styles.doseHeader}>
              <Typography variant="label" color={cardTextColorDark}>Módulo Nuevo</Typography>
              <Badge text="10 min" backgroundColor="rgba(255,255,255,0.25)" textColor={cardTextColorDark} />
            </View>
            <Typography variant="h2" color={cardTextColorDark}>Aprender Emociones</Typography>
            <View style={styles.spacer} />
            <Button title="Iniciar" color="rgba(255,255,255,0.25)" textColor={cardTextColorDark} icon={<Play width={20} height={20} color={cardTextColorDark} strokeWidth={2} />} />
          </Card>
        </ScrollView>
      </ScrollView>

      <Modal animationType="fade" transparent={true} visible={isModalVisible} onRequestClose={() => setIsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsModalVisible(false)} />
          <Card style={styles.modalContent}>
            {selectedCategory && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderTitleRow}>
                    <IconBox size={44} icon={<selectedCategory.icon width={24} height={24} color={isDark ? selectedCategory.color : colors.text} strokeWidth={2} />} backgroundColor={selectedCategory.color + '25'} />
                    <Typography variant="h2">{selectedCategory.name}</Typography>
                  </View>
                  <IconButton size={36} icon={<Xmark width={22} height={22} color={colors.text} strokeWidth={2} />} backgroundColor={colors.background} onPress={() => setIsModalVisible(false)} />
                </View>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
                  {MOCK_SIGNS.map((sign) => (
                    <View key={sign.id} style={[styles.signListItem, { backgroundColor: colors.background }]}>
                      <IconBox size={40} icon={<PeaceHand width={20} height={20} color={colors.textSecondary} strokeWidth={1.8} />} backgroundColor={colors.surface} style={{ marginRight: 12 }} />
                      <View style={styles.signListInfo}>
                        <Typography variant="body" style={{ fontWeight: '800', marginBottom: 2 }}>{sign.title}</Typography>
                        <Typography variant="label" color={colors.textSecondary} numberOfLines={1}>{sign.description}</Typography>
                      </View>
                    </View>
                  ))}
                </ScrollView>
                <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
                  <Button title="Practicar" color={selectedCategory.color} textColor="#FFFFFF" icon={<Play width={22} height={22} color="#FFFFFF" strokeWidth={2.5} />} onPress={() => setIsModalVisible(false)} />
                </View>
              </>
            )}
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  progressSection: { marginBottom: 24 },
  progressBarBg: { height: 8, borderRadius: 4, width: '100%' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  heroActions: { flexDirection: 'row', gap: 12 },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 36, rowGap: 14 },
  categoryItem: { width: '23%', height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, gap: 6 },
  horizontalScrollContent: {
    gap: 16,
    paddingRight: 24,
    paddingBottom: 32,
    paddingTop: 8,
  },
  doseCard: { width: width * 0.75, height: 180, padding: 24 },
  doseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  spacer: { flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.45)', justifyContent: 'center', alignItems: 'center' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalContent: { width: '88%', maxHeight: '75%', padding: 0 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 20 },
  modalHeaderTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalScrollContent: { paddingHorizontal: 24, paddingBottom: 24, gap: 12 },
  signListItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 20 },
  signListInfo: { flex: 1 },
  modalFooter: { padding: 24, paddingTop: 16 },
  
  // Skeletons unificados con HomeScreen
  skeletonTextSmall: { width: 130, height: 18, borderRadius: 9, marginBottom: 8 },
  skeletonTextLarge: { width: 190, height: 32, borderRadius: 16 },
  skeletonAvatar: { width: 56, height: 56, borderRadius: 28 },
  
  skeletonMainCard: { width: '100%', height: 210, borderRadius: 32, marginBottom: 36 },
});