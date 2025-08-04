import { NextRequest, NextResponse } from 'next/server'
import { LeadOperations } from '@/lib/dynamodb-operations'
import { withAuth, AuthenticatedUser } from '@/lib/auth-middleware'

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
  imported_leads: unknown[]
}

async function importLeads(request: NextRequest, _user: AuthenticatedUser) {
  try {
    const { leads }: { leads: CSVLead[] } = await request.json()
    
    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ error: 'No leads provided' }, { status: 400 })
    }

    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
      imported_leads: []
    }

    for (let i = 0; i < leads.length; i++) {
      const leadData = leads[i]
      
      // Validate required fields
      if (!leadData.name || !leadData.company) {
        result.failed++
        result.errors.push(`Row ${i + 1}: Missing required fields (name or company)`)
        continue
      }

      try {
        // Create lead with proper data structure for DynamoDB
        const createdLead = await LeadOperations.createLead({
          name: leadData.name,
          company: leadData.company,
          source: leadData.source || 'csv_import',
          bio_match: leadData.bio_match || 0,
          followers: leadData.followers || 0,
          website: leadData.website || '',
          status: leadData.status || 'new',
          tags: leadData.tags || []
        })

        result.success++
        result.imported_leads.push(createdLead)
      } catch (error) {
        result.failed++
        result.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Error importing leads:', error)
    return NextResponse.json({ error: 'Failed to import leads' }, { status: 500 })
  }
}

export const POST = withAuth(importLeads)