import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { BetProvider } from './context/BetContext.jsx'; // ✅ CORRECT import
import { NotificationProvider } from "./context/NotificationContext.jsx";

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <BetProvider>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </BetProvider>
  </BrowserRouter>
);
