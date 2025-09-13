import { z } from "zod";

// Zod schema for BusDeparture
export const BusDepartureSchema = z.object({
	service_number: z.string().describe("Bus service number (e.g., '29', 'X1')"),
	destination: z.string().describe("Destination description (e.g., 'City Centre')"),
	scheduled_time: z.string().nullable().describe("Scheduled departure time in HH:MM format"),
	expected_time: z.string().nullable().describe("Expected departure time in HH:MM format"),
});

// Zod schema for stop metadata from API
export const StopMetadataSchema = z.object({
	atco_code: z.string(),
	naptan_code: z.string(),
	common_name: z.string(),
	name: z.string(),
	long_name: z.string(),
	location: z.array(z.number()).length(2), // [longitude, latitude]
	indicator: z.string().nullable(),
	bearing: z.string().nullable(),
	stop_type: z.string(),
	bus_stop_type: z.string(),
	active: z.boolean(),
});

// Zod schema for the complete response
export const BusDeparturesResponseSchema = z.object({
	departures: z.array(BusDepartureSchema),
	stop_name: z.string().describe("Name of the bus stop"),
	stop_code: z.string().describe("ATCO code of the bus stop"),
	location: z.array(z.number()).length(2).optional().describe("Longitude and latitude"),
	last_updated: z.string().describe("When the data was last updated in ISO format"),
});

// TypeScript types derived from schemas
export type BusDeparture = z.infer<typeof BusDepartureSchema>;
export type StopMetadata = z.infer<typeof StopMetadataSchema>;
export type BusDeparturesResponse = z.infer<typeof BusDeparturesResponseSchema>;

// Input schema for the MCP tool
export const GetBusDeparturesInputSchema = z.object({
	stop_code: z.string()
		.describe("UK bus stop ATCO code (e.g., '0100BRP90023' or '010000037')")
		.regex(/^(\d{4}[A-Z]{3}\d{5}[A-Z]?|\d{9})$/, "Invalid ATCO code format"),
});

export type GetBusDeparturesInput = z.infer<typeof GetBusDeparturesInputSchema>;