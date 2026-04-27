import * as React from 'react'
import { Upload, X, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { uploadDocuments } from '@/services/documents'
import { useKnowledgeStore } from '@/stores/knowledgeStore'

interface DocumentUploadProps {
  kbId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DocumentUpload({ kbId, open, onOpenChange }: DocumentUploadProps) {
  const { fetchDocuments } = useKnowledgeStore()
  const [files, setFiles] = React.useState<File[]>([])
  const [uploading, setUploading] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const ACCEPTED = '.pdf,.docx,.xlsx,.md,.txt,.csv'

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return
    const arr = Array.from(newFiles)
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name))
      return [...prev, ...arr.filter((f) => !existing.has(f.name))]
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  const handleUpload = async () => {
    if (!files.length) return
    setUploading(true)
    try {
      await uploadDocuments(kbId, files)
      toast.success(`成功上传 ${files.length} 个文件，处理中…`)
      setFiles([])
      onOpenChange(false)
      fetchDocuments(kbId).catch(() => null)
    } catch {
      // error shown by interceptor
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>上传文档</DialogTitle>
        </DialogHeader>

        <div
          className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary transition-colors"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">拖拽文件到此处或点击选择</p>
          <p className="text-xs text-muted-foreground mt-1">支持 PDF、DOCX、XLSX、MD、TXT、CSV</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {files.length > 0 && (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {files.map((file, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="flex-1 truncate text-sm">{file.name}</span>
                <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFiles((prev) => prev.filter((_, j) => j !== i)) }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleUpload} disabled={!files.length || uploading}>
            {uploading ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />上传中…</> : `上传 ${files.length} 个文件`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
