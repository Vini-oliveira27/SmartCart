export default function Toast({ mensagem, tipo = "", acaoLabel, onAcao, onFechar }) {
  if (!mensagem) return null;

  return (
    <div
      className={`sc-toast ${tipo ? `sc-toast-${tipo}` : ""}`}
      role="status"
      aria-live="polite"
    >
      <span className="sc-toast-msg">{mensagem}</span>
      {acaoLabel && onAcao ? (
        <button type="button" className="sc-toast-action" onClick={onAcao}>
          {acaoLabel}
        </button>
      ) : null}
      {onFechar ? (
        <button
          type="button"
          className="sc-toast-close"
          onClick={onFechar}
          aria-label="Fechar aviso"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
