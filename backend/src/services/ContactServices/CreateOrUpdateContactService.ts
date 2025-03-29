import { getIO } from "../../libs/socket";
import CompaniesSettings from "../../models/CompaniesSettings";
import Contact from "../../models/Contact";
import ContactCustomField from "../../models/ContactCustomField";
import ContactListItem from "../../models/ContactListItem";
import fs from "fs";
import path, { join } from "path";
import logger from "../../utils/logger";
import { isNil, isEmpty } from "lodash";
import Whatsapp from "../../models/Whatsapp";
import * as Sentry from "@sentry/node";
import moment from "moment";

const axios = require('axios');

interface ExtraInfo extends ContactCustomField {
  name: string;
  value: string;
}

interface Request {
  name: string;
  number: string;
  isGroup: boolean;
  email?: string;
  profilePicUrl?: string;
  companyId: number;
  channel?: string;
  extraInfo?: ExtraInfo[];
  remoteJid?: string;
  whatsappId?: number;
  wbot?: any;
}

// Função para validar se o nome é válido
const isValidName = (name: string): boolean => {
  // Remove espaços em branco
  const cleanName = name ? name.trim() : "";

  // Verifica se o nome não é apenas números ou vazio
  if (isEmpty(cleanName) || /^\d+$/.test(cleanName)) {
    return false;
  }

  // Verifica se o nome tem pelo menos 2 caracteres após remover espaços
  return cleanName.length >= 2;
};

const downloadProfileImage = async ({
  profilePicUrl,
  companyId,
  contact
}) => {
  const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
  let filename;

  const folder = path.resolve(publicFolder, `company${companyId}`, "contacts");

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
    fs.chmodSync(folder, 0o777);
  }

  try {
    const response = await axios.get(profilePicUrl, {
      responseType: 'arraybuffer'
    });

    filename = `${new Date().getTime()}.jpeg`;
    fs.writeFileSync(join(folder, filename), response.data);

  } catch (error) {
    console.error(error)
  }

  return filename
}

const CreateOrUpdateContactService = async ({
  name,
  number: rawNumber,
  profilePicUrl,
  isGroup,
  email = "",
  channel = "whatsapp",
  companyId,
  extraInfo = [],
  remoteJid = "",
  whatsappId,
  wbot
}: Request): Promise<Contact> => {
  try {
    let createContact = false;
    const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
    const number = isGroup ? rawNumber : rawNumber.replace(/[^0-9]/g, "");
    const io = getIO();
    let contact: Contact | null;

    // Busca o nome na lista de contatos se o nome atual for inválido
    let contactListItem = await ContactListItem.findOne({
      where: { 
        number: rawNumber,
        companyId: companyId 
      }
    });

    // Determina o nome a ser usado inicialmente
    let contactName = name;
    if (!isValidName(name)) {
      contactName = contactListItem?.name;
      if (!contactName && wbot && ['whatsapp'].includes(channel)) {
        try {
          const wbotContact = await wbot.getContactById(remoteJid);
          contactName = wbotContact?.name || wbotContact?.pushname;
        } catch (e) {
          logger.error("Erro ao buscar nome via wbot:", e);
        }
      }
      contactName = contactName || `${number}`;
    }

    // Primeiro, tenta encontrar um contato existente apenas pelo número
    contact = await Contact.findOne({
      where: { number, companyId }
    });

    let updateImage = (!contact || contact?.profilePicUrl !== profilePicUrl && profilePicUrl !== "") && wbot || false;

    if (contact) {
      // Atualização de contato existente
      contact.remoteJid = remoteJid;
      contact.profilePicUrl = profilePicUrl || null;
      contact.isGroup = isGroup;

      // Atualiza o nome apenas se o nome atual for inválido
      if (!isValidName(contact.name)) {
        contact.name = contactName;
      }

      if (isNil(contact.whatsappId)) {
        const whatsapp = await Whatsapp.findOne({
          where: { id: whatsappId, companyId }
        });
        if (whatsapp) {
          contact.whatsappId = whatsappId;
        }
      }

      const folder = path.resolve(publicFolder, `company${companyId}`, "contacts");
      let fileName, oldPath = "";
      if (contact.urlPicture) {
        oldPath = path.resolve(contact.urlPicture.replace(/\\/g, '/'));
        fileName = path.join(folder, oldPath.split('\\').pop());
      }

      if (!fs.existsSync(fileName) || contact.profilePicUrl === "") {
        if (wbot && ['whatsapp'].includes(channel)) {
          try {
            profilePicUrl = await wbot.profilePictureUrl(remoteJid, "image");
          } catch (e) {
            Sentry.captureException(e);
            profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
          }
          contact.profilePicUrl = profilePicUrl;
          updateImage = true;
        }
      }

      await contact.save();
      await contact.reload();

    } else if (wbot && ['whatsapp'].includes(channel)) {
      // Criação de novo contato
      const settings = await CompaniesSettings.findOne({ where: { companyId } });
      const { acceptAudioMessageContact } = settings;
      let newRemoteJid = remoteJid;

      if (!remoteJid && remoteJid !== "") {
        newRemoteJid = isGroup ? `${rawNumber}@g.us` : `${rawNumber}@s.whatsapp.net`;
      }

      try {
        profilePicUrl = await wbot.profilePictureUrl(remoteJid, "image");
      } catch (e) {
        Sentry.captureException(e);
        profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
      }

      contact = await Contact.create({
        name: contactName,
        number,
        email,
        isGroup,
        companyId,
        channel,
        acceptAudioMessage: acceptAudioMessageContact === 'enabled' ? true : false,
        remoteJid: newRemoteJid,
        profilePicUrl,
        urlPicture: "",
        whatsappId
      });

      createContact = true;

    } else if (['facebook', 'instagram'].includes(channel)) {
      contact = await Contact.create({
        name: contactName,
        number,
        email,
        isGroup,
        companyId,
        channel,
        profilePicUrl,
        urlPicture: "",
        whatsappId
      });
    }

    // Download de imagem 
    if (updateImage) {
      let filename = await downloadProfileImage({
        profilePicUrl,
        companyId,
        contact
      });

      await contact.update({
        urlPicture: filename,
        pictureUpdated: true
      });

      await contact.reload();
    } else if (['facebook', 'instagram'].includes(channel)) {
      let filename = await downloadProfileImage({
        profilePicUrl,
        companyId,
        contact
      });

      await contact.update({
        urlPicture: filename,
        pictureUpdated: true
      });

      await contact.reload();
    }

    // Emissão de socket
    if (createContact) {
      io.of(String(companyId))
        .emit(`company-${companyId}-contact`, {
          action: "create",
          contact
        });
    } else {
      io.of(String(companyId))
        .emit(`company-${companyId}-contact`, {
          action: "update",
          contact
        });
    }

    return contact;
  } catch (err) {
    logger.error("Error to find or create a contact:", err);
    throw err;
  }
};

export default CreateOrUpdateContactService;