/**
 * Utility functions for the bustimes MCP server
 */

export function getCurrentDateTime(): string {
	return new Date().toISOString();
}

export function parseTimeString(timeStr: string): {
	scheduledTime: string | null;
	liveTime: string | null;
} {
	if (!timeStr) {
		return { scheduledTime: null, liveTime: null };
	}

	const cleaned = timeStr.toLowerCase().trim();
	const now = new Date();

	// Handle "due" or "0 min"
	if (/^due$|^0\s*mins?$/.test(cleaned)) {
		return {
			scheduledTime: null,
			liveTime: now.toISOString(),
		};
	}

	// Handle "X mins" format
	const minutesMatch = cleaned.match(/^(\d+)\s*mins?$/);
	if (minutesMatch) {
		const minutes = parseInt(minutesMatch[1], 10);
		const futureTime = new Date(now.getTime() + minutes * 60000);
		return {
			scheduledTime: null,
			liveTime: futureTime.toISOString(),
		};
	}

	// Handle "HH:MM" format
	const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
	if (timeMatch) {
		const hours = parseInt(timeMatch[1], 10);
		const minutes = parseInt(timeMatch[2], 10);

		// Create a date for today with the specified time
		const scheduledDate = new Date();
		scheduledDate.setHours(hours, minutes, 0, 0);

		// If the time is in the past, assume it's for tomorrow
		if (scheduledDate < now) {
			scheduledDate.setDate(scheduledDate.getDate() + 1);
		}

		return {
			scheduledTime: scheduledDate.toISOString(),
			liveTime: null,
		};
	}

	// Handle cancelled/delayed
	if (/cancelled|canceled|delayed|suspended/.test(cleaned)) {
		return { scheduledTime: null, liveTime: null };
	}

	// If we can't parse it, return nulls
	return { scheduledTime: null, liveTime: null };
}

export function validateAtcoCode(code: string): boolean {
	// ATCO codes can be either:
	// 1. Full format: 4 digits + 3 letters + 5 digits + optional letter (e.g., 0100BRP90023)
	// 2. Numeric format: 9 digits (e.g., 010000037)
	const fullFormatRegex = /^\d{4}[A-Z]{3}\d{5}[A-Z]?$/;
	const numericFormatRegex = /^\d{9}$/;

	return fullFormatRegex.test(code) || numericFormatRegex.test(code);
}

export function buildBustimesUrl(
	stopCode: string,
	date?: string,
	time?: string,
): string {
	let url = `https://bustimes.org/stops/${stopCode}/departures`;

	if (date && time) {
		const encodedTime = encodeURIComponent(time);
		url += `?date=${date}&time=${encodedTime}`;
	}

	return url;
}

export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function sanitizeHtml(html: string): string {
	// Basic HTML sanitization - remove script tags and potentially dangerous content
	return html
		.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
		.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
		.replace(/javascript:/gi, "")
		.replace(/on\w+="[^"]*"/gi, "")
		.replace(/on\w+='[^']*'/gi, "");
}

export class RateLimiter {
	private lastRequest = 0;
	private readonly minInterval: number;

	constructor(minIntervalMs: number = 1000) {
		this.minInterval = minIntervalMs;
	}

	async waitIfNeeded(): Promise<void> {
		const now = Date.now();
		const timeSinceLastRequest = now - this.lastRequest;

		if (timeSinceLastRequest < this.minInterval) {
			const waitTime = this.minInterval - timeSinceLastRequest;
			await delay(waitTime);
		}

		this.lastRequest = Date.now();
	}
}

// Simple in-memory cache for responses
export class ResponseCache {
	private cache = new Map<string, { data: any; expires: number }>();
	private readonly ttl: number;

	constructor(ttlMs: number = 60000) {
		// Default 1 minute TTL
		this.ttl = ttlMs;
	}

	get(key: string): any | null {
		const entry = this.cache.get(key);
		if (!entry) return null;

		if (Date.now() > entry.expires) {
			this.cache.delete(key);
			return null;
		}

		return entry.data;
	}

	set(key: string, data: any): void {
		this.cache.set(key, {
			data,
			expires: Date.now() + this.ttl,
		});
	}

	clear(): void {
		this.cache.clear();
	}
}
