import axios from 'axios';

const STORAGE_KEY = 'api-fake:panel-token';
const TOKEN_HEADER = 'x-api-fake-token';

export const TOKEN_REQUIRED_EVENT = 'api-fake:panel-token-required';

export type TokenRequiredDetail = { tokenFile?: string };

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveStoredToken(token: string) {
  try {
    localStorage.setItem(STORAGE_KEY, token.trim());
  } catch {
    // sem localStorage (janela privada, dados bloqueados): o token vale só até recarregar
    memoryToken = token.trim();
  }
}

let memoryToken: string | null = null;

// Os shells puppeteer/tauri abrem a janela em `<url>#token=...` (eles leem o arquivo do
// token): guarda e limpa o fragmento pra o token não ficar na barra de endereço.
function consumeTokenFromUrlFragment() {
  const match = /(?:^#|&)token=([^&]+)/.exec(window.location.hash);
  if (!match) return;

  saveStoredToken(decodeURIComponent(match[1]));
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
}

/**
 * Faz toda chamada do painel levar o token e, ao receber 401 do servidor, avisa a interface
 * (PanelTokenGate) pra pedir o token. Chamar uma vez, antes de renderizar o app.
 */
export function installPanelTokenInterceptors() {
  consumeTokenFromUrlFragment();

  axios.interceptors.request.use((config) => {
    const token = readStoredToken() ?? memoryToken;
    if (token) config.headers.set(TOKEN_HEADER, token);
    return config;
  });

  axios.interceptors.response.use(undefined, (error: unknown) => {
    if (
      axios.isAxiosError<{ code?: string; tokenFile?: string }>(error) &&
      error.response?.status === 401 &&
      error.response.data?.code === 'panel_token_required'
    ) {
      window.dispatchEvent(
        new CustomEvent<TokenRequiredDetail>(TOKEN_REQUIRED_EVENT, {
          detail: { tokenFile: error.response.data.tokenFile },
        }),
      );
    }
    return Promise.reject(error);
  });
}
