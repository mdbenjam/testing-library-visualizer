import { render, screen } from '@testing-library/react';
import App from './App';
import { start } from './testingUtil';

test('renders learn react link', async () => {
  render(<App />);
  await start();
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
