import axios from "axios";

export const auth = axios.create({ baseURL: import.meta.env.VITE_AUTH_URL || "http://localhost:8081/api" });
export const bank = axios.create({ baseURL: import.meta.env.VITE_BANK_URL || "http://localhost:8082/api" });

const attach = (cfg) => {
  const t = sessionStorage.getItem("token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
};
auth.interceptors.request.use(attach);
bank.interceptors.request.use(attach);

export const logout = () => {
  sessionStorage.clear();
  window.location.href = "/login";
};