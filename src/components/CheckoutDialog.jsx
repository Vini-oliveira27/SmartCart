import { useEffect, useRef, useState } from "react";
import { bancoProdutos } from "../data/produtos";
import { moeda, paraCentavos } from "../utils/moeda";

/**
 * Checkout: resumo → confirmar → sucesso.
 *
 * ---------------------------------------------------------------------------
 * INTEGRAÇÃO DE PAGAMENTO (ponto de extensão)
 * ---------------------------------------------------------------------------
 * Em produção, substitua `aoConfirmar` por uma chamada ao PSP/adquirente da
 * rede (PIX, cartão, carteira digital, etc.) antes de limpar o carrinho.
 *
 * Exemplo:
 *   // const resultado = await gateway.criarCobranca({ total, itens });
 *   // if (!resultado.ok) { mostrarErro(resultado.mensagem); return; }
 * ---------------------------------------------------------------------------
 */
export default function CheckoutDialog({
  aberto,
  itens,
  total,
  onVoltar,
  onConfirmar,
}) {
  const ref = useRef(null);
  const [etapa, setEtapa] = useState("resumo"); // resumo | sucesso
  const [snapshot, setSnapshot] = useState({ itens: [], total: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (aberto && !el.open) {
      setEtapa("resumo");
      setSnapshot({ itens: [...itens], total });
      el.showModal();
    }
    if (!aberto && el.open) el.close();
  }, [aberto, itens, total]);

  function aoConfirmar() {
    // --- INTEGRAÇÃO DE PAGAMENTO: inserir gateway aqui antes do sucesso ---
    // await processarPagamento({ total: snapshot.total, itens: snapshot.itens });
    setEtapa("sucesso");
    onConfirmar?.();
  }

  function fecharAposSucesso() {
    onVoltar();
  }

  return (
    <dialog
      ref={ref}
      className="sc-dialog"
      onClose={onVoltar}
      aria-labelledby="checkout-titulo"
    >
      {etapa === "resumo" && (
        <>
          <p className="sc-dialog-kicker">Checkout</p>
          <h2 id="checkout-titulo">Resumo da compra</h2>
          <div className="sc-resumo-lista">
            {snapshot.itens.map((i) => {
              const p = bancoProdutos[i.id];
              if (!p) return null;
              const sub = (paraCentavos(p.preco) * i.quantidade) / 100;
              return (
                <div key={i.id} className="sc-resumo-linha">
                  <span>
                    {i.quantidade}× {p.nome}
                  </span>
                  <span>{moeda(sub)}</span>
                </div>
              );
            })}
          </div>
          <div className="sc-resumo-total">
            <span>Total</span>
            <span>{moeda(snapshot.total)}</span>
          </div>
          <div className="sc-dialog-actions">
            <button
              type="button"
              className="sc-btn sc-btn-ghost"
              onClick={onVoltar}
            >
              Voltar
            </button>
            <button
              type="button"
              className="sc-btn sc-btn-primary"
              onClick={aoConfirmar}
            >
              Confirmar
            </button>
          </div>
        </>
      )}

      {etapa === "sucesso" && (
        <div className="sc-done">
          <div className="sc-done-badge" aria-hidden="true">
            ✓
          </div>
          <p className="sc-dialog-kicker">Compra finalizada</p>
          <h2 id="checkout-titulo">Tudo certo!</h2>
          <p className="sc-pix-lead">
            Seu carrinho foi limpo. Em um piloto real, o pagamento seria
            processado pelo sistema da rede neste ponto.
          </p>
          <div className="sc-resumo-total">
            <span>Total</span>
            <span>{moeda(snapshot.total)}</span>
          </div>
          <div className="sc-dialog-actions">
            <button
              type="button"
              className="sc-btn sc-btn-primary"
              onClick={fecharAposSucesso}
            >
              Nova compra
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
