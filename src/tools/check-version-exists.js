import { z } from "zod";
import { makeClient } from "../artifactory-client.js";
import { extractVersionsFromMetadata } from "../version-filter.js";
import { errorReply } from "./_errors.js";

export function registerCheckVersionExists(server, config) {
  const client = makeClient(config);

  server.tool(
    "check_version_exists",
    "Check whether a specific version of a Maven artifact exists in the internal JFrog Artifactory.",
    {
      groupId: z.string().describe("Maven groupId (e.g. org.apache.commons)"),
      artifactId: z.string().describe("Maven artifactId (e.g. commons-lang3)"),
      version: z.string().describe("Version to check (e.g. 3.14.0)"),
    },
    async ({ groupId, artifactId, version }) => {
      try {
        const xml = await client.fetchMetadata(groupId, artifactId);
        const versions = extractVersionsFromMetadata(xml);
        const exists = versions.includes(version);
        const text = exists
          ? `Yes — ${groupId}:${artifactId}:${version} exists in Artifactory.`
          : `No — ${groupId}:${artifactId}:${version} was not found. Available: ${versions.join(", ")}`;
        return { content: [{ type: "text", text }] };
      } catch (err) {
        return errorReply(err);
      }
    }
  );
}
