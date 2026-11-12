"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "eshantva_arattai_welcome_v1";
const CHAT_URL = "https://aratt.ai/message/@eshantva3dstudio";
const DOWNLOAD_URL = "https://www.arattai.in/download.html";

export function ArattaiWelcomeGuide() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(STORAGE_KEY) === "dismissed";
    } catch {
      // Storage might be disabled.
    }
    if (dismissed) return;

    const timer = window.setTimeout(() => setOpen(true), 400);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") dismiss();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "dismissed");
    } catch {
      // Closing must still work without storage.
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483000,
        background: "rgba(9,18,30,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="arattai-guide-title"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 440,
          maxHeight: "90dvh",
          overflowY: "auto",
          borderRadius: 20,
          background: "#ffffff",
          color: "#172536",
          padding: 24,
          boxShadow: "0 20px 65px rgba(0,0,0,.26)"
        }}
      >
        <button
          type="button"
          aria-label="Close Arattai guide"
          onClick={dismiss}
          autoFocus
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: "1px solid #d5dce3",
            background: "#f5f7f9",
            color: "#172536",
            fontSize: 26,
            cursor: "pointer"
          }}
        >
          ×
        </button>

        <p style={{ color: "#087e83", fontWeight: 700 }}>
          ESHANTVA Customer Support
        </p>
        <h2 id="arattai-guide-title" style={{ fontSize: 23, paddingRight: 36 }}>
          Connect with us on Arattai
        </h2>
        <p>
          Arattai installed? Open our chat directly.
          New to Arattai? Follow these simple steps.
        </p>

        <ol style={{ paddingLeft: 22, lineHeight: 1.85 }}>
          <li>Download Arattai from its official website.</li>
          <li>Open the app and agree to its terms.</li>
          <li>Enter your mobile number and verify the OTP.</li>
          <li>Set up your name and optional profile photo.</li>
          <li>Return here and select Open ESHANTVA Chat.</li>
        </ol>

        <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
          <a
            href={CHAT_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={dismiss}
            style={{
              padding: 14,
              textAlign: "center",
              borderRadius: 12,
              background: "#087e83",
              color: "#fff",
              fontWeight: 700
            }}
          >
            Open ESHANTVA Chat
          </a>

          <a
            href={DOWNLOAD_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: 14,
              textAlign: "center",
              borderRadius: 12,
              border: "1px solid #087e83",
              color: "#087e83",
              fontWeight: 700
            }}
          >
            Download Arattai
          </a>

          <button
            type="button"
            onClick={dismiss}
            style={{
              padding: 12,
              background: "transparent",
              border: "none",
              color: "#455565",
              cursor: "pointer"
            }}
          >
            Not now
          </button>
        </div>
      </section>
    </div>
  );
}