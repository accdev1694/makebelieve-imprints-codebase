import { render, screen, fireEvent } from '@testing-library/react';
import { FileUpload } from '../FileUpload';

describe('FileUpload', () => {
  const mockOnFileSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render upload area', () => {
    render(<FileUpload onFileSelect={mockOnFileSelect} />);

    expect(screen.getByText('Upload your design')).toBeInTheDocument();
    expect(screen.getByText('Drag and drop or click to browse')).toBeInTheDocument();
    expect(screen.getByText('Choose File')).toBeInTheDocument();
  });

  it('should show drag over state when dragging file', () => {
    render(<FileUpload onFileSelect={mockOnFileSelect} />);

    const dropZone = screen.getByText('Upload your design').closest('div');

    fireEvent.dragOver(dropZone!.parentElement!.parentElement!);
    expect(screen.getByText('Drop your image here')).toBeInTheDocument();

    fireEvent.dragLeave(dropZone!.parentElement!.parentElement!);
    expect(screen.getByText('Upload your design')).toBeInTheDocument();
  });

  it('should handle file selection via input', () => {
    const { container } = render(<FileUpload onFileSelect={mockOnFileSelect} />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    expect(mockOnFileSelect).toHaveBeenCalledWith(file);
  });

  it('should validate file type and show error for invalid type', () => {
    const { container } = render(<FileUpload onFileSelect={mockOnFileSelect} />);

    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    expect(mockOnFileSelect).not.toHaveBeenCalled();
    expect(screen.getByText(/file type not supported/i)).toBeInTheDocument();
  });

  it('should validate file size and show error for large files', () => {
    const { container } = render(<FileUpload onFileSelect={mockOnFileSelect} maxSize={1} />);

    // Create a 2MB file (larger than 1MB limit)
    const largeContent = new Array(2 * 1024 * 1024).fill('a').join('');
    const file = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    expect(mockOnFileSelect).not.toHaveBeenCalled();
    expect(screen.getByText(/file too large/i)).toBeInTheDocument();
  });

  it('should handle drag and drop', () => {
    render(<FileUpload onFileSelect={mockOnFileSelect} />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const dropZone = screen.getByText('Upload your design').closest('div')!.parentElement!.parentElement!;

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(mockOnFileSelect).toHaveBeenCalledWith(file);
  });

  it('should show preview when preview prop is provided', () => {
    const previewUrl = 'https://example.com/image.jpg';
    render(<FileUpload onFileSelect={mockOnFileSelect} preview={previewUrl} />);

    const img = screen.getByAltText('Preview');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', previewUrl);
  });

  it('should allow changing image when preview is shown', () => {
    const previewUrl = 'https://example.com/image.jpg';
    render(<FileUpload onFileSelect={mockOnFileSelect} preview={previewUrl} />);

    // The change button should be visible on hover (in the overlay)
    expect(screen.getByText('Change Image')).toBeInTheDocument();
  });

  it('should display max file size in upload instructions', () => {
    render(<FileUpload onFileSelect={mockOnFileSelect} maxSize={5} />);

    expect(screen.getByText(/Max 5MB/i)).toBeInTheDocument();
  });

  it('should accept custom file types', () => {
    const customTypes = ['image/svg+xml', 'image/tiff'];
    const { container } = render(
      <FileUpload
        onFileSelect={mockOnFileSelect}
        acceptedTypes={customTypes}
      />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.accept).toBe(customTypes.join(','));
  });

  it('should clear error when valid file is uploaded after error', () => {
    const { container } = render(<FileUpload onFileSelect={mockOnFileSelect} maxSize={1} />);

    // First upload invalid file
    const largeFile = new File([new Array(2 * 1024 * 1024).fill('a').join('')], 'large.jpg', {
      type: 'image/jpeg',
    });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [largeFile] } });
    expect(screen.getByText(/file too large/i)).toBeInTheDocument();

    // Then upload valid file
    const validFile = new File(['test'], 'small.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [validFile] } });

    expect(screen.queryByText(/file too large/i)).not.toBeInTheDocument();
    expect(mockOnFileSelect).toHaveBeenCalledWith(validFile);
  });
});
