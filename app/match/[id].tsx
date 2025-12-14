import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Screen from '../../components/layout/Screen';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useTournaments } from '../../hooks/useTournaments';
import { useTeams } from '../../hooks/useTeams';
import { EventType, MatchStatus } from '../../types';
import { theme } from '../../constants/theme';

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getMatchById, getTournamentById, getMatchEvents, getMatchScore, addEvent, deleteEvent, updateMatch } = useTournaments();
  const { getTeamById, getTeamPlayers, getPlayerById } = useTeams();
  const [modalVisible, setModalVisible] = useState(false);
  const [playerPickerVisible, setPlayerPickerVisible] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [minute, setMinute] = useState('');
  const [isGegnertor, setIsGegnertor] = useState(false);
  const [editMatchVisible, setEditMatchVisible] = useState(false);
  const [editGegnerName, setEditGegnerName] = useState('');
  const [editDauerMin, setEditDauerMin] = useState('');
  const [editFeld, setEditFeld] = useState('');

  const match = getMatchById(id as string);
  const tournament = match ? getTournamentById(match.tournamentId) : null;
  const team = match ? getTeamById(match.teamId) : null;
  const players = match ? getTeamPlayers(match.teamId) : [];
  const events = getMatchEvents(id as string);
  const score = getMatchScore(id as string);

  const handleAddGoal = async () => {
    if (isGegnertor) {
      if (!minute.trim()) return;
      await addEvent({
        matchId: id as string,
        typ: EventType.TOR_GEGNER,
        spielminute: parseInt(minute),
      });
    } else {
      if (!selectedPlayerId || !minute.trim()) return;
      await addEvent({
        matchId: id as string,
        typ: EventType.TOR_HEIM,
        playerId: selectedPlayerId,
        spielminute: parseInt(minute),
      });
    }
    
    setSelectedPlayerId('');
    setMinute('');
    setIsGegnertor(false);
    setModalVisible(false);
  };

  const handleEditMatch = () => {
    if (!match) return;
    setEditGegnerName(match.gegnerName);
    setEditDauerMin(match.dauerMin.toString());
    setEditFeld(match.feld || '');
    setEditMatchVisible(true);
  };

  const handleSaveMatch = async () => {
    if (!editGegnerName.trim() || !editDauerMin.trim()) return;
    
    await updateMatch(id as string, {
      gegnerName: editGegnerName,
      dauerMin: parseInt(editDauerMin),
      feld: editFeld,
    });
    
    setEditMatchVisible(false);
  };

  const handleDeleteEvent = async (eventId: string) => {
    await deleteEvent(eventId);
  };

  const renderEvent = ({ item }: any) => {
    const player = item.playerId ? getPlayerById(item.playerId) : null;
    const isGoal = item.typ === EventType.TOR_HEIM || item.typ === EventType.TOR_GEGNER;
    
    return (
      <View style={styles.eventCard}>
        <View style={styles.eventIcon}>
          {item.typ === EventType.TOR_HEIM && (
            <MaterialIcons name="sports-soccer" size={24} color={theme.colors.success} />
          )}
          {item.typ === EventType.TOR_GEGNER && (
            <MaterialIcons name="sports-soccer" size={24} color={theme.colors.error} />
          )}
        </View>
        <View style={styles.eventInfo}>
          <Text style={styles.eventText}>
            {item.typ === EventType.TOR_HEIM && `Tor: ${player?.name || 'Unbekannt'}`}
            {item.typ === EventType.TOR_GEGNER && 'Gegentor'}
          </Text>
          <Text style={styles.eventMinute}>{item.spielminute}. Minute</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteEventButton}
          onPress={() => handleDeleteEvent(item.id)}
          activeOpacity={0.7}
        >
          <MaterialIcons name="delete" size={20} color={theme.colors.error} />
        </TouchableOpacity>
      </View>
    );
  };

  if (!match || !tournament || !team) {
    return (
      <Screen>
        <Text>Spiel nicht gefunden</Text>
      </Screen>
    );
  }

  const goalEvents = events.filter(e => e.typ === EventType.TOR_HEIM || e.typ === EventType.TOR_GEGNER);

  return (
    <Screen scroll={false} padding={false}>
      <View style={styles.headerActions}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.editButton}
          onPress={handleEditMatch}
          activeOpacity={0.7}
        >
          <MaterialIcons name="edit" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <Text style={styles.tournamentName}>{tournament.name}</Text>
        <View style={styles.scoreContainer}>
          <View style={styles.teamContainer}>
            <Text style={styles.teamName}>{team.name}</Text>
            <Text style={styles.scoreText}>{score.heim}</Text>
          </View>
          <Text style={styles.vsText}>:</Text>
          <View style={styles.teamContainer}>
            <Text style={styles.scoreText}>{score.gegner}</Text>
            <Text style={styles.teamName}>{match.gegnerName}</Text>
          </View>
        </View>
        {match.feld && (
          <View style={styles.feldBadge}>
            <MaterialIcons name="place" size={14} color={theme.colors.text.secondary} />
            <Text style={styles.feldText}>{match.feld}</Text>
          </View>
        )}
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            {match.status === MatchStatus.GEPLANT && 'Geplant'}
            {match.status === MatchStatus.LAUFEND && 'Live'}
            {match.status === MatchStatus.ABGESCHLOSSEN && 'Beendet'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tore ({goalEvents.length})</Text>
          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
            <MaterialIcons name="add" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {goalEvents.length === 0 ? (
          <View style={styles.emptyEvents}>
            <MaterialIcons name="sports-soccer" size={48} color={theme.colors.text.light} />
            <Text style={styles.emptyText}>Noch keine Tore</Text>
            <Button title="Tor hinzufügen" onPress={() => setModalVisible(true)} size="sm" />
          </View>
        ) : (
          <FlatList
            data={goalEvents.sort((a, b) => a.spielminute - b.spielminute)}
            renderItem={renderEvent}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.eventsList}
          />
        )}
      </View>

      <View style={styles.footer}>
        <Button
          title="Live-Erfassung starten"
          onPress={() => router.push(`/live/${id}`)}
          icon={<MaterialIcons name="play-arrow" size={24} color={theme.colors.text.inverse} />}
        />
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
                    <Text style={styles.modalTitle}>Tor hinzufügen</Text>
                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                      <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.torTypeSelector}>
                    <TouchableOpacity
                      style={[styles.torTypeButton, !isGegnertor && styles.torTypeButtonActive]}
                      onPress={() => setIsGegnertor(false)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.torTypeText, !isGegnertor && styles.torTypeTextActive]}>
                        Eigenes Tor
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.torTypeButton, isGegnertor && styles.torTypeButtonActive]}
                      onPress={() => setIsGegnertor(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.torTypeText, isGegnertor && styles.torTypeTextActive]}>
                        Gegentor
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {!isGegnertor && (
                    <TouchableOpacity
                      style={styles.picker}
                      onPress={() => {
                        setModalVisible(false);
                        setTimeout(() => setPlayerPickerVisible(true), 300);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.pickerLabel}>Torschütze *</Text>
                      <View style={styles.pickerValue}>
                        <Text style={[styles.pickerText, !selectedPlayerId && styles.pickerPlaceholder]}>
                          {selectedPlayerId ? players.find(p => p.id === selectedPlayerId)?.name : 'Spieler auswählen'}
                        </Text>
                        <MaterialIcons name="arrow-drop-down" size={24} color={theme.colors.text.secondary} />
                      </View>
                    </TouchableOpacity>
                  )}
                  
                  <Input
                    label="Minute *"
                    placeholder="z.B. 7"
                    value={minute}
                    onChangeText={setMinute}
                    keyboardType="numeric"
                    autoFocus={isGegnertor}
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
                      onPress={handleAddGoal}
                      disabled={!minute.trim() || (!isGegnertor && !selectedPlayerId)}
                      style={styles.modalButton}
                    />
                  </View>
                </View>
              </ScrollView>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={playerPickerVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => {
          setPlayerPickerVisible(false);
          setTimeout(() => setModalVisible(true), 300);
        }}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.pickerModal}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Spieler auswählen</Text>
                  <TouchableOpacity onPress={() => {
                    setPlayerPickerVisible(false);
                    setTimeout(() => setModalVisible(true), 300);
                  }}>
                    <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
                  </TouchableOpacity>
                </View>
                <ScrollView bounces={false}>
                  {players.map(player => (
                    <TouchableOpacity
                      key={player.id}
                      style={[styles.playerOption, player.id === selectedPlayerId && styles.playerOptionSelected]}
                      onPress={() => {
                        setSelectedPlayerId(player.id);
                        setPlayerPickerVisible(false);
                        setTimeout(() => setModalVisible(true), 300);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.playerAvatar}>
                        <Text style={styles.playerInitials}>
                          {player.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </Text>
                      </View>
                      <View style={styles.playerInfo}>
                        <Text style={styles.playerName}>{player.name}</Text>
                        {player.nummer && <Text style={styles.playerNummer}>#{player.nummer}</Text>}
                      </View>
                      {player.id === selectedPlayerId && (
                        <MaterialIcons name="check" size={24} color={theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={editMatchVisible} transparent animationType="slide">
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
                    <Text style={styles.modalTitle}>Spiel bearbeiten</Text>
                    <TouchableOpacity onPress={() => setEditMatchVisible(false)}>
                      <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
                    </TouchableOpacity>
                  </View>
                  
                  <Input
                    label="Gegner *"
                    placeholder="z.B. Teutonia Obernau"
                    value={editGegnerName}
                    onChangeText={setEditGegnerName}
                    autoFocus
                  />
                  
                  <Input
                    label="Spieldauer (Minuten) *"
                    placeholder="z.B. 10"
                    value={editDauerMin}
                    onChangeText={setEditDauerMin}
                    keyboardType="numeric"
                  />
                  
                  <Input
                    label="Feld"
                    placeholder="z.B. Feld 1"
                    value={editFeld}
                    onChangeText={setEditFeld}
                  />
                  
                  <View style={styles.modalActions}>
                    <Button
                      title="Abbrechen"
                      variant="outline"
                      onPress={() => setEditMatchVisible(false)}
                      style={styles.modalButton}
                    />
                    <Button
                      title="Speichern"
                      onPress={handleSaveMatch}
                      disabled={!editGegnerName.trim() || !editDauerMin.trim()}
                      style={styles.modalButton}
                    />
                  </View>
                </View>
              </ScrollView>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    position: 'absolute',
    top: Platform.select({ ios: 50, android: 10, default: 10 }),
    left: theme.spacing.md,
    right: theme.spacing.md,
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    ...theme.shadows.md,
  },
  editButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    ...theme.shadows.md,
  },
  header: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tournamentName: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  teamContainer: {
    alignItems: 'center',
  },
  teamName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  scoreText: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  vsText: {
    fontSize: theme.fontSize.xxl,
    color: theme.colors.text.light,
  },
  feldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  feldText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  statusText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.inverse,
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
  emptyEvents: {
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
  eventsList: {
    padding: theme.spacing.md,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  eventIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  eventInfo: {
    flex: 1,
  },
  eventText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  eventMinute: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  deleteEventButton: {
    padding: theme.spacing.xs,
  },
  footer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
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
  torTypeSelector: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  torTypeButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  torTypeButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  torTypeText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  torTypeTextActive: {
    color: theme.colors.text.inverse,
  },
  picker: {
    marginBottom: theme.spacing.md,
  },
  pickerLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  pickerValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minHeight: 48,
  },
  pickerText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text.primary,
  },
  pickerPlaceholder: {
    color: theme.colors.text.light,
  },
  pickerModal: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    maxHeight: '60%',
  },
  playerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xs,
  },
  playerOptionSelected: {
    backgroundColor: theme.colors.background,
  },
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  playerInitials: {
    fontSize: theme.fontSize.sm,
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
});
