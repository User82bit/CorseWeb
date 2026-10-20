import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import './index.scss'
import App from './App.tsx'
import { LanguageProvider } from './i18n/LanguageContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <BrowserRouter>
        <LanguageProvider>
            <App />
        </LanguageProvider>
    </BrowserRouter>
);
