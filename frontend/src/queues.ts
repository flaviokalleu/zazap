import * as Sentry from "@sentry/node";
import BullQueue from "bull";
import { MessageData, SendMessage } from "./helpers/SendMessage";
import Whatsapp from "./models/Whatsapp";
import logger from "./utils/logger";
import moment from "moment";
import Schedule from "./models/Schedule";
import { Op, QueryTypes, Sequelize } from "sequelize";
import GetDefaultWhatsApp from "./helpers/GetDefaultWhatsApp";
import Campaign from "./models/Campaign";
import Queues from "./models/Queue";
import ContactList from "./models/ContactList";
import ContactListItem from "./models/ContactListItem";
import { isEmpty, isNil, isArray } from "lodash";
import CampaignSetting from "./models/CampaignSetting";
import CampaignShipping from "./models/CampaignShipping";
import { getWbot } from "./libs/wbot";
import GetWhatsappWbot from "./helpers/GetWhatsappWbot";
import sequelize from "./database";
import { getMessageOptions } from "./services/WbotServices/SendWhatsAppMedia";
import { getIO } from "./libs/socket";
import path from "path";
import User from "./models/User";
import Company from "./models/Company";
import Contact from "./models/Contact";
import Queue from "./models/Queue";
import { ClosedAllOpenTickets } from "./services/WbotServices/wbotClosedTickets";
import Ticket from "./models/Ticket";
import ShowContactService from "./services/ContactServices/ShowContactService";
import UserQueue from "./models/UserQueue";
import ShowTicketService from "./services/TicketServices/ShowTicketService";
import SendWhatsAppMessage from "./services/WbotServices/SendWhatsAppMessage";
import UpdateTicketService from "./services/TicketServices/UpdateTicketService";
import { addSeconds, differenceInSeconds } from "date-fns";
import { GetWhatsapp } from "./helpers/GetWhatsapp";
const CronJob = require('cron').CronJob;
import CompaniesSettings from "./models/CompaniesSettings";
import { verifyMediaMessage, verifyMessage } from "./services/WbotServices/wbotMessageListener";
import FindOrCreateTicketService from "./services/TicketServices/FindOrCreateTicketService";
import CreateLogTicketService from "./services/TicketServices/CreateLogTicketService";
import formatBody from "./helpers/Mustache";
import TicketTag from "./models/TicketTag";
import Tag from "./models/Tag";
import { delay } from "@whiskeysockets/baileys";
import Plan from "./models/Plan";
import CreateOrUpdateContactService from "./services/ContactServices/CreateOrUpdateContactService"; // Importação adicionada

const connection = process.env.REDIS_URI || "";
const limiterMax = process.env.REDIS_OPT_LIMITER_MAX || 1;
const limiterDuration = process.env.REDIS_OPT_LIMITER_DURATION || 3000;

interface ProcessCampaignData {
  id: number;
  delay: number;
}

interface CampaignSettings {
  messageInterval: number;
  longerIntervalAfter: number;
  greaterInterval: number;
  variables: any[];
}

interface PrepareContactData {
  contactId: number;
  campaignId: number;
  delay: number;
  variables: any[];
}

interface DispatchCampaignData {
  campaignId: number;
  campaignShippingId: number;
  contactListItemId: number;
}

export const userMonitor = new BullQueue("UserMonitor", connection);
export const scheduleMonitor = new BullQueue("ScheduleMonitor", connection);
export const sendScheduledMessages = new BullQueue("SendSacheduledMessages", connection);
export const campaignQueue = new BullQueue("CampaignQueue", connection);
export const queueMonitor = new BullQueue("QueueMonitor", connection);

export const messageQueue = new BullQueue("MessageQueue", connection, {
  limiter: {
    max: limiterMax as number,
    duration: limiterDuration as number
  }
});

let isProcessing = false;

async function handleSendMessage(job) {
  try {
    const { data } = job;

    const whatsapp = await Whatsapp.findByPk(data.whatsappId);

    if (whatsapp === null) {
      throw Error("Whatsapp não identificado");
    }

    const messageData: MessageData = data.data;

    await SendMessage(whatsapp, messageData);
  } catch (e: any) {
    Sentry.captureException(e);
    logger.error("MessageQueue -> SendMessage: error", e.message);
    throw e;
  }
}

async function handleVerifySchedules(job) {
  try {
    const { count, rows: schedules } = await Schedule.findAndCountAll({
      where: {
        status: "PENDENTE",
        sentAt: null,
        sendAt: {
          [Op.gte]: moment().format("YYYY-MM-DD HH:mm:ss"),
          [Op.lte]: moment().add("30", "seconds").format("YYYY-MM-DD HH:mm:ss")
        }
      },
      include: [{ model: Contact, as: "contact" }, { model: User, as: "user", attributes: ["name"] }],
      distinct: true,
      subQuery: false
    });

    if (count > 0) {
      schedules.map(async schedule => {
        await schedule.update({
          status: "AGENDADA"
        });
        sendScheduledMessages.add(
          "SendMessage",
          { schedule },
          { delay: 40000 }
        );
        logger.info(`Disparo agendado para: ${schedule.contact.name}`);
      });
    }
  } catch (e: any) {
    Sentry.captureException(e);
    logger.error("SendScheduledMessage -> Verify: error", e.message);
    throw e;
  }
}

