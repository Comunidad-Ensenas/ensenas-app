import { Avatar } from '@/components/common/Avatar';
import { Button } from '@/components/common/Button';
import { IconButton } from '@/components/common/IconButton';
import { Typography } from '@/components/common/Typography';
import { db } from '@/db';
import { profile } from '@/db/schema';
import { useTheme } from '@/hooks/useTheme';
import { useUserData } from '@/hooks/useUserData';
import { eq } from 'drizzle-orm';
import { router, Stack, useFocusEffect } from 'expo-router';
import { Check, EditPencil, NavArrowLeft, PeaceHand, User } from 'iconoir-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

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

export default function EditProfileScreen() {
  const { colors, isDark } = useTheme();
  const palette = (colors as any).palette;
  const insets = useSafeAreaInsets();
  const { userData, refreshUserData, isLoading } = useUserData();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [learningMotivations, setLearningMotivations] = useState<string[]>([]);
  const [isLeftHanded, setIsLeftHanded] = useState(false);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(5);
  const [isSaving, setIsSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshUserData();
    }, [])
  );

  useEffect(() => {
    if (!isLoading && userData) {
      setFirstName(userData.firstName || '');
      setLastName(userData.lastName || '');
      
      if (userData.birthdate) {
        try {
          const parts = userData.birthdate.split('-');
          if (parts.length === 3) {
            const [year, month, day] = parts;
            setBirthdate(`${day}/${month}/${year}`);
          }
        } catch (e) {
          console.error("Error formateando fecha:", e);
        }
      }

      setExperienceLevel(userData.experienceLevel || '');
      
      if (userData.learningMotivation) {
        const motivations = userData.learningMotivation.split(',').map(m => m.trim()).filter(m => m !== "");
        setLearningMotivations(motivations);
      } else {
        setLearningMotivations([]);
      }
      
      setIsLeftHanded(userData.isLeftHanded ?? false);
      setDailyGoalMinutes(userData.dailyGoalMinutes ?? 5);
    }
  }, [userData, isLoading]);

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

  const isFormValid = 
    firstName.trim().length > 0 && 
    isValidBirthdate(birthdate) && 
    experienceLevel !== '' && 
    learningMotivations.length > 0;

  const handleSave = async () => {
    if (!isFormValid || !userData) return;
    
    setIsSaving(true);
    try {
      const [day, month, year] = birthdate.split('/');
      const formattedBirthdate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

      await db.update(profile)
        .set({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          birthdate: formattedBirthdate,
          experienceLevel,
          learningMotivation: learningMotivations.join(', '),
          isLeftHanded,
          dailyGoalMinutes,
        })
        .where(eq(profile.id, userData.id))
        .returning();
      
      await refreshUserData();
      router.back();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      <View style={styles.header}>
        <IconButton 
          icon={<NavArrowLeft width={24} height={24} color={colors.text} strokeWidth={2.5} />} 
          onPress={() => router.back()} 
          backgroundColor={colors.surface}
          size={44}
        />
        <Typography variant="h3">Editar Perfil</Typography>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <Avatar 
                icon={<User width={48} height={48} color={palette.deepSkyBlue} strokeWidth={1.5} />}
                size={100}
                backgroundColor={palette.deepSkyBlue + '20'}
              />
              <Pressable style={[styles.editAvatarBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <EditPencil width={16} height={16} color={palette.deepSkyBlue} strokeWidth={2.5} />
              </Pressable>
            </View>
          </View>

          <Typography variant="label" color={palette.deepSkyBlue} style={styles.sectionTitle}>IDENTIDAD</Typography>
          
          <View style={styles.formGroup}>
            <Typography variant="label" color={colors.textSecondary} style={styles.inputLabel}>Nombre *</Typography>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: firstName ? palette.deepSkyBlue : 'transparent' }]}
              placeholderTextColor={colors.textSecondary}
              value={firstName}
              onChangeText={setFirstName}
              maxLength={30}
            />
          </View>

          <View style={styles.formGroup}>
            <Typography variant="label" color={colors.textSecondary} style={styles.inputLabel}>Apellido</Typography>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: lastName ? palette.deepSkyBlue : 'transparent' }]}
              placeholderTextColor={colors.textSecondary}
              value={lastName}
              onChangeText={setLastName}
              maxLength={30}
            />
          </View>

          <View style={styles.formGroup}>
            <Typography variant="label" color={colors.textSecondary} style={styles.inputLabel}>Fecha de Nacimiento *</Typography>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: isValidBirthdate(birthdate) ? palette.deepSkyBlue : 'transparent' }]}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={colors.textSecondary}
              value={birthdate}
              onChangeText={handleDateChange}
              keyboardType="numeric"
              maxLength={10}
            />
          </View>

          <View style={styles.divider} />

          <Typography variant="label" color={palette.deepSkyBlue} style={styles.sectionTitle}>PERFIL DE ESTUDIANTE</Typography>
          
          <Typography variant="body" color={colors.text} style={{ marginBottom: 12, fontWeight: '600' }}>Nivel previo de LSV</Typography>
          <View style={styles.chipContainer}>
            {['Ninguno', 'Básico', 'Intermedio'].map((lvl) => (
              <Pressable
                key={lvl}
                style={[styles.chip, { backgroundColor: colors.surface, borderColor: experienceLevel === lvl ? palette.deepSkyBlue : 'transparent' }]}
                onPress={() => setExperienceLevel(lvl)}
              >
                <Typography variant="body" color={experienceLevel === lvl ? palette.deepSkyBlue : colors.textSecondary} style={{ fontWeight: '600' }}>
                  {lvl}
                </Typography>
              </Pressable>
            ))}
          </View>

          <Typography variant="body" color={colors.text} style={{ marginBottom: 12, marginTop: 24, fontWeight: '600' }}>Motivaciones</Typography>
          <View style={styles.chipContainer}>
            {MOTIVATIONS.map((mot) => {
              const isActive = learningMotivations.includes(mot);
              return (
                <Pressable
                  key={mot}
                  style={[styles.chip, { backgroundColor: colors.surface, borderColor: isActive ? palette.deepSkyBlue : 'transparent' }]}
                  onPress={() => toggleMotivation(mot)}
                >
                  <Typography variant="body" color={isActive ? palette.deepSkyBlue : colors.textSecondary} style={{ fontWeight: '600' }}>
                    {mot}
                  </Typography>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.divider} />

          <Typography variant="label" color={palette.deepSkyBlue} style={styles.sectionTitle}>PREFERENCIAS DE PRÁCTICA</Typography>

          <Typography variant="body" color={colors.text} style={{ marginBottom: 12, fontWeight: '600' }}>Mano dominante</Typography>
          <View style={styles.optionsContainer}>
            <Pressable
              style={[styles.optionCardMini, { backgroundColor: colors.surface, borderColor: !isLeftHanded ? palette.powderBlush : 'transparent' }]}
              onPress={() => setIsLeftHanded(false)}
            >
              <PeaceHand width={28} height={28} color={!isLeftHanded ? palette.powderBlush : colors.textSecondary} strokeWidth={1.5} />
              <Typography variant="subtitle" color={!isLeftHanded ? palette.powderBlush : colors.textSecondary} style={{ marginTop: 8 }}>Diestro</Typography>
            </Pressable>
            <Pressable
              style={[styles.optionCardMini, { backgroundColor: colors.surface, borderColor: isLeftHanded ? palette.powderBlush : 'transparent' }]}
              onPress={() => setIsLeftHanded(true)}
            >
              <PeaceHand width={28} height={28} color={isLeftHanded ? palette.powderBlush : colors.textSecondary} strokeWidth={1.5} style={{ transform: [{ scaleX: -1 }] }} />
              <Typography variant="subtitle" color={isLeftHanded ? palette.powderBlush : colors.textSecondary} style={{ marginTop: 8 }}>Zurdo</Typography>
            </Pressable>
          </View>

          <Typography variant="body" color={colors.text} style={{ marginBottom: 12, marginTop: 24, fontWeight: '600' }}>Meta diaria (Minutos)</Typography>
          <View style={styles.optionsContainer}>
            {[5, 10, 15, 20].map((mins) => {
              const isActive = dailyGoalMinutes === mins;
              return (
                <Pressable
                  key={mins}
                  style={[styles.goalOptionMini, { backgroundColor: colors.surface, borderColor: isActive ? palette.powderBlush : 'transparent' }]}
                  onPress={() => setDailyGoalMinutes(mins)}
                >
                  <Typography variant="h3" color={isActive ? palette.powderBlush : colors.textSecondary}>{mins}</Typography>
                </Pressable>
              );
            })}
          </View>

        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 12, 24) }]}>
          <Button 
            title={isSaving ? "Guardando..." : "Guardar Cambios"}
            icon={!isSaving ? <Check width={20} height={20} color={!isFormValid ? colors.textSecondary : (isDark ? '#111418' : '#FFFFFF')} strokeWidth={3} /> : undefined}
            onPress={handleSave}
            disabled={!isFormValid || isSaving}
            color={!isFormValid ? colors.surface : palette.powderBlush}
            textColor={!isFormValid ? colors.textSecondary : (isDark ? '#111418' : '#FFFFFF')}
            style={{ flexDirection: 'row-reverse', opacity: !isFormValid ? 0.7 : 1, paddingVertical: 18 }}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16 },
  headerSpacer: { width: 44 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 10 },
  avatarSection: { alignItems: 'center', marginBottom: 40 },
  avatarContainer: { position: 'relative' },
  editAvatarBtn: { position: 'absolute', bottom: 0, right: -4, width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  sectionTitle: { marginBottom: 20, letterSpacing: 1, fontWeight: '700' },
  formGroup: { width: '100%', marginBottom: 20 },
  inputLabel: { marginBottom: 8, marginLeft: 4 },
  input: { fontSize: 16, borderRadius: 20, paddingVertical: 16, paddingHorizontal: 20, fontWeight: '600', width: '100%', borderWidth: 2 },
  divider: { height: 1, backgroundColor: 'rgba(150,150,150,0.1)', marginVertical: 32 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, width: '100%' },
  chip: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 24, borderWidth: 2 },
  optionsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%', gap: 12 },
  optionCardMini: { width: '48%', alignItems: 'center', paddingVertical: 16, borderWidth: 2, borderRadius: 24 },
  goalOptionMini: { justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderWidth: 2, borderRadius: 20, width: '22%' },
  footer: { paddingHorizontal: 24, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(150,150,150,0.1)' },
});