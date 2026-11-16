/* Configurações do site — edite aqui os dados de contato. */
window.SITE = {
  nome: 'Alisson Orçatto',
  whatsapp: '5541992330484',        // DDI + DDD + número, só dígitos
  whatsappExibicao: '(41) 99233-0484',
  instagram: 'alisson_o.c',         // sem o @
  creci: 'CRECI 42733F',                        // ex.: 'CRECI 00000-F' — aparece no rodapé quando preenchido
  mensagemPadrao: 'Olá, Alisson! Vim pelo seu site e gostaria de mais informações.'
};

window.waLink = function (texto) {
  return 'https://wa.me/' + window.SITE.whatsapp + '?text=' + encodeURIComponent(texto || window.SITE.mensagemPadrao);
};

window.brl = function (n, casas) {
  return Number(n).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
    // sem casas informadas: mostra centavos só quando o valor tem centavos (R$ 5.287.000 ou R$ 89.900,50)
    minimumFractionDigits: casas === undefined ? (Number(n) % 1 ? 2 : 0) : casas,
    maximumFractionDigits: casas === undefined ? (Number(n) % 1 ? 2 : 0) : casas
  });
};
