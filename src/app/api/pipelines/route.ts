import { NextRequest, NextResponse } from 'next/server'
import { PipelineOperations } from '@/lib/dynamodb-operations'

export async function GET() {
  try {
    const pipelines = await PipelineOperations.getAllPipelines()
    return NextResponse.json(pipelines)
  } catch (error) {
    console.error('Error fetching pipelines:', error)
    return NextResponse.json({ error: 'Failed to fetch pipelines' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const pipelineData = await request.json()
    const pipeline = await PipelineOperations.createPipeline(pipelineData)
    return NextResponse.json(pipeline, { status: 201 })
  } catch (error) {
    console.error('Error creating pipeline:', error)
    return NextResponse.json({ error: 'Failed to create pipeline' }, { status: 500 })
  }
}