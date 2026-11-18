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

export function useEsp32Mqtt(total, quantidadeItens) {
  const [codigo, setCodigo] = useState(lerCodigoSalvo);
  const [status, setStatus] = useState({
    texto: "Desconectado do display.",
    tipo: "",
  });
  const [conectado, setConectado] = useState(false);
  const clientRef = useRef(null);

  const codigoLimpo = (codigo || "demo")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "") || "demo";

  const encerrar = useCallback(() => {
    if (clientRef.current) {
      try {
        clientRef.current.end(true);
      } catch {
        /* ignore */
      }
      clientRef.current = null;
    }
  }, []);

  const publicar = useCallback(() => {
    const client = clientRef.current;
    if (!client?.connected) return;
    try {
      client.publish(`smartcart/${codigoLimpo}/total`, total.toFixed(2), {
        qos: 0,
        retain: true,
      });
      client.publish(
        `smartcart/${codigoLimpo}/itens`,
        String(quantidadeItens),
        { qos: 0, retain: true }
      );
    } catch (e) {
      console.warn("Falha ao enviar total ao ESP32:", e);
    }
  }, [codigoLimpo, total, quantidadeItens]);

  useEffect(() => {
    if (conectado) publicar();
  }, [conectado, publicar]);

  const desconectar = useCallback(() => {
    encerrar();
    setConectado(false);
    setStatus({ texto: "Desconectado do display.", tipo: "" });
  }, [encerrar]);

  const conectar = useCallback(() => {
    if (conectado) {
      desconectar();
      return;
    }

    try {
      localStorage.setItem(CHAVE_CODIGO, codigoLimpo);
    } catch {
      /* ignore */
    }

    encerrar();
    setConectado(false);
    setStatus({ texto: "Conectando ao display…", tipo: "" });

    const client = mqtt.connect(MQTT_URL, {
      clientId: "smartcart-web-" + Math.random().toString(16).slice(2, 10),
      clean: true,
      connectTimeout: 8000,
      reconnectPeriod: 3000,
    });
    clientRef.current = client;

    client.on("connect", () => {
      setConectado(true);
      setStatus({
        texto: `Conectado — total enviado ao ESP32 (${codigoLimpo}).`,
        tipo: "ok",
      });
      client.publish(`smartcart/${codigoLimpo}/total`, total.toFixed(2), {
        qos: 0,
        retain: true,
      });
      client.publish(
        `smartcart/${codigoLimpo}/itens`,
        String(quantidadeItens),
        { qos: 0, retain: true }
      );
    });

    client.on("reconnect", () => {
      setStatus({ texto: "Reconectando ao display…", tipo: "" });
    });

    client.on("error", (err) => {
      console.warn(err);
      setStatus({ texto: "Erro na conexão com o display.", tipo: "erro" });
    });

    client.on("close", () => {
      setConectado((era) => {
        if (era) {
          setStatus({
            texto: "Conexão com o display encerrada.",
            tipo: "erro",
          });
        }
        return false;
      });
    });
  }, [
    conectado,
    codigoLimpo,
    desconectar,
    encerrar,
    total,
    quantidadeItens,
  ]);

  useEffect(() => () => encerrar(), [encerrar]);

  return {
    codigo,
    setCodigo,
    status,
    conectado,
    conectar,
  };
}
