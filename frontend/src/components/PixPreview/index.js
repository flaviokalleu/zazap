import React, { useRef, useEffect, useState } from 'react';
import {
    Typography,
    Divider,
    Button,
    Snackbar,
    Box,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy } from '@fortawesome/free-solid-svg-icons';
import copy from 'clipboard-copy';
import { getBackendUrl } from "../../config";

const PixPreview = ({ companyId, avatarUser, avatarName, avatarUrl, name, numeroCobranca, produto, total, imagem }) => {
    const [openToast, setOpenToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [openModal, setOpenModal] = useState(false);

    const backendUrl = getBackendUrl(); // Usando a função para obter o URL do backend

    // Montar a URL do avatarUser
    const profileImage = avatarUser;
    const avatarUserUrl = `${backendUrl}/public/company${companyId}/user/${profileImage}`;
    
    console.log("Avatar:", avatarUserUrl);
    console.log("Avatar User URL:", avatarUserUrl);
    

    const handleCloseToast = () => setOpenToast(false);
    const handleOpenModal = () => setOpenModal(true);
    const handleCloseModal = () => setOpenModal(false);

    const formatCurrency = (value) => {
        const formattedValue = (value / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        return `R$ ${formattedValue}`;
    };

    return (
        <Box
            style={{
                width: '300px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                overflow: 'hidden',
            }}
        >

            {/* Informações do PIX */}
            <div style={{ padding: '2px' }}>
                <Typography
                    variant="subtitle1"
                    style={{ fontWeight: 'bold', fontSize: '10px' }}
                >
                    Número da Cobrança: {numeroCobranca}
                </Typography>

                <Divider style={{ margin: '10px 0' }} />

                <Typography variant="h6" gutterBottom>
                    {produto}
                </Typography>
                <Divider style={{ margin: '10px 0' }} />

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        margin: '10px 0',
                    }}
                >
                    <Typography variant="body2" style={{ fontSize: '12px' }}>
                        PIX:
                    </Typography>
                    <img
                        src="https://www.imagensempng.com.br/wp-content/uploads/2023/06/Logo-Pix-Png-1024x1024.png"
                        alt="PIX Logo"
                        style={{ width: '30px', height: '30px' }}
                    />
                </div>
                <Divider style={{ margin: '10px 0' }} />

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        margin: '10px 0',
                    }}
                >
                    <Typography
                        variant="body2"
                        style={{ fontWeight: 'bold', fontSize: '12px' }}
                    >
                        Total:
                    </Typography>

                    <Typography
                        variant="body2"
                        style={{ fontWeight: 'bold', fontSize: '12px' }}
                    >
                        {formatCurrency(total)}
                    </Typography>
                </div>

                {/* Botão de mostrar detalhes */}
                <Button
                    variant="outlined"
                    fullWidth
                    onClick={handleOpenModal}
                >
                    Mostrar detalhes
                </Button>
            </div>

            {/* Snackbar para feedback */}
            <Snackbar
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                open={openToast}
                autoHideDuration={2000}
                onClose={handleCloseToast}
                message={toastMessage}
            />

            {/* Modal com detalhes */}
            <Dialog open={openModal} onClose={handleCloseModal}>
                <DialogTitle style={{ textAlign: 'center' }}>
                    Detalhes da Cobrança
                </DialogTitle>
                <DialogContent>
                    <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column', textAlign: 'center', padding: '10px' }}>
                        {avatarUrl && (
                            <img
                            src={avatarUrl ? avatarUrl : avatarUserUrl}
                                alt="Avatar"
                                style={{ width: '60px', height: '60px', borderRadius: '25px', marginBottom: '10px' }}
                            />
                        )}
                        <Typography variant="body1" style={{ fontWeight: 'bold', fontSize: '17px' }}>
                            {name}{avatarName}
                        </Typography>

                        <Typography variant="body1" style={{ fontSize: '15px' }}>
                            Número da Cobrança: {numeroCobranca}
                        </Typography>
                        <div
                            style={{
                                backgroundColor: '#888',
                                borderRadius: '8px',
                                padding: '5px 10px',
                                display: 'inline-block'
                            }}
                        >
                            <Typography variant="body2" style={{ fontSize: '10px', color: '#fff' }}>
                                Pagamento Solicitado
                            </Typography>
                        </div>
                        <Divider style={{ margin: '10px 0', borderStyle: 'dashed' }} />
                        <Typography variant="body1" style={{ fontSize: '15px' }}>
                            Produto: {produto}
                        </Typography>
                        <Divider style={{ margin: '10px 0', borderStyle: 'dashed' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '15px' }}>
                            <Typography variant="body1" style={{ marginRight: '10px' }}>
                                Total:
                            </Typography>
                            <Typography variant="body1" style={{ textAlign: 'right' }}>
                                {formatCurrency(total)}
                            </Typography>
                        </div>
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseModal} color="primary">
                        Fechar
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PixPreview;