async function handleSendScheduledMessage(job) {
  const {
    data: { schedule }
  } = job;
  let scheduleRecord: Schedule | null = null;

  try {
    scheduleRecord = await Schedule.findByPk(schedule.id);
  } catch (e) {
    Sentry.captureException(e);
    logger.info(`Erro ao tentar consultar agendamento: ${schedule.id}`);
  }

  try {
    let whatsapp;

    if (!isNil(schedule.whatsappId)) {
      whatsapp = await Whatsapp.findByPk(schedule.whatsappId);
    }

    if (!whatsapp)
      whatsapp = await GetDefaultWhatsApp(whatsapp.id, schedule.companyId);

    let filePath = null;
    if (schedule.mediaPath) {
      filePath = path.resolve("public", `company${schedule.companyId}`, schedule.mediaPath);
    }

    if (schedule.openTicket === "enabled") {
      let ticket = await Ticket.findOne({
        where: {
          contactId: schedule.contact.id,
          companyId: schedule.companyId,
          whatsappId: whatsapp.id,
          status: ["open", "pending"]
        }
      });

      if (!ticket)
        ticket = await Ticket.create({
          companyId: schedule.companyId,
          contactId: schedule.contactId,
          whatsappId: whatsapp.id,
          queueId: schedule.queueId,
          userId: schedule.ticketUserId,
          status: schedule.statusTicket
        });

      ticket = await ShowTicketService(ticket.id, schedule.companyId);

      let bodyMessage;

      // @ts-ignore: Unreachable code error
      if (schedule.assinar && !isNil(schedule.userId)) {
        bodyMessage = `*${schedule?.user?.name}:*\n${schedule.body.trim()}`
      } else {
        bodyMessage = schedule.body.trim();
      }
      const sentMessage = await SendMessage(whatsapp, {
        number: schedule.contact.number,
        body: `\u200e ${formatBody(bodyMessage, ticket)}`,
        mediaPath: filePath,
        companyId: schedule.companyId
      },
        schedule.contact.isGroup
      );

      if (schedule.mediaPath) {
        await verifyMediaMessage(sentMessage, ticket, ticket.contact, null, true, false, whatsapp);
      } else {
        await verifyMessage(sentMessage, ticket, ticket.contact, null, true, false);
      }
    } else {
      await SendMessage(whatsapp, {
        number: schedule.contact.number,
        body: `\u200e ${schedule.body}`,
        mediaPath: filePath,
        companyId: schedule.companyId
      },
        schedule.contact.isGroup);
    }

    if (schedule.valorIntervalo > 0 && (isNil(schedule.contadorEnvio) || schedule.contadorEnvio < schedule.enviarQuantasVezes)) {
      let unidadeIntervalo;
      switch (schedule.intervalo) {
        case 1:
          unidadeIntervalo = 'days';
          break;
        case 2:
          unidadeIntervalo = 'weeks';
          break;
        case 3:
          unidadeIntervalo = 'months';
          break;
        case 4:
          unidadeIntervalo = 'minuts';
          break;
        default:
          throw new Error('Intervalo inválido');
      }

      function isDiaUtil(date) {
        const dayOfWeek = date.day();
        return dayOfWeek >= 1 && dayOfWeek <= 5; // 1 é segunda-feira, 5 é sexta-feira
      }

      function proximoDiaUtil(date) {
        let proximoDia = date.clone();
        do {
          proximoDia.add(1, 'day');
        } while (!isDiaUtil(proximoDia));
        return proximoDia;
      }

      // Função para encontrar o dia útil anterior
      function diaUtilAnterior(date) {
        let diaAnterior = date.clone();
        do {
          diaAnterior.subtract(1, 'day');
        } while (!isDiaUtil(diaAnterior));
        return diaAnterior;
      }

      const dataExistente = new Date(schedule.sendAt);
      const hora = dataExistente.getHours();
      const fusoHorario = dataExistente.getTimezoneOffset();

      // Realizar a soma da data com base no intervalo e valor do intervalo
      let novaData = new Date(dataExistente); // Clone da data existente para não modificar a original

      console.log(unidadeIntervalo);
      if (unidadeIntervalo !== "minuts") {
        novaData.setDate(novaData.getDate() + schedule.valorIntervalo * (unidadeIntervalo === 'days' ? 1 : unidadeIntervalo === 'weeks' ? 7 : 30));
      } else {
        novaData.setMinutes(novaData.getMinutes() + Number(schedule.valorIntervalo));
        console.log(novaData);
      }

      if (schedule.tipoDias === 5 && !isDiaUtil(novaData)) {
        novaData = diaUtilAnterior(novaData);
      } else if (schedule.tipoDias === 6 && !isDiaUtil(novaData)) {
        novaData = proximoDiaUtil(novaData);
      }

      novaData.setHours(hora);
      novaData.setMinutes(novaData.getMinutes() - fusoHorario);

      await scheduleRecord?.update({
        status: "PENDENTE",
        contadorEnvio: schedule.contadorEnvio + 1,
        sendAt: new Date(novaData.toISOString().slice(0, 19).replace('T', ' ')) // Mantendo o formato de hora
      });
    } else {
      await scheduleRecord?.update({
        sentAt: new Date(moment().format("YYYY-MM-DD HH:mm")),
        status: "ENVIADA"
      });
    }
    logger.info(`Mensagem agendada enviada para: ${schedule.contact.name}`);
    sendScheduledMessages.clean(15000, "completed");
  } catch (e: any) {
    Sentry.captureException(e);
    await scheduleRecord?.update({
      status: "ERRO"
    });
    logger.error("SendScheduledMessage -> SendMessage: error", e.message);
    throw e;
  }
}

async function handleVerifyCampaigns(job) {
  if (isProcessing) {
    // logger.warn('A campaign verification process is already running.');
    return;
  }

  isProcessing = true;
  try {
    await new Promise(r => setTimeout(r, 1500));

    const campaigns: { id: number; scheduledAt: string }[] =
      await sequelize.query(
        `SELECT id, "scheduledAt" FROM "Campaigns" c
        WHERE "scheduledAt" BETWEEN NOW() AND NOW() + INTERVAL '3 hour' AND status = 'PROGRAMADA'`,
        { type: QueryTypes.SELECT }
      );

    if (campaigns.length > 0) {
      logger.info(`Campanhas encontradas: ${campaigns.length}`);

      const promises = campaigns.map(async (campaign) => {
        try {
          await sequelize.query(
            `UPDATE "Campaigns" SET status = 'EM_ANDAMENTO' WHERE id = ${campaign.id}`
          );

          const now = moment();
          const scheduledAt = moment(campaign.scheduledAt);
          const delay = scheduledAt.diff(now, "milliseconds");
          logger.info(
            `Campanha enviada para a fila de processamento: Campanha=${campaign.id}, Delay Inicial=${delay}`
          );

          return campaignQueue.add(
            "ProcessCampaign",
            { id: campaign.id, delay },
            { priority: 3, removeOnComplete: { age: 60 * 60, count: 10 }, removeOnFail: { age: 60 * 60, count: 10 } }
          );

        } catch (err) {
          Sentry.captureException(err);
        }
      });

      await Promise.all(promises);

      logger.info('Todas as campanhas foram processadas e adicionadas à fila.');
    }
  } catch (err) {
    Sentry.captureException(err);
    logger.error(`Error processing campaigns: ${err.message}`);
  } finally {
    isProcessing = false;
  }
}

