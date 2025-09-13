# UK Bus Departures MCP Server

An MCP (Model Context Protocol) server that provides real-time UK bus departure information by scraping bustimes.org.

## Features

- 🚌 Real-time bus departure information for UK stops
- 🔍 ATCO code validation
- ⚡ Built-in caching and rate limiting
- 🌐 Cloudflare Workers compatible
- 📊 Structured JSON responses

## Usage

This MCP server provides the following tools:

### `get_bus_departures`

Fetches real-time bus departures for a UK bus stop.

**Parameters:**
- `stop_code` (string): UK bus stop ATCO code (e.g., '0100BRP90023')

**Example:**
```json
{
  "tool": "get_bus_departures",
  "arguments": {
    "stop_code": "0100BRP90023"
  }
}
```

**Response:**
```json
{
  "departures": [
    {
      "service_number": "75",
      "destination": "Hengrove Park",
      "scheduled_time": "15:02",
      "expected_time": "15:14"
    }
  ],
  "stop_name": "Bishopston Sommerville Road (S-bound)",
  "stop_code": "0100BRP90023",
  "location": [-2.59102, 51.47324],
  "last_updated": "2025-09-13T14:28:00.000Z"
}
```

### `validate_atco_code`

Validates an ATCO code format and returns stop metadata if valid.

**Parameters:**
- `stop_code` (string): ATCO code to validate

**Response:**
```json
{
  "stop_code": "0100BRP90023",
  "is_valid": true,
  "metadata": {
    "name": "Bishopston Sommerville Road",
    "common_name": "Sommerville Road",
    "long_name": "Bishopston Sommerville Road (S-bound)",
    "location": [-2.59102, 51.47324],
    "indicator": "S-bound",
    "bearing": "S",
    "active": true
  }
}
```

## ATCO Codes

UK bus stops use ATCO (Association of Transport Coordinating Officers) codes with the format:
- 13 characters: `NNNNAAANNNNN[A]`
- 4 digits + 3 letters + 5 digits + optional letter
- Example: `0100BRP90023`

## Rate Limiting

The server implements:
- 2-second delay between requests to bustimes.org
- 5-minute caching for stop metadata (departures are always fresh)
- Respectful scraping practices

## Development

### Prerequisites
- Node.js 18+
- Wrangler CLI

### Local Development
```bash
npm install
npm run dev
```

### Deployment
```bash
npm run deploy
```

### Type Checking
```bash
npm run type-check
```

## API Endpoints

When deployed as a Cloudflare Worker:

- `GET /mcp` - MCP protocol endpoint
- `GET /sse` - Server-Sent Events endpoint

## Connect to Claude Desktop

To connect this MCP server to Claude Desktop:

1. Follow [Anthropic's Quickstart](https://modelcontextprotocol.io/quickstart/user)
2. In Claude Desktop go to Settings > Developer > Edit Config
3. Update with this configuration:

```json
{
  "mcpServers": {
    "uk-bus-departures": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "http://localhost:8787/sse"
      ]
    }
  }
}
```

For deployed version, replace localhost URL with your Workers domain.

## Technical Details

### Data Sources
- **bustimes.org API**: Stop metadata (names, coordinates, etc.)
- **bustimes.org HTML**: Real-time departure information via scraping

### Architecture
- **Parser**: Robust HTML parsing with multiple fallback strategies
- **Service**: HTTP client with rate limiting and caching
- **Models**: Type-safe data structures using Zod schemas

### Error Handling
- Invalid ATCO codes (format validation)
- Missing bus stops (404 responses)
- Network timeouts and failures
- HTML structure changes

## Limitations

- **UK Only**: Limited to UK bus stops with ATCO codes
- **HTML Dependency**: Fragile to website structure changes
- **Rate Limited**: 2-second delays between requests
- **No Historical Data**: Real-time and scheduled data only

## License

MIT License

## Disclaimer

This server scrapes public data from bustimes.org for informational purposes. Please use responsibly and respect the website's terms of service. 
