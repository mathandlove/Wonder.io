import React from "react";

type Props = {
  keyId: string;
  panelRestricted?: boolean;
  children: React.ReactNode;
};

export function FlowLayout({ keyId, panelRestricted = false, children }: Props) {
  const style: React.CSSProperties = panelRestricted
    ? {
        // Squeeze between panel widths when restricted
        paddingLeft: "var(--panel-left-width, 0px)",
        paddingRight: "var(--panel-right-width, 0px)",
        maxWidth: "unset",
        width: "100%",
        margin: "0 auto",
        transform: "translateY(80px)",
        opacity: 0,
        animation: "flowIn 350ms ease-out forwards",
        transition: "padding 220ms ease",
      }
    : {
        // Full bleed when not restricted
        paddingLeft: 0,
        paddingRight: 0,
        maxWidth: "100%",
        width: "100%",
        margin: "0 auto",
        transform: "translateY(80px)",
        opacity: 0,
        animation: "flowIn 350ms ease-out forwards",
        transition: "padding 220ms ease",
      };

  return (
    <div
      className={panelRestricted ? "flow flow--restricted" : "flow"}
      data-flow-key={keyId}
      style={style}
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