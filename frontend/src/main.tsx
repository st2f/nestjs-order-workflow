import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DebugPage } from './pages/DebugPage';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DebugPage />
  </StrictMode>,
);
