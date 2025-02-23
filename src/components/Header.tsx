// components/Header.tsx
import { FolderTree } from 'lucide-react';

export default function Header() {
  return (
    <div className="text-center mb-12">
      <div className="flex items-center justify-center gap-3 mb-4">
        <FolderTree className="w-12 h-12 text-blue-500" />
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 via-blue-400 to-blue-300 bg-clip-text text-transparent">
          FostGen
        </h1>
      </div>
      <p className="text-lg text-gray-400 max-w-2xl mx-auto">
        Generate elegant folder structure visualizations from any GitHub repository
      </p>
    </div>
  );
}
