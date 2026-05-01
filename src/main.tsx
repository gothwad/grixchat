import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import App from './App.tsx';
import './index.css';
import { AppProviders } from './providers/AppProviders.tsx';

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
