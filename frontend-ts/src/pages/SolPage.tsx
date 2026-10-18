import React from "react";
import { Link } from "react-router-dom";

export default function SolPage() {
  return (
    <main style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: 24, background: "#171b2e", color: "white" }}>
      <section style={{ textAlign: "center", maxWidth: 540 }}>
        <h1 style={{ color: "#ffd22a", fontSize: "3rem" }}>Sòl</h1>
        <h2>An preparasyon</h2>
        <p>Nou ap travay sou nouvo sèvis sa a. Li ap disponib byento.</p>
        <Link to="/" style={{ color: "#ffd22a" }}>Retounen nan akèy</Link>
      </section>
    </main>
  );
}
