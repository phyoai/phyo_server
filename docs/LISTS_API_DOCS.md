# Lists APIs Documentation

## Overview

The Lists APIs back the "My Lists" flow for saved influencer campaigns/lists.

In the current backend implementation, each list is stored in the `UserList` collection and belongs to exactly one authenticated user. A list contains influencer entries with workflow fields such as:

- `status`
- `notes`
- `addedAt`
- `updatedAt`

These endpoints support the full flow:

1. Open "My Lists"
2. Create a new list if none exist
3. Open a list detail page
4. Add influencers from search
5. Update one influencer's status or notes
6. Run bulk status updates or bulk remove
7. Export the list
8. Delete the list

## Base URL

```text
/api/lists
```

## Authentication

All list endpoints require JWT authentication.

Send the token in the request header:

```text
Authorization: Bearer <your_jwt_token>
```

## Ownership Rules

- Every list belongs to a single user.
- A user can only read or modify their own lists.
- If a list does not belong to the authenticated user, the API returns `404 List not found`.

## Data Shapes

### List Summary

This shape is returned by list-level endpoints such as `GET /api/lists`, `POST /api/lists`, and some update/delete responses.

```json
{
  "id": "6800fabc1234567890def123",
  "name": "Summer Campaign",
  "description": "Priority skincare creators",
  "totalInfluencers": 4,
  "statusCounts": {
    "Pending": 1,
    "Shortlisted": 2,
    "Contacted": 1
  },
  "createdAt": "2026-04-17T08:15:00.000Z",
  "updatedAt": "2026-04-17T09:20:00.000Z"
}
```

### List Detail Influencer Entry

When a list detail is returned, each item includes both list-entry metadata and enriched influencer profile data.

```json
{
  "id": "6800fbcc1234567890def456",
  "influencerId": "6800aa991234567890def111",
  "status": "Pending",
  "notes": "Good fit for first outreach",
  "addedAt": "2026-04-17T08:25:00.000Z",
  "updatedAt": "2026-04-17T08:25:00.000Z",
  "influencer": {
    "id": "6800aa991234567890def111",
    "username": "creator_handle",
    "name": "Creator Name",
    "profileName": "Creator Name",
    "profilePicture": "https://...",
    "category": "Beauty",
    "city": "Mumbai",
    "state": "Maharashtra",
    "language": "English",
    "isVerified": true,
    "followers": 125000,
    "averageEngagement": 3.8,
    "instagramUrl": "https://instagram.com/creator_handle"
  }
}
```

Important:

- `id` is the list-entry id, not the influencer id.
- `influencerId` is the influencer document id.
- Use the list-entry `id` for single-item update and delete endpoints.
- If an influencer record no longer exists in the influencer collection, `influencer` can be `null` while the list entry still remains.

## Endpoint Reference

### 1. Get My Lists

**GET** `/api/lists`

Returns all lists for the authenticated user, sorted by most recently updated first.

**What it is used for**

- "My Lists" landing page
- Empty-state check
- Summary cards showing total influencers and status counts

**Response**

```json
{
  "success": true,
  "message": "Lists retrieved successfully",
  "data": {
    "lists": [
      {
        "id": "6800fabc1234567890def123",
        "name": "Summer Campaign",
        "description": "Priority skincare creators",
        "totalInfluencers": 4,
        "statusCounts": {
          "Pending": 1,
          "Shortlisted": 2,
          "Contacted": 1
        },
        "createdAt": "2026-04-17T08:15:00.000Z",
        "updatedAt": "2026-04-17T09:20:00.000Z"
      }
    ],
    "emptyState": false
  }
}
```

Notes:

- `emptyState: true` means the user has no lists yet.
- This endpoint always returns a JSON payload, even when the list array is empty.

---

### 2. Create New List

**POST** `/api/lists`

Creates a new empty list for the authenticated user.

**Request Body**

```json
{
  "name": "Summer Campaign",
  "description": "Priority skincare creators"
}
```

**Field Rules**

- `name` is required.
- `description` is optional.
- List names are unique per user in a case-insensitive way.
- The list starts with an empty `items` array.

**Success Response**

```json
{
  "success": true,
  "message": "List created successfully",
  "data": {
    "list": {
      "id": "6800fabc1234567890def123",
      "name": "Summer Campaign",
      "description": "Priority skincare creators",
      "totalInfluencers": 0,
      "statusCounts": {},
      "createdAt": "2026-04-17T08:15:00.000Z",
      "updatedAt": "2026-04-17T08:15:00.000Z"
    }
  }
}
```

