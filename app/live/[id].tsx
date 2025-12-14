import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView, AppState } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useTournaments } from '../../hooks/useTournaments';
import { useTeams } from '../../hooks/useTeams';
import { EventType, TimerStatus, MatchStatus } from '../../types';
import { theme } from '../../constants/theme';

export default function LiveMatchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getMatchById, getMatchEvents, addEvent, deleteEvent, updateMatch, getMatchScore } = useTournaments();
  const { getTeamById, getTeamPlayers, getPlayerById } = useTeams();

  const match = getMatchById(id as string);
  const team = match ? getTeamById(match.teamId) : null;
  const players = match ? getTeamPlayers(match.teamId) : [];
  const events = getMatchEvents(id as string);
  const score = getMatchScore(id as string);

  const [timerStatus, setTimerStatus] = useState<TimerStatus>(TimerStatus.READY);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (match?.status === MatchStatus.LAUFEND) {
      setTimerStatus(TimerStatus.RUNNING);
      // Recover timer if match was already running
      if (match.startZeit) {
        startTimeRef.current = match.startZeit;
        const now = Date.now();
        const elapsed = Math.floor((now - match.startZeit) / 1000);
        setElapsedSeconds(elapsed);
      }
    }
  }, [match?.status]);

  // Keep screen awake during live match
  useEffect(() => {
    if (timerStatus === TimerStatus.RUNNING) {
      activateKeepAwakeAsync('live-match');
    } else {
      deactivateKeepAwake('live-match');
    }

    return () => {
      deactivateKeepAwake('live-match');
    };
  }, [timerStatus]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active' && timerStatus === TimerStatus.RUNNING && startTimeRef.current > 0) {
        // Recalculate elapsed time when app comes to foreground
        const now = Date.now();
        const totalElapsed = Math.floor((now - startTimeRef.current) / 1000);
        setElapsedSeconds(totalElapsed - pausedTimeRef.current);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [timerStatus]);

  useEffect(() => {
    if (timerStatus === TimerStatus.RUNNING && startTimeRef.current > 0) {
      // Use timestamp-based calculation instead of simple increment
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const totalElapsed = Math.floor((now - startTimeRef.current) / 1000);
        setElapsedSeconds(totalElapsed - pausedTimeRef.current);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerStatus]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentMinute = () => {
    return Math.floor(elapsedSeconds / 60) + 1;
  };

  const handleStart = async () => {
    try {
      if (timerStatus === TimerStatus.READY) {
        const now = Date.now();
        startTimeRef.current = now;
        pausedTimeRef.current = 0;
        setTimerStatus(TimerStatus.RUNNING);
        await addEvent({
          matchId: id as string,
          typ: EventType.ANPFIFF,
          spielminute: 0,
        });
        await updateMatch(id as string, { 
          status: MatchStatus.LAUFEND,
          startZeit: now,
        });
      } else if (timerStatus === TimerStatus.PAUSED) {
        // Resume from pause: adjust startTime to account for paused duration
        const pauseDuration = Math.floor((Date.now() - startTimeRef.current) / 1000) - elapsedSeconds;
        pausedTimeRef.current += pauseDuration;
        setTimerStatus(TimerStatus.RUNNING);
        await addEvent({
          matchId: id as string,
          typ: EventType.FORTSETZUNG,
          spielminute: getCurrentMinute(),
        });
      }
    } catch (error) {
      console.error('Error starting match:', error);
      // Reset timer status on error
      setTimerStatus(timerStatus === TimerStatus.READY ? TimerStatus.READY : TimerStatus.PAUSED);
    }
  };

  const handlePause = async () => {
    // Store current elapsed time when pausing
    const currentElapsed = elapsedSeconds;
    await addEvent({
      matchId: id as string,
      typ: EventType.PAUSE,
      spielminute: getCurrentMinute(),
    });
    setTimerStatus(TimerStatus.PAUSED);
  };

  const handleGoal = async (playerId: string) => {
    if (timerStatus !== TimerStatus.RUNNING) return;
    
    await addEvent({
      matchId: id as string,
      typ: EventType.TOR_HEIM,
      playerId,
      spielminute: getCurrentMinute(),
    });
  };

  const handleOpponentGoal = async () => {
    if (timerStatus !== TimerStatus.RUNNING) return;
    
    await addEvent({
      matchId: id as string,
      typ: EventType.TOR_GEGNER,
      spielminute: getCurrentMinute(),
    });
  };

  const handleUndo = async () => {
    if (events.length === 0) return;
    
    const lastEvent = events[events.length - 1];
    await deleteEvent(lastEvent.id);
  };

  const handleEnd = async () => {
    await addEvent({
      matchId: id as string,
      typ: EventType.SCHLUSS,
      spielminute: getCurrentMinute(),
    });
    await updateMatch(id as string, { 
      status: MatchStatus.ABGESCHLOSSEN,
      endZeit: Date.now(),
    });
    setTimerStatus(TimerStatus.ENDED);
  };

  const getTimerColor = () => {
    switch (timerStatus) {
      case TimerStatus.RUNNING:
        return theme.colors.success;
      case TimerStatus.PAUSED:
        return theme.colors.warning;
      case TimerStatus.ENDED:
        return theme.colors.error;
      default:
        return theme.colors.text.secondary;
    }
  };

  const getEventIcon = (typ: EventType) => {
    switch (typ) {
      case EventType.TOR_HEIM:
        return '⚽';
      case EventType.TOR_GEGNER:
        return '🥅';
      case EventType.ANPFIFF:
        return '▶️';
      case EventType.PAUSE:
        return '⏸️';
      case EventType.FORTSETZUNG:
        return '▶️';
      case EventType.SCHLUSS:
        return '⏹️';
      default:
        return '•';
    }
  };

  const renderEvent = ({ item }: any) => {
    const player = item.playerId ? getPlayerById(item.playerId) : null;
    const eventText = item.typ === EventType.TOR_HEIM 
      ? `${player?.name || 'Tor'}` 
      : item.typ === EventType.TOR_GEGNER
      ? 'Gegentor'
      : item.typ === EventType.ANPFIFF
      ? 'Anpfiff'
      : item.typ === EventType.PAUSE
      ? 'Pause'
      : item.typ === EventType.FORTSETZUNG
      ? 'Fortsetzung'
      : 'Abpfiff';

    return (
      <View style={styles.eventItem}>
        <Text style={styles.eventIcon}>{getEventIcon(item.typ)}</Text>
        <View style={styles.eventInfo}>
          <Text style={styles.eventText}>{eventText}</Text>
          <Text style={styles.eventMinute}>{item.spielminute}'</Text>
        </View>
      </View>
    );
  };

  const renderPlayer = ({ item }: any) => (
    <TouchableOpacity
      style={styles.playerButton}
      onPress={() => handleGoal(item.id)}
      disabled={timerStatus !== TimerStatus.RUNNING}
      activeOpacity={0.7}
    >
      <View style={styles.playerAvatar}>
        <Text style={styles.playerInitials}>
          {item.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
        </Text>
      </View>
      <Text style={styles.playerName} numberOfLines={1}>{item.name}</Text>
      {item.nummer && <Text style={styles.playerNummer}>#{item.nummer}</Text>}
    </TouchableOpacity>
  );

  if (!match || !team) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text>Spiel nicht gefunden</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.text.inverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live-Erfassung</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.scoreBoard}>
        <View style={styles.teamScore}>
          <Text style={styles.teamNameLarge}>{team.name}</Text>
          <Text style={styles.scoreLarge}>{score.heim}</Text>
        </View>
        <View style={styles.scoreCenter}>
          <View style={[styles.timerBadge, { backgroundColor: getTimerColor() }]}>
            <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>
          </View>
          <Text style={styles.vsText}>vs</Text>
        </View>
        <View style={styles.teamScore}>
          <Text style={styles.teamNameLarge}>{match.gegnerName}</Text>
          <Text style={styles.scoreLarge}>{score.gegner}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spieler</Text>
          <FlatList
            data={players}
            renderItem={renderPlayer}
            keyExtractor={item => item.id}
            numColumns={3}
            scrollEnabled={false}
            columnWrapperStyle={styles.playerGrid}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Events</Text>
          {events.length === 0 ? (
            <Text style={styles.emptyText}>Noch keine Events</Text>
          ) : (
            <FlatList
              data={[...events].reverse()}
              renderItem={renderEvent}
              keyExtractor={item => item.id}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>

      <View style={[styles.controls, { paddingBottom: insets.bottom + theme.spacing.md }]}>
        <View style={styles.controlRow}>
          <TouchableOpacity
            style={[styles.controlButton, styles.controlButtonDanger]}
            onPress={handleOpponentGoal}
            disabled={timerStatus !== TimerStatus.RUNNING}
          >
            <MaterialIcons name="sports-soccer" size={24} color={theme.colors.text.inverse} />
            <Text style={styles.controlButtonText}>Gegentor</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.controlButtonSecondary]}
            onPress={handleUndo}
            disabled={events.length === 0}
          >
            <MaterialIcons name="undo" size={24} color={theme.colors.text.inverse} />
            <Text style={styles.controlButtonText}>Undo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.controlRow}>
          {timerStatus === TimerStatus.READY || timerStatus === TimerStatus.PAUSED ? (
            <TouchableOpacity style={styles.controlButtonPrimary} onPress={handleStart}>
              <MaterialIcons name="play-arrow" size={32} color={theme.colors.text.inverse} />
              <Text style={styles.controlButtonTextLarge}>
                {timerStatus === TimerStatus.READY ? 'Start' : 'Weiter'}
              </Text>
            </TouchableOpacity>
          ) : timerStatus === TimerStatus.RUNNING ? (
            <>
              <TouchableOpacity 
                style={[styles.controlButtonPrimary, { flex: 1, marginRight: theme.spacing.sm }]} 
                onPress={handlePause}
              >
                <MaterialIcons name="pause" size={32} color={theme.colors.text.inverse} />
                <Text style={styles.controlButtonTextLarge}>Pause</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.controlButtonPrimary, { flex: 1, marginLeft: theme.spacing.sm, backgroundColor: theme.colors.error }]} 
                onPress={handleEnd}
              >
                <MaterialIcons name="stop" size={32} color={theme.colors.text.inverse} />
                <Text style={styles.controlButtonTextLarge}>Beenden</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.controlButtonPrimary} onPress={() => router.back()}>
              <MaterialIcons name="check" size={32} color={theme.colors.text.inverse} />
              <Text style={styles.controlButtonTextLarge}>Fertig</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.inverse,
    textAlign: 'center',
  },
  scoreBoard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    ...theme.shadows.md,
  },
  teamScore: {
    flex: 1,
    alignItems: 'center',
  },
  teamNameLarge: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  scoreLarge: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  scoreCenter: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  timerBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  timerText: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.inverse,
    fontVariant: ['tabular-nums'],
  },
  vsText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.light,
    fontWeight: theme.fontWeight.medium,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: theme.spacing.md,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  playerGrid: {
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  playerButton: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.md,
  },
  playerAvatar: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
  },
  playerInitials: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
  playerName: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  playerNummer: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  emptyText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    padding: theme.spacing.lg,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  eventIcon: {
    fontSize: 24,
    marginRight: theme.spacing.md,
  },
  eventInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  eventMinute: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  controls: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    ...theme.shadows.lg,
  },
  controlRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginHorizontal: theme.spacing.xs,
    ...theme.shadows.sm,
  },
  controlButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.md,
  },
  controlButtonSecondary: {
    backgroundColor: theme.colors.text.secondary,
  },
  controlButtonDanger: {
    backgroundColor: theme.colors.error,
  },
  controlButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.inverse,
    marginLeft: theme.spacing.xs,
  },
  controlButtonTextLarge: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.inverse,
    marginLeft: theme.spacing.sm,
  },
});
