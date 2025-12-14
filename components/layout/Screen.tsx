import React, { ReactNode } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  padding?: boolean;
}

export default function Screen({ children, scroll = true, padding = true }: ScreenProps) {
  const insets = useSafeAreaInsets();

  const content = (
    <View style={[styles.content, padding && styles.padding]}>
      {children}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {scroll ? (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  padding: {
    padding: theme.spacing.md,
  },
});