**Validation Errors**

- `400` if `name` is missing or blank
- `409` if a list with the same name already exists for the same user

---

### 3. Get List Details

**GET** `/api/lists/:id`

Returns a full list detail object, including enriched influencer rows.

**What it is used for**

- Opening a list/campaign page
- Rendering the influencer table
- Showing statuses, notes, counts, and creator profile data

**Success Response**

```json
{
  "success": true,
  "message": "List retrieved successfully",
  "data": {
    "list": {
      "id": "6800fabc1234567890def123",
      "name": "Summer Campaign",
      "description": "Priority skincare creators",
      "totalInfluencers": 2,
      "statusCounts": {
        "Pending": 1,
        "Contacted": 1
      },
      "createdAt": "2026-04-17T08:15:00.000Z",
      "updatedAt": "2026-04-17T09:20:00.000Z",
      "influencers": [
        {
          "id": "6800fbcc1234567890def456",
          "influencerId": "6800aa991234567890def111",
          "status": "Pending",
          "notes": "",
          "addedAt": "2026-04-17T08:25:00.000Z",
          "updatedAt": "2026-04-17T08:25:00.000Z",
          "influencer": {
            "id": "6800aa991234567890def111",
            "username": "creator_handle",
            "name": "Creator Name",
            "profileName": "Creator Name",
            "profilePicture": "https://...",
            "category": "Beauty",
            "city": "Mumbai",
            "state": "Maharashtra",
            "language": "English",
            "isVerified": true,
            "followers": 125000,
            "averageEngagement": 3.8,
            "instagramUrl": "https://instagram.com/creator_handle"
          }
        }
      ]
    }
  }
}
```

**Errors**

- `404` if the list does not exist or does not belong to the authenticated user

---

### 4. Add Influencers To List

**POST** `/api/lists/:id/influencers`

Adds one or more influencers to a list.

This endpoint is flexible by design so the frontend can call it from search results, profile actions, or batch selection flows.

#### Accepted Request Shapes

**A. Single influencer by id**

```json
{
  "influencerId": "6800aa991234567890def111",
  "status": "Pending",
  "notes": "First outreach batch"
}
```

**B. Single influencer by username**

```json
{
  "username": "creator_handle",
  "status": "Shortlisted"
}
```

**C. Multiple influencers by id with shared status/notes**

```json
{
  "influencerIds": [
    "6800aa991234567890def111",
    "6800aa991234567890def222"
  ],
  "status": "Shortlisted",
  "notes": "Imported from search results"
}
```

**D. Fully custom batch payload**

```json
{
  "influencers": [
    {
      "username": "creator_handle",
      "status": "Shortlisted",
      "notes": "Strong engagement"
    },
    {
      "influencerId": "6800aa991234567890def222",
      "status": "Pending"
    }
  ]
}
```

#### Resolution Rules

- If `influencerId` is a valid Mongo ObjectId, the API looks up the influencer by `_id`.
- If `influencerId` is not an ObjectId, the API treats it like a username.
- If `username` is provided, the API looks up the influencer by `user_name`.
- Duplicate influencers are skipped instead of being inserted twice.
- `status` defaults to `"Pending"` when omitted or blank.
- `notes` is optional and trimmed.

#### Success Response

If at least one influencer is added, the API returns `201`.

```json
{
  "success": true,
  "message": "Influencers added successfully",
  "data": {
    "added": [
      {
        "id": "6800fbcc1234567890def456",
        "influencerId": "6800aa991234567890def111",
        "status": "Shortlisted",
        "notes": "Strong engagement",
        "addedAt": "2026-04-17T09:00:00.000Z",
        "updatedAt": "2026-04-17T09:00:00.000Z",
        "influencer": {
          "id": "6800aa991234567890def111",
          "username": "creator_handle",
          "name": "Creator Name",
          "profileName": "Creator Name",
          "profilePicture": "https://...",
          "category": "Beauty",
          "city": "Mumbai",
          "state": "Maharashtra",
          "language": "English",
          "isVerified": true,
          "followers": 125000,
          "averageEngagement": 3.8,
          "instagramUrl": "https://instagram.com/creator_handle"
        }
      }
    ],
    "skipped": [
      {
        "reference": "creator_that_failed",
        "reason": "Influencer not found"
      }
    ],
    "list": {
      "id": "6800fabc1234567890def123",
      "name": "Summer Campaign",
      "description": "Priority skincare creators",
      "totalInfluencers": 3,
      "statusCounts": {
        "Pending": 1,
        "Shortlisted": 2
      },
      "createdAt": "2026-04-17T08:15:00.000Z",
      "updatedAt": "2026-04-17T09:00:00.000Z"
    }
  }
}
```

