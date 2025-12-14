import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Screen from '../../components/layout/Screen';
import { theme } from '../../constants/theme';

export default function ViewerInfoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const openURL = (url: string) => {
    Linking.openURL(url).catch(err => console.error('Error opening URL:', err));
  };

  const handleLeave = () => {
    router.replace('/');
  };

  return (
    <Screen scroll={false} padding={false}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <MaterialIcons name="sports-soccer" size={64} color={theme.colors.primary} />
        </View>
        <Text style={styles.headerTitle}>Jugendtrainer</Text>
        <Text style={styles.headerSubtitle}>Trainer APP</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Über die App</Text>
          <Text style={styles.sectionText}>
            Die Jugendtrainer APP unterstützt Trainer und Betreuer bei der 
            Dokumentation von Jugendspielen und Turnieren. Erfassen Sie Tore, Spielminuten 
            und generieren Sie automatisch Spielberichte.
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kontakt</Text>
          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => openURL('mailto:Frank.Giegerich@tekanet.com')}
            activeOpacity={0.7}
          >
            <MaterialIcons name="email" size={24} color={theme.colors.primary} />
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>E-Mail</Text>
              <Text style={styles.contactValue}>Frank.Giegerich@tekanet.com</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datenschutz</Text>
          <Text style={styles.sectionText}>
            Die App erfasst und verarbeitet folgende Daten:
          </Text>
          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Teamnamen und Spielerinformationen</Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Turnier- und Spielergebnisse</Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Statistiken und Spielberichte</Text>
            </View>
          </View>
          <Text style={styles.sectionText}>
            Alle Daten werden ausschließlich für den Trainingsbetrieb verwendet und nicht 
            an Dritte weitergegeben. Die Datenverarbeitung erfolgt auf Basis der DSGVO.
          </Text>
          
          <Text style={styles.subsectionTitle}>Kinderfotos</Text>
          <Text style={styles.sectionText}>
            Für die Verwendung von Kinderfotos in der App ist die ausdrückliche Einwilligung 
            der Sorgeberechtigten erforderlich. Diese kann jederzeit widerrufen werden.
          </Text>

          <Text style={styles.subsectionTitle}>Ihre Rechte</Text>
          <Text style={styles.sectionText}>
            Sie haben jederzeit das Recht auf Auskunft, Berichtigung, Löschung oder 
            Einschränkung der Verarbeitung Ihrer personenbezogenen Daten.
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Impressum</Text>
          
          <Text style={styles.subsectionTitle}>Verantwortlich</Text>
          <Text style={styles.sectionText}>
            Frank Giegerich{'\n'}
            E-Mail: Frank.Giegerich@tekanet.com
          </Text>

          <Text style={styles.subsectionTitle}>Haftungsausschluss</Text>
          <Text style={styles.sectionText}>
            Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für 
            die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind 
            ausschließlich deren Betreiber verantwortlich.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Version 1.0.0</Text>
          <Text style={styles.footerText}>© 2025 Frank Giegerich</Text>
        </View>

        {/* Leave Button */}
        <View style={[styles.leaveSection, { paddingBottom: insets.bottom + theme.spacing.xl }]}>
          <TouchableOpacity 
            style={styles.leaveButton} 
            onPress={handleLeave}
            activeOpacity={0.8}
          >
            <MaterialIcons name="exit-to-app" size={24} color={theme.colors.text.inverse} />
            <Text style={styles.leaveButtonText}>Zuschauermodus verlassen</Text>
          </TouchableOpacity>
          <Text style={styles.leaveHint}>Zurück zur Auswahl Trainer / Zuschauer</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.xxl,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text.secondary,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  subsectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  sectionText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text.secondary,
    lineHeight: 22,
    marginBottom: theme.spacing.md,
  },
  bulletList: {
    marginBottom: theme.spacing.md,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
  },
  bullet: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    marginRight: theme.spacing.sm,
    width: 20,
  },
  bulletText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.text.secondary,
    lineHeight: 22,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  contactInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  contactLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text.light,
    marginBottom: theme.spacing.xs,
  },
  contactValue: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  footer: {
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  footerText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.light,
    marginBottom: theme.spacing.xs,
  },
  leaveSection: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
    width: '100%',
    ...theme.shadows.md,
  },
  leaveButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
  leaveHint: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.light,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
});
