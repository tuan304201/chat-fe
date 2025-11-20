import axios from "axios";
import { useAuthStore } from "@/stores/authStore";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Request Interceptor
axiosClient.interceptors.request.use((config) => {
  const authStore = useAuthStore();
  if (authStore.accessToken) {
    config.headers.Authorization = `Bearer ${authStore.accessToken}`;
  }
  return config;
});

// Response Interceptor
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const authStore = useAuthStore();

      try {
        // --- SỬA LẠI DÒNG NÀY ---
        // Gọi đúng tên hàm là refreshAction (khớp với authStore)
        await authStore.refreshAction();

        // Gắn token mới vào header
        originalRequest.headers.Authorization = `Bearer ${authStore.accessToken}`;
        return axiosClient(originalRequest);
      } catch (refreshError) {
        authStore.logout();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

export default axiosClient;
