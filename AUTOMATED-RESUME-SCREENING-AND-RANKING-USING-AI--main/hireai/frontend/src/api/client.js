import axios from "axios";

const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem("token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/";
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────
export const login = (email, password) =>
  api.post("/auth/login", { email, password }).then(r => r.data);

export const register = (data) =>
  api.post("/auth/register", data).then(r => r.data);

export const getMe = () =>
  api.get("/auth/me").then(r => r.data);

// ── Jobs ──────────────────────────────────────────────
export const getJobs = () =>
  api.get("/jobs").then(r => r.data);

export const getJob = (id) =>
  api.get(`/jobs/${id}`).then(r => r.data);

export const createJob = (data) =>
  api.post("/jobs", data).then(r => r.data);

export const updateJobStatus = (id, status) =>
  api.patch(`/jobs/${id}`, { status }).then(r => r.data);

// ── Applications ──────────────────────────────────────
export const getApplications = () =>
  api.get("/applications").then(r => r.data);

export const getApplicationsForJob = (jobId) =>
  api.get(`/applications/job/${jobId}`).then(r => r.data);

export const applyToJob = (data) =>
  api.post("/applications", data).then(r => r.data);

// -- Resume File Upload --
export const parseResumeFile = (file) => {
  const formData = new FormData();
  formData.append("resume", file);
  return api.post("/resume/parse", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then(r => r.data);
};

export const updateApplicationStatus = (id, status, ai_note) =>
  api.patch(`/applications/${id}`, { status, ai_note }).then(r => r.data);

// ── Stats ─────────────────────────────────────────────
export const getStats = () =>
  api.get("/stats").then(r => r.data);

// ── Users ─────────────────────────────────────────────
export const getUsers = () =>
  api.get("/users").then(r => r.data);

export default api;
