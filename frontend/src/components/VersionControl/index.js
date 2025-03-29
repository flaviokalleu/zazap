import React, { useState, useContext, useEffect } from "react";
import api from "../../services/api";
import Button from "@material-ui/core/Button";
import { useDate } from "../../hooks/useDate";
import { AuthContext } from "../../context/Auth/AuthContext";

const packageVersion = require("../../../package.json").version;

const VersionControl = () => {
  const { returnDays } = useDate();
  const { user, socket } = useContext(AuthContext);
  const [storedVersion] = useState(window.localStorage.getItem("version") || "0.0.0");

  const handleUpdateVersion = async () => {
    window.localStorage.setItem("version", packageVersion);

    // Mantive apenas para salvar no banco a versao atual
    const { data } = await api.post("/version", {
      version: packageVersion,
    });

    // Limpar o cache do navegador
    caches.keys().then(function (names) {
      for (let name of names) caches.delete(name);
    });

    // Atraso para garantir que o cache foi limpo
    setTimeout(() => {
      window.location.reload(true); // Recarregar a página
    }, 1000);
  };

  return (
   <div>
      <Button
       variant="contained"
         size="small"
          style={{
            backgroundColor: "red",
            color: "white",
            fontWeight: "bold",
            right: "15px",
          }}
          onClick={handleUpdateVersion}
        >
          {returnDays(user?.company?.dueDate) === 0 ? `Sua licença vence hoje! Clique aqui para atualizar.` : `Sua licença vence em ${returnDays(user?.company?.dueDate)} dias! Clique aqui para atualizar.`}
        </Button>
    {/*  {storedVersion !== packageVersion && (
        <Button
       variant="contained"
         size="small"
          style={{
            backgroundColor: "red",
            color: "white",
            fontWeight: "bold",
            right: "15px",
          }}
          onClick={handleUpdateVersion}
        >
          CLique aqui e atualize para nova versão.
        </Button>
     )} */}
    </div> 
  );
};

export default VersionControl;
