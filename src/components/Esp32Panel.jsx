import { deCentavos, moeda } from "../utils/moeda";

export default function Esp32Panel({
  codigo,
  onCodigoChange,
  codigoTeste,
  fase,
  statusTexto,
  onConectar,
  onTentarNovamente,
  orcamentoCentavos,
  onOrcamentoChange,
}) {
  const orcamentoReais =
    orcamentoCentavos == null ? "" : String(deCentavos(orcamentoCentavos));

  const bolinha =
    fase === "conectado"
      ? "ok"
      : fase === "conectando"
        ? "pendente"
        : "erro";

  return (
    <section className="sc-esp" aria-labelledby="titulo-esp32">
      <h2 id="titulo-esp32">Display ESP32</h2>
      <p>
        Envia o total da compra para o TFT. Use o mesmo código configurado no
        firmware (<code>CODIGO_CARRINHO</code>).
      </p>

      <div className="sc-esp-row">
        <input
          type="text"
          value={codigo}
          onChange={(e) => onCodigoChange(e.target.value)}
          placeholder={`${codigoTeste} — código de teste`}
          aria-label="Código do carrinho para o ESP32"
        />
        <button
          type="button"
          className="sc-btn sc-btn-ghost"
          onClick={onConectar}
        >
          {fase === "conectado" || fase === "conectando"
            ? "Desconectar"
            : "Conectar"}
        </button>
      </div>

      <div className={`sc-esp-status sc-esp-status-${bolinha}`}>
        <span className="sc-dot" aria-hidden="true" />
        <span>{statusTexto}</span>
        {fase === "erro" ? (
          <button
            type="button"
            className="sc-link-btn"
            onClick={onTentarNovamente}
          >
            Tentar de novo
          </button>
        ) : null}
      </div>

      <div className="sc-orcamento">
        <label htmlFor="orcamento-input">
          Orçamento (opcional)
          <span className="sc-hint-inline">
            O total muda de cor ao se aproximar do limite
          </span>
        </label>
        <div className="sc-esp-row">
          <input
            id="orcamento-input"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="Ex.: 50,00"
            value={orcamentoReais}
            onChange={(e) => onOrcamentoChange(e.target.value)}
            aria-label="Limite de orçamento em reais"
          />
          {orcamentoCentavos != null ? (
            <span className="sc-orcamento-meta">
              Limite {moeda(deCentavos(orcamentoCentavos))}
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
