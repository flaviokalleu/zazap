import React, { useState } from 'react';
import {
  Box,
  Typography,
  Divider,
  Button,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faCopy } from '@fortawesome/free-solid-svg-icons';
import copy from 'clipboard-copy';

const EventPreview = ({ name, startTime, endTime, location, joinLink, linkType }) => {
  const [openModal, setOpenModal] = useState(false);
  const [openToast, setOpenToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => setOpenModal(false);
  const handleOpenToast = (message) => {
    setToastMessage(message);
    setOpenToast(true);
  };
  const handleCloseToast = () => setOpenToast(false);

  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp * 1000);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Mês começa em 0
    const year = date.getFullYear();
    const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${day}/${month}/${year}, ${time}`;
  };

  const formatDateTime1 = (timestamp) => {
    const date = new Date(timestamp * 1000);
    const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${time}`;
  };

  const copyJoinLink = () => {
    copy(joinLink);
    handleOpenToast('Link copiado!');
  };

  return (
    <Box
      style={{
        width: '300px',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: '#f0f0f0',
        padding: '10px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            backgroundColor: 'white',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '10px',
          }}
        >
          <FontAwesomeIcon icon={faCalendarAlt} size="lg" style={{ color: '#4CAF50' }} />
        </div>
        <Typography variant="h6" style={{ fontWeight: 'bold' }}>
          {name}
        </Typography>
      </div>

      <Typography variant="body2" color="textSecondary">
        {formatDateTime(startTime)} - {formatDateTime1(endTime)}
      </Typography>

      <Typography variant="body2" style={{ marginTop: '2px', fontWeight: 'bold' }}>
        Endereço: {location}
      </Typography>

      <Divider style={{ margin: '10px 0' }} />

      <Typography
        variant="body2"
        color="primary"
        onClick={copyJoinLink}
        style={{ cursor: 'pointer' }}
      >
        <FontAwesomeIcon icon={faCopy} style={{ marginRight: '5px' }} />
        {linkType === 'voice' ? 'Ligação de voz do WhatsApp' : 'Ligação de vídeo do WhatsApp'}
      </Typography>

      <Button variant="outlined" fullWidth onClick={handleOpenModal} style={{ marginTop: '10px' }}>
        Mostrar detalhes
      </Button>

      <Snackbar
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        open={openToast}
        autoHideDuration={2000}
        onClose={handleCloseToast}
        message={toastMessage}
      />

      <Dialog open={openModal} onClose={handleCloseModal}>
        <DialogTitle style={{ textAlign: 'center' }}>Detalhes da Reunião</DialogTitle>
        <DialogContent>
          <Typography variant="h6">{name}</Typography>
          <Typography variant="body2" color="textSecondary">
            {formatDateTime(startTime)} - {formatDateTime(endTime)}
          </Typography>
          <Typography variant="body2" style={{ marginTop: '10px', fontWeight: 'bold' }}>
            Endereço: {location}
          </Typography>
          <Typography
        variant="body2"
        color="primary"
        onClick={copyJoinLink}
        style={{ cursor: 'pointer' }}
      >
        <FontAwesomeIcon icon={faCopy} style={{ marginRight: '5px' }} />
        {linkType === 'voice' ? 'Ligação de voz do WhatsApp' : 'Ligação de vídeo do WhatsApp'}
      </Typography>
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

export default EventPreview;
