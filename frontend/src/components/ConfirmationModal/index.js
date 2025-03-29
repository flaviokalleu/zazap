import React, { useContext, useEffect, useState } from "react";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Typography from "@material-ui/core/Typography";
import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Grid, Select, MenuItem, ListItemText } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import { Face, Facebook, WhatsApp } from "@material-ui/icons";
import { Instagram } from "@mui/icons-material";
import { i18n } from "../../translate/i18n";
import ButtonWithSpinner from "../ButtonWithSpinner";

const useStyles = makeStyles((theme) => ({
  online: {
    fontSize: 11,
    color: "#25d366",
  },
  offline: {
    fontSize: 11,
    color: "#e1306c",
  },
}));

const ConfirmationModal = ({
  title,
  children,
  open,
  onClose,
  onConfirm,
  isCellPhone,
  onSave,
}) => {
  const classes = useStyles();
  const [selectedWhatsapp, setSelectedWhatsapp] = useState("");
  const [whatsapps, setWhatsapps] = useState([]);
  const { user } = useContext(AuthContext);
  const { companyId } = user;

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const fetchContacts = async () => {
        api
          // .get(`/whatsapp/filter`, { params: { companyId, session: 0, channel: channelFilter } })
          .get(`/whatsapp`, { params: { companyId, session: 0 } })
          .then(({ data }) => setWhatsapps(data));
      };

      fetchContacts();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [open]);

  const IconChannel = (channel) => {
    switch (channel) {
      case "facebook":
        return (
          <Facebook style={{ color: "#3b5998", verticalAlign: "middle" }} />
        );
      case "instagram":
        return (
          <Instagram style={{ color: "#e1306c", verticalAlign: "middle" }} />
        );
      case "whatsapp":
        return (
          <WhatsApp style={{ color: "#25d366", verticalAlign: "middle" }} />
        );
      default:
        return "error";
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={() => onClose(false)}
      aria-labelledby="confirm-dialog"
    >
      <DialogTitle id="confirm-dialog">{title}</DialogTitle>
      <DialogContent dividers>
        <Typography>{children}</Typography>
        {isCellPhone && (
          <Grid style={{ width: 300, marginTop: 10 }} container>
            <Grid xs={12} item>
              <Select
                required
                fullWidth
                displayEmpty
                variant="outlined"
                value={selectedWhatsapp}
                onChange={(e) => {
                  setSelectedWhatsapp(e.target.value);
                }}
                MenuProps={{
                  anchorOrigin: {
                    vertical: "bottom",
                    horizontal: "left",
                  },
                  transformOrigin: {
                    vertical: "top",
                    horizontal: "left",
                  },
                  getContentAnchorEl: null,
                }}
                renderValue={() => {
                  if (selectedWhatsapp === "") {
                    return "Selecione uma Conexão";
                  }
                  const whatsapp = whatsapps.find(
                    (w) => w.id === selectedWhatsapp
                  );
                  return whatsapp?.name;
                }}
              >
                {whatsapps?.length > 0 &&
                  whatsapps.map((whatsapp, key) => (
                    <MenuItem dense key={key} value={whatsapp.id}>
                      <ListItemText
                        primary={
                          <>
                            {IconChannel(whatsapp.channel)}
                            <Typography
                              component="span"
                              style={{
                                fontSize: 14,
                                marginLeft: "10px",
                                display: "inline-flex",
                                alignItems: "center",
                                lineHeight: "2",
                              }}
                            >
                              {whatsapp.name} &nbsp;{" "}
                              <p
                                className={
                                  whatsapp.status === "CONNECTED"
                                    ? classes.online
                                    : classes.offline
                                }
                              >
                                ({whatsapp.status})
                              </p>
                            </Typography>
                          </>
                        }
                      />
                    </MenuItem>
                  ))}
              </Select>
            </Grid>
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          onClick={() => onClose(false)}
          color="default"
        >
          {i18n.t("confirmationModal.buttons.cancel")}
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            if (isCellPhone) {
              onSave(selectedWhatsapp);
            }
            onClose(false);
            onConfirm();
          }}
          color="secondary"
        >
          {i18n.t("confirmationModal.buttons.confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationModal;
