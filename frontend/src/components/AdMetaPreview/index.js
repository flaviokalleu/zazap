import React, { useEffect } from 'react';
import { Button, Divider, Typography } from "@material-ui/core";
import toastError from "../../errors/toastError";

const AdMetaPreview = ({ image, title, body, sourceUrl, messageUser }) => {
  useEffect(() => {}, [image, title, body, sourceUrl, messageUser]);

  const handleAdClick = async () => {
    try {
      window.open(sourceUrl);
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <div style={{ minWidth: "250px" }}>
      <div>
        <div style={{ float: "left" }}>
          <img src={image} alt="Thumbnail" onClick={handleAdClick} style={{ width: "100px" }} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap" }}>
          <Typography style={{ marginTop: "12px", marginLeft: "15px", marginRight: "15px", float: "left" }} variant="subtitle1" color="primary" gutterBottom>
            <div>{title}</div>
          </Typography>
          <Typography style={{ marginTop: "12px", marginLeft: "15px", marginRight: "15px", float: "left" }} variant="subtitle2" color="textSecondary" gutterBottom>
            <div>{messageUser}</div>
          </Typography>
        </div>
        <div style={{ display: "block", content: "", clear: "both" }}></div>
        <div>
          <Divider />
          <Button
            fullWidth
            color="primary"
            onClick={handleAdClick}
            disabled={!sourceUrl}
          >
            Visualizar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdMetaPreview;
