import React, { useState, useEffect, useContext } from "react";
import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";
import Board from 'react-trello';
import { toast } from "react-toastify";
import { i18n } from "../../translate/i18n";
import { useHistory } from 'react-router-dom';
import { Facebook, Instagram, MessageCircle } from "lucide-react";
import { format, isSameDay, parseISO } from "date-fns";
import { Can } from "../../components/Can";

const Kanban = () => {
  const history = useHistory();
  const { user, socket } = useContext(AuthContext);
  const [tags, setTags] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [file, setFile] = useState({ lanes: [] });
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const jsonString = user.queues.map(queue => queue.UserQueue.queueId);

  useEffect(() => {
    fetchTags();
  }, [user]);

  const fetchTags = async () => {
    try {
      const response = await api.get("/tag/kanban/");
      setTags(response.data.lista || []);
      fetchTickets();
    } catch (error) {
      console.log(error);
    }
  };

  const fetchTickets = async () => {
    try {
      const { data } = await api.get("/ticket/kanban", {
        params: {
          queueIds: JSON.stringify(jsonString),
          startDate: startDate,
          endDate: endDate,
        }
      });
      setTickets(data.tickets);
    } catch (err) {
      console.log(err);
      setTickets([]);
    }
  };

  useEffect(() => {
    const companyId = user.companyId;
    const onAppMessage = (data) => {
      if (data.action === "create" || data.action === "update" || data.action === "delete") {
        fetchTickets();
      }
    };
    socket.on(`company-${companyId}-ticket`, onAppMessage);
    socket.on(`company-${companyId}-appMessage`, onAppMessage);

    return () => {
      socket.off(`company-${companyId}-ticket`, onAppMessage);
      socket.off(`company-${companyId}-appMessage`, onAppMessage);
    };
  }, [socket, startDate, endDate]);

  const handleSearchClick = () => {
    fetchTickets();
  };

  const handleStartDateChange = (event) => {
    setStartDate(event.target.value);
  };

  const handleEndDateChange = (event) => {
    setEndDate(event.target.value);
  };

  const IconChannel = (channel) => {
    switch (channel) {
      case "facebook":
        return <Facebook className="text-[#3b5998] w-5 h-5" />;
      case "instagram":
        return <Instagram className="text-[#e1306c] w-5 h-5" />;
      case "MessageCircle":
        return <MessageCircle className="text-[#25d366] w-5 h-5" />;
      default:
        return null;
    }
  };

  const popularCards = (jsonString) => {
    const filteredTickets = tickets.filter(ticket => ticket.tags.length === 0);

    const lanes = [
      {
        id: "lane0",
        title: i18n.t("tagsKanban.laneDefault"),
        label: filteredTickets.length.toString(),
        cards: filteredTickets.map(ticket => ({
          id: ticket.id.toString(),
          label: "Ticket nº " + ticket.id.toString(),
          description: (
            <div className="p-2">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-800">{ticket.contact.number}</span>
                <span className={`${ticket.unreadMessages > 0 ? 'text-green-500 font-bold' : 'text-gray-500'} text-sm italic`}>
                  {isSameDay(parseISO(ticket.updatedAt), new Date()) 
                    ? format(parseISO(ticket.updatedAt), "HH:mm")
                    : format(parseISO(ticket.updatedAt), "dd/MM/yyyy")}
                </span>
              </div>
              <div className="text-left text-gray-600 my-2">{ticket.lastMessage || " "}</div>
              <button 
                className="mt-2 px-4 py-1 bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-full hover:from-orange-500 hover:to-pink-500 transition-all"
                onClick={() => handleCardClick(ticket.uuid)}
              >
                Ver Ticket
              </button>
              {ticket?.user && (
                <span className="mt-2 inline-block bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                  {ticket.user?.name.toUpperCase()}
                </span>
              )}
            </div>
          ),
          title: (
            <div className="flex items-center font-semibold text-gray-800">
              <span title={ticket.MessageCircle?.name}>{IconChannel(ticket.channel)}</span>
              <span className="ml-2">{ticket.contact.name}</span>
            </div>
          ),
          draggable: true,
          href: "/tickets/" + ticket.uuid,
        })),
      },
      ...tags.map(tag => {
        const filteredTickets = tickets.filter(ticket => 
          ticket.tags.map(t => t.id).includes(tag.id)
        );

        return {
          id: tag.id.toString(),
          title: tag.name,
          label: filteredTickets?.length.toString(),
          cards: filteredTickets.map(ticket => ({
            id: ticket.id.toString(),
            label: "Ticket nº " + ticket.id.toString(),
            description: (
              <div className="p-2">
                <div className="font-medium text-gray-800">{ticket.contact.number}</div>
                <div className="text-left text-gray-600 my-2">{ticket.lastMessage || " "}</div>
                <button 
                  className="mt-2 px-4 py-1 bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-full hover:from-orange-500 hover:to-pink-500 transition-all"
                  onClick={() => handleCardClick(ticket.uuid)}
                >
                  Ver Ticket
                </button>
                {ticket?.user && (
                  <span className="mt-2 inline-block bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                    {ticket.user?.name.toUpperCase()}
                  </span>
                )}
              </div>
            ),
            title: (
              <div className="flex items-center font-semibold text-gray-800">
                <span title={ticket.MessageCircle?.name}>{IconChannel(ticket.channel)}</span>
                <span className="ml-2">{ticket.contact.name}</span>
              </div>
            ),
            draggable: true,
            href: "/tickets/" + ticket.uuid,
          })),
          style: { 
            background: `linear-gradient(135deg, ${tag.color} 0%, #f3f4f6 100%)`,
            color: "#fff",
            borderRadius: "8px",
            padding: "10px",
            boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
          },
        };
      }),
    ];

    setFile({ lanes });
  };

  const handleCardClick = (uuid) => {
    history.push('/tickets/' + uuid);
  };

  useEffect(() => {
    popularCards(jsonString);
  }, [tags, tickets]);

  const handleCardMove = async (cardId, sourceLaneId, targetLaneId) => {
    try {
      await api.delete(`/ticket-tags/${targetLaneId}`);
      toast.success('Ticket Tag Removido!');
      await api.put(`/ticket-tags/${targetLaneId}/${sourceLaneId}`);
      toast.success('Ticket Tag Adicionado com Sucesso!');
      await fetchTickets(jsonString);
      popularCards(jsonString);
    } catch (err) {
      console.log(err);
    }
  };

  const handleAddConnectionClick = () => {
    history.push('/tagsKanban');
  };

  return (
    <div className="flex flex-col items-center p-4 bg-gradient-to-br from-gray-100 to-gray-300 min-h-screen">
      <div className="flex items-center justify-between mb-8 w-full max-w-7xl bg-white p-5 rounded-xl shadow-lg">
        <div className="flex items-center space-x-4">
          <input
            type="date"
            value={startDate}
            onChange={handleStartDateChange}
            className="border rounded-lg p-2 bg-white shadow-sm"
          />
          <input
            type="date"
            value={endDate}
            onChange={handleEndDateChange}
            className="border rounded-lg p-2 bg-white shadow-sm"
          />
          <button
            onClick={handleSearchClick}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-cyan-500 hover:to-blue-500 transition-all"
          >
            Buscar
          </button>
        </div>
        <Can role={user.profile} perform="dashboard:view" yes={() => (
          <button
            onClick={handleAddConnectionClick}
            className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-300 text-white rounded-lg hover:from-green-300 hover:to-green-500 transition-all"
          >
            + Adicionar Colunas
          </button>
        )} />
      </div>
      <div className="w-full max-w-7xl bg-white rounded-xl shadow-lg overflow-hidden">
        <Board
          data={file}
          onCardMoveAcrossLanes={handleCardMove}
          style={{ backgroundColor: 'transparent', padding: "20px" }}
        />
      </div>
    </div>
  );
};

export default Kanban;