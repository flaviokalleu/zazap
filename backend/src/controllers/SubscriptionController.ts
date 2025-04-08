import { Request, Response } from "express";
import express from "express";
import * as Yup from "yup";
import * as dotenv from 'dotenv';
import mercadopago from 'mercadopago'; // Remover se não estiver sendo usado
import AppError from "../errors/AppError";
import Company from "../models/Company";
import Invoices from "../models/Invoices";
import Setting from "../models/Setting";
import { getIO } from "../libs/socket";
import axios from 'axios';

dotenv.config();

// Configure Mercado Pago
const accessToken = process.env.MP_ACCESS_TOKEN;

// Endpoint para criar uma nova assinatura
export const createSubscription = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;

  // Schema de validação
  const schema = Yup.object().shape({
    price: Yup.string().required(),
    users: Yup.string().required(),
    connections: Yup.string().required()
  });

  // Validação do payload
  if (!(await schema.isValid(req.body))) {
    throw new AppError("Validation fails", 400);
  }

  const { price, invoiceId } = req.body;
  const unitPrice = parseFloat(price);

  // Dados para criar a preferência de pagamento
  const data = {
    back_urls: {
      success: `${process.env.FRONTEND_URL}/financeiro`,
      failure: `${process.env.FRONTEND_URL}/financeiro`
    },
    auto_return: "approved",
    items: [
      {
        title: `#Fatura:${invoiceId}`,
        quantity: 1,
        currency_id: 'BRL',
        unit_price: unitPrice
      }
    ]
  };

  try {
    // Chamada para criar a preferência no Mercado Pago
    const response = await axios.post('https://api.mercadopago.com/checkout/preferences', data, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}` // Usando accessToken aqui
      }
    });
    
    const urlMcPg = response.data.init_point;

    return res.json({ urlMcPg });
  } catch (error) {
    console.error(error);
    throw new AppError("Problema encontrado, entre em contato com o suporte!", 400);
  }
};

// Webhook do Mercado Pago
export const webhook = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { evento, data } = req.body;

  // Resposta para testes de webhook
  if (evento === "teste_webhook") {
    return res.json({ ok: true });
  }

  if (data && data.id) {
    try {
      const paymentResponse = await axios.get(`https://api.mercadopago.com/v1/payments/${data.id}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}` // Usando accessToken aqui
        }
      });

      const paymentDetails = paymentResponse.data;

      // Processar pagamento aprovado
      if (paymentDetails.status === "approved") {
        const invoiceID = paymentDetails.additional_info.items[0].title.replace("#Fatura:", "");
        const invoice = await Invoices.findByPk(invoiceID);

        if (invoice) {
          const companyId = invoice.companyId;
          const company = await Company.findByPk(companyId);

          if (company) {
            const expiresAt = new Date(company.dueDate);
            expiresAt.setDate(expiresAt.getDate() + 30);
            const newDueDate = expiresAt.toISOString().split("T")[0];

            await company.update({ dueDate: newDueDate });
            await invoice.update({ status: "paid" });

            const io = getIO();
            const companyUpdate = await Company.findOne({ where: { id: companyId } });

            io.emit(`company-${companyId}-payment`, {
              action: paymentDetails.status,
              company: companyUpdate
            });
          }
        }
      }
    } catch (error) {
      console.error(error);
      throw new AppError("Erro ao processar pagamento.", 400);
    }
  }

  return res.json({ ok: true });
};
export function createWebhook(arg0: string, createWebhook: any) {
    throw new Error("Function not implemented.");
}

