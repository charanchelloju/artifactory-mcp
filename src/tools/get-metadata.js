import { z } from "zod";
import { makeClient } from "../artifactory-client.js";
import { errorReply } from "./_errors.js";

export function registerGetMetadata(server, config) {
  const client = makeClient(config);

  server.tool(
    "get_metadata",
    "Fetch the full maven-metadata.xml for a Maven artifact from the internal JFrog Artifactory. Returns all versions, latest release, and last updated timestamp.",
    {
      groupId: z.string().describe("Maven groupId (e.g. org.apache.commons)"),
      artifactId: z.string().describe("Maven artifactId (e.g. commons-lang3)"),
    },
    async ({ groupId, artifactId }) => {
      try {
        const xml = await client.fetchMetadata(groupId, artifactId);
        return { content: [{ type: "text", text: xml }] };
      } catch (err) {
        return errorReply(err);
      }
    }
  );
}
