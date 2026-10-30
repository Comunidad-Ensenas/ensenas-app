import { Button } from '@/components/common/Button';
import { IconBox } from '@/components/common/IconBox';
import { IconButton } from '@/components/common/IconButton';
import SignPlayer from '@/components/common/SignPlayer';
import { Typography } from '@/components/common/Typography';
import { useTheme } from '@/hooks/useTheme';
import { confirmDelete } from '@/lib/studioDelete';
import { StudioItemType, useStudioStore } from '@/store/useStudioStore';
import { router, useLocalSearchParams } from 'expo-router';
import { BookStack, ChatBubble, DragHandGesture, Edit, NavArrowLeft, Trash, VideoCamera } from 'iconoir-react-native';
import React, { ReactNode, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TYPE_LABELS: Record<StudioItemType, string> = {
  config: 'Configuración manual',
  sign: 'Seña',
  phrase: 'Frase',
  module: 'Módulo',
};

export default function StudioItemDetailScreen() {
  const { colors } = useTheme();
  const palette = (colors as any).palette;
  const { width } = useWindowDimensions();
  const { type = 'sign', id } = useLocalSearchParams<{ type?: StudioItemType; id?: string }>();

  const { configs, signs, phrases, modules } = useStudioStore();
  const [isCanvasActive, setIsCanvasActive] = useState(false);

  const item = useMemo(() => {
    const list = type === 'config' ? configs : type === 'sign' ? signs : type === 'phrase' ? phrases : modules;
    return list.find((entry: any) => entry.local_id === id);
  }, [type, id, configs, signs, phrases, modules]);

  const playerWidth = Math.min(width - 48, 520);
  const playerHeight = playerWidth * 1.33;

  const getConfigName = (configId?: string) => {
    if (!configId) return 'Ninguna';
    return configs.find(c => c.local_id === configId)?.name || 'Configuración eliminada';
  };

  const getSignName = (signId?: string) => {
    if (!signId) return 'Desconocida';
    return signs.find(s => s.local_id === signId)?.meanings?.[0] || 'Seña eliminada';
  };

  const getPhraseName = (phraseId?: string) => {
    if (!phraseId) return 'Desconocida';
    return phrases.find(p => p.local_id === phraseId)?.spanish_translation || 'Frase eliminada';
  };

  const handleEdit = () => {
    if (type === 'module') {
      router.dismissTo({ pathname: '/modules', params: { moduleId: id } } as any);
    } else if (type === 'phrase') {
      router.dismissTo({ pathname: '/phrases', params: { phraseId: id } } as any);
    } else if (type === 'sign') {
      router.dismissTo({ pathname: '/capture', params: { signId: id } } as any);
    }
  };

  const renderField = (label: string, content: ReactNode) => (
    <View style={styles.field}>
      <Typography variant="label" color={colors.textSecondary} style={styles.fieldLabel}>{label}</Typography>
      {content}
    </View>
  );

  const renderRelation = (index: number, label: string, kind: StudioItemType) => {
    const tint = kind === 'sign' ? colors.success : kind === 'phrase' ? palette.powderBlush : palette.deepSkyBlue;
    const tintBg = kind === 'sign' ? colors.successBg : kind === 'phrase' ? `${palette.powderBlush}15` : `${palette.deepSkyBlue}15`;

    return (
      <View key={`${kind}-${index}`} style={[styles.relationPill, { backgroundColor: tintBg }]}>
        <Typography variant="body" color={tint} style={{ fontWeight: '800' }}>{index + 1}.</Typography>
        {kind === 'sign'
          ? <VideoCamera width={20} height={20} color={tint} />
          : kind === 'phrase'
          ? <ChatBubble width={20} height={20} color={tint} />
          : <DragHandGesture width={20} height={20} color={tint} />}
        <Typography variant="body" color={tint} style={{ fontWeight: '700', flex: 1 }}>{label}</Typography>
      </View>
    );
  };

  const renderContent = () => {
    if (!item) return null;

    if (type === 'config') {
      return (
        <>
          <View style={[styles.playerFrame, { width: playerWidth, height: playerHeight }]}>
            <SignPlayer
              animData={item.baked_quaternions}
              width={playerWidth}
              height={playerHeight}
              orbitTarget={[0, 0.3, 0]}
              isConfigPreview={true}
              onInteractionChange={setIsCanvasActive}
            />
          </View>

          {renderField('Nombre', <Typography variant="body">{item.name}</Typography>)}
          {renderField('Puntos capturados', <Typography variant="body">21 puntos articulares</Typography>)}
          {item.learning_tips?.length > 0
            ? renderField(
                'Tips de aprendizaje',
                <View style={styles.pillList}>
                  {item.learning_tips.map((tip: string, index: number) => (
                    <View key={index} style={[styles.tipPill, { backgroundColor: colors.surface }]}>
                      <Typography variant="body">{tip}</Typography>
                    </View>
                  ))}
                </View>
              )
            : null}
        </>
      );
    }

    if (type === 'sign') {
      return (
        <>
          <View style={[styles.playerFrame, { width: playerWidth, height: playerHeight }]}>
            <SignPlayer
              animationFile={item.baked_animation || item.animationFile}
              width={playerWidth}
              height={playerHeight}
              onInteractionChange={setIsCanvasActive}
            />
          </View>

          {renderField('Significados', <Typography variant="body">{item.meanings?.join(', ')}</Typography>)}
          {renderField('Mano dominante', <Typography variant="body">{getConfigName(item.dominant_config_id || item.configHandDominantId)}</Typography>)}
          {(item.recessive_config_id || item.configHandRecessiveId)
            ? renderField('Mano recesiva', <Typography variant="body">{getConfigName(item.recessive_config_id || item.configHandRecessiveId)}</Typography>)
            : null}
          {item.learning_tips?.length > 0
            ? renderField(
                'Tips de aprendizaje',
                <View style={styles.pillList}>
                  {item.learning_tips.map((tip: string, index: number) => (
                    <View key={index} style={[styles.tipPill, { backgroundColor: colors.surface }]}>
                      <Typography variant="body">{tip}</Typography>
                    </View>
                  ))}
                </View>
              )
            : null}
        </>
      );
    }

    if (type === 'phrase') {
      return (
        <>
          {renderField('Traducción al español', <Typography variant="body">{item.spanish_translation}</Typography>)}
          {renderField('Glosa LSV', <Typography variant="body">{item.lsv_gloss}</Typography>)}
          {item.description ? renderField('Descripción', <Typography variant="body">{item.description}</Typography>) : null}
          {renderField(
            `Secuencia de señas (${item.signs_list?.length || 0})`,
            <View style={styles.pillList}>
              {item.signs_list?.map((signItem: any, index: number) =>
                renderRelation(index, getSignName(signItem.sign_id), 'sign')
              )}
            </View>
          )}
        </>
      );
    }

    return (
      <>
        {renderField('Descripción', <Typography variant="body">{item.description || 'Sin descripción'}</Typography>)}
        {renderField('Nivel de dificultad', <Typography variant="body">{item.difficulty_level} de 5</Typography>)}
        {renderField(
          `Contenido del módulo (${item.items_list?.length || 0})`,
          <View style={styles.pillList}>
            {[...(item.items_list || [])]
              .sort((a: any, b: any) => a.order_index - b.order_index)
              .map((moduleItem: any, index: number) => {
                if (moduleItem.item_type === 'sign') return renderRelation(index, getSignName(moduleItem.sign_id), 'sign');
                if (moduleItem.item_type === 'phrase') return renderRelation(index, getPhraseName(moduleItem.phrase_id), 'phrase');
                return renderRelation(index, getConfigName(moduleItem.config_id), 'config');
              })}
          </View>
        )}
      </>
    );
  };

  const typeIcon = type === 'config'
    ? <DragHandGesture width={24} height={24} color={palette.deepSkyBlue} />
    : type === 'sign'
    ? <VideoCamera width={24} height={24} color={colors.success} />
    : type === 'phrase'
    ? <ChatBubble width={24} height={24} color={palette.powderBlush} />
    : <BookStack width={24} height={24} color={palette.berryCrush} />;

  const typeTint = type === 'config'
    ? palette.deepSkyBlue
    : type === 'sign'
    ? colors.success
    : type === 'phrase'
    ? palette.powderBlush
    : palette.berryCrush;

  const title = !item
    ? 'Elemento no disponible'
    : type === 'config'
    ? item.name
    : type === 'sign'
    ? item.meanings?.[0] || 'Seña sin nombre'
    : type === 'phrase'
    ? item.spanish_translation
    : item.title;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton
          size={40}
          icon={<NavArrowLeft width={22} height={22} color={colors.text} strokeWidth={2} />}
          backgroundColor={colors.surface}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        />
        <IconBox size={44} icon={typeIcon} backgroundColor={`${typeTint}20`} />
        <View style={styles.headerText}>
          <Typography variant="h3" numberOfLines={2}>{title}</Typography>
          <Typography variant="label" color={colors.textSecondary}>{TYPE_LABELS[type]}</Typography>
        </View>
      </View>

      {item ? (
        <>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!isCanvasActive}
          >
            {renderContent()}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
            {type !== 'config' ? (
              <Button
                title="Editar"
                variant="secondary"
                icon={<Edit width={20} height={20} color={colors.text} strokeWidth={2.5} />}
                onPress={handleEdit}
                style={{ flex: 1 }}
              />
            ) : null}
            <Button
              title="Borrar"
              color={colors.dangerBg}
              textColor={colors.danger}
              icon={<Trash width={20} height={20} color={colors.danger} strokeWidth={2.5} />}
              onPress={() => confirmDelete(type, id as string, () => router.back())}
              style={{ flex: 1 }}
            />
          </View>
        </>
      ) : (
        <View style={styles.emptyState}>
          <Typography variant="body" color={colors.textSecondary} align="center">
            Este elemento ya no existe. Puede haber sido borrado.
          </Typography>
          <Button title="Volver" onPress={() => router.back()} style={{ marginTop: 24 }} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingVertical: 12 },
  headerText: { flex: 1, gap: 2 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 32, gap: 24 },
  playerFrame: { alignSelf: 'center', borderRadius: 28, overflow: 'hidden', backgroundColor: '#111' },
  field: { gap: 8 },
  fieldLabel: { letterSpacing: 0.5, textTransform: 'uppercase' },
  pillList: { gap: 8 },
  relationPill: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16 },
  tipPill: { padding: 14, borderRadius: 16 },
  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12, borderTopWidth: 1 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
});
