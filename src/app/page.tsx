'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import InputForm from '@/components/InputForm';
import Notification from '@/components/Notification';
import OutputDisplay from '@/components/OutputDisplay';
import { extractOwnerRepo, getDefaultBranch, getTree, buildMarkdownTree } from '@/utils/githubApi';

export default function FolderStructureGenerator() {
  const [url, setUrl] = useState<string>('');
  const [tree, setTree] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);

  const showNotification = (message: string, type: 'success' | 'info' | 'error'): void => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setTree('');

    try {
      const { owner, repo } = extractOwnerRepo(url);
      const branchName = await getDefaultBranch(owner, repo);
      if (!branchName) {
        throw new Error('Could not determine default branch');
      }
      const treeData = await getTree(owner, repo, branchName);
      if (!treeData || treeData.length === 0) {
        throw new Error('Repository appears to be empty');
      }
      const markdown = `# ${repo}\n\n${buildMarkdownTree(treeData)}`;
      setTree(markdown);
      showNotification('Structure generated successfully!', 'success');
    } catch (err: unknown) {
      let errorMessage = 'An unexpected error occurred';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = (): void => {
    setUrl('');
    setTree('');
    setError('');
    showNotification('Cleared successfully!', 'success');
  };

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(tree);
      showNotification('Copied to clipboard!', 'info');
    } catch (err: unknown) {
      let errorMessage = 'Failed to copy to clipboard';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      showNotification(errorMessage, 'error');
    }
  };

  const handleDownload = (): void => {
    try {
      const { repo } = extractOwnerRepo(url);
      const blob = new Blob([tree], { type: 'text/markdown' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${repo}-structure.md`;
      a.click();
      URL.revokeObjectURL(a.href);
      showNotification('Download started!', 'success');
    } catch (err: unknown) {
      let errorMessage = 'Failed to download structure';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      showNotification(errorMessage, 'error');
    }
  };

  useEffect(() => {
    document.title = 'FostGen - Folder Structure Generator';
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-black text-gray-100">
      <div className="container mx-auto px-4 py-12">
        <Header />
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-900/70 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-slate-800">
            <InputForm
              url={url}
              setUrl={setUrl}
              loading={loading}
              tree={tree}
              onSubmit={handleSubmit}
              onCopy={handleCopy}
              onDownload={handleDownload}
              onClear={handleClear}
            />
            {notification && <Notification message={notification.message} type={notification.type} />}
            {error && (
              <div className="mt-4 p-2 bg-red-500 text-white rounded">
                {error}
              </div>
            )}
            <OutputDisplay tree={tree} />
          </div>
        </div>
      </div>
    </div>
  );
}
