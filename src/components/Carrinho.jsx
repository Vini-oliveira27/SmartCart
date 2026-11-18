import { bancoProdutos } from "../data/produtos";
import { moeda } from "../utils/moeda";

export default function Carrinho({
  itens,
  quantidadeItens,
  onMais,
  onMenos,
  onRemover,
  onLimpar,
}) {
  return (
    <div className="sc-cart">
      <div className="sc-cart-head">
        <h3>Itens no carrinho</h3>
        <span>
          {quantidadeItens} {quantidadeItens === 1 ? "item" : "itens"}
        </span>
      </div>

      {itens.length === 0 ? (
        <p className="sc-empty">
          Carrinho vazio.
          <br />
          Escaneie um produto para começar.
        </p>
      ) : (
        <ul className="sc-cart-list">
          {itens.map((item) => {
            const p = bancoProdutos[item.id];
            return (
              <li key={item.id} className="sc-cart-item">
                <div className="sc-cart-info">
                  <strong>{p.nome}</strong>
                  <span>{moeda(p.preco)} cada</span>
                </div>
                <div className="sc-cart-sub">{moeda(p.preco * item.quantidade)}</div>
                <div className="sc-cart-controls">
                  <button
                    type="button"
                    aria-label={`Diminuir quantidade de ${p.nome}`}
                    onClick={() => onMenos(item.id)}
                  >
                    −
                  </button>
                  <span className="sc-qtd">{item.quantidade}</span>
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
          <button type="button" className="sc-btn sc-btn-ghost" onClick={onLimpar}>
            Limpar carrinho
          </button>
        </div>
      )}
    </div>
  );
}
