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
        className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl text-slate-300 hover:text-cyan-400 hover:bg-slate-800/80 active:scale-95 transition-all flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        title="Anexar foto (JPG, PNG, WEBP)"
      >
        <Paperclip className="w-5 h-5" />
      </button>
    </>
  );
};
