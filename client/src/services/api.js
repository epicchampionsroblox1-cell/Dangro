const BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + "/api" : "/api";

function getStorage() {
  return localStorage.getItem("dangro_remember") === "true" ? localStorage : sessionStorage;
}

let accessToken = localStorage.getItem("dangro_access_token") || sessionStorage.getItem("dangro_access_token") || null;
let refreshToken = localStorage.getItem("dangro_refresh_token") || sessionStorage.getItem("dangro_refresh_token") || null;
let refreshPromise = null;

export function setTokens(access, refresh) {
  const storage = getStorage();
  accessToken = access;
  refreshToken = refresh;
  if (access) {
    storage.setItem("dangro_access_token", access);
    const other = storage === localStorage ? sessionStorage : localStorage;
    other.removeItem("dangro_access_token");
  } else {
    localStorage.removeItem("dangro_access_token");
    sessionStorage.removeItem("dangro_access_token");
  }
  if (refresh) {
    storage.setItem("dangro_refresh_token", refresh);
    const other = storage === localStorage ? sessionStorage : localStorage;
    other.removeItem("dangro_refresh_token");
  } else {
    localStorage.removeItem("dangro_refresh_token");
    sessionStorage.removeItem("dangro_refresh_token");
  }
}

export function setRememberMe(val) {
  localStorage.setItem("dangro_remember", val ? "true" : "false");
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem("dangro_access_token");
  localStorage.removeItem("dangro_refresh_token");
  sessionStorage.removeItem("dangro_access_token");
  sessionStorage.removeItem("dangro_refresh_token");
  localStorage.removeItem("dangro_remember");
}

export function getAccessToken() {
  if (!accessToken) {
    accessToken = localStorage.getItem("dangro_access_token") || sessionStorage.getItem("dangro_access_token") || null;
    refreshToken = localStorage.getItem("dangro_refresh_token") || sessionStorage.getItem("dangro_refresh_token") || null;
  }
  return accessToken;
}

async function refreshAccessToken() {
  if (!refreshToken) return null;
  if (!refreshPromise) {
    refreshPromise = fetch(BASE + "/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    }).then(res => {
      if (!res.ok) {
        clearTokens();
        return null;
      }
      return res.json();
    }).finally(() => {
      refreshPromise = null;
    });
  }
  const data = await refreshPromise;
  if (data) {
    setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  }
  return null;
}

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  if (accessToken) {
    headers["Authorization"] = "Bearer " + accessToken;
  }

  let res = await fetch(BASE + path, { headers, ...options });

  if (res.status === 401 && accessToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers["Authorization"] = "Bearer " + newToken;
      res = await fetch(BASE + path, { headers, ...options });
    }
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function uploadFile(file, onProgress) {
  const formData = new FormData();
  formData.append("file", file);

  const xhr = new XMLHttpRequest();
  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });
    xhr.addEventListener("load", () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new Error(data.error || "Upload failed"));
      } catch {
        reject(new Error("Upload failed"));
      }
    });
    xhr.addEventListener("error", () => reject(new Error("Upload failed")));
    xhr.open("POST", BASE + "/upload");
    xhr.setRequestHeader("Authorization", "Bearer " + accessToken);
    xhr.send(formData);
  });
}

async function uploadMultiple(files, onProgress) {
  const formData = new FormData();
  for (const file of files) formData.append("files", file);

  const xhr = new XMLHttpRequest();
  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });
    xhr.addEventListener("load", () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new Error(data.error || "Upload failed"));
      } catch {
        reject(new Error("Upload failed"));
      }
    });
    xhr.addEventListener("error", () => reject(new Error("Upload failed")));
    xhr.open("POST", BASE + "/upload/multiple");
    xhr.setRequestHeader("Authorization", "Bearer " + accessToken);
    xhr.send(formData);
  });
}

