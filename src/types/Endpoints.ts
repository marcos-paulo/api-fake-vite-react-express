export type Endpoints = {
  listEndpoints: Endpoint[];
};

export type Endpoint = {
  description: string;
  serverAddress: string;
  localhostAddress: string;
  method: string;
  enabled: boolean;
};
