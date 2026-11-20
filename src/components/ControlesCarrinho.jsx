import { useEffect, useRef, useState } from "react";

const BOTOES = [
  { id: "frente", label: "Frente", grid: "frente" },
  { id: "esquerda", label: "Esquerda", grid: "esquerda" },
  { id: "parar", label: "Parar", grid: "parar" },
  { id: "direita", label: "Direita", grid: "direita" },
  { id: "tras", label: "Ré", grid: "tras" },
];

export default function ControlesCarrinho({
  conectado,
  onComando,
  codigo,
  onCodigoChange,
  status,
  onConectar,
}) {
  const [ativo, setAtivo] = useState("parar");
  const holdingRef = useRef(false);
  const armedRef = useRef(false);
  const armTimerRef = useRef(null);
  const pointerIdRef = useRef(null);
  const onComandoRef = useRef(onComando);

  useEffect(() => {
    onComandoRef.current = onComando;
  }, [onComando]);

  function limparArm() {
    if (armTimerRef.current) {
      window.clearTimeout(armTimerRef.current);
      armTimerRef.current = null;
    }
    armedRef.current = false;
  }

  function parar(motivo = "release") {
    if (!holdingRef.current && ativo === "parar") return;
    holdingRef.current = false;
    pointerIdRef.current = null;
    limparArm();
    setAtivo("parar");
    onComandoRef.current?.("parar");
    console.debug("[drive] parar", motivo);
  }

  function iniciar(cmd, pointerId) {
    if (!conectado) return;

    limparArm();
    holdingRef.current = cmd !== "parar";
    pointerIdRef.current = pointerId ?? null;
    setAtivo(cmd);
    onComandoRef.current?.(cmd);
    console.debug("[drive] iniciar", cmd);

    if (cmd === "parar") {
      holdingRef.current = false;
      return;
    }

    // Só aceita "soltar" depois de 80ms (evita pointerup fantasma no mesmo clique)
    armTimerRef.current = window.setTimeout(() => {
      armedRef.current = true;
    }, 80);
  }

  useEffect(() => {
    return () => {
      limparArm();
      if (holdingRef.current) onComandoRef.current?.("parar");
    };
  }, []);

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
              ativo === b.id ? "ativo" : ""
            }`}
            disabled={!conectado}
            aria-label={b.label}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {
                /* ignore */
              }
              iniciar(b.id, e.pointerId);
            }}
            onPointerUp={(e) => {
              if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current) {
                return;
              }
              if (!armedRef.current && b.id !== "parar") {
                // pointerup cedo demais: ignora (continua andando)
                return;
              }
              parar("pointerup");
            }}
            onPointerCancel={() => parar("cancel")}
            onLostPointerCapture={() => {
              if (holdingRef.current && armedRef.current) parar("lost");
            }}
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
