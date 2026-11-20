import { deCentavos, moeda } from "../utils/moeda";

export default function OrcamentoPanel({
  orcamentoCentavos,
  onOrcamentoChange,
}) {
  const orcamentoReais =
    orcamentoCentavos == null ? "" : String(deCentavos(orcamentoCentavos));

  return (
    <section className="sc-orcamento-panel" aria-labelledby="titulo-orcamento">
      <h2 id="titulo-orcamento">Orçamento</h2>
      <p>
        Defina um limite opcional. O total muda de cor ao se aproximar do valor.
      </p>

      <div className="sc-orcamento">
        <label htmlFor="orcamento-input">
          Limite (opcional)
          <span className="sc-hint-inline">Em reais</span>
        </label>
        <div className="sc-orcamento-row">
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
