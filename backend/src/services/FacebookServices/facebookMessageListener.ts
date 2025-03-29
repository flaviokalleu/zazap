import { writeFileSync } from "fs";
import fs from "fs";
import axios from "axios";
import moment from "moment";
import { join } from "path";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import CreateMessageService from "../MessageServices/CreateMessageService";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import { getProfile, profilePsid, sendText } from "./graphAPI";
import Whatsapp from "../../models/Whatsapp";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import { debounce } from "../../helpers/Debounce";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import formatBody from "../../helpers/Mustache";
import Queue from "../../models/Queue";
import Chatbot from "../../models/Chatbot";
import Message from "../../models/Message";
import { sayChatbot } from "../WbotServices/ChatbotListenerFacebook";
import ListSettingsService from "../SettingServices/ListSettingsService";
import { isNil, isNull, head } from "lodash";
import FindOrCreateATicketTrakingService from "../TicketServices/FindOrCreateATicketTrakingService";
import { handleRating, verifyRating } from "../WbotServices/wbotMessageListener";
import CompaniesSettings from "../../models/CompaniesSettings";
import sendFacebookMessage from "./sendFacebookMessage";
import { Mutex } from "async-mutex";
import TicketTag from "../../models/TicketTag";
import Tag from "../../models/Tag";

interface IMe {
  name: string;
  // eslint-disable-next-line camelcase
  first_name: string;
  // eslint-disable-next-line camelcase
  last_name: string;
  // eslint-disable-next-line camelcase
  profile_pic: string;
  id: string;
}

export interface Root {
  object: string;
  entry: Entry[];
}

export interface Entry {
  id: string;
  time: number;
  messaging: Messaging[];
}

export interface Messaging {
  sender: Sender;
  recipient: Recipient;
  timestamp: number;
  message: MessageX;
}

export interface Sender {
  id: string;
}

export interface Recipient {
  id: string;
}

export interface MessageX {
  mid: string;
  text: string;
  reply_to: ReplyTo;
}

export interface ReplyTo {
  mid: string;
}

const verifyContact = async (msgContact: any, token: any, companyId: any) => {
  if (!msgContact) return null;

  const contactData = {
    name: msgContact?.name || `${msgContact?.first_name} ${msgContact?.last_name}`,
    number: msgContact.id,
    profilePicUrl: msgContact.profile_pic,
    isGroup: false,
    companyId: companyId,
    channel: token.channel,
    whatsappId: token.id
  };

  const contact = CreateOrUpdateContactService(contactData);

  return contact;
};

export const verifyMessageFace = async (
  msg: any,
  body: any,
  ticket: Ticket,
  contact: Contact,
  fromMe: boolean = false
) => {
  const quotedMsg = await verifyQuotedMessage(msg);
  const messageData = {
    wid: msg.mid || msg.message_id,
    ticketId: ticket.id,
    contactId: fromMe ? undefined : msg.is_echo ? undefined : contact.id,
    body: msg.text || body,
    fromMe: fromMe ? fromMe : msg.is_echo ? true : false,
    read: fromMe ? fromMe : msg.is_echo,
    quotedMsgId: quotedMsg?.id,
    ack: 3,
    dataJson: JSON.stringify(msg),
    channel: ticket.channel
  };

  await CreateMessageService({ messageData, companyId: ticket.companyId });

  // await ticket.update({
  //   lastMessage: msg.text
  // });
};

export const verifyMessageMedia = async (
  msg: any,
  ticket: Ticket,
  contact: Contact,
  fromMe: boolean = false
): Promise<void> => {
  const { data } = await axios.get(msg.attachments[0].payload.url, {
    responseType: "arraybuffer"
  });

  // eslint-disable-next-line no-eval
  const { fileTypeFromBuffer } = await (eval('import("file-type")') as Promise<typeof import("file-type")>);

  const type = await fileTypeFromBuffer(data);

  const fileName = `${new Date().getTime()}.${type.ext}`;

  const folder = `public/company${ticket.companyId}`;
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder);
    fs.chmodSync(folder, 0o777)
  }

  writeFileSync(
    join(__dirname, "..", "..", "..", folder, fileName),
    data,
    "base64"
  );

  const messageData = {
    wid: msg.mid,
    ticketId: ticket.id,
    contactId: fromMe ? undefined : msg.is_echo ? undefined : contact.id,
    body: msg.text || fileName,
    fromMe: fromMe ? fromMe : msg.is_echo ? true : false,
    mediaType: msg.attachments[0].type,
    mediaUrl: fileName,
    read: fromMe ? fromMe : msg.is_echo,
    quotedMsgId: null,
    ack: 3,
    dataJson: JSON.stringify(msg),
    channel: ticket.channel
  };

  await CreateMessageService({ messageData, companyId: ticket.companyId });

  // await ticket.update({
  //   lastMessage: msg.text
  // });
};

