export type Endpoints = {
  listEndpoints: Endpoint[];
};

export type Endpoint = {
  serverAddress: string;
  localhostAddress: string;
  method: string;
  enabled: boolean;
};
