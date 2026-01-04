import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView, Alert, ActivityIndicator, Platform, TouchableWithoutFeedback, Share, Clipboard, Keyboard, KeyboardAvoidingView } from 'react-native';
import FormationEditor from '../../components/feature/FormationEditor';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Screen from '../../components/layout/Screen';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useTournaments } from '../../hooks/useTournaments';
import { useTeams } from '../../hooks/useTeams';
import { MatchStatus, Wetter, EventType } from '../../types';
import { theme } from '../../constants/theme';
import { reportsApi } from '../../services/api';

export default function TournamentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getTournamentById, getTournamentMatches, addMatch, updateTournament, updateMatchFormation, getMatchScore, getTournamentTopScorers, getTournamentStats, getMatchEvents, deleteTournament, deleteMatch, reorderMatch, refreshData } = useTournaments();
  const { teams, getPlayerById, getTeamPlayers } = useTeams();
  const [modalVisible, setModalVisible] = useState(false);
  const [teamId, setTeamId] = useState('');
  const [gegnerName, setGegnerName] = useState('');
  const [dauerMin, setDauerMin] = useState('10');
  const [feld, setFeld] = useState('');
  const [teamPickerVisible, setTeamPickerVisible] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportText, setReportText] = useState<string | null>(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [specialNotesModalVisible, setSpecialNotesModalVisible] = useState(false);
  const [specialNotes, setSpecialNotes] = useState('');
  const specialNotesRef = useRef('');
  const [deleteAlertVisible, setDeleteAlertVisible] = useState(false);
  const [formationEditorVisible, setFormationEditorVisible] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [deletingMatchId, setDeletingMatchId] = useState<string | null>(null);
  const [editTournamentVisible, setEditTournamentVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editOrt, setEditOrt] = useState('');
  const [editDatum, setEditDatum] = useState('');
  const [editWetter, setEditWetter] = useState<Wetter | undefined>(undefined);
  const [editWetterPickerVisible, setEditWetterPickerVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const tournament = getTournamentById(id as string);
  const matches = getTournamentMatches(id as string);
  const topScorers = getTournamentTopScorers(id as string);
  const stats = getTournamentStats(id as string);
  const [activeTab, setActiveTab] = useState<'matches' | 'stats'>('matches');

  const handleAddMatch = async () => {
    if (!teamId || !gegnerName.trim() || !dauerMin.trim()) return;
    
    const matchId = await addMatch({
      tournamentId: id as string,
      teamId,
      gegnerName,
      dauerMin: parseInt(dauerMin),
      feld,
      status: MatchStatus.GEPLANT,
    });
    
    setTeamId('');
    setGegnerName('');
    setDauerMin('10');
    setFeld('');
    setModalVisible(false);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('de-DE', { 
      weekday: 'long',
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const handleOpenReportDialog = () => {
    if (!tournament || stats.completedMatches === 0) {
      Alert.alert('Keine Daten', 'Bitte schließe mindestens ein Spiel ab, um einen Bericht zu generieren.');
      return;
    }
    setSpecialNotes('');
    specialNotesRef.current = '';
    setSpecialNotesModalVisible(true);
  };
  
  const handleSpecialNotesChange = (text: string) => {
    setSpecialNotes(text);
    specialNotesRef.current = text;
  };

  const handleGenerateReport = async () => {
    setSpecialNotesModalVisible(false);
    
    if (!tournament || stats.completedMatches === 0) {
      return;
    }

    setGeneratingReport(true);

    try {
      // Get first team from matches
      const firstMatch = matches.find(m => m.status === MatchStatus.ABGESCHLOSSEN);
      if (!firstMatch) {
        throw new Error('Kein abgeschlossenes Spiel gefunden');
      }

      const team = teams.find(t => t.id === firstMatch.teamId);
      if (!team) {
        throw new Error('Team nicht gefunden');
      }

      // Collect all participants (players who played in the tournament)
      const allParticipantsMap = new Map<string, { name: string; teamName: string; goals: number }>();
      
      // Prepare match data with scorers, team info, and participants
      const matchesData = matches
        .filter(m => m.status === MatchStatus.ABGESCHLOSSEN)
        .map(match => {
          const matchTeam = teams.find(t => t.id === match.teamId);
          const score = getMatchScore(match.id);
          const matchEvents = getMatchEvents(match.id);
          const goalEvents = matchEvents.filter(e => e.typ === EventType.TOR_HEIM && e.playerId);
          
          const scorers = goalEvents.map(event => {
            const player = getPlayerById(event.playerId!);
            return {
              name: player?.name || 'Unbekannt',
              minute: event.spielminute,
            };
          });

          // Get participants from match formation (starters)
          const participants: string[] = [];
          if (match.formation?.starters) {
            match.formation.starters.forEach((starter: any) => {
              const player = getPlayerById(starter.playerId);
              if (player) {
                participants.push(player.name);
                // Track all participants across all matches
                if (!allParticipantsMap.has(player.id)) {
                  allParticipantsMap.set(player.id, {
                    name: player.name,
                    teamName: matchTeam?.name || 'Team',
                    goals: 0
                  });
                }
              }
            });
          }
          
          // If no formation, use all team players as fallback
          if (participants.length === 0) {
            const teamPlayers = getTeamPlayers(match.teamId);
            teamPlayers.forEach(player => {
              participants.push(player.name);
              if (!allParticipantsMap.has(player.id)) {
                allParticipantsMap.set(player.id, {
                  name: player.name,
                  teamName: matchTeam?.name || 'Team',
                  goals: 0
                });
              }
            });
          }

          return {
            teamName: matchTeam?.name || 'Team',
            teamTrainer: matchTeam?.trainer,
            gegnerName: match.gegnerName,
            feld: match.feld,
            score,
            scorers,
            participants,
          };
        });

      // Add goal counts to participants
      topScorers.forEach(scorer => {
        const participant = allParticipantsMap.get(scorer.playerId);
        if (participant) {
          participant.goals = scorer.goals;
        }
      });

      // Prepare top scorers data
      const scorersData = topScorers.slice(0, 5).map(scorer => {
        const player = getPlayerById(scorer.playerId);
        return {
          name: player?.name || 'Unbekannt',
          goals: scorer.goals,
        };
      });

      // Prepare all participants data
      const allParticipantsData = Array.from(allParticipantsMap.values())
        .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name));

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/10e0df59-8984-489e-a8e0-68a25e6b5450',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/tournament/[id].tsx:handleGenerateReport',message:'generate report (azure)',data:{matches:matchesData.length,participants:allParticipantsData.length,completedMatches:stats.completedMatches},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      const data = await reportsApi.generate({
        tournament: {
          name: tournament.name,
          ort: tournament.ort,
          datum: tournament.datum,
          wetter: tournament.wetter,
        },
        matches: matchesData,
        topScorers: scorersData,
        stats,
        allParticipants: allParticipantsData,
        specialNotes: specialNotesRef.current.trim() || undefined,
      });

      setReportText(data.report);
      setReportModalVisible(true);
    } catch (error: any) {
      console.error('Error generating report:', error);
      Alert.alert(
        'Fehler',
        error.message || 'Der Spielbericht konnte nicht generiert werden. Bitte stelle sicher, dass das Azure Backend erreichbar ist.'
      );
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleEditTournament = () => {
    if (!tournament) return;
    setEditName(tournament.name);
    setEditOrt(tournament.ort);
    const date = new Date(tournament.datum);
    setEditDatum(date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }));
    setEditWetter(tournament.wetter);
    setEditTournamentVisible(true);
  };

  const handleSaveTournament = async () => {
    if (!editName.trim() || !editOrt.trim() || !editDatum.trim()) return;
    
    try {
      const dateParts = editDatum.split('.');
      let timestamp = Date.now();
      if (dateParts.length === 3) {
        const [day, month, year] = dateParts;
        timestamp = new Date(`${year}-${month}-${day}`).getTime();
      }
      
      await updateTournament(id as string, {
        name: editName,
        ort: editOrt,
        datum: timestamp,
        wetter: editWetter,
      });
      
      setEditTournamentVisible(false);
    } catch (error) {
      console.error('Error updating tournament:', error);
      alert(`Fehler beim Aktualisieren: ${error}`);
    }
  };

  const handleDeleteTournament = async () => {
    if (Platform.OS === 'web') {
      setDeleteAlertVisible(true);
    } else {
      Alert.alert(
        'Turnier löschen',
        'Möchtest du dieses Turnier wirklich löschen? Alle Spiele und Daten werden gelöscht.',
        [
          { text: 'Abbrechen', style: 'cancel' },
          {
            text: 'Löschen',
            style: 'destructive',
            onPress: async () => {
              await deleteTournament(id as string);
              router.back();
            },
          },
        ]
      );
    }
  };

  const confirmDeleteTournament = async () => {
    setDeleteAlertVisible(false);
    await deleteTournament(id as string);
    router.back();
  };

  const handleEditMatchFormation = (matchId: string) => {
    setEditingMatchId(matchId);
    setFormationEditorVisible(true);
  };

  const handleDeleteMatchClick = (matchId: string) => {
    if (deletingMatchId === matchId) {
      // Second click - confirm delete
      deleteMatch(matchId);
      setDeletingMatchId(null);
    } else {
      // First click - show confirmation
      setDeletingMatchId(matchId);
      // Auto-cancel after 3 seconds
      setTimeout(() => {
        setDeletingMatchId(null);
      }, 3000);
    }
  };

  const renderMatch = ({ item, index }: { item: any; index: number }) => {
    const team = teams.find(t => t.id === item.teamId);
    const score = getMatchScore(item.id);
    const teamPlayers = getTeamPlayers(item.teamId);
    const isDeleting = deletingMatchId === item.id;
    const isFirst = index === 0;
    const isLast = index === matches.length - 1;
    
    const statusColors = {
      [MatchStatus.GEPLANT]: theme.colors.text.secondary,
      [MatchStatus.LAUFEND]: theme.colors.success,
      [MatchStatus.ABGESCHLOSSEN]: theme.colors.primary,
    };

    const handleReorder = async (direction: 'up' | 'down') => {
      await reorderMatch(item.id, direction);
    };

    return (
      <TouchableOpacity
        style={styles.matchCard}
        onPress={() => router.push(`/match/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.matchHeader}>
          <View style={styles.matchHeaderLeft}>
            <View style={styles.reorderButtons}>
              <TouchableOpacity 
                onPress={(e) => { e.stopPropagation(); handleReorder('up'); }}
                disabled={isFirst}
                style={[styles.reorderButton, isFirst && styles.reorderButtonDisabled]}
              >
                <MaterialIcons name="keyboard-arrow-up" size={24} color={isFirst ? theme.colors.text.light : theme.colors.text.primary} />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={(e) => { e.stopPropagation(); handleReorder('down'); }}
                disabled={isLast}
                style={[styles.reorderButton, isLast && styles.reorderButtonDisabled]}
              >
                <MaterialIcons name="keyboard-arrow-down" size={24} color={isLast ? theme.colors.text.light : theme.colors.text.primary} />
              </TouchableOpacity>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] }]}>
              <Text style={styles.statusText}>
                {item.status === MatchStatus.GEPLANT && 'Geplant'}
                {item.status === MatchStatus.LAUFEND && 'Live'}
                {item.status === MatchStatus.ABGESCHLOSSEN && 'Beendet'}
              </Text>
            </View>
            {item.feld && <Text style={styles.feldText}>{item.feld}</Text>}
          </View>
          <TouchableOpacity 
            onPress={() => handleDeleteMatchClick(item.id)}
            style={[styles.deleteMatchButton, isDeleting && styles.deleteMatchButtonConfirm]}
            activeOpacity={0.7}
          >
            <MaterialIcons 
              name={isDeleting ? "warning" : "delete"} 
              size={20} 
              color={theme.colors.error} 
            />
            {isDeleting && (
              <Text style={styles.deleteMatchConfirmText}>Löschen?</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.matchContent}>
          <View style={styles.teamRow}>
            <Text style={styles.teamName}>{team?.name || 'Team'}</Text>
            {item.status !== MatchStatus.GEPLANT && (
              <Text style={styles.score}>{score.heim}</Text>
            )}
          </View>
          <View style={styles.vsRow}>
            <Text style={styles.vsText}>vs</Text>
          </View>
          <View style={styles.teamRow}>
            <Text style={styles.teamName}>{item.gegnerName}</Text>
            {item.status !== MatchStatus.GEPLANT && (
              <Text style={styles.score}>{score.gegner}</Text>
            )}
          </View>
        </View>

        <View style={styles.matchActions}>
          <TouchableOpacity
            style={styles.formationMatchButton}
            onPress={(e) => {
              e.stopPropagation();
              handleEditMatchFormation(item.id);
            }}
            disabled={teamPlayers.length === 0}
          >
            <MaterialIcons 
              name="sports" 
              size={20} 
              color={teamPlayers.length === 0 ? theme.colors.text.light : theme.colors.primary} 
            />
            <Text style={[styles.formationMatchButtonText, teamPlayers.length === 0 && styles.formationMatchButtonTextDisabled]}>
              Aufstellung
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.playMatchButton}
            onPress={(e) => {
              e.stopPropagation();
              router.push(`/live/${item.id}`);
            }}
          >
            <MaterialIcons name="play-arrow" size={24} color={theme.colors.text.inverse} />
            <Text style={styles.playButtonText}>Live</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (!tournament) {
    return (
      <Screen>
        <Text>Turnier nicht gefunden</Text>
      </Screen>
    );
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Screen scroll={false} padding={false}>
      <View style={styles.headerActions}>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          activeOpacity={0.7}
          disabled={refreshing}
        >
          <MaterialIcons 
            name="refresh" 
            size={24} 
            color={refreshing ? theme.colors.text.light : theme.colors.primary} 
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.editButton}
          onPress={handleEditTournament}
          activeOpacity={0.7}
        >
          <MaterialIcons name="edit" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteTournament}
          activeOpacity={0.7}
        >
          <MaterialIcons name="delete" size={24} color={theme.colors.error} />
        </TouchableOpacity>
      </View>
      <View style={styles.header}>
        <View style={styles.tournamentIcon}>
          <MaterialIcons name="emoji-events" size={48} color={theme.colors.goal} />
        </View>
        <Text style={styles.tournamentName}>{tournament.name}</Text>
        <View style={styles.tournamentMeta}>
          <MaterialIcons name="location-on" size={16} color={theme.colors.text.secondary} />
          <Text style={styles.metaText}>{tournament.ort}</Text>
        </View>
        <Text style={styles.dateText}>{formatDate(tournament.datum)}</Text>
        {tournament.wetter && (
          <View style={styles.wetterBadge}>
            <Text style={styles.wetterText}>
              {tournament.wetter === Wetter.SONNIG && '☀️'}
              {tournament.wetter === Wetter.BEWOELKT && '☁️'}
              {tournament.wetter === Wetter.REGEN && '🌧️'}
              {tournament.wetter === Wetter.SCHNEE && '❄️'}
              {tournament.wetter === Wetter.WIND && '💨'}
              {' '}{tournament.wetter}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'matches' && styles.tabActive]}
          onPress={() => setActiveTab('matches')}
        >
          <Text style={[styles.tabText, activeTab === 'matches' && styles.tabTextActive]}>Spiele</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'stats' && styles.tabActive]}
          onPress={() => setActiveTab('stats')}
        >
          <Text style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}>Fazit</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'matches' ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Spiele ({matches.length})</Text>
            <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
              <MaterialIcons name="add" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          {matches.length === 0 ? (
            <View style={styles.emptyMatches}>
              <MaterialIcons name="sports-soccer" size={48} color={theme.colors.text.light} />
              <Text style={styles.emptyText}>Noch keine Spiele</Text>
              <Button title="Spiel hinzufügen" onPress={() => setModalVisible(true)} size="sm" />
            </View>
          ) : (
            <FlatList
              data={matches}
              renderItem={renderMatch}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.matchesList}
            />
          )}
        </View>
      ) : (
        <ScrollView style={styles.section}>
          <View style={styles.statsContainer}>
            <TouchableOpacity
              style={[styles.generateButton, (generatingReport || stats.completedMatches === 0) && styles.generateButtonDisabled]}
              onPress={handleOpenReportDialog}
              disabled={generatingReport || stats.completedMatches === 0}
            >
              {generatingReport ? (
                <ActivityIndicator color={theme.colors.text.inverse} />
              ) : (
                <MaterialIcons name="auto-awesome" size={24} color={theme.colors.text.inverse} />
              )}
              <Text style={styles.generateButtonText}>
                {generatingReport ? 'Wird generiert...' : 'KI-Spielbericht generieren'}
              </Text>
            </TouchableOpacity>
            
            <View style={styles.statsCard}>
              <Text style={styles.statsCardTitle}>Gesamtstatistik</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.completedMatches}/{stats.totalMatches}</Text>
                  <Text style={styles.statLabel}>Spiele</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.colors.success }]}>{stats.wins}</Text>
                  <Text style={styles.statLabel}>Siege</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.colors.text.secondary }]}>{stats.draws}</Text>
                  <Text style={styles.statLabel}>Unentschieden</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.colors.error }]}>{stats.losses}</Text>
                  <Text style={styles.statLabel}>Niederlagen</Text>
                </View>
              </View>
              <View style={styles.goalsRow}>
                <View style={styles.goalsStat}>
                  <MaterialIcons name="sports-soccer" size={20} color={theme.colors.success} />
                  <Text style={styles.goalsText}>{stats.totalGoalsScored} Tore erzielt</Text>
                </View>
                <View style={styles.goalsStat}>
                  <MaterialIcons name="sports-soccer" size={20} color={theme.colors.error} />
                  <Text style={styles.goalsText}>{stats.totalGoalsConceded} Gegentore</Text>
                </View>
              </View>
            </View>

            <View style={styles.statsCard}>
              <Text style={styles.statsCardTitle}>Torschützenliste</Text>
              {topScorers.length === 0 ? (
                <Text style={styles.emptyText}>Noch keine Tore</Text>
              ) : (
                topScorers.map((scorer, index) => {
                  const player = getPlayerById(scorer.playerId);
                  return (
                    <View key={scorer.playerId} style={styles.scorerItem}>
                      <View style={styles.scorerRank}>
                        <Text style={styles.scorerRankText}>{index + 1}</Text>
                      </View>
                      <View style={styles.scorerInfo}>
                        <Text style={styles.scorerName}>{player?.name || 'Unbekannt'}</Text>
                        <Text style={styles.scorerMatches}>{scorer.matches.length} Spiel{scorer.matches.length !== 1 ? 'e' : ''}</Text>
                      </View>
                      <View style={styles.scorerGoals}>
                        <MaterialIcons name="sports-soccer" size={18} color={theme.colors.goal} />
                        <Text style={styles.scorerGoalsText}>{scorer.goals}</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            <View style={styles.statsCard}>
              <Text style={styles.statsCardTitle}>Alle Ergebnisse</Text>
              {stats.completedMatches === 0 ? (
                <Text style={styles.emptyText}>Noch keine abgeschlossenen Spiele</Text>
              ) : (
                matches
                  .filter(m => m.status === MatchStatus.ABGESCHLOSSEN)
                  .map(match => {
                    const team = teams.find(t => t.id === match.teamId);
                    const score = getMatchScore(match.id);
                    const result = score.heim > score.gegner ? 'W' : score.heim === score.gegner ? 'D' : 'L';
                    const resultColor = result === 'W' ? theme.colors.success : result === 'D' ? theme.colors.text.secondary : theme.colors.error;
                    
                    return (
                      <TouchableOpacity
                        key={match.id}
                        style={styles.resultItem}
                        onPress={() => router.push(`/match/${match.id}`)}
                      >
                        <View style={[styles.resultBadge, { backgroundColor: resultColor }]}>
                          <Text style={styles.resultBadgeText}>{result}</Text>
                        </View>
                        <View style={styles.resultInfo}>
                          <Text style={styles.resultTeams}>
                            {team?.name || 'Team'} vs {match.gegnerName}
                          </Text>
                          {match.feld && <Text style={styles.resultField}>{match.feld}</Text>}
                        </View>
                        <Text style={styles.resultScore}>{score.heim}:{score.gegner}</Text>
                      </TouchableOpacity>
                    );
                  })
              )}
            </View>
          </View>
        </ScrollView>
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Neues Spiel</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity
                style={styles.picker}
                onPress={() => {
                  setModalVisible(false);
                  setTimeout(() => setTeamPickerVisible(true), 300);
                }}
              >
                <Text style={styles.pickerLabel}>Eigenes Team *</Text>
                <View style={styles.pickerValue}>
                  <Text style={[styles.pickerText, !teamId && styles.pickerPlaceholder]}>
                    {teamId ? teams.find(t => t.id === teamId)?.name : 'Team auswählen'}
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={24} color={theme.colors.text.secondary} />
                </View>
              </TouchableOpacity>
              
              <Input
                label="Gegner *"
                placeholder="z.B. Teutonia Obernau"
                value={gegnerName}
                onChangeText={setGegnerName}
              />
              
              <Input
                label="Spieldauer (Minuten) *"
                placeholder="z.B. 12"
                value={dauerMin}
                onChangeText={setDauerMin}
                keyboardType="numeric"
              />
              
              <Input
                label="Feld"
                placeholder="z.B. Feld 1"
                value={feld}
                onChangeText={setFeld}
              />
              
              <View style={styles.modalActions}>
                <Button
                  title="Abbrechen"
                  variant="outline"
                  onPress={() => setModalVisible(false)}
                  style={styles.modalButton}
                />
                <Button
                  title="Erstellen"
                  onPress={handleAddMatch}
                  disabled={!teamId || !gegnerName.trim() || !dauerMin.trim()}
                  style={styles.modalButton}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={teamPickerVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => {
          setTeamPickerVisible(false);
          setTimeout(() => setModalVisible(true), 300);
        }}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.pickerModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Team auswählen</Text>
              <TouchableOpacity onPress={() => {
                setTeamPickerVisible(false);
                setTimeout(() => setModalVisible(true), 300);
              }}>
                <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {teams.map(team => (
                <TouchableOpacity
                  key={team.id}
                  style={[styles.teamOption, team.id === teamId && styles.teamOptionSelected]}
                  onPress={() => {
                    setTeamId(team.id);
                    setTeamPickerVisible(false);
                    setTimeout(() => setModalVisible(true), 300);
                  }}
                >
                  <Text style={styles.teamOptionText}>{team.name}</Text>
                  {team.id === teamId && (
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

      {/* Special Notes Modal */}
      <Modal visible={specialNotesModalVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.specialNotesContainer}
            >
              <View style={styles.specialNotesModal}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Besonderheiten</Text>
                  <TouchableOpacity onPress={() => setSpecialNotesModalVisible(false)}>
                    <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.specialNotesHint}>
                  Gib hier besondere Vorkommnisse oder Highlights des Turniers ein, die im Bericht erwähnt werden sollen (optional):
                </Text>
                
                <Input
                  value={specialNotes}
                  onChangeText={handleSpecialNotesChange}
                  placeholder="z.B. Erstes Turnier der Saison, besondere Spielzüge, Wetterbedingungen..."
                  multiline
                  numberOfLines={4}
                  style={styles.specialNotesInput}
                />
                
                <View style={styles.specialNotesButtons}>
                  <TouchableOpacity
                    style={styles.skipButton}
                    onPress={() => {
                      setSpecialNotes('');
                      specialNotesRef.current = '';
                      handleGenerateReport();
                    }}
                  >
                    <Text style={styles.skipButtonText}>Überspringen</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={handleGenerateReport}
                  >
                    <MaterialIcons name="auto-awesome" size={20} color={theme.colors.text.inverse} />
                    <Text style={styles.confirmButtonText}>Bericht erstellen</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={reportModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.reportModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Spielbericht</Text>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.reportScroll}>
              <Text style={styles.reportText}>{reportText}</Text>
            </ScrollView>
            <View style={styles.reportActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={async () => {
                  if (Platform.OS === 'web') {
                    await navigator.clipboard.writeText(reportText || '');
                    Alert.alert('Erfolg', 'Spielbericht wurde in die Zwischenablage kopiert');
                  } else {
                    Clipboard.setString(reportText || '');
                    Alert.alert('Erfolg', 'Spielbericht wurde in die Zwischenablage kopiert');
                  }
                }}
              >
                <MaterialIcons name="content-copy" size={20} color={theme.colors.primary} />
                <Text style={styles.actionButtonText}>Kopieren</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={async () => {
                  if (Platform.OS !== 'web') {
                    try {
                      await Share.share({
                        message: reportText || '',
                        title: `${tournament.name} - Spielbericht`,
                      });
                    } catch (error: any) {
                      Alert.alert('Fehler', 'Teilen fehlgeschlagen');
                    }
                  } else {
                    Alert.alert('Info', 'Teilen ist auf Web nicht verfügbar. Bitte verwende die Kopieren-Funktion.');
                  }
                }}
              >
                <MaterialIcons name="share" size={20} color={theme.colors.primary} />
                <Text style={styles.actionButtonText}>Teilen</Text>
              </TouchableOpacity>
              <Button
                title="Schließen"
                onPress={() => setReportModalVisible(false)}
                style={styles.closeButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {Platform.OS === 'web' && (
        <Modal visible={deleteAlertVisible} transparent animationType="fade">
          <View style={styles.alertOverlay}>
            <View style={styles.alertBox}>
              <Text style={styles.alertTitle}>Turnier löschen</Text>
              <Text style={styles.alertMessage}>
                Möchtest du dieses Turnier wirklich löschen? Alle Spiele und Daten werden gelöscht.
              </Text>
              <View style={styles.alertActions}>
                <TouchableOpacity
                  style={[styles.alertButton, styles.alertButtonSecondary]}
                  onPress={() => setDeleteAlertVisible(false)}
                >
                  <Text style={styles.alertButtonTextSecondary}>Abbrechen</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.alertButton, styles.alertButtonDanger]}
                  onPress={confirmDeleteTournament}
                >
                  <Text style={styles.alertButtonText}>Löschen</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {editingMatchId && (
        <Modal visible={formationEditorVisible} animationType="slide">
          <FormationEditor
            players={getTeamPlayers(matches.find(m => m.id === editingMatchId)?.teamId || '')}
            formation={
              matches.find(m => m.id === editingMatchId)?.formation ||
              teams.find(t => t.id === matches.find(m => m.id === editingMatchId)?.teamId)?.formation
            }
            onSave={async (formation) => {
              await updateMatchFormation(editingMatchId, formation);
              setFormationEditorVisible(false);
              setEditingMatchId(null);
            }}
            onCancel={() => {
              setFormationEditorVisible(false);
              setEditingMatchId(null);
            }}
          />
        </Modal>
      )}

      <Modal visible={editTournamentVisible} transparent animationType="slide">
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
                    <Text style={styles.modalTitle}>Turnier bearbeiten</Text>
                    <TouchableOpacity onPress={() => setEditTournamentVisible(false)}>
                      <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
                    </TouchableOpacity>
                  </View>
                  
                  <Input
                    label="Turniername *"
                    placeholder="z.B. Herbstcup 2025"
                    value={editName}
                    onChangeText={setEditName}
                    autoFocus
                  />
                  
                  <Input
                    label="Ort *"
                    placeholder="z.B. TVS-Platz"
                    value={editOrt}
                    onChangeText={setEditOrt}
                  />
                  
                  <Input
                    label="Datum * (TT.MM.JJJJ)"
                    placeholder="z.B. 18.10.2025"
                    value={editDatum}
                    onChangeText={setEditDatum}
                  />
                  
                  <TouchableOpacity
                    style={styles.picker}
                    onPress={() => {
                      setEditTournamentVisible(false);
                      setTimeout(() => setEditWetterPickerVisible(true), 300);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.pickerLabel}>Wetter</Text>
                    <View style={styles.pickerValue}>
                      <Text style={[styles.pickerText, !editWetter && styles.pickerPlaceholder]}>
                        {editWetter || 'Wetter auswählen (optional)'}
                      </Text>
                      <MaterialIcons name="arrow-drop-down" size={24} color={theme.colors.text.secondary} />
                    </View>
                  </TouchableOpacity>
                  
                  <View style={styles.modalActions}>
                    <Button
                      title="Abbrechen"
                      variant="outline"
                      onPress={() => setEditTournamentVisible(false)}
                      style={styles.modalButton}
                    />
                    <Button
                      title="Speichern"
                      onPress={handleSaveTournament}
                      disabled={!editName.trim() || !editOrt.trim() || !editDatum.trim()}
                      style={styles.modalButton}
                    />
                  </View>
                </View>
              </ScrollView>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={editWetterPickerVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => {
          setEditWetterPickerVisible(false);
          setTimeout(() => setEditTournamentVisible(true), 300);
        }}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.pickerModal}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Wetter auswählen</Text>
                  <TouchableOpacity onPress={() => {
                    setEditWetterPickerVisible(false);
                    setTimeout(() => setEditTournamentVisible(true), 300);
                  }}>
                    <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
                  </TouchableOpacity>
                </View>
                <ScrollView bounces={false}>
                  {Object.values(Wetter).map(w => (
                    <TouchableOpacity
                      key={w}
                      style={[styles.wetterOption, w === editWetter && styles.wetterOptionSelected]}
                      onPress={() => {
                        setEditWetter(w);
                        setEditWetterPickerVisible(false);
                        setTimeout(() => setEditTournamentVisible(true), 300);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.wetterIcon}>
                        {w === Wetter.SONNIG && '☀️'}
                        {w === Wetter.BEWOELKT && '☁️'}
                        {w === Wetter.REGEN && '🌧️'}
                        {w === Wetter.SCHNEE && '❄️'}
                        {w === Wetter.WIND && '💨'}
                      </Text>
                      <Text style={styles.wetterText}>{w}</Text>
                      {w === editWetter && (
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    position: 'absolute',
    top: Platform.select({ ios: 50, android: 10, default: 10 }),
    right: theme.spacing.md,
    zIndex: 100,
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  refreshButton: {
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
  deleteButton: {
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
  tournamentIcon: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  tournamentName: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  tournamentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  metaText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.xs,
  },
  dateText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.light,
  },
  wetterBadge: {
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
  },
  wetterText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.primary,
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
  emptyMatches: {
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
  matchesList: {
    padding: theme.spacing.md,
  },
  matchCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  matchActions: {
    flexDirection: 'row',
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  formationMatchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    gap: theme.spacing.xs,
  },
  formationMatchButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary,
  },
  formationMatchButtonTextDisabled: {
    color: theme.colors.text.light,
  },
  playMatchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    gap: theme.spacing.xs,
  },
  playButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
  matchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  matchHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reorderButtons: {
    flexDirection: 'column',
    marginRight: theme.spacing.sm,
  },
  reorderButton: {
    padding: 2,
  },
  reorderButtonDisabled: {
    opacity: 0.3,
  },
  deleteMatchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  deleteMatchButtonConfirm: {
    backgroundColor: theme.colors.error,
    paddingHorizontal: theme.spacing.sm,
  },
  deleteMatchConfirmText: {
    color: theme.colors.text.inverse,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    marginLeft: theme.spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.sm,
  },
  statusText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
  feldText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  matchContent: {
    gap: theme.spacing.xs,
  },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamName: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
    flex: 1,
  },
  score: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
    marginLeft: theme.spacing.md,
    minWidth: 40,
    textAlign: 'right',
  },
  vsRow: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  vsText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.light,
    fontWeight: theme.fontWeight.medium,
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
    maxHeight: '80%',
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
  teamOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xs,
  },
  teamOptionSelected: {
    backgroundColor: theme.colors.background,
  },
  teamOptionText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text.primary,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.secondary,
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.bold,
  },
  statsContainer: {
    padding: theme.spacing.md,
  },
  statsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  statsCardTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.md,
  },
  statItem: {
    width: '50%',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  statValue: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  goalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  goalsStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalsText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.primary,
    marginLeft: theme.spacing.xs,
  },
  scorerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  scorerRank: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  scorerRankText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  scorerInfo: {
    flex: 1,
  },
  scorerName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  scorerMatches: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text.secondary,
  },
  scorerGoals: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scorerGoalsText: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
    marginLeft: theme.spacing.xs,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  resultBadge: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  resultBadgeText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
  resultInfo: {
    flex: 1,
  },
  resultTeams: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  resultField: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text.secondary,
  },
  resultScore: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  generateButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.inverse,
    marginLeft: theme.spacing.sm,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  reportModalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    maxHeight: '90%',
    height: '90%',
  },
  reportScroll: {
    flex: 1,
    marginVertical: theme.spacing.md,
  },
  reportText: {
    fontSize: theme.fontSize.md,
    lineHeight: 24,
    color: theme.colors.text.primary,
  },
  reportActions: {
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    gap: theme.spacing.sm,
  },
  actionButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary,
  },
  closeButton: {
    width: '100%',
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  alertBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    minWidth: 280,
    maxWidth: 400,
  },
  alertTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  alertMessage: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.lg,
  },
  alertActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  alertButton: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  alertButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  alertButtonDanger: {
    backgroundColor: theme.colors.error,
  },
  alertButtonText: {
    color: theme.colors.text.inverse,
    fontWeight: theme.fontWeight.bold,
    fontSize: theme.fontSize.md,
  },
  alertButtonTextSecondary: {
    color: theme.colors.text.primary,
    fontWeight: theme.fontWeight.bold,
    fontSize: theme.fontSize.md,
  },
  wetterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xs,
  },
  wetterOptionSelected: {
    backgroundColor: theme.colors.background,
  },
  wetterIcon: {
    fontSize: 24,
    marginRight: theme.spacing.md,
  },
  specialNotesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  specialNotesModal: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    width: '100%',
    maxWidth: 400,
    ...theme.shadows.lg,
  },
  specialNotesHint: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },
  specialNotesInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  specialNotesButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  skipButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text.secondary,
    fontWeight: theme.fontWeight.medium,
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  confirmButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
});
