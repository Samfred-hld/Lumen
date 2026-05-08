import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Expose retroactive migration on window (run once from console)
import '@/lib/migrations/fixNullInvoiceMonth'

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
