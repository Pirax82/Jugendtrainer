import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, KeyboardAvoidingView, ScrollView, TouchableWithoutFeedback, Keyboard, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Screen from '../../components/layout/Screen';
import Header from '../../components/layout/Header';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useTeams } from '../../hooks/useTeams';
import { theme } from '../../constants/theme';

export default function TeamsScreen() {
  const router = useRouter();
  const { teams, players, addTeam, getTeamPlayers } = useTeams();
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [jahrgang, setJahrgang] = useState('');
  const [trainer, setTrainer] = useState('');

  const handleAddTeam = async () => {
    if (!name.trim()) return;
    
    await addTeam({ name, jahrgang, trainer });
    setName('');
    setJahrgang('');
    setTrainer('');
    setModalVisible(false);
  };

  const [webAlertConfig, setWebAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: '', message: '' });

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      setWebAlertConfig({ visible: true, title, message });
    }
  };

  const renderTeam = ({ item }: any) => {
    const teamPlayers = getTeamPlayers(item.id);
    
    return (
      <TouchableOpacity
        style={styles.teamCard}
        onPress={() => router.push(`/team/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.teamHeader}>
          <View style={styles.teamIcon}>
            <MaterialIcons name="sports-soccer" size={32} color={theme.colors.primary} />
          </View>
          <View style={styles.teamInfo}>
            <Text style={styles.teamName}>{item.name}</Text>
            {item.jahrgang && <Text style={styles.teamJahrgang}>Jahrgang {item.jahrgang}</Text>}
          </View>
          <MaterialIcons name="chevron-right" size={24} color={theme.colors.text.secondary} />
        </View>
        <View style={styles.teamFooter}>
          <View style={styles.statsItem}>
            <MaterialIcons name="person" size={16} color={theme.colors.text.secondary} />
            <Text style={styles.statsText}>{teamPlayers.length} Spieler</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Screen scroll={false} padding={false}>
      <Header
        title="Teams"
        rightAction={
          <TouchableOpacity onPress={() => setModalVisible(true)}>
            <MaterialIcons name="add" size={28} color={theme.colors.text.inverse} />
          </TouchableOpacity>
        }
      />
      
      {teams.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="groups" size={80} color={theme.colors.text.light} />
          <Text style={styles.emptyTitle}>Noch keine Teams</Text>
          <Text style={styles.emptyText}>Erstelle dein erstes Team, um zu beginnen</Text>
          <Button title="Team erstellen" onPress={() => setModalVisible(true)} />
        </View>
      ) : (
        <FlatList
          data={teams}
          renderItem={renderTeam}
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
                    <Text style={styles.modalTitle}>Neues Team</Text>
                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                      <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
                    </TouchableOpacity>
                  </View>
                  
                  <Input
                    label="Teamname *"
                    placeholder="z.B. U7/1"
                    value={name}
                    onChangeText={setName}
                    autoFocus
                  />
                  
                  <Input
                    label="Jahrgang"
                    placeholder="z.B. 2018"
                    value={jahrgang}
                    onChangeText={setJahrgang}
                    keyboardType="numeric"
                  />
                  
                  <Input
                    label="Trainer"
                    placeholder="z.B. Max Mustermann"
                    value={trainer}
                    onChangeText={setTrainer}
                  />
                  
                  <View style={styles.modalActions}>
                    <Button
                      title="Abbrechen"
                      variant="outline"
                      onPress={() => setModalVisible(false)}
                      style={styles.modalButton}
                    />
                    <Button
                      title="Erstellen"
                      onPress={handleAddTeam}
                      disabled={!name.trim()}
                      style={styles.modalButton}
                    />
                  </View>
                </View>
              </ScrollView>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {Platform.OS === 'web' && (
        <Modal visible={webAlertConfig.visible} transparent animationType="fade">
          <View style={styles.alertOverlay}>
            <View style={styles.alertBox}>
              <Text style={styles.alertTitle}>{webAlertConfig.title}</Text>
              <Text style={styles.alertMessage}>{webAlertConfig.message}</Text>
              <TouchableOpacity
                style={styles.alertButton}
                onPress={() => setWebAlertConfig(prev => ({ ...prev, visible: false }))}
              >
                <Text style={styles.alertButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
    marginBottom: theme.spacing.xl,
  },
  teamCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  teamIcon: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  teamJahrgang: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  teamFooter: {
    flexDirection: 'row',
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  statsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.lg,
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
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  alertBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    minWidth: 280,
    maxWidth: 400,
  },
  alertTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  alertMessage: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.lg,
  },
  alertButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  alertButtonText: {
    color: theme.colors.text.inverse,
    fontWeight: theme.fontWeight.bold,
    fontSize: theme.fontSize.md,
  },
});
