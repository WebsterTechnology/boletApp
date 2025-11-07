// // import React, { useState, useMemo } from 'react';
// // import styles from '../style/LoginModal.module.css';
// // import { getCountryCallingCode, getCountries } from 'libphonenumber-js';
// // import * as countryList from 'country-codes-list';
// // import { FaChevronDown } from 'react-icons/fa';
// // import logo from '../assets/logo.png';

// // const LoginModal = ({ onClose, openRegister }) => {
// //   const countries = useMemo(() => {
// //     const validISOs = getCountries();

// //     return Object.entries(countryList.customList('countryCode', '{countryNameEn}'))
// //       .filter(([iso]) => validISOs.includes(iso))
// //       .map(([iso, name]) => ({
// //         name,
// //         iso,
// //         code: '+' + getCountryCallingCode(iso),
// //       }))
// //       .sort((a, b) => a.name.localeCompare(b.name));
// //   }, []);

// //   const [selectedCountry, setSelectedCountry] = useState(
// //     countries.find((c) => c.code === '+509') || countries[0]
// //   );
// //   const [showPicker, setShowPicker] = useState(false);
// //   const [phone, setPhone] = useState('');

// // const handleLogin = async () => {
// //   const fullPhone = `${selectedCountry.code}${phone}`.trim();

// //   if (!fullPhone || phone.length < 6) {
// //     alert("Tanpri antre nimewo telefòn ou");
// //     return;
// //   }

// //   try {
// //     const res = await fetch("http://localhost:3001/api/auth/login", {
// //       method: "POST",
// //       headers: { "Content-Type": "application/json" },
// //       body: JSON.stringify({
// //         phone: fullPhone,
// //       }),
// //     });

// //     const data = await res.json();

// //     if (res.ok) {
       
// //       localStorage.setItem("user", JSON.stringify(data.user));
// //       localStorage.setItem("userPhone", fullPhone);
// //       localStorage.setItem("token", data.token); 
// //       window.dispatchEvent(new Event("userLoggedIn"));
// //       window.location.href = "/game";
// //     } else {
// //       alert("❌ " + data.message);
// //     }
// //   } catch (err) {
// //     console.error("Login error:", err);
// //     alert("❌ Erè pandan login");
// //   }
// // };



// //   return (
// //     <div className={styles.overlay}>
// //       <div className={styles.modal}>
// //         <button className={styles.closeBtn} onClick={onClose}>✕</button>

// //         <div className={styles.top}>
// //           <h2 className={styles.title}>Konekte</h2>
// //           <img src={logo} className={styles.logo} alt="Logo" />
// //           <h3 className={styles.welcome}>Byenvini!</h3>
// //         </div>

// //         <div className={styles.phoneInputWrapper}>
// //           <div className={styles.code} onClick={() => setShowPicker(!showPicker)}>
// //             {selectedCountry.code} <FaChevronDown size={10} />
// //           </div>
// //           <input
// //             type="text"
// //             placeholder="Antre nimewo telefòn mobil ou"
// //             className={styles.input}
// //             value={phone}
// //             onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
// //           />
// //         </div>

// //         {showPicker && (
// //           <div className={styles.countryList}>
// //             <div className={styles.pickerTitle}>Chwazi Peyi</div>
// //             {countries.map((c, index) => (
// //               <div
// //                 key={index}
// //                 className={styles.countryOption}
// //                 onClick={() => {
// //                   setSelectedCountry(c);
// //                   setShowPicker(false);
// //                 }}
// //               >
// //                 {c.name} <span className={styles.countryCode}>({c.code})</span>
// //               </div>
// //             ))}
// //           </div>
// //         )}

// //         <button className={styles.submitBtn} onClick={handleLogin}>
// //           RANTRE SOU KONT OU
// //         </button>

// //         <div className={styles.dividerLine}>
// //           <span className={styles.orText}>OSWA</span>
// //         </div>

// //         <button className={styles.createBtn} onClick={openRegister}>
// //           OUVÈ YON KONT
// //         </button>

// //         <p className={styles.note}>Si w pako gen kont, kreye youn</p>
// //       </div>
// //     </div>
// //   );
// // };

