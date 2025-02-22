'use client'

import { useState, useEffect } from 'react'
import { FolderTree, Github, Copy, Download, Trash2, AlertCircle, CheckCircle, Info } from 'lucide-react'

export default function FolderStructureGenerator() {
  const [url, setUrl] = useState('')
  const [tree, setTree] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notification, setNotification] = useState<{
    message: string
    type: 'success' | 'info' | 'error'
  } | null>(null)

  interface TreeItem {
    path: string
  }

  const extractOwnerRepo = (url: string): { owner: string; repo: string } => {
    try {
      const cleanUrl = url.trim().replace(/\/$/, '')
      const urlObj = new URL(cleanUrl)
      const parts = urlObj.pathname.split('/').filter(Boolean)
      
      if (parts.length < 2) {
        throw new Error('Invalid repository URL format')
      }
      
      return {
        owner: parts[0],
        repo: parts[1]
      }
    } catch (err) {
      throw new Error('Please enter a valid GitHub repository URL')
    }
  }

  const getDefaultBranch = async (owner: string, repo: string): Promise<string | undefined> => {
    try {
      const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`)
      if (!repoRes.ok) {
        if (repoRes.status === 404) {
          throw new Error('Repository not found. Please check the URL.')
        }
        if (repoRes.status === 403) {
          throw new Error('API rate limit exceeded. Please try again later.')
        }
        throw new Error('Failed to access repository')
      }
      const repoData = await repoRes.json()
      return repoData.default_branch || 'main'
    } catch (err: any) {
      throw new Error(err.message || 'Failed to fetch repository information')
    }
  }

  const getTree = async (owner: string, repo: string, branch: string): Promise<TreeItem[] | undefined> => {
    try {
      const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${branch}`)
      if (!commitRes.ok) {
        throw new Error('Cannot access repository commits')
      }
      const commitData = await commitRes.json()
      const sha = commitData.sha

      const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`)
      if (!treeRes.ok) {
        throw new Error('Cannot fetch folder structure')
      }
      const treeData = await treeRes.json()
      
      if (treeData.truncated) {
        throw new Error('Repository is too large to display complete structure')
      }
      
      return treeData.tree
    } catch (err: any) {
      throw new Error(err.message || 'Failed to fetch folder structure')
    }
  }

  const buildMarkdownTree = (tree: TreeItem[]): string => {
    if (!Array.isArray(tree)) return ''

    let treeDict: { [key: string]: any } = {}
    tree.forEach((item: TreeItem) => {
      const parts = item.path.split('/')
      let current = treeDict
      parts.forEach((part, index) => {
        if (!current[part]) {
          current[part] = index === parts.length - 1 ? null : {}
        }
        current = current[part]
      })
    })

    const formatTree = (tree: { [key: string]: any }, level: number = 0, prefix: string[] = []): string => {
      if (typeof tree !== 'object' || tree === null) return ''

      const sortedKeys = Object.keys(tree).sort((a, b) => {
        const isADir = tree[a] !== null
        const isBDir = tree[b] !== null
        if (isADir && !isBDir) return -1
        if (!isADir && isBDir) return 1
        return a.localeCompare(b)
      })

      return sortedKeys
        .map((key, index) => {
          const isLast = index === sortedKeys.length - 1
          const newPrefix = [...prefix]
          const currentPrefix = prefix.join('')
          const connector = isLast ? '└─' : '├─'
          const line = isLast ? ' ' : '│'
          
          newPrefix[level] = isLast ? ' ' : '│'
          
          return `${currentPrefix}${connector} ${key}\n${formatTree(
            tree[key],
            level + 1,
            newPrefix
          )}`
        })
        .join('')
    }

    return formatTree(treeDict)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setTree('')
    
    try {
      const { owner, repo } = extractOwnerRepo(url)
      const branchName = await getDefaultBranch(owner, repo)
      if (!branchName) {
        throw new Error('Could not determine default branch')
      }
      
      const treeData = await getTree(owner, repo, branchName)
      if (!treeData || treeData.length === 0) {
        throw new Error('Repository appears to be empty')
      }
      
      const markdown = `# ${repo}\n\n${buildMarkdownTree(treeData)}`
      setTree(markdown)
      showNotification('Structure generated successfully!', 'success')
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
      showNotification(err.message || 'An unexpected error occurred', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleClear = (): void => {
    setUrl('')
    setTree('')
    setError('')
    showNotification('Cleared successfully!', 'success')
  }

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(tree)
      showNotification('Copied to clipboard!', 'info')
    } catch {
      showNotification('Failed to copy to clipboard', 'error')
    }
  }

  const handleDownload = (): void => {
    try {
      const { repo } = extractOwnerRepo(url)
      const blob = new Blob([tree], { type: 'text/markdown' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${repo}-structure.md`
      a.click()
      URL.revokeObjectURL(a.href)
      showNotification('Download started!', 'success')
    } catch {
      showNotification('Failed to download structure', 'error')
    }
  }

  const showNotification = (message: string, type: 'success' | 'info' | 'error'): void => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  useEffect(() => {
    document.title = 'FostGen - Folder Structure Generator'
  }, [])

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-slate-900 to-black text-gray-100">
      <div className="container mx-auto px-4 py-12">
        {/* Header Section */}
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

        {/* Main Card */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-slate-800/50">
            {/* Input Section */}
            <form onSubmit={handleSubmit} className="space-y-6 mb-8">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Github className="h-5 w-5 text-blue-400" />
                </div>
                <input
                  type="text"
                  placeholder="Enter GitHub repository URL (e.g., https://github.com/owner/repo)"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-gray-100 placeholder-gray-500"
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-700 rounded-xl font-medium transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
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
                    onClick={handleCopy}
                    disabled={!tree}
                    className="px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={!tree}
                    className="px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={!url && !tree}
                    className="px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear
                  </button>
                </div>
              </div>
            </form>

            {/* Notification */}
            {notification && (
              <div className={`mb-6 p-4 rounded-xl flex items-center gap-2 ${
                notification.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                notification.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              }`}>
                {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> :
                 notification.type === 'error' ? <AlertCircle className="w-5 h-5" /> :
                 <Info className="w-5 h-5" />}
                {notification.message}
              </div>
            )}

            {/* Output Section */}
            <div className="bg-slate-800/50 rounded-xl p-6 shadow-inner">
              <pre className="font-mono text-sm whitespace-pre overflow-x-auto overflow-y-auto max-h-[500px] text-gray-300">
                {tree || (
                  <span className="text-gray-500 italic">
                    Enter a GitHub repository URL above to generate its folder structure...
                  </span>
                )}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}