async function getCampaign(id) {
  return await Campaign.findOne({
    where: { id },
    include: [
      {
        model: ContactList,
        as: "contactList",
        attributes: ["id", "name"],
        include: [
          {
            model: ContactListItem,
            as: "contacts",
            attributes: ["id", "name", "number", "email", "isWhatsappValid", "isGroup"],
            where: { isWhatsappValid: true }
          }
        ]
      },
      {
        model: Whatsapp,
        as: "whatsapp",
        attributes: ["id", "name"]
      },
    ]
  });
}

async function getContact(id) {
  return await ContactListItem.findByPk(id, {
    attributes: ["id", "name", "number", "email", "isGroup"]
  });
}

async function getSettings(campaign): Promise<CampaignSettings> {
  try {
    const settings = await CampaignSetting.findAll({
      where: { companyId: campaign.companyId },
      attributes: ["key", "value"]
    });

    let messageInterval: number = 20;
    let longerIntervalAfter: number = 20;
    let greaterInterval: number = 60;
    let variables: any[] = [];

    settings.forEach(setting => {
      if (setting.key === "messageInterval") {
        messageInterval = JSON.parse(setting.value);
      }
      if (setting.key === "longerIntervalAfter") {
        longerIntervalAfter = JSON.parse(setting.value);
      }
      if (setting.key === "greaterInterval") {
        greaterInterval = JSON.parse(setting.value);
      }
      if (setting.key === "variables") {
        variables = JSON.parse(setting.value);
      }
    });

    return {
      messageInterval,
      longerIntervalAfter,
      greaterInterval,
      variables
    };

  } catch (error) {
    console.log(error);
    throw error; // rejeita a Promise com o erro original
  }
}

export function parseToMilliseconds(seconds) {
  return seconds * 1000;
}

async function sleep(seconds) {
  logger.info(
    `Sleep de ${seconds} segundos iniciado: ${moment().format("HH:mm:ss")}`
  );
  return new Promise(resolve => {
    setTimeout(() => {
      logger.info(
        `Sleep de ${seconds} segundos finalizado: ${moment().format(
          "HH:mm:ss"
        )}`
      );
      resolve(true);
    }, parseToMilliseconds(seconds));
  });
}

function getCampaignValidMessages(campaign) {
  const messages = [];

  if (!isEmpty(campaign.message1) && !isNil(campaign.message1)) {
    messages.push(campaign.message1);
  }

  if (!isEmpty(campaign.message2) && !isNil(campaign.message2)) {
    messages.push(campaign.message2);
  }

  if (!isEmpty(campaign.message3) && !isNil(campaign.message3)) {
    messages.push(campaign.message3);
  }

  if (!isEmpty(campaign.message4) && !isNil(campaign.message4)) {
    messages.push(campaign.message4);
  }

  if (!isEmpty(campaign.message5) && !isNil(campaign.message5)) {
    messages.push(campaign.message5);
  }

  return messages;
}

function getCampaignValidConfirmationMessages(campaign) {
  const messages = [];

  if (
    !isEmpty(campaign.confirmationMessage1) &&
    !isNil(campaign.confirmationMessage1)
  ) {
    messages.push(campaign.confirmationMessage1);
  }

  if (
    !isEmpty(campaign.confirmationMessage2) &&
    !isNil(campaign.confirmationMessage2)
  ) {
    messages.push(campaign.confirmationMessage2);
  }

  if (
    !isEmpty(campaign.confirmationMessage3) &&
    !isNil(campaign.confirmationMessage3)
  ) {
    messages.push(campaign.confirmationMessage3);
  }

  if (
    !isEmpty(campaign.confirmationMessage4) &&
    !isNil(campaign.confirmationMessage4)
  ) {
    messages.push(campaign.confirmationMessage4);
  }

  if (
    !isEmpty(campaign.confirmationMessage5) &&
    !isNil(campaign.confirmationMessage5)
  ) {
    messages.push(campaign.confirmationMessage5);
  }

  return messages;
}

function getProcessedMessage(msg: string, variables: any[], contact: any) {
  let finalMessage = msg;

  if (finalMessage.includes("{nome}")) {
    finalMessage = finalMessage.replace(/{nome}/g, contact.name);
  }

  if (finalMessage.includes("{email}")) {
    finalMessage = finalMessage.replace(/{email}/g, contact.email);
  }

  if (finalMessage.includes("{numero}")) {
    finalMessage = finalMessage.replace(/{numero}/g, contact.number);
  }

  if (variables[0]?.value !== '[]') {
    variables.forEach(variable => {
      if (finalMessage.includes(`{${variable.key}}`)) {
        const regex = new RegExp(`{${variable.key}}`, "g");
        finalMessage = finalMessage.replace(regex, variable.value);
      }
    });
  }

  return finalMessage;
}

const checkerWeek = async () => {
  const sab = moment().day() === 6;
  const dom = moment().day() === 0;

  const sabado = await CampaignSetting.findOne({
    where: { key: "sabado" }
  });

  const domingo = await CampaignSetting.findOne({
    where: { key: "domingo" }
  });

  if (sabado?.value === "false" && sab) {
    messageQueue.pause();
    return true;
  }

  if (domingo?.value === "false" && dom) {
    messageQueue.pause();
    return true;
  }

  messageQueue.resume();
  return false;
};

