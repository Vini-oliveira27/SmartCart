import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { listaProdutos } from "../data/produtos";
import { moeda } from "../utils/moeda";

export default function CatalogoProdutos() {
  const [qrs, setQrs] = useState({});

  useEffect(() => {
    let cancelado = false;
    async function gerar() {
      const mapa = {};
      for (const [codigo] of listaProdutos) {
        try {
          mapa[codigo] = await QRCode.toDataURL(codigo, {
            width: 160,
            margin: 1,
            color: { dark: "#0a2e28", light: "#ffffff" },
            errorCorrectionLevel: "M",
          });
        } catch {
          mapa[codigo] = "";
        }
      }
      if (!cancelado) setQrs(mapa);
    }
    gerar();
    return () => {
      cancelado = true;
    };
  }, []);

  function imprimir() {
    window.print();
  }

  return (
    <details className="sc-catalog" open>
      <summary>Códigos dos produtos (teste)</summary>
      <p className="sc-hint">
        Digite o código (ex.: <code>LEITE001</code>) ou escaneie o QR / código
        de barras. Use a impressão para etiquetas da demonstração.
      </p>

      <div className="sc-catalog-toolbar no-print">
        <button type="button" className="sc-btn sc-btn-ghost" onClick={imprimir}>
          Imprimir QR codes
        </button>
      </div>

      <div className="sc-qr-grid print-area">
        {listaProdutos.map(([codigo, p]) => (
          <article key={codigo} className="sc-qr-card">
            {qrs[codigo] ? (
              <img src={qrs[codigo]} alt={`QR code de ${p.nome}`} />
            ) : (
              <div className="sc-qr-loading">Gerando…</div>
            )}
            <strong>{p.nome}</strong>
            <code>{codigo}</code>
            <span>{moeda(p.preco)}</span>
          </article>
        ))}
      </div>
    </details>
  );
}
