/* ============================================================
   CATÁLOGO — é aqui que você cadastra veículos e imóveis.

   COMO ADICIONAR UM ITEM
   1. Copie um bloco { ... } de exemplo e cole logo abaixo, com vírgula.
   2. Troque os dados. Apague a linha  exemplo: true  (ela mostra a etiqueta "Exemplo").
   3. Fotos: coloque os arquivos em  assets/img/veiculos/  ou  assets/img/imoveis/
      e liste os caminhos em  fotos: ['assets/img/veiculos/civic-1.jpg', ...]
      (sem fotos, o site mostra um espaço reservado "Foto em breve").
   4. Para tirar um item do ar, apague o bloco dele (ou comente com //).

   Valores: preco é um número sem pontos nem R$ (ex.: 62900).
   ============================================================ */

window.CATALOGO = {

  veiculos: [
    {
      id: 'exemplo-veiculo-1',
      exemplo: true,
      marca: 'Marca',
      modelo: 'Hatch 1.0 Flex',
      ano: 2020,
      km: 45000,
      cambio: 'Manual',
      combustivel: 'Flex',
      cor: 'Prata',
      preco: 62900,
      fotos: []
    },
    {
      id: 'exemplo-veiculo-2',
      exemplo: true,
      marca: 'Marca',
      modelo: 'Sedã 2.0 Automático',
      ano: 2019,
      km: 62000,
      cambio: 'Automático',
      combustivel: 'Flex',
      cor: 'Preto',
      preco: 89900,
      fotos: []
    },
    {
      id: 'exemplo-veiculo-3',
      exemplo: true,
      marca: 'Marca',
      modelo: 'SUV 1.6 Turbo',
      ano: 2022,
      km: 28000,
      cambio: 'Automático',
      combustivel: 'Gasolina',
      cor: 'Branco',
      preco: 124900,
      fotos: []
    }
  ],

  imoveis: [
    {
      id: 'exemplo-imovel-1',
      exemplo: true,
      tipo: 'Casa',
      finalidade: 'Venda',
      titulo: 'Casa com 3 quartos e quintal',
      bairro: 'Bairro',
      cidade: 'Cidade',
      quartos: 3,
      banheiros: 2,
      vagas: 2,
      area: 140,
      preco: 480000,
      fotos: []
    },
    {
      id: 'exemplo-imovel-2',
      exemplo: true,
      tipo: 'Apartamento',
      finalidade: 'Venda',
      titulo: 'Apartamento com 2 quartos',
      bairro: 'Bairro',
      cidade: 'Cidade',
      quartos: 2,
      banheiros: 1,
      vagas: 1,
      area: 68,
      preco: 320000,
      fotos: []
    },
    {
      id: 'exemplo-imovel-3',
      exemplo: true,
      tipo: 'Terreno',
      finalidade: 'Venda',
      titulo: 'Terreno plano pronto para construir',
      bairro: 'Bairro',
      cidade: 'Cidade',
      quartos: 0,
      banheiros: 0,
      vagas: 0,
      area: 360,
      preco: 150000,
      fotos: []
    }
  ]
};
