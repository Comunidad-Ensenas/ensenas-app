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
import * as Icons from 'iconoir-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const IconMap: Record<string, any> = {
  BookStack: Icons.BookStack,
  ChatBubble: Icons.ChatBubble,
  Brain: Icons.Brain,
  Group: Icons.Group,
  EmojiSatisfied: Icons.EmojiSatisfied,
  Crown: Icons.Crown,
  Heart: Icons.Heart,
  NavArrowRight: Icons.NavArrowRight,
};

const MOCK_CATEGORIES = [
  { id: 1, name: 'Básicos', iconName: 'BookStack', colorHex: '#10B981' },
  { id: 2, name: 'Saludos', iconName: 'ChatBubble', colorHex: '#4CB5FF' },
  { id: 3, name: 'Motivación', iconName: 'Brain', colorHex: '#6B7280' },
  { id: 4, name: 'Familia', iconName: 'Group', colorHex: '#FF9B93' },
  { id: 5, name: 'Inspiración', iconName: 'EmojiSatisfied', colorHex: '#14B8A6' },
  { id: 6, name: 'Propósito', iconName: 'Crown', colorHex: '#F59E0B' },
  { id: 7, name: 'Mente', iconName: 'Heart', colorHex: '#B84A6E' },
  { id: 8, name: 'Rendimiento', iconName: 'NavArrowRight', colorHex: '#8B5CF6' },
];

const MOCK_MODULES = [
  { id: 1, title: 'Construir Confianza', difficultyLevel: 1 },
  { id: 2, title: 'Aprender Emociones', difficultyLevel: 2 },
  { id: 3, title: 'Presentaciones', difficultyLevel: 1 },
];

const MOCK_SIGNS = [
  { id: 1, categoryId: 1, title: 'Hola', description: 'Saludo inicial común' },
  { id: 2, categoryId: 1, title: 'Gracias', description: 'Expresión de gratitud' },
  { id: 3, categoryId: 2, title: 'Buenos días', description: 'Saludo matutino' },
  { id: 4, categoryId: 2, title: 'Por favor', description: 'Cortesía básica' },
];

