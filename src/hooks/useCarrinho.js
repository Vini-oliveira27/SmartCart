import { useCallback, useEffect, useMemo, useState } from "react";
import { bancoProdutos, resolverIdProduto } from "../data/produtos";
import { deCentavos, paraCentavos } from "../utils/moeda";

const CHAVE_STORAGE = "smartcart.carrinho";
const CHAVE_ORCAMENTO = "smartcart.orcamentoCentavos";

function itemValido(i) {
  return (
    i &&
    typeof i.id === "string" &&
    bancoProdutos[i.id] &&
    Number.isInteger(i.quantidade) &&
    i.quantidade > 0
  );
}

function carregarInicial() {
  try {
    const bruto = localStorage.getItem(CHAVE_STORAGE);
    if (!bruto) return [];
    const salvo = JSON.parse(bruto);
    if (!Array.isArray(salvo)) return [];
    return salvo.filter(itemValido);
  } catch {
    return [];
  }
}

function carregarOrcamento() {
  try {
    const bruto = localStorage.getItem(CHAVE_ORCAMENTO);
    if (!bruto) return null;
    const n = Number(bruto);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  } catch {
    return null;
  }
}

export function useCarrinho() {
  const [carrinho, setCarrinho] = useState(carregarInicial);
  const [orcamentoCentavos, setOrcamentoCentavos] = useState(carregarOrcamento);
  const [pendenteDesfazer, setPendenteDesfazer] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_STORAGE, JSON.stringify(carrinho));
    } catch (e) {
      console.warn("Não foi possível salvar o carrinho:", e);
    }
  }, [carrinho]);

  useEffect(() => {
    try {
      if (orcamentoCentavos == null) {
        localStorage.removeItem(CHAVE_ORCAMENTO);
      } else {
        localStorage.setItem(CHAVE_ORCAMENTO, String(orcamentoCentavos));
      }
    } catch (e) {
      console.warn("Não foi possível salvar o orçamento:", e);
    }
  }, [orcamentoCentavos]);

  const adicionar = useCallback((codigoLido) => {
    const id = resolverIdProduto(codigoLido);
    if (!id) return null;

    setCarrinho((atual) => {
      const existente = atual.find((i) => i.id === id);
      if (existente) {
        return atual.map((i) =>
          i.id === id ? { ...i, quantidade: i.quantidade + 1 } : i
        );
      }
      return [...atual, { id, quantidade: 1 }];
    });
    setPendenteDesfazer(null);
    return id;
  }, []);

  const alterarQuantidade = useCallback((id, delta) => {
    setCarrinho((atual) => {
      const item = atual.find((i) => i.id === id);
      if (!item) return atual;

      const novaQtd = item.quantidade + delta;
      if (novaQtd <= 0) {
        window.setTimeout(() => setPendenteDesfazer({ ...item }), 0);
        return atual.filter((i) => i.id !== id);
      }

      return atual.map((i) =>
        i.id === id ? { ...i, quantidade: novaQtd } : i
      );
    });
  }, []);

  const remover = useCallback((id) => {
    setCarrinho((atual) => {
      const item = atual.find((i) => i.id === id);
      if (item) {
        window.setTimeout(() => setPendenteDesfazer({ ...item }), 0);
      }
      return atual.filter((i) => i.id !== id);
    });
  }, []);

  const desfazerRemocao = useCallback(() => {
    setPendenteDesfazer((item) => {
      if (!item) return null;
      setCarrinho((atual) => {
        const existente = atual.find((i) => i.id === item.id);
        if (existente) {
          return atual.map((i) =>
            i.id === item.id
              ? { ...i, quantidade: i.quantidade + item.quantidade }
              : i
          );
        }
        return [...atual, item];
      });
      return null;
    });
  }, []);

  const limparDesfazer = useCallback(() => setPendenteDesfazer(null), []);

  const limpar = useCallback(() => {
    setCarrinho([]);
    setPendenteDesfazer(null);
  }, []);

  const definirOrcamentoReais = useCallback((valor) => {
    if (valor == null || valor === "" || Number(valor) <= 0) {
      setOrcamentoCentavos(null);
      return;
    }
    setOrcamentoCentavos(paraCentavos(valor));
  }, []);

  const totalCentavos = useMemo(
    () =>
      carrinho.reduce(
        (acc, i) =>
          acc + paraCentavos(bancoProdutos[i.id].preco) * i.quantidade,
        0
      ),
    [carrinho]
  );

  const total = useMemo(() => deCentavos(totalCentavos), [totalCentavos]);

  const quantidadeItens = useMemo(
    () => carrinho.reduce((acc, i) => acc + i.quantidade, 0),
    [carrinho]
  );

  return {
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
  };
}
