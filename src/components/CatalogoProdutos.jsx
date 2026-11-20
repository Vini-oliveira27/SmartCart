import { listaProdutos } from "../data/produtos";
import { moeda } from "../utils/moeda";

export default function CatalogoProdutos() {
  return (
    <details className="sc-catalog" open>
      <summary>Códigos dos produtos (teste)</summary>
      <p className="sc-hint">
        Digite o código (ex.: <code>LEITE001</code>) ou escaneie o código de
        barras na leitura.
      </p>

      <div className="sc-catalog-table-wrap">
        <table className="sc-catalog-table">
          <thead>
            <tr>
              <th scope="col">Código</th>
              <th scope="col">Produto</th>
              <th scope="col">Preço</th>
            </tr>
          </thead>
          <tbody>
            {listaProdutos.map(([codigo, p]) => (
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
      </div>
    </details>
  );
}
