import { render } from 'preact';
import { App } from './app.jsx';
import './styles/index.css';
import { hydrate } from './data/storage.js';
import { initSupabaseAuth } from './data/sync.js';
import { refreshFxIfStale } from './state/fx.js';
import { refreshMetalsIfStale, startMetalsAutoRefresh } from './state/metals.js';

hydrate();
initSupabaseAuth();
refreshFxIfStale();
refreshMetalsIfStale();
startMetalsAutoRefresh();
render(<App />, document.getElementById('app'));
