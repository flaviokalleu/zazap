import React, { useState, useEffect, useReducer, useContext } from "react";
import { toast } from "react-toastify";
import { Search, Edit, Trash2, CheckCircle } from "lucide-react";
import { isArray } from "lodash";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import QuickMessageDialog from "../../components/QuickMessageDialog";
import ConfirmationModal from "../../components/ConfirmationModal";
import TableRowSkeleton from "../../components/TableRowSkeleton";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";

const reducer = (state, action) => {
  switch (action.type) {
    case "LOAD_QUICKMESSAGES":
      const quickmessages = action.payload;
      const newQuickmessages = [];
      if (isArray(quickmessages)) {
        quickmessages.forEach((quickmessage) => {
          const quickmessageIndex = state.findIndex((u) => u.id === quickmessage.id);
          if (quickmessageIndex !== -1) {
            state[quickmessageIndex] = quickmessage;
          } else {
            newQuickmessages.push(quickmessage);
          }
        });
      }
      return [...state, ...newQuickmessages];
    case "UPDATE_QUICKMESSAGES":
      const quickmessage = action.payload;
      const quickmessageIndex = state.findIndex((u) => u.id === quickmessage.id);
      if (quickmessageIndex !== -1) {
        state[quickmessageIndex] = quickmessage;
        return [...state];
      }
      return [quickmessage, ...state];
    case "DELETE_QUICKMESSAGE":
      return state.filter((u) => u.id !== action.payload);
    case "RESET":
      return [];
    default:
      return state;
  }
};

const QuickMessages = () => {
  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedQuickMessage, setSelectedQuickMessage] = useState(null);
  const [deletingQuickMessage, setDeletingQuickMessage] = useState(null);
  const [quickMessageModalOpen, setQuickMessageModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [quickMessages, dispatch] = useReducer(reducer, []);
  const { user, socket } = useContext(AuthContext);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      fetchQuickMessages();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber]);

  useEffect(() => {
    const companyId = user.companyId;
    const onQuickMessageEvent = (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_QUICKMESSAGES", payload: data.record });
      }
      if (data.action === "delete") {
        dispatch({ type: "DELETE_QUICKMESSAGE", payload: +data.id });
      }
    };
    socket.on(`company-${companyId}-quickemessage`, onQuickMessageEvent);
    return () => socket.off(`company-${companyId}-quickemessage`, onQuickMessageEvent);
  }, [socket, user.companyId]);

  const fetchQuickMessages = async () => {
    try {
      const { data } = await api.get("/quick-messages", {
        params: { searchParam, pageNumber },
      });
      dispatch({ type: "LOAD_QUICKMESSAGES", payload: data.records });
      setHasMore(data.hasMore);
      setLoading(false);
    } catch (err) {
      toastError(err);
    }
  };

  const handleOpenQuickMessageDialog = () => {
    setSelectedQuickMessage(null);
    setQuickMessageModalOpen(true);
  };

  const handleCloseQuickMessageDialog = () => {
    setSelectedQuickMessage(null);
    setQuickMessageModalOpen(false);
    fetchQuickMessages();
  };

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleEditQuickMessage = (quickMessage) => {
    setSelectedQuickMessage(quickMessage);
    setQuickMessageModalOpen(true);
  };

  const handleDeleteQuickMessage = async (quickMessageId) => {
    try {
      await api.delete(`/quick-messages/${quickMessageId}`);
      toast.success(i18n.t("quickemessages.toasts.deleted"));
      fetchQuickMessages();
      dispatch({ type: "RESET" });
    } catch (err) {
      toastError(err);
    }
    setDeletingQuickMessage(null);
    setSearchParam("");
    setPageNumber(1);
  };

  const loadMore = () => {
    setPageNumber((prevState) => prevState + 1);
  };

  const handleScroll = (e) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      loadMore();
    }
  };

  return (
    <MainContainer className="bg-gray-100 min-h-screen p-4">
      <ConfirmationModal
        title={
          deletingQuickMessage &&
          `${i18n.t("quickMessages.confirmationModal.deleteTitle")} ${deletingQuickMessage.shortcode}?`
        }
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={() => handleDeleteQuickMessage(deletingQuickMessage.id)}
      >
        {i18n.t("quickMessages.confirmationModal.deleteMessage")}
      </ConfirmationModal>

      <QuickMessageDialog
        resetPagination={() => {
          setPageNumber(1);
          fetchQuickMessages();
        }}
        open={quickMessageModalOpen}
        onClose={handleCloseQuickMessageDialog}
        quickemessageId={selectedQuickMessage?.id}
      />

      <MainHeader className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-4">
          <Title>{i18n.t("quickMessages.title")}</Title>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="search"
                value={searchParam}
                onChange={handleSearch}
                placeholder={i18n.t("quickMessages.searchPlaceholder")}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
              />
            </div>
            <button
              onClick={handleOpenQuickMessageDialog}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-md w-full sm:w-auto"
            >
              {i18n.t("quickMessages.buttons.add")}
            </button>
          </div>
        </div>
      </MainHeader>

      <div
        className="flex-1 bg-white rounded-xl shadow-lg overflow-hidden max-h-[calc(100vh-200px)]"
        onScroll={handleScroll}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b sticky top-0">
              <tr>
                <th className="p-4 text-center text-gray-600 font-semibold">
                  {i18n.t("quickMessages.table.shortcode")}
                </th>
                <th className="p-4 text-center text-gray-600 font-semibold">
                  {i18n.t("quickMessages.table.mediaName")}
                </th>
                <th className="p-4 text-center text-gray-600 font-semibold">
                  {i18n.t("quickMessages.table.status")}
                </th>
                <th className="p-4 text-center text-gray-600 font-semibold">
                  {i18n.t("quickMessages.table.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {quickMessages.map((quickMessage) => (
                <tr
                  key={quickMessage.id}
                  className="hover:bg-gray-50 transition-colors border-b"
                >
                  <td className="p-4 text-center text-gray-800 font-medium">
                    {quickMessage.shortcode}
                  </td>
                  <td className="p-4 text-center text-gray-600">
                    {quickMessage.mediaName ?? i18n.t("quickMessages.noAttachment")}
                  </td>
                  <td className="p-4 text-center">
                    {quickMessage.geral ? (
                      <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleEditQuickMessage(quickMessage)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        title={i18n.t("quickMessages.buttons.edit")}
                      >
                        <Edit className="w-5 h-5 text-blue-500" />
                      </button>
                      <button
                        onClick={() => {
                          setConfirmModalOpen(true);
                          setDeletingQuickMessage(quickMessage);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        title={i18n.t("quickMessages.buttons.delete")}
                      >
                        <Trash2 className="w-5 h-5 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {loading && <TableRowSkeleton columns={4} />}
            </tbody>
          </table>
        </div>
      </div>
    </MainContainer>
  );
};

export default QuickMessages;