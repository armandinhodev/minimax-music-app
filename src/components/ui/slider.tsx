"use client";

function Slider({ defaultValue, value, min = 0, max = 100, step = 1, onChange, onValueChange, className, style }: {
  defaultValue?: number[];
  value?: number[];
  min?: number;
  max?: number;
  step?: number;
  onChange?: (value: number) => void;
  onValueChange?: (value: number | readonly number[]) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const currentValue = value?.[0] ?? defaultValue?.[0] ?? min;
  const percentage = ((currentValue - min) / (max - min)) * 100;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    onChange?.(newValue);
    onValueChange?.(newValue);
  };

  return (
    <div className={className} style={{ position: "relative", display: "flex", alignItems: "center", width: "100%", height: "1rem", ...style }}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={currentValue}
        onChange={handleChange}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          opacity: 0,
          cursor: "pointer",
          margin: 0,
        }}
      />
      <div style={{ position: "relative", width: "100%", height: "0.25rem", borderRadius: "9999px", background: "#e5e7eb", overflow: "visible" }}>
        <div
          style={{
            position: "absolute",
            top: "0",
            left: "0",
            height: "100%",
            width: `${percentage}%`,
            background: "#3b82f6",
            borderRadius: "9999px",
            transition: "width 0.2s ease",
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: `${percentage}%`,
          transform: "translate(-50%, -50%)",
          width: "0.75rem",
          height: "0.75rem",
          borderRadius: "9999px",
          background: "white",
          border: "2px solid #3b82f6",
          boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

export { Slider };
