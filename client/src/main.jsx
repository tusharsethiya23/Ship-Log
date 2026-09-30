// The entry point: puts the app on the page.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* BrowserRouter lets the app read and change the address bar. */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);