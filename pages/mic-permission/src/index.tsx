import { createRoot } from 'react-dom/client';

import './index.css';
import { MicPermission } from './MicPermission';

const root = document.getElementById('app-container');
if (root) {
  createRoot(root).render(<MicPermission />);
}
