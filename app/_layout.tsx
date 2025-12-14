import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../contexts/AuthContext';
import { TeamsProvider } from '../contexts/TeamsContext';
import { TournamentsProvider } from '../contexts/TournamentsContext';
import { useAuth } from '../hooks/useAuth';
import { useTeams } from '../hooks/useTeams';
import { useTournaments } from '../hooks/useTournaments';
import SplashScreen from '../components/layout/SplashScreen';
import React, { useEffect } from 'react';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { theme } from '../constants/theme';
import { View, Text } from 'react-native';

// Error Boundary for catching crashes
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fff' }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>Etwas ist schiefgelaufen</Text>
          <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>{this.state.error?.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const { loading: authLoading } = useAuth();
  const { loading: teamsLoading } = useTeams();
  const { loading: tournamentsLoading } = useTournaments();
  const [forceReady, setForceReady] = React.useState(false);

  // Timeout to prevent infinite loading
  React.useEffect(() => {
    const timer = setTimeout(() => {
      console.log('Force ready after timeout');
      setForceReady(true);
    }, 10000); // 10 second timeout
    return () => clearTimeout(timer);
  }, []);

  const isLoading = !forceReady && (authLoading || teamsLoading || tournamentsLoading);

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
    // Hide splash screen after a short delay to ensure app is ready
    const timer = setTimeout(() => {
      ExpoSplashScreen.hideAsync().catch(() => {});
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <TeamsProvider>
            <TournamentsProvider>
              <AppContent />
            </TournamentsProvider>
          </TeamsProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
