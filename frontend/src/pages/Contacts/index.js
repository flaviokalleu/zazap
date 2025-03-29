import React, { useState, useEffect, useReducer, useContext, useRef } from "react";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";
import { 
  Search, Edit, Trash2, Lock, Unlock, CheckCircle, XCircle, 
  Facebook, Instagram, MessageCircle, ChevronDown, Upload, Phone 
} from "lucide-react";

// Services e Contexts
import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";
import { TicketsContext } from "../../context/Tickets/TicketsContext";

// Components
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import ContactModal from "../../components/ContactModal";
import NewTicketModal from "../../components/NewTicketModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import ContactImportWpModal from "../../components/ContactImportWpModal";
import { TagsFilter } from "../../components/TagsFilter";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import { Can } from "../../components/Can";

// Utils e Hooks
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import useCompanySettings from "../../hooks/useSettings/companySettings";
import formatSerializedId from '../../utils/formatSerializedId';
import { v4 as uuidv4 } from "uuid";

// Reducer
const reducer = (state, action) => {
  switch (action.type) {
    case "LOAD_CONTACTS":
      const contacts = action.payload;
      const newContacts = contacts.filter(c => !state.some(existing => existing.id === c.id));
      return [...state, ...newContacts];
    case "UPDATE_CONTACTS":
      const updatedContact = action.payload;
      const contactIndex = state.findIndex(c => c.id === updatedContact.id);
      if (contactIndex !== -1) {
        state[contactIndex] = updatedContact;
        return [...state];
      }
      return [updatedContact, ...state];
    case "DELETE_CONTACT":
      return state.filter(c => c.id !== action.payload);
    case "RESET":
      return [];
    default:
      return state;
  }
};

// Componente de Ícone de Canal
const ChannelIcon = ({ channel }) => {
  const icons = {
    whatsapp: <MessageCircle className="text-[#25D366] w-5 h-5" />,
    instagram: <Instagram className="text-[#C13584] w-5 h-5" />,
    facebook: <Facebook className="text-[#4267B2] w-5 h-5" />
  };
  return icons[channel] || null;
};

