import { WAMessage, AnyMessageContent } from "@whiskeysockets/baileys";
import * as Sentry from "@sentry/node";
import fs from "fs";
import { exec } from "child_process";
import path from "path";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import Ticket from "../../models/Ticket";
import mime from "mime-types";
import Contact from "../../models/Contact";

interface RequestFlow {
  media: string;
  ticket: Ticket;
  body?: string;
  isFlow?: boolean;
  isRecord?: boolean;
}

const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");

const processAudio = async (audio: string): Promise<string> => {
  const outputAudio = path.join(publicFolder, `${Date.now()}.mp3`);
  console.log("🔍 Verificando arquivo:", audio);

  if (!fs.existsSync(audio)) {
    console.error("❌ Erro: O arquivo de áudio não foi encontrado!", audio);
    throw new AppError("ERR_FILE_NOT_FOUND");
  }

  return new Promise((resolve, reject) => {
    exec(
      `${ffmpegPath.path} -i "${audio}" -vn -ab 128k -ar 44100 -f ipod "${outputAudio}" -y`,
      (error) => {
        if (error) {
          console.error("❌ Erro ao processar o áudio:", error);
          return reject(error);
        }
        console.log("✅ Áudio processado com sucesso:", outputAudio);
        resolve(outputAudio);
      }
    );
  });
};

const processAudioFile = async (audio: string): Promise<string> => {
  const outputAudio = path.join(publicFolder, `${Date.now()}.mp3`);
  console.log("🔍 Verificando arquivo:", audio);

  if (!fs.existsSync(audio)) {
    console.error("❌ Erro: O arquivo de áudio não foi encontrado!", audio);
    throw new AppError("ERR_FILE_NOT_FOUND");
  }

  return new Promise((resolve, reject) => {
    exec(
      `${ffmpegPath.path} -i "${audio}" -vn -ar 44100 -ac 2 -b:a 192k "${outputAudio}" -y`,
      (error) => {
        if (error) {
          console.error("❌ Erro ao processar o áudio:", error);
          return reject(error);
        }
        console.log("✅ Áudio processado com sucesso:", outputAudio);
        resolve(outputAudio);
      }
    );
  });
};

const nameFileDiscovery = (pathMedia: string): string => {
  // Normalizar o separador de caminho para lidar com Windows e Linux
  const normalizedPath = pathMedia.replace(/\\/g, '/');
  const spliting = normalizedPath.split("/");
  return spliting[spliting.length - 1].split(".")[0];
};

// Função para simular digitação com tratamento de erros para métodos não disponíveis
const typeSimulation = async (wbot: any, recipient: string, duration: number = 1000): Promise<void> => {
  try {
    console.log("⌨️ Simulando digitação para:", recipient);
    
    // Tenta usar sendPresenceUpdate que é mais comum nas versões recentes
    if (typeof wbot.sendPresenceUpdate === 'function') {
      try {
        // Algumas versões precisam de presenceSubscribe primeiro
        if (typeof wbot.presenceSubscribe === 'function') {
          await wbot.presenceSubscribe(recipient);
        }
        
        await wbot.sendPresenceUpdate("composing", recipient);
        await new Promise(resolve => setTimeout(resolve, duration));
        await wbot.sendPresenceUpdate("paused", recipient);
      } catch (error) {
        console.log("⚠️ Falha ao usar sendPresenceUpdate, tentando método alternativo");
        
        // Tenta usar um método alternativo se disponível
        if (typeof wbot.chatPresence === 'function') {
          await wbot.chatPresence(recipient, "composing");
          await new Promise(resolve => setTimeout(resolve, duration));
          await wbot.chatPresence(recipient, "paused");
        }
      }
    } else if (typeof wbot.chatPresence === 'function') {
      // Método alternativo para versões mais antigas
      await wbot.chatPresence(recipient, "composing");
      await new Promise(resolve => setTimeout(resolve, duration));
      await wbot.chatPresence(recipient, "paused");
    } else {
      console.log("⚠️ Simulação de digitação não disponível para este cliente");
    }
    
    console.log("✅ Simulação de digitação concluída");
  } catch (err) {
    console.error("❌ Erro ao simular digitação:", err);
    Sentry.captureException(err);
    // Não interrompe o fluxo mesmo se a simulação falhar
  }
};

