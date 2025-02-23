import { Github, FolderTree, Copy, Download, Trash2 } from 'lucide-react';

interface InputFormProps {
  url: string;
  setUrl: (value: string) => void;
  loading: boolean;
  tree: string;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCopy: () => void;
  onDownload: () => void;
  onClear: () => void;
}

export default function InputForm({
  url,
  setUrl,
  loading,
  tree,
  onSubmit,
  onCopy,
  onDownload,
  onClear
}: InputFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6 mb-8">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Github className="h-5 w-5 text-blue-400" />
        </div>
        <input
          type="text"
          placeholder="Enter GitHub repository URL (e.g., https://github.com/owner/repo)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-0 focus:outline-none focus:border-transparent transition text-gray-100 placeholder-gray-500"
          required
        />
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-medium transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 cursor-pointer"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <FolderTree className="w-5 h-5" />
              Generate Structure
            </>
          )}
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCopy}
            disabled={!tree}
            className="w-full sm:w-auto text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Copy className="w-4 h-4" />
            Copy
          </button>
          <button
            type="button"
            onClick={onDownload}
            disabled={!tree}
            className="w-full sm:w-auto text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Save
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={!url && !tree}
            className="w-full sm:w-auto text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        </div>
      </div>
    </form>
  );
}
