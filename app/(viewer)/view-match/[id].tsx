import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Screen from '../../../components/layout/Screen';
import { useTournaments } from '../../../hooks/useTournaments';
import { useTeams } from '../../../hooks/useTeams';
import { MatchStatus, EventType } from '../../../types';
import { theme } from '../../../constants/theme';

export default function ViewerMatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getMatchById, getTournamentById, getMatchEvents, getMatchScore } = useTournaments();
  const { getTeamById, getPlayerById } = useTeams();
  const [refreshKey, setRefreshKey] = useState(0);

  const match = getMatchById(id as string);
  const tournament = match ? getTournamentById(match.tournamentId) : null;
  const team = match ? getTeamById(match.teamId) : null;
  const events = getMatchEvents(id as string);
  const score = getMatchScore(id as string);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const renderEvent = ({ item }: any) => {
    const player = item.playerId ? getPlayerById(item.playerId) : null;
    
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
        <View style={[
          styles.statusBadge,
          { backgroundColor: 
            match.status === MatchStatus.GEPLANT ? theme.colors.text.secondary :
            match.status === MatchStatus.LAUFEND ? theme.colors.error :
            theme.colors.success
          }
        ]}>
          <Text style={styles.statusText}>
            {match.status === MatchStatus.GEPLANT && 'Geplant'}
            {match.status === MatchStatus.LAUFEND && 'LIVE'}
            {match.status === MatchStatus.ABGESCHLOSSEN && 'Beendet'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tore ({goalEvents.length})</Text>
        </View>

        {goalEvents.length === 0 ? (
          <View style={styles.emptyEvents}>
            <MaterialIcons name="sports-soccer" size={48} color={theme.colors.text.light} />
            <Text style={styles.emptyText}>Noch keine Tore</Text>
          </View>
        ) : (
          <FlatList
            data={goalEvents.sort((a, b) => a.spielminute - b.spielminute)}
            renderItem={renderEvent}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.eventsList}
            key={refreshKey}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
});
