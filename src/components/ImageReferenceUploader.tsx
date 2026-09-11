import React, { useRef, useState } from "react";
import { Upload, X, Eye, Plus } from "lucide-react";
import { compressImage } from "../utils/imageCompression";
import { toast } from "../utils/toast";

interface ImageReferenceUploaderProps {
  label?: string;
  description?: string;
  images?: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

export const ImageReferenceUploader: React.FC<ImageReferenceUploaderProps> = ({
  images = [],
  onChange,
  maxImages = 15,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length >= maxImages) {
      toast.error(`Tối đa ${maxImages} ảnh tư liệu.`);
      return;
    }

    setIsCompressing(true);
    const newImagesList: string[] = [];
    const filesArray = Array.from(files);

    try {
      for (const file of filesArray) {
        if (!file.type.startsWith("image/")) continue;
        const base64Data = await compressImage(file, 0.82, 1200);
        newImagesList.push(base64Data);
      }

      if (newImagesList.length > 0) {
        const updatedImages = [...images, ...newImagesList].slice(0, maxImages);
        onChange(updatedImages);
      }
    } catch (err) {
      console.error("Lỗi khi xử lý hình ảnh:", err);
      toast.error("Không thể tải ảnh. Vui lòng thử lại!");
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = (indexToRemove: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = images.filter((_, idx) => idx !== indexToRemove);
    onChange(filtered);
  };

  return (
    <div className="py-1 space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Single Compact Upload Button & Thumbnail list */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isCompressing}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 active:scale-95 text-purple-300 border border-purple-500/40 text-xs font-semibold transition-all cursor-pointer shadow-sm disabled:opacity-50"
        >
          {isCompressing ? (
            <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5 text-purple-400" />
          )}
          <span>{isCompressing ? "Đang tải ảnh..." : `Tải ảnh tư liệu (${images.length})`}</span>
        </button>

        {images.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[11px] text-red-400/80 hover:text-red-300 hover:underline px-1 cursor-pointer"
          >
            Xóa hết
          </button>
        )}
      </div>

      {/* Thumbnails list with always visible red X button */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {images.map((imgUrl, idx) => (
            <div
              key={idx}
              className="relative group rounded-lg overflow-hidden border border-slate-700/80 bg-slate-950 w-16 h-16 shrink-0 shadow-sm"
            >
              <img
                src={imgUrl}
                alt={`Tư liệu ${idx + 1}`}
                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                onClick={() => setSelectedPreviewImage(imgUrl)}
              />

              {/* Eye icon overlay */}
              <div
                onClick={() => setSelectedPreviewImage(imgUrl)}
                className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              >
                <Eye className="w-4 h-4 text-white drop-shadow" />
              </div>

              {/* NÚT X XÓA LUÔN HIỆN TRÊN MỖI ẢNH */}
              <button
                type="button"
                onClick={(e) => handleRemoveImage(idx, e)}
                className="absolute top-0.5 right-0.5 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow border border-red-400/80 transition-transform active:scale-90 z-20 cursor-pointer flex items-center justify-center"
                title="Xóa ảnh này"
              >
                <X className="w-3 h-3 stroke-[3]" />
              </button>
            </div>
          ))}

          {images.length < maxImages && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-16 h-16 rounded-lg border border-dashed border-slate-700 hover:border-purple-500/60 bg-slate-900/40 hover:bg-purple-500/10 flex flex-col items-center justify-center text-slate-400 hover:text-purple-300 transition-all cursor-pointer"
              title="Thêm ảnh"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {selectedPreviewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedPreviewImage(null)}
              className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white rounded-full p-2 shadow-lg z-10 transition-all cursor-pointer"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
            <img
              src={selectedPreviewImage}
              alt="Xem ảnh tư liệu đầy đủ"
              className="max-w-full max-h-[80vh] object-contain rounded-xl mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
};

