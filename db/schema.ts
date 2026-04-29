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
});

export const manualConfigurations = sqliteTable('manual_configurations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code'),
  name: text('name').notNull(),
  imagePath: text('image_path'),
});

export const signCategories = sqliteTable('sign_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
});

export const signModules = sqliteTable('sign_modules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description'),
  difficultyLevel: integer('difficulty_level').default(1),
  orderIndex: integer('order_index'),
});

export const signs = sqliteTable('signs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description'),
  categoryId: integer('category_id').references(() => signCategories.id),
  configHandDominantId: integer('config_hand_dominant_id').references(() => manualConfigurations.id),
  configHandRecessiveId: integer('config_hand_recessive_id').references(() => manualConfigurations.id),
  vectorData: text('vector_data').notNull(),
  movementType: text('movement_type'),
  matchThreshold: real('match_threshold').default(0.85),
  nonManualHint: text('non_manual_hint'),
  iconPath: text('icon_path'),
});

export const signsModules = sqliteTable('signs_modules', {
  signId: integer('sign_id').references(() => signs.id).notNull(),
  moduleId: integer('module_id').references(() => signModules.id).notNull(),
}, (table) => [
  primaryKey({ columns: [table.signId, table.moduleId] })
]);

export const moduleProgress = sqliteTable('module_progress', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  profileId: integer('profile_id').references(() => profile.id).notNull(),
  moduleId: integer('module_id').references(() => signModules.id).notNull(),
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
  signId: integer('sign_id').references(() => signs.id).notNull(),
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