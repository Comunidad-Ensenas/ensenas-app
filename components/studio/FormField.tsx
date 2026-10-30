import { Typography } from '@/components/common/Typography';
import { useTheme } from '@/hooks/useTheme';
import React, { useState } from 'react';
import { StyleProp, StyleSheet, TextInput, TextInputProps, TextStyle, View, ViewStyle } from 'react-native';

interface FormFieldProps extends TextInputProps {
  label: string;
  required?: boolean;
  hint?: string;
  containerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<TextStyle>;
}

export function FormField({
  label,
  required,
  hint,
  containerStyle,
  style,
  multiline,
  onFocus,
  onBlur,
  ...rest
}: FormFieldProps) {
  const { colors } = useTheme();
  const palette = (colors as any).palette;
  const [isFocused, setIsFocused] = useState(false);

  const hasValue = typeof rest.value === 'string' && rest.value.length > 0;
  const borderColor = isFocused || hasValue ? palette.deepSkyBlue : colors.border;

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
      <TextInput
        {...rest}
        multiline={multiline}
        onFocus={(event) => {
          setIsFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setIsFocused(false);
          onBlur?.(event);
        }}
        placeholderTextColor={rest.placeholderTextColor ?? colors.textSecondary}
        style={[
          styles.input,
          multiline && styles.multiline,
          { color: colors.text, backgroundColor: colors.input, borderColor },
          style,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  hint: { letterSpacing: 0.2, marginTop: -4, marginBottom: 8, textTransform: 'none' },
  input: { fontSize: 16, borderRadius: 20, paddingVertical: 16, paddingHorizontal: 20, fontWeight: '500', borderWidth: 2 },
  multiline: { minHeight: 96, paddingTop: 16, textAlignVertical: 'top' },
});
