import { useContext } from 'react';
import { TeamsContext } from '../contexts/TeamsContext';

export function useTeams() {
  const context = useContext(TeamsContext);
  if (!context) {
    throw new Error('useTeams must be used within TeamsProvider');
  }
  return context;
}
