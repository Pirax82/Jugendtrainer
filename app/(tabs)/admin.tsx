import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView, Alert, Platform, RefreshControl, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Screen from '../../components/layout/Screen';
import Header from '../../components/layout/Header';
import { useAuth } from '../../hooks/useAuth';
import { useTeams } from '../../hooks/useTeams';
import { User, UserRole } from '../../types';
import { theme } from '../../constants/theme';
import { usersApi } from '../../services/api';

export default function AdminScreen() {
  const { user, isAdmin, getAllUsers, updateUserRole, assignTeamToTrainer, removeTeamFromTrainer } = useAuth();
  const { teams } = useTeams();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [teamModalVisible, setTeamModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>(UserRole.ZUSCHAUER);
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const allUsers = await getAllUsers();
    setUsers(allUsers);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const handleRoleChange = async (newRole: UserRole) => {
    if (!selectedUser) return;
    
    const result = await updateUserRole(selectedUser.id, newRole);
    if (result.success) {
      setUsers(prev => prev.map(u => 
        u.id === selectedUser.id ? { ...u, role: newRole } : u
      ));
      setRoleModalVisible(false);
      setSelectedUser(null);
    } else {
      Alert.alert('Fehler', result.error || 'Rolle konnte nicht geändert werden');
    }
  };

  const handleTeamAssignment = async (teamId: string, assign: boolean) => {
    if (!selectedUser) return;
    
    const result = assign 
      ? await assignTeamToTrainer(selectedUser.id, teamId)
      : await removeTeamFromTrainer(selectedUser.id, teamId);
    
    if (result.success) {
      setUsers(prev => prev.map(u => {
        if (u.id === selectedUser.id) {
          const newTeamIds = assign
            ? [...(u.teamIds || []), teamId]
            : (u.teamIds || []).filter(id => id !== teamId);
          return { ...u, teamIds: newTeamIds };
        }
        return u;
      }));
      // Update selected user
      setSelectedUser(prev => {
        if (!prev) return null;
        const newTeamIds = assign
          ? [...(prev.teamIds || []), teamId]
          : (prev.teamIds || []).filter(id => id !== teamId);
        return { ...prev, teamIds: newTeamIds };
      });
    } else {
      Alert.alert('Fehler', result.error || 'Team konnte nicht zugewiesen werden');
    }
  };

  const handleCreateUser = async () => {
    if (!newUserEmail.trim() || !newUserName.trim() || !newUserPassword.trim()) {
      Alert.alert('Fehler', 'Bitte alle Felder ausfüllen');
      return;
    }

    setCreateLoading(true);
    try {
      const newUser = await usersApi.create({
        email: newUserEmail.trim(),
        name: newUserName.trim(),
        password: newUserPassword.trim(),
        role: newUserRole,
      });
      
      setUsers(prev => [{ 
        ...newUser, 
        createdAt: newUser.createdAt || Date.now(),
        teamIds: newUser.teamIds || [],
      }, ...prev]);
      
      setCreateModalVisible(false);
      setNewUserEmail('');
      setNewUserName('');
      setNewUserPassword('');
      setNewUserRole(UserRole.ZUSCHAUER);
      
      Alert.alert('Erfolg', 'Benutzer wurde erstellt');
    } catch (error: any) {
      Alert.alert('Fehler', error.message || 'Benutzer konnte nicht erstellt werden');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteUser = (userToDelete: User) => {
    if (userToDelete.id === user?.id) {
      Alert.alert('Fehler', 'Du kannst dich nicht selbst löschen');
      return;
    }

    const confirmDelete = async () => {
      try {
        await usersApi.delete(userToDelete.id);
        setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
        Alert.alert('Erfolg', 'Benutzer wurde gelöscht');
      } catch (error: any) {
        Alert.alert('Fehler', error.message || 'Benutzer konnte nicht gelöscht werden');
      }
    };

    if (Platform.OS === 'web') {
      if (confirm(`Möchtest du "${userToDelete.name}" wirklich löschen?`)) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        'Benutzer löschen',
        `Möchtest du "${userToDelete.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
        [
          { text: 'Abbrechen', style: 'cancel' },
          { text: 'Löschen', style: 'destructive', onPress: confirmDelete },
        ]
      );
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
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

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'Admin';
      case UserRole.TRAINER:
        return 'Trainer';
      case UserRole.ZUSCHAUER:
      default:
        return 'Zuschauer';
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

  if (!isAdmin) {
    return (
      <Screen>
        <View style={styles.accessDenied}>
          <MaterialIcons name="lock" size={64} color={theme.colors.text.light} />
          <Text style={styles.accessDeniedText}>Zugang verweigert</Text>
          <Text style={styles.accessDeniedSubtext}>
            Nur Administratoren können auf diesen Bereich zugreifen.
          </Text>
        </View>
      </Screen>
    );
  }

  const renderUser = ({ item }: { item: User }) => {
    const isCurrentUser = item.id === user?.id;
    const assignedTeams = teams.filter(t => item.teamIds?.includes(t.id));

    return (
      <View style={styles.userCard}>
        <View style={styles.userHeader}>
          <View style={styles.userAvatar}>
            <Text style={styles.userInitials}>
              {item.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <View style={styles.userNameRow}>
              <Text style={styles.userName}>{item.name}</Text>
              {isCurrentUser && (
                <View style={styles.currentUserBadge}>
                  <Text style={styles.currentUserBadgeText}>Du</Text>
                </View>
              )}
            </View>
            <Text style={styles.userEmail}>{item.email}</Text>
          </View>
          <TouchableOpacity
            style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(item.role) }]}
            onPress={() => {
              if (!isCurrentUser) {
                setSelectedUser(item);
                setRoleModalVisible(true);
              }
            }}
            disabled={isCurrentUser}
          >
            <Text style={styles.roleBadgeText}>{getRoleLabel(item.role)}</Text>
            {!isCurrentUser && <MaterialIcons name="arrow-drop-down" size={16} color={theme.colors.text.inverse} />}
          </TouchableOpacity>
        </View>

        {item.role === UserRole.TRAINER && (
          <View style={styles.teamsSection}>
            <Text style={styles.teamsSectionTitle}>Zugewiesene Teams:</Text>
            <View style={styles.teamsRow}>
              {assignedTeams.length === 0 ? (
                <Text style={styles.noTeamsText}>Keine Teams zugewiesen</Text>
              ) : (
                assignedTeams.map(team => (
                  <View key={team.id} style={styles.teamBadge}>
                    <Text style={styles.teamBadgeText}>{team.name}</Text>
                  </View>
                ))
              )}
              <TouchableOpacity
                style={styles.addTeamButton}
                onPress={() => {
                  setSelectedUser(item);
                  setTeamModalVisible(true);
                }}
              >
                <MaterialIcons name="add" size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.userMeta}>
          <View style={styles.userMetaRow}>
            <View>
              <Text style={styles.userMetaText}>
                Registriert: {formatDate(item.createdAt)}
              </Text>
              {item.lastLogin && (
                <Text style={styles.userMetaText}>
                  Letzter Login: {formatDate(item.lastLogin)}
                </Text>
              )}
            </View>
            {!isCurrentUser && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteUser(item)}
              >
                <MaterialIcons name="delete-outline" size={20} color={theme.colors.error} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <Screen scroll={false} padding={false}>
      <View style={styles.headerRow}>
        <Header title="Benutzerverwaltung" />
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setCreateModalVisible(true)}
        >
          <MaterialIcons name="person-add" size={24} color={theme.colors.text.inverse} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{users.length}</Text>
          <Text style={styles.statLabel}>Gesamt</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.error }]}>
            {users.filter(u => u.role === UserRole.ADMIN).length}
          </Text>
          <Text style={styles.statLabel}>Admins</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.primary }]}>
            {users.filter(u => u.role === UserRole.TRAINER).length}
          </Text>
          <Text style={styles.statLabel}>Trainer</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.text.secondary }]}>
            {users.filter(u => u.role === UserRole.ZUSCHAUER).length}
          </Text>
          <Text style={styles.statLabel}>Zuschauer</Text>
        </View>
      </View>

      <FlatList
        data={users}
        renderItem={renderUser}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="people-outline" size={48} color={theme.colors.text.light} />
            <Text style={styles.emptyText}>Keine Benutzer gefunden</Text>
          </View>
        }
      />

      {/* Role Selection Modal */}
      <Modal visible={roleModalVisible} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setRoleModalVisible(false);
            setSelectedUser(null);
          }}
        >
          <View style={styles.roleModal}>
            <Text style={styles.modalTitle}>Rolle ändern</Text>
            <Text style={styles.modalSubtitle}>{selectedUser?.name}</Text>
            
            {[UserRole.ZUSCHAUER, UserRole.TRAINER, UserRole.ADMIN].map(role => (
              <TouchableOpacity
                key={role}
                style={[
                  styles.roleOption,
                  selectedUser?.role === role && styles.roleOptionSelected
                ]}
                onPress={() => handleRoleChange(role)}
              >
                <View style={[styles.roleOptionBadge, { backgroundColor: getRoleBadgeColor(role) }]}>
                  <MaterialIcons 
                    name={role === UserRole.ADMIN ? 'admin-panel-settings' : role === UserRole.TRAINER ? 'sports' : 'visibility'} 
                    size={20} 
                    color={theme.colors.text.inverse} 
                  />
                </View>
                <View style={styles.roleOptionInfo}>
                  <Text style={styles.roleOptionTitle}>{getRoleLabel(role)}</Text>
                  <Text style={styles.roleOptionDescription}>
                    {role === UserRole.ADMIN && 'Vollzugriff auf alle Funktionen'}
                    {role === UserRole.TRAINER && 'Kann Teams und Turniere verwalten'}
                    {role === UserRole.ZUSCHAUER && 'Nur Lesezugriff'}
                  </Text>
                </View>
                {selectedUser?.role === role && (
                  <MaterialIcons name="check" size={24} color={theme.colors.success} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Team Assignment Modal */}
      <Modal visible={teamModalVisible} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setTeamModalVisible(false);
            setSelectedUser(null);
          }}
        >
          <View style={styles.teamModal}>
            <Text style={styles.modalTitle}>Teams zuweisen</Text>
            <Text style={styles.modalSubtitle}>{selectedUser?.name}</Text>
            
            <ScrollView style={styles.teamList}>
              {teams.map(team => {
                const isAssigned = selectedUser?.teamIds?.includes(team.id);
                return (
                  <TouchableOpacity
                    key={team.id}
                    style={[styles.teamOption, isAssigned && styles.teamOptionSelected]}
                    onPress={() => handleTeamAssignment(team.id, !isAssigned)}
                  >
                    <View style={styles.teamOptionInfo}>
                      <Text style={styles.teamOptionName}>{team.name}</Text>
                      {team.jahrgang && (
                        <Text style={styles.teamOptionJahrgang}>{team.jahrgang}</Text>
                      )}
                    </View>
                    <MaterialIcons 
                      name={isAssigned ? 'check-box' : 'check-box-outline-blank'} 
                      size={24} 
                      color={isAssigned ? theme.colors.success : theme.colors.text.light} 
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Create User Modal */}
      <Modal visible={createModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.createModal}>
            <View style={styles.createModalHeader}>
              <Text style={styles.modalTitle}>Neuer Benutzer</Text>
              <TouchableOpacity 
                onPress={() => {
                  setCreateModalVisible(false);
                  setNewUserEmail('');
                  setNewUserName('');
                  setNewUserPassword('');
                  setNewUserRole(UserRole.ZUSCHAUER);
                }}
              >
                <MaterialIcons name="close" size={24} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={newUserName}
                  onChangeText={setNewUserName}
                  placeholder="Vollständiger Name"
                  placeholderTextColor={theme.colors.text.light}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>E-Mail</Text>
                <TextInput
                  style={styles.input}
                  value={newUserEmail}
                  onChangeText={setNewUserEmail}
                  placeholder="email@example.com"
                  placeholderTextColor={theme.colors.text.light}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Passwort</Text>
                <TextInput
                  style={styles.input}
                  value={newUserPassword}
                  onChangeText={setNewUserPassword}
                  placeholder="Mindestens 6 Zeichen"
                  placeholderTextColor={theme.colors.text.light}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Rolle</Text>
                <View style={styles.roleSelector}>
                  {[UserRole.ZUSCHAUER, UserRole.TRAINER, UserRole.ADMIN].map(role => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleSelectorOption,
                        newUserRole === role && { backgroundColor: getRoleBadgeColor(role) }
                      ]}
                      onPress={() => setNewUserRole(role)}
                    >
                      <Text style={[
                        styles.roleSelectorText,
                        newUserRole === role && { color: theme.colors.text.inverse }
                      ]}>
                        {getRoleLabel(role)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.createButton, createLoading && styles.createButtonDisabled]}
                onPress={handleCreateUser}
                disabled={createLoading}
              >
                <MaterialIcons name="person-add" size={20} color={theme.colors.text.inverse} />
                <Text style={styles.createButtonText}>
                  {createLoading ? 'Wird erstellt...' : 'Benutzer erstellen'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  accessDenied: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  accessDeniedText: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  accessDeniedSubtext: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: theme.spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  list: {
    padding: theme.spacing.md,
  },
  userCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInitials: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
  userInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  currentUserBadge: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
    marginLeft: theme.spacing.sm,
  },
  currentUserBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
  userEmail: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
  },
  roleBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
  teamsSection: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  teamsSectionTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  teamsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  noTeamsText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.light,
    fontStyle: 'italic',
  },
  teamBadge: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
  },
  teamBadgeText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.primary,
  },
  addTeamButton: {
    width: 28,
    height: 28,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMeta: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  userMetaText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text.light,
    marginBottom: theme.spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xxl,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  roleModal: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '100%',
    maxWidth: 400,
    ...theme.shadows.lg,
  },
  teamModal: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    ...theme.shadows.lg,
  },
  modalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  modalSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.lg,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  roleOptionSelected: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.success,
  },
  roleOptionBadge: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  roleOptionInfo: {
    flex: 1,
  },
  roleOptionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  roleOptionDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  teamList: {
    maxHeight: 300,
  },
  teamOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  teamOptionSelected: {
    backgroundColor: theme.colors.surface,
  },
  teamOptionInfo: {
    flex: 1,
  },
  teamOptionName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  teamOptionJahrgang: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  headerRow: {
    position: 'relative',
  },
  addButton: {
    position: 'absolute',
    right: theme.spacing.md,
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.md,
  },
  userMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.error + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createModal: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    ...theme.shadows.lg,
  },
  createModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  inputGroup: {
    marginBottom: theme.spacing.md,
  },
  inputLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text.primary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  roleSelectorOption: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  roleSelectorText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
});

