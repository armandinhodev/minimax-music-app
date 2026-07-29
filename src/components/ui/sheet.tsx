"use client";

import { Button } from "@/components/ui/button";

function Sheet({ open, onOpenChange, children }: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          zIndex: 40,
        }}
        onClick={() => onOpenChange?.(false)}
      />
      {children}
    </div>
  );
}

function SheetContent({ side = "right", onClose, children, className }: {
  side?: "top" | "right" | "bottom" | "left";
  onClose?: () => void;
  children?: React.ReactNode;
  className?: string;
}) {
  const getPosition = () => {
    switch (side) {
      case "top": return { top: 0, left: 0, right: 0 };
      case "bottom": return { bottom: 0, left: 0, right: 0 };
      case "left": return { top: 0, bottom: 0, left: 0 };
      case "right": return { top: 0, bottom: 0, right: 0 };
    }
  };

  const width = (side === "left" || side === "right") ? "24rem" : "100%";
  const height = (side === "top" || side === "bottom") ? "auto" : "100%";

  return (
    <div
      style={{
        position: "fixed",
        zIndex: 50,
        background: "white",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        padding: "1rem",
        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
        width,
        height,
        ...getPosition(),
      }}
      className={className}
    >
      {children}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        style={{ position: "absolute", top: "0.75rem", right: "0.75rem" }}
      >
        X
      </Button>
    </div>
  );
}

function SheetHeader({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: "0.125rem" }} className={className}>{children}</div>;
}

function SheetFooter({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }} className={className}>{children}</div>;
}

function SheetTitle({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <div style={{ fontSize: "1rem", fontWeight: 500 }} className={className}>{children}</div>;
}

function SheetDescription({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <div style={{ fontSize: "0.875rem", color: "#6b7280" }} className={className}>{children}</div>;
}

function SheetTrigger({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) {
  return <button type="button" onClick={onClick}>{children}</button>;
}

function SheetClose(props: React.HTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} />;
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
