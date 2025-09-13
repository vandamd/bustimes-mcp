import { BustimesParser } from "./parser.js";
import { BusDeparturesResponse, StopMetadata, StopMetadataSchema } from "./models.js";
import { buildBustimesUrl, sanitizeHtml, RateLimiter, ResponseCache, validateAtcoCode } from "./utils.js";

export class BustimesService {
	private rateLimiter = new RateLimiter(2000); // 2 second delay between requests
	private stopMetadataCache = new ResponseCache(300000); // 5 minute cache for stop metadata
	
	async getBusDepartures(stopCode: string): Promise<BusDeparturesResponse> {
		// Validate the stop code format
		if (!validateAtcoCode(stopCode)) {
			throw new Error(`Invalid ATCO stop code format: ${stopCode}`);
		}
		
		// Rate limit requests
		await this.rateLimiter.waitIfNeeded();
		
		try {
			// Fetch stop metadata and departures in parallel
			const [stopMetadata, departuresData] = await Promise.all([
				this.getStopMetadata(stopCode),
				this.fetchDeparturesHtml(stopCode)
			]);
			
			// Parse the HTML to extract departure information
			const departures = BustimesParser.parseDepartures(departuresData, stopCode);
			
			// Merge with stop metadata
			const result: BusDeparturesResponse = {
				...departures,
				stop_name: stopMetadata?.long_name || stopMetadata?.name || stopMetadata?.common_name || 'Unknown Stop',
				location: stopMetadata?.location,
			};
			
			return result;
			
		} catch (error) {
			console.error(`Error fetching departures for ${stopCode}:`, error);
			
			if (error instanceof Error) {
				throw error;
			}
			
			throw new Error(`Failed to fetch bus departures: ${String(error)}`);
		}
	}
	
	private async getStopMetadata(stopCode: string): Promise<StopMetadata | null> {
		// Check cache first
		const cached = this.stopMetadataCache.get(`metadata-${stopCode}`);
		if (cached) {
			return cached;
		}
		
		try {
			const url = `https://bustimes.org/api/stops/${stopCode}/`;
			console.log(`Fetching stop metadata from: ${url}`);
			
			const response = await fetch(url, {
				headers: {
					'User-Agent': 'MCP-BusTimes-Server/1.0 (+https://github.com/user/bustimes-mcp)',
					'Accept': 'application/json',
				},
			});
			
			if (!response.ok) {
				console.warn(`Failed to fetch stop metadata: ${response.status}`);
				return null;
			}
			
			const data = await response.json();
			const metadata = StopMetadataSchema.parse(data);
			
			// Cache the metadata
			this.stopMetadataCache.set(`metadata-${stopCode}`, metadata);
			
			return metadata;
		} catch (error) {
			console.warn(`Error fetching stop metadata for ${stopCode}:`, error);
			return null;
		}
	}
	
	private async fetchDeparturesHtml(stopCode: string): Promise<string> {
		const url = buildBustimesUrl(stopCode);
		console.log(`Fetching departures from: ${url}`);
		
		const response = await fetch(url, {
			headers: {
				'User-Agent': 'MCP-BusTimes-Server/1.0 (+https://github.com/user/bustimes-mcp)',
				'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				'Accept-Language': 'en-GB,en;q=0.5',
				'Accept-Encoding': 'gzip, deflate',
				'Connection': 'keep-alive',
			},
		});
		
		if (!response.ok) {
			if (response.status === 404) {
				throw new Error(`Bus stop not found: ${stopCode}`);
			}
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}
		
		const html = await response.text();
		return sanitizeHtml(html);
	}
	
	// Method to clear cache if needed
	clearCache(): void {
		this.stopMetadataCache.clear();
	}
	
	// Method to get cache status for debugging
	getCacheInfo(): { size: number, keys: string[] } {
		const keys: string[] = [];
		// Note: Map doesn't have a direct way to get keys without iteration
		// This is a simplified implementation for debugging
		return { size: 0, keys };
	}
}