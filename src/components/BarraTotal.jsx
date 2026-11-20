import { useEffect, useRef, useState } from "react";
import { moeda } from "../utils/moeda";

export default function BarraTotal({
  total,
  quantidadeItens,
  disabled,
  onFinalizar,
  nivelOrcamento = "",
}) {
  const [animar, setAnimar] = useState(false);
  const anterior = useRef(total);

  useEffect(() => {
    if (anterior.current === total) return undefined;
    anterior.current = total;
    setAnimar(true);
    const t = window.setTimeout(() => setAnimar(false), 320);
    return () => window.clearTimeout(t);
  }, [total]);

  return (
    <div className="sc-totalbar">
      <div className="sc-totalbar-inner">
        <div
          className={`sc-price-tag ${animar ? "tick" : ""} ${nivelOrcamento ? `orc-${nivelOrcamento}` : ""}`}
        >
          <small>Total da compra</small>
          <strong>{moeda(total)}</strong>
        </div>
        <button
          type="button"
          className="sc-btn sc-btn-primary sc-btn-checkout"
          disabled={disabled}
          onClick={onFinalizar}
        >
          {disabled
            ? "Checkout"
            : `Checkout · ${quantidadeItens} ${quantidadeItens === 1 ? "item" : "itens"}`}
        </button>
      </div>
    </div>
  );
}
