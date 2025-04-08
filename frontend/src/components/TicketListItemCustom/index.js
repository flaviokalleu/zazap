import React, { useState, useEffect, useRef, useContext, useCallback } from "react";

import { useHistory, useParams } from "react-router-dom";
import { parseISO, format, isSameDay } from "date-fns";
import clsx from "clsx";

import { makeStyles, useTheme } from "@material-ui/core/styles";
import { green, grey } from "@material-ui/core/colors";
import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import ButtonWithSpinner from "../ButtonWithSpinner";
import MarkdownWrapper from "../MarkdownWrapper";
import { List, Tooltip } from "@material-ui/core";
import { AuthContext } from "../../context/Auth/AuthContext";
import { TicketsContext } from "../../context/Tickets/TicketsContext";
import toastError from "../../errors/toastError";
import { v4 as uuidv4 } from "uuid";

import GroupIcon from '@material-ui/icons/Group';
import ContactTag from "../ContactTag";
import ConnectionIcon from "../ConnectionIcon";
import AcceptTicketWithouSelectQueue from "../AcceptTicketWithoutQueueModal";
import TransferTicketModalCustom from "../TransferTicketModalCustom";
import ShowTicketOpen from "../ShowTicketOpenModal";
import { isNil } from "lodash";
import { toast } from "react-toastify";
import { Done, HighlightOff, Replay, SwapHoriz } from "@material-ui/icons";
import useCompanySettings from "../../hooks/useSettings/companySettings";
import { 
    Avatar, 
    Badge, 
    ListItemAvatar, 
    ListItem, 
    ListItemSecondaryAction, 
    ListItemText, 
    Typography, 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    IconButton, 
    Paper, 
    Divider 
} from "@material-ui/core";
import { blue } from "@material-ui/core/colors";
import VisibilityIcon from "@material-ui/icons/Visibility";
import CloseIcon from "@material-ui/icons/Close";
import MessageIcon from "@material-ui/icons/Message";

