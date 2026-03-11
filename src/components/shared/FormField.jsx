import { useTheme } from "@/context/ThemeContext";

export function FormField({ label, children }) {
  const { dark } = useTheme();
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display: "block",
        fontSize: 11,
        fontWeight: 700,
        color: dark ? '#94a3b8' : '#64748b',
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        marginBottom: 6,
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}