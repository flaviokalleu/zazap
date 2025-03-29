import React, { useState, useEffect, useRef } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { Stack } from "@mui/material";
import { FormControl, Grid, Paper } from "@material-ui/core";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
  },
  textField: {
    marginRight: theme.spacing(1),
    flex: 1,
  },

  extraAttr: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  btnWrapper: {
    position: "relative",
  },

  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },
}));

const DialogflowSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, "Too Short!")
    .max(50, "Too Long!")
    .required("Required"),
  // projectName: Yup.string()
  //   .min(3, "Too Short!")
  //   .max(100, "Too Long!")
  //   .required(),
  // jsonContent: Yup.string().min(3, "Too Short!").required(),
  // language: Yup.string().min(2, "Too Short!").max(50, "Too Long!").required(),
});

const FlowBuilderTypebotModal = ({ open, onSave, data, onUpdate, close }) => {
  const classes = useStyles();
  const isMounted = useRef(true);

  const initialState = {
    type: "typebot",
    name: "",
    projectName: "",
    jsonContent: "",
    language: "",
    urlN8N: "",
    typebotDelayMessage: 1000,
    typebotExpires: 1,
    typebotKeywordFinish: "",
    typebotKeywordRestart: "",
    typebotRestartMessage: "",
    typebotSlug: "",
    typebotUnknownMessage: "",
  };
  const [activeModal, setActiveModal] = useState(false);
  const [integration, setIntegration] = useState();
  const [labels, setLabels] = useState({
    title: "Adicionar Typebot ao fluxo",
    btn: "Adicionar",
  });

  useEffect(() => {
    if (open === "edit") {
      setLabels({
        title: "Editar Typebot ao fluxo",
        btn: "Salvar",
      });
      console.log("FlowTybebotEdit", data);
      setIntegration({
        ...data.data.typebotIntegration,
      });
      setActiveModal(true);
    } else if (open === "create") {
      setLabels({
        title: "Editar Typebot do fluxo",
        btn: "Salvar",
      });
      setIntegration(initialState);
      setActiveModal(true);
    }

    return () => {
      isMounted.current = false;
    };
  }, [open]);

  const handleClose = () => {
    close(null);
    setActiveModal(false);
  };

  const handleSaveDialogFlow = (values) => {
    if (open === "edit") {
      handleClose();
      onUpdate({
        ...data,
        data: { typebotIntegration:  { ...values } },
      });
    } else if (open === "create") {
    values.projectName = values.name
      handleClose();
      onSave({
        typebotIntegration: values
      });
    }
  };

  return (
    <div className={classes.root}>
      <Dialog
        open={activeModal}
        onClose={handleClose}
        fullWidth
        maxWidth="md"
        scroll="paper"
      >
        <DialogTitle id="form-dialog-title">
          {open === "create" ? `Adicionar Typebot ao fluxo` : `Editar Typebot`}
        </DialogTitle>
        <Formik
          initialValues={integration}
          enableReinitialize={true}
          validationSchema={DialogflowSchema}
          onSubmit={(values, actions, event) => {
            setTimeout(() => {
              handleSaveDialogFlow(values);
              actions.setSubmitting(false);
            }, 400);
          }}
        >
          {({ touched, errors, isSubmitting, values }) => (
            <Form>
              <Paper square className={classes.mainPaper} elevation={1}>
                <DialogContent dividers>
                  <Grid container spacing={1}>
                    <>
                      <Grid item xs={12} md={6} xl={6}>
                        <Field
                          as={TextField}
                          label={i18n.t("queueIntegrationModal.form.name")}
                          autoFocus
                          name="name"
                          error={touched.name && Boolean(errors.name)}
                          helpertext={touched.name && errors.name}
                          variant="outlined"
                          margin="dense"
                          required
                          fullWidth
                          className={classes.textField}
                        />
                      </Grid>
                      <Grid item xs={12} md={12} xl={12}>
                        <Field
                          as={TextField}
                          label={i18n.t("queueIntegrationModal.form.urlN8N")}
                          name="urlN8N"
                          error={touched.urlN8N && Boolean(errors.urlN8N)}
                          helpertext={touched.urlN8N && errors.urlN8N}
                          variant="outlined"
                          margin="dense"
                          required
                          fullWidth
                          className={classes.textField}
                        />
                      </Grid>
                      <Grid item xs={12} md={6} xl={6}>
                        <Field
                          as={TextField}
                          label={i18n.t(
                            "queueIntegrationModal.form.typebotSlug"
                          )}
                          name="typebotSlug"
                          error={
                            touched.typebotSlug && Boolean(errors.typebotSlug)
                          }
                          helpertext={touched.typebotSlug && errors.typebotSlug}
                          required
                          variant="outlined"
                          margin="dense"
                          fullWidth
                          className={classes.textField}
                        />
                      </Grid>
                      <Grid item xs={12} md={6} xl={6}>
                        <Field
                          as={TextField}
                          label={i18n.t(
                            "queueIntegrationModal.form.typebotExpires"
                          )}
                          name="typebotExpires"
                          error={
                            touched.typebotExpires &&
                            Boolean(errors.typebotExpires)
                          }
                          helpertext={
                            touched.typebotExpires && errors.typebotExpires
                          }
                          variant="outlined"
                          margin="dense"
                          fullWidth
                          className={classes.textField}
                        />
                      </Grid>
                      <Grid item xs={12} md={6} xl={6}>
                        <Field
                          as={TextField}
                          label={i18n.t(
                            "queueIntegrationModal.form.typebotDelayMessage"
                          )}
                          name="typebotDelayMessage"
                          error={
                            touched.typebotDelayMessage &&
                            Boolean(errors.typebotDelayMessage)
                          }
                          helpertext={
                            touched.typebotDelayMessage &&
                            errors.typebotDelayMessage
                          }
                          variant="outlined"
                          margin="dense"
                          fullWidth
                          className={classes.textField}
                        />
                      </Grid>
                      <Grid item xs={12} md={6} xl={6}>
                        <Field
                          as={TextField}
                          label={i18n.t(
                            "queueIntegrationModal.form.typebotKeywordFinish"
                          )}
                          name="typebotKeywordFinish"
                          error={
                            touched.typebotKeywordFinish &&
                            Boolean(errors.typebotKeywordFinish)
                          }
                          helpertext={
                            touched.typebotKeywordFinish &&
                            errors.typebotKeywordFinish
                          }
                          variant="outlined"
                          margin="dense"
                          fullWidth
                          className={classes.textField}
                        />
                      </Grid>
                      <Grid item xs={12} md={6} xl={6}>
                        <Field
                          as={TextField}
                          label={i18n.t(
                            "queueIntegrationModal.form.typebotKeywordRestart"
                          )}
                          name="typebotKeywordRestart"
                          error={
                            touched.typebotKeywordRestart &&
                            Boolean(errors.typebotKeywordRestart)
                          }
                          helpertext={
                            touched.typebotKeywordRestart &&
                            errors.typebotKeywordRestart
                          }
                          variant="outlined"
                          margin="dense"
                          fullWidth
                          className={classes.textField}
                        />
                      </Grid>
                      <Grid item xs={12} md={6} xl={6}>
                        <Field
                          as={TextField}
                          label={i18n.t(
                            "queueIntegrationModal.form.typebotUnknownMessage"
                          )}
                          name="typebotUnknownMessage"
                          error={
                            touched.typebotUnknownMessage &&
                            Boolean(errors.typebotUnknownMessage)
                          }
                          helpertext={
                            touched.typebotUnknownMessage &&
                            errors.typebotUnknownMessage
                          }
                          variant="outlined"
                          margin="dense"
                          fullWidth
                          className={classes.textField}
                        />
                      </Grid>
                      <Grid item xs={12} md={12} xl={12}>
                        <Field
                          as={TextField}
                          label={i18n.t(
                            "queueIntegrationModal.form.typebotRestartMessage"
                          )}
                          name="typebotRestartMessage"
                          error={
                            touched.typebotRestartMessage &&
                            Boolean(errors.typebotRestartMessage)
                          }
                          helpertext={
                            touched.typebotRestartMessage &&
                            errors.typebotRestartMessage
                          }
                          variant="outlined"
                          margin="dense"
                          fullWidth
                          className={classes.textField}
                        />
                      </Grid>
                    </>
                  </Grid>
                </DialogContent>
              </Paper>
              <DialogActions>
                <Button
                  onClick={handleClose}
                  color="secondary"
                  variant="outlined"
                >
                  {i18n.t("contactModal.buttons.cancel")}
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  disabled={isSubmitting}
                  variant="contained"
                  className={classes.btnWrapper}
                >
                  {open === "create" ? `Adicionar` : "Editar"}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
    </div>
  );
};

export default FlowBuilderTypebotModal;
