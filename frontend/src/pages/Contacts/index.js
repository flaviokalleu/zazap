import React, {
    useState,
    useEffect,
    useReducer,
    useContext,
    useRef,
} from "react";
// import { SocketContext } from "../../context/Socket/SocketContext";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";

import { makeStyles } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import Avatar from "@material-ui/core/Avatar";
import { Facebook, Instagram, WhatsApp } from "@material-ui/icons";
import SearchIcon from "@material-ui/icons/Search";

import TextField from "@material-ui/core/TextField";
import InputAdornment from "@material-ui/core/InputAdornment";

import IconButton from "@material-ui/core/IconButton";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import CancelIcon from "@material-ui/icons/Cancel";
import BlockIcon from "@material-ui/icons/Block";

import api from "../../services/api";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import ContactModal from "../../components/ContactModal";
import ConfirmationModal from "../../components/ConfirmationModal";

import { i18n } from "../../translate/i18n";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import MainContainer from "../../components/MainContainer";
import toastError from "../../errors/toastError";

import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../../components/Can";
import NewTicketModal from "../../components/NewTicketModal";
import { TagsFilter } from "../../components/TagsFilter";
import PopupState, { bindTrigger, bindMenu } from "material-ui-popup-state";
import { v4 as uuidv4 } from "uuid";

import {
    ArrowDropDown,
    Backup,
    ContactPhone,
} from "@material-ui/icons";
import { Menu, MenuItem } from "@material-ui/core";

import ContactImportWpModal from "../../components/ContactImportWpModal";
import useCompanySettings from "../../hooks/useSettings/companySettings";
import { TicketsContext } from "../../context/Tickets/TicketsContext";

// Phone number validation and formatting functions
const isValidBrazilianPhoneNumber = (number) => {
  if (!number) return false;
  
  // Remove all non-numeric characters
  const cleanNumber = number.replace(/\D/g, '');
  
  // Check if the number is empty or too short
  if (!cleanNumber || cleanNumber.length < 10) return false;
  
  // Brazilian numbers typically have 10-11 digits (with area code)
  // DDD (area code) in Brazil is 2 digits (11-99)
  if (cleanNumber.length > 13) return false;
  
  // Check if starts with country code 55 (Brazil) or has valid area code
  const hasBrazilCountryCode = cleanNumber.startsWith('55');
  const numberWithoutCountryCode = hasBrazilCountryCode ? cleanNumber.slice(2) : cleanNumber;
  
  // Extract area code (DDD)
  const areaCode = numberWithoutCountryCode.slice(0, 2);
  
  // Validate the area code (Brazilian DDDs range from 11 to 99)
  const areaCodeNum = parseInt(areaCode, 10);
  if (areaCodeNum < 11 || areaCodeNum > 99) return false;
  
  // Check the length of the remaining phone number
  const phoneNumberWithoutAreaCode = numberWithoutCountryCode.slice(2);
  
  // Brazilian mobile numbers have 9 digits, landlines have 8
  const isValidLength = phoneNumberWithoutAreaCode.length === 8 || phoneNumberWithoutAreaCode.length === 9;
  
  // Mobile numbers in Brazil start with 9
  const isMobileValid = phoneNumberWithoutAreaCode.length === 9 && phoneNumberWithoutAreaCode.startsWith('9');
  
  // Landline numbers should have 8 digits
  const isLandlineValid = phoneNumberWithoutAreaCode.length === 8;
  
  return isValidLength && (isMobileValid || isLandlineValid);
};

// Function to format the Brazilian phone number for display
const formatBrazilianPhoneNumber = (number) => {
  if (!isValidBrazilianPhoneNumber(number)) return null;
  
  // Remove all non-numeric characters
  const cleanNumber = number.replace(/\D/g, '');
  
  // Handle numbers with country code
  const hasBrazilCountryCode = cleanNumber.startsWith('55');
  const numberWithoutCountryCode = hasBrazilCountryCode ? cleanNumber.slice(2) : cleanNumber;
  
  // Get area code
  const areaCode = numberWithoutCountryCode.slice(0, 2);
  
  // Get the phone part
  const phoneNumber = numberWithoutCountryCode.slice(2);
  
  // Format based on mobile (9 digits) or landline (8 digits)
  if (phoneNumber.length === 9) {
    // Mobile format: (XX) 9XXXX-XXXX
    return `🇧🇷 (${areaCode}) ${phoneNumber.slice(0, 1)}${phoneNumber.slice(1, 5)}-${phoneNumber.slice(5)}`;
  } else {
    // Landline format: (XX) XXXX-XXXX
    return `🇧🇷 (${areaCode}) ${phoneNumber.slice(0, 4)}-${phoneNumber.slice(4)}`;
  }
};

