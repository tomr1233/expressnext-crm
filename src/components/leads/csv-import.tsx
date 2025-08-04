'use client'

import { useState, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react"
import { ApiClient } from "@/lib/api-client"

interface CSVLead {
  name: string
  company: string
  source: string
  bio_match: number
  followers: number
  website: string
  status: 'new' | 'qualified' | 'unqualified'
  tags: string[]
}

interface ImportResult {
  success: number
  failed: number
  errors: string[]
}

export function CSVImport() {
  const [isOpen, setIsOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [previewData, setPreviewData] = useState<CSVLead[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseCSV = (csvText: string): CSVLead[] => {
    const lines = csvText.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    
    const headerMap: Record<string, string> = {
      'name': 'name',
      'company': 'company', 
      'source': 'source',
      'bio match': 'bio_match',
      'bio_match': 'bio_match',
      'biomatch': 'bio_match',
      'followers': 'followers',
      'website': 'website',
      'status': 'status',
      'tags': 'tags'
    }

    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim())
      const lead: Partial<CSVLead> = {
        name: '',
        company: '',
        source: 'csv_import',
        bio_match: 0,
        followers: 0,
        website: '',
        status: 'new',
        tags: []
      }

      headers.forEach((header, index) => {
        const mappedKey = headerMap[header]
        if (mappedKey && values[index]) {
          if (mappedKey === 'bio_match' || mappedKey === 'followers') {
            lead[mappedKey] = parseInt(values[index]) || 0
          } else if (mappedKey === 'tags') {
            lead[mappedKey] = values[index].split(';').map(tag => tag.trim()).filter(Boolean)
          } else if (mappedKey === 'status') {
            const status = values[index].toLowerCase()
            lead[mappedKey] = ['new', 'qualified', 'unqualified'].includes(status) ? status : 'new'
          } else {
            lead[mappedKey] = values[index]
          }
        }
      })

      return lead as CSVLead
    }).filter(lead => lead.name && lead.company)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      alert('Please select a CSV file')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string
        const parsedData = parseCSV(csvText)
        setPreviewData(parsedData)
        setShowPreview(true)
      } catch {
        alert('Error parsing CSV file. Please check the format.')
      }
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (previewData.length === 0) return

    setIsUploading(true)
    setUploadProgress(0)
    
    try {
      const response = await ApiClient.request('/api/leads/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leads: previewData })
      })

      const result = await response.json()
      
      if (response.ok) {
        setResult(result)
      } else {
        setResult({
          success: 0,
          failed: previewData.length,
          errors: [result.error || 'Import failed']
        })
      }
    } catch (error) {
      setResult({
        success: 0,
        failed: previewData.length,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred']
      })
    }

    setUploadProgress(100)
    setIsUploading(false)
    setShowPreview(false)
  }

  const resetImport = () => {
    setPreviewData([])
    setShowPreview(false)
    setResult(null)
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const closeDialog = () => {
    setIsOpen(false)
    setTimeout(resetImport, 300)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Leads from CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!showPreview && !result && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="csv-file">Select CSV File</Label>
                <div className="mt-2">
                  <input
                    ref={fileInputRef}
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  CSV Format Requirements
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Your CSV should include the following columns (case-insensitive):
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>name</strong> - Lead name (required)</li>
                  <li>• <strong>company</strong> - Company name (required)</li>
                  <li>• <strong>source</strong> - Lead source (optional, defaults to &quot;csv_import&quot;)</li>
                  <li>• <strong>bio_match</strong> - Bio match score 0-100 (optional)</li>
                  <li>• <strong>followers</strong> - Follower count (optional)</li>
                  <li>• <strong>website</strong> - Website URL (optional)</li>
                  <li>• <strong>status</strong> - new/qualified/unqualified (optional, defaults to &quot;new&quot;)</li>
                  <li>• <strong>tags</strong> - Semicolon-separated tags (optional)</li>
                </ul>
              </div>
            </div>
          )}

          {showPreview && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Preview ({previewData.length} leads)</h4>
                <div className="space-x-2">
                  <Button variant="outline" onClick={resetImport}>
                    Cancel
                  </Button>
                  <Button onClick={handleImport} disabled={isUploading}>
                    {isUploading ? 'Importing...' : 'Import Leads'}
                  </Button>
                </div>
              </div>

              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Importing leads...</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}

              <div className="max-h-96 overflow-auto border rounded">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="p-2 text-left">Name</th>
                      <th className="p-2 text-left">Company</th>
                      <th className="p-2 text-left">Source</th>
                      <th className="p-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 10).map((lead, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">{lead.name}</td>
                        <td className="p-2">{lead.company}</td>
                        <td className="p-2">{lead.source}</td>
                        <td className="p-2">{lead.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.length > 10 && (
                  <div className="p-2 text-center text-sm text-muted-foreground border-t">
                    And {previewData.length - 10} more rows...
                  </div>
                )}
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                {result.failed === 0 ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}
                <h4 className="font-medium">Import Complete</h4>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-3 rounded">
                  <div className="text-lg font-semibold text-green-700">{result.success}</div>
                  <div className="text-sm text-green-600">Successfully imported</div>
                </div>
                <div className="bg-red-50 p-3 rounded">
                  <div className="text-lg font-semibold text-red-700">{result.failed}</div>
                  <div className="text-sm text-red-600">Failed to import</div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="bg-red-50 p-3 rounded max-h-32 overflow-auto">
                  <h5 className="font-medium text-red-700 mb-2">Errors:</h5>
                  <ul className="text-sm text-red-600 space-y-1">
                    {result.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={resetImport}>
                  Import More
                </Button>
                <Button onClick={closeDialog}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}