import { useContext } from 'react';
import { TournamentsContext } from '../contexts/TournamentsContext';

export function useTournaments() {
  const context = useContext(TournamentsContext);
  if (!context) {
    throw new Error('useTournaments must be used within TournamentsProvider');
  }
  return context;
}