export const verifyQuotedMessage = async (msg: any): Promise<Message | null> => {
  if (!msg) return null;
  const quoted = msg?.reply_to?.mid;

  if (!quoted) return null;

  const quotedMsg = await Message.findOne({
    where: { wid: quoted }
  });

  if (!quotedMsg) return null;

  return quotedMsg;
};

export const handleMessage = async (
  token: Whatsapp,
  webhookEvent: any,
  channel: string,
  companyId: any
): Promise<any> => {
  try {
    if (webhookEvent.message) {
      let msgContact: any;

      const senderPsid = webhookEvent.sender.id;
      const recipientPsid = webhookEvent.recipient.id;
      const { message } = webhookEvent;
      const fromMe = message.is_echo;

      let bodyMessage = message.text;

      if (fromMe) {
        if (/\u200e/.test(bodyMessage)) return;

        msgContact = await profilePsid(recipientPsid, token.facebookUserToken);
      } else {
        msgContact = await profilePsid(senderPsid, token.facebookUserToken);
      }

      const contact = await verifyContact(msgContact, token, companyId);

      const unreadCount = fromMe ? 0 : 1;

      const getSession = await Whatsapp.findOne({
        where: {
          facebookPageUserId: token.facebookPageUserId
        },
        include: [
          {
            model: Queue,
            as: "queues",
            attributes: ["id", "name", "color", "greetingMessage"],
            include: [
              {
                model: Chatbot,
                as: "chatbots",
                attributes: ["id", "name", "greetingMessage"]
              }
            ]
          }
        ],
        order: [
          ["queues", "id", "ASC"],
          ["queues", "chatbots", "id", "ASC"]
        ]
      });

      const settings = await CompaniesSettings.findOne({
        where: { companyId }
      }
      )

      const mutex = new Mutex();
      const ticket = await mutex.runExclusive(async () => {
        const createTicket = await FindOrCreateTicketService(
          contact,
          getSession,
          unreadCount,
          companyId,
          0,
          0,
          null,
          channel,
          null,
          false,
          settings
        )
        return createTicket;
      });

      let bodyRollbackTag = "";
      let bodyNextTag = "";
      let rollbackTag;
      let nextTag;
      let ticketTag = undefined;
      // console.log(ticket.id)
      if (ticket?.company?.plan?.useKanban) {
        ticketTag = await TicketTag.findOne({
          where: {
            ticketId: ticket.id
          }
        })

        if (ticketTag) {
          const tag = await Tag.findByPk(ticketTag.tagId)

          if (tag.nextLaneId) {
            nextTag = await Tag.findByPk(tag.nextLaneId);

            bodyNextTag = nextTag.greetingMessageLane;
          }
          if (tag.rollbackLaneId) {
            rollbackTag = await Tag.findByPk(tag.rollbackLaneId);

            bodyRollbackTag = rollbackTag.greetingMessageLane;
          }
        }
      }

      const ticketTraking = await FindOrCreateATicketTrakingService({
        ticketId: ticket.id,
        companyId,
        whatsappId: getSession?.id,
        userId: ticket.userId
      });

      if (
        (getSession.farewellMessage &&
          formatBody(getSession.farewellMessage, ticket) === message.text) ||
        (getSession.ratingMessage &&
          formatBody(getSession.ratingMessage, ticket) === message.text)
      )
        return;

      if (rollbackTag && formatBody(bodyNextTag, ticket) !== bodyMessage && formatBody(bodyRollbackTag, ticket) !== bodyMessage) {
        await TicketTag.destroy({ where: { ticketId: ticket.id, tagId: ticketTag.tagId } });
        await TicketTag.create({ ticketId: ticket.id, tagId: rollbackTag.id });
      }

      await ticket.update({
        lastMessage: message.text
      });

      try {
        if (!fromMe) {
          /**
           * Tratamento para avaliação do atendente
           */
          if (ticket.status === "nps" && ticketTraking !== null && verifyRating(ticketTraking)) {

            if (!isNaN(parseFloat(bodyMessage))) {

              handleRating(parseFloat(bodyMessage), ticket, ticketTraking);

              await ticketTraking.update({
                ratingAt: moment().toDate(),
                finishedAt: moment().toDate(),
                rated: true
              });

              return;
            } else {

              if (ticket.amountUsedBotQueuesNPS < getSession.maxUseBotQueuesNPS) {
                let bodyErrorRating = `\u200eOpção inválida, tente novamente.\n`;
                const sentMessage = await sendText(
                  contact.number,
                  bodyErrorRating,
                  getSession.facebookUserToken
                );

                await verifyMessageFace(sentMessage, bodyErrorRating, ticket, contact);


                // await delay(1000);

                let bodyRatingMessage = `\u200e${getSession.ratingMessage}\n`;

                const msg = await sendText(contact.number, bodyRatingMessage, getSession.facebookUserToken);

                await verifyMessageFace(sentMessage, bodyRatingMessage, ticket, contact);

                await ticket.update({
                  amountUsedBotQueuesNPS: ticket.amountUsedBotQueuesNPS + 1
                })
              }
              return;
            }

          }

          const enableLGPD = settings.enableLGPD === "enabled";

          //TRATAMENTO LGPD
          if (enableLGPD && ticket.status === "lgpd") {
            if (isNil(ticket.lgpdAcceptedAt) && !isNil(ticket.lgpdSendMessageAt)) {
              let choosenOption: number | null = null;

              if (!isNaN(parseFloat(bodyMessage))) {
                choosenOption = parseFloat(bodyMessage);
              }

              //Se digitou opção numérica
              if (!Number.isNaN(choosenOption) && Number.isInteger(choosenOption) && !isNull(choosenOption) && choosenOption > 0) {
                //Se digitou 1, aceitou o termo e vai pro bot
                if (choosenOption === 1) {
                  await contact.update({
                    lgpdAcceptedAt: moment().toDate(),
                  });
                  await ticket.update({
                    lgpdAcceptedAt: moment().toDate(),
                    amountUsedBotQueues: 0
                  });
                  //Se digitou 2, recusou o bot e encerra chamado
                } else if (choosenOption === 2) {

                  if (getSession.complationMessage !== "" && getSession.complationMessage !== undefined) {

                    const sentMessage = await sendText(
                      contact.number,
                      `\u200e${getSession.complationMessage}`,
                      getSession.facebookUserToken
                    );

                    await verifyMessageFace(sentMessage, `\u200e${getSession.complationMessage}`, ticket, contact);
                  }

                  await ticket.update({
                    status: "closed",
                    amountUsedBotQueues: 0
                  })

                  await ticketTraking.destroy;

                  return
                  //se digitou qualquer opção que não seja 1 ou 2 limpa o lgpdSendMessageAt para 
                  //enviar de novo o bot respeitando o numero máximo de vezes que o bot é pra ser enviado
                } else {
                  if (ticket.amountUsedBotQueues < getSession.maxUseBotQueues) {
                    await ticket.update(
                      {
                        amountUsedBotQueues: ticket.amountUsedBotQueues + 1
                        , lgpdSendMessageAt: null
                      });
                  }
                }
                //se digitou qualquer opção que não número o lgpdSendMessageAt para 
                //enviar de novo o bot respeitando o numero máximo de vezes que o bot é pra ser enviado
              } else {
                if (ticket.amountUsedBotQueues < getSession.maxUseBotQueues) {
                  await ticket.update(
                    {
                      amountUsedBotQueues: ticket.amountUsedBotQueues + 1
                      , lgpdSendMessageAt: null
                    });
                }
              }
            }

            if ((contact.lgpdAcceptedAt === null || settings?.lgpdConsent === "enabled") &&
              !contact.isGroup && isNil(ticket.lgpdSendMessageAt) &&
              ticket.amountUsedBotQueues <= getSession.maxUseBotQueues && !isNil(settings?.lgpdMessage)
            ) {
              if (message.attachments) {
                await verifyMessageMedia(message, ticket, contact);
              } else {
                await verifyMessageFace(message, message.text, ticket, contact);
              }

              if (!isNil(settings?.lgpdMessage) && settings.lgpdMessage !== "") {
                const bodyMessageLGPD = formatBody(`\u200e${settings.lgpdMessage}`, ticket);

                const sentMessage = await sendText(
                  contact.number,
                  bodyMessageLGPD,
                  getSession.facebookUserToken
                );

                await verifyMessageFace(sentMessage, bodyMessageLGPD, ticket, contact);

              }
              // await delay(1000);

              if (!isNil(settings?.lgpdLink) && settings?.lgpdLink !== "") {
                const bodyLink = formatBody(`\u200e${settings.lgpdLink}`, ticket);
                const sentMessage = await sendText(
                  contact.number,
                  bodyLink,
                  getSession.facebookUserToken
                );

                await verifyMessageFace(sentMessage, bodyLink, ticket, contact);
              };

              // await delay(1000);

              const bodyBot = formatBody(
                `\u200eEstou ciente sobre o tratamento dos meus dados pessoais. \n\n*[1]* Sim\n*[2]* Não`,
                ticket
              );

              const sentMessageBot = await sendText(
                contact.number,
                bodyBot,
                getSession.facebookUserToken
              );

              await verifyMessageFace(sentMessageBot, bodyBot, ticket, contact);

              await ticket.update({
                lgpdSendMessageAt: moment().toDate(),
                amountUsedBotQueues: ticket.amountUsedBotQueues + 1
              });

              await ticket.reload();

              return;

            };

            if (!isNil(ticket.lgpdSendMessageAt) && isNil(ticket.lgpdAcceptedAt))
              return
          }
        }
      } catch (e) {
        throw new Error(e);
        console.log(e);
      }

      if (message.attachments) {
        await verifyMessageMedia(message, ticket, contact);
      } else {
        await verifyMessageFace(message, message.text, ticket, contact);
      }

      if (
        !ticket.queue &&
        !fromMe &&
        !ticket.userId &&
        getSession.queues.length >= 1
      ) {
        await verifyQueue(getSession, message, ticket, contact);
      }

      if (ticket.queue && ticket.queueId) {
        if (!ticket.user) {
          await sayChatbot(
            ticket.queueId,
            getSession,
            ticket,
            contact,
            message
          );
        }
      }
    }

    return;
  } catch (error) {
    throw new Error(error);
  }
};

