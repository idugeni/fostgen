import { render, screen, fireEvent } from '@testing-library/react';
import InputForm from '../InputForm';

describe('InputForm Component', () => {
  it('renders input form correctly', () => {
    render(<InputForm onSubmit={() => {}} />);
    expect(screen.getByPlaceholderText(/enter github repository url/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument();
  });

  it('validates github url format', () => {
    render(<InputForm onSubmit={() => {}} />);
    const input = screen.getByPlaceholderText(/enter github repository url/i);
    const submitButton = screen.getByRole('button', { name: /generate/i });

    // Test invalid URL
    fireEvent.change(input, { target: { value: 'invalid-url' } });
    fireEvent.click(submitButton);
    expect(screen.getByText(/please enter a valid github repository url/i)).toBeInTheDocument();

    // Test valid URL
    fireEvent.change(input, { target: { value: 'https://github.com/username/repo' } });
    fireEvent.click(submitButton);
    expect(screen.queryByText(/please enter a valid github repository url/i)).not.toBeInTheDocument();
  });

  it('calls onSubmit with correct url when form is submitted', () => {
    const mockOnSubmit = jest.fn();
    render(<InputForm onSubmit={mockOnSubmit} />);
    
    const input = screen.getByPlaceholderText(/enter github repository url/i);
    const submitButton = screen.getByRole('button', { name: /generate/i });

    fireEvent.change(input, { target: { value: 'https://github.com/username/repo' } });
    fireEvent.click(submitButton);

    expect(mockOnSubmit).toHaveBeenCalledWith('https://github.com/username/repo');
  });
});