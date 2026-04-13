/**
 * One-off keygen for Convex Auth (@convex-dev/auth).
 * Run: node scripts/generate-convex-auth-keys.mjs
 * Paste JWT_PRIVATE_KEY and JWKS into Convex Dashboard → Deployment → Environment Variables.
 * https://labs.convex.dev/auth/setup/manual
 */
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";

const keys = await generateKeyPair("RS256", { extractable: true });
const privateKey = await exportPKCS8(keys.privateKey);
const publicKey = await exportJWK(keys.publicKey);
const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });

process.stdout.write(
  `JWT_PRIVATE_KEY="${privateKey.trimEnd().replace(/\n/g, " ")}"`,
);
process.stdout.write("\n");
process.stdout.write(`JWKS=${jwks}`);
process.stdout.write("\n");
