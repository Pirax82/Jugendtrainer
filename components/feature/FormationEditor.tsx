import React, { useState, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Modal, PanResponder, Animated, LayoutChangeEvent, GestureResponderEvent, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Player, Formation, PlayerPosition } from '../../types';
import { theme } from '../../constants/theme';

// Draggable Player Component for smooth drag & drop
interface DraggablePlayerProps {
  player: Player;
  position: PlayerPosition;
  isRepositioning: boolean;
  fieldLayout: { x: number; y: number; width: number; height: number };
  onPress: () => void;
  onDragEnd: (x: number, y: number) => void;
}

function DraggablePlayer({ player, position, isRepositioning, fieldLayout, onPress, onDragEnd }: DraggablePlayerProps) {
  const pan = useRef(new Animated.ValueXY()).current;
  const [isDragging, setIsDragging] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const startPosition = useRef({ x: 0, y: 0 });

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      // Only set responder if moved significantly (prevents accidental drags)
      return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
    },
    onPanResponderGrant: (evt) => {
      startPosition.current = {
        x: (position.x / 100) * fieldLayout.width,
        y: (position.y / 100) * fieldLayout.height
      };
      pan.setOffset({
        x: 0,
        y: 0,
      });
      pan.setValue({ x: 0, y: 0 });
      
      // Start long press timer for drag mode
      longPressTimer.current = setTimeout(() => {
        setIsDragging(true);
      }, 150);
    },
    onPanResponderMove: (_, gestureState) => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      setIsDragging(true);
      
      Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      })(_, gestureState);
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      
      // If just a tap (no significant movement), trigger onPress
      if (Math.abs(gestureState.dx) < 10 && Math.abs(gestureState.dy) < 10 && !isDragging) {
        onPress();
        pan.setValue({ x: 0, y: 0 });
        setIsDragging(false);
        return;
      }
      
      if (isDragging && fieldLayout.width > 0) {
        // Calculate new position as percentage
        const newX = Math.max(5, Math.min(95, position.x + (gestureState.dx / fieldLayout.width) * 100));
        const newY = Math.max(5, Math.min(95, position.y + (gestureState.dy / fieldLayout.height) * 100));
        
        onDragEnd(newX, newY);
      }
      
      pan.setValue({ x: 0, y: 0 });
      setIsDragging(false);
    },
    onPanResponderTerminate: () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      pan.setValue({ x: 0, y: 0 });
      setIsDragging(false);
    },
  }), [position, fieldLayout, isDragging, onPress, onDragEnd]);

  return (
    <Animated.View
      style={[
        styles.playerOnField,
        {
          left: `${position.x}%`,
          top: `${position.y}%`,
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
          zIndex: isDragging ? 100 : 1,
        },
        isRepositioning && styles.playerRepositioning,
        isDragging && styles.playerDragging,
      ]}
      {...panResponder.panHandlers}
    >
      <View style={[
        styles.playerCircle,
        isRepositioning && styles.playerCircleRepositioning,
        isDragging && styles.playerCircleDragging,
      ]}>
        <Text style={styles.playerNumber}>{player.nummer || '?'}</Text>
      </View>
      <Text style={styles.playerNameOnField} numberOfLines={1}>
        {player.name.split(' ')[0]}
      </Text>
      {isDragging && (
        <View style={styles.dragIndicator}>
          <MaterialIcons name="open-with" size={14} color={theme.colors.text.inverse} />
        </View>
      )}
    </Animated.View>
  );
}

interface FormationEditorProps {
  players: Player[];
  formation?: Formation;
  onSave: (formation: Formation) => void;
  onCancel: () => void;
}

