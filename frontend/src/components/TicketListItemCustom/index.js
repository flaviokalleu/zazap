import React, { useState, useEffect, useRef, useContext, useCallback } from "react";
import { useHistory, useParams } from "react-router-dom";
import { parseISO, format, isSameDay } from "date-fns";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import ButtonWithSpinner from "../ButtonWithSpinner";
import MarkdownWrapper from "../MarkdownWrapper";
import { AuthContext } from "../../context/Auth/AuthContext";
import { TicketsContext } from "../../context/Tickets/TicketsContext";
import toastError from "../../errors/toastError";
import { v4 as uuidv4 } from "uuid";
import AcceptTicketWithouSelectQueue from "../AcceptTicketWithoutQueueModal";
import TransferTicketModalCustom from "../TransferTicketModalCustom";
import ShowTicketOpen from "../ShowTicketOpenModal";
import { isNil } from "lodash";
import { toast } from "react-toastify";
import useCompanySettings from "../../hooks/useSettings/companySettings";
import { 
  Users, 
  Check, 
  X, 
  Repeat, 
  Eye, 
  MessageSquare, 
  ChevronDown 
} from "lucide-react";
import ConnectionIcon from "../ConnectionIcon";
import ContactTag from "../ContactTag";

const TicketListItemCustom = ({ setTabOpen, ticket }) => {
  const history = useHistory();
  const [loading, setLoading] = useState(false);
  const [acceptTicketWithouSelectQueueOpen, setAcceptTicketWithouSelectQueueOpen] = useState(false);
  const [transferTicketModalOpen, setTransferTicketModalOpen] = useState(false);
  const [openAlert, setOpenAlert] = useState(false);
  const [userTicketOpen, setUserTicketOpen] = useState("");
  const [queueTicketOpen, setQueueTicketOpen] = useState("");
  const [openTicketMessageDialog, setOpenTicketMessageDialog] = useState(false);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const { ticketId } = useParams();
  const isMounted = useRef(true);
  const { setCurrentTicket } = useContext(TicketsContext);
  const { user } = useContext(AuthContext);
  const { get: getSetting } = useCompanySettings();

  useEffect(() => {
    console.log("======== TicketListItemCustom ===========");
    console.log(ticket);
    console.log("=========================================");
  }, [ticket]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleOpenAcceptTicketWithouSelectQueue = useCallback(() => {
    setAcceptTicketWithouSelectQueueOpen(true);
  }, []);

  const handleCloseTicket = async (id) => {
    const setting = await getSetting({ column: "requiredTag" });

    if (setting.requiredTag === "enabled") {
      try {
        const contactTags = await api.get(`/contactTags/${ticket.contact.id}`);
        if (!contactTags.data.tags) {
          toast.warning(i18n.t("messagesList.header.buttons.requiredTag"));
        } else {
          await api.put(`/tickets/${id}`, {
            status: "closed",
            userId: user?.id || null,
          });
          if (isMounted.current) setLoading(false);
          history.push(`/tickets/`);
        }
      } catch (err) {
        setLoading(false);
        toastError(err);
      }
    } else {
      setLoading(true);
      try {
        await api.put(`/tickets/${id}`, {
          status: "closed",
          userId: user?.id || null,
        });
      } catch (err) {
        setLoading(false);
        toastError(err);
      }
      if (isMounted.current) setLoading(false);
      history.push(`/tickets/`);
    }
  };

  const handleCloseIgnoreTicket = async (id) => {
    setLoading(true);
    try {
      await api.put(`/tickets/${id}`, {
        status: "closed",
        userId: user?.id || null,
        sendFarewellMessage: false,
        amountUsedBotQueues: 0,
      });
    } catch (err) {
      setLoading(false);
      toastError(err);
    }
    if (isMounted.current) setLoading(false);
    history.push(`/tickets/`);
  };

  const truncate = (str, len) => {
    if (!isNil(str)) {
      if (str.length > len) return str.substring(0, len) + "...";
      return str;
    }
  };

  const handleCloseTransferTicketModal = useCallback(() => {
    if (isMounted.current) setTransferTicketModalOpen(false);
  }, []);

  const handleOpenTransferModal = () => {
    setLoading(true);
    setTransferTicketModalOpen(true);
    if (isMounted.current) setLoading(false);
    handleSelectTicket(ticket);
    history.push(`/tickets/${ticket.uuid}`);
  };

  const handleAcepptTicket = async (id) => {
    setLoading(true);
    try {
      const otherTicket = await api.put(`/tickets/${id}`, {
        status: ticket.isGroup && ticket.channel === "whatsapp" ? "group" : "open",
        userId: user?.id,
      });

      if (otherTicket.data.id !== ticket.id) {
        if (otherTicket.data.userId !== user?.id) {
          setOpenAlert(true);
          setUserTicketOpen(otherTicket.data.user.name);
          setQueueTicketOpen(otherTicket.data.queue.name);
        } else {
          setLoading(false);
          setTabOpen(ticket.isGroup ? "group" : "open");
          handleSelectTicket(otherTicket.data);
          history.push(`/tickets/${otherTicket.uuid}`);
        }
      } else {
        let setting;
        try {
          setting = await getSetting({ column: "sendGreetingAccepted" });
        } catch (err) {
          toastError(err);
        }

        if (setting.sendGreetingAccepted === "enabled" && (!ticket.isGroup || ticket.whatsapp?.groupAsTicket === "enabled")) {
          handleSendMessage(ticket.id);
        }
        if (isMounted.current) setLoading(false);
        setTabOpen(ticket.isGroup ? "group" : "open");
        handleSelectTicket(ticket);
        history.push(`/tickets/${ticket.uuid}`);
      }
    } catch (err) {
      setLoading(false);
      toastError(err);
    }
  };

  const handleSendMessage = async (id) => {
    let setting;
    try {
      setting = await getSetting({ column: "greetingAcceptedMessage" });
    } catch (err) {
      toastError(err);
    }

    const msg = `${setting.greetingAcceptedMessage}`;
    const message = {
      read: 1,
      fromMe: true,
      mediaUrl: "",
      body: `${msg.trim()}`,
    };
    try {
      await api.post(`/messages/${id}`, message);
    } catch (err) {
      toastError(err);
    }
  };

  const handleCloseAlert = useCallback(() => {
    setOpenAlert(false);
    setLoading(false);
  }, []);

  const handleSelectTicket = (ticket) => {
    const code = uuidv4();
    const { id, uuid } = ticket;
    setCurrentTicket({ id, uuid, code });
  };

  const fetchTicketMessages = async (ticketId) => {
    if (!ticketId) return;
    setLoadingMessages(true);
    try {
      const { data } = await api.get(`/messages/${ticketId}`);
      if (isMounted.current) setTicketMessages(data.messages);
    } catch (err) {
      toastError(err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleOpenMessageDialog = (e) => {
    e.stopPropagation();
    setOpenTicketMessageDialog(true);
    fetchTicketMessages(ticket.id);
  };

  // Determina a cor da borda com base no status do ticket
  const getBorderColor = () => {
    if (ticketId === ticket.uuid) return "border-blue-500";
    switch (ticket.status) {
      case "pending":
        return "border-gray-300";
      case "open":
        return "border-green-500";
      case "closed":
        return "border-red-500";
      default:
        return "border-transparent";
    }
  };

  return (
    <div key={ticket.id} className="relative">
      {openAlert && (
        <ShowTicketOpen
          isOpen={openAlert}
          handleClose={handleCloseAlert}
          user={userTicketOpen}
          queue={queueTicketOpen}
        />
      )}
      {acceptTicketWithouSelectQueueOpen && (
        <AcceptTicketWithouSelectQueue
          modalOpen={acceptTicketWithouSelectQueueOpen}
          onClose={() => setAcceptTicketWithouSelectQueueOpen(false)}
          ticketId={ticket.id}
          ticket={ticket}
        />
      )}
      {transferTicketModalOpen && (
        <TransferTicketModalCustom
          modalOpen={transferTicketModalOpen}
          onClose={handleCloseTransferTicketModal}
          ticketid={ticket.id}
          ticket={ticket}
        />
      )}

      {/* Dialog de Mensagens */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${
          openTicketMessageDialog ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
      >
        <div className="fixed inset-0 bg-black/60" onClick={() => setOpenTicketMessageDialog(false)}></div>
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg p-4 max-h-[80vh] overflow-hidden border border-gray-200">
          <div className="flex justify-between items-center bg-blue-600 text-white p-3 rounded-t-xl">
            <h3 className="text-lg font-semibold">Espiando a conversa</h3>
            <button onClick={() => setOpenTicketMessageDialog(false)} className="hover:text-gray-200">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center p-2 bg-gray-100">
            <img
              src={ticket?.contact?.urlPicture}
              alt="Avatar"
              className="w-10 h-10 rounded-full mr-2"
            />
            <div>
              <p className="font-semibold text-gray-800">{ticket.contact?.name}</p>
              <p className="text-sm text-gray-500">{ticket.whatsapp?.name || ticket.channel}</p>
            </div>
          </div>
          <hr className="border-gray-200" />
          <div className="h-[50vh] overflow-y-auto p-4">
            {loadingMessages ? (
              <div className="flex justify-center py-4">
                <p className="text-gray-500">Carregando mensagens...</p>
              </div>
            ) : ticketMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <MessageSquare className="w-10 h-10 mb-2" />
                <p>{i18n.t("ticketsList.noMessages")}</p>
              </div>
            ) : (
              ticketMessages.map((message) => (
                <div
                  key={message.id}
                  className={`p-3 my-2 rounded-lg max-w-[80%] relative ${
                    message.fromMe ? "bg-green-100 ml-auto" : "bg-gray-100"
                  }`}
                >
                  <p className="text-gray-800 break-words mb-2">
                    {message.body.includes("data:image/png;base64") ? (
                      <MarkdownWrapper>Localização</MarkdownWrapper>
                    ) : message.body.includes("BEGIN:VCARD") ? (
                      <MarkdownWrapper>Contato</MarkdownWrapper>
                    ) : (
                      <MarkdownWrapper>{message.body}</MarkdownWrapper>
                    )}
                  </p>
                  <span className="text-xs text-gray-500 absolute bottom-1 right-2">
                    {format(parseISO(message.createdAt), "HH:mm")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Item da Lista */}
      <div
        onClick={(e) => {
          const isIconClicked = ["INPUT", "SVG", "PATH"].includes(e.target.tagName);
          if (!isIconClicked) handleSelectTicket(ticket);
        }}
        className={`flex items-center p-3 border-l-4 shadow-sm rounded-md relative group transition-all duration-200 ease-in-out ${
          ticketId === ticket.uuid
            ? "bg-blue-50 border-blue-500"
            : ticket.status === "pending"
            ? "bg-gray-100 border-gray-300 cursor-default"
            : "bg-white border-transparent hover:-translate-y-0.5 hover:shadow-md"
        }`}
      >
        {/* Avatar */}
        <img
          src={ticket?.contact?.urlPicture}
          alt="Avatar"
          className="w-14 h-14 rounded-full mr-3"
        />

        {/* Informações do Ticket */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
            {/* Grupo à esquerda: ícones de grupo, conexão, nome e espiar */}
            <div className="flex items-center">
              {ticket.isGroup && ticket.channel === "whatsapp" && (
                <Users className="w-4 h-4 text-gray-600 mr-1" />
              )}
              <ConnectionIcon width="20" height="20" connectionType={ticket.channel} className="mr-1" />
              <span className="font-semibold text-gray-800 truncate max-w-[200px]" title={ticket.contact?.name}>
                {truncate(ticket.contact?.name, 60)}
              </span>
              <button 
                onClick={handleOpenMessageDialog} 
                className="ml-2 relative group/icon"
                title="Espiar conversa"
              >
                <Eye className="w-4 h-4 text-blue-600 hover:text-blue-800 transition-colors duration-200" />
                <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 hidden group-hover/icon:block text-xs bg-gray-800 text-white px-2 py-1 rounded">
                  Espiar
                </span>
              </button>
            </div>
            {/* Grupo à direita: ícones de transferir e fechar */}
            <div className="flex items-center space-x-2">
              {(ticket.status === "pending" || ticket.status === "open" || ticket.status === "group") && (
                <ButtonWithSpinner
                  className="text-blue-600 hover:text-blue-800 p-1 relative group/icon"
                  size="small"
                  loading={loading}
                  onClick={handleOpenTransferModal}
                  title="Transferir ticket"
                >
                  <ChevronDown className="w-5 h-5 transition-colors duration-200" />
                  <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 hidden group-hover/icon:block text-xs bg-gray-800 text-white px-2 py-1 rounded">
                    Transferir
                  </span>
                </ButtonWithSpinner>
              )}
              {(ticket.status === "open" || ticket.status === "group") && (
                <ButtonWithSpinner
                  className="text-blue-600 hover:text-blue-800 p-1 relative group/icon"
                  size="small"
                  loading={loading}
                  onClick={() => handleCloseTicket(ticket.id)}
                  title="Fechar ticket"
                >
                  <X className="w-5 h-5 transition-colors duration-200" />
                  <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 hidden group-hover/icon:block text-xs bg-gray-800 text-white px-2 py-1 rounded">
                    Fechar
                  </span>
                </ButtonWithSpinner>
              )}
            </div>
          </div>

          <div className="flex items-center mt-1 justify-between">
            <p
              className={ticket.unreadMessages > 0 ? "text-sm font-bold text-gray-800 truncate max-w-[250px]" : "text-sm text-gray-600 truncate max-w-[250px]"}
            >
              {ticket.lastMessage ? (
                ticket.lastMessage.includes("data:image/png;base64") ? (
                  <MarkdownWrapper>Localização</MarkdownWrapper>
                ) : ticket.lastMessage.includes("BEGIN:VCARD") ? (
                  <MarkdownWrapper>Contato</MarkdownWrapper>
                ) : (
                  <MarkdownWrapper>{truncate(ticket.lastMessage, 40)}</MarkdownWrapper>
                )
              ) : (
                <span> </span>
              )}
            </p>
            <div className="flex items-center">
              {ticket.lastMessage && (
                <span
                  className={ticket.unreadMessages > 0 ? "text-sm text-green-600 font-bold mr-2" : "text-sm text-gray-600 mr-2"}
                >
                  {isSameDay(parseISO(ticket.updatedAt), new Date())
                    ? format(parseISO(ticket.updatedAt), "HH:mm")
                    : format(parseISO(ticket.updatedAt), "dd/MM/yyyy")}
                </span>
              )}
              {ticket.unreadMessages > 0 && (
                <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {ticket.unreadMessages}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1 mt-1">
            {ticket?.whatsapp && (
              <span
                className="text-xs font-semibold text-white px-1 py-0.5 rounded"
                style={{
                  backgroundColor:
                    ticket.channel === "whatsapp"
                      ? "#25D366"
                      : ticket.channel === "facebook"
                      ? "#4267B2"
                      : "#E1306C",
                }}
              >
                {ticket.whatsapp?.name.toUpperCase()}
              </span>
            )}
            <span
              className="text-xs font-semibold text-white px-1 py-0.5 rounded"
              style={{ backgroundColor: ticket.queue?.color || "#7c7c7c" }}
            >
              {ticket.queueId
                ? ticket.queue?.name.toUpperCase()
                : ticket.status === "lgpd"
                ? "LGPD"
                : "SEM FILA"}
            </span>
            {ticket?.user && (
              <span className="text-xs font-semibold text-white bg-black px-1 py-0.5 rounded">
                {ticket.user?.name.toUpperCase()}
              </span>
            )}
            {ticket.tags?.map((tag) => (
              <ContactTag tag={tag} key={`ticket-contact-tag-${ticket.id}-${tag.id}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketListItemCustom;