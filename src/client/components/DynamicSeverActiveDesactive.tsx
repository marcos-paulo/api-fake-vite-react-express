import { ServerStatus } from "../../types/ServerStatus";

const carregando = "Carregando...";
const ativo = "Ativo";
const inativo = "Inativo";
const desativarServidor = "Desativar Servidor";
const ativarServidor = "Ativar Servidor";

const color = {
  green: "rgba(0, 255, 0, 0.53)",
  red: "rgba(255, 0, 0, 0.53)",
};

type DynamicSeverStateProps = {
  serverStatus: ServerStatus | null;
  onChangeStateServer: () => void;
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "400px 1fr",
  // gridTemplateRows: "100px 100px",
  gridGap: "10px",
  padding: "20px",
  justifyItems: "center",
};

const item1: React.CSSProperties = {
  gridColumn: "1 / 2",
  gridRow: "1 / 2",
  // border: "1px solid black",
  width: "100%",
};

const item2: React.CSSProperties = {
  gridColumn: "2 / 3",
  gridRow: "1 / 2",
  // border: "1px solid black",
  width: "100%",
};

const item3: React.CSSProperties = {
  gridColumn: "1 / 2",
  gridRow: "2 / 3",
  // border: "1px solid black",
  width: "100%",
};

const item4: React.CSSProperties = {
  gridColumn: "2 / 3",
  gridRow: "2 / 3",
  // border: "1px solid black",
  width: "100%",
};

export const DynamicSeverActiveDesactive = ({
  serverStatus,
  onChangeStateServer,
}: DynamicSeverStateProps) => {
  const status = (sTrue: string, sFalse: string) =>
    !serverStatus ? carregando : serverStatus.activatedServer ? sTrue : sFalse;

  const titleStile: React.CSSProperties = {
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "2.5em",
    fontWeight: "bold",
    width: "100%",
    height: "100%",
    margin: "0",
  };

  const statusStyle: React.CSSProperties = {
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    fontWeight: "bold",
    fontSize: "2.5em",
    borderRadius: "5px",
    width: "100%",
    backgroundColor: status(color.green, color.red),
  };

  const buttonAtivarStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: status(color.red, color.green),
  };

  return (
    <>
      <div style={grid}>
        <div style={item1}>
          <span style={titleStile}>Status do servidor: </span>
        </div>
        <div style={item2}>
          <span style={statusStyle}>{status(ativo, inativo)}</span>
        </div>
        <div style={item3}></div>
        <div style={item4}>
          <button
            style={buttonAtivarStyle}
            onClick={onChangeStateServer}
            disabled={serverStatus === null}
          >
            {status(desativarServidor, ativarServidor)}
          </button>
        </div>
      </div>
    </>
  );
};