#### Partial Success Behavior

This endpoint supports partial success.

Examples:

- One influencer added, one duplicate skipped
- Two influencers added, one username not found

As long as at least one item is added, the request succeeds with `201` and includes a `skipped` array for the failures.

#### Failure Behavior

If no items were added at all, the API returns `400`.

```json
{
  "success": false,
  "message": "No influencers were added",
  "error": {
    "skipped": [
      {
        "reference": "creator_handle",
        "reason": "Influencer already exists in this list"
      }
    ]
  }
}
```

#### Common Errors

- `400` if no supported request shape is provided
- `400` if every candidate is skipped
- `404` if the list does not exist or is not owned by the user

---

### 5. Update One Influencer Entry

**PATCH** `/api/lists/:id/influencers/:itemId`

Updates the workflow fields for a single list entry.

Use this for:

- status changes
- note updates
- saving inline edits from the list page

Important:

- `itemId` is the list-entry id returned in `GET /api/lists/:id`
- `itemId` is not the influencer document id

**Request Body**

```json
{
  "status": "Contacted",
  "notes": "Reached out on Instagram DM"
}
```

You may send:

- only `status`
- only `notes`
- both fields together

If `notes` is sent as an empty or whitespace string, the note is cleared.

**Success Response**

```json
{
  "success": true,
  "message": "Influencer updated successfully",
  "data": {
    "item": {
      "id": "6800fbcc1234567890def456",
      "influencerId": "6800aa991234567890def111",
      "status": "Contacted",
      "notes": "Reached out on Instagram DM",
      "addedAt": "2026-04-17T09:00:00.000Z",
      "updatedAt": "2026-04-17T09:10:00.000Z",
      "influencer": {
        "id": "6800aa991234567890def111",
        "username": "creator_handle",
        "name": "Creator Name",
        "profileName": "Creator Name",
        "profilePicture": "https://...",
        "category": "Beauty",
        "city": "Mumbai",
        "state": "Maharashtra",
        "language": "English",
        "isVerified": true,
        "followers": 125000,
        "averageEngagement": 3.8,
        "instagramUrl": "https://instagram.com/creator_handle"
      }
    },
    "list": {
      "id": "6800fabc1234567890def123",
      "name": "Summer Campaign",
      "description": "Priority skincare creators",
      "totalInfluencers": 3,
      "statusCounts": {
        "Pending": 1,
        "Contacted": 1,
        "Shortlisted": 1
      },
      "createdAt": "2026-04-17T08:15:00.000Z",
      "updatedAt": "2026-04-17T09:10:00.000Z"
    }
  }
}
```

**Common Errors**

- `400` if neither `status` nor `notes` is provided
- `404` if the list is missing
- `404` if the list entry is missing

---

### 6. Bulk Update Or Remove Influencers

**PATCH** `/api/lists/:id/influencers/bulk`

Runs a bulk action on multiple list-entry ids.

This is the backend endpoint for the bottom action bar in the list page.

#### Supported Actions

- `updateStatus`
- `remove`

#### A. Bulk Status Update

**Request Body**

```json
{
  "action": "updateStatus",
  "itemIds": [
    "6800fbcc1234567890def456",
    "6800fbcc1234567890def457"
  ],
  "status": "Contacted"
}
```

**Success Response**

```json
{
  "success": true,
  "message": "Influencers updated successfully",
  "data": {
    "action": "updateStatus",
    "affectedCount": 2,
    "list": {
      "id": "6800fabc1234567890def123",
      "name": "Summer Campaign",
      "description": "Priority skincare creators",
      "totalInfluencers": 4,
      "statusCounts": {
        "Contacted": 3,
        "Pending": 1
      },
      "createdAt": "2026-04-17T08:15:00.000Z",
      "updatedAt": "2026-04-17T09:20:00.000Z"
    }
  }
}
```

#### B. Bulk Remove

**Request Body**

```json
{
  "action": "remove",
  "itemIds": [
    "6800fbcc1234567890def456",
    "6800fbcc1234567890def457"
  ]
}
```

**Success Response**

