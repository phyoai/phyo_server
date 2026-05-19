# Frontend Socket Integration Guide

This guide is for frontend developers integrating chat realtime features in this backend.

It covers:
- all Socket.IO events ("socket endpoints")
- payload contracts
- required REST APIs around sockets
- step-by-step implementation flow

## 1) Realtime Features Available

- User online/offline presence
- Join/leave conversation rooms
- Realtime text message delivery
- Realtime image/file message delivery
- Typing indicators
- Message seen/read receipts
- Socket error event for failed message persistence

## 2) Socket Server Basics

- Transport: Socket.IO (default namespace `/`)
- Handshake endpoint: `/socket.io/` (managed by Socket.IO internally)
- Backend reads only `userId` from socket query during connection
- Room model:
  - user room: `<userId>` joined automatically on connect
  - conversation room: `<conversationId>` joined via `joinConversation`

Example connection:

```ts
import { io } from "socket.io-client";

const socket = io("http://localhost:4000", {
  query: { userId: currentUserId },
  transports: ["websocket", "polling"],
});
```

## 3) Important Auth and CORS Notes

- REST APIs are JWT-protected (`Authorization: Bearer <token>`).
- Socket events are not JWT-validated in current backend code; connection identity comes from `query.userId`.
- Recommended frontend pattern:
  - login first (get token + user id)
  - use token for REST APIs
  - use the same logged-in user id in socket query
- Current allowed socket origins in backend:
  - `https://phyo.ai`
  - `http://localhost:3000`
  - `http://localhost:4000`

## 4) Socket Event Contracts

### Client -> Server events

#### `joinConversation`

Join a conversation room.

```ts
socket.emit("joinConversation", conversationId);
```

Payload:
- `conversationId: string`

#### `leaveConversation`

Leave a conversation room.

```ts
socket.emit("leaveConversation", conversationId);
```

Payload:
- `conversationId: string`

#### `sendMessage`

Send text or media message.

```ts
socket.emit("sendMessage", {
  sender: currentUserId,
  conversationId,
  content: "hello", // optional for media messages
  messageType: "text", // optional, default text
});
```

Payload fields:
- `sender: string` (required)
- `conversationId: string` (required)
- `content?: string`
- `messageType?: "text" | "image" | "file"`
- `mediaUrl?: string`
- `mediaKey?: string`
- `fileName?: string`
- `fileSize?: number`
- `mimeType?: string`

Backend behavior:
- Persists message in DB
- Auto-detects `image` vs `file` from `mimeType` when media is present
- Emits `receiveMessage` to conversation room
- Emits `messageError` to sender on failure

#### `seenMessage`

Mark message as seen/read.

```ts
socket.emit("seenMessage", { messageId, userId: currentUserId });
```

Payload:
- `messageId: string`
- `userId: string`

Backend behavior:
- Marks DB message as read
- Emits `messageSeen` to conversation room

#### `typing`

Broadcast typing state to other room participants.

```ts
socket.emit("typing", { conversationId, isTyping: true });
```

Payload:
- `conversationId: string`
- `isTyping: boolean`

Backend behavior:
- Emits `userTyping` to others in same room (not sender)

### Server -> Client events

#### `receiveMessage`

Sent after successful `sendMessage`.

```ts
socket.on("receiveMessage", (message) => {
  // append or upsert message in UI
});
```

Message includes fields like:
- `_id`
- `conversationId`
- `senderId` (populated object with `name`, `email`, `username`)
- `content`
- `messageType`
- `mediaUrl`, `mediaKey`, `fileName`, `fileSize`
- `isRead`, `readAt`, `isDelivered`, `deliveredAt`
- `timestamp`, `createdAt`, `updatedAt`

#### `messageSeen`

```ts
socket.on("messageSeen", ({ messageId, userId, readAt }) => {
  // mark that message as read in UI
});
```

Payload:
- `messageId: string`
- `userId: string`
- `readAt: ISO date string`

#### `userTyping`

```ts
socket.on("userTyping", ({ userId, isTyping }) => {
  // show or hide typing indicator
});
```

Payload:
- `userId: string`
- `isTyping: boolean`

#### `userOnline`

