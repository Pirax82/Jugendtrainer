import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, TextInput, Modal, KeyboardAvoidingView, Platform, ScrollView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Eye, EyeOff, Users, Trophy, ChevronRight, X, Shield, FileText } from 'lucide-react-native';

export default function EntryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isTrainer, signIn, signUp, loading } = useAuth();
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showImprintModal, setShowImprintModal] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    // Check if Apple Authentication is available
    AppleAuthentication.isAvailableAsync().then(setAppleAuthAvailable);
  }, []);

  useEffect(() => {
    // If user is logged in, navigate based on role
    if (user) {
      if (isTrainer) {
        router.replace('/(tabs)');
      } else if (!showLoginModal) {
        // User is logged in but not a trainer, go to viewer
        // Only auto-navigate if we're not in the middle of showing login modal
        router.replace('/(viewer)');
      }
    }
  }, [user, isTrainer, showLoginModal]);

  const handleZuschauerPress = () => {
    router.replace('/(viewer)');
  };

  const handleTrainerPress = () => {
    if (user && isTrainer) {
      router.replace('/(tabs)');
    } else {
      setShowLoginModal(true);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Create account or sign in with Apple credential
      const appleEmail = credential.email || `apple_${credential.user}@privaterelay.appleid.com`;
      const appleName = credential.fullName?.givenName 
        ? `${credential.fullName.givenName} ${credential.fullName.familyName || ''}`.trim()
        : 'Apple User';
      
      // Try to sign in first using AuthContext
      const signInResult = await signIn(appleEmail, credential.user);
      
      if (signInResult.success) {
        setShowLoginModal(false);
        // Navigation happens via useEffect when user/isTrainer updates
      } else {
        // User doesn't exist, create account using AuthContext
        const signUpResult = await signUp(appleEmail, credential.user, appleName);
        
        if (signUpResult.success) {
          setShowLoginModal(false);
          Alert.alert(
            'Willkommen!',
            'Dein Account wurde erstellt. Ein Administrator muss dir noch Trainer-Rechte zuweisen.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Fehler', signUpResult.error || 'Anmeldung fehlgeschlagen');
        }
      }
    } catch (e: any) {
      if (e.code !== 'ERR_CANCELED') {
        Alert.alert('Fehler', 'Apple-Anmeldung fehlgeschlagen');
      }
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Fehler', 'Bitte E-Mail und Passwort eingeben');
      return;
    }

    if (isRegisterMode && !name.trim()) {
      Alert.alert('Fehler', 'Bitte Namen eingeben');
      return;
    }

    setLoginLoading(true);
    try {
      if (isRegisterMode) {
        const result = await signUp(email.trim(), password, name.trim());
        if (result.success) {
          setShowLoginModal(false);
          Alert.alert(
            'Willkommen!',
            'Dein Account wurde erstellt. Ein Administrator muss dir noch Trainer-Rechte zuweisen.',
            [{ text: 'OK', onPress: () => router.replace('/(viewer)') }]
          );
        } else {
          Alert.alert('Fehler', result.error || 'Registrierung fehlgeschlagen');
        }
      } else {
        const result = await signIn(email.trim(), password);
        if (result.success) {
          setShowLoginModal(false);
          // Navigation happens via useEffect when user/isTrainer updates
        } else {
          Alert.alert('Fehler', result.error || 'Anmeldung fehlgeschlagen');
        }
      }
    } finally {
      setLoginLoading(false);
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Laden...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>TV Schweinheim</Text>
          <Text style={styles.subtitle}>Jugendtrainer</Text>
        </View>

        {/* Choice Cards */}
        <View style={styles.cardsContainer}>
          {/* Zuschauer Card */}
          <TouchableOpacity 
            style={styles.card} 
            onPress={handleZuschauerPress}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#4a5568', '#2d3748']}
              style={styles.cardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Users size={48} color="#fff" strokeWidth={1.5} />
              <Text style={styles.cardTitle}>Zuschauer</Text>
              <Text style={styles.cardDescription}>
                Live-Ergebnisse verfolgen{'\n'}Turniere & Spiele ansehen
              </Text>
              <View style={styles.cardArrow}>
                <ChevronRight size={24} color="#fff" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Trainer Card */}
          <TouchableOpacity 
            style={styles.card} 
            onPress={handleTrainerPress}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#e53e3e', '#c53030']}
              style={styles.cardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Trophy size={48} color="#fff" strokeWidth={1.5} />
              <Text style={styles.cardTitle}>Trainer</Text>
              <Text style={styles.cardDescription}>
                Teams verwalten{'\n'}Turniere organisieren
              </Text>
              <View style={styles.cardArrow}>
                <ChevronRight size={24} color="#fff" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer with Legal Links */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={() => setShowPrivacyModal(true)}>
            <Text style={styles.footerLink}>Datenschutz</Text>
          </TouchableOpacity>
          <Text style={styles.footerDivider}>•</Text>
          <TouchableOpacity onPress={() => setShowImprintModal(true)}>
            <Text style={styles.footerLink}>Impressum</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.footerVersion}>Version 1.0.0</Text>
      </View>

      {/* Login Modal */}
      <Modal
        visible={showLoginModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowLoginModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isRegisterMode ? 'Registrieren' : 'Trainer-Anmeldung'}
              </Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowLoginModal(false)}
              >
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Apple Sign In */}
              {appleAuthAvailable && (
                <>
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                    cornerRadius={12}
                    style={styles.appleButton}
                    onPress={handleAppleSignIn}
                  />
                  
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>oder</Text>
                    <View style={styles.dividerLine} />
                  </View>
                </>
              )}

              {/* Email/Password Form */}
              {isRegisterMode && (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Name</Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Dein Name"
                    placeholderTextColor="#999"
                    autoCapitalize="words"
                  />
                </View>
              )}

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>E-Mail</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="email@example.com"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Passwort</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor="#999"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity 
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff size={20} color="#666" />
                    ) : (
                      <Eye size={20} color="#666" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.loginButton, loginLoading && styles.loginButtonDisabled]}
                onPress={handleEmailLogin}
                disabled={loginLoading}
              >
                <Text style={styles.loginButtonText}>
                  {loginLoading ? 'Wird geladen...' : (isRegisterMode ? 'Registrieren' : 'Anmelden')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchModeButton}
                onPress={() => setIsRegisterMode(!isRegisterMode)}
              >
                <Text style={styles.switchModeText}>
                  {isRegisterMode 
                    ? 'Bereits registriert? Anmelden' 
                    : 'Noch kein Konto? Registrieren'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.infoText}>
                Nach der Registrierung muss ein Administrator dir Trainer-Rechte zuweisen.
              </Text>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal
        visible={showPrivacyModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <View style={styles.legalModalOverlay}>
          <View style={styles.legalModalContent}>
            <View style={styles.legalModalHeader}>
              <Shield size={28} color="#e53e3e" />
              <Text style={styles.legalModalTitle}>Datenschutz</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowPrivacyModal(false)}
              >
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.legalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.legalSectionTitle}>Datenschutzerklärung</Text>
              <Text style={styles.legalText}>
                Der Schutz Ihrer personenbezogenen Daten ist uns ein wichtiges Anliegen. 
                Diese Datenschutzerklärung informiert Sie über die Verarbeitung Ihrer 
                Daten in unserer App.
              </Text>

              <Text style={styles.legalSectionTitle}>Verantwortlicher</Text>
              <Text style={styles.legalText}>
                Frank Giegerich{'\n'}
                E-Mail: Frank.Giegerich@tekanet.com
              </Text>

              <Text style={styles.legalSectionTitle}>Erhobene Daten</Text>
              <Text style={styles.legalText}>
                Die App erfasst und verarbeitet folgende Daten:{'\n\n'}
                • Teamnamen und Spielerinformationen{'\n'}
                • Turnier- und Spielergebnisse{'\n'}
                • Statistiken und Spielberichte{'\n'}
                • Bei Registrierung: E-Mail-Adresse und Name
              </Text>

              <Text style={styles.legalSectionTitle}>Zweck der Datenverarbeitung</Text>
              <Text style={styles.legalText}>
                Alle Daten werden ausschließlich für den Trainingsbetrieb verwendet. 
                Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO 
                (Vertragserfüllung) sowie Art. 6 Abs. 1 lit. a DSGVO (Einwilligung).
              </Text>

              <Text style={styles.legalSectionTitle}>Datenweitergabe</Text>
              <Text style={styles.legalText}>
                Ihre Daten werden nicht an Dritte weitergegeben, es sei denn, dies 
                ist zur Vertragserfüllung erforderlich oder Sie haben ausdrücklich 
                eingewilligt.
              </Text>

              <Text style={styles.legalSectionTitle}>Speicherdauer</Text>
              <Text style={styles.legalText}>
                Ihre Daten werden nur so lange gespeichert, wie es für die genannten 
                Zwecke erforderlich ist oder gesetzliche Aufbewahrungsfristen bestehen.
              </Text>

              <Text style={styles.legalSectionTitle}>Kinderfotos</Text>
              <Text style={styles.legalText}>
                Für die Verwendung von Kinderfotos in der App ist die ausdrückliche 
                Einwilligung der Sorgeberechtigten erforderlich. Diese kann jederzeit 
                widerrufen werden.
              </Text>

              <Text style={styles.legalSectionTitle}>Ihre Rechte</Text>
              <Text style={styles.legalText}>
                Sie haben jederzeit das Recht auf:{'\n\n'}
                • Auskunft über Ihre gespeicherten Daten{'\n'}
                • Berichtigung unrichtiger Daten{'\n'}
                • Löschung Ihrer Daten{'\n'}
                • Einschränkung der Verarbeitung{'\n'}
                • Datenübertragbarkeit{'\n'}
                • Widerruf erteilter Einwilligungen{'\n\n'}
                Zur Ausübung Ihrer Rechte wenden Sie sich bitte an: 
                Frank.Giegerich@tekanet.com
              </Text>

              <Text style={styles.legalSectionTitle}>Beschwerderecht</Text>
              <Text style={styles.legalText}>
                Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde 
                zu beschweren, wenn Sie der Ansicht sind, dass die Verarbeitung 
                Ihrer Daten gegen die DSGVO verstößt.
              </Text>

              <View style={styles.legalFooter}>
                <Text style={styles.legalFooterText}>Stand: Dezember 2025</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Imprint Modal */}
      <Modal
        visible={showImprintModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowImprintModal(false)}
      >
        <View style={styles.legalModalOverlay}>
          <View style={styles.legalModalContent}>
            <View style={styles.legalModalHeader}>
              <FileText size={28} color="#e53e3e" />
              <Text style={styles.legalModalTitle}>Impressum</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowImprintModal(false)}
              >
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.legalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.legalSectionTitle}>Angaben gemäß § 5 TMG</Text>
              <Text style={styles.legalText}>
                Frank Giegerich{'\n'}
                E-Mail: Frank.Giegerich@tekanet.com
              </Text>

              <Text style={styles.legalSectionTitle}>Kontakt</Text>
              <TouchableOpacity onPress={() => Linking.openURL('mailto:Frank.Giegerich@tekanet.com')}>
                <Text style={[styles.legalText, styles.legalLink]}>
                  Frank.Giegerich@tekanet.com
                </Text>
              </TouchableOpacity>

              <Text style={styles.legalSectionTitle}>Verantwortlich für den Inhalt</Text>
              <Text style={styles.legalText}>
                Frank Giegerich{'\n'}
                (Adresse wie oben)
              </Text>

              <Text style={styles.legalSectionTitle}>Haftungsausschluss</Text>
              
              <Text style={styles.legalSubsectionTitle}>Haftung für Inhalte</Text>
              <Text style={styles.legalText}>
                Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte 
                in dieser App nach den allgemeinen Gesetzen verantwortlich. Nach 
                §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, 
                übermittelte oder gespeicherte fremde Informationen zu überwachen.
              </Text>

              <Text style={styles.legalSubsectionTitle}>Haftung für Links</Text>
              <Text style={styles.legalText}>
                Unsere App enthält Links zu externen Websites Dritter, auf deren 
                Inhalte wir keinen Einfluss haben. Für die Inhalte der verlinkten 
                Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten 
                verantwortlich.
              </Text>

              <Text style={styles.legalSectionTitle}>Urheberrecht</Text>
              <Text style={styles.legalText}>
                Die durch die Seitenbetreiber erstellten Inhalte und Werke in 
                dieser App unterliegen dem deutschen Urheberrecht. Die 
                Vervielfältigung, Bearbeitung, Verbreitung und jede Art der 
                Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen 
                der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
              </Text>

              <Text style={styles.legalSectionTitle}>Streitschlichtung</Text>
              <Text style={styles.legalText}>
                Die Europäische Kommission stellt eine Plattform zur 
                Online-Streitbeilegung (OS) bereit:{'\n'}
                https://ec.europa.eu/consumers/odr{'\n\n'}
                Wir sind nicht bereit oder verpflichtet, an 
                Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle 
                teilzunehmen.
              </Text>

              <View style={styles.legalFooter}>
                <Text style={styles.legalFooterText}>Stand: Dezember 2025</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  cardGradient: {
    padding: 24,
    paddingRight: 48,
    position: 'relative',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
  },
  cardArrow: {
    position: 'absolute',
    right: 20,
    top: '50%',
    marginTop: -12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  closeButton: {
    padding: 8,
  },
  appleButton: {
    width: '100%',
    height: 50,
    marginBottom: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    paddingHorizontal: 16,
    color: '#999',
    fontSize: 14,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#333',
  },
  eyeButton: {
    padding: 16,
  },
  loginButton: {
    backgroundColor: '#e53e3e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchModeButton: {
    padding: 16,
    alignItems: 'center',
  },
  switchModeText: {
    color: '#e53e3e',
    fontSize: 14,
    fontWeight: '500',
  },
  infoText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 16,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  footerLink: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  footerDivider: {
    color: 'rgba(255,255,255,0.4)',
    marginHorizontal: 12,
  },
  footerVersion: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  legalModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  legalModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  legalModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 12,
  },
  legalModalTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  legalScroll: {
    padding: 20,
  },
  legalSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
    marginTop: 20,
    marginBottom: 10,
  },
  legalSubsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  legalText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#555',
    marginBottom: 8,
  },
  legalLink: {
    color: '#e53e3e',
    textDecorationLine: 'underline',
  },
  legalFooter: {
    alignItems: 'center',
    paddingVertical: 30,
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  legalFooterText: {
    fontSize: 13,
    color: '#999',
  },
});