export default function PracticeScreen() {
  const { colors, isDark } = useTheme();
  const { userData, isLoading: isUserLoading } = useUserData();
  const pulseAnim = useRef(new Animated.Value(0.5)).current;

  const [categories, setCategories] = useState<any[]>([]);
  const [activeModules, setActiveModules] = useState<any[]>([]);
  const [categorySigns, setCategorySigns] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const palette = (colors as any).palette;

  useEffect(() => {
    if (isUserLoading || isLoadingData) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.5, duration: 1000, useNativeDriver: true })
      ])).start();
    }
  }, [isUserLoading, isLoadingData]);

  useEffect(() => {
    const fetchData = async () => {
      if (!userData) return;
      setIsLoadingData(true);
      try {
        const fetchedCategories = await new Promise<any[]>((resolve) =>
          setTimeout(() => resolve(MOCK_CATEGORIES), 400)
        );

        setCategories(fetchedCategories);

        const fetchedModules = await new Promise<any[]>((resolve) =>
          setTimeout(() => resolve(MOCK_MODULES), 400)
        );

        setActiveModules(fetchedModules);

      } catch (error) {
        console.error(error);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [userData]);

  const openCategoryModal = async (category: any) => {
    setSelectedCategory(category);
    setIsModalVisible(true);

    try {
      const signsList = await new Promise<any[]>((resolve) =>
        setTimeout(() => {
          const filtered = MOCK_SIGNS.filter(sign => sign.categoryId === category.id);
          resolve(filtered);
        }, 200)
      );
      setCategorySigns(signsList);
    } catch (error) {
      console.error(error);
      setCategorySigns([]);
    }
  };

  const isScreenLoading = isUserLoading || !userData || isLoadingData;

  if (isScreenLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <View>
            <Animated.View style={[styles.skeletonTextSmall, { backgroundColor: colors.border, opacity: pulseAnim }]} />
            <Animated.View style={[styles.skeletonTextLarge, { backgroundColor: colors.border, opacity: pulseAnim }]} />
          </View>
          <Animated.View style={[styles.skeletonAvatar, { backgroundColor: colors.border, opacity: pulseAnim }]} />
        </View>
        <View style={styles.scrollContent}>
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

      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View>
          <Typography variant="label" color={colors.textSecondary} style={{ marginBottom: 4 }}>Hola de nuevo</Typography>
          <Typography variant="h1">{userData.firstName}</Typography>
        </View>
        <Avatar
          icon={<Icons.User width={26} height={26} color={palette.powderBlush} strokeWidth={2.2} />}
          backgroundColor={palette.powderBlush + '25'}
          size={56}
          onPress={() => router.push('/profile')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

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
          {categories.length > 0 ? (
            categories.map((cat) => {
              const IconComponent = IconMap[cat.iconName] || Icons.BookStack;
              const color = cat.colorHex || '#10B981';
              return (
                <Pressable key={cat.id} style={[styles.categoryItem, { backgroundColor: color + (isDark ? '90' : '70') }]} onPress={() => openCategoryModal({ ...cat, color, IconComponent })}>
                  <IconComponent width={30} height={30} color={colors.text} strokeWidth={1.6} />
                  <Typography variant="label" align="center" numberOfLines={1} style={{ fontWeight: '500' }}>{cat.name}</Typography>
                </Pressable>
              );
            })
          ) : (
            <Typography variant="body" color={colors.textSecondary} style={{ width: '100%', textAlign: 'center', marginVertical: 20 }}>
              No hay categorías
            </Typography>
          )}
        </View>

        <SectionHeader title="Prácticas Recomendadas" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent} snapToInterval={width * 0.75 + 16} decelerationRate="fast">
          {activeModules.length > 0 ? (
            activeModules.map((module, index) => {
              const cardColor = index % 2 === 0 ? palette.powderBlush : '#F59E0B';
              return (
                <Card key={module.id} backgroundColor={cardColor} style={styles.doseCard}>
                  <View style={styles.doseHeader}>
                    <Typography variant="label" color={cardTextColorDark}>Nivel {module.difficultyLevel}</Typography>
                    <Badge text="10 min" backgroundColor="rgba(255,255,255,0.25)" textColor={cardTextColorDark} />
                  </View>
                  <Typography variant="h2" color={cardTextColorDark}>{module.title}</Typography>
                  <View style={styles.spacer} />
                  <Button
                    title="Iniciar Módulo"
                    color="rgba(255,255,255,0.25)"
                    textColor={cardTextColorDark}
                    icon={<Icons.Play width={20} height={20} color={cardTextColorDark} strokeWidth={2} />}
                  />
                </Card>
              )
            })
          ) : (
            <Typography variant="body" color={colors.textSecondary} style={{ marginLeft: 24 }}>
              Cargando módulos...
            </Typography>
          )}
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
                    <IconBox size={44} icon={<selectedCategory.IconComponent width={24} height={24} color={isDark ? selectedCategory.color : colors.text} strokeWidth={2} />} backgroundColor={selectedCategory.color + '25'} />
                    <Typography variant="h2">{selectedCategory.name}</Typography>
                  </View>
                  <IconButton size={36} icon={<Icons.Xmark width={22} height={22} color={colors.text} strokeWidth={2} />} backgroundColor={colors.background} onPress={() => setIsModalVisible(false)} />
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
                  {categorySigns.length > 0 ? (
                    categorySigns.map((sign) => (
                      <View key={sign.id} style={[styles.signListItem, { backgroundColor: colors.background }]}>
                        <IconBox size={40} icon={<Icons.PeaceHand width={20} height={20} color={colors.textSecondary} strokeWidth={1.8} />} backgroundColor={colors.surface} style={{ marginRight: 12 }} />
                        <View style={styles.signListInfo}>
                          <Typography variant="body" style={{ fontWeight: '800', marginBottom: 2 }}>{sign.title}</Typography>
                          <Typography variant="label" color={colors.textSecondary} numberOfLines={1}>{sign.description || "Sin descripción"}</Typography>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Typography variant="body" color={colors.textSecondary} style={{ textAlign: 'center', marginVertical: 20 }}>
                      No hay señas
                    </Typography>
                  )}
                </ScrollView>

                <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
                  <Button
                    title="Practicar Categoría"
                    color={selectedCategory.color}
                    textColor="#FFFFFF"
                    icon={<Icons.Play width={22} height={22} color="#FFFFFF" strokeWidth={2.5} />}
                    disabled={categorySigns.length === 0}
                    onPress={() => setIsModalVisible(false)}
                  />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    zIndex: 10
  },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 60, paddingTop: 8 },
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
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  modalContent: { width: '88%', maxHeight: '75%', padding: 0 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 20 },
  modalHeaderTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalScrollContent: { paddingHorizontal: 24, paddingBottom: 24, gap: 12 },
  signListItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 20 },
  signListInfo: { flex: 1 },
  modalFooter: { padding: 24, paddingTop: 16 },

  skeletonTextSmall: { width: 130, height: 18, borderRadius: 9, marginBottom: 8 },
  skeletonTextLarge: { width: 190, height: 32, borderRadius: 16 },
  skeletonAvatar: { width: 56, height: 56, borderRadius: 28 },

  skeletonMainCard: { width: '100%', height: 210, borderRadius: 32, marginBottom: 36 },
});