import { ServerStatus } from "../../types/ServerStatus";

type StatusServer = "Ativado" | "Desativado" | null;

const ativado: StatusServer = "Ativado";
const desativado: StatusServer = "Desativado";
const carregando = "Carregando...";
const erro = "Erro ao carregar o status do servidor!";

type DynamicSeverStateProps = {
  serverStatus: ServerStatus | null;
  onChangeStateServer: () => void;
};

export const DynamicSeverActiveDesactive = ({
  serverStatus,
  onChangeStateServer,
}: DynamicSeverStateProps) => {
  return (
    <>
      <h1>
        Status do servidor:{" "}
        {serverStatus === null
          ? carregando
          : serverStatus.activatedServer
          ? "Ativo"
          : "Inativo"}
      </h1>

      <button onClick={onChangeStateServer} disabled={serverStatus === null}>
        {!serverStatus === null
          ? carregando
          : serverStatus?.activatedServer
          ? "Desativar Servidor"
          : "Ativar Servidor"}
      </button>
    </>
  );
};

// const [serverStatus, setServerStatus] = useState<boolean>(false);
// const [loading, setLoading] = useState(false);
// const [errorLoading, setErrorLoading] = useState(false);

// const getStatusServer = useCallback(async () => {
//   setLoading(true);
//   setErrorLoading(false);

//   try {
//     const response = await axios.get<ServerStatus>("/api/server/status");
//     if (response.status === 200) {
//       setServerStatus(response.data.activatedServer);
//     } else {
//       setServerStatus(false);
//       setErrorLoading(true);
//     }
//   } catch (error) {
//     setServerStatus(false);
//     setErrorLoading(true);
//   } finally {
//     setLoading(false);
//   }
// }, []);

// useEffect(() => {
//   getStatusServer();
//   getListarEndpoints();
// }, [getStatusServer, getListarEndpoints]);