// Format phone number with LGPD masking when needed
const formatPhoneNumber = (number, isGroup, shouldHide = false, userProfile = "") => {
  // Handle group numbers differently
  if (isGroup) return number;
  
  // Check if it's a valid Brazilian phone number
  const isValidBrNumber = isValidBrazilianPhoneNumber(number);
  
  // If not valid, return null instead of a warning message
  if (!isValidBrNumber) return null;
  
  // If LGPD is enabled and number should be hidden for user profile
  if (shouldHide && userProfile === "user") {
    const formattedNumber = formatBrazilianPhoneNumber(number);
    if (!formattedNumber) return null;
    
    // Ensure proper masking of the phone number
    const parts = formattedNumber.split(' ');
    if (parts.length >= 3) {
      const lastPart = parts[parts.length - 1];
      const [firstHalf, secondHalf] = lastPart.split('-');
      return `🇧🇷 ${parts[1]} ${firstHalf.slice(0, -2)}**-**${secondHalf.slice(-2)}`;
    }
    return formattedNumber;
  }
  
  // Return properly formatted Brazilian phone number
  return formatBrazilianPhoneNumber(number) || null;
};

const reducer = (state, action) => {
    if (action.type === "LOAD_CONTACTS") {
        const contacts = action.payload;
        const newContacts = [];

        contacts.forEach((contact) => {
            const contactIndex = state.findIndex((c) => c.id === contact.id);
            if (contactIndex !== -1) {
                state[contactIndex] = contact;
            } else {
                newContacts.push(contact);
            }
        });

        return [...state, ...newContacts];
    }

    if (action.type === "UPDATE_CONTACTS") {
        const contact = action.payload;
        const contactIndex = state.findIndex((c) => c.id === contact.id);

        if (contactIndex !== -1) {
            state[contactIndex] = contact;
            return [...state];
        } else {
            return [contact, ...state];
        }
    }

    if (action.type === "DELETE_CONTACT") {
        const contactId = action.payload;

        const contactIndex = state.findIndex((c) => c.id === contactId);
        if (contactIndex !== -1) {
            state.splice(contactIndex, 1);
        }
        return [...state];
    }

    if (action.type === "RESET") {
        return [];
    }
};

const useStyles = makeStyles((theme) => ({
    mainPaper: {
        flex: 1,
        padding: theme.spacing(1),
        overflowY: "scroll",
        ...theme.scrollbarStyles,
    },
}));

