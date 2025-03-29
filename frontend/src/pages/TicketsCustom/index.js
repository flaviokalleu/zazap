import React, { useState, useContext, useEffect } from "react";
import { useParams } from "react-router-dom";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import { makeStyles } from "@material-ui/core/styles";
import TicketsManager from "../../components/TicketsManagerTabs";
import Ticket from "../../components/Ticket";
import { QueueSelectedProvider } from "../../context/QueuesSelected/QueuesSelectedContext";
import { AuthContext } from "../../context/Auth/AuthContext";
import logo from "../../assets/logo.png";
import logoDark from "../../assets/logo-black.png";

const defaultTicketsManagerWidth = 1100; // Novo tamanho dobrado

const useStyles = makeStyles(theme => ({
    chatContainer: {
        flex: 1,
        padding: theme.spacing(1), // Reduzido para menor padding
        height: `calc(100% - 48px)`,
        overflowY: "hidden",
        margin: 0, // Remove qualquer margem extra
    },
    chatPapper: {
        display: "flex",
        height: "100%",
        width: "100%", // Garante que ocupe toda a largura
    },
    contactsWrapper: {
        display: "flex",
        height: "100%",
        flexDirection: "column",
        overflowY: "hidden",
        width: defaultTicketsManagerWidth, // Tamanho fixo atualizado
    },
    messagesWrapper: {
        display: "flex",
        height: "100%",
        flexDirection: "column",
        flexGrow: 1,
    },
    welcomeMsg: {
        background: theme.palette.tabHeaderBackground,
        display: "flex",
        justifyContent: "center", // Centraliza o conteúdo
        alignItems: "center",
        height: "100%",
        textAlign: "center",
        padding: theme.spacing(2), // Adiciona padding interno se necessário
    },
    logo: {
        width: '70%', // Ajuste do tamanho do logo
        height: 'auto',
        margin: '0 auto',
    },
}));

const TicketsCustom = () => {
    const { user } = useContext(AuthContext);
    const classes = useStyles();
    const { ticketId } = useParams();

    const [ticketsManagerWidth, setTicketsManagerWidth] = useState(defaultTicketsManagerWidth);

    useEffect(() => {
        if (user?.defaultTicketsManagerWidth) {
            setTicketsManagerWidth(user.defaultTicketsManagerWidth);
        }
    }, [user]);

    return (
        <QueueSelectedProvider>
            <div className={classes.chatContainer}>
                <div className={classes.chatPapper}>
                    <Grid container spacing={0}>
                        <Grid item xs={4} className={classes.contactsWrapper}>
                            <TicketsManager />
                        </Grid>
                        <Grid item xs={8} className={classes.messagesWrapper}>
                            {ticketId ? (
                                <Ticket />
                            ) : (
                                <Paper square variant="outlined" className={classes.welcomeMsg}>
                                    {/* PLW DESIGN LOGO */}
                                    <img
                                        className={classes.logo}
                                        src={user?.darkMode ? logoDark : logo}
                                        alt="Logo"
                                    />
                                    {/* PLW DESIGN LOGO */}
                                    {/*<span>{i18n.t("chat.noTicketMessage")}</span>*/}
                                </Paper>
                            )}
                        </Grid>
                    </Grid>
                </div>
            </div>
        </QueueSelectedProvider>
    );
};

export default TicketsCustom;
