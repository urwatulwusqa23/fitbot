// src/components/BMICalculator.js
import React, { useState } from "react";
import { Container, Row, Col, Form, Button, Card, Nav } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

const FLASK_URL = process.env.REACT_APP_BMI_URL || "http://localhost:5050";

const BMICalculator = () => {
    // ── Manual tab ──
    const [height, setHeight]     = useState("");
    const [weight, setWeight]     = useState("");
    const [bmi, setBmi]           = useState(null);
    const [category, setCategory] = useState("");

    // ── Manual tab ──
    const [manualError, setManualError] = useState("");

    // ── Image tab ──
    const [imageFile, setImageFile]       = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [knownHeight, setKnownHeight]   = useState("");
    const [aiResult, setAiResult]         = useState(null);
    const [aiLoading, setAiLoading]       = useState(false);
    const [aiError, setAiError]           = useState("");

    // ── Tab ──
    const [activeTab, setActiveTab] = useState("manual");

    // ─────────────────────────────────────────────────────────────────────────
    // Manual BMI logic
    // ─────────────────────────────────────────────────────────────────────────
    const calculateBMI = () => {
        setManualError("");
        const h = parseFloat(height);
        const w = parseFloat(weight);
        if (!h || !w || h <= 0 || w <= 0) {
            setManualError("Please enter valid height and weight.");
            return;
        }
        if (h < 50 || h > 300) {
            setManualError("Height must be between 50 and 300 cm.");
            return;
        }
        if (w < 2 || w > 500) {
            setManualError("Weight must be between 2 and 500 kg.");
            return;
        }
        const hm = h / 100;
        const v = w / (hm * hm);
        setBmi(parseFloat(v.toFixed(1)));
        if (v < 18.5)       setCategory("Underweight");
        else if (v < 25)    setCategory("Normal weight");
        else if (v < 30)    setCategory("Overweight");
        else if (v < 35)    setCategory("Obese Class I");
        else                setCategory("Obese Class II+");
    };

    const getBMIColor = (val) => {
        if (!val) return "#aaa";
        if (val < 18.5) return "#3498db";
        if (val < 25)   return "#2ecc71";
        if (val < 30)   return "#f39c12";
        if (val < 35)   return "#e74c3c";
        return "#8e44ad";
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Image upload & API call
    // ─────────────────────────────────────────────────────────────────────────
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImageFile(file);
        setAiResult(null);
        setAiError("");
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result);
        reader.readAsDataURL(file);
    };

    const analyzeImage = async () => {
        if (!imageFile) { setAiError("Please select an image first."); return; }
        setAiLoading(true);
        setAiError("");
        setAiResult(null);
        try {
            const formData = new FormData();
            formData.append("image", imageFile);
            if (knownHeight) formData.append("height", knownHeight);

            const response = await fetch(`${FLASK_URL}/predict-bmi`, {
                method: "POST",
                body: formData,
            });
            const data = await response.json();
            if (!response.ok) {
                setAiError(data.error || "Analysis failed. Try a clearer full-body photo.");
            } else {
                setAiResult(data);
            }
        } catch {
            setAiError("Cannot reach the BMI server. Make sure bmi_api.py is running on port 5050.");
        } finally {
            setAiLoading(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // BMI Gauge bar component
    // ─────────────────────────────────────────────────────────────────────────
    const GaugeBar = ({ bmiVal, lo, hi }) => {
        const MIN = 14, MAX = 45;
        const pct = (v) => Math.min(100, Math.max(0, ((v - MIN) / (MAX - MIN)) * 100));
        const bands = [
            { from: 14, to: 18.5, color: "#3498db", name: "Underweight" },
            { from: 18.5, to: 25, color: "#2ecc71", name: "Normal" },
            { from: 25,   to: 30, color: "#f39c12", name: "Overweight" },
            { from: 30,   to: 35, color: "#e74c3c", name: "Obese I" },
            { from: 35,   to: 45, color: "#8e44ad", name: "Obese II+" },
        ];
        return (
            <div style={{ marginTop: "16px" }}>
                <div style={{ position: "relative", height: "28px", borderRadius: "6px", overflow: "hidden", display: "flex" }}>
                    {bands.map((b) => (
                        <div key={b.name} style={{ width: `${pct(b.to) - pct(b.from)}%`, backgroundColor: b.color, opacity: 0.85 }} />
                    ))}
                    {/* CI shading */}
                    {lo != null && hi != null && (
                        <div style={{
                            position: "absolute", left: `${pct(lo)}%`,
                            width: `${pct(hi) - pct(lo)}%`,
                            top: 0, bottom: 0, backgroundColor: "rgba(255,255,255,0.25)",
                        }} />
                    )}
                    {/* Needle */}
                    <div style={{
                        position: "absolute", left: `${pct(bmiVal)}%`,
                        top: 0, bottom: 0, width: "3px",
                        backgroundColor: "white", transform: "translateX(-50%)",
                    }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                    {bands.map((b) => (
                        <span key={b.name} style={{ fontSize: "10px", color: b.color, fontWeight: "600" }}>{b.name}</span>
                    ))}
                </div>
                {lo != null && hi != null && (
                    <p style={{ textAlign: "center", fontSize: "12px", color: "#a3a1b0", marginTop: "6px" }}>
                        90% Confidence Interval: {lo} – {hi}
                    </p>
                )}
            </div>
        );
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Method badge
    // ─────────────────────────────────────────────────────────────────────────
    const MethodBadge = ({ method }) => {
        const isDL = method === "deep_learning";
        return (
            <span style={{
                display: "inline-block",
                backgroundColor: isDL ? "#1a3a2a" : "#1a2a3a",
                color:           isDL ? "#2ecc71" : "#3498db",
                border: `1px solid ${isDL ? "#2ecc71" : "#3498db"}`,
                borderRadius: "20px", padding: "3px 12px",
                fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px",
                marginBottom: "12px",
            }}>
                {isDL ? "🧠 Deep Learning (DenseNet121)" : "🦴 Pose Estimation (MediaPipe)"}
            </span>
        );
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Shared styles
    // ─────────────────────────────────────────────────────────────────────────
    const inputStyle = {
        backgroundColor: "#1b122b", border: "1px solid #2e2440",
        color: "#dddddeff", borderRadius: "12px", padding: "10px",
    };
    const labelStyle = { fontWeight: "600", color: "white", fontSize: "13px" };

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <section id="bmi" style={{ backgroundColor: "#0c0814", color: "white", minHeight: "100vh", paddingTop: "80px" }}>
            <Container style={{ maxWidth: "850px" }}>

                {/* Title */}
                <div className="text-center mb-5">
                    <h2 style={{ fontSize: "48px", fontWeight: "700", color: "white" }}>
                        BMI{" "}
                        <span style={{ background: "linear-gradient(45deg, #7e3ae4, #b46cff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                            Calculator
                        </span>
                    </h2>
                    <p style={{ fontSize: "18px", color: "rgba(220,220,220,0.85)", maxWidth: "800px", margin: "25px auto 40px" }}>
                        Calculate your Body Mass Index manually or upload a photo for AI analysis
                    </p>
                </div>

                <Card style={{ backgroundColor: "#120d1f", border: "1px solid #292238", borderRadius: "10px", padding: "25px", boxShadow: "0 0 20px rgba(99,99,99,0.1)" }}>

                    {/* Tab switcher */}
                    <Nav variant="tabs" className="mb-4" style={{
                        display: "grid", backgroundColor: "#434343ff",
                        gridTemplateColumns: "1fr 1fr", textAlign: "center",
                        border: "3px solid #434343ff", borderRadius: "20px",
                    }}>
                        {[{ key: "manual", label: "📟 Manual Input" }, { key: "image", label: "📤 Image Analysis" }].map(({ key, label }) => (
                            <Nav.Item key={key} style={{ width: "100%" }}>
                                <Nav.Link eventKey={key} active={activeTab === key} onClick={() => setActiveTab(key)}
                                    style={{
                                        backgroundColor: activeTab === key ? "#080708ff" : "#434343ff",
                                        color: activeTab === key ? "#b77bff" : "#a3a1b0",
                                        borderRadius: "20px", fontWeight: "600",
                                        padding: "12px", fontSize: "15px", transition: "0.3s", width: "100%",
                                    }}>
                                    {label}
                                </Nav.Link>
                            </Nav.Item>
                        ))}
                    </Nav>

                    {/* ── MANUAL TAB ── */}
                    {activeTab === "manual" && (
                        <>
                            <Row className="mb-4">
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label style={labelStyle}>Height (cm)</Form.Label>
                                        <Form.Control type="number" placeholder="170" value={height}
                                            onChange={(e) => setHeight(e.target.value)} style={inputStyle} />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label style={labelStyle}>Weight (kg)</Form.Label>
                                        <Form.Control type="number" placeholder="70" value={weight}
                                            onChange={(e) => setWeight(e.target.value)} style={inputStyle} />
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Button onClick={calculateBMI} className="w-100" style={{
                                backgroundColor: "#8b5cf6", border: "none", fontWeight: "600",
                                padding: "10px", borderRadius: "14px", fontSize: "18px",
                                boxShadow: "0 0 15px rgba(139,92,246,0.4)",
                            }}>Calculate BMI</Button>

                            {manualError && (
                                <div style={{ marginTop: "12px", padding: "12px", backgroundColor: "#2a0a0a", border: "1px solid #7a1a1a", borderRadius: "10px", color: "#ff6b6b", fontSize: "14px" }}>
                                    ⚠️ {manualError}
                                </div>
                            )}

                            {bmi !== null && (
                                <div style={{ backgroundColor: "#1b122b", borderRadius: "16px", border: "1px solid #2e2440", padding: "20px", marginTop: "20px", textAlign: "center" }}>
                                    <p style={{ color: "#a3a1b0", marginBottom: "5px" }}>Your BMI</p>
                                    <h2 style={{ fontSize: "42px", fontWeight: "700", color: getBMIColor(bmi) }}>{bmi}</h2>
                                    <p style={{ color: "#b0acbc", fontSize: "15px", fontWeight: "600" }}>{category}</p>
                                    <GaugeBar bmiVal={bmi} lo={null} hi={null} />
                                    <div style={{ fontSize: "13px", color: "#a3a1b0", marginTop: "10px" }}>
                                        <p style={{ color: "#3498db" }}>Underweight: &lt; 18.5</p>
                                        <p style={{ color: "#2ecc71" }}>Normal: 18.5 – 24.9</p>
                                        <p style={{ color: "#f39c12" }}>Overweight: 25 – 29.9</p>
                                        <p style={{ color: "#e74c3c" }}>Obese Class I: 30 – 34.9</p>
                                        <p style={{ color: "#8e44ad" }}>Obese Class II+: ≥ 35</p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* ── IMAGE TAB ── */}
                    {activeTab === "image" && (
                        <div>
                            {/* Optional known height */}
                            <Form.Group className="mb-3">
                                <Form.Label style={labelStyle}>
                                    Known Height (cm) — optional, improves weight estimate
                                </Form.Label>
                                <Form.Control type="number" placeholder="e.g. 175"
                                    value={knownHeight} onChange={(e) => setKnownHeight(e.target.value)}
                                    style={{ ...inputStyle, maxWidth: "220px" }} />
                            </Form.Group>

                            {/* Drop zone */}
                            <div style={{ border: "2px dashed #3b2f56", borderRadius: "16px", padding: "30px", textAlign: "center", color: "#cfc9da", backgroundColor: "#0f0a1a" }}>
                                {imagePreview ? (
                                    <img src={imagePreview} alt="preview"
                                        style={{ maxHeight: "280px", maxWidth: "100%", borderRadius: "10px", marginBottom: "16px" }} />
                                ) : (
                                    <>
                                        <div style={{ fontSize: "48px", marginBottom: "10px" }}>📸</div>
                                        <p style={{ fontSize: "16px", marginBottom: "5px" }}>Upload a full-body photo</p>
                                        <p style={{ color: "#9b96a8", fontSize: "13px" }}>
                                            Best: front-facing, full body, good lighting, plain background
                                        </p>
                                    </>
                                )}
                                <Form.Control type="file" accept="image/*" onChange={handleImageChange}
                                    style={{ maxWidth: "300px", margin: "10px auto 0", backgroundColor: "transparent", border: "1px solid #3b2f56", color: "#cfc9da", cursor: "pointer" }} />
                            </div>

                            {/* Analyse button */}
                            <Button onClick={analyzeImage} disabled={!imageFile || aiLoading} className="w-100 mt-3"
                                style={{
                                    backgroundColor: aiLoading ? "#5a3f8a" : "#8b5cf6",
                                    border: "none", fontWeight: "600", padding: "10px",
                                    borderRadius: "14px", fontSize: "17px",
                                    boxShadow: "0 0 15px rgba(139,92,246,0.4)",
                                    cursor: aiLoading ? "not-allowed" : "pointer",
                                }}>
                                {aiLoading ? "⏳ Analysing… (10–30 seconds)" : "🔍 Analyse Photo"}
                            </Button>

                            {/* Error */}
                            {aiError && (
                                <div style={{ marginTop: "16px", padding: "14px", backgroundColor: "#2a0a0a", border: "1px solid #7a1a1a", borderRadius: "10px", color: "#ff6b6b", fontSize: "14px" }}>
                                    ⚠️ {aiError}
                                </div>
                            )}

                            {/* Results */}
                            {aiResult && (
                                <div style={{ backgroundColor: "#1b122b", borderRadius: "16px", border: "1px solid #2e2440", padding: "24px", marginTop: "20px", textAlign: "center" }}>

                                    {/* Method badge */}
                                    <MethodBadge method={aiResult.method} />

                                    {aiResult.low_visibility && (
                                        <p style={{ color: "#f39c12", fontSize: "12px", marginBottom: "10px" }}>
                                            ⚠️ Low pose visibility — accuracy may be reduced.
                                        </p>
                                    )}

                                    <p style={{ color: "#a3a1b0", marginBottom: "4px" }}>AI Estimated BMI</p>
                                    <h2 style={{ fontSize: "52px", fontWeight: "700", color: aiResult.cat_color }}>{aiResult.bmi}</h2>
                                    <p style={{ color: aiResult.cat_color, fontSize: "16px", fontWeight: "700" }}>{aiResult.category}</p>

                                    <GaugeBar bmiVal={aiResult.bmi} lo={aiResult.bmi_lo} hi={aiResult.bmi_hi} />

                                    {/* Stats row — only show height/weight if they were returned */}
                                    <Row className="mt-3">
                                        {aiResult.height_cm != null && (
                                            <Col>
                                                <div style={{ backgroundColor: "#120d1f", borderRadius: "10px", padding: "12px", border: "1px solid #2e2440" }}>
                                                    <p style={{ color: "#a3a1b0", fontSize: "11px", marginBottom: "4px" }}>Est. Height</p>
                                                    <p style={{ color: "white", fontSize: "15px", fontWeight: "700", margin: 0 }}>{aiResult.height_cm} cm</p>
                                                </div>
                                            </Col>
                                        )}
                                        {aiResult.weight_kg != null && (
                                            <Col>
                                                <div style={{ backgroundColor: "#120d1f", borderRadius: "10px", padding: "12px", border: "1px solid #2e2440" }}>
                                                    <p style={{ color: "#a3a1b0", fontSize: "11px", marginBottom: "4px" }}>Est. Weight</p>
                                                    <p style={{ color: "white", fontSize: "15px", fontWeight: "700", margin: 0 }}>{aiResult.weight_kg} kg</p>
                                                </div>
                                            </Col>
                                        )}
                                        <Col>
                                            <div style={{ backgroundColor: "#120d1f", borderRadius: "10px", padding: "12px", border: "1px solid #2e2440" }}>
                                                <p style={{ color: "#a3a1b0", fontSize: "11px", marginBottom: "4px" }}>90% CI</p>
                                                <p style={{ color: "white", fontSize: "15px", fontWeight: "700", margin: 0 }}>{aiResult.bmi_lo} – {aiResult.bmi_hi}</p>
                                            </div>
                                        </Col>
                                    </Row>

                                    <p style={{ color: "#7a7090", fontSize: "11px", marginTop: "14px" }}>
                                        ⚕️ Educational use only. ±2–4 BMI points is normal. Consult a doctor for medical assessment.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </Card>
            </Container>
        </section>
    );
};

export default BMICalculator;