const Contacts = () => {
    const classes = useStyles();
    const history = useHistory();

    //   const socketManager = useContext(SocketContext);
    const { user, socket } = useContext(AuthContext);

    const [loading, setLoading] = useState(false);
    const [pageNumber, setPageNumber] = useState(1);
    const [searchParam, setSearchParam] = useState("");
    const [contacts, dispatch] = useReducer(reducer, []);
    const [selectedContactId, setSelectedContactId] = useState(null);
    const [contactModalOpen, setContactModalOpen] = useState(false);

    const [importContactModalOpen, setImportContactModalOpen] = useState(false);
    const [deletingContact, setDeletingContact] = useState(null);
    const [ImportContacts, setImportContacts] = useState(null);
    const [blockingContact, setBlockingContact] = useState(null);
    const [unBlockingContact, setUnBlockingContact] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [exportContact, setExportContact] = useState(false);
    const [confirmChatsOpen, setConfirmChatsOpen] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
    const [contactTicket, setContactTicket] = useState({});
    const fileUploadRef = useRef(null);
    const [selectedTags, setSelectedTags] = useState([]);
    const { setCurrentTicket } = useContext(TicketsContext);

    const { getAll: getAllSettings } = useCompanySettings();
    const [hideNum, setHideNum] = useState(false);
    const [enableLGPD, setEnableLGPD] = useState(false);
    useEffect(() => {

        async function fetchData() {

            const settingList = await getAllSettings(user.companyId);

            for (const [key, value] of Object.entries(settingList)) {
                
                if (key === "enableLGPD") setEnableLGPD(value === "enabled");
                if (key === "lgpdHideNumber") setHideNum(value === "enabled");
                
              }
        }
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleImportExcel = async () => {
        try {
            const formData = new FormData();
            formData.append("file", fileUploadRef.current.files[0]);
            await api.request({
                url: `/contacts/upload`,
                method: "POST",
                data: formData,
            });
            history.go(0);
        } catch (err) {
            toastError(err);
        }
    };

    useEffect(() => {
        dispatch({ type: "RESET" });
        setPageNumber(1);
    }, [searchParam, selectedTags]);

    useEffect(() => {
        setLoading(true);
        const delayDebounceFn = setTimeout(() => {
            const fetchContacts = async () => {
                try {
                    const { data } = await api.get("/contacts/", {
                        params: { searchParam, pageNumber, contactTag: JSON.stringify(selectedTags) },
                    });
                    dispatch({ type: "LOAD_CONTACTS", payload: data.contacts });
                    setHasMore(data.hasMore);
                    setLoading(false);
                } catch (err) {
                    toastError(err);
                }
            };
            fetchContacts();
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [searchParam, pageNumber, selectedTags]);

    useEffect(() => {
        const companyId = user.companyId;
        //    const socket = socketManager.GetSocket();

        const onContactEvent = (data) => {
            if (data.action === "update" || data.action === "create") {
                dispatch({ type: "UPDATE_CONTACTS", payload: data.contact });
            }

            if (data.action === "delete") {
                dispatch({ type: "DELETE_CONTACT", payload: +data.contactId });
            }
        };
        socket.on(`company-${companyId}-contact`, onContactEvent);

        return () => {
            socket.off(`company-${companyId}-contact`, onContactEvent);
        };
    }, [socket, user.companyId]);

    const handleSelectTicket = (ticket) => {
        const code = uuidv4();
        const { id, uuid } = ticket;
        setCurrentTicket({ id, uuid, code });
    }

    const handleCloseOrOpenTicket = (ticket) => {
        setNewTicketModalOpen(false);
        if (ticket !== undefined && ticket.uuid !== undefined) {
            handleSelectTicket(ticket);
            history.push(`/tickets/${ticket.uuid}`);
        }
    };

    const handleSelectedTags = (selecteds) => {
        const tags = selecteds.map((t) => t.id);
        setSelectedTags(tags);
    };

    const handleSearch = (event) => {
        setSearchParam(event.target.value.toLowerCase());
    };

    const handleOpenContactModal = () => {
        setSelectedContactId(null);
        setContactModalOpen(true);
    };

    const handleCloseContactModal = () => {
        setSelectedContactId(null);
        setContactModalOpen(false);
    };

    const hadleEditContact = (contactId) => {
        setSelectedContactId(contactId);
        setContactModalOpen(true);
    };

    const handleDeleteContact = async (contactId) => {
        try {
            await api.delete(`/contacts/${contactId}`);
            toast.success(i18n.t("contacts.toasts.deleted"));
        } catch (err) {
            toastError(err);
        }
        setDeletingContact(null);
        setSearchParam("");
        setPageNumber(1);
    };

    const handleBlockContact = async (contactId) => {
        try {
            await api.put(`/contacts/block/${contactId}`, { active: false });
            toast.success("Contato bloqueado");
        } catch (err) {
            toastError(err);
        }
        setDeletingContact(null);
        setSearchParam("");
        setPageNumber(1);
        setBlockingContact(null);
    };

    const handleUnBlockContact = async (contactId) => {
        try {
            await api.put(`/contacts/block/${contactId}`, { active: true });
            toast.success("Contato desbloqueado");
        } catch (err) {
            toastError(err);
        }
        setDeletingContact(null);
        setSearchParam("");
        setPageNumber(1);
        setUnBlockingContact(null);
    };

    const handleimportContact = async () => {
        try {
            await api.post("/contacts/import");
            history.go(0);
            setImportContacts(false);
        } catch (err) {
            toastError(err);
            setImportContacts(false);
        }
    };

    const handleimportChats = async () => {
        try {
            await api.post("/contacts/import/chats");
            history.go(0);
        } catch (err) {
            toastError(err);
        }
    };

    const loadMore = () => {
        setPageNumber((prevState) => prevState + 1);
    };

    const handleScroll = (e) => {
        if (!hasMore || loading) return;
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - (scrollTop + 100) < clientHeight) {
            loadMore();
        }
    };

    return (
        <MainContainer className={classes.mainContainer}>
            <NewTicketModal
                modalOpen={newTicketModalOpen}
                initialContact={contactTicket}
                onClose={(ticket) => {
                    handleCloseOrOpenTicket(ticket);
                }}
            />
            <ContactModal
                open={contactModalOpen}
                onClose={handleCloseContactModal}
                aria-labelledby="form-dialog-title"
                contactId={selectedContactId}
            ></ContactModal>
            <ConfirmationModal
                title={
                    deletingContact
                        ? `${i18n.t(
                            "contacts.confirmationModal.deleteTitle"
                        )} ${deletingContact.name}?`
                        : blockingContact
                            ? `Bloquear Contato ${blockingContact.name}?`
                            : unBlockingContact
                                ? `Desbloquear Contato ${unBlockingContact.name}?`
                                : ImportContacts
                                    ? `${i18n.t("contacts.confirmationModal.importTitlte")}`
                                    : `${i18n.t("contactListItems.confirmationModal.importTitlte")}`
                }
                open={confirmOpen}
                onClose={setConfirmOpen}
                onConfirm={(e) =>
                    deletingContact
                        ? handleDeleteContact(deletingContact.id)
                        : blockingContact
                            ? handleBlockContact(blockingContact.id)
                            : unBlockingContact
                                ? handleUnBlockContact(unBlockingContact.id)
                                : ImportContacts
                                    ? handleimportContact()
                                    : handleImportExcel()
                }
            >
                {exportContact
                    ?
                    `${i18n.t("contacts.confirmationModal.exportContact")}`
                    : deletingContact
                        ? `${i18n.t("contacts.confirmationModal.deleteMessage")}`
                        : blockingContact
                            ? `${i18n.t("contacts.confirmationModal.blockContact")}`
                            : unBlockingContact
                                ? `${i18n.t("contacts.confirmationModal.unblockContact")}`
                                : ImportContacts
                                    ? `${i18n.t("contacts.confirmationModal.importMessage")}`
                                    : `${i18n.t(
                                        "contactListItems.confirmationModal.importMessage"
                                    )}`}
            </ConfirmationModal>
            <ConfirmationModal
                title={i18n.t("contacts.confirmationModal.importChat")}
                open={confirmChatsOpen}
                onClose={setConfirmChatsOpen}
                onConfirm={(e) => handleimportChats()}
            >
                {i18n.t("contacts.confirmationModal.wantImport")}
            </ConfirmationModal>
            <MainHeader>
                <Title>{i18n.t("contacts.title")} ({contacts.length})</Title>
                <MainHeaderButtonsWrapper>
                    <TagsFilter
                        onFiltered={handleSelectedTags}
                    />
                    <TextField
                        placeholder={i18n.t("contacts.searchPlaceholder")}
                        type="search"
                        value={searchParam}
                        onChange={handleSearch}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon color="secondary" />
                                </InputAdornment>
                            ),
                        }}
                    />
                    <PopupState variant="popover" popupId="demo-popup-menu">
                        {(popupState) => (
                            <React.Fragment>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    {...bindTrigger(popupState)}
                                >
                                    Importar / Exportar
                                    <ArrowDropDown />
                                </Button>
                                <Menu {...bindMenu(popupState)}>
                                    <MenuItem
                                        onClick={() => {
                                            setConfirmOpen(true);
                                            setImportContacts(true);
                                            popupState.close();
                                        }}
                                    >
                                        <ContactPhone
                                            fontSize="small"
                                            color="primary"
                                            style={{
                                                marginRight: 10,
                                            }}
                                        />
                                        {i18n.t("contacts.menu.importYourPhone")}
                                    </MenuItem>
                                    <MenuItem
                                        onClick={() => { setImportContactModalOpen(true) }}

                                    >
                                        <Backup
                                            fontSize="small"
                                            color="primary"
                                            style={{
                                                marginRight: 10,
                                            }}
                                        />
                                        {i18n.t("contacts.menu.importToExcel")}

                                    </MenuItem>
                                </Menu>
                            </React.Fragment>
                        )}
                    </PopupState>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleOpenContactModal}
                    >
                        {i18n.t("contacts.buttons.add")}
                    </Button>
                </MainHeaderButtonsWrapper>
            </MainHeader>

            {importContactModalOpen && (
                <ContactImportWpModal
                    isOpen={importContactModalOpen}
                    handleClose={() => setImportContactModalOpen(false)}
                    selectedTags={selectedTags}
                    hideNum={hideNum}
                    userProfile={user.profile}
                />
            )}
            <Paper
                className={classes.mainPaper}
                variant="outlined"
                onScroll={handleScroll}
            >
                <>
                    <input
                        style={{ display: "none" }}
                        id="upload"
                        name="file"
                        type="file"
                        accept=".xls,.xlsx"
                        onChange={() => {
                            setConfirmOpen(true);
                        }}
                        ref={fileUploadRef}
                    />
                </>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox" />
                            <TableCell>
                                {i18n.t("contacts.table.name")}
                            </TableCell>
                            <TableCell align="center">
                                {i18n.t("contacts.table.whatsapp")}
                            </TableCell>
                            <TableCell align="center">
                                {i18n.t("contacts.table.email")}
                            </TableCell>
                            <TableCell align="center">
                                {i18n.t("contacts.table.whatsapp")}
                            </TableCell>
                            <TableCell align="center">{"Status"}</TableCell>
                            <TableCell align="center">
                                {i18n.t("contacts.table.actions")}
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <>
                            {contacts.map((contact) => {
                                // Skip rendering contacts with invalid phone numbers
                                const formattedNumber = formatPhoneNumber(
                                    contact.number,
                                    contact.isGroup,
                                    enableLGPD && hideNum,
                                    user.profile
                                );
                                
                                // If the number is invalid (null or undefined), don't render this row
                                if (!formattedNumber) return null;
                                
                                return (
                                    <TableRow key={contact.id}>
                                        <TableCell style={{ paddingRight: 0 }}>
                                            {<Avatar src={`${contact?.urlPicture}`} />}
                                        </TableCell>
                                        <TableCell>{contact.name}</TableCell>
                                        <TableCell align="center">
                                            {formattedNumber}
                                        </TableCell>
                                        <TableCell align="center">
                                            {contact.email}
                                        </TableCell>
                                        <TableCell>{contact?.whatsapp?.name}</TableCell>
                                        <TableCell align="center">
                                            {contact.active ? (
                                                <CheckCircleIcon
                                                    style={{ color: "green" }}
                                                    fontSize="small"
                                                />
                                            ) : (
                                                <CancelIcon
                                                    style={{ color: "red" }}
                                                    fontSize="small"
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            <IconButton
                                                size="small"
                                                disabled={!contact.active || !isValidBrazilianPhoneNumber(contact.number)}
                                                onClick={() => {
                                                    setContactTicket(contact);
                                                    setNewTicketModalOpen(true);
                                                }}
                                            >
                                                {contact.channel === "whatsapp" && (<WhatsApp style={{ color: "green" }} />)}
                                                {contact.channel === "instagram" && (<Instagram style={{ color: "purple" }} />)}
                                                {contact.channel === "facebook" && (<Facebook style={{ color: "blue" }} />)}
                                            </IconButton>

                                            <IconButton
                                                size="small"
                                                onClick={() =>
                                                    hadleEditContact(contact.id)
                                                }
                                            >
                                                <EditIcon color="secondary" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={
                                                    contact.active
                                                        ? () => {
                                                            setConfirmOpen(true);
                                                            setBlockingContact(
                                                                contact
                                                            );
                                                        }
                                                        : () => {
                                                            setConfirmOpen(true);
                                                            setUnBlockingContact(
                                                                contact
                                                            );
                                                        }
                                                }
                                            >
                                                {contact.active ? (
                                                    <BlockIcon color="secondary" />
                                                ) : (
                                                    <CheckCircleIcon color="secondary" />
                                                )}
                                            </IconButton>
                                            <Can
                                                role={user.profile}
                                                perform="contacts-page:deleteContact"
                                                yes={() => (
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            setConfirmOpen(true);
                                                            setDeletingContact(
                                                                contact
                                                            );
                                                        }}
                                                    >
                                                        <DeleteOutlineIcon color="secondary" />
                                                    </IconButton>
                                                )}
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {loading && <TableRowSkeleton avatar columns={6} />}
                        </>
                    </TableBody>
                </Table>
            </Paper>
        </MainContainer >
    );
};

export default Contacts;