```json
{
  "success": true,
  "message": "Influencers removed successfully",
  "data": {
    "action": "remove",
    "affectedCount": 2,
    "list": {
      "id": "6800fabc1234567890def123",
      "name": "Summer Campaign",
      "description": "Priority skincare creators",
      "totalInfluencers": 2,
      "statusCounts": {
        "Pending": 1,
        "Contacted": 1
      },
      "createdAt": "2026-04-17T08:15:00.000Z",
      "updatedAt": "2026-04-17T09:20:00.000Z"
    }
  }
}
```

#### Common Errors

- `400` if `itemIds` is missing or empty
- `400` if `action` is not `updateStatus` or `remove`
- `400` if `action` is `updateStatus` and `status` is missing
- `404` if no matching list entries were found for the supplied ids

---

### 7. Remove One Influencer Entry

**DELETE** `/api/lists/:id/influencers/:itemId`

Removes a single influencer entry from a list.

Use this when the user selects one influencer and clicks remove.

**Success Response**

```json
{
  "success": true,
  "message": "Influencer removed successfully",
  "data": {
    "list": {
      "id": "6800fabc1234567890def123",
      "name": "Summer Campaign",
      "description": "Priority skincare creators",
      "totalInfluencers": 2,
      "statusCounts": {
        "Pending": 1,
        "Contacted": 1
      },
      "createdAt": "2026-04-17T08:15:00.000Z",
      "updatedAt": "2026-04-17T09:25:00.000Z"
    }
  }
}
```

**Common Errors**

- `404` if the list is missing
- `404` if the list entry does not exist

---

### 8. Export List

**GET** `/api/lists/:id/export?format=csv|excel`

Exports a list as a downloadable file.

**Supported Formats**

- `csv`
- `excel`

The backend also accepts `xls` and `xlsx` as aliases for the Excel export path.

**Behavior**

- CSV returns `text/csv; charset=utf-8`
- Excel returns `application/vnd.ms-excel; charset=utf-8`
- The filename is generated from the list name
- The response is a file download, not a JSON payload

**Exported Columns**

- `List Name`
- `Username`
- `Name`
- `Status`
- `Notes`
- `Category`
- `Followers`
- `Average Engagement`
- `City`
- `State`
- `Verified`
- `Added At`
- `Updated At`

**Example Request**

```text
GET /api/lists/6800fabc1234567890def123/export?format=csv
```

**Common Errors**

- `400` if `format` is missing or not one of the supported values
- `404` if the list is missing

---

### 9. Delete List

**DELETE** `/api/lists/:id`

Deletes the list itself.

Use this for the final "Delete Campaign/List" action.

**Success Response**

```json
{
  "success": true,
  "message": "List deleted successfully",
  "data": {
    "list": {
      "id": "6800fabc1234567890def123",
      "name": "Summer Campaign",
      "description": "Priority skincare creators",
      "totalInfluencers": 2,
      "statusCounts": {
        "Pending": 1,
        "Contacted": 1
      },
      "createdAt": "2026-04-17T08:15:00.000Z",
      "updatedAt": "2026-04-17T09:25:00.000Z"
    }
  }
}
```

**Common Errors**

- `404` if the id is not a valid Mongo ObjectId
- `404` if the list does not exist or does not belong to the user

## Typical Frontend Flow Mapping

### My Lists Screen

1. Call `GET /api/lists`
2. If `emptyState` is `true`, show the empty-state UI
3. On create, call `POST /api/lists`
4. Redirect to `GET /api/lists/:id`

### List Detail Screen

1. Call `GET /api/lists/:id`
2. Render the influencer table using `data.list.influencers`
3. Use `POST /api/lists/:id/influencers` to add creators from search
4. Use `PATCH /api/lists/:id/influencers/:itemId` for single-row edits
5. Use `PATCH /api/lists/:id/influencers/bulk` for bulk status update or bulk remove
6. Use `GET /api/lists/:id/export` for downloads
7. Use `DELETE /api/lists/:id` to remove the list

## Common Error Format

Most error responses use the shared structure:

```json
{
  "success": false,
  "message": "Error message",
  "error": {}
}
```

Examples:

- `Unauthorized`
- `List not found`
- `Provide status or notes to update`
- `format must be csv or excel`
- `A list with this name already exists`

## Notes For Frontend Integration

- Store both the list id and list-entry ids in the UI state.
- Use list-entry ids for per-row update and delete actions.
- Keep the `statusCounts` object to render summary chips or counters without recalculating in the client.
- Treat `skipped` in the add endpoint as a normal partial-success signal, not as a fatal error when at least one item was added.
- The export endpoint returns a file response, so the frontend should handle it as a blob/download.
