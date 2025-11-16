import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import CommentsApp from './CommentsApp/page.jsx';


createRoot(document.getElementById('root')).render(
  <StrictMode>

    <CommentsApp />
  </StrictMode>,
)
