// src/App.js
import "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import React from "react";
import ReactDOM from "react-dom/client";

import './App.css';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store/index';

// ── User Components ──────────────────────────────────────────────────────────
import NavBar from './components/NavBar';
import Intro from './components/Intro';
import ChatBot from './components/ChatBot';
import BMICalculator from './components/BMICalculator';
import Footer from './components/Footer';
import Echat from './components/Echat';
import Profile from './components/Profile';
import ProfileSetup from './components/ProfileSetup';
import SetupProfile from './components/SetupProfile';

// ── Auth ─────────────────────────────────────────────────────────────────────
import Login from './auth/login';
import Signup from './auth/signup';
import ForgotPassword from './auth/ForgotPassword';

// ── Admin ────────────────────────────────────────────────────────────────────
import AdminLogin from './admin/AdminLogin';
import AdminDashboard from './admin/AdminDashboard';
import AdminRoute from './admin/AdminRoute';

// ── Route Guards ─────────────────────────────────────────────────────────────
import ExerciseAnalyzer from './pages/ExerciseAnalyzer';
/** Redirects unauthenticated users to /login */
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};

/** Redirects logged-in users away from auth pages */
const PublicOnlyRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? <Navigate to="/" replace /> : children;
};

// ── Dashboard Layout ─────────────────────────────────────────────────────────
const Dashboard = () => (
  <>
    <NavBar />
    <Intro />
    <ChatBot />
    <BMICalculator />
    <Footer />
  </>
);

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  return (
    <Provider store={store}>
      <Routes>

        {/* ── PUBLIC AUTH ROUTES ── */}
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicOnlyRoute>
              <Signup />
            </PublicOnlyRoute>
          }
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* ── ONBOARDING (semi-public — needs JWT token) ── */}
        <Route path="/setup-profile" element={<SetupProfile />} />

        {/* ── PROTECTED USER ROUTES ── */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/echatbot"
          element={
            <PrivateRoute>
              <NavBar />
              <Echat />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <NavBar />
              <Profile />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile-setup"
          element={
            <PrivateRoute>
              <NavBar />
              <ProfileSetup />
            </PrivateRoute>
          }
        />

        {/* ── ADMIN ROUTES ── */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        {/* Redirect /admin → /admin/dashboard */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

        {/* ── EXERCISE ANALYZER ── */}      
        <Route
          path="/analyze"
          element={
            <PrivateRoute>
              <NavBar />
              <ExerciseAnalyzer />
            </PrivateRoute>
        }
        />
        {/* ── 404 FALLBACK ── */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </Provider>
  );
}

export default App;