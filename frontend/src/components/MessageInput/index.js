import React, { useState, useEffect, useContext, useRef } from "react";
import "emoji-mart/css/emoji-mart.css";
import { Picker } from "emoji-mart";
import { useMediaQuery } from "@material-ui/core";
import { isNil, isString, isEmpty } from "lodash";
import { ClickAwayListener } from "@material-ui/core";
import {
  Paperclip,
  CheckCircle,
  X,
  MessageSquare,
  Pen,
  FileText,
  Image as ImageIcon,
  User,
  Reply as ReplyIcon,
  Video,
  Clock,
  Smile,
  MoreVertical,
  Send as SendIcon,
  Mic as MicIcon,
  Bolt,
  Camera,
} from "lucide-react";
import MicRecorder from "mic-recorder-to-mp3";
import clsx from "clsx";
import { ReplyMessageContext } from "../../context/ReplyingMessage/ReplyingMessageContext";
import { AuthContext } from "../../context/Auth/AuthContext";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import RecordingTimer from "./RecordingTimer";
import useQuickMessages from "../../hooks/useQuickMessages";
import ContactSendModal from "../ContactSendModal";
import CameraModal from "../CameraModal";
import axios from "axios";
import ButtonModal from "../ButtonModal";
import useCompanySettings from "../../hooks/useSettings/companySettings";
import { ForwardMessageContext } from "../../context/ForwarMessage/ForwardMessageContext";
import MessageUploadMedias from "../MessageUploadMedias";
import { EditMessageContext } from "../../context/EditingMessage/EditingMessageContext";
import ScheduleModal from "../ScheduleModal";

const Mp3Recorder = new MicRecorder({ bitRate: 128 });

