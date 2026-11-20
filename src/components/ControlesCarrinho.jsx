import { useEffect, useRef } from "react";

const BOTOES = [
  { id: "frente", label: "Frente", grid: "frente" },
  { id: "esquerda", label: "Esquerda", grid: "esquerda" },
  { id: "parar", label: "Parar", grid: "parar" },
  { id: "direita", label: "Direita", grid: "direita" },
  { id: "tras", label: "Ré", grid: "tras" },
];

export default function ControlesCarrinho({
  conectado,
  comandoAtual,
  onComando,
  codigo,
  onCodigoChange,
  status,
  onConectar,
}) {
  const holdRef = useRef(null);
  const cmdRef = useRef("parar");

  useEffect(() => {
    return () => {
      if (holdRef.current) window.clearInterval(holdRef.current);
      onComando?.("parar");
    };
  }, [onComando]);

  function pararHold() {
    if (holdRef.current) {
      window.clearInterval(holdRef.current);
      holdRef.current = null;
    }
    cmdRef.current = "parar";
    onComando?.("parar");
  }

  function iniciarHold(cmd) {
    if (!conectado) return;
    if (holdRef.current) window.clearInterval(holdRef.current);

    cmdRef.current = cmd;
    onComando?.(cmd);

    if (cmd !== "parar") {
      holdRef.current = window.setInterval(() => {
        onComando?.(cmdRef.current);
      }, 200);
    }
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

      <div className="sc-drive-pad" role="group" aria-label="Direção do carrinho">
        {BOTOES.map((b) => (
          <button
            key={b.id}
            type="button"
            className={`sc-drive-btn sc-drive-${b.grid} ${
              comandoAtual === b.id ? "ativo" : ""
            }`}
            disabled={!conectado}
            aria-label={b.label}
            onPointerDown={(e) => {
              e.preventDefault();
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {
                /* ignore */
              }
              iniciarHold(b.id);
            }}
            onPointerUp={pararHold}
            onPointerCancel={pararHold}
            onLostPointerCapture={pararHold}
            onContextMenu={(e) => e.preventDefault()}
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
