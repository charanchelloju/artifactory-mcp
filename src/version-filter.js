const UNSTABLE_REGEX = /(SNAPSHOT|alpha|beta|[\.-]rc[\.-]?\d|[\.-]m\d+$|milestone)/i;

export function isStableVersion(v) {
  return !UNSTABLE_REGEX.test(v);
}

export function extractVersionsFromMetadata(xml) {
  return [...xml.matchAll(/<version>([^<]+)<\/version>/g)].map(m => m[1].trim());
}

export function extractMetadataField(xml, field) {
  const re = new RegExp(`<${field}>([^<]+)</${field}>`);
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}
