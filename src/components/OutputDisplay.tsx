/**
 * @interface OutputDisplayProps
 * @description Props yang dibutuhkan untuk komponen OutputDisplay
 * @property {string} tree - String hasil generate struktur folder yang akan ditampilkan
 */
interface OutputDisplayProps {
  tree: string;
}

/**
 * @component OutputDisplay
 * @description Komponen untuk menampilkan hasil generate struktur folder dalam format yang mudah dibaca
 * @param {OutputDisplayProps} props - Props yang dibutuhkan oleh komponen
 * @returns {JSX.Element} Pre-formatted text yang menampilkan struktur folder
 */
export default function OutputDisplay({ tree }: OutputDisplayProps) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-6 shadow-inner">
      <pre className="font-mono text-sm whitespace-pre overflow-x-auto overflow-y-auto text-gray-300">
        {tree || (
          <span className="text-gray-500 italic whitespace-pre-wrap">
            Enter a GitHub repository URL above to generate its folder structure...
          </span>
        )}
      </pre>
    </div>
  );
}
  