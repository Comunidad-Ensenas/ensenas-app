import { db } from '@/db';
import { profile } from '@/db/schema';
import { useTheme } from '@/hooks/useTheme';
import { MaterialIcons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
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

export default function OnboardingScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLeftHanded, setIsLeftHanded] = useState(false);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(5);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const TOTAL_STEPS = 5;

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

  const handleNext = () => {
    if (step === 1 && firstName.trim() === '') return;
    animateTransition(step + 1, 'forward');
  };

  const handleBack = () => {
    if (step > 0) {
      animateTransition(step - 1, 'backward');
    }
  };

  const handleSave = async () => {
    try {
      await db.insert(profile).values({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
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
            <View style={[styles.welcomeIconContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <MaterialIcons name="waving-hand" size={64} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>¡Bienvenido!</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Aprende Lengua de Señas de forma interactiva y a tu propio ritmo. Vamos a configurar tu perfil.
            </Text>
          </View>
        );
      case 1:
        return (
          <View style={styles.stepContainer}>
            <View style={[styles.iconContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <MaterialIcons name="person-outline" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>¿Cuál es tu nombre?</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>¿Cómo te gustaría que te llamemos?</Text>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: firstName ? colors.primary : colors.border }]}
              placeholder="Ej. Jorge"
              placeholderTextColor={colors.textSecondary}
              value={firstName}
              onChangeText={setFirstName}
              autoFocus
            />
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContainer}>
            <View style={[styles.iconContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <MaterialIcons name="badge" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>¿Cuál es tu apellido?</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Opcional. Ayuda a personalizar tu perfil.</Text>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: lastName ? colors.primary : colors.border }]}
              placeholder="Ej. Landaeta"
              placeholderTextColor={colors.textSecondary}
              value={lastName}
              onChangeText={setLastName}
              autoFocus
            />
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContainer}>
            <View style={[styles.iconContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <MaterialIcons name="sign-language" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>¿Mano dominante?</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Ajustaremos las señas según tu preferencia.</Text>
            <View style={styles.optionsContainer}>
              <Pressable
                style={[
                  styles.optionCard, 
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  !isLeftHanded && { borderColor: colors.primary }
                ]}
                onPress={() => setIsLeftHanded(false)}
              >
                <MaterialIcons name="front-hand" size={40} color={!isLeftHanded ? colors.primary : colors.icon} />
                <Text style={[styles.optionText, { color: colors.textSecondary }, !isLeftHanded && { color: colors.primary }]}>Diestro</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.optionCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  isLeftHanded && { borderColor: colors.primary }
                ]}
                onPress={() => setIsLeftHanded(true)}
              >
                <MaterialIcons name="pan-tool" size={40} color={isLeftHanded ? colors.primary : colors.icon} style={{ transform: [{ scaleX: -1 }] }} />
                <Text style={[styles.optionText, { color: colors.textSecondary }, isLeftHanded && { color: colors.primary }]}>Zurdo</Text>
              </Pressable>
            </View>
          </View>
        );
      case 4:
        return (
          <View style={styles.stepContainer}>
            <View style={[styles.iconContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <MaterialIcons name="timer" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>¿Meta de práctica?</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Minutos diarios para mantener tu racha.</Text>
            <View style={styles.optionsContainer}>
              {[5, 10, 15, 20].map((mins) => (
                <Pressable
                  key={mins}
                  style={[
                    styles.goalOption,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    dailyGoalMinutes === mins && { borderColor: colors.primary }
                  ]}
                  onPress={() => setDailyGoalMinutes(mins)}
                >
                  <Text style={[styles.goalText, { color: colors.textSecondary }, dailyGoalMinutes === mins && { color: colors.primary }]}>
                    {mins} min
                  </Text>
                  {dailyGoalMinutes === mins && (
                    <MaterialIcons name="check-circle" size={20} color={colors.primary} style={styles.checkIcon} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        );
      case 5:
        return (
          <View style={styles.stepContainer}>
            <View style={[styles.iconContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <MaterialIcons name="rocket-launch" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>¡Todo listo!</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Así quedó configurado tu perfil.</Text>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.summaryRow, { borderBottomColor: colors.border }]}>
                <View style={styles.summaryIconLabel}>
                  <MaterialIcons name="person" size={22} color={colors.primary} />
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Nombre</Text>
                </View>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{firstName} {lastName}</Text>
              </View>
              <View style={[styles.summaryRow, { borderBottomColor: colors.border }]}>
                <View style={styles.summaryIconLabel}>
                  <MaterialIcons name="front-hand" size={22} color={colors.primary} />
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Mano</Text>
                </View>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{isLeftHanded ? 'Zurdo' : 'Diestro'}</Text>
              </View>
              <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
                <View style={styles.summaryIconLabel}>
                  <MaterialIcons name="timer" size={22} color={colors.primary} />
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Meta Diaria</Text>
                </View>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{dailyGoalMinutes} min</Text>
              </View>
            </View>
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
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        backgroundColor={colors.background} 
      />
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.headerWrapper}>
          {step > 0 ? (
            <View style={styles.progressHeader}>
              <Pressable onPress={handleBack} style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <MaterialIcons name="arrow-back-ios-new" size={18} color={colors.text} />
              </Pressable>
              <View style={[styles.progressBarBg, { backgroundColor: colors.surface }]}>
                <Animated.View style={[styles.progressBarFill, { width: progressWidth, backgroundColor: colors.primary }]} />
              </View>
              <View style={styles.stepIndicatorContainer}>
                <Text style={[styles.stepIndicator, { color: colors.textSecondary }]}>{step}/{TOTAL_STEPS}</Text>
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
          {step < 5 ? (
            <Pressable 
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: colors.primary },
                (step === 1 && !firstName.trim()) && { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
                pressed && !(step === 1 && !firstName.trim()) && styles.buttonPressed
              ]} 
              onPress={handleNext}
              disabled={step === 1 && !firstName.trim()}
            >
              <Text style={[styles.buttonText, { color: (step === 1 && !firstName.trim()) ? colors.textSecondary : (colors as any).primaryText }]}>
                {step === 0 ? 'Comenzar' : 'Siguiente'}
              </Text>
              <MaterialIcons 
                name="arrow-forward" 
                size={20} 
                color={(step === 1 && !firstName.trim()) ? colors.textSecondary : (colors as any).primaryText} 
                style={styles.buttonIcon} 
              />
            </Pressable>
          ) : (
            <Pressable 
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: colors.primary },
                pressed && styles.buttonPressed
              ]} 
              onPress={handleSave}
            >
              <Text style={[styles.buttonText, { color: (colors as any).primaryText }]}>Comenzar Práctica</Text>
              <MaterialIcons name="check" size={20} color={(colors as any).primaryText} style={styles.buttonIcon} />
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
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarBg: {
    flex: 1,
    height: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 10,
  },
  stepIndicatorContainer: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
  stepIndicator: {
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 20,
  },
  stepContainer: {
    flexGrow: 1,
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 32,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeIconContainer: {
    width: 130,
    height: 130,
    borderRadius: 40,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  title: {
    fontSize: 32,
    marginBottom: 12,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 40,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 12,
    lineHeight: 24,
  },
  input: {
    fontSize: 22,
    borderWidth: 1,
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 24,
    fontWeight: '600',
    width: '100%',
    textAlign: 'center',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    gap: 16,
  },
  optionCard: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: 32,
    borderWidth: 2,
    borderRadius: 32,
  },
  optionText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '700',
  },
  goalOption: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    borderWidth: 2,
    borderRadius: 24,
    width: '47%',
  },
  goalText: {
    fontSize: 18,
    fontWeight: '700',
  },
  checkIcon: {
    position: 'absolute',
    right: 16,
  },
  summaryCard: {
    padding: 24,
    borderRadius: 32,
    width: '100%',
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 20,
  },
  summaryIconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  button: {
    flexDirection: 'row',
    paddingVertical: 22,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  buttonIcon: {
    marginLeft: 8,
  },
});