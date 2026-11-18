import { useMemo, useState } from "react";
import { listaProdutos } from "../data/produtos";
import { moeda } from "../utils/moeda";

const POR_PAGINA = 10;

export default function CatalogoProdutos() {
  const [pagina, setPagina] = useState(1);
  const totalPaginas = Math.max(1, Math.ceil(listaProdutos.length / POR_PAGINA));

  const fatia = useMemo(() => {
    const inicio = (pagina - 1) * POR_PAGINA;
    return listaProdutos.slice(inicio, inicio + POR_PAGINA);
  }, [pagina]);

  return (
    <details className="sc-catalog">
      <summary>Códigos dos produtos (teste)</summary>
      <p className="sc-hint">
        Digite o código simples (ex.: <code>LEITE001</code>) ou escaneie o
        código de barras. O mesmo código só é lido de novo depois de sair da
        câmera.
      </p>
      <table>
        <tbody>
          {fatia.map(([codigo, p]) => (
            <tr key={codigo}>
              <td>
                <code>{codigo}</code>
              </td>
              <td>{p.nome}</td>
              <td>{moeda(p.preco)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="sc-pager">
        <button
          type="button"
          className="sc-btn sc-btn-ghost"
          disabled={pagina <= 1}
          onClick={() => setPagina((p) => p - 1)}
        >
          Anterior
        </button>
        <span>
          Página {pagina} de {totalPaginas}
        </span>
        <button
          type="button"
          className="sc-btn sc-btn-ghost"
          disabled={pagina >= totalPaginas}
          onClick={() => setPagina((p) => p + 1)}
        >
          Próxima
        </button>
      </div>
    </details>
  );
}
