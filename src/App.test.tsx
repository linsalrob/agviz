import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

vi.mock('./components/GraphViewer', () => ({
  GraphViewer: () => <div aria-label="Assembly graph canvas" role="img" />,
}));

describe('App header', () => {
  it('renders the AgViz title as a link to the app base URL', () => {
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain(`href="${import.meta.env.BASE_URL}"`);
    expect(html).toContain('>AgViz<');
  });
});

describe('App theme controls', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to light theme', () => {
    render(<App />);
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(document.querySelector('.app')?.getAttribute('data-theme')).toBe('light');
  });

  it('toggles to dark theme and back to light', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /toggle theme mode/i }));
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(document.querySelector('.app')?.getAttribute('data-theme')).toBe('dark');

    fireEvent.click(screen.getByRole('button', { name: /toggle theme mode/i }));
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(document.querySelector('.app')?.getAttribute('data-theme')).toBe('light');
  });

  it('starts in dark mode when persisted', () => {
    localStorage.setItem('agviz:theme', 'dark');
    render(<App />);

    expect(document.querySelector('.app')?.getAttribute('data-theme')).toBe('dark');
  });

  it('shows coverage colouring control and keeps it off by default', () => {
    render(<App />);

    const checkbox = screen.getByRole('checkbox', { name: /colour by coverage/i });
    expect(checkbox).not.toBeChecked();
  });

  it('offers the Bandage-style layout', () => {
    render(<App />);

    expect(screen.getByRole('option', { name: 'Bandage-style' })).toBeInTheDocument();
  });
});
