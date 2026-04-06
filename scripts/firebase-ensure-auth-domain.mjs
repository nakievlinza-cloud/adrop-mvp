import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleAuth } from "google-auth-library";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const configPath = path.join(rootDir, "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));

const domain = process.argv[2]?.trim();

if (!domain) {
  console.error("Usage: npm run firebase:ensure-domain -- <domain>");
  process.exit(1);
}

function getServiceAccountOptions() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    return { credentials };
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    return { keyFile: process.env.FIREBASE_SERVICE_ACCOUNT_PATH };
  }

  throw new Error("Provide FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH");
}

async function getAccessToken() {
  const auth = new GoogleAuth({
    ...getServiceAccountOptions(),
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });

  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token || token;
}

async function main() {
  const projectId = firebaseConfig.projectId;

  if (!projectId) {
    throw new Error("projectId is missing in firebase-applet-config.json");
  }

  const token = await getAccessToken();
  const endpoint = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`;

  const currentResponse = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!currentResponse.ok) {
    throw new Error(`Failed to fetch Firebase Auth config: ${currentResponse.status} ${await currentResponse.text()}`);
  }

  const config = await currentResponse.json();
  const authorizedDomains = Array.isArray(config.authorizedDomains) ? config.authorizedDomains : [];

  if (authorizedDomains.includes(domain)) {
    console.log(`Domain already authorized: ${domain}`);
    return;
  }

  const nextDomains = [...authorizedDomains, domain].sort();
  const patchResponse = await fetch(`${endpoint}?updateMask=authorizedDomains`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: config.name,
      authorizedDomains: nextDomains,
    }),
  });

  if (!patchResponse.ok) {
    throw new Error(`Failed to update authorized domains: ${patchResponse.status} ${await patchResponse.text()}`);
  }

  console.log(`Added Firebase authorized domain: ${domain}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
