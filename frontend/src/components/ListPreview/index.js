import React, { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
  Typography,
  InputBase,
  IconButton,
  Paper,
} from "@material-ui/core";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faList } from '@fortawesome/free-solid-svg-icons';
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import api from "../../services/api";

const CustomRadioLabel = ({ title, description }) => (
  <div>
    <Typography variant="body1" style={{ fontWeight: 'bold' }}>
      {title}
    </Typography>
    <Typography variant="body2" style={{ fontSize: '0.8rem' }}>
      {description}
    </Typography>
  </div>
);

const ListPreview = ({ titulo, descricao, textoBotao, secoes, rodape, ticketId }) => {
  const [modalAberto, setModalAberto] = useState(false);
  const [valorSelecionado, setValorSelecionado] = useState('');
  const [tituloSelecionado, setTituloSelecionado] = useState('');
  const [loading, setLoading] = useState(false);

  const abrirModal = () => setModalAberto(true);
  const fecharModal = () => setModalAberto(false);

  const selecionarOpcao = (event) => {
    const selectedLine = secoes[0].linhas.find(linha => linha.idLinha === event.target.value);
    setValorSelecionado(event.target.value);
    setTituloSelecionado(selectedLine.titulo); // Preencher o campo com o título
  };

  const enviarSelecao = async () => { 
    setLoading(true); // Indica que a operação está em andamento
  
    // Verifica se o título selecionado não está vazio
    if (tituloSelecionado.trim() === "") {
      alert("Por favor, selecione um título.");
      setLoading(false); // Desativa o carregamento
      return; // Não continua se não houver título
    }
  
    if (!ticketId) {
      console.error("ticketId não está definido");
      alert("Erro: ticketId não encontrado.");
      setLoading(false);
      return;
    }
  
    const message = {
      read: 1,
      fromMe: true,
      mediaUrl: "", // Se você tiver uma URL de mídia, adicione aqui
      body: `${tituloSelecionado.trim()}`, // Usa o título selecionado
    };
  
    try {
      await api.post(`/messages/${ticketId}`, message); // Envia a mensagem pela API
    } catch (err) {
      console.error("Erro ao enviar a mensagem:", err);
      alert("Erro ao enviar a mensagem. Tente novamente.");
    }
  
    setValorSelecionado('');
    setTituloSelecionado(""); // Limpa o campo de título selecionado após enviar
    setLoading(false); // Desativa o carregamento
    fecharModal();
  };


  return (
    <>
      {/* Estrutura da primeira imagem */}
      <div style={{ border: '1px solid #e0e0e0', padding: '10px', borderRadius: '5px', width: '300px' }}>
        <h3 style={{ marginBottom: '10px' }}>{titulo}</h3>
        <p style={{ marginBottom: '10px' }}>{descricao}</p>
        <a href={rodape}>{rodape}</a>
      </div>

      <div style={{ textAlign: 'center' }}>
        <Divider style={{ margin: '5px 0', height: '2px', backgroundColor: '#e0e0e0' }} />
        <div
          onClick={abrirModal} // Ao clicar no Divider, o modal é aberto
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center', // Centraliza o conteúdo horizontalmente
            cursor: 'pointer',
            padding: '3px',
            backgroundColor: '#fff', // cor do botão
            color: 'black',
            borderRadius: '4px',
            margin: '3px 0', // Espaço acima e abaixo do botão
          }}
        >
          <FontAwesomeIcon icon={faList} style={{ marginRight: '8px', fontSize: '0.8rem' }} />
          {textoBotao}
        </div>
      </div>

      {/* Modal para a lista (usando Dialog) */}
      <Dialog open={modalAberto} onClose={fecharModal}>
        <DialogTitle style={{ backgroundColor: '#4caf50', color: 'white' }}>
          Lista de Botões
        </DialogTitle>
        <DialogContent style={{ padding: "20px" }}>
          <h4>{secoes[0].titulo}</h4>
          <Divider style={{ margin: '10px 0' }} /> {/* Divider após o título */}
          <RadioGroup value={valorSelecionado} onChange={selecionarOpcao}>
            {secoes[0].linhas.map((linha) => (
              <div key={linha.idLinha}>
                <FormControlLabel
                  value={linha.idLinha}
                  control={<Radio />}
                  label={<CustomRadioLabel title={linha.titulo} description={linha.descricao} />}
                />
                <Divider style={{ margin: '5px 0' }} /> {/* Divider entre as opções */}
              </div>
            ))}
          </RadioGroup>
          <Paper
            component="form"
            style={{
              p: "2px 4px",
              display: "flex",
              alignItems: "center",
              borderRadius: "4px",
              marginTop: "20px",
              backgroundColor: "#f0f2f5"
            }}
          >
            <InputBase
              style={{ padding: "10px", flex: 1 }}
              value={tituloSelecionado}
              onChange={(e) => setTituloSelecionado(e.target.value)} 
              placeholder="Título Selecionado"
              inputProps={{ "aria-label": "título selecionado" }}
            />
            <IconButton color="primary" onClick={enviarSelecao}>
              <CheckCircleIcon style={{ width: "35px", height: "35px", color: '#00A884' }} />
            </IconButton>
          </Paper>
        </DialogContent>
      </Dialog>

    </>
  );
};

export default ListPreview;
