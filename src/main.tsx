import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { startMonitoring } from './lib/monitoring'

startMonitoring();

createRoot(document.getElementById("root")!).render(<App />);
