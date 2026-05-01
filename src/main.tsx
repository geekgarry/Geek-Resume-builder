import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Hide loading animation after React app is rendered
// setTimeout(() => {
//   const loading = document.getElementById('loading');
//   if (loading) {
//     loading.style.display = 'none';
//   }
// }, 100); // Small delay to ensure rendering is complete