// // export default LoginModal;
// // src/components/LoginModal.jsx
// import React, { useState, useMemo } from 'react';
// import { useNavigate } from 'react-router-dom';
// import styles from '../style/LoginModal.module.css';
// import { getCountryCallingCode, getCountries } from 'libphonenumber-js';
// import * as countryList from 'country-codes-list';
// import { FaChevronDown } from 'react-icons/fa';
// import logo from '../assets/logo.png';

// const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// const LoginModal = ({ onClose, openRegister }) => {
//   const navigate = useNavigate();

//   const countries = useMemo(() => {
//     const validISOs = getCountries();
//     return Object.entries(countryList.customList('countryCode', '{countryNameEn}'))
//       .filter(([iso]) => validISOs.includes(iso))
//       .map(([iso, name]) => ({
//         name,
//         iso,
//         code: '+' + getCountryCallingCode(iso),
//       }))
//       .sort((a, b) => a.name.localeCompare(b.name));
//   }, []);

//   const [selectedCountry, setSelectedCountry] = useState(
//     countries.find((c) => c.code === '+509') || countries[0]
//   );
//   const [showPicker, setShowPicker] = useState(false);
//   const [phone, setPhone] = useState('');
//   const [pin, setPin] = useState(''); // 4-digit password
//   const [loading, setLoading] = useState(false);

//   const handleLogin = async () => {
//     const fullPhone = `${selectedCountry.code}${phone}`.trim();

//     if (!fullPhone || phone.length < 6) {
//       alert('Tanpri antre nimewo telefòn ou');
//       return;
//     }
//     if (!/^\d{4}$/.test(pin)) {
//       alert('PIN nan dwe gen egzakteman 4 chif');
//       return;
//     }

//     try {
//       setLoading(true);
//       const res = await fetch(`${API}/api/auth/login`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           phone: fullPhone,
//           password: pin, // ⬅️ send 4-digit password
//         }),
//       });

//       const data = await res.json();

//       if (res.ok) {
//         // ✅ Save session info
//         localStorage.setItem('user', JSON.stringify(data.user));
//         localStorage.setItem('userPhone', fullPhone);
//         localStorage.setItem('token', data.token);
//         localStorage.setItem('isAdmin', JSON.stringify(!!data.user?.isAdmin));

//         // Dispatch an app-level event if you use it elsewhere
//         window.dispatchEvent(new Event('userLoggedIn'));

//         // ✅ Route by role
//         if (data.user?.isAdmin) {
//           navigate('/admin/dashboard', { replace: true });
//         } else {
//           navigate('/game', { replace: true });
//         }

//         onClose?.();
//       } else {
//         alert('❌ ' + (data.message || 'Login echwe'));
//       }
//     } catch (err) {
//       console.error('Login error:', err);
//       alert('❌ Erè pandan login');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className={styles.overlay}>
//       <div className={styles.modal}>
//         <button className={styles.closeBtn} onClick={onClose}>✕</button>

//         <div className={styles.top}>
//           <h2 className={styles.title}>Konekte</h2>
//           <img src={logo} className={styles.logo} alt="Logo" />
//           <h3 className={styles.welcome}>Byenvini!</h3>
//         </div>

//         <div className={styles.phoneInputWrapper}>
//           <div className={styles.code} onClick={() => setShowPicker(!showPicker)}>
//             {selectedCountry.code} <FaChevronDown size={10} />
//           </div>
//           <input
//             type="text"
//             placeholder="Antre nimewo telefòn mobil ou"
//             className={styles.input}
//             value={phone}
//             onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
//           />
//         </div>

//         {showPicker && (
//           <div className={styles.countryList}>
//             <div className={styles.pickerTitle}>Chwazi Peyi</div>
//             {countries.map((c, index) => (
//               <div
//                 key={index}
//                 className={styles.countryOption}
//                 onClick={() => {
//                   setSelectedCountry(c);
//                   setShowPicker(false);
//                 }}
//               >
//                 {c.name} <span className={styles.countryCode}>({c.code})</span>
//               </div>
//             ))}
//           </div>
//         )}

//         {/* 4-digit password (PIN) */}
//         <input
//           type="password"
//           inputMode="numeric"
//           maxLength={4}
//           placeholder="Antre PIN (4 chif)"
//           className={styles.input}
//           value={pin}
//           onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
//           style={{ marginTop: 10 }}
//         />

