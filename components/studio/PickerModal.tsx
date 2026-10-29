import { Typography } from '@/components/common/Typography';
import { useTheme } from '@/hooks/useTheme';
import { Plus, Search } from 'iconoir-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SheetModal } from './SheetModal';

export interface PickerItem {
  id: string;
  label: string;
  secondary?: string;
  isLocal?: boolean;
}

export interface PickerTab {
  key: string;
  label: string;
}

interface PickerModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  items: PickerItem[];
  onSelect: (item: PickerItem) => void;
  searchPlaceholder?: string;
  emptyText?: string;
  tabs?: PickerTab[];
  activeTab?: string;
  onTabChange?: (key: string) => void;
  /** Extra first row, e.g. "Ninguna (Quitar)". */
  clearAction?: { label: string; onPress: () => void };
  heightRatio?: number;
}

export function PickerModal({
  visible,
  onClose,
  title,
  items,
  onSelect,
  searchPlaceholder = 'Buscar...',
  emptyText = 'No se encontraron resultados.',
  tabs,
  activeTab,
  onTabChange,
  clearAction,
  heightRatio = 0.8,
}: PickerModalProps) {
  const { colors } = useTheme();
  const palette = (colors as any).palette;
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (visible) setSearchQuery('');
  }, [visible, activeTab]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return items;
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(query) || item.secondary?.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  const toolbar = (
    <View style={[styles.toolbar, { borderBottomColor: colors.border }]}>
      {tabs?.length ? (
        <View style={styles.tabs}>
          {tabs.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <Pressable
                key={tab.key}
                style={[styles.tab, isActive && { borderBottomColor: palette.deepSkyBlue }]}
                onPress={() => onTabChange?.(tab.key)}
              >
                <Typography
                  variant="label"
                  color={isActive ? palette.deepSkyBlue : colors.textSecondary}
                  style={{ fontWeight: isActive ? '800' : '600' }}
                >
                  {tab.label}
                </Typography>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={[styles.searchBar, { backgroundColor: colors.input }]}>
        <Search width={20} height={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={searchPlaceholder}
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>
    </View>
  );

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title={title}
      toolbar={toolbar}
      heightRatio={heightRatio}
      animationType="slide"
    >
      <View>
        {clearAction ? (
          <Pressable style={[styles.row, { borderBottomColor: colors.border }]} onPress={clearAction.onPress}>
            <Typography variant="body" color={colors.textSecondary} style={styles.rowLabel}>
              {clearAction.label}
            </Typography>
          </Pressable>
        ) : null}

        {filteredItems.map((item) => (
          <Pressable
            key={item.id}
            style={[styles.row, { borderBottomColor: colors.border }]}
            onPress={() => onSelect(item)}
            accessibilityRole="button"
            accessibilityLabel={item.label}
          >
            <View style={styles.rowText}>
              <Typography variant="body" style={{ fontWeight: '600' }} numberOfLines={1}>
                {item.label}
              </Typography>
              {item.secondary ? (
                <Typography variant="label" color={colors.textSecondary} numberOfLines={2}>
                  {item.secondary}
                </Typography>
              ) : null}
            </View>

            {item.isLocal ? (
              <View style={[styles.badge, { backgroundColor: palette.powderBlush }]}>
                <Typography variant="label" color="#111" style={styles.badgeText}>NUEVO</Typography>
              </View>
            ) : null}

            <Plus width={22} height={22} color={palette.deepSkyBlue} strokeWidth={2.5} />
          </Pressable>
        ))}

        {filteredItems.length === 0 ? (
          <View style={styles.empty}>
            <Typography variant="body" color={colors.textSecondary}>{emptyText}</Typography>
          </View>
        ) : null}
      </View>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  toolbar: { paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, gap: 16 },
  tabs: { flexDirection: 'row' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, gap: 10 },
  searchInput: { flex: 1, fontSize: 16, fontWeight: '500', padding: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, borderBottomWidth: 1 },
  rowText: { flex: 1, gap: 4 },
  rowLabel: { flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  empty: { paddingVertical: 40, alignItems: 'center' },
});
