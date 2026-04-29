import { Card } from '@/components/common/Card';
import { IconBox } from '@/components/common/IconBox';
import { IconButton } from '@/components/common/IconButton';
import { Typography } from '@/components/common/Typography';
import { useTheme } from '@/hooks/useTheme';
import { BookStack, Play, Search } from 'iconoir-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type DictionaryItem = {
  id: number;
  title: string;
  category: string;
  type: string;
  imgColor: string;
};

const DICTIONARY_DATA: DictionaryItem[] = [
  { id: 1, title: 'Farmacia', category: 'Lugares', type: 'default', imgColor: '#E0E7FF' },
  { id: 2, title: 'Hospital', category: 'Lugares', type: 'default', imgColor: '#E0E7FF' },
  { id: 3, title: 'Ayuda', category: 'Emergencia', type: 'danger', imgColor: '#FEE2E2' },
  { id: 4, title: 'Gracias', category: 'Cortesía', type: 'default', imgColor: '#F3F4F6' },
  { id: 5, title: 'Madre', category: 'Familia', type: 'default', imgColor: '#FAE8FF' },
  { id: 6, title: 'Comer', category: 'Verbos', type: 'success', imgColor: '#DCFCE7' },
];

const FILTERS = ['Todo', 'Verbos', 'Sustantivos', 'Emergencia', 'Familia', 'Lugares'];

export default function DictionaryScreen() {
  const { colors, isDark } = useTheme();
  const palette = (colors as any).palette;
  const [activeFilter, setActiveFilter] = useState('Todo');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      
      <View style={styles.header}>
        <Typography variant="h1" style={{ marginBottom: 20 }}>Diccionario</Typography>
        
        <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
          <Search width={22} height={22} color={colors.textSecondary} strokeWidth={2.5} />
          <TextInput
            placeholder="Buscar una seña..."
            placeholderTextColor={colors.textSecondary}
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.filtersWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.filtersScrollContent}
        >
          {FILTERS.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <Pressable
                key={filter}
                style={[
                  styles.filterPill,
                  { backgroundColor: isActive ? palette.deepSkyBlue : colors.surface }
                ]}
                onPress={() => setActiveFilter(filter)}
              >
                <Typography
                  variant="label"
                  color={isActive ? '#FFFFFF' : colors.textSecondary}
                >
                  {filter}
                </Typography>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        {DICTIONARY_DATA.map((item) => (
          <Card key={item.id} style={styles.dictionaryCard}>
            <IconBox 
              size={56}
              backgroundColor={isDark ? 'rgba(255,255,255,0.05)' : item.imgColor}
              icon={<BookStack width={26} height={26} color={isDark ? '#FFFFFF' : '#111418'} strokeWidth={1.5} />}
            />
            
            <View style={styles.cardInfo}>
              <Typography variant="h3" style={{ marginBottom: 4 }}>{item.title}</Typography>
              <Typography variant="label" color={colors.textSecondary}>{item.category}</Typography>
            </View>

            <IconButton 
              size={48}
              backgroundColor={palette.deepSkyBlue + '15'}
              icon={<Play width={24} height={24} color={palette.deepSkyBlue} strokeWidth={2} style={{ marginLeft: 4 }} />}
              onPress={() => console.log('Play', item.title)}
            />
          </Card>
        ))}
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 28,
    paddingHorizontal: 20,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    height: '100%',
  },
  filtersWrapper: {
    marginBottom: 24,
  },
  filtersScrollContent: {
    paddingHorizontal: 24,
    gap: 10,
  },
  filterPill: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 90,
    gap: 16,
  },
  dictionaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
});