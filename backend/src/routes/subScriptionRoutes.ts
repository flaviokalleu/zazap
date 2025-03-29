import express from "express";
import isAuth from "../middleware/isAuth";

import * as SubscriptionController from "../controllers/SubscriptionController";

const subscriptionRoutes = express.Router();

subscriptionRoutes.post("/subscription",isAuth,SubscriptionController.createSubscription);

subscriptionRoutes.post("/subscription/create/webhook",SubscriptionController.createWebhook);
// subscriptionRoutes.delete("/subscription/create/webhook",isAuth,SubscriptionController.deleteWebhook);
// subscriptionRoutes.post("/subscription/return/:type?",SubscriptionController.webhook);
// subscriptionRoutes.post("/subscription/return/c5c0f5a4-efe2-447f-8c73-55f8c0f07284/pix",SubscriptionController.webhook);
subscriptionRoutes.post("/subscription/webhook/:type?", SubscriptionController.webhook);
subscriptionRoutes.post("/subscription/webhook/pix/:type?", SubscriptionController.webhook);
subscriptionRoutes.post("/subscription/stripewebhook/:type?", SubscriptionController.stripewebhook);
subscriptionRoutes.post("/subscription/mercadopagowebhook/:type?", SubscriptionController.mercadopagowebhook);
subscriptionRoutes.post("/subscription/asaaswebhook/:type?", SubscriptionController.asaaswebhook);

export default subscriptionRoutes;
