import React, { useState, useEffect, useReducer, useContext } from "react";
import { 
  CreditCard, Receipt, CheckCircle, AlertCircle, Hourglass, 
  Users, Smartphone, Layers, DollarSign, Calendar, Info 
} from "lucide-react";
import moment from "moment";

// Components
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import SubscriptionModal from "../../components/SubscriptionModal";
import TableRowSkeleton from "../../components/TableRowSkeleton";

// Services e Contexts
import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";
import toastError from "../../errors/toastError";

const reducer = (state, action) => {
  switch (action.type) {
    case "LOAD_INVOICES":
      const invoices = action.payload;
      const newInvoices = invoices.filter(i => !state.some(existing => existing.id === i.id));
      return [...state, ...newInvoices];
    case "UPDATE_USERS":
      const user = action.payload;
      const userIndex = state.findIndex(u => u.id === user.id);
      if (userIndex !== -1) {
        state[userIndex] = user;
        return [...state];
      }
      return [user, ...state];
    case "DELETE_USER":
      return state.filter(u => u.id !== action.payload);
    case "RESET":
      return [];
    default:
      return state;
  }
};

const Invoices = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searchParam] = useState("");
  const [invoices, dispatch] = useReducer(reducer, []);
  const [storagePlans, setStoragePlans] = useState([]);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [companyPlan, setCompanyPlan] = useState(null);

  // Handlers
  const handleOpenContactModal = (invoice) => {
    const invoiceWithPlanValue = {
      ...invoice,
      value: companyPlan?.amount ? parseFloat(companyPlan.amount) : invoice.value
    };
    setStoragePlans(invoiceWithPlanValue);
    setSelectedContactId(null);
    setContactModalOpen(true);
  };

  const handleCloseContactModal = () => {
    setSelectedContactId(null);
    setContactModalOpen(false);
  };

  // Effects
  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    const fetchCompanyPlan = async () => {
      try {
        if (user?.companyId) {
          const companyResponse = await api.get(`/companies/${user.companyId}`);
          const company = companyResponse.data;
          if (company?.planId) {
            const planResponse = await api.get(`/plans/${company.planId}`);
            setCompanyPlan(planResponse.data);
          }
        }
      } catch (err) {
        toastError(err);
      }
    };
    fetchCompanyPlan();
  }, [user]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchInvoices = async () => {
        try {
          const { data } = await api.get("/invoices/all", {
            params: { searchParam, pageNumber },
          });
          dispatch({ type: "LOAD_INVOICES", payload: data });
          setHasMore(data.hasMore);
        } catch (err) {
          toastError(err);
        } finally {
          setLoading(false);
        }
      };
      fetchInvoices();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber]);

  const loadMore = () => setPageNumber(prev => prev + 1);

  const handleScroll = (e) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) loadMore();
  };

  // Helpers
  const getInvoiceStatus = (record) => {
    const hoje = moment().format("DD/MM/yyyy");
    const vencimento = moment(record.dueDate).format("DD/MM/yyyy");
    const diff = moment(vencimento, "DD/MM/yyyy").diff(moment(hoje, "DD/MM/yyyy"));
    const dias = moment.duration(diff).asDays();
    
    if (record.status === "paid") {
      return { text: "Pago", color: "bg-green-500", icon: <CheckCircle className="w-4 h-4" /> };
    }
    if (dias < 0) {
      return { text: "Vencido", color: "bg-red-500", icon: <AlertCircle className="w-4 h-4" /> };
    }
    return { text: "Em Aberto", color: "bg-yellow-500", icon: <Hourglass className="w-4 h-4" /> };
  };

  const renderDaysLeft = (record) => {
    const hoje = moment().format("DD/MM/yyyy");
    const vencimento = moment(record.dueDate).format("DD/MM/yyyy");
    const diff = moment(vencimento, "DD/MM/yyyy").diff(moment(hoje, "DD/MM/yyyy"));
    const dias = moment.duration(diff).asDays();
    
    if (record.status === "paid") return null;
    if (dias < 0) return `Vencido há ${Math.abs(Math.floor(dias))} dias`;
    if (dias === 0) return "Vence hoje";
    return `Vence em ${Math.floor(dias)} dias`;
  };

  const rowStyle = (record) => {
    const hoje = moment().format("DD/MM/yyyy");
    const vencimento = moment(record.dueDate).format("DD/MM/yyyy");
    const diff = moment(vencimento, "DD/MM/yyyy").diff(moment(hoje, "DD/MM/yyyy"));
    const dias = moment.duration(diff).asDays();
    return dias < 0 && record.status !== "paid" ? "bg-red-50" : "";
  };

  // Mobile Cards
  const renderMobileCards = () => {
    if (loading && !invoices.length) {
      return <div className="flex justify-center my-4"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>;
    }

    return (
      <div className="grid grid-cols-1 gap-4 md:hidden p-4">
        {invoices.map((invoice) => {
          const statusInfo = getInvoiceStatus(invoice);
          return (
            <div key={invoice.id} className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-500 p-2 rounded-full">
                    <Receipt className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{invoice.detail}</h3>
                    <p className="text-xs text-gray-500">ID: {invoice.id}</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className={`${statusInfo.color} text-white px-2 py-1 rounded-full text-xs flex items-center gap-1`}>
                  {statusInfo.icon} {statusInfo.text}
                </span>
                <span className="text-xs text-gray-600">{renderDaysLeft(invoice)}</span>
              </div>
              <div className="border-t pt-3 grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">{companyPlan?.users} usuários</span>
                </div>
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">{companyPlan?.connections} conexões</span>
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">{companyPlan?.queues} filas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">{moment(invoice.dueDate).format("DD/MM/YYYY")}</span>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center gap-2 text-blue-600 font-bold">
                  <DollarSign className="w-5 h-5" />
                  {companyPlan?.amount 
                    ? parseFloat(companyPlan.amount).toLocaleString('pt-br', { style: 'currency', currency: 'BRL' })
                    : invoice.value.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' })}
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                {statusInfo.text !== "Pago" ? (
                  <button
                    onClick={() => handleOpenContactModal(invoice)}
                    className="bg-gradient-to-r from-blue-500 to-blue-400 text-white px-4 py-2 rounded-full flex items-center gap-2 hover:from-blue-600 hover:to-blue-500 transition-all"
                  >
                    <CreditCard className="w-4 h-4" /> Pagar Agora
                  </button>
                ) : (
                  <button className="border border-green-500 text-green-500 px-4 py-2 rounded-full flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Pago
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <MainContainer className="bg-gray-100 min-h-screen p-4">
      <SubscriptionModal
        open={contactModalOpen}
        onClose={handleCloseContactModal}
        Invoice={storagePlans}
        contactId={selectedContactId}
      />
      
      <MainHeader className="mb-6">
        <div className="flex items-center gap-2">
          <Receipt className="w-8 h-8 text-blue-500" />
          <Title>Faturas</Title>
          <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">{invoices.length}</span>
        </div>
      </MainHeader>

      <div 
        className="flex-1 bg-white rounded-xl shadow-md overflow-hidden max-h-[calc(100vh-150px)]"
        onScroll={handleScroll}
      >
        {/* Mobile View */}
        {renderMobileCards()}

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b sticky top-0">
              <tr>
                <th className="p-4 text-left text-gray-600 font-semibold">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4" /> Detalhes
                  </div>
                </th>
                <th className="p-4 text-center text-gray-600 font-semibold">
                  <div className="flex items-center justify-center gap-2">
                    <Users className="w-4 h-4" /> Usuários
                  </div>
                </th>
                <th className="p-4 text-center text-gray-600 font-semibold">
                  <div className="flex items-center justify-center gap-2">
                    <Smartphone className="w-4 h-4" /> Conexões
                  </div>
                </th>
                <th className="p-4 text-center text-gray-600 font-semibold">
                  <div className="flex items-center justify-center gap-2">
                    <Layers className="w-4 h-4" /> Filas
                  </div>
                </th>
                <th className="p-4 text-center text-gray-600 font-semibold">
                  <div className="flex items-center justify-center gap-2">
                    <DollarSign className="w-4 h-4" /> Valor
                  </div>
                </th>
                <th className="p-4 text-center text-gray-600 font-semibold">
                  <div className="flex items-center justify-center gap-2">
                    <Calendar className="w-4 h-4" /> Vencimento
                  </div>
                </th>
                <th className="p-4 text-center text-gray-600 font-semibold">Status</th>
                <th className="p-4 text-center text-gray-600 font-semibold">Ação</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => {
                const statusInfo = getInvoiceStatus(invoice);
                return (
                  <tr key={invoice.id} className={`hover:bg-gray-50 transition-colors border-b ${rowStyle(invoice)}`}>
                    <td className="p-4 text-gray-800">{invoice.detail}</td>
                    <td className="p-4 text-center text-gray-600">{companyPlan?.users}</td>
                    <td className="p-4 text-center text-gray-600">{companyPlan?.connections}</td>
                    <td className="p-4 text-center text-gray-600">{companyPlan?.queues}</td>
                    <td className="p-4 text-center text-gray-600 font-bold">
                      {companyPlan?.amount 
                        ? parseFloat(companyPlan.amount).toLocaleString('pt-br', { style: 'currency', currency: 'BRL' })
                        : invoice.value.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="p-4 text-center text-gray-600">
                      <div className="flex flex-col items-center">
                        <span>{moment(invoice.dueDate).format("DD/MM/YYYY")}</span>
                        <span className="text-xs text-gray-500">{renderDaysLeft(invoice)}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`${statusInfo.color} text-white px-2 py-1 rounded-full text-xs flex items-center justify-center gap-1`}>
                        {statusInfo.icon} {statusInfo.text}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {statusInfo.text !== "Pago" ? (
                        <button
                          onClick={() => handleOpenContactModal(invoice)}
                          className="bg-gradient-to-r from-blue-500 to-blue-400 text-white px-3 py-1 rounded-full flex items-center gap-1 hover:from-blue-600 hover:to-blue-500 transition-all"
                        >
                          <CreditCard className="w-4 h-4" /> Pagar
                        </button>
                      ) : (
                        <button className="border border-green-500 text-green-500 px-3 py-1 rounded-full flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" /> Pago
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {loading && <TableRowSkeleton columns={8} />}
            </tbody>
          </table>
        </div>
      </div>
    </MainContainer>
  );
};

export default Invoices;