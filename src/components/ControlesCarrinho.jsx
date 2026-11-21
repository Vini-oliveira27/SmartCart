import { useEffect, useRef, useState } from "react";

const KEEP_MS = 100;
const MAX_RAIO = 78;
// Histerese: evita frente↔parar↔frente (tranco)
const MORTO_LIGA = 0.34;
const MORTO_SOLTA = 0.16;
// Só troca de direção se o outro eixo for bem mais forte
const TROCA_DIR = 1.35;

function comandoDoVetor(nx, ny, atual) {
  const mag = Math.hypot(nx, ny);
  const limiar = atual === "parar" ? MORTO_LIGA : MORTO_SOLTA;
  if (mag < limiar) return "parar";

  const absX = Math.abs(nx);
  const absY = Math.abs(ny);
  let novo;
  if (absY >= absX) novo = ny < 0 ? "frente" : "tras";
  else novo = nx < 0 ? "esquerda" : "direita";

  // Mantém a direção atual se o stick ainda está nela (menos flicker)
  if (atual === "frente" && ny < -MORTO_SOLTA && absY * TROCA_DIR >= absX) {
    return "frente";
  }
  if (atual === "tras" && ny > MORTO_SOLTA && absY * TROCA_DIR >= absX) {
    return "tras";
  }
  if (atual === "esquerda" && nx < -MORTO_SOLTA && absX * TROCA_DIR >= absY) {
    return "esquerda";
  }
  if (atual === "direita" && nx > MORTO_SOLTA && absX * TROCA_DIR >= absY) {
    return "direita";
  }

  return novo;
}

/**
 * Joystick visual: arraste → anda · solte → para
 * Keepalive contínuo enquanto o stick estiver fora do centro.
 */
export default function ControlesCarrinho({
  conectado,
  onComando,
  codigo,
  onCodigoChange,
  status,
  onConectar,
}) {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [cmd, setCmd] = useState("parar");
  const baseRef = useRef(null);
  const ativoRef = useRef(false);
  const pointerIdRef = useRef(null);
  const cmdRef = useRef("parar");
  const keepRef = useRef(null);
  const onComandoRef = useRef(onComando);
  const limparListenersRef = useRef(null);

  useEffect(() => {
    onComandoRef.current = onComando;
  }, [onComando]);

  useEffect(() => {
    return () => soltarStick(true);
  }, []);

  function publicar(cmdNovo, forcar = false) {
    if (!forcar && cmdRef.current === cmdNovo) return;
    cmdRef.current = cmdNovo;
    setCmd(cmdNovo);
    if (conectado) onComandoRef.current?.(cmdNovo);
  }

  function limparKeep() {
    if (keepRef.current) {
      clearInterval(keepRef.current);
      keepRef.current = null;
    }
  }

  function limparWindow() {
    limparListenersRef.current?.();
    limparListenersRef.current = null;
  }

  function soltarStick(mandarParar) {
    limparWindow();
    limparKeep();
    ativoRef.current = false;
    pointerIdRef.current = null;
    setKnob({ x: 0, y: 0 });
    if (mandarParar) {
      publicar("parar", true);
    } else {
      cmdRef.current = "parar";
      setCmd("parar");
    }
  }

  function aplicarPonto(clientX, clientY) {
    const el = baseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > MAX_RAIO && dist > 0) {
      dx = (dx / dist) * MAX_RAIO;
      dy = (dy / dist) * MAX_RAIO;
    }
    setKnob({ x: dx, y: dy });
    const nx = dx / MAX_RAIO;
    const ny = dy / MAX_RAIO;
    publicar(comandoDoVetor(nx, ny, cmdRef.current));
  }

  function iniciar(e) {
    if (!conectado) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    // Não chama soltarStick aqui — evita “parar” no meio do toque
    limparWindow();
    limparKeep();

    ativoRef.current = true;
    pointerIdRef.current = e.pointerId;
    aplicarPonto(e.clientX, e.clientY);

    // Keepalive: reenvia o comando atual (mesmo se igual) pra não dar timeout no ESP
    keepRef.current = setInterval(() => {
      if (!ativoRef.current) return;
      const atual = cmdRef.current;
      if (atual && atual !== "parar") {
        onComandoRef.current?.(atual);
      }
    }, KEEP_MS);

    const mover = (ev) => {
      if (ev.pointerId !== pointerIdRef.current) return;
      ev.preventDefault();
      aplicarPonto(ev.clientX, ev.clientY);
    };
    const soltar = (ev) => {
      if (
        pointerIdRef.current != null &&
        ev.pointerId !== pointerIdRef.current
      ) {
        return;
      }
      soltarStick(true);
    };

    window.addEventListener("pointermove", mover, { passive: false });
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", soltar);
    limparListenersRef.current = () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      window.removeEventListener("pointercancel", soltar);
    };
  }

  const labelCmd =
    cmd === "frente"
      ? "Frente"
      : cmd === "tras"
        ? "Ré"
        : cmd === "esquerda"
          ? "Esquerda"
          : cmd === "direita"
            ? "Direita"
            : "Parado";

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

      <div
        className={`sc-joy${conectado ? "" : " is-off"}${cmd !== "parar" ? " is-active" : ""}`}
        ref={baseRef}
        role="application"
        aria-label="Joystick do carrinho"
        aria-disabled={!conectado}
        onPointerDown={iniciar}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="sc-joy-cross" aria-hidden="true">
          <span className="sc-joy-n">▲</span>
          <span className="sc-joy-s">▼</span>
          <span className="sc-joy-w">◀</span>
          <span className="sc-joy-e">▶</span>
        </div>
        <div className="sc-joy-dead" aria-hidden="true" />
        <div
          className="sc-joy-knob"
          style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
        />
      </div>

      <p className="sc-drive-hint">
        {!conectado
          ? "Conecte para dirigir"
          : cmd === "parar"
            ? "Arraste e segure para dirigir"
            : labelCmd}
      </p>
    </section>
  );
}
