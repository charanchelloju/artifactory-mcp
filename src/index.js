#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { loadConfig } from "./config.js";
import { registerGetMetadata } from "./tools/get-metadata.js";
import { registerGetLatestStableVersion } from "./tools/get-latest-stable-version.js";
import { registerCheckVersionExists } from "./tools/check-version-exists.js";
import { registerListArtifacts } from "./tools/list-artifacts.js";
import { registerGetPom } from "./tools/get-pom.js";
import { registerCheckDependencyUpdates } from "./tools/check-dependency-updates.js";

const config = loadConfig();

const server = new McpServer({
  name: "artifactory-mcp",
  version: "0.1.0",
});

registerGetMetadata(server, config);
registerGetLatestStableVersion(server, config);
registerCheckVersionExists(server, config);
registerListArtifacts(server, config);
registerGetPom(server, config);
registerCheckDependencyUpdates(server, config);

const transport = new StdioServerTransport();
await server.connect(transport);
