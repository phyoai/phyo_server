# Campaign Boost and Recommendations

This document explains how campaign boosting works and how boost recommendations are generated in the backend.

## Endpoints

- `POST /api/campaigns/:id/boost`
- `GET /api/campaigns/:id/boost-recommendations`

Both endpoints require `authenticateToken`.

## Boost Flow (`POST /api/campaigns/:id/boost`)

### Ownership and status checks

The API allows boost only when:

1. User is authenticated.
2. Campaign exists and belongs to the same brand user (`campaignId` + `brandId` check).
3. Campaign status is exactly `Active`.

If campaign is `Draft`, `Paused`, `Completed`, or `Cancelled`, boost is rejected.

### Request body

```json
{
  "duration": "7days",
  "amount": 500
}
```

- `duration` is required: `7days | 14days | 30days`
- `amount` is optional

If `amount` is provided, it must exactly match server pricing for the selected duration.

### Fixed pricing

- `7days` => `500`
- `14days` => `900`
- `30days` => `1500`

### Lift mapping

- `7days` => `15%`
- `14days` => `28%`
- `30days` => `45%`

### Reach calculation

#### Base reach

`baseReach = max(10000, selectedInfluencers*10000 + applicants*2500 + round(budget*0.2))`

#### Estimated boosted reach

- multiplier(`7days`) = `1.0`
- multiplier(`14days`) = `1.7`
- multiplier(`30days`) = `2.6`

`estimatedReach = round(baseReach * multiplier(duration))`

### Boost persistence behavior

- Boost is stored in `campaign.boost` (single object).
- Re-boost **replaces** the existing boost object (no history array in v1).
- Time window:
  - `startsAt = now`
  - `endsAt = now + durationDays`

### Response shape

Returns:

- `campaignId`
- `chargeMode: "record_only"` (no payment/credit deduction in this endpoint)
- `boost` object with:
  - `duration`, `amount`
  - `startsAt`, `endsAt`
  - `estimatedReach`, `estimatedLiftPercent`
  - `boostedBy`, `createdAt`, `updatedAt`

## Recommendations Flow (`GET /api/campaigns/:id/boost-recommendations`)

### Access checks

The caller must be:

1. Authenticated.
2. Owner brand of the campaign.

### Recommendation decision rules

Using current campaign `budget` and number of `applicants`:

- Recommend `30days` if `budget >= 150000` OR `applicants >= 25`
- Else recommend `14days` if `budget >= 50000` OR `applicants >= 10`
- Else recommend `7days`

### Recommendation payload

The API returns all 3 duration packages:

- `duration`
- `amount` (fixed pricing)
- `estimatedReach` (campaign-specific formula)
- `estimatedLiftPercent`
- `isRecommended` (exactly one is `true`)
- `reason`

Also returned:

- `recommendedDuration`
- `activeBoost` (current active boost if not expired, otherwise `null`)

## What is considered an active boost

`activeBoost` is true only when:

`campaign.boost.endsAt > now`

No cron job is used. Active state is evaluated at query time.

## Discovery Ranking Impact

Active boosts are prioritized first in discovery lists:

- `GET /api/campaigns`
- `GET /api/campaigns/trending`
- `GET /api/campaigns/trending/for-me`

Sorting behavior:

- Boosted active campaigns first (`boost.endsAt > now`)
- Then existing sort strategy (`createdAt` or `applicantCount` as defined per endpoint)

## Notes

- Current implementation is **record-only** for charging.
- No credit deduction and no Razorpay processing in boost endpoint.
- Boost affects discovery ranking only in current version.
