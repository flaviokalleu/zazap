import React, { useState, useContext } from "react";
import MenuItem from "@material-ui/core/MenuItem";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import ConfirmationModal from "../ConfirmationModal";
import { Menu, Popover, IconButton, Grid, makeStyles } from "@material-ui/core";
import { ReplyMessageContext } from "../../context/ReplyingMessage/ReplyingMessageContext";
import InformationModal from "../InformationModal";
import { ForwardMessageContext } from "../../context/ForwarMessage/ForwardMessageContext";
import { EditMessageContext } from "../../context/EditingMessage/EditingMessageContext";
import { TicketsContext } from "../../context/Tickets/TicketsContext";
import toastError from "../../errors/toastError";
import { useHistory } from "react-router-dom";
import { AuthContext } from "../../context/Auth/AuthContext";
import ForwardModal from "../ForwardMessageModal";
import ShowTicketOpen from "../ShowTicketOpenModal";
import AcceptTicketWithoutQueue from "../AcceptTicketWithoutQueueModal";
import AddCircleOutlineIcon from '@material-ui/icons/Add';
import { toast } from "react-toastify";

const useStyles = makeStyles((theme) => ({
  iconButton: {
    padding: theme.spacing(0.5), // Usa espaçamento relativo
    fontSize: '1.5rem', // Tamanho inicial relativo
    [theme.breakpoints.down('xs')]: { // Ajuste para telas pequenas (< 600px)
      fontSize: '1.2rem',
      padding: theme.spacing(0.3),
    },
  },
  gridContainer: {
    padding: theme.spacing(1),
    justifyContent: 'center',
    flexWrap: 'wrap', // Garante que os itens quebrem linha
  },
  addCircleButton: {
    padding: theme.spacing(1),
    fontSize: '2rem',
    backgroundColor: 'rgb(242 242 247)',
    [theme.breakpoints.down('xs')]: {
      fontSize: '1.5rem',
      padding: theme.spacing(0.5),
    },
  },
  popoverContent: {
    maxHeight: '50vh', // Altura relativa à tela
    overflowY: 'auto',
    width: '90vw', // Largura relativa à tela
    maxWidth: '400px',
    '&::-webkit-scrollbar': {
      width: '0.4em',
      height: '0.4em',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: 'rgba(0,0,0,.1)',
      borderRadius: '50px',
    },
    '&::-webkit-scrollbar-track': {
      boxShadow: 'inset 0 0 6px rgba(0,0,0,0.00)',
      webkitBoxShadow: 'inset 0 0 6px rgba(0,0,0,0.00)',
    },
  },
  hideScrollbar: {
    maxHeight: '30vh', // Altura reduzida para o popover inicial
    overflow: 'hidden',
    width: '90vw', // Largura relativa
    maxWidth: '380px',
  },
}));