export default function FormationEditor({ players, formation, onSave, onCancel }: FormationEditorProps) {
  const [currentFormation, setCurrentFormation] = useState<Formation>(
    formation || {
      starters: [],
      substitutes: players.map(p => p.id),
    }
  );
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [fieldLayout, setFieldLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [repositioningPlayer, setRepositioningPlayer] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPlayer, setMenuPlayer] = useState<string | null>(null);
  const [hasNewPlayers, setHasNewPlayers] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const fieldRef = useRef<View>(null);

  // Check for new players
  React.useEffect(() => {
    const allFormationPlayers = [...currentFormation.starters.map(s => s.playerId), ...currentFormation.substitutes];
    const newPlayers = players.filter(p => !allFormationPlayers.includes(p.id));
    setHasNewPlayers(newPlayers.length > 0);
  }, [players, currentFormation]);

  const fieldWidth = Dimensions.get('window').width - theme.spacing.lg * 2;
  const fieldHeight = fieldWidth * 1.5; // 2:3 aspect ratio for football field

  // Improved field layout measurement
  const handleFieldLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (fieldRef.current) {
      fieldRef.current.measure((fx, fy, w, h, px, py) => {
        setFieldLayout({ x: px, y: py, width: w, height: h });
      });
    }
  }, []);

  const calculatePosition = useCallback((pageX: number, pageY: number) => {
    const x = Math.max(5, Math.min(95, ((pageX - fieldLayout.x) / fieldLayout.width) * 100));
    const y = Math.max(5, Math.min(95, ((pageY - fieldLayout.y) / fieldLayout.height) * 100));
    return { x, y };
  }, [fieldLayout]);

  const handleFieldPress = (event: any) => {
    // Get touch coordinates relative to the field
    const { pageX, pageY } = event.nativeEvent;
    const { x, y } = calculatePosition(pageX, pageY);

    // Check if we're repositioning an existing player
    if (repositioningPlayer) {
      setCurrentFormation(prev => ({
        ...prev,
        starters: prev.starters.map(s => 
          s.playerId === repositioningPlayer 
            ? { ...s, x, y }
            : s
        ),
      }));
      setRepositioningPlayer(null);
      return;
    }

    // Place a new player from the bench
    if (!selectedPlayer) return;

    // Remove player from substitutes
    const newSubstitutes = currentFormation.substitutes.filter(id => id !== selectedPlayer);
    
    // Remove player if already in starters (to move them)
    const newStarters = currentFormation.starters.filter(s => s.playerId !== selectedPlayer);
    
    // Add player to new position
    newStarters.push({ playerId: selectedPlayer, x, y });

    setCurrentFormation({
      starters: newStarters,
      substitutes: newSubstitutes,
    });
    setSelectedPlayer(null);
  };

  const handlePlayerOnFieldPress = (playerId: string) => {
    setMenuPlayer(playerId);
    setMenuVisible(true);
  };

  const handleRemoveFromField = () => {
    if (!menuPlayer) return;
    
    const newStarters = currentFormation.starters.filter(s => s.playerId !== menuPlayer);
    const newSubstitutes = [...currentFormation.substitutes, menuPlayer];
    
    setCurrentFormation({
      starters: newStarters,
      substitutes: newSubstitutes,
    });
    setMenuVisible(false);
    setMenuPlayer(null);
  };

  const handleRepositionPlayer = () => {
    setRepositioningPlayer(menuPlayer);
    setMenuVisible(false);
    setMenuPlayer(null);
  };

  const handleRefresh = () => {
    const allFormationPlayers = [...currentFormation.starters.map(s => s.playerId), ...currentFormation.substitutes];
    const existingPlayerIds = players.map(p => p.id);
    
    // Add new players to substitutes
    const newPlayers = players.filter(p => !allFormationPlayers.includes(p.id));
    
    // Remove players that no longer exist
    const validStarters = currentFormation.starters.filter(s => existingPlayerIds.includes(s.playerId));
    const validSubstitutes = currentFormation.substitutes.filter(id => existingPlayerIds.includes(id));
    
    setCurrentFormation({
      starters: validStarters,
      substitutes: [...validSubstitutes, ...newPlayers.map(p => p.id)],
    });
    
    setHasNewPlayers(false);
  };

  const handleSave = () => {
    onSave(currentFormation);
  };

  const getPlayerById = (id: string) => players.find(p => p.id === id);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Aufstellung bearbeiten</Text>
          {hasNewPlayers && (
            <View style={styles.newPlayersBadge}>
              <Text style={styles.newPlayersBadgeText}>Neu</Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
            <MaterialIcons name="refresh" size={24} color={hasNewPlayers ? theme.colors.success : theme.colors.text.secondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onCancel}>
            <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.fieldContainer}>
          <Text style={styles.sectionTitle}>
            Spielfeld ({currentFormation.starters.length}/{players.length})
          </Text>
          <Text style={styles.instruction}>
            {repositioningPlayer
              ? '📍 Tippe auf die neue Position'
              : selectedPlayer 
              ? '👆 Tippe aufs Feld, um zu platzieren'
              : '✋ Wähle einen Spieler aus der Bank oder ziehe Spieler auf dem Feld'}
          </Text>
          
          <TouchableOpacity
            ref={fieldRef}
            style={[styles.field, (selectedPlayer || repositioningPlayer) && styles.fieldActive]}
            onPress={handleFieldPress}
            onLayout={handleFieldLayout}
            activeOpacity={0.9}
            disabled={!selectedPlayer && !repositioningPlayer}
          >
            {/* Field markings */}
            <View style={styles.fieldMarkings}>
              <View style={styles.centerLine} />
              <View style={styles.centerCircle} />
              <View style={styles.penaltyBoxTop} />
              <View style={styles.penaltyBoxBottom} />
            </View>

            {/* Player positions */}
            {currentFormation.starters.map(position => {
              const player = getPlayerById(position.playerId);
              if (!player) return null;

              return (
                <DraggablePlayer
                  key={position.playerId}
                  player={player}
                  position={position}
                  isRepositioning={repositioningPlayer === position.playerId}
                  fieldLayout={fieldLayout}
                  onPress={() => handlePlayerOnFieldPress(position.playerId)}
                  onDragEnd={(newX, newY) => {
                    setCurrentFormation(prev => ({
                      ...prev,
                      starters: prev.starters.map(s => 
                        s.playerId === position.playerId 
                          ? { ...s, x: newX, y: newY }
                          : s
                      ),
                    }));
                  }}
                />
              );
            })}
          </TouchableOpacity>
        </View>

        <View style={styles.substitutesContainer}>
          <Text style={styles.sectionTitle}>
            Bank ({currentFormation.substitutes.length})
          </Text>
          <View style={styles.substitutesList}>
            {currentFormation.substitutes.map(playerId => {
              const player = getPlayerById(playerId);
              if (!player) return null;

              return (
                <TouchableOpacity
                  key={playerId}
                  style={[
                    styles.substituteCard,
                    selectedPlayer === playerId && styles.substituteCardSelected,
                  ]}
                  onPress={() => setSelectedPlayer(playerId === selectedPlayer ? null : playerId)}
                >
                  <View style={styles.playerAvatar}>
                    <Text style={styles.playerAvatarText}>
                      {player.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </Text>
                  </View>
                  <View style={styles.substituteInfo}>
                    <Text style={styles.substituteName}>{player.name}</Text>
                    {player.nummer && (
                      <Text style={styles.substituteNummer}>#{player.nummer}</Text>
                    )}
                  </View>
                  {selectedPlayer === playerId && (
                    <MaterialIcons name="check-circle" size={24} color={theme.colors.success} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Abbrechen</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Speichern</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.menuOverlay} 
          activeOpacity={1}
          onPress={() => {
            setMenuVisible(false);
            setMenuPlayer(null);
          }}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleRepositionPlayer}
            >
              <MaterialIcons name="open-with" size={24} color={theme.colors.primary} />
              <Text style={styles.menuItemText}>Neu positionieren</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleRemoveFromField}
            >
              <MaterialIcons name="event-seat" size={24} color={theme.colors.warning} />
              <Text style={styles.menuItemText}>Zur Bank</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  refreshButton: {
    padding: theme.spacing.xs,
  },
  newPlayersBadge: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  newPlayersBadgeText: {
    color: theme.colors.text.inverse,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  content: {
    flex: 1,
  },
  fieldContainer: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  instruction: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
  },
  field: {
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: '#4CAF50',
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    position: 'relative',
    overflow: 'hidden',
    ...theme.shadows.lg,
  },
  fieldActive: {
    borderColor: theme.colors.primary,
    borderWidth: 3,
  },
  fieldMarkings: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  centerLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  centerCircle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 60,
    height: 60,
    marginLeft: -30,
    marginTop: -30,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  penaltyBoxTop: {
    position: 'absolute',
    top: 0,
    left: '25%',
    width: '50%',
    height: '15%',
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  penaltyBoxBottom: {
    position: 'absolute',
    bottom: 0,
    left: '25%',
    width: '50%',
    height: '15%',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  playerOnField: {
    position: 'absolute',
    alignItems: 'center',
    marginLeft: -20,
    marginTop: -20,
  },
  playerRepositioning: {
    opacity: 0.6,
  },
  playerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...theme.shadows.md,
  },
  playerCircleRepositioning: {
    borderColor: theme.colors.goal,
    borderWidth: 3,
  },
  playerDragging: {
    opacity: 0.9,
  },
  playerCircleDragging: {
    backgroundColor: theme.colors.success,
    transform: [{ scale: 1.2 }],
  },
  dragIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: theme.colors.success,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerNumber: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
  playerNameOnField: {
    marginTop: theme.spacing.xs,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.inverse,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    maxWidth: 60,
    textAlign: 'center',
  },
  substitutesContainer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    marginTop: theme.spacing.md,
  },
  substitutesList: {
    gap: theme.spacing.sm,
  },
  substituteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  substituteCardSelected: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.surface,
  },
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  playerAvatarText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
  substituteInfo: {
    flex: 1,
  },
  substituteName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  substituteNummer: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
  },
  saveButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.sm,
    minWidth: 250,
    ...theme.shadows.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.md,
  },
  menuItemDanger: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  menuItemText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  menuItemTextDanger: {
    color: theme.colors.error,
  },
});


