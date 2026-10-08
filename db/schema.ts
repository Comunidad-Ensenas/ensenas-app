import { sql } from 'drizzle-orm';
import { integer, primaryKey, real, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';

export const profile = sqliteTable('profile', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name'),
  currentStreak: integer('current_streak').default(0),
  lastActivityDate: text('last_activity_date').default(sql`CURRENT_TIMESTAMP`),
  isLeftHanded: integer('is_left_handed', { mode: 'boolean' }).default(false),
  dailyGoalMinutes: integer('daily_goal_minutes').default(5),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  learningMotivation: text('learning_motivation'),
  experienceLevel: text('experience_level'),
  avatarSkinTone: text('avatar_skin_tone'),
  hapticFeedback: integer('haptic_feedback', { mode: 'boolean' }).default(true),
  reminderTime: text('reminder_time'),
  birthdate: text('birthdate'),
});

export const manualConfigurations = sqliteTable('manual_configurations', {
  localId: text('local_id').primaryKey(),
  code: text('code'),
  name: text('name').notNull(),
  imagePath: text('image_path'),
  rawLandmarks: text('raw_landmarks').notNull(),
  bakedQuaternions: text('baked_quaternions').notNull(),
  learningTips: text('learning_tips'),
});

export const signCategories = sqliteTable('sign_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  iconName: text('icon_name').notNull().default('BookStack'),
  colorHex: text('color_hex').notNull().default('#10B981'),
});

export const signModules = sqliteTable('sign_modules', {
  localId: text('local_id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  difficultyLevel: integer('difficulty_level').default(1),
  orderIndex: integer('order_index'),
});

export const signs = sqliteTable('signs', {
  localId: text('local_id').primaryKey(),
  title: text('title').notNull(),
  meaningsJson: text('meanings_json'),
  description: text('description'),
  categoryId: integer('category_id').references(() => signCategories.id),
  configHandDominantId: text('config_hand_dominant_id').references(() => manualConfigurations.localId, { onDelete: 'set null' }),
  configHandRecessiveId: text('config_hand_recessive_id').references(() => manualConfigurations.localId, { onDelete: 'set null' }),
  bakedAnimation: text('baked_animation').notNull(),
  movementType: text('movement_type'),
  matchThreshold: real('match_threshold').default(0.85),
  nonManualHint: text('non_manual_hint'),
  iconPath: text('icon_path'),
  learningTips: text('learning_tips'),
});

export const phrases = sqliteTable('phrases', {
  localId: text('local_id').primaryKey(),
  spanishTranslation: text('spanish_translation').notNull(),
  lsvGloss: text('lsv_gloss').notNull(),
  description: text('description'),
});

export const phraseSigns = sqliteTable('phrase_signs', {
  phraseId: text('phrase_id').notNull().references(() => phrases.localId, { onDelete: 'cascade' }),
  signId: text('sign_id').notNull().references(() => signs.localId, { onDelete: 'cascade' }),
  orderIndex: integer('order_index').notNull(),
  transitionDelayMs: integer('transition_delay_ms').default(0),
}, (table) => [
  primaryKey({ columns: [table.phraseId, table.signId, table.orderIndex] })
]);

export const moduleItems = sqliteTable('module_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  moduleId: text('module_id').notNull().references(() => signModules.localId, { onDelete: 'cascade' }),
  itemType: text('item_type').notNull(),
  itemId: text('item_id'),
  configId: text('config_id').references(() => manualConfigurations.localId, { onDelete: 'cascade' }),
  signId: text('sign_id').references(() => signs.localId, { onDelete: 'cascade' }),
  phraseId: text('phrase_id').references(() => phrases.localId, { onDelete: 'cascade' }),
  orderIndex: integer('order_index').notNull(),
});

export const signExecutionHints = sqliteTable('sign_execution_hints', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  signId: text('sign_id').notNull().references(() => signs.localId, { onDelete: 'cascade' }),
  hintText: text('hint_text').notNull(),
  displayOrder: integer('display_order').notNull(),
  durationMs: integer('duration_ms'),
});

export const culturalTips = sqliteTable('cultural_tips', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  content: text('content').notNull(),
  category: text('category').notNull(),
});

export const modulePrerequisites = sqliteTable('module_prerequisites', {
  moduleId: text('module_id').notNull().references(() => signModules.localId, { onDelete: 'cascade' }),
  requiredModuleId: text('required_module_id').notNull().references(() => signModules.localId, { onDelete: 'cascade' }),
}, (table) => [
  primaryKey({ columns: [table.moduleId, table.requiredModuleId] })
]);

export const moduleProgress = sqliteTable('module_progress', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  profileId: integer('profile_id').references(() => profile.id).notNull(),
  moduleId: text('module_id').references(() => signModules.localId).notNull(),
  completionPercentage: real('completion_percentage').default(0.0),
  isUnlocked: integer('is_unlocked', { mode: 'boolean' }).default(false),
  isCompleted: integer('is_completed', { mode: 'boolean' }).default(false),
  accuracyScore: real('accuracy_score').default(0.0),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  unique().on(table.profileId, table.moduleId)
]);

export const userSignMastery = sqliteTable('user_sign_mastery', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  profileId: integer('profile_id').references(() => profile.id).notNull(),
  signId: text('sign_id').references(() => signs.localId).notNull(),
  masteryLevel: integer('mastery_level').default(0),
  correctAttempts: integer('correct_attempts').default(0),
  wrongAttempts: integer('wrong_attempts').default(0),
  lastPracticedAt: text('last_practiced_at'),
}, (table) => [
  unique().on(table.profileId, table.signId)
]);

export const activityLog = sqliteTable('activity_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  profileId: integer('profile_id').references(() => profile.id).notNull(),
  activityDate: text('activity_date').default(sql`CURRENT_DATE`),
  xpEarned: integer('xp_earned').default(0),
}, (table) => [
  unique().on(table.profileId, table.activityDate)
]);