```ts
socket.on("userOnline", ({ userId, isOnline }) => {
  // update presence
});
```

Payload:
- `userId: string`
- `isOnline: true`

#### `userOffline`

```ts
socket.on("userOffline", ({ userId, isOnline, lastSeen }) => {
  // update presence + last seen
});
```

Payload:
- `userId: string`
- `isOnline: false`
- `lastSeen: ISO date string`

#### `messageError`

```ts
socket.on("messageError", ({ error, details }) => {
  // show toast/error state
});
```

Payload:
- `error: string`
- `details?: string`

#### Built-in socket events you should handle

- `connect`
- `disconnect`
- `connect_error`

## 5) Required REST APIs Around Socket Flow

Use REST for setup/data fetch; use socket for realtime updates.

- Create/Get conversation:
  - `POST /api/conversation`
  - `GET /api/conversation/user`
  - `GET /api/conversation/:id`
- Fetch messages/history:
  - `GET /api/messages/:conversationId?page=1&limit=50`
- Optional REST read receipt:
  - `PATCH /api/messages/:id/read`
- File upload before sending media socket message:
  - image: `POST /api/upload/chat-image` (form field name: `image`)
  - file: `POST /api/upload/chat-file` (form field name: `file`)

Upload response (`data`) provides what `sendMessage` needs:
- `url`
- `key`
- `originalName`
- `size`
- `mimeType`
- `fileTypeCategory`

## 6) End-to-End Frontend Implementation

### Step 1: Authenticate and store session

- Login via auth API
- Store:
  - `token`
  - `currentUserId`

### Step 2: Create or pick conversation

- Get conversations from REST
- Create one if missing
- Keep active `conversationId`

### Step 3: Connect socket

```ts
const socket = io(BASE_URL, {
  query: { userId: currentUserId },
  transports: ["websocket", "polling"],
});
```

### Step 4: Join active room

```ts
socket.emit("joinConversation", conversationId);
```

If switching conversation:
- emit `leaveConversation` for old room
- emit `joinConversation` for new room

### Step 5: Load history once

- Call `GET /api/messages/:conversationId`
- Render messages
- Then rely on `receiveMessage` for realtime additions

### Step 6: Send text message

```ts
socket.emit("sendMessage", {
  sender: currentUserId,
  conversationId,
  content: text,
  messageType: "text",
});
```

### Step 7: Send image/file message

1. Upload file using REST (`/api/upload/chat-image` or `/api/upload/chat-file`)
2. Emit socket message with uploaded metadata:

```ts
socket.emit("sendMessage", {
  sender: currentUserId,
  conversationId,
  content: optionalCaption,
  messageType: upload.fileTypeCategory === "image" ? "image" : "file",
  mediaUrl: upload.url,
  mediaKey: upload.key,
  fileName: upload.originalName,
  fileSize: upload.size,
  mimeType: upload.mimeType,
});
```

### Step 8: Typing indicator

On input:
- emit `typing` with `isTyping: true`
- debounce and emit `isTyping: false` after user stops typing

### Step 9: Seen receipts

When message becomes visible/read:

```ts
socket.emit("seenMessage", {
  messageId,
  userId: currentUserId,
});
```

Handle `messageSeen` to update UI.

### Step 10: Cleanup

On screen change/unmount/logout:
- emit `leaveConversation` for current room
- `socket.disconnect()`

## 7) Recommended Frontend Event Wiring

```ts
socket.on("connect", () => {});
socket.on("disconnect", () => {});
socket.on("connect_error", (err) => {});

socket.on("receiveMessage", (msg) => {});
socket.on("messageSeen", (evt) => {});
socket.on("userTyping", (evt) => {});
socket.on("userOnline", (evt) => {});
socket.on("userOffline", (evt) => {});
socket.on("messageError", (evt) => {});
```

## 8) Production Notes

- Always refetch messages after reconnect to avoid missed events during disconnection.
- Presence events are room-based. If the user has not joined a conversation room, they will not get that room's realtime events.
- `sendMessage` currently trusts `sender` from payload; frontend should always set it from authenticated session.
- For documentation in Swagger, check `Realtime` tag entries (`/socket/events/*`). These are event contracts, not normal REST handlers.

