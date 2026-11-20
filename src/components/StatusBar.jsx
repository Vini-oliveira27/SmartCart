export default function StatusBar({ texto, tipo }) {
  if (!texto) return null;
  return (
    <div className={`sc-status ${tipo || ""}`} role="status" aria-live="polite">
      {texto}
    </div>
  );
}
