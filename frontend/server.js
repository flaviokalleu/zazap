const express = require("express");
const path = require("path");
const compression = require("compression");
const helmet = require("helmet");

const app = express();

// Habilitar compressão gzip
app.use(compression());

// Adicionar segurança e otimização
app.use(helmet({
  contentSecurityPolicy: false,
}));

// Cache de arquivos estáticos
app.use(express.static(path.join(__dirname, "build"), {
  maxAge: '30d',
  immutable: true
}));

// Lidar com todas as outras rotas
app.get("/*", function (req, res) {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

// Otimizar para performance
app.set('etag', 'strong');
app.set('x-powered-by', false);

app.listen(3000);
console.log('Servidor rodando na porta 3000');