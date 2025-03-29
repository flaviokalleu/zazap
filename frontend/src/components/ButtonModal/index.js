import React, { useRef, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import { Grid } from "@material-ui/core";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  formControl: {
    marginBottom: theme.spacing(2),
    minWidth: 300,
  },
  inputFile: {
    display: 'none',  
  },
  buttonFile: {
    marginBottom: theme.spacing(2),
  },
  dialogTitleWrapper: {
    position: 'relative',
  },
  primaryBar: {
    position: 'absolute',
    top: 0,                
    left: 0,
    right: 0,
    height: '100%',          
    backgroundColor: theme.palette.primary.main,  
    zIndex: 1,              
  },
  dialogTitle: {
    position: 'relative',    
    zIndex: 2,               
    color: 'white',          
  },
}));

const ButtonModal = ({ modalOpen, onClose, ticketId }) => {
  const classes = useStyles();
  const isMounted = useRef(true);
  const [loading, setLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState("");
  const [inputList, setInputList] = useState([{ option: "" }]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [copyText, setCopyText] = useState("");
  const [sendCALL, setSendCall] = useState("");
  const [sendURL, setSendURL] = useState("");
  const [imageBase64, setImageBase64] = useState('');
  const [sendKey, setsendKey] = useState('');
  const [sendkey_type, setsendkey_type] = useState('');
  const [sendvalue, setsendvalue] = useState('');
  const [sendmerchant_name, setsendmerchant_name] = useState('');


  const handleSelectChange = (event) => {
    setSelectedOption(event.target.value);
  };

  const handleAddOption = () => {
    setInputList([...inputList, { option: "" }]);
  };

  const handleRemoveOption = (index) => {
    setInputList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleInputChange = (index, event) => {
    const updatedInputs = [...inputList];
    updatedInputs[index].option = event.target.value;
    setInputList(updatedInputs);
  };

  const handleUploadListMessage = async (title, description, inputList, ticketId) => {
    setLoading(true);

    if (!ticketId || isNaN(ticketId)) {
      console.error('ID do Ticket inválido:', ticketId);
      toastError('ID do Ticket inválido.');
      setLoading(false);
      return;
    }

    try {
      const sections = [
        {
          title: title || 'Opções',
          rows: inputList.map((input, index) => ({
            title: input.option,
            rowId: (index + 1).toString(),
          })),
        },
      ];

      const listMessage = {
        title: `${title}\n`,
        text: `${description}\n`,
        buttonText: 'Clique aqui',
        sections: sections,
      };
      if (isMounted.current) {
        await api.post(`/messages/lista/${ticketId}`, listMessage);
      }
    } catch (err) {
      toastError(err);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const handleUploadCopy = async (title, description, buttonText, copyText, imageBase64, ticketId) => {
    setLoading(true);

    if (!ticketId || isNaN(ticketId)) {
      console.error('ID do Ticket inválido:', ticketId);
      toastError('ID do Ticket inválido.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        image: imageBase64 ? imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '') : '', // Remove o prefixo
        title: title,
        description: description,
        buttonText: buttonText,
        copyText: copyText,
      };

      console.log('PAYLOAD:', payload);
      if (isMounted.current) {
        await api.post(`/messages/copy/${ticketId}`, payload); // Envia a mensagem para a API
      }
    } catch (err) {
      toastError(err);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const handleUploadCALL = async (title, description, buttonText, sendCALL, imageBase64, ticketId) => {
    setLoading(true);

    if (!ticketId || isNaN(ticketId)) {
      console.error('ID do Ticket inválido:', ticketId);
      toastError('ID do Ticket inválido.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        image: imageBase64 ? imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '') : '', // Remove o prefixo
        title: title, // Título da mensagem
        description: description, // Descrição da mensagem
        buttonText: buttonText, // Texto do botão
        copyText: sendCALL,
      };

      if (isMounted.current) {
        await api.post(`/messages/call/${ticketId}`, payload); // Envia a mensagem para a API
      }
    } catch (err) {
      toastError(err);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const handleUploadURL = async (title, description, buttonText, sendURL, imageBase64, ticketId) => {
    setLoading(true);

    if (!ticketId || isNaN(ticketId)) {
      console.error('ID do Ticket inválido:', ticketId);
      toastError('ID do Ticket inválido.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        image: imageBase64 ? imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '') : '', // Remove o prefixo
        title: title || 'Botão copiar', // Título da mensagem
        description: description || 'Muito legal esses botões', // Descrição da mensagem
        buttonText: buttonText || 'Botão copiar', // Texto do botão
        copyText: sendURL || 'Texto padrão para copiar', // Texto para copiar
      };

      if (isMounted.current) {
        await api.post(`/messages/URL/${ticketId}`, payload); // Envia a mensagem para a API
      }
    } catch (err) {
      toastError(err);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const handleUploadPIX = async (title, sendvalue, sendkey_type, sendmerchant_name, sendKey, ticketId) => {
  setLoading(true);

  try {
    // Verifica se o tipo de chave é PHONE e adiciona +55 ao sendKey
    if (sendkey_type === 'PHONE' && !sendKey.startsWith('+55')) {
      sendKey = '+55' + sendKey;
    }

    const payload = {
      title: title,
      sendvalue: sendvalue,
      sendkey_type: sendkey_type, 
      sendmerchant_name: sendmerchant_name,
      sendKey: sendKey,
    };

    if (isMounted.current) {
      await api.post(`/messages/PIX/${ticketId}`, payload); 
    }
  } catch (err) {
    toastError(err);
  } finally {
    if (isMounted.current) {
      setLoading(false);
    }
  }
};



  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result);
        //  console.log('Image Base64:', reader.result); // Log the Base64 string
      };
      reader.readAsDataURL(file);
    }
  };


  const createMessage = async () => {
    console.log('createMessage chamada');

    try {
      if (selectedOption === "Lista") {
        await handleUploadListMessage(title, description, inputList, ticketId);
      } else if (selectedOption === "Copia") {
        await handleUploadCopy(title, description, buttonText, copyText, imageBase64, ticketId);
      } else if (selectedOption === "Me Ligue") {
        await handleUploadCALL(title, description, buttonText, sendCALL, imageBase64, ticketId);
      } else if (selectedOption === "URL") {
        await handleUploadURL(title, description, buttonText, sendURL, imageBase64, ticketId);
      } else if (selectedOption === "PIX") {
        await handleUploadPIX(title, sendvalue, sendkey_type, sendmerchant_name, sendKey, ticketId);
      } else {
        let listMessage = null;
        switch (selectedOption) {
          default:
            console.error('Opção não selecionada ou mensagem não gerada.');
            return;
        }
      }

      // Fecha o modal após processar a mensagem
      onClose();

    } catch (error) {
      toastError('Erro ao processar a mensagem');
    }
  };



  const renderContent = () => {
    switch (selectedOption) {

      case "Lista":
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Título"
                variant="outlined"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descrição"
                variant="outlined"
                multiline
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              {inputList.map((input, index) => (
                <Grid container key={index} spacing={1} alignItems="center">
                  <Grid item xs={10}>
                    <TextField
                      fullWidth
                      label={`Opção ${index + 1}`}
                      value={input.option}
                      onChange={(e) => handleInputChange(index, e)}
                      variant="outlined"
                      style={{ marginBottom: "8px" }}
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={() => handleRemoveOption(index)}
                    >
                      X
                    </Button>
                  </Grid>
                </Grid>
              ))}
              <Button onClick={handleAddOption} color="primary">
                Adicionar nova opção
              </Button>
            </Grid>
          </Grid>
        );
      case "URL":
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <input
                accept="image/*"
                className={classes.inputFile} // Certifique-se de que esta classe está definida
                id="input-file" // Um ID único
                type="file"
                onChange={handleImageChange}
              />
              <label htmlFor="input-file">
                <Button
                  variant="contained"
                  color="primary"
                  component="span"
                  className={classes.buttonFile} // Certifique-se de que esta classe está definida
                >
                  Imagem
                </Button>
              </label>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Título"
                variant="outlined"
                value={title}
                onChange={(e) => setTitle(e.target.value)}  // Campo para o título
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Mensagem"
                variant="outlined"
                multiline
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}  // Campo para a mensagem
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Texto do botão"
                variant="outlined"
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="URL"
                variant="outlined"
                value={sendURL}
                onChange={(e) => setSendURL(e.target.value)}
              />
            </Grid>
          </Grid>
        );
      case "Copia":
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <input
                accept="image/*"
                className={classes.inputFile} // Certifique-se de que esta classe está definida
                id="input-file" // Um ID único
                type="file"
                onChange={handleImageChange}
              />
              <label htmlFor="input-file"> {/* O label deve referenciar o ID correto */}
                <Button
                  variant="contained"
                  color="primary"
                  component="span"
                  className={classes.buttonFile} // Certifique-se de que esta classe está definida
                >
                  Imagem
                </Button>
              </label>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Título"
                variant="outlined"
                value={title}
                onChange={(e) => setTitle(e.target.value)}  // Campo para o título
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Mensagem"
                variant="outlined"
                multiline
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}  // Campo para a mensagem
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Texto do botão"
                variant="outlined"
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}  // Campo para o texto do botão
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Texto para copiar"
                variant="outlined"
                multiline
                rows={4}
                value={copyText}
                onChange={(e) => setCopyText(e.target.value)}  // Campo para o texto de copiar
              />
            </Grid>
          </Grid>
        );
      case "Me Ligue":
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <input
                accept="image/*"
                className={classes.inputFile}
                id="input-file"
                type="file"
                onChange={handleImageChange}
              />
              <label htmlFor="input-file">
                <Button
                  variant="contained"
                  color="primary"
                  component="span"
                  className={classes.buttonFile}
                >
                  Imagem
                </Button>
              </label>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Título"
                variant="outlined"
                value={title}
                onChange={(e) => setTitle(e.target.value)} // Campo para o título
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Mensagem"
                variant="outlined"
                multiline
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)} // Campo para a mensagem
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Texto do botão"
                variant="outlined"
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)} // Campo para o texto do botão
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Telefone"
                variant="outlined"
                defaultValue="5511999999999"
                value={sendCALL}
                onChange={(e) => setSendCall(e.target.value)} // Campo para o telefone
              />
            </Grid>
          </Grid>
        );
      case "PIX":
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Título"
                variant="outlined"
                value={title}
                onChange={(e) => setTitle(e.target.value)} // Campo para o título
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Valor"
                variant="outlined"
                value={sendvalue}
                onChange={(e) => setsendvalue(e.target.value)} // Ajuste para o valor
              />
            </Grid>
            <Grid item xs={12}>
              <Select
                fullWidth
                className={classes.formControl}
                value={sendkey_type}
                onChange={(e) => setsendkey_type(e.target.value)} // Atualizando o estado sendkey_type
                displayEmpty
              >
                <MenuItem value="" disabled>
                  Tipo de Chave
                </MenuItem>
                <MenuItem value="CNPJ">CNPJ</MenuItem>
                <MenuItem value="CPF">CPF</MenuItem>
                <MenuItem value="PHONE">Telefone</MenuItem>
                <MenuItem value="EMAIL">E-mail</MenuItem>
                <MenuItem value="EVP">Chave Aleatória</MenuItem>
              </Select>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome"
                variant="outlined"
                value={sendmerchant_name}
                onChange={(e) => setsendmerchant_name(e.target.value)} // Campo para o nome
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Chave PIX"
                variant="outlined"
                value={sendKey}
                onChange={(e) => setsendKey(e.target.value)} // Campo para a chave PIX
              />
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={modalOpen} onClose={onClose} maxWidth="sm" fullWidth>

      {/* Wrapper que contém tanto o título quanto a barra */}
      <div className={classes.dialogTitleWrapper}>
        {/* Barra colorida atrás do título */}
        <div className={classes.primaryBar}></div>

        {/* Título com posição relativa */}
        <DialogTitle className={classes.dialogTitle}>
          Selecione uma opção
        </DialogTitle>
      </div>

      <DialogContent>
        <Select
          fullWidth
          className={classes.formControl}
          value={selectedOption}
          onChange={handleSelectChange}
          displayEmpty
        >
          <MenuItem value="" disabled>
            Selecione
          </MenuItem>
          <MenuItem value="Lista">Lista</MenuItem>
          <MenuItem value="URL">URL</MenuItem>
          <MenuItem value="Copia">Copiar</MenuItem>
          <MenuItem value="Me Ligue">Me Ligue</MenuItem>
          <MenuItem value="PIX">PIX</MenuItem>
        </Select>

        {/* Renderiza o conteúdo com base na opção selecionada */}
        {renderContent()}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Cancelar
        </Button>
        <Button color="primary" onClick={() => createMessage()}>
          Confirmar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ButtonModal;
