"use client";

function Button({ variant = "solid", size = "md", children, onClick, disabled, type = "button", className, style, id }: {
  variant?: "solid" | "outline" | "ghost" | "link" | "default" | "destructive";
  size?: "xs" | "sm" | "md" | "lg";
  children?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}) {
  // Map variants for compatibility
  const effectiveVariant = variant === "default" ? "solid" : variant;

  const variantBg: Record<string, string> = {
    solid: "#111827",
    outline: "transparent",
    ghost: "transparent",
    link: "transparent",
    destructive: "#dc2626",
  };
  const variantColor: Record<string, string> = {
    solid: "white",
    outline: "#111827",
    ghost: "#111827",
    link: "#111827",
    destructive: "white",
  };
  const variantBorder: Record<string, string> = {
    solid: "transparent",
    outline: "#d1d5db",
    ghost: "transparent",
    link: "transparent",
    destructive: "transparent",
  };

  const sizeHeight = { xs: "1.5rem", sm: "1.75rem", md: "2rem", lg: "2.25rem" };
  const sizePx = { xs: "0.5rem", sm: "0.625rem", md: "0.625rem", lg: "0.625rem" };
  const sizeFontSize = { xs: "0.75rem", sm: "0.75rem", md: "0.875rem", lg: "0.875rem" };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      id={id}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.375rem",
        fontWeight: 500,
        borderRadius: "0.375rem",
        transition: "all 0.2s",
        cursor: disabled ? "not-allowed" : "pointer",
        border: `1px solid ${variantBorder[effectiveVariant]}`,
        background: variantBg[effectiveVariant],
        color: variantColor[effectiveVariant],
        height: sizeHeight[size],
        paddingLeft: sizePx[size],
        paddingRight: sizePx[size],
        fontSize: sizeFontSize[size],
         opacity: disabled ? 0.5 : 1,
         ...style,
      }}
    >
      {children}
    </button>
  );
}

export { Button };
