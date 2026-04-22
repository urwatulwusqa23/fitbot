const API_URL = "http://localhost:5076/api";

export const api = {
    // ── Auth ────────────────────────────────────────────────────────────────────
    login: async (credentials) => {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credentials),
        });
        return response.json();
    },

    register: async (userData) => {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userData),
        });
        return response;
    },

    forgotPassword: async (email) => {
        const response = await fetch(`${API_URL}/auth/forgot-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || "Failed to send reset email");
        }
        return response.json();
    },

    googleLogin: async (idToken) => {
        const response = await fetch(`${API_URL}/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
        });
        const text = await response.text();
        if (!response.ok) throw new Error(text || "Google sign-in failed");
        return text ? JSON.parse(text) : {};
    },

    // ── Profile ─────────────────────────────────────────────────────────────────
    createProfile: async (profileData, token) => {
        const response = await fetch(`${API_URL}/profile`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(profileData),
        });
        return response.json();
    },

    completeOnboarding: async (profileData) => {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/profile/onboarding`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(profileData),
        });
        if (!response.ok) throw new Error("Onboarding failed");
        return response.json();
    },

    // getProfile: async () => {
    //     const token = localStorage.getItem("token");
    //     const response = await fetch(`${API_URL}/profile/me`, {
    //         headers: { Authorization: `Bearer ${token}` },
    //     });
    //     if (response.status === 404) return null;
    //     if (!response.ok) throw new Error("Failed to fetch profile");
    //     return response.json();
    // },

    getProfile: async () => {
        const token = localStorage.getItem("token");
        if (!token) return null; // Don't even fetch if there's no token

        try {
            const response = await fetch(`${API_URL}/profile/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.status === 404) return null;
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error("Profile fetch failed", error);
            return null;
        }
    },

    getBmiLogs: async () => {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/profile/bmi-logs`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.json();
    },

    updateProfile: async (profileData) => {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/profile/update`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(profileData),
        });
        return response.json();
    },

    // ── Chat ────────────────────────────────────────────────────────────────────
    // ✅ sessionId added — backend uses it to save chat history automatically
    sendChatMessage: async ({ message, history, userProfile, sessionId }) => {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/chat/message`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ message, history, userProfile, sessionId }),
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || "Chat request failed");
        }
        return response.json();
    },

    getChatHistory: async () => {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/chat/history`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return [];
        return response.json();
    },

    // ── Save Plans ──────────────────────────────────────────────────────────────
    saveDietPlan: async (planData) => {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/chat/save-diet`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(planData),
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || "Failed to save diet plan");
        }
        return response.json();
    },

    saveExercisePlan: async (planData) => {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/chat/save-exercise`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(planData),
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || "Failed to save exercise plan");
        }
        return response.json();
    },

    getDietPlans: async () => {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/chat/diet-plans`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.json();
    },

    getExercisePlans: async () => {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/chat/exercise-plans`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.json();
    },

    // ── Videos ──────────────────────────────────────────────────────────────────
    getVideos: async () => {
        const response = await fetch(`${API_URL}/video`);
        return response.json();
    },

    createVideo: async (videoData) => {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/video`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(videoData),
        });
        return response.json();
    },

    updateVideo: async (id, videoData) => {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/video/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(videoData),
        });
        return response.json();
    },

    deleteVideo: async (id) => {
        const token = localStorage.getItem("token");
        await fetch(`${API_URL}/video/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        });
    },

    seedVideos: async () => {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/video/seed`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.json();
    },

    // ── Like Video ──────────────────────────────────────────────────────────────
    // ✅ fixed — handles all possible field name shapes from backend
    likeVideo: async (videoData) => {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Not logged in");

        const videoId = videoData.videoId || videoData.id || "";
        if (!videoId) throw new Error("Video ID is missing");

        const response = await fetch(`${API_URL}/chat/like-video`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                videoId: String(videoId),
                title: videoData.title || "Untitled",
                thumbnailUrl: videoData.thumbnailUrl || videoData.thumbnail || "",
                youtubeUrl:
                    videoData.youtubeUrl ||
                    videoData.url ||
                    `https://youtube.com/watch?v=${videoId}`,
            }),
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || "Failed to like video");
        }
        return response.json();
    },

    getLikedVideos: async () => {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/chat/liked-videos`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.json();
    },

    // ── Deep Memory ─────────────────────────────────────────────────────────────
    // ✅ fixed — sends correct shape backend expects
    upsertMemory: async (items) => {
        const token = localStorage.getItem("token");
        if (!token) return false;
        const response = await fetch(`${API_URL}/chat/memory`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(
                items.map((i) => ({
                    key: i.key,
                    value: i.value || "",
                    category: i.category || null,
                }))
            ),
        });
        if (!response.ok) {
            const text = await response.text();
            console.warn("Memory upsert failed:", text);
            return false;
        }
        return true;
    },

    getMemory: async () => {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/chat/memory`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.json();
    },

    // ── Tags ────────────────────────────────────────────────────────────────────
    getTags: async () => {
        const response = await fetch(`${API_URL}/tags`);
        return response.json();
    },

    saveSynonym: async (data) => {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/tags/synonym`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });
        return response.json();
    },

    deleteSynonym: async (id) => {
        const token = localStorage.getItem("token");
        await fetch(`${API_URL}/tags/synonym/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        });
    },

    saveStopWord: async (data) => {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/tags/stopword`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });
        return response.json();
    },

    deleteStopWord: async (id) => {
        const token = localStorage.getItem("token");
        await fetch(`${API_URL}/tags/stopword/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        });
    },

    seedTags: async () => {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/tags/seed`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.json();
    },

    
};