const verifyQueue = async (
  getSession: Whatsapp,
  msg: any,
  ticket: Ticket,
  contact: Contact
) => {
  // console.log("VERIFYING QUEUE", ticket.whatsappId, getSession.id)
  const { queues, greetingMessage } = await ShowWhatsAppService(getSession.id!, ticket.companyId);



  if (queues.length === 1) {
    const firstQueue = head(queues);
    let chatbot = false;
    if (firstQueue?.chatbots) {
      chatbot = firstQueue?.chatbots?.length > 0;
    }
    await UpdateTicketService({
      ticketData: { queueId: queues[0].id, isBot: chatbot },
      ticketId: ticket.id,
      companyId: ticket.companyId
    });

    return;
  }

  let selectedOption = "";

  if (ticket.status !== "lgpd") {
    selectedOption = msg.text;
  } else {
    if (!isNil(ticket.lgpdAcceptedAt))
      await ticket.update({
        status: "pending"
      });

    await ticket.reload();
  }

  const choosenQueue = queues[+selectedOption - 1];

  if (choosenQueue) {
    await UpdateTicketService({
      ticketData: { queueId: choosenQueue.id },
      ticketId: ticket.id,
      companyId: ticket.companyId
    });

    if (choosenQueue.chatbots.length > 0) {
      let options = "";
      choosenQueue.chatbots.forEach((chatbot, index) => {
        options += `[${index + 1}] - ${chatbot.name}\n`;
      });

      const body =
        `${choosenQueue.greetingMessage}\n\n${options}\n[#] Voltar para o menu principal`;

      const sentMessage = await sendFacebookMessage({
        ticket,
        body: body
      })

      // const debouncedSentChatbot = debounce(
      //   async () => {
      //     await sendText(
      //   contact.number,
      //   formatBody(body, ticket),
      //   ticket.whatsapp.facebookUserToken
      // );
      //   },
      //   3000,
      //   ticket.id
      // );
      // debouncedSentChatbot();

      // return await verifyMessage(msg, body, ticket, contact);
    }

    if (!choosenQueue.chatbots.length) {
      const body = `${choosenQueue.greetingMessage}`;

      const sentMessage = await sendFacebookMessage({
        ticket,
        body: body
      })
      // const debouncedSentChatbot = debounce(
      //   async () => { await sendText(
      //   contact.number,
      //   formatBody(body, ticket),
      //   ticket.whatsapp.facebookUserToken
      // );

      //   },
      //   3000,
      //   ticket.id
      // );
      // debouncedSentChatbot();
      // return await verifyMessage(msg, body, ticket, contact);
    }
  } else {
    let options = "";

    queues.forEach((queue, index) => {
      options += `[${index + 1}] - ${queue.name}\n`;
    });

    const body = `${greetingMessage}\n\n${options}`;

    const sentMessage = await sendFacebookMessage({
      ticket,
      body: body
    })
    // const debouncedSentChatbot = debounce(
    //   async () => { await 
    //     sendText(
    //       contact.number,
    //       formatBody(body, ticket),
    //       ticket.whatsapp.facebookUserToken
    //     );
    //   },
    //   3000,
    //   ticket.id
    // );
    // debouncedSentChatbot();

    // return verifyMessage(msg, body, ticket, contact);



  }
};