const useStyles = makeStyles((theme) => ({
    ticket: {
        position: "relative"
    },

    pendingTicket: {
        cursor: "unset",
    },
    queueTag: {
        background: "#FCFCFC",
        color: "#000",
        marginRight: 1,
        padding: 1,
        fontWeight: 'bold',
        borderRadius: 3,
        fontSize: "0.5em",
        whiteSpace: "nowrap"
    },
    noTicketsDiv: {
        display: "flex",
        height: "100px",
        margin: 40,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
    },
    newMessagesCount: {
        justifySelf: "flex-end",
        textAlign: "right",
        position: "relative",
        top: 0,
        color: "green",
        fontWeight: "bold",
        marginRight: "10px",
        borderRadius: 0,
    },
    noTicketsText: {
        textAlign: "center",
        color: "rgb(146, 104, 104)",
        fontSize: "14px",
        lineHeight: "1.4",
    },
    connectionTag: {
        background: "green",
        color: "#FFF",
        marginRight: 1,
        padding: 1,
        fontWeight: 'bold',
        borderRadius: 3,
        fontSize: "0.6em",
    },
    noTicketsTitle: {
        textAlign: "center",
        fontSize: "16px",
        fontWeight: "600",
        margin: "0px",
    },

    contactNameWrapper: {
        display: "flex",
        justifyContent: "space-between",
        marginLeft: "5px",
        fontWeight: "bold",
        color: theme.mode === 'light' ? "black" : "white",
    },

    lastMessageTime: {
        justifySelf: "flex-end",
        textAlign: "right",
        position: "relative",
        top: -30,
        marginRight: "1px",
        color: theme.mode === 'light' ? "black" : grey[400],
    },

    lastMessageTimeUnread: {
        justifySelf: "flex-end",
        textAlign: "right",
        position: "relative",
        top: -30,
        color: "green",
        fontWeight: "bold",
        marginRight: "1px",
    },

    closedBadge: {
        alignSelf: "center",
        justifySelf: "flex-end",
        marginRight: 32,
        marginLeft: "auto",
    },

    contactLastMessage: {
        paddingRight: "0%",
        marginLeft: "5px",
        color: theme.mode === 'light' ? "black" : grey[400],
    },

    contactLastMessageUnread: {
        paddingRight: 20,
        fontWeight: "bold",
        color: theme.mode === 'light' ? "black" : grey[400],
        width: "50%"
    },

    badgeStyle: {
        color: "white",
        backgroundColor: green[500],
    },

    acceptButton: {
        position: "absolute",
        right: "1px",
    },

    ticketQueueColor: {
        flex: "none",
        height: "100%",
        position: "absolute",
        top: "0%",
        left: "0%",
    },

    ticketInfo: {
        position: "relative",
        top: -13
    },
    secondaryContentSecond: {
        display: 'flex',
        alignItems: "flex-start",
        flexWrap: "nowrap",
        flexDirection: "row",
        alignContent: "flex-start",
    },
    ticketInfo1: {
        position: "relative",
        top: 13,
        right: 0
    },
    Radiusdot: {
        "& .MuiBadge-badge": {
            borderRadius: 2,
            position: "inherit",
            height: 16,
            margin: 2,
            padding: 3
        },
        "& .MuiBadge-anchorOriginTopRightRectangle": {
            transform: "scale(1) translate(0%, -40%)",
        },
    },
    connectionIcon: {
        marginRight: theme.spacing(1)
    },
    dialogTitle: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: theme.palette.primary.main,
        color: "white",
        paddingBottom: theme.spacing(1),
    },
    closeButton: {
        color: "white",
    },
    messagesContainer: {
        height: "60vh", // Use viewport height instead of fixed pixels
        maxHeight: "600px", // Set a maximum height
        overflowY: "auto",
        padding: theme.spacing(2),
        scrollBehavior: "smooth", // Add smooth scrolling
    },
    scrollToBottomBtn: {
        position: "absolute",
        bottom: theme.spacing(2),
        right: theme.spacing(2),
        zIndex: 1000,
        backgroundColor: theme.palette.primary.main,
        color: "white",
        "&:hover": {
            backgroundColor: theme.palette.primary.dark,
        },
    },
    messageItem: {
        padding: theme.spacing(1),
        margin: theme.spacing(1, 0),
        borderRadius: theme.spacing(1),
        maxWidth: "80%",
        position: "relative",
    },
    fromMe: {
        backgroundColor: "#dcf8c6",
        marginLeft: "auto",
    },
    fromThem: {
        backgroundColor: "#f5f5f5",
    },
    messageTime: {
        fontSize: "0.75rem",
        color: grey[500],
        position: "absolute",
        bottom: "2px",
        right: "8px",
    },
    messageText: {
        marginBottom: theme.spacing(2),
        wordBreak: "break-word",
    },
    emptyMessages: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        color: grey[500],
    },
    messagesHeader: {
        display: "flex",
        alignItems: "center",
        padding: theme.spacing(1, 2),
        backgroundColor: theme.palette.grey[100],
    },
    messageAvatar: {
        marginRight: theme.spacing(1),
    },
    messageIcon: {
        marginRight: theme.spacing(1),
        color: theme.palette.primary.main,
    },
    loadingMessages: {
        display: "flex",
        justifyContent: "center",
        padding: theme.spacing(3),
    }
}));

