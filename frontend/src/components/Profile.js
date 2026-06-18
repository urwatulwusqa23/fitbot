import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import NavBar from './NavBar';
import hero from '../assests/fitness-hero.jpg'; // CRITICAL: Image import
import { 
  FaBirthdayCake, FaVenusMars, FaRulerVertical, FaWeight, 
  FaEdit, FaNotesMedical, FaClock, FaUser, FaBullseye, FaSave, 
  FaTrash, FaPen, FaHistory
} from 'react-icons/fa';
import './Profile.css';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  
  // Editable State, initialized from profile
  const [editForm, setEditForm] = useState({});
  const [message, setMessage] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      try {
        const profileData = await api.getProfile();
        if (cancelled) return;
        if (!profileData) {
          navigate('/setup-profile');
          return;
        }
        setProfile(profileData);
        setEditForm(profileData); // Initialize form with current data
        const logsData = await api.getBmiLogs();
        if (cancelled) return;
        setLogs(logsData);
      } catch (err) {
        if (!cancelled) console.error("Error loading data:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadData();
    return () => { cancelled = true; };
  }, [navigate]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      // Ensure numerical types are sent correctly for the backend DTO
      const dataToSend = {
          ...editForm,
          age: parseInt(editForm.age) || 0,
          height: parseFloat(editForm.height) || 0,
          weight: parseFloat(editForm.weight) || 0,
          targetWeight: parseFloat(editForm.targetWeight) || 0,
      };

      const updated = await api.updateProfile(dataToSend);
      setProfile(updated); // Update UI
      setMessage('Changes saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error("Update failed:", err);
      setMessage('Failed to save changes. Check console for details.');
    }
  };
  
  // --- Background Styles (To integrate the image) ---
  const backgroundStyle = {
    backgroundImage: `url(${hero})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  };

  const overlayStyle = {
    position: "absolute",
    inset: "0",
    background: "linear-gradient(to bottom, rgba(6, 6, 7, 0.9), rgba(4, 3, 5, 0.85), rgba(11, 11, 12, 0.9))",
    zIndex: 0,
  };


  const renderTabContent = () => {
    switch (activeTab) {
      // --- OVERVIEW TAB ---
      case 'Overview':
        return (
          <div className="tab-content fade-in">
             <div className="section-header">
                <h3>Health Stats</h3>
                <button className="icon-btn" onClick={() => setActiveTab('Settings')}>
                    <FaEdit /> Edit
                </button>
             </div>

             <div className="stats-grid">
                <div className="stat-card">
                  <div className="icon-circle blue"><FaBirthdayCake /></div>
                  <span className="stat-label">Age</span>
                  <span className="stat-value">{profile?.age} Years</span>
                </div>
                <div className="stat-card">
                  <div className="icon-circle pink"><FaVenusMars /></div>
                  <span className="stat-label">Gender</span>
                  <span className="stat-value">{profile?.gender}</span>
                </div>
                <div className="stat-card">
                  <div className="icon-circle green"><FaRulerVertical /></div>
                  <span className="stat-label">Height</span>
                  <span className="stat-value">{profile?.height} cm</span>
                </div>
                <div className="stat-card">
                  <div className="icon-circle orange"><FaWeight /></div>
                  <span className="stat-label">Weight</span>
                  <span className="stat-value">{profile?.weight} kg</span>
                </div>
              </div>

              <div className="bmi-banner-large">
                <span className="bmi-subtitle">Current BMI</span>
                <div className="bmi-value-large">{profile?.bmiValue?.toFixed(1)}</div>
                <div className="bmi-status-pill">
                    {profile?.bmiValue < 18.5 ? 'Underweight' :
                     profile?.bmiValue < 25   ? 'Normal Weight' :
                     profile?.bmiValue < 30   ? 'Overweight' :
                     profile?.bmiValue < 35   ? 'Obese Class I' : 'Obese Class II+'}
                </div>
              </div>

              <div className="info-card warning-card">
                <div className="card-title text-orange">
                    <FaNotesMedical /> Medical Notes
                </div>
                <p className="card-text">{profile?.healthIssues || "No medical conditions"}</p>
              </div>

              <div className="info-card activity-card">
                 <div className="card-title">
                    <FaClock /> Recent Activity
                </div>
                 <p className="card-text">
                    <span className="date-badge">{new Date().toLocaleDateString()}</span> Last profile update.
                 </p>
              </div>
          </div>
        );

      // --- BMI LOGS TAB ---
      case 'BMI Logs':
        return (
          <div className="tab-content fade-in">
            <div className="info-card">
                <div className="card-title"><FaHistory/> BMI History</div>
                <div className="logs-list">
                    {logs.map(log => (
                        <div key={log.id} className="log-item">
                            <span className="log-date">{new Date(log.dateRecorded).toLocaleDateString()}</span>
                            <span className="log-weight">{log.weight} kg</span>
                            <span className={`log-bmi ${log.bmiValue < 25 ? 'good' : 'bad'}`}>
                                BMI: {log.bmiValue.toFixed(1)}
                            </span>
                        </div>
                    ))}
                    {logs.length === 0 && <p className="text-muted no-data">No BMI history yet.</p>}
                </div>
            </div>
          </div>
        );

      // --- GOALS TAB ---
      case 'Goals':
        return (
            <div className="tab-content fade-in">
                <div className="info-card goals-card">
                    <div className="card-title"><FaBullseye/> Personal Goals</div>
                    
                    <div className="goal-list">
                        <div className="goal-item">
                            <div className="goal-info">
                                <span className="goal-name">Target Weight</span>
                                <span className="goal-target">
                                  Target: {profile?.targetWeight ? `${profile.targetWeight} kg` : 'Not Set'}
                                </span>
                            </div>
                            <div className="goal-actions">
                                <button className="icon-action" onClick={() => setActiveTab('Settings')}><FaPen/></button>
                            </div>
                        </div>

                        <div className="goal-item">
                            <div className="goal-info">
                                <span className="goal-name">Reach Healthy BMI</span>
                                <span className="goal-target">Target: 24.0</span>
                            </div>
                            <div className="goal-actions">
                                <button className="icon-action"><FaPen/></button>
                                <button className="icon-action delete"><FaTrash/></button>
                            </div>
                        </div>
                    </div>
                    {message && <div className="success-msg">{message}</div>}
                </div>
            </div>
        );

      // --- SETTINGS TAB ---
      case 'Settings':
        return (
            <div className="tab-content fade-in">
                <div className="info-card">
                    <div className="section-header">
                        <h3><FaEdit/> Edit Profile Details</h3>
                        {message && <span className="success-text">{message}</span>}
                    </div>
                    
                    <form onSubmit={handleUpdate} className="settings-form">
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label>Age</label>
                                <input type="number" className="dark-input" 
                                    value={editForm.age || ''} onChange={e => setEditForm({...editForm, age: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>Gender</label>
                                <select className="dark-input" 
                                    value={editForm.gender || 'Male'} onChange={e => setEditForm({...editForm, gender: e.target.value})}>
                                    <option>Male</option>
                                    <option>Female</option>
                                    <option>Other</option>
                                </select>
                            </div>
                        </div>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label>Height (cm)</label>
                                <input type="number" className="dark-input" 
                                    value={editForm.height || ''} onChange={e => setEditForm({...editForm, height: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>Weight (kg)</label>
                                <input type="number" className="dark-input" 
                                    value={editForm.weight || ''} onChange={e => setEditForm({...editForm, weight: e.target.value})} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Target Weight (Goal)</label>
                            <input type="number" className="dark-input" placeholder="e.g. 70"
                                value={editForm.targetWeight || ''} onChange={e => setEditForm({...editForm, targetWeight: e.target.value})} />
                        </div>

                        <div className="form-group">
                            <label>Medical Conditions</label>
                            <textarea className="dark-input" rows="3"
                                value={editForm.healthIssues || ''} onChange={e => setEditForm({...editForm, healthIssues: e.target.value})} />
                        </div>

                        <button type="submit" className="save-btn-full"><FaSave/> Save Changes</button>
                    </form>
                    
                    <div className="danger-zone">
                        <button className="reset-btn">Reset All Data</button>
                    </div>
                </div>
            </div>
        );

      default: return null;
    }
  };

  if (loading) return <div className="loading-screen">Loading Profile...</div>;

  return (
    <>
      <NavBar />
      
      {/* Container for the image background and overlay */}
      <div className="profile-image-container" style={backgroundStyle}>
        <div style={overlayStyle}></div> 
        
        {/* Content layer (z-index > 0) */}
        <div className="profile-content-wrapper-zindex">
          <div className="profile-header">
            <div className="avatar-circle"><FaUser /></div>
            
            {/* Display actual username and email */}
            <h2>{profile?.username || "Guest User"}</h2>
            <p className="email-text">{profile?.email || "email@notprovided.com"}</p>
          </div>

          <div className="tabs-wrapper">
              <div className="tabs-pill">
                  {['Overview', 'BMI Logs', 'Goals', 'Settings'].map(tab => (
                  <button 
                      key={tab} 
                      className={`tab-item ${activeTab === tab ? 'active' : ''}`}
                      onClick={() => { setActiveTab(tab); setMessage(''); }}
                  >
                      {tab}
                  </button>
                  ))}
              </div>
          </div>

          <div className="content-wrapper">
              {renderTabContent()}
          </div>
        </div>
      </div>
    </>
  );
}