import { moeda } from "../utils/moeda";

export default function BarraTotal({ total, disabled, onFinalizar }) {
  return (
    <div className="sc-totalbar">
      <div className="sc-totalbar-inner">
        <div className="sc-price-tag">
          <small>Total da compra</small>
          <strong>{moeda(total)}</strong>
        </div>
        <button
          type="button"
          className="sc-btn sc-btn-primary"
          disabled={disabled}
          onClick={onFinalizar}
        >
          Finalizar
        </button>
      </div>
    </div>
  );
}
