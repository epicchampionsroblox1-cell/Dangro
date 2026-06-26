document.addEventListener("DOMContentLoaded", () => {
  let state = loadState();
  let currentUser = null;
  let replyTarget = null;
  let callInterval = null;
  let callStartTime = null;
  let localStream = null;
  let remoteStream = null;
  let isMicMuted = false;
  let isVideoOff = false;
  let isScreenSharing = false;
  let isVolumeMuted = false;
  let callParticipants = ["You"];
  let callActive = false;

  let LOGIN_CREDENTIALS = { username: "admin", password: "admin" };

  function loadState() {
    const localData = localStorage.getItem("dangro_state_v2");
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        return {
          servers: parsed.servers || JSON.parse(JSON.stringify(DANGRO_MOCK_DATA.servers)),
          friends: parsed.friends || JSON.parse(JSON.stringify(DANGRO_MOCK_DATA.friends)),
          messages: parsed.messages || JSON.parse(JSON.stringify(DANGRO_MOCK_DATA.initialMessages)),
          youtubeVideos: parsed.youtubeVideos || DANGRO_MOCK_DATA.youtubeVideos,
          instagramPosts: parsed.instagramPosts || DANGRO_MOCK_DATA.instagramPosts,
          groupChats: parsed.groupChats || [],
          leftPanelWidth: parsed.leftPanelWidth || 25,
          rightPanelWidth: parsed.rightPanelWidth || 18.75,
          leftPanelCollapsed: !!parsed.leftPanelCollapsed,
          rightPanelCollapsed: !!parsed.rightPanelCollapsed,
          activeChatType: parsed.activeChatType || "channel",
          activeServerId: parsed.activeServerId || "dangro-hq",
          activeChannelId: parsed.activeChannelId || "general",
          activeDmFriendId: parsed.activeDmFriendId || null,
          activeGroupChatId: parsed.activeGroupChatId || null,
          activeLeftTab: parsed.activeLeftTab || "youtube-client",
          activeFriendSubtab: parsed.activeFriendSubtab || "online",
          activeNavTab: parsed.activeNavTab || "servers",
          friendSearchQuery: parsed.friendSearchQuery || "",
          chatSearchQuery: parsed.chatSearchQuery || "",
          activeYtVideoId: parsed.activeYtVideoId || "dQw4w9WgXcQ",
          profilePic: parsed.profilePic || "",
          displayName: parsed.displayName || "You",
          bio: parsed.bio || "",
          status: parsed.status || "online",
          customStatus: parsed.customStatus || ""
        };
      } catch (e) {
        console.error("Error parsing state", e);
        return getDefaultState();
      }
    }
    return getDefaultState();
  }

  function getDefaultState() {
    return {
      servers: JSON.parse(JSON.stringify(DANGRO_MOCK_DATA.servers)),
      friends: JSON.parse(JSON.stringify(DANGRO_MOCK_DATA.friends)),
      messages: JSON.parse(JSON.stringify(DANGRO_MOCK_DATA.initialMessages)),
      youtubeVideos: DANGRO_MOCK_DATA.youtubeVideos,
      instagramPosts: DANGRO_MOCK_DATA.instagramPosts,
      groupChats: [],
      leftPanelWidth: 25,
      rightPanelWidth: 18.75,
      leftPanelCollapsed: false,
      rightPanelCollapsed: false,
      activeChatType: "channel",
      activeServerId: "dangro-hq",
      activeChannelId: "general",
      activeDmFriendId: null,
      activeGroupChatId: null,
      activeLeftTab: "youtube-client",
      activeFriendSubtab: "online",
      activeNavTab: "servers",
      friendSearchQuery: "",
      chatSearchQuery: "",
      activeYtVideoId: "dQw4w9WgXcQ",
      profilePic: "",
      displayName: "You",
      bio: "",
      status: "online",
      customStatus: ""
    };
  }

  function saveState() {
    localStorage.setItem("dangro_state_v2", JSON.stringify({
      servers: state.servers,
      friends: state.friends,
      messages: state.messages,
      youtubeVideos: state.youtubeVideos,
      instagramPosts: state.instagramPosts,
      groupChats: state.groupChats,
      leftPanelWidth: state.leftPanelWidth,
      rightPanelWidth: state.rightPanelWidth,
      leftPanelCollapsed: state.leftPanelCollapsed,
      rightPanelCollapsed: state.rightPanelCollapsed,
      activeChatType: state.activeChatType,
      activeServerId: state.activeServerId,
      activeChannelId: state.activeChannelId,
      activeDmFriendId: state.activeDmFriendId,
      activeGroupChatId: state.activeGroupChatId,
      activeLeftTab: state.activeLeftTab,
      activeFriendSubtab: state.activeFriendSubtab,
      activeNavTab: state.activeNavTab,
      friendSearchQuery: state.friendSearchQuery,
      chatSearchQuery: state.chatSearchQuery,
      activeYtVideoId: state.activeYtVideoId,
      profilePic: state.profilePic,
      displayName: state.displayName,
      bio: state.bio,
      status: state.status,
      customStatus: state.customStatus
    }));
  }

  function loadSession() {
    const session = localStorage.getItem("dangro_session");
    if (session) {
      try {
        const parsed = JSON.parse(session);
        if (parsed.loggedIn) {
          currentUser = parsed;
          return true;
        }
      } catch (e) {}
    }
    return false;
  }

  function saveSession(user) {
    localStorage.setItem("dangro_session", JSON.stringify({ loggedIn: true, username: user.username, timestamp: Date.now() }));
  }

  function clearSession() {
    localStorage.removeItem("dangro_session");
    currentUser = null;
  }

  function showToast(message, type) {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = "toast toast-"+type;
    let icon = "⚡";
    if (type === "success") icon = "✓";
    if (type === "error") icon = "✕";
    toast.innerHTML = '<span class="toast-icon">'+icon+'</span><div class="toast-msg">'+message+'</div>';
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("fade-out");
      toast.addEventListener("animationend", () => toast.remove());
    }, 3200);
  }

  /* ============ LOGIN SYSTEM ============ */
  if (loadSession()) {
    document.getElementById("login-screen").classList.add("hidden");
    document.getElementById("app-container").classList.remove("hidden");
    initApp();
  } else {
    document.getElementById("login-screen").classList.remove("hidden");
    document.getElementById("app-container").classList.add("hidden");
    setupLogin();
  }

  function setupLogin() {
    const loginBtn = document.getElementById("btn-login");
    const loginGuestBtn = document.getElementById("btn-login-guest");
    const usernameInput = document.getElementById("login-username");
    const passwordInput = document.getElementById("login-password");
    const loginError = document.getElementById("login-error");

    loginBtn.addEventListener("click", () => {
      const user = usernameInput.value.trim();
      const pass = passwordInput.value.trim();
      if (user === LOGIN_CREDENTIALS.username && pass === LOGIN_CREDENTIALS.password) {
        loginError.classList.add("hidden");
        saveSession({ username: user });
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("app-container").classList.remove("hidden");
        initApp();
      } else {
        loginError.classList.remove("hidden");
      }
    });

    loginGuestBtn.addEventListener("click", () => {
      saveSession({ username: "guest" });
      document.getElementById("login-screen").classList.add("hidden");
      document.getElementById("app-container").classList.remove("hidden");
      initApp();
    });

    [usernameInput, passwordInput].forEach(inp => {
      inp.addEventListener("keypress", (e) => {
        if (e.key === "Enter") loginBtn.click();
      });
    });
  }

  /* ============ LOGOUT ============ */
  document.getElementById("btn-logout").addEventListener("click", () => {
    if (confirm("Are you sure you want to log out?")) {
      stopCall();
      clearSession();
      state = getDefaultState();
      localStorage.removeItem("dangro_state_v2");
      document.getElementById("app-container").classList.add("hidden");
      document.getElementById("login-screen").classList.remove("hidden");
      document.getElementById("login-username").value = "";
      document.getElementById("login-password").value = "";
      document.getElementById("settings-panel").classList.add("hidden");
      showToast("Logged out successfully", "info");
    }
  });

  /* ============ INIT APP ============ */
  function initApp() {
    initLayout();
    initTopNav();
    initPanels();
    initChat();
    initServers();
    initFriends();
    initSettings();
    initCall();
    initYT();
    initIG();
    initBrowser();
    renderAll();
  }

  /* ============ LAYOUT ============ */
  function initLayout() {
    const lw = state.leftPanelCollapsed ? 0 : state.leftPanelWidth;
    const rw = state.rightPanelCollapsed ? 0 : state.rightPanelWidth;
    const mw = 100 - lw - rw;
    document.querySelector(".main-content-area").style.setProperty("--left-width", lw+"%");
    document.querySelector(".main-content-area").style.setProperty("--right-width", rw+"%");
    document.querySelector(".main-content-area").style.setProperty("--middle-width", mw+"%");

    document.getElementById("left-panel").classList.toggle("collapsed", state.leftPanelCollapsed);
    document.getElementById("btn-collapse-left").classList.toggle("hidden", state.leftPanelCollapsed);
    document.getElementById("btn-expand-left").classList.toggle("hidden", !state.leftPanelCollapsed);

    document.getElementById("right-panel").classList.toggle("collapsed", state.rightPanelCollapsed);
    document.getElementById("btn-collapse-right").classList.toggle("hidden", state.rightPanelCollapsed);
    document.getElementById("btn-expand-right").classList.toggle("hidden", !state.rightPanelCollapsed);
  }

  let isDraggingLeft = false, isDraggingRight = false;

  document.getElementById("divider-left").addEventListener("mousedown", (e) => {
    if (e.target.closest(".divider-arrow")) return;
    isDraggingLeft = true;
    document.getElementById("divider-left").classList.add("dragging");
    document.body.style.cursor = "col-resize";
  });

  document.getElementById("divider-right").addEventListener("mousedown", (e) => {
    if (e.target.closest(".divider-arrow")) return;
    isDraggingRight = true;
    document.getElementById("divider-right").classList.add("dragging");
    document.body.style.cursor = "col-resize";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDraggingLeft && !isDraggingRight) return;
    e.preventDefault();
    const sw = window.innerWidth;
    const mx = e.clientX;

    if (isDraggingLeft) {
      let np = (mx / sw) * 100;
      if (np < 12) {
        state.leftPanelCollapsed = true; isDraggingLeft = false;
        document.getElementById("divider-left").classList.remove("dragging");
        saveState(); initLayout(); return;
      } else { state.leftPanelCollapsed = false; if (np > 45) np = 45; state.leftPanelWidth = np; }
    }
    if (isDraggingRight) {
      let np = ((sw - mx) / sw) * 100;
      if (np < 12) {
        state.rightPanelCollapsed = true; isDraggingRight = false;
        document.getElementById("divider-right").classList.remove("dragging");
        saveState(); initLayout(); return;
      } else { state.rightPanelCollapsed = false; if (np > 40) np = 40; state.rightPanelWidth = np; }
    }
    initLayout();
  });

  document.addEventListener("mouseup", () => {
    if (isDraggingLeft || isDraggingRight) {
      isDraggingLeft = false; isDraggingRight = false;
      document.getElementById("divider-left").classList.remove("dragging");
      document.getElementById("divider-right").classList.remove("dragging");
      document.body.style.cursor = "default";
      saveState();
    }
  });

  document.getElementById("btn-collapse-left").addEventListener("click", () => { state.leftPanelCollapsed = true; saveState(); initLayout(); });
  document.getElementById("btn-expand-left").addEventListener("click", () => { state.leftPanelCollapsed = false; saveState(); initLayout(); });
  document.getElementById("btn-collapse-right").addEventListener("click", () => { state.rightPanelCollapsed = true; saveState(); initLayout(); });
  document.getElementById("btn-expand-right").addEventListener("click", () => { state.rightPanelCollapsed = false; saveState(); initLayout(); });

  /* ============ TOP NAV ============ */
  function initTopNav() {
    document.querySelectorAll(".top-nav-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const nav = btn.getAttribute("data-nav");
        state.activeNavTab = nav;
        document.querySelectorAll(".top-nav-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        document.querySelectorAll(".right-view").forEach(v => v.classList.remove("active"));
        document.getElementById("right-"+nav+"-view").classList.add("active");
        if (nav === "dms") renderFriendsList();
        if (nav === "groupchats") renderGroupChats();
        if (nav === "servers") { renderServers(); renderChannels(); }
      });
    });
    document.getElementById("right-"+state.activeNavTab+"-view").classList.add("active");
    document.getElementById("right-dms-view").classList.toggle("active", state.activeNavTab === "dms");
    document.getElementById("right-servers-view").classList.toggle("active", state.activeNavTab === "servers");
    document.getElementById("right-groupchats-view").classList.toggle("active", state.activeNavTab === "groupchats");
    document.querySelectorAll(".top-nav-btn").forEach(b => {
      b.classList.toggle("active", b.getAttribute("data-nav") === state.activeNavTab);
    });
  }

  /* ============ LEFT PANEL TABS ============ */
  function initPanels() {
    document.querySelectorAll(".panel-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const tabId = btn.getAttribute("data-tab");
        state.activeLeftTab = tabId;
        document.querySelectorAll(".panel-tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        document.querySelectorAll(".tab-content").forEach(c => { c.classList.remove("active"); if (c.id === tabId) c.classList.add("active"); });
        if (tabId === "youtube-client") renderYoutubeFeed();
        if (tabId === "instagram-client") renderInstagramFeed();
      });
    });
    document.querySelectorAll(".tab-content").forEach(c => { c.classList.remove("active"); if (c.id === state.activeLeftTab) c.classList.add("active"); });
    document.querySelectorAll(".panel-tab-btn").forEach(b => b.classList.toggle("active", b.getAttribute("data-tab") === state.activeLeftTab));
  }

  /* ============ YOUTUBE ============ */
  function initYT() {
    const ytPlayer = document.getElementById("yt-player");
    ytPlayer.src = "https://www.youtube.com/embed/"+state.activeYtVideoId;
    const defaultVideo = state.youtubeVideos.find(v => v.id === state.activeYtVideoId);
    if (defaultVideo) {
      document.getElementById("yt-active-title").textContent = defaultVideo.title;
      document.getElementById("yt-active-channel").textContent = defaultVideo.channelName;
      document.getElementById("yt-active-views").textContent = defaultVideo.views;
    }

    document.getElementById("yt-search-btn").addEventListener("click", triggerYtSearch);
    document.getElementById("yt-search-input").addEventListener("keypress", (e) => { if (e.key === "Enter") triggerYtSearch(); });

    document.getElementById("yt-like-btn").addEventListener("click", () => {
      document.getElementById("yt-like-btn").classList.toggle("liked");
    });
  }

  function triggerYtSearch() {
    const query = document.getElementById("yt-search-input").value.trim();
    if (!query) { renderYoutubeFeed(); return; }
    const urlPattern = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = query.match(urlPattern);
    if (match && match[1]) {
      const videoId = match[1];
      if (!state.youtubeVideos.find(v => v.id === videoId)) {
        state.youtubeVideos.push({ id: videoId, title: "Imported: "+videoId, channelName: "Custom", views: "Stream", likes: "0", thumbnail: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=400&q=80" });
      }
      playYoutubeVideo(videoId);
      renderYoutubeFeed();
    } else {
      renderYoutubeFeed(query);
    }
  }

  function playYoutubeVideo(videoId) {
    state.activeYtVideoId = videoId;
    document.getElementById("yt-player").src = "https://www.youtube.com/embed/"+videoId+"?autoplay=1";
    const video = state.youtubeVideos.find(v => v.id === videoId);
    if (video) {
      document.getElementById("yt-active-title").textContent = video.title;
      document.getElementById("yt-active-channel").textContent = video.channelName;
      document.getElementById("yt-active-views").textContent = video.views;
    }
  }

  function renderYoutubeFeed(filterQuery) {
    const container = document.getElementById("yt-recommendations");
    container.innerHTML = "";
    let filtered = state.youtubeVideos;
    if (filterQuery) filtered = state.youtubeVideos.filter(v => v.title.toLowerCase().includes(filterQuery.toLowerCase()) || v.channelName.toLowerCase().includes(filterQuery.toLowerCase()));
    if (!filtered.length) { container.innerHTML = '<div style="padding:10px;font-size:0.75rem;color:var(--text-muted);">No videos found.</div>'; return; }
    filtered.forEach(video => {
      const card = document.createElement("div");
      card.className = "yt-video-card";
      card.innerHTML = '<div class="yt-card-thumbnail" style="background-image:url('+video.thumbnail+')"></div><div class="yt-card-info"><div class="yt-card-title">'+video.title+'</div><div class="yt-card-chan">'+video.channelName+'</div><div class="yt-card-views">'+video.views+'</div></div>';
      card.addEventListener("click", () => playYoutubeVideo(video.id));
      container.appendChild(card);
    });
  }

  /* ============ INSTAGRAM ============ */
  function initIG() {
    renderInstagramFeed();
  }

  function renderInstagramFeed() {
    const container = document.getElementById("ig-feed-container");
    container.innerHTML = "";
    state.instagramPosts.forEach(post => {
      const card = document.createElement("div");
      card.className = "ig-post-card";
      let commentsHTML = post.comments.map(c => '<div class="ig-comment-item"><span class="commenter">'+c.username+'</span>'+c.text+'</div>').join("");
      card.innerHTML = '<div class="ig-post-header"><div class="user-avatar-small" style="background-color:'+post.userAvatarColor+'">'+post.username.charAt(0).toUpperCase()+'</div><span class="ig-post-author">'+post.username+'</span></div><div class="ig-post-image" style="background-image:url('+post.image+')"></div><div class="ig-post-actions"><button class="ig-action-btn '+(post.liked?'liked':'')+'" data-post-id="'+post.id+'"><span>'+(post.liked?'❤️':'🤍')+'</span></button><button class="ig-action-btn ig-comment-focus-btn"><span>💬</span></button></div><div class="ig-post-likes">'+post.likes.toLocaleString()+' likes</div><div class="ig-post-caption"><span class="author">'+post.username+'</span>'+post.caption+'</div><div class="ig-comments-box"><div class="ig-comments-list">'+commentsHTML+'</div><div class="ig-add-comment"><input type="text" placeholder="Add a comment..." class="ig-comment-input"><button class="ig-post-comment-btn" data-post-id="'+post.id+'">Post</button></div></div>';
      card.querySelector('.ig-action-btn[data-post-id="'+post.id+'"]').addEventListener("click", () => {
        post.liked = !post.liked; post.likes += post.liked ? 1 : -1; saveState(); renderInstagramFeed();
      });
      card.querySelector(".ig-comment-focus-btn").addEventListener("click", () => { card.querySelector(".ig-comment-input").focus(); });
      card.querySelector(".ig-post-comment-btn").addEventListener("click", () => {
        const inp = card.querySelector(".ig-comment-input"); const text = inp.value.trim();
        if (text) { post.comments.push({ username: "dangro_user", text: text }); inp.value = ""; saveState(); renderInstagramFeed(); }
      });
      container.appendChild(card);
    });
  }

  /* ============ BROWSER ============ */
  let browserHistory = ["https://wikipedia.org"];
  let browserHistoryIndex = 0;

  function initBrowser() {
    loadBrowserUrl("https://wikipedia.org");
    document.getElementById("browser-go-btn").addEventListener("click", () => {
      const url = document.getElementById("browser-url-input").value.trim();
      if (url) { browserHistory = browserHistory.slice(0, browserHistoryIndex+1); browserHistory.push(url); browserHistoryIndex = browserHistory.length-1; loadBrowserUrl(url); }
    });
    document.getElementById("browser-url-input").addEventListener("keypress", (e) => { if (e.key === "Enter") document.getElementById("browser-go-btn").click(); });
    document.getElementById("browser-back").addEventListener("click", () => { if (browserHistoryIndex > 0) { browserHistoryIndex--; loadBrowserUrl(browserHistory[browserHistoryIndex]); } });
    document.getElementById("browser-forward").addEventListener("click", () => { if (browserHistoryIndex < browserHistory.length-1) { browserHistoryIndex++; loadBrowserUrl(browserHistory[browserHistoryIndex]); } });
    document.getElementById("browser-refresh").addEventListener("click", () => { document.getElementById("browser-iframe").src = document.getElementById("browser-iframe").src; });
    document.getElementById("close-warning-btn").addEventListener("click", () => { document.getElementById("browser-csp-warning").classList.add("hidden"); });
  }

  function loadBrowserUrl(url) {
    if (!url.startsWith("http://") && !url.startsWith("https://")) url = "https://"+url;
    document.getElementById("browser-url-input").value = url;
    document.getElementById("browser-iframe").src = url;
    const blocked = ["google.com","youtube.com","instagram.com","facebook.com","github.com","discord.com","twitter.com","x.com"];
    document.getElementById("browser-csp-warning").classList.toggle("hidden", !blocked.some(d => url.toLowerCase().includes(d)));
  }

  /* ============ CHAT SYSTEM ============ */
  let msgReplyTarget = null;

  function initChat() {
    document.getElementById("btn-send-message").addEventListener("click", sendMessage);
    document.getElementById("message-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    document.getElementById("message-input").addEventListener("input", function() {
      this.style.height = "auto"; this.style.height = this.scrollHeight+"px";
    });
    document.getElementById("chat-search-input").addEventListener("input", () => {
      state.chatSearchQuery = document.getElementById("chat-search-input").value; renderChat();
    });
    document.getElementById("btn-clear-chat").addEventListener("click", () => {
      if (confirm("Clear chat history?")) { state.messages[getActiveChatKey()] = []; saveState(); renderChat(); }
    });
    document.getElementById("btn-attach").addEventListener("click", () => { document.getElementById("media-modal").classList.remove("hidden"); });
    document.getElementById("btn-media-cancel").addEventListener("click", () => { document.getElementById("media-modal").classList.add("hidden"); });
    document.getElementById("btn-media-submit").addEventListener("click", () => {
      const url = document.getElementById("media-url-input").value.trim();
      if (url) {
        const key = getActiveChatKey();
        if (!state.messages[key]) state.messages[key] = [];
        state.messages[key].push({ id: "msg_"+Date.now(), sender: state.displayName, content: url, isImage: true, timestamp: getTimestampString(), reactions: {}, replyTo: null });
        saveState(); renderChat(); document.getElementById("media-modal").classList.add("hidden");
        triggerMockReply(key, "Sent an image");
      }
    });
    document.getElementById("btn-cancel-reply").addEventListener("click", cancelReply);
    initEmojiPicker();
  }

  function getActiveChatKey() {
    if (state.activeChatType === "channel") return state.activeServerId+"_"+state.activeChannelId;
    if (state.activeChatType === "dm") return "dm_"+state.activeDmFriendId;
    if (state.activeChatType === "group") return "group_"+state.activeGroupChatId;
    return state.activeServerId+"_"+state.activeChannelId;
  }

  function getTimestampString() {
    const now = new Date();
    let h = now.getHours();
    const m = now.getMinutes().toString().padStart(2,"0");
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return "Today at "+h+":"+m+" "+ampm;
  }

  function sendMessage() {
    const content = document.getElementById("message-input").value.trim();
    if (!content) return;
    const key = getActiveChatKey();
    if (!state.messages[key]) state.messages[key] = [];
    const msg = { id: "msg_"+Date.now()+"_"+Math.floor(Math.random()*1000), sender: state.displayName, content: content, timestamp: getTimestampString(), reactions: {}, replyTo: msgReplyTarget ? { sender: msgReplyTarget.sender, content: msgReplyTarget.content } : null };
    state.messages[key].push(msg);
    document.getElementById("message-input").value = "";
    document.getElementById("message-input").style.height = "auto";
    cancelReply();
    saveState();
    renderChat();
    triggerMockReply(key, content);
  }

  function cancelReply() {
    msgReplyTarget = null;
    document.getElementById("reply-preview").classList.add("hidden");
  }

  function initEmojiPicker() {
    const btnEmoji = document.getElementById("btn-emoji");
    const picker = document.getElementById("emoji-picker");
    btnEmoji.addEventListener("click", (e) => { e.stopPropagation(); picker.classList.toggle("hidden"); if (!picker.classList.contains("hidden")) renderEmojiGrid("smileys"); });
    document.addEventListener("click", (e) => {
      if (!picker.classList.contains("hidden") && !picker.contains(e.target) && e.target !== btnEmoji) picker.classList.add("hidden");
    });

    const emojiCats = {
      smileys: DANGRO_MOCK_DATA.emojis.filter((_,i) => i < 200),
      gestures: DANGRO_MOCK_DATA.emojis.filter(e => ["👍","👎","👊","✊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✌️","🤟","🤘","👌","💪","👋","🤚","🖐️","✋","🖖","👈","👉","👆","👇","☝️","✍️","🤳","💅","🦵","🦶"].includes(e)),
      food: DANGRO_MOCK_DATA.emojis.filter(e => ["🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦","🥬","🥒","🌽","🥕","🥔","🍠","🥐","🍞","🥖","🥨","🧀","🥚","🍳","🥞","🧇","🥓","🥩","🍗","🍖","🌭","🍔","🍟","🍕","🥪","🥙","🌮","🌯","🥘","🍝","🍜","🍲","🍛","🍣","🍱","🥟","🍤","🍙","🍚","🍘","🍥","🍧","🍨","🍦","🥧","🧁","🍰","🎂","🍮","🍭","🍬","🍫","🍿","🍩","🍪","🌰","🥜","☕","🍵","🧃","🥤","🧋","🍺","🍻","🥂","🍷","🥃","🍸","🍹","🍾"].includes(e)),
      nature: DANGRO_MOCK_DATA.emojis.filter(e => ["🌸","💮","🏵️","🌹","🥀","🌺","🌻","🌼","🌷","🌱","🌿","☘️","🍀","🍃","🍂","🍁","🌾","💐","🌲","🌳","🌴","🌵","🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐴","🦄","🐝","🦋","🐌","🐞","🐢","🐍","🦎","🐙","🐠","🐟","🐬","🐳","🐋","🦈","🌞","🌝","🌛","🌜","🌚","🌕","🌖","🌗","🌘","🌑","🌒","🌓","🌔","🌙","🌎","🌍","🌏","⭐","🌟","✨","☀️","🌤️","⛅","🌥️","☁️","🌦️","🌧️","⛈️","🌩️","🌨️","❄️","☃️","⛄","🌊"].includes(e)),
      objects: DANGRO_MOCK_DATA.emojis.filter(e => ["💻","⌨️","🖥️","🖨️","🖱️","🖲️","🕹️","💽","💾","💿","📀","📷","📸","📹","🎥","📞","☎️","📟","📠","📺","📻","⌛","⏳","⏰","🔋","🔌","💡","🔦","🕯️","🗑️","💰","💳","💎","🔧","🔨","🔩","⚙️","🔪","🗡️","⚔️","🛡️","🔮","🔭","🔬","💊","💉","🔑","🗝️","🚪","🪑","🛏️","🛋️","🛁","🚿","📚","📖","📕","📗","📘","📙","📔","📓","✏️","✒️","🖊️","🖌️","🖍️","📝","📎","✂️","📐","📏","🔒","🔓","🔏","🔐","🔑"].includes(e)),
      symbols: DANGRO_MOCK_DATA.emojis.filter(e => ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💕","💞","💗","💖","💘","💝","💟","❣️","💌","💔","🔥","⭐","🌟","✨","💫","🎉","🎊","🎈","🎁","🎀","🏆","🥇","🥈","🥉","🏅","🎯","🎮","🎲","♟️","🎰","🎭","🎨","🎬","🎤","🎧","🎼","🎹","🥁","🎷","🎺","🎸","🎻","🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🚚","🚛","🚜","✈️","🚀","🛸","🏠","🏡","🏢","🏬","🏣","🏤","🏥","🏦","🏪","🏫","🏩","💒","🏛️","⛪","🕌","🕍","🕋","⛩️","🎠","🎡","🎢","🎪"].includes(e)),
      flags: DANGRO_MOCK_DATA.emojis.filter(e => e.length >= 2 && (e.codePointAt(0) >= 127462 && e.codePointAt(0) <= 127487))
    };

    document.querySelectorAll(".emoji-cat-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".emoji-cat-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        renderEmojiGrid(btn.getAttribute("data-cat"));
      });
    });

    document.getElementById("emoji-search-input").addEventListener("input", () => {
      const q = document.getElementById("emoji-search-input").value.trim().toLowerCase();
      if (!q) { renderEmojiGrid(document.querySelector(".emoji-cat-btn.active")?.getAttribute("data-cat") || "smileys"); return; }
      const filtered = DANGRO_MOCK_DATA.emojis.filter(e => e.toLowerCase().includes(q));
      renderEmojiList(filtered);
    });
  }

  function renderEmojiGrid(cat) {
    const cats = { smileys: [], gestures: [], food: [], nature: [], objects: [], symbols: [], flags: [] };
    const all = DANGRO_MOCK_DATA.emojis;
    if (cat === "smileys") cats[cat] = all.filter(e => /[\u{1F600}-\u{1F64F}]/u.test(e) || /[\u{2600}-\u{27BF}]/u.test(e) || all.indexOf(e) < 100);
    else if (cat === "gestures") cats[cat] = all.filter(e => ["👍","👎","👊","✊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✌️","🤟","🤘","👌","💪","👋","🤚","🖐️","✋","🖖","👈","👉","👆","👇","☝️","✍️","🤳","💅","🦵","🦶","👂","👃","👀","👁️","🧠","🦷","🦴","👅","👄"].includes(e));
    else if (cat === "food") cats[cat] = all.filter(e => /[\u{1F32D}-\u{1F37F}]/u.test(e) || /[\u{1F950}-\u{1F96F}]/u.test(e) || /[\u{1F980}-\u{1F9C0}]/u.test(e) || e === "☕" || e === "🍿");
    else if (cat === "nature") cats[cat] = all.filter(e => /[\u{1F300}-\u{1F32F}]/u.test(e) || /[\u{1F330}-\u{1F37F}]/u.test(e) || /[\u{1F400}-\u{1F4FF}]/u.test(e));
    else if (cat === "objects") cats[cat] = all.filter(e => /[\u{1F4A0}-\u{1F4FF}]/u.test(e) || /[\u{1F500}-\u{1F5FF}]/u.test(e) || /[\u{1F600}-\u{1F7FF}]/u.test(e));
    else if (cat === "symbols") cats[cat] = all.filter(e => /[\u{1F300}-\u{1F5FF}]/u.test(e) || /[\u{2600}-\u{27BF}]/u.test(e) || /[\u{1F900}-\u{1F9FF}]/u.test(e) || /[\u{1FA00}-\u{1FA6F}]/u.test(e));
    else cats[cat] = all.slice(0, 50);

    if (!cats[cat].length) cats[cat] = all.slice(0, 100);
    renderEmojiList(cats[cat]);
  }

  function renderEmojiList(list) {
    const container = document.getElementById("emoji-grid-container");
    container.innerHTML = "";
    const visible = list.slice(0, 300);
    visible.forEach(emoji => {
      const el = document.createElement("span");
      el.className = "emoji-item";
      el.textContent = emoji;
      el.addEventListener("click", () => {
        document.getElementById("message-input").value += emoji;
        document.getElementById("message-input").focus();
      });
      container.appendChild(el);
    });
  }

  function renderChat() {
    const container = document.getElementById("chat-messages-container");
    container.innerHTML = "";
    const key = getActiveChatKey();
    const chatList = state.messages[key] || [];
    const query = state.chatSearchQuery.trim().toLowerCase();
    const filtered = query ? chatList.filter(m => m.content.toLowerCase().includes(query) || m.sender.toLowerCase().includes(query)) : chatList;

    if (!filtered.length) {
      container.innerHTML = '<div style="flex-grow:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--text-muted);font-size:0.8rem;padding:20px;"><div style="font-size:2rem;margin-bottom:8px;">💬</div><p>'+(query?'No messages match your search.':'No messages yet.')+'</p></div>';
      return;
    }

    filtered.forEach(msg => {
      const isMe = msg.sender === state.displayName;
      const item = document.createElement("div");
      item.className = "message-item"+(msg.system?" system-msg":"");
      item.setAttribute("data-msg-id", msg.id);

      let avatarChar = msg.system ? "⚙️" : (isMe ? state.displayName.charAt(0).toUpperCase() : msg.sender.charAt(0).toUpperCase());
      let avatarColor = msg.system ? "transparent" : (isMe ? "#ffffff" : "#444444");

      let contentHTML = '<div class="msg-content">'+escapeHtml(msg.content)+'</div>';
      if (msg.isImage || /\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i.test(msg.content) || msg.content.startsWith("https://images.unsplash.com/")) {
        contentHTML = '<div class="msg-content">'+escapeHtml(msg.content)+'</div><div class="msg-image-attachment"><img src="'+escapeHtml(msg.content)+'" alt="Attachment" onerror="this.parentElement.innerHTML=\'<span style=color:#666;font-size:0.7rem;padding:4px;>Image failed to load</span>\'"></div>';
      }

      let replyHTML = "";
      if (msg.replyTo) {
        replyHTML = '<div class="msg-reply-preview"><span class="msg-reply-sender">'+escapeHtml(msg.replyTo.sender)+'</span> <span class="msg-reply-text">'+escapeHtml(msg.replyTo.content.substring(0,80))+'</span></div>';
      }

      let reactionsHTML = "";
      if (msg.reactions && Object.keys(msg.reactions).length > 0) {
        reactionsHTML = '<div class="msg-reactions">';
        for (const [emoji, users] of Object.entries(msg.reactions)) {
          const hasReacted = users.includes(state.displayName);
          reactionsHTML += '<span class="msg-reaction'+(hasReacted?' active':'')+'" data-emoji="'+emoji+'" data-msg-id="'+msg.id+'">'+emoji+' <span class="msg-reaction-count">'+users.length+'</span></span>';
        }
        reactionsHTML += '</div>';
      }

      item.innerHTML = '<div class="msg-avatar" style="background-color:'+avatarColor+(isMe&&!msg.system?';color:#000':'')+'">'+avatarChar+'</div><div class="msg-body"><div class="msg-header"><span class="msg-sender">'+(msg.system?'System':escapeHtml(msg.sender))+'</span><span class="msg-time">'+(msg.timestamp||"")+'</span></div>'+replyHTML+contentHTML+reactionsHTML+'</div>';

      if (!msg.system) {
        const actions = document.createElement("div");
        actions.className = "msg-actions-bar";
        actions.innerHTML = '<button class="msg-action-btn btn-reply" title="Reply">↩️</button><button class="msg-action-btn btn-react" title="React">😀</button>';
        const body = item.querySelector(".msg-body");
        if (body) body.appendChild(actions);

        actions.querySelector(".btn-reply").addEventListener("click", () => startReply(msg));
        actions.querySelector(".btn-react").addEventListener("click", (e) => {
          e.stopPropagation();
          openReactionPicker(msg.id);
        });
      }

      // Handle reaction clicks
      item.querySelectorAll(".msg-reaction").forEach(el => {
        el.addEventListener("click", () => {
          const emoji = el.getAttribute("data-emoji");
          const mid = el.getAttribute("data-msg-id");
          toggleReaction(mid, emoji);
        });
      });

      container.appendChild(item);
    });

    container.scrollTop = container.scrollHeight;
  }

  function escapeHtml(text) {
    const d = document.createElement("div");
    d.textContent = text;
    return d.innerHTML;
  }

  function startReply(msg) {
    msgReplyTarget = { id: msg.id, sender: msg.sender, content: msg.content };
    document.getElementById("reply-target-name").textContent = msg.sender;
    document.getElementById("reply-target-text").textContent = msg.content.substring(0, 100);
    document.getElementById("reply-preview").classList.remove("hidden");
    document.getElementById("message-input").focus();
  }

  function openReactionPicker(msgId) {
    const container = document.getElementById("emoji-grid-container");
    const picker = document.getElementById("emoji-picker");
    const recent = ["👍","❤️","😂","😍","🎉","🔥","👏","🙌","😢","😡"];
    container.innerHTML = "";
    recent.forEach(emoji => {
      const el = document.createElement("span");
      el.className = "emoji-item";
      el.textContent = emoji;
      el.addEventListener("click", () => { toggleReaction(msgId, emoji); picker.classList.add("hidden"); });
      container.appendChild(el);
    });
    picker.classList.remove("hidden");
  }

  function toggleReaction(msgId, emoji) {
    const key = getActiveChatKey();
    const chatList = state.messages[key];
    if (!chatList) return;
    const msg = chatList.find(m => m.id === msgId);
    if (!msg) return;
    if (!msg.reactions) msg.reactions = {};
    if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
    const idx = msg.reactions[emoji].indexOf(state.displayName);
    if (idx > -1) msg.reactions[emoji].splice(idx, 1);
    else msg.reactions[emoji].push(state.displayName);
    if (!msg.reactions[emoji].length) delete msg.reactions[emoji];
    saveState();
    renderChat();
  }

  function updateChatHeader() {
    const searchInput = document.getElementById("chat-search-input");
    searchInput.value = state.chatSearchQuery;

    if (state.activeChatType === "channel") {
      const server = state.servers.find(s => s.id === state.activeServerId);
      const channel = server ? server.channels.find(c => c.id === state.activeChannelId) : null;
      document.getElementById("chat-header-prefix").textContent = "#";
      document.getElementById("chat-header-name").textContent = channel ? channel.name : "general";
      document.getElementById("chat-header-desc").textContent = channel ? "Text channel in "+server.name : "";
      document.getElementById("message-input").placeholder = "Message #"+(channel?channel.name:"channel")+"...";
    } else if (state.activeChatType === "dm") {
      const friend = state.friends.find(f => f.id === state.activeDmFriendId);
      document.getElementById("chat-header-prefix").textContent = "@";
      document.getElementById("chat-header-name").textContent = friend ? friend.username : "User DMs";
      document.getElementById("chat-header-desc").textContent = friend ? (friend.status.toUpperCase()+(friend.customStatus?" - "+friend.customStatus:"")) : "";
      document.getElementById("message-input").placeholder = "Message @"+(friend?friend.username:"friend")+"...";
    } else if (state.activeChatType === "group") {
      const group = state.groupChats.find(g => g.id === state.activeGroupChatId);
      document.getElementById("chat-header-prefix").textContent = "📢";
      document.getElementById("chat-header-name").textContent = group ? group.name : "Group Chat";
      document.getElementById("chat-header-desc").textContent = group ? group.members.length+" members" : "";
      document.getElementById("message-input").placeholder = "Message group...";
    }
  }

  /* ============ MOCK REPLY ============ */
  const mockReplies = ["Oh that's awesome!", "Nice! Tell me more.", "Haha, for real 😂", "I'm testing the new features.", "Did you check the video player?", "Sounds great!", "I'll review this later.", "CSS grids are magic.", "Love the new design!", "Keep up the great work!"];

  function triggerMockReply(chatKey, userContent) {
    let replyName = "pixel_alex";
    if (state.activeChatType === "channel") {
      const pool = state.friends.filter(f => f.status !== "offline");
      if (pool.length) replyName = pool[Math.floor(Math.random()*pool.length)].username;
    } else if (state.activeChatType === "dm") {
      const friend = state.friends.find(f => f.id === state.activeDmFriendId);
      if (friend) replyName = friend.username;
    } else if (state.activeChatType === "group") {
      const group = state.groupChats.find(g => g.id === state.activeGroupChatId);
      if (group && group.members.length > 0) {
        const others = group.members.filter(m => m !== state.displayName);
        if (others.length) replyName = others[Math.floor(Math.random()*others.length)];
      }
    }

    setTimeout(() => {
      if (getActiveChatKey() !== chatKey) return;
      const typingText = document.getElementById("typing-text");
      const typingIndicator = document.getElementById("typing-indicator");
      typingText.textContent = replyName+" is typing...";
      typingIndicator.classList.remove("hidden");

      setTimeout(() => {
        typingIndicator.classList.add("hidden");
        if (!state.messages[chatKey]) state.messages[chatKey] = [];
        let response = mockReplies[Math.floor(Math.random()*mockReplies.length)];
        if (userContent.toLowerCase().includes("hello") || userContent.toLowerCase().includes("hey")) response = "Hey! Hope you're having a great day! 👋";
        else if (userContent.toLowerCase().includes("youtube") || userContent.toLowerCase().includes("video")) response = "The video player works great! Check it out.";
        else if (userContent.toLowerCase().includes("instagram") || userContent.toLowerCase().includes("ig")) response = "Just saw the latest posts! They look awesome 🔥";

        state.messages[chatKey].push({ id: "msg_"+Date.now(), sender: replyName, content: response, timestamp: getTimestampString(), reactions: {}, replyTo: null });
        saveState();
        if (getActiveChatKey() === chatKey) renderChat();
      }, 2000);
    }, 1000);
  }

  /* ============ SERVERS ============ */
  function initServers() {
    document.getElementById("btn-add-channel").addEventListener("click", () => {
      document.getElementById("channel-modal").classList.remove("hidden");
      document.getElementById("channel-name-input").value = "";
    });
    document.getElementById("btn-channel-cancel").addEventListener("click", () => { document.getElementById("channel-modal").classList.add("hidden"); });
    document.getElementById("btn-channel-submit").addEventListener("click", () => {
      let name = document.getElementById("channel-name-input").value.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "");
      if (!name) return;
      const server = state.servers.find(s => s.id === state.activeServerId);
      if (server) {
        if (server.channels.find(c => c.id === name)) { showToast("Channel already exists!", "error"); return; }
        server.channels.push({ id: name, name: name });
        state.activeChannelId = name; state.activeChatType = "channel";
        saveState(); renderChannels(); updateChatHeader(); renderChat();
        document.getElementById("channel-modal").classList.add("hidden");
        showToast("Channel #"+name+" created!", "success");
      }
    });

    document.getElementById("btn-create-server").addEventListener("click", () => {
      document.getElementById("server-modal").classList.remove("hidden");
      document.getElementById("server-name-input").value = "";
      document.getElementById("server-icon-input").value = "";
    });
    document.getElementById("btn-server-cancel").addEventListener("click", () => { document.getElementById("server-modal").classList.add("hidden"); });
    document.getElementById("btn-server-submit").addEventListener("click", () => {
      const name = document.getElementById("server-name-input").value.trim();
      const icon = document.getElementById("server-icon-input").value.trim() || "S";
      if (!name) { showToast("Server name required!", "error"); return; }
      const id = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      if (state.servers.find(s => s.id === id)) { showToast("Server already exists!", "error"); return; }
      state.servers.push({ id: id, name: name, icon: icon, channels: [{ id: "general", name: "general" }] });
      state.activeServerId = id; state.activeChatType = "channel"; state.activeChannelId = "general";
      saveState(); renderServers(); renderChannels(); updateChatHeader(); renderChat();
      document.getElementById("server-modal").classList.add("hidden");
      showToast("Server "+name+" created!", "success");
    });

    document.getElementById("btn-join-server").addEventListener("click", () => {
      document.getElementById("join-server-modal").classList.remove("hidden");
      document.getElementById("join-server-input").value = "";
    });
    document.getElementById("btn-join-cancel").addEventListener("click", () => { document.getElementById("join-server-modal").classList.add("hidden"); });
    document.getElementById("btn-join-submit").addEventListener("click", () => {
      const code = document.getElementById("join-server-input").value.trim().toLowerCase().replace(/\s+/g, "-");
      if (!code) return;
      const server = state.servers.find(s => s.id === code);
      if (server) {
        state.activeServerId = code; state.activeChatType = "channel";
        if (server.channels.length) state.activeChannelId = server.channels[0].id;
        saveState(); renderServers(); renderChannels(); updateChatHeader(); renderChat();
        document.getElementById("join-server-modal").classList.add("hidden");
        showToast("Joined server "+server.name+"!", "success");
        // switch to servers view
        switchNav("servers");
      } else {
        showToast("Server not found with that code!", "error");
      }
    });

    renderServers();
    renderChannels();
  }

  function switchNav(nav) {
    state.activeNavTab = nav;
    document.querySelectorAll(".top-nav-btn").forEach(b => b.classList.toggle("active", b.getAttribute("data-nav") === nav));
    document.querySelectorAll(".right-view").forEach(v => v.classList.remove("active"));
    document.getElementById("right-"+nav+"-view").classList.add("active");
  }

  function renderServers() {
    const container = document.getElementById("server-icons-list");
    container.innerHTML = "";
    state.servers.forEach(server => {
      const btn = document.createElement("button");
      btn.className = "server-icon-btn"+(server.id === state.activeServerId?" active":"");
      btn.textContent = server.icon;
      btn.setAttribute("title", server.name);
      btn.addEventListener("click", () => {
        state.activeServerId = server.id; state.activeChatType = "channel";
        if (server.channels.length) state.activeChannelId = server.channels[0].id;
        saveState(); renderServers(); renderChannels(); updateChatHeader(); renderChat();
        document.querySelectorAll(".friend-item").forEach(i => i.classList.remove("active"));
        switchNav("servers");
      });
      container.appendChild(btn);
    });
  }

  function renderChannels() {
    const container = document.getElementById("channels-list");
    container.innerHTML = "";
    const server = state.servers.find(s => s.id === state.activeServerId);
    if (!server) return;
    document.getElementById("active-server-title").textContent = server.name;
    server.channels.forEach(chan => {
      const btn = document.createElement("button");
      btn.className = "channel-btn"+(state.activeChatType === "channel" && chan.id === state.activeChannelId?" active":"");
      btn.innerHTML = '<span class="hash">#</span> '+chan.name;
      btn.addEventListener("click", () => {
        state.activeChatType = "channel"; state.activeChannelId = chan.id;
        saveState(); renderChannels(); updateChatHeader(); renderChat();
        document.querySelectorAll(".friend-item").forEach(i => i.classList.remove("active"));
      });
      container.appendChild(btn);
    });
  }

  /* ============ GROUP CHATS ============ */
  function initGroupChats() {
    document.getElementById("btn-create-group").addEventListener("click", () => {
      const modal = document.getElementById("group-modal");
      modal.classList.remove("hidden");
      document.getElementById("group-name-input").value = "";
      const select = document.getElementById("group-member-select");
      select.innerHTML = "";
      state.friends.filter(f => f.status !== "offline" && f.status !== "pending_in" && f.status !== "pending_out").forEach(f => {
        const label = document.createElement("label");
        label.innerHTML = '<input type="checkbox" value="'+f.username+'"> <span>'+f.username+'</span>';
        select.appendChild(label);
      });
      const label = document.createElement("label");
      label.innerHTML = '<input type="checkbox" value="'+state.displayName+'" checked disabled> <span>'+state.displayName+' (you)</span>';
      select.prepend(label);
    });

    document.getElementById("btn-group-cancel").addEventListener("click", () => { document.getElementById("group-modal").classList.add("hidden"); });

    document.getElementById("btn-group-submit").addEventListener("click", () => {
      const name = document.getElementById("group-name-input").value.trim();
      if (!name) { showToast("Group name required!", "error"); return; }
      const checks = document.querySelectorAll("#group-member-select input:checked:not([disabled])");
      const members = [state.displayName];
      checks.forEach(c => members.push(c.value));
      if (members.length < 2) { showToast("Add at least one other member!", "error"); return; }
      const id = "group_"+Date.now();
      const group = { id: id, name: name, members: members, createdBy: state.displayName, createdAt: new Date().toISOString() };
      state.groupChats.push(group);
      state.messages["group_"+id] = [{ id: "sys_"+Date.now(), sender: "System", content: "Group chat "+name+" created!", timestamp: getTimestampString(), system: true, reactions: {}, replyTo: null }];
      state.activeChatType = "group"; state.activeGroupChatId = id;
      saveState();
      document.getElementById("group-modal").classList.add("hidden");
      renderGroupChats();
      updateChatHeader();
      renderChat();
      switchNav("groupchats");
      showToast("Group chat "+name+" created!", "success");
    });
  }

  function renderGroupChats() {
    const container = document.getElementById("group-chats-list");
    container.innerHTML = "";
    if (!state.groupChats.length) {
      container.innerHTML = '<div style="padding:16px;font-size:0.75rem;color:var(--text-muted);text-align:center;">No group chats yet.<br>Click + to create one.</div>';
      document.getElementById("group-members-list").innerHTML = "";
      return;
    }
    state.groupChats.forEach(group => {
      const item = document.createElement("div");
      item.className = "group-chat-item"+(state.activeGroupChatId === group.id && state.activeChatType === "group"?" active":"");
      const lastMsg = state.messages["group_"+group.id] ? state.messages["group_"+group.id][state.messages["group_"+group.id].length-1] : null;
      item.innerHTML = '<div class="group-chat-icon">👥</div><div><div class="group-chat-name">'+escapeHtml(group.name)+'</div><div class="group-chat-count">'+group.members.length+' members</div></div>';
      item.addEventListener("click", () => {
        state.activeChatType = "group"; state.activeGroupChatId = group.id;
        if (!state.messages["group_"+group.id]) state.messages["group_"+group.id] = [{ id: "sys_"+Date.now(), sender: "System", content: "Group chat started.", timestamp: getTimestampString(), system: true, reactions: {}, replyTo: null }];
        saveState(); renderGroupChats(); updateChatHeader(); renderChat();
        renderGroupMembers();
      });
      container.appendChild(item);
    });
    renderGroupMembers();
  }

  function renderGroupMembers() {
    const container = document.getElementById("group-members-list");
    container.innerHTML = "";
    if (state.activeChatType !== "group") { container.innerHTML = '<div style="padding:12px;font-size:0.7rem;color:var(--text-muted);text-align:center;">Select a group chat to see members.</div>'; return; }
    const group = state.groupChats.find(g => g.id === state.activeGroupChatId);
    if (!group) { container.innerHTML = '<div style="padding:12px;font-size:0.7rem;color:var(--text-muted);text-align:center;">No group selected.</div>'; return; }
    container.innerHTML = '<div style="font-size:0.7rem;font-weight:600;color:var(--text-muted);padding:4px 8px;text-transform:uppercase;letter-spacing:0.3px;">Members - '+group.members.length+'</div>';
    group.members.forEach(m => {
      const isOnline = state.friends.some(f => f.username === m && f.status !== "offline");
      const div = document.createElement("div");
      div.className = "group-member-item";
      const initial = m.charAt(0).toUpperCase();
      div.innerHTML = '<div class="friend-avatar" style="width:24px;height:24px;border-radius:50%;background:#555;display:flex;align-items:center;justify-content:center;font-size:0.6rem;color:#fff;flex-shrink:0;">'+initial+'</div><span>'+(m === state.displayName ? m+" (you)" : m)+'</span><span style="margin-left:auto;font-size:0.6rem;color:'+(isOnline?'#aaa':'#444')+'">'+(isOnline?"●":"○")+'</span>';
      container.appendChild(div);
    });
  }

  /* ============ FRIENDS ============ */
  function initFriends() {
    document.querySelectorAll(".friend-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const subtab = btn.getAttribute("data-subtab");
        state.activeFriendSubtab = subtab;
        document.querySelectorAll(".friend-tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        document.querySelectorAll(".subtab-content").forEach(c => c.classList.remove("active"));
        if (subtab === "online" || subtab === "all") { document.getElementById("friends-list-view").classList.add("active"); renderFriendsList(); }
        else if (subtab === "pending") { document.getElementById("friends-pending-view").classList.add("active"); renderPendingList(); }
        else if (subtab === "add-friend") { document.getElementById("friends-add-view").classList.add("active"); document.getElementById("add-friend-feedback").style.display = "none"; document.getElementById("add-friend-input").value = ""; }
      });
    });

    document.getElementById("friend-search-input").addEventListener("input", () => {
      state.friendSearchQuery = document.getElementById("friend-search-input").value;
      renderFriendsList();
    });

    document.getElementById("btn-submit-friend-req").addEventListener("click", () => {
      const val = document.getElementById("add-friend-input").value.trim();
      const fb = document.getElementById("add-friend-feedback");
      fb.className = "feedback-msg"; fb.style.display = "none";
      if (!val) return;
      const parts = val.split("#");
      const username = parts[0];
      const disc = parts[1] || Math.floor(1000+Math.random()*9000).toString();
      const exists = state.friends.find(f => f.username.toLowerCase() === username.toLowerCase());
      if (exists) {
        fb.textContent = exists.status === "pending_out" || exists.status === "pending_in" ? "Request already pending." : "Already friends!";
        fb.classList.add("error"); return;
      }
      const newFriend = { id: "friend_"+Date.now(), username: username, discriminator: disc, status: "pending_out", customStatus: "Waiting...", avatarColor: "#555", profilePic: "" };
      state.friends.push(newFriend);
      saveState();
      document.getElementById("add-friend-input").value = "";
      fb.textContent = "Friend request sent to "+username+"#"+disc+"!";
      fb.classList.add("success");
      showToast("Request sent to @"+username, "success");
      setTimeout(() => {
        const check = state.friends.find(f => f.id === newFriend.id);
        if (check && check.status === "pending_out") { check.status = "online"; check.customStatus = "Thanks for adding me!"; saveState(); showToast("@"+username+" accepted your request!", "success"); if (state.activeFriendSubtab === "online" || state.activeFriendSubtab === "all") renderFriendsList(); else if (state.activeFriendSubtab === "pending") renderPendingList(); }
      }, 6000);
    });

    renderFriendsList();
    renderPendingList();
    initGroupChats();
  }

  function renderFriendsList() {
    const container = document.getElementById("friends-scroller-list");
    container.innerHTML = "";
    let list = state.friends;
    if (state.activeFriendSubtab === "online") list = state.friends.filter(f => f.status !== "offline" && f.status !== "pending_in" && f.status !== "pending_out");
    else list = state.friends.filter(f => f.status !== "pending_in" && f.status !== "pending_out");
    const query = state.friendSearchQuery.trim().toLowerCase();
    if (query) list = list.filter(f => f.username.toLowerCase().includes(query));

    if (!list.length) { container.innerHTML = '<div style="text-align:center;padding:16px;font-size:0.7rem;color:var(--text-muted);">No friends found.</div>'; return; }

    list.forEach(friend => {
      const item = document.createElement("div");
      item.className = "friend-item"+(state.activeChatType === "dm" && state.activeDmFriendId === friend.id?" active":"");
      item.innerHTML = '<div class="friend-info-left"><div class="friend-avatar-wrapper"><div class="friend-avatar" style="background-color:'+friend.avatarColor+'">'+friend.username.charAt(0).toUpperCase()+'</div><div class="status-indicator '+friend.status+'"></div></div><div class="friend-details"><div class="friend-username-row"><span class="friend-name">'+friend.username+'</span><span class="friend-tag">#'+friend.discriminator+'</span></div><div class="friend-custom-status">'+(friend.customStatus||friend.status)+'</div></div></div><div class="friend-actions"><button class="friend-action-btn btn-quick-dm" title="Message">💬</button><button class="friend-action-btn btn-remove-friend decline" title="Remove">✖</button></div>';

      item.addEventListener("click", (e) => { if (!e.target.closest(".friend-action-btn")) openDirectMessage(friend.id); });
      item.querySelector(".btn-quick-dm").addEventListener("click", () => openDirectMessage(friend.id));
      item.querySelector(".btn-remove-friend").addEventListener("click", () => {
        if (confirm("Remove "+friend.username+"?")) {
          state.friends = state.friends.filter(f => f.id !== friend.id);
          saveState(); renderFriendsList();
          showToast("Removed @"+friend.username, "info");
          if (state.activeChatType === "dm" && state.activeDmFriendId === friend.id) { state.activeChatType = "channel"; state.activeServerId = "dangro-hq"; state.activeChannelId = "general"; updateChatHeader(); renderChat(); renderServers(); renderChannels(); }
        }
      });
      container.appendChild(item);
    });
  }

  function openDirectMessage(friendId) {
    state.activeChatType = "dm"; state.activeDmFriendId = friendId;
    document.querySelectorAll(".channel-btn").forEach(b => b.classList.remove("active"));
    const key = "dm_"+friendId;
    if (!state.messages[key]) state.messages[key] = [{ id: "sys_dm_"+Date.now(), sender: "System", content: "Private messages with this user.", timestamp: getTimestampString(), system: true, reactions: {}, replyTo: null }];
    renderFriendsList();
    updateChatHeader();
    renderChat();
    switchNav("dms");
  }

  function renderPendingList() {
    const container = document.getElementById("friends-pending-list");
    container.innerHTML = "";
    const pending = state.friends.filter(f => f.status === "pending_in" || f.status === "pending_out");
    if (!pending.length) { container.innerHTML = '<div style="text-align:center;padding:16px;font-size:0.7rem;color:var(--text-muted);">No pending requests.</div>'; return; }
    pending.forEach(friend => {
      const isIncoming = friend.status === "pending_in";
      const item = document.createElement("div");
      item.className = "friend-item";
      item.innerHTML = '<div class="friend-info-left"><div class="friend-avatar-wrapper"><div class="friend-avatar" style="background-color:'+friend.avatarColor+'">'+friend.username.charAt(0).toUpperCase()+'</div><div class="status-indicator offline"></div></div><div class="friend-details"><div class="friend-username-row"><span class="friend-name">'+friend.username+'</span><span class="friend-tag">#'+friend.discriminator+'</span></div><div><span class="pending-badge">'+(isIncoming?'Incoming Request':'Outgoing Request')+'</span></div></div></div><div class="friend-actions">'+(isIncoming?'<button class="friend-action-btn btn-accept-req" title="Accept">✔</button>':'')+'<button class="friend-action-btn btn-cancel-req decline" title="Decline">✖</button></div>';
      if (isIncoming) item.querySelector(".btn-accept-req").addEventListener("click", () => { friend.status = "online"; friend.customStatus = "Friends! 👋"; saveState(); renderPendingList(); showToast("Accepted @"+friend.username+"'s request!", "success"); });
      item.querySelector(".btn-cancel-req").addEventListener("click", () => { state.friends = state.friends.filter(f => f.id !== friend.id); saveState(); renderPendingList(); });
      container.appendChild(item);
    });
  }

  /* ============ SETTINGS ============ */
  function initSettings() {
    document.getElementById("btn-settings").addEventListener("click", () => {
      document.getElementById("settings-panel").classList.remove("hidden");
      document.getElementById("settings-display-name").value = state.displayName;
      document.getElementById("settings-bio").value = state.bio || "";
      document.getElementById("settings-status").value = state.status || "online";
      document.getElementById("settings-custom-status").value = state.customStatus || "";
      document.getElementById("settings-password").value = "";
      if (state.profilePic) { document.getElementById("settings-avatar").style.backgroundImage = "url("+state.profilePic+")"; document.getElementById("settings-avatar").style.backgroundSize = "cover"; document.getElementById("settings-avatar").textContent = ""; }
      else { document.getElementById("settings-avatar").style.backgroundImage = ""; document.getElementById("settings-avatar").textContent = state.displayName.charAt(0).toUpperCase(); }
    });

    document.getElementById("btn-settings-close").addEventListener("click", () => { document.getElementById("settings-panel").classList.add("hidden"); });

    document.getElementById("btn-upload-pic").addEventListener("click", () => { document.getElementById("file-upload-input").click(); });

    document.getElementById("file-upload-input").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        state.profilePic = event.target.result;
        document.getElementById("settings-avatar").style.backgroundImage = "url("+event.target.result+")";
        document.getElementById("settings-avatar").style.backgroundSize = "cover";
        document.getElementById("settings-avatar").textContent = "";
      };
      reader.readAsDataURL(file);
    });

    document.getElementById("btn-settings-save").addEventListener("click", () => {
      state.displayName = document.getElementById("settings-display-name").value.trim() || state.displayName;
      state.bio = document.getElementById("settings-bio").value.trim();
      state.status = document.getElementById("settings-status").value;
      state.customStatus = document.getElementById("settings-custom-status").value.trim();
      const pw = document.getElementById("settings-password").value.trim();
      if (pw) { LOGIN_CREDENTIALS.password = pw; showToast("Password updated!", "success"); }
      saveState();
      document.getElementById("settings-panel").classList.add("hidden");
      updateChatHeader();
      renderChat();
      showToast("Settings saved!", "success");
    });
  }

  /* ============ CALL SYSTEM ============ */
  function initCall() {
    document.getElementById("btn-call-start").addEventListener("click", startCall);
    document.getElementById("btn-call-end").addEventListener("click", stopCall);
    document.getElementById("btn-answer-call").addEventListener("click", answerCall);
    document.getElementById("btn-decline-call").addEventListener("click", () => {
      document.getElementById("call-notification").classList.add("hidden");
      showToast("Call declined", "info");
    });

    document.getElementById("btn-toggle-mic").addEventListener("click", () => {
      isMicMuted = !isMicMuted;
      document.getElementById("btn-toggle-mic").classList.toggle("muted", isMicMuted);
      if (localStream) localStream.getAudioTracks().forEach(t => t.enabled = !isMicMuted);
    });

    document.getElementById("btn-toggle-video").addEventListener("click", () => {
      isVideoOff = !isVideoOff;
      document.getElementById("btn-toggle-video").classList.toggle("muted", isVideoOff);
      if (localStream) localStream.getVideoTracks().forEach(t => t.enabled = !isVideoOff);
    });

    document.getElementById("btn-toggle-screen").addEventListener("click", toggleScreenShare);

    document.getElementById("btn-toggle-volume").addEventListener("click", () => {
      isVolumeMuted = !isVolumeMuted;
      document.getElementById("btn-toggle-volume").classList.toggle("muted", isVolumeMuted);
      const remote = document.getElementById("remote-video");
      if (remote) remote.muted = isVolumeMuted;
    });
  }

  async function startCall() {
    if (callActive) return;
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      document.getElementById("local-video").srcObject = localStream;
      callActive = true;
      callParticipants = ["You"];
      callStartTime = Date.now();

      // Simulate a remote participant joining
      setTimeout(() => {
        if (!callActive) return;
        callParticipants.push("pixel_alex");
        document.getElementById("remote-video-label").textContent = "pixel_alex";
        document.getElementById("participant-count").textContent = callParticipants.length;
        showToast("pixel_alex joined the call", "success");
        // Simulate remote video using a canvas stream
        const canvas = document.createElement("canvas");
        canvas.width = 640; canvas.height = 480;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#222";
        ctx.fillRect(0, 0, 640, 480);
        ctx.fillStyle = "#fff";
        ctx.font = "24px Inter";
        ctx.fillText("pixel_alex", 240, 240);
        const canvasStream = canvas.captureStream(10);
        document.getElementById("remote-video").srcObject = canvasStream;
      }, 2000);

      document.getElementById("call-container").classList.remove("hidden");
      document.getElementById("participant-count").textContent = callParticipants.length;
      startCallTimer();
      startCallMonitor();
      showToast("Call started!", "success");
    } catch (err) {
      showToast("Could not access camera/mic: "+err.message, "error");
    }
  }

  function stopCall() {
    if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
    if (remoteStream) { remoteStream.getTracks().forEach(t => t.stop()); remoteStream = null; }
    document.getElementById("local-video").srcObject = null;
    document.getElementById("remote-video").srcObject = null;
    document.getElementById("remote-video-label").textContent = "Participant";
    callActive = false;
    callParticipants = [];
    isMicMuted = false; isVideoOff = false; isScreenSharing = false; isVolumeMuted = false;
    document.querySelectorAll(".call-control-btn").forEach(b => { b.classList.remove("muted"); b.classList.add("active"); });
    document.getElementById("call-container").classList.add("hidden");
    document.getElementById("call-notification").classList.add("hidden");
    document.getElementById("participant-count").textContent = "0";
    if (callInterval) { clearInterval(callInterval); callInterval = null; }
    callStartTime = null;
    showToast("Call ended", "info");
  }

  function startCallTimer() {
    if (callInterval) clearInterval(callInterval);
    callInterval = setInterval(() => {
      if (!callStartTime) return;
      const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
      const mins = Math.floor(elapsed / 60).toString().padStart(2, "0");
      const secs = (elapsed % 60).toString().padStart(2, "0");
      document.getElementById("call-timer").textContent = mins+":"+secs;
    }, 1000);
  }

  function startCallMonitor() {
    // Check every 10 seconds if call should auto-end
    const monitorInterval = setInterval(() => {
      if (!callActive) { clearInterval(monitorInterval); return; }
      if (callParticipants.length <= 1) {
        const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
        if (elapsed >= 180) { // 3 minutes
          showToast("Call ended - no other participants for 3 minutes", "info");
          stopCall();
          clearInterval(monitorInterval);
        }
      }
      if (callParticipants.length === 0) {
        showToast("Call ended - no participants", "info");
        stopCall();
        clearInterval(monitorInterval);
      }
    }, 10000);
  }

  async function toggleScreenShare() {
    if (isScreenSharing) {
      if (localStream) {
        const tracks = localStream.getVideoTracks();
        tracks.forEach(t => t.stop());
      }
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: !isMicMuted });
        localStream = newStream;
        document.getElementById("local-video").srcObject = newStream;
      } catch (e) {}
      isScreenSharing = false;
      document.getElementById("btn-toggle-screen").classList.remove("muted");
      showToast("Screen sharing stopped", "info");
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        screenStream.getVideoTracks()[0].addEventListener("ended", () => {
          isScreenSharing = false;
          document.getElementById("btn-toggle-screen").classList.remove("muted");
          navigator.mediaDevices.getUserMedia({ video: true }).then(s => { localStream = s; document.getElementById("local-video").srcObject = s; });
        });
        localStream = screenStream;
        document.getElementById("local-video").srcObject = screenStream;
        isScreenSharing = true;
        document.getElementById("btn-toggle-screen").classList.add("muted");
        showToast("Screen sharing started", "success");
      } catch (e) {
        showToast("Screen sharing cancelled", "info");
      }
    }
  }

  function answerCall() {
    document.getElementById("call-notification").classList.add("hidden");
    startCall();
  }

  // Simulate incoming call notification
  function showIncomingCall(from) {
    if (callActive) return;
    document.getElementById("call-notif-name").textContent = from;
    document.getElementById("call-notification").classList.remove("hidden");
  }

  /* ============ RENDER ALL ============ */
  function renderAll() {
    updateChatHeader();
    renderChat();
    renderServers();
    renderChannels();
    renderFriendsList();
    renderGroupChats();
    renderYoutubeFeed();
    renderInstagramFeed();
  }
});
