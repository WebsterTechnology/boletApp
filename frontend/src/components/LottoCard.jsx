// // src/components/LottoCard.jsx
// import React from 'react';
// import styles from '../style/LottoCard.module.css';

// import htloto from '../assets/htloto.png';

// const LottoCard = ({ openLogin }) => {
//   return (
//     <div className={styles.card} onClick={openLogin}>
//       <img src={htloto} alt="Lotto" className={styles.image} />
//     </div>
//   );
// };

// export default LottoCard;
// src/components/LottoCard.jsx
import React from 'react';
import styles from '../style/LottoCard.module.css';

import htloto from '../assets/htloto.png';

const LottoCard = ({ openLogin }) => {
  return (
    <div className={styles.card} onClick={openLogin}>
      <span className={styles.badge}>🔥 Cho</span>

      <div className={styles.imageWrap}>
        <img src={htloto} alt="Lotto" className={styles.image} />
        <div className={styles.overlay}>
          <span className={styles.playText}>Klike pou Jwe</span>
        </div>
      </div>

      <div className={styles.content}>
        <h3 className={styles.title}>Loto</h3>
        <p className={styles.desc}>Jwe kounye a pou w ka genyen gwo kòb</p>
        <button
          className={styles.playBtn}
          onClick={(e) => {
            e.stopPropagation();
            openLogin();
          }}
        >
          Jwe Kounye a
        </button>
      </div>
    </div>
  );
};

export default LottoCard;