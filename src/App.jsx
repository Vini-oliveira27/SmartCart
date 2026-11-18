import { useCallback, useEffect, useState } from "react";
import Header from "./components/Header";
import StatusBar from "./components/StatusBar";
import ScannerPanel from "./components/ScannerPanel";
import EntradaManual from "./components/EntradaManual";
import Carrinho from "./components/Carrinho";
import BarraTotal from "./components/BarraTotal";
import ResumoDialog from "./components/ResumoDialog";
import Esp32Panel from "./components/Esp32Panel";
import CatalogoProdutos from "./components/CatalogoProdutos";
import { useCarrinho } from "./hooks/useCarrinho";
import { useBarcodeScanner } from "./hooks/useBarcodeScanner";
import { useEsp32Mqtt } from "./hooks/useEsp32Mqtt";
import { bancoProdutos } from "./data/produtos";
import { feedbackErro, feedbackSucesso } from "./utils/feedback";
import "./App.css";

const READER_ID = "qr-reader";
const MSG_CAMERA =
  "Câmera ativa — retire o código da visão para ler de novo";

export default function App() {
  const {
    carrinho,
    adicionar,
    alterarQuantidade,
    remover,
    limpar,
    total,
    quantidadeItens,
  } = useCarrinho();

  const [status, setStatus] = useState({
    texto: 'Toque em "Iniciar leitura" para escanear os produtos.',
    tipo: "",
  });
  const [resumoAberto, setResumoAberto] = useState(false);

  const mostrarStatus = useCallback((texto, tipo = "") => {
    setStatus({ texto, tipo });
  }, []);

  const handleCodigo = useCallback(
    (codigo, flash) => {
      const id = adicionar(codigo);
      if (id) {
        feedbackSucesso();
        flash?.();
        mostrarStatus(`✔ ${bancoProdutos[id].nome} adicionado`, "ok");
      } else {
        feedbackErro();
        mostrarStatus(`Produto não cadastrado: ${codigo}`, "erro");
      }
    },
    [adicionar, mostrarStatus]
  );

  const scanner = useBarcodeScanner(READER_ID, handleCodigo);
  const esp = useEsp32Mqtt(total, quantidadeItens);

  useEffect(() => {
    if (!scanner.ativo || !status.tipo) return undefined;
    const t = window.setTimeout(() => {
      setStatus({ texto: MSG_CAMERA, tipo: "" });
    }, 2000);
    return () => window.clearTimeout(t);
  }, [status, scanner.ativo]);

  const statusExibido = scanner.erro
    ? { texto: scanner.erro, tipo: "erro" }
    : status;

  async function onToggleScanner() {
    if (scanner.ativo) {
      await scanner.parar();
      mostrarStatus("Leitura parada.");
      return;
    }
    const ok = await scanner.iniciar();
    if (ok) mostrarStatus(MSG_CAMERA);
  }

  function onManual(codigo) {
    const id = adicionar(codigo);
    if (id) {
      feedbackSucesso();
      mostrarStatus(`✔ ${bancoProdutos[id].nome} adicionado`, "ok");
    } else {
      feedbackErro();
      mostrarStatus(`Produto não cadastrado: ${codigo}`, "erro");
    }
  }

  function onLimpar() {
    if (confirm("Remover todos os itens do carrinho?")) limpar();
  }

  return (
    <div className="sc-app">
      <div className="sc-shell">
        <Header />
        <StatusBar texto={statusExibido.texto} tipo={statusExibido.tipo} />
        <ScannerPanel
          ativo={scanner.ativo}
          flash={scanner.flash}
          onAlternar={onToggleScanner}
          readerId={READER_ID}
        />
        <EntradaManual onAdicionar={onManual} />
        <Carrinho
          itens={carrinho}
          quantidadeItens={quantidadeItens}
          onMais={(id) => alterarQuantidade(id, 1)}
          onMenos={(id) => alterarQuantidade(id, -1)}
          onRemover={remover}
          onLimpar={onLimpar}
        />
        <Esp32Panel
          codigo={esp.codigo}
          onCodigoChange={esp.setCodigo}
          conectado={esp.conectado}
          status={esp.status}
          onConectar={esp.conectar}
        />
        <CatalogoProdutos />
      </div>

      <BarraTotal
        total={total}
        disabled={carrinho.length === 0}
        onFinalizar={() => setResumoAberto(true)}
      />

      <ResumoDialog
        aberto={resumoAberto}
        itens={carrinho}
        total={total}
        onVoltar={() => setResumoAberto(false)}
        onNova={() => {
          limpar();
          setResumoAberto(false);
          mostrarStatus("Nova compra iniciada.");
        }}
      />
    </div>
  );
}
