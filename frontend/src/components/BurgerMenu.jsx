// src/components/BurgerMenu.jsx
import React, { useState, useEffect } from 'react';
import styles from '../style/BurgerMenu.module.css';
import { Link } from 'react-router-dom';
import {
  FaCalendar,
  FaDice,
  FaListOl,
  FaVideo,
  FaCog,
  FaUserCheck,
  FaDotCircle,
  FaUser,
  FaSignInAlt,
  FaListAlt,        // <-- for "Fich"
  FaCrown,          // <-- admin section icon
  FaCheckCircle,    // <-- admin bets icon
} from 'react-icons/fa';

const BurgerMenu = () => {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { setUser(null); }
    }
    try {
      setIsAdmin(JSON.parse(localStorage.getItem('isAdmin') ?? 'false') === true);
    } catch {
      setIsAdmin(false);
    }
  }, []);

  const closeMenu = () => setOpen(false);

  return (
    <>
      <button
        className={`${styles.burger} ${open ? styles.open : ''}`}
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
        aria-expanded={open}
      >
        <span className={styles.line}></span>
        <span className={styles.line}></span>
        <span className={styles.line}></span>
      </button>

      <div className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`}>
        <div className={styles.logo}></div>

        {user ? (
          <div className={styles.userInfo}>
            <p className={styles.phone}>📞 {user.phone}</p>
            <Link to="/profile" className={styles.item} onClick={closeMenu}>
              <FaUser /> Gade profil ou
            </Link>
          </div>
        ) : (
          <Link to="/register" className={styles.item} onClick={closeMenu}>
            <FaSignInAlt /> Ouvè yon kont
          </Link>
        )}

        <ul className={styles.menu}>
          <li>
            <Link to="/" className={styles.item} onClick={closeMenu}>
              <FaDice /> Jwe
            </Link>
          </li>

          {/* ✅ Fich (user’s bets) — only show when logged in */}
          {user && (
            <li>
              <Link to="/fich" className={styles.item} onClick={closeMenu}>
                <FaListAlt /> Fich mwen
              </Link>
            </li>
          )}

          <li>
            <Link to="/rezilta" className={styles.item} onClick={closeMenu}>
              <FaCalendar /> Rezilta Bòlèt
            </Link>
          </li>
          <li>
            <Link to="/tiraj" className={styles.item} onClick={closeMenu}>
            
            </Link>
          </li>
          <li>
            <Link to="/chans" className={styles.item} onClick={closeMenu}>
              
            </Link>
          </li>
          <li>
            <Link to="/videyo" className={styles.item} onClick={closeMenu}>
              
            </Link>
          </li>
          <li>
            <Link to="/rules" className={styles.item} onClick={closeMenu}>
              <FaUserCheck /> Règ/Sèvis Kliyan
            </Link>
          </li>
          <li>
            <Link to="/settings" className={styles.item} onClick={closeMenu}>
             
            </Link>
          </li>

          {/* Optional: Admin section */}
          {isAdmin && (
            <>
              <li className={styles.separator} />
              <li className={styles.sectionTitle}><FaCrown /> Admin</li>
              <li>
                <Link to="/admin/dashboard" className={styles.item} onClick={closeMenu}>
                  <FaCrown /> Dashboard
                </Link>
              </li>
              <li>
                <Link to="/admin/bets" className={styles.item} onClick={closeMenu}>
                  <FaCheckCircle /> Bets
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </>
  );
};

export default BurgerMenu;
