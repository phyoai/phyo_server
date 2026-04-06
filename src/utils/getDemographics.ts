
const API_BASE_URL = process.env.API_BASE_URL;
const API_KEY = process.env.API_KEY;

// Validate required environment variables at startup to ensure proper typing and avoid undefined headers.
if (!API_BASE_URL) {
  throw new Error("Missing required environment variable: API_BASE_URL");
}
if (!API_KEY) {
  throw new Error("Missing required environment variable: API_KEY");
}


const getDemographics = async (username: string) => {
  const response = await fetch(`${API_BASE_URL}/demographics/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": API_KEY,
    },
    body: JSON.stringify({ username, max_posts: 30 })
  });

  if (!response.ok) {
    throw new Error(`getDemographics failed: ${response.status}`);
  }

  return response.json(); // or response.text()
};

export default getDemographics;

// Example usage
// getDemographics("example_username");