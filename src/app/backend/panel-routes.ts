/**
 * Rotas que só o painel (humano) usa. Lista explícita, e não "tudo em /api": os endpoints fake
 * também vivem em caminhos livres (inclusive /api/...), então um prefixo geral interceptaria
 * requests dos fakes.
 */
export const PANEL_MUTATING_PATHS = [
  '/api/changeStateEndpoint',
  '/api/changeActiveHandler',
  '/api/open-endpoint-file',
  '/api/shutdown',
  '/api/approvals/approve',
  '/api/approvals/revoke',
  '/api/approvals/revert-agent-handler',
];

export const PANEL_READ_PATHS = ['/api/endpoints', '/api/events', '/api/approvals/pending'];

export const PANEL_PATHS = [...PANEL_MUTATING_PATHS, ...PANEL_READ_PATHS];
