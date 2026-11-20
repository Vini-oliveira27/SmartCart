import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "./components/Header";
import ScannerPanel from "./components/ScannerPanel";
import EntradaManual from "./components/EntradaManual";
import Carrinho from "./components/Carrinho";
import BarraTotal from "./components/BarraTotal";
import CheckoutDialog from "./components/CheckoutDialog";
import Esp32Panel from "./components/Esp32Panel";
import CatalogoProdutos from "./components/CatalogoProdutos";
import Toast from "./components/Toast";
import { useCarrinho } from "./hooks/useCarrinho";
import { useBarcodeScanner } from "./hooks/useBarcodeScanner";
import { useEsp32Mqtt } from "./hooks/useEsp32Mqtt";
import { bancoProdutos } from "./data/produtos";
import { moeda } from "./utils/moeda";
import { feedbackErro, feedbackSucesso } from "./utils/feedback";
import "./App.css";

const READER_ID = "qr-reader";

export default function App() {
  const {
    carrinho,
    adicionar,
    alterarQuantidade,
    remover,
    limpar,
    desfazerRemocao,
    limparDesfazer,
    pendenteDesfazer,
    total,
    totalCentavos,
    quantidadeItens,
    orcamentoCentavos,
    definirOrcamentoReais,
  } = useCarrinho();

  const [toast, setToast] = useState(null);
  const [checkoutAberto, setCheckoutAberto] = useState(false);
  const [modoTecnico, setModoTecnico] = useState(false);
  const [saindoId, setSaindoId] = useState(null);

  const mostrarToast = useCallback((mensagem, tipo = "ok", extra = {}) => {
    setToast({ mensagem, tipo, ...extra });
  }, []);

  useEffect(() => {
    if (!toast || toast.persistente) return undefined;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!pendenteDesfazer) return undefined;
    const item = pendenteDesfazer;
    const nome = bancoProdutos[item.id]?.nome || "Item";
    setToast({
      mensagem: `${nome} removido`,
      tipo: "info",
      acaoLabel: "Desfazer",
      onAcao: () => desfazerRemocao(),
      persistente: false,
    });
    const t = window.setTimeout(() => {
      limparDesfazer();
      setToast((atual) =>
        atual?.acaoLabel === "Desfazer" ? null : atual
      );
    }, 4000);
    return () => window.clearTimeout(t);
  }, [pendenteDesfazer, desfazerRemocao, limparDesfazer]);

  const handleCodigo = useCallback(
    (codigo, flash) => {
      const id = adicionar(codigo);
      if (id) {
        feedbackSucesso();
        flash?.();
        const p = bancoProdutos[id];
        mostrarToast(`${p.nome} · ${moeda(p.preco)} adicionado`, "ok");
      } else {
        feedbackErro();
        mostrarToast("Produto não encontrado", "erro");
      }
    },
    [adicionar, mostrarToast]
  );

  const scanner = useBarcodeScanner(READER_ID, handleCodigo);
  const esp = useEsp32Mqtt(total, quantidadeItens);

  const nivelOrcamento = useMemo(() => {
    if (!orcamentoCentavos || orcamentoCentavos <= 0) return "";
    const ratio = totalCentavos / orcamentoCentavos;
    if (ratio >= 1) return "estourou";
    if (ratio >= 0.85) return "alerta";
    return "ok";
  }, [orcamentoCentavos, totalCentavos]);

  async function onToggleScanner() {
    if (scanner.ativo) {
      await scanner.parar();
      return;
    }
    await scanner.iniciar();
  }

  function onManual(codigo) {
    const id = adicionar(codigo);
    if (id) {
      feedbackSucesso();
      const p = bancoProdutos[id];
      mostrarToast(`${p.nome} · ${moeda(p.preco)} adicionado`, "ok");
    } else {
      feedbackErro();
      mostrarToast("Produto não encontrado", "erro");
    }
  }

  function onMenos(id) {
    const item = carrinho.find((i) => i.id === id);
    if (item && item.quantidade <= 1) {
      setSaindoId(id);
      window.setTimeout(() => {
        alterarQuantidade(id, -1);
        setSaindoId(null);
      }, 220);
      return;
    }
    alterarQuantidade(id, -1);
  }

  function onRemover(id) {
    setSaindoId(id);
    window.setTimeout(() => {
      remover(id);
      setSaindoId(null);
    }, 220);
  }

  return (
    <div className={`sc-app ${scanner.ativo ? "sc-scanning" : ""}`}>
      <div className="sc-shell">
        <Header
          compact={scanner.ativo}
          onAbrirTecnico={() => setModoTecnico(true)}
        />

        <Toast
          mensagem={toast?.mensagem}
          tipo={toast?.tipo}
          acaoLabel={toast?.acaoLabel}
          onAcao={() => {
            toast?.onAcao?.();
            setToast(null);
          }}
          onFechar={() => setToast(null)}
        />

        <section className="sc-panel sc-panel-scan">
          <div className="sc-panel-label">
            <span>01</span>
            <h2>Leitura</h2>
          </div>
          <ScannerPanel
            ativo={scanner.ativo}
            flash={scanner.flash}
            erro={scanner.erro}
            onAlternar={onToggleScanner}
            onTentarNovamente={scanner.tentarNovamente}
            torchDisponivel={scanner.torchDisponivel}
            torchOn={scanner.torchOn}
            onTorch={scanner.alternarTorch}
            readerId={READER_ID}
          />
          <EntradaManual onAdicionar={onManual} />
        </section>

        <section className="sc-panel">
          <div className="sc-panel-label">
            <span>02</span>
            <h2>Carrinho</h2>
          </div>
          <Carrinho
            itens={carrinho}
            quantidadeItens={quantidadeItens}
            onMais={(id) => alterarQuantidade(id, 1)}
            onMenos={onMenos}
            onRemover={onRemover}
            onLimpar={limpar}
            saindoId={saindoId}
          />
        </section>

        {modoTecnico && (
          <section className="sc-panel sc-panel-muted sc-panel-tech">
            <div className="sc-panel-label">
              <span>03</span>
              <h2>Integrações</h2>
              <button
                type="button"
                className="sc-tech-close"
                onClick={() => setModoTecnico(false)}
                aria-label="Fechar modo técnico"
              >
                Fechar
              </button>
            </div>
            <Esp32Panel
              codigo={esp.codigo}
              onCodigoChange={esp.setCodigo}
              codigoTeste={esp.codigoTeste}
              fase={esp.fase}
              statusTexto={esp.statusTexto}
              onConectar={esp.conectar}
              onTentarNovamente={esp.tentarNovamente}
              orcamentoCentavos={orcamentoCentavos}
              onOrcamentoChange={definirOrcamentoReais}
            />
            <CatalogoProdutos />
          </section>
        )}
      </div>

      <BarraTotal
        total={total}
        quantidadeItens={quantidadeItens}
        disabled={carrinho.length === 0}
        nivelOrcamento={nivelOrcamento}
        onFinalizar={() => setCheckoutAberto(true)}
      />

      <CheckoutDialog
        aberto={checkoutAberto}
        itens={carrinho}
        total={total}
        onVoltar={() => setCheckoutAberto(false)}
        onConfirmar={() => {
          limpar();
        }}
      />
    </div>
  );
}
