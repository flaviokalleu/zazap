import React, { useState } from 'react';
import { Snackbar, Paper, Typography, Divider } from "@material-ui/core";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faReply, faPhone, faExternalLink } from '@fortawesome/free-solid-svg-icons';
import { faCopy } from '@fortawesome/free-regular-svg-icons';
import api from "../../services/api";
import copy from 'clipboard-copy'; // Biblioteca para copiar para área de transferência

const ButtonPreview = ({ titulo, descricao, textoBotao, secoes = [], rodape, ticketId, imagem }) => {
    const [openToast, setOpenToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    const handleButtonClick = async (tipo, valor, conteudo) => {
        switch (tipo) {
            case 'quick_reply':
                const message = {
                    read: 1,
                    fromMe: true,
                    mediaUrl: "",
                    body: valor,
                };
                try {
                    await api.post(`/messages/${ticketId}`, message);
                    setOpenToast(true);
                } catch (err) {
                    console.error(err);
                }
                break;

            case 'cta_copy':
                if (conteudo) {
                    copy(conteudo);
                    setToastMessage("Código copiado!");
                } else {
                    setToastMessage("Nenhum conteúdo para copiar.");
                }
                setOpenToast(true);
                break;

            case 'cta_url':
                if (conteudo) {
                    window.open(conteudo, '_blank');
                } else {
                    setToastMessage("Nenhum link disponível.");
                    setOpenToast(true);
                }
                break;

            case 'cta_call':
                setToastMessage("Não é possível realizar chamadas pelo sistema, tente pelo celular.");
                setOpenToast(true);
                break;

            default:
                break;
        }
    };

    const handleCloseToast = () => {
        setOpenToast(false);
    };

    const getIcon = (tipo) => {
        switch (tipo) {
            case 'quick_reply':
                return <FontAwesomeIcon icon={faReply} />;
            case 'cta_copy':
                return <FontAwesomeIcon icon={faCopy} />;
            case 'cta_call':
                return <FontAwesomeIcon icon={faPhone} />;
            case 'cta_url':
                return <FontAwesomeIcon icon={faExternalLink} />;
            default:
                return null;
        }
    };

    

    return (
        <div style={{ width: '300px' }}> {/* Definindo a largura do contêiner */}
            {/* Renderizar a imagem base64 aqui */}
            {imagem && (
                <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                    <img
                        src={`data:image/jpeg;base64,${imagem}`}
                        alt="Preview"
                        style={{ width: '50%', height: 'auto', borderRadius: '5px' }} // A imagem ocupa 50% do contêiner
                    />
                </div>
            )}
    
            <div style={{ border: '1px solid #e0e0e0', padding: '10px', borderRadius: '5px' }}>
                <Typography variant="subtitle1" gutterBottom>{titulo}</Typography>
                <Typography variant="body1" gutterBottom>{descricao}</Typography>
                {rodape && (
                    <span style={{ fontSize: '12px', margin: '0px' }}>
                        {/(https?:\/\/|www\.)/.test(rodape) ? (
                            <a href={rodape} target="_blank" rel="noopener noreferrer">
                                {rodape}
                            </a>
                        ) : (
                            rodape
                        )}
                    </span>
                )}
            </div>
    
            <div style={{ textAlign: 'center' }}>
                <Divider style={{ margin: '5px 0', height: '2px', backgroundColor: '#e0e0e0' }} />
            </div>
    
            {secoes.length > 0 ? (
                secoes.map((secao, index) => (
                    <div key={index}>
                        {secao.linhas && secao.linhas.length > 0 ? (
                            secao.linhas.map((linha, idx) => {
                                return (
                                    <Paper 
                                        key={idx} 
                                        style={{ 
                                            marginBottom: '10px', 
                                            cursor: 'pointer', 
                                            width: '100%', // Fazendo os botões ocuparem toda a largura do contêiner
                                        }}
                                        onClick={() => handleButtonClick(linha.tipo, linha.texto, linha.conteudo)}
                                    >
                                        <Divider />
                                        <div style={{ padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexGrow: 1 }}>
                                                {getIcon(linha.tipo)}
                                                <span style={{ marginLeft: '8px', fontWeight: 'bold' }}>
                                                    {linha.texto}
                                                </span>
                                            </div>
                                        </div>
                                    </Paper>
                                );
                            })
                        ) : (
                            <Typography variant="body2">Sem botões nesta seção.</Typography>
                        )}
                    </div>
                ))
            ) : (
                <Typography variant="body2">Nenhuma seção disponível.</Typography>
            )}
    
            <Snackbar
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                open={openToast}
                autoHideDuration={2000}
                onClose={handleCloseToast}
                message={toastMessage}
            />
        </div>
    );
    
};

export default ButtonPreview;
