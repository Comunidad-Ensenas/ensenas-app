import { Card } from '@/components/common/Card';
import { IconBox } from '@/components/common/IconBox';
import { IconButton } from '@/components/common/IconButton';
import { Typography } from '@/components/common/Typography';
import { db } from '@/db';
import { profile } from '@/db/schema';
import { useTheme } from '@/hooks/useTheme';
import { router, Stack } from 'expo-router';
import {
  BookStack,
  Calendar,
  Check,
  Heart,
  NavArrowLeft,
  NavArrowRight,
  PeaceHand,
  Rocket,
  Settings,
  Star,
  Timer,
  User
} from 'iconoir-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const MOTIVATIONS = [
  'Familiar Sordo',
  'Profesional',
  'Curiosidad',
  'Académico',
  'Inclusión',
  'Comunicación',
  'Voluntariado',
  'Salud'
];

export default function OnboardingScreen() {
  const { colors, isDark } = useTheme();
  const palette = (colors as any).palette;
  const insets = useSafeAreaInsets();
  
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [learningMotivations, setLearningMotivations] = useState<string[]>([]);
  const [isLeftHanded, setIsLeftHanded] = useState(false);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(5);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const TOTAL_STEPS = 5;

  const handleDateChange = (text: string) => {
    let cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length > 2 && cleaned.length <= 4) {
      cleaned = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
    } else if (cleaned.length > 4) {
      cleaned = cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4) + '/' + cleaned.slice(4, 8);
    }
    setBirthdate(cleaned);
  };

  const isValidBirthdate = (dateStr: string) => {
    if (dateStr.length !== 10) return false;
    const [day, month, year] = dateStr.split('/').map(Number);
    if (!day || !month || !year) return false;
    if (month < 1 || month > 12) return false;
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) return false;

    const today = new Date();
    const birthDateObj = new Date(year, month - 1, day);
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const m = today.getMonth() - birthDateObj.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    return age >= 3 && age <= 99;
  };

  const toggleMotivation = (mot: string) => {
    if (learningMotivations.includes(mot)) {
      setLearningMotivations(learningMotivations.filter(m => m !== mot));
    } else {
      setLearningMotivations([...learningMotivations, mot]);
    }
  };

  useEffect(() => {
    if (step > 0) {
      Animated.timing(progressAnim, {
        toValue: step / TOTAL_STEPS,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    }
  }, [step]);

  const animateTransition = (nextStep: number, direction: 'forward' | 'backward') => {
    const offset = direction === 'forward' ? -width : width;
    const incomingOffset = direction === 'forward' ? width : -width;

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: offset,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      setStep(nextStep);
      slideAnim.setValue(incomingOffset);

      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        })
      ]).start();
    });
  };

  const isNextDisabled = 
    (step === 1 && !firstName.trim()) || 
    (step === 2 && !isValidBirthdate(birthdate)) ||
    (step === 3 && (!experienceLevel || learningMotivations.length === 0));

  const handleNext = () => {
    if (isNextDisabled) return;
    animateTransition(step + 1, 'forward');
  };

  const handleBack = () => {
    if (step > 0) {
      animateTransition(step - 1, 'backward');
    }
  };

  const handleSave = async () => {
    try {
      const [day, month, year] = birthdate.split('/');
      const formattedBirthdate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

      await db.insert(profile).values({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthdate: formattedBirthdate,
        experienceLevel,
        learningMotivation: learningMotivations.join(', '),
        isLeftHanded,
        dailyGoalMinutes,
      });
      router.replace('./(tabs)');
    } catch (error) {
      console.error(error);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.stepContainer}>
            <IconBox 
              size={120} 
              icon={<PeaceHand width={56} height={56} color={palette.powderBlush} strokeWidth={2} />} 
              backgroundColor={palette.powderBlush + '20'}
              style={{ marginBottom: 32, marginTop: 20 }}
            />
            <Typography variant="h1" style={{ marginBottom: 12, textAlign: 'center' }}>¡Bienvenido!</Typography>
            <Typography variant="subtitle" color={colors.textSecondary} style={{ textAlign: 'center', lineHeight: 24, paddingHorizontal: 12 }}>
              Aprende Lengua de Señas de forma interactiva y a tu propio ritmo. Vamos a configurar tu perfil.
            </Typography>
          </View>
        );
      case 1:
        return (
          <View style={styles.stepContainer}>
            <IconBox 
              size={96} 
              icon={<User width={40} height={40} color={palette.deepSkyBlue} strokeWidth={2} />} 
              backgroundColor={palette.deepSkyBlue + '20'}
              style={{ marginBottom: 32 }}
            />
            <Typography variant="h2" style={{ marginBottom: 8, textAlign: 'center' }}>Identidad</Typography>
            <Typography variant="body" color={colors.textSecondary} style={{ textAlign: 'center', marginBottom: 32 }}>
              ¿Cómo te gustaría que te llamemos?
            </Typography>
            
            <View style={styles.formGroup}>
              <Typography variant="label" color={colors.textSecondary} style={{ marginBottom: 8, marginLeft: 4 }}>Nombre *</Typography>
              <TextInput
                style={[
                  styles.input, 
                  { 
                    color: colors.text, 
                    backgroundColor: colors.input, 
                    borderColor: firstName ? palette.deepSkyBlue : 'transparent',
                  }
                ]}
                placeholder="Ej. Alberto"
                placeholderTextColor={colors.textSecondary}
                value={firstName}
                onChangeText={setFirstName}
                maxLength={30}
                autoFocus
              />
            </View>

            <View style={styles.formGroup}>
              <Typography variant="label" color={colors.textSecondary} style={{ marginBottom: 8, marginLeft: 4 }}>Apellido (Opcional)</Typography>
              <TextInput
                style={[
                  styles.input, 
                  { 
                    color: colors.text, 
                    backgroundColor: colors.input, 
                    borderColor: lastName ? palette.deepSkyBlue : 'transparent',
                  }
                ]}
                placeholder="Ej. López"
                placeholderTextColor={colors.textSecondary}
                value={lastName}
                onChangeText={setLastName}
                maxLength={30}
              />
            </View>
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContainer}>
            <IconBox 
              size={96} 
              icon={<Calendar width={40} height={40} color={palette.deepSkyBlue} strokeWidth={2} />} 
              backgroundColor={palette.deepSkyBlue + '20'}
              style={{ marginBottom: 32 }}
            />
            <Typography variant="h2" style={{ marginBottom: 8, textAlign: 'center' }}>¿Cuándo naciste?</Typography>
            <Typography variant="body" color={colors.textSecondary} style={{ textAlign: 'center', marginBottom: 32 }}>
              Para adaptar tu experiencia.
            </Typography>
            <TextInput
              style={[
                styles.inputLarge, 
                { 
                  color: colors.text, 
                  backgroundColor: colors.input, 
                  borderColor: isValidBirthdate(birthdate) ? palette.deepSkyBlue : 'transparent',
                }
              ]}
              placeholder="DD / MM / AAAA"
              placeholderTextColor={colors.textSecondary}
              value={birthdate}
              onChangeText={handleDateChange}
              keyboardType="numeric"
              maxLength={10}
              autoFocus
            />
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContainer}>
            <IconBox 
              size={96} 
              icon={<Star width={40} height={40} color={palette.powderBlush} strokeWidth={2} />} 
              backgroundColor={palette.powderBlush + '20'}
              style={{ marginBottom: 24 }}
            />
            <Typography variant="h2" style={{ marginBottom: 8, textAlign: 'center' }}>Perfil de Estudiante</Typography>
            <Typography variant="body" color={colors.textSecondary} style={{ textAlign: 'center', marginBottom: 24 }}>
              Queremos conocerte un poco más.
            </Typography>

            <Typography variant="label" color={colors.text} style={{ width: '100%', marginBottom: 12 }}>Nivel previo de LSV</Typography>
            <View style={styles.chipContainer}>
              {['Ninguno', 'Básico', 'Intermedio'].map((lvl) => (
                <Pressable
                  key={lvl}
                  style={[
                    styles.chip,
                    { backgroundColor: colors.surface, borderColor: experienceLevel === lvl ? palette.powderBlush : 'transparent' }
                  ]}
                  onPress={() => setExperienceLevel(lvl)}
                >
                  <Typography variant="body" color={experienceLevel === lvl ? palette.powderBlush : colors.textSecondary} style={{ fontWeight: '600' }}>
                    {lvl}
                  </Typography>
                </Pressable>
              ))}
            </View>

            <Typography variant="label" color={colors.text} style={{ width: '100%', marginBottom: 12, marginTop: 12 }}>Motivaciones (Selecciona varias)</Typography>
            <View style={styles.chipContainer}>
              {MOTIVATIONS.map((mot) => {
                const isActive = learningMotivations.includes(mot);
                return (
                  <Pressable
                    key={mot}
                    style={[
                      styles.chip,
                      { backgroundColor: colors.surface, borderColor: isActive ? palette.powderBlush : 'transparent' }
                    ]}
                    onPress={() => toggleMotivation(mot)}
                  >
                    <Typography variant="body" color={isActive ? palette.powderBlush : colors.textSecondary} style={{ fontWeight: '600' }}>
                      {mot}
                    </Typography>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      case 4:
        return (
          <View style={styles.stepContainer}>
            <IconBox 
              size={96} 
              icon={<Settings width={40} height={40} color={'#F59E0B'} strokeWidth={2} />} 
              backgroundColor={'#F59E0B' + '20'}
              style={{ marginBottom: 24 }}
            />
            <Typography variant="h2" style={{ marginBottom: 8, textAlign: 'center' }}>Preferencias</Typography>
            <Typography variant="body" color={colors.textSecondary} style={{ textAlign: 'center', marginBottom: 24 }}>
              Configura tu entorno de práctica.
            </Typography>
            
            <Typography variant="label" color={colors.text} style={{ width: '100%', marginBottom: 12 }}>Mano dominante</Typography>
            <View style={styles.optionsContainer}>
              <Pressable
                style={[
                  styles.optionCardMini, 
                  { backgroundColor: colors.surface, borderColor: !isLeftHanded ? '#F59E0B' : 'transparent' }
                ]}
                onPress={() => setIsLeftHanded(false)}
              >
                <PeaceHand width={32} height={32} color={!isLeftHanded ? '#F59E0B' : colors.textSecondary} strokeWidth={1.5} />
                <Typography variant="subtitle" color={!isLeftHanded ? '#F59E0B' : colors.textSecondary} style={{ marginTop: 8 }}>Diestro</Typography>
              </Pressable>
              <Pressable
                style={[
                  styles.optionCardMini,
                  { backgroundColor: colors.surface, borderColor: isLeftHanded ? '#F59E0B' : 'transparent' }
                ]}
                onPress={() => setIsLeftHanded(true)}
              >
                <PeaceHand width={32} height={32} color={isLeftHanded ? '#F59E0B' : colors.textSecondary} strokeWidth={1.5} style={{ transform: [{ scaleX: -1 }] }} />
                <Typography variant="subtitle" color={isLeftHanded ? '#F59E0B' : colors.textSecondary} style={{ marginTop: 8 }}>Zurdo</Typography>
              </Pressable>
            </View>

            <Typography variant="label" color={colors.text} style={{ width: '100%', marginBottom: 12, marginTop: 12 }}>Meta diaria (Minutos)</Typography>
            <View style={styles.optionsContainer}>
              {[5, 10, 15, 20].map((mins) => {
                const isActive = dailyGoalMinutes === mins;
                return (
                  <Pressable
                    key={mins}
                    style={[
                      styles.goalOptionMini,
                      { backgroundColor: colors.surface, borderColor: isActive ? '#F59E0B' : 'transparent' }
                    ]}
                    onPress={() => setDailyGoalMinutes(mins)}
                  >
                    <Typography variant="h3" color={isActive ? '#F59E0B' : colors.textSecondary}>{mins}</Typography>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      case 5:
        return (
          <View style={styles.stepContainer}>
            <IconBox 
              size={96} 
              icon={<Rocket width={40} height={40} color={colors.success} strokeWidth={2} />} 
              backgroundColor={colors.successBg}
              style={{ marginBottom: 24 }}
            />
            <Typography variant="h2" style={{ marginBottom: 8, textAlign: 'center' }}>¡Todo listo!</Typography>
            <Typography variant="body" color={colors.textSecondary} style={{ textAlign: 'center', marginBottom: 24 }}>
              Así quedó configurado tu perfil.
            </Typography>
            
            <Card style={styles.summaryCard}>
              <View style={[styles.summaryRow, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
                <View style={styles.summaryIconLabel}>
                  <User width={20} height={20} color={colors.textSecondary} strokeWidth={2} />
                  <Typography variant="label" color={colors.textSecondary}>Identidad</Typography>
                </View>
                <Typography variant="body" style={styles.summaryValue} numberOfLines={1}>{firstName} {lastName}</Typography>
              </View>

              <View style={[styles.summaryRow, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
                <View style={styles.summaryIconLabel}>
                  <Calendar width={20} height={20} color={colors.textSecondary} strokeWidth={2} />
                  <Typography variant="label" color={colors.textSecondary}>Nacimiento</Typography>
                </View>
                <Typography variant="body" style={styles.summaryValue}>{birthdate}</Typography>
              </View>

              <View style={[styles.summaryRow, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
                <View style={styles.summaryIconLabel}>
                  <BookStack width={20} height={20} color={colors.textSecondary} strokeWidth={2} />
                  <Typography variant="label" color={colors.textSecondary}>Nivel</Typography>
                </View>
                <Typography variant="body" style={styles.summaryValue}>{experienceLevel}</Typography>
              </View>

              <View style={[styles.summaryRow, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
                <View style={styles.summaryIconLabel}>
                  <Heart width={20} height={20} color={colors.textSecondary} strokeWidth={2} />
                  <Typography variant="label" color={colors.textSecondary}>Motivación</Typography>
                </View>
                <Typography variant="body" style={styles.summaryValue} numberOfLines={2}>
                  {learningMotivations.join(', ')}
                </Typography>
              </View>

              <View style={[styles.summaryRow, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
                <View style={styles.summaryIconLabel}>
                  <PeaceHand width={20} height={20} color={colors.textSecondary} strokeWidth={2} />
                  <Typography variant="label" color={colors.textSecondary}>Mano</Typography>
                </View>
                <Typography variant="body" style={styles.summaryValue}>{isLeftHanded ? 'Zurdo' : 'Diestro'}</Typography>
              </View>

              <View style={[styles.summaryRow, { paddingBottom: 0 }]}>
                <View style={styles.summaryIconLabel}>
                  <Timer width={20} height={20} color={colors.textSecondary} strokeWidth={2} />
                  <Typography variant="label" color={colors.textSecondary}>Meta</Typography>
                </View>
                <Typography variant="body" style={styles.summaryValue}>{dailyGoalMinutes} min</Typography>
              </View>
            </Card>
          </View>
        );
      default:
        return null;
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.headerWrapper}>
          {step > 0 ? (
            <View style={styles.progressHeader}>
              <IconButton 
                size={44}
                backgroundColor={colors.surface}
                icon={<NavArrowLeft width={20} height={20} color={colors.text} strokeWidth={2.5} />}
                onPress={handleBack}
              />
              <View style={[styles.progressBarBg, { backgroundColor: colors.surface }]}>
                <Animated.View style={[styles.progressBarFill, { width: progressWidth, backgroundColor: colors.primary }]} />
              </View>
              <View style={styles.stepIndicatorContainer}>
                <Typography variant="label" color={colors.textSecondary}>{step}/{TOTAL_STEPS}</Typography>
              </View>
            </View>
          ) : (
            <View style={styles.headerPlaceholder} />
          )}
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Animated.View 
            style={[
              styles.content, 
              { 
                transform: [{ translateX: slideAnim }],
                opacity: fadeAnim 
              }
            ]}
          >
            {renderStepContent()}
          </Animated.View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 12, 24) }]}>
          {step < TOTAL_STEPS ? (
            <Pressable 
              style={({ pressed }) => [
                styles.heroButton,
                { backgroundColor: isNextDisabled ? colors.surface : palette.powderBlush },
                isNextDisabled && { borderWidth: 1, borderColor: colors.border },
                pressed && !isNextDisabled && styles.heroButtonPressed
              ]} 
              onPress={handleNext}
              disabled={isNextDisabled}
            >
              <Text style={[styles.heroButtonText, { color: isNextDisabled ? colors.textSecondary : (isDark ? '#111418' : '#FFFFFF') }]}>
                {step === 0 ? 'Comenzar' : 'Siguiente'}
              </Text>
              <NavArrowRight 
                width={22} 
                height={22} 
                color={isNextDisabled ? colors.textSecondary : (isDark ? '#111418' : '#FFFFFF')} 
                strokeWidth={3}
                style={styles.heroButtonIcon} 
              />
            </Pressable>
          ) : (
            <Pressable 
              style={({ pressed }) => [
                styles.heroButton,
                { backgroundColor: colors.success },
                pressed && styles.heroButtonPressed
              ]} 
              onPress={handleSave}
            >
              <Text style={[styles.heroButtonText, { color: isDark ? '#111418' : '#FFFFFF' }]}>
                Finalizar
              </Text>
              <Check 
                width={22} 
                height={22} 
                color={isDark ? '#111418' : '#FFFFFF'} 
                strokeWidth={3}
                style={styles.heroButtonIcon} 
              />
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerWrapper: {
    height: 60,
    justifyContent: 'center',
  },
  headerPlaceholder: {
    height: 60,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  progressBarBg: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  stepIndicatorContainer: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  stepContainer: {
    flexGrow: 1,
    alignItems: 'center',
  },
  formGroup: {
    width: '100%',
    marginBottom: 20,
  },
  input: {
    fontSize: 16,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontWeight: '600',
    width: '100%',
    borderWidth: 2,
  },
  inputLarge: {
    fontSize: 26,
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 24,
    fontWeight: '800',
    width: '100%',
    textAlign: 'center',
    borderWidth: 2,
    letterSpacing: 2,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 2,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  optionCardMini: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 20,
    borderWidth: 2,
    borderRadius: 24,
  },
  goalOptionMini: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderWidth: 2,
    borderRadius: 20,
    width: '22%',
  },
  summaryCard: {
    width: '100%',
    padding: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  summaryIconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 0,
  },
  summaryValue: {
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  heroButton: {
    flexDirection: 'row',
    paddingVertical: 22,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  heroButtonText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroButtonIcon: {
    marginLeft: 8,
  },
});