export default function Header({
  compact = false,
  onAbrirTecnico,
  temaEscuro = false,
  onAlternarTema,
}) {
  function handleLogoPointerDown() {
    if (!onAbrirTecnico) return;
    const timer = window.setTimeout(() => {
      onAbrirTecnico();
    }, 700);
    const limpar = () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerup", limpar);
      window.removeEventListener("pointercancel", limpar);
    };
    window.addEventListener("pointerup", limpar);
    window.addEventListener("pointercancel", limpar);
  }

  return (
    <header className={`sc-header ${compact ? "sc-header-compact" : ""}`}>
      <div className="sc-header-glow" aria-hidden="true" />
      <div className="sc-header-row">
        <button
          type="button"
          className="sc-logo"
          aria-label="SmartCart — mantenha pressionado para modo técnico"
          title="Toque longo: modo técnico"
          onPointerDown={handleLogoPointerDown}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="9" cy="20" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="18" cy="20" r="1.5" fill="currentColor" stroke="none" />
            <path d="M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.2L21 8H7" />
          </svg>
        </button>

        <div className="sc-header-text">
          {!compact && <p className="sc-eyebrow">Self-checkout inteligente</p>}
          <h1 className="sc-brand">SmartCart</h1>
          {!compact && (
            <p className="sc-tagline">
              Escaneie, some o total e finalize sua compra.
            </p>
          )}
        </div>

        <div className="sc-header-actions">
          {onAlternarTema ? (
            <button
              type="button"
              className="sc-theme-toggle"
              onClick={onAlternarTema}
              aria-label={
                temaEscuro ? "Ativar modo claro" : "Ativar modo escuro"
              }
              title={temaEscuro ? "Modo claro" : "Modo escuro"}
              aria-pressed={temaEscuro}
            >
              <span className="sc-theme-track" aria-hidden="true">
                <span className="sc-theme-thumb">
                  {temaEscuro ? (
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                      <path d="M21 14.3A9 9 0 1 1 9.7 3a7 7 0 1 0 11.3 11.3z" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      width="14"
                      height="14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    >
                      <circle cx="12" cy="12" r="4" />
                      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                    </svg>
                  )}
                </span>
              </span>
            </button>
          ) : null}

          <button
            type="button"
            className="sc-gear"
            onClick={onAbrirTecnico}
            aria-label="Abrir modo técnico"
            title="Modo técnico"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
