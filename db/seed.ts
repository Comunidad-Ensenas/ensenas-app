import { db } from '@/db';
import {
  culturalTips,
  manualConfigurations,
  moduleItems,
  phraseSigns,
  phrases,
  signCategories,
  signExecutionHints,
  signModules,
  signs,
} from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

type Track = { name: string; times: number[]; values: number[] };

function rot(axis: 'x' | 'y' | 'z', degrees: number): number[] {
  const half = (degrees * Math.PI) / 360;
  const s = Number(Math.sin(half).toFixed(4));
  const c = Number(Math.cos(half).toFixed(4));
  if (axis === 'x') return [s, 0, 0, c];
  if (axis === 'y') return [0, s, 0, c];
  return [0, 0, s, c];
}

function track(bone: string, times: number[], rotations: number[][]): Track {
  return { name: `${bone}.quaternion`, times, values: rotations.flat() };
}

const OPEN_HAND_POSE = JSON.stringify({
  duration: 1,
  tracks: [track('rightUpperArm', [0, 1], [rot('z', -40), rot('z', -40)])],
});

const HELLO_WAVE = JSON.stringify({
  duration: 2.2,
  tracks: [
    track('rightUpperArm', [0, 0.7, 1.4, 2.1], [rot('z', -25), rot('z', -55), rot('z', -25), rot('z', -55)]),
    track('rightLowerArm', [0, 2.2], [rot('x', -55), rot('x', -55)]),
  ],
});

const THANK_YOU_BEND = JSON.stringify({
  duration: 1.6,
  tracks: [
    track('rightUpperArm', [0, 1.6], [rot('z', -20), rot('z', -20)]),
    track('rightLowerArm', [0, 0.8, 1.6], [rot('x', -30), rot('x', -95), rot('x', -30)]),
  ],
});

let seeding: Promise<void> | null = null;

/**
 * Loads the bundled demo content into the learner database on first launch.
 * Studio content never reaches this database, so the learner app ships its own seed.
 */
export function ensureSeeded(): Promise<void> {
  // Concurrent mounts must share one run; two past the guard below would collide on the same rows.
  seeding ??= seedDemoContent().catch((error) => {
    seeding = null;
    throw error;
  });
  return seeding;
}

async function seedDemoContent(): Promise<void> {
  const existing = await db.select({ count: sql<number>`count(*)` }).from(signModules);
  if ((existing[0]?.count ?? 0) > 0) return;

  await db.transaction(async (tx) => {
    // Every row below is inserted with conflict tolerance so an interrupted run repairs itself
    // instead of failing forever on the rows it already wrote.
    let [category] = await tx
      .select({ id: signCategories.id })
      .from(signCategories)
      .where(eq(signCategories.name, 'Saludos'))
      .limit(1);

    if (!category) {
      [category] = await tx
        .insert(signCategories)
        .values({ name: 'Saludos', description: 'Saludos y cortesía en LSV', iconName: 'Hand' })
        .returning({ id: signCategories.id });
    }

    await tx.insert(manualConfigurations).values({
      localId: 'cfg_mano_abierta',
      code: 'MA',
      name: 'Mano abierta',
      rawLandmarks: '[]',
      bakedQuaternions: OPEN_HAND_POSE,
      learningTips: 'Mantén los dedos juntos y la palma hacia el frente.',
    }).onConflictDoNothing();

    await tx.insert(signs).values([
      {
        localId: 'sign_hola',
        title: 'Hola',
        meaningsJson: '["Hola","Buenas"]',
        description: 'Saludo con la mano abierta a la altura del hombro.',
        categoryId: category?.id ?? null,
        configHandDominantId: 'cfg_mano_abierta',
        bakedAnimation: HELLO_WAVE,
        movementType: 'oscilación',
        matchThreshold: 0.85,
        nonManualHint: 'Sonríe y mantén contacto visual mientras saludas.',
        learningTips: 'El movimiento sale del hombro, no solo de la muñeca.',
      },
      {
        localId: 'sign_gracias',
        title: 'Gracias',
        meaningsJson: '["Gracias"]',
        description: 'La mano abierta se acerca al pecho con una flexión corta.',
        categoryId: category?.id ?? null,
        configHandDominantId: 'cfg_mano_abierta',
        bakedAnimation: THANK_YOU_BEND,
        movementType: 'flexión',
        matchThreshold: 0.85,
        nonManualHint: 'Inclina levemente la cabeza al terminar el gesto.',
        learningTips: 'El codo se queda cerca del cuerpo; solo se mueve el antebrazo.',
      },
    ]).onConflictDoNothing();

    await tx.insert(phrases).values({
      localId: 'phrase_hola_gracias',
      spanishTranslation: 'Hola, gracias',
      lsvGloss: 'HOLA GRACIAS',
      description: 'Saludo seguido de agradecimiento.',
    }).onConflictDoNothing();

    await tx.insert(phraseSigns).values([
      { phraseId: 'phrase_hola_gracias', signId: 'sign_hola', orderIndex: 0, transitionDelayMs: 300 },
      { phraseId: 'phrase_hola_gracias', signId: 'sign_gracias', orderIndex: 1, transitionDelayMs: 300 },
    ]).onConflictDoNothing();

    await tx.insert(signModules).values({
      localId: 'mod_saludos',
      title: 'Saludos básicos',
      description: 'Aprende a saludar y agradecer en Lengua de Señas Venezolana.',
      iconName: 'Hand',
      difficultyLevel: 1,
      orderIndex: 0,
    }).onConflictDoNothing();

    await tx.insert(moduleItems).values([
      { moduleId: 'mod_saludos', itemType: 'config', configId: 'cfg_mano_abierta', orderIndex: 0 },
      { moduleId: 'mod_saludos', itemType: 'sign', signId: 'sign_hola', orderIndex: 1 },
      { moduleId: 'mod_saludos', itemType: 'sign', signId: 'sign_gracias', orderIndex: 2 },
      { moduleId: 'mod_saludos', itemType: 'phrase', phraseId: 'phrase_hola_gracias', orderIndex: 3 },
    ]).onConflictDoNothing();

    const [hints] = await tx.select({ count: sql<number>`count(*)` }).from(signExecutionHints);
    if (!hints?.count) {
      await tx.insert(signExecutionHints).values([
        { signId: 'sign_hola', hintText: 'Levanta la mano hasta la altura del hombro.', displayOrder: 0 },
        { signId: 'sign_hola', hintText: 'Mueve la mano de lado a lado dos veces.', displayOrder: 1 },
        { signId: 'sign_gracias', hintText: 'Acerca la palma al pecho.', displayOrder: 0 },
      ]);
    }

    const [tips] = await tx.select({ count: sql<number>`count(*)` }).from(culturalTips);
    if (!tips?.count) {
      await tx.insert(culturalTips).values([
        {
          content: 'En LSV el saludo con la mano abierta se usa tanto formal como informalmente.',
          category: 'saludos',
        },
        {
          content: 'El contacto visual es parte del mensaje: no lo pierdas mientras saludas.',
          category: 'saludos',
        },
      ]);
    }
  });
}
