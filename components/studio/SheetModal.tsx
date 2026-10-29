import { IconButton } from '@/components/common/IconButton';
import { Typography } from '@/components/common/Typography';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { useTheme } from '@/hooks/useTheme';
import { Xmark } from 'iconoir-react-native';
import React, { ReactNode, useEffect } from 'react';
import { Keyboard, Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SheetModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Fixed area between the title and the scrolling body, e.g. tabs or a search bar. */
  toolbar?: ReactNode;
  footer?: ReactNode;
  /** Fraction of the screen the sheet occupies. Omit to size it to its content. */
  heightRatio?: number;
  animationType?: 'fade' | 'slide';
}

export function SheetModal({
  visible,
  onClose,
  title,
  children,
  toolbar,
  footer,
  heightRatio,
  animationType = 'fade',
}: SheetModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const keyboardHeight = useKeyboardHeight();

  // A modal that unmounts while an input is focused leaves the keyboard behind on Android.
  useEffect(() => {
    if (!visible) Keyboard.dismiss();
  }, [visible]);

  const maxSheetHeight = Math.max(windowHeight - keyboardHeight - insets.top - 24, 240);

  return (
    <Modal visible={visible} transparent animationType={animationType} onRequestClose={onClose}>
      <View style={styles.overlay} accessibilityViewIsModal>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              maxHeight: maxSheetHeight,
              marginBottom: keyboardHeight,
              paddingBottom: keyboardHeight ? 0 : Math.max(insets.bottom - 24, 0),
            },
            heightRatio ? { height: windowHeight * heightRatio } : null,
          ]}
        >
          <View style={styles.header}>
            <Typography variant="h2" style={styles.title} numberOfLines={2}>
              {title}
            </Typography>
            <IconButton
              size={36}
              icon={<Xmark width={22} height={22} color={colors.text} strokeWidth={2} />}
              backgroundColor={colors.surface}
              onPress={onClose}
            />
          </View>

          {toolbar}

          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            style={styles.scroll}
            contentContainerStyle={styles.body}
          >
            {children}
          </ScrollView>

          {footer ? (
            <View style={[styles.footer, { borderTopColor: colors.border }]}>{footer}</View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: {
    width: '100%',
    overflow: 'hidden',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 },
  title: { flex: 1 },
  scroll: { flexShrink: 1 },
  body: { paddingHorizontal: 24, paddingBottom: 24, gap: 20 },
  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, borderTopWidth: 1 },
});
