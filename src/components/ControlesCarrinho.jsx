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
  const cmdRef = useRef("parar");
  const beatRef = useRef(null);
  const onComandoRef = useRef(onComando);

  useEffect(() => {
    onComandoRef.current = onComando;
  }, [onComando]);

  function limparBeat() {
    if (beatRef.current) {
      window.clearInterval(beatRef.current);
      beatRef.current = null;
    }
  }

  function parar() {
    if (!holdingRef.current && cmdRef.current === "parar") return;
    holdingRef.current = false;
    limparBeat();
    cmdRef.current = "parar";
    setAtivo("parar");
    onComandoRef.current?.("parar");
  }

  useEffect(() => {
    function onUp() {
      if (holdingRef.current) parar();
    }
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("blur", onUp);
    return () => {
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("blur", onUp);
      limparBeat();
      if (holdingRef.current) onComandoRef.current?.("parar");
    };
  }, []);

  function iniciar(cmd) {
    if (!conectado) return;

    // Um único "frente" trava o motor no ESP; heartbeat só renova segurança
    holdingRef.current = cmd !== "parar";
    cmdRef.current = cmd;
    setAtivo(cmd);
    onComandoRef.current?.(cmd);

    limparBeat();
    if (cmd !== "parar") {
      beatRef.current = window.setInterval(() => {
        if (!holdingRef.current) return;
        onComandoRef.current?.(cmdRef.current);
      }, 800);
    } else {
      holdingRef.current = false;
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
              ativo === b.id ? "ativo" : ""
            }`}
            disabled={!conectado}
            aria-label={b.label}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              iniciar(b.id);
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
