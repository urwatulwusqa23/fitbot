import React from "react";
import { Navbar, Nav, Container, Dropdown } from "react-bootstrap";
import { FaDumbbell, FaUser } from "react-icons/fa";
import { useNavigate,Link } from 'react-router-dom';
const NavBar = () => {
    const navigate = useNavigate();

    const handleLogout = (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        navigate('/login');
    };

    const linkStyle = {
        color: "#fff",
        transition: "color 0.3s ease"
    };

    const hoverOn = (e) => (e.target.style.color = "#b46cff");
    const hoverOff = (e) => (e.target.style.color = "#fff");

    return (
        <Navbar
            expand="lg"
            fixed="top"
            style={{
                background: "#1e1e1e",
                backdropFilter: "blur(10px)",
                borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                zIndex: "1000",
            }}
        >
            <Container fluid style={{ display: "flex", justifyContent: "space-between" }}>
                <Navbar.Brand
                    href="/"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        fontWeight: "700",
                        fontSize: "1.4rem",
                        background: "linear-gradient(45deg, #7e3ae4ff, #b46cff)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                    }}
                >
                    <FaDumbbell style={{ marginRight: "10px", color: "#b46cff", fontSize: "1.5rem" }} />
                    FitBot AI
                </Navbar.Brand>

                <Navbar.Toggle aria-controls="navbarScroll" style={{ background: "#b46cff" }} />

                <Navbar.Collapse id="navbarScroll" className="justify-content-end">
                    <Nav
                        className="my-2 my-lg-0"
                        navbarScroll
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "25px",
                            fontSize: "1rem",
                            fontWeight: "600",
                        }}
                    >
                        <Nav.Link
                            as={Link}    // Change this
                            to="/"       // Change href to to
                            style={linkStyle}
                            onMouseEnter={hoverOn}
                            onMouseLeave={hoverOff}
                        >
                            Home
                        </Nav.Link>

                        <Nav.Link
                            href="/echatbot"
                            style={linkStyle}
                            onMouseEnter={hoverOn}
                            onMouseLeave={hoverOff}
                        >
                            AI Assistant
                        </Nav.Link>

                        <Nav.Link
                            href="/analyze"
                            style={linkStyle}
                            onMouseEnter={hoverOn}
                            onMouseLeave={hoverOff}
                        >
                            Exercise Analyzer
                        </Nav.Link>

                        <Nav.Link
                            onClick={(e) => {
                                e.preventDefault();
                                if (window.location.pathname !== '/') {
                                    window.location.href = '/#bmi';
                                } else {
                                    document.getElementById('bmi')?.scrollIntoView({ behavior: 'smooth' });
                                }
                            }}
                            href="#bmi"
                            style={linkStyle}
                            onMouseEnter={hoverOn}
                            onMouseLeave={hoverOff}
                        >
                            BMI Calculator
                        </Nav.Link>
                        {/* ✅ NEW — Saved Plans link */}
                        <Nav.Link
                            href="/saved"
                            style={{
                                color: "#b46cff",
                                transition: "color 0.3s ease",
                                display: "flex",
                                alignItems: "center",
                                gap: "5px",
                            }}
                            onMouseEnter={(e) => (e.target.style.color = "#fff")}
                            onMouseLeave={(e) => (e.target.style.color = "#b46cff")}
                        >
                            💾 Saved
                        </Nav.Link>

                        {/* ── User Dropdown ── */}
                        <Dropdown align="end">
                            <Dropdown.Toggle
                                variant="link"
                                as="span"
                                id="dropdown-basic"
                                style={{
                                    background: "transparent",
                                    border: "none",
                                    padding: "0",
                                    marginLeft: "10px",
                                }}
                            >
                                <FaUser
                                    style={{
                                        color: "#fff",
                                        fontSize: "1.2rem",
                                        cursor: "pointer",
                                        transition: "color 0.3s ease",
                                    }}
                                    onMouseEnter={(e) => (e.target.style.color = "#b46cff")}
                                    onMouseLeave={(e) => (e.target.style.color = "#fff")}
                                />
                            </Dropdown.Toggle>

                            <Dropdown.Menu
                                align="end"
                                style={{
                                    backgroundColor: "#1e1e1e",
                                    border: "1px solid rgba(255, 255, 255, 0.1)",
                                    borderRadius: "10px",
                                    minWidth: "180px",
                                    marginTop: '19px',
                                }}
                            >
                                <Dropdown.Item
                                    href="/Profile"
                                    style={{ color: "#b46cff", fontSize: "0.9rem", borderRadius: "20px" }}
                                    onMouseEnter={(e) => (e.target.style.color = "#fff")}
                                    onMouseLeave={(e) => (e.target.style.color = "#b46cff")}
                                >
                                    👤 My Profile
                                </Dropdown.Item>

                                {/* ✅ NEW — Saved Plans in dropdown */}
                                <Dropdown.Item
                                    href="/saved"
                                    style={{ color: "#b46cff", fontSize: "0.9rem", borderRadius: "20px" }}
                                    onMouseEnter={(e) => (e.target.style.color = "#fff")}
                                    onMouseLeave={(e) => (e.target.style.color = "#b46cff")}
                                >
                                    💾 My Saved Plans
                                </Dropdown.Item>

                                <Dropdown.Divider style={{ borderColor: "rgba(255, 255, 255, 0.1)" }} />

                                <Dropdown.Item
                                    onClick={handleLogout}
                                    style={{ color: "#ff4d4d", fontSize: "0.9rem", fontWeight: "600", borderRadius: "20px", cursor: "pointer" }}
                                    onMouseEnter={(e) => (e.target.style.color = "#ff6b6b")}
                                    onMouseLeave={(e) => (e.target.style.color = "#ff4d4d")}
                                >
                                    Logout
                                </Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};

export default NavBar;