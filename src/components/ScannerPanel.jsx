export default function ScannerPanel({
  ativo,
  flash,
  onAlternar,
  readerId = "qr-reader",
}) {
  return (
    <section className="sc-scanner">
      <div
        className={`sc-scanner-frame ${ativo ? "ativo" : ""} ${flash ? "flash" : ""}`}
      >
        <div id={readerId} />
        {!ativo && (
          <div className="sc-scanner-placeholder">
            <span className="sc-scanner-mark" aria-hidden="true" />
            <p>A câmera aparece aqui ao iniciar a leitura</p>
          </div>
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
