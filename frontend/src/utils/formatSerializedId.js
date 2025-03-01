import { FormatMask } from './FormatMask';

// Função original modificada
const formatSerializedId = (serializedId) => {
  if (!serializedId) return null;
  
  const formatMask = new FormatMask();
  const number = serializedId.replace('@c.us', '');

  return formatMask.setPhoneFormatMask(number)?.replace('+55', '🇧🇷');
};

// Função para verificar se o número está em um formato que pode ser tratado
const canFormatNumber = (number) => {
  if (!number) return false;
  
  // Remove qualquer parte de ID do WhatsApp (como @c.us)
  const cleanNumber = typeof number === 'string' ? number.replace('@c.us', '') : String(number);
  
  // Verifica se é um número válido para formatação (números brasileiros começam com 55)
  // Aceita formatos como 5511987654321, 55(11)987654321, etc.
  return /^(55|\+55)?\d{10,11}$/.test(cleanNumber.replace(/[^\d+]/g, ''));
};

// Função aprimorada para formatar números com segurança
const safeFormatPhoneNumber = (number, hideNumber = false, isGroup = false) => {
  // Se for um grupo ou não tiver número, retorna o valor original
  if (isGroup || !number) return number;
  
  try {
    // Tenta formatar o número usando a função original
    const formattedNumber = formatSerializedId(number);
    
    // Se conseguiu formatar e deve esconder parte do número
    if (formattedNumber && hideNumber) {
      // Verifica se já está no formato com bandeira e parentheses
      if (formattedNumber.includes('🇧🇷')) {
        // Localiza a parte numérica para ocultar
        const parts = formattedNumber.match(/🇧🇷\s*\((\d{2})\)\s*(\d+)-(\d+)/);
        if (parts && parts.length >= 4) {
          const [, ddd, parte1, parte2] = parts;
          return `🇧🇷 (${ddd}) ${parte1.slice(0, -2)}**-**${parte2.slice(-2)}`;
        }
      }
      
      // Fallback para ocultação básica
      return formattedNumber.slice(0, -6) + "**-**" + number.slice(-2);
    }
    
    // Se conseguiu formatar, retorna o número formatado
    if (formattedNumber) return formattedNumber;
    
    // Se não conseguiu formatar mas o número pode ser formatado
    if (canFormatNumber(number)) {
      // Tenta limpar e formatar manualmente
      const cleanNumber = number.replace(/\D/g, '');
      const formatMask = new FormatMask();
      const manualFormatted = formatMask.setPhoneFormatMask(cleanNumber)?.replace('+55', '🇧🇷');
      
      if (manualFormatted && hideNumber) {
        const parts = manualFormatted.match(/🇧🇷\s*\((\d{2})\)\s*(\d+)-(\d+)/);
        if (parts && parts.length >= 4) {
          const [, ddd, parte1, parte2] = parts;
          return `🇧🇷 (${ddd}) ${parte1.slice(0, -2)}**-**${parte2.slice(-2)}`;
        }
        return manualFormatted.slice(0, -6) + "**-**" + cleanNumber.slice(-2);
      }
      
      return manualFormatted || number;
    }
    
    // Para números que não podem ser formatados mas precisam ser ocultados
    if (hideNumber && typeof number === 'string' && number.length > 8) {
      return number.slice(0, -6) + "**-**" + number.slice(-2);
    }
    
    // Último caso: retorna o número original
    return number;
  } catch (error) {
    console.error("Erro ao formatar número:", error);
    return number;
  }
};

export { formatSerializedId, safeFormatPhoneNumber };
export default formatSerializedId;