const MessageInput = ({ ticketId, ticketStatus, droppedFiles, contactId, ticketChannel }) => {
  const [mediasUpload, setMediasUpload] = useState([]);
  const isMounted = useRef(true);
  const [buttonModalOpen, setButtonModalOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [quickAnswers, setQuickAnswer] = useState([]);
  const [typeBar, setTypeBar] = useState(false);
  const inputRef = useRef();
  const [onDragEnter, setOnDragEnter] = useState(false);
  const { setReplyingMessage, replyingMessage } = useContext(ReplyMessageContext);
  const { setEditingMessage, editingMessage } = useContext(EditMessageContext);
  const { user } = useContext(AuthContext);
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [signMessagePar, setSignMessagePar] = useState(false);
  const { get: getSetting } = useCompanySettings();
  const [signMessage, setSignMessage] = useState(true);
  const [privateMessage, setPrivateMessage] = useState(false);
  const [privateMessageInputVisible, setPrivateMessageInputVisible] = useState(false);
  const [senVcardModalOpen, setSenVcardModalOpen] = useState(false);
  const [showModalMedias, setShowModalMedias] = useState(false);
  const { list: listQuickMessages } = useQuickMessages();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [placeholderText, setPlaceHolderText] = useState("");
  const [optionsOpen, setOptionsOpen] = useState(false); // Substitui bottomSheetOpen
  const { selectedMessages, setForwardMessageModalOpen, showSelectMessageCheckbox } = useContext(ForwardMessageContext);

  useEffect(() => {
    if (ticketStatus === "open" || ticketStatus === "group") {
      setPlaceHolderText(i18n.t("messagesInput.placeholderOpen"));
    } else {
      setPlaceHolderText(i18n.t("messagesInput.placeholderClosed"));
    }
    const maxLength = isMobile ? 20 : Infinity;
    if (isMobile && placeholderText.length > maxLength) {
      setPlaceHolderText(placeholderText.substring(0, maxLength) + "...");
    }
  }, [ticketStatus, isMobile, placeholderText]);

  useEffect(() => {
    if (droppedFiles && droppedFiles.length > 0) {
      const selectedMedias = Array.from(droppedFiles);
      setMediasUpload(selectedMedias);
      setShowModalMedias(true);
    }
  }, [droppedFiles]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    inputRef.current.focus();
    if (editingMessage) {
      setInputMessage(editingMessage.body);
    }
  }, [replyingMessage, editingMessage]);

  useEffect(() => {
    inputRef.current.focus();
    return () => {
      setInputMessage("");
      setShowEmoji(false);
      setMediasUpload([]);
      setReplyingMessage(null);
      setPrivateMessage(false);
      setPrivateMessageInputVisible(false);
      setEditingMessage(null);
    };
  }, [ticketId, setReplyingMessage, setEditingMessage]);

  useEffect(() => {
    setTimeout(() => {
      if (isMounted.current) setOnDragEnter(false);
    }, 1000);
  }, [onDragEnter]);

  useEffect(() => {
    const fetchSettings = async () => {
      const setting = await getSetting({ column: "sendSignMessage" });
      if (isMounted.current) {
        if (setting.sendSignMessage === "enabled") {
          setSignMessagePar(true);
          const signMessageStorage = JSON.parse(localStorage.getItem("persistentSignMessage"));
          setSignMessage(isNil(signMessageStorage) ? true : signMessageStorage);
        } else {
          setSignMessagePar(false);
        }
      }
    };
    fetchSettings();
  }, []);

  const handleSendLinkVideo = () => {
    const link = `https://meet.jit.si/${ticketId}`;
    setInputMessage(link);
  };

  const handleChangeInput = (e) => {
    setInputMessage(e.target.value);
  };

  const handlePrivateMessage = () => {
    setPrivateMessage(!privateMessage);
    setPrivateMessageInputVisible(!privateMessageInputVisible);
  };

  const handleButtonModalOpen = () => {
    setButtonModalOpen(true);
  };

  const handleQuickAnswersClick = async (value) => {
    if (value.mediaPath) {
      try {
        const { data } = await axios.get(value.mediaPath, { responseType: "blob" });
        handleUploadQuickMessageMedia(data, value.value);
        setInputMessage("");
        return;
      } catch (err) {
        toastError(err);
      }
    }
    setInputMessage(value.value);
    setTypeBar(false);
  };

  const handleAddEmoji = (e) => {
    setInputMessage((prevState) => prevState + e.native);
  };

  const [modalCameraOpen, setModalCameraOpen] = useState(false);

  const handleCapture = (imageData) => {
    if (imageData) {
      handleUploadCamera(imageData);
    }
  };

  const handleChangeMedias = (e) => {
    if (!e.target.files) return;
    const selectedMedias = Array.from(e.target.files);
    setMediasUpload(selectedMedias);
    setShowModalMedias(true);
  };

  const handleChangeSign = () => {
    const signMessageStorage = JSON.parse(localStorage.getItem("persistentSignMessage"));
    const newValue = signMessageStorage !== null ? !signMessageStorage : false;
    localStorage.setItem("persistentSignMessage", newValue);
    setSignMessage(newValue);
  };

  const handleOpenModalForward = () => {
    if (selectedMessages.length === 0) {
      setForwardMessageModalOpen(false);
      toastError(i18n.t("messagesList.header.notMessage"));
      return;
    }
    setForwardMessageModalOpen(true);
  };

  const handleInputPaste = (e) => {
    if (e.clipboardData.files[0]) {
      const selectedMedias = Array.from(e.clipboardData.files);
      setMediasUpload(selectedMedias);
      setShowModalMedias(true);
    }
  };

  const handleInputDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files[0]) {
      const selectedMedias = Array.from(e.dataTransfer.files);
      setMediasUpload(selectedMedias);
      setShowModalMedias(true);
    }
  };

  const handleUploadMedia = async (mediasUpload) => {
    setLoading(true);
    if (!mediasUpload.length) {
      setLoading(false);
      return;
    }
    const formData = new FormData();
    formData.append("fromMe", true);
    formData.append("isPrivate", privateMessage ? "true" : "false");
    mediasUpload.forEach((media) => {
      formData.append("body", media.caption);
      formData.append("medias", media.file);
    });
    try {
      await api.post(`/messages/${ticketId}`, formData);
    } catch (err) {
      toastError(err);
    }
    setLoading(false);
    setMediasUpload([]);
    setShowModalMedias(false);
    setPrivateMessage(false);
    setPrivateMessageInputVisible(false);
  };

  const handleSendContatcMessage = async (vcard) => {
    setSenVcardModalOpen(false);
    setLoading(true);
    if (isNil(vcard)) {
      setLoading(false);
      return;
    }
    const message = {
      read: 1,
      fromropolMe: true,
      mediaUrl: "",
      body: null,
      quotedMsg: replyingMessage,
      isPrivate: privateMessage ? "true" : "false",
      vCard: vcard,
    };
    try {
      await api.post(`/messages/${ticketId}`, message);
    } catch (err) {
      toastError(err);
    }
    setInputMessage("");
    setShowEmoji(false);
    setLoading(false);
    setReplyingMessage(null);
    setEditingMessage(null);
    setPrivateMessage(false);
    setPrivateMessageInputVisible(false);
  };

  const handleSendMessage = async () => {
    if (inputMessage.trim() === "") return;
    setLoading(true);
    const userName = privateMessage ? `${user.name} - Mensagem Privada` : user.name;
    const sendMessage = inputMessage.trim();
    const message = {
      read: 1,
      fromMe: true,
      mediaUrl: "",
      body: (signMessage || privateMessage) && !editingMessage
        ? `*${userName}:*\n${sendMessage}`
        : sendMessage,
      quotedMsg: replyingMessage,
      isPrivate: privateMessage ? "true" : "false",
    };
    try {
      if (editingMessage !== null) {
        await api.post(`/messages/edit/${editingMessage.id}`, message);
      } else {
        await api.post(`/messages/${ticketId}`, message);
      }
    } catch (err) {
      toastError(err);
    }
    setInputMessage("");
    setShowEmoji(false);
    setLoading(false);
    setReplyingMessage(null);
    setPrivateMessage(false);
    setEditingMessage(null);
    setPrivateMessageInputVisible(false);
  };

  const handleStartRecording = async () => {
    setLoading(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await Mp3Recorder.start();
      setRecording(true);
      setLoading(false);
    } catch (err) {
      toastError(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    async function fetchData() {
      const companyId = user.companyId;
      const messages = await listQuickMessages({ companyId, userId: user.id });
      const options = messages.map((m) => {
        let truncatedMessage = m.message;
        if (isString(truncatedMessage) && truncatedMessage.length > 90) {
          truncatedMessage = m.message.substring(0, 90) + "...";
        }
        return {
          value: m.message,
          label: `/${m.shortcode} - ${truncatedMessage}`,
          mediaPath: m.mediaPath,
        };
      });
      if (isMounted.current) {
        setQuickAnswer(options);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (isString(inputMessage) && !isEmpty(inputMessage) && inputMessage.length >= 1) {
      const firstWord = inputMessage.charAt(0);
      if (firstWord === "/") {
        setTypeBar(firstWord.indexOf("/") > -1);
        const filteredOptions = quickAnswers.filter(
          (m) => m.label.toLowerCase().indexOf(inputMessage.toLowerCase()) > -1
        );
        setTypeBar(filteredOptions);
      } else {
        setTypeBar(false);
      }
    } else {
      setTypeBar(false);
    }
  }, [inputMessage, quickAnswers]);

  const disableOption = () => {
    return loading || recording || (ticketStatus !== "open" && ticketStatus !== "group");
  };

  const handleUploadCamera = async (blob) => {
    setLoading(true);
    try {
      const formData = new FormData();
      const filename = `${new Date().getTime()}.png`;
      formData.append("medias", blob, filename);
      formData.append("body", privateMessage ? `\u200d` : "");
      formData.append("fromMe", true);
      await api.post(`/messages/${ticketId}`, formData);
    } catch (err) {
      toastError(err);
    }
    setLoading(false);
  };

  const handleUploadQuickMessageMedia = async (blob, message) => {
    setLoading(true);
    try {
      const extension = blob.type.split("/")[1];
      const formData = new FormData();
      const filename = `${new Date().getTime()}.${extension}`;
      formData.append("medias", blob, filename);
      formData.append("body", privateMessage ? `\u200d${message}` : message);
      formData.append("fromMe", true);
      if (isMounted.current) {
        await api.post(`/messages/${ticketId}`, formData);
      }
    } catch (err) {
      toastError(err);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const handleUploadAudio = async () => {
    setLoading(true);
    try {
      const [, blob] = await Mp3Recorder.stop().getMp3();
      if (blob.size < 10000) {
        setLoading(false);
        setRecording(false);
        return;
      }
      const formData = new FormData();
      const filename = ticketChannel === "whatsapp" ? `${new Date().getTime()}.mp3` : `${new Date().getTime()}.m4a`;
      formData.append("medias", blob, filename);
      formData.append("body", filename);
      formData.append("fromMe", true);
      if (isMounted.current) {
        await api.post(`/messages/${ticketId}`, formData);
      }
    } catch (err) {
      toastError(err);
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRecording(false);
      }
    }
  };

  const handleCloseModalMedias = () => {
    setShowModalMedias(false);
  };

  const handleCancelAudio = async () => {
    try {
      await Mp3Recorder.stop().getMp3();
      setRecording(false);
    } catch (err) {
      toastError(err);
    }
  };

  const handleSendContactModalOpen = () => {
    setSenVcardModalOpen(true);
  };

  const handleCameraModalOpen = () => {
    setModalCameraOpen(true);
  };

  const handleCancelSelection = () => {
    setMediasUpload([]);
    setShowModalMedias(false);
  };

  const renderReplyingMessage = (message) => {
    return (
      <div className="flex w-full items-center p-2 bg-gray-100 border-b border-gray-200">
        <div className="flex-1 mr-2 bg-white rounded flex relative shadow-sm">
          <span
            className={clsx("flex-none w-1", {
              "bg-green-500": !message.fromMe,
              "bg-blue-500": message.fromMe,
            })}
          ></span>
          <div className="p-2">
            {!message.fromMe && (
              <span className="text-blue-600 font-medium">{message.contact?.name}</span>
            )}
            <div className="whitespace-pre-wrap overflow-hidden text-sm">{message.body}</div>
          </div>
        </div>
        <button
          disabled={disableOption()}
          onClick={() => {
            setReplyingMessage(null);
            setEditingMessage(null);
            setInputMessage("");
          }}
          className="p-2 text-gray-600 hover:text-blue-500 disabled:text-gray-400"
        >
          <X size={16} />
        </button>
      </div>
    );
  };

  if (mediasUpload.length > 0) {
    return (
      <div
        className="flex p-2 bg-white border-t border-gray-200"
        onDragEnter={() => setOnDragEnter(true)}
        onDrop={(e) => handleInputDrop(e)}
      >
        {showModalMedias && (
          <MessageUploadMedias
            isOpen={showModalMedias}
            files={mediasUpload}
            onClose={handleCloseModalMedias}
            onSend={handleUploadMedia}
            onCancelSelection={handleCancelSelection}
          />
        )}
      </div>
    );
  }

  return (
    <>
      {modalCameraOpen && (
        <CameraModal
          isOpen={modalCameraOpen}
          onRequestClose={() => setModalCameraOpen(false)}
          onCapture={handleCapture}
        />
      )}
      {senVcardModalOpen && (
        <ContactSendModal
          modalOpen={senVcardModalOpen}
          onClose={(c) => handleSendContatcMessage(c)}
        />
      )}
      {buttonModalOpen && (
        <ButtonModal
          open={buttonModalOpen}
          onClose={() => setButtonModalOpen(false)}
          ticketId={ticketId}
        />
      )}
      <div
        className={clsx(
          "bg-white flex flex-col items-center border-t border-gray-200 p-2",
          isMobile ? "fixed bottom-0 left-0 right-0 z-[1000] shadow-md" : "relative md:p-4"
        )}
        onDragEnter={() => setOnDragEnter(true)}
        onDrop={(e) => handleInputDrop(e)}
      >
        {(replyingMessage || editingMessage) && renderReplyingMessage(replyingMessage || editingMessage)}
        <div className="w-full flex items-center gap-2 flex-wrap">
          <div
            className={clsx(
              "flex-1 p-2 rounded-full border border-gray-300 transition-colors focus-within:border-blue-500 shadow-sm flex items-center",
              {
                "bg-gray-100": !privateMessage,
                "bg-amber-50": privateMessage,
              }
            )}
          >
            {!isMobile && (
              <button
                disabled={disableOption()}
                onClick={() => setShowEmoji(!showEmoji)}
                className="p-2 text-gray-600 hover:text-blue-500 disabled:text-gray-400"
              >
                <Smile size={20} />
              </button>
            )}
            <input
              ref={inputRef}
              className="w-full bg-transparent outline-none text-sm text-gray-900 placeholder-gray-500 px-2"
              placeholder={privateMessage ? i18n.t("messagesInput.placeholderPrivateMessage") : placeholderText}
              value={inputMessage}
              onChange={handleChangeInput}
              disabled={disableOption()}
              onPaste={(e) => (ticketStatus === "open" || ticketStatus === "group") && handleInputPaste(e)}
              onKeyPress={(e) => {
                if (loading || e.shiftKey) return;
                if (e.key === "Enter") handleSendMessage();
              }}
            />
            {typeBar && (
              <ul className="absolute bottom-14 bg-white border border-gray-200 rounded shadow-lg w-11/12 max-h-40 overflow-y-auto z-10">
                {typeBar.map((value, index) => (
                  <li key={index}>
                    <button
                      onClick={() => handleQuickAnswersClick(value)}
                      className="w-full text-left p-2 hover:bg-gray-100 truncate text-sm"
                    >
                      {value.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            onClick={() => setOptionsOpen(true)}
            className="p-2 text-gray-600 hover:text-blue-500"
          >
            <MoreVertical size={20} />
          </button>
          {!privateMessage && (
            <>
              {inputMessage || showSelectMessageCheckbox ? (
                <button
                  onClick={showSelectMessageCheckbox ? handleOpenModalForward : handleSendMessage}
                  disabled={loading}
                  className="p-2 text-gray-600 hover:text-blue-500 disabled:text-gray-400"
                >
                  {showSelectMessageCheckbox ? <ReplyIcon size={20} /> : <SendIcon size={20} />}
                </button>
              ) : recording ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleCancelAudio}
                    disabled={loading}
                    className="p-2 text-red-500"
                  >
                    <X size={20} />
                  </button>
                  <RecordingTimer />
                  <button
                    onClick={handleUploadAudio}
                    disabled={loading}
                    className="p-2 text-green-500"
                  >
                    <CheckCircle size={20} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleStartRecording}
                  disabled={disableOption()}
                  className="p-2 text-gray-600 hover:text-blue-500 disabled:text-gray-400"
                >
                  <MicIcon size={20} />
                </button>
              )}
            </>
          )}
          {privateMessage && (
            <button
              onClick={showSelectMessageCheckbox ? handleOpenModalForward : handleSendMessage}
              disabled={loading}
              className="p-2 text-gray-600 hover:text-blue-500 disabled:text-gray-400"
            >
              {showSelectMessageCheckbox ? <ReplyIcon size={20} /> : <SendIcon size={20} />}
            </button>
          )}
        </div>
        {showEmoji && !isMobile && (
          <div className="absolute bottom-14 w-72 border border-gray-200 rounded shadow-lg bg-white z-20">
            <ClickAwayListener onClickAway={() => setShowEmoji(false)}>
              <Picker
                perLine={8}
                theme="light"
                i18n={i18n}
                showPreview={true}
                showSkinTones={false}
                onSelect={handleAddEmoji}
              />
            </ClickAwayListener>
          </div>
        )}
        {optionsOpen && (
          <div
            className={clsx(
              "bg-white rounded-lg shadow-lg z-50",
              isMobile
                ? "fixed inset-x-0 bottom-0 max-w-md mx-auto p-4 max-h-[70vh] overflow-y-auto rounded-t-3xl"
                : "absolute bottom-14 right-4 w-64 p-4"
            )}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{i18n.t("Selecione uma opção")}</h3>
              <button onClick={() => setOptionsOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="space-y-3">
              <button
                onClick={handleCameraModalOpen}
                className="flex items-center gap-3 p-3 w-full hover:bg-gray-100 rounded-lg text-left"
              >
                <Camera size={20} /> {i18n.t("messageInput.type.cam")}
              </button>
              <button
                onClick={handleSendContactModalOpen}
                className="flex items-center gap-3 p-3 w-full hover:bg-gray-100 rounded-lg text-left"
              >
                <User size={20} /> {i18n.t("messageInput.type.contact")}
              </button>
              <button
                onClick={handleSendLinkVideo}
                className="flex items-center gap-3 p-3 w-full hover:bg-gray-100 rounded-lg text-left"
              >
                <Video size={20} /> {i18n.t("messageInput.type.meet")}
              </button>
              <label className="flex items-center gap-3 p-3 w-full hover:bg-gray-100 rounded-lg cursor-pointer">
                <ImageIcon size={20} /> {i18n.t("messageInput.type.imageVideo")}
                <input
                  multiple
                  type="file"
                  accept="image/*, video/*, audio/*"
                  className="hidden"
                  onChange={handleChangeMedias}
                />
              </label>
              <label className="flex items-center gap-3 p-3 w-full hover:bg-gray-100 rounded-lg cursor-pointer">
                <FileText size={20} /> {i18n.t("Documentos")}
                <input
                  multiple
                  type="file"
                  accept="application/*, text/*"
                  className="hidden"
                  onChange={handleChangeMedias}
                />
              </label>
              {signMessagePar && (
                <button
                  onClick={handleChangeSign}
                  className="flex items-center gap-3 p-3 w-full hover:bg-gray-100 rounded-lg text-left"
                >
                  <Pen size={20} className={signMessage ? "text-blue-500" : "text-gray-400"} />
                  {i18n.t("Assinatura")}
                </button>
              )}
              <button
                onClick={handlePrivateMessage}
                className="flex items-center gap-3 p-3 w-full hover:bg-gray-100 rounded-lg text-left"
              >
                <MessageSquare size={20} className={privateMessage ? "text-amber-500" : "text-gray-400"} />
                {i18n.t("mensagem privada")}
              </button>
              <button
                onClick={() => setInputMessage("/")}
                className="flex items-center gap-3 p-3 w-full hover:bg-gray-100 rounded-lg text-left"
              >
                <Bolt size={20} /> {i18n.t("tickets.buttons.quickmessageflash")}
              </button>
              <button
                onClick={() => setAppointmentModalOpen(true)}
                disabled={loading}
                className="flex items-center gap-3 p-3 w-full hover:bg-gray-100 rounded-lg text-left disabled:text-gray-400"
              >
                <Clock size={20} /> {i18n.t("tickets.buttons.scredule")}
              </button>
            </div>
          </div>
        )}
        {appointmentModalOpen && (
          <ScheduleModal
            open={appointmentModalOpen}
            onClose={() => setAppointmentModalOpen(false)}
            message={inputMessage}
            contactId={contactId}
          />
        )}
      </div>
    </>
  );
};

export default MessageInput;