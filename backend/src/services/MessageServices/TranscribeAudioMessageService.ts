import fs from 'fs';
import path from 'path';
import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';

type Response = { transcribedText: string } | string;

// Configuração da chave da API Gemini a partir do .env
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error('Chave da API Gemini não encontrada no .env. Defina GEMINI_API_KEY.');
}

const TranscribeAudioMessageToText = async (fileName: string, companyId: number): Promise<Response> => {
  const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
  const companyFolder = `${publicFolder}/company${companyId}`;

  // Garantir que o diretório company${companyId} exista
  if (!fs.existsSync(companyFolder)) {
    try {
      fs.mkdirSync(companyFolder, { recursive: true });
    } catch (error) {
      console.error(`Erro ao criar diretório ${companyFolder}:`, error);
      return 'Erro ao criar diretório para o arquivo';
    }
  }

  const inputFilePath = `${companyFolder}/${fileName}`;
  const outputFilePath = `${companyFolder}/converted_${Date.now()}.mp3`;

  if (!fs.existsSync(inputFilePath)) {
    console.error(`Arquivo não encontrado: ${inputFilePath}`);
    return 'Arquivo não encontrado';
  }

  try {
    // Passo 1: Converter o áudio para MP3 com 16 kHz
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputFilePath)
        .audioCodec('mp3')
        .audioFrequency(16000)
        .output(outputFilePath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });

    // Passo 2: Ler o arquivo MP3 convertido e converter para base64
    const audioBuffer = fs.readFileSync(outputFilePath);
    const base64Audio = audioBuffer.toString('base64');

    // Passo 3: Construir o corpo da requisição JSON para o Gemini
    const requestData = {
      contents: [
        {
          parts: [
            { text: 'Transcreva o conteúdo deste áudio para texto em português.' },
            {
              inlineData: {
                mimeType: 'audio/mp3',
                data: base64Audio,
              },
            },
          ],
        },
      ],
    };

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    // Passo 4: Extrair a transcrição da resposta
    const transcription = response.data.candidates[0].content.parts[0].text;

    // Passo 5: Remover o arquivo temporário
    fs.unlinkSync(outputFilePath);

    return { transcribedText: transcription };
  } catch (error) {
    console.error(error);
    if (fs.existsSync(outputFilePath)) {
      fs.unlinkSync(outputFilePath);
    }
    return 'Conversão pra texto falhou';
  }
};

export default TranscribeAudioMessageToText;