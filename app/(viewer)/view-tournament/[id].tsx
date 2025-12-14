import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Screen from '../../../components/layout/Screen';
import { useTournaments } from '../../../hooks/useTournaments';
import { useTeams } from '../../../hooks/useTeams';
import { MatchStatus, Wetter } from '../../../types';
import { theme } from '../../../constants/theme';

export default function ViewerTournamentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getTournamentById, getTournamentMatches, getMatchScore, getTournamentTopScorers, getTournamentStats } = useTournaments();
  const { teams, getPlayerById } = useTeams();
  const [activeTab, setActiveTab] = useState<'matches' | 'stats'>('matches');
  const [refreshKey, setRefreshKey] = useState(0);

  const tournament = getTournamentById(id as string);
  const matches = getTournamentMatches(id as string);
  const topScorers = getTournamentTopScorers(id as string);
  const stats = getTournamentStats(id as string);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const handleLoginPress = () => {
    // Navigate to central entry screen for login
    router.push('/');
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

  const renderMatch = ({ item }: any) => {
    const team = teams.find(t => t.id === item.teamId);
    const score = getMatchScore(item.id);
    
    const statusColors = {
      [MatchStatus.GEPLANT]: theme.colors.text.secondary,
      [MatchStatus.LAUFEND]: theme.colors.error,
      [MatchStatus.ABGESCHLOSSEN]: theme.colors.success,
    };

    return (
      <TouchableOpacity
        style={styles.matchCard}
        onPress={() => router.push(`/(viewer)/view-match/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.matchHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] }]}>
            <Text style={styles.statusText}>
              {item.status === MatchStatus.GEPLANT && 'Geplant'}
              {item.status === MatchStatus.LAUFEND && 'LIVE'}
              {item.status === MatchStatus.ABGESCHLOSSEN && 'Beendet'}
            </Text>
          </View>
          {item.feld && <Text style={styles.feldText}>{item.feld}</Text>}
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

  return (
    <Screen scroll={false} padding={false}>
      <TouchableOpacity
        style={styles.loginButton}
        onPress={handleLoginPress}
        activeOpacity={0.7}
      >
        <MaterialIcons name="login" size={20} color={theme.colors.primary} />
      </TouchableOpacity>

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
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'matches' && styles.tabTextActive]}>Spiele</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'stats' && styles.tabActive]}
          onPress={() => setActiveTab('stats')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}>Fazit</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'matches' ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Spiele ({matches.length})</Text>
          </View>

          {matches.length === 0 ? (
            <View style={styles.emptyMatches}>
              <MaterialIcons name="sports-soccer" size={48} color={theme.colors.text.light} />
              <Text style={styles.emptyText}>Noch keine Spiele</Text>
            </View>
          ) : (
            <FlatList
              data={matches}
              renderItem={renderMatch}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.matchesList}
              key={refreshKey}
            />
          )}
        </View>
      ) : (
        <ScrollView style={styles.section}>
          <View style={styles.statsContainer}>
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
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loginButton: {
    position: 'absolute',
    top: Platform.select({ ios: 50, android: 10, default: 10 }),
    right: theme.spacing.md,
    zIndex: 100,
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary,
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
  section: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  sectionHeader: {
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
  matchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
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
});
