import { Button } from '@/components/common/Button';
import { IconBox } from '@/components/common/IconBox';
import { SectionHeader } from '@/components/common/SectionHeader';
import { Typography } from '@/components/common/Typography';
import { FormField } from '@/components/studio/FormField';
import { SheetModal } from '@/components/studio/SheetModal';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';
import { useStudioStore } from '@/store/useStudioStore';
import * as FileSystem from 'expo-file-system/legacy';
import { router } from 'expo-router';
import {
  BookStack,
  ChatBubble,
  CloudUpload,
  DragHandGesture,
  Trash,
  VideoCamera,
} from 'iconoir-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ANIMATIONS_DIRECTORY = `${FileSystem.documentDirectory}ensenas/animations/`;

export default function StudioExportScreen() {
  const { colors } = useTheme();
  const palette = (colors as any).palette;

  const { configs, signs, phrases, modules, setConfigs, setSigns, setPhrases, setModules } = useStudioStore();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [isExporting, setIsExporting] = useState(false);

  const handleClearAll = () => {
    Alert.alert("⚠️ PELIGRO: Borrar Todo", "Esto eliminará permanentemente todo tu trabajo local.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sí, destruir datos", style: "destructive", onPress: async () => {
          await Promise.all([
            setConfigs([]),
            setSigns([]),
            setPhrases([]),
            setModules([])
          ]);
          Alert.alert("Listo", "Almacenamiento local formateado.");
        }
      }
    ]);
  };

  const proceedExport = async () => {
    try {
      if (configs.length > 0) {
        const rawConfigsPayload = configs.map(c => ({
          local_id: c.local_id,
          name: c.name,
          raw_landmarks: c.raw_landmarks,
          learning_tips: c.learning_tips || []
        }));
        
        const appConfigsPayload = configs.map(c => ({
          id: c.local_id,
          name: c.name,
          vector_data: JSON.stringify(c.raw_landmarks),
          raw_source_id: c.local_id,
          learning_tips: c.learning_tips || []
        }));

        const { error: rawConfError } = await supabase.from('raw_manual_configs').upsert(rawConfigsPayload);
        if (rawConfError) throw rawConfError;
        
        const { error: appConfError } = await supabase.from('app_manual_configs').upsert(appConfigsPayload);
        if (appConfError) throw appConfError;
      }

      if (signs.length > 0) {
        const rawSignsPayload = [];
        const appSignsPayload = [];

        for (const s of signs) {
          let rawFramesJson = {};
          let bakedAnimationJson = {};
          
          try {
            if (s.raw_frames) {
              const fileContent = await FileSystem.readAsStringAsync(`${ANIMATIONS_DIRECTORY}${s.raw_frames}`);
              rawFramesJson = JSON.parse(fileContent);
            }
          } catch (e) {}

          try {
            if (s.baked_animation) {
              const fileContent = await FileSystem.readAsStringAsync(`${ANIMATIONS_DIRECTORY}${s.baked_animation}`);
              bakedAnimationJson = JSON.parse(fileContent);
            }
          } catch (e) {}

          rawSignsPayload.push({
            local_id: s.local_id,
            dominant_config_id: s.dominant_config_id,
            recessive_config_id: s.recessive_config_id,
            meanings: s.meanings,
            learning_tips: s.learning_tips || [],
            raw_frames: rawFramesJson
          });

          appSignsPayload.push({
            id: s.local_id,
            meanings: s.meanings,
            dominant_config_id: s.dominant_config_id,
            recessive_config_id: s.recessive_config_id,
            animation_data: bakedAnimationJson, 
            raw_source_id: s.local_id,
            learning_tips: s.learning_tips || []
          });
        }

        const { error: rawSignsError } = await supabase.from('raw_signs').upsert(rawSignsPayload);
        if (rawSignsError) throw rawSignsError;
        
        const { error: appSignsError } = await supabase.from('app_signs').upsert(appSignsPayload);
        if (appSignsError) throw appSignsError;
      }

      if (phrases.length > 0) {
        const phrasesPayload = phrases.map(p => ({
          id: p.local_id,
          spanish_translation: p.spanish_translation,
          lsv_gloss: p.lsv_gloss,
          description: p.description || null
        }));
        const { error: pError } = await supabase.from('phrases').upsert(phrasesPayload);
        if (pError) throw pError;

        const phraseSignsPayload = phrases.flatMap(p => p.signs_list.map((s: any) => ({
          phrase_id: p.local_id,
          sign_id: s.sign_id,
          order_index: s.order_index
        })));
        if (phraseSignsPayload.length > 0) {
          const { error: psError } = await supabase.from('phrase_signs').upsert(phraseSignsPayload);
          if (psError) throw psError;
        }
      }

      if (modules.length > 0) {
        const modulesPayload = modules.map(m => ({
          id: m.local_id,
          title: m.title,
          description: m.description || null,
          difficulty_level: m.difficulty_level
        }));
        const { error: mError } = await supabase.from('modules').upsert(modulesPayload);
        if (mError) throw mError;

        const moduleItemsPayload = modules.flatMap(m => m.items_list.map((item: any) => ({
          module_id: m.local_id,
          item_type: item.item_type,
          config_id: item.config_id || null,
          sign_id: item.sign_id || null,
          phrase_id: item.phrase_id || null,
          order_index: item.order_index
        })));
        if (moduleItemsPayload.length > 0) {
          const { error: miError } = await supabase.from('module_items').upsert(moduleItemsPayload);
          if (miError) throw miError;
        }
      }

      Alert.alert("¡Exportación Exitosa!", "Tus datos procesados han sido subidos a producción y los archivos crudos respaldados.");
    } catch (error: any) {
      Alert.alert("Error en Exportación", error.message || "Ocurrió un problema al subir los datos.");
    } finally {
      setIsExporting(false);
    }
  };

  const checkAuthAndExport = async () => {
    if (configs.length === 0 && signs.length === 0 && phrases.length === 0 && modules.length === 0) {
      Alert.alert("Nada que exportar", "No hay datos locales guardados en el Studio.");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      setIsAuthModalOpen(true);
    } else {
      handleExportToCloud(); 
    }
  };

  const handleLogin = async () => {
    setIsAuthenticating(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsAuthenticating(false);

    if (error) {
      Alert.alert("Error", "Credenciales incorrectas.");
    } else {
      setIsAuthModalOpen(false);
      handleExportToCloud();
    }
  };

  const handleExportToCloud = async () => {
    if (configs.length === 0 && signs.length === 0 && phrases.length === 0 && modules.length === 0) {
      Alert.alert("Nada que exportar", "No hay datos locales guardados en el Studio.");
      return;
    }

    setIsExporting(true);

    try {
      const { data: remoteSigns, error } = await supabase.from('raw_signs').select('meanings');
      if (error) throw error;

      const remoteMeanings = new Set<string>();
      remoteSigns?.forEach(rs => {
        if (Array.isArray(rs.meanings)) {
          rs.meanings.forEach((m: string) => remoteMeanings.add(m.toLowerCase().trim()));
        }
      });

      const conflictingSigns = signs.filter(s => {
        const firstMeaning = s.meanings?.[0]?.toLowerCase().trim();
        return firstMeaning && remoteMeanings.has(firstMeaning);
      });

      if (conflictingSigns.length > 0) {
        setIsExporting(false);
        Alert.alert(
          "Posibles Duplicados en la Nube",
          `Se encontraron ${conflictingSigns.length} señas locales (ej. '${conflictingSigns[0].meanings[0]}') que ya existen en la base de datos principal.\n\n¿Deseas subirlas de todas formas como nuevas variantes, o cancelar para revisarlas?`,
          [
            { text: "Cancelar y Revisar", style: "cancel" },
            { 
              text: "Subir como Variantes", 
              style: "default", 
              onPress: () => {
                setIsExporting(true);
                proceedExport();
              }
            }
          ]
        );
      } else {
        proceedExport();
      }
    } catch (e) {
      setIsExporting(false);
      Alert.alert("Error de Conexión", "No se pudo comprobar la información con Supabase.");
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Typography variant="h3">Datos</Typography>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsContainer}>
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconBox size={44} icon={<DragHandGesture width={24} height={24} color={palette.deepSkyBlue} />} backgroundColor={palette.deepSkyBlue + '15'} />
            <Typography variant="h2" style={{ marginTop: 12 }}>{configs.length}</Typography>
            <Typography variant="label" color={colors.textSecondary} style={{ marginTop: 4 }}>Configuraciones</Typography>
          </View>

          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconBox size={44} icon={<VideoCamera width={24} height={24} color={colors.success} />} backgroundColor={colors.successBg} />
            <Typography variant="h2" style={{ marginTop: 12 }}>{signs.length}</Typography>
            <Typography variant="label" color={colors.textSecondary} style={{ marginTop: 4 }}>Señas</Typography>
          </View>

          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconBox size={44} icon={<ChatBubble width={24} height={24} color={palette.powderBlush} />} backgroundColor={palette.powderBlush + '15'} />
            <Typography variant="h2" style={{ marginTop: 12 }}>{phrases.length}</Typography>
            <Typography variant="label" color={colors.textSecondary} style={{ marginTop: 4 }}>Frases</Typography>
          </View>

          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconBox size={44} icon={<BookStack width={24} height={24} color={palette.berryCrush} />} backgroundColor={palette.berryCrush + '15'} />
            <Typography variant="h2" style={{ marginTop: 12 }}>{modules.length}</Typography>
            <Typography variant="label" color={colors.textSecondary} style={{ marginTop: 4 }}>Módulos</Typography>
          </View>
        </View>

        <SectionHeader title="Acciones" />
        <View style={styles.actionsContainer}>
          <Button
            title="Exportar a la Nube"
            color={palette.deepSkyBlue}
            textColor="#FFFFFF"
            icon={<CloudUpload width={20} height={20} color="#FFFFFF" strokeWidth={2.5} />}
            onPress={checkAuthAndExport}
          />
          <Button
            title="Explorar datos locales"
            variant="secondary"
            onPress={() => router.push('/explorer' as any)}
          />
          <Button
            title="Formatear Local"
            color={colors.dangerBg}
            textColor={colors.danger}
            icon={<Trash width={20} height={20} color={colors.danger} strokeWidth={2.5} />}
            onPress={handleClearAll}
          />
        </View>
      </ScrollView>

      <SheetModal
        visible={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        title="Acceso de Docente"
        footer={
          <View style={{ flex: 1, gap: 12 }}>
            <Button
              title={isAuthenticating ? "Verificando" : "Iniciar Sesión y Exportar"}
              color={palette.deepSkyBlue}
              textColor="#FFFFFF"
              onPress={handleLogin}
              disabled={isAuthenticating || !email || !password}
            />
            <Button
              title="Cancelar"
              color={colors.surface}
              textColor={colors.text}
              onPress={() => setIsAuthModalOpen(false)}
              disabled={isAuthenticating}
            />
          </View>
        }
      >
        <Typography variant="body" color={colors.textSecondary}>
          Inicia sesión para autorizar la sincronización con la base de datos principal.
        </Typography>

        <FormField
          label="Correo electrónico"
          required
          placeholder="docente@ensenas.app"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          returnKeyType="next"
        />

        <FormField
          label="Contraseña"
          required
          placeholder="Tu contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
          autoComplete="password"
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />
      </SheetModal>

      {isExporting && (
        <View style={styles.exportingOverlay}>
          <ActivityIndicator size="large" color={palette.deepSkyBlue} />
          <Typography variant="h3" color="#FFF" style={{ marginTop: 16 }}>Sincronizando con la nube</Typography>
          <Typography variant="body" color="#FFF" style={{ marginTop: 8, textAlign: 'center' }}>Por favor, no cierres la aplicación.</Typography>
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 12 },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  content: { paddingHorizontal: 24, paddingBottom: 120, paddingTop: 8 },
  statsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 36, rowGap: 14 },
  statBox: { width: '48%', padding: 20, borderRadius: 24, borderWidth: 1, alignItems: 'flex-start' },
  actionsContainer: { gap: 12 },
  exportingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
});