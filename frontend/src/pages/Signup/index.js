import React, { useState, useEffect } from "react";
import qs from "query-string";
import * as Yup from "yup";
import { useHistory } from "react-router-dom";
import { Link as RouterLink } from "react-router-dom";
import { toast } from "react-toastify";
import { Formik, Form, Field } from "formik";
import { makeStyles } from "@material-ui/core/styles";
import {
  TextField,
  Button,
  Grid,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@material-ui/core";
import { InputAdornment, IconButton } from "@mui/material";
import Visibility from "@material-ui/icons/Visibility";
import VisibilityOff from "@material-ui/icons/VisibilityOff";
import EmailIcon from "@material-ui/icons/Email";
import LockIcon from "@material-ui/icons/Lock";
import PhoneIcon from "@material-ui/icons/Phone";
import BusinessIcon from "@material-ui/icons/Business";
import PersonIcon from "@material-ui/icons/Person";
import usePlans from "../../hooks/usePlans";
import { openApi } from "../../services/api";
import toastError from "../../errors/toastError";
import { i18n } from "../../translate/i18n";

const UserSchema = Yup.object().shape({
  name: Yup.string().min(2, "Muito curto!").max(50, "Muito longo!").required("Obrigatório"),
  companyName: Yup.string().min(2, "Muito curto!").max(50, "Muito longo!").required("Obrigatório"),
  password: Yup.string().min(5, "Muito curto!").max(50, "Muito longo!"),
  email: Yup.string().email("E-mail inválido").required("Obrigatório"),
  phone: Yup.string().required("Obrigatório"),
});

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    width: "100vw",
    height: "100vh",
    background: "linear-gradient(120deg, #ffffff 0%, #e8f0fe 100%)",
    overflow: "hidden",
    [theme.breakpoints.down("sm")]: {
      flexDirection: "column",
    },
  },
  imageSide: {
    flex: 1,
    background: `url('https://wallpapercave.com/wp/wp12255781.jpg') no-repeat center center`,
    backgroundSize: "cover",
    height: "100%",
    position: "relative",
    "&:after": {
      content: '""',
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: "rgba(0, 0, 0, 0.2)",
    },
    [theme.breakpoints.down("sm")]: {
      height: "25vh",
    },
  },
  formSide: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing(5),
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(3),
    },
  },
  formContainer: {
    width: "100%",
    maxWidth: "450px",
    background: "#ffffff",
    borderRadius: "20px",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
    padding: theme.spacing(4),
    border: "1px solid rgba(0, 0, 0, 0.05)",
    transition: "all 0.3s ease",
    "&:hover": {
      boxShadow: "0 15px 40px rgba(0, 0, 0, 0.12)",
    },
  },
  logoImg: {
    display: "block",
    margin: "0 auto 30px",
    maxWidth: "180px",
    height: "auto",
    filter: "drop-shadow(0 3px 6px rgba(0, 0, 0, 0.1))",
  },
  textField: {
    "& .MuiOutlinedInput-root": {
      borderRadius: "10px",
      background: "#fafafa",
      "&:hover fieldset": {
        borderColor: "#350A64",
      },
      "&.Mui-focused fieldset": {
        borderColor: "#350A64",
      },
    },
    "& .MuiInputLabel-outlined": {
      color: "#555",
      fontWeight: 500,
    },
  },
  submitBtn: {
    marginTop: theme.spacing(3),
    background: "linear-gradient(45deg, #350A64 30%, #4F0F96 90%)",
    color: "#fff",
    borderRadius: "12px",
    padding: "14px",
    fontWeight: 600,
    fontSize: "1.1rem",
    textTransform: "none",
    width: "100%",
    boxShadow: "0 5px 15px rgba(53, 10, 100, 0.3)",
    transition: "all 0.3s ease",
    "&:hover": {
      background: "linear-gradient(45deg, #2A0851 30%, #350A64 90%)",
      boxShadow: "0 8px 20px rgba(53, 10, 100, 0.5)",
      transform: "translateY(-2px)",
    },
    "&:disabled": {
      background: "#ddd",
      boxShadow: "none",
      cursor: "not-allowed",
    },
  },
  loginBtn: {
    marginTop: theme.spacing(2),
    background: "transparent",
    color: "#350A64",
    border: "2px solid #350A64",
    borderRadius: "12px",
    padding: "12px",
    fontWeight: 600,
    fontSize: "1rem",
    textTransform: "none",
    width: "100%",
    transition: "all 0.3s ease",
    "&:hover": {
      background: "#350A64",
      color: "#fff",
      boxShadow: "0 5px 15px rgba(53, 10, 100, 0.3)",
      transform: "translateY(-2px)",
    },
  },
}));

