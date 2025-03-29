import { head } from "lodash";
import XLSX from "xlsx";
import { has } from "lodash";
import ContactListItem from "../../models/ContactListItem";
import CheckContactNumber from "../WbotServices/CheckNumber";
import logger from "../../utils/logger";

interface ContactData {
  name: string;
  number: string;
  email: string;
  contactListId: number;
  companyId: number;
}

export async function ImportContacts(
  contactListId: number,
  companyId: number,
  file: Express.Multer.File | undefined
): Promise<ContactListItem[]> {
  // Validação inicial
  if (!file || !file.path) {
    logger.error("Arquivo não fornecido para importação de contatos", { contactListId, companyId });
    throw new Error("Arquivo não fornecido para importação");
  }

  logger.info("Iniciando importação de contatos", { contactListId, companyId, filePath: file.path });

  // Lê o arquivo Excel
  let workbook;
  try {
    workbook = XLSX.readFile(file.path);
  } catch (error) {
    logger.error("Erro ao ler o arquivo Excel", { error: error.message, filePath: file.path });
    throw new Error("Erro ao ler o arquivo Excel: " + error.message);
  }

  const worksheet = head(Object.values(workbook.Sheets)) as any;
  if (!worksheet) {
    logger.error("Nenhuma planilha encontrada no arquivo Excel", { filePath: file.path });
    throw new Error("Nenhuma planilha encontrada no arquivo Excel");
  }

  // Converte a planilha para JSON
  let rows: any[];
  try {
    rows = XLSX.utils.sheet_to_json(worksheet, { header: 0, defval: "" });
  } catch (error) {
    logger.error("Erro ao converter planilha para JSON", { error: error.message });
    throw new Error("Erro ao converter planilha para JSON: " + error.message);
  }

  if (!rows || rows.length === 0) {
    logger.warn("Nenhum contato encontrado no arquivo Excel", { filePath: file.path });
    return [];
  }

  // Mapeia os contatos do Excel
  const contacts: ContactData[] = rows.map((row, index) => {
    let name = "";
    let number = "";
    let email = "";

    // Extrai o nome
    if (has(row, "nome") || has(row, "Nome") || has(row, "name")) {
      name = row["nome"] || row["Nome"] || row["name"];
      name = String(name).trim();
    }

    // Extrai o número
    if (
      has(row, "numero") ||
      has(row, "número") ||
      has(row, "Numero") ||
      has(row, "Número") ||
      has(row, "number")
    ) {
      number = row["numero"] || row["número"] || row["Numero"] || row["Número"] || row["number"];
      number = String(number).replace(/\D/g, ""); // Remove caracteres não numéricos
    }

    // Extrai o email
    if (
      has(row, "email") ||
      has(row, "e-mail") ||
      has(row, "Email") ||
      has(row, "E-mail")
    ) {
      email = row["email"] || row["e-mail"] || row["Email"] || row["E-mail"];
      email = String(email).trim();
    }

    // Validações
    if (!number) {
      logger.warn(`Linha ${index + 1} ignorada: número não fornecido`, { row });
      return null; // Ignora linhas sem número
    }

    // Garante que o name seja válido, mas não aplica o fallback aqui
    if (!name) {
      logger.warn(`Linha ${index + 1}: nome não fornecido, será buscado no WhatsApp`, { number });
    } else if (name === number) {
      logger.warn(`Linha ${index + 1}: nome igual ao número, será buscado no WhatsApp`, { name, number });
      name = ""; // Deixa vazio para o CreateOrUpdateContactService buscar no WhatsApp
    }

    const contactData: ContactData = {
      name,
      number,
      email,
      contactListId,
      companyId
    };

    logger.debug("Contato mapeado do Excel", { contactData, rowIndex: index + 1 });
    return contactData;
  }).filter((contact): contact is ContactData => contact !== null); // Remove contatos inválidos

  if (contacts.length === 0) {
    logger.warn("Nenhum contato válido encontrado para importação", { contactListId, companyId });
    return [];
  }

  // Cria ou atualiza os contatos no banco
  const contactList: ContactListItem[] = [];
  const uniqueContacts = new Map<string, ContactData>(); // Para evitar duplicatas

  for (const contact of contacts) {
    const key = `${contact.number}-${contact.contactListId}-${contact.companyId}`;
    if (uniqueContacts.has(key)) {
      logger.warn("Contato duplicado encontrado no Excel, será ignorado", { number: contact.number });
      continue;
    }
    uniqueContacts.set(key, contact);

    try {
      const [newContact, created] = await ContactListItem.findOrCreate({
        where: {
          number: contact.number,
          contactListId: contact.contactListId,
          companyId: contact.companyId
        },
        defaults: contact
      });

      if (created) {
        logger.info("Novo contato criado", { number: newContact.number, name: newContact.name });
        contactList.push(newContact);
      } else {
        logger.debug("Contato já existe, não será adicionado à lista", { number: newContact.number });
      }
    } catch (error) {
      logger.error("Erro ao criar ou atualizar contato no banco", { contact, error: error.message });
      continue; // Continua com o próximo contato em caso de erro
    }
  }

  // Valida os números via WhatsApp
  if (contactList.length > 0) {
    for (let newContact of contactList) {
      try {
        const response = await CheckContactNumber(newContact.number, companyId);
        if (response) {
          newContact.isWhatsappValid = true;
          newContact.number = response; // Atualiza o número com o valor retornado
          logger.info("Número validado e atualizado", { originalNumber: newContact.number, newNumber: response });
        } else {
          newContact.isWhatsappValid = false;
          logger.warn("Número não é válido no WhatsApp", { number: newContact.number });
        }
        await newContact.save();
      } catch (error) {
        logger.error(`Erro ao validar número de contato: ${newContact.number}`, { error: error.message });
        newContact.isWhatsappValid = false;
        await newContact.save();
      }
    }
  }

  logger.info("Importação de contatos concluída", {
    contactListId,
    companyId,
    totalContacts: contacts.length,
    createdContacts: contactList.length
  });

  return contactList;
}