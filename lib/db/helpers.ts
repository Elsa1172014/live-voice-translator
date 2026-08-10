import { eq } from 'drizzle-orm';
import { db } from './index';
import { profiles, userPreferences } from './schema';

/**
 * Supabase used a DB trigger on auth.users insert to seed profiles +
 * preferences. Clerk manages users outside our database entirely, so
 * instead we lazily create both rows the first time we see a given
 * Clerk user id — cheap, idempotent, and needs no webhook setup.
 */
export async function ensureProfile(userId: string, displayName?: string) {
  const existing = await db.query.profiles.findFirst({ where: eq(profiles.id, userId) });
  if (existing) return existing;

  const [created] = await db
    .insert(profiles)
    .values({ id: userId, displayName: displayName ?? 'Learner' })
    .onConflictDoNothing()
    .returning();

  await db.insert(userPreferences).values({ userId }).onConflictDoNothing();

  return created ?? (await db.query.profiles.findFirst({ where: eq(profiles.id, userId) }))!;
}

export async function getOrCreatePreferences(userId: string) {
  const existing = await db.query.userPreferences.findFirst({ where: eq(userPreferences.userId, userId) });
  if (existing) return existing;

  const [created] = await db.insert(userPreferences).values({ userId }).onConflictDoNothing().returning();
  return created ?? (await db.query.userPreferences.findFirst({ where: eq(userPreferences.userId, userId) }))!;
}
