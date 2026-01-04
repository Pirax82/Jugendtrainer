import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import Screen from '../../components/layout/Screen';
import { useTournaments } from '../../hooks/useTournaments';
import { MatchStatus, Wetter } from '../../types';
import { theme } from '../../constants/theme';

export default function ViewerTournamentsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { tournaments, getTournamentMatches, refreshData } = useTournaments();
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
      refreshData();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } finally {
      setRefreshing(false);
    }
  };

  // Exit viewer mode and go back to entry screen (Trainer/Zuschauer selection)
  const handleExitPress = () => {
    // Get the ROOT navigator (parent of the Tab navigator)
    const rootNavigation = navigation.getParent();
    
    if (rootNavigation) {
      rootNavigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'index' }],
        })
      );
    } else {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'index' }],
        })
      );
    }
  };

  // Filter tournaments from last week and current week
  const getRecentTournaments = () => {
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneWeekAhead = now + 7 * 24 * 60 * 60 * 1000;
    
    return tournaments.filter(t => t.datum >= oneWeekAgo && t.datum <= oneWeekAhead)
      .sort((a, b) => b.datum - a.datum);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('de-DE', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const getTournamentLiveCount = (tournamentId: string) => {
    const tournamentMatches = getTournamentMatches(tournamentId);
    return tournamentMatches.filter(m => m.status === MatchStatus.LAUFEND).length;
  };

  const getTournamentCompletedCount = (tournamentId: string) => {
    const tournamentMatches = getTournamentMatches(tournamentId);
    return tournamentMatches.filter(m => m.status === MatchStatus.ABGESCHLOSSEN).length;
  };

  const renderTournament = ({ item }: any) => {
    const tournamentMatches = getTournamentMatches(item.id);
    const liveCount = getTournamentLiveCount(item.id);
    const completedCount = getTournamentCompletedCount(item.id);
    
    return (
      <TouchableOpacity
        style={styles.tournamentCard}
        onPress={() => router.push(`/(viewer)/view-tournament/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.tournamentHeader}>
          <View style={styles.tournamentIcon}>
            <MaterialIcons name="emoji-events" size={32} color={theme.colors.goal} />
          </View>
          <View style={styles.tournamentInfo}>
            <Text style={styles.tournamentName}>{item.name}</Text>
            <View style={styles.tournamentMeta}>
              <MaterialIcons name="location-on" size={14} color={theme.colors.text.secondary} />
              <Text style={styles.metaText}>{item.ort}</Text>
            </View>
            <Text style={styles.dateText}>{formatDate(item.datum)}</Text>
          </View>
          {liveCount > 0 && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>{liveCount} LIVE</Text>
            </View>
          )}
        </View>
        
        {item.wetter && (
          <View style={styles.wetterBadge}>
            <Text style={styles.wetterText}>
              {item.wetter === Wetter.SONNIG && '☀️'}
              {item.wetter === Wetter.BEWOELKT && '☁️'}
              {item.wetter === Wetter.REGEN && '🌧️'}
              {item.wetter === Wetter.SCHNEE && '❄️'}
              {item.wetter === Wetter.WIND && '💨'}
              {' '}{item.wetter}
            </Text>
          </View>
        )}
        
        <View style={styles.tournamentStats}>
          <View style={styles.stat}>
            <MaterialIcons name="sports-soccer" size={16} color={theme.colors.text.secondary} />
            <Text style={styles.statText}>{tournamentMatches.length} Spiele</Text>
          </View>
          <View style={styles.stat}>
            <MaterialIcons name="check-circle" size={16} color={theme.colors.success} />
            <Text style={styles.statText}>{completedCount} Beendet</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const recentTournaments = getRecentTournaments();

  return (
    <Screen scroll={false} padding={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Jugendtrainer</Text>
          <Text style={styles.headerSubtitle}>Zuschauer-Ansicht</Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.loginButton,
            pressed && { opacity: 0.7, backgroundColor: theme.colors.primary + '20' }
          ]}
          onPress={handleExitPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="exit-to-app" size={24} color={theme.colors.primary} />
        </Pressable>
      </View>

      {recentTournaments.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="emoji-events" size={64} color={theme.colors.text.light} />
          <Text style={styles.emptyText}>Keine aktuellen Turniere</Text>
          <Text style={styles.emptySubtext}>Turniere der letzten und aktuellen Woche werden hier angezeigt</Text>
        </View>
      ) : (
        <FlatList
          data={recentTournaments}
          renderItem={renderTournament}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          key={refreshKey}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
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
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  loginButton: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  list: {
    padding: theme.spacing.md,
  },
  tournamentCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  tournamentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  tournamentIcon: {
    width: 48,
    height: 48,
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
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  tournamentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  metaText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.xs,
  },
  dateText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text.light,
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
    width: 8,
    height: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.text.inverse,
  },
  liveText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
  wetterBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  wetterText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.primary,
  },
  tournamentStats: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statText: {
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
