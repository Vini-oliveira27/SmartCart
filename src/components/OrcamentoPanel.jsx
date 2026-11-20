import { deCentavos, moeda } from "../utils/moeda";

export default function OrcamentoPanel({
  orcamentoCentavos,
  onOrcamentoChange,
}) {
  const orcamentoReais =
    orcamentoCentavos == null ? "" : String(deCentavos(orcamentoCentavos));

  return (
    <section className="sc-orcamento-panel" aria-labelledby="titulo-orcamento">
      <p id="titulo-orcamento">
        Defina quanto pretende gastar antes de começar a escanear. O total muda
        de cor ao se aproximar do limite.
      </p>

      <div className="sc-orcamento">
        <label htmlFor="orcamento-input">
          Limite da compra
          <span className="sc-hint-inline">Opcional · em reais</span>
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