const checkTime = async () => {
  const startHour = await CampaignSetting.findOne({
    where: {
      key: "startHour"
    }
  });

  const endHour = await CampaignSetting.findOne({
    where: {
      key: "endHour"
    }
  });

  const hour = startHour.value as unknown as number;
  const endHours = endHour.value as unknown as number;

  const timeNow = moment().format("HH:mm") as unknown as number;

  if (timeNow <= endHours && timeNow >= hour) {
    messageQueue.resume();

    return true;
  }

  logger.info(
    `Envio inicia as ${hour} e termina as ${endHours}, hora atual ${timeNow} não está dentro do horário`
  );
  messageQueue.clean(0, "delayed");
  messageQueue.clean(0, "wait");
  messageQueue.clean(0, "active");
  messageQueue.clean(0, "completed");
  messageQueue.clean(0, "failed");
  messageQueue.pause();

  return false;
};

export function randomValue(min, max) {
  return Math.floor(Math.random() * max) + min;
}

async function verifyAndFinalizeCampaign(campaign) {
  const { companyId, contacts } = campaign.contactList;

  const count1 = contacts.length;

  const count2 = await CampaignShipping.count({
    where: {
      campaignId: campaign.id,
      deliveredAt: {
        [Op.ne]: null
      },
      confirmation: campaign.confirmation ? true : { [Op.or]: [null, false] }
    }
  });

  if (count1 === count2) {
    await campaign.update({ status: "FINALIZADA", completedAt: moment() });
  }

  const io = getIO();
  io.of(companyId)
    .emit(`company-${campaign.companyId}-campaign`, {
      action: "update",
      record: campaign
    });
}

async function handleProcessCampaign(job) {
  try {
    const { id }: ProcessCampaignData = job.data;
    const campaign = await getCampaign(id);
    const settings = await getSettings(campaign);
    if (campaign) {
      const { contacts } = campaign.contactList;
      if (isArray(contacts)) {
        const contactData = contacts.map(contact => ({
          contactId: contact.id,
          campaignId: campaign.id,
          variables: settings.variables,
          isGroup: contact.isGroup
        }));

        const longerIntervalAfter = parseToMilliseconds(settings.longerIntervalAfter);
        const greaterInterval = parseToMilliseconds(settings.greaterInterval);
        const messageInterval = settings.messageInterval;

        let baseDelay = campaign.scheduledAt;

        const queuePromises = [];
        for (let i = 0; i < contactData.length; i++) {
          baseDelay = addSeconds(baseDelay, i > longerIntervalAfter ? greaterInterval : messageInterval);

          const { contactId, campaignId, variables } = contactData[i];
          const delay = calculateDelay(i, baseDelay, longerIntervalAfter, greaterInterval, messageInterval);
          const queuePromise = campaignQueue.add(
            "PrepareContact",
            { contactId, campaignId, variables, delay },
            { removeOnComplete: true }
          );
          queuePromises.push(queuePromise);
          logger.info(`Registro enviado pra fila de disparo: Campanha=${campaign.id};Contato=${contacts[i].name};delay=${delay}`);
        }
        await Promise.all(queuePromises);
      }
    }
  } catch (err: any) {
    Sentry.captureException(err);
  }
}

function calculateDelay(index, baseDelay, longerIntervalAfter, greaterInterval, messageInterval) {
  const diffSeconds = differenceInSeconds(baseDelay, new Date());
  if (index > longerIntervalAfter) {
    return diffSeconds * 1000 + greaterInterval;
  } else {
    return diffSeconds * 1000 + messageInterval;
  }
}

async function handlePrepareContact(job) {
  try {
    const { contactId, campaignId, delay, variables }: PrepareContactData =
      job.data;
    const campaign = await getCampaign(campaignId);
    const contact = await getContact(contactId);
    const campaignShipping: any = {};
    campaignShipping.number = contact.number;
    campaignShipping.contactId = contactId;
    campaignShipping.campaignId = campaignId;
    const messages = getCampaignValidMessages(campaign);

    if (messages.length >= 0) {
      const radomIndex = randomValue(0, messages.length);

      const message = getProcessedMessage(
        messages[radomIndex] || "",
        variables,
        contact
      );

      campaignShipping.message = message === null ? "" : `\u200c ${message}`;
    }
    if (campaign.confirmation) {
      const confirmationMessages =
        getCampaignValidConfirmationMessages(campaign);
      if (confirmationMessages.length) {
        const radomIndex = randomValue(0, confirmationMessages.length);
        const message = getProcessedMessage(
          confirmationMessages[radomIndex] || "",
          variables,
          contact
        );
        campaignShipping.confirmationMessage = `\u200c ${message}`;
      }
    }
    const [record, created] = await CampaignShipping.findOrCreate({
      where: {
        campaignId: campaignShipping.campaignId,
        contactId: campaignShipping.contactId
      },
      defaults: campaignShipping
    });

    if (
      !created &&
      record.deliveredAt === null &&
      record.confirmationRequestedAt === null
    ) {
      record.set(campaignShipping);
      await record.save();
    }

    if (
      record.deliveredAt === null &&
      record.confirmationRequestedAt === null
    ) {
      const nextJob = await campaignQueue.add(
        "DispatchCampaign",
        {
          campaignId: campaign.id,
          campaignShippingId: record.id,
          contactListItemId: contactId
        },
        {
          delay
        }
      );

      await record.update({ jobId: String(nextJob.id) });
    }

    await verifyAndFinalizeCampaign(campaign);
  } catch (err: any) {
    Sentry.captureException(err);
    logger.error(`campaignQueue -> PrepareContact -> error: ${err.message}`);
  }
}

