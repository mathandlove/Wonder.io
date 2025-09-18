/**
 * Wrapper component that adds "enter from bottom" animation to its children.
 * Provides consistent entrance animation for all scene content.
 */
// src/components/FlowLayout.tsx
import React from "react";

export function FlowLayout({ children, keyId }: { children: React.ReactNode; keyId: string }) {
  // Keep animation simple for now (CSS). Hook up framer-motion later if desired.
  return (
    <div
      data-flow-key={keyId}
      style={{
        transform: "translateY(80px)",
        opacity: 0,
        animation: "flowIn 350ms ease-out forwards",
      }}
    >
      {children}
      <style>{`
        @keyframes flowIn {
          from { transform: translateY(80px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}