const SignUp = () => {
  const classes = useStyles();
  const history = useHistory();
  const { getPlanList } = usePlans();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  let companyId = null;
  const params = qs.parse(window.location.search);
  if (params.companyId !== undefined) {
    companyId = params.companyId;
  }

  const initialState = {
    name: "",
    email: "",
    password: "",
    phone: "",
    companyId,
    companyName: "",
    planId: "",
  };
  const [user] = useState(initialState);

  useEffect(() => {
    setLoading(true);
    const fetchData = async () => {
      const planList = await getPlanList({ listPublic: "false" });
      setPlans(planList);
      setLoading(false);
    };
    fetchData();
  }, [getPlanList]);

  const handleSignUp = async (values) => {
    try {
      await openApi.post("/auth/signup", values);
      toast.success(i18n.t("signup.toasts.success"));
      history.push("/login");
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <div className={classes.root}>
      <div className={classes.imageSide}></div>
      <div className={classes.formSide}>
        <form className={classes.formContainer}>
          <img src="/logo.png" alt="Logo" className={classes.logoImg} />
          <Formik
            initialValues={user}
            enableReinitialize={true}
            validationSchema={UserSchema}
            onSubmit={(values, actions) => {
              setTimeout(() => {
                handleSignUp(values);
                actions.setSubmitting(false);
              }, 400);
            }}
          >
            {({ touched, errors, isSubmitting }) => (
              <Form>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Field
                      as={TextField}
                      variant="outlined"
                      fullWidth
                      id="companyName"
                      label="Nome da Empresa"
                      error={touched.companyName && Boolean(errors.companyName)}
                      helperText={touched.companyName && errors.companyName}
                      name="companyName"
                      autoComplete="companyName"
                      className={classes.textField}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <BusinessIcon style={{ color: "#555" }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Field
                      as={TextField}
                      autoComplete="name"
                      name="name"
                      error={touched.name && Boolean(errors.name)}
                      helperText={touched.name && errors.name}
                      variant="outlined"
                      fullWidth
                      id="name"
                      label="Nome"
                      className={classes.textField}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonIcon style={{ color: "#555" }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Field
                      as={TextField}
                      variant="outlined"
                      fullWidth
                      id="email"
                      label="E-mail"
                      name="email"
                      error={touched.email && Boolean(errors.email)}
                      helperText={touched.email && errors.email}
                      autoComplete="email"
                      inputProps={{ style: { textTransform: "lowercase" } }}
                      className={classes.textField}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <EmailIcon style={{ color: "#555" }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Field
                      as={TextField}
                      variant="outlined"
                      fullWidth
                      name="password"
                      error={touched.password && Boolean(errors.password)}
                      helperText={touched.password && errors.password}
                      label="Senha"
                      type={showPassword ? "text" : "password"}
                      id="password"
                      autoComplete="current-password"
                      className={classes.textField}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockIcon style={{ color: "#555" }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={() => setShowPassword(!showPassword)}>
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Field
                      as={TextField}
                      variant="outlined"
                      fullWidth
                      id="phone"
                      label="Telefone"
                      name="phone"
                      error={touched.phone && Boolean(errors.phone)}
                      helperText={touched.phone && errors.phone}
                      autoComplete="phone"
                      className={classes.textField}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PhoneIcon style={{ color: "#555" }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <FormControl fullWidth variant="outlined" className={classes.textField}>
                      <InputLabel id="plan-label">Plano</InputLabel>
                      <Field
                        as={Select}
                        labelId="plan-label"
                        id="plan"
                        name="planId"
                        label="Plano"
                      >
                        {plans.map((plan) => (
                          <MenuItem key={plan.id} value={plan.id}>
                            {plan.name}
                          </MenuItem>
                        ))}
                      </Field>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12}>
                    <Button
                      fullWidth
                      type="submit"
                      variant="contained"
                      disabled={isSubmitting}
                      className={classes.submitBtn}
                    >
                      {isSubmitting ? "Enviando..." : "Cadastrar"}
                    </Button>
                  </Grid>

                  <Grid item xs={12}>
                    <RouterLink to="/login" style={{ textDecoration: "none" }}>
                      <Button fullWidth variant="contained" className={classes.loginBtn}>
                        Já tem uma conta? Faça o login
                      </Button>
                    </RouterLink>
                  </Grid>
                </Grid>
              </Form>
            )}
          </Formik>
        </form>
      </div>
    </div>
  );
};

export default SignUp;