export const api = {
  auth: {
    login: (username, password, rememberMe) =>
      request("/auth/login", { method: "POST", body: JSON.stringify({ username, password, rememberMe }) }),
    signup: (username, email, password) =>
      request("/auth/signup", { method: "POST", body: JSON.stringify({ username, email, password }) }),
    refresh: (token) =>
      request("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken: token }) }),
    logout: (token) =>
      request("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken: token }) }),
    me: () => request("/auth/me"),
    updateProfile: (data) => request("/auth/me", { method: "PUT", body: JSON.stringify(data) }),
    changePassword: (currentPassword, newPassword) =>
      request("/auth/me/password", { method: "PUT", body: JSON.stringify({ currentPassword, newPassword }) }),
    searchUsers: (query) => request(`/auth/users/search?q=${encodeURIComponent(query)}`),
  },
  servers: {
    list: () => request("/servers"),
    get: (id) => request(`/servers/${id}`),
    create: (name, icon) => request("/servers", { method: "POST", body: JSON.stringify({ name, icon }) }),
    update: (id, data) => request(`/servers/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (id) => request(`/servers/${id}`, { method: "DELETE" }),
    join: (code) => request(`/servers/join/${code}`, { method: "POST" }),
    leave: (id) => request(`/servers/${id}/leave`, { method: "POST" }),
    kick: (id, targetUserId) => request(`/servers/${id}/kick`, { method: "POST", body: JSON.stringify({ targetUserId }) }),
    ban: (id, targetUserId) => request(`/servers/${id}/ban`, { method: "POST", body: JSON.stringify({ targetUserId }) }),
    unban: (id, targetUserId) => request(`/servers/${id}/unban`, { method: "POST", body: JSON.stringify({ targetUserId }) }),
    setCoOwner: (id, targetUserId) => request(`/servers/${id}/set-coowner`, { method: "POST", body: JSON.stringify({ targetUserId }) }),
    removeCoOwner: (id, targetUserId) => request(`/servers/${id}/remove-coowner`, { method: "POST", body: JSON.stringify({ targetUserId }) }),
  },
  channels: {
    create: (serverId, name, type) => request("/channels", { method: "POST", body: JSON.stringify({ serverId, name, type }) }),
    remove: (serverId, channelId) => request(`/channels/${serverId}/${channelId}`, { method: "DELETE" }),
  },
  messages: {
    list: (chatKey, params = {}) => {
      const q = new URLSearchParams();
      if (params.limit) q.set("limit", params.limit);
      if (params.before) q.set("before", params.before);
      if (params.after) q.set("after", params.after);
      const query = q.toString();
      return request(`/messages/${chatKey}${query ? "?" + query : ""}`);
    },
    send: (chatKey, sender, content, isImage, replyTo, attachments) =>
      request("/messages", {
        method: "POST",
        body: JSON.stringify({ chatKey, sender, content, isImage, replyTo, attachments }),
      }),
    edit: (messageId, content) =>
      request(`/messages/${messageId}`, { method: "PATCH", body: JSON.stringify({ content }) }),
    remove: (messageId) =>
      request(`/messages/${messageId}`, { method: "DELETE" }),
  },
  friends: {
    list: () => request("/friends"),
    add: (username) => request("/friends", { method: "POST", body: JSON.stringify({ username }) }),
    remove: (id) => request(`/friends/${id}`, { method: "DELETE" }),
    update: (id, data) => request(`/friends/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    block: (id) => request(`/friends/${id}/block`, { method: "POST" }),
    unblock: (id) => request(`/friends/${id}/unblock`, { method: "POST" }),
  },
  friendGroups: {
    list: () => request("/friend-groups"),
    create: (name, color, memberIds) => request("/friend-groups", { method: "POST", body: JSON.stringify({ name, color, memberIds }) }),
    update: (id, data) => request(`/friend-groups/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (id) => request(`/friend-groups/${id}`, { method: "DELETE" }),
    addMember: (id, userId) => request(`/friend-groups/${id}/members`, { method: "POST", body: JSON.stringify({ userId }) }),
    removeMember: (id, userId) => request(`/friend-groups/${id}/members/${userId}`, { method: "DELETE" }),
  },
  users: {
    profile: (id) => request(`/auth/users/profile/${id}`),
    search: (query) => request(`/auth/users/search?q=${encodeURIComponent(query)}`),
  },
  upload: {
    file: uploadFile,
    multiple: uploadMultiple,
  },
};
