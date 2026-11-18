export default function StatusBar({ texto, tipo }) {
  return (
    <div className={`sc-status ${tipo || ""}`} role="status" aria-live="polite">
      {texto}
    </div>
  );
}
