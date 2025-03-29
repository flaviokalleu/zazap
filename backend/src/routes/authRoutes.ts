import { Router } from "express";
import * as SessionController from "../controllers/SessionController";
import * as UserController from "../controllers/UserController";
import isAuth from "../middleware/isAuth";
import envTokenAuth from "../middleware/envTokenAuth";

const authRoutes = Router();

// Log para verificar se o authRoutes foi inicializado
console.log("Inicializando authRoutes...");

authRoutes.post("/signup", (req, res) => {
  console.log("Rota /signup chamada com body:", req.body);
  return UserController.store(req, res);
});

authRoutes.post("/login", (req, res) => {
  console.log("Rota /login chamada com body:", req.body);
  return SessionController.store(req, res);
});

authRoutes.post("/refresh_token", (req, res) => {
  console.log("Rota /refresh_token chamada com body:", req.body);
  return SessionController.update(req, res);
});

authRoutes.delete("/logout", isAuth, (req, res) => {
  console.log("Rota /logout chamada por usuário:", req.user);
  return SessionController.remove(req, res);
});

authRoutes.get("/me", isAuth, (req, res) => {
  console.log("Rota /me chamada por usuário:", req.user);
  return SessionController.me(req, res);
});

authRoutes.post("/forgot-password", (req, res) => {
  console.log("Rota /forgot-password chamada com body:", req.body);
  return SessionController.forgotPassword(req, res);
});

authRoutes.post("/reset-password", (req, res) => {
  console.log("Rota /reset-password chamada com body:", req.body);
  return SessionController.resetPassword(req, res);
});

// Log para confirmar que todas as rotas foram registradas
console.log("authRoutes configurado com sucesso.");

export default authRoutes;