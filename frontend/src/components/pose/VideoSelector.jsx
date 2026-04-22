// src/components/pose/VideoSelector.jsx
import { useEffect, useState } from "react";
import { api } from "../../services/api";

export default function VideoSelector({ onSelect }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  // useEffect(() => {
  //   fetch("http://localhost:5076/api/video")
  //     .then(r => r.json())
  //     .then(data => { setVideos(data); setLoading(false); })
  //     .catch(() => { setError("Failed to load exercises."); setLoading(false); });
  // }, []);

  useEffect(() => {
    api.getVideos()
      .then(data => { setVideos(data); setLoading(false); })
      .catch(() => { setError("Failed to load exercises."); setLoading(false); });
  }, []);

  const filtered = videos.filter(v =>
    v.title.toLowerCase().includes(search.toLowerCase()) ||
    v.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return <p>Loading exercises...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div>
      <input
        type="text"
        placeholder="Search exercises (e.g. shoulder, squat)..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 20, fontSize: 16 }}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {filtered.map(video => (
          <div
            key={video.id}
            onClick={() => onSelect(video)}
            style={{
              border: "1px solid #ddd", borderRadius: 10, overflow: "hidden",
              cursor: "pointer", transition: "box-shadow 0.2s",
              boxShadow: "0 2px 6px rgba(0,0,0,0.08)"
            }}
          >
            {/* YouTube thumbnail */}
            <img
              src={`https://img.youtube.com/vi/${extractYouTubeId(video.link)}/mqdefault.jpg`}
              alt={video.title}
              style={{ width: "100%", height: 160, objectFit: "cover" }}
            />
            <div style={{ padding: 12 }}>
              <h3 style={{ margin: "0 0 6px", fontSize: 15 }}>{video.title}</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {video.tags?.slice(0, 3).map(tag => (
                  <span key={tag} style={{
                    background: "#e8f4ff", color: "#0066cc",
                    borderRadius: 12, padding: "2px 8px", fontSize: 12
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
              <button style={{
                marginTop: 10, width: "100%", padding: "8px 0",
                background: "#0066cc", color: "#fff", border: "none",
                borderRadius: 6, cursor: "pointer", fontWeight: 600
              }}>
                Start Exercise →
              </button>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <p>No exercises found for "{search}"</p>}
    </div>
  );
}

export function extractYouTubeId(url) {
  const match = url?.match(/[?&]v=([^&]+)/) || url?.match(/youtu\.be\/([^?]+)/);
  return match ? match[1] : "";
}