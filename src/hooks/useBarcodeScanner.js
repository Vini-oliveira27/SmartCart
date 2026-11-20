import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { normalizarCodigo } from "../data/produtos";

/** Cooldown para o mesmo código (evita leituras duplicadas acidentais). */
const COOLDOWN_MS = 1800;

function formatosCodigoBarras() {
  const F = Html5QrcodeSupportedFormats;
  return [
    F.EAN_13,
    F.EAN_8,
    F.UPC_A,
    F.UPC_E,
    F.CODE_128,
    F.CODE_39,
    F.ITF,
    F.QR_CODE,
  ];
}

function mensagemErroCamera(err) {
  const texto = String(err?.message || err || "").toLowerCase();
  if (!window.isSecureContext) {
    return {
      tipo: "permissao",
      texto:
        "A câmera só funciona em página segura (HTTPS ou localhost).",
    };
  }
  if (
    texto.includes("notallowed") ||
    texto.includes("permission") ||
    texto.includes("denied") ||
    err?.name === "NotAllowedError"
  ) {
    return {
      tipo: "permissao",
      texto:
        "Permissão de câmera negada. Libere o acesso nas configurações do navegador.",
    };
  }
  if (
    texto.includes("notfound") ||
    texto.includes("requested device not found") ||
    err?.name === "NotFoundError"
  ) {
    return {
      tipo: "indisponivel",
      texto: "Nenhuma câmera disponível neste dispositivo.",
    };
  }
  return {
    tipo: "indisponivel",
    texto: "Não foi possível abrir a câmera. Tente novamente.",
  };
}

/**
 * Scanner com mira ~60%, cooldown por código, pausa em segundo plano e lanterna.
 */
export function useBarcodeScanner(elementId, onCodigo) {
  const [ativo, setAtivo] = useState(false);
  const [flash, setFlash] = useState(false);
  const [erro, setErro] = useState(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchDisponivel, setTorchDisponivel] = useState(false);

  const leitorRef = useRef(null);
  const onCodigoRef = useRef(onCodigo);
  const cooldownRef = useRef(new Map());
  const querAtivoRef = useRef(false);
  const pausadoPorAbaRef = useRef(false);

  useEffect(() => {
    onCodigoRef.current = onCodigo;
  }, [onCodigo]);

  const dispararFlash = useCallback(() => {
    setFlash(true);
    window.setTimeout(() => setFlash(false), 380);
  }, []);

  const processar = useCallback(
    (textoLido) => {
      const codigo = normalizarCodigo(textoLido);
      if (!codigo) return;

      const agora = Date.now();
      const ultimo = cooldownRef.current.get(codigo) || 0;
      if (agora - ultimo < COOLDOWN_MS) return;

      cooldownRef.current.set(codigo, agora);
      onCodigoRef.current?.(codigo, dispararFlash);
    },
    [dispararFlash]
  );

  const detectarTorch = useCallback(async () => {
    const leitor = leitorRef.current;
    if (!leitor) {
      setTorchDisponivel(false);
      return;
    }
    try {
      const caps =
        typeof leitor.getRunningTrackCapabilities === "function"
          ? leitor.getRunningTrackCapabilities()
          : null;
      setTorchDisponivel(Boolean(caps && "torch" in caps));
    } catch {
      setTorchDisponivel(false);
    }
  }, []);

  const pararInterno = useCallback(async () => {
    const leitor = leitorRef.current;
    leitorRef.current = null;
    setTorchOn(false);
    setTorchDisponivel(false);

    if (leitor) {
      try {
        if (leitor.isScanning) await leitor.stop();
        leitor.clear();
      } catch (err) {
        console.error("Erro ao parar a câmera:", err);
      }
    }
    setAtivo(false);
  }, []);

  const iniciarInterno = useCallback(async () => {
    if (leitorRef.current) return false;
    setErro(null);

    const leitor = new Html5Qrcode(elementId);
    leitorRef.current = leitor;

    const config = {
      fps: 10,
      qrbox: (largura, altura) => {
        const size = Math.floor(Math.min(largura, altura) * 0.6);
        const lado = Math.max(size, 160);
        return { width: lado, height: lado };
      },
      aspectRatio: 1,
      formatsToSupport: formatosCodigoBarras(),
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true,
      },
    };

    try {
      await leitor.start(
        { facingMode: "environment" },
        config,
        processar,
        () => {}
      );
      setAtivo(true);
      await detectarTorch();
      return true;
    } catch (err) {
      console.error("Erro ao iniciar a câmera:", err);
      leitorRef.current = null;
      try {
        leitor.clear();
      } catch {
        /* ignore */
      }
      setErro(mensagemErroCamera(err));
      setAtivo(false);
      return false;
    }
  }, [detectarTorch, elementId, processar]);

  const parar = useCallback(async () => {
    querAtivoRef.current = false;
    pausadoPorAbaRef.current = false;
    cooldownRef.current.clear();
    await pararInterno();
  }, [pararInterno]);

  const iniciar = useCallback(async () => {
    querAtivoRef.current = true;
    pausadoPorAbaRef.current = false;
    return iniciarInterno();
  }, [iniciarInterno]);

  const tentarNovamente = useCallback(async () => {
    setErro(null);
    await pararInterno();
    querAtivoRef.current = true;
    return iniciarInterno();
  }, [iniciarInterno, pararInterno]);

  const alternarTorch = useCallback(async () => {
    const leitor = leitorRef.current;
    if (!leitor || !torchDisponivel) return;
    const proximo = !torchOn;
    try {
      if (typeof leitor.applyVideoConstraints === "function") {
        await leitor.applyVideoConstraints({
          advanced: [{ torch: proximo }],
        });
        setTorchOn(proximo);
      }
    } catch (err) {
      console.warn("Lanterna indisponível:", err);
      setTorchDisponivel(false);
    }
  }, [torchDisponivel, torchOn]);

  // Pausa ao ir para segundo plano; retoma ao voltar.
  useEffect(() => {
    async function onVisibilidade() {
      if (document.hidden) {
        if (querAtivoRef.current && leitorRef.current) {
          pausadoPorAbaRef.current = true;
          await pararInterno();
        }
        return;
      }

      if (pausadoPorAbaRef.current && querAtivoRef.current) {
        pausadoPorAbaRef.current = false;
        await iniciarInterno();
      }
    }

    document.addEventListener("visibilitychange", onVisibilidade);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilidade);
  }, [iniciarInterno, pararInterno]);

  useEffect(
    () => () => {
      querAtivoRef.current = false;
      if (leitorRef.current) {
        leitorRef.current.stop().catch(() => {});
        leitorRef.current = null;
      }
    },
    []
  );

  return {
    ativo,
    flash,
    erro,
    iniciar,
    parar,
    tentarNovamente,
    torchOn,
    torchDisponivel,
    alternarTorch,
  };
}
