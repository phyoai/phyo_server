(() => {
  const STORAGE_KEYS = {
    baseUrl: "phyo.chatClient.baseUrl",
    token: "phyo.chatClient.token",
    user: "phyo.chatClient.user",
  };

  const DEFAULT_BASE_URL = `${window.location.protocol}//${window.location.host}`;

  const state = {
    baseUrl: DEFAULT_BASE_URL,
    token: "",
    currentUser: null,
    socket: null,
    socketStatus: "offline",
    socketBaseUrl: "",
    socketUserId: "",
    joinedConversationId: "",
    activeConversation: null,
    conversations: [],
    messages: [],
    userResults: [],
    eventLog: [],
    presenceByUserId: {},
    remoteTyping: null,
    localTypingActive: false,
    typingTimer: null,
    flashTimer: null,
    userDirectory: new Map(),
    isLoadingUsers: false,
    isLoadingConversations: false,
    isSendingMessage: false,
  };

  let dom = {};

  function init() {
    bindDom();
    hydrateStoredState();
    bindEvents();
    renderAll();

    if (state.token) {
      hydrateSession({ quiet: true });
    } else {
      searchUsers("", { quiet: true });
    }
  }

  function bindDom() {
    dom = {
      flash: document.getElementById("flash"),
      sessionStatusChip: document.getElementById("sessionStatusChip"),
      socketStatusChip: document.getElementById("socketStatusChip"),
      activeConversationChip: document.getElementById("activeConversationChip"),
      settingsForm: document.getElementById("settingsForm"),
      baseUrlInput: document.getElementById("baseUrlInput"),
      refreshSessionBtn: document.getElementById("refreshSessionBtn"),
      loginForm: document.getElementById("loginForm"),
      emailInput: document.getElementById("emailInput"),
      passwordInput: document.getElementById("passwordInput"),
      tokenForm: document.getElementById("tokenForm"),
      tokenInput: document.getElementById("tokenInput"),
      logoutBtn: document.getElementById("logoutBtn"),
      sessionSummary: document.getElementById("sessionSummary"),
      createConversationForm: document.getElementById("createConversationForm"),
      participantIdsInput: document.getElementById("participantIdsInput"),
      searchUsersForm: document.getElementById("searchUsersForm"),
      userSearchInput: document.getElementById("userSearchInput"),
      userResults: document.getElementById("userResults"),
      reloadUsersBtn: document.getElementById("reloadUsersBtn"),
      socketStateLabel: document.getElementById("socketStateLabel"),
      socketIdLabel: document.getElementById("socketIdLabel"),
      joinedRoomLabel: document.getElementById("joinedRoomLabel"),
      connectSocketBtn: document.getElementById("connectSocketBtn"),
      disconnectSocketBtn: document.getElementById("disconnectSocketBtn"),
      joinConversationBtn: document.getElementById("joinConversationBtn"),
      leaveConversationBtn: document.getElementById("leaveConversationBtn"),
      typingOnBtn: document.getElementById("typingOnBtn"),
      typingOffBtn: document.getElementById("typingOffBtn"),
      seenMessageInput: document.getElementById("seenMessageInput"),
      autoSeenCheckbox: document.getElementById("autoSeenCheckbox"),
      sendSeenBtn: document.getElementById("sendSeenBtn"),
      clearLogBtn: document.getElementById("clearLogBtn"),
      reloadConversationsBtn: document.getElementById("reloadConversationsBtn"),
      conversationList: document.getElementById("conversationList"),
      chatTitle: document.getElementById("chatTitle"),
      chatMeta: document.getElementById("chatMeta"),
      reloadMessagesBtn: document.getElementById("reloadMessagesBtn"),
      typingIndicator: document.getElementById("typingIndicator"),
      messageList: document.getElementById("messageList"),
      composerForm: document.getElementById("composerForm"),
      messageInput: document.getElementById("messageInput"),
      fileInput: document.getElementById("fileInput"),
      fileNameLabel: document.getElementById("fileNameLabel"),
      sendMessageBtn: document.getElementById("sendMessageBtn"),
      clearComposerBtn: document.getElementById("clearComposerBtn"),
      eventLog: document.getElementById("eventLog"),
    };
  }

  function bindEvents() {
    dom.settingsForm.addEventListener("submit", handleSaveBaseUrl);
    dom.refreshSessionBtn.addEventListener("click", () => hydrateSession());
    dom.loginForm.addEventListener("submit", handleLogin);
    dom.tokenForm.addEventListener("submit", handleUseToken);
    dom.logoutBtn.addEventListener("click", clearSession);

    dom.createConversationForm.addEventListener("submit", handleCreateConversation);
    dom.searchUsersForm.addEventListener("submit", handleSearchUsers);
    dom.reloadUsersBtn.addEventListener("click", () => searchUsers(dom.userSearchInput.value.trim()));
    dom.userResults.addEventListener("click", handleUserResultsClick);

    dom.reloadConversationsBtn.addEventListener("click", () => loadConversations());
    dom.conversationList.addEventListener("click", handleConversationListClick);
    dom.reloadMessagesBtn.addEventListener("click", () => {
      const conversationId = activeConversationId();
      if (conversationId) {
        loadMessages(conversationId);
      }
    });

    dom.connectSocketBtn.addEventListener("click", () => connectSocket({ notify: true }));
    dom.disconnectSocketBtn.addEventListener("click", () => teardownSocket({ manual: true }));
    dom.joinConversationBtn.addEventListener("click", () => {
      const conversationId = activeConversationId();
      if (!conversationId) {
        setFlash("Select a conversation before joining a room.", "error");
        return;
      }
      joinConversation(conversationId);
    });
    dom.leaveConversationBtn.addEventListener("click", leaveActiveConversation);
    dom.typingOnBtn.addEventListener("click", () => emitTypingState(true, { force: true }));
    dom.typingOffBtn.addEventListener("click", () => emitTypingState(false, { force: true }));
    dom.seenMessageInput.addEventListener("input", renderStatus);
    dom.sendSeenBtn.addEventListener("click", () => emitSeenMessage(dom.seenMessageInput.value.trim()));
    dom.clearLogBtn.addEventListener("click", () => {
      state.eventLog = [];
      renderEventLog();
    });

    dom.composerForm.addEventListener("submit", handleSendMessage);
    dom.clearComposerBtn.addEventListener("click", clearComposer);
    dom.fileInput.addEventListener("change", renderComposerState);
    dom.messageInput.addEventListener("input", handleComposerInput);
    dom.messageInput.addEventListener("blur", stopTypingSoon);
    dom.messageList.addEventListener("click", handleMessageListClick);

    window.addEventListener("beforeunload", () => {
      stopTypingNow();
      if (state.joinedConversationId && state.socket) {
        state.socket.emit("leaveConversation", state.joinedConversationId);
      }
      teardownSocket({ silent: true });
    });
  }

  function hydrateStoredState() {
    state.baseUrl = normalizeBaseUrl(localStorage.getItem(STORAGE_KEYS.baseUrl) || DEFAULT_BASE_URL);
    state.token = localStorage.getItem(STORAGE_KEYS.token) || "";
    state.currentUser = safeParse(localStorage.getItem(STORAGE_KEYS.user), null);

    dom.baseUrlInput.value = state.baseUrl;
    dom.tokenInput.value = state.token;

    if (state.currentUser) {
      rememberUser(state.currentUser);
    }
  }

  function renderAll() {
    renderStatus();
    renderSession();
    renderUsers();
    renderConversations();
    renderChatHeader();
    renderTypingIndicator();
    renderMessages();
    renderEventLog();
    renderComposerState();
  }

  function renderStatus() {
    const userId = currentUserId();
    const activeId = activeConversationId();

    dom.sessionStatusChip.textContent = userId ? `Session ${shortId(userId)}` : "No session";
    dom.sessionStatusChip.className = `status-chip ${userId ? "status-chip-ready" : "status-chip-muted"}`;

    const socketLabel =
      state.socketStatus === "connected"
        ? "Socket connected"
        : state.socketStatus === "connecting"
          ? "Socket connecting"
          : state.socketStatus === "error"
            ? "Socket error"
            : "Socket offline";

    dom.socketStatusChip.textContent = socketLabel;
    dom.socketStatusChip.className = `status-chip ${state.socketStatus === "connected" ? "status-chip-live" : "status-chip-muted"}`;

    dom.activeConversationChip.textContent = activeId ? `Active ${shortId(activeId)}` : "No active conversation";
    dom.activeConversationChip.className = `status-chip ${activeId ? "status-chip-ready" : "status-chip-muted"}`;

    dom.socketStateLabel.textContent = state.socketStatus;
    dom.socketIdLabel.textContent = state.socket && state.socket.id ? state.socket.id : "n/a";
    dom.joinedRoomLabel.textContent = state.joinedConversationId || "n/a";

    dom.connectSocketBtn.disabled = !userId || state.socketStatus === "connected" || state.socketStatus === "connecting";
    dom.disconnectSocketBtn.disabled = !state.socket;
    dom.joinConversationBtn.disabled = !activeId;
    dom.leaveConversationBtn.disabled = !state.joinedConversationId;
    dom.typingOnBtn.disabled = !activeId;
    dom.typingOffBtn.disabled = !activeId;
    dom.sendSeenBtn.disabled = !dom.seenMessageInput.value.trim();
    dom.reloadConversationsBtn.disabled = !state.token;
    dom.reloadMessagesBtn.disabled = !activeId || !state.token;
  }

  function renderSession() {
    dom.baseUrlInput.value = state.baseUrl;

    if (!state.token) {
      dom.sessionSummary.className = "empty-state compact";
      dom.sessionSummary.textContent = "No authenticated user.";
      renderStatus();
      return;
    }

    if (!state.currentUser) {
      dom.sessionSummary.className = "session-card";
      dom.sessionSummary.innerHTML = `
        <strong>Token loaded</strong>
        <p class="subtle">A JWT is stored, but the user profile has not been loaded yet.</p>
        <div class="mini-row">
          <span class="tag">Token ${escapeHtml(shortToken(state.token))}</span>
        </div>
      `;
      renderStatus();
      return;
    }

    const user = state.currentUser;
    const userId = currentUserId();

    dom.sessionSummary.className = "session-card";
    dom.sessionSummary.innerHTML = `
      <strong>${escapeHtml(displayName(user))}</strong>
      <div class="session-grid">
        <div>
          <span class="metric-label">User ID</span>
          <code>${escapeHtml(userId)}</code>
        </div>
        <div>
          <span class="metric-label">Account type</span>
          <strong>${escapeHtml(user.type || "UNKNOWN")}</strong>
        </div>
        <div>
          <span class="metric-label">Email</span>
          <strong>${escapeHtml(user.email || "n/a")}</strong>
        </div>
        <div>
          <span class="metric-label">Token</span>
          <strong>${escapeHtml(shortToken(state.token))}</strong>
        </div>
      </div>
      <div class="mini-row">
        ${user.username ? `<span class="tag">@${escapeHtml(user.username)}</span>` : ""}
        <span class="tag">${escapeHtml(userId)}</span>
      </div>
    `;

    renderStatus();
  }

  function renderUsers() {
    if (state.isLoadingUsers) {
      dom.userResults.className = "collection tall";
      dom.userResults.innerHTML = `<div class="empty-state">Loading users...</div>`;
      return;
    }

    if (!state.userResults.length) {
      dom.userResults.className = "collection tall empty-state";
      dom.userResults.textContent = "User search results will appear here.";
      return;
    }

    dom.userResults.className = "collection tall";
    dom.userResults.innerHTML = state.userResults
      .map((user) => {
        const id = userIdOf(user);
        return `
          <article class="user-card">
            <div class="card-head">
              <div class="title-stack">
                <strong>${escapeHtml(displayName(user))}</strong>
                <span class="mini">${escapeHtml(user.email || "No email")}</span>
              </div>
              <span class="tag">${escapeHtml(user.type || "UNKNOWN")}</span>
            </div>

            <div class="mini-row">
              ${user.username ? `<span class="tag">@${escapeHtml(user.username)}</span>` : ""}
              <span class="tag">${escapeHtml(shortId(id))}</span>
            </div>

            <div class="action-row">
              <button type="button" class="ghost" data-action="set-participant-id" data-user-id="${escapeHtml(id)}">Use ID</button>
              <button type="button" data-action="create-conversation" data-user-id="${escapeHtml(id)}">Create chat</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderConversations() {
    if (!state.token) {
      dom.conversationList.className = "collection conversation-list empty-state";
      dom.conversationList.textContent = "Login or attach a token to load conversations.";
      return;
    }

    if (state.isLoadingConversations) {
      dom.conversationList.className = "collection conversation-list";
      dom.conversationList.innerHTML = `<div class="empty-state">Loading conversations...</div>`;
      return;
    }

    if (!state.conversations.length) {
      dom.conversationList.className = "collection conversation-list empty-state";
      dom.conversationList.textContent = "No conversations loaded.";
      return;
    }

    dom.conversationList.className = "collection conversation-list";
    dom.conversationList.innerHTML = state.conversations
      .map((conversation) => {
        const id = conversationIdOf(conversation);
        const isActive = id === activeConversationId();
        const isJoined = id === state.joinedConversationId;
        const title = conversationTitle(conversation);
        const preview = messagePreview(conversation);
        const presence = conversationPresence(conversation);

        return `
          <article class="conversation-card ${isActive ? "active" : ""}">
            <div class="card-head">
              <div class="title-stack">
                <strong>${escapeHtml(title)}</strong>
                <span class="mini">${escapeHtml(shortId(id))}</span>
              </div>
              <div class="tag-row">
                ${presence ? `<span class="${presence.className}">${escapeHtml(presence.label)}</span>` : ""}
                ${isJoined ? '<span class="tag">joined</span>' : ""}
              </div>
            </div>

            <p class="subtle">${escapeHtml(preview)}</p>

            <div class="mini-row">
              <span class="tag">${escapeHtml(formatDateTime(conversation.lastMessageTime || conversation.updatedAt || conversation.createdAt))}</span>
              ${conversation.participants && conversation.participants.length ? `<span class="tag">${conversation.participants.length} participants</span>` : ""}
            </div>

            <div class="action-row">
              <button type="button" data-action="open-conversation" data-conversation-id="${escapeHtml(id)}">
                ${isActive ? "Open" : "Select"}
              </button>
              <button type="button" class="ghost" data-action="join-conversation" data-conversation-id="${escapeHtml(id)}">
                Join room
              </button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderChatHeader() {
    const conversation = state.activeConversation;
    if (!conversation) {
      dom.chatTitle.textContent = "Select a conversation";
      dom.chatMeta.textContent = "Open a conversation to join its room and load messages.";
      return;
    }

    dom.chatTitle.textContent = conversationTitle(conversation);
    dom.chatMeta.textContent = `${conversationIdOf(conversation)} · ${conversationMeta(conversation)}`;
  }

  function renderTypingIndicator() {
    if (!state.remoteTyping || !state.remoteTyping.isTyping || !state.activeConversation) {
      dom.typingIndicator.textContent = "";
      dom.typingIndicator.classList.add("hidden");
      return;
    }

    const userName = labelUserById(state.remoteTyping.userId);
    dom.typingIndicator.textContent = `${userName} is typing...`;
    dom.typingIndicator.classList.remove("hidden");
  }

  function renderMessages() {
    if (!state.activeConversation) {
      dom.messageList.className = "message-list empty-state";
      dom.messageList.textContent = "No messages yet.";
      return;
    }

    if (!state.messages.length) {
      dom.messageList.className = "message-list empty-state";
      dom.messageList.textContent = "No messages in this conversation.";
      return;
    }

    dom.messageList.className = "message-list";
    dom.messageList.innerHTML = state.messages
      .map((message) => {
        const id = messageIdOf(message);
        const self = isSelfMessage(message);
        const readBadge = message.isRead ? "Seen" : "Unread";
        const deliveryBadge = message.isDelivered ? "Delivered" : "Pending";
        const senderLabel = self ? "You" : labelUserById(userIdOf(message.senderId));

        return `
          <article class="message-card ${self ? "self" : "other"}" data-message-id="${escapeHtml(id)}">
            <div class="message-meta">
              <strong>${escapeHtml(senderLabel)}</strong>
              <span>${escapeHtml(formatDateTime(message.timestamp || message.createdAt))}</span>
              <span class="tag">${escapeHtml(message.messageType || "text")}</span>
              <span class="tag">${escapeHtml(deliveryBadge)}</span>
              <span class="tag">${escapeHtml(readBadge)}</span>
            </div>

            ${message.content ? `<div class="message-body">${escapeHtml(message.content)}</div>` : ""}
            ${renderMessageMedia(message)}

            <div class="action-row">
              <button type="button" class="ghost" data-action="select-message" data-message-id="${escapeHtml(id)}">Use as seen target</button>
              ${!self && !message.isRead ? `<button type="button" data-action="mark-seen" data-message-id="${escapeHtml(id)}">Mark seen</button>` : ""}
            </div>
          </article>
        `;
      })
      .join("");

    requestAnimationFrame(() => {
      dom.messageList.scrollTop = dom.messageList.scrollHeight;
    });
  }

  function renderMessageMedia(message) {
    if (!message.mediaUrl) {
      return "";
    }

    if (message.messageType === "image") {
      return `
        <div class="message-media">
          <img src="${escapeHtml(message.mediaUrl)}" alt="${escapeHtml(message.fileName || "uploaded image")}">
        </div>
      `;
    }

    const fileLabel = message.fileName || "Download file";
    return `
      <div class="message-media">
        <a class="file-link" href="${escapeHtml(message.mediaUrl)}" target="_blank" rel="noreferrer">
          <span>Open file</span>
          <strong>${escapeHtml(fileLabel)}</strong>
        </a>
      </div>
    `;
  }

  function renderEventLog() {
    if (!state.eventLog.length) {
      dom.eventLog.className = "event-log empty-state";
      dom.eventLog.textContent = "Socket activity will appear here.";
      return;
    }

    dom.eventLog.className = "event-log";
    dom.eventLog.innerHTML = state.eventLog
      .map((entry) => `
        <article class="event-card ${entry.tone}">
          <div class="event-head">
            <span class="event-kind">${escapeHtml(entry.kind)}</span>
            <span class="mini">${escapeHtml(formatDateTime(entry.at))}</span>
          </div>
          <pre>${escapeHtml(safeStringify(entry.payload))}</pre>
        </article>
      `)
      .join("");
  }

  function renderComposerState() {
    const file = dom.fileInput.files && dom.fileInput.files[0];
    dom.fileNameLabel.textContent = file ? `${file.name} · ${formatBytes(file.size)}` : "No file selected";
    dom.sendMessageBtn.disabled = !state.activeConversation || state.isSendingMessage;
    renderStatus();
  }

  async function handleSaveBaseUrl(event) {
    event.preventDefault();
    state.baseUrl = normalizeBaseUrl(dom.baseUrlInput.value);
    localStorage.setItem(STORAGE_KEYS.baseUrl, state.baseUrl);
    setFlash(`Base URL set to ${state.baseUrl}`, "success");

    if (state.currentUser) {
      connectSocket({ notify: true, forceReconnect: true });
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    const email = dom.emailInput.value.trim();
    const password = dom.passwordInput.value;

    if (!email || !password) {
      setFlash("Email and password are required.", "error");
      return;
    }

    try {
      const response = await api("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });

      state.token = response.token || "";
      state.currentUser = response.user || null;
      persistSession();
      rememberUser(state.currentUser);

      dom.tokenInput.value = state.token;
      dom.passwordInput.value = "";

      renderSession();
      connectSocket({ notify: true });
      await Promise.all([loadConversations(), searchUsers(dom.userSearchInput.value.trim(), { quiet: true })]);
      setFlash("Login succeeded.", "success");
    } catch (error) {
      setFlash(error.message || "Login failed.", "error");
    }
  }

  async function handleUseToken(event) {
    event.preventDefault();
    const token = dom.tokenInput.value.trim();

    if (!token) {
      setFlash("Paste a JWT token first.", "error");
      return;
    }

    state.token = token;
    persistSession();
    await hydrateSession();
  }

  async function hydrateSession({ quiet = false } = {}) {
    if (!state.token) {
      if (!quiet) {
        setFlash("No token is available. Login or paste a JWT first.", "error");
      }
      return;
    }

    try {
      const response = await api("/api/users/profile");
      state.currentUser = extractData(response);
      rememberUser(state.currentUser);
      persistSession();
      renderSession();
      connectSocket({ notify: !quiet });
      await Promise.all([loadConversations(), searchUsers(dom.userSearchInput.value.trim(), { quiet: true })]);

      if (!quiet) {
        setFlash("Session restored from token.", "success");
      }
    } catch (error) {
      clearSession({ quiet: true });
      setFlash(error.message || "Unable to restore session from token.", "error");
    }
  }

  function clearSession({ quiet = false } = {}) {
    stopTypingNow();
    teardownSocket({ manual: true, silent: true });

    state.token = "";
    state.currentUser = null;
    state.activeConversation = null;
    state.conversations = [];
    state.messages = [];
    state.presenceByUserId = {};
    state.remoteTyping = null;
    state.joinedConversationId = "";

    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.user);
    dom.tokenInput.value = "";
    dom.seenMessageInput.value = "";
    renderAll();

    if (!quiet) {
      setFlash("Session cleared.", "success");
    }
  }

  async function handleCreateConversation(event) {
    event.preventDefault();
    if (!state.token || !state.currentUser) {
      setFlash("Login or attach a token before creating a conversation.", "error");
      return;
    }

    const ids = parseParticipantIds(dom.participantIdsInput.value);
    if (!ids.length) {
      setFlash("Enter at least one participant ID.", "error");
      return;
    }

    const filteredIds = ids.filter((id) => id !== currentUserId());
    if (!filteredIds.length) {
      setFlash("You cannot create a conversation with only yourself.", "error");
      return;
    }

    const body = filteredIds.length === 1 ? { participantId: filteredIds[0] } : { participantIds: filteredIds };

    try {
      const response = await api("/api/conversation", {
        method: "POST",
        body,
      });

      const conversation = extractData(response);
      const conversationId = conversationIdOf(conversation);
      dom.participantIdsInput.value = "";

      await loadConversations({ selectId: conversationId });
      setFlash(response.message || "Conversation created.", "success");
    } catch (error) {
      setFlash(error.message || "Conversation creation failed.", "error");
    }
  }

  async function handleSearchUsers(event) {
    event.preventDefault();
    await searchUsers(dom.userSearchInput.value.trim());
  }

  function handleUserResultsClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }

    const userId = button.getAttribute("data-user-id") || "";
    const action = button.getAttribute("data-action");

    if (action === "set-participant-id") {
      dom.participantIdsInput.value = userId;
      setFlash(`Participant ID set to ${userId}`, "info");
      return;
    }

    if (action === "create-conversation") {
      dom.participantIdsInput.value = userId;
      dom.createConversationForm.requestSubmit();
    }
  }

  function handleConversationListClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }

    const conversationId = button.getAttribute("data-conversation-id") || "";
    const action = button.getAttribute("data-action");

    if (!conversationId) {
      return;
    }

    if (action === "open-conversation") {
      selectConversation(conversationId);
      return;
    }

    if (action === "join-conversation") {
      joinConversation(conversationId);
    }
  }

  async function selectConversation(conversationId) {
    const conversation = state.conversations.find((item) => conversationIdOf(item) === conversationId);
    if (!conversation) {
      setFlash("Conversation not found in the current list.", "error");
      return;
    }

    state.activeConversation = conversation;
    state.messages = [];
    state.remoteTyping = null;
    renderConversations();
    renderChatHeader();
    renderTypingIndicator();
    renderMessages();

    await loadMessages(conversationId);
    joinConversation(conversationId);
  }

  async function loadConversations({ selectId = "" } = {}) {
    if (!state.token) {
      state.conversations = [];
      renderConversations();
      return;
    }

    state.isLoadingConversations = true;
    renderConversations();

    try {
      const response = await api("/api/conversation/user");
      state.conversations = sortConversations(extractData(response) || []);
      state.conversations.forEach(registerConversationUsers);

      if (selectId) {
        const selected = state.conversations.find((conversation) => conversationIdOf(conversation) === selectId);
        if (selected) {
          state.activeConversation = selected;
          renderChatHeader();
          renderConversations();
          await loadMessages(selectId);
          joinConversation(selectId);
        }
      } else if (state.activeConversation) {
        const activeId = activeConversationId();
        state.activeConversation = state.conversations.find((conversation) => conversationIdOf(conversation) === activeId) || null;
        renderChatHeader();
        renderConversations();
      }
    } catch (error) {
      setFlash(error.message || "Unable to load conversations.", "error");
    } finally {
      state.isLoadingConversations = false;
      renderConversations();
    }
  }

  async function loadMessages(conversationId) {
    if (!state.token) {
      setFlash("Login or attach a token before loading messages.", "error");
      return;
    }

    try {
      const response = await api(`/api/messages/${conversationId}?page=1&limit=100`);
      const data = extractData(response) || {};
      state.messages = Array.isArray(data.messages) ? data.messages : [];
      state.messages.forEach(registerMessageUsers);
      renderMessages();
    } catch (error) {
      setFlash(error.message || "Unable to load messages.", "error");
    }
  }

  async function searchUsers(query, { quiet = false } = {}) {
    state.isLoadingUsers = true;
    renderUsers();

    try {
      const response = await api(`/api/users/search?q=${encodeURIComponent(query)}&page=1&limit=20`, { authOptional: true });
      const data = extractData(response) || {};
      const users = Array.isArray(data.users) ? data.users : [];
      const currentId = currentUserId();

      state.userResults = users.filter((user) => userIdOf(user) !== currentId);
      state.userResults.forEach(rememberUser);
    } catch (error) {
      state.userResults = [];
      if (!quiet) {
        setFlash(error.message || "Unable to search users.", "error");
      }
    } finally {
      state.isLoadingUsers = false;
      renderUsers();
    }
  }

  function connectSocket({ notify = false, forceReconnect = false } = {}) {
    const userId = currentUserId();
    if (!userId) {
      if (notify) {
        setFlash("Load a session before connecting the socket.", "error");
      }
      return;
    }

    const canReuse =
      state.socket &&
      !forceReconnect &&
      state.socketBaseUrl === state.baseUrl &&
      state.socketUserId === userId;

    if (canReuse) {
      if (state.socket.connected) {
        if (notify) {
          setFlash("Socket is already connected.", "info");
        }
        return;
      }

      state.socket.connect();
      state.socketStatus = "connecting";
      renderStatus();
      return;
    }

    teardownSocket({ silent: true });

    state.socketStatus = "connecting";
    renderStatus();

    const socket = window.io(state.baseUrl, {
      query: { userId },
      transports: ["websocket", "polling"],
    });

    state.socket = socket;
    state.socketBaseUrl = state.baseUrl;
    state.socketUserId = userId;

    socket.on("connect", () => {
      state.socketStatus = "connected";
      addLog("socket:connect", { socketId: socket.id, userId }, "incoming");
      renderStatus();

      if (state.activeConversation) {
        joinConversation(activeConversationId(), { announce: false });
      }

      if (notify) {
        setFlash("Socket connected.", "success");
      }
    });

    socket.on("disconnect", (reason) => {
      state.socketStatus = "offline";
      state.joinedConversationId = "";
      addLog("socket:disconnect", { reason }, "system");
      renderStatus();
    });

    socket.on("connect_error", (error) => {
      state.socketStatus = "error";
      addLog("socket:connect_error", { message: error.message }, "error");
      renderStatus();
      setFlash(error.message || "Socket connection failed.", "error");
    });

    socket.on("receiveMessage", (message) => {
      registerMessageUsers(message);
      addLog("receiveMessage", message, "incoming");
      handleIncomingMessage(message);
    });

    socket.on("userTyping", (payload) => {
      state.remoteTyping = payload;
      addLog("userTyping", payload, "incoming");
      renderTypingIndicator();
    });

    socket.on("userOnline", (payload) => {
      if (payload && payload.userId) {
        state.presenceByUserId[payload.userId] = {
          isOnline: true,
          lastSeen: payload.lastSeen || null,
        };
      }
      addLog("userOnline", payload, "incoming");
      renderConversations();
      renderChatHeader();
    });

    socket.on("userOffline", (payload) => {
      if (payload && payload.userId) {
        state.presenceByUserId[payload.userId] = {
          isOnline: false,
          lastSeen: payload.lastSeen || null,
        };
      }
      addLog("userOffline", payload, "incoming");
      renderConversations();
      renderChatHeader();
    });

    socket.on("messageSeen", (payload) => {
      addLog("messageSeen", payload, "incoming");
      if (payload && payload.messageId) {
        state.messages = state.messages.map((message) => {
          if (messageIdOf(message) !== payload.messageId) {
            return message;
          }
          return {
            ...message,
            isRead: true,
            readAt: payload.readAt || new Date().toISOString(),
          };
        });
        renderMessages();
      }
    });

    socket.on("messageError", (payload) => {
      addLog("messageError", payload, "error");
      setFlash(payload && payload.error ? payload.error : "Socket message error.", "error");
    });
  }

  function teardownSocket({ manual = false, silent = false } = {}) {
    if (!state.socket) {
      state.socketStatus = "offline";
      renderStatus();
      return;
    }

    try {
      if (manual && state.joinedConversationId) {
        state.socket.emit("leaveConversation", state.joinedConversationId);
      }

      state.socket.removeAllListeners();
      state.socket.disconnect();
    } catch (error) {
      // Ignore teardown errors in the browser client.
    }

    state.socket = null;
    state.socketStatus = "offline";
    state.socketBaseUrl = "";
    state.socketUserId = "";
    state.joinedConversationId = "";
    renderStatus();

    if (manual && !silent) {
      addLog("socket:manual_disconnect", {}, "system");
      setFlash("Socket disconnected.", "info");
    }
  }

  function joinConversation(conversationId, { announce = true } = {}) {
    if (!conversationId) {
      return;
    }

    if (!state.socket) {
      connectSocket({ notify: false });
    }

    if (!state.socket) {
      setFlash("Socket is unavailable. Connect it first.", "error");
      return;
    }

    if (state.joinedConversationId && state.joinedConversationId !== conversationId) {
      state.socket.emit("leaveConversation", state.joinedConversationId);
      addLog("emit:leaveConversation", state.joinedConversationId, "outgoing");
    }

    state.socket.emit("joinConversation", conversationId);
    state.joinedConversationId = conversationId;
    addLog("emit:joinConversation", conversationId, "outgoing");
    renderStatus();
    renderConversations();

    if (announce) {
      setFlash(`Joined room ${conversationId}.`, "success");
    }
  }

  function leaveActiveConversation() {
    if (!state.socket || !state.joinedConversationId) {
      setFlash("No joined room is active.", "info");
      return;
    }

    stopTypingNow();
    state.socket.emit("leaveConversation", state.joinedConversationId);
    addLog("emit:leaveConversation", state.joinedConversationId, "outgoing");
    state.joinedConversationId = "";
    renderStatus();
    renderConversations();
    setFlash("Left the active room.", "info");
  }

  function handleComposerInput() {
    emitTypingState(true);
    stopTypingSoon();
  }

  function stopTypingSoon() {
    clearTimeout(state.typingTimer);
    state.typingTimer = window.setTimeout(() => {
      emitTypingState(false);
    }, 900);
  }

  function stopTypingNow() {
    clearTimeout(state.typingTimer);
    state.typingTimer = null;
    emitTypingState(false, { force: true });
  }

  function emitTypingState(isTyping, { force = false } = {}) {
    const conversationId = activeConversationId();
    if (!conversationId || !state.socket) {
      return;
    }

    if (!force && state.localTypingActive === isTyping) {
      return;
    }

    state.localTypingActive = isTyping;
    const payload = { conversationId, isTyping };
    state.socket.emit("typing", payload);
    addLog("emit:typing", payload, "outgoing");
  }

  async function handleSendMessage(event) {
    event.preventDefault();

    const conversationId = activeConversationId();
    if (!conversationId) {
      setFlash("Select a conversation before sending.", "error");
      return;
    }

    if (!state.currentUser || !state.token) {
      setFlash("Login or attach a token before sending.", "error");
      return;
    }

    if (!state.socket) {
      connectSocket({ notify: false });
    }

    if (!state.socket) {
      setFlash("Socket is unavailable. Connect it first.", "error");
      return;
    }

    const content = dom.messageInput.value.trim();
    const file = dom.fileInput.files && dom.fileInput.files[0];

    if (!content && !file) {
      setFlash("Enter a message or attach a file.", "error");
      return;
    }

    state.isSendingMessage = true;
    renderComposerState();

    try {
      if (state.joinedConversationId !== conversationId) {
        joinConversation(conversationId, { announce: false });
      }

      let payload;

      if (file) {
        const upload = await uploadFileForSocket(conversationId, file);
        payload = {
          sender: currentUserId(),
          conversationId,
          content: content || undefined,
          messageType: upload.fileTypeCategory === "image" ? "image" : "file",
          mediaUrl: upload.url,
          mediaKey: upload.key,
          fileName: upload.originalName,
          fileSize: upload.size,
          mimeType: upload.mimeType,
        };
      } else {
        payload = {
          sender: currentUserId(),
          conversationId,
          content,
          messageType: "text",
        };
      }

      state.socket.emit("sendMessage", payload);
      addLog("emit:sendMessage", payload, "outgoing");

      clearComposer({ keepFlash: true });
      stopTypingNow();
      setFlash("Message emitted. Waiting for receiveMessage from the server.", "success");
    } catch (error) {
      setFlash(error.message || "Unable to send the message.", "error");
    } finally {
      state.isSendingMessage = false;
      renderComposerState();
    }
  }

  async function uploadFileForSocket(conversationId, file) {
    const isImage = file.type.startsWith("image/");
    const formData = new FormData();
    formData.append(isImage ? "image" : "file", file);
    formData.append("conversationId", conversationId);

    const endpoint = isImage ? "/api/upload/chat-image" : "/api/upload/chat-file";
    const response = await api(endpoint, {
      method: "POST",
      body: formData,
    });

    return extractData(response);
  }

  function clearComposer({ keepFlash = false } = {}) {
    dom.messageInput.value = "";
    dom.fileInput.value = "";
    renderComposerState();
    if (!keepFlash) {
      setFlash("Composer cleared.", "info");
    }
  }

  function handleMessageListClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }

    const messageId = button.getAttribute("data-message-id") || "";
    if (!messageId) {
      return;
    }

    dom.seenMessageInput.value = messageId;
    renderStatus();

    const action = button.getAttribute("data-action");
    if (action === "mark-seen") {
      emitSeenMessage(messageId);
    }
  }

  function emitSeenMessage(messageId) {
    if (!messageId) {
      setFlash("Enter or select a message ID first.", "error");
      return;
    }

    if (!state.socket || !state.currentUser) {
      setFlash("Load a session and connect the socket first.", "error");
      return;
    }

    const payload = {
      messageId,
      userId: currentUserId(),
    };

    state.socket.emit("seenMessage", payload);
    addLog("emit:seenMessage", payload, "outgoing");
    setFlash(`seenMessage emitted for ${messageId}.`, "success");
  }

  function handleIncomingMessage(message) {
    const conversationId = message.conversationId;
    upsertConversationFromMessage(message);

    if (conversationId !== activeConversationId()) {
      renderConversations();
      return;
    }

    upsertMessage(message);
    renderMessages();

    if (!isSelfMessage(message) && dom.autoSeenCheckbox.checked) {
      window.setTimeout(() => {
        if (activeConversationId() === conversationId) {
          emitSeenMessage(messageIdOf(message));
        }
      }, 350);
    }
  }

  function upsertMessage(message) {
    const id = messageIdOf(message);
    const index = state.messages.findIndex((item) => messageIdOf(item) === id);
    if (index === -1) {
      state.messages.push(message);
      return;
    }
    state.messages[index] = {
      ...state.messages[index],
      ...message,
    };
  }

  function upsertConversationFromMessage(message) {
    const id = message.conversationId;
    const preview = message.content || (message.messageType === "image" ? "Image" : "File");
    const existing = state.conversations.find((conversation) => conversationIdOf(conversation) === id);

    if (!existing) {
      loadConversations();
      return;
    }

    existing.lastMessage = preview;
    existing.lastMessageTime = message.timestamp || message.createdAt || new Date().toISOString();
    state.conversations = sortConversations(state.conversations);

    if (activeConversationId() === id) {
      state.activeConversation = existing;
      renderChatHeader();
    }

    renderConversations();
  }

  async function api(path, { method = "GET", body, headers = {}, authOptional = false } = {}) {
    const url = new URL(path, `${state.baseUrl}/`).toString();
    const requestHeaders = { ...headers };
    const isFormData = body instanceof FormData;

    if (state.token) {
      requestHeaders.Authorization = `Bearer ${state.token}`;
    } else if (!authOptional) {
      throw new Error("No token is available.");
    }

    if (!isFormData && body !== undefined && !requestHeaders["Content-Type"]) {
      requestHeaders["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    });

    const text = await response.text();
    const data = text ? safeParse(text, text) : {};

    if (!response.ok) {
      const message =
        (data && typeof data === "object" && (data.message || (data.error && data.error.message) || data.error)) ||
        response.statusText ||
        "Request failed";
      throw new Error(String(message));
    }

    return data;
  }

  function addLog(kind, payload, tone = "system") {
    state.eventLog.unshift({
      kind,
      payload,
      tone,
      at: new Date().toISOString(),
    });
    state.eventLog = state.eventLog.slice(0, 80);
    renderEventLog();
  }

  function setFlash(message, tone = "info") {
    clearTimeout(state.flashTimer);
    dom.flash.hidden = false;
    dom.flash.className = `flash flash-${tone}`;
    dom.flash.textContent = message;

    state.flashTimer = window.setTimeout(() => {
      dom.flash.hidden = true;
    }, 3400);
  }

  function persistSession() {
    localStorage.setItem(STORAGE_KEYS.baseUrl, state.baseUrl);

    if (state.token) {
      localStorage.setItem(STORAGE_KEYS.token, state.token);
      dom.tokenInput.value = state.token;
    } else {
      localStorage.removeItem(STORAGE_KEYS.token);
    }

    if (state.currentUser) {
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(state.currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.user);
    }
  }

  function rememberUser(candidate) {
    if (!candidate || typeof candidate === "string") {
      return;
    }

    const id = userIdOf(candidate);
    if (!id) {
      return;
    }

    const existing = state.userDirectory.get(id) || {};
    state.userDirectory.set(id, { ...existing, ...candidate });
  }

  function registerConversationUsers(conversation) {
    if (!conversation || !Array.isArray(conversation.participants)) {
      return;
    }
    conversation.participants.forEach(rememberUser);
  }

  function registerMessageUsers(message) {
    if (!message) {
      return;
    }
    rememberUser(message.senderId);
  }

  function currentUserId() {
    return userIdOf(state.currentUser);
  }

  function activeConversationId() {
    return state.activeConversation ? conversationIdOf(state.activeConversation) : "";
  }

  function labelUserById(userId) {
    if (!userId) {
      return "Unknown user";
    }
    if (currentUserId() === userId) {
      return "You";
    }
    const user = state.userDirectory.get(userId);
    return user ? displayName(user) : shortId(userId);
  }

  function conversationTitle(conversation) {
    const others = otherParticipants(conversation);
    if (!others.length) {
      return "Conversation";
    }
    return others.map(displayName).join(", ");
  }

  function conversationMeta(conversation) {
    const others = otherParticipants(conversation);
    if (!others.length) {
      return "No other participant details are loaded.";
    }

    return others
      .map((participant) => {
        const id = userIdOf(participant);
        const presence = state.presenceByUserId[id];
        if (presence && presence.isOnline) {
          return `${displayName(participant)} online`;
        }
        if (presence && presence.lastSeen) {
          return `${displayName(participant)} last seen ${formatDateTime(presence.lastSeen)}`;
        }
        return `${displayName(participant)} offline`;
      })
      .join(" · ");
  }

  function conversationPresence(conversation) {
    const others = otherParticipants(conversation);
    if (!others.length) {
      return null;
    }

    const online = others.some((participant) => {
      const presence = state.presenceByUserId[userIdOf(participant)];
      return Boolean(presence && presence.isOnline);
    });

    return online
      ? { label: "online", className: "presence-pill presence-pill-online" }
      : { label: "offline", className: "presence-pill presence-pill-offline" };
  }

  function otherParticipants(conversation) {
    const userId = currentUserId();
    const participants = Array.isArray(conversation && conversation.participants) ? conversation.participants : [];
    return participants.filter((participant) => userIdOf(participant) !== userId);
  }

  function messagePreview(conversation) {
    return conversation.lastMessage || "No messages yet.";
  }

  function isSelfMessage(message) {
    return userIdOf(message.senderId) === currentUserId();
  }

  function conversationIdOf(conversation) {
    return (conversation && (conversation._id || conversation.id)) || "";
  }

  function messageIdOf(message) {
    return (message && (message._id || message.id)) || "";
  }

  function displayName(user) {
    if (!user) {
      return "Unknown user";
    }
    if (typeof user === "string") {
      return shortId(user);
    }
    return user.name || user.username || user.email || shortId(userIdOf(user));
  }

  function parseParticipantIds(input) {
    return [...new Set(input.split(",").map((item) => item.trim()).filter(Boolean))];
  }

  function normalizeBaseUrl(value) {
    const trimmed = (value || "").trim();
    if (!trimmed) {
      return DEFAULT_BASE_URL;
    }
    return trimmed.replace(/\/+$/, "");
  }

  function sortConversations(conversations) {
    return [...conversations].sort((left, right) => {
      const leftDate = new Date(left.lastMessageTime || left.updatedAt || left.createdAt || 0).getTime();
      const rightDate = new Date(right.lastMessageTime || right.updatedAt || right.createdAt || 0).getTime();
      return rightDate - leftDate;
    });
  }

  function extractData(response) {
    if (response && typeof response === "object" && "data" in response) {
      return response.data;
    }
    return response;
  }

  function safeParse(value, fallback) {
    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  function safeStringify(value) {
    try {
      return JSON.stringify(value, null, 2);
    } catch (error) {
      return String(value);
    }
  }

  function shortId(value) {
    if (!value) {
      return "n/a";
    }
    return value.length <= 12 ? value : `${value.slice(0, 6)}...${value.slice(-4)}`;
  }

  function shortToken(token) {
    if (!token) {
      return "n/a";
    }
    return token.length <= 18 ? token : `${token.slice(0, 10)}...${token.slice(-6)}`;
  }

  function formatDateTime(value) {
    if (!value) {
      return "n/a";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function formatBytes(value) {
    if (!value && value !== 0) {
      return "";
    }
    if (value < 1024) {
      return `${value} B`;
    }
    if (value < 1024 * 1024) {
      return `${(value / 1024).toFixed(1)} KB`;
    }
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  function userIdOf(candidate) {
    if (!candidate) {
      return "";
    }
    if (typeof candidate === "string") {
      return candidate;
    }
    return candidate._id || candidate.id || "";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
