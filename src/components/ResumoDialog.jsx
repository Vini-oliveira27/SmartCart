import { useEffect, useRef } from "react";
import { bancoProdutos } from "../data/produtos";
import { moeda } from "../utils/moeda";

export default function ResumoDialog({ aberto, itens, total, onVoltar, onNova }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (aberto && !el.open) el.showModal();
    if (!aberto && el.open) el.close();
  }, [aberto]);

  return (
    <dialog ref={ref} className="sc-dialog" onClose={onVoltar}>
      <h2>Resumo da compra</h2>
      <div className="sc-resumo-lista">
        {itens.map((i) => {
          const p = bancoProdutos[i.id];
          return (
            <div key={i.id} className="sc-resumo-linha">
              <span>
                {i.quantidade}× {p.nome}
              </span>
              <span>{moeda(p.preco * i.quantidade)}</span>
            </div>
          );
        })}
      </div>
      <div className="sc-resumo-total">
        <span>Total</span>
        <span>{moeda(total)}</span>
      </div>
      <div className="sc-dialog-actions">
        <button type="button" className="sc-btn sc-btn-ghost" onClick={onVoltar}>
          Voltar
        </button>
        <button type="button" className="sc-btn sc-btn-primary" onClick={onNova}>
          Nova compra
        </button>
      </div>
    </dialog>
  );
}
