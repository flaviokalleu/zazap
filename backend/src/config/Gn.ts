/* import path from "path";

 const name = process.env.GERENCIANET_SANDBOX === "false" ? "producao" : "homologacao";

 const cert = path.join(
  __dirname,
  `../../certs/${process.env.GERENCIANET_PIX_CERT}.p12`
);

export = {
  sandbox: process.env.GERENCIANET_SANDBOX === "true",
  client_id: process.env.GERENCIANET_CLIENT_ID as string,
  client_secret: process.env.GERENCIANET_CLIENT_SECRET as string,
  pix_cert: cert
};
*/

import path from "path";
import Setting from "../models/Setting";

async function getSettingValue(key: string): Promise<string | undefined> {
  try {
    const buscacompanyId = 1;
    const setting = await Setting.findOne({ where: { companyId: buscacompanyId, key } });
    return setting?.value;
  } catch (error) {
    console.error("Error retrieving setting:", error);
    return undefined;
  }
}

const cert = path.join(__dirname, `../../certs/certificadoEfi.p12`);

const config = {
  sandbox: false,
  client_id: process.env.GERENCIANET_CLIENT_ID as string,
  client_secret: process.env.GERENCIANET_CLIENT_SECRET as string,
  pix_cert: cert
};

(async () => {
  config.client_id = await getSettingValue("eficlientid") as string;
  config.client_secret = await getSettingValue("eficlientsecret") as string;

  // Use the 'config' object as needed
  console.log(config);
})();

export = config;

