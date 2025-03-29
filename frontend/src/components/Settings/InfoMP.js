import React, { useState } from "react";
import { useTheme } from "@material-ui/core/styles";
import IconButton from "@material-ui/core/IconButton";
import Modal from "@material-ui/core/Modal";
import Typography from "@material-ui/core/Typography";
import InfoIcon from "@material-ui/icons/Info";
import CancelIcon from "@material-ui/icons/Cancel";
import prod from "../../assets/prod.png"
import prodKey from "../../assets/prodKey.png"
import web from "../../assets/web.png"
import webhook from "../../assets/webhook.png"

const InfoMP = () => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };
  const getEndpoint = () => {
    return process.env.REACT_APP_BACKEND_URL + '/subscription/webhook/'
  }

  return (
    <div>
      <IconButton onClick={handleOpen}>
        <InfoIcon style={{ color: "black" }} />
      </IconButton>
      <Modal open={open} onClose={handleClose}>
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: theme.palette.background.paper,
            padding: "20px",
            borderRadius: "5px",
            outline: "none",
            maxWidth: "80%",
            maxHeight: "80%",
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            alignItems: "flex-start",
            color: theme.palette.text.primary,
          }}
        >
          <IconButton
            style={{ position: "absolute", top: "5px", right: "5px" }}
            onClick={handleClose}
          >
            <CancelIcon />
          </IconButton>
          <div style={{ marginBottom: "20px" }} />
          <Typography variant="body1">
            <span>
            <Typography variant="h5" gutterBottom>
        Integração com Mercado Pago 🚀
      </Typography>
      <Typography variant="body1" gutterBottom>
        Para começar a integrar seu sistema com o Mercado Pago, siga estes passos simples:
      </Typography>
      <ol>
        <li>
          <Typography variant="body1">Crie uma conta no Mercado Pago Developers</Typography>
        </li>
        <li>
          <Typography variant="body1">Crie uma aplicação no Mercado Pago Developers</Typography>
        </li>
        <li>
          <Typography variant="body1">
            Click em Producao{'>'}Credenciais de producao
            <br />
            <img src={prod} alt="prod" style={{ maxWidth: '900px', maxHeight: '600px' }} />
            <br />
          </Typography>
        </li>
        <li>
          <Typography variant="body1">Click em copiar e depois cole a chave em Api key
          <br />
            <img src={prodKey} alt="prodKey" style={{ maxWidth: '900px', maxHeight: '600px' }} />
            <br />
          </Typography>
        </li>
        <li>
          <Typography variant="body1">No mercado pago click em notificações{'>'}webhooks
          <br />
            <img src={web} alt="web" style={{ maxWidth: '900px', maxHeight: '600px' }} />
            <br />
          </Typography>
        </li>
        <li>
          <Typography variant="body1">Em modo producao cole a seguinte URL "{getEndpoint()}" e marque a opção pagamentos em Eventos
          <br />
            <img src={webhook} alt="webhook" style={{ maxWidth: '900px', maxHeight: '600px' }} />
            <br />
          </Typography>
        </li>
      </ol>
      
            </span>
          </Typography>
        </div>
      </Modal>
    </div>
  );
};

export default InfoMP;
