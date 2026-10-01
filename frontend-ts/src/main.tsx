import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { BetProvider } from './context/BetContext'; // ✅ CORRECT import
import { NotificationProvider } from "./context/NotificationContext";

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <BrowserRouter>
    <BetProvider>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </BetProvider>
  </BrowserRouter>
);

