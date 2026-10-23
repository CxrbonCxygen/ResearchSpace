// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { integer, real, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const workspaces=sqliteTable('research_workspaces',{userId:text('user_id').primaryKey(),payload:text('payload').notNull(),revision:integer('revision').notNull().default(0),updated:text('updated').notNull()});
export const reportKeys=sqliteTable('research_report_keys',{hash:text('hash').primaryKey(),userId:text('user_id').notNull(),created:text('created').notNull()});

export const accounts=sqliteTable('research_accounts',{id:text('id').primaryKey(),userId:text('user_id').notNull(),username:text('username').notNull().unique(),passwordHash:text('password_hash').notNull(),salt:text('salt').notNull(),created:integer('created').notNull()});
export const sessions=sqliteTable('research_sessions',{hash:text('hash').primaryKey(),accountId:text('account_id').notNull(),expires:integer('expires').notNull()});
export const loginLimits=sqliteTable('research_login_limits',{key:text('key').primaryKey(),attempts:integer('attempts').notNull(),resetAt:integer('reset_at').notNull()});

export const trainingRuns=sqliteTable('research_training_runs',{userId:text('user_id').notNull(),runKey:text('run_key').notNull(),payload:text('payload').notNull(),observedAt:text('observed_at').notNull(),receivedAt:text('received_at').notNull()},t=>[primaryKey({columns:[t.userId,t.runKey]})]);
export const trainingPoints=sqliteTable('research_training_points',{userId:text('user_id').notNull(),runKey:text('run_key').notNull(),step:integer('step').notNull(),metric:text('metric').notNull(),value:real('value').notNull()},t=>[primaryKey({columns:[t.userId,t.runKey,t.step,t.metric]})]);
export const trainingKeys=sqliteTable('research_training_keys',{hash:text('hash').primaryKey(),userId:text('user_id').notNull(),runKey:text('run_key').notNull(),createdAt:text('created_at').notNull()});
