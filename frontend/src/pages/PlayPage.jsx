// // src/pages/PlayPage.jsx
// import React, { useState } from "react";
// import styles from "./PlayPage.module.css";
// import YonChif from "../components/YonChif";
// import Maryaj from "../components/Maryaj";
// import TwaChif from "../components/TwaChif";
// import Video from "../components/Video";
// import BetCart from "../components/BetCart"; // ⬅️ NEW

// const PlayPage = () => {
//   const [mode, setMode] = useState("yon_chif");

//   return (
//     <div className={styles.playPage}>
//       <nav className={styles.modeSelector}>
//         <button
//           className={mode === "yon_chif" ? styles.active : ""}
//           onClick={() => setMode("yon_chif")}
//         >
//           Yon Chif
//         </button>
//         <button
//           className={mode === "maryaj" ? styles.active : ""}
//           onClick={() => setMode("maryaj")}
//         >
//           Maryaj
//         </button>
//         <button
//           className={mode === "twa_chif" ? styles.active : ""}
//           onClick={() => setMode("twa_chif")}
//         >
//           Twa Chif
//         </button>
//       </nav>

//       <div className={styles.content}>
//         {mode === "yon_chif" && <YonChif />}
//         {mode === "maryaj" && <Maryaj />}
//         {mode === "twa_chif" && <TwaChif />}
//       </div>

//       {/* ⬇️ Always-visible unified cart that submits ALL bets */}
//       <div className={styles.cartSection}>
//         <BetCart />
//       </div>

//       <Video />
//     </div>
//   );
// };

// export default PlayPage;
import React, { useState } from "react";
import styles from "./PlayPage.module.css";
import YonChif from "../components/YonChif";
import DeChif from "../components/DeChif"; // ✅ NEW
import Maryaj from "../components/Maryaj";
import TwaChif from "../components/TwaChif";
import Katchif from "../components/Katchif"; // ✅ NEW
import Video from "../components/Video";
import BetCart from "../components/BetCart";

const PlayPage = () => {
  const [mode, setMode] = useState("yon_chif");

  return (
    <div className={styles.playPage}>
      <nav className={styles.modeSelector}>
        <button
          className={mode === "yon_chif" ? styles.active : ""}
          onClick={() => setMode("yon_chif")}
        >
          Yon Chif
        </button>

        <button
          className={mode === "de_chif" ? styles.active : ""}
          onClick={() => setMode("de_chif")}
        >
          De Chif
        </button>

        <button
          className={mode === "maryaj" ? styles.active : ""}
          onClick={() => setMode("maryaj")}
        >
          Maryaj
        </button>

        <button
          className={mode === "twa_chif" ? styles.active : ""}
          onClick={() => setMode("twa_chif")}
        >
          Twa Chif
        </button>

        <button
          className={mode === "katchif" ? styles.active : ""}
          onClick={() => setMode("katchif")}
        >
          Katchif
        </button>
      </nav>

      <div className={styles.content}>
        {mode === "yon_chif" && <YonChif />}
        {mode === "de_chif" && <DeChif />}
        {mode === "maryaj" && <Maryaj />}
        {mode === "twa_chif" && <TwaChif />}
        {mode === "katchif" && <Katchif />}
      </div>

      {/* ⬇️ Unified cart always visible */}
      <div className={styles.cartSection}>
        <BetCart />
      </div>

      <Video />
    </div>
  );
};

export default PlayPage;
