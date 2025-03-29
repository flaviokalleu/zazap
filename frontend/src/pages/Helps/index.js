import React, { useState, useEffect, useCallback } from "react";
import { makeStyles, Paper, Typography, Modal, IconButton } from "@material-ui/core";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import { i18n } from "../../translate/i18n";
import useHelps from "../../hooks/useHelps";
import CloseIcon from "@material-ui/icons/Close";

const useStyles = makeStyles((theme) => ({
  mainContainer: {
    background: "linear-gradient(135deg, #f0f2f5 0%, #e9ecef 100%)",
    minHeight: "100vh",
    padding: theme.spacing(3),
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(1),
    },
  },
  mainPaperContainer: {
    overflowY: "auto",
    maxHeight: "calc(100vh - 200px)",
    padding: theme.spacing(2),
    background: "transparent",
    boxShadow: "none",
  },
  mainPaper: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: theme.spacing(3),
    padding: theme.spacing(2),
  },
  helpPaper: {
    position: "relative",
    width: "100%",
    minHeight: "360px",
    padding: theme.spacing(2),
    background: "white",
    borderRadius: "16px",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.1)",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    maxWidth: "340px",
    transition: "all 0.3s ease",
    "&:hover": {
      transform: "translateY(-8px)",
      boxShadow: "0 12px 32px rgba(0, 0, 0, 0.15)",
      "& $videoThumbnail": {
        filter: "brightness(1.1)",
      },
    },
  },
  videoThumbnail: {
    width: "100%",
    height: "200px",
    objectFit: "cover",
    borderRadius: "12px 12px 0 0",
    transition: "filter 0.3s ease",
  },
  videoTitle: {
    marginTop: theme.spacing(2),
    fontWeight: 600,
    color: "#333",
    flex: 1,
    fontSize: "1.1rem",
  },
  videoDescription: {
    maxHeight: "60px",
    overflow: "hidden",
    color: "#666",
    fontSize: "0.9rem",
    lineHeight: "1.4",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  },
  videoModal: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing(2),
  },
  videoModalContent: {
    outline: "none",
    width: "90%",
    maxWidth: 1024,
    aspectRatio: "16/9",
    position: "relative",
    background: "black",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 16px 48px rgba(0, 0, 0, 0.5)",
  },
  closeButton: {
    position: "absolute",
    top: theme.spacing(1),
    right: theme.spacing(1),
    color: "white",
    background: "rgba(0, 0, 0, 0.5)",
    "&:hover": {
      background: "rgba(0, 0, 0, 0.7)",
    },
  },
  title: {
    color: "#333",
    fontWeight: 700,
    fontSize: "1.8rem",
    textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
  },
}));

const Helps = () => {
  const classes = useStyles();
  const [records, setRecords] = useState([]);
  const { list } = useHelps();
  const [selectedVideo, setSelectedVideo] = useState(null);

  useEffect(() => {
    async function fetchData() {
      const helps = await list();
      setRecords(helps);
    }
    fetchData();
  }, [list]);

  const openVideoModal = (video) => {
    setSelectedVideo(video);
  };

  const closeVideoModal = () => {
    setSelectedVideo(null);
  };

  const handleModalClose = useCallback((event) => {
    if (event.key === "Escape") {
      closeVideoModal();
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleModalClose);
    return () => {
      document.removeEventListener("keydown", handleModalClose);
    };
  }, [handleModalClose]);

  const renderVideoModal = () => {
    return (
      <Modal
        open={Boolean(selectedVideo)}
        onClose={closeVideoModal}
        className={classes.videoModal}
      >
        <div className={classes.videoModalContent}>
          {selectedVideo && (
            <>
              <iframe
                style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }}
                src={`https://www.youtube.com/embed/${selectedVideo}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              <IconButton className={classes.closeButton} onClick={closeVideoModal}>
                <CloseIcon />
              </IconButton>
            </>
          )}
        </div>
      </Modal>
    );
  };

  const renderHelps = () => {
    return (
      <div className={`${classes.mainPaper} ${classes.mainPaperContainer}`}>
        {records.length ? (
          records.map((record, key) => (
            <Paper
              key={key}
              className={classes.helpPaper}
              onClick={() => openVideoModal(record.video)}
            >
              <img
                src={`https://img.youtube.com/vi/${record.video}/mqdefault.jpg`}
                alt="Thumbnail"
                className={classes.videoThumbnail}
              />
              <Typography variant="button" className={classes.videoTitle}>
                {record.title}
              </Typography>
              <Typography variant="caption" className={classes.videoDescription}>
                {record.description}
              </Typography>
            </Paper>
          ))
        ) : (
          <Typography variant="body1" color="textSecondary" align="center" style={{ gridColumn: "1 / -1" }}>
            Nenhum vídeo de ajuda disponível no momento.
          </Typography>
        )}
      </div>
    );
  };

  return (
    <MainContainer className={classes.mainContainer}>
      <MainHeader>
        <Title className={classes.title}>
          {i18n.t("helps.title")} ({records.length})
        </Title>
        <MainHeaderButtonsWrapper></MainHeaderButtonsWrapper>
      </MainHeader>
      {renderHelps()}
      {renderVideoModal()}
    </MainContainer>
  );
};

export default Helps;