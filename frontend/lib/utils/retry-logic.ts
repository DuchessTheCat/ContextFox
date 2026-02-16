/**
 * Handles retry logic with refusal detection for API calls
 */

type RetryResult<T> =
  | { status: "fulfilled"; value: T }
  | { status: "rejected"; reason: Error };

export async function callWithRetry<T>(
  taskName: string,
  apiCall: () => Promise<T>,
  _refusalPrompt: string,
  onRefusalDetected: () => void,
  maxAttempts: number = 2
): Promise<RetryResult<T>> {
  let lastError: any = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const result = await apiCall();

      // Check for empty response
      if (typeof result === "string" && (!result || result.trim().length === 0)) {
        if (attempt < maxAttempts - 1) {
          console.warn(`Empty response for ${taskName}, retrying...`);
          continue;
        }
      }

      return { status: "fulfilled", value: result };
    } catch (e: any) {
      lastError = e;

      if (attempt < maxAttempts - 1) {
        console.warn(`Retrying ${taskName} after error:`, e);

        // Check if this was a refusal
        if (e.message && e.message.includes("REFUSAL:")) {
          console.log(`Detected refusal for ${taskName}, appending refusal prompt on retry`);
          onRefusalDetected();
        }

        continue;
      }
    }
  }

  return { status: "rejected", reason: lastError || new Error("Max retries exceeded") };
}
