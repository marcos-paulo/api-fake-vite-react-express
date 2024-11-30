import { DynamicSeverActiveDesactive } from "./components/DynamicSeverActiveDesactive";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import type { Endpoint, Endpoints } from "../types/Endpoints";
import { ServerStatus } from "../types/ServerStatus";
import { ListEndpoints } from "./components/ListEndpoints";

export default function App() {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [endpoints, setEndpoints] = useState<Endpoints | null>(null);

  const serverStatus = useCallback(async () => {
    setStatus((await axios.get<ServerStatus>("/api/status")).data);
  }, []);

  const activeServer = useCallback(async () => {
    await axios.post("/api/active").then(() => {
      serverStatus();
      toListEndpoints();
    });
  }, []);

  const disableServer = useCallback(async () => {
    await axios.post("/api/disable").then(() => {
      serverStatus();
      toListEndpoints();
    });
  }, []);

  const toListEndpoints = useCallback(async () => {
    const fetchResult = axios.get<Endpoints>("/api/endpoints");
    fetchResult.then(serverStatus);
    setEndpoints((await fetchResult).data);
  }, []);

  const toggleStateEndpoint = useCallback((endpoint: Endpoint) => {
    axios.post("/api/changeStateEndpoint", endpoint).then(toListEndpoints);
  }, []);

  const closeServer = useCallback(async () => {
    await axios.post("/api/shutdown");
  }, []);

  useEffect(() => {}, []);

  useEffect(() => {
    serverStatus();
    toListEndpoints();

    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      event.preventDefault();
      closeServer();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [serverStatus, toListEndpoints]);

  return (
    <>
      <DynamicSeverActiveDesactive
        serverStatus={status}
        onChangeStateServer={() => {
          if (!status) return;
          else if (status.activatedServer) disableServer();
          else activeServer();
        }}
      />

      <ListEndpoints
        endpoints={endpoints}
        onToggleEndpoint={toggleStateEndpoint}
      />
    </>
  );
}
