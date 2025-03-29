import React, { useEffect, useRef } from "react";
import CheckoutPage from "../CheckoutPage";

const ContactModal = ({ open, onClose, Invoice, contactId, initialValues, onSave }) => {
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="flex flex-wrap">
      <div 
        className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity ${
          open ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
      >
        {/* Overlay */}
        <div 
          className="absolute inset-0 bg-black bg-opacity-50"
          onClick={handleClose}
        />
        
        {/* Modal Content */}
        <div className="relative bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
          <div className="p-6">
            <CheckoutPage Invoice={Invoice} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactModal;