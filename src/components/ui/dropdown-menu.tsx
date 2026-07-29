"use client";

function DropdownMenu({ children }: { children?: React.ReactNode }) {
  return <div style={{ position: "relative" }}>{children}</div>;
}

function DropdownMenuTrigger({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) {
  return <button type="button" onClick={onClick}>{children}</button>;
}

function DropdownMenuContent({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        marginTop: "0.25rem",
        background: "white",
        borderRadius: "0.5rem",
        border: "1px solid #e5e7eb",
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
        padding: "0.25rem",
        minWidth: "8rem",
        zIndex: 50,
      }}
      className={className}
    >
      {children}
    </div>
  );
}

function DropdownMenuItem({ children, onClick, className }: { children?: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        paddingTop: "0.25rem",
        paddingBottom: "0.25rem",
        paddingLeft: "0.375rem",
        paddingRight: "0.375rem",
        fontSize: "0.875rem",
        borderRadius: "0.375rem",
        cursor: "pointer",
        textAlign: "left",
        background: "transparent",
        border: "none",
      }}
      className={className}
    >
      {children}
    </button>
  );
}

function DropdownMenuLabel({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div style={{ paddingLeft: "0.375rem", paddingRight: "0.375rem", paddingTop: "0.25rem", paddingBottom: "0.25rem", fontSize: "0.75rem", fontWeight: 500, color: "#6b7280" }} className={className}>
      {children}
    </div>
  );
}

function DropdownMenuSeparator({ className }: { className?: string }) {
  return <hr style={{ height: "1px", background: "#e5e7eb", margin: "0.25rem 0" }} className={className} />;
}

function DropdownMenuGroup({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

function DropdownMenuCheckboxItem(props: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }} {...props} />;
}

function DropdownMenuRadioGroup(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}

function DropdownMenuRadioItem(props: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }} {...props} />;
}

function DropdownMenuSub(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div style={{ position: "relative" }} {...props} />;
}

function DropdownMenuSubTrigger(props: React.HTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} />;
}

function DropdownMenuSubContent(props: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      style={{
        position: "absolute",
        left: "100%",
        top: 0,
        marginLeft: "0.25rem",
        background: "white",
        borderRadius: "0.5rem",
        border: "1px solid #e5e7eb",
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
        padding: "0.25rem",
        minWidth: "8rem",
        zIndex: 50,
      }}
      {...props}
    />
  );
}

function DropdownMenuShortcut({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#6b7280" }} className={className}>{children}</span>;
}

const DropdownMenuPortal = "div";

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
};
