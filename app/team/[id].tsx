import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, KeyboardAvoidingView, ScrollView, TouchableWithoutFeedback, Keyboard, Platform } from 'react-native';
import FormationEditor from '../../components/feature/FormationEditor';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Screen from '../../components/layout/Screen';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useTeams } from '../../hooks/useTeams';
import { theme } from '../../constants/theme';

export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getTeamById, getTeamPlayers, addPlayer, deletePlayer, updateTeam, updateTeamFormation, deleteTeam } = useTeams();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [editTrainerVisible, setEditTrainerVisible] = useState(false);
  const [name, setName] = useState('');
  const [nummer, setNummer] = useState('');
  const [trainerName, setTrainerName] = useState('');
  const [confirmDeleteTeam, setConfirmDeleteTeam] = useState(false);
  const [deletingPlayerId, setDeletingPlayerId] = useState<string | null>(null);
  const [formationEditorVisible, setFormationEditorVisible] = useState(false);

  const team = getTeamById(id as string);
  const players = getTeamPlayers(id as string);

  const handleAddPlayer = async () => {
    if (!name.trim()) return;
    
    await addPlayer({
      teamId: id as string,
      name,
      nummer: nummer ? parseInt(nummer) : undefined,
      aktiv: true,
    });
    
    setName('');
    setNummer('');
    setModalVisible(false);
  };

  const handleDeletePlayerClick = (playerId: string) => {
    if (deletingPlayerId === playerId) {
      // Second click - confirm delete
      deletePlayer(playerId);
      setDeletingPlayerId(null);
    } else {
      // First click - show confirmation
      setDeletingPlayerId(playerId);
      // Auto-cancel after 3 seconds
      setTimeout(() => {
        setDeletingPlayerId(null);
      }, 3000);
    }
  };

  const handleEditTrainer = () => {
    setTrainerName(team?.trainer || '');
    setEditTrainerVisible(true);
  };

  const handleSaveTrainer = async () => {
    await updateTeam(id as string, { trainer: trainerName });
    setEditTrainerVisible(false);
  };

  const handleDeleteTeamClick = () => {
    if (confirmDeleteTeam) {
      // Second click - confirm delete
      deleteTeam(id as string);
      // Navigate back after brief delay
      setTimeout(() => {
        router.back();
      }, 400);
    } else {
      // First click - show confirmation
      setConfirmDeleteTeam(true);
      // Auto-cancel after 4 seconds
      setTimeout(() => {
        setConfirmDeleteTeam(false);
      }, 4000);
    }
  };

  const renderPlayer = ({ item }: any) => {
    const isDeleting = deletingPlayerId === item.id;
    
    return (
      <View style={styles.playerCard}>
        <View style={styles.playerAvatar}>
          <Text style={styles.playerInitials}>
            {item.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
          </Text>
        </View>
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>{item.name}</Text>
          {item.nummer && <Text style={styles.playerNummer}>#{item.nummer}</Text>}
        </View>
        <TouchableOpacity 
          onPress={() => handleDeletePlayerClick(item.id)}
          style={[styles.deletePlayerButton, isDeleting && styles.deletePlayerButtonConfirm]}
          activeOpacity={0.7}
        >
          <MaterialIcons 
            name={isDeleting ? "warning" : "delete"} 
            size={24} 
            color={theme.colors.error} 
          />
          {isDeleting && (
            <Text style={styles.deleteConfirmText}>Löschen?</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (!team) {
    return (
      <Screen>
        <Text>Team nicht gefunden</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} padding={false}>
      <TouchableOpacity
        style={[styles.deleteButton, confirmDeleteTeam && styles.deleteButtonConfirm]}
        onPress={handleDeleteTeamClick}
        activeOpacity={0.7}
      >
        <MaterialIcons 
          name={confirmDeleteTeam ? "warning" : "delete"} 
          size={24} 
          color={theme.colors.error} 
        />
        {confirmDeleteTeam && (
          <Text style={styles.deleteButtonText}>Wirklich?</Text>
        )}
      </TouchableOpacity>
      <View style={styles.header}>
        <View style={styles.teamIconLarge}>
          <MaterialIcons name="sports-soccer" size={48} color={theme.colors.primary} />
        </View>
        <Text style={styles.teamName}>{team.name}</Text>
        {team.jahrgang && <Text style={styles.teamJahrgang}>Jahrgang {team.jahrgang}</Text>}
        <TouchableOpacity style={styles.trainerRow} onPress={handleEditTrainer} activeOpacity={0.7}>
          <MaterialIcons name="person" size={16} color={theme.colors.text.secondary} />
          <Text style={styles.trainerText}>
            {team.trainer ? `Trainer: ${team.trainer}` : 'Trainer hinzufügen'}
          </Text>
          <MaterialIcons name="edit" size={16} color={theme.colors.text.secondary} style={{ marginLeft: theme.spacing.xs }} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Spieler ({players.length})</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              onPress={() => setFormationEditorVisible(true)} 
              style={styles.formationButton}
              disabled={players.length === 0}
            >
              <MaterialIcons name="sports" size={20} color={players.length === 0 ? theme.colors.text.light : theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
              <MaterialIcons name="add" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {players.length === 0 ? (
          <View style={styles.emptyPlayers}>
            <MaterialIcons name="person-add" size={48} color={theme.colors.text.light} />
            <Text style={styles.emptyText}>Noch keine Spieler</Text>
            <Button title="Spieler hinzufügen" onPress={() => setModalVisible(true)} size="sm" />
          </View>
        ) : (
          <FlatList
            data={players}
            renderItem={renderPlayer}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.playersList}
          />
        )}
      </View>

      <Modal visible={modalVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView 
            style={styles.modalOverlay} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <TouchableWithoutFeedback>
              <ScrollView 
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
                bounces={false}
              >
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Neuer Spieler</Text>
                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                      <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
                    </TouchableOpacity>
                  </View>
                  
                  <Input
                    label="Name *"
                    placeholder="z.B. Max Mustermann"
                    value={name}
                    onChangeText={setName}
                    autoFocus
                  />
                  
                  <Input
                    label="Rückennummer"
                    placeholder="z.B. 7"
                    value={nummer}
                    onChangeText={setNummer}
                    keyboardType="numeric"
                  />
                  
                  <View style={styles.modalActions}>
                    <Button
                      title="Abbrechen"
                      variant="outline"
                      onPress={() => setModalVisible(false)}
                      style={styles.modalButton}
                    />
                    <Button
                      title="Hinzufügen"
                      onPress={handleAddPlayer}
                      disabled={!name.trim()}
                      style={styles.modalButton}
                    />
                  </View>
                </View>
              </ScrollView>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>



      <Modal visible={editTrainerVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView 
            style={styles.modalOverlay} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Trainer bearbeiten</Text>
                  <TouchableOpacity onPress={() => setEditTrainerVisible(false)}>
                    <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
                  </TouchableOpacity>
                </View>
                
                <Input
                  label="Trainer"
                  placeholder="z.B. Max Mustermann"
                  value={trainerName}
                  onChangeText={setTrainerName}
                  autoFocus
                />
                
                <View style={styles.modalActions}>
                  <Button
                    title="Abbrechen"
                    variant="outline"
                    onPress={() => setEditTrainerVisible(false)}
                    style={styles.modalButton}
                  />
                  <Button
                    title="Speichern"
                    onPress={handleSaveTrainer}
                    style={styles.modalButton}
                  />
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={formationEditorVisible} animationType="slide">
        <FormationEditor
          players={players}
          formation={team.formation}
          onSave={async (formation) => {
            await updateTeamFormation(id as string, formation);
            setFormationEditorVisible(false);
          }}
          onCancel={() => setFormationEditorVisible(false)}
        />
      </Modal>

    </Screen>
  );
}

const styles = StyleSheet.create({
  deleteButton: {
    position: 'absolute',
    top: Platform.select({ ios: 50, android: 10, default: 10 }),
    right: theme.spacing.md,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minWidth: 44,
    minHeight: 44,
    ...theme.shadows.md,
  },
  deleteButtonConfirm: {
    backgroundColor: theme.colors.error,
    paddingHorizontal: theme.spacing.md,
  },
  deleteButtonText: {
    color: theme.colors.text.inverse,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    marginLeft: theme.spacing.xs,
  },
  deletePlayerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  deletePlayerButtonConfirm: {
    backgroundColor: theme.colors.error,
    paddingHorizontal: theme.spacing.sm,
  },
  deleteConfirmText: {
    color: theme.colors.text.inverse,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    marginLeft: theme.spacing.xs,
  },
  header: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  teamIconLarge: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  teamName: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  teamJahrgang: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text.secondary,
  },
  trainerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  trainerText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.xs,
  },
  section: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  formationButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  addButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPlayers: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  playersList: {
    padding: theme.spacing.md,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  playerAvatar: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  playerInitials: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  playerNummer: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? theme.spacing.xl : theme.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  modalButton: {
    flex: 1,
  },

});
