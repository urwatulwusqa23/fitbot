import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { FaRulerVertical, FaWeight, FaBirthdayCake, FaVenusMars, FaBullseye } from 'react-icons/fa';
import './SetupProfile.css'; // We will create this CSS next

export default function SetupProfile() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    age: '',
    gender: 'Male',
    weight: '',
    height: '',
    targetWeight: '',
    healthIssues: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.completeOnboarding({
        age: parseInt(formData.age) || 0,
        gender: formData.gender,
        height: parseFloat(formData.height) || 0,
        weight: parseFloat(formData.weight) || 0,
        targetWeight: parseFloat(formData.targetWeight) || 0,
        healthIssues: formData.healthIssues || ''
      });
      navigate('/');
    } catch (err) {
      console.error(err);
      setError('Could not save profile. Please try again.');
    }
  };

  return (
    <div className="setup-overlay">
      <div className="setup-modal">
        <div className="setup-header">
            <h2>Let's Get Started! 🚀</h2>
            <p>Help FitBot customize your experience.</p>
        </div>

        {error && <div className="setup-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          
          <div className="setup-grid">
            {/* Age */}
            <div className="setup-group">
                <label><FaBirthdayCake/> Age</label>
                <input 
                    type="number" 
                    required 
                    value={formData.age}
                    onChange={(e) => setFormData({...formData, age: e.target.value})}
                />
            </div>

            {/* Gender */}
            <div className="setup-group">
                <label><FaVenusMars/> Gender</label>
                <select 
                    value={formData.gender}
                    onChange={(e) => setFormData({...formData, gender: e.target.value})}
                >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                </select>
            </div>

            {/* Weight */}
            <div className="setup-group">
                <label><FaWeight/> Weight (kg)</label>
                <input 
                    type="number" 
                    required 
                    placeholder="e.g. 70"
                    value={formData.weight}
                    onChange={(e) => setFormData({...formData, weight: e.target.value})}
                />
            </div>

            {/* Height */}
            <div className="setup-group">
                <label><FaRulerVertical/> Height (cm)</label>
                <input 
                    type="number" 
                    required 
                    placeholder="e.g. 175"
                    value={formData.height}
                    onChange={(e) => setFormData({...formData, height: e.target.value})}
                />
            </div>
          </div>

          {/* Target Weight */}
          <div className="setup-group full-width">
              <label><FaBullseye/> Target Weight (kg) — optional</label>
              <input
                  type="number"
                  placeholder="e.g. 65"
                  min="2" max="500"
                  value={formData.targetWeight}
                  onChange={(e) => setFormData({...formData, targetWeight: e.target.value})}
              />
          </div>
          
           {/* Health Issues (Optional) */}
           <div className="setup-group full-width">
              <label>Medical Conditions (Optional)</label>
              <input 
                  type="text" 
                  placeholder="Any injuries, diabetes, etc."
                  value={formData.healthIssues}
                  onChange={(e) => setFormData({...formData, healthIssues: e.target.value})}
              />
          </div>

          <button type="submit" className="setup-btn">Complete Setup</button>
        </form>
      </div>
    </div>
  );
}