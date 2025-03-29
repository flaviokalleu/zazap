import React, { useState, useEffect, useRef } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import { MenuItem, FormControl, InputLabel, Select } from "@material-ui/core";
import { Visibility, VisibilityOff } from "@material-ui/icons";
import { InputAdornment, IconButton } from "@material-ui/core";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import { i18n } from "../../translate/i18n";
import TextField from "@material-ui/core/TextField";

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

const FlowBuilderOpenAIModal = ({ open, onSave, data, onUpdate, close }) => {
  const classes = useStyles();
  const isMounted = useRef(true);

  const handleToggleApiKey = () => {
    setShowApiKey(!showApiKey);
  };

  const initialState = {
    name: "",
    prompt: "",
    voice: "texto",
    voiceKey: "",
    voiceRegion: "",
    maxTokens: 100,
    temperature: 1,
    apiKey: "",
    queueId: null,
    maxMessages: 10,
  };

  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState("texto");

  const [activeModal, setActiveModal] = useState(false);
  const [integration, setIntegration] = useState();
  const [labels, setLabels] = useState({
    title: "Adicionar OpenAI ao fluxo",
    btn: "Adicionar",
  });

  useEffect(() => {
    if (open === "edit") {
      setLabels({
        title: "Editar OpenAI do fluxo",
        btn: "Salvar",
      });
      console.log("FlowTybebotEdit", data);
      setIntegration({
        ...data.data.typebotIntegration,
      });
      setActiveModal(true);
    } else if (open === "create") {
      setLabels({
        title: "Cria OpenAI no fluxo",
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

  const handleChangeVoice = (e) => {
    setSelectedVoice(e.target.value);
  };

  const handleSavePrompt = (values) => {
    if (open === "edit") {
      handleClose();
      onUpdate({
        ...data,
        data: { typebotIntegration: { ...values,  voice: selectedVoice} },
      });
    } else if (open === "create") {
      values.projectName = values.name;
      handleClose();
      onSave({
        typebotIntegration: {
          ...values,
          voice: selectedVoice
        }
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
          {open === "create" ? `Adicionar OpenAI ao fluxo` : `Editar OpenAI`}
        </DialogTitle>
        <Formik
          initialValues={integration}
          enableReinitialize={true}
          onSubmit={(values, actions) => {
            setTimeout(() => {
              handleSavePrompt(values);
              actions.setSubmitting(false);
            }, 400);
          }}
        >
          {({ touched, errors, isSubmitting, values }) => (
            <Form style={{ width: "100%" }}>
              <DialogContent dividers>
                <Field
                  as={TextField}
                  label={i18n.t("promptModal.form.name")}
                  name="name"
                  error={touched.name && Boolean(errors.name)}
                  helperText={touched.name && errors.name}
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  required
                />
                <FormControl fullWidth margin="dense" variant="outlined">
                  <Field
                    as={TextField}
                    label={i18n.t("promptModal.form.apikey")}
                    name="apiKey"
                    type={showApiKey ? "text" : "password"}
                    error={touched.apiKey && Boolean(errors.apiKey)}
                    helperText={touched.apiKey && errors.apiKey}
                    variant="outlined"
                    margin="dense"
                    fullWidth
                    required
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={handleToggleApiKey}>
                            {showApiKey ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </FormControl>
                <Field
                  as={TextField}
                  label={i18n.t("promptModal.form.prompt")}
                  name="prompt"
                  error={touched.prompt && Boolean(errors.prompt)}
                  helperText={touched.prompt && errors.prompt}
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  required
                  rows={10}
                  multiline={true}
                />
                <div className={classes.multFieldLine}>
                  <FormControl fullWidth margin="dense" variant="outlined">
                    <InputLabel>{i18n.t("promptModal.form.voice")}</InputLabel>
                    <Select
                      id="type-select"
                      labelWidth={60}
                      name="voice"
                      value={selectedVoice}
                      onChange={handleChangeVoice}
                      multiple={false}
                    >
                      <MenuItem key={"texto"} value={"texto"}>
                        Texto
                      </MenuItem>
                      <MenuItem
                        key={"pt-BR-FranciscaNeural"}
                        value={"pt-BR-FranciscaNeural"}
                      >
                        Francisa
                      </MenuItem>
                      <MenuItem
                        key={"pt-BR-AntonioNeural"}
                        value={"pt-BR-AntonioNeural"}
                      >
                        Antônio
                      </MenuItem>
                      <MenuItem
                        key={"pt-BR-BrendaNeural"}
                        value={"pt-BR-BrendaNeural"}
                      >
                        Brenda
                      </MenuItem>
                      <MenuItem
                        key={"pt-BR-DonatoNeural"}
                        value={"pt-BR-DonatoNeural"}
                      >
                        Donato
                      </MenuItem>
                      <MenuItem
                        key={"pt-BR-ElzaNeural"}
                        value={"pt-BR-ElzaNeural"}
                      >
                        Elza
                      </MenuItem>
                      <MenuItem
                        key={"pt-BR-FabioNeural"}
                        value={"pt-BR-FabioNeural"}
                      >
                        Fábio
                      </MenuItem>
                      <MenuItem
                        key={"pt-BR-GiovannaNeural"}
                        value={"pt-BR-GiovannaNeural"}
                      >
                        Giovanna
                      </MenuItem>
                      <MenuItem
                        key={"pt-BR-HumbertoNeural"}
                        value={"pt-BR-HumbertoNeural"}
                      >
                        Humberto
                      </MenuItem>
                      <MenuItem
                        key={"pt-BR-JulioNeural"}
                        value={"pt-BR-JulioNeural"}
                      >
                        Julio
                      </MenuItem>
                      <MenuItem
                        key={"pt-BR-LeilaNeural"}
                        value={"pt-BR-LeilaNeural"}
                      >
                        Leila
                      </MenuItem>
                      <MenuItem
                        key={"pt-BR-LeticiaNeural"}
                        value={"pt-BR-LeticiaNeural"}
                      >
                        Letícia
                      </MenuItem>
                      <MenuItem
                        key={"pt-BR-ManuelaNeural"}
                        value={"pt-BR-ManuelaNeural"}
                      >
                        Manuela
                      </MenuItem>
                      <MenuItem
                        key={"pt-BR-NicolauNeural"}
                        value={"pt-BR-NicolauNeural"}
                      >
                        Nicolau
                      </MenuItem>
                      <MenuItem
                        key={"pt-BR-ValerioNeural"}
                        value={"pt-BR-ValerioNeural"}
                      >
                        Valério
                      </MenuItem>
                      <MenuItem
                        key={"pt-BR-YaraNeural"}
                        value={"pt-BR-YaraNeural"}
                      >
                        Yara
                      </MenuItem>
                    </Select>
                  </FormControl>
                  <Field
                    as={TextField}
                    label={i18n.t("promptModal.form.voiceKey")}
                    name="voiceKey"
                    error={touched.voiceKey && Boolean(errors.voiceKey)}
                    helperText={touched.voiceKey && errors.voiceKey}
                    variant="outlined"
                    margin="dense"
                    fullWidth
                  />
                  <Field
                    as={TextField}
                    label={i18n.t("promptModal.form.voiceRegion")}
                    name="voiceRegion"
                    error={touched.voiceRegion && Boolean(errors.voiceRegion)}
                    helperText={touched.voiceRegion && errors.voiceRegion}
                    variant="outlined"
                    margin="dense"
                    fullWidth
                  />
                </div>

                <div className={classes.multFieldLine}>
                  <Field
                    as={TextField}
                    label={i18n.t("promptModal.form.temperature")}
                    name="temperature"
                    error={touched.temperature && Boolean(errors.temperature)}
                    helperText={touched.temperature && errors.temperature}
                    variant="outlined"
                    margin="dense"
                    fullWidth
                  />
                  <Field
                    as={TextField}
                    label={i18n.t("promptModal.form.max_tokens")}
                    name="maxTokens"
                    error={touched.maxTokens && Boolean(errors.maxTokens)}
                    helperText={touched.maxTokens && errors.maxTokens}
                    variant="outlined"
                    margin="dense"
                    fullWidth
                  />
                  <Field
                    as={TextField}
                    label={i18n.t("promptModal.form.max_messages")}
                    name="maxMessages"
                    error={touched.maxMessages && Boolean(errors.maxMessages)}
                    helperText={touched.maxMessages && errors.maxMessages}
                    variant="outlined"
                    margin="dense"
                    fullWidth
                  />
                </div>
              </DialogContent>
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
                  variant="contained"
                  className={classes.btnWrapper}
                  disabled={isSubmitting}
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

export default FlowBuilderOpenAIModal;
