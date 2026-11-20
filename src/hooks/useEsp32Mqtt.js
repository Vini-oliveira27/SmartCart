import { useCallback, useEffect, useRef, useState } from "react";
import mqtt from "mqtt";

const MQTT_URL = "wss://broker.hivemq.com:8884/mqtt";
const CHAVE_CODIGO = "smartcart.codigoCarrinho";
const CODIGO_TESTE = "demo";

function lerCodigoSalvo() {
  try {
    const salvo = localStorage.getItem(CHAVE_CODIGO);
    // "demo" fica só como placeholder — não pré-preenche o campo.
    if (!salvo || salvo === CODIGO_TESTE) return "";
    return salvo;
  } catch {
    return "";
  }
}

function limparCodigo(valor) {
  return (
    String(valor || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "") || CODIGO_TESTE
  );
}

/**
 * Integração MQTT com o display ESP32.
 * Tópicos: smartcart/{codigo}/total e smartcart/{codigo}/itens
 * (mesmo CODIGO_CARRINHO do firmware).
 */
export function useEsp32Mqtt(total, quantidadeItens) {
  const [codigo, setCodigo] = useState(lerCodigoSalvo);
  const [fase, setFase] = useState("desconectado"); // desconectado | conectando | conectado | erro
  const [statusTexto, setStatusTexto] = useState("Desconectado do display");
  const clientRef = useRef(null);
  const intencionalRef = useRef(false);
  const totalRef = useRef(total);
  const qtdRef = useRef(quantidadeItens);
  const codigoRef = useRef(limparCodigo(codigo));

  useEffect(() => {
    totalRef.current = total;
    qtdRef.current = quantidadeItens;
  }, [total, quantidadeItens]);

  useEffect(() => {
    codigoRef.current = limparCodigo(codigo);
  }, [codigo]);

  const codigoLimpo = limparCodigo(codigo);

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
    if (!client?.connected) return false;
    const cod = codigoRef.current;
    try {
      // Integração display ESP32 — total em reais com 2 casas.
      client.publish(
        `smartcart/${cod}/total`,
        Number(totalRef.current).toFixed(2),
        { qos: 0, retain: true }
      );
      client.publish(`smartcart/${cod}/itens`, String(qtdRef.current), {
        qos: 0,
        retain: true,
      });
      return true;
    } catch (e) {
      console.warn("Falha ao enviar total ao ESP32:", e);
      setFase("erro");
      setStatusTexto("Falha ao enviar total ao display");
      return false;
    }
  }, []);

  // Reenvia o total sempre que ele muda e há conexão.
  useEffect(() => {
    if (fase === "conectado") publicar();
  }, [fase, total, quantidadeItens, publicar]);

  const desconectar = useCallback(() => {
    intencionalRef.current = true;
    encerrar();
    setFase("desconectado");
    setStatusTexto("Desconectado do display");
  }, [encerrar]);

  const iniciarConexao = useCallback(() => {
    const cod = limparCodigo(codigoRef.current);

    try {
      localStorage.setItem(CHAVE_CODIGO, cod);
    } catch {
      /* ignore */
    }

    intencionalRef.current = false;
    encerrar();
    setFase("conectando");
    setStatusTexto("Conectando…");

    const client = mqtt.connect(MQTT_URL, {
      clientId: "smartcart-web-" + Math.random().toString(16).slice(2, 10),
      clean: true,
      connectTimeout: 8000,
      reconnectPeriod: 3000,
    });
    clientRef.current = client;

    client.on("connect", () => {
      setFase("conectado");
      setStatusTexto("Conectado ao display");
      client.publish(
        `smartcart/${cod}/total`,
        Number(totalRef.current).toFixed(2),
        { qos: 0, retain: true }
      );
      client.publish(`smartcart/${cod}/itens`, String(qtdRef.current), {
        qos: 0,
        retain: true,
      });
    });

    client.on("reconnect", () => {
      if (!intencionalRef.current) {
        setFase("conectando");
        setStatusTexto("Conectando…");
      }
    });

    client.on("error", (err) => {
      console.warn(err);
      setFase("erro");
      setStatusTexto("Falha na conexão com o display");
    });

    client.on("close", () => {
      if (intencionalRef.current) return;
      setFase((atual) => {
        if (atual === "desconectado") return atual;
        setStatusTexto("Conexão com o display encerrada");
        return "erro";
      });
    });
  }, [encerrar]);

  const conectar = useCallback(() => {
    if (fase === "conectado" || fase === "conectando") {
      desconectar();
      return;
    }
    iniciarConexao();
  }, [fase, desconectar, iniciarConexao]);

  const tentarNovamente = useCallback(() => {
    desconectar();
    window.setTimeout(() => iniciarConexao(), 80);
  }, [desconectar, iniciarConexao]);

  useEffect(() => () => encerrar(), [encerrar]);

  return {
    codigo,
    setCodigo,
    codigoLimpo,
    fase,
    statusTexto,
    conectado: fase === "conectado",
    conectar,
    desconectar,
    tentarNovamente,
    codigoTeste: CODIGO_TESTE,
  };
}
