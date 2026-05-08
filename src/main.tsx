import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import App from './App.tsx';
import './index.css';
import { AppProviders } from './providers/AppProviders.tsx';

// Handle ChunkLoadError - this happens when a new version of the app is deployed 
// and the old chunk files are removed from the server.
window.addEventListener('error', (e) => {
  if (e.message.includes('ChunkLoadError') || e.message.includes('Loading chunk')) {
    console.warn('New version detected or chunk load failed. Refreshing...');
    window.location.reload();
  }
}, true);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallback={<div style={{ padding: '20px', textAlign: 'center' }}><h1>Something went wrong</h1><p>Please refresh the page.</p></div>}>
      <BrowserRouter>
        <AppProviders>
          <App />
        </AppProviders>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
