// import React, { useState, useEffect } from 'react';
// import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
// import BurgerMenu from './BurgerMenu';
// import styles from '../style/Header.module.css';
// import logoFull from '../assets/logo.png';
// import logoSmall from '../assets/loto.png';
// import { FaBell } from 'react-icons/fa';
// import NotificationPanel from './NotificationPanel';
// import Pwen from './Pwen'; // ✅ NEW IMPORT

// const Header = ({ openLogin }) => {
//   const [userPhone, setUserPhone] = useState(localStorage.getItem("userPhone"));
//   const [showNotif, setShowNotif] = useState(false);
//   const location = useLocation();
//   const navigate = useNavigate();

//   useEffect(() => {
//     const checkUser = () => {
//       setUserPhone(localStorage.getItem("userPhone"));
//     };
//     checkUser();
//     window.addEventListener("storage", checkUser);
//     window.addEventListener("userLoggedIn", checkUser);
//     return () => {
//       window.removeEventListener("storage", checkUser);
//       window.removeEventListener("userLoggedIn", checkUser);
//     };
//   }, []);

//   const handlePlayClick = () => {
//     if (userPhone) {
//       navigate('/game');
//     } else {
//       openLogin();
//     }
//   };

//   return (
//     <header className={styles.header}>
//       <div className={styles.container}>
//         <div className={styles.left}>
//           <BurgerMenu />
//           <Link to="/" className={styles.logoLink}>
//             <img src={logoFull} className={styles.logoFull} alt="Logo" />
//             <img src={logoSmall} className={styles.logoSmall} alt="Logo" />
//           </Link>

//           <nav className={styles.nav}>
//             <NavLink
//               to="/rezilta"
//               className={({ isActive }) =>
//                 isActive ? `${styles.link} ${styles.active}` : styles.link
//               }
//             >
//               Rezilta
//             </NavLink>
//           </nav>
//         </div>

//         <div className={styles.right}>
//           {!userPhone ? (
//             <Link to="#" className={styles.login} onClick={openLogin}>
//               Konekte
//             </Link>
//           ) : (
//             <div className={styles.pointsContainer}>
//               <Pwen /> {/* ✅ Reusable points component */}
//               <button className={styles.bellButton} onClick={() => setShowNotif(!showNotif)}>
//                 <FaBell size={20} />
//               </button>
//             </div>
//           )}
//         </div>
//       </div>

//       {showNotif && <NotificationPanel onClose={() => setShowNotif(false)} />}
//     </header>
//   );
// };

// export default Header;
// import React, { useState, useEffect } from "react";
// import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
// import BurgerMenu from "./BurgerMenu";
// import styles from "../style/Header.module.css";
// import logoFull from "../assets/logo.png";
// import logoSmall from "../assets/loto.png";
// import { FaBell } from "react-icons/fa";
// import NotificationPanel from "./NotificationPanel";
// import Pwen from "./Pwen";

// const Header = ({ openLogin }) => {
//   const [userPhone, setUserPhone] = useState(localStorage.getItem("userPhone"));
//   const [showNotif, setShowNotif] = useState(false);
//   const location = useLocation();
//   const navigate = useNavigate();

//   useEffect(() => {
//     const checkUser = () => {
//       setUserPhone(localStorage.getItem("userPhone"));
//     };
//     checkUser();
//     window.addEventListener("storage", checkUser);
//     window.addEventListener("userLoggedIn", checkUser);
//     return () => {
//       window.removeEventListener("storage", checkUser);
//       window.removeEventListener("userLoggedIn", checkUser);
//     };
//   }, []);

//   return (
//     <header className={styles.header}>
//       <div className={styles.container}>
//         {/* LEFT */}
//         <div className={styles.left}>
//           <BurgerMenu />
//           <Link to="/" className={styles.logoLink}>
//             <img src={logoFull} className={styles.logoFull} alt="Logo" />
//             <img src={logoSmall} className={styles.logoSmall} alt="Logo" />
//           </Link>

//           <nav className={styles.nav}>
//             <NavLink
//               to="/rezilta"
//               className={({ isActive }) =>
//                 isActive ? `${styles.link} ${styles.active}` : styles.link
//               }
//             >
//               Rezilta
//             </NavLink>
//           </nav>
//         </div>

//         {/* RIGHT */}
//         <div className={styles.right}>
//           {!userPhone ? (
//             <Link to="#" className={styles.login} onClick={openLogin}>
//               Konekte
//             </Link>
//           ) : (
//             <div className={styles.pointsContainer}>
//               <Pwen />

//               {/* ✅ BUY MORE POINTS */}
//               <button
//                 className={styles.buyButton}
//                 onClick={() => navigate("/buy-credit")}
//               >
//                 Achte Pwen
//               </button>

//               {/* ✅ WITHDRAW POINTS */}
//               <button
//                 className={styles.withdrawButton}
//                 onClick={() => navigate("/withdraw")}
//               >
//                 Retire Pwen
//               </button>

//               <button
//                 className={styles.bellButton}
//                 onClick={() => setShowNotif(!showNotif)}
//               >
//                 <FaBell size={20} />
//               </button>
//             </div>
//           )}
//         </div>
//       </div>

//       {showNotif && <NotificationPanel onClose={() => setShowNotif(false)} />}
//     </header>
//   );
// };

// export default Header;
import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import BurgerMenu from './BurgerMenu';
import styles from '../style/Header.module.css';
import logoFull from '../assets/logo.png';
import logoSmall from '../assets/loto.png';
import { FaBell } from 'react-icons/fa';
import NotificationPanel from './NotificationPanel';
import Pwen from './Pwen';

const Header = ({ openLogin }) => {
  const [userPhone, setUserPhone] = useState(localStorage.getItem("userPhone"));
  const [showNotif, setShowNotif] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = () => {
      setUserPhone(localStorage.getItem("userPhone"));
    };
    checkUser();
    window.addEventListener("storage", checkUser);
    window.addEventListener("userLoggedIn", checkUser);
    return () => {
      window.removeEventListener("storage", checkUser);
      window.removeEventListener("userLoggedIn", checkUser);
    };
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.left}>
          <BurgerMenu />
          <Link to="/" className={styles.logoLink}>
            <img src={logoFull} className={styles.logoFull} alt="Logo" />
            <img src={logoSmall} className={styles.logoSmall} alt="Logo" />
          </Link>

          <nav className={styles.nav}>
            <NavLink
              to="/rezilta"
              className={({ isActive }) =>
                isActive ? `${styles.link} ${styles.active}` : styles.link
              }
            >
              Rezilta
            </NavLink>
          </nav>
        </div>

        <div className={styles.right}>
          {!userPhone ? (
            <Link to="#" className={styles.login} onClick={openLogin}>
              Konekte
            </Link>
          ) : (
            <div className={styles.pointsContainer}>
              {/* ✅ Points */}
              <Pwen />

              {/* ✅ ACHTE PWEN → goes to BuyCreditPage */}
              <button
                className={styles.actionButton}
                onClick={() => navigate("/buy-credit")}
              >
                Achte Pwen
              </button>

              {/* ✅ RETIRE PWEN → your withdraw system */}
              <button
                className={styles.actionButton}
                onClick={() => navigate("/withdraw")}
              >
                Retire Pwen
              </button>

              {/* ✅ Notifications */}
              <button
                className={styles.bellButton}
                onClick={() => setShowNotif(!showNotif)}
              >
                <FaBell size={20} />
              </button>
            </div>
          )}
        </div>
      </div>

      {showNotif && <NotificationPanel onClose={() => setShowNotif(false)} />}
    </header>
  );
};

export default Header;
