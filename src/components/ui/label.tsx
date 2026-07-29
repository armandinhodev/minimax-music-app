"use client";

function Label({ children, htmlFor, className, style }: {
  children?: React.ReactNode;
  htmlFor?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={className}
      style={{
        fontSize: "0.875rem",
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        cursor: "pointer",
        ...style,
      }}
    >
      {children}
    </label>
  );
}

export { Label };
