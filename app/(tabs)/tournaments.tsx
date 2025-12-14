import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, ScrollView, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Screen from '../../components/layout/Screen';
import Header from '../../components/layout/Header';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useTournaments } from '../../hooks/useTournaments';
import { ImportSource, Wetter } from '../../types';
import { theme } from '../../constants/theme';

// #region agent log
fetch('http://127.0.0.1:7242/ingest/10e0df59-8984-489e-a8e0-68a25e6b5450',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/(tabs)/tournaments.tsx:module',message:'module loaded (Platform check)',data:{platformType:typeof Platform,platformOS:Platform?.OS ?? null},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'A'})}).catch(()=>{});
// #endregion

export default function TournamentsScreen() {
  const router = useRouter();
  const { tournaments, addTournament, getTournamentMatches } = useTournaments();
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [ort, setOrt] = useState('');
  const [datum, setDatum] = useState('');
  const [wetter, setWetter] = useState<Wetter | undefined>(undefined);
  const [wetterPickerVisible, setWetterPickerVisible] = useState(false);

  const handleAddTournament = async () => {
    if (!name.trim() || !ort.trim() || !datum.trim()) return;
    
    try {
      const dateParts = datum.split('.');
      let timestamp = Date.now();
      if (dateParts.length === 3) {
        const [day, month, year] = dateParts;
        timestamp = new Date(`${year}-${month}-${day}`).getTime();
      }
      
      await addTournament({
        name,
        ort,
        datum: timestamp,
        wetter,
        importQuelle: ImportSource.MANUAL,
      });
      
      setName('');
      setOrt('');
      setDatum('');
      setWetter(undefined);
      setModalVisible(false);
    } catch (error) {
      console.error('Error adding tournament:', error);
      alert(`Fehler beim Erstellen: ${error}`);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const renderTournament = ({ item }: any) => {
    const matches = getTournamentMatches(item.id);
    
    return (
      <TouchableOpacity
        style={styles.tournamentCard}
        onPress={() => {
          // Ensure we navigate to trainer view, not viewer
          router.push(`/tournament/${item.id}`);
        }}
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
              <Text style={styles.tournamentMetaText}>{item.ort}</Text>
              <MaterialIcons name="calendar-today" size={14} color={theme.colors.text.secondary} style={{ marginLeft: theme.spacing.sm }} />
              <Text style={styles.tournamentMetaText}>{formatDate(item.datum)}</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={theme.colors.text.secondary} />
        </View>
        <View style={styles.tournamentFooter}>
          <View style={styles.statsItem}>
            <MaterialIcons name="sports-soccer" size={16} color={theme.colors.text.secondary} />
            <Text style={styles.statsText}>{matches.length} Spiele</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Screen scroll={false} padding={false}>
      <Header
        title="Turniere"
        rightAction={
          <TouchableOpacity onPress={() => setModalVisible(true)}>
            <MaterialIcons name="add" size={28} color={theme.colors.text.inverse} />
          </TouchableOpacity>
        }
      />
      
      {tournaments.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="emoji-events" size={80} color={theme.colors.text.light} />
          <Text style={styles.emptyTitle}>Noch keine Turniere</Text>
          <Text style={styles.emptyText}>Erstelle dein erstes Turnier und erfasse Spiele</Text>
          <Button title="Turnier erstellen" onPress={() => setModalVisible(true)} />
        </View>
      ) : (
        <FlatList
          data={tournaments.sort((a, b) => b.datum - a.datum)}
          renderItem={renderTournament}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView 
            style={styles.modalOverlay} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <TouchableWithoutFeedback>
              <ScrollView 
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
                bounces={false}
              >
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Neues Turnier</Text>
                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                      <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
                    </TouchableOpacity>
                  </View>
                  
                  <Input
                    label="Turniername *"
                    placeholder="z.B. Herbstcup 2025"
                    value={name}
                    onChangeText={setName}
                    autoFocus
                  />
                  
                  <Input
                    label="Ort *"
                    placeholder="z.B. TVS-Platz"
                    value={ort}
                    onChangeText={setOrt}
                  />
                  
                  <Input
                    label="Datum * (TT.MM.JJJJ)"
                    placeholder="z.B. 18.10.2025"
                    value={datum}
                    onChangeText={setDatum}
                  />
                  
                  <TouchableOpacity
                    style={styles.picker}
                    onPress={() => {
                      setModalVisible(false);
                      setTimeout(() => setWetterPickerVisible(true), 300);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.pickerLabel}>Wetter</Text>
                    <View style={styles.pickerValue}>
                      <Text style={[styles.pickerText, !wetter && styles.pickerPlaceholder]}>
                        {wetter || 'Wetter auswählen (optional)'}
                      </Text>
                      <MaterialIcons name="arrow-drop-down" size={24} color={theme.colors.text.secondary} />
                    </View>
                  </TouchableOpacity>
                  
                  <View style={styles.modalActions}>
                    <Button
                      title="Abbrechen"
                      variant="outline"
                      onPress={() => setModalVisible(false)}
                      style={styles.modalButton}
                    />
                    <Button
                      title="Erstellen"
                      onPress={handleAddTournament}
                      disabled={!name.trim() || !ort.trim() || !datum.trim()}
                      style={styles.modalButton}
                    />
                  </View>
                </View>
              </ScrollView>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={wetterPickerVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => {
          setWetterPickerVisible(false);
          setTimeout(() => setModalVisible(true), 300);
        }}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.pickerModal}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Wetter auswählen</Text>
                  <TouchableOpacity onPress={() => {
                    setWetterPickerVisible(false);
                    setTimeout(() => setModalVisible(true), 300);
                  }}>
                    <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
                  </TouchableOpacity>
                </View>
                <ScrollView bounces={false}>
                  {Object.values(Wetter).map(w => (
                    <TouchableOpacity
                      key={w}
                      style={[styles.wetterOption, w === wetter && styles.wetterOptionSelected]}
                      onPress={() => {
                        setWetter(w);
                        setWetterPickerVisible(false);
                        setTimeout(() => setModalVisible(true), 300);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.wetterIcon}>
                        {w === Wetter.SONNIG && '☀️'}
                        {w === Wetter.BEWOELKT && '☁️'}
                        {w === Wetter.REGEN && '🌧️'}
                        {w === Wetter.SCHNEE && '❄️'}
                        {w === Wetter.WIND && '💨'}
                      </Text>
                      <Text style={styles.wetterText}>{w}</Text>
                      {w === wetter && (
                        <MaterialIcons name="check" size={24} color={theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    marginBottom: theme.spacing.xl,
  },
  tournamentCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  tournamentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  tournamentIcon: {
    width: 56,
    height: 56,
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
  },
  tournamentMetaText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.xs,
  },
  tournamentFooter: {
    flexDirection: 'row',
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  statsItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? theme.spacing.xl : theme.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  modalButton: {
    flex: 1,
  },
  picker: {
    marginBottom: theme.spacing.md,
  },
  pickerLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  pickerValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minHeight: 48,
  },
  pickerText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text.primary,
  },
  pickerPlaceholder: {
    color: theme.colors.text.light,
  },
  pickerModal: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    maxHeight: '60%',
  },
  wetterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xs,
  },
  wetterOptionSelected: {
    backgroundColor: theme.colors.background,
  },
  wetterIcon: {
    fontSize: 24,
    marginRight: theme.spacing.md,
  },
  wetterText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.text.primary,
  },
});
