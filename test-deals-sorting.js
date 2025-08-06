// Simple test to verify deals sorting functionality
// Run with: node test-deals-sorting.js

const BASE_URL = 'http://localhost:3000'

async function testDealsSorting() {
  console.log('Testing deals sorting functionality...\n')
  
  try {
    // Test 1: Default sorting (created_at desc)
    console.log('Test 1: Default sorting')
    const defaultResponse = await fetch(`${BASE_URL}/api/deals`)
    if (defaultResponse.ok) {
      const defaultDeals = await defaultResponse.json()
      console.log(`✓ Default sorting returned ${defaultDeals.length} deals`)
    } else {
      console.log('✗ Default sorting failed')
    }

    // Test 2: Sort by title ascending
    console.log('\nTest 2: Sort by title ascending')
    const titleAscResponse = await fetch(`${BASE_URL}/api/deals?sortBy=title&sortOrder=asc`)
    if (titleAscResponse.ok) {
      const titleAscDeals = await titleAscResponse.json()
      console.log(`✓ Title ascending sorting returned ${titleAscDeals.length} deals`)
      if (titleAscDeals.length > 1) {
        console.log(`  First deal: ${titleAscDeals[0].title}`)
        console.log(`  Last deal: ${titleAscDeals[titleAscDeals.length - 1].title}`)
      }
    } else {
      console.log('✗ Title ascending sorting failed')
    }

    // Test 3: Sort by value descending
    console.log('\nTest 3: Sort by value descending')
    const valueDescResponse = await fetch(`${BASE_URL}/api/deals?sortBy=value&sortOrder=desc`)
    if (valueDescResponse.ok) {
      const valueDescDeals = await valueDescResponse.json()
      console.log(`✓ Value descending sorting returned ${valueDescDeals.length} deals`)
      if (valueDescDeals.length > 1) {
        console.log(`  Highest value: $${valueDescDeals[0].value}`)
        console.log(`  Lowest value: $${valueDescDeals[valueDescDeals.length - 1].value}`)
      }
    } else {
      console.log('✗ Value descending sorting failed')
    }

    // Test 4: Sort by due_date ascending
    console.log('\nTest 4: Sort by due_date ascending')
    const dueDateAscResponse = await fetch(`${BASE_URL}/api/deals?sortBy=due_date&sortOrder=asc`)
    if (dueDateAscResponse.ok) {
      const dueDateAscDeals = await dueDateAscResponse.json()
      console.log(`✓ Due date ascending sorting returned ${dueDateAscDeals.length} deals`)
      if (dueDateAscDeals.length > 1) {
        console.log(`  Earliest due date: ${dueDateAscDeals[0].due_date}`)
        console.log(`  Latest due date: ${dueDateAscDeals[dueDateAscDeals.length - 1].due_date}`)
      }
    } else {
      console.log('✗ Due date ascending sorting failed')
    }

    console.log('\nAll tests completed!')

  } catch (error) {
    console.error('Error during testing:', error.message)
    console.log('\nMake sure the development server is running with: npm run dev')
  }
}

testDealsSorting()