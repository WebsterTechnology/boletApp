import React, { useState } from "react";
import { useNotifications } from "../context/NotificationContext";
import styles from "../style/NotificationPanel.module.css";

const NotificationPanel = ({ onClose }) => {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [expandedId, setExpandedId] = useState(null);

  const openNotification = async (notification) => {
    setExpandedId((id) => id === notification.id ? null : notification.id);
    if (!notification.read) await markRead(notification.id);
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div><h3>Notifikasyon</h3><span>{unreadCount} pa li</span></div>
        <button className={styles.close} onClick={onClose}>✕</button>
      </div>
      {unreadCount > 0 && <button className={styles.markAll} onClick={markAllRead}>Make tout kòm li</button>}
      <div className={styles.list}>
        {notifications.length === 0 && <p className={styles.empty}>Pa gen notifikasyon.</p>}
        {notifications.map((n) => (
          <button key={n.id} className={`${styles.item} ${!n.read ? styles.unread : ""}`} onClick={() => openNotification(n)}>
            <div className={styles.itemTop}>
              <span className={styles.dot}>{!n.read ? "●" : ""}</span>
              <strong>{n.title}</strong>
              <small>{new Date(n.createdAt).toLocaleString()}</small>
            </div>
            <p>{expandedId === n.id ? n.message : `${n.message.slice(0, 70)}${n.message.length > 70 ? "…" : ""}`}</p>
            {expandedId === n.id && n.imageUrl && <img className={styles.image} src={n.imageUrl} alt="" />}
            {expandedId === n.id && n.linkUrl && <a href={n.linkUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>Open link</a>}
          </button>
        ))}
      </div>
    </div>
  );
};

export default NotificationPanel;
