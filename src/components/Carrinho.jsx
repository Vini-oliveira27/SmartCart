import { useEffect, useState } from "react";
import { bancoProdutos } from "../data/produtos";
import { moeda, paraCentavos } from "../utils/moeda";

export default function Carrinho({
  itens,
  quantidadeItens,
  onMais,
  onMenos,
  onRemover,
  onLimpar,
  saindoId,
}) {
  const [confirmarLimpar, setConfirmarLimpar] = useState(false);

  useEffect(() => {
    if (itens.length === 0) setConfirmarLimpar(false);
  }, [itens.length]);

  function handleLimpar() {
    if (!confirmarLimpar) {
      setConfirmarLimpar(true);
      return;
    }
    onLimpar();
    setConfirmarLimpar(false);
  }

  return (
    <div className="sc-cart">
      <div className="sc-cart-head">
        <h3>Carrinho · {quantidadeItens}</h3>
      </div>

      {itens.length === 0 ? (
        <div className="sc-empty">
          <svg
            className="sc-empty-icon"
            viewBox="0 0 24 24"
            width="40"
            height="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="9" cy="20" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="18" cy="20" r="1.5" fill="currentColor" stroke="none" />
            <path d="M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.2L21 8H7" />
          </svg>
          <p>Escaneie um produto para começar</p>
        </div>
      ) : (
        <ul className="sc-cart-list">
          {itens.map((item) => {
            const p = bancoProdutos[item.id];
            const subtotalCentavos =
              paraCentavos(p.preco) * item.quantidade;
            return (
              <li
                key={item.id}
                className={`sc-cart-item ${saindoId === item.id ? "saindo" : ""}`}
              >
                <div className="sc-cart-info">
                  <strong>{p.nome}</strong>
                  <span className="sc-cart-meta">
                    {moeda(p.preco)} · qtd {item.quantidade}
                  </span>
                </div>
                <div className="sc-cart-sub">
                  {moeda(subtotalCentavos / 100)}
                </div>
                <div className="sc-cart-controls">
                  <button
                    type="button"
                    aria-label={`Diminuir quantidade de ${p.nome}`}
                    onClick={() => onMenos(item.id)}
                  >
                    −
                  </button>
                  <span className="sc-qtd" aria-live="polite">
                    {item.quantidade}
                  </span>
                  <button
                    type="button"
                    aria-label={`Aumentar quantidade de ${p.nome}`}
                    onClick={() => onMais(item.id)}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="sc-remove"
                    aria-label={`Remover ${p.nome}`}
                    onClick={() => onRemover(item.id)}
                  >
                    Remover
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {itens.length > 0 && (
        <div className="sc-cart-actions">
          {confirmarLimpar ? (
            <div className="sc-confirm-clear">
              <span>Limpar tudo?</span>
              <button
                type="button"
                className="sc-btn sc-btn-ghost"
                onClick={() => setConfirmarLimpar(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="sc-btn sc-btn-danger"
                onClick={handleLimpar}
              >
                Confirmar
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="sc-btn sc-btn-ghost"
              onClick={handleLimpar}
            >
              Limpar carrinho
            </button>
          )}
        </div>
      )}
    </div>
  );
}
