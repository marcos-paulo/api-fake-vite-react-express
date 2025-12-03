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
  const [isLoadingEndpoints, setIsLoadingEndpoints] = useState(false);
  const [isTogglingEndpoint, setIsTogglingEndpoint] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);

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
    setIsLoadingEndpoints(true);
    setFeedbackMessage({ text: "Carregando endpoints...", type: "info" });
    try {
      const response = await axios.get<Endpoints>("/api/endpoints");
      if (response.status === 200) {
        setEndpoints(response.data);
        setFeedbackMessage({ text: "Endpoints carregados com sucesso!", type: "success" });
      }
    } catch (error) {
      console.error("Erro ao buscar endpoints:", error);
      setEndpoints({ listEndpoints: [] });
      setFeedbackMessage({ text: "Erro ao carregar endpoints", type: "error" });
    } finally {
      setIsLoadingEndpoints(false);
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  }, []);

  const toggleStateEndpoint = useCallback(async (endpoint: Endpoint) => {
    setIsTogglingEndpoint(true);
    setFeedbackMessage({ text: `Alterando estado do endpoint...`, type: "info" });
    try {
      await axios.post("/api/changeStateEndpoint", endpoint);
      setFeedbackMessage({ text: "Estado alterado com sucesso!", type: "success" });
      await toListEndpoints();
    } catch (error) {
      console.error("Erro ao alterar estado do endpoint:", error);
      setFeedbackMessage({ text: "Erro ao alterar estado do endpoint", type: "error" });
    } finally {
      setIsTogglingEndpoint(false);
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  }, [toListEndpoints]);

  const closeServer = useCallback(async () => {
    await axios.post("/api/shutdown");
  }, []);

  useEffect(() => {}, []);

  useEffect(() => {
    toListEndpoints().catch(console.error);
  }, [serverStatus, toListEndpoints]);

  return (
    <>
      {/* Feedback Message */}
      {feedbackMessage && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            padding: "15px 20px",
            borderRadius: "8px",
            backgroundColor:
              feedbackMessage.type === "success"
                ? "#4caf50"
                : feedbackMessage.type === "error"
                ? "#f44336"
                : "#2196f3",
            color: "white",
            fontWeight: "bold",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            zIndex: 1000,
            animation: "slideIn 0.3s ease-out",
          }}
        >
          {feedbackMessage.text}
        </div>
      )}

      {/* Loading Overlay */}
      {(isLoadingEndpoints || isTogglingEndpoint) && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 999,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "30px",
              borderRadius: "10px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "15px",
            }}
          >
            <div
              style={{
                width: "50px",
                height: "50px",
                border: "5px solid #f3f3f3",
                borderTop: "5px solid #3498db",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <span style={{ fontSize: "16px", color: "#333" }}>
              {isTogglingEndpoint ? "Alterando estado..." : "Carregando..."}
            </span>
          </div>
        </div>
      )}

      {/* <div
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
      </div> */}

      <ListEndpoints
        endpoints={endpoints}
        onToggleEndpoint={toggleStateEndpoint}
        isLoading={isLoadingEndpoints || isTogglingEndpoint}
      />
    </>
  );
}
