import { render } from 'preact';
import { App } from './app.jsx';
import './styles/index.css';
import { hydrate } from './data/storage.js';
import { initSupabaseAuth } from './data/sync.js';

hydrate();
initSupabaseAuth();
render(<App />, document.getElementById('app'));
