import Setting from "../models/Setting";
import AppError from "../errors/AppError";

//será usado por agora somente para userCreation
const CheckSettings = async (key: string): Promise<string> => {
  const setting = await Setting.findOne({
    where: { key }
  });

  if (!setting) {
    throw new AppError("ERR_NO_SETTING_FOUND", 404);
  }

  return setting.value;
};

export const CheckSettings1 = async (key: string, defaultValue: string = null): Promise<string> => {
  const setting = await Setting.findOne({
    where:
     {
       companyId: 1,
       key
     }
  });
  if (!setting) {
    if (!defaultValue)
      throw new AppError("ERR_NO_SETTING_FOUND", 404);
    return defaultValue;
  }
  return setting.value;
};
export const CheckCompanySetting = async (companyId: number, key: string, defaultValue: string = null ): Promise<string> => {
  const setting = await Setting.findOne({
    where:
     {
       companyId,
       key
     }
  });
  if (!setting && !defaultValue) {
    throw new AppError("ERR_NO_SETTING_FOUND", 404);
  }
  return setting?.value || defaultValue;
};

export default CheckSettings;
