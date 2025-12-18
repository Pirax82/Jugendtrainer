import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Screen from '../../components/layout/Screen';
import Header from '../../components/layout/Header';
import { useAuth } from '../../hooks/useAuth';
import { useTeams } from '../../hooks/useTeams';
import { UserRole } from '../../types';
import { theme } from '../../constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, isAdmin, signOut, loading } = useAuth();
  const { teams } = useTeams();

  // Show loading state while auth is being checked
  if (loading) {
    return (
      <Screen scroll={false} padding={false}>
        <Header title="Profil" />
        <View style={styles.centered}>
          <MaterialIcons name="hourglass-empty" size={48} color={theme.colors.text.light} />
          <Text style={styles.loadingText}>Laden...</Text>
        </View>
      </Screen>
    );
  }

  // Navigate to entry screen (Trainer/Zuschauer selection) using root navigator
  const navigateToEntryScreen = () => {
    const rootNavigation = navigation.getParent();
    if (rootNavigation) {
      rootNavigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'index' }],
        })
      );
    } else {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'index' }],
        })
      );
    }
  };

  const handleSignOut = async () => {
    if (Platform.OS === 'web') {
      await signOut();
      navigateToEntryScreen();
    } else {
      Alert.alert(
        'Abmelden',
        'Möchtest du dich wirklich abmelden?',
        [
          { text: 'Abbrechen', style: 'cancel' },
          {
            text: 'Abmelden',
            style: 'destructive',
            onPress: async () => {
              await signOut();
              navigateToEntryScreen();
            },
          },
        ]
      );
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'Administrator';
      case UserRole.TRAINER:
        return 'Trainer';
      case UserRole.ZUSCHAUER:
      default:
        return 'Zuschauer';
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return theme.colors.error;
      case UserRole.TRAINER:
        return theme.colors.primary;
      case UserRole.ZUSCHAUER:
      default:
        return theme.colors.text.secondary;
    }
  };

  const getRoleIcon = (role: UserRole): keyof typeof MaterialIcons.glyphMap => {
    switch (role) {
      case UserRole.ADMIN:
        return 'admin-panel-settings';
      case UserRole.TRAINER:
        return 'sports';
      case UserRole.ZUSCHAUER:
      default:
        return 'visibility';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const assignedTeams = teams.filter(t => user?.teamIds?.includes(t.id));

  if (!user) {
    // Not logged in - redirect to entry screen
    return (
      <Screen scroll={false} padding={false}>
        <Header title="Profil" />
        
        <View style={styles.centered}>
          <View style={styles.notLoggedInIcon}>
            <MaterialIcons name="account-circle" size={100} color={theme.colors.text.light} />
          </View>
          <Text style={styles.notLoggedInTitle}>Nicht angemeldet</Text>
          <Text style={styles.notLoggedInText}>
            Melde dich an, um auf alle Trainer-Funktionen zuzugreifen.
          </Text>
          
          <TouchableOpacity style={styles.loginButton} onPress={() => router.replace('/')}>
            <MaterialIcons name="login" size={24} color={theme.colors.text.inverse} />
            <Text style={styles.loginButtonText}>Zur Anmeldung</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.viewerLink}
            onPress={() => router.replace('/(viewer)')}
          >
            <MaterialIcons name="visibility" size={20} color={theme.colors.primary} />
            <Text style={styles.viewerLinkText}>Zum Zuschauer-Modus</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  // Logged in - show profile
  return (
    <View style={styles.container}>
      <Header title="Profil" />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 160 }]}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatar, { backgroundColor: getRoleColor(user.role) }]}>
            <Text style={styles.avatarText}>
              {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </Text>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) }]}>
            <MaterialIcons name={getRoleIcon(user.role)} size={16} color={theme.colors.text.inverse} />
            <Text style={styles.roleBadgeText}>{getRoleLabel(user.role)}</Text>
          </View>
        </View>

        {/* Account Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account-Details</Text>
          
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <MaterialIcons name="email" size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>E-Mail</Text>
                <Text style={styles.detailValue}>{user.email}</Text>
              </View>
            </View>

            <View style={styles.detailDivider} />

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <MaterialIcons name="badge" size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Rolle</Text>
                <Text style={styles.detailValue}>{getRoleLabel(user.role)}</Text>
              </View>
            </View>

            <View style={styles.detailDivider} />

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <MaterialIcons name="event" size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Registriert am</Text>
                <Text style={styles.detailValue}>
                  {user.createdAt ? formatDate(user.createdAt) : 'Unbekannt'}
                </Text>
              </View>
            </View>

            {user.lastLogin && (
              <>
                <View style={styles.detailDivider} />
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <MaterialIcons name="access-time" size={20} color={theme.colors.primary} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Letzter Login</Text>
                    <Text style={styles.detailValue}>{formatDate(user.lastLogin)}</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Assigned Teams (for Trainers) */}
        {user.role === UserRole.TRAINER && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Meine Teams</Text>
            {assignedTeams.length === 0 ? (
              <View style={styles.emptyTeams}>
                <MaterialIcons name="groups" size={32} color={theme.colors.text.light} />
                <Text style={styles.emptyTeamsText}>Keine Teams zugewiesen</Text>
                <Text style={styles.emptyTeamsSubtext}>
                  Ein Administrator muss dir Teams zuweisen.
                </Text>
              </View>
            ) : (
              assignedTeams.map(team => (
                <TouchableOpacity
                  key={team.id}
                  style={styles.teamCard}
                  onPress={() => router.push(`/team/${team.id}`)}
                >
                  <View style={styles.teamIcon}>
                    <MaterialIcons name="sports-soccer" size={24} color={theme.colors.primary} />
                  </View>
                  <View style={styles.teamInfo}>
                    <Text style={styles.teamName}>{team.name}</Text>
                    {team.jahrgang && (
                      <Text style={styles.teamJahrgang}>{team.jahrgang}</Text>
                    )}
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color={theme.colors.text.light} />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schnellzugriff</Text>
          
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => router.replace('/(viewer)')}
          >
            <View style={[styles.actionIcon, { backgroundColor: theme.colors.primary + '20' }]}>
              <MaterialIcons name="visibility" size={22} color={theme.colors.primary} />
            </View>
            <Text style={styles.actionText}>Zuschauer-Modus</Text>
            <MaterialIcons name="chevron-right" size={24} color={theme.colors.text.light} />
          </TouchableOpacity>

          {isAdmin && (
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push('/(tabs)/admin')}
            >
              <View style={[styles.actionIcon, { backgroundColor: theme.colors.error + '20' }]}>
                <MaterialIcons name="admin-panel-settings" size={22} color={theme.colors.error} />
              </View>
              <Text style={styles.actionText}>Benutzerverwaltung</Text>
              <MaterialIcons name="chevron-right" size={24} color={theme.colors.text.light} />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Fixed Logout Button at Bottom - positioned above TabBar */}
      <View style={[styles.logoutContainer, { bottom: insets.bottom + 60 }]}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <MaterialIcons name="logout" size={22} color={theme.colors.error} />
          <Text style={styles.logoutButtonText}>Abmelden</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  loadingText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
  },
  notLoggedInIcon: {
    marginBottom: theme.spacing.lg,
    opacity: 0.5,
  },
  notLoggedInTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  notLoggedInText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
    ...theme.shadows.md,
  },
  loginButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
  viewerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  viewerLinkText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.medium,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
  userName: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.xs,
  },
  roleBadgeText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
  section: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  detailCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text.primary,
    fontWeight: theme.fontWeight.medium,
  },
  detailDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: 56,
  },
  emptyTeams: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
  },
  emptyTeamsText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
  },
  emptyTeamsSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.light,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  teamIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  teamJahrgang: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  actionText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  logoutContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.error + '10',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.error,
    gap: theme.spacing.sm,
  },
  logoutButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.error,
  },
});
