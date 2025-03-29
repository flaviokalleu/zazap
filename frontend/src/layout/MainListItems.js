import React, { useContext, useEffect, useReducer, useState } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Contact,
  Tag,
  Clock,
  HelpCircle,
  FileText,
  List as ListIconLucide,
  AlertCircle,
  Settings,
  File,
  DollarSign,
  Building,
  ChevronDown,
  ChevronUp,
  Zap,
  KanbanSquare,
  MessageCircle,
  Code,
  Webhook as WebhookIcon,
  Shapes,
  Calendar,
  Share2,
  Grid,
} from "lucide-react";

import { WhatsAppsContext } from "../context/WhatsApp/WhatsAppsContext";
import { AuthContext } from "../context/Auth/AuthContext";
import { useActiveMenu } from "../context/ActiveMenuContext";
import { Can } from "../components/Can";
import { isArray } from "lodash";
import api from "../services/api";
import toastError from "../errors/toastError";
import usePlans from "../hooks/usePlans";
import useVersion from "../hooks/useVersion";
import useHelps from "../hooks/useHelps";
import { i18n } from "../translate/i18n";
import moment from "moment";

function ListItemLink({ icon, primary, to, showBadge, collapsed }) {
  const { activeMenu } = useActiveMenu();
  const location = useLocation();
  const isActive = activeMenu === to || location.pathname === to;

  return (
    <li>
      <RouterLink
        to={to}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ease-in-out ${
          isActive
            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
            : "text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
        } ${collapsed ? "justify-center px-2" : ""}`}
      >
        <div className="relative flex items-center justify-center w-6 h-6">
          {showBadge && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
          )}
          {React.cloneElement(icon, {
            className: `w-5 h-5 ${isActive ? "text-white" : "text-gray-500 group-hover:text-indigo-600"} transition-colors duration-300`,
          })}
        </div>
        {!collapsed && (
          <span className="text-sm font-medium tracking-wide">{primary}</span>
        )}
      </RouterLink>
    </li>
  );
}

const reducer = (state, action) => {
  if (action.type === "LOAD_CHATS") {
    const chats = action.payload;
    const newChats = [];
    if (isArray(chats)) {
      chats.forEach((chat) => {
        const chatIndex = state.findIndex((u) => u.id === chat.id);
        if (chatIndex !== -1) {
          state[chatIndex] = chat;
        } else {
          newChats.push(chat);
        }
      });
    }
    return [...state, ...newChats];
  }
  if (action.type === "UPDATE_CHATS") {
    const chat = action.payload;
    const chatIndex = state.findIndex((u) => u.id === chat.id);
    if (chatIndex !== -1) {
      state[chatIndex] = chat;
      return [...state];
    } else {
      return [chat, ...state];
    }
  }
  if (action.type === "DELETE_CHAT") {
    const chatId = action.payload;
    const chatIndex = state.findIndex((u) => u.id === chatId);
    if (chatIndex !== -1) {
      state.splice(chatIndex, 1);
    }
    return [...state];
  }
  if (action.type === "RESET") {
    return [];
  }
  if (action.type === "CHANGE_CHAT") {
    return state.map((chat) =>
      chat.id === action.payload.chat.id ? action.payload.chat : chat
    );
  }
  return state;
};

const MainListItems = ({ collapsed, drawerClose }) => {
  const { whatsApps } = useContext(WhatsAppsContext);
  const { user, socket } = useContext(AuthContext);
  const { setActiveMenu } = useActiveMenu();
  const location = useLocation();

  const [connectionWarning, setConnectionWarning] = useState(false);
  const [openCampaignSubmenu, setOpenCampaignSubmenu] = useState(false);
  const [openFlowSubmenu, setOpenFlowSubmenu] = useState(false);
  const [openDashboardSubmenu, setOpenDashboardSubmenu] = useState(false);
  const [showCampaigns, setShowCampaigns] = useState(false);
  const [showKanban, setShowKanban] = useState(false);
  const [planExpired, setPlanExpired] = useState(false);
  const [showOpenAi, setShowOpenAi] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [showSchedules, setShowSchedules] = useState(false);
  const [showInternalChat, setShowInternalChat] = useState(false);
  const [showExternalApi, setShowExternalApi] = useState(false);
  const [invisible, setInvisible] = useState(true);
  const [pageNumber, setPageNumber] = useState(1);
  const [searchParam] = useState("");
  const [chats, dispatch] = useReducer(reducer, []);
  const [version, setVersion] = useState(false);
  const { list } = useHelps();
  const [hasHelps, setHasHelps] = useState(false);

  const isManagementActive =
    location.pathname === "/" ||
    location.pathname.startsWith("/reports") ||
    location.pathname.startsWith("/moments");

  const isCampaignRouteActive =
    location.pathname === "/campaigns" ||
    location.pathname.startsWith("/contact-lists") ||
    location.pathname.startsWith("/campaigns-config");

  const isFlowbuilderRouteActive =
    location.pathname.startsWith("/phrase-lists") ||
    location.pathname.startsWith("/flowbuilders");

  useEffect(() => {
    async function checkHelps() {
      const helps = await list();
      setHasHelps(helps.length > 0);
    }
    checkHelps();
  }, [list]);

  useEffect(() => {
    if (location.pathname.startsWith("/tickets")) {
      setActiveMenu("/tickets");
    } else {
      setActiveMenu("");
    }
  }, [location, setActiveMenu]);

  const { getPlanCompany } = usePlans();
  const { getVersion } = useVersion();

  useEffect(() => {
    async function fetchVersion() {
      const _version = await getVersion();
      setVersion(_version.version);
    }
    fetchVersion();
  }, [getVersion]);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    async function fetchData() {
      const companyId = user.companyId;
      const planConfigs = await getPlanCompany(undefined, companyId);

      setShowCampaigns(planConfigs.plan.useCampaigns);
      setShowKanban(planConfigs.plan.useKanban);
      setShowOpenAi(planConfigs.plan.useOpenAi);
      setShowIntegrations(planConfigs.plan.useIntegrations);
      setShowSchedules(planConfigs.plan.useSchedules);
      setShowInternalChat(planConfigs.plan.useInternalChat);
      setShowExternalApi(planConfigs.plan.useExternalApi);
      setPlanExpired(moment(moment().format()).isBefore(user.company.dueDate));
    }
    fetchData();
  }, [user.companyId, getPlanCompany]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchChats();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber]);

  useEffect(() => {
    if (user.id) {
      const companyId = user.companyId;
      const onCompanyChat = (data) => {
        if (data.action === "new-message" || data.action === "update") {
          dispatch({ type: "CHANGE_CHAT", payload: data });
        }
      };
      socket.on(`company-${companyId}-chat`, onCompanyChat);
      return () => socket.off(`company-${companyId}-chat`, onCompanyChat);
    }
  }, [socket, user.id]);

  useEffect(() => {
    let unreadsCount = 0;
    if (chats.length > 0) {
      for (let chat of chats) {
        for (let chatUser of chat.users) {
          if (chatUser.userId === user.id) {
            unreadsCount += chatUser.unreads;
          }
        }
      }
    }
    setInvisible(unreadsCount === 0);
  }, [chats, user.id]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (whatsApps.length > 0) {
        const offlineWhats = whatsApps.filter((whats) =>
          ["qrcode", "PAIRING", "DISCONNECTED", "TIMEOUT", "OPENING"].includes(whats.status)
        );
        setConnectionWarning(offlineWhats.length > 0);
      }
    }, 2000);
    return () => clearTimeout(delayDebounceFn);
  }, [whatsApps]);

  const fetchChats = async () => {
    try {
      const { data } = await api.get("/chats/", {
        params: { searchParam, pageNumber },
      });
      dispatch({ type: "LOAD_CHATS", payload: data.records });
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white shadow-sm" onClick={drawerClose}>
      <ul className="space-y-1 px-3 py-4">
        {planExpired && (
          <Can
            role={
              (user.profile === "user" && user.showDashboard === "enabled") ||
              user.allowRealTime === "enabled"
                ? "admin"
                : user.profile
            }
            perform="drawer-admin-items:view"
            yes={() => (
              <li>
                <button
                  onClick={() => setOpenDashboardSubmenu((prev) => !prev)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 ${
                    isManagementActive
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                      : "text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <LayoutDashboard className="w-5 h-5" />
                    {!collapsed && (
                      <span className="text-sm font-medium tracking-wide">
                        {i18n.t("mainDrawer.listItems.management")}
                      </span>
                    )}
                  </div>
                  {!collapsed && (
                    <span className="transition-transform duration-300">
                      {openDashboardSubmenu ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  )}
                </button>
                {openDashboardSubmenu && !collapsed && (
                  <ul className="mt-2 ml-6 space-y-1 animate-fade-in">
                    <Can
                      role={
                        user.profile === "user" && user.showDashboard === "enabled"
                          ? "admin"
                          : user.profile
                      }
                      perform="drawer-admin-items:view"
                      yes={() => (
                        <>
                          <ListItemLink
                            to="/"
                            primary="Dashboard"
                            icon={<LayoutDashboard />}
                            collapsed={collapsed}
                          />
                          <ListItemLink
                            to="/reports"
                            primary={i18n.t("mainDrawer.listItems.reports")}
                            icon={<FileText />}
                            collapsed={collapsed}
                          />
                        </>
                      )}
                    />
                    <Can
                      role={
                        user.profile === "user" && user.allowRealTime === "enabled"
                          ? "admin"
                          : user.profile
                      }
                      perform="drawer-admin-items:view"
                      yes={() => (
                        <ListItemLink
                          to="/moments"
                          primary={i18n.t("mainDrawer.listItems.chatsTempoReal")}
                          icon={<Grid />}
                          collapsed={collapsed}
                        />
                      )}
                    />
                  </ul>
                )}
              </li>
            )}
          />
        )}

        {planExpired && (
          <>
            <ListItemLink
              to="/tickets"
              primary={i18n.t("mainDrawer.listItems.tickets")}
              icon={<MessageSquare />}
              collapsed={collapsed}
            />
            <ListItemLink
              to="/quick-messages"
              primary={i18n.t("mainDrawer.listItems.quickMessages")}
              icon={<Zap />}
              collapsed={collapsed}
            />
            {showKanban && (
              <ListItemLink
                to="/kanban"
                primary={i18n.t("mainDrawer.listItems.kanban")}
                icon={<KanbanSquare />}
                collapsed={collapsed}
              />
            )}
            <ListItemLink
              to="/contacts"
              primary={i18n.t("mainDrawer.listItems.contacts")}
              icon={<Contact />}
              collapsed={collapsed}
            />
            {showSchedules && (
              <ListItemLink
                to="/schedules"
                primary={i18n.t("mainDrawer.listItems.schedules")}
                icon={<Clock />}
                collapsed={collapsed}
              />
            )}
            <ListItemLink
              to="/tags"
              primary={i18n.t("mainDrawer.listItems.tags")}
              icon={<Tag />}
              collapsed={collapsed}
            />
            {showInternalChat && (
              <ListItemLink
                to="/chats"
                primary={i18n.t("mainDrawer.listItems.chats")}
                icon={<MessageCircle />}
                collapsed={collapsed}
                showBadge={!invisible}
              />
            )}
            {hasHelps && (
              <ListItemLink
                to="/helps"
                primary={i18n.t("mainDrawer.listItems.helps")}
                icon={<HelpCircle />}
                collapsed={collapsed}
              />
            )}
          </>
        )}

        <Can
          role={
            user.profile === "user" && user.allowConnections === "enabled"
              ? "admin"
              : user.profile
          }
          perform="dashboard:view"
          yes={() => (
            <>
              {!collapsed && <hr className="my-3 border-gray-200" />}
              {!collapsed && (
                <span className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {i18n.t("mainDrawer.listItems.administration")}
                </span>
              )}

              {showCampaigns && planExpired && (
                <li>
                  <button
                    onClick={() => setOpenCampaignSubmenu((prev) => !prev)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 ${
                      isCampaignRouteActive
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                        : "text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5" />
                      {!collapsed && (
                        <span className="text-sm font-medium tracking-wide">
                          {i18n.t("mainDrawer.listItems.campaigns")}
                        </span>
                      )}
                    </div>
                    {!collapsed && (
                      <span className="transition-transform duration-300">
                        {openCampaignSubmenu ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </span>
                    )}
                  </button>
                  {openCampaignSubmenu && !collapsed && (
                    <ul className="mt-2 ml-6 space-y-1 animate-fade-in">
                      <ListItemLink
                        to="/campaigns"
                        primary={i18n.t("campaigns.subMenus.list")}
                        icon={<ListIconLucide />}
                        collapsed={collapsed}
                      />
                      <ListItemLink
                        to="/contact-lists"
                        primary={i18n.t("campaigns.subMenus.listContacts")}
                        icon={<Users />}
                        collapsed={collapsed}
                      />
                      <ListItemLink
                        to="/campaigns-config"
                        primary={i18n.t("campaigns.subMenus.settings")}
                        icon={<Settings />}
                        collapsed={collapsed}
                      />
                    </ul>
                  )}
                </li>
              )}

              {planExpired && (
                <li>
                  <button
                    onClick={() => setOpenFlowSubmenu((prev) => !prev)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 ${
                      isFlowbuilderRouteActive
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                        : "text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <WebhookIcon className="w-5 h-5" />
                      {!collapsed && (
                        <span className="text-sm font-medium tracking-wide">
                          {i18n.t("Flowbuilder")}
                        </span>
                      )}
                    </div>
                    {!collapsed && (
                      <span className="transition-transform duration-300">
                        {openFlowSubmenu ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </span>
                    )}
                  </button>
                  {openFlowSubmenu && !collapsed && (
                    <ul className="mt-2 ml-6 space-y-1 animate-fade-in">
                      <ListItemLink
                        to="/phrase-lists"
                        primary="Fluxo de Campanha"
                        icon={<Calendar />}
                        collapsed={collapsed}
                      />
                      <ListItemLink
                        to="/flowbuilders"
                        primary="Fluxo de conversa"
                        icon={<Shapes />}
                        collapsed={collapsed}
                      />
                    </ul>
                  )}
                </li>
              )}

              {user.super && (
                <ListItemLink
                  to="/announcements"
                  primary={i18n.t("mainDrawer.listItems.annoucements")}
                  icon={<AlertCircle />}
                  collapsed={collapsed}
                />
              )}

              {showExternalApi && planExpired && (
                <ListItemLink
                  to="/messages-api"
                  primary={i18n.t("mainDrawer.listItems.messagesAPI")}
                  icon={<Code />}
                  collapsed={collapsed}
                />
              )}

              {planExpired && (
                <ListItemLink
                  to="/users"
                  primary={i18n.t("mainDrawer.listItems.users")}
                  icon={<Users />}
                  collapsed={collapsed}
                />
              )}

              {planExpired && (
                <ListItemLink
                  to="/queues"
                  primary={i18n.t("mainDrawer.listItems.queues")}
                  icon={<Share2 />}
                  collapsed={collapsed}
                />
              )}

              {showOpenAi && planExpired && (
                <ListItemLink
                  to="/prompts"
                  primary={i18n.t("mainDrawer.listItems.prompts")}
                  icon={<Zap />}
                  collapsed={collapsed}
                />
              )}

              {showIntegrations && planExpired && (
                <ListItemLink
                  to="/queue-integration"
                  primary={i18n.t("mainDrawer.listItems.queueIntegration")}
                  icon={<WebhookIcon />}
                  collapsed={collapsed}
                />
              )}

              {planExpired && (
                <Can
                  role={
                    user.profile === "user" && user.allowConnections === "enabled"
                      ? "admin"
                      : user.profile
                  }
                  perform="drawer-admin-items:view"
                  yes={() => (
                    <ListItemLink
                      to="/connections"
                      primary={i18n.t("mainDrawer.listItems.connections")}
                      icon={<Share2 />}
                      collapsed={collapsed}
                      showBadge={connectionWarning}
                    />
                  )}
                />
              )}

              {user.super && (
                <ListItemLink
                  to="/allConnections"
                  primary={i18n.t("mainDrawer.listItems.allConnections")}
                  icon={<Settings />}
                  collapsed={collapsed}
                />
              )}

              {planExpired && (
                <ListItemLink
                  to="/files"
                  primary={i18n.t("mainDrawer.listItems.files")}
                  icon={<File />}
                  collapsed={collapsed}
                />
              )}

              <ListItemLink
                to="/financeiro"
                primary={i18n.t("mainDrawer.listItems.financeiro")}
                icon={<DollarSign />}
                collapsed={collapsed}
              />

              {planExpired && (
                <ListItemLink
                  to="/settings"
                  primary={i18n.t("mainDrawer.listItems.settings")}
                  icon={<Settings />}
                  collapsed={collapsed}
                />
              )}

              {user.super && (
                <ListItemLink
                  to="/companies"
                  primary={i18n.t("mainDrawer.listItems.companies")}
                  icon={<Building />}
                  collapsed={collapsed}
                />
              )}
            </>
          )}
        />
      </ul>

      {!collapsed && (
        <div className="mt-auto px-4 py-4">
          <span className="text-xs text-gray-400 font-medium tracking-wider">
            {"v.3.6.0"}
          </span>
        </div>
      )}
    </div>
  );
};

export default MainListItems;