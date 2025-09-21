import { parse } from "node-html-parser";
import type { BusDeparture, BusDeparturesResponse } from "./models.js";
import { getCurrentDateTime } from "./utils.js";

export class BustimesParser {
	/**
	 * Parse HTML from bustimes.org departures page
	 */
	static parseDepartures(html: string, stopCode: string): BusDeparturesResponse {
		const root = parse(html);
		
		// Extract stop name from the page title or header
		const stopName = BustimesParser.extractStopName(root);
		
		// Find the departures table
		const departureRows = root.querySelectorAll('tbody tr, .departures-table tr, .timetable tr');
		
		const departures: BusDeparture[] = [];
		
		for (const row of departureRows) {
			try {
				const departure = BustimesParser.parseRow(row);
				if (departure) {
					departures.push(departure);
				}
			} catch (error) {
				console.warn('Failed to parse departure row:', error);
			}
		}
		
		return {
			departures,
			stop_name: stopName,
			stop_code: stopCode,
			last_updated: getCurrentDateTime(),
		};
	}
	
	private static extractStopName(root: any): string {
		// Try multiple selectors to find the stop name
		const selectors = [
			'h1',
			'.stop-name',
			'[data-stop-name]',
			'.breadcrumbs li:last-child',
			'title'
		];
		
		for (const selector of selectors) {
			const element = root.querySelector(selector);
			if (element) {
				const text = element.text?.trim() || element.getAttribute('content')?.trim();
				if (text && !text.includes('bustimes.org')) {
					// Clean up the stop name
					return text.replace(/\s+/g, ' ')
						.replace(/^Stop\s+/i, '')
						.replace(/\s+departures$/i, '')
						.trim();
				}
			}
		}
		
		return 'Unknown Stop';
	}
	
	
	private static parseRow(row: any): BusDeparture | null {
		// Try to extract cells from the row
		const cells = row.querySelectorAll('td, th');
		if (cells.length < 3) {
			return null; // Need at least 3 columns: service, destination, scheduled
		}
		
		// Table structure can be either:
		// 3 columns: [Service] [Destination] [Scheduled]
		// 4 columns: [Service] [Destination] [Scheduled] [Expected]
		
		// Extract service number from first cell
		const serviceCell = cells[0];
		const serviceLink = serviceCell.querySelector('a');
		const serviceNumber = (serviceLink?.text || serviceCell.text || '').trim();
		
		if (!serviceNumber) {
			return null;
		}
		
		// Extract destination from second cell (clean up vehicle info)
		const destinationCell = cells[1];
		let destination = destinationCell.text || '';
		
		// Remove vehicle info div content
		const vehicleDiv = destinationCell.querySelector('.vehicle');
		if (vehicleDiv) {
			destination = destination.replace(vehicleDiv.text || '', '').trim();
		}
		
		// Clean up whitespace and newlines
		destination = destination.replace(/\s+/g, ' ').trim();
		
		if (!destination) {
			return null;
		}
		
		// Extract scheduled time from third cell
		const scheduledCell = cells[2];
		const scheduledLink = scheduledCell.querySelector('a');
		const scheduledText = (scheduledLink?.text || scheduledCell.text || '').trim();
		
		// Extract expected time from fourth cell (if it exists)
		let expectedText = '';
		if (cells.length >= 4) {
			const expectedCell = cells[3];
			const expectedLink = expectedCell.querySelector('a');
			expectedText = (expectedLink?.text || expectedCell.text || '').trim();
		}
		
		// Parse times
		const scheduledTime = BustimesParser.parseTimeToISO(scheduledText);
		const expectedTime = BustimesParser.parseTimeToISO(expectedText);
		
		return {
			service_number: serviceNumber,
			destination: destination,
			scheduled_time: scheduledTime,
			expected_time: expectedTime,
		};
	}
	
	private static parseTimeToISO(timeStr: string): string | null {
		if (!timeStr || timeStr === '-') {
			return null;
		}
		
		// Handle HH:MM format - just return the time as shown on the website
		const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
		if (timeMatch) {
			// Simply return the time as it appears, no timezone conversion
			return timeStr;
		}
		
		return null;
	}
	
}