import { defineStore } from "pinia";
import axios from "axios";
import axiosClient from "@/api/axiosClient";
import router from "@/router";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: JSON.parse(localStorage.getItem("user")) || null,
    accessToken: localStorage.getItem("accessToken") || null,
    refreshToken: localStorage.getItem("refreshToken") || null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.accessToken,
  },

  actions: {
    async login(username, password) {
      try {
        const { data } = await axiosClient.post("/auth/login", { username, password });
        this.setAuth(data);
        return true;
      } catch (error) {
        throw error.response?.data?.message || "Login failed";
      }
    },

    async register(payload) {
      try {
        await axiosClient.post("/auth/register", payload);
        return true;
      } catch (error) {
        throw error.response?.data?.message || "Register failed";
      }
    },

    async refreshAction() {
      // Gọi trực tiếp axios gốc để tránh loop vô tận
      const { data } = await axios.post("http://localhost:5000/api/auth/refresh", {
        refreshToken: this.refreshToken,
      });

      this.accessToken = data.accessToken;
      this.refreshToken = data.refreshToken;

      localStorage.setItem("accessToken", this.accessToken);
      localStorage.setItem("refreshToken", this.refreshToken);
      return data.accessToken;
    },

    setAuth(data) {
      this.user = data.user;
      this.accessToken = data.accessToken;
      this.refreshToken = data.refreshToken;

      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
    },

    async logout() {
      try {
        if (this.refreshToken) {
          await axiosClient.post("/auth/logout", { refreshToken: this.refreshToken });
        }
      } catch (e) {
        console.error(e);
      } finally {
        this.user = null;
        this.accessToken = null;
        this.refreshToken = null;
        localStorage.clear();
        router.push("/login");
      }
    },
  },
});
