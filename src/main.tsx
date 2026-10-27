import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { startLibrarySync } from './store/librarySync';
import './index.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element #root not found');
}

// Under `npm run dev`, library changes are saved to src/data/library.json as built-ins.
if (import.meta.env.DEV) startLibrarySync();

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