async function handleDispatchCampaign(job) {
  try {
    const { data } = job;
    const { campaignShippingId, campaignId }: DispatchCampaignData = data;
    const campaign = await getCampaign(campaignId);
    const wbot = await GetWhatsappWbot(campaign.whatsapp);

    if (!wbot) {
      logger.error(`campaignQueue -> DispatchCampaign -> error: wbot not found`);
      return;
    }

    if (!campaign.whatsapp) {
      logger.error(`campaignQueue -> DispatchCampaign -> error: whatsapp not found`);
      return;
    }

    if (!wbot?.user?.id) {
      logger.error(`campaignQueue -> DispatchCampaign -> error: wbot user not found`);
      return;
    }

    logger.info(
      `Disparo de campanha solicitado: Campanha=${campaignId};Registro=${campaignShippingId}`
    );

    const campaignShipping = await CampaignShipping.findByPk(
      campaignShippingId,
      {
        include: [{ model: ContactListItem, as: "contact" }]
      }
    );

    // Log detalhado dos dados do contato
    logger.info('Dados do contato na campanha:', {
      name: campaignShipping.contact.name,
      number: campaignShipping.contact.number,
      email: campaignShipping.contact.email
    });

    const chatId = campaignShipping.contact.isGroup ? `${campaignShipping.number}@g.us` : `${campaignShipping.number}@s.whatsapp.net`;

    let contact;
    if (campaign.openTicket === "enabled") {
      contact = await CreateOrUpdateContactService({
        // Passa o nome diretamente do contato da lista de contatos
        name: campaignShipping.contact.name, 
        number: campaignShipping.number,
        email: campaignShipping.contact.email,
        isGroup: campaignShipping.contact.isGroup,
        companyId: campaign.companyId,
        whatsappId: campaign.whatsappId,
        profilePicUrl: "",
        channel: "whatsapp",
        remoteJid: chatId,
        wbot
      });

      // Resto do código permanece igual
      const whatsapp = await Whatsapp.findByPk(campaign.whatsappId);

      let ticket = await Ticket.findOne({
        where: {
          contactId: contact.id,
          companyId: campaign.companyId,
          whatsappId: whatsapp.id,
          status: ["open", "pending"]
        }
      });

      if (!ticket) {
        ticket = await Ticket.create({
          companyId: campaign.companyId,
          contactId: contact.id,
          whatsappId: whatsapp.id,
          queueId: campaign?.queueId,
          userId: campaign?.userId,
          status: campaign?.statusTicket
        });
      }

      ticket = await ShowTicketService(ticket.id, campaign.companyId);

      if (whatsapp.status === "CONNECTED") {
        if (campaign.confirmation && campaignShipping.confirmation === null) {
          const confirmationMessage = await wbot.sendMessage(chatId, {
            text: `\u200c ${campaignShipping.confirmationMessage}`
          });

          await verifyMessage(confirmationMessage, ticket, contact, null, true, false);

          await campaignShipping.update({ confirmationRequestedAt: moment() });
        } else {
          if (!campaign.mediaPath) {
            const sentMessage = await wbot.sendMessage(chatId, {
              text: `\u200c ${campaignShipping.message}`
            });

            await verifyMessage(sentMessage, ticket, contact, null, true, false);
          }

          if (campaign.mediaPath) {
            const publicFolder = path.resolve(__dirname, "..", "public");
            const filePath = path.join(publicFolder, `company${campaign.companyId}`, campaign.mediaPath);

            const options = await getMessageOptions(campaign.mediaName, filePath, String(campaign.companyId), `\u200c ${campaignShipping.message}`);
            if (Object.keys(options).length) {
              if (options.mimetype === "audio/mp4") {
                const audioMessage = await wbot.sendMessage(chatId, {
                  text: `\u200c ${campaignShipping.message}`
                });

                await verifyMessage(audioMessage, ticket, contact, null, true, false);
              }
              const sentMessage = await wbot.sendMessage(chatId, { ...options });

              await verifyMediaMessage(sentMessage, ticket, ticket.contact, null, false, true, wbot);
            }
          }
        }
        await campaignShipping.update({ deliveredAt: moment() });
      }
    } else {
      if (campaign.confirmation && campaignShipping.confirmation === null) {
        await wbot.sendMessage(chatId, {
          text: campaignShipping.confirmationMessage
        });
        await campaignShipping.update({ confirmationRequestedAt: moment() });
      } else {
        if (!campaign.mediaPath) {
          await wbot.sendMessage(chatId, {
            text: campaignShipping.message
          });
        }

        if (campaign.mediaPath) {
          const publicFolder = path.resolve(__dirname, "..", "public");
          const filePath = path.join(publicFolder, `company${campaign.companyId}`, campaign.mediaPath);

          const options = await getMessageOptions(campaign.mediaName, filePath, String(campaign.companyId), campaignShipping.message);
          if (Object.keys(options).length) {
            if (options.mimetype === "audio/mp4") {
              await wbot.sendMessage(chatId, {
                text: campaignShipping.message
              });
            }
            await wbot.sendMessage(chatId, { ...options });
          }
        }
      }

      await campaignShipping.update({ deliveredAt: moment() });
    }

    await verifyAndFinalizeCampaign(campaign);

    const io = getIO();
    io.of(String(campaign.companyId))
      .emit(`company-${campaign.companyId}-campaign`, {
        action: "update",
        record: campaign
      });

    logger.info(
      `Campanha enviada para: Campanha=${campaignId};Contato=${campaignShipping.contact.name}`
    );
  } catch (err: any) {
    Sentry.captureException(err);
    logger.error(`Erro ao disparar campanha: ${err.message}`, { stack: err.stack });
  }
}

async function handleLoginStatus(job) {
  const thresholdTime = new Date();
  thresholdTime.setMinutes(thresholdTime.getMinutes() - 5);

  await User.update({ online: false }, {
    where: {
      updatedAt: { [Op.lt]: thresholdTime },
      online: true,
    },
  });
}

