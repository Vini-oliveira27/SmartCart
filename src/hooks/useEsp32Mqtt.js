import { useCallback, useEffect, useRef, useState } from "react";
import mqtt from "mqtt";

const MQTT_URL = "wss://broker.hivemq.com:8884/mqtt";
const CHAVE_CODIGO = "smartcart.codigoCarrinho";

function lerCodigoSalvo() {
  try {
    return localStorage.getItem(CHAVE_CODIGO) || "demo";
  } catch {
    return "demo";
  }
}

function limparCodigo(valor) {
  return (
    String(valor || "demo")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "") || "demo"
  );
}

export function useEsp32Mqtt(total, quantidadeItens) {
  const [codigo, setCodigo] = useState(lerCodigoSalvo);
  const [status, setStatus] = useState({
    texto: "Desconectado",
    tipo: "",
  });
  const [conectado, setConectado] = useState(false);
  const [comandoAtual, setComandoAtual] = useState("parar");

  const clientRef = useRef(null);
  const manualCloseRef = useRef(false);
  const totalRef = useRef(total);
  const itensRef = useRef(quantidadeItens);
  const codigoRef = useRef(limparCodigo(codigo));

  useEffect(() => {
    totalRef.current = total;
  }, [total]);

  useEffect(() => {
    itensRef.current = quantidadeItens;
  }, [quantidadeItens]);

  useEffect(() => {
    codigoRef.current = limparCodigo(codigo);
  }, [codigo]);

  const publicar = useCallback(() => {
    const client = clientRef.current;
    if (!client?.connected) return;
    const id = codigoRef.current;
    try {
      client.publish(`smartcart/${id}/total`, Number(totalRef.current).toFixed(2), {
        qos: 0,
        retain: true,
      });
      client.publish(`smartcart/${id}/itens`, String(itensRef.current), {
        qos: 0,
        retain: true,
      });
    } catch (e) {
      console.warn("Falha ao enviar total ao ESP32:", e);
    }
  }, []);

  useEffect(() => {
    if (conectado) publicar();
  }, [conectado, total, quantidadeItens, publicar]);

  const encerrar = useCallback(() => {
    if (!clientRef.current) return;
    try {
      clientRef.current.end(true);
    } catch {
      /* ignore */
    }
    clientRef.current = null;
  }, []);

  const enviarComando = useCallback((comando) => {
    const client = clientRef.current;
    const id = codigoRef.current;
    const cmd = String(comando || "parar").toLowerCase();
    // Evita re-render a cada 150ms (isso soltava o botão e mandava "parar")
    setComandoAtual((atual) => (atual === cmd ? atual : cmd));
    if (!client?.connected) return false;
    try {
      client.publish(`smartcart/${id}/cmd`, cmd, { qos: 1, retain: false });
      return true;
    } catch (e) {
      console.warn("Falha ao enviar comando ao carrinho:", e);
      return false;
    }
  }, []);

  const publicarPresenca = useCallback((online) => {
    const client = clientRef.current;
    if (!client?.connected) return;
    const id = codigoRef.current;
    try {
      client.publish(
        `smartcart/${id}/site`,
        online ? id : "offline",
        { qos: 0, retain: true }
      );
    } catch (e) {
      console.warn("Falha ao publicar presença do site:", e);
    }
  }, []);

  const desconectar = useCallback(() => {
    enviarComando("parar");
    publicarPresenca(false);
    manualCloseRef.current = true;
    encerrar();
    setConectado(false);
    setComandoAtual("parar");
    setStatus({ texto: "Desconectado", tipo: "" });
  }, [encerrar, enviarComando, publicarPresenca]);

  const conectar = useCallback(() => {
    if (clientRef.current?.connected || conectado) {
      desconectar();
      return;
    }

    const id = limparCodigo(codigo);
    setCodigo(id);
    codigoRef.current = id;

    try {
      localStorage.setItem(CHAVE_CODIGO, id);
    } catch {
      /* ignore */
    }

    manualCloseRef.current = false;
    encerrar();
    setConectado(false);
    setStatus({ texto: "Conectando…", tipo: "" });

    const client = mqtt.connect(MQTT_URL, {
      clientId: "smartcart-web-" + Math.random().toString(16).slice(2, 10),
      clean: true,
      connectTimeout: 10000,
      reconnectPeriod: 2500,
      protocolVersion: 4,
      will: {
        topic: `smartcart/${id}/site`,
        payload: "offline",
        qos: 0,
        retain: true,
      },
    });
    clientRef.current = client;

    client.on("connect", () => {
      setConectado(true);
      setStatus({
        texto: `Conectado (${id})`,
        tipo: "ok",
      });
      // Avisa a TFT que o site entrou (ex.: "demo")
      client.publish(`smartcart/${id}/site`, id, { qos: 0, retain: true });
      publicar();
      client.publish(`smartcart/${id}/cmd`, "parar", { qos: 0, retain: false });
    });

    client.on("reconnect", () => {
      setStatus({ texto: "Reconectando…", tipo: "" });
    });

    client.on("error", (err) => {
      console.warn(err);
      setStatus({ texto: "Erro de conexão", tipo: "erro" });
    });

    client.on("close", () => {
      if (manualCloseRef.current) return;
      setConectado(false);
      setComandoAtual("parar");
      setStatus({
        texto: "Desconectado",
        tipo: "erro",
      });
    });
  }, [codigo, conectado, desconectar, encerrar, publicar]);

  useEffect(() => () => {
    manualCloseRef.current = true;
    try {
      const id = codigoRef.current;
      clientRef.current?.publish(`smartcart/${id}/cmd`, "parar", {
        qos: 0,
        retain: false,
      });
      clientRef.current?.publish(`smartcart/${id}/site`, "offline", {
        qos: 0,
        retain: true,
      });
    } catch {
      /* ignore */
    }
    encerrar();
  }, [encerrar]);

  return {
    codigo,
    setCodigo,
    status,
    conectado,
    comandoAtual,
    conectar,
    enviarComando,
  };
}
