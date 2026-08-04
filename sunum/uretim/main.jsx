import { createRoot } from 'react-dom/client'
import '@fontsource/ibm-plex-sans/latin.css'
import '@fontsource/ibm-plex-sans/latin-ext.css'
import '@fontsource/saira-condensed/latin.css'
import '@fontsource/saira-condensed/latin-ext.css'
import '../../src/index.css'
import '../../src/styles/andon.css'
import OperatorPanel from '../../src/pages/OperatorPanel.jsx'
import ManagerDashboard from '../../src/pages/ManagerDashboard.jsx'

/* ?ekran=operator | mudur — StrictMode yok (çift efekt çağrısı ekran
 * görüntüsünde gereksiz gürültü yaratıyor). */
const ekran = new URLSearchParams(window.location.search).get('ekran')

createRoot(document.getElementById('root')).render(
  ekran === 'mudur' ? <ManagerDashboard /> : <OperatorPanel />,
)