async function handleResumeTicketsOutOfHour(job) {
  try {
    const companies = await Company.findAll({
      attributes: ['id', 'name'],
      where: {
        status: true
      },
      include: [
        {
          model: Whatsapp,
          attributes: ["id", "name", "status", "timeSendQueue", "sendIdQueue"],
          where: {
            timeSendQueue: { [Op.gt]: 0 }
          }
        },
      ]
    });

    companies.map(async c => {
      c.whatsapps.map(async w => {
        if (w.status === "CONNECTED") {
          var companyId = c.id;

          const moveQueue = w.timeSendQueue ? w.timeSendQueue : 0;
          const moveQueueId = w.sendIdQueue;
          const moveQueueTime = moveQueue;
          const idQueue = moveQueueId;
          const timeQueue = moveQueueTime;

          if (moveQueue > 0) {
            if (!isNaN(idQueue) && Number.isInteger(idQueue) && !isNaN(timeQueue) && Number.isInteger(timeQueue)) {
              const tempoPassado = moment().subtract(timeQueue, "minutes").utc().format();

              const { count, rows: tickets } = await Ticket.findAndCountAll({
                attributes: ["id"],
                where: {
                  status: "pending",
                  queueId: null,
                  companyId: companyId,
                  whatsappId: w.id,
                  updatedAt: {
                    [Op.lt]: tempoPassado
                  },
                },
                include: [
                  {
                    model: Contact,
                    as: "contact",
                    attributes: ["id", "name", "number", "email", "profilePicUrl", "acceptAudioMessage", "active", "disableBot", "urlPicture", "lgpdAcceptedAt", "companyId"],
                    include: ["extraInfo", "tags"]
                  },
                  {
                    model: Queue,
                    as: "queue",
                    attributes: ["id", "name", "color"]
                  },
                  {
                    model: Whatsapp,
                    as: "whatsapp",
                    attributes: ["id", "name", "expiresTicket", "groupAsTicket"]
                  }
                ]
              });

              if (count > 0) {
                tickets.map(async ticket => {
                  await ticket.update({
                    queueId: idQueue
                  });

                  await ticket.reload();

                  const io = getIO();
                  io.of(String(companyId))
                    .emit(`company-${companyId}-ticket`, {
                      action: "update",
                      ticket,
                      ticketId: ticket.id
                    });

                  logger.info(`Atendimento Perdido: ${ticket.id} - Empresa: ${companyId}`);
                });
              }
            } else {
              logger.info(`Condição não respeitada - Empresa: ${companyId}`);
            }
          }
        }
      });
    });
  } catch (e: any) {
    Sentry.captureException(e);
    logger.error("SearchForQueue -> VerifyQueue: error", e.message);
    throw e;
  }
}

async function handleVerifyQueue(job) {
  try {
    const companies = await Company.findAll({
      attributes: ['id', 'name'],
      where: {
        status: true
      },
      include: [
        {
          model: Whatsapp,
          attributes: ["id", "name", "status", "timeSendQueue", "sendIdQueue"]
        },
      ]
    });

    companies.map(async c => {
      c.whatsapps.map(async w => {
        if (w.status === "CONNECTED") {
          var companyId = c.id;

          const moveQueue = w.timeSendQueue ? w.timeSendQueue : 0;
          const moveQueueId = w.sendIdQueue;
          const moveQueueTime = moveQueue;
          const idQueue = moveQueueId;
          const timeQueue = moveQueueTime;

          if (moveQueue > 0) {
            if (!isNaN(idQueue) && Number.isInteger(idQueue) && !isNaN(timeQueue) && Number.isInteger(timeQueue)) {
              const tempoPassado = moment().subtract(timeQueue, "minutes").utc().format();

              const { count, rows: tickets } = await Ticket.findAndCountAll({
                attributes: ["id"],
                where: {
                  status: "pending",
                  queueId: null,
                  companyId: companyId,
                  whatsappId: w.id,
                  updatedAt: {
                    [Op.lt]: tempoPassado
                  },
                },
                include: [
                  {
                    model: Contact,
                    as: "contact",
                    attributes: ["id", "name", "number", "email", "profilePicUrl", "acceptAudioMessage", "active", "disableBot", "urlPicture", "lgpdAcceptedAt", "companyId"],
                    include: ["extraInfo", "tags"]
                  },
                  {
                    model: Queue,
                    as: "queue",
                    attributes: ["id", "name", "color"]
                  },
                  {
                    model: Whatsapp,
                    as: "whatsapp",
                    attributes: ["id", "name", "expiresTicket", "groupAsTicket"]
                  }
                ]
              });

              if (count > 0) {
                tickets.map(async ticket => {
                  await ticket.update({
                    queueId: idQueue
                  });

                  await CreateLogTicketService({
                    userId: null,
                    queueId: idQueue,
                    ticketId: ticket.id,
                    type: "redirect"
                  });

                  await ticket.reload();

                  const io = getIO();
                  io.of(String(companyId))
                    .emit(`company-${companyId}-ticket`, {
                      action: "update",
                      ticket,
                      ticketId: ticket.id
                    });

                  logger.info(`Atendimento Perdido: ${ticket.id} - Empresa: ${companyId}`);
                });
              }
            } else {
              logger.info(`Condição não respeitada - Empresa: ${companyId}`);
            }
          }
        }
      });
    });
  } catch (e: any) {
    Sentry.captureException(e);
    logger.error("SearchForQueue -> VerifyQueue: error", e.message);
    throw e;
  }
}

