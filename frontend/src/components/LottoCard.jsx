// // src/components/LottoCard.jsx
// import React from 'react';
// import styles from '../style/LottoCard.module.css';
// import lotoImg from '../assets/loto.png';
// import htloto from '../assets/htloto.png';

// const LottoCard = ({ openLogin }) => {
//   return (
//     <div className={styles.card} onClick={openLogin}>
//       <img src={lotoImg} alt="Lotto" className={styles.image} />
//     </div>
//   );
// };

// export default LottoCard;
import React from "react";
import styles from "../style/LottoCard.module.css";

import htloto from "../assets/htloto.png";

const LottoCard = ({ openLogin }) => {
  return (
    <div
      className={styles.card}
      onClick={openLogin}
      style={{ backgroundImage: `url(${htloto})` }}
    >
   
    </div>
  );
};

export default LottoCard;
