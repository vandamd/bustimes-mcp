import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BustimesService } from "./bustimes-service.js";
import { GetBusDeparturesInputSchema } from "./models.js";
import { validateAtcoCode } from "./utils.js";

// Define our MCP agent with tools
export class BustimesMCP extends McpAgent {
	server = new McpServer({
		name: "UK Bus Departures",
		version: "1.0.0",
	});

	private bustimesService = new BustimesService();

	async init() {
		// Bus departures tool
		this.server.tool(
			"get_bus_departures",
			{
				stop_code: z.string().describe("UK bus stop ATCO code (e.g., '0100BRP90023')"),
			},
			async ({ stop_code }) => {
				try {
					const departures = await this.bustimesService.getBusDepartures(stop_code);
					
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(departures, null, 2),
							},
						],
					};
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					
					return {
						content: [
							{
								type: "text",
								text: `Error fetching bus departures: ${errorMessage}`,
							},
						],
						isError: true,
					};
				}
			},
		);

		// Utility tool to validate ATCO codes and get stop metadata
		this.server.tool(
			"validate_atco_code", 
			{
				stop_code: z.string().describe("ATCO code to validate"),
			},
			async ({ stop_code }) => {
				const isValid = validateAtcoCode(stop_code);
				
				let result: any = {
					stop_code,
					is_valid: isValid
				};
				
				// If valid, try to get stop metadata
				if (isValid) {
					try {
						const url = `https://bustimes.org/api/stops/${stop_code}/`;
						const response = await fetch(url, {
							headers: {
								'User-Agent': 'MCP-BusTimes-Server/1.0 (+https://github.com/user/bustimes-mcp)',
								'Accept': 'application/json',
							},
						});
						
						if (response.ok) {
							const metadata = await response.json();
							result.metadata = {
								name: metadata.name,
								common_name: metadata.common_name,
								long_name: metadata.long_name,
								location: metadata.location,
								indicator: metadata.indicator,
								bearing: metadata.bearing,
								active: metadata.active
							};
						} else {
							result.metadata_error = `Stop not found (HTTP ${response.status})`;
						}
					} catch (error) {
						result.metadata_error = `Failed to fetch metadata: ${error instanceof Error ? error.message : String(error)}`;
					}
				}
				
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(result, null, 2),
						},
					],
				};
			},
		);

	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			return BustimesMCP.serveSSE("/sse").fetch(request, env, ctx);
		}

		if (url.pathname === "/mcp") {
			return BustimesMCP.serve("/mcp").fetch(request, env, ctx);
		}

		return new Response("Not found", { status: 404 });
	},
};
