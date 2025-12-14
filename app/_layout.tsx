import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../contexts/AuthContext';
import { TeamsProvider } from '../contexts/TeamsContext';
import { TournamentsProvider } from '../contexts/TournamentsContext';
import { useAuth } from '../hooks/useAuth';
import { useTeams } from '../hooks/useTeams';
import { useTournaments } from '../hooks/useTournaments';
import SplashScreen from '../components/layout/SplashScreen';
import { useEffect } from 'react';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { theme } from '../constants/theme';

function AppContent() {
  const { loading: authLoading } = useAuth();
  const { loading: teamsLoading } = useTeams();
  const { loading: tournamentsLoading } = useTournaments();

  const isLoading = authLoading || teamsLoading || tournamentsLoading;

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: theme.colors.text.inverse,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerBackTitle: 'Zurück',
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(viewer)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen 
        name="team/[id]" 
        options={{ 
          headerShown: true, 
          title: 'Team Details',
        }} 
      />
      <Stack.Screen 
        name="tournament/[id]" 
        options={{ 
          headerShown: true, 
          title: 'Turnier Details',
        }} 
      />
      <Stack.Screen 
        name="match/[id]" 
        options={{ 
          headerShown: true, 
          title: 'Spiel Details',
        }} 
      />
      <Stack.Screen name="live/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    ExpoSplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <TeamsProvider>
          <TournamentsProvider>
            <AppContent />
          </TournamentsProvider>
        </TeamsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