const TicketListItemCustom = ({ setTabOpen, ticket }) => {
    const classes = useStyles();
    const theme = useTheme();
    const history = useHistory();
    const [loading, setLoading] = useState(false);
    const [acceptTicketWithouSelectQueueOpen, setAcceptTicketWithouSelectQueueOpen] = useState(false);
    const [transferTicketModalOpen, setTransferTicketModalOpen] = useState(false);

    const [openAlert, setOpenAlert] = useState(false);
    const [userTicketOpen, setUserTicketOpen] = useState("");
    const [queueTicketOpen, setQueueTicketOpen] = useState("");
    const [openTicketMessageDialog, setOpenTicketMessageDialog] = useState(false);
    
    // New states for the ticket messages
    const [ticketMessages, setTicketMessages] = useState([]);
    const [loadingMessages, setLoadingMessages] = useState(false);

    const { ticketId } = useParams();
    const isMounted = useRef(true);
    const { setCurrentTicket } = useContext(TicketsContext);
    const { user } = useContext(AuthContext);

    const { get: getSetting } = useCompanySettings();

    useEffect(() => {
        console.log("======== TicketListItemCustom ===========")
        console.log(ticket)
        console.log("=========================================")
    }, [ticket]);

    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

    const handleOpenAcceptTicketWithouSelectQueue = useCallback(() => {
        setAcceptTicketWithouSelectQueueOpen(true);
    }, []);

    const handleCloseTicket = async (id) => {
        const setting = await getSetting(
            {
                "column": "requiredTag"
            }
        );

        if (setting.requiredTag === "enabled") {
            //verificar se tem uma tag   
            try {
                const contactTags = await api.get(`/contactTags/${ticket.contact.id}`);
                if (!contactTags.data.tags) {
                    toast.warning(i18n.t("messagesList.header.buttons.requiredTag"))
                } else {
                    await api.put(`/tickets/${id}`, {
                        status: "closed",
                        userId: user?.id || null,
                    });

                    if (isMounted.current) {
                        setLoading(false);
                    }

                    history.push(`/tickets/`);
                }
            } catch (err) {
                setLoading(false);
                toastError(err);
            }
        } else {
            setLoading(true);
            try {
                await api.put(`/tickets/${id}`, {
                    status: "closed",
                    userId: user?.id || null,
                });

            } catch (err) {
                setLoading(false);
                toastError(err);
            }
            if (isMounted.current) {
                setLoading(false);
            }

            history.push(`/tickets/`);
        }
    };

    const handleCloseIgnoreTicket = async (id) => {
        setLoading(true);
        try {
            await api.put(`/tickets/${id}`, {
                status: "closed",
                userId: user?.id || null,
                sendFarewellMessage: false,
                amountUsedBotQueues: 0
            });

        } catch (err) {
            setLoading(false);
            toastError(err);
        }
        if (isMounted.current) {
            setLoading(false);
        }

        history.push(`/tickets/`);
    };

    const truncate = (str, len) => {
        if (!isNil(str)) {
            if (str.length > len) {
                return str.substring(0, len) + "...";
            }
            return str;
        }
    };

    const handleCloseTransferTicketModal = useCallback(() => {
        if (isMounted.current) {
            setTransferTicketModalOpen(false);
        }
    }, []);

    const handleOpenTransferModal = () => {
        setLoading(true)
        setTransferTicketModalOpen(true);
        if (isMounted.current) {
            setLoading(false);
        }
        handleSelectTicket(ticket);
        history.push(`/tickets/${ticket.uuid}`);
    }

    const handleAcepptTicket = async (id) => {
        setLoading(true);
        try {
            const otherTicket = await api.put(`/tickets/${id}`, ({
                status: ticket.isGroup && ticket.channel === 'whatsapp' ? "group" : "open",
                userId: user?.id,
            }));

            if (otherTicket.data.id !== ticket.id) {
                if (otherTicket.data.userId !== user?.id) {
                    setOpenAlert(true);
                    setUserTicketOpen(otherTicket.data.user.name);
                    setQueueTicketOpen(otherTicket.data.queue.name);
                } else {
                    setLoading(false);
                    setTabOpen(ticket.isGroup ? "group" : "open");
                    handleSelectTicket(otherTicket.data);
                    history.push(`/tickets/${otherTicket.uuid}`);
                }
            } else {
                let setting;

                try {
                    setting = await getSetting({
                        "column": "sendGreetingAccepted"
                    });
                } catch (err) {
                    toastError(err);
                }

                if (setting.sendGreetingAccepted === "enabled" && (!ticket.isGroup || ticket.whatsapp?.groupAsTicket === "enabled")) {
                    handleSendMessage(ticket.id);
                }
                if (isMounted.current) {
                    setLoading(false);
                }

                setTabOpen(ticket.isGroup ? "group" : "open");
                handleSelectTicket(ticket);
                history.push(`/tickets/${ticket.uuid}`);
            }
        } catch (err) {
            setLoading(false);
            toastError(err);
        }
    };

    const handleSendMessage = async (id) => {
        let setting;

        try {
            setting = await getSetting({
                "column": "greetingAcceptedMessage"
            })
        } catch (err) {
            toastError(err);
        }

        const msg = `${setting.greetingAcceptedMessage}`;
        const message = {
            read: 1,
            fromMe: true,
            mediaUrl: "",
            body: `${msg.trim()}`,
        };
        try {
            await api.post(`/messages/${id}`, message);
        } catch (err) {
            toastError(err);
        }
    };

    const handleCloseAlert = useCallback(() => {
        setOpenAlert(false);
        setLoading(false);
    }, []);

    const handleSelectTicket = (ticket) => {
        const code = uuidv4();
        const { id, uuid } = ticket;
        setCurrentTicket({ id, uuid, code });
    };

    // Function to fetch messages for the ticket
    const fetchTicketMessages = async (ticketId) => {
        if (!ticketId) return;
        
        setLoadingMessages(true);
        try {
            const { data } = await api.get(`/messages/${ticketId}`);
            if (isMounted.current) {
                setTicketMessages(data.messages);
            }
        } catch (err) {
            toastError(err);
        } finally {
            setLoadingMessages(false);
        }
    };

    // Handle opening the message dialog
    const handleOpenMessageDialog = (e) => {
        e.stopPropagation();
        setOpenTicketMessageDialog(true);
        fetchTicketMessages(ticket.id);
    };

    return (
        <React.Fragment key={ticket.id}>
            {openAlert && (
                <ShowTicketOpen
                    isOpen={openAlert}
                    handleClose={handleCloseAlert}
                    user={userTicketOpen}
                    queue={queueTicketOpen}
                />
            )}
            {acceptTicketWithouSelectQueueOpen && (
                <AcceptTicketWithouSelectQueue
                    modalOpen={acceptTicketWithouSelectQueueOpen}
                    onClose={(e) => setAcceptTicketWithouSelectQueueOpen(false)}
                    ticketId={ticket.id}
                    ticket={ticket}
                />
            )}
            {transferTicketModalOpen && (
                <TransferTicketModalCustom
                    modalOpen={transferTicketModalOpen}
                    onClose={handleCloseTransferTicketModal}
                    ticketid={ticket.id}
                    ticket={ticket}
                />
            )}
            
            {/* Improved Message Dialog */}
            <Dialog 
                open={openTicketMessageDialog} 
                onClose={() => setOpenTicketMessageDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle disableTypography className={classes.dialogTitle}>
                    <Typography variant="h6">
                        Espiando a conversa
                    </Typography>
                    <IconButton 
                        aria-label="close" 
                        className={classes.closeButton} 
                        onClick={() => setOpenTicketMessageDialog(false)}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                
                <div className={classes.messagesHeader}>
                    <Avatar 
                        src={ticket?.contact?.urlPicture}
                        className={classes.messageAvatar}
                    />
                    <div>
                        <Typography variant="subtitle1">
                            {ticket.contact?.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                            {ticket.whatsapp?.name || ticket.channel}
                        </Typography>
                    </div>
                </div>
                
                <Divider />
                
                <DialogContent className={classes.messagesContainer}>
                    {loadingMessages ? (
                        <div className={classes.loadingMessages}>
                            <Typography>Carregando mensagens...</Typography>
                        </div>
                    ) : ticketMessages.length === 0 ? (
                        <div className={classes.emptyMessages}>
                            <MessageIcon fontSize="large" />
                            <Typography variant="body1">
                                {i18n.t("ticketsList.noMessages")}
                            </Typography>
                        </div>
                    ) : (
                        ticketMessages.map((message) => (
                            <Paper 
                                key={message.id} 
                                className={clsx(
                                    classes.messageItem, 
                                    message.fromMe ? classes.fromMe : classes.fromThem
                                )}
                                elevation={0}
                            >
                                <Typography className={classes.messageText}>
                                    {message.body.includes('data:image/png;base64') ? (
                                        <MarkdownWrapper>Localização</MarkdownWrapper>
                                    ) : message.body.includes('BEGIN:VCARD') ? (
                                        <MarkdownWrapper>Contato</MarkdownWrapper>
                                    ) : (
                                        <MarkdownWrapper>{message.body}</MarkdownWrapper>
                                    )}
                                </Typography>
                                <Typography variant="caption" className={classes.messageTime}>
                                    {format(parseISO(message.createdAt), "HH:mm")}
                                </Typography>
                            </Paper>
                        ))
                    )}
                </DialogContent>
            </Dialog>
            
            <ListItem
                button
                dense
                onClick={(e) => {
                    console.log('e', e)
                    const isCheckboxClicked = (e.target.tagName.toLowerCase() === 'input' && e.target.type === 'checkbox')
                        || (e.target.tagName.toLowerCase() === 'svg' && e.target.type === undefined)
                        || (e.target.tagName.toLowerCase() === 'path' && e.target.type === undefined);
                    // Se o clique foi no Checkbox, não execute handleSelectTicket

                    if (isCheckboxClicked) return;

                    handleSelectTicket(ticket);
                }}
                selected={ticketId && ticketId === ticket.uuid}
                className={clsx(classes.ticket, {
                    [classes.pendingTicket]: ticket.status === "pending",
                })}
            >
                <ListItemAvatar
                    style={{ marginLeft: "-15px" }}
                >
                    <Avatar
                        style={{
                            width: "50px",
                            height: "50px",
                            borderRadius: "50%",
                        }}
                        src={`${ticket?.contact?.urlPicture}`}

                    />
                </ListItemAvatar>
                <ListItemText
                    disableTypography
                    primary={
                        <span className={classes.contactNameWrapper}>
                            <Typography
                                noWrap
                                component="span"
                                variant="body2"
                            >
                                {ticket.isGroup && ticket.channel === "whatsapp" && <GroupIcon fontSize="small" style={{ color: grey[700], marginBottom: '-1px', marginLeft: '5px' }} />} &nbsp;
                                {ticket.channel && <ConnectionIcon width="20" height="20" className={classes.connectionIcon} connectionType={ticket.channel} />} &nbsp;
                                {truncate(ticket.contact?.name, 60)}
                                <Tooltip title="Espiar Conversa">
                                    <VisibilityIcon
                                        onClick={handleOpenMessageDialog}
                                        fontSize="small"
                                        style={{
                                            color: blue[700],
                                            cursor: "pointer",
                                            marginLeft: 10,
                                            verticalAlign: "middle"
                                        }}
                                    />
                                </Tooltip>
                            </Typography>
                        </span>
                    }
                    secondary={
                        <span className={classes.contactNameWrapper}>
                            <Typography
                                className={Number(ticket.unreadMessages) > 0 ? classes.contactLastMessageUnread : classes.contactLastMessage}
                                noWrap
                                component="span"
                                variant="body2"
                            >
                                {ticket.lastMessage ? (
                                    <>
                                        {ticket.lastMessage.includes('data:image/png;base64') ?
                                            <MarkdownWrapper>Localização</MarkdownWrapper> :
                                            <> {ticket.lastMessage.includes('BEGIN:VCARD') ?
                                                <MarkdownWrapper>Contato</MarkdownWrapper> :
                                                <MarkdownWrapper>{truncate(ticket.lastMessage, 40)}</MarkdownWrapper>}
                                            </>
                                        }
                                    </>
                                ) : (
                                    <br />
                                )}
                                <span className={classes.secondaryContentSecond} >
                                    {ticket?.whatsapp ? <Badge className={classes.connectionTag} style={{ backgroundColor: ticket.channel === "whatsapp" ? "#25D366" : ticket.channel === "facebook" ? "#4267B2" : "#E1306C" }}>{ticket.whatsapp?.name.toUpperCase()}</Badge> : <br></br>}
                                    {<Badge style={{ backgroundColor: ticket.queue?.color || "#7c7c7c" }} className={classes.connectionTag}>{ticket.queueId ? ticket.queue?.name.toUpperCase() : ticket.status === "lgpd" ? "LGPD" : "SEM FILA"}</Badge>}
                                    {ticket?.user && (<Badge style={{ backgroundColor: "#000000" }} className={classes.connectionTag}>{ticket.user?.name.toUpperCase()}</Badge>)}
                                </span>
                                <span className={classes.secondaryContentSecond} >
                                    {
                                        ticket.tags?.map((tag) => {
                                            return (
                                                <ContactTag tag={tag} key={`ticket-contact-tag-${ticket.id}-${tag.id}`} />
                                            );
                                        })
                                    }
                                </span>
                            </Typography>

                            <Badge
                                className={classes.newMessagesCount}
                                badgeContent={ticket.unreadMessages}
                                classes={{
                                    badge: classes.badgeStyle,
                                }}
                            />
                        </span>
                    }
                />
                <ListItemSecondaryAction>
                    {ticket.lastMessage && (
                        <>

                            <Typography
                                className={Number(ticket.unreadMessages) > 0 ? classes.lastMessageTimeUnread : classes.lastMessageTime}
                                component="span"
                                variant="body2"
                            >

                                {isSameDay(parseISO(ticket.updatedAt), new Date()) ? (
                                    <>{format(parseISO(ticket.updatedAt), "HH:mm")}</>
                                ) : (
                                    <>{format(parseISO(ticket.updatedAt), "dd/MM/yyyy")}</>
                                )}
                            </Typography>

                            <br />

                        </>
                    )}

                </ListItemSecondaryAction>
                <ListItemSecondaryAction>
                    <span className={classes.secondaryContentSecond}>
                        {(ticket.status === "pending" && (ticket.queueId === null || ticket.queueId === undefined)) && (
                            <ButtonWithSpinner
                                style={{ backgroundColor: 'transparent', boxShadow: 'none', border: 'none', color: theme.mode === "light" ? "#0872B9" : "#FFF", padding: '0px', borderRadius: "50%", right: '51px', fontSize: '0.6rem', bottom: '-30px', minWidth: '2em', width: 'auto' }}
                                variant="contained"
                                className={classes.acceptButton}
                                size="small"
                                loading={loading}
                                onClick={e => handleOpenAcceptTicketWithouSelectQueue()}
                            >
                                <Tooltip title={`${i18n.t("ticketsList.buttons.accept")}`}>
                                    <Done />
                                </Tooltip>
                            </ButtonWithSpinner>
                        )}
                    </span>
                    <span className={classes.secondaryContentSecond} >
                        {(ticket.status === "pending" && ticket.queueId !== null) && (
                            <ButtonWithSpinner
                                style={{ backgroundColor: 'transparent', boxShadow: 'none', border: 'none', color: theme.mode === "light" ? "#0872B9" : "#FFF", padding: '0px', borderRadius: "50%", right: '51px', fontSize: '0.6rem', bottom: '-30px', minWidth: '2em', width: 'auto' }}
                                variant="contained"
                                className={classes.acceptButton}
                                size="small"
                                loading={loading}
                                onClick={e => handleAcepptTicket(ticket.id)}
                            >
                                <Tooltip title={`${i18n.t("ticketsList.buttons.accept")}`}>
                                    <Done />
                                </Tooltip>
                            </ButtonWithSpinner>
                        )}
                    </span>
                    <span className={classes.secondaryContentSecond1} >
                        {(ticket.status === "pending" || ticket.status === "open" || ticket.status === "group") && (
                            <ButtonWithSpinner
                                style={{ backgroundColor: 'transparent', boxShadow: 'none', border: 'none', color: theme.mode === "light" ? "#0872B9" : "#FFF", padding: '0px', borderRadius: "50%", right: '26px', position: 'absolute', fontSize: '0.6rem', bottom: '-30px', minWidth: '2em', width: 'auto' }}
                                variant="contained"
                                className={classes.acceptButton}
                                size="small"
                                loading={loading}
                                onClick={handleOpenTransferModal}
                            >
                                <Tooltip title={`${i18n.t("ticketsList.buttons.transfer")}`}>
                                    <SwapHoriz />
                                </Tooltip>
                            </ButtonWithSpinner>
                        )}
                    </span>
                    <span className={classes.secondaryContentSecond} >
                        {(ticket.status === "open" || ticket.status === "group") && (
                            <ButtonWithSpinner
                                style={{ backgroundColor: 'transparent', boxShadow: 'none', border: 'none', color: theme.mode === "light" ? "#0872B9" : "#FFF", padding: '0px', bottom: '0px', borderRadius: "50%", right: '1px', fontSize: '0.6rem', bottom: '-30px', minWidth: '2em', width: 'auto' }}
                                variant="contained"
                                className={classes.acceptButton}
                                size="small"
                                loading={loading}
                                onClick={e => handleCloseTicket(ticket.id)}
                            >
                                <Tooltip title={`${i18n.t("ticketsList.buttons.closed")}`}>
                                    <HighlightOff />
                                </Tooltip>
                            </ButtonWithSpinner>
                        )}
                    </span>
                    <span className={classes.secondaryContentSecond} >
                        {((ticket.status === "pending" || ticket.status === "lgpd") && (user.userClosePendingTicket === "enabled" || user.profile === "admin")) && (
                            <ButtonWithSpinner
                                style={{ backgroundColor: 'transparent', boxShadow: 'none', border: 'none', color: theme.mode === "light" ? "#0872B9" : "#FFF", padding: '0px', bottom: '0px', borderRadius: "50%", right: '1px', fontSize: '0.6rem', bottom: '-30px', minWidth: '2em', width: 'auto' }}
                                variant="contained"
                                className={classes.acceptButton}
                                size="small"
                                loading={loading}
                                onClick={e => handleCloseIgnoreTicket(ticket.id)}
                            >
                                <Tooltip title={`${i18n.t("ticketsList.buttons.ignore")}`}>
                                    <HighlightOff />
                                </Tooltip>
                            </ButtonWithSpinner>
                        )}
                    </span>
                    <span className={classes.secondaryContentSecond} >
                    {(ticket.status === "closed" && (ticket.queueId === null || ticket.queueId === undefined)) && (
                            <ButtonWithSpinner
                                //color="primary"
                                style={{ backgroundColor: 'transparent', boxShadow: 'none', border: 'none', color: theme.mode === "light" ? "#0872B9" : "#FFF", padding: '0px', bottom: '0px', borderRadius: "50%", right: '1px', fontSize: '0.6rem', bottom: '-30px', minWidth: '2em', width: 'auto' }}
                                variant="contained"
                                className={classes.acceptButton}
                                size="small"
                                loading={loading}
                                onClick={e => handleOpenAcceptTicketWithouSelectQueue()}
                            >
                                <Tooltip title={`${i18n.t("ticketsList.buttons.reopen")}`}>
                                    <Replay />
                                </Tooltip>
                            </ButtonWithSpinner>

                        )}
                    </span>
                    <span className={classes.secondaryContentSecond} >
                        {(ticket.status === "closed" && ticket.queueId !== null) && (
                            <ButtonWithSpinner
                                //color="primary"
                                style={{ backgroundColor: 'transparent', boxShadow: 'none', border: 'none', color: theme.mode === "light" ? "#0872B9" : "#FFF", padding: '0px', bottom: '0px', borderRadius: "50%", right: '1px', fontSize: '0.6rem', bottom: '-30px', minWidth: '2em', width: 'auto' }}
                                variant="contained"
                                className={classes.acceptButton}
                                size="small"
                                loading={loading}
                                onClick={e => handleAcepptTicket(ticket.id)}
                            >
                                <Tooltip title={`${i18n.t("ticketsList.buttons.reopen")}`}>
                                    <Replay />
                                </Tooltip>
                            </ButtonWithSpinner>

                        )}
                    </span>
                </ListItemSecondaryAction>
            </ListItem>
            {/* <Divider variant="inset" component="li" /> */}
        </React.Fragment>
    );
};

export default TicketListItemCustom;