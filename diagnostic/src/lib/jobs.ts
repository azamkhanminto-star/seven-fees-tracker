import "server-only";
import { env } from "./env";

/** Asks the job route to run the next pipeline step for a case (fire and forget). */
export async function kick(caseId: string) {
  try {
    await fetch(`${env.appUrl()}/api/jobs/advance`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-job-secret": env.jobSecret() },
      body: JSON.stringify({ caseId }),
      cache: "no-store",
    });
  } catch (e) {
    console.error("kick failed", caseId, e);
  }
}
