import React, { useRef } from 'react';
import { Paperclip, Image as ImageIcon } from 'lucide-react';

interface ImageAttachmentButtonProps {
  onSelectFile: (file: File) => void;
  disabled?: boolean;
}

export const ImageAttachmentButton: React.FC<ImageAttachmentButtonProps> = ({
  onSelectFile,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const selected = files[0];
      onSelectFile(selected);
    }
    // Reset input so same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-label="Anexar foto"
        className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl text-[#54656F] hover:text-[#00A884] hover:bg-[#FFFFFF] transition-colors shrink-0 flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        title="Anexar foto (JPG, PNG, WEBP)"
      >
        <Paperclip className="w-5 h-5" />
      </button>
    </>
  );
};