async function handleRandomUser() {
  const jobR = new CronJob('0 */2 * * * *', async () => {
    try {
      const companies = await Company.findAll({
        attributes: ['id', 'name'],
        where: {
          status: true
        },
        include: [
          {
            model: Queues,
            attributes: ["id", "name", "ativarRoteador", "tempoRoteador"],
            where: {
              ativarRoteador: true,
              tempoRoteador: {
                [Op.ne]: 0
              }
            }
          },
        ]
      });

      if (companies) {
        companies.map(async c => {
          c.queues.map(async q => {
            const { count, rows: tickets } = await Ticket.findAndCountAll({
              where: {
                companyId: c.id,
                status: "pending",
                queueId: q.id,
              },
            });

            const getRandomUserId = (userIds) => {
              const randomIndex = Math.floor(Math.random() * userIds.length);
              return userIds[randomIndex];
            };

            const findUserById = async (userId, companyId) => {
              try {
                const user = await User.findOne({
                  where: {
                    id: userId,
                    companyId
                  },
                });

                if (user && user?.profile === "user") {
                  if (user.online === true) {
                    return user.id;
                  } else {
                    return 0;
                  }
                } else {
                  return 0;
                }
              } catch (errorV) {
                Sentry.captureException(errorV);
                logger.error("SearchForUsersRandom -> VerifyUsersRandom: error", errorV.message);
                throw errorV;
              }
            };

            if (count > 0) {
              for (const ticket of tickets) {
                const { queueId, userId } = ticket;
                const tempoRoteador = q.tempoRoteador;
                const userQueues = await UserQueue.findAll({
                  where: {
                    queueId: queueId,
                  },
                });

                const contact = await ShowContactService(ticket.contactId, ticket.companyId);

                const userIds = userQueues.map((userQueue) => userQueue.userId);

                const tempoPassadoB = moment().subtract(tempoRoteador, "minutes").utc().toDate();
                const updatedAtV = new Date(ticket.updatedAt);

                let settings = await CompaniesSettings.findOne({
                  where: {
                    companyId: ticket.companyId
                  }
                });
                const sendGreetingMessageOneQueues = settings.sendGreetingMessageOneQueues === "enabled" || false;

                if (!userId) {
                  const randomUserId = getRandomUserId(userIds);

                  if (randomUserId !== undefined && await findUserById(randomUserId, ticket.companyId) > 0) {
                    if (sendGreetingMessageOneQueues) {
                      const ticketToSend = await ShowTicketService(ticket.id, ticket.companyId);
                      await SendWhatsAppMessage({ body: `\u200e *Assistente Virtual*:\nAguarde enquanto localizamos um atendente... Você será atendido em breve!`, ticket: ticketToSend });
                    }

                    await UpdateTicketService({
                      ticketData: { status: "pending", userId: randomUserId },
                      ticketId: ticket.id,
                      companyId: ticket.companyId,
                    });

                    logger.info(`Ticket ID ${ticket.id} atualizado para UserId ${randomUserId} - ${ticket.updatedAt}`);
                  }
                } else if (userIds.includes(userId)) {
                  if (tempoPassadoB > updatedAtV) {
                    const availableUserIds = userIds.filter((id) => id !== userId);

                    if (availableUserIds.length > 0) {
                      const randomUserId = getRandomUserId(availableUserIds);

                      if (randomUserId !== undefined && await findUserById(randomUserId, ticket.companyId) > 0) {
                        if (sendGreetingMessageOneQueues) {
                          const ticketToSend = await ShowTicketService(ticket.id, ticket.companyId);
                          await SendWhatsAppMessage({ body: "*Assistente Virtual*:\nAguarde enquanto localizamos um atendente... Você será atendido em breve!", ticket: ticketToSend });
                        }

                        await UpdateTicketService({
                          ticketData: { status: "pending", userId: randomUserId },
                          ticketId: ticket.id,
                          companyId: ticket.companyId,
                        });

                        logger.info(`Ticket ID ${ticket.id} atualizado para UserId ${randomUserId} - ${ticket.updatedAt}`);
                      }
                    }
                  }
                }
              }
            }
          });
        });
      }
    } catch (e) {
      Sentry.captureException(e);
      logger.error("SearchForUsersRandom -> VerifyUsersRandom: error", e.message);
      throw e;
    }
  });

  jobR.start();
}

async function handleProcessLanes() {
  const job = new CronJob('*/1 * * * *', async () => {
    const companies = await Company.findAll({
      include: [
        {
          model: Plan,
          as: "plan",
          attributes: ["id", "name", "useKanban"],
          where: {
            useKanban: true
          }
        },
      ]
    });
    companies.map(async c => {
      try {
        const companyId = c.id;

        const ticketTags = await TicketTag.findAll({
          include: [{
            model: Ticket,
            as: "ticket",
            where: {
              status: "open",
              fromMe: true,
              companyId
            },
            attributes: ["id", "contactId", "updatedAt", "whatsappId"]
          }, {
            model: Tag,
            as: "tag",
            attributes: ["id", "timeLane", "nextLaneId", "greetingMessageLane"],
            where: {
              companyId
            }
          }]
        });

        if (ticketTags.length > 0) {
          ticketTags.map(async t => {
            if (!isNil(t?.tag.nextLaneId) && t?.tag.nextLaneId > 0 && t?.tag.timeLane > 0) {
              const nextTag = await Tag.findByPk(t?.tag.nextLaneId);

              const dataLimite = new Date();
              dataLimite.setHours(dataLimite.getHours() - Number(t.tag.timeLane));
              const dataUltimaInteracaoChamado = new Date(t.ticket.updatedAt);

              if (dataUltimaInteracaoChamado < dataLimite) {
                await TicketTag.destroy({ where: { ticketId: t.ticketId, tagId: t.tagId } });
                await TicketTag.create({ ticketId: t.ticketId, tagId: nextTag.id });

                const whatsapp = await Whatsapp.findByPk(t.ticket.whatsappId);

                if (!isNil(nextTag.greetingMessageLane) && nextTag.greetingMessageLane !== "") {
                  const bodyMessage = nextTag.greetingMessageLane;

                  const contact = await Contact.findByPk(t.ticket.contactId);
                  const ticketUpdate = await ShowTicketService(t.ticketId, companyId);

                  await SendMessage(whatsapp, {
                    number: contact.number,
                    body: `${formatBody(bodyMessage, ticketUpdate)}`,
                    mediaPath: null,
                    companyId: companyId
                  },
                    contact.isGroup
                  );
                }
              }
            }
          });
        }
      } catch (e: any) {
        Sentry.captureException(e);
        logger.error("Process Lanes -> Verify: error", e.message);
        throw e;
      }
    });
  });
  job.start();
}

