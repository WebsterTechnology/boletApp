import React from "react";
import { FaWhatsapp } from "react-icons/fa";

export default function Support() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#111",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 25,
          width: 350,
          textAlign: "center",
        }}
      >
        <FaWhatsapp
          size={60}
          color="#25D366"
        />

        <h2>Sipò Kliyan</h2>

        <p>
          Chwazi youn nan nimewo WhatsApp
          sa yo pou kontakte nou.
        </p>

        <a
          href="https://wa.me/+5551989171342"
          target="_blank"
          rel="noreferrer"
          style={{
            display: "block",
            background: "#25D366",
            color: "#fff",
            textDecoration: "none",
            padding: 14,
            borderRadius: 8,
            marginTop: 15,
            fontWeight: "bold",
          }}
        >
          WhatsApp 1
        </a>

        <a
          href="https://wa.me/+555492669595"
          target="_blank"
          rel="noreferrer"
          style={{
            display: "block",
            background: "#25D366",
            color: "#fff",
            textDecoration: "none",
            padding: 14,
            borderRadius: 8,
            marginTop: 12,
            fontWeight: "bold",
          }}
        >
          WhatsApp 2
        </a>
      </div>
    </div>
  );
}