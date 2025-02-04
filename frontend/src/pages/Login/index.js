import React, { useState, useContext } from "react";
import { Link as RouterLink } from "react-router-dom";
import Button from "@material-ui/core/Button";
import CssBaseline from "@material-ui/core/CssBaseline";
import TextField from "@material-ui/core/TextField";
import Link from "@material-ui/core/Link";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import { Grid } from "@material-ui/core";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import logo from "../../assets/logo.png";

const useStyles = makeStyles((theme) => ({
  root: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  decorativeCircle1: {
    position: "absolute",
    width: "500px",
    height: "500px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(187,134,252,0.1) 0%, rgba(187,134,252,0) 70%)",
    top: "-200px",
    right: "-200px",
  },
  decorativeCircle2: {
    position: "absolute",
    width: "400px",
    height: "400px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(3,218,198,0.1) 0%, rgba(3,218,198,0) 70%)",
    bottom: "-150px",
    left: "-150px",
  },
  paper: {
    background: "linear-gradient(145deg, rgba(37, 37, 37, 0.95) 0%, rgba(15, 15, 15, 0.95) 100%)",
    borderRadius: "24px",
    padding: theme.spacing(4),
    width: "100%",
    maxWidth: "500px",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
    position: "relative",
    zIndex: 1,
  },
  logo: {
    width: "180px",
    marginBottom: theme.spacing(4),
    display: "block",
    margin: "0 auto",
  },
  form: {
    width: "100%",
    marginTop: theme.spacing(2),
  },
  submit: {
    margin: theme.spacing(3, 0, 2),
    padding: theme.spacing(1.5),
    background: "linear-gradient(45deg, #BB86FC 30%, #03DAC6 90%)",
    color: "#000",
    fontWeight: 600,
    borderRadius: "12px",
    fontSize: "1rem",
    textTransform: "none",
    "&:hover": {
      background: "linear-gradient(45deg, #9965F4 30%, #00B5A5 90%)",
    },
  },
  textField: {
    marginBottom: theme.spacing(2),
    "& .MuiOutlinedInput-root": {
      borderRadius: "12px",
      backgroundColor: "rgba(255, 255, 255, 0.05)",
      "& fieldset": {
        borderColor: "rgba(255, 255, 255, 0.1)",
      },
      "&:hover fieldset": {
        borderColor: "#BB86FC",
      },
      "&.Mui-focused fieldset": {
        borderColor: "#BB86FC",
      },
    },
    "& .MuiInputLabel-root": {
      color: "rgba(255, 255, 255, 0.7)",
    },
    "& .MuiInputBase-input": {
      color: "#fff",
    },
  },
  links: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: theme.spacing(2),
  },
  link: {
    color: "#BB86FC",
    textDecoration: "none",
    "&:hover": {
      textDecoration: "underline",
    },
  },
  title: {
    color: "#fff",
    marginBottom: theme.spacing(3),
    textAlign: "center",
    fontWeight: 600,
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: theme.spacing(4),
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: theme.spacing(2),
    width: "100%",
    textAlign: "center",
    color: "rgba(255, 255, 255, 0.5)",
  },
}));

const Login = () => {
  const classes = useStyles();
  const [user, setUser] = useState({ email: "", password: "" });
  const { handleLogin } = useContext(AuthContext);

  const handleChangeInput = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleLogin(user);
  };

  return (
    <div className={classes.root}>
      <CssBaseline />
      <div className={classes.decorativeCircle1} />
      <div className={classes.decorativeCircle2} />
      
      <div className={classes.paper}>
        <img src={logo} alt="Logo" className={classes.logo} />
        
        <Typography component="h1" variant="h4" className={classes.title}>
          {i18n.t("login.title")}
        </Typography>
        
        

        <form className={classes.form} onSubmit={handleSubmit}>
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            id="email"
            label={i18n.t("login.form.email")}
            name="email"
            autoComplete="email"
            autoFocus
            value={user.email}
            onChange={handleChangeInput}
            className={classes.textField}
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
            autoComplete="current-password"
            value={user.password}
            onChange={handleChangeInput}
            className={classes.textField}
          />
<Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              className={classes.submit}
            >
              {i18n.t("login.buttons.submit")}
            </Button>

          <Grid container className={classes.links}>
            <Grid item>
            <Link
                  href="#"
                  variant="body2"
                  component={RouterLink}
                  to="/recovery-password"
                >
                  {i18n.t("Recuperar Senha?")}
                </Link>
            </Grid>
            <Grid item>
            <Link
              // variant="body2"
              component={RouterLink}
              className={"link-create-count"}
              tabIndex={0}
              role={"button"}
              aria-disabled={"false"}
              to="/signup"
              style={{ textDecoration: "none" }}
            >
              <span className={"label-text"}>Criar conta</span>
            </Link>
            </Grid>
          </Grid>
        </form>

        <Typography variant="body2" className={classes.footer}>
          © {new Date().getFullYear()} ZAZAP.
        </Typography>
      </div>
    </div>
  );
};

export default Login;