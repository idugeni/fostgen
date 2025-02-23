// components/OutputDisplay.tsx
interface OutputDisplayProps {
    tree: string;
  }
  
  export default function OutputDisplay({ tree }: OutputDisplayProps) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6 shadow-inner">
        <pre className="font-mono text-sm whitespace-pre overflow-x-auto overflow-y-auto max-h-[500px] text-gray-300">
          {tree || (
            <span className="text-gray-500 italic">
              Enter a GitHub repository URL above to generate its folder structure...
            </span>
          )}
        </pre>
      </div>
    );
  }
  