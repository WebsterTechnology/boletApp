import React from "react";
import { useNotifications } from "../context/NotificationContext";
import styles from "../style/BroadcastNotificationModal.module.css";

export default function BroadcastNotificationModal() {
  const { queue, dismissModal } = useNotifications();
  const notification = queue[0];
  if (!notification) return null;

  const priorityClass = styles[notification.priority] || styles.info;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="broadcast-title">
      <div className={`${styles.modal} ${priorityClass}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.priority}>{notification.priority?.toUpperCase()}</div>
        {notification.imageUrl && (
          <img className={styles.image} src={notification.imageUrl} alt="" />
        )}
        <h2 id="broadcast-title">{notification.title}</h2>
        <p>{notification.message}</p>
        {notification.linkUrl && (
          <a className={styles.link} href={notification.linkUrl} target="_blank" rel="noreferrer">
            Open link
          </a>
        )}
        <button className={styles.closeButton} onClick={() => dismissModal(notification.id)}>
          Klike pou jwe
        </button>
      </div>
    </div>
  );
}
