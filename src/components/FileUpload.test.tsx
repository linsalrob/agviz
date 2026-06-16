import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileUpload } from './FileUpload';

const tinyGfaContent = 'H\tVN:Z:1.0\nS\ta\tACGT\n';

describe('FileUpload', () => {
  it('renders without crashing', () => {
    render(<FileUpload onFile={vi.fn()} />);
    expect(screen.getByRole('region')).toBeInTheDocument();
  });

  it('contains a file input that accepts .gfa', () => {
    render(<FileUpload onFile={vi.fn()} />);
    const input = screen.getByLabelText('Upload GFA file');
    expect(input).toHaveAttribute('accept', '.gfa');
    expect(input).toHaveAttribute('type', 'file');
  });

  it('has an accessible label for the upload region', () => {
    render(<FileUpload onFile={vi.fn()} />);
    expect(screen.getByRole('region', { name: /file upload/i })).toBeInTheDocument();
  });

  it('shows "Browse file" button text', () => {
    render(<FileUpload onFile={vi.fn()} />);
    expect(screen.getByText(/browse file/i)).toBeInTheDocument();
  });

  it('calls onFile callback when a file is selected', async () => {
    const onFile = vi.fn();
    render(<FileUpload onFile={onFile} />);
    const input = screen.getByLabelText('Upload GFA file');

    const file = new File([tinyGfaContent], 'tiny.gfa', { type: 'text/plain' });

    // Use userEvent to simulate file selection
    const user = userEvent.setup();
    await user.upload(input, file);

    // FileReader is async; wait a tick for the reader to complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(onFile).toHaveBeenCalledOnce();
    expect(onFile).toHaveBeenCalledWith(tinyGfaContent, 'tiny.gfa');
  });
});
