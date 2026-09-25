
import React, { useState, useEffect } from "react";
import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import BurgerMenu from "./BurgerMenu";
import styles from "../style/Header.module.css";
import logoFull from "../assets/logo.png";
import logoSmall from "../assets/loto.png";
import { FaBell } from "react-icons/fa";
import NotificationPanel from "./NotificationPanel";
import Pwen from "./Pwen";
import WithdrawModal from "./WithdrawModal"; // ✅ ADD THIS
import { useNotifications } from "../context/NotificationContext";

const Header = ({ openLogin }) => {
  const [userPhone, setUserPhone] = useState(localStorage.getItem("userPhone"));
  const [showNotif, setShowNotif] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false); // ✅ ADD
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();

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
        {/* LEFT */}
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

        {/* RIGHT */}
        <div className={styles.right}>
          {!userPhone ? (
            <Link to="#" className={styles.login} onClick={openLogin}>
              Konekte
            </Link>
          ) : (
            <div className={styles.pointsContainer}>
              <Pwen />

              {/* BUY POINTS */}
              <button
                className={styles.buyButton}
                onClick={() => navigate("/buy-credits")}
              >
                Achte Pwen
              </button>

              {/* ✅ WITHDRAW → OPEN MODAL */}
              <button
                className={styles.withdrawButton}
                onClick={() => setShowWithdrawModal(true)}
              >
                Retire Pwen
              </button>

              <button
                className={`${styles.bellButton} ${unreadCount > 0 ? styles.hasNotifications : ""}`}
                onClick={() => setShowNotif(!showNotif)}
              >
                <FaBell size={20} />
                {unreadCount > 0 && <span className={styles.unreadBadge}>{unreadCount > 99 ? "99+" : unreadCount}</span>}
              </button>
            </div>
          )}
        </div>
      </div>

      {showNotif && <NotificationPanel onClose={() => setShowNotif(false)} />}

      {/* ✅ WITHDRAW MODAL */}
      {showWithdrawModal && (
        <WithdrawModal onClose={() => setShowWithdrawModal(false)} />
      )}
    </header>
  );
};

export default Header;
