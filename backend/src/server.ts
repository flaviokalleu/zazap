import 'dotenv/config';
import gracefulShutdown from "http-graceful-shutdown";
import app from "./app";
import logger from "./utils/logger";
import { initIO } from "./libs/socket";
import { StartAllWhatsAppsSessions } from "./services/WbotServices/StartAllWhatsAppsSessions";
import Company from "./models/Company";
import BullQueue from './libs/queue';
import { startQueueProcess } from "./queues";
import cluster from 'cluster';
import os from 'os';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

// Configurações
const MAX_MEMORY_THRESHOLD = process.env.MAX_MEMORY_THRESHOLD || 1.5 * 1024 * 1024 * 1024; // 1.5GB por padrão
const HEALTH_CHECK_INTERVAL = process.env.HEALTH_CHECK_INTERVAL || 60000; // 1 minuto
const SHUTDOWN_TIMEOUT = process.env.SHUTDOWN_TIMEOUT || 30000; // 30 segundos
const RESTART_DELAY = process.env.RESTART_DELAY || 5000; // 5 segundos
const MAX_WORKERS = process.env.MAX_WORKERS ? parseInt(process.env.MAX_WORKERS) : os.cpus().length;
const isProduction = process.env.NODE_ENV === 'production';
const LOG_DIRECTORY = process.env.LOG_DIRECTORY || './logs';

// Garante que o diretório de logs existe
if (!fs.existsSync(LOG_DIRECTORY)) {
  fs.mkdirSync(LOG_DIRECTORY, { recursive: true });
}

// Arquivo de log para erros críticos
const crashLogPath = path.join(LOG_DIRECTORY, 'crash.log');

