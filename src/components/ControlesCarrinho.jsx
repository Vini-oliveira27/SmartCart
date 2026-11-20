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
  const holdRef = useRef(null);
  const cmdRef = useRef("parar");
  const holdingRef = useRef(false);
  const onComandoRef = useRef(onComando);

  useEffect(() => {
    onComandoRef.current = onComando;
  }, [onComando]);

  useEffect(() => {
    function soltarGlobal() {
      if (!holdingRef.current) return;
      holdingRef.current = false;
      if (holdRef.current) {
        window.clearInterval(holdRef.current);
        holdRef.current = null;
      }
      cmdRef.current = "parar";
      setAtivo("parar");
      onComandoRef.current?.("parar");
    }

    window.addEventListener("pointerup", soltarGlobal);
    window.addEventListener("pointercancel", soltarGlobal);
    window.addEventListener("blur", soltarGlobal);

    return () => {
      window.removeEventListener("pointerup", soltarGlobal);
      window.removeEventListener("pointercancel", soltarGlobal);
      window.removeEventListener("blur", soltarGlobal);
      if (holdRef.current) window.clearInterval(holdRef.current);
      if (holdingRef.current) onComandoRef.current?.("parar");
    };
  }, []);

  function iniciarHold(cmd) {
    if (!conectado) return;

    if (holdRef.current) {
      window.clearInterval(holdRef.current);
      holdRef.current = null;
    }

    holdingRef.current = cmd !== "parar";
    cmdRef.current = cmd;
    setAtivo(cmd);
    onComandoRef.current?.(cmd);

    // Mantém o comando vivo no ESP32 enquanto segura
    if (cmd !== "parar") {
      holdRef.current = window.setInterval(() => {
        if (!holdingRef.current) return;
        onComandoRef.current?.(cmdRef.current);
      }, 150);
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
              iniciarHold(b.id);
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