const SendWhatsAppMediaFlow = async ({ media, ticket, body, isRecord = false, isFlow = false }: RequestFlow): Promise<WAMessage> => {
  try {
    console.log("📤 Enviando mídia:", { media, isRecord, isFlow });

    // Normalizar o caminho para compatibilidade entre sistemas
    let correctedMediaPath = media.replace(/\\/g, '/');
    
    // Verifica se o caminho contém o erro de formato (WebhookServicepublic)
    if (correctedMediaPath.includes("WebhookServicepublic")) {
      correctedMediaPath = correctedMediaPath.replace("WebhookServicepublic", "WebhookService/public");
    }
    
    // Verifica se o caminho aponta para um arquivo existente
    if (!fs.existsSync(correctedMediaPath)) {
      // Tenta construir um caminho alternativo
      const fileName = path.basename(correctedMediaPath);
      
      // Tenta vários caminhos possíveis
      const possiblePaths = [
        path.join(process.cwd(), "public", fileName),
        path.join(publicFolder, fileName),
        // Caminho relativo ao diretório atual
        path.join(".", "public", fileName),
        // Caminho específico para backend
        path.join(process.cwd(), "backend", "public", fileName)
      ];
      
      let found = false;
      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          correctedMediaPath = testPath;
          console.log("🔄 Caminho corrigido para:", correctedMediaPath);
          found = true;
          break;
        }
      }
      
      if (!found) {
        console.error("❌ Erro: O arquivo de mídia não existe!", media);
        console.error("Tentativas de caminhos alternativos:", possiblePaths);
        throw new AppError("ERR_MEDIA_NOT_FOUND");
      }
    }

    const wbot = await GetTicketWbot(ticket);
    const mimetype = mime.lookup(correctedMediaPath) || "application/octet-stream";
    const typeMessage = mimetype.split("/")[0];
    const mediaName = nameFileDiscovery(correctedMediaPath);
    let options: AnyMessageContent;
    let convertedAudio: string | undefined;

    if (typeMessage === "audio") {
      console.log("🎵 Convertendo áudio...");
      convertedAudio = isRecord ? await processAudio(correctedMediaPath) : await processAudioFile(correctedMediaPath);
      options = { audio: fs.readFileSync(convertedAudio), mimetype: "audio/mp4", ptt: isRecord };
    } else if (typeMessage === "video") {
      options = { video: fs.readFileSync(correctedMediaPath), caption: body, fileName: mediaName };
    } else if (["document", "text", "application"].includes(typeMessage)) {
      options = { document: fs.readFileSync(correctedMediaPath), caption: body, fileName: mediaName, mimetype };
    } else {
      options = { image: fs.readFileSync(correctedMediaPath), caption: body };
    }

    const contact = await Contact.findOne({ where: { id: ticket.contactId } });
    if (!contact) {
      throw new AppError("ERR_CONTACT_NOT_FOUND");
    }
    const recipient = `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`;
    console.log("📲 Enviando mensagem para:", recipient);

    // Simula digitação se for parte de um fluxo
    if (isFlow) {
      try {
        await typeSimulation(wbot, recipient, 1000);
      } catch (error) {
        console.log("⚠️ Simulação de digitação falhou, continuando com o envio da mensagem");
      }
    }

    const sentMessage = await wbot.sendMessage(recipient, options);
    await ticket.update({ lastMessage: body || mediaName });

    // Limpeza do arquivo temporário de áudio, se existir
    if (convertedAudio && fs.existsSync(convertedAudio)) {
      fs.unlinkSync(convertedAudio);
      console.log("🧹 Arquivo temporário de áudio removido:", convertedAudio);
    }

    console.log("✅ Mensagem enviada com sucesso!");
    return sentMessage;
  } catch (err) {
    Sentry.captureException(err);
    console.error("❌ Erro ao enviar mensagem no WhatsApp:", err);
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMediaFlow;
export { typeSimulation }; // Exporta typeSimulation para uso externo