/**
 * @file src/lib/db/settings.ts
 * Cấu hình site key-value.
 */

import { eq, inArray } from 'drizzle-orm';
import { settings } from '../../../db/schema';
import type { Database } from '../db';
import { SITE } from '../seo/config';

export const SETTING_KEYS = [
	'site_title',
	'site_description',
	'logo',
	'ga_id',
	'contact_email',
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];

export interface SiteSettings {
	siteTitle: string;
	siteDescription: string;
	logo: string;
	gaId: string;
	contactEmail: string;
}

const DEFAULTS: SiteSettings = {
	siteTitle: SITE.title,
	siteDescription: SITE.description,
	logo: '',
	gaId: '',
	contactEmail: '',
};

function keyToField(key: string): keyof SiteSettings | null {
	const map: Record<SettingKey, keyof SiteSettings> = {
		site_title: 'siteTitle',
		site_description: 'siteDescription',
		logo: 'logo',
		ga_id: 'gaId',
		contact_email: 'contactEmail',
	};
	return map[key as SettingKey] ?? null;
}

function fieldToKey(field: keyof SiteSettings): SettingKey {
	const map: Record<keyof SiteSettings, SettingKey> = {
		siteTitle: 'site_title',
		siteDescription: 'site_description',
		logo: 'logo',
		gaId: 'ga_id',
		contactEmail: 'contact_email',
	};
	return map[field];
}

/** Lấy toàn bộ site settings (merge với defaults). */
export async function getSiteSettings(db: Database): Promise<SiteSettings> {
	const rows = await db
		.select()
		.from(settings)
		.where(inArray(settings.key, [...SETTING_KEYS]));

	const result = { ...DEFAULTS };
	for (const row of rows) {
		const field = keyToField(row.key);
		if (field) result[field] = row.value;
	}
	return result;
}

/** Lấy một setting theo key. */
export async function getSetting(db: Database, key: SettingKey): Promise<string> {
	const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
	if (rows[0]) return rows[0].value;
	const field = keyToField(key);
	return field ? DEFAULTS[field] : '';
}

/** Cập nhật nhiều settings. */
export async function updateSiteSettings(
	db: Database,
	data: Partial<SiteSettings>,
): Promise<SiteSettings> {
	for (const [field, value] of Object.entries(data) as [keyof SiteSettings, string][]) {
		if (value === undefined) continue;
		const key = fieldToKey(field);
		await db
			.insert(settings)
			.values({ key, value: value ?? '' })
			.onConflictDoUpdate({
				target: settings.key,
				set: { value: value ?? '' },
			});
	}
	return getSiteSettings(db);
}

/** Export dạng key-value cho API admin. */
export function siteSettingsToRecord(s: SiteSettings): Record<SettingKey, string> {
	return {
		site_title: s.siteTitle,
		site_description: s.siteDescription,
		logo: s.logo,
		ga_id: s.gaId,
		contact_email: s.contactEmail,
	};
}

export function recordToSiteSettings(r: Record<string, string>): Partial<SiteSettings> {
	return {
		siteTitle: r.site_title,
		siteDescription: r.site_description,
		logo: r.logo,
		gaId: r.ga_id,
		contactEmail: r.contact_email,
	};
}
