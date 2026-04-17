const API_BASE_URL = process.env.API_BASE_URL;
const API_KEY = process.env.API_KEY;
const REQUEST_TIMEOUT_MS = Number(process.env.PROFILE_API_TIMEOUT_MS || 20000);
const MAX_RETRIES = Number(process.env.PROFILE_API_RETRIES || 2);
const RAW_PROFILE_BATCH_SIZE = Number(process.env.PROFILE_API_BATCH_SIZE || 2);
const PROFILE_BATCH_SIZE =
  Number.isFinite(RAW_PROFILE_BATCH_SIZE) && RAW_PROFILE_BATCH_SIZE > 0
    ? Math.floor(RAW_PROFILE_BATCH_SIZE)
    : 2;

// Validate required environment variables at startup to ensure proper typing and avoid undefined headers.
if (!API_BASE_URL) {
  throw new Error("Missing required environment variable: API_BASE_URL");
}
if (!API_KEY) {
  throw new Error("Missing required environment variable: API_KEY");
}

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const formatFetchError = (error: unknown): string => {
  if (!(error instanceof Error)) return String(error);
  const cause = (
    error as Error & { cause?: { code?: string; message?: string } }
  ).cause;
  const causeCode = cause?.code ? ` (${cause.code})` : "";
  const causeMessage = cause?.message ? `: ${cause.message}` : "";
  return `${error.message}${causeCode}${causeMessage}`;
};

const isRetryableFetchError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  const cause = (error as Error & { cause?: { code?: string } }).cause;
  const causeCode = cause?.code?.toUpperCase();

  const retryableCodes = new Set([
    "ECONNRESET",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "EAI_AGAIN",
    "ENOTFOUND",
    "UND_ERR_CONNECT_TIMEOUT",
    "UND_ERR_HEADERS_TIMEOUT",
    "UND_ERR_SOCKET",
  ]);

  return (
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("aborted") ||
    message.includes("timeout") ||
    (causeCode ? retryableCodes.has(causeCode) : false)
  );
};

const parseJsonSafe = (raw: string): any => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
};

const getDetailMessage = (payload: any): string => {
  if (typeof payload?.detail === "string") return payload.detail;
  if (typeof payload?.detail?.message === "string") return payload.detail.message;
  return "";
};

const chunkArray = (values: string[], size: number): string[][] => {
  const chunks: string[][] = [];
  for (let i = 0; i < values.length; i += size) {
    chunks.push(values.slice(i, i + size));
  }
  return chunks;
};

const mergeStringArrays = (values: unknown[]): string[] => {
  const merged = new Set<string>();
  for (const value of values) {
    if (!Array.isArray(value)) continue;
    for (const item of value) {
      const normalized = String(item || "").trim();
      if (normalized) merged.add(normalized);
    }
  }
  return [...merged];
};

const mergeProfilePayloads = (
  usernames: string[],
  payloads: any[],
): Record<string, unknown> => {
  const profiles: Record<string, unknown> = {};

  for (const payload of payloads) {
    if (
      payload &&
      typeof payload === "object" &&
      payload.profiles &&
      typeof payload.profiles === "object" &&
      !Array.isArray(payload.profiles)
    ) {
      Object.assign(profiles, payload.profiles);
    }
  }

  const fetchedUsernames = mergeStringArrays(
    payloads.map((payload) => payload?.fetched_usernames),
  );

  return {
    collection: payloads[0]?.collection || "instagram_profiles_data",
    requested_usernames: usernames,
    db_usernames: mergeStringArrays(payloads.map((payload) => payload?.db_usernames)),
    stale_usernames: mergeStringArrays(payloads.map((payload) => payload?.stale_usernames)),
    fetched_usernames: fetchedUsernames,
    refreshed_usernames: mergeStringArrays(
      payloads.map((payload) => payload?.refreshed_usernames),
    ),
    not_found_usernames: mergeStringArrays(
      payloads.map((payload) => payload?.not_found_usernames),
    ),
    fetched_count: fetchedUsernames.length,
    profiles,
  };
};

const postWithRetry = async (endpoint: string, usernames: string[]): Promise<any> => {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          "api-key": API_KEY,
          Connection: "close",
        },
        body: JSON.stringify({ usernames }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const raw = await response.text();
      const payload = parseJsonSafe(raw);

      if (!response.ok) {
        const detailMessage = getDetailMessage(payload);
        const errorMessage =
          `${endpoint} failed: ${response.status}` +
          (detailMessage ? ` ${detailMessage}` : "");
        const httpError = new Error(errorMessage);

        // Retry only on server/rate-limit responses.
        if ((response.status >= 500 || response.status === 429) && attempt < MAX_RETRIES) {
          lastError = httpError;
          await delay(500 * (attempt + 1));
          continue;
        }

        throw httpError;
      }

      return payload;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;

      if (attempt < MAX_RETRIES && isRetryableFetchError(error)) {
        await delay(500 * (attempt + 1));
        continue;
      }

      throw error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError || "Unknown fetch error"));
};

const normalizeUsernames = (usernames: string[] | string): string[] => {
  const values = Array.isArray(usernames) ? usernames : [usernames];
  return values
    .map((username) => String(username).replace(/^@/, "").trim().toLowerCase())
    .filter(Boolean);
};

const getInstagramProfileData = async (
  usernames: string[] | string,
): Promise<any | null> => {
  const normalizedUsernames = normalizeUsernames(usernames);
  if (normalizedUsernames.length === 0) return null;

  try {
    const usernameChunks = chunkArray(normalizedUsernames, PROFILE_BATCH_SIZE);
    const payloads: any[] = [];

    for (const usernameChunk of usernameChunks) {
      payloads.push(await postWithRetry("/instagram/profile-data", usernameChunk));
    }

    if (payloads.length === 1) {
      return payloads[0];
    }

    return mergeProfilePayloads(normalizedUsernames, payloads);
  } catch (error) {
    console.warn(`getInstagramProfileData unavailable: ${formatFetchError(error)}`);
    return null;
  }
};

const getprofileAnalytics = async (
  usernames: string[] | string,
): Promise<any | null> => {
  const normalizedUsernames = normalizeUsernames(usernames);
  if (normalizedUsernames.length === 0) return null;

  try {
    return await postWithRetry("/analytics", normalizedUsernames);
  } catch (error) {
    console.warn(`getprofileAnalytics unavailable: ${formatFetchError(error)}`);
    return null;
  }
};

const scrapNewInstagramProfileData = async (usernames: string[]) => {
  const response = await fetch(`${API_BASE_URL}/scrape/instagram`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": API_KEY,
    },
    body: JSON.stringify({ usernames, use_playwright: true }),
  });

  const payload = await response.json().catch(() => null);

  if (payload.detail?.active_job_id) {
    console.log(
      `⚠️ Scrap request for ${usernames.length} username(s) accepted but is being processed asynchronously (job ID: ${payload.detail.active_job_id}).`,
    );
    return null;
  }

  // Do not block here. Return the API payload as-is (queued/running/completed/error).
  if (!response.ok && response.status !== 409) {
    throw new Error(
      `scrapNewInstagramProfileData failed: ${response.status} ${JSON.stringify(payload)}`,
    );
  }

  if (payload.job_id) {
    console.log(
      `⚠️ Scrap request for ${usernames.length} username(s) accepted and queued (job ID: ${payload.job_id}).`,
    );
    return payload;
  }

  return payload;
};

export { scrapNewInstagramProfileData, getInstagramProfileData, getprofileAnalytics };