// Função para registrar erros críticos em arquivo
const logCrash = (error: Error, origin: string): void => {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${origin}: ${error.message}\n${error.stack}\n\n`;
  
  try {
    fs.appendFileSync(crashLogPath, logEntry);
  } catch (fsError) {
    console.error('Falha ao escrever no arquivo de log:', fsError);
  }
};

// Tratamento de erros global com auto-recuperação
const handleError = (error: Error, origin: string): void => {
  logger.error(`${new Date().toUTCString()} ${origin}:`, error.message);
  logger.error(error.stack);
  
  // Registra o erro no arquivo de crash log
  logCrash(error, origin);
  
  try {
    // Tenta reiniciar via PM2 se for um erro fatal
    logger.info("Tentando auto-recuperação via PM2...");
    exec('pm2 restart all', (err, stdout, stderr) => {
      if (err) {
        logger.error("Falha ao reiniciar PM2:", err);
        // Caso PM2 falhe, espera um tempo e então tenta reiniciar o processo
        setTimeout(() => {
          logger.info("Reiniciando processo após falha...");
          process.exit(1); // PM2 vai reiniciar automaticamente se configurado com --restart-on-exit
        }, RESTART_DELAY);
      } else {
        logger.info("Comando PM2 executado:", stdout);
        if (stderr) logger.warn("PM2 stderr:", stderr);
      }
    });
  } catch (restartError) {
    logger.error("Erro durante tentativa de auto-recuperação:", restartError);
    setTimeout(() => process.exit(1), RESTART_DELAY / 2);
  }
};

// Tratamento específico para erros de sessão
function handleSessionError(error: any) {
  logger.error("Erro em sessões, tentando recuperação parcial:", error);
  
  // Registra o erro mas não derruba o servidor
  logCrash(error instanceof Error ? error : new Error(String(error)), "sessionError");
  
  // Tenta recuperar de forma controlada
  setTimeout(async () => {
    try {
      logger.info("Tentando reconectar sessões problemáticas...");
      
      // Busca empresas ativas
      const companies = await Company.findAll({
        where: { status: true },
        attributes: ["id"],
        raw: true
      });
      
      // Tenta reconectar cada empresa, mas uma por vez para evitar sobrecarga
      for (const company of companies) {
        try {
          await StartAllWhatsAppsSessions(company.id);
          logger.info(`Reconexão bem-sucedida para empresa ${company.id}`);
        } catch (reconnectError) {
          logger.error(`Falha ao reconectar empresa ${company.id}:`, reconnectError);
        }
        
        // Espera um pouco entre cada tentativa
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (recoveryError) {
      logger.error("Falha na recuperação de sessões:", recoveryError);
    }
  }, 10000);
}

// Verificação de saúde periódica
function setupHealthCheck() {
  setInterval(() => {
    try {
      const memoryUsage = process.memoryUsage();
      
      // Log de uso de recursos para monitoramento
      if (process.env.DEBUG_MEMORY === 'true') {
        logger.info(`Uso de memória: ${Math.round(memoryUsage.rss / (1024 * 1024))}MB, Heap: ${Math.round(memoryUsage.heapUsed / (1024 * 1024))}MB`);
      }
      
      // Verifica se o uso de memória está acima do limite
      if (memoryUsage.rss > Number(MAX_MEMORY_THRESHOLD)) {
        logger.warn(`Uso de memória alto: ${Math.round(memoryUsage.rss / (1024 * 1024))}MB. Iniciando reinicialização controlada.`);
        handleError(new Error("Reinício preventivo por alto uso de memória"), "memoryThreshold");
      }
      
      // Também poderia adicionar outras verificações de saúde aqui
      // Como conectividade com banco de dados, redis, etc.
    } catch (healthCheckError) {
      logger.error("Erro na verificação de saúde:", healthCheckError);
    }
  }, Number(HEALTH_CHECK_INTERVAL));
}

// Inicialização do servidor
async function initializeServer() {
  try {
    logger.info("Iniciando servidor...");
    
    const server = app.listen(process.env.PORT, async () => {
      logger.info(`Servidor iniciado na porta: ${process.env.PORT}`);
      
      // Inicializa socket.io
      initIO(server);
      logger.info("Socket.IO inicializado");
      
      // Configura shutdown limpo
      gracefulShutdown(server, {
        timeout: Number(SHUTDOWN_TIMEOUT),
        development: !isProduction,
        onShutdown: async () => {
          logger.info("Servidor sendo desligado com segurança...");
          // Código de limpeza adicional pode ser adicionado aqui
          return Promise.resolve();
        },
        finally: () => logger.info("Servidor desligado com sucesso")
      });

      // Inicia o processamento de filas em Redis se configurado
      if (process.env.REDIS_URI_ACK && process.env.REDIS_URI_ACK !== '') {
        try {
          BullQueue.process();
          logger.info("Processador de filas Redis iniciado");
        } catch (redisError) {
          logger.error("Erro ao iniciar processador de filas Redis:", redisError);
          // Não derruba o servidor por erro no Redis
        }
      }

      // Busca empresas ativas de forma eficiente
      try {
        const companies = await Company.findAll({
          where: { status: true },
          attributes: ["id"],
          raw: true // Melhora desempenho retornando objetos simples
        });

        logger.info(`Encontradas ${companies.length} empresas ativas`);

        // Inicia sessões e processamento de fila de forma paralela
        await Promise.all(companies.map(c => StartAllWhatsAppsSessions(c.id)
          .catch(err => {
            logger.error(`Erro ao iniciar sessão para empresa ${c.id}:`, err);
            return Promise.resolve(); // Não falha completamente se uma empresa falhar
          })
        ));
        
        await startQueueProcess();
        logger.info(`Inicialização concluída para ${companies.length} empresas`);
      } catch (dbError) {
        logger.error("Erro durante busca de empresas:", dbError);
        // Não derruba o servidor por erro na inicialização
        handleSessionError(dbError);
      }
    });

    // Configuração de tratamento de erros
    process.on("uncaughtException", (err) => handleError(err, "uncaughtException"));
    process.on("unhandledRejection", (reason: Error) => handleError(reason, "unhandledRejection"));

    // Tratamento de sinais do sistema para shutdown limpo
    ['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach(signal => {
      process.on(signal, () => {
        logger.info(`Recebido sinal ${signal}, iniciando shutdown limpo...`);
        setTimeout(() => {
          logger.info('Forçando encerramento após timeout');
          process.exit(0);
        }, Number(SHUTDOWN_TIMEOUT));
      });
    });

    // Implementação de sistema de heartbeat
    if (isProduction) {
      const heartbeatFile = path.join(LOG_DIRECTORY, 'heartbeat.txt');
      setInterval(() => {
        try {
          fs.writeFileSync(heartbeatFile, new Date().toISOString());
        } catch (err) {
          logger.error("Erro ao escrever heartbeat:", err);
        }
      }, 30000);
    }

    return server;
  } catch (error) {
    logger.error("Falha crítica na inicialização:", error);
    handleError(error as Error, "initializationFailure");
    throw error; // Re-throw para permitir que o cluster trate
  }
}

// Função principal
async function main() {
  if (isProduction && cluster.isPrimary) {
    logger.info(`Processo principal ${process.pid} em execução`);
    
    // Cria workers para cada CPU (ou conforme configuração)
    const workerCount = Math.min(MAX_WORKERS, os.cpus().length);
    logger.info(`Iniciando ${workerCount} workers...`);
    
    for (let i = 0; i < workerCount; i++) {
      cluster.fork();
    }
    
    cluster.on('exit', (worker, code, signal) => {
      logger.warn(`Worker ${worker.process.pid} morreu. Código: ${code}, Sinal: ${signal}`);
      logger.info('Iniciando novo worker...');
      cluster.fork();
    });
    
    // Configura verificação de saúde no processo principal
    setupHealthCheck();
    
    // Centraliza logs de workers
    cluster.on('message', (worker, message) => {
      if (message && message.type === 'log') {
        console.log(`[Worker ${worker.id}] ${message.data}`);
      }
    });
  } else {
    try {
      // Inicializa o servidor no processo principal ou em cada worker
      const server = await initializeServer();
      
      // Também configura verificações de saúde nos workers
      setupHealthCheck();
      
      // Registra PID para facilitar gerenciamento
      const pidFile = path.join(LOG_DIRECTORY, `server-${cluster.isPrimary ? 'primary' : process.pid}.pid`);
      fs.writeFileSync(pidFile, process.pid.toString());
      
      return server;
    } catch (err) {
      logger.error("Falha fatal na inicialização do servidor:", err);
      process.exit(1);
    }
  }
}

// Executa a função principal
main().catch(err => {
  console.error("Erro fatal na execução principal:", err);
  process.exit(1);
});