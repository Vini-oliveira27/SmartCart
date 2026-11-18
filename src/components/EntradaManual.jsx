import { useState } from "react";

export default function EntradaManual({ onAdicionar }) {
  const [codigo, setCodigo] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!codigo.trim()) return;
    onAdicionar(codigo);
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
      />
      <button type="submit" className="sc-btn sc-btn-ghost">
        Adicionar
      </button>
    </form>
  );
}
