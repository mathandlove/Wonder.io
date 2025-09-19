/**
 * Wrapper component that adds "enter from bottom" animation to its children.
 * Provides consistent entrance animation for all scene content.
 * Now supports character panel gutters via CSS variables.
 */
import React from "react";

export function FlowLayout({
  children,
  keyId,
  allowFullBleed
}: {
  children: React.ReactNode;
  keyId: string;
  allowFullBleed?: boolean;
}) {
  return (
    <div
      data-flow-key={keyId}
      style={{
        transform: "translateY(80px)",
        opacity: 0,
        animation: "flowIn 350ms ease-out forwards",
        paddingLeft: allowFullBleed ? 0 : "var(--character-gutter-left, 0px)",
        paddingRight: allowFullBleed ? 0 : "var(--character-gutter-right, 0px)",
        transition: "padding 220ms ease",
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