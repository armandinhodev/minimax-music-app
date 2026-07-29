"use client";

import { Button } from "@/components/ui/button";

function Dialog({ open, onOpenChange, children }: {
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
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function DialogContent({ onClose, children, className }: {
  onClose?: () => void;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: "0.75rem",
        padding: "1rem",
        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
        maxWidth: "100%",
        width: "100%",
        maxHeight: "85vh",
        overflowY: "auto",
        position: "relative",
      }}
      className={className}
    >
      {children}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        style={{ position: "absolute", top: "0.5rem", right: "0.5rem" }}
      >
        X
      </Button>
    </div>
  );
}

function DialogHeader({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.5rem" }} className={className}>
      {children}
    </div>
  );
}

function DialogFooter({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: "0.5rem",
        marginTop: "1rem",
        paddingTop: "1rem",
        borderTop: "1px solid #e5e7eb",
      }}
      className={className}
    >
      {children}
    </div>
  );
}

function DialogTitle({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <div style={{ fontSize: "1rem", fontWeight: 500 }} className={className}>{children}</div>;
}

function DialogDescription({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <div style={{ fontSize: "0.875rem", color: "#6b7280" }} className={className}>{children}</div>;
}

function DialogClose(props: React.HTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} />;
}

function DialogTrigger({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) {
  return <button type="button" onClick={onClick}>{children}</button>;
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
};
