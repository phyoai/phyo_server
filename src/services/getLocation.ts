type ReverseLocationPoint = {
  lat: number;
  lon: number;
};

type ReverseLocationRequest = {
  point: ReverseLocationPoint;
  parallelism?: number;
  zoom?: number;
};

type ReverseLocationAddress = {
  suburb?: string;
  city?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
  [key: string]: string | undefined;
};

type ReverseLocationItem = {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  category: string;
  type: string;
  place_rank: number;
  importance: number;
  addresstype: string;
  name: string;
  display_name: string;
  address: ReverseLocationAddress;
  boundingbox: string[];
};

type ReverseLocationResult = {
  query: {
    lat: number;
    lon: number;
    zoom: number;
  };
  resolved_query: string;
  result_count: number;
  results: ReverseLocationItem[];
  index: number;
  success: boolean;
  error: string | null;
  elapsed_seconds: number;
};

type ReverseLocationResponse = {
  requested_count: number;
  resolved_count: number;
  failed_count: number;
  parallelism: number;
  zoom: number;
  timings: {
    total_seconds: number;
  };
  results: ReverseLocationResult[];
};

export async function reverseLocation(
  input: ReverseLocationRequest
): Promise<ReverseLocationResponse> {
  const apiUrl = "https://demographics.phyo.ai/locations/reverse";
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    throw new Error("API_KEY is not configured");
  }

  const payload = {
    point: input.point,
    parallelism: input.parallelism ?? 4,
    zoom: input.zoom ?? 15,
  };

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    const detail =
      typeof data?.detail === "string"
        ? data.detail
        : JSON.stringify(data);

    throw new Error(
      `reverseLocation failed: ${response.status} ${detail}`.trim()
    );
  }

  return data as ReverseLocationResponse;
}
