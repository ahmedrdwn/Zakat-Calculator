import { render } from 'preact';
import { App } from './app.jsx';
import './styles/index.css';
import { hydrate } from './data/storage.js';

hydrate();
render(<App />, document.getElementById('app'));
