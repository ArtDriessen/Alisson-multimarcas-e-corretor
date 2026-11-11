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
| `admin/` | Painel de cadastro do estoque (login por senha) |

## Painel do Alisson (`/admin`)

Endereço: `https://SEU-SITE/admin/`. Pelo celular ou computador o Alisson entra com a senha dele e:

- cadastra, edita e exclui **veículos** e **imóveis**, com até 12 fotos cada (a primeira é a capa; dá para reordenar);
- marca o item como **Disponível**, **Reservado** (continua no site com etiqueta) ou **Vendido** (some do site, mas fica no painel);
- baixa um **backup** do estoque e troca a senha em "Conta".

O que ele cadastra aparece no site na hora. Enquanto nada for cadastrado, o site mostra os itens de exemplo de `data/catalogo.js`; ao salvar o primeiro item real, os exemplos somem.

### Como funciona (para quem for dar manutenção)

- Backend em PHP puro, sem banco de dados: `admin/api.php` (painel), `api/catalogo.php` (lista pública) e `api/foto.php` (entrega as fotos).
- Os **dados ficam fora da pasta pública** (`ao-dados/`, ao lado de `public_html`), então atualizar o código pelo GitHub nunca apaga o estoque. Existe `catalogo.anterior.json` com a versão anterior de cada gravação.
- Senha com bcrypt, sessão por cookie assinado (HttpOnly, SameSite=Strict), proteção CSRF, bloqueio de 15 min após 5 senhas erradas e logout que invalida a sessão no servidor.
- Fotos são validadas, giradas conforme o EXIF e reduzidas para no máximo 1600 px (JPEG).
- A senha inicial só vale até o primeiro acesso: o painel obriga a criar uma senha pessoal. Se esquecer a senha, apague `ao-dados/auth.php` no servidor para voltar à senha inicial.

## Dados de contato

Edite **`assets/js/config.js`**: WhatsApp, Instagram e CRECI (o CRECI aparece no rodapé quando preenchido).

## Observações

- A simulação de financiamento é **estimativa informativa**; as taxas padrão (veículo 1,89% a.m. e imóvel 0,95% a.m.) podem ser ajustadas em `assets/js/financiamento.js` (objeto `PERFIL`).
- As imagens da logo (`assets/img/ao.png`, `ao-lado.png`, `nome.png`) foram extraídas do cartão de visita. O efeito 3D empilha camadas da própria imagem do AO; para trocar a logo, substitua esses arquivos mantendo os nomes.
