import { z } from "zod";
import { makeClient } from "../artifactory-client.js";
import { getEffectivePom } from "../maven-runner.js";
import { errorReply } from "./_errors.js";

export function registerGetPom(server, config) {
  const client = makeClient(config);

  server.tool(
    "get_pom",
    "Fetch the POM file for a specific version of a Maven artifact from the internal JFrog Artifactory. Returns the raw POM by default; pass effective=true to return the resolved POM (parent merged, properties expanded).",
    {
      groupId: z.string().describe("Maven groupId (e.g. org.apache.commons)"),
      artifactId: z.string().describe("Maven artifactId (e.g. commons-lang3)"),
      version: z.string().describe("Version (e.g. 3.14.0)"),
      effective: z.boolean().optional().describe("If true, return effective POM via mvn help:effective-pom"),
    },
    async ({ groupId, artifactId, version, effective }) => {
      try {
        const pom = effective
          ? await getEffectivePom(groupId, artifactId, version)
          : await client.fetchPom(groupId, artifactId, version);
        return { content: [{ type: "text", text: pom }] };
      } catch (err) {
        return errorReply(err);
      }
    }
  );
}
