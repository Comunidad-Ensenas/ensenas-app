import { IconBox } from '@/components/common/IconBox';
import { IconButton } from '@/components/common/IconButton';
import { Typography } from '@/components/common/Typography';
import { useTheme } from '@/hooks/useTheme';
import { confirmDelete } from '@/lib/studioDelete';
import { StudioItemType, useStudioStore } from '@/store/useStudioStore';
import { router } from 'expo-router';
import { BookStack, ChatBubble, DragHandGesture, NavArrowLeft, NavArrowRight, Trash, VideoCamera } from 'iconoir-react-native';
import React, { ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TAB_TITLES = {
  configs: 'Configuraciones',
  signs: 'Señas',
  phrases: 'Frases',
  modules: 'Módulos',
} as const;

type TabKey = keyof typeof TAB_TITLES;

const TAB_TYPES: Record<TabKey, StudioItemType> = {
  configs: 'config',
  signs: 'sign',
  phrases: 'phrase',
  modules: 'module',
};

export default function StudioExplorerScreen() {
  const { colors } = useTheme();
  const palette = (colors as any).palette;
  const { configs, signs, phrases, modules } = useStudioStore();
  const [activeTab, setActiveTab] = useState<TabKey>('configs');

  const openDetails = (type: StudioItemType, id: string) => {
    router.push({ pathname: '/detail', params: { type, id } } as any);
  };

  const renderRow = (
    item: any,
    index: number,
    icon: ReactNode,
    tint: string,
    title: string,
    subtitle: string
  ) => {
    const type = TAB_TYPES[activeTab];

    return (
      <View key={item.local_id} style={[styles.row, { backgroundColor: colors.surface }]}>
        <Pressable
          style={styles.rowMain}
          onPress={() => openDetails(type, item.local_id)}
          accessibilityRole="button"
          accessibilityLabel={`Ver ${title}`}
        >
          <Typography variant="label" color={colors.textSecondary} style={styles.rowIndex}>#{index + 1}</Typography>
          <IconBox size={44} icon={icon} backgroundColor={`${tint}20`} style={styles.rowIcon} />
          <View style={styles.rowText}>
            <Typography variant="body" style={{ fontWeight: '800' }} numberOfLines={1}>{title}</Typography>
            <Typography variant="label" color={colors.textSecondary} numberOfLines={1}>{subtitle}</Typography>
          </View>
          <NavArrowRight width={24} height={24} color={colors.icon} />
        </Pressable>
        <IconButton
          icon={<Trash width={20} height={20} color={colors.danger} />}
          backgroundColor={colors.dangerBg}
          onPress={() => confirmDelete(type, item.local_id)}
          style={styles.rowDelete}
          accessibilityRole="button"
          accessibilityLabel={`Borrar ${title}`}
        />
      </View>
    );
  };

  const renderList = () => {
    switch (activeTab) {
      case 'configs':
        return configs.map((item, index) => renderRow(
          item, index,
          <DragHandGesture width={24} height={24} color={palette.deepSkyBlue} />,
          palette.deepSkyBlue,
          item.name,
          'Configuración manual'
        ));
      case 'signs':
        return signs.map((item, index) => renderRow(
          item, index,
          <VideoCamera width={24} height={24} color={colors.success} />,
          colors.success,
          item.meanings?.[0] || 'Sin Nombre',
          `${item.meanings?.length || 0} significado(s)`
        ));
      case 'phrases':
        return phrases.map((item, index) => renderRow(
          item, index,
          <ChatBubble width={24} height={24} color={palette.powderBlush} />,
          palette.powderBlush,
          item.spanish_translation,
          `${item.signs_list?.length || 0} señas en secuencia`
        ));
      case 'modules':
        return modules.map((item, index) => renderRow(
          item, index,
          <BookStack width={24} height={24} color={palette.berryCrush} />,
          palette.berryCrush,
          item.title,
          `Nivel ${item.difficulty_level} • ${item.items_list?.length || 0} elementos`
        ));
    }
  };

  const list = renderList();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton
          size={40}
          icon={<NavArrowLeft width={22} height={22} color={colors.text} strokeWidth={2} />}
          backgroundColor={colors.surface}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        />
        <Typography variant="h3" style={styles.headerTitle}>Explorador Local</Typography>
      </View>

      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        {(Object.keys(TAB_TITLES) as TabKey[]).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <Pressable
              key={tab}
              style={[styles.tab, isActive && { borderBottomColor: palette.deepSkyBlue }]}
              onPress={() => setActiveTab(tab)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Typography
                variant="label"
                color={isActive ? palette.deepSkyBlue : colors.textSecondary}
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{ fontWeight: isActive ? '800' : '500', width: '100%', textAlign: 'center' }}
              >
                {TAB_TITLES[tab]}
              </Typography>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {list.length > 0 ? list : (
          <View style={styles.emptyState}>
            <Typography variant="body" color={colors.textSecondary}>No hay datos en esta categoría.</Typography>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingVertical: 12 },
  headerTitle: { flex: 1 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 16, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  content: { padding: 24, gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 24, padding: 8 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  rowIndex: { width: 24, marginLeft: 8 },
  rowIcon: { marginHorizontal: 12 },
  rowText: { flex: 1, gap: 2 },
  rowDelete: { marginLeft: 8, marginRight: 8 },
  emptyState: { paddingVertical: 60, alignItems: 'center' },
});
