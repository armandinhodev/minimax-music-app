"use client";

function Badge({ variant = "subtle", children, className, onClick, style }: {
  variant?: "solid" | "subtle" | "outline" | "secondary" | "destructive" | "default" | "success" | "info" | "warning" | "purple";
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  // Map "default" to "subtle" for compatibility
  const effectiveVariant = variant === "default" ? "subtle" : variant;

  const variantStyles: Record<string, React.CSSProperties> = {
    solid: { background: "#3b82f6", color: "white" },
    subtle: { background: "#dbeafe", color: "#1e40af" },
    outline: { border: "1px solid #d1d5db" },
    secondary: { background: "#f3f4f6", color: "#374151" },
    destructive: { background: "#fee2e2", color: "#991b1b" },
    success: { background: "#dcfce7", color: "#166534" },
    info: { background: "#dbeafe", color: "#1e40af" },
    warning: { background: "#ffedd5", color: "#9a3412" },
    purple: { background: "#f3e8ff", color: "#6b21a8" },
  };

  return (
    <span
      className={className}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: "1.25rem",
        paddingLeft: "0.5rem",
        paddingRight: "0.5rem",
        fontSize: "0.75rem",
        fontWeight: 500,
        borderRadius: "9999px",
        cursor: onClick ? "pointer" : "default",
        ...(variantStyles[effectiveVariant] || variantStyles.subtle),
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export { Badge };
