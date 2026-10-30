import { StudioItemType, useStudioStore } from '@/store/useStudioStore';
import { Alert } from 'react-native';

const DELETE_PROMPTS: Record<StudioItemType, { title: string; message: string; confirm: string }> = {
  config: {
    title: '¿Borrar Configuración?',
    message: 'Se eliminarán en cascada TODAS las señas, frases y módulos que dependan de esta configuración para evitar corromper los datos.',
    confirm: 'Borrar en Cascada',
  },
  sign: {
    title: '¿Borrar Seña?',
    message: 'Se eliminará también de las Frases y Módulos que la utilicen.',
    confirm: 'Borrar en Cascada',
  },
  phrase: {
    title: '¿Borrar Frase?',
    message: 'Se eliminará también de los Módulos que la utilicen.',
    confirm: 'Borrar en Cascada',
  },
  module: {
    title: '¿Borrar Módulo?',
    message: 'Solo se borrará el módulo, el contenido seguirá existiendo.',
    confirm: 'Borrar',
  },
};

export function confirmDelete(type: StudioItemType, targetId: string, onDeleted?: () => void) {
  const prompt = DELETE_PROMPTS[type];

  Alert.alert(prompt.title, prompt.message, [
    { text: 'Cancelar', style: 'cancel' },
    {
      text: prompt.confirm,
      style: 'destructive',
      onPress: async () => {
        await useStudioStore.getState().deleteWithCascade(type, targetId);
        onDeleted?.();
      },
    },
  ]);
}
