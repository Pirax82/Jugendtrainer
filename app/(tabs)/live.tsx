import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Screen from '../../components/layout/Screen';
import Header from '../../components/layout/Header';
import { useTournaments } from '../../hooks/useTournaments';
import { useTeams } from '../../hooks/useTeams';
import { MatchStatus } from '../../types';
import { theme } from '../../constants/theme';

export default function LiveScreen() {
  const router = useRouter();
  const { tournaments, matches, getTournamentMatches, getMatchScore } = useTournaments();
  const { getTeamById } = useTeams();

  const allMatches = matches.sort((a, b) => (b.startZeit || 0) - (a.startZeit || 0));

  const renderMatch = ({ item }: any) => {
    const tournament = tournaments.find(t => t.id === item.tournamentId);
    const team = getTeamById(item.teamId);
    const score = getMatchScore(item.id);
    
    const statusColors = {
      [MatchStatus.GEPLANT]: theme.colors.text.secondary,
      [MatchStatus.LAUFEND]: theme.colors.success,
      [MatchStatus.ABGESCHLOSSEN]: theme.colors.primary,
    };

    return (
      <TouchableOpacity
        style={styles.matchCard}
        onPress={() => router.push(`/live/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.matchHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] }]}>
            <Text style={styles.statusText}>
              {item.status === MatchStatus.GEPLANT && 'Geplant'}
              {item.status === MatchStatus.LAUFEND && 'Live'}
              {item.status === MatchStatus.ABGESCHLOSSEN && 'Beendet'}
            </Text>
          </View>
          {tournament && (
            <Text style={styles.tournamentName}>{tournament.name}</Text>
          )}
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

        <View style={styles.matchFooter}>
          {item.feld && (
            <View style={styles.infoItem}>
              <MaterialIcons name="place" size={14} color={theme.colors.text.secondary} />
              <Text style={styles.infoText}>{item.feld}</Text>
            </View>
          )}
          <View style={styles.infoItem}>
            <MaterialIcons name="timer" size={14} color={theme.colors.text.secondary} />
            <Text style={styles.infoText}>{item.dauerMin} Min</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Screen scroll={false} padding={false}>
      <Header title="Live-Erfassung" />
      
      {allMatches.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="play-circle-outline" size={80} color={theme.colors.text.light} />
          <Text style={styles.emptyTitle}>Keine Spiele verfügbar</Text>
          <Text style={styles.emptyText}>
            Erstelle zuerst ein Turnier und füge Spiele hinzu
          </Text>
        </View>
      ) : (
        <FlatList
          data={allMatches}
          renderItem={renderMatch}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: theme.spacing.md,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text.secondary,
    textAlign: 'center',
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
  matchFooter: {
    flexDirection: 'row',
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.lg,
  },
  infoText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.xs,
  },
});
