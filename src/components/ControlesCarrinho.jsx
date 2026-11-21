import { useEffect, useRef, useState } from "react";

const KEEP_MS = 220;

const SETAS = {
  frente: "M12 4 L20 14 H15 V20 H9 V14 H4 Z",
  tras: "M12 20 L4 10 H9 V4 H15 V10 H20 Z",
  esquerda: "M4 12 L14 4 V9 H20 V15 H14 V20 Z",
  direita: "M20 12 L10 20 V15 H4 V9 H10 V4 Z",
};

/**
 * Segurar = anda · Soltar = para (sempre, mesmo se o dedo sair do botão)
 */
export default function ControlesCarrinho({
  conectado,
  onComando,
  codigo,
  onCodigoChange,
  status,
  onConectar,
}) {
  const [ativo, setAtivo] = useState(null);
  const segurandoRef = useRef(null);
  const pointerIdRef = useRef(null);
  const keepRef = useRef(null);
  const onComandoRef = useRef(onComando);
  const limparListenersRef = useRef(null);

  useEffect(() => {
    onComandoRef.current = onComando;
  }, [onComando]);

  useEffect(() => {
    return () => {
      limparListenersRef.current?.();
      if (keepRef.current) clearInterval(keepRef.current);
      if (segurandoRef.current) onComandoRef.current?.("parar");
    };
  }, []);

  function pararTudo() {
    limparListenersRef.current?.();
    limparListenersRef.current = null;
    if (keepRef.current) {
      clearInterval(keepRef.current);
      keepRef.current = null;
    }
    const tinha = !!segurandoRef.current;
    segurandoRef.current = null;
    pointerIdRef.current = null;
    setAtivo(null);
    if (tinha) onComandoRef.current?.("parar");
  }

  function iniciarHold(cmd, e) {
    if (!conectado) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    // Se já estava segurando outro, para primeiro
    pararTudo();

    segurandoRef.current = cmd;
    pointerIdRef.current = e.pointerId;
    setAtivo(cmd);
    onComando?.(cmd);

    keepRef.current = setInterval(() => {
      if (segurandoRef.current) {
        onComandoRef.current?.(segurandoRef.current);
      }
    }, KEEP_MS);

    const soltar = (ev) => {
      if (
        pointerIdRef.current != null &&
        ev.pointerId !== pointerIdRef.current
      ) {
        return;
      }
      pararTudo();
    };

    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", soltar);
    limparListenersRef.current = () => {
      window.removeEventListener("pointerup", soltar);
      window.removeEventListener("pointercancel", soltar);
    };
  }

  function enviarParar(e) {
    e.preventDefault();
    pararTudo();
    if (conectado) onComando?.("parar");
  }

  function BotaoDir({ id, label }) {
    const pressionado = ativo === id;
    return (
      <button
        type="button"
        className={`sc-dpad-btn sc-dpad-${id}${pressionado ? " is-on" : ""}`}
        disabled={!conectado}
        aria-label={label}
        aria-pressed={pressionado}
        onPointerDown={(e) => iniciarHold(id, e)}
        onContextMenu={(e) => e.preventDefault()}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="sc-dpad-ico">
          <path d={SETAS[id]} fill="currentColor" />
        </svg>
      </button>
    );
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

      <div className="sc-dpad" role="group" aria-label="Direção do carrinho">
        <div className="sc-dpad-ring" aria-hidden="true" />
        <BotaoDir id="frente" label="Frente" />
        <BotaoDir id="esquerda" label="Esquerda" />
        <button
          type="button"
          className="sc-dpad-btn sc-dpad-parar"
          disabled={!conectado}
          aria-label="Parar"
          onPointerDown={enviarParar}
          onClick={enviarParar}
        >
          <span className="sc-dpad-stop" />
        </button>
        <BotaoDir id="direita" label="Direita" />
        <BotaoDir id="tras" label="Ré" />
      </div>

      <p className="sc-drive-hint">
        {conectado ? "Segure para andar · solte para parar" : "Conecte para dirigir"}
      </p>
    </section>
  );
}
