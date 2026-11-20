import { useState } from "react";
import { normalizarCodigo } from "../data/produtos";

export default function EntradaManual({ onAdicionar }) {
  const [codigo, setCodigo] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const normalizado = normalizarCodigo(codigo);
    if (!normalizado) return;
    onAdicionar(normalizado);
    setCodigo("");
  }

  return (
    <form className="sc-manual" onSubmit={handleSubmit}>
      <input
        type="text"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        placeholder="Digitar código (ex.: LEITE001)"
        autoComplete="off"
        enterKeyHint="done"
        aria-label="Código do produto"
        spellCheck={false}
        autoCapitalize="characters"
      />
      <button type="submit" className="sc-btn sc-btn-add">
        Adicionar
      </button>
    </form>
  );
}
