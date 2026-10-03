use std::io::{self, Read};

use serde::Deserialize;
use tauri::{WebviewUrl, WebviewWindowBuilder};

#[derive(Deserialize)]
struct Entrada {
    /// Endereço da interface web já servida pelo api-fake (inclui o `#token=...` quando o
    /// shell em Node o monta -- por isso vem pelo stdin e não por argumento: argumentos
    /// aparecem na lista de processos).
    url: String,
    #[serde(default = "titulo_padrao")]
    title: String,
    #[serde(default = "largura_padrao")]
    width: f64,
    #[serde(default = "altura_padrao")]
    height: f64,
    #[serde(default = "maximizada_padrao")]
    maximized: bool,
}

fn titulo_padrao() -> String {
    "api-fake".to_string()
}
fn largura_padrao() -> f64 {
    1280.0
}
fn altura_padrao() -> f64 {
    800.0
}
fn maximizada_padrao() -> bool {
    true
}

/// Contrato: `api-fake-tauri`, com o JSON de entrada pelo stdin -- ver README.md desta
/// pasta. Um processo por execução, igual aos outros shells (puppeteer): o
/// processo termina quando a janela é fechada, e quem chamou (o shell em Node) encerra
/// junto.
fn main() {
    let mut entrada_bruta = String::new();
    io::stdin()
        .read_to_string(&mut entrada_bruta)
        .expect("falha ao ler o JSON de entrada pelo stdin");

    let entrada: Entrada =
        serde_json::from_str(&entrada_bruta).expect("JSON de entrada inválido");
    let url: url::Url = entrada.url.parse().expect("campo 'url' inválido");

    tauri::Builder::default()
        .setup(move |app| {
            WebviewWindowBuilder::new(app, "main", WebviewUrl::External(url))
                .title(entrada.title)
                .inner_size(entrada.width, entrada.height)
                .maximized(entrada.maximized)
                .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("erro ao executar o app Tauri");
}
