import { z } from "zod";
import { makeClient } from "../artifactory-client.js";
import { extractVersionsFromMetadata, isStableVersion } from "../version-filter.js";
import { errorReply } from "./_errors.js";

export function registerGetLatestStableVersion(server, config) {
  const client = makeClient(config);

  server.tool(
    "get_latest_stable_version",
    "Return the latest stable version of a Maven artifact from the internal JFrog Artifactory. Filters out SNAPSHOT, alpha, beta, RC, and milestone versions.",
    {
      groupId: z.string().describe("Maven groupId (e.g. org.apache.logging.log4j)"),
      artifactId: z.string().describe("Maven artifactId (e.g. log4j-core)"),
    },
    async ({ groupId, artifactId }) => {
      try {
        const xml = await client.fetchMetadata(groupId, artifactId);
        const versions = extractVersionsFromMetadata(xml);
        const stable = versions.filter(isStableVersion);

        if (stable.length === 0) {
          return {
            content: [{ type: "text", text: `No stable version found for ${groupId}:${artifactId}` }],
            isError: true,
          };
        }

        return { content: [{ type: "text", text: stable[stable.length - 1] }] };
      } catch (err) {
        return errorReply(err);
      }
    }
  );
}
