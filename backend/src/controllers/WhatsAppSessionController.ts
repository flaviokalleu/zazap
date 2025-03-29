import { Request, Response } from "express";
import { getWbot } from "../libs/wbot";
import AppError from "../errors/AppError";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import ShowWhatsAppServiceAdmin from "../services/WhatsappService/ShowWhatsAppServiceAdmin";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";
import UpdateWhatsAppService from "../services/WhatsappService/UpdateWhatsAppService";
import DeleteBaileysService from "../services/BaileysServices/DeleteBaileysService";
import cacheLayer from "../libs/cache";
import Whatsapp from "../models/Whatsapp";
import Userverify from "../models/User";

const store = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;

  // console.log("STARTING SESSION", whatsappId)
  const whatsapp = await ShowWhatsAppService(whatsappId, companyId);
  await StartWhatsAppSession(whatsapp, companyId);


  return res.status(200).json({ message: "Starting session." });
};

const update = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;

  // const { whatsapp } = await UpdateWhatsAppService({
  //   whatsappId,
  //   companyId,
  //   whatsappData: { session: "", requestQR: true }
  // });
  const whatsapp = await Whatsapp.findOne({ where: { id: whatsappId, companyId } });

  await whatsapp.update({ session: "" });
  
  if (whatsapp.channel === "whatsapp") {
    await StartWhatsAppSession(whatsapp, companyId);
  }

  return res.status(200).json({ message: "Starting session." });
};

const remove = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;
  console.log("DISCONNECTING SESSION", whatsappId)
  const whatsapp = await ShowWhatsAppService(whatsappId, companyId);


  if (whatsapp.channel === "whatsapp") {
    await DeleteBaileysService(whatsappId);

    const wbot = getWbot(whatsapp.id);

    wbot.logout();
    wbot.ws.close();
  }

  return res.status(200).json({ message: "Session disconnected." });
};

const removeadmin = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;
  const userId = req.user.id;
    const requestUser = await Userverify.findByPk(userId);
    if (requestUser.super === false) {
    throw new AppError("Você nao tem permissão para esta ação!");
  }
  console.log("DISCONNECTING SESSION", whatsappId)
  const whatsapp = await ShowWhatsAppServiceAdmin(whatsappId);
  if (whatsapp.channel === "whatsapp") {
    await DeleteBaileysService(whatsappId);
    const wbot = getWbot(whatsapp.id);
    wbot.logout();
    wbot.ws.close();
  }
  return res.status(200).json({ message: "Session disconnected." });
};
export default { store, remove, update, removeadmin };
