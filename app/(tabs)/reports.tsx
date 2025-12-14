import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, FlatList, Alert, Share, Platform, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Screen from '../../components/layout/Screen';
import Header from '../../components/layout/Header';
import { useTournaments } from '../../hooks/useTournaments';
import { useTeams } from '../../hooks/useTeams';
import { useAuth } from '../../hooks/useAuth';
import { EventType, MatchStatus } from '../../types';
import { theme } from '../../constants/theme';
import { reportsApi } from '../../services/api';

type DateRange = 'week' | 'month' | '3months' | '6months' | 'year' | 'all';

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const { user, isTrainer } = useAuth();
  const { teams } = useTeams();
  const { tournaments, getTournamentMatches, getMatchEvents, getMatchScore } = useTournaments();
  const { getPlayerById } = useTeams();

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<DateRange>('month');
  const [teamPickerVisible, setTeamPickerVisible] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportText, setReportText] = useState<string | null>(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [specialNotesModalVisible, setSpecialNotesModalVisible] = useState(false);
  const [specialNotes, setSpecialNotes] = useState('');

  const dateRanges: { key: DateRange; label: string; days: number }[] = [
    { key: 'week', label: 'Letzte Woche', days: 7 },
    { key: 'month', label: 'Letzter Monat', days: 30 },
    { key: '3months', label: '3 Monate', days: 90 },
    { key: '6months', label: '6 Monate', days: 180 },
    { key: 'year', label: '1 Jahr', days: 365 },
    { key: 'all', label: 'Gesamt', days: 99999 },
  ];

  const selectedTeam = selectedTeamId ? teams.find(t => String(t.id) === String(selectedTeamId)) : null;
  const selectedRangeData = dateRanges.find(r => r.key === selectedRange);

  // Filter tournaments by team and date range
  const filteredData = useMemo(() => {
    const now = Date.now();
    const rangeMs = (selectedRangeData?.days || 30) * 24 * 60 * 60 * 1000;
    const startDate = selectedRange === 'all' ? 0 : now - rangeMs;

    // Get all matches for the selected team
    let allMatches: any[] = [];
    let relevantTournaments: any[] = [];

    tournaments.forEach(tournament => {
      // Ensure datum is a proper timestamp for comparison
      const tournamentDate = typeof tournament.datum === 'number' 
        ? tournament.datum 
        : new Date(tournament.datum).getTime();
      
      if (tournamentDate < startDate) return;

      const tournamentMatches = getTournamentMatches(tournament.id);
      const teamMatches = selectedTeamId 
        ? tournamentMatches.filter(m => String(m.teamId) === String(selectedTeamId))
        : tournamentMatches;

      if (teamMatches.length > 0) {
        relevantTournaments.push({
          ...tournament,
          matches: teamMatches,
        });
        allMatches = [...allMatches, ...teamMatches];
      }
    });

    // Calculate aggregate statistics
    const completedMatches = allMatches.filter(m => m.status === MatchStatus.ABGESCHLOSSEN);
    let totalGoalsScored = 0;
    let totalGoalsConceded = 0;
    let wins = 0;
    let draws = 0;
    let losses = 0;

    completedMatches.forEach(match => {
      const score = getMatchScore(match.id);
      totalGoalsScored += score.heim;
      totalGoalsConceded += score.gegner;

      if (score.heim > score.gegner) wins++;
      else if (score.heim < score.gegner) losses++;
      else draws++;
    });

    // Get top scorers across all matches
    const scorersMap = new Map<string, { playerId: string; goals: number; matches: string[] }>();
    
    allMatches.forEach(match => {
      const events = getMatchEvents(match.id);
      events.filter(e => e.typ === EventType.TOR_HEIM && e.playerId).forEach(event => {
        const existing = scorersMap.get(event.playerId!);
        if (existing) {
          existing.goals++;
          if (!existing.matches.includes(match.id)) {
            existing.matches.push(match.id);
          }
        } else {
          scorersMap.set(event.playerId!, {
            playerId: event.playerId!,
            goals: 1,
            matches: [match.id],
          });
        }
      });
    });

    const topScorers = Array.from(scorersMap.values())
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 10);

    return {
      tournaments: relevantTournaments,
      totalMatches: allMatches.length,
      completedMatches: completedMatches.length,
      wins,
      draws,
      losses,
      totalGoalsScored,
      totalGoalsConceded,
      topScorers,
      winRate: completedMatches.length > 0 
        ? Math.round((wins / completedMatches.length) * 100) 
        : 0,
      avgGoalsPerMatch: completedMatches.length > 0 
        ? (totalGoalsScored / completedMatches.length).toFixed(1) 
        : '0',
    };
  }, [tournaments, selectedTeamId, selectedRange, selectedRangeData, getTournamentMatches, getMatchEvents, getMatchScore]);

  const handleOpenReportDialog = () => {
    if (!selectedTeam) {
      Alert.alert('Hinweis', 'Bitte wähle zuerst eine Mannschaft aus');
      return;
    }

    if (filteredData.tournaments.length === 0) {
      Alert.alert('Hinweis', 'Keine Turniere im gewählten Zeitraum gefunden');
      return;
    }

    setSpecialNotes('');
    setSpecialNotesModalVisible(true);
  };

  const handleGenerateReport = async () => {
    setSpecialNotesModalVisible(false);
    
    if (!selectedTeam || filteredData.tournaments.length === 0) {
      return;
    }

    setGeneratingReport(true);
    try {
      // Prepare data for report generation
      const reportData = {
        team: {
          name: selectedTeam.name,
          jahrgang: selectedTeam.jahrgang,
        },
        period: selectedRangeData?.label || 'Unbekannt',
        tournaments: filteredData.tournaments.map(t => ({
          name: t.name,
          date: new Date(t.datum).toLocaleDateString('de-DE'),
          matchCount: t.matches.length,
        })),
        stats: {
          totalMatches: filteredData.totalMatches,
          completedMatches: filteredData.completedMatches,
          wins: filteredData.wins,
          draws: filteredData.draws,
          losses: filteredData.losses,
          goalsScored: filteredData.totalGoalsScored,
          goalsConceded: filteredData.totalGoalsConceded,
          winRate: filteredData.winRate,
        },
        topScorers: filteredData.topScorers.map(s => {
          const player = getPlayerById(s.playerId);
          return {
            name: player?.name || 'Unbekannt',
            goals: s.goals,
            matches: s.matches.length,
          };
        }),
      };

      const { report } = await reportsApi.generateSeasonReport({
        ...reportData,
        specialNotes: specialNotes.trim() || undefined,
      });
      setReportText(report);
      setReportModalVisible(true);
    } catch (error: any) {
      console.error('Error generating report:', error);
      Alert.alert('Fehler', error.message || 'Bericht konnte nicht erstellt werden');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleShareReport = async () => {
    if (!reportText) return;

    try {
      await Share.share({
        message: reportText,
        title: `Saisonbericht ${selectedTeam?.name || ''}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (!isTrainer) {
    return (
      <Screen>
        <Header title="Berichte" />
        <View style={styles.accessDenied}>
          <MaterialIcons name="lock" size={64} color={theme.colors.text.light} />
          <Text style={styles.accessDeniedText}>Nur für Trainer</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} padding={false}>
      <Header title="Saisonbericht" />

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        {/* Team Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mannschaft</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setTeamPickerVisible(true)}
          >
            <MaterialIcons name="groups" size={24} color={theme.colors.primary} />
            <Text style={styles.selectorText}>
              {selectedTeam ? selectedTeam.name : 'Mannschaft auswählen'}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={24} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Date Range Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Zeitraum</Text>
          <View style={styles.rangeGrid}>
            {dateRanges.map(range => (
              <TouchableOpacity
                key={range.key}
                style={[
                  styles.rangeButton,
                  selectedRange === range.key && styles.rangeButtonActive,
                ]}
                onPress={() => setSelectedRange(range.key)}
              >
                <Text style={[
                  styles.rangeButtonText,
                  selectedRange === range.key && styles.rangeButtonTextActive,
                ]}>
                  {range.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Statistics Overview */}
        {selectedTeam && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Übersicht</Text>
              
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{filteredData.tournaments.length}</Text>
                  <Text style={styles.statLabel}>Turniere</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{filteredData.completedMatches}/{filteredData.totalMatches}</Text>
                  <Text style={styles.statLabel}>Spiele</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: theme.colors.success }]}>{filteredData.winRate}%</Text>
                  <Text style={styles.statLabel}>Siegquote</Text>
                </View>
              </View>

              <View style={styles.resultsRow}>
                <View style={styles.resultItem}>
                  <View style={[styles.resultDot, { backgroundColor: theme.colors.success }]} />
                  <Text style={styles.resultText}>{filteredData.wins} Siege</Text>
                </View>
                <View style={styles.resultItem}>
                  <View style={[styles.resultDot, { backgroundColor: theme.colors.warning }]} />
                  <Text style={styles.resultText}>{filteredData.draws} Unentschieden</Text>
                </View>
                <View style={styles.resultItem}>
                  <View style={[styles.resultDot, { backgroundColor: theme.colors.error }]} />
                  <Text style={styles.resultText}>{filteredData.losses} Niederlagen</Text>
                </View>
              </View>

              <View style={styles.goalsRow}>
                <View style={styles.goalItem}>
                  <MaterialIcons name="sports-soccer" size={20} color={theme.colors.success} />
                  <Text style={styles.goalText}>{filteredData.totalGoalsScored} Tore erzielt</Text>
                </View>
                <View style={styles.goalItem}>
                  <MaterialIcons name="sports-soccer" size={20} color={theme.colors.error} />
                  <Text style={styles.goalText}>{filteredData.totalGoalsConceded} Gegentore</Text>
                </View>
              </View>
            </View>

            {/* Top Scorers */}
            {filteredData.topScorers.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top-Torschützen</Text>
                <View style={styles.scorersList}>
                  {filteredData.topScorers.slice(0, 5).map((scorer, index) => {
                    const player = getPlayerById(scorer.playerId);
                    return (
                      <View key={scorer.playerId} style={styles.scorerItem}>
                        <View style={styles.scorerRank}>
                          <Text style={styles.scorerRankText}>{index + 1}</Text>
                        </View>
                        <View style={styles.scorerInfo}>
                          <Text style={styles.scorerName}>{player?.name || 'Unbekannt'}</Text>
                          <Text style={styles.scorerMatches}>{scorer.matches.length} Spiele</Text>
                        </View>
                        <View style={styles.scorerGoals}>
                          <Text style={styles.scorerGoalsText}>{scorer.goals}</Text>
                          <MaterialIcons name="sports-soccer" size={16} color={theme.colors.goal} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Tournaments List */}
            {filteredData.tournaments.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Turniere ({filteredData.tournaments.length})</Text>
                {filteredData.tournaments.map(tournament => (
                  <View key={tournament.id} style={styles.tournamentItem}>
                    <View style={styles.tournamentIcon}>
                      <MaterialIcons name="emoji-events" size={24} color={theme.colors.goal} />
                    </View>
                    <View style={styles.tournamentInfo}>
                      <Text style={styles.tournamentName}>{tournament.name}</Text>
                      <Text style={styles.tournamentDate}>
                        {new Date(tournament.datum).toLocaleDateString('de-DE')} • {tournament.matches.length} Spiele
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* Generate Report Button */}
        {selectedTeam && filteredData.tournaments.length > 0 && (
          <View style={styles.generateSection}>
            <TouchableOpacity
              style={[styles.generateButton, generatingReport && styles.generateButtonDisabled]}
              onPress={handleOpenReportDialog}
              disabled={generatingReport}
            >
              <MaterialIcons 
                name={generatingReport ? "hourglass-empty" : "auto-awesome"} 
                size={24} 
                color={theme.colors.text.inverse} 
              />
              <Text style={styles.generateButtonText}>
                {generatingReport ? 'Wird erstellt...' : 'KI-Saisonbericht generieren'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Team Picker Modal */}
      <Modal visible={teamPickerVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setTeamPickerVisible(false)}
        >
          <View style={styles.pickerModal}>
            <Text style={styles.pickerTitle}>Mannschaft wählen</Text>
            <FlatList
              data={teams}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.pickerItem,
                    selectedTeamId === item.id && styles.pickerItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedTeamId(item.id);
                    setTeamPickerVisible(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{item.name}</Text>
                  {item.jahrgang && (
                    <Text style={styles.pickerItemSubtext}>{item.jahrgang}</Text>
                  )}
                  {selectedTeamId === item.id && (
                    <MaterialIcons name="check" size={24} color={theme.colors.success} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Special Notes Modal */}
      <Modal visible={specialNotesModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.specialNotesModal}>
            <View style={styles.specialNotesHeader}>
              <Text style={styles.pickerTitle}>Besonderheiten</Text>
              <TouchableOpacity onPress={() => setSpecialNotesModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.specialNotesHint}>
              Gib hier besondere Vorkommnisse oder Highlights der Saison ein, die im Bericht erwähnt werden sollen (optional):
            </Text>
            
            <TextInput
              style={styles.specialNotesInput}
              value={specialNotes}
              onChangeText={setSpecialNotes}
              placeholder="z.B. Entwicklung der Mannschaft, besondere Erfolge, Herausforderungen..."
              placeholderTextColor={theme.colors.text.light}
              multiline
              numberOfLines={4}
            />
            
            <View style={styles.specialNotesButtons}>
              <TouchableOpacity
                style={styles.skipButton}
                onPress={() => {
                  setSpecialNotes('');
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
        </View>
      </Modal>

      {/* Report Modal */}
      <Modal visible={reportModalVisible} animationType="slide">
        <View style={[styles.reportModal, { paddingTop: insets.top }]}>
          <View style={styles.reportHeader}>
            <Text style={styles.reportTitle}>Saisonbericht</Text>
            <TouchableOpacity onPress={() => setReportModalVisible(false)}>
              <MaterialIcons name="close" size={28} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.reportContent}>
            <Text style={styles.reportText}>{reportText}</Text>
          </ScrollView>

          <View style={[styles.reportActions, { paddingBottom: insets.bottom + theme.spacing.md }]}>
            <TouchableOpacity style={styles.shareButton} onPress={handleShareReport}>
              <MaterialIcons name="share" size={24} color={theme.colors.text.inverse} />
              <Text style={styles.shareButtonText}>Teilen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  section: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.md,
    ...theme.shadows.sm,
  },
  selectorText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.text.primary,
  },
  rangeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  rangeButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rangeButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  rangeButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
    fontWeight: theme.fontWeight.medium,
  },
  rangeButtonTextActive: {
    color: theme.colors.text.inverse,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  statValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  resultsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  resultDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  resultText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  goalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  goalText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text.primary,
    fontWeight: theme.fontWeight.medium,
  },
  scorersList: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  scorerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  scorerRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  scorerRankText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
  scorerInfo: {
    flex: 1,
  },
  scorerName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  scorerMatches: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  scorerGoals: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  scorerGoalsText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.goal,
  },
  tournamentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
  },
  tournamentIcon: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  tournamentInfo: {
    flex: 1,
  },
  tournamentName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  tournamentDate: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  generateSection: {
    padding: theme.spacing.lg,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
    ...theme.shadows.md,
  },
  generateButtonDisabled: {
    opacity: 0.7,
  },
  generateButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  pickerModal: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '100%',
    maxHeight: '70%',
  },
  pickerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  pickerItemSelected: {
    backgroundColor: theme.colors.primary + '20',
  },
  pickerItemText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.text.primary,
    fontWeight: theme.fontWeight.medium,
  },
  pickerItemSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
    marginRight: theme.spacing.sm,
  },
  reportModal: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  reportTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  reportContent: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  reportText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text.primary,
    lineHeight: 24,
  },
  reportActions: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
  },
  shareButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
  accessDenied: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  accessDeniedText: {
    fontSize: theme.fontSize.xl,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.lg,
  },
  specialNotesModal: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    width: '90%',
    maxWidth: 400,
    ...theme.shadows.lg,
  },
  specialNotesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  specialNotesHint: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },
  specialNotesInput: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text.primary,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: theme.colors.border,
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

