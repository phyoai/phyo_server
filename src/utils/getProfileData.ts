const API_BASE_URL = process.env.API_BASE_URL;
const API_KEY = process.env.API_KEY;

// Validate required environment variables at startup to ensure proper typing and avoid undefined headers.
if (!API_BASE_URL) {
  throw new Error("Missing required environment variable: API_BASE_URL");
}
if (!API_KEY) {
  throw new Error("Missing required environment variable: API_KEY");
}

const getInstagramProfileData = async (username: string) => {
  const response = await fetch(`${API_BASE_URL}/profiles/${username}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "api-key": API_KEY,
    },
  });

  const data = await response.json();
  const detailMessage =
    typeof data?.detail === "string"
      ? data.detail
      : typeof data?.detail?.message === "string"
        ? data.detail.message
        : "";

  if (/Username not found in storage/i.test(detailMessage)) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `getInstagramProfileData failed: ${response.status} ${detailMessage}`.trim(),
    );
  }

  return data;
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

export { scrapNewInstagramProfileData, getInstagramProfileData };
