import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBar } from './StatusBar';

describe('StatusBar', () => {
  it('renders without crashing', () => {
    render(<StatusBar nodeCount={0} edgeCount={0} warnings={[]} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows "No file loaded" when no fileName is provided', () => {
    render(<StatusBar nodeCount={0} edgeCount={0} warnings={[]} />);
    expect(screen.getByText(/no file loaded/i)).toBeInTheDocument();
  });

  it('shows the file name when provided', () => {
    render(<StatusBar nodeCount={2} edgeCount={1} warnings={[]} fileName="tiny.gfa" />);
    expect(screen.getByText('tiny.gfa')).toBeInTheDocument();
  });

  it('shows the correct node count', () => {
    render(<StatusBar nodeCount={5} edgeCount={3} warnings={[]} />);
    expect(screen.getByText(/5 nodes/i)).toBeInTheDocument();
  });

  it('shows singular "node" when count is 1', () => {
    render(<StatusBar nodeCount={1} edgeCount={0} warnings={[]} />);
    expect(screen.getByText(/1 node\b/i)).toBeInTheDocument();
  });

  it('shows the correct edge count', () => {
    render(<StatusBar nodeCount={2} edgeCount={3} warnings={[]} />);
    expect(screen.getByText(/3 edges/i)).toBeInTheDocument();
  });

  it('shows singular "edge" when count is 1', () => {
    render(<StatusBar nodeCount={2} edgeCount={1} warnings={[]} />);
    expect(screen.getByText(/1 edge\b/i)).toBeInTheDocument();
  });

  it('does not show warning indicator when warnings is empty', () => {
    render(<StatusBar nodeCount={0} edgeCount={0} warnings={[]} />);
    expect(screen.queryByText(/warning/i)).not.toBeInTheDocument();
  });

  it('shows warning count when warnings are present', () => {
    render(
      <StatusBar
        nodeCount={2}
        edgeCount={1}
        warnings={['Line 3: bad record', 'Line 5: unsupported']}
      />,
    );
    expect(screen.getByText(/2 warnings/i)).toBeInTheDocument();
  });

  it('shows singular "warning" when count is 1', () => {
    render(
      <StatusBar nodeCount={2} edgeCount={1} warnings={['Line 3: bad record']} />,
    );
    expect(screen.getByText(/1 warning\b/i)).toBeInTheDocument();
  });

  it('zero node count is displayed', () => {
    render(<StatusBar nodeCount={0} edgeCount={0} warnings={[]} />);
    expect(screen.getByText(/0 nodes/i)).toBeInTheDocument();
  });
});
