import { render } from 'ink';

import { App } from './App';

const { waitUntilExit, unmount } = render(<App />);

function shutdown() {
  unmount();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

waitUntilExit().then(() => process.exit(0));
