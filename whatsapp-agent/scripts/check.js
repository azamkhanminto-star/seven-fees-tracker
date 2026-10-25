// Validates the workflow locally and lists any [FILL IN] placeholders left.
// Usage: npm run check
import workflow, { INSTITUTE_INFO, PHONE_NUMBER_ID, PROVIDER_MODEL } from "../workflows/admission-enquiry/workflow.js";

const { errors = [], warnings = [] } = workflow.validate();
for (const w of warnings) console.warn("warning:", w.message ?? w);
for (const e of errors) console.error("error:", e.message ?? e);

const missing = [];
if (PHONE_NUMBER_ID.includes("[FILL IN]")) missing.push("PHONE_NUMBER_ID");
if (PROVIDER_MODEL.includes("[FILL IN]")) missing.push("PROVIDER_MODEL");
const infoGaps = INSTITUTE_INFO.split("\n").filter((line) => line.includes("[FILL IN"));

const { definition } = workflow.toSourceFiles();
console.log(`Workflow "${workflow.name}": ${definition.nodes.length} nodes, ${definition.edges.length} edges.`);

if (missing.length) console.log(`\nStill to set: ${missing.join(", ")}`);
if (infoGaps.length) {
  console.log(`\n${infoGaps.length} line(s) of institute information still say [FILL IN]:`);
  for (const line of infoGaps) console.log("  " + line.trim());
}

if (errors.length) process.exit(1);
if (!missing.length && !infoGaps.length) console.log("\nReady to push.");
