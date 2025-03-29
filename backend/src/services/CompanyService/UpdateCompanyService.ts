import AppError from "../../errors/AppError";
import Company from "../../models/Company";
import Setting from "../../models/Setting";
import User from "../../models/User";
import Invoices from "../../models/Invoices";
import Plan from "../../models/Plan";

interface CompanyData {
  name: string;
  id?: number | string;
  phone?: string;
  email?: string;
  status?: boolean;
  planId?: number;
  campaignsEnabled?: boolean;
  dueDate?: string;
  recurrence?: string;
  document?: string;
  paymentMethod?: string;
  password?: string;
}

const UpdateCompanyService = async (
  companyData: CompanyData
): Promise<Company> => {

  const company = await Company.findByPk(companyData.id);
  const {
    name,
    phone,
    email,
    status,
    planId,
    campaignsEnabled,
    dueDate,
    recurrence,
    document,
    paymentMethod,
    password
  } = companyData;

  if (!company) {
    throw new AppError("ERR_NO_COMPANY_FOUND", 404);
  }

  const openInvoices = await Invoices.findAll({
    where: {
      status: "open",
      companyId: company.id,
    },
 });
 if (openInvoices.length > 1) {
   for (const invoice of openInvoices.slice(1)) {
     await invoice.update({ status: "cancelled" });
   }
 }
 const plan = await Plan.findByPk(planId);
 
 if (!plan) {
   throw new Error("Plano Não Encontrado.");
 }
 // 5. Atualizar a única invoice com status "open" existente, baseada no companyId.
 const openInvoice = openInvoices[0];
 const valuePlan = plan.amount.replace(",", ".");
 if (openInvoice) {
   await openInvoice.update({
     value: valuePlan,
     detail: plan.name,
     users: plan.users,
     connections: plan.connections,
     queues: plan.queues,
     dueDate: dueDate,
   });
 
 } else {
   throw new Error("Nenhuma fatura em aberto para este cliente!");
 }

  const existUser = await User.findOne({
    where: {
      companyId: company.id,
      email: email
    }
  });

  if (existUser && existUser.email !== company.email) {
    throw new AppError("Usuário já existe com esse e-mail!", 404)
  }

  const user = await User.findOne({
    where: {
      companyId: company.id,
      email: company.email
    }
  });

  if (!user) {
    throw new AppError("ERR_NO_USER_FOUND", 404)
  }
  
  await user.update({ email, password });


  await company.update({
    name,
    phone,
    email,
    status,
    planId,
    dueDate,
    recurrence,
    document,
    paymentMethod
  });

  if (companyData.campaignsEnabled !== undefined) {
    const [setting, created] = await Setting.findOrCreate({
      where: {
        companyId: company.id,
        key: "campaignsEnabled"
      },
      defaults: {
        companyId: company.id,
        key: "campaignsEnabled",
        value: `${campaignsEnabled}`
      }
    });
    if (!created) {
      await setting.update({ value: `${campaignsEnabled}` });
    }
  }

  return company;
};

export default UpdateCompanyService;
