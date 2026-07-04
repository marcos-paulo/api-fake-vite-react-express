/**
 * @type {import('puppeteer').Configuration}
 */
module.exports = {
  // O download é feito pelo nosso próprio postinstall (src/postinstall/download-puppeteer.ts),
  // que verifica um host/mirror customizado antes de baixar. Sem isso, o postinstall interno
  // do pacote puppeteer baixaria do host padrão antes do nosso script rodar.
  skipDownload: true,
};