const MessageOptionsMenu = ({
  message,
  menuOpen,
  handleClose,
  anchorEl,
  isGroup,
  queueId,
  whatsappId
}) => {
  const classes = useStyles();
  const { setReplyingMessage } = useContext(ReplyMessageContext);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const { user } = useContext(AuthContext);
  const editingContext = useContext(EditMessageContext);
  const setEditingMessage = editingContext ? editingContext.setEditingMessage : null;
  const { setTabOpen } = useContext(TicketsContext);
  const history = useHistory();

  const [openAlert, setOpenAlert] = useState(false);
  const [userTicketOpen, setUserTicketOpen] = useState("");
  const [queueTicketOpen, setQueueTicketOpen] = useState("");
  const [acceptTicketWithouSelectQueueOpen, setAcceptTicketWithouSelectQueueOpen] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(null);
  const [showTranscribedText, setShowTranscribedText] = useState(false);
  const [audioMessageTranscribeToText, setAudioMessageTranscribeToText] = useState("");
  const [reactionAnchorEl, setReactionAnchorEl] = useState(null);
  const [moreAnchorEl, setMoreAnchorEl] = useState(null);

  const { showSelectMessageCheckbox,
    setShowSelectMessageCheckbox,
    selectedMessages,
    forwardMessageModalOpen,
    setForwardMessageModalOpen } = useContext(ForwardMessageContext);

  const availableReactions = [
    '😀', '😂', '❤️', '👍', '🎉', '😢', '😮', '😡', '👏', '🔥',
    '🥳', '😎', '🤩', '😜', '🤔', '🙄', '😴', '😇', '🤯', '💩',
    '🤗', '🤫', '🤭', '🤓', '🤪', '🤥', '🤡', '🤠', '🤢', '🤧',
    '😷', '🤕', '🤒', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃',
    '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '🙈',
    '🙉', '🙊', '🐵', '🐒', '🦍', '🐶', '🐕', '🐩', '🐺', '🦊',
    '🦝', '🐱', '🐈', '🦁', '🐯', '🐅', '🐆', '🐴', '🐎', '🦄'
  ];

  const handleSaveTicket = async (contactId) => {
    if (!contactId) return;
    try {
      const { data: ticket } = await api.post("/tickets", {
        contactId: contactId,
        userId: user?.id,
        status: "open",
        queueId: queueId,
        whatsappId: whatsappId
      });
      setTicketOpen(ticket);
      if (ticket.queueId === null) {
        setAcceptTicketWithouSelectQueueOpen(true);
      } else {
        setTabOpen("open");
        history.push(`/tickets/${ticket.uuid}`);
      }
    } catch (err) {
      const ticket = JSON.parse(err.response.data.error);
      if (ticket.userId !== user?.id) {
        setOpenAlert(true);
        setUserTicketOpen(ticket.user.name);
        setQueueTicketOpen(ticket.queue.name);
      } else {
        setOpenAlert(false);
        setUserTicketOpen("");
        setQueueTicketOpen("");
        setTabOpen(ticket.status);
        history.push(`/tickets/${ticket.uuid}`);
      }
    }
    handleClose();
  };

  const handleCloseAlert = () => {
    setOpenAlert(false);
    setUserTicketOpen("");
    setQueueTicketOpen("");
  };

  const handleSetShowSelectCheckbox = () => {
    setShowSelectMessageCheckbox(!showSelectMessageCheckbox);
    handleClose();
  };

  const handleDeleteMessage = async () => {
    try {
      await api.delete(`/messages/${message.id}`);
    } catch (err) {
      toastError(err);
    }
  };

  const handleEditMessage = async () => {
    setEditingMessage(message);
    handleClose();
  };

  const handleTranscriptionAudioToText = async () => {
    try {
      const audioUrl = String(message.mediaUrl);
      const match = audioUrl.match(/\/([^\/]+\.ogg)$/);
      const extractedPart = match ? match[1] : null;
      if (!extractedPart) {
        throw new Error('Formato de URL de áudio inesperado');
      }
      const response = await api.get(`/messages/transcribeAudio/${extractedPart}`);
      const { data } = response;
      if (data && typeof data.transcribedText === 'string') {
        setAudioMessageTranscribeToText(data.transcribedText);
        setShowTranscribedText(true);
        handleClose();
      } else if (data && data.error) {
        throw new Error(data.error);
      } else {
        throw new Error('Dados de transcrição inválidos');
      }
    } catch (err) {
      toastError(err.message || 'Erro desconhecido');
    }
  };

  const hanldeReplyMessage = () => {
    setReplyingMessage(message);
    handleClose();
  };

  const isWithinFifteenMinutes = () => {
    const fifteenMinutesInMilliseconds = 15 * 60 * 1000;
    const currentTime = new Date();
    const messageTime = new Date(message.createdAt);
    return currentTime - messageTime <= fifteenMinutesInMilliseconds;
  };

  const handleOpenConfirmationModal = (e) => {
    setConfirmationOpen(true);
    handleClose();
  };

  const openReactionsMenu = (event) => {
    setReactionAnchorEl(event.currentTarget);
    handleClose();
  };

  const closeReactionsMenu = () => {
    setReactionAnchorEl(null);
  };

  const openMoreReactionsMenu = (event) => {
    setMoreAnchorEl(event.currentTarget);
    closeReactionsMenu();
  };

  const closeMoreReactionsMenu = () => {
    setMoreAnchorEl(null);
  };

  const closeAllMenus = () => {
    handleClose();
    closeReactionsMenu();
    closeMoreReactionsMenu();
  };

  const handleReactToMessage = async (reactionType) => {
    try {
      await api.post(`/messages/${message.id}/reactions`, { type: reactionType });
      toast.success(i18n.t("Reação Enviada Com sucesso"));
    } catch (err) {
      toastError(err);
    }
    closeAllMenus();
  };

  return (
    <>
      <AcceptTicketWithoutQueue
        modalOpen={acceptTicketWithouSelectQueueOpen}
        onClose={(e) => setAcceptTicketWithouSelectQueueOpen(false)}
        ticket={ticketOpen}
        ticketId={ticketOpen?.id}
      />
      <ShowTicketOpen
        isOpen={openAlert}
        handleClose={handleCloseAlert}
        user={userTicketOpen}
        queue={queueTicketOpen}
      />
      <ConfirmationModal
        title={i18n.t("messageOptionsMenu.confirmationModal.title")}
        open={confirmationOpen}
        onClose={setConfirmationOpen}
        onConfirm={handleDeleteMessage}
      >
        {i18n.t("messageOptionsMenu.confirmationModal.message")}
      </ConfirmationModal>
      <InformationModal
        title={i18n.t("Transcrição de áudio")}
        open={showTranscribedText}
        onClose={setShowTranscribedText}
      >
        {audioMessageTranscribeToText}
      </InformationModal>
      <ForwardModal
        modalOpen={forwardMessageModalOpen}
        messages={selectedMessages}
        onClose={(e) => {
          setForwardMessageModalOpen(false);
          setShowSelectMessageCheckbox(false);
        }}
      />
      <Menu
        anchorEl={anchorEl}
        getContentAnchorEl={null}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        open={menuOpen}
        onClose={handleClose}
      >
        {message.fromMe && (
          <MenuItem key="delete" onClick={handleOpenConfirmationModal}>
            {i18n.t("messageOptionsMenu.delete")}
          </MenuItem>
        )}
        {message.fromMe && isWithinFifteenMinutes() && (
          <MenuItem key="edit" onClick={handleEditMessage}>
            {i18n.t("messageOptionsMenu.edit")}
          </MenuItem>
        )}
        {(message.mediaType === "audio" && !message.fromMe) && (
          <MenuItem onClick={handleTranscriptionAudioToText}>
            {i18n.t("Transcrever áudio")}
          </MenuItem>
        )}
        <MenuItem onClick={hanldeReplyMessage}>
          {i18n.t("messageOptionsMenu.reply")}
        </MenuItem>
        <MenuItem onClick={handleSetShowSelectCheckbox}>
          {i18n.t("messageOptionsMenu.forward")}
        </MenuItem>
        <MenuItem onClick={openReactionsMenu}>
          {i18n.t("Reagir")}
        </MenuItem>
        {!message.fromMe && isGroup && (
          <MenuItem onClick={() => handleSaveTicket(message?.contact?.id)}>
            {i18n.t("messageOptionsMenu.talkTo")}
          </MenuItem>
        )}
      </Menu>
      <Popover
        open={Boolean(reactionAnchorEl)}
        anchorEl={reactionAnchorEl}
        onClose={closeReactionsMenu}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          style: { width: 'auto', maxWidth: '90vw', borderRadius: '50px' } // Largura relativa
        }}
      >
        <div className={classes.hideScrollbar}>
          <Grid container spacing={1} className={classes.gridContainer}>
            {availableReactions.slice(0, 6).map(reaction => (
              <Grid item key={reaction}>
                <IconButton className={classes.iconButton} onClick={() => handleReactToMessage(reaction)}>
                  {reaction}
                </IconButton>
              </Grid>
            ))}
            <Grid item>
              <IconButton className={classes.addCircleButton} onClick={openMoreReactionsMenu}>
                <AddCircleOutlineIcon fontSize="inherit" />
              </IconButton>
            </Grid>
          </Grid>
        </div>
      </Popover>
      <Popover
        open={Boolean(moreAnchorEl)}
        anchorEl={moreAnchorEl}
        onClose={closeMoreReactionsMenu}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        PaperProps={{
          style: { width: 'auto', maxWidth: '90vw', borderRadius: '6px' } // Largura relativa
        }}
      >
        <div className={classes.popoverContent}>
          <Grid container spacing={1} className={classes.gridContainer}>
            {availableReactions.map(reaction => (
              <Grid item key={reaction}>
                <IconButton className={classes.iconButton} onClick={() => handleReactToMessage(reaction)}>
                  {reaction}
                </IconButton>
              </Grid>
            ))}
          </Grid>
        </div>
      </Popover>
    </>
  );
};

export default MessageOptionsMenu;