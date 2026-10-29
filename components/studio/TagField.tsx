import { Typography } from '@/components/common/Typography';
import { useTheme } from '@/hooks/useTheme';
import { Plus, Xmark } from 'iconoir-react-native';
import React, { useState } from 'react';
import { Pressable, StyleProp, StyleSheet, TextInput, View, ViewStyle } from 'react-native';

interface TagFieldProps {
  label: string;
  placeholder: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  required?: boolean;
  hint?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function TagField({ label, placeholder, tags, onChange, required, hint, containerStyle }: TagFieldProps) {
  const { colors } = useTheme();
  const palette = (colors as any).palette;
  const [draft, setDraft] = useState('');

  const canAdd = draft.trim().length > 0;

  const addTag = () => {
    const value = draft.trim();
    if (!value || tags.includes(value)) return;
    onChange([...tags, value]);
    setDraft('');
  };

  return (
    <View style={containerStyle}>
      <Typography variant="label" color={colors.textSecondary} style={styles.label}>
        {label}
        {required ? ' *' : ''}
      </Typography>
      {hint ? (
        <Typography variant="label" color={colors.textSecondary} style={styles.hint}>
          {hint}
        </Typography>
      ) : null}

      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.input,
            { color: colors.text, backgroundColor: colors.input, borderColor: canAdd ? palette.deepSkyBlue : colors.border },
          ]}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={addTag}
          blurOnSubmit={false}
          returnKeyType="done"
        />
        <Pressable
          style={[styles.addButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={addTag}
          disabled={!canAdd}
          accessibilityRole="button"
          accessibilityLabel={`Agregar ${label.toLowerCase()}`}
        >
          <Plus width={24} height={24} color={canAdd ? palette.deepSkyBlue : colors.textSecondary} />
        </Pressable>
      </View>

      {tags.length > 0 ? (
        <View style={styles.chips}>
          {tags.map((tag) => (
            <View key={tag} style={[styles.chip, { backgroundColor: palette.deepSkyBlue }]}>
              <Typography variant="label" color="#FFFFFF" style={styles.chipText}>
                {tag}
              </Typography>
              <Pressable
                onPress={() => onChange(tags.filter((item) => item !== tag))}
                style={styles.chipRemove}
                accessibilityRole="button"
                accessibilityLabel={`Quitar ${tag}`}
              >
                <Xmark width={16} height={16} color="#FFFFFF" />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  hint: { letterSpacing: 0.2, marginTop: -4, marginBottom: 8 },
  inputRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, fontSize: 16, borderRadius: 20, paddingVertical: 16, paddingHorizontal: 20, fontWeight: '500', borderWidth: 2 },
  addButton: { width: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 20, borderWidth: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingLeft: 14, paddingRight: 8, borderRadius: 20, gap: 8 },
  chipText: { maxWidth: 220 },
  chipRemove: { padding: 4, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.2)' },
});
