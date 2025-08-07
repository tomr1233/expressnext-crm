# DynamoDB Migration Scripts

This directory contains scripts to migrate your CRM data from the current single-table structure to an optimized multi-table architecture.

## Overview

The migration transforms your data from:
- **Single table** with mixed entity types and sparse data
- **Inconsistent access patterns** requiring full table scans
- **Poor scalability** due to hot partitions

To:
- **Separate tables** for each entity type (Leads, Deals, Resources, Pipelines)
- **Optimized access patterns** with proper GSI design
- **Better performance** and scalability
- **Custom fields support** for leads and deals

## Prerequisites

1. **AWS Credentials**: Ensure your AWS credentials are configured
2. **Node.js**: Version 18+ with TypeScript support
3. **Permissions**: DynamoDB read/write access to old and new tables

## Installation

```bash
cd scripts
npm install
```

## Migration Steps

### 1. Create New Tables

```bash
npm run create-tables
```

This creates the new optimized table structure:
- `CRM-Leads-v2`: Lead management
- `CRM-Deals-v2`: Sales pipeline
- `CRM-Resources-v2`: File management  
- `CRM-Pipelines-v2`: Pipeline configuration

### 2. Run Data Migration

```bash
npm run migrate
```

This transforms and copies data from the old table to new tables with:
- Proper partition and sort key design
- GSI optimization for common query patterns
- Custom fields extraction for unmapped data
- Data type normalization

### 3. Validate Migration

```bash
npm run validate
```

Validates that:
- All data was migrated successfully
- No data was lost or corrupted
- New table structure is correct
- Field mappings are accurate

### 4. Full Migration (All Steps)

```bash
npm run full-migration
```

Runs all steps in sequence: create tables → migrate data → validate.

## Environment Variables

```bash
# Optional - defaults provided
export AWS_REGION=ap-southeast-2
export OLD_TABLE_NAME=expressnext-crm
export LEADS_TABLE=CRM-Leads-v2
export DEALS_TABLE=CRM-Deals-v2
export RESOURCES_TABLE=CRM-Resources-v2
export PIPELINES_TABLE=CRM-Pipelines-v2
```

## New Table Structure

### Leads Table
```typescript
{
  PK: "LEAD",                           // Partition key
  SK: "2025-08#lead-id",               // Sort key (date + ID)
  GSI1PK: "STATUS#new",                // Status-based queries
  GSI1SK: "2025-08-03T05:20:59.061Z",  // Time-ordered
  GSI2PK: "COMPANY#CompanyName",       // Company-based queries
  GSI2SK: "lead-id",
  id: "uuid",
  name: "Contact Name",
  company: "Company Name", 
  status: "new|qualified|unqualified",
  custom_fields: {                     // Dynamic fields
    "industry": "Healthcare",
    "budget": "50000",
    "decision_maker": true
  }
  // ... other fields
}
```

### Deals Table
```typescript
{
  PK: "DEAL",
  SK: "2025-07#deal-id",
  GSI1PK: "STAGE#negotiating",         // Stage-based queries
  GSI1SK: "2025-07-12T11:57:59.425Z",
  GSI2PK: "OWNER#Mike Johnson",        // Owner-based queries
  GSI2SK: "deal-id",
  id: "uuid",
  title: "Deal Title",
  value: 35000,
  custom_fields: {                     // Dynamic fields
    "probability": 0.7,
    "close_reason": "budget_approved",
    "competitor": "CompanyX"
  }
  // ... other fields
}
```

## Access Patterns Supported

1. **Time-based queries**: `SK` with `YYYY-MM#id` format
2. **Status/Stage filtering**: `GSI1` for leads by status, deals by stage
3. **Entity relationships**: `GSI2` for leads by company, deals by owner
4. **Efficient pagination**: Proper sort key ordering
5. **Custom field queries**: JSON object for dynamic properties

## Rollback

If you need to rollback the migration:

```bash
npm run rollback
```

This interactive script can:
- Delete new tables
- Restore from backup tables
- Confirm each step individually

## Troubleshooting

### Migration Fails
1. Check AWS permissions
2. Verify table names in environment variables
3. Check source table has data
4. Review error logs for specific failures

### Validation Fails
1. Review validation report for missing items
2. Check field mapping logic in transform functions
3. Verify custom field extraction is working
4. Re-run migration for specific entity types

### Performance Issues
1. Monitor DynamoDB metrics during migration
2. Adjust batch sizes if hitting throttling limits
3. Consider using DynamoDB on-demand billing during migration

## Production Considerations

1. **Backup**: Create point-in-time backup before migration
2. **Timing**: Run during low-traffic periods  
3. **Monitoring**: Watch DynamoDB CloudWatch metrics
4. **Testing**: Test migration on development environment first
5. **Application Updates**: Update your app code to use new table structure

## Cost Optimization

- New tables use **PAY_PER_REQUEST** billing
- Consider switching to **PROVISIONED** after migration
- Monitor actual usage patterns for capacity planning
- Clean up old table after successful migration

## Support

For issues or questions:
1. Check the validation report first
2. Review AWS CloudWatch logs
3. Use the rollback script if needed
4. Contact your database administrator for production issues