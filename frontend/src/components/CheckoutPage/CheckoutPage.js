import React, { useContext, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Formik, Form } from "formik";

import AddressForm from "./Forms/AddressForm";
import PaymentForm from "./Forms/PaymentForm";
import ReviewOrder from "./ReviewOrder";
import CheckoutSuccess from "./CheckoutSuccess";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/Auth/AuthContext";

import validationSchema from "./FormModel/validationSchema";
import checkoutFormModel from "./FormModel/checkoutFormModel";
import formInitialValues from "./FormModel/formInitialValues";

const CheckoutPage = (props) => {
  const steps = ["Dados", "Personalizar", "Revisar"];
  const { formId, formField } = checkoutFormModel;

  const [activeStep, setActiveStep] = useState(1);
  const [datePayment, setDatePayment] = useState(null);
  const [invoiceId] = useState(props.Invoice.id);
  const currentValidationSchema = validationSchema[activeStep];
  const isLastStep = activeStep === steps.length - 1;
  const { user } = useContext(AuthContext);

  const renderStepContent = (step, setFieldValue, setActiveStep, values) => {
    switch (step) {
      case 0:
        return <AddressForm formField={formField} values={values} setFieldValue={setFieldValue} />;
      case 1:
        return (
          <PaymentForm
            formField={formField}
            setFieldValue={setFieldValue}
            setActiveStep={setActiveStep}
            activeStep={step}
            invoiceId={invoiceId}
            values={values}
          />
        );
      case 2:
        return <ReviewOrder />;
      default:
        return <div className="text-gray-500">Não encontrado</div>;
    }
  };

  const submitForm = async (values, actions) => {
    try {
      const plan = JSON.parse(values.plan);
      const newValues = {
        firstName: values.firstName,
        lastName: values.lastName,
        address2: values.address2,
        city: values.city,
        state: values.state,
        zipcode: values.zipcode,
        country: values.country,
        useAddressForPaymentDetails: values.useAddressForPaymentDetails,
        nameOnCard: values.nameOnCard,
        cardNumber: values.cardNumber,
        cvv: values.cvv,
        plan: values.plan,
        price: plan.price,
        users: plan.users,
        connections: plan.connections,
        invoiceId: invoiceId,
      };

      const { data } = await api.post("/subscription", newValues);
      setDatePayment(data);
      actions.setSubmitting(false);
      setActiveStep(activeStep + 1);
      toast.success("Assinatura realizada com sucesso!, aguardando a realização do pagamento");
    } catch (err) {
      toastError(err);
    }
  };

  const handleSubmit = (values, actions) => {
    if (isLastStep) {
      submitForm(values, actions);
    } else {
      setActiveStep(activeStep + 1);
      actions.setTouched({});
      actions.setSubmitting(false);
    }
  };

  const handleBack = () => {
    setActiveStep(activeStep - 1);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">Falta pouco!</h1>
      
      {/* Stepper */}
      <div className="flex justify-between items-center mb-8 max-w-2xl mx-auto">
        {steps.map((label, index) => (
          <div key={label} className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                index <= activeStep
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {index + 1}
            </div>
            <span className="text-sm mt-2 text-gray-700">{label}</span>
          </div>
        ))}
      </div>

      {activeStep === steps.length ? (
        <CheckoutSuccess pix={datePayment} />
      ) : (
        <Formik
          initialValues={{ ...user, ...formInitialValues }}
          validationSchema={currentValidationSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting, setFieldValue, values }) => (
            <Form id={formId} className="space-y-6">
              {renderStepContent(activeStep, setFieldValue, setActiveStep, values)}

              <div className="flex justify-between items-center mt-8">
                {activeStep !== 1 && activeStep !== 0 && (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" /> Voltar
                  </button>
                )}
                {activeStep !== 1 && (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors ${
                      isSubmitting
                        ? "bg-blue-400 cursor-not-allowed"
                        : "bg-blue-500 hover:bg-blue-600"
                    }`}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                    {isLastStep ? "Pagar" : "Próximo"}
                  </button>
                )}
              </div>
            </Form>
          )}
        </Formik>
      )}
    </div>
  );
};

export default CheckoutPage;