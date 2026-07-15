import { render } from 'preact';
import { App } from './app.jsx';
import './styles/index.css';
import { hydrate } from './data/storage.js';
import { initSupabaseAuth } from './data/sync.js';
import { refreshFxIfStale } from './state/fx.js';

hydrate();
initSupabaseAuth();
refreshFxIfStale();
render(<App />, document.getElementById('app'));
