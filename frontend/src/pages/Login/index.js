import React, { useState, useContext, useEffect } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Button,
  CssBaseline,
  TextField,
  Link,
  Grid,
  Box,
  Typography,
  Container,
  Paper
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { versionSystem, nomeEmpresa } from "../../../package.json";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";

const Copyright = () => (
  <Typography variant="body2" color="primary" align="center">
    {"Copyright "}
    <Link color="primary" href="https://www.firstin.com.br/" target="_blank" rel="noopener noreferrer">
      {nomeEmpresa} - v{versionSystem}
    </Link>{" "}
    {new Date().getFullYear()}
    {"."}
  </Typography>
);

const useStyles = makeStyles((theme) => ({
  root: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(to right, #4da735, #4da735, #4da735)",
  },
  paper: {
    backgroundColor: theme.palette.login,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: theme.spacing(6, 4),
    borderRadius: theme.spacing(1.5),
    boxShadow: "0px 3px 15px rgba(0, 0, 0, 0.2)",
  },
  logo: {
    margin: theme.spacing(2, 0),
    width: "80%",
  },
  form: {
    width: "100%",
    marginTop: theme.spacing(2),
  },
  submit: {
    margin: theme.spacing(3, 0, 2),
    padding: theme.spacing(1.2),
    borderRadius: theme.spacing(0.5),
  },
  forgotPassword: {
    textAlign: "right",
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(2),
  },
  registerButton: {
    marginTop: theme.spacing(2),
    textAlign: "center",
  }
}));

const Login = () => {
  const classes = useStyles();
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const { handleLogin } = useContext(AuthContext);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleLogin(credentials);
  };

  const logoUrl = `${process.env.REACT_APP_BACKEND_URL}/public/logotipos/login.png`;
  const logoWithCache = `${logoUrl}?r=${Math.random()}`;

  return (
    <div className={classes.root}>
      <Container component="main" maxWidth="xs">
        <CssBaseline />
        <Paper className={classes.paper} elevation={3}>
          <div>
            <img 
              className={classes.logo} 
              src={logoWithCache} 
              alt={process.env.REACT_APP_NAME_SYSTEM || "Logo"} 
            />
          </div>
          
          <form className={classes.form} onSubmit={handleSubmit}>
            <TextField
              variant="outlined"
              margin="normal"
              required
              fullWidth
              id="email"
              label={i18n.t("login.form.email")}
              name="email"
              value={credentials.email}
              onChange={handleChange}
              autoComplete="email"
              autoFocus
            />
            
            <TextField
              variant="outlined"
              margin="normal"
              required
              fullWidth
              name="password"
              label={i18n.t("login.form.password")}
              type="password"
              id="password"
              value={credentials.password}
              onChange={handleChange}
              autoComplete="current-password"
            />
            
            <div className={classes.forgotPassword}>
              <Link component={RouterLink} to="/forgetpsw" variant="body2">
                Esqueceu sua senha?
              </Link>
            </div>
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              className={classes.submit}
            >
              {i18n.t("login.buttons.submit")}
            </Button>
            
            <Grid container justifyContent="center">
              <Grid item className={classes.registerButton}>
                <Link
                  component={RouterLink}
                  to="/signup"
                  variant="body2"
                >
                  {i18n.t("login.buttons.register")}
                </Link>
              </Grid>
            </Grid>
          </form>
        </Paper>
        
        <Box mt={4}>
          <Copyright />
        </Box>
      </Container>
    </div>
  );
};

export default Login;