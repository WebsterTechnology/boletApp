import React from "react";
import styles from "../style/Video.module.css";
import htImage from "../assets/loto.jpg";

const Video = () => {
  return (
    <div className={styles.videoContainer}>
      <h3 className={styles.videoTitle}>HAITI LOTO DIGITAL</h3>

      <div className={styles.videoWrapper}>
        <img
          src={htImage}
          alt="Kijan pou w jwe bòlèt"
          className={styles.videoImage}
        />
      </div>
    </div>
  );
};

export default Video;
