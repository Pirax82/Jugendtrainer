import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Screen from '../../components/layout/Screen';
import { useTournaments } from '../../hooks/useTournaments';
import { useTeams } from '../../hooks/useTeams';
import { MatchStatus } from '../../types';
import { theme } from '../../constants/theme';

export default function ViewerLiveScreen() {
  const router = useRouter();
  const { tournaments, matches, getMatchScore, getTournamentById } = useTournaments();
  const { getTeamById } = useTeams();
  const [refreshKey, setRefreshKey] = useState(0);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const getLiveMatches = () => {
    return matches
      .filter(m => m.status === MatchStatus.LAUFEND)
      .sort((a, b) => (b.startZeit || 0) - (a.startZeit || 0));
  };

  const formatTime = (timestamp: number | undefined) => {
    if (!timestamp) return '--:--';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  const renderMatch = ({ item }: any) => {
    const team = getTeamById(item.teamId);
    const tournament = getTournamentById(item.tournamentId);
    const score = getMatchScore(item.id);
    const elapsed = item.startZeit ? Math.floor((Date.now() - item.startZeit) / 60000) : 0;
    
    return (
      <TouchableOpacity
        style={styles.matchCard}
        onPress={() => router.push(`/viewer/match/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.matchHeader}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <Text style={styles.tournamentName}>{tournament?.name}</Text>
        </View>

        <View style={styles.matchContent}>
          <View style={styles.teamRow}>
            <Text style={styles.teamName}>{team?.name || 'Team'}</Text>
            <Text style={styles.score}>{score.heim}</Text>
          </View>
          
          <View style={styles.vsRow}>
            <Text style={styles.vsText}>:</Text>
          </View>
          
          <View style={styles.teamRow}>
            <Text style={styles.teamName}>{item.gegnerName}</Text>
            <Text style={styles.score}>{score.gegner}</Text>
          </View>
        </View>

        <View style={styles.matchFooter}>
          {item.feld && (
            <View style={styles.feldBadge}>
              <MaterialIcons name="place" size={14} color={theme.colors.text.secondary} />
              <Text style={styles.feldText}>{item.feld}</Text>
            </View>
          )}
          <View style={styles.timeBadge}>
            <MaterialIcons name="schedule" size={14} color={theme.colors.text.secondary} />
            <Text style={styles.timeText}>{elapsed} min</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const liveMatches = getLiveMatches();

  return (
    <Screen scroll={false} padding={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Live-Spiele</Text>
          <Text style={styles.headerSubtitle}>Automatische Aktualisierung alle 15 Sek.</Text>
        </View>
        <View style={styles.refreshIndicator}>
          <View style={styles.refreshDot} />
        </View>
      </View>

      {liveMatches.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="play-circle-outline" size={64} color={theme.colors.text.light} />
          <Text style={styles.emptyText}>Keine Live-Spiele</Text>
          <Text style={styles.emptySubtext}>Laufende Spiele werden hier angezeigt</Text>
        </View>
      ) : (
        <FlatList
          data={liveMatches}
          renderItem={renderMatch}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          key={refreshKey}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  headerTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  headerSubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  refreshIndicator: {
    width: 12,
    height: 12,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshDot: {
    width: 8,
    height: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.success,
  },
  list: {
    padding: theme.spacing.md,
  },
  matchCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.error,
    ...theme.shadows.md,
  },
  matchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.text.inverse,
  },
  liveText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
  tournamentName: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
    flex: 1,
  },
  matchContent: {
    marginBottom: theme.spacing.md,
  },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  teamName: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
    flex: 1,
  },
  score: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
    marginLeft: theme.spacing.md,
    minWidth: 50,
    textAlign: 'right',
  },
  vsRow: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  vsText: {
    fontSize: theme.fontSize.xl,
    color: theme.colors.text.light,
  },
  matchFooter: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  feldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  feldText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  timeText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  emptySubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.light,
    textAlign: 'center',
  },
});
