import { createSlice } from "@reduxjs/toolkit";

const readToken = () => {
    try { return localStorage.getItem("token") || null; }
    catch { return null; }
};

const authSlice = createSlice({
    name: "auth",
    initialState: {
        token: readToken(),
    },
    reducers: {
        setToken: (state, action) => {
            state.token = action.payload;
            try { localStorage.setItem("token", action.payload); } catch {}
        },
        clearToken: (state) => {
            state.token = null;
            try { localStorage.removeItem("token"); } catch {}
        },
    },
});

export const { setToken, clearToken } = authSlice.actions;

export const selectToken = (state) => state.auth.token;
export const selectIsAuthenticated = (state) => !!state.auth.token;

export default authSlice.reducer;
