import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { initSyncListener } from './lib/sync'
import { applyFontSize } from './lib/fontScale'
import { estaEmbutido } from './lib/embed'
import { iniciarUso } from './lib/usoColetor'

applyFontSize()
// Embutido no portal só roda o painel do supervisor: sem sync de vendedor
// (o syncAll chamaria getSession, que renovaria a sessão emprestada do portal).
if (!estaEmbutido()) initSyncListener()
// Monitor de uso (telas, atalhos, fluxos) → aba Padrões do portal.
iniciarUso()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
