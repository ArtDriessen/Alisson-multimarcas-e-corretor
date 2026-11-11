# Alisson Orçatto — Corretor Automotivo e Imobiliário

Site de catálogo de **veículos** e **imóveis**, com simulador de financiamento e contato direto por WhatsApp e Instagram.

Site estático (HTML, CSS e JavaScript puros): sem build, sem dependências. Basta abrir o `index.html` ou publicar a pasta em qualquer hospedagem.

## Páginas

| Arquivo | O que é |
| --- | --- |
| `index.html` | Início: logo AO em 3D (gira ao passar o mouse) e botões **Veículos** / **Imóveis** |
| `veiculos.html` | Catálogo de veículos, com busca e ordenação |
| `imoveis.html` | Catálogo de imóveis, com filtros por tipo e finalidade |
| `financiamento.html` | Simulador (veículo: Price; imóvel: Price ou SAC) |

## Como cadastrar um veículo ou imóvel

Tudo fica em **`data/catalogo.js`**:

1. Copie um bloco `{ ... }` de exemplo e cole logo abaixo (com vírgula no fim).
2. Troque os dados e **apague a linha `exemplo: true`** (ela mostra a etiqueta "Exemplo").
3. Suba as fotos em `assets/img/veiculos/` ou `assets/img/imoveis/` e liste os caminhos em `fotos: [...]`.
4. Para tirar um item do ar, apague o bloco dele.

## Dados de contato

Edite **`assets/js/config.js`**: WhatsApp, Instagram e CRECI (o CRECI aparece no rodapé quando preenchido).

## Observações

- A simulação de financiamento é **estimativa informativa**; as taxas padrão (veículo 1,89% a.m. e imóvel 0,95% a.m.) podem ser ajustadas em `assets/js/financiamento.js` (objeto `PERFIL`).
- As imagens da logo (`assets/img/ao.png`, `ao-lado.png`, `nome.png`) foram extraídas do cartão de visita. O efeito 3D empilha camadas da própria imagem do AO; para trocar a logo, substitua esses arquivos mantendo os nomes.
