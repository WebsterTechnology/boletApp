import React from 'react';
import styles from '../style/NotificationPanel.module.css';

const NotificationPanel = ({ onClose }) => {
  return (
    <div className={styles.panel}>
      <button className={styles.close} onClick={onClose}>✕</button>
      <h3>Notifikasyon</h3>
      <ul>
        <li>✅ Ou te kreye yon kont avèk siksè!</li>
        <li>🎉 Byenveni sou LotoMobil!</li>
        {/* Add more dynamic notifications later */}
      </ul>
    </div>
  );
};

export default NotificationPanel;
