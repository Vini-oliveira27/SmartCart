import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { bancoProdutos } from "../data/produtos";
import { moeda } from "../utils/moeda";
import { gerarPixDemo } from "../utils/pixDemo";

export default function CheckoutDialog({
  aberto,
  itens,
  total,
  onVoltar,
  onNova,
}) {
  const ref = useRef(null);
  const [etapa, setEtapa] = useState("resumo"); // resumo | pix | concluido
  const [qrUrl, setQrUrl] = useState("");
  const [copiado, setCopiado] = useState(false);

  const pix = useMemo(
    () => (aberto ? gerarPixDemo(total) : null),
    [aberto, total]
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (aberto && !el.open) {
      setEtapa("resumo");
      setCopiado(false);
      el.showModal();
    }
    if (!aberto && el.open) el.close();
  }, [aberto]);

  useEffect(() => {
    if (!aberto || !pix) return undefined;
    let cancelado = false;
    QRCode.toDataURL(pix.copiaCola, {
      width: 240,
      margin: 2,
      color: { dark: "#0a2e28", light: "#ffffff" },
      errorCorrectionLevel: "M",
    }).then((url) => {
      if (!cancelado) setQrUrl(url);
    });
    return () => {
      cancelado = true;
    };
  }, [aberto, pix]);

  async function copiarCodigo() {
    if (!pix) return;
    try {
      await navigator.clipboard.writeText(pix.copiaCola);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <dialog
      ref={ref}
      className="sc-dialog"
      onClose={onVoltar}
      aria-labelledby="checkout-titulo"
    >
      <div className="sc-checkout-steps" aria-hidden="true">
        <span className={etapa === "resumo" ? "ativo" : "feito"}>1</span>
        <i />
        <span className={etapa === "pix" ? "ativo" : etapa === "concluido" ? "feito" : ""}>
          2
        </span>
        <i />
        <span className={etapa === "concluido" ? "ativo" : ""}>3</span>
      </div>

      {etapa === "resumo" && (
        <>
          <p className="sc-dialog-kicker">Checkout</p>
          <h2 id="checkout-titulo">Resumo da compra</h2>
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
            <button
              type="button"
              className="sc-btn sc-btn-primary"
              onClick={() => setEtapa("pix")}
            >
              Pagar com PIX
            </button>
          </div>
        </>
      )}

      {etapa === "pix" && pix && (
        <>
          <p className="sc-dialog-kicker">Pagamento demo</p>
          <h2 id="checkout-titulo">PIX</h2>
          <p className="sc-pix-lead">
            Escaneie o QR Code ou copie o código. Este fluxo é fictício para
            apresentação — a integração real fica com a rede varejista.
          </p>

          <div className="sc-pix-panel">
            <div className="sc-pix-qr">
              {qrUrl ? (
                <img src={qrUrl} alt="QR Code PIX de demonstração" />
              ) : (
                <div className="sc-pix-qr-loading">Gerando QR…</div>
              )}
            </div>
            <div className="sc-pix-meta">
              <div>
                <small>Valor</small>
                <strong>{moeda(total)}</strong>
              </div>
              <div>
                <small>ID demo</small>
                <strong className="sc-mono">{pix.txid}</strong>
              </div>
            </div>
          </div>

          <label className="sc-pix-copy-label" htmlFor="pix-copia">
            Pix Copia e Cola
          </label>
          <textarea
            id="pix-copia"
            className="sc-pix-copia"
            readOnly
            rows={3}
            value={pix.copiaCola}
          />

          <p className="sc-pix-aviso">{pix.aviso}</p>

          <div className="sc-dialog-actions sc-dialog-actions-3">
            <button
              type="button"
              className="sc-btn sc-btn-ghost"
              onClick={() => setEtapa("resumo")}
            >
              Voltar
            </button>
            <button type="button" className="sc-btn sc-btn-ghost" onClick={copiarCodigo}>
              {copiado ? "Copiado!" : "Copiar código"}
            </button>
            <button
              type="button"
              className="sc-btn sc-btn-primary"
              onClick={() => setEtapa("concluido")}
            >
              Simular pago
            </button>
          </div>
        </>
      )}

      {etapa === "concluido" && (
        <>
          <div className="sc-done">
            <div className="sc-done-badge" aria-hidden="true">
              ✓
            </div>
            <p className="sc-dialog-kicker">Demonstração</p>
            <h2 id="checkout-titulo">Pagamento simulado</h2>
            <p className="sc-pix-lead">
              Em um piloto real, o SmartCart entregaria o total ao sistema de
              caixa/PSP da rede. Nenhum valor foi cobrado.
            </p>
            <div className="sc-resumo-total">
              <span>Total demonstrado</span>
              <span>{moeda(total)}</span>
            </div>
          </div>
          <div className="sc-dialog-actions">
            <button type="button" className="sc-btn sc-btn-primary" onClick={onNova}>
              Nova compra
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}
