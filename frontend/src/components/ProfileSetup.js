import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import '../auth/auth.css';

export default function ProfileSetup() {
  const [profile, setProfile] = useState({
    age: '',
    gender: 'Male',
    height: '',
    weight: '',
    targetWeight: '',
    healthIssues: ''
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.completeOnboarding({
        age: parseInt(profile.age) || 0,
        gender: profile.gender,
        height: parseFloat(profile.height) || 0,
        weight: parseFloat(profile.weight) || 0,
        targetWeight: parseFloat(profile.targetWeight) || 0,
        healthIssues: profile.healthIssues || ''
      });
      navigate('/');
    } catch (err) {
      console.error(err);
      setError('Could not save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>Tell Us About You</h2>
        <p className="subtitle">So FitBot can give you personalised advice</p>

        {error && <div style={{ color: '#ff6b6b', marginBottom: '12px', fontSize: '14px' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="input-group">
              <label>Age</label>
              <input type="number" required min="1" max="120"
                value={profile.age}
                onChange={e => setProfile({ ...profile, age: e.target.value })} />
            </div>
            <div className="input-group">
              <label>Gender</label>
              <select value={profile.gender}
                onChange={e => setProfile({ ...profile, gender: e.target.value })}>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          <div className="row">
            <div className="input-group">
              <label>Height (cm)</label>
              <input type="number" required placeholder="175" min="50" max="280"
                value={profile.height}
                onChange={e => setProfile({ ...profile, height: e.target.value })} />
            </div>
            <div className="input-group">
              <label>Weight (kg)</label>
              <input type="number" required placeholder="70" min="2" max="500"
                value={profile.weight}
                onChange={e => setProfile({ ...profile, weight: e.target.value })} />
            </div>
          </div>

          <div className="input-group">
            <label>Target Weight (kg) — optional</label>
            <input type="number" placeholder="e.g. 65" min="2" max="500"
              value={profile.targetWeight}
              onChange={e => setProfile({ ...profile, targetWeight: e.target.value })} />
          </div>

          <div className="input-group">
            <label>Medical Conditions (Optional)</label>
            <input type="text" placeholder="e.g. Diabetes, Knee pain"
              value={profile.healthIssues}
              onChange={e => setProfile({ ...profile, healthIssues: e.target.value })} />
          </div>

          <button type="submit" className="primary-btn" disabled={saving}>
            {saving ? 'Saving...' : 'Start Chatting →'}
          </button>
        </form>
      </div>
    </div>
  );
}
