import React, { useContext, useEffect, useRef, useState } from "react";
import { useHistory } from "react-router-dom";
import {
  Users,
  Inbox,
  CheckSquare,
  MessageSquare,
  Clock,
  Search,
  Plus,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Filter,
  FilterX,
  CheckCheck,
} from "lucide-react";
import NewTicketModal from "../NewTicketModal";
import TicketsList from "../TicketsListCustom";
import TabPanel from "../TabPanel";
import { Can } from "../Can";
import TicketsQueueSelect from "../TicketsQueueSelect";
import { TagsFilter } from "../TagsFilter";
import { UsersFilter } from "../UsersFilter";
import { StatusFilter } from "../StatusFilter";
import { WhatsappsFilter } from "../WhatsappsFilter";

import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import { QueueSelectedContext } from "../../context/QueuesSelected/QueuesSelectedContext";
import api from "../../services/api";
import { TicketsContext } from "../../context/Tickets/TicketsContext";

const TicketsManagerTabs = () => {
  const history = useHistory();

  const [searchParam, setSearchParam] = useState("");
  const [tab, setTab] = useState("open");
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [showAllTickets, setShowAllTickets] = useState(false);
  const [sortTickets, setSortTickets] = useState(false);
  const [searchOnMessages, setSearchOnMessages] = useState(false);

  const searchInputRef = useRef();

  const { user } = useContext(AuthContext);
  const { profile } = user;
  const { setSelectedQueuesMessage } = useContext(QueueSelectedContext);
  const { tabOpen, setTabOpen } = useContext(TicketsContext);

  const [openCount, setOpenCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [groupingCount, setGroupingCount] = useState(0);

  const userQueueIds = user.queues.map((q) => q.id);
  const [selectedQueueIds, setSelectedQueueIds] = useState(userQueueIds || []);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedWhatsapp, setSelectedWhatsapp] = useState([]);
  const [forceSearch, setForceSearch] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState([]);
  const [filter, setFilter] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [isFilterActive, setIsFilterActive] = useState(false);

  useEffect(() => {
    setSelectedQueuesMessage(selectedQueueIds);
  }, [selectedQueueIds, setSelectedQueuesMessage]);

  useEffect(() => {
    if (
      user.profile.toUpperCase() === "ADMIN" ||
      user.allUserChat.toUpperCase() === "ENABLED"
    ) {
      setShowAllTickets(false);
    }
  }, [user]);

  useEffect(() => {
    if (tab === "search") {
      searchInputRef.current.focus();
    }
    setForceSearch(!forceSearch);
  }, [tab]);

  let searchTimeout;

  const handleSearch = (e) => {
    const searchedTerm = e.target.value.toLowerCase();
    clearTimeout(searchTimeout);

    if (searchedTerm === "") {
      setSearchParam(searchedTerm);
      setForceSearch(!forceSearch);
      setTab("open");
      return;
    } else if (tab !== "search") {
      handleFilter();
      setTab("search");
    }

    searchTimeout = setTimeout(() => {
      setSearchParam(searchedTerm);
      setForceSearch(!forceSearch);
    }, 500);
  };

  const handleBack = () => {
    history.push("/tickets");
  };

  const handleChangeTab = (e, newValue) => {
    setTab(newValue);
  };

  const handleChangeTabOpen = (e, newValue) => {
    handleBack();
    setTabOpen(newValue);
  };

  const applyPanelStyle = (status) => {
    if (tabOpen !== status) {
      return { display: "none" };
    }
    return {};
  };

  const handleSnackbarOpen = () => {
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const CloseAllTicket = async () => {
    try {
      const { data } = await api.post("/tickets/closeAll", {
        status: tabOpen,
        selectedQueueIds,
      });
      handleSnackbarClose();
    } catch (err) {
      console.log("Error: ", err);
    }
  };

  const handleCloseOrOpenTicket = (ticket) => {
    setNewTicketModalOpen(false);
    if (ticket !== undefined && ticket.uuid !== undefined) {
      history.push(`/tickets/${ticket.uuid}`);
    }
  };

  const handleSelectedTags = (selecteds) => {
    const tags = selecteds.map((t) => t.id);
    clearTimeout(searchTimeout);

    if (tags.length === 0) {
      setForceSearch(!forceSearch);
    } else if (tab !== "search") {
      setTab("search");
    }

    searchTimeout = setTimeout(() => {
      setSelectedTags(tags);
      setForceSearch(!forceSearch);
    }, 500);
  };

  const handleSelectedUsers = (selecteds) => {
    const users = selecteds.map((t) => t.id);
    clearTimeout(searchTimeout);

    if (users.length === 0) {
      setForceSearch(!forceSearch);
    } else if (tab !== "search") {
      setTab("search");
    }
    searchTimeout = setTimeout(() => {
      setSelectedUsers(users);
      setForceSearch(!forceSearch);
    }, 500);
  };

  const handleSelectedWhatsapps = (selecteds) => {
    const whatsapp = selecteds.map((t) => t.id);
    clearTimeout(searchTimeout);

    if (whatsapp.length === 0) {
      setForceSearch(!forceSearch);
    } else if (tab !== "search") {
      setTab("search");
    }
    searchTimeout = setTimeout(() => {
      setSelectedWhatsapp(whatsapp);
      setForceSearch(!forceSearch);
    }, 500);
  };

  const handleSelectedStatus = (selecteds) => {
    const statusFilter = selecteds.map((t) => t.status);
    clearTimeout(searchTimeout);

    if (statusFilter.length === 0) {
      setForceSearch(!forceSearch);
    } else if (tab !== "search") {
      setTab("search");
    }

    searchTimeout = setTimeout(() => {
      setSelectedStatus(statusFilter);
      setForceSearch(!forceSearch);
    }, 500);
  };

  const handleFilter = () => {
    if (filter) {
      setFilter(false);
      setTab("open");
    } else setFilter(true);
    setTab("search");
  };

  return (
    <div className="w-full bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-7xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
        <NewTicketModal
          modalOpen={newTicketModalOpen}
          onClose={(ticket) => handleCloseOrOpenTicket(ticket)}
        />

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative flex items-center bg-gray-100 rounded-xl p-2 transition-all duration-300 hover:shadow-md">
            <Search className="w-5 h-5 text-gray-500 mr-2" />
            <input
              ref={searchInputRef}
              type="search"
              placeholder={i18n.t("tickets.search.placeholder")}
              className="flex-1 bg-transparent outline-none text-gray-700 placeholder-gray-400"
              onChange={handleSearch}
            />
            <div className="flex items-center space-x-2">
              <div className="flex items-center">
                <span className="text-sm text-gray-600 mr-2">Mensagens</span>
                <input
                  type="checkbox"
                  checked={searchOnMessages}
                  onChange={(e) => setSearchOnMessages(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={() => {
                  setIsFilterActive((prevState) => !prevState);
                  handleFilter();
                }}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  isFilterActive
                    ? "bg-red-100 text-red-600"
                    : "bg-indigo-100 text-indigo-600"
                }`}
              >
                {isFilterActive ? (
                  <FilterX className="w-5 h-5" />
                ) : (
                  <Filter className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Filters */}
          {filter && (
            <div className="mt-4 space-y-4 animate-fade-in">
              <TagsFilter onFiltered={handleSelectedTags} />
              <WhatsappsFilter onFiltered={handleSelectedWhatsapps} />
              <StatusFilter onFiltered={handleSelectedStatus} />
              {profile === "admin" && (
                <UsersFilter onFiltered={handleSelectedUsers} />
              )}
            </div>
          )}
        </div>

        {/* Options Bar */}
        <div className="p-4 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex space-x-2">
            <Can
              role={
                user.allUserChat === "enabled" && user.profile === "user"
                  ? "admin"
                  : user.profile
              }
              perform="tickets-manager:showall"
              yes={() => (
                <button
                  onClick={() => setShowAllTickets((prevState) => !prevState)}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    showAllTickets
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-gray-600 border border-gray-200"
                  }`}
                >
                  {showAllTickets ? (
                    <Eye className="w-5 h-5" />
                  ) : (
                    <EyeOff className="w-5 h-5" />
                  )}
                </button>
              )}
            />
            {/* Snackbar */}
            {snackbarOpen && (
              <div className="absolute top-4 right-4 bg-indigo-800 text-white p-4 rounded-xl shadow-lg z-50 animate-fade-in">
                <p>{i18n.t("tickets.inbox.closedAllTickets")}</p>
                <div className="mt-2 flex space-x-2">
                  <button
                    onClick={CloseAllTicket}
                    className="bg-green-500 text-white px-4 py-1 rounded-lg hover:bg-green-600 transition-colors duration-200"
                  >
                    {i18n.t("tickets.inbox.yes")}
                  </button>
                  <button
                    onClick={handleSnackbarClose}
                    className="bg-red-500 text-white px-4 py-1 rounded-lg hover:bg-red-600 transition-colors duration-200"
                  >
                    {i18n.t("tickets.inbox.no")}
                  </button>
                </div>
              </div>
            )}
            <button
              onClick={() => setNewTicketModalOpen(true)}
              className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200"
            >
              <Plus className="w-5 h-5" />
            </button>
            {user.profile === "admin" && (
              <button
                onClick={handleSnackbarOpen}
                className="p-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors duration-200"
              >
                <CheckCheck className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => handleChangeTab(null, "open")}
              className={`p-2 rounded-lg transition-colors duration-200 ${
                tab === "open"
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              <Inbox className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleChangeTab(null, "closed")}
              className={`p-2 rounded-lg transition-colors duration-200 ${
                tab === "closed"
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              <CheckSquare className="w-5 h-5" />
            </button>
            {tab !== "closed" && tab !== "search" && (
              <button
                onClick={() => setSortTickets((prevState) => !prevState)}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  sortTickets
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-600 border border-gray-200"
                }`}
              >
                {sortTickets ? (
                  <ArrowDown className="w-5 h-5" />
                ) : (
                  <ArrowUp className="w-5 h-5" />
                )}
              </button>
            )}
          </div>
          <TicketsQueueSelect
            selectedQueueIds={selectedQueueIds}
            userQueues={user?.queues}
            onChange={(values) => setSelectedQueueIds(values)}
          />
        </div>

        {/* Tabs */}
        <TabPanel value={tab} name="open">
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto">
              <button
                onClick={() => handleChangeTabOpen(null, "open")}
                className={`flex-1 py-3 px-4 flex items-center justify-center space-x-2 transition-colors duration-200 ${
                  tabOpen === "open"
                    ? "border-b-2 border-indigo-600 text-indigo-600"
                    : "text-gray-600"
                }`}
              >
                <MessageSquare className="w-5 h-5" />
                <span className="font-medium">
                  {i18n.t("ticketsList.assignedHeader")}
                </span>
                <span className="ml-2 bg-indigo-100 text-indigo-600 rounded-full px-2 py-1 text-xs">
                  {openCount}
                </span>
              </button>
              <button
                onClick={() => handleChangeTabOpen(null, "pending")}
                className={`flex-1 py-3 px-4 flex items-center justify-center space-x-2 transition-colors duration-200 ${
                  tabOpen === "pending"
                    ? "border-b-2 border-indigo-600 text-indigo-600"
                    : "text-gray-600"
                }`}
              >
                <Clock className="w-5 h-5" />
                <span className="font-medium">
                  {i18n.t("ticketsList.pendingHeader")}
                </span>
                <span className="ml-2 bg-indigo-100 text-indigo-600 rounded-full px-2 py-1 text-xs">
                  {pendingCount}
                </span>
              </button>
              {user.allowGroup && (
                <button
                  onClick={() => handleChangeTabOpen(null, "group")}
                  className={`flex-1 py-3 px-4 flex items-center justify-center space-x-2 transition-colors duration-200 ${
                    tabOpen === "group"
                      ? "border-b-2 border-indigo-600 text-indigo-600"
                      : "text-gray-600"
                  }`}
                >
                  <Users className="w-5 h-5" />
                  <span className="font-medium">
                    {i18n.t("ticketsList.groupingHeader")}
                  </span>
                  <span className="ml-2 bg-indigo-100 text-indigo-600 rounded-full px-2 py-1 text-xs">
                    {groupingCount}
                  </span>
                </button>
              )}
            </div>
          </div>
          <div className="p-2">
            <TicketsList
              status="open"
              showAll={showAllTickets}
              sortTickets={sortTickets ? "ASC" : "DESC"}
              selectedQueueIds={selectedQueueIds}
              updateCount={(val) => setOpenCount(val)}
              style={applyPanelStyle("open")}
              setTabOpen={setTabOpen}
            />
            <TicketsList
              status="pending"
              selectedQueueIds={selectedQueueIds}
              sortTickets={sortTickets ? "ASC" : "DESC"}
              showAll={
                user.profile === "admin" || user.allUserChat === "enabled"
                  ? showAllTickets
                  : false
              }
              updateCount={(val) => setPendingCount(val)}
              style={applyPanelStyle("pending")}
              setTabOpen={setTabOpen}
            />
            {user.allowGroup && (
              <TicketsList
                status="group"
                showAll={showAllTickets}
                sortTickets={sortTickets ? "ASC" : "DESC"}
                selectedQueueIds={selectedQueueIds}
                updateCount={(val) => setGroupingCount(val)}
                style={applyPanelStyle("group")}
                setTabOpen={setTabOpen}
              />
            )}
          </div>
        </TabPanel>

        <TabPanel value={tab} name="closed">
          <div className="p-4">
            <TicketsList
              status="closed"
              showAll={showAllTickets}
              selectedQueueIds={selectedQueueIds}
              setTabOpen={setTabOpen}
            />
          </div>
        </TabPanel>

        <TabPanel value={tab} name="search">
          <div className="p-4">
            {profile === "admin" && (
              <TicketsList
                statusFilter={selectedStatus}
                searchParam={searchParam}
                showAll={showAllTickets}
                tags={selectedTags}
                users={selectedUsers}
                selectedQueueIds={selectedQueueIds}
                whatsappIds={selectedWhatsapp}
                forceSearch={forceSearch}
                searchOnMessages={searchOnMessages}
                status="search"
              />
            )}
            {profile === "user" && (
              <TicketsList
                statusFilter={selectedStatus}
                searchParam={searchParam}
                showAll={false}
                tags={selectedTags}
                selectedQueueIds={selectedQueueIds}
                whatsappIds={selectedWhatsapp}
                forceSearch={forceSearch}
                searchOnMessages={searchOnMessages}
                status="search"
              />
            )}
          </div>
        </TabPanel>
      </div>
    </div>
  );
};

export default TicketsManagerTabs;