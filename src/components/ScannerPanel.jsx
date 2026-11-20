export default function ScannerPanel({
  ativo,
  flash,
  onAlternar,
  onTentarNovamente,
  erro,
  torchDisponivel,
  torchOn,
  onTorch,
  readerId = "qr-reader",
}) {
  return (
    <section className="sc-scanner">
      <div
        className={`sc-scanner-frame ${ativo ? "ativo" : ""} ${flash ? "flash" : ""}`}
      >
        <div id={readerId} />

        <div className="sc-mira" aria-hidden="true">
          <span className="sc-mira-corner tl" />
          <span className="sc-mira-corner tr" />
          <span className="sc-mira-corner bl" />
          <span className="sc-mira-corner br" />
        </div>

        {!ativo && !erro && (
          <div className="sc-scanner-placeholder">
            <p>Toque em Iniciar leitura para abrir a câmera</p>
          </div>
        )}

        {erro && (
          <div className="sc-scanner-placeholder sc-scanner-erro">
            <p>{erro.texto}</p>
            {erro.tipo === "permissao" || erro.tipo === "indisponivel" ? (
              <button
                type="button"
                className="sc-btn sc-btn-ghost sc-btn-retry"
                onClick={onTentarNovamente}
              >
                Tentar novamente
              </button>
            ) : null}
          </div>
        )}

        {ativo && torchDisponivel && (
          <button
            type="button"
            className={`sc-torch ${torchOn ? "ligado" : ""}`}
            onClick={onTorch}
            aria-label={torchOn ? "Desligar lanterna" : "Ligar lanterna"}
            aria-pressed={torchOn}
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M9 18h6M10 21h4M12 3v1M8.5 5.5l.7.7M15.5 5.5l-.7.7M7 10h10l-1 5H8l-1-5z" />
            </svg>
          </button>
        )}
      </div>

      <button
        type="button"
        className={`sc-btn sc-btn-primary ${ativo ? "sc-btn-stop" : ""}`}
        onClick={onAlternar}
      >
        {ativo ? "Parar leitura" : "Iniciar leitura"}
      </button>
    </section>
  );
}
