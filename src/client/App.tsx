import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import type { Endpoint, Endpoints } from "../types/Endpoints";
import { ServerStatus } from "../types/ServerStatus";
import { ListEndpoints } from "./components/ListEndpoints";

export default function App() {
  const [status, setStatus] = useState<ServerStatus | null>({
    activatedServer: false,
  });
  const [endpoints, setEndpoints] = useState<Endpoints | null>({
    listEndpoints: [],
  });

  const serverStatus = useCallback(async () => {
    setStatus(
      (await axios.get<ServerStatus>("/api/status")).data ?? {
        activatedServer: false,
      }
    );
  }, []);

  const desableApis = useCallback(async () => {
    await axios.post("/api/disable").then(() => {
      serverStatus();
      toListEndpoints();
    });
  }, []);

  const toListEndpoints = useCallback(async () => {
    try {
      const response = await axios.get<Endpoints>("/api/endpoints");
      response.status === 200 && setEndpoints(response.data);
    } catch (error) {
      console.error("Erro ao buscar endpoints:", error);
      setEndpoints({ listEndpoints: [] });
    }
  }, []);

  const toggleStateEndpoint = useCallback((endpoint: Endpoint) => {
    axios
      .post("/api/changeStateEndpoint", endpoint)
      .then(async () => {
        await toListEndpoints();
      })
      .catch((error) => {
        console.error("Erro ao alterar estado do endpoint:", error);
      });
  }, []);

  const closeServer = useCallback(async () => {
    await axios.post("/api/shutdown");
  }, []);

  useEffect(() => {}, []);

  useEffect(() => {
    // serverStatus();
    toListEndpoints().catch(console.error);
    // const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
    //   event.preventDefault();
    //   closeServer();
    //   return "";
    // };
    // window.addEventListener("beforeunload", handleBeforeUnload);
    // return () => {
    //   window.removeEventListener("beforeunload", handleBeforeUnload);
    // };
  }, [serverStatus, toListEndpoints]);

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "end",
          padding: "20px",
        }}
      >
        <button
          onClick={async () => {
            closeServer();
            console.log("fechar servidor");
            window.close();
          }}
        >
          Fechar servidor
        </button>
      </div>

      <ListEndpoints
        endpoints={endpoints}
        onToggleEndpoint={toggleStateEndpoint}
      />
    </>
  );
}
