/**
 * SmartCart — camada de acesso ao banco de produtos.
 * Fonte: data/produtos.json (código de barras EAN-13 atrelado a cada produto).
 */
(function (global) {
  "use strict";

  const CAMINHO_BANCO = "data/produtos.json";

  /** Fallback embutido caso o fetch falhe (ex.: abrir o HTML via file://). */
  const FALLBACK = {
    versao: 1,
    moeda: "BRL",
    produtos: [
      { id: "leite-integral-1l", nome: "Leite Integral 1L", preco: 4.99, codigoBarras: "7891000100011", categoria: "Laticínios", unidade: "un" },
      { id: "leite-desnatado-1l", nome: "Leite Desnatado 1L", preco: 5.29, codigoBarras: "7891000100028", categoria: "Laticínios", unidade: "un" },
      { id: "queijo-mussarela-200g", nome: "Queijo Mussarela 200g", preco: 14.5, codigoBarras: "7891000100035", categoria: "Laticínios", unidade: "un" },
      { id: "iogurte-natural-170g", nome: "Iogurte Natural 170g", preco: 3.29, codigoBarras: "7891000100042", categoria: "Laticínios", unidade: "un" },
      { id: "pao-frances", nome: "Pão Francês", preco: 0.89, codigoBarras: "7891000200018", categoria: "Padaria", unidade: "un" },
      { id: "pao-forma-500g", nome: "Pão de Forma 500g", preco: 7.49, codigoBarras: "7891000200025", categoria: "Padaria", unidade: "un" },
      { id: "duzia-ovos", nome: "Dúzia de Ovos", preco: 12.9, codigoBarras: "7891000300015", categoria: "Hortifruti", unidade: "un" },
      { id: "maca-fuji", nome: "Maçã Fuji (un)", preco: 1.49, codigoBarras: "7891000400012", categoria: "Hortifruti", unidade: "un" },
      { id: "banana-nanica", nome: "Banana Nanica (un)", preco: 0.79, codigoBarras: "7891000400029", categoria: "Hortifruti", unidade: "un" },
      { id: "arroz-5kg", nome: "Arroz Tipo 1 5kg", preco: 24.99, codigoBarras: "7891000500019", categoria: "Mercearia", unidade: "un" },
      { id: "feijao-carioca-1kg", nome: "Feijão Carioca 1kg", preco: 8.49, codigoBarras: "7891000500026", categoria: "Mercearia", unidade: "un" },
      { id: "cafe-500g", nome: "Café Torrado 500g", preco: 18.9, codigoBarras: "7891000600016", categoria: "Mercearia", unidade: "un" },
      { id: "acucar-1kg", nome: "Açúcar Cristal 1kg", preco: 4.29, codigoBarras: "7891000600023", categoria: "Mercearia", unidade: "un" },
      { id: "oleo-soja-900ml", nome: "Óleo de Soja 900ml", preco: 6.99, codigoBarras: "7891000700013", categoria: "Mercearia", unidade: "un" },
      { id: "sabao-po-1kg", nome: "Sabão em Pó 1kg", preco: 15.9, codigoBarras: "7891000800010", categoria: "Limpeza", unidade: "un" },
      { id: "agua-15l", nome: "Água Mineral 1,5L", preco: 2.49, codigoBarras: "7891000900017", categoria: "Bebidas", unidade: "un" },
      { id: "refrigerante-2l", nome: "Refrigerante 2L", preco: 9.99, codigoBarras: "7891000900024", categoria: "Bebidas", unidade: "un" },
      { id: "biscoito-recheado", nome: "Biscoito Recheado", preco: 3.99, codigoBarras: "7891001000013", categoria: "Mercearia", unidade: "un" }
    ]
  };

  let carregado = false;
  let origem = "nenhuma";
  const porId = Object.create(null);
  const porCodigo = Object.create(null);

  function normalizarCodigo(codigo) {
    return String(codigo || "")
      .trim()
      .replace(/\s+/g, "")
      .toUpperCase();
  }

  function indexar(lista) {
    Object.keys(porId).forEach((k) => delete porId[k]);
    Object.keys(porCodigo).forEach((k) => delete porCodigo[k]);

    for (const produto of lista) {
      if (!produto || !produto.id || !produto.codigoBarras) continue;
      const registro = {
        id: produto.id,
        nome: produto.nome,
        preco: Number(produto.preco),
        codigoBarras: normalizarCodigo(produto.codigoBarras),
        categoria: produto.categoria || "",
        unidade: produto.unidade || "un"
      };
      porId[registro.id] = registro;
      porCodigo[registro.codigoBarras] = registro;
    }
  }

  function aplicarDados(dados, deOnde) {
    const lista = Array.isArray(dados && dados.produtos) ? dados.produtos : [];
    indexar(lista);
    carregado = true;
    origem = deOnde;
    return listar();
  }

  async function carregar() {
    try {
      const resposta = await fetch(CAMINHO_BANCO, { cache: "no-store" });
      if (!resposta.ok) throw new Error("HTTP " + resposta.status);
      const dados = await resposta.json();
      return aplicarDados(dados, "json");
    } catch (erro) {
      console.warn(
        "Não foi possível ler data/produtos.json. Usando banco embutido.",
        erro
      );
      return aplicarDados(FALLBACK, "fallback");
    }
  }

  /**
   * Busca produto pelo código de barras lido pela câmera ou digitado.
   * Aceita EAN-13 e também o id interno (para testes).
   */
  function buscarPorCodigo(codigoLido) {
    const codigo = normalizarCodigo(codigoLido);
    if (!codigo) return null;
    if (porCodigo[codigo]) return porCodigo[codigo];
    if (porId[codigo.toLowerCase()]) return porId[codigo.toLowerCase()];
    return null;
  }

  function buscarPorId(id) {
    return porId[id] || null;
  }

  function listar() {
    return Object.values(porId).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }

  function estaPronto() {
    return carregado;
  }

  function info() {
    return {
      carregado,
      origem,
      total: Object.keys(porId).length,
      caminho: CAMINHO_BANCO
    };
  }

  global.SmartCartDB = {
    carregar,
    buscarPorCodigo,
    buscarPorId,
    listar,
    estaPronto,
    info,
    normalizarCodigo
  };
})(window);