const Contacts = () => {
  const history = useHistory();
  const { user, socket } = useContext(AuthContext);
  const { setCurrentTicket } = useContext(TicketsContext);
  const { getAll: getAllSettings } = useCompanySettings();

  // Estados
  const [contacts, dispatch] = useReducer(reducer, []);
  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [importContactModalOpen, setImportContactModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmChatsOpen, setConfirmChatsOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [contactTicket, setContactTicket] = useState({});
  const [deletingContact, setDeletingContact] = useState(null);
  const [blockingContact, setBlockingContact] = useState(null);
  const [unBlockingContact, setUnBlockingContact] = useState(null);
  const [importContacts, setImportContacts] = useState(null);
  const [importWhatsappId, setImportWhatsappId] = useState();
  const [enableLGPD, setEnableLGPD] = useState(false);
  const [hideNum, setHideNum] = useState(false);
  
  const fileUploadRef = useRef(null);

  // Efeitos
  useEffect(() => {
    const fetchSettings = async () => {
      const settings = await getAllSettings(user.companyId);
      setEnableLGPD(settings.enableLGPD === "enabled");
      setHideNum(settings.lgpdHideNumber === "enabled");
    };
    fetchSettings();
  }, [user.companyId]);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam, selectedTags]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchContacts = async () => {
        try {
          const { data } = await api.get("/contacts/", {
            params: { searchParam, pageNumber, contactTag: JSON.stringify(selectedTags) },
          });
          dispatch({ type: "LOAD_CONTACTS", payload: data.contacts });
          setHasMore(data.hasMore);
        } catch (err) {
          toastError(err);
        } finally {
          setLoading(false);
        }
      };
      fetchContacts();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber, selectedTags]);

  useEffect(() => {
    const companyId = user.companyId;
    const handleContactEvent = (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_CONTACTS", payload: data.contact });
      }
      if (data.action === "delete") {
        dispatch({ type: "DELETE_CONTACT", payload: +data.contactId });
      }
    };
    socket.on(`company-${companyId}-contact`, handleContactEvent);
    return () => socket.off(`company-${companyId}-contact`, handleContactEvent);
  }, [socket, user.companyId]);

  // Handlers
  const handleSearch = (e) => setSearchParam(e.target.value.toLowerCase());

  const handleOpenContactModal = () => {
    setSelectedContactId(null);
    setContactModalOpen(true);
  };

  const handleEditContact = (contactId) => {
    setSelectedContactId(contactId);
    setContactModalOpen(true);
  };

  const handleDeleteContact = async (contactId) => {
    try {
      await api.delete(`/contacts/${contactId}`);
      toast.success(i18n.t("contacts.toasts.deleted"));
    } catch (err) {
      toastError(err);
    } finally {
      setDeletingContact(null);
      setSearchParam("");
      setPageNumber(1);
    }
  };

  const handleBlockContact = async (contactId) => {
    try {
      await api.put(`/contacts/block/${contactId}`, { active: false });
      toast.success("Contato bloqueado");
    } catch (err) {
      toastError(err);
    } finally {
      setBlockingContact(null);
      setSearchParam("");
      setPageNumber(1);
    }
  };

  const handleUnBlockContact = async (contactId) => {
    try {
      await api.put(`/contacts/block/${contactId}`, { active: true });
      toast.success("Contato desbloqueado");
    } catch (err) {
      toastError(err);
    } finally {
      setUnBlockingContact(null);
      setSearchParam("");
      setPageNumber(1);
    }
  };

  const handleImportExcel = async () => {
    try {
      const formData = new FormData();
      formData.append("file", fileUploadRef.current.files[0]);
      await api.post("/contacts/upload", formData);
      history.go(0);
    } catch (err) {
      toastError(err);
    }
  };

  const handleImportContact = async () => {
    setImportContactModalOpen(false);
    try {
      await api.post("/contacts/import", { whatsappId: importWhatsappId });
      history.go(0);
    } catch (err) {
      toastError(err);
    }
  };

  const handleImportChats = async () => {
    try {
      await api.post("/contacts/import/chats");
      history.go(0);
    } catch (err) {
      toastError(err);
    }
  };

  const handleSelectTicket = (ticket) => {
    const code = uuidv4();
    setCurrentTicket({ id: ticket.id, uuid: ticket.uuid, code });
  };

  const handleCloseOrOpenTicket = (ticket) => {
    setNewTicketModalOpen(false);
    if (ticket?.uuid) {
      handleSelectTicket(ticket);
      history.push(`/tickets/${ticket.uuid}`);
    }
  };

  const handleSelectedTags = (selected) => {
    setSelectedTags(selected.map(t => t.id));
  };

  const loadMore = () => setPageNumber(prev => prev + 1);

  const handleScroll = (e) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) loadMore();
  };

  // Render
  return (
    <MainContainer className="bg-gray-100 min-h-screen p-4">
      <MainHeader className="mb-6">
        <Title>{i18n.t("contacts.title")} ({contacts.length})</Title>
        <MainHeaderButtonsWrapper className="flex items-center gap-3 flex-wrap">
          <TagsFilter onFiltered={handleSelectedTags} />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="search"
              value={searchParam}
              onChange={handleSearch}
              placeholder={i18n.t("contacts.searchPlaceholder")}
              className="w-64 pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
            />
          </div>
          <div className="relative group">
            <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md">
              Importar / Exportar
              <ChevronDown className="ml-2 w-5 h-5" />
            </button>
            <div className="absolute hidden group-hover:block bg-white shadow-lg rounded-lg mt-1 right-0 z-10 min-w-[200px]">
              <button
                onClick={() => {
                  setConfirmOpen(true);
                  setImportContacts(true);
                }}
                className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-100"
              >
                <Phone className="mr-2 w-4 h-4 text-blue-500" />
                {i18n.t("contacts.menu.importYourPhone")}
              </button>
              <button
                onClick={() => setImportContactModalOpen(true)}
                className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-100"
              >
                <Upload className="mr-2 w-4 h-4 text-blue-500" />
                {i18n.t("contacts.menu.importToExcel")}
              </button>
            </div>
          </div>
          <button
            onClick={handleOpenContactModal}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-md"
          >
            {i18n.t("contacts.buttons.add")}
          </button>
        </MainHeaderButtonsWrapper>
      </MainHeader>

      {/* Modals */}
      <NewTicketModal
        modalOpen={newTicketModalOpen}
        initialContact={contactTicket}
        onClose={handleCloseOrOpenTicket}
      />
      <ContactModal
        open={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        contactId={selectedContactId}
      />
      <ConfirmationModal
        title={
          deletingContact ? `${i18n.t("contacts.confirmationModal.deleteTitle")} ${deletingContact.name}?` :
          blockingContact ? `Bloquear Contato ${blockingContact.name}?` :
          unBlockingContact ? `Desbloquear Contato ${unBlockingContact.name}?` :
          importContacts ? i18n.t("contacts.confirmationModal.importTitlte") :
          i18n.t("contactListItems.confirmationModal.importTitlte")
        }
        onSave={setImportWhatsappId}
        isCellPhone={importContacts}
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() =>
          deletingContact ? handleDeleteContact(deletingContact.id) :
          blockingContact ? handleBlockContact(blockingContact.id) :
          unBlockingContact ? handleUnBlockContact(unBlockingContact.id) :
          importContacts ? handleImportContact() :
          handleImportExcel()
        }
      >
        {deletingContact ? i18n.t("contacts.confirmationModal.deleteMessage") :
         blockingContact ? i18n.t("contacts.confirmationModal.blockContact") :
         unBlockingContact ? i18n.t("contacts.confirmationModal.unblockContact") :
         importContacts ? "Escolha de qual conexão deseja importar" :
         i18n.t("contactListItems.confirmationModal.importMessage")}
      </ConfirmationModal>
      <ConfirmationModal
        title={i18n.t("contacts.confirmationModal.importChat")}
        open={confirmChatsOpen}
        onClose={() => setConfirmChatsOpen(false)}
        onConfirm={handleImportChats}
      >
        {i18n.t("contacts.confirmationModal.wantImport")}
      </ConfirmationModal>
      <ContactImportWpModal
        isOpen={importContactModalOpen}
        handleClose={() => setImportContactModalOpen(false)}
        selectedTags={selectedTags}
        hideNum={hideNum}
        userProfile={user.profile}
      />

      {/* Tabela */}
      <div className="flex-1 bg-white rounded-xl shadow-lg overflow-hidden">
        <input
          className="hidden"
          id="upload"
          name="file"
          type="file"
          accept=".xls,.xlsx"
          onChange={() => setConfirmOpen(true)}
          ref={fileUploadRef}
        />
        <div className="overflow-x-auto max-h-[calc(100vh-200px)]" onScroll={handleScroll}>
          <table className="w-full">
            <thead className="bg-gray-50 border-b sticky top-0">
              <tr>
                <th className="p-4 w-16"></th>
                <th className="p-4 text-left text-gray-600 font-semibold">{i18n.t("contacts.table.name")}</th>
                <th className="p-4 text-center text-gray-600 font-semibold">{i18n.t("contacts.table.whatsapp")}</th>
                <th className="p-4 text-center text-gray-600 font-semibold">{i18n.t("contacts.table.email")}</th>
                <th className="p-4 text-center text-gray-600 font-semibold">{i18n.t("contacts.table.whatsapp")}</th>
                <th className="p-4 text-center text-gray-600 font-semibold">Status</th>
                <th className="p-4 text-center text-gray-600 font-semibold">{i18n.t("contacts.table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-gray-50 transition-colors border-b">
                  <td className="p-4">
                    <img src={contact?.urlPicture} alt="" className="w-10 h-10 rounded-full object-cover" />
                  </td>
                  <td className="p-4 text-gray-800">{contact.name}</td>
                  <td className="p-4 text-center text-gray-600">
                    {(enableLGPD && hideNum && user.profile === "user")
                      ? contact.isGroup
                        ? contact.number
                        : `${formatSerializedId(contact?.number)?.slice(0, -6)}**-**${contact?.number?.slice(-2)}`
                      : contact.isGroup
                      ? contact.number
                      : formatSerializedId(contact?.number)}
                  </td>
                  <td className="p-4 text-center text-gray-600">{contact.email || '-'}</td>
                  <td className="p-4 text-center text-gray-600">{contact?.whatsapp?.name || '-'}</td>
                  <td className="p-4 text-center">
                    {contact.active ? (
                      <CheckCircle className="text-green-500 w-5 h-5 mx-auto" />
                    ) : (
                      <XCircle className="text-red-500 w-5 h-5 mx-auto" />
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        disabled={!contact.active}
                        onClick={() => {
                          setContactTicket(contact);
                          setNewTicketModalOpen(true);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                      >
                        <ChannelIcon channel={contact.channel} />
                      </button>
                      <button
                        onClick={() => handleEditContact(contact.id)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <Edit className="text-blue-500 w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setConfirmOpen(true);
                          contact.active ? setBlockingContact(contact) : setUnBlockingContact(contact);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        {contact.active ? (
                          <Lock className="text-red-500 w-5 h-5" />
                        ) : (
                          <Unlock className="text-green-500 w-5 h-5" />
                        )}
                      </button>
                      <Can
                        role={user.profile}
                        perform="contacts-page:deleteContact"
                        yes={() => (
                          <button
                            onClick={() => {
                              setConfirmOpen(true);
                              setDeletingContact(contact);
                            }}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <Trash2 className="text-red-500 w-5 h-5" />
                          </button>
                        )}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {loading && <TableRowSkeleton avatar columns={6} />}
            </tbody>
          </table>
        </div>
      </div>
    </MainContainer>
  );
};

export default Contacts;