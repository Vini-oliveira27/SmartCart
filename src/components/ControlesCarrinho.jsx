import { useState } from "react";

const BOTOES = [
  { id: "frente", label: "Frente", grid: "frente" },
  { id: "esquerda", label: "Esquerda", grid: "esquerda" },
  { id: "parar", label: "Parar", grid: "parar" },
  { id: "direita", label: "Direita", grid: "direita" },
  { id: "tras", label: "Ré", grid: "tras" },
];

/**
 * Modo clique (não segurar):
 * Frente/Ré/Esq/Dir = motor fica ligado
 * Parar = desliga
 * Isso evita o "pulinho" causado por soltar o botão cedo demais.
 */
export default function ControlesCarrinho({
  conectado,
  onComando,
  codigo,
  onCodigoChange,
  status,
  onConectar,
}) {
  const [ativo, setAtivo] = useState("parar");

  function enviar(cmd) {
    if (!conectado) return;
    setAtivo(cmd);
    onComando?.(cmd);
  }

  return (
    <section className="sc-drive" aria-labelledby="titulo-drive">
      <div className="sc-drive-top">
        <h3 id="titulo-drive">Direção</h3>
        <div className="sc-esp-row sc-drive-connect">
          <input
            type="text"
            value={codigo}
            onChange={(e) => onCodigoChange?.(e.target.value)}
            placeholder="demo"
            disabled={conectado}
            aria-label="Código MQTT"
          />
          <button
            type="button"
            className={`sc-btn ${conectado ? "sc-btn-ghost" : "sc-btn-primary"}`}
            onClick={onConectar}
          >
            {conectado ? "Off" : "Conectar"}
          </button>
        </div>
      </div>

      <div className={`sc-esp-status ${status?.tipo || ""}`}>
        {status?.texto || (conectado ? "Conectado" : "Desconectado")}
      </div>

      <p className="sc-drive-hint">Toque para andar · Parar para frear</p>

      <div className="sc-drive-pad" role="group" aria-label="Direção do carrinho">
        {BOTOES.map((b) => (
          <button
            key={b.id}
            type="button"
            className={`sc-drive-btn sc-drive-${b.grid} ${
              ativo === b.id ? "ativo" : ""
            }`}
            disabled={!conectado}
            aria-label={b.label}
            onClick={() => enviar(b.id)}
          >
            {b.id === "frente" && "▲"}
            {b.id === "tras" && "▼"}
            {b.id === "esquerda" && "◀"}
            {b.id === "direita" && "▶"}
            {b.id === "parar" && "■"}
            <span>{b.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
