import { useCallback, useEffect, useMemo, useState } from "react";
import { bancoProdutos, resolverIdProduto } from "../data/produtos";

const CHAVE_STORAGE = "smartcart.carrinho";

function carregarInicial() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_STORAGE));
    if (!Array.isArray(salvo)) return [];
    return salvo.filter(
      (i) =>
        i &&
        bancoProdutos[i.id] &&
        Number.isInteger(i.quantidade) &&
        i.quantidade > 0
    );
  } catch {
    return [];
  }
}

export function useCarrinho() {
  const [carrinho, setCarrinho] = useState(carregarInicial);

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_STORAGE, JSON.stringify(carrinho));
    } catch (e) {
      console.warn("Não foi possível salvar o carrinho:", e);
    }
  }, [carrinho]);

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

    return id;
  }, []);

  const alterarQuantidade = useCallback((id, delta) => {
    setCarrinho((atual) =>
      atual
        .map((i) =>
          i.id === id ? { ...i, quantidade: i.quantidade + delta } : i
        )
        .filter((i) => i.quantidade > 0)
    );
  }, []);

  const remover = useCallback((id) => {
    setCarrinho((atual) => atual.filter((i) => i.id !== id));
  }, []);

  const limpar = useCallback(() => setCarrinho([]), []);

  const total = useMemo(
    () =>
      carrinho.reduce(
        (acc, i) => acc + bancoProdutos[i.id].preco * i.quantidade,
        0
      ),
    [carrinho]
  );

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
    total,
    quantidadeItens,
  };
}