async function handleCloseTicketsAutomatic() {
  const job = new CronJob('*/1 * * * *', async () => {
    const companies = await Company.findAll({
      where: {
        status: true
      }
    });
    companies.map(async c => {
      try {
        const companyId = c.id;
        await ClosedAllOpenTickets(companyId);
      } catch (e: any) {
        Sentry.captureException(e);
        logger.error("ClosedAllOpenTickets -> Verify: error", e.message);
        throw e;
      }
    });
  });
  job.start();
}

async function handleWhatsapp() {
  const jobW = new CronJob('* 15 3 * * *', async () => {
    GetWhatsapp();
    jobW.stop();
  }, null, false, 'America/Sao_Paulo');
  jobW.start();
}

async function handleInvoiceCreate() {
  logger.info("GERANDO RECEITA...");
  const job = new CronJob('*/30 * * * * *', async () => {
    const companies = await Company.findAll();
    companies.map(async c => {
      const status = c.status;
      const dueDate = c.dueDate;
      const date = moment(dueDate).format();
      const timestamp = moment().format();
      const hoje = moment().format("DD/MM/yyyy");
      const vencimento = moment(dueDate).format("DD/MM/yyyy");
      const diff = moment(vencimento, "DD/MM/yyyy").diff(moment(hoje, "DD/MM/yyyy"));
      const dias = moment.duration(diff).asDays();

      if (status === true) {
        if (dias <= -3) {
          logger.info(`EMPRESA: ${c.id} está VENCIDA A MAIS DE 3 DIAS... INATIVANDO... ${dias}`);
          c.status = false;
          await c.save();
          logger.info(`EMPRESA: ${c.id} foi INATIVADA.`);
          logger.info(`EMPRESA: ${c.id} Desativando conexões com o WhatsApp...`);

          try {
            const whatsapps = await Whatsapp.findAll({
              where: {
                companyId: c.id,
              },
              attributes: ['id', 'status', 'session'],
            });
            for (const whatsapp of whatsapps) {
              if (whatsapp.session) {
                await whatsapp.update({ status: "DISCONNECTED", session: "" });
                const wbot = getWbot(whatsapp.id);
                await wbot.logout();
                logger.info(`EMPRESA: ${c.id} teve o WhatsApp ${whatsapp.id} desconectado...`);
              }
            }
          } catch (error) {
            console.error('Erro ao buscar os IDs de WhatsApp:', error);
            throw error;
          }
        } else {
          const plan = await Plan.findByPk(c.planId);

          const sql = `SELECT * FROM "Invoices" WHERE "companyId" = ${c.id} AND "status" = 'open';`;
          const openInvoices = await sequelize.query(sql, { type: QueryTypes.SELECT }) as { id: number, dueDate: Date }[];
          const existingInvoice = openInvoices.find(invoice => moment(invoice.dueDate).format("DD/MM/yyyy") === vencimento);

          if (existingInvoice) {
            // Due date already exists, no action needed
          } else if (openInvoices.length > 0) {
            const updateSql = `UPDATE "Invoices" SET "dueDate" = '${date}' WHERE "id" = ${openInvoices[0].id};`;
            await sequelize.query(updateSql, { type: QueryTypes.UPDATE });

            logger.info(`Fatura Atualizada ID: ${openInvoices[0].id}`);
          } else {
            const valuePlan = plan.amount.replace(",", ".");
            const sql = `INSERT INTO "Invoices" ("companyId", "dueDate", detail, status, value, users, connections, queues, "updatedAt", "createdAt")
            VALUES (${c.id}, '${date}', '${plan.name}', 'open', ${valuePlan}, ${plan.users}, ${plan.connections}, ${plan.queues}, '${timestamp}', '${timestamp}');`;
            const invoiceInsert = await sequelize.query(sql, { type: QueryTypes.INSERT });

            logger.info(`Fatura Gerada para o cliente: ${c.id}`);
          }
        }
      } else {
        // logger.info(`EMPRESA: ${c.id} está INATIVA`);
      }
    });
  });
  job.start();
}

handleInvoiceCreate();
handleWhatsapp();
handleProcessLanes();
handleCloseTicketsAutomatic();
handleRandomUser();

export async function startQueueProcess() {
  logger.info("Iniciando processamento de filas");

  messageQueue.process("SendMessage", handleSendMessage);

  scheduleMonitor.process("Verify", handleVerifySchedules);

  sendScheduledMessages.process("SendMessage", handleSendScheduledMessage);

  campaignQueue.process("VerifyCampaignsDaatabase", handleVerifyCampaigns);

  campaignQueue.process("ProcessCampaign", handleProcessCampaign);

  campaignQueue.process("PrepareContact", handlePrepareContact);

  campaignQueue.process("DispatchCampaign", handleDispatchCampaign);

  userMonitor.process("VerifyLoginStatus", handleLoginStatus);

  queueMonitor.process("VerifyQueueStatus", handleVerifyQueue);

  scheduleMonitor.add(
    "Verify",
    {},
    {
      repeat: { cron: "0 * * * * *", key: "verify" },
      removeOnComplete: true
    }
  );

  campaignQueue.add(
    "VerifyCampaignsDaatabase",
    {},
    {
      repeat: { cron: "*/20 * * * * *", key: "verify-campaing" },
      removeOnComplete: true
    }
  );

  userMonitor.add(
    "VerifyLoginStatus",
    {},
    {
      repeat: { cron: "* * * * *", key: "verify-login" },
      removeOnComplete: true
    }
  );

  queueMonitor.add(
    "VerifyQueueStatus",
    {},
    {
      repeat: { cron: "0 * * * * *", key: "verify-queue" },
      removeOnComplete: true
    }
  );
}