import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import App from './App';
import './index.css';

// No StrictMode in dev: avoids duplicate advisory network calls during the
// live demo (double-invoked effects). Production behavior is unchanged.
createRoot(document.getElementById('root')).render(
  <MotionConfig reducedMotion="user">
    <App />
  </MotionConfig>
);
