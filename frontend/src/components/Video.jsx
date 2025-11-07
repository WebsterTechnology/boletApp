import React from "react";
import styles from "../style/Video.module.css";

const Video = () => {
  return (
    <div className={styles.videoContainer}>
      <h3 className={styles.videoTitle}>Kijan pou w jwe bòlèt la</h3>
      <div className={styles.videoWrapper}>
        <iframe
          width="100%"
          height="315"
          src="https://www.youtube.com/embed/KJSevfN_sWM?autoplay=1&rel=0"
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
    </div>
  );
};

export default Video;
