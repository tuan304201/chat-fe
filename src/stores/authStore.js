import { defineStore } from "pinia";
import axios from "axios"; // Dùng axios gốc cho việc refresh token để tránh lặp vô tận
import axiosClient from "@/api/axiosClient";
import router from "@/router";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    // Lấy dữ liệu từ localStorage nếu người dùng reload trang
    user: JSON.parse(localStorage.getItem("user")) || null,
    accessToken: localStorage.getItem("accessToken") || null,
    refreshToken: localStorage.getItem("refreshToken") || null,
  }),

  getters: {
    // Kiểm tra xem đã đăng nhập chưa dựa vào việc có token hay không
    isAuthenticated: (state) => !!state.accessToken,
  },

  actions: {
    // 1. Đăng nhập
    async login(username, password) {
      try {
        // Gọi API login
        const { data } = await axiosClient.post("/auth/login", { username, password });

        // Lưu thông tin vào state và localStorage
        this.setAuth(data);

        return true;
      } catch (error) {
        throw error.response?.data?.message || "Đăng nhập thất bại";
      }
    },

    // 2. Đăng ký
    async register(payload) {
      try {
        // Payload gồm: username, password, displayName
        await axiosClient.post("/auth/register", payload);
        return true;
      } catch (error) {
        throw error.response?.data?.message || "Đăng ký thất bại";
      }
    },

    // 3. Refresh Token (Được gọi tự động bởi axiosClient khi lỗi 401)
    async refreshAction() {
      try {
        // Gọi trực tiếp axios gốc (không qua interceptor) để tránh loop
        const { data } = await axios.post("http://localhost:5000/api/auth/refresh", {
          refreshToken: this.refreshToken,
        });

        // Cập nhật token mới
        this.accessToken = data.accessToken;
        this.refreshToken = data.refreshToken;

        localStorage.setItem("accessToken", this.accessToken);
        localStorage.setItem("refreshToken", this.refreshToken);

        return data.accessToken;
      } catch (error) {
        // Nếu refresh lỗi (token hết hạn hẳn) -> Logout
        this.logout();
        throw error;
      }
    },

    // 4. Lưu thông tin xác thực
    setAuth(data) {
      this.user = data.user;
      this.accessToken = data.accessToken;
      this.refreshToken = data.refreshToken;

      // Lưu vào localStorage để giữ trạng thái khi reload trang
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
    },

    // 5. Đăng xuất
    async logout() {
      try {
        if (this.refreshToken) {
          // Gọi API logout để backend thu hồi token
          await axiosClient.post("/auth/logout", { refreshToken: this.refreshToken });
        }
      } catch (e) {
        console.error("Logout error:", e);
      } finally {
        // Xóa sạch dữ liệu client dù API có lỗi hay không
        this.user = null;
        this.accessToken = null;
        this.refreshToken = null;
        localStorage.clear();

        // Chuyển về trang login
        router.push("/login");
      }
    },
  },
});
