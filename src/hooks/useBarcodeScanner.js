import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { normalizarCodigo } from "../data/produtos";

/** Tempo sem detecção para considerar que o código saiu do campo de visão. */
const SUMIU_MS = 700;

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

/**
 * Só registra um código na primeira vez que ele entra na visão.
 * Para ler de novo o mesmo código, ele precisa sair da câmera e voltar.
 */
export function useBarcodeScanner(elementId, onCodigo) {
  const [ativo, setAtivo] = useState(false);
  const [flash, setFlash] = useState(false);
  const [erro, setErro] = useState("");
  const leitorRef = useRef(null);
  const onCodigoRef = useRef(onCodigo);
  const lastSeenRef = useRef(new Map());
  const bloqueadosRef = useRef(new Set());
  const limpezaRef = useRef(null);

  useEffect(() => {
    onCodigoRef.current = onCodigo;
  }, [onCodigo]);

  const dispararFlash = useCallback(() => {
    setFlash(true);
    window.setTimeout(() => setFlash(false), 320);
  }, []);

  const processar = useCallback((textoLido) => {
    const codigo = normalizarCodigo(textoLido);
    if (!codigo) return;

    const agora = Date.now();
    lastSeenRef.current.set(codigo, agora);

    // Ainda no campo de visão após leitura anterior → ignora
    if (bloqueadosRef.current.has(codigo)) return;

    bloqueadosRef.current.add(codigo);
    onCodigoRef.current?.(codigo, dispararFlash);
  }, [dispararFlash]);

  useEffect(() => {
    if (!ativo) return undefined;

    limpezaRef.current = window.setInterval(() => {
      const agora = Date.now();
      for (const [codigo, vistoEm] of lastSeenRef.current.entries()) {
        if (agora - vistoEm >= SUMIU_MS) {
          lastSeenRef.current.delete(codigo);
          // Saiu da visão → libera para nova leitura
          bloqueadosRef.current.delete(codigo);
        }
      }
    }, 200);

    return () => {
      if (limpezaRef.current) window.clearInterval(limpezaRef.current);
    };
  }, [ativo]);

  const parar = useCallback(async () => {
    if (limpezaRef.current) {
      window.clearInterval(limpezaRef.current);
      limpezaRef.current = null;
    }
    lastSeenRef.current.clear();
    bloqueadosRef.current.clear();

    const leitor = leitorRef.current;
    leitorRef.current = null;
    if (leitor) {
      try {
        await leitor.stop();
        leitor.clear();
      } catch (err) {
        console.error("Erro ao parar a câmera:", err);
      }
    }
    setAtivo(false);
  }, []);

  const iniciar = useCallback(async () => {
    if (ativo || leitorRef.current) return false;
    setErro("");

    const leitor = new Html5Qrcode(elementId);
    leitorRef.current = leitor;

    const config = {
      fps: 10,
      qrbox: (largura, altura) => {
        const w = Math.floor(Math.min(largura * 0.92, 360));
        const h = Math.floor(Math.min(altura * 0.28, 140));
        return { width: w, height: Math.max(h, 80) };
      },
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
      return true;
    } catch (err) {
      console.error("Erro ao iniciar a câmera:", err);
      leitorRef.current = null;
      try {
        leitor.clear();
      } catch {
        /* ignore */
      }
      const semHttps = !window.isSecureContext;
      setErro(
        semHttps
          ? "A câmera só funciona em página segura (HTTPS ou localhost)."
          : "Não foi possível abrir a câmera. Permita o acesso no navegador."
      );
      setAtivo(false);
      return false;
    }
  }, [ativo, elementId, processar]);

  useEffect(() => () => {
    if (leitorRef.current) {
      leitorRef.current.stop().catch(() => {});
      leitorRef.current = null;
    }
  }, []);

  return { ativo, flash, erro, iniciar, parar };
}