//         <button className={styles.submitBtn} onClick={handleLogin} disabled={loading}>
//           {loading ? 'Ap konekte...' : 'RANTRE SOU KONT OU'}
//         </button>

//         <div className={styles.dividerLine}>
//           <span className={styles.orText}>OSWA</span>
//         </div>

//         <button className={styles.createBtn} onClick={openRegister}>
//           OUVÈ YON KONT
//         </button>

//         <p className={styles.note}>Si w pako gen kont, kreye youn</p>
//       </div>
//     </div>
//   );
// };

// export default LoginModal;
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../style/LoginModal.module.css';
import { getCountryCallingCode, getCountries } from 'libphonenumber-js';
import * as countryList from 'country-codes-list';
import { FaChevronDown } from 'react-icons/fa';
import logo from '../assets/logo.png';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function LoginModal({ onClose, openRegister }) {
  const navigate = useNavigate();

  const countries = useMemo(() => {
    const validISOs = getCountries();
    return Object.entries(countryList.customList('countryCode', '{countryNameEn}'))
      .filter(([iso]) => validISOs.includes(iso))
      .map(([iso, name]) => ({ name, iso, code: '+' + getCountryCallingCode(iso) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const [selectedCountry, setSelectedCountry] = useState(
    countries.find((c) => c.code === '+509') || countries[0]
  );
  const [showPicker, setShowPicker] = useState(false);
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const fullPhone = `${selectedCountry.code}${phone}`.trim();
    if (!fullPhone || phone.length < 6) return alert('Tanpri antre nimewo telefòn ou');
    if (!/^\d{4}$/.test(pin)) return alert('PIN nan dwe gen egzakteman 4 chif');

    try {
      setLoading(true);

      // clear old session values so we never show stale balances
      ['user','userId','userPhone','token','isAdmin','userPoints'].forEach(k => localStorage.removeItem(k));
      window.dispatchEvent(new Event('pointsUpdated')); // bubble -> 0 until fetch

      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone, password: pin }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert('❌ ' + (data.message || 'Login echwe'));
        return;
      }

      // Save fresh session
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('userId', String(data.user.id));
      localStorage.setItem('userPhone', fullPhone);
      localStorage.setItem('token', data.token);
      localStorage.setItem('isAdmin', JSON.stringify(!!data.user?.isAdmin));
      localStorage.setItem('userPoints', String(data.user?.points ?? 0)); // ← set from server

      // notify UI
      window.dispatchEvent(new Event('userLoggedIn'));
      window.dispatchEvent(new Event('pointsUpdated'));

      // route by role
      if (data.user?.isAdmin) navigate('/admin/dashboard', { replace: true });
      else navigate('/game', { replace: true });

      onClose?.();
    } catch (err) {
      console.error('Login error:', err);
      alert('❌ Erè pandan login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>

        <div className={styles.top}>
          <h2 className={styles.title}>Konekte</h2>
          <img src={logo} className={styles.logo} alt="Logo" />
          <h3 className={styles.welcome}>Byenvini!</h3>
        </div>

        <div className={styles.phoneInputWrapper}>
          <div className={styles.code} onClick={() => setShowPicker(!showPicker)}>
            {selectedCountry.code} <FaChevronDown size={10} />
          </div>
          <input
            type="text"
            placeholder="Antre nimewo telefòn mobil ou"
            className={styles.input}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
          />
        </div>

        {showPicker && (
          <div className={styles.countryList}>
            <div className={styles.pickerTitle}>Chwazi Peyi</div>
            {countries.map((c, i) => (
              <div key={i} className={styles.countryOption}
                   onClick={() => { setSelectedCountry(c); setShowPicker(false); }}>
                {c.name} <span className={styles.countryCode}>({c.code})</span>
              </div>
            ))}
          </div>
        )}

        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          placeholder="Antre PIN (4 chif)"
          className={styles.input}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          style={{ marginTop: 10 }}
        />

        <button className={styles.submitBtn} onClick={handleLogin} disabled={loading}>
          {loading ? 'Ap konekte...' : 'RANTRE SOU KONT OU'}
        </button>

        <div className={styles.dividerLine}><span className={styles.orText}>OSWA</span></div>
        <button className={styles.createBtn} onClick={openRegister}>OUVÈ YON KONT</button>
        <p className={styles.note}>Si w pako gen kont, kreye youn</p>
      </div>
    </div>
  );
}
