import { useEffect } from 'preact/hooks';
import { installAutoSave } from './data/storage.js';
import { routeSig } from './state/store.js';
import { Header } from './components/Header.jsx';
import { Nav } from './components/Nav.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { Accounts } from './pages/Accounts.jsx';
import { Transactions } from './pages/Transactions.jsx';
import { Zakat } from './pages/Zakat.jsx';
import { Reports } from './pages/Reports.jsx';
import { Settings } from './pages/Settings.jsx';

const PAGES = {
  dashboard:    { comp: Dashboard,    label: 'اللوحة',   icon: '🏠' },
  accounts:     { comp: Accounts,     label: 'الحسابات', icon: '🏦' },
  transactions: { comp: Transactions, label: 'الحركات',  icon: '📒' },
  zakat:        { comp: Zakat,        label: 'الزكاة',   icon: '🕌' },
  reports:      { comp: Reports,      label: 'التقارير', icon: '📄' },
  settings:     { comp: Settings,     label: 'الإعدادات', icon: '⚙️' },
};

export function App() {
  useEffect(() => { installAutoSave(); }, []);
  const route = routeSig.value;
  const Page = (PAGES[route] || PAGES.dashboard).comp;
  return (
    <div class="app">
      <Header />
      <div class="container">
        <Nav pages={PAGES} current={route} onNavigate={r => routeSig.value = r} />
        <Page />
      </div>
    </div